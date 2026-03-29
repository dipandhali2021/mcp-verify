/**
 * Tests for comparison logic (S-4-02, FR-072).
 */

import { describe, it, expect } from 'vitest';
import { compareRuns } from '../../src/history/comparison.js';
import type { ComparisonResult } from '../../src/history/comparison.js';
import type { HistoryRecord } from '../../src/history/types.js';
import type { SecurityFinding } from '../../src/types/security.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<HistoryRecord> = {}): HistoryRecord {
  return {
    timestamp: new Date().toISOString(),
    target: 'https://example.com/mcp',
    conformanceScore: 80,
    securityFindingsCount: 0,
    breakdown: { lifecycle: 80 },
    toolVersion: '1.0.0',
    specVersion: '2024-11-05',
    ...overrides,
  };
}

function makeFinding(overrides: Partial<SecurityFinding> = {}): SecurityFinding {
  return {
    id: 'f-001',
    checkId: 'SEC-001',
    severity: 'high',
    cvssScore: 7.5,
    component: 'auth',
    title: 'Insecure token storage',
    description: 'Tokens are stored in plain text',
    remediation: 'Use encrypted storage',
    confidence: 'deterministic',
    suppressed: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Score delta calculation
// ---------------------------------------------------------------------------

describe('compareRuns — score delta calculation', () => {
  it('calculates positive delta when score improves', () => {
    const previous = makeRecord({ conformanceScore: 70 });
    const current = makeRecord({ conformanceScore: 90 });
    const result: ComparisonResult = compareRuns(previous, current);

    expect(result.previousScore).toBe(70);
    expect(result.currentScore).toBe(90);
    expect(result.scoreDelta).toBe(20);
  });

  it('calculates negative delta when score drops', () => {
    const previous = makeRecord({ conformanceScore: 90 });
    const current = makeRecord({ conformanceScore: 60 });
    const result = compareRuns(previous, current);

    expect(result.scoreDelta).toBe(-30);
  });

  it('calculates zero delta when scores are equal', () => {
    const previous = makeRecord({ conformanceScore: 75 });
    const current = makeRecord({ conformanceScore: 75 });
    const result = compareRuns(previous, current);

    expect(result.scoreDelta).toBe(0);
  });

  it('handles boundary scores (0 and 100)', () => {
    const previous = makeRecord({ conformanceScore: 0 });
    const current = makeRecord({ conformanceScore: 100 });
    const result = compareRuns(previous, current);

    expect(result.scoreDelta).toBe(100);
    expect(result.previousScore).toBe(0);
    expect(result.currentScore).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// isRegression flag
// ---------------------------------------------------------------------------

describe('compareRuns — isRegression flag', () => {
  it('sets isRegression to true when score drops', () => {
    const previous = makeRecord({ conformanceScore: 90 });
    const current = makeRecord({ conformanceScore: 80 });
    const result = compareRuns(previous, current);

    expect(result.isRegression).toBe(true);
  });

  it('sets isRegression to false when score improves', () => {
    const previous = makeRecord({ conformanceScore: 70 });
    const current = makeRecord({ conformanceScore: 85 });
    const result = compareRuns(previous, current);

    expect(result.isRegression).toBe(false);
  });

  it('sets isRegression to false when scores are equal', () => {
    const previous = makeRecord({ conformanceScore: 80 });
    const current = makeRecord({ conformanceScore: 80 });
    const result = compareRuns(previous, current);

    expect(result.isRegression).toBe(false);
  });

  it('regression of exactly 1 point is still a regression', () => {
    const previous = makeRecord({ conformanceScore: 81 });
    const current = makeRecord({ conformanceScore: 80 });
    const result = compareRuns(previous, current);

    expect(result.isRegression).toBe(true);
    expect(result.scoreDelta).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// Findings count fields
// ---------------------------------------------------------------------------

describe('compareRuns — findings count fields', () => {
  it('populates previousFindingsCount and currentFindingsCount from records', () => {
    const previous = makeRecord({ securityFindingsCount: 3 });
    const current = makeRecord({ securityFindingsCount: 1 });
    const result = compareRuns(previous, current);

    expect(result.previousFindingsCount).toBe(3);
    expect(result.currentFindingsCount).toBe(1);
  });

  it('both counts are zero when no findings in either run', () => {
    const previous = makeRecord({ securityFindingsCount: 0 });
    const current = makeRecord({ securityFindingsCount: 0 });
    const result = compareRuns(previous, current);

    expect(result.previousFindingsCount).toBe(0);
    expect(result.currentFindingsCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// New / resolved findings detection
// ---------------------------------------------------------------------------

describe('compareRuns — new findings detection', () => {
  it('identifies findings present in current but not previous', () => {
    const previous = makeRecord();
    const current = makeRecord();
    const previousFindings: SecurityFinding[] = [];
    const currentFindings: SecurityFinding[] = [
      makeFinding({ checkId: 'SEC-NEW', title: 'New issue', description: 'A brand new finding' }),
    ];

    const result = compareRuns(previous, current, previousFindings, currentFindings);

    expect(result.newFindings).toHaveLength(1);
    expect(result.newFindings[0]).toBe('A brand new finding');
  });

  it('returns empty newFindings when all current findings were also in previous', () => {
    const finding = makeFinding();
    const result = compareRuns(
      makeRecord(),
      makeRecord(),
      [finding],
      [finding],
    );

    expect(result.newFindings).toHaveLength(0);
  });

  it('identifies multiple new findings', () => {
    const f1 = makeFinding({ id: 'f-1', checkId: 'SEC-001', title: 'Issue 1', description: 'Desc 1' });
    const f2 = makeFinding({ id: 'f-2', checkId: 'SEC-002', title: 'Issue 2', description: 'Desc 2' });

    const result = compareRuns(makeRecord(), makeRecord(), [], [f1, f2]);

    expect(result.newFindings).toHaveLength(2);
    expect(result.newFindings).toContain('Desc 1');
    expect(result.newFindings).toContain('Desc 2');
  });
});

describe('compareRuns — resolved findings detection', () => {
  it('identifies findings present in previous but not current', () => {
    const resolvedFinding = makeFinding({
      checkId: 'SEC-OLD',
      title: 'Old issue',
      description: 'This was fixed',
    });

    const result = compareRuns(
      makeRecord(),
      makeRecord(),
      [resolvedFinding],
      [],
    );

    expect(result.resolvedFindings).toHaveLength(1);
    expect(result.resolvedFindings[0]).toBe('This was fixed');
  });

  it('returns empty resolvedFindings when no previous findings were fixed', () => {
    const finding = makeFinding();
    const result = compareRuns(
      makeRecord(),
      makeRecord(),
      [finding],
      [finding],
    );

    expect(result.resolvedFindings).toHaveLength(0);
  });

  it('identifies multiple resolved findings', () => {
    const f1 = makeFinding({ id: 'f-1', checkId: 'SEC-001', title: 'Old Issue 1', description: 'Fixed 1' });
    const f2 = makeFinding({ id: 'f-2', checkId: 'SEC-002', title: 'Old Issue 2', description: 'Fixed 2' });

    const result = compareRuns(makeRecord(), makeRecord(), [f1, f2], []);

    expect(result.resolvedFindings).toHaveLength(2);
    expect(result.resolvedFindings).toContain('Fixed 1');
    expect(result.resolvedFindings).toContain('Fixed 2');
  });
});

// ---------------------------------------------------------------------------
// Handle empty findings arrays (default parameters)
// ---------------------------------------------------------------------------

describe('compareRuns — empty findings (default parameters)', () => {
  it('works when called with only two records (no findings arrays)', () => {
    const previous = makeRecord({ conformanceScore: 80 });
    const current = makeRecord({ conformanceScore: 85 });
    const result = compareRuns(previous, current);

    expect(result.newFindings).toEqual([]);
    expect(result.resolvedFindings).toEqual([]);
    expect(result.scoreDelta).toBe(5);
    expect(result.isRegression).toBe(false);
  });

  it('suppressed findings are excluded from new/resolved comparison', () => {
    const suppressedFinding = makeFinding({
      checkId: 'SEC-SUP',
      title: 'Suppressed',
      description: 'This is suppressed',
      suppressed: true,
    });

    const result = compareRuns(
      makeRecord(),
      makeRecord(),
      [],
      [suppressedFinding],
    );

    // Suppressed finding in current should NOT appear in newFindings
    expect(result.newFindings).toHaveLength(0);
  });

  it('suppressed previous findings are excluded from resolvedFindings', () => {
    const suppressedFinding = makeFinding({
      checkId: 'SEC-SUP',
      title: 'Suppressed prev',
      description: 'Previously suppressed',
      suppressed: true,
    });

    const result = compareRuns(
      makeRecord(),
      makeRecord(),
      [suppressedFinding],
      [],
    );

    // Suppressed finding in previous should NOT appear in resolvedFindings
    expect(result.resolvedFindings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Mixed new and resolved in same comparison
// ---------------------------------------------------------------------------

describe('compareRuns — simultaneous new and resolved findings', () => {
  it('correctly identifies both new and resolved findings in the same run', () => {
    const sharedFinding = makeFinding({
      checkId: 'SEC-SHARED',
      title: 'Shared issue',
      description: 'Still present',
    });
    const resolvedFinding = makeFinding({
      id: 'f-old',
      checkId: 'SEC-OLD',
      title: 'Old issue',
      description: 'Was fixed',
    });
    const newFinding = makeFinding({
      id: 'f-new',
      checkId: 'SEC-NEW',
      title: 'New issue',
      description: 'Just appeared',
    });

    const result = compareRuns(
      makeRecord(),
      makeRecord(),
      [sharedFinding, resolvedFinding],
      [sharedFinding, newFinding],
    );

    expect(result.newFindings).toHaveLength(1);
    expect(result.newFindings[0]).toBe('Just appeared');
    expect(result.resolvedFindings).toHaveLength(1);
    expect(result.resolvedFindings[0]).toBe('Was fixed');
  });
});

// ---------------------------------------------------------------------------
// Label fallback — empty description uses title
// ---------------------------------------------------------------------------

describe('compareRuns — finding label fallback', () => {
  it('uses title as label when description is empty', () => {
    const findingWithEmptyDesc = makeFinding({
      checkId: 'SEC-X',
      title: 'Title as fallback',
      description: '',
    });

    const result = compareRuns(
      makeRecord(),
      makeRecord(),
      [],
      [findingWithEmptyDesc],
    );

    expect(result.newFindings[0]).toBe('Title as fallback');
  });
});
