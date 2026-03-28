import type { VerificationResult } from '../types/results.js';
import type { CheckResult, ConformanceCategory } from '../types/conformance.js';
import type { Reporter } from './types.js';

// ---------------------------------------------------------------------------
// ANSI helpers — ~2KB, no external dependency
// ---------------------------------------------------------------------------

const ESC = '\x1b[';
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;
const RED = `${ESC}31m`;
const GREEN = `${ESC}32m`;
const YELLOW = `${ESC}33m`;
const CYAN = `${ESC}36m`;
const WHITE = `${ESC}37m`;

function shouldUseColor(noColorFlag: boolean): boolean {
  if (noColorFlag) return false;
  if (process.env['NO_COLOR'] !== undefined) return false;
  if (!process.stdout.isTTY) return false;
  return true;
}

type ColorCode =
  | typeof RESET
  | typeof BOLD
  | typeof DIM
  | typeof RED
  | typeof GREEN
  | typeof YELLOW
  | typeof CYAN
  | typeof WHITE;

function makeColor(useColor: boolean) {
  return function color(code: ColorCode, text: string): string {
    if (!useColor) return text;
    return `${code}${text}${RESET}`;
  };
}

// ---------------------------------------------------------------------------
// Category display metadata
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

// error-handling is the only category without a numeric score in the breakdown
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
// Box-drawing helpers
// ---------------------------------------------------------------------------

const BOX_WIDTH = 54; // inner width (between the ║ characters)

function boxTop(): string {
  return `╔${'═'.repeat(BOX_WIDTH)}╗`;
}

function boxDivider(): string {
  return `╠${'═'.repeat(BOX_WIDTH)}╣`;
}

function boxBottom(): string {
  return `╚${'═'.repeat(BOX_WIDTH)}╝`;
}

function boxLine(content: string): string {
  // Pad or truncate content to exactly BOX_WIDTH characters
  const padded = content.padEnd(BOX_WIDTH, ' ');
  return `║${padded}║`;
}

function boxEmpty(): string {
  return boxLine('');
}

// ---------------------------------------------------------------------------
// Score coloring
// ---------------------------------------------------------------------------

function scoreColor(
  score: number,
  color: ReturnType<typeof makeColor>,
): string {
  if (score >= 80) return color(GREEN, String(score));
  if (score >= 50) return color(YELLOW, String(score));
  return color(RED, String(score));
}

// ---------------------------------------------------------------------------
// Level indicator formatting
// ---------------------------------------------------------------------------

function levelTag(
  level: CheckResult['level'],
  color: ReturnType<typeof makeColor>,
): string {
  switch (level) {
    case 'failure':
      return color(RED, '[FAIL]');
    case 'warning':
      return color(YELLOW, '[WARN]');
    case 'info':
      return color(CYAN, '[INFO]');
    case 'pass':
      return color(GREEN, '[PASS]');
  }
}

// ---------------------------------------------------------------------------
// Transport display helper
// ---------------------------------------------------------------------------

function transportLabel(transport: 'stdio' | 'http'): string {
  return transport === 'http' ? 'HTTP+SSE' : 'stdio';
}

// ---------------------------------------------------------------------------
// Duration formatting
// ---------------------------------------------------------------------------

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ---------------------------------------------------------------------------
// TerminalReporter
// ---------------------------------------------------------------------------

export class TerminalReporter implements Reporter {
  private readonly useColor: boolean;

  constructor(noColorFlag: boolean = false) {
    this.useColor = shouldUseColor(noColorFlag);
  }

  format(result: VerificationResult): string {
    const color = makeColor(this.useColor);
    const lines: string[] = [];

    // -----------------------------------------------------------------------
    // Summary block
    // -----------------------------------------------------------------------

    const { meta, conformance, summary } = result;
    const overallScore = conformance.score;
    const verdict = summary.pass ? 'PASS' : 'FAIL';
    const verdictColored = summary.pass
      ? color(GREEN, `Verdict: ${verdict}`)
      : color(RED, `Verdict: ${verdict}`);

    lines.push(color(CYAN, boxTop()));

    const titleText = 'MCP Verify Report';
    const titlePadLeft = Math.floor((BOX_WIDTH - titleText.length) / 2);
    const titlePadRight = BOX_WIDTH - titleText.length - titlePadLeft;
    lines.push(
      color(
        CYAN,
        boxLine(
          ' '.repeat(titlePadLeft) +
            color(BOLD, titleText) +
            ' '.repeat(titlePadRight),
        ),
      ),
    );

    lines.push(color(CYAN, boxDivider()));

    // Meta rows — fixed label width of 12 for alignment
    const metaRows: [string, string][] = [
      ['Target:', meta.target],
      ['Transport:', transportLabel(meta.transport)],
      ['Server:', `${meta.toolVersion}`],
      ['Spec:', `MCP ${meta.specVersion}`],
      ['Timestamp:', meta.timestamp],
      ['Duration:', formatDuration(meta.durationMs)],
    ];

    for (const [label, value] of metaRows) {
      const row = `  ${label.padEnd(12)}${value}`;
      lines.push(color(CYAN, boxLine(row)));
    }

    lines.push(color(CYAN, boxDivider()));

    // Score display
    lines.push(color(CYAN, boxEmpty()));

    const scoreLabel = 'Conformance Score:  ';
    const scoreValue = `${scoreColor(overallScore, color)} / 100`;
    // When colors are disabled the raw number is 2-3 chars; with ANSI codes
    // the escape sequences are invisible width. We must build the visible
    // string separately for padding purposes.
    const scoreVisibleValue = `${overallScore} / 100`;
    const scoreRowPad = BOX_WIDTH - 2 - scoreLabel.length - scoreVisibleValue.length;
    lines.push(
      color(CYAN, `║  ${scoreLabel}${scoreValue}${' '.repeat(Math.max(0, scoreRowPad))}║`),
    );

    lines.push(color(CYAN, boxEmpty()));

    const verdictRow = `  ${verdictColored}`;
    // Compute visible length of verdict text (strip ANSI for padding calc)
    const verdictVisible = `  Verdict: ${verdict}`;
    const verdictPad = BOX_WIDTH - verdictVisible.length;
    lines.push(
      color(
        CYAN,
        `║${verdictRow}${' '.repeat(Math.max(0, verdictPad))}║`,
      ),
    );

    lines.push(color(CYAN, boxBottom()));

    // -----------------------------------------------------------------------
    // Conformance breakdown
    // -----------------------------------------------------------------------

    lines.push('');
    lines.push(color(BOLD, '=== Conformance Breakdown ==='));
    lines.push('');

    // Group violations by category for fast lookup
    const violationsByCategory = new Map<ConformanceCategory, CheckResult[]>();
    for (const cat of ALL_CATEGORIES) {
      violationsByCategory.set(cat, []);
    }
    for (const check of conformance.violations) {
      const bucket = violationsByCategory.get(check.category);
      if (bucket !== undefined) {
        bucket.push(check);
      }
    }

    for (const cat of ALL_CATEGORIES) {
      const label = CATEGORY_LABELS[cat];
      const violations = violationsByCategory.get(cat) ?? [];

      if (SCORED_CATEGORIES.includes(cat)) {
        const catScore = conformance.breakdown[cat] ?? 0;
        const scoreStr = scoreColor(catScore, color);
        // Visible label+colon length for padding
        const headerVisible = `  ${label}:`;
        const pad = Math.max(1, 18 - headerVisible.length);
        lines.push(`  ${color(BOLD, `${label}:`)}${' '.repeat(pad)}${scoreStr}/100`);
      } else {
        // error-handling: no numeric score
        lines.push(`  ${color(BOLD, `${label}:`)}`);
      }

      if (violations.length === 0) {
        lines.push(`    ${color(GREEN, '\u2713 No violations')}`);
      } else {
        for (const v of violations) {
          const tag = levelTag(v.level, color);
          const fieldPart = v.field !== undefined ? ` (${v.field})` : '';
          const checkIdPart = ` (${v.checkId})`;

          if (v.level === 'pass') {
            // PASS checks: show as green checkmark with description
            lines.push(
              `    ${tag} ${v.description}${fieldPart}${checkIdPart}`,
            );
          } else {
            lines.push(
              `    ${tag} ${v.description}${fieldPart}${checkIdPart}`,
            );
          }
        }
      }

      lines.push('');
    }

    // -----------------------------------------------------------------------
    // Security findings (Sprint 1 stub)
    // -----------------------------------------------------------------------

    lines.push(color(BOLD, '=== Security Findings ==='));
    lines.push('');
    lines.push(
      `  ${color(DIM, 'No security findings (security engine available in v0.2.0)')}`,
    );
    lines.push('');

    // -----------------------------------------------------------------------
    // Final verdict banner
    // -----------------------------------------------------------------------

    const bannerText = `=== ${verdict} ===`;
    const bannerColored = summary.pass
      ? color(GREEN, bannerText)
      : color(RED, bannerText);
    lines.push(color(BOLD, bannerColored));

    return lines.join('\n');
  }
}
