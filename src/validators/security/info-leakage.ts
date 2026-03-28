/**
 * Information Leakage Detection (FR-040)
 *
 * Analyzes error probe responses for stack traces, internal file paths,
 * environment variable names, and other sensitive information disclosure.
 */
import type { SecurityFinding } from '../../types/security.js';
import type { SecurityCheck, SecurityCheckContext } from './types.js';

const CHECK_ID = 'info-leakage';
const CVSS_SCORE = 5.3;

// Max string length to process per security design
const MAX_STRING_LENGTH = 10_000;

// Stack trace patterns (Node.js, Python, Java, .NET)
const STACK_TRACE_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /at\s+\S+\s+\([^)]+:\d+:\d+\)/, label: 'Node.js stack trace' },
  { pattern: /at\s+Object\.<anonymous>/, label: 'Node.js anonymous stack frame' },
  { pattern: /at\s+Function\./, label: 'Node.js Function stack frame' },
  { pattern: /at\s+Module\._compile/, label: 'Node.js module stack frame' },
  { pattern: /Traceback \(most recent call last\)/, label: 'Python traceback' },
  { pattern: /File "[^"]+", line \d+/, label: 'Python file reference' },
  { pattern: /at\s+\w+\.\w+\([^)]*\)\s+in\s+/, label: '.NET stack trace' },
];

// Absolute filesystem path patterns
const FILESYSTEM_PATH_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\/home\/\w+/, label: 'Unix home directory' },
  { pattern: /\/var\/\w+/, label: 'Unix /var path' },
  { pattern: /\/usr\/\w+/, label: 'Unix /usr path' },
  { pattern: /\/etc\/\w+/, label: 'Unix /etc path' },
  { pattern: /\/tmp\/\w+/, label: 'Unix /tmp path' },
  { pattern: /[A-Z]:\\Users\\/i, label: 'Windows Users path' },
  { pattern: /[A-Z]:\\Program Files/i, label: 'Windows Program Files path' },
];

// Environment variable patterns
const ENV_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /process\.env\.\w+/, label: 'Node.js process.env reference' },
  { pattern: /ENV\[\s*['"][^'"]+['"]\s*\]/, label: 'ENV[] reference' },
  { pattern: /\$ENV_\w+/, label: '$ENV_ variable' },
  { pattern: /\bexport\s+\w+=/, label: 'shell export statement' },
  { pattern: /os\.environ\b/, label: 'Python os.environ reference' },
];

function extractErrorText(response: unknown): string[] {
  const texts: string[] = [];

  if (!response || typeof response !== 'object') return texts;

  const resp = response as Record<string, unknown>;

  // JSON-RPC error.message
  if (resp.error && typeof resp.error === 'object') {
    const err = resp.error as Record<string, unknown>;
    if (typeof err.message === 'string') {
      texts.push(err.message.slice(0, MAX_STRING_LENGTH));
    }
    if (typeof err.data === 'string') {
      texts.push(err.data.slice(0, MAX_STRING_LENGTH));
    }
    if (err.data && typeof err.data === 'object') {
      const data = err.data as Record<string, unknown>;
      if (typeof data.message === 'string') {
        texts.push(data.message.slice(0, MAX_STRING_LENGTH));
      }
      if (typeof data.stack === 'string') {
        texts.push(data.stack.slice(0, MAX_STRING_LENGTH));
      }
    }
  }

  return texts;
}

function isGenericError(text: string): boolean {
  // Short messages with only a JSON-RPC code and generic text
  const generic = /^(Method not found|Internal error|Invalid params|Parse error|Invalid request|Server error)$/i;
  return text.length < 100 && generic.test(text.trim());
}

export const infoLeakageCheck: SecurityCheck = {
  id: CHECK_ID,
  name: 'Information Leakage Detection',

  check(ctx: SecurityCheckContext): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    let findingCount = 0;

    // Check error probe responses
    const errorResponses = [
      ctx.exchange.unknownMethodProbeResponse,
      ctx.exchange.malformedJsonProbeResponse,
    ];

    for (const response of errorResponses) {
      if (!response) continue;

      const errorTexts = extractErrorText(response);

      for (const text of errorTexts) {
        if (isGenericError(text)) continue;

        // Check for stack traces
        for (const { pattern, label } of STACK_TRACE_PATTERNS) {
          if (pattern.test(text)) {
            findingCount++;
            findings.push(makeFinding(
              findingCount,
              label,
              `Error response contains ${label} indicating verbose error output. Stack traces reveal internal code structure and file locations.`,
              redactSnippet(text, pattern),
            ));
            break; // One stack trace finding per error text
          }
        }

        // Check for filesystem paths
        for (const { pattern, label } of FILESYSTEM_PATH_PATTERNS) {
          if (pattern.test(text)) {
            findingCount++;
            findings.push(makeFinding(
              findingCount,
              label,
              `Error response contains ${label} exposing internal server filesystem structure.`,
              redactSnippet(text, pattern),
            ));
            break; // One path finding per error text
          }
        }

        // Check for environment variables
        for (const { pattern, label } of ENV_PATTERNS) {
          if (pattern.test(text)) {
            findingCount++;
            findings.push(makeFinding(
              findingCount,
              label,
              `Error response contains ${label} exposing server environment configuration.`,
              redactSnippet(text, pattern),
            ));
            break; // One env finding per error text
          }
        }
      }
    }

    return findings;
  },
};

function makeFinding(
  count: number,
  matchType: string,
  description: string,
  snippet: string,
): SecurityFinding {
  return {
    id: `SEC-${String(count).padStart(3, '0')}`,
    checkId: CHECK_ID,
    severity: 'medium',
    cvssScore: CVSS_SCORE,
    component: 'error response',
    title: `Information Leakage: ${matchType}`,
    description,
    remediation: 'Return generic error messages in production. Avoid including stack traces, file paths, or environment variable names in error responses.',
    confidence: 'deterministic',
    evidence: { matchType, snippet },
    suppressed: false,
  };
}

function redactSnippet(text: string, pattern: RegExp): string {
  const match = text.match(pattern);
  if (!match || match.index === undefined) return '[redacted]';
  // Show 30 chars around the match, redacting sensitive parts
  const start = Math.max(0, match.index - 15);
  const end = Math.min(text.length, match.index + match[0].length + 15);
  let snippet = text.slice(start, end);
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet;
}
