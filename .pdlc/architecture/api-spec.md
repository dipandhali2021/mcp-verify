# MCP Verify — API Specification

**Document Version:** 1.0
**Author:** API Designer (Tier 3 Engineer)
**Date:** 2026-03-28
**Status:** Approved — Design Phase
**Sprint Coverage:** Sprint 1 (P0), Sprint 3 (P1), Sprint 4 (P2)
**References:**
- `.pdlc/architecture/system-design.md` — Component architecture, data model, directory structure
- `.pdlc/architecture/requirements.md` — FR-001 through FR-080
- `.pdlc/architecture/product-vision.md` — Features P0/P1/P2, sprint roadmap

---

## Table of Contents

1. [CLI Command Interface](#1-cli-command-interface)
   - 1.1 Command Tree
   - 1.2 Global Options
   - 1.3 `verify` Command
   - 1.4 `serve` Command (Sprint 4)
   - 1.5 `baseline` Command (Sprint 4)
   - 1.6 `history` Command (Sprint 4)
2. [Internal Module Interfaces](#2-internal-module-interfaces)
   - 2.1 Transport Interface
   - 2.2 Conformance Validator Interface
   - 2.3 Security Analyzer Interface
   - 2.4 Reporter Interface
   - 2.5 Scoring Interface
   - 2.6 Plugin Interface (Sprint 4)
   - 2.7 History Store Interface (Sprint 4)
   - 2.8 Config Loader Interface
3. [JSON Output Schema](#3-json-output-schema)
   - 3.1 Top-Level Structure
   - 3.2 `meta` Object
   - 3.3 `conformance` Object
   - 3.4 `security` Object
   - 3.5 `summary` Object
   - 3.6 `comparison` Object (Sprint 4)
   - 3.7 Violation Object
   - 3.8 Finding Object
   - 3.9 Suppressed Finding Object
   - 3.10 Schema Versioning Policy
4. [Configuration File Schema](#4-configuration-file-schema)
   - 4.1 JSON Config File (`.mcp-verify.json`)
   - 4.2 JavaScript Config File (`mcp-verify.config.js`)
   - 4.3 Config Discovery Order
   - 4.4 Merge Precedence
5. [Exit Code Specification](#5-exit-code-specification)
6. [Error Message Specification](#6-error-message-specification)
   - 6.1 Error Message Format
   - 6.2 Error Catalog

---

## 1. CLI Command Interface

### 1.1 Command Tree

```
mcp-verify [global-options] <command> [command-options] [arguments]

Commands:
  verify <target>           Verify an MCP server (default when no command given)
  serve                     Start local dashboard server (Sprint 4 / P2)
  baseline <target>         Pin current run as known-good baseline (Sprint 4 / P2)
  history export <target>   Export run history as JSON (Sprint 4 / P2)

Default behavior:
  mcp-verify <target>       Equivalent to: mcp-verify verify <target>
```

Invoking `mcp-verify <target>` without a subcommand is identical to `mcp-verify verify <target>`. The bare form is the primary invocation pattern.

### 1.2 Global Options

Global options are accepted by all commands. They are defined on the root Commander.js program so that they appear in `--help` output for every command.

---

#### `--format <type>`

| Property | Value |
|---|---|
| Type | `string` enum |
| Allowed values | `terminal`, `json`, `markdown`, `sarif` |
| Default | `terminal` |
| Config file field | `format` |
| Sprint | 1 (`terminal`); 3 (`json`, `markdown`); 4 (`sarif`) |
| Requirement | FR-002 |

Controls the output format written to stdout.

- `terminal`: Human-readable output with ANSI color codes. Colors are automatically disabled when stdout is not a TTY, when `NO_COLOR` is set, or when `--no-color` is passed.
- `json`: Single valid JSON document. No decorative text on stdout. All diagnostic and error output goes to stderr.
- `markdown`: GitHub-Flavored Markdown document. Suitable for redirect to a file or piping to a PR comment system.
- `sarif`: SARIF 2.1.0 file for GitHub Code Scanning upload (Sprint 4).

Validation: Unrecognized value prints `Error: --format must be one of: terminal, json, markdown, sarif` to stderr and exits with code 2.

Examples:
```sh
mcp-verify http://localhost:3000
mcp-verify --format json http://localhost:3000 > report.json
mcp-verify --format markdown http://localhost:3000 > report.md
```

---

#### `--config <path>`

| Property | Value |
|---|---|
| Type | `string` (file path) |
| Default | Auto-discover `mcp-verify.json` then `.mcp-verify.json` in cwd |
| Sprint | 3 |
| Requirement | FR-003 |

Path to the JSON configuration file. Relative paths are resolved from the current working directory.

Validation:
- If `--config` is provided and the file does not exist: exits with code 2.
- If the file exists but contains invalid JSON: exits with code 2 with a parse error message.
- If not provided: auto-discovery is attempted silently; no error if no config file is found.

Examples:
```sh
mcp-verify --config ./configs/staging.json http://staging.example.com/mcp
mcp-verify --config /etc/ci/mcp-verify.json http://localhost:3000
```

---

#### `--fail-on <level>`

| Property | Value |
|---|---|
| Type | `string` enum |
| Allowed values | `critical`, `high`, `medium`, `low`, `none` |
| Default | `critical` |
| Config file field | `failOnSeverity` |
| Sprint | 3 |
| Requirement | FR-007, FR-043 |

Minimum security finding severity that causes exit code 1. Severity levels are ordered: `critical` > `high` > `medium` > `low` > `none`.

Setting `--fail-on critical` means only `critical` findings trigger exit code 1. Setting `--fail-on low` means any finding of `low` severity or above triggers exit code 1. Setting `--fail-on none` means exit code 1 is never triggered by security findings alone (conformance threshold may still apply).

This flag maps to the `failOnSeverity` field in the config file.

Validation: Unrecognized value prints `Error: --fail-on must be one of: critical, high, medium, low, none` to stderr and exits with code 2.

Examples:
```sh
mcp-verify --fail-on high http://localhost:3000
mcp-verify --fail-on none http://internal-server/mcp   # report only, never fail
```

---

#### `--threshold <n>`

| Property | Value |
|---|---|
| Type | `integer` |
| Range | 0–100 (inclusive) |
| Default | `0` |
| Config file field | `conformanceThreshold` |
| Sprint | 3 |
| Requirement | FR-053 |

Minimum conformance score required for exit code 0. When the computed conformance score falls below this value, the tool exits with code 1.

Setting `--threshold 0` (default) means the score alone never causes exit code 1. Setting `--threshold 80` means scores below 80 cause exit code 1.

Validation:
- Non-integer input: exits with code 2 with message `Error: --threshold must be an integer between 0 and 100`.
- Value outside 0–100: exits with code 2 with the same message.

Examples:
```sh
mcp-verify --threshold 80 http://localhost:3000
mcp-verify --threshold 95 --fail-on high http://prod-server/mcp
```

---

#### `--skip <checks>`

| Property | Value |
|---|---|
| Type | `string` (comma-separated list of check IDs) |
| Default | `[]` (no checks skipped) |
| Config file field | `skip` |
| Sprint | 3 |
| Requirement | FR-042 |

Comma-separated list of check IDs to suppress. Suppressed findings still appear in all output formats, marked as `[SUPPRESSED]`, but do not contribute to exit code determination.

The complete set of built-in check IDs is documented in Section 1.3. Unknown check IDs produce a warning to stderr but do not block execution.

CLI skip entries do not carry a justification field. For documented suppression with justification, use the config file `skip` array with the object form.

Examples:
```sh
mcp-verify --skip cors-wildcard http://localhost:3000
mcp-verify --skip command-injection,cors-wildcard http://localhost:3000
```

---

#### `--timeout <ms>`

| Property | Value |
|---|---|
| Type | `integer` |
| Range | 1–300000 |
| Default | `10000` (10 seconds) |
| Config file field | `timeout` |
| Sprint | 1 |
| Requirement | FR-010 |

Maximum milliseconds to wait for any single server response. Applies per-operation: each JSON-RPC exchange has its own independent timeout timer.

When a timeout fires: the operation is terminated, the check result records `status: "timeout"`, and partial results are scored based on what completed. If the initialization handshake times out, execution stops and exits with code 2.

Validation:
- Non-integer: exits with code 2 with message `Error: --timeout must be a positive integer (milliseconds)`.
- Value less than 1: exits with code 2 with same message.
- Value greater than 300000: exits with code 2 with message `Error: --timeout maximum is 300000ms (5 minutes)`.

Examples:
```sh
mcp-verify --timeout 5000 http://localhost:3000
mcp-verify --timeout 30000 https://remote-server.example.com/mcp
```

---

#### `--transport <type>`

| Property | Value |
|---|---|
| Type | `string` enum |
| Allowed values | `auto`, `stdio`, `http` |
| Default | `auto` |
| Config file field | `transport` |
| Sprint | 3 |
| Requirement | FR-020 |

Force a specific transport type, overriding the auto-detection that infers transport from the target URL scheme. Use `auto` (default) to let the scheme determine the transport.

- `auto`: infer from target URL (`http://` / `https://` → HTTP+SSE; `stdio://` → stdio)
- `http`: force HTTP+SSE transport regardless of URL scheme
- `stdio`: force stdio transport regardless of URL scheme

Validation: Unrecognized value prints `Error: --transport must be one of: auto, stdio, http` to stderr and exits with code 2.

Examples:
```sh
mcp-verify --transport http ./my-server.js       # force HTTP even though target looks like a path
mcp-verify --transport stdio http://localhost     # force stdio, treating the target as a path
```

---

#### `--verbose`

| Property | Value |
|---|---|
| Type | `boolean` flag |
| Default | `false` |
| Config file field | `verbose` |
| Sprint | 3 |
| Requirement | FR-054 |

Enables extended diagnostic output written to stderr (not stdout). In verbose mode:
- Raw JSON-RPC request and response messages are printed to stderr.
- Per-check timing breakdowns are shown.
- Internal state transitions are logged.
- Stack traces from internal errors are printed.

Sensitive values in tool schemas (e.g., string defaults resembling credentials) are redacted as `[REDACTED]` in verbose output.

Verbose mode does not alter the stdout output format. `--format json` stdout output remains clean JSON in verbose mode.

---

#### `--no-color`

| Property | Value |
|---|---|
| Type | `boolean` flag |
| Default | `false` |
| Sprint | 1 |
| Requirement | FR-046 |

Explicitly disables ANSI color codes in terminal output. Color is also automatically disabled when:
- stdout is not a TTY (`!process.stdout.isTTY`)
- The `NO_COLOR` environment variable is set (per [no-color.org](https://no-color.org))

`--no-color` has no effect when `--format json` or `--format markdown` is used (those formats never produce ANSI codes).

---

#### `--no-security`

| Property | Value |
|---|---|
| Type | `boolean` flag |
| Default | `false` |
| Sprint | 3 |

Skips all five built-in security check categories. Only conformance checks are run. The `security` section of JSON output still appears but with empty `findings` and `suppressed` arrays and a `skipped: true` marker.

Cannot be combined with `--no-conformance`. If both are provided, exits with code 2 with message `Error: --no-security and --no-conformance cannot be used together`.

---

#### `--no-conformance`

| Property | Value |
|---|---|
| Type | `boolean` flag |
| Default | `false` |
| Sprint | 3 |

Skips all conformance validators. Only security checks are run. The `conformance` section of JSON output still appears but with a `skipped: true` marker and a score of `null`.

Cannot be combined with `--no-security`.

---

#### `--strict`

| Property | Value |
|---|---|
| Type | `boolean` flag |
| Default | `false` |
| Config file field | `checkMode: "strict"` |
| Sprint | 3 |
| Requirement | FR-009 |

Increases heuristic check sensitivity. Expands pattern matching for command injection and tool poisoning checks to catch more potential issues at the cost of a potentially higher false-positive rate.

In strict mode:
- Command injection: also flags parameters with descriptions mentioning `file`, `directory`, `url`, `input` without constraints.
- Tool poisoning: description length threshold reduced from 2000 to 1000 characters; additional injection patterns applied.

Cannot be combined with `--lenient`. If both are provided, exits with code 2 with message `Error: --strict and --lenient cannot be used together`.

---

#### `--lenient`

| Property | Value |
|---|---|
| Type | `boolean` flag |
| Default | `false` |
| Config file field | `checkMode: "lenient"` |
| Sprint | 3 |
| Requirement | FR-009 |

Reduces heuristic check sensitivity. Only the highest-confidence patterns are applied, minimizing false positives.

In lenient mode:
- Command injection: only exact name matches for `command`, `cmd`, `exec`, `shell` are flagged.
- Tool poisoning: only the most specific injection patterns (`IGNORE PREVIOUS`, `[SYSTEM]`, `<system>`) are flagged.

Cannot be combined with `--strict`.

---

#### `--output <path>`

| Property | Value |
|---|---|
| Type | `string` (file path) |
| Default | stdout |
| Config file field | `output` |
| Sprint | 3 |
| Requirement | FR-055 |

Write the full report (in the format specified by `--format`) to a file instead of stdout. When `--output` is specified, a terminal summary is still printed to stdout.

Behavior:
- If the file already exists, it is overwritten without prompting.
- If the path's parent directory does not exist: exits with code 2.
- If the file is not writable (permission denied): exits with code 2.

Examples:
```sh
mcp-verify --format json --output report.json http://localhost:3000
mcp-verify --format markdown --output report.md http://localhost:3000
```

---

#### `--version`, `-V`

| Property | Value |
|---|---|
| Type | `boolean` flag |
| Sprint | 1 |
| Requirement | FR-004 |

Prints the tool version and the MCP spec version being validated against, then exits with code 0.

Output format:
```
mcp-verify x.y.z (validates MCP spec 2024-11-05)
```

Output is written to stdout.

---

#### `--help`, `-h`

| Property | Value |
|---|---|
| Type | `boolean` flag |
| Sprint | 1 |
| Requirement | FR-005 |

Prints usage documentation including all commands, flags with types and defaults, and example invocations. Exits with code 0. Output is written to stdout.

---

### 1.3 `verify` Command

```
mcp-verify verify <target> [options]
mcp-verify <target> [options]          (shorthand, identical behavior)
```

The primary command. Connects to the MCP server at `<target>`, executes the verification pipeline, and reports results.

#### Positional Argument: `<target>`

| Property | Value |
|---|---|
| Type | `string` (URL) |
| Required | Yes |
| Sprint | 1 |
| Requirement | FR-001 |

The MCP server target. Scheme determines transport:

| Scheme | Transport | Example |
|---|---|---|
| `http://` | HTTP+SSE | `http://localhost:3000` |
| `https://` | HTTP+SSE | `https://api.example.com/mcp` |
| `stdio://` | stdio (process spawn) | `stdio://./my-server.js` |
| `stdio://` | stdio (absolute path) | `stdio:///usr/local/bin/my-server` |

Validation:
- Missing `<target>`: prints usage help to stderr and exits with code 2.
- Unrecognized scheme (not `http://`, `https://`, `stdio://`): exits with code 2 with message `Error: Unsupported target scheme. Use http://, https://, or stdio://`.
- `stdio://` path that does not exist: exits with code 2 with message `Error: stdio target not found: <path>`.
- `stdio://` path that is not executable: exits with code 2 with message `Error: stdio target is not executable: <path>`.
- HTTP/HTTPS target with syntactically invalid URL: exits with code 2 with message `Error: Invalid target URL: <target>`.

#### Built-in Check IDs

The following check IDs are accepted in `--skip` and in the config `skip` array:

**Conformance Checks:**

| Check ID | Category | Description | Confidence |
|---|---|---|---|
| `jsonrpc-envelope` | `jsonrpc-base` | JSON-RPC 2.0 envelope field validation | deterministic |
| `jsonrpc-error-codes` | `jsonrpc-base` | Error code range validation | deterministic |
| `mcp-init-response` | `initialization` | Initialize response required fields | deterministic |
| `mcp-capability-negotiation` | `initialization` | Declared capabilities vs. actual responses | deterministic |
| `mcp-tool-schema-structure` | `tools` | Tool name, description, inputSchema presence | deterministic |
| `mcp-tool-schema-content` | `tools` | inputSchema draft-07 structural validity | deterministic |
| `mcp-resource-protocol` | `resources` | resources/list and resources/read structure | deterministic |
| `mcp-prompt-protocol` | `prompts` | prompts/list structure | deterministic |
| `mcp-stdio-transport` | `transport` | stdio line-delimited framing | deterministic |
| `mcp-http-sse-transport` | `transport` | HTTP+SSE Content-Type and data: prefix | deterministic |
| `mcp-error-handling` | `jsonrpc-base` | Error response to unknown method and malformed JSON | deterministic |

**Security Checks:**

| Check ID | Severity | Description | Confidence |
|---|---|---|---|
| `command-injection` | high | Unconstrained shell-executable string parameters | heuristic |
| `cors-wildcard` | high | `Access-Control-Allow-Origin: *` on HTTP transport | deterministic |
| `missing-auth` | critical/medium | No authentication on non-loopback HTTP endpoint | heuristic |
| `tool-poisoning` | critical | Prompt injection patterns in tool metadata | heuristic |
| `info-leakage` | medium | Stack traces or paths in error responses | deterministic |

#### Command-Specific Options (verify)

The verify command inherits all global options. There are no verify-only options beyond the positional `<target>`.

#### `--compare-last` (Sprint 4)

| Property | Value |
|---|---|
| Type | `boolean` flag |
| Default | `false` |
| Sprint | 4 |
| Requirement | FR-072 |

After the standard verification run, loads the previous run's results from history and prints a regression summary. When used with `--format json`, a `comparison` key is added to the JSON output.

If no history exists for the target: prints `No previous run found for <target>` and continues normally.

---

### 1.4 `serve` Command (Sprint 4 / P2)

```
mcp-verify serve [options]
```

Starts the local web dashboard server. Blocks until interrupted with Ctrl+C (SIGINT).

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `--port <number>` | integer | `4000` | TCP port to bind the dashboard HTTP server |
| `--no-history` | boolean | `false` | Disable history storage for subsequent verify runs |

Validation:
- `--port` value is not a valid port number (1–65535): exits with code 2.
- Port is already in use: exits with code 2 with message `Error: Port <n> is already in use. Use --port to specify a different port.`

The dashboard server binds to `127.0.0.1` only. It never binds to `0.0.0.0`.

On startup, the URL is printed to stdout:
```
MCP Verify dashboard running at http://localhost:4000
Press Ctrl+C to stop.
```

Dashboard API routes (internal, served by the `serve` command's built-in HTTP server):

| Route | Method | Description |
|---|---|---|
| `GET /api/servers` | GET | List all tracked servers with latest scores |
| `GET /api/history/:hostname` | GET | History entries for a specific hostname |
| `GET /api/baselines/:hostname` | GET | Baseline entry for a specific hostname |

These routes are not part of the public CLI API and carry no stability guarantee across versions. They are implementation details of the local dashboard.

---

### 1.5 `baseline` Command (Sprint 4 / P2)

```
mcp-verify baseline <target> [options]
mcp-verify baseline --existing <target>
```

Runs verification against `<target>` and stores the result as the known-good baseline. Future `--compare-last` runs compare against this baseline instead of the immediately previous run.

#### `--existing`

| Property | Value |
|---|---|
| Type | `boolean` flag |
| Default | `false` |

When provided, does not re-run verification. Instead, promotes the most recent history entry for `<target>` to baseline status.

If no history exists: exits with code 2 with message `Error: No history found for <target>. Run mcp-verify first.`

#### `--no-history`

When used with `baseline`, prevents the baseline run from also being appended to general history. The baseline file is still written.

---

### 1.6 `history` Command (Sprint 4 / P2)

```
mcp-verify history export <target> [options]
mcp-verify history export --all [options]
```

Exports stored history as a JSON file.

#### Subcommand: `export`

| Option | Type | Default | Description |
|---|---|---|---|
| `--output <path>` | string | stdout | Output file path |
| `--all` | boolean | `false` | Export history for all tracked targets |

When `--all` is used, the positional `<target>` argument is not required.

Output structure: a JSON object with `exportedAt` (ISO 8601 string), `toolVersion` (string), and `runs` (array of history entry objects matching the schema in Section 3).

---

## 2. Internal Module Interfaces

These TypeScript interfaces define the contracts between modules in the verification pipeline. All types are defined in `src/types/` and imported by the modules that implement or consume them. No module may import from a peer module except through `src/types/`; only `src/cli.ts` orchestrates cross-module calls.

### 2.1 Transport Interface

The transport layer provides an abstract JSON-RPC message channel. Two implementations exist: `StdioTransport` and `HttpTransport`.

```typescript
// src/transport/types.ts

/**
 * Abstract transport channel for JSON-RPC messages.
 * Implementations: StdioTransport (src/transport/stdio.ts),
 *                  HttpTransport (src/transport/http.ts)
 */
export interface Transport {
  /**
   * Send a JSON-RPC request and return the response.
   * The promise rejects with TransportError on timeout or connection failure.
   * The per-call timeout is configured via VerificationConfig.timeout.
   */
  send(message: JsonRpcRequest): Promise<JsonRpcResponse>;

  /**
   * Send a JSON-RPC notification (fire-and-forget, no response expected).
   * Used for the `initialized` notification in the MCP handshake.
   * The promise resolves when the message has been written to the channel.
   * Rejects with TransportError if the channel is closed or broken.
   */
  notify(message: JsonRpcNotification): Promise<void>;

  /**
   * Send raw bytes directly to the transport channel without JSON serialization.
   * Used by the malformed-JSON error probe (FR-018).
   * Returns the server's response if one arrives within timeout, or null on timeout.
   * Never rejects — transport-level errors are returned as null.
   */
  sendRaw(data: string): Promise<JsonRpcResponse | null>;

  /**
   * Returns transport metadata collected over the lifetime of the connection.
   * May be called at any point during or after the session.
   * Includes HTTP headers, SSE observations, stdio framing data, and timing.
   */
  getMetadata(): TransportMetadata;

  /**
   * Close the transport connection and release all resources.
   * For stdio: sends SIGTERM, then SIGKILL after 2s if the process has not exited.
   * For HTTP: aborts pending requests and destroys open sockets.
   * Safe to call multiple times — subsequent calls are no-ops.
   * The returned promise resolves when all resources have been released.
   */
  close(): Promise<void>;
}

/**
 * Factory function that creates the appropriate Transport implementation
 * based on the target URL scheme or the config.transport override.
 *
 * Scheme resolution:
 *   http:// or https:// -> HttpTransport
 *   stdio://            -> StdioTransport
 *   anything else       -> throws TransportError (exit code 2)
 *
 * When config.transport is set ('http' | 'stdio'), it overrides scheme detection.
 */
export declare function createTransport(
  target: string,
  config: VerificationConfig
): Transport;

/**
 * Metadata collected during a transport session.
 * Available after at least one message exchange.
 */
export interface TransportMetadata {
  /** Transport type used for this session */
  type: 'stdio' | 'http';

  /** The target as originally provided by the user */
  target: string;

  /**
   * HTTP response headers keyed by exchange identifier (HTTP transport only).
   * Key: JSON-RPC method of the associated request (e.g., "initialize").
   * Value: header name-value map (header names are lowercased).
   * Example: { "initialize": { "content-type": "application/json", "access-control-allow-origin": "*" } }
   */
  httpHeaders: Record<string, Record<string, string>>;

  /**
   * SSE format observations (HTTP transport, SSE responses only).
   * Populated when the server responds with Content-Type: text/event-stream.
   */
  sseObservations: SseObservation[];

  /**
   * Lines written to stdout by the target process before the first valid
   * JSON-RPC message was received (stdio transport only).
   * Non-empty values indicate spec-violating pre-protocol output.
   */
  preProtocolOutput: string[];

  /**
   * Per-exchange timing records, in order of occurrence.
   */
  timing: MessageTiming[];

  /**
   * Resolved IP address of the target host (HTTP transport only).
   * Used by the authentication gap analyzer to classify loopback vs. private vs. public.
   */
  resolvedAddress?: string;

  /**
   * Classification of the resolved IP address (HTTP transport only).
   * loopback: 127.0.0.1, ::1, localhost
   * private: RFC 1918 ranges (10.x, 172.16-31.x, 192.168.x)
   * public: any other routable address
   */
  addressType?: 'loopback' | 'private' | 'public';
}

export interface SseObservation {
  /** Whether the response used Content-Type: text/event-stream */
  hasCorrectContentType: boolean;
  /** Whether data: prefix was present on all SSE event lines */
  hasDataPrefix: boolean;
  /** Whether SSE data fields contained valid JSON */
  dataIsValidJson: boolean;
  /** Whether any redirect (301/302) was observed before the SSE endpoint */
  hadRedirect: boolean;
}

export interface MessageTiming {
  /** JSON-RPC method of the request */
  method: string;
  /** JSON-RPC request id */
  requestId: string | number;
  /** Milliseconds from send() call to response receipt */
  durationMs: number;
  /** Wall-clock timestamp when the request was sent */
  sentAt: string; // ISO 8601
}

export class TransportError extends Error {
  constructor(
    message: string,
    public readonly code: 'CONNECTION_REFUSED' | 'TIMEOUT' | 'PROCESS_NOT_FOUND' |
                          'PROCESS_NOT_EXECUTABLE' | 'INVALID_SCHEME' | 'UNKNOWN'
  ) { super(message); }
}
```

### 2.2 Conformance Validator Interface

Each conformance validator is a pure function. The runner calls all registered validators and concatenates results.

```typescript
// src/validators/conformance/runner.ts

/**
 * Execute all registered conformance validators against the protocol exchange record.
 * Returns a flat array of all CheckResult objects from all validators.
 * If config.noConformance is true, returns an empty array.
 * Validators in config.skip are skipped (their results are omitted entirely;
 * skip filtering is applied by the scoring engine, not here).
 */
export declare function runConformanceChecks(
  exchange: ProtocolExchangeRecord,
  config: VerificationConfig
): CheckResult[];

/**
 * The function signature all conformance validators must implement.
 * Functions are stateless and side-effect-free.
 * Each function may return zero or more CheckResult objects.
 */
export type ConformanceValidator = (
  exchange: ProtocolExchangeRecord,
  config: VerificationConfig
) => CheckResult[];

// src/types/conformance.ts

export interface CheckResult {
  /** Stable identifier for this specific check (see Section 1.3 check ID table) */
  checkId: string;

  /** Display name used in reports */
  name: string;

  /** Conformance category that this check scores against */
  category: ConformanceCategory;

  /** Outcome of this check */
  level: 'pass' | 'failure' | 'warning' | 'info';

  /**
   * Human-readable description of the violation (for failure/warning)
   * or confirmation (for pass). Required for all levels except 'info'.
   */
  description: string;

  /**
   * The specific MCP spec section or JSON-RPC section this check enforces.
   * Format: "MCP Spec 2024-11-05, Section 3.1" or "JSON-RPC 2.0, Section 5"
   */
  specReference: string;

  /**
   * The MCP spec version(s) this check applies to.
   * Checks may be version-gated; a check does not fire if the server's
   * declared protocolVersion is not in this list.
   */
  specVersion: string | string[];

  /**
   * Whether this check's result is definitive based on observable data,
   * or probabilistic based on pattern matching.
   */
  confidence: 'deterministic' | 'heuristic';

  /**
   * The raw value or message content that triggered the violation.
   * Included only for failures and warnings. Omitted for passes.
   * Used in verbose reporter output.
   */
  evidence?: string;

  /**
   * The tool name, resource URI, or prompt name this check was applied to.
   * Populated for per-item checks (tool schema, resource entry, prompt entry).
   */
  component?: string;

  /** Whether this check result was suppressed via config.skip */
  suppressed: boolean;
}

export type ConformanceCategory =
  | 'jsonrpc-base'
  | 'initialization'
  | 'tools'
  | 'resources'
  | 'prompts'
  | 'transport';
```

### 2.3 Security Analyzer Interface

Each security analyzer is a pure function. The runner calls all registered analyzers and concatenates results.

```typescript
// src/validators/security/runner.ts

/**
 * Execute all registered security analyzers against the protocol exchange record.
 * Returns a flat array of all SecurityFinding objects from all analyzers.
 * If config.noSecurity is true, returns an empty array.
 * Analyzer results are passed through as-is; suppression is applied by the scoring engine.
 */
export declare function runSecurityChecks(
  exchange: ProtocolExchangeRecord,
  config: VerificationConfig
): SecurityFinding[];

/**
 * The function signature all security analyzers must implement.
 * Functions are stateless and side-effect-free.
 * Each function may return zero or more SecurityFinding objects.
 */
export type SecurityAnalyzer = (
  exchange: ProtocolExchangeRecord,
  config: VerificationConfig
) => SecurityFinding[];

// src/types/security.ts

export interface SecurityFinding {
  /**
   * Sequential identifier assigned at report assembly time.
   * Format: "SEC-NNN" where NNN is zero-padded to 3 digits (e.g., "SEC-001").
   * Numbering is stable within a single run but not across runs.
   */
  id: string;

  /**
   * The check that produced this finding.
   * Matches one of the built-in check IDs (Section 1.3) or a plugin-defined ID.
   */
  checkId: string;

  /** Severity classification */
  severity: Severity;

  /**
   * CVSS-adjacent numeric score (0.0–10.0).
   * Assigned per check category:
   *   command-injection:  8.1
   *   cors-wildcard:      7.5
   *   missing-auth:       9.8 (public) | 6.5 (private)
   *   tool-poisoning:     8.8
   *   info-leakage:       5.3
   */
  cvssScore: number;

  /**
   * Human-readable identifier of the affected component.
   * Examples: 'Tool "run-shell", parameter "command"', 'Endpoint http://localhost:3000'
   */
  component: string;

  /** Human-readable explanation of the vulnerability and why it was flagged */
  description: string;

  /** Actionable remediation guidance */
  remediation: string;

  /** Whether the finding is definitive or probabilistic */
  confidence: 'deterministic' | 'heuristic';

  /**
   * Origin of the finding.
   * 'builtin': produced by a built-in analyzer
   * 'plugin': produced by a custom plugin (Sprint 4)
   */
  source: 'builtin' | 'plugin';

  /**
   * ID of the plugin that produced this finding (Sprint 4).
   * Populated only when source is 'plugin'.
   */
  pluginId?: string;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface SuppressedFinding extends SecurityFinding {
  suppressed: true;
  justification: string;
}
```

### 2.4 Reporter Interface

Reporters receive the fully assembled `VerificationResult` and return a string. They are side-effect-free; the CLI entry point handles writing the string to stdout or a file.

```typescript
// src/reporters/types.ts

/**
 * A reporter transforms a VerificationResult into a string in a specific format.
 * Reporters must be pure: given identical inputs, they produce identical outputs.
 * Reporters never write to stdout/stderr directly.
 */
export interface Reporter {
  /** The output format this reporter produces */
  format: OutputFormat;

  /**
   * Render the verification result as a string.
   * For the terminal reporter, the returned string includes ANSI escape codes
   * if color is enabled. The caller strips ANSI codes if needed.
   *
   * The method is synchronous. Reporters do not perform I/O.
   */
  render(result: VerificationResult): string;
}

export type OutputFormat = 'terminal' | 'json' | 'markdown' | 'sarif';

/**
 * Factory: creates the appropriate Reporter implementation for the given format.
 * Throws TypeError if format is unrecognized (this should never happen after CLI validation).
 */
export declare function createReporter(
  format: OutputFormat,
  options: ReporterOptions
): Reporter;

export interface ReporterOptions {
  /**
   * Whether to include ANSI color codes in terminal output.
   * Computed by the CLI from --no-color, NO_COLOR env var, and stdout.isTTY.
   * Ignored by json and markdown reporters.
   */
  color: boolean;
}
```

### 2.5 Scoring Interface

The scoring engine computes scores, applies suppressions, and determines the exit code.

```typescript
// src/scoring/engine.ts

/**
 * Compute the conformance score, aggregate security findings, apply suppressions,
 * and determine the exit code and pass/fail verdict.
 *
 * The scoring engine is the sole authority on exit code determination.
 * It applies the following logic (in order):
 *   1. If any internal protocol error caused a pipeline failure → exit code 2
 *   2. If overallScore < config.conformanceThreshold → exit code 1
 *   3. If any non-suppressed finding.severity >= config.failOnSeverity → exit code 1
 *   4. Otherwise → exit code 0
 */
export declare function computeScores(
  checkResults: CheckResult[],
  securityFindings: SecurityFinding[],
  config: VerificationConfig
): ScoringResult;

// src/scoring/types.ts

export interface ScoringResult {
  /** Weighted conformance score, 0–100 (integer) */
  overallScore: number;

  /**
   * Per-category conformance scores, each 0–100 (integer).
   * Computed before overall weighted average.
   */
  categoryScores: Record<ConformanceCategory, number>;

  /**
   * The weight applied to each category in the overall score.
   * Values sum to 1.0.
   *   jsonrpc-base:  0.20
   *   initialization: 0.25
   *   tools:          0.25
   *   resources:      0.10
   *   prompts:        0.10
   *   transport:      0.10
   */
  categoryWeights: Record<ConformanceCategory, number>;

  /**
   * Count of active (non-suppressed) security findings by severity.
   */
  securitySummary: Record<Severity, number>;

  /** Count of suppressed findings (across all severities) */
  suppressedCount: number;

  /** True iff exitCode is 0 */
  pass: boolean;

  /** Determined exit code (see Section 5 for exact logic) */
  exitCode: 0 | 1 | 2;
}
```

### 2.6 Plugin Interface (Sprint 4 / P2)

The plugin interface is the public API surface that plugin authors implement. Types are exported from the main package entry point.

```typescript
// src/plugins/types.ts (publicly exported as 'mcp-verify' package exports)

/**
 * A custom verification plugin.
 * Plugins are loaded from mcp-verify.config.js (or .mjs / .cjs).
 * Each plugin exports a default object conforming to this interface.
 */
export interface Plugin {
  /**
   * Unique identifier for this plugin.
   * Used in --skip, in finding checkId values, and in warning messages.
   * Recommended format: kebab-case string (e.g., "my-org-auth-check").
   * Must not conflict with built-in check IDs.
   */
  id: string;

  /** Human-readable display name */
  name: string;

  /** Short description of what this plugin checks */
  description: string;

  /**
   * Semantic version string (e.g., "1.0.0").
   * Printed in verbose output and included in plugin finding metadata.
   */
  version: string;

  /**
   * The check function. Called once per verification run.
   * Must return within 30 seconds; plugins that exceed this are terminated
   * and treated as having returned no findings (never causes exit code 2).
   *
   * Unhandled exceptions are caught; the plugin is skipped and a warning
   * is printed to stderr.
   *
   * @param context - Protocol data and plugin-specific config
   * @returns Array of findings (may be empty)
   */
  check(context: PluginContext): Promise<SecurityFinding[]>;
}

/**
 * The context object passed to plugin check functions.
 * Contains a read-only view of the protocol exchange data.
 * Plugins must not mutate any property of this object.
 */
export interface PluginContext {
  /** The target URL or path as provided by the user */
  target: string;

  /** Transport type used: 'http' or 'stdio' */
  transport: 'http' | 'stdio';

  /**
   * The raw server response to the `initialize` request.
   * Includes protocolVersion, capabilities, serverInfo.
   * Type is `unknown` to avoid forcing plugins to import internal types.
   * Plugins should narrow the type with guard functions.
   */
  initializeResponse: unknown;

  /**
   * Aggregated tools array from all paginated tools/list responses.
   * Empty array if the server did not declare tools capability.
   */
  toolsList: unknown[];

  /**
   * Aggregated resources array from resources/list.
   * Empty array if the server did not declare resources capability.
   */
  resourcesList: unknown[];

  /**
   * Aggregated prompts array from prompts/list.
   * Empty array if the server did not declare prompts capability.
   */
  promptsList: unknown[];

  /**
   * Array of error responses from the error probes:
   * [unknownMethodProbeResponse, malformedJsonProbeResponse].
   * Either element may be null if the probe timed out.
   */
  errorProbeResponses: (unknown | null)[];

  /**
   * Plugin-specific configuration from the `rules` object in mcp-verify.config.js.
   * Keyed by the plugin's `id`. Empty object if no rules entry exists for this plugin.
   */
  config: Record<string, unknown>;
}

// Plugin loader public interface
// src/plugins/loader.ts

/**
 * Load and validate all plugins declared in config.plugins.
 * Invalid plugins (wrong shape, missing required fields) are skipped with a warning.
 * Returns an array of validated Plugin objects ready for execution.
 */
export declare function loadPlugins(
  config: VerificationConfig
): Promise<Plugin[]>;

/**
 * Execute all loaded plugins against the protocol exchange context.
 * Each plugin is run in sequence with a 30-second timeout guard.
 * Plugin failures are caught; the tool continues with remaining plugins.
 * Returns findings from all plugins that completed successfully.
 */
export declare function runPlugins(
  plugins: Plugin[],
  exchange: ProtocolExchangeRecord,
  config: VerificationConfig
): Promise<SecurityFinding[]>;
```

### 2.7 History Store Interface (Sprint 4 / P2)

```typescript
// src/history/store.ts

/**
 * Append a verification result to the history file for the given target.
 * The history directory (~/.mcp-verify/history/) is created if it does not exist.
 * Filesystem errors are caught and logged as warnings; never throws.
 * This function has no effect if config.noHistory is true.
 */
export declare function appendRun(
  target: string,
  result: VerificationResult
): Promise<void>;

/**
 * Retrieve history entries for a target, most recent first.
 * @param target - The exact target URL/path
 * @param limit  - Maximum entries to return (default: all)
 * @returns Array of history entries, or empty array if no history exists
 */
export declare function getHistory(
  target: string,
  limit?: number
): Promise<HistoryEntry[]>;

/**
 * Retrieve the single most recent history entry for a target.
 * Returns null if no history exists for the target.
 */
export declare function getLastRun(
  target: string
): Promise<HistoryEntry | null>;

// src/history/baseline.ts

/**
 * Store a verification result as the named baseline for a target.
 * Overwrites any existing baseline for this target.
 * The baseline directory (~/.mcp-verify/baselines/) is created if needed.
 */
export declare function saveBaseline(
  target: string,
  result: VerificationResult
): Promise<void>;

/**
 * Retrieve the stored baseline for a target.
 * Returns null if no baseline exists.
 */
export declare function getBaseline(
  target: string
): Promise<HistoryEntry | null>;

// src/types/history.ts

export interface HistoryEntry {
  /** ISO 8601 timestamp of the verification run */
  timestamp: string;

  /** The target URL/path as provided by the user */
  target: string;

  /** Overall conformance score (0–100) */
  conformanceScore: number;

  /** Total count of active (non-suppressed) security findings */
  securityFindingsCount: number;

  /** Per-category conformance scores */
  breakdown: Record<ConformanceCategory, number>;

  /** mcp-verify tool version that produced this entry */
  toolVersion: string;

  /** MCP spec version validated against */
  specVersion: string;
}
```

### 2.8 Config Loader Interface

```typescript
// src/config/loader.ts

/**
 * Discover, read, parse, and validate the configuration file.
 * Returns a fully typed VerificationConfig with all defaults applied.
 *
 * Discovery order (when configPath is not provided):
 *   1. <cwd>/mcp-verify.json
 *   2. <cwd>/.mcp-verify.json
 *   3. If neither found: return defaults (no error)
 *
 * When configPath is provided:
 *   - File must exist (else throws ConfigError with exit code 2)
 *   - File must contain valid JSON (else throws ConfigError with exit code 2)
 */
export declare function loadConfig(options: {
  /** Explicit config file path from --config flag */
  configPath?: string;
  /** Directory to search for auto-discovered config files. Defaults to process.cwd() */
  cwd?: string;
}): Promise<VerificationConfig>;

/**
 * Merge CLI flag overrides on top of a config-file-derived config.
 * CLI values take precedence; undefined CLI values do not override config values.
 * Returns a new VerificationConfig (does not mutate inputs).
 */
export declare function mergeCliOverrides(
  config: VerificationConfig,
  cliFlags: Partial<VerificationConfig>
): VerificationConfig;

/**
 * Validate a raw parsed JSON object against the config schema.
 * Returns the parsed config with defaults applied on success,
 * or an error object with human-readable error messages on failure.
 */
export declare function validateConfig(
  raw: unknown
): { valid: true; config: VerificationConfig } | { valid: false; errors: string[] };

export class ConfigError extends Error {
  constructor(message: string, public readonly filePath: string) {
    super(message);
  }
}
```

---

## 3. JSON Output Schema

The JSON output produced by `--format json` is a stable, versioned public API. Schema changes that add optional fields increment the minor version. Schema changes that remove, rename, or restructure fields increment the major version and require a new `schemaVersion` value.

Current schema version: **`1.0`**

The schema is published as `docs/report-schema.json` (JSON Schema draft-07) in the repository. The `schemaVersion` field in every report matches the documented schema version.

### 3.1 Top-Level Structure

```json
{
  "schemaVersion": "1.0",
  "meta": { ... },
  "conformance": { ... },
  "security": { ... },
  "summary": { ... },
  "comparison": { ... }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `schemaVersion` | `string` | Yes | Report schema version. Current: `"1.0"` |
| `meta` | `object` | Yes | Run metadata (tool version, timestamp, target, config) |
| `conformance` | `object` | Yes | Conformance score and violations |
| `security` | `object` | Yes | Security findings |
| `summary` | `object` | Yes | Pass/fail verdict and blocker counts |
| `comparison` | `object` | No | Regression comparison (present only when `--compare-last` is used; Sprint 4) |

### 3.2 `meta` Object

```json
{
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
  },
  "conformanceSkipped": false,
  "securitySkipped": false
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `toolVersion` | `string` | Yes | Semantic version of the mcp-verify tool (e.g., `"1.0.0"`) |
| `specVersion` | `string` | Yes | MCP spec version validated against (e.g., `"2024-11-05"`) |
| `timestamp` | `string` | Yes | ISO 8601 UTC timestamp of the run start |
| `target` | `string` | Yes | The target URL/path as provided by the user |
| `transport` | `"http" \| "stdio"` | Yes | Transport used |
| `duration` | `integer` | Yes | Total run duration in milliseconds |
| `checkMode` | `"strict" \| "balanced" \| "lenient"` | Yes | Heuristic check sensitivity mode |
| `thresholds.failOnSeverity` | `"critical" \| "high" \| "medium" \| "low" \| "none"` | Yes | Effective severity threshold for exit code 1 |
| `thresholds.conformanceThreshold` | `integer` (0–100) | Yes | Effective conformance score threshold for exit code 1 |
| `conformanceSkipped` | `boolean` | Yes | True if `--no-conformance` was set |
| `securitySkipped` | `boolean` | Yes | True if `--no-security` was set |

### 3.3 `conformance` Object

```json
{
  "score": 87,
  "skipped": false,
  "breakdown": {
    "jsonrpc-base": 95,
    "initialization": 100,
    "tools": 80,
    "resources": 90,
    "prompts": 100,
    "transport": 85
  },
  "weights": {
    "jsonrpc-base": 0.20,
    "initialization": 0.25,
    "tools": 0.25,
    "resources": 0.10,
    "prompts": 0.10,
    "transport": 0.10
  },
  "violations": [ ... ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `score` | `integer \| null` | Yes | Overall conformance score (0–100). `null` when `skipped` is `true` |
| `skipped` | `boolean` | Yes | True when `--no-conformance` was used |
| `breakdown` | `object` | Yes | Per-category scores (0–100 each). All categories present even when score is 0 |
| `breakdown.jsonrpc-base` | `integer` | Yes | JSON-RPC 2.0 envelope and error code score |
| `breakdown.initialization` | `integer` | Yes | MCP initialization handshake score |
| `breakdown.tools` | `integer` | Yes | Tool schema conformance score |
| `breakdown.resources` | `integer` | Yes | Resource protocol conformance score |
| `breakdown.prompts` | `integer` | Yes | Prompt protocol conformance score |
| `breakdown.transport` | `integer` | Yes | Transport-layer protocol score |
| `weights` | `object` | Yes | Category weights used in score calculation (sum to 1.0) |
| `violations` | `array` | Yes | Array of violation objects (Section 3.7). Empty array when no violations |

### 3.4 `security` Object

```json
{
  "skipped": false,
  "findings": [ ... ],
  "suppressed": [ ... ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `skipped` | `boolean` | Yes | True when `--no-security` was used |
| `findings` | `array` | Yes | Array of active (non-suppressed) finding objects (Section 3.8) |
| `suppressed` | `array` | Yes | Array of suppressed finding objects (Section 3.9). Empty array when none |

### 3.5 `summary` Object

```json
{
  "pass": false,
  "exitCode": 1,
  "blockerCount": {
    "critical": 1,
    "high": 1,
    "medium": 0,
    "low": 0
  }
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `pass` | `boolean` | Yes | True iff `exitCode` is `0` |
| `exitCode` | `0 \| 1 \| 2` | Yes | The exit code the process will use (see Section 5) |
| `blockerCount` | `object` | Yes | Count of active findings at each severity level that contribute to exit code 1 |
| `blockerCount.critical` | `integer` | Yes | Active critical findings |
| `blockerCount.high` | `integer` | Yes | Active high findings |
| `blockerCount.medium` | `integer` | Yes | Active medium findings |
| `blockerCount.low` | `integer` | Yes | Active low findings |

### 3.6 `comparison` Object (Sprint 4)

Present only when `--compare-last` flag is used.

```json
{
  "previousScore": 91,
  "currentScore": 79,
  "delta": -12,
  "regressionDetected": true,
  "newFindings": [ ... ],
  "resolvedFindings": [ ... ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `previousScore` | `integer` | Yes | Overall conformance score from the previous (or baseline) run |
| `currentScore` | `integer` | Yes | Overall conformance score from this run |
| `delta` | `integer` | Yes | `currentScore - previousScore`. Negative indicates regression |
| `regressionDetected` | `boolean` | Yes | True if `delta` is negative (score decreased) |
| `newFindings` | `array` | Yes | Security findings present in this run but not in the previous run |
| `resolvedFindings` | `array` | Yes | Security findings present in the previous run but not in this run |

`newFindings` and `resolvedFindings` are arrays of finding objects as defined in Section 3.8.

### 3.7 Violation Object

```json
{
  "checkId": "mcp-tool-schema-structure",
  "name": "Tool Schema Structure Validation",
  "category": "tools",
  "level": "failure",
  "description": "Tool \"run-shell\": inputSchema missing \"type\" field",
  "specReference": "MCP Spec 2024-11-05, Section 5.2",
  "specVersion": "2024-11-05",
  "confidence": "deterministic",
  "evidence": "{\"name\": \"run-shell\", \"description\": \"...\", \"inputSchema\": {\"properties\": {...}}}",
  "component": "run-shell",
  "suppressed": false
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `checkId` | `string` | Yes | Check identifier (see Section 1.3 table) |
| `name` | `string` | Yes | Human-readable check name |
| `category` | `string` | Yes | Conformance category (`jsonrpc-base`, `initialization`, `tools`, `resources`, `prompts`, `transport`) |
| `level` | `string` | Yes | `"pass"`, `"failure"`, `"warning"`, or `"info"` |
| `description` | `string` | Yes | Description of the violation or pass confirmation |
| `specReference` | `string` | Yes | MCP spec section this check enforces |
| `specVersion` | `string` | Yes | MCP spec version this check applies to |
| `confidence` | `string` | Yes | `"deterministic"` or `"heuristic"` |
| `evidence` | `string` | No | Raw value that triggered the violation (omitted for passes) |
| `component` | `string` | No | Tool name, resource URI, or prompt name (populated for per-item checks) |
| `suppressed` | `boolean` | Yes | Whether this violation was suppressed via config `skip` |

Note: Violations with `level: "pass"` are omitted from the `violations` array by default. They are only included in `--verbose` JSON output when explicitly requested.

### 3.8 Finding Object

```json
{
  "id": "SEC-001",
  "checkId": "command-injection",
  "severity": "high",
  "cvssScore": 8.1,
  "component": "Tool \"run-shell\", parameter \"command\"",
  "description": "Unconstrained string parameter with a name matching high-risk shell execution patterns. No pattern, enum, or length constraint is present.",
  "remediation": "Add a 'pattern' constraint (e.g., alphanumeric-only regex) or an 'enum' constraint to the 'command' parameter in the tool's inputSchema.",
  "confidence": "heuristic",
  "source": "builtin"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | Sequential run-scoped identifier. Format: `"SEC-NNN"` |
| `checkId` | `string` | Yes | Check identifier that produced this finding |
| `severity` | `string` | Yes | `"critical"`, `"high"`, `"medium"`, or `"low"` |
| `cvssScore` | `number` | Yes | CVSS-adjacent score (0.0–10.0) |
| `component` | `string` | Yes | Human-readable affected component |
| `description` | `string` | Yes | Explanation of the vulnerability |
| `remediation` | `string` | Yes | Actionable remediation steps |
| `confidence` | `string` | Yes | `"deterministic"` or `"heuristic"` |
| `source` | `string` | Yes | `"builtin"` or `"plugin"` |
| `pluginId` | `string` | No | Plugin ID (present only when `source` is `"plugin"`) |

### 3.9 Suppressed Finding Object

Extends the finding object with suppression metadata.

```json
{
  "id": "SEC-002",
  "checkId": "cors-wildcard",
  "severity": "high",
  "cvssScore": 7.5,
  "component": "Endpoint http://localhost:3000",
  "description": "Access-Control-Allow-Origin: * detected.",
  "remediation": "Restrict CORS to known origins.",
  "confidence": "deterministic",
  "source": "builtin",
  "suppressed": true,
  "justification": "Internal development server, not exposed to external networks"
}
```

All fields from Section 3.8 are present, plus:

| Field | Type | Required | Description |
|---|---|---|---|
| `suppressed` | `true` | Yes | Always `true` for suppressed findings |
| `justification` | `string` | Yes | Reason for suppression. Empty string `""` if no justification was provided |

### 3.10 Schema Versioning Policy

| Change Type | Version Impact | Example |
|---|---|---|
| Add optional field | Minor bump (e.g., `1.0` → `1.1`) | Adding `pluginId` to findings |
| Remove field | Major bump (e.g., `1.0` → `2.0`) | Removing `cvssScore` |
| Rename field | Major bump | Renaming `checkId` to `ruleId` |
| Change field type | Major bump | Changing `score` from integer to float |
| Restructure nested object | Major bump | Moving `thresholds` out of `meta` |
| Add required field | Major bump | Making `pluginId` required |

Consumers of the JSON output must check `schemaVersion` before parsing. The value `"1.0"` is guaranteed stable for the life of the `1.x` tool release line.

---

## 4. Configuration File Schema

### 4.1 JSON Config File (`.mcp-verify.json`)

The JSON config file is the standard configuration mechanism for CI and project-level settings.

**File locations (in discovery order):**
1. Path specified by `--config <path>` (explicit, takes precedence)
2. `<cwd>/mcp-verify.json`
3. `<cwd>/.mcp-verify.json`

**Complete schema with defaults:**

```json
{
  "$schema": "https://raw.githubusercontent.com/mcp-verify/mcp-verify/main/docs/mcp-verify.schema.json",
  "failOnSeverity": "critical",
  "conformanceThreshold": 0,
  "skip": [],
  "transport": null,
  "timeout": 10000,
  "checkMode": "balanced",
  "format": "terminal",
  "output": null,
  "verbose": false,
  "noHistory": false,
  "noColor": false
}
```

**Field Definitions:**

| Field | Type | Default | Allowed Values | Requirement |
|---|---|---|---|---|
| `failOnSeverity` | `string` | `"critical"` | `"critical"`, `"high"`, `"medium"`, `"low"`, `"none"` | FR-043 |
| `conformanceThreshold` | `integer` | `0` | 0–100 | FR-053 |
| `skip` | `array` | `[]` | Array of `string` or `SkipEntry` objects | FR-042 |
| `transport` | `string \| null` | `null` (auto-detect) | `"http"`, `"stdio"`, `null` | FR-020 |
| `timeout` | `integer` | `10000` | 1–300000 | FR-010 |
| `checkMode` | `string` | `"balanced"` | `"strict"`, `"balanced"`, `"lenient"` | FR-009 |
| `format` | `string` | `"terminal"` | `"terminal"`, `"json"`, `"markdown"`, `"sarif"` | FR-002 |
| `output` | `string \| null` | `null` (stdout) | Any valid file path, or `null` | FR-055 |
| `verbose` | `boolean` | `false` | `true`, `false` | FR-054 |
| `noHistory` | `boolean` | `false` | `true`, `false` | FR-067 |
| `noColor` | `boolean` | `false` | `true`, `false` | FR-046 |

**`skip` Array Elements:**

Each element of `skip` is either:

1. A plain string (check ID only, no justification):
   ```json
   "cors-wildcard"
   ```

2. An object with check ID and justification (recommended for audit trail):
   ```json
   {
     "checkId": "cors-wildcard",
     "justification": "Internal development server not exposed to external networks"
   }
   ```

Object form suppression entries include the `justification` text in the output's `suppressed` array. String form entries produce a `justification` value of `""` in the output and a warning on stderr: `Warning: Skip entry for <checkId> has no justification field`.

**Complete example `.mcp-verify.json`:**

```json
{
  "$schema": "https://raw.githubusercontent.com/mcp-verify/mcp-verify/main/docs/mcp-verify.schema.json",
  "failOnSeverity": "high",
  "conformanceThreshold": 80,
  "timeout": 15000,
  "checkMode": "balanced",
  "skip": [
    {
      "checkId": "cors-wildcard",
      "justification": "Internal staging environment, not internet-accessible"
    }
  ]
}
```

**Validation Rules:**

| Field | Validation | Error on Violation |
|---|---|---|
| `failOnSeverity` | Must be one of the allowed enum values | `Config error: 'failOnSeverity' must be one of: critical, high, medium, low, none` |
| `conformanceThreshold` | Must be an integer, 0–100 | `Config error: 'conformanceThreshold' must be an integer between 0 and 100` |
| `skip` | Must be an array; each element must be a string or object with `checkId` string | `Config error: 'skip[<n>]' must be a string or object with 'checkId' field` |
| `timeout` | Must be a positive integer, 1–300000 | `Config error: 'timeout' must be a positive integer (milliseconds, max 300000)` |
| `checkMode` | Must be one of: `strict`, `balanced`, `lenient` | `Config error: 'checkMode' must be one of: strict, balanced, lenient` |
| `format` | Must be one of: `terminal`, `json`, `markdown`, `sarif` | `Config error: 'format' must be one of: terminal, json, markdown, sarif` |
| `transport` | Must be `"http"`, `"stdio"`, or `null` | `Config error: 'transport' must be "http", "stdio", or null` |

Unknown fields in the config file produce a warning to stderr and are ignored. They do not cause exit code 2:
```
Warning: Unknown config field 'strictMode' — did you mean 'checkMode'?
```

### 4.2 JavaScript Config File (`mcp-verify.config.js`)

The JavaScript config file is used exclusively for Sprint 4 plugin loading. It is a separate file from the JSON config and does not replace it.

**File locations (in discovery order):**
1. `<cwd>/mcp-verify.config.js`
2. `<cwd>/mcp-verify.config.mjs`
3. `<cwd>/mcp-verify.config.cjs`

**Schema:**

```javascript
// mcp-verify.config.js

/** @type {import('mcp-verify').UserConfig} */
export default {
  /**
   * Array of plugin module paths or npm package names.
   * - Relative paths: resolved from the config file's directory
   * - Bare specifiers: resolved from node_modules
   */
  plugins: [
    './rules/internal-auth-check.js',
    'mcp-verify-plugin-owasp'
  ],

  /**
   * Per-plugin configuration objects.
   * Keys are plugin IDs (matching Plugin.id).
   * Values are passed to the plugin's check() function as context.config.
   */
  rules: {
    'internal-auth-check': {
      endpoint: '/auth/validate',
      expectedHeader: 'X-Internal-Token'
    }
  }
};
```

**TypeScript type for plugin authors:**

```typescript
// Exported from 'mcp-verify' package

export interface UserConfig {
  plugins?: string[];
  rules?: Record<string, Record<string, unknown>>;
}
```

**Validation:**

The JavaScript config file is loaded via dynamic `import()`. Errors during loading produce:
- Syntax error in file: exits with code 2, message `Config error: Syntax error in mcp-verify.config.js: <error message>`
- Missing default export: exits with code 2, message `Config error: mcp-verify.config.js must export a default object`
- Default export is not an object: exits with code 2, message `Config error: mcp-verify.config.js default export must be a plain object`

The `plugins` and `rules` fields are both optional. An empty config object `{}` is valid.

### 4.3 Config Discovery Order

Both the JSON config and the JavaScript config are auto-discovered independently. They are not mutually exclusive.

```
On each run:

1. Load JSON config:
   a. If --config <path> → use that path exclusively
   b. Else check <cwd>/mcp-verify.json
   c. Else check <cwd>/.mcp-verify.json
   d. Else use hardcoded defaults

2. Load JavaScript config (Sprint 4, plugin loading):
   a. Check <cwd>/mcp-verify.config.js
   b. Check <cwd>/mcp-verify.config.mjs
   c. Check <cwd>/mcp-verify.config.cjs
   d. Else no plugins

3. Merge:
   defaults → JSON config → CLI flags → final VerificationConfig
   (JavaScript config plugins are loaded separately and merged into the plugin list)
```

### 4.4 Merge Precedence

Values are applied in the following order, with later values overwriting earlier values:

```
hardcoded defaults
    ↓ (overwritten by)
JSON config file values
    ↓ (overwritten by)
CLI flag values
```

Only explicitly provided CLI flags override config values. A flag that is not passed on the command line does not override the config file value.

Example: if `.mcp-verify.json` sets `"timeout": 15000` and `--timeout` is not passed, the effective timeout is 15000. If `--timeout 5000` is passed, the effective timeout is 5000, regardless of the config file.

---

## 5. Exit Code Specification

The tool uses exactly three exit codes. These codes are stable across all versions.

### Exit Code `0` — Pass

The process exits with `0` when all of the following are true:

1. No internal error occurred that prevented the verification pipeline from completing.
2. The overall conformance score is greater than or equal to `config.conformanceThreshold`.
3. No active (non-suppressed) security finding has a severity at or above `config.failOnSeverity`.

Specific conditions that produce exit code `0`:
- A known-conformant server is verified with no security findings.
- All security findings are suppressed via `skip`.
- `failOnSeverity` is `"critical"` (default) and only `high`/`medium`/`low` findings are present.
- `failOnSeverity` is `"none"` (report-only mode).
- `conformanceThreshold` is `0` (default) and any conformance score is computed.

### Exit Code `1` — Check Failure

The process exits with `1` when the verification pipeline completed (no internal error) but findings exceeded the configured thresholds. Exit code `1` signals that the server did not pass at the configured quality bar.

Specific conditions that produce exit code `1` (any one is sufficient):

1. **Conformance threshold exceeded:** `overallScore < config.conformanceThreshold`
   - Example: score is 72 and `conformanceThreshold` is 80.

2. **Security severity threshold exceeded:** At least one active (non-suppressed) finding has `severity >= config.failOnSeverity`
   - Example: a `high` severity finding exists and `failOnSeverity` is `"high"`.
   - Severity ordering for comparison: `critical > high > medium > low`
   - `failOnSeverity: "none"` means no finding ever triggers exit code 1.
   - `failOnSeverity: "low"` means any finding triggers exit code 1.

Exit code `1` is never used for internal tool errors. A server that is completely unreachable produces exit code `2`, not `1`.

### Exit Code `2` — Tool Error

The process exits with `2` when the tool itself encountered an error that prevented it from completing the verification pipeline. Exit code `2` is unambiguous: it always means a tool or environment problem, never a check failure.

All exit code `2` cases write a human-readable error message to stderr (not stdout). The error message format is defined in Section 6.

Specific conditions that produce exit code `2`:

| Condition | Error Category |
|---|---|
| Target server is unreachable after configured timeout | Connection error |
| TCP connection refused to HTTP/HTTPS target | Connection error |
| DNS resolution failure for HTTP/HTTPS target | Connection error |
| `stdio://` target process file not found | Process error |
| `stdio://` target process not executable (permission denied) | Process error |
| `stdio://` target process exits with non-zero code before handshake | Process error |
| Target URL has an unsupported scheme | Validation error |
| Target URL is syntactically invalid | Validation error |
| `--config` file does not exist | Config error |
| `--config` file contains invalid JSON | Config error |
| `mcp-verify.config.js` has a syntax error (Sprint 4) | Config error |
| `--format` has an unrecognized value | Validation error |
| `--transport` has an unrecognized value | Validation error |
| `--fail-on` has an unrecognized value | Validation error |
| `--timeout` is not a positive integer | Validation error |
| `--threshold` is not an integer 0–100 | Validation error |
| `--strict` and `--lenient` both provided | Validation error |
| `--no-security` and `--no-conformance` both provided | Validation error |
| `--output` file path parent directory does not exist | I/O error |
| `--output` file is not writable | I/O error |
| MCP initialization handshake timed out | Protocol error |
| Unhandled internal exception | Internal error |

**Important:** Partial results do not produce exit code `2`. If the initialization handshake succeeds but `tools/list` times out, the tool scores the partial results and exits with `0` or `1` based on those results. Exit code `2` from a protocol perspective only occurs if the initialization handshake fails entirely.

---

## 6. Error Message Specification

### 6.1 Error Message Format

All exit code `2` errors follow this format on stderr:

```
Error: <human-readable description of what went wrong>

  <optional: one or more lines of context, indented 2 spaces>

Hint: <optional: actionable suggestion for what to try next>
```

The `Hint:` line appears when there is a well-known remediation action for the error.

In `--format json` mode, errors still go to stderr (never stdout). The stdout JSON output is only written if the pipeline completes successfully enough to produce a report. If an error prevents any report from being produced, stdout is empty.

In `--verbose` mode, a stack trace is appended to the error output after the `Hint:` line.

### 6.2 Error Catalog

The following table defines the exact error messages for common failure modes. Messages are the full text printed to stderr (excluding the `Error: ` prefix shown here for clarity). The `EC` column is the exit code.

---

**CONNECTION_REFUSED**

```
Error: Connection refused to <target>

  The server at <target> actively refused the connection (ECONNREFUSED).

Hint: Ensure the MCP server is running and listening on the correct port.
      Run: curl -v <target> to test connectivity independently.
```

Trigger: TCP connection attempt receives a RST/ECONNREFUSED response.

---

**TIMEOUT_INIT**

```
Error: Connection timed out waiting for response from <target>

  No response received within <timeout>ms during the MCP initialization handshake.
  The server may be unreachable, overloaded, or not speaking the MCP protocol.

Hint: Try increasing the timeout with --timeout <ms>.
      Current timeout: <timeout>ms
```

Trigger: `initialize` request sent but no response received within `config.timeout`.

---

**DNS_FAILURE**

```
Error: Could not resolve hostname '<hostname>'

  DNS lookup failed for '<hostname>' (ENOTFOUND).

Hint: Check the target URL for typos.
      Verify DNS resolution with: nslookup <hostname>
```

Trigger: DNS resolution fails for the HTTP/HTTPS target hostname.

---

**INVALID_URL**

```
Error: Invalid target URL: '<target>'

  The target could not be parsed as a valid URL.
  Expected format: http://<host>[:<port>][/<path>]
                or https://<host>[:<port>][/<path>]
                or stdio://<path-to-executable>

Hint: Check the target for missing scheme prefix, invalid characters, or typos.
```

Trigger: `new URL(target)` throws, or the scheme is not `http://`, `https://`, or `stdio://`.

---

**UNSUPPORTED_SCHEME**

```
Error: Unsupported target scheme in '<target>'

  The scheme '<scheme>://' is not supported.
  Supported schemes: http://, https://, stdio://

Hint: Use stdio:// for local processes and http:// or https:// for network servers.
```

Trigger: The URL scheme is parseable but not one of the supported transport schemes.

---

**PROCESS_NOT_FOUND**

```
Error: stdio target not found: '<path>'

  The file '<path>' does not exist or is not accessible.

Hint: Check that the path is correct and the file exists.
      Tip: Use an absolute path or prefix with './' for relative paths.
```

Trigger: `fs.access(path)` fails with ENOENT for a `stdio://` target.

---

**PROCESS_NOT_EXECUTABLE**

```
Error: stdio target is not executable: '<path>'

  The file '<path>' exists but cannot be executed.

Hint: Make the file executable with: chmod +x <path>
      Or reference it with node explicitly: stdio://node <path>
```

Trigger: `fs.access(path, fs.constants.X_OK)` fails for a `stdio://` target.

---

**PROCESS_EXITED_EARLY**

```
Error: stdio target process exited before completing the MCP handshake

  Process '<path>' exited with code <exit-code> after <duration>ms.
  The process may have crashed during startup or rejected the connection.

Hint: Run the server process manually to see startup errors:
        node <path>
      Check for missing environment variables or configuration files.
```

Trigger: The spawned stdio process exits (emits `close` event) before the `initialize` response is received.

---

**CONFIG_NOT_FOUND**

```
Error: Config file not found: '<path>'

  The config file specified with --config does not exist.

Hint: Check the path for typos.
      Create a config file with: echo '{}' > <path>
```

Trigger: `--config <path>` provided but file does not exist.

---

**CONFIG_PARSE_ERROR**

```
Error: Config file parse error: '<path>'

  The config file contains invalid JSON.
  JSON parse error at line <line>, column <col>: <message>

Hint: Validate the JSON syntax with: node -e "JSON.parse(require('fs').readFileSync('<path>', 'utf8'))"
      Common issues: trailing commas, unquoted keys, missing closing braces.
```

Trigger: `JSON.parse()` throws when loading the config file.

---

**CONFIG_VALIDATION_ERROR**

```
Error: Config file validation error: '<path>'

  The config file contains invalid values:

    - <field>: <validation error message>
    - <field>: <validation error message>

Hint: Run mcp-verify --help to see the allowed values for each field.
```

Trigger: `validateConfig()` returns `{ valid: false }` with one or more validation errors.

---

**UNKNOWN_CHECK_ID**

```
Warning: Unknown check ID in skip list: '<checkId>'

  '<checkId>' is not a recognized built-in check ID.
  It will be ignored.

  Valid check IDs: jsonrpc-envelope, jsonrpc-error-codes, mcp-init-response,
    mcp-capability-negotiation, mcp-tool-schema-structure, mcp-tool-schema-content,
    mcp-resource-protocol, mcp-prompt-protocol, mcp-stdio-transport,
    mcp-http-sse-transport, mcp-error-handling, command-injection, cors-wildcard,
    missing-auth, tool-poisoning, info-leakage
```

Note: Unknown check IDs in `--skip` or `config.skip` produce a **warning**, not an error. They do not cause exit code 2. This allows config files to reference plugin-defined check IDs even when the plugin is not loaded.

---

**OUTPUT_FILE_ERROR**

```
Error: Cannot write output file: '<path>'

  <OS error message> (<error code>)

Hint: Check that the directory '<parent-dir>' exists and is writable.
```

Trigger: Writing the output file fails (EACCES, ENOENT, ENOSPC, etc.).

---

**CONFLICTING_FLAGS**

```
Error: Conflicting flags: --<flag1> and --<flag2> cannot be used together

Hint: Use only one of --<flag1> or --<flag2>.
```

Trigger: Mutually exclusive flag pairs are both provided:
- `--strict` and `--lenient`
- `--no-security` and `--no-conformance`

---

**PLUGIN_LOAD_ERROR** (Sprint 4)

```
Error: Failed to load plugin from '<path>'

  <error message>

Hint: Check that the plugin file exports a default object with the required fields:
      id, name, description, version, check
      See the plugin authoring guide: https://github.com/mcp-verify/mcp-verify/docs/plugins.md
```

Trigger: `import(pluginPath)` throws, or the loaded module does not export a valid Plugin object. Unlike most errors, this causes exit code 2 (not just a warning), because an invalid plugin in the config is likely unintentional and should be surfaced loudly.

---

**PLUGIN_RUNTIME_WARNING** (Sprint 4)

```
Warning: Plugin '<plugin-id>' failed: <error message>

  The plugin's check() function threw an unhandled exception.
  Findings from this plugin are excluded from the report.
```

Note: Plugin runtime failures produce a **warning**, not an error. The tool continues normally with remaining checks. Exit code is not affected by plugin failures.

---

*Document produced by API Designer (Tier 3 Engineer) for MCP Verify PDLC Project.*
*This specification covers Sprints 1–4 and constitutes the stable public API contract for the mcp-verify CLI tool.*
*Next phase: Implementation. Reference this document for CLI flag behavior, module interface contracts, and output schema expectations.*
