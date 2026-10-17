#!/usr/bin/env node

/**
 * Production Content Pre-Build Check (Phase 7 C2)
 * Fails if any unresolved "[TODO_REPLACE" markers remain in apps/web/src/config/site.ts or any page.
 *
 * Rules:
 * - Does NOT fail in development (process.env.NODE_ENV !== 'production' and !STRICT_CONTENT_CHECK)
 * - When STRICT_CONTENT_CHECK=true or in strict production mode:
 *   Scans site.ts and apps/web/src/app for "[TODO_REPLACE"
 *   If found, prints each violation with file path and line number, then exits with code 1.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');
const srcDir = path.resolve(webRoot, 'src');

export function scanForTodoMarkers(dirPaths) {
  const violations = [];

  function collectFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    const stat = fs.statSync(dir);
    if (stat.isFile()) {
      files.push(dir);
      return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.next') {
          collectFiles(full, files);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        files.push(full);
      }
    }
    return files;
  }

  const allFiles = [];
  for (const d of dirPaths) {
    collectFiles(d, allFiles);
  }

  for (const filePath of Array.from(new Set(allFiles))) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('[TODO_REPLACE')) {
        violations.push({
          file: path.relative(webRoot, filePath),
          line: idx + 1,
          content: line.trim(),
        });
      }
    });
  }

  return violations;
}

// If executed directly from command line
if (process.argv[1] && process.argv[1].endsWith('check-content-todos.js')) {
  const isProd = process.env.NODE_ENV === 'production';
  const isStrict = process.env.STRICT_CONTENT_CHECK === 'true';

  if (!isProd && !isStrict) {
    console.log('[Content Check] Skipped in development mode.');
    process.exit(0);
  }

  if (process.env.CI === 'true' && !isStrict) {
    console.log('[Content Check] CI build running with non-blocking content check.');
    process.exit(0);
  }

  const siteConfigPath = path.resolve(srcDir, 'config/site.ts');
  const appDir = path.resolve(srcDir, 'app');
  const violations = scanForTodoMarkers([siteConfigPath, appDir]);

  if (violations.length > 0) {
    console.error('\n❌ FATAL: Production build failed due to unreplaced [TODO_REPLACE] content markers:');
    violations.forEach((v) => {
      console.error(`  - ${v.file}:${v.line} -> ${v.content}`);
    });
    console.error('\nPlease update apps/web/src/config/site.ts with live values before deploying to production.\n');
    process.exit(1);
  } else {
    console.log('✅ Content Check: Zero [TODO_REPLACE] markers found. Safe for production.');
    process.exit(0);
  }
}
