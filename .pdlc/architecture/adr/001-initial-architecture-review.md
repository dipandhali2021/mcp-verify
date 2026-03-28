# ADR-001: Initial Architecture Review

**Date:** 2026-03-28
**Status:** Accepted
**Reviewers:** architect-reviewer (opus)

---

## Context

The DESIGN phase has produced three core architecture documents:

- `system-design.md` -- Component architecture, data model, directory structure, build strategy, testing strategy, error handling, and performance budget
- `api-spec.md` -- CLI command interface, internal module interfaces, JSON output schema, configuration file schema, exit code specification, and error message catalog
- `security-design.md` -- Threat model for the tool itself, security check engine architecture, security finding data model, CVSS scoring guide, tool security controls, and test fixture specifications

These documents are supported by:

- `requirements.md` -- 80 functional requirements (FR-001 through FR-080) and 24 non-functional requirements (NFR-001 through NFR-024)
- `product-vision.md` -- Product vision, personas, features, sprint roadmap, success metrics, and risk assessment

This ADR captures the review findings across all documents, validates architectural consistency, identifies risks, and documents decisions that protect Sprint 1 from architectural mistakes.

---

## Review Findings

### 1. Consistency Check

#### 1.1 SecurityFinding Interface -- Three-Document Alignment

The `SecurityFinding` interface is defined in three places with meaningful structural differences.

**system-design.md (Section 3.3, `src/types/security.ts`):**
```typescript
interface SecurityFinding {
  id: string;
  checkId: string;
  severity: Severity;
  cvssScore: number;
  component: string;
  description: string;
  remediation: string;
  confidence: 'deterministic' | 'heuristic';
  source?: 'builtin' | 'plugin';
  pluginId?: string;
}
```

**api-spec.md (Section 2.3, `src/types/security.ts`):**
```typescript
interface SecurityFinding {
  id: string;
  checkId: string;
  severity: Severity;
  cvssScore: number;
  component: string;
  description: string;
  remediation: string;
  confidence: 'deterministic' | 'heuristic';
  source: 'builtin' | 'plugin';   // NOTE: required, not optional
  pluginId?: string;
}
```

**security-design.md (Section 3):**
```typescript
interface SecurityFinding {
  id: string;
  checkId: string;
  severity: Severity;
  confidence: ConfidenceMode;
  confidenceLevel: Confidence;     // EXTRA FIELD: 'high' | 'medium' | 'low'
  cvssScore: number;
  component: string;
  title: string;                   // EXTRA FIELD: max 100 chars
  description: string;
  evidence: string;                // EXTRA FIELD
  remediation: string;
  references: string[];            // EXTRA FIELD
  suppressed: boolean;             // EXTRA FIELD
  suppressionJustification?: string; // EXTRA FIELD
}
```

**Findings:**

| Field | system-design | api-spec | security-design | Status |
|-------|--------------|----------|-----------------|--------|
| `source` | optional | required | absent | INCONSISTENT |
| `confidenceLevel` | absent | absent | present | INCONSISTENT |
| `title` | absent | absent | present | INCONSISTENT |
| `evidence` | absent | absent | present | INCONSISTENT |
| `references` | absent | absent | present | INCONSISTENT |
| `suppressed` | absent (on SuppressedFinding) | absent (on SuppressedFinding) | inline | INCONSISTENT |

**Decision:** RECOMMEND CHANGE before Sprint 1. The security-design version is the most complete and thoughtful. The `title`, `evidence`, and `references` fields are genuinely useful for reporting quality and audit trail compliance (EU AI Act requirement). The `confidenceLevel` field adds granularity that helps operators triage heuristic findings. The canonical interface should be the security-design version, minus the `suppressed`/`suppressionJustification` fields (which belong on the `SuppressedFinding` subtype as system-design and api-spec correctly model). The `source` field should be optional as in system-design (Sprint 1-3 has no plugins; requiring it adds boilerplate for no benefit until Sprint 4).

**Rationale:** The security-design was written by a domain expert whose model is richer. The other two documents should adopt its finding shape. This must be resolved before Sprint 1 because `SecurityFinding` is consumed by the scoring engine, all three reporters, and the JSON output schema -- changing it after Sprint 2 delivery would break multiple modules.

#### 1.2 CheckResult Interface Divergence

**system-design.md (Section 3.2):**
```typescript
interface CheckResult {
  checkId: string;
  category: ConformanceCategory;
  level: 'pass' | 'warning' | 'failure';
  message: string;
  details?: { field?, actual?, expected?, specRef?, component? };
  confidence: 'deterministic' | 'heuristic';
}
```

**api-spec.md (Section 2.2):**
```typescript
interface CheckResult {
  checkId: string;
  name: string;              // EXTRA
  category: ConformanceCategory;
  level: 'pass' | 'failure' | 'warning' | 'info';  // 'info' added
  description: string;       // different name from 'message'
  specReference: string;     // EXTRA (required)
  specVersion: string | string[];  // EXTRA
  confidence: 'deterministic' | 'heuristic';
  evidence?: string;         // EXTRA
  component?: string;        // EXTRA (top-level)
  suppressed: boolean;       // EXTRA
}
```

**Findings:**

- The field for the human-readable text is named `message` in system-design and `description` in api-spec. This will cause immediate implementation confusion.
- The api-spec adds `name`, `specReference`, `specVersion`, `evidence`, and `suppressed` fields that are absent from system-design. The `specReference` and `specVersion` fields are valuable for FR-033 compliance (spec version declaration).
- The api-spec includes the `info` level which system-design omits. FR-035 requires informational recording of unknown method responses, so `info` is needed.
- The system-design nests component information in a `details` sub-object; the api-spec promotes `component` to a top-level field. The flat structure is better for reporter consumption.

**Decision:** RECOMMEND CHANGE before Sprint 1. Adopt the api-spec `CheckResult` shape as canonical, as it is more complete and better aligned with requirements FR-033 and FR-035. Rename the field to `description` for consistency with `SecurityFinding.description`.

#### 1.3 Data Flow Consistency

The high-level pipeline described in system-design Section 1 (input -> transport -> protocol -> validators -> scoring -> reporters -> exit) is correctly reflected in:

- The `main()` orchestration pseudocode (system-design Section 2.1, 16 steps)
- The module dependency graph (system-design Section 4)
- The internal module interfaces in api-spec Section 2
- The security check engine architecture in security-design Section 2

**Finding:** CONSISTENT. All documents agree on the unidirectional pipeline flow. The protocol engine produces a `ProtocolExchangeRecord` that feeds both conformance validators and security analyzers. Results flow into the scoring engine, then reporters. No document shows any component reaching backward in the pipeline.

#### 1.4 Directory Structure Consistency

system-design Section 5 provides the definitive directory tree. api-spec references module paths in its interface definitions (e.g., `src/validators/security/runner.ts`, `src/scoring/engine.ts`). security-design references module paths for each analyzer (e.g., `src/validators/security/injection.ts`, `src/validators/security/cors.ts`).

**Finding:** CONSISTENT. All module path references across all three documents resolve to entries in the system-design directory structure. No orphan paths were found.

#### 1.5 Error Handling Strategy Consistency

system-design Section 8 defines three error categories (Success/0, Check Failure/1, Tool Error/2). api-spec Section 5 defines the same three exit codes with identical semantics. The scoring engine's exit code determination logic is documented identically in both system-design Section 2.7 and api-spec Section 2.5.

**Finding:** CONSISTENT with one minor discrepancy. system-design Section 8.3 says "Server does not respond to initialize -> Overall score is 0" but api-spec Section 5 says "MCP initialization handshake timed out -> exit code 2". These are describing different severity levels of the same event: a complete initialization timeout (no response at all) is exit code 2, while a malformed or error response to initialize (server responded but poorly) is score 0 with exit code 0 or 1.

**Decision:** ACCEPT AS-IS. The distinction is correct and both documents are consistent when read carefully. The implementation should ensure the protocol engine distinguishes "no response received" (transport timeout -> exit 2) from "error response received" (protocol error -> score 0).

#### 1.6 Config Schema Consistency

system-design Section 2.2 shows a config schema with 6 fields. api-spec Section 4.1 shows a complete schema with 11 fields. system-design Section 3.5 defines `VerificationConfig` with 13 fields.

**Finding:** The api-spec config schema is the most authoritative for the JSON config file. The system-design `VerificationConfig` type includes runtime-only fields (`compareLast`, `verbose`, `format`, `output`) that are set by CLI flags but also appear in the config file. This is correct -- the `VerificationConfig` type is the merged result of defaults + config file + CLI flags, not a direct representation of the config file schema.

**Decision:** ACCEPT AS-IS. The config file schema (api-spec) and the runtime config type (system-design) are correctly distinct.

#### 1.7 Format Values

api-spec Section 1.2 defines `--format` as accepting `terminal`, `json`, `markdown`, `sarif`. system-design Section 2.8 and the reporter factory only mention `terminal`, `json`, `markdown`. system-design Section 3.5 `VerificationConfig.format` type is `'terminal' | 'json' | 'markdown'`.

**Finding:** MINOR INCONSISTENCY. The `sarif` format is Sprint 4 and should appear in the config type as a future addition, but its absence from the Sprint 1-3 type definition is acceptable. However, the api-spec should more clearly mark `sarif` as Sprint 4 in the `--format` enum table (it does mention Sprint 4 in the table but the enum includes it in the "allowed values" column without distinction).

**Decision:** ACCEPT AS-IS. The `sarif` value should simply not be accepted by the CLI parser until Sprint 4. The config type will be extended at that time.

---

### 2. Completeness Check

#### 2.1 Functional Requirement Coverage

I traced every FR to its implementation home across the three architecture documents.

**Sprint 1 (P0) Requirements -- FR-001 through FR-035 plus FR-046-048, FR-052, FR-063-065:**

| Requirement | system-design | api-spec | security-design | Covered |
|-------------|--------------|----------|-----------------|---------|
| FR-001 (verify command) | Section 2.1 | Section 1.3 | -- | YES |
| FR-004 (version flag) | Section 2.1 flags table | Section 1.2 | -- | YES |
| FR-005 (help flag) | Section 2.1 flags table | Section 1.2 | -- | YES |
| FR-006 (exit 0) | Section 2.7 | Section 5 | -- | YES |
| FR-007 (exit 1) | Section 2.7 | Section 5 | -- | YES |
| FR-008 (exit 2) | Section 8 | Section 5, 6 | -- | YES |
| FR-010 (timeout) | Section 2.1 flags table | Section 1.2 | -- | YES |
| FR-011 (auto-detect) | Section 2.3 | Section 1.3 | -- | YES |
| FR-012 (stdio) | Section 2.3.1 | Section 2.1 | CTRL-008 | YES |
| FR-013 (HTTP+SSE) | Section 2.3.2 | Section 2.1 | CTRL-003, CTRL-004 | YES |
| FR-014 (init handshake) | Section 2.4 | -- | -- | YES |
| FR-015 (tools/list) | Section 2.4 | -- | -- | YES |
| FR-016 (resources/list) | Section 2.4 | -- | -- | YES |
| FR-017 (prompts/list) | Section 2.4 | -- | -- | YES |
| FR-018 (error probing) | Section 2.4 | -- | Section 2.5 | YES |
| FR-019 (termination) | Section 2.3.1, 2.3.2 | -- | -- | YES |
| FR-021-031 (conformance) | Section 2.5 | Section 1.3 check IDs | -- | YES |
| FR-032 (scoring) | Section 2.7 | Section 2.5 | -- | YES |
| FR-033 (spec version) | -- | Section 3.2 meta | -- | YES |
| FR-046-048 (terminal) | Section 2.8.1 | Section 2.4 | -- | YES |
| FR-052 (score system) | Section 2.7 | Section 2.5 | -- | YES |
| FR-063 (cold start) | Section 6 | -- | -- | YES |
| FR-064 (cross-platform) | Section 2.3.1 | -- | CTRL-008 | YES |
| FR-065 (Node.js LTS) | Section 7.4 | -- | -- | YES |

**Sprint 2 (P0) Requirements -- FR-036 through FR-045:**

| Requirement | system-design | api-spec | security-design | Covered |
|-------------|--------------|----------|-----------------|---------|
| FR-036 (injection) | Section 2.6.1 | Section 1.3 | Section 2.1 | YES |
| FR-037 (CORS) | Section 2.6.2 | Section 1.3 | Section 2.2 | YES |
| FR-038 (auth gap) | Section 2.6.3 | Section 1.3 | Section 2.3 | YES |
| FR-039 (poisoning) | Section 2.6.4 | Section 1.3 | Section 2.4 | YES |
| FR-040 (leakage) | Section 2.6.5 | Section 1.3 | Section 2.5 | YES |
| FR-041 (finding model) | Section 3.3 | Section 2.3 | Section 3 | YES (see 1.1) |
| FR-044 (CVSS) | Section 2.6.* | -- | Section 4 | YES |
| FR-045 (fixtures) | Section 5 (test dir) | -- | Section 6 | YES |

**Sprint 3 and 4 requirements are covered at the interface level but not yet at implementation detail level, which is expected at this design phase.**

**Finding:** All 80 functional requirements have an identifiable implementation home. No requirement is orphaned. Coverage is complete.

#### 2.2 Non-Functional Requirement Architectural Support

| NFR | Target | Architectural Support | Assessment |
|-----|--------|----------------------|------------|
| NFR-001 (p95 < 10s) | < 10 seconds | Per-operation timeouts, single-threaded pipeline, no unnecessary I/O | ADEQUATE |
| NFR-002 (cold start < 5s) | < 5 seconds | Single-file CJS bundle, zero runtime deps, < 5MB package | ADEQUATE |
| NFR-003 (package < 5MB) | < 5 MB | Size budget in system-design Section 6.3, size-limit CI enforcement | ADEQUATE |
| NFR-004 (memory < 128MB) | < 128 MB | Tools array cap at 500 entries, response size limits (CTRL-003) | ADEQUATE |
| NFR-005 (graceful timeout) | timeout + 2s | Transport timeout + 2s SIGKILL for stdio | ADEQUATE |
| NFR-009 (no telemetry) | Zero outbound calls | CTRL-005 | ADEQUATE |
| NFR-012 (no code execution) | No eval() | CTRL-002 | ADEQUATE |
| NFR-021 (test coverage > 85%) | > 85% line | Vitest config thresholds in system-design Section 7.1 | ADEQUATE |
| NFR-022 (modular arch) | No circular deps | dependency-cruiser in CI | ADEQUATE |
| NFR-023 (strict TypeScript) | strict: true | ESLint + tsc in CI | ADEQUATE |

**Finding:** All 24 NFRs have architectural support documented in at least one of the three design documents. No NFR is architecturally unsupported.

#### 2.3 Security Check to Analyzer Mapping

| Security Check (product-vision) | Analyzer (system-design) | Detection Logic (security-design) | Check ID (api-spec) | Covered |
|--------------------------------|--------------------------|-----------------------------------|--------------------|---------|
| Command injection susceptibility | InjectionAnalyzer (2.6.1) | Section 2.1 (3 axes + constraints) | `command-injection` | YES |
| Wildcard CORS policy | CorsAnalyzer (2.6.2) | Section 2.2 (deterministic header check) | `cors-wildcard` | YES |
| Missing/misconfigured auth | AuthAnalyzer (2.6.3) | Section 2.3 (3-phase detection) | `missing-auth` | YES |
| Tool poisoning patterns | PoisoningAnalyzer (2.6.4) | Section 2.4 (5 categories) | `tool-poisoning` | YES |
| Information leakage in errors | LeakageAnalyzer (2.6.5) | Section 2.5 (5 pattern categories) | `info-leakage` | YES |

**Finding:** COMPLETE. Every security check from the product vision has a matching analyzer in system-design, detailed detection logic in security-design, and a check ID in api-spec.

#### 2.4 Plugin System Future-Proofing

The plugin system is designed for Sprint 4 with interfaces defined across all three documents:

- system-design Section 2.9: `Plugin` interface, `PluginContext`, isolation via `Promise.race` with 30s timeout
- api-spec Section 2.6: Public plugin types exported from package, `UserConfig` for `mcp-verify.config.js`
- security-design CTRL-002: Plugin loading uses `import()` with resolved filesystem paths; no sandboxing

**Finding:** The plugin interface is well-designed for extensibility. However, there is a gap:

**Issue:** The `PluginContext` exposes raw `unknown[]` for `toolsList`, `resourcesList`, and `promptsList`. Plugin authors will need to write their own type guards for every field. This is documented and intentional (avoids forcing plugin authors to import internal types), but it means every plugin will contain boilerplate type narrowing code.

**Decision:** DEFER to Sprint 4. This is a developer experience concern, not a correctness issue. Consider publishing helper type guards (e.g., `isMCPTool(x): x is MCPTool`) alongside the plugin types to reduce boilerplate.

#### 2.5 Config Schema Completeness

api-spec Section 4.1 defines 11 config file fields. Cross-referencing against all documented options:

| Documented Option | In Config Schema | Notes |
|-------------------|-----------------|-------|
| `failOnSeverity` | YES | |
| `conformanceThreshold` | YES | |
| `skip` | YES | Supports both string and object forms |
| `transport` | YES | |
| `timeout` | YES | |
| `checkMode` | YES | |
| `format` | YES | |
| `output` | YES | |
| `verbose` | YES | |
| `noHistory` | YES | |
| `noColor` | YES | |
| `noSecurity` | NOT IN CONFIG | Only a CLI flag per api-spec |
| `noConformance` | NOT IN CONFIG | Only a CLI flag per api-spec |

**Finding:** `--no-security` and `--no-conformance` are defined as CLI-only flags in api-spec but are not in the config file schema. This is a reasonable design choice -- these are session-level overrides, not project-level settings. However, the `VerificationConfig` type in system-design Section 3.5 does not include `noSecurity` or `noConformance` fields either, while the scoring engine needs to know about them.

**Decision:** RECOMMEND CHANGE before Sprint 1. Add `noSecurity: boolean` and `noConformance: boolean` to the `VerificationConfig` type with defaults of `false`. These are set from CLI flags only (not config file) but must flow through the config object to the conformance runner and security runner.

---

### 3. Scalability Assessment

#### 3.1 MCP Servers with 100+ Tools

The security-design (THREAT-002 mitigation) caps the aggregated tools array at 500 entries. system-design Section 2.6.1 processes tools sequentially. For 100 tools with 10 properties each, the injection analyzer performs approximately 1,000 string comparisons and regex matches, which completes in sub-millisecond time.

**Assessment:** ADEQUATE. The 500-tool cap handles the degenerate case. The sequential processing model handles 100 tools trivially. The architecture does not need parallelism for this workload.

**Potential concern:** The tool schema validator (system-design Section 2.5.3) performs JSON Schema draft-07 structural validation on each tool's `inputSchema`. For servers with 100+ tools, each with complex nested schemas, this could become the performance bottleneck. The system-design explicitly notes that a lightweight embedded validator is used (not Ajv), but the complexity of the embedded validator is not specified.

**Decision:** FLAG FOR Sprint 1 implementation. The JSON Schema structural validator should be benchmarked with a 100-tool, complex-schema fixture during Sprint 1 development. If validation exceeds 1 second for 100 tools, consider lazy validation (validate first N tools in detail, sample the rest).

#### 3.2 Future MCP Spec Versions

The architecture explicitly versions spec checks:

- FR-033 requires all checks to reference a spec version
- api-spec `CheckResult` includes `specVersion` field
- The conformance validator registry (system-design Section 2.5) is an array of functions, making it easy to add version-gated validators
- product-vision Risk 1 mitigation includes version-pinning checks

**Assessment:** GOOD. The pluggable validator registry and per-check spec version gating mean a new MCP spec version requires adding new validator functions and potentially modifying existing ones, but does not require restructuring the pipeline. The `ProtocolExchangeRecord` is the key data structure; if the MCP protocol adds new message types, new fields would be added to this record.

**Potential concern:** The `ProtocolExchangeRecord` (system-design Section 2.4) has a fixed set of fields (`toolsListResponses`, `resourcesListResponse`, `promptsListResponse`, etc.). If MCP 2.x adds new capability types (e.g., `embeddings`, `workflows`), the record would need new fields and the protocol engine would need new steps.

**Decision:** ACCEPT AS-IS. This is inherent in any typed protocol client. The cost of adding new fields and steps is linear and well-contained within the protocol engine module. The pipeline architecture means downstream modules (validators, scoring, reporters) only need changes if they need to analyze the new data.

#### 3.3 Plugin System Extensibility

The plugin API surface is minimal:

- Plugins receive a `PluginContext` with read-only protocol data
- Plugins return `SecurityFinding[]` using the same interface as built-in analyzers
- Plugin findings flow through the same scoring and reporting pipeline

**Assessment:** GOOD for security-focused plugins. However, the plugin system only produces `SecurityFinding[]`. Plugins cannot produce `CheckResult[]` (conformance findings). This means community plugins cannot extend the conformance engine.

**Decision:** DEFER to Sprint 4. Document this limitation. If conformance extensibility is needed, the plugin interface can be extended to return `{ securityFindings: SecurityFinding[], conformanceResults: CheckResult[] }` without breaking existing plugins (existing plugins that return `SecurityFinding[]` would be wrapped).

#### 3.4 Reporter Extensibility

The reporter factory (system-design Section 2.8) creates reporters by format string. Adding a new reporter means:

1. Implementing the `Reporter` interface
2. Adding a case to the factory
3. Adding the format value to the CLI enum

**Assessment:** ADEQUATE. The `Reporter` interface is simple (`render(result: VerificationResult): string`). New reporters do not modify the core pipeline. The SARIF reporter (Sprint 4) is already planned using this pattern.

---

### 4. Risk Assessment

#### 4.1 Single Points of Failure in the Pipeline

**Risk: ProtocolExchangeRecord as the sole data interchange format**

Every downstream module (conformance validators, security analyzers, scoring engine) depends on the `ProtocolExchangeRecord` type. If this type is wrong or incomplete, every module is affected.

**Mitigation:** The type is well-defined in system-design Section 2.4 with clear field semantics. The test strategy (Section 7.2) uses serialized `ProtocolExchangeRecord` fixtures, meaning the type is tested from the protocol engine's output contract.

**Assessment:** LOW RISK. The single data interchange type is actually a strength, not a weakness. It provides a clean seam for testing and ensures all modules work from the same data.

**Risk: Commander.js as the sole runtime dependency**

If Commander.js has a critical vulnerability or breaking change, it blocks the entire project.

**Mitigation:** Version pinning (security-design Section 5, CTRL-006). Commander.js is mature (14+ years, 500M+ downloads) with a stable API.

**Assessment:** LOW RISK. The mitigation is appropriate. The alternative (implementing CLI parsing from scratch) would be higher risk due to edge-case handling.

#### 4.2 Performance Bottlenecks

**Identified bottleneck 1: JSON Schema structural validation**

system-design Section 2.5.3 notes a "purpose-built draft-07 structural validator" for tool `inputSchema` validation. This is custom code that must handle the full JSON Schema draft-07 keyword set. Building a correct and fast JSON Schema validator is non-trivial.

**Assessment:** MEDIUM RISK. If the custom validator is slow or incomplete, it affects both correctness (false conformance results) and performance (p95 < 10s target). The decision to avoid Ajv (which is ~200KB) to meet the 5MB package budget is reasonable, but the custom implementation must be carefully tested.

**Decision:** FLAG FOR Sprint 1. The custom JSON Schema validator needs a dedicated test suite with at least 50 schema fixtures covering all draft-07 keywords used in practice by MCP tool schemas. Performance must be benchmarked.

**Identified bottleneck 2: Regex-based security analyzers**

security-design THREAT-001 explicitly calls out ReDoS risk from analyzer regex patterns. The mitigation (no unbounded quantifiers on patterns with back-references or nested groups, plus pathological input testing) is sound but depends on disciplined implementation.

**Assessment:** LOW-MEDIUM RISK. The security-design's regex safety policy is thorough. The residual risk is developer error introducing a vulnerable regex in a later sprint.

**Decision:** RECOMMEND adding an automated regex complexity linter (e.g., `safe-regex` or `eslint-plugin-regexp`) to the ESLint configuration. This converts the code-review-dependent policy into an automated enforcement.

#### 4.3 Tight Coupling Assessment

The architecture explicitly prevents tight coupling through:

- All inter-module communication via `src/types/` (system-design Section 4, dependency rules)
- No circular imports (enforced by dependency-cruiser)
- Only `src/cli.ts` orchestrates cross-module calls
- Validators and analyzers are pure functions with no side effects

**Assessment:** LOW RISK. The architecture is well-decoupled. The weakest coupling point is the `ProtocolExchangeRecord` type, which could accumulate fields over time, but this is inherent in a pipeline architecture and is manageable.

#### 4.4 Areas Needing Revision in Later Sprints

**Area 1: The `Severity` type is missing `info` in some locations**

system-design Section 3.3 and api-spec Section 2.3 define `Severity = 'critical' | 'high' | 'medium' | 'low'`. But the CORS analyzer in security-design Section 2.2 assigns severity `Info` for loopback targets, and the `failOnSeverity` config accepts `'none'` as a value. The `info` severity level is absent from the type.

**Decision:** RECOMMEND CHANGE before Sprint 2. Add `'info'` to the `Severity` type. CORS wildcard on loopback should produce an `info`-level finding, not be silently dropped. The scoring engine should treat `info` findings as non-blocking regardless of `failOnSeverity` setting.

**Area 2: HTTP+SSE transport may need Streamable HTTP support**

The MCP specification (as of 2025) introduced Streamable HTTP as an alternative to SSE. The current architecture only supports the older SSE-based HTTP transport. If MCP servers migrate to Streamable HTTP, the `HttpTransport` implementation would need updates.

**Decision:** FLAG FOR Sprint 2+. The `Transport` interface abstraction means adding Streamable HTTP support is contained within `src/transport/`. No pipeline changes would be needed. Monitor MCP spec evolution.

**Area 3: Dashboard bundle size budget**

system-design Section 6.3 allocates 1MB for dashboard static assets (Sprint 4). The dashboard uses vanilla JavaScript with no framework, which is good for size, but charting 100+ data points with SVG generation could push against this limit.

**Decision:** DEFER to Sprint 4. The budget is reasonable for a chart-oriented dashboard. If exceeded, consider lazy loading chart assets.

---

## Decisions

### D-001: Unify SecurityFinding Interface

**Issue:** Three documents define `SecurityFinding` with different field sets.
**Decision:** Adopt the security-design version as the canonical shape, with `suppressed`/`suppressionJustification` on the `SuppressedFinding` subtype. Add `title`, `evidence`, `references`, and `confidenceLevel` to the canonical interface. Make `source` optional (Sprint 4 addition).
**Rationale:** The security-design model is the most complete. The extra fields directly serve the EU AI Act audit trail requirement and improve operator experience. Changing the interface after Sprint 2 (when all analyzers are implemented) would be significantly more expensive.

### D-002: Unify CheckResult Interface

**Issue:** system-design and api-spec define `CheckResult` with different field names and field sets.
**Decision:** Adopt the api-spec version as canonical. Use `description` (not `message`). Include `name`, `specReference`, `specVersion`, `evidence`, `component` (top-level), and `suppressed`. Add the `info` level.
**Rationale:** The api-spec version satisfies FR-033 (spec version declaration) and FR-035 (info-level results). The flat structure is better for reporter consumption.

### D-003: Add `info` to Severity Type

**Issue:** The `Severity` type omits `info`, but security analyzers need it for low-impact informational findings.
**Decision:** Extend `Severity` to `'critical' | 'high' | 'medium' | 'low' | 'info'`. Info findings are always non-blocking.
**Rationale:** The CORS analyzer explicitly produces info-level findings for loopback targets. Without the type, this behavior would require a special case (omitting the finding entirely), which loses information.

### D-004: Add noSecurity/noConformance to VerificationConfig

**Issue:** CLI flags `--no-security` and `--no-conformance` have no representation in the `VerificationConfig` type.
**Decision:** Add `noSecurity: boolean` and `noConformance: boolean` to `VerificationConfig` with default `false`.
**Rationale:** The conformance runner and security runner need to check these values. Passing them outside the config object would violate the architecture's single-config-object pattern.

### D-005: Accept Pipeline Architecture

**Issue:** The unidirectional pipeline (transport -> protocol -> validators -> scoring -> reporters) is the core architectural pattern.
**Decision:** Accept as-is. No changes needed.
**Rationale:** The pipeline is clean, testable, and maps directly to the product requirements. Each stage has clear inputs and outputs. The architecture avoids unnecessary complexity (no event bus, no dependency injection framework, no plugin middleware chain).

### D-006: Accept Single-File CJS Bundle Strategy

**Issue:** The build strategy produces a single minified CJS file with all dependencies inlined.
**Decision:** Accept as-is.
**Rationale:** This directly satisfies NFR-002 (cold start < 5s), NFR-003 (package < 5MB), and the product vision's "zero-config, zero-account" positioning. The trade-off (harder to debug in production) is acceptable because `--verbose` provides diagnostic output and the tool is stateless.

### D-007: Accept Custom JSON Schema Validator Decision

**Issue:** system-design chooses a custom JSON Schema draft-07 structural validator over Ajv.
**Decision:** Accept with a caveat: the custom validator must be benchmarked and tested with a dedicated suite of at least 50 schema fixtures before Sprint 1 completion.
**Rationale:** Ajv is approximately 200KB minified, which would consume 7% of the 3MB JS budget. The custom validator only needs to validate structure (not evaluate schemas against data), which is a simpler problem. The risk is manageable with adequate testing.

### D-008: Add Automated Regex Safety Linter

**Issue:** Security analyzers use regex patterns susceptible to ReDoS if improperly constructed.
**Decision:** Add `eslint-plugin-regexp` or equivalent to the ESLint configuration to automatically flag potentially catastrophic regex patterns.
**Rationale:** The security-design's manual review policy is necessary but insufficient as the sole control. Automated enforcement prevents regression when new patterns are added in later sprints.

---

## Recommendations

### Immediate (Before Sprint 1)

1. **Unify the `SecurityFinding` interface** across all three documents (D-001). Produce a single canonical type definition in `src/types/security.ts` that all documents reference. This is the highest-priority pre-Sprint-1 action because the type is consumed by 6+ modules.

2. **Unify the `CheckResult` interface** across system-design and api-spec (D-002). Adopt the api-spec version.

3. **Add `info` to `Severity`** (D-003) and add `noSecurity`/`noConformance` to `VerificationConfig` (D-004).

4. **Add `eslint-plugin-regexp`** to the dev dependency list and ESLint configuration (D-008).

5. **Create a JSON Schema validator test plan** identifying the 50+ schema fixtures needed for the custom validator (D-007). This does not need to be implemented before Sprint 1 starts, but the test plan should exist so the validator implementation can be developed against it.

### Deferred (Sprint 2+)

1. **Benchmark tool schema validation** with 100-tool servers during Sprint 1 development. If performance exceeds 1 second, implement sampling (Section 3.1).

2. **Monitor MCP Streamable HTTP adoption** and plan transport support if adoption materializes (Section 4.4, Area 2).

3. **Consider publishing plugin type guard helpers** alongside the plugin API in Sprint 4 (Section 2.4).

4. **Consider extending the plugin interface** to support conformance findings (not just security findings) if community demand emerges (Section 3.3).

5. **Track the `info` severity interaction with `failOnSeverity: "none"`**. Currently `none` means "no findings trigger exit 1," which is correct, but ensure the implementation handles the `info` level consistently.

---

## Consequences

### Positive

1. **The pipeline architecture is excellent.** The unidirectional data flow, shared types module, and composition-root-only orchestration pattern result in an architecture that is trivially testable, easily extensible, and resistant to coupling creep. Each module can be developed and tested in isolation using plain data fixtures.

2. **The security threat model is thorough.** security-design addresses threats to the tool itself (not just the servers it checks), including parser exploitation, memory exhaustion, SSRF, information leakage, and supply chain risk. This level of threat modeling is unusual for a CLI tool and appropriate given that the tool connects to potentially hostile targets.

3. **The scoring algorithm is transparent.** The weighted category scoring with explicit penalty values and documented category weights is reproducible and auditable. The product vision's EU AI Act compliance target is well-served by this transparency.

4. **The zero-runtime-dependency strategy is bold and correct.** Bundling everything into a single CJS file eliminates dependency confusion, supply chain risk, and install-time surprises. The trade-off (implementing SSE parsing, color output, and JSON Schema validation in-house) is justified by the product's security positioning.

5. **The test strategy is well-layered.** Unit tests against data fixtures (no mocking), integration tests against real fixture servers, and snapshot tests for reporter output cover the three most important quality dimensions: correctness, end-to-end behavior, and output stability.

6. **The error message catalog is production-quality.** api-spec Section 6.2 defines exact error messages with cause analysis and remediation hints. This directly satisfies NFR-019 (actionable error messages) and is a major usability differentiator for a CLI tool.

### Negative

1. **The SecurityFinding interface inconsistency is a real risk.** If Sprint 1 starts without resolving this, the three development teams (conformance, security, reporting) will implement against different type definitions, causing integration failures in Sprint 2 when the security analyzers are connected to reporters. This is the single highest-impact finding in this review.

2. **The custom JSON Schema validator is an implementation risk.** Building a correct draft-07 structural validator is harder than it appears. Edge cases in `$ref` resolution, `allOf`/`oneOf`/`anyOf` keyword semantics, and recursive schema structures are common sources of bugs. The decision is architecturally sound (Ajv is too large), but the implementation needs disproportionate test investment relative to its code size.

3. **Plugin execution has no sandboxing.** Plugins run in the same Node.js process with full access to the filesystem, network, and environment variables. This is documented and the security-design explicitly states operators are responsible for trusting their plugins. However, for a security tool, this creates a cognitive dissonance: the tool is designed to detect untrustworthy server behavior, but its extension mechanism trusts extensions completely.

### Neutral

1. **Commander.js as the sole runtime dependency** is a defensible choice. It is mature and well-maintained. The alternative (implementing a full CLI parser) would add development time with marginal benefit.

2. **The architecture is single-threaded and single-process.** This is appropriate for the workload (sequential protocol probing of one server per invocation). There is no performance reason to add concurrency.

3. **The Sprint 4 features (dashboard, history, plugins) are cleanly separated** from the Sprint 1-3 core. Their interfaces are defined but their modules are explicitly marked as Sprint 4. No Sprint 1-3 module depends on Sprint 4 code. This is good sprint planning discipline.

4. **The test fixture approach** (implementing real MCP servers as test fixtures rather than mocking the protocol) is more expensive but significantly more realistic. Given that the tool's purpose is to verify real protocol behavior, mock-based testing would provide false confidence.

---

## Architecture Quality Score

| Dimension | Score (1-10) | Justification |
|-----------|-------------|---------------|
| **Modularity** | 9 | Strict dependency rules enforced by dependency-cruiser, shared types module, no circular imports, composition root pattern. The only deduction is that the `ProtocolExchangeRecord` type is large and could benefit from sub-typing as the protocol surface grows. |
| **Testability** | 10 | The architecture is designed for testing from the ground up. Pure functions, data-in data-out, no side effects in core modules, serialized fixture support, no mocking required. This is a rare achievement in CLI tool architecture. |
| **Extensibility** | 8 | Validator registries (conformance and security) are open for extension. Reporter and transport factories support new implementations. Plugin system is well-designed. Deduction: plugins can only produce security findings, not conformance results; and the `ProtocolExchangeRecord` has a fixed shape that requires code changes for new MCP capabilities. |
| **Performance Design** | 8 | Response size limits, tools array cap, per-operation timeouts, single-file bundle, and size budget enforcement are all well-specified. Deduction: the custom JSON Schema validator is unproven, and there is no explicit strategy for handling slow servers beyond the per-operation timeout (no connection pooling, no retry, which is correct but means slow servers always score poorly on timing-sensitive checks). |
| **Security Posture** | 9 | Threat model covers five threat categories with specific mitigations. Response size limits, redirect handling, regex safety policy, no eval(), TLS enforcement, and zero-telemetry are all well-documented. Deduction: plugin system lacks sandboxing (acknowledged and accepted). |
| **Documentation Quality** | 8 | The three documents total approximately 60,000 tokens of detailed, cross-referenced, internally consistent specification. Type definitions are provided in TypeScript. Test examples are provided. Deduction: the SecurityFinding and CheckResult inconsistencies indicate the documents were written in parallel without a final reconciliation pass. |

**Overall Score: 8.7 / 10**

This is a strong architecture for a CLI tool of this scope. The pipeline pattern, testability focus, and security-conscious design are professional-grade. The interface inconsistencies identified in this review are the primary liability -- they are structural disagreements between the documents that will cause integration issues if not resolved before development begins. Resolving D-001 and D-002 before Sprint 1 starts is the single most impactful action this review recommends.

---

*Architecture review completed by architect-reviewer (opus). Evaluated all five architecture documents comprising approximately 60,000 tokens of specification. Identified 2 critical interface inconsistencies (D-001, D-002), 2 type system gaps (D-003, D-004), 1 automated enforcement recommendation (D-008), and 1 implementation risk flag (D-007). Overall architecture quality is high, with the pipeline pattern, testability design, and security posture being particular strengths.*
