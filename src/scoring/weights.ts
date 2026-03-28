/**
 * Category weight constants for the scoring engine.
 *
 * Weights sum to 1.0 across the 6 scored categories.
 * 'error-handling' has weight 0 — its violations are reported but do not
 * contribute to the numerical score.
 */
import type { ConformanceCategory } from '../types/conformance.js';

export const CATEGORY_WEIGHTS: Record<ConformanceCategory, number> = {
  'jsonrpc-base': 0.20,
  'initialization': 0.25,
  'tools': 0.25,
  'resources': 0.10,
  'prompts': 0.10,
  'transport': 0.10,
  'error-handling': 0, // Reported but not scored numerically
};

/** Penalty applied to a category score for each 'failure' level result. */
export const FAILURE_PENALTY = 15;

/** Penalty applied to a category score for each 'warning' level result. */
export const WARNING_PENALTY = 7;
