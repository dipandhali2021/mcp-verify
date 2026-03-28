---
name: roadmap-update
description: "Update, create, or reprioritize your product roadmap. Use PROACTIVELY when adding a new initiative and deciding what moves to make room, shifting priorities after new information, moving timelines due to dependency slips, building a Now/Next/Later view from scratch, or any roadmap operation. Trigger on phrases like 'update roadmap', 'add to roadmap', 'reprioritize', 'shift timeline', 'what comes off', 'roadmap change', 'new initiative', 'dependency slip', 'capacity planning', 'RICE score', 'MoSCoW', 'now next later', 'quarterly themes', or any request to modify, create, or communicate product roadmap changes."
argument-hint: "<update description>"
---

# Roadmap Update

Update, create, or reprioritize a product roadmap.

## Usage

```
/roadmap-update <description of what to change>
```

## Workflow

### 1. Understand Current State

Check if `.pdlc/architecture/roadmap.md` exists:
- If yes: read it to understand current items, priorities, and statuses
- If no: ask the user to describe their current roadmap or start fresh

Also check for sprint data:
- Read `.pdlc/config.json` for current sprint number and velocity
- Read recent sprint results for context on what's been delivered
- Read `.pdlc/sprints/sprint-N/results.md` for latest velocity and completion data

### 2. Determine the Operation

Based on user input, identify which operation to perform:

**Add item**: New feature, initiative, or work item
- Gather: name, description, priority, estimated effort, target timeframe, owner, dependencies
- Suggest where it fits based on current priorities and capacity
- **Always ask: "What comes off or moves to make room?"** -- roadmaps are zero-sum against capacity

**Update status**: Change status of existing items
- Options: Not Started, In Progress, At Risk, Blocked, Completed, Cut
- For "At Risk" or "Blocked": ask for the blocker and mitigation plan

**Reprioritize**: Change the order or priority of items
- Ask what changed (new information, strategy shift, resource change, customer feedback)
- Apply a prioritization framework (see below)
- Show before/after comparison

**Move timeline**: Shift dates for items
- Ask why (scope change, dependency slip, resource constraint)
- Identify downstream impacts on dependent items
- Flag items that move past hard deadlines

**Create new roadmap**: Build from scratch
- Ask about timeframe (quarter, half, year)
- Ask about format preference (Now/Next/Later, quarterly columns, OKR-aligned)
- Gather the list of initiatives to include

### 3. Generate Roadmap Summary

Produce a roadmap view with:

#### Status Overview
Quick summary: X items in progress, Y completed this period, Z at risk.

#### Roadmap Items
For each item show:
- Name and one-line description
- Status indicator: **On Track** / **At Risk** / **Blocked** / **Done** / **Not Started**
- Target timeframe or date
- Owner
- Key dependencies

Group items by timeframe (Now/Next/Later) or quarter, depending on format.

#### Risks and Dependencies
- Items that are blocked or at risk, with details
- Cross-team dependencies and their status
- Items approaching hard deadlines

#### Changes This Update
If updating an existing roadmap, summarize:
- Items added, removed, or reprioritized
- Timeline shifts
- Status changes

### 4. Follow Up

After generating the roadmap:
- Offer to format for a specific audience (executive summary, engineering detail, customer-facing)
- Offer to draft communication about roadmap changes
- Write updated roadmap to `.pdlc/architecture/roadmap.md`

---

## Roadmap Frameworks

### Now / Next / Later
The simplest and often most effective format:

- **Now** (current sprint/month): Committed work. High confidence in scope and timeline. Actively being built.
- **Next** (next 1-3 months): Planned work. Good confidence in what, less in exactly when. Scoped and prioritized but not started.
- **Later** (3-6+ months): Directional. Strategic bets and opportunities. Scope and timing are flexible.

**When to use:** Most teams, most of the time. Avoids false precision on dates.

### Quarterly Themes
Organize around 2-3 themes per quarter:

- Each theme = strategic area of investment (e.g., "Enterprise readiness", "Activation improvements")
- Under each theme, list specific initiatives
- Themes should map to team/company OKRs
- Makes it easy to explain WHY you're building what you're building

**When to use:** Strategic alignment. Planning meetings and executive communication.

### OKR-Aligned Roadmap
Map items directly to Objectives and Key Results:

- Start with the team's OKRs for the period
- Under each Key Result, list initiatives that move that metric
- Include expected impact per initiative
- Creates clear accountability between what you build and what you measure

**When to use:** Organizations that run on OKRs.

### Timeline / Gantt View
Calendar-based view with items on a timeline:

- Shows start dates, end dates, durations
- Visualizes parallelism and sequencing
- Good for identifying resource conflicts and dependencies

**When to use:** Execution planning with engineering. NOT for external communication (creates false precision).

---

## Prioritization Frameworks

### RICE Score
RICE = (Reach x Impact x Confidence) / Effort

| Dimension | How to Score |
|-----------|-------------|
| **Reach** | Users affected per time period (concrete number: 500 users/quarter) |
| **Impact** | Per-person impact: 3=massive, 2=high, 1=medium, 0.5=low, 0.25=minimal |
| **Confidence** | Certainty: 100%=data-backed, 80%=some evidence, 50%=gut feel |
| **Effort** | Person-months of work (all functions: eng, design, etc.) |

**When to use:** Quantitative, defensible prioritization for large backlogs.

### MoSCoW

| Category | Definition | Rule |
|----------|-----------|------|
| **Must Have** | Roadmap fails without these | Non-negotiable commitments |
| **Should Have** | Important, expected | Delivery viable without them |
| **Could Have** | Desirable, lower priority | Only if capacity allows |
| **Won't Have** | Explicitly excluded | Important to list for clarity |

**When to use:** Scoping a release or quarter. Forcing prioritization conversations.

### ICE Score
ICE = Impact x Confidence x Ease (each 1-10)

| Dimension | Scale |
|-----------|-------|
| **Impact** | 1-10: how much does this move the target metric? |
| **Confidence** | 1-10: how sure are we? |
| **Ease** | 1-10: how easy to implement? (inverse of effort) |

**When to use:** Quick prioritization. Good for early-stage products or limited data.

### Value vs Effort Matrix

| Quadrant | Value | Effort | Action |
|----------|-------|--------|--------|
| **Quick Wins** | High | Low | Do first |
| **Big Bets** | High | High | Plan carefully, worth investment |
| **Fill-ins** | Low | Low | Spare capacity only |
| **Money Pits** | Low | High | Do NOT do. Remove from backlog |

**When to use:** Visual prioritization in team planning sessions.

---

## Dependency Management

### Identifying Dependencies

| Type | Example |
|------|---------|
| **Technical** | Feature B requires infrastructure from Feature A |
| **Team** | Requires work from another team (design, platform, data) |
| **External** | Waiting on vendor, partner, or third-party |
| **Knowledge** | Need research results before starting |
| **Sequential** | Must ship A before starting B (shared code, user flow) |

### Managing Dependencies
- List all dependencies explicitly in the roadmap
- Assign an owner to each dependency
- Set a "need by" date
- Build buffer around dependencies -- they are the highest-risk items
- Flag cross-team dependencies early
- Have a contingency plan for slips

### Reducing Dependencies
- Can you build a simpler version that avoids the dependency?
- Can you parallelize with an interface contract or mock?
- Can you sequence differently to move the dependency earlier?
- Can you absorb the work to remove cross-team coordination?

---

## Capacity Planning

### Estimating Capacity
- Start with number of engineers x time period
- Subtract overhead: meetings, on-call, interviews, holidays, PTO
- Rule of thumb: 60-70% of time on planned feature work
- Factor in ramp time for new members

### Allocating Capacity

| Category | % | Purpose |
|----------|---|---------|
| **Features** | 70% | Roadmap items advancing strategic goals |
| **Tech Health** | 20% | Tech debt, reliability, performance, DX |
| **Unplanned** | 10% | Buffer for urgent issues and quick wins |

Adjust ratios based on context:
- New product: more features, less tech debt
- Mature product: more tech debt and reliability
- Post-incident: more reliability, fewer features
- Rapid growth: more scalability and performance

### Capacity vs Ambition
- If commitments exceed capacity, something must give
- Do NOT solve capacity problems by pretending people can do more -- cut scope
- When adding to the roadmap, always ask: "What comes off?"
- Better to commit to fewer things and deliver reliably

---

## Communicating Roadmap Changes

### When the Roadmap Changes
Common triggers:
- New strategic priority from leadership
- Customer feedback that changes priorities
- Technical discovery that changes estimates
- Dependency slip from another team
- Resource change (team grows/shrinks)
- Competitive move requiring response

### How to Communicate
1. **Acknowledge the change** -- be direct about what and why
2. **Explain the reason** -- what new information drove this?
3. **Show the tradeoff** -- what was deprioritized or slipped?
4. **Show the new plan** -- updated roadmap
5. **Acknowledge impact** -- who is affected and how?

### Avoiding Roadmap Whiplash
- Don't change for every new piece of information. Have a threshold.
- Batch updates at natural cadences (monthly, quarterly) unless truly urgent
- Distinguish "roadmap change" (strategic reprioritization) from "scope adjustment" (normal execution)
- Track change frequency. Frequent changes may signal unclear strategy.

## Constraints

### Required Rules (MUST)
1. **Zero-sum**: Adding work means deprioritizing something else
2. **Surface dependencies**: Map all dependencies explicitly
3. **Capacity-honest**: Flag when roadmap exceeds team capacity
4. **Change-documented**: Every change gets a reason in the change log
5. **Audience-appropriate**: Format for the reader (exec vs eng vs customer)

### Prohibited (MUST NOT)
1. **False precision**: Don't put exact dates on Later items
2. **Over-allocate**: Don't plan at 100% capacity
3. **Hidden changes**: Don't shift priorities without documenting why
4. **Ignore velocity**: Don't forecast without sprint data
