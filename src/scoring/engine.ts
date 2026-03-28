/**
 * Scoring engine
 *
 * Computes weighted category scores from CheckResult[] and SecurityFinding[],
 * then produces a ScoringResult with an overall score and per-category breakdown.
 *
 * Algorithm:
 * 1. Group CheckResult by category.
 * 2. For each category, start with a base score of 100.
 * 3. Subtract FAILURE_PENALTY for each 'failure' result.
 * 4. Subtract WARNING_PENALTY for each 'warning' result.
 * 5. Clamp the category score to [0, 100].
 * 6. Compute overall score as the weighted average of the 6 scored categories.
 * 7. Special case: if the initialization handshake failed entirely → overall = 0.
 */
import type { CheckResult, ConformanceCategory } from '../types/conformance.js';
import type { SecurityFinding } from '../types/security.js';
import type { VerificationConfig } from '../types/config.js';
import type { ScoringResult, CategoryScore } from '../types/results.js';
import { CATEGORY_WEIGHTS, FAILURE_PENALTY, WARNING_PENALTY } from './weights.js';

// Categories that contribute to the numerical score (weight > 0)
const SCORED_CATEGORIES: ConformanceCategory[] = [
  'jsonrpc-base',
  'initialization',
  'tools',
  'resources',
  'prompts',
  'transport',
];

// All categories including error-handling (for reporting)
const ALL_CATEGORIES: ConformanceCategory[] = [
  ...SCORED_CATEGORIES,
  'error-handling',
];

// ---------------------------------------------------------------------------
// Helper: detect total initialization handshake failure
// ---------------------------------------------------------------------------

function initializationHandshakeFailed(checkResults: CheckResult[]): boolean {
  // If INIT-001 check is a failure, the initialize response was never received.
  return checkResults.some(
    (r) => r.checkId === 'INIT-001' && r.level === 'failure',
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function computeScores(
  checkResults: CheckResult[],
  _securityFindings: SecurityFinding[],
  _config: VerificationConfig,
): ScoringResult {
  // Group results by category
  const byCategory = new Map<ConformanceCategory, CheckResult[]>();
  for (const cat of ALL_CATEGORIES) {
    byCategory.set(cat, []);
  }
  for (const result of checkResults) {
    const bucket = byCategory.get(result.category);
    if (bucket !== undefined) {
      bucket.push(result);
    }
  }

  // Compute per-category scores
  const categoryScores: CategoryScore[] = [];

  for (const cat of ALL_CATEGORIES) {
    const catResults = byCategory.get(cat) ?? [];
    const failCount = catResults.filter((r) => r.level === 'failure').length;
    const warnCount = catResults.filter((r) => r.level === 'warning').length;
    const passCount = catResults.filter((r) => r.level === 'pass').length;
    const totalChecks = catResults.length;

    // Apply penalties from a base of 100
    const rawScore = 100 - failCount * FAILURE_PENALTY - warnCount * WARNING_PENALTY;
    const score = Math.max(0, rawScore);

    categoryScores.push({
      category: cat,
      score,
      weight: CATEGORY_WEIGHTS[cat],
      totalChecks,
      passCount,
      failCount,
      warnCount,
    });
  }

  // Special case: initialization handshake entirely failed → overall score = 0
  if (initializationHandshakeFailed(checkResults)) {
    return {
      overallScore: 0,
      categoryScores,
      exitCode: 0, // Exit code is determined by thresholds.ts, not here
      pass: false,
    };
  }

  // Compute weighted overall score across scored categories only
  let weightedSum = 0;
  let totalWeight = 0;

  for (const cs of categoryScores) {
    if (cs.weight > 0) {
      weightedSum += cs.score * cs.weight;
      totalWeight += cs.weight;
    }
  }

  // Normalise in case weights don't perfectly sum to 1.0 due to floating point
  const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    overallScore: Math.round(overallScore * 10) / 10, // 1 decimal place
    categoryScores,
    exitCode: 0, // Exit code is determined by thresholds.ts
    pass: true,  // Pass flag is also set by thresholds.ts
  };
}
