/**
 * Comparison logic for mcp-verify run history (S-4-02, FR-072).
 *
 * Compares two HistoryRecord snapshots and identifies regressions, score
 * deltas, and new / resolved security findings.
 */

import type { HistoryRecord } from './types.js';
import type { SecurityFinding } from '../types/security.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ComparisonResult {
  /** Conformance score from the previous (baseline/earlier) run. */
  previousScore: number;
  /** Conformance score from the current run. */
  currentScore: number;
  /** currentScore - previousScore (negative means regression). */
  scoreDelta: number;
  /** Number of unsuppressed security findings in the previous run. */
  previousFindingsCount: number;
  /** Number of unsuppressed security findings in the current run. */
  currentFindingsCount: number;
  /** Descriptions of findings that appear in current but not previous. */
  newFindings: string[];
  /** Descriptions of findings that appear in previous but not current. */
  resolvedFindings: string[];
  /** True when scoreDelta < 0 (the conformance score dropped). */
  isRegression: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a stable string key for a SecurityFinding suitable for set-based
 * comparison.  We use checkId + title as the canonical identity; this is
 * robust to minor description drift while still catching genuinely new or
 * resolved issues.
 */
function findingKey(finding: SecurityFinding): string {
  return `${finding.checkId}::${finding.title}`;
}

/**
 * Return the description string that will be surfaced to users for a finding.
 * We prefer the description field; fall back to the title when it is empty.
 */
function findingLabel(finding: SecurityFinding): string {
  return finding.description.trim().length > 0
    ? finding.description
    : finding.title;
}

// ---------------------------------------------------------------------------
// compareRuns
// ---------------------------------------------------------------------------

/**
 * Compare two history records and produce a ComparisonResult.
 *
 * @param previous         - The earlier (or baseline) HistoryRecord.
 * @param current          - The most-recent HistoryRecord.
 * @param previousFindings - Optional unsuppressed SecurityFindings from the
 *                           previous run.  When omitted, only count-based
 *                           comparison is possible (newFindings /
 *                           resolvedFindings will be empty).
 * @param currentFindings  - Optional unsuppressed SecurityFindings from the
 *                           current run.
 */
export function compareRuns(
  previous: HistoryRecord,
  current: HistoryRecord,
  previousFindings: SecurityFinding[] = [],
  currentFindings: SecurityFinding[] = [],
): ComparisonResult {
  const previousScore = previous.conformanceScore;
  const currentScore = current.conformanceScore;
  const scoreDelta = currentScore - previousScore;

  // Build key → label maps for finding comparison
  const previousKeys = new Map<string, string>();
  for (const f of previousFindings) {
    if (!f.suppressed) {
      previousKeys.set(findingKey(f), findingLabel(f));
    }
  }

  const currentKeys = new Map<string, string>();
  for (const f of currentFindings) {
    if (!f.suppressed) {
      currentKeys.set(findingKey(f), findingLabel(f));
    }
  }

  // Findings in current but not in previous
  const newFindings: string[] = [];
  for (const [key, label] of currentKeys) {
    if (!previousKeys.has(key)) {
      newFindings.push(label);
    }
  }

  // Findings in previous but not in current
  const resolvedFindings: string[] = [];
  for (const [key, label] of previousKeys) {
    if (!currentKeys.has(key)) {
      resolvedFindings.push(label);
    }
  }

  return {
    previousScore,
    currentScore,
    scoreDelta,
    previousFindingsCount: previous.securityFindingsCount,
    currentFindingsCount: current.securityFindingsCount,
    newFindings,
    resolvedFindings,
    isRegression: scoreDelta < 0,
  };
}
