import type { JsonRpcRequest, JsonRpcNotification } from '../types/jsonrpc.js';

// Monotonically incrementing request counter — module-level so IDs are unique
// across the lifetime of the process, even when multiple protocol runs happen.
let _nextId = 1;

function nextId(): number {
  return _nextId++;
}

// MCP protocol version string
export const MCP_PROTOCOL_VERSION = '2024-11-05';

// ---------------------------------------------------------------------------
// Request constructors
// ---------------------------------------------------------------------------

/**
 * Build the MCP `initialize` request.
 *
 * @param version - the tool version string (e.g. from package.json)
 */
export function createInitializeRequest(version: string): JsonRpcRequest {
  return {
    jsonrpc: '2.0',
    id: nextId(),
    method: 'initialize',
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: 'mcp-verify',
        version,
      },
    },
  };
}

/** Build the MCP `initialized` notification (no id, no response expected). */
export function createInitializedNotification(): JsonRpcNotification {
  return {
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  };
}

/** Build a `tools/list` request, optionally with a pagination cursor. */
export function createToolsListRequest(cursor?: string): JsonRpcRequest {
  const params: Record<string, unknown> = {};
  if (cursor !== undefined) {
    params['cursor'] = cursor;
  }
  return {
    jsonrpc: '2.0',
    id: nextId(),
    method: 'tools/list',
    params,
  };
}

/** Build a `resources/list` request. */
export function createResourcesListRequest(): JsonRpcRequest {
  return {
    jsonrpc: '2.0',
    id: nextId(),
    method: 'resources/list',
    params: {},
  };
}

/** Build a `resources/read` request for the given resource URI. */
export function createResourceReadRequest(uri: string): JsonRpcRequest {
  return {
    jsonrpc: '2.0',
    id: nextId(),
    method: 'resources/read',
    params: { uri },
  };
}

/** Build a `prompts/list` request. */
export function createPromptsListRequest(): JsonRpcRequest {
  return {
    jsonrpc: '2.0',
    id: nextId(),
    method: 'prompts/list',
    params: {},
  };
}

/**
 * Build a request to an unknown (non-existent) MCP method.
 * Used to verify that the server returns a proper JSON-RPC error.
 */
export function createUnknownMethodProbe(): JsonRpcRequest {
  return {
    jsonrpc: '2.0',
    id: nextId(),
    method: 'mcp-verify/probe-unknown-method',
    params: {},
  };
}
