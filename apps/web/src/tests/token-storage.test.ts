import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAccessToken, setAccessToken, clearAccessToken } from '../lib/api-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '..');

function getSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'tests' && entry.name !== '__tests__') {
        files = files.concat(getSourceFiles(res));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(res);
    }
  }
  return files;
}

function stripComments(code: string): string {
  // Strip single-line and multi-line comments so comments documenting policy aren't flagged
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
}

describe('Token Storage Security & Browser Storage Audit (T4)', () => {
  const allSourceFiles = getSourceFiles(srcDir);

  it('verifies all source files in apps/web/src exist and are scannable', () => {
    expect(allSourceFiles.length).toBeGreaterThan(5);
  });

  it('fails if ANY file writes tokens, secrets, or credentials to localStorage', () => {
    const violations: { file: string; line: number; match: string }[] = [];

    for (const filePath of allSourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const stripped = stripComments(line).trim();
        if (
          stripped.includes('localStorage.setItem') ||
          stripped.includes('window.localStorage.setItem')
        ) {
          violations.push({
            file: path.relative(srcDir, filePath),
            line: index + 1,
            match: stripped,
          });
        }
      });
    }

    expect(
      violations,
      `Detected forbidden localStorage writes in apps/web: ${JSON.stringify(violations, null, 2)}`,
    ).toEqual([]);
  });

  it('fails if ANY file writes auth tokens, secrets, or passwords to sessionStorage', () => {
    const sensitiveKeyPattern =
      /sessionStorage\.(setItem|\[)\s*\(?['"`].*(token|secret|jwt|auth|password|credential)/i;
    const violations: { file: string; line: number; match: string }[] = [];

    for (const filePath of allSourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const stripped = stripComments(line).trim();
        if (sensitiveKeyPattern.test(stripped)) {
          violations.push({
            file: path.relative(srcDir, filePath),
            line: index + 1,
            match: stripped,
          });
        }
      });
    }

    expect(
      violations,
      `Detected sensitive sessionStorage writes in apps/web: ${JSON.stringify(violations, null, 2)}`,
    ).toEqual([]);
  });

  it('proves api-client access token management operates strictly in-memory without touching storage', () => {
    // Mock browser storage objects
    const localSetItemSpy = vi.fn();
    const sessionSetItemSpy = vi.fn();

    const originalLocalStorage = globalThis.localStorage;
    const originalSessionStorage = globalThis.sessionStorage;

    Object.defineProperty(globalThis, 'localStorage', {
      value: { setItem: localSetItemSpy },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: { setItem: sessionSetItemSpy },
      configurable: true,
      writable: true,
    });

    try {
      // 1. Initial state
      clearAccessToken();
      expect(getAccessToken()).toBeNull();

      // 2. Set token in memory
      const sampleToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      setAccessToken(sampleToken);
      expect(getAccessToken()).toBe(sampleToken);

      // Verify no storage write happened
      expect(localSetItemSpy).not.toHaveBeenCalled();
      expect(sessionSetItemSpy).not.toHaveBeenCalled();

      // 3. Clear token
      clearAccessToken();
      expect(getAccessToken()).toBeNull();
      expect(localSetItemSpy).not.toHaveBeenCalled();
      expect(sessionSetItemSpy).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalLocalStorage,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(globalThis, 'sessionStorage', {
        value: originalSessionStorage,
        configurable: true,
        writable: true,
      });
    }
  });
});
