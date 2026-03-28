/**
 * S-1-22: Transport protocol validator — stdio-specific checks
 *
 * Only runs when transport.type === 'stdio'.
 * Checks:
 * - Line-delimited framing (each message is on its own line)
 * - Extraneous output detection (non-JSON output before protocol messages)
 */
import type { ProtocolExchangeRecord } from '../../types/protocol.js';
import type { VerificationConfig } from '../../types/config.js';
import type { CheckResult } from '../../types/conformance.js';

const SPEC_VERSION = '2024-11-05';

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function validateStdioTransport(
  exchange: ProtocolExchangeRecord,
  _config: VerificationConfig,
): CheckResult[] {
  const results: CheckResult[] = [];
  const meta = exchange.transportMetadata;

  // Guard: only run for stdio transport
  if (meta.type !== 'stdio') {
    return results;
  }

  // XPORT-001: Extraneous pre-protocol output detection
  const preProtocolOutput = meta.preProtocolOutput;
  const hasExtraneousOutput =
    Array.isArray(preProtocolOutput) && preProtocolOutput.length > 0;

  results.push({
    checkId: 'XPORT-001',
    name: 'Stdio extraneous output',
    category: 'transport',
    level: hasExtraneousOutput ? 'failure' : 'pass',
    description: hasExtraneousOutput
      ? `Server emitted ${preProtocolOutput.length} line(s) of non-JSON output before the protocol exchange — stdio MCP servers must write only JSON-RPC messages on stdout`
      : 'No extraneous output detected before the protocol exchange',
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §2 (Transports) — stdio',
    confidence: 'deterministic',
    details: hasExtraneousOutput
      ? { lineCount: preProtocolOutput.length, firstLine: preProtocolOutput[0] }
      : {},
  });

  // XPORT-002: Line-delimited framing check
  // Inspect timing records to verify we got responses (indicative of
  // proper line-delimited framing — if the exchange succeeded, framing works)
  const timings = meta.timing;
  const hasTimings = Array.isArray(timings) && timings.length > 0;

  // Check for any exchange errors that indicate framing issues
  const framingErrors = exchange.errors.filter(
    (e) =>
      e.message.toLowerCase().includes('frame') ||
      e.message.toLowerCase().includes('delimit') ||
      e.message.toLowerCase().includes('parse') ||
      e.message.toLowerCase().includes('newline'),
  );

  const hasFramingErrors = framingErrors.length > 0;

  results.push({
    checkId: 'XPORT-002',
    name: 'Stdio line-delimited framing',
    category: 'transport',
    level: hasFramingErrors ? 'failure' : hasTimings ? 'pass' : 'info',
    description: hasFramingErrors
      ? `Stdio framing errors detected: ${framingErrors.map((e) => e.message).join('; ')}`
      : hasTimings
        ? `Stdio line-delimited framing appears correct — ${timings.length} message exchange(s) completed`
        : 'No message timings recorded — unable to verify stdio framing',
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §2 (Transports) — stdio',
    confidence: hasFramingErrors ? 'deterministic' : 'high',
    details: {
      framingErrorCount: framingErrors.length,
      timingCount: timings.length,
    },
  });

  // XPORT-003: Verify that stdout carries only JSON-RPC messages
  // Any pre-protocol output lines that look like non-JSON (debug logging etc.)
  const nonJsonLines = hasExtraneousOutput
    ? preProtocolOutput.filter((line) => {
        try {
          JSON.parse(line);
          return false; // Is valid JSON — not extraneous
        } catch {
          return true; // Non-JSON line
        }
      })
    : [];

  results.push({
    checkId: 'XPORT-003',
    name: 'Stdio stdout JSON-only output',
    category: 'transport',
    level: nonJsonLines.length > 0 ? 'failure' : 'pass',
    description:
      nonJsonLines.length > 0
        ? `${nonJsonLines.length} non-JSON line(s) detected on stdout — stdio MCP servers must not write non-JSON data to stdout`
        : 'All stdout output appears to be valid JSON (no non-JSON lines detected)',
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §2 (Transports) — stdio',
    confidence: 'deterministic',
    details: {
      nonJsonLineCount: nonJsonLines.length,
      firstNonJsonLine: nonJsonLines[0] ?? null,
    },
  });

  return results;
}
