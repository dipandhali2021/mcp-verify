/**
 * Exit code determination
 *
 * Exit codes:
 *   0 — all checks pass, score meets threshold, no findings exceed failOnSeverity
 *   1 — score below threshold, or at least one finding exceeds failOnSeverity
 *   2 — internal error (set externally before this function is called)
 */
import type { ScoringResult } from '../types/results.js';
import type { SecurityFinding } from '../types/security.js';
import type { VerificationConfig } from '../types/config.js';
import type { Severity } from '../types/security.js';

// Severity ordering for comparison (higher index = higher severity)
const SEVERITY_ORDER: Severity[] = ['info', 'low', 'medium', 'high', 'critical'];

function severityIndex(s: Severity): number {
  return SEVERITY_ORDER.indexOf(s);
}

function configuredFailSeverityIndex(failOn: VerificationConfig['failOnSeverity']): number {
  if (failOn === 'none') return SEVERITY_ORDER.length; // Never fail on severity
  return severityIndex(failOn as Severity);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function determineExitCode(
  scoring: ScoringResult,
  findings: SecurityFinding[],
  config: VerificationConfig,
): 0 | 1 | 2 {
  // Check if score meets the threshold
  const scoreBelowThreshold = scoring.overallScore < config.conformanceThreshold;

  // Check if any non-suppressed finding exceeds the configured fail-on-severity
  const failSevIdx = configuredFailSeverityIndex(config.failOnSeverity);
  const hasSevereFinding = findings.some(
    (f) => !f.suppressed && severityIndex(f.severity) >= failSevIdx,
  );

  if (scoreBelowThreshold || hasSevereFinding) {
    return 1;
  }

  return 0;
}
