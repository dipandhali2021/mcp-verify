# Project Selection Report

**Date:** 2026-03-28
**Research Cycles:** 1

## Selected Project

**Name:** MCP Verify
**Description:** A framework-agnostic, open-source CLI and GitHub Action that verifies MCP (Model Context Protocol) servers for spec conformance, security vulnerabilities, and health metrics. Developers run `mcp-verify` against any MCP server and get a comprehensive health report with CI pass/fail gating — no external API keys or accounts required.
**Target Users:** Developers building MCP servers, Platform/DevOps teams adopting MCP at scale, Enterprise teams with EU AI Act compliance requirements
**Key Differentiator:** Only tool combining spec conformance + security scanning + CI gate in a single lightweight zero-config CLI
**Estimated Sprints:** 4

## Scoring

| Candidate | Trend Momentum | Market Size | Feasibility | Differentiation | Total |
|-----------|---------------|-------------|-------------|-----------------|-------|
| **MCP Verify** | 24/25 | 22/25 | 21/25 | 23/25 | **90/100** |
| MCP Dashboard (visual inspector) | 20/25 | 18/25 | 18/25 | 14/25 | 70/100 |
| MCP Marketplace (server registry) | 22/25 | 20/25 | 12/25 | 16/25 | 70/100 |

## Selection Rationale

MCP Verify is the clear winner because:
1. **Explosive growth**: MCP ecosystem has 10,000+ servers with 97M monthly SDK downloads — developers need verification tooling now
2. **Critical security gap**: 43% of MCP implementations are vulnerable to command injection (2026 research), and no lightweight tool addresses this
3. **Regulatory urgency**: EU AI Act compliance deadline (August 2026) creates enterprise demand for automated conformance checking
4. **Zero competition in the exact niche**: Snyk Agent-Scan requires accounts, Cisco MCP Scanner is enterprise-heavy, MCP Inspector is debug-only — nobody offers spec + security + CI in a lightweight CLI

## Key Research Findings

### Trend Data
- MCP protocol adoption has grown 15x in 12 months
- GitHub trending shows MCP-related repos consistently in top 25
- 97M monthly SDK downloads across TypeScript and Python SDKs
- Major cloud providers (AWS, Azure, GCP) have announced MCP support

### Market Analysis
- **TAM**: All developers building or consuming MCP servers (~500K developers globally)
- **SAM**: Developers who actively test their MCP servers (~100K)
- **SOM**: Early adopters who would use a CLI verification tool (~20K in first year)
- Enterprise segment grows significantly with EU AI Act deadline

### Competitive Landscape
- **Snyk Agent-Scan**: Enterprise security focus, requires Snyk account, no spec conformance scoring
- **Cisco MCP Scanner**: Heavy enterprise product, not developer-friendly
- **MCP Inspector (official)**: Debug/development tool only, no CI integration, no security scanning
- **Manual testing**: Time-consuming, non-reproducible, not CI-integrated
- **Gap**: No tool provides spec conformance scoring + security checks + CI gating in a single zero-config CLI

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| MCP spec evolves rapidly | High | Medium | Version-pinned spec checks, modular validation rules |
| Official tooling catches up | Medium | High | Move fast, establish community, differentiate on security |
| Complex MCP auth flows | Medium | Medium | Start with common auth patterns, expand iteratively |
| Server diversity (stdio vs HTTP) | High | Medium | Abstract transport layer, test against real servers |

## Next Steps
- Proceed to PLANNING phase
- Focus on: CLI architecture, spec conformance engine, security check framework, CI integration patterns
