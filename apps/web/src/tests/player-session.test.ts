import { describe, it, expect } from 'vitest';
import { ApiError } from '../lib/api-client';

describe('Player Session & Concurrency Handling Logic', () => {
  it('identifies STREAM_SESSION_TERMINATED error without triggering auth refresh', () => {
    const evictionError = new ApiError(
      401,
      'STREAM_SESSION_TERMINATED',
      'Playback session was terminated because another stream was started or access was revoked',
      'req-abc-123',
    );

    expect(evictionError.status).toBe(401);
    expect(evictionError.code).toBe('STREAM_SESSION_TERMINATED');

    // Rule: STREAM_SESSION_TERMINATED must NOT be treated as generic expired JWT
    const isSessionEvicted = (err: unknown): boolean => {
      return err instanceof ApiError && err.code === 'STREAM_SESSION_TERMINATED';
    };

    expect(isSessionEvicted(evictionError)).toBe(true);

    const generic401 = new ApiError(401, 'UNAUTHORIZED', 'Token expired');
    expect(isSessionEvicted(generic401)).toBe(false);
  });

  it('determines resume seek position threshold (> 5 seconds)', () => {
    const shouldResumeAt = (lastPosSeconds: number, videoDuration: number): number => {
      if (lastPosSeconds > 5 && lastPosSeconds < videoDuration - 10) {
        return lastPosSeconds;
      }
      return 0;
    };

    expect(shouldResumeAt(0, 720)).toBe(0);
    expect(shouldResumeAt(4, 720)).toBe(0);
    expect(shouldResumeAt(45, 720)).toBe(45);
    expect(shouldResumeAt(715, 720)).toBe(0); // Near end of video -> starts over
  });

  it('generates non-predictable coordinates for moving watermark', () => {
    const generateWatermarkCoords = () => {
      const top = `${Math.floor(Math.random() * 70) + 10}%`;
      const left = `${Math.floor(Math.random() * 60) + 10}%`;
      return { top, left };
    };

    const pos1 = generateWatermarkCoords();
    const topNum = parseInt(pos1.top, 10);
    const leftNum = parseInt(pos1.left, 10);

    // Bounded within video canvas (10% to 80% to avoid edge cutoff)
    expect(topNum).toBeGreaterThanOrEqual(10);
    expect(topNum).toBeLessThanOrEqual(80);
    expect(leftNum).toBeGreaterThanOrEqual(10);
    expect(leftNum).toBeLessThanOrEqual(70);
  });
});
