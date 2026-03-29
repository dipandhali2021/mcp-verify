/**
 * Tests for MarkdownReporter (FR-051)
 *
 * Verifies that MarkdownReporter.format() produces valid GFM Markdown with:
 *   - Correct heading structure
 *   - Metadata table
 *   - Summary table with verdict
 *   - Conformance score table per category
 *   - Conformance violation lists
 *   - Security finding details
 *   - Suppressed findings table
 *   - Footer with version info
 *   - No ANSI escape codes
 */
import { describe, it, expect } from 'vitest';
import { MarkdownReporter } from '../../src/reporters/markdown.js';
import type { VerificationResult } from '../../src/types/results.js';
import type { CheckResult } from '../../src/types/conformance.js';
import type { SecurityFinding } from '../../src/types/security.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCheckResult(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    checkId: 'TEST-001',
    name: 'Test Check',
    category: 'jsonrpc-base',
    level: 'pass',
    description: 'A test check',
    specVersion: '2024-11-05',
    specReference: 'https://spec.example.com',
    confidence: 'deterministic',
    ...overrides,
  };
}

function makeSecurityFinding(
  overrides: Partial<SecurityFinding> = {},
): SecurityFinding {
  return {
    id: 'sec-001',
    checkId: 'SEC-001',
    severity: 'high',
    cvssScore: 8.1,
    component: 'tool `run_command`',
    title: 'Command Injection Susceptibility',
    description:
      'Tool parameter `command` accepts unconstrained strings that could allow arbitrary command execution.',
    remediation:
      'Add `pattern` or `enum` constraint to the parameter schema.',
    confidence: 'heuristic',
    suppressed: false,
    ...overrides,
  };
}

function makeSuppressedFinding(
  overrides: Partial<SecurityFinding> = {},
): SecurityFinding {
  return makeSecurityFinding({
    id: 'sec-002',
    checkId: 'SEC-002',
    severity: 'high',
    title: 'CORS Wildcard Policy',
    suppressed: true,
    ...overrides,
  });
}

/** Minimal passing result with no violations or findings */
function makeMinimalResult(): VerificationResult {
  return {
    meta: {
      toolVersion: '1.0.0',
      specVersion: '2024-11-05',
      timestamp: '2026-03-29T10:00:00Z',
      target: 'https://example.com/mcp',
      transport: 'http',
      durationMs: 1200,
      checkMode: 'balanced',
    },
    conformance: {
      score: 85,
      breakdown: {
        'jsonrpc-base': 100,
        initialization: 90,
        tools: 80,
        resources: 75,
        prompts: 70,
        transport: 85,
        'error-handling': 0,
      },
      violations: [],
    },
    security: {
      findings: [],
      suppressed: [],
    },
    summary: {
      pass: true,
      exitCode: 0,
      blockerCount: {},
    },
  };
}

/** Full result with all sections populated */
function makeFullResult(): VerificationResult {
  const violations: CheckResult[] = [
    makeCheckResult({
      checkId: 'JRPC-001',
      category: 'jsonrpc-base',
      level: 'pass',
      description: 'Request has valid jsonrpc field',
    }),
    makeCheckResult({
      checkId: 'JRPC-002',
      category: 'jsonrpc-base',
      level: 'failure',
      description: 'Response missing required id field',
      field: 'id',
    }),
    makeCheckResult({
      checkId: 'INIT-003',
      category: 'initialization',
      level: 'warning',
      description: 'Server did not provide serverInfo.version',
    }),
    makeCheckResult({
      checkId: 'INIT-004',
      category: 'initialization',
      level: 'pass',
      description: 'Initialize response contains protocolVersion',
    }),
    makeCheckResult({
      checkId: 'ERR-001',
      category: 'error-handling',
      level: 'info',
      description: 'Server returned non-standard error code',
    }),
  ];

  const activeFindings: SecurityFinding[] = [makeSecurityFinding()];
  const suppressedFindings: SecurityFinding[] = [makeSuppressedFinding()];

  return {
    meta: {
      toolVersion: '1.0.0',
      specVersion: '2024-11-05',
      timestamp: '2026-03-29T10:00:00Z',
      target: 'https://example.com/mcp',
      transport: 'http',
      durationMs: 1200,
      checkMode: 'balanced',
    },
    conformance: {
      score: 85,
      breakdown: {
        'jsonrpc-base': 100,
        initialization: 90,
        tools: 80,
        resources: 75,
        prompts: 70,
        transport: 85,
        'error-handling': 0,
      },
      violations,
    },
    security: {
      findings: activeFindings,
      suppressed: suppressedFindings,
    },
    summary: {
      pass: true,
      exitCode: 0,
      blockerCount: {},
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const reporter = new MarkdownReporter();

/**
 * Asserts that a GFM pipe table with the given header columns appears in the
 * output string, without caring about exact cell padding widths.
 */
function hasTableHeader(output: string, ...cols: string[]): boolean {
  // The header line must contain each column name separated by | characters
  const escaped = cols.map((c) =>
    c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  // Build a flexible pattern: | col1 ... | col2 ... | ...
  const pattern = escaped.map((c) => `\\|\\s*${c}\\s*`).join('') + '\\|';
  return new RegExp(pattern).test(output);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MarkdownReporter', () => {
  describe('document structure', () => {
    it('starts with # MCP Verify Report heading', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toMatch(/^# MCP Verify Report\n/);
    });

    it('contains ## Summary section heading', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('## Summary');
    });

    it('contains ## Conformance Score section heading', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('## Conformance Score');
    });

    it('contains ## Conformance Violations section heading', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('## Conformance Violations');
    });

    it('contains ## Security Findings section heading', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('## Security Findings');
    });

    it('contains ## Suppressed Findings section heading', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('## Suppressed Findings');
    });

    it('ends with a horizontal rule and footer line', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('---\n*Generated by mcp-verify');
    });
  });

  describe('metadata table', () => {
    it('contains a Field / Value header row', () => {
      const output = reporter.format(makeMinimalResult());
      expect(hasTableHeader(output, 'Field', 'Value')).toBe(true);
    });

    it('includes the target URL', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('https://example.com/mcp');
    });

    it('renders HTTP transport as HTTP+SSE', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('HTTP+SSE');
    });

    it('renders stdio transport as stdio', () => {
      const result = makeMinimalResult();
      result.meta.transport = 'stdio';
      result.meta.target = 'stdio://server';
      const output = reporter.format(result);
      // "stdio" should appear as the transport value (not HTTP+SSE)
      expect(output).toMatch(/\|\s*Transport\s*\|\s*stdio\s*\|/);
    });

    it('includes toolVersion in Tool Version row', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('1.0.0');
    });

    it('includes spec version with MCP prefix', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('MCP 2024-11-05');
    });

    it('includes the timestamp', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('2026-03-29T10:00:00Z');
    });

    it('formats duration >= 1s as N.Ns', () => {
      const output = reporter.format(makeMinimalResult()); // durationMs=1200
      expect(output).toContain('1.2s');
    });

    it('formats duration < 1s as NNNms', () => {
      const result = makeMinimalResult();
      result.meta.durationMs = 450;
      const output = reporter.format(result);
      expect(output).toContain('450ms');
    });

    it('includes check mode', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('balanced');
    });
  });

  describe('summary table', () => {
    it('contains a Metric / Value header row', () => {
      const output = reporter.format(makeMinimalResult());
      expect(hasTableHeader(output, 'Metric', 'Value')).toBe(true);
    });

    it('includes conformance score as X/100', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('85/100');
    });

    it('shows PASS verdict in bold when summary.pass is true', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('**PASS**');
    });

    it('shows FAIL verdict in bold when summary.pass is false', () => {
      const result = makeMinimalResult();
      result.summary.pass = false;
      result.summary.exitCode = 1;
      const output = reporter.format(result);
      expect(output).toContain('**FAIL**');
    });

    it('counts high severity findings correctly', () => {
      const result = makeFullResult(); // has 1 high finding
      const output = reporter.format(result);
      // The High Findings row should show 1
      expect(output).toMatch(/High Findings\s*\|\s*1\s*\|/);
    });

    it('counts critical findings as 0 when none present', () => {
      const result = makeMinimalResult();
      const output = reporter.format(result);
      expect(output).toMatch(/Critical Findings\s*\|\s*0\s*\|/);
    });

    it('counts medium findings correctly', () => {
      const result = makeMinimalResult();
      result.security.findings = [
        makeSecurityFinding({ severity: 'medium', cvssScore: 4.5 }),
        makeSecurityFinding({ severity: 'medium', cvssScore: 5.0, id: 'sec-x' }),
      ];
      const output = reporter.format(result);
      expect(output).toMatch(/Medium Findings\s*\|\s*2\s*\|/);
    });

    it('counts low findings correctly', () => {
      const result = makeMinimalResult();
      result.security.findings = [
        makeSecurityFinding({ severity: 'low', cvssScore: 2.0 }),
      ];
      const output = reporter.format(result);
      expect(output).toMatch(/Low Findings\s*\|\s*1\s*\|/);
    });
  });

  describe('conformance score table', () => {
    it('contains Category / Score / Checks / Failures / Warnings header', () => {
      const output = reporter.format(makeMinimalResult());
      expect(
        hasTableHeader(output, 'Category', 'Score', 'Checks', 'Failures', 'Warnings'),
      ).toBe(true);
    });

    it('renders JSON-RPC Base category label', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('JSON-RPC Base');
    });

    it('renders Initialization category label', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('Initialization');
    });

    it('renders Error Handling category label', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('Error Handling');
    });

    it('shows correct score for jsonrpc-base', () => {
      const output = reporter.format(makeMinimalResult());
      // jsonrpc-base score = 100
      expect(output).toMatch(/JSON-RPC Base\s*\|\s*100\s*\|/);
    });

    it('shows N/A score for error-handling (unscored category)', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toMatch(/Error Handling\s*\|\s*N\/A\s*\|/);
    });

    it('counts failures from violations array', () => {
      const result = makeFullResult(); // has 1 failure in jsonrpc-base
      const output = reporter.format(result);
      // JSON-RPC Base has 1 failure (JRPC-002)
      // The row is: JSON-RPC Base | 100 | 2 | 1 | 0
      expect(output).toMatch(/JSON-RPC Base\s*\|\s*100\s*\|\s*2\s*\|\s*1\s*\|\s*0\s*\|/);
    });

    it('counts warnings from violations array', () => {
      const result = makeFullResult(); // has 1 warning in initialization
      const output = reporter.format(result);
      // Initialization has 1 warning (INIT-003) and 1 pass (INIT-004) = 2 total checks, 0 failures, 1 warning
      expect(output).toMatch(/Initialization\s*\|\s*90\s*\|\s*2\s*\|\s*0\s*\|\s*1\s*\|/);
    });
  });

  describe('conformance violations section', () => {
    it('renders ### heading for each category', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('### JSON-RPC Base');
      expect(output).toContain('### Initialization');
      expect(output).toContain('### Error Handling');
    });

    it('shows all checks passed when no non-pass checks in category', () => {
      const output = reporter.format(makeMinimalResult());
      // With no violations, every category should show the all-passed marker
      expect(output).toContain('- [x] All checks passed');
    });

    it('renders failure check with unchecked GFM checkbox', () => {
      const result = makeFullResult();
      const output = reporter.format(result);
      expect(output).toContain('- [ ] **[FAIL]**');
    });

    it('renders warning check with [WARN] tag', () => {
      const result = makeFullResult();
      const output = reporter.format(result);
      expect(output).toContain('- [ ] **[WARN]**');
    });

    it('includes checkId in the violation line', () => {
      const result = makeFullResult();
      const output = reporter.format(result);
      expect(output).toContain('(JRPC-002)');
    });

    it('includes field reference when present', () => {
      const result = makeFullResult();
      const output = reporter.format(result);
      // JRPC-002 has field: 'id'
      expect(output).toContain('field: `id`');
    });

    it('does not render pass-level checks in violation list', () => {
      const result = makeFullResult();
      const output = reporter.format(result);
      // JRPC-001 and INIT-004 are pass-level; they should not appear as unchecked boxes
      expect(output).not.toContain('JRPC-001');
      expect(output).not.toContain('INIT-004');
    });

    it('renders info-level check with [INFO] tag', () => {
      const result = makeFullResult();
      const output = reporter.format(result);
      expect(output).toContain('- [ ] **[INFO]**');
    });
  });

  describe('security findings section', () => {
    it('shows placeholder text when there are no active findings', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('_No active security findings._');
    });

    it('renders finding heading with checkId and title', () => {
      const result = makeFullResult();
      const output = reporter.format(result);
      expect(output).toContain('### SEC-001: Command Injection Susceptibility');
    });

    it('includes severity in the finding details', () => {
      const result = makeFullResult();
      const output = reporter.format(result);
      expect(output).toContain('**Severity:** High');
    });

    it('includes CVSS score in the finding details', () => {
      const result = makeFullResult();
      const output = reporter.format(result);
      expect(output).toContain('**CVSS:** 8.1');
    });

    it('includes confidence in the finding details', () => {
      const result = makeFullResult();
      const output = reporter.format(result);
      expect(output).toContain('**Confidence:** heuristic');
    });

    it('includes component in the finding details', () => {
      const result = makeFullResult();
      const output = reporter.format(result);
      expect(output).toContain('**Component:** tool `run_command`');
    });

    it('includes description in the finding details', () => {
      const result = makeFullResult();
      const output = reporter.format(result);
      expect(output).toContain('**Description:**');
      expect(output).toContain('accepts unconstrained strings');
    });

    it('includes remediation in the finding details', () => {
      const result = makeFullResult();
      const output = reporter.format(result);
      expect(output).toContain('**Remediation:**');
      expect(output).toContain('pattern');
    });

    it('renders multiple findings correctly', () => {
      const result = makeMinimalResult();
      result.security.findings = [
        makeSecurityFinding({ checkId: 'SEC-001', title: 'Finding One' }),
        makeSecurityFinding({
          id: 'sec-002b',
          checkId: 'SEC-002',
          title: 'Finding Two',
          severity: 'critical',
          cvssScore: 9.5,
        }),
      ];
      const output = reporter.format(result);
      expect(output).toContain('### SEC-001: Finding One');
      expect(output).toContain('### SEC-002: Finding Two');
      expect(output).toContain('**Severity:** Critical');
      expect(output).toContain('**CVSS:** 9.5');
    });
  });

  describe('suppressed findings section', () => {
    it('shows placeholder text when there are no suppressed findings', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('_No suppressed findings._');
    });

    it('contains Finding / Severity / Justification header row', () => {
      const result = makeFullResult();
      const output = reporter.format(result);
      expect(
        hasTableHeader(output, 'Finding', 'Severity', 'Justification'),
      ).toBe(true);
    });

    it('includes suppressed finding title and checkId in the table', () => {
      const result = makeFullResult();
      const output = reporter.format(result);
      expect(output).toContain('CORS Wildcard Policy');
      expect(output).toContain('SEC-002');
    });

    it('includes severity of suppressed finding', () => {
      const result = makeFullResult();
      const output = reporter.format(result);
      // The suppressed finding has severity 'high'
      // Check that "High" appears in the suppressed section (after ## Suppressed Findings)
      const suppressedIdx = output.indexOf('## Suppressed Findings');
      const suppressedSection = output.slice(suppressedIdx);
      expect(suppressedSection).toContain('High');
    });

    it('renders multiple suppressed findings as rows', () => {
      const result = makeMinimalResult();
      result.security.suppressed = [
        makeSuppressedFinding({ checkId: 'SEC-A', title: 'Alpha Finding' }),
        makeSuppressedFinding({
          id: 'sec-b',
          checkId: 'SEC-B',
          title: 'Beta Finding',
          severity: 'medium',
        }),
      ];
      const output = reporter.format(result);
      expect(output).toContain('Alpha Finding');
      expect(output).toContain('Beta Finding');
    });
  });

  describe('footer', () => {
    it('contains the tool version', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('mcp-verify 1.0.0');
    });

    it('contains the MCP spec version', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toContain('MCP spec 2024-11-05');
    });

    it('contains the timestamp', () => {
      const output = reporter.format(makeMinimalResult());
      const footerStart = output.lastIndexOf('*Generated by');
      expect(output.slice(footerStart)).toContain('2026-03-29T10:00:00Z');
    });

    it('footer is wrapped in italic markers', () => {
      const output = reporter.format(makeMinimalResult());
      expect(output).toMatch(/\*Generated by mcp-verify .+ \| MCP spec .+ \| .+\*/);
    });
  });

  describe('no ANSI escape codes', () => {
    it('produces output with no ANSI escape sequences (minimal result)', () => {
      const output = reporter.format(makeMinimalResult());
      // ESC character is \x1b — should not appear in Markdown output
      expect(output).not.toMatch(/\x1b\[/);
    });

    it('produces output with no ANSI escape sequences (full result)', () => {
      const output = reporter.format(makeFullResult());
      expect(output).not.toMatch(/\x1b\[/);
    });
  });

  describe('GFM table syntax', () => {
    it('metadata table has pipe characters on every row', () => {
      const output = reporter.format(makeMinimalResult());
      // Find the metadata table lines (after the h1 line)
      const lines = output.split('\n');
      const fieldIdx = lines.findIndex((l) => l.includes('| Field'));
      expect(fieldIdx).toBeGreaterThan(-1);
      // separator line immediately follows header
      const separatorLine = lines[fieldIdx + 1];
      expect(separatorLine).toMatch(/^\|[-| ]+\|$/);
    });

    it('summary table separator line uses dashes', () => {
      const output = reporter.format(makeMinimalResult());
      const lines = output.split('\n');
      const metricIdx = lines.findIndex((l) => l.includes('| Metric'));
      expect(metricIdx).toBeGreaterThan(-1);
      const separatorLine = lines[metricIdx + 1];
      expect(separatorLine).toMatch(/^\|[-| ]+\|$/);
    });

    it('conformance score table separator line uses dashes', () => {
      const output = reporter.format(makeMinimalResult());
      const lines = output.split('\n');
      const catIdx = lines.findIndex((l) => l.includes('| Category'));
      expect(catIdx).toBeGreaterThan(-1);
      const separatorLine = lines[catIdx + 1];
      expect(separatorLine).toMatch(/^\|[-| ]+\|$/);
    });
  });

  describe('factory integration', () => {
    it('createReporter returns a MarkdownReporter for format=markdown', async () => {
      const { createReporter } = await import('../../src/reporters/factory.js');
      const { DEFAULT_CONFIG } = await import('../../src/types/config.js');
      const reporter = createReporter({
        ...DEFAULT_CONFIG,
        target: 'https://example.com/mcp',
        format: 'markdown',
      });
      expect(reporter).toBeInstanceOf(MarkdownReporter);
    });

    it('MarkdownReporter returned by factory formats a result without throwing', async () => {
      const { createReporter } = await import('../../src/reporters/factory.js');
      const { DEFAULT_CONFIG } = await import('../../src/types/config.js');
      const reporter = createReporter({
        ...DEFAULT_CONFIG,
        target: 'https://example.com/mcp',
        format: 'markdown',
      });
      const output = reporter.format(makeMinimalResult());
      expect(output).toMatch(/^# MCP Verify Report/);
    });
  });
});
