# Sprint 4 Plan — MCP Verify

**Sprint Number:** 4 of 4 (FINAL)
**Sprint Goal:** Dashboard, history, plugin API, documentation, v1.1.0 launch
**Planned Points:** 30
**Utilization Target:** 70-75%

---

## Sprint Objective

> Deliver local web dashboard with historical score tracking, run comparison features (--compare-last, baseline), plugin API with two reference plugins, and complete documentation to ship v1.1.0.

---

## Committed Stories

### S-4-01: Run History Storage (5 pts) — backend-developer
**User Stories:** US-012, US-013
**FRs:** FR-067
**Priority:** P2 (Foundation — blocks all other Sprint 4 stories)

**Subtasks:**
- [ ] Create `src/history/storage.ts` — HistoryStorage class with JSONL read/write
- [ ] Create `src/history/types.ts` — HistoryRecord type definition
- [ ] Create `~/.mcp-verify/history/` directory on first run
- [ ] Append timestamped JSON line per run to `<encoded-hostname>.jsonl`
- [ ] Record: timestamp, target, conformanceScore, securityFindingsCount, breakdown, toolVersion, specVersion
- [ ] Skip storage with debug log when directory is not writable
- [ ] Wire `--no-history` flag into CLI
- [ ] Integration into verify pipeline (save after successful run)
- [ ] 30+ unit tests

**Acceptance Criteria:**
- History directory created on first run
- Each run appends one JSONL line
- --no-history disables storage
- Graceful handling of unwritable directory

---

### S-4-02: CLI Comparison & Baseline (5 pts) — cli-developer
**User Stories:** US-013, US-024
**FRs:** FR-072, FR-073
**Priority:** P2
**Depends on:** S-4-01

**Subtasks:**
- [ ] Create `src/history/comparison.ts` — comparison logic (score delta, new/resolved findings)
- [ ] Create `src/history/baseline.ts` — baseline storage/retrieval
- [ ] Wire `--compare-last` flag into CLI pipeline
- [ ] Comparison section in terminal output (below standard report)
- [ ] Comparison data in JSON output under `comparison` key
- [ ] `baseline` subcommand — run verification and store as baseline
- [ ] `baseline --existing` — promote most recent history entry to baseline
- [ ] `--compare-previous` flag — compare against immediately previous run (when baseline exists)
- [ ] Store baselines in `~/.mcp-verify/baselines/<encoded-hostname>.json`
- [ ] 30+ unit tests

**Acceptance Criteria:**
- --compare-last shows score delta and new/resolved findings
- No previous run shows informational message without error
- baseline command stores and retrieves correctly
- --compare-previous vs --compare-last distinction works

---

### S-4-03: Plugin System (8 pts) — typescript-pro
**User Stories:** US-014
**FRs:** FR-076, FR-077, FR-078, FR-079, FR-080
**Priority:** P2

**Subtasks:**
- [ ] Create `src/plugins/types.ts` — PluginContext, PluginDefinition, Finding types
- [ ] Create `src/plugins/loader.ts` — load plugins from mcp-verify.config.js/mjs/cjs
- [ ] Create `src/plugins/runner.ts` — execute plugins with 30s timeout and error isolation
- [ ] Create `src/plugins/integration.ts` — merge plugin findings into reporting pipeline
- [ ] Export PluginContext and Finding types from package entry point
- [ ] Plugin findings appear in JSON with `source: "plugin"` and `pluginId`
- [ ] Plugin findings appear in terminal and Markdown reporters
- [ ] Plugin findings contribute to exit code via failOnSeverity
- [ ] Plugin findings can be suppressed via skip config
- [ ] Create `examples/plugins/custom-auth-check/` — reference plugin with README
- [ ] Create `examples/plugins/rate-limit-check/` — reference plugin with README
- [ ] 40+ unit tests (loader, runner, isolation, integration, reference plugins)

**Acceptance Criteria:**
- Plugin loaded from mcp-verify.config.js
- Plugin findings in all output formats
- Plugin error does not crash tool
- 30s timeout enforced
- Two reference plugins working and tested

---

### S-4-04: Web Dashboard (8 pts) — frontend-developer
**User Stories:** US-012, US-021
**FRs:** FR-066, FR-068, FR-069, FR-070, FR-071, FR-075
**Priority:** P2
**Depends on:** S-4-01

**Subtasks:**
- [ ] Create `src/dashboard/server.ts` — HTTP server for serve command
- [ ] Create `src/dashboard/api.ts` — REST API endpoints for history data
- [ ] Create `src/dashboard/static/` — bundled HTML/CSS/JS dashboard assets
- [ ] `serve` subcommand with `--port` flag (default 4000)
- [ ] Portfolio view: all servers table with score, findings, trend, last run
- [ ] Server detail: time-series conformance score line chart
- [ ] Category score overlay lines (toggle-able)
- [ ] Security findings trend: stacked severity bars per run
- [ ] Regression detection: visual markers on score drops > 5 points
- [ ] Sortable tables, responsive layout
- [ ] Content-Security-Policy: default-src 'self'
- [ ] No external CDN, fonts, analytics, or network requests
- [ ] Graceful port-in-use error
- [ ] 25+ unit tests

**Acceptance Criteria:**
- serve starts local HTTP server on port 4000
- Portfolio table shows all tracked servers
- Historical charts render for 1-100+ runs
- Zero external network requests (CSP enforced)
- --port override works

---

### S-4-05: History Export & Documentation (4 pts) — cli-developer
**User Stories:** US-012
**FRs:** FR-074, FR-060
**Priority:** P2
**Depends on:** S-4-01

**Subtasks:**
- [ ] Create `history export` subcommand
- [ ] `--output <path>` flag for export file destination
- [ ] `--all` flag to export all targets
- [ ] Export format: JSON array with exportedAt and toolVersion root fields
- [ ] Create `docs/plugin-authoring.md` — plugin authoring guide
- [ ] Update README with Sprint 4 features
- [ ] 15+ unit tests

**Acceptance Criteria:**
- history export produces valid JSON
- --all exports all tracked targets
- Plugin authoring guide covers full API

---

## Execution Order

```
Wave 1: S-4-01 (History Storage) — foundation
Wave 2: S-4-02 (Comparison) + S-4-03 (Plugins) — parallel
Wave 3: S-4-04 (Dashboard) + S-4-05 (Export/Docs) — parallel
Wave 4: Integration testing & polish
```

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Dashboard bundled assets increase package size | Medium | Low | Use minimal vanilla JS, no framework |
| Plugin dynamic import security | Low | High | Strict isolation, timeout, error boundary |
| History JSONL file corruption on concurrent writes | Low | Medium | Append-only, atomic writes |

---

## Team

| Agent | Stories | Points |
|-------|---------|--------|
| backend-developer | S-4-01 | 5 |
| cli-developer | S-4-02, S-4-05 | 9 |
| typescript-pro | S-4-03 | 8 |
| frontend-developer | S-4-04 | 8 |
| **Total** | **5 stories** | **30 pts** |
