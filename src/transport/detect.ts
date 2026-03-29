import type { TransportType } from '../types/transport.js';

/**
 * Detect the transport type from a target string.
 *
 * - http:// and https:// → 'http'
 * - stdio:// prefix → 'stdio'
 * - Bare commands (npx, node, python, etc.), file paths, or anything
 *   that is not an HTTP URL → 'stdio'
 */
export function detectTransport(target: string): TransportType {
  if (target.startsWith('http://') || target.startsWith('https://')) {
    return 'http';
  }

  if (target.startsWith('stdio://')) {
    return 'stdio';
  }

  // Anything that is not an HTTP URL is assumed to be a stdio command or path.
  // This covers: npx ..., node ..., python ..., ./server, /usr/bin/server, etc.
  if (target.length > 0) {
    return 'stdio';
  }

  const err = new Error(
    `Cannot detect transport for target: "${target}". ` +
      `Provide an HTTP URL or a command to run via stdio.`,
  );
  (err as NodeJS.ErrnoException).code = '2';
  throw err;
}
