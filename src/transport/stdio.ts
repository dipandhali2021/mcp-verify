import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { extname } from 'node:path';
import type { JsonRpcRequest, JsonRpcNotification, JsonRpcResponse } from '../types/jsonrpc.js';
import type { TransportMetadata, MessageTiming } from '../types/transport.js';
import type { Transport } from './types.js';

interface PendingRequest {
  resolve: (response: JsonRpcResponse) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  method: string;
  requestTimestamp: number;
}

/**
 * StdioTransport — spawns a child process and communicates over
 * line-delimited JSON-RPC on stdin/stdout.
 *
 * The target URL must use the stdio:// scheme, e.g.:
 *   stdio:///absolute/path/to/server.js
 *   stdio://./relative/path
 */
export class StdioTransport implements Transport {
  private readonly executablePath: string;
  private readonly timeout: number;
  private readonly verbose: boolean;

  private process: ChildProcessWithoutNullStreams | null = null;
  private stdoutBuffer = '';
  private readonly pending = new Map<string | number, PendingRequest>();
  private readonly preProtocolOutput: string[] = [];
  private readonly timings: MessageTiming[] = [];
  private firstJsonSeen = false;
  private closed = false;

  constructor(target: string, timeout: number, verbose = false) {
    // Strip the stdio:// prefix to get the real path
    this.executablePath = target.replace(/^stdio:\/\//, '');
    this.timeout = timeout;
    this.verbose = verbose;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  private ensureSpawned(): void {
    if (this.process !== null) {
      return;
    }

    const filePath = this.executablePath;
    const ext = extname(filePath).toLowerCase();

    let command: string;
    let args: string[];

    if (ext === '.js' || ext === '.ts') {
      command = process.execPath; // current Node.js binary
      args = [filePath];
    } else {
      command = filePath;
      args = [];
    }

    this.process = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    }) as ChildProcessWithoutNullStreams;

    this.process.stdout.on('data', (chunk: Buffer) => {
      this.stdoutBuffer += chunk.toString('utf8');
      this.drainBuffer();
    });

    if (this.verbose) {
      this.process.stderr.on('data', (chunk: Buffer) => {
        process.stderr.write(chunk);
      });
    }

    this.process.on('error', (err: Error) => {
      this.rejectAll(err);
    });

    this.process.on('exit', (code: number | null) => {
      const err = new Error(`Child process exited with code ${code ?? 'null'}`);
      this.rejectAll(err);
    });
  }

  async close(): Promise<void> {
    if (this.closed || this.process === null) {
      this.closed = true;
      return;
    }

    this.closed = true;
    const proc = this.process;

    return new Promise<void>((resolve) => {
      const forceKillTimer = setTimeout(() => {
        proc.kill('SIGKILL');
        resolve();
      }, 2000);

      proc.once('exit', () => {
        clearTimeout(forceKillTimer);
        resolve();
      });

      proc.kill('SIGTERM');
    });
  }

  // ---------------------------------------------------------------------------
  // Transport interface
  // ---------------------------------------------------------------------------

  async send(message: JsonRpcRequest): Promise<JsonRpcResponse> {
    this.ensureSpawned();

    return new Promise<JsonRpcResponse>((resolve, reject) => {
      const requestTimestamp = Date.now();

      const timer = setTimeout(() => {
        this.pending.delete(message.id);
        reject(new Error(`Timeout waiting for response to "${message.method}" (id: ${message.id})`));
      }, this.timeout);

      this.pending.set(message.id, {
        resolve: (response: JsonRpcResponse) => {
          clearTimeout(timer);
          const responseTimestamp = Date.now();
          this.timings.push({
            method: message.method,
            requestTimestamp,
            responseTimestamp,
            durationMs: responseTimestamp - requestTimestamp,
          });
          resolve(response);
        },
        reject: (reason: Error) => {
          clearTimeout(timer);
          reject(reason);
        },
        timer,
        method: message.method,
        requestTimestamp,
      });

      this.writeToProcess(JSON.stringify(message) + '\n');
    });
  }

  async notify(message: JsonRpcNotification): Promise<void> {
    this.ensureSpawned();
    this.writeToProcess(JSON.stringify(message) + '\n');
  }

  async sendRaw(data: string): Promise<JsonRpcResponse | null> {
    this.ensureSpawned();

    // For raw sends we use a synthetic id to track the response.
    // We write the raw bytes verbatim — the server may respond with a
    // JSON-RPC error or nothing at all.
    const rawId = `raw-${Date.now()}`;

    return new Promise<JsonRpcResponse | null>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(rawId);
        // Timeout on raw send resolves null — not a hard error
        resolve(null);
      }, this.timeout);

      // We register a synthetic pending entry with rawId so that if the
      // server echoes back a response with any id, we can capture it.
      // In practice for malformed JSON the server may return an id of null.
      this.pending.set(rawId, {
        resolve: (response: JsonRpcResponse) => {
          clearTimeout(timer);
          resolve(response);
        },
        reject: (_reason: Error) => {
          clearTimeout(timer);
          resolve(null);
        },
        timer,
        method: 'raw',
        requestTimestamp: Date.now(),
      });

      this.writeToProcess(data + '\n');
    });
  }

  getMetadata(): TransportMetadata {
    return {
      type: 'stdio',
      target: this.executablePath,
      httpHeaders: {},
      sseObservations: [],
      preProtocolOutput: [...this.preProtocolOutput],
      timing: [...this.timings],
    };
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private writeToProcess(data: string): void {
    if (this.process === null || this.closed) {
      return;
    }
    this.process.stdin.write(data, 'utf8');
  }

  private drainBuffer(): void {
    let newlineIdx: number;

    while ((newlineIdx = this.stdoutBuffer.indexOf('\n')) !== -1) {
      const line = this.stdoutBuffer.slice(0, newlineIdx).trimEnd();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIdx + 1);

      if (!line) {
        continue;
      }

      // Attempt to parse as JSON-RPC
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        // Non-JSON line — capture as pre-protocol output if we haven't seen
        // any valid JSON yet
        if (!this.firstJsonSeen) {
          this.preProtocolOutput.push(line);
        }
        continue;
      }

      this.firstJsonSeen = true;

      if (!isJsonRpcResponse(parsed)) {
        continue;
      }

      const response = parsed;

      // Dispatch to waiting request or to any raw-send listener
      if (response.id !== null && this.pending.has(response.id)) {
        const pending = this.pending.get(response.id);
        if (pending) {
          this.pending.delete(response.id);
          pending.resolve(response);
          continue;
        }
      }

      // For responses with id === null (e.g., error reply to malformed JSON),
      // resolve the oldest raw-* pending entry if present
      if (response.id === null) {
        for (const [key, pending] of this.pending.entries()) {
          if (String(key).startsWith('raw-')) {
            this.pending.delete(key);
            pending.resolve(response);
            break;
          }
        }
      }
    }
  }

  private rejectAll(err: Error): void {
    for (const [id, pending] of this.pending.entries()) {
      this.pending.delete(id);
      clearTimeout(pending.timer);
      pending.reject(err);
    }
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
      typeof v['id'] === 'number') &&
    (Object.prototype.hasOwnProperty.call(v, 'result') ||
      Object.prototype.hasOwnProperty.call(v, 'error'))
  );
}
