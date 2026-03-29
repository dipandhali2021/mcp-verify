import type { Reporter } from './types.js';
import type { VerificationConfig } from '../types/config.js';
import { TerminalReporter } from './terminal.js';
import { JsonReporter } from './json.js';
import { MarkdownReporter } from './markdown.js';

export function createReporter(config: VerificationConfig): Reporter {
  switch (config.format) {
    case 'terminal':
      return new TerminalReporter(config.noColor);
    case 'json':
      return new JsonReporter(config);
    case 'markdown':
      return new MarkdownReporter();
    case 'sarif':
      throw new Error(`${config.format} reporter not yet implemented (Sprint 3)`);
    default:
      throw new Error(`Unknown format: ${config.format as string}`);
  }
}
