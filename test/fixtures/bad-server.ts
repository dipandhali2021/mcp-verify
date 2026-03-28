#!/usr/bin/env node
// test/fixtures/bad-server.ts
// A non-conforming MCP server that intentionally violates several conformance rules.
//
// Violations introduced:
// 1. initialize response is missing jsonrpc field entirely.
// 2. initialize response is missing serverInfo.
// 3. tools/list returns a tool with no name and inputSchema missing the "type" field.
// 4. unknown-method probe responds with -32600 (Invalid Request) instead of -32601 (Method Not Found).
// 5. Malformed JSON probe receives no response at all (silent drop).
import * as readline from 'node:readline';

const CAPABILITIES = {
  tools: {},
  resources: {},
  prompts: {},
};

// Tool with multiple schema violations:
// - name is missing (undefined)
// - inputSchema has no "type" field
const BAD_TOOLS = [
  {
    // name intentionally omitted
    description: 'A broken tool without a name or proper schema',
    inputSchema: {
      // "type" intentionally omitted — violates TOOL-004
      properties: {
        value: { type: 'string' },
      },
    },
  },
];

const RESOURCES = [
  { uri: 'file:///test/readme.md', name: 'README', mimeType: 'text/markdown' },
];

const PROMPTS = [
  {
    name: 'greeting',
    description: 'Generate a greeting',
    arguments: [{ name: 'name', description: 'Name to greet', required: true }],
  },
];

const rl = readline.createInterface({ input: process.stdin });

rl.on('line', (line: string) => {
  let request: any;
  try {
    request = JSON.parse(line);
  } catch {
    // Violation 5: silently drop malformed JSON — no response sent
    return;
  }

  // Handle notifications (no id) — no response expected
  if (request.method === 'notifications/initialized' || !('id' in request)) {
    return;
  }

  const id = request.id;
  let response: any;

  switch (request.method) {
    case 'initialize':
      // Violation 1: missing jsonrpc field
      // Violation 2: missing serverInfo
      response = {
        // jsonrpc intentionally omitted
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: CAPABILITIES,
          // serverInfo intentionally omitted
        },
      };
      break;
    case 'tools/list':
      response = { jsonrpc: '2.0', id, result: { tools: BAD_TOOLS } };
      break;
    case 'resources/list':
      response = { jsonrpc: '2.0', id, result: { resources: RESOURCES } };
      break;
    case 'resources/read':
      response = {
        jsonrpc: '2.0',
        id,
        result: {
          contents: [{ uri: RESOURCES[0].uri, text: '# Test README\nHello world' }],
        },
      };
      break;
    case 'prompts/list':
      response = { jsonrpc: '2.0', id, result: { prompts: PROMPTS } };
      break;
    default:
      // Violation 4: wrong error code (-32600 instead of -32601)
      response = {
        jsonrpc: '2.0',
        id,
        error: { code: -32600, message: 'Invalid Request' },
      };
      break;
  }

  process.stdout.write(JSON.stringify(response) + '\n');
});
