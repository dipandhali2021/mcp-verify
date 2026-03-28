# MCP Verify — Project Plan

**Document Version:** 1.0
**Author:** Project Manager (Tier 3 PM)
**Date:** 2026-03-28
**Status:** Approved — Sprint Execution Ready
**References:**
- `.pdlc/architecture/product-vision.md` — Product vision, features, personas, roadmap
- `.pdlc/architecture/requirements.md` — FR-001 through FR-080, NFRs, user stories
- `.pdlc/research/project-selection.md` — Project selection rationale and risks

---

## Table of Contents

1. [Work Breakdown Structure (WBS)](#1-work-breakdown-structure-wbs)
2. [Sprint Plans](#2-sprint-plans)
   - [Sprint 1: Foundation](#sprint-1-foundation--cli-scaffold--protocol-client--spec-validation)
   - [Sprint 2: Security Engine](#sprint-2-security-engine--vulnerability-detection)
   - [Sprint 3: CI Integration](#sprint-3-ci-integration--github-action--structured-reporting)
   - [Sprint 4: Advanced Features](#sprint-4-advanced-features--dashboard--history--plugins)
3. [Milestones](#3-milestones)
4. [Critical Path Analysis](#4-critical-path-analysis)
5. [Risk Register](#5-risk-register)
6. [Resource Plan](#6-resource-plan)
7. [Definition of Done](#7-definition-of-done)

---

## 1. Work Breakdown Structure (WBS)

```
1.0 MCP Verify
│
├── 1.1 Sprint 1: Foundation
│   ├── 1.1.1 Infrastructure Setup
│   │   ├── 1.1.1.1 Repository scaffold (package.json, tsconfig, .gitignore)      [FR-063, FR-064, FR-065]
│   │   ├── 1.1.1.2 Build system configuration (tsup, esbuild bundling)            [NFR-003]
│   │   ├── 1.1.1.3 Test framework setup (Vitest, coverage thresholds)             [NFR-021]
│   │   └── 1.1.1.4 CI skeleton (GitHub Actions matrix: OS x Node.js version)     [FR-064, FR-065]
│   │
│   ├── 1.1.2 Core CLI
│   │   ├── 1.1.2.1 Commander.js CLI scaffold (verify command, bare invocation)   [FR-001]
│   │   ├── 1.1.2.2 --version and --help flags                                    [FR-004, FR-005]
│   │   ├── 1.1.2.3 Exit code implementation (0/1/2 semantics)                    [FR-006, FR-007, FR-008]
│   │   └── 1.1.2.4 --timeout flag and default timeout enforcement                [FR-010]
│   │
│   ├── 1.1.3 MCP Protocol Client
│   │   ├── 1.1.3.1 Transport auto-detection (URL scheme routing)                 [FR-011]
│   │   ├── 1.1.3.2 stdio transport implementation (spawn + stdin/stdout pipes)   [FR-012]
│   │   ├── 1.1.3.3 HTTP+SSE transport implementation                             [FR-013]
│   │   ├── 1.1.3.4 MCP initialization handshake (initialize/initialized)         [FR-014]
│   │   ├── 1.1.3.5 Protocol message exchange (tools, resources, prompts)         [FR-015, FR-016, FR-017]
│   │   ├── 1.1.3.6 Error probe implementation (malformed + unknown-method)       [FR-018]
│   │   └── 1.1.3.7 Graceful connection termination                               [FR-019]
│   │
│   ├── 1.1.4 Spec Conformance Engine
│   │   ├── 1.1.4.1 JSON-RPC 2.0 envelope validator                              [FR-021]
│   │   ├── 1.1.4.2 JSON-RPC error code range validator                           [FR-022]
│   │   ├── 1.1.4.3 MCP initialization response conformance                       [FR-023]
│   │   ├── 1.1.4.4 Capability negotiation correctness validator                  [FR-024]
│   │   ├── 1.1.4.5 Tool schema structure validator (name, description, schema)   [FR-025]
│   │   ├── 1.1.4.6 Tool schema content validator (JSON Schema draft-07)          [FR-026]
│   │   ├── 1.1.4.7 Resource protocol conformance validator                       [FR-027]
│   │   ├── 1.1.4.8 Prompt protocol conformance validator                         [FR-028]
│   │   ├── 1.1.4.9 stdio transport protocol conformance                          [FR-029]
│   │   ├── 1.1.4.10 HTTP+SSE transport protocol conformance                      [FR-030]
│   │   ├── 1.1.4.11 Error handling conformance (probe-response analysis)         [FR-031]
│   │   ├── 1.1.4.12 Conformance scoring algorithm (weighted categories)          [FR-032]
│   │   ├── 1.1.4.13 Spec version declaration and metadata                        [FR-033]
│   │   └── 1.1.4.14 Unknown method graceful handling                             [FR-035]
│   │
│   └── 1.1.5 Terminal Reporter (Sprint 1 baseline)
│       ├── 1.1.5.1 Color-coded output with TTY detection and NO_COLOR support    [FR-046]
│       ├── 1.1.5.2 Summary block (target, score, verdict, timing)                [FR-047]
│       └── 1.1.5.3 Category score breakdown with violation list                  [FR-048]
│
├── 1.2 Sprint 2: Security Engine
│   ├── 1.2.1 Security Check Implementations
│   │   ├── 1.2.1.1 Command injection susceptibility detector                     [FR-036]
│   │   ├── 1.2.1.2 CORS wildcard policy detector                                 [FR-037]
│   │   ├── 1.2.1.3 Authentication gap detector                                   [FR-038]
│   │   ├── 1.2.1.4 Tool poisoning pattern detector                               [FR-039]
│   │   └── 1.2.1.5 Information leakage detector                                  [FR-040]
│   │
│   ├── 1.2.2 Security Data Model and Scoring
│   │   ├── 1.2.2.1 Security finding data model (id, severity, CVSS, component)  [FR-041]
│   │   └── 1.2.2.2 CVSS-adjacent scoring rubric (per-check base scores)         [FR-044]
│   │
│   ├── 1.2.3 Test Fixtures
│   │   ├── 1.2.3.1 Vulnerable server fixtures (one per check category)           [FR-045]
│   │   └── 1.2.3.2 Clean server fixtures (one per check category)                [FR-045]
│   │
│   └── 1.2.4 Terminal Reporter Update
│       └── 1.2.4.1 Security findings section in terminal output                  [FR-041, FR-048]
│
├── 1.3 Sprint 3: CI Integration
│   ├── 1.3.1 Extended CLI Flags
│   │   ├── 1.3.1.1 --format flag (terminal/json/markdown)                        [FR-002]
│   │   ├── 1.3.1.2 --config flag and auto-discovery                              [FR-003]
│   │   ├── 1.3.1.3 --strict and --lenient mode flags                             [FR-009]
│   │   ├── 1.3.1.4 --transport override flag                                     [FR-020]
│   │   ├── 1.3.1.5 --verbose flag                                                [FR-054]
│   │   └── 1.3.1.6 --output file flag                                            [FR-055]
│   │
│   ├── 1.3.2 Configuration System
│   │   ├── 1.3.2.1 Security check suppression (skip array + justification)       [FR-042]
│   │   ├── 1.3.2.2 Severity threshold configuration (failOnSeverity)             [FR-043]
│   │   └── 1.3.2.3 Conformance threshold configuration (conformanceThreshold)    [FR-053]
│   │
│   ├── 1.3.3 Reporters
│   │   ├── 1.3.3.1 JSON reporter (versioned schema, all fields)                  [FR-049]
│   │   ├── 1.3.3.2 JSON schema versioning and documentation                      [FR-050]
│   │   └── 1.3.3.3 Markdown reporter (GFM, audit-ready)                          [FR-051]
│   │
│   ├── 1.3.4 Per-Check Confidence Levels
│   │   └── 1.3.4.1 Deterministic vs. heuristic labeling on all checks           [FR-034]
│   │
│   ├── 1.3.5 GitHub Action
│   │   ├── 1.3.5.1 action.yml definition (inputs, outputs, node20 runtime)       [FR-056]
│   │   ├── 1.3.5.2 PR status check integration (exit code propagation)           [FR-057]
│   │   ├── 1.3.5.3 PR comment reporter (Markdown post + update)                  [FR-058]
│   │   ├── 1.3.5.4 Matrix build support (concurrent-safe execution)              [FR-059]
│   │   └── 1.3.5.5 Config file auto-discovery in GitHub workspace                [FR-061]
│   │
│   ├── 1.3.6 CI Documentation and Examples
│   │   └── 1.3.6.1 CI pipeline examples (GitHub Actions, GitLab, CircleCI)       [FR-062]
│   │
│   └── 1.3.7 v1.0.0 Release Preparation
│       ├── 1.3.7.1 Package size gate enforcement (size-limit < 5MB)              [NFR-003]
│       ├── 1.3.7.2 Cross-platform CI matrix (OS x Node.js)                       [NFR-014, NFR-015]
│       └── 1.3.7.3 npm publish workflow and GitHub Marketplace publish           [FR-056]
│
├── 1.4 Sprint 4: Advanced Features
│   ├── 1.4.1 Run History System
│   │   ├── 1.4.1.1 History storage (JSONL per target in ~/.mcp-verify/history/)  [FR-067]
│   │   ├── 1.4.1.2 --compare-last flag and regression output                     [FR-072]
│   │   ├── 1.4.1.3 baseline subcommand (pin known-good state)                    [FR-073]
│   │   └── 1.4.1.4 history export subcommand (SIEM-ready JSON)                   [FR-074]
│   │
│   ├── 1.4.2 Web Dashboard
│   │   ├── 1.4.2.1 serve subcommand (local HTTP server, port flag)               [FR-066]
│   │   ├── 1.4.2.2 Historical conformance score charts (time-series)             [FR-068]
│   │   ├── 1.4.2.3 Security findings trend view (stacked bars by severity)       [FR-069]
│   │   ├── 1.4.2.4 Score regression detection and markers                        [FR-070]
│   │   ├── 1.4.2.5 Multi-server portfolio overview table                         [FR-071]
│   │   └── 1.4.2.6 No external telemetry / fully bundled assets                 [FR-075]
│   │
│   ├── 1.4.3 Plugin System
│   │   ├── 1.4.3.1 Plugin configuration format (mcp-verify.config.js)            [FR-076]
│   │   ├── 1.4.3.2 Plugin API contract (context object, Finding return type)      [FR-077]
│   │   ├── 1.4.3.3 Plugin finding integration (merged into report pipeline)       [FR-078]
│   │   ├── 1.4.3.4 Reference plugin examples (custom-auth, rate-limit)           [FR-079]
│   │   └── 1.4.3.5 Plugin isolation (error containment, 30s timeout)             [FR-080]
│   │
│   ├── 1.4.4 SARIF Output
│   │   └── 1.4.4.1 SARIF 2.1.0 output for GitHub Code Scanning upload           [FR-060]
│   │
│   └── 1.4.5 Documentation and Polish
│       ├── 1.4.5.1 Full documentation site (README, CLI ref, Action ref, plugin) [NFR-024]
│       ├── 1.4.5.2 Performance optimization pass (p95 < 10s on remote servers)   [NFR-001]
│       └── 1.4.5.3 End-to-end integration tests (5 real public MCP servers)     [NFR-008]
│
└── 1.5 Cross-Cutting Concerns (all sprints)
    ├── 1.5.1 TypeScript strict mode enforcement (tsc --strict, no any)            [NFR-023]
    ├── 1.5.2 Dependency security scanning (npm audit --audit-level=high)          [NFR-013]
    ├── 1.5.3 Test coverage gate (> 85% line coverage via Vitest + Istanbul)       [NFR-021]
    ├── 1.5.4 Modular architecture lint (dependency-cruiser, no circular deps)     [NFR-022]
    ├── 1.5.5 No telemetry / no credential storage enforcement                    [NFR-009, NFR-010]
    └── 1.5.6 Graceful failure and timeout handling                                [NFR-005, NFR-006]
```

---

## 2. Sprint Plans

### Sprint 1: Foundation — CLI Scaffold + Protocol Client + Spec Validation

**Sprint Goal:** Deliver a working `npx mcp-verify <target>` CLI that connects to any MCP server over stdio or HTTP+SSE, executes the full conformance check suite against the MCP spec (initialization, tools, resources, prompts, transport, error handling), and produces a color-coded terminal report with a 0-100 conformance score and correct exit codes. Publish as `mcp-verify@0.1.0-alpha`.

**Duration:** 2 weeks
**Sprint Capacity:** 4 dev agents x 2 weeks = estimated 80 story points maximum
**Priority:** All Sprint 1 stories are P0. No exceptions — this is the foundational sprint that enables everything else.

**Recommended Agents:**
- `cli-developer` — CLI scaffold, Commander.js, exit codes, flags
- `typescript-pro` — type system, build configuration, shared data models
- `backend-developer` — MCP protocol client, transport implementations, conformance engine

---

#### Story Breakdown

**Group A: Infrastructure Setup (parallelizable, no inter-story dependencies)**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-1-01 | Initialize npm package (`package.json`, `tsconfig.json`, `.gitignore`, `engines: >=18.0.0`, `type: module`) with TypeScript strict mode | FR-065, NFR-023 | 3 | typescript-pro | P0 | None |
| S-1-02 | Configure tsup build system: single-file ESM bundle, source maps, shebang injection for CLI binary, size-limit integration targeting < 5MB | NFR-003, FR-063 | 3 | typescript-pro | P0 | S-1-01 |
| S-1-03 | Set up Vitest with Istanbul coverage: `vitest.config.ts`, coverage thresholds at 80% (Sprint 1 floor, raised to 85% in Sprint 2), `test` and `test:coverage` npm scripts | NFR-021 | 2 | typescript-pro | P0 | S-1-01 |
| S-1-04 | Create GitHub Actions CI skeleton: matrix workflow (`ubuntu-latest`, `macos-latest`, `windows-latest`) x Node.js (`18.x`, `20.x`, `22.x`), jobs for lint, typecheck, test, build | FR-064, FR-065 | 5 | cli-developer | P0 | S-1-01 |

**Group A Subtotal: 13 points**

---

**Group B: Core CLI (sequential within group; depends on Group A)**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-1-05 | Commander.js CLI scaffold: `verify` command accepting `<target>` positional arg, bare invocation alias, missing-target help+exit-2 behavior, `bin` entry in `package.json` | FR-001 | 5 | cli-developer | P0 | S-1-01, S-1-02 |
| S-1-06 | `--version` / `-V` flag printing `mcp-verify x.y.z (validates MCP spec 2024-11-05)` to stdout, exit 0; `--help` / `-h` flag with usage, all flags documented, 3+ examples | FR-004, FR-005 | 2 | cli-developer | P0 | S-1-05 |
| S-1-07 | Exit code implementation: `ExitCode` enum (PASS=0, FAIL=1, ERROR=2) enforced at process boundary; all internal errors routed through centralized `exitWithError()` writing to stderr | FR-006, FR-007, FR-008 | 3 | cli-developer | P0 | S-1-05 |
| S-1-08 | `--timeout <ms>` flag: default 10000ms, positive-integer validation, timeout context object passed through entire verification pipeline; test against mock slow server | FR-010, NFR-005, NFR-006 | 3 | cli-developer | P0 | S-1-05, S-1-07 |

**Group B Subtotal: 13 points**

---

**Group C: MCP Protocol Client (parallelizable across transport types; depends on Group A)**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-1-09 | Transport auto-detection: URL scheme parsing (`http://`, `https://` → HTTP+SSE; `stdio://` → stdio; unsupported scheme → exit 2); `TransportType` enum and `detectTransport()` function | FR-011 | 2 | backend-developer | P0 | S-1-01 |
| S-1-10 | stdio transport: spawn child process from `stdio://` path, connect stdin/stdout pipes, line-delimited JSON-RPC framing, SIGTERM+SIGKILL termination sequence, spawning-error handling | FR-012, FR-019 | 8 | backend-developer | P0 | S-1-09 |
| S-1-11 | HTTP+SSE transport: HTTP POST for JSON-RPC requests (`Content-Type: application/json`), SSE stream reading (`Content-Type: text/event-stream`, `data:` prefix parsing), HTTP 4xx/5xx capture, connection cleanup | FR-013, FR-019 | 8 | backend-developer | P0 | S-1-09 |
| S-1-12 | MCP initialization handshake: construct `initialize` request with `protocolVersion`, `capabilities`, `clientInfo`; capture and validate server response structure; send `initialized` notification; record `serverInfo`, declared capabilities, `protocolVersion` in `VerificationContext` | FR-014 | 5 | backend-developer | P0 | S-1-10, S-1-11 |
| S-1-13 | Protocol message exchange: conditional `tools/list` (with cursor pagination), `resources/list` + `resources/read` (first resource), `prompts/list` — only if corresponding capability declared; all responses stored in `VerificationContext` | FR-015, FR-016, FR-017 | 5 | backend-developer | P0 | S-1-12 |
| S-1-14 | Error probe: send unknown-method request (`mcp-verify/probe-unknown-method`) and deliberately malformed JSON; capture responses; label probes in verbose output | FR-018 | 3 | backend-developer | P0 | S-1-12 |

**Group C Subtotal: 31 points**

---

**Group D: Spec Conformance Engine (depends on Group C VerificationContext)**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-1-15 | Shared conformance data model: `ConformanceViolation` type (category, severity, description, field, messageId), `ConformanceResult` type, `ConformanceCategory` enum | FR-032 | 3 | typescript-pro | P0 | S-1-01 |
| S-1-16 | JSON-RPC 2.0 envelope validator: check `jsonrpc: "2.0"`, `id` type, `result`/`error` mutual exclusion, `method` type; violations recorded per-message | FR-021 | 3 | backend-developer | P0 | S-1-15 |
| S-1-17 | JSON-RPC error code range validator: standard range -32700 to -32603; server-defined -32000 to -32099; reserved range warning; positive-code failure | FR-022 | 2 | backend-developer | P0 | S-1-15 |
| S-1-18 | MCP initialization conformance: `protocolVersion` presence/type, `capabilities` object presence/structure, `serverInfo` warning if absent or missing `name` | FR-023 | 3 | backend-developer | P0 | S-1-15, S-1-12 |
| S-1-19 | Capability negotiation correctness: cross-check declared capabilities against actual `tools/list`, `resources/list`, `prompts/list` responses; flag discrepancies | FR-024, FR-035 | 3 | backend-developer | P0 | S-1-15, S-1-13 |
| S-1-20 | Tool schema validators: structure check (name, description, inputSchema presence/type) + content check (JSON Schema draft-07 structure: type=object, properties, required array, additionalProperties cross-check) | FR-025, FR-026 | 5 | backend-developer | P0 | S-1-15, S-1-13 |
| S-1-21 | Resource and prompt protocol validators: resources/list (resources array, uri, name), resources/read (contents array, text/blob fields); prompts/list (prompts array, name, argument.required boolean) | FR-027, FR-028 | 3 | backend-developer | P0 | S-1-15, S-1-13 |
| S-1-22 | Transport protocol validators: stdio (line-delimited check, extraneous output, newline termination); HTTP+SSE (Content-Type, data: prefix, CORS header recording, redirect warning) | FR-029, FR-030 | 5 | backend-developer | P0 | S-1-15, S-1-10, S-1-11 |
| S-1-23 | Error handling conformance: analyze probe responses for unknown-method (expect -32601 error), malformed-JSON (expect -32700 error); flag non-response and wrong codes | FR-031 | 3 | backend-developer | P0 | S-1-15, S-1-14 |
| S-1-24 | Conformance scoring algorithm: weighted category averages (JSON-RPC 20%, Init 25%, Tools 25%, Resources 10%, Prompts 10%, Transport 10%); failure/warning deduction rules; min 0, max 100; total-failure-of-init → score 0 | FR-032, FR-052 | 5 | backend-developer | P0 | S-1-16 through S-1-23 |
| S-1-25 | Spec version declaration: `meta.specVersion: "2024-11-05"` in all outputs; each rule annotated with spec section reference; protocolVersion-based rule skipping foundation | FR-033 | 2 | typescript-pro | P0 | S-1-15 |

**Group D Subtotal: 37 points**

---

**Group E: Terminal Reporter and npm Publish (depends on Groups B, D)**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-1-26 | Terminal reporter: TTY detection, `NO_COLOR` / `--no-color` support, chalk color coding (green ≥80, yellow 50-79, red <50); summary block (target, transport, version, spec, timestamp, score, verdict, duration) | FR-046, FR-047 | 5 | cli-developer | P0 | S-1-15, S-1-07 |
| S-1-27 | Terminal reporter: category score breakdown section with indented violation list; each violation shows level, description, triggering field/message | FR-048 | 3 | cli-developer | P0 | S-1-26 |
| S-1-28 | npm alpha publish workflow: `npm publish --tag alpha`; `mcp-verify@0.1.0-alpha` tag; automated on passing CI against `main` branch | FR-001 | 2 | cli-developer | P0 | All S-1-* |

**Group E Subtotal: 10 points**

---

**Sprint 1 Summary**

| Metric | Value |
|--------|-------|
| Total Stories | 28 (S-1-01 through S-1-28) |
| Total Story Points | 104 |
| Agents | cli-developer, typescript-pro, backend-developer |
| Max Parallel Agents | 3 (Groups A, B, C run concurrently where dependencies allow) |
| Critical Path | S-1-01 → S-1-09 → S-1-10/S-1-11 → S-1-12 → S-1-13 → S-1-15 → S-1-24 → S-1-26 → S-1-28 |

**Execution Order (Parallel Groups):**

```
Week 1:
  Day 1-2:  [S-1-01] (blocking — all others depend on it)
  Day 2-5:  [S-1-02, S-1-03, S-1-04] in parallel (typescript-pro x2, cli-developer)
             [S-1-05, S-1-06] cli-developer after S-1-01
             [S-1-09] backend-developer after S-1-01

Week 1 → Week 2:
  [S-1-10, S-1-11] in parallel (two backend threads, stdio and HTTP+SSE)
  [S-1-07, S-1-08] cli-developer (exit codes, timeout)
  [S-1-15] typescript-pro (data model, unblocks all validators)

Week 2:
  [S-1-12] → [S-1-13, S-1-14] sequential (handshake must precede message exchange)
  [S-1-16 through S-1-23] parallel (validators independent after S-1-15 and protocol data)
  [S-1-24] → [S-1-25] → [S-1-26, S-1-27] → [S-1-28]
```

**Sprint 1 Exit Criteria:**
- `npx mcp-verify http://localhost:3000` produces a conformance score against a reference MCP server
- `npx mcp-verify stdio://./test/fixtures/reference-server.js` produces a conformance score
- Pass/fail exits demonstrated against known-good and known-bad test fixtures
- All 28 stories accepted with > 80% test coverage
- `mcp-verify@0.1.0-alpha` published to npm

---

### Sprint 2: Security Engine — Vulnerability Detection

**Sprint Goal:** Implement the five-category security check engine grounded in 2026 Invariant Labs and Snyk research. Detect command injection susceptibility, CORS wildcard policy, authentication gaps, tool poisoning patterns, and information leakage across all tested MCP servers. Build and validate against known-vulnerable and known-clean test fixture servers for all five categories. Publish as `mcp-verify@0.2.0-alpha`.

**Duration:** 2 weeks
**Sprint Capacity:** 4 dev agents x 2 weeks = estimated 80 story points maximum
**Priority:** All Sprint 2 stories are P0 unless marked.

**Recommended Agents:**
- `security-engineer` — five security check implementations, CVSS scoring, fixture design
- `typescript-pro` — security data model, integration into pipeline, type safety
- `backend-developer` — test fixture servers, HTTP header inspection, protocol integration

---

#### Story Breakdown

**Group A: Security Data Model (foundational — unblocks all checks)**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-2-01 | Security finding data model: `SecurityFinding` type with `id` (SEC-NNN), `checkId`, `severity` (critical/high/medium/low), `cvssScore` (0.0-10.0), `component`, `description`, `remediation`, `confidence` (deterministic/heuristic); `SecurityCheckResult` aggregator | FR-041, FR-044 | 3 | typescript-pro | P0 | S-1-15 |
| S-2-02 | CVSS-adjacent scoring rubric implementation: per-check base score constants (command-injection: 8.1, cors-wildcard: 7.5, auth-gap-public: 9.8, auth-gap-private: 6.5, tool-poisoning: 8.8, info-leakage: 5.3); score attached to each finding | FR-044 | 2 | security-engineer | P0 | S-2-01 |
| S-2-03 | Security engine orchestrator: receives `VerificationContext` from Sprint 1 protocol client; dispatches to all five check functions; aggregates findings into `SecurityCheckResult`; integrates with scoring pipeline | FR-041 | 3 | typescript-pro | P0 | S-2-01, S-1-12 |

**Group A Subtotal: 8 points**

---

**Group B: Five Security Check Implementations (parallelizable after S-2-01)**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-2-04 | Command injection susceptibility detector: analyze each tool's `inputSchema` properties for unconstrained string parameters matching high-risk name patterns (`command`, `cmd`, `exec`, `shell`, `script`, `args`, `argv`, `path`, `file`, `filename`, `dir`, `directory`) or description substrings (`execute`, `run`, `command`, `shell`, `script`, `path to`) without `pattern`/`enum` constraints; severity High, CVSS 8.1, heuristic confidence; skip non-string types and constrained parameters | FR-036 | 8 | security-engineer | P0 | S-2-01 |
| S-2-05 | CORS wildcard policy detector: inspect all HTTP response headers from transport layer for `Access-Control-Allow-Origin: *`; record endpoint URL in finding; severity High, CVSS 7.5, deterministic confidence; skip stdio targets | FR-037 | 3 | security-engineer | P0 | S-2-01, S-1-11 |
| S-2-06 | Authentication gap detector: resolve target host to IP; classify as loopback (`localhost`, `127.0.0.1`, `::1`), private (RFC 1918: 10.x, 172.16-31.x, 192.168.x), or public; check absence of `Authorization` or `WWW-Authenticate` challenge headers in server responses; severity Critical for public, Medium for private; skip loopback and stdio targets; heuristic confidence | FR-038 | 8 | security-engineer | P0 | S-2-01, S-1-11 |
| S-2-07 | Tool poisoning pattern detector: scan tool `name` and `description` fields for: imperative injection patterns (`IGNORE PREVIOUS`, `[SYSTEM]`, `<system>`, `DO NOT` in all-caps, `you must`, `you are now`); XML/HTML system-prompt tags; description length > 2000 characters; Base64 or URL-encoded substrings in tool names; severity Critical, CVSS 8.8, heuristic confidence | FR-039 | 8 | security-engineer | P0 | S-2-01, S-1-13 |
| S-2-08 | Information leakage detector: analyze error probe responses (from FR-018) for: Node.js stack trace patterns (`at Function.`, `at Object.<anonymous>`); absolute filesystem paths (`/home/`, `/var/`, `/usr/`, `C:\Users\`, `C:\Program Files\`); environment variable patterns (`process.env.`, `ENV[`, `$ENV_`, `export `); severity Medium, CVSS 5.3, deterministic confidence; redact matched values in output | FR-040 | 5 | backend-developer | P0 | S-2-01, S-1-14 |

**Group B Subtotal: 32 points**

---

**Group C: Test Fixture Servers (parallelizable; foundational for Group D)**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-2-09 | Vulnerable fixture: `test/fixtures/vulnerable/command-injection-server.ts` — complete MCP server with a `run-shell` tool accepting unconstrained string `command` parameter; valid initialization handshake | FR-045 | 3 | backend-developer | P0 | S-1-12 |
| S-2-10 | Vulnerable fixture: `test/fixtures/vulnerable/cors-wildcard-server.ts` — HTTP+SSE MCP server returning `Access-Control-Allow-Origin: *` on all responses | FR-045 | 2 | backend-developer | P0 | S-1-11 |
| S-2-11 | Vulnerable fixture: `test/fixtures/vulnerable/missing-auth-server.ts` — HTTP+SSE MCP server on a simulated non-loopback address (DNS mock or environment injection) with no auth challenge | FR-045 | 3 | backend-developer | P0 | S-1-11 |
| S-2-12 | Vulnerable fixture: `test/fixtures/vulnerable/tool-poisoning-server.ts` — MCP server with a tool whose description contains `IGNORE PREVIOUS INSTRUCTIONS` prompt injection pattern | FR-045 | 2 | backend-developer | P0 | S-1-12 |
| S-2-13 | Vulnerable fixture: `test/fixtures/vulnerable/info-leakage-server.ts` — MCP server returning full Node.js stack traces in error responses to unknown methods | FR-045 | 2 | backend-developer | P0 | S-1-14 |
| S-2-14 | Clean fixtures: `test/fixtures/clean/` — five counterpart servers (no-injection, correct-cors, authenticated, safe-tool-descriptions, generic-errors); confirm zero findings against each | FR-045 | 5 | backend-developer | P0 | S-2-09 through S-2-13 |

**Group C Subtotal: 17 points**

---

**Group D: Security Test Suite (depends on Groups B + C)**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-2-15 | Integration tests: run all five detectors against all five vulnerable fixtures; assert each detector fires exactly once with correct severity, CVSS score, component, and finding fields | FR-045, NFR-021 | 8 | security-engineer | P0 | S-2-04 through S-2-08, S-2-09 through S-2-13 |
| S-2-16 | False positive tests: run all five detectors against all five clean fixtures; assert zero findings from each; raise coverage gate to 85% | FR-045, NFR-021 | 5 | security-engineer | P0 | S-2-14, S-2-15 |
| S-2-17 | False positive rate validation: run against a curated set of 10 known-clean public MCP servers (or locally-maintained set); assert false positive rate < 5%; document findings in test report | FR-045 (exit criteria) | 5 | security-engineer | P0 | S-2-15, S-2-16 |

**Group D Subtotal: 18 points**

---

**Group E: Terminal Reporter Update and Publish**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-2-18 | Update terminal reporter: add Security Findings section after conformance breakdown; severity-colored headers (Critical=red, High=red, Medium=yellow, Low=yellow); per-finding: severity, CVSS, check ID, component, description, remediation; "[heuristic]" label where applicable; "No security findings detected" in green when clean | FR-041, FR-048 | 5 | backend-developer | P0 | S-2-03, S-1-26 |
| S-2-19 | Update exit code logic: integrate `SecurityCheckResult` into exit code determination; default `failOnSeverity: critical` behavior (only Critical → exit 1) as placeholder for Sprint 3 full config | FR-007 | 2 | typescript-pro | P0 | S-2-03, S-1-07 |
| S-2-20 | npm alpha publish: `mcp-verify@0.2.0-alpha`; end-to-end CLI smoke test (known-vulnerable server produces exit 1, known-clean produces exit 0, both under 10 seconds) | FR-001 (exit criteria) | 2 | typescript-pro | P0 | All S-2-* |

**Group E Subtotal: 9 points**

---

**Sprint 2 Summary**

| Metric | Value |
|--------|-------|
| Total Stories | 20 (S-2-01 through S-2-20) |
| Total Story Points | 84 |
| Agents | security-engineer, typescript-pro, backend-developer |
| Max Parallel Agents | 3 |
| Critical Path | S-2-01 → S-2-03 → S-2-04 through S-2-08 → S-2-15 → S-2-16 → S-2-20 |

**Execution Order:**

```
Week 3:
  Day 1:    [S-2-01] typescript-pro (data model — unblocks all security work)
  Day 1-2:  [S-2-02, S-2-03] security-engineer and typescript-pro in parallel
  Day 2-5:  [S-2-04, S-2-05, S-2-06] security-engineer (three checks in parallel threads)
             [S-2-09, S-2-10, S-2-11] backend-developer (vulnerable fixtures)

Week 4:
  [S-2-07, S-2-08] security-engineer and backend-developer
  [S-2-12, S-2-13, S-2-14] backend-developer (remaining fixtures)
  [S-2-15, S-2-16] → [S-2-17] security-engineer (integration + false-positive tests)
  [S-2-18, S-2-19] → [S-2-20]
```

**Sprint 2 Exit Criteria:**
- All five vulnerability categories detected against reference vulnerable fixtures
- False positive rate < 5% against 10 known-clean servers
- Full CLI run completes in < 10 seconds on a local server
- Test coverage at or above 85%
- `mcp-verify@0.2.0-alpha` published to npm

---

### Sprint 3: CI Integration — GitHub Action + Structured Reporting

**Sprint Goal:** Make MCP Verify a production-grade CI citizen. Deliver the complete reporting suite (JSON with versioned schema, Markdown for audit trails), the configuration system (thresholds, suppression, check modes), and the GitHub Action for drop-in PR gating. Ship `mcp-verify@1.0.0` to npm and publish the GitHub Action to GitHub Marketplace.

**Duration:** 2 weeks
**Sprint Capacity:** 4 dev agents x 2 weeks = estimated 80 story points maximum
**Priority:** P1 stories unless marked. All are required for v1.0.0 GA.

**Recommended Agents:**
- `devops-engineer` — GitHub Action, action.yml, PR comment integration, CI examples, publish workflows
- `typescript-pro` — JSON reporter, schema versioning, configuration system, confidence levels
- `backend-developer` — Markdown reporter, CLI flag extensions, verbose mode, output file
- `frontend-developer` — action.yml polish, PR comment Markdown template quality

---

#### Story Breakdown

**Group A: Extended CLI Flags (parallelizable)**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-3-01 | `--format` flag: register `terminal` (default), `json`, `markdown` values in Commander.js; route to reporter strategy pattern; unrecognized value → exit 2 with valid-values list | FR-002 | 3 | backend-developer | P1 | S-1-05 |
| S-3-02 | `--config` flag and auto-discovery: load `--config <path>` or auto-discover `mcp-verify.json` / `.mcp-verify.json` in CWD; JSON parse error → exit 2; merge config into options with CLI flag override precedence | FR-003 | 3 | typescript-pro | P1 | S-1-05 |
| S-3-03 | `--strict` / `--lenient` mode flags: mutual exclusion guard (both present → exit 2); `checkMode` enum stored in options; passed to heuristic check functions from Sprint 2 for pattern set expansion/reduction | FR-009 | 3 | backend-developer | P1 | S-1-05, S-2-04, S-2-07 |
| S-3-04 | `--transport` override flag and config file `transport` field: force `http` or `stdio` transport regardless of URL scheme; invalid value → exit 2 | FR-020 | 2 | backend-developer | P1 | S-1-09 |
| S-3-05 | `--verbose` flag: enable raw JSON-RPC message logging to stderr; per-check timing; sensitive field redaction (`[REDACTED]`); verbose mode does not contaminate stdout in JSON/Markdown mode | FR-054 | 5 | backend-developer | P1 | S-1-05, S-1-26 |
| S-3-06 | `--output <path>` flag: write full format report to file; terminal summary still printed to stdout; file-write errors → exit 2 stderr; overwrite existing files without prompt | FR-055 | 3 | backend-developer | P1 | S-3-01 |

**Group A Subtotal: 19 points**

---

**Group B: Configuration System (depends on S-3-02)**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-3-07 | Security check suppression: `skip` array in config accepting `checkId` strings; suppressed findings appear in output with `suppressed: true` and `justification`; suppressed findings excluded from exit code; missing justification → warning (not failure) | FR-042 | 5 | typescript-pro | P1 | S-3-02, S-2-03 |
| S-3-08 | Severity threshold (`failOnSeverity`): implement full severity ladder (none/low/medium/high/critical); update exit code logic to respect configured threshold; default `critical`; effective threshold in `meta.thresholds.failOnSeverity` | FR-043 | 3 | typescript-pro | P1 | S-3-02, S-2-19 |
| S-3-09 | Conformance threshold (`conformanceThreshold`): implement 0-100 integer threshold; exit 1 when score < threshold; `meta.thresholds.conformanceThreshold` in JSON output; combined with `failOnSeverity` (either triggers exit 1) | FR-053 | 3 | typescript-pro | P1 | S-3-02, S-1-24 |

**Group B Subtotal: 11 points**

---

**Group C: Reporters (parallelizable after S-3-01)**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-3-10 | Per-check confidence levels: annotate all 14 conformance validators and 5 security checks with `deterministic` or `heuristic`; `confidence` field on all `ConformanceViolation` and `SecurityFinding` objects; `[heuristic]` label in terminal output | FR-034 | 3 | typescript-pro | P1 | S-1-15, S-2-01 |
| S-3-11 | JSON reporter: produce single valid JSON object to stdout in `--format json` mode; `schemaVersion: "1.0"`; complete `meta`, `conformance`, `security`, `summary` structure per FR-049; zero ANSI/decorative output; errors to stderr | FR-049 | 8 | typescript-pro | P1 | S-3-01, S-3-07, S-3-08, S-3-09, S-3-10 |
| S-3-12 | JSON schema versioning: document schema as `docs/report-schema.json` (JSON Schema file); `docs/examples/report-example.json` with a complete valid example; breaking change → major version bump policy documented | FR-050 | 3 | typescript-pro | P1 | S-3-11 |
| S-3-13 | Markdown reporter: GFM output; `# MCP Verify Report` heading; metadata table; summary table; `## Conformance Score` with per-category table; `## Security Findings` per-finding sub-sections; `## Conformance Violations` grouped by category; `## Suppressed Findings`; footer | FR-051 | 8 | backend-developer | P1 | S-3-01, S-3-07, S-3-10 |

**Group C Subtotal: 22 points**

---

**Group D: GitHub Action (depends on Group C reporters)**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-3-14 | `action.yml` definition: `name: MCP Verify`, inputs (`target`, `fail-on-severity`, `conformance-threshold`, `format`, `config`, `timeout`), outputs (`conformance-score`, `security-findings-count`, `pass`), `runs.using: node20`; cross-platform runner compatibility | FR-056 | 5 | devops-engineer | P1 | S-1-28 |
| S-3-15 | Action entry point (`action/index.js`): parse action inputs, invoke CLI, capture exit code and outputs; wrap CLI output to set GitHub Actions output variables; ensure exit code propagation for PR status checks | FR-057 | 5 | devops-engineer | P1 | S-3-14 |
| S-3-16 | PR comment reporter: generate Markdown report (reuse S-3-13 output); post or update PR comment via GitHub REST API using `GITHUB_TOKEN`; unique header marker for update-vs-create detection; skip gracefully if not PR context or token unavailable | FR-058 | 8 | devops-engineer | P1 | S-3-14, S-3-13 |
| S-3-17 | Matrix build support: verify action produces unique artifacts when called in matrix context; no shared file conflicts; document matrix usage with output file naming in README | FR-059 | 3 | devops-engineer | P1 | S-3-14 |
| S-3-18 | Config file auto-discovery in `$GITHUB_WORKSPACE`: action finds `mcp-verify.json` / `.mcp-verify.json` in workspace root before falling back to action input parameters | FR-061 | 2 | devops-engineer | P1 | S-3-14, S-3-02 |
| S-3-19 | CI pipeline example workflows: `docs/examples/github-actions.yml` (complete workflow using `mcp-verify/action@v1`), `docs/examples/gitlab-ci.yml`, `docs/examples/circleci.yml`; each with inline comments; tested against reference server in CI | FR-062 | 5 | devops-engineer | P1 | S-3-14 |

**Group D Subtotal: 28 points**

---

**Group E: v1.0.0 Release (depends on all above)**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-3-20 | Package size gate: configure `size-limit` in `package.json`; assert < 5MB unpacked in CI; fail build if exceeded; measure cold-start time in Docker with cleared npm cache | NFR-003, FR-063 | 3 | devops-engineer | P0 | All S-3-* |
| S-3-21 | Cross-platform CI matrix final validation: all 9 OS x Node.js combinations pass; integration test against live reference MCP server in GitHub Actions CI | NFR-014, NFR-015 | 3 | devops-engineer | P0 | S-3-20 |
| S-3-22 | npm v1.0.0 publish and GitHub Action marketplace publish: `mcp-verify@1.0.0` to npm; create `v1` branch tag for Action; submit to GitHub Marketplace | FR-056 (exit criteria) | 3 | devops-engineer | P0 | S-3-20, S-3-21 |

**Group E Subtotal: 9 points**

---

**Sprint 3 Summary**

| Metric | Value |
|--------|-------|
| Total Stories | 22 (S-3-01 through S-3-22) |
| Total Story Points | 89 |
| Agents | devops-engineer, typescript-pro, backend-developer, frontend-developer |
| Max Parallel Agents | 4 |
| Critical Path | S-3-02 → S-3-07 through S-3-09 → S-3-11 → S-3-14 → S-3-16 → S-3-22 |

**Execution Order:**

```
Week 5:
  Day 1-2:  [S-3-01, S-3-02] in parallel (reporter routing + config system)
             [S-3-10] typescript-pro (confidence levels — unblocks reporters)
  Day 2-5:  [S-3-03, S-3-04, S-3-05, S-3-06] CLI flags (backend-developer)
             [S-3-07, S-3-08, S-3-09] config system (typescript-pro)

Week 6:
  [S-3-11, S-3-13] in parallel (JSON and Markdown reporters)
  [S-3-12] after S-3-11 (schema docs)
  [S-3-14, S-3-15] devops-engineer (action.yml + entry point)
  [S-3-16, S-3-17, S-3-18, S-3-19] after S-3-14 (action features)
  [S-3-20, S-3-21] → [S-3-22]
```

**Sprint 3 Exit Criteria:**
- GitHub Action blocks a PR when a security finding exceeds configured severity
- GitHub Action posts Markdown summary report as a PR comment
- JSON output passes schema validation against `docs/report-schema.json`
- `mcp-verify@1.0.0` published to npm with < 5MB package size
- GitHub Action published to GitHub Marketplace

---

### Sprint 4: Advanced Features — Dashboard + History + Plugins

**Sprint Goal:** Increase long-term stickiness for power users and enterprise teams. Add local-first run history with CLI regression detection, a fully bundled web dashboard with historical score charts and multi-server portfolio view, and a plugin API enabling enterprise custom rules and community extensions. Ship two reference plugin examples and complete documentation. Publish as `mcp-verify@1.1.0`.

**Duration:** 2 weeks
**Sprint Capacity:** 4 dev agents x 2 weeks = estimated 80 story points maximum
**Priority:** P2 features unless marked.

**Recommended Agents:**
- `frontend-developer` — web dashboard (serve command, charts, portfolio view, bundling)
- `typescript-pro` — plugin API, data model, isolation, type exports
- `cli-developer` — history commands (compare-last, baseline, export), serve subcommand integration
- `backend-developer` — SARIF output, documentation, performance optimization, e2e tests

---

#### Story Breakdown

**Group A: Run History System (parallelizable with Group B)**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-4-01 | History storage: create `~/.mcp-verify/history/` on first run; append JSONL record per run to `<encoded-hostname>.jsonl`; stored fields: timestamp, target, conformanceScore, securityFindingsCount, breakdown, toolVersion, specVersion; skip gracefully if not writable; `--no-history` flag | FR-067 | 5 | cli-developer | P2 | S-1-24, S-2-03 |
| S-4-02 | `--compare-last` flag: load previous run from history for target; print comparison block (score delta, new findings, resolved findings); `No previous run found` handling; include `comparison` key in JSON output | FR-072 | 5 | cli-developer | P2 | S-4-01 |
| S-4-03 | `baseline` subcommand: run verification and store as baseline in `~/.mcp-verify/baselines/<encoded-hostname>.json`; `--existing` flag to promote most recent history entry; `--compare-last` defaults to baseline when one exists; `--compare-previous` for immediate-predecessor comparison | FR-073 | 5 | cli-developer | P2 | S-4-01 |
| S-4-04 | `history export` subcommand: `history export <target> --output <file>` and `--all --output <file>`; exported array of run objects with `exportedAt` and `toolVersion` root fields | FR-074 | 3 | cli-developer | P2 | S-4-01 |

**Group A Subtotal: 18 points**

---

**Group B: Web Dashboard (parallelizable with Group A)**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-4-05 | `serve` subcommand: start local HTTP server (default port 4000); `--port` flag; print dashboard URL on start; port-in-use error with `--port` suggestion; SIGINT clean shutdown | FR-066 | 5 | frontend-developer | P2 | S-1-05 |
| S-4-06 | Dashboard data API: local Express (or Node http) server exposing REST endpoints for history data; reads from `~/.mcp-verify/history/`; endpoints: `GET /api/servers`, `GET /api/servers/:hostname/runs`, `GET /api/servers/:hostname/runs/:id` | FR-066, FR-068 | 5 | frontend-developer | P2 | S-4-01, S-4-05 |
| S-4-07 | Historical score charts: time-series line chart (Chart.js or similar bundled library) for overall conformance score (y: 0-100, x: time); per-category toggle-able overlays; handles 1 run to 100+ runs; renders from local data API | FR-068 | 8 | frontend-developer | P2 | S-4-06 |
| S-4-08 | Security findings trend view: stacked bar chart per run (Critical=red, High=orange, Medium=yellow, Low=blue); zero-finding runs shown as empty bars; click-to-expand detail panel showing specific findings | FR-069 | 8 | frontend-developer | P2 | S-4-06 |
| S-4-09 | Score regression detection: highlight regression runs (score drop > 5 points) with marker on chart; hover shows score delta; `--compare-last` CLI integration also shows regression summary | FR-070, FR-072 | 5 | frontend-developer | P2 | S-4-07, S-4-02 |
| S-4-10 | Multi-server portfolio overview: homepage table (server URL, most recent score, finding count, trend arrow, last run timestamp); sortable by score, finding count, last run; de-emphasize servers with no runs in 30 days | FR-071 | 5 | frontend-developer | P2 | S-4-06 |
| S-4-11 | Dashboard asset bundling: fully bundle all JS/CSS/font assets (no CDN); Content Security Policy `default-src 'self'`; zero external network requests; Vite or esbuild bundler integrated into tsup build | FR-075 | 5 | frontend-developer | P2 | S-4-05 through S-4-10 |

**Group B Subtotal: 41 points**

---

**Group C: Plugin System (parallelizable with Groups A and B)**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-4-12 | Plugin configuration format: load `mcp-verify.config.js` / `.mjs` / `.cjs` auto-discovery; `plugins` array (relative paths and npm package names); `rules` object for per-plugin config; ESM and CJS support; syntax/missing-export errors → exit 2 | FR-076 | 5 | typescript-pro | P2 | S-3-02 |
| S-4-13 | Plugin API contract: `PluginContext` type with `target`, `transport`, `initializeResponse`, `toolsList`, `resourcesList`, `promptsList`, `errorProbeResponses`, `config`; `Finding` return type; type exports from main package; API documented | FR-077 | 5 | typescript-pro | P2 | S-4-12, S-2-01 |
| S-4-14 | Plugin finding integration: merge plugin findings into `security.findings` with `source: "plugin"` and `pluginId` fields; apply `failOnSeverity` threshold; support `skip` suppression by `checkId`; plugin findings in all output formats labeled with plugin name | FR-078 | 5 | typescript-pro | P2 | S-4-13, S-2-03 |
| S-4-15 | Plugin isolation: wrap each plugin's `check()` call in try/catch; unhandled exceptions → warning to stderr, plugin skipped; 30-second timeout per plugin via `Promise.race`; plugin failure does not affect exit code | FR-080 | 3 | typescript-pro | P2 | S-4-14 |
| S-4-16 | Reference plugin examples: `examples/plugins/custom-auth-check/` (custom Authorization header check with configurable header name and expected value); `examples/plugins/rate-limit-check/` (rapid-request rate limit probing); each with TypeScript source, `package.json`, `README.md`, CI-tested | FR-079 | 8 | typescript-pro | P2 | S-4-13 |

**Group C Subtotal: 26 points**

---

**Group D: SARIF, Documentation, and Polish**

| Story ID | Description | FR/NFR | Points | Agent | Priority | Deps |
|----------|-------------|--------|--------|-------|----------|------|
| S-4-17 | SARIF 2.1.0 output: `--format sarif` produces SARIF-compliant file; each finding maps to a SARIF `result` with `ruleId`, `message`, `locations` (tool name as location), `level` (error/warning/note); uploadable via `github/codeql-action/upload-sarif@v2` | FR-060 | 8 | backend-developer | P2 | S-3-11 |
| S-4-18 | Full documentation site: complete README (install, quickstart, all CLI flags, exit codes); CLI reference (all commands and flags); GitHub Action reference (all inputs, outputs, examples); plugin authoring guide (API contract, type exports, publishing to npm) | NFR-024 | 8 | backend-developer | P2 | All sprints complete |
| S-4-19 | Performance optimization pass: profile full verification run against remote servers; ensure p95 < 10s on LAN and < 15s on public internet; optimize JSON Schema validation hot path if needed | NFR-001 | 5 | backend-developer | P2 | All S-4-* |
| S-4-20 | End-to-end integration test suite: automated tests against 5 real public MCP servers; run in CI with retry logic; assert score stability (idempotency); memory usage check (< 128MB peak) | NFR-001, NFR-004, NFR-008 | 5 | backend-developer | P2 | All S-4-* |
| S-4-21 | v1.1.0 release: npm publish `mcp-verify@1.1.0`; update GitHub Action `v1` tag; publish plugin examples as `@mcp-verify/example-plugins` package | FR-066 (exit criteria) | 2 | cli-developer | P2 | All S-4-* |

**Group D Subtotal: 28 points**

---

**Sprint 4 Summary**

| Metric | Value |
|--------|-------|
| Total Stories | 21 (S-4-01 through S-4-21) |
| Total Story Points | 113 |
| Agents | frontend-developer, typescript-pro, cli-developer, backend-developer |
| Max Parallel Agents | 4 |
| Critical Path | S-4-01 → S-4-06 → S-4-07 → S-4-11 → S-4-21 (dashboard stream) concurrent with S-4-12 → S-4-16 (plugin stream) |

**Execution Order:**

```
Week 7:
  Day 1-2:  [S-4-01] cli-developer (history storage — unblocks dashboard and compare)
  Day 2-5:  [S-4-05, S-4-06] frontend-developer (serve subcommand + data API)
             [S-4-02, S-4-03] cli-developer (compare-last, baseline)
             [S-4-12, S-4-13] typescript-pro (plugin config + API contract)

Week 8:
  [S-4-07, S-4-08, S-4-09, S-4-10] frontend-developer (dashboard views in parallel)
  [S-4-04] cli-developer (history export)
  [S-4-14, S-4-15, S-4-16] typescript-pro (plugin integration, isolation, examples)
  [S-4-11] frontend-developer (asset bundling — final dashboard task)
  [S-4-17, S-4-18, S-4-19, S-4-20] backend-developer (SARIF, docs, perf, e2e)
  [S-4-21] (final publish — after all stories accepted)
```

**Sprint 4 Exit Criteria:**
- Web dashboard displays historical scores for at least 10 runs per server
- Custom plugin successfully intercepts and adds findings to the report
- Documentation site covers all P0, P1, and P2 features
- End-to-end integration test suite passes against 5 real public MCP servers
- `mcp-verify@1.1.0` published to npm

---

## 3. Milestones

| # | Milestone | Sprint | Exit Criteria | Date Target |
|---|-----------|--------|---------------|-------------|
| M-1 | **Alpha CLI** | Sprint 1 Complete | `npx mcp-verify` produces conformance scores for both stdio and HTTP+SSE transports; terminal reporter shows score + violations; `mcp-verify@0.1.0-alpha` published; > 80% test coverage; CI green on all 9 OS x Node.js matrix combinations | 2026-04-11 (end of Sprint 1, Week 2) |
| M-2 | **Security Engine Complete** | Sprint 2 Complete | All five security check categories detect against vulnerable fixtures with zero false positives on clean fixtures; false positive rate < 5% against 10 known-clean servers; terminal reporter shows security findings; `mcp-verify@0.2.0-alpha` published; > 85% test coverage | 2026-04-25 (end of Sprint 2, Week 4) |
| M-3 | **v1.0.0 GA** | Sprint 3 Complete | JSON and Markdown reporters complete and schema-validated; configuration system (`failOnSeverity`, `conformanceThreshold`, `skip`) operational; `mcp-verify@1.0.0` < 5MB published to npm | 2026-05-09 (end of Sprint 3, Week 6) |
| M-4 | **GitHub Action Published** | Sprint 3 Complete | `mcp-verify/action@v1` published to GitHub Marketplace; PR status check integration confirmed; PR comment reporter posts and updates Markdown summary; matrix build support documented and tested; CI example workflows in `docs/examples/` | 2026-05-09 (end of Sprint 3, Week 6 — concurrent with M-3) |
| M-5 | **Dashboard Launch** | Sprint 4 Complete | `npx mcp-verify serve` runs local dashboard; historical charts display for all tracked servers; portfolio view shows multi-server overview; zero external network requests from dashboard; no CDN dependencies | 2026-05-23 (end of Sprint 4, Week 8) |
| M-6 | **v1.1.0** | Sprint 4 Complete | Plugin API published with full type exports; two reference plugin examples in `examples/plugins/`; SARIF output for GitHub Code Scanning; full documentation site covering all features; end-to-end tests pass against 5 public MCP servers; `mcp-verify@1.1.0` published | 2026-05-23 (end of Sprint 4, Week 8 — concurrent with M-5) |

**Post-Milestone Targets (success metrics from product vision):**

| Target | Measurement Date | Success Criterion |
|--------|-----------------|-------------------|
| npm downloads 5,000 total | 2026-06-23 (30 days post-launch) | npm stats dashboard |
| GitHub stars 200 | 2026-06-23 | GitHub repository |
| GitHub Action integrations 500 | 2026-08-23 (90 days post-launch) | GitHub Marketplace |
| Weekly active runs 10,000 | 2026-07-23 (8 weeks post-Sprint 4) | Opt-in telemetry (if implemented) |

---

## 4. Critical Path Analysis

### Project Minimum Duration

The shortest possible project completion requires the critical path to be executed sequentially without blockage. Based on the dependency chains across all four sprints:

**Critical Path (Sequential Dependency Chain):**

```
[S-1-01] Repository scaffold
    ↓
[S-1-09] Transport auto-detection
    ↓
[S-1-10 + S-1-11] stdio + HTTP+SSE transport (parallel — both must complete)
    ↓
[S-1-12] MCP initialization handshake
    ↓
[S-1-13 + S-1-14] Protocol exchange + error probing (parallel)
    ↓
[S-1-15] Conformance data model
    ↓
[S-1-16 through S-1-23] Conformance validators (parallel — all must complete)
    ↓
[S-1-24] Conformance scoring algorithm
    ↓
[S-1-26] Terminal reporter
    ↓
[S-1-28] Alpha publish (mcp-verify@0.1.0-alpha)
    ↓
[S-2-01] Security finding data model
    ↓
[S-2-04 through S-2-08] Five security checks (parallel — all must complete)
    ↓
[S-2-15 + S-2-16] Integration tests + false positive tests (sequential)
    ↓
[S-2-20] Alpha publish (mcp-verify@0.2.0-alpha)
    ↓
[S-3-02] Config system
    ↓
[S-3-07 + S-3-08 + S-3-09] Suppression, severity threshold, conformance threshold
    ↓
[S-3-11] JSON reporter (most complex reporter; schema must be complete)
    ↓
[S-3-14 + S-3-15] action.yml + action entry point
    ↓
[S-3-16] PR comment reporter
    ↓
[S-3-20 + S-3-21] Size gate + cross-platform validation
    ↓
[S-3-22] v1.0.0 publish + GitHub Action Marketplace
    ↓
[S-4-01] History storage
    ↓
[S-4-06] Dashboard data API
    ↓
[S-4-07 through S-4-10] Dashboard views (parallel — all must complete)
    ↓
[S-4-11] Asset bundling
    ↓
[S-4-21] v1.1.0 publish
```

**Total critical path depth: ~35 sequentially-dependent work units across 8 weeks.**

### What Can Be Parallelized

The following work streams can proceed simultaneously without blocking each other, significantly compressing the schedule:

**Sprint 1 Parallel Streams:**
- Group A (infrastructure) completes early and unblocks all other groups
- stdio transport (S-1-10) and HTTP+SSE transport (S-1-11) are fully independent of each other
- All 8 conformance validators (S-1-16 through S-1-23) can proceed in parallel once S-1-15 is done and protocol data is available

**Sprint 2 Parallel Streams:**
- All five security check implementations (S-2-04 through S-2-08) are independent of each other
- All five vulnerable fixture servers (S-2-09 through S-2-13) can be built simultaneously
- Command injection (S-2-04) and CORS (S-2-05) can start the moment S-2-01 data model is complete

**Sprint 3 Parallel Streams:**
- Extended CLI flags (Group A) can proceed in parallel with reporters (Group C)
- JSON reporter (S-3-11) and Markdown reporter (S-3-13) are independent of each other
- GitHub Action development (Group D) can begin as soon as v0.2.0-alpha CLI is stable
- CI documentation examples (S-3-19) can be authored while action integration is being tested

**Sprint 4 Parallel Streams:**
- History system (Group A) and plugin system (Group C) are fully independent
- Web dashboard development (Group B) depends only on the history storage API (S-4-01)
- SARIF output (S-4-17), documentation (S-4-18), and performance work (S-4-19) can all proceed simultaneously
- Dashboard charts (S-4-07, S-4-08, S-4-09, S-4-10) are independent views, assignable to different agents

### Schedule Compression Opportunities

If schedule compression is required (e.g., a competitive threat accelerates the timeline), the following tactics apply without compromising quality:

1. **Add a fourth backend agent to Sprint 2** to parallelize fixture creation with check implementation, potentially completing the sprint in 1.5 weeks rather than 2.
2. **Begin Sprint 3 CLI flag work (Group A) in Sprint 2 Week 4** if backend-developer capacity is available — these flags have no dependency on security engine completion.
3. **Defer SARIF output (S-4-17) to a v1.1.1 patch release** — it is a P2 feature with no internal dependencies; deferring it saves 8 points in Sprint 4 and allows an earlier v1.1.0 publish.
4. **Defer reference plugin examples (S-4-16) to community contributions** post-launch — the plugin API contract (S-4-13) is the high-value deliverable; example authorship can follow v1.1.0.

### Hard Sequential Constraints That Cannot Be Parallelized

These dependencies are non-negotiable and define the minimum project duration:

- Repository scaffold (S-1-01) must complete before any code is written
- Transport implementations must complete before protocol handshake (S-1-12)
- Protocol handshake must complete before message exchange (S-1-13, S-1-14)
- Protocol data must be available before any conformance or security check can run
- Conformance scoring (S-1-24) must be complete before the terminal reporter is meaningful
- `v0.1.0-alpha` must exist before Sprint 2 security work begins (shared codebase)
- Configuration system (S-3-02) must precede threshold enforcement (S-3-07 through S-3-09)
- JSON reporter schema must be stable before the GitHub Action can reliably produce machine-readable outputs
- History storage (S-4-01) must exist before dashboard data API (S-4-06) can serve it

---

## 5. Risk Register

Risk severity matrix: Likelihood (Low=1, Medium=2, High=3) x Impact (Low=1, Medium=2, High=3) = Risk Score (1-9).

---

### RISK-001 — MCP Specification Evolves Faster Than Conformance Checks

| Field | Value |
|-------|-------|
| **ID** | RISK-001 |
| **Description** | The MCP specification is actively developed on GitHub. New capability types (`sampling`, `roots`), protocol version bumps, or transport changes could invalidate existing conformance checks or miss-score servers that are technically correct for a newer spec version. This is the highest-likelihood risk in the project. |
| **Likelihood** | High (3) |
| **Impact** | Medium (2) |
| **Risk Score** | 6 |
| **Owner** | typescript-pro (spec tracking), Project Manager (escalation) |
| **Mitigation** | Version-pin all spec checks to MCP spec version `2024-11-05`; each conformance rule annotates its spec section reference (enforced in S-1-25). Design conformance engine as a pluggable rule set where each rule declares applicable spec versions. Monitor `modelcontextprotocol/specification` GitHub repository for PRs and releases — treat spec changes as P0 issues triggering a patch release. Tag each `mcp-verify` npm release with the spec version it validates. |
| **Contingency** | If a breaking spec change ships during a sprint, activate a dedicated 2-day remediation cycle: identify affected rules (spec annotation makes this fast), update tests against new spec behavior, publish a patch release with `CHANGELOG` entry documenting spec version support matrix. |
| **Status** | Open — monitoring `modelcontextprotocol/specification` PRs from Sprint 1 onwards |

---

### RISK-002 — Official Tooling Closes the Verification Gap

| Field | Value |
|-------|-------|
| **ID** | RISK-002 |
| **Description** | Anthropic, the MCP SDK maintainers, or a well-funded competitor ships an official `mcp-validate` or similar tool that addresses spec conformance and security. If this happens within 3-6 months of our launch, it directly threatens adoption velocity. A tool from Anthropic with official endorsement would be adopted automatically by much of the ecosystem. |
| **Likelihood** | Medium (2) |
| **Impact** | High (3) |
| **Risk Score** | 6 |
| **Owner** | Project Manager (monitoring), Product Manager (competitive response) |
| **Mitigation** | Speed of delivery is the primary mitigation: publish `mcp-verify@1.0.0` (P1-complete) by the end of Sprint 3 (target 2026-05-09). Build community investment (GitHub stars, plugin ecosystem, CI template library) that creates switching costs before official tooling appears. Differentiate on security depth: official tooling is unlikely to invest in the Invariant Labs/Snyk vulnerability research the way we have; own the security narrative explicitly. Reach out proactively to MCP maintainers to position as complementary (not competing) tooling — PR to the official MCP docs linking `mcp-verify` as the recommended CI gate. |
| **Contingency** | If official tooling ships: pivot positioning to "MCP Verify goes deeper on security than the official tool" and publish a detailed comparison document. Offer to contribute our security check definitions to the official tool as open-source, cementing our role as the security authority in the ecosystem. |
| **Status** | Open — monitoring Anthropic and MCP SDK repositories from Sprint 1 onwards |

---

### RISK-003 — MCP Server Diversity Causes Unreliable Check Coverage

| Field | Value |
|-------|-------|
| **ID** | RISK-003 |
| **Description** | MCP servers vary widely across transport (stdio vs HTTP+SSE), authentication patterns (none, Bearer, OAuth 2.0, mTLS), server frameworks (TypeScript SDK, Python SDK, custom), and deployment contexts (local process, Docker, Kubernetes, remote). A check that works reliably against TypeScript SDK defaults may produce false positives or false negatives against a custom Python implementation. |
| **Likelihood** | High (3) |
| **Impact** | Medium (2) |
| **Risk Score** | 6 |
| **Owner** | backend-developer (test coverage), security-engineer (false positive tracking) |
| **Mitigation** | Test conformance engine against a curated set of 20+ real public MCP servers before v1.0.0 (S-2-17 targets 10; expand to 20 in Sprint 4 e2e tests). Build reference server test fixture suite (known-good and known-bad) as part of the project, versioned and maintained (S-2-09 through S-2-14). Implement per-check confidence scoring exposing deterministic vs. heuristic distinction (FR-034, S-3-10). Provide `--strict` / `--lenient` modes for heuristic check sensitivity tuning (FR-009, S-3-03). |
| **Contingency** | If a major server framework combination produces consistent false positives after v1.0.0 launch: triage within 48 hours, disable the affected heuristic check via a default `skip` entry in that release, publish a patch with fixed pattern matching within 7 days. |
| **Status** | Open — test fixture strategy established in Sprint 2 |

---

### RISK-004 — Security Check False Positives Damage Tool Credibility

| Field | Value |
|-------|-------|
| **ID** | RISK-004 |
| **Description** | A security tool that raises false alarms loses trust permanently. If `mcp-verify` reports a Critical finding against a correctly-implemented server — particularly the tool poisoning or command injection heuristics — early adopters will disable the tool. A single high-profile false positive reported on social media (e.g., Hacker News) can significantly damage adoption trajectory. |
| **Likelihood** | Medium (2) |
| **Impact** | High (3) |
| **Risk Score** | 6 |
| **Owner** | security-engineer (detection quality), Project Manager (community response) |
| **Mitigation** | Every security check must have a documented rationale, true-positive test fixtures, and explicit false-positive test fixtures (S-2-09 through S-2-16). Security findings distinguish "detected pattern" (heuristic, lower confidence) from "confirmed vulnerable" (deterministic). Pre-launch security check review: invite 3-5 MCP ecosystem developers to validate checks against their servers before v1.0.0 release. Track `false-positive` GitHub issue label monthly. Publish detection methodology publicly. |
| **Contingency** | If a high-profile false positive is reported: acknowledge publicly within 24 hours, disable the affected check via a same-day patch release (--skip default), fix the pattern matching within 72 hours, and publish a post-mortem explaining the improvement. |
| **Status** | Open — managed through false positive test suite in Sprint 2 (S-2-16, S-2-17) |

---

### RISK-005 — Developer Friction Prevents Adoption at Zero-Config Promise

| Field | Value |
|-------|-------|
| **ID** | RISK-005 |
| **Description** | The entire value proposition assumes "zero config, zero account, single command." If `npx mcp-verify` requires Node.js version negotiation, has long install times (> 5s cold start), fails on common server configurations, or produces confusing or noisy output for legitimate servers, word-of-mouth will not build and the acquisition funnel stalls. |
| **Likelihood** | Medium (2) |
| **Impact** | High (3) |
| **Risk Score** | 6 |
| **Owner** | cli-developer (UX), devops-engineer (package size), typescript-pro (build optimization) |
| **Mitigation** | Node.js LTS matrix testing (18, 20, 22) enforced in CI from Sprint 1 (S-1-04). Package size hard constraint < 5MB enforced with `size-limit` (S-3-20, NFR-003). Cold-start time measured in CI against Docker clean cache (target < 5s, NFR-002). Actionable error messages enforced via style guide (all exit 2 paths include: what, why, what-to-try, NFR-019). First-run experience testing: 5 developers unfamiliar with the project run `npx mcp-verify` against a test server with no instructions before v1.0.0. |
| **Contingency** | If package size exceeds 5MB during Sprint 3: audit dependency tree, move heavy dependencies to optional peer dependencies, use dynamic import() for non-critical code paths (e.g., dashboard bundler). If cold-start exceeds 5s: investigate npm package metadata, consider splitting into a smaller `mcp-verify-cli` core and an optional `mcp-verify-dashboard` addon. |
| **Status** | Open — size gate enforced from Sprint 3 onwards (S-3-20) |

---

### RISK-006 — stdio Transport Cross-Platform Differences

| Field | Value |
|-------|-------|
| **ID** | RISK-006 |
| **Description** | stdio transport requires spawning a child process, which behaves differently across Linux, macOS, and Windows (shell resolution, executable permissions, line ending differences, signal handling). SIGTERM does not exist on Windows. Path resolution (`./server.js` vs `.\server.js`) differs by platform. This is a lower-likelihood risk but could block Windows users from using stdio targets. |
| **Likelihood** | Medium (2) |
| **Impact** | Medium (2) |
| **Risk Score** | 4 |
| **Owner** | backend-developer (stdio transport, S-1-10) |
| **Mitigation** | CI matrix includes `windows-latest` from Sprint 1 (S-1-04). stdio transport uses Node.js `child_process.spawn` with `shell: false` and platform-appropriate path handling. On Windows: replace SIGTERM with `taskkill /PID /T /F` or use `child_process.kill()` which handles platform differences internally. Test stdio spawning in Windows CI with a PowerShell-based fixture server. |
| **Contingency** | If Windows stdio spawning is unreliable at v1.0.0: document the limitation explicitly in README, mark Windows stdio as "experimental", prioritize HTTP+SSE transport for Windows users. File a tracked issue for v1.1.0 resolution. |
| **Status** | Open — monitored in Sprint 1 CI matrix |

---

### RISK-007 — GitHub Action Marketplace Approval Delay

| Field | Value |
|-------|-------|
| **ID** | RISK-007 |
| **Description** | GitHub Marketplace submission requires manual review for featured listings. The approval process can take 1-4 weeks. An approval delay would push the M-4 milestone (GitHub Action Published) beyond Sprint 3 completion, reducing the CI adoption story at launch. |
| **Likelihood** | Low (1) |
| **Impact** | Medium (2) |
| **Risk Score** | 2 |
| **Owner** | devops-engineer (submission), Project Manager (timeline) |
| **Mitigation** | Submit `action.yml` to Marketplace in Sprint 3 Week 1 (as soon as action.yml is drafted) rather than waiting for Sprint 3 completion. The action is usable without Marketplace listing — document `uses: owner/mcp-verify@v1` direct reference as the primary install path in README. Marketplace listing is a discoverability enhancement, not a functional prerequisite. |
| **Contingency** | If approval is delayed past Sprint 3 end: publish the action as directly usable (`uses: mcp-verify/mcp-verify@v1`) and treat Marketplace listing as a Sprint 4 parallel task. This does not block v1.0.0 GA milestone. |
| **Status** | Open — submission scheduled for Sprint 3 Week 1 |

---

### RISK-008 — TypeScript Strict Mode Incompatibilities in Dependencies

| Field | Value |
|-------|-------|
| **ID** | RISK-008 |
| **description** | Several TypeScript libraries (Commander.js, JSON Schema validators, SSE parsing libraries) may lack complete type definitions or have type definitions incompatible with `strict: true`. This could create a choice between compromising type safety or avoiding otherwise-suitable libraries. |
| **Likelihood** | Low (1) |
| **Impact** | Low (1) |
| **Risk Score** | 1 |
| **Owner** | typescript-pro (type system) |
| **Mitigation** | Evaluate all candidate dependencies for `@types/*` availability and strict-mode compatibility before adoption in Sprint 1. Prefer libraries with bundled TypeScript definitions. Use `// @ts-expect-error` with mandatory justification comment (never bare `any`) if a type gap is unavoidable. |
| **Contingency** | If a critical library has irreconcilable type issues: write a typed wrapper module that exposes only the needed interface with correct types, isolating the incompatibility from the broader codebase. |
| **Status** | Open — dependency audit in Sprint 1 (S-1-01, S-1-02) |

---

## 6. Resource Plan

### Agent Types and Sprint Assignments

| Agent | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 | Role |
|-------|----------|----------|----------|----------|------|
| `cli-developer` | Primary | — | Support | Primary | CLI scaffold, exit codes, flags, history commands |
| `typescript-pro` | Primary | Primary | Primary | Primary | Type system, data models, build config, config system, plugin API |
| `backend-developer` | Primary | Support | Primary | Support | Protocol client, conformance engine, fixtures, reporters, docs |
| `security-engineer` | — | Primary | — | — | Five security checks, CVSS scoring, false positive validation |
| `devops-engineer` | — | — | Primary | — | GitHub Action, CI pipelines, publish workflows, matrix builds |
| `frontend-developer` | — | — | Support | Primary | PR comment template quality, web dashboard, charts, bundling |

### Concurrency Model

Maximum 4 development agents run in parallel at any time. The sprint plans are designed with this constraint:

**Sprint 1:** 3 agents maximum at peak (cli-developer, typescript-pro, backend-developer). Group A infrastructure work can parallelize all three from Day 2 once S-1-01 completes.

**Sprint 2:** 3 agents maximum (security-engineer, typescript-pro, backend-developer). Five security checks assigned to security-engineer sequentially (2 checks per agent-day) with backend-developer building fixtures in parallel.

**Sprint 3:** 4 agents at peak (devops-engineer, typescript-pro, backend-developer, frontend-developer). Peak parallelism occurs in Week 6 when JSON reporter, Markdown reporter, GitHub Action, and CI documentation are developed concurrently.

**Sprint 4:** 4 agents across four independent work streams (dashboard, history, plugin, docs/polish) — this sprint achieves the highest parallelism efficiency of the project.

### Model Tier Assignments

| Tier | Model | Assignment |
|------|-------|------------|
| **Opus** | claude-opus-4 | Security audit and review tasks: final security check validation (S-2-15 through S-2-17), pre-launch false positive review, security-sensitive code review (authentication gap detector, tool poisoning detector), CVSS scoring rationale verification |
| **Sonnet** | claude-sonnet-4-6 (current) | All primary development work: CLI implementation, protocol client, conformance engine, security check implementations, reporters, GitHub Action, dashboard, plugin system |
| **Haiku** | claude-haiku | Documentation authoring (S-4-18), inline code comments, CI example workflows (S-3-19), CHANGELOG entries, README updates, help text copy |

**Tier assignment rationale:**
- Opus is reserved for security-critical judgment calls where nuanced reasoning about vulnerability patterns, false positive/negative tradeoffs, and CVSS scoring is required. Its higher cost is justified by the risk that a credibility-damaging false positive represents.
- Sonnet handles all standard development work. Its balance of capability and speed is appropriate for the TypeScript-heavy implementation work across all four sprints.
- Haiku handles documentation and formatting tasks where speed and cost efficiency are more important than deep technical reasoning.

### Capacity Planning

| Sprint | Story Points | Available Agent-Days | Points per Agent-Day |
|--------|-------------|---------------------|---------------------|
| Sprint 1 | 104 | 30 (3 agents × 10 days) | 3.5 |
| Sprint 2 | 84 | 30 (3 agents × 10 days) | 2.8 |
| Sprint 3 | 89 | 40 (4 agents × 10 days) | 2.2 |
| Sprint 4 | 113 | 40 (4 agents × 10 days) | 2.8 |

Note: Sprint 1 has the highest points-per-agent-day ratio, reflecting that infrastructure and scaffolding stories are generally 1-3 points each and can be completed quickly. Sprint 4 has the highest total story points but 4 agents, many of whom work in fully parallel streams (dashboard, plugins, CLI, docs).

**Velocity assumption:** 3 story points per agent per day (Fibonacci scale). This accounts for code review, test writing, documentation, and integration overhead. Stories estimated at 8 points (e.g., stdio transport, HTTP+SSE transport) are 2-3 agent-day items reflecting genuine complexity.

---

## 7. Definition of Done

### Story-Level Definition of Done

Every story must meet all of the following before it is accepted:

- [ ] Implementation is complete and matches all acceptance criteria in the referenced FR
- [ ] TypeScript compiles with `tsc --noEmit --strict` zero errors
- [ ] All new code is covered by Vitest unit tests (no story accepted if it reduces coverage below the sprint's floor)
- [ ] No `npm audit` findings at High or Critical severity in runtime dependencies
- [ ] ESLint passes with zero errors (no `@typescript-eslint/no-explicit-any` violations without justification comment)
- [ ] All new public API types are exported and documented with JSDoc
- [ ] CLI help text is updated if the story adds or modifies a flag or command
- [ ] Story author has manually tested the acceptance criteria against a real MCP server (or the appropriate test fixture)

### Sprint-Level Definition of Done

Each sprint is complete when:

**Sprint 1:**
- [ ] All 28 stories (S-1-01 through S-1-28) meet story-level DoD
- [ ] `npx mcp-verify http://localhost:3000` produces a conformance score
- [ ] `npx mcp-verify stdio://./test/fixtures/reference-server.js` produces a conformance score
- [ ] Known-good server → exit 0; known-bad server → exit 1; unreachable server → exit 2
- [ ] Vitest coverage >= 80% on all source files
- [ ] CI is green across all 9 OS x Node.js matrix combinations
- [ ] `mcp-verify@0.1.0-alpha` is published and `npx mcp-verify --version` works
- [ ] No P0 open bugs

**Sprint 2:**
- [ ] All 20 stories (S-2-01 through S-2-20) meet story-level DoD
- [ ] All five vulnerability categories detected against respective vulnerable fixtures
- [ ] Zero findings against all five clean fixtures
- [ ] False positive rate < 5% against 10 known-clean servers (documented test report)
- [ ] Full CLI run completes in < 10 seconds on a local server
- [ ] Vitest coverage >= 85% on all source files
- [ ] `mcp-verify@0.2.0-alpha` is published
- [ ] No P0 open bugs

**Sprint 3:**
- [ ] All 22 stories (S-3-01 through S-3-22) meet story-level DoD
- [ ] `--format json` output passes validation against `docs/report-schema.json`
- [ ] `--format markdown` output renders correctly in GitHub PR comment preview
- [ ] Configuration file `failOnSeverity` and `conformanceThreshold` correctly gate exit code
- [ ] `skip` suppression marks findings as `suppressed: true` without removing them from output
- [ ] GitHub Action blocks PR when thresholds exceeded (tested in test repository)
- [ ] GitHub Action posts and updates PR comment with Markdown report
- [ ] npm package unpacked size < 5MB (size-limit CI gate passes)
- [ ] Cross-platform matrix: all 9 combinations green
- [ ] `mcp-verify@1.0.0` published to npm
- [ ] GitHub Action published to GitHub Marketplace (or submission confirmed in review)
- [ ] No P0 or P1 open bugs

**Sprint 4:**
- [ ] All 21 stories (S-4-01 through S-4-21) meet story-level DoD
- [ ] `npx mcp-verify serve` starts dashboard; historical charts render for 10+ run history
- [ ] `--compare-last` prints regression summary when score drops
- [ ] `baseline` subcommand stores and is correctly used by future `--compare-last` runs
- [ ] Plugin API loads external plugin, passes context, and integrates findings into report
- [ ] Plugin isolation: an exception-throwing plugin does not crash the tool
- [ ] SARIF output passes SARIF 2.1.0 schema validation
- [ ] End-to-end tests pass against 5 real public MCP servers
- [ ] p95 execution time < 10 seconds on LAN connections
- [ ] Peak memory usage < 128MB on servers with 20+ tools
- [ ] Full documentation site covers all P0, P1, and P2 features
- [ ] `mcp-verify@1.1.0` published to npm
- [ ] No P0, P1, or P2 open bugs against v1.1.0 scope

### Project-Level Definition of Done

The MCP Verify project is complete when:

- [ ] All four sprints meet their sprint-level Definition of Done
- [ ] All six milestones (M-1 through M-6) have been formally accepted
- [ ] `mcp-verify@1.1.0` is stable on npm with no Critical or High open issues
- [ ] GitHub Action `v1` tag is published and marketplace listing is live
- [ ] Full documentation site covers all P0, P1, and P2 features (CLI reference, Action reference, plugin guide)
- [ ] All 80 functional requirements (FR-001 through FR-080) are implemented or explicitly deferred with documented rationale
- [ ] All 24 non-functional requirements (NFR-001 through NFR-024) are verified with documented evidence
- [ ] Risk register has been reviewed: RISK-001 through RISK-008 assessed for residual status
- [ ] Test coverage >= 85% across all source files
- [ ] Zero Critical or High npm audit findings
- [ ] Lessons learned document created capturing what worked well and what to improve in future sprints
- [ ] Community contribution guidelines (CONTRIBUTING.md) published enabling external plugin and rule contributions
- [ ] Post-launch monitoring plan in place: GitHub issue triage cadence, false-positive rate tracking, npm download tracking

---

*Project Plan authored by Project Manager (Tier 3 PM) for MCP Verify PDLC Project.*
*Document drives all sprint execution. Changes to scope, priority, or timeline require Project Manager review and stakeholder sign-off.*
*Next phase: Sprint 1 execution. Hand this document to the Scrum Master for sprint kickoff.*
