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
import { runConformanceChecks } from './validators/conformance/index.js';
import { computeScores, determineExitCode } from './scoring/index.js';
import { runSecurityChecks } from './validators/security/index.js';
import { createReporter } from './reporters/index.js';
import { loadConfigFile, mergeConfig } from './config/index.js';
import { HistoryStorage } from './history/index.js';
import type { HistoryRecord } from './history/index.js';

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
// Full verification pipeline
// ---------------------------------------------------------------------------

async function runVerification(config: VerificationConfig): Promise<void> {
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
    // 2. Execute protocol — partial failures are captured inside the record
    const exchange = await executeProtocol(transport, config);

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
        toolVersion: '1.0.0',
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

    // 7. Format and output
    const reporter = createReporter(config);

    if (config.output !== null) {
      // Write the formatted report (in requested format) to the output file
      const fileReport = reporter.format(result);
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

    // 8. Persist run to history (unless --no-history was set)
    if (!config.noHistory) {
      const historyRecord: HistoryRecord = {
        timestamp: result.meta.timestamp,
        target: config.target,
        conformanceScore: result.conformance.score,
        securityFindingsCount: result.security.findings.length,
        breakdown: result.conformance.breakdown,
        toolVersion: result.meta.toolVersion,
        specVersion: result.meta.specVersion,
      };
      const historyStorage = new HistoryStorage();
      historyStorage.appendRun(config.target, historyRecord);
    }

    // 9. Exit with appropriate code
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
      'mcp-verify 1.0.0 (validates MCP spec 2024-11-05)',
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
    .addHelpText(
      'after',
      `
Examples:
  mcp-verify https://example.com/mcp
  mcp-verify verify https://example.com/mcp --format json
  mcp-verify verify ./my-server --timeout 30000
  mcp-verify verify https://example.com/mcp --no-color --format sarif
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

      // Merge CLI options, file config, and defaults into final config
      const config = mergeConfig(cliOptions, fileConfig, target);

      try {
        await runVerification(config);
      } catch (err: unknown) {
        exitWithError(
          err instanceof Error ? err.message : String(err),
          config.verbose,
          err,
        );
      }
    },
  );

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
