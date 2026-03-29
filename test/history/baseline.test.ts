/**
 * Tests for baseline storage (S-4-02, FR-073).
 *
 * Each test suite uses a unique temporary directory so tests are fully
 * isolated and can run in parallel without interfering.
 *
 * Because getBaselineDir / saveBaseline / getBaseline all accept an optional
 * `baseDir` parameter, we redirect filesystem access to a temp dir without
 * needing to mock os.homedir.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest';
import {
  mkdtempSync,
  rmSync,
  existsSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  getBaselineDir,
  saveBaseline,
  getBaseline,
} from '../../src/history/baseline.js';
import { HistoryStorage } from '../../src/history/storage.js';
import type { HistoryRecord } from '../../src/history/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<HistoryRecord> = {}): HistoryRecord {
  return {
    timestamp: new Date().toISOString(),
    target: 'https://example.com/mcp',
    conformanceScore: 90,
    securityFindingsCount: 0,
    breakdown: { lifecycle: 90 },
    toolVersion: '1.0.0',
    specVersion: '2024-11-05',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getBaselineDir
// ---------------------------------------------------------------------------

describe('getBaselineDir', () => {
  let tmpBase: string;

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'mcp-verify-baseline-test-'));
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  it('returns a path ending in .mcp-verify/baselines', () => {
    const dir = getBaselineDir(tmpBase);
    expect(dir).not.toBeNull();
    expect(dir).toMatch(/\.mcp-verify[/\\]baselines$/);
  });

  it('creates the directory when it does not exist', () => {
    const freshBase = join(tmpBase, 'fresh-home');
    mkdirSync(freshBase);

    const expectedDir = join(freshBase, '.mcp-verify', 'baselines');
    expect(existsSync(expectedDir)).toBe(false);

    const result = getBaselineDir(freshBase);
    expect(result).not.toBeNull();
    expect(existsSync(expectedDir)).toBe(true);
  });

  it('returns the same path when called twice (idempotent)', () => {
    const first = getBaselineDir(tmpBase);
    const second = getBaselineDir(tmpBase);
    expect(first).toBe(second);
  });

  it('returns null when the directory path is inside a file (creation fails)', () => {
    // Create a plain file at the would-be parent path so mkdirSync fails
    const blocker = join(tmpBase, 'blocker');
    writeFileSync(blocker, 'i am a file');

    // getBaselineDir(blocker) tries to create blocker/.mcp-verify/baselines
    // but blocker is a file, so mkdirSync fails.
    const result = getBaselineDir(blocker);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// saveBaseline / getBaseline round-trip
// ---------------------------------------------------------------------------

describe('saveBaseline and getBaseline — round-trip', () => {
  let tmpBase: string;

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'mcp-verify-baseline-test-'));
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  it('saves a baseline and retrieves it back', () => {
    const target = 'https://example.com/mcp';
    const record = makeRecord({ target, conformanceScore: 85 });

    saveBaseline(target, record, tmpBase);
    const retrieved = getBaseline(target, tmpBase);

    expect(retrieved).toEqual(record);
  });

  it('returns null for a target with no baseline', () => {
    const result = getBaseline('https://no-baseline.example.com/mcp', tmpBase);
    expect(result).toBeNull();
  });

  it('overwrites an existing baseline with the new record', () => {
    const target = 'https://example.com/mcp';
    const original = makeRecord({ target, conformanceScore: 70 });
    const updated = makeRecord({ target, conformanceScore: 95 });

    saveBaseline(target, original, tmpBase);
    saveBaseline(target, updated, tmpBase);

    const retrieved = getBaseline(target, tmpBase);
    expect(retrieved?.conformanceScore).toBe(95);
  });

  it('preserves all HistoryRecord fields after save/retrieve cycle', () => {
    const target = 'https://example.com/mcp';
    const record: HistoryRecord = {
      timestamp: '2026-03-29T10:00:00.000Z',
      target,
      conformanceScore: 88,
      securityFindingsCount: 2,
      breakdown: { lifecycle: 90, tools: 85 },
      toolVersion: '1.0.0',
      specVersion: '2024-11-05',
    };

    saveBaseline(target, record, tmpBase);
    const retrieved = getBaseline(target, tmpBase);

    expect(retrieved).toEqual(record);
  });

  it('different targets are stored as separate files', () => {
    const targetA = 'https://alpha.example.com/mcp';
    const targetB = 'https://beta.example.com/mcp';

    saveBaseline(targetA, makeRecord({ target: targetA, conformanceScore: 60 }), tmpBase);
    saveBaseline(targetB, makeRecord({ target: targetB, conformanceScore: 80 }), tmpBase);

    const retrievedA = getBaseline(targetA, tmpBase);
    const retrievedB = getBaseline(targetB, tmpBase);

    expect(retrievedA?.conformanceScore).toBe(60);
    expect(retrievedB?.conformanceScore).toBe(80);
  });

  it('the baseline file exists on disk after saveBaseline', () => {
    const target = 'https://example.com/mcp';
    saveBaseline(target, makeRecord({ target }), tmpBase);

    const storage = new HistoryStorage();
    const encoded = storage.encodeTarget(target);
    const baselineDir = join(tmpBase, '.mcp-verify', 'baselines');
    const filePath = join(baselineDir, `${encoded}.json`);

    expect(existsSync(filePath)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('getBaseline — invalid JSON handling', () => {
  let tmpBase: string;
  let baselineDir: string;

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'mcp-verify-baseline-test-'));
    baselineDir = join(tmpBase, '.mcp-verify', 'baselines');
    mkdirSync(baselineDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  it('throws when the baseline file contains invalid JSON', () => {
    const target = 'https://example.com/mcp';

    // Manually write corrupted JSON into the baseline file
    const storage = new HistoryStorage();
    const encoded = storage.encodeTarget(target);
    const filePath = join(baselineDir, `${encoded}.json`);
    writeFileSync(filePath, '{ invalid json }', 'utf-8');

    expect(() => getBaseline(target, tmpBase)).toThrow(/invalid JSON/i);
  });
});

describe('getBaseline — unavailable directory', () => {
  let tmpBase: string;

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'mcp-verify-baseline-test-'));
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  it('returns null when the baseline directory cannot be created', () => {
    // Point baseDir at a FILE so mkdirSync fails for the baselines dir
    const blocker = join(tmpBase, 'blocker');
    writeFileSync(blocker, 'i am a file');

    // getBaseline(target, blocker) → getBaselineDir(blocker) → returns null
    const result = getBaseline('https://example.com/mcp', blocker);
    expect(result).toBeNull();
  });
});

describe('saveBaseline — error handling', () => {
  let tmpBase: string;

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'mcp-verify-baseline-test-'));
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  it('throws when the baseline directory cannot be created', () => {
    // Point baseDir at a FILE so mkdirSync fails for the baselines dir
    const blocker = join(tmpBase, 'blocker');
    writeFileSync(blocker, 'i am a file');

    expect(() =>
      saveBaseline('https://example.com/mcp', makeRecord(), blocker),
    ).toThrow();
  });
});
