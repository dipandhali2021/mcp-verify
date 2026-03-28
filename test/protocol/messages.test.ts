import { describe, it, expect } from 'vitest';
import {
  createInitializeRequest,
  createInitializedNotification,
  createToolsListRequest,
  createResourcesListRequest,
  createResourceReadRequest,
  createPromptsListRequest,
  createUnknownMethodProbe,
  MCP_PROTOCOL_VERSION,
} from '../../src/protocol/messages.js';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MCP_PROTOCOL_VERSION', () => {
  it('is the expected 2024-11-05 string', () => {
    expect(MCP_PROTOCOL_VERSION).toBe('2024-11-05');
  });
});

describe('createInitializeRequest', () => {
  it('produces a JSON-RPC 2.0 request', () => {
    const req = createInitializeRequest('1.0.0');
    expect(req.jsonrpc).toBe('2.0');
  });

  it('uses "initialize" as the method', () => {
    const req = createInitializeRequest('1.0.0');
    expect(req.method).toBe('initialize');
  });

  it('includes protocolVersion matching MCP_PROTOCOL_VERSION in params', () => {
    const req = createInitializeRequest('1.0.0');
    expect((req.params as any)?.protocolVersion).toBe(MCP_PROTOCOL_VERSION);
  });

  it('includes clientInfo with the provided version string', () => {
    const req = createInitializeRequest('2.3.4');
    const clientInfo = (req.params as any)?.clientInfo;
    expect(clientInfo?.name).toBe('mcp-verify');
    expect(clientInfo?.version).toBe('2.3.4');
  });

  it('assigns a numeric id', () => {
    const req = createInitializeRequest('1.0.0');
    expect(typeof req.id).toBe('number');
  });

  it('produces incrementing IDs across successive calls', () => {
    const first = createInitializeRequest('1.0.0');
    const second = createInitializeRequest('1.0.0');
    expect(second.id as number).toBeGreaterThan(first.id as number);
  });

  it('includes an empty capabilities object in params', () => {
    const req = createInitializeRequest('1.0.0');
    expect((req.params as any)?.capabilities).toBeDefined();
  });
});

describe('createInitializedNotification', () => {
  it('produces a JSON-RPC 2.0 notification', () => {
    const note = createInitializedNotification();
    expect(note.jsonrpc).toBe('2.0');
  });

  it('uses "notifications/initialized" as the method', () => {
    const note = createInitializedNotification();
    expect(note.method).toBe('notifications/initialized');
  });

  it('has no id field (notifications must not have id)', () => {
    const note = createInitializedNotification();
    expect('id' in note).toBe(false);
  });
});

describe('createToolsListRequest', () => {
  it('uses "tools/list" as the method', () => {
    const req = createToolsListRequest();
    expect(req.method).toBe('tools/list');
  });

  it('assigns a numeric id greater than zero', () => {
    const req = createToolsListRequest();
    expect(typeof req.id).toBe('number');
    expect(req.id as number).toBeGreaterThan(0);
  });

  it('omits cursor from params when not provided', () => {
    const req = createToolsListRequest();
    expect((req.params as any)?.cursor).toBeUndefined();
  });

  it('includes cursor in params when provided', () => {
    const req = createToolsListRequest('page-2-token');
    expect((req.params as any)?.cursor).toBe('page-2-token');
  });
});

describe('createResourcesListRequest', () => {
  it('uses "resources/list" as the method', () => {
    const req = createResourcesListRequest();
    expect(req.method).toBe('resources/list');
  });

  it('has jsonrpc: "2.0"', () => {
    expect(createResourcesListRequest().jsonrpc).toBe('2.0');
  });
});

describe('createResourceReadRequest', () => {
  it('uses "resources/read" as the method', () => {
    const req = createResourceReadRequest('file:///test/readme.md');
    expect(req.method).toBe('resources/read');
  });

  it('includes the provided URI in params', () => {
    const uri = 'file:///test/readme.md';
    const req = createResourceReadRequest(uri);
    expect((req.params as any)?.uri).toBe(uri);
  });
});

describe('createPromptsListRequest', () => {
  it('uses "prompts/list" as the method', () => {
    const req = createPromptsListRequest();
    expect(req.method).toBe('prompts/list');
  });
});

describe('createUnknownMethodProbe', () => {
  it('uses "mcp-verify/probe-unknown-method" as the method', () => {
    const req = createUnknownMethodProbe();
    expect(req.method).toBe('mcp-verify/probe-unknown-method');
  });

  it('has jsonrpc: "2.0"', () => {
    expect(createUnknownMethodProbe().jsonrpc).toBe('2.0');
  });

  it('assigns a numeric id', () => {
    expect(typeof createUnknownMethodProbe().id).toBe('number');
  });
});
