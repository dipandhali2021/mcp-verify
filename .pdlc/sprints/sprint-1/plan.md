# Sprint 1 Plan — MCP Verify

**Sprint Number:** 1 of 4
**Sprint Duration:** 2-week equivalent (simulated)
**Plan Date:** 2026-03-28
**Status:** Committed — Ready for Execution
**npm Target:** `mcp-verify@0.1.0-alpha`

**References:**
- `.pdlc/architecture/project-plan.md` — Story breakdown, WBS, Sprint 1 story set (S-1-01 through S-1-28)
- `.pdlc/architecture/system-design.md` — Directory structure, component architecture, data model
- `.pdlc/architecture/api-spec.md` — CLI interface, TypeScript interfaces, exit code spec
- `.pdlc/architecture/requirements.md` — FR-001 through FR-035, FR-046-048, FR-052, FR-063-065
- `.pdlc/architecture/sprint-structure.md` — Velocity planning, Definition of Done, ceremony templates
- `.pdlc/architecture/tech-stack-decision.md` — Technology decisions, agent assignments
- `.pdlc/architecture/adr/001-initial-architecture-review.md` — Architecture issues addressed in this sprint

---

## Table of Contents

1. [Sprint Goal](#1-sprint-goal)
2. [Team Composition](#2-team-composition)
3. [Velocity and Capacity](#3-velocity-and-capacity)
4. [Committed Story Set](#4-committed-story-set)
5. [Execution Waves](#5-execution-waves)
6. [Dependency Map](#6-dependency-map)
7. [Definition of Done](#7-definition-of-done)
8. [Sprint Risk Register](#8-sprint-risk-register)
9. [Architecture Decisions Applied from ADR-001](#9-architecture-decisions-applied-from-adr-001)
10. [Exit Criteria](#10-exit-criteria)
11. [Self-Improvement Actions Applied](#11-self-improvement-actions-applied)

---

## 1. Sprint Goal

Build a working CLI that can connect to any MCP server over stdio or HTTP+SSE, perform the MCP handshake, validate spec conformance across all protocol layers, compute a conformance score (0-100), and display results in the terminal with pass/fail exit codes. Publish as `mcp-verify@0.1.0-alpha`.

**Outcome statement:** By the end of Sprint 1, a developer can run `npx mcp-verify http://localhost:3000` against any MCP server and receive a structured, color-coded terminal report with a numeric conformance score and a deterministic exit code. Both transport types are functional. All seven conformance validator categories produce findings. The package is published to npm.

---

## 2. Team Composition

| Role | Agent | Sprint 1 Focus |
|------|-------|----------------|
| Scrum Master | scrum-master | Ceremony facilitation, impediment removal, burndown tracking, agent log |
| Product Owner | product-manager | Backlog priority, acceptance decisions, sprint exit criteria sign-off |
| CLI Developer | cli-developer | Commander.js scaffold, verify command, --help/--version flags, exit code wiring, terminal reporter, npm publish pipeline |
| TypeScript Pro | typescript-pro | Package scaffold, tsconfig, build system, core type definitions, conformance data model, scoring algorithm, spec version declaration |
| Backend Developer | backend-developer | MCP protocol client (stdio and HTTP+SSE transports), initialization handshake, tool/resource/prompt listing, all seven conformance validators, test fixtures |
| DevOps Engineer | devops-engineer | Repository initialization, GitHub Actions CI matrix, Vitest configuration, size-limit enforcement, npm publish workflow |
| Code Reviewer | code-reviewer | PR reviews (on-call), TypeScript strict mode enforcement, module boundary verification |
| Technical Writer | technical-writer | CLI help text review, initial README structure (on-call) |

**Active full-time agents:** cli-developer, typescript-pro, backend-developer, devops-engineer
**On-call support agents:** code-reviewer, technical-writer

---

## 3. Velocity and Capacity

### Baseline

| Metric | Value | Rationale |
|--------|-------|-----------|
| Sprint planned points | 30 | Conservative baseline per sprint-structure.md §3. New team, infrastructure overhead, protocol uncertainty. |
| Utilization target | 70-75% | Capacity buffer reserved for bug discovery, story growth, and cross-agent coordination. |
| Available capacity (estimated) | 104 points in backlog | Total Sprint 1 backlog per project-plan.md. Committed set is 30 points. |
| Estimation scale | Fibonacci (1, 2, 3, 5, 8, 13) | Relative complexity and uncertainty, not elapsed time. |

### Capacity Buffer Policy

The 25-30% buffer (approximately 7-9 points) is reserved for:
- First end-to-end integration surprises when transport, protocol, validators, and reporter are wired together
- MCP handshake complexity revealed during stdio and HTTP+SSE implementation
- Test fixture creation overhead not captured in validator story estimates
- Cross-agent review cycles (code-reviewer engagement)

No stories are added to the sprint mid-session to fill buffer. Buffer is a shock absorber, not unused capacity.

### Velocity Tracking Format

```
Planned:    30 points
Delivered:  [to be filled at sprint close]
Carried over: [story IDs and rationale, to be filled at sprint close]
Velocity trend: Sprint 1 = [actuals]
```

---

## 4. Committed Story Set

The committed set of 30 points covers the critical path from project scaffold through npm publish. Stories outside the committed set are tracked as backlog and pulled in if capacity allows after the critical path is delivered.

### Group A: Infrastructure Setup

These stories have no inter-story dependencies and establish the foundation all other work requires. S-1-01 is the single blocking story for the entire sprint — it must complete before any other story can start.

| ID | Story Title | Description | Agent | Points | Priority | Dependencies | FR/NFR References |
|----|-------------|-------------|-------|--------|----------|--------------|-------------------|
| S-1-01 | Project scaffold | Initialize npm package with `package.json` (name: `mcp-verify`, version: `0.1.0-alpha`, `type: module`, `engines: >=18.0.0`), `tsconfig.json` with `strict: true`, `target: ES2022`, `module: CommonJS`, `moduleResolution: node`, `.gitignore`, directory structure per system-design.md §5 | typescript-pro | 3 | P0 | None | FR-065, NFR-023 |
| S-1-02 | Build system configuration | Configure tsup: single-file CJS bundle, `entry: src/cli.ts`, `target: node18`, shebang banner injection, `noExternal: [/.*/]`, `dts: src/plugins/types.ts`, size-limit integration targeting < 5MB package | typescript-pro | 3 | P0 | S-1-01 | NFR-003, FR-063 |
| S-1-03 | Test framework setup | Configure Vitest with Istanbul provider: `vitest.config.ts`, coverage thresholds at 80% lines/functions/statements and 75% branches (Sprint 1 floor; raised to 85%/80% in Sprint 2), `testTimeout: 15000`, `test` and `test:coverage` npm scripts | typescript-pro | 2 | P0 | S-1-01 | NFR-021 |
| S-1-04 | CI skeleton | GitHub Actions workflow: matrix `ubuntu-latest x Node.js [18.x, 20.x, 22.x]`, jobs for lint (ESLint + `tsc --noEmit --strict`), test (`vitest run`), and build (`tsup`); triggered on push to `main` and all pull requests | devops-engineer | 5 | P0 | S-1-01 | FR-064, FR-065 |

**Group A Subtotal: 13 points**

---

### Group B: Core CLI

These stories depend on Group A and establish the user-facing CLI contract. They are largely sequential within the group — the Commander.js scaffold (S-1-05) must precede the flags and exit code stories.

| ID | Story Title | Description | Agent | Points | Priority | Dependencies | FR/NFR References |
|----|-------------|-------------|-------|--------|----------|--------------|-------------------|
| S-1-05 | Commander.js CLI scaffold | `verify` command accepting `<target>` positional argument, bare invocation alias (`mcp-verify <target>` = `mcp-verify verify <target>`), missing-target behavior (print help, exit 2), `bin` entry in `package.json` pointing to `dist/cli.js` | cli-developer | 5 | P0 | S-1-01, S-1-02 | FR-001 |
| S-1-06 | Version and help flags | `--version` / `-V` prints `mcp-verify x.y.z (validates MCP spec 2024-11-05)` to stdout, exit 0; `--help` / `-h` prints structured usage with all flags, types, defaults, descriptions, and at least three example invocations, exit 0 | cli-developer | 2 | P0 | S-1-05 | FR-004, FR-005 |
| S-1-07 | Exit code implementation | `ExitCode` enum (`PASS=0`, `FAIL=1`, `ERROR=2`) enforced at the process boundary; centralized `exitWithError()` function writing to stderr; all internal error paths route through this function; exit 2 on invalid target, config parse error, or transport error | cli-developer | 3 | P0 | S-1-05 | FR-006, FR-007, FR-008 |
| S-1-08 | Timeout flag | `--timeout <ms>` flag with default 10000ms, positive-integer validation (exit 2 on invalid), timeout context object threaded through the entire verification pipeline; tested against a mock slow server fixture | cli-developer | 3 | P0 | S-1-05, S-1-07 | FR-010, NFR-005, NFR-006 |

**Group B Subtotal: 13 points**

---

### Group C: MCP Protocol Client

These stories depend on Group A and implement the protocol engine. They can run in parallel with Group B. S-1-09 (transport auto-detection) is the internal dependency that unblocks S-1-10 and S-1-11.

| ID | Story Title | Description | Agent | Points | Priority | Dependencies | FR/NFR References |
|----|-------------|-------------|-------|--------|----------|--------------|-------------------|
| S-1-09 | Transport auto-detection | URL scheme parsing: `http://` and `https://` route to HTTP+SSE; `stdio://` routes to stdio; unsupported scheme exits with code 2; `TransportType` enum and `detectTransport(url: string): TransportType` function in `src/transport/detect.ts` | backend-developer | 2 | P0 | S-1-01 | FR-011 |
| S-1-10 | StdioTransport implementation | Spawn child process from `stdio://` path, connect stdin/stdout pipes, line-delimited JSON-RPC framing (newline-terminated messages), SIGTERM + 2-second SIGKILL termination sequence, spawning-error handling (file not found, permission denied) | backend-developer | 8 | P0 | S-1-09 | FR-012, FR-019 |
| S-1-11 | HttpTransport implementation | HTTP POST for JSON-RPC requests with `Content-Type: application/json`; SSE stream reading with `Content-Type: text/event-stream` and `data:` prefix parsing; HTTP 4xx/5xx capture; collect all response headers into `TransportMetadata`; connection cleanup on close | backend-developer | 8 | P0 | S-1-09 | FR-013, FR-019 |
| S-1-12 | MCP initialization handshake | Construct `initialize` request with `protocolVersion: "2024-11-05"`, empty `capabilities`, `clientInfo: { name: "mcp-verify", version: "<tool-version>" }`; capture server response; send `initialized` notification; record `serverInfo`, declared capabilities, and `protocolVersion` in `VerificationContext`; distinguish transport timeout (exit 2) from malformed response (score 0) per ADR-001 §1.5 | backend-developer | 5 | P0 | S-1-10, S-1-11 | FR-014 |
| S-1-13 | Protocol message exchange | Conditional `tools/list` (with cursor-based pagination loop), `resources/list` + `resources/read` (first resource only), `prompts/list` — each executed only if the corresponding capability was declared in the initialize response; all responses stored in `ProtocolExchangeRecord`; 500-tool cap enforced per ADR-001 §3.1 | backend-developer | 5 | P0 | S-1-12 | FR-015, FR-016, FR-017 |
| S-1-14 | Error probe | Send unknown-method request (`mcp-verify/probe-unknown-method`) and deliberately malformed JSON via `transport.sendRaw()`; capture both responses; label probes as `[probe]` in verbose output; store in `ProtocolExchangeRecord.unknownMethodProbeResponse` and `malformedJsonProbeResponse` | backend-developer | 3 | P0 | S-1-12 | FR-018 |

**Group C Subtotal: 31 points**

---

### Group D: Spec Conformance Engine

These stories depend on Group C (specifically on the `ProtocolExchangeRecord` produced by S-1-12 through S-1-14). S-1-15 (conformance data model) is the internal dependency that unblocks all validators and must be delivered before any validator work begins.

| ID | Story Title | Description | Agent | Points | Priority | Dependencies | FR/NFR References |
|----|-------------|-------------|-------|--------|----------|--------------|-------------------|
| S-1-15 | Conformance data model | `ConformanceViolation` type (category, severity, description, field, messageId); `ConformanceResult` aggregator type; `ConformanceCategory` enum (`jsonRpc`, `initialization`, `tools`, `resources`, `prompts`, `transport`, `errorHandling`); placed in `src/types/conformance.ts` | typescript-pro | 3 | P0 | S-1-01 | FR-032 |
| S-1-16 | JSON-RPC 2.0 envelope validator | Check `jsonrpc: "2.0"` field presence and value; `id` type (string or integer, not null on requests); `result`/`error` mutual exclusion on responses; `method` type on requests; violations recorded per-message with field reference; located at `src/validators/conformance/jsonrpc.ts` | backend-developer | 3 | P0 | S-1-15 | FR-021 |
| S-1-17 | JSON-RPC error code validator | Standard range -32700 to -32603 (validate known codes: -32700 Parse Error, -32600 Invalid Request, -32601 Method Not Found, -32602 Invalid Params, -32603 Internal Error); server-defined range -32000 to -32099; reserved ranges (-32099 to -32000 overlap note); positive code as failure; located at `src/validators/conformance/error-codes.ts` | backend-developer | 2 | P0 | S-1-15 | FR-022 |
| S-1-18 | Initialization conformance validator | `protocolVersion` presence and string type; `capabilities` object presence and structure; `serverInfo` warning if absent or missing `name` field; cross-check `initializedSent` flag; located at `src/validators/conformance/initialization.ts` | backend-developer | 3 | P0 | S-1-15, S-1-12 | FR-023 |
| S-1-19 | Capability negotiation validator | Cross-check declared capabilities against actual protocol responses: if `tools` capability declared but `tools/list` returns an error, flag as violation; same for `resources` and `prompts`; flag undeclared capabilities that nonetheless respond successfully; unknown-method graceful handling check; located at `src/validators/conformance/capabilities.ts` | backend-developer | 3 | P0 | S-1-15, S-1-13 | FR-024, FR-035 |
| S-1-20 | Tool schema validator | Structure check: `name` (string, required), `description` (string, recommended — warning if absent), `inputSchema` (object, required) presence and type validation per tool; content check: `inputSchema` must have `type: "object"`, `properties` (object), valid `required` array (strings referencing defined properties), `additionalProperties` check; validates against JSON Schema draft-07 structural rules without external Ajv dependency; benchmark with 100-tool fixture per ADR-001 §3.1; located at `src/validators/conformance/tools.ts` | backend-developer | 5 | P0 | S-1-15, S-1-13 | FR-025, FR-026 |
| S-1-21 | Resource and prompt validators | Resources: `resources/list` response has `resources` array, each with `uri` (string, required) and `name` (string, required); `resources/read` response has `contents` array with valid `text` or `blob` fields; Prompts: `prompts/list` response has `prompts` array, each with `name` (string, required), `arguments` array where each argument has `required` as boolean; located at `src/validators/conformance/resources.ts` and `src/validators/conformance/prompts.ts` | backend-developer | 3 | P0 | S-1-15, S-1-13 | FR-027, FR-028 |
| S-1-22 | Transport protocol validator | StdioTransport: line-delimited check (each message ends with `\n`), extraneous output detection (non-JSON lines on stdout), newline termination validation; HttpTransport: `Content-Type: application/json` on POST responses, SSE `Content-Type: text/event-stream`, `data:` prefix presence on SSE events, CORS header recording, redirect warning (3xx responses); located at `src/validators/conformance/transport.ts` | backend-developer | 5 | P0 | S-1-15, S-1-10, S-1-11 | FR-029, FR-030 |
| S-1-23 | Error handling conformance validator | Analyze probe responses: unknown-method probe should produce JSON-RPC error with code -32601 (Method Not Found); malformed-JSON probe should produce JSON-RPC error with code -32700 (Parse Error); flag non-response (null response) as conformance failure; flag wrong error codes; located at `src/validators/conformance/error-handling.ts` | backend-developer | 3 | P0 | S-1-15, S-1-14 | FR-031 |
| S-1-24 | Conformance scoring algorithm | Weighted category averages: JSON-RPC 20%, Initialization 25%, Tools 25%, Resources 10%, Prompts 10%, Transport 10%; failure deduction rules (warning = -5 per violation, failure = -20 per violation within category, capped at 0 per category); total initialization failure locks overall score to 0; produces integer 0-100; located at `src/scoring/engine.ts` | backend-developer | 5 | P0 | S-1-16 through S-1-23 | FR-032, FR-052 |
| S-1-25 | Spec version declaration | `meta.specVersion: "2024-11-05"` emitted in all output types; each check result annotated with `specReference` field (MCP spec section identifier); `protocolVersion`-based rule-skipping foundation (skip checks not applicable to the server's declared version); `CheckResult` shape uses `specVersion` and `specReference` fields per ADR-001 §1.2 canonical definition; located in `src/types/conformance.ts` extension | typescript-pro | 2 | P0 | S-1-15 | FR-033 |

**Group D Subtotal: 37 points**

---

### Group E: Terminal Reporter and npm Publish

These stories depend on Groups B and D. The reporter needs the exit code infrastructure from Group B and the `VerificationResult`/`ConformanceResult` types from Group D.

| ID | Story Title | Description | Agent | Points | Priority | Dependencies | FR/NFR References |
|----|-------------|-------------|-------|--------|----------|--------------|-------------------|
| S-1-26 | Terminal reporter — summary block | TTY detection via `process.stdout.isTTY`; `NO_COLOR` environment variable and `--no-color` flag support; chalk color coding (green for score >= 80, yellow for 50-79, red for < 50); summary block output: target URL, transport type, server version, spec version, timestamp, conformance score (large formatted), overall verdict, total duration | cli-developer | 5 | P0 | S-1-15, S-1-07 | FR-046, FR-047 |
| S-1-27 | Terminal reporter — category breakdown | Category score breakdown section rendered below the summary block; per-category score bar with indented violation list; each violation displays: level (FAIL/WARN), description, triggering field or message reference; "No violations in this category" in green when clean; "No security findings" placeholder section (security engine lands in Sprint 2) | cli-developer | 3 | P0 | S-1-26 | FR-048 |
| S-1-28 | npm alpha publish workflow | GitHub Actions job: `npm publish --tag alpha`; tag `mcp-verify@0.1.0-alpha`; triggered automatically on merge to `main` branch when all CI jobs pass; end-to-end CLI smoke test in CI pipeline (verify against reference fixture, assert exit 0, assert score output present) | devops-engineer | 2 | P0 | S-1-01 through S-1-27 | FR-001 (exit criteria) |

**Group E Subtotal: 10 points**

---

### Sprint 1 Story Summary

| Group | Stories | Points | Agents |
|-------|---------|--------|--------|
| A: Infrastructure | S-1-01, S-1-02, S-1-03, S-1-04 | 13 | typescript-pro, devops-engineer |
| B: Core CLI | S-1-05, S-1-06, S-1-07, S-1-08 | 13 | cli-developer |
| C: Protocol Client | S-1-09, S-1-10, S-1-11, S-1-12, S-1-13, S-1-14 | 31 | backend-developer |
| D: Conformance Engine | S-1-15, S-1-16, S-1-17, S-1-18, S-1-19, S-1-20, S-1-21, S-1-22, S-1-23, S-1-24, S-1-25 | 37 | backend-developer, typescript-pro |
| E: Reporter + Publish | S-1-26, S-1-27, S-1-28 | 10 | cli-developer, devops-engineer |
| **Total** | **28 stories** | **104 points in backlog** | |
| **Committed** | **Critical path through Wave 5** | **30 points** | |

**Committed set (30 points):** S-1-01 (3), S-1-02 (3), S-1-03 (2), S-1-04 (5), S-1-05 (5), S-1-07 (3), S-1-09 (2), S-1-12 (5), S-1-15 (3), S-1-24 (5), S-1-26 (3) = 39 points — see note below.

> **Commitment note:** The sprint baseline is 30 planned points with 70-75% utilization targeting. The full 28-story set represents the intended sprint scope at 104 points but is delivered across parallel agent tracks — four agents working concurrently means the effective committed set is the entire sprint backlog. All 28 stories are P0 per the project plan. No stories are intentionally deferred. The 30-point velocity figure is the single-agent sequential baseline reference. With four active development agents, full sprint delivery is the goal. Stories not completed are carried into Sprint 2 as the highest-priority items.

---

## 5. Execution Waves

Stories are grouped into parallel execution waves based on their dependency chains. Agents begin the next wave as soon as their dependencies in the prior wave are satisfied — they do not wait for all stories in a wave to complete before advancing.

### Wave 1 — Unblocked (Day 1-2)

No dependencies. Start immediately on sprint day 1.

| Story | Agent | Points | Deliverable |
|-------|-------|--------|-------------|
| S-1-01 | typescript-pro | 3 | `package.json`, `tsconfig.json`, `.gitignore`, directory skeleton per system-design.md §5 |

S-1-01 is the single blocking story for the sprint. All other work depends on the repository existing with correct configuration. It is the highest-priority story of the sprint and must complete on Day 1 to prevent a cascade delay.

### Wave 2 — Unblocked After S-1-01 (Day 2-5)

These stories depend only on S-1-01 and can run in parallel across agents.

| Story | Agent | Points | Deliverable |
|-------|-------|--------|-------------|
| S-1-02 | typescript-pro | 3 | `tsup.config.ts`, verified `npm run build` produces `dist/cli.js` with shebang |
| S-1-03 | typescript-pro | 2 | `vitest.config.ts`, verified `npm test` and `npm run test:coverage` run successfully |
| S-1-04 | devops-engineer | 5 | `.github/workflows/ci.yml` with lint, typecheck, test, build jobs across OS x Node.js matrix |
| S-1-05 | cli-developer | 5 | `src/cli.ts` with Commander.js scaffold, verify command routing, missing-target behavior |
| S-1-09 | backend-developer | 2 | `src/transport/detect.ts` with `detectTransport()` and `TransportType` enum |
| S-1-23 | typescript-pro | 3 | `src/types/conformance.ts` with `ConformanceViolation`, `ConformanceResult`, `ConformanceCategory` |

Note: S-1-23 in this plan refers to the shared conformance data model (project-plan.md labels this S-1-15). Story IDs are mapped to the project-plan canonical numbering in the committed story set table above.

### Wave 3 — Unblocked After Wave 2 (Day 3-7)

| Story | Agent | Points | Deliverable |
|-------|-------|--------|-------------|
| S-1-06 | cli-developer | 2 | `--version` and `--help` flags verified against acceptance criteria |
| S-1-07 | cli-developer | 3 | `ExitCode` enum, `exitWithError()`, all error paths routing through centralized handler |
| S-1-10 | backend-developer | 8 | `src/transport/stdio.ts` — StdioTransport class implementing Transport interface |
| S-1-11 | backend-developer | 8 | `src/transport/http.ts` — HttpTransport class implementing Transport interface |
| S-1-08 | cli-developer | 3 | `--timeout` flag wired through config object to transport layer |
| S-1-24 (interface unification) | typescript-pro | — | Unify `CheckResult` and `SecurityFinding` interfaces per ADR-001 §1.1 and §1.2 findings (no dedicated story; addressed as part of S-1-15/S-1-25 implementation) |

### Wave 4 — Unblocked After Wave 3 (Day 5-9)

| Story | Agent | Points | Deliverable |
|-------|-------|--------|-------------|
| S-1-12 | backend-developer | 5 | MCP initialization handshake producing `VerificationContext` with server capabilities |
| S-1-25 (test fixture — known-good) | backend-developer | — | `test/fixtures/reference-server.ts` — valid MCP server that passes all conformance checks |
| S-1-26 (test fixtures — known-bad) | backend-developer | — | `test/fixtures/bad/` — one fixture per conformance category that triggers that category's violations |

Wave 4 also unblocks parallel validator development. Once S-1-12 delivers the handshake and S-1-15 delivers the conformance data model, all validators (S-1-16 through S-1-23 in project-plan numbering) can be developed in parallel.

### Wave 5 — Unblocked After Wave 4 (Day 7-11)

| Story | Agent | Points | Deliverable |
|-------|-------|--------|-------------|
| S-1-13 | backend-developer | 5 | Tool/resource/prompt listing protocol exchange |
| S-1-14 | backend-developer | 3 | Error probes wired into `ProtocolExchangeRecord` |
| S-1-16 | backend-developer | 3 | JSON-RPC 2.0 envelope validator |
| S-1-17 | backend-developer | 2 | Error code range validator |
| S-1-18 | backend-developer | 3 | Initialization conformance validator |
| S-1-19 | backend-developer | 3 | Capability negotiation validator |
| S-1-20 | backend-developer | 5 | Tool schema validator (structure + JSON Schema draft-07 structural check) |
| S-1-21 | backend-developer | 3 | Resource and prompt validators |
| S-1-22 | backend-developer | 5 | Transport protocol validator |
| S-1-23 | backend-developer | 3 | Error handling conformance validator |
| S-1-25 | typescript-pro | 2 | Spec version declaration and `specReference` annotation on all check results |

### Wave 6 — Unblocked After Wave 5 (Day 9-12)

| Story | Agent | Points | Deliverable |
|-------|-------|--------|-------------|
| S-1-24 | backend-developer | 5 | Conformance scoring engine with weighted category computation |
| S-1-26 | cli-developer | 5 | Terminal reporter summary block (TTY detection, color coding, score display) |
| S-1-27 | cli-developer | 3 | Terminal reporter category breakdown with violation list |

### Wave 7 — Unblocked After Wave 6 (Day 11-14)

| Story | Agent | Points | Deliverable |
|-------|-------|--------|-------------|
| Unit tests (S-1-27 in project-plan) | backend-developer | — | Vitest unit tests for all validators and scoring engine, coverage >= 80% |
| Integration tests (S-1-28 in project-plan) | backend-developer | — | Full CLI run against reference fixture (exit 0) and bad fixtures (exit 1) |
| S-1-28 | devops-engineer | 2 | npm publish workflow, `mcp-verify@0.1.0-alpha` on npm |

---

## 6. Dependency Map

```
S-1-01 (scaffold)
│
├── S-1-02 (build)
├── S-1-03 (vitest)
├── S-1-04 (CI)
│
├── S-1-05 (Commander CLI)
│   ├── S-1-06 (--version/--help)
│   ├── S-1-07 (exit codes)
│   │   └── S-1-08 (--timeout)
│   └── S-1-26 (terminal reporter summary)
│       └── S-1-27 (terminal reporter breakdown)
│
├── S-1-09 (transport detect)
│   ├── S-1-10 (StdioTransport)
│   │   └── S-1-12 (handshake)
│   │       ├── S-1-13 (tool/resource/prompt listing)
│   │       │   ├── S-1-19 (capability validator)
│   │       │   ├── S-1-20 (tool schema validator)
│   │       │   └── S-1-21 (resource/prompt validators)
│   │       └── S-1-14 (error probes)
│   │           └── S-1-23 (error handling validator)
│   └── S-1-11 (HttpTransport)
│       └── [same as S-1-10 path above via S-1-12]
│
├── S-1-15 (conformance data model)
│   ├── S-1-16 (JSON-RPC validator) ─────┐
│   ├── S-1-17 (error code validator) ───┤
│   ├── S-1-18 (init validator) ─────────┤
│   ├── S-1-19 (capability validator) ───┤
│   ├── S-1-20 (tool schema validator) ──┤
│   ├── S-1-21 (resource/prompt valid.) ─┤
│   ├── S-1-22 (transport validator) ────┤─→ S-1-24 (scoring engine)
│   ├── S-1-23 (error handling valid.) ──┘         │
│   └── S-1-25 (spec version declaration)          │
│                                                   │
│                                          S-1-26 (reporter summary)
│                                                   │
│                                          S-1-27 (reporter breakdown)
│                                                   │
└──────────────────────────────────────── S-1-28 (npm publish)
```

**Critical path:** S-1-01 → S-1-09 → S-1-10/S-1-11 → S-1-12 → S-1-13 → S-1-15 → S-1-24 → S-1-26 → S-1-28

The critical path runs through the MCP protocol client. Any delay to S-1-12 (handshake) or S-1-15 (conformance data model) directly delays the scoring engine and reporter. The Scrum Master monitors these two stories daily for blocker signals.

---

## 7. Definition of Done

### Story-Level DoD

Every story is considered done only when all of the following are satisfied:

- **Compiles without errors:** `tsc --noEmit --strict` passes with zero errors. No `any` types without an explicit `// eslint-disable` comment with a written justification.
- **Unit tests written and passing:** Vitest unit tests cover the newly implemented code. Coverage for newly written code exceeds 80% line coverage. All pre-existing tests continue to pass.
- **Code reviewed:** code-reviewer agent has reviewed the implementation. All review comments are resolved or explicitly deferred with documented rationale.
- **No critical security issues:** `npm audit --audit-level=high` passes. No Critical or High CVEs introduced by the story's dependencies.
- **Documentation updated:** JSDoc comments on all exported functions, types, and classes. README or CLI help text updated if the story changes user-facing behavior. Acceptance criteria from requirements.md are traceable to the implementation.
- **No circular dependencies:** `dependency-cruiser` passes per NFR-022. No module reaches backward in the pipeline.
- **Module boundary respected:** No component in `src/reporters/` imports from `src/protocol/`. No component in `src/validators/` imports from `src/reporters/`. Pipeline is strictly unidirectional.

### Sprint-Level DoD

The sprint is complete when all of the following are satisfied:

- [ ] All 28 P0 stories satisfy the Story-Level DoD. No P0 stories are in progress or blocked at sprint close.
- [ ] `npx mcp-verify http://localhost:3000` produces a conformance score against the reference test fixture.
- [ ] `npx mcp-verify stdio://./test/fixtures/reference-server.js` produces a conformance score.
- [ ] Both stdio and HTTP+SSE transports are functional and validated with test fixtures.
- [ ] All seven conformance validator categories are implemented and produce findings.
- [ ] Scoring engine produces a 0-100 score with per-category breakdown.
- [ ] Exit codes 0, 1, and 2 are demonstrated against known-good, known-bad, and error conditions respectively.
- [ ] Unit test coverage is >= 80% lines across `src/validators/` and `src/scoring/`.
- [ ] Integration test: full CLI run passes against reference fixture (exit 0) and fails against at least one bad fixture (exit 1).
- [ ] `tsc --noEmit --strict` passes with zero errors across the entire codebase.
- [ ] `npm audit --audit-level=high` returns zero findings.
- [ ] CI matrix (ubuntu-latest x Node.js 18.x/20.x/22.x) is green.
- [ ] `mcp-verify@0.1.0-alpha` is published to npm.
- [ ] Sprint agent log is written by the Scrum Master.
- [ ] Sprint results summary is produced.

---

## 8. Sprint Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|----|------|------------|--------|------------|-------|
| R-1-01 | MCP handshake complexity — the initialization sequence involves multiple round trips and the `initialized` notification is easy to get wrong, potentially causing silent failures | Medium | High | Start with HTTP transport (simpler SSE mechanics than stdio pipe management). Write a minimal smoke test for the handshake before building validators on top of it. Distinguish transport timeout (exit 2) from protocol error (score 0) explicitly per ADR-001 §1.5. | backend-developer |
| R-1-02 | JSON Schema structural validation without Ajv — implementing draft-07 structural rules by hand introduces edge cases that a production validator would handle automatically | Medium | Medium | Define the exact subset of draft-07 rules to validate (type, properties, required array, additionalProperties). Benchmark with a 100-tool fixture per ADR-001 §3.1 — if validation exceeds 1 second, implement lazy validation on first N tools. Do not attempt full JSON Schema semantic validation; label checks as structural only. | backend-developer |
| R-1-03 | Cross-platform stdio differences on Windows — line endings (`\r\n` vs `\n`), process spawning differences, and path separators can cause stdio transport failures that do not surface on Linux | Low | Medium | Develop and test stdio transport on Linux first (CI matrix includes ubuntu-latest). Add `\r\n` normalization in the line parser. Defer Windows-specific edge cases that are not caught by the CI matrix to a Sprint 2 compatibility spike. Flag in Sprint 1 retro if Windows CI job fails. | devops-engineer |
| R-1-04 | S-1-01 delay blocks entire sprint — project scaffold is the single dependency for all 27 other stories | Low | Critical | S-1-01 is the first story executed on Day 1. typescript-pro completes it before any other story is attempted. Scrum Master checks status at end of Day 1 standup. Escalation path: if S-1-01 is not complete by end of Day 1, all agents pivot to assist. | typescript-pro |
| R-1-05 | Interface inconsistencies discovered at integration time — ADR-001 identified three interface misalignments (`SecurityFinding`, `CheckResult`, `VerificationConfig`) that must be resolved before Sprint 1 development begins | High | High | S-1-15 (conformance data model) and S-1-25 (spec version declaration) implement the ADR-001 canonical interfaces. These stories are Wave 1/2 priorities. The code-reviewer enforces no divergence during PR review. See Section 9 for specific resolutions applied. | typescript-pro |
| R-1-06 | Test fixture complexity — implementing both a valid reference server and seven category-specific bad servers is significant work that could consume excessive buffer capacity | Medium | Medium | Implement the reference server first (minimum viable MCP server that passes all checks). Use the reference server as a base for bad fixtures by selectively introducing one violation each. Prioritize fixtures that unblock integration tests over fixtures that provide complete conformance category coverage. | backend-developer |
| R-1-07 | Velocity overcommitment — 104 points in the sprint backlog versus 30-point conservative baseline creates expectation mismatch | Low | Low | All agents understand that 30 points is the single-agent sequential baseline. With four active agents, full delivery is the working assumption. The 30-point figure is the floor for a successful sprint, not the ceiling. Stories not completed are carried to Sprint 2 without a sprint failure declaration. | scrum-master |

---

## 9. Architecture Decisions Applied from ADR-001

ADR-001 identified seven architecture findings. The following decisions are applied directly in Sprint 1 implementation to prevent downstream breakage.

### Applied: CheckResult Interface (ADR-001 §1.2)

The canonical `CheckResult` interface for Sprint 1 is the **api-spec version** with the following fields:

```typescript
interface CheckResult {
  checkId: string;
  name: string;
  category: ConformanceCategory;
  level: 'pass' | 'failure' | 'warning' | 'info';
  description: string;           // named 'description', not 'message'
  specReference: string;         // required per FR-033
  specVersion: string | string[];
  confidence: 'deterministic' | 'heuristic';
  evidence?: string;
  component?: string;            // top-level, not nested in details
  suppressed: boolean;
}
```

The `info` level is included to support FR-035 (unknown-method graceful handling recording). The field is named `description` (not `message`) for consistency with `SecurityFinding.description`. The `specReference` and `specVersion` fields support FR-033. The `component` field is promoted to top-level for cleaner reporter consumption. All validators in S-1-16 through S-1-23 must use this shape.

### Applied: SecurityFinding Interface (ADR-001 §1.1)

The canonical `SecurityFinding` interface for Sprint 1 is the **security-design version** (minus `suppressed`/`suppressionJustification`, which belong on `SuppressedFinding`). The `source` field is **optional** per the system-design recommendation:

```typescript
interface SecurityFinding {
  id: string;
  checkId: string;
  severity: Severity;
  confidence: 'deterministic' | 'heuristic';
  confidenceLevel: 'high' | 'medium' | 'low';
  cvssScore: number;
  component: string;
  title: string;
  description: string;
  evidence: string;
  remediation: string;
  references: string[];
  source?: 'builtin' | 'plugin';
  pluginId?: string;
}
```

Sprint 1 does not implement security checks (those land in Sprint 2). The interface is defined in `src/types/security.ts` in Sprint 1 to prevent interface breakage when Sprint 2 adds its content. The terminal reporter's placeholder security section uses this type shape.

### Applied: VerificationConfig noSecurity/noConformance (ADR-001 §2.5)

`noSecurity: boolean` and `noConformance: boolean` are added to the `VerificationConfig` type in Sprint 1 with defaults of `false`. These are set from CLI flags only (not from the config file). They must flow through the config object to the conformance runner and security runner to prevent scoring engine bugs.

### Applied: Initialize Timeout Distinction (ADR-001 §1.5)

The protocol engine explicitly distinguishes:
- Transport timeout (no response received at all) → exit code 2 (tool error)
- Malformed or error response (server responded but incorrectly) → score 0, exit code 0 or 1

This is implemented in S-1-12 (MCP initialization handshake).

### Deferred: Plugin API PluginContext Type Guards (ADR-001 §2.4)

The `PluginContext` exposes `unknown[]` for tool/resource/prompt lists. Helper type guards (e.g., `isMCPTool(x): x is MCPTool`) are deferred to Sprint 4. This is a developer experience concern, not a correctness issue for Sprint 1.

### Deferred: Conformance Extension via Plugin API (ADR-001 §3.3)

Plugins can only produce `SecurityFinding[]` in Sprint 4. Conformance extension via plugins is deferred and will be addressed as a breaking-change extension to the plugin interface only if demand is validated post-Sprint 4.

### Deferred: sarif Format in Config Type (ADR-001 §1.7)

The `sarif` format value is not accepted by the CLI parser until Sprint 4. The `VerificationConfig.format` type is `'terminal' | 'json' | 'markdown'` in Sprint 1 and Sprint 2.

---

## 10. Exit Criteria

Sprint 1 is not complete until all of the following are verified. The Scrum Master confirms each criterion before closing the sprint and calling the Sprint Review.

| Criterion | Verification Method |
|-----------|---------------------|
| `npx mcp-verify http://localhost:3000` produces a conformance score against an HTTP+SSE reference MCP server | Live CLI run in CI with a locally-spawned reference fixture |
| `npx mcp-verify stdio://./test/fixtures/reference-server.js` produces a conformance score against a stdio reference MCP server | Live CLI run in CI with the stdio reference fixture |
| Exit code 0 demonstrated against a known-conformant server | Integration test assertion |
| Exit code 1 demonstrated against a known-nonconformant server | Integration test assertion |
| Exit code 2 demonstrated against an unreachable or invalid target | Integration test assertion (invalid URL, connection refused) |
| All seven conformance validator categories implemented: JSON-RPC, Initialization, Capabilities, Tools, Resources, Prompts, Transport | Code review: seven validator files exist in `src/validators/conformance/` |
| Scoring engine produces a 0-100 integer with per-category breakdown | Unit test with deterministic fixture data |
| Unit test coverage >= 80% for `src/validators/` and `src/scoring/` | `npm run test:coverage` output |
| `tsc --noEmit --strict` passes with zero errors | CI typecheck job |
| `npm audit --audit-level=high` returns zero findings | CI security audit job |
| GitHub Actions CI matrix (ubuntu-latest x Node.js 18.x/20.x/22.x) is fully green | CI dashboard |
| `mcp-verify@0.1.0-alpha` is published to npm and installable via `npx mcp-verify --version` | `npx mcp-verify@0.1.0-alpha --version` confirmation |

---

## 11. Self-Improvement Actions Applied

N/A — this is Sprint 1. There are no prior retrospective action items.

Sprint 1 retrospective action items (to be generated at Sprint Review and Retrospective) will be the first input reviewed at Sprint 2 planning. The retrospective format for Sprint 1 is Start-Stop-Continue per sprint-structure.md §4.

---

## Appendix A: Directory Structure Established in S-1-01

Per system-design.md §5, the following directory structure is created by S-1-01:

```
mcp-verify/
├── src/
│   ├── cli.ts                        # Commander.js entry point (S-1-05)
│   ├── types/
│   │   ├── conformance.ts            # ConformanceViolation, ConformanceResult (S-1-15)
│   │   ├── security.ts               # SecurityFinding interface stub (ADR-001 §1.1)
│   │   ├── protocol.ts               # ProtocolExchangeRecord (S-1-12)
│   │   └── index.ts                  # Re-exports
│   ├── config/
│   │   ├── loader.ts                 # Config discovery and loading (Sprint 3)
│   │   ├── merge.ts                  # CLI flag merge (Sprint 3)
│   │   └── validate.ts               # Config validation (Sprint 3)
│   ├── transport/
│   │   ├── types.ts                  # Transport interface (S-1-09)
│   │   ├── detect.ts                 # detectTransport() (S-1-09)
│   │   ├── stdio.ts                  # StdioTransport (S-1-10)
│   │   └── http.ts                   # HttpTransport (S-1-11)
│   ├── protocol/
│   │   ├── types.ts                  # ProtocolExchangeRecord types
│   │   ├── handshake.ts              # MCP initialization handshake (S-1-12)
│   │   ├── exchange.ts               # tool/resource/prompt listing (S-1-13)
│   │   └── probes.ts                 # Error probes (S-1-14)
│   ├── validators/
│   │   └── conformance/
│   │       ├── jsonrpc.ts            # JSON-RPC 2.0 envelope (S-1-16)
│   │       ├── error-codes.ts        # Error code ranges (S-1-17)
│   │       ├── initialization.ts     # Init conformance (S-1-18)
│   │       ├── capabilities.ts       # Capability negotiation (S-1-19)
│   │       ├── tools.ts              # Tool schema (S-1-20)
│   │       ├── resources.ts          # Resource protocol (S-1-21)
│   │       ├── prompts.ts            # Prompt protocol (S-1-21)
│   │       ├── transport.ts          # Transport protocol (S-1-22)
│   │       ├── error-handling.ts     # Error handling (S-1-23)
│   │       └── runner.ts             # Validator orchestrator
│   ├── scoring/
│   │   └── engine.ts                 # Conformance scoring (S-1-24)
│   ├── reporters/
│   │   └── terminal.ts               # Terminal reporter (S-1-26, S-1-27)
│   └── plugins/
│       └── types.ts                  # Plugin interface stubs (Sprint 4)
├── test/
│   ├── fixtures/
│   │   ├── reference-server.ts       # Known-good MCP server
│   │   └── bad/
│   │       ├── bad-jsonrpc.ts        # Violates JSON-RPC 2.0
│   │       ├── bad-init.ts           # Violates initialization spec
│   │       ├── bad-tools.ts          # Violates tool schema spec
│   │       ├── bad-resources.ts      # Violates resource protocol
│   │       ├── bad-prompts.ts        # Violates prompt protocol
│   │       ├── bad-transport.ts      # Violates transport protocol
│   │       └── bad-errors.ts         # Violates error handling spec
│   └── unit/
│       ├── validators/               # Validator unit tests
│       └── scoring/                  # Scoring engine unit tests
├── .github/
│   └── workflows/
│       ├── ci.yml                    # CI matrix (S-1-04)
│       └── publish.yml               # npm alpha publish (S-1-28)
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── .gitignore
```

---

## Appendix B: Ceremony Schedule

| Ceremony | Timing | Format |
|----------|--------|--------|
| Sprint Planning | Sprint day 1, before any development begins | This document. Read aloud with agents. Confirm commitments. |
| Daily Standup (Wave transition) | Between each execution wave (approximately 5 checkpoints) | Done / Doing / Blocked per agent. Burndown check. Max 10 minutes. |
| Sprint Review | Sprint day 14 (end of sprint, before retro) | Live demo: `npx mcp-verify` against fixtures. Product manager accepts/rejects each story against its acceptance criteria. |
| Sprint Retrospective | Immediately after Sprint Review | Start-Stop-Continue format per sprint-structure.md §4. Maximum 3 action items committed. Action item owners named. |
