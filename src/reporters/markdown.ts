import type { VerificationResult } from '../types/results.js';
import type { CheckResult, ConformanceCategory } from '../types/conformance.js';
import type { Reporter } from './types.js';

// ---------------------------------------------------------------------------
// Category display metadata (mirrors terminal.ts)
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<ConformanceCategory, string> = {
  'jsonrpc-base': 'JSON-RPC Base',
  initialization: 'Initialization',
  tools: 'Tools',
  resources: 'Resources',
  prompts: 'Prompts',
  transport: 'Transport',
  'error-handling': 'Error Handling',
};

const SCORED_CATEGORIES: ConformanceCategory[] = [
  'jsonrpc-base',
  'initialization',
  'tools',
  'resources',
  'prompts',
  'transport',
];

const ALL_CATEGORIES: ConformanceCategory[] = [
  'jsonrpc-base',
  'initialization',
  'tools',
  'resources',
  'prompts',
  'transport',
  'error-handling',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function transportLabel(transport: 'stdio' | 'http'): string {
  return transport === 'http' ? 'HTTP+SSE' : 'stdio';
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Builds a GFM pipe table from a header row and data rows.
 * Each row is an array of cell strings; column widths are auto-fitted.
 */
function buildTable(headers: string[], rows: string[][]): string {
  const colCount = headers.length;

  // Compute column widths: max of header length and any cell length
  const widths: number[] = headers.map((h) => h.length);
  for (const row of rows) {
    for (let i = 0; i < colCount; i++) {
      const cell = row[i] ?? '';
      if (cell.length > (widths[i] ?? 0)) {
        widths[i] = cell.length;
      }
    }
  }

  function padCell(text: string, colIdx: number): string {
    return text.padEnd(widths[colIdx] ?? text.length, ' ');
  }

  const headerLine =
    '| ' + headers.map((h, i) => padCell(h, i)).join(' | ') + ' |';
  const separatorLine =
    '| ' + widths.map((w) => '-'.repeat(Math.max(w, 1))).join(' | ') + ' |';
  const dataLines = rows.map(
    (row) =>
      '| ' +
      row.map((cell, i) => padCell(cell, i)).join(' | ') +
      ' |',
  );

  return [headerLine, separatorLine, ...dataLines].join('\n');
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildMetaSection(result: VerificationResult): string {
  const { meta } = result;
  const rows: string[][] = [
    ['Target', meta.target],
    ['Transport', transportLabel(meta.transport)],
    ['Tool Version', meta.toolVersion],
    ['Spec Version', `MCP ${meta.specVersion}`],
    ['Timestamp', meta.timestamp],
    ['Duration', formatDuration(meta.durationMs)],
    ['Check Mode', meta.checkMode],
  ];
  return buildTable(['Field', 'Value'], rows);
}

function buildSummarySection(result: VerificationResult): string {
  const { conformance, security, summary } = result;
  const active = security.findings;

  // Count severity buckets from active findings
  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const f of active) {
    switch (f.severity) {
      case 'critical':
        critical++;
        break;
      case 'high':
        high++;
        break;
      case 'medium':
        medium++;
        break;
      case 'low':
        low++;
        break;
      default:
        break;
    }
  }

  const verdict = summary.pass ? 'PASS' : 'FAIL';
  const rows: string[][] = [
    ['Conformance Score', `${conformance.score}/100`],
    ['Critical Findings', String(critical)],
    ['High Findings', String(high)],
    ['Medium Findings', String(medium)],
    ['Low Findings', String(low)],
    ['**Verdict**', `**${verdict}**`],
  ];
  return buildTable(['Metric', 'Value'], rows);
}

/**
 * Computes per-category totals from the violations array.
 * Note: `violations` contains ALL check results (pass + non-pass).
 */
interface CategoryStats {
  totalChecks: number;
  failures: number;
  warnings: number;
}

function computeCategoryStats(
  violations: CheckResult[],
): Map<ConformanceCategory, CategoryStats> {
  const statsMap = new Map<ConformanceCategory, CategoryStats>();

  for (const cat of ALL_CATEGORIES) {
    statsMap.set(cat, { totalChecks: 0, failures: 0, warnings: 0 });
  }

  for (const check of violations) {
    const stats = statsMap.get(check.category);
    if (stats === undefined) continue;
    stats.totalChecks++;
    if (check.level === 'failure') stats.failures++;
    if (check.level === 'warning') stats.warnings++;
  }

  return statsMap;
}

function buildConformanceScoreSection(result: VerificationResult): string {
  const { conformance } = result;
  const statsMap = computeCategoryStats(conformance.violations);

  const rows: string[][] = [];

  for (const cat of ALL_CATEGORIES) {
    const label = CATEGORY_LABELS[cat];
    const stats = statsMap.get(cat) ?? {
      totalChecks: 0,
      failures: 0,
      warnings: 0,
    };

    const scoreStr = SCORED_CATEGORIES.includes(cat)
      ? String(conformance.breakdown[cat] ?? 0)
      : 'N/A';

    rows.push([
      label,
      scoreStr,
      String(stats.totalChecks),
      String(stats.failures),
      String(stats.warnings),
    ]);
  }

  return buildTable(
    ['Category', 'Score', 'Checks', 'Failures', 'Warnings'],
    rows,
  );
}

function buildConformanceViolationsSection(result: VerificationResult): string {
  const { conformance } = result;
  const lines: string[] = [];

  // Group violations by category
  const byCategory = new Map<ConformanceCategory, CheckResult[]>();
  for (const cat of ALL_CATEGORIES) {
    byCategory.set(cat, []);
  }
  for (const check of conformance.violations) {
    const bucket = byCategory.get(check.category);
    if (bucket !== undefined) {
      bucket.push(check);
    }
  }

  for (const cat of ALL_CATEGORIES) {
    const label = CATEGORY_LABELS[cat];
    lines.push(`### ${label}`);

    const checks = byCategory.get(cat) ?? [];
    const nonPassChecks = checks.filter((c) => c.level !== 'pass');

    if (nonPassChecks.length === 0) {
      lines.push('- [x] All checks passed');
    } else {
      for (const check of nonPassChecks) {
        const levelTag =
          check.level === 'failure'
            ? '[FAIL]'
            : check.level === 'warning'
              ? '[WARN]'
              : '[INFO]';
        const fieldPart =
          check.field !== undefined ? ` (field: \`${check.field}\`)` : '';
        lines.push(
          `- [ ] **${levelTag}** ${check.description}${fieldPart} (${check.checkId})`,
        );
      }
    }

    lines.push('');
  }

  // Remove trailing blank line from last category
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n');
}

function buildSecurityFindingsSection(result: VerificationResult): string {
  const { security } = result;
  const active = security.findings;

  if (active.length === 0) {
    return '_No active security findings._';
  }

  const lines: string[] = [];

  for (const finding of active) {
    lines.push(`### ${finding.checkId}: ${finding.title}`);
    lines.push(
      `- **Severity:** ${finding.severity.charAt(0).toUpperCase()}${finding.severity.slice(1)} | **CVSS:** ${finding.cvssScore} | **Confidence:** ${finding.confidence}`,
    );
    lines.push(`- **Component:** ${finding.component}`);
    lines.push(`- **Description:** ${finding.description}`);
    lines.push(`- **Remediation:** ${finding.remediation}`);
    lines.push('');
  }

  // Remove trailing blank line
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n');
}

function buildSuppressedSection(result: VerificationResult): string {
  const { suppressed } = result.security;

  if (suppressed.length === 0) {
    return '_No suppressed findings._';
  }

  const rows: string[][] = suppressed.map((f) => [
    `${f.title} (${f.checkId})`,
    f.severity.charAt(0).toUpperCase() + f.severity.slice(1),
    f.justification ?? '_No justification provided_',
  ]);

  return buildTable(['Finding', 'Severity', 'Justification'], rows);
}

// ---------------------------------------------------------------------------
// MarkdownReporter
// ---------------------------------------------------------------------------

export class MarkdownReporter implements Reporter {
  format(result: VerificationResult): string {
    const { meta } = result;
    const sections: string[] = [];

    // Title
    sections.push('# MCP Verify Report');
    sections.push('');

    // Metadata table
    sections.push(buildMetaSection(result));
    sections.push('');

    // Summary
    sections.push('## Summary');
    sections.push('');
    sections.push(buildSummarySection(result));
    sections.push('');

    // Conformance score breakdown
    sections.push('## Conformance Score');
    sections.push('');
    sections.push(buildConformanceScoreSection(result));
    sections.push('');

    // Conformance violations
    sections.push('## Conformance Violations');
    sections.push('');
    sections.push(buildConformanceViolationsSection(result));
    sections.push('');

    // Security findings
    sections.push('## Security Findings');
    sections.push('');
    sections.push(buildSecurityFindingsSection(result));
    sections.push('');

    // Suppressed findings
    sections.push('## Suppressed Findings');
    sections.push('');
    sections.push(buildSuppressedSection(result));
    sections.push('');

    // Footer
    sections.push('---');
    sections.push(
      `*Generated by mcp-verify ${meta.toolVersion} | MCP spec ${meta.specVersion} | ${meta.timestamp}*`,
    );

    return sections.join('\n');
  }
}
