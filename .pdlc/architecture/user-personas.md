# User Personas: MCP Verify

**Document Version:** 1.0
**Author:** Product Manager (Tier 2 PM)
**Date:** 2026-03-28
**Status:** Approved — Planning Phase
**Companion Documents:** product-vision.md, project-selection.md

---

## Overview

This document defines the three primary user personas for MCP Verify and serves as the canonical reference for UX decisions, CLI design choices, output format requirements, and feature prioritization throughout the product development lifecycle.

MCP Verify exists at the intersection of three distinct jobs-to-be-done:

1. **Individual correctness** — a developer verifying their own server before shipping
2. **Organizational governance** — a platform team enforcing standards across a fleet of servers
3. **Regulatory compliance** — an enterprise compliance function producing auditable evidence

These three jobs map to three distinct personas. They are not mutually exclusive — a single person may exhibit traits from multiple personas — but understanding them separately produces cleaner product decisions.

---

## Persona 1: Platform Dev Paulo

### Persona Card

| Field | Value |
|-------|-------|
| **Name** | Paulo (he/him) |
| **Role** | Backend or full-stack developer |
| **Experience** | 3-8 years total; 1-2 years with MCP |
| **Primary Stack** | TypeScript (Node.js) or Python; GitHub; GitHub Actions or CircleCI |
| **Daily Tools** | npm / npx, VS Code or Neovim, curl, Docker |
| **Work Context** | Building an MCP server — either an internal tool server for their company's AI features, or an open-source server intended for the MCP registry |
| **Team Size** | Solo to 3-person squad; ships to a larger engineering org |
| **Decision Power** | Full autonomy over tooling choices within their project |

**Goals:**

1. Ship an MCP server that works correctly with all mainstream MCP clients without mysterious silent failures or incompatibility surprises.
2. Catch spec conformance issues and security gaps before code review, not during code review or after production incidents.
3. Establish a CI gate that automatically blocks regressions without requiring any manual verification effort after initial setup.

**Frustrations:**

1. MCP Inspector is useful for exploratory debugging but gives no definitive answer on whether a server is correct — it is a mirror, not a judge.
2. The MCP specification covers JSON-RPC 2.0 plus multiple protocol layers (initialization, tools, resources, prompts, transport). Developers routinely miss required fields or misunderstand capability semantics; there is no automated check to catch this.
3. Security mistakes in tool input schemas — leaving string fields unrestricted when they will be passed to subprocesses — are invisible until a security review or an incident.

**Representative Quote:**

> "I just want to run one command and know my server is correct. Not 'probably fine' — actually correct. And I want CI to catch it if I break it next week."

---

### User Journey Map

#### Stage 1: Discovery

**Trigger:** Paulo is debugging a frustrating client compatibility issue. His MCP server works with one client but behaves unexpectedly with another. He searches for "MCP server validation tool" or "MCP spec conformance check."

**Actions:**
- Finds MCP Verify via npm search, GitHub trending, or a mention in an MCP-focused Discord or blog post
- Reads the README to understand what the tool actually checks
- Notices the zero-account requirement and `npx` install path

**Emotional state:** Mildly skeptical — he has found tools that claim to solve this problem before and they required accounts, configuration, or were debug-only tools repackaged as validators.

**What MCP Verify must do at this stage:** The README and npm page must communicate the value proposition in one sentence. The zero-account, zero-config requirement must be prominent. A concrete example command with sample output must appear before the fold.

---

#### Stage 2: First Use

**Trigger:** Paulo runs `npx mcp-verify` against his server for the first time, expecting either an immediate score or an immediate error.

**Actions:**
- Runs `npx mcp-verify http://localhost:3000` or `npx mcp-verify stdio://./my-server.js`
- Reads the terminal output
- If findings are returned, opens the relevant source file to investigate
- Runs the command a second time after making a fix to verify the fix worked

**Emotional state:** Curious and slightly anxious. He is about to find out whether his server has problems he did not know about. A high conformance score with no security findings will generate relief and trust. A confusing error message or a false positive will generate frustration and disengagement.

**What MCP Verify must do at this stage:** Complete in under 10 seconds. Produce output Paulo can read without consulting documentation. Every finding must include a specific description of what is wrong and a concrete remediation step. Exit codes must behave exactly as documented.

---

#### Stage 3: Evaluation

**Trigger:** The first run produced useful findings. Paulo has fixed one or two issues. He is now deciding whether to add this to his standard workflow and CI pipeline.

**Actions:**
- Runs the tool against a second server or a different version of the same server
- Checks whether the JSON output format is useful for scripting
- Reviews the GitHub Action documentation to understand CI integration
- May look at the issue tracker to assess project health and responsiveness

**Emotional state:** Deliberately evaluating trust. He is asking: "Will this tool give me correct results consistently, or will it produce noise that trains me to ignore it?"

**What MCP Verify must do at this stage:** Demonstrate consistent, accurate behavior across different server configurations. The GitHub Action documentation must be clear enough to set up in under 5 minutes. The issue tracker must show active maintenance.

---

#### Stage 4: Integration

**Trigger:** Paulo decides to integrate MCP Verify into his CI pipeline and local pre-commit workflow.

**Actions:**
- Adds the GitHub Action to `.github/workflows/mcp-verify.yml`
- Creates a `.mcp-verify.json` configuration file to set project-appropriate thresholds
- Optionally adds an npm script (`"verify": "mcp-verify http://localhost:3000"`) for local use
- Sets `fail-on-severity: high` and `conformance-threshold: 80` as defaults
- Shares the configuration approach with his team

**Key CLI interactions at this stage:**
```bash
# Local development verification
npx mcp-verify http://localhost:3000

# Verify a stdio server
npx mcp-verify stdio://./dist/server.js

# JSON output for scripting
npx mcp-verify --format json http://localhost:3000 | jq '.summary'

# Verify with explicit config file
npx mcp-verify --config .mcp-verify.json http://localhost:3000

# Regression check against previous run
npx mcp-verify --compare-last http://localhost:3000
```

**Sample `.mcp-verify.json` for Paulo's workflow:**
```json
{
  "failOnSeverity": "high",
  "conformanceThreshold": 80,
  "transport": "http",
  "timeout": 10000
}
```

**Emotional state:** Committed. He has invested time in integration and wants it to work reliably. Reliability matters more than polish.

---

#### Stage 5: Advocacy

**Trigger:** MCP Verify has been running in CI for several weeks. It caught a real regression — a refactor that accidentally removed a required capability field — before it reached production.

**Actions:**
- Mentions MCP Verify in a pull request comment or team Slack
- Stars the GitHub repository
- Recommends it in the MCP Discord or a blog post
- May submit a bug report or feature request

**Emotional state:** Genuine advocacy based on demonstrated value. He is not promoting MCP Verify as a concept; he is sharing a tool that solved a real problem.

**What MCP Verify must do at this stage:** Have a clear issue tracker and CONTRIBUTING guide so advocacy converts to community contribution. GitHub Stars and a healthy issue response rate reinforce the decision to advocate.

---

### Usability Requirements

For Paulo, the experience of using MCP Verify must feel like:

- **Fast:** A 10-second result is fine. A 30-second result breaks flow. A 60-second result is unacceptable for a local development loop.
- **Definitive:** The output must give a clear answer. "Your server passes at 91/100 with 0 security findings" is good. "Some checks may have issues" is not.
- **Actionable:** Every finding must include enough information to act on it immediately. "Tool input schema missing required field" with the tool name and field name is good. "Schema error" is not.
- **Trustworthy:** False positives destroy trust faster than missing detections. Paulo would rather have a tool that finds 4 real problems than one that finds 7 problems where 3 are false alarms.
- **Invisible when passing:** When the server is healthy, the CI step should add no friction. Green means green — no noise, no warnings about non-issues.

---

### Pain Points and How MCP Verify Addresses Them

| Paulo's Pain | How MCP Verify Addresses It |
|-------------|----------------------------|
| No automated way to validate spec conformance | P0.1 conformance scoring against the full MCP specification: JSON-RPC 2.0, initialization, tools, resources, prompts, and transport layers |
| Easy to miss required fields or misunderstand capability semantics | Per-category score breakdown surfaces exactly which layer has issues; per-check results name the specific missing or malformed field |
| No way to gate a PR on spec health | P0.3 exit codes (0/1/2) integrate directly with CI; GitHub Action (P1.1) provides native PR gating with configurable thresholds |
| Security vulnerabilities in tool schemas are invisible during development | P0.2 security engine analyzes tool `inputSchema` patterns for command injection susceptibility before they reach production |
| MCP Inspector requires manual use and cannot be part of CI | Zero-config CLI designed specifically for non-interactive automation; executes in under 10 seconds |

---

## Persona 2: DevOps Lead Dana

### Persona Card

| Field | Value |
|-------|-------|
| **Name** | Dana (she/her) |
| **Role** | Platform engineer or DevOps lead |
| **Experience** | 5-12 years total; 2-3 years on AI infrastructure |
| **Primary Stack** | Terraform / Pulumi, GitHub Enterprise or GitLab, Snyk, Dependabot, Semgrep, Datadog |
| **Daily Tools** | GitHub Enterprise, centralized CI/CD pipelines, SIEM dashboards, security scanning runners |
| **Work Context** | Managing a portfolio of 5-50 internal MCP servers across multiple engineering teams. Responsible for the security posture, health, and governance of the company's AI infrastructure layer. |
| **Team Size** | 2-5 platform engineers; serves 20-200 developers across the engineering org |
| **Decision Power** | Sets standards and required tooling for the engineering organization; can mandate adoption via CI templates |

**Goals:**

1. Establish a consistent, automated conformance and security gate across every internal MCP server without requiring per-developer account setup or manual configuration.
2. Produce structured reports ingested into existing security dashboards and SIEM tools so MCP server health is visible alongside other infrastructure metrics.
3. Configure environment-appropriate pass/fail thresholds — more permissive in development, zero-tolerance for security findings blocking production deployments.

**Frustrations:**

1. Each team's MCP server is a black box from a security and conformance perspective. There is no shared standard, no automated gate, and no visibility into aggregate health across the portfolio.
2. Snyk Agent-Scan requires per-developer accounts and API keys, which creates friction in centralized CI pipelines and raises cost and procurement questions at scale.
3. When asked to produce a conformance report for a quarterly security review, there is nothing to show — no repeatable verification procedure and no structured output.

**Representative Quote:**

> "I don't want every team making independent decisions about whether their MCP server is 'good enough.' I want one standard, applied consistently, with structured output I can actually put in a dashboard."

---

### User Journey Map

#### Stage 1: Discovery via Developer Adoption

**Trigger:** Dana sees MCP Verify appearing in pull requests across the engineering organization — developers have started adopting it independently after finding it through Paulo's advocacy. She investigates what it is and whether it should be standardized.

**Actions:**
- Reviews what the tool checks and whether it produces structured output
- Evaluates the GitHub Action documentation
- Checks whether JSON output follows a documented, versioned schema
- Looks for configuration options to set org-wide thresholds

**Emotional state:** Cautious optimism. She has seen promising developer tools that were unsuitable for org-wide standardization because they lacked configuration options, produced unstable output schemas, or required per-user credentials. She is assessing fit, not enthusiasm.

**What MCP Verify must do at this stage:** The documentation must clearly explain JSON output schema, GitHub Action inputs, configuration file options, and exit code semantics. The schema must be versioned and stable. The tool must require zero per-user credentials.

---

#### Stage 2: Evaluation for Org-Wide Rollout

**Trigger:** Dana decides to evaluate MCP Verify seriously. She runs it against 5-10 internal MCP servers to assess accuracy and false positive rate before recommending org-wide adoption.

**Actions:**
- Runs `npx mcp-verify --format json` against multiple servers and reviews the output schema
- Tests configurable thresholds: does `fail-on-severity: critical` actually exit 1 only on Critical findings?
- Tests the GitHub Action in a sandboxed repo to verify PR annotation behavior
- Evaluates whether the check suppression mechanism (`skip` with `justification`) is auditable
- Checks the npm package size and Node.js version compatibility

**Key CLI interactions at this stage:**
```bash
# JSON output for schema review
npx mcp-verify --format json http://internal-mcp.company.com > report.json

# Inspect schema version provenance
cat report.json | jq '.meta.version'

# Test exit code behavior under different severity thresholds
npx mcp-verify --format json http://internal-mcp.company.com; echo "Exit: $?"

# Test with explicit severity threshold flag
npx mcp-verify --format json --fail-on-severity critical http://internal-mcp.company.com
```

**Emotional state:** Systematic and skeptical. She is running a structured evaluation, not a casual trial. The tool either meets her criteria or it does not.

**What MCP Verify must do at this stage:** JSON output schema must be consistent and documented. Configuration options must work exactly as documented. The `--fail-on-severity` flag must have predictable, deterministic behavior. Package size and dependency footprint must be acceptable for centralized runner environments.

---

#### Stage 3: Deployment as Organization Standard

**Trigger:** Dana approves MCP Verify for org-wide adoption and begins deploying it via CI template.

**Actions:**
- Creates a reusable GitHub Actions workflow template that includes MCP Verify
- Sets default thresholds in a shared `.mcp-verify.json` template: `fail-on-severity: high` for production, `fail-on-severity: critical` for development
- Configures JSON output to be saved as a CI artifact and optionally forwarded to the SIEM
- Documents the standard in the internal developer portal
- Monitors aggregate findings across the organization through dashboard integration

**Key CLI interactions and GitHub Action configuration:**
```yaml
# .github/workflows/mcp-verify.yml (org template)
name: MCP Verify
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start MCP server
        run: npm start &
      - uses: mcp-verify/action@v1
        with:
          target: http://localhost:3000
          fail-on-severity: high
          conformance-threshold: 75
          format: json
      - name: Upload report artifact
        uses: actions/upload-artifact@v4
        with:
          name: mcp-verify-report
          path: mcp-verify-report.json
```

**Sample organization-standard `.mcp-verify.json`:**
```json
{
  "failOnSeverity": "high",
  "conformanceThreshold": 75,
  "timeout": 15000
}
```

**Emotional state:** Focused on reliability and maintainability. She needs the tool to behave predictably at scale. An update that breaks the JSON schema or changes exit code behavior is a production incident across 50 repos.

---

#### Stage 4: Ongoing Governance and Monitoring

**Trigger:** MCP Verify is running in CI across the organization's MCP server repos. Dana monitors aggregate health and handles escalations when teams request check suppressions.

**Actions:**
- Reviews quarterly security reports that include MCP Verify findings aggregated across the fleet
- Evaluates suppression requests from teams — a check suppressed with no justification is a policy violation
- Updates the org-standard configuration when MCP spec versions change or new vulnerability categories are added
- Monitors for MCP Verify releases that affect the output schema or exit code behavior

**Key CLI interactions at this stage:**
```bash
# Export report for SIEM ingestion with date-stamped filename
npx mcp-verify --format json http://internal-mcp.company.com > $(date +%Y%m%d)-report.json

# Detect regressions since previous run
npx mcp-verify --compare-last http://internal-mcp.company.com

# Markdown report for security review documentation
npx mcp-verify --format markdown http://internal-mcp.company.com > security-review-$(date +%Y%m%d).md
```

**Emotional state:** Steady-state management. The tool has become infrastructure. Reliability and schema stability matter more than new features.

---

#### Stage 5: Advocacy to Peer Organizations

**Trigger:** At a platform engineering conference or internal community of practice, Dana is asked how her organization manages MCP server quality. She describes MCP Verify as part of the standard AI infrastructure stack.

**Actions:**
- Shares the org template workflow with peers at other companies
- May contribute to the MCP Verify documentation or open an issue for an enterprise feature request (e.g., multi-server batch execution)
- Recommends MCP Verify to the central security team for inclusion in the company's official tool registry

**Emotional state:** Confident and pragmatic. She is not an enthusiast; she is sharing a working solution to a real problem.

---

### Usability Requirements

For Dana, the experience of using MCP Verify must feel like:

- **Predictable:** Schema changes are versioned and announced. Configuration option behavior is deterministic and documented. Exit codes never change semantics between versions.
- **Configurable without fragmentation:** The same tool must serve dev, staging, and production with only configuration differences. Dana should not need to maintain multiple tool versions per environment.
- **Integration-native:** JSON output should require no post-processing to be ingested into standard SIEM tools. The GitHub Action must use standard GitHub Actions patterns (status checks, artifact upload, PR annotations).
- **Operable at scale:** Running against 50 servers in a matrix build must behave the same as running against one. No shared state, no rate limits, no per-repo setup beyond the configuration file.
- **Auditable suppressions:** When a team suppresses a check, the suppression must be explicit, require a justification field, and appear in the report output — not silently omitted.

---

### Pain Points and How MCP Verify Addresses Them

| Dana's Pain | How MCP Verify Addresses It |
|------------|----------------------------|
| No consistent standard or automated gate across the MCP server portfolio | P1.1 GitHub Action deployable as an org-wide CI template; configurable thresholds in `.mcp-verify.json` create a consistent standard |
| Snyk Agent-Scan requires per-developer accounts, blocking centralized adoption | Zero-account, zero-credential design; no API keys; runs as a standard CI step with no external service dependencies |
| No structured output for security dashboards or quarterly reviews | P1.2 versioned JSON schema with `meta`, `conformance`, `security`, and `summary` sections; machine-readable from the first release |
| No way to configure different thresholds for dev vs. production environments | P1.4 configurable `failOnSeverity` and `conformanceThreshold` per environment via configuration file or GitHub Action input parameters |
| Suppressions are invisible and unauditable | `skip` entries in configuration require a `justification` field; suppressions appear in the report output with the documented justification |

---

## Persona 3: Compliance Architect Chris

### Persona Card

| Field | Value |
|-------|-------|
| **Name** | Chris (they/them) |
| **Role** | AI governance lead, enterprise architect, or CISO-adjacent compliance function |
| **Experience** | 10-20 years total in enterprise architecture or compliance; relatively new to AI-specific tooling |
| **Primary Stack** | Jira, Confluence, SharePoint, internal audit management systems; may not write code |
| **Daily Tools** | Word processing and presentation tools, audit management platforms, legal review workflows |
| **Work Context** | Preparing for EU AI Act Articles 9-17 compliance at a large enterprise. Legal team has flagged that automated AI tools acting on MCP server outputs may constitute high-risk AI use under the Act. Needs documented, auditable evidence of validation procedures for each MCP server in scope. |
| **Team Size** | 2-10 person compliance and governance team; interfaces with legal, security, and engineering |
| **Decision Power** | Can require engineering teams to produce specific artifacts; cannot mandate specific implementation choices |

**Goals:**

1. Demonstrate to auditors and legal counsel that every MCP server in scope has been validated according to a documented, repeatable procedure — not ad-hoc manual testing.
2. Produce dated conformance records that can be stored in the audit trail and referenced in EU AI Act compliance documentation before the August 2026 enforcement deadline.
3. Establish an ongoing validation cadence so the compliance record remains current — a single point-in-time certificate is not sufficient for continuous compliance.

**Frustrations:**

1. No tool currently produces a structured, dated conformance certificate for an MCP server. Manual testing notes in Confluence do not constitute a repeatable validation procedure under EU AI Act Article 9 requirements.
2. Engineering teams describe their MCP servers as "working" and "tested" but cannot produce documentation of what was tested, what methodology was used, or what the test results were.
3. The August 2026 EU AI Act enforcement deadline is approaching rapidly. The compliance function needs to move from ad-hoc testing to documented procedure in a compressed timeline.

**Representative Quote:**

> "I need to show an auditor a dated document that says 'this specific server was validated against this specific methodology on this specific date and passed.' Not a developer saying it works. A document."

---

### User Journey Map

#### Stage 1: Discovery via Legal and Compliance Requirement

**Trigger:** Chris's legal team produces a gap analysis for EU AI Act compliance. One of the gaps: "No documented validation procedure for MCP servers used in automated decision pipelines." Chris searches for MCP server validation tools that produce auditable output.

**Actions:**
- Searches for "MCP server compliance" or "MCP server audit documentation"
- Reviews the MCP Verify documentation to understand what the tool produces
- Specifically looks for: dated output, defined scoring methodology, human-readable reports

**Emotional state:** Urgency combined with unfamiliarity. Chris understands compliance requirements clearly but is not a developer and may be uncomfortable evaluating technical tools. The tool must communicate its value in non-technical terms as well as technical ones.

**What MCP Verify must do at this stage:** The documentation must include a section or example explicitly addressing compliance use cases. The Markdown report format must be prominent in the documentation. A sample report showing the dated header, score, methodology reference, and findings must be available as an example.

---

#### Stage 2: Evaluation of Methodology

**Trigger:** Chris has identified MCP Verify as a candidate tool. Before recommending it to the compliance program, they need to understand and document the scoring methodology — auditors will ask how the score is calculated.

**Actions:**
- Reviews the scoring methodology documentation: what does a 0-100 conformance score mean? What are the categories? How are security findings classified?
- Asks an engineering team member to run MCP Verify against a test server and share the Markdown report
- Reviews the Markdown report for suitability as an audit trail artifact
- Checks whether the tool version and spec version are included in the report — auditors require version provenance

**Sample report sections Chris evaluates:**
```markdown
# MCP Verify Report

**Generated:** 2026-03-28T14:32:01Z
**Tool Version:** mcp-verify@1.0.0
**Target:** https://internal-mcp.company.com/api
**MCP Spec Version:** 2024-11-05
**Duration:** 4.2s

## Conformance Score: 88/100

| Category          | Score  | Status |
|-------------------|--------|--------|
| Initialization    | 100/100 | Pass  |
| Tool Schema       | 85/100  | Pass  |
| Resources Protocol| 90/100  | Pass  |
| ...               | ...     | ...   |

## Security Findings: 0 Critical, 0 High, 1 Medium

### [MEDIUM] Information leakage in error responses
**Component:** Error handler
**Description:** Verbose error responses expose internal stack traces...
**Remediation:** Configure error handler to return sanitized messages in production.
```

**Emotional state:** Methodical and documentation-focused. Chris is not evaluating whether the tool is technically correct — that is the engineering team's assessment. Chris is evaluating whether the tool's output constitutes sufficient documentation for an audit.

**What MCP Verify must do at this stage:** Every Markdown and JSON report must include: tool version, MCP spec version used for validation, timestamp with timezone, target URL, and execution duration. The scoring methodology must be documented in a stable, citable location. The report structure must be consistent between runs.

---

#### Stage 3: Integration into Audit Process

**Trigger:** Chris approves MCP Verify as the validation tool for MCP servers in scope. They begin integrating it into the compliance workflow.

**Actions:**
- Works with engineering teams to establish a validation cadence (quarterly minimum, or before each production deployment)
- Defines a process for storing dated Markdown reports in the audit system (Confluence or SharePoint)
- Creates compliance documentation that references the MCP Verify scoring methodology as the validation procedure
- Establishes a threshold: conformance score >= 75 and zero Critical or High findings is required to maintain "compliant" status

**Key CLI interactions Chris requests engineering run:**
```bash
# Generate dated Markdown report for audit trail
npx mcp-verify --format markdown https://production-mcp.company.com \
  > mcp-verify-report-$(date +%Y-%m-%d).md

# Generate JSON for system of record integration
npx mcp-verify --format json https://production-mcp.company.com \
  > mcp-verify-report-$(date +%Y-%m-%d).json

# Quarterly scheduled validation run (added to CI/CD scheduled trigger)
npx mcp-verify --format markdown https://production-mcp.company.com
```

**Sample compliance documentation language Chris drafts:**
> "MCP servers used in automated decision pipelines are validated quarterly using MCP Verify (version pinned to latest stable release). Validation covers spec conformance against MCP specification version 2024-11-05 and security vulnerability detection across five documented vulnerability categories. Validation reports are stored in [Audit System] with the format: `mcp-verify-report-{server-name}-{date}.md`. Servers must maintain a conformance score of 75 or above and zero Critical or High security findings to retain production approval."

**Emotional state:** Focused on sustainability. A one-time report is not compliance — Chris needs a process that engineering teams can repeat reliably and that produces consistent, comparable output over time.

---

#### Stage 4: Audit Response

**Trigger:** An internal or external auditor requests evidence of MCP server validation as part of a EU AI Act compliance review.

**Actions:**
- Retrieves dated Markdown reports from the audit system
- Provides the MCP Verify methodology documentation URL as the reference for validation procedure
- Presents the conformance score trend over time (quarterly reports) to demonstrate ongoing monitoring

**Emotional state:** Confident if the process has been followed consistently. The existence of dated, structured reports transforms a potentially difficult audit question ("how do you validate your AI tools?") into a straightforward one with documentary evidence.

---

#### Stage 5: Evangelism within Enterprise Compliance Community

**Trigger:** Chris successfully completes an EU AI Act compliance review. Peers at other enterprises ask how they handled MCP server validation.

**Actions:**
- Shares the MCP Verify approach with a compliance community of practice
- May present at an enterprise risk or AI governance conference
- Recommends MCP Verify to enterprise architecture teams at peer organizations

**Emotional state:** Pragmatic satisfaction. Chris solved a hard compliance problem with a lightweight tool, which is unusual — the expected solution would have been expensive enterprise software.

---

### Usability Requirements

For Chris, the experience of using MCP Verify must feel like:

- **Documented:** The scoring methodology is published, stable, and citable. An auditor who asks "how is the score calculated?" must be answerable with a URL or a document.
- **Dated and versioned:** Every report artifact includes unambiguous timestamp, tool version, and spec version. Reports produced at different times must be comparable — the same server at the same state should produce the same score.
- **Human-readable without technical interpretation:** A compliance professional who is not a developer must be able to read the Markdown report and understand what it means. Technical jargon in findings must be accompanied by plain-language descriptions.
- **Stable output format:** Schema changes between tool versions must not break the compliance documentation process. Version pinning must be easy to implement.
- **Reproducible:** Given the same server state, running MCP Verify twice should produce the same results. Non-deterministic output undermines evidentiary value.

---

### Pain Points and How MCP Verify Addresses Them

| Chris's Pain | How MCP Verify Addresses It |
|-------------|----------------------------|
| No tool produces a structured, dated conformance certificate for an MCP server | P1.3 Markdown report format includes tool version, MCP spec version, timestamp, target, score breakdown, and security findings — suitable for direct storage in audit systems |
| Manual testing notes do not constitute a repeatable validation procedure | Defined scoring methodology (documented in spec appendix) is citable in compliance documentation as the validation procedure |
| No way to compare reports over time to demonstrate ongoing compliance | P2.2 historical tracking enables comparison between validation runs; JSON export provides a consistent data format for compliance system integration |
| Engineering teams cannot explain what was tested or what methodology was used | Every report includes per-category score breakdown with specific check results — the report is self-documenting |
| The August 2026 EU AI Act enforcement deadline is imminent | MCP Verify v1.0.0 ships within Sprint 3, weeks before the deadline; Markdown reports are immediately usable as audit trail artifacts |

---

## Cross-Persona Interaction Patterns

The three personas interact with MCP Verify at different layers but are part of the same workflow ecosystem. Understanding these interactions clarifies how adoption spreads and where the product must serve multiple users simultaneously.

### The Adoption Funnel

```
Paulo (Developer)
    |
    | Individual adoption -> Mentions to team
    v
Dana (DevOps Lead)
    |
    | Standardization -> Org-wide CI template
    v
Chris (Compliance Architect)
    |
    | Compliance integration -> Audit trail
```

In most enterprise organizations, the adoption sequence flows from Paulo to Dana to Chris. Paulo discovers and adopts MCP Verify organically. Dana sees it appearing across teams and evaluates it for standardization. Chris encounters it after Dana has established it as the organizational standard and needs to understand its compliance utility.

This funnel has a critical implication: **Paulo's first-use experience is the top of the funnel for enterprise adoption.** If Paulo's experience is poor, Dana never sees the tool. If Dana's standardization experience is poor, Chris never encounters it as an established tool.

### Shared Artifacts

The three personas interact with different output formats of the same verification run:

| Output Format | Paulo Uses It For | Dana Uses It For | Chris Uses It For |
|--------------|------------------|-----------------|------------------|
| Terminal output | Local development feedback | Manual verification during setup | N/A |
| Exit code | CI integration | CI threshold gating | N/A |
| JSON report | Scripting, custom dashboards | SIEM ingestion, artifact archival | System of record integration |
| Markdown report | PR comments, sharing findings | Security review documentation | Audit trail primary artifact |
| GitHub Action annotations | PR status checks | Org-wide PR gating | N/A |

### Configuration Hierarchy

Dana sets the organizational standard. Paulo's team-level configuration operates within it. Chris's compliance requirements set the minimum threshold that Dana encodes:

```
Chris defines: "Conformance >= 75, zero Critical/High findings for production"
    |
    v
Dana encodes: org-standard .mcp-verify.json and GitHub Action template
    |
    v
Paulo applies: team-level configuration within org standards
```

This hierarchy means MCP Verify's configuration system must support both project-level overrides and implicit organizational defaults established by CI templates.

### Escalation Paths

When Paulo wants to suppress a check (e.g., CORS wildcard is acceptable for a private internal server), the suppression must be visible to Dana in the JSON report. Chris's audit process relies on Dana having reviewed and approved suppressions. The `skip` field with required `justification` creates this visibility chain without requiring any additional tooling.

---

## CLI Accessibility Considerations

MCP Verify must be usable across a diverse range of environments and user contexts. The following accessibility considerations are required, not optional.

### Color and Visual Output

**Default behavior:** Color-coded terminal output with green for passing checks, yellow for warnings and medium-severity findings, red for failures and high/critical findings.

**`--no-color` flag (required):** Disables all ANSI escape codes. Required for:
- Terminals that do not support color (some CI environments, legacy terminal emulators)
- Piping output to files or other commands where escape codes appear as literal characters
- Users with color vision deficiencies who configure their environment to use no-color tools
- Screen reader and assistive technology users on systems where ANSI codes interfere with screen reader parsing

The `--no-color` flag must also be respected when the `NO_COLOR` environment variable is set (the no-color.org standard), or when the tool detects it is running in a non-TTY context (i.e., output is piped or redirected).

```bash
# Explicit flag
npx mcp-verify --no-color http://localhost:3000

# Environment variable (respected automatically)
NO_COLOR=1 npx mcp-verify http://localhost:3000

# Non-TTY context (auto-detected, color suppressed)
npx mcp-verify http://localhost:3000 | tee report.txt
```

### Screen Reader Compatibility

Terminal output intended for human reading must be parseable as plain text without semantic loss when color is removed. This means:

- Status indicators must use text labels ("PASS", "FAIL", "WARN") in addition to color — never relying on color alone as the only indicator
- Unicode symbols (checkmarks, crosses) must have text equivalents when `--no-color` is active or when running in a non-TTY context
- Progress indicators must not use cursor movement or in-place updates that produce garbled output when captured by screen readers or log systems

### CI-Friendly Output

CI environments have distinct requirements from interactive terminals:

- **Non-interactive detection:** When stdout is not a TTY, the tool must automatically suppress interactive elements (progress spinners, cursor movements, ANSI colors) and produce clean line-by-line output suitable for CI log capture.
- **Structured exit codes:** Exit code 0/1/2 semantics must be documented precisely and must not change between versions. CI scripts rely on exit codes for branching logic.
- **No prompts:** The tool must never pause waiting for user input in non-interactive contexts. All configuration must be resolved from files and flags before execution begins.
- **Log-friendly timestamps:** When `--format json` is used in CI, the `meta.timestamp` field must be in ISO 8601 format with UTC timezone, suitable for log aggregation systems.
- **GitHub Actions annotations:** When running inside a GitHub Actions environment (detected via `GITHUB_ACTIONS=true`), the tool may emit workflow commands (`::error::`, `::warning::`) in addition to the standard report. This behavior must be documentable and suppressible.

### Language and Reading Level

Terminal output and error messages must be written at a reading level accessible to developers across a range of English proficiency levels:

- Avoid jargon where a plain equivalent exists ("the server did not respond" rather than "connection refused with ECONNREFUSED")
- When technical terms are necessary (e.g., "JSON Schema draft-07"), link to documentation or provide a brief inline explanation
- Error messages must state the problem and the next step in two distinct sentences — do not combine diagnosis and remediation into a single opaque message
- Remediation guidance in security findings must be actionable by a developer who did not write the original server code

### Internationalization Readiness

While MCP Verify v1.0.0 ships in English only, the following choices support future internationalization:

- All user-facing strings should be defined in a single location (not scattered across modules) to facilitate extraction for translation
- Date and time output uses ISO 8601 format (not locale-specific formats)
- Number formatting for scores uses plain integers (not locale-formatted floats)
- No cultural references or idioms in error messages or documentation

---

## Design Principles Derived from Personas

The following design principles are derived directly from the three personas' needs, frustrations, and usage patterns. They must guide all CLI design, output format, and documentation decisions throughout the product development lifecycle.

### Principle 1: Zero Friction to First Result

**Source:** Paulo's Discovery and First Use stages; competitive positioning against manual testing.

Every interaction between running `npx mcp-verify` for the first time and seeing a useful result must be frictionless. No account creation. No configuration required. No documentation consultation required to understand the output. The value of the tool is demonstrated before the user invests effort — not after.

**Implication:** Default output must be self-explanatory. A developer who has never used the tool before must be able to read the first run's output and understand what it means without referring to documentation.

### Principle 2: Actionable Over Comprehensive

**Source:** Paulo's usability requirement for actionable findings; Dana's need for suppression with justification.

Every finding in the output must be immediately actionable. A finding that names a problem without explaining how to address it creates frustration, not value. The report is not a catalog of observations — it is a prioritized remediation list.

**Implication:** Every security finding must include a remediation step. Every conformance failure must identify the specific field, method, or behavior that is incorrect. Severity classification must be consistent and defensible so developers can make rational prioritization decisions.

### Principle 3: Deterministic and Trustworthy

**Source:** Paulo's evaluation stage concern about false positives; Chris's need for reproducible audit artifacts; Dana's requirement for schema stability.

The tool must produce consistent results for consistent inputs. A developer who runs the same command twice against an unchanged server must see the same results. A compliance report stored in an audit system must represent a repeatable procedure, not a one-time snapshot that cannot be reproduced.

**Implication:** Non-deterministic checks must be labeled as heuristic with documented confidence levels. The output schema must be versioned and stable within a major version. False positive rate must be tracked and published as a quality metric.

### Principle 4: Configuration, Not Customization

**Source:** Dana's deployment at scale; the tension between Paulo's project-specific needs and Dana's org-wide standards.

MCP Verify's behavior must be configurable through documented, stable parameters — not hackable through undocumented workarounds. Configuration should cover the legitimate variance in use cases (different severity thresholds per environment, check suppression with justification) without exposing the internals of the verification engine to ad-hoc modification.

**Implication:** The configuration file schema must be documented, versioned, and validated at startup. Unknown configuration keys must produce a warning, not a silent ignore. The GitHub Action inputs must map directly to CLI flags with no undocumented behavior that only works in the Action context.

### Principle 5: Local-First, No Secrets Required

**Source:** All three personas' trust requirements; competitive differentiation against account-required tools.

MCP Verify must never require sending server URLs, tool schemas, finding details, or any other sensitive information to an external service. The tool runs locally and produces results locally. This is a trust foundation, not a feature. Violating it — even optionally — damages credibility with all three personas.

**Implication:** No telemetry by default. No cloud verification API. No account creation. Any optional telemetry (opt-in only) must explicitly exclude all server-specific information. The privacy policy for opt-in telemetry must be documented in the README.

### Principle 6: Compliance-Grade Documentation

**Source:** Chris's need to cite the methodology in legal documentation; Dana's need for stable schema references.

The scoring methodology, JSON schema, configuration file format, exit code semantics, and GitHub Action inputs must be documented at a level of precision sufficient for legal and compliance citation. "It works as described in the README" is not a compliance-grade methodology reference. Versioned, stable documentation with explicit schema definitions is.

**Implication:** The conformance scoring methodology must be published as a standalone document, not embedded in code comments. The JSON report schema must be published with a version number independent of the tool version. Breaking changes to documented interfaces require a major version bump with a migration guide.

### Principle 7: Errors Are Guidance, Not Failures

**Source:** Paulo's frustration with tools that produce errors without actionable next steps; the zero-friction first use requirement.

A non-zero exit code or an error message is an opportunity to guide the user, not a failure state. Every error message must state what went wrong and what the user should try next. Exit code 2 (tool error) must include a human-readable explanation of why the tool could not complete verification.

**Implication:** Error messages must be reviewed against the "is this actionable?" test and updated when user feedback identifies confusion. The most common error conditions (server not running, wrong transport, timeout) must have specific, distinct messages — not a generic "verification failed" catch-all.

---

*Document produced by Product Manager (Tier 2 PM) for MCP Verify PDLC Project.*
*Reference product-vision.md and project-selection.md for feature scope, market context, and prioritization decisions.*
*Next phase: Architecture and technical design. Use this document to validate UX and output format decisions against persona requirements.*
