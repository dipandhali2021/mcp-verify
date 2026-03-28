import type { JsonRpcRequest, JsonRpcResponse } from '../types/jsonrpc.js';
import type { ProtocolExchangeRecord, ProtocolStep, StepResult } from '../types/protocol.js';
import type { MCPServerInfo } from '../types/server.js';
import type { VerificationConfig } from '../types/config.js';
import type { Transport } from '../transport/types.js';
import {
  createInitializeRequest,
  createInitializedNotification,
  createToolsListRequest,
  createResourcesListRequest,
  createResourceReadRequest,
  createPromptsListRequest,
  createUnknownMethodProbe,
  MCP_PROTOCOL_VERSION,
} from './messages.js';
import { extractCapabilities, hasCapability } from './capabilities.js';

// ---------------------------------------------------------------------------
// Tool version — read from package.json at runtime
// We hard-code the version that matches package.json to keep the engine free
// of file-system reads at runtime.  This value is injected at build time or
// kept in sync manually.
// ---------------------------------------------------------------------------
const TOOL_VERSION = '0.2.0-alpha';

// Maximum number of tools we page through before stopping (safety cap)
const TOOLS_CAP = 500;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Execute the full MCP verification protocol against an already-connected
 * transport, recording every exchange in a `ProtocolExchangeRecord`.
 *
 * The engine is intentionally resilient: a failure at any step is captured as
 * a StepResult with status 'error' or 'timeout' and execution continues to the
 * next step.
 */
export async function executeProtocol(
  transport: Transport,
  config: VerificationConfig,
): Promise<ProtocolExchangeRecord> {
  const errors: ProtocolExchangeRecord['errors'] = [];
  const stepResults: Partial<Record<ProtocolStep, StepResult>> = {};

  // -------------------------------------------------------------------------
  // S-1-12: MCP initialization handshake
  // -------------------------------------------------------------------------

  const initRequest = createInitializeRequest(TOOL_VERSION);
  let initResponse: JsonRpcResponse | null = null;
  let serverInfo: MCPServerInfo | null = null;

  {
    const { result, stepResult } = await runStep(
      'initialize',
      () => transport.send(initRequest),
      config,
    );
    stepResults['initialize'] = stepResult;
    initResponse = result;

    if (result !== null) {
      serverInfo = extractServerInfo(result, MCP_PROTOCOL_VERSION);
    } else {
      errors.push({
        step: 'initialize',
        message: stepResult.error ?? 'initialize failed',
        code: stepResult.status === 'timeout' ? 'TIMEOUT' : 'ERROR',
      });
    }
  }

  // Send `initialized` notification regardless of whether initialization
  // succeeded — if the process is still alive we should close the handshake.
  let initializedSent = false;
  {
    const start = Date.now();
    try {
      await transport.notify(createInitializedNotification());
      initializedSent = true;
      stepResults['initialized'] = {
        status: 'completed',
        durationMs: Date.now() - start,
      };
    } catch (err) {
      stepResults['initialized'] = {
        status: 'error',
        durationMs: Date.now() - start,
        error: String(err),
      };
    }
  }

  // Derive capabilities from the init response (empty object if failed)
  const capabilities =
    initResponse !== null ? extractCapabilities(initResponse) : {};

  // -------------------------------------------------------------------------
  // S-1-13: Conditional capability exchanges
  // -------------------------------------------------------------------------

  // tools/list — with pagination cursor loop, 500-tool cap
  const toolsListResponses: JsonRpcResponse[] = [];
  const tools: unknown[] = [];

  if (hasCapability(capabilities, 'tools')) {
    let cursor: string | undefined;
    let pageCount = 0;
    let reachedCap = false;

    do {
      const req = createToolsListRequest(cursor);
      const { result, stepResult } = await runStep(
        'tools/list',
        () => transport.send(req),
        config,
      );

      // Record the first page's step result; subsequent pages do not overwrite
      if (pageCount === 0) {
        stepResults['tools/list'] = stepResult;
      }

      if (result === null || stepResult.status !== 'completed') {
        if (pageCount === 0) {
          errors.push({
            step: 'tools/list',
            message: stepResult.error ?? 'tools/list failed',
            code: stepResult.status === 'timeout' ? 'TIMEOUT' : 'ERROR',
          });
        }
        break;
      }

      toolsListResponses.push(result);

      // Extract tools array from result
      const pageTools = extractArray(result, 'tools');
      for (const tool of pageTools) {
        if (tools.length < TOOLS_CAP) {
          tools.push(tool);
        } else {
          reachedCap = true;
        }
      }

      // Check for next cursor
      const nextCursor = extractNextCursor(result);
      cursor = nextCursor;
      pageCount++;

      if (reachedCap) {
        break;
      }
    } while (cursor !== undefined);

    // If tools/list was not executed at all (hasCapability returned true but
    // no request was made), record skipped
    if (!Object.prototype.hasOwnProperty.call(stepResults, 'tools/list')) {
      stepResults['tools/list'] = { status: 'skipped', durationMs: 0 };
    }
  } else {
    stepResults['tools/list'] = { status: 'skipped', durationMs: 0 };
  }

  // resources/list
  let resourcesListResponse: JsonRpcResponse | null = null;
  const resources: unknown[] = [];

  if (hasCapability(capabilities, 'resources')) {
    const { result, stepResult } = await runStep(
      'resources/list',
      () => transport.send(createResourcesListRequest()),
      config,
    );
    stepResults['resources/list'] = stepResult;
    resourcesListResponse = result;

    if (result !== null && stepResult.status === 'completed') {
      const pageResources = extractArray(result, 'resources');
      for (const r of pageResources) {
        resources.push(r);
      }
    } else if (result === null) {
      errors.push({
        step: 'resources/list',
        message: stepResult.error ?? 'resources/list failed',
        code: stepResult.status === 'timeout' ? 'TIMEOUT' : 'ERROR',
      });
    }
  } else {
    stepResults['resources/list'] = { status: 'skipped', durationMs: 0 };
  }

  // resources/read — first resource only
  let resourceReadResponse: JsonRpcResponse | null = null;

  if (hasCapability(capabilities, 'resources') && resources.length > 0) {
    const firstResource = resources[0];
    const uri = extractUri(firstResource);

    if (uri !== null) {
      const { result, stepResult } = await runStep(
        'resources/read',
        () => transport.send(createResourceReadRequest(uri)),
        config,
      );
      stepResults['resources/read'] = stepResult;
      resourceReadResponse = result;

      if (result === null) {
        errors.push({
          step: 'resources/read',
          message: stepResult.error ?? 'resources/read failed',
          code: stepResult.status === 'timeout' ? 'TIMEOUT' : 'ERROR',
        });
      }
    } else {
      stepResults['resources/read'] = { status: 'skipped', durationMs: 0 };
    }
  } else {
    stepResults['resources/read'] = { status: 'skipped', durationMs: 0 };
  }

  // prompts/list
  let promptsListResponse: JsonRpcResponse | null = null;
  const prompts: unknown[] = [];

  if (hasCapability(capabilities, 'prompts')) {
    const { result, stepResult } = await runStep(
      'prompts/list',
      () => transport.send(createPromptsListRequest()),
      config,
    );
    stepResults['prompts/list'] = stepResult;
    promptsListResponse = result;

    if (result !== null && stepResult.status === 'completed') {
      const pagePrompts = extractArray(result, 'prompts');
      for (const p of pagePrompts) {
        prompts.push(p);
      }
    } else if (result === null) {
      errors.push({
        step: 'prompts/list',
        message: stepResult.error ?? 'prompts/list failed',
        code: stepResult.status === 'timeout' ? 'TIMEOUT' : 'ERROR',
      });
    }
  } else {
    stepResults['prompts/list'] = { status: 'skipped', durationMs: 0 };
  }

  // -------------------------------------------------------------------------
  // S-1-14: Error probes
  // -------------------------------------------------------------------------

  // Unknown method probe
  let unknownMethodProbeResponse: JsonRpcResponse | null = null;
  {
    const req: JsonRpcRequest = createUnknownMethodProbe();
    const { result, stepResult } = await runStep(
      'error-probe-unknown',
      () => transport.send(req),
      config,
    );
    stepResults['error-probe-unknown'] = stepResult;
    unknownMethodProbeResponse = result;
    // Note: receiving an error response here is actually the expected/correct
    // behaviour — we do not push to errors[] for this probe.
  }

  // Malformed JSON probe
  let malformedJsonProbeResponse: JsonRpcResponse | null = null;
  {
    const { result, stepResult } = await runStep(
      'error-probe-malformed',
      () => transport.sendRaw('{ invalid json %%%'),
      config,
    );
    stepResults['error-probe-malformed'] = stepResult;
    malformedJsonProbeResponse = result;
  }

  // -------------------------------------------------------------------------
  // Build and return the record
  // -------------------------------------------------------------------------

  // Fill any missing step results with 'skipped'
  const allSteps: ProtocolStep[] = [
    'initialize',
    'initialized',
    'tools/list',
    'resources/list',
    'resources/read',
    'prompts/list',
    'error-probe-unknown',
    'error-probe-malformed',
  ];

  for (const step of allSteps) {
    if (!Object.prototype.hasOwnProperty.call(stepResults, step)) {
      stepResults[step] = { status: 'skipped', durationMs: 0 };
    }
  }

  return {
    initializeRequest: initRequest,
    initializeResponse: initResponse,
    initializedSent,
    serverInfo,
    toolsListResponses,
    tools,
    resourcesListResponse,
    resources,
    resourceReadResponse,
    promptsListResponse,
    prompts,
    unknownMethodProbeResponse,
    malformedJsonProbeResponse,
    transportMetadata: transport.getMetadata(),
    errors,
    stepResults: stepResults as Record<ProtocolStep, StepResult>,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface StepRunResult<T> {
  result: T | null;
  stepResult: StepResult;
}

/**
 * Execute a single protocol step, capturing timing and translating thrown
 * errors into StepResult entries rather than propagating them.
 */
async function runStep<T>(
  _step: ProtocolStep,
  fn: () => Promise<T>,
  _config: VerificationConfig,
): Promise<StepRunResult<T>> {
  const start = Date.now();

  try {
    const result = await fn();
    return {
      result,
      stepResult: {
        status: 'completed',
        durationMs: Date.now() - start,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout =
      message.toLowerCase().includes('timeout') ||
      message.toLowerCase().includes('timed out');

    return {
      result: null,
      stepResult: {
        status: isTimeout ? 'timeout' : 'error',
        durationMs: Date.now() - start,
        error: message,
      },
    };
  }
}

/**
 * Extract `serverInfo` and `protocolVersion` from the initialize response.
 */
function extractServerInfo(
  response: JsonRpcResponse,
  fallbackProtocolVersion: string,
): MCPServerInfo | null {
  if (response.error !== undefined) {
    return null;
  }

  const result = response.result;
  if (typeof result !== 'object' || result === null) {
    return null;
  }

  const r = result as Record<string, unknown>;
  const serverInfoRaw = r['serverInfo'];
  const protocolVersion =
    typeof r['protocolVersion'] === 'string'
      ? r['protocolVersion']
      : fallbackProtocolVersion;

  if (typeof serverInfoRaw !== 'object' || serverInfoRaw === null) {
    // Server did not provide serverInfo — return a minimal record
    return { name: 'unknown', protocolVersion };
  }

  const si = serverInfoRaw as Record<string, unknown>;
  return {
    name: typeof si['name'] === 'string' ? si['name'] : 'unknown',
    version: typeof si['version'] === 'string' ? si['version'] : undefined,
    protocolVersion,
  };
}

/** Safely extract an array from a JSON-RPC result by field name. */
function extractArray(response: JsonRpcResponse, field: string): unknown[] {
  if (response.result === undefined || response.result === null) {
    return [];
  }
  if (typeof response.result !== 'object') {
    return [];
  }
  const r = response.result as Record<string, unknown>;
  const value = r[field];
  return Array.isArray(value) ? value : [];
}

/** Extract a pagination cursor from a JSON-RPC result. */
function extractNextCursor(response: JsonRpcResponse): string | undefined {
  if (response.result === undefined || response.result === null) {
    return undefined;
  }
  if (typeof response.result !== 'object') {
    return undefined;
  }
  const r = response.result as Record<string, unknown>;
  const cursor = r['nextCursor'];
  return typeof cursor === 'string' && cursor.length > 0 ? cursor : undefined;
}

/** Extract the URI string from an unknown resource object. */
function extractUri(resource: unknown): string | null {
  if (typeof resource !== 'object' || resource === null) {
    return null;
  }
  const r = resource as Record<string, unknown>;
  return typeof r['uri'] === 'string' ? r['uri'] : null;
}
