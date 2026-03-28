/**
 * Validator runner
 *
 * Iterates all registered conformance validators and returns the
 * concatenated list of CheckResult objects.
 */
import type { ProtocolExchangeRecord } from '../../types/protocol.js';
import type { VerificationConfig } from '../../types/config.js';
import type { CheckResult } from '../../types/conformance.js';
import { CONFORMANCE_VALIDATORS } from './registry.js';

export type ConformanceValidator = (
  exchange: ProtocolExchangeRecord,
  config: VerificationConfig,
) => CheckResult[];

export function runConformanceChecks(
  exchange: ProtocolExchangeRecord,
  config: VerificationConfig,
): CheckResult[] {
  const results: CheckResult[] = [];

  for (const validator of CONFORMANCE_VALIDATORS) {
    try {
      const validatorResults = validator(exchange, config);
      results.push(...validatorResults);
    } catch (err: unknown) {
      // Prevent a single validator crash from aborting the whole run.
      // Record an info-level result so the failure is visible.
      results.push({
        checkId: 'RUNNER-ERROR',
        name: 'Validator runtime error',
        category: 'jsonrpc-base',
        level: 'info',
        description: `A validator threw an unexpected error: ${err instanceof Error ? err.message : String(err)}`,
        specVersion: '2024-11-05',
        specReference: 'N/A',
        confidence: 'deterministic',
      });
    }
  }

  return results;
}
