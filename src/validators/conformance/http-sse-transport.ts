/**
 * S-1-22: Transport protocol validator — HTTP/SSE-specific checks
 *
 * Only runs when transport.type === 'http'.
 * Checks:
 * - Content-Type headers on responses
 * - SSE format validation (data: prefix, event boundaries)
 * - CORS header recording
 */
import type { ProtocolExchangeRecord } from '../../types/protocol.js';
import type { VerificationConfig } from '../../types/config.js';
import type { CheckResult } from '../../types/conformance.js';

const SPEC_VERSION = '2024-11-05';

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function validateHttpSseTransport(
  exchange: ProtocolExchangeRecord,
  _config: VerificationConfig,
): CheckResult[] {
  const results: CheckResult[] = [];
  const meta = exchange.transportMetadata;

  // Guard: only run for HTTP transport
  if (meta.type !== 'http') {
    return results;
  }

  const headers = meta.httpHeaders;
  const sseObservations = meta.sseObservations;

  // XPORT-010: Content-Type header check
  // Gather all response Content-Type values from the HTTP headers map
  const contentTypeEntries: string[] = [];
  for (const [endpoint, headerMap] of Object.entries(headers)) {
    const ct = headerMap['content-type'] ?? headerMap['Content-Type'];
    if (ct !== undefined) {
      contentTypeEntries.push(`${endpoint}: ${ct}`);
    }
  }

  const hasHeaders = contentTypeEntries.length > 0;
  const hasJsonContentType = contentTypeEntries.some(
    (entry) => entry.toLowerCase().includes('application/json'),
  );
  const hasSseContentType = contentTypeEntries.some(
    (entry) => entry.toLowerCase().includes('text/event-stream'),
  );
  const hasValidContentType = hasJsonContentType || hasSseContentType;

  results.push({
    checkId: 'XPORT-010',
    name: 'HTTP Content-Type headers',
    category: 'transport',
    level: !hasHeaders ? 'info' : hasValidContentType ? 'pass' : 'warning',
    description: !hasHeaders
      ? 'No HTTP Content-Type headers recorded — cannot validate content types'
      : hasValidContentType
        ? `HTTP responses have appropriate Content-Type headers (application/json or text/event-stream)`
        : `HTTP responses do not have expected Content-Type headers (got: ${contentTypeEntries.join(', ')})`,
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §2 (Transports) — Streamable HTTP',
    confidence: hasHeaders ? 'deterministic' : 'low',
    details: {
      contentTypeEntries,
      hasJsonContentType,
      hasSseContentType,
    },
  });

  // XPORT-011: SSE format validation
  if (sseObservations.length === 0) {
    results.push({
      checkId: 'XPORT-011',
      name: 'SSE format validation',
      category: 'transport',
      level: 'info',
      description: 'No SSE observations recorded — SSE format check skipped',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §2 (Transports) — Streamable HTTP / SSE',
      confidence: 'deterministic',
    });
  } else {
    const dataLines = sseObservations.filter((o) => o.hasDataPrefix);
    const malformedLines = sseObservations.filter(
      (o) => !o.hasDataPrefix && !o.hasEventType && o.rawLine.trim().length > 0 &&
             !o.rawLine.startsWith('id:') && !o.rawLine.startsWith(':'),
    );

    const hasDataLines = dataLines.length > 0;
    const hasMalformed = malformedLines.length > 0;

    results.push({
      checkId: 'XPORT-011',
      name: 'SSE format validation',
      category: 'transport',
      level: hasMalformed ? 'warning' : hasDataLines ? 'pass' : 'warning',
      description: hasMalformed
        ? `SSE stream contains ${malformedLines.length} line(s) that do not conform to SSE format`
        : hasDataLines
          ? `SSE stream format is valid — ${dataLines.length} data line(s) observed`
          : 'SSE observations recorded but no data: lines found — stream may be empty',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §2 (Transports) — Streamable HTTP / SSE',
      confidence: 'high',
      details: {
        totalObservations: sseObservations.length,
        dataLineCount: dataLines.length,
        malformedLineCount: malformedLines.length,
      },
    });

    // XPORT-012: SSE data lines must have "data:" prefix
    const linesWithoutDataPrefix = sseObservations
      .filter((o) => o.rawLine.trim().length > 0 && !o.rawLine.startsWith(':'))
      .filter((o) => !o.hasDataPrefix && !o.hasEventType && !o.rawLine.startsWith('id:'));

    if (linesWithoutDataPrefix.length > 0) {
      results.push({
        checkId: 'XPORT-012',
        name: 'SSE data prefix compliance',
        category: 'transport',
        level: 'warning',
        description: `${linesWithoutDataPrefix.length} SSE line(s) are missing the required "data:" prefix for data payloads`,
        specVersion: SPEC_VERSION,
        specReference: 'MCP spec §2 (Transports) — Streamable HTTP / SSE',
        confidence: 'high',
        details: {
          violatingLineCount: linesWithoutDataPrefix.length,
          exampleLine: linesWithoutDataPrefix[0]?.rawLine ?? null,
        },
      });
    } else if (dataLines.length > 0) {
      results.push({
        checkId: 'XPORT-012',
        name: 'SSE data prefix compliance',
        category: 'transport',
        level: 'pass',
        description: 'All SSE data payloads have the required "data:" prefix',
        specVersion: SPEC_VERSION,
        specReference: 'MCP spec §2 (Transports) — Streamable HTTP / SSE',
        confidence: 'high',
        details: { dataLineCount: dataLines.length },
      });
    }
  }

  // XPORT-013: CORS header recording
  const corsEntries: string[] = [];
  for (const [endpoint, headerMap] of Object.entries(headers)) {
    const corsOrigin =
      headerMap['access-control-allow-origin'] ??
      headerMap['Access-Control-Allow-Origin'];
    if (corsOrigin !== undefined) {
      corsEntries.push(`${endpoint}: Access-Control-Allow-Origin: ${corsOrigin}`);
    }
  }

  results.push({
    checkId: 'XPORT-013',
    name: 'CORS headers present',
    category: 'transport',
    level: corsEntries.length > 0 ? 'pass' : 'info',
    description:
      corsEntries.length > 0
        ? `CORS headers observed on ${corsEntries.length} endpoint(s)`
        : 'No CORS headers observed — may be an issue if the server is accessed from a browser context',
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §2 (Transports) — Streamable HTTP',
    confidence: 'deterministic',
    details: {
      corsEntries,
      corsCount: corsEntries.length,
    },
  });

  return results;
}
