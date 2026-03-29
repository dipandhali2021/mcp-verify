# Plugin Authoring Guide

Write custom plugins to extend MCP Verify with domain-specific security checks, conformance rules, and health metrics for MCP servers.

## Quick Start

Create a minimal plugin in under 20 lines of TypeScript:

```typescript
import type { PluginDefinition } from 'mcp-verify';

const myPlugin: PluginDefinition = {
  id: 'my-custom-check',
  name: 'My Custom Check',
  description: 'Checks for a custom security concern.',
  version: '1.0.0',

  async check(context) {
    const { target, transport, initializeResponse } = context;

    if (transport === 'stdio') {
      return [];
    }

    // Your check logic here
    const findings = [];
    if (someCondition) {
      findings.push({
        checkId: 'my-custom-check',
        severity: 'high',
        cvssScore: 7.5,
        component: target,
        title: 'Issue Title',
        description: 'Issue description.',
        remediation: 'How to fix it.',
        confidence: 'deterministic',
      });
    }

    return findings;
  },
};

export default myPlugin;
```

Save this as `my-custom-check.js` or `my-custom-check.ts`, then register it in `mcp-verify.config.js`:

```javascript
export default {
  plugins: ['./my-custom-check.js'],
};
```

Run `mcp-verify` — your plugin will execute and report any findings.

---

## Plugin Structure

Every plugin must export a default object that implements the `PluginDefinition` interface:

```typescript
export interface PluginDefinition {
  /** Unique identifier; used in config and suppression. */
  id: string;

  /** Human-readable display name. */
  name: string;

  /** One-line description of what this plugin checks. */
  description: string;

  /** Semver version of the plugin itself (e.g., '1.0.0'). */
  version: string;

  /** The async check function that performs the actual validation. */
  check: (context: PluginContext) => Promise<PluginFinding[]>;
}
```

### Required Fields

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `id` | string | Unique identifier for the plugin. Used as the key in `rules` config and for suppression. | `'custom-auth-check'` |
| `name` | string | Human-readable name shown in reports. | `'Custom Authentication Check'` |
| `description` | string | One-line summary of the check. | `'Checks whether the MCP server advertises an authentication mechanism.'` |
| `version` | string | Semver version of the plugin code. | `'1.0.0'` |
| `check` | async function | The entrypoint that performs the validation and returns findings. | See **Check Function** section below. |

---

## Plugin Context

The `check()` function receives a `PluginContext` object with data about the MCP server being verified:

```typescript
export interface PluginContext {
  /** The target URL (for HTTP) or stdio command string. */
  target: string;

  /** Detected transport type: 'http' or 'stdio'. */
  transport: string;

  /** The server's initialize response (MCP JSON-RPC result). */
  initializeResponse: Record<string, unknown>;

  /** Array of tool objects from tools/list. */
  toolsList: unknown[];

  /** Array of resource objects from resources/list. */
  resourcesList: unknown[];

  /** Array of prompt objects from prompts/list. */
  promptsList: unknown[];

  /** Raw responses from error-probe requests. */
  errorProbeResponses: unknown[];

  /** Plugin-specific configuration from mcp-verify.config.js rules. */
  config: Record<string, unknown>;
}
```

### Accessing Context Data

```typescript
async check(context) {
  const { target, transport, initializeResponse, toolsList, config } = context;

  // Example: Skip for stdio servers (no network security concerns)
  if (transport === 'stdio') {
    return [];
  }

  // Example: Read plugin config
  const maxTools = config['maxTools'] ?? 100;

  // Example: Inspect initialize response
  const serverName = initializeResponse['name'];

  // Example: Check tools count
  if (toolsList.length > maxTools) {
    // Report finding
  }

  return findings;
}
```

---

## Returning Findings

Your `check()` function must return an array of `PluginFinding` objects. Each finding represents one detected issue:

```typescript
export interface PluginFinding {
  /** Must match your plugin's `id`, optionally with a sub-check suffix. */
  checkId: string;

  /** Severity level: 'critical', 'high', 'medium', 'low', or 'info'. */
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';

  /** CVSS score (0.0–10.0) indicating exploitability and impact. */
  cvssScore: number;

  /** Component name (e.g., target URL, tool name, resource name). */
  component: string;

  /** Title of the issue (50–100 characters recommended). */
  title: string;

  /** Description of the issue (2–3 sentences). */
  description: string;

  /** How to fix the issue (actionable steps). */
  remediation: string;

  /** 'deterministic' (always true) or 'heuristic' (best-guess). */
  confidence: 'deterministic' | 'heuristic';

  /** Optional: Evidence object supporting the finding. */
  evidence?: Record<string, unknown>;
}
```

### Example Finding

```typescript
{
  checkId: 'rate-limit-check',
  severity: 'low',
  cvssScore: 3.1,
  component: 'https://api.example.com/mcp',
  title: 'No Rate Limiting Detected',
  description:
    'The MCP server does not enforce rate limiting. No rate-limit headers ' +
    'were found in server responses. Without rate limiting, clients can send ' +
    'unlimited requests, potentially causing denial of service.',
  remediation:
    'Implement rate limiting on the MCP server and include standard ' +
    'rate-limit response headers (RateLimit-Limit, RateLimit-Remaining, ' +
    'RateLimit-Reset per RFC 6585).',
  confidence: 'heuristic',
  evidence: {
    transport: 'http',
    errorProbeCount: 5,
  },
}
```

### Severity Levels

Choose the severity based on potential impact:

| Level | Impact | CVSS Guidance | Example |
|-------|--------|---------------|---------|
| **critical** | Complete compromise | 9.0–10.0 | Unauthenticated RCE |
| **high** | Significant impact | 7.0–8.9 | Authentication bypass |
| **medium** | Moderate impact | 4.0–6.9 | Information disclosure |
| **low** | Minor impact | 0.1–3.9 | Missing rate limiting |
| **info** | Informational only | N/A (0.0) | Version advertisement |

---

## Configuration

Configure your plugin via the `rules` object in `mcp-verify.config.js`:

```javascript
export default {
  plugins: [
    './my-custom-check.js',
    'some-npm-package',
  ],

  rules: {
    'my-custom-check': {
      enabled: true,
      skipAuthCheck: false,
      severity: 'high',
      cvssScore: 7.5,
      maxTools: 100,
    },
  },
};
```

Your plugin receives this config as `context.config`:

```typescript
async check(context) {
  const { config } = context;

  // Read config with defaults
  const skipAuthCheck = config['skipAuthCheck'] ?? false;
  const maxTools = config['maxTools'] ?? 50;
  const customSeverity = config['severity'] ?? 'medium';

  if (skipAuthCheck) {
    return [];
  }

  // Rest of check logic...
}
```

### Config Best Practices

1. **Use sensible defaults** – Make your plugin work without config.
2. **Document config options** – Explain each option in your plugin's README.
3. **Type-check config** – Validate types at runtime (TypeScript does not guard at runtime).
4. **Allow opt-out** – Provide a flag to skip checks (e.g., `skipAuthCheck: true`).

Example with validation:

```typescript
async check(context) {
  const { config } = context;

  const severity = config['severity'];
  if (severity && !['critical', 'high', 'medium', 'low', 'info'].includes(severity)) {
    throw new Error(`Invalid severity: ${severity}`);
  }

  // Use validated config
  const reportSeverity = severity ?? 'medium';
  // ...
}
```

---

## Error Handling

Plugins run in a sandboxed environment with a **30-second timeout**. Failures are isolated and do not abort the entire verification run.

### Timeout Handling

If your plugin exceeds 30 seconds, it will be terminated and a warning logged to stderr:

```
Warning: Plugin "my-custom-check" timed out after 30000ms — skipping.
```

**To avoid timeouts:**

- Use fast checks (target: < 2 seconds per plugin).
- Batch I/O operations.
- Avoid tight loops over large datasets.
- If you need external APIs, use short timeouts (e.g., 5 seconds).

### Graceful Failure

If your `check()` function throws an error, it is caught and logged — the run continues:

```
Warning: Plugin "my-custom-check" check() rejected: Network timeout — skipping.
```

**To handle errors gracefully:**

```typescript
async check(context) {
  try {
    // Your check logic
  } catch (error) {
    // Option 1: Return empty array (skip check)
    return [];

    // Option 2: Log and return empty array
    console.error('Check failed:', error);
    return [];

    // Option 3: Return an error finding
    return [
      {
        checkId: 'my-check-error',
        severity: 'info',
        cvssScore: 0.0,
        component: context.target,
        title: 'Plugin Execution Error',
        description: `Error: ${error instanceof Error ? error.message : String(error)}`,
        remediation: 'N/A',
        confidence: 'deterministic',
      },
    ];
  }
}
```

### Synchronous Errors

Errors thrown synchronously in `check()` are also caught:

```typescript
async check(context) {
  // This will be caught
  throw new Error('Oops!');
}
```

You may also throw or reject promises:

```typescript
async check(context) {
  return new Promise((resolve) => {
    throw new Error('Synchronous error');
  });
}
```

Both are handled gracefully.

---

## Testing Plugins

Test your plugin by mocking the `PluginContext` and calling `check()` directly:

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import myPlugin from './my-custom-check.js';

describe('my-custom-check', () => {
  it('returns no findings for stdio servers', async () => {
    const context = {
      target: 'npx custom-server',
      transport: 'stdio',
      initializeResponse: {},
      toolsList: [],
      resourcesList: [],
      promptsList: [],
      errorProbeResponses: [],
      config: {},
    };

    const findings = await myPlugin.check(context);
    expect(findings).toEqual([]);
  });

  it('reports finding when auth is missing', async () => {
    const context = {
      target: 'http://api.example.com',
      transport: 'http',
      initializeResponse: { name: 'MyServer' }, // No auth field
      toolsList: [],
      resourcesList: [],
      promptsList: [],
      errorProbeResponses: [],
      config: {},
    };

    const findings = await myPlugin.check(context);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe('high');
  });

  it('skips check when configured', async () => {
    const context = {
      target: 'http://api.example.com',
      transport: 'http',
      initializeResponse: {},
      toolsList: [],
      resourcesList: [],
      promptsList: [],
      errorProbeResponses: [],
      config: { skipAuthCheck: true },
    };

    const findings = await myPlugin.check(context);
    expect(findings).toEqual([]);
  });
});
```

### Running Tests Locally

```bash
# Run all plugin tests
npm test

# Run specific plugin test
npm test -- my-custom-check.test.ts

# Watch mode
npm test -- --watch
```

### Mock Context Helper

Create a helper to reduce boilerplate:

```typescript
// test/mock-context.ts
import type { PluginContext } from 'mcp-verify';

export function createMockContext(overrides?: Partial<PluginContext>): PluginContext {
  return {
    target: 'http://example.com',
    transport: 'http',
    initializeResponse: {},
    toolsList: [],
    resourcesList: [],
    promptsList: [],
    errorProbeResponses: [],
    config: {},
    ...overrides,
  };
}
```

Usage:

```typescript
it('reports finding when auth is missing', async () => {
  const context = createMockContext({
    initializeResponse: { name: 'MyServer' },
  });

  const findings = await myPlugin.check(context);
  expect(findings.length).toBeGreaterThan(0);
});
```

---

## Publishing as an npm Package

Share your plugin with the community by publishing it to npm.

### Package Structure

```
my-mcp-check/
├── package.json
├── src/
│   └── index.ts
├── dist/
│   └── index.js
├── README.md
└── tsconfig.json
```

### package.json

```json
{
  "name": "@your-org/mcp-check-my-plugin",
  "version": "1.0.0",
  "description": "MCP Verify plugin that checks for X",
  "type": "module",
  "main": "./dist/index.js",
  "exports": {
    ".": "./dist/index.js"
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "vitest"
  },
  "keywords": [
    "mcp",
    "mcp-verify",
    "plugin",
    "security"
  ],
  "peerDependencies": {
    "mcp-verify": "^1.0.0"
  },
  "devDependencies": {
    "mcp-verify": "^1.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### Build Configuration

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

### README Template

```markdown
# @your-org/mcp-check-my-plugin

An mcp-verify plugin that checks for X.

## Installation

```bash
npm install --save-dev @your-org/mcp-check-my-plugin
```

## Usage

In `mcp-verify.config.js`:

```javascript
export default {
  plugins: ['@your-org/mcp-check-my-plugin'],
  rules: {
    'my-plugin-id': {
      // Plugin-specific config here
    },
  },
};
```

## Configuration

- `option1` (boolean, default: false) – Description.
- `option2` (number, default: 100) – Description.

## Testing

```bash
npm test
```

## License

MIT
```

### Publishing

```bash
# Build the plugin
npm run build

# Test before publishing
npm test

# Publish to npm
npm publish

# Or with a scope:
npm publish --access public
```

### Best Practices

1. **Use a scoped name** – `@your-org/mcp-check-X` prevents name collisions.
2. **Pin the version** – Specify `"mcp-verify": "^1.0.0"` as a peer dependency.
3. **Document config** – List all config options in your README.
4. **Include examples** – Show sample `mcp-verify.config.js` usage.
5. **Add keywords** – Use `mcp`, `mcp-verify`, `plugin`, and `security`.
6. **Write tests** – Publish with test coverage.
7. **Semantic versioning** – Follow semver for your plugin version.

---

## Reference Plugins

MCP Verify ships with two example plugins. Review them for inspiration:

### Custom Auth Check

**File**: `examples/plugins/custom-auth-check/index.ts`

Checks whether the MCP server advertises an authentication mechanism. Demonstrates:

- Conditional checks by transport type (skip stdio servers).
- Reading plugin config with defaults.
- Inspecting `initializeResponse` for specific fields.
- Returning findings with evidence.

Key excerpt:

```typescript
const authFound = hasAuthIndicator(initializeResponse);

if (!authFound) {
  return [{
    checkId: 'custom-auth-check',
    severity: config['severity'] ?? 'medium',
    cvssScore: config['cvssScore'] ?? 6.5,
    component: target,
    title: 'No Authentication Mechanism Detected',
    description: `The MCP server at "${target}" does not advertise an ` +
      `authentication mechanism in its initialize response.`,
    remediation: 'Add authentication to the MCP server...',
    confidence: 'heuristic',
    evidence: {
      initializeResponseKeys: Object.keys(initializeResponse),
      transport,
    },
  }];
}
```

### Rate Limit Check

**File**: `examples/plugins/rate-limit-check/index.ts`

Checks whether the MCP server enforces rate limiting by inspecting HTTP response headers and error probe responses. Demonstrates:

- Analyzing `errorProbeResponses` for evidence.
- Looking for standard HTTP headers (`RateLimit-*`, `X-RateLimit-*`).
- Handling nested objects in response data.
- Graceful skip when evidence is absent.

Key excerpt:

```typescript
function probeResponsesIndicateRateLimit(responses: unknown[]): boolean {
  for (const response of responses) {
    if (typeof response !== 'object' || response === null) continue;
    const resp = response as Record<string, unknown>;

    if (typeof resp['headers'] === 'object' && resp['headers'] !== null) {
      if (headersIndicateRateLimit(resp['headers'] as Record<string, unknown>)) {
        return true;
      }
    }

    if (resp['status'] === 429 || resp['statusCode'] === 429) {
      return true;
    }
  }

  return false;
}
```

---

## Common Patterns

### Skip for Stdio Servers

Network-specific checks should not run against local stdio servers:

```typescript
async check(context) {
  if (context.transport === 'stdio') {
    return [];
  }
  // Rest of check...
}
```

### Conditional Checks Based on Config

Allow users to opt out of a check:

```typescript
async check(context) {
  if (context.config['skipCheck'] === true) {
    return [];
  }
  // Rest of check...
}
```

### Batch Multiple Findings

Return multiple findings from one plugin:

```typescript
async check(context) {
  const findings = [];

  if (condition1) {
    findings.push({
      checkId: 'my-plugin-check-1',
      // ...
    });
  }

  if (condition2) {
    findings.push({
      checkId: 'my-plugin-check-2',
      // ...
    });
  }

  return findings;
}
```

### Inspect Tools and Resources

Analyze the tool and resource lists:

```typescript
async check(context) {
  const { toolsList, resourcesList } = context;

  for (const tool of toolsList) {
    const toolObj = tool as Record<string, unknown>;
    const toolName = toolObj['name'];
    // Check each tool...
  }

  for (const resource of resourcesList) {
    const resourceObj = resource as Record<string, unknown>;
    const uri = resourceObj['uri'];
    // Check each resource...
  }

  return findings;
}
```

### Include Evidence

Attach supporting data to help users understand the finding:

```typescript
{
  checkId: 'my-plugin',
  severity: 'high',
  cvssScore: 7.5,
  component: target,
  title: 'Example Issue',
  description: '...',
  remediation: '...',
  confidence: 'deterministic',
  evidence: {
    missingHeaders: ['Authorization', 'X-API-Key'],
    toolCount: 42,
    serverVersion: '1.2.3',
  },
}
```

---

## Summary

Plugins extend MCP Verify's security and conformance checks. To author a plugin:

1. **Create** a module that exports a `PluginDefinition`.
2. **Implement** the `check()` function to analyze a `PluginContext`.
3. **Return** an array of `PluginFinding` objects.
4. **Register** in `mcp-verify.config.js` under `plugins` and `rules`.
5. **Test** with mock context objects.
6. **Publish** as an npm package for the community.

Use the reference plugins as templates, and refer to the type definitions in `src/plugins/types.ts` for the complete API.
