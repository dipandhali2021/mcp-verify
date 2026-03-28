# MCP Verify — Sprint Structure

**Document Version:** 1.0
**Author:** Scrum Master (Tier 3 Engineer)
**Date:** 2026-03-28
**Status:** Approved — Active
**References:**
- `.pdlc/architecture/product-vision.md` — Product vision, sprint roadmap, feature priorities
- `.pdlc/architecture/requirements.md` — Functional requirements, user stories, sprint-story mapping

---

## Table of Contents

1. [Sprint Cadence](#1-sprint-cadence)
2. [Definition of Done](#2-definition-of-done)
3. [Velocity Planning](#3-velocity-planning)
4. [Ceremony Templates](#4-ceremony-templates)
5. [Agent Team Structure](#5-agent-team-structure)
6. [Blockers Escalation Path](#6-blockers-escalation-path)
7. [Quality Gates](#7-quality-gates)

---

## 1. Sprint Cadence

### Overview

MCP Verify is delivered across 4 sprints. Each sprint is a single focused PDLC session that simulates a two-week sprint. Sprints run sequentially with no overlap. Each sprint has a defined objective, a committed set of stories, and an exit criterion that must be satisfied before the next sprint begins.

| Sprint | Objective | Simulated Duration | npm Target |
|--------|-----------|-------------------|------------|
| Sprint 1 | Foundation: CLI scaffold, protocol client, conformance engine | 2-week equivalent | `mcp-verify@0.1.0-alpha` |
| Sprint 2 | Security: Five-category vulnerability detection engine | 2-week equivalent | `mcp-verify@0.2.0-alpha` |
| Sprint 3 | CI Integration: GitHub Action, structured reporting, thresholds | 2-week equivalent | `mcp-verify@1.0.0` |
| Sprint 4 | Advanced Features: Dashboard, history, plugin API, polish | 2-week equivalent | `mcp-verify@1.1.0` |

### Ceremony Schedule Per Sprint

Each sprint follows this ceremony sequence within the session:

```
[Sprint Start]
    |
    v
Sprint Planning  -->  Development Work Waves  -->  Sprint Review  -->  Sprint Retrospective
                             |
                        Daily Standup
                    (between work waves)
```

| Ceremony | When | Time-box | Mandatory |
|----------|------|----------|-----------|
| Sprint Planning | Sprint session start | Focused opening session | Yes |
| Daily Standup | Between work waves during the sprint | Brief check-in (5-10 min equivalent) | Yes |
| Sprint Review | Sprint session end, before retro | Focused demo session | Yes |
| Sprint Retrospective | After sprint review, closes the session | Focused retro session | Yes |

All four ceremonies occur within the same PDLC session that constitutes a sprint. No ceremony is skipped. The retrospective action items from sprint N are the first input reviewed during sprint N+1 planning.

---

## 2. Definition of Done

The Definition of Done is a shared team contract. Work that does not satisfy the applicable DoD level is not considered complete. Stories that are "in progress" at sprint end are not counted toward velocity and are carried over as the highest-priority items in the next sprint plan.

### Story-Level DoD

Every user story must satisfy all of the following before it is accepted:

- **Compiles and runs:** Code compiles without errors under `tsc --noEmit --strict`. The CLI executes without runtime errors on the story's target functionality.
- **Unit tests written and passing:** New code has accompanying Vitest unit tests. Coverage for newly written code is greater than 80% line coverage. All existing tests continue to pass.
- **Code reviewed:** The code-reviewer agent has reviewed the implementation. Review comments are resolved or explicitly deferred with documented rationale.
- **No critical security issues:** `npm audit --audit-level=high` passes. No Critical or High CVEs are introduced by the story's dependencies.
- **Documentation updated:** Inline JSDoc comments are present on exported functions, types, and classes. README or CLI help text is updated if the story changes user-facing behavior. Acceptance criteria from the requirements document are traceable to the implementation.
- **Integrated with existing codebase:** The implementation merges cleanly. No module boundary violations as defined by `dependency-cruiser` configuration. TypeScript strict mode with zero `any` types without explicit justification comment.

### Sprint-Level DoD

A sprint is complete only when all of the following are satisfied:

- **All P0 stories completed:** Every story marked P0 in the sprint's story set satisfies the Story-Level DoD. P1 and P2 stories may be carried over with documented rationale, but P0 carries over carry a sprint-level risk flag.
- **All tests passing:** The full Vitest suite passes with zero failures. This includes unit tests, integration tests, and fixture-based tests added during the sprint.
- **Security audit passed:** `npm audit --audit-level=high` returns zero findings. No critical or high CVEs in the runtime dependency tree.
- **Agent log written:** The scrum master records a sprint agent log documenting: stories completed, stories carried over (with rationale), blockers encountered and resolutions, velocity actuals versus plan, and observations for the retrospective.
- **Sprint results compiled:** A sprint results summary is produced capturing: delivered stories, final velocity, test coverage delta, npm publish status, and exit criteria verification evidence.

### Project-Level DoD

The project is complete when all of the following are satisfied across all four sprints:

- **All 4 sprints completed:** Every sprint has a completed agent log and sprint results summary. No P0 stories are open or carried over unresolved.
- **v1.0.0 published to npm:** `mcp-verify@1.0.0` is published to the npm registry. The package satisfies the < 5MB size constraint. The package installs and runs on Node.js 18, 20, and 22 on Linux, macOS, and Windows.
- **GitHub Action published:** The `mcp-verify/action@v1` action is published to GitHub Marketplace with a complete `action.yml`, documented inputs and outputs, and a tested example workflow.
- **Documentation complete:** The README covers all P0, P1, and P2 features. CLI reference documents all flags, subcommands, exit codes, and configuration options. The plugin authoring guide, GitHub Action reference, and CI integration examples are published. The report schema is documented at `docs/report-schema.json`.
- **Test coverage greater than 85%:** Overall Vitest line coverage across the full codebase meets or exceeds 85%. Coverage report is produced as a CI artifact.

---

## 3. Velocity Planning

### Baseline and Rationale

Velocity is measured in story points using relative sizing. The team uses Fibonacci-scale estimation (1, 2, 3, 5, 8, 13) during sprint planning. Points reflect complexity and uncertainty, not elapsed time.

The Sprint 1 baseline is set conservatively at 30 points because:
- The team is newly assembled; cross-agent collaboration patterns are not yet established.
- Infrastructure setup (repo scaffolding, CI skeleton, build pipeline) consumes capacity without directly contributing story points.
- The MCP protocol client involves protocol-level uncertainty until the first handshake is verified end-to-end.

| Sprint | Planned Points | Rationale | Utilization Target |
|--------|---------------|-----------|-------------------|
| Sprint 1 | 30 | New team, infra setup overhead, protocol uncertainty | 70-75% |
| Sprint 2 | 35 | Team calibrated from Sprint 1, no infra overhead, security check patterns are well-defined | 75-80% |
| Sprint 3 | 35 | Stable velocity, GitHub Action and reporting work is structurally similar to prior sprint patterns | 75-80% |
| Sprint 4 | 30 | New feature types (web UI, plugin API) introduce fresh uncertainty; polish work is hard to estimate | 70-75% |

### Capacity Buffer Policy

70-80% utilization is the target. The remaining 20-30% of capacity is reserved for:

- Bug discovery and remediation (especially likely in Sprint 1 when the full stack first runs end-to-end)
- Refinement of stories that turn out to be larger than estimated
- Test fixture creation and infrastructure work that surfaces during development
- Cross-agent coordination overhead (pairing, review cycles)

Stories are not added to a sprint mid-session to fill buffer. Buffer is a deliberate shock absorber, not unused capacity.

### Velocity Tracking

Velocity is recorded in the sprint agent log as:

```
Planned: N points
Delivered: N points
Carried over: N points (story IDs and rationale)
Velocity trend: [sprint 1 actuals] -> [sprint 2 actuals] -> ...
```

If delivered velocity falls below 85% of planned in any sprint, the retrospective must include a root cause analysis and a corrective action item for the following sprint's planning session.

---

## 4. Ceremony Templates

### Sprint Planning

**Purpose:** Align the team on the sprint objective, confirm capacity, estimate stories, sequence work, and produce a committed sprint plan.

**Inputs:**
- Product backlog (ordered by priority, pre-refined stories marked Ready)
- Previous sprint retrospective action items
- Velocity data from prior sprints (Sprint 1 uses the 30-point baseline)
- Any open carry-over stories from the prior sprint

**Process:**
1. Product manager presents the sprint goal and the proposed story set.
2. Agents review each story for clarity. Acceptance criteria are read aloud and questions are resolved before estimation begins. Stories with unresolved questions are not estimated; they are deferred to backlog with a clarification task assigned.
3. Agents estimate using relative sizing. Disagreements trigger a brief discussion (two exchanges maximum) followed by a team consensus. Stories estimated at 13 or above are flagged for breakdown before commitment.
4. Team negotiates the committed set against available capacity at the target utilization rate.
5. Execution order is established based on dependencies (see inter-feature dependency graph in requirements.md Section 6.3). Stories with downstream dependents are sequenced first.
6. Risks are identified and recorded in a sprint risk register (likelihood, impact, mitigation owner).
7. The sprint plan is finalized: committed stories, execution sequence, risk register, and any explicit dependencies on other agents or external systems.

**Outputs:**
- Sprint plan document with committed story list, point totals, execution order, and risk register
- Any stories deferred from the proposed set with documented rationale

**Time-box:** Focused opening session. Planning ends when the team has a committed plan, not when a clock expires.

---

### Daily Standup

**Purpose:** Synchronize agent progress, surface blockers early, and maintain shared awareness of sprint health.

**Format — Done / Doing / Blocked per agent:**

Each participating agent reports:
- **Done:** What was completed since the last standup
- **Doing:** What is in progress right now
- **Blocked:** Any impediment that is preventing progress or creating risk

**Rules:**
- The standup is a status broadcast, not a problem-solving session. If a blocker requires discussion, the scrum master notes it and schedules a targeted follow-up immediately after the standup.
- No technical debate in standup. If two agents disagree on an implementation approach, that is a follow-up item, not a standup discussion.
- If an agent has nothing blocked, they still report Done and Doing. "Nothing blocked" is a valid and expected state.
- The scrum master monitors energy and focus. If the standup drifts, it is redirected.

**Burndown check:** The scrum master reviews the sprint burndown at each standup. If the burndown indicates the team is behind the ideal trend line by more than 15%, the scrum master flags this explicitly and the team discusses whether re-scoping is needed before the next work wave.

**Time-box:** Brief check-in between work waves. Maximum 10-minute equivalent per standup.

---

### Sprint Review

**Purpose:** Demonstrate the sprint increment to the product manager, collect feedback, and make acceptance decisions on delivered stories.

**Format:**

1. Scrum master opens with a brief sprint summary: planned stories, delivered stories, carried-over stories.
2. Each delivering agent demonstrates their stories against the acceptance criteria defined in the requirements document. Demonstrations use real outputs (CLI runs, test results, npm publish confirmations) rather than narrative descriptions.
3. Product manager evaluates each story against acceptance criteria. Stories either pass or are sent back with specific, actionable feedback. There is no partial acceptance — a story is accepted or it is not.
4. User persona feedback is simulated by the product manager speaking from the perspective of Paulo (primary), Dana (secondary), or Chris (tertiary) as appropriate to the stories reviewed.
5. The team reviews the sprint's exit criteria and confirms whether they are met. If exit criteria are not met, the risk to the following sprint is documented.

**Outputs:**
- Sprint review transcript documenting each story's acceptance decision
- User feedback notes per persona
- Exit criteria verification status
- Any follow-up items for the backlog

**Time-box:** Focused demo session. Each story gets enough time to demonstrate all acceptance criteria, no more.

---

### Sprint Retrospective

**Purpose:** Inspect the team's process and collaboration, identify improvement opportunities, and commit to a small number of actionable changes.

**Format by Sprint:**

Sprint 1 and Sprint 2 use Start-Stop-Continue. This format is simple, quick to run, and builds the habit of structured reflection early in the project.

| Column | Prompt |
|--------|--------|
| Start | What should we begin doing that we are not doing? |
| Stop | What should we stop doing because it is not helping? |
| Continue | What is working well that we should keep? |

Sprint 3 and Sprint 4 use the 4Ls (Liked, Learned, Lacked, Longed For). This format surfaces deeper insights once the team has enough shared history to reflect more richly.

| Column | Prompt |
|--------|--------|
| Liked | What went well this sprint? |
| Learned | What did we learn — about the product, the process, or our tools? |
| Lacked | What was missing that would have made the sprint better? |
| Longed For | What do we wish we had — tools, information, support, or clarity? |

**Action item rules:**
- Maximum 2-3 committed action items per retrospective. Fewer focused improvements beat a long list of forgotten ones.
- Each action item has a named owner and a target sprint for resolution.
- Action items from the prior retrospective are reviewed at the start of the next sprint planning as the first agenda item.
- The retrospective environment is blame-free. Observations are about systems and processes, not individuals. The scrum master enforces this.

**Time-box:** Focused retro session. The retro ends when action items are agreed and recorded, not when a clock expires.

---

### Backlog Refinement

Backlog refinement is not a standalone ceremony in this project structure. Instead, refinement happens in two modes:

1. **Pre-sprint refinement:** The product manager and scrum master review the upcoming sprint's stories before planning to ensure they meet the Ready definition: acceptance criteria are written, dependencies are identified, and no blocking questions remain. Stories that are not Ready are not put into the sprint plan.

2. **In-sprint refinement:** If a story is discovered mid-sprint to be significantly larger than estimated, the scrum master calls a focused refinement session with the relevant agents. The story is either broken down into smaller stories (with the sprint plan updated) or descoped with the product manager's approval.

**Ready Definition for a Story:**
- Acceptance criteria are written and unambiguous
- The story has been estimated
- Dependencies on other stories or external systems are documented
- There are no open questions that would block starting the story

---

## 5. Agent Team Structure

The agent team is a cross-functional unit assembled for each sprint based on the work required. The scrum master and product manager are present for all sprints. Development agents rotate based on sprint focus.

### Roles Present in All Sprints

| Role | Agent | Responsibilities Across All Sprints |
|------|-------|-------------------------------------|
| Facilitator | scrum-master | Ceremony facilitation, impediment removal, process health, agent log |
| Product Owner | product-manager | Backlog priority, acceptance decisions, user persona feedback, scope negotiation |

---

### Sprint 1 Team: Foundation

**Sprint 1 Objective:** CLI scaffold, MCP protocol client (stdio and HTTP+SSE), spec conformance engine, terminal reporter, exit codes, npm alpha publish.

**Stories:** US-001, US-002, US-003, US-004, US-015, US-023
**FRs:** FR-001, FR-004 through FR-008, FR-010 through FR-019, FR-021 through FR-033, FR-035, FR-046 through FR-048, FR-052, FR-063 through FR-065

| Agent | Sprint 1 Responsibilities |
|-------|--------------------------|
| cli-developer | Commander.js scaffold, `verify` command and subcommand routing, `--help` output, exit code wiring, zero-config first-run experience |
| typescript-pro | Core TypeScript type system, MCP protocol type definitions, JSON-RPC 2.0 message models, conformance scoring algorithm, spec version declaration |
| backend-developer | MCP protocol client implementation (stdio and HTTP+SSE transports), initialization handshake, protocol probes (tools/list, resources/list, prompts/list, error probes), validation engine for all six conformance categories |
| devops-engineer | Repository setup, package.json configuration, tsup build system, Vitest configuration, CI skeleton (GitHub Actions matrix for Node.js 18/20/22 and Linux/macOS/Windows), size-limit enforcement, npm publish pipeline for alpha |

**Supporting agents (on-call, not full-time):**
- code-reviewer: Reviews all PRs before merge, enforces TypeScript strict mode, module boundary policy
- technical-writer: Reviews CLI help text and initial README structure

---

### Sprint 2 Team: Security

**Sprint 2 Objective:** Five-category security check engine with known-vulnerable and known-clean test fixtures. Terminal reporter updated to display security findings. False positive rate below 5%.

**Stories:** US-005, US-016, US-017, US-018, US-022
**FRs:** FR-036 through FR-041, FR-044, FR-045

| Agent | Sprint 2 Responsibilities |
|-------|--------------------------|
| security-engineer | Security check architecture, threat model per check category, CVSS-adjacent scoring methodology, false positive risk assessment per check, review of all five check implementations against known attack patterns |
| typescript-pro | Implementations of all five security check modules (command injection, CORS wildcard, auth gap, tool poisoning, information leakage), integration with the existing conformance engine pipeline, confidence level labeling (deterministic vs heuristic) |
| backend-developer | Test fixture servers for all five vulnerable categories and corresponding clean counterparts, integration test harness for false positive rate measurement, terminal reporter update to display security findings section |

**Supporting agents (on-call, not full-time):**
- code-reviewer: Security-focused review of all check implementations; verifies no eval() or dynamic code execution
- devops-engineer: CI integration of the security fixture test suite, npm audit enforcement in CI pipeline

---

### Sprint 3 Team: CI Integration

**Sprint 3 Objective:** GitHub Action, JSON and Markdown output formats, configurable thresholds, per-check suppression, v1.0.0 publish to npm and GitHub Marketplace.

**Stories:** US-006, US-007, US-008, US-009, US-010, US-011, US-019, US-020
**FRs:** FR-002, FR-003, FR-009, FR-034, FR-049 through FR-058, FR-060 through FR-062

| Agent | Sprint 3 Responsibilities |
|-------|--------------------------|
| devops-engineer | GitHub Action `action.yml` definition, PR annotation and comment reporter (uses GITHUB_TOKEN), GitHub Actions integration test against live reference MCP server, Marketplace publication, CI examples for GitHub Actions, GitLab CI, and CircleCI, final size-limit enforcement for v1.0.0 |
| typescript-pro | JSON reporter (versioned schema, all fields per FR-049), Markdown reporter (GFM-compliant, audit-trail format per FR-051), JSON schema documentation at `docs/report-schema.json`, schema versioning strategy |
| backend-developer | `mcp-verify.json` / `.mcp-verify.json` config file loading and auto-discovery, `conformanceThreshold` and `failOnSeverity` threshold engine, per-check suppression with justification field, `--strict` / `--lenient` mode implementation, `--verbose` and `--output` flag implementations |

**Supporting agents (on-call, not full-time):**
- code-reviewer: Full review of the configuration system and threshold logic; verifies JSON schema accuracy
- technical-writer: Writes CLI reference documentation, GitHub Action reference, and CI integration examples with inline comments
- security-engineer: Reviews suppression mechanism to ensure suppressed findings remain visible in all output formats

---

### Sprint 4 Team: Advanced Features

**Sprint 4 Objective:** Local web dashboard, run history storage, --compare-last and --baseline commands, plugin API with two reference plugins, complete documentation, v1.1.0 publish.

**Stories:** US-012, US-013, US-014, US-021, US-024
**FRs:** FR-060, FR-066 through FR-080

| Agent | Sprint 4 Responsibilities |
|-------|--------------------------|
| frontend-developer | Local web dashboard (`npx mcp-verify serve`), historical score line charts, security findings trend view, score regression detection UI, multi-server portfolio table, all dashboard assets bundled with no external CDN dependencies |
| typescript-pro | Plugin API definition and loading system (`mcp-verify.config.js`), plugin isolation and error handling (FR-080), two reference plugin examples (`custom-auth-check` and `rate-limit-check`), plugin findings integration into the reporting pipeline |
| cli-developer | `history export` subcommand, `baseline` subcommand with `--existing` flag, `--compare-last` flag with comparison output section, `--no-history` flag, `--compare-previous` flag, `--port` flag for serve command, performance optimization pass (p95 < 10s on remote servers) |

**Supporting agents (on-call, not full-time):**
- backend-developer: Run history storage implementation (`~/.mcp-verify/history/` JSONL files, baseline storage)
- devops-engineer: End-to-end integration test suite against 5 real public MCP servers in CI, final cross-platform validation for dashboard serve command, v1.1.0 npm publish pipeline
- code-reviewer: Full review of plugin API for security isolation and API surface stability
- technical-writer: Complete documentation site — README, CLI reference (all P0/P1/P2 flags), GitHub Action reference, plugin authoring guide, documentation for `--compare-last`, `--baseline`, and `history export`

---

## 6. Blockers Escalation Path

Blockers are classified by type and routed through a defined resolution path. The goal is to resolve blockers within 48 hours of identification. Blockers that persist beyond 48 hours are escalated.

### Escalation Levels

**Level 1 — Self-resolution (0-4 hours)**
The blocked agent identifies a path forward independently or through reviewing available documentation and requirements. The agent unblocks themselves and reports resolution at the next standup. No scrum master action required.

**Level 2 — Scrum master intervention (4-24 hours)**
The agent reports a blocker in standup that they cannot resolve alone. The scrum master evaluates the blocker, assigns resolution ownership, and coordinates the necessary parties. Common resolutions at this level:
- Cross-agent dependency: the scrum master pairs the blocked agent with the agent holding the needed output and sets a resolution time-box.
- Unclear acceptance criteria: the scrum master schedules a focused clarification session with the product manager within the same work session.
- Technical ambiguity: the scrum master assigns a spike investigation to the appropriate agent with a defined time-box (maximum half a sprint session equivalent).

**Level 3 — Orchestrator escalation (24-48 hours)**
Blockers that cannot be resolved within 24 hours despite Level 2 intervention are escalated to the orchestrator. Escalation triggers include:
- A technical unknown that requires capability outside the current agent team's scope
- A dependency on an external system (e.g., npm registry, GitHub Marketplace) that is unavailable
- A scope conflict that requires a product decision beyond what the product manager can resolve within the session
- An agent producing output that does not meet quality standards after one revision cycle

Orchestrator-level escalation options include: agent swap (replace the blocked agent with one better suited to the task), scope adjustment (descope the blocking story to a future sprint with product manager approval), or external consultation (fetch additional context or documentation to resolve the technical unknown).

### Blocker Tracking

All blockers are logged in the sprint agent log with:
- Date and time identified
- Blocking agent
- Blocker description
- Resolution path taken
- Date and time resolved
- Any process improvement identified to prevent recurrence

Blockers that recur across sprints are flagged as systemic impediments and addressed as a retrospective action item.

### Spike Investigation Protocol

When a blocker arises from a technical unknown, a spike investigation is triggered:
- The scrum master creates a spike task with a defined question ("Can the MCP SDK's transport layer be used in strict stdio mode without event loop interference?")
- The spike is time-boxed (maximum 4 hours equivalent)
- The output is a written finding (not production code) that answers the question and recommends an implementation approach
- The finding is reviewed by the relevant agent and the scrum master before the next work wave begins
- The blocked story is re-estimated after the spike finding is reviewed, as the uncertainty that drove the original high estimate may now be resolved

---

## 7. Quality Gates

Quality gates are explicit checkpoints between sprints. A sprint cannot be declared complete — and the following sprint cannot begin — until its gate criteria are fully verified. The scrum master is responsible for verifying gate criteria and documenting the evidence in the sprint results summary.

### Gate 1: Sprint 1 to Sprint 2

**Condition:** The Sprint 2 security check engine depends on a working MCP protocol client and conformance engine. Sprint 2 cannot begin until Sprint 1's gate criteria are met.

**Gate Criteria:**

| Criterion | Verification Method |
|-----------|---------------------|
| `npx mcp-verify http://localhost:3000` produces a numeric conformance score (0-100) against a reference MCP server | End-to-end test run recorded in sprint results |
| Exit code 0 is produced against the known-good reference fixture | CI test output |
| Exit code 1 is produced against a known-bad fixture (missing required fields) | CI test output |
| stdio transport connects, exchanges initialize handshake, and terminates the spawned process cleanly | Integration test output |
| All six conformance categories report individual scores in terminal output | End-to-end test output captured |
| Vitest coverage is greater than 80% on core validation logic | Coverage report artifact from CI |
| `mcp-verify@0.1.0-alpha` is published to npm and installable via `npx` | npm install confirmation |
| `npm audit --audit-level=high` passes with zero findings | CI build log |

**Gate Failure Protocol:** If any criterion is not met, the failing items are treated as P0 carry-overs. The Sprint 2 planning session begins with these carry-overs as the first committed stories, and the Sprint 2 planned velocity is reduced by the estimated points for the carry-over work.

---

### Gate 2: Sprint 2 to Sprint 3

**Condition:** The Sprint 3 CI integration and reporting work depends on a complete, stable verification result model. Sprint 3 cannot begin until Sprint 2's gate criteria are met.

**Gate Criteria:**

| Criterion | Verification Method |
|-----------|---------------------|
| All five security check categories detect their target vulnerability against the corresponding known-vulnerable fixture | Integration test suite output for all five check types |
| False positive rate is less than 5% against the suite of 10 known-clean server fixtures | Integration test suite output with false positive count documented |
| Full CLI run (conformance + security) completes in less than 10 seconds against a local server | CI benchmark test output |
| Command injection check does not fire on string parameters with `pattern` or `enum` constraints | Unit test output |
| Tool poisoning check correctly labels findings as `[heuristic]` in terminal output | End-to-end test output |
| Information leakage check correctly labels findings as `[deterministic]` in terminal output | End-to-end test output |
| Security check test coverage is greater than 85% | Coverage report artifact from CI |
| `mcp-verify@0.2.0-alpha` is published to npm | npm install confirmation |
| `npm audit --audit-level=high` passes with zero findings | CI build log |

**Gate Failure Protocol:** Same as Gate 1. Unmet criteria become P0 carry-overs. Sprint 3 velocity is adjusted accordingly.

---

### Gate 3: Sprint 3 to Sprint 4

**Condition:** Sprint 4's dashboard and plugin work assumes a stable v1.0.0 release with a locked JSON report schema. The GitHub Action and structured output formats must be fully functional before Sprint 4 begins adding the historical tracking layer.

**Gate Criteria:**

| Criterion | Verification Method |
|-----------|---------------------|
| `mcp-verify@1.0.0` is published to npm | npm install confirmation; `npx mcp-verify --version` output |
| Package unpacked size is less than 5MB | CI `size-limit` output artifact |
| GitHub Action `mcp-verify/action@v1` is published to GitHub Marketplace | Marketplace listing confirmation |
| GitHub Action blocks a PR when a security finding exceeds the configured `fail-on-severity` threshold | CI integration test with deliberate failing fixture |
| GitHub Action posts a Markdown summary report as a PR comment | Integration test recording the posted comment |
| `--format json` output passes schema validation against the documented schema in `docs/report-schema.json` | JSON schema validation step in CI |
| `mcp-verify.json` configuration file is loaded and overrides defaults correctly | Integration test with config file fixture |
| Per-check suppression with `justification` field works and suppressed findings appear labeled in all output formats | Integration test with suppression config |
| CI example workflows (GitHub Actions, GitLab CI, CircleCI) are present in `docs/examples/` and tested | File presence check and CI test execution |
| `npm audit --audit-level=high` passes with zero findings | CI build log |

**Gate Failure Protocol:** v1.0.0 is not declared complete until all gate criteria pass. If the Marketplace publication is delayed by external factors (GitHub review queue), the sprint results note this as a known external dependency and Sprint 4 planning may proceed with the explicit assumption that the Marketplace publication will complete before Sprint 4's first standup.

---

### Gate 4: Sprint 4 to Project Complete

**Condition:** The project is complete when all four sprints are done and the Project-Level DoD is satisfied. This gate validates the full product against every committed quality standard.

**Gate Criteria:**

| Criterion | Verification Method |
|-----------|---------------------|
| `npx mcp-verify serve` starts a local dashboard and displays historical score charts for a server with at least 10 runs | Manual test with seeded history data |
| `--compare-last` prints a regression summary showing score delta and new/resolved findings | End-to-end test with two sequential runs against a server with a known change |
| `npx mcp-verify baseline` stores the current run and subsequent `--compare-last` compares against it | End-to-end test with baseline workflow |
| A custom plugin loaded via `mcp-verify.config.js` produces findings that appear in all output formats and contribute to exit code | Integration test with reference plugin |
| An exception in a plugin's `check` function does not crash the tool; a warning is printed and verification continues | Unit test for plugin isolation |
| End-to-end integration test suite passes against 5 real public MCP servers | CI integration test output |
| Overall Vitest line coverage is greater than 85% | Coverage report artifact from CI |
| `mcp-verify@1.1.0` is published to npm | npm install confirmation |
| README, CLI reference, GitHub Action reference, and plugin authoring guide are complete and accurate | Documentation review checklist |
| `npm audit --audit-level=high` passes with zero findings | CI build log |
| No open P0 stories or unresolved carry-overs exist across any sprint | Sprint agent logs reviewed |

**Project Completion Declaration:** When all Gate 4 criteria are met, the scrum master produces a final project summary documenting: total sprints completed, total stories delivered, final velocity per sprint, test coverage achieved, npm download baseline (first week), GitHub stars at release, and any open items deferred to a future v2.x roadmap.

---

## Appendix A: Sprint Summary Cards

Quick-reference cards for each sprint.

### Sprint 1 Summary Card

```
Sprint 1: Foundation
Goal:     CLI scaffold, protocol client, conformance engine, npm alpha publish
Points:   30 planned (70-75% utilization)
Team:     cli-developer, typescript-pro, backend-developer, devops-engineer
P0 FRs:   FR-001, FR-004-FR-008, FR-010-FR-019, FR-021-FR-033, FR-035,
           FR-046-FR-048, FR-052, FR-063-FR-065
Stories:  US-001, US-002, US-003, US-004, US-015, US-023
Publish:  mcp-verify@0.1.0-alpha
Gate:     CLI produces conformance score end-to-end; 0/1/2 exit codes verified
Retro:    Start-Stop-Continue
```

### Sprint 2 Summary Card

```
Sprint 2: Security
Goal:     Five-category security check engine, test fixtures, false positive < 5%
Points:   35 planned (75-80% utilization)
Team:     security-engineer, typescript-pro, backend-developer
P0 FRs:   FR-036-FR-041, FR-044, FR-045
Stories:  US-005, US-016, US-017, US-018, US-022
Publish:  mcp-verify@0.2.0-alpha
Gate:     All five checks detect vulnerabilities; false positive rate validated
Retro:    Start-Stop-Continue
```

### Sprint 3 Summary Card

```
Sprint 3: CI Integration
Goal:     GitHub Action, JSON/Markdown formats, thresholds, v1.0.0 launch
Points:   35 planned (75-80% utilization)
Team:     devops-engineer, typescript-pro, backend-developer
P1 FRs:   FR-002, FR-003, FR-009, FR-034, FR-049-FR-058, FR-060-FR-062
Stories:  US-006, US-007, US-008, US-009, US-010, US-011, US-019, US-020
Publish:  mcp-verify@1.0.0 + GitHub Action v1
Gate:     Action blocks PRs; JSON schema validated; < 5MB package size
Retro:    4Ls (Liked-Learned-Lacked-Longed For)
```

### Sprint 4 Summary Card

```
Sprint 4: Advanced Features
Goal:     Dashboard, history, plugin API, documentation, v1.1.0 launch
Points:   30 planned (70-75% utilization)
Team:     frontend-developer, typescript-pro, cli-developer
P2 FRs:   FR-060, FR-066-FR-080
Stories:  US-012, US-013, US-014, US-021, US-024
Publish:  mcp-verify@1.1.0
Gate:     All Project-Level DoD criteria met; > 85% coverage; docs complete
Retro:    4Ls (Liked-Learned-Lacked-Longed For)
```

---

## Appendix B: Metrics Reference

The following metrics are tracked across sprints and reviewed at each retrospective.

| Metric | Target | Source |
|--------|--------|--------|
| Sprint velocity (delivered points) | Within 10% of planned | Sprint agent log |
| Story carry-over rate | 0 P0 stories carried over | Sprint results summary |
| Impediment resolution time | Less than 48 hours | Blocker log in agent log |
| Test coverage (new code) | Greater than 80% per sprint | Vitest coverage report |
| Test coverage (project-level) | Greater than 85% at project complete | Vitest coverage report |
| npm audit findings | Zero High/Critical at all times | CI build artifact |
| Package size | Less than 5MB unpacked | size-limit CI artifact |
| False positive rate (security checks) | Less than 5% | Fixture test suite output |
| CLI execution time (p95) | Less than 10 seconds | CI benchmark artifact |

---

*Document produced by Scrum Master (Tier 3 Engineer) for MCP Verify PDLC Project.*
*Governs all sprint ceremonies, team structure, Definition of Done, velocity planning, and quality gates.*
*Reference this document throughout the development lifecycle for process decisions and ceremony facilitation.*
