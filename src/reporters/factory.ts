import type { Reporter } from './types.js';
import type { VerificationConfig } from '../types/config.js';
import { TerminalReporter } from './terminal.js';

export function createReporter(config: VerificationConfig): Reporter {
  switch (config.format) {
    case 'terminal':
      return new TerminalReporter(config.noColor);
    case 'json':
    case 'markdown':
    case 'sarif':
      throw new Error(`${config.format} reporter not yet implemented (Sprint 3)`);
    default:
      throw new Error(`Unknown format: ${config.format as string}`);
  }
}
