# Sprint 2 Planning Meeting

**Date:** 2026-03-28 (Sprint 2 session start)
**Facilitator:** scrum-master
**Participants:** product-manager, security-engineer, typescript-pro, backend-developer

---

## Sprint Goal

**product-manager:** Sprint 2 objective is the security check engine. We need all five vulnerability detection categories implemented with test fixtures proving detection and absence of false positives. This is the core differentiator for MCP Verify — no other tool does this.

**scrum-master:** Velocity from Sprint 1 was 104 points delivered against 104 planned. Sprint 2 planned velocity is 35 points at 75-80% utilization. We have a calibrated team and no infrastructure overhead this sprint.

---

## Story Review

### S-2-01: Security Finding Data Model + CVSS Scoring (5 pts)
**typescript-pro:** I'll take this. The existing SecurityFinding type needs alignment with FR-041 — adding checkId, cvssScore, component fields. I'll also build the check runner that orchestrates all five checks. 5 points is right.

**security-engineer:** Make sure the confidence field supports exactly two values: 'deterministic' and 'heuristic'. The current type has 'high'/'medium'/'low' which doesn't match the spec.

**typescript-pro:** Good catch. I'll update the type to use a union of 'deterministic' | 'heuristic' for the security checks.

### S-2-02: Command Injection Check (8 pts)
**typescript-pro:** This is the most complex check — parameter name matching, description keyword matching, pattern/enum exclusion logic. I'm estimating 8 points for the regex complexity and false positive tuning.

**security-engineer:** The regex patterns must be ReDoS-safe. No unbounded quantifiers on nested groups. I'll review all regexes before merge. Also, the CVSS base score is 8.1 per FR-044.

**scrum-master:** Accepted at 8 points.

### S-2-03: CORS Wildcard Check (5 pts)
**backend-developer:** Straightforward — inspect HTTP headers for `Access-Control-Allow-Origin: *`. The transport metadata already captures httpHeaders. I need to verify the header key casing. 5 points.

**security-engineer:** Remember to skip this check entirely for stdio transport. CORS doesn't apply.

### S-2-04: Authentication Gap Check (5 pts)
**backend-developer:** I'll implement loopback/private address detection. The transport metadata has resolvedAddress and addressType fields from Sprint 1. 5 points.

**security-engineer:** Critical for public targets, Medium for private network. Two different severity levels from the same check — make sure the finding data model supports that.

### S-2-05: Tool Poisoning Check (5 pts)
**typescript-pro:** Pattern matching on tool descriptions for prompt injection indicators. The patterns are well-defined in FR-039. 5 points.

**security-engineer:** Be careful with the "legitimate operational language" exclusion. "Returns the current time" should NOT trigger, but "IGNORE PREVIOUS INSTRUCTIONS" must. Use specific known-bad patterns, not generic imperative detection.

### S-2-06: Information Leakage Check (5 pts)
**backend-developer:** Stack trace and path detection in error responses. The protocol exchange record captures error probe responses from Sprint 1. 5 points.

### S-2-07: Terminal Reporter + CLI Integration (2 pts)
**typescript-pro:** Wire the security runner into the CLI pipeline and update the terminal reporter. The reporter already has a stub section. 2 points.

---

## Commitment

| Story | Points | Agent | Status |
|-------|--------|-------|--------|
| S-2-01 | 5 | typescript-pro | Committed |
| S-2-02 | 8 | typescript-pro | Committed |
| S-2-03 | 5 | backend-developer | Committed |
| S-2-04 | 5 | backend-developer | Committed |
| S-2-05 | 5 | typescript-pro | Committed |
| S-2-06 | 5 | backend-developer | Committed |
| S-2-07 | 2 | typescript-pro | Committed |
| **Total** | **35** | | |

**scrum-master:** 35 points committed at 75-80% utilization. Sprint 1 retro action items reviewed — none from Sprint 1 (first sprint). Let's begin.
