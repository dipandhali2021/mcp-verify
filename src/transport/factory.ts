import type { VerificationConfig } from '../types/config.js';
import type { Transport } from './types.js';
import { detectTransport } from './detect.js';
import { StdioTransport } from './stdio.js';
import { HttpTransport } from './http.js';

/**
 * Create the appropriate transport for the given target URL.
 *
 * If config.transport is explicitly set it overrides auto-detection.
 */
export function createTransport(target: string, config: VerificationConfig): Transport {
  const transportType = config.transport ?? detectTransport(target);

  switch (transportType) {
    case 'stdio':
      return new StdioTransport(target, config.timeout, config.verbose);

    case 'http':
      return new HttpTransport(target, config.timeout, config.headers);

    default: {
      const _exhaustive: never = transportType;
      throw new Error(`Unsupported transport type: ${String(_exhaustive)}`);
    }
  }
}
