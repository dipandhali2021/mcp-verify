import type { CheckResult, ConformanceCategory } from './conformance.js';
import type { SecurityFinding } from './security.js';

export interface VerificationMeta {
  toolVersion: string;
  specVersion: string;
  timestamp: string;
  target: string;
  transport: 'stdio' | 'http';
  durationMs: number;
  checkMode: string;
}

export interface CategoryScore {
  category: ConformanceCategory;
  score: number;
  weight: number;
  totalChecks: number;
  passCount: number;
  failCount: number;
  warnCount: number;
}

export interface ScoringResult {
  overallScore: number;
  categoryScores: CategoryScore[];
  exitCode: 0 | 1 | 2;
  pass: boolean;
}

export interface VerificationResult {
  meta: VerificationMeta;
  conformance: {
    score: number;
    breakdown: Record<ConformanceCategory, number>;
    violations: CheckResult[];
  };
  security: {
    findings: SecurityFinding[];
    suppressed: SecurityFinding[];
  };
  summary: {
    pass: boolean;
    exitCode: 0 | 1 | 2;
    blockerCount: Record<string, number>;
  };
}
