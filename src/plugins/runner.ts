/**
 * Plugin Runner (FR-078)
 *
 * Executes each loaded plugin's `check()` function with a 30-second timeout.
 * Isolates failures — a crashing or timed-out plugin does NOT abort the run.
 */

import type { PluginDefinition, PluginContext, PluginFinding } from './types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLUGIN_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Wraps a plugin's `check()` call in a race against a 30-second timeout.
 * Returns the findings on success, or `null` on timeout / thrown error.
 */
async function runWithTimeout(
  plugin: PluginDefinition,
  context: PluginContext,
): Promise<PluginFinding[] | null> {
  return new Promise<PluginFinding[] | null>((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        process.stderr.write(
          `Warning: Plugin "${plugin.id}" timed out after ${PLUGIN_TIMEOUT_MS}ms — skipping.\n`,
        );
        resolve(null);
      }
    }, PLUGIN_TIMEOUT_MS);

    // Ensure the timer doesn't keep the process alive
    if (typeof timer.unref === 'function') {
      timer.unref();
    }

    let checkPromise: Promise<PluginFinding[]>;
    try {
      checkPromise = plugin.check(context);
    } catch (syncErr: unknown) {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        const detail = syncErr instanceof Error ? syncErr.message : String(syncErr);
        process.stderr.write(
          `Warning: Plugin "${plugin.id}" threw synchronously: ${detail} — skipping.\n`,
        );
        resolve(null);
      }
      return;
    }

    checkPromise.then(
      (findings) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(findings);
        }
      },
      (asyncErr: unknown) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          const detail = asyncErr instanceof Error ? asyncErr.message : String(asyncErr);
          process.stderr.write(
            `Warning: Plugin "${plugin.id}" check() rejected: ${detail} — skipping.\n`,
          );
          resolve(null);
        }
      },
    );
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run all plugins and return the merged array of findings from successful ones.
 *
 * @param plugins - Loaded plugin definitions.
 * @param context - Runtime context derived from the protocol exchange.
 * @returns Flat array of findings from all successful plugins.
 */
export async function runPlugins(
  plugins: PluginDefinition[],
  context: PluginContext,
): Promise<PluginFinding[]> {
  if (plugins.length === 0) return [];

  const allFindings: PluginFinding[] = [];

  for (const plugin of plugins) {
    const findings = await runWithTimeout(plugin, context);
    if (findings !== null) {
      allFindings.push(...findings);
    }
  }

  return allFindings;
}
