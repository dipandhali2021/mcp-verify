# MCP Verify — Product Roadmap

**Document Version:** 1.0
**Author:** Product Manager (Tier 2 PM)
**Date:** 2026-03-28
**Status:** Active — Sprint Execution Begins
**Framework:** Now / Next / Later / Future with RICE Scoring

---

## How to Read This Roadmap

**RICE Scoring Formula:** (Reach x Impact x Confidence) / Effort

- **Reach** — estimated number of users touched per sprint (0–10 scale, where 10 = all active users)
- **Impact** — business/user value multiplier: 0.25 (minimal), 0.5 (low), 1 (medium), 2 (high), 3 (massive)
- **Confidence** — how certain we are about Reach and Impact estimates (0–100%)
- **Effort** — person-sprints to deliver (1 person-sprint = one engineer for one 2-week sprint)

**Capacity Allocation per Sprint:**
- 70% Features (core product work)
- 20% Tech Health (testing, refactoring, dependency management)
- 10% Buffer (unplanned bugs, scope adjustments)

**Sprint Duration:** 2 weeks
**Team Size:** 3 engineers per sprint (cli-developer, typescript-pro, backend-developer / security-engineer)

---

## Now — Sprint 1–2: Foundation + Security

These items are committed. Delivery is the sprint goal. Any change to this list requires explicit re-planning.

---

### 1. CLI Scaffold + Commander.js Interface

**RICE Calculation:**
- Reach: 10 (every user touches the CLI — it is the product entry point)
- Impact: 3 (without this, the product does not exist; zero value is delivered)
- Confidence: 95% (Commander.js is well-understood; requirement is unambiguous)
- Effort: 0.5 person-sprints

**RICE Score: (10 x 3 x 0.95) / 0.5 = 57.0**

| Field | Value |
|-------|-------|
| Sprint | Sprint 1 |
| Status | Not Started |
| Requirements | FR-001, FR-004, FR-005, FR-006, FR-007, FR-008, FR-010 |
| Dependencies | Repository scaffold must exist (S-1-01, S-1-02) |

**Success Criteria:**
- `npx mcp-verify <target>` executes without prior installation
- `--version` prints tool version and MCP spec version being validated
- `--help` lists all flags with types, defaults, and at least three examples
- Exit codes 0 (pass), 1 (fail), 2 (error) are implemented and tested at the process boundary
- `--timeout <ms>` flag is honored throughout the full verification pipeline
- Missing `<target>` prints usage help and exits with code 2

---

### 2. MCP Protocol Client (stdio + HTTP+SSE)

**RICE Calculation:**
- Reach: 10 (every verification run requires a working transport layer)
- Impact: 3 (without connectivity, no checks can run — foundational blocker)
- Confidence: 85% (HTTP+SSE SSE framing edge cases introduce modest implementation uncertainty)
- Effort: 1.5 person-sprints

**RICE Score: (10 x 3 x 0.85) / 1.5 = 17.0**

| Field | Value |
|-------|-------|
| Sprint | Sprint 1 |
| Status | Not Started |
| Requirements | FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, FR-017, FR-018, FR-019 |
| Dependencies | CLI Scaffold (exit code routing); repository scaffold |

**Success Criteria:**
- `stdio://` targets spawn a child process and exchange line-delimited JSON-RPC correctly
- `http://` and `https://` targets connect via HTTP POST + SSE stream
- MCP initialization handshake (initialize request, server response, initialized notification) completes successfully
- `tools/list`, `resources/list`, and `prompts/list` are called conditionally per declared capabilities
- Error probe (unknown method + malformed JSON) captures server error responses
- All connections terminate cleanly (SIGTERM then SIGKILL) at end of verification

---

### 3. JSON-RPC 2.0 Conformance Validator

**RICE Calculation:**
- Reach: 10 (every server verification exercises this layer — it is the protocol foundation)
- Impact: 2 (high value: catches the most fundamental class of spec violations)
- Confidence: 95% (JSON-RPC 2.0 spec is stable and fully specified; implementation is deterministic)
- Effort: 0.4 person-sprints

**RICE Score: (10 x 2 x 0.95) / 0.4 = 47.5**

| Field | Value |
|-------|-------|
| Sprint | Sprint 1 |
| Status | Not Started |
| Requirements | FR-021, FR-022 |
| Dependencies | MCP Protocol Client (VerificationContext populated with raw messages) |

**Success Criteria:**
- Validates presence and type of `jsonrpc: "2.0"`, `id`, `result`/`error` mutual exclusion, `method`
- Flags error codes outside the standard range (-32700 to -32603) and server-defined range (-32000 to -32099)
- Warns on use of reserved code ranges
- All violations recorded as typed `ConformanceViolation` entries with category and field reference

---

### 4. MCP Initialization Handshake Verifier

**RICE Calculation:**
- Reach: 10 (every server goes through initialization — prerequisite to all further checks)
- Impact: 2 (initialization failures represent 25% of conformance score weight; common failure mode)
- Confidence: 90% (initialization spec is well-defined; modest uncertainty around protocolVersion edge cases)
- Effort: 0.3 person-sprints

**RICE Score: (10 x 2 x 0.90) / 0.3 = 60.0**

| Field | Value |
|-------|-------|
| Sprint | Sprint 1 |
| Status | Not Started |
| Requirements | FR-023, FR-024, FR-035 |
| Dependencies | MCP Protocol Client (initialization handshake); JSON-RPC 2.0 Conformance Validator |

**Success Criteria:**
- Validates `protocolVersion` presence and type in initialize response
- Validates `capabilities` object structure including tool/resource/prompt/sampling fields
- Warns on absent or malformed `serverInfo`
- Cross-checks declared capabilities against actual protocol responses (tools declared but no tools/list response flagged)
- Total initialization failure drives overall conformance score to 0

---

### 5. Tool Schema Validator

**RICE Calculation:**
- Reach: 9 (tools are the primary MCP primitive; the vast majority of servers declare at least one tool)
- Impact: 2 (tool schema errors are the most common conformance issue per developer feedback patterns; 25% of score weight)
- Confidence: 90% (JSON Schema draft-07 is well-specified; edge cases around additionalProperties handling add minor uncertainty)
- Effort: 0.5 person-sprints

**RICE Score: (9 x 2 x 0.90) / 0.5 = 32.4**

| Field | Value |
|-------|-------|
| Sprint | Sprint 1 |
| Status | Not Started |
| Requirements | FR-025, FR-026 |
| Dependencies | MCP Protocol Client (tools/list response); Initialization Handshake Verifier (capability check) |

**Success Criteria:**
- Validates each tool has required `name` (string) and `description` (string) fields
- Validates `inputSchema` is a valid JSON Schema draft-07 object with `type: "object"`
- Flags missing or malformed `properties` and `required` array entries
- Records per-tool violations with tool name as the affected component

---

### 6. Conformance Scoring Engine (0–100)

**RICE Calculation:**
- Reach: 10 (every run produces a score; the score is the product's primary output)
- Impact: 3 (the score is the North Star output that gates CI and drives user decisions)
- Confidence: 85% (scoring algorithm is defined; modest uncertainty around edge-case weighting behavior)
- Effort: 0.5 person-sprints

**RICE Score: (10 x 3 x 0.85) / 0.5 = 51.0**

| Field | Value |
|-------|-------|
| Sprint | Sprint 1 |
| Status | Not Started |
| Requirements | FR-032, FR-052 |
| Dependencies | All conformance validators (JSON-RPC, Init, Tools, Resources, Prompts, Transport, Error Handling) |

**Success Criteria:**
- Produces a single 0–100 integer conformance score
- Category weights applied: JSON-RPC 20%, Initialization 25%, Tools 25%, Resources 10%, Prompts 10%, Transport 10%
- Total initialization failure (unable to complete handshake) produces a score of 0
- Per-category breakdown scores are surfaced alongside the total
- Spec version metadata (`meta.specVersion: "2024-11-05"`) attached to all output

---

### 7. Terminal Reporter with Color Output

**RICE Calculation:**
- Reach: 10 (every CLI user sees the terminal reporter on every run)
- Impact: 2 (output quality directly affects developer trust, adoption decisions, and time-to-fix)
- Confidence: 95% (scope is well-defined; chalk and TTY detection are proven patterns)
- Effort: 0.4 person-sprints

**RICE Score: (10 x 2 x 0.95) / 0.4 = 47.5**

| Field | Value |
|-------|-------|
| Sprint | Sprint 1 |
| Status | Not Started |
| Requirements | FR-046, FR-047, FR-048 |
| Dependencies | Conformance Scoring Engine; Security Finding Data Model (Sprint 2 integration) |

**Success Criteria:**
- TTY detection controls color output; `NO_COLOR` environment variable is honored
- Summary block shows: target URL, transport type, tool version, spec version, timestamp, score (color-coded green/yellow/red), verdict (PASS/FAIL), and duration
- Category breakdown shows per-category scores with indented violation list
- Score color thresholds: green >= 80, yellow 50–79, red < 50
- Security findings section renders in Sprint 2 terminal reporter update

---

### 8. Command Injection Detection

**RICE Calculation:**
- Reach: 7 (43% of MCP servers are affected per Invariant Labs 2026 research; high but not universal)
- Impact: 3 (Critical/High severity finding; directly prevents arbitrary code execution on host systems)
- Confidence: 80% (heuristic pattern matching means some implementation uncertainty around precision vs. recall tradeoff)
- Effort: 0.8 person-sprints

**RICE Score: (7 x 3 x 0.80) / 0.8 = 21.0**

| Field | Value |
|-------|-------|
| Sprint | Sprint 2 |
| Status | Not Started |
| Requirements | FR-036 |
| Dependencies | Security Finding Data Model; MCP Protocol Client (tools/list response via VerificationContext) |

**Success Criteria:**
- Scans all tool `inputSchema` properties for unconstrained string parameters matching high-risk name patterns (`command`, `cmd`, `exec`, `shell`, `script`, `args`, `argv`, `path`, `file`, `filename`, `dir`, `directory`)
- Checks description substrings for execution-indicating language (`execute`, `run`, `command`, `shell`, `script`, `path to`)
- Skips non-string types and parameters with `pattern` or `enum` constraints applied
- Severity: High, CVSS: 8.1, Confidence label: heuristic
- Zero findings against the clean fixture suite (false positive rate < 5%)
- Fires against `command-injection-server.ts` vulnerable fixture

---

### 9. CORS Wildcard Detection

**RICE Calculation:**
- Reach: 5 (affects HTTP transport servers only; stdio servers not in scope)
- Impact: 2 (High severity; enables cross-origin tool invocation from any web context)
- Confidence: 95% (fully deterministic header check; no heuristic ambiguity)
- Effort: 0.3 person-sprints

**RICE Score: (5 x 2 x 0.95) / 0.3 = 31.7**

| Field | Value |
|-------|-------|
| Sprint | Sprint 2 |
| Status | Not Started |
| Requirements | FR-037 |
| Dependencies | Security Finding Data Model; HTTP+SSE Transport (header capture in VerificationContext) |

**Success Criteria:**
- Inspects all HTTP response headers captured during transport layer communication
- Flags `Access-Control-Allow-Origin: *` on any endpoint
- Records affected endpoint URL in the finding component field
- Severity: High, CVSS: 7.5, Confidence label: deterministic
- Skips stdio transport targets entirely
- Fires against `cors-wildcard-server.ts` vulnerable fixture; zero findings against clean CORS fixture

---

### 10. Auth Gap Detection

**RICE Calculation:**
- Reach: 4 (applies to public and private-network HTTP servers; loopback and stdio are skipped)
- Impact: 3 (Critical finding for public endpoints per CVSS 9.8; prevents unauthenticated tool access)
- Confidence: 75% (host classification and absence-of-auth heuristic has meaningful edge-case surface)
- Effort: 0.8 person-sprints

**RICE Score: (4 x 3 x 0.75) / 0.8 = 11.25**

| Field | Value |
|-------|-------|
| Sprint | Sprint 2 |
| Status | Not Started |
| Requirements | FR-038 |
| Dependencies | Security Finding Data Model; HTTP+SSE Transport; MCP Protocol Client (response headers) |

**Success Criteria:**
- Resolves target host and classifies as loopback, private RFC 1918, or public
- Checks absence of `Authorization` request header requirement and `WWW-Authenticate` challenge in server responses
- Severity Critical (CVSS 9.8) for public endpoints; Medium (CVSS 6.5) for private network
- Skips loopback and stdio targets
- Fires against `missing-auth-server.ts` vulnerable fixture; zero findings against authenticated fixture

---

### 11. Tool Poisoning Detection

**RICE Calculation:**
- Reach: 6 (emerging threat; growing in prevalence as ecosystem scales; relevant to all servers with tools)
- Impact: 3 (Critical severity; prompt injection in tool metadata can hijack model behavior entirely)
- Confidence: 75% (heuristic pattern matching against natural language descriptions carries inherent uncertainty)
- Effort: 0.8 person-sprints

**RICE Score: (6 x 3 x 0.75) / 0.8 = 16.875**

| Field | Value |
|-------|-------|
| Sprint | Sprint 2 |
| Status | Not Started |
| Requirements | FR-039 |
| Dependencies | Security Finding Data Model; MCP Protocol Client (tools/list via VerificationContext) |

**Success Criteria:**
- Scans tool `name` and `description` fields for known injection patterns: all-caps imperatives (`IGNORE PREVIOUS`, `DO NOT`, `[SYSTEM]`, `<system>`), model-hijack phrases (`you must`, `you are now`), XML/HTML system-prompt tags
- Flags tool descriptions exceeding 2000 characters as suspicious
- Flags Base64 or URL-encoded substrings in tool names
- Severity: Critical, CVSS: 8.8, Confidence label: heuristic
- Fires against `tool-poisoning-server.ts` vulnerable fixture; zero findings against safe tool descriptions fixture

---

### 12. Info Leakage Detection

**RICE Calculation:**
- Reach: 6 (common default behavior in Node.js development frameworks; wide prevalence in the ecosystem)
- Impact: 2 (Medium severity; exposes internal paths, stack traces, and environment variables)
- Confidence: 90% (deterministic pattern matching against known stack trace and path patterns)
- Effort: 0.5 person-sprints

**RICE Score: (6 x 2 x 0.90) / 0.5 = 21.6**

| Field | Value |
|-------|-------|
| Sprint | Sprint 2 |
| Status | Not Started |
| Requirements | FR-040 |
| Dependencies | Security Finding Data Model; MCP Protocol Client (error probe responses from FR-018) |

**Success Criteria:**
- Analyzes error probe responses for Node.js stack trace patterns (`at Function.`, `at Object.<anonymous>`)
- Detects absolute filesystem paths (`/home/`, `/var/`, `/usr/`, `C:\Users\`, `C:\Program Files\`)
- Detects environment variable exposure patterns (`process.env.`, `ENV[`, `$ENV_`, `export `)
- Matched values are redacted in output before display
- Severity: Medium, CVSS: 5.3, Confidence label: deterministic
- Fires against `info-leakage-server.ts` vulnerable fixture; zero findings against generic-errors fixture

---

### 13. Security Finding Data Model

**RICE Calculation:**
- Reach: 10 (all five security checks and all future checks depend on this type contract)
- Impact: 2 (high: without a stable data model, security findings cannot be reported, scored, or exported)
- Confidence: 95% (data model design is fully specified in requirements; no implementation ambiguity)
- Effort: 0.3 person-sprints

**RICE Score: (10 x 2 x 0.95) / 0.3 = 63.3**

| Field | Value |
|-------|-------|
| Sprint | Sprint 2 |
| Status | Not Started |
| Requirements | FR-041, FR-044 |
| Dependencies | Conformance data model from Sprint 1 (S-1-15 as structural precedent) |

**Success Criteria:**
- `SecurityFinding` type defined with fields: `id` (SEC-NNN), `checkId`, `severity` (critical/high/medium/low), `cvssScore` (0.0–10.0), `component`, `description`, `remediation`, `confidence` (deterministic/heuristic)
- `SecurityCheckResult` aggregator type defined
- CVSS-adjacent base score constants defined per check: command-injection 8.1, cors-wildcard 7.5, auth-gap-public 9.8, auth-gap-private 6.5, tool-poisoning 8.8, info-leakage 5.3
- Security engine orchestrator integrates with scoring pipeline from Sprint 1

---

### 14. Test Fixture Suite (Known-Good + Known-Vulnerable Servers)

**RICE Calculation:**
- Reach: 10 (fixtures underpin every test in the project; without them, coverage claims are not credible)
- Impact: 2 (high: fixtures directly enable the < 5% false positive rate guarantee and the pre-launch validation commitment)
- Confidence: 90% (fixture design is explicitly specified; risk is implementation time, not design uncertainty)
- Effort: 0.9 person-sprints (five vulnerable + five clean servers)

**RICE Score: (10 x 2 x 0.90) / 0.9 = 20.0**

| Field | Value |
|-------|-------|
| Sprint | Sprint 2 |
| Status | Not Started |
| Requirements | FR-045 |
| Dependencies | MCP Protocol Client (fixtures must be valid MCP servers); all five security check implementations |

**Success Criteria:**
- Five vulnerable fixtures implemented: command-injection-server, cors-wildcard-server, missing-auth-server, tool-poisoning-server, info-leakage-server
- Five clean counterpart fixtures implemented: no-injection, correct-cors, authenticated, safe-tool-descriptions, generic-errors
- Integration tests confirm each detector fires exactly once with correct severity and CVSS against the corresponding vulnerable fixture
- False positive tests confirm zero findings from all five clean fixtures
- Test coverage gate raised to 85% at end of Sprint 2

---

## Now — RICE Score Summary Table

| Item | Reach | Impact | Confidence | Effort | RICE Score | Sprint |
|------|-------|--------|------------|--------|------------|--------|
| Security Finding Data Model | 10 | 2 | 95% | 0.3 | 63.3 | 2 |
| MCP Initialization Handshake Verifier | 10 | 2 | 90% | 0.3 | 60.0 | 1 |
| CLI Scaffold + Commander.js Interface | 10 | 3 | 95% | 0.5 | 57.0 | 1 |
| Conformance Scoring Engine | 10 | 3 | 85% | 0.5 | 51.0 | 1 |
| JSON-RPC 2.0 Conformance Validator | 10 | 2 | 95% | 0.4 | 47.5 | 1 |
| Terminal Reporter with Color Output | 10 | 2 | 95% | 0.4 | 47.5 | 1 |
| Tool Schema Validator | 9 | 2 | 90% | 0.5 | 32.4 | 1 |
| CORS Wildcard Detection | 5 | 2 | 95% | 0.3 | 31.7 | 2 |
| Info Leakage Detection | 6 | 2 | 90% | 0.5 | 21.6 | 2 |
| Command Injection Detection | 7 | 3 | 80% | 0.8 | 21.0 | 2 |
| Test Fixture Suite | 10 | 2 | 90% | 0.9 | 20.0 | 2 |
| MCP Protocol Client | 10 | 3 | 85% | 1.5 | 17.0 | 1 |
| Tool Poisoning Detection | 6 | 3 | 75% | 0.8 | 16.875 | 2 |
| Auth Gap Detection | 4 | 3 | 75% | 0.8 | 11.25 | 2 |

Note on RICE ordering: The Security Finding Data Model and Initialization Handshake Verifier score highest because they have very low effort relative to their broad reach. The Protocol Client scores lower despite high intrinsic importance because its effort is the largest of any Sprint 1 item — effort is in the denominator. All Now items are committed regardless of relative RICE score; scoring informs sequencing and parallelism decisions within sprints.

---

## Next — Sprint 3: CI Integration

These items are planned and prioritized but not yet started. Scope is committed for Sprint 3 planning; detailed story breakdown occurs at Sprint 2 retrospective.

---

### 1. GitHub Action (action.yml)

| Field | Value |
|-------|-------|
| Sprint | Sprint 3 |
| Status | Not Started |
| Requirements | FR-056, FR-057, FR-059, FR-061 |
| Dependencies | CLI Scaffold (exit code semantics); JSON Report Format (output consumption) |

**Success Criteria:**
- `action.yml` defines inputs: `target`, `fail-on-severity`, `conformance-threshold`, `format`, `config`
- PR status check reflects CLI exit code (0 = pass, 1 = fail)
- Supports matrix builds (concurrent-safe execution across multiple targets)
- Auto-discovers `.mcp-verify.json` in the GitHub workspace root

---

### 2. PR Annotation Reporter

| Field | Value |
|-------|-------|
| Sprint | Sprint 3 |
| Status | Not Started |
| Requirements | FR-058 |
| Dependencies | GitHub Action; Markdown Report Format |

**Success Criteria:**
- Posts a Markdown summary report as a PR comment on first run
- Updates existing comment on subsequent runs (no duplicate comment accumulation)
- Comment includes conformance score, security findings table, and pass/fail verdict

---

### 3. JSON Report Format

| Field | Value |
|-------|-------|
| Sprint | Sprint 3 |
| Status | Not Started |
| Requirements | FR-049, FR-050 |
| Dependencies | Conformance Scoring Engine; Security Finding Data Model; Terminal Reporter |

**Success Criteria:**
- `--format json` produces valid JSON to stdout with no decorative text
- Schema includes: `meta` (tool version, timestamp, target, transport, specVersion), `conformance` (score, breakdown, per-check results), `security` (findings array), `summary` (pass/fail, blocker count by severity)
- Schema is versioned and published in documentation
- Output passes schema validation in CI integration test

---

### 4. Markdown Report Format

| Field | Value |
|-------|-------|
| Sprint | Sprint 3 |
| Status | Not Started |
| Requirements | FR-051 |
| Dependencies | Conformance Scoring Engine; Security Finding Data Model |

**Success Criteria:**
- `--format markdown` produces GitHub Flavored Markdown to stdout
- Includes: summary table, conformance score with category breakdown, security findings with remediation steps, tool metadata (version, timestamp, target, duration)
- Suitable for storage in Confluence, audit trail systems, and PR comment injection
- No decorative text or ANSI escape codes present in output

---

### 5. Configuration File Support (.mcp-verify.json)

| Field | Value |
|-------|-------|
| Sprint | Sprint 3 |
| Status | Not Started |
| Requirements | FR-003 |
| Dependencies | CLI Scaffold |

**Success Criteria:**
- `--config <path>` loads the specified JSON configuration file
- Auto-discovers `mcp-verify.json` then `.mcp-verify.json` in the current working directory
- CLI flags override config file values when both are present
- Invalid JSON in config prints a descriptive error and exits with code 2
- Missing `--config` file path exits with code 2

---

### 6. Configurable Thresholds (Severity + Conformance)

| Field | Value |
|-------|-------|
| Sprint | Sprint 3 |
| Status | Not Started |
| Requirements | FR-043, FR-053 |
| Dependencies | Configuration File Support; Conformance Scoring Engine; Security Finding Data Model |

**Success Criteria:**
- `failOnSeverity` config field accepts: `critical`, `high`, `medium`, `low`, `none`
- `conformanceThreshold` config field accepts integers 0–100
- Exit code 1 is produced when a finding meets or exceeds the configured severity
- Exit code 1 is produced when the conformance score falls below `conformanceThreshold`
- Default behavior (no config): fail on `critical` findings only; no conformance threshold

---

### 7. Per-Check Suppression with Justification

| Field | Value |
|-------|-------|
| Sprint | Sprint 3 |
| Status | Not Started |
| Requirements | FR-042 |
| Dependencies | Configuration File Support; Security Finding Data Model |

**Success Criteria:**
- `skip` array in config file accepts check IDs (e.g., `"cors-wildcard"`, `"command-injection"`)
- Each skip entry supports an optional `justification` string field
- Suppressed checks are listed in output as "skipped" with justification shown
- Suppressed checks do not count toward exit code 1 determination
- Suppression is auditable in JSON and Markdown report output

---

### 8. npm v1.0.0 Publication

| Field | Value |
|-------|-------|
| Sprint | Sprint 3 |
| Status | Not Started |
| Requirements | FR-063 |
| Dependencies | All P0 features complete; JSON/Markdown reporters; Configuration File Support; GitHub Action |

**Success Criteria:**
- `mcp-verify@1.0.0` published to npm with the `latest` tag
- Package size < 5MB unpacked (enforced by `size-limit` gate in CI)
- Supports Node.js 18.x, 20.x, and 22.x LTS (tested in CI matrix)
- `npx mcp-verify` works without prior installation across macOS, Linux, and Windows
- Semantic versioning committed for future releases

---

### 9. GitHub Marketplace Publication

| Field | Value |
|-------|-------|
| Sprint | Sprint 3 |
| Status | Not Started |
| Requirements | FR-056 |
| Dependencies | GitHub Action (action.yml); npm v1.0.0 Publication |

**Success Criteria:**
- GitHub Action published to GitHub Marketplace with complete metadata
- Action listing includes usage example, input/output documentation, and version tag
- `uses: mcp-verify/action@v1` resolves and executes correctly in a real GitHub Actions workflow
- Integration test against a live reference MCP server passes in the published action

---

## Later — Sprint 4: Advanced + Future

These items are on the roadmap and will be built in Sprint 4 subject to Sprint 3 completion and sprint review outcomes. Scope may shift based on user feedback gathered after the v1.0.0 launch.

---

### 1. Local Web Dashboard

| Field | Value |
|-------|-------|
| Sprint | Sprint 4 |
| Status | Not Started |
| Requirements | FR-066, FR-068, FR-069, FR-070, FR-071, FR-075 |
| Dependencies | Run History Storage |

**Value Hypothesis:** Platform teams managing multiple MCP servers need a visual portfolio view. Terminal output does not scale to 10+ servers reviewed in a single session. A local-first dashboard extends value without introducing cloud dependencies.

**Success Criteria:**
- `npx mcp-verify serve` starts a local HTTP server
- Dashboard displays historical conformance score charts (time-series per server target)
- Security findings trend view shows stacked bars by severity over time
- Multi-server portfolio overview table available
- No external telemetry; all assets fully bundled; no outbound network requests from dashboard

---

### 2. Run History Storage

| Field | Value |
|-------|-------|
| Sprint | Sprint 4 |
| Status | Not Started |
| Requirements | FR-067, FR-074 |
| Dependencies | JSON Report Format |

**Success Criteria:**
- Timestamped results stored per target URL as JSONL in `~/.mcp-verify/history/`
- `history export` subcommand produces SIEM-ready JSON output
- History persists across CLI versions; schema is versioned for forward compatibility

---

### 3. Regression Detection (--compare-last)

| Field | Value |
|-------|-------|
| Sprint | Sprint 4 |
| Status | Not Started |
| Requirements | FR-072 |
| Dependencies | Run History Storage |

**Success Criteria:**
- `--compare-last` flag surfaces conformance score delta and new/resolved findings since the previous run against the same target
- Regression (score decrease or new finding) highlighted in terminal output and JSON report
- No prior run for target produces an informational message, not an error

---

### 4. Baseline Command (--baseline)

| Field | Value |
|-------|-------|
| Sprint | Sprint 4 |
| Status | Not Started |
| Requirements | FR-073 |
| Dependencies | Run History Storage |

**Success Criteria:**
- `mcp-verify baseline <target>` pins current run as the known-good state for future comparisons
- `--compare-last` uses the pinned baseline when one exists
- Baseline can be reset with `mcp-verify baseline --reset <target>`

---

### 5. Custom Rule Plugin API

| Field | Value |
|-------|-------|
| Sprint | Sprint 4 |
| Status | Not Started |
| Requirements | FR-076, FR-077, FR-078, FR-080 |
| Dependencies | Security Finding Data Model; Conformance Scoring Engine |

**Value Hypothesis:** Enterprise teams with internal security policies cannot encode them in generic checks. A plugin API enables policy-as-code within the mcp-verify pipeline without requiring upstream contributions or forking.

**Success Criteria:**
- `mcp-verify.config.js` accepts a `plugins` array of file paths or npm package names
- Plugin API contract provides a `VerificationContext` object and expects a `Finding[]` return type
- Plugin findings are merged into the main report pipeline and affect exit code determination
- Plugin errors are contained (plugin failure does not crash the main verification run)
- Plugin execution is bounded by a 30-second timeout per plugin

---

### 6. Example Community Plugins

| Field | Value |
|-------|-------|
| Sprint | Sprint 4 |
| Status | Not Started |
| Requirements | FR-079 |
| Dependencies | Custom Rule Plugin API |

**Success Criteria:**
- Two reference plugins published as separate npm packages: `mcp-verify-plugin-custom-auth` and `mcp-verify-plugin-rate-limit`
- Each plugin includes a README with usage instructions and configuration example
- Plugins serve as documentation artifacts demonstrating plugin API contract in practice

---

### 7. Full Documentation Site

| Field | Value |
|-------|-------|
| Sprint | Sprint 4 |
| Status | Not Started |
| Requirements | NFR-024 |
| Dependencies | All P0 and P1 features complete; Plugin API |

**Success Criteria:**
- README covers: quick start, all CLI flags, exit code semantics, Node.js version requirements
- CLI reference documents every flag with type, default, and example
- GitHub Action reference documents all inputs, outputs, and usage patterns
- Plugin authoring guide covers the plugin API contract, VerificationContext object, and publishing to npm
- All P0, P1, and P2 features covered
- End-to-end integration test suite passes against 5 real public MCP servers

---

## Future — Post-Sprint 4

These items are aspirational. They are on the radar but are not committed. They will be evaluated after the v1.1.0 release based on user feedback, adoption data, and competitive landscape.

| Item | Rationale | Trigger for Prioritization |
|------|-----------|---------------------------|
| VS Code Extension | IDE-native feedback loop reduces context switching for developers during active development | > 500 GitHub Action integrations; user research confirms IDE workflow demand |
| MCP Spec Version Auto-Detection | Eliminates manual spec version pinning as MCP evolves; reduces maintenance burden | MCP spec releases a new major version; community reports version mismatch issues |
| GitLab CI Template | Extends CI-native reach to GitLab-based teams; secondary market after GitHub | > 20% of inbound issue reports reference GitLab workflows |
| CircleCI Orb | Same rationale as GitLab CI; extends to CircleCI users | Demand signal from community issues or partnership |
| Community Rule Marketplace | Network effect amplifier; turns the plugin API into a growth mechanism | 5+ community-published plugins demonstrate demand for a discovery layer |
| Enterprise Reporting Integrations | SIEM ingestion, Jira ticket creation, Confluence auto-update | 10+ enterprise teams self-reporting mcp-verify in production CI |

---

## Dependency Map

The following diagram shows which roadmap items depend on which others. Items at the same indentation level can proceed in parallel once their stated upstream dependencies are complete.

```
[S1-01] Repository Scaffold
  |
  +-- [S1-02] Build System (tsup)
  |     |
  |     +-- [S1-05] CLI Scaffold + Commander.js
  |           |
  |           +-- [S1-06] --version / --help flags
  |           +-- [S1-07] Exit Code Implementation
  |           |     |
  |           |     +-- [S1-08] --timeout flag
  |           |     +-- [S1-26] Terminal Reporter (color output)
  |           |           |
  |           |           +-- [S1-27] Terminal Reporter (category breakdown)
  |           |                 |
  |           |                 +-- [S1-28] npm alpha publish (v0.1.0-alpha)
  |           |
  |           +-- [NEXT] --format flag            --> JSON/Markdown Reporters
  |           +-- [NEXT] --config flag            --> Configuration File Support
  |
  +-- [S1-03] Vitest + Coverage Setup
  +-- [S1-04] GitHub Actions CI Matrix
  |
  +-- [S1-09] Transport Auto-Detection
        |
        +-- [S1-10] stdio Transport
        |     |
        |     +-- [S1-12] MCP Initialization Handshake
        |           |
        |           +-- [S1-13] Protocol Message Exchange (tools/list, resources/list, prompts/list)
        |           |     |
        |           |     +-- [S1-15] Conformance Data Model
        |           |           |
        |           |           +-- [S1-16] JSON-RPC 2.0 Validator
        |           |           +-- [S1-17] Error Code Range Validator
        |           |           +-- [S1-18] Initialization Conformance
        |           |           +-- [S1-19] Capability Negotiation Validator
        |           |           +-- [S1-20] Tool Schema Validator (structure + content)
        |           |           +-- [S1-21] Resource + Prompt Protocol Validators
        |           |           +-- [S1-23] Error Handling Conformance
        |           |           |
        |           |           +-- [S1-24] Conformance Scoring Engine (0-100)
        |           |                 |
        |           |                 +-- [S1-25] Spec Version Declaration
        |           |
        |           +-- [S1-14] Error Probe (unknown method + malformed JSON)
        |                 |
        |                 +-- [S1-23] Error Handling Conformance (see above)
        |                 +-- [S2-08] Info Leakage Detector
        |
        +-- [S1-11] HTTP+SSE Transport
              |
              +-- [S1-12] MCP Initialization Handshake (see above)
              +-- [S1-22] Transport Protocol Validators (stdio + HTTP+SSE)
              +-- [S2-05] CORS Wildcard Detector
              +-- [S2-06] Auth Gap Detector

[S2-01] Security Finding Data Model
  |
  +-- [S2-02] CVSS Scoring Rubric
  +-- [S2-03] Security Engine Orchestrator
  |
  +-- [S2-04] Command Injection Detector
  +-- [S2-05] CORS Wildcard Detector        (also depends on HTTP+SSE Transport)
  +-- [S2-06] Auth Gap Detector             (also depends on HTTP+SSE Transport)
  +-- [S2-07] Tool Poisoning Detector       (also depends on tools/list response)
  +-- [S2-08] Info Leakage Detector         (also depends on Error Probe)
  |
  +-- [S2-09 to S2-13] Vulnerable Fixtures
  +-- [S2-14] Clean Fixtures
        |
        +-- [S2-15] Integration Tests (detectors x vulnerable fixtures)
        +-- [S2-16] False Positive Tests (detectors x clean fixtures)
              |
              +-- [S1-28 update] npm publish v0.2.0-alpha

[NEXT] Configuration File Support (.mcp-verify.json)
  |
  +-- [NEXT] Configurable Thresholds (failOnSeverity, conformanceThreshold)
  +-- [NEXT] Per-Check Suppression with Justification

[NEXT] JSON Report Format
  |
  +-- [NEXT] Markdown Report Format
  +-- [NEXT] GitHub Action (action.yml)
        |
        +-- [NEXT] PR Annotation Reporter
        +-- [NEXT] GitHub Marketplace Publication
              |
              +-- [NEXT] npm v1.0.0 Publication

[LATER] Run History Storage
  |
  +-- [LATER] Regression Detection (--compare-last)
  +-- [LATER] Baseline Command (--baseline)
  +-- [LATER] Local Web Dashboard

[LATER] Custom Rule Plugin API
  |
  +-- [LATER] Example Community Plugins

[LATER] Full Documentation Site   (depends on all P0 + P1 features complete)
```

---

## Risk Register (Roadmap-Level)

| ID | Risk | Likelihood | Impact | Trigger | Mitigation | Owner |
|----|------|------------|--------|---------|------------|-------|
| RR-01 | MCP specification releases a new version during Sprint 1-2, invalidating checks already built | High | Medium | New release tag on modelcontextprotocol/specification GitHub repo | Pin all checks to declared spec version (`2024-11-05`); design rule engine with per-rule spec version annotations; treat spec updates as P0 issues with 1-sprint response window | Engineering Lead |
| RR-02 | Anthropic or MCP SDK team ships an official `mcp-validate` or `mcp-inspect` CLI with conformance scoring before our v1.0.0 release | Medium | High | GitHub announcement or npm release from `@modelcontextprotocol` org | Accelerate Sprint 1-2 execution; prioritize community signals (GitHub stars, blog posts, CI template sharing) that create switching costs; differentiate through security research depth that official tooling is unlikely to replicate quickly | Product Manager |
| RR-03 | False positive rate on heuristic security checks (command injection, tool poisoning, auth gap) exceeds 5% target, triggering credibility damage before v1.0.0 | Medium | High | > 3 false positive reports in GitHub issues before launch; negative social media post from a known developer | Pre-launch review: invite 3-5 MCP ecosystem developers to validate checks against their servers; maintain `false-positive` issue label with monthly tracking; expose `--lenient` mode to reduce heuristic sensitivity; publish detection methodology publicly | Security Engineer |
| RR-04 | HTTP+SSE transport implementation complexity causes Sprint 1 schedule slip, blocking the entire conformance engine | Medium | High | SSE stream framing edge cases or MCP HTTP transport spec ambiguity discovered during implementation | Assign the most experienced backend engineer to S-1-11 (HTTP+SSE) in parallel with S-1-10 (stdio); if slip detected by Day 6 of Sprint 1, scope the conformance engine to stdio-only for the alpha and ship HTTP+SSE in Sprint 1 patch | Engineering Lead |
| RR-05 | Package size exceeds 5MB constraint due to dependency sprawl during Sprint 3 (reporters, GitHub Action runtime dependencies) | Medium | Medium | `size-limit` CI gate fails on a Sprint 3 branch | Enforce `size-limit` gate from Sprint 1 build setup; audit all new dependencies before merge; prefer native Node.js APIs over npm dependencies for string/file operations; bundle analysis on each PR | typescript-pro |
| RR-06 | Scope creep in Sprint 3 (stakeholders request additional output formats, custom CI templates, or SARIF output) delays v1.0.0 | Medium | Medium | Engineering time consumed by unplanned requests; sprint velocity drops below 70% of planned | Freeze Sprint 3 scope at Sprint 2 retrospective; defer SARIF output and additional CI templates to Sprint 4; document all deferred items in Prioritization Changelog | Product Manager |
| RR-07 | MCP ecosystem server diversity produces edge-case failures against real servers not covered by test fixtures | High | Medium | User-reported issues post-v1.0.0 with "incorrect FAIL verdict" against a correct server | Test against 20+ real public MCP servers before v1.0.0 publish; implement per-check confidence labeling (deterministic vs. heuristic); provide `--skip` flag for organizational suppression | backend-developer |
| RR-08 | EU AI Act enforcement timeline shift (delay or scope narrowing) reduces urgency for compliance persona, weakening one of three primary market drivers | Low | Low | Official EU announcement of enforcement timeline change | Compliance use case is additive, not load-bearing for initial adoption; primary adoption driver is developer workflow integration; monitor EU enforcement news quarterly | Product Manager |

---

## Prioritization Changelog

This section records every roadmap-level prioritization decision made after a sprint review. It is empty at initial roadmap creation and will be updated after each sprint retrospective.

| Date | Sprint | Decision | Rationale | Items Affected |
|------|--------|----------|-----------|---------------|
| — | — | Initial roadmap published | — | All items |

---

*Document produced by Product Manager (Tier 2 PM) for MCP Verify PDLC Project.*
*Next phase: Engineering sprint execution. Reference this document for scope and sequencing decisions.*
*Review cadence: Updated after each sprint retrospective. Major revisions require PM sign-off.*
