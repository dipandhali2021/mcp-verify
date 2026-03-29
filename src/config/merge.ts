/**
 * Config merge utility for mcp-verify.
 *
 * Precedence (highest to lowest):
 *   1. CLI flags  (cliOptions)
 *   2. Config file (fileConfig)
 *   3. Built-in defaults (DEFAULT_CONFIG)
 *
 * The `skip` field receives special treatment: config-file skip entries are
 * converted to plain check-ID strings (VerificationConfig.skip is string[])
 * unless the CLI has supplied its own skip list, in which case the CLI list
 * takes full precedence.
 */

import { DEFAULT_CONFIG } from '../types/config.js';
import type { VerificationConfig } from '../types/config.js';
import type { ConfigFile } from './loader.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Merge CLI options, file config, and built-in defaults into a complete
 * `VerificationConfig`.
 *
 * @param cliOptions  - Partial config derived from parsed CLI flags. A field
 *                      is considered "set by the CLI" only when it is not
 *                      `undefined`.
 * @param fileConfig  - Parsed config file, or `null` if no file was found.
 * @param target      - The required `target` value (always sourced from CLI).
 */
export function mergeConfig(
  cliOptions: Partial<Omit<VerificationConfig, 'target'>>,
  fileConfig: ConfigFile | null,
  target: string,
): VerificationConfig {
  // Build the skip list.
  // - If the CLI provided skip entries, use them verbatim.
  // - Otherwise, flatten config-file SkipEntry objects to their checkId strings.
  // - Fall back to the default (empty array).
  const skip: string[] =
    cliOptions.skip !== undefined
      ? cliOptions.skip
      : fileConfig?.skip !== undefined
        ? fileConfig.skip.map((e) => e.checkId)
        : DEFAULT_CONFIG.skip;

  // Build the skipJustifications map from the config file's SkipEntry objects.
  // CLI-only skip entries have no justification so the map stays empty in that case.
  const skipJustifications: Record<string, string> =
    cliOptions.skipJustifications !== undefined
      ? cliOptions.skipJustifications
      : fileConfig?.skip !== undefined
        ? Object.fromEntries(
            fileConfig.skip
              .filter((e) => e.justification !== undefined)
              .map((e) => [e.checkId, e.justification as string]),
          )
        : DEFAULT_CONFIG.skipJustifications;

  return {
    target,

    // timeout
    timeout:
      cliOptions.timeout !== undefined
        ? cliOptions.timeout
        : fileConfig?.timeout !== undefined
          ? fileConfig.timeout
          : DEFAULT_CONFIG.timeout,

    // format
    format:
      cliOptions.format !== undefined
        ? cliOptions.format
        : fileConfig?.format !== undefined
          ? fileConfig.format
          : DEFAULT_CONFIG.format,

    // transport
    transport:
      cliOptions.transport !== undefined
        ? cliOptions.transport
        : fileConfig?.transport !== undefined
          ? fileConfig.transport
          : DEFAULT_CONFIG.transport,

    // failOnSeverity
    failOnSeverity:
      cliOptions.failOnSeverity !== undefined
        ? cliOptions.failOnSeverity
        : fileConfig?.failOnSeverity !== undefined
          ? fileConfig.failOnSeverity
          : DEFAULT_CONFIG.failOnSeverity,

    // conformanceThreshold
    conformanceThreshold:
      cliOptions.conformanceThreshold !== undefined
        ? cliOptions.conformanceThreshold
        : fileConfig?.conformanceThreshold !== undefined
          ? fileConfig.conformanceThreshold
          : DEFAULT_CONFIG.conformanceThreshold,

    // skip (resolved above)
    skip,

    // skipJustifications (resolved above)
    skipJustifications,

    // checkMode
    checkMode:
      cliOptions.checkMode !== undefined
        ? cliOptions.checkMode
        : fileConfig?.checkMode !== undefined
          ? fileConfig.checkMode
          : DEFAULT_CONFIG.checkMode,

    // noColor — not present in config file; sourced from CLI or default
    noColor:
      cliOptions.noColor !== undefined
        ? cliOptions.noColor
        : DEFAULT_CONFIG.noColor,

    // verbose
    verbose:
      cliOptions.verbose !== undefined
        ? cliOptions.verbose
        : fileConfig?.verbose !== undefined
          ? fileConfig.verbose
          : DEFAULT_CONFIG.verbose,

    // output
    output:
      cliOptions.output !== undefined
        ? cliOptions.output
        : fileConfig?.output !== undefined
          ? fileConfig.output
          : DEFAULT_CONFIG.output,

    // noHistory — not present in config file; sourced from CLI or default
    noHistory:
      cliOptions.noHistory !== undefined
        ? cliOptions.noHistory
        : DEFAULT_CONFIG.noHistory,

    // headers — shallow merge: file headers as base, CLI headers override per-name
    headers: {
      ...(fileConfig?.headers ?? {}),
      ...(cliOptions.headers ?? {}),
    } as Record<string, string>,
  };
}
