/**
 * rate-limit-check — Reference plugin example (FR-077)
 *
 * Checks whether the MCP server appears to enforce rate limiting by inspecting
 * HTTP response headers for well-known rate-limit indicators (RateLimit-*,
 * X-RateLimit-*, Retry-After, etc.).
 *
 * This is an *example* plugin to illustrate the mcp-verify plugin API; it is
 * intentionally simple and uses heuristic detection.
 */
import type { PluginDefinition, PluginContext, PluginFinding } from '../../../src/plugins/types.js';

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

/** Lowercase header name patterns that indicate rate limiting is in place. */
const RATE_LIMIT_HEADER_PATTERNS = [
  'ratelimit-limit',
  'ratelimit-remaining',
  'ratelimit-reset',
  'x-ratelimit-limit',
  'x-ratelimit-remaining',
  'x-ratelimit-reset',
  'x-rate-limit-limit',
  'x-rate-limit-remaining',
  'x-rate-limit-reset',
  'retry-after',
] as const;

function headersIndicateRateLimit(headers: Record<string, unknown>): boolean {
  const lowerKeys = Object.keys(headers).map((k) => k.toLowerCase());
  return RATE_LIMIT_HEADER_PATTERNS.some((pattern) => lowerKeys.includes(pattern));
}

function probeResponsesIndicateRateLimit(responses: unknown[]): boolean {
  for (const response of responses) {
    if (typeof response !== 'object' || response === null) continue;
    const resp = response as Record<string, unknown>;

    // Check if any nested headers object contains rate-limit indicators
    if (typeof resp['headers'] === 'object' && resp['headers'] !== null) {
      if (headersIndicateRateLimit(resp['headers'] as Record<string, unknown>)) {
        return true;
      }
    }

    // Check for 429 status codes in response metadata
    if (resp['status'] === 429 || resp['statusCode'] === 429) {
      return true;
    }

    // Check for a JSON-RPC error code -32029 (rate limited — custom convention)
    if (typeof resp['error'] === 'object' && resp['error'] !== null) {
      const error = resp['error'] as Record<string, unknown>;
      if (error['code'] === -32029) return true;
    }
  }

  return false;
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

const rateLimitCheck: PluginDefinition = {
  id: 'rate-limit-check',
  name: 'Rate Limit Check',
  description:
    'Checks whether the MCP server enforces rate limiting by looking for rate-limit response headers.',
  version: '1.0.0',

  async check(context: PluginContext): Promise<PluginFinding[]> {
    const { target, transport, errorProbeResponses, config } = context;

    // Rate limiting is primarily relevant for HTTP/network-exposed servers
    if (transport === 'stdio') {
      return [];
    }

    // Allow callers to opt-out via plugin config
    if (config['skipRateLimitCheck'] === true) {
      return [];
    }

    // Check error probe responses for rate-limit evidence
    const rateLimitFound = probeResponsesIndicateRateLimit(errorProbeResponses);

    if (rateLimitFound) {
      return [];
    }

    const severity = (config['severity'] as PluginFinding['severity']) ?? 'low';
    const cvssScore = typeof config['cvssScore'] === 'number' ? config['cvssScore'] : 3.1;

    return [
      {
        checkId: 'rate-limit-check',
        severity,
        cvssScore,
        component: target,
        title: 'No Rate Limiting Detected',
        description:
          `The MCP server at "${target}" does not appear to enforce rate limiting. ` +
          `No rate-limit headers (RateLimit-*, X-RateLimit-*, Retry-After) were ` +
          `found in the server responses. Without rate limiting, clients can send ` +
          `unlimited requests, potentially causing denial of service.`,
        remediation:
          'Implement rate limiting on the MCP server and include standard rate-limit ' +
          'response headers (e.g. RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset ' +
          'per RFC 6585 / draft-ietf-httpapi-ratelimit-headers) so clients can adapt.',
        confidence: 'heuristic',
        evidence: {
          transport,
          errorProbeCount: errorProbeResponses.length,
        },
      },
    ];
  },
};

export default rateLimitCheck;
