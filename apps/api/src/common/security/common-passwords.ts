import { BadRequestError } from '../errors/app-error.js';

// Top common password roots compiled from SecLists / OWASP Top Passwords datasets
const COMMON_PASSWORD_LIST: string[] = [
  'password',
  'password123',
  'password123!',
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  '12345',
  'qwerty',
  'qwertyuiop',
  'qwerty123',
  'welcome',
  'welcome123',
  'welcome123!',
  'admin',
  'admin123',
  'admin1234',
  'admin12345',
  'admin123456',
  'administrator',
  'changeme',
  'changeme123',
  'letmein',
  'letmein123',
  'sunshine',
  'princess',
  'football',
  'baseball',
  'monkey',
  'shadow',
  'master',
  'dragon',
  'superman',
  'batman',
  'trustno1',
  'iloveyou',
  'michael',
  'jessica',
  'charlie',
  'daniel',
  'thomas',
  'mustang',
  'harley',
  'computer',
  'internet',
  'secret',
  'access',
  'system',
  'database',
  'company',
  'service',
  'course',
  'engineering',
  'hydraulic',
  'hydraulics',
  'academy',
];

// Pre-populate HashSet for O(1) lookup
const COMMON_PASSWORDS_SET = new Set<string>(COMMON_PASSWORD_LIST.map((p) => p.toLowerCase()));

/**
 * Checks if a given password is too common or follows trivial predictable patterns
 * (e.g., 'Password123!', 'Welcome@2026', 'Admin#123').
 */
export function isCommonPassword(password: string): boolean {
  const normalized = password.trim().toLowerCase();

  // 1. Exact match in common dictionary
  if (COMMON_PASSWORDS_SET.has(normalized)) {
    return true;
  }

  // 2. Strip leading/trailing digits, spaces, and punctuation to check root word
  // e.g. "Password123!" -> "password", "Admin@2026" -> "admin"
  const stripped = normalized.replace(/^[^a-z]+|[^a-z]+$/gi, '');
  if (stripped.length >= 4 && COMMON_PASSWORDS_SET.has(stripped)) {
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

/**
 * Validates password policy:
 * - Length: 10-128 characters
 * - Not a commonly used or easily guessable password
 */
export function validatePasswordStrength(password: string): void {
  if (password.length < 10) {
    throw new BadRequestError('Password must be at least 10 characters long');
  }

  if (password.length > 128) {
    throw new BadRequestError('Password must not exceed 128 characters');
  }

  if (isCommonPassword(password)) {
    throw new BadRequestError(
      'Password is too common or easily guessable. Please choose a more secure password.',
    );
  }
}
