/**
 * Plugin System Types (S-4-03, FR-076 – FR-080)
 *
 * Defines the public contract for mcp-verify plugin authors.
 */

export interface PluginContext {
  /** The target URL or stdio command string. */
  target: string;
  /** Detected transport type: 'http' | 'stdio'. */
  transport: string;
  /** The raw result object from the server's initialize response. */
  initializeResponse: Record<string, unknown>;
  /** The list of tool objects returned by tools/list. */
  toolsList: unknown[];
  /** The list of resource objects returned by resources/list. */
  resourcesList: unknown[];
  /** The list of prompt objects returned by prompts/list. */
  promptsList: unknown[];
  /** Raw responses from error-probe requests. */
  errorProbeResponses: unknown[];
  /**
   * Plugin-specific configuration sourced from the `rules` object in
   * `mcp-verify.config.js`, keyed by plugin id.
   */
  config: Record<string, unknown>;
}

export interface PluginFinding {
  /** Must match the plugin's own `id` field, optionally with a sub-check suffix. */
  checkId: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  cvssScore: number;
  component: string;
  title: string;
  description: string;
  remediation: string;
  confidence: 'deterministic' | 'heuristic';
  evidence?: Record<string, unknown>;
}

export interface PluginDefinition {
  /** Unique identifier, used as the key for `rules` config and for suppression. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** One-line description of what the plugin checks. */
  description: string;
  /** Semver version string of the plugin itself. */
  version: string;
  /** The check function — must be async and resolve in ≤30 seconds. */
  check: (context: PluginContext) => Promise<PluginFinding[]>;
}
