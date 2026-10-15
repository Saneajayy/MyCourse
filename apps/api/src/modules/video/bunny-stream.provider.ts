import crypto from 'crypto';
import {
  VideoProvider,
  UploadTicket,
  PlaybackInfo,
  VideoDetails,
} from './video-provider.interface.js';
import { logger } from '../../common/logger/logger.js';
import { AppError } from '../../common/errors/app-error.js';

export interface BunnyStreamConfig {
  libraryId: string;
  apiKey: string;
  tokenSecurityKey: string;
  webhookSecret?: string;
  cdnHostname?: string;
}

export class BunnyStreamProvider implements VideoProvider {
  private libraryId: string;
  private apiKey: string;
  private tokenSecurityKey: string;
  private webhookSecret?: string;
  private baseUrl: string;

  constructor(config: BunnyStreamConfig) {
    this.libraryId = config.libraryId;
    this.apiKey = config.apiKey;
    this.tokenSecurityKey = config.tokenSecurityKey;
    this.webhookSecret = config.webhookSecret;
    this.baseUrl = 'https://video.bunnycdn.com';
  }

  /**
   * Calls Bunny REST API to initialize video record and retrieve GUID:
   * POST https://video.bunnycdn.com/library/{libraryId}/videos
   */
  public async createVideo(title: string, collectionId?: string): Promise<{ videoId: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/library/${this.libraryId}/videos`, {
        method: 'POST',
        headers: {
          AccessKey: this.apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          ...(collectionId ? { collectionId } : {}),
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        logger.error({ status: res.status, errorText }, 'Bunny Stream CreateVideo API failed');
        throw new AppError(502, 'BUNNY_STREAM_ERROR', `Failed to create video on Bunny Stream: HTTP ${res.status}`);
      }

      const data = (await res.json()) as { guid: string };
      return { videoId: data.guid };
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error({ err }, 'Error calling Bunny Stream CreateVideo');
      throw new AppError(502, 'BUNNY_STREAM_ERROR', 'Unable to connect to Bunny Stream service');
    }
  }

  /**
   * Generates Bunny TUS Resumable Upload authorization ticket for browser direct upload.
   * Formula: SHA256(library_id + api_key + expiration_time + video_id)
   * Official documentation: https://docs.bunny.net/docs/stream-upload-video
   */
  public async generateUploadTicket(
    videoId: string,
    _title?: string,
    validitySeconds = 86400, // 24 hours standard for large file uploads
  ): Promise<UploadTicket> {
    const expirationTime = Math.floor(Date.now() / 1000) + validitySeconds;
    const rawString = `${this.libraryId}${this.apiKey}${expirationTime}${videoId}`;
    const authorizationSignature = crypto.createHash('sha256').update(rawString).digest('hex');

    return {
      uploadUrl: 'https://video.bunnycdn.com/tusupload',
      libraryId: this.libraryId,
      videoId,
      authorizationSignature,
      authorizationExpire: expirationTime,
    };
  }

  /**
   * Generates secure signed iframe embed playback URL.
   * Formula: SHA256(tokenSecurityKey + videoId + expirationTimestamp)
   * Official documentation: https://docs.bunny.net/docs/stream-token-authentication
   * Note: Expiration is short-lived; mobile users roam across IPs so strict IP binding is avoided.
   */
  public async generatePlaybackToken(
    videoId: string,
    validitySeconds = 7200, // 2 hours
  ): Promise<PlaybackInfo> {
    const expirationTimestamp = Math.floor(Date.now() / 1000) + validitySeconds;
    const rawToHash = `${this.tokenSecurityKey}${videoId}${expirationTimestamp}`;
    const token = crypto.createHash('sha256').update(rawToHash).digest('hex');

    const embedUrl = `https://player.mediadelivery.net/embed/${this.libraryId}/${videoId}?token=${token}&expires=${expirationTimestamp}`;

    return {
      embedUrl,
      expiresAt: expirationTimestamp,
    };
  }

  /**
   * Queries video status and duration from Bunny Stream REST API:
   * GET https://video.bunnycdn.com/library/{libraryId}/videos/{videoId}
   */
  public async getVideoDetails(videoId: string): Promise<VideoDetails> {
    try {
      const res = await fetch(`${this.baseUrl}/library/${this.libraryId}/videos/${videoId}`, {
        method: 'GET',
        headers: {
          AccessKey: this.apiKey,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        throw new AppError(502, 'BUNNY_STREAM_ERROR', `Failed to fetch video details from Bunny Stream: HTTP ${res.status}`);
      }

      const data = (await res.json()) as {
        guid: string;
        title: string;
        length?: number;
        status?: number;
      };

      // Status mapping:
      // 0 = Queued, 1 = Processing, 2 = Encoding, 3 = Finished, 4 = Resolution Finished, 5 = Failed
      let status: 'PROCESSING' | 'READY' | 'FAILED' = 'PROCESSING';
      if (data.status === 3 || data.status === 4) {
        status = 'READY';
      } else if (data.status === 5 || data.status === 8) {
        status = 'FAILED';
      }

      return {
        videoId: data.guid,
        title: data.title || '',
        durationSeconds: data.length || 0,
        status,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      logger.error({ err, videoId }, 'Error querying Bunny Stream video details');
      throw new AppError(502, 'BUNNY_STREAM_ERROR', 'Unable to fetch video details from provider');
    }
  }

  /**
   * Cryptographically verifies incoming webhook signature in constant time.
   * Header: X-BunnyStream-Signature = HMAC-SHA256(rawBody, secret)
   */
  public verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean {
    if (!signature || signature.trim().length === 0) {
      return false;
    }

    const secret = this.webhookSecret || this.apiKey;
    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf-8') : rawBody;
    const expected = crypto.createHmac('sha256', secret).update(bodyStr).digest('hex');

    const cleanSig = signature.trim().toLowerCase();
    const cleanExpected = expected.trim().toLowerCase();

    if (cleanSig.length !== cleanExpected.length) {
      return false;
    }

    try {
      const bufA = Buffer.from(cleanSig, 'hex');
      const bufB = Buffer.from(cleanExpected, 'hex');
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}
