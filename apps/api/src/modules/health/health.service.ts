import { checkDatabaseHealth } from '../../common/db/prisma.js';
import { checkRedisHealth } from '../../common/redis/redis.js';

export interface ReadinessResult {
  ready: boolean;
  timestamp: string;
  checks: {
    database: { status: 'up' | 'down' };
    redis: { status: 'up' | 'down' };
  };
}

export class HealthService {
  public getLiveness(): { status: 'ok'; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  public async getReadiness(): Promise<ReadinessResult> {
    const [dbHealthy, redisHealthy] = await Promise.all([
      checkDatabaseHealth(),
      checkRedisHealth(),
    ]);

    const isReady = dbHealthy && redisHealthy;

    return {
      ready: isReady,
      timestamp: new Date().toISOString(),
      checks: {
        database: { status: dbHealthy ? 'up' : 'down' },
        redis: { status: redisHealthy ? 'up' : 'down' },
      },
    };
  }
}

export const healthService = new HealthService();
