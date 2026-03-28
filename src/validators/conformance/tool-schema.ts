/**
 * S-1-20: Tool schema validator
 *
 * Validates each tool object returned by tools/list for:
 * - name (non-empty string, required)
 * - description (warning if absent)
 * - inputSchema: type must be "object", properties must be an object if present
 * - required array: must be a string array referencing defined properties
 * - Lightweight in-house JSON Schema draft-07 structural check
 */
import type { ProtocolExchangeRecord } from '../../types/protocol.js';
import type { VerificationConfig } from '../../types/config.js';
import type { CheckResult } from '../../types/conformance.js';

const SPEC_VERSION = '2024-11-05';

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// ---------------------------------------------------------------------------
// JSON Schema draft-07 structural check (no Ajv — lightweight in-house)
// ---------------------------------------------------------------------------

const VALID_SCHEMA_TYPES = new Set([
  'string', 'number', 'integer', 'boolean', 'null', 'array', 'object',
]);

interface SchemaIssue {
  path: string;
  message: string;
}

function validateJsonSchemaNode(
  schema: unknown,
  path: string,
  issues: SchemaIssue[],
): void {
  if (!isPlainObject(schema)) {
    // Boolean schemas are valid in draft-07
    if (typeof schema === 'boolean') return;
    issues.push({ path, message: `Schema node must be an object or boolean, got: ${typeof schema}` });
    return;
  }

  // Validate "type" if present
  if ('type' in schema) {
    const t = schema['type'];
    if (Array.isArray(t)) {
      for (const item of t) {
        if (!VALID_SCHEMA_TYPES.has(item as string)) {
          issues.push({ path: `${path}.type`, message: `Unknown type value: ${JSON.stringify(item)}` });
        }
      }
    } else if (t !== undefined && !VALID_SCHEMA_TYPES.has(t as string)) {
      issues.push({ path: `${path}.type`, message: `Unknown type value: ${JSON.stringify(t)}` });
    }
  }

  // Validate "properties" if present
  if ('properties' in schema) {
    const props = schema['properties'];
    if (!isPlainObject(props)) {
      issues.push({ path: `${path}.properties`, message: 'properties must be an object' });
    } else {
      for (const [key, val] of Object.entries(props)) {
        validateJsonSchemaNode(val, `${path}.properties.${key}`, issues);
      }
    }
  }

  // Validate "items" if present
  if ('items' in schema) {
    const items = schema['items'];
    if (Array.isArray(items)) {
      items.forEach((item, i) => validateJsonSchemaNode(item, `${path}.items[${i}]`, issues));
    } else {
      validateJsonSchemaNode(items, `${path}.items`, issues);
    }
  }

  // Validate "additionalProperties" if present (can be boolean or schema)
  if ('additionalProperties' in schema) {
    const ap = schema['additionalProperties'];
    if (typeof ap !== 'boolean') {
      validateJsonSchemaNode(ap, `${path}.additionalProperties`, issues);
    }
  }

  // Validate "required" at schema level if present
  if ('required' in schema) {
    const req = schema['required'];
    if (!Array.isArray(req)) {
      issues.push({ path: `${path}.required`, message: 'required must be an array' });
    } else {
      for (const item of req) {
        if (typeof item !== 'string') {
          issues.push({ path: `${path}.required`, message: `required array items must be strings, got: ${typeof item}` });
        }
      }
    }
  }

  // Validate allOf / anyOf / oneOf / not
  for (const keyword of ['allOf', 'anyOf', 'oneOf'] as const) {
    if (keyword in schema) {
      const arr = schema[keyword];
      if (!Array.isArray(arr)) {
        issues.push({ path: `${path}.${keyword}`, message: `${keyword} must be an array` });
      } else {
        arr.forEach((item, i) => validateJsonSchemaNode(item, `${path}.${keyword}[${i}]`, issues));
      }
    }
  }

  if ('not' in schema) {
    validateJsonSchemaNode(schema['not'], `${path}.not`, issues);
  }

  // Validate definitions / $defs
  for (const keyword of ['definitions', '$defs'] as const) {
    if (keyword in schema) {
      const defs = schema[keyword];
      if (!isPlainObject(defs)) {
        issues.push({ path: `${path}.${keyword}`, message: `${keyword} must be an object` });
      } else {
        for (const [key, val] of Object.entries(defs)) {
          validateJsonSchemaNode(val, `${path}.${keyword}.${key}`, issues);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Per-tool validation
// ---------------------------------------------------------------------------

function validateTool(
  tool: unknown,
  index: number,
  results: CheckResult[],
): void {
  const toolPath = `tools[${index}]`;

  if (!isPlainObject(tool)) {
    results.push({
      checkId: 'TOOL-001',
      name: 'Tool object structure',
      category: 'tools',
      level: 'failure',
      description: `${toolPath} is not a valid object`,
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §5 (Tools)',
      confidence: 'deterministic',
      details: { index },
    });
    return;
  }

  // TOOL-001: name must be a non-empty string
  const name = tool['name'];
  const hasValidName = isNonEmptyString(name);
  const toolLabel = hasValidName ? `"${name as string}"` : `#${index}`;

  results.push({
    checkId: 'TOOL-001',
    name: 'Tool name field',
    category: 'tools',
    level: hasValidName ? 'pass' : 'failure',
    description: hasValidName
      ? `Tool ${toolLabel} has a valid name field`
      : `Tool at index ${index} is missing a valid name field (got: ${JSON.stringify(name)})`,
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §5 (Tools)',
    confidence: 'deterministic',
    field: `${toolPath}.name`,
    details: { index, name },
  });

  // TOOL-002: description should be present (warning if absent)
  const description = tool['description'];
  const hasDescription = typeof description === 'string';
  results.push({
    checkId: 'TOOL-002',
    name: 'Tool description field',
    category: 'tools',
    level: hasDescription ? 'pass' : 'warning',
    description: hasDescription
      ? `Tool ${toolLabel} has a description field`
      : `Tool ${toolLabel} is missing a description field — recommended for discoverability`,
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §5 (Tools)',
    confidence: 'deterministic',
    field: `${toolPath}.description`,
    details: { index, toolName: name },
  });

  // TOOL-003: inputSchema must be present
  const inputSchema = tool['inputSchema'];
  const hasInputSchema = inputSchema !== undefined && inputSchema !== null;

  results.push({
    checkId: 'TOOL-003',
    name: 'Tool inputSchema presence',
    category: 'tools',
    level: hasInputSchema ? 'pass' : 'failure',
    description: hasInputSchema
      ? `Tool ${toolLabel} has an inputSchema field`
      : `Tool ${toolLabel} is missing the required inputSchema field`,
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §5 (Tools)',
    confidence: 'deterministic',
    field: `${toolPath}.inputSchema`,
    details: { index, toolName: name },
  });

  if (!hasInputSchema) return;

  // TOOL-004: inputSchema.type must be "object"
  if (!isPlainObject(inputSchema)) {
    results.push({
      checkId: 'TOOL-004',
      name: 'Tool inputSchema type field',
      category: 'tools',
      level: 'failure',
      description: `Tool ${toolLabel} inputSchema is not a valid object`,
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §5 (Tools)',
      confidence: 'deterministic',
      field: `${toolPath}.inputSchema`,
      details: { index, toolName: name },
    });
    return;
  }

  const schemaType = inputSchema['type'];
  const hasObjectType = schemaType === 'object';

  results.push({
    checkId: 'TOOL-004',
    name: 'Tool inputSchema type field',
    category: 'tools',
    level: hasObjectType ? 'pass' : 'failure',
    description: hasObjectType
      ? `Tool ${toolLabel} inputSchema.type is "object"`
      : `Tool ${toolLabel} inputSchema.type must be "object" (got: ${JSON.stringify(schemaType)})`,
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §5 (Tools)',
    confidence: 'deterministic',
    field: `${toolPath}.inputSchema.type`,
    details: { index, toolName: name, schemaType },
  });

  // TOOL-005: inputSchema.properties must be an object if present
  const properties = inputSchema['properties'];
  const hasProperties = 'properties' in inputSchema && properties !== undefined;

  if (hasProperties) {
    const propertiesIsObject = isPlainObject(properties);
    results.push({
      checkId: 'TOOL-005',
      name: 'Tool inputSchema properties structure',
      category: 'tools',
      level: propertiesIsObject ? 'pass' : 'failure',
      description: propertiesIsObject
        ? `Tool ${toolLabel} inputSchema.properties is a valid object`
        : `Tool ${toolLabel} inputSchema.properties must be an object (got: ${Array.isArray(properties) ? 'array' : typeof properties})`,
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §5 (Tools)',
      confidence: 'deterministic',
      field: `${toolPath}.inputSchema.properties`,
      details: { index, toolName: name },
    });
  }

  // TOOL-006: required array must be a string array referencing defined properties
  const required = inputSchema['required'];
  const hasRequired = 'required' in inputSchema && required !== undefined;

  if (hasRequired) {
    const requiredIsArray = Array.isArray(required);
    const allStrings = requiredIsArray && (required as unknown[]).every((item) => typeof item === 'string');

    let level: CheckResult['level'] = 'pass';
    let description = `Tool ${toolLabel} inputSchema.required is a valid string array`;

    if (!requiredIsArray) {
      level = 'failure';
      description = `Tool ${toolLabel} inputSchema.required must be an array (got: ${typeof required})`;
    } else if (!allStrings) {
      level = 'failure';
      description = `Tool ${toolLabel} inputSchema.required must be an array of strings`;
    } else if (hasProperties && isPlainObject(properties)) {
      // Check that all required entries reference defined properties
      const propKeys = new Set(Object.keys(properties as Record<string, unknown>));
      const undeclared = (required as string[]).filter((r) => !propKeys.has(r));
      if (undeclared.length > 0) {
        level = 'failure';
        description = `Tool ${toolLabel} inputSchema.required references properties not defined in properties: ${undeclared.map((u) => `"${u}"`).join(', ')}`;
      }
    }

    results.push({
      checkId: 'TOOL-006',
      name: 'Tool inputSchema required array',
      category: 'tools',
      level,
      description,
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §5 (Tools) / JSON Schema draft-07',
      confidence: 'deterministic',
      field: `${toolPath}.inputSchema.required`,
      details: { index, toolName: name },
    });
  }

  // TOOL-007: Structural JSON Schema draft-07 validation
  const schemaIssues: SchemaIssue[] = [];
  validateJsonSchemaNode(inputSchema, `${toolPath}.inputSchema`, schemaIssues);

  if (schemaIssues.length > 0) {
    for (const issue of schemaIssues) {
      results.push({
        checkId: 'TOOL-007',
        name: 'Tool inputSchema structural validity',
        category: 'tools',
        level: 'warning',
        description: `Tool ${toolLabel} inputSchema structural issue at ${issue.path}: ${issue.message}`,
        specVersion: SPEC_VERSION,
        specReference: 'JSON Schema draft-07',
        confidence: 'high',
        field: issue.path,
        details: { index, toolName: name, issuePath: issue.path },
      });
    }
  } else {
    results.push({
      checkId: 'TOOL-007',
      name: 'Tool inputSchema structural validity',
      category: 'tools',
      level: 'pass',
      description: `Tool ${toolLabel} inputSchema passes structural JSON Schema draft-07 validation`,
      specVersion: SPEC_VERSION,
      specReference: 'JSON Schema draft-07',
      confidence: 'high',
      details: { index, toolName: name },
    });
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function validateToolSchema(
  exchange: ProtocolExchangeRecord,
  _config: VerificationConfig,
): CheckResult[] {
  const results: CheckResult[] = [];
  const tools = exchange.tools;

  if (tools.length === 0) {
    // Check if the server declared tools capability — if not, this is expected
    const initResult = exchange.initializeResponse;
    let toolsDeclared = false;
    if (
      initResult !== null &&
      'result' in initResult &&
      initResult.result !== null &&
      isPlainObject(initResult.result)
    ) {
      const caps = (initResult.result as Record<string, unknown>)['capabilities'];
      if (isPlainObject(caps) && 'tools' in caps) {
        toolsDeclared = true;
      }
    }

    results.push({
      checkId: 'TOOL-000',
      name: 'Tools list presence',
      category: 'tools',
      level: toolsDeclared ? 'warning' : 'info',
      description: toolsDeclared
        ? 'Server declared tools capability but no tools were returned in tools/list'
        : 'No tools found in exchange record — tools capability may not be declared',
      specVersion: SPEC_VERSION,
      specReference: 'MCP spec §5 (Tools)',
      confidence: 'deterministic',
    });
    return results;
  }

  results.push({
    checkId: 'TOOL-000',
    name: 'Tools list presence',
    category: 'tools',
    level: 'pass',
    description: `${tools.length} tool(s) found in exchange record`,
    specVersion: SPEC_VERSION,
    specReference: 'MCP spec §5 (Tools)',
    confidence: 'deterministic',
    details: { count: tools.length },
  });

  for (let i = 0; i < tools.length; i++) {
    validateTool(tools[i], i, results);
  }

  return results;
}
