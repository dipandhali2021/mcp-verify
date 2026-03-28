/**
 * S-1-16: JSON-RPC 2.0 envelope validator
 * S-1-17: JSON-RPC error code validator
 *
 * Checks every JSON-RPC response in the exchange record for envelope
 * conformance and valid error codes.
 */
import type { ProtocolExchangeRecord } from '../../types/protocol.js';
import type { VerificationConfig } from '../../types/config.js';
import type { CheckResult } from '../../types/conformance.js';
import type { JsonRpcResponse } from '../../types/jsonrpc.js';

// ---------------------------------------------------------------------------
// Standard JSON-RPC 2.0 error code ranges
// ---------------------------------------------------------------------------

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

const STANDARD_ERROR_CODES = new Set([
  PARSE_ERROR,
  INVALID_REQUEST,
  METHOD_NOT_FOUND,
  INVALID_PARAMS,
  INTERNAL_ERROR,
]);

function isStandardErrorCode(code: number): boolean {
  return STANDARD_ERROR_CODES.has(code);
}

function isServerDefinedCode(code: number): boolean {
  return code >= -32099 && code <= -32000;
}

function isReservedCode(code: number): boolean {
  // -32099 to -32000 is server-defined range
  // -32603 to -32100 is reserved (currently unassigned)
  return code >= -32699 && code <= -32604;
}

function isValidErrorCode(code: number): boolean {
  return isStandardErrorCode(code) || isServerDefinedCode(code);
}

// ---------------------------------------------------------------------------
// Collect all responses from the exchange record
// ---------------------------------------------------------------------------

interface LabelledResponse {
  response: JsonRpcResponse;
  label: string;
}

function collectAllResponses(exchange: ProtocolExchangeRecord): LabelledResponse[] {
  const labelled: LabelledResponse[] = [];

  if (exchange.initializeResponse !== null) {
    labelled.push({ response: exchange.initializeResponse, label: 'initialize' });
  }

  for (let i = 0; i < exchange.toolsListResponses.length; i++) {
    const r = exchange.toolsListResponses[i];
    if (r !== undefined) {
      labelled.push({ response: r, label: `tools/list[${i}]` });
    }
  }

  if (exchange.resourcesListResponse !== null) {
    labelled.push({ response: exchange.resourcesListResponse, label: 'resources/list' });
  }

  if (exchange.resourceReadResponse !== null) {
    labelled.push({ response: exchange.resourceReadResponse, label: 'resources/read' });
  }

  if (exchange.promptsListResponse !== null) {
    labelled.push({ response: exchange.promptsListResponse, label: 'prompts/list' });
  }

  if (exchange.unknownMethodProbeResponse !== null) {
    labelled.push({
      response: exchange.unknownMethodProbeResponse,
      label: 'error-probe-unknown',
    });
  }

  if (exchange.malformedJsonProbeResponse !== null) {
    labelled.push({
      response: exchange.malformedJsonProbeResponse,
      label: 'error-probe-malformed',
    });
  }

  return labelled;
}

// ---------------------------------------------------------------------------
// S-1-16: Envelope checks per response
// ---------------------------------------------------------------------------

function checkEnvelope(
  item: LabelledResponse,
  results: CheckResult[],
): void {
  const { response, label } = item;
  const msgId = response.id ?? undefined;

  // JSONRPC-001: jsonrpc field must be "2.0"
  const hasCorrectVersion = response.jsonrpc === '2.0';
  results.push({
    checkId: 'JSONRPC-001',
    name: 'JSON-RPC version field',
    category: 'jsonrpc-base',
    level: hasCorrectVersion ? 'pass' : 'failure',
    description: hasCorrectVersion
      ? `Response for "${label}" has jsonrpc: "2.0"`
      : `Response for "${label}" has incorrect or missing jsonrpc field (got: ${JSON.stringify(response.jsonrpc)})`,
    specVersion: '2024-11-05',
    specReference: 'JSON-RPC 2.0 §4',
    confidence: 'deterministic',
    messageId: msgId,
    field: 'jsonrpc',
    details: { label },
  });

  // JSONRPC-002: id field must be string or number on responses (not null)
  const id = response.id;
  const isProbeResponse =
    label === 'error-probe-unknown' || label === 'error-probe-malformed';

  // For error responses the id may legitimately be null when the request id
  // could not be determined (e.g. parse error).  For all other responses it
  // must be a string or number.
  const hasValidId =
    typeof id === 'string' || typeof id === 'number' || (isProbeResponse && id === null);

  results.push({
    checkId: 'JSONRPC-002',
    name: 'JSON-RPC id field type',
    category: 'jsonrpc-base',
    level: hasValidId ? 'pass' : 'failure',
    description: hasValidId
      ? `Response for "${label}" has a valid id field`
      : `Response for "${label}" has null or invalid id field (got: ${JSON.stringify(id)})`,
    specVersion: '2024-11-05',
    specReference: 'JSON-RPC 2.0 §4',
    confidence: 'deterministic',
    messageId: msgId,
    field: 'id',
    details: { label },
  });

  // JSONRPC-003: result and error are mutually exclusive
  const hasResult = 'result' in response;
  const hasError = 'error' in response;
  const hasBoth = hasResult && hasError;
  const hasNeither = !hasResult && !hasError;

  let exclusionLevel: CheckResult['level'] = 'pass';
  let exclusionDescription = `Response for "${label}" correctly has either result or error (not both)`;

  if (hasBoth) {
    exclusionLevel = 'failure';
    exclusionDescription = `Response for "${label}" contains both "result" and "error" fields — they are mutually exclusive per JSON-RPC 2.0`;
  } else if (hasNeither) {
    exclusionLevel = 'failure';
    exclusionDescription = `Response for "${label}" contains neither "result" nor "error" field — one is required per JSON-RPC 2.0`;
  }

  results.push({
    checkId: 'JSONRPC-003',
    name: 'JSON-RPC result/error mutual exclusion',
    category: 'jsonrpc-base',
    level: exclusionLevel,
    description: exclusionDescription,
    specVersion: '2024-11-05',
    specReference: 'JSON-RPC 2.0 §5',
    confidence: 'deterministic',
    messageId: msgId,
    details: { label, hasResult, hasError },
  });
}

// ---------------------------------------------------------------------------
// S-1-17: Error code checks per response
// ---------------------------------------------------------------------------

function checkErrorCodes(
  item: LabelledResponse,
  results: CheckResult[],
): void {
  const { response, label } = item;
  const msgId = response.id ?? undefined;

  if (!('error' in response) || response.error === undefined) {
    // No error object — emit a pass for error code validity (not applicable)
    results.push({
      checkId: 'JSONRPC-004',
      name: 'JSON-RPC error code validity',
      category: 'jsonrpc-base',
      level: 'pass',
      description: `Response for "${label}" has no error object — error code check not applicable`,
      specVersion: '2024-11-05',
      specReference: 'JSON-RPC 2.0 §5.1',
      confidence: 'deterministic',
      messageId: msgId,
      details: { label },
    });
    return;
  }

  const code = response.error.code;

  // JSONRPC-004: error code must be in valid range
  const isPositive = code > 0;
  const inStandardRange = isStandardErrorCode(code);
  const inServerRange = isServerDefinedCode(code);
  const inReservedRange = isReservedCode(code);
  const isValid = isValidErrorCode(code);

  let level: CheckResult['level'] = 'pass';
  let description = `Response for "${label}" has a valid error code ${code}`;

  if (isPositive) {
    level = 'failure';
    description = `Response for "${label}" has a positive error code ${code} — JSON-RPC error codes must be negative integers`;
  } else if (!isValid && !inReservedRange) {
    level = 'failure';
    description = `Response for "${label}" has error code ${code} which is outside all valid JSON-RPC ranges`;
  } else if (inReservedRange) {
    level = 'warning';
    description = `Response for "${label}" uses reserved error code ${code} (range -32699 to -32604 is currently unassigned)`;
  } else if (inStandardRange) {
    description = `Response for "${label}" uses standard error code ${code}`;
  } else if (inServerRange) {
    description = `Response for "${label}" uses server-defined error code ${code} (range -32099 to -32000)`;
  }

  results.push({
    checkId: 'JSONRPC-004',
    name: 'JSON-RPC error code validity',
    category: 'jsonrpc-base',
    level,
    description,
    specVersion: '2024-11-05',
    specReference: 'JSON-RPC 2.0 §5.1',
    confidence: 'deterministic',
    messageId: msgId,
    field: 'error.code',
    details: {
      label,
      code,
      isStandardRange: inStandardRange,
      isServerDefinedRange: inServerRange,
    },
  });

  // JSONRPC-005: error message must be a string
  const hasStringMessage = typeof response.error.message === 'string';
  results.push({
    checkId: 'JSONRPC-005',
    name: 'JSON-RPC error message type',
    category: 'jsonrpc-base',
    level: hasStringMessage ? 'pass' : 'failure',
    description: hasStringMessage
      ? `Response for "${label}" error object has a string message field`
      : `Response for "${label}" error object message field is not a string (got: ${typeof response.error.message})`,
    specVersion: '2024-11-05',
    specReference: 'JSON-RPC 2.0 §5.1',
    confidence: 'deterministic',
    messageId: msgId,
    field: 'error.message',
    details: { label },
  });
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function validateJsonRpcEnvelope(
  exchange: ProtocolExchangeRecord,
  _config: VerificationConfig,
): CheckResult[] {
  const results: CheckResult[] = [];
  const allResponses = collectAllResponses(exchange);

  if (allResponses.length === 0) {
    results.push({
      checkId: 'JSONRPC-000',
      name: 'JSON-RPC responses present',
      category: 'jsonrpc-base',
      level: 'failure',
      description: 'No JSON-RPC responses found in the exchange record — cannot validate envelope',
      specVersion: '2024-11-05',
      specReference: 'JSON-RPC 2.0 §4',
      confidence: 'deterministic',
    });
    return results;
  }

  for (const item of allResponses) {
    checkEnvelope(item, results);
    checkErrorCodes(item, results);
  }

  return results;
}
