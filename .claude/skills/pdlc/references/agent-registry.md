# PDLC Agent Registry

Complete mapping of all agents to PDLC phases and project types. Read this file when you need to decide which agents to spawn for a given phase or project type.

## Session Execution Protocol

All agents operate under a **session-based execution model** during sprint development:
- Each Claude session = one subtask per agent. Session ends after all agents commit their subtask.
- Stories are decomposed into 8–12 subtasks. Each subtask = one conventional commit.
- Agents resume from `config.json` → `session_progress` in the next session.
- 1–2 hour natural gap between sessions. 5–12 subtask sessions per day (randomized).
- `github-ops-manager` commits each subtask with staggered timestamps per agent (`GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE`) so commits appear at different times.
- Sprint spans 7 days (Monday planning → Sunday integration). Standups track subtasks done/total.

## Required Reading Protocol

All agents listed below are subject to the Required Reading Protocol defined in `phase-definitions.md`. When spawning any agent, the orchestrator MUST include the required reading list for that phase. Additionally, every agent's coaching profile (if it exists at `.pdlc/retrospective/coaching/[agent-name].md`) MUST be loaded and prepended to the agent's context. This is the core self-improvement mechanism.

---

## Phase-to-Agent Mapping

### Phase 1: RESEARCH

Discover trending projects, technologies, and market opportunities.

| Agent | Category | Role | Model | Priority | Spawn Order | Role Tier |
|-------|----------|------|-------|----------|-------------|-----------|
| trend-analyst | 10-research-analysis | Scan technology and social trends for emerging opportunities | sonnet | Primary | 1 (parallel) | Engineer (Tier 3) |
| search-specialist | 10-research-analysis | Deep information retrieval on promising trends | sonnet | Primary | 1 (parallel) | Engineer (Tier 3) |
| market-researcher | 10-research-analysis | Assess market size, dynamics, and opportunity | sonnet | Primary | 1 (parallel) | Engineer (Tier 3) |
| competitive-analyst | 10-research-analysis | Analyze existing solutions and competitive gaps | sonnet | Primary | 2 (after initial scan) | Engineer (Tier 3) |
| data-researcher | 10-research-analysis | Gather supporting data and statistics | sonnet | Supporting | 2 (parallel with competitive) | Engineer (Tier 3) |
| research-analyst | 10-research-analysis | Synthesize findings into actionable recommendations | sonnet | Supporting | 3 (final synthesis) | Engineer (Tier 3) |
| scientific-literature-researcher | 10-research-analysis | Search academic papers for novel approaches | sonnet | Optional | 1 (parallel, for deep-tech projects) | Engineer (Tier 3) |

**Orchestration pattern:** Scatter-gather. Spawn trend-analyst + search-specialist + market-researcher in parallel (wave 1). Feed results to competitive-analyst + data-researcher (wave 2). research-analyst synthesizes everything (wave 3).

**Max concurrent agents:** 3 (wave 1), 2 (wave 2), 1 (wave 3)

---

### Phase 2: PLANNING

Create product specification, define scope, users, and success metrics.

| Agent | Category | Role | Model | Priority | Spawn Order | Role Tier |
|-------|----------|------|-------|----------|-------------|-----------|
| product-manager | 08-business-product | Define product vision, roadmap, feature prioritization | haiku | Primary | 1 | PM (Tier 2) |
| business-analyst | 08-business-product | Document requirements, business processes, acceptance criteria | sonnet | Primary | 2 (after PM) | Engineer (Tier 3) |
| project-manager | 08-business-product | Create WBS, timeline, resource plan, sprint count estimate | haiku | Primary | 3 (after BA) | Engineer (Tier 3) |
| ux-researcher | 08-business-product | Define user personas, journeys, and research plan | sonnet | Supporting | 2 (parallel with BA) | Engineer (Tier 3) |
| technical-writer | 08-business-product | Document product specs and user stories | haiku | Supporting | 4 (after all above) | Engineer (Tier 3) |
| legal-advisor | 08-business-product | Assess compliance and licensing requirements | sonnet | Conditional | 2 (if fintech/health/data-sensitive) | Engineer (Tier 3) |
| scrum-master | 08-business-product | Define sprint structure and ceremonies | haiku | Supporting | 3 (parallel with PM) | Engineer (Tier 3) |

**Orchestration pattern:** Sequential pipeline. product-manager → business-analyst + ux-researcher (parallel) → project-manager + scrum-master (parallel) → technical-writer.

**Max concurrent agents:** 2

---

### Phase 3: DESIGN

Choose technology stack, design system architecture, create ADRs.

| Agent | Category | Role | Model | Priority | Spawn Order | Role Tier |
|-------|----------|------|-------|----------|-------------|-----------|
| cloud-architect | 03-infrastructure | High-level system design, cloud strategy, availability | opus | Primary | 1 | Engineer (Tier 3) |
| api-designer | 01-core-development | API contract design (REST/GraphQL/gRPC) | sonnet | Primary | 2 (after cloud-architect) | Engineer (Tier 3) |
| database-administrator | 03-infrastructure | Data model design, database selection | sonnet | Primary | 2 (parallel with api-designer) | Engineer (Tier 3) |
| security-engineer | 03-infrastructure | Security architecture, threat model, auth design | sonnet | Primary | 2 (parallel) | Engineer (Tier 3) |
| architect-reviewer | 04-quality-security | Review architecture for quality, scalability | opus | Supporting | 3 (after design complete) | Engineer (Tier 3) |
| microservices-architect | 01-core-development | Service decomposition and bounded contexts | opus | Conditional | 2 (if microservices pattern) | Engineer (Tier 3) |
| ui-designer | 01-core-development | UI/UX architecture, design system, component hierarchy | sonnet | Conditional | 2 (if project has frontend) | Engineer (Tier 3) |
| graphql-architect | 01-core-development | GraphQL schema and federation design | opus | Conditional | 2 (if GraphQL chosen) | Engineer (Tier 3) |
| network-engineer | 03-infrastructure | Network topology and security groups | sonnet | Conditional | 2 (if complex networking) | Engineer (Tier 3) |
| postgres-pro | 05-data-ai | PostgreSQL database design, indexing, and optimization | sonnet | Conditional | 2 (if PostgreSQL chosen) | Engineer (Tier 3) |
| sql-pro | 02-language-specialists | Complex SQL query design and database schema optimization | sonnet | Conditional | 2 (if complex SQL needed) | Engineer (Tier 3) |
| prompt-engineer | 05-data-ai | AI/LLM prompt design, optimization, and evaluation | sonnet | Conditional | 2 (if AI/LLM project) | Engineer (Tier 3) |

**Google Stitch MCP Tools (for projects with UI/UX):**

When the project has a frontend component, use Stitch MCP tools during this phase:
1. `enhance-prompt` — Transform product vision + user personas into detailed, framework-specific design specs
2. `stitch-design` — Generate high-fidelity screen designs for all key screens from the product spec
3. `design-md` — Create structured design documentation optimized for code generation
4. `stitch-design` (design system mode) — Synthesize a cohesive design system (colors, typography, spacing, components)

Stitch tools are invoked by the ui-designer agent or directly by the orchestrator. If Stitch MCP is not configured, fall back to ui-designer producing design specs manually.

**Orchestration pattern:** Hub-spoke. cloud-architect produces system design (hub), then api-designer + database-administrator + security-engineer + Stitch design pipeline elaborate in parallel (spokes), architect-reviewer validates.

**Max concurrent agents:** 4 (increased to accommodate Stitch design pipeline)

---

### Phase 4: DEVELOPMENT

Build the product in sprint cycles. Agent selection depends on tech stack chosen in Phase 3.

**Always-present agents (every sprint):**

| Agent | Category | Role | Model | Priority | Role Tier |
|-------|----------|------|-------|----------|-----------|
| scrum-master | 08-business-product | Sprint planning, story decomposition, velocity tracking | haiku | Primary | Engineer (Tier 3) |
| documentation-engineer | 06-developer-experience | Code documentation, README updates | haiku | Supporting | Engineer (Tier 3) |
| api-documenter | 07-specialized-domains | API documentation (OpenAPI/Swagger specs) | haiku | Supporting | Engineer (Tier 3) |
| tooling-engineer | 06-developer-experience | Developer tooling and build pipeline optimization | haiku | Supporting | Engineer (Tier 3) |
| legacy-modernizer | 06-developer-experience | Legacy codebase modernization and migration | sonnet | Conditional (legacy codebases) | Engineer (Tier 3) |

**Sprint 1 only (infrastructure setup):**

| Agent | Category | Role | Model | Priority | Role Tier |
|-------|----------|------|-------|----------|-----------|
| devops-engineer | 03-infrastructure | CI/CD pipeline, repository structure | sonnet | Primary | Engineer (Tier 3) |
| docker-expert | 03-infrastructure | Containerization, Dockerfile optimization | sonnet | Primary | Engineer (Tier 3) |
| git-workflow-manager | 06-developer-experience | Branch strategy, hooks, PR templates | haiku | Primary | Engineer (Tier 3) |
| build-engineer | 06-developer-experience | Build system, bundling, caching | haiku | Supporting | Engineer (Tier 3) |
| dependency-manager | 06-developer-experience | Package setup, lock files, vulnerability baseline | haiku | Supporting | Engineer (Tier 3) |

**Development agents (selected per tech stack, see matrix below):**

Selected dynamically based on tech stack decision from Phase 3. Multiple development agents run in parallel on different stories via multi-agent-coordinator.

**Google Stitch MCP Tools (for frontend development sprints):**

When the project has a frontend and Stitch MCP is configured:
- **Sprint 1 scaffold:** Use `stitch-loop` to generate complete multi-page site/app structure from design docs
- **Per-story UI work:** Use `react-components` to convert screen designs into validated React component systems
- **UI library:** Use `shadcn-ui` for React projects using shadcn/ui to get proper component integration guidance
- **Sprint demo:** Use `remotion` at sprint end to generate walkthrough videos for sprint review

Frontend development agents (react-specialist, frontend-developer, angular-architect, vue-expert) should be instructed to use Stitch tools when available for design-to-code conversion rather than writing UI from scratch.

**Orchestration pattern:** Fork-join. scrum-master creates sprint plan → task-distributor assigns stories to development agents → agents execute in parallel (with Stitch tools for UI stories) → multi-agent-coordinator synchronizes → documentation-engineer updates docs.

**Max concurrent development agents:** 4

---

### Phase 5: TESTING

Validate all sprint deliverables.

| Agent | Category | Role | Model | Priority | Spawn Order | Role Tier |
|-------|----------|------|-------|----------|-------------|-----------|
| qa-expert | 04-quality-security | Test strategy, test plan, test execution | sonnet | Primary | 1 (parallel) | Engineer (Tier 3) |
| test-automator | 04-quality-security | Write automated test suites | sonnet | Primary | 1 (parallel) | Engineer (Tier 3) |
| code-reviewer | 04-quality-security | Code quality, patterns, best practices review | opus | Primary | 1 (parallel) | Engineer (Tier 3) |
| security-auditor | 04-quality-security | Security vulnerability scanning, OWASP check | opus | Primary | 2 (after code exists) | Engineer (Tier 3) |
| performance-engineer | 04-quality-security | Load testing, bottleneck analysis | sonnet | Conditional | 2 (if performance-critical) | Engineer (Tier 3) |
| accessibility-tester | 04-quality-security | WCAG compliance testing | sonnet | Conditional | 2 (if frontend exists) | Engineer (Tier 3) |
| debugger | 04-quality-security | Fix issues found by other testing agents | sonnet | Reactive | 3 (only if issues found) | Engineer (Tier 3) |
| error-detective | 04-quality-security | Root cause analysis for complex bugs | sonnet | Reactive | 3 (only if complex issues) | Engineer (Tier 3) |
| penetration-tester | 04-quality-security | Ethical hacking, exploit testing | sonnet | Conditional | 2 (if security-critical) | Engineer (Tier 3) |
| compliance-auditor | 04-quality-security | Regulatory compliance check | sonnet | Conditional | 2 (if regulated domain) | Engineer (Tier 3) |
| chaos-engineer | 04-quality-security | Chaos engineering and resilience testing | sonnet | Conditional | 2 (if distributed system) | Engineer (Tier 3) |
| database-optimizer | 05-data-ai | Database performance tuning and query optimization | sonnet | Conditional | 2 (if DB performance issues) | Engineer (Tier 3) |
| ad-security-reviewer | 04-quality-security | Active Directory security and GPO audit | sonnet | Conditional | 2 (if Windows/AD environment) | Engineer (Tier 3) |
| powershell-security-hardening | 04-quality-security | PowerShell security hardening and compliance | sonnet | Conditional | 2 (if Windows/PowerShell) | Engineer (Tier 3) |

**Orchestration pattern:** Parallel fan-out for independent testing (wave 1-2), sequential fix-verify cycles (wave 3).

**Max concurrent agents:** 4

---

### Phase 6: DEPLOYMENT

Package and deploy sprint deliverables.

| Agent | Category | Role | Model | Priority | Spawn Order | Role Tier |
|-------|----------|------|-------|----------|-------------|-----------|
| deployment-engineer | 03-infrastructure | Execute deployment, verify rollout | sonnet | Primary | 1 | Engineer (Tier 3) |
| devops-engineer | 03-infrastructure | Pipeline orchestration, environment management | sonnet | Primary | 1 (parallel) | Engineer (Tier 3) |
| docker-expert | 03-infrastructure | Build and push container images | sonnet | Conditional | 1 (if containerized) | Engineer (Tier 3) |
| kubernetes-specialist | 03-infrastructure | K8s manifests, helm charts, rollout | sonnet | Conditional | 2 (if K8s target) | Engineer (Tier 3) |
| terraform-engineer | 03-infrastructure | Infrastructure provisioning and updates | sonnet | Conditional | 1 (if IaC needed) | Engineer (Tier 3) |
| sre-engineer | 03-infrastructure | Monitoring setup, SLI/SLO configuration | sonnet | Supporting | 2 (after deployment) | Engineer (Tier 3) |
| platform-engineer | 03-infrastructure | Developer platform updates | sonnet | Conditional | 2 (if platform changes) | Engineer (Tier 3) |
| azure-infra-engineer | 03-infrastructure | Azure infrastructure and Az PowerShell automation | sonnet | Conditional | 1 (if Azure target) | Engineer (Tier 3) |
| terragrunt-expert | 03-infrastructure | Terragrunt orchestration and DRY IaC | sonnet | Conditional | 1 (if Terragrunt used) | Engineer (Tier 3) |
| windows-infra-admin | 03-infrastructure | Active Directory, DNS, DHCP, GPO automation | sonnet | Conditional | 2 (if Windows infrastructure) | Engineer (Tier 3) |
| devops-incident-responder | 03-infrastructure | DevOps incident management during deployment | sonnet | Reactive | 3 (only if incidents occur) | Engineer (Tier 3) |
| incident-responder | 03-infrastructure | System incident response and recovery | sonnet | Reactive | 3 (only if incidents occur) | Engineer (Tier 3) |
| it-ops-orchestrator | 09-meta-orchestration | IT operations workflow coordination | sonnet | Conditional | 2 (if complex IT ops) | Engineer (Tier 3) |

**Orchestration pattern:** Sequential pipeline. terraform-engineer (if needed) → docker-expert + devops-engineer (parallel) → deployment-engineer → sre-engineer.

**Max concurrent agents:** 2

---

### Phase 7: REVIEW

Evaluate sprint outcomes and run retrospective.

| Agent | Category | Role | Model | Priority | Spawn Order | Role Tier |
|-------|----------|------|-------|----------|-------------|-----------|
| scrum-master | 08-business-product | Sprint retrospective facilitation | haiku | Primary | 1 | Engineer (Tier 3) |
| performance-monitor | 09-meta-orchestration | Collect agent and system performance metrics | haiku | Primary | 1 (parallel) | Engineer (Tier 3) |
| product-manager | 08-business-product | Evaluate delivery against product goals | haiku | Primary | 1 (parallel) | PM (Tier 2) |
| architect-reviewer | 04-quality-security | Architecture quality assessment | opus | Supporting | 2 (after metrics) | Engineer (Tier 3) |
| content-marketer | 08-business-product | Assess market-readiness of deliverables | haiku | Conditional | 2 (if release sprint) | Engineer (Tier 3) |
| customer-success-manager | 08-business-product | Customer satisfaction and success metrics evaluation | haiku | Conditional | 2 (if customer-facing product) | Engineer (Tier 3) |
| sales-engineer | 08-business-product | Technical demo readiness and sales enablement | haiku | Conditional | 2 (if B2B/sales-driven product) | Engineer (Tier 3) |

**Orchestration pattern:** Parallel assessment (wave 1), sequential synthesis (wave 2).

**Max concurrent agents:** 3

---

### Phase 8: IMPROVE

Learn from past sprints and optimize future execution.

| Agent | Category | Role | Model | Priority | Spawn Order | Role Tier |
|-------|----------|------|-------|----------|-------------|-----------|
| knowledge-synthesizer | 09-meta-orchestration | Extract cross-sprint patterns and lessons | sonnet | Primary | 1 | Engineer (Tier 3) |
| performance-monitor | 09-meta-orchestration | Analyze efficiency metrics and trends | haiku | Primary | 1 (parallel) | Engineer (Tier 3) |
| error-coordinator | 09-meta-orchestration | Analyze failure patterns and prevention | sonnet | Supporting | 2 (after data collection) | Engineer (Tier 3) |
| context-manager | 09-meta-orchestration | Update shared project state and context | sonnet | Supporting | 3 (after analysis) | Engineer (Tier 3) |
| refactoring-specialist | 06-developer-experience | Identify code quality improvements for next sprint | sonnet | Conditional | 2 (if tech debt flagged) | Engineer (Tier 3) |
| dx-optimizer | 06-developer-experience | Developer experience and workflow optimization | sonnet | Conditional | 2 (if DX issues flagged) | Engineer (Tier 3) |

**Orchestration pattern:** Sequential analysis. knowledge-synthesizer + performance-monitor (parallel) → error-coordinator → context-manager.

**Max concurrent agents:** 2

---

## Meta-Orchestration Agents (Used Across All Phases)

These agents are invoked by the pdlc-orchestrator as infrastructure, not as phase-specific workers.

**Note:** The three core PDLC agents (pdlc-orchestrator, sprint-ceremony-manager, github-ops-manager) are bundled with this skill in `agents/`. All other agents in this registry are optional — installed separately via the category plugin system. When an optional agent is not available, the orchestrator falls back per its retry/fallback logic.

| Agent | Role in PDLC | When Invoked | Agent Teams Status |
|-------|-------------|--------------|-------------------|
| context-manager | Shared state persistence, cross-agent context | Every phase transition | Kept in both modes |
| multi-agent-coordinator | Parallel agent execution management | Phases 4, 5 (parallel work) | **Replaced** by Agent Teams task coordination in agent-teams mode |
| task-distributor | Work allocation and load balancing | Phase 4 (story assignment) | **Replaced** by TaskCreate + self-assignment in agent-teams mode |
| workflow-orchestrator | Complex process flow management | Phase 4, 6 (multi-step workflows) | Kept in both modes |
| error-coordinator | Failure detection and recovery | Any phase on error | Kept in both modes |
| agent-organizer | Team assembly and capability matching | Phase 3 (selecting dev agents) | Kept in both modes |
| performance-monitor | Metrics collection | Phases 7, 8 | Kept in both modes |
| knowledge-synthesizer | Learning and improvement | Phase 8 | Kept in both modes |
| sprint-ceremony-manager | Sprint ceremony coordination, skill invocation | Phases 4, 7 (all ceremonies) | Kept — becomes Teammate (facilitator) in agent-teams mode |
| github-ops-manager | GitHub operations: commits, PRs, issues, releases, PR reviews. Invoked 5–12x per agent per day for subtask commits with staggered timestamps. | Phases 1-8 (all phases including research commits) | Kept — becomes Teammate (ops) in agent-teams mode |
| it-ops-orchestrator | IT operations workflow coordination | Phase 6 (if complex IT ops) | Kept in both modes |
| agent-installer | Browse and install agents from repository (utility, not auto-spawned) | Manual invocation only | N/A |

---

## Agent Teams Composition

When `execution_mode: "agent-teams"` is active (Claude Code Agent Teams experimental feature enabled), the orchestrator uses a Team Lead + Teammates model instead of subagent spawning for eligible phases. The orchestrator always acts as **Team Lead**. Ineligible phases always use subagent mode regardless of setting.

### Phase Eligibility

| Phase | Agent Teams? | Rationale |
|-------|-------------|-----------|
| RESEARCH | Yes | Research agents self-coordinate wave-based scanning via task dependencies |
| PLANNING | No | Sequential pipeline, max 2 concurrent, needs orchestrator control |
| DESIGN | No | Hub-spoke pattern, Stitch MCP is orchestrator-driven |
| DEVELOPMENT | **Yes (primary)** | 4 concurrent dev Teammates self-assign sprint stories, peer-coordinate |
| TESTING | Yes | Independent test streams, real-time peer critique debates |
| DEPLOYMENT | No | Safety-critical sequential steps, needs orchestrator gating |
| REVIEW | Yes | Concurrent demos, peer retro reflections via messaging |
| IMPROVE | No | Orchestrator-driven coaching and analysis, inherently hierarchical |

### Team Composition per Phase

**RESEARCH Team (6 potential Teammates):**

| Agent | Teams Role | Task Type |
|-------|-----------|-----------|
| trend-analyst | Teammate | Wave 1: trend scanning |
| search-specialist | Teammate | Wave 1: project search |
| market-researcher | Teammate | Wave 1: market analysis |
| competitive-analyst | Teammate | Wave 2: competitive analysis |
| data-researcher | Teammate | Wave 2: data collection |
| research-analyst | Teammate (synthesis) | Wave 3: synthesis + selection |

Max concurrent: 3 (wave 1). Teammates cross-pollinate findings via messaging during waves.

**DEVELOPMENT Team (dynamic, based on sprint plan):**

| Agent | Teams Role | Task Type |
|-------|-----------|-----------|
| [sprint dev agents] | Teammate | Story execution (self-assign from task list) |
| sprint-ceremony-manager | Teammate (facilitator) | Standup/ceremony tasks |
| github-ops-manager | Teammate (ops) | Commit/PR/issue tasks |
| product-manager | Teammate (advisory) | Sprint goal clarification, story acceptance |

Max concurrent devs: 4. Dev Teammates self-assign stories matching their `agent_type`, highest priority first. Sprint ceremony-manager picks up ceremony tasks between story waves.

**TESTING Team (up to 8 Teammates):**

| Agent | Teams Role | Task Type |
|-------|-----------|-----------|
| qa-expert | Teammate | Wave 1: functional testing |
| test-automator | Teammate | Wave 1: test automation |
| code-reviewer | Teammate | Wave 1: code quality review |
| architect-reviewer | Teammate | Wave 1.5: architecture critique (messages original dev directly) |
| security-auditor | Teammate (conditional) | Wave 2: security testing |
| performance-engineer | Teammate (conditional) | Wave 2: performance testing |
| accessibility-tester | Teammate (conditional) | Wave 2: a11y testing (if frontend) |
| debugger | Teammate (reactive) | Wave 3: bug fixing (created by other Teammates) |

Max concurrent: 4. Wave 1.5 critique loop uses direct Teammate messaging for real-time debate with original developers.

**REVIEW Team (dynamic, includes all sprint participants):**

| Agent | Teams Role | Task Type |
|-------|-----------|-----------|
| scrum-master | Teammate (facilitator) | Review + retro facilitation |
| product-manager | Teammate (evaluator) | Sprint goal evaluation |
| performance-monitor | Teammate | Metrics collection |
| [all sprint dev agents] | Teammate | Demo their completed stories |
| architect-reviewer | Teammate | Architecture evaluation |

Max concurrent: 3. Each dev Teammate posts demo via messaging; PM evaluates concurrently.

---

## External Skills Registry

These external skills enhance PDLC ceremonies when installed. They are invoked via the Skill tool, not as agents. The orchestrator checks availability at initialization and records it in config.json.

| Skill Name | Source | Ceremony | Phase(s) | Fallback |
|------------|--------|----------|----------|----------|
| `sprint-planning` | anthropics/knowledge-work-plugins | Sprint Planning Meeting | DEVELOPMENT | Built-in planning ceremony |
| `scrum-master` | aj-geddes/claude-code-bmad-skills | Sprint Planning + Execution | DEVELOPMENT | Built-in scrum-master agent |
| `task-estimation` | supercent-io/skills-template | Sprint Planning (estimation) | DEVELOPMENT | Built-in Fibonacci estimation |
| `standup-meeting` | supercent-io/skills-template | Daily Standups | DEVELOPMENT | Built-in standup format |
| `sprint-retrospective` | supercent-io/skills-template | Sprint Retrospective | REVIEW | Built-in retro format |
| `roadmap-update` | anthropics/knowledge-work-plugins | Roadmap Create/Update/Reprioritize | PLANNING, REVIEW | Product-manager + template |
| `remotion-best-practices` | remotion-dev/skills | Sprint demo video generation | REVIEW | Skip video, use written demos |
| `git-commit` | github/awesome-copilot | Conventional commits with smart staging | DEVELOPMENT | Manual git commit |
| `github-issues` | github/awesome-copilot | Issue creation/management via MCP + gh CLI | PLANNING, DEVELOPMENT, TESTING, IMPROVE | Manual gh issue create |
| `gh-cli` | github/awesome-copilot | Full GitHub CLI operations (repos, PRs, actions, releases) | ALL | Direct gh commands |
| `pr-create` | custom | Structured sprint PR creation with test plan | DEPLOYMENT | Manual gh pr create |
| `prd` | github/awesome-copilot | PRD generation with discovery + analysis + drafting | PLANNING | Manual document writing |
| `excalidraw-diagram-generator` | github/awesome-copilot | Architecture and system diagrams (Excalidraw format) | DESIGN | Manual diagram tools |

### Skills vs Agents
- **Skills** provide methodology and structure (frameworks, formats, scoring methods)
- **Agents** provide execution and artifact production (code, documents, analysis)
- Skills are invoked before/during agent ceremonies to provide structured inputs
- Agents produce the actual PDLC artifacts using skill-provided structure

### Install Commands
```bash
# Skills are installed in .claude/skills/ or .agents/skills/ -- verify they exist before each PDLC run
# Ceremony: sprint-planning, scrum-master, task-estimation, standup-meeting, sprint-retrospective, roadmap-update
# GitHub: git-commit, github-issues, gh-cli, pr-create, prd, excalidraw-diagram-generator
# Video: remotion-best-practices
```

---

## Tech Stack Decision Matrix

Used during Phase 3 (DESIGN) to select which development agents to assign for Phase 4 (DEVELOPMENT).

### Project Type Detection

The orchestrator reads the project description from Phase 2 outputs and matches against these keywords to determine project type. Multiple types can apply (e.g., Full-stack Web + Data/ML).

### Web SPA (Single Page Application)

**Detection keywords:** dashboard, web app, portal, admin panel, interactive UI
**Language agents:** typescript-pro, javascript-pro
**Framework agents (pick one based on requirements):**
- react-specialist — Default for most SPAs, largest ecosystem
- angular-architect — Enterprise apps with complex forms, strict typing needed
- vue-expert — Rapid prototyping, simpler learning curve

**Core dev agents:** frontend-developer
**Infra agents:** build-engineer

### Full-stack Web Application

**Detection keywords:** full-stack, CRUD, SaaS, platform, marketplace, social
**Language agents:** typescript-pro + python-pro (or typescript-pro only for JS-full-stack)
**Framework agents (pick one stack):**
- nextjs-developer + react-specialist — SSR, SEO-important, React ecosystem
- fullstack-developer + fastapi-developer — Python backend + any frontend
- fullstack-developer + django-developer — Rapid development, admin-heavy
- fullstack-developer + spring-boot-engineer — Enterprise Java

**Core dev agents:** backend-developer, frontend-developer
**Infra agents:** devops-engineer, docker-expert

### REST API / Backend Service

**Detection keywords:** API, microservice, backend, service, webhook, integration
**Language agents (pick one):**
- python-pro + fastapi-developer — Fast development, async, modern Python
- golang-pro — High-performance, concurrent services
- java-architect + spring-boot-engineer — Enterprise, complex business logic
- rust-engineer — Systems-level performance, safety-critical

**Core dev agents:** backend-developer, api-designer
**Infra agents:** devops-engineer, docker-expert

### Mobile Application

**Detection keywords:** iOS, Android, mobile, app store, native
**Language/framework agents (pick one):**
- mobile-developer (React Native) — Cross-platform, JS ecosystem
- expo-react-native-expert — Expo + React Native, managed workflow
- mobile-app-developer + flutter-expert — Cross-platform, Dart, rich UI
- swift-expert — iOS native only
- kotlin-specialist — Android native only

**Core dev agents:** mobile-developer OR mobile-app-developer
**Infra agents:** devops-engineer

### CLI Tool

**Detection keywords:** CLI, command-line, terminal, script, automation tool
**Language agents (pick one):**
- golang-pro — Single binary, fast, great stdlib
- rust-engineer — Performance-critical, safety
- python-pro — Rapid development, scripting

**Core dev agents:** cli-developer
**Infra agents:** build-engineer

### Data / ML Pipeline

**Detection keywords:** ML, AI, data pipeline, model, training, prediction, analytics
**Language agents:** python-pro
**Framework agents (pick based on scope):**
- data-engineer + ml-engineer — Full ML pipeline
- data-engineer + machine-learning-engineer — ML systems and model deployment
- data-scientist + data-analyst — Analysis and insights focus
- ai-engineer + llm-architect — LLM/AI application
- nlp-engineer — Text/language processing
- reinforcement-learning-engineer — RL agents and training

**Core dev agents:** data-engineer, ml-engineer OR ai-engineer
**Infra agents:** mlops-engineer, cloud-architect

### Blockchain / Web3

**Detection keywords:** Web3, smart contract, DeFi, NFT, token, blockchain
**Core agents:** blockchain-developer
**Supporting:** fintech-engineer, security-auditor
**Infra agents:** devops-engineer

### IoT System

**Detection keywords:** sensor, device, embedded, firmware, IoT, connected
**Language agents:** cpp-pro, python-pro
**Core agents:** iot-engineer, embedded-systems
**Supporting:** cloud-architect, data-engineer
**Infra agents:** devops-engineer

### Game

**Detection keywords:** game, interactive, real-time, multiplayer, engine
**Language agents:** cpp-pro OR csharp-developer
**Core agents:** game-developer
**Supporting:** performance-engineer, websocket-engineer (if multiplayer)
**Infra agents:** devops-engineer

### WordPress / CMS

**Detection keywords:** blog, CMS, content site, WordPress, WooCommerce
**Core agents:** wordpress-master
**Supporting:** seo-specialist, content-marketer
**Infra agents:** devops-engineer

### Fintech / Payment System

**Detection keywords:** payment, banking, trading, fintech, financial, transaction
**Core agents:** fintech-engineer, payment-integration
**Supporting:** security-auditor, compliance-auditor, risk-manager, quant-analyst
**Language agents:** java-architect OR python-pro
**Infra agents:** cloud-architect, devops-engineer

### Desktop Application

**Detection keywords:** desktop, Electron, native app, cross-platform desktop
**Core agents:** electron-pro
**Language agents:** typescript-pro
**Supporting:** ui-designer
**Infra agents:** build-engineer

### .NET Application

**Detection keywords:** .NET, C#, ASP.NET, Blazor, Entity Framework, WPF, MAUI
**Language agents:**
- dotnet-core-expert — .NET 8 cross-platform (modern projects)
- dotnet-framework-4.8-expert — Legacy .NET Framework (enterprise maintenance)
- csharp-developer — C# language expertise

**Core dev agents:** backend-developer
**Infra agents:** devops-engineer, docker-expert, azure-infra-engineer

### PHP Application

**Detection keywords:** PHP, Laravel, Symfony, WordPress, Composer
**Language agents:**
- php-pro — PHP development
- laravel-specialist — Laravel 10+ framework
- symfony-specialist — Symfony 6+/7+/8+ framework

**Core dev agents:** backend-developer, fullstack-developer
**Infra agents:** devops-engineer, docker-expert

### Ruby on Rails

**Detection keywords:** Ruby, Rails, ActiveRecord, Hotwire, Turbo
**Language agents:** rails-expert
**Core dev agents:** fullstack-developer
**Infra agents:** devops-engineer, docker-expert

### Elixir / Phoenix

**Detection keywords:** Elixir, Phoenix, OTP, LiveView, fault-tolerant
**Language agents:** elixir-expert
**Core dev agents:** backend-developer
**Infra agents:** devops-engineer, docker-expert

### PowerShell / Windows Automation

**Detection keywords:** PowerShell, Windows automation, Active Directory, GPO, Azure AD, WinForms, WPF
**Language agents:**
- powershell-7-expert — Cross-platform PowerShell 7+ (modern)
- powershell-5.1-expert — Windows PowerShell 5.1 (legacy)
- powershell-module-architect — PowerShell module development
- powershell-ui-architect — PowerShell UI/TUI (WinForms, WPF)

**Supporting:** windows-infra-admin, ad-security-reviewer, m365-admin
**Infra agents:** azure-infra-engineer

### Microsoft 365 / Enterprise

**Detection keywords:** Microsoft 365, Exchange Online, Teams, SharePoint, Entra ID, Graph API
**Core agents:** m365-admin
**Supporting:** powershell-7-expert, azure-infra-engineer, ad-security-reviewer
**Infra agents:** windows-infra-admin

### MCP Tool / AI Agent

**Detection keywords:** MCP server, Model Context Protocol, AI tool, Claude tool, agent framework
**Core agents:** mcp-developer
**Supporting:** prompt-engineer, llm-architect, ai-engineer
**Language agents:** typescript-pro OR python-pro
**Infra agents:** devops-engineer

### Slack Integration

**Detection keywords:** Slack bot, Slack app, @slack/bolt, Slack API, workspace integration
**Core agents:** slack-expert
**Language agents:** typescript-pro OR python-pro
**Infra agents:** devops-engineer

### Real-time Communication

**Detection keywords:** WebSocket, real-time, chat, live, streaming, collaboration
**Core agents:** websocket-engineer
**Supporting:** backend-developer, frontend-developer
**Language agents:** typescript-pro OR golang-pro
**Infra agents:** devops-engineer, sre-engineer
