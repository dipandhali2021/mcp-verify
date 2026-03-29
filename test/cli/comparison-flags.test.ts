/**
 * Tests for CLI comparison & baseline flag recognition (S-4-02, FR-072, FR-073).
 *
 * Strategy: use buildProgram() with action override (same pattern as
 * cli-flags.test.ts) to verify flags are parsed and recognized correctly
 * without running the actual verification pipeline.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildProgram, ExitCode } from '../../src/cli.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse verify-command argv and return the captured options without running
 * verification — identical to the helper in cli-flags.test.ts.
 */
async function parseVerifyArgs(args: string[]): Promise<{
  target: string;
  options: Record<string, unknown>;
}> {
  let capturedTarget = '';
  let capturedOptions: Record<string, unknown> = {};

  const program = buildProgram();
  const verifyCmd = program.commands.find((c) => c.name() === 'verify');
  if (!verifyCmd) {
    throw new Error('verify command not found');
  }

  verifyCmd.action((target: string, options: Record<string, unknown>) => {
    capturedTarget = target;
    capturedOptions = options;
  });

  const fullArgv = ['node', 'mcp-verify', ...args];
  await program.parseAsync(fullArgv);

  return { target: capturedTarget, options: capturedOptions };
}

function spyOnProcessExit(): ReturnType<typeof vi.spyOn> {
  return vi
    .spyOn(process, 'exit')
    .mockImplementation((_code?: number | string | null | undefined) => {
      throw new Error(`process.exit(${String(_code ?? '')})`);
    });
}

function spyOnStdout(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
}

function spyOnStderr(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// --compare-last flag on verify command
// ---------------------------------------------------------------------------

describe('CLI flag — --compare-last', () => {
  it('action receives compareLast=true when --compare-last is passed', async () => {
    const { options } = await parseVerifyArgs([
      'verify',
      'https://example.com/mcp',
      '--compare-last',
    ]);
    expect(options['compareLast']).toBe(true);
  });

  it('action does not receive compareLast when flag is absent', async () => {
    const { options } = await parseVerifyArgs([
      'verify',
      'https://example.com/mcp',
    ]);
    expect(options['compareLast']).toBeUndefined();
  });

  it('--compare-last flag exists on the verify command', () => {
    const program = buildProgram();
    const verifyCmd = program.commands.find((c) => c.name() === 'verify');
    expect(verifyCmd).toBeDefined();

    const flag = verifyCmd!.options.find((o) => o.long === '--compare-last');
    expect(flag).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// --compare-previous flag on verify command
// ---------------------------------------------------------------------------

describe('CLI flag — --compare-previous', () => {
  it('action receives comparePrevious=true when --compare-previous is passed', async () => {
    const { options } = await parseVerifyArgs([
      'verify',
      'https://example.com/mcp',
      '--compare-previous',
    ]);
    expect(options['comparePrevious']).toBe(true);
  });

  it('action does not receive comparePrevious when flag is absent', async () => {
    const { options } = await parseVerifyArgs([
      'verify',
      'https://example.com/mcp',
    ]);
    expect(options['comparePrevious']).toBeUndefined();
  });

  it('--compare-previous flag exists on the verify command', () => {
    const program = buildProgram();
    const verifyCmd = program.commands.find((c) => c.name() === 'verify');
    expect(verifyCmd).toBeDefined();

    const flag = verifyCmd!.options.find((o) => o.long === '--compare-previous');
    expect(flag).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// both comparison flags can coexist with other flags
// ---------------------------------------------------------------------------

describe('CLI flag — comparison flags alongside other flags', () => {
  it('--compare-last works alongside --format json', async () => {
    const { options } = await parseVerifyArgs([
      'verify',
      'https://example.com/mcp',
      '--compare-last',
      '--format',
      'json',
    ]);
    expect(options['compareLast']).toBe(true);
    expect(options['format']).toBe('json');
  });

  it('--compare-previous works alongside --no-history', async () => {
    const { options } = await parseVerifyArgs([
      'verify',
      'https://example.com/mcp',
      '--compare-previous',
      '--no-history',
    ]);
    expect(options['comparePrevious']).toBe(true);
    expect(options['history']).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// baseline subcommand
// ---------------------------------------------------------------------------

describe('baseline subcommand — recognition', () => {
  it('baseline command is registered on the program', () => {
    const program = buildProgram();
    const baselineCmd = program.commands.find((c) => c.name() === 'baseline');
    expect(baselineCmd).toBeDefined();
  });

  it('baseline command accepts a <target> argument', () => {
    const program = buildProgram();
    const baselineCmd = program.commands.find((c) => c.name() === 'baseline');
    expect(baselineCmd).toBeDefined();

    // The command definition should mention target in its usage string
    const usage = baselineCmd!.usage();
    expect(usage).toMatch(/target/i);
  });

  it('--existing flag is registered on the baseline command', () => {
    const program = buildProgram();
    const baselineCmd = program.commands.find((c) => c.name() === 'baseline');
    expect(baselineCmd).toBeDefined();

    const existingFlag = baselineCmd!.options.find((o) => o.long === '--existing');
    expect(existingFlag).toBeDefined();
  });

  it('baseline command has --existing flag that captures correctly', async () => {
    let capturedTarget = '';
    let capturedOptions: Record<string, unknown> = {};

    const program = buildProgram();
    const baselineCmd = program.commands.find((c) => c.name() === 'baseline');
    expect(baselineCmd).toBeDefined();

    baselineCmd!.action((target: string, options: Record<string, unknown>) => {
      capturedTarget = target;
      capturedOptions = options;
    });

    await program.parseAsync([
      'node',
      'mcp-verify',
      'baseline',
      '--existing',
      'https://example.com/mcp',
    ]);

    expect(capturedTarget).toBe('https://example.com/mcp');
    expect(capturedOptions['existing']).toBe(true);
  });

  it('baseline command without --existing captures target and no existing flag', async () => {
    let capturedTarget = '';
    let capturedOptions: Record<string, unknown> = {};

    const program = buildProgram();
    const baselineCmd = program.commands.find((c) => c.name() === 'baseline');
    expect(baselineCmd).toBeDefined();

    baselineCmd!.action((target: string, options: Record<string, unknown>) => {
      capturedTarget = target;
      capturedOptions = options;
    });

    await program.parseAsync([
      'node',
      'mcp-verify',
      'baseline',
      'https://example.com/mcp',
    ]);

    expect(capturedTarget).toBe('https://example.com/mcp');
    expect(capturedOptions['existing']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// history export subcommand
// ---------------------------------------------------------------------------

describe('history export subcommand — recognition', () => {
  it('history command is registered on the program', () => {
    const program = buildProgram();
    const historyCmd = program.commands.find((c) => c.name() === 'history');
    expect(historyCmd).toBeDefined();
  });

  it('history command has an export subcommand', () => {
    const program = buildProgram();
    const historyCmd = program.commands.find((c) => c.name() === 'history');
    expect(historyCmd).toBeDefined();

    const exportCmd = historyCmd!.commands.find((c) => c.name() === 'export');
    expect(exportCmd).toBeDefined();
  });

  it('history export has --all flag', () => {
    const program = buildProgram();
    const historyCmd = program.commands.find((c) => c.name() === 'history');
    const exportCmd = historyCmd!.commands.find((c) => c.name() === 'export');
    expect(exportCmd).toBeDefined();

    const allFlag = exportCmd!.options.find((o) => o.long === '--all');
    expect(allFlag).toBeDefined();
  });

  it('history export has --output flag', () => {
    const program = buildProgram();
    const historyCmd = program.commands.find((c) => c.name() === 'history');
    const exportCmd = historyCmd!.commands.find((c) => c.name() === 'export');
    expect(exportCmd).toBeDefined();

    const outputFlag = exportCmd!.options.find((o) => o.long === '--output');
    expect(outputFlag).toBeDefined();
  });

  it('history export captures --all and --output flags', async () => {
    let capturedTarget: string | undefined;
    let capturedOptions: Record<string, unknown> = {};

    const program = buildProgram();
    const historyCmd = program.commands.find((c) => c.name() === 'history');
    const exportCmd = historyCmd!.commands.find((c) => c.name() === 'export');
    expect(exportCmd).toBeDefined();

    exportCmd!.action((target: string | undefined, options: Record<string, unknown>) => {
      capturedTarget = target;
      capturedOptions = options;
    });

    await program.parseAsync([
      'node',
      'mcp-verify',
      'history',
      'export',
      '--all',
      '--output',
      'all-history.json',
    ]);

    expect(capturedTarget).toBeUndefined();
    expect(capturedOptions['all']).toBe(true);
    expect(capturedOptions['output']).toBe('all-history.json');
  });

  it('history export captures target and --output flag', async () => {
    let capturedTarget: string | undefined;
    let capturedOptions: Record<string, unknown> = {};

    const program = buildProgram();
    const historyCmd = program.commands.find((c) => c.name() === 'history');
    const exportCmd = historyCmd!.commands.find((c) => c.name() === 'export');
    expect(exportCmd).toBeDefined();

    exportCmd!.action((target: string | undefined, options: Record<string, unknown>) => {
      capturedTarget = target;
      capturedOptions = options;
    });

    await program.parseAsync([
      'node',
      'mcp-verify',
      'history',
      'export',
      'https://example.com/mcp',
      '--output',
      'history.json',
    ]);

    expect(capturedTarget).toBe('https://example.com/mcp');
    expect(capturedOptions['output']).toBe('history.json');
  });

  it('history export without target and without --all exits with error', async () => {
    const exitSpy = spyOnProcessExit();
    spyOnStderr();
    spyOnStdout();

    const program = buildProgram();
    applyExitOverrideForTest(program);

    await expect(
      program.parseAsync([
        'node',
        'mcp-verify',
        'history',
        'export',
      ]),
    ).rejects.toThrow(`process.exit(${ExitCode.ERROR})`);

    expect(exitSpy).toHaveBeenCalledWith(ExitCode.ERROR);
  });
});

// ---------------------------------------------------------------------------
// Helper — re-apply exitOverride so process.exit throws in tests
// ---------------------------------------------------------------------------

function applyExitOverrideForTest(program: ReturnType<typeof buildProgram>): void {
  // The history export action calls process.exit directly — spyOnProcessExit
  // has already replaced process.exit to throw, so no extra setup needed.
  // This function documents the test pattern explicitly.
  void program; // no-op
}
