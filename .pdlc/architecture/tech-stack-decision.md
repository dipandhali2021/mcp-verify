# Tech Stack Decision: MCP Verify

**Document Version:** 1.0
**Author:** Tech Lead (DESIGN Phase)
**Date:** 2026-03-28
**Status:** Approved — Sprint Execution Ready
**References:**
- `.pdlc/architecture/system-design.md` — Architecture, build strategy, directory structure
- `.pdlc/architecture/product-vision.md` — Product vision, tech preferences, success metrics
- `.pdlc/architecture/project-plan.md` — Sprint teams, agent assignments, story breakdown
- `.pdlc/architecture/requirements.md` — FR-001 through FR-080, NFR-001 through NFR-024
- `.pdlc/research/project-selection.md` — Project selection rationale

---

## 1. Project Type Classification

| Dimension | Classification |
|-----------|---------------|
| **Primary** | CLI Tool |
| **Secondary** | GitHub Action |
| **Tertiary** | Local Web Dashboard (Sprint 4) |

**Detection keywords matched:** CLI, command-line, terminal, automation tool, npm, npx

MCP Verify is a single-process, single-threaded Node.js CLI tool that connects to an MCP server, exercises the protocol, and produces a verification report. It is invoked via `npx mcp-verify <target>` with no prior installation. The GitHub Action wraps the CLI for native CI integration. The Sprint 4 web dashboard is an optional, local-only companion served by the CLI's `serve` subcommand.

This classification drives every technology choice that follows. A CLI-first tool running via `npx` has specific constraints — small package size, fast startup, zero required runtime configuration, and distribution through npm — that would not apply to a server, library, or web application.

---

## 2. Technology Decisions

### 2.1 Language: TypeScript (strict mode)

**Decision:** TypeScript 5.x with `strict: true` enforced in CI.

**Why:**
- The MCP SDK is TypeScript-native. The target developer audience writes TypeScript daily. Sharing a language with the ecosystem reduces friction for contributors and for users who want to read the source.
- The validation and analysis logic at the core of MCP Verify — JSON Schema structural checks, JSON-RPC envelope validation, security pattern matching — benefits strongly from precise type definitions. TypeScript strict mode catches entire categories of runtime bugs at compile time.
- npm is the natural distribution channel for TypeScript tools. `npx mcp-verify` is a zero-install story that works immediately in any Node.js environment.
- TypeScript types are exported publicly for the plugin API (`PluginContext`, `SecurityFinding`). Plugin authors get IDE autocompletion without any extra tooling.

**Alternatives considered:**

| Alternative | Assessment |
|-------------|-----------|
| Go | Single binary, fast startup, excellent cross-compilation. Rejected: no `npx` equivalent, separate binary distribution story per platform, no MCP SDK overlap with target users. |
| Rust | Best-in-class performance, single binary. Rejected: same distribution problems as Go, significantly higher contribution barrier, no ecosystem alignment. |
| Python | Rapid development, strong ecosystem. Rejected: no `npx` equivalent (pipx is not equivalent), slower startup, separate installation required, no `npm publish` story. |
| JavaScript (no types) | Simplest. Rejected: validation logic with no type safety is fragile at exactly the wrong points. NFR-023 mandates strict TypeScript. |

**TypeScript configuration relevant to this decision:**

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node"
  }
}
```

No `any` types are permitted without an explicit `// eslint-disable` comment with justification (NFR-023). `@typescript-eslint/no-explicit-any` is set to `error`.

---

### 2.2 CLI Framework: Commander.js

**Decision:** Commander.js for all CLI argument parsing, subcommand routing, and help generation.

**Why:**
- Most widely used Node.js CLI framework. Well-understood by the target developer audience. Minimal magic.
- Strong TypeScript support. Types are included in the package.
- Handles the exact command surface needed: `mcp-verify [verify] <target>` bare invocation, `mcp-verify serve`, `mcp-verify baseline`, `mcp-verify history export`, plus global flags (FR-001 through FR-010).
- Automatic help generation satisfies FR-005 with minimal custom code.
- Lightweight. Commander.js is approximately 50 KB, which is the only runtime third-party dependency bundled into the final package.

**Alternatives considered:**

| Alternative | Assessment |
|-------------|-----------|
| yargs | Popular, capable. Rejected: weaker TypeScript types than Commander.js, heavier API surface. |
| oclif | Full CLI framework (Salesforce). Rejected: significantly heavyweight (plugins, hooks, command class system). MCP Verify needs a library, not a framework. Introduces unnecessary architecture complexity. |
| clipanion | Type-safe, modern. Rejected: less mainstream adoption, smaller community, higher contributor on-ramp. |
| Minimist / meow | Bare-minimum arg parsers. Rejected: require manual implementation of subcommand routing, help generation, and validation that Commander.js provides out of the box. |

**Commander.js command structure (from system-design.md §2.1):**

```
mcp-verify [verify] <target>     # Default command (FR-001)
mcp-verify serve                 # Sprint 4 (FR-066)
mcp-verify baseline <target>     # Sprint 4 (FR-073)
mcp-verify history export        # Sprint 4 (FR-074)
```

---

### 2.3 Testing Framework: Vitest

**Decision:** Vitest with Istanbul coverage provider.

**Why:**
- TypeScript-first. No separate `ts-jest` transformer or Babel configuration required. TypeScript source files are consumed directly.
- ESM-native. The project uses modern module syntax; Vitest handles it without workarounds.
- Jest-compatible API. Developers already familiar with Jest can contribute immediately. `test()`, `expect()`, `vi.mock()` behave as expected.
- Built-in coverage via Istanbul. Coverage thresholds are configured directly in `vitest.config.ts` and enforced in CI (NFR-021: > 85% line, function, and statement coverage; > 80% branch coverage).
- Fast. The unit test suite runs against plain data objects (no network, no process spawning) and must be fast enough to run in CI on every commit.
- `testTimeout: 15000` handles integration tests that spawn fixture MCP servers.

**Alternatives considered:**

| Alternative | Assessment |
|-------------|-----------|
| Jest | Industry standard. Rejected: ESM support is unreliable without extensive configuration. TypeScript requires `ts-jest` or Babel, both adding build complexity. |
| Node.js built-in `node:test` | Zero dependency. Rejected: fewer assertion utilities, no built-in coverage instrumentation, weaker TypeScript integration, smaller community with fewer examples for this use case. |
| Mocha + Chai | Established. Rejected: requires more configuration setup than Vitest for the same capability level; no built-in TypeScript or ESM story. |

**Vitest configuration (from system-design.md §7.1):**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/dashboard/static/**'],
      thresholds: {
        lines: 85,
        branches: 80,
        functions: 85,
        statements: 85,
      },
    },
    testTimeout: 15000,
  },
});
```

---

### 2.4 Build System: tsup

**Decision:** tsup (built on esbuild) for TypeScript bundling and single-file output.

**Why:**
- Zero-configuration TypeScript bundler. A minimal `tsup.config.ts` produces the publishable artifact.
- Produces a single bundled CommonJS file (`dist/cli.js`) with all dependencies inlined. This is critical: `npx` downloads and executes one file with no `node_modules` install step. No module resolution overhead at cold start.
- Tree-shaking eliminates dead code. With only Commander.js as a third-party dependency and Node.js built-ins for everything else, the output stays well inside the 3 MB budget for `dist/cli.js`.
- Supports `dts` output for plugin API type declarations — the public `Plugin` and `PluginContext` types needed by plugin authors are emitted as a `.d.ts` file without bundling the entire source.
- `noExternal: [/.*/]` bundles everything, ensuring zero runtime `node_modules` dependency (NFR-003, FR-063).

**Why single-file CJS bundle:**
- CJS format works on Node.js 18, 20, and 22 without `--experimental-*` flags (NFR-014).
- Single-file distribution means `npx` cold start requires only one file download. No dependency tree resolution at runtime.
- The `#!/usr/bin/env node` shebang is injected via the `banner` option, making `dist/cli.js` directly executable.

**Alternatives considered:**

| Alternative | Assessment |
|-------------|-----------|
| esbuild (direct) | Powers tsup. Rejected as a direct choice: requires more manual configuration for TypeScript source maps, declaration files, and the shebang banner. tsup wraps esbuild with the right defaults for this use case. |
| Rollup | Mature bundler. Rejected: heavier configuration, weaker out-of-the-box TypeScript story compared to tsup, more plugins required for the same result. |
| tsc (TypeScript compiler only) | Zero extra tooling. Rejected: `tsc` compiles but does not bundle. The output would include a `node_modules` structure that bloats the package far beyond the 5 MB budget and degrades `npx` cold start (NFR-002). |
| Webpack | General-purpose bundler. Rejected: significant configuration overhead for a CLI use case; tsup/esbuild is faster and simpler. |

**tsup configuration (from system-design.md §6.1):**

```typescript
// tsup.config.ts
export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['cjs'],
  target: 'node18',
  outDir: 'dist',
  clean: true,
  minify: true,
  splitting: false,
  sourcemap: false,
  dts: { entry: 'src/plugins/types.ts' },
  banner: { js: '#!/usr/bin/env node' },
  noExternal: [/.*/],
});
```

---

### 2.5 Package Distribution: npm

**Decision:** Published to npm as `mcp-verify`. Invocable as `npx mcp-verify <target>` without prior installation.

**Why:**
- `npx mcp-verify` is the entire installation story. No `brew install`, no binary download, no account creation. This is a non-negotiable product requirement, not a convenience feature. It directly enables the "zero-config, zero-account" positioning against every competitor (product-vision.md §8).
- npm is the universal package manager for Node.js and TypeScript developers, who are the primary target audience.
- Package discoverability: `npm search mcp verify` surfaces the tool to developers already looking for MCP tooling (NFR-020). `package.json` keywords include `mcp`, `model-context-protocol`, `verify`, `security`, `conformance`.

**Versioning strategy:**

| Phase | Version | Milestone |
|-------|---------|-----------|
| Sprint 1 complete | `0.1.0-alpha` | Alpha CLI with conformance scoring |
| Sprint 2 complete | `0.2.0-alpha` | Security engine complete |
| Sprint 3 complete | `1.0.0` | GA: JSON/Markdown reporters, GitHub Action, config system |
| Sprint 4 complete | `1.1.0` | Dashboard, history, plugin API |

Semver is followed strictly. The `0.x.x` alpha phase allows breaking changes between alpha releases. `1.0.0` establishes the stable public API, after which breaking changes require a major version bump.

The JSON report schema is separately versioned (`schemaVersion: "1.0"`) and governed by its own breaking-change policy (FR-050): adding optional fields is a minor version; removing or renaming fields requires a new `schemaVersion`.

---

### 2.6 GitHub Action: Custom action.yml (JavaScript action)

**Decision:** Native GitHub Action using `runs.using: node20`, pointing to a pre-compiled entry point in `action/`.

**Why:**
- Native GitHub CI integration. Developers add one `uses: mcp-verify/action@v1` step to their workflow and get PR status checks and PR comment reports automatically. This is the primary CI distribution channel for the secondary "DevOps Lead Dana" persona.
- JavaScript action type means the action runs directly in the GitHub Actions runner's Node.js environment, using the same `dist/cli.js` bundle already built for the npm package. No Docker container pull, no extra runtime.
- The `action/entrypoint.ts` wraps the CLI programmatically using `@actions/core` and `@actions/github` for input parsing, output variable setting, and PR comment posting (FR-056 through FR-058).
- Published to GitHub Marketplace at Sprint 3 completion, making it discoverable via the Marketplace search for teams who prefer browsing to reading npm documentation.

**Action input/output contract (from system-design.md §2, system-design §6.5):**

```yaml
inputs:
  target:           { required: true }
  fail-on-severity: { default: 'critical' }
  conformance-threshold: { default: '0' }
  format:           { default: 'terminal' }
  config:           { required: false }
  timeout:          { default: '10000' }

outputs:
  conformance-score:        { description: '0-100 integer' }
  security-findings-count:  { description: 'Total finding count' }
  pass:                     { description: 'true or false' }
```

**Alternatives considered:**

| Alternative | Assessment |
|-------------|-----------|
| Docker container action | More isolated. Rejected: Docker pull latency degrades CI wall time. JavaScript action reuses the already-bundled CLI artifact. |
| Composite action | Simpler to maintain. Rejected: less control over output variable setting and PR comment posting logic, which require `@actions/core` and `@actions/github` APIs. |
| No action (npx only) | Minimal maintenance. Rejected: using `npx mcp-verify` in CI requires users to write more boilerplate YAML and does not enable automated PR comments or output variable forwarding. First-class GitHub Action is a P1 product requirement (FR-056). |

---

## 3. Runtime Dependencies

The runtime dependency surface is intentionally minimal. Every third-party package adds package size, supply chain risk (NFR-013), and potential CVEs.

| Package | Purpose | Approx. Size | Bundle Status |
|---------|---------|-------------|---------------|
| commander | CLI argument parsing and subcommand routing | ~50 KB | Bundled into `dist/cli.js` |

**Everything else uses Node.js built-in modules:**

| Built-in Module | Usage |
|----------------|-------|
| `http` / `https` | HTTP+SSE transport |
| `child_process` | stdio transport (process spawning) |
| `fs` / `path` | Config file discovery, history storage |
| `net` | IP address classification (loopback/private/public for auth gap detection) |
| `url` | URL parsing and transport scheme routing |
| `crypto` | Any hashing needs |

**Explicitly avoided large dependencies:**
- No `axios` or `node-fetch` (built-in `http`/`https` suffice and eliminate a 100+ KB dependency)
- No `chalk` or `kleur` (color output implemented in ~2 KB of ANSI helpers with `NO_COLOR` support)
- No `ajv` (JSON Schema structural validation for tool schemas is implemented in-house to avoid the ~200 KB bundle size impact; the validation needed is targeted, not general-purpose)
- No `express` (dashboard HTTP server uses built-in `http` module per system-design.md §2.11)

**Total bundled size target:** `dist/cli.js` < 3 MB; total npm package < 5 MB (enforced by `size-limit` in CI per NFR-003).

---

## 4. Development Dependencies

| Package | Purpose | Why This Choice |
|---------|---------|----------------|
| TypeScript 5.x | Compilation, type checking | Language of choice; 5.x required for latest strict mode features |
| tsup | Build bundling | See §2.4 |
| Vitest | Test runner and coverage | See §2.3 |
| ESLint + @typescript-eslint | Linting | Industry standard TypeScript linting; `no-explicit-any` enforced at `error` level per NFR-023 |
| dependency-cruiser | Circular dependency detection | Enforces the module dependency rules in system-design.md §4 (NFR-022); configured as `.dependency-cruiser.cjs` in the repo root |
| size-limit | Package size enforcement | Hard constraint: build fails if `dist/cli.js` > 3 MB or total package > 5 MB (NFR-003, FR-063) |
| @actions/core | GitHub Action input/output | Required for action entry point (`action/entrypoint.ts`) |
| @actions/github | GitHub API client for PR comments | Required for FR-058 (PR comment posting) |

**Notable absence:** No Prettier. Code formatting style is enforced through ESLint rules rather than a separate formatter, reducing CI step count.

---

## 5. Node.js Version Support

| Version | Status | Notes |
|---------|--------|-------|
| Node.js 18 LTS | Minimum (required) | `engines: { "node": ">=18.0.0" }` in `package.json` (FR-065) |
| Node.js 20 LTS | Primary development | CI matrix primary target |
| Node.js 22 LTS | Tested and supported | CI matrix third target |

**CI matrix:** All 9 combinations of `[ubuntu-latest, macos-latest, windows-latest]` x `[18.x, 20.x, 22.x]` are tested (NFR-014, NFR-015, FR-064).

**Why Node.js 18 as minimum:**
- Node.js 18 introduced native `fetch` (available since 18.0.0), built-in test runner, and the V8 version that supports the ES2022 features targeted by the TypeScript compilation output.
- Node.js 18 LTS receives security updates through April 2025. At the time of the Sprint 1 start (2026-04-01), this represents the oldest broadly-used LTS still in the ecosystem.
- No Node.js API introduced after 18.0.0 is used in the core implementation. The stdlib modules relied upon (`http`, `https`, `child_process`, `fs`, `path`, `net`, `url`, `crypto`) are stable across all three supported LTS versions.

**No native addons:** No npm packages with native (N-API/nan) bindings are used (FR-064 acceptance criteria). This ensures pre-built binaries are never needed and cross-platform compatibility is guaranteed without platform-specific logic.

---

## 6. Development Agent Assignments

Based on the project-plan.md sprint structure and the "CLI Tool + TypeScript" stack classification.

### Sprint 1: Foundation (FR-001 to FR-033, FR-046 to FR-048, FR-063 to FR-065)

| Agent | Role | Model | Primary Stories |
|-------|------|-------|----------------|
| cli-developer | Commander.js scaffold, CLI UX, exit codes, flag definitions | sonnet | S-1-01 through S-1-08 (CLI + infrastructure) |
| typescript-pro | MCP protocol client, TypeScript type architecture, protocol types | sonnet | S-1-09 through S-1-15 (transport + protocol) |
| backend-developer | Conformance validators, scoring algorithm, validation engine | sonnet | S-1-16 through S-1-25 (validators + scoring) |
| devops-engineer | Repo setup, CI matrix (OS x Node), build system, npm alpha publish | sonnet | S-1-01, S-1-02, S-1-03, S-1-04, S-1-28 |

### Sprint 2: Security Engine (FR-036 to FR-045)

| Agent | Role | Model | Primary Stories |
|-------|------|-------|----------------|
| security-engineer | Security check design, threat patterns, detection logic for all five categories | sonnet | S-2-02 through S-2-08 |
| typescript-pro | Security data model, analyzer implementations, CVSS scoring rubric | sonnet | S-2-01, S-2-03 |
| backend-developer | Vulnerable and clean test fixture servers (10 total), integration test suite | sonnet | S-2-09 through S-2-14 |

### Sprint 3: CI Integration (FR-002, FR-003, FR-009, FR-020, FR-034, FR-042, FR-043, FR-049 to FR-062)

| Agent | Role | Model | Primary Stories |
|-------|------|-------|----------------|
| devops-engineer | action.yml, action entry point, PR comment reporter, CI examples, marketplace publish | sonnet | S-3-14 through S-3-22 |
| typescript-pro | JSON reporter, report schema versioning, configuration system, confidence levels | sonnet | S-3-02, S-3-07 through S-3-12 |
| backend-developer | Markdown reporter, extended CLI flags (--format, --config, --strict, --verbose, --output) | sonnet | S-3-01, S-3-03 through S-3-06, S-3-13 |

### Sprint 4: Advanced Features (FR-066 to FR-080)

| Agent | Role | Model | Primary Stories |
|-------|------|-------|----------------|
| frontend-developer | Web dashboard (vanilla JS, local HTTP server, chart rendering, portfolio view) | sonnet | S-4-06 through S-4-11 |
| typescript-pro | Plugin API (types, loader, runner, isolation), history storage, regression detection | sonnet | S-4-01 through S-4-05, S-4-12 through S-4-14 |
| cli-developer | CLI polish, --compare-last, --baseline command, history export, SARIF output | sonnet | S-4-02 through S-4-05, S-4-17 |

### Always-Present (every sprint)

| Agent | Role | Model |
|-------|------|-------|
| scrum-master | Sprint planning, daily standups, ceremonies, blocker escalation | haiku |
| product-manager | Backlog maintenance, acceptance criteria validation, scope decisions | haiku |
| documentation-engineer | README, CLI reference, API docs, CHANGELOG | haiku |

### Testing Phase (every sprint, runs after dev stories complete)

| Agent | Role | Model |
|-------|------|-------|
| code-reviewer | Code quality review, architecture conformance, pattern consistency | opus |
| security-auditor | Security audit of check implementations, false positive analysis | opus |
| test-automator | Automated test suites, coverage gap analysis | sonnet |
| qa-expert | Test strategy, edge case discovery, fixture server validation | sonnet |

---

## 7. Decision Rationale Summary Table

| Decision | Chosen | Key Reason | Risk | Mitigation |
|----------|--------|-----------|------|-----------|
| Language | TypeScript 5.x (strict) | MCP ecosystem alignment; strong types for validation logic | Type complexity in generic protocol handling | `any` banned in ESLint; explicit type definitions for all protocol messages |
| CLI framework | Commander.js | Proven, lightweight (~50 KB), excellent TypeScript types | None significant | N/A |
| Test framework | Vitest | TypeScript-first, ESM-native, Jest-compatible API | Newer ecosystem than Jest | Jest-compatible API means migration is trivial if needed |
| Build system | tsup | Zero-config bundling, single-file CJS output, tree-shaking | Less customizable than raw esbuild | tsup's defaults cover all required cases; raw esbuild available as escape hatch |
| Distribution | npm / npx | Zero-install story; `npx mcp-verify` is the entire UX | Node.js as runtime dependency | Node.js 18+ is universal among target users; stated in docs |
| CI integration | GitHub Action (JS action type) | Primary CI target market; native PR status + comments | GitHub-only initially | GitLab CI and CircleCI documented as `npx` examples in Sprint 3 |
| Runtime deps | Commander.js only | Package size budget (<5 MB); supply chain minimization | Limited to Commander.js CVEs | Only one dependency to monitor; `npm audit` in CI per NFR-013 |
| Node.js | 18.x / 20.x / 22.x | LTS versions cover >95% of active Node.js installs | Oldest LTS (18) has fewer built-ins | No API used that post-dates Node.js 18; CI matrix verifies all three versions |

---

## 8. Architecture Alignment

This tech stack is fully consistent with the system design documented in `system-design.md`. The following alignment points are explicitly noted:

**Pipeline architecture:** TypeScript enables the typed data flow described in system-design.md §1 — each pipeline stage (`ProtocolExchangeRecord`, `CheckResult[]`, `SecurityFinding[]`, `VerificationResult`) has a precise type definition in `src/types/`, and no stage can return the wrong shape without a compile-time error.

**Zero circular dependencies:** The dependency rules in system-design.md §4 (enforced by `dependency-cruiser`) are natural to implement in TypeScript's module system. The "shared types, private implementation" pattern — all inter-module communication through `src/types/` data structures — maps directly to TypeScript interface exports.

**Single-file bundle:** The tsup configuration (`noExternal: [/.*/]`, `minify: true`, CJS format) produces the single-file distribution required by the `npx` UX story and the 5 MB size budget. The `#!/usr/bin/env node` shebang in the `banner` option makes the file directly executable as a binary.

**Dashboard: vanilla JavaScript, no framework:** The Sprint 4 web dashboard is implemented with vanilla JavaScript and the Node.js built-in `http` module (no Express), consistent with system-design.md §2.11. This keeps the Sprint 4 dashboard assets inside the 1 MB budget while maintaining the "no external CDN dependencies" requirement (FR-075).

**Plugin API types as public export:** The `dts: { entry: 'src/plugins/types.ts' }` tsup option exposes the `Plugin`, `PluginContext`, and `SecurityFinding` types to plugin authors as `import type { PluginContext } from 'mcp-verify'` (FR-077). This is possible because TypeScript provides a clean separation between implementation (bundled, not exported) and type declarations (`.d.ts`, exported as a public API).

---

*Document produced for MCP Verify PDLC Project, DESIGN phase.*
*Next phase: Sprint 1 execution. Reference this document for agent role assignments and all technology choices.*
