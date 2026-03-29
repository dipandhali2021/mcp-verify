/**
 * Tests for src/config/loader.ts (S-3-01 — FR-003 / FR-061)
 *
 * Strategy
 * --------
 * loadConfigFile() calls process.exit(2) for hard error cases, so each test
 * that expects an error path spies on process.exit and process.stderr.write,
 * prevents the real exit, and asserts that the spy was called with the
 * expected code / message.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfigFile } from '../../src/config/loader.js';
import type { ConfigFile } from '../../src/config/loader.js';

// ---------------------------------------------------------------------------
// Temporary directory helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

function setupTmpDir(): void {
  tmpDir = join('/tmp', `mcp-verify-test-${process.pid}-${Date.now()}`);
  mkdirSync(tmpDir, { recursive: true });
}

function teardownTmpDir(): void {
  rmSync(tmpDir, { recursive: true, force: true });
}

function writeTmp(filename: string, content: string): string {
  const p = join(tmpDir, filename);
  writeFileSync(p, content, 'utf-8');
  return p;
}

// ---------------------------------------------------------------------------
// process.exit / stderr spies
// ---------------------------------------------------------------------------

function spyOnProcessExit(): ReturnType<typeof vi.spyOn> {
  return vi
    .spyOn(process, 'exit')
    .mockImplementation((_code?: number | string | null | undefined) => {
      throw new Error(`process.exit(${String(_code ?? '')})`);
    });
}

function spyOnStderr(): ReturnType<typeof vi.spyOn> {
  return vi
    .spyOn(process.stderr, 'write')
    .mockImplementation(() => true);
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

beforeEach(setupTmpDir);
afterEach(() => {
  teardownTmpDir();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Auto-discovery — mcp-verify.json
// ---------------------------------------------------------------------------

describe('auto-discovery: mcp-verify.json', () => {
  it('returns parsed config when mcp-verify.json exists in cwd', () => {
    const content: ConfigFile = { timeout: 5000, format: 'json' };
    writeTmp('mcp-verify.json', JSON.stringify(content));

    const result = loadConfigFile(undefined, tmpDir);

    expect(result).not.toBeNull();
    expect(result?.timeout).toBe(5000);
    expect(result?.format).toBe('json');
  });

  it('returns all supported fields from mcp-verify.json', () => {
    const content: ConfigFile = {
      timeout: 15000,
      format: 'markdown',
      transport: 'http',
      failOnSeverity: 'high',
      conformanceThreshold: 80,
      skip: [
        { checkId: 'cors-wildcard', justification: 'Internal server' },
        { checkId: 'auth-gap' },
      ],
      checkMode: 'strict',
      verbose: true,
      output: '/tmp/report.md',
    };
    writeTmp('mcp-verify.json', JSON.stringify(content));

    const result = loadConfigFile(undefined, tmpDir);

    expect(result?.timeout).toBe(15000);
    expect(result?.format).toBe('markdown');
    expect(result?.transport).toBe('http');
    expect(result?.failOnSeverity).toBe('high');
    expect(result?.conformanceThreshold).toBe(80);
    expect(result?.skip).toHaveLength(2);
    expect(result?.skip?.[0]).toEqual({
      checkId: 'cors-wildcard',
      justification: 'Internal server',
    });
    expect(result?.skip?.[1]).toEqual({ checkId: 'auth-gap' });
    expect(result?.checkMode).toBe('strict');
    expect(result?.verbose).toBe(true);
    expect(result?.output).toBe('/tmp/report.md');
  });
});

// ---------------------------------------------------------------------------
// Auto-discovery — .mcp-verify.json
// ---------------------------------------------------------------------------

describe('auto-discovery: .mcp-verify.json', () => {
  it('returns parsed config when .mcp-verify.json exists in cwd', () => {
    const content: ConfigFile = { timeout: 8000, checkMode: 'lenient' };
    writeTmp('.mcp-verify.json', JSON.stringify(content));

    const result = loadConfigFile(undefined, tmpDir);

    expect(result).not.toBeNull();
    expect(result?.timeout).toBe(8000);
    expect(result?.checkMode).toBe('lenient');
  });

  it('prefers mcp-verify.json over .mcp-verify.json when both exist', () => {
    writeTmp('mcp-verify.json', JSON.stringify({ timeout: 1111 }));
    writeTmp('.mcp-verify.json', JSON.stringify({ timeout: 2222 }));

    const result = loadConfigFile(undefined, tmpDir);

    expect(result?.timeout).toBe(1111);
  });
});

// ---------------------------------------------------------------------------
// No config file
// ---------------------------------------------------------------------------

describe('no config file present', () => {
  it('returns null when no config file exists in cwd', () => {
    const result = loadConfigFile(undefined, tmpDir);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Explicit --config path
// ---------------------------------------------------------------------------

describe('explicit --config path', () => {
  it('loads the file at the given path', () => {
    const filePath = writeTmp('custom.json', JSON.stringify({ verbose: true }));

    const result = loadConfigFile(filePath, tmpDir);

    expect(result?.verbose).toBe(true);
  });

  it('resolves a relative path against cwd', () => {
    writeTmp('relative.json', JSON.stringify({ format: 'sarif' }));

    const result = loadConfigFile('relative.json', tmpDir);

    expect(result?.format).toBe('sarif');
  });

  it('exits with code 2 and writes to stderr when the file does not exist', () => {
    const exitSpy = spyOnProcessExit();
    const stderrSpy = spyOnStderr();

    expect(() =>
      loadConfigFile('/nonexistent/path/config.json', tmpDir),
    ).toThrow('process.exit(2)');

    expect(exitSpy).toHaveBeenCalledWith(2);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('Config file not found'),
    );
  });

  it('includes the resolved path in the error message for missing files', () => {
    spyOnProcessExit();
    const stderrSpy = spyOnStderr();
    const missingPath = '/nonexistent/definitely-missing.json';

    expect(() => loadConfigFile(missingPath, tmpDir)).toThrow('process.exit(2)');

    const calls = stderrSpy.mock.calls.flat();
    expect(calls.some((c) => typeof c === 'string' && c.includes(missingPath))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Invalid JSON
// ---------------------------------------------------------------------------

describe('invalid JSON handling', () => {
  it('exits with code 2 when the explicit config file has invalid JSON', () => {
    const filePath = writeTmp('bad.json', '{ not: valid json }');
    const exitSpy = spyOnProcessExit();
    spyOnStderr();

    expect(() => loadConfigFile(filePath, tmpDir)).toThrow('process.exit(2)');

    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('writes a descriptive message to stderr for invalid JSON', () => {
    const filePath = writeTmp('bad2.json', 'this is not json at all');
    spyOnProcessExit();
    const stderrSpy = spyOnStderr();

    expect(() => loadConfigFile(filePath, tmpDir)).toThrow('process.exit(2)');

    const calls = stderrSpy.mock.calls.flat();
    expect(
      calls.some(
        (c) =>
          typeof c === 'string' &&
          c.includes('invalid JSON'),
      ),
    ).toBe(true);
  });

  it('exits with code 2 when auto-discovered file has invalid JSON', () => {
    writeTmp('mcp-verify.json', '{{ bad }}');
    const exitSpy = spyOnProcessExit();
    spyOnStderr();

    expect(() => loadConfigFile(undefined, tmpDir)).toThrow('process.exit(2)');

    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('exits with code 2 when the top-level JSON value is not an object', () => {
    const filePath = writeTmp('array.json', '[1, 2, 3]');
    const exitSpy = spyOnProcessExit();
    spyOnStderr();

    expect(() => loadConfigFile(filePath, tmpDir)).toThrow('process.exit(2)');

    expect(exitSpy).toHaveBeenCalledWith(2);
  });

  it('exits with code 2 when the top-level JSON value is a string', () => {
    const filePath = writeTmp('string.json', '"hello"');
    const exitSpy = spyOnProcessExit();
    spyOnStderr();

    expect(() => loadConfigFile(filePath, tmpDir)).toThrow('process.exit(2)');

    expect(exitSpy).toHaveBeenCalledWith(2);
  });
});

// ---------------------------------------------------------------------------
// Partial config (only some fields present)
// ---------------------------------------------------------------------------

describe('partial config files', () => {
  it('returns only the fields present in the file', () => {
    writeTmp('mcp-verify.json', JSON.stringify({ format: 'json' }));

    const result = loadConfigFile(undefined, tmpDir);

    expect(result?.format).toBe('json');
    expect(result?.timeout).toBeUndefined();
    expect(result?.verbose).toBeUndefined();
  });

  it('handles an empty object config file', () => {
    writeTmp('mcp-verify.json', '{}');

    const result = loadConfigFile(undefined, tmpDir);

    expect(result).toEqual({});
  });
});
