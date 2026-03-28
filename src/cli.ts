import { Command, InvalidArgumentError } from 'commander';
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
import { createReporter } from './reporters/index.js';

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

    // 4. Security findings placeholder (Sprint 2)
    const securityFindings: SecurityFinding[] = [];

    // 5. Compute scores
    const scoring = computeScores(checkResults, securityFindings, config);
    const exitCode = determineExitCode(scoring, securityFindings, config);

    // 6. Assemble VerificationResult
    const result: VerificationResult = {
      meta: {
        toolVersion: '0.1.0-alpha',
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
        blockerCount: { critical: 0, high: 0, medium: 0, low: 0 },
      },
    };

    // 7. Format and output
    const reporter = createReporter(config);
    const output = reporter.format(result);
    process.stdout.write(output + '\n');

    // 8. Exit with appropriate code
    process.exit(exitCode);
  } finally {
    await transport.close();
  }
}

// ---------------------------------------------------------------------------
// Argument parsers / validators
// ---------------------------------------------------------------------------

function parseTimeout(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new InvalidArgumentError(
      `--timeout must be a positive integer (got: ${value})`,
    );
  }
  return parsed;
}

function parseFormat(
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

function buildProgram(): Command {
  const program = new Command();

  program
    .name('mcp-verify')
    .description(
      'Verify MCP servers for spec conformance, security vulnerabilities, and health metrics',
    )
    // Custom version string (S-1-06)
    .version(
      'mcp-verify 0.1.0-alpha (validates MCP spec 2024-11-05)',
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
      },
    ) => {
      const config: VerificationConfig = {
        ...DEFAULT_CONFIG,
        target,
        timeout: options.timeout,
        noColor: !options.color,
        format: options.format,
      };

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
// Module-level entry point
// ---------------------------------------------------------------------------

main(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(ExitCode.ERROR);
});
