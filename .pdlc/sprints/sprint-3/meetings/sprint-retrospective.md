# Sprint 3 Retrospective — 4Ls

**Date:** 2026-03-29
**Facilitator:** scrum-master
**Format:** 4Ls (Liked, Learned, Lacked, Longed For)

---

## Liked

- **Parallel wave execution:** Running 3 stories in Wave 1 simultaneously cut calendar time dramatically. The wave model is a strong pattern.
- **Zero carry-over streak:** Third consecutive sprint with 100% story completion. Team estimation is well-calibrated.
- **Composite action approach:** Choosing composite over Node.js for the GitHub Action avoided dependency bloat and simplified maintenance.
- **Config file design:** The three-way merge (CLI > config > defaults) is clean and predictable. SkipEntry with justification adds audit value.
- **Reporter abstraction:** The Reporter interface made adding JSON and Markdown formats almost mechanical — the abstraction from Sprint 1 paid off.

## Learned

- **ESM vs CJS module detection:** The `import.meta.url` approach for main-module detection doesn't work in CJS builds. Learned to use a simpler filename-based check.
- **Suppression strategy matters:** Running checks and marking findings as suppressed (vs. skipping checks entirely) is better for audit trails — suppressed findings remain visible.
- **Schema-first is essential for CI:** Documenting the JSON schema before implementing the reporter forced correct type alignment.
- **Composite actions are powerful:** GitHub's composite actions can do everything Node.js actions can, with less complexity, when the action is a CLI wrapper.

## Lacked

- **E2E CLI integration tests:** We have strong unit tests but no tests that invoke the actual built CLI binary against a mock server. Sprint 4 should add these.
- **SARIF reporter:** FR-060 (SARIF output) was deferred to Sprint 4. Some GitHub Code Scanning users will want this for the Security tab integration.
- **Windows CI testing:** The GitHub Action was designed for Linux/macOS. Windows testing of composite action steps is deferred.

## Longed For

- **Live MCP server for integration testing:** A lightweight, in-process test MCP server that could be spun up in Vitest would enable true E2E tests.
- **Config file validation schema:** While the loader handles invalid JSON, a formal schema validator for the config file structure would catch mistyped field names.
- **Documentation site:** The docs/examples are good but a proper documentation site (like VitePress) would be more discoverable.

---

## Action Items

| # | Action | Owner | Target Sprint |
|---|--------|-------|---------------|
| 1 | Add E2E CLI integration tests against mock server | test-automator | Sprint 4 |
| 2 | Implement SARIF reporter (FR-060) | typescript-pro | Sprint 4 |
| 3 | Add config file schema validation | backend-developer | Sprint 4 |
