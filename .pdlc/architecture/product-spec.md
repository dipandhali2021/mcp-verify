# MCP Verify — Product Specification

**Document Version:** 1.0
**Author:** Technical Writer (Tier 3 Engineer)
**Date:** 2026-03-28
**Status:** Approved — Authoritative Reference
**References:** See Section 10 for links to all source planning artifacts.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem and Opportunity](#2-problem-and-opportunity)
3. [Target Users (Summary)](#3-target-users-summary)
4. [Feature Specification](#4-feature-specification)
5. [Technical Constraints](#5-technical-constraints)
6. [Sprint Overview](#6-sprint-overview)
7. [Success Metrics](#7-success-metrics)
8. [Risks](#8-risks)
9. [Glossary](#9-glossary)
10. [Document References](#10-document-references)

---

## 1. Executive Summary

**Project Name:** MCP Verify

**Vision:** MCP Verify is the zero-config, open-source verification standard that gives every developer who builds or ships an MCP server instant, CI-native confidence that their server is spec-conformant, security-hardened, and production-ready — without accounts, cloud services, or enterprise procurement.

**Key Differentiator:** MCP Verify is the only tool that combines MCP spec conformance scoring, security vulnerability detection, and CI-native pass/fail gating in a single zero-config CLI with no account required. Every competing tool addresses at most two of these three concerns. None does it in a single `npx` command.

**Delivery Structure:**
- 4 sprints, 2 weeks each (8 weeks total)
- Technology: TypeScript CLI + GitHub Action
- Target launch: `mcp-verify@1.0.0` at end of Sprint 3
- Final release: `mcp-verify@1.1.0` at end of Sprint 4

**Release Milestones at a Glance:**

| Sprint | Version | Key Outcome |
|--------|---------|-------------|
| 1 | 0.1.0-alpha | Working CLI with spec conformance scoring |
| 2 | 0.2.0-alpha | Five-category security vulnerability detection |
| 3 | 1.0.0 | GitHub Action + structured reporting — production-ready |
| 4 | 1.1.0 | Web dashboard, historical tracking, plugin API |

---

## 2. Problem and Opportunity

### The MCP Ecosystem Has Outpaced Its Safety Infrastructure

The Model Context Protocol has achieved extraordinary adoption velocity: over 10,000 published servers, 97 million monthly SDK downloads across TypeScript and Python, and formal support commitments from AWS, Azure, and GCP — all within roughly 12 months of the protocol's public release.

That success has created a serious and largely unaddressed risk surface across three dimensions.

### Security Crisis: 43% Vulnerability Rate

Independent research from Invariant Labs and Snyk published in 2026 found that 43% of publicly available MCP server implementations are vulnerable to at least one form of command injection. These are real attack surfaces — not theoretical concerns — through which a malicious or misused MCP tool invocation could achieve arbitrary code execution, data exfiltration, or privilege escalation on host systems.

The five documented vulnerability categories are: command injection susceptibility via unconstrained tool input schemas, wildcard CORS policies on HTTP transport endpoints, missing authentication on remote endpoints, tool poisoning patterns (prompt injection instructions embedded in tool metadata), and information leakage through verbose error responses.

### Spec Conformance: Invisible Until It Breaks

MCP is built on JSON-RPC 2.0 with a layered specification covering capability negotiation, tool schema declaration, resource handling, prompt management, and transport-layer protocol (both stdio and HTTP+SSE). Developers routinely ship servers with partial implementations — missing required capability fields, malformed tool input schemas, incorrect error codes, or transport configurations that are structurally wrong. These defects surface as silent failures, mysterious client incompatibilities, or undefined behavior when paired with newer MCP client versions.

### Regulatory Deadline: EU AI Act August 2026

The EU AI Act's requirements for high-risk AI systems used in automated decision pipelines include auditability and documented validation procedures. For enterprise teams building on top of MCP — where server tools directly inform model behavior — the August 2026 enforcement deadline creates a concrete and time-sensitive requirement for documented, repeatable conformance verification.

### The Gap No Existing Tool Fills

| Tool | What It Misses |
|------|---------------|
| MCP Inspector (official) | Debug-only. No CI integration. No security checks. Manual use only. |
| Snyk Agent-Scan | Requires Snyk account and API key. No spec conformance scoring. |
| Cisco MCP Scanner | Enterprise procurement process. Not developer-accessible. |
| Manual testing | Non-reproducible. Not integrated into CI. Cannot scale. |

No tool today combines spec conformance scoring, security vulnerability detection, and CI-native pass/fail gating in a single, zero-config, zero-account CLI. That gap is what MCP Verify fills.

---

## 3. Target Users (Summary)

MCP Verify serves three distinct user personas. Full persona profiles, journey maps, and usability requirements are documented in `.pdlc/architecture/user-personas.md`.

### Paulo — Platform Dev (Primary)

Paulo is a backend or full-stack developer with 3-8 years of experience building an MCP server — either an internal tool server for their company's AI features or an open-source server for public distribution. He runs `npm` and `npx` daily, uses GitHub Actions for CI, and writes TypeScript or Python.

**Representative Quote:** "I just want to run one command and know my server is correct. Not 'probably fine' — actually correct. And I want CI to catch it if I break it next week."

**Key needs mapped to features:**

| Paulo's Need | Feature |
|-------------|---------|
| Immediate, automated conformance validation | P0.1 MCP Spec Conformance Scoring |
| Catch security issues before code review | P0.2 Security Vulnerability Detection |
| Gate PRs on spec health without manual effort | P0.3 CLI with Pass/Fail Exit Codes + P1.1 GitHub Action |

**Estimated audience:** 100,000 active MCP server developers globally in 2026, growing to 250,000 by year-end.

---

### Dana — DevOps Lead (Secondary)

Dana is a platform engineer or DevOps lead at a company managing a portfolio of 5-50 internal MCP servers across multiple teams. She sets standards and required tooling for the engineering organization and is responsible for security posture and governance of the company's AI infrastructure.

**Representative Quote:** "I don't want every team making independent decisions about whether their MCP server is 'good enough.' I want one standard, applied consistently, with structured output I can actually put in a dashboard."

**Key needs mapped to features:**

| Dana's Need | Feature |
|------------|---------|
| Org-wide standard enforced via CI template | P1.1 GitHub Action (deployable as an org template) |
| Structured output for SIEM and dashboards | P1.2 JSON Report Format (versioned schema) |
| Environment-specific pass/fail thresholds | P1.4 Configurable Thresholds |
| Auditable check suppressions | P1.4 Suppression with required `justification` field |

**Estimated audience:** 15,000–30,000 platform and DevOps teams with MCP exposure globally.

---

### Chris — Compliance Architect (Tertiary)

Chris is an AI governance lead or CISO-adjacent compliance function at a large enterprise preparing for EU AI Act Articles 9-17 compliance. They need documented, auditable evidence of validation procedures for each MCP server in scope before the August 2026 enforcement deadline.

**Representative Quote:** "I need to show an auditor a dated document that says 'this specific server was validated against this specific methodology on this specific date and passed.' Not a developer saying it works. A document."

**Key needs mapped to features:**

| Chris's Need | Feature |
|-------------|---------|
| Dated, structured conformance certificate | P1.3 Markdown Report Format (audit-trail ready) |
| Documented, repeatable scoring methodology | P0.1 Conformance Scoring (methodology published in README) |
| Machine-readable records for audit storage | P1.2 JSON Report Format |
| Ongoing validation cadence | P2.2 Historical Tracking + P1.1 GitHub Action |

**Estimated audience:** 5,000–10,000 enterprise organizations in EU AI Act scope with MCP exposure.

---

## 4. Feature Specification

Priority levels follow the MoSCoW-adjacent framework used in this project:
- **P0 (Must have — Sprint 1-2):** Without these, the product does not exist.
- **P1 (Should have — Sprint 3):** Required for v1.0.0 GA; strongly expected by users.
- **P2 (Nice to have — Sprint 4):** Increases stickiness; opens enterprise and team use cases.

---

### P0 Features (Sprint 1-2)

#### P0.1 — MCP Spec Conformance Scoring

**Description:** Grade a server against the versioned MCP specification (MCP spec `2024-11-05`) across all protocol layers. Compute a composite conformance score from 0 to 100 based on weighted category scores, with per-category breakdown and per-check violation detail.

The six scored categories and their default weights are:

| Category | Weight | What Is Checked |
|----------|--------|----------------|
| JSON-RPC Base | 20% | `jsonrpc: "2.0"` field, `id` types, `result`/`error` mutual exclusion, error code ranges (-32700 to -32603 standard; -32000 to -32099 server-defined) |
| Initialization | 25% | `initialize` request/response structure, `initialized` notification, `protocolVersion`, `capabilities` object, `serverInfo` fields |
| Tools | 25% | `tools/list` response structure, per-tool `name`, `description`, `inputSchema` as valid JSON Schema draft-07, capability negotiation correctness |
| Resources | 10% | `resources/list` `uri` and `name` fields, `resources/read` `contents` array and `text`/`blob` fields |
| Prompts | 10% | `prompts/list` `prompts` array, prompt `name` and argument `required` boolean |
| Transport | 10% | stdio (line-delimited JSON, no extraneous stdout output), HTTP+SSE (correct `Content-Type: text/event-stream`, `data:` prefix, CORS header presence) |

Conformance failures deduct more points than warnings. A server with no violations scores 100. A server that fails the initialization handshake entirely scores 0. Category scores are always 0-100; the overall score is the weighted sum rounded to the nearest integer.

**Functional requirements covered:** FR-021, FR-022, FR-023, FR-024, FR-025, FR-026, FR-027, FR-028, FR-029, FR-030, FR-031, FR-032, FR-033, FR-035

**User stories covered:** US-001, US-002, US-003

**Sprint assignment:** Sprint 1

**Acceptance criteria (top-level):**
- `npx mcp-verify http://localhost:3000` produces a numeric conformance score (0-100) against a reference MCP server.
- `npx mcp-verify stdio://./test/fixtures/reference-server.js` produces a conformance score via stdio transport.
- Per-category scores are displayed in terminal output.
- Each violation includes the specific field or message that triggered it.
- Scoring is deterministic: the same server in the same state always produces the same score.
- `mcp-verify --version` reports the MCP spec version being validated (e.g., `mcp-verify 0.1.0-alpha (validates MCP spec 2024-11-05)`).

---

#### P0.2 — Security Vulnerability Detection

**Description:** Detect the five documented MCP-specific vulnerability categories from 2026 security research (Invariant Labs, Snyk). Each finding includes: severity (Critical, High, Medium, Low), CVSS-adjacent score (0.0–10.0), affected component, description, remediation guidance, and a confidence label (deterministic or heuristic).

The five security checks are:

| Check | Severity | CVSS | Confidence | What Is Detected |
|-------|----------|------|------------|-----------------|
| Command injection susceptibility | High | 8.1 | Heuristic | Unconstrained string parameters in tool `inputSchema` with high-risk parameter names (`command`, `exec`, `shell`, `script`, `path`, `file`, `dir`) or descriptions containing `execute`, `run`, `command`, `shell`, `script`, `path to` — without `pattern` or `enum` constraints |
| CORS wildcard policy | High | 7.5 | Deterministic | `Access-Control-Allow-Origin: *` on HTTP transport endpoints |
| Authentication gap | Critical (public) / Medium (private) | 9.8 / 6.5 | Heuristic | Absence of authentication on HTTP endpoints reachable over non-loopback network interfaces; does not flag localhost/loopback targets |
| Tool poisoning patterns | Critical | 8.8 | Heuristic | Prompt injection instructions embedded in tool `name` or `description` fields: `IGNORE PREVIOUS`, `[SYSTEM]`, `<system>`, all-caps imperatives, descriptions exceeding 2,000 characters, Base64 or URL-encoded strings in tool names |
| Information leakage | Medium | 5.3 | Deterministic | Stack traces, absolute filesystem paths, or environment variable patterns in error responses (captured via intentional error probing) |

**Functional requirements covered:** FR-036, FR-037, FR-038, FR-039, FR-040, FR-041, FR-044, FR-045

**User stories covered:** US-005, US-016, US-017, US-018, US-022

**Sprint assignment:** Sprint 2

**Acceptance criteria (top-level):**
- All five check categories detect their target vulnerability against the corresponding known-vulnerable test fixture.
- False positive rate is less than 5% against a suite of 10 known-clean server fixtures.
- Each finding includes severity, CVSS-adjacent score, affected component, description, and remediation text.
- Heuristic findings are labeled `[heuristic]` in terminal output; deterministic findings are labeled `[deterministic]`.
- A clean server shows "No security findings detected" with green color coding.
- Full CLI run (conformance + security) completes in under 10 seconds against a local server.

---

#### P0.3 — CLI with Pass/Fail Exit Codes

**Description:** Single-command interface with zero external dependencies. Invokable via `npx mcp-verify <target>` with no prior installation. Supports both stdio and HTTP+SSE transport targets via URL scheme auto-detection.

**Command interface:**
```
npx mcp-verify <target>
npx mcp-verify http://localhost:3000
npx mcp-verify stdio://./my-server.js
npx mcp-verify --config mcp-verify.json http://staging.example.com/mcp
```

**Exit codes:**
- `0`: All checks pass (or all findings are below configured severity threshold).
- `1`: One or more findings exceed the configured severity threshold, or conformance score is below configured threshold.
- `2`: Tool error (cannot connect, invalid target, internal error, configuration error). Human-readable error message is printed to stderr.

**Functional requirements covered:** FR-001, FR-004, FR-005, FR-006, FR-007, FR-008, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-046, FR-047, FR-048, FR-052, FR-063, FR-064, FR-065

**User stories covered:** US-001, US-002, US-003, US-004, US-015, US-023

**Sprint assignment:** Sprint 1

**Acceptance criteria (top-level):**
- `npx mcp-verify http://localhost:3000` executes without prior installation or configuration.
- Exit code 0 is produced against a known-good reference fixture; exit code 1 against a known-bad fixture.
- Exit code 2 is produced for unreachable targets and invalid target formats, with a human-readable error on stderr.
- Terminal output includes a summary block (target, transport, tool version, spec version, timestamp, overall score, finding counts, PASS/FAIL verdict, duration) and per-category score breakdown.
- Color coding is applied: green for passing (score >= 80), yellow for warnings (50-79), red for failures (< 50 or security findings of Medium or above).
- Color output is automatically disabled when stdout is not a TTY or `NO_COLOR` is set.
- Execution completes in under 10 seconds for a typical local MCP server (p95).
- `npx mcp-verify --version` completes in under 5 seconds cold-start (no prior npm cache).
- Package unpacked size is under 5MB.

---

### P1 Features (Sprint 3)

#### P1.1 — GitHub Action

**Feature ID:** P1.1
**Sprint:** 3

**Description:** First-class GitHub Action (`mcp-verify/action@v1`) for drop-in CI integration. Published to GitHub Marketplace. Wraps the CLI and exposes all major configuration options as Action inputs.

**Example usage:**
```yaml
- uses: mcp-verify/action@v1
  with:
    target: http://localhost:3000
    fail-on-severity: high
    conformance-threshold: 80
```

**Action inputs:** `target` (required), `fail-on-severity` (optional, default `critical`), `conformance-threshold` (optional, default `0`), `format` (optional, default `terminal`), `config` (optional), `timeout` (optional, default `10000`).

**Action outputs:** `conformance-score` (integer), `security-findings-count` (integer), `pass` (boolean string).

**Functional requirements covered:** FR-002, FR-003, FR-056, FR-057, FR-058, FR-059, FR-061, FR-062

**User stories covered:** US-006, US-019, US-020

**Sprint assignment:** Sprint 3

**Acceptance criteria (top-level):**
- The Action blocks a PR (exit code 1) when a security finding exceeds the configured `fail-on-severity` threshold.
- The Action posts a Markdown summary report as a PR comment, updating the comment if one already exists.
- A PR comment is skipped gracefully if `GITHUB_TOKEN` is unavailable or the event is not a pull request.
- The Action functions correctly within a `strategy.matrix` GitHub Actions block without file conflicts.
- The Action auto-discovers `mcp-verify.json` or `.mcp-verify.json` in `$GITHUB_WORKSPACE`.
- Example workflows for GitHub Actions, GitLab CI, and CircleCI are provided in `docs/examples/` with inline comments.
- The Action runs on `ubuntu-latest`, `macos-latest`, and `windows-latest` runners using the Node.js 20 runtime.

---

#### P1.2 — JSON Report Format

**Feature ID:** P1.2
**Sprint:** 3

**Description:** Machine-readable JSON output for pipeline integration, SIEM ingestion, and programmatic analysis. Activated via `--format json`. Output is a single valid JSON object conforming to a versioned, documented schema.

**Example invocation:**
```
npx mcp-verify --format json http://localhost:3000 > report.json
```

**Report structure:**
- `schemaVersion`: Report schema version (e.g., `"1.0"`).
- `meta`: `toolVersion`, `specVersion`, `timestamp` (ISO 8601), `target`, `transport`, `duration` (ms), `checkMode`, `thresholds`.
- `conformance`: `score` (0-100), `breakdown` (per-category scores), `violations` (array).
- `security`: `findings` (array with `id`, `checkId`, `severity`, `cvssScore`, `component`, `description`, `remediation`, `confidence`), `suppressed` (array with `suppressed: true` and `justification`).
- `summary`: `pass` (boolean), `blockerCount` (counts per severity level).

The schema is formally documented at `docs/report-schema.json`. Breaking schema changes increment the major version. Optional field additions are minor-version bumps.

**Functional requirements covered:** FR-049, FR-050

**User stories covered:** US-007, US-019

**Sprint assignment:** Sprint 3

**Acceptance criteria (top-level):**
- `--format json` produces only valid JSON to stdout with no ANSI codes or decorative text.
- Output is parseable with `JSON.parse` and passes JSON Schema validation against `docs/report-schema.json`.
- All seven required root sections (`schemaVersion`, `meta`, `conformance`, `security`, `summary`) are present and correctly typed.
- Tool execution logs and errors are written to stderr, not stdout.
- An example report is available at `docs/examples/report-example.json`.

---

#### P1.3 — Markdown Report Format

**Feature ID:** P1.3
**Sprint:** 3

**Description:** Human-readable GitHub-Flavored Markdown output suitable for PR comments, Confluence pages, and audit trail storage. Activated via `--format markdown`. Self-contained — no external dependencies.

**Example invocation:**
```
npx mcp-verify --format markdown http://localhost:3000 > report.md
```

**Report sections:**
- `# MCP Verify Report` heading followed by metadata table (target, timestamp, tool version, spec version).
- Summary table with overall score and finding counts by severity.
- `## Conformance Score` with per-category scores in a Markdown table.
- `## Security Findings` with one sub-section per finding (severity, CVSS, component, description, remediation).
- `## Conformance Violations` grouped by category.
- `## Suppressed Findings` for any suppressed checks.
- Footer with tool version, spec version, and timestamp.

**Functional requirements covered:** FR-051

**User stories covered:** US-008, US-020

**Sprint assignment:** Sprint 3

**Acceptance criteria (top-level):**
- Output is valid GitHub-Flavored Markdown (GFM) with no decorative text or ANSI codes.
- All required sections are present and correctly structured.
- Suppressed findings appear in a separate section (not omitted).
- The report is suitable for direct storage as an audit trail artifact.

---

#### P1.4 — Configurable Thresholds

**Feature ID:** P1.4
**Sprint:** 3

**Description:** Project-level configuration file (`mcp-verify.json` or `.mcp-verify.json`) and CLI flags for controlling pass/fail gating behavior. Enables environment-appropriate strictness — more permissive in development, zero-tolerance in production.

**Configuration file example:**
```json
{
  "failOnSeverity": "high",
  "conformanceThreshold": 75,
  "skip": [{"checkId": "cors-wildcard", "justification": "Internal-only server; cross-origin access intentional."}],
  "transport": "http",
  "timeout": 15000
}
```

**Configuration options:**
- `failOnSeverity`: Minimum severity level that triggers exit code 1. Values: `none`, `low`, `medium`, `high`, `critical`. Default: `critical`.
- `conformanceThreshold`: Integer 0-100. Exit code 1 when overall score falls below this value. Default: `0` (disabled).
- `skip`: Array of `{checkId, justification}` objects. Suppressed findings appear in output labeled `[SUPPRESSED]` but do not contribute to exit code.
- `transport`: Force `http` or `stdio` regardless of URL scheme.
- `timeout`: Milliseconds. Default: `10000`.

CLI flags override config file values when both are present. The `--strict` flag applies more aggressive heuristic pattern matching; `--lenient` reduces sensitivity. The two flags cannot be combined.

**Functional requirements covered:** FR-003, FR-009, FR-034, FR-042, FR-043, FR-053, FR-054, FR-055, FR-060, FR-061

**User stories covered:** US-009, US-010, US-011

**Sprint assignment:** Sprint 3

**Acceptance criteria (top-level):**
- `mcp-verify.json` or `.mcp-verify.json` is auto-discovered in the current working directory when `--config` is not specified.
- `failOnSeverity: "critical"` causes exit code 1 only for Critical findings; `"high"` causes exit code 1 for Critical and High.
- `conformanceThreshold: 80` causes exit code 1 when the conformance score is below 80.
- Suppressed findings appear in all output formats labeled `[SUPPRESSED]` with the `justification` text; they do not count toward the exit code.
- Missing `justification` on a suppression entry prints a warning but does not block execution.
- CLI flags override config file settings when both are present.
- The effective threshold values are recorded in `meta.thresholds` in JSON output.

---

### P2 Features (Sprint 4)

#### P2.1 — Web Dashboard

**Feature ID:** P2.1
**Sprint:** 4

**Description:** Optional locally-served web UI (`npx mcp-verify serve`) for teams running repeated verifications. Displays historical score charts, security finding trends, regression markers, and a multi-server portfolio view. No cloud. No accounts. All assets bundled locally with no external CDN dependencies.

**Functional requirements covered:** FR-066, FR-068, FR-069, FR-070, FR-071, FR-075

**User stories covered:** US-012, US-021

**Sprint assignment:** Sprint 4

**Acceptance criteria (top-level):**
- `npx mcp-verify serve` starts a local HTTP server at `http://localhost:4000` (overridable with `--port`).
- Dashboard lists all tracked servers with most recent score, finding count, trend direction, and last run timestamp.
- Historical conformance score charts display time-series data for at least 100 runs per server.
- Per-category scores are toggle-able overlay lines on the score chart.
- Security findings trend shows stacked bars by severity (Critical, High, Medium, Low) across runs.
- Regression runs (score drop exceeding 5 points from prior run) are marked with a visual indicator.
- Portfolio table is sortable by score, finding count, and last run time.
- Browser network inspector shows zero requests to external hosts.
- Content Security Policy header on dashboard responses includes `default-src 'self'`.

---

#### P2.2 — Historical Tracking

**Feature ID:** P2.2
**Sprint:** 4

**Description:** Local-first run history with regression detection. After each successful verification run, a timestamped result record is appended to `~/.mcp-verify/history/<encoded-hostname>.jsonl`. The `--compare-last` CLI flag surfaces regressions since the previous run (or a pinned baseline).

**Stored fields per run:** `timestamp` (ISO 8601), `target`, `conformanceScore`, `securityFindingsCount`, `breakdown` (per-category scores), `toolVersion`, `specVersion`.

**CLI commands:**
- `--compare-last`: Prints a comparison section showing score delta and new/resolved findings against the previous run or pinned baseline.
- `--no-history`: Disables history storage for a single run.
- `npx mcp-verify baseline <target>`: Runs verification and pins the result as a known-good baseline.
- `npx mcp-verify baseline --existing <target>`: Promotes the most recent history entry to baseline without re-running.
- `npx mcp-verify history export <target> --output <file>`: Exports full target history as a JSON array (SIEM-ready).
- `npx mcp-verify history export --all --output <file>`: Exports history for all tracked targets.

**Functional requirements covered:** FR-067, FR-072, FR-073, FR-074

**User stories covered:** US-013

**Sprint assignment:** Sprint 4

**Acceptance criteria (top-level):**
- `~/.mcp-verify/history/` is created on first run if it does not exist.
- Each run appends one JSONL record containing all required fields.
- `--compare-last` prints score delta and lists new and resolved findings; outputs "No previous run found for this target" when no history exists.
- `baseline` subcommand stores results in `~/.mcp-verify/baselines/<encoded-hostname>.json`.
- When a baseline exists, `--compare-last` compares against the baseline; `--compare-previous` compares against the immediately preceding run.
- History storage is skipped gracefully (debug log, not failure) if `~/.mcp-verify/` is not writable.
- Exported JSON includes an `exportedAt` timestamp and `toolVersion` root field.

---

#### P2.3 — Custom Rule Plugins

**Feature ID:** P2.3
**Sprint:** 4

**Description:** Plugin API for extending the security and conformance check suite with custom rules. Plugins are loaded from a JavaScript configuration file (`mcp-verify.config.js`). Plugin findings are fully integrated into the report pipeline and contribute to exit code determination using the same thresholds as built-in findings.

**Configuration file example:**
```javascript
// mcp-verify.config.js
export default {
  plugins: ['./rules/internal-auth-check.js'],
  rules: {
    'internal-auth-check': { severity: 'critical', endpoint: '/auth/validate' }
  }
}
```

**Plugin API contract:** Each plugin module exports a default object with `id`, `name`, `description`, `version`, and an async `check(context)` function returning `Promise<Finding[]>`. The `context` object provides: `target`, `transport`, `initializeResponse`, `toolsList`, `resourcesList`, `promptsList`, `errorProbeResponses`, and `config` (plugin-specific config from the `rules` object). Plugin types are exported from the main package as `import type { PluginContext, Finding } from 'mcp-verify'`.

**Plugin isolation:** An unhandled exception in a plugin's `check` function prints a warning to stderr and continues verification with remaining plugins and built-in checks. Plugins that do not resolve within 30 seconds are treated as failed. Plugin failures do not affect the exit code.

**Functional requirements covered:** FR-076, FR-077, FR-078, FR-079, FR-080

**User stories covered:** US-014, US-024

**Sprint assignment:** Sprint 4

**Acceptance criteria (top-level):**
- A plugin loaded via `mcp-verify.config.js` produces findings that appear in all output formats (terminal, JSON, Markdown) labeled with the plugin name.
- Plugin findings appear in JSON output within `security.findings` with `source: "plugin"` and `pluginId` fields.
- Plugin findings contribute to exit code determination using the `failOnSeverity` threshold.
- Plugin findings can be suppressed using the `skip` config array by `checkId`.
- An unhandled exception in a plugin's `check` function does not crash the tool; a warning is printed to stderr and verification continues.
- Two reference plugin examples are provided in `examples/plugins/`: `custom-auth-check` (checks for a custom Authorization header) and `rate-limit-check` (probes for rate limiting behavior). Each includes TypeScript source, `package.json`, and `README.md`.

---

## 5. Technical Constraints

These constraints are enforced in the build pipeline and CI system. They are non-negotiable product requirements, not aspirational targets.

### Runtime Compatibility

| Constraint | Requirement | Enforcement |
|-----------|-------------|-------------|
| Node.js versions | 18 LTS, 20 LTS, 22 LTS | CI matrix: 3 versions x 3 OS = 9 combinations |
| Operating systems | Linux (x64, arm64), macOS (x64, arm64), Windows (x64) | CI matrix: `ubuntu-latest`, `macos-latest`, `windows-latest` |
| `package.json` engines field | `"node": ">=18.0.0"` | Declared in `package.json`; validated in CI |
| No platform-specific native addons | Zero native modules | Dependency audit in CI |

### Performance

| Constraint | Target | Verification |
|-----------|--------|-------------|
| CLI execution time (p95, local/LAN server) | < 10 seconds | Benchmark test suite; CI timeout wrapper |
| `npx` cold-start time | < 5 seconds on a 50 Mbps connection with clean npm cache | Docker clean-cache timing in CI |
| Peak memory usage | < 128 MB during a standard verification run | Node.js `--max-old-space-size` constraint in test environment |

### Package Size and Dependencies

| Constraint | Target | Enforcement |
|-----------|--------|-------------|
| Package unpacked size | < 5 MB | `size-limit` package in `package.json`; build fails if exceeded |
| Zero runtime external dependencies | All runtime dependencies bundled via tsup/esbuild | Build pipeline validation; no optional peer dependencies at runtime |
| `npm audit` | Zero High or Critical CVEs in runtime dependency tree at all releases | `npm audit --audit-level=high` in CI; fails on any finding |

### Privacy and Security

| Constraint | Requirement | Enforcement |
|-----------|-------------|-------------|
| Zero telemetry by default | No outbound network calls except to the specified `<target>` | Network call interception in test suite; code review |
| No credential storage | No credentials, API keys, or tokens stored in history, config, or output files | Code review; automated scan of all file-write operations |
| No execution of server code | No `eval()` or dynamic code execution in response handling | Code review; ESLint rule |
| `--no-telemetry` flag | Available as a no-op from first release, even before telemetry is implemented | CLI implementation |

### Code Quality

| Constraint | Target | Enforcement |
|-----------|--------|-------------|
| TypeScript strict mode | `tsc --noEmit --strict` passes with zero errors; no `any` types without explicit justification comment | CI typecheck step; ESLint `@typescript-eslint/no-explicit-any: error` |
| Test coverage | > 80% line coverage per sprint (Sprint 1 floor); > 85% project-level at completion | Vitest coverage with Istanbul; build fails below threshold |
| Modular architecture | No circular dependencies; each major area (protocol client, conformance engine, security engine, reporters, history) is a separate module | `dependency-cruiser` in CI |
| Security check false positive rate | < 5% against a suite of 10 known-clean server fixtures | Integration test suite with labeled false-positive fixtures |

---

## 6. Sprint Overview

| Sprint | Goal | Key Deliverables | Milestone | npm Version |
|--------|------|-----------------|-----------|-------------|
| Sprint 1 | Foundation — CLI scaffold, MCP protocol client (stdio and HTTP+SSE), spec conformance engine, terminal reporter, npm alpha publish | Commander.js CLI; stdio and HTTP+SSE transport; initialization handshake; six-category conformance engine (FR-021 through FR-033); terminal reporter with color coding and score display; exit codes 0/1/2; `npm audit` clean; CI matrix (3 OS x 3 Node.js) | M-1: Alpha CLI | `0.1.0-alpha` |
| Sprint 2 | Security — Five-category vulnerability detection engine with test fixtures and false positive validation | Command injection detector; CORS wildcard detector; auth gap detector; tool poisoning detector; information leakage detector; CVSS-adjacent scoring; known-vulnerable and known-clean test fixtures for all five categories; terminal reporter updated with security findings section; false positive rate < 5% confirmed | M-2: Security Engine Complete | `0.2.0-alpha` |
| Sprint 3 | CI Integration — GitHub Action, structured reporting, configurable thresholds, v1.0.0 GA | JSON reporter (versioned schema, `docs/report-schema.json`); Markdown reporter (GFM, audit-ready); `mcp-verify.json` config system; `failOnSeverity` and `conformanceThreshold` thresholds; per-check suppression with `justification`; `--strict`/`--lenient` modes; GitHub Action (`action.yml`, PR status check, PR comment reporter, matrix support); CI example workflows; package size < 5 MB validated; `mcp-verify@1.0.0` published to npm; GitHub Action published to GitHub Marketplace | M-3: v1.0.0 GA + M-4: GitHub Action Published | `1.0.0` |
| Sprint 4 | Advanced Features — Dashboard, historical tracking, plugin API, documentation, v1.1.0 | Run history storage (`~/.mcp-verify/history/` JSONL); `--compare-last` regression detection; `baseline` subcommand; `history export` subcommand; local web dashboard (`npx mcp-verify serve`) with historical score charts, findings trend, regression markers, and portfolio view; plugin API (`mcp-verify.config.js`, `PluginContext`, plugin isolation); two reference plugin examples; SARIF 2.1.0 output; full documentation site (README, CLI reference, GitHub Action reference, plugin authoring guide); end-to-end integration tests against 5 real public MCP servers | M-5: Dashboard Launch + M-6: v1.1.0 | `1.1.0` |

**Target milestone dates:**

| Milestone | Target Date |
|-----------|-------------|
| M-1: Alpha CLI (`0.1.0-alpha` published) | 2026-04-11 |
| M-2: Security Engine Complete (`0.2.0-alpha` published) | 2026-04-25 |
| M-3: v1.0.0 GA (npm + GitHub Marketplace) | 2026-05-09 |
| M-4: GitHub Action Published | 2026-05-09 |
| M-5: Dashboard Launch | 2026-05-23 |
| M-6: v1.1.0 Published | 2026-05-23 |

---

## 7. Success Metrics

### North Star Metric

**Weekly Active Verification Runs** — the number of distinct `mcp-verify` invocations per week, counting both CLI and GitHub Action executions. This directly measures whether developers are integrating verification into their workflow, not just downloading the tool.

**North Star target:** 10,000 weekly active runs by end of Sprint 4 + 8 weeks post-launch.

### Acquisition Metrics

| Metric | 30 Days | 90 Days | 180 Days |
|--------|---------|---------|----------|
| npm downloads (total) | 5,000 | 25,000 | 100,000 |
| npm downloads (weekly) | 1,000 | 5,000 | 15,000 |
| GitHub stars | 200 | 800 | 2,500 |
| GitHub forks | 20 | 80 | 250 |

### Activation Metrics

| Metric | Target |
|--------|--------|
| Users who run a second verification within 7 days of first | > 40% |
| Users who configure `.mcp-verify.json` | > 25% |
| GitHub Action integrations (unique repos using action) by 90 days | 500 |
| CI integration rate (users who add the GitHub Action after first CLI use) | > 30% |

### Quality Metrics

| Metric | Target |
|--------|--------|
| CLI execution time (p95, typical MCP server) | < 10 seconds |
| False positive rate on security findings | < 5% |
| npm package size (unpacked) | < 5 MB |
| Zero required external runtime dependencies | Enforced by build constraints |
| Test coverage | > 85% line coverage |

### Community and Trust Metrics (90-Day Targets)

| Metric | Target |
|--------|--------|
| Open issues with `bug` label resolved within 7 days | > 75% |
| Community-contributed rules/plugins | 3+ |
| Mentions in MCP ecosystem newsletters/blogs | 5+ |
| Adoption by MCP SDK maintainers or official tooling references | 1+ |

### Business and Impact Metrics

| Metric | Target |
|--------|--------|
| Enterprise teams using MCP Verify in production CI (self-reported) | 50 by 180 days |
| Documented use in EU AI Act compliance submissions | 5 by August 2026 |
| Security vulnerabilities detected and fixed by users (estimated from issue reports) | 500+ within 90 days |

---

## 8. Risks

The top five risks and their mitigations, drawn from the project plan risk register. All five risks carry a risk score of 6 (Medium-High) on a 1-9 scale.

### Risk 1: MCP Specification Evolves Faster Than Conformance Checks

**Likelihood:** High | **Impact:** Medium | **Risk Score:** 6

**Description:** The MCP specification is actively developed on GitHub. New capability types, protocol version bumps, or transport changes could invalidate existing conformance checks or cause incorrect scoring of servers that are technically correct for a newer spec version.

**Mitigation:**
- Version-pin all spec checks to the declared MCP spec version (`2024-11-05`). Each conformance rule internally references its spec section.
- Design the conformance engine as a pluggable rule set where each rule declares the spec versions it applies to.
- Monitor `modelcontextprotocol/specification` GitHub repository for PRs and releases from Sprint 1 onward; treat breaking spec changes as P0 issues triggering a patch release.
- Tag each `mcp-verify` npm release with the MCP spec version it validates; maintain a `CHANGELOG` of spec version support.

**Residual risk:** Medium — spec evolution cannot be eliminated, only monitored and responded to quickly.

---

### Risk 2: Official Tooling Closes the Verification Gap

**Likelihood:** Medium | **Impact:** High | **Risk Score:** 6

**Description:** Anthropic, the MCP SDK maintainers, or a well-funded competitor ships an official verification tool that addresses spec conformance and security. Official endorsement would drive automatic ecosystem adoption.

**Mitigation:**
- Speed of delivery is the primary mitigation: publish `mcp-verify@1.0.0` by the end of Sprint 3 (target 2026-05-09) — before official tooling is likely to appear.
- Build community investment early: GitHub stars, plugin ecosystem, CI template library create switching costs.
- Differentiate on security depth: official tooling is unlikely to invest in the Invariant Labs/Snyk vulnerability research with the same specificity.
- Reach out proactively to MCP maintainers to position MCP Verify as complementary (not competing) tooling.

**Residual risk:** Medium — community investment and security depth are the durable differentiators.

---

### Risk 3: MCP Server Diversity Causes Unreliable Check Coverage

**Likelihood:** High | **Impact:** Medium | **Risk Score:** 6

**Description:** MCP servers vary widely across transport (stdio vs HTTP+SSE), authentication patterns, server frameworks (TypeScript SDK, Python SDK, custom), and deployment contexts. A check that works reliably against TypeScript SDK defaults may produce false positives or false negatives against a custom Python implementation.

**Mitigation:**
- Test the conformance engine against a curated set of 20+ real public MCP servers before `v1.0.0` release.
- Build and maintain a reference server test fixture suite (known-good and known-bad variants for all five security check categories).
- Per-check confidence scoring exposes the deterministic vs. heuristic distinction in all output formats.
- `--strict` / `--lenient` flags tune heuristic check sensitivity; `--skip` allows suppression with documented justification.
- Track `false-positive` GitHub issue label monthly; resolve within 7 days per the community quality metric.

**Residual risk:** Low-Medium — unavoidable with a highly diverse target ecosystem, but manageable with robust test coverage and tunable sensitivity.

---

### Risk 4: Security Check False Positives Damage Tool Credibility

**Likelihood:** Medium | **Impact:** High | **Risk Score:** 6

**Description:** A security tool that raises false alarms loses trust permanently. A single high-profile false positive — particularly on the tool poisoning or command injection heuristics — reported on social media could significantly damage the adoption trajectory.

**Mitigation:**
- Every security check has a documented rationale, true-positive test fixtures, and explicit false-positive test fixtures.
- Security findings label heuristic checks as `[heuristic]` with lower confidence; deterministic checks are labeled `[deterministic]`.
- Pre-launch security check review: invite 3-5 MCP ecosystem developers to validate checks against their own servers before `v1.0.0`.
- Publish the detection methodology publicly so sophisticated users can evaluate check logic.
- Provide `--skip` with required `justification` field to suppress specific checks organizationally.

**Residual risk:** Low — with strong pre-launch validation and transparent methodology, credibility risk is manageable.

---

### Risk 5: Developer Friction Prevents Adoption at Zero-Config Promise

**Likelihood:** Medium | **Impact:** High | **Risk Score:** 6

**Description:** The entire value proposition assumes "zero config, zero account, single command." If `npx mcp-verify` requires Node.js version negotiation, has long install times (over 5 seconds cold start), fails on common server configurations, or produces confusing output, adoption stalls before word-of-mouth can build.

**Mitigation:**
- Node.js LTS matrix testing (18, 20, 22) enforced in CI from Sprint 1.
- Package size hard constraint under 5 MB enforced with `size-limit` in the build pipeline.
- `npx` cold-start time measured in CI against a Docker clean cache (target under 5 seconds).
- Actionable error messages for all exit code 2 paths: what went wrong, why it likely happened, what to try next.
- First-run experience testing before `v1.0.0`: 5 developers unfamiliar with the project run `npx mcp-verify` against a test server with no instructions; observations are addressed before launch.

**Residual risk:** Low — directly testable and fixable before launch.

---

## 9. Glossary

**MCP (Model Context Protocol)**
An open standard developed by Anthropic that gives AI agents a structured, standardized way to interact with external tools and data sources. MCP defines a client-server protocol where MCP servers expose tools, resources, and prompts that AI clients (such as Claude) can invoke. As of 2026, MCP has over 10,000 published server implementations and 97 million monthly SDK downloads.

**JSON-RPC 2.0**
The base wire protocol underlying MCP. JSON-RPC 2.0 specifies the envelope structure for all MCP messages: request objects require `jsonrpc: "2.0"`, a string `method`, and a numeric or string `id`; response objects contain either a `result` or an `error` field (never both); error objects contain a numeric `code` and string `message`. Standard error codes range from -32700 (Parse error) to -32603 (Internal error). Server-defined error codes occupy -32000 to -32099. MCP Verify validates all MCP server communication against this specification as the foundational layer of the conformance check.

**Conformance Score**
A composite integer from 0 to 100 produced by MCP Verify representing how closely a server's behavior adheres to the MCP specification. Computed as the weighted average of six category scores: JSON-RPC Base (20%), Initialization (25%), Tools (25%), Resources (10%), Prompts (10%), and Transport (10%). Conformance failures deduct more points than warnings. A score of 100 means zero violations across all categories. A score of 0 indicates complete failure of the initialization handshake. The score is deterministic: the same server in the same state always produces the same score.

**Tool Poisoning**
A class of MCP-specific security vulnerability in which an attacker or maliciously-crafted server embeds prompt injection instructions inside tool metadata — specifically the `name` or `description` fields returned by `tools/list`. When an AI model reads this metadata to understand available tools, the embedded instructions can hijack the model's behavior, redirecting it to perform unintended actions. Examples include tool descriptions containing `IGNORE PREVIOUS INSTRUCTIONS`, `[SYSTEM]` tags, or all-caps imperative directives. MCP Verify detects these patterns as P0.2 security checks labeled `heuristic` confidence.

**CORS (Cross-Origin Resource Sharing)**
An HTTP mechanism that controls which web origins can make cross-origin requests to a server. A wildcard CORS policy (`Access-Control-Allow-Origin: *`) on an MCP HTTP+SSE endpoint allows any web page to invoke MCP tools — a serious security concern for servers that should only be accessible from known origins. MCP Verify detects wildcard CORS policies as a `High` severity security finding (CVSS 7.5, deterministic confidence).

**SSE (Server-Sent Events)**
A one-way HTTP push mechanism used by the MCP HTTP transport layer. MCP servers that use the HTTP transport must return responses as an SSE stream with `Content-Type: text/event-stream`, where each JSON-RPC message is prefixed with `data:` followed by a newline. MCP Verify validates that HTTP+SSE transport targets conform to this format, flagging missing `Content-Type` headers, missing `data:` prefixes, and non-JSON `data:` values as conformance failures.

**stdio Transport**
The MCP transport mechanism in which the MCP client communicates with a server process via standard input (stdin) and standard output (stdout). Messages are line-delimited JSON-RPC objects — one complete JSON-RPC message per line, terminated with a newline character (`\n`). The MCP server process is spawned by the client and communicates exclusively through these pipes. MCP Verify supports stdio transport targets using the `stdio://` URL prefix (e.g., `stdio://./my-server.js`) and validates that all protocol messages are correctly line-delimited and contain no extraneous non-JSON output to stdout.

---

## 10. Document References

This product specification synthesizes the following planning artifacts. All documents are located under `.pdlc/architecture/` in the project repository.

| Document | Path | Purpose |
|----------|------|---------|
| Product Vision | `.pdlc/architecture/product-vision.md` | Problem statement, feature priorities, success metrics, competitive positioning, risk assessment, sprint roadmap |
| Requirements | `.pdlc/architecture/requirements.md` | FR-001 through FR-080 (functional requirements), NFR-001 through NFR-024 (non-functional requirements), user stories US-001 through US-024, sprint-story mapping, acceptance criteria |
| User Personas | `.pdlc/architecture/user-personas.md` | Full persona profiles for Paulo, Dana, and Chris; user journey maps; usability requirements; pain point analysis |
| Project Plan | `.pdlc/architecture/project-plan.md` | Work breakdown structure, sprint plans with story breakdowns and point estimates, milestones and target dates, critical path analysis, risk register |
| Sprint Structure | `.pdlc/architecture/sprint-structure.md` | Sprint cadence, Definition of Done (story, sprint, and project levels), velocity planning, ceremony templates, agent team structure per sprint, quality gates between sprints |

**External references:**
- MCP Specification: https://modelcontextprotocol.io
- JSON-RPC 2.0 Specification: https://www.jsonrpc.org/specification
- Invariant Labs MCP Security Report (2026): Basis for 43% vulnerability prevalence statistic and command injection vulnerability category
- Snyk State of AI Security (2025): Basis for security check definitions

---

*Document produced by Technical Writer (Tier 3 Engineer) for MCP Verify PDLC Project.*
*This is the single authoritative reference that synthesizes all planning artifacts. For detailed specifications, trace to the referenced FR-NNN, NFR-NNN, and US-NNN identifiers in `.pdlc/architecture/requirements.md`.*
