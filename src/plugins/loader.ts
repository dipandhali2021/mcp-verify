/**
 * Plugin Loader (FR-076, FR-077)
 *
 * Discovers and loads plugin definitions from a JS config file.
 *
 * Config file resolution order:
 *   1. mcp-verify.config.js   (CJS or ESM)
 *   2. mcp-verify.config.mjs  (ESM)
 *   3. mcp-verify.config.cjs  (CJS)
 *
 * Expected config file shape:
 * ```js
 * export default {
 *   plugins: ['./rules/my-check.js', 'some-npm-package'],
 *   rules: {
 *     'my-check': { someOption: true },
 *   },
 * };
 * ```
 */

import { existsSync } from 'node:fs';
import { resolve, dirname, isAbsolute } from 'node:path';
import { createRequire } from 'node:module';
import type { PluginDefinition } from './types.js';

// ---------------------------------------------------------------------------
// Config file shape
// ---------------------------------------------------------------------------

export interface PluginConfig {
  /** Array of plugin specifiers: relative paths or npm package names. */
  plugins?: string[];
  /**
   * Per-plugin configuration. Keys are plugin IDs; values are passed to the
   * plugin's `check()` function as `context.config`.
   */
  rules?: Record<string, Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Candidate config file names
// ---------------------------------------------------------------------------

const CONFIG_CANDIDATES = [
  'mcp-verify.config.js',
  'mcp-verify.config.mjs',
  'mcp-verify.config.cjs',
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a plugin specifier to an absolute path or package name that can be
 * passed to dynamic `import()`.
 *
 * - Relative paths (`.` or `..` prefix) → resolved relative to `configDir`.
 * - Absolute paths → used as-is.
 * - Bare names (npm packages) → resolved using require.resolve from `configDir`.
 */
function resolveSpecifier(specifier: string, configDir: string): string {
  if (specifier.startsWith('./') || specifier.startsWith('../') || isAbsolute(specifier)) {
    return resolve(configDir, specifier);
  }

  // npm package: use require.resolve so we can find it from the config's
  // node_modules rather than from our own installation directory.
  try {
    const req = createRequire(resolve(configDir, '__stub__.js'));
    return req.resolve(specifier);
  } catch {
    // Fall back to returning the specifier as-is; dynamic import will fail
    // with a meaningful error that we catch downstream.
    return specifier;
  }
}

/**
 * Type-guard for a valid PluginDefinition exported from a plugin module.
 * Prints a warning to stderr and returns `false` for invalid plugins.
 */
function validatePlugin(
  candidate: unknown,
  specifier: string,
): candidate is PluginDefinition {
  if (typeof candidate !== 'object' || candidate === null) {
    process.stderr.write(
      `Warning: Plugin "${specifier}" did not export a valid plugin object — skipping.\n`,
    );
    return false;
  }

  const obj = candidate as Record<string, unknown>;
  const missing: string[] = [];

  if (typeof obj['id'] !== 'string' || obj['id'].length === 0) missing.push('id');
  if (typeof obj['name'] !== 'string' || obj['name'].length === 0) missing.push('name');
  if (typeof obj['description'] !== 'string' || obj['description'].length === 0) missing.push('description');
  if (typeof obj['version'] !== 'string' || obj['version'].length === 0) missing.push('version');
  if (typeof obj['check'] !== 'function') missing.push('check');

  if (missing.length > 0) {
    process.stderr.write(
      `Warning: Plugin "${specifier}" is missing required fields: ${missing.join(', ')} — skipping.\n`,
    );
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface LoadedPlugins {
  plugins: PluginDefinition[];
  rules: Record<string, Record<string, unknown>>;
}

/**
 * Discover the plugin config file and load all declared plugins.
 *
 * @param cwd - Working directory for config file discovery (defaults to
 *              `process.cwd()`). Exposed for testing.
 * @returns Object with loaded plugin definitions and their rule configs.
 */
export async function loadPlugins(
  cwd: string = process.cwd(),
): Promise<LoadedPlugins> {
  // Locate config file
  let configPath: string | undefined;
  for (const candidate of CONFIG_CANDIDATES) {
    const full = resolve(cwd, candidate);
    if (existsSync(full)) {
      configPath = full;
      break;
    }
  }

  if (configPath === undefined) {
    return { plugins: [], rules: {} };
  }

  const configDir = dirname(configPath);

  // Dynamically import the config file
  let rawConfig: unknown;
  try {
    const imported = await import(configPath) as Record<string, unknown>;
    // Support both `export default` (ESM) and `module.exports` (CJS interop)
    rawConfig = imported['default'] ?? imported;
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `Error: Failed to load plugin config file "${configPath}": ${detail}\n`,
    );
    return { plugins: [], rules: {} };
  }

  if (typeof rawConfig !== 'object' || rawConfig === null) {
    process.stderr.write(
      `Error: Plugin config file "${configPath}" must export an object.\n`,
    );
    return { plugins: [], rules: {} };
  }

  const config = rawConfig as Record<string, unknown>;

  // Extract plugin specifiers
  const specifiers: string[] = [];
  if (Array.isArray(config['plugins'])) {
    for (const item of config['plugins']) {
      if (typeof item === 'string') {
        specifiers.push(item);
      }
    }
  }

  // Extract rules
  const rules: Record<string, Record<string, unknown>> = {};
  if (typeof config['rules'] === 'object' && config['rules'] !== null && !Array.isArray(config['rules'])) {
    const rawRules = config['rules'] as Record<string, unknown>;
    for (const [key, value] of Object.entries(rawRules)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        rules[key] = value as Record<string, unknown>;
      }
    }
  }

  if (specifiers.length === 0) {
    return { plugins: [], rules };
  }

  // Load each plugin
  const plugins: PluginDefinition[] = [];

  for (const specifier of specifiers) {
    const resolved = resolveSpecifier(specifier, configDir);

    let pluginExport: unknown;
    try {
      const imported = await import(resolved) as Record<string, unknown>;
      pluginExport = imported['default'] ?? imported;
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : String(err);
      process.stderr.write(
        `Warning: Failed to load plugin "${specifier}": ${detail} — skipping.\n`,
      );
      continue;
    }

    if (validatePlugin(pluginExport, specifier)) {
      plugins.push(pluginExport);
    }
  }

  return { plugins, rules };
}
