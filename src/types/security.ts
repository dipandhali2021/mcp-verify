export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type SecurityConfidence = 'deterministic' | 'heuristic';

export interface SecurityFinding {
  id: string;
  checkId: string;
  severity: Severity;
  cvssScore: number;
  component: string;
  title: string;
  description: string;
  remediation: string;
  confidence: SecurityConfidence;
  evidence?: Record<string, unknown>;
  suppressed: boolean;
  justification?: string;
}
