import { uuidv7 } from 'uuidv7';
import { redisClient } from '../../common/redis/redis.js';
import { prisma } from '../../common/db/prisma.js';
import { env } from '../../config/env.js';
import { logger } from '../../common/logger/logger.js';
import { AppError } from '../../common/errors/app-error.js';

export interface StreamSessionMetadata {
  sessionId: string;
  userId: string;
  createdAt: number;
  lastHeartbeat: number;
  userAgent?: string;
  ip?: string;
}

// Sessions without a heartbeat for over 60 seconds are considered idle/abandoned
export const SESSION_HEARTBEAT_TTL_MS = 60_000;
// Redis hash key TTL (5 minutes)
export const HASH_KEY_TTL_SECONDS = 300;

export class StreamService {
  /**
   * Reads configured max concurrent streams from AppSetting, falling back to env/default (2)
   */
  public async getMaxConcurrentStreams(): Promise<number> {
    try {
      const setting = await prisma.appSetting.findUnique({
        where: { key: 'max_concurrent_streams' },
      });
      if (setting && typeof setting.value === 'number' && setting.value > 0) {
        return setting.value;
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to read max_concurrent_streams from AppSetting; using default');
    }
    return env.MAX_CONCURRENT_STREAMS ?? 2;
  }

  /**
   * Acquires a stream session slot in Redis.
   * If Redis is unreachable, FAILS CLOSED with HTTP 503 Service Unavailable.
   * If current active streams >= maxConcurrentStreams, drops the oldest session (Spotify/Netflix style).
   */
  public async acquireStreamSession(
    userId: string,
    metadata: { userAgent?: string; ip?: string } = {},
  ): Promise<{ sessionId: string }> {
    const key = `stream:sessions:${userId}`;
    const now = Date.now();
    const sessionId = uuidv7();

    try {
      const maxStreams = await this.getMaxConcurrentStreams();
      const rawSessions = await redisClient.hgetall(key);
      const activeSessions: StreamSessionMetadata[] = [];

      // Parse and prune stale sessions (idle > 60s)
      const staleSessionIds: string[] = [];
      for (const [id, jsonStr] of Object.entries(rawSessions)) {
        try {
          const sess: StreamSessionMetadata = JSON.parse(jsonStr);
          if (now - sess.lastHeartbeat <= SESSION_HEARTBEAT_TTL_MS) {
            activeSessions.push(sess);
          } else {
            staleSessionIds.push(id);
          }
        } catch {
          staleSessionIds.push(id);
        }
      }

      // Cleanup stale sessions in Redis
      if (staleSessionIds.length > 0) {
        await redisClient.hdel(key, ...staleSessionIds);
      }

      // If active sessions reach or exceed max limit, drop the oldest session
      if (activeSessions.length >= maxStreams) {
        // Sort ascending by lastHeartbeat/createdAt
        activeSessions.sort(
          (a, b) => a.lastHeartbeat - b.lastHeartbeat || a.createdAt - b.createdAt,
        );
        const toDrop = activeSessions.slice(0, activeSessions.length - maxStreams + 1);

        for (const sess of toDrop) {
          logger.info(
            {
              userId,
              droppedSessionId: sess.sessionId,
              reason: 'CONCURRENT_STREAM_LIMIT_EXCEEDED',
            },
            'Dropped oldest active stream session',
          );
          await redisClient.hdel(key, sess.sessionId);
        }
      }

      // Record the new session
      const newSession: StreamSessionMetadata = {
        sessionId,
        userId,
        createdAt: now,
        lastHeartbeat: now,
        userAgent: metadata.userAgent,
        ip: metadata.ip,
      };

      await redisClient.hset(key, sessionId, JSON.stringify(newSession));
      await redisClient.expire(key, HASH_KEY_TTL_SECONDS);

      return { sessionId };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      logger.error({ err, userId }, 'Redis failure during stream session acquisition');
      throw new AppError(
        503,
        'SERVICE_UNAVAILABLE',
        'Stream session validation service is currently unavailable. Please try again shortly.',
      );
    }
  }

  /**
   * Refreshes heartbeat for an active playback session.
   * If Redis fails, fails closed with 503.
   * Returns true if session is valid and active; false if terminated, dropped, or expired.
   */
  public async refreshHeartbeat(userId: string, sessionId: string): Promise<boolean> {
    const key = `stream:sessions:${userId}`;
    const now = Date.now();

    try {
      const rawSession = await redisClient.hget(key, sessionId);
      if (!rawSession) {
        return false;
      }

      const sess: StreamSessionMetadata = JSON.parse(rawSession);
      sess.lastHeartbeat = now;

      await redisClient.hset(key, sessionId, JSON.stringify(sess));
      await redisClient.expire(key, HASH_KEY_TTL_SECONDS);

      return true;
    } catch (err: any) {
      logger.error({ err, userId, sessionId }, 'Redis failure during stream heartbeat');
      throw new AppError(
        503,
        'SERVICE_UNAVAILABLE',
        'Stream session validation service is currently unavailable. Please try again shortly.',
      );
    }
  }

  /**
   * Completely clears all active stream sessions for a user (called upon refund, admin revoke, or ban)
   */
  public async clearUserSessions(userId: string): Promise<void> {
    const key = `stream:sessions:${userId}`;
    try {
      await redisClient.del(key);
      logger.info({ userId }, 'Cleared all active stream sessions for user');
    } catch (err) {
      logger.error({ err, userId }, 'Failed to clear stream sessions in Redis');
    }
  }

  /**
   * Returns count of currently active stream sessions for a user
   */
  public async getActiveSessionCount(userId: string): Promise<number> {
    const key = `stream:sessions:${userId}`;
    const now = Date.now();
    try {
      const rawSessions = await redisClient.hgetall(key);
      let count = 0;
      for (const jsonStr of Object.values(rawSessions)) {
        try {
          const sess: StreamSessionMetadata = JSON.parse(jsonStr);
          if (now - sess.lastHeartbeat <= SESSION_HEARTBEAT_TTL_MS) {
            count++;
          }
        } catch {
          // ignore corrupted json
        }
      }
      return count;
    } catch (err) {
      logger.error({ err, userId }, 'Failed to query active session count');
      throw new AppError(
        503,
        'SERVICE_UNAVAILABLE',
        'Stream session service is currently unavailable',
      );
    }
  }
}

export const streamService = new StreamService();
