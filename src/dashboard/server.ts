/**
 * Dashboard HTTP server for MCP Verify (S-4-04, FR-066, FR-068-FR-071, FR-075).
 *
 * Serves the embedded single-page dashboard and a small REST API backed by
 * HistoryStorage.  Uses only Node.js built-ins (node:http) — no frameworks.
 */

import { createServer } from 'node:http';
import type { Server, IncomingMessage, ServerResponse } from 'node:http';
import { HistoryStorage } from '../history/index.js';
import { DASHBOARD_HTML } from './static.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CSP_HEADER =
  "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Compute the trend for a target based on the last ≤3 runs. */
function computeTrend(scores: number[]): 'up' | 'down' | 'stable' {
  if (scores.length < 2) return 'stable';
  const recent = scores.slice(-3);
  const first = recent[0] ?? 0;
  const last = recent[recent.length - 1] ?? 0;
  const delta = last - first;
  if (delta > 2) return 'up';
  if (delta < -2) return 'down';
  return 'stable';
}

/** Write a JSON response with standard headers. */
function jsonResponse(
  res: ServerResponse,
  status: number,
  body: unknown,
): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Security-Policy': CSP_HEADER,
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

/** Write an HTML response. */
function htmlResponse(
  res: ServerResponse,
  status: number,
  body: string,
): void {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': CSP_HEADER,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

/** Extract the URL path without query string. */
function parsePath(req: IncomingMessage): string {
  const url = req.url ?? '/';
  const qIdx = url.indexOf('?');
  return qIdx === -1 ? url : url.slice(0, qIdx);
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

function makeHandler(storage: HistoryStorage) {
  return function handler(req: IncomingMessage, res: ServerResponse): void {
    const path = parsePath(req);

    // GET /api/targets — list all tracked targets with summary data
    if (path === '/api/targets') {
      if (req.method !== 'GET') {
        jsonResponse(res, 405, { error: 'Method Not Allowed' });
        return;
      }

      const targets = storage.getAllTargets();
      const result = targets.map((target) => {
        const history = storage.getHistory(target);
        const latest = history[history.length - 1];
        const scores = history.map((r) => r.conformanceScore);
        return {
          target,
          latestScore: latest?.conformanceScore ?? 0,
          findingsCount: latest?.securityFindingsCount ?? 0,
          trend: computeTrend(scores),
          lastRun: latest?.timestamp ?? null,
        };
      });

      jsonResponse(res, 200, result);
      return;
    }

    // GET /api/history/:target — full history for a URL-encoded target
    const historyMatch = /^\/api\/history\/(.+)$/.exec(path);
    if (historyMatch) {
      if (req.method !== 'GET') {
        jsonResponse(res, 405, { error: 'Method Not Allowed' });
        return;
      }

      const encoded = historyMatch[1] ?? '';
      let target: string;
      try {
        target = decodeURIComponent(encoded);
      } catch {
        jsonResponse(res, 400, { error: 'Invalid target encoding' });
        return;
      }

      const history = storage.getHistory(target);
      jsonResponse(res, 200, history);
      return;
    }

    // GET /api/baselines/:target — baseline for a URL-encoded target
    const baselinesMatch = /^\/api\/baselines\/(.+)$/.exec(path);
    if (baselinesMatch) {
      if (req.method !== 'GET') {
        jsonResponse(res, 405, { error: 'Method Not Allowed' });
        return;
      }

      const encoded = baselinesMatch[1] ?? '';
      let target: string;
      try {
        target = decodeURIComponent(encoded);
      } catch {
        jsonResponse(res, 400, { error: 'Invalid target encoding' });
        return;
      }

      const latest = storage.getLatestRun(target);
      if (latest === null) {
        jsonResponse(res, 404, { error: 'No baseline found for target' });
        return;
      }

      jsonResponse(res, 200, { target, baseline: latest });
      return;
    }

    // GET / — serve the dashboard HTML
    if (path === '/' || path === '/index.html') {
      if (req.method !== 'GET') {
        jsonResponse(res, 405, { error: 'Method Not Allowed' });
        return;
      }
      htmlResponse(res, 200, DASHBOARD_HTML);
      return;
    }

    // 404 for all other routes
    jsonResponse(res, 404, { error: 'Not Found' });
  };
}

// ---------------------------------------------------------------------------
// DashboardServer
// ---------------------------------------------------------------------------

export interface DashboardServerOptions {
  port: number;
  storage?: HistoryStorage;
}

export class DashboardServer {
  private readonly server: Server;
  private readonly storage: HistoryStorage;
  readonly port: number;

  constructor(options: DashboardServerOptions) {
    this.port = options.port;
    this.storage = options.storage ?? new HistoryStorage();
    this.server = createServer(makeHandler(this.storage));
  }

  /**
   * Start listening on the configured port.
   * Resolves with the actual bound port (useful when port=0 for ephemeral ports).
   * Rejects with a descriptive error if the port is already in use.
   */
  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          reject(
            new Error(
              `Port ${this.port} is already in use. Try a different port with --port <number>.`,
            ),
          );
        } else {
          reject(err);
        }
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        const addr = this.server.address();
        const actualPort =
          addr !== null && typeof addr === 'object' ? addr.port : this.port;
        resolve(actualPort);
      });
    });
  }

  /** Stop the server and close all connections. */
  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

// ---------------------------------------------------------------------------
// startDashboard — high-level convenience used by the CLI
// ---------------------------------------------------------------------------

export async function startDashboard(port: number): Promise<DashboardServer> {
  const srv = new DashboardServer({ port });
  const actualPort = await srv.start();

  process.stdout.write(`Dashboard available at http://localhost:${actualPort}\n`);

  // Graceful shutdown on Ctrl-C
  process.on('SIGINT', () => {
    srv.stop().finally(() => {
      process.exit(0);
    });
  });

  return srv;
}
