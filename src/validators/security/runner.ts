/**
 * Security Check Runner
 *
 * Orchestrates all registered security checks against a protocol exchange record.
 * Returns aggregated SecurityFinding[] with globally unique IDs.
 */
import type { SecurityFinding } from '../../types/security.js';
import type { SecurityCheck, SecurityCheckContext } from './types.js';
import type { ProtocolExchangeRecord } from '../../types/protocol.js';
import type { VerificationConfig } from '../../types/config.js';

import { commandInjectionCheck } from './command-injection.js';
import { corsWildcardCheck } from './cors-wildcard.js';
import { authGapCheck } from './auth-gap.js';
import { toolPoisoningCheck } from './tool-poisoning.js';
import { infoLeakageCheck } from './info-leakage.js';

// All registered security checks
const SECURITY_CHECKS: SecurityCheck[] = [
  commandInjectionCheck,
  corsWildcardCheck,
  authGapCheck,
  toolPoisoningCheck,
  infoLeakageCheck,
];

/**
 * Run all security checks and return findings with globally unique IDs.
 * Skipped checks (via config.skip) produce no findings.
 */
export function runSecurityChecks(
  exchange: ProtocolExchangeRecord,
  config: VerificationConfig,
): SecurityFinding[] {
  const ctx: SecurityCheckContext = { exchange, config };
  const allFindings: SecurityFinding[] = [];
  let globalCounter = 0;

  for (const check of SECURITY_CHECKS) {
    // Skip suppressed checks
    if (config.skip.includes(check.id)) continue;

    const findings = check.check(ctx);

    // Re-number findings with globally unique IDs
    for (const finding of findings) {
      globalCounter++;
      finding.id = `SEC-${String(globalCounter).padStart(3, '0')}`;
      allFindings.push(finding);
    }
  }

  return allFindings;
}
