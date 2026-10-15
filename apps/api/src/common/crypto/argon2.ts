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

let maxConcurrent = 4;
let maxQueue = 32;

let activeHashes = 0;
const waitingQueue: (() => void)[] = [];

export function _configureArgon2CapacityForTesting(concurrent: number, queue: number): void {
  maxConcurrent = concurrent;
  maxQueue = queue;
}

export function _resetArgon2CapacityForTesting(): void {
  maxConcurrent = 4;
  maxQueue = 32;
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
  return new Promise<void>((resolve) => {
    waitingQueue.push(() => {
      activeHashes++;
      resolve();
    });
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
