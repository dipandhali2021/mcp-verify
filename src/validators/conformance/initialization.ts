/**
 * S-1-18: Initialization conformance validator
 * S-1-19: Capability negotiation validator
 *
 * Checks the initialize handshake for protocol version, capabilities,
 * serverInfo presence, and cross-validates declared capabilities against
 * actual protocol responses.
 */
import type { ProtocolExchangeRecord } from '../../types/protocol.js';
import type { VerificationConfig } from '../../types/config.js';
import type { CheckResult } from '../../types/conformance.js';
import type { MCPCapabilities } from '../../types/server.js';

const SPEC_VERSION = '2024-11-05';

// ---------------------------------------------------------------------------
// Helper: extract initialize result payload
// ---------------------------------------------------------------------------

function getInitResult(exchange: ProtocolExchangeRecord): Record<string, unknown> | null {
  const resp = exchange.initializeResponse;
  if (resp === null) return null;
  if (!('result' in resp) || resp.result === null || typeof resp.result !== 'object') {
    return null;
  }
  return resp.result as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// S-1-18: Initialization checks
// ---------------------------------------------------------------------------

function checkProtocolVersion(
  initResult: Record<string, unknown> | null,
  results: CheckResult[],
): void {
  if (initResult === null) {
    results.push({
      checkId: 'INIT-001',
      name: 'Initialize response present',
      category: 'initialization',
      level: 'failure',
      description: 'No initialize response was received — cannot validate initialization handshake',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §3.1 (Initialization)',
      confidence: 'deterministic',
    });
    return;
  }

  results.push({
    checkId: 'INIT-001',
    name: 'Initialize response present',
    category: 'initialization',
    level: 'pass',
    description: 'Initialize response was received from the server',
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §3.1 (Initialization)',
    confidence: 'deterministic',
  });

  // INIT-002: protocolVersion must be present and a string
  const protocolVersion = initResult['protocolVersion'];
  const hasProtocolVersion =
    protocolVersion !== undefined && protocolVersion !== null && typeof protocolVersion === 'string';
  const isNonEmpty = hasProtocolVersion && (protocolVersion as string).length > 0;

  results.push({
    checkId: 'INIT-002',
    name: 'protocolVersion field',
    category: 'initialization',
    level: hasProtocolVersion && isNonEmpty ? 'pass' : 'failure',
    description:
      hasProtocolVersion && isNonEmpty
        ? `protocolVersion is present and valid: "${protocolVersion as string}"`
        : !hasProtocolVersion
          ? 'protocolVersion field is absent or not a string in the initialize response'
          : 'protocolVersion field is an empty string',
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §3.1 (Initialization)',
    confidence: 'deterministic',
    field: 'result.protocolVersion',
    details: { protocolVersion },
  });
}

function checkCapabilities(
  initResult: Record<string, unknown> | null,
  results: CheckResult[],
): MCPCapabilities | null {
  if (initResult === null) return null;

  const caps = initResult['capabilities'];

  // INIT-003: capabilities object must be present
  const hasCaps = caps !== undefined && caps !== null && typeof caps === 'object' && !Array.isArray(caps);

  results.push({
    checkId: 'INIT-003',
    name: 'capabilities object present',
    category: 'initialization',
    level: hasCaps ? 'pass' : 'failure',
    description: hasCaps
      ? 'capabilities object is present in the initialize response'
      : 'capabilities object is absent or not an object in the initialize response',
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §3.1 (Initialization)',
    confidence: 'deterministic',
    field: 'result.capabilities',
  });

  if (!hasCaps) return null;

  const capObj = caps as MCPCapabilities;

  // INIT-004: capabilities must be a plain object (not array)
  results.push({
    checkId: 'INIT-004',
    name: 'capabilities structure',
    category: 'initialization',
    level: 'pass',
    description: 'capabilities is a valid object (not an array)',
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §3.1 (Initialization)',
    confidence: 'deterministic',
    field: 'result.capabilities',
  });

  return capObj;
}

function checkServerInfo(
  initResult: Record<string, unknown> | null,
  exchange: ProtocolExchangeRecord,
  results: CheckResult[],
): void {
  // INIT-005: serverInfo warning if absent
  const serverInfoFromResult = initResult !== null ? initResult['serverInfo'] : undefined;
  const serverInfoFromExchange = exchange.serverInfo;

  const hasServerInfo =
    (serverInfoFromResult !== undefined && serverInfoFromResult !== null) ||
    serverInfoFromExchange !== null;

  results.push({
    checkId: 'INIT-005',
    name: 'serverInfo presence',
    category: 'initialization',
    level: hasServerInfo ? 'pass' : 'warning',
    description: hasServerInfo
      ? 'serverInfo object is present in the initialize response'
      : 'serverInfo object is absent from the initialize response — recommended for identification',
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §3.1 (Initialization)',
    confidence: 'deterministic',
    field: 'result.serverInfo',
  });

  if (!hasServerInfo) return;

  // INIT-006: serverInfo.name must be present
  const infoObj = (serverInfoFromResult as Record<string, unknown> | null | undefined) ??
    (serverInfoFromExchange as Record<string, unknown> | null);

  if (infoObj === null || typeof infoObj !== 'object') {
    results.push({
      checkId: 'INIT-006',
      name: 'serverInfo.name field',
      category: 'initialization',
      level: 'warning',
      description: 'serverInfo is not a valid object — cannot validate name field',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §3.1 (Initialization)',
      confidence: 'deterministic',
      field: 'result.serverInfo.name',
    });
    return;
  }

  const name = (infoObj as Record<string, unknown>)['name'];
  const hasName = typeof name === 'string' && name.length > 0;

  results.push({
    checkId: 'INIT-006',
    name: 'serverInfo.name field',
    category: 'initialization',
    level: hasName ? 'pass' : 'warning',
    description: hasName
      ? `serverInfo.name is present: "${name as string}"`
      : 'serverInfo.name is absent or empty — recommended for server identification',
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §3.1 (Initialization)',
    confidence: 'deterministic',
    field: 'result.serverInfo.name',
    details: { name },
  });
}

function checkInitializedFlag(
  exchange: ProtocolExchangeRecord,
  results: CheckResult[],
): void {
  // INIT-007: initializedSent flag cross-check
  results.push({
    checkId: 'INIT-007',
    name: 'initialized notification sent',
    category: 'initialization',
    level: exchange.initializedSent ? 'pass' : 'warning',
    description: exchange.initializedSent
      ? 'The initialized notification was sent after the initialize response'
      : 'The initialized notification was not sent — the server may not consider the session active',
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §3.1 (Initialization)',
    confidence: 'deterministic',
    details: { initializedSent: exchange.initializedSent },
  });
}

// ---------------------------------------------------------------------------
// S-1-19: Capability negotiation checks
// ---------------------------------------------------------------------------

function checkCapabilityNegotiation(
  caps: MCPCapabilities | null,
  exchange: ProtocolExchangeRecord,
  results: CheckResult[],
): void {
  if (caps === null) {
    results.push({
      checkId: 'INIT-008',
      name: 'Capability negotiation cross-check',
      category: 'initialization',
      level: 'info',
      description: 'Cannot cross-check capability negotiation — capabilities object was not available',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §3.1 (Capability Negotiation)',
      confidence: 'deterministic',
    });
    return;
  }

  // INIT-008: tools capability declared → tools/list must not error
  const toolsDeclared = 'tools' in caps && caps['tools'] !== undefined;
  const toolsListResponses = exchange.toolsListResponses;
  const toolsListFailed =
    toolsListResponses.length === 0 ||
    toolsListResponses.every(
      (r) => 'error' in r && r.error !== undefined,
    );

  if (toolsDeclared && toolsListFailed) {
    results.push({
      checkId: 'INIT-008',
      name: 'tools capability vs tools/list response',
      category: 'initialization',
      level: 'failure',
      description:
        'Server declared tools capability but tools/list returned an error or no response',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §3.1 (Capability Negotiation)',
      confidence: 'deterministic',
      details: { toolsDeclared, toolsListResponseCount: toolsListResponses.length },
    });
  } else {
    results.push({
      checkId: 'INIT-008',
      name: 'tools capability vs tools/list response',
      category: 'initialization',
      level: 'pass',
      description: toolsDeclared
        ? 'Server declared tools capability and tools/list responded successfully'
        : 'Server did not declare tools capability — tools/list check not required',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §3.1 (Capability Negotiation)',
      confidence: 'deterministic',
      details: { toolsDeclared },
    });
  }

  // INIT-009: resources capability declared → resources/list must not error
  const resourcesDeclared = 'resources' in caps && caps['resources'] !== undefined;
  const resourcesListResp = exchange.resourcesListResponse;
  const resourcesListFailed =
    resourcesDeclared &&
    (resourcesListResp === null ||
      ('error' in resourcesListResp && resourcesListResp.error !== undefined));

  if (resourcesDeclared && resourcesListFailed) {
    results.push({
      checkId: 'INIT-009',
      name: 'resources capability vs resources/list response',
      category: 'initialization',
      level: 'failure',
      description:
        'Server declared resources capability but resources/list returned an error or no response',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §3.1 (Capability Negotiation)',
      confidence: 'deterministic',
      details: { resourcesDeclared },
    });
  } else {
    results.push({
      checkId: 'INIT-009',
      name: 'resources capability vs resources/list response',
      category: 'initialization',
      level: 'pass',
      description: resourcesDeclared
        ? 'Server declared resources capability and resources/list responded successfully'
        : 'Server did not declare resources capability — resources/list check not required',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §3.1 (Capability Negotiation)',
      confidence: 'deterministic',
      details: { resourcesDeclared },
    });
  }

  // INIT-010: prompts capability declared → prompts/list must not error
  const promptsDeclared = 'prompts' in caps && caps['prompts'] !== undefined;
  const promptsListResp = exchange.promptsListResponse;
  const promptsListFailed =
    promptsDeclared &&
    (promptsListResp === null ||
      ('error' in promptsListResp && promptsListResp.error !== undefined));

  if (promptsDeclared && promptsListFailed) {
    results.push({
      checkId: 'INIT-010',
      name: 'prompts capability vs prompts/list response',
      category: 'initialization',
      level: 'failure',
      description:
        'Server declared prompts capability but prompts/list returned an error or no response',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §3.1 (Capability Negotiation)',
      confidence: 'deterministic',
      details: { promptsDeclared },
    });
  } else {
    results.push({
      checkId: 'INIT-010',
      name: 'prompts capability vs prompts/list response',
      category: 'initialization',
      level: 'pass',
      description: promptsDeclared
        ? 'Server declared prompts capability and prompts/list responded successfully'
        : 'Server did not declare prompts capability — prompts/list check not required',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §3.1 (Capability Negotiation)',
      confidence: 'deterministic',
      details: { promptsDeclared },
    });
  }

  // INIT-011: Flag undeclared capabilities responding successfully
  // If tools NOT declared but tools/list returns a successful result → flag
  const toolsListHasSuccess = toolsListResponses.some(
    (r) => 'result' in r && r.result !== undefined,
  );
  if (!toolsDeclared && toolsListHasSuccess) {
    results.push({
      checkId: 'INIT-011',
      name: 'Undeclared tools capability responds',
      category: 'initialization',
      level: 'warning',
      description:
        'Server did not declare tools capability but tools/list returned a successful response — capability advertisement is inconsistent',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §3.1 (Capability Negotiation)',
      confidence: 'high',
      details: { toolsDeclared },
    });
  }

  const resourcesListHasSuccess =
    resourcesListResp !== null &&
    'result' in resourcesListResp &&
    resourcesListResp.result !== undefined;
  if (!resourcesDeclared && resourcesListHasSuccess) {
    results.push({
      checkId: 'INIT-012',
      name: 'Undeclared resources capability responds',
      category: 'initialization',
      level: 'warning',
      description:
        'Server did not declare resources capability but resources/list returned a successful response — capability advertisement is inconsistent',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §3.1 (Capability Negotiation)',
      confidence: 'high',
      details: { resourcesDeclared },
    });
  }

  const promptsListHasSuccess =
    promptsListResp !== null &&
    'result' in promptsListResp &&
    promptsListResp.result !== undefined;
  if (!promptsDeclared && promptsListHasSuccess) {
    results.push({
      checkId: 'INIT-013',
      name: 'Undeclared prompts capability responds',
      category: 'initialization',
      level: 'warning',
      description:
        'Server did not declare prompts capability but prompts/list returned a successful response — capability advertisement is inconsistent',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §3.1 (Capability Negotiation)',
      confidence: 'high',
      details: { promptsDeclared },
    });
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function validateInitialization(
  exchange: ProtocolExchangeRecord,
  _config: VerificationConfig,
): CheckResult[] {
  const results: CheckResult[] = [];

  const initResult = getInitResult(exchange);

  checkProtocolVersion(initResult, results);
  const caps = checkCapabilities(initResult, results);
  checkServerInfo(initResult, exchange, results);
  checkInitializedFlag(exchange, results);
  checkCapabilityNegotiation(caps, exchange, results);

  return results;
}
