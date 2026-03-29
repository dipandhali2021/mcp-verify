/**
 * History record types for mcp-verify run history storage (S-4-01, FR-067).
 */

export interface HistoryRecord {
  /** ISO 8601 timestamp of when the verification run completed. */
  timestamp: string;
  /** The target that was verified (URL or stdio command). */
  target: string;
  /** Overall conformance score (0–100). */
  conformanceScore: number;
  /** Number of unsuppressed security findings recorded for this run. */
  securityFindingsCount: number;
  /** Per-category conformance scores. Keys are category names. */
  breakdown: Record<string, number>;
  /** Version of mcp-verify that produced this record. */
  toolVersion: string;
  /** MCP spec version that was verified against. */
  specVersion: string;
}
