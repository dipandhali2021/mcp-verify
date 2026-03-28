import * as http from 'node:http';
import * as https from 'node:https';
import { URL } from 'node:url';
import type { JsonRpcRequest, JsonRpcNotification, JsonRpcResponse } from '../types/jsonrpc.js';
import type { TransportMetadata, MessageTiming, SseObservation } from '../types/transport.js';
import type { Transport } from './types.js';
import { parseSseBody } from './sse-parser.js';

/**
 * HttpTransport — sends JSON-RPC messages as HTTP POST requests.
 *
 * Supports two response modes:
 *   1. Direct JSON: the response body is a single JSON-RPC object.
 *   2. SSE stream: Content-Type contains "text/event-stream"; the body is
 *      parsed as Server-Sent Events and the first matching JSON-RPC response
 *      (by id) is returned.
 */
export class HttpTransport implements Transport {
  private readonly url: string;
  private readonly timeout: number;

  // Per-request headers captured for metadata
  private readonly capturedHeaders: Record<string, Record<string, string>> = {};
  private readonly sseObservations: SseObservation[] = [];
  private readonly timings: MessageTiming[] = [];
  private readonly activeSockets: Set<http.ClientRequest> = new Set();

  constructor(url: string, timeout: number) {
    this.url = url;
    this.timeout = timeout;
  }

  // ---------------------------------------------------------------------------
  // Transport interface
  // ---------------------------------------------------------------------------

  async send(message: JsonRpcRequest): Promise<JsonRpcResponse> {
    const requestTimestamp = Date.now();
    const response = await this.post(JSON.stringify(message), message.id);
    const responseTimestamp = Date.now();

    this.timings.push({
      method: message.method,
      requestTimestamp,
      responseTimestamp,
      durationMs: responseTimestamp - requestTimestamp,
    });

    return response;
  }

  async notify(message: JsonRpcNotification): Promise<void> {
    // Notifications do not expect a response; fire and ignore the body
    try {
      await this.post(JSON.stringify(message), null);
    } catch {
      // Notifications are best-effort — ignore transport errors
    }
  }

  async sendRaw(data: string): Promise<JsonRpcResponse | null> {
    try {
      return await this.post(data, null);
    } catch {
      return null;
    }
  }

  getMetadata(): TransportMetadata {
    return {
      type: 'http',
      target: this.url,
      httpHeaders: { ...this.capturedHeaders },
      sseObservations: [...this.sseObservations],
      preProtocolOutput: [],
      timing: [...this.timings],
    };
  }

  async close(): Promise<void> {
    for (const req of this.activeSockets) {
      req.destroy();
    }
    this.activeSockets.clear();
  }

  // ---------------------------------------------------------------------------
  // Internal HTTP POST helper
  // ---------------------------------------------------------------------------

  private post(body: string, expectedId: string | number | null): Promise<JsonRpcResponse> {
    return new Promise<JsonRpcResponse>((resolve, reject) => {
      const parsedUrl = new URL(this.url);
      const isHttps = parsedUrl.protocol === 'https:';
      const lib: typeof http | typeof https = isHttps ? https : http;

      const options: http.RequestOptions = {
        method: 'POST',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port
          ? parseInt(parsedUrl.port, 10)
          : isHttps
          ? 443
          : 80,
        path: parsedUrl.pathname + parsedUrl.search,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body, 'utf8'),
          Accept: 'application/json, text/event-stream',
        },
      };

      // AbortController-style timeout via socket timeout + timer
      const timeoutTimer = setTimeout(() => {
        req.destroy(new Error(`HTTP request timed out after ${this.timeout}ms`));
      }, this.timeout);

      const req = lib.request(options, (res: http.IncomingMessage) => {
        clearTimeout(timeoutTimer);

        // Capture response headers
        const headersKey = `${options.method} ${options.path}`;
        const capturedHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(res.headers)) {
          if (value !== undefined) {
            capturedHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
          }
        }
        this.capturedHeaders[headersKey] = capturedHeaders;

        const contentType = res.headers['content-type'] ?? '';
        const isSSE = contentType.includes('text/event-stream');

        const chunks: Buffer[] = [];

        res.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          this.activeSockets.delete(req);
          const rawBody = Buffer.concat(chunks).toString('utf8');

          if (isSSE) {
            // Parse the full SSE body
            const { responses, observations } = parseSseBody(rawBody);

            // Accumulate observations
            for (const obs of observations) {
              this.sseObservations.push(obs);
            }

            // Find the response that matches our expected id
            const matched = expectedId !== null
              ? responses.find((r) => r.id === expectedId)
              : responses[0];

            if (matched !== undefined) {
              resolve(matched);
            } else if (responses.length > 0 && responses[0] !== undefined) {
              resolve(responses[0]);
            } else {
              reject(new Error('No JSON-RPC response found in SSE stream'));
            }
          } else {
            // Plain JSON response
            let parsed: unknown;
            try {
              parsed = JSON.parse(rawBody);
            } catch (err) {
              reject(new Error(`Failed to parse JSON response: ${String(err)}`));
              return;
            }

            if (!isJsonRpcResponse(parsed)) {
              reject(new Error('Response is not a valid JSON-RPC response'));
              return;
            }

            resolve(parsed);
          }
        });

        res.on('error', (err: Error) => {
          this.activeSockets.delete(req);
          reject(err);
        });
      });

      req.on('error', (err: Error) => {
        clearTimeout(timeoutTimer);
        this.activeSockets.delete(req);
        reject(err);
      });

      this.activeSockets.add(req);
      req.write(body, 'utf8');
      req.end();
    });
  }
}

function isJsonRpcResponse(value: unknown): value is JsonRpcResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v['jsonrpc'] === 'string' &&
    (v['id'] === null ||
      typeof v['id'] === 'string' ||
      typeof v['id'] === 'number')
  );
}
