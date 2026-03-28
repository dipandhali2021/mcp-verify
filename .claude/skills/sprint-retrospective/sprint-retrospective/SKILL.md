---
name: sprint-retrospective
description: "Facilitate effective sprint retrospectives for continuous team improvement. Use PROACTIVELY when conducting team retrospectives, reviewing sprint outcomes, identifying process improvements, or fostering team collaboration after a sprint. Trigger on phrases like 'retrospective', 'retro', 'sprint review', 'what went well', 'lessons learned', 'team improvement', 'start stop continue', 'mad sad glad', 'sprint reflection', or any request to review and improve team processes after a development cycle."
---

# Sprint Retrospective

Facilitate effective sprint retrospectives for continuous team improvement using proven formats, structured action items, and facilitation best practices.

## When to Use This Skill

- **End of Sprint**: Conduct a retrospective at the close of each sprint
- **Project Milestone**: Reflect after major releases or deliverables
- **Team Issues**: When an immediate process review is needed
- **Continuous Improvement**: Regular cadence of team reflection

## Instructions

### Step 1: Choose a Format

Select the retrospective format based on team maturity and current needs:

| Format | Best For | When to Use |
|--------|----------|-------------|
| Start-Stop-Continue | New teams, simple structure | Sprints 1-2, or when the team needs clarity |
| Mad-Sad-Glad | Surfacing emotions, morale issues | When confidence is low (<60) or tension exists |
| 4Ls | Mature teams, deeper reflection | Sprint 3+, teams comfortable with retros |

### Step 2: Start-Stop-Continue Format

```markdown
## Retrospective: Start-Stop-Continue

### START (New practices to adopt)
- [Practice to begin doing]
- [New tool/process to try]
- [Habit to develop]

### STOP (Behaviors to eliminate)
- [Practice that's hurting the team]
- [Wasteful activity]
- [Counter-productive habit]

### CONTINUE (Successes to maintain)
- [What's working well]
- [Good habit to keep]
- [Effective process]

### Action Items
1. [ ] [Specific action] (Owner, ~due date)
2. [ ] [Specific action] (Owner, ~due date)
3. [ ] [Specific action] (Owner, ~due date)
```

### Step 3: Mad-Sad-Glad Format

```markdown
## Retrospective: Mad-Sad-Glad

### MAD (Frustrations)
- [What caused anger or significant frustration]
- [Blockers that shouldn't have existed]
- [Repeated problems]

### SAD (Disappointments)
- [What we wished went better]
- [Missed opportunities]
- [Things that fell short]

### GLAD (Celebrations)
- [What made us happy]
- [Achievements to celebrate]
- [Positive surprises]

### Action Items
- [ ] [Action to address a MAD item] (Owner, ~due date)
- [ ] [Action to address a SAD item] (Owner, ~due date)
- [ ] [Continue/amplify a GLAD item] (Owner, ~due date)
```

### Step 4: 4Ls Format (Liked-Learned-Lacked-Longed For)

```markdown
## Retrospective: 4Ls

### LIKED (What we enjoyed)
- [Positive experience]
- [Good collaboration moment]

### LEARNED (New knowledge gained)
- [Technical lesson]
- [Process insight]

### LACKED (What was missing)
- [Resource gap]
- [Missing tool or process]

### LONGED FOR (What we wish we had)
- [Desired improvement]
- [Aspirational change]

### Action Items
- [ ] [Address a LACKED item] (Owner, ~due date)
- [ ] [Work toward a LONGED FOR item] (Owner, ~due date)
```

## Output Format

### Retrospective Document Template

```markdown
# Sprint [N] Retrospective

**Date**: YYYY-MM-DD
**Participants**: [List of team members]
**Facilitator**: [Name]
**Format**: [Start-Stop-Continue / Mad-Sad-Glad / 4Ls]

## What Went Well
- [Success 1]
- [Success 2]
- [Success 3]

## What Didn't Go Well
- [Issue 1]
- [Issue 2]
- [Issue 3]

## Action Items
| # | Action | Owner | Due Date | Status |
|---|--------|-------|----------|--------|
| 1 | [Specific, actionable item] | [Person] | [Date] | Open |
| 2 | [Specific, actionable item] | [Person] | [Date] | Open |
| 3 | [Specific, actionable item] | [Person] | [Date] | Open |

## Key Metrics
- **Velocity**: [N] points
- **Sprint Goal Achievement**: [%]
- **Bugs Found**: [N]
- **Stories Completed**: [N] of [M]

## Follow-up from Previous Retro
| Action | Status | Notes |
|--------|--------|-------|
| [Previous action 1] | Done/In Progress/Not Started | [Update] |
| [Previous action 2] | Done/In Progress/Not Started | [Update] |

## Notes
- [Additional observations or decisions]
```

## Constraints

### Required Rules (MUST)

1. **Safe Space**: Maintain a blame-free environment -- critique processes, not people
2. **Actionable Items**: Every action item must be specific, assigned to an owner, and have a deadline
3. **Follow-up**: Review previous retro action items at the start of each new retro
4. **Participation**: Ensure every team member has a chance to contribute

### Prohibited (MUST NOT)

1. **Personal attacks**: Improve the process, never blame individuals
2. **Too many actions**: Limit to 2-3 action items per session (prevents overload and ensures follow-through)
3. **Skip celebrations**: Always acknowledge what went well before diving into problems
4. **Problem-solving in retro**: Surface issues; solve them in dedicated follow-up sessions

## Best Practices

1. **Time-box**: Keep within 1 hour maximum
2. **Rotate Facilitator**: Team members take turns facilitating for fresh perspectives
3. **Celebrate Wins**: Start with successes to set a positive tone
4. **Track Trends**: Compare metrics across sprints to spot patterns
5. **Anonymous Input**: Allow anonymous submissions for sensitive topics
6. **Vary Formats**: Rotate between formats to prevent retro fatigue
