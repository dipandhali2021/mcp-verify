import { Command, InvalidArgumentError } from 'commander';
import { writeFileSync } from 'node:fs';
import { DEFAULT_CONFIG } from './types/index.js';
import type {
  VerificationConfig,
  VerificationResult,
  ConformanceCategory,
  SecurityFinding,
} from './types/index.js';
import { createTransport } from './transport/index.js';
import { executeProtocol } from './protocol/index.js';
import type { ProgressEvent } from './protocol/index.js';
import { runConformanceChecks } from './validators/conformance/index.js';
import { computeScores, determineExitCode } from './scoring/index.js';
import { runSecurityChecks } from './validators/security/index.js';
import { createReporter } from './reporters/index.js';
import { loadConfigFile, mergeConfig } from './config/index.js';
import { HistoryStorage, compareRuns, saveBaseline, getBaseline } from './history/index.js';
import type { HistoryRecord, ComparisonResult } from './history/index.js';
import { startDashboard } from './dashboard/index.js';

// ---------------------------------------------------------------------------
// Exit codes
// ---------------------------------------------------------------------------

export enum ExitCode {
  PASS = 0,
  FAIL = 1,
  ERROR = 2,
}

// ---------------------------------------------------------------------------
// Centralized error exit
// ---------------------------------------------------------------------------

export function exitWithError(
  message: string,
  verbose = false,
  err?: unknown,
): never {
  process.stderr.write(`Error: ${message}\n`);
  if (verbose && err instanceof Error && err.stack) {
    process.stderr.write(`${err.stack}\n`);
  }
  process.exit(ExitCode.ERROR);
}

// ---------------------------------------------------------------------------
// Security finding severity counter
// ---------------------------------------------------------------------------

function countBySeverity(findings: SecurityFinding[]): Record<string, number> {
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    if (!f.suppressed) {
      const current = counts[f.severity];
      if (current !== undefined) {
        counts[f.severity] = current + 1;
      }
    }
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Comparison output formatting
// ---------------------------------------------------------------------------

function formatComparisonOutput(comparison: ComparisonResult): string {
  const lines: string[] = [];
  lines.push('');
  lines.push('=== Comparison with Previous Run ===');
  lines.push('');

  const deltaSign = comparison.scoreDelta > 0 ? '+' : '';
  lines.push(`  Score:    ${comparison.previousScore} -> ${comparison.currentScore} (${deltaSign}${comparison.scoreDelta})`);
  lines.push(`  Findings: ${comparison.previousFindingsCount} -> ${comparison.currentFindingsCount}`);

  if (comparison.isRegression) {
    lines.push('  Status:   REGRESSION');
  } else if (comparison.scoreDelta > 0) {
    lines.push('  Status:   IMPROVEMENT');
  } else {
    lines.push('  Status:   NO CHANGE');
  }

  if (comparison.newFindings.length > 0) {
    lines.push('');
    lines.push(`  New findings (${comparison.newFindings.length}):`);
    for (const f of comparison.newFindings) {
      lines.push(`    + ${f}`);
    }
  }

  if (comparison.resolvedFindings.length > 0) {
    lines.push('');
    lines.push(`  Resolved findings (${comparison.resolvedFindings.length}):`);
    for (const f of comparison.resolvedFindings) {
      lines.push(`    - ${f}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Progress display
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, string> = {
  'initialize':           'Initializing MCP handshake',
  'initialized':          'Sending initialized notification',
  'tools/list':           'Listing tools',
  'resources/list':       'Listing resources',
  'resources/read':       'Reading resource sample',
  'prompts/list':         'Listing prompts',
  'error-probe-unknown':  'Probing error handling (unknown method)',
  'error-probe-malformed': 'Probing error handling (malformed JSON)',
};

const STATUS_ICONS: Record<string, string> = {
  completed: '✓',
  timeout:   '⏱',
  error:     '✗',
  skipped:   '–',
};

function createProgressHandler(isTTY: boolean, noColor: boolean): (event: ProgressEvent) => void {
  // Only show live progress when outputting to a real terminal
  // (not piped to a file or another process) and not in json/sarif format
  if (!isTTY) {
    return () => {};
  }

  const dim = noColor ? (s: string) => s : (s: string) => `\x1b[2m${s}\x1b[0m`;
  const green = noColor ? (s: string) => s : (s: string) => `\x1b[32m${s}\x1b[0m`;
  const red = noColor ? (s: string) => s : (s: string) => `\x1b[31m${s}\x1b[0m`;
  const yellow = noColor ? (s: string) => s : (s: string) => `\x1b[33m${s}\x1b[0m`;

  return (event: ProgressEvent) => {
    const label = STEP_LABELS[event.step] ?? event.step;

    if (event.phase === 'start') {
      // Overwrite current line with spinner-style indicator
      process.stderr.write(`\r\x1b[K  ◌ ${label}...`);
    } else {
      const icon = STATUS_ICONS[event.status ?? 'completed'] ?? '?';
      const duration = event.durationMs !== undefined ? dim(` (${formatDuration(event.durationMs)})`) : '';

      let coloredIcon: string;
      if (event.status === 'completed') {
        coloredIcon = green(icon);
      } else if (event.status === 'timeout') {
        coloredIcon = yellow(icon);
      } else if (event.status === 'error') {
        coloredIcon = red(icon);
      } else {
        coloredIcon = dim(icon);
      }

      process.stderr.write(`\r\x1b[K  ${coloredIcon} ${label}${duration}\n`);
    }
  };
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ---------------------------------------------------------------------------
// Full verification pipeline
// ---------------------------------------------------------------------------

async function runVerification(
  config: VerificationConfig,
  compareOptions: {
    compareLast?: boolean;
    comparePrevious?: boolean;
    saveAsBaseline?: boolean;
  } = {},
): Promise<void> {
  const startTime = Date.now();

  // 1. Create transport — transport errors exit with code 2
  let transport: Awaited<ReturnType<typeof createTransport>>;
  try {
    transport = createTransport(config.target, config);
  } catch (err: unknown) {
    exitWithError(
      err instanceof Error ? err.message : String(err),
      config.verbose,
      err,
    );
  }

  try {
    // Set up live progress for terminal users
    const isTTY = process.stderr.isTTY === true && config.format === 'terminal';
    const onProgress = createProgressHandler(isTTY, config.noColor);

    if (isTTY) {
      process.stderr.write(`\n  Verifying ${config.target}\n\n`);
    }

    // 2. Execute protocol — partial failures are captured inside the record
    const exchange = await executeProtocol(transport, config, onProgress);

    if (isTTY) {
      process.stderr.write(`\n`);
    }

    // 3. Run conformance checks
    const checkResults = runConformanceChecks(exchange, config);

    // 4. Run security checks
    const securityFindings = runSecurityChecks(exchange, config);

    // 5. Compute scores
    const scoring = computeScores(checkResults, securityFindings, config);
    const exitCode = determineExitCode(scoring, securityFindings, config);

    // 6. Assemble VerificationResult
    const result: VerificationResult = {
      meta: {
        toolVersion: '1.2.2',
        specVersion: '2024-11-05',
        timestamp: new Date().toISOString(),
        target: config.target,
        transport: exchange.transportMetadata.type,
        durationMs: Date.now() - startTime,
        checkMode: config.checkMode,
      },
      conformance: {
        score: scoring.overallScore,
        breakdown: Object.fromEntries(
          scoring.categoryScores.map((c) => [c.category, c.score]),
        ) as Record<ConformanceCategory, number>,
        violations: checkResults.filter((r) => r.level !== 'pass'),
      },
      security: {
        findings: securityFindings.filter((f) => !f.suppressed),
        suppressed: securityFindings.filter((f) => f.suppressed),
      },
      summary: {
        pass: exitCode === 0,
        exitCode,
        blockerCount: countBySeverity(securityFindings),
      },
    };

    // 7. Build the history record for this run
    const historyRecord: HistoryRecord = {
      timestamp: result.meta.timestamp,
      target: config.target,
      conformanceScore: result.conformance.score,
      securityFindingsCount: result.security.findings.length,
      breakdown: result.conformance.breakdown,
      toolVersion: result.meta.toolVersion,
      specVersion: result.meta.specVersion,
    };

    // 8. Determine comparison baseline (before appending this run)
    let comparisonResult: ComparisonResult | null = null;
    const shouldCompare = compareOptions.compareLast === true || compareOptions.comparePrevious === true;

    if (shouldCompare) {
      const historyStorage = new HistoryStorage();
      let previousRecord: HistoryRecord | null = null;

      if (compareOptions.comparePrevious === true) {
        // Bypass baseline — always use the most recent history entry
        previousRecord = historyStorage.getLatestRun(config.target);
      } else {
        // --compare-last: prefer baseline if one exists, else use latest run
        const baseline = getBaseline(config.target);
        previousRecord = baseline ?? historyStorage.getLatestRun(config.target);
      }

      if (previousRecord !== null) {
        comparisonResult = compareRuns(
          previousRecord,
          historyRecord,
          // SecurityFinding details are not stored in HistoryRecord, so we
          // pass empty arrays — count-based comparison still works correctly.
          [],
          result.security.findings,
        );
      }
    }

    // 9. Format and output
    const reporter = createReporter(config);

    if (config.output !== null) {
      // Produce the formatted report content
      let fileReport: string;
      if (config.format === 'json' && comparisonResult !== null && compareOptions.compareLast === true) {
        // Inject comparison data into the JSON report
        const base = JSON.parse(reporter.format(result)) as Record<string, unknown>;
        base['comparison'] = comparisonResult;
        fileReport = JSON.stringify(base, null, 2);
      } else {
        fileReport = reporter.format(result);
      }

      try {
        writeFileSync(config.output, fileReport, 'utf-8');
      } catch (err: unknown) {
        exitWithError(
          `Failed to write output file "${config.output}": ${err instanceof Error ? err.message : String(err)}`,
          config.verbose,
          err,
        );
      }

      // When format is NOT 'terminal', also print a terminal summary to stdout
      if (config.format !== 'terminal') {
        const { TerminalReporter } = await import('./reporters/terminal.js');
        const terminalReporter = new TerminalReporter(config.noColor);
        process.stdout.write(terminalReporter.format(result) + '\n');
      }
      // When format IS 'terminal', the file is the report — no separate stdout output
    } else {
      // Default: print the formatted report to stdout
      const output = reporter.format(result);
      process.stdout.write(output + '\n');
    }

    // 10. Print comparison section to stdout (after report output)
    if (shouldCompare) {
      if (comparisonResult !== null) {
        process.stdout.write(formatComparisonOutput(comparisonResult));
      } else {
        process.stdout.write(`\nNo previous run found for ${config.target}\n`);
      }
    }

    // 11. Persist run to history (unless --no-history was set)
    if (!config.noHistory) {
      const historyStorage = new HistoryStorage();
      historyStorage.appendRun(config.target, historyRecord);
    }

    // 12. Optionally save as baseline
    if (compareOptions.saveAsBaseline === true) {
      saveBaseline(config.target, historyRecord);
    }

    // 13. Exit with appropriate code
    process.exit(exitCode);
  } finally {
    await transport.close();
  }
}

// ---------------------------------------------------------------------------
// Argument parsers / validators
// ---------------------------------------------------------------------------

export function parseTimeout(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new InvalidArgumentError(
      `--timeout must be a positive integer (got: ${value})`,
    );
  }
  return parsed;
}

export function parseFormat(
  value: string,
): 'terminal' | 'json' | 'markdown' | 'sarif' {
  const allowed = ['terminal', 'json', 'markdown', 'sarif'] as const;
  if (!(allowed as readonly string[]).includes(value)) {
    throw new InvalidArgumentError(
      `--format must be one of: ${allowed.join(', ')} (got: ${value})`,
    );
  }
  return value as 'terminal' | 'json' | 'markdown' | 'sarif';
}

export function parseTransport(value: string): 'http' | 'stdio' {
  const allowed = ['http', 'stdio'] as const;
  if (!(allowed as readonly string[]).includes(value)) {
    throw new InvalidArgumentError(
      `--transport must be one of: ${allowed.join(', ')} (got: ${value})`,
    );
  }
  return value as 'http' | 'stdio';
}

export function parseFailOnSeverity(
  value: string,
): 'critical' | 'high' | 'medium' | 'low' | 'none' {
  const allowed = ['critical', 'high', 'medium', 'low', 'none'] as const;
  if (!(allowed as readonly string[]).includes(value)) {
    throw new InvalidArgumentError(
      `--fail-on-severity must be one of: ${allowed.join(', ')} (got: ${value})`,
    );
  }
  return value as 'critical' | 'high' | 'medium' | 'low' | 'none';
}

export function parseConformanceThreshold(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    throw new InvalidArgumentError(
      `--conformance-threshold must be an integer between 0 and 100 (got: ${value})`,
    );
  }
  return parsed;
}

export function parsePort(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new InvalidArgumentError(
      `--port must be an integer between 1 and 65535 (got: ${value})`,
    );
  }
  return parsed;
}

export function parseHeader(
  value: string,
  previous: Record<string, string>,
): Record<string, string> {
  const colonIndex = value.indexOf(':');
  if (colonIndex === -1) {
    throw new InvalidArgumentError(
      `--header must be in "Name: Value" format (got: ${value})`,
    );
  }
  const name = value.slice(0, colonIndex).trim();
  const headerValue = value.slice(colonIndex + 1).trim();
  if (name.length === 0) {
    throw new InvalidArgumentError(
      `--header name must not be empty (got: ${value})`,
    );
  }
  return { ...previous, [name]: headerValue };
}

// ---------------------------------------------------------------------------
// Shared exitOverride handler
// Maps Commander's internal error/help/version exits to our ExitCode enum.
// ---------------------------------------------------------------------------

function applyExitOverride(cmd: Command): void {
  // Suppress Commander's built-in "error: ..." stderr line so we can write
  // our own "Error: ..." format instead.
  cmd.configureOutput({
    writeErr: () => {
      // intentionally suppressed — we write our own message in exitOverride
    },
  });

  cmd.exitOverride((err) => {
    if (
      err.code === 'commander.helpDisplayed' ||
      err.code === 'commander.version'
    ) {
      process.exit(ExitCode.PASS);
    }
    // All other Commander errors (invalid argument, missing required, etc.)
    // Strip Commander's "error: " prefix if present so we can apply our own.
    const raw = err.message.replace(/^error:\s*/i, '');
    process.stderr.write(`Error: ${raw}\n`);
    process.exit(ExitCode.ERROR);
  });
}

// ---------------------------------------------------------------------------
// CLI program builder
// ---------------------------------------------------------------------------

export function buildProgram(): Command {
  const program = new Command();

  program
    .name('mcp-verify')
    .description(
      'Verify MCP servers for spec conformance, security vulnerabilities, and health metrics',
    )
    // Custom version string
    .version(
      'mcp-verify 1.2.2 (validates MCP spec 2024-11-05)',
      '-V, --version',
      'Output the version number',
    )
    .addHelpText(
      'after',
      `
Examples:
  mcp-verify https://example.com/mcp
  mcp-verify verify https://example.com/mcp --format json
  mcp-verify verify ./my-server --timeout 30000
`,
    );

  applyExitOverride(program);

  // Default verify command — isDefault means bare `mcp-verify <target>` works (S-1-05)
  const verifyCmd = program
    .command('verify <target>', { isDefault: true })
    .description('Verify an MCP server at <target> (URL or stdio command)')
    .option(
      '--timeout <ms>',
      'Connection and response timeout in milliseconds',
      parseTimeout,
      DEFAULT_CONFIG.timeout,
    )
    .option('--no-color', 'Disable colored output')
    .option(
      '--format <type>',
      'Output format: terminal | json | markdown | sarif',
      parseFormat,
      DEFAULT_CONFIG.format,
    )
    .option(
      '--config <path>',
      'Path to config file (default: auto-discover mcp-verify.json or .mcp-verify.json)',
    )
    .option('--strict', 'Set check mode to strict')
    .option('--lenient', 'Set check mode to lenient')
    .option('--verbose', 'Enable verbose output')
    .option(
      '--output <path>',
      'Write formatted report to file instead of stdout',
    )
    .option(
      '--transport <type>',
      'Force transport type: http | stdio',
      parseTransport,
    )
    .option(
      '--fail-on-severity <level>',
      'Minimum severity level to fail on: critical | high | medium | low | none',
      parseFailOnSeverity,
      DEFAULT_CONFIG.failOnSeverity,
    )
    .option(
      '--conformance-threshold <score>',
      'Minimum conformance score (0–100)',
      parseConformanceThreshold,
      DEFAULT_CONFIG.conformanceThreshold,
    )
    .option('--no-history', 'Skip saving this run to history storage')
    .option(
      '--compare-last',
      'After verification, compare with baseline (if set) or the previous run',
    )
    .option(
      '--compare-previous',
      'After verification, compare with immediately previous run (bypasses baseline)',
    )
    .option(
      '-H, --header <key:value>',
      'Custom HTTP header in "Name: Value" format (repeatable)',
      parseHeader,
      {},
    )
    .addHelpText(
      'after',
      `
Examples:
  mcp-verify https://example.com/mcp
  mcp-verify verify https://example.com/mcp --format json
  mcp-verify verify ./my-server --timeout 30000
  mcp-verify verify https://example.com/mcp --no-color --format sarif
  mcp-verify verify https://example.com/mcp --compare-last
  mcp-verify verify https://example.com/mcp -H "Authorization: Bearer <token>"
`,
    );

  applyExitOverride(verifyCmd);

  verifyCmd.action(
    async (
      target: string,
      options: {
        timeout: number;
        color: boolean;
        format: 'terminal' | 'json' | 'markdown' | 'sarif';
        config?: string;
        strict?: boolean;
        lenient?: boolean;
        verbose?: boolean;
        output?: string;
        transport?: 'http' | 'stdio';
        failOnSeverity: 'critical' | 'high' | 'medium' | 'low' | 'none';
        conformanceThreshold: number;
        history: boolean;
        compareLast?: boolean;
        comparePrevious?: boolean;
        header: Record<string, string>;
      },
    ) => {
      // Mutual exclusion: --strict and --lenient cannot both be set
      if (options.strict && options.lenient) {
        process.stderr.write(
          'Error: --strict and --lenient are mutually exclusive\n',
        );
        process.exit(ExitCode.ERROR);
      }

      // Determine checkMode from flags
      let checkMode: 'strict' | 'balanced' | 'lenient' | undefined;
      if (options.strict) {
        checkMode = 'strict';
      } else if (options.lenient) {
        checkMode = 'lenient';
      }

      // Load config file (auto-discover or explicit path)
      const fileConfig = loadConfigFile(options.config);

      // Build CLI options partial — only include fields that were explicitly set
      const cliOptions: Partial<Omit<VerificationConfig, 'target'>> = {
        timeout: options.timeout,
        noColor: !options.color,
        format: options.format,
        failOnSeverity: options.failOnSeverity,
        conformanceThreshold: options.conformanceThreshold,
        // Commander's --no-history sets options.history = false; absence = true.
        noHistory: !options.history,
      };

      if (checkMode !== undefined) {
        cliOptions.checkMode = checkMode;
      }
      if (options.verbose === true) {
        cliOptions.verbose = true;
      }
      if (options.output !== undefined) {
        cliOptions.output = options.output;
      }
      if (options.transport !== undefined) {
        cliOptions.transport = options.transport;
      }
      if (Object.keys(options.header).length > 0) {
        cliOptions.headers = options.header;
      }

      // Merge CLI options, file config, and defaults into final config
      const config = mergeConfig(cliOptions, fileConfig, target);

      try {
        await runVerification(config, {
          compareLast: options.compareLast === true,
          comparePrevious: options.comparePrevious === true,
        });
      } catch (err: unknown) {
        exitWithError(
          err instanceof Error ? err.message : String(err),
          config.verbose,
          err,
        );
      }
    },
  );

  // ---------------------------------------------------------------------------
  // baseline command (FR-073)
  // ---------------------------------------------------------------------------

  const baselineCmd = program
    .command('baseline <target>')
    .description('Run verification and store the result as a baseline for <target>')
    .option(
      '--existing',
      'Promote the most recent history entry as baseline without running verification',
    )
    .option(
      '--timeout <ms>',
      'Connection and response timeout in milliseconds',
      parseTimeout,
      DEFAULT_CONFIG.timeout,
    )
    .option('--no-color', 'Disable colored output')
    .option(
      '--format <type>',
      'Output format: terminal | json | markdown | sarif',
      parseFormat,
      DEFAULT_CONFIG.format,
    )
    .option(
      '--config <path>',
      'Path to config file (default: auto-discover mcp-verify.json or .mcp-verify.json)',
    )
    .option('--strict', 'Set check mode to strict')
    .option('--lenient', 'Set check mode to lenient')
    .option('--verbose', 'Enable verbose output')
    .option(
      '--output <path>',
      'Write formatted report to file instead of stdout',
    )
    .option(
      '--transport <type>',
      'Force transport type: http | stdio',
      parseTransport,
    )
    .option(
      '--fail-on-severity <level>',
      'Minimum severity level to fail on: critical | high | medium | low | none',
      parseFailOnSeverity,
      DEFAULT_CONFIG.failOnSeverity,
    )
    .option(
      '--conformance-threshold <score>',
      'Minimum conformance score (0–100)',
      parseConformanceThreshold,
      DEFAULT_CONFIG.conformanceThreshold,
    )
    .option(
      '-H, --header <key:value>',
      'Custom HTTP header in "Name: Value" format (repeatable)',
      parseHeader,
      {},
    )
    .addHelpText(
      'after',
      `
Examples:
  mcp-verify baseline https://example.com/mcp
  mcp-verify baseline --existing https://example.com/mcp
`,
    );

  applyExitOverride(baselineCmd);

  baselineCmd.action(
    async (
      target: string,
      options: {
        existing?: boolean;
        timeout: number;
        color: boolean;
        format: 'terminal' | 'json' | 'markdown' | 'sarif';
        config?: string;
        strict?: boolean;
        lenient?: boolean;
        verbose?: boolean;
        output?: string;
        transport?: 'http' | 'stdio';
        failOnSeverity: 'critical' | 'high' | 'medium' | 'low' | 'none';
        conformanceThreshold: number;
        header: Record<string, string>;
      },
    ) => {
      if (options.existing === true) {
        // Promote the latest history entry to baseline without running verification
        const historyStorage = new HistoryStorage();
        const latest = historyStorage.getLatestRun(target);

        if (latest === null) {
          process.stderr.write(
            `Error: No history found for "${target}". Run a verification first.\n`,
          );
          process.exit(ExitCode.ERROR);
        }

        try {
          saveBaseline(target, latest);
        } catch (err: unknown) {
          exitWithError(
            err instanceof Error ? err.message : String(err),
            options.verbose === true,
            err,
          );
        }

        process.stdout.write(
          `Baseline saved for "${target}" (score: ${latest.conformanceScore}, timestamp: ${latest.timestamp})\n`,
        );
        process.exit(ExitCode.PASS);
      }

      // Run full verification pipeline, then save result as baseline
      if (options.strict && options.lenient) {
        process.stderr.write(
          'Error: --strict and --lenient are mutually exclusive\n',
        );
        process.exit(ExitCode.ERROR);
      }

      let checkMode: 'strict' | 'balanced' | 'lenient' | undefined;
      if (options.strict) {
        checkMode = 'strict';
      } else if (options.lenient) {
        checkMode = 'lenient';
      }

      const fileConfig = loadConfigFile(options.config);

      const cliOptions: Partial<Omit<VerificationConfig, 'target'>> = {
        timeout: options.timeout,
        noColor: !options.color,
        format: options.format,
        failOnSeverity: options.failOnSeverity,
        conformanceThreshold: options.conformanceThreshold,
      };

      if (checkMode !== undefined) {
        cliOptions.checkMode = checkMode;
      }
      if (options.verbose === true) {
        cliOptions.verbose = true;
      }
      if (options.output !== undefined) {
        cliOptions.output = options.output;
      }
      if (options.transport !== undefined) {
        cliOptions.transport = options.transport;
      }
      if (Object.keys(options.header).length > 0) {
        cliOptions.headers = options.header;
      }

      const config = mergeConfig(cliOptions, fileConfig, target);

      try {
        await runVerification(config, { saveAsBaseline: true });
      } catch (err: unknown) {
        exitWithError(
          err instanceof Error ? err.message : String(err),
          config.verbose,
          err,
        );
      }
    },
  );

  // ---------------------------------------------------------------------------
  // history command group (FR-072 export sub-feature)
  // ---------------------------------------------------------------------------

  const historyCmd = program
    .command('history')
    .description('Manage run history');

  applyExitOverride(historyCmd);

  const historyExportCmd = historyCmd
    .command('export [target]')
    .description('Export run history as JSON')
    .option('--all', 'Export history for all tracked targets')
    .option(
      '--output <path>',
      'Write exported history to a file instead of stdout',
    )
    .addHelpText(
      'after',
      `
Examples:
  mcp-verify history export https://example.com/mcp --output history.json
  mcp-verify history export --all --output all-history.json
`,
    );

  applyExitOverride(historyExportCmd);

  historyExportCmd.action(
    (
      target: string | undefined,
      options: {
        all?: boolean;
        output?: string;
      },
    ) => {
      const historyStorage = new HistoryStorage();

      if (options.all !== true && (target === undefined || target.trim() === '')) {
        process.stderr.write(
          'Error: Provide a <target> argument or use --all to export all targets\n',
        );
        process.exit(ExitCode.ERROR);
      }

      let records: HistoryRecord[];
      let targetsExported: string[];

      if (options.all === true) {
        targetsExported = historyStorage.getAllTargets();
        records = targetsExported.flatMap((t) => historyStorage.getHistory(t));
      } else {
        // target is guaranteed non-empty here
        const t = target as string;
        targetsExported = [t];
        records = historyStorage.getHistory(t);
      }

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        toolVersion: '1.2.2',
        targets: targetsExported,
        runs: records,
      };

      const json = JSON.stringify(exportPayload, null, 2) + '\n';

      if (options.output !== undefined) {
        try {
          writeFileSync(options.output, json, 'utf-8');
        } catch (err: unknown) {
          exitWithError(
            `Failed to write output file "${options.output}": ${err instanceof Error ? err.message : String(err)}`,
          );
        }
        process.stdout.write(`History exported to "${options.output}"\n`);
      } else {
        process.stdout.write(json);
      }

      process.exit(ExitCode.PASS);
    },
  );

  // ---------------------------------------------------------------------------
  // serve command (S-4-04, FR-066)
  // ---------------------------------------------------------------------------

  const serveCmd = program
    .command('serve')
    .description('Start the local web dashboard')
    .option(
      '--port <number>',
      'Port to listen on (default: 4000)',
      parsePort,
      4000,
    )
    .addHelpText(
      'after',
      `
Examples:
  mcp-verify serve
  mcp-verify serve --port 8080
`,
    );

  applyExitOverride(serveCmd);

  serveCmd.action(async (options: { port: number }) => {
    try {
      await startDashboard(options.port);
      // Keep the process alive until SIGINT (handled inside startDashboard)
      await new Promise<void>(() => {
        /* intentionally never resolves — server runs until SIGINT */
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`Error: ${message}\n`);
      process.exit(ExitCode.ERROR);
    }
  });

  return program;
}

// ---------------------------------------------------------------------------
// main()
// ---------------------------------------------------------------------------

export async function main(argv: string[]): Promise<void> {
  const program = buildProgram();

  // Missing-target guard: bare `mcp-verify` with no args → print help, exit 2 (S-1-05)
  const effectiveArgs = argv.slice(2);
  if (effectiveArgs.length === 0) {
    program.outputHelp();
    process.exit(ExitCode.ERROR);
  }

  await program.parseAsync(argv);
}

// ---------------------------------------------------------------------------
// Module-level entry point — only executes when run directly (not imported)
// ---------------------------------------------------------------------------

const isMain = process.argv[1] !== undefined &&
  (process.argv[1].endsWith('cli.js') || process.argv[1].endsWith('cli.cjs'));

if (isMain) {
  main(process.argv).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`Error: ${message}\n`);
    process.exit(ExitCode.ERROR);
  });
}
