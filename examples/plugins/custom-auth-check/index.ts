/**
 * custom-auth-check — Reference plugin example (FR-077)
 *
 * Checks whether the MCP server's initialize response includes any indication
 * of an authentication mechanism. Reports a finding if none is detected.
 *
 * This is an *example* plugin to illustrate the mcp-verify plugin API; it is
 * intentionally simple and uses heuristic detection.
 */
import type { PluginDefinition, PluginContext, PluginFinding } from '../../../src/plugins/types.js';

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

/** Fields that might indicate an auth mechanism in the initialize result. */
const AUTH_INDICATOR_KEYS = [
  'auth',
  'authentication',
  'authorization',
  'security',
  'oauth',
  'token',
  'apiKey',
  'api_key',
  'bearerToken',
  'bearer_token',
] as const;

function hasAuthIndicator(obj: Record<string, unknown>): boolean {
  const keys = Object.keys(obj).map((k) => k.toLowerCase());
  return AUTH_INDICATOR_KEYS.some((indicator) => keys.includes(indicator));
}

// ---------------------------------------------------------------------------
// Plugin definition
// ---------------------------------------------------------------------------

const customAuthCheck: PluginDefinition = {
  id: 'custom-auth-check',
  name: 'Custom Authentication Check',
  description:
    'Checks whether the MCP server advertises an authentication mechanism in its initialize response.',
  version: '1.0.0',

  async check(context: PluginContext): Promise<PluginFinding[]> {
    const { target, transport, initializeResponse, config } = context;

    // stdio servers typically do not require network authentication
    if (transport === 'stdio') {
      return [];
    }

    // Allow callers to opt-out via plugin config
    if (config['skipAuthCheck'] === true) {
      return [];
    }

    const authFound = hasAuthIndicator(initializeResponse);

    if (authFound) {
      return [];
    }

    const severity = (config['severity'] as PluginFinding['severity']) ?? 'medium';
    const cvssScore = typeof config['cvssScore'] === 'number' ? config['cvssScore'] : 6.5;

    return [
      {
        checkId: 'custom-auth-check',
        severity,
        cvssScore,
        component: target,
        title: 'No Authentication Mechanism Detected',
        description:
          `The MCP server at "${target}" does not advertise an authentication ` +
          `mechanism in its initialize response. Unauthenticated clients may be ` +
          `able to invoke tools on this server.`,
        remediation:
          'Add authentication to the MCP server (e.g. Bearer token, OAuth 2.0, ' +
          'or mutual TLS) and include an auth-related field in the server capabilities ' +
          'or metadata returned during initialization.',
        confidence: 'heuristic',
        evidence: {
          initializeResponseKeys: Object.keys(initializeResponse),
          transport,
        },
      },
    ];
  },
};

export default customAuthCheck;
