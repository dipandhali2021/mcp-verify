import { describe, it, expect } from 'vitest';
import { validateInitialization } from '../../src/validators/conformance/initialization.js';
import type { ProtocolExchangeRecord } from '../../src/types/protocol.js';
import type { VerificationConfig } from '../../src/types/config.js';
import { DEFAULT_CONFIG } from '../../src/types/config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(): VerificationConfig {
  return { ...DEFAULT_CONFIG, target: 'stdio://test' };
}

function makeFullExchange(
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
    toolsListResponses: [{ jsonrpc: '2.0', id: 2, result: { tools: [] } }],
    tools: [],
    resourcesListResponse: { jsonrpc: '2.0', id: 3, result: { resources: [] } },
    resources: [],
    resourceReadResponse: null,
    promptsListResponse: { jsonrpc: '2.0', id: 5, result: { prompts: [] } },
    prompts: [],
    unknownMethodProbeResponse: { jsonrpc: '2.0', id: 6, error: { code: -32601, message: 'Method not found' } },
    malformedJsonProbeResponse: { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
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
      'resources/read': { status: 'skipped', durationMs: 0 },
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

describe('validateInitialization', () => {
  it('passes all initialization checks for a fully conformant exchange', () => {
    const exchange = makeFullExchange();
    const results = validateInitialization(exchange, makeConfig());
    const failures = results.filter((r) => r.level === 'failure');
    expect(failures).toHaveLength(0);
  });

  it('emits INIT-001 failure when initializeResponse is null', () => {
    const exchange = makeFullExchange({ initializeResponse: null });
    const results = validateInitialization(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'INIT-001');
    expect(check?.level).toBe('failure');
    // When INIT-001 fails, we should get no INIT-002 check (early return)
    const init002 = results.find((r) => r.checkId === 'INIT-002');
    expect(init002).toBeUndefined();
  });

  it('passes INIT-001 when a valid initializeResponse is present', () => {
    const exchange = makeFullExchange();
    const results = validateInitialization(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'INIT-001');
    expect(check?.level).toBe('pass');
  });

  it('fails INIT-002 when protocolVersion is absent', () => {
    const exchange = makeFullExchange({
      initializeResponse: {
        jsonrpc: '2.0',
        id: 1,
        result: {
          // protocolVersion intentionally omitted
          capabilities: { tools: {}, resources: {}, prompts: {} },
          serverInfo: { name: 'srv', version: '1' },
        },
      },
    });
    const results = validateInitialization(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'INIT-002');
    expect(check?.level).toBe('failure');
  });

  it('fails INIT-002 when protocolVersion is an empty string', () => {
    const exchange = makeFullExchange({
      initializeResponse: {
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '',
          capabilities: {},
          serverInfo: { name: 'srv', version: '1' },
        },
      },
    });
    const results = validateInitialization(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'INIT-002');
    expect(check?.level).toBe('failure');
  });

  it('passes INIT-002 for a valid protocolVersion string', () => {
    const exchange = makeFullExchange();
    const results = validateInitialization(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'INIT-002');
    expect(check?.level).toBe('pass');
  });

  it('fails INIT-003 when capabilities object is absent', () => {
    const exchange = makeFullExchange({
      initializeResponse: {
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2024-11-05',
          // capabilities intentionally omitted
          serverInfo: { name: 'srv', version: '1' },
        },
      },
    });
    const results = validateInitialization(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'INIT-003');
    expect(check?.level).toBe('failure');
  });

  it('warns INIT-005 when serverInfo is missing from both response and exchange', () => {
    const exchange = makeFullExchange({
      serverInfo: null,
      initializeResponse: {
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          // serverInfo intentionally omitted
        },
      },
    });
    const results = validateInitialization(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'INIT-005');
    expect(check?.level).toBe('warning');
  });

  it('passes INIT-005 when serverInfo is present', () => {
    const exchange = makeFullExchange();
    const results = validateInitialization(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'INIT-005');
    expect(check?.level).toBe('pass');
  });

  it('warns INIT-007 when initializedSent is false', () => {
    const exchange = makeFullExchange({ initializedSent: false });
    const results = validateInitialization(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'INIT-007');
    expect(check?.level).toBe('warning');
  });

  it('passes INIT-007 when initializedSent is true', () => {
    const exchange = makeFullExchange({ initializedSent: true });
    const results = validateInitialization(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'INIT-007');
    expect(check?.level).toBe('pass');
  });

  it('fails INIT-008 when tools capability declared but tools/list errored', () => {
    const exchange = makeFullExchange({
      toolsListResponses: [
        { jsonrpc: '2.0', id: 2, error: { code: -32601, message: 'Method not found' } },
      ],
    });
    const results = validateInitialization(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'INIT-008');
    expect(check?.level).toBe('failure');
  });

  it('passes INIT-008 when tools capability declared and tools/list succeeded', () => {
    const exchange = makeFullExchange();
    const results = validateInitialization(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'INIT-008');
    expect(check?.level).toBe('pass');
  });

  it('all initialization checks belong to initialization category', () => {
    const exchange = makeFullExchange();
    const results = validateInitialization(exchange, makeConfig());
    for (const r of results) {
      expect(r.category).toBe('initialization');
    }
  });
});
