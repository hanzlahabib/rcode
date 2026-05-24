# Lens 11 — Karpathy: Rebrand Quality Audit

**Branch:** audit-lens-11-karpathy  
**Date:** 2026-05-24  
**Status:** FAIL  
**Scope:** Rebrand quality review of commits in `HEAD~25..HEAD` — half-migrations, dead code, speculative abstractions, stubs/TODOs introduced during the rihal-code → rcode rename wave.

---

## Scope Scanned

- `git log HEAD~25..HEAD` — 28 commits total; 14 rebrand-related (grep: rihal, rcode, rebrand, rename)
- `rcode/workflows/` — source workflow tree (1705 `/rcode-` refs, 0 `/rihal-`)
- `.rcode/workflows/` — installed workflow tree (1302 `/rihal-` refs, 325 `/rcode-`)
- `.rcode/skills/` — all SKILL.md frontmatter names
- `.rcode/agents-rules/` — agent rule files
- `cli/` — nuke.js, uninstall.js
- `rcode/commands/` — command frontmatter
- `.rcode/JOURNEY.md`, `.rcode/workflows/plan.md`, `.rcode/_config/files-manifest.csv`

---

## Commands Run

```bash
git log --oneline HEAD~25..HEAD
git diff <sha>^..<sha> --stat          # for each rebrand commit
grep -rn "^name: rihal-" .rcode/skills/
grep -roh "/rihal-" .rcode/workflows/ rcode/workflows/ | wc -l
grep -roh "/rcode-" .rcode/workflows/ rcode/workflows/ | wc -l
grep -rn "_rihal_field\|_rihal_" .rcode/workflows/
grep -rn "subagent_type.*rihal" .rcode/skills/ rcode/skills/
grep -rn "Rihal_WS" rcode/workflows/ .rcode/workflows/
diff -rq .rcode/workflows/ rcode/workflows/
grep -rn "rihal-security-adversary\|rihal-edge-case-hunter" .rcode/skills/
grep -rn "\.rihal/" .rcode/workflows/ .rcode/agents-rules/
grep -rn "rihal_" .rcode/workflows/
```

---

## Findings

### (a) Half-Migrated Files — commit touched X but left Y stale

| File | Line | Description | Severity |
|------|------|-------------|----------|
| `.rcode/workflows/` (all 116 files) | — | `rcode/workflows/` source tree is fully rebranded (0 `/rihal-` refs, 1705 `/rcode-`). `.rcode/workflows/` installed copy was NOT resynchronized — 1302 `/rihal-` refs remain vs 325 `/rcode-` refs. The rebrand fix commits (`bf0030e`, `177e540`, `619a006`, `9209a4f`) targeted one tree but left the deployed copy stale. | **critical** |
| `.rcode/workflows/plan.md` | 391–399 | Shell helper function `_rihal_field()` and 8 call sites using it. The `rcode/workflows/plan.md` (source) was correctly renamed to `_rcode_field()` at line 419, but `.rcode/workflows/plan.md` (installed) still has the old name. | **warn** |
| `.rcode/skills/agents/*.md` (11 files) | 2 | Commit `2a4ab40` claimed to "rename rihal- frontmatter names to rcode- in agent SKILL.md" but only fixed 6 of 55 total SKILL.md files with `name: rihal-` frontmatter. 49 skills in `.rcode/skills/` still have `name: rihal-` frontmatter, including 11 agent skills: `ahmed-hassani-director`, `dalil-scout`, `haitham-frontend`, `layla-designer`, `nasser-eng-manager`, `noor-writer`, `rihal-deviation-analyzer`, `yousef-backend`, `zahra-branding`, `zayd-ml`, and the agents/SKILL.md index. | **warn** |
| `.rcode/skills/rihal-code-review/steps/step-02-review.md` | 23, 26 | Calls `Task(subagent_type="rihal-security-adversary")` and `Task(subagent_type="rihal-edge-case-hunter")`. `team.yaml` defines these agents as `rcode-security-adversary` and `rcode-edge-case-hunter` (lines 374, 451). Wrong `subagent_type` will fail at runtime. This file was missed by the `ae4b96c` "straggler subagent_type" fix commit. | **critical** |
| `.rcode/workflows/update.md` | 32–41, 157, 192–193, 209 | Workflow H1 was renamed to `rcode-update` (commit `bf0030e`) but all `/rihal-update` command references in the body prose remain, including version pinning examples and usage instructions. The user-facing command is `/rcode-update` per `rcode/commands/update.md`. | **warn** |
| `.rcode/workflows/sprint-status.md` | 30–121 | H1 renamed but body still uses `/rihal-sprint-status`, `/rihal-sprint-planning`, `/rihal-execute` throughout all usage examples and output routing text. | **warn** |
| `.rcode/JOURNEY.md` | 4, 22 | Written by `/rihal-init` (line 4). Line 22 states "The full loop runs in three commands — `/rihal-council` → `/rihal-plan` → `/rihal-execute`." The actual installed commands are `/rcode-council`, `/rcode-plan`, `/rcode-execute`. This is an auto-generated snapshot file that was not regenerated post-rebrand. | **warn** |

---

### (b) Dead Code from Old rihal- Structure

| File | Line | Description | Severity |
|------|------|-------------|----------|
| `.rcode/skills/rihal-product-brief/rcode-manifest.json` | 3 | `"replaces-skill": "rihal-create-product-brief"` — references a skill that no longer exists by this name. No tooling reads this field post-rename. | **info** |
| `.rcode/skills/agents/rihal-deviation-analyzer/SKILL.md` | 2 | Skill directory is named `rihal-deviation-analyzer` (within agents/) with no rcode- equivalent. The dir name was intentionally preserved (per `feedback-rihal-hyphen-namespace`) but the frontmatter `name: rihal-deviation-analyzer` is inconsistent with the 6 fixed agent skills (which became `rcode-agent-*`). | **info** |
| `.cursor/rules/rihal/` | — | Entire Cursor rules directory is under `.cursor/rules/rihal/` with no `.cursor/rules/rcode/` equivalent. 46 agent `.mdc` files and a `commands/` dir live here. The `files-manifest.csv` still references `.cursor/rules/rihal/agents/rihal-omar.mdc` (line 270). No rebrand commit touched this directory. | **warn** |

---

### (c) Speculative Abstractions Added During Rebrand That Aren't Used

No new files were added by the rebrand commits (`bf0030e`, `619a006`, `177e540`, `8e95158`, `2a4ab40`, `3cb5512`, `1da40f6`, `9209a4f`, `7ae4088`, `b2e5586`, `8c9d5c8`, `2339dd2`, `2523642`, `71e149d`). All were pure rename/replace commits. No speculative new abstractions introduced.

---

### (d) Stubs / TODOs / 'not-implemented' Markers Introduced During Rebrand

| File | Line | Description | Severity |
|------|------|-------------|----------|
| `.rcode/workflows/update.md` | 223 | Text: `rcode brain: M sources pulled, K skipped (placeholder URLs)` — introduced by commit `177e540` rebrand pass. This is a placeholder output template that slipped through as literal "placeholder URLs" text in the user-facing banner output. | **warn** |

---

## Key Structural Issue: `.rcode/` vs `rcode/` Tree Divergence

The root cause of most half-migration findings is that the project maintains **two workflow trees**:

- `rcode/workflows/` — the source of truth (fully rebranded: 0 `/rihal-`, 1705 `/rcode-`)
- `.rcode/workflows/` — the installed/deployed copy (NOT resynchronized: 1302 `/rihal-`, 325 `/rcode-`)

Rebrand commits `bf0030e`, `177e540`, `619a006`, `9209a4f` updated the installed `.rcode/` tree via selective sed-based fixes, but the sheer volume of `/rihal-*` slash command references (1302 hits across 99 files) was not fully addressed. The `rcode/` source tree is clean; the `.rcode/` deployed copy is the problem.

`diff -rq .rcode/workflows/ rcode/workflows/` shows all 116 shared files differ.

---

## Verification Notes

- **`/rihal-` count:** Verified with `grep -roh "/rihal-" .rcode/workflows/ | wc -l` → 1302; `rcode/workflows/` → 0
- **frontmatter count:** `grep -rn "^name: rihal-" .rcode/skills/ | wc -l` → 49 (only 6 fixed by `2a4ab40`)
- **subagent_type bug:** Confirmed `rcode-security-adversary` exists in `rcode/team.yaml:451` and `rcode/agents/rcode-security-adversary.md`, while `step-02-review.md:23` calls `rihal-security-adversary`
- **_rihal_field:** `diff .rcode/workflows/plan.md rcode/workflows/plan.md` shows `.rcode/` has `_rihal_field`, `rcode/` has `_rcode_field`
- **cursor/rules:** `ls .cursor/rules/` → only `rihal/` dir; no `rcode/` dir
- **JOURNEY.md:** `grep -n "rihal-" .rcode/JOURNEY.md` → lines 4, 22, 60–62 show stale `/rihal-*` commands

---

## PASS/WARN/FAIL Summary

| Category | Status | Count |
|----------|--------|-------|
| Half-migrated files | FAIL | 7 distinct gaps |
| Dead code | WARN | 3 items |
| Speculative abstractions | PASS | 0 |
| Stubs / TODOs introduced | WARN | 1 |
| **Overall** | **FAIL** | — |

**Most critical:** The `.rcode/workflows/` deployed tree was not resynchronized with the `rcode/workflows/` source after the rebrand wave. 1302 `/rihal-*` slash command references remain in the deployed copy. The `rihal-code-review` skill calls agents by wrong `subagent_type` (`rihal-security-adversary` instead of `rcode-security-adversary`) — a runtime-breaking bug.
