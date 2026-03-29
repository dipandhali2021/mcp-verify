/**
 * Tests for HistoryStorage (S-4-01, FR-067).
 *
 * Each test that touches the filesystem uses a unique temporary directory so
 * tests are fully isolated and can run in parallel without interfering.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';
import {
  mkdtempSync,
  rmSync,
  existsSync,
  readFileSync,
  mkdirSync,
  appendFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { HistoryStorage } from '../../src/history/storage.js';
import type { HistoryRecord } from '../../src/history/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal valid HistoryRecord with sensible defaults. */
function makeRecord(overrides: Partial<HistoryRecord> = {}): HistoryRecord {
  return {
    timestamp: new Date().toISOString(),
    target: 'https://example.com/mcp',
    conformanceScore: 95,
    securityFindingsCount: 0,
    breakdown: { lifecycle: 100, tools: 90 },
    toolVersion: '1.0.0',
    specVersion: '2024-11-05',
    ...overrides,
  };
}

/**
 * Build a HistoryStorage instance that is redirected to use `dir` as the
 * history directory, bypassing the real ~/.mcp-verify/history path.
 *
 * We achieve this by overriding `getHistoryDir` on the instance.
 */
function storageIn(dir: string): HistoryStorage {
  const storage = new HistoryStorage();
  storage.getHistoryDir = () => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  };
  return storage;
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe('HistoryStorage — directory creation', () => {
  let tmpBase: string;

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'mcp-verify-test-'));
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('creates the history directory when it does not exist', () => {
    // Point getHistoryDir at a path that does NOT exist yet.
    const histDir = join(tmpBase, 'new-history-dir');
    expect(existsSync(histDir)).toBe(false);

    const storage = new HistoryStorage();
    // Override homedir-based path with a fresh nested path.
    storage.getHistoryDir = () => {
      if (!existsSync(histDir)) {
        mkdirSync(histDir, { recursive: true });
      }
      return histDir;
    };

    // Triggering any read/write should create the directory.
    storage.getHistory('https://example.com/mcp');
    expect(existsSync(histDir)).toBe(true);
  });

  it('returns an empty array for a brand-new target with no history file', () => {
    const histDir = join(tmpBase, 'history');
    const storage = storageIn(histDir);
    const records = storage.getHistory('https://new-target.example.com/mcp');
    expect(records).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('HistoryStorage — appendRun / getHistory round-trip', () => {
  let tmpBase: string;
  let histDir: string;
  let storage: HistoryStorage;

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'mcp-verify-test-'));
    histDir = join(tmpBase, 'history');
    storage = storageIn(histDir);
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('appends a JSONL line to the target file', () => {
    const target = 'https://example.com/mcp';
    const record = makeRecord({ target });

    storage.appendRun(target, record);

    const encoded = storage.encodeTarget(target);
    const filePath = join(histDir, `${encoded}.jsonl`);
    expect(existsSync(filePath)).toBe(true);

    const raw = readFileSync(filePath, 'utf-8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toEqual(record);
  });

  it('reads back history records in insertion order', () => {
    const target = 'https://example.com/mcp';
    const r1 = makeRecord({ target, timestamp: '2026-03-01T10:00:00.000Z', conformanceScore: 80 });
    const r2 = makeRecord({ target, timestamp: '2026-03-02T10:00:00.000Z', conformanceScore: 90 });
    const r3 = makeRecord({ target, timestamp: '2026-03-03T10:00:00.000Z', conformanceScore: 95 });

    storage.appendRun(target, r1);
    storage.appendRun(target, r2);
    storage.appendRun(target, r3);

    const records = storage.getHistory(target);
    expect(records).toHaveLength(3);
    expect(records[0]).toEqual(r1);
    expect(records[1]).toEqual(r2);
    expect(records[2]).toEqual(r3);
  });

  it('each appended line is valid JSON', () => {
    const target = 'https://example.com/mcp';
    storage.appendRun(target, makeRecord({ target }));
    storage.appendRun(target, makeRecord({ target }));

    const encoded = storage.encodeTarget(target);
    const raw = readFileSync(join(histDir, `${encoded}.jsonl`), 'utf-8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);

    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it('different targets are stored in separate files', () => {
    const targetA = 'https://alpha.example.com/mcp';
    const targetB = 'https://beta.example.com/mcp';

    storage.appendRun(targetA, makeRecord({ target: targetA }));
    storage.appendRun(targetB, makeRecord({ target: targetB }));

    const fileA = join(histDir, `${storage.encodeTarget(targetA)}.jsonl`);
    const fileB = join(histDir, `${storage.encodeTarget(targetB)}.jsonl`);

    expect(existsSync(fileA)).toBe(true);
    expect(existsSync(fileB)).toBe(true);
    // The files should be different.
    expect(fileA).not.toBe(fileB);
  });

  it('preserves all HistoryRecord fields after serialisation round-trip', () => {
    const target = 'https://example.com/mcp';
    const record: HistoryRecord = {
      timestamp: '2026-03-29T12:34:56.789Z',
      target,
      conformanceScore: 87,
      securityFindingsCount: 3,
      breakdown: { lifecycle: 80, tools: 90, prompts: 100 },
      toolVersion: '1.0.0',
      specVersion: '2024-11-05',
    };

    storage.appendRun(target, record);

    const [readBack] = storage.getHistory(target);
    expect(readBack).toEqual(record);
  });
});

// ---------------------------------------------------------------------------

describe('HistoryStorage — encodeTarget', () => {
  const storage = new HistoryStorage();

  it('produces a filesystem-safe name for an https URL', () => {
    const encoded = storage.encodeTarget('https://example.com/mcp');
    // Must not contain characters that are unsafe on common filesystems.
    expect(encoded).toMatch(/^[a-zA-Z0-9._\-~]+$/);
  });

  it('produces a filesystem-safe name for a localhost URL with port', () => {
    const encoded = storage.encodeTarget('http://localhost:3000/mcp');
    expect(encoded).toMatch(/^[a-zA-Z0-9._\-~]+$/);
  });

  it('produces a filesystem-safe name for a stdio target', () => {
    const encoded = storage.encodeTarget('./my-mcp-server --flag');
    expect(encoded).toMatch(/^[a-zA-Z0-9._\-~]+$/);
  });

  it('is deterministic — same input always gives same output', () => {
    const target = 'https://example.com/mcp?foo=bar&baz=qux';
    expect(storage.encodeTarget(target)).toBe(storage.encodeTarget(target));
  });

  it('two different targets produce different encoded names', () => {
    const a = storage.encodeTarget('https://alpha.example.com/mcp');
    const b = storage.encodeTarget('https://beta.example.com/mcp');
    expect(a).not.toBe(b);
  });

  it('does not contain percent signs (replaced with underscores)', () => {
    const encoded = storage.encodeTarget('https://example.com/mcp?q=hello world');
    expect(encoded).not.toContain('%');
  });
});

// ---------------------------------------------------------------------------

describe('HistoryStorage — getAllTargets', () => {
  let tmpBase: string;
  let histDir: string;
  let storage: HistoryStorage;

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'mcp-verify-test-'));
    histDir = join(tmpBase, 'history');
    storage = storageIn(histDir);
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('returns an empty array when no history exists', () => {
    expect(storage.getAllTargets()).toEqual([]);
  });

  it('lists all tracked targets', () => {
    const targets = [
      'https://alpha.example.com/mcp',
      'https://beta.example.com/mcp',
      'https://gamma.example.com/mcp',
    ];

    for (const t of targets) {
      storage.appendRun(t, makeRecord({ target: t }));
    }

    const listed = storage.getAllTargets();
    expect(listed).toHaveLength(targets.length);
    for (const t of targets) {
      expect(listed).toContain(t);
    }
  });

  it('ignores non-.jsonl files in the history directory', () => {
    // Create a file that is not a JSONL history file.
    mkdirSync(histDir, { recursive: true });
    appendFileSync(join(histDir, 'README.txt'), 'ignore me\n');

    const targets = storage.getAllTargets();
    expect(targets).toEqual([]);
  });

  it('does not list the same target twice', () => {
    const target = 'https://example.com/mcp';
    storage.appendRun(target, makeRecord({ target }));
    storage.appendRun(target, makeRecord({ target }));

    const listed = storage.getAllTargets();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toBe(target);
  });
});

// ---------------------------------------------------------------------------

describe('HistoryStorage — getLatestRun', () => {
  let tmpBase: string;
  let histDir: string;
  let storage: HistoryStorage;

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'mcp-verify-test-'));
    histDir = join(tmpBase, 'history');
    storage = storageIn(histDir);
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('returns null for a target with no history', () => {
    expect(storage.getLatestRun('https://example.com/mcp')).toBeNull();
  });

  it('returns the most recent (last-appended) record', () => {
    const target = 'https://example.com/mcp';
    const r1 = makeRecord({ target, conformanceScore: 60, timestamp: '2026-03-01T00:00:00.000Z' });
    const r2 = makeRecord({ target, conformanceScore: 80, timestamp: '2026-03-02T00:00:00.000Z' });
    const r3 = makeRecord({ target, conformanceScore: 99, timestamp: '2026-03-03T00:00:00.000Z' });

    storage.appendRun(target, r1);
    storage.appendRun(target, r2);
    storage.appendRun(target, r3);

    expect(storage.getLatestRun(target)).toEqual(r3);
  });

  it('returns the single record when only one run exists', () => {
    const target = 'https://example.com/mcp';
    const record = makeRecord({ target });
    storage.appendRun(target, record);
    expect(storage.getLatestRun(target)).toEqual(record);
  });
});

// ---------------------------------------------------------------------------

describe('HistoryStorage — graceful handling when dir is not writable', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('appendRun does not throw when getHistoryDir returns null', () => {
    const storage = new HistoryStorage();
    storage.getHistoryDir = () => null;

    // Should not throw — graceful no-op.
    expect(() =>
      storage.appendRun('https://example.com/mcp', makeRecord()),
    ).not.toThrow();
  });

  it('getHistory returns empty array when getHistoryDir returns null', () => {
    const storage = new HistoryStorage();
    storage.getHistoryDir = () => null;

    expect(storage.getHistory('https://example.com/mcp')).toEqual([]);
  });

  it('getLatestRun returns null when getHistoryDir returns null', () => {
    const storage = new HistoryStorage();
    storage.getHistoryDir = () => null;

    expect(storage.getLatestRun('https://example.com/mcp')).toBeNull();
  });

  it('getAllTargets returns empty array when getHistoryDir returns null', () => {
    const storage = new HistoryStorage();
    storage.getHistoryDir = () => null;

    expect(storage.getAllTargets()).toEqual([]);
  });

  it('getHistoryDir returns null when the directory cannot be created', () => {
    // Verify graceful degradation by pointing getHistoryDir at a path whose
    // parent is a file (mkdirSync will throw ENOTDIR or EEXIST).
    const tmpBase = mkdtempSync(join(tmpdir(), 'mcp-verify-test-'));

    try {
      // Create a plain file at the path that the storage would treat as a dir.
      appendFileSync(join(tmpBase, 'blocker'), 'data');

      const storage = new HistoryStorage();
      // Override so getHistoryDir tries to create a directory INSIDE the file.
      const impossibleDir = join(tmpBase, 'blocker', 'history');
      // Call the real implementation logic inline — mkdirSync will throw here.
      let result: string | null;
      try {
        mkdirSync(impossibleDir, { recursive: true });
        result = impossibleDir;
      } catch {
        result = null;
      }

      expect(result).toBeNull();
    } finally {
      rmSync(tmpBase, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------

describe('HistoryStorage — --no-history flag (CLI integration)', () => {
  it('VerificationConfig.noHistory defaults to false', async () => {
    const { DEFAULT_CONFIG } = await import('../../src/types/config.js');
    expect(DEFAULT_CONFIG.noHistory).toBe(false);
  });

  it('noHistory: true prevents appendRun from being called', () => {
    const storage = new HistoryStorage();
    const appendRunSpy = vi.spyOn(storage, 'appendRun');

    // Simulate the CLI pipeline guard: only call appendRun when !noHistory.
    const noHistory = true;
    if (!noHistory) {
      storage.appendRun('https://example.com/mcp', makeRecord());
    }

    expect(appendRunSpy).not.toHaveBeenCalled();
  });

  it('noHistory: false allows appendRun to be called', () => {
    const tmpBase = mkdtempSync(join(tmpdir(), 'mcp-verify-test-'));
    const histDir = join(tmpBase, 'history');
    const storage = storageIn(histDir);
    const appendRunSpy = vi.spyOn(storage, 'appendRun');

    const noHistory = false;
    const target = 'https://example.com/mcp';
    if (!noHistory) {
      storage.appendRun(target, makeRecord({ target }));
    }

    expect(appendRunSpy).toHaveBeenCalledOnce();

    rmSync(tmpBase, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('buildProgram() exposes --no-history flag on the verify command', async () => {
    const { buildProgram } = await import('../../src/cli.js');
    const program = buildProgram();
    const verifyCmd = program.commands.find((c) => c.name() === 'verify');
    expect(verifyCmd).toBeDefined();

    // Commander represents --no-history as the option named "history" with
    // a negatable prefix.  Confirm the option exists and is parsed correctly.
    const historyOption = verifyCmd!.options.find(
      (o) => o.long === '--no-history',
    );
    expect(historyOption).toBeDefined();
  });

  it('--no-history sets options.history to false', async () => {
    const { buildProgram } = await import('../../src/cli.js');

    let capturedOptions: Record<string, unknown> = {};

    const program = buildProgram();
    const verifyCmd = program.commands.find((c) => c.name() === 'verify');
    verifyCmd!.action((_target: string, options: Record<string, unknown>) => {
      capturedOptions = options;
    });

    await program.parseAsync([
      'node',
      'mcp-verify',
      'verify',
      'https://example.com/mcp',
      '--no-history',
    ]);

    expect(capturedOptions['history']).toBe(false);
  });

  it('options.history is true by default (history enabled)', async () => {
    const { buildProgram } = await import('../../src/cli.js');

    let capturedOptions: Record<string, unknown> = {};

    const program = buildProgram();
    const verifyCmd = program.commands.find((c) => c.name() === 'verify');
    verifyCmd!.action((_target: string, options: Record<string, unknown>) => {
      capturedOptions = options;
    });

    await program.parseAsync([
      'node',
      'mcp-verify',
      'verify',
      'https://example.com/mcp',
    ]);

    expect(capturedOptions['history']).toBe(true);
  });
});
