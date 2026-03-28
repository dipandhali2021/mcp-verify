/**
 * Tool Poisoning Pattern Detection (FR-039)
 *
 * Inspects tool name and description fields for patterns associated with
 * prompt injection attacks embedded in tool metadata.
 */
import type { SecurityFinding } from '../../types/security.js';
import type { SecurityCheck, SecurityCheckContext } from './types.js';

const CHECK_ID = 'tool-poisoning';
const CVSS_SCORE = 8.8;

// Max description length per security design
const MAX_STRING_LENGTH = 10_000;

// Suspicious description length threshold
const SUSPICIOUS_LENGTH = 2000;

// Instruction-formatted patterns indicating prompt injection
const INJECTION_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /IGNORE\s+PREVIOUS/i, label: 'IGNORE PREVIOUS' },
  { pattern: /\[SYSTEM\]/i, label: '[SYSTEM]' },
  { pattern: /<system>/i, label: '<system>' },
  { pattern: /\bDO\s+NOT\b(?=.*\b(?:tell|reveal|mention|show|share|disclose)\b)/i, label: 'DO NOT (directive)' },
  { pattern: /\byou\s+must\b/i, label: 'you must' },
  { pattern: /\byou\s+are\s+now\b/i, label: 'you are now' },
  { pattern: /\bforget\s+(?:all|your|previous|everything)\b/i, label: 'forget instructions' },
  { pattern: /\bpretend\s+(?:to\s+be|you\s+are)\b/i, label: 'pretend to be' },
  { pattern: /\bact\s+as\s+(?:a|an|if)\b/i, label: 'act as' },
  { pattern: /\bnew\s+instructions?\b/i, label: 'new instructions' },
];

// XML/HTML tag patterns that look like embedded system prompts
const XML_SYSTEM_PATTERN = /<\/?(?:system|prompt|instruction|role|context|message)\b[^>]*>/i;

// Base64 pattern in tool names — minimum 20 chars to avoid false positives
const BASE64_NAME_PATTERN = /^[A-Za-z0-9+/]{20,}={0,2}$/;

// URL-encoded pattern in tool names
const URL_ENCODED_NAME_PATTERN = /%[0-9A-Fa-f]{2}/;

interface ToolInfo {
  name: string;
  description?: string;
}

export const toolPoisoningCheck: SecurityCheck = {
  id: CHECK_ID,
  name: 'Tool Poisoning Pattern Detection',

  check(ctx: SecurityCheckContext): SecurityFinding[] {
    const tools = ctx.exchange.tools;
    if (!Array.isArray(tools) || tools.length === 0) return [];

    const findings: SecurityFinding[] = [];
    let findingCount = 0;

    for (const tool of tools) {
      if (typeof tool !== 'object' || tool === null) continue;
      const t = tool as ToolInfo;
      if (typeof t.name !== 'string') continue;

      // Check tool name for encoding patterns
      if (URL_ENCODED_NAME_PATTERN.test(t.name)) {
        findingCount++;
        findings.push(makeFinding(findingCount, t.name, 'URL-encoded characters in tool name', `Tool name "${t.name}" contains URL-encoded substrings`));
      }

      if (BASE64_NAME_PATTERN.test(t.name)) {
        findingCount++;
        findings.push(makeFinding(findingCount, t.name, 'Base64-encoded tool name', `Tool name "${t.name}" appears to be Base64-encoded`));
      }

      // Check description
      if (typeof t.description !== 'string') continue;

      // Truncate for regex safety per security design
      const desc = t.description.slice(0, MAX_STRING_LENGTH);

      // Suspiciously long description
      if (desc.length > SUSPICIOUS_LENGTH) {
        findingCount++;
        findings.push(makeFinding(
          findingCount,
          t.name,
          'Suspiciously long tool description',
          `Tool "${t.name}" has a description of ${t.description.length} characters (threshold: ${SUSPICIOUS_LENGTH}). Long descriptions may contain hidden instructions.`,
        ));
      }

      // Injection pattern detection
      for (const { pattern, label } of INJECTION_PATTERNS) {
        if (pattern.test(desc)) {
          findingCount++;
          findings.push(makeFinding(
            findingCount,
            t.name,
            `Prompt injection pattern: "${label}"`,
            `Tool "${t.name}" description contains the pattern "${label}" which is commonly used in prompt injection attacks to hijack model behavior.`,
          ));
          break; // One finding per tool for injection patterns
        }
      }

      // XML/HTML system tag detection
      if (XML_SYSTEM_PATTERN.test(desc)) {
        findingCount++;
        findings.push(makeFinding(
          findingCount,
          t.name,
          'XML/HTML system tags in description',
          `Tool "${t.name}" description contains XML/HTML tags that appear to embed system-prompt instructions.`,
        ));
      }
    }

    return findings;
  },
};

function makeFinding(
  count: number,
  toolName: string,
  title: string,
  description: string,
): SecurityFinding {
  return {
    id: `SEC-${String(count).padStart(3, '0')}`,
    checkId: CHECK_ID,
    severity: 'critical',
    cvssScore: CVSS_SCORE,
    component: `tool "${toolName}"`,
    title,
    description,
    remediation: `Review and sanitize the tool metadata for "${toolName}". Remove any instruction-like text, encoded strings, or system prompt patterns from tool names and descriptions.`,
    confidence: 'heuristic',
    evidence: { toolName },
    suppressed: false,
  };
}
