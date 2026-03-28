import type { VerificationResult } from '../types/results.js';

export interface Reporter {
  format(result: VerificationResult): string;
}
