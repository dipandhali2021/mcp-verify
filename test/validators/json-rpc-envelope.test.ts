import { describe, it, expect } from 'vitest';
import { validateJsonRpcEnvelope } from '../../src/validators/conformance/json-rpc-envelope.js';
import type { ProtocolExchangeRecord } from '../../src/types/protocol.js';
import type { VerificationConfig } from '../../src/types/config.js';
import { DEFAULT_CONFIG } from '../../src/types/config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(): VerificationConfig {
  return { ...DEFAULT_CONFIG, target: 'stdio://test' };
}

function makeMinimalExchange(
  overrides: Partial<ProtocolExchangeRecord> = {},
): ProtocolExchangeRecord {
  return {
    initializeRequest: { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    initializeResponse: {
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: { name: 'test-server', version: '1.0.0' },
      },
    },
    initializedSent: true,
    serverInfo: { name: 'test-server', version: '1.0.0' },
    toolsListResponses: [],
    tools: [],
    resourcesListResponse: null,
    resources: [],
    resourceReadResponse: null,
    promptsListResponse: null,
    prompts: [],
    unknownMethodProbeResponse: null,
    malformedJsonProbeResponse: null,
    transportMetadata: {
      type: 'stdio',
      target: 'stdio:///test',
      httpHeaders: {},
      sseObservations: [],
      preProtocolOutput: [],
      timing: [],
    },
    errors: [],
    stepResults: {
      initialize: { status: 'completed', durationMs: 50 },
      initialized: { status: 'completed', durationMs: 10 },
      'tools/list': { status: 'completed', durationMs: 30 },
      'resources/list': { status: 'completed', durationMs: 30 },
      'resources/read': { status: 'completed', durationMs: 30 },
      'prompts/list': { status: 'completed', durationMs: 30 },
      'error-probe-unknown': { status: 'completed', durationMs: 20 },
      'error-probe-malformed': { status: 'completed', durationMs: 20 },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateJsonRpcEnvelope', () => {
  it('returns a single JSONRPC-000 failure when no responses exist', () => {
    const exchange = makeMinimalExchange({ initializeResponse: null });
    const results = validateJsonRpcEnvelope(exchange, makeConfig());
    expect(results).toHaveLength(1);
    expect(results[0]?.checkId).toBe('JSONRPC-000');
    expect(results[0]?.level).toBe('failure');
  });

  it('passes JSONRPC-001 when jsonrpc is "2.0"', () => {
    const exchange = makeMinimalExchange();
    const results = validateJsonRpcEnvelope(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'JSONRPC-001');
    expect(check).toBeDefined();
    expect(check?.level).toBe('pass');
  });

  it('fails JSONRPC-001 when jsonrpc field is missing', () => {
    const exchange = makeMinimalExchange({
      initializeResponse: {
        jsonrpc: '', // wrong/missing value
        id: 1,
        result: { protocolVersion: '2024-11-05', capabilities: {}, serverInfo: { name: 'srv', version: '1' } },
      },
    });
    const results = validateJsonRpcEnvelope(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'JSONRPC-001' && r.details?.['label'] === 'initialize');
    expect(check?.level).toBe('failure');
  });

  it('fails JSONRPC-001 when jsonrpc is wrong version string', () => {
    const exchange = makeMinimalExchange({
      initializeResponse: {
        jsonrpc: '1.0', // wrong version
        id: 1,
        result: { protocolVersion: '2024-11-05', capabilities: {}, serverInfo: { name: 'srv', version: '1' } },
      },
    });
    const results = validateJsonRpcEnvelope(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'JSONRPC-001' && r.details?.['label'] === 'initialize');
    expect(check?.level).toBe('failure');
  });

  it('fails JSONRPC-003 when both result and error are present', () => {
    const exchange = makeMinimalExchange({
      initializeResponse: {
        jsonrpc: '2.0',
        id: 1,
        result: { protocolVersion: '2024-11-05' },
        error: { code: -32600, message: 'Invalid Request' },
      },
    });
    const results = validateJsonRpcEnvelope(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'JSONRPC-003' && r.details?.['label'] === 'initialize');
    expect(check?.level).toBe('failure');
    expect(check?.description).toContain('mutually exclusive');
  });

  it('fails JSONRPC-003 when neither result nor error is present', () => {
    // Build a response with no result/error by bypassing the type
    const bareResponse = { jsonrpc: '2.0', id: 1 } as any;
    const exchange = makeMinimalExchange({ initializeResponse: bareResponse });
    const results = validateJsonRpcEnvelope(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'JSONRPC-003' && r.details?.['label'] === 'initialize');
    expect(check?.level).toBe('failure');
    expect(check?.description).toContain('neither');
  });

  it('allows null id on error-probe responses (parse error scenario)', () => {
    const exchange = makeMinimalExchange({
      malformedJsonProbeResponse: {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error' },
      },
    });
    const results = validateJsonRpcEnvelope(exchange, makeConfig());
    const check = results.find(
      (r) => r.checkId === 'JSONRPC-002' && r.details?.['label'] === 'error-probe-malformed',
    );
    expect(check?.level).toBe('pass');
  });

  it('fails JSONRPC-002 when id is null on a non-probe response', () => {
    const exchange = makeMinimalExchange({
      initializeResponse: {
        jsonrpc: '2.0',
        id: null,
        result: { protocolVersion: '2024-11-05', capabilities: {}, serverInfo: { name: 'srv', version: '1' } },
      },
    });
    const results = validateJsonRpcEnvelope(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'JSONRPC-002' && r.details?.['label'] === 'initialize');
    expect(check?.level).toBe('failure');
  });

  it('validates all labelled responses — includes tools/list entries', () => {
    const exchange = makeMinimalExchange({
      toolsListResponses: [
        { jsonrpc: '2.0', id: 2, result: { tools: [] } },
      ],
    });
    const results = validateJsonRpcEnvelope(exchange, makeConfig());
    const toolsCheck = results.find(
      (r) => r.checkId === 'JSONRPC-001' && r.details?.['label'] === 'tools/list[0]',
    );
    expect(toolsCheck).toBeDefined();
    expect(toolsCheck?.level).toBe('pass');
  });

  it('emits JSONRPC-004 pass when there is no error object (result response)', () => {
    const exchange = makeMinimalExchange();
    const results = validateJsonRpcEnvelope(exchange, makeConfig());
    const check = results.find(
      (r) => r.checkId === 'JSONRPC-004' && r.details?.['label'] === 'initialize',
    );
    expect(check).toBeDefined();
    expect(check?.level).toBe('pass');
  });

  it('emits JSONRPC-004 failure for a positive error code', () => {
    const exchange = makeMinimalExchange({
      unknownMethodProbeResponse: {
        jsonrpc: '2.0',
        id: 99,
        error: { code: 404, message: 'Not found' },
      },
    });
    const results = validateJsonRpcEnvelope(exchange, makeConfig());
    const check = results.find(
      (r) => r.checkId === 'JSONRPC-004' && r.details?.['label'] === 'error-probe-unknown',
    );
    expect(check?.level).toBe('failure');
  });

  it('emits JSONRPC-004 warning for a reserved error code', () => {
    const exchange = makeMinimalExchange({
      unknownMethodProbeResponse: {
        jsonrpc: '2.0',
        id: 99,
        error: { code: -32650, message: 'Reserved range' }, // -32699 to -32604 is reserved
      },
    });
    const results = validateJsonRpcEnvelope(exchange, makeConfig());
    const check = results.find(
      (r) => r.checkId === 'JSONRPC-004' && r.details?.['label'] === 'error-probe-unknown',
    );
    expect(check?.level).toBe('warning');
  });

  it('emits JSONRPC-005 failure when error.message is not a string', () => {
    const response = {
      jsonrpc: '2.0',
      id: 99,
      error: { code: -32601, message: 42 as unknown as string },
    };
    const exchange = makeMinimalExchange({
      unknownMethodProbeResponse: response,
    });
    const results = validateJsonRpcEnvelope(exchange, makeConfig());
    const check = results.find(
      (r) => r.checkId === 'JSONRPC-005' && r.details?.['label'] === 'error-probe-unknown',
    );
    expect(check?.level).toBe('failure');
  });

  it('all checks belong to jsonrpc-base category', () => {
    const exchange = makeMinimalExchange();
    const results = validateJsonRpcEnvelope(exchange, makeConfig());
    for (const r of results) {
      expect(r.category).toBe('jsonrpc-base');
    }
  });
});
