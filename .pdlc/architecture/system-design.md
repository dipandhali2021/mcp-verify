# MCP Verify -- System Design

**Document Version:** 1.0
**Author:** System Architect (Tier 3 Engineer)
**Date:** 2026-03-28
**Status:** Approved -- Design Phase
**References:**
- `.pdlc/architecture/product-vision.md` -- Product vision, features P0/P1/P2, sprint roadmap
- `.pdlc/architecture/requirements.md` -- FR-001 through FR-080, NFR-001 through NFR-024
- MCP Specification: https://modelcontextprotocol.io
- JSON-RPC 2.0 Specification: https://www.jsonrpc.org/specification

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Component Architecture](#2-component-architecture)
3. [Data Model](#3-data-model)
4. [Module Dependency Graph](#4-module-dependency-graph)
5. [Directory Structure](#5-directory-structure)
6. [Build and Package Strategy](#6-build-and-package-strategy)
7. [Testing Strategy](#7-testing-strategy)
8. [Error Handling Strategy](#8-error-handling-strategy)
9. [Performance Budget](#9-performance-budget)

---

## 1. Architecture Overview

MCP Verify is a single-process, single-threaded Node.js CLI tool that connects to an MCP server, exercises the protocol, and produces a verification report. There is no daemon, no background service, no database. Every invocation is stateless with respect to the tool itself (Sprint 4 adds optional local history, but it is append-only and never required for core operation).

### High-Level Data Flow

```
                                  +---------------------+
                                  |   User Invocation   |
                                  |  npx mcp-verify     |
                                  |    <target>         |
                                  +----------+----------+
                                             |
                                             v
                               +-------------+-------------+
                               |       CLI Entry Point     |
                               |       (src/cli.ts)        |
                               |  Commander.js arg parsing |
                               |  Orchestration pipeline   |
                               +-------------+-------------+
                                             |
                        +--------------------+--------------------+
                        |                                         |
                        v                                         v
              +---------+---------+                    +----------+----------+
              |   Config Loader   |                    |   Plugin Loader     |
              |  (src/config/)    |                    |  (src/plugins/)     |
              |  .mcp-verify.json |                    |  Sprint 4           |
              |  CLI flag merge   |                    +----------+----------+
              +---------+---------+                               |
                        |                                         |
                        v                                         |
              +---------+---------+                               |
              |  Transport Layer  |                               |
              |  (src/transport/) |                               |
              |                   |                               |
              |  +-------------+  |                               |
              |  | StdioXport  |  |                               |
              |  +-------------+  |                               |
              |  +-------------+  |                               |
              |  | HttpXport   |  |                               |
              |  +-------------+  |                               |
              +---------+---------+                               |
                        |                                         |
                        | JSON-RPC messages                       |
                        v                                         |
              +---------+---------+                               |
              |  Protocol Engine  |                               |
              |  (src/protocol/)  |                               |
              |  Initialize ->    |                               |
              |  tools/list ->    |                               |
              |  resources/list ->|                               |
              |  prompts/list ->  |                               |
              |  error probes ->  |                               |
              +---------+---------+                               |
                        |                                         |
                        | ProtocolExchangeRecord                  |
                        v                                         |
       +----------------+----------------+                        |
       |                                 |                        |
       v                                 v                        |
+------+--------+              +---------+---------+              |
| Conformance   |              | Security          |              |
| Validators    |              | Analyzers         |              |
| (src/         |              | (src/             |              |
|  validators/  |              |  validators/      |              |
|  conformance/)|              |  security/)       |              |
+------+--------+              +---------+---------+              |
       |                                 |                        |
       | CheckResult[]                   | SecurityFinding[]      |
       v                                 v                        v
+------+---------------------------------+---------+--------------+--+
|                     Scoring Engine                                 |
|                     (src/scoring/)                                 |
|  Conformance score 0-100, category weights, severity aggregation  |
+------+------------------------------------------------------------+
       |
       | VerificationResult
       v
+------+--------+
|   Reporters   |
| (src/         |
|  reporters/)  |
|               |
| Terminal      |
| JSON          |
| Markdown      |
+------+--------+
       |
       v
+------+--------+         +-------------------+
|  Exit Code    |         |  History Store    |
|  0 / 1 / 2   |         |  (src/history/)   |
+---------------+         |  Sprint 4         |
                          +-------------------+
```

### Design Principles

1. **Pipeline architecture.** Data flows in one direction: input -> transport -> protocol -> validators -> scoring -> reporters -> exit. No component reaches backwards in the pipeline.

2. **Fail-open by default, fail-closed in CI.** The tool always produces the maximum amount of information possible. Partial results (e.g., server responds to initialize but times out on tools/list) are scored based on what completed. Exit codes are the enforcement mechanism, configured by thresholds.

3. **Zero side effects by default.** The core verification pipeline (Sprints 1-3) writes nothing to disk, makes no network requests except to the user-specified target, and stores no state. Sprint 4 features (history, dashboard) are additive and opt-out via `--no-history`.

4. **Composition over inheritance.** Validators, analyzers, and reporters are plain functions or stateless classes implementing shared interfaces. No deep class hierarchies.

5. **Bundle-time dependency resolution.** All third-party code is resolved at build time by tsup/esbuild. The published npm package has zero runtime `node_modules` dependencies.

---

## 2. Component Architecture

### 2.1 CLI Entry Point (`src/cli.ts`)

**Responsibility:** Parse command-line arguments, load configuration, orchestrate the verification pipeline from transport connection through to report output and exit code.

**Public Interface:**

```typescript
// src/cli.ts
export async function main(argv: string[]): Promise<void>;
```

The `main` function is the sole entry point. The `bin` field in `package.json` points to the built version of this file with a `#!/usr/bin/env node` shebang.

**Orchestration sequence (pseudocode):**

```
1. Parse argv with Commander.js
2. Load config (Config Loader)
3. Merge CLI flags over config (CLI wins)
4. Validate merged config (exit 2 on invalid)
5. Resolve transport type from target URL scheme (or --transport override)
6. Create transport instance
7. Run protocol engine (connect, handshake, probe)
8. Run conformance validators against protocol exchange record
9. Run security analyzers against protocol exchange record
10. Load and run plugins (Sprint 4)
11. Compute scores (Scoring Engine)
12. Assemble VerificationResult
13. Write to history store (Sprint 4, if enabled)
14. Format and output report (Reporter)
15. Determine exit code from thresholds
16. Exit
```

**Dependencies:** Config Loader, Transport Layer, Protocol Engine, Conformance Validators, Security Analyzers, Scoring Engine, Reporters, Plugin Loader (Sprint 4), History Store (Sprint 4).

**Error boundary:** The `main` function wraps the entire pipeline in a top-level try/catch. Any unhandled exception produces exit code 2 with a human-readable message to stderr. Stack traces are printed only when `--verbose` is set.

**Commander.js command structure:**

```
mcp-verify [verify] <target>     # Default command (FR-001)
mcp-verify serve                 # Sprint 4 (FR-066)
mcp-verify baseline <target>     # Sprint 4 (FR-073)
mcp-verify history export        # Sprint 4 (FR-074)
```

**Flags (all commands inherit global flags):**

| Flag | Type | Default | Sprint | Requirement |
|------|------|---------|--------|-------------|
| `--format <type>` | `terminal\|json\|markdown` | `terminal` | 3 (terminal in 1) | FR-002 |
| `--config <path>` | string | auto-discover | 3 | FR-003 |
| `--version`, `-V` | boolean | -- | 1 | FR-004 |
| `--help`, `-h` | boolean | -- | 1 | FR-005 |
| `--timeout <ms>` | number | 10000 | 1 | FR-010 |
| `--transport <type>` | `http\|stdio` | auto-detect | 3 | FR-020 |
| `--strict` | boolean | false | 3 | FR-009 |
| `--lenient` | boolean | false | 3 | FR-009 |
| `--verbose` | boolean | false | 3 | FR-054 |
| `--output <path>` | string | stdout | 3 | FR-055 |
| `--no-color` | boolean | false | 1 | FR-046 |
| `--no-history` | boolean | false | 4 | FR-067 |
| `--compare-last` | boolean | false | 4 | FR-072 |

---

### 2.2 Config Loader (`src/config/`)

**Responsibility:** Discover, read, parse, and validate the configuration file. Merge CLI arguments over config file values to produce a single `VerificationConfig` object.

**Public Interface:**

```typescript
// src/config/loader.ts
export async function loadConfig(options: {
  configPath?: string;
  cwd?: string;
}): Promise<VerificationConfig>;

// src/config/merge.ts
export function mergeCliOverrides(
  config: VerificationConfig,
  cliFlags: Partial<VerificationConfig>
): VerificationConfig;

// src/config/validate.ts
export function validateConfig(
  raw: unknown
): { valid: true; config: VerificationConfig } | { valid: false; errors: string[] };
```

**Discovery order (FR-003):**

1. If `--config <path>` is provided, use that path exclusively. Exit 2 if not found.
2. Otherwise, check `<cwd>/mcp-verify.json`.
3. Otherwise, check `<cwd>/.mcp-verify.json`.
4. If none found, return default config (no error).

**Config file schema (`mcp-verify.json`):**

```json
{
  "failOnSeverity": "critical",
  "conformanceThreshold": 0,
  "skip": [],
  "transport": null,
  "timeout": 10000,
  "checkMode": "balanced"
}
```

The JSON schema for the config file is published as `.mcp-verify.json.schema` at the repository root, enabling IDE autocompletion.

**Merge precedence:** CLI flag > config file > hardcoded default. This is implemented as a simple object spread: `{ ...defaults, ...configFile, ...cliFlags }` with `undefined` values stripped before merge.

**Dependencies:** `src/types/` (VerificationConfig type).

**Data flow:** Raw JSON from disk -> validation -> typed VerificationConfig -> merge with CLI flags -> final VerificationConfig passed to all downstream components.

---

### 2.3 Transport Layer (`src/transport/`)

**Responsibility:** Provide an abstract bidirectional JSON-RPC message channel over either stdio or HTTP+SSE. Encapsulate all transport-level concerns (process spawning, HTTP connections, SSE parsing, timeouts, cleanup).

**Public Interface:**

```typescript
// src/transport/types.ts
export interface Transport {
  /**
   * Send a JSON-RPC request and return the response.
   * Rejects on timeout or transport-level error.
   */
  send(message: JsonRpcRequest): Promise<JsonRpcResponse>;

  /**
   * Send a JSON-RPC notification (no response expected).
   */
  notify(message: JsonRpcNotification): Promise<void>;

  /**
   * Send raw bytes (for malformed-JSON probe per FR-018).
   * Returns whatever the server sends back, or null on timeout.
   */
  sendRaw(data: string): Promise<JsonRpcResponse | null>;

  /**
   * Get transport metadata collected during the session.
   * Includes HTTP headers, SSE format observations, timing data.
   */
  getMetadata(): TransportMetadata;

  /**
   * Close the transport connection and release all resources.
   * Must be safe to call multiple times.
   */
  close(): Promise<void>;
}

// src/transport/factory.ts
export function createTransport(
  target: string,
  config: VerificationConfig
): Transport;
```

**Transport auto-detection (FR-011):**

The `createTransport` factory inspects the target URL:

| URL prefix | Transport | Implementation |
|------------|-----------|---------------|
| `http://`, `https://` | HTTP+SSE | `HttpTransport` |
| `stdio://` | stdio | `StdioTransport` |
| Other | Error | Exit code 2 with message listing valid schemes |

The `--transport` flag (FR-020, Sprint 3) overrides this detection.

#### 2.3.1 StdioTransport (`src/transport/stdio.ts`)

**Implementation details:**

- Spawns the child process using Node.js `child_process.spawn()` with the path extracted from the `stdio://` prefix.
- For paths ending in `.js` or `.ts`, the process is spawned with `node` (or the current `process.execPath`) as the interpreter. For other extensions or no extension, the path is executed directly.
- stdin/stdout are connected as pipes. stderr from the child is captured and available in verbose mode but does not interfere with protocol parsing.
- Messages are framed as line-delimited JSON-RPC: one complete JSON object per line, terminated by `\n`.
- The transport maintains a pending-request map keyed by JSON-RPC `id`. When a line is read from stdout, it is parsed as JSON and matched to the pending request by `id`.
- Timeout: each `send()` call starts a timer. If no matching response arrives within `config.timeout`, the promise rejects with a `TimeoutError`.
- `close()`: sends SIGTERM to the child process. If the process has not exited within 2 seconds, sends SIGKILL. Returns a promise that resolves when the process is fully terminated.
- Pre-protocol output on stdout (non-JSON lines before the first valid JSON-RPC message) is captured in `TransportMetadata.preProtocolOutput` for conformance analysis (FR-029).

**Platform handling (FR-064):**
- On Windows, `spawn()` uses `shell: true` when the target path is a `.js` file to handle shebang-less scripts.
- Path separators are normalized using `path.resolve()`.

#### 2.3.2 HttpTransport (`src/transport/http.ts`)

**Implementation details:**

- Uses Node.js built-in `http`/`https` modules (no axios, no node-fetch). This eliminates a dependency and is compatible with Node.js 18+.
- JSON-RPC requests are sent as HTTP POST with `Content-Type: application/json`.
- The transport handles two response modes:
  1. **Direct JSON response:** `Content-Type: application/json` -- parse body as JSON-RPC response.
  2. **SSE stream:** `Content-Type: text/event-stream` -- parse the SSE stream, extract `data:` lines, parse each as a JSON-RPC message.
- HTTP response headers from every exchange are captured in `TransportMetadata.httpHeaders` for CORS analysis (FR-037) and auth detection (FR-038).
- SSE parsing: lines prefixed with `data:` have the prefix stripped and the remainder parsed as JSON. Lines prefixed with `event:`, `id:`, or `:` (comment) are captured in metadata but not treated as JSON-RPC messages. Empty lines delimit SSE events.
- Connection timeout: `config.timeout` applies to the initial TCP connection. Response timeout: `config.timeout` applies to waiting for the complete response body or SSE event.
- `close()`: destroys any active HTTP sockets and aborts pending requests using `AbortController`.
- HTTPS: TLS verification uses Node.js defaults (system CA bundle). No option to disable TLS verification is provided (security decision).

**TransportMetadata type:**

```typescript
// src/transport/types.ts
export interface TransportMetadata {
  type: 'stdio' | 'http';
  target: string;
  /** HTTP response headers from each exchange (HTTP transport only) */
  httpHeaders: Record<string, Record<string, string>>;
  /** SSE format observations: whether data: prefix was correct, etc. */
  sseObservations: SseObservation[];
  /** Pre-protocol stdout output (stdio transport only) */
  preProtocolOutput: string[];
  /** Per-message timing in ms */
  timing: MessageTiming[];
  /** Resolved IP address of the target host (HTTP transport only) */
  resolvedAddress?: string;
  /** Whether the resolved address is loopback/private/public */
  addressType?: 'loopback' | 'private' | 'public';
}
```

---

### 2.4 Protocol Engine (`src/protocol/`)

**Responsibility:** Execute the MCP protocol sequence against the connected transport: initialization handshake, capability-driven resource enumeration, and error probing. Produce a `ProtocolExchangeRecord` containing every request-response pair for downstream analysis.

**Public Interface:**

```typescript
// src/protocol/engine.ts
export async function executeProtocol(
  transport: Transport,
  config: VerificationConfig
): Promise<ProtocolExchangeRecord>;
```

**Protocol Sequence:**

The engine executes the following steps in order. Each step depends on the result of the previous step. If a step fails with a transport error, the engine records the failure and continues to the next step where possible. If initialization fails entirely, the engine returns immediately with whatever was captured.

```
Step 1: Initialize Handshake (FR-014)
  -> Send: { method: "initialize", params: { protocolVersion, capabilities, clientInfo } }
  <- Receive: { result: { protocolVersion, capabilities, serverInfo } }
  -> Send: { method: "initialized" } (notification, no id)

Step 2: Tool Enumeration (FR-015, conditional on capabilities.tools)
  -> Send: { method: "tools/list" }
  <- Receive: { result: { tools: [...] } }
  -> If response contains nextCursor, repeat with { params: { cursor } }

Step 3: Resource Enumeration (FR-016, conditional on capabilities.resources)
  -> Send: { method: "resources/list" }
  <- Receive: { result: { resources: [...] } }
  -> If resources.length > 0: Send { method: "resources/read", params: { uri: resources[0].uri } }
  <- Receive: { result: { contents: [...] } }

Step 4: Prompt Enumeration (FR-017, conditional on capabilities.prompts)
  -> Send: { method: "prompts/list" }
  <- Receive: { result: { prompts: [...] } }

Step 5: Error Probing (FR-018)
  -> Send: { method: "mcp-verify/probe-unknown-method", id: N }
  <- Receive: error response (or timeout)
  -> Send raw: "{ invalid json %%%"
  <- Receive: error response (or timeout)
```

**Client identity:**

The `initialize` request identifies the tool to the server:

```json
{
  "protocolVersion": "2024-11-05",
  "capabilities": {},
  "clientInfo": {
    "name": "mcp-verify",
    "version": "<tool-version>"
  }
}
```

The client declares no capabilities (empty object) because it is a verification tool, not a productive MCP client. It does not need to receive sampling requests or notifications.

**ProtocolExchangeRecord type:**

```typescript
// src/protocol/types.ts
export interface ProtocolExchangeRecord {
  /** The initialize request sent */
  initializeRequest: JsonRpcRequest;
  /** The initialize response received, or null if handshake failed */
  initializeResponse: JsonRpcResponse | null;
  /** Whether the initialized notification was sent successfully */
  initializedSent: boolean;
  /** Server info extracted from initialize response */
  serverInfo: MCPServerInfo | null;
  /** tools/list response(s), empty array if tools not declared */
  toolsListResponses: JsonRpcResponse[];
  /** Aggregated tools array from all paginated responses */
  tools: unknown[];
  /** resources/list response, null if resources not declared */
  resourcesListResponse: JsonRpcResponse | null;
  /** Aggregated resources array */
  resources: unknown[];
  /** resources/read response for the first resource, null if none */
  resourceReadResponse: JsonRpcResponse | null;
  /** prompts/list response, null if prompts not declared */
  promptsListResponse: JsonRpcResponse | null;
  /** Aggregated prompts array */
  prompts: unknown[];
  /** Response to the unknown-method probe */
  unknownMethodProbeResponse: JsonRpcResponse | null;
  /** Response to the malformed-JSON probe */
  malformedJsonProbeResponse: JsonRpcResponse | null;
  /** Transport metadata (headers, SSE observations, timing) */
  transportMetadata: TransportMetadata;
  /** Errors encountered during protocol execution */
  errors: ProtocolError[];
  /** Whether each step completed, timed out, or errored */
  stepResults: Record<ProtocolStep, StepResult>;
}

export type ProtocolStep =
  | 'initialize'
  | 'initialized'
  | 'tools/list'
  | 'resources/list'
  | 'resources/read'
  | 'prompts/list'
  | 'error-probe-unknown'
  | 'error-probe-malformed';

export interface StepResult {
  status: 'completed' | 'timeout' | 'error' | 'skipped';
  durationMs: number;
  error?: string;
}
```

**Dependencies:** Transport Layer (`src/transport/`), types (`src/types/`).

**Data flow:** VerificationConfig + Transport -> Protocol execution -> ProtocolExchangeRecord.

---

### 2.5 Conformance Validators (`src/validators/conformance/`)

**Responsibility:** Analyze the ProtocolExchangeRecord against the MCP specification and produce an array of `CheckResult` objects, each representing a pass, fail, or warning for a specific conformance check.

**Architecture:** Each validator is a standalone module exporting a single function. There is no validator base class. The validator runner calls each validator function in sequence, concatenating results.

**Public Interface:**

```typescript
// src/validators/conformance/runner.ts
export function runConformanceChecks(
  exchange: ProtocolExchangeRecord,
  config: VerificationConfig
): CheckResult[];

// Individual validator signature (shared by all validators)
export type ConformanceValidator = (
  exchange: ProtocolExchangeRecord,
  config: VerificationConfig
) => CheckResult[];
```

**Validator registry:**

```typescript
// src/validators/conformance/registry.ts
export const conformanceValidators: ConformanceValidator[] = [
  validateJsonRpcEnvelope,
  validateJsonRpcErrorCodes,
  validateInitialization,
  validateCapabilityNegotiation,
  validateToolSchemaStructure,
  validateToolSchemaContent,
  validateResourceProtocol,
  validatePromptProtocol,
  validateStdioTransport,
  validateHttpSseTransport,
  validateErrorHandling,
];
```

The runner iterates over the registry and concatenates all results. Adding a new conformance check means adding a function to this array.

#### Validator Specifications

**2.5.1 JsonRpcValidator (`json-rpc-envelope.ts`)**

- Checks: FR-021, FR-022
- Inspects every JSON-RPC response in the exchange record
- Validates: `jsonrpc: "2.0"` field presence and value, `id` field type (string | number | null), mutual exclusivity of `result` and `error`, error code ranges
- Category: `jsonrpc-base`
- All checks are `deterministic` confidence

**2.5.2 InitializationValidator (`initialization.ts`)**

- Checks: FR-023, FR-024
- Inspects: `initializeResponse`, server capability declarations vs. actual responses
- Validates: `protocolVersion` presence and value, `capabilities` object presence and structure, `serverInfo` presence and fields, capability declaration consistency
- Category: `initialization`
- All checks are `deterministic` confidence

**2.5.3 ToolSchemaValidator (`tool-schema.ts`)**

- Checks: FR-025, FR-026
- Inspects: each tool in the aggregated `tools` array
- Validates: `name` (non-empty string), `description` (non-empty string), `inputSchema` (valid JSON Schema draft-07), `inputSchema.type` is `"object"`, `properties` is object if present, `required` is string array if present
- Category: `tools`
- JSON Schema validation uses a lightweight embedded validator (Ajv is too large; we use a purpose-built draft-07 structural validator that checks syntax, not full schema evaluation)
- All checks are `deterministic` confidence

**2.5.4 ResourceValidator (`resource-protocol.ts`)**

- Checks: FR-027
- Inspects: `resourcesListResponse` and `resourceReadResponse`
- Validates: `resources` array presence, each resource has `uri` (valid URI) and `name`, `contents` array in read response, each content has `text` or `blob`
- Category: `resources`
- All checks are `deterministic` confidence

**2.5.5 PromptValidator (`prompt-protocol.ts`)**

- Checks: FR-028
- Inspects: `promptsListResponse`
- Validates: `prompts` array presence, each prompt has `name` (non-empty string), argument definitions have `name`, `required` is boolean if present
- Category: `prompts`
- All checks are `deterministic` confidence

**2.5.6 StdioTransportValidator (`stdio-transport.ts`)**

- Checks: FR-029
- Only runs when `transportMetadata.type === 'stdio'`
- Inspects: `transportMetadata.preProtocolOutput`, message framing observations
- Validates: all lines are valid JSON, no multi-object lines, newline termination, no extraneous pre-protocol output
- Category: `transport`
- All checks are `deterministic` confidence

**2.5.7 HttpSseTransportValidator (`http-sse-transport.ts`)**

- Checks: FR-030
- Only runs when `transportMetadata.type === 'http'`
- Inspects: `transportMetadata.httpHeaders`, `transportMetadata.sseObservations`
- Validates: `Content-Type: text/event-stream` on SSE responses, `data:` prefix format, SSE data is valid JSON, redirect detection
- Records CORS header presence for handoff to security analyzers
- Category: `transport`
- All checks are `deterministic` confidence

**2.5.8 ErrorHandlingValidator (`error-handling.ts`)**

- Checks: FR-031
- Inspects: `unknownMethodProbeResponse` and `malformedJsonProbeResponse`
- Validates: server responded (not timeout), error response uses correct codes (-32601 for unknown method, -32700 for parse error), response is well-formed JSON-RPC error
- Category: `jsonrpc-base` (error handling is a JSON-RPC concern)
- All checks are `deterministic` confidence

**Dependencies:** `src/protocol/types.ts` (ProtocolExchangeRecord), `src/types/` (CheckResult, VerificationConfig).

**Data flow:** ProtocolExchangeRecord -> validators -> CheckResult[].

---

### 2.6 Security Analyzers (`src/validators/security/`)

**Responsibility:** Analyze the ProtocolExchangeRecord for MCP-specific security vulnerabilities and produce an array of `SecurityFinding` objects.

**Architecture:** Mirrors the conformance validator pattern. Each analyzer is a standalone function. The analyzer runner calls each function and concatenates results.

**Public Interface:**

```typescript
// src/validators/security/runner.ts
export function runSecurityChecks(
  exchange: ProtocolExchangeRecord,
  config: VerificationConfig
): SecurityFinding[];

// Individual analyzer signature
export type SecurityAnalyzer = (
  exchange: ProtocolExchangeRecord,
  config: VerificationConfig
) => SecurityFinding[];
```

**Analyzer registry:**

```typescript
// src/validators/security/registry.ts
export const securityAnalyzers: SecurityAnalyzer[] = [
  analyzeCommandInjection,
  analyzeCorsPolicy,
  analyzeAuthentication,
  analyzeToolPoisoning,
  analyzeInformationLeakage,
];
```

#### Analyzer Specifications

**2.6.1 InjectionAnalyzer (`injection.ts`)**

- Check ID: `command-injection`
- Requirement: FR-036
- Inspects: each tool's `inputSchema.properties`
- Detection logic:
  1. For each property of type `string`:
     - Check if property name matches high-risk patterns: `/^(command|cmd|exec|shell|script|args|argv|path|file|filename|dir|directory)$/i`
     - Check if property description contains high-risk substrings: `execute`, `run`, `command`, `shell`, `script`, `path to`
  2. If a match is found, check for sanitization constraints:
     - `pattern` field present -> NOT flagged
     - `enum` field present -> NOT flagged
     - `maxLength` field present with value <= 255 -> reduced severity (not sufficient alone, but indicates awareness)
  3. If match found and no sanitization constraint, emit finding
- Severity: `high`
- CVSS: 8.1
- Confidence: `heuristic`
- Check mode sensitivity (FR-009):
  - `--strict`: also flags properties with descriptions mentioning `file`, `directory`, `url`, `input` without constraints
  - `--lenient`: only flags exact name matches for `command`, `cmd`, `exec`, `shell`

**2.6.2 CorsAnalyzer (`cors.ts`)**

- Check ID: `cors-wildcard`
- Requirement: FR-037
- Only runs for HTTP transport
- Inspects: `transportMetadata.httpHeaders` for `access-control-allow-origin`
- Detection logic: if any response header contains `Access-Control-Allow-Origin: *`, emit finding
- Severity: `high`
- CVSS: 7.5
- Confidence: `deterministic`

**2.6.3 AuthAnalyzer (`auth.ts`)**

- Check ID: `missing-auth`
- Requirement: FR-038
- Only runs for HTTP transport
- Inspects: `transportMetadata.resolvedAddress`, `transportMetadata.addressType`, `transportMetadata.httpHeaders`
- Detection logic:
  1. Resolve the target host IP address (already done in transport layer, stored in metadata)
  2. Classify: loopback (`127.0.0.1`, `::1`, `localhost`) -> skip. Private (RFC 1918: `10.x`, `172.16-31.x`, `192.168.x`) -> check with reduced severity. Public -> check with full severity.
  3. Check if the server responded to `initialize` without any `Authorization` header in the request (the tool never sends auth headers, so a successful initialize means the server accepts unauthenticated requests)
  4. Check for absence of `WWW-Authenticate` header in any server response
  5. If public + no auth required: severity `critical`, CVSS 9.8
  6. If private + no auth required: severity `medium`, CVSS 6.5
- Confidence: `heuristic` (the server may have auth on other endpoints; we can only observe the MCP endpoint)

**2.6.4 PoisoningAnalyzer (`poisoning.ts`)**

- Check ID: `tool-poisoning`
- Requirement: FR-039
- Inspects: each tool's `name` and `description` fields
- Detection logic:
  1. Pattern matching against description:
     - Case-insensitive: `IGNORE PREVIOUS`, `[SYSTEM]`, `<system>`, `</system>`, `DO NOT` (all-caps imperative), `you must`, `you are now`, `forget your instructions`, `new instructions`
     - XML/HTML tag detection: `/<[a-z]+>/i` patterns that look like embedded system prompts
  2. Description length check: > 2000 characters triggers finding
  3. Name encoding check: URL-encoded (`%XX`) or Base64-encoded substrings in tool name
- Severity: `critical`
- CVSS: 8.8
- Confidence: `heuristic`
- Check mode sensitivity:
  - `--strict`: lower threshold for description length (1000 chars), additional patterns
  - `--lenient`: only the most specific injection patterns (IGNORE PREVIOUS, [SYSTEM], <system>)

**2.6.5 LeakageAnalyzer (`leakage.ts`)**

- Check ID: `info-leakage`
- Requirement: FR-040
- Inspects: `unknownMethodProbeResponse` and `malformedJsonProbeResponse` error messages
- Detection logic:
  1. Stack trace patterns: `/at \w+\.\w+ \(/`, `/at Object\.<anonymous>/`, `/Error:.*\n\s+at /`
  2. Filesystem paths: `/\/home\/\w+/`, `/\/var\//`, `/\/usr\//`, `/C:\\Users\\/`, `/C:\\Program Files/`
  3. Environment variable patterns: `/process\.env\.\w+/`, `/\$[A-Z_]+/`, `/ENV\[/`
  4. Emit finding for each pattern category detected (not per individual match)
- Severity: `medium`
- CVSS: 5.3
- Confidence: `deterministic`

**Dependencies:** `src/protocol/types.ts` (ProtocolExchangeRecord), `src/types/` (SecurityFinding, VerificationConfig).

**Data flow:** ProtocolExchangeRecord -> analyzers -> SecurityFinding[].

---

### 2.7 Scoring Engine (`src/scoring/`)

**Responsibility:** Compute the composite conformance score (0-100) from check results using weighted category scores. Aggregate security findings by severity. Apply suppression rules. Determine the final pass/fail verdict based on configured thresholds.

**Public Interface:**

```typescript
// src/scoring/engine.ts
export function computeScores(
  checkResults: CheckResult[],
  securityFindings: SecurityFinding[],
  config: VerificationConfig
): ScoringResult;
```

**Scoring algorithm (FR-032):**

```
For each category in [jsonrpc-base, initialization, tools, resources, prompts, transport]:
  categoryScore = 100
  For each CheckResult in category:
    if result.level === 'failure':
      categoryScore -= FAILURE_PENALTY   (default: 15 points per failure)
    if result.level === 'warning':
      categoryScore -= WARNING_PENALTY   (default: 7 points per warning, half of failure)
  categoryScore = max(0, categoryScore)

overallScore = round(
    categoryScore['jsonrpc-base'] * 0.20
  + categoryScore['initialization'] * 0.25
  + categoryScore['tools'] * 0.25
  + categoryScore['resources'] * 0.10
  + categoryScore['prompts'] * 0.10
  + categoryScore['transport'] * 0.10
)
```

**Special case:** If the initialization handshake failed entirely (no valid initialize response), the overall score is 0 regardless of other category scores.

**Category weights:**

| Category | Weight | Rationale |
|----------|--------|-----------|
| JSON-RPC Base | 20% | Foundation layer; errors here break everything |
| Initialization | 25% | Handshake correctness is critical for interoperability |
| Tools | 25% | Most common capability; schema correctness prevents runtime failures |
| Resources | 10% | Important but less universally used |
| Prompts | 10% | Important but less universally used |
| Transport | 10% | Correctness matters but is usually handled by SDKs |

**Suppression handling (FR-042):**

Before scoring, findings whose `checkId` appears in `config.skip` are marked as `suppressed: true`. Suppressed findings are excluded from exit code computation but remain in the output.

**Exit code determination (FR-006, FR-007, FR-043, FR-053):**

```
if (any internal error caused protocol failure):
  exitCode = 2

else if (overallScore < config.conformanceThreshold):
  exitCode = 1

else if (any non-suppressed finding.severity >= config.failOnSeverity):
  exitCode = 1

else:
  exitCode = 0
```

**ScoringResult type:**

```typescript
// src/scoring/types.ts
export interface ScoringResult {
  overallScore: number;
  categoryScores: Record<ConformanceCategory, number>;
  categoryWeights: Record<ConformanceCategory, number>;
  securitySummary: Record<Severity, number>;
  suppressedCount: number;
  pass: boolean;
  exitCode: 0 | 1 | 2;
}
```

**Dependencies:** `src/types/` (CheckResult, SecurityFinding, VerificationConfig).

---

### 2.8 Reporters (`src/reporters/`)

**Responsibility:** Format the `VerificationResult` into the requested output format and write it to the appropriate destination (stdout, file, or both).

**Public Interface:**

```typescript
// src/reporters/types.ts
export interface Reporter {
  render(result: VerificationResult): string;
}

// src/reporters/factory.ts
export function createReporter(format: 'terminal' | 'json' | 'markdown'): Reporter;
```

#### 2.8.1 TerminalReporter (`src/reporters/terminal.ts`)

- Requirement: FR-046, FR-047, FR-048
- Produces color-coded human-readable output
- Color handling:
  - Uses ANSI escape codes directly (no chalk dependency -- chalk is 20KB+ and we control the output format)
  - Color disabled when: `process.env.NO_COLOR` is set, `!process.stdout.isTTY`, or `--no-color` flag
- Output structure:

```
MCP Verify v1.0.0 -- MCP spec 2024-11-05

Target:     http://localhost:3000
Transport:  HTTP+SSE
Duration:   1.2s
Timestamp:  2026-03-28T14:30:00Z

=== Conformance Score: 87/100 ===

  JSON-RPC Base:   95/100
  Initialization:  100/100
  Tools:           80/100
    [FAIL] Tool "run-shell": inputSchema missing "type" field
    [WARN] Tool "query-db": inputSchema property "query" has no type
  Resources:       90/100
  Prompts:         100/100
  Transport:       85/100

=== Security Findings ===

  [CRITICAL] command-injection
    Tool "run-shell", parameter "command"
    Unconstrained string parameter with shell-executable name
    Remediation: Add a "pattern" or "enum" constraint

  [HIGH] cors-wildcard
    Endpoint http://localhost:3000
    Access-Control-Allow-Origin: * permits cross-origin access
    Remediation: Restrict to known origins

Security: Critical: 1, High: 1, Medium: 0, Low: 0

=== FAIL ===
```

#### 2.8.2 JsonReporter (`src/reporters/json.ts`)

- Requirement: FR-049, FR-050
- Produces a single valid JSON document
- Schema version: `"1.0"`
- Top-level structure:

```json
{
  "schemaVersion": "1.0",
  "meta": {
    "toolVersion": "1.0.0",
    "specVersion": "2024-11-05",
    "timestamp": "2026-03-28T14:30:00.000Z",
    "target": "http://localhost:3000",
    "transport": "http",
    "duration": 1234,
    "checkMode": "balanced",
    "thresholds": {
      "failOnSeverity": "critical",
      "conformanceThreshold": 0
    }
  },
  "conformance": {
    "score": 87,
    "breakdown": {
      "jsonrpc-base": 95,
      "initialization": 100,
      "tools": 80,
      "resources": 90,
      "prompts": 100,
      "transport": 85
    },
    "violations": [...]
  },
  "security": {
    "findings": [...],
    "suppressed": [...]
  },
  "summary": {
    "pass": false,
    "blockerCount": {
      "critical": 1,
      "high": 1,
      "medium": 0,
      "low": 0
    }
  }
}
```

- No ANSI codes, no decorative text. All error/diagnostic output goes to stderr.
- `JSON.stringify(result, null, 2)` with deterministic key ordering.

#### 2.8.3 MarkdownReporter (`src/reporters/markdown.ts`)

- Requirement: FR-051
- Produces GitHub-Flavored Markdown
- Structure:

```markdown
# MCP Verify Report

| Field | Value |
|-------|-------|
| Target | http://localhost:3000 |
| Transport | HTTP+SSE |
| Timestamp | 2026-03-28T14:30:00Z |
| Tool Version | 1.0.0 |
| Spec Version | 2024-11-05 |
| Duration | 1.2s |

## Summary

| Metric | Value |
|--------|-------|
| Conformance Score | 87/100 |
| Critical Findings | 1 |
| High Findings | 1 |
| Verdict | **FAIL** |

## Conformance Score

| Category | Score |
|----------|-------|
| JSON-RPC Base | 95/100 |
| ... | ... |

## Conformance Violations

### Tools (80/100)

- **FAIL** Tool "run-shell": inputSchema missing "type" field
- **WARN** Tool "query-db": inputSchema property "query" has no type

## Security Findings

### SEC-001: command-injection [CRITICAL]

- **Severity:** Critical (CVSS 8.1)
- **Component:** Tool "run-shell", parameter "command"
- **Description:** Unconstrained string parameter with shell-executable name
- **Remediation:** Add a "pattern" or "enum" constraint
- **Confidence:** heuristic

---

*Generated by mcp-verify v1.0.0 | MCP spec 2024-11-05 | 2026-03-28T14:30:00Z*
```

**Dependencies:** `src/types/` (VerificationResult).

---

### 2.9 Plugin System (`src/plugins/`) -- Sprint 4

**Responsibility:** Load, validate, and execute custom rule plugins from user-specified module paths or npm packages.

**Public Interface:**

```typescript
// src/plugins/loader.ts
export async function loadPlugins(
  config: VerificationConfig
): Promise<Plugin[]>;

// src/plugins/runner.ts
export async function runPlugins(
  plugins: Plugin[],
  exchange: ProtocolExchangeRecord,
  config: VerificationConfig
): Promise<SecurityFinding[]>;

// src/plugins/types.ts (exported publicly for plugin authors)
export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  check: (context: PluginContext) => Promise<SecurityFinding[]>;
}

export interface PluginContext {
  target: string;
  transport: string;
  initializeResponse: unknown;
  toolsList: unknown[];
  resourcesList: unknown[];
  promptsList: unknown[];
  errorProbeResponses: unknown[];
  config: Record<string, unknown>;
}
```

**Plugin isolation (FR-080):**

Each plugin's `check()` function is wrapped in a try/catch with a 30-second `Promise.race` timeout:

```typescript
async function runPluginSafe(plugin: Plugin, context: PluginContext): Promise<SecurityFinding[]> {
  try {
    const result = await Promise.race([
      plugin.check(context),
      rejectAfter(30000, `Plugin ${plugin.id} timed out after 30s`),
    ]);
    return result.map(f => ({ ...f, source: 'plugin', pluginId: plugin.id }));
  } catch (err) {
    console.error(`Plugin ${plugin.id} failed: ${err.message}`);
    return [];
  }
}
```

**Plugin discovery (FR-076):**

1. Check for `mcp-verify.config.js`, `.mjs`, or `.cjs` in cwd
2. Load via dynamic `import()` (ESM) or `require()` (CJS)
3. Resolve relative paths against config file directory
4. Resolve bare specifiers from `node_modules`

**Dependencies:** `src/types/` (SecurityFinding), `src/protocol/types.ts` (ProtocolExchangeRecord).

---

### 2.10 History Store (`src/history/`) -- Sprint 4

**Responsibility:** Persist verification results to the local filesystem for historical tracking and regression detection.

**Public Interface:**

```typescript
// src/history/store.ts
export async function appendRun(
  target: string,
  result: VerificationResult
): Promise<void>;

export async function getHistory(
  target: string,
  limit?: number
): Promise<HistoryEntry[]>;

export async function getLastRun(
  target: string
): Promise<HistoryEntry | null>;

// src/history/baseline.ts
export async function saveBaseline(
  target: string,
  result: VerificationResult
): Promise<void>;

export async function getBaseline(
  target: string
): Promise<HistoryEntry | null>;
```

**Storage format:**

- Directory: `~/.mcp-verify/history/`
- File naming: `<url-safe-encoded-hostname>.jsonl` (newline-delimited JSON)
- Each line is a `HistoryEntry`:

```typescript
export interface HistoryEntry {
  timestamp: string;          // ISO 8601
  target: string;
  conformanceScore: number;
  securityFindingsCount: number;
  breakdown: Record<ConformanceCategory, number>;
  toolVersion: string;
  specVersion: string;
}
```

- Baseline files: `~/.mcp-verify/baselines/<url-safe-encoded-hostname>.json` (single JSON object)

**Error handling:** Filesystem errors (permission denied, disk full) are caught and logged as warnings. History storage failures never affect the exit code or report output.

**Dependencies:** `src/types/` (VerificationResult).

---

### 2.11 Dashboard Server (`src/dashboard/`) -- Sprint 4

**Responsibility:** Serve a local-only web UI for viewing historical verification data.

**Public Interface:**

```typescript
// src/dashboard/server.ts
export async function startDashboard(options: {
  port: number;
  historyDir: string;
}): Promise<void>;
```

**Implementation:**

- Uses Node.js built-in `http` module (no Express dependency)
- Serves pre-built static HTML/CSS/JS from `src/dashboard/static/` (bundled into the npm package)
- API routes:
  - `GET /api/servers` -- list all tracked servers with latest scores
  - `GET /api/history/:hostname` -- get history entries for a server
  - `GET /api/baselines/:hostname` -- get baseline for a server
- Frontend: vanilla JavaScript (no React, no framework) to keep bundle size minimal
- Charts: rendered using a lightweight embedded charting library or SVG generation
- Content Security Policy: `default-src 'self'` (FR-075)
- Binds to `127.0.0.1` only (never `0.0.0.0`) for security

**Dependencies:** `src/history/` (History Store).

---

## 3. Data Model

All types are defined in `src/types/` and imported by all other modules. This is the single source of truth for data shapes flowing through the pipeline.

### 3.1 Core Types

```typescript
// src/types/results.ts

/**
 * Top-level verification result. This is the complete output of one
 * verification run, containing everything needed by any reporter.
 */
export interface VerificationResult {
  meta: VerificationMeta;
  conformance: ConformanceResult;
  security: SecurityResult;
  summary: VerificationSummary;
  /** Present only when --compare-last is used (Sprint 4) */
  comparison?: ComparisonResult;
}

export interface VerificationMeta {
  toolVersion: string;
  specVersion: string;
  timestamp: string;           // ISO 8601
  target: string;
  transport: 'stdio' | 'http';
  duration: number;            // milliseconds
  checkMode: 'strict' | 'balanced' | 'lenient';
  thresholds: {
    failOnSeverity: Severity | 'none';
    conformanceThreshold: number;
  };
}
```

### 3.2 Conformance Types

```typescript
// src/types/conformance.ts

export interface ConformanceResult {
  score: number;               // 0-100 integer
  breakdown: Record<ConformanceCategory, number>;
  violations: CheckResult[];
}

export type ConformanceCategory =
  | 'jsonrpc-base'
  | 'initialization'
  | 'tools'
  | 'resources'
  | 'prompts'
  | 'transport';

export interface CheckResult {
  checkId: string;             // e.g., "jsonrpc-envelope-jsonrpc-field"
  category: ConformanceCategory;
  level: 'pass' | 'warning' | 'failure';
  message: string;             // Human-readable description
  details?: {
    /** The specific field or value that triggered the check */
    field?: string;
    /** The raw value observed */
    actual?: unknown;
    /** The expected value or pattern */
    expected?: string;
    /** The spec section reference */
    specRef?: string;
    /** Which tool/resource/prompt triggered this (if applicable) */
    component?: string;
  };
  confidence: 'deterministic' | 'heuristic';
}
```

### 3.3 Security Types

```typescript
// src/types/security.ts

export interface SecurityResult {
  findings: SecurityFinding[];
  suppressed: SuppressedFinding[];
}

export interface SecurityFinding {
  id: string;                  // e.g., "SEC-001" (auto-assigned sequential)
  checkId: string;             // e.g., "command-injection"
  severity: Severity;
  cvssScore: number;           // 0.0 - 10.0
  component: string;           // Tool name, endpoint URL, etc.
  description: string;
  remediation: string;
  confidence: 'deterministic' | 'heuristic';
  /** Present for plugin findings (Sprint 4) */
  source?: 'builtin' | 'plugin';
  /** Present for plugin findings (Sprint 4) */
  pluginId?: string;
}

export interface SuppressedFinding extends SecurityFinding {
  suppressed: true;
  justification: string;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low';
```

### 3.4 Server Info Types

```typescript
// src/types/server.ts

export interface MCPServerInfo {
  protocolVersion: string;
  serverInfo?: {
    name: string;
    version?: string;
  };
  capabilities: {
    tools?: Record<string, unknown> | boolean;
    resources?: Record<string, unknown> | boolean;
    prompts?: Record<string, unknown> | boolean;
    sampling?: Record<string, unknown> | boolean;
    [key: string]: unknown;
  };
}
```

### 3.5 Configuration Types

```typescript
// src/types/config.ts

export interface VerificationConfig {
  /** Minimum severity that causes exit code 1. Default: "critical" */
  failOnSeverity: Severity | 'none';
  /** Minimum conformance score. Below this causes exit code 1. Default: 0 */
  conformanceThreshold: number;
  /** Check IDs to suppress */
  skip: SkipEntry[];
  /** Force a specific transport type */
  transport?: 'http' | 'stdio';
  /** Timeout per server operation in ms. Default: 10000 */
  timeout: number;
  /** Check sensitivity mode. Default: "balanced" */
  checkMode: 'strict' | 'balanced' | 'lenient';
  /** Output format. Default: "terminal" */
  format: 'terminal' | 'json' | 'markdown';
  /** Output file path (null = stdout) */
  output?: string;
  /** Show verbose diagnostic output */
  verbose: boolean;
  /** Disable history storage (Sprint 4) */
  noHistory: boolean;
  /** Compare with last run (Sprint 4) */
  compareLast: boolean;
}

export type SkipEntry = string | { checkId: string; justification: string };
```

### 3.6 Summary Types

```typescript
// src/types/results.ts (continued)

export interface VerificationSummary {
  pass: boolean;
  exitCode: 0 | 1 | 2;
  blockerCount: Record<Severity, number>;
}

export interface ComparisonResult {
  previousScore: number;
  currentScore: number;
  delta: number;
  newFindings: SecurityFinding[];
  resolvedFindings: SecurityFinding[];
  regressionDetected: boolean;
}
```

### 3.7 JSON-RPC Types

```typescript
// src/types/jsonrpc.ts

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, unknown> | unknown[];
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown> | unknown[];
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}
```

---

## 4. Module Dependency Graph

Dependencies flow strictly downward and inward. No circular imports are permitted. The `src/types/` module is the shared leaf dependency imported by all other modules.

```
                          src/types/
                             ^
                             |
            +----------------+-------------------+
            |                |                   |
            |                |                   |
       src/config/     src/transport/      src/scoring/
            ^               ^                   ^
            |               |                   |
            |          src/protocol/             |
            |               ^                   |
            |               |                   |
            |    +----------+----------+        |
            |    |                     |        |
            | src/validators/    src/validators/ |
            | conformance/       security/      |
            |    ^                     ^        |
            |    |                     |        |
            |    +----------+----------+        |
            |               |                   |
            |          src/plugins/             |
            |          (Sprint 4)               |
            |               ^                   |
            |               |                   |
            +--------+------+---+---------------+
                     |          |
                src/reporters/  |
                     ^          |
                     |          |
                src/history/    |
                (Sprint 4)      |
                     ^          |
                     |          |
                src/dashboard/  |
                (Sprint 4)      |
                     ^          |
                     |          |
                  src/cli.ts ---+
```

### Dependency Rules (enforced by dependency-cruiser in CI per NFR-022)

1. **`src/types/`** depends on nothing. It is pure type definitions.
2. **`src/config/`** depends on `src/types/` only.
3. **`src/transport/`** depends on `src/types/` only.
4. **`src/protocol/`** depends on `src/transport/` and `src/types/`.
5. **`src/validators/conformance/`** depends on `src/types/` only. It receives `ProtocolExchangeRecord` as input but imports only the type, not the protocol module.
6. **`src/validators/security/`** depends on `src/types/` only. Same pattern as conformance.
7. **`src/scoring/`** depends on `src/types/` only.
8. **`src/reporters/`** depends on `src/types/` only.
9. **`src/plugins/`** (Sprint 4) depends on `src/types/` only.
10. **`src/history/`** (Sprint 4) depends on `src/types/` only.
11. **`src/dashboard/`** (Sprint 4) depends on `src/history/` and `src/types/`.
12. **`src/cli.ts`** is the only module that imports from multiple sibling modules. It is the composition root.

### Circular Dependency Prevention

The architecture uses a "shared types, private implementation" pattern. All inter-module communication happens through data structures defined in `src/types/`. Modules never call functions in peer modules directly -- only `src/cli.ts` orchestrates the pipeline by calling modules in sequence and passing data between them.

This means:
- Validators never call the protocol engine
- Reporters never call the scoring engine
- The scoring engine never calls validators
- Each module can be tested in complete isolation by constructing its input data directly

---

## 5. Directory Structure

```
mcp-verify/
|
|-- src/
|   |-- cli.ts                          # Entry point, Commander.js setup, pipeline orchestration
|   |
|   |-- types/
|   |   |-- index.ts                    # Re-exports all types
|   |   |-- config.ts                   # VerificationConfig, SkipEntry
|   |   |-- conformance.ts             # ConformanceResult, CheckResult, ConformanceCategory
|   |   |-- security.ts                # SecurityResult, SecurityFinding, Severity
|   |   |-- results.ts                 # VerificationResult, VerificationMeta, VerificationSummary
|   |   |-- server.ts                  # MCPServerInfo
|   |   |-- jsonrpc.ts                 # JsonRpcRequest, JsonRpcResponse, JsonRpcError
|   |   |-- transport.ts               # TransportMetadata, SseObservation, MessageTiming
|   |   |-- protocol.ts                # ProtocolExchangeRecord, ProtocolStep, StepResult
|   |   |-- plugin.ts                  # Plugin, PluginContext (Sprint 4)
|   |   |-- history.ts                 # HistoryEntry, ComparisonResult (Sprint 4)
|   |
|   |-- config/
|   |   |-- index.ts                    # Re-exports public API
|   |   |-- loader.ts                   # Config file discovery and loading
|   |   |-- merge.ts                    # CLI flag + config file merge logic
|   |   |-- validate.ts                 # Config schema validation
|   |   |-- defaults.ts                 # Default config values
|   |
|   |-- transport/
|   |   |-- index.ts                    # Re-exports Transport interface and factory
|   |   |-- types.ts                    # Transport interface definition
|   |   |-- factory.ts                  # createTransport() -- URL scheme routing
|   |   |-- stdio.ts                    # StdioTransport implementation
|   |   |-- http.ts                     # HttpTransport implementation
|   |   |-- sse-parser.ts              # SSE stream parser (used by HttpTransport)
|   |   |-- address-classifier.ts      # IP address loopback/private/public classification
|   |
|   |-- protocol/
|   |   |-- index.ts                    # Re-exports executeProtocol
|   |   |-- engine.ts                   # Protocol sequence orchestrator
|   |   |-- messages.ts                 # JSON-RPC message construction helpers
|   |   |-- capabilities.ts            # Capability extraction and normalization
|   |
|   |-- validators/
|   |   |-- conformance/
|   |   |   |-- index.ts                # Re-exports runConformanceChecks
|   |   |   |-- runner.ts               # Iterates validator registry
|   |   |   |-- registry.ts            # Array of all conformance validators
|   |   |   |-- json-rpc-envelope.ts   # FR-021: JSON-RPC envelope validation
|   |   |   |-- json-rpc-errors.ts     # FR-022: Error code range validation
|   |   |   |-- initialization.ts      # FR-023, FR-024: Init response + capabilities
|   |   |   |-- tool-schema.ts         # FR-025, FR-026: Tool structure + JSON Schema
|   |   |   |-- resource-protocol.ts   # FR-027: Resource list + read validation
|   |   |   |-- prompt-protocol.ts     # FR-028: Prompt list validation
|   |   |   |-- stdio-transport.ts     # FR-029: stdio line-delimited correctness
|   |   |   |-- http-sse-transport.ts  # FR-030: HTTP+SSE format validation
|   |   |   |-- error-handling.ts      # FR-031: Error probe response validation
|   |   |
|   |   |-- security/
|   |       |-- index.ts                # Re-exports runSecurityChecks
|   |       |-- runner.ts               # Iterates analyzer registry
|   |       |-- registry.ts            # Array of all security analyzers
|   |       |-- injection.ts           # FR-036: Command injection susceptibility
|   |       |-- cors.ts                # FR-037: CORS wildcard detection
|   |       |-- auth.ts                # FR-038: Authentication gap detection
|   |       |-- poisoning.ts           # FR-039: Tool poisoning pattern detection
|   |       |-- leakage.ts             # FR-040: Information leakage detection
|   |
|   |-- scoring/
|   |   |-- index.ts                    # Re-exports computeScores
|   |   |-- engine.ts                   # Scoring algorithm implementation
|   |   |-- weights.ts                 # Category weight constants
|   |   |-- thresholds.ts             # Exit code determination logic
|   |
|   |-- reporters/
|   |   |-- index.ts                    # Re-exports createReporter
|   |   |-- types.ts                    # Reporter interface
|   |   |-- factory.ts                 # Reporter factory
|   |   |-- terminal.ts               # FR-046, FR-047, FR-048: Color-coded terminal
|   |   |-- json.ts                    # FR-049, FR-050: JSON format
|   |   |-- markdown.ts               # FR-051: Markdown format
|   |   |-- color.ts                   # ANSI color helpers with NO_COLOR support
|   |
|   |-- plugins/                        # Sprint 4
|   |   |-- index.ts
|   |   |-- loader.ts                   # FR-076: Plugin discovery and loading
|   |   |-- runner.ts                   # FR-077, FR-080: Isolated plugin execution
|   |   |-- types.ts                    # FR-077: Plugin API contract (public export)
|   |
|   |-- history/                        # Sprint 4
|   |   |-- index.ts
|   |   |-- store.ts                    # FR-067: JSONL file storage
|   |   |-- baseline.ts               # FR-073: Baseline management
|   |   |-- compare.ts                # FR-072: Regression detection
|   |   |-- export.ts                  # FR-074: History export
|   |
|   |-- dashboard/                      # Sprint 4
|       |-- index.ts
|       |-- server.ts                   # FR-066: HTTP server
|       |-- routes.ts                  # API route handlers
|       |-- static/                    # Bundled HTML/CSS/JS assets
|           |-- index.html
|           |-- app.js
|           |-- style.css
|
|-- test/
|   |-- unit/
|   |   |-- config/
|   |   |   |-- loader.test.ts
|   |   |   |-- merge.test.ts
|   |   |   |-- validate.test.ts
|   |   |-- transport/
|   |   |   |-- stdio.test.ts
|   |   |   |-- http.test.ts
|   |   |   |-- sse-parser.test.ts
|   |   |   |-- address-classifier.test.ts
|   |   |-- protocol/
|   |   |   |-- engine.test.ts
|   |   |   |-- messages.test.ts
|   |   |-- validators/
|   |   |   |-- conformance/
|   |   |   |   |-- json-rpc-envelope.test.ts
|   |   |   |   |-- json-rpc-errors.test.ts
|   |   |   |   |-- initialization.test.ts
|   |   |   |   |-- tool-schema.test.ts
|   |   |   |   |-- resource-protocol.test.ts
|   |   |   |   |-- prompt-protocol.test.ts
|   |   |   |   |-- stdio-transport.test.ts
|   |   |   |   |-- http-sse-transport.test.ts
|   |   |   |   |-- error-handling.test.ts
|   |   |   |-- security/
|   |   |       |-- injection.test.ts
|   |   |       |-- cors.test.ts
|   |   |       |-- auth.test.ts
|   |   |       |-- poisoning.test.ts
|   |   |       |-- leakage.test.ts
|   |   |-- scoring/
|   |   |   |-- engine.test.ts
|   |   |   |-- thresholds.test.ts
|   |   |-- reporters/
|   |       |-- terminal.test.ts
|   |       |-- json.test.ts
|   |       |-- markdown.test.ts
|   |
|   |-- integration/
|   |   |-- cli-stdio.test.ts          # Full CLI run against stdio fixture
|   |   |-- cli-http.test.ts           # Full CLI run against HTTP fixture
|   |   |-- cli-exit-codes.test.ts     # Exit code verification
|   |   |-- cli-formats.test.ts        # JSON and Markdown output validation
|   |   |-- cli-config.test.ts         # Config file loading and merge
|   |
|   |-- fixtures/
|       |-- servers/
|       |   |-- clean/
|       |   |   |-- reference-server.ts      # Known-good MCP server (all checks pass)
|       |   |   |-- minimal-server.ts        # Minimal valid MCP server (init only)
|       |   |   |-- tools-only-server.ts     # Server with only tools capability
|       |   |-- vulnerable/
|       |       |-- command-injection-server.ts
|       |       |-- cors-wildcard-server.ts
|       |       |-- missing-auth-server.ts
|       |       |-- tool-poisoning-server.ts
|       |       |-- info-leakage-server.ts
|       |       |-- bad-jsonrpc-server.ts     # Malformed JSON-RPC responses
|       |       |-- bad-init-server.ts        # Missing fields in init response
|       |       |-- bad-tool-schema-server.ts # Invalid tool inputSchema
|       |-- configs/
|       |   |-- valid-config.json
|       |   |-- invalid-config.json
|       |   |-- strict-config.json
|       |   |-- lenient-config.json
|       |-- data/
|           |-- protocol-exchanges/     # Serialized ProtocolExchangeRecord fixtures
|           |-- expected-reports/       # Expected output for snapshot testing
|
|-- action/                             # GitHub Action files
|   |-- action.yml                     # GitHub Action definition (FR-056)
|   |-- entrypoint.ts                  # Action entrypoint (calls CLI programmatically)
|   |-- comment.ts                     # PR comment posting logic (FR-058)
|
|-- docs/                               # Sprint 4
|   |-- report-schema.json             # JSON Schema for report format (FR-050)
|   |-- examples/
|       |-- report-example.json        # Example JSON report
|       |-- github-actions.yml         # Example GitHub Actions workflow (FR-062)
|       |-- gitlab-ci.yml             # Example GitLab CI job
|       |-- circleci.yml              # Example CircleCI job
|
|-- examples/                           # Sprint 4
|   |-- plugins/
|       |-- custom-auth-check/         # Reference plugin (FR-079)
|       |-- rate-limit-check/          # Reference plugin (FR-079)
|
|-- package.json
|-- tsconfig.json
|-- tsup.config.ts
|-- vitest.config.ts
|-- .mcp-verify.json.schema            # JSON Schema for config file
|-- .dependency-cruiser.cjs            # Dependency rule enforcement (NFR-022)
```

---

## 6. Build and Package Strategy

### 6.1 Build Toolchain

**tsup** (built on esbuild) bundles the TypeScript source into a single JavaScript file with all dependencies inlined.

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['cjs'],                // CommonJS for broadest Node.js compat
  target: 'node18',
  outDir: 'dist',
  clean: true,
  minify: true,
  splitting: false,
  sourcemap: false,               // No sourcemaps in published package
  dts: {
    entry: 'src/plugins/types.ts', // Only export plugin API types
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
  noExternal: [/.*/],             // Bundle everything
});
```

**Why single-file CJS bundle:**
- `npx` downloads and runs immediately; a single file means no module resolution overhead.
- CJS format works on all Node.js 18/20/22 without `--experimental-*` flags.
- No `node_modules` at runtime eliminates dependency confusion and version conflicts.

### 6.2 Package Configuration

```json
{
  "name": "mcp-verify",
  "version": "0.1.0-alpha",
  "bin": {
    "mcp-verify": "./dist/cli.js"
  },
  "files": [
    "dist/",
    "action/"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": [
    "mcp",
    "model-context-protocol",
    "verify",
    "security",
    "conformance",
    "json-rpc",
    "cli"
  ],
  "type": "commonjs"
}
```

### 6.3 Size Budget

| Component | Budget |
|-----------|--------|
| `dist/cli.js` (minified, bundled) | < 3 MB |
| `dist/cli.d.ts` (plugin types) | < 10 KB |
| `action/` directory | < 500 KB |
| `package.json` + metadata | < 10 KB |
| Dashboard static assets (Sprint 4) | < 1 MB |
| **Total unpacked** | **< 5 MB** |

Enforced by `size-limit` in CI:

```json
{
  "size-limit": [
    { "path": "dist/cli.js", "limit": "3 MB" },
    { "path": ".", "limit": "5 MB" }
  ]
}
```

### 6.4 Bundled Dependencies

The following are the key third-party packages bundled at build time:

| Package | Purpose | Approx. Size |
|---------|---------|-------------|
| commander | CLI argument parsing | ~50 KB |

All other functionality is implemented with Node.js built-in modules:
- `http`/`https` for HTTP transport
- `child_process` for stdio transport
- `fs`/`path` for file operations
- `net` for address classification
- `url` for URL parsing
- `crypto` for any hashing needs

No large dependencies (ajv, chalk, axios, express) are used. Color output, SSE parsing, JSON Schema structural validation, and the dashboard HTTP server are all implemented in-house to maintain the size budget.

### 6.5 GitHub Action Packaging

The GitHub Action (`action/action.yml`) uses `runs.using: node20` and points to `action/entrypoint.js` (compiled from `action/entrypoint.ts`). The entrypoint imports the bundled CLI programmatically:

```typescript
// action/entrypoint.ts
import { execFile } from 'child_process';
import * as core from '@actions/core';

const target = core.getInput('target', { required: true });
// ... resolve inputs to CLI flags
// Execute dist/cli.js as a subprocess
```

The `@actions/core` and `@actions/github` packages are bundled into the action entrypoint using a separate tsup config. The action directory is self-contained.

---

## 7. Testing Strategy

### 7.1 Test Framework

**Vitest** with Istanbul coverage provider. Configuration:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/dashboard/static/**'],
      thresholds: {
        lines: 85,
        branches: 80,
        functions: 85,
        statements: 85,
      },
    },
    testTimeout: 15000,
  },
});
```

### 7.2 Test Layers

#### Unit Tests (`test/unit/`)

Each source module has a corresponding test file. Unit tests:
- Import the module function directly
- Construct input data (ProtocolExchangeRecord, VerificationConfig) as plain objects
- Assert output structure and values
- Never make network calls or spawn processes
- Use no mocking framework -- the architecture makes mocking unnecessary because all inter-module communication is through data

**Example -- testing a conformance validator:**

```typescript
// test/unit/validators/conformance/json-rpc-envelope.test.ts
import { validateJsonRpcEnvelope } from '../../../../src/validators/conformance/json-rpc-envelope';
import { makeExchange } from '../../../fixtures/data/protocol-exchanges/helpers';

test('flags response missing jsonrpc field', () => {
  const exchange = makeExchange({
    initializeResponse: { id: 1, result: { protocolVersion: '2024-11-05' } },
    // Note: no jsonrpc: "2.0" field
  });

  const results = validateJsonRpcEnvelope(exchange, defaultConfig);
  expect(results).toContainEqual(
    expect.objectContaining({
      level: 'failure',
      category: 'jsonrpc-base',
    })
  );
});
```

**Example -- testing a security analyzer:**

```typescript
// test/unit/validators/security/injection.test.ts
import { analyzeCommandInjection } from '../../../../src/validators/security/injection';

test('detects unconstrained "command" parameter', () => {
  const exchange = makeExchange({
    tools: [{
      name: 'run-shell',
      description: 'Runs a shell command',
      inputSchema: {
        type: 'object',
        properties: {
          command: { type: 'string' },
        },
      },
    }],
  });

  const findings = analyzeCommandInjection(exchange, defaultConfig);
  expect(findings).toHaveLength(1);
  expect(findings[0].checkId).toBe('command-injection');
  expect(findings[0].severity).toBe('high');
});

test('does NOT flag parameter with pattern constraint', () => {
  const exchange = makeExchange({
    tools: [{
      name: 'run-shell',
      description: 'Runs a shell command',
      inputSchema: {
        type: 'object',
        properties: {
          command: { type: 'string', pattern: '^[a-zA-Z0-9_-]+$' },
        },
      },
    }],
  });

  const findings = analyzeCommandInjection(exchange, defaultConfig);
  expect(findings).toHaveLength(0);
});
```

#### Integration Tests (`test/integration/`)

Integration tests exercise the full CLI pipeline from argument parsing to exit code, using real (fixture) MCP servers.

**Test fixture servers:**

Each fixture is a minimal MCP server implemented as a standalone Node.js script. Fixtures are both stdio and HTTP variants:
- `clean/reference-server.ts`: Implements all MCP capabilities correctly. Passes all checks. Used as the baseline for "everything works" assertions.
- `vulnerable/*-server.ts`: Each implements one specific vulnerability. Used to verify detection with zero false negatives.
- `clean/*-server.ts`: Each is a variant that is similar to a vulnerable fixture but does not trigger the check. Used to verify zero false positives for that specific check.

**Integration test pattern:**

```typescript
// test/integration/cli-http.test.ts
import { execFile } from 'child_process';
import { startFixtureServer, stopFixtureServer } from '../fixtures/servers/helpers';

let serverUrl: string;

beforeAll(async () => {
  serverUrl = await startFixtureServer('clean/reference-server.ts');
});

afterAll(async () => {
  await stopFixtureServer();
});

test('clean server passes all checks with exit code 0', async () => {
  const { exitCode, stdout } = await runCli([serverUrl]);
  expect(exitCode).toBe(0);
  expect(stdout).toContain('PASS');
});

test('clean server scores 100', async () => {
  const { stdout } = await runCli(['--format', 'json', serverUrl]);
  const report = JSON.parse(stdout);
  expect(report.conformance.score).toBe(100);
  expect(report.security.findings).toHaveLength(0);
});
```

#### Snapshot Tests

Reporter output is validated using Vitest snapshot testing. A change in output format requires explicit snapshot update, preventing accidental regressions in the human-readable interface.

### 7.3 Coverage Targets (NFR-021)

| Metric | Target | Enforcement |
|--------|--------|-------------|
| Line coverage | >= 85% | CI build fails below threshold |
| Branch coverage | >= 80% | CI build fails below threshold |
| Function coverage | >= 85% | CI build fails below threshold |
| Statement coverage | >= 85% | CI build fails below threshold |

### 7.4 CI Matrix

Tests run on every push and PR against:

| Axis | Values |
|------|--------|
| Node.js version | 18.x, 20.x, 22.x |
| OS | ubuntu-latest, macos-latest, windows-latest |

This produces a 9-cell matrix. All 9 must pass for the build to be green.

---

## 8. Error Handling Strategy

### 8.1 Error Categories

The tool distinguishes three error categories that map directly to exit codes:

| Category | Exit Code | Cause | User Experience |
|----------|-----------|-------|-----------------|
| Success | 0 | All checks pass, thresholds met | Green "PASS" output |
| Check Failure | 1 | Conformance score below threshold or security finding above severity threshold | Red "FAIL" output with details |
| Tool Error | 2 | Transport failure, config error, internal bug | Error message to stderr |

### 8.2 Transport Errors

Transport errors are situations where the tool cannot communicate with the target server.

| Error | Detection | Behavior |
|-------|-----------|----------|
| Connection refused | TCP RST / ECONNREFUSED | Exit 2: "Connection refused. Is the server running at <target>?" |
| DNS resolution failure | ENOTFOUND | Exit 2: "Cannot resolve hostname <host>. Check the URL." |
| Connection timeout | No TCP handshake within timeout | Exit 2: "Connection timed out after <N>ms. Check the URL or increase --timeout." |
| Response timeout | TCP connected but no response | Record as step timeout in ProtocolExchangeRecord. Continue to next step. |
| TLS error | UNABLE_TO_VERIFY_LEAF_SIGNATURE etc. | Exit 2: "TLS certificate verification failed for <host>. The tool requires valid TLS." |
| stdio spawn failure | ENOENT / EACCES | Exit 2: "Cannot spawn process: <path>. File not found / permission denied." |
| stdio process crash | Non-zero exit before protocol complete | Record as protocol error. Score based on what completed. |

### 8.3 Protocol Errors

Protocol errors are situations where the server responds but the response does not conform to expected patterns.

| Error | Behavior |
|-------|----------|
| Non-JSON response to JSON-RPC request | Captured as conformance violation. Not a crash. |
| Unexpected response structure | Captured as conformance violation. Validator continues. |
| Server returns error to initialize | ProtocolExchangeRecord marks initialization as failed. Overall score is 0. |
| Server does not respond to initialize | ProtocolExchangeRecord marks initialization as timeout. Overall score is 0. |
| Server responds to tools/list with error (when tools capability declared) | Captured as conformance violation (FR-024). |

**Key design decision:** Protocol errors are never tool crashes. They are conformance findings. The tool's job is to report what it observes, not to crash when a server misbehaves.

### 8.4 Internal Errors

Internal errors are bugs in mcp-verify itself.

| Error | Behavior |
|-------|----------|
| Unhandled exception in validator | Caught by runner. Validator's results are empty. Warning logged. Other validators continue. |
| Unhandled exception in reporter | Caught by cli.ts. Fallback to minimal JSON output to stdout, error to stderr. Exit 2. |
| Unhandled exception anywhere | Caught by top-level try/catch in cli.ts. Exit 2. Stack trace shown only with --verbose. |

### 8.5 Error Message Format (NFR-019)

Every exit-code-2 error message follows a three-part structure:

```
Error: <what happened>
Cause: <why it likely happened>
Fix:   <what to do about it>
```

Example:

```
Error: Connection refused to http://localhost:3000
Cause: The server may not be running, or it may be listening on a different port.
Fix:   Start the server and verify it is listening on port 3000, then retry.
```

---

## 9. Performance Budget

### 9.1 Execution Time Targets

| Scenario | Target | Measurement |
|----------|--------|-------------|
| `npx mcp-verify --version` (cold, no cache) | < 5 seconds | npm download + Node.js startup + version print |
| `npx mcp-verify --version` (warm, cached) | < 500 ms | Node.js startup + version print |
| Full verification, local stdio server | < 3 seconds | Spawn + handshake + full probe + scoring + report |
| Full verification, local HTTP server | < 3 seconds | Connect + handshake + full probe + scoring + report |
| Full verification, LAN HTTP server | < 5 seconds | Same as local + network latency |
| Full verification, remote HTTP server | < 10 seconds | Same as LAN + internet latency |
| Full verification, p95 across all scenarios | < 10 seconds | NFR-001 |

### 9.2 Time Budget Breakdown (Local Server)

The 3-second budget for a local server verification is allocated as follows:

| Phase | Budget | Notes |
|-------|--------|-------|
| CLI startup + arg parsing | < 50 ms | Commander.js is lightweight |
| Config loading | < 20 ms | Single JSON file read |
| Transport connection | < 100 ms | TCP connect or process spawn |
| Initialize handshake | < 200 ms | Request + response + notification |
| tools/list | < 200 ms | Assuming < 50 tools, no pagination |
| resources/list + read | < 200 ms | Assuming < 10 resources |
| prompts/list | < 100 ms | Assuming < 10 prompts |
| Error probes (2 probes) | < 400 ms | Unknown method + malformed JSON |
| Transport close | < 100 ms | HTTP close or SIGTERM + wait |
| Conformance validation | < 50 ms | In-memory data analysis, no I/O |
| Security analysis | < 50 ms | In-memory pattern matching, no I/O |
| Scoring | < 10 ms | Arithmetic |
| Report generation | < 20 ms | String formatting |
| **Total** | **< 1,500 ms** | Leaves 1,500 ms headroom for slow servers |

### 9.3 Memory Budget (NFR-004)

| Scenario | Budget | Notes |
|----------|--------|-------|
| Typical server (10 tools, 5 resources) | < 64 MB | Most data is small JSON objects |
| Large server (100 tools, complex schemas) | < 128 MB | Tool schemas are the primary memory driver |
| Dashboard with 1000 history entries | < 128 MB | JSONL is streamed, not fully loaded |

### 9.4 Size Budget (NFR-003)

| Artifact | Budget |
|----------|--------|
| `dist/cli.js` | < 3 MB |
| Total npm package (unpacked) | < 5 MB |
| Dashboard static assets (Sprint 4) | < 1 MB |

### 9.5 Performance Optimization Strategies

1. **Lazy loading:** Dashboard and history modules are dynamically imported only when their subcommands are invoked. The `verify` command path never loads dashboard code.

2. **Streaming SSE parsing:** The HTTP transport parses SSE events as they arrive, not after buffering the entire response. This prevents memory spikes with chatty servers.

3. **No JSON Schema evaluation engine:** Tool inputSchema validation checks structural correctness (is it a valid JSON Schema object?) without running full JSON Schema evaluation (which would require ajv at ~150KB minified). This is a deliberate trade-off: we validate that the schema is well-formed, not that it correctly constrains inputs.

4. **Single-pass validators:** Each conformance validator iterates the protocol exchange record once. No validator re-reads transport data or re-parses JSON.

5. **Minimal string allocation in reporters:** The terminal reporter builds output with a single array of line strings joined at the end, avoiding repeated string concatenation.

---

*Document produced by System Architect (Tier 3 Engineer) for MCP Verify PDLC Project.*
*Next phase: Sprint 1 implementation. Reference this document for all component interfaces, data models, and architectural constraints.*
