import { BadRequestError } from '../errors/app-error.js';
import { COMMON_PASSWORDS_10K } from './common-passwords-data.js';

// SecLists top 10,000 common passwords dataset
export const COMMON_PASSWORD_LIST: readonly string[] = COMMON_PASSWORDS_10K;

// Pre-populate HashSet for O(1) lookup
export const COMMON_PASSWORDS_SET = new Set<string>(COMMON_PASSWORDS_10K);

/**
 * Checks if a given password is too common or follows trivial predictable patterns
 * (e.g., 'Password123!', 'Welcome@2026', 'Admin#123').
 */
export function isCommonPassword(password: string): boolean {
  const normalized = password.trim().toLowerCase();

  // 1. Exact match in top-10k dictionary
  if (COMMON_PASSWORDS_SET.has(normalized)) {
    return true;
  }

  // 2. Strip leading/trailing digits, spaces, and punctuation to check root word
  // e.g. "Password123!" -> "password", "Admin@2026" -> "admin", "Secret12345" -> "secret"
  const stripped = normalized.replace(/^[^a-z]+|[^a-z]+$/gi, '');
  if (stripped.length >= 3 && COMMON_PASSWORDS_SET.has(stripped)) {
    return true;
  }

  // 3. Repeated character sequences (e.g. "aaaaaaaaaa", "1111111111")
  if (/^(.)\1{7,}$/.test(normalized)) {
    return true;
  }

  // 4. Sequential keyboard/digit patterns
  if (
    normalized.includes('123456') ||
    normalized.includes('qwerty') ||
    normalized.includes('asdfgh')
  ) {
    return true;
  }

  return false;
}

export function validatePasswordStrength(password: string): void {
  if (password.length < 10) {
    throw new BadRequestError('Password must be at least 10 characters long');
  }

  if (password.length > 128) {
    throw new BadRequestError('Password must not exceed 128 characters');
  }

  if (isCommonPassword(password)) {
    throw new BadRequestError(
      'Password is too common or easily guessable. Please choose a stronger, more unique password.',
    );
  }
}
