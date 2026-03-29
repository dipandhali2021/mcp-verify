/**
 * HistoryStorage — persists and retrieves per-target run history for
 * mcp-verify (S-4-01, FR-067).
 *
 * Storage layout:
 *   ~/.mcp-verify/history/<encoded-target>.jsonl
 *
 * Each line in a JSONL file is a JSON-serialised HistoryRecord.
 * Lines are appended atomically via appendFileSync so concurrent writers
 * produce valid JSONL (no interleaved bytes within a single call).
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { HistoryRecord } from './types.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Emit a debug-level message to stderr (visible only when DEBUG is set). */
function debugLog(message: string): void {
  if (process.env['DEBUG']) {
    process.stderr.write(`[mcp-verify:history] ${message}\n`);
  }
}

// ---------------------------------------------------------------------------
// HistoryStorage
// ---------------------------------------------------------------------------

export class HistoryStorage {
  // ---------------------------------------------------------------------------
  // Directory helpers
  // ---------------------------------------------------------------------------

  /**
   * Return the history directory path (`~/.mcp-verify/history/`) and ensure it
   * exists.  Returns `null` if the directory cannot be created (e.g. permission
   * denied), in which case the caller should skip storage.
   */
  getHistoryDir(): string | null {
    const dir = join(homedir(), '.mcp-verify', 'history');
    if (!existsSync(dir)) {
      try {
        mkdirSync(dir, { recursive: true });
      } catch (err: unknown) {
        debugLog(
          `Could not create history directory "${dir}": ${err instanceof Error ? err.message : String(err)}`,
        );
        return null;
      }
    }
    return dir;
  }

  // ---------------------------------------------------------------------------
  // Target encoding
  // ---------------------------------------------------------------------------

  /**
   * Encode a target string into a filesystem-safe filename stem.
   *
   * The encoding strategy:
   *   1. URL-encode the entire string (encodeURIComponent).
   *   2. Replace the percent sign `%` with `_` so the resulting name only
   *      contains alphanumerics, hyphens, dots, and underscores — all safe on
   *      every major filesystem.
   *
   * This is deterministic and reversible (for display purposes) but the
   * primary goal is uniqueness and safety, not round-tripping.
   */
  encodeTarget(target: string): string {
    return encodeURIComponent(target).replace(/%/g, '_');
  }

  // ---------------------------------------------------------------------------
  // Path helpers
  // ---------------------------------------------------------------------------

  /** Return the absolute path to the JSONL file for `target`. */
  private targetFilePath(dir: string, target: string): string {
    return join(dir, `${this.encodeTarget(target)}.jsonl`);
  }

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  /**
   * Append a HistoryRecord for `target` to its JSONL file.
   *
   * If the history directory is not writable, the error is logged at debug
   * level and the operation is silently skipped (graceful degradation).
   */
  appendRun(target: string, record: HistoryRecord): void {
    const dir = this.getHistoryDir();
    if (dir === null) {
      debugLog(`Skipping history append for target "${target}" — directory unavailable`);
      return;
    }

    const filePath = this.targetFilePath(dir, target);
    const line = JSON.stringify(record) + '\n';

    try {
      appendFileSync(filePath, line, 'utf-8');
    } catch (err: unknown) {
      debugLog(
        `Could not append history for target "${target}" at "${filePath}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  /**
   * Read all HistoryRecord entries for `target` in the order they were written.
   * Returns an empty array if no history exists for the target.
   */
  getHistory(target: string): HistoryRecord[] {
    const dir = this.getHistoryDir();
    if (dir === null) {
      return [];
    }

    const filePath = this.targetFilePath(dir, target);
    if (!existsSync(filePath)) {
      return [];
    }

    let raw: string;
    try {
      raw = readFileSync(filePath, 'utf-8');
    } catch (err: unknown) {
      debugLog(
        `Could not read history for target "${target}" at "${filePath}": ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }

    const records: HistoryRecord[] = [];
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      try {
        records.push(JSON.parse(trimmed) as HistoryRecord);
      } catch {
        debugLog(`Skipping malformed JSONL line in "${filePath}": ${trimmed}`);
      }
    }
    return records;
  }

  /**
   * Return the most recent HistoryRecord for `target`, or `null` if no history
   * exists.
   */
  getLatestRun(target: string): HistoryRecord | null {
    const records = this.getHistory(target);
    return records.length > 0 ? (records[records.length - 1] ?? null) : null;
  }

  // ---------------------------------------------------------------------------
  // Enumerate targets
  // ---------------------------------------------------------------------------

  /**
   * Return a list of all tracked target strings (decoded from JSONL filenames).
   * Returns an empty array if the history directory does not exist or cannot be
   * read.
   */
  getAllTargets(): string[] {
    const dir = this.getHistoryDir();
    if (dir === null) {
      return [];
    }

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch (err: unknown) {
      debugLog(
        `Could not list history directory "${dir}": ${err instanceof Error ? err.message : String(err)}`,
      );
      return [];
    }

    return entries
      .filter((name) => name.endsWith('.jsonl'))
      .map((name) => {
        // Strip the .jsonl extension, then reverse the encoding:
        //   1. Replace `_` back to `%`
        //   2. decodeURIComponent
        const stem = name.slice(0, -'.jsonl'.length);
        try {
          return decodeURIComponent(stem.replace(/_/g, '%'));
        } catch {
          // If the stem is not decodable (manually placed file?), return as-is.
          return stem;
        }
      });
  }
}
