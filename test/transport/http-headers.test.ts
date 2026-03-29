/**
 * Tests for custom headers in HttpTransport.
 */

import { describe, it, expect, afterAll } from 'vitest';
import * as http from 'node:http';
import { HttpTransport } from '../../src/transport/http.js';

// ---------------------------------------------------------------------------
// Local echo server that returns received request headers as JSON
// ---------------------------------------------------------------------------

let server: http.Server;
let serverPort: number;

function startEchoServer(): Promise<void> {
  return new Promise((resolve) => {
    server = http.createServer((req, res) => {
      // Return a valid JSON-RPC response that includes the received headers
      const response = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          receivedHeaders: req.headers,
        },
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        serverPort = addr.port;
      }
      resolve();
    });
  });
}

afterAll(() => {
  if (server) {
    server.close();
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HttpTransport — custom headers', () => {
  it('sends custom Authorization header to the server', async () => {
    await startEchoServer();

    const transport = new HttpTransport(
      `http://127.0.0.1:${serverPort}`,
      5000,
      { Authorization: 'Bearer my-secret-token' },
    );

    const response = await transport.send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      },
    });

    const headers = (response.result as Record<string, unknown>)['receivedHeaders'] as Record<string, string>;
    expect(headers['authorization']).toBe('Bearer my-secret-token');

    await transport.close();
  });

  it('sends multiple custom headers', async () => {
    await startEchoServer();

    const transport = new HttpTransport(
      `http://127.0.0.1:${serverPort}`,
      5000,
      {
        Authorization: 'Bearer tok',
        'X-Custom': 'custom-value',
      },
    );

    const response = await transport.send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      },
    });

    const headers = (response.result as Record<string, unknown>)['receivedHeaders'] as Record<string, string>;
    expect(headers['authorization']).toBe('Bearer tok');
    expect(headers['x-custom']).toBe('custom-value');

    await transport.close();
  });

  it('preserves Content-Type even if custom header tries to override it', async () => {
    await startEchoServer();

    const transport = new HttpTransport(
      `http://127.0.0.1:${serverPort}`,
      5000,
      { 'Content-Type': 'text/plain' },
    );

    const response = await transport.send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      },
    });

    const headers = (response.result as Record<string, unknown>)['receivedHeaders'] as Record<string, string>;
    // application/json must win over the custom Content-Type
    expect(headers['content-type']).toBe('application/json');

    await transport.close();
  });

  it('works with no custom headers (backward compat)', async () => {
    await startEchoServer();

    const transport = new HttpTransport(
      `http://127.0.0.1:${serverPort}`,
      5000,
    );

    const response = await transport.send({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test', version: '1.0.0' },
      },
    });

    const headers = (response.result as Record<string, unknown>)['receivedHeaders'] as Record<string, string>;
    expect(headers['content-type']).toBe('application/json');
    expect(headers['authorization']).toBeUndefined();

    await transport.close();
  });
});
