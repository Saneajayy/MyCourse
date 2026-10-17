import os from 'os';
import * as argon2 from 'argon2';
import { ServiceUnavailableError } from '../errors/app-error.js';

/**
 * RFC 9106 Recommended Argon2id Parameters for high-security password hashing:
 * - type: Argon2id (hybrid resistant to both side-channel and GPU cracking)
 * - memoryCost: 65536 KiB (64 MiB)
 * - timeCost: 3 iterations
 * - parallelism: 4 threads
 * - hashLength: 32 bytes
 */
export const ARGON2_OPTIONS: argon2.Options & { type: 2 } = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
  hashLength: 32,
};

// Dummy hash for constant-time comparison to prevent user enumeration
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHRmb3JkdW1teXZlcmlmeQ$8pY3V7vH1Q9K9P+5r8s8L0qW3vH1Q9K9P+5r8s8L0qU';

function getDefaultConcurrency(): number {
  const envVal = parseInt(process.env.ARGON2_CONCURRENCY || '', 10);
  if (!isNaN(envVal) && envVal > 0) return envVal;
  const cpuCount = os.cpus()?.length || 4;
  return Math.max(4, Math.min(cpuCount, 8));
}

function getDefaultQueueSize(): number {
  const envVal = parseInt(process.env.ARGON2_MAX_QUEUE || '', 10);
  if (!isNaN(envVal) && envVal >= 0) return envVal;
  return 256;
}

let maxConcurrent = getDefaultConcurrency();
let maxQueue = getDefaultQueueSize();
const QUEUE_TIMEOUT_MS = parseInt(process.env.ARGON2_QUEUE_TIMEOUT_MS || '', 10) || 20_000;

let activeHashes = 0;
const waitingQueue: (() => void)[] = [];

export function getArgon2QueueMetrics() {
  return {
    activeHashes,
    waitingQueueDepth: waitingQueue.length,
    maxConcurrent,
    maxQueue,
  };
}

export function _configureArgon2CapacityForTesting(concurrent: number, queue: number): void {
  maxConcurrent = concurrent;
  maxQueue = queue;
}

export function _resetArgon2CapacityForTesting(): void {
  maxConcurrent = getDefaultConcurrency();
  maxQueue = getDefaultQueueSize();
  activeHashes = 0;
  waitingQueue.length = 0;
}

async function acquireSlot(): Promise<void> {
  if (activeHashes < maxConcurrent) {
    activeHashes++;
    return;
  }
  if (waitingQueue.length >= maxQueue) {
    throw new ServiceUnavailableError(
      'Authentication server busy: too many concurrent requests. Please retry shortly.',
    );
  }
  return new Promise<void>((resolve, reject) => {
    let timer: NodeJS.Timeout | null = null;
    const task = () => {
      if (timer) clearTimeout(timer);
      activeHashes++;
      resolve();
    };

    timer = setTimeout(() => {
      const idx = waitingQueue.indexOf(task);
      if (idx !== -1) {
        waitingQueue.splice(idx, 1);
      }
      reject(
        new ServiceUnavailableError(
          'Authentication server busy: request timed out waiting for password hashing capacity.',
        ),
      );
    }, QUEUE_TIMEOUT_MS);

    waitingQueue.push(task);
  });
}

function releaseSlot(): void {
  activeHashes--;
  if (waitingQueue.length > 0) {
    const next = waitingQueue.shift();
    if (next) next();
  }
}

export async function withArgon2ConcurrencyCap<T>(fn: () => Promise<T>): Promise<T> {
  await acquireSlot();
  try {
    return await fn();
  } finally {
    releaseSlot();
  }
}

export async function hashPassword(password: string): Promise<string> {
  return withArgon2ConcurrencyCap(() => argon2.hash(password, ARGON2_OPTIONS));
}

export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  return withArgon2ConcurrencyCap(async () => {
    try {
      return await argon2.verify(hash, plaintext, ARGON2_OPTIONS);
    } catch {
      return false;
    }
  });
}

/**
 * Performs a dummy argon2 verification so failed logins for non-existent users
 * consume identical CPU time, preventing timing-based user enumeration.
 */
export async function dummyVerifyPassword(plaintext: string): Promise<void> {
  return withArgon2ConcurrencyCap(async () => {
    try {
      await argon2.verify(DUMMY_HASH, plaintext, ARGON2_OPTIONS);
    } catch {
      // Ignore dummy failure
    }
  });
}
