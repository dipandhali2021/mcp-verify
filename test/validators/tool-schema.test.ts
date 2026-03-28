import { describe, it, expect } from 'vitest';
import { validateToolSchema } from '../../src/validators/conformance/tool-schema.js';
import type { ProtocolExchangeRecord } from '../../src/types/protocol.js';
import type { VerificationConfig } from '../../src/types/config.js';
import { DEFAULT_CONFIG } from '../../src/types/config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(): VerificationConfig {
  return { ...DEFAULT_CONFIG, target: 'stdio://test' };
}

function makeExchangeWithTools(tools: unknown[]): ProtocolExchangeRecord {
  return {
    initializeRequest: { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    initializeResponse: {
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'test-server', version: '1.0.0' },
      },
    },
    initializedSent: true,
    serverInfo: { name: 'test-server', version: '1.0.0' },
    toolsListResponses: [{ jsonrpc: '2.0', id: 2, result: { tools } }],
    tools,
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
      'resources/list': { status: 'skipped', durationMs: 0 },
      'resources/read': { status: 'skipped', durationMs: 0 },
      'prompts/list': { status: 'skipped', durationMs: 0 },
      'error-probe-unknown': { status: 'skipped', durationMs: 0 },
      'error-probe-malformed': { status: 'skipped', durationMs: 0 },
    },
  };
}

const VALID_TOOL = {
  name: 'echo',
  description: 'Echoes the input back',
  inputSchema: {
    type: 'object',
    properties: {
      message: { type: 'string', description: 'The message' },
    },
    required: ['message'],
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateToolSchema', () => {
  it('passes all checks for a valid tool with complete schema', () => {
    const exchange = makeExchangeWithTools([VALID_TOOL]);
    const results = validateToolSchema(exchange, makeConfig());
    const failures = results.filter((r) => r.level === 'failure');
    const warnings = results.filter((r) => r.level === 'warning');
    expect(failures).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it('emits TOOL-000 pass when tools are present', () => {
    const exchange = makeExchangeWithTools([VALID_TOOL]);
    const results = validateToolSchema(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'TOOL-000');
    expect(check?.level).toBe('pass');
  });

  it('emits TOOL-000 warning when tools capability declared but no tools returned', () => {
    const exchange = makeExchangeWithTools([]);
    const results = validateToolSchema(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'TOOL-000');
    expect(check?.level).toBe('warning');
  });

  it('fails TOOL-001 when tool name is missing', () => {
    const toolWithoutName = {
      // name intentionally omitted
      description: 'A tool without a name',
      inputSchema: { type: 'object', properties: {} },
    };
    const exchange = makeExchangeWithTools([toolWithoutName]);
    const results = validateToolSchema(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'TOOL-001');
    expect(check?.level).toBe('failure');
  });

  it('fails TOOL-001 when tool name is an empty string', () => {
    const toolWithEmptyName = {
      name: '   ', // whitespace only — isNonEmptyString trims
      description: 'A tool with empty name',
      inputSchema: { type: 'object', properties: {} },
    };
    const exchange = makeExchangeWithTools([toolWithEmptyName]);
    const results = validateToolSchema(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'TOOL-001');
    expect(check?.level).toBe('failure');
  });

  it('warns TOOL-002 when description is absent', () => {
    const toolWithoutDescription = {
      name: 'no-description',
      // description intentionally omitted
      inputSchema: { type: 'object', properties: {} },
    };
    const exchange = makeExchangeWithTools([toolWithoutDescription]);
    const results = validateToolSchema(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'TOOL-002');
    expect(check?.level).toBe('warning');
  });

  it('passes TOOL-002 when description is present', () => {
    const exchange = makeExchangeWithTools([VALID_TOOL]);
    const results = validateToolSchema(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'TOOL-002');
    expect(check?.level).toBe('pass');
  });

  it('fails TOOL-003 when inputSchema is missing', () => {
    const toolWithoutSchema = {
      name: 'no-schema',
      description: 'Tool missing inputSchema',
      // inputSchema intentionally omitted
    };
    const exchange = makeExchangeWithTools([toolWithoutSchema]);
    const results = validateToolSchema(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'TOOL-003');
    expect(check?.level).toBe('failure');
  });

  it('fails TOOL-004 when inputSchema.type is not "object"', () => {
    const toolWithWrongType = {
      name: 'bad-type',
      description: 'Tool with wrong inputSchema type',
      inputSchema: {
        type: 'string', // must be "object"
      },
    };
    const exchange = makeExchangeWithTools([toolWithWrongType]);
    const results = validateToolSchema(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'TOOL-004');
    expect(check?.level).toBe('failure');
  });

  it('fails TOOL-004 when inputSchema.type is absent', () => {
    const toolWithNoType = {
      name: 'no-type',
      description: 'Tool with inputSchema missing type',
      inputSchema: {
        // type intentionally omitted
        properties: { x: { type: 'string' } },
      },
    };
    const exchange = makeExchangeWithTools([toolWithNoType]);
    const results = validateToolSchema(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'TOOL-004');
    expect(check?.level).toBe('failure');
  });

  it('passes TOOL-004 when inputSchema.type is "object"', () => {
    const exchange = makeExchangeWithTools([VALID_TOOL]);
    const results = validateToolSchema(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'TOOL-004');
    expect(check?.level).toBe('pass');
  });

  it('fails TOOL-006 when required references an undefined property', () => {
    const toolWithBadRequired = {
      name: 'bad-required',
      description: 'Tool with required referencing undeclared property',
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
        required: ['message', 'undeclared_field'],
      },
    };
    const exchange = makeExchangeWithTools([toolWithBadRequired]);
    const results = validateToolSchema(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'TOOL-006');
    expect(check?.level).toBe('failure');
    expect(check?.description).toContain('undeclared_field');
  });

  it('passes TOOL-006 when required only references defined properties', () => {
    const exchange = makeExchangeWithTools([VALID_TOOL]);
    const results = validateToolSchema(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'TOOL-006');
    expect(check?.level).toBe('pass');
  });

  it('passes TOOL-007 structural check for a valid schema', () => {
    const exchange = makeExchangeWithTools([VALID_TOOL]);
    const results = validateToolSchema(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'TOOL-007');
    expect(check?.level).toBe('pass');
  });

  it('warns TOOL-007 for an unknown JSON Schema type value', () => {
    const toolWithUnknownType = {
      name: 'bad-schema-type',
      description: 'Tool with unknown property type in schema',
      inputSchema: {
        type: 'object',
        properties: {
          x: { type: 'unicorn' }, // not a valid JSON Schema type
        },
      },
    };
    const exchange = makeExchangeWithTools([toolWithUnknownType]);
    const results = validateToolSchema(exchange, makeConfig());
    const check = results.find((r) => r.checkId === 'TOOL-007');
    expect(check?.level).toBe('warning');
  });

  it('all tool checks belong to tools category', () => {
    const exchange = makeExchangeWithTools([VALID_TOOL]);
    const results = validateToolSchema(exchange, makeConfig());
    for (const r of results) {
      expect(r.category).toBe('tools');
    }
  });

  it('validates multiple tools independently', () => {
    const tools = [
      VALID_TOOL,
      { name: 'second', description: 'Second tool', inputSchema: { type: 'object', properties: {} } },
    ];
    const exchange = makeExchangeWithTools(tools);
    const results = validateToolSchema(exchange, makeConfig());
    // TOOL-000 (pass) + at least TOOL-001/002/003/004/007 for each of 2 tools
    expect(results.length).toBeGreaterThan(8);
  });
});
