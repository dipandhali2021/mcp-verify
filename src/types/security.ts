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
  /** Whether this finding came from the built-in engine or a plugin. */
  source?: 'builtin' | 'plugin';
  /** Populated for plugin-sourced findings: the originating plugin's id. */
  pluginId?: string;
}
