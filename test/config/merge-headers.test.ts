/**
 * Tests for headers merging in mergeConfig.
 */

import { describe, it, expect } from 'vitest';
import { mergeConfig } from '../../src/config/merge.js';
import type { ConfigFile } from '../../src/config/loader.js';

const TARGET = 'https://example.com/mcp';

describe('mergeConfig — headers', () => {
  it('returns empty headers when neither CLI nor file provides headers', () => {
    const result = mergeConfig({}, null, TARGET);
    expect(result.headers).toEqual({});
  });

  it('uses file headers when no CLI headers are provided', () => {
    const file: ConfigFile = { headers: { Authorization: 'Bearer file-token' } };
    const result = mergeConfig({}, file, TARGET);
    expect(result.headers).toEqual({ Authorization: 'Bearer file-token' });
  });

  it('uses CLI headers when no file headers are provided', () => {
    const result = mergeConfig({ headers: { Authorization: 'Bearer cli-token' } }, null, TARGET);
    expect(result.headers).toEqual({ Authorization: 'Bearer cli-token' });
  });

  it('merges file and CLI headers with different keys', () => {
    const file: ConfigFile = { headers: { 'X-File-Only': 'from-file' } };
    const result = mergeConfig({ headers: { 'X-CLI-Only': 'from-cli' } }, file, TARGET);
    expect(result.headers).toEqual({
      'X-File-Only': 'from-file',
      'X-CLI-Only': 'from-cli',
    });
  });

  it('CLI headers override file headers for the same key', () => {
    const file: ConfigFile = { headers: { Authorization: 'Bearer file-token' } };
    const result = mergeConfig({ headers: { Authorization: 'Bearer cli-token' } }, file, TARGET);
    expect(result.headers).toEqual({ Authorization: 'Bearer cli-token' });
  });

  it('preserves file-only headers when CLI overrides a different key', () => {
    const file: ConfigFile = {
      headers: {
        Authorization: 'Bearer file-token',
        'X-File-Only': 'keep-me',
      },
    };
    const result = mergeConfig({ headers: { Authorization: 'Bearer cli-token' } }, file, TARGET);
    expect(result.headers).toEqual({
      Authorization: 'Bearer cli-token',
      'X-File-Only': 'keep-me',
    });
  });

  it('returns empty headers when file has empty headers and CLI has none', () => {
    const file: ConfigFile = { headers: {} };
    const result = mergeConfig({}, file, TARGET);
    expect(result.headers).toEqual({});
  });
});
