/**
 * Tests for src/config/merge.ts (S-3-01 — merge precedence)
 *
 * Precedence: CLI flags > config file > DEFAULT_CONFIG
 */

import { describe, it, expect } from 'vitest';
import { mergeConfig } from '../../src/config/merge.js';
import { DEFAULT_CONFIG } from '../../src/types/config.js';
import type { VerificationConfig } from '../../src/types/config.js';
import type { ConfigFile } from '../../src/config/loader.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TARGET = 'https://example.com/mcp';

function defaults(): VerificationConfig {
  return { ...DEFAULT_CONFIG, target: TARGET };
}

// ---------------------------------------------------------------------------
// Default fallback
// ---------------------------------------------------------------------------

describe('mergeConfig — defaults', () => {
  it('returns all DEFAULT_CONFIG values when cli and file are empty', () => {
    const result = mergeConfig({}, null, TARGET);
    expect(result).toEqual(defaults());
  });

  it('always sets the target from the parameter', () => {
    const result = mergeConfig({}, null, TARGET);
    expect(result.target).toBe(TARGET);
  });
});

// ---------------------------------------------------------------------------
// Config file overrides defaults
// ---------------------------------------------------------------------------

describe('mergeConfig — config file overrides defaults', () => {
  it('applies timeout from file', () => {
    const file: ConfigFile = { timeout: 30000 };
    expect(mergeConfig({}, file, TARGET).timeout).toBe(30000);
  });

  it('applies format from file', () => {
    const file: ConfigFile = { format: 'json' };
    expect(mergeConfig({}, file, TARGET).format).toBe('json');
  });

  it('applies transport from file', () => {
    const file: ConfigFile = { transport: 'http' };
    expect(mergeConfig({}, file, TARGET).transport).toBe('http');
  });

  it('applies failOnSeverity from file', () => {
    const file: ConfigFile = { failOnSeverity: 'medium' };
    expect(mergeConfig({}, file, TARGET).failOnSeverity).toBe('medium');
  });

  it('applies conformanceThreshold from file', () => {
    const file: ConfigFile = { conformanceThreshold: 75 };
    expect(mergeConfig({}, file, TARGET).conformanceThreshold).toBe(75);
  });

  it('converts skip entries to checkId strings', () => {
    const file: ConfigFile = {
      skip: [
        { checkId: 'cors-wildcard', justification: 'Behind VPN' },
        { checkId: 'auth-gap' },
      ],
    };
    const result = mergeConfig({}, file, TARGET);
    expect(result.skip).toEqual(['cors-wildcard', 'auth-gap']);
  });

  it('applies checkMode from file', () => {
    const file: ConfigFile = { checkMode: 'strict' };
    expect(mergeConfig({}, file, TARGET).checkMode).toBe('strict');
  });

  it('applies verbose from file', () => {
    const file: ConfigFile = { verbose: true };
    expect(mergeConfig({}, file, TARGET).verbose).toBe(true);
  });

  it('applies output from file', () => {
    const file: ConfigFile = { output: '/tmp/report.json' };
    expect(mergeConfig({}, file, TARGET).output).toBe('/tmp/report.json');
  });

  it('applies null transport from file', () => {
    const file: ConfigFile = { transport: null };
    expect(mergeConfig({}, file, TARGET).transport).toBeNull();
  });

  it('applies null output from file', () => {
    const file: ConfigFile = { output: null };
    expect(mergeConfig({}, file, TARGET).output).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// CLI flags override config file
// ---------------------------------------------------------------------------

describe('mergeConfig — CLI flags override config file', () => {
  it('CLI timeout overrides file timeout', () => {
    const file: ConfigFile = { timeout: 30000 };
    expect(mergeConfig({ timeout: 5000 }, file, TARGET).timeout).toBe(5000);
  });

  it('CLI format overrides file format', () => {
    const file: ConfigFile = { format: 'markdown' };
    expect(mergeConfig({ format: 'sarif' }, file, TARGET).format).toBe('sarif');
  });

  it('CLI transport overrides file transport', () => {
    const file: ConfigFile = { transport: 'stdio' };
    expect(mergeConfig({ transport: 'http' }, file, TARGET).transport).toBe('http');
  });

  it('CLI failOnSeverity overrides file failOnSeverity', () => {
    const file: ConfigFile = { failOnSeverity: 'low' };
    expect(
      mergeConfig({ failOnSeverity: 'critical' }, file, TARGET).failOnSeverity,
    ).toBe('critical');
  });

  it('CLI conformanceThreshold overrides file conformanceThreshold', () => {
    const file: ConfigFile = { conformanceThreshold: 90 };
    expect(
      mergeConfig({ conformanceThreshold: 60 }, file, TARGET).conformanceThreshold,
    ).toBe(60);
  });

  it('CLI skip list overrides file skip list entirely', () => {
    const file: ConfigFile = {
      skip: [{ checkId: 'cors-wildcard' }, { checkId: 'auth-gap' }],
    };
    const result = mergeConfig({ skip: ['only-this'] }, file, TARGET);
    expect(result.skip).toEqual(['only-this']);
  });

  it('CLI checkMode overrides file checkMode', () => {
    const file: ConfigFile = { checkMode: 'lenient' };
    expect(mergeConfig({ checkMode: 'strict' }, file, TARGET).checkMode).toBe('strict');
  });

  it('CLI verbose overrides file verbose', () => {
    const file: ConfigFile = { verbose: false };
    expect(mergeConfig({ verbose: true }, file, TARGET).verbose).toBe(true);
  });

  it('CLI output overrides file output', () => {
    const file: ConfigFile = { output: '/tmp/from-file.json' };
    expect(
      mergeConfig({ output: '/tmp/from-cli.json' }, file, TARGET).output,
    ).toBe('/tmp/from-cli.json');
  });

  it('CLI noColor is applied (not present in config file)', () => {
    const file: ConfigFile = { verbose: true };
    expect(mergeConfig({ noColor: true }, file, TARGET).noColor).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CLI flags override defaults (no file)
// ---------------------------------------------------------------------------

describe('mergeConfig — CLI flags override defaults when no file', () => {
  it('CLI timeout overrides default timeout', () => {
    expect(mergeConfig({ timeout: 999 }, null, TARGET).timeout).toBe(999);
  });

  it('CLI checkMode overrides default checkMode', () => {
    expect(mergeConfig({ checkMode: 'lenient' }, null, TARGET).checkMode).toBe(
      'lenient',
    );
  });

  it('empty CLI skip keeps default empty array', () => {
    const result = mergeConfig({}, null, TARGET);
    expect(result.skip).toEqual([]);
  });

  it('CLI skip list replaces default empty array', () => {
    const result = mergeConfig({ skip: ['CORS-001'] }, null, TARGET);
    expect(result.skip).toEqual(['CORS-001']);
  });
});

// ---------------------------------------------------------------------------
// Mixed scenario — all three sources
// ---------------------------------------------------------------------------

describe('mergeConfig — full three-way merge', () => {
  it('CLI wins over file wins over defaults across different fields', () => {
    const file: ConfigFile = {
      timeout: 20000,       // file sets timeout
      format: 'markdown',   // file sets format — CLI will override
      verbose: true,        // file sets verbose
    };
    const cli: Partial<Omit<VerificationConfig, 'target'>> = {
      format: 'sarif',     // CLI overrides file's format
      // timeout not set by CLI — file value should be used
      // verbose not set by CLI — file value should be used
    };

    const result = mergeConfig(cli, file, TARGET);

    expect(result.format).toBe('sarif');          // CLI wins
    expect(result.timeout).toBe(20000);           // file wins
    expect(result.verbose).toBe(true);            // file wins
    expect(result.failOnSeverity).toBe(DEFAULT_CONFIG.failOnSeverity); // default wins
    expect(result.skip).toEqual(DEFAULT_CONFIG.skip);                   // default wins
  });
});

// ---------------------------------------------------------------------------
// Skip merge edge cases
// ---------------------------------------------------------------------------

describe('mergeConfig — skip field edge cases', () => {
  it('empty skip array in file produces empty skip in result', () => {
    const file: ConfigFile = { skip: [] };
    expect(mergeConfig({}, file, TARGET).skip).toEqual([]);
  });

  it('skip entries without justification are still extracted to checkId strings', () => {
    const file: ConfigFile = {
      skip: [{ checkId: 'TOOL-001' }],
    };
    expect(mergeConfig({}, file, TARGET).skip).toEqual(['TOOL-001']);
  });

  it('justification is stripped when flattening to string skip', () => {
    const file: ConfigFile = {
      skip: [
        { checkId: 'cors-wildcard', justification: 'This should be stripped' },
      ],
    };
    const result = mergeConfig({}, file, TARGET);
    // result.skip must be string[], justification is not in the string
    expect(result.skip[0]).toBe('cors-wildcard');
  });
});
