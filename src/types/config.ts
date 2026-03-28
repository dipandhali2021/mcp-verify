export interface VerificationConfig {
  target: string;
  timeout: number;
  format: 'terminal' | 'json' | 'markdown' | 'sarif';
  transport: 'http' | 'stdio' | null;
  failOnSeverity: 'critical' | 'high' | 'medium' | 'low' | 'none';
  conformanceThreshold: number;
  skip: string[];
  checkMode: 'strict' | 'balanced' | 'lenient';
  noColor: boolean;
  verbose: boolean;
  output: string | null;
}

export const DEFAULT_CONFIG: Omit<VerificationConfig, 'target'> = {
  timeout: 10000,
  format: 'terminal',
  transport: null,
  failOnSeverity: 'critical',
  conformanceThreshold: 0,
  skip: [],
  checkMode: 'balanced',
  noColor: false,
  verbose: false,
  output: null,
};
