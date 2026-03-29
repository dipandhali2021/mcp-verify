/**
 * Plugin Finding Integration (FR-079, FR-080)
 *
 * Converts raw PluginFinding objects (returned by plugin check functions) into
 * full SecurityFinding objects that are compatible with the rest of the
 * verification pipeline (reporters, suppression, exit-code logic).
 */

import type { SecurityFinding } from '../types/security.js';
import type { VerificationConfig } from '../types/config.js';
import type { PluginFinding } from './types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Convert an array of PluginFindings from a single plugin into SecurityFindings.
 *
 * - IDs are assigned in sequence, starting from `startIndex` (1-based).
 * - Suppression is applied when the finding's `checkId` appears in
 *   `config.skip`.
 * - `source` is set to `'plugin'` and `pluginId` is set to the plugin's id.
 *
 * @param findings   - Raw findings produced by the plugin.
 * @param pluginId   - The `id` field of the originating plugin.
 * @param config     - Active verification config (used for suppression).
 * @param startIndex - 1-based counter offset for globally unique IDs.
 * @returns Converted SecurityFinding array, IDs starting at `startIndex`.
 */
export function convertPluginFindings(
  findings: PluginFinding[],
  pluginId: string,
  config: VerificationConfig,
  startIndex: number,
): SecurityFinding[] {
  return findings.map((pf, localIdx) => {
    const globalIdx = startIndex + localIdx;
    const id = `SEC-${String(globalIdx).padStart(3, '0')}`;

    const suppressed = config.skip.includes(pf.checkId);
    const justification = suppressed
      ? config.skipJustifications[pf.checkId]
      : undefined;

    const finding: SecurityFinding = {
      id,
      checkId: pf.checkId,
      severity: pf.severity,
      cvssScore: pf.cvssScore,
      component: pf.component,
      title: pf.title,
      description: pf.description,
      remediation: pf.remediation,
      confidence: pf.confidence,
      evidence: pf.evidence,
      suppressed,
      justification,
      source: 'plugin',
      pluginId,
    };

    return finding;
  });
}

/**
 * Merge all plugin findings from multiple plugins into a single
 * SecurityFinding array, using globally unique IDs that start after the
 * last built-in finding.
 *
 * @param pluginFindingMap - Map from pluginId → raw PluginFinding[].
 * @param config           - Active verification config.
 * @param builtinCount     - Number of built-in findings already assigned IDs.
 * @returns Flat array of converted SecurityFinding objects.
 */
export function mergePluginFindings(
  pluginFindingMap: Map<string, PluginFinding[]>,
  config: VerificationConfig,
  builtinCount: number,
): SecurityFinding[] {
  const result: SecurityFinding[] = [];
  let counter = builtinCount;

  for (const [pluginId, findings] of pluginFindingMap) {
    const converted = convertPluginFindings(findings, pluginId, config, counter + 1);
    counter += converted.length;
    result.push(...converted);
  }

  return result;
}

/**
 * Build the PluginFinding map from a flat PluginFinding array paired with
 * their originating plugin ids.
 *
 * This is a small utility to bridge the output of `runPlugins()` (which
 * processes plugins sequentially and returns a flat array tagged with the
 * plugin id) into the map expected by `mergePluginFindings()`.
 */
export function buildPluginFindingMap(
  entries: Array<{ pluginId: string; findings: PluginFinding[] }>,
): Map<string, PluginFinding[]> {
  const map = new Map<string, PluginFinding[]>();
  for (const { pluginId, findings } of entries) {
    const existing = map.get(pluginId) ?? [];
    map.set(pluginId, [...existing, ...findings]);
  }
  return map;
}
