export interface VerificationConfig {
  target: string;
  timeout: number;
  format: 'terminal' | 'json' | 'markdown' | 'sarif';
  transport: 'http' | 'stdio' | null;
  failOnSeverity: 'critical' | 'high' | 'medium' | 'low' | 'none';
  conformanceThreshold: number;
  skip: string[];
  /**
   * Maps checkId → justification string for skipped checks.
   * Populated from SkipEntry objects in the config file.
   */
  skipJustifications: Record<string, string>;
  checkMode: 'strict' | 'balanced' | 'lenient';
  noColor: boolean;
  verbose: boolean;
  output: string | null;
  /** When true, the verification run will not be persisted to history storage. */
  noHistory: boolean;
}

export const DEFAULT_CONFIG: Omit<VerificationConfig, 'target'> = {
  timeout: 10000,
  format: 'terminal',
  transport: null,
  failOnSeverity: 'critical',
  conformanceThreshold: 0,
  skip: [],
  skipJustifications: {},
  checkMode: 'balanced',
  noColor: false,
  verbose: false,
  output: null,
  noHistory: false,
};
