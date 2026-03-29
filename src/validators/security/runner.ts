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
 *
 * Checks listed in config.skip are still executed so their findings appear in
 * the suppressed section of the report; the findings are marked suppressed and
 * their justification (if any) is attached from config.skipJustifications.
 */
export function runSecurityChecks(
  exchange: ProtocolExchangeRecord,
  config: VerificationConfig,
): SecurityFinding[] {
  const ctx: SecurityCheckContext = { exchange, config };
  const allFindings: SecurityFinding[] = [];
  let globalCounter = 0;

  for (const check of SECURITY_CHECKS) {
    const findings = check.check(ctx);

    // Re-number findings with globally unique IDs
    for (const finding of findings) {
      globalCounter++;
      finding.id = `SEC-${String(globalCounter).padStart(3, '0')}`;

      // Apply suppression: if the check is in the skip list, mark finding suppressed
      if (config.skip.includes(finding.checkId)) {
        finding.suppressed = true;
        const justification = config.skipJustifications[finding.checkId];
        if (justification !== undefined) {
          finding.justification = justification;
        }
      }

      allFindings.push(finding);
    }
  }

  return allFindings;
}
