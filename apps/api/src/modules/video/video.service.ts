import { VideoProvider } from './video-provider.interface.js';
import { BunnyStreamProvider } from './bunny-stream.provider.js';
import { FakeVideoProvider } from './fake-video.provider.js';
import { env } from '../../config/env.js';
import { logger } from '../../common/logger/logger.js';

let activeVideoProvider: VideoProvider;

const hasRealBunnyCredentials =
  env.BUNNY_STREAM_API_KEY &&
  !env.BUNNY_STREAM_API_KEY.includes('placeholder') &&
  env.BUNNY_STREAM_LIBRARY_ID &&
  !env.BUNNY_STREAM_LIBRARY_ID.includes('placeholder');

if ((env.VIDEO_PROVIDER === 'bunny' || hasRealBunnyCredentials) && env.VIDEO_PROVIDER !== 'fake') {
  logger.info({ libraryId: env.BUNNY_STREAM_LIBRARY_ID }, 'Initialized BunnyStreamProvider');
  activeVideoProvider = new BunnyStreamProvider({
    libraryId: env.BUNNY_STREAM_LIBRARY_ID,
    apiKey: env.BUNNY_STREAM_API_KEY,
    tokenSecurityKey: env.BUNNY_STREAM_TOKEN_AUTH_KEY,
    readOnlyApiKey: env.BUNNY_STREAM_READ_ONLY_API_KEY || env.BUNNY_STREAM_WEBHOOK_SECRET,
    webhookSecret: env.BUNNY_STREAM_WEBHOOK_SECRET,
    cdnHostname: env.BUNNY_STREAM_CDN_HOSTNAME,
  });
} else {
  logger.info('Initialized FakeVideoProvider for development and tests');
  activeVideoProvider = new FakeVideoProvider();
}

export function getVideoProvider(): VideoProvider {
  return activeVideoProvider;
}

export function setVideoProviderForTesting(provider: VideoProvider): void {
  activeVideoProvider = provider;
}

export type { VideoProvider } from './video-provider.interface.js';
export { BunnyStreamProvider } from './bunny-stream.provider.js';
export { FakeVideoProvider } from './fake-video.provider.js';
