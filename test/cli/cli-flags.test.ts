/**
 * Tests for CLI flag parsing (S-3-02)
 *
 * Strategy
 * --------
 * Commander exits on parse errors, so we test the exported parser/validator
 * functions directly. For integration-level flag tests (--strict, --lenient,
 * --verbose, etc.) we parse a minimal argv via buildProgram() with mocked
 * action execution, capturing the options object passed to the action handler.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InvalidArgumentError } from 'commander';
import {
  parseTimeout,
  parseFormat,
  parseTransport,
  parseFailOnSeverity,
  parseConformanceThreshold,
  buildProgram,
  ExitCode,
} from '../../src/cli.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a minimal argv array using buildProgram() and return the options
 * object captured by the action handler, without actually running verification.
 *
 * We mock process.exit so Commander's exitOverride does not terminate the
 * process during tests, and we intercept the action by replacing the
 * runVerification call path at the program level.
 */
async function parseArgs(args: string[]): Promise<{
  target: string;
  options: Record<string, unknown>;
}> {
  let capturedTarget = '';
  let capturedOptions: Record<string, unknown> = {};

  const program = buildProgram();

  // Find the verify command and override its action
  const verifyCmd = program.commands.find((c) => c.name() === 'verify');
  if (!verifyCmd) {
    throw new Error('verify command not found');
  }

  // Replace the action to capture options without running verification
  verifyCmd.action((target: string, options: Record<string, unknown>) => {
    capturedTarget = target;
    capturedOptions = options;
  });

  const fullArgv = ['node', 'mcp-verify', ...args];
  await program.parseAsync(fullArgv);

  return { target: capturedTarget, options: capturedOptions };
}

// ---------------------------------------------------------------------------
// process.exit spy helpers
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

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// parseTimeout
// ---------------------------------------------------------------------------

describe('parseTimeout', () => {
  it('returns the parsed integer for a valid positive integer string', () => {
    expect(parseTimeout('5000')).toBe(5000);
  });

  it('returns 1 for the minimum valid value', () => {
    expect(parseTimeout('1')).toBe(1);
  });

  it('throws InvalidArgumentError for zero', () => {
    expect(() => parseTimeout('0')).toThrow(InvalidArgumentError);
  });

  it('throws InvalidArgumentError for a negative number', () => {
    expect(() => parseTimeout('-1')).toThrow(InvalidArgumentError);
  });

  it('throws InvalidArgumentError for a float', () => {
    expect(() => parseTimeout('1.5')).toThrow(InvalidArgumentError);
  });

  it('throws InvalidArgumentError for a non-numeric string', () => {
    expect(() => parseTimeout('abc')).toThrow(InvalidArgumentError);
  });

  it('error message contains the invalid value', () => {
    expect(() => parseTimeout('bad')).toThrow(/got: bad/);
  });
});

// ---------------------------------------------------------------------------
// parseFormat
// ---------------------------------------------------------------------------

describe('parseFormat', () => {
  it('accepts "terminal"', () => {
    expect(parseFormat('terminal')).toBe('terminal');
  });

  it('accepts "json"', () => {
    expect(parseFormat('json')).toBe('json');
  });

  it('accepts "markdown"', () => {
    expect(parseFormat('markdown')).toBe('markdown');
  });

  it('accepts "sarif"', () => {
    expect(parseFormat('sarif')).toBe('sarif');
  });

  it('throws InvalidArgumentError for an unknown format', () => {
    expect(() => parseFormat('xml')).toThrow(InvalidArgumentError);
  });

  it('error message lists allowed values', () => {
    expect(() => parseFormat('html')).toThrow(/terminal.*json.*markdown.*sarif/);
  });

  it('error message contains the invalid value', () => {
    expect(() => parseFormat('csv')).toThrow(/got: csv/);
  });
});

// ---------------------------------------------------------------------------
// parseTransport
// ---------------------------------------------------------------------------

describe('parseTransport', () => {
  it('accepts "http"', () => {
    expect(parseTransport('http')).toBe('http');
  });

  it('accepts "stdio"', () => {
    expect(parseTransport('stdio')).toBe('stdio');
  });

  it('throws InvalidArgumentError for an unknown transport', () => {
    expect(() => parseTransport('websocket')).toThrow(InvalidArgumentError);
  });

  it('error message lists allowed values', () => {
    expect(() => parseTransport('grpc')).toThrow(/http.*stdio/);
  });

  it('error message contains the invalid value', () => {
    expect(() => parseTransport('grpc')).toThrow(/got: grpc/);
  });
});

// ---------------------------------------------------------------------------
// parseFailOnSeverity
// ---------------------------------------------------------------------------

describe('parseFailOnSeverity', () => {
  it('accepts "critical"', () => {
    expect(parseFailOnSeverity('critical')).toBe('critical');
  });

  it('accepts "high"', () => {
    expect(parseFailOnSeverity('high')).toBe('high');
  });

  it('accepts "medium"', () => {
    expect(parseFailOnSeverity('medium')).toBe('medium');
  });

  it('accepts "low"', () => {
    expect(parseFailOnSeverity('low')).toBe('low');
  });

  it('accepts "none"', () => {
    expect(parseFailOnSeverity('none')).toBe('none');
  });

  it('throws InvalidArgumentError for an unknown level', () => {
    expect(() => parseFailOnSeverity('info')).toThrow(InvalidArgumentError);
  });

  it('error message lists allowed values', () => {
    expect(() => parseFailOnSeverity('unknown')).toThrow(
      /critical.*high.*medium.*low.*none/,
    );
  });

  it('error message contains the invalid value', () => {
    expect(() => parseFailOnSeverity('fatal')).toThrow(/got: fatal/);
  });
});

// ---------------------------------------------------------------------------
// parseConformanceThreshold
// ---------------------------------------------------------------------------

describe('parseConformanceThreshold', () => {
  it('accepts 0 (minimum boundary)', () => {
    expect(parseConformanceThreshold('0')).toBe(0);
  });

  it('accepts 100 (maximum boundary)', () => {
    expect(parseConformanceThreshold('100')).toBe(100);
  });

  it('accepts a mid-range value', () => {
    expect(parseConformanceThreshold('75')).toBe(75);
  });

  it('throws InvalidArgumentError for -1', () => {
    expect(() => parseConformanceThreshold('-1')).toThrow(InvalidArgumentError);
  });

  it('throws InvalidArgumentError for 101', () => {
    expect(() => parseConformanceThreshold('101')).toThrow(InvalidArgumentError);
  });

  it('throws InvalidArgumentError for a float', () => {
    expect(() => parseConformanceThreshold('50.5')).toThrow(InvalidArgumentError);
  });

  it('throws InvalidArgumentError for a non-numeric string', () => {
    expect(() => parseConformanceThreshold('abc')).toThrow(InvalidArgumentError);
  });

  it('error message contains 0-100 range description', () => {
    expect(() => parseConformanceThreshold('200')).toThrow(/0.*100/);
  });

  it('error message contains the invalid value', () => {
    expect(() => parseConformanceThreshold('999')).toThrow(/got: 999/);
  });
});

// ---------------------------------------------------------------------------
// Flag integration tests via buildProgram()
// ---------------------------------------------------------------------------

describe('CLI flag integration — --strict', () => {
  it('action receives strict=true when --strict is passed', async () => {
    const { options } = await parseArgs(['verify', 'https://example.com/mcp', '--strict']);
    expect(options['strict']).toBe(true);
  });

  it('action does not receive strict when --strict is not passed', async () => {
    const { options } = await parseArgs(['verify', 'https://example.com/mcp']);
    expect(options['strict']).toBeUndefined();
  });
});

describe('CLI flag integration — --lenient', () => {
  it('action receives lenient=true when --lenient is passed', async () => {
    const { options } = await parseArgs(['verify', 'https://example.com/mcp', '--lenient']);
    expect(options['lenient']).toBe(true);
  });

  it('action does not receive lenient when --lenient is not passed', async () => {
    const { options } = await parseArgs(['verify', 'https://example.com/mcp']);
    expect(options['lenient']).toBeUndefined();
  });
});

describe('CLI flag integration — --strict and --lenient mutual exclusion', () => {
  it('exits with code 2 and writes to stderr when both --strict and --lenient are provided', async () => {
    const exitSpy = spyOnProcessExit();
    const stderrSpy = spyOnStderr();

    // We need to override the action to actually trigger the mutual exclusion check.
    // Re-build a real program (not using parseArgs helper which overrides the action).
    const program = buildProgram();
    const fullArgv = [
      'node',
      'mcp-verify',
      'verify',
      'https://example.com/mcp',
      '--strict',
      '--lenient',
    ];

    await expect(program.parseAsync(fullArgv)).rejects.toThrow(
      `process.exit(${ExitCode.ERROR})`,
    );

    expect(exitSpy).toHaveBeenCalledWith(ExitCode.ERROR);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('--strict and --lenient are mutually exclusive'),
    );
  });
});

describe('CLI flag integration — --verbose', () => {
  it('action receives verbose=true when --verbose is passed', async () => {
    const { options } = await parseArgs(['verify', 'https://example.com/mcp', '--verbose']);
    expect(options['verbose']).toBe(true);
  });

  it('action does not receive verbose when --verbose is not passed', async () => {
    const { options } = await parseArgs(['verify', 'https://example.com/mcp']);
    expect(options['verbose']).toBeUndefined();
  });
});

describe('CLI flag integration — --output', () => {
  it('action receives output path when --output is passed', async () => {
    const { options } = await parseArgs([
      'verify',
      'https://example.com/mcp',
      '--output',
      '/tmp/report.json',
    ]);
    expect(options['output']).toBe('/tmp/report.json');
  });

  it('action does not receive output when --output is not passed', async () => {
    const { options } = await parseArgs(['verify', 'https://example.com/mcp']);
    expect(options['output']).toBeUndefined();
  });
});

describe('CLI flag integration — --transport', () => {
  it('action receives transport="http" when --transport http is passed', async () => {
    const { options } = await parseArgs([
      'verify',
      'https://example.com/mcp',
      '--transport',
      'http',
    ]);
    expect(options['transport']).toBe('http');
  });

  it('action receives transport="stdio" when --transport stdio is passed', async () => {
    const { options } = await parseArgs([
      'verify',
      'https://example.com/mcp',
      '--transport',
      'stdio',
    ]);
    expect(options['transport']).toBe('stdio');
  });

  it('exits with code 2 for an invalid transport value', async () => {
    const exitSpy = spyOnProcessExit();
    spyOnStderr();

    const program = buildProgram();
    const fullArgv = [
      'node',
      'mcp-verify',
      'verify',
      'https://example.com/mcp',
      '--transport',
      'websocket',
    ];

    await expect(program.parseAsync(fullArgv)).rejects.toThrow(
      `process.exit(${ExitCode.ERROR})`,
    );
    expect(exitSpy).toHaveBeenCalledWith(ExitCode.ERROR);
  });
});

describe('CLI flag integration — --fail-on-severity', () => {
  it('action receives failOnSeverity="high" when --fail-on-severity high is passed', async () => {
    const { options } = await parseArgs([
      'verify',
      'https://example.com/mcp',
      '--fail-on-severity',
      'high',
    ]);
    expect(options['failOnSeverity']).toBe('high');
  });

  it('uses default "critical" when --fail-on-severity is not passed', async () => {
    const { options } = await parseArgs(['verify', 'https://example.com/mcp']);
    expect(options['failOnSeverity']).toBe('critical');
  });

  it('exits with code 2 for an invalid severity value', async () => {
    const exitSpy = spyOnProcessExit();
    spyOnStderr();

    const program = buildProgram();
    const fullArgv = [
      'node',
      'mcp-verify',
      'verify',
      'https://example.com/mcp',
      '--fail-on-severity',
      'fatal',
    ];

    await expect(program.parseAsync(fullArgv)).rejects.toThrow(
      `process.exit(${ExitCode.ERROR})`,
    );
    expect(exitSpy).toHaveBeenCalledWith(ExitCode.ERROR);
  });
});

describe('CLI flag integration — --conformance-threshold', () => {
  it('action receives conformanceThreshold=80 when --conformance-threshold 80 is passed', async () => {
    const { options } = await parseArgs([
      'verify',
      'https://example.com/mcp',
      '--conformance-threshold',
      '80',
    ]);
    expect(options['conformanceThreshold']).toBe(80);
  });

  it('uses default 0 when --conformance-threshold is not passed', async () => {
    const { options } = await parseArgs(['verify', 'https://example.com/mcp']);
    expect(options['conformanceThreshold']).toBe(0);
  });

  it('accepts 0 as a valid threshold', async () => {
    const { options } = await parseArgs([
      'verify',
      'https://example.com/mcp',
      '--conformance-threshold',
      '0',
    ]);
    expect(options['conformanceThreshold']).toBe(0);
  });

  it('accepts 100 as a valid threshold', async () => {
    const { options } = await parseArgs([
      'verify',
      'https://example.com/mcp',
      '--conformance-threshold',
      '100',
    ]);
    expect(options['conformanceThreshold']).toBe(100);
  });

  it('exits with code 2 for a value above 100', async () => {
    const exitSpy = spyOnProcessExit();
    spyOnStderr();

    const program = buildProgram();
    const fullArgv = [
      'node',
      'mcp-verify',
      'verify',
      'https://example.com/mcp',
      '--conformance-threshold',
      '101',
    ];

    await expect(program.parseAsync(fullArgv)).rejects.toThrow(
      `process.exit(${ExitCode.ERROR})`,
    );
    expect(exitSpy).toHaveBeenCalledWith(ExitCode.ERROR);
  });

  it('exits with code 2 for a negative value', async () => {
    const exitSpy = spyOnProcessExit();
    spyOnStderr();

    const program = buildProgram();
    const fullArgv = [
      'node',
      'mcp-verify',
      'verify',
      'https://example.com/mcp',
      '--conformance-threshold',
      '-5',
    ];

    await expect(program.parseAsync(fullArgv)).rejects.toThrow(
      `process.exit(${ExitCode.ERROR})`,
    );
    expect(exitSpy).toHaveBeenCalledWith(ExitCode.ERROR);
  });
});

describe('CLI flag integration — --config', () => {
  it('action receives config path when --config is passed', async () => {
    const { options } = await parseArgs([
      'verify',
      'https://example.com/mcp',
      '--config',
      '/path/to/my-config.json',
    ]);
    expect(options['config']).toBe('/path/to/my-config.json');
  });

  it('action does not receive config when --config is not passed', async () => {
    const { options } = await parseArgs(['verify', 'https://example.com/mcp']);
    expect(options['config']).toBeUndefined();
  });
});

describe('CLI flag integration — target capture', () => {
  it('captures the target argument correctly', async () => {
    const { target } = await parseArgs([
      'verify',
      'https://example.com/mcp',
    ]);
    expect(target).toBe('https://example.com/mcp');
  });

  it('captures a stdio target correctly', async () => {
    const { target } = await parseArgs(['verify', './my-server']);
    expect(target).toBe('./my-server');
  });
});

describe('CLI flag integration — --no-color', () => {
  it('action receives color=false when --no-color is passed', async () => {
    const { options } = await parseArgs([
      'verify',
      'https://example.com/mcp',
      '--no-color',
    ]);
    expect(options['color']).toBe(false);
  });

  it('action receives color=true by default', async () => {
    const { options } = await parseArgs(['verify', 'https://example.com/mcp']);
    expect(options['color']).toBe(true);
  });
});

describe('CLI flag integration — --format', () => {
  it('action receives format="json" when --format json is passed', async () => {
    const { options } = await parseArgs([
      'verify',
      'https://example.com/mcp',
      '--format',
      'json',
    ]);
    expect(options['format']).toBe('json');
  });

  it('uses default "terminal" when --format is not passed', async () => {
    const { options } = await parseArgs(['verify', 'https://example.com/mcp']);
    expect(options['format']).toBe('terminal');
  });
});

describe('CLI flag integration — --timeout', () => {
  it('action receives timeout=5000 when --timeout 5000 is passed', async () => {
    const { options } = await parseArgs([
      'verify',
      'https://example.com/mcp',
      '--timeout',
      '5000',
    ]);
    expect(options['timeout']).toBe(5000);
  });

  it('uses default 10000 when --timeout is not passed', async () => {
    const { options } = await parseArgs(['verify', 'https://example.com/mcp']);
    expect(options['timeout']).toBe(10000);
  });
});
