---
name: standup-meeting
description: "Facilitate effective daily standup meetings to keep the team synchronized. Use PROACTIVELY when conducting daily standups, checking team progress, surfacing blockers, or running quick team sync meetings. Trigger on phrases like 'standup', 'daily standup', 'morning sync', 'team sync', 'daily scrum', 'what's everyone working on', 'blockers', 'daily meeting', 'status update', 'what did you do yesterday', or any request for a brief team synchronization meeting."
---

# Standup Meeting

Facilitate effective daily standup meetings to keep the team synchronized, surface blockers quickly, and maintain sprint momentum.

## When to Use This Skill

- **Daily sync**: Regular team synchronization during a sprint
- **Blocker surfacing**: When blockers need to be identified and escalated
- **Progress tracking**: Quick pulse check on sprint progress
- **Team coordination**: Ensuring parallel work streams don't conflict

## Instructions

### Choose a Format

| Format | Best For | Duration |
|--------|----------|----------|
| 3-Question | Standard daily standups | 15 minutes |
| Walking-the-Board | When sprint has many blocked items | 15 minutes |
| Async | Distributed teams, low-ceremony sprints | Async (within 2 hours) |

### Format 1: 3-Question Standup (Default)

Each team member answers three questions:

```markdown
## Daily Standup - [Date]

**Time**: [Start] - [End] (15 min max)
**Facilitator**: [Scrum Master]
**Participants**: [List]

### [Agent/Member Name]
**Yesterday (Done)**:
- Completed [task/story]
- Reviewed [PR/document]

**Today (Plan)**:
- Working on [story ID] - [description]
- Starting [next task]

**Blockers**:
- [Blocker description] -- needs [who] to resolve
- None

---

### [Next Agent/Member]
...

### Blocker Summary
| Blocker | Reported By | Owner | Deadline |
|---------|------------|-------|----------|
| [Description] | [Who] | [Resolver] | [By when] |

### Action Items
- [ ] [Action from standup] (Owner)

### Parking Lot (discuss offline)
- [Topic that needs >2 min discussion] -> schedule with [participants]
```

### Format 2: Walking-the-Board

Walk through the sprint board from right to left (closest to done first):

```markdown
## Walking-the-Board Standup - [Date]

### Done (moved since yesterday)
| Story | Completed By | Notes |
|-------|-------------|-------|
| S-N-01 | [Agent] | Merged, tests passing |

### In Review
| Story | Author | Reviewer | Status |
|-------|--------|----------|--------|
| S-N-03 | [Agent] | [Reviewer] | Awaiting review since [date] |

### In Progress
| Story | Assigned | Progress | ETA |
|-------|----------|----------|-----|
| S-N-04 | [Agent] | 60% | Tomorrow |

### Blocked
| Story | Assigned | Blocker | Owner | Since |
|-------|----------|---------|-------|-------|
| S-N-05 | [Agent] | [What's blocking] | [Resolver] | [Date] |

### Not Started
| Story | Assigned | Planned Start |
|-------|----------|--------------|
| S-N-06 | [Agent] | After S-N-04 |

### Sprint Progress
- **Points completed**: [N]/[Total] ([%])
- **Days remaining**: [N]
- **On track**: Yes/At Risk/Behind
```

### Format 3: Async Standup

For distributed teams or low-ceremony sprints:

```markdown
## Async Standup - [Date]

**Deadline**: Post by [time]

### Updates
| Member | Done | Doing | Blockers |
|--------|------|-------|----------|
| [Agent] | [Brief] | [Brief] | None |
| [Agent] | [Brief] | [Brief] | [Blocker] |

### Blockers Requiring Action
- [Blocker] -> @[Owner] please resolve by [time]
```

## Output Format

All standup outputs follow the markdown templates above. The primary deliverable is the standup transcript appended to the sprint's standup log.

**File path**: `.pdlc/sprints/sprint-N/meetings/standups.md` (appended daily)

## Constraints

### Required Rules (MUST)

1. **Time-box**: 15 minutes maximum, no exceptions
2. **Consistent timing**: Same time every day
3. **Full participation**: Every active team member reports
4. **Blocker accountability**: Every blocker gets an owner and a deadline

### Prohibited (MUST NOT)

1. **Problem-solving**: Do NOT solve problems during standup -- surface them, schedule offline discussion
2. **Status reporting**: This is team sync, NOT a management status report
3. **Late starts**: Start on time regardless of attendance
4. **Long updates**: Each person gets 1-2 minutes maximum
5. **Side conversations**: Use the parking lot for off-topic items

## Best Practices

1. **Stand up**: Actually stand (or keep it brief) to enforce time-boxing
2. **View the board**: Conduct while looking at the sprint board
3. **Parking lot**: Immediately park any topic that needs >2 minutes
4. **Rotate facilitator**: Let team members take turns running the standup
5. **Track patterns**: If the same blocker appears 2+ days, escalate immediately
6. **Celebrate completions**: Acknowledge finished work to maintain momentum
