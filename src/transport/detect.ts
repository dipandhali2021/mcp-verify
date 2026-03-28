import type { TransportType } from '../types/transport.js';

/**
 * Detect the transport type from a target string.
 *
 * - http:// and https:// → 'http'
 * - stdio:// → 'stdio'
 * - Anything else → throws an error with exit code 2
 */
export function detectTransport(target: string): TransportType {
  if (target.startsWith('http://') || target.startsWith('https://')) {
    return 'http';
  }

  if (target.startsWith('stdio://')) {
    return 'stdio';
  }

  const err = new Error(
    `Cannot detect transport for target: "${target}". ` +
      `Valid schemes are: http://, https://, stdio://`,
  );
  (err as NodeJS.ErrnoException).code = '2';
  throw err;
}
