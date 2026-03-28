# Product Vision: MCP Verify

**Document Version:** 1.0
**Author:** Product Manager (Tier 2 PM)
**Date:** 2026-03-28
**Status:** Approved — Planning Phase
**Project Scoring:** 90/100 (Trend: 24, Market: 22, Feasibility: 21, Differentiation: 23)

---

## 1. Product Vision Statement

MCP Verify is the zero-config, open-source verification standard that gives every developer who builds or ships an MCP server instant, CI-native confidence that their server is spec-conformant, security-hardened, and production-ready — without accounts, cloud services, or enterprise procurement.

---

## 2. Problem Statement

### The MCP Ecosystem Has Outpaced Its Safety Infrastructure

The Model Context Protocol has achieved extraordinary adoption velocity: 10,000+ published servers, 97M monthly SDK downloads across TypeScript and Python, and formal support commitments from AWS, Azure, and GCP — all within roughly 12 months of the protocol's public release. This growth is accelerating because MCP solves a real problem: it gives AI agents a structured, standardized way to use tools and access data sources.

That success has created a serious and largely unaddressed risk surface.

**The security crisis is measurable.** Independent research from Invariant Labs and Snyk published in 2026 found that 43% of publicly available MCP server implementations are vulnerable to at least one form of command injection. These vulnerabilities are not theoretical — they represent real attack surfaces through which a malicious or misused MCP tool invocation could achieve arbitrary code execution, data exfiltration, or privilege escalation on host systems.

**The spec conformance problem is invisible until it breaks.** MCP is built on JSON-RPC 2.0 with a layered specification covering capability negotiation, tool schema declaration, resource handling, prompt management, sampling behavior, and transport-layer protocol (stdio and HTTP+SSE). Developers routinely ship servers with partial implementations — missing required capability fields, malformed tool input schemas, incorrect error codes, or authentication configurations that are technically present but structurally wrong. These defects surface as silent failures, mysterious client incompatibilities, or undefined behavior when paired with newer MCP client versions.

**The EU AI Act creates a compliance clock.** The Act's requirements for "high-risk AI systems" used in automated decision pipelines include auditability and documented validation procedures. For enterprise teams building on top of MCP — where server tools directly inform model behavior — the August 2026 enforcement deadline creates a concrete and time-sensitive requirement for documented, repeatable conformance verification. No lightweight tooling exists today to satisfy this need.

**Existing tools leave the gap wide open.** Current solutions require trade-offs no developer or DevOps team should have to make:

| Tool | What It Misses |
|------|---------------|
| MCP Inspector (official) | Debug-only. No CI integration. No security checks. Manual use only. |
| Snyk Agent-Scan | Requires Snyk account and API key. No spec conformance scoring. |
| Cisco MCP Scanner | Enterprise procurement process. Not developer-accessible. |
| Manual testing | Non-reproducible. Not integrated into CI. Cannot scale across 10K servers. |

The gap is specific and unoccupied: **no tool today combines spec conformance scoring, security vulnerability detection, and CI-native pass/fail gating in a single, zero-config, zero-account CLI.**

---

## 3. Target Audience

### Primary: The MCP Server Developer

**Persona: "Platform Dev Paulo"**

- **Role:** Backend or full-stack developer, 3-8 years experience
- **Context:** Building an MCP server — either a first-party tool server for their company's AI features or a standalone open-source server they intend to publish to the MCP registry or GitHub
- **Stack:** TypeScript or Python. Uses GitHub for version control. Has a CI/CD pipeline (GitHub Actions, CircleCI, or similar). Runs `npm` or `npx` daily.
- **Core Job:** Ship a server that works correctly with MCP clients, passes code review, and does not introduce security holes into their team's AI stack
- **Pain today:** MCP Inspector is useful during development but does not give a definitive "is this correct" answer. The spec is detailed (JSON-RPC 2.0 base + MCP layers) and it is easy to miss required fields or misunderstand capability semantics. They have no way to gate a PR on spec health.
- **What they want from MCP Verify:** Run `npx mcp-verify ./my-server` and get a clear score, a list of what is wrong, and confidence that CI will catch regressions automatically.
- **Volume:** Estimated 100K active MCP server developers globally in 2026, growing to 250K by end of year.

### Secondary: The Platform / DevOps Team

**Persona: "DevOps Lead Dana"**

- **Role:** Platform engineer or DevOps lead at a company that has adopted MCP for internal AI tooling
- **Context:** Managing a portfolio of 5-50 internal MCP servers across multiple teams. Responsible for the health, security posture, and governance of the company's AI infrastructure.
- **Stack:** Infrastructure-as-code, GitHub Enterprise or GitLab, centralized CI/CD, security scanning pipelines (Snyk, Dependabot, Semgrep). Considers tool sprawl a risk.
- **Core Job:** Ensure every MCP server deployed internally meets a documented security and conformance standard. Prevent bad servers from reaching production. Produce reports for security reviews.
- **Pain today:** Each team's MCP server is a black box from a security perspective. There is no consistent standard or automated gate. Snyk Agent-Scan requires per-developer accounts. There is no way to produce a conformance report for a quarterly security review.
- **What they want from MCP Verify:** A GitHub Action they can add to every MCP repo via a template. JSON output they can ingest into their SIEM or dashboard. Configurable pass/fail thresholds per environment (dev is more permissive; prod blocks on any security finding).
- **Volume:** Estimated 15,000-30,000 platform/DevOps teams with MCP exposure globally.

### Tertiary: The Enterprise Compliance Team

**Persona: "Compliance Architect Chris"**

- **Role:** AI governance lead, enterprise architect, or CISO-adjacent role at a large company using MCP servers in regulated or high-stakes decision pipelines
- **Context:** Preparing for EU AI Act Article 9-17 compliance (high-risk AI systems). Legal team has flagged that automated AI tools acting on MCP server outputs may constitute high-risk AI use. Needs documented, auditable evidence of validation procedures.
- **Stack:** Jira, Confluence, internal audit trails. May not write code. Needs tooling that produces outputs their compliance and legal teams can read and store.
- **Core Job:** Demonstrate that every AI system touching regulated decisions has been validated according to documented procedures. Avoid the August 2026 enforcement cliff.
- **Pain today:** No tool produces a structured, dated conformance certificate for an MCP server. Manual testing notes in a Confluence page do not constitute a repeatable validation procedure.
- **What they want from MCP Verify:** A Markdown or JSON report with a dated conformance score and security findings they can store in their audit trail. A defined scoring methodology they can reference in compliance documentation.
- **Volume:** Estimated 5,000-10,000 enterprise organizations in EU AI Act scope with MCP exposure.

---

## 4. Key Features

Priority levels follow the MoSCoW-adjacent P0/P1/P2 framework:
- **P0 (Must have for MVP — Sprint 1-2):** Without these, the product does not exist.
- **P1 (Should have — Sprint 3):** Strongly expected by users; meaningfully reduces adoption friction.
- **P2 (Nice to have — Sprint 4):** Increases stickiness and opens enterprise/team use cases.

### P0: Core Verification Engine

**P0.1 — MCP Spec Conformance Scoring**

Grade a server against the versioned MCP specification (targeting MCP 1.x as of March 2026) across all protocol layers:

- JSON-RPC 2.0 compliance: correct request/response envelope structure, required `jsonrpc`, `id`, `method` fields, valid error codes (-32700 to -32603 standard, -32000 to -32099 server-defined)
- Initialization handshake: `initialize` request/response, `initialized` notification, capability negotiation correctness (`tools`, `resources`, `prompts`, `sampling` capability fields)
- Tool schema validation: `tools/list` response structure, per-tool `inputSchema` as valid JSON Schema draft-07, required `name` and `description` fields
- Resource protocol: `resources/list` URI templates, `resources/read` response envelope
- Prompt protocol: `prompts/list` and `prompts/get` message structure
- Transport correctness: stdio (line-delimited JSON-RPC) and HTTP+SSE (correct Content-Type headers, SSE event stream format)
- Error handling: Structured error responses for malformed requests, unknown methods, invalid params

Output: Conformance score 0-100 with per-category breakdown (initialization, tools, resources, prompts, transport, error handling).

**P0.2 — Security Vulnerability Detection**

Detect the top documented MCP-specific vulnerabilities from 2026 security research:

1. **Command injection susceptibility:** Analyze tool `inputSchema` definitions for patterns that expose shell-executable parameters without sanitization constraints (e.g., string fields with no pattern restriction passed to tool handlers that likely execute subprocesses)
2. **Wildcard CORS policy:** Detect `Access-Control-Allow-Origin: *` on HTTP transport endpoints, which enables cross-origin tool invocation from any web context
3. **Missing or misconfigured authentication:** Detect absence of authentication headers, tokens, or OAuth flows on remote HTTP MCP servers accessible without credentials
4. **Tool poisoning patterns:** Identify tool descriptions or names that match known prompt injection patterns — instructions embedded in tool metadata designed to hijack model behavior
5. **Information leakage in error responses:** Detect verbose error messages that expose stack traces, internal paths, environment variables, or system information

Each finding includes: severity (Critical, High, Medium, Low), CVSS-adjacent score, affected component, description, and remediation guidance.

**P0.3 — CLI with Pass/Fail Exit Codes**

Single-command interface with zero external dependencies:

```
npx mcp-verify <target>

# Examples:
npx mcp-verify http://localhost:3000
npx mcp-verify stdio://./my-server.js
npx mcp-verify --config mcp-verify.json http://staging.example.com/mcp
```

Exit codes:
- `0`: All checks pass (or all findings are below configured severity threshold)
- `1`: One or more findings exceed the configured severity threshold
- `2`: Tool error (cannot connect, invalid target, internal error)

Default human-readable terminal output with color coding (red/yellow/green). Execution time target: under 10 seconds for any typical MCP server. Package size target: under 5MB.

### P1: CI Integration and Structured Reporting

**P1.1 — GitHub Action**

First-class GitHub Action for drop-in CI integration:

```yaml
# .github/workflows/mcp-verify.yml
- uses: mcp-verify/action@v1
  with:
    target: http://localhost:3000
    fail-on-severity: high
    conformance-threshold: 80
```

Features: PR status checks with pass/fail annotations, inline PR comment with summary report, configurable severity and conformance thresholds, support for matrix builds (test against multiple server targets).

**P1.2 — JSON Report Format**

Machine-readable output for pipeline integration:

```
npx mcp-verify --format json http://localhost:3000 > report.json
```

Schema: Versioned JSON with `meta` (tool version, timestamp, target), `conformance` (score, breakdown by category, per-check results), `security` (findings array with severity, CVSS, component, description, remediation), `summary` (pass/fail, blocker count by severity).

**P1.3 — Markdown Report Format**

Human-readable structured output suitable for PR comments, Confluence pages, and audit trail storage:

```
npx mcp-verify --format markdown http://localhost:3000 > report.md
```

Includes: Summary table, conformance score with category breakdown, security findings with remediation steps, tool metadata (version, timestamp, target, duration).

**P1.4 — Configurable Thresholds**

Project-level configuration file (`mcp-verify.json` or `.mcp-verify.json`) for:

```json
{
  "failOnSeverity": "high",
  "conformanceThreshold": 75,
  "skip": ["cors-wildcard"],
  "transport": "http",
  "timeout": 15000
}
```

Threshold options: conformance score minimum (0-100), minimum severity to block (critical/high/medium/low/none), per-check suppression with documented justification field.

### P2: Advanced Features and Enterprise Enablement

**P2.1 — Web Dashboard**

Optional locally-served web UI (`npx mcp-verify serve`) for teams running repeated verifications:

- Historical score charts per server endpoint
- Side-by-side diff of conformance scores between versions
- Finding trends over time (improving/regressing)
- Multi-server portfolio view for platform teams

No cloud. No accounts. Data stored locally in `~/.mcp-verify/history/` as flat JSON files.

**P2.2 — Historical Tracking**

Local-first run history with regression detection:

- Stores timestamped results per target URL
- CLI flag `--compare-last` surfaces regressions since previous run
- Optional `--baseline` command to pin a known-good state for future comparisons
- JSON export of full history for SIEM ingestion

**P2.3 — Custom Rule Plugins**

Plugin API for extending the security and conformance check suite:

```javascript
// mcp-verify.config.js
export default {
  plugins: ['./rules/internal-auth-check.js'],
  rules: {
    'internal-auth-check': { severity: 'critical', endpoint: '/auth/validate' }
  }
}
```

Enables enterprise teams to encode internal security policies as custom rules, and enables the community to publish shared rule packages on npm.

---

## 5. Success Metrics

### North Star Metric

**Weekly Active Verification Runs** — the number of distinct `mcp-verify` invocations per week, counting both CLI and GitHub Action executions. This directly measures whether developers are integrating verification into their workflow, not just downloading the tool.

North Star target: 10,000 weekly active runs by end of Sprint 4 + 8 weeks post-launch.

### Acquisition Metrics

| Metric | 30 Days | 90 Days | 180 Days |
|--------|---------|---------|----------|
| npm downloads (total) | 5,000 | 25,000 | 100,000 |
| npm downloads (weekly) | 1,000 | 5,000 | 15,000 |
| GitHub stars | 200 | 800 | 2,500 |
| GitHub forks | 20 | 80 | 250 |
| Unique CLI users (estimated from install telemetry) | 500 | 3,000 | 12,000 |

### Activation Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Users who run a second verification within 7 days of first | >40% | Anonymous run telemetry (opt-in) |
| Users who configure a `.mcp-verify.json` | >25% | File existence heuristic in telemetry |
| GitHub Action integrations (unique repos using action) | 500 by 90 days | GitHub marketplace install data |
| CI integration rate (users who add GitHub Action after first CLI use) | >30% | Cross-referencing npm installs with Action installs |

### Quality Metrics

| Metric | Target |
|--------|--------|
| CLI execution time (p95, typical MCP server) | < 10 seconds |
| False positive rate on security findings | < 5% (tracked via GitHub issue reports) |
| npm package size | < 5MB unpacked |
| Zero required external dependencies at runtime | Enforced by build constraints |
| Test coverage | > 85% line coverage |

### Community and Trust Metrics

| Metric | 90-Day Target |
|--------|--------------|
| Open issues with `bug` label resolved within 7 days | > 75% |
| Community-contributed rules/plugins | 3+ |
| Mentions in MCP ecosystem newsletters/blogs | 5+ |
| Adoption by MCP SDK maintainers or official tooling references | 1+ |

### Business / Impact Metrics

| Metric | Target |
|--------|--------|
| Enterprise teams using mcp-verify in production CI (self-reported) | 50 by 180 days |
| Documented use in EU AI Act compliance submissions | 5 by August 2026 |
| Security vulnerabilities detected and fixed by users (estimated from issue reports) | 500+ within 90 days |

---

## 6. Product Roadmap

### Sprint 1: Foundation — CLI Scaffold + Protocol Client + Spec Validation

**Duration:** 2 weeks
**Objective:** A working CLI that can connect to an MCP server, speak the protocol, and produce a conformance score for the initialization and tool schema layers.

**Deliverables:**

- `mcp-verify` CLI scaffold with Commander.js: `verify`, `--format`, `--config`, `--version` commands
- MCP protocol client supporting both stdio and HTTP+SSE transports
- JSON-RPC 2.0 envelope validator (structure, field types, error codes)
- MCP initialization handshake verifier (initialize/initialized exchange, capability field validation)
- Tool schema validator: `tools/list` response structure, per-tool JSON Schema validation
- Human-readable terminal reporter with color coding and score display
- Exit code implementation (0/1/2)
- Vitest unit test suite, > 80% coverage of core validation logic
- Published to npm as `mcp-verify@0.1.0-alpha`

**Exit Criteria:**
- `npx mcp-verify http://localhost:3000` produces a conformance score against a reference MCP server
- Pass and fail exits are demonstrated against a known-good and known-bad test fixture

### Sprint 2: Security — Vulnerability Detection Engine

**Duration:** 2 weeks
**Objective:** Add the five-category security check engine and demonstrate detection against known-vulnerable server fixtures.

**Deliverables:**

- Command injection susceptibility analyzer (tool inputSchema pattern analysis)
- CORS wildcard detector (HTTP transport header inspection)
- Authentication gap detector (missing auth on remote HTTP endpoints)
- Tool poisoning pattern detector (tool name and description heuristic matching against known prompt injection patterns)
- Information leakage detector (error response verbosity analysis)
- Security finding data model: severity, CVSS-adjacent score, component, description, remediation
- Updated terminal reporter showing security findings alongside conformance score
- Known-vulnerable server test fixtures for all five check categories
- Security check test suite, > 85% coverage
- Published as `mcp-verify@0.2.0-alpha`

**Exit Criteria:**
- Detects all five vulnerability categories against reference vulnerable fixtures
- False positive rate < 5% against a suite of 10 known-clean servers
- Full CLI run completes in < 10 seconds on local server

### Sprint 3: CI Integration — GitHub Action + Structured Reporting

**Duration:** 2 weeks
**Objective:** Make mcp-verify a native CI citizen with a GitHub Action, structured output formats, and configurable thresholds that enable pass/fail gating.

**Deliverables:**

- GitHub Action (`action.yml`) with inputs: `target`, `fail-on-severity`, `conformance-threshold`, `format`, `config`
- GitHub Action PR annotation and comment reporter
- JSON output format (`--format json`) with versioned schema
- Markdown output format (`--format markdown`) suitable for audit trail storage
- `mcp-verify.json` / `.mcp-verify.json` project-level configuration support
- Configurable severity threshold and conformance score threshold
- Per-check suppression with `justification` field
- Integration test against a live reference MCP server in GitHub Actions CI
- Published as `mcp-verify@1.0.0`
- GitHub Action published to GitHub Marketplace

**Exit Criteria:**
- GitHub Action blocks a PR when a security finding exceeds configured severity
- GitHub Action posts a Markdown summary report as a PR comment
- JSON output passes schema validation against documented schema
- `mcp-verify@1.0.0` published to npm with < 5MB package size

### Sprint 4: Advanced Features — Dashboard + Historical Tracking + Polish

**Duration:** 2 weeks
**Objective:** Increase long-term stickiness for power users and enterprise teams. Add local web dashboard, historical tracking, and plugin API. Ship production-quality documentation and examples.

**Deliverables:**

- Local web dashboard (`npx mcp-verify serve`) with historical score charts
- Run history storage in `~/.mcp-verify/history/` as flat JSON
- `--compare-last` regression detection flag
- `--baseline` command for pinning known-good state
- Plugin API for custom rules (`mcp-verify.config.js` with `plugins` array)
- Two reference community rule examples (published as separate npm packages)
- Full documentation site (README, CLI reference, GitHub Action reference, plugin authoring guide)
- Example integration workflows for GitHub Actions, GitLab CI, CircleCI
- Performance optimization pass: ensure p95 < 10s on remote servers
- Published as `mcp-verify@1.1.0`

**Exit Criteria:**
- Web dashboard displays historical scores for at least 10 runs per server
- Custom plugin successfully intercepts and adds findings to the report
- Documentation site covers all P0, P1, and P2 features
- End-to-end integration test suite passes against 5 real public MCP servers

---

## 7. Non-Goals

The following are explicitly outside the scope of MCP Verify. These boundaries are product decisions, not technical limitations — they protect focus and execution quality.

**We will NOT build a cloud service or SaaS platform.** MCP Verify is and will remain a local-first, zero-account tool. There will be no hosted verification API, no centralized results storage, no cloud dashboard. This is a deliberate architectural and trust decision: developers should not need to send their server endpoints and tool schemas to a third party.

**We will NOT build a general-purpose API security scanner.** MCP Verify checks MCP-specific protocol compliance and MCP-specific attack patterns. It is not a replacement for OWASP ZAP, Burp Suite, or general HTTP security testing. Our security checks are scoped to the MCP threat model.

**We will NOT provide a managed server registry or certification service.** We will not issue "MCP Verified" badges through a central authority, manage a list of certified servers, or operate an approval process. Verification is always run locally by the developer.

**We will NOT build IDE plugins or language server integrations in the initial roadmap.** VS Code extensions, language server protocol integrations, or editor-native feedback loops are future opportunities, not current priorities.

**We will NOT support non-MCP protocols.** Verification of arbitrary JSON-RPC APIs, OpenAPI/REST endpoints, or gRPC services is out of scope. The product is tightly coupled to the MCP specification.

**We will NOT build automated remediation or code generation.** MCP Verify identifies problems. It does not write fixes. Suggesting remediation steps in the report (P0) is in scope; generating corrected code is not.

**We will NOT require or collect any telemetry by default.** Any usage telemetry is opt-in only, clearly documented, and never includes server URLs, tool schemas, or finding details.

---

## 8. Competitive Positioning

### How We Win

Our strategic positioning is built on a single, defensible claim: **MCP Verify is the only tool that does all three things — spec conformance, security scanning, and CI gating — in a single zero-config CLI with no accounts required.**

Each word in that claim eliminates at least one competitor.

### Competitor-by-Competitor Breakdown

**vs. MCP Inspector (Official Anthropic Tool)**

MCP Inspector is a development-time debugging tool. It is excellent at what it does: interactive protocol exploration during development. It is not designed for, and does not support, CI integration, automated scoring, security checks, or reproducible pass/fail gating.

Our positioning: "MCP Inspector tells you what your server is doing. MCP Verify tells you whether it should ship."

We actively recommend MCP Inspector for interactive debugging. We do not compete with it — we complement it in the developer workflow. This cooperative positioning is important: the official tool's maintainers are potential endorsers, not adversaries.

Differentiation summary:
- MCP Verify: automated, CI-native, security-aware, scoreable, non-interactive
- MCP Inspector: interactive, debug-focused, development-phase only

**vs. Snyk Agent-Scan**

Snyk Agent-Scan is a security product first. It requires a Snyk account and API key, which creates friction for individual developers and open-source projects. It has no concept of MCP spec conformance scoring. Its security checks are generalized to AI agent patterns rather than MCP-specific vulnerability research.

Our positioning: "Snyk requires an account and a credit card conversation. MCP Verify requires `npx`."

Differentiation summary:
- MCP Verify: zero-account, MCP-specific spec conformance, open-source, free
- Snyk: account required, no spec conformance, enterprise pricing, broader scope

We should not position against Snyk's breadth — they scan dependencies, code, and containers too. We should position on depth: we go deeper on MCP than Snyk will, because MCP is our entire focus.

**vs. Cisco MCP Scanner**

Cisco MCP Scanner targets enterprise security teams, not individual developers. It requires procurement, licensing, and integration into enterprise security toolchains. A developer building an open-source MCP server cannot evaluate or use it.

Our positioning: "Cisco MCP Scanner is for the security team. MCP Verify is for the developer who writes the server."

This is not a direct competitive threat in the near term — we serve entirely different buyer personas. The risk is that enterprise teams who adopt MCP Verify as a developer tool later see Cisco's product as a governance overlay. This is acceptable; we should ensure our JSON output is consumable by enterprise SIEM tools so we remain relevant even when enterprise tooling is added on top.

**vs. Manual Testing**

Manual testing — ad-hoc protocol exploration, hand-reading spec documentation, one-off curl commands — is the status quo for most MCP server developers today. This is not a product; it is an absence of tooling.

Our positioning: "Manual testing is what you did before MCP Verify."

Winning against manual testing requires being faster and easier than the developer's current approach. This is why zero-config, zero-account, and `npx mcp-verify` as the entire installation story are non-negotiable product requirements, not convenience features.

**vs. Future Official Tooling**

The risk that the MCP specification maintainers or SDK teams ship an official verification tool is real and should be planned for. Our mitigation strategy has three parts:

1. Move fast: establish community adoption, GitHub stars, and ecosystem references before official tooling appears
2. Open source everything: if official tooling appears, the community has already invested in our tool's ecosystem (plugins, CI templates, documentation)
3. Maintain security depth: spec conformance can be replicated by official tooling; deep security research-backed vulnerability detection is harder to replicate quickly

### Positioning Matrix

| Capability | MCP Verify | MCP Inspector | Snyk Agent-Scan | Cisco MCP Scanner |
|-----------|-----------|--------------|----------------|------------------|
| MCP spec conformance scoring | Yes | Partial (manual) | No | Unknown |
| Security vulnerability detection | Yes | No | Yes | Yes |
| CI/CD native integration | Yes | No | Yes | Partial |
| GitHub Action | Yes | No | Yes | No |
| Zero account required | Yes | Yes | No | No |
| Free / open source | Yes | Yes | Freemium | No |
| JSON/Markdown output | Yes | No | Yes | Unknown |
| < 10s execution | Yes | N/A | Unknown | No |
| Local-first (no cloud) | Yes | Yes | No | No |

---

## 9. Risk Assessment

### Risk 1: MCP Specification Evolves Faster Than Our Checks

**Likelihood:** High
**Impact:** Medium
**Description:** The MCP specification is actively developed. New capability types, transport methods, or protocol versions could invalidate or miss-score servers that are technically correct for a newer spec version. This is the highest-likelihood risk in the project.

**Mitigation:**
- Version-pin all spec checks to a declared MCP spec version (e.g., `mcp-spec-version: 2024-11-05`)
- Design the conformance engine as a pluggable rule set where each rule declares the spec version(s) it applies to
- Monitor the modelcontextprotocol/specification GitHub repository for PRs and releases; treat spec changes as P0 issues
- Maintain a `CHANGELOG` of spec version support explicitly in our documentation
- Tag `mcp-verify` npm releases with the spec version they validate (e.g., `mcp-verify@1.0.0` validates against `mcp-spec@2024-11-05`)

**Residual Risk:** Medium — we cannot eliminate the risk of spec evolution, only reduce response time.

### Risk 2: Official Tooling Closes the Gap

**Likelihood:** Medium
**Impact:** High
**Description:** Anthropic or the MCP SDK maintainers ship an official `mcp-validate` or similar tool that addresses spec conformance and, optionally, security. If this happens within 3-6 months, it directly threatens adoption.

**Mitigation:**
- Sprint 1-2 execution speed is the primary mitigation: be in market before official tooling ships
- Publish `mcp-verify@1.0.0` (P1-complete) within 8 weeks of Sprint 1 start
- Build community investment: GitHub stars, plugin ecosystem, CI template library — community switching costs grow over time
- Differentiate on security depth: official tooling is unlikely to invest deeply in the 43% injection vulnerability research; we should own this narrative
- Consider reaching out to MCP maintainers to position as complementary tooling, not competing tooling

**Residual Risk:** Medium — cannot be eliminated, only delayed and mitigated through community investment.

### Risk 3: MCP Server Diversity Makes Universal Coverage Unreliable

**Likelihood:** High
**Impact:** Medium
**Description:** MCP servers vary widely in transport (stdio vs HTTP+SSE), authentication patterns (none, Bearer tokens, OAuth 2.0, mTLS), server frameworks (TypeScript SDK, Python SDK, custom implementations), and deployment contexts (local process, container, remote). A check that works reliably against one implementation may produce false positives or false negatives against another.

**Mitigation:**
- Test the conformance engine against a curated set of 20+ real public MCP servers before `v1.0.0` release
- Build a reference server test fixture suite (known-good and known-bad) as part of the project, versioned and maintained
- Implement per-check confidence scoring: some checks are deterministic (JSON-RPC envelope), others are heuristic (injection susceptibility) — expose this distinction in output
- Provide a `--strict` / `--lenient` mode to tune heuristic check sensitivity
- Track false positive reports as first-class GitHub issues; resolve within 7 days

**Residual Risk:** Low-Medium — unavoidable with a highly diverse target ecosystem, but manageable with robust test coverage and tunable sensitivity.

### Risk 4: Security Check False Positives Damage Tool Credibility

**Likelihood:** Medium
**Impact:** High
**Description:** A security tool that cries wolf loses trust permanently. If `mcp-verify` reports a Critical security finding against a correctly-implemented server, developers will disable or ignore the tool. A single high-profile false positive reported on social media can significantly damage adoption trajectory.

**Mitigation:**
- Every security check must have a documented rationale, test fixtures for true positives, and test fixtures for potential false positives
- Security findings distinguish between "detected pattern" and "confirmed vulnerable" — heuristic findings are labeled as such with lower confidence
- False positive rate tracking: maintain a labeled issue category `false-positive` and track monthly
- Pre-launch security check review: invite 3-5 MCP ecosystem developers to validate checks against their servers before `v1.0.0` release
- Provide `--skip` flag with required justification field to suppress specific checks organizationally
- Publish the detection methodology publicly so sophisticated users can evaluate check logic

**Residual Risk:** Low — with strong pre-launch validation and transparent methodology, credibility risk is manageable.

### Risk 5: Developer Friction Prevents Adoption at Zero-Config Promise

**Likelihood:** Medium
**Impact:** High
**Description:** The entire value proposition assumes "zero config, zero account, single command." If `npx mcp-verify` requires Node.js version negotiation, has long install times, fails on common server configurations, or produces confusing output, adoption stalls before word-of-mouth can build.

**Mitigation:**
- Target Node.js LTS versions (18, 20, 22) explicitly; test against all three in CI
- Package size hard constraint: < 5MB unpacked, enforced in build pipeline with size-limit
- `npx` cold-start time target: < 5 seconds for package download + start on a typical connection
- First-run experience test: have 5 developers unfamiliar with the project run `npx mcp-verify` against a test server with no instructions and observe where they get confused
- Error messages must be actionable: every non-zero exit must include a specific, human-readable description of what went wrong and what to try next
- Document the most common MCP server configurations (TypeScript SDK default setup) with explicit verification commands in the README

**Residual Risk:** Low — directly testable and fixable before launch.

---

## Appendix A: Spec Reference Summary

MCP Verify validates servers against the following protocol layers, sourced from modelcontextprotocol.io and the JSON-RPC 2.0 specification (jsonrpc.org):

| Layer | Key Requirements Checked |
|-------|------------------------|
| JSON-RPC 2.0 Base | `jsonrpc: "2.0"` field, request `id` type (string/number/null), `method` as string, `params` as object/array or omitted, error object structure (`code` integer, `message` string) |
| MCP Initialization | `initialize` request with `protocolVersion`, `capabilities`, `clientInfo`; response with matching fields; `initialized` notification; capability object schema |
| Tools Protocol | `tools/list` returning `tools` array; each tool with `name` (string), `description` (string), `inputSchema` (valid JSON Schema object); `tools/call` request/response structure |
| Resources Protocol | `resources/list` returning `resources` array with `uri` and `name`; `resources/read` returning `contents` array with `type` and content fields |
| Prompts Protocol | `prompts/list` returning `prompts` array; `prompts/get` returning `messages` array with `role` and `content` |
| Transport: stdio | Line-delimited JSON-RPC; proper newline termination; no extraneous output to stdout |
| Transport: HTTP+SSE | Correct `Content-Type: text/event-stream`; SSE `data:` prefix on JSON-RPC messages; proper CORS headers |
| Error Codes | Standard codes in range -32700 to -32603; server-defined in range -32000 to -32099; no use of reserved ranges |

---

## Appendix B: Security Research Basis

The five security checks implemented in Sprint 2 are grounded in the following published research findings (2025-2026):

| Vulnerability Category | Research Basis | Prevalence (where reported) |
|----------------------|---------------|---------------------------|
| Command injection susceptibility | Invariant Labs MCP Security Report (2026); Snyk State of AI Security (2025) | 43% of audited implementations |
| Wildcard CORS | OWASP API Security Top 10 (applied to MCP HTTP transport); Snyk findings | Common in developer-mode servers left in production |
| Missing authentication | Invariant Labs findings; OWASP AI Security guidelines | Prevalent in quickly-prototyped servers |
| Tool poisoning / prompt injection in metadata | Anthropic MCP security guidance; independent security researcher reports (2025) | Emerging; growing with ecosystem size |
| Information leakage in errors | OWASP API Security A5; standard secure coding practices | Common default behavior in development frameworks |

---

*Document produced by Product Manager (Tier 2 PM) for MCP Verify PDLC Project.*
*Next phase: Architecture and technical design. Reference this document for feature scope and priority decisions.*
