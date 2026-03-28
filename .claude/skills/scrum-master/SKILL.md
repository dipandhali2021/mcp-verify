---
name: scrum-master
description: "Agile Scrum Master for sprint management, user story creation, velocity tracking, and sprint iteration planning. Use PROACTIVELY when users need sprint planning, story decomposition, velocity reports, sprint status tracking, backlog refinement, or any Scrum ceremony facilitation. Trigger on phrases like 'sprint planning', 'create story', 'user story', 'sprint status', 'velocity', 'backlog', 'sprint iteration', 'story points', 'acceptance criteria', 'definition of done', 'sprint goal', or any request related to Scrum methodology and sprint management."
---

# Scrum Master

Facilitate Scrum ceremonies, create well-structured user stories, manage sprint iterations, and track team velocity using proven Agile methodologies.

## When to Use This Skill

- **Sprint Planning**: Creating sprint iterations from the product backlog
- **Story Creation**: Writing detailed user stories with acceptance criteria
- **Sprint Tracking**: Monitoring sprint progress and velocity
- **Backlog Refinement**: Sizing and prioritizing backlog items
- **Velocity Analysis**: Historical velocity reports and forecasting

## Sub-Commands

| Command | Action |
|---------|--------|
| `/scrum-master plan` | Create a sprint iteration from backlog items |
| `/scrum-master story` | Author a detailed user story with acceptance criteria |
| `/scrum-master status` | Show current sprint metrics and progress |
| `/scrum-master velocity` | Generate velocity analysis and trend report |

## Instructions

### Step 1: Sprint Iteration Planning

**Project Level Sizing:**

| Level | Stories/Sprint | Characteristics |
|-------|---------------|-----------------|
| Level 0 | 1 story | Single task, no sprint structure needed |
| Level 1 | 1-10 stories | Small project, simple sprint |
| Level 2 | 5-15 stories | Grouped by epic, velocity tracking starts |
| Level 3 | 12-20 stories | Full velocity tracking, capacity planning |
| Level 4 | 20+ stories | Multi-team, cross-sprint dependencies |

**Sprint Planning Process:**
1. Review product backlog with Product Owner
2. Determine sprint capacity (velocity-based)
3. Select stories by priority (P0 first, then P1, then P2)
4. Validate story sizing -- all stories must be "Small Batches" (1-3 day completable)
5. Identify dependencies between stories
6. Confirm sprint goal with the team
7. Lock the sprint backlog

### Step 2: User Story Creation

**Story Format:**
```markdown
## Story: [ID] - [Title]

**As a** [user role],
**I want** [capability/feature],
**So that** [business value/benefit].

### Acceptance Criteria
- [ ] Given [precondition], when [action], then [result]
- [ ] Given [precondition], when [action], then [result]
- [ ] Given [precondition], when [action], then [result]

### Details
- **Priority**: P0/P1/P2
- **Story Points**: [Fibonacci: 1, 2, 3, 5, 8, 13]
- **Sprint**: [N]
- **Assigned To**: [agent/team member]
- **Epic**: [parent epic]

### Technical Notes
- [Implementation considerations]
- [API endpoints affected]
- [Database changes needed]

### Dependencies
- Blocked by: [Story ID]
- Blocks: [Story ID]

### Definition of Done
- [ ] Code complete and committed
- [ ] Unit tests written and passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Acceptance criteria verified
```

**Five Critical Standards for Stories:**
1. **Small Batches**: Every story must be completable in 1-3 days
2. **User Value**: Each story delivers measurable value to users
3. **Testable**: Acceptance criteria are specific and verifiable
4. **Independent**: Stories can be completed without waiting on other stories (minimize dependencies)
5. **Appropriately Sized**: Use Fibonacci scale, split anything 13+ points

### Step 3: Velocity Tracking

**Velocity Report Template:**
```markdown
## Velocity Report

### Sprint History
| Sprint | Committed | Completed | Velocity | Accuracy |
|--------|-----------|-----------|----------|----------|
| Sprint 1 | 20 pts | 18 pts | 18 | 90% |
| Sprint 2 | 22 pts | 20 pts | 20 | 91% |
| Sprint 3 | 20 pts | 21 pts | 21 | 105% |

### Trends
- **Average Velocity**: [N] points/sprint
- **Velocity Trend**: Increasing/Stable/Decreasing
- **Recommended Next Sprint Capacity**: [N] points (based on 3-sprint average)
- **Accuracy Trend**: [%] (committed vs completed)

### Observations
- [Pattern or insight from velocity data]
- [Recommendation for next sprint]
```

### Step 4: Sprint Status Dashboard

```markdown
## Sprint [N] Status

**Sprint Goal**: [Goal statement]
**Duration**: [Start] to [End]
**Day**: [X] of [Y]

### Progress
- **Stories**: [Completed]/[Total] ([%])
- **Points**: [Completed]/[Committed] ([%])
- **Blockers**: [N] active

### Story Status
| ID | Story | Points | Status | Assigned |
|----|-------|--------|--------|----------|
| S-N-01 | [Title] | 3 | Done | [Agent] |
| S-N-02 | [Title] | 5 | In Progress | [Agent] |
| S-N-03 | [Title] | 2 | Blocked | [Agent] |

### Blockers
| Story | Blocker | Owner | Since |
|-------|---------|-------|-------|
| S-N-03 | [Description] | [Who can resolve] | [Date] |

### Burndown
- Day 1: [N] points remaining
- Day 2: [N] points remaining
- ...
```

## Output Format

Sprint plans, stories, velocity reports, and status dashboards are all written in markdown format as shown in the templates above.

## Constraints

### Required Rules (MUST)

1. **Fibonacci estimation**: Use only 1, 2, 3, 5, 8, 13 for story points
2. **Small Batches**: All stories must be completable in 1-3 days
3. **Velocity-based planning**: Never commit more than the 3-sprint average velocity
4. **Definition of Done**: Every story must have explicit DoD criteria
5. **Sprint goal**: Every sprint must have a single, clear goal statement

### Prohibited (MUST NOT)

1. **Scope creep**: Never add stories to an active sprint without removing equal points
2. **Incomplete stories**: Never mark a story done if acceptance criteria aren't met
3. **Skip retrospective**: Every sprint must end with a retrospective
4. **Ignore velocity**: Never plan beyond team capacity

## Best Practices

1. **Protect the team**: Shield from external interruptions during sprint
2. **Remove blockers fast**: Escalate blockers within 24 hours
3. **Transparency**: Make all sprint artifacts visible to stakeholders
4. **Continuous improvement**: Apply retro action items in the next sprint
5. **Sustainable pace**: Plan at 70-80% capacity to absorb unknowns
