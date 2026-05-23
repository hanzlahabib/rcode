# CI/CD Audit

## Workflow Inventory

| File | Triggers | Jobs | Node Matrix | Secrets Used |
|------|----------|------|-------------|--------------|
| `test.yml` | push/PR → main | `test`, `no-new-deps`, `syntax-check` | 18.x, 20.x, 22.x, 24.x | 0 |
| `dogfood.yml` | push/PR → main | `dogfood` (smoke checks via `scripts/dogfood-check.sh`) | 20.x only | 0 |
| `release.yml` | push tag `v*` | `release` (build, compliance, GitHub Release attach) | 20 fixed | 0 (only GITHUB_TOKEN) |
| `semantic.yaml` | PR opened/edited/sync | `main` (semantic title check) | n/a | 1 (GITHUB_TOKEN) |
| `commit-author.yaml` | PR opened/edited/sync | `main` (committer email regex check) | n/a | 1 (GITHUB_TOKEN) |
| `require-issue-link.yml` | PR opened/edited/sync/reopened | `require-issue-link` (body regex + auto-comment) | n/a | 0 (GITHUB_TOKEN via permissions) |

## Findings

### [HIGH] Semantic PR scopes are stale / mismatched

`semantic.yaml` lists scopes: `web, server, docker, k8s, e2e, docs, ci, deps, ml, strapi`. These are generic project scopes, not rcode-specific. AGENTS.md/CONTRIBUTING.md define 50+ valid scopes (`agents`, `skills`, `workflows`, `brain`, `cli`, `phases`, etc.). Because `requireScope: false`, this is not blocking today, but any scope-aware tooling or enforcement will be blind to rcode's real taxonomy. The two files have never been reconciled.

### [HIGH] No Dependabot configured

`.github/dependabot.yml` does not exist. devDependencies (`esbuild`, `picocolors`, etc.) will not receive automated security PRs. The `no-new-deps` job in `test.yml` enforces an allowlist but does not check for outdated/vulnerable versions.

### [HIGH] No CodeQL / security scanning

No `.github/workflows/codeql*.yml` or equivalent. The project has a `type: security` label and a `CODE_OF_CONDUCT`, but zero automated vulnerability scanning. This is a gap for any public OSS release.

### [MED] Release workflow does not publish to npm

`release.yml` creates a GitHub Release and attaches a `.tar.gz` bundle. There is no `npm publish` step. If the package is intended to be installable via `npm install -g rcode`, this must be added (with `NODE_AUTH_TOKEN` secret). Currently users must install from the tarball or via the custom install script.

### [MED] `validateSingleCommit: true` in semantic.yaml is aggressive for PRs with multiple commits

The semantic PR action enforces a single commit per PR. Contributors with multi-commit PRs must squash before merge. This is not documented in CONTRIBUTING.md or the PR template — it surfaces only as a CI failure.

### [MED] Caching absent across all workflows

No `actions/cache` step in any workflow. On a zero-runtime-dep project this is low cost, but `npm ci` in `release.yml` (for devDependencies) and Node setup steps would benefit from `~/.npm` cache. Build times are currently acceptable but will grow as devDependencies expand.

### [LOW] CODEOWNERS: all paths verified — no broken globs

All 27 explicit path globs in CODEOWNERS map to directories that exist in the repo. Catch-all `*` correctly points to `@hanzlahabib`. No issues found.

### [LOW] Issue template label mismatch

`feature_request.yml` applies label `type: feature` on create, but `labels.yml` defines `type: enhancement` (no `type: feature` label exists). Auto-applied label will fail silently on GitHub.

### [LOW] Issue templates contain no v4-specific fields

All four templates (`bug_report`, `feature_request`, `epic`, `task`) are generic. None reference rcode v4 concepts (brain sources, skill compliance, dogfood checks). This may confuse contributors unfamiliar with the project's structure.

## Missing

- [ ] Dependabot (no `.github/dependabot.yml`)
- [ ] CodeQL / security scanning (no workflow)
- [ ] Branch protection rules (no config file; cannot verify without API access)
- [ ] npm publish step in release workflow
- [ ] Node cache in all workflows

## Recommendations

1. **Add `.github/dependabot.yml`** for `github-actions` and `npm` ecosystems — weekly schedule, PR limit 5.
2. **Add CodeQL workflow** using `github/codeql-action` on push/PR — JavaScript/TypeScript analysis is zero config.
3. **Reconcile `semantic.yaml` scopes** with CONTRIBUTING.md's allowed list, or remove the scope list and rely on `requireScope: false` cleanly.
4. **Fix `feature_request.yml`** label: change `type: feature` → `type: enhancement` to match `labels.yml`.
5. **Document the single-commit PR requirement** in CONTRIBUTING.md and the PR template checklist.
6. **Decide on npm publish**: if the install script is the only distribution path, document that explicitly in the release workflow comments; if npm is planned, add the publish step with `NODE_AUTH_TOKEN`.
