# MCP Verify — Requirements Document

**Document Version:** 1.0
**Author:** Business Analyst (Tier 3 Engineer)
**Date:** 2026-03-28
**Status:** Approved — Development Ready
**References:**
- `.pdlc/research/project-selection.md` — Project selection rationale and scoring
- `.pdlc/architecture/product-vision.md` — Product vision, features, personas, sprint roadmap
- MCP Specification: https://modelcontextprotocol.io
- JSON-RPC 2.0 Specification: https://www.jsonrpc.org/specification

---

## Table of Contents

1. [Functional Requirements](#1-functional-requirements)
   - 1.1 Core CLI (FR-001 – FR-010)
   - 1.2 MCP Protocol Client (FR-011 – FR-020)
   - 1.3 Spec Conformance Engine (FR-021 – FR-035)
   - 1.4 Security Check Engine (FR-036 – FR-045)
   - 1.5 Reporting (FR-046 – FR-055)
   - 1.6 CI Integration (FR-056 – FR-065)
   - 1.7 Web Dashboard (FR-066 – FR-075)
   - 1.8 Plugin System (FR-076 – FR-080)
2. [Non-Functional Requirements](#2-non-functional-requirements)
3. [User Stories](#3-user-stories)
4. [Sprint-Story Mapping](#4-sprint-story-mapping)
5. [Acceptance Criteria Matrix (P0 Features)](#5-acceptance-criteria-matrix-p0-features)
6. [Dependencies](#6-dependencies)

---

## 1. Functional Requirements

### Requirement Format

Each functional requirement follows the structure:
- **ID**: Unique identifier (FR-NNN)
- **Title**: Short descriptive title
- **Description**: Precise statement of required behavior
- **Priority**: P0 / P1 / P2 (aligned with product vision MoSCoW framework)
- **Sprint**: Target sprint for delivery
- **Acceptance Criteria**: Testable conditions for completion

---

### 1.1 Core CLI (FR-001 – FR-010)

#### FR-001 — Primary Verify Command

**Priority:** P0 | **Sprint:** 1

**Description:** The CLI must expose a `verify` command (and accept a bare invocation without a subcommand) that accepts a single positional `<target>` argument representing the MCP server URL or path. The tool must be invokable as `npx mcp-verify <target>` without prior installation.

**Acceptance Criteria:**
- `npx mcp-verify http://localhost:3000` executes the verify workflow against an HTTP target
- `npx mcp-verify stdio://./my-server.js` executes the verify workflow against a stdio target
- `npx mcp-verify verify http://localhost:3000` is also accepted as explicit subcommand form
- Missing `<target>` prints usage help and exits with code 2
- Invalid URL format prints a descriptive error and exits with code 2

---

#### FR-002 — Output Format Flag

**Priority:** P1 | **Sprint:** 3

**Description:** The CLI must accept a `--format` flag with values `terminal` (default), `json`, and `markdown`. The selected format controls all output written to stdout.

**Acceptance Criteria:**
- `--format terminal` produces color-coded human-readable output (default behavior)
- `--format json` produces only valid JSON to stdout with no decorative text
- `--format markdown` produces only Markdown to stdout with no decorative text
- Unrecognized format value prints an error listing valid values and exits with code 2
- `--format json` and `--format markdown` output is suitable for piping and redirection without corruption

---

#### FR-003 — Configuration File Flag

**Priority:** P1 | **Sprint:** 3

**Description:** The CLI must accept a `--config <path>` flag pointing to a JSON configuration file. If `--config` is not specified, the CLI must auto-discover `mcp-verify.json` or `.mcp-verify.json` in the current working directory.

**Acceptance Criteria:**
- `--config ./mcp-verify.json` loads the specified file; exits with code 2 if the file does not exist
- Auto-discovery checks `./mcp-verify.json` then `./.mcp-verify.json` in the current working directory
- If no config file is found and `--config` is not specified, the CLI runs with default settings
- Invalid JSON in the config file prints a descriptive error and exits with code 2
- Command-line flags override config file values when both are present

---

#### FR-004 — Version Flag

**Priority:** P0 | **Sprint:** 1

**Description:** The CLI must accept `--version` and `-V` flags that print the current tool version and the MCP spec version being validated against, then exit with code 0.

**Acceptance Criteria:**
- `mcp-verify --version` prints a line in the format `mcp-verify x.y.z (validates MCP spec 2024-11-05)`
- Output is written to stdout
- Exit code is 0

---

#### FR-005 — Help Flag

**Priority:** P0 | **Sprint:** 1

**Description:** The CLI must accept `--help` and `-h` flags that print structured usage documentation including all available commands, flags, and example invocations, then exit with code 0.

**Acceptance Criteria:**
- `mcp-verify --help` prints usage documentation to stdout
- Documentation lists all flags with their types, defaults, and descriptions
- At least three example invocations are shown
- Exit code is 0

---

#### FR-006 — Exit Code: All Checks Pass

**Priority:** P0 | **Sprint:** 1

**Description:** The CLI must exit with code `0` when all conformance and security checks pass, or when all findings are below the configured severity threshold.

**Acceptance Criteria:**
- Exit code is `0` when a known-conformant server is verified with no security findings
- Exit code is `0` when all security findings are at or below the configured `failOnSeverity` threshold
- Exit code is `0` when no conformance threshold is configured and all checks pass

---

#### FR-007 — Exit Code: Check Failures

**Priority:** P0 | **Sprint:** 1

**Description:** The CLI must exit with code `1` when one or more conformance checks fail in a way that exceeds the configured threshold, or when one or more security findings exceed the configured severity threshold.

**Acceptance Criteria:**
- Exit code is `1` when a security finding of severity `high` or above is detected and `failOnSeverity` is set to `high`
- Exit code is `1` when the conformance score falls below `conformanceThreshold`
- Exit code is `1` when `failOnSeverity` is not configured and any security finding exists (default behavior: fail on `critical` only)

---

#### FR-008 — Exit Code: Tool Error

**Priority:** P0 | **Sprint:** 1

**Description:** The CLI must exit with code `2` for all tool-internal errors: inability to connect to the target, invalid target format, internal exceptions, or configuration errors. Tool errors are distinct from check failures.

**Acceptance Criteria:**
- Exit code is `2` when the target server is unreachable after the configured timeout
- Exit code is `2` when the target URL is syntactically invalid
- Exit code is `2` when `--config` points to a non-existent or unparseable file
- Exit code is `2` for any unhandled internal exception
- A human-readable error message is printed to stderr (not stdout) for all exit code 2 cases

---

#### FR-009 — Strict and Lenient Mode Flags

**Priority:** P1 | **Sprint:** 3

**Description:** The CLI must accept `--strict` and `--lenient` flags that adjust the sensitivity of heuristic security checks. `--strict` increases sensitivity (lower false negative rate, potentially higher false positive rate). `--lenient` reduces sensitivity (lower false positive rate, potentially higher false negative rate). Default is balanced.

**Acceptance Criteria:**
- `--strict` causes heuristic checks (command injection susceptibility, tool poisoning) to apply more aggressive pattern matching
- `--lenient` causes heuristic checks to apply only high-confidence patterns
- Mode is reflected in JSON and Markdown output under `meta.checkMode`
- `--strict` and `--lenient` cannot be used simultaneously; CLI exits with code 2 if both are provided

---

#### FR-010 — Timeout Flag

**Priority:** P0 | **Sprint:** 1

**Description:** The CLI must accept a `--timeout <ms>` flag specifying the maximum milliseconds to wait for any single server response. Default is 10000 (10 seconds). The config file field `timeout` sets the same value.

**Acceptance Criteria:**
- `--timeout 5000` causes any server operation exceeding 5 seconds to be terminated
- Timeout termination produces a descriptive error message and exits with code 2
- Default timeout is 10000 ms when neither `--timeout` nor config `timeout` is specified
- `--timeout` accepts only positive integer values; non-integer or negative values exit with code 2

---

### 1.2 MCP Protocol Client (FR-011 – FR-020)

#### FR-011 — Transport Auto-Detection

**Priority:** P0 | **Sprint:** 1

**Description:** The protocol client must infer transport type from the target URL scheme. Targets prefixed with `http://` or `https://` use HTTP+SSE transport. Targets prefixed with `stdio://` use stdio transport. No explicit transport flag is required for these standard cases.

**Acceptance Criteria:**
- `http://localhost:3000` routes to HTTP+SSE transport implementation
- `https://example.com/mcp` routes to HTTP+SSE transport implementation
- `stdio://./my-server.js` routes to stdio transport implementation
- An unsupported URL scheme prints a descriptive error and exits with code 2
- Transport type used is recorded in the `meta.transport` field of all output formats

---

#### FR-012 — stdio Transport Connection

**Priority:** P0 | **Sprint:** 1

**Description:** The stdio transport must spawn the target process from the path specified after the `stdio://` prefix, connect to its stdin/stdout, and exchange line-delimited JSON-RPC 2.0 messages. The spawned process must be terminated cleanly when verification completes or times out.

**Acceptance Criteria:**
- `stdio://./my-server.js` spawns the Node.js process and connects via stdin/stdout pipes
- `stdio:///usr/local/bin/my-mcp-server` spawns an absolute-path binary
- Line-delimited JSON-RPC is correctly framed (newline after each complete message)
- Process is terminated (SIGTERM then SIGKILL after 2s) when verification completes
- Spawning failure (file not found, permission denied) exits with code 2 with a descriptive message

---

#### FR-013 — HTTP+SSE Transport Connection

**Priority:** P0 | **Sprint:** 1

**Description:** The HTTP+SSE transport must connect to the target endpoint, send JSON-RPC requests as HTTP POST requests, and receive responses either as direct HTTP responses or via a Server-Sent Events stream as per the MCP HTTP transport specification.

**Acceptance Criteria:**
- Establishes HTTP connection to the target URL
- Sends `initialize` request as HTTP POST with `Content-Type: application/json`
- Correctly handles SSE stream responses with `Content-Type: text/event-stream`
- Correctly handles direct JSON response bodies
- HTTP 4xx and 5xx responses are captured and reported with the status code in output
- Connection establishment failure (DNS resolution failure, TCP refused) exits with code 2

---

#### FR-014 — MCP Initialization Handshake

**Priority:** P0 | **Sprint:** 1

**Description:** The protocol client must execute the MCP initialization sequence: send an `initialize` request with valid `protocolVersion`, `capabilities`, and `clientInfo` fields; receive and validate the server's `initialize` response; and send the `initialized` notification.

**Acceptance Criteria:**
- Sends `initialize` request with `jsonrpc: "2.0"`, valid numeric `id`, `method: "initialize"`, and `params` containing `protocolVersion`, `capabilities`, and `clientInfo`
- Captures the full server response to `initialize` for conformance analysis
- Sends `initialized` notification (method without `id` field) after receiving `initialize` response
- Records whether the server responded before the configured timeout
- Records the server's declared `protocolVersion`, `serverInfo`, and `capabilities` in the result model

---

#### FR-015 — Tools Protocol Message Exchange

**Priority:** P0 | **Sprint:** 1

**Description:** After initialization, the protocol client must send a `tools/list` request to enumerate the server's declared tools, capturing the full response for conformance analysis. If the server declares `tools` capability, `tools/list` must be sent.

**Acceptance Criteria:**
- Sends `tools/list` request only if the server declared `tools` capability in the `initialize` response
- Captures the full `tools/list` response including the `tools` array
- Handles paginated `tools/list` responses with `nextCursor` by issuing follow-up requests
- Records absence of `tools` capability as an informational note (not a failure by default)

---

#### FR-016 — Resources Protocol Message Exchange

**Priority:** P0 | **Sprint:** 1

**Description:** The protocol client must send a `resources/list` request to enumerate the server's declared resources, and a `resources/read` request for one resource (if any are listed), capturing all responses for conformance analysis.

**Acceptance Criteria:**
- Sends `resources/list` request only if the server declared `resources` capability
- Captures the full `resources/list` response including the `resources` array
- Sends `resources/read` for the first listed resource, capturing the response
- Handles `resources/list` returning an empty array without error

---

#### FR-017 — Prompts Protocol Message Exchange

**Priority:** P0 | **Sprint:** 1

**Description:** The protocol client must send a `prompts/list` request to enumerate the server's declared prompts, capturing the response for conformance analysis.

**Acceptance Criteria:**
- Sends `prompts/list` request only if the server declared `prompts` capability
- Captures the full `prompts/list` response including the `prompts` array
- Handles `prompts/list` returning an empty array without error

---

#### FR-018 — Error Response Probing

**Priority:** P0 | **Sprint:** 1

**Description:** The protocol client must intentionally send a malformed JSON-RPC request and an unknown method call to the server to probe its error handling behavior. The responses are captured for conformance and security analysis.

**Acceptance Criteria:**
- Sends a request with a deliberately unknown `method` value (e.g., `mcp-verify/probe-unknown-method`)
- Sends a malformed JSON message (syntactically invalid JSON) via the transport
- Captures all error responses for analysis by the conformance engine
- Probing requests are clearly labeled in verbose/debug output so developers understand the intentional malformed messages

---

#### FR-019 — Connection Graceful Termination

**Priority:** P0 | **Sprint:** 1

**Description:** The protocol client must cleanly terminate connections to the MCP server after verification completes, whether the verification succeeded, failed with findings, or was interrupted by timeout.

**Acceptance Criteria:**
- HTTP connections are cleanly closed (connection released, no hanging sockets)
- stdio processes are terminated with SIGTERM; SIGKILL is sent if the process does not exit within 2 seconds
- All temporary resources (file handles, network sockets) are released before process exit
- Graceful termination occurs even when an internal exception is thrown during verification

---

#### FR-020 — Transport Override Flag

**Priority:** P1 | **Sprint:** 3

**Description:** The CLI must accept a `--transport <type>` flag (values: `http`, `stdio`) to force a specific transport type, overriding the auto-detection behavior based on URL scheme. This is also configurable via the `transport` field in the config file.

**Acceptance Criteria:**
- `--transport http` forces HTTP+SSE transport regardless of URL scheme
- `--transport stdio` forces stdio transport regardless of URL scheme
- Config file `transport` field provides the same override capability
- Invalid transport value prints an error listing valid values and exits with code 2

---

### 1.3 Spec Conformance Engine (FR-021 – FR-035)

#### FR-021 — JSON-RPC 2.0 Envelope Validation

**Priority:** P0 | **Sprint:** 1

**Description:** The conformance engine must validate that all server responses and notifications conform to the JSON-RPC 2.0 base envelope specification: presence and correct types of `jsonrpc`, `id`, `result`/`error` fields.

**Acceptance Criteria:**
- Flags absence of `jsonrpc: "2.0"` string field in any response as a conformance failure
- Flags `id` field of type other than string, number, or null in responses as a conformance failure
- Flags responses containing both `result` and `error` fields simultaneously as a conformance failure
- Flags responses containing neither `result` nor `error` fields as a conformance failure
- Flags `method` field of type other than string in requests as a conformance failure
- Each violation is recorded with the specific message that triggered it

---

#### FR-022 — JSON-RPC 2.0 Error Code Validation

**Priority:** P0 | **Sprint:** 1

**Description:** The conformance engine must validate that all JSON-RPC error responses use error codes within the valid ranges: standard codes -32700 to -32603, server-defined codes -32000 to -32099, or application-defined codes outside the reserved range.

**Acceptance Criteria:**
- Standard error codes in range -32700 to -32603 are accepted
- Server-defined error codes in range -32000 to -32099 are accepted
- Codes in the range -32100 to -32001 (reserved but undefined by spec) are flagged as a conformance warning
- Positive error codes or codes outside all defined ranges are flagged as a conformance failure
- The specific invalid code value is included in the finding description

---

#### FR-023 — MCP Initialization Request Conformance

**Priority:** P0 | **Sprint:** 1

**Description:** The conformance engine must validate the server's `initialize` response against the MCP specification: required fields `protocolVersion`, `capabilities`, `serverInfo`; correct types for each field; valid capability object structure.

**Acceptance Criteria:**
- Flags absence of `protocolVersion` field as a conformance failure
- Flags `protocolVersion` that is not a recognized string value as a conformance warning
- Flags absence of `capabilities` object as a conformance failure
- Flags `serverInfo` absence as a conformance warning (recommended but not strictly required)
- Flags `serverInfo` present but missing `name` field as a conformance failure
- Flags any capability field value that is not an object or boolean as a conformance failure

---

#### FR-024 — Capability Negotiation Correctness

**Priority:** P0 | **Sprint:** 1

**Description:** The conformance engine must validate that the server honors its declared capabilities: if `tools` capability is declared, the server must respond to `tools/list`; if `resources` capability is declared, the server must respond to `resources/list`; if `prompts` capability is declared, the server must respond to `prompts/list`.

**Acceptance Criteria:**
- Flags failure to respond to `tools/list` when `tools` capability was declared as a conformance failure
- Flags error response to `tools/list` when `tools` capability was declared as a conformance failure
- Flags failure to respond to `resources/list` when `resources` capability was declared as a conformance failure
- Flags failure to respond to `prompts/list` when `prompts` capability was declared as a conformance failure
- Does not flag missing `tools/list` response when `tools` capability was not declared

---

#### FR-025 — Tool Schema Structure Validation

**Priority:** P0 | **Sprint:** 1

**Description:** The conformance engine must validate the structure of each tool in the `tools/list` response: required `name` and `description` string fields, required `inputSchema` object conforming to JSON Schema draft-07.

**Acceptance Criteria:**
- Flags any tool missing the `name` field as a conformance failure
- Flags any tool with `name` that is not a non-empty string as a conformance failure
- Flags any tool missing the `description` field as a conformance failure
- Flags any tool missing the `inputSchema` field as a conformance failure
- Flags `inputSchema` that is not a valid JSON Schema draft-07 object as a conformance failure
- Records the tool `name` in each violation to identify which tool is non-conformant

---

#### FR-026 — Tool Schema Content Validation

**Priority:** P0 | **Sprint:** 1

**Description:** The conformance engine must validate that each tool's `inputSchema` is a well-formed JSON Schema draft-07 object: `type: "object"` at the top level, valid `properties` if present, valid `required` array if present, no unrecognized draft-07 keywords that would cause schema parsers to fail.

**Acceptance Criteria:**
- Flags `inputSchema` lacking `type: "object"` at the root level as a conformance warning
- Flags `properties` value that is not an object as a conformance failure
- Flags `required` value that is not an array of strings as a conformance failure
- Flags property definitions missing a `type` or `$ref` as a conformance warning
- Flags `additionalProperties: false` combined with a `required` field referencing non-existent properties as a conformance failure

---

#### FR-027 — Resource Protocol Conformance

**Priority:** P0 | **Sprint:** 1

**Description:** The conformance engine must validate that `resources/list` and `resources/read` responses conform to the MCP resource protocol specification.

**Acceptance Criteria:**
- Flags `resources/list` response missing the `resources` array as a conformance failure
- Flags any resource entry missing `uri` field as a conformance failure
- Flags any resource entry missing `name` field as a conformance failure
- Flags `uri` values that are not valid URI strings as a conformance failure
- Flags `resources/read` response missing the `contents` array as a conformance failure
- Flags `contents` entries missing both `text` and `blob` fields as a conformance failure

---

#### FR-028 — Prompt Protocol Conformance

**Priority:** P0 | **Sprint:** 1

**Description:** The conformance engine must validate that `prompts/list` responses conform to the MCP prompt protocol specification.

**Acceptance Criteria:**
- Flags `prompts/list` response missing the `prompts` array as a conformance failure
- Flags any prompt entry missing `name` field as a conformance failure
- Flags any prompt entry with `name` that is not a non-empty string as a conformance failure
- Flags any argument definition missing `name` field as a conformance failure
- Flags `required` argument field with a non-boolean value as a conformance failure

---

#### FR-029 — stdio Transport Protocol Conformance

**Priority:** P0 | **Sprint:** 1

**Description:** For stdio transport targets, the conformance engine must validate that all messages are properly line-delimited (one complete JSON-RPC message per line), that no extraneous non-JSON output appears on stdout before the server enters protocol mode, and that messages are correctly terminated with a newline character.

**Acceptance Criteria:**
- Flags any line that is not parseable as valid JSON as a conformance failure
- Flags multiple JSON objects on a single line as a conformance failure
- Flags extraneous non-JSON text output to stdout before the first JSON-RPC message as a conformance warning
- Flags JSON-RPC messages not terminated with `\n` as a conformance failure

---

#### FR-030 — HTTP+SSE Transport Protocol Conformance

**Priority:** P0 | **Sprint:** 1

**Description:** For HTTP+SSE transport targets, the conformance engine must validate that the server uses the correct `Content-Type: text/event-stream` header for SSE responses, that SSE messages use the `data:` prefix format, and that CORS headers are present and correctly configured.

**Acceptance Criteria:**
- Flags SSE endpoint responses missing `Content-Type: text/event-stream` as a conformance failure
- Flags SSE messages missing the `data:` field prefix as a conformance failure
- Flags SSE messages where the `data:` value is not valid JSON as a conformance failure
- Records presence or absence of CORS headers for security analysis use
- Flags HTTP endpoints that respond with 301/302 redirects to the direct MCP endpoint as a conformance warning (redirects may cause issues with SSE clients)

---

#### FR-031 — Error Handling Conformance

**Priority:** P0 | **Sprint:** 1

**Description:** Using the error probe responses captured by the protocol client (FR-018), the conformance engine must validate that the server returns well-formed JSON-RPC error responses for unknown methods and malformed requests.

**Acceptance Criteria:**
- Flags server non-response (timeout) to an unknown method probe as a conformance failure
- Flags server response to an unknown method probe that uses HTTP 200 with a `result` field instead of an `error` field as a conformance failure
- Flags error response to unknown method probe using error code other than -32601 (Method not found) as a conformance warning
- Flags server non-response to a malformed JSON message as a conformance warning
- Flags error response to malformed JSON not using error code -32700 (Parse error) as a conformance warning

---

#### FR-032 — Conformance Scoring Algorithm

**Priority:** P0 | **Sprint:** 1

**Description:** The conformance engine must compute a composite conformance score from 0 to 100 based on weighted category scores. The categories and default weights are: JSON-RPC Base (20%), Initialization (25%), Tools (25%), Resources (10%), Prompts (10%), Transport (10%). Category scores are 100 minus the penalty for each failure (failures deduct more than warnings).

**Acceptance Criteria:**
- Overall score is the weighted sum of all category scores, rounded to the nearest integer
- Each conformance failure in a category deducts a defined number of points from that category score (minimum category score is 0)
- Each conformance warning deducts half the points of a failure from the category score
- A server with no violations scores 100
- A server that fails the initialization handshake entirely scores 0
- Category scores are reported individually in all output formats
- Score calculation methodology is documented in the README

---

#### FR-033 — Spec Version Declaration

**Priority:** P0 | **Sprint:** 1

**Description:** All conformance checks must be tied to a declared MCP spec version. The tool must report which spec version it is validating against in all output formats. The validated spec version must be documented in the tool's CHANGELOG and version metadata.

**Acceptance Criteria:**
- `meta.specVersion` field in JSON output identifies the MCP spec version being validated (e.g., `"2024-11-05"`)
- `mcp-verify --version` includes the spec version string
- Each conformance rule internally references the spec section it enforces
- Rules targeting a specific spec version do not fire when the server declares an incompatible `protocolVersion`

---

#### FR-034 — Per-Check Confidence Levels

**Priority:** P1 | **Sprint:** 3

**Description:** Each conformance and security check must declare a confidence level: `deterministic` (check result is definitive based on observable protocol data) or `heuristic` (check result is probabilistic based on pattern matching). Heuristic findings must be labeled as such in all output formats.

**Acceptance Criteria:**
- Deterministic checks (JSON-RPC envelope validation, required field presence) are labeled `deterministic`
- Heuristic checks (command injection susceptibility, tool poisoning patterns) are labeled `heuristic`
- JSON output includes `confidence` field on each finding
- Terminal output visually distinguishes heuristic findings (e.g., prefix with `~` or label as `[heuristic]`)
- `--strict` mode expands the heuristic rule set; `--lenient` mode reduces it (per FR-009)

---

#### FR-035 — Unknown Method Graceful Handling

**Priority:** P0 | **Sprint:** 1

**Description:** The conformance engine must gracefully handle servers that return errors for protocol methods the server does not support (e.g., a server that supports only tools and returns errors for `resources/list`). These must be treated as informational unless the capability was declared.

**Acceptance Criteria:**
- Error response to `resources/list` when `resources` capability was NOT declared is recorded as informational only
- Error response to `tools/list` when `tools` capability was NOT declared is recorded as informational only
- The engine does not enter an error state when probing optional protocol areas

---

### 1.4 Security Check Engine (FR-036 – FR-045)

#### FR-036 — Command Injection Susceptibility Detection

**Priority:** P0 | **Sprint:** 2

**Description:** The security engine must analyze each tool's `inputSchema` for patterns that expose shell-executable string parameters without sanitization constraints. A susceptible tool is one that accepts unconstrained string inputs (no `pattern` restriction, no `enum` restriction, no `maxLength`) in a parameter whose name or description suggests it is used in subprocess or shell execution contexts.

**Acceptance Criteria:**
- Detects string-type parameters with names matching patterns: `command`, `cmd`, `exec`, `shell`, `script`, `args`, `argv`, `path`, `file`, `filename`, `dir`, `directory` without a `pattern` constraint
- Detects string-type parameters with descriptions containing substrings: "execute", "run", "command", "shell", "script", "path to" without sanitization constraints
- Reports finding with severity `High`, affected tool name, affected parameter name, and remediation text recommending `pattern` or `enum` constraints
- Does NOT flag string parameters that have a `pattern` constraint defined
- Does NOT flag string parameters that have an `enum` constraint defined
- Does NOT flag non-string parameter types (integer, boolean, array) for this check
- Finding is labeled `heuristic` confidence per FR-034

---

#### FR-037 — CORS Wildcard Policy Detection

**Priority:** P0 | **Sprint:** 2

**Description:** For HTTP+SSE transport targets, the security engine must inspect HTTP response headers for `Access-Control-Allow-Origin: *`, which permits cross-origin tool invocation from any web context.

**Acceptance Criteria:**
- Detects `Access-Control-Allow-Origin: *` on any HTTP response from the target server
- Reports finding with severity `High`, the specific endpoint URL where the header was observed, and remediation text recommending restriction to known origins
- Does NOT flag servers with specific origin allowlists (non-wildcard values)
- Does NOT flag stdio transport targets (CORS is not applicable)
- Finding is labeled `deterministic` confidence per FR-034

---

#### FR-038 — Authentication Gap Detection

**Priority:** P0 | **Sprint:** 2

**Description:** For HTTP+SSE transport targets, the security engine must detect absence of authentication mechanisms on MCP endpoints that are reachable over a non-loopback network interface. A server is considered to have an authentication gap if it responds to `initialize` without requiring any credentials and its host resolves to a non-loopback, non-private IP address.

**Acceptance Criteria:**
- Detects absence of `Authorization` header requirement on servers with non-loopback hosts (not `localhost`, `127.0.0.1`, `::1`, or RFC 1918 addresses)
- Detects absence of `WWW-Authenticate` header in server responses as a signal of no server-side auth challenge
- Reports finding with severity `Critical` for public-internet targets, `Medium` for private-network targets, with remediation text
- Does NOT flag `localhost` or loopback-address servers (development pattern is expected to be unauthenticated)
- Does NOT flag stdio transport targets (auth is not applicable)
- Finding is labeled `heuristic` confidence per FR-034

---

#### FR-039 — Tool Poisoning Pattern Detection

**Priority:** P0 | **Sprint:** 2

**Description:** The security engine must inspect tool `name` and `description` fields for patterns associated with prompt injection attacks: instructions designed to hijack model behavior embedded in tool metadata.

**Acceptance Criteria:**
- Detects tool descriptions containing instruction-formatted text matching patterns such as: `"IGNORE PREVIOUS"`, `"[SYSTEM]"`, `"<system>"`, `"DO NOT"` (in all-caps imperative), `"you must"`, `"you are now"`, or XML/HTML tags that appear to embed system-prompt instructions
- Detects tool descriptions that are suspiciously long (> 2000 characters) for a tool description field
- Detects tool names containing URL-encoded or Base64-encoded substrings
- Reports finding with severity `Critical` with the affected tool name, the matched pattern, and remediation text
- Does NOT flag legitimate tool descriptions that use imperative language in a clearly operational context (e.g., "Returns the current time")
- Finding is labeled `heuristic` confidence per FR-034

---

#### FR-040 — Information Leakage Detection

**Priority:** P0 | **Sprint:** 2

**Description:** Using the error probe responses captured by the protocol client (FR-018), the security engine must analyze error messages for patterns indicating verbose information disclosure: stack traces, internal file paths, environment variable names, system information.

**Acceptance Criteria:**
- Detects error messages containing stack trace patterns (e.g., lines matching `at Function.` or `at Object.<anonymous>` in Node.js stack trace format)
- Detects error messages containing absolute filesystem paths (e.g., strings matching `/home/`, `/var/`, `/usr/`, `C:\Users\`, `C:\Program Files\`)
- Detects error messages containing environment variable patterns (e.g., strings matching `process.env.`, `ENV[`, `$ENV_`, `export `)
- Reports finding with severity `Medium`, the specific pattern detected (redacted in output), and remediation text recommending generic error messages in production
- Does NOT flag errors that contain only the JSON-RPC error code and a short generic message
- Finding is labeled `deterministic` confidence per FR-034

---

#### FR-041 — Security Finding Data Model

**Priority:** P0 | **Sprint:** 2

**Description:** Each security finding must be represented as a structured data object with standardized fields used in all output formats.

**Acceptance Criteria:**
- Every security finding has: `id` (unique string, e.g., `SEC-001`), `checkId` (check identifier, e.g., `cors-wildcard`), `severity` (one of `critical`, `high`, `medium`, `low`), `cvssScore` (CVSS-adjacent 0.0-10.0 numeric score), `component` (affected component, e.g., tool name or endpoint path), `description` (human-readable explanation), `remediation` (actionable remediation text), `confidence` (`deterministic` or `heuristic`)
- JSON output includes all fields
- Terminal output includes severity, check ID, component, description, and remediation
- Markdown output includes all fields in a structured table

---

#### FR-042 — Security Check Suppression

**Priority:** P1 | **Sprint:** 3

**Description:** The configuration file must support suppression of specific security checks by `checkId`, with a required `justification` field documenting the reason for suppression. Suppressed findings must still appear in output but marked as suppressed, not omitted.

**Acceptance Criteria:**
- Config `skip` array accepts `checkId` strings (e.g., `["cors-wildcard"]`)
- Suppressed findings appear in JSON output with `suppressed: true` and the `justification` text
- Suppressed findings are visually distinct in terminal output (e.g., struck-through or labeled `[SUPPRESSED]`)
- Suppressed findings do NOT count toward the exit code determination
- Missing `justification` for a suppression entry prints a warning but does not block execution

---

#### FR-043 — Severity Threshold Configuration

**Priority:** P1 | **Sprint:** 3

**Description:** The CLI and config file must support a `failOnSeverity` setting that defines the minimum severity level at which a security finding causes an exit code 1. Severity levels in ascending order: `none`, `low`, `medium`, `high`, `critical`.

**Acceptance Criteria:**
- `failOnSeverity: "critical"` causes exit code 1 only for `critical` findings
- `failOnSeverity: "high"` causes exit code 1 for `critical` and `high` findings
- `failOnSeverity: "medium"` causes exit code 1 for `critical`, `high`, and `medium` findings
- `failOnSeverity: "none"` causes exit code 1 for any finding regardless of severity
- Default value when not configured is `"critical"` (only critical findings block)
- The effective threshold is recorded in `meta.thresholds.failOnSeverity` in JSON output

---

#### FR-044 — CVSS-Adjacent Scoring

**Priority:** P0 | **Sprint:** 2

**Description:** Each security check must assign a documented CVSS-adjacent numeric score (0.0–10.0) based on the attack vector, impact, and exploitability characteristics of the vulnerability. The scoring rubric must be documented.

**Acceptance Criteria:**
- Command injection susceptibility: base score 8.1 (AV:Network, AC:Low, PR:None, UI:None, Scope:Changed)
- CORS wildcard: base score 7.5 (AV:Network, AC:Low, PR:None, UI:Required)
- Authentication gap (public): base score 9.8; authentication gap (private network): base score 6.5
- Tool poisoning: base score 8.8 (AV:Network, AC:Low, PR:Low, UI:None)
- Information leakage: base score 5.3 (AV:Network, AC:Low, PR:None, UI:None, Scope:Unchanged)
- CVSS score is included in `cvssScore` field of all finding objects

---

#### FR-045 — Security Check Test Fixtures

**Priority:** P0 | **Sprint:** 2

**Description:** The project must include a test fixture server for each of the five security check categories: one known-vulnerable fixture demonstrating the vulnerability, and one known-clean fixture confirming absence of false positives.

**Acceptance Criteria:**
- `test/fixtures/vulnerable/command-injection-server.ts` — tool with unconstrained string `command` parameter
- `test/fixtures/vulnerable/cors-wildcard-server.ts` — HTTP server returning `Access-Control-Allow-Origin: *`
- `test/fixtures/vulnerable/missing-auth-server.ts` — HTTP server on a simulated non-local address with no auth
- `test/fixtures/vulnerable/tool-poisoning-server.ts` — tool with prompt-injection patterns in description
- `test/fixtures/vulnerable/info-leakage-server.ts` — server returning stack traces in error responses
- Corresponding `test/fixtures/clean/` variants that do not trigger any findings
- All fixtures are valid MCP servers that complete the initialization handshake successfully

---

### 1.5 Reporting (FR-046 – FR-055)

#### FR-046 — Terminal Reporter: Color-Coded Output

**Priority:** P0 | **Sprint:** 1

**Description:** The terminal reporter must produce human-readable output with color coding: green for passing checks, yellow for warnings, red for failures and security findings. Color output must be automatically disabled when stdout is not a TTY (e.g., when piping output).

**Acceptance Criteria:**
- Green color is used for: passed checks, scores >= 80, no security findings
- Yellow color is used for: warnings, scores 50-79, `low` severity findings
- Red color is used for: failures, scores < 50, `medium`/`high`/`critical` findings
- Color output is disabled when `NO_COLOR` environment variable is set (per no-color.org standard)
- Color output is disabled when stdout is not a TTY
- `--no-color` flag explicitly disables color output

---

#### FR-047 — Terminal Reporter: Summary Block

**Priority:** P0 | **Sprint:** 1

**Description:** The terminal reporter must produce a summary block at the top of output containing: target URL, transport type, tool version, timestamp, overall conformance score, security finding count by severity, and overall pass/fail status.

**Acceptance Criteria:**
- Summary block is the first section printed to stdout
- Includes: target, transport, `mcp-verify` version, spec version, ISO 8601 timestamp, overall conformance score (0-100)
- Includes: count of findings by severity (Critical: N, High: N, Medium: N, Low: N)
- Includes: single-line PASS or FAIL verdict based on configured thresholds
- Total execution duration is displayed in the summary block

---

#### FR-048 — Terminal Reporter: Category Score Breakdown

**Priority:** P0 | **Sprint:** 1

**Description:** The terminal reporter must display individual conformance scores for each category (JSON-RPC Base, Initialization, Tools, Resources, Prompts, Transport) after the summary block, followed by the list of all conformance violations and security findings.

**Acceptance Criteria:**
- Each category is shown with its name, score (0-100), and a short text status
- Category scores are visually distinguished from the overall score
- Violations within each category are listed indented beneath the category header
- Each violation includes: severity/level, description, and the specific message or field that triggered it

---

#### FR-049 — JSON Report Format

**Priority:** P1 | **Sprint:** 3

**Description:** The JSON reporter must produce a single valid JSON document to stdout conforming to the versioned MCP Verify report schema. The schema version must be included in the output.

**Acceptance Criteria:**
- Output is a single valid JSON object (parseable with `JSON.parse`)
- Root-level `schemaVersion` field identifies the report schema version (e.g., `"1.0"`)
- `meta` object contains: `toolVersion`, `specVersion`, `timestamp` (ISO 8601), `target`, `transport`, `duration` (ms), `checkMode`, `thresholds`
- `conformance` object contains: `score` (0-100), `breakdown` (object with per-category scores), `violations` (array of violation objects)
- `security` object contains: `findings` (array of finding objects per FR-041), `suppressed` (array of suppressed finding objects)
- `summary` object contains: `pass` (boolean), `blockerCount` (object with counts per severity level)
- No non-JSON text, ANSI codes, or decorative output is written to stdout in JSON mode
- Tool execution logs and errors are written to stderr, not stdout, in JSON mode

---

#### FR-050 — JSON Report Schema Versioning

**Priority:** P1 | **Sprint:** 3

**Description:** The JSON report schema must be formally versioned and documented. Schema changes that add optional fields are minor-version bumps; schema changes that remove or rename fields are major-version bumps requiring a new `schemaVersion`.

**Acceptance Criteria:**
- Schema is documented in `docs/report-schema.json` as a JSON Schema file
- `schemaVersion` field in all reports matches the documented schema version
- Example valid report is provided in `docs/examples/report-example.json`
- Breaking schema changes increment the major version in `schemaVersion`

---

#### FR-051 — Markdown Report Format

**Priority:** P1 | **Sprint:** 3

**Description:** The Markdown reporter must produce a human-readable Markdown document suitable for storage in audit trails, Confluence pages, and GitHub PR comments. The document must be self-contained with no external dependencies.

**Acceptance Criteria:**
- Output is valid GitHub-Flavored Markdown (GFM)
- Document begins with a heading `# MCP Verify Report` followed by metadata table (target, timestamp, version, spec version)
- Includes a summary table with overall score and finding counts by severity
- Includes a `## Conformance Score` section with per-category scores in a Markdown table
- Includes a `## Security Findings` section with one sub-section per finding (severity, CVSS, component, description, remediation)
- Includes a `## Conformance Violations` section listing all violations grouped by category
- Includes a footer with tool version, spec version, and timestamp
- Suppressed findings are included in a separate `## Suppressed Findings` section

---

#### FR-052 — Scoring System: Overall Score

**Priority:** P0 | **Sprint:** 1

**Description:** The overall conformance score (0-100) is computed as a weighted average of category scores per FR-032. The score must be reproducible: the same server in the same state always produces the same score.

**Acceptance Criteria:**
- Score is deterministic for a given server state and spec version
- Score is an integer in the range 0-100 (never negative, never above 100)
- Score is recomputed independently of historical runs (no smoothing or averaging across runs)
- Score of 100 is achievable only when all violations are zero across all categories

---

#### FR-053 — Conformance Threshold Configuration

**Priority:** P1 | **Sprint:** 3

**Description:** The CLI and config file must support a `conformanceThreshold` setting (integer 0-100) that causes exit code 1 when the overall conformance score falls below the threshold.

**Acceptance Criteria:**
- `conformanceThreshold: 80` causes exit code 1 when score < 80
- `conformanceThreshold: 0` (default) never triggers on score alone
- Combined with `failOnSeverity`, either threshold being exceeded causes exit code 1
- The effective threshold is recorded in `meta.thresholds.conformanceThreshold` in JSON output

---

#### FR-054 — Verbose Mode

**Priority:** P1 | **Sprint:** 3

**Description:** The CLI must accept a `--verbose` flag that includes additional diagnostic information in terminal output: raw JSON-RPC messages exchanged with the server (redacted of sensitive values), timing breakdowns per check, and internal state transitions.

**Acceptance Criteria:**
- `--verbose` enables extended output mode
- Raw JSON-RPC request and response messages are printed to stderr (not stdout) in verbose mode
- Per-check timing is shown in verbose mode
- Sensitive field values in tool schemas (e.g., string defaults that look like credentials) are redacted as `[REDACTED]` in verbose output
- Verbose mode does not affect `--format json` or `--format markdown` stdout output

---

#### FR-055 — Output File Flag

**Priority:** P1 | **Sprint:** 3

**Description:** The CLI must accept an `--output <path>` flag that writes the report to a file instead of stdout. When `--output` is specified, the terminal summary is still printed to stdout, but the full report (in the format specified by `--format`) is written to the file.

**Acceptance Criteria:**
- `--output ./report.json --format json` writes JSON report to `./report.json`
- `--output ./report.md --format markdown` writes Markdown report to `./report.md`
- Terminal summary is still printed to stdout when `--output` is used
- File write errors (permission denied, invalid path) print an error to stderr and exit with code 2
- If the output file already exists, it is overwritten without prompting

---

### 1.6 CI Integration (FR-056 – FR-065)

#### FR-056 — GitHub Action: action.yml Definition

**Priority:** P1 | **Sprint:** 3

**Description:** The project must include an `action.yml` file at the repository root that defines a GitHub Action compatible with `uses: mcp-verify/action@v1`. The action must wrap the CLI and expose inputs for all major configuration options.

**Acceptance Criteria:**
- `action.yml` defines `name: MCP Verify`, `description`, and `author` fields
- Defined inputs: `target` (required), `fail-on-severity` (optional, default `critical`), `conformance-threshold` (optional, default `0`), `format` (optional, default `terminal`), `config` (optional), `timeout` (optional, default `10000`)
- Defined outputs: `conformance-score` (integer), `security-findings-count` (integer), `pass` (boolean string)
- Action uses Node.js 20 runtime (`runs.using: node20`)
- Action is compatible with both `ubuntu-latest`, `macos-latest`, and `windows-latest` GitHub-hosted runners

---

#### FR-057 — GitHub Action: PR Status Check

**Priority:** P1 | **Sprint:** 3

**Description:** When run in a GitHub Actions pull request context, the action must set a PR status check that marks the PR as passing or failing based on the exit code of the CLI. This occurs automatically through standard GitHub Actions exit code behavior.

**Acceptance Criteria:**
- CLI exit code 0 results in a green check on the PR
- CLI exit code 1 results in a red X (blocking) status on the PR when the action `continue-on-error` is not set
- CLI exit code 2 results in a red X status on the PR
- The action name appears as the status check name in the PR interface

---

#### FR-058 — GitHub Action: PR Comment Report

**Priority:** P1 | **Sprint:** 3

**Description:** When run in a pull request context with `GITHUB_TOKEN` permissions, the action must post a Markdown summary report as a PR comment after verification completes.

**Acceptance Criteria:**
- Posts a PR comment containing the Markdown report (per FR-051 format)
- Comment is posted using the `GITHUB_TOKEN` environment variable (standard GitHub Actions token)
- If a previous mcp-verify comment exists on the PR (identifiable by a unique header marker), the action updates the existing comment instead of posting a new one
- If `GITHUB_TOKEN` is not available or has insufficient permissions, the action logs a warning and continues (does not fail on comment posting failure)
- Comment posting is skipped when `GITHUB_EVENT_NAME` is not `pull_request` or `pull_request_target`

---

#### FR-059 — GitHub Action: Matrix Build Support

**Priority:** P1 | **Sprint:** 3

**Description:** The GitHub Action must support matrix build configurations that allow testing the same MCP server target against multiple configurations or verifying multiple server targets in parallel.

**Acceptance Criteria:**
- Action works correctly when called within a `strategy.matrix` GitHub Actions block
- Multiple action instances can run concurrently without file conflicts
- Output artifacts (if written to `--output`) use unique filenames when matrix variables are used (documented in README)

---

#### FR-060 — GitHub Action: SARIF Output (Optional)

**Priority:** P2 | **Sprint:** 4

**Description:** The action must optionally produce a SARIF (Static Analysis Results Interchange Format) output file that can be uploaded to GitHub Code Scanning, enabling security findings to appear in the Security tab of the repository.

**Acceptance Criteria:**
- When `format: sarif` is specified, a SARIF 2.1.0 compliant file is produced
- SARIF file can be uploaded via `github/codeql-action/upload-sarif@v2` without modification
- Each security finding maps to a SARIF `result` with `ruleId`, `message`, `locations` (using tool name as location), and `level` (error/warning/note based on severity)

---

#### FR-061 — CI Threshold Configuration File Integration

**Priority:** P1 | **Sprint:** 3

**Description:** When a `mcp-verify.json` or `.mcp-verify.json` file exists in the repository root, the GitHub Action must automatically use it for threshold configuration, eliminating the need to duplicate settings between the config file and the `action.yml` input parameters.

**Acceptance Criteria:**
- Action auto-discovers `mcp-verify.json` or `.mcp-verify.json` in `$GITHUB_WORKSPACE`
- Config file settings are used as defaults; action input parameters override config file values when both are specified
- Missing config file does not cause the action to fail (defaults are used)

---

#### FR-062 — CI Pipeline Documentation

**Priority:** P1 | **Sprint:** 3

**Description:** The project must provide ready-to-use example workflow files for GitHub Actions, GitLab CI, and CircleCI that developers can copy into their own repositories with minimal modification.

**Acceptance Criteria:**
- `docs/examples/github-actions.yml` — complete GitHub Actions workflow using `mcp-verify/action@v1`
- `docs/examples/gitlab-ci.yml` — complete GitLab CI job using `npx mcp-verify`
- `docs/examples/circleci.yml` — complete CircleCI job using `npx mcp-verify`
- Each example includes inline comments explaining key configuration choices
- Examples are tested (not just documented) against the reference MCP server fixture

---

#### FR-063 — npx Cold Start Performance

**Priority:** P0 | **Sprint:** 1

**Description:** The `npx mcp-verify` cold start (first-time download + start without prior cache) must complete in under 5 seconds on a typical broadband connection. This requires the npm package to be under 5MB unpacked and have minimal dependency trees.

**Acceptance Criteria:**
- `npx mcp-verify --version` completes in < 5 seconds measured from command invocation on a clean npm cache
- Package unpacked size is < 5MB (enforced with `size-limit` in CI)
- Zero npm peer dependency warnings on Node.js 18, 20, and 22
- No post-install scripts that add startup latency

---

#### FR-064 — Cross-Platform Compatibility

**Priority:** P0 | **Sprint:** 1

**Description:** The CLI must function correctly on Linux (x64, arm64), macOS (x64, arm64), and Windows (x64). All file path handling must use platform-appropriate separators and encoding.

**Acceptance Criteria:**
- CI matrix tests run on `ubuntu-latest`, `macos-latest`, and `windows-latest`
- stdio transport correctly spawns processes on all three platforms using appropriate shell resolution
- Configuration file path discovery handles both `/` and `\` path separators
- Exit codes are consistent across all platforms (Node.js standard ensures this but must be tested)
- No platform-specific npm dependencies are used (no native addons)

---

#### FR-065 — Node.js LTS Version Compatibility

**Priority:** P0 | **Sprint:** 1

**Description:** The CLI must function correctly on Node.js 18 LTS, 20 LTS, and 22 LTS. The `engines` field in `package.json` must declare the supported version range.

**Acceptance Criteria:**
- CI matrix tests run against Node.js 18.x, 20.x, and 22.x
- `package.json` declares `"engines": {"node": ">=18.0.0"}`
- No Node.js APIs used that are unavailable in Node.js 18
- All tests pass on Node.js 18, 20, and 22 without version-specific code paths

---

### 1.7 Web Dashboard (FR-066 – FR-075)

#### FR-066 — Dashboard Serve Command

**Priority:** P2 | **Sprint:** 4

**Description:** The CLI must expose a `serve` subcommand (`npx mcp-verify serve`) that starts a local HTTP server and opens (or prints) the URL for the web dashboard. The server runs until the user terminates it with Ctrl+C.

**Acceptance Criteria:**
- `npx mcp-verify serve` starts a local HTTP server, defaulting to `http://localhost:4000`
- `--port <number>` flag overrides the default port
- Prints the dashboard URL to stdout on startup
- Gracefully handles port-in-use errors with a descriptive message suggesting `--port`
- SIGINT (Ctrl+C) terminates the server cleanly

---

#### FR-067 — Run History Storage

**Priority:** P2 | **Sprint:** 4

**Description:** After each successful verification run, the CLI must append a timestamped result record to a local history file in `~/.mcp-verify/history/`. Results are stored as newline-delimited JSON (one JSON object per line) in files named by the URL-encoded target hostname.

**Acceptance Criteria:**
- `~/.mcp-verify/history/` directory is created on first run if it does not exist
- Each run appends one JSON line to `~/.mcp-verify/history/<encoded-hostname>.jsonl`
- Stored record includes: `timestamp` (ISO 8601), `target`, `conformanceScore`, `securityFindingsCount`, `breakdown` (per-category scores), `toolVersion`, `specVersion`
- History storage is skipped (with a debug log) if `~/.mcp-verify/` is not writable
- `--no-history` flag disables history storage for a single run

---

#### FR-068 — Historical Score Charts

**Priority:** P2 | **Sprint:** 4

**Description:** The web dashboard must display historical conformance score charts for each tracked server endpoint, showing score over time as a line chart. At least the last 100 runs per server must be displayable.

**Acceptance Criteria:**
- Dashboard homepage lists all tracked servers (distinct target hostnames with stored history)
- Clicking a server shows a time-series line chart of overall conformance score (y-axis 0-100, x-axis time)
- Individual category scores (Initialization, Tools, Resources, Prompts, Transport) are shown as toggle-able overlay lines
- Chart renders correctly for servers with as few as 1 run and as many as 100+ runs
- Dashboard is served from local files with no external CDN dependencies (all assets bundled)

---

#### FR-069 — Security Findings Trend View

**Priority:** P2 | **Sprint:** 4

**Description:** The web dashboard must display a trend view of security findings over time per server, showing finding count by severity across historical runs.

**Acceptance Criteria:**
- Finding trend chart shows stacked bars per run: Critical (red), High (orange), Medium (yellow), Low (blue)
- Runs with zero findings are shown as empty bars (not omitted from the chart)
- Clicking a bar opens a detail panel showing the specific findings from that run

---

#### FR-070 — Score Regression Detection

**Priority:** P2 | **Sprint:** 4

**Description:** The dashboard must highlight runs where the conformance score decreased from the previous run by more than a configurable threshold (default 5 points), visually marking regression runs.

**Acceptance Criteria:**
- Regression runs are marked with a visual indicator on the chart (e.g., red dot or triangle marker)
- Hovering over a regression marker shows the score delta (e.g., "Score dropped 12 points from 91 to 79")
- CLI flag `--compare-last` prints a regression summary in terminal output when a score decrease is detected

---

#### FR-071 — Multi-Server Portfolio View

**Priority:** P2 | **Sprint:** 4

**Description:** The web dashboard homepage must show a portfolio overview of all tracked servers with their most recent conformance score, most recent security finding count, and trend direction (improving/stable/degrading).

**Acceptance Criteria:**
- Portfolio table shows: server URL, most recent score, most recent finding count, trend direction (arrow icon), last run timestamp
- Table is sortable by score, finding count, and last run time
- Servers with no runs in the last 30 days are visually de-emphasized

---

#### FR-072 — Compare Last Flag (CLI)

**Priority:** P2 | **Sprint:** 4

**Description:** The CLI must accept a `--compare-last` flag that, after the standard verification run, loads the previous run's results from history and prints a regression summary showing score changes and new/resolved findings.

**Acceptance Criteria:**
- `--compare-last` outputs a comparison section below the standard report
- Comparison shows: previous score vs current score, score delta, new findings (in current but not previous run), resolved findings (in previous but not current run)
- `--compare-last` with no history for the target prints "No previous run found for this target" and continues normally
- Comparison data is included in JSON output under `comparison` key when `--compare-last` is used with `--format json`

---

#### FR-073 — Baseline Command

**Priority:** P2 | **Sprint:** 4

**Description:** The CLI must expose a `baseline` subcommand that pins the current run results as the "known-good baseline" for a target. Future `--compare-last` runs compare against the baseline rather than the immediately previous run.

**Acceptance Criteria:**
- `npx mcp-verify baseline http://localhost:3000` runs verification and stores result as baseline
- `npx mcp-verify baseline --existing http://localhost:3000` stores the most recent history entry as baseline without re-running verification
- Baseline is stored in `~/.mcp-verify/baselines/<encoded-hostname>.json`
- When a baseline exists, `--compare-last` compares against baseline by default; `--compare-previous` compares against the immediately previous run

---

#### FR-074 — History JSON Export

**Priority:** P2 | **Sprint:** 4

**Description:** The CLI must expose a `history export` subcommand that exports the full history for a target (or all targets) as a single JSON file suitable for SIEM ingestion.

**Acceptance Criteria:**
- `npx mcp-verify history export http://localhost:3000 --output history.json` exports all history for the target
- `npx mcp-verify history export --all --output all-history.json` exports history for all tracked targets
- Exported JSON is an array of run objects matching the stored history record schema
- Export file includes a `exportedAt` timestamp and `toolVersion` field at the root

---

#### FR-075 — No External Telemetry from Dashboard

**Priority:** P0 | **Sprint:** 4

**Description:** The web dashboard must make no outbound network requests to any external host. All assets (JavaScript, CSS, fonts) must be bundled locally. No analytics, CDN fonts, or external API calls are permitted.

**Acceptance Criteria:**
- Content Security Policy header on dashboard responses includes `default-src 'self'`
- No `<script src="">` or `<link href="">` tags pointing to external domains
- Browser network inspector shows zero requests to external hosts when using the dashboard
- No telemetry, error reporting, or usage tracking is included in the dashboard

---

### 1.8 Plugin System (FR-076 – FR-080)

#### FR-076 — Plugin Configuration Format

**Priority:** P2 | **Sprint:** 4

**Description:** The CLI must support a JavaScript configuration file (`mcp-verify.config.js` or `mcp-verify.config.mjs`) that exports a default object with a `plugins` array of plugin module paths or npm package names, and a `rules` object for per-plugin configuration.

**Acceptance Criteria:**
- `mcp-verify.config.js` with `export default { plugins: ['./rules/my-check.js'] }` is loaded automatically
- `mcp-verify.config.mjs` (ESM) and `mcp-verify.config.cjs` (CommonJS) are both supported
- Plugin paths are resolved relative to the config file's directory
- npm package names in the `plugins` array are resolved from `node_modules`
- Config file loading errors (syntax errors, missing exports) print a descriptive error and exit with code 2

---

#### FR-077 — Plugin API Contract

**Priority:** P2 | **Sprint:** 4

**Description:** Each plugin module must export a default object conforming to the MCP Verify Plugin API contract, specifying the plugin's `id`, `name`, `description`, `version`, and a `check` async function that receives the verification context and returns an array of findings.

**Acceptance Criteria:**
- Required plugin export fields: `id` (unique string), `name` (string), `description` (string), `version` (semver string), `check` (async function)
- `check` function receives a `context` object with: `target` (string), `transport` (string), `initializeResponse` (object), `toolsList` (array), `resourcesList` (array), `promptsList` (array), `errorProbeResponses` (array), `config` (plugin-specific config from `rules` object)
- `check` function returns a `Promise<Finding[]>` where `Finding` matches the security finding data model (FR-041)
- Plugin API types are exported from the main package as `import type { PluginContext, Finding } from 'mcp-verify'`
- Invalid plugin export structure (missing required fields) prints a warning and skips the plugin without failing

---

#### FR-078 — Plugin Finding Integration

**Priority:** P2 | **Sprint:** 4

**Description:** Findings returned by plugins must be integrated into the standard reporting pipeline exactly as if they were built-in security findings, appearing in all output formats and contributing to exit code determination.

**Acceptance Criteria:**
- Plugin findings appear in JSON output within `security.findings` array, with `source: "plugin"` and `pluginId` fields added
- Plugin findings appear in terminal output in the Security Findings section, labeled with the plugin name
- Plugin findings contribute to exit code determination using the same `failOnSeverity` threshold as built-in findings
- Plugin findings can be suppressed using the `skip` config array with the finding's `checkId`

---

#### FR-079 — Reference Plugin Examples

**Priority:** P2 | **Sprint:** 4

**Description:** The project must include two reference plugin implementations that demonstrate the plugin API and serve as community templates.

**Acceptance Criteria:**
- `examples/plugins/custom-auth-check/` — plugin that checks for a custom authentication header specific to an organization's internal MCP deployment
- `examples/plugins/rate-limit-check/` — plugin that probes for rate limiting behavior by sending multiple rapid requests
- Both examples include a `README.md`, `package.json`, and complete TypeScript source
- Both examples are tested in the project's CI pipeline

---

#### FR-080 — Plugin Isolation

**Priority:** P2 | **Sprint:** 4

**Description:** Plugin execution must be isolated from the core tool's error handling. An unhandled exception or rejected promise in a plugin's `check` function must not crash the tool; instead, the plugin's findings are omitted and a warning is printed.

**Acceptance Criteria:**
- Unhandled exception in a plugin's `check` function prints a warning: `Plugin <id> failed with error: <message>` to stderr
- Tool continues execution with remaining plugins and built-in checks after a plugin failure
- Plugin timeout: if `check` does not resolve within 30 seconds, the plugin is treated as failed
- Plugin failure does not affect the exit code (the tool exits as if the plugin returned no findings)

---

## 2. Non-Functional Requirements

### NFR Format

Each non-functional requirement specifies the quality attribute, measurable target, and verification method.

---

### 2.1 Performance

#### NFR-001 — End-to-End Execution Time

**Attribute:** Performance
**Target:** p95 execution time < 10 seconds for any typical MCP server on a local or LAN connection
**Verification:** Benchmark test suite measuring execution time across 10 reference servers; CI enforces < 10s limit with a timeout wrapper
**Notes:** "Typical" is defined as a server with 1-20 tools, 0-10 resources, and 0-5 prompts. Remote servers over the public internet may exceed this due to network latency.

---

#### NFR-002 — npx Cold Start Time

**Attribute:** Performance
**Target:** `npx mcp-verify --version` completes in < 5 seconds on a 50 Mbps connection with no prior npm cache
**Verification:** Measured in CI using a fresh Docker container with npm cache cleared before timing; recorded as a CI artifact
**Notes:** Requires package size < 5MB and minimal dependency tree to achieve. Enforced via `size-limit` package in build pipeline.

---

#### NFR-003 — Package Size

**Attribute:** Performance / Distribution
**Target:** npm package unpacked size < 5MB
**Verification:** `size-limit` package configured in `package.json` and run in CI; build fails if limit is exceeded
**Notes:** All runtime dependencies are bundled into the distributable using tsup/esbuild to minimize dependency footprint and install time.

---

#### NFR-004 — Memory Usage

**Attribute:** Performance
**Target:** Peak memory usage < 128MB during a standard verification run
**Verification:** Measured using Node.js `--max-old-space-size` constraint in test environment; tool must not OOM under normal conditions
**Notes:** Large tool schemas (100+ tools with complex JSON Schema) should not cause unbounded memory growth.

---

### 2.2 Reliability

#### NFR-005 — Graceful Failure on Unreachable Server

**Attribute:** Reliability
**Target:** CLI exits with code 2 and a human-readable error message within `timeout + 2s` when the target server is unreachable, never hanging indefinitely
**Verification:** Test fixture that simulates a non-responsive server; verified that the process terminates within the expected window

---

#### NFR-006 — Timeout Handling

**Attribute:** Reliability
**Target:** Every network I/O operation is subject to the configured timeout; no operation can block indefinitely
**Verification:** Unit tests using mock servers that delay responses beyond timeout; verified exit code and error message

---

#### NFR-007 — Partial Result Handling

**Attribute:** Reliability
**Target:** If a server completes the initialization handshake but fails to respond to subsequent protocol probes, the tool reports a partial conformance score (not zero) based on the checks that did complete
**Verification:** Test fixture that responds to `initialize` but times out on `tools/list`; verified that score reflects only the completed checks

---

#### NFR-008 — Idempotency

**Attribute:** Reliability
**Target:** Running `mcp-verify` multiple times against the same server in the same state produces identical scores and findings
**Verification:** Test suite runs the tool 3 times against the same fixture and asserts identical JSON output

---

### 2.3 Security

#### NFR-009 — No Default Telemetry

**Attribute:** Security / Privacy
**Target:** The tool makes no outbound network calls to any host other than the specified `<target>` during a verification run, by default
**Verification:** Network call interception in test suite asserting no unexpected outbound connections; code review of all HTTP client usage

---

#### NFR-010 — No Credential Storage

**Attribute:** Security / Privacy
**Target:** The tool never stores credentials, API keys, or authentication tokens in the history files, config files, or any output
**Verification:** Code review; automated scan of all file-write operations asserting no credential patterns are persisted

---

#### NFR-011 — Opt-In Telemetry Only

**Attribute:** Security / Privacy
**Target:** If any usage telemetry is implemented in future versions, it must be opt-in, clearly documented, and never include server URLs, tool schemas, or finding details
**Verification:** Documentation review; `--no-telemetry` flag available even before telemetry is implemented (no-op)

---

#### NFR-012 — No Execution of Server Code

**Attribute:** Security
**Target:** For HTTP+SSE targets, the tool never executes JavaScript or arbitrary code from server responses. For stdio targets, the tool only spawns the path explicitly provided by the user
**Verification:** Code review of transport implementations; no `eval()` or dynamic code execution in response handling

---

#### NFR-013 — Dependency Security

**Attribute:** Security
**Target:** All runtime dependencies must have no known Critical or High CVEs at time of release, as verified by `npm audit`
**Verification:** `npm audit --audit-level=high` run in CI; build fails on any High or Critical finding

---

### 2.4 Compatibility

#### NFR-014 — Node.js LTS Compatibility

**Attribute:** Compatibility
**Target:** Full functionality on Node.js 18.x LTS, 20.x LTS, and 22.x LTS
**Verification:** CI matrix tests all three versions; `package.json` engines field declares `>=18.0.0`

---

#### NFR-015 — Cross-Platform Support

**Attribute:** Compatibility
**Target:** Full functionality on Linux (x64), macOS (x64 and arm64), and Windows (x64) without platform-specific workarounds in user-facing behavior
**Verification:** CI matrix runs on `ubuntu-latest`, `macos-latest`, `windows-latest`; stdio tests verify process spawning on all platforms

---

#### NFR-016 — Terminal Compatibility

**Attribute:** Compatibility
**Target:** Terminal output degrades gracefully in environments without color support (CI runners, Windows CMD) per the `NO_COLOR` standard
**Verification:** Test suite runs terminal reporter with `NO_COLOR=1` and asserts no ANSI codes in output

---

#### NFR-017 — Shell Compatibility

**Attribute:** Compatibility
**Target:** `npx mcp-verify` works correctly in bash, zsh, sh, PowerShell, and Windows Command Prompt without additional quoting or escaping
**Verification:** Manual verification in each shell environment during pre-release testing

---

### 2.5 Usability

#### NFR-018 — Zero Configuration Default

**Attribute:** Usability
**Target:** `npx mcp-verify <target>` requires no configuration file, no flags, and no prior setup to produce a useful result. First-time users must achieve a working run in under 60 seconds from reading the README
**Verification:** Usability test with 5 developers unfamiliar with the tool; measure time to first successful run

---

#### NFR-019 — Actionable Error Messages

**Attribute:** Usability
**Target:** Every non-zero exit code produces an error message that includes: what went wrong (specific error description), why it likely happened (common cause), and what to try next (specific corrective action)
**Verification:** Error message review checklist applied to all error code 2 paths; user testing of error messages with unfamiliar developers

---

#### NFR-020 — Findability in npm Search

**Attribute:** Usability
**Target:** `mcp-verify` appears in the top 5 results when searching `npm search mcp verify` and `npm search mcp security`
**Verification:** Manual search validation post-publish; `package.json` keywords include `mcp`, `model-context-protocol`, `verify`, `security`, `conformance`

---

### 2.6 Maintainability

#### NFR-021 — Test Coverage

**Attribute:** Maintainability
**Target:** > 85% line coverage across all source files, measured by Vitest coverage with Istanbul
**Verification:** `vitest run --coverage` in CI; build fails if coverage drops below 85%

---

#### NFR-022 — Modular Architecture

**Attribute:** Maintainability
**Target:** Each major functional area (protocol client, conformance engine, security engine, reporters, history) is implemented as a separate module with no circular dependencies
**Verification:** Architecture lint via `dependency-cruiser` configured in CI; module boundary violations fail the build

---

#### NFR-023 — TypeScript Strict Mode

**Attribute:** Maintainability
**Target:** All TypeScript source files compile with `strict: true` and zero type errors. No `any` types without an explicit `// eslint-disable` comment with justification
**Verification:** `tsc --noEmit --strict` in CI; ESLint rule `@typescript-eslint/no-explicit-any` set to `error`

---

#### NFR-024 — Documentation Currency

**Attribute:** Maintainability
**Target:** CLI help text, README examples, and this requirements document remain synchronized with implementation. Any PR that changes behavior must include documentation updates
**Verification:** PR template checklist includes documentation update verification; automated doc-as-test for CLI help output

---

---

## 3. User Stories

Stories follow the format: "As a [persona], I want [action], so that [benefit]." Each story includes acceptance criteria and sprint assignment.

**Persona Key:**
- Paulo = MCP Server Developer (Primary)
- Dana = Platform/DevOps Lead (Secondary)
- Chris = Compliance Architect (Tertiary)

---

### US-001 — Single-Command Verification (Paulo)

**Story:** As Paulo, I want to run `npx mcp-verify http://localhost:3000` against my MCP server with no setup, so that I can immediately know whether my server is spec-conformant without reading documentation first.

**Sprint:** 1

**Acceptance Criteria:**
1. `npx mcp-verify http://localhost:3000` executes without any prior installation or configuration
2. Output is produced within 10 seconds for a locally-running server
3. Output includes an overall conformance score (0-100) prominently at the top
4. Output distinguishes between "tests passed" (green) and "tests failed" (red) visually
5. Exit code is 0 for a known-good server and 1 for a known-bad server

---

### US-002 — stdio Server Verification (Paulo)

**Story:** As Paulo, I want to verify my stdio-based MCP server by pointing `mcp-verify` at its executable, so that I can get conformance feedback without having to set up an HTTP transport layer.

**Sprint:** 1

**Acceptance Criteria:**
1. `npx mcp-verify stdio://./dist/my-server.js` spawns the server process and verifies it
2. The spawned process is terminated cleanly after verification
3. If the process exits unexpectedly during verification, exit code 2 is returned with a descriptive error
4. Relative and absolute paths are both supported after the `stdio://` prefix

---

### US-003 — Conformance Score Breakdown (Paulo)

**Story:** As Paulo, I want to see a per-category conformance score breakdown, so that I know exactly which part of the MCP spec my server violates and can prioritize fixes.

**Sprint:** 1

**Acceptance Criteria:**
1. Terminal output includes individual scores for: JSON-RPC Base, Initialization, Tools, Resources, Prompts, Transport
2. Each category shows the specific violations that reduced its score
3. Violations include the specific field or message that triggered the check
4. A score of 100 in a category is clearly indicated as "all checks passed"

---

### US-004 — CI Exit Code Gate (Paulo)

**Story:** As Paulo, I want `mcp-verify` to exit with a non-zero code when my server fails conformance checks, so that I can add it to my CI pipeline and have it block merges automatically.

**Sprint:** 1

**Acceptance Criteria:**
1. Exit code 1 is returned when a conformance check fails
2. Exit code 0 is returned when all checks pass
3. Exit code 2 is returned for tool errors (connection failure, invalid target)
4. The exit code is documented in `--help` output

---

### US-005 — Security Vulnerability Detection (Paulo)

**Story:** As Paulo, I want `mcp-verify` to tell me if my server has any of the top MCP security vulnerabilities, so that I can fix security issues before publishing my server publicly.

**Sprint:** 2

**Acceptance Criteria:**
1. Security findings are shown in terminal output with severity (Critical/High/Medium/Low) prominently labeled
2. Each finding includes a specific description of what was detected and where
3. Each finding includes concrete remediation guidance (e.g., "Add a `pattern` constraint to the `command` parameter in tool `run-shell`")
4. A clean server with no security issues shows "No security findings detected" in green

---

### US-006 — JSON Output for Pipeline Integration (Dana)

**Story:** As Dana, I want `mcp-verify` to produce machine-readable JSON output, so that I can ingest verification results into our internal security dashboard and SIEM.

**Sprint:** 3

**Acceptance Criteria:**
1. `npx mcp-verify --format json http://localhost:3000` produces only valid JSON to stdout
2. JSON output includes all conformance violations and security findings with full detail
3. JSON schema is versioned and documented
4. JSON output is stable across patch versions (no unexpected field changes)

---

### US-007 — GitHub Action PR Gate (Dana)

**Story:** As Dana, I want to add a GitHub Action to every MCP server repository in our organization that blocks PRs if conformance drops below 80 or any High security finding is detected, so that we have an automated governance gate.

**Sprint:** 3

**Acceptance Criteria:**
1. `uses: mcp-verify/action@v1` with `conformance-threshold: 80` and `fail-on-severity: high` blocks the PR when thresholds are exceeded
2. Action works on `ubuntu-latest` runners without additional setup
3. PR shows a named status check (`MCP Verify`) with pass/fail status
4. Action can be applied via a GitHub Organization workflow template

---

### US-008 — PR Comment Report (Dana)

**Story:** As Dana, I want the GitHub Action to post a Markdown report as a PR comment automatically, so that reviewers can see the verification results without leaving the PR.

**Sprint:** 3

**Acceptance Criteria:**
1. After verification, a PR comment is posted with the Markdown format report
2. If a previous mcp-verify comment exists, it is updated (not duplicated)
3. Comment includes overall score, category breakdown, and any findings
4. Comment posting does not fail the action if `GITHUB_TOKEN` is missing

---

### US-009 — Configurable Severity Threshold (Dana)

**Story:** As Dana, I want to configure different severity thresholds per environment (only Critical blocks production; High and above blocks staging), so that we can balance security strictness with development velocity.

**Sprint:** 3

**Acceptance Criteria:**
1. `mcp-verify.json` with `"failOnSeverity": "critical"` only blocks on Critical findings
2. `mcp-verify.json` with `"failOnSeverity": "high"` blocks on High and Critical findings
3. Per-environment config files can be passed with `--config prod.mcp-verify.json`
4. The effective threshold is shown in terminal output and included in JSON output

---

### US-010 — Check Suppression with Justification (Dana)

**Story:** As Dana, I want to suppress specific security checks (with documented justification) for servers that have a known exception, so that approved exceptions don't block CI while still being visible in audit reports.

**Sprint:** 3

**Acceptance Criteria:**
1. Config `"skip": [{"checkId": "cors-wildcard", "justification": "Internal-only server behind VPN"}]` suppresses the check
2. Suppressed findings appear in all output formats labeled as `[SUPPRESSED]` with the justification text
3. Suppressed findings do not affect exit code
4. Missing justification field produces a warning but does not block execution

---

### US-011 — Markdown Audit Trail Report (Chris)

**Story:** As Chris, I want `mcp-verify` to produce a Markdown report with a dated conformance score and security findings, so that I can store it in our compliance documentation system as evidence of validation.

**Sprint:** 3

**Acceptance Criteria:**
1. `npx mcp-verify --format markdown http://staging.example.com/mcp` produces a self-contained Markdown document
2. Document includes: date/time stamp, tool version, spec version, target URL, conformance score, category breakdown, all security findings
3. Document is readable without any rendering (plain Markdown syntax, not relying on HTML extensions)
4. Document contains a section title and metadata sufficient to be cited in a compliance submission

---

### US-012 — Historical Score Tracking (Chris)

**Story:** As Chris, I want to see the conformance score history for each of our MCP servers over time, so that I can demonstrate continuous validation and improvement in our audit documentation.

**Sprint:** 4

**Acceptance Criteria:**
1. `npx mcp-verify serve` opens a web dashboard showing all tracked servers
2. Clicking a server shows a time-series chart of conformance scores with dates
3. Chart shows at least 6 months of history if available
4. Dashboard data is stored locally with no external services required

---

### US-013 — Regression Detection (Paulo)

**Story:** As Paulo, I want to know when a code change has caused my conformance score to regress, so that I can catch regressions before they reach main.

**Sprint:** 4

**Acceptance Criteria:**
1. `npx mcp-verify --compare-last http://localhost:3000` compares the current run to the previous run
2. If the score decreased, a warning section is printed showing the delta and which violations are new
3. `--compare-last` in CI exits with code 1 when a regression is detected (configurable with `--fail-on-regression`)
4. First run with no history shows "No previous run found" without error

---

### US-014 — Custom Security Rule (Dana)

**Story:** As Dana, I want to write a custom plugin that checks for our internal authentication header on all MCP servers, so that I can encode our organization's specific security policy as an automated check.

**Sprint:** 4

**Acceptance Criteria:**
1. A custom plugin file following the Plugin API (FR-077) can be loaded via `mcp-verify.config.js`
2. Plugin findings appear in all output formats alongside built-in findings
3. Plugin findings contribute to exit code determination
4. Plugin errors do not crash the tool; a warning is printed and verification continues

---

### US-015 — Zero Config First Run (Paulo)

**Story:** As Paulo, I want to get useful results from `npx mcp-verify` with a completely empty project directory (no config file), so that I don't need to spend time on setup to evaluate the tool.

**Sprint:** 1

**Acceptance Criteria:**
1. `npx mcp-verify http://localhost:3000` with no config file produces a full verification report
2. Default thresholds (fail on Critical findings, no conformance threshold) are applied
3. No warning or error is produced about missing configuration
4. Terminal output gives a clear indication of what defaults are in effect

---

### US-016 — Tool Poisoning Detection (Paulo)

**Story:** As Paulo, I want `mcp-verify` to warn me if any of my tool descriptions contain patterns that look like prompt injection attempts, so that I can ensure my server is not accidentally or maliciously designed to hijack model behavior.

**Sprint:** 2

**Acceptance Criteria:**
1. A tool with a description containing `"IGNORE PREVIOUS INSTRUCTIONS"` triggers a Critical finding
2. The finding identifies the specific tool name and the matched pattern
3. Legitimate tool descriptions with operational imperative language (e.g., "Returns the current time") do not trigger false positives
4. The check is labeled as `[heuristic]` in output

---

### US-017 — Information Leakage Detection (Paulo)

**Story:** As Paulo, I want `mcp-verify` to detect if my server leaks stack traces or internal paths in error responses, so that I can fix information disclosure issues before deploying to production.

**Sprint:** 2

**Acceptance Criteria:**
1. A server returning Node.js stack trace text in an error response triggers a Medium finding
2. The finding includes a redacted excerpt of the leaking error text (not the full stack trace) for context
3. A server returning only `{"error": {"code": -32601, "message": "Method not found"}}` does not trigger the check
4. Finding is labeled `[deterministic]` in output

---

### US-018 — CORS Wildcard Detection (Paulo)

**Story:** As Paulo, I want `mcp-verify` to detect if my HTTP MCP server has a wildcard CORS policy, so that I know if my server is inadvertently accessible from any web origin.

**Sprint:** 2

**Acceptance Criteria:**
1. A server returning `Access-Control-Allow-Origin: *` triggers a High finding
2. The finding includes the specific endpoint URL where the header was detected
3. A server returning `Access-Control-Allow-Origin: https://my-app.example.com` does not trigger the check
4. Finding is labeled `[deterministic]` in output

---

### US-019 — Multiple Output Format Pipeline (Dana)

**Story:** As Dana, I want to run `mcp-verify` once and produce both a JSON report for machine ingestion and a Markdown report for the audit trail, so that I don't have to run the tool twice.

**Sprint:** 3

**Acceptance Criteria:**
1. `npx mcp-verify --format json --output report.json http://localhost:3000` writes JSON to file and shows summary in terminal
2. A second run with `--format markdown --output report.md` produces the Markdown report
3. Note: single-run multi-format output (producing both JSON and Markdown in one execution) is a documented future feature; current implementation requires two runs

---

### US-020 — EU AI Act Compliance Documentation (Chris)

**Story:** As Chris, I want the Markdown report to contain enough structured information (dated score, methodology reference, tool version, spec version) that it can be cited as evidence in an EU AI Act Article 9 validation procedure, so that our legal team has a defensible paper trail.

**Sprint:** 3

**Acceptance Criteria:**
1. Markdown report includes a `Generated by` footer with: tool name, tool version, MCP spec version validated against, and ISO 8601 timestamp
2. Report includes a reference to the scoring methodology documentation (URL to the published README)
3. Report's overall structure (headings, table of contents) is consistent across all versions of the tool for a given schema version
4. Report can be exported as PDF from any standard Markdown renderer (no JavaScript-rendered content)

---

### US-021 — Portfolio Dashboard for Platform Teams (Dana)

**Story:** As Dana, I want to see all 30 of our internal MCP servers' latest conformance scores in one view, so that I can quickly identify which servers need attention without checking each one individually.

**Sprint:** 4

**Acceptance Criteria:**
1. `npx mcp-verify serve` shows a table of all tracked servers with their most recent score, finding count, and trend
2. Table is sortable by score to quickly identify lowest-scoring servers
3. Servers not run in the last 30 days are visually flagged as "stale"
4. Dashboard works with no internet connectivity (all assets are local)

---

### US-022 — Auth Gap Detection on Public Servers (Paulo)

**Story:** As Paulo, I want `mcp-verify` to warn me when my HTTP MCP server is publicly accessible without any authentication, so that I don't accidentally expose my server before adding auth.

**Sprint:** 2

**Acceptance Criteria:**
1. A server at a public IP (non-localhost, non-RFC-1918) that responds to `initialize` without any auth challenge receives a Critical finding
2. A server at `localhost` does not receive an auth gap finding (development pattern)
3. The finding includes the resolved IP address and remediation text recommending Bearer token or OAuth 2.0
4. Finding is labeled `[heuristic]` in output

---

### US-023 — Spec Version Transparency (Paulo)

**Story:** As Paulo, I want to know exactly which version of the MCP spec `mcp-verify` is validating against, so that I understand whether the tool's checks are current for the spec version my server implements.

**Sprint:** 1

**Acceptance Criteria:**
1. `mcp-verify --version` displays the MCP spec version being validated
2. The JSON output `meta.specVersion` field contains the spec version string
3. The Markdown report header includes the spec version
4. The `CHANGELOG.md` documents which spec version each tool version validates against

---

### US-024 — Baseline Pinning for Regression Gating (Dana)

**Story:** As Dana, I want to pin a known-good state for each server so that our CI pipeline detects regressions from the approved baseline rather than from the last arbitrary run.

**Sprint:** 4

**Acceptance Criteria:**
1. `npx mcp-verify baseline http://staging.example.com/mcp` stores the current run as the baseline
2. Subsequent `--compare-last` runs compare against the baseline
3. Baseline can be updated by re-running the `baseline` command
4. Baseline metadata (when it was set, what score it recorded) is visible in the dashboard

---

---

## 4. Sprint-Story Mapping

### Sprint 1: Core CLI + Protocol Client + Spec Conformance

**Objective:** Deliver a working CLI that connects to MCP servers, speaks the full protocol, and produces a conformance score. The tool must be publishable to npm as an alpha.

**Functional Requirements Delivered:**
FR-001, FR-004, FR-005, FR-006, FR-007, FR-008, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-021, FR-022, FR-023, FR-024, FR-025, FR-026, FR-027, FR-028, FR-029, FR-030, FR-031, FR-032, FR-033, FR-035, FR-046, FR-047, FR-048, FR-052, FR-063, FR-064, FR-065

**Non-Functional Requirements Delivered:**
NFR-001, NFR-003, NFR-004, NFR-005, NFR-006, NFR-007, NFR-008, NFR-009, NFR-012, NFR-014, NFR-015, NFR-018, NFR-019, NFR-021, NFR-022, NFR-023

**User Stories Delivered:**
US-001, US-002, US-003, US-004, US-015, US-023

**Exit Criteria:**
- `npx mcp-verify http://localhost:3000` produces a conformance score against a reference MCP server
- Pass (exit 0) and fail (exit 1) demonstrated against known-good and known-bad fixtures
- Published to npm as `mcp-verify@0.1.0-alpha`
- Vitest coverage > 80% on core validation logic

---

### Sprint 2: Security Check Engine

**Objective:** Add the five-category security check engine. Demonstrate detection against known-vulnerable server fixtures. Achieve < 5% false positive rate.

**Functional Requirements Delivered:**
FR-036, FR-037, FR-038, FR-039, FR-040, FR-041, FR-044, FR-045

**Non-Functional Requirements Delivered:**
NFR-002 (partial — package size constraint enforced), NFR-013

**User Stories Delivered:**
US-005, US-016, US-017, US-018, US-022

**Exit Criteria:**
- Detects all five vulnerability categories against reference vulnerable fixtures
- False positive rate < 5% against suite of 10 known-clean servers
- Full CLI run completes in < 10 seconds on local server
- Published as `mcp-verify@0.2.0-alpha`
- Security check test coverage > 85%

---

### Sprint 3: CI Integration + Structured Reporting

**Objective:** Make `mcp-verify` a native CI citizen. Deliver GitHub Action, JSON/Markdown output formats, configurable thresholds, and per-check suppression.

**Functional Requirements Delivered:**
FR-002, FR-003, FR-009, FR-020, FR-034, FR-042, FR-043, FR-049, FR-050, FR-051, FR-053, FR-054, FR-055, FR-056, FR-057, FR-058, FR-059, FR-061, FR-062

**Non-Functional Requirements Delivered:**
NFR-002 (full — cold start test enforced), NFR-010, NFR-011, NFR-016, NFR-020, NFR-024

**User Stories Delivered:**
US-006, US-007, US-008, US-009, US-010, US-011, US-019, US-020

**Exit Criteria:**
- GitHub Action blocks a PR when a security finding exceeds configured severity
- GitHub Action posts a Markdown summary report as a PR comment
- JSON output passes schema validation against documented schema
- `mcp-verify@1.0.0` published to npm with < 5MB package size
- GitHub Action published to GitHub Marketplace

---

### Sprint 4: Dashboard + Historical Tracking + Plugin System

**Objective:** Increase long-term stickiness for power users and enterprise teams. Deliver local web dashboard, historical tracking, plugin API, and production-quality documentation.

**Functional Requirements Delivered:**
FR-060, FR-066, FR-067, FR-068, FR-069, FR-070, FR-071, FR-072, FR-073, FR-074, FR-075, FR-076, FR-077, FR-078, FR-079, FR-080

**Non-Functional Requirements Delivered:**
NFR-001 (performance optimization pass), NFR-015 (cross-platform dashboard validation)

**User Stories Delivered:**
US-012, US-013, US-014, US-021, US-024

**Exit Criteria:**
- Web dashboard displays historical scores for at least 10 runs per server
- Custom plugin successfully intercepts and adds findings to the report
- Documentation covers all P0, P1, and P2 features
- End-to-end integration test suite passes against 5 real public MCP servers
- Published as `mcp-verify@1.1.0`

---

## 5. Acceptance Criteria Matrix (P0 Features)

This matrix maps each P0 feature from the product vision to its specific, testable acceptance criteria. All P0 criteria must pass before `mcp-verify@1.0.0` can be published.

---

### P0.1 — MCP Spec Conformance Scoring

| # | Acceptance Criterion | Verification Method | FR Reference |
|---|---------------------|---------------------|-------------|
| 1 | `npx mcp-verify http://localhost:3000` produces a numeric conformance score 0-100 | Integration test against reference server fixture | FR-032 |
| 2 | Score of 100 is produced for a fully-conformant reference server with no violations | Integration test with `known-good-server.ts` fixture | FR-032 |
| 3 | Score of 0 is produced for a server that fails the initialization handshake | Integration test with `bad-init-server.ts` fixture | FR-032 |
| 4 | JSON-RPC envelope validation detects missing `jsonrpc: "2.0"` field | Unit test: conformance engine receives response without `jsonrpc` field | FR-021 |
| 5 | JSON-RPC error code validation rejects codes in the reserved range -32100 to -32001 | Unit test: error code validator with reserved-range code | FR-022 |
| 6 | Initialization check fails when `initialize` response missing `protocolVersion` | Unit test: init validator with `protocolVersion` omitted | FR-023 |
| 7 | Capability negotiation check fails when server declares `tools` but returns error on `tools/list` | Integration test with selective-capability-failure fixture | FR-024 |
| 8 | Tool schema check fails for a tool missing the `name` field | Unit test: tool schema validator with nameless tool | FR-025 |
| 9 | Tool schema check fails for `inputSchema` that is not valid JSON Schema draft-07 | Unit test: tool schema validator with invalid JSON Schema | FR-026 |
| 10 | Resource check fails when `resources/list` response missing `resources` array | Unit test: resource validator with missing array | FR-027 |
| 11 | Prompt check fails when `prompts/list` response missing `prompts` array | Unit test: prompt validator with missing array | FR-028 |
| 12 | stdio transport check fails for non-JSON output on stdout before initialization | Integration test with noisy-stdout fixture | FR-029 |
| 13 | HTTP+SSE transport check fails for missing `Content-Type: text/event-stream` | Integration test with wrong-content-type fixture | FR-030 |
| 14 | Error handling check fails when server returns no response to unknown method probe | Integration test with non-responsive-errors fixture | FR-031 |
| 15 | Per-category scores are shown individually in terminal output | End-to-end test: terminal output parsed for all 6 categories | FR-048 |
| 16 | Spec version is displayed in `--version` output and in JSON report `meta.specVersion` | CLI test and JSON schema validation | FR-033 |
| 17 | Overall score = weighted sum of category scores rounded to nearest integer | Unit test: score calculator with known category scores | FR-032 |

---

### P0.2 — Security Vulnerability Detection

| # | Acceptance Criterion | Verification Method | FR Reference |
|---|---------------------|---------------------|-------------|
| 1 | Command injection check detects unconstrained string `command` parameter | Unit test: security engine with `command-injection-server.ts` fixture | FR-036 |
| 2 | Command injection check does NOT fire on string parameter with `pattern` constraint | Unit test: security engine with `clean-command-server.ts` fixture | FR-036 |
| 3 | CORS wildcard check detects `Access-Control-Allow-Origin: *` | Integration test with `cors-wildcard-server.ts` fixture | FR-037 |
| 4 | CORS wildcard check does NOT fire on non-wildcard CORS values | Integration test with `cors-specific-server.ts` fixture | FR-037 |
| 5 | Auth gap check fires on non-loopback server with no auth challenge | Integration test with `missing-auth-server.ts` fixture | FR-038 |
| 6 | Auth gap check does NOT fire on `localhost` target | Integration test: auth gap check with `localhost` target | FR-038 |
| 7 | Tool poisoning check detects `"IGNORE PREVIOUS INSTRUCTIONS"` in tool description | Unit test: poisoning detector with poisoned tool | FR-039 |
| 8 | Tool poisoning check does NOT fire on normal operational tool descriptions | Unit test: poisoning detector with 20 clean tool descriptions | FR-039 |
| 9 | Information leakage check detects Node.js stack trace in error response | Unit test: leakage detector with stack trace error | FR-040 |
| 10 | Information leakage check detects absolute filesystem paths in error response | Unit test: leakage detector with path-containing error | FR-040 |
| 11 | Information leakage check does NOT fire on short generic error messages | Unit test: leakage detector with clean error response | FR-040 |
| 12 | All findings include: `id`, `checkId`, `severity`, `cvssScore`, `component`, `description`, `remediation`, `confidence` | JSON output schema validation against finding schema | FR-041 |
| 13 | False positive rate < 5% across 10 known-clean server fixtures | Integration test suite with all 10 clean fixtures | FR-044, FR-045 |
| 14 | All 5 vulnerable fixtures each trigger at least one finding | Integration test suite with all 5 vulnerable fixtures | FR-045 |

---

### P0.3 — CLI with Pass/Fail Exit Codes

| # | Acceptance Criterion | Verification Method | FR Reference |
|---|---------------------|---------------------|-------------|
| 1 | Exit code 0 for fully conformant server with no security findings | End-to-end test with `known-good-server.ts` | FR-006 |
| 2 | Exit code 1 for server with conformance failures | End-to-end test with `bad-tool-schema-server.ts` | FR-007 |
| 3 | Exit code 1 for server with Critical security finding | End-to-end test with `tool-poisoning-server.ts` | FR-007 |
| 4 | Exit code 2 for unreachable target | Test: `mcp-verify http://localhost:9999` (no server running) | FR-008 |
| 5 | Exit code 2 for invalid URL format | Test: `mcp-verify not-a-url` | FR-008 |
| 6 | Exit code 2 printed with error message to stderr (not stdout) | Test: stderr capture shows message; stdout is empty | FR-008 |
| 7 | `--version` exits with code 0 and prints version string | Test: `mcp-verify --version` exit code and output | FR-004 |
| 8 | `npx mcp-verify --version` completes in < 5 seconds from cold npm cache | CI benchmark test with cleared npm cache | NFR-002 |
| 9 | Package unpacked size < 5MB | `size-limit` in CI build pipeline | NFR-003 |
| 10 | CLI runs on Node.js 18, 20, and 22 | CI matrix test on all three versions | NFR-014 |
| 11 | CLI runs on Linux, macOS, and Windows | CI matrix test on all three platforms | NFR-015 |
| 12 | `--help` output lists all flags and at least 3 example invocations | Test: help output parsed for required sections | FR-005 |
| 13 | Timeout flag correctly terminates after configured duration | Test with a mock server that never responds | FR-010 |
| 14 | Color output is disabled when `NO_COLOR=1` is set | Test: terminal output with `NO_COLOR=1` contains no ANSI codes | NFR-016 |

---

## 6. Dependencies

### 6.1 External Library Dependencies

| Dependency | Version Constraint | Purpose | Risk |
|------------|-------------------|---------|------|
| `commander` | `^12.0.0` | CLI argument parsing and subcommand routing | Low — stable, widely-used |
| `@modelcontextprotocol/sdk` | `^1.0.0` | MCP protocol client types and optionally transport helpers | Medium — SDK may change with spec updates; version-pin required |
| `ajv` | `^8.0.0` | JSON Schema draft-07 validation for tool `inputSchema` checks | Low — stable |
| `ajv-formats` | `^3.0.0` | AJV plugin for JSON Schema format keywords | Low |
| `chalk` | `^5.0.0` | Terminal color output | Low |
| `eventsource` | `^2.0.0` | SSE client for HTTP+SSE transport | Low-Medium — SSE spec compliance varies |
| `vitest` | `^2.0.0` (dev) | Test runner and coverage | Dev only |
| `tsup` | `^8.0.0` (dev) | TypeScript build and bundling | Dev only |
| `size-limit` | `^11.0.0` (dev) | Package size enforcement in CI | Dev only |
| `typescript` | `^5.4.0` (dev) | TypeScript compiler | Dev only |
| `dependency-cruiser` | `^16.0.0` (dev) | Module architecture enforcement | Dev only |

**Bundling Strategy:** All runtime dependencies (commander, ajv, chalk, eventsource, MCP SDK) are bundled into the distributable output using tsup to ensure `< 5MB` package size and fast `npx` cold start. The MCP SDK is included selectively (only the transport and type modules needed for verification).

**Zero Runtime External Network Policy (NFR-009):** No runtime dependency may make outbound network calls to any host other than the user-specified `<target>`. Dependencies are evaluated for outbound call behavior before inclusion.

---

### 6.2 MCP Specification Dependency

| Item | Value |
|------|-------|
| Validated spec version | MCP 2024-11-05 (as of tool v1.0.0) |
| Spec source | https://modelcontextprotocol.io |
| Spec GitHub | https://github.com/modelcontextprotocol/specification |
| Update policy | Spec version bumps are tracked as P0 issues; tool version release accompanies each spec update |
| Version pinning | All conformance rules internally reference the spec version they enforce; rules are disabled when server declares an incompatible `protocolVersion` |

**Risk:** The MCP specification is actively developed. Mitigation: modular rule design with explicit spec version tags on each rule. Monitor the specification repository for changes via GitHub watch.

---

### 6.3 Inter-Feature Dependencies

The following dependency graph must be respected during development. Features in a later row depend on features in earlier rows being complete.

```
Layer 0 (No dependencies):
  - FR-011 to FR-013 (Transport Connection)

Layer 1 (Requires Layer 0):
  - FR-014 to FR-019 (Protocol Message Exchange — requires transports)

Layer 2 (Requires Layer 1):
  - FR-021 to FR-035 (Spec Conformance Engine — requires protocol messages)
  - FR-036 to FR-045 (Security Check Engine — requires protocol messages and conformance engine for context)

Layer 3 (Requires Layer 2):
  - FR-046 to FR-055 (Reporting — requires conformance results and security findings)
  - FR-001 to FR-010 (Core CLI — requires reporting and engines to be callable)

Layer 4 (Requires Layer 3):
  - FR-056 to FR-065 (CI Integration — requires full CLI and structured output formats)

Layer 5 (Requires Layer 3 and history storage):
  - FR-066 to FR-075 (Web Dashboard — requires run history from FR-067)
  - FR-067 (Run History Storage — requires conformance and security results)

Layer 6 (Requires Layer 3):
  - FR-076 to FR-080 (Plugin System — requires security finding data model and protocol context)
```

**Critical path:** Transport (FR-011-013) → Protocol Exchange (FR-014-019) → Conformance Engine (FR-021-035) → Terminal Reporting (FR-046-048) → Core CLI (FR-001-010). This path must be complete by end of Sprint 1.

**Security engine dependency:** The security check engine (FR-036-045) depends on both the protocol message exchange outputs (raw responses, tool schemas, HTTP headers) and the conformance engine outputs (initialization result, capability declarations). It is a consumer, not a producer, in the data flow.

---

### 6.4 External System Dependencies

| System | Dependency Type | Required For | Risk |
|--------|----------------|--------------|------|
| GitHub Actions runtime | Integration | FR-056 to FR-059 (GitHub Action) | Low — stable API |
| GitHub REST API (PR comments) | Network call from CI | FR-058 (PR comment posting) | Low — uses standard `GITHUB_TOKEN` |
| npm registry | Distribution | FR-063 (npx cold start) | Low — stable |
| GitHub Marketplace | Distribution | FR-056 (Action publishing) | Low |
| Node.js process model | Runtime | FR-012 (stdio process spawning) | Low — Node.js stable API |

---

### 6.5 Test Infrastructure Dependencies

| Dependency | Purpose |
|------------|---------|
| Reference MCP server fixtures (10 known-clean, 10 known-bad, 5 security-vulnerable) | Integration testing of conformance and security engines |
| Mock HTTP server (Vitest + `msw` or custom) | Unit testing HTTP+SSE transport without real servers |
| Mock stdio server (Node.js child_process mock) | Unit testing stdio transport without real processes |
| Docker (optional, for platform matrix CI) | Cross-platform testing consistency |
| `size-limit` configuration | Package size enforcement (NFR-003) |

---

*Document produced by Business Analyst (Tier 3 Engineer) for MCP Verify PDLC Project.*
*This document is the authoritative requirements specification for development agents. All functional and non-functional requirements are traceable to the product vision at `.pdlc/architecture/product-vision.md`.*
*Next phase: Architecture and technical design. Development agents should reference this document for all implementation decisions.*
