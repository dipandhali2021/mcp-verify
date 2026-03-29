import { describe, it, expect } from 'vitest';
import { detectTransport } from '../../src/transport/detect.js';
import { isNpmPackage } from '../../src/transport/stdio.js';

describe('detectTransport', () => {
  // --- HTTP detection ---
  it('returns "http" for an http:// URL', () => {
    expect(detectTransport('http://localhost:3000')).toBe('http');
  });

  it('returns "http" for an https:// URL', () => {
    expect(detectTransport('https://example.com/mcp')).toBe('http');
  });

  it('returns "http" for an https:// URL with a path and port', () => {
    expect(detectTransport('https://api.example.com:8443/v1/mcp')).toBe('http');
  });

  // --- Explicit stdio:// prefix ---
  it('returns "stdio" for a stdio:// URL', () => {
    expect(detectTransport('stdio:///path/to/server')).toBe('stdio');
  });

  it('returns "stdio" for a minimal stdio:// URL', () => {
    expect(detectTransport('stdio://node server.js')).toBe('stdio');
  });

  // --- Bare commands auto-detected as stdio ---
  it('returns "stdio" for an npx command', () => {
    expect(detectTransport('npx trigger.dev@latest mcp')).toBe('stdio');
  });

  it('returns "stdio" for a node command', () => {
    expect(detectTransport('node server.js')).toBe('stdio');
  });

  it('returns "stdio" for a python command', () => {
    expect(detectTransport('python -m mcp_server')).toBe('stdio');
  });

  it('returns "stdio" for an absolute path', () => {
    expect(detectTransport('/usr/local/bin/mcp-server')).toBe('stdio');
  });

  it('returns "stdio" for a relative path', () => {
    expect(detectTransport('./my-server')).toBe('stdio');
  });

  it('returns "stdio" for a .js file path', () => {
    expect(detectTransport('server.js')).toBe('stdio');
  });

  it('returns "stdio" for a plain hostname with no scheme', () => {
    expect(detectTransport('localhost:3000')).toBe('stdio');
  });

  // --- Empty string ---
  it('throws for an empty string', () => {
    expect(() => detectTransport('')).toThrow();
  });

  it('thrown error for empty string contains exit code 2', () => {
    try {
      detectTransport('');
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as NodeJS.ErrnoException).code).toBe('2');
    }
  });
});

// ---------------------------------------------------------------------------
// isNpmPackage
// ---------------------------------------------------------------------------

describe('isNpmPackage', () => {
  // Positive cases — should be detected as npm packages
  it('detects scoped package: @scope/pkg', () => {
    expect(isNpmPackage('@agentdeskai/browser-tools-mcp')).toBe(true);
  });

  it('detects scoped package with version: @scope/pkg@1.2.0', () => {
    expect(isNpmPackage('@agentdeskai/browser-tools-mcp@1.2.0')).toBe(true);
  });

  it('detects scoped package with latest tag: @scope/pkg@latest', () => {
    expect(isNpmPackage('@modelcontextprotocol/server-everything@latest')).toBe(true);
  });

  it('detects unscoped package with version: pkg@1.0.0', () => {
    expect(isNpmPackage('mcp-server-fetch@1.0.0')).toBe(true);
  });

  it('detects unscoped package with version: trigger.dev@3.0.0', () => {
    expect(isNpmPackage('trigger.dev@3.0.0')).toBe(true);
  });

  it('detects bare package name with hyphens: edgeone-pages-mcp', () => {
    expect(isNpmPackage('edgeone-pages-mcp')).toBe(true);
  });

  it('detects bare package name: mcp-server-fetch', () => {
    expect(isNpmPackage('mcp-server-fetch')).toBe(true);
  });

  it('detects bare package name: browser-tools-mcp', () => {
    expect(isNpmPackage('browser-tools-mcp')).toBe(true);
  });

  // Negative cases — should NOT be detected as npm packages
  it('rejects npx command (has spaces)', () => {
    expect(isNpmPackage('npx trigger.dev@latest mcp')).toBe(false);
  });

  it('rejects node command (has spaces)', () => {
    expect(isNpmPackage('node server.js')).toBe(false);
  });

  it('rejects relative path', () => {
    expect(isNpmPackage('./my-server')).toBe(false);
  });

  it('rejects absolute path', () => {
    expect(isNpmPackage('/usr/bin/mcp-server')).toBe(false);
  });

  it('rejects file with extension', () => {
    expect(isNpmPackage('server.js')).toBe(false);
  });

  it('rejects single word without hyphens (system command)', () => {
    expect(isNpmPackage('python')).toBe(false);
  });

  it('rejects single word without hyphens: node', () => {
    expect(isNpmPackage('node')).toBe(false);
  });

  it('rejects single word without hyphens: git', () => {
    expect(isNpmPackage('git')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isNpmPackage('')).toBe(false);
  });

  it('rejects Windows backslash path', () => {
    expect(isNpmPackage('\\usr\\bin\\server')).toBe(false);
  });

  it('rejects tilde path', () => {
    expect(isNpmPackage('~/bin/mcp-server')).toBe(false);
  });
});
