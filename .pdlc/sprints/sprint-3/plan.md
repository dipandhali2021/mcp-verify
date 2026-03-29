# Sprint 3 Plan — CI Integration

## Sprint Goal

> Ship production-ready v1.0.0 with JSON and Markdown report formats, configuration file support, CLI flag completeness, GitHub Action for CI/CD integration, and CI pipeline documentation.

## Duration
**Start:** 2026-03-29 | **End:** 2026-04-04

## Backlog Status
- Total stories remaining after Sprint 2: 15
- Stories in this sprint: 8
- Estimated velocity: 35 story points

## Stories

| ID | Story | Description | Agent(s) | Points | Priority | Dependencies |
|----|-------|-------------|----------|--------|----------|--------------|
| S-3-01 | Config file loading | Auto-discover and load `mcp-verify.json` / `.mcp-verify.json`, merge with CLI flags and defaults | backend-developer | 5 | P1 | — |
| S-3-02 | CLI flag enhancements | Add `--strict`/`--lenient`, `--verbose`, `--output`, `--transport`, `--config` flags | backend-developer | 5 | P1 | S-3-01 |
| S-3-03 | JSON reporter | Produce valid JSON report with schemaVersion, all sections per FR-049; document schema at `docs/report-schema.json` | typescript-pro | 5 | P1 | — |
| S-3-04 | Markdown reporter | GFM-compliant Markdown report with metadata, summary, conformance, security, and suppressed sections | typescript-pro | 3 | P1 | — |
| S-3-05 | GitHub Action | `action.yml` definition, entry point script, PR comment reporter, matrix support | devops-engineer | 8 | P1 | S-3-03, S-3-04 |
| S-3-06 | CI pipeline documentation | Example workflows for GitHub Actions, GitLab CI, CircleCI in `docs/examples/` | devops-engineer | 3 | P1 | S-3-05 |
| S-3-07 | Threshold & suppression wiring | Per-check suppression with justification, severity threshold, conformance threshold, confidence labels E2E | backend-developer | 3 | P1 | S-3-01, S-3-02 |
| S-3-08 | Version bump to 1.0.0 | Bump version to 1.0.0 across package.json, CLI, action.yml; verify bundle size | devops-engineer | 3 | P1 | S-3-05 |

## Subtask Breakdown

### S-3-01: Config File Loading (5 pts) — backend-developer
1. Create `src/config/loader.ts` with auto-discovery logic
2. Define config file JSON schema and types
3. Implement merge strategy: CLI flags > config file > defaults
4. Add `--config <path>` flag to CLI
5. Handle invalid JSON with descriptive error (exit code 2)
6. Handle missing config file gracefully (use defaults)
7. Add suppression config: `skip` array with `justification` entries
8. Write unit tests for config loader
9. Write integration test for config file auto-discovery
10. Wire config loader into CLI pipeline

### S-3-02: CLI Flag Enhancements (5 pts) — backend-developer
1. Add `--strict` flag (sets checkMode to 'strict')
2. Add `--lenient` flag (sets checkMode to 'lenient')
3. Add mutual exclusion validation for --strict/--lenient
4. Add `--verbose` flag
5. Add `--output <path>` flag with file write logic
6. Add `--transport <type>` override flag
7. Add `--fail-on-severity <level>` flag
8. Add `--conformance-threshold <score>` flag
9. Wire all new flags into VerificationConfig
10. Write unit tests for flag parsing and validation

### S-3-03: JSON Reporter (5 pts) — typescript-pro
1. Create `src/reporters/json.ts` implementing Reporter interface
2. Add `schemaVersion: "1.0"` to output root
3. Add `meta.thresholds` object with configured thresholds
4. Ensure all SecurityFinding fields present in output
5. Ensure suppressed findings in separate `security.suppressed` array
6. Write `docs/report-schema.json` JSON Schema file
7. Write `docs/examples/report-example.json` example
8. Write unit tests validating JSON output structure
9. Wire JSON reporter into factory
10. Ensure no ANSI codes or non-JSON text in stdout

### S-3-04: Markdown Reporter (3 pts) — typescript-pro
1. Create `src/reporters/markdown.ts` implementing Reporter interface
2. Generate metadata table with target, timestamp, version
3. Generate summary table with score and finding counts
4. Generate conformance score table per category
5. Generate security findings section with sub-sections
6. Generate suppressed findings section
7. Generate footer with version and timestamp
8. Wire Markdown reporter into factory
9. Write unit tests validating Markdown output structure

### S-3-05: GitHub Action (8 pts) — devops-engineer
1. Create `action.yml` with inputs/outputs definition
2. Create `action/index.ts` entry point script
3. Implement config auto-discovery from `$GITHUB_WORKSPACE`
4. Implement PR comment posting with `GITHUB_TOKEN`
5. Implement upsert logic for existing mcp-verify comments
6. Set action outputs: conformance-score, security-findings-count, pass
7. Build action with bundling (ncc or tsup)
8. Add matrix build isolation (unique output filenames)
9. Write GitHub Action integration test workflow
10. Write action README documentation

### S-3-06: CI Pipeline Documentation (3 pts) — devops-engineer
1. Create `docs/examples/github-actions.yml` workflow
2. Create `docs/examples/gitlab-ci.yml` pipeline
3. Create `docs/examples/circleci.yml` config
4. Add inline comments explaining each configuration option
5. Add example with matrix build for multiple targets
6. Add example with config file usage
7. Add example with PR comment and threshold enforcement

### S-3-07: Threshold & Suppression E2E (3 pts) — backend-developer
1. Wire config file `skip` entries through to security runner
2. Add `justification` field to suppressed finding output
3. Verify suppressed findings appear labeled in all formats
4. Verify conformanceThreshold triggers exit code 1 correctly
5. Verify failOnSeverity triggers exit code 1 correctly
6. Write integration tests for threshold combinations
7. Write integration tests for suppression with justification

### S-3-08: Version Bump to 1.0.0 (3 pts) — devops-engineer
1. Update package.json version to 1.0.0
2. Update CLI version string to 1.0.0
3. Update action.yml version references
4. Verify `npm run build` succeeds
5. Verify bundle size under 5MB
6. Run full test suite
7. Update README with v1.0.0 features

## Sprint Risks

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|-----------|--------|------------|-------|
| GitHub Action entry point bundling complexity | Medium | Medium | Use simple shell script wrapper instead of ncc if bundling fails | devops-engineer |
| PR comment API requires fine-grained token permissions | Low | Low | Document required permissions; degrade gracefully | devops-engineer |
| Config file schema conflicts with existing CLI flags | Low | Medium | Establish clear precedence: CLI > config > defaults | backend-developer |
