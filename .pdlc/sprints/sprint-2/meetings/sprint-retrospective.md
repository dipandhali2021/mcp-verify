# Sprint 2 Retrospective

**Date:** 2026-03-28
**Format:** Start-Stop-Continue (Sprint 1-2 format)
**Facilitator:** scrum-master
**Participants:** product-manager, security-engineer, typescript-pro, backend-developer

---

## Start

1. **Start reviewing regex patterns for ReDoS before merge** (security-engineer)
   - Sprint 2 introduced several regex patterns for security detection. While we reviewed them this sprint, we should formalize a regex safety review step in the Definition of Done.
   - **Action item:** Add "regex safety review" to Story-Level DoD for Sprint 3. Owner: scrum-master.

2. **Start tracking false positive rate as a CI metric** (backend-developer)
   - The < 5% false positive requirement is validated manually. We should automate this.
   - **Action item:** Add a dedicated false-positive rate test suite in Sprint 3. Owner: test-automator.

## Stop

1. **Stop deferring security confidence type alignment** (typescript-pro)
   - Sprint 1 used a generic confidence scale ('deterministic' | 'high' | 'medium' | 'low') in conformance checks, while Sprint 2 security checks use ('deterministic' | 'heuristic'). We resolved this by having separate types, but the inconsistency should be documented.
   - No further action needed — the separate types are correct for their respective domains.

## Continue

1. **Continue the parallel check implementation pattern** (scrum-master)
   - All five security checks were developed as independent modules with a shared interface. This made parallel development and testing straightforward. Same pattern should continue for Sprint 3 reporting formats.

2. **Continue the fixture-based testing approach** (backend-developer)
   - Testing each check against both vulnerable and clean fixtures caught issues early. The reference server exchange pattern from Sprint 1 extended cleanly for security testing.

3. **Continue the single-runner orchestration pattern** (typescript-pro)
   - The security runner with global ID numbering worked well. The same pattern can be extended for the JSON/Markdown reporters in Sprint 3.

---

## Metrics

| Metric | Sprint 1 | Sprint 2 | Trend |
|--------|----------|----------|-------|
| Planned Points | 104 | 35 | — |
| Delivered Points | 104 | 35 | Stable |
| Velocity | 104 | 35 | — |
| Tests Added | 98 | 86 | +88% |
| Total Tests | 98 | 184 | Growing |
| Bundle Size | 91.30 KB | 101.84 KB | +11% |
| Carry-over Stories | 0 | 0 | Clean |

---

## Action Items

| # | Action | Owner | Target Sprint |
|---|--------|-------|---------------|
| 1 | Add regex safety review to Story-Level DoD | scrum-master | Sprint 3 |
| 2 | Automate false positive rate tracking in CI | test-automator | Sprint 3 |
