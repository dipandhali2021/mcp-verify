---
name: pdlc
description: "Autonomous Product Development Life Cycle orchestrator. Use PROACTIVELY when users want to start a new project, run development sprints, research trending projects, create product plans, review sprint results, or manage autonomous development workflows. Trigger on phrases like 'start pdlc', 'autonomous development', 'run sprint', 'research projects', 'create project', 'pdlc dashboard', 'build something trending', 'autonomous coding', 'start building', or any request for end-to-end autonomous software creation. Also trigger when user says 'next sprint', 'sprint review', 'what should I build', or 'project status'."
---

# PDLC — Autonomous Product Development Life Cycle

This skill orchestrates the full product development life cycle using 100+ specialized agents. It researches trending projects, plans products, designs architecture, develops in sprints, tests, deploys, reviews, and self-improves — all autonomously.

## Role Hierarchy

The PDLC operates with a three-tier role structure:
- **Manager** (pdlc-orchestrator) -- oversees the full lifecycle, delegates to PMs and engineers, conducts coaching
- **Product Manager** (product-manager agent) -- owns the backlog, prioritizes features, evaluates deliverables
- **Software Engineers** (all development/testing/infra agents) -- execute assigned stories using specialized skills

The Manager never writes code. The PM never makes architecture decisions. Engineers never self-assign work.

## Sub-Commands

Parse the user's input to determine which command to execute:

| User Says | Command | Phases Executed |
|-----------|---------|-----------------|
| `/pdlc` (no args) | **resume** | Continue from current state |
| `/pdlc research` | **research** | RESEARCH only |
| `/pdlc plan` | **plan** | PLANNING + DESIGN |
| `/pdlc sprint` | **sprint** | DEVELOPMENT + TESTING |
| `/pdlc deploy` | **deploy** | DEPLOYMENT |
| `/pdlc review` | **review** | REVIEW + IMPROVE |
| `/pdlc full-cycle` | **full-cycle** | All 8 phases end-to-end |
| `/pdlc dashboard` | **dashboard** | Regenerate and display dashboard |
| `/pdlc roadmap` | **roadmap** | PLANNING (create) or REVIEW (update) |
| `/pdlc status` | **status** | Show current state |

Also match natural language:
- "what should I build" / "find trending projects" → **research**
- "start a new project" / "build something" → **full-cycle**
- "next sprint" / "continue building" → **sprint**
- "how's the project going" / "show progress" → **status**
- "sprint review" / "retrospective" → **review**
- "show roadmap" / "update roadmap" / "what's the plan" → **roadmap**

## Execution Flow

### Step 1: Determine State

Check if `.pdlc/config.json` exists in the current working directory.

**If it exists:** Read it to determine `current_phase` and `current_sprint`. This is an existing PDLC project — resume from where it left off (unless a specific sub-command overrides).

**If it doesn't exist:** This is a new PDLC project. The orchestrator will initialize the `.pdlc/` directory structure. Default command is **full-cycle** starting from RESEARCH.

### Step 2: Route Command

Based on the parsed command:

#### `status`
1. Read `.pdlc/config.json`
2. Read `.pdlc/dashboard.md` if it exists
3. Display to user:
   - Project name and description
   - Current phase and sprint number
   - Key metrics (velocity, completion rate, test pass rate)
   - Recent activity
   - Next steps
4. Do NOT spawn any agents — this is a read-only operation.

#### `dashboard`
1. Read `.pdlc/config.json` and all sprint results
2. Spawn performance-monitor to collect latest metrics
3. Regenerate `.pdlc/dashboard.md` using the template from `references/templates.md`
4. Display the dashboard to the user

#### `roadmap`
1. If no roadmap exists (`.pdlc/architecture/roadmap.md` missing): verify PLANNING artifacts exist, then create the roadmap
2. If roadmap exists: update it with latest sprint data
3. Use the `roadmap-update` skill if installed; otherwise use product-manager + roadmap template
4. Display roadmap summary to the user

#### `research`
1. Initialize `.pdlc/` if needed, set `current_phase: "RESEARCH"`
2. Spawn the pdlc-orchestrator agent with directive: execute RESEARCH phase
3. The orchestrator handles all agent delegation per `references/agent-registry.md`
4. On completion: display the project selection results to the user

#### `plan`
1. Verify RESEARCH is complete (project-selection.md exists)
2. If not complete: run RESEARCH first, then continue to PLANNING
3. Spawn pdlc-orchestrator with directive: execute PLANNING + DESIGN phases
4. On completion: display the architecture summary and sprint plan to the user

#### `sprint`
1. Verify DESIGN is complete (tech-stack-decision.md exists)
2. If not complete: inform user and suggest running `/pdlc plan` first
3. Spawn pdlc-orchestrator with directive: execute one DEVELOPMENT + TESTING cycle
4. The orchestrator increments current_sprint and manages the full sprint lifecycle
5. On completion: display sprint results summary

#### `deploy`
1. Verify TESTING passed for the current sprint
2. Spawn pdlc-orchestrator with directive: execute DEPLOYMENT phase
3. On completion: display deployment status

#### `review`
1. Verify current sprint has been developed and tested
2. Spawn pdlc-orchestrator with directive: execute REVIEW + IMPROVE phases
3. On completion: display retrospective summary, improvement recommendations, and whether another sprint is needed

#### `full-cycle`
1. Initialize `.pdlc/` if needed
2. Spawn pdlc-orchestrator with directive: execute ALL phases end-to-end
3. The orchestrator runs RESEARCH → PLANNING → DESIGN → then loops (DEVELOPMENT → TESTING → DEPLOYMENT → REVIEW → IMPROVE) for each sprint until all planned sprints complete
4. On each phase completion: provide a brief status update to the user
5. On PDLC completion: display final project summary

#### `resume` (default, no args)
1. Read config.json to find current_phase
2. Resume execution from that phase:
   - INIT → start RESEARCH
   - RESEARCH → continue or complete RESEARCH
   - PLANNING → continue PLANNING
   - DESIGN → continue DESIGN
   - DEVELOPMENT → continue current sprint development
   - TESTING → continue testing
   - DEPLOYMENT → continue deployment
   - REVIEW → continue review
   - IMPROVE → continue improvement, then start next sprint
   - COMPLETE → inform user the project is done, offer to start a new one

### Step 2.5: Detect Execution Mode

Before spawning the orchestrator, detect whether Claude Code Agent Teams is available:

1. Check if the environment variable `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is set to `true`
2. Check if Agent Teams tools are available in the current session: `TaskCreate`, `TaskUpdate`, `TaskList`, `TaskGet`
3. If **both** conditions are true → set `execution_mode: "agent-teams"` in config.json
4. If **either** condition is false → set `execution_mode: "subagent"` in config.json (default)

Update the `agent_teams` object in config.json with detection results:
```json
{
  "execution_mode": "agent-teams",
  "agent_teams": {
    "available": true,
    "env_var_set": true,
    "tools_available": true,
    "phases_using_teams": ["RESEARCH", "DEVELOPMENT", "TESTING", "REVIEW"],
    "fallback_count": 0
  }
}
```

This detection mirrors the Stitch MCP setup check pattern — detect at runtime, use if available, degrade gracefully if not.

### Step 3: Spawn Orchestrator

When spawning the pdlc-orchestrator, first read `agents/pdlc-orchestrator.md` for its full instructions. Then spawn a subagent using those instructions as its system prompt, along with this context:

```
Execute PDLC phase: [PHASE_NAME]

Project state:
- Project: [name from config.json or "new project"]
- Current phase: [phase]
- Current sprint: [N of M]
- Tech stack: [from config.json if set]
- Execution mode: [agent-teams | subagent]

Execution mode notes:
- agent-teams: Use Claude Code Agent Teams (shared task list + teammate messaging) for eligible phases (RESEARCH, DEVELOPMENT, TESTING, REVIEW). The orchestrator acts as Team Lead, development agents act as Teammates.
- subagent: Use traditional subagent spawning for all phases. This is the default when Agent Teams is not available.

Reference files (read as needed):
- Agent registry: .claude/skills/pdlc/references/agent-registry.md
- Phase definitions: .claude/skills/pdlc/references/phase-definitions.md
- Templates: .claude/skills/pdlc/references/templates.md

Working directory: [current working directory]

Core agent instructions (read and provide to subagents as needed):
- Orchestrator: .claude/skills/pdlc/agents/pdlc-orchestrator.md
- Ceremony manager: .claude/skills/pdlc/agents/sprint-ceremony-manager.md
- GitHub ops: .claude/skills/pdlc/agents/github-ops-manager.md

[Any additional context from user input]
```

Available external skills (check before spawning):
- Sprint ceremony: sprint-planning, scrum-master, task-estimation, standup-meeting, sprint-retrospective
- Roadmap: roadmap-update
- GitHub: git-commit, github-issues, gh-cli, pr-create, prd, excalidraw-diagram-generator
- Video: remotion-best-practices
The orchestrator uses these skills to enhance ceremonies and GitHub workflows when available. If a skill is not installed, it falls back to built-in logic. GitHub skills are coordinated by the github-ops-manager (see `agents/github-ops-manager.md`); code-reviewer and architect-reviewer agents review sprint PRs before merge.

### Step 4: Report Results

After the orchestrator completes, read the produced artifacts and present a concise summary to the user:

- **After RESEARCH:** Show selected project name, score, and key differentiator. Research artifacts are committed individually with realistic 1–2 hour gaps between commits (trend scan, market analysis, competitive landscape, project selection).
- **After PLANNING:** Show feature count, sprint count, key milestones, and subtask breakdown per story
- **After DESIGN:** Show tech stack decision and architecture summary
- **After DEVELOPMENT:** Show stories completed vs planned, subtasks done/total per agent, commit count per day. Sprint execution follows a 7-day schedule (Mon planning → Sun integration) with session-based subtask commits.
- **After TESTING:** Show test pass rate, issues found/resolved
- **After DEPLOYMENT:** Show deployment status
- **After REVIEW:** Show velocity trend, retrospective highlights
- **After IMPROVE:** Show top recommendations and adaptations made

## Error Handling

- If a phase fails after max retries: inform the user with a clear explanation of what went wrong and suggest next steps
- If config.json is missing but `.pdlc/` directory exists: attempt state recovery by reading artifacts
- If user runs a command out of order (e.g., `/pdlc deploy` before any code exists): explain the prerequisite and suggest the correct command

## Google Stitch MCP Integration

The PDLC system uses Google Stitch for AI-powered design-to-code workflows. Before executing DESIGN or DEVELOPMENT phases that involve UI/UX:

### Setup Check
Check if the `stitch` MCP server is available in the current session. If Stitch tools (`stitch-design`, `enhance-prompt`, `react-components`, etc.) are NOT available, inform the user:

```
Stitch MCP server is not configured. To enable AI-powered design-to-code:

claude mcp add stitch --transport http https://stitch.googleapis.com/mcp --header "X-Goog-Api-Key: YOUR_STITCH_API_KEY" -s user

Then restart Claude Code for the tools to become available.
```

### Stitch Tools Available
When Stitch is configured, these tools enhance the PDLC design workflow:

| Tool | Use For |
|------|---------|
| `enhance-prompt` | Refine vague UI ideas into detailed design specs |
| `stitch-design` | Generate high-fidelity screens and design systems |
| `design-md` | Create structured design documentation |
| `stitch-loop` | Generate complete multi-page site/app structure |
| `react-components` | Convert designs to validated React components |
| `shadcn-ui` | Integrate shadcn/ui component library |
| `remotion` | Generate demo/walkthrough videos |

The orchestrator automatically uses these tools when a project has a frontend component. They are invoked during:
- **DESIGN phase:** `enhance-prompt` → `stitch-design` → `design-md` for screen designs and design systems
- **DEVELOPMENT phase:** `stitch-loop` for scaffolding, `react-components` for component code, `shadcn-ui` for UI library integration
- **REVIEW phase:** `remotion` for generating sprint demo videos

## Claude Code Agent Teams Integration

The PDLC can leverage Claude Code's experimental Agent Teams feature for true parallel execution. Instead of the orchestrator serially spawning subagents, Agent Teams enables multiple Claude Code instances to work as a coordinated team with a shared task list and direct peer messaging.

### Agent Teams Setup Check

Agent Teams requires two conditions (detected automatically in Step 2.5):

1. **Environment variable:** `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=true`
2. **Tools available:** `TaskCreate`, `TaskUpdate`, `TaskList`, `TaskGet` in the current session

If Agent Teams is NOT available, inform the user:

```
Agent Teams is not enabled. The PDLC will use standard subagent orchestration.

To enable Agent Teams for true parallel agent execution:
  export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=true

Then restart Claude Code. Agent Teams enables:
- Multiple Claude instances working in parallel as Teammates
- Shared task list for self-coordinating sprint stories
- Direct peer-to-peer messaging for blocker resolution
- Real-time ceremony participation (standups, retros)
```

### How Agent Teams Enhances PDLC

When available, Agent Teams is used for phases with high parallelism potential:

| Phase | Agent Teams? | Why |
|-------|-------------|-----|
| RESEARCH | Yes | 3+ research agents self-coordinate wave-based scanning |
| PLANNING | No | Sequential pipeline, orchestrator control needed |
| DESIGN | No | Hub-spoke pattern, Stitch MCP is orchestrator-driven |
| DEVELOPMENT | **Yes (primary)** | 4 concurrent devs self-assign stories, peer-coordinate |
| TESTING | Yes | Independent test streams, real-time critique debates |
| DEPLOYMENT | No | Safety-critical, needs orchestrator gating |
| REVIEW | Yes | Concurrent demos, peer retro reflections |
| IMPROVE | No | Orchestrator-driven coaching, inherently hierarchical |

The orchestrator acts as **Team Lead** (creates tasks, monitors, approves gates) while development agents act as **Teammates** (self-assign tasks, execute, message peers). All ceremonies produce the same artifacts at the same paths regardless of execution mode.

When Agent Teams is not available, the PDLC falls back to the subagent approach with zero behavioral change. See `agents/pdlc-orchestrator.md` for full dual-mode orchestration details.

## Reference Files

These files contain the detailed specifications the orchestrator needs. They are loaded on demand — not all at once:

- **`references/agent-registry.md`** — Complete mapping of which agents to spawn per phase, tech stack decision matrix, concurrency limits. Read when selecting agents for a phase.
- **`references/phase-definitions.md`** — Entry/exit criteria, activities, error handling for all 8 phases. Read when executing a specific phase.
- **`references/templates.md`** — File templates for config.json, sprint plans, results, dashboard, etc. Read when creating PDLC artifacts.

## Bundled Agents

These are the core PDLC agents bundled with this skill. Read them when spawning the relevant subagent.

- **`agents/pdlc-orchestrator.md`** — The master conductor. Read this file and use its instructions as the system prompt when spawning the orchestrator.
- **`agents/sprint-ceremony-manager.md`** — Sprint ceremony coordinator. The orchestrator spawns this for all Scrum ceremonies.
- **`agents/github-ops-manager.md`** — GitHub operations coordinator. The orchestrator spawns this for commits, PRs, issues, and releases.

The 50+ general-purpose agents (react-specialist, backend-engineer, code-reviewer, etc.) are optional. If not installed, the orchestrator degrades gracefully with its built-in retry/fallback chain.
