export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface SecurityFinding {
  findingId: string;
  analyzerName: string;
  severity: Severity;
  title: string;
  description: string;
  confidence: 'deterministic' | 'high' | 'medium' | 'low';
  cvss?: number;
  remediation?: string;
  evidence?: Record<string, unknown>;
  suppressed: boolean;
}
