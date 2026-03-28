/**
 * S-1-23: Error handling conformance validator
 *
 * Validates:
 * - Unknown-method probe should return -32601 (Method Not Found)
 * - Malformed-JSON probe should return -32700 (Parse Error)
 * - Flags non-response and wrong error codes
 */
import type { ProtocolExchangeRecord } from '../../types/protocol.js';
import type { VerificationConfig } from '../../types/config.js';
import type { CheckResult } from '../../types/conformance.js';

const SPEC_VERSION = '2024-11-05';

const METHOD_NOT_FOUND = -32601;
const PARSE_ERROR = -32700;

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function validateErrorHandling(
  exchange: ProtocolExchangeRecord,
  _config: VerificationConfig,
): CheckResult[] {
  const results: CheckResult[] = [];

  // ERRH-001: Unknown-method probe — must return -32601 (Method Not Found)
  const unknownProbeResp = exchange.unknownMethodProbeResponse;

  if (unknownProbeResp === null) {
    results.push({
      checkId: 'ERRH-001',
      name: 'Unknown method probe response',
      category: 'error-handling',
      level: 'failure',
      description:
        'No response received for unknown-method probe — server must respond to unknown methods with JSON-RPC error -32601 (Method Not Found)',
      specVersion: SPEC_VERSION,
      specReference: 'JSON-RPC 2.0 §5.1 / MCP spec §3 (Error Handling)',
      confidence: 'deterministic',
    });
  } else if (!('error' in unknownProbeResp) || unknownProbeResp.error === undefined) {
    results.push({
      checkId: 'ERRH-001',
      name: 'Unknown method probe response',
      category: 'error-handling',
      level: 'failure',
      description:
        'Unknown-method probe returned a successful result instead of an error — server must return -32601 (Method Not Found) for unknown methods',
      specVersion: SPEC_VERSION,
      specReference: 'JSON-RPC 2.0 §5.1 / MCP spec §3 (Error Handling)',
      confidence: 'deterministic',
      details: { hasResult: 'result' in unknownProbeResp },
    });
  } else {
    const code = unknownProbeResp.error.code;
    const isCorrectCode = code === METHOD_NOT_FOUND;

    results.push({
      checkId: 'ERRH-001',
      name: 'Unknown method probe response',
      category: 'error-handling',
      level: isCorrectCode ? 'pass' : 'failure',
      description: isCorrectCode
        ? `Unknown-method probe correctly returned error code -32601 (Method Not Found)`
        : `Unknown-method probe returned error code ${code} — expected -32601 (Method Not Found)`,
      specVersion: SPEC_VERSION,
      specReference: 'JSON-RPC 2.0 §5.1 / MCP spec §3 (Error Handling)',
      confidence: 'deterministic',
      field: 'error.code',
      details: { receivedCode: code, expectedCode: METHOD_NOT_FOUND },
    });
  }

  // ERRH-002: Malformed-JSON probe — must return -32700 (Parse Error)
  const malformedProbeResp = exchange.malformedJsonProbeResponse;

  if (malformedProbeResp === null) {
    results.push({
      checkId: 'ERRH-002',
      name: 'Malformed JSON probe response',
      category: 'error-handling',
      level: 'failure',
      description:
        'No response received for malformed-JSON probe — server must respond to malformed JSON with JSON-RPC error -32700 (Parse Error)',
      specVersion: SPEC_VERSION,
      specReference: 'JSON-RPC 2.0 §5.1 / MCP spec §3 (Error Handling)',
      confidence: 'deterministic',
    });
  } else if (!('error' in malformedProbeResp) || malformedProbeResp.error === undefined) {
    results.push({
      checkId: 'ERRH-002',
      name: 'Malformed JSON probe response',
      category: 'error-handling',
      level: 'failure',
      description:
        'Malformed-JSON probe returned a successful result instead of an error — server must return -32700 (Parse Error) for malformed JSON',
      specVersion: SPEC_VERSION,
      specReference: 'JSON-RPC 2.0 §5.1 / MCP spec §3 (Error Handling)',
      confidence: 'deterministic',
      details: { hasResult: 'result' in malformedProbeResp },
    });
  } else {
    const code = malformedProbeResp.error.code;
    const isCorrectCode = code === PARSE_ERROR;

    results.push({
      checkId: 'ERRH-002',
      name: 'Malformed JSON probe response',
      category: 'error-handling',
      level: isCorrectCode ? 'pass' : 'failure',
      description: isCorrectCode
        ? `Malformed-JSON probe correctly returned error code -32700 (Parse Error)`
        : `Malformed-JSON probe returned error code ${code} — expected -32700 (Parse Error)`,
      specVersion: SPEC_VERSION,
      specReference: 'JSON-RPC 2.0 §5.1 / MCP spec §3 (Error Handling)',
      confidence: 'deterministic',
      field: 'error.code',
      details: { receivedCode: code, expectedCode: PARSE_ERROR },
    });
  }

  // ERRH-003: Summary of error handling conformance
  const probeFailures = results.filter((r) => r.level === 'failure').length;

  results.push({
    checkId: 'ERRH-003',
    name: 'Error handling conformance summary',
    category: 'error-handling',
    level: probeFailures === 0 ? 'pass' : 'info',
    description:
      probeFailures === 0
        ? 'Server correctly handles both unknown-method and malformed-JSON error probes'
        : `${probeFailures} error handling probe(s) failed — server error handling is not fully conformant`,
    specVersion: SPEC_VERSION,
    specReference: 'JSON-RPC 2.0 §5.1 / MCP spec §3 (Error Handling)',
    confidence: 'deterministic',
    details: { probeFailureCount: probeFailures },
  });

  return results;
}
