/**
 * Tests for the dashboard HTTP server (S-4-04, FR-066, FR-068-FR-071, FR-075).
 *
 * Each test that starts a server uses port 0 so the OS assigns an ephemeral port,
 * preventing port conflicts when tests run in parallel.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DashboardServer } from '../../src/dashboard/server.js';
import { HistoryStorage } from '../../src/history/storage.js';
import type { HistoryRecord } from '../../src/history/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_CSP =
  "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'";

/** Create a HistoryStorage wired to a fresh temp directory. */
function makeStorage(dir: string): HistoryStorage {
  const storage = new HistoryStorage();
  storage.getHistoryDir = () => {
    mkdirSync(dir, { recursive: true });
    return dir;
  };
  return storage;
}

/** Build a minimal valid HistoryRecord. */
function makeRecord(overrides: Partial<HistoryRecord> = {}): HistoryRecord {
  return {
    timestamp: new Date().toISOString(),
    target: 'https://example.com/mcp',
    conformanceScore: 85,
    securityFindingsCount: 2,
    breakdown: { lifecycle: 90, tools: 80 },
    toolVersion: '1.0.0',
    specVersion: '2024-11-05',
    ...overrides,
  };
}

/** Convenience: start a server, run the callback, stop the server. */
async function withServer(
  storage: HistoryStorage,
  fn: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = new DashboardServer({ port: 0, storage });
  const port = await server.start();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await server.stop();
  }
}

// ---------------------------------------------------------------------------
// Suite: server lifecycle
// ---------------------------------------------------------------------------

describe('DashboardServer — lifecycle', () => {
  let tmpBase: string;

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'mcp-dash-test-'));
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  it('starts and stops cleanly', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    const server = new DashboardServer({ port: 0, storage });
    const port = await server.start();
    expect(port).toBeGreaterThan(0);
    await expect(server.stop()).resolves.toBeUndefined();
  });

  it('uses the provided port', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    const server = new DashboardServer({ port: 0, storage });
    const actualPort = await server.start();
    // port 0 → OS assigns a real port
    expect(actualPort).toBeGreaterThan(0);
    expect(actualPort).toBeLessThanOrEqual(65535);
    await server.stop();
  });

  it('rejects with a descriptive error when the port is already in use', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    const server1 = new DashboardServer({ port: 0, storage });
    const port = await server1.start();

    const server2 = new DashboardServer({ port, storage });
    await expect(server2.start()).rejects.toThrow(/already in use/i);

    await server1.stop();
  });
});

// ---------------------------------------------------------------------------
// Suite: GET /
// ---------------------------------------------------------------------------

describe('DashboardServer — GET /', () => {
  let tmpBase: string;

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'mcp-dash-test-'));
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  it('returns 200 with HTML content-type', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toMatch(/text\/html/);
    });
  });

  it('includes the CSP header', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/`);
      expect(res.headers.get('content-security-policy')).toBe(DEFAULT_CSP);
    });
  });

  it('serves the dashboard HTML (contains MCP Verify Dashboard title)', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/`);
      const text = await res.text();
      expect(text).toContain('MCP Verify Dashboard');
    });
  });
});

// ---------------------------------------------------------------------------
// Suite: GET /api/targets
// ---------------------------------------------------------------------------

describe('DashboardServer — GET /api/targets', () => {
  let tmpBase: string;

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'mcp-dash-test-'));
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  it('returns 200 with JSON content-type', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/api/targets`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toMatch(/application\/json/);
    });
  });

  it('returns empty array when no history exists', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/api/targets`);
      const body = await res.json() as unknown[];
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(0);
    });
  });

  it('returns one entry per target with expected fields', async () => {
    const histDir = join(tmpBase, 'history');
    const storage = makeStorage(histDir);

    const target = 'https://example.com/mcp';
    storage.appendRun(target, makeRecord({ target, conformanceScore: 90, securityFindingsCount: 1 }));
    storage.appendRun(target, makeRecord({ target, conformanceScore: 85, securityFindingsCount: 2 }));

    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/api/targets`);
      const body = await res.json() as Array<{
        target: string;
        latestScore: number;
        findingsCount: number;
        trend: string;
        lastRun: string | null;
      }>;

      expect(body).toHaveLength(1);
      const entry = body[0];
      expect(entry).toBeDefined();
      expect(entry!.target).toBe(target);
      expect(entry!.latestScore).toBe(85);
      expect(entry!.findingsCount).toBe(2);
      expect(['up', 'down', 'stable']).toContain(entry!.trend);
      expect(entry!.lastRun).not.toBeNull();
    });
  });

  it('computes trend=down when score drops over last runs', async () => {
    const histDir = join(tmpBase, 'history');
    const storage = makeStorage(histDir);
    const target = 'https://trend.example.com/mcp';

    storage.appendRun(target, makeRecord({ target, conformanceScore: 90 }));
    storage.appendRun(target, makeRecord({ target, conformanceScore: 80 }));
    storage.appendRun(target, makeRecord({ target, conformanceScore: 70 }));

    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/api/targets`);
      const body = await res.json() as Array<{ target: string; trend: string }>;
      const entry = body.find((e) => e.target === target);
      expect(entry).toBeDefined();
      expect(entry!.trend).toBe('down');
    });
  });

  it('computes trend=up when score rises over last runs', async () => {
    const histDir = join(tmpBase, 'history');
    const storage = makeStorage(histDir);
    const target = 'https://rising.example.com/mcp';

    storage.appendRun(target, makeRecord({ target, conformanceScore: 60 }));
    storage.appendRun(target, makeRecord({ target, conformanceScore: 75 }));
    storage.appendRun(target, makeRecord({ target, conformanceScore: 88 }));

    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/api/targets`);
      const body = await res.json() as Array<{ target: string; trend: string }>;
      const entry = body.find((e) => e.target === target);
      expect(entry).toBeDefined();
      expect(entry!.trend).toBe('up');
    });
  });

  it('includes the CSP header', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/api/targets`);
      expect(res.headers.get('content-security-policy')).toBe(DEFAULT_CSP);
    });
  });
});

// ---------------------------------------------------------------------------
// Suite: GET /api/history/:target
// ---------------------------------------------------------------------------

describe('DashboardServer — GET /api/history/:target', () => {
  let tmpBase: string;

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'mcp-dash-test-'));
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  it('returns 200 with the history array for a known target', async () => {
    const histDir = join(tmpBase, 'history');
    const storage = makeStorage(histDir);

    const target = 'https://example.com/mcp';
    const r1 = makeRecord({ target, conformanceScore: 70 });
    const r2 = makeRecord({ target, conformanceScore: 80 });
    storage.appendRun(target, r1);
    storage.appendRun(target, r2);

    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/api/history/${encodeURIComponent(target)}`);
      expect(res.status).toBe(200);
      const body = await res.json() as HistoryRecord[];
      expect(Array.isArray(body)).toBe(true);
      expect(body).toHaveLength(2);
      expect(body[0]!.conformanceScore).toBe(70);
      expect(body[1]!.conformanceScore).toBe(80);
    });
  });

  it('returns empty array for unknown target', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/api/history/${encodeURIComponent('https://unknown.example.com/mcp')}`);
      expect(res.status).toBe(200);
      const body = await res.json() as unknown[];
      expect(body).toEqual([]);
    });
  });

  it('handles URL-encoded target with special characters', async () => {
    const histDir = join(tmpBase, 'history');
    const storage = makeStorage(histDir);

    const target = 'https://example.com/mcp?foo=bar&baz=qux';
    storage.appendRun(target, makeRecord({ target }));

    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/api/history/${encodeURIComponent(target)}`);
      expect(res.status).toBe(200);
      const body = await res.json() as HistoryRecord[];
      expect(body).toHaveLength(1);
      expect(body[0]!.target).toBe(target);
    });
  });

  it('includes the CSP header', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/api/history/${encodeURIComponent('https://example.com/mcp')}`);
      expect(res.headers.get('content-security-policy')).toBe(DEFAULT_CSP);
    });
  });
});

// ---------------------------------------------------------------------------
// Suite: GET /api/baselines/:target
// ---------------------------------------------------------------------------

describe('DashboardServer — GET /api/baselines/:target', () => {
  let tmpBase: string;

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'mcp-dash-test-'));
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  it('returns 404 when no history exists for target', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/api/baselines/${encodeURIComponent('https://no-baseline.example.com/mcp')}`);
      expect(res.status).toBe(404);
    });
  });

  it('returns 200 with latest run as baseline when history exists', async () => {
    const histDir = join(tmpBase, 'history');
    const storage = makeStorage(histDir);
    const target = 'https://example.com/mcp';
    const record = makeRecord({ target, conformanceScore: 92 });
    storage.appendRun(target, record);

    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/api/baselines/${encodeURIComponent(target)}`);
      expect(res.status).toBe(200);
      const body = await res.json() as { target: string; baseline: HistoryRecord };
      expect(body.target).toBe(target);
      expect(body.baseline.conformanceScore).toBe(92);
    });
  });

  it('includes the CSP header', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/api/baselines/${encodeURIComponent('https://example.com/mcp')}`);
      // 404 but CSP should still be present
      expect(res.headers.get('content-security-policy')).toBe(DEFAULT_CSP);
    });
  });
});

// ---------------------------------------------------------------------------
// Suite: 404 and unknown routes
// ---------------------------------------------------------------------------

describe('DashboardServer — 404 for unknown routes', () => {
  let tmpBase: string;

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'mcp-dash-test-'));
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  it('returns 404 for /unknown', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/unknown`);
      expect(res.status).toBe(404);
    });
  });

  it('returns 404 for /api/nonexistent-endpoint', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/api/nonexistent-endpoint`);
      expect(res.status).toBe(404);
    });
  });

  it('404 response includes CSP header', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/does-not-exist`);
      expect(res.headers.get('content-security-policy')).toBe(DEFAULT_CSP);
    });
  });

  it('404 response body is JSON with error field', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/not-found`);
      const body = await res.json() as { error: string };
      expect(body).toHaveProperty('error');
    });
  });
});

// ---------------------------------------------------------------------------
// Suite: CSP header on all responses
// ---------------------------------------------------------------------------

describe('DashboardServer — CSP header on all responses', () => {
  let tmpBase: string;

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'mcp-dash-test-'));
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  it('CSP header is present on HTML response', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/`);
      expect(res.headers.get('content-security-policy')).toBe(DEFAULT_CSP);
    });
  });

  it('CSP header is present on /api/targets', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/api/targets`);
      expect(res.headers.get('content-security-policy')).toBe(DEFAULT_CSP);
    });
  });

  it('CSP header is present on /api/history/:target', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    await withServer(storage, async (base) => {
      const res = await fetch(`${base}/api/history/${encodeURIComponent('https://example.com/mcp')}`);
      expect(res.headers.get('content-security-policy')).toBe(DEFAULT_CSP);
    });
  });
});

// ---------------------------------------------------------------------------
// Suite: port configuration
// ---------------------------------------------------------------------------

describe('DashboardServer — port configuration', () => {
  let tmpBase: string;

  beforeEach(() => {
    tmpBase = mkdtempSync(join(tmpdir(), 'mcp-dash-test-'));
  });

  afterEach(() => {
    rmSync(tmpBase, { recursive: true, force: true });
  });

  it('binds to an ephemeral port when port=0', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    const server = new DashboardServer({ port: 0, storage });
    const port = await server.start();
    expect(port).toBeGreaterThan(0);
    await server.stop();
  });

  it('exposes the bound port after start', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    const server = new DashboardServer({ port: 0, storage });
    const actualPort = await server.start();
    // The bound port is the actual port (returned from start())
    expect(actualPort).toBeGreaterThan(0);
    await server.stop();
  });

  it('two servers can run simultaneously on different ephemeral ports', async () => {
    const storage = makeStorage(join(tmpBase, 'history'));
    const s1 = new DashboardServer({ port: 0, storage });
    const s2 = new DashboardServer({ port: 0, storage });

    const p1 = await s1.start();
    const p2 = await s2.start();

    expect(p1).not.toBe(p2);

    await s1.stop();
    await s2.stop();
  });
});
