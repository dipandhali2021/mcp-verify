/**
 * Tests for JsonReporter (FR-049, FR-050)
 *
 * Covers:
 *   FR-049 — JSON report format output
 *   FR-050 — JSON report schema version and structure
 */
import { describe, it, expect } from 'vitest';

import { JsonReporter } from '../../src/reporters/json.js';
import { createReporter } from '../../src/reporters/factory.js';
import type { VerificationResult } from '../../src/types/results.js';
import type { VerificationConfig } from '../../src/types/config.js';
import type { CheckResult } from '../../src/types/conformance.js';
import type { SecurityFinding } from '../../src/types/security.js';
import { DEFAULT_CONFIG } from '../../src/types/config.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<VerificationConfig> = {}): VerificationConfig {
  return { ...DEFAULT_CONFIG, target: 'https://example.com/mcp', ...overrides };
}

function makeViolation(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    checkId: 'TOOLS-001',
    name: 'Tool Name Required',
    category: 'tools',
    level: 'failure',
    description: 'Tool is missing required name property.',
    specVersion: '2024-11-05',
    specReference: 'https://spec.modelcontextprotocol.io/',
    confidence: 'deterministic',
    ...overrides,
  };
}

function makeFinding(overrides: Partial<SecurityFinding> = {}): SecurityFinding {
  return {
    id: 'SEC-001',
    checkId: 'SEC-CORS-001',
    severity: 'high',
    cvssScore: 8.1,
    component: 'HTTP headers',
    title: 'CORS Wildcard Policy',
    description: 'Access-Control-Allow-Origin is set to *.',
    remediation: 'Restrict CORS origin to known clients.',
    confidence: 'deterministic',
    suppressed: false,
    ...overrides,
  };
}

function makeSuppressedFinding(overrides: Partial<SecurityFinding> = {}): SecurityFinding {
  return makeFinding({ id: 'SEC-002', suppressed: true, ...overrides });
}

function makeResult(overrides: Partial<VerificationResult> = {}): VerificationResult {
  return {
    meta: {
      toolVersion: '0.2.0-alpha',
      specVersion: '2024-11-05',
      timestamp: '2026-03-29T12:00:00.000Z',
      target: 'https://example.com/mcp',
      transport: 'http',
      durationMs: 342,
      checkMode: 'balanced',
    },
    conformance: {
      score: 85,
      breakdown: {
        'jsonrpc-base': 100,
        initialization: 90,
        tools: 80,
        resources: 75,
        prompts: 100,
        transport: 100,
        'error-handling': 0,
      },
      violations: [makeViolation()],
    },
    security: {
      findings: [makeFinding()],
      suppressed: [makeSuppressedFinding()],
    },
    summary: {
      pass: false,
      exitCode: 1,
      blockerCount: { critical: 0, high: 1, medium: 0, low: 0 },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helpers for parsing output
// ---------------------------------------------------------------------------

function parseOutput(reporter: JsonReporter, result: VerificationResult): unknown {
  const raw = reporter.format(result);
  return JSON.parse(raw) as unknown;
}

// Type-narrowing helpers for nested access
function asObject(v: unknown): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) {
    throw new Error(`Expected object, got ${typeof v}`);
  }
  return v as Record<string, unknown>;
}

function asArray(v: unknown): unknown[] {
  if (!Array.isArray(v)) {
    throw new Error(`Expected array, got ${typeof v}`);
  }
  return v;
}

// ---------------------------------------------------------------------------
// Tests: basic JSON validity and top-level structure
// ---------------------------------------------------------------------------

describe('JsonReporter — basic output', () => {
  it('returns valid JSON', () => {
    const reporter = new JsonReporter(makeConfig());
    const raw = reporter.format(makeResult());
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('returns pretty-printed JSON (indented with 2 spaces)', () => {
    const reporter = new JsonReporter(makeConfig());
    const raw = reporter.format(makeResult());
    // Pretty-printed JSON has newlines and leading spaces
    expect(raw).toContain('\n');
    expect(raw).toContain('  ');
  });

  it('contains no ANSI escape codes', () => {
    const reporter = new JsonReporter(makeConfig());
    const raw = reporter.format(makeResult());
    // ANSI escape sequences start with ESC (\x1b)
    expect(raw).not.toMatch(/\x1b\[/);
  });

  it('has schemaVersion "1.0"', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    expect(parsed['schemaVersion']).toBe('1.0');
  });

  it('has all four top-level keys', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    expect(parsed).toHaveProperty('schemaVersion');
    expect(parsed).toHaveProperty('meta');
    expect(parsed).toHaveProperty('conformance');
    expect(parsed).toHaveProperty('security');
    expect(parsed).toHaveProperty('summary');
  });
});

// ---------------------------------------------------------------------------
// Tests: meta object
// ---------------------------------------------------------------------------

describe('JsonReporter — meta object', () => {
  it('includes toolVersion from result', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const meta = asObject(parsed['meta']);
    expect(meta['toolVersion']).toBe('0.2.0-alpha');
  });

  it('includes specVersion from result', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const meta = asObject(parsed['meta']);
    expect(meta['specVersion']).toBe('2024-11-05');
  });

  it('includes timestamp from result', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const meta = asObject(parsed['meta']);
    expect(meta['timestamp']).toBe('2026-03-29T12:00:00.000Z');
  });

  it('includes target from result', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const meta = asObject(parsed['meta']);
    expect(meta['target']).toBe('https://example.com/mcp');
  });

  it('includes transport from result', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const meta = asObject(parsed['meta']);
    expect(meta['transport']).toBe('http');
  });

  it('includes durationMs from result', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const meta = asObject(parsed['meta']);
    expect(meta['durationMs']).toBe(342);
  });

  it('includes checkMode from config', () => {
    const reporter = new JsonReporter(makeConfig({ checkMode: 'strict' }));
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const meta = asObject(parsed['meta']);
    expect(meta['checkMode']).toBe('strict');
  });

  it('uses config checkMode not result checkMode', () => {
    // The config checkMode is the source of truth for meta.checkMode
    const reporter = new JsonReporter(makeConfig({ checkMode: 'lenient' }));
    const result = makeResult();
    const parsed = asObject(parseOutput(reporter, result));
    const meta = asObject(parsed['meta']);
    expect(meta['checkMode']).toBe('lenient');
  });

  it('includes thresholds with conformanceThreshold from config', () => {
    const reporter = new JsonReporter(makeConfig({ conformanceThreshold: 80 }));
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const meta = asObject(parsed['meta']);
    const thresholds = asObject(meta['thresholds']);
    expect(thresholds['conformanceThreshold']).toBe(80);
  });

  it('includes thresholds with failOnSeverity from config', () => {
    const reporter = new JsonReporter(makeConfig({ failOnSeverity: 'high' }));
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const meta = asObject(parsed['meta']);
    const thresholds = asObject(meta['thresholds']);
    expect(thresholds['failOnSeverity']).toBe('high');
  });

  it('reflects default thresholds when using DEFAULT_CONFIG', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const meta = asObject(parsed['meta']);
    const thresholds = asObject(meta['thresholds']);
    expect(thresholds['conformanceThreshold']).toBe(0);
    expect(thresholds['failOnSeverity']).toBe('critical');
  });

  it('handles stdio transport correctly', () => {
    const reporter = new JsonReporter(makeConfig());
    const result = makeResult({
      meta: {
        toolVersion: '0.2.0-alpha',
        specVersion: '2024-11-05',
        timestamp: '2026-03-29T12:00:00.000Z',
        target: 'stdio://my-server',
        transport: 'stdio',
        durationMs: 100,
        checkMode: 'balanced',
      },
    });
    const parsed = asObject(parseOutput(reporter, result));
    const meta = asObject(parsed['meta']);
    expect(meta['transport']).toBe('stdio');
  });
});

// ---------------------------------------------------------------------------
// Tests: conformance object
// ---------------------------------------------------------------------------

describe('JsonReporter — conformance object', () => {
  it('includes score', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const conformance = asObject(parsed['conformance']);
    expect(conformance['score']).toBe(85);
  });

  it('includes breakdown with category scores', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const conformance = asObject(parsed['conformance']);
    const breakdown = asObject(conformance['breakdown']);
    expect(breakdown['jsonrpc-base']).toBe(100);
    expect(breakdown['initialization']).toBe(90);
    expect(breakdown['tools']).toBe(80);
    expect(breakdown['resources']).toBe(75);
    expect(breakdown['prompts']).toBe(100);
    expect(breakdown['transport']).toBe(100);
    expect(breakdown['error-handling']).toBe(0);
  });

  it('includes violations array', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const conformance = asObject(parsed['conformance']);
    const violations = asArray(conformance['violations']);
    expect(violations).toHaveLength(1);
  });

  it('violation entries contain required fields', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const conformance = asObject(parsed['conformance']);
    const violations = asArray(conformance['violations']);
    const v = asObject(violations[0]);
    expect(v['checkId']).toBe('TOOLS-001');
    expect(v['name']).toBe('Tool Name Required');
    expect(v['category']).toBe('tools');
    expect(v['level']).toBe('failure');
    expect(v['description']).toBe('Tool is missing required name property.');
  });

  it('violations array is empty when there are no violations', () => {
    const reporter = new JsonReporter(makeConfig());
    const result = makeResult({
      conformance: {
        score: 100,
        breakdown: {
          'jsonrpc-base': 100,
          initialization: 100,
          tools: 100,
          resources: 100,
          prompts: 100,
          transport: 100,
          'error-handling': 0,
        },
        violations: [],
      },
    });
    const parsed = asObject(parseOutput(reporter, result));
    const conformance = asObject(parsed['conformance']);
    const violations = asArray(conformance['violations']);
    expect(violations).toHaveLength(0);
  });

  it('preserves optional violation fields (field, messageId, details)', () => {
    const reporter = new JsonReporter(makeConfig());
    const result = makeResult({
      conformance: {
        score: 70,
        breakdown: {
          'jsonrpc-base': 70,
          initialization: 100,
          tools: 100,
          resources: 100,
          prompts: 100,
          transport: 100,
          'error-handling': 0,
        },
        violations: [
          makeViolation({
            field: 'params.protocolVersion',
            messageId: 42,
            details: { expected: '2024-11-05', got: '2024-01-01' },
          }),
        ],
      },
    });
    const parsed = asObject(parseOutput(reporter, result));
    const conformance = asObject(parsed['conformance']);
    const violations = asArray(conformance['violations']);
    const v = asObject(violations[0]);
    expect(v['field']).toBe('params.protocolVersion');
    expect(v['messageId']).toBe(42);
    const details = asObject(v['details']);
    expect(details['expected']).toBe('2024-11-05');
  });
});

// ---------------------------------------------------------------------------
// Tests: security object
// ---------------------------------------------------------------------------

describe('JsonReporter — security object', () => {
  it('includes findings array with active findings', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const security = asObject(parsed['security']);
    const findings = asArray(security['findings']);
    expect(findings).toHaveLength(1);
  });

  it('includes suppressed array with suppressed findings', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const security = asObject(parsed['security']);
    const suppressed = asArray(security['suppressed']);
    expect(suppressed).toHaveLength(1);
  });

  it('finding entries contain all required fields', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const security = asObject(parsed['security']);
    const findings = asArray(security['findings']);
    const f = asObject(findings[0]);
    expect(f['id']).toBe('SEC-001');
    expect(f['checkId']).toBe('SEC-CORS-001');
    expect(f['severity']).toBe('high');
    expect(f['cvssScore']).toBe(8.1);
    expect(f['component']).toBe('HTTP headers');
    expect(f['title']).toBe('CORS Wildcard Policy');
    expect(f['description']).toBe('Access-Control-Allow-Origin is set to *.');
    expect(f['remediation']).toBe('Restrict CORS origin to known clients.');
    expect(f['confidence']).toBe('deterministic');
    expect(f['suppressed']).toBe(false);
  });

  it('suppressed finding entries have suppressed=true', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const security = asObject(parsed['security']);
    const suppressed = asArray(security['suppressed']);
    const f = asObject(suppressed[0]);
    expect(f['suppressed']).toBe(true);
  });

  it('findings array is empty when no active findings', () => {
    const reporter = new JsonReporter(makeConfig());
    const result = makeResult({
      security: { findings: [], suppressed: [] },
    });
    const parsed = asObject(parseOutput(reporter, result));
    const security = asObject(parsed['security']);
    expect(asArray(security['findings'])).toHaveLength(0);
    expect(asArray(security['suppressed'])).toHaveLength(0);
  });

  it('preserves optional evidence field on findings', () => {
    const reporter = new JsonReporter(makeConfig());
    const result = makeResult({
      security: {
        findings: [
          makeFinding({ evidence: { header: 'Access-Control-Allow-Origin', value: '*' } }),
        ],
        suppressed: [],
      },
    });
    const parsed = asObject(parseOutput(reporter, result));
    const security = asObject(parsed['security']);
    const findings = asArray(security['findings']);
    const f = asObject(findings[0]);
    const evidence = asObject(f['evidence']);
    expect(evidence['header']).toBe('Access-Control-Allow-Origin');
  });

  it('handles multiple findings with different severities', () => {
    const reporter = new JsonReporter(makeConfig());
    const result = makeResult({
      security: {
        findings: [
          makeFinding({ id: 'SEC-001', severity: 'critical', cvssScore: 9.8 }),
          makeFinding({ id: 'SEC-002', severity: 'medium', cvssScore: 5.0 }),
        ],
        suppressed: [],
      },
    });
    const parsed = asObject(parseOutput(reporter, result));
    const security = asObject(parsed['security']);
    const findings = asArray(security['findings']);
    expect(findings).toHaveLength(2);
    expect(asObject(findings[0])['severity']).toBe('critical');
    expect(asObject(findings[1])['severity']).toBe('medium');
  });
});

// ---------------------------------------------------------------------------
// Tests: summary object
// ---------------------------------------------------------------------------

describe('JsonReporter — summary object', () => {
  it('includes pass field', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const summary = asObject(parsed['summary']);
    expect(summary['pass']).toBe(false);
  });

  it('includes exitCode field', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const summary = asObject(parsed['summary']);
    expect(summary['exitCode']).toBe(1);
  });

  it('includes blockerCount object', () => {
    const reporter = new JsonReporter(makeConfig());
    const parsed = asObject(parseOutput(reporter, makeResult()));
    const summary = asObject(parsed['summary']);
    const blockerCount = asObject(summary['blockerCount']);
    expect(blockerCount['critical']).toBe(0);
    expect(blockerCount['high']).toBe(1);
    expect(blockerCount['medium']).toBe(0);
    expect(blockerCount['low']).toBe(0);
  });

  it('reflects pass=true and exitCode=0 on passing result', () => {
    const reporter = new JsonReporter(makeConfig());
    const result = makeResult({
      summary: {
        pass: true,
        exitCode: 0,
        blockerCount: { critical: 0, high: 0, medium: 0, low: 0 },
      },
    });
    const parsed = asObject(parseOutput(reporter, result));
    const summary = asObject(parsed['summary']);
    expect(summary['pass']).toBe(true);
    expect(summary['exitCode']).toBe(0);
  });

  it('reflects exitCode=2 for error result', () => {
    const reporter = new JsonReporter(makeConfig());
    const result = makeResult({
      summary: {
        pass: false,
        exitCode: 2,
        blockerCount: { critical: 0, high: 0, medium: 0, low: 0 },
      },
    });
    const parsed = asObject(parseOutput(reporter, result));
    const summary = asObject(parsed['summary']);
    expect(summary['exitCode']).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Tests: factory integration
// ---------------------------------------------------------------------------

describe('createReporter — json format', () => {
  it('returns a JsonReporter instance for format="json"', () => {
    const config = makeConfig({ format: 'json' });
    const reporter = createReporter(config);
    expect(reporter).toBeInstanceOf(JsonReporter);
  });

  it('output from factory reporter is valid JSON', () => {
    const config = makeConfig({ format: 'json' });
    const reporter = createReporter(config);
    const raw = reporter.format(makeResult());
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('still throws for sarif format', () => {
    const config = makeConfig({ format: 'sarif' });
    expect(() => createReporter(config)).toThrow('not yet implemented');
  });
});

// ---------------------------------------------------------------------------
// Tests: no ANSI codes (regression guard)
// ---------------------------------------------------------------------------

describe('JsonReporter — no ANSI codes', () => {
  it('output never contains ESC character', () => {
    const reporter = new JsonReporter(makeConfig());
    const result = makeResult({
      conformance: {
        score: 45,
        breakdown: {
          'jsonrpc-base': 45,
          initialization: 0,
          tools: 100,
          resources: 100,
          prompts: 100,
          transport: 100,
          'error-handling': 0,
        },
        violations: [
          makeViolation({ level: 'failure' }),
          makeViolation({ checkId: 'INIT-001', level: 'warning', category: 'initialization' }),
        ],
      },
      security: {
        findings: [
          makeFinding({ severity: 'critical', cvssScore: 9.8 }),
          makeFinding({ id: 'SEC-003', severity: 'low', cvssScore: 2.0 }),
        ],
        suppressed: [makeSuppressedFinding()],
      },
    });
    const raw = reporter.format(result);
    // No ANSI escape sequences (\x1b followed by [)
    expect(raw).not.toMatch(/\x1b/);
    // No color codes like [31m etc.
    expect(raw).not.toMatch(/\[\d+m/);
  });

  it('output is valid JSON even with special characters in strings', () => {
    const reporter = new JsonReporter(makeConfig());
    const result = makeResult({
      conformance: {
        score: 100,
        breakdown: {
          'jsonrpc-base': 100,
          initialization: 100,
          tools: 100,
          resources: 100,
          prompts: 100,
          transport: 100,
          'error-handling': 0,
        },
        violations: [
          makeViolation({
            description: 'Contains "quotes", <tags>, and & ampersands.',
          }),
        ],
      },
    });
    const raw = reporter.format(result);
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});
