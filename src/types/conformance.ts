export type ConformanceCategory =
  | 'jsonrpc-base'
  | 'initialization'
  | 'tools'
  | 'resources'
  | 'prompts'
  | 'transport'
  | 'error-handling';

export type CheckLevel = 'pass' | 'failure' | 'warning' | 'info';

export type CheckConfidence = 'deterministic' | 'high' | 'medium' | 'low';

export interface CheckResult {
  checkId: string;
  name: string;
  category: ConformanceCategory;
  level: CheckLevel;
  description: string;
  specVersion: string;
  specReference: string;
  field?: string;
  messageId?: string | number;
  confidence: CheckConfidence;
  details?: Record<string, unknown>;
}
