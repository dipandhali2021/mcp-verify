/**
 * Command Injection Susceptibility Detection (FR-036)
 *
 * Analyzes tool inputSchema for unconstrained string parameters whose names or
 * descriptions suggest use in subprocess / shell execution contexts.
 */
import type { SecurityFinding } from '../../types/security.js';
import type { SecurityCheck, SecurityCheckContext } from './types.js';

const CHECK_ID = 'command-injection';
const CVSS_SCORE = 8.1;

// Parameter names that suggest shell/subprocess usage
const SUSPICIOUS_PARAM_NAMES = /^(command|cmd|exec|shell|script|args|argv|path|file|filename|dir|directory)$/i;

// Description keywords suggesting execution context
const SUSPICIOUS_DESCRIPTION = /\b(execute|run\s+command|shell|script|path\s+to)\b/i;

interface ToolParam {
  name: string;
  type?: string;
  description?: string;
  pattern?: string;
  enum?: unknown[];
  maxLength?: number;
}

interface ToolInfo {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, ToolParam>;
    required?: string[];
  };
}

function isConstrainedParam(param: ToolParam): boolean {
  if (typeof param.pattern === 'string' && param.pattern.length > 0) return true;
  if (Array.isArray(param.enum) && param.enum.length > 0) return true;
  return false;
}

function isStringParam(param: ToolParam): boolean {
  return param.type === 'string' || param.type === undefined;
}

function checkTool(tool: ToolInfo, findingCounter: { count: number }): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const properties = tool.inputSchema?.properties;
  if (!properties || typeof properties !== 'object') return findings;

  for (const [paramName, param] of Object.entries(properties)) {
    if (typeof param !== 'object' || param === null) continue;

    // Only flag string parameters
    if (!isStringParam(param as ToolParam)) continue;

    // Skip constrained parameters
    if (isConstrainedParam(param as ToolParam)) continue;

    const typedParam = param as ToolParam;
    const nameMatch = SUSPICIOUS_PARAM_NAMES.test(paramName);
    const descMatch = typeof typedParam.description === 'string' &&
      SUSPICIOUS_DESCRIPTION.test(typedParam.description);

    if (nameMatch || descMatch) {
      findingCounter.count++;
      const matchReason = nameMatch
        ? `parameter name "${paramName}" matches shell execution pattern`
        : `parameter description contains execution keywords`;

      findings.push({
        id: `SEC-${String(findingCounter.count).padStart(3, '0')}`,
        checkId: CHECK_ID,
        severity: 'high',
        cvssScore: CVSS_SCORE,
        component: `tool "${tool.name}" / param "${paramName}"`,
        title: 'Command Injection Susceptibility',
        description: `Tool "${tool.name}" has an unconstrained string parameter "${paramName}" — ${matchReason}. Without a \`pattern\` or \`enum\` constraint, this parameter could be used to inject shell commands.`,
        remediation: `Add a \`pattern\` constraint (e.g., "^[a-zA-Z0-9_-]+$") or \`enum\` constraint to the "${paramName}" parameter in tool "${tool.name}".`,
        confidence: 'heuristic',
        evidence: {
          toolName: tool.name,
          paramName,
          paramType: typedParam.type ?? 'string (implicit)',
          matchedOn: nameMatch ? 'parameterName' : 'description',
        },
        suppressed: false,
      });
    }
  }

  return findings;
}

export const commandInjectionCheck: SecurityCheck = {
  id: CHECK_ID,
  name: 'Command Injection Susceptibility Detection',

  check(ctx: SecurityCheckContext): SecurityFinding[] {
    const tools = ctx.exchange.tools;
    if (!Array.isArray(tools) || tools.length === 0) return [];

    const findings: SecurityFinding[] = [];
    const counter = { count: 0 };

    for (const tool of tools) {
      if (typeof tool !== 'object' || tool === null) continue;
      const toolFindings = checkTool(tool as ToolInfo, counter);
      findings.push(...toolFindings);
    }

    return findings;
  },
};
