# MCP Verify — Project Brief

## Project Name
MCP Verify

## Description
A framework-agnostic, open-source CLI and GitHub Action that verifies MCP (Model Context Protocol) servers for spec conformance, security vulnerabilities, and health metrics. Developers run `mcp-verify` against any MCP server (local or remote) and get a comprehensive health report with CI pass/fail gating — no external API keys or accounts required.

## Target Users
1. **Primary**: Developers building MCP servers who want to ensure spec conformance before publishing
2. **Secondary**: Platform/DevOps teams adopting MCP at scale who need governance and security scanning
3. **Tertiary**: Enterprise teams with EU AI Act compliance requirements (August 2026 deadline)

## Problem Statement
- MCP ecosystem has exploded to 10,000+ servers with 97M monthly SDK downloads
- 43% of MCP implementations are vulnerable to command injection (per 2026 research)
- No tool provides spec conformance + security + CI gate in a single lightweight package
- Existing tools (Snyk Agent-Scan, Cisco MCP Scanner) are enterprise-heavy or require accounts

## Key Features
1. **Spec Conformance Scoring**: Grade servers against versioned MCP spec (JSON-RPC 2.0, tool schemas, auth configuration)
2. **Security Checks**: Detect command injection risks, wildcard CORS, missing auth, tool poisoning patterns
3. **Health Dashboard**: Optional web UI showing historical conformance/security scores per server
4. **CI-Native**: Single `npx mcp-verify` command or GitHub Action; pass/fail exit codes; zero external dependencies
5. **Zero Config**: Works out of the box; no API keys, no accounts, no cloud required

## Tech Stack Preferences
- **Language**: TypeScript (matches MCP ecosystem)
- **CLI Framework**: Commander.js or similar
- **Testing**: Vitest
- **Build**: tsup or esbuild
- **Package Distribution**: npm (`npx mcp-verify`)
- **GitHub Action**: Custom action.yml

## Success Criteria
- CLI can verify any MCP server endpoint with a single command
- Produces a spec conformance score (0-100) with detailed breakdown
- Detects top 5 security vulnerabilities from MCP security research
- GitHub Action blocks PRs if conformance drops below configurable threshold
- < 10 second execution time for typical MCP server
- Published to npm with < 5MB package size

## Competitive Differentiation
- **vs Snyk Agent-Scan**: No account required, spec conformance focus (not just security)
- **vs Cisco MCP Scanner**: Lightweight CLI vs enterprise product
- **vs MCP Inspector (official)**: CI integration + security scanning (official is debug-only)
- **vs Manual testing**: Automated, reproducible, CI-integrated

## Estimated Sprints
4 sprints (based on research feasibility score)

## Sprint Outline
- **Sprint 1**: CLI scaffold + MCP protocol client + basic spec validation
- **Sprint 2**: Security checks (injection detection, auth validation, CORS)
- **Sprint 3**: GitHub Action + CI gate + reporting formats (JSON, Markdown)
- **Sprint 4**: Optional web dashboard + historical tracking + polish

## References
- MCP Spec: https://modelcontextprotocol.io
- MCP Security Research: Invariant Labs, Snyk findings
- Competitive landscape: `/home/ubuntu/.pdlc/research/competitive-landscape-2026-03-28.md`
