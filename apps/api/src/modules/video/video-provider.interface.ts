export interface UploadTicket {
  uploadUrl: string;
  libraryId: string;
  videoId: string;
  authorizationSignature: string;
  authorizationExpire: number;
}

export interface PlaybackInfo {
  embedUrl: string;
  playbackUrl: string;
  expiresAt: number;
  token?: string;
}

export interface VideoDetails {
  videoId: string;
  title: string;
  durationSeconds: number;
  status: 'PROCESSING' | 'READY' | 'FAILED';
}

export interface VideoProvider {
  /**
   * Creates a video placeholder entry in the video provider
   */
  createVideo(title: string, collectionId?: string): Promise<{ videoId: string }>;

  /**
   * Generates a signed client authorization ticket for direct TUS resumable upload
   * so large video files are uploaded directly from the browser to CDN, never passing through Express.
   */
  generateUploadTicket(
    videoId: string,
    title?: string,
    validitySeconds?: number,
  ): Promise<UploadTicket>;

  /**
   * Generates a signed playback embed URL with short expiration and session binding.
   * Never exposes raw streaming secrets or permanently valid URLs.
   */
  generatePlaybackToken(videoId: string, validitySeconds?: number): Promise<PlaybackInfo>;

  /**
   * Fetches latest encoding status and video duration from provider API (used by polling fallback)
   */
  getVideoDetails(videoId: string): Promise<VideoDetails>;

  /**
   * Cryptographically verifies incoming webhook signature in constant time
   */
  verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean;

  /**
   * Deletes a video from the provider CDN
   */
  deleteVideo(videoId: string): Promise<boolean>;
}
