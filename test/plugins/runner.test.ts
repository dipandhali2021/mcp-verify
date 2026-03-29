/**
 * Tests for src/plugins/runner.ts (S-4-03, FR-078)
 *
 * Covers:
 *   - Successful plugin execution and findings collection
 *   - Timeout handling (30-second limit)
 *   - Isolation of exceptions in check() — synchronous throws
 *   - Isolation of rejected promises
 *   - Multiple plugins — partial failures do not prevent success results
 *   - Empty plugins array returns empty array immediately
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runPlugins } from '../../src/plugins/runner.js';
import type { PluginDefinition, PluginContext, PluginFinding } from '../../src/plugins/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(overrides: Partial<PluginContext> = {}): PluginContext {
  return {
    target: 'https://example.com/mcp',
    transport: 'http',
    initializeResponse: { protocolVersion: '2024-11-05', capabilities: {} },
    toolsList: [],
    resourcesList: [],
    promptsList: [],
    errorProbeResponses: [],
    config: {},
    ...overrides,
  };
}

function makeFinding(overrides: Partial<PluginFinding> = {}): PluginFinding {
  return {
    checkId: 'test-plugin',
    severity: 'medium',
    cvssScore: 5.0,
    component: 'https://example.com/mcp',
    title: 'Test Finding',
    description: 'A test finding.',
    remediation: 'Fix it.',
    confidence: 'heuristic',
    ...overrides,
  };
}

function makePlugin(
  id: string,
  checkFn: (ctx: PluginContext) => Promise<PluginFinding[]>,
): PluginDefinition {
  return {
    id,
    name: `Plugin ${id}`,
    description: `Test plugin ${id}`,
    version: '1.0.0',
    check: checkFn,
  };
}

function spyOnStderr(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Basic execution
// ---------------------------------------------------------------------------

describe('runPlugins — basic execution', () => {
  it('returns an empty array when no plugins are provided', async () => {
    vi.useRealTimers();
    const findings = await runPlugins([], makeContext());
    expect(findings).toEqual([]);
  });

  it('returns findings from a single successful plugin', async () => {
    vi.useRealTimers();
    const expected = makeFinding();
    const plugin = makePlugin('p1', async () => [expected]);
    const findings = await runPlugins([plugin], makeContext());
    expect(findings).toHaveLength(1);
    expect(findings[0]).toEqual(expected);
  });

  it('merges findings from multiple successful plugins', async () => {
    vi.useRealTimers();
    const f1 = makeFinding({ checkId: 'p1', title: 'Finding 1' });
    const f2 = makeFinding({ checkId: 'p2', title: 'Finding 2' });
    const p1 = makePlugin('p1', async () => [f1]);
    const p2 = makePlugin('p2', async () => [f2]);
    const findings = await runPlugins([p1, p2], makeContext());
    expect(findings).toHaveLength(2);
    expect(findings).toContainEqual(f1);
    expect(findings).toContainEqual(f2);
  });

  it('returns an empty array when all plugins return no findings', async () => {
    vi.useRealTimers();
    const p1 = makePlugin('p1', async () => []);
    const p2 = makePlugin('p2', async () => []);
    const findings = await runPlugins([p1, p2], makeContext());
    expect(findings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Error isolation — synchronous throw
// ---------------------------------------------------------------------------

describe('runPlugins — synchronous throw isolation', () => {
  it('skips a plugin that throws synchronously and continues with others', async () => {
    vi.useRealTimers();
    const stderrSpy = spyOnStderr();

    const badPlugin = makePlugin('bad', (_ctx) => {
      throw new Error('sync boom');
      // unreachable but satisfies return type at runtime
    });
    const goodFinding = makeFinding({ checkId: 'good' });
    const goodPlugin = makePlugin('good', async () => [goodFinding]);

    const findings = await runPlugins([badPlugin, goodPlugin], makeContext());

    // Only good plugin's findings returned
    expect(findings).toHaveLength(1);
    expect(findings[0]).toEqual(goodFinding);

    // Warning emitted to stderr
    const stderrCalls = stderrSpy.mock.calls.map((args) => String(args[0]));
    expect(stderrCalls.some((msg) => msg.includes('bad') && msg.includes('threw synchronously'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Error isolation — rejected promise
// ---------------------------------------------------------------------------

describe('runPlugins — rejected promise isolation', () => {
  it('skips a plugin whose check() returns a rejected promise', async () => {
    vi.useRealTimers();
    const stderrSpy = spyOnStderr();

    const rejectPlugin = makePlugin('reject-plugin', async () => {
      throw new Error('async boom');
    });
    const goodFinding = makeFinding({ checkId: 'good2' });
    const goodPlugin = makePlugin('good2', async () => [goodFinding]);

    const findings = await runPlugins([rejectPlugin, goodPlugin], makeContext());

    expect(findings).toHaveLength(1);
    expect(findings[0]).toEqual(goodFinding);

    const stderrCalls = stderrSpy.mock.calls.map((args) => String(args[0]));
    expect(stderrCalls.some((msg) => msg.includes('reject-plugin') && msg.includes('rejected'))).toBe(true);
  });

  it('includes the error message in the warning output', async () => {
    vi.useRealTimers();
    const stderrSpy = spyOnStderr();

    const plugin = makePlugin('err-msg-plugin', async () => {
      throw new Error('specific error text 12345');
    });

    await runPlugins([plugin], makeContext());

    const allOutput = stderrSpy.mock.calls.map((args) => String(args[0])).join('');
    expect(allOutput).toContain('specific error text 12345');
  });
});

// ---------------------------------------------------------------------------
// Timeout handling
// ---------------------------------------------------------------------------

describe('runPlugins — timeout handling', () => {
  it('times out a plugin that never resolves after 30 seconds', async () => {
    const stderrSpy = spyOnStderr();

    const hangingPlugin = makePlugin('hanging', (_ctx) => {
      return new Promise<PluginFinding[]>(() => {
        // Never resolves
      });
    });

    const runPromise = runPlugins([hangingPlugin], makeContext());

    // Advance fake timers past the 30-second timeout
    await vi.advanceTimersByTimeAsync(30_001);

    const findings = await runPromise;
    expect(findings).toEqual([]);

    const stderrCalls = stderrSpy.mock.calls.map((args) => String(args[0]));
    expect(stderrCalls.some((msg) => msg.includes('hanging') && msg.includes('timed out'))).toBe(true);
  });

  it('does not time out a plugin that resolves before 30 seconds', async () => {
    const stderrSpy = spyOnStderr();

    const fastPlugin = makePlugin('fast', async (_ctx) => {
      return [makeFinding({ checkId: 'fast' })];
    });

    const runPromise = runPlugins([fastPlugin], makeContext());

    // Advance only a little — plugin already resolved via microtask
    await vi.advanceTimersByTimeAsync(100);

    const findings = await runPromise;
    expect(findings).toHaveLength(1);

    // No timeout warning
    const stderrCalls = stderrSpy.mock.calls.map((args) => String(args[0]));
    expect(stderrCalls.every((msg) => !msg.includes('timed out'))).toBe(true);
  });

  it('collects findings from successful plugins when another times out', async () => {
    const stderrSpy = spyOnStderr();

    const hangingPlugin = makePlugin('hang2', () => new Promise<PluginFinding[]>(() => {}));
    const goodFinding = makeFinding({ checkId: 'good3' });
    const goodPlugin = makePlugin('good3', async () => [goodFinding]);

    const runPromise = runPlugins([hangingPlugin, goodPlugin], makeContext());

    await vi.advanceTimersByTimeAsync(30_001);

    const findings = await runPromise;
    expect(findings).toHaveLength(1);
    expect(findings[0]).toEqual(goodFinding);

    const stderrCalls = stderrSpy.mock.calls.map((args) => String(args[0]));
    expect(stderrCalls.some((msg) => msg.includes('hang2') && msg.includes('timed out'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Context passed correctly
// ---------------------------------------------------------------------------

describe('runPlugins — context passing', () => {
  it('passes the full PluginContext to each plugin', async () => {
    vi.useRealTimers();
    const receivedContexts: PluginContext[] = [];
    const plugin = makePlugin('ctx-check', async (ctx) => {
      receivedContexts.push(ctx);
      return [];
    });
    const ctx = makeContext({
      target: 'stdio://my-server',
      transport: 'stdio',
      toolsList: [{ name: 'tool1' }],
    });
    await runPlugins([plugin], ctx);
    expect(receivedContexts).toHaveLength(1);
    expect(receivedContexts[0]).toEqual(ctx);
  });
});

// ---------------------------------------------------------------------------
// Multiple findings per plugin
// ---------------------------------------------------------------------------

describe('runPlugins — multiple findings per plugin', () => {
  it('returns all findings from a plugin that emits multiple', async () => {
    vi.useRealTimers();
    const f1 = makeFinding({ title: 'Finding A' });
    const f2 = makeFinding({ title: 'Finding B' });
    const f3 = makeFinding({ title: 'Finding C' });
    const plugin = makePlugin('multi', async () => [f1, f2, f3]);
    const findings = await runPlugins([plugin], makeContext());
    expect(findings).toHaveLength(3);
  });
});
