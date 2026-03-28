# PDLC File Templates

All runtime file templates created by the PDLC orchestrator in the target project. Read this file when you need to create or update any PDLC artifact.

---

## 1. Config State File

**Path:** `.pdlc/config.json`
**Created:** At PDLC initialization
**Updated:** After every phase transition

```json
{
  "pdlc_version": "1.0.0",
  "project_name": "",
  "project_description": "",
  "created_at": "YYYY-MM-DDTHH:MM:SSZ",
  "updated_at": "YYYY-MM-DDTHH:MM:SSZ",
  "current_phase": "INIT",
  "current_sprint": 0,
  "total_planned_sprints": 0,
  "tech_stack": {
    "project_type": "",
    "primary_language": "",
    "framework": "",
    "database": "",
    "deployment_target": "",
    "assigned_agents": []
  },
  "phase_history": [
    {
      "phase": "RESEARCH",
      "started_at": "YYYY-MM-DDTHH:MM:SSZ",
      "completed_at": "YYYY-MM-DDTHH:MM:SSZ",
      "agents_invoked": ["trend-analyst", "market-researcher"],
      "artifacts_produced": ["research/trend-scan-2026-03-28.md"],
      "outcome": "success",
      "notes": ""
    }
  ],
  "sprint_history": [
    {
      "sprint_number": 1,
      "goal": "",
      "stories_planned": 0,
      "stories_completed": 0,
      "stories_deferred": 0,
      "agents_used": [],
      "started_at": "YYYY-MM-DDTHH:MM:SSZ",
      "completed_at": "YYYY-MM-DDTHH:MM:SSZ",
      "velocity": 0,
      "issues_found": 0,
      "issues_resolved": 0,
      "test_pass_rate": 0,
      "improvement_actions": []
    }
  ],
  "self_improvement": {
    "total_lessons_learned": 0,
    "agent_performance_scores": {},
    "estimation_calibration_factor": 1.0,
    "recommended_changes": []
  },
  "external_skills": {
    "sprint-planning": false,
    "scrum-master": false,
    "task-estimation": false,
    "standup-meeting": false,
    "sprint-retrospective": false,
    "roadmap-update": false,
    "remotion-best-practices": false,
    "git-commit": false,
    "github-issues": false,
    "gh-cli": false,
    "pr-create": false,
    "prd": false,
    "excalidraw-diagram-generator": false
  },
  "execution_mode": "subagent",
  "agent_teams": {
    "available": false,
    "env_var_set": false,
    "tools_available": false,
    "phases_using_teams": [],
    "fallback_count": 0
  },
  "session_progress": {
    "current_sprint_day": 0,
    "sprint_start_date": "YYYY-MM-DD",
    "daily_commit_target": 0,
    "agents": {
      "[agent-name]": {
        "current_story": "S-N-XX",
        "subtasks_total": 10,
        "subtasks_completed": 0,
        "current_subtask": 1,
        "commits_today": 0,
        "last_commit_time": "HH:MM"
      }
    }
  },
  "role_hierarchy": {
    "manager": "pdlc-orchestrator",
    "product_manager": "product-manager",
    "engineers": []
  }
}
```

**Valid `current_phase` values:** `INIT`, `RESEARCH`, `PLANNING`, `DESIGN`, `DEVELOPMENT`, `TESTING`, `DEPLOYMENT`, `REVIEW`, `IMPROVE`, `COMPLETE`

**Session progress:** Updated after every subtask commit. `current_sprint_day` ranges 0 (planning) to 6 (Sunday). `daily_commit_target` is randomized 5–12 at the start of each day. Each agent's entry tracks their position within their current story's subtask list.

---

## 2. Project Selection Report

**Path:** `.pdlc/research/project-selection.md`
**Created:** End of RESEARCH phase

```markdown
# Project Selection Report

**Date:** YYYY-MM-DD
**Research Cycles:** N

## Selected Project

**Name:** [Project Name]
**Description:** [2-3 sentence description]
**Target Users:** [Who will use this]
**Key Differentiator:** [What makes this unique]
**Estimated Sprints:** N

## Scoring

| Candidate | Trend Momentum | Market Size | Feasibility | Differentiation | Total |
|-----------|---------------|-------------|-------------|-----------------|-------|
| **[Winner]** | XX/25 | XX/25 | XX/25 | XX/25 | **XX/100** |
| [Runner-up] | XX/25 | XX/25 | XX/25 | XX/25 | XX/100 |
| [Option 3] | XX/25 | XX/25 | XX/25 | XX/25 | XX/100 |

## Selection Rationale

[Why this project was chosen over alternatives. Include trend data, market opportunity, and feasibility assessment.]

## Key Research Findings

### Trend Data
[Summary from trend-analyst]

### Market Analysis
[Summary from market-researcher]

### Competitive Landscape
[Summary from competitive-analyst — existing solutions and gaps]

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [Strategy] |

## Next Steps
- Proceed to PLANNING phase
- Focus on: [key areas to prioritize]
```

---

## 3. Sprint Plan

**Path:** `.pdlc/sprints/sprint-N/plan.md`
**Created:** Start of each DEVELOPMENT phase

```markdown
# Sprint N Plan

## Sprint Goal
[One-sentence sprint goal — what user-visible outcome will this sprint deliver]

## Duration
**Start:** YYYY-MM-DD | **End:** YYYY-MM-DD

## Backlog Status
- Total stories remaining: X
- Stories in this sprint: X
- Estimated velocity: X story points

## Stories

| ID | Story | Description | Agent(s) | Points | Priority | Dependencies |
|----|-------|-------------|----------|--------|----------|--------------|
| S-N-01 | [Story title] | [Brief description] | [agent-name] | X | P0 | — |
| S-N-02 | [Story title] | [Brief description] | [agent-name] | X | P1 | S-N-01 |
| S-N-03 | [Story title] | [Brief description] | [agent-name] | X | P1 | — |
| S-N-04 | [Story title] | [Brief description] | [agent-name] | X | P2 | — |

## Subtask Breakdown

Each story is decomposed into 8–12 subtasks. Each subtask = one commit.

### Story S-N-01: [Story title] — [agent-name]

Subtasks:
1. [ ] [First subtask description]
2. [ ] [Second subtask description]
3. [ ] [Third subtask description]
...

### Story S-N-02: [Story title] — [agent-name]

Subtasks:
1. [ ] [First subtask description]
2. [ ] [Second subtask description]
...

## Day Targets

| Day | Stories Active | Target Subtasks |
|-----|--------------|-----------------|
| Day 1 (Tue) | S-N-01, S-N-03, S-N-04 | First 2–3 subtasks each |
| Day 2 (Wed) | S-N-01, S-N-02, S-N-03 | Continue + S-N-02 starts (S-N-01 unblocks it) |
| Day 3 (Thu) | All active | Mid-point subtasks |
| Day 4 (Fri) | All active | Stories advancing |
| Day 5 (Sat) | All active | Targeting completion |
| Day 6 (Sun) | Remaining | Final subtasks + integration |

## Execution Order
1. **Parallel group 1 (no dependencies):** S-N-01, S-N-03, S-N-04
2. **Sequential after group 1:** S-N-02

## Sprint Risks

| Risk | Mitigation |
|------|------------|
| [Risk description] | [Strategy] |

## Definition of Done
- [ ] Code written and compiles/runs
- [ ] Unit tests written and passing
- [ ] Code reviewed by code-reviewer
- [ ] Documentation updated
- [ ] No critical security issues
- [ ] Integrated with existing codebase

## Self-Improvement Actions Applied
[Actions from previous sprint's IMPROVE phase, or "N/A" for sprint 1]
```

---

## 4. Sprint Results

**Path:** `.pdlc/sprints/sprint-N/results.md`
**Created:** End of REVIEW phase

```markdown
# Sprint N Results

## Summary
[2-3 sentence summary of what was delivered this sprint]

## Sprint Goal Achievement
**Goal:** [The sprint goal from plan.md]
**Status:** Achieved / Partially Achieved / Not Achieved

## Delivered Stories

| ID | Story | Status | Agent(s) Used | Points | Notes |
|----|-------|--------|---------------|--------|-------|
| S-N-01 | [Title] | Done | [agent] | X | — |
| S-N-02 | [Title] | Done | [agent] | X | — |
| S-N-03 | [Title] | Partial | [agent] | X | [What's incomplete] |
| S-N-04 | [Title] | Deferred | — | X | [Why deferred] |

## Metrics

| Metric | Planned | Actual | Delta |
|--------|---------|--------|-------|
| Stories completed | X | X | +/-X |
| Story points | X | X | +/-X |
| Test coverage | X% | X% | +/-X% |
| Issues found | — | X | — |
| Issues resolved | — | X | — |
| Agents invoked | — | X | — |

## Test Results
- **Unit tests:** X passed / X failed / X total
- **Integration tests:** X passed / X failed / X total
- **Security scan:** Pass / Fail (details)
- **Performance:** [Metrics if applicable]

## Retrospective

### What Went Well
- [Item 1]
- [Item 2]

### What Needs Improvement
- [Item 1]
- [Item 2]

### Action Items for Next Sprint
- [ ] [Action 1]
- [ ] [Action 2]

## Agent Performance This Sprint

| Agent | Stories Handled | Success Rate | Notes |
|-------|----------------|-------------|-------|
| [agent-name] | X | X% | [Any observations] |
```

---

## 5. Agent Log

**Path:** `.pdlc/sprints/sprint-N/agent-log.md`
**Created:** During DEVELOPMENT phase, updated throughout sprint

```markdown
# Sprint N Agent Log

## Summary
- Total agent invocations: X
- Unique agents used: X
- Failed invocations: X
- Retries: X

## Invocation Log

| # | Agent | Task | Phase | Status | Duration | Retry | Notes |
|---|-------|------|-------|--------|----------|-------|-------|
| 1 | scrum-master | Sprint planning | DEVELOPMENT | Success | — | 0 | — |
| 2 | react-specialist | Story S-N-01 | DEVELOPMENT | Success | — | 0 | — |
| 3 | backend-developer | Story S-N-02 | DEVELOPMENT | Failed | — | 1 | Retried with opus |
| 4 | qa-expert | Test strategy | TESTING | Success | — | 0 | — |

## Agent Contributions Detail

For each agent that worked on a story, capture what they actually produced and their reasoning:

### [agent-name] — Story S-N-XX: [Title]
**Files created/modified:**
- `src/path/to/file.ts` — [what this file does]
- `src/path/to/other.ts` — [what this file does]

**Key decisions made:**
- [Decision 1: e.g., "Used JWT over session tokens because the API is stateless"]
- [Decision 2: e.g., "Chose PostgreSQL jsonb for flexible metadata storage"]

**Tradeoffs accepted:**
- [Tradeoff: e.g., "Denormalized user preferences for read speed at cost of write complexity"]

**Open questions / tech debt introduced:**
- [Item: e.g., "Rate limiting is hardcoded, should be configurable"]
```

---

## 6. Dashboard

**Path:** `.pdlc/dashboard.md`
**Created:** After first REVIEW phase, updated every phase transition

```markdown
# PDLC Dashboard

## Project: [Project Name]

| Field | Value |
|-------|-------|
| **Status** | [Current Phase] |
| **Sprint** | N of M |
| **Last Updated** | YYYY-MM-DD |
| **Created** | YYYY-MM-DD |

## Progress

**Overall:** ██████████░░░░░░░░░░ N/M sprints (XX%)

| Phase | Sprint 1 | Sprint 2 | Sprint 3 | Sprint 4 |
|-------|----------|----------|----------|----------|
| Development | Done | Done | In Progress | Pending |
| Testing | Done | Done | — | — |
| Deployment | Done | Done | — | — |
| Review | Done | Done | — | — |

## Key Metrics

| Metric | Current | Trend | Target |
|--------|---------|-------|--------|
| Avg Velocity | X pts/sprint | [up/down/stable] | — |
| Test Pass Rate | X% | [up/down/stable] | 90%+ |
| Issues Found/Sprint | X | [up/down/stable] | Decreasing |
| Agent Success Rate | X% | [up/down/stable] | 95%+ |
| Completion Rate | X% | [up/down/stable] | 90%+ |

## Recent Activity
- **YYYY-MM-DD:** [Sprint N completed — X stories delivered]
- **YYYY-MM-DD:** [Sprint N-1 review — velocity improved by X%]
- **YYYY-MM-DD:** [Project initialized — [Project Name] selected]

## Upcoming
- Sprint N+1: [Sprint goal]
- Key milestones: [Next milestone]

## Self-Improvement Summary
- Lessons learned: X
- Agent swaps made: X
- Estimation calibration factor: X.XX
- Top recommendation: [Latest recommendation]

## Tech Stack
- **Language:** [language]
- **Framework:** [framework]
- **Database:** [database]
- **Deployment:** [target]
```

---

## 7. Self-Improvement Log

**Path:** `.pdlc/retrospective/self-improvement-log.md`
**Created:** After first IMPROVE phase, appended each sprint

```markdown
# Self-Improvement Log

Cumulative record of lessons learned and adaptations made across sprints.

## Sprint 1 Improvements
**Date:** YYYY-MM-DD

### Lessons Learned
- [Lesson 1]
- [Lesson 2]

### Adaptations Made
- [Change 1: e.g., "Increased context provided to backend-developer"]
- [Change 2: e.g., "Reduced sprint scope from 6 to 4 stories"]

### Agent Performance Adjustments
- [Agent swap or tier change, if any]

---

## Sprint 2 Improvements
**Date:** YYYY-MM-DD

[Same structure, appended]
```

---

## 8. Agent Performance Data

**Path:** `.pdlc/retrospective/agent-performance.json`
**Created:** After first IMPROVE phase, updated each sprint

```json
{
  "last_updated": "YYYY-MM-DDTHH:MM:SSZ",
  "agents": {
    "agent-name": {
      "total_invocations": 0,
      "successful": 0,
      "failed": 0,
      "retries": 0,
      "avg_quality_score": 0,
      "sprints_active": [],
      "notes": ""
    }
  },
  "rankings": {
    "highest_success_rate": [],
    "most_retries": [],
    "most_invoked": []
  }
}
```

---

## 9. Recommendations

**Path:** `.pdlc/retrospective/recommendations.md`
**Created:** After first IMPROVE phase, overwritten each sprint with latest

```markdown
# PDLC Recommendations

**Generated by:** knowledge-synthesizer + performance-monitor
**Date:** YYYY-MM-DD
**Based on:** Sprints 1 through N

## Priority Recommendations

### 1. [Recommendation Title]
**Impact:** High/Medium/Low
**Effort:** High/Medium/Low
**Details:** [What to change and why]

### 2. [Recommendation Title]
**Impact:** High/Medium/Low
**Effort:** High/Medium/Low
**Details:** [What to change and why]

## Agent Selection Adjustments
- [Any agent swaps or tier changes recommended]

## Sprint Sizing Adjustments
- Current velocity: X pts/sprint
- Recommended next sprint size: X stories / X points
- Calibration factor: X.XX

## Process Improvements
- [Workflow or process changes recommended]
```

---

## 10. Architecture Decision Record

**Path:** `.pdlc/architecture/adr/NNN-title.md`
**Created:** During DESIGN phase and whenever significant architecture decisions are made

```markdown
# ADR-NNN: [Decision Title]

**Date:** YYYY-MM-DD
**Status:** Accepted / Superseded / Deprecated
**Supersedes:** [ADR-XXX if applicable]

## Context
[What is the issue that we're seeing that is motivating this decision or change?]

## Decision
[What is the change that we're proposing and/or doing?]

## Consequences

### Positive
- [Benefit 1]

### Negative
- [Tradeoff 1]

### Neutral
- [Observation 1]
```

---

## 11. Sprint Planning Meeting Minutes

**Path:** `.pdlc/sprints/sprint-N/meetings/sprint-planning.md`
**Created:** Start of DEVELOPMENT phase (Monday of sprint week)

```markdown
# Sprint N — Sprint Planning Meeting

**Date:** YYYY-MM-DD
**Facilitator:** scrum-master
**Participants:** product-manager, [list of development agents assigned this sprint]

## Sprint Goal
**product-manager:** "[Sprint goal statement — what user-visible outcome this sprint delivers]"

## Backlog Presentation
product-manager presents prioritized stories for this sprint.

## Story Discussion & Negotiation

### Story S-N-01: [Title]
**Presented by:** product-manager
**Assigned to:** [agent-name]
**Discussion:**
- **[agent-name]:** "I can take this. Estimate: 3 points. I'll need access to [specific doc/resource]."
- **product-manager:** "Accepted. Make sure to include [specific acceptance criterion]."
**Final estimate:** 3 points | **Status:** Committed

### Story S-N-02: [Title]
**Presented by:** product-manager
**Assigned to:** [agent-name]
**Discussion:**
- **[agent-name]:** "This is underestimated. The [component] requires [explanation]. I'd say 5 points, not 3."
- **scrum-master:** "Can we split this to keep it manageable?"
- **[agent-name]:** "Yes — S-N-02a handles the schema, S-N-02b handles the API endpoints."
- **product-manager:** "Agreed to split. S-N-02a is P0, S-N-02b can be P1."
**Final estimate:** 3 + 2 points (split) | **Status:** Committed (split)

### Story S-N-03: [Title]
**Discussion:**
- **[agent-name]:** "I have a concern — this depends on [dependency] which isn't done yet."
- **scrum-master:** "We'll sequence this after [dependency]. [other-agent], can you prioritize that?"
- **[other-agent]:** "Yes, I'll have it done by day 2."
**Final estimate:** X points | **Status:** Committed (sequenced)

## Sprint Capacity
- Total team capacity: X points (adjusted by calibration factor: X.XX)
- Total committed: X points
- Buffer: X points

## Risks Identified
- [Risk raised during discussion]

## Action Items
- [ ] [Action from discussion]

## Meeting Outcome
All agents have committed to their stories. Sprint is GO.
```

---

## 12. Daily Standup Transcripts

**Path:** `.pdlc/sprints/sprint-N/meetings/standups.md`
**Created:** During DEVELOPMENT phase, appended after each wave of agent work

```markdown
# Sprint N — Daily Standups

## Standup — Day 1 (YYYY-MM-DD)

**Facilitator:** scrum-master

**react-specialist:**
- Done: Completed Story S-N-01 (login form with validation, Stitch design-to-code)
- Today: Starting S-N-03 (dashboard layout)
- Blockers: None
- Notes: "Stitch react-components generated clean output, minor tweaks needed for our design tokens"

**backend-developer:**
- Done: S-N-02a schema migration complete
- Today: Starting S-N-02b API endpoints
- Blockers: "Need JWT_SECRET in env config — who handles environment setup?"
- Notes: —

**devops-engineer:**
- Response to blocker: "I'll add JWT_SECRET to the env template. Ready in 1 hour."

**scrum-master summary:**
- Action: devops-engineer unblocks backend-developer on env config by EOD
- Observation: Frontend ahead of schedule, backend slightly behind. On track overall.
- Reassignments: None needed

---

## Standup — Day 2 (YYYY-MM-DD)
[Same conversational format, appended]
```

---

## 13. Sprint Review Meeting Minutes

**Path:** `.pdlc/sprints/sprint-N/meetings/sprint-review.md`
**Created:** End of sprint (Friday), during REVIEW phase

```markdown
# Sprint N — Sprint Review Meeting

**Date:** YYYY-MM-DD
**Facilitator:** scrum-master
**Participants:** product-manager, all sprint agents, [simulated user personas]

## Sprint Goal Recap
**Goal:** [Sprint goal from plan]
**Verdict:** Achieved / Partially Achieved / Not Achieved

## Story Demos

### S-N-01: [Title] — Demo by [agent-name]
**What was built:** [Description of deliverable]
**Key decisions:** [Notable technical choices made]
**Demo:** [What was shown — screens, API calls, test results]
**product-manager verdict:** "Meets acceptance criteria. Approved."

### S-N-02: [Title] — Demo by [agent-name]
**What was built:** [Description]
**product-manager verdict:** "Missing error handling for [edge case]. Needs rework."
**Action:** Added to sprint N+1 backlog as bug fix.

## User Persona Reactions

### Persona: [Name] — [Role]
- Positive: "[What they'd like]"
- Friction: "[What would frustrate them]"
- Request: "[What they'd ask for next]"
- Usability: X/10

### Persona: [Name] — [Role]
[Same structure]

## Sprint Metrics

| Metric | Planned | Actual |
|--------|---------|--------|
| Stories | X | X |
| Points | X | X |
| Test pass rate | — | X% |
| Confidence score | — | XX/100 |

## Key Takeaways
- [Insight 1]
- [Insight 2]
```

---

## 14. Sprint Retrospective Meeting Minutes

**Path:** `.pdlc/sprints/sprint-N/meetings/sprint-retro.md`
**Created:** End of sprint (Friday), during REVIEW phase, after sprint review

```markdown
# Sprint N — Sprint Retrospective

**Date:** YYYY-MM-DD
**Facilitator:** scrum-master
**Participants:** ALL agents who participated in sprint N

## Opening
scrum-master: "Let's reflect on sprint N. What went well? What didn't? What should we change?"

## Agent Reflections

### react-specialist
**Went well:** "Stitch design-to-code pipeline saved significant time on S-N-01. The design specs from enhance-prompt were detailed enough to generate components with minimal tweaking."
**Didn't go well:** "S-N-03 took longer than estimated. The dashboard had complex state management I didn't anticipate in planning."
**Suggestion:** "For complex UI stories with lots of state, pair me with a state management specialist or add a spike first."

### backend-developer
**Went well:** "The API spec from api-designer was comprehensive. Made implementation straightforward."
**Didn't go well:** "Got blocked for half a day waiting on environment config. Lost momentum."
**Suggestion:** "All infrastructure/config stories should complete before feature stories start. Or at least the env setup story should be day 1 priority."

### security-auditor
**Went well:** "Caught the XSS vulnerability early in the testing phase."
**Didn't go well:** "The auth implementation didn't follow the security-design.md patterns. Had to flag as Critical critique."
**Suggestion:** "Development agents should be required to reference security-design.md during implementation, not just system-design.md."

### qa-expert
**Went well:** "Test coverage hit 78%, above our 70% target."
**Didn't go well:** "Integration tests took too long to write because there was no test data setup."
**Suggestion:** "Add a 'test infrastructure' story to sprint 1 that sets up fixtures and factories."

## scrum-master Synthesis

### What Went Well (team-wide)
- [Pattern across agents]
- [Pattern across agents]

### What Needs Improvement (team-wide)
- [Pattern across agents]
- [Pattern across agents]

### Committed Action Items for Sprint N+1
- [ ] [Specific, actionable change — e.g., "Sequence infra stories before feature stories"]
- [ ] [Specific change — e.g., "Add security-design.md to required reading for all dev agents"]
- [ ] [Specific change — e.g., "Add spike for any story estimated above 5 points"]

### Process Changes
- [Change to sprint structure, if any]
- [Change to agent assignments, if any]

## Confidence Trend
| Sprint | Confidence | Velocity | Notes |
|--------|-----------|----------|-------|
| Sprint 1 | XX/100 | X pts | [Brief note] |
| Sprint N | XX/100 | X pts | [Brief note] |
| Trend | [up/down/stable] | [up/down/stable] | — |
```

---

## 15. 1:1 Coaching Meeting Notes

**Path:** `.pdlc/retrospective/coaching/[agent-name].md`
**Created:** During IMPROVE phase for underperforming agents, cumulative across sprints

```markdown
# Coaching Profile: [agent-name]

**Role:** [Agent's specialization]
**Sprints active:** [1, 2, 3, ...]
**Overall performance trend:** Improving / Stable / Declining

---

## Sprint N — 1:1 with Orchestrator

**Date:** YYYY-MM-DD
**Reason for 1:1:** [Rework needed / Retry required / Critical critique / First sprint]

### Performance This Sprint
- Stories assigned: X
- Completed first-attempt: X
- Required rework: X
- Retries: X
- Design critiques: X (Critical: X, Major: X)

### Specific Issues Discussed

**Issue 1: [Story S-N-XX]**
- What happened: "[Specific problem — e.g., 'Generated raw SQL instead of using the ORM']"
- Root cause: "[Why — e.g., 'data-model.md was not provided as input context']"
- Fix: "[What was done to resolve it]"
- Prevention: "[Coaching note for future — e.g., 'Always read data-model.md before writing DB code']"

**Issue 2: [Story S-N-XX]**
- What happened: "[Problem]"
- Root cause: "[Why]"
- Fix: "[Resolution]"
- Prevention: "[Coaching note]"

### Coaching Notes Added
These are prepended to this agent's context in ALL future sprint invocations:

1. "[Specific instruction — e.g., 'Always read data-model.md before writing any database access code. Use the ORM specified there.']"
2. "[Specific instruction — e.g., 'All API responses must return JSON: {error: string, code: number}. Reference security-design.md section 4.']"

### Positive Reinforcement
- "[What worked well — e.g., 'Clean component architecture, good separation of concerns']"
- "[Carry forward — e.g., 'Continue using the factory pattern for service initialization']"

---

## Sprint N-1 — 1:1 with Orchestrator
[Previous sprint's coaching notes — kept for context]

---

## Cumulative Coaching Context
**Current active coaching notes** (prepended to every invocation):

1. [Note from sprint 1]
2. [Note from sprint 1]
3. [Note from sprint 2 — added]
4. [Note from sprint 3 — added]

**Strengths** (reinforced):
- [Consistent strength 1]
- [Consistent strength 2]

**Resolved Issues** (no longer active coaching):
- ~~[Issue resolved in sprint 2]~~ — Resolved, removed from active coaching
```

---

## 16. Decision Journal

---

## 12. Decision Journal

**Path:** `.pdlc/architecture/decision-journal.md`
**Created:** During DESIGN phase, appended throughout project lifetime

Unlike ADRs (which capture formal architecture decisions), the decision journal captures the *reasoning process* — what alternatives were considered, what tradeoffs were debated, and why certain paths were rejected. This is what makes the system feel like a real engineering team thinking through problems.

```markdown
# Decision Journal

## YYYY-MM-DD — [Decision Topic]

**Context:** [What problem or question came up]
**Decided by:** [agent-name]
**Phase:** [DESIGN / DEVELOPMENT / etc.]

### Options Considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| [Option A] | [Benefits] | [Drawbacks] | Low/Med/High |
| [Option B] | [Benefits] | [Drawbacks] | Low/Med/High |
| [Option C] | [Benefits] | [Drawbacks] | Low/Med/High |

### Chosen: [Option X]

**Reasoning:** [2-3 sentences explaining WHY this option won — not just what it is, but why it's the right call given the project's constraints, timeline, and goals]

**What would change this decision:** [Under what circumstances would we revisit this — e.g., "If we exceed 10k concurrent users, we'd need to move from SQLite to PostgreSQL"]

**Dissenting view:** [If another agent or review suggested a different approach, note it here — e.g., "architect-reviewer preferred Option B for long-term scalability, but we chose A for sprint 1 velocity"]

---
```

---

## 13. Design Critique Log

**Path:** `.pdlc/sprints/sprint-N/design-critiques.md`
**Created:** During TESTING/REVIEW phases when code-reviewer or architect-reviewer provides feedback

Real teams don't just pass artifacts forward — they push back. The design critique log captures the back-and-forth between agents: reviewer challenges, developer responses, and resolutions.

```markdown
# Sprint N Design Critiques

## Critique #1: [Topic]

**Raised by:** [code-reviewer / architect-reviewer / security-auditor]
**About:** [Story S-N-XX / component / architecture decision]
**Severity:** Critical / Major / Minor / Suggestion

**Issue:**
[What the reviewer flagged — e.g., "The auth middleware stores tokens in localStorage, which is vulnerable to XSS"]

**Original author's reasoning:**
[Why the developer agent made this choice — e.g., "Used localStorage for simplicity in sprint 1, planned to migrate to httpOnly cookies"]

**Resolution:**
[What was actually done — e.g., "Migrated to httpOnly cookies in this sprint. Added CSRF protection."]

**Status:** Resolved / Deferred to Sprint N+1 / Won't Fix (with justification)

---
```

---

## 14. Tech Debt Register

**Path:** `.pdlc/retrospective/tech-debt.md`
**Created:** After first sprint, maintained throughout project

Every shortcut, TODO, and "we'll fix this later" gets tracked here. The IMPROVE phase reviews this register and schedules paydown stories.

```markdown
# Tech Debt Register

## Active Debt

| ID | Description | Introduced | Sprint | Severity | Estimated Paydown | Owner |
|----|-------------|-----------|--------|----------|-------------------|-------|
| TD-001 | Hardcoded rate limits | Sprint 1 | S-1-03 | Medium | 2 points | backend-developer |
| TD-002 | No input validation on /api/upload | Sprint 1 | S-1-02 | High | 3 points | security-auditor |
| TD-003 | Duplicate CSS in auth and dashboard | Sprint 2 | S-2-01 | Low | 1 point | frontend-developer |

## Resolved Debt

| ID | Description | Introduced | Resolved | Resolution |
|----|-------------|-----------|----------|------------|
| TD-000 | Missing error boundaries | Sprint 1 | Sprint 2 | Added React ErrorBoundary wrapper |

## Debt Trend
- Sprint 1: +3 items introduced, 0 resolved (net: +3)
- Sprint 2: +2 items introduced, 1 resolved (net: +1, total: 4)

## Paydown Policy
- Each sprint reserves 20% of capacity for tech debt paydown
- High severity debt must be resolved within 2 sprints of introduction
- Critical severity debt blocks the current sprint until resolved
```

---

## 15. Sprint Confidence Score

**Path:** Included in `.pdlc/sprints/sprint-N/results.md` (added to Metrics section)
**Also aggregated in:** `.pdlc/dashboard.md`

A composite score (0-100) that reflects how "healthy" the sprint execution was. Low confidence = things went wrong, even if stories technically completed.

```markdown
## Sprint Confidence Score: XX/100

| Factor | Weight | Score | Notes |
|--------|--------|-------|-------|
| First-attempt success rate | 25% | XX/25 | [X of Y agents succeeded without retry] |
| Stories completed vs planned | 25% | XX/25 | [X of Y stories done] |
| Zero critical issues | 20% | XX/20 | [0 critical = full marks, else deduct] |
| No agent tier escalations | 15% | XX/15 | [Full marks if no sonnet→opus swaps needed] |
| Estimation accuracy | 15% | XX/15 | [Planned points vs actual within 20% = full] |

**Interpretation:**
- 90-100: Excellent — team is firing on all cylinders
- 70-89: Good — minor friction, trending well
- 50-69: Concerning — significant issues, review needed
- Below 50: Red flag — major process problems, consider re-planning
```

---

## 16. User Feedback Simulation

**Path:** `.pdlc/sprints/sprint-N/user-feedback.md`
**Created:** During REVIEW phase, after sprint demo

Real products get user testing. The orchestrator uses the user personas created in PLANNING to simulate how target users would react to the sprint deliverables. This feeds back into the next sprint's priorities.

```markdown
# Sprint N — Simulated User Feedback

**Based on personas from:** .pdlc/architecture/user-personas.md

## Persona: [Persona Name] — [Role/Description]

**Scenario tested:** [What user journey was simulated]

### Positive Reactions
- [What this persona would appreciate — e.g., "The onboarding flow is quick, only 2 steps"]

### Friction Points
- [What would frustrate them — e.g., "No way to skip the tutorial, feels forced"]
- [What's confusing — e.g., "The dashboard has too many metrics for a first-time user"]

### Feature Requests
- [What they'd ask for next — e.g., "I want to export my data as CSV"]

### Usability Score: X/10

---

## Persona: [Another Persona]
[Same structure]

---

## Aggregated Insights
- **Top friction point across personas:** [Most common issue]
- **Most requested feature:** [What to prioritize next]
- **Suggested sprint N+1 stories based on feedback:**
  - [ ] [Story idea from user feedback]
  - [ ] [Story idea from user feedback]
```

---

## 17. Spike / Prototype Notes

**Path:** `.pdlc/sprints/sprint-N/spikes.md`
**Created:** When a sprint includes exploratory/uncertain stories

Real teams don't jump into building risky features blind. Spikes are time-boxed investigations to reduce uncertainty before committing to full implementation.

```markdown
# Sprint N Spikes

## Spike: [Topic] — Time-boxed to [X hours/points]

**Question to answer:** [What are we trying to learn? — e.g., "Can we integrate Stripe Connect for marketplace payouts?"]

**Investigated by:** [agent-name]

### Findings
- [Finding 1: e.g., "Stripe Connect requires a Platform account, not a Standard one"]
- [Finding 2: e.g., "Express onboarding takes 5 min, Custom takes weeks"]
- [Finding 3: e.g., "Payout scheduling has a 2-day delay minimum"]

### Prototype Built
- [What was built — e.g., "Minimal Stripe Connect flow in /spikes/stripe-connect/"]
- [What it proved — e.g., "Express onboarding works, but needs webhook handling for account updates"]

### Recommendation
[Go / No-Go / Pivot — e.g., "GO with Express Connect. Add webhook handling story to Sprint N+1"]

### Risk Reduction
- **Before spike:** [High uncertainty — "we don't know if Stripe supports our use case"]
- **After spike:** [Low uncertainty — "confirmed feasible, clear implementation path"]

---
```

---

## 22. Product Roadmap

**Path:** `.pdlc/architecture/roadmap.md`
**Created:** During PLANNING phase (step 5)
**Updated:** During REVIEW phase (step 5), after each sprint

```markdown
# Product Roadmap

**Project:** [Project Name]
**Last Updated:** YYYY-MM-DD
**Format:** Now/Next/Later
**Prioritization Method:** RICE (Reach, Impact, Confidence, Effort)

## Strategic Vision
[2-3 sentences describing where this product is headed]

## Capacity Allocation
- **70% Features** -- new user-facing functionality
- **20% Tech Health** -- tech debt paydown, infrastructure, performance
- **10% Buffer** -- unplanned work, spikes, emergencies

## Now (Current Sprint: Sprint N)

| Item | Type | Priority | RICE Score | Sprint(s) | Owner | Status |
|------|------|----------|------------|-----------|-------|--------|
| [Feature/Task] | Feature/Tech Health | P0 | XX | N | [agent/PM] | In Progress / Done |

## Next (Sprint N+1 to N+2)

| Item | Type | Priority | RICE Score | Est. Sprint(s) | Dependencies | Risk |
|------|------|----------|------------|-----------------|-------------|------|
| [Feature] | Feature | P1 | XX | N+1 | [dep] | Low/Med/High |

## Later (Sprint N+3+)

| Item | Type | Priority | Notes |
|------|------|----------|-------|
| [Feature] | Feature | P2 | [Why deferred] |

## Completed

| Item | Completed Sprint | Outcome |
|------|-----------------|---------|
| [Feature] | Sprint N | [Brief result] |

## Dependency Map

| Item | Depends On | Blocks |
|------|-----------|--------|
| [Item A] | [Item B] | [Item C, Item D] |

## Risk Register

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|-----------|--------|------------|-------|
| [Risk] | High/Med/Low | High/Med/Low | [Strategy] | [agent/PM] |

## Roadmap Change Log

| Date | Change | Reason |
|------|--------|--------|
| YYYY-MM-DD | [What changed] | [Why] |

## Notes
- Roadmap is a communication tool, not a project plan
- Items in "Later" are aspirational and may change
- Review and update after every sprint during the REVIEW phase
- Use /roadmap-update skill for structured updates
```

---

## Directory Structure Created at Runtime

When the PDLC orchestrator initializes a new project, it creates this directory tree:

```
.pdlc/
├── config.json
├── dashboard.md
├── research/
│   ├── trend-scan-YYYY-MM-DD.md
│   ├── market-analysis-YYYY-MM-DD.md
│   ├── competitive-landscape-YYYY-MM-DD.md
│   └── project-selection.md
├── architecture/
│   ├── product-vision.md
│   ├── requirements.md
│   ├── user-personas.md
│   ├── project-plan.md
│   ├── sprint-structure.md
│   ├── product-spec.md
│   ├── system-design.md
│   ├── api-spec.md
│   ├── data-model.md
│   ├── security-design.md
│   ├── tech-stack-decision.md
│   ├── decision-journal.md
│   ├── roadmap.md
│   ├── designs/                              (Stitch-generated UI designs)
│   └── adr/
│       └── 001-initial-architecture-review.md
├── sprints/
│   └── sprint-N/
│       ├── plan.md
│       ├── results.md                        (includes confidence score)
│       ├── agent-log.md                      (includes contribution details)
│       ├── design-critiques.md               (reviewer pushback + resolutions)
│       ├── user-feedback.md                  (simulated persona reactions)
│       ├── spikes.md                         (if exploratory stories exist)
│       └── meetings/
│           ├── sprint-planning.md            (Monday: story negotiation + commitments)
│           ├── standups.md                   (Daily: conversational progress updates)
│           ├── sprint-review.md              (Friday: demos + user feedback + metrics)
│           └── sprint-retro.md              (Friday: reflections + action items)
└── retrospective/
    ├── self-improvement-log.md
    ├── agent-performance.json
    ├── recommendations.md
    ├── tech-debt.md                          (cumulative debt register)
    └── coaching/                             (1:1 meeting outputs)
        ├── react-specialist.md               (cumulative coaching profile)
        ├── backend-developer.md              (cumulative coaching profile)
        └── [agent-name].md                   (one per agent that had a 1:1)
```

Directories are created lazily — only when the phase that produces their contents is reached.
