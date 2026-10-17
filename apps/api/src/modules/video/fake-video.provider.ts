import crypto from 'crypto';
import { uuidv7 } from 'uuidv7';
import {
  VideoProvider,
  UploadTicket,
  PlaybackInfo,
  VideoDetails,
} from './video-provider.interface.js';

export interface FakeVideoRecord {
  videoId: string;
  title: string;
  durationSeconds: number;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  collectionId?: string;
  createdAt: number;
}

export class FakeVideoProvider implements VideoProvider {
  public videos: Map<string, FakeVideoRecord> = new Map();
  public webhookSecret = 'test_fake_video_webhook_secret_key_32_chars';
  public libraryId = 'fake-lib-12345';

  public async createVideo(title: string, collectionId?: string): Promise<{ videoId: string }> {
    const videoId = uuidv7();
    this.videos.set(videoId, {
      videoId,
      title: title.trim(),
      durationSeconds: 0,
      status: 'PROCESSING',
      collectionId,
      createdAt: Date.now(),
    });
    return { videoId };
  }

  public async generateUploadTicket(
    videoId: string,
    _title?: string,
    validitySeconds = 86400,
  ): Promise<UploadTicket> {
    const expirationTime = Math.floor(Date.now() / 1000) + validitySeconds;
    const mockApiKey = 'fake_bunny_api_key';
    const rawString = `${this.libraryId}${mockApiKey}${expirationTime}${videoId}`;
    const authorizationSignature = crypto.createHash('sha256').update(rawString).digest('hex');

    return {
      uploadUrl: 'https://video.bunnycdn.com/tusupload',
      libraryId: this.libraryId,
      videoId,
      authorizationSignature,
      authorizationExpire: expirationTime,
    };
  }

  public async generatePlaybackToken(
    videoId: string,
    validitySeconds = 7200,
  ): Promise<PlaybackInfo> {
    const expirationTimestamp = Math.floor(Date.now() / 1000) + validitySeconds;
    const mockTokenKey = 'fake_token_security_key';
    const token = crypto
      .createHash('sha256')
      .update(`${mockTokenKey}${videoId}${expirationTimestamp}`)
      .digest('hex');

    return {
      embedUrl: `https://player.mediadelivery.net/embed/${this.libraryId}/${videoId}?token=${token}&expires=${expirationTimestamp}`,
      playbackUrl: `https://video.fake-cdn.local/${this.libraryId}/${videoId}/playlist.m3u8?token=${token}&expires=${expirationTimestamp}`,
      expiresAt: expirationTimestamp,
      token,
    };
  }

  public async getVideoDetails(videoId: string): Promise<VideoDetails> {
    const record = this.videos.get(videoId);
    if (!record) {
      return {
        videoId,
        title: 'Mock Lesson Video',
        durationSeconds: 900,
        status: 'READY',
      };
    }
    return {
      videoId: record.videoId,
      title: record.title,
      durationSeconds: record.durationSeconds,
      status: record.status,
    };
  }

  public verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean {
    if (!signature || signature.trim().length === 0) return false;
    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf-8') : rawBody;
    const expected = crypto.createHmac('sha256', this.webhookSecret).update(bodyStr).digest('hex');

    const cleanSig = signature.trim().toLowerCase();
    const cleanExpected = expected.trim().toLowerCase();

    if (cleanSig.length !== cleanExpected.length) return false;

    try {
      return crypto.timingSafeEqual(
        Buffer.from(cleanSig, 'hex'),
        Buffer.from(cleanExpected, 'hex'),
      );
    } catch {
      return false;
    }
  }

  /**
   * Helper method for integration tests to manually transition mock videos
   */
  public setVideoStatus(
    videoId: string,
    status: 'PROCESSING' | 'READY' | 'FAILED',
    durationSeconds = 600,
  ): void {
    const record = this.videos.get(videoId);
    if (record) {
      record.status = status;
      record.durationSeconds = durationSeconds;
    } else {
      this.videos.set(videoId, {
        videoId,
        title: 'Test Mock Video',
        durationSeconds,
        status,
        createdAt: Date.now(),
      });
    }
  }

  /**
   * Helper to sign a test webhook payload using the fake secret
   */
  public signWebhookPayload(payload: object | string): string {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', this.webhookSecret).update(raw).digest('hex');
  }

  public async deleteVideo(videoId: string): Promise<boolean> {
    this.videos.delete(videoId);
    return true;
  }
}
