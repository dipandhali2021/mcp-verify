import type { SecurityFinding } from '../../types/security.js';
import type { ProtocolExchangeRecord } from '../../types/protocol.js';
import type { VerificationConfig } from '../../types/config.js';

export interface SecurityCheckContext {
  exchange: ProtocolExchangeRecord;
  config: VerificationConfig;
}

export interface SecurityCheck {
  id: string;
  name: string;
  check(ctx: SecurityCheckContext): SecurityFinding[];
}
