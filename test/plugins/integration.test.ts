/**
 * Tests for src/plugins/integration.ts (S-4-03, FR-079, FR-080)
 *
 * Covers:
 *   - PluginFinding → SecurityFinding conversion
 *   - Unique ID assignment (continues from builtinCount)
 *   - source = 'plugin' and pluginId populated
 *   - Suppression via config.skip
 *   - Suppression justification from config.skipJustifications
 *   - mergePluginFindings across multiple plugins
 *   - buildPluginFindingMap utility
 *   - JSON reporter includes plugin findings in security.findings
 *   - Terminal reporter renders plugin findings
 *   - Markdown reporter renders plugin findings
 *   - determineExitCode responds to plugin findings severity
 */

import { describe, it, expect } from 'vitest';
import {
  convertPluginFindings,
  mergePluginFindings,
  buildPluginFindingMap,
} from '../../src/plugins/integration.js';
import type { PluginFinding } from '../../src/plugins/types.js';
import type { SecurityFinding } from '../../src/types/security.js';
import type { VerificationConfig } from '../../src/types/config.js';
import type { VerificationResult } from '../../src/types/results.js';
import { DEFAULT_CONFIG } from '../../src/types/config.js';
import { JsonReporter } from '../../src/reporters/json.js';
import { TerminalReporter } from '../../src/reporters/terminal.js';
import { MarkdownReporter } from '../../src/reporters/markdown.js';
import { determineExitCode } from '../../src/scoring/thresholds.js';
import type { ScoringResult } from '../../src/types/results.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<VerificationConfig> = {}): VerificationConfig {
  return { ...DEFAULT_CONFIG, target: 'https://example.com/mcp', ...overrides };
}

function makePluginFinding(overrides: Partial<PluginFinding> = {}): PluginFinding {
  return {
    checkId: 'my-plugin',
    severity: 'medium',
    cvssScore: 5.0,
    component: 'https://example.com/mcp',
    title: 'Plugin Test Finding',
    description: 'A finding from a plugin.',
    remediation: 'Address the issue.',
    confidence: 'heuristic',
    ...overrides,
  };
}

function makeSecurityFinding(overrides: Partial<SecurityFinding> = {}): SecurityFinding {
  return {
    id: 'SEC-001',
    checkId: 'builtin-check',
    severity: 'low',
    cvssScore: 2.0,
    component: 'test',
    title: 'Builtin Finding',
    description: 'From built-in check.',
    remediation: 'Fix it.',
    confidence: 'deterministic',
    suppressed: false,
    ...overrides,
  };
}

function makeResult(
  findings: SecurityFinding[],
  suppressed: SecurityFinding[],
): VerificationResult {
  return {
    meta: {
      toolVersion: '1.0.0',
      specVersion: '2024-11-05',
      timestamp: '2026-03-29T12:00:00.000Z',
      target: 'https://example.com/mcp',
      transport: 'http',
      durationMs: 100,
      checkMode: 'balanced',
    },
    conformance: {
      score: 100,
      breakdown: {
        'jsonrpc-base': 100,
        initialization: 100,
        tools: 100,
        resources: 100,
        prompts: 100,
        transport: 100,
        'error-handling': 100,
      },
      violations: [],
    },
    security: {
      findings,
      suppressed,
    },
    summary: {
      pass: true,
      exitCode: 0,
      blockerCount: {},
    },
  };
}

function makeScoringResult(overrides: Partial<ScoringResult> = {}): ScoringResult {
  return {
    overallScore: 100,
    categoryScores: [],
    exitCode: 0,
    pass: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// convertPluginFindings
// ---------------------------------------------------------------------------

describe('convertPluginFindings — basic conversion', () => {
  it('converts a single PluginFinding to a SecurityFinding', () => {
    const pf = makePluginFinding();
    const results = convertPluginFindings([pf], 'my-plugin', makeConfig(), 1);
    expect(results).toHaveLength(1);
    const sf = results[0]!;
    expect(sf.checkId).toBe(pf.checkId);
    expect(sf.severity).toBe(pf.severity);
    expect(sf.cvssScore).toBe(pf.cvssScore);
    expect(sf.component).toBe(pf.component);
    expect(sf.title).toBe(pf.title);
    expect(sf.description).toBe(pf.description);
    expect(sf.remediation).toBe(pf.remediation);
    expect(sf.confidence).toBe(pf.confidence);
  });

  it('assigns a globally unique id based on startIndex', () => {
    const pf = makePluginFinding();
    const results = convertPluginFindings([pf], 'my-plugin', makeConfig(), 5);
    expect(results[0]!.id).toBe('SEC-005');
  });

  it('assigns sequential ids for multiple findings', () => {
    const pf1 = makePluginFinding({ title: 'A' });
    const pf2 = makePluginFinding({ title: 'B' });
    const results = convertPluginFindings([pf1, pf2], 'my-plugin', makeConfig(), 3);
    expect(results[0]!.id).toBe('SEC-003');
    expect(results[1]!.id).toBe('SEC-004');
  });

  it('sets source to "plugin"', () => {
    const results = convertPluginFindings([makePluginFinding()], 'my-plugin', makeConfig(), 1);
    expect(results[0]!.source).toBe('plugin');
  });

  it('sets pluginId to the provided plugin id', () => {
    const results = convertPluginFindings([makePluginFinding()], 'my-custom-plugin', makeConfig(), 1);
    expect(results[0]!.pluginId).toBe('my-custom-plugin');
  });

  it('sets suppressed to false for a non-skipped finding', () => {
    const results = convertPluginFindings([makePluginFinding()], 'p', makeConfig(), 1);
    expect(results[0]!.suppressed).toBe(false);
  });

  it('sets suppressed to true when checkId is in config.skip', () => {
    const config = makeConfig({ skip: ['my-plugin'] });
    const results = convertPluginFindings([makePluginFinding()], 'p', config, 1);
    expect(results[0]!.suppressed).toBe(true);
  });

  it('attaches justification when suppressed and justification exists', () => {
    const config = makeConfig({
      skip: ['my-plugin'],
      skipJustifications: { 'my-plugin': 'accepted risk' },
    });
    const results = convertPluginFindings([makePluginFinding()], 'p', config, 1);
    expect(results[0]!.justification).toBe('accepted risk');
  });

  it('leaves justification undefined when not in skipJustifications', () => {
    const config = makeConfig({ skip: ['my-plugin'] });
    const results = convertPluginFindings([makePluginFinding()], 'p', config, 1);
    expect(results[0]!.justification).toBeUndefined();
  });

  it('preserves optional evidence field', () => {
    const evidence = { key: 'value', count: 3 };
    const pf = makePluginFinding({ evidence });
    const results = convertPluginFindings([pf], 'p', makeConfig(), 1);
    expect(results[0]!.evidence).toEqual(evidence);
  });

  it('returns empty array for empty findings input', () => {
    const results = convertPluginFindings([], 'p', makeConfig(), 10);
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// mergePluginFindings
// ---------------------------------------------------------------------------

describe('mergePluginFindings — multi-plugin merging', () => {
  it('merges findings from two plugins with correct sequential IDs', () => {
    const pf1 = makePluginFinding({ checkId: 'plugin-a', title: 'A' });
    const pf2 = makePluginFinding({ checkId: 'plugin-b', title: 'B' });
    const map = new Map([
      ['plugin-a', [pf1]],
      ['plugin-b', [pf2]],
    ]);
    // 5 builtin findings already assigned IDs SEC-001 through SEC-005
    const results = mergePluginFindings(map, makeConfig(), 5);
    expect(results).toHaveLength(2);
    expect(results[0]!.id).toBe('SEC-006');
    expect(results[1]!.id).toBe('SEC-007');
  });

  it('returns empty array when all plugins have no findings', () => {
    const map = new Map([
      ['p1', [] as PluginFinding[]],
      ['p2', [] as PluginFinding[]],
    ]);
    const results = mergePluginFindings(map, makeConfig(), 0);
    expect(results).toEqual([]);
  });

  it('assigns the correct pluginId to each finding', () => {
    const pfA = makePluginFinding({ title: 'From A' });
    const pfB = makePluginFinding({ title: 'From B' });
    const map = new Map([
      ['plugin-a', [pfA]],
      ['plugin-b', [pfB]],
    ]);
    const results = mergePluginFindings(map, makeConfig(), 0);
    expect(results[0]!.pluginId).toBe('plugin-a');
    expect(results[1]!.pluginId).toBe('plugin-b');
  });

  it('returns empty array for an empty map', () => {
    const results = mergePluginFindings(new Map(), makeConfig(), 0);
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildPluginFindingMap
// ---------------------------------------------------------------------------

describe('buildPluginFindingMap', () => {
  it('builds a map from pluginId to findings', () => {
    const f1 = makePluginFinding({ title: 'F1' });
    const f2 = makePluginFinding({ title: 'F2' });
    const entries = [
      { pluginId: 'p1', findings: [f1] },
      { pluginId: 'p2', findings: [f2] },
    ];
    const map = buildPluginFindingMap(entries);
    expect(map.get('p1')).toEqual([f1]);
    expect(map.get('p2')).toEqual([f2]);
  });

  it('merges findings from the same plugin id across multiple entries', () => {
    const f1 = makePluginFinding({ title: 'F1' });
    const f2 = makePluginFinding({ title: 'F2' });
    const entries = [
      { pluginId: 'p1', findings: [f1] },
      { pluginId: 'p1', findings: [f2] },
    ];
    const map = buildPluginFindingMap(entries);
    expect(map.get('p1')).toHaveLength(2);
    expect(map.get('p1')).toContainEqual(f1);
    expect(map.get('p1')).toContainEqual(f2);
  });

  it('returns an empty map for empty entries', () => {
    const map = buildPluginFindingMap([]);
    expect(map.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Reporter integration — JSON
// ---------------------------------------------------------------------------

describe('JSON reporter — plugin findings', () => {
  it('includes plugin findings in security.findings array', () => {
    const pluginFinding = makeSecurityFinding({
      id: 'SEC-002',
      checkId: 'my-plugin',
      source: 'plugin',
      pluginId: 'my-plugin',
      title: 'Plugin Finding',
      suppressed: false,
    });
    const result = makeResult([pluginFinding], []);
    const reporter = new JsonReporter(makeConfig());
    const output = JSON.parse(reporter.format(result)) as {
      security: { findings: SecurityFinding[] };
    };
    expect(output.security.findings).toHaveLength(1);
    expect(output.security.findings[0]!.source).toBe('plugin');
    expect(output.security.findings[0]!.pluginId).toBe('my-plugin');
  });

  it('includes suppressed plugin findings in security.suppressed array', () => {
    const suppressed = makeSecurityFinding({
      id: 'SEC-003',
      checkId: 'my-plugin',
      source: 'plugin',
      pluginId: 'my-plugin',
      suppressed: true,
      justification: 'accepted',
    });
    const result = makeResult([], [suppressed]);
    const reporter = new JsonReporter(makeConfig());
    const output = JSON.parse(reporter.format(result)) as {
      security: { suppressed: SecurityFinding[] };
    };
    expect(output.security.suppressed).toHaveLength(1);
    expect(output.security.suppressed[0]!.source).toBe('plugin');
  });
});

// ---------------------------------------------------------------------------
// Reporter integration — Terminal
// ---------------------------------------------------------------------------

describe('Terminal reporter — plugin findings', () => {
  it('renders plugin finding title in output', () => {
    const pluginFinding = makeSecurityFinding({
      id: 'SEC-001',
      checkId: 'my-plugin',
      severity: 'high',
      source: 'plugin',
      pluginId: 'my-plugin',
      title: 'My Plugin Finding Title',
      suppressed: false,
    });
    const result = makeResult([pluginFinding], []);
    const reporter = new TerminalReporter(true); // noColor = true for clean output
    const output = reporter.format(result);
    expect(output).toContain('My Plugin Finding Title');
  });

  it('renders plugin finding checkId and cvssScore', () => {
    const pluginFinding = makeSecurityFinding({
      id: 'SEC-001',
      checkId: 'rate-limit-check',
      cvssScore: 3.1,
      source: 'plugin',
      pluginId: 'rate-limit-check',
      suppressed: false,
    });
    const result = makeResult([pluginFinding], []);
    const reporter = new TerminalReporter(true);
    const output = reporter.format(result);
    expect(output).toContain('rate-limit-check');
    expect(output).toContain('3.1');
  });
});

// ---------------------------------------------------------------------------
// Reporter integration — Markdown
// ---------------------------------------------------------------------------

describe('Markdown reporter — plugin findings', () => {
  it('renders plugin finding in security findings section', () => {
    const pluginFinding = makeSecurityFinding({
      id: 'SEC-001',
      checkId: 'custom-auth-check',
      severity: 'medium',
      source: 'plugin',
      pluginId: 'custom-auth-check',
      title: 'No Auth Detected',
      suppressed: false,
    });
    const result = makeResult([pluginFinding], []);
    const reporter = new MarkdownReporter();
    const output = reporter.format(result);
    expect(output).toContain('custom-auth-check');
    expect(output).toContain('No Auth Detected');
  });

  it('renders suppressed plugin finding in suppressed section', () => {
    const suppressed = makeSecurityFinding({
      id: 'SEC-002',
      checkId: 'rate-limit-check',
      source: 'plugin',
      pluginId: 'rate-limit-check',
      suppressed: true,
      title: 'No Rate Limit',
      justification: 'internal use only',
    });
    const result = makeResult([], [suppressed]);
    const reporter = new MarkdownReporter();
    const output = reporter.format(result);
    expect(output).toContain('No Rate Limit');
    expect(output).toContain('internal use only');
  });
});

// ---------------------------------------------------------------------------
// Exit code — plugin findings contribute to failOnSeverity
// ---------------------------------------------------------------------------

describe('determineExitCode — plugin findings contribute', () => {
  it('returns exit code 1 when an unsuppressed critical plugin finding meets threshold', () => {
    const pluginFinding = makeSecurityFinding({
      id: 'SEC-001',
      checkId: 'my-plugin',
      severity: 'critical',
      source: 'plugin',
      pluginId: 'my-plugin',
      suppressed: false,
    });
    const config = makeConfig({ failOnSeverity: 'critical' });
    const scoring = makeScoringResult({ overallScore: 100 });
    const exitCode = determineExitCode(scoring, [pluginFinding], config);
    expect(exitCode).toBe(1);
  });

  it('returns exit code 0 when plugin finding is below failOnSeverity threshold', () => {
    const pluginFinding = makeSecurityFinding({
      id: 'SEC-001',
      checkId: 'my-plugin',
      severity: 'low',
      source: 'plugin',
      pluginId: 'my-plugin',
      suppressed: false,
    });
    const config = makeConfig({ failOnSeverity: 'critical' });
    const scoring = makeScoringResult({ overallScore: 100 });
    const exitCode = determineExitCode(scoring, [pluginFinding], config);
    expect(exitCode).toBe(0);
  });

  it('returns exit code 0 when plugin finding is suppressed even if critical', () => {
    const pluginFinding = makeSecurityFinding({
      id: 'SEC-001',
      checkId: 'my-plugin',
      severity: 'critical',
      source: 'plugin',
      pluginId: 'my-plugin',
      suppressed: true,
    });
    const config = makeConfig({ failOnSeverity: 'critical' });
    const scoring = makeScoringResult({ overallScore: 100 });
    const exitCode = determineExitCode(scoring, [pluginFinding], config);
    expect(exitCode).toBe(0);
  });

  it('returns exit code 1 when failOnSeverity is "low" and plugin finding is low', () => {
    const pluginFinding = makeSecurityFinding({
      id: 'SEC-001',
      checkId: 'my-plugin',
      severity: 'low',
      source: 'plugin',
      pluginId: 'my-plugin',
      suppressed: false,
    });
    const config = makeConfig({ failOnSeverity: 'low' });
    const scoring = makeScoringResult({ overallScore: 100 });
    const exitCode = determineExitCode(scoring, [pluginFinding], config);
    expect(exitCode).toBe(1);
  });

  it('returns exit code 0 when failOnSeverity is "none" regardless of severity', () => {
    const pluginFinding = makeSecurityFinding({
      id: 'SEC-001',
      checkId: 'my-plugin',
      severity: 'critical',
      source: 'plugin',
      pluginId: 'my-plugin',
      suppressed: false,
    });
    const config = makeConfig({ failOnSeverity: 'none' });
    const scoring = makeScoringResult({ overallScore: 100 });
    const exitCode = determineExitCode(scoring, [pluginFinding], config);
    expect(exitCode).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Suppression via skip array
// ---------------------------------------------------------------------------

describe('suppression — plugin findings via config.skip', () => {
  it('marks finding suppressed when its checkId is in config.skip', () => {
    const pf = makePluginFinding({ checkId: 'rate-limit-check' });
    const config = makeConfig({ skip: ['rate-limit-check'] });
    const results = convertPluginFindings([pf], 'rate-limit-check', config, 1);
    expect(results[0]!.suppressed).toBe(true);
  });

  it('does not suppress finding when its checkId is NOT in config.skip', () => {
    const pf = makePluginFinding({ checkId: 'rate-limit-check' });
    const config = makeConfig({ skip: ['some-other-check'] });
    const results = convertPluginFindings([pf], 'rate-limit-check', config, 1);
    expect(results[0]!.suppressed).toBe(false);
  });

  it('attaches justification text when skip includes justification mapping', () => {
    const pf = makePluginFinding({ checkId: 'custom-auth-check' });
    const config = makeConfig({
      skip: ['custom-auth-check'],
      skipJustifications: { 'custom-auth-check': 'dev environment only' },
    });
    const results = convertPluginFindings([pf], 'custom-auth-check', config, 1);
    expect(results[0]!.suppressed).toBe(true);
    expect(results[0]!.justification).toBe('dev environment only');
  });
});
