---
name: sprint-planning
description: "Break down epics into sprint-sized tasks with capacity planning, backlog prioritization, dependency mapping, and risk analysis. Use PROACTIVELY when users need to plan a sprint, break down work into tasks, estimate team capacity, prioritize a backlog, identify dependencies, or assess risks for upcoming work. Trigger on phrases like 'plan the sprint', 'sprint planning', 'break down this epic', 'capacity planning', 'what fits in the sprint', 'prioritize backlog', 'sprint scope', 'next sprint', or any request to organize development work into sprint iterations."
---

# Sprint Planning

Break down epics into sprint-sized tasks with capacity planning, backlog prioritization, dependency mapping, and risk analysis.

## When to Use This Skill

- **Sprint kickoff**: Planning the next sprint's scope and goals
- **Epic breakdown**: Decomposing large features into sprint-sized stories
- **Capacity planning**: Determining how much work fits in a sprint
- **Backlog prioritization**: Ordering items by business value and urgency
- **Risk assessment**: Identifying risks before committing to sprint scope

## Instructions

### Step 1: Assess Capacity

Calculate the team's available capacity for the sprint:

```markdown
## Sprint Capacity

### Team Members
| Member | Role | Available Days | Capacity (%) | Effective Days |
|--------|------|---------------|--------------|----------------|
| [Name/Agent] | [Role] | [N] | [70-80%] | [N * 0.7-0.8] |

### Total Sprint Capacity
- **Raw capacity**: [Sum of available days]
- **Effective capacity** (at 70-80%): [Adjusted total]
- **In story points** (based on velocity): [N] points

### Capacity Notes
- Plan at **70-80% utilization** to accommodate interruptions, meetings, and unknowns
- Reserve 10% buffer for unplanned urgent work
- Account for PTO, holidays, and recurring meetings
```

### Step 2: Prioritize the Backlog

Use a tiered priority system:

```markdown
## Backlog Prioritization

### P0 - Must Have (Sprint Goal)
These items define the sprint goal. If these aren't completed, the sprint fails.
| Item | Points | Justification |
|------|--------|---------------|
| [Story] | [N] | [Why P0] |

### P1 - Should Have (Expected)
Important items expected to be completed if sprint goes well.
| Item | Points | Justification |
|------|--------|---------------|
| [Story] | [N] | [Why P1] |

### P2 - Stretch (Nice to Have)
Items to pull in if capacity allows. Explicitly marked as stretch goals.
| Item | Points | Justification |
|------|--------|---------------|
| [Story] | [N] | [Why P2] |

### Total
- **P0 committed**: [N] points
- **P1 expected**: [N] points
- **P2 stretch**: [N] points
- **Sprint capacity**: [N] points
- **P0 + P1 vs capacity**: [N]/[N] ([%])
```

**Rule**: P0 + P1 should not exceed 80% of sprint capacity. P2 items fill the remaining buffer.

### Step 3: Map Dependencies

```markdown
## Dependency Map

### Sequential Dependencies (must be done in order)
| Story | Depends On | Reason |
|-------|-----------|--------|
| [B] | [A] | [B uses API that A creates] |

### External Dependencies (outside the team)
| Story | External Dependency | Risk | Mitigation |
|-------|-------------------|------|------------|
| [Story] | [External team/service] | [High/Med/Low] | [Plan B] |

### Parallel Tracks (can be done simultaneously)
- Track 1: [Story A] -> [Story B] -> [Story C]
- Track 2: [Story D] -> [Story E]
- Track 3: [Story F] (independent)
```

### Step 4: Assess Risks

```markdown
## Risk Analysis

| Risk | Likelihood | Impact | Mitigation | Contingency |
|------|-----------|--------|------------|-------------|
| [Description] | High/Med/Low | High/Med/Low | [Proactive action] | [If it happens] |

### Risk Score
- **Overall sprint risk**: Low/Medium/High
- **Confidence in commitment**: [%]
- **Biggest risk factor**: [Description]
```

### Step 5: Finalize Sprint Plan

```markdown
## Sprint [N] Plan

### Sprint Goal
[Single, clear statement of what this sprint achieves]

### Commitment
- **Stories**: [N] stories, [N] points
- **Capacity**: [N] points available
- **Utilization**: [%]

### Sprint Backlog
| ID | Story | Points | Priority | Assigned | Dependencies |
|----|-------|--------|----------|----------|-------------|
| S-N-01 | [Title] | [N] | P0 | [Agent] | None |
| S-N-02 | [Title] | [N] | P0 | [Agent] | S-N-01 |

### Success Criteria
- [ ] Sprint goal achieved
- [ ] All P0 items completed
- [ ] Test coverage maintained at [N]%
- [ ] No critical bugs introduced

### Historical Context
- **Previous sprint velocity**: [N] points
- **3-sprint average**: [N] points
- **Previous commitment accuracy**: [%]
- **Why previous commitments failed** (if applicable): [Honest assessment]
```

## Output Format

All outputs are markdown documents following the templates above. The sprint plan document is the primary deliverable.

## Constraints

### Required Rules (MUST)

1. **Capacity-based**: Never commit more than 80% of calculated capacity
2. **Single sprint goal**: One clear, achievable objective per sprint
3. **Stretch items explicit**: P2 items must be clearly marked as stretch
4. **Dependencies visible**: All dependencies mapped before commitment
5. **Historical honesty**: Reference and learn from previous sprint outcomes

### Prohibited (MUST NOT)

1. **Over-commit**: Don't plan at 100% capacity
2. **Hidden dependencies**: Don't ignore external dependencies
3. **Vague goals**: Don't accept ambiguous sprint goals
4. **Skip risk assessment**: Don't commit without understanding risks

## Best Practices

1. **Singular sprint objective**: Keep the goal focused
2. **Designate stretch items**: Explicitly mark P2 as optional
3. **Honest post-mortem**: Assess why previous commitments succeeded or failed
4. **Reserve buffer**: 10% for unplanned work, always
5. **Dependency-first**: Schedule dependent items early in the sprint
