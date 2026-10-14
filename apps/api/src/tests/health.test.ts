import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import * as dbModule from '../common/db/prisma.js';
import * as redisModule from '../common/redis/redis.js';

describe('Health and API Infrastructure Endpoints', () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /healthz returns 200 with liveness status and X-Request-Id header', async () => {
    const res = await request(app).get('/healthz');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.timestamp).toBeDefined();
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('GET /readyz returns 200 when both database and redis are healthy', async () => {
    vi.spyOn(dbModule, 'checkDatabaseHealth').mockResolvedValue(true);
    vi.spyOn(redisModule, 'checkRedisHealth').mockResolvedValue(true);

    const res = await request(app).get('/readyz');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.ready).toBe(true);
    expect(res.body.data.checks.database.status).toBe('up');
    expect(res.body.data.checks.redis.status).toBe('up');
  });

  it('GET /readyz returns 503 when database is unhealthy', async () => {
    vi.spyOn(dbModule, 'checkDatabaseHealth').mockResolvedValue(false);
    vi.spyOn(redisModule, 'checkRedisHealth').mockResolvedValue(true);

    const res = await request(app).get('/readyz');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.ready).toBe(false);
    expect(res.body.data.checks.database.status).toBe('down');
    expect(res.body.data.checks.redis.status).toBe('up');
  });

  it('GET /readyz returns 503 when redis is unhealthy', async () => {
    vi.spyOn(dbModule, 'checkDatabaseHealth').mockResolvedValue(true);
    vi.spyOn(redisModule, 'checkRedisHealth').mockResolvedValue(false);

    const res = await request(app).get('/readyz');

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.ready).toBe(false);
    expect(res.body.data.checks.database.status).toBe('up');
    expect(res.body.data.checks.redis.status).toBe('down');
  });

  it('Returns structured 404 for non-existent routes', async () => {
    const res = await request(app).get('/api/v1/non-existent-endpoint');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.requestId).toBeDefined();
    expect(res.body.error.message).toContain('not found');
  });
});
