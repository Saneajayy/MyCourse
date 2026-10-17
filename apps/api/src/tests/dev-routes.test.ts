import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { devRouter } from '../modules/dev/checkout.routes.js';

describe('Dev Routes Production & Feature Flag Isolation (T3)', () => {
  const originalNodeEnv = env.NODE_ENV;
  const originalEnableDevRoutes = env.ENABLE_DEV_ROUTES;

  afterEach(() => {
    (env as any).NODE_ENV = originalNodeEnv;
    (env as any).ENABLE_DEV_ROUTES = originalEnableDevRoutes;
  });

  describe('When NODE_ENV=production even if ENABLE_DEV_ROUTES=true', () => {
    beforeEach(() => {
      (env as any).NODE_ENV = 'production';
      (env as any).ENABLE_DEV_ROUTES = true;
    });

    it('proves createApp does not mount dev routes and returns 404 for all dev endpoints', async () => {
      const prodApp = createApp();

      // Test 1: GET /dev/checkout
      const resCheckout = await request(prodApp).get('/dev/checkout');
      expect(resCheckout.status).toBe(404);

      // Test 2: GET /dev/player
      const resPlayer = await request(prodApp).get('/dev/player');
      expect(resPlayer.status).toBe(404);

      // Test 3: POST /dev/verify-student
      const resVerify = await request(prodApp)
        .post('/dev/verify-student')
        .send({ email: 'test@example.com' });
      expect(resVerify.status).toBe(404);

      // Test 4: POST /dev/ensure-test-coupon
      const resCoupon = await request(prodApp).post('/dev/ensure-test-coupon');
      expect(resCoupon.status).toBe(404);
    });

    it('proves devRouter internal middleware guard strictly returns 404 if directly mounted in production', async () => {
      // Even if mistakenly mounted in an express app in production
      const isolatedApp = express();
      isolatedApp.use(express.json());
      isolatedApp.use('/dev', devRouter);

      const resCheckout = await request(isolatedApp).get('/dev/checkout');
      expect(resCheckout.status).toBe(404);

      const resPlayer = await request(isolatedApp).get('/dev/player');
      expect(resPlayer.status).toBe(404);

      const resVerify = await request(isolatedApp)
        .post('/dev/verify-student')
        .send({ email: 'test@example.com' });
      expect(resVerify.status).toBe(404);

      const resCoupon = await request(isolatedApp).post('/dev/ensure-test-coupon');
      expect(resCoupon.status).toBe(404);
    });
  });

  describe('When ENABLE_DEV_ROUTES=false in non-production', () => {
    beforeEach(() => {
      (env as any).NODE_ENV = 'test';
      (env as any).ENABLE_DEV_ROUTES = false;
    });

    it('returns 404 when ENABLE_DEV_ROUTES is false', async () => {
      const app = createApp();

      const resCheckout = await request(app).get('/dev/checkout');
      expect(resCheckout.status).toBe(404);

      const resPlayer = await request(app).get('/dev/player');
      expect(resPlayer.status).toBe(404);

      const resVerify = await request(app).post('/dev/verify-student');
      expect(resVerify.status).toBe(404);

      const resCoupon = await request(app).post('/dev/ensure-test-coupon');
      expect(resCoupon.status).toBe(404);
    });
  });

  describe('When ENABLE_DEV_ROUTES=true in non-production', () => {
    beforeEach(() => {
      (env as any).NODE_ENV = 'test';
      (env as any).ENABLE_DEV_ROUTES = true;
    });

    it('mounts dev routes successfully and serves /dev/checkout and /dev/player', async () => {
      const devApp = createApp();

      const resCheckout = await request(devApp).get('/dev/checkout');
      expect(resCheckout.status).toBe(200);
      expect(resCheckout.text).toContain('Razorpay Test Mode Checkout');

      const resPlayer = await request(devApp).get('/dev/player');
      expect(resPlayer.status).toBe(200);
      expect(resPlayer.text).toContain('Secure Player Test');
    });
  });
});
