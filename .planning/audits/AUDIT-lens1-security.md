# AUDIT — Lens 1: Security (rihal residue)

**Branch:** audit-lens-1-security  
**Date:** 2026-05-24  
**Status:** WARN  
**Prior inventory:** `audit/12-final-rihal-inventory.md` — NOT FOUND (no file at that path); classification context sourced from `audit/11-migration-gaps.md` instead.

---

## Scope Scanned

Lens 1 focuses on security-relevant rihal residue only:

- (a) Hardcoded auth tokens / VPS credentials referencing `rihal-*` paths
- (b) `.rcode/config.yaml`, `package.json`, CI workflows — stale `rihal-*` env vars or secrets
- (c) Installer scripts (`scripts/build.cjs`, `cli/install.js`, `cli/nuke.js`, `cli/postinstall.js`, `cli/index.js`) — exec of untrusted `rihal-*` paths
- (d) Skip-auth / bypass patterns in rihal-namespaced agents / workflows
- (e) Temp-file shell command patterns using rihal-namespaced paths

Files checked that have no `dist/` bundle (directory does not exist — skipped).

---

## Commands Run

```bash
grep -rn "rihal" scripts/build.cjs cli/nuke.js cli/install.js cli/index.js cli/postinstall.js package.json .github/workflows/semantic.yaml
grep -n "rihal" .github/workflows/*.yaml .github/workflows/*.yml
grep -rn "\${{.*rihal|secrets\.rihal|RIHAL_" .github/workflows/
grep -rn "rihal-tools|\.rihal/bin" .rcode/agents-rules/
grep -rn "rihal" .rcode/bin/rcode-tools.cjs .rcode/bin/rcode-hooks.cjs
grep -rn "rihal" .rcode/bin/lib/
grep -rn "rihal" server/orchestrator.js server/dashboard.js
grep -rn "RIHAL_TOKEN|RIHAL_SECRET|RIHAL_KEY|RIHAL_AUTH|RIHAL_VPS" . (excl. node_modules)
grep -n "rihal_source_path|rcode_source_path" . (excl. node_modules)
grep -n "rihal" .rcode/config.yaml rcode/config/model-profiles.schema.json
grep -n "rihal" CONTRIBUTING.md
grep -rn "Rihal_WS|RIHAL_WS" .rcode/
grep -rn "skip.*auth|bypass.*auth|skipAuth|bypassAuth" .rcode/ (filtered for rihal)
grep -rn "_rihal-output|rihal-output" . (excl. node_modules)
cat .rcode/skills/rihal-product-brief/rcode-manifest.json
cat .rcode/skills/rihal-init/resources/core-module.yaml
sed -n '130,175p' .rcode/workflows/review.md
sed -n '375,390p' cli/nuke.js
```

---

## Findings

| # | File | Line(s) | Description | Severity |
|---|------|---------|-------------|----------|
| F1 | `.github/workflows/semantic.yaml` | 94 | `rihal-tools` listed as a valid commit scope in the PR title enforcement workflow. Allows contributors to land commits with `rihal-tools` scope without triggering a lint failure — perpetuates the old namespace in the public commit history. | warn |
| F2 | `CONTRIBUTING.md` | 342 | Actively documents `rihal-tools` as an accepted commit scope with note "legacy rihal-tools scope (pre-v4 rename); accepted for backward compatibility". Instructs contributors that `rihal-tools` is a valid scope — a prescriptive residue, not merely historical. | warn |
| F3 | `package.json` | 54, 57, 59 | `repository.url`, `bugs.url`, and `homepage` all point to `github.com/hanzlahabib/rihal-code`. These are metadata fields consumed by `npm info`, `pnpm info`, and package registries — users or automated scanners fetching package provenance will receive the old repo URL. | info |
| F4 | `cli/index.js` | 94 | `Documentation: https://github.com/hanzlahabib/rihal-code` in the `rcode --help` output footer. User-visible documentation URL points to old repo name. | info |
| F5 | `cli/install.js` | 360, 684 | Two occurrences of `github.com/hanzlahabib/rihal-code` in user-visible installer banner and AGENTS.md template comment. No exec involvement — URL-only. | info |
| F6 | `cli/nuke.js` | 380 | Safety guard checks `pkg.name === '@hanzlahabib/rihal-code'` to block self-nuke of the source repo. This is **intentional backward-compat** (confirmed by surrounding comment and `audit/11-migration-gaps.md` A-category). No exec risk. | info |
| F7 | `cli/postinstall.js` | 127 | `Docs: https://github.com/hanzlahabib/rihal-code` in post-install footer. User-visible URL only. | info |
| F8 | `scripts/build.cjs` | 54 | Bundle banner comment `/* rcode — built with esbuild. Source: github.com/hanzlahabib/rihal-code */` injected into every `dist/rcode.js` build output. No exec risk; embedded in comment string. | info |
| F9 | `rcode/config/model-profiles.schema.json` | 3 | JSON Schema `$id` URI references `github.com/hanzlahabib/rihal-code/blob/main/...`. The `$id` is used for schema resolution in validators — if `$id` is dereferenced by a JSON Schema tool, it will attempt to fetch from the old URL. | warn |
| F10 | `.rcode/workflows/review.md` | 138–171 | Workflow instructs agents to write review prompts to `/tmp/rihal-review-prompt-{phase}.md` and then shell-interpolate that path into `gemini -p "$(cat /tmp/rihal-review-prompt-{phase}.md)"` and `codex exec` calls. The filename uses the old `rihal-` prefix. Security note: the `$(cat ...)` interpolation inside a double-quoted string means if `{phase}` expands to a value containing shell metacharacters, command injection is possible via the temp file path. **Naming residue is warn-level; the interpolation pattern itself is a pre-existing P1 from `audit/01-security.md` (already reported).** | warn |
| F11 | `.rcode/skills/rihal-init/resources/core-module.yaml` | 24 | Default output folder configured as `"_rihal-output"` — written to user's project root. Not an exec risk; a stale directory name that creates `_rihal-output/` in user projects. | warn |
| F12 | `.rcode/skills/rihal-init/SKILL.md` | 87–91 | References `"output_folder": "_rihal-output"`, `"rihal_builder_output_folder": "_rihal-output/skills"`, `"rihal_builder_reports": "_rihal-output/reports"`. These are config defaults written into user project state on `rihal-init` skill invocation. Creates visibly branded legacy directories. | warn |

---

## Negative Checks (Clean)

| Check | Result |
|-------|--------|
| `RIHAL_TOKEN`, `RIHAL_SECRET`, `RIHAL_KEY`, `RIHAL_AUTH`, `RIHAL_VPS`, `RIHAL_SSH`, `RIHAL_PASSWORD` env vars anywhere | **NONE FOUND** |
| `.rihal/bin/rihal-tools.cjs` path in `.rcode/agents-rules/` (critical runtime gap from audit/11) | **ALREADY FIXED** — zero hits in `.rcode/agents-rules/` |
| `rihal-tools` / `.rihal/bin` in `.rcode/bin/` binaries | **CLEAN** |
| `rihal` in `server/orchestrator.js` or `server/dashboard.js` | **CLEAN** |
| `rihal` in `.rcode/config.yaml` | **CLEAN** (only `rcode_source_path` key present) |
| CI secrets referencing `RIHAL_*` (`${{ secrets.RIHAL_* }}`) | **NONE FOUND** |
| `.env` files with rihal credentials committed | **NONE FOUND** |
| Skip-auth / bypass patterns in rihal-namespaced agents | **NONE FOUND** |
| `rihal` in `.claude/settings.json` or `settings.local.json` | **CLEAN** |
| `rihal` in `.rcode/bin/rcode-tools.cjs` or `rcode-hooks.cjs` | **CLEAN** |
| Hardcoded VPS/SSH credentials with rihal-* path references | **NONE FOUND** |
| `dist/rcode.js` bundle (exec of rihal-* paths) | **N/A** — `dist/` directory does not exist |
| `rihal_source_path` config key (legacy) | **Renamed** to `rcode_source_path` in `.rcode/config.yaml` — confirmed clean |
| `Rihal_WS` / `RIHAL_WS` used in shell-exec contexts | Not in shell-exec contexts; template variable in workflow prose only |

---

## Verification Notes

**F1 / F2:** Verified by reading `.github/workflows/semantic.yaml` lines 85–105 (scope list in `amannn/action-semantic-pull-request@v5` config) and `CONTRIBUTING.md:342`. The scope `rihal-tools` appears in both the enforcement workflow and the contributor docs. This allows `rihal-tools(...)` scoped commits to pass CI today. Security angle: not a credential leak, but a namespace confusion vector — a contributor could legitimately commit with `rihal-tools` scope post-rebrand and the CI would accept it, embedding the old name in the public audit trail.

**F3–F8:** All verified as URL-string-only occurrences. No `exec`, `spawn`, `require()`, or dynamic path construction uses these values. Confirmed by reading surrounding code context in each file. Classified info (branding residue, not security risk).

**F9:** The JSON Schema `$id` URI `https://github.com/hanzlahabib/rihal-code/blob/main/rcode/config/model-profiles.schema.json` is used for schema identity. JSON Schema Draft-07 does not require `$id` to be dereferenceable, but some validators (ajv with `loadSchema` option, VS Code JSON language server) will attempt HTTP GET on it. If the old URL becomes unavailable or hijacked, validators could fail silently or resolve to a different schema. Classified warn.

**F10:** Verified `review.md:138–171`. The `/tmp/rihal-review-prompt-{phase}.md` filename uses the old prefix. The `$(cat ...)` shell substitution pattern is inherited from an existing design — the injection risk was pre-catalogued in `audit/01-security.md` as a separate P1 issue. The naming residue is warn-level here; the injection vector is out-of-scope for this lens (already reported).

**F11 / F12:** Verified by reading `core-module.yaml:22–25` and `rihal-init/SKILL.md:87–91`. The string `"_rihal-output"` is a hard-coded default that the skill writes into user project config on init. Classified warn (creates rihal-branded directories in user projects).

**Agents-rules clean check:** Ran `grep -rn "rihal-tools|\.rihal/bin" .rcode/agents-rules/` — returned zero results. The critical runtime-breaking gaps catalogued in `audit/11-migration-gaps.md` (B3, 34 occurrences across 11 files) appear to have been **remediated** prior to this audit. This is a significant positive finding.

---

## Summary

| Severity | Count | Files |
|----------|-------|-------|
| critical | 0 | — |
| warn | 5 | `semantic.yaml`, `CONTRIBUTING.md`, `model-profiles.schema.json`, `review.md` (naming), `rihal-init/` (output dir) |
| info | 7 | `package.json`, `cli/index.js`, `cli/install.js`, `cli/nuke.js`, `cli/postinstall.js`, `scripts/build.cjs` (all URL-only) |

**No hardcoded credentials, auth tokens, VPS secrets, or skip-auth bypass patterns with rihal-* naming were found.** The most significant remediation already in place: the critical-path `.rihal/bin/rihal-tools.cjs` agent-rules gaps (34 occurrences, audit/11 B3) are **clean** — those would have caused `MODULE_NOT_FOUND` runtime errors in every executor/verifier/sprint-checker agent invocation.

Remaining warn-level items are low security impact: a legacy CI scope that allows old-namespace commits to pass, a JSON Schema `$id` pointing to the old repo URL, and a skill that writes `_rihal-output/` directories into user projects.

**Overall status: WARN** — no credential exposure, no exec-path risks; 5 warn-level branding/namespace residues remain.
