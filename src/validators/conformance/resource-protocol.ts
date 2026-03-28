/**
 * S-1-21: Resource protocol validator
 *
 * Validates:
 * - resources array presence in resources/list response
 * - each resource has uri (string) and name (string)
 * - resources/read response has a contents array
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

export function validateResourceProtocol(
  exchange: ProtocolExchangeRecord,
  _config: VerificationConfig,
): CheckResult[] {
  const results: CheckResult[] = [];

  const listResp = exchange.resourcesListResponse;

  // RSRC-001: resources/list response presence
  if (listResp === null) {
    results.push({
      checkId: 'RSRC-001',
      name: 'resources/list response presence',
      category: 'resources',
      level: 'info',
      description: 'No resources/list response found — server may not support resources',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §6 (Resources)',
      confidence: 'deterministic',
    });
    return results;
  }

  // Check for error response
  if ('error' in listResp && listResp.error !== undefined) {
    results.push({
      checkId: 'RSRC-001',
      name: 'resources/list response presence',
      category: 'resources',
      level: 'info',
      description: `resources/list returned an error: ${listResp.error.message} (code: ${listResp.error.code})`,
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §6 (Resources)',
      confidence: 'deterministic',
      details: { errorCode: listResp.error.code, errorMessage: listResp.error.message },
    });
    return results;
  }

  results.push({
    checkId: 'RSRC-001',
    name: 'resources/list response presence',
    category: 'resources',
    level: 'pass',
    description: 'resources/list response was received from the server',
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §6 (Resources)',
    confidence: 'deterministic',
  });

  // RSRC-002: result must contain a resources array
  const result = listResp.result;
  if (!isPlainObject(result)) {
    results.push({
      checkId: 'RSRC-002',
      name: 'resources array in response',
      category: 'resources',
      level: 'failure',
      description: 'resources/list result is not a valid object',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §6 (Resources)',
      confidence: 'deterministic',
      field: 'result',
    });
    return results;
  }

  const resourcesArray = result['resources'];
  const hasResourcesArray = Array.isArray(resourcesArray);

  results.push({
    checkId: 'RSRC-002',
    name: 'resources array in response',
    category: 'resources',
    level: hasResourcesArray ? 'pass' : 'failure',
    description: hasResourcesArray
      ? `resources/list result contains a resources array with ${(resourcesArray as unknown[]).length} item(s)`
      : `resources/list result.resources is not an array (got: ${typeof resourcesArray})`,
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §6 (Resources)',
    confidence: 'deterministic',
    field: 'result.resources',
    details: hasResourcesArray ? { count: (resourcesArray as unknown[]).length } : {},
  });

  if (!hasResourcesArray) return results;

  // RSRC-003 / RSRC-004: each resource must have uri and name
  const resources = resourcesArray as unknown[];
  for (let i = 0; i < resources.length; i++) {
    const resource = resources[i];
    const resourcePath = `resources[${i}]`;

    if (!isPlainObject(resource)) {
      results.push({
        checkId: 'RSRC-003',
        name: 'Resource object structure',
        category: 'resources',
        level: 'failure',
        description: `${resourcePath} is not a valid object`,
        specVersion: SPEC_VERSION,
        specReference: 'MCP spec §6 (Resources)',
        confidence: 'deterministic',
        details: { index: i },
      });
      continue;
    }

    const uri = resource['uri'];
    const name = resource['name'];
    const resourceLabel = isNonEmptyString(name) ? `"${name}"` : `#${i}`;

    // RSRC-003: uri must be a string
    const hasValidUri = typeof uri === 'string';
    results.push({
      checkId: 'RSRC-003',
      name: 'Resource uri field',
      category: 'resources',
      level: hasValidUri ? 'pass' : 'failure',
      description: hasValidUri
        ? `Resource ${resourceLabel} has a valid uri field: "${uri as string}"`
        : `Resource ${resourceLabel} is missing a valid uri field (got: ${JSON.stringify(uri)})`,
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §6 (Resources)',
      confidence: 'deterministic',
      field: `${resourcePath}.uri`,
      details: { index: i, uri },
    });

    // RSRC-004: name must be a string
    const hasValidName = typeof name === 'string';
    results.push({
      checkId: 'RSRC-004',
      name: 'Resource name field',
      category: 'resources',
      level: hasValidName ? 'pass' : 'failure',
      description: hasValidName
        ? `Resource ${resourceLabel} has a valid name field`
        : `Resource at index ${i} is missing a valid name field (got: ${JSON.stringify(name)})`,
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §6 (Resources)',
      confidence: 'deterministic',
      field: `${resourcePath}.name`,
      details: { index: i, name },
    });
  }

  // RSRC-005: resources/read response has contents array
  const readResp = exchange.resourceReadResponse;

  if (readResp === null) {
    results.push({
      checkId: 'RSRC-005',
      name: 'resources/read response contents',
      category: 'resources',
      level: 'info',
      description: 'No resources/read response found — read validation skipped',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §6 (Resources)',
      confidence: 'deterministic',
    });
    return results;
  }

  if ('error' in readResp && readResp.error !== undefined) {
    results.push({
      checkId: 'RSRC-005',
      name: 'resources/read response contents',
      category: 'resources',
      level: 'failure',
      description: `resources/read returned an error: ${readResp.error.message} (code: ${readResp.error.code})`,
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §6 (Resources)',
      confidence: 'deterministic',
      details: { errorCode: readResp.error.code, errorMessage: readResp.error.message },
    });
    return results;
  }

  const readResult = readResp.result;
  if (!isPlainObject(readResult)) {
    results.push({
      checkId: 'RSRC-005',
      name: 'resources/read response contents',
      category: 'resources',
      level: 'failure',
      description: 'resources/read result is not a valid object',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §6 (Resources)',
      confidence: 'deterministic',
      field: 'result',
    });
    return results;
  }

  const contents = readResult['contents'];
  const hasContents = Array.isArray(contents);

  results.push({
    checkId: 'RSRC-005',
    name: 'resources/read response contents',
    category: 'resources',
    level: hasContents ? 'pass' : 'failure',
    description: hasContents
      ? `resources/read result contains a contents array with ${(contents as unknown[]).length} item(s)`
      : `resources/read result.contents is not an array (got: ${typeof contents})`,
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §6 (Resources)',
    confidence: 'deterministic',
    field: 'result.contents',
    details: hasContents ? { count: (contents as unknown[]).length } : {},
  });

  return results;
}
