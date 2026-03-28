/**
 * Authentication Gap Detection (FR-038)
 *
 * Detects absence of authentication on HTTP MCP servers reachable over
 * non-loopback network interfaces.
 */
import type { SecurityFinding } from '../../types/security.js';
import type { SecurityCheck, SecurityCheckContext } from './types.js';

const CHECK_ID = 'auth-gap';
const CVSS_PUBLIC = 9.8;
const CVSS_PRIVATE = 6.5;

// Loopback and private (RFC 1918 / RFC 4193) address patterns
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const PRIVATE_RANGES = [
  /^10\./,            // 10.0.0.0/8
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^192\.168\./,      // 192.168.0.0/16
  /^fd[0-9a-f]{2}:/i, // fd00::/8 (IPv6 ULA)
];

function isLoopback(host: string): boolean {
  return LOOPBACK_HOSTS.has(host.toLowerCase());
}

function isPrivateNetwork(address: string): boolean {
  return PRIVATE_RANGES.some((re) => re.test(address));
}

function hasAuthHeaders(headers: Record<string, string>): boolean {
  const lowerHeaders = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  // Server challenges with WWW-Authenticate or client sent Authorization
  return lowerHeaders.has('www-authenticate') || lowerHeaders.has('authorization');
}

export const authGapCheck: SecurityCheck = {
  id: CHECK_ID,
  name: 'Authentication Gap Detection',

  check(ctx: SecurityCheckContext): SecurityFinding[] {
    // Auth gap is not applicable to stdio transport
    if (ctx.exchange.transportMetadata.type === 'stdio') return [];

    const metadata = ctx.exchange.transportMetadata;
    const target = metadata.target;

    // Extract host from target URL
    let host: string;
    try {
      const url = new URL(target);
      host = url.hostname;
    } catch {
      return []; // Cannot parse URL, skip
    }

    // Skip loopback addresses — development pattern is expected to be unauthenticated
    if (isLoopback(host)) return [];

    // Check if any HTTP response included auth-related headers
    const httpHeaders = metadata.httpHeaders;
    let authFound = false;

    if (httpHeaders && typeof httpHeaders === 'object') {
      for (const headers of Object.values(httpHeaders)) {
        if (headers && typeof headers === 'object' && hasAuthHeaders(headers)) {
          authFound = true;
          break;
        }
      }
    }

    if (authFound) return [];

    // Determine if target is on private network or public internet
    const resolvedAddress = metadata.resolvedAddress ?? host;
    const addressType = metadata.addressType ?? (isPrivateNetwork(resolvedAddress) ? 'private' : 'public');
    const isPublic = addressType === 'public';

    const severity = isPublic ? 'critical' : 'medium';
    const cvss = isPublic ? CVSS_PUBLIC : CVSS_PRIVATE;
    const networkDesc = isPublic ? 'public internet' : 'private network';

    return [{
      id: 'SEC-001',
      checkId: CHECK_ID,
      severity,
      cvssScore: cvss,
      component: target,
      title: 'Authentication Gap',
      description: `MCP server at "${target}" (${networkDesc}, resolved: ${resolvedAddress}) responds to initialize without requiring authentication. Any client on the ${networkDesc} can invoke tools on this server.`,
      remediation: `Add authentication to the MCP server. Recommended approaches: Bearer token authentication, OAuth 2.0 client credentials, or mutual TLS for machine-to-machine communication.`,
      confidence: 'heuristic',
      evidence: {
        host,
        resolvedAddress,
        addressType,
        authHeaderPresent: false,
        wwwAuthenticatePresent: false,
      },
      suppressed: false,
    }];
  },
};
