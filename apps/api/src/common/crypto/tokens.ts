import crypto from 'crypto';

/**
 * Generates cryptographically secure random token (32 bytes = 64 hex characters)
 */
export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Computes SHA-256 hash for database token storage (opaque refresh tokens, verification tokens, reset tokens)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Generates human-friendly 12-character alphanumeric recovery codes formatted as XXXX-XXXX-XXXX
 * (12 Base32 characters * 5 bits/char = exactly 60 bits of cryptographic entropy per code)
 */
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Base32 unambiguous set (32 chars = 5 bits each)

  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(12);
    let code = '';
    for (let j = 0; j < 12; j++) {
      const idx = (bytes[j] ?? 0) % chars.length;
      code += chars[idx];
      if (j === 3 || j === 7) code += '-';
    }
    codes.push(code);
  }

  return codes;
}

/**
 * Computes keyed HMAC-SHA256 for recovery code storage using the server's TOTP encryption key.
 * This ensures that even in the event of a read-only database leak, an attacker without the server key
 * cannot verify or brute-force recovery codes.
 */
export function hmacRecoveryCode(code: string, serverKey: string): string {
  return crypto.createHmac('sha256', serverKey).update(code.trim().toUpperCase()).digest('hex');
}

/**
 * Derives a consistent 32-byte key from any input string using SHA-256
 */
function derive32ByteKey(secretKey: string): Buffer {
  return crypto.createHash('sha256').update(secretKey).digest();
}

/**
 * Encrypts plaintext using AES-256-GCM authenticated encryption
 * Format: iv_hex:authTag_hex:ciphertext_hex
 */
export function encryptData(plaintext: string, secretKey: string): string {
  const key = derive32ByteKey(secretKey);
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts AES-256-GCM encrypted payload and verifies message integrity tag
 */
export function decryptData(encryptedString: string, secretKey: string): string {
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const ivHex = parts[0] ?? '';
  const tagHex = parts[1] ?? '';
  const ciphertextHex = parts[2] ?? '';

  const key = derive32ByteKey(secretKey);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}
