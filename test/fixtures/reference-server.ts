#!/usr/bin/env node
// test/fixtures/reference-server.ts
// A conforming MCP server for testing — passes ALL conformance checks.
import * as readline from 'node:readline';

const SERVER_INFO = {
  name: 'reference-test-server',
  version: '1.0.0',
};

const CAPABILITIES = {
  tools: {},
  resources: {},
  prompts: {},
};

const TOOLS = [
  {
    name: 'echo',
    description: 'Echoes the input back',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message to echo' },
      },
      required: ['message'],
    },
  },
  {
    name: 'add',
    description: 'Adds two numbers',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number', description: 'First number' },
        b: { type: 'number', description: 'Second number' },
      },
      required: ['a', 'b'],
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
    arguments: [
      { name: 'name', description: 'Name to greet', required: true },
    ],
  },
];

// Handle line-delimited JSON-RPC on stdin/stdout
const rl = readline.createInterface({ input: process.stdin });

rl.on('line', (line: string) => {
  let request: any;
  try {
    request = JSON.parse(line);
  } catch {
    // Malformed JSON — return parse error
    const response = {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error' },
    };
    process.stdout.write(JSON.stringify(response) + '\n');
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
      response = {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: CAPABILITIES,
          serverInfo: SERVER_INFO,
        },
      };
      break;
    case 'tools/list':
      response = { jsonrpc: '2.0', id, result: { tools: TOOLS } };
      break;
    case 'resources/list':
      response = { jsonrpc: '2.0', id, result: { resources: RESOURCES } };
      break;
    case 'resources/read':
      response = {
        jsonrpc: '2.0',
        id,
        result: {
          contents: [
            {
              uri: request.params?.uri || RESOURCES[0].uri,
              text: '# Test README\nHello world',
            },
          ],
        },
      };
      break;
    case 'prompts/list':
      response = { jsonrpc: '2.0', id, result: { prompts: PROMPTS } };
      break;
    default:
      response = {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: 'Method not found' },
      };
      break;
  }

  process.stdout.write(JSON.stringify(response) + '\n');
});
