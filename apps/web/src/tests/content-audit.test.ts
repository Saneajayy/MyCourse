import { describe, it, expect } from 'vitest';
import { scanForTodoMarkers } from '../../scripts/check-content-todos.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '../..');
const siteConfigPath = path.resolve(webRoot, 'src/config/site.ts');

const fixturePath = path.resolve(__dirname, 'fixtures/todo-fixture.ts');

describe('Production Content Audit Pre-Build Check (C2)', () => {
  it('detects unresolved [TODO_REPLACE] markers in files', () => {
    const violations = scanForTodoMarkers([fixturePath]);

    // Confirms the scanner properly identifies markers
    expect(violations.length).toBeGreaterThan(0);
    const hasMarker = violations.some((v) =>
      v.content.includes('[TODO_REPLACE: TEST_FIXTURE_MARKER]'),
    );
    expect(hasMarker).toBe(true);
  });

  it('proves clean files return zero violations', () => {
    // Scan tax.ts or api-client.ts which have zero TODO_REPLACE markers
    const taxPath = path.resolve(webRoot, 'src/lib/tax.ts');
    const violations = scanForTodoMarkers([taxPath]);
    expect(violations).toEqual([]);
  });

  it('identifies exact file and line number for each marker', () => {
    const violations = scanForTodoMarkers([fixturePath]);
    for (const v of violations) {
      expect(v.file).toContain('todo-fixture.ts');
      expect(typeof v.line).toBe('number');
      expect(v.line).toBeGreaterThan(0);
      expect(v.content).toContain('[TODO_REPLACE');
    }
  });

  it('confirms site.ts configuration has zero unresolved [TODO_REPLACE] markers', () => {
    const violations = scanForTodoMarkers([siteConfigPath]);
    expect(violations).toEqual([]);
  });
});
