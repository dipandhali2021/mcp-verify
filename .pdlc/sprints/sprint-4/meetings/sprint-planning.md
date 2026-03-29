# Sprint 4 Planning — MCP Verify

**Date:** 2026-03-29
**Facilitator:** Scrum Master
**Attendees:** Product Manager, frontend-developer, typescript-pro, cli-developer, backend-developer

---

## Sprint Goal

> Ship v1.1.0 with local web dashboard, historical tracking, CLI comparison features, and plugin API — completing the MCP Verify product vision.

## Capacity

- **Available capacity:** 30 points (70-75% utilization)
- **Carry-over from Sprint 3:** 0 stories
- **Team:** 4 development agents

## Retrospective Action Items from Sprint 3

1. **Continue parallel agent execution** — Sprint 3's parallel story assignment worked well. Apply same pattern.
2. **Schema-first approach validated** — JSON schema before reporter code proved correct. Apply to plugin API types.
3. **Three-way config merge pattern reusable** — Apply to plugin configuration loading.

## Story Review & Estimation

### S-4-01: Run History Storage (5 pts)
- **Proposer:** Product Manager
- **Estimate:** 5 points (consensus)
- **Discussion:** Foundation story — blocks dashboard and comparison. JSONL format chosen for append-only simplicity. URL-encoded hostname as filename key.
- **Risk:** File system permissions on Windows/Linux vary. Mitigation: graceful fallback with debug log.

### S-4-02: CLI Comparison & Baseline (5 pts)
- **Proposer:** Product Manager
- **Estimate:** 5 points (consensus)
- **Discussion:** Two new subcommands (baseline, history export) plus --compare-last flag. Comparison logic is straightforward once history is available.
- **Dependency:** S-4-01 must complete first.

### S-4-03: Plugin System (8 pts)
- **Proposer:** Product Manager
- **Estimate:** 8 points (consensus)
- **Discussion:** Most complex story — dynamic import, type contract, isolation boundary, timeout. Schema-first: define PluginContext and Finding types before implementation. Reference plugins serve as integration tests.
- **Risk:** Dynamic import of user code. Mitigation: try/catch + 30s timeout + no process-level side effects.

### S-4-04: Web Dashboard (8 pts)
- **Proposer:** Product Manager
- **Estimate:** 8 points (consensus)
- **Discussion:** Vanilla HTML/CSS/JS — no React/Vue to keep bundle small. Charts via inline SVG generation. CSP header enforced. All assets embedded as string templates.
- **Risk:** Bundle size increase. Mitigation: minified inline, target < 50KB for dashboard assets.
- **Dependency:** S-4-01 must complete first.

### S-4-05: History Export & Documentation (4 pts)
- **Proposer:** Product Manager
- **Estimate:** 4 points (consensus)
- **Discussion:** Straightforward JSONL→JSON export. Documentation is the main effort.
- **Dependency:** S-4-01 must complete first.

## Committed Sprint Backlog

| Story | Points | Agent | Wave |
|-------|--------|-------|------|
| S-4-01 | 5 | backend-developer | 1 |
| S-4-02 | 5 | cli-developer | 2 |
| S-4-03 | 8 | typescript-pro | 2 |
| S-4-04 | 8 | frontend-developer | 3 |
| S-4-05 | 4 | cli-developer | 3 |
| **Total** | **30** | | |

## Sprint Plan Accepted

Product Manager confirms the sprint backlog. All stories have clear acceptance criteria from the requirements document. No open questions.
