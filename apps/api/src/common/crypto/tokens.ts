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
 * Derives a domain-separated 32-byte cryptographic subkey using RFC 5869 HKDF-SHA256 (F4)
 */
export function deriveSubKey(masterKey: string, info: string, length = 32): Buffer {
  return Buffer.from(
    crypto.hkdfSync(
      'sha256',
      Buffer.from(masterKey, 'utf-8'),
      Buffer.alloc(0),
      Buffer.from(info, 'utf-8'),
      length,
    ),
  );
}

/**
 * Computes keyed HMAC-SHA256 for recovery code storage using derived HMAC subkey.
 * This ensures that even in the event of a read-only database leak, an attacker without the server key
 * cannot verify or brute-force recovery codes.
 */
export function hmacRecoveryCode(code: string, serverKey: string): string {
  const hmacKey = deriveSubKey(serverKey, 'recovery_code_hmac_v1', 32);
  return crypto.createHmac('sha256', hmacKey).update(code.trim().toUpperCase()).digest('hex');
}

/**
 * Legacy 32-byte key derivation fallback for seamless migration of older records
 */
function deriveLegacyKey(secretKey: string): Buffer {
  return crypto.createHash('sha256').update(secretKey).digest();
}

/**
 * Encrypts plaintext using AES-256-GCM authenticated encryption with HKDF-derived key
 * Format: iv_hex:authTag_hex:ciphertext_hex
 */
export function encryptData(plaintext: string, secretKey: string): string {
  const key = deriveSubKey(secretKey, 'totp_aes_encryption_v1', 32);
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts AES-256-GCM encrypted payload and verifies message integrity tag.
 * Supports transparent fallback to legacy SHA-256 key derivation for backwards compatibility.
 */
export function decryptData(encryptedString: string, secretKey: string): string {
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const ivHex = parts[0] ?? '';
  const tagHex = parts[1] ?? '';
  const ciphertextHex = parts[2] ?? '';

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  // 1. Try HKDF derived subkey (standard)
  try {
    const key = deriveSubKey(secretKey, 'totp_aes_encryption_v1', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    // 2. Safe fallback to legacy key derivation for pre-existing records
    const legacyKey = deriveLegacyKey(secretKey);
    const decipher = crypto.createDecipheriv('aes-256-gcm', legacyKey, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}
