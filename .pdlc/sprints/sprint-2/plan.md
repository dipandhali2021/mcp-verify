# Sprint 2 Plan — Security Check Engine

**Sprint Number:** 2 of 4
**Objective:** Five-category security check engine with known-vulnerable and known-clean test fixtures. Terminal reporter updated to display security findings. False positive rate below 5%.
**Planned Points:** 35
**Team:** security-engineer, typescript-pro, backend-developer
**Stories:** US-005, US-016, US-017, US-018, US-022
**FRs:** FR-036, FR-037, FR-038, FR-039, FR-040, FR-041, FR-044, FR-045

---

## Sprint Goal

> Build a complete five-category security vulnerability detection engine that analyzes MCP servers for command injection susceptibility, CORS wildcard policies, authentication gaps, tool poisoning patterns, and information leakage. Each check produces structured findings with CVSS-adjacent scores, severity levels, and remediation guidance. All checks validated against known-vulnerable and known-clean test fixtures with false positive rate below 5%.

---

## Committed Stories

### S-2-01: Security Finding Data Model + CVSS Scoring (5 pts) — typescript-pro
**FRs:** FR-041, FR-044
**Priority:** P0

Subtasks:
1. Update SecurityFinding type to include all FR-041 fields (id, checkId, severity, cvssScore, component, description, remediation, confidence)
2. Create SecurityCheck interface for check module contract
3. Create SecurityCheckContext type with protocol exchange data
4. Implement CVSS score constants per FR-044 rubric
5. Create security check runner that orchestrates all checks
6. Create security check registry for module registration
7. Export public API from validators/security/index.ts
8. Write unit tests for data model and runner

### S-2-02: Command Injection Check (8 pts) — typescript-pro
**FR:** FR-036
**Priority:** P0
**Depends on:** S-2-01

Subtasks:
1. Create command-injection.ts module with check function signature
2. Implement parameter name pattern matching (command, cmd, exec, shell, script, args, etc.)
3. Implement description keyword matching (execute, run, command, shell, etc.)
4. Add pattern/enum constraint exclusion logic (skip if constrained)
5. Add non-string type exclusion (only flag string params)
6. Set severity High, CVSS 8.1, confidence heuristic
7. Create vulnerable fixture — tool with unconstrained `command` string param
8. Create clean fixture — tool with constrained string param (pattern/enum)
9. Write unit tests for detection and false positive avoidance
10. Write integration test against both fixtures

### S-2-03: CORS Wildcard Check (5 pts) — backend-developer
**FR:** FR-037
**Priority:** P0
**Depends on:** S-2-01

Subtasks:
1. Create cors-wildcard.ts module
2. Implement HTTP header inspection for Access-Control-Allow-Origin: *
3. Add stdio transport exclusion (CORS not applicable)
4. Add non-wildcard value exclusion
5. Set severity High, CVSS 7.5, confidence deterministic
6. Create vulnerable fixture — HTTP response with wildcard CORS
7. Create clean fixture — HTTP response with specific origin
8. Write unit tests

### S-2-04: Authentication Gap Check (5 pts) — backend-developer
**FR:** FR-038
**Priority:** P0
**Depends on:** S-2-01

Subtasks:
1. Create auth-gap.ts module
2. Implement loopback/private address detection (localhost, 127.0.0.1, ::1, RFC 1918)
3. Implement auth header absence detection (no Authorization, no WWW-Authenticate)
4. Set severity Critical for public, Medium for private network
5. Set CVSS 9.8 for public, 6.5 for private, confidence heuristic
6. Add stdio transport exclusion
7. Create vulnerable fixture — non-loopback server with no auth
8. Create clean fixture — localhost server
9. Write unit tests

### S-2-05: Tool Poisoning Check (5 pts) — typescript-pro
**FR:** FR-039
**Priority:** P0
**Depends on:** S-2-01

Subtasks:
1. Create tool-poisoning.ts module
2. Implement instruction pattern detection (IGNORE PREVIOUS, [SYSTEM], <system>, DO NOT, you must, you are now)
3. Implement XML/HTML tag detection in descriptions
4. Implement suspicious length check (> 2000 chars)
5. Implement URL-encoded/Base64 name detection
6. Add legitimate operational language exclusion
7. Set severity Critical, CVSS 8.8, confidence heuristic
8. Create vulnerable fixture — tool with prompt injection description
9. Create clean fixture — tool with normal description
10. Write unit tests

### S-2-06: Information Leakage Check (5 pts) — backend-developer
**FR:** FR-040
**Priority:** P0
**Depends on:** S-2-01

Subtasks:
1. Create info-leakage.ts module
2. Implement stack trace pattern detection (at Function., at Object.<anonymous>)
3. Implement filesystem path detection (/home/, /var/, C:\Users\, etc.)
4. Implement environment variable pattern detection (process.env., $ENV_)
5. Add generic error message exclusion
6. Set severity Medium, CVSS 5.3, confidence deterministic
7. Create vulnerable fixture — error response with stack trace
8. Create clean fixture — error response with generic message
9. Write unit tests

### S-2-07: Terminal Reporter Security Section + CLI Integration (2 pts) — typescript-pro
**FR:** US-005 acceptance criteria
**Priority:** P0
**Depends on:** S-2-01

Subtasks:
1. Update terminal reporter to display security findings section
2. Color-code severity levels (Critical=red, High=red, Medium=yellow, Low=cyan)
3. Show confidence labels ([deterministic]/[heuristic])
4. Show remediation text for each finding
5. Show "No security findings detected" in green for clean servers
6. Wire security check runner into cli.ts verification pipeline
7. Update blockerCount computation for security findings
8. Write integration test for reporter output

---

## Execution Sequence

1. **Day 1:** S-2-01 (data model + runner) — foundation for all checks
2. **Day 2:** S-2-02 (command injection) + S-2-03 (CORS) in parallel
3. **Day 3:** S-2-04 (auth gap) + S-2-05 (tool poisoning) in parallel
4. **Day 4:** S-2-06 (info leakage) + S-2-07 (reporter + CLI integration)
5. **Day 5:** Test fixtures for all 5 categories + comprehensive test suite
6. **Day 6:** Integration testing, false positive validation, bug fixes, ceremonies

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ReDoS in regex patterns | Medium | High | Review all regexes for catastrophic backtracking, test with pathological inputs |
| False positive rate exceeds 5% | Low | Medium | Conservative pattern matching, test against diverse clean fixtures |
| Tool poisoning heuristics too aggressive | Medium | Medium | Use specific known-bad patterns, not generic imperative detection |
| Transport metadata missing HTTP headers | Low | High | Verify Sprint 1 transport captures headers for CORS/auth checks |

---

## Definition of Done

- [x] All five security check categories implemented
- [x] Each check produces SecurityFinding with all FR-041 fields
- [x] CVSS scores match FR-044 rubric
- [x] Vulnerable fixtures trigger correct findings
- [x] Clean fixtures produce zero false positives
- [x] Terminal reporter displays security findings with severity, confidence, remediation
- [x] CLI pipeline wired to run security checks
- [x] All existing 98 tests still pass
- [x] New security tests achieve >85% coverage
- [x] tsc --noEmit --strict passes
- [x] Version bumped to 0.2.0-alpha
