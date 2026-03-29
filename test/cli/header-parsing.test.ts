/**
 * Tests for --header / -H CLI option and parseHeader accumulator function.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InvalidArgumentError } from 'commander';
import { parseHeader, buildProgram } from '../../src/cli.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function parseArgs(args: string[]): Promise<{
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

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// parseHeader unit tests
// ---------------------------------------------------------------------------

describe('parseHeader', () => {
  it('parses a standard header', () => {
    const result = parseHeader('Authorization: Bearer token123', {});
    expect(result).toEqual({ Authorization: 'Bearer token123' });
  });

  it('splits on first colon only — values may contain colons', () => {
    const result = parseHeader('X-Custom: value:with:colons', {});
    expect(result).toEqual({ 'X-Custom': 'value:with:colons' });
  });

  it('allows empty header value', () => {
    const result = parseHeader('X-Key: ', {});
    expect(result).toEqual({ 'X-Key': '' });
  });

  it('trims whitespace from name and value', () => {
    const result = parseHeader('  X-Trimmed  :  some value  ', {});
    expect(result).toEqual({ 'X-Trimmed': 'some value' });
  });

  it('throws on missing colon', () => {
    expect(() => parseHeader('nocolon', {})).toThrow(InvalidArgumentError);
    expect(() => parseHeader('nocolon', {})).toThrow('Name: Value');
  });

  it('throws on empty name', () => {
    expect(() => parseHeader(': no-name', {})).toThrow(InvalidArgumentError);
    expect(() => parseHeader(': no-name', {})).toThrow('must not be empty');
  });

  it('accumulates multiple headers', () => {
    const step1 = parseHeader('A: 1', {});
    const step2 = parseHeader('B: 2', step1);
    expect(step2).toEqual({ A: '1', B: '2' });
  });

  it('later header with same name overwrites earlier', () => {
    const step1 = parseHeader('Authorization: Bearer old', {});
    const step2 = parseHeader('Authorization: Bearer new', step1);
    expect(step2).toEqual({ Authorization: 'Bearer new' });
  });
});

// ---------------------------------------------------------------------------
// CLI integration tests
// ---------------------------------------------------------------------------

describe('--header CLI integration', () => {
  it('parses a single -H flag', async () => {
    const { options } = await parseArgs([
      'verify', 'https://example.com/mcp',
      '-H', 'Authorization: Bearer tok',
    ]);
    expect(options['header']).toEqual({ Authorization: 'Bearer tok' });
  });

  it('parses multiple -H flags', async () => {
    const { options } = await parseArgs([
      'verify', 'https://example.com/mcp',
      '-H', 'Authorization: Bearer tok',
      '-H', 'X-Custom: foo',
    ]);
    expect(options['header']).toEqual({
      Authorization: 'Bearer tok',
      'X-Custom': 'foo',
    });
  });

  it('defaults to empty object when no -H flag is provided', async () => {
    const { options } = await parseArgs([
      'verify', 'https://example.com/mcp',
    ]);
    expect(options['header']).toEqual({});
  });

  it('long-form --header works the same as -H', async () => {
    const { options } = await parseArgs([
      'verify', 'https://example.com/mcp',
      '--header', 'Authorization: Bearer tok',
    ]);
    expect(options['header']).toEqual({ Authorization: 'Bearer tok' });
  });
});
