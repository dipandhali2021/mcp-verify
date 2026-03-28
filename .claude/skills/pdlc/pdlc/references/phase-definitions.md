# PDLC Phase Definitions

Detailed specification for each of the 8 PDLC phases. Read this file when executing a specific phase to understand entry/exit criteria, activities, error handling, and transitions.

## State Machine

```
INIT → RESEARCH → PLANNING → DESIGN → DEVELOPMENT ⇄ TESTING → DEPLOYMENT → REVIEW → IMPROVE
                                           ↑                                           |
                                           └───────────────────────────────────────────┘
                                                        (next sprint)
                                                              |
                                                          COMPLETE (after final sprint)
```

**Phase transitions are gated.** A phase cannot start until its entry criteria are met. A phase cannot end until its exit criteria are satisfied or max retries are exhausted.

---

## Required Reading Protocol

Before executing any work, agents MUST complete their required reading. This ensures agents have full context and prevents failures from missing information.

### Baseline Required Reading (ALL agents, ALL phases)
1. `.pdlc/config.json` -- current project state, tech stack, sprint number
2. The sprint plan for the current sprint: `.pdlc/sprints/sprint-N/plan.md`
3. Their own coaching profile (if exists): `.pdlc/retrospective/coaching/[agent-name].md`

### Phase-Specific Required Reading

| Phase | Additional Required Reading |
|-------|---------------------------|
| PLANNING | `project-selection.md`, previous sprint results (if re-planning) |
| DESIGN | `product-vision.md`, `requirements.md` |
| DEVELOPMENT | `system-design.md`, `api-spec.md`, `data-model.md`, `security-design.md`, `tech-stack-decision.md`, previous sprint results (if sprint > 1), `recommendations.md` (if exists), `roadmap.md` (if exists) |
| TESTING | Sprint plan, all code produced this sprint, `security-design.md` |
| DEPLOYMENT | Sprint test results, `system-design.md` |
| REVIEW | Sprint plan, sprint results, `agent-log.md`, `roadmap.md` (if exists) |
| IMPROVE | ALL sprint results, ALL coaching profiles, retro action items, `roadmap.md` (if exists) |

### Enforcement
The orchestrator MUST include the required reading list in every agent spawn invocation. Agents that fail due to missing context are retried with the missing documents explicitly provided. If an agent's coaching profile recommends additional reading, that overrides the baseline.

---

## Phase 1: RESEARCH

**Purpose:** Identify trending real-world projects, technologies, and market opportunities worth building autonomously.

### Entry Criteria
- PDLC initialized (`.pdlc/config.json` exists with `current_phase: "INIT"` or `"RESEARCH"`)
- OR explicit `/pdlc research` command received

### Activities
1. **Trend scanning (parallel, wave 1):**
   - Spawn trend-analyst: scan technology trends (GitHub trending, HackerNews, Product Hunt, tech blogs, social signals)
   - Spawn search-specialist: deep-dive on specific emerging technologies and frameworks
   - Spawn market-researcher: assess market dynamics, TAM/SAM/SOM for promising areas
   - Each agent writes findings to `.pdlc/research/trend-scan-YYYY-MM-DD.md`, `market-analysis-YYYY-MM-DD.md`

2. **Competitive analysis (wave 2):**
   - Spawn competitive-analyst: analyze existing solutions for shortlisted ideas, identify gaps
   - Spawn data-researcher: gather quantitative data (download stats, GitHub stars, survey data)
   - Writes to `.pdlc/research/competitive-landscape-YYYY-MM-DD.md`

3. **Synthesis and selection (wave 3):**
   - Spawn research-analyst: read ALL wave 1-2 outputs, score candidates, recommend top pick
   - Writes to `.pdlc/research/project-selection.md`

4. **Research artifact commits (after each wave):**
   - After each research agent produces its artifact, github-ops-manager commits it individually
   - Conventional commit prefix: `research:` (e.g., `research: add trend scan results`, `research: add market analysis`, `research: add competitive landscape`, `research: add project selection report`)
   - Each research commit is a separate session with a random 1–2 hour rest between commits
   - This makes the research phase look like a multi-day effort, not a single burst
   - Commits are staggered using `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE` for realistic timestamps

### Scoring Rubric
Each candidate project is scored on 4 dimensions (0-25 each, total 0-100):

| Dimension | What to Assess | Score Guide |
|-----------|---------------|-------------|
| Trend Momentum | Is this growing? Search volume, GitHub activity, social buzz | 0-10: declining, 11-18: stable, 19-25: rapid growth |
| Market Size | How many potential users/customers? | 0-10: niche, 11-18: moderate, 19-25: large market |
| Feasibility | Can we build an MVP in 4-6 sprints? | 0-10: very complex, 11-18: moderate, 19-25: straightforward |
| Differentiation | Can we do something existing solutions don't? | 0-10: me-too, 11-18: incremental, 19-25: novel approach |

**Minimum viable score:** 60/100. Projects below this threshold are rejected.

### Exit Criteria
- `.pdlc/research/project-selection.md` exists
- At least one project scores >= 60
- Project selection includes: name, description, target users, key differentiator, estimated sprint count
- `config.json` updated: `current_phase: "PLANNING"`, `project_name` set
- All research artifacts committed individually with `research:` prefix and realistic 1–2 hour gaps between commits

### Error Handling
- If all projects score < 60: retry with broader search terms (max 3 research cycles)
- If 3 cycles produce nothing: write `.pdlc/research/no-viable-project.md` with analysis of why, set `current_phase: "COMPLETE"`, halt
- If a research agent fails: skip it and proceed with remaining agents' data

### Max Retries: 3

### Agent Teams Variant (RESEARCH)

When `execution_mode: "agent-teams"`, the orchestrator acts as **Team Lead** and creates tasks instead of spawning subagents:

1. **Wave 1 — Team Lead creates 3 parallel tasks via TaskCreate:**
   - Task: "Scan technology trends" → assigned to trend-analyst Teammate
   - Task: "Deep-dive emerging technologies" → assigned to search-specialist Teammate
   - Task: "Assess market dynamics" → assigned to market-researcher Teammate
   - Teammates self-assign matching tasks and begin work simultaneously
   - Teammates cross-pollinate findings via direct messaging during execution

2. **Wave 2 — Team Lead creates 2 tasks with dependencies:**
   - Task: "Analyze competitive landscape" → addBlockedBy wave 1 tasks → competitive-analyst Teammate
   - Task: "Gather quantitative data" → addBlockedBy wave 1 tasks → data-researcher Teammate

3. **Wave 3 — Team Lead creates synthesis task:**
   - Task: "Score candidates and recommend top pick" → addBlockedBy wave 2 tasks → research-analyst Teammate
   - research-analyst reads all wave 1-2 outputs via file system (same artifacts, same paths)

All artifacts are written to identical paths as subagent mode. Entry/exit criteria unchanged.

---

## Phase 2: PLANNING

**Purpose:** Create a complete product specification with scope, user stories, success metrics, and sprint breakdown.

### Entry Criteria
- `.pdlc/research/project-selection.md` exists with a selected project
- `config.json`: `current_phase: "PLANNING"`

### Activities
1. **Product vision (sequential, step 1):**
   - Spawn product-manager: define product vision, target audience, key features, success metrics, roadmap
   - Reads project-selection.md as input
   - Writes `.pdlc/architecture/product-vision.md`

2. **Requirements analysis (parallel, step 2):**
   - Spawn business-analyst: translate vision into detailed requirements, acceptance criteria, user stories
   - Spawn ux-researcher: define user personas, key user journeys, usability requirements
   - Writes `.pdlc/architecture/requirements.md`, `.pdlc/architecture/user-personas.md`

3. **Project structure (parallel, step 3):**
   - Spawn project-manager: create WBS, estimate sprint count (4-8 sprints typical), define milestones
   - Spawn scrum-master: define sprint cadence, ceremonies, definition of done
   - Writes `.pdlc/architecture/project-plan.md`, `.pdlc/architecture/sprint-structure.md`

4. **Documentation (step 4):**
   - Spawn technical-writer: compile product specification document
   - Writes `.pdlc/architecture/product-spec.md`

5. **Roadmap creation (step 5):**
   - Use the `roadmap-update` skill if installed (invoke via Skill tool with RICE prioritization)
   - If skill not available: product-manager creates the roadmap manually using the template from `references/templates.md`
   - Input: product-vision.md, requirements.md, project-plan.md
   - Format: Now/Next/Later with RICE scoring (default)
   - Capacity allocation: 70% features, 20% tech health, 10% buffer
   - Include dependency map and risk register
   - Writes `.pdlc/architecture/roadmap.md`

6. **Compliance check (conditional, step 2):**
   - Spawn legal-advisor IF project involves: financial data, health data, personal data, payments, regulated industry
   - Writes `.pdlc/architecture/compliance-requirements.md`

### Exit Criteria
- Product vision document exists with clear features list
- Requirements document exists with numbered user stories
- Project plan exists with sprint count estimate and milestones
- Roadmap document exists at .pdlc/architecture/roadmap.md
- `config.json` updated: `current_phase: "DESIGN"`, `total_planned_sprints` set

### Error Handling
- If product-manager output is too vague: retry with explicit prompting for feature list and success metrics
- If sprint estimate exceeds 8: flag for user review (may need scope reduction)

### Max Retries: 2

---

## Phase 3: DESIGN

**Purpose:** Choose technology stack, design system architecture, and create architecture decision records.

### Entry Criteria
- Product spec and requirements documents exist
- `config.json`: `current_phase: "DESIGN"`

### Activities
1. **System architecture (step 1):**
   - Spawn cloud-architect: read all Phase 2 outputs, design high-level system architecture
   - Determines: deployment model (serverless/containers/VMs), cloud provider, availability needs
   - Writes `.pdlc/architecture/system-design.md`

2. **Component design (parallel, step 2):**
   - Spawn api-designer: design API contracts based on system design
   - Spawn database-administrator: design data model, select database technology
   - Spawn security-engineer: design auth system, threat model, security controls
   - Spawn ui-designer (if frontend): design component hierarchy, design system
   - Spawn microservices-architect (if distributed): define service boundaries
   - Writes to `.pdlc/architecture/api-spec.md`, `.pdlc/architecture/data-model.md`, `.pdlc/architecture/security-design.md`

3. **UI/UX Design via Google Stitch (step 2, parallel, if project has frontend):**
   - Check if Stitch MCP tools are available in the session
   - If available:
     - Use `enhance-prompt` to transform product vision + user personas into detailed, framework-specific design specifications
     - Use `stitch-design` to generate high-fidelity screen designs for all key screens identified in the product spec
     - Use `design-md` to create structured design documentation optimized for code generation in the chosen framework
     - Use `stitch-design` (design system mode) to synthesize a cohesive design system (colors, typography, spacing, components)
     - Write outputs to `.pdlc/architecture/designs/` directory
   - If NOT available: fall back to ui-designer agent producing design specs manually
   - Inform user if Stitch is missing: `claude mcp add stitch --transport http https://stitch.googleapis.com/mcp --header "X-Goog-Api-Key: YOUR_STITCH_API_KEY" -s user`

4. **Tech stack selection (step 2, orchestrator task):**
   - Based on system-design.md, the orchestrator consults the agent-registry.md tech stack decision matrix
   - Selects language agents + framework agents + infra agents for Phase 4
   - Writes `.pdlc/architecture/tech-stack-decision.md` with rationale and agent assignments

5. **Architecture review (step 3):**
   - Spawn architect-reviewer: review all architecture documents (including Stitch designs) for consistency, scalability, gaps
   - Writes `.pdlc/architecture/adr/001-initial-architecture-review.md`

### Exit Criteria
- System design document exists
- Tech stack decision document exists with specific agent assignments
- API spec exists (if applicable)
- Data model exists
- Security design exists
- UI/UX designs exist (if frontend project) — either Stitch-generated or manually specified
- `config.json` updated: `current_phase: "DEVELOPMENT"`, `tech_stack` populated, `current_sprint: 1`

### Error Handling
- If cloud-architect and architect-reviewer disagree: cloud-architect revises with reviewer feedback
- If tech stack has no matching agents in registry: use fullstack-developer as fallback
- If security design reveals blockers: escalate to design review before proceeding

### Max Retries: 2

---

## Phase 4: DEVELOPMENT

**Purpose:** Build the product incrementally in weekly sprints. This phase repeats for each sprint.

### Entry Criteria
- Architecture documents exist
- Tech stack and agent assignments determined
- `config.json`: `current_phase: "DEVELOPMENT"`, `current_sprint` >= 1
- For sprint N > 1: previous sprint results exist

### Activities (per sprint)

1. **Sprint Planning Meeting (step 1):**
   - **External skill integration (if available):**
     - Invoke `sprint-planning` skill for capacity planning at 70-80% utilization, backlog prioritization (P0/P1/P2), and dependency/risk analysis
     - Invoke `scrum-master` skill for sprint iteration sizing and "Small Batches" principle (1-3 day completability per story)
     - Invoke `task-estimation` skill for story point estimation using Fibonacci scale (1, 2, 3, 5, 8, 13) with risk-adjusted estimates (medium: 1.3x, high: 1.5x)
     - Feed skill outputs as structured inputs to the multi-agent planning conversation below
   - **If skills not installed:** Fall back to the built-in sprint planning ceremony
   - **Required reading for all participants:** sprint plan template, project plan, previous sprint results (if N > 1), recommendations, coaching profiles, roadmap (if exists)
   - Spawn scrum-master as facilitator + product-manager + all assigned development agents
   - Run as a multi-agent conversation where:
     - product-manager presents the sprint goal and prioritized backlog
     - Each development agent reviews their assigned stories, provides estimates, raises concerns
     - Agents negotiate: push back on underestimates, suggest story splits, flag dependencies
     - scrum-master resolves conflicts, validates total points <= adjusted velocity
   - Reads: project plan, previous sprint results (if N > 1), self-improvement recommendations, agent coaching profiles
   - Writes `.pdlc/sprints/sprint-N/meetings/sprint-planning.md` (full meeting transcript)
   - Writes `.pdlc/sprints/sprint-N/plan.md` (finalized plan from meeting outcome)

2. **Infrastructure setup (sprint 1 only, step 2):**
   - Spawn devops-engineer: set up repository structure, CI/CD pipeline skeleton
   - Spawn docker-expert: create Dockerfile and docker-compose
   - Spawn git-workflow-manager: configure branch strategy, hooks, PR templates
   - Spawn build-engineer: configure build system
   - Spawn dependency-manager: initialize package management

3. **Day-by-day story execution (step 2/3, 6 sprint days):**

   The sprint spans 7 days total: Monday (planning) → Sunday (integration + ceremonies).
   Development runs Tuesday–Sunday as a **session-based model** where each Claude session handles one subtask per agent, then stops.

   **Daily cycle (Day 1–6, Tuesday–Sunday):**

   a. **Morning standup** — scrum-master + all active agents
      - Yesterday's subtasks completed (count + descriptions)
      - Today's planned subtasks
      - Story progress (subtasks done/total per story)
      - Blockers
      - Transcript appended to `.pdlc/sprints/sprint-N/meetings/standups.md`
      - **External skill integration:** Invoke `standup-meeting` skill if available (3-Question format, 15 min max, blocker accountability)

   b. **Session-based subtask execution** — one subtask per agent per session
      - Each story is pre-decomposed into 8–12 subtasks (defined during sprint planning)
      - Agent picks up their NEXT subtask → reads story requirements + architecture docs + coaching profile → completes it → commits
      - Max 4 concurrent agents per session
      - **For UI subtasks (if Stitch MCP available):** Use `stitch-loop`, `react-components`, `shadcn-ui` as appropriate
      - Session ends after all agents commit their subtask
      - **1–2 hour rest before next session** (natural gap between commits)
      - **5–12 sessions per day** (randomized daily — varies to look natural)

   c. **Subtask commit protocol** — github-ops-manager per subtask
      - Proper conventional commit after each completed subtask (`feat:`, `fix:`, `test:`, `refactor:`, `chore:`)
      - All commits include `Refs #N` for issue linking
      - **Staggered timestamps per agent** — each agent commits at a different time within the session using `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE`. Times randomized across morning (9–12), afternoon (13–17), evening (18–21) with lunch gap.
      - **No WIP commits** — every commit represents a complete subtask
      - documentation-engineer updates docs as code is written

   d. **End-of-day status** — each agent logs:
      - Subtasks completed today (with commit SHAs)
      - Story progress (subtasks done/total)
      - What carries over to tomorrow
      - Appended to `.pdlc/sprints/sprint-N/agent-log.md`

   **Day schedule:**
   - Day 1 (Tue): Infrastructure subtasks + first subtasks of priority stories
   - Day 2 (Wed): Continue subtasks, new stories start as agents free up
   - Day 3 (Thu): Core stories progressing, dependencies resolving
   - Day 4 (Fri): Stories advancing, mid-sprint check
   - Day 5 (Sat): Most stories targeting completion
   - Day 6 (Sun AM): Final subtasks, bug fixes
   - Day 6 (Sun PM): Sprint Integration → Sprint Review → Sprint Retro

4. **Integration (Sunday PM, step 4):**
   - Orchestrator verifies all agent outputs compile and integrate
   - Resolves any conflicts between parallel work
   - multi-agent-coordinator merges final outputs (subagent mode) or Team Lead verifies TaskList completion (agent-teams mode)

5. **Decision journaling (continuous):**
   - When any agent makes a significant technical decision, append to `.pdlc/architecture/decision-journal.md`
   - Capture: options considered, tradeoffs, chosen approach, reasoning, what would change the decision

6. **Tech debt tracking (continuous):**
   - When any agent introduces a shortcut, TODO, or known limitation, add to `.pdlc/retrospective/tech-debt.md`
   - Each debt item has: description, severity, estimated paydown effort, introducing sprint

### Exit Criteria
- All planned stories have code written (or explicitly deferred with reason)
- Basic tests exist for new code
- Code compiles/runs without errors
- Git history shows day-by-day commit progression with staggered timestamps per agent (5–12 commits per agent per day)
- Sprint agent log written to `.pdlc/sprints/sprint-N/agent-log.md` with daily subtask progress per agent
- Standup log written to `.pdlc/sprints/sprint-N/standups.md` with subtask tracking (done/total)
- Decision journal updated if significant decisions were made
- Tech debt register updated if shortcuts were introduced
- Spike notes written if exploratory stories existed
- `session_progress` in config.json reflects final state of all agent subtask positions
- `CLAUDE.md` updated if sprint changes affected repo structure, architecture, or workflows
- `config.json` updated: phase transitions to `"TESTING"`

### Error Handling
- If a development agent fails on a story: retry once with more context from architecture docs
- If retry fails: swap to a higher-tier model (sonnet → opus) for that agent
- If that also fails: mark story as blocked, continue with remaining stories
- If 0 stories complete: halve next sprint scope, add a diagnostic step

### Max Retries: 2 per story, 1 per sprint

### Agent Teams Variant (DEVELOPMENT)

When `execution_mode: "agent-teams"`, the DEVELOPMENT phase is the **primary beneficiary** of Agent Teams. The orchestrator (Team Lead) replaces task-distributor and multi-agent-coordinator with the shared task list.

**Sprint Planning:** Same ceremony structure, but sprint-ceremony-manager runs as a **Teammate** that picks up the ceremony task. All planning participants communicate via Teammate messaging instead of orchestrator-simulated dialogue.

**Story Execution via Shared Task List:**

1. **Team Lead creates one TaskCreate per sprint story** with structured metadata:
   ```
   TaskCreate:
     subject: "Story S-N-XX: [story title]"
     description: |
       Requirements: [from sprint plan]
       Agent type: [react-specialist | backend-developer | ...]
       Story points: [N]
       Priority: [P0 | P1 | P2]
       Required reading: [list of architecture docs, coaching profile path]
       Coaching context: [notes from .pdlc/retrospective/coaching/[agent].md]
       Output directory: [target source path]
       Dependencies: [list of story IDs this depends on]
   ```

2. **Dependencies set via TaskUpdate addBlockedBy** — stories with dependencies cannot be claimed until blockers complete.

3. **Teammates self-assign** — each dev Teammate calls TaskList, finds matching unclaimed tasks (matching their agent_type), claims the highest-priority one via TaskUpdate, executes, and marks complete. Then picks up the next available task.

4. **Peer coordination via messaging** — when a Teammate discovers a cross-story dependency or needs input from another agent, they message that Teammate directly instead of escalating through the orchestrator.

5. **Standups become real-time** — sprint-ceremony-manager Teammate creates standup tasks between story waves. Dev Teammates post status updates via messaging. Transcript compiled from real messages into `.pdlc/sprints/sprint-N/meetings/standups.md`.

6. **github-ops-manager Teammate** picks up commit/PR tasks from the shared task list as stories complete.

**Infrastructure setup (sprint 1)** remains orchestrator-driven (subagent mode) since it's sequential prerequisite work.

**Integration:** Team Lead monitors TaskList for completion. When all story tasks are complete, Team Lead verifies integration (same as subagent mode step 4).

**Fallback:** If TaskCreate/TaskUpdate fails mid-sprint, Team Lead collects results from completed tasks and switches remaining stories to subagent spawning. Increment `agent_teams.fallback_count` in config.json.

All artifacts written to identical paths. Entry/exit criteria unchanged.

---

## Phase 5: TESTING

**Purpose:** Validate all sprint deliverables for correctness, security, and performance.

### Entry Criteria
- Sprint development code exists
- `config.json`: `current_phase: "TESTING"`

### Activities

1. **Parallel testing (wave 1):**
   - Spawn qa-expert: create test strategy and execute test plan
   - Spawn test-automator: write automated test suites (unit, integration)
   - Spawn code-reviewer: review all new code for quality, patterns, issues

2. **Design critique loop (wave 1.5, adversarial):**
   - code-reviewer and architect-reviewer write critiques to `.pdlc/sprints/sprint-N/design-critiques.md`
   - Each critique references the original agent's reasoning from agent-log.md
   - Critiques rated: Critical / Major / Minor / Suggestion
   - Critical critiques MUST be resolved before proceeding
   - This back-and-forth mimics real engineering team debates

3. **Specialized testing (wave 2):**
   - Spawn security-auditor: scan for vulnerabilities, OWASP top 10
   - Spawn performance-engineer (if performance-critical): load testing, profiling
   - Spawn accessibility-tester (if frontend exists): WCAG compliance
   - Spawn penetration-tester (if security-critical): ethical hacking
   - Spawn compliance-auditor (if regulated domain): compliance checks

4. **Bug fixing (wave 3, reactive):**
   - If issues found: spawn debugger to fix critical/high issues
   - Spawn error-detective for complex bugs requiring root cause analysis
   - Re-run affected tests after fixes

### Exit Criteria
- All critical and high issues resolved (medium/low can be deferred)
- All Critical design critiques resolved
- Test coverage meets minimum threshold (target: 70%+)
- Security audit passes with no critical/high vulnerabilities
- Code review approved
- Design critiques log written to `.pdlc/sprints/sprint-N/design-critiques.md`
- `config.json` updated: phase transitions to `"DEPLOYMENT"`

### Error Handling
- If tests fail after fix attempts: mark as known issue, document in sprint results
- If security audit finds critical issue: block deployment, return to development
- If code reviewer requests major refactor: add refactoring story to next sprint

### Max Retries: 2 (fix-verify cycles)

### Agent Teams Variant (TESTING)

When `execution_mode: "agent-teams"`, the orchestrator (Team Lead) creates testing tasks on the shared task list:

1. **Wave 1 — Team Lead creates 3 parallel testing tasks:**
   - Task: "Execute test plan" → qa-expert Teammate
   - Task: "Write automated test suites" → test-automator Teammate
   - Task: "Review all sprint code" → code-reviewer Teammate
   - Teammates self-assign and execute in parallel

2. **Wave 1.5 — Design critique as peer debate:**
   - Team Lead creates critique tasks → code-reviewer and architect-reviewer Teammates
   - **Key improvement over subagent mode:** critic Teammates **message the original dev Teammate directly** for real-time debate instead of orchestrator-mediated back-and-forth
   - The dev Teammate can defend decisions or accept and fix — producing richer, more authentic engineering debates
   - Critique transcripts compiled from real message exchanges

3. **Wave 2 — Conditional specialized testing tasks (addBlockedBy wave 1):**
   - Team Lead creates tasks for security-auditor, performance-engineer, accessibility-tester as needed
   - Teammates self-assign matching tasks

4. **Wave 3 — Reactive bug fix tasks:**
   - Testing Teammates create new bug fix tasks directly via TaskCreate when they find issues
   - debugger/error-detective Teammates pick up bug fix tasks
   - This is a natural advantage of Agent Teams — Teammates can create work for each other without routing through the orchestrator

All artifacts written to identical paths. Entry/exit criteria unchanged.

---

## Phase 6: DEPLOYMENT

**Purpose:** Package, deploy, and verify sprint deliverables in the target environment.

### Entry Criteria
- Testing phase passed (no critical/high unresolved issues)
- `config.json`: `current_phase: "DEPLOYMENT"`

### Activities

1. **Infrastructure provisioning (step 1, if needed):**
   - Spawn terraform-engineer: provision or update infrastructure
   - Only needed if architecture changed or first deployment

2. **Build and deploy (step 2):**
   - Spawn docker-expert (if containerized): build optimized images
   - Spawn devops-engineer: execute deployment pipeline
   - Spawn deployment-engineer: coordinate rollout (blue-green or canary if configured)

3. **Post-deployment (step 3):**
   - Spawn sre-engineer: verify deployment health, set up monitoring
   - Spawn kubernetes-specialist (if K8s): verify pod health, scaling

### Exit Criteria
- Application deployed and responding to health checks
- Monitoring and alerting configured
- Deployment verified (smoke tests pass)
- `config.json` updated: phase transitions to `"REVIEW"`

### Error Handling
- If deployment fails: automatic rollback, spawn debugger to analyze
- If health checks fail: rollback, add diagnostic story to next sprint
- If infrastructure provisioning fails: retry with different configuration

### Max Retries: 2

---

## Phase 7: REVIEW

**Purpose:** Evaluate sprint outcomes, collect metrics, run retrospective, update dashboard.

### Entry Criteria
- Sprint work is deployed (or development + testing complete if no deployment)
- `config.json`: `current_phase: "REVIEW"`

### Activities

1. **Sprint Review Meeting (step 1):**
   - Spawn scrum-master (facilitator) + product-manager + all sprint agents + simulated user personas
   - Run as a multi-agent conversation:
     - Each development agent **demos** their completed stories: what was built, key decisions, how it works
     - product-manager **evaluates** each story against acceptance criteria: approved / needs rework
     - Simulated user personas **react**: positive feedback, friction points, feature requests, usability score (0-10)
   - Spawn performance-monitor in parallel to collect agent metrics
   - Spawn architect-reviewer to assess architecture quality and tech debt
   - Write: `.pdlc/sprints/sprint-N/meetings/sprint-review.md` (full transcript)
   - Write: `.pdlc/sprints/sprint-N/user-feedback.md`
   - Use Stitch `remotion` to generate demo video (if frontend project with Stitch MCP)

2. **Sprint Retrospective Meeting (step 2):**
   - Spawn scrum-master (facilitator) + ALL agents who participated in sprint
   - Run as a multi-agent conversation where each agent shares candidly:
     - **What went well** for them personally
     - **What didn't go well** and why
     - **Specific suggestions** for next sprint (process, tooling, sequencing, pairing)
   - scrum-master synthesizes:
     - Team-wide patterns (what multiple agents agree on)
     - Committed action items for next sprint (specific and actionable)
     - Process changes (story ordering, required reading, pairing recommendations)
   - Write: `.pdlc/sprints/sprint-N/meetings/sprint-retro.md` (full transcript with action items)
   - **External skill integration (if available):**
     - Invoke `sprint-retrospective` skill for structured format selection:
       - Sprint 1-2: Start-Stop-Continue (simple, builds habit)
       - Sprint 3+ with confidence >= 70: 4Ls (Liked-Learned-Lacked-Longed For)
       - Any sprint with confidence < 60: Mad-Sad-Glad (surfaces emotional friction)
     - Blame-free environment enforcement
     - Limit action items: maximum 2-3 per session
     - Time-box: 1 hour maximum
   - **If skill not installed:** Fall back to the built-in retro format (What Went Well / What Didn't / Suggestions)

3. **Sprint confidence scoring (step 3, orchestrator task):**
   - Compute Sprint Confidence Score (0-100) based on 5 factors:
     - First-attempt success rate (25%): what % of agents succeeded without retry
     - Stories completed vs planned (25%): completion rate
     - Zero critical issues (20%): full marks if no critical bugs found
     - No agent tier escalations (15%): full marks if no sonnet→opus swaps needed
     - Estimation accuracy (15%): full marks if actual points within 20% of planned
   - Score interpretation: 90+ excellent, 70-89 good, 50-69 concerning, <50 red flag

4. **Sprint results compilation (step 4, orchestrator task):**
   - Orchestrator compiles all meeting outputs, metrics, and feedback into `.pdlc/sprints/sprint-N/results.md`
   - Includes: confidence score, velocity, retro action items, user feedback summary
   - Updates `.pdlc/dashboard.md` with latest metrics and confidence trend
   - Updates `config.json` sprint history

5. **Roadmap update (step 5, if roadmap exists):**
   - Use the `roadmap-update` skill if installed; otherwise product-manager updates manually
   - Read `.pdlc/architecture/roadmap.md` and current sprint results
   - Move completed items from "Now" to "Completed", shift "Next" items to "Now" if appropriate
   - Re-prioritize using RICE or MoSCoW based on sprint learnings and user feedback
   - Update dependency map and risk register
   - Write updated `.pdlc/architecture/roadmap.md`
   - Principle: "Roadmap is a communication tool, not a project plan"

### Exit Criteria
- Sprint Review meeting transcript written
- Sprint Retrospective meeting transcript written with committed action items
- Sprint results document written with all metrics and confidence score
- User feedback simulation written
- Dashboard updated
- Roadmap updated (if roadmap exists)
- `config.json` updated: phase transitions to `"IMPROVE"`

### Error Handling
- If metrics collection fails: use available data, note gaps
- Review phase should always complete (it's observational, not actionable)

### Max Retries: 1

### Agent Teams Variant (REVIEW)

When `execution_mode: "agent-teams"`, review ceremonies use real concurrent Teammate communication:

1. **Sprint Review Meeting:**
   - Team Lead creates a "Sprint Review" task → sprint-ceremony-manager Teammate facilitates
   - Each dev Teammate **posts their demo via messaging** — what was built, decisions, approach
   - product-manager Teammate **evaluates concurrently** via messaging — approved/needs rework per story
   - performance-monitor and architect-reviewer run as parallel Teammates collecting metrics and assessing architecture
   - sprint-ceremony-manager compiles all real message exchanges into `.pdlc/sprints/sprint-N/meetings/sprint-review.md`
   - **Key improvement:** Demos and evaluations happen concurrently instead of sequential orchestrator simulation

2. **Sprint Retrospective Meeting:**
   - Each Teammate **posts their own reflection concurrently** via messaging:
     - What went well, what didn't, suggestions
   - scrum-master Teammate synthesizes patterns and action items from real peer messages
   - **Key improvement:** Reflections are authentic and concurrent — agents can react to each other's observations in real-time, producing richer retro insights
   - External skill integration same as subagent mode

3. **Sprint confidence scoring + results compilation:** Same as subagent mode — these are orchestrator (Team Lead) tasks that don't benefit from parallelism.

4. **Roadmap update:** Same as subagent mode.

All artifacts written to identical paths. Entry/exit criteria unchanged.

---

## Phase 8: IMPROVE

**Purpose:** Learn from past sprints, identify patterns, and optimize future execution.

### Entry Criteria
- Sprint review complete
- `config.json`: `current_phase: "IMPROVE"`

### Activities

1. **Pattern analysis (parallel, step 1):**
   - Spawn knowledge-synthesizer: read ALL past sprint results and agent logs, identify cross-sprint patterns
   - Spawn performance-monitor: compute performance trends (velocity, quality, efficiency)

2. **1:1 Coaching Meetings (step 2):**
   - Identify agents that need coaching this sprint:
     - Agents with stories that required rework
     - Agents that were retried or tier-escalated
     - Agents that received Critical design critiques
     - Agents with below-average confidence contribution
     - Agents active for the first time this project
   - For each identified agent, the orchestrator conducts a 1:1:
     - Reviews the agent's specific performance data (stories, retries, critiques)
     - Identifies root causes for each issue (missing context, wrong assumptions, unclear spec)
     - Writes specific coaching notes — concrete instructions for future invocations
     - Also documents positive reinforcement — what the agent did well to carry forward
   - Write/update: `.pdlc/retrospective/coaching/[agent-name].md` (cumulative profile)
   - **This is the core self-improvement mechanism:** coaching notes from 1:1s are prepended to agent context in ALL future sprint invocations, so agents literally get better over time

3. **Failure analysis (step 3):**
   - Spawn error-coordinator: analyze all failures across the sprint, identify prevention strategies

4. **State update (step 4):**
   - Spawn context-manager: update shared project state with latest learnings
   - Spawn refactoring-specialist (if tech debt flagged): identify code improvements for next sprint

5. **Orchestrator adaptation (step 5):**
   - Read: retro action items, 1:1 coaching notes, pattern analysis, error analysis
   - Adjust for next sprint:
     - **Agent selection:** Swap underperforming agents or add pairing partners per retro suggestions
     - **Sprint sizing:** Adjust story count based on velocity calibration
     - **Story sequencing:** Apply retro action items (e.g., "infra stories first")
     - **Required reading:** Update which docs agents must read per retro feedback
     - **Parallelism:** Adjust based on coordination overhead observed
     - **Coaching delivery:** Ensure updated coaching profiles will be loaded for next sprint
     - **Model tiers:** Upgrade agents that consistently need retries
   - Write updates to:
     - `.pdlc/retrospective/self-improvement-log.md` (append sprint's improvements)
     - `.pdlc/retrospective/agent-performance.json` (update scores)
     - `.pdlc/retrospective/recommendations.md` (overwrite with latest)
     - `.pdlc/retrospective/tech-debt.md` (update debt register)

6. **Update CLAUDE.md (step 6):**
   - Review all changes made during the sprint cycle (DEVELOPMENT through IMPROVE)
   - If any changes affected repo structure, architecture, workflows, integrations, or key file paths, update `CLAUDE.md`
   - This ensures Claude Code always has accurate context about the project for future sessions
   - Check for: new directories/files, architecture changes, workflow changes, agent additions/removals, new integrations

### Transition Decision
After IMPROVE, the orchestrator decides:
- **If `current_sprint < total_planned_sprints`:** increment `current_sprint`, set `current_phase: "DEVELOPMENT"`, continue to next sprint
- **If `current_sprint >= total_planned_sprints`:** set `current_phase: "COMPLETE"`, write final project summary
- **If roadmap needs major adjustment:** set `current_phase: "PLANNING"`, re-plan remaining sprints

### Exit Criteria
- Self-improvement log updated
- Agent performance scores updated
- Recommendations document written
- `CLAUDE.md` updated if sprint cycle changed repo structure, architecture, or workflows
- `config.json` updated with next phase decision

### Error Handling
- IMPROVE phase should always complete (it's analytical)
- If knowledge-synthesizer finds no patterns: note "insufficient data" and proceed

### Max Retries: 1

---

## Phase Timing Guidance

| Phase | Typical Duration | Notes |
|-------|-----------------|-------|
| RESEARCH | 1 session | Can be repeated up to 3 times |
| PLANNING | 1 session | Sequential, moderate complexity |
| DESIGN | 1 session | Parallel design work |
| DEVELOPMENT | 1 session per sprint | Heaviest phase, most agents |
| TESTING | 1 session per sprint | May loop with DEVELOPMENT for fixes |
| DEPLOYMENT | 1 session per sprint | Quick for subsequent sprints |
| REVIEW | 1 session per sprint | Observational, always completes |
| IMPROVE | 1 session per sprint | Analytical, feeds next sprint |

**Total for a 4-sprint project:** ~12-16 sessions (1 research + 1 planning + 1 design + 4 * (dev + test + deploy + review + improve))
