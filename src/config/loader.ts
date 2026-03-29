/**
 * Config file loader for mcp-verify.
 *
 * Auto-discovers and loads configuration from:
 *   1. An explicit path provided via --config <path>
 *   2. ./mcp-verify.json in the current working directory
 *   3. ./.mcp-verify.json in the current working directory
 *
 * The loaded file must be valid JSON. If the explicit path is provided but the
 * file does not exist, or if the file contains invalid JSON, the process exits
 * with code 2 and writes a descriptive message to stderr.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single skip entry in the config file. The `justification` field is
 * optional and is recorded for audit purposes.
 */
export interface SkipEntry {
  checkId: string;
  justification?: string;
}

/**
 * Shape of the JSON config file. All fields are optional — only the ones
 * present in the file will override the defaults.
 *
 * This is intentionally separate from VerificationConfig so that the `skip`
 * field can use the richer SkipEntry shape rather than plain strings.
 */
export interface ConfigFile {
  timeout?: number;
  format?: 'terminal' | 'json' | 'markdown' | 'sarif';
  transport?: 'http' | 'stdio' | null;
  failOnSeverity?: 'critical' | 'high' | 'medium' | 'low' | 'none';
  conformanceThreshold?: number;
  skip?: SkipEntry[];
  checkMode?: 'strict' | 'balanced' | 'lenient';
  verbose?: boolean;
  output?: string | null;
  headers?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Candidate filenames for auto-discovery
// ---------------------------------------------------------------------------

const AUTO_DISCOVER_FILENAMES = ['mcp-verify.json', '.mcp-verify.json'] as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Parse raw file contents as JSON and return a ConfigFile. Exits with code 2
 * on invalid JSON.
 */
function parseConfigFile(raw: string, filePath: string): ConfigFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `Error: Config file "${filePath}" contains invalid JSON: ${detail}\n`,
    );
    process.exit(2);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    process.stderr.write(
      `Error: Config file "${filePath}" must be a JSON object at the top level.\n`,
    );
    process.exit(2);
  }

  // Return the parsed object cast to ConfigFile. Field-level validation is
  // intentionally kept minimal — unknown keys are ignored and the merge step
  // only consumes known fields.
  return parsed as ConfigFile;
}

/**
 * Read and parse the config file at `filePath`. The file must exist. Exits
 * with code 2 on any read or parse error.
 */
function readAndParse(filePath: string): ConfigFile {
  const raw = readFileSync(filePath, 'utf-8');
  return parseConfigFile(raw, filePath);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load a config file and return its contents as a `ConfigFile`.
 *
 * Resolution order:
 *   1. If `configPath` is provided, load that exact file. Exit with code 2 if
 *      the file does not exist or cannot be parsed.
 *   2. Otherwise, check `./mcp-verify.json` then `./.mcp-verify.json` in the
 *      current working directory. The first match is used.
 *   3. If no config file is found at all, return `null`.
 *
 * @param configPath - Explicit path supplied via `--config <path>`.
 * @param cwd        - Working directory to use for auto-discovery (defaults to
 *                     `process.cwd()`). Exposed as a parameter to facilitate
 *                     testing without mutating the process environment.
 */
export function loadConfigFile(
  configPath?: string,
  cwd: string = process.cwd(),
): ConfigFile | null {
  // --- Explicit path ---
  if (configPath !== undefined) {
    const resolved = resolve(cwd, configPath);
    if (!existsSync(resolved)) {
      process.stderr.write(
        `Error: Config file not found: "${resolved}"\n`,
      );
      process.exit(2);
    }
    return readAndParse(resolved);
  }

  // --- Auto-discovery ---
  for (const filename of AUTO_DISCOVER_FILENAMES) {
    const candidate = resolve(cwd, filename);
    if (existsSync(candidate)) {
      return readAndParse(candidate);
    }
  }

  return null;
}
