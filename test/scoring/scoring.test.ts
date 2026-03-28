import { describe, it, expect } from 'vitest';
import { computeScores } from '../../src/scoring/engine.js';
import { determineExitCode } from '../../src/scoring/thresholds.js';
import { CATEGORY_WEIGHTS, FAILURE_PENALTY, WARNING_PENALTY } from '../../src/scoring/weights.js';
import type { CheckResult, ConformanceCategory } from '../../src/types/conformance.js';
import type { SecurityFinding } from '../../src/types/security.js';
import type { VerificationConfig } from '../../src/types/config.js';
import { DEFAULT_CONFIG } from '../../src/types/config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<VerificationConfig> = {}): VerificationConfig {
  return { ...DEFAULT_CONFIG, target: 'stdio://test', ...overrides };
}

function makePassCheck(category: ConformanceCategory, checkId: string): CheckResult {
  return {
    checkId,
    name: `Check ${checkId}`,
    category,
    level: 'pass',
    description: 'Passed',
    specVersion: '2024-11-05',
    specReference: 'MCP spec',
    confidence: 'deterministic',
  };
}

function makeFailureCheck(category: ConformanceCategory, checkId: string): CheckResult {
  return { ...makePassCheck(category, checkId), level: 'failure', description: 'Failed' };
}

function makeWarningCheck(category: ConformanceCategory, checkId: string): CheckResult {
  return { ...makePassCheck(category, checkId), level: 'warning', description: 'Warning' };
}

function makeInit001Failure(): CheckResult {
  return makeFailureCheck('initialization', 'INIT-001');
}

const NO_FINDINGS: SecurityFinding[] = [];

// ---------------------------------------------------------------------------
// Weight constants tests
// ---------------------------------------------------------------------------

describe('CATEGORY_WEIGHTS', () => {
  it('scored category weights sum to approximately 1.0', () => {
    const scoredCategories: ConformanceCategory[] = [
      'jsonrpc-base',
      'initialization',
      'tools',
      'resources',
      'prompts',
      'transport',
    ];
    const sum = scoredCategories.reduce((acc, cat) => acc + CATEGORY_WEIGHTS[cat], 0);
    // Allow for floating-point imprecision
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('error-handling category has weight 0', () => {
    expect(CATEGORY_WEIGHTS['error-handling']).toBe(0);
  });

  it('every scored category has a positive weight', () => {
    const scoredCategories: ConformanceCategory[] = [
      'jsonrpc-base',
      'initialization',
      'tools',
      'resources',
      'prompts',
      'transport',
    ];
    for (const cat of scoredCategories) {
      expect(CATEGORY_WEIGHTS[cat]).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// computeScores tests
// ---------------------------------------------------------------------------

describe('computeScores', () => {
  it('returns overallScore of 100 when all checks pass', () => {
    const checks: CheckResult[] = [
      makePassCheck('jsonrpc-base', 'JSONRPC-001'),
      makePassCheck('initialization', 'INIT-001'),
      makePassCheck('tools', 'TOOL-001'),
      makePassCheck('resources', 'RES-001'),
      makePassCheck('prompts', 'PROMPT-001'),
      makePassCheck('transport', 'TRANS-001'),
    ];
    const result = computeScores(checks, NO_FINDINGS, makeConfig());
    expect(result.overallScore).toBe(100);
  });

  it('applies FAILURE_PENALTY for each failure check', () => {
    const checks: CheckResult[] = [
      makeFailureCheck('jsonrpc-base', 'JSONRPC-001'),
    ];
    const result = computeScores(checks, NO_FINDINGS, makeConfig());
    const jsonrpcCat = result.categoryScores.find((c) => c.category === 'jsonrpc-base');
    expect(jsonrpcCat?.score).toBe(100 - FAILURE_PENALTY);
  });

  it('applies WARNING_PENALTY for each warning check', () => {
    const checks: CheckResult[] = [
      makeWarningCheck('tools', 'TOOL-002'),
    ];
    const result = computeScores(checks, NO_FINDINGS, makeConfig());
    const toolsCat = result.categoryScores.find((c) => c.category === 'tools');
    expect(toolsCat?.score).toBe(100 - WARNING_PENALTY);
  });

  it('clamps category score to 0 when many failures accumulate', () => {
    // 7 failures × 15 penalty = 105 reduction → clamped to 0
    const checks: CheckResult[] = Array.from({ length: 7 }, (_, i) =>
      makeFailureCheck('jsonrpc-base', `JSONRPC-00${i}`),
    );
    const result = computeScores(checks, NO_FINDINGS, makeConfig());
    const cat = result.categoryScores.find((c) => c.category === 'jsonrpc-base');
    expect(cat?.score).toBe(0);
  });

  it('returns overallScore of 0 when INIT-001 is a failure', () => {
    const checks: CheckResult[] = [makeInit001Failure()];
    const result = computeScores(checks, NO_FINDINGS, makeConfig());
    expect(result.overallScore).toBe(0);
    expect(result.pass).toBe(false);
  });

  it('sets pass: false on initialization handshake failure', () => {
    const checks: CheckResult[] = [makeInit001Failure()];
    const result = computeScores(checks, NO_FINDINGS, makeConfig());
    expect(result.pass).toBe(false);
  });

  it('returns categoryScores for all 7 categories including error-handling', () => {
    const result = computeScores([], NO_FINDINGS, makeConfig());
    const cats = result.categoryScores.map((c) => c.category);
    expect(cats).toContain('jsonrpc-base');
    expect(cats).toContain('initialization');
    expect(cats).toContain('tools');
    expect(cats).toContain('resources');
    expect(cats).toContain('prompts');
    expect(cats).toContain('transport');
    expect(cats).toContain('error-handling');
  });

  it('error-handling category has weight 0 in categoryScores', () => {
    const result = computeScores([], NO_FINDINGS, makeConfig());
    const errCat = result.categoryScores.find((c) => c.category === 'error-handling');
    expect(errCat?.weight).toBe(0);
  });

  it('rounds overallScore to 1 decimal place', () => {
    // Create a scenario that produces a non-round weighted average
    const checks: CheckResult[] = [
      makeFailureCheck('jsonrpc-base', 'JSONRPC-001'), // 100 - 15 = 85
    ];
    const result = computeScores(checks, NO_FINDINGS, makeConfig());
    const str = result.overallScore.toString();
    const decimalPlaces = str.includes('.') ? str.split('.')[1]!.length : 0;
    expect(decimalPlaces).toBeLessThanOrEqual(1);
  });

  it('correctly counts passCount and failCount in categoryScores', () => {
    const checks: CheckResult[] = [
      makePassCheck('tools', 'TOOL-001'),
      makePassCheck('tools', 'TOOL-002'),
      makeFailureCheck('tools', 'TOOL-003'),
    ];
    const result = computeScores(checks, NO_FINDINGS, makeConfig());
    const toolsCat = result.categoryScores.find((c) => c.category === 'tools');
    expect(toolsCat?.passCount).toBe(2);
    expect(toolsCat?.failCount).toBe(1);
    expect(toolsCat?.totalChecks).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// determineExitCode tests
// ---------------------------------------------------------------------------

describe('determineExitCode', () => {
  const baseScoringResult = {
    overallScore: 100,
    categoryScores: [],
    exitCode: 0 as const,
    pass: true,
  };

  it('returns 0 when score meets threshold and no severe findings', () => {
    const code = determineExitCode(
      baseScoringResult,
      [],
      makeConfig({ conformanceThreshold: 80 }),
    );
    expect(code).toBe(0);
  });

  it('returns 1 when overallScore is below threshold', () => {
    const code = determineExitCode(
      { ...baseScoringResult, overallScore: 50 },
      [],
      makeConfig({ conformanceThreshold: 80 }),
    );
    expect(code).toBe(1);
  });

  it('returns 1 when a non-suppressed finding meets or exceeds failOnSeverity', () => {
    const criticalFinding: SecurityFinding = {
      findingId: 'SEC-001',
      analyzerName: 'test',
      severity: 'critical',
      title: 'Critical issue',
      description: 'Desc',
      confidence: 'deterministic',
      suppressed: false,
    };
    const code = determineExitCode(
      baseScoringResult,
      [criticalFinding],
      makeConfig({ failOnSeverity: 'critical' }),
    );
    expect(code).toBe(1);
  });

  it('returns 0 when finding is suppressed even if severity matches threshold', () => {
    const suppressedFinding: SecurityFinding = {
      findingId: 'SEC-001',
      analyzerName: 'test',
      severity: 'critical',
      title: 'Suppressed critical',
      description: 'Desc',
      confidence: 'deterministic',
      suppressed: true,
    };
    const code = determineExitCode(
      baseScoringResult,
      [suppressedFinding],
      makeConfig({ failOnSeverity: 'critical' }),
    );
    expect(code).toBe(0);
  });

  it('returns 0 when failOnSeverity is "none" regardless of findings', () => {
    const finding: SecurityFinding = {
      findingId: 'SEC-001',
      analyzerName: 'test',
      severity: 'critical',
      title: 'Critical issue',
      description: 'Desc',
      confidence: 'deterministic',
      suppressed: false,
    };
    const code = determineExitCode(
      baseScoringResult,
      [finding],
      makeConfig({ failOnSeverity: 'none' }),
    );
    expect(code).toBe(0);
  });

  it('returns 1 for medium severity when failOnSeverity is "low"', () => {
    const finding: SecurityFinding = {
      findingId: 'SEC-002',
      analyzerName: 'test',
      severity: 'medium',
      title: 'Medium issue',
      description: 'Desc',
      confidence: 'deterministic',
      suppressed: false,
    };
    const code = determineExitCode(
      baseScoringResult,
      [finding],
      makeConfig({ failOnSeverity: 'low' }),
    );
    expect(code).toBe(1);
  });

  it('returns 0 for a low severity finding when failOnSeverity is "medium"', () => {
    const finding: SecurityFinding = {
      findingId: 'SEC-003',
      analyzerName: 'test',
      severity: 'low',
      title: 'Low issue',
      description: 'Desc',
      confidence: 'deterministic',
      suppressed: false,
    };
    const code = determineExitCode(
      baseScoringResult,
      [finding],
      makeConfig({ failOnSeverity: 'medium' }),
    );
    expect(code).toBe(0);
  });
});
