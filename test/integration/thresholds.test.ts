/**
 * Integration tests for S-3-07: Threshold & Suppression End-to-End Wiring
 *
 * Tests the interaction between:
 *   - SecurityFinding suppression (suppressed field + justification)
 *   - determineExitCode (failOnSeverity + conformanceThreshold)
 *   - runSecurityChecks (skip list → suppressed findings with justification)
 *   - mergeConfig (skipJustifications populated from config file SkipEntry objects)
 *
 * Strategy: unit-level tests using scoring functions and the security runner
 * directly with mock data. No network or process spawning.
 */

import { describe, it, expect } from 'vitest';
import { determineExitCode } from '../../src/scoring/thresholds.js';
import { computeScores } from '../../src/scoring/engine.js';
import { runSecurityChecks } from '../../src/validators/security/runner.js';
import { mergeConfig } from '../../src/config/merge.js';
import { DEFAULT_CONFIG } from '../../src/types/config.js';
import type { VerificationConfig } from '../../src/types/config.js';
import type { SecurityFinding, Severity } from '../../src/types/security.js';
import type { ScoringResult } from '../../src/types/results.js';
import type { ProtocolExchangeRecord } from '../../src/types/protocol.js';
import type { ConfigFile } from '../../src/config/loader.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<VerificationConfig> = {}): VerificationConfig {
  return { ...DEFAULT_CONFIG, target: 'stdio://test', ...overrides };
}

function makeScoringResult(overallScore: number): ScoringResult {
  return {
    overallScore,
    categoryScores: [],
    exitCode: 0,
    pass: overallScore > 0,
  };
}

function makeFinding(
  overrides: Partial<SecurityFinding> & { severity: Severity },
): SecurityFinding {
  return {
    id: 'SEC-001',
    checkId: 'test-check',
    severity: overrides.severity,
    cvssScore: 7.0,
    component: 'test-component',
    title: 'Test Finding',
    description: 'A test finding',
    remediation: 'Fix it',
    confidence: 'deterministic',
    suppressed: false,
    ...overrides,
  };
}

/**
 * Minimal ProtocolExchangeRecord for stdio transport.
 * Used with runSecurityChecks to produce real findings.
 */
function makeExchange(overrides: Partial<ProtocolExchangeRecord> = {}): ProtocolExchangeRecord {
  return {
    initializeRequest: { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    initializeResponse: {
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'test-server', version: '1.0.0' },
      },
    },
    initializedSent: true,
    serverInfo: { name: 'test-server', version: '1.0.0' },
    toolsListResponses: [{ jsonrpc: '2.0', id: 2, result: { tools: [] } }],
    tools: [],
    resourcesListResponse: null,
    resources: [],
    resourceReadResponse: null,
    promptsListResponse: null,
    prompts: [],
    unknownMethodProbeResponse: null,
    malformedJsonProbeResponse: null,
    transportMetadata: {
      type: 'stdio',
      target: 'stdio://test',
      httpHeaders: {},
      sseObservations: [],
      preProtocolOutput: [],
      timing: [],
    },
    errors: [],
    stepResults: {
      initialize: { status: 'completed', durationMs: 50 },
      initialized: { status: 'completed', durationMs: 10 },
      'tools/list': { status: 'completed', durationMs: 30 },
      'resources/list': { status: 'skipped', durationMs: 0 },
      'resources/read': { status: 'skipped', durationMs: 0 },
      'prompts/list': { status: 'skipped', durationMs: 0 },
      'error-probe-unknown': { status: 'skipped', durationMs: 0 },
      'error-probe-malformed': { status: 'skipped', durationMs: 0 },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Section 1 — Suppression does not trigger exit code 1
// ---------------------------------------------------------------------------

describe('suppression and exit code', () => {
  it('suppressed finding does not trigger exit code 1 even at failOnSeverity threshold', () => {
    const suppressedFinding = makeFinding({ severity: 'critical', suppressed: true });
    const code = determineExitCode(
      makeScoringResult(100),
      [suppressedFinding],
      makeConfig({ failOnSeverity: 'critical' }),
    );
    expect(code).toBe(0);
  });

  it('non-suppressed finding at failOnSeverity threshold triggers exit code 1', () => {
    const activeFinding = makeFinding({ severity: 'critical', suppressed: false });
    const code = determineExitCode(
      makeScoringResult(100),
      [activeFinding],
      makeConfig({ failOnSeverity: 'critical' }),
    );
    expect(code).toBe(1);
  });

  it('non-suppressed finding above failOnSeverity threshold triggers exit code 1', () => {
    // failOnSeverity is 'medium', finding is 'high' (above medium)
    const activeFinding = makeFinding({ severity: 'high', suppressed: false });
    const code = determineExitCode(
      makeScoringResult(100),
      [activeFinding],
      makeConfig({ failOnSeverity: 'medium' }),
    );
    expect(code).toBe(1);
  });

  it('finding below failOnSeverity does not trigger exit code 1', () => {
    // failOnSeverity is 'high', finding is 'medium' (below high)
    const finding = makeFinding({ severity: 'medium', suppressed: false });
    const code = determineExitCode(
      makeScoringResult(100),
      [finding],
      makeConfig({ failOnSeverity: 'high' }),
    );
    expect(code).toBe(0);
  });

  it('mix of suppressed and non-suppressed: only non-suppressed at threshold triggers exit 1', () => {
    const suppressedCritical = makeFinding({
      id: 'SEC-001',
      checkId: 'check-a',
      severity: 'critical',
      suppressed: true,
    });
    const activeMedium = makeFinding({
      id: 'SEC-002',
      checkId: 'check-b',
      severity: 'medium',
      suppressed: false,
    });
    // failOnSeverity is 'medium': active medium finding should trigger exit 1
    const code = determineExitCode(
      makeScoringResult(100),
      [suppressedCritical, activeMedium],
      makeConfig({ failOnSeverity: 'medium' }),
    );
    expect(code).toBe(1);
  });

  it('all findings suppressed → exit code 0 regardless of severity', () => {
    const findings = [
      makeFinding({ id: 'SEC-001', checkId: 'c1', severity: 'critical', suppressed: true }),
      makeFinding({ id: 'SEC-002', checkId: 'c2', severity: 'high', suppressed: true }),
    ];
    const code = determineExitCode(
      makeScoringResult(100),
      findings,
      makeConfig({ failOnSeverity: 'low' }),
    );
    expect(code).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Section 2 — Conformance threshold
// ---------------------------------------------------------------------------

describe('conformanceThreshold and exit code', () => {
  it('score exactly at conformanceThreshold → exit code 0', () => {
    const code = determineExitCode(
      makeScoringResult(80),
      [],
      makeConfig({ conformanceThreshold: 80 }),
    );
    expect(code).toBe(0);
  });

  it('score above conformanceThreshold → exit code 0', () => {
    const code = determineExitCode(
      makeScoringResult(95),
      [],
      makeConfig({ conformanceThreshold: 80 }),
    );
    expect(code).toBe(0);
  });

  it('score below conformanceThreshold → exit code 1', () => {
    const code = determineExitCode(
      makeScoringResult(79),
      [],
      makeConfig({ conformanceThreshold: 80 }),
    );
    expect(code).toBe(1);
  });

  it('conformanceThreshold of 0 never triggers exit 1 from score alone', () => {
    const code = determineExitCode(
      makeScoringResult(0),
      [],
      makeConfig({ conformanceThreshold: 0 }),
    );
    expect(code).toBe(0);
  });

  it('conformanceThreshold of 100 triggers exit 1 for any score below 100', () => {
    const code = determineExitCode(
      makeScoringResult(99),
      [],
      makeConfig({ conformanceThreshold: 100 }),
    );
    expect(code).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Section 3 — Combined threshold + severity
// ---------------------------------------------------------------------------

describe('combined threshold and severity checks', () => {
  it('threshold ok but severity fails → exit code 1', () => {
    const criticalFinding = makeFinding({ severity: 'critical', suppressed: false });
    const code = determineExitCode(
      makeScoringResult(90),
      [criticalFinding],
      makeConfig({ conformanceThreshold: 80, failOnSeverity: 'critical' }),
    );
    expect(code).toBe(1);
  });

  it('severity ok but threshold fails → exit code 1', () => {
    const lowFinding = makeFinding({ severity: 'low', suppressed: false });
    const code = determineExitCode(
      makeScoringResult(70),
      [lowFinding],
      makeConfig({ conformanceThreshold: 80, failOnSeverity: 'critical' }),
    );
    expect(code).toBe(1);
  });

  it('both threshold and severity fail → exit code 1', () => {
    const criticalFinding = makeFinding({ severity: 'critical', suppressed: false });
    const code = determineExitCode(
      makeScoringResult(50),
      [criticalFinding],
      makeConfig({ conformanceThreshold: 80, failOnSeverity: 'critical' }),
    );
    expect(code).toBe(1);
  });

  it('both threshold and severity ok → exit code 0', () => {
    const lowFinding = makeFinding({ severity: 'low', suppressed: false });
    const code = determineExitCode(
      makeScoringResult(90),
      [lowFinding],
      makeConfig({ conformanceThreshold: 80, failOnSeverity: 'critical' }),
    );
    expect(code).toBe(0);
  });

  it('suppressed severe finding with failing threshold → exit code 1 (from threshold only)', () => {
    const suppressedCritical = makeFinding({ severity: 'critical', suppressed: true });
    const code = determineExitCode(
      makeScoringResult(50),
      [suppressedCritical],
      makeConfig({ conformanceThreshold: 80, failOnSeverity: 'critical' }),
    );
    expect(code).toBe(1);
  });

  it('suppressed severe finding with passing threshold → exit code 0', () => {
    const suppressedCritical = makeFinding({ severity: 'critical', suppressed: true });
    const code = determineExitCode(
      makeScoringResult(90),
      [suppressedCritical],
      makeConfig({ conformanceThreshold: 80, failOnSeverity: 'critical' }),
    );
    expect(code).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Section 4 — Suppressed finding has justification field set
// ---------------------------------------------------------------------------

describe('suppression justification field', () => {
  it('suppressed finding with justification has the justification field set', () => {
    const finding = makeFinding({
      severity: 'high',
      suppressed: true,
      justification: 'Behind internal VPN — no external exposure',
    });
    expect(finding.justification).toBe('Behind internal VPN — no external exposure');
    expect(finding.suppressed).toBe(true);
  });

  it('suppressed finding without justification has undefined justification', () => {
    const finding = makeFinding({ severity: 'high', suppressed: true });
    expect(finding.justification).toBeUndefined();
  });

  it('runner attaches justification from skipJustifications when skip matches', () => {
    const tools = [
      {
        name: 'cmd-tool',
        inputSchema: { type: 'object', properties: { command: { type: 'string' } } },
      },
    ];
    const exchange = makeExchange({ tools });
    const config = makeConfig({
      skip: ['command-injection'],
      skipJustifications: { 'command-injection': 'Tool is sandboxed' },
    });
    const findings = runSecurityChecks(exchange, config);
    const cmdFindings = findings.filter((f) => f.checkId === 'command-injection');
    expect(cmdFindings.length).toBeGreaterThan(0);
    expect(cmdFindings[0]!.suppressed).toBe(true);
    expect(cmdFindings[0]!.justification).toBe('Tool is sandboxed');
  });

  it('runner does not attach justification when none is provided for the checkId', () => {
    const tools = [
      {
        name: 'cmd-tool',
        inputSchema: { type: 'object', properties: { command: { type: 'string' } } },
      },
    ];
    const exchange = makeExchange({ tools });
    const config = makeConfig({
      skip: ['command-injection'],
      skipJustifications: {},
    });
    const findings = runSecurityChecks(exchange, config);
    const cmdFindings = findings.filter((f) => f.checkId === 'command-injection');
    expect(cmdFindings.length).toBeGreaterThan(0);
    expect(cmdFindings[0]!.suppressed).toBe(true);
    expect(cmdFindings[0]!.justification).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Section 5 — Suppressed findings appear in security.suppressed array
// ---------------------------------------------------------------------------

describe('suppressed findings appear in security.suppressed partition', () => {
  it('runner returns suppressed findings that can be partitioned from active ones', () => {
    const tools = [
      {
        name: 'exec-tool',
        inputSchema: {
          type: 'object',
          properties: {
            command: { type: 'string' },
            file: { type: 'string' },
          },
        },
      },
    ];
    const exchange = makeExchange({ tools });
    const config = makeConfig({ skip: ['command-injection'] });
    const allFindings = runSecurityChecks(exchange, config);

    const activeFindings = allFindings.filter((f) => !f.suppressed);
    const suppressedFindings = allFindings.filter((f) => f.suppressed);

    // Suppressed findings exist (command-injection check ran and produced findings)
    expect(suppressedFindings.length).toBeGreaterThan(0);
    // All suppressed findings have the command-injection checkId
    expect(suppressedFindings.every((f) => f.checkId === 'command-injection')).toBe(true);
    // Active findings (if any) are from other checks
    expect(activeFindings.every((f) => f.checkId !== 'command-injection')).toBe(true);
  });

  it('suppressed findings are excluded from exit code 1 trigger', () => {
    const tools = [
      {
        name: 'cmd-tool',
        inputSchema: { type: 'object', properties: { command: { type: 'string' } } },
      },
    ];
    const exchange = makeExchange({ tools });
    const config = makeConfig({
      skip: ['command-injection'],
      failOnSeverity: 'low',
    });
    const allFindings = runSecurityChecks(exchange, config);
    const suppressedFindings = allFindings.filter((f) => f.suppressed);
    // Verify we have suppressed findings
    expect(suppressedFindings.length).toBeGreaterThan(0);

    // determineExitCode must not fail because of suppressed findings
    const code = determineExitCode(
      makeScoringResult(100),
      allFindings,
      config,
    );
    // If only command-injection findings are returned (all suppressed), exit should be 0
    const activeFindings = allFindings.filter((f) => !f.suppressed);
    if (activeFindings.length === 0) {
      expect(code).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Section 6 — mergeConfig populates skipJustifications from SkipEntry objects
// ---------------------------------------------------------------------------

describe('mergeConfig skipJustifications wiring', () => {
  const TARGET = 'https://example.com/mcp';

  it('populates skipJustifications from config file SkipEntry objects with justification', () => {
    const file: ConfigFile = {
      skip: [
        { checkId: 'cors-wildcard', justification: 'Behind VPN' },
        { checkId: 'auth-gap', justification: 'Internal network only' },
        { checkId: 'command-injection' }, // No justification
      ],
    };
    const result = mergeConfig({}, file, TARGET);
    expect(result.skipJustifications['cors-wildcard']).toBe('Behind VPN');
    expect(result.skipJustifications['auth-gap']).toBe('Internal network only');
    // Entry without justification should not appear in the map
    expect(result.skipJustifications['command-injection']).toBeUndefined();
  });

  it('skip array is still populated as plain checkId strings', () => {
    const file: ConfigFile = {
      skip: [
        { checkId: 'cors-wildcard', justification: 'Behind VPN' },
        { checkId: 'auth-gap' },
      ],
    };
    const result = mergeConfig({}, file, TARGET);
    expect(result.skip).toEqual(['cors-wildcard', 'auth-gap']);
  });

  it('skipJustifications defaults to empty object when no config file', () => {
    const result = mergeConfig({}, null, TARGET);
    expect(result.skipJustifications).toEqual({});
  });

  it('skipJustifications defaults to empty object when config file has no skip entries', () => {
    const file: ConfigFile = { timeout: 30000 };
    const result = mergeConfig({}, file, TARGET);
    expect(result.skipJustifications).toEqual({});
  });

  it('skipJustifications defaults to empty object when all skip entries lack justification', () => {
    const file: ConfigFile = {
      skip: [{ checkId: 'cors-wildcard' }, { checkId: 'auth-gap' }],
    };
    const result = mergeConfig({}, file, TARGET);
    expect(result.skipJustifications).toEqual({});
  });

  it('CLI-provided skipJustifications override file justifications', () => {
    const file: ConfigFile = {
      skip: [{ checkId: 'cors-wildcard', justification: 'From file' }],
    };
    const result = mergeConfig(
      { skipJustifications: { 'cors-wildcard': 'From CLI' } },
      file,
      TARGET,
    );
    expect(result.skipJustifications['cors-wildcard']).toBe('From CLI');
  });
});

// ---------------------------------------------------------------------------
// Section 7 — computeScores + determineExitCode integration
// ---------------------------------------------------------------------------

describe('computeScores + determineExitCode integration', () => {
  it('perfect score with no findings → exit 0 at any reasonable threshold', () => {
    const scoring = computeScores([], [], makeConfig());
    const code = determineExitCode(
      scoring,
      [],
      makeConfig({ conformanceThreshold: 0 }),
    );
    expect(code).toBe(0);
  });

  it('failOnSeverity=none ignores all findings regardless of severity', () => {
    const findings = [
      makeFinding({ id: 'SEC-001', checkId: 'c1', severity: 'critical', suppressed: false }),
      makeFinding({ id: 'SEC-002', checkId: 'c2', severity: 'high', suppressed: false }),
    ];
    const code = determineExitCode(
      makeScoringResult(100),
      findings,
      makeConfig({ failOnSeverity: 'none' }),
    );
    expect(code).toBe(0);
  });

  it('severity comparison: info < low < medium < high < critical', () => {
    const severities: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
    for (const sev of severities) {
      const finding = makeFinding({ id: 'SEC-001', severity: sev, suppressed: false });
      // Set failOnSeverity to the same level: must trigger exit 1
      const code = determineExitCode(
        makeScoringResult(100),
        [finding],
        makeConfig({ failOnSeverity: sev }),
      );
      expect(code).toBe(1);
    }
  });
});
