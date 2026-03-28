---
name: task-estimation
description: "Estimate software development tasks accurately using story points, t-shirt sizing, planning poker, and risk-adjusted estimation. Use PROACTIVELY when planning sprints, estimating backlog items, sizing roadmap work, conducting planning poker sessions, or any time task complexity and effort need to be quantified. Trigger on phrases like 'estimate this', 'how many points', 'story points', 'size this task', 'planning poker', 't-shirt sizing', 'how long will this take', 'sprint capacity', or any request involving effort estimation for software tasks."
---

# Task Estimation

Estimate software development tasks accurately using various techniques including story points, t-shirt sizing, planning poker, and risk-adjusted estimation.

## When to Use This Skill

- **Sprint Planning**: Deciding which tasks to include in a sprint based on capacity
- **Roadmap Creation**: Long-term planning with effort estimates
- **Resource Planning**: Team sizing and timeline estimation
- **Backlog Grooming**: Sizing new stories before they enter a sprint

## Instructions

### Step 1: Story Points (Relative Estimation)

**Fibonacci Sequence**: 1, 2, 3, 5, 8, 13, 21

```markdown
## Story Point Reference Scale

### 1 Point (Very Small)
- Example: Text change, constant value update
- Time: 1-2 hours
- Complexity: Very low
- Risk: None

### 2 Points (Small)
- Example: Simple bug fix, add logging
- Time: 2-4 hours
- Complexity: Low
- Risk: Low

### 3 Points (Medium)
- Example: Simple CRUD API endpoint
- Time: 4-8 hours
- Complexity: Medium
- Risk: Low

### 5 Points (Medium-Large)
- Example: Complex form implementation, auth middleware
- Time: 1-2 days
- Complexity: Medium
- Risk: Medium

### 8 Points (Large)
- Example: New feature (frontend + backend)
- Time: 2-3 days
- Complexity: High
- Risk: Medium

### 13 Points (Very Large)
- Example: Payment system integration
- Time: 1 week
- Complexity: Very high
- Risk: High
- **Recommendation**: Split into smaller tasks

### 21+ Points (Epic)
- **Required**: MUST be split into smaller stories
```

### Step 2: Planning Poker

**Process**:
1. Product Owner describes the story
2. Team members ask clarifying questions
3. Each person selects a card (1, 2, 3, 5, 8, 13)
4. All cards revealed simultaneously
5. Highest and lowest explain their reasoning
6. Re-vote after discussion
7. Reach consensus

**Example**:
```
Story: "User can upload a profile photo"

Team Member A: 3 points (frontend is simple)
Team Member B: 5 points (image resizing needed)
Team Member C: 8 points (S3 upload, security considerations)

Discussion:
- Image processing library available
- S3 already configured
- File size validation needed

Re-vote -> 5 points consensus
```

### Step 3: T-Shirt Sizing (Quick Estimation)

```markdown
## T-Shirt Sizes

- **XS**: 1-2 Story Points (under 1 hour)
- **S**: 2-3 Story Points (half day)
- **M**: 5 Story Points (1-2 days)
- **L**: 8 Story Points (1 week)
- **XL**: 13+ Story Points (must be split)

**When to use**:
- Initial backlog grooming
- Rough roadmap estimation
- Quick priority-setting sessions
```

### Step 4: Risk and Uncertainty Adjustment

**Estimation Adjustment Formula**:

```
Base Estimate x Risk Buffer x Uncertainty Buffer = Final Estimate

Risk Buffer:
  - Low risk: 1.0x
  - Medium risk: 1.3x
  - High risk: 1.5x

Uncertainty Buffer:
  - (1 + uncertainty percentage)
  - Where uncertainty is 0.0 to 1.0

Example:
  Base: 5 points, Medium risk, 20% uncertainty
  Final = 5 x 1.3 x 1.2 = 7.8 -> round to 8 points
```

## Output Format

### Estimation Document Template

```markdown
## Task: [Task Name]

### Description
[What needs to be done]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Estimation
- **Story Points**: [N]
- **T-Shirt Size**: [XS/S/M/L/XL]
- **Estimated Time**: [range]

### Breakdown
- [Sub-task 1]: [points]
- [Sub-task 2]: [points]
- [Sub-task 3]: [points]

### Risks
- [Risk 1] ([low/medium/high] risk)
- [Risk 2] ([low/medium/high] risk)

### Risk-Adjusted Estimate
- Base: [N] points
- Risk multiplier: [1.0/1.3/1.5]x
- Uncertainty: [0-100]%
- **Final**: [N] points

### Dependencies
- [What must be completed first]

### Notes
- [Additional context]
```

## Constraints

### Required Rules (MUST)

1. **Relative estimation**: Use relative complexity, not absolute time
2. **Team consensus**: Estimates are a team activity, not individual
3. **Historical data**: Reference past velocity for capacity planning
4. **Split large items**: Any story 13+ points MUST be broken down

### Prohibited (MUST NOT)

1. **Pressure individuals**: Estimates are NOT promises
2. **Over-precision**: Don't estimate to the hour for large items
3. **Estimates as deadlines**: Estimates are for planning, never commitments

## Best Practices

1. **Break Down**: Split large tasks into smaller pieces
2. **Reference Stories**: Compare against past similar work
3. **Include Buffer**: Account for unknowns and interruptions
4. **Re-estimate**: Update estimates as understanding improves
5. **Track Accuracy**: Compare estimates vs actuals to calibrate over time
