/**
 * S-1-21: Prompt protocol validator
 *
 * Validates:
 * - prompts array presence in prompts/list response
 * - each prompt has name (string)
 * - prompt arguments have name and required (boolean)
 */
import type { ProtocolExchangeRecord } from '../../types/protocol.js';
import type { VerificationConfig } from '../../types/config.js';
import type { CheckResult } from '../../types/conformance.js';

const SPEC_VERSION = '2024-11-05';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function validatePromptProtocol(
  exchange: ProtocolExchangeRecord,
  _config: VerificationConfig,
): CheckResult[] {
  const results: CheckResult[] = [];

  const listResp = exchange.promptsListResponse;

  // PROMPT-001: prompts/list response presence
  if (listResp === null) {
    results.push({
      checkId: 'PROMPT-001',
      name: 'prompts/list response presence',
      category: 'prompts',
      level: 'info',
      description: 'No prompts/list response found — server may not support prompts',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §7 (Prompts)',
      confidence: 'deterministic',
    });
    return results;
  }

  // Check for error response
  if ('error' in listResp && listResp.error !== undefined) {
    results.push({
      checkId: 'PROMPT-001',
      name: 'prompts/list response presence',
      category: 'prompts',
      level: 'info',
      description: `prompts/list returned an error: ${listResp.error.message} (code: ${listResp.error.code})`,
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §7 (Prompts)',
      confidence: 'deterministic',
      details: { errorCode: listResp.error.code, errorMessage: listResp.error.message },
    });
    return results;
  }

  results.push({
    checkId: 'PROMPT-001',
    name: 'prompts/list response presence',
    category: 'prompts',
    level: 'pass',
    description: 'prompts/list response was received from the server',
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §7 (Prompts)',
    confidence: 'deterministic',
  });

  // PROMPT-002: result must contain a prompts array
  const result = listResp.result;
  if (!isPlainObject(result)) {
    results.push({
      checkId: 'PROMPT-002',
      name: 'prompts array in response',
      category: 'prompts',
      level: 'failure',
      description: 'prompts/list result is not a valid object',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §7 (Prompts)',
      confidence: 'deterministic',
      field: 'result',
    });
    return results;
  }

  const promptsArray = result['prompts'];
  const hasPromptsArray = Array.isArray(promptsArray);

  results.push({
    checkId: 'PROMPT-002',
    name: 'prompts array in response',
    category: 'prompts',
    level: hasPromptsArray ? 'pass' : 'failure',
    description: hasPromptsArray
      ? `prompts/list result contains a prompts array with ${(promptsArray as unknown[]).length} item(s)`
      : `prompts/list result.prompts is not an array (got: ${typeof promptsArray})`,
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §7 (Prompts)',
    confidence: 'deterministic',
    field: 'result.prompts',
    details: hasPromptsArray ? { count: (promptsArray as unknown[]).length } : {},
  });

  if (!hasPromptsArray) return results;

  const prompts = promptsArray as unknown[];

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    const promptPath = `prompts[${i}]`;

    if (!isPlainObject(prompt)) {
      results.push({
        checkId: 'PROMPT-003',
        name: 'Prompt object structure',
        category: 'prompts',
        level: 'failure',
        description: `${promptPath} is not a valid object`,
        specVersion: SPEC_VERSION,
        specReference: 'MCP spec §7 (Prompts)',
        confidence: 'deterministic',
        details: { index: i },
      });
      continue;
    }

    const name = prompt['name'];
    const hasValidName = isNonEmptyString(name);
    const promptLabel = hasValidName ? `"${name as string}"` : `#${i}`;

    // PROMPT-003: name must be a string
    results.push({
      checkId: 'PROMPT-003',
      name: 'Prompt name field',
      category: 'prompts',
      level: hasValidName ? 'pass' : 'failure',
      description: hasValidName
        ? `Prompt ${promptLabel} has a valid name field`
        : `Prompt at index ${i} is missing a valid name field (got: ${JSON.stringify(name)})`,
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §7 (Prompts)',
      confidence: 'deterministic',
      field: `${promptPath}.name`,
      details: { index: i, name },
    });

    // PROMPT-004: validate arguments array if present
    const args = prompt['arguments'];
    if (args === undefined || args === null) {
      // No arguments — acceptable
      results.push({
        checkId: 'PROMPT-004',
        name: 'Prompt arguments structure',
        category: 'prompts',
        level: 'pass',
        description: `Prompt ${promptLabel} has no arguments defined`,
        specVersion: SPEC_VERSION,
        specReference: 'MCP spec §7 (Prompts)',
        confidence: 'deterministic',
        details: { index: i, promptName: name },
      });
      continue;
    }

    if (!Array.isArray(args)) {
      results.push({
        checkId: 'PROMPT-004',
        name: 'Prompt arguments structure',
        category: 'prompts',
        level: 'failure',
        description: `Prompt ${promptLabel} arguments must be an array (got: ${typeof args})`,
        specVersion: SPEC_VERSION,
        specReference: 'MCP spec §7 (Prompts)',
        confidence: 'deterministic',
        field: `${promptPath}.arguments`,
        details: { index: i, promptName: name },
      });
      continue;
    }

    results.push({
      checkId: 'PROMPT-004',
      name: 'Prompt arguments structure',
      category: 'prompts',
      level: 'pass',
      description: `Prompt ${promptLabel} has a valid arguments array with ${(args as unknown[]).length} item(s)`,
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §7 (Prompts)',
      confidence: 'deterministic',
      field: `${promptPath}.arguments`,
      details: { index: i, promptName: name, argCount: (args as unknown[]).length },
    });

    // PROMPT-005: each argument must have name (string) and required (boolean)
    const argArray = args as unknown[];
    for (let j = 0; j < argArray.length; j++) {
      const arg = argArray[j];
      const argPath = `${promptPath}.arguments[${j}]`;

      if (!isPlainObject(arg)) {
        results.push({
          checkId: 'PROMPT-005',
          name: 'Prompt argument object structure',
          category: 'prompts',
          level: 'failure',
          description: `Prompt ${promptLabel} argument at index ${j} is not a valid object`,
          specVersion: SPEC_VERSION,
          specReference: 'MCP spec §7 (Prompts)',
          confidence: 'deterministic',
          field: argPath,
          details: { promptIndex: i, argIndex: j, promptName: name },
        });
        continue;
      }

      const argName = arg['name'];
      const argRequired = arg['required'];
      const argLabel = isNonEmptyString(argName) ? `"${argName as string}"` : `#${j}`;

      // Argument name must be a string
      const hasValidArgName = isNonEmptyString(argName);
      results.push({
        checkId: 'PROMPT-005',
        name: 'Prompt argument name field',
        category: 'prompts',
        level: hasValidArgName ? 'pass' : 'failure',
        description: hasValidArgName
          ? `Prompt ${promptLabel} argument ${argLabel} has a valid name field`
          : `Prompt ${promptLabel} argument at index ${j} is missing a valid name field (got: ${JSON.stringify(argName)})`,
        specVersion: SPEC_VERSION,
        specReference: 'MCP spec §7 (Prompts)',
        confidence: 'deterministic',
        field: `${argPath}.name`,
        details: { promptIndex: i, argIndex: j, promptName: name, argName },
      });

      // Argument required must be boolean if present
      if ('required' in arg) {
        const hasValidRequired = typeof argRequired === 'boolean';
        results.push({
          checkId: 'PROMPT-006',
          name: 'Prompt argument required field',
          category: 'prompts',
          level: hasValidRequired ? 'pass' : 'failure',
          description: hasValidRequired
            ? `Prompt ${promptLabel} argument ${argLabel} has a valid required field (${argRequired as boolean})`
            : `Prompt ${promptLabel} argument ${argLabel} required field must be a boolean (got: ${typeof argRequired})`,
          specVersion: SPEC_VERSION,
          specReference: 'MCP spec §7 (Prompts)',
          confidence: 'deterministic',
          field: `${argPath}.required`,
          details: { promptIndex: i, argIndex: j, promptName: name, argName, argRequired },
        });
      }
    }
  }

  return results;
}
