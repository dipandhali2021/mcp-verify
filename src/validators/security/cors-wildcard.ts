/**
 * CORS Wildcard Policy Detection (FR-037)
 *
 * Inspects HTTP response headers for Access-Control-Allow-Origin: *
 * which permits cross-origin tool invocation from any web context.
 */
import type { SecurityFinding } from '../../types/security.js';
import type { SecurityCheck, SecurityCheckContext } from './types.js';

const CHECK_ID = 'cors-wildcard';
const CVSS_SCORE = 7.5;

export const corsWildcardCheck: SecurityCheck = {
  id: CHECK_ID,
  name: 'CORS Wildcard Policy Detection',

  check(ctx: SecurityCheckContext): SecurityFinding[] {
    // CORS is not applicable to stdio transport
    if (ctx.exchange.transportMetadata.type === 'stdio') return [];

    const findings: SecurityFinding[] = [];
    const httpHeaders = ctx.exchange.transportMetadata.httpHeaders;
    let findingCount = 0;

    if (!httpHeaders || typeof httpHeaders !== 'object') return [];

    for (const [endpoint, headers] of Object.entries(httpHeaders)) {
      if (!headers || typeof headers !== 'object') continue;

      // Check for Access-Control-Allow-Origin header (case-insensitive lookup)
      const corsValue = findHeaderValue(headers, 'access-control-allow-origin');

      if (corsValue === '*') {
        findingCount++;
        findings.push({
          id: `SEC-${String(findingCount).padStart(3, '0')}`,
          checkId: CHECK_ID,
          severity: 'high',
          cvssScore: CVSS_SCORE,
          component: endpoint,
          title: 'CORS Wildcard Policy',
          description: `Endpoint "${endpoint}" returns Access-Control-Allow-Origin: * which permits cross-origin requests from any web origin. This allows any website to invoke MCP tools on this server.`,
          remediation: `Restrict the Access-Control-Allow-Origin header to specific trusted origins instead of using the wildcard "*".`,
          confidence: 'deterministic',
          evidence: {
            endpoint,
            header: 'Access-Control-Allow-Origin',
            value: '*',
          },
          suppressed: false,
        });
      }
    }

    return findings;
  },
};

function findHeaderValue(
  headers: Record<string, string>,
  headerName: string,
): string | undefined {
  const lowerName = headerName.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }
  return undefined;
}
