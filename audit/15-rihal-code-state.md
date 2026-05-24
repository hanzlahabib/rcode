# Rihal Reference Audit — code-state

**Branch:** audit-rihal-code-state  
**Date:** 2026-05-24  
**Scope:** cli/, server/, .rcode/bin/, .rcode/_config/, .rcode/state.json, .rcode/config.yaml, .rcode/JOURNEY.md, .rcode/.continue-here.md, .rcode/agents-rules/, .claude/ (excl. agents/rules), .github/, scripts/

---

## Summary

| Tag | Count | Files |
|-----|-------|-------|
| INT-COMPANY | 7 | JOURNEY.md, CODEOWNERS, nuke.js (comment) |
| INT-REPO-URL | 6 | cli/index.js, cli/install.js, cli/postinstall.js, scripts/build.cjs |
| INT-LEGACY-PKG | 3 | cli/nuke.js |
| INT-COMMENT-HISTORY | 1 | cli/nuke.js (header comment block) |
| GAP-CONFIG-KEY | 1 | .rcode/config.yaml |
| GAP-STATE-DATA | 10 | .rcode/state.json |
| GAP-PATH-CODE | 193 | .rcode/_config/files-manifest.csv |
| GAP-AGENT-RULES | 12 | .rcode/agents-rules/ |
| GAP-GIT-TAG | 10 | git tag namespace rihal/snapshot/* |
| GAP-CODEOWNERS | 2 | .github/CODEOWNERS |

No findings in: server/, .rcode/bin/ (live), .claude/ (excl. agents/rules), .rcode/.continue-here.md.

---

## INT-COMPANY — Rihal as company/tool name

Intentional brand references. Not regressions.

| File | Line | Text |
|------|------|------|
| .rcode/JOURNEY.md | 1 | HTML comment: `<!-- RIHLA (رحلة) = "the journey". Not a typo of RIHAL (رحّال)… Rihal is the tool that walks it with you. -->` |
| .rcode/JOURNEY.md | 4 | `Written by: /rihal-init` |
| .rcode/JOURNEY.md | 18 | `Rihal Code (rcode) — an AI team methodology…` |
| .rcode/JOURNEY.md | 22 | `The full loop runs in three commands — /rihal-council → /rihal-plan → /rihal-execute.` |
| .rcode/JOURNEY.md | 24 | `Bank in one view. Core value prop: … Rihal fixes` |
| .github/CODEOWNERS | 1 | `# Rihal Code — Code Owners` |
| cli/nuke.js | 5 | Comment header: `Global npm/pnpm/yarn/bun installs (both @hanzlaa/rcode and legacy @hanzlahabib/rihal-code)` |

---

## INT-REPO-URL — github.com/hanzlahabib/rihal-code

Repository URL preserved in user-facing strings and build output banner.

| File | Line | Text |
|------|------|------|
| cli/index.js | 94 | `Documentation: https://github.com/hanzlahabib/rihal-code` |
| cli/install.js | 360 | Help panel: `docs     github.com/hanzlahabib/rihal-code` |
| cli/install.js | 684 | AGENTS.md stub comment: `See https://github.com/hanzlahabib/rihal-code/issues/670 -->` |
| cli/postinstall.js | 127 | `Docs: https://github.com/hanzlahabib/rihal-code` |
| scripts/build.cjs | 54 | Build banner: `/* rcode — built with esbuild. Source: github.com/hanzlahabib/rihal-code */` |

**Note:** The repo URL points to the old `rihal-code` GitHub repository. If the repo has been renamed or transferred, these strings need updating. Verify the canonical URL remains `github.com/hanzlahabib/rihal-code` before treating as a gap.

---

## INT-LEGACY-PKG — @hanzlahabib/rihal-code npm package

Backward-compatibility shim in nuke.js for users upgrading from the legacy package name.

| File | Line | Text |
|------|------|------|
| cli/nuke.js | 5 | JSDoc: `legacy @hanzlahabib/rihal-code` |
| cli/nuke.js | 88 | Comment: `Looks for both @hanzlaa/rcode (current) and @hanzlahabib/rihal-code (legacy).` |
| cli/nuke.js | 380 | Code: `pkg.name === '@hanzlaa/rcode' \|\| pkg.name === '@hanzlahabib/rihal-code'` |

Intentional; nuke must clean up both the old and new package names. Retain until the legacy package is officially sunset.

---

## INT-COMMENT-HISTORY — Rename documentation in comments

| File | Lines | Notes |
|------|-------|-------|
| cli/nuke.js | 5, 88 | Header JSDoc block documents the `rihal-code → rcode` rename for future maintainers. Intentional historical record. |

---

## GAP-CONFIG-KEY — rihal_ field name in config.yaml

| File | Line | Key |
|------|------|-----|
| .rcode/config.yaml | 8 | `rihal_source_path:` (value empty) |

**Risk:** Config key uses legacy namespace. Any code reading `config.rihal_source_path` will work today only because the value is empty. If this field is ever populated, consuming code searching for `rcode_source_path` or a generic key name won't find it. The key should be renamed to `rcode_source_path` in a coordinated config migration.

---

## GAP-STATE-DATA — rihal/ paths frozen in state.json goals

Ten sprint/phase goal strings in `.rcode/state.json` reference the old `.rihal/` directory structure or `rihal-` agent names. These are historical text records, not live paths, but they can mislead agents replaying or referencing state.

Selected entries (representative sample):

| Line | Context |
|------|---------|
| 77 | Goal text: `"Create three reference files in rihal/references/ by extracting…"` |
| 105 | Goal text: `"Slim rihal/agents/rihal-integration-checker.md from 456 lines…"` |
| 115 | Task title: `"Rewrite rihal-integration-checker.md as slim stub"` |
| 128 | Goal text: `"Slim rihal/agents/rihal-research-synthesizer.md from 254 lines…"` |
| 151 | Goal text: `"Slim rihal/agents/rihal-codebase-mapper.md from 244 lines…"` |
| 225 | Goal text: `"Add rcode agent <name> CLI command wrapping claude --agent rihal-<name>"` |
| 264 | Goal text: `"Close the infrastructure gaps found auditing rihal-code against…"` |
| 324 | Goal text: `"Close the vulnerabilities found in the rihal-code self security audit…"` |
| 345 | Sprint goal: `"bash-guard hardening — anchor RIHAL_PUSH_OK, +-refspec force-push…"` |
| 373 | Goal text: `"Turn rihal-code into an adoptable product…"` |

**Note line 345:** The RIHAL_PUSH_OK env-var name (mentioned in a sprint goal) has not been renamed to RCODE_PUSH_OK. See GAP-INTERNAL-VAR below.

**Note lines 1001, 1010:** Two `path` fields still reference `/home/hanzla/development/rihal-code/.planning/…` — an absolute filesystem path to the old repo location. If that path no longer exists on disk these state entries are stale.

---

## GAP-INTERNAL-VAR — RIHAL_PUSH_OK env variable

| Location | Evidence |
|----------|---------|
| .rcode/state.json:345 | Sprint goal describes implementing `RIHAL_PUSH_OK` as a push-guard anchor |

The env variable name `RIHAL_PUSH_OK` is referenced in a planned (or completed) sprint. A grep of cli/, server/, and scripts/ found **no live code** defining or checking this variable — it may exist only in the built binary (`.rcode/bin/rcode-hooks.cjs`, not in the audit scope). If the hooks binary uses `RIHAL_PUSH_OK`, that name should be audited against `RCODE_PUSH_OK` once the binary source is in scope.

---

## GAP-PATH-CODE — .rihal/ paths in files-manifest.csv

`.rcode/_config/files-manifest.csv` contains **193 rows** with `.rihal/` path prefixes:

```
.rihal/workflows/add-phase.md,...
.rihal/workflows/add-tests.md,...
...
.rihal/bin/rihal-hooks.cjs,...
.rihal/bin/rihal-tools.cjs,...
.rihal/bin/lib/config.cjs,...
```

This manifest tracks installed files. If the install target has moved from `.rihal/` to `.rcode/`, the manifest is pointing to ghost paths. The manifest drives integrity checks and update diffs — stale paths here mean update/uninstall operations targeting the wrong directory.

**Verify:** Does `cli/install.js` still write files to `.rihal/` on the user's machine, or has the install target been renamed to `.rcode/`? If renamed, this manifest needs regeneration.

---

## GAP-AGENT-RULES — rihal- command references in .rcode/agents-rules/

Twelve lines across four rule files use `/rihal-` slash-command names instead of `/rcode-`.

| File | Line | Text |
|------|------|------|
| phase-researcher/detailed-guide.md | 310 | `before /rihal-verify-work` |
| verifier/key-links.md | 5 | `Use rihal-tools for key link verification` |
| verifier/verification-report.md | 97 | `(rihal-verifier)` |
| verifier/verification-report.md | 122 | `for /rihal-plan --gaps` |
| verifier/artifact-verification.md | 22 | `Use rihal-tools for artifact verification` |
| verifier/gap-output.md | 31 | `for /rihal-plan --gaps` |
| sprint-checker/process.md | 26,46,91 | `Use rihal-tools` (×3) |
| sprint-checker/process.md | 165 | `suggest re-planning with /rihal-debug` |
| sprint-checker/process.md | 291 | `Run /rihal-execute {phase}` |
| sprint-checker/process.md | 329 | `rihal-verifier's job` |
| sprint-checker/dimensions.md | 192 | `/rihal-discuss-phase` |
| sprint-checker/dimensions.md | 247 | `Re-run /rihal-plan {N} --research` |
| roadmapper/detailed-guide.md | 127,288,525 | `/rihal-insert-phase`, `/rihal-ui-phase`, `/rihal-plan 1` |

Agents reading these rules will emit `/rihal-*` invocation hints to users who expect `/rcode-*`. Minor UX confusion; no runtime breakage.

---

## GAP-CLAUDE-SETTINGS — .claude/ settings

No rihal references found in `.claude/` (excluding agents/rules). Clean.

---

## GAP-GIT-TAG — rihal/snapshot/* tag namespace

Ten git tags use the `rihal/snapshot/` prefix:

```
rihal/snapshot/phase-22
rihal/snapshot/phase-24
rihal/snapshot/phase-25
rihal/snapshot/phase-26
rihal/snapshot/phase-28
rihal/snapshot/phase-29
rihal/snapshot/phase-30
rihal/snapshot/phase-31
rihal/snapshot/phase-32
rihal/snapshot/phase-33
```

These are historical rollback tags; renaming them is low priority but the namespace is inconsistent with the current `rcode` brand. Any tooling that creates new snapshot tags should use `rcode/snapshot/phase-N` going forward.

---

## GAP-CODEOWNERS — rihal-om/ team references

| File | Line | Text |
|------|------|------|
| .github/CODEOWNERS | 1 | `# Rihal Code — Code Owners` |
| .github/CODEOWNERS | 6–7 | `# When Rihal GitHub teams are created, replace @hanzlahabib with @rihal-om/<team> (e.g. @rihal-om/pm-team for rihal-hussain-pm).` |

The `@rihal-om/` GitHub org team references are forward-looking (commented-out placeholders). If the GitHub org is named `rcode-org` or similar instead of `rihal-om`, these placeholders will need updating before they're activated.

---

## Not Found (clean)

- `server/` — zero rihal hits
- `.rcode/bin/` (live directory) — not present; manifest points to `.rihal/bin/` (see GAP-PATH-CODE)
- `.claude/` (excl. agents/rules) — zero rihal hits
- `.rcode/.continue-here.md` — zero rihal hits; file contains only rcode-namespaced content
- `scripts/dogfood-check.sh`, `scripts/sync-bin.sh` — zero rihal hits

---

## Priority Summary

| Priority | Item | Action needed |
|----------|------|---------------|
| High | GAP-PATH-CODE: 193 manifest rows pointing to `.rihal/` | Verify live install target; regenerate manifest if install writes to `.rcode/` |
| High | GAP-CONFIG-KEY: `rihal_source_path` in config.yaml | Rename to `rcode_source_path` in coordinated migration |
| Medium | GAP-AGENT-RULES: `/rihal-*` in 4 agent rule files | Bulk-replace with `/rcode-*` in next rule-update pass |
| Medium | GAP-STATE-DATA: stale absolute paths in state.json | Verify `/home/hanzla/development/rihal-code/` path still valid; purge if stale |
| Low | GAP-INTERNAL-VAR: `RIHAL_PUSH_OK` in sprint goal | Audit built binary for live usage; rename if present |
| Low | GAP-GIT-TAG: `rihal/snapshot/*` tags | New snapshots should use `rcode/snapshot/*` namespace |
| Low | GAP-CODEOWNERS: `@rihal-om/` org placeholder | Update when GitHub org is created |
| Info | INT-REPO-URL: 5 occurrences of old repo URL | Verify canonical repo URL hasn't changed |
| Info | INT-LEGACY-PKG: nuke.js backward-compat | Retain until legacy npm package is sunset |
