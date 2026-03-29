/**
 * Baseline storage for mcp-verify (S-4-02, FR-073).
 *
 * Baselines are stable reference snapshots stored separately from rolling
 * history.  Each target may have exactly one baseline at a time.
 *
 * Storage layout:
 *   ~/.mcp-verify/baselines/<encoded-target>.json
 *
 * The same target-encoding scheme used by HistoryStorage is reused here via
 * the shared `encodeTarget` helper so filenames are consistent across both
 * subsystems.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { HistoryStorage } from './storage.js';
import type { HistoryRecord } from './types.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Shared HistoryStorage instance — used only for its encodeTarget method. */
const _sharedStorage = new HistoryStorage();

/** Emit a debug-level message to stderr (visible only when DEBUG is set). */
function debugLog(message: string): void {
  if (process.env['DEBUG']) {
    process.stderr.write(`[mcp-verify:baseline] ${message}\n`);
  }
}

// ---------------------------------------------------------------------------
// Directory helper
// ---------------------------------------------------------------------------

/**
 * Return the baselines directory path (`~/.mcp-verify/baselines/`) and ensure
 * it exists.
 *
 * Returns `null` if the directory cannot be created (e.g. permission denied),
 * in which case callers should surface an appropriate error.
 *
 * An optional `baseDir` parameter overrides the home-directory-based path;
 * this is used in tests to redirect filesystem access to a temporary
 * directory without needing to mock `os.homedir`.
 */
export function getBaselineDir(baseDir?: string): string | null {
  const dir = baseDir !== undefined
    ? join(baseDir, '.mcp-verify', 'baselines')
    : join(homedir(), '.mcp-verify', 'baselines');

  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true });
    } catch (err: unknown) {
      debugLog(
        `Could not create baselines directory "${dir}": ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
  return dir;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Persist `record` as the baseline for `target`.
 *
 * Overwrites any existing baseline for that target.
 *
 * An optional `baseDir` parameter overrides the home-directory-based path
 * (used in tests).
 *
 * @throws {Error} When the baseline directory cannot be created or the file
 *                 cannot be written.
 */
export function saveBaseline(
  target: string,
  record: HistoryRecord,
  baseDir?: string,
): void {
  const dir = getBaselineDir(baseDir);
  if (dir === null) {
    throw new Error(
      `Cannot save baseline for "${target}": baseline directory is not writable`,
    );
  }

  const encoded = _sharedStorage.encodeTarget(target);
  const filePath = join(dir, `${encoded}.json`);

  try {
    writeFileSync(filePath, JSON.stringify(record, null, 2) + '\n', 'utf-8');
  } catch (err: unknown) {
    throw new Error(
      `Cannot save baseline for "${target}" at "${filePath}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Read the baseline HistoryRecord for `target`.
 *
 * Returns `null` when no baseline has been saved for this target.
 *
 * An optional `baseDir` parameter overrides the home-directory-based path
 * (used in tests).
 *
 * @throws {Error} When the file exists but cannot be parsed as valid JSON.
 */
export function getBaseline(
  target: string,
  baseDir?: string,
): HistoryRecord | null {
  const dir = getBaselineDir(baseDir);
  if (dir === null) {
    return null;
  }

  const encoded = _sharedStorage.encodeTarget(target);
  const filePath = join(dir, `${encoded}.json`);

  if (!existsSync(filePath)) {
    return null;
  }

  let raw: string;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (err: unknown) {
    debugLog(
      `Could not read baseline for "${target}" at "${filePath}": ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }

  try {
    return JSON.parse(raw) as HistoryRecord;
  } catch (err: unknown) {
    throw new Error(
      `Baseline file for "${target}" at "${filePath}" contains invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
