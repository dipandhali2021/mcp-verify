import type { VerificationResult } from '../types/results.js';
import type { VerificationConfig } from '../types/config.js';
import type { CheckResult } from '../types/conformance.js';
import type { SecurityFinding } from '../types/security.js';
import type { Reporter } from './types.js';

// ---------------------------------------------------------------------------
// Report shape types — define the exact JSON output contract
// ---------------------------------------------------------------------------

interface ReportMeta {
  toolVersion: string;
  specVersion: string;
  timestamp: string;
  target: string;
  transport: 'http' | 'stdio';
  durationMs: number;
  checkMode: 'balanced' | 'strict' | 'lenient';
  thresholds: {
    conformanceThreshold: number;
    failOnSeverity: 'critical' | 'high' | 'medium' | 'low' | 'none';
  };
}

interface ReportConformance {
  score: number;
  breakdown: Record<string, number>;
  violations: CheckResult[];
}

interface ReportSecurity {
  findings: SecurityFinding[];
  suppressed: SecurityFinding[];
}

interface ReportSummary {
  pass: boolean;
  exitCode: 0 | 1 | 2;
  blockerCount: Record<string, number>;
}

interface JsonReport {
  schemaVersion: '1.0';
  meta: ReportMeta;
  conformance: ReportConformance;
  security: ReportSecurity;
  summary: ReportSummary;
}

// ---------------------------------------------------------------------------
// JsonReporter
// ---------------------------------------------------------------------------

export class JsonReporter implements Reporter {
  private readonly config: VerificationConfig;

  constructor(config: VerificationConfig) {
    this.config = config;
  }

  format(result: VerificationResult): string {
    const report: JsonReport = {
      schemaVersion: '1.0',
      meta: {
        toolVersion: result.meta.toolVersion,
        specVersion: result.meta.specVersion,
        timestamp: result.meta.timestamp,
        target: result.meta.target,
        transport: result.meta.transport,
        durationMs: result.meta.durationMs,
        checkMode: this.config.checkMode,
        thresholds: {
          conformanceThreshold: this.config.conformanceThreshold,
          failOnSeverity: this.config.failOnSeverity,
        },
      },
      conformance: {
        score: result.conformance.score,
        breakdown: result.conformance.breakdown,
        violations: result.conformance.violations,
      },
      security: {
        findings: result.security.findings,
        suppressed: result.security.suppressed,
      },
      summary: {
        pass: result.summary.pass,
        exitCode: result.summary.exitCode,
        blockerCount: result.summary.blockerCount,
      },
    };

    return JSON.stringify(report, null, 2);
  }
}
