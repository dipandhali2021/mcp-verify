import { describe, it, expect } from 'vitest';
import { detectTransport } from '../../src/transport/detect.js';

describe('detectTransport', () => {
  it('returns "http" for an http:// URL', () => {
    expect(detectTransport('http://localhost:3000')).toBe('http');
  });

  it('returns "http" for an https:// URL', () => {
    expect(detectTransport('https://example.com/mcp')).toBe('http');
  });

  it('returns "http" for an https:// URL with a path and port', () => {
    expect(detectTransport('https://api.example.com:8443/v1/mcp')).toBe('http');
  });

  it('returns "stdio" for a stdio:// URL', () => {
    expect(detectTransport('stdio:///path/to/server')).toBe('stdio');
  });

  it('returns "stdio" for a minimal stdio:// URL', () => {
    expect(detectTransport('stdio://node server.js')).toBe('stdio');
  });

  it('throws for an unsupported scheme', () => {
    expect(() => detectTransport('ftp://example.com')).toThrow();
  });

  it('throws for a plain hostname with no scheme', () => {
    expect(() => detectTransport('localhost:3000')).toThrow();
  });

  it('throws for an empty string', () => {
    expect(() => detectTransport('')).toThrow();
  });

  it('thrown error for invalid scheme contains exit code 2', () => {
    try {
      detectTransport('ws://example.com');
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as NodeJS.ErrnoException).code).toBe('2');
    }
  });

  it('thrown error message mentions valid schemes', () => {
    try {
      detectTransport('grpc://example.com');
      expect.fail('Should have thrown');
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain('http://');
      expect(msg).toContain('https://');
      expect(msg).toContain('stdio://');
    }
  });
});
