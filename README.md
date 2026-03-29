# MCP Verify

A framework-agnostic CLI and GitHub Action that verifies [MCP (Model Context Protocol)](https://modelcontextprotocol.io) servers for spec conformance, security vulnerabilities, and health metrics.

```
$ npx mcp-server-verify https://your-mcp-server.com/mcp

  MCP Verify 1.1.0 — MCP spec 2024-11-05

  Target:    https://your-mcp-server.com/mcp
  Transport: http

  Conformance Score: 94.3 / 100

  Category Breakdown:
  +-----------------+-------+------+------+------+
  | Category        | Score | Pass | Warn | Fail |
  +-----------------+-------+------+------+------+
  | Initialization  |   100 |    4 |    0 |    0 |
  | JSON-RPC Base   |    85 |    3 |    0 |    1 |
  | Tools           |    93 |    5 |    1 |    0 |
  | Resources       |   100 |    2 |    0 |    0 |
  | Prompts         |   100 |    2 |    0 |    0 |
  | Transport       |   100 |    3 |    0 |    0 |
  +-----------------+-------+------+------+------+

  Security Findings: 0 critical, 0 high, 1 medium, 0 low

  Result: PASS (exit code 0)
```

## Features

- **Spec Conformance Scoring** — Weighted scoring across 6 protocol categories (0-100)
- **Security Vulnerability Detection** — 5 built-in checks for common MCP attack patterns
- **Multiple Output Formats** — Terminal (colored), JSON (structured), Markdown (GitHub-friendly)
- **CI/CD Integration** — GitHub Action with PR comments, configurable thresholds, exit codes
- **Historical Tracking** — Score history, baselines, regression detection
- **Web Dashboard** — Local dashboard with charts, trends, and portfolio view
- **Plugin System** — Extend with custom checks via JavaScript plugins
- **Zero Config** — Works out of the box with sensible defaults
- **Lightweight** — ~148 KB bundle, no heavy dependencies

## Quick Start

```bash
# Verify an HTTP MCP server
npx mcp-server-verify https://your-server.com/mcp

# Verify a stdio MCP server
npx mcp-server-verify stdio://./my-server.js

# JSON output for CI
npx mcp-server-verify https://your-server.com/mcp --format json

# Fail CI on high+ severity findings
npx mcp-server-verify https://your-server.com/mcp --fail-on-severity high

# Require minimum 80% conformance
npx mcp-server-verify https://your-server.com/mcp --conformance-threshold 80
```

## Table of Contents

- [What It Checks](#what-it-checks)
  - [Spec Conformance (6 Categories)](#spec-conformance-6-categories)
  - [Security Checks (5 Built-in)](#security-checks-5-built-in)
  - [What It Does NOT Check](#what-it-does-not-check)
- [Installation](#installation)
- [CLI Reference](#cli-reference)
  - [verify Command](#verify-command)
  - [baseline Command](#baseline-command)
  - [history export Command](#history-export-command)
  - [serve Command](#serve-command)
- [Exit Codes](#exit-codes)
- [Configuration File](#configuration-file)
- [Output Formats](#output-formats)
- [GitHub Action](#github-action)
- [Web Dashboard](#web-dashboard)
- [Historical Tracking & Regression Detection](#historical-tracking--regression-detection)
- [Plugin System](#plugin-system)
- [Scoring Algorithm](#scoring-algorithm)
- [CI/CD Examples](#cicd-examples)
- [Limitations & Honest Gaps](#limitations--honest-gaps)
- [Contributing](#contributing)
- [License](#license)

## What It Checks

### Spec Conformance (6 Categories)

MCP Verify validates your server against the MCP specification (2024-11-05) across 6 weighted categories:

| Category | Weight | What It Validates |
|----------|--------|-------------------|
| **Initialization** | 25% | `initialize` handshake, `protocolVersion` field, `capabilities` object, `serverInfo` presence |
| **Tools** | 25% | `tools/list` response, tool `name` field, `inputSchema` as valid JSON Schema draft-07, parameter types |
| **JSON-RPC Base** | 20% | `jsonrpc: "2.0"` envelope, numeric IDs, error code ranges (-32100 to -32001 reserved), notification format |
| **Resources** | 10% | `resources/list` response, `resources` array presence, URI and name validation |
| **Prompts** | 10% | `prompts/list` response, `prompts` array presence, argument validation |
| **Transport** | 10% | Stdio: no non-JSON stdout before init. HTTP+SSE: correct `Content-Type: text/event-stream` |
| **Error Handling** | 0% (reported only) | Unknown method probe responses, error code correctness. Violations are shown but don't affect the score |

Each category starts at 100 points. Failures deduct 15 points, warnings deduct 7 points. The overall score is a weighted average clamped to [0, 100].

**Special case:** If the initialization handshake fails entirely, the overall score is 0 regardless of other categories.

### Security Checks (5 Built-in)

| Check | Severity | Confidence | What It Detects |
|-------|----------|------------|-----------------|
| **Command Injection** | High (CVSS 8.1) | Heuristic | Unconstrained string parameters named `command`, `exec`, `shell`, `path`, `file`, `dir`, or with descriptions mentioning execution. Does NOT flag params with `pattern` or `enum` constraints. |
| **CORS Wildcard** | High (CVSS 7.5) | Deterministic | `Access-Control-Allow-Origin: *` header on HTTP responses. Skipped for stdio servers. |
| **Auth Gap** | Critical/Medium | Heuristic | HTTP servers on public IPs (Critical, CVSS 9.8) or private networks (Medium, CVSS 6.5) responding to `initialize` without authentication. Skipped for localhost/loopback. |
| **Tool Poisoning** | Critical (CVSS 8.8) | Heuristic | Prompt injection patterns in tool descriptions (`IGNORE PREVIOUS INSTRUCTIONS`, `[SYSTEM]`, `<system>`, `you must`, `act as`), URL-encoded tool names, Base64-encoded names, suspiciously long descriptions (>2000 chars). |
| **Information Leakage** | Medium (CVSS 5.3) | Deterministic | Stack traces (Node.js, Python, Java, .NET), filesystem paths (`/home/`, `/var/`, `C:\Users\`), and `process.env` references in error responses. |

All findings include: unique ID, check ID, severity, CVSS score, component, title, description, remediation guidance, and confidence label.

### What It Does NOT Check

Being honest about limitations:

- **Tool execution behavior** — Does not call tools or verify they do what they claim
- **TLS/encryption** — Does not validate HTTPS certificates or TLS versions
- **Rate limiting / DoS resilience** — Not tested (available as an [example plugin](#plugin-system))
- **Data privacy / PII** — Does not inspect data flows for personal information
- **Authentication strength** — Detects absence of auth, not weakness of auth
- **Actual exploitability** — Checks are pattern-based, not exploit-based. A finding means "this looks suspicious," not "this is proven exploitable"
- **Performance / load testing** — Measures single-request response time only

The [plugin system](#plugin-system) exists to fill these gaps for your specific needs.

## Installation

```bash
# Run directly (no install needed)
npx mcp-server-verify https://your-server.com/mcp

# Install globally
npm install -g mcp-server-verify

# Install as dev dependency
npm install --save-dev mcp-server-verify
```

**Requirements:** Node.js 18, 20, or 22 on Linux, macOS, or Windows.

## CLI Reference

### verify Command

The default command. `mcp-verify <target>` is equivalent to `mcp-verify verify <target>`.

```
mcp-verify verify <target> [options]
```

| Flag | Description | Default |
|------|-------------|---------|
| `--timeout <ms>` | Connection and response timeout | `10000` |
| `--format <type>` | Output format: `terminal`, `json`, `markdown` | `terminal` |
| `--config <path>` | Path to config file (auto-discovers `mcp-verify.json`) | auto |
| `--strict` | Strict check mode (more checks, stricter thresholds) | off |
| `--lenient` | Lenient check mode (fewer checks, relaxed thresholds) | off |
| `--verbose` | Show detailed error output with stack traces | off |
| `--output <path>` | Write report to file instead of stdout | stdout |
| `--transport <type>` | Force transport: `http` or `stdio` | auto-detect |
| `--fail-on-severity <level>` | Fail on findings at this level or above: `critical`, `high`, `medium`, `low`, `none` | `critical` |
| `--conformance-threshold <n>` | Minimum conformance score (0-100) to pass | `0` |
| `--no-color` | Disable ANSI color output | off |
| `--no-history` | Don't save this run to history | off |
| `--compare-last` | Compare with baseline (or previous run if no baseline) | off |
| `--compare-previous` | Compare with the immediately previous run (ignores baseline) | off |

```bash
# Basic
mcp-verify https://example.com/mcp

# CI pipeline: JSON output, fail on high findings, require 80% score
mcp-verify https://example.com/mcp \
  --format json \
  --fail-on-severity high \
  --conformance-threshold 80

# Save to file with terminal summary
mcp-verify https://example.com/mcp --format json --output report.json

# Compare with previous run
mcp-verify https://example.com/mcp --compare-last

# Strict mode, verbose errors
mcp-verify https://example.com/mcp --strict --verbose
```

### baseline Command

Pin a known-good state for regression gating.

```bash
# Run verification and store result as baseline
mcp-verify baseline https://example.com/mcp

# Promote the most recent history entry as baseline (no re-run)
mcp-verify baseline --existing https://example.com/mcp
```

When a baseline exists, `--compare-last` compares against it. Use `--compare-previous` to compare against the immediately previous run instead.

Baselines are stored in `~/.mcp-verify/baselines/`.

### history export Command

Export run history for SIEM ingestion or external analysis.

```bash
# Export history for one server
mcp-verify history export https://example.com/mcp --output history.json

# Export all tracked servers
mcp-verify history export --all --output all-history.json
```

Output is a JSON object with `exportedAt`, `toolVersion`, and a `runs` array.

### serve Command

Start the local web dashboard.

```bash
# Default port 4000
mcp-verify serve

# Custom port
mcp-verify serve --port 8080
```

See [Web Dashboard](#web-dashboard) for details.

## Exit Codes

| Code | Meaning | When |
|------|---------|------|
| **0** | Pass | Conformance score >= threshold AND no findings >= failOnSeverity |
| **1** | Fail | Conformance score < threshold OR finding severity >= failOnSeverity |
| **2** | Error | Invalid URL, unreachable server, invalid config, bad arguments |

## Configuration File

Create `mcp-verify.json` or `.mcp-verify.json` in your project root:

```json
{
  "timeout": 15000,
  "format": "terminal",
  "failOnSeverity": "high",
  "conformanceThreshold": 80,
  "checkMode": "balanced",
  "verbose": false,
  "skip": [
    {
      "checkId": "cors-wildcard",
      "justification": "Development server only — CORS is restricted in production"
    },
    {
      "checkId": "auth-gap",
      "justification": "Auth handled by API gateway, not the MCP server directly"
    }
  ]
}
```

**Precedence:** CLI flags > config file > defaults.

Suppressed findings are NOT hidden — they appear in all output formats marked as "suppressed" with the justification text, maintaining an audit trail.

Use `--config <path>` to point to a specific file, or let the CLI auto-discover in the current directory.

## Output Formats

### Terminal (default)

Color-coded human-readable output with box-drawing tables. Respects `NO_COLOR=1` environment variable.

### JSON

Structured output for CI pipelines and programmatic consumption:

```json
{
  "schemaVersion": "1.0",
  "meta": {
    "toolVersion": "1.1.0",
    "specVersion": "2024-11-05",
    "timestamp": "2026-03-29T12:00:00.000Z",
    "target": "https://example.com/mcp",
    "transport": "http",
    "durationMs": 1234,
    "checkMode": "balanced"
  },
  "conformance": {
    "score": 94.3,
    "breakdown": {
      "initialization": 100,
      "jsonrpc-base": 85,
      "tools": 93,
      "resources": 100,
      "prompts": 100,
      "transport": 100
    },
    "violations": []
  },
  "security": {
    "findings": [],
    "suppressed": []
  },
  "summary": {
    "pass": true,
    "exitCode": 0,
    "blockerCount": { "critical": 0, "high": 0, "medium": 0, "low": 0 }
  }
}
```

Full schema documented at [`docs/report-schema.json`](docs/report-schema.json).

### Markdown

GitHub-flavored Markdown with pipe tables. Suitable for PR comments, wiki pages, and audit documentation.

## GitHub Action

Add to your workflow:

```yaml
name: MCP Verify
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start MCP server
        run: node my-server.js &

      - name: Verify MCP server
        uses: mcp-verify/action@v1
        with:
          target: http://localhost:3000/mcp
          fail-on-severity: high
          conformance-threshold: 80
```

### Action Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `target` | Yes | — | MCP server URL or stdio command |
| `fail-on-severity` | No | `critical` | `critical`, `high`, `medium`, `low`, `none` |
| `conformance-threshold` | No | `0` | Minimum score (0-100) |
| `format` | No | `terminal` | Step log format: `terminal`, `json`, `markdown` |
| `config` | No | — | Path to config file |
| `timeout` | No | `10000` | Timeout in milliseconds |

### Action Outputs

| Output | Description |
|--------|-------------|
| `conformance-score` | Overall score (0-100) |
| `security-findings-count` | Number of active (non-suppressed) findings |
| `pass` | `true` or `false` |

### PR Comments

On `pull_request` events, the action automatically posts (or updates) a Markdown summary as a PR comment. Comments are idempotent — the same comment is updated on re-runs, not duplicated.

Requires `GITHUB_TOKEN` with `write` permission on pull requests. If the token is missing, the comment step is skipped gracefully.

## Web Dashboard

Start a local dashboard to visualize score history across all your MCP servers:

```bash
mcp-verify serve
# Dashboard available at http://localhost:4000
```

**Features:**
- **Portfolio view** — All tracked servers in one table with latest score, finding count, trend direction, and last run time. Sortable columns.
- **Score charts** — Time-series line chart of conformance scores per server. Toggle individual category overlays.
- **Security trends** — Stacked bar chart of findings by severity across runs.
- **Regression markers** — Red indicators on score drops greater than 5 points.
- **Fully local** — All assets are embedded inline. Zero external network requests. CSP header enforced: `default-src 'self'`. No analytics, CDN fonts, or telemetry.

History data is stored in `~/.mcp-verify/history/` as JSONL files (one per target).

## Historical Tracking & Regression Detection

Every verification run is automatically saved to local history (disable with `--no-history`).

### Compare with previous run

```bash
# Compare against baseline (or last run if no baseline)
mcp-verify https://example.com/mcp --compare-last

# Always compare against the immediately previous run
mcp-verify https://example.com/mcp --compare-previous
```

Output includes:
- Previous score vs current score with delta
- New findings (in current run but not previous)
- Resolved findings (in previous run but not current)
- Regression warning when score decreased

### Pin a baseline

```bash
# Run verification and save as baseline
mcp-verify baseline https://example.com/mcp

# Or promote the latest history entry
mcp-verify baseline --existing https://example.com/mcp
```

### Export history

```bash
# Single target
mcp-verify history export https://example.com/mcp --output history.json

# All targets
mcp-verify history export --all --output all-history.json
```

## Plugin System

Extend MCP Verify with custom checks. Plugins are JavaScript modules that receive the full verification context and return findings.

### Quick example

`my-check.js`:
```js
export default {
  id: 'my-check',
  name: 'My Custom Check',
  description: 'Checks for something specific to my org',
  version: '1.0.0',
  check: async (context) => {
    const findings = [];
    if (context.transport === 'http' && context.toolsList.length > 50) {
      findings.push({
        checkId: 'my-check:too-many-tools',
        severity: 'medium',
        cvssScore: 4.0,
        component: 'tools',
        title: 'Excessive tool count',
        description: `Server exposes ${context.toolsList.length} tools`,
        remediation: 'Consider reducing the number of exposed tools',
        confidence: 'heuristic',
      });
    }
    return findings;
  },
};
```

`mcp-verify.config.js`:
```js
export default {
  plugins: ['./my-check.js'],
  rules: {
    'my-check': { maxTools: 50 },
  },
};
```

### Plugin behavior

- Plugin findings appear in **all output formats** alongside built-in findings
- Plugin findings **contribute to exit code** via `failOnSeverity`
- Plugin findings **can be suppressed** via the `skip` config
- **30-second timeout** per plugin — exceeding it prints a warning and continues
- **Error isolation** — exceptions in a plugin never crash the tool
- **Two reference plugins** included: [`examples/plugins/custom-auth-check`](examples/plugins/custom-auth-check) and [`examples/plugins/rate-limit-check`](examples/plugins/rate-limit-check)

Full guide: [`docs/plugin-authoring.md`](docs/plugin-authoring.md)

## Scoring Algorithm

1. Each of the 6 scored categories starts at **100 points**
2. Each **failure** deducts **15 points** from its category
3. Each **warning** deducts **7 points** from its category
4. Category scores are clamped to **[0, 100]**
5. Overall score = **weighted average** of category scores (see [weights table](#spec-conformance-6-categories))
6. If the initialization handshake fails entirely → overall score = **0**

Error handling violations are reported but have **0 weight** — they don't affect the numerical score.

## CI/CD Examples

### GitHub Actions

```yaml
jobs:
  mcp-verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: mcp-verify/action@v1
        with:
          target: http://localhost:3000/mcp
          fail-on-severity: high
          conformance-threshold: 80
```

### GitLab CI

```yaml
mcp-verify:
  image: node:20
  script:
    - npx mcp-server-verify http://localhost:3000/mcp
      --format json
      --output report.json
      --fail-on-severity high
      --conformance-threshold 80
  artifacts:
    paths: [report.json]
```

### CircleCI

```yaml
jobs:
  mcp-verify:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - run:
          name: Verify MCP server
          command: |
            npx mcp-server-verify http://localhost:3000/mcp \
              --format json \
              --output report.json \
              --fail-on-severity high
      - store_artifacts:
          path: report.json
```

Full CI examples with matrix builds, config files, and advanced workflows: [`docs/examples/`](docs/examples/)

## Limitations & Honest Gaps

MCP Verify is a **static analysis and protocol validation tool**. It is not a penetration testing framework or a runtime behavior monitor.

| What it does well | What it doesn't do |
|-------------------|--------------------|
| Validates protocol conformance against the MCP spec | Test actual tool execution or side effects |
| Detects common security anti-patterns | Prove exploitability of findings |
| Integrates into CI/CD with exit codes | Load/performance/stress testing |
| Tracks scores over time and detects regressions | Validate TLS certificates or encryption |
| Extends via plugins for custom checks | Monitor runtime behavior in production |

**Security findings are advisory.** A "critical" finding means the pattern strongly suggests a vulnerability, not that exploitation has been demonstrated. Always validate findings in the context of your deployment.

The plugin system is designed to close specific gaps — write a plugin for your organization's auth requirements, rate limiting policies, or any domain-specific checks.

## Contributing

```bash
git clone https://github.com/dipandhali2021/mcp-verify.git
cd mcp-verify
npm install
npm test          # 646 tests
npm run typecheck # TypeScript strict mode
npm run build     # Bundle to dist/
```

## License

MIT
