# Sprint 2 Review

**Date:** 2026-03-28
**Facilitator:** scrum-master
**Participants:** product-manager, security-engineer, typescript-pro, backend-developer

---

## Sprint Summary

| Metric | Planned | Delivered |
|--------|---------|-----------|
| Stories | 7 | 7 |
| Story Points | 35 | 35 |
| New Tests | — | 86 |
| Total Tests | 98 | 184 |
| Bundle Size | < 5 MB | 101.84 KB |
| TypeScript Errors | 0 | 0 |

---

## Story Demonstrations

### S-2-01: Security Finding Data Model + CVSS Scoring
**Agent:** typescript-pro
**Status:** ACCEPTED

- SecurityFinding interface updated with all FR-041 fields: id, checkId, severity, cvssScore, component, title, description, remediation, confidence
- SecurityConfidence type uses 'deterministic' | 'heuristic' (not the conformance confidence scale)
- SecurityCheck interface contract: { id, name, check(ctx) → SecurityFinding[] }
- Runner orchestrates all checks with globally unique SEC-NNN IDs
- CVSS scores match FR-044 rubric exactly

**product-manager (as Paulo):** The finding data model is clean and consistent. Every finding has actionable remediation text — exactly what I need to fix issues quickly.

### S-2-02: Command Injection Check
**Agent:** typescript-pro
**Status:** ACCEPTED

- Detects parameter names: command, cmd, exec, shell, script, args, argv, path, file, filename, dir, directory
- Detects description keywords: execute, run command, shell, script, path to
- Correctly skips constrained parameters (pattern or enum)
- Correctly skips non-string types
- CVSS 8.1, severity high, confidence heuristic
- 18 unit tests covering detection and false positive avoidance

**security-engineer:** The regex patterns are linear-time safe — no catastrophic backtracking risk. The pattern/enum exclusion logic is sound.

### S-2-03: CORS Wildcard Check
**Agent:** backend-developer
**Status:** ACCEPTED

- Detects Access-Control-Allow-Origin: * on any HTTP endpoint
- Case-insensitive header lookup
- Skips stdio transport correctly
- CVSS 7.5, severity high, confidence deterministic
- 9 unit tests

### S-2-04: Authentication Gap Check
**Agent:** backend-developer
**Status:** ACCEPTED

- Detects missing auth on non-loopback servers
- Critical severity for public IPs (CVSS 9.8), Medium for private networks (CVSS 6.5)
- Correctly skips localhost, 127.0.0.1, ::1
- Correctly skips servers with WWW-Authenticate or Authorization headers
- 10 unit tests

### S-2-05: Tool Poisoning Check
**Agent:** typescript-pro
**Status:** ACCEPTED

- Detects 10 injection patterns including IGNORE PREVIOUS, [SYSTEM], <system>, you must, you are now
- Detects XML/HTML system tags in descriptions
- Detects suspiciously long descriptions (> 2000 chars)
- Detects URL-encoded and Base64-encoded tool names
- CVSS 8.8, severity critical, confidence heuristic
- 13 unit tests

**product-manager (as Paulo):** The prompt injection detection is exactly what's needed. This is a real differentiator — no other MCP tool checks for tool poisoning.

### S-2-06: Information Leakage Check
**Agent:** backend-developer
**Status:** ACCEPTED

- Detects stack traces (Node.js, Python, .NET patterns)
- Detects filesystem paths (/home/, /var/, C:\Users\)
- Detects environment variable references (process.env., $ENV_)
- Correctly skips generic error messages
- CVSS 5.3, severity medium, confidence deterministic
- 12 unit tests

### S-2-07: Terminal Reporter + CLI Integration
**Agent:** typescript-pro
**Status:** ACCEPTED

- Security findings displayed with severity tags (color-coded), confidence labels, CVSS scores
- Remediation text shown for each finding
- Clean servers show "No security findings detected" in green
- Security runner wired into CLI pipeline replacing Sprint 1 placeholder
- blockerCount properly computed from security findings

---

## Exit Criteria Verification

- [x] All five security check categories detect their target vulnerability
- [x] False positive rate: 0% against clean fixtures (9 false-positive tests, all passing)
- [x] Command injection check does NOT fire on constrained parameters
- [x] Tool poisoning check correctly labels findings as [heuristic]
- [x] Information leakage check correctly labels findings as [deterministic]
- [x] Security check test coverage: 86 dedicated tests
- [x] npm audit --audit-level=high passes (zero high/critical findings)
- [x] Version bumped to 0.2.0-alpha
