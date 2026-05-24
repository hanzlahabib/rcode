# 10-Lens Audit Summary — Rihal Residue Hunt

**Generated:** 2026-05-24
**Base commit (pre-merge):** `71e149d`
**Final commit (post-merge):** `f002c99`
**Model:** Claude Sonnet 4.6 (all 12 agents)
**Orchestration:** herdr workspace `rihal-code` — 3 audit tabs + 1 helper tab — 12 panes — 12 isolated git worktrees
**Scope:** Find any leftover `rihal` residue (`.rihal/` paths, `rihal-tools` refs, `rihal:` namespace, `/rihal-*` commands without targets, stale brand strings) after the `rihal-code → rcode` v4 rebrand.

---

## Executive Summary

| Metric | Value |
|--------|-------|
| Lenses run | 10 |
| Helper agents (dedup + verify) | 2 |
| Deduplicated unique findings | **55** |
| Critical | **18** (C01–C18) |
| Warn | **25** (W01–W25) |
| Info / Intentional | **12** (I01–I12) |
| Lenses with PASS status | 0 |
| Lenses with FAIL status | 3 (L4, L13, L14) |
| Lenses with WARN status | 7 |
| Independent verification false-positive rate | **0%** (50 samples) |
| Previously-fixed items verified clean | 13 |

**Headline finding:** the `rcode/` source tree was rebranded cleanly, but the **`.rcode/` installed mirror was never refreshed**. 1,704 `/rihal-*` command references survive across 115 installed workflow files, 39 installed skill directories still carry `rihal-` prefix, and 182 Cursor IDE rule files reference `.rihal/` paths that no longer exist on disk.

---

## Methodology

### Orchestration

12 isolated `cld --model sonnet` agents launched in parallel inside `herdr`, one worktree per agent on its own branch:

| Pane | Label | Worktree | Branch |
|------|-------|----------|--------|
| `-2` | L1-sec | `lens-1-security` | `audit-lens-1-security` |
| `-3` | L4-ext | `lens-4-extensibility` | `audit-lens-4-extensibility` |
| `-4` | L7-state | `lens-7-state-machine` | `audit-lens-7-state-machine` |
| `-5` | L8-i18n | `lens-8-i18n` | `audit-lens-8-i18n` |
| `-6` | L9-docs | `lens-9-documentation` | `audit-lens-9-documentation` |
| `-7` | L10-xplat | `lens-10-cross-platform` | `audit-lens-10-cross-platform` |
| `-8` | L11-karp | `lens-11-karpathy` | `audit-lens-11-karpathy` |
| `-9` | L13-obs | `lens-13-observability` | `audit-lens-13-observability` |
| `-10` | L14-name | `lens-14-naming` | `audit-lens-14-naming` |
| `-11` | L15-cov | `lens-15-coverage` | `audit-lens-15-coverage` |
| `-12` | H-dedup | `helper-dedup` | `audit-helper-dedup` |
| `-13` | H-verify | `helper-verify` | `audit-helper-verify` |

All 12 branches merged into `main` with **zero conflicts** (each touched a unique file under `.planning/audits/`).

### Per-agent contract

Each lens agent received a self-contained prompt instructing it to:
1. Read `audit/12-final-rihal-inventory.md` for the existing INTENTIONAL/GAP classification baseline
2. Run its assigned lens scan focused **only on rihal residue**
3. Write findings to `.planning/audits/AUDIT-lens<N>-<name>.md` with severity (critical/warn/info), file:line, description, and verification notes
4. `git add -f` + commit on its own branch
5. **Never push, never edit source files**

After all 10 lens audits committed, two helpers were spawned in a fourth tab:
- **H-dedup** — read all 10 reports, merge duplicates, classify with the INT-* / GAP-* taxonomy from `audit/12`, produce TOP 20 priority list
- **H-verify** — sample 5 findings per lens, open the actual file at the cited line, classify each as CONFIRMED / STALE / FALSE-POSITIVE / UNVERIFIABLE

---

## Per-Lens Verification Log

Each row links to the full audit report under `.planning/audits/`.

### Lens 1 — Security
- **Status:** WARN (5 warn, 7 info; no credential leaks)
- **Scope:** hardcoded secrets, path traversal, shell-injection in installer/build scripts, skip-auth patterns in rihal-namespaced agents
- **Verified:** 5/5 sampled findings CONFIRMED
- **Key findings:** 8× `/tmp/rihal-review-*` temp files in `review.md:138–171` (pre-existing shell-interpolation concern P1 from `audit/01-security.md`); 7× GitHub repo URL pointing to old `rihal-code` slug (INT-REPO-URL — intentional, actual repo name); `_rihal-output` default folder in `rihal-init` skill (GAP-CONFIG)
- **Report:** [.planning/audits/AUDIT-lens1-security.md](../.planning/audits/AUDIT-lens1-security.md) (117 lines)

### Lens 4 — Extensibility
- **Status:** FAIL (multiple critical: 115 stale workflow files, 1,704 `/rihal-` hits, 39 stale skill dirs)
- **Scope:** hardcoded `rihal-` command lists in dispatch tables, hardcoded `.rihal/` paths, hardcoded skill IDs, hardcoded binary names
- **Verified:** 5/5 CONFIRMED
- **Key findings:** `do.md:96–221` (15-command primary router emits `/rihal-*` everywhere); `next.md:53,85,107–147` (auto-advance emits 10+ `/rihal-*` routes); `lens-audit.md:41–55` (lens dispatch maps to nonexistent `rihal-*` agent IDs); `verify-work.md:53`, `discuss-phase.md:155`, `research-phase.md:47` all call `agent-skills rihal-<role>` which silently fails because `resolveAgentId` strips only the `rcode-` prefix
- **Report:** [.planning/audits/AUDIT-lens4-extensibility.md](../.planning/audits/AUDIT-lens4-extensibility.md) (173 lines)

### Lens 7 — State Machine
- **Status:** WARN (2 warn; 10 items previously fixed and verified clean)
- **Scope:** `.rihal/` vs `.rcode/` state-path drift, schema drift, transition guards, migration helpers
- **Verified:** 5/5 CONFIRMED
- **Key findings:** `.rcode/state.json:77,105,128,151` retains frozen phase-2 sprint goal strings referencing `rihal/agents/` and `rihal/references/` dirs that no longer exist (an agent asked to replay these sprints fails at filesystem layer); `.rcode/state.json:1001,1010` milestone `path` fields contain absolute `/home/hanzla/development/rihal-code/.planning/…` (machine-specific; breaks on CI / collaborator machines)
- **Verified clean:** no `.rihal/` directory on disk; `files-manifest.csv` zero `.rihal/` rows; `agents-rules/` zero stale `.rihal/bin/rihal-tools.cjs` refs; `rihal_source_path` renamed; `server/dashboard.js` clean
- **Report:** [.planning/audits/AUDIT-lens7-state-machine.md](../.planning/audits/AUDIT-lens7-state-machine.md) (273 lines)

### Lens 8 — i18n / Brand Strings
- **Status:** WARN (1 critical, 6 warn, 1 info)
- **Scope:** AskUserQuestion prompts, banner/echo lines, help/usage strings, Arabic / RTL text
- **Verified:** 5/5 CONFIRMED
- **Key findings:** `dev-story.md:338,387,401,409` + `create-story.md:254` instruct users to run `/rihal-code` as a binary — **binary does not exist** (package.json ships only `rcode`); `${Rihal_WS}` variable name in 90 user-facing command suggestions across 8 workflows; `auto-init-guard.md:22,53,55,100` first onboarding strings still say "Rihal"
- **Verified clean (INT-COMPANY):** Arabic `رحّال` / `طريقة رحال` (etymology, explicitly preserved per CHANGELOG)
- **Report:** [.planning/audits/AUDIT-lens8-i18n.md](../.planning/audits/AUDIT-lens8-i18n.md) (201 lines)

### Lens 9 — Documentation
- **Status:** WARN (1 critical, 10 warn — 11 distinct dead workflow targets across 39 call-sites)
- **Scope:** README/CHANGELOG refs, `## Next Up` footers, dead `@.rihal/` refs, dead `/rihal-X` command pointers
- **Verified:** 5/5 CONFIRMED
- **Key findings:** `secure-phase.md:168` routes user to `/rihal-validate` (does not exist; correct is `/rihal-validate-phase`); 11 dead `/rihal-X` commands referenced 39× across workflows: `/rihal-sprint-plan` (9), `/rihal-create-milestone` (6), `/rihal-plan-phase` (5), `/rihal-manager` (2), `/rihal-workspace` (2), `/rihal-list-phase-assumptions` (1), `/rihal-decisions-export` (1)
- **Verified clean:** `README.md` + `CHANGELOG.md` zero `/rihal-` slash invocations; `examples/` zero rihal strings
- **Report:** [.planning/audits/AUDIT-lens9-documentation.md](../.planning/audits/AUDIT-lens9-documentation.md) (170 lines)

### Lens 10 — Cross-Platform
- **Status:** WARN (2 critical, 3 warn, 3 info)
- **Scope:** bash-isms, BSD/GNU sed divergence, hardcoded Unix paths, CRLF, Windows path joins
- **Verified:** 5/5 CONFIRMED
- **Key findings:** `.gitignore:46–73` rcode-managed block lists `.rihal/bin/`, `.rihal/workflows/`, `.rihal/skills/`, `.rihal/state.json.lock` — paths that no longer exist; `.rcode/` equivalents not gitignored; `.cursor/rules/rihal/` contains **182 git-tracked Cursor IDE rule files** all referencing `@.rihal/workflows/`, `@.rihal/references/`, `@.rihal/skills/` (none of which exist); `.cursor/rules/rcode/` is absent on disk
- **Verified clean:** no rihal refs in `scripts/*.sh` or `.claude/hooks/*.sh`
- **Report:** [.planning/audits/AUDIT-lens10-cross-platform.md](../.planning/audits/AUDIT-lens10-cross-platform.md) (125 lines)

### Lens 11 — Karpathy (Rebrand Quality on HEAD~25..HEAD)
- **Status:** FAIL (2 critical + several warns)
- **Scope:** half-migrated files, dead code from old structure, speculative abstractions added during rebrand, stubs/TODOs introduced during rebrand
- **Verified:** 5/5 CONFIRMED
- **Key findings:** `rcode/workflows/` source tree has 0 `/rihal-` references; the installed mirror `.rcode/workflows/` has **1,302**. All 116 shared workflow files differ between source and mirror — the rebrand commits never re-ran `rcode install` to refresh the deployed tree. `.rcode/workflows/plan.md:391` has `_rihal_field()`; source has `_rcode_field()`. `.rcode/JOURNEY.md:22` documents the user loop as `/rihal-council → /rihal-plan → /rihal-execute`.
- **Report:** [.planning/audits/AUDIT-lens11-karpathy.md](../.planning/audits/AUDIT-lens11-karpathy.md) (116 lines)

### Lens 13 — Observability
- **Status:** FAIL (5 critical silent-failure call sites)
- **Scope:** unguarded shell calls, bare `2>/dev/null` without fallback, `Task()` results never checked, missing graceful-degrade paths
- **Verified:** 5/5 CONFIRMED
- **Key findings:** **The single most important systemic bug.** `resolveAgentId` in `rcode-tools.cjs:621–650` only strips the `rcode-` prefix when resolving aliases. Five production call sites still pass `rihal-` agent names with `2>/dev/null` swallowing the error:
  - `verify-work.md:53` — `agent-skills rihal-checker 2>/dev/null` → `AGENT_SKILLS_CHECKER` becomes empty string
  - `discuss-phase.md:155` — `agent-skills rihal-advisor 2>/dev/null` → advisor spawned without model config
  - `research-phase.md:47` — `agent-skills rihal-researcher 2>/dev/null` → researcher spawned unconfigured
  - `rihal-code-review/step-02-review.md:23` — `Task(subagent_type="rihal-security-adversary")` → dispatch silently fails
  - `rihal-code-review/step-02-review.md:26` — same for `rihal-edge-case-hunter`

  Six additional `find .rcode/skills/actions -path "*rihal-X/workflow.md"` calls (in `create-architecture.md`, `validate-prd.md`, `create-prd.md`, `edit-prd.md`, `scaffold-project.md`, `retrospective.md`) silently return empty because both the dir and the skill name are wrong.
- **Verified clean:** no `rihal-tools.cjs` call sites remain; no `console.log` with `rihal` brand
- **Report:** [.planning/audits/AUDIT-lens13-observability.md](../.planning/audits/AUDIT-lens13-observability.md) (126 lines)

### Lens 14 — Naming Conventions
- **Status:** FAIL (PHASE_NUM regression: 88 occurrences across 12 files)
- **Scope:** `rihal:` colon vs `rihal-` hyphen, workflow titles, agent-dir vs SKILL `name:` drift, `PLAN.md` vs `SPRINT.md`, `PHASE_NUM` vs `PHASE_NUMBER`, snake/camelCase config keys
- **Verified:** 5/5 CONFIRMED
- **Key findings:**
  - **PHASE_NUM regression (C01):** CHANGELOG + commit `84ad704` declare `PHASE_NUM → PHASE_NUMBER` standardized, but **88 occurrences remain** across `autonomous.md` (33), `autonomous-smart-discuss.md` (3), `phase.md` (2), verifier rules (4), `execute-sprint.md` (2), `execute-milestone.md` (2), and others. The autonomous flow (highest-traffic execution path) passes **empty string** to every sub-skill as `${PHASE_NUMBER}`.
  - 9 agent SKILL.md files in `.rcode/skills/agents/` still declare `name: rihal-*` while their `rcode/` source counterparts use `rcode-*`: `ahmed-hassani-director`, `dalil-scout`, `haitham-frontend`, `layla-designer`, `nasser-eng-manager`, `noor-writer`, `yousef-backend`, `zahra-branding`, `zayd-ml`
  - 5 agents have truncated `name:` field vs dir: `fatima-qa` → `rcode-fatima`, `hanzla-engineer` → `rcode-hanzla`, etc.
  - 5 `PLAN.md` files in archived milestones (`M1-ship-v2/phases/01–05/PLAN.md`) not renamed to `*-SUPERSEDED.md` per convention
- **Report:** [.planning/audits/AUDIT-lens14-naming.md](../.planning/audits/AUDIT-lens14-naming.md) (274 lines)

### Lens 15 — Coverage / Parity
- **Status:** WARN (2 critical broken `@`-refs, 4 warn test blind spots)
- **Scope:** `/rihal-X` commands without matching workflow, `subagent_type` strings without matching agent dir, skills in `team.yaml` without dir
- **Verified:** 5/5 CONFIRMED
- **Key findings:**
  - `prfaq.md:7` and `checkpoint-preview.md:7` both have broken `@rcode/skills/actions/.../rihal-<name>/SKILL.md` references; the skills were renamed to `rcode-<name>` but the install-mirror workflow files still point to the old paths — workflows load **no skill content**
  - `test/agent-team-parity.test.cjs` only walks `rcode/workflows/`; `.rcode/skills/` is never scanned, so all `Task(subagent_type="rihal-*")` calls in skills pass CI silently
  - `test/at-ref-parity.test.cjs` scans `rcode/` only; broken `@`-refs in `.rcode/workflows/` (like `prfaq.md`, `checkpoint-preview.md`) pass with baseline 0 failures
- **Report:** [.planning/audits/AUDIT-lens15-coverage.md](../.planning/audits/AUDIT-lens15-coverage.md) (161 lines)

---

## Independent Verification (Helper-Verify)

Sampled 5 findings per lens (50 total) and opened each cited file at the cited line:

| Lens | Sampled | CONFIRMED | STALE | FALSE-POSITIVE | UNVERIFIABLE |
|------|---------|-----------|-------|----------------|--------------|
| 1, 4, 7, 8, 9, 10, 11, 13, 14, 15 | 50 | **50** | 0 | 0 | 0 |

**Zero false-positives. No lens requires rerun.**

Cross-lens corroboration further strengthens confidence — `step-02-review.md:23/26` was found independently by **L4, L11, L13, and L15**; `verify-work.md:53` by **L4 and L13**; the `.rcode/` vs `rcode/` tree divergence by **L4, L11, and L15**; `.cursor/rules/rihal/` 182 files by **L10 and L11**.

**Full report:** [.planning/audits/AUDIT-helper-verify.md](../.planning/audits/AUDIT-helper-verify.md) (205 lines)

---

## Root Cause Analysis

Three root causes explain the majority of the 18 critical findings:

### Root cause 1 — `.rcode/` install mirror never refreshed
Covers: **C06, C12, C13, C14, C16, C17, W09–W14, W17, W18**

The `rcode/` source tree was fully rebranded (zero `/rihal-` refs), but the `.rcode/` install artifacts in this repo were never regenerated by re-running `rcode install` against itself. The fix is mechanical: a single `rcode install .` run would refresh `.gitignore`, `.cursor/rules/`, workflows, skills, and the install-mirror copies of every artifact.

### Root cause 2 — `resolveAgentId` only strips the new prefix
Covers: **C07–C11**

`resolveAgentId` in `rcode/bin/rcode-tools.cjs:621–650` strips the `rcode-` prefix when resolving aliases but does not handle the `rihal-` prefix. Combined with `2>/dev/null` on every call site, this means `agent-skills rihal-<role>` calls in workflows silently produce an empty string and the dependent subagent spawns unconfigured. Fix: extend `AGENT_ID_ALIASES` (or the prefix-stripping logic) to also handle `rihal-` during the transition window, or rename the five offending call sites to `rcode-`.

### Root cause 3 — `PHASE_NUM` rename declared done but incomplete
Covers: **C01**

CHANGELOG + commit `84ad704` mark the `PHASE_NUM → PHASE_NUMBER` standardization complete. **88 occurrences remain** across 12 workflow files including the highest-traffic `autonomous.md` (33×). The variable substitutes to empty string in shell, which silently corrupts every sub-skill invocation in the autonomous loop.

---

## TOP 20 Priority Findings

| Rank | ID | Sev | Lens(es) | Area | Fix Priority |
|------|----|-----|----------|------|--------------|
| 1 | C01 | critical | L14 | `PHASE_NUM` × 88 in autonomous flow | **P1** |
| 2 | C06 | critical | L4 | `.rcode/workflows/*.md` (115 files, 1,704 `/rihal-` hits) | **P1** |
| 3 | C12 | critical | L4 | `.rcode/skills/` (39 dirs named `rihal-*`) | **P1** |
| 4 | C14 | critical | L10 | `.cursor/rules/rihal/` (182 files referencing dead paths) | **P1** |
| 5 | C09 | critical | L4, L13 | `verify-work.md:53` — `rihal-checker` silent fail | **P1** |
| 6 | C10 | critical | L4, L13 | `discuss-phase.md:155` — `rihal-advisor` silent fail | **P1** |
| 7 | C11 | critical | L4, L13 | `research-phase.md:47` — `rihal-researcher` silent fail | **P1** |
| 8 | C07 | critical | L4, L13, L15 | `step-02-review.md:23` — `rihal-security-adversary` Task fail | **P1** |
| 9 | C08 | critical | L4, L13, L15 | `step-02-review.md:26` — `rihal-edge-case-hunter` Task fail | **P1** |
| 10 | C13 | critical | L10 | `.gitignore:46–73` managed block points at dead paths | **P1** |
| 11 | C15 | critical | L8, L9 | `dev-story.md` `/rihal-code` binary that does not exist | **P1** |
| 12 | C16 | critical | L15 | `prfaq.md:7` broken `@`-ref | **P1** |
| 13 | C17 | critical | L15 | `checkpoint-preview.md:7` broken `@`-ref | **P1** |
| 14 | C18 | critical | L9 | `secure-phase.md:168` routes to `/rihal-validate` (does not exist) | **P1** |
| 15 | W01 | warn | L8 | `${Rihal_WS}` × 90 in 8 workflow files | **P2** |
| 16 | W02–W04 | warn | L8 | `auto-init-guard.md` first-run onboarding banners | **P2** |
| 17 | W09–W14 | warn | L13 | 6 `find .rcode/skills/actions` calls silently empty | **P2** |
| 18 | W19 | warn | L9 | 11 dead `/rihal-X` commands × 39 call-sites | **P2** |
| 19 | W21–W22 | warn | L15 | Test blind spots: parity tests don't scan `.rcode/` | **P2** |
| 20 | W15–W16 | warn | L14 | 14 SKILL.md `name:` field mismatches in `.rcode/skills/agents/` | **P2** |

**Full deduplicated table (55 findings):** [.planning/audits/AUDIT-helper-dedup.md](../.planning/audits/AUDIT-helper-dedup.md) (197 lines)

---

## Previously-Fixed Items (Verified Clean)

13 items previously identified in `audit/11-migration-gaps.md` and `audit/12-final-rihal-inventory.md` are now confirmed clean by one or more lenses:

| Item | Verified by |
|------|-------------|
| `.rihal/` directory on disk | L7 |
| `agents-rules/` — 34 `.rihal/bin/rihal-tools.cjs` refs | L1, L7 |
| `files-manifest.csv` — 193 stale `.rihal/` rows | L7 |
| `.rcode/config.yaml` `rihal_source_path` key | L7 |
| `rcode/bin/rcode-tools.cjs` binary | L1, L4, L13 |
| `cli/tiers.js:15` "First-time Rihalian." | L8 |
| `rcode/brain/README.md` "Rihalians" strings | L8 |
| `examples/RIHAL ►` banners | L9 |
| `RIHAL_TOKEN/SECRET/KEY/AUTH/VPS` credentials | L1 |
| `server/dashboard.js` `RCODE_DIR` path | L7 |
| Orphan `.planning/state.json` (regression #462) | L7 |
| `rcode/workflows/` source tree `/rihal-*` commands | L4 |
| `.rcode/workflows/docs-update.md` workflow title | L8 |

---

## Intentional Residue (Preserve As-Is)

12 categories of `rihal` references confirmed as intentional, **must not be touched** in any cleanup pass:

| Tag | Description | Examples |
|-----|-------------|----------|
| INT-COMPANY | Rihal / رحال as Omani company attribution | Agent personas; README etymology; `init.md:167` explicitly says "do NOT remove" |
| INT-REPO-URL | `github.com/hanzlahabib/rihal-code` — actual repo URL | `package.json` repository/bugs/homepage; CLI banners; postinstall |
| INT-LEGACY-SCOPE | `rihal-tools` as backward-compat commit scope | `CONTRIBUTING.md:342`; `.github/workflows/semantic.yaml:94` (documented) |
| INT-MIGRATION-DOC | `.rihal/` in migration instructions | `MIGRATIONS.md:17,30–31` — instructs v3→v4 users to `rm -rf .rihal/` |
| INT-SLASH | `/rihal-*` slash commands preserved for backward-compat user surface | All command files under `rcode/commands/` |

---

## Next Steps

Recommended sequence to clear all P1 findings:

```
1. Re-run install against this repo:
   node cli/install.js .
   # Refreshes .rcode/workflows/, .rcode/skills/, .gitignore managed block,
   # .cursor/rules/rcode/. Clears C06, C12, C13, C14, C16, C17, W09–W14, W17, W18.

2. Remove the stale .cursor/rules/rihal/ tree (182 files):
   git rm -r .cursor/rules/rihal/

3. Patch rcode-tools.cjs resolveAgentId to accept rihal- prefix during transition:
   # OR rename the 5 call sites to rcode-:
   #   .rcode/workflows/verify-work.md:53
   #   .rcode/workflows/discuss-phase.md:155
   #   .rcode/workflows/research-phase.md:47
   #   .rcode/skills/rihal-code-review/steps/step-02-review.md:23,26

4. Complete the PHASE_NUM → PHASE_NUMBER rename:
   grep -rnE '\bPHASE_NUM\b' .rcode rcode | grep -v PHASE_NUMBER
   # Then sed-rename across the 12 files.

5. Extend test/agent-team-parity.test.cjs + test/at-ref-parity.test.cjs to
   walk .rcode/ in addition to rcode/, so future regressions are caught.

6. Fix the 14 user-visible brand strings (W01–W04: ${Rihal_WS}, auto-init-guard
   banners, Rihal_SKIP_SCHEMA_CHECK).

7. Replace /rihal-validate routing in secure-phase.md:168 with /rihal-validate-phase.

8. Replace the /rihal-code binary references in dev-story.md / create-story.md
   with the actual rcode CLI command.
```

For each finding, the full raw report under `.planning/audits/AUDIT-lens<N>-<name>.md` includes line-precise locations and reproduction commands. File GH issues per cluster (one per root cause) rather than per finding to keep tracking manageable.

---

## Index of Artifacts

| Artifact | Lines | Path |
|----------|-------|------|
| Lens 1 — Security | 117 | `.planning/audits/AUDIT-lens1-security.md` |
| Lens 4 — Extensibility | 173 | `.planning/audits/AUDIT-lens4-extensibility.md` |
| Lens 7 — State Machine | 273 | `.planning/audits/AUDIT-lens7-state-machine.md` |
| Lens 8 — i18n | 201 | `.planning/audits/AUDIT-lens8-i18n.md` |
| Lens 9 — Documentation | 170 | `.planning/audits/AUDIT-lens9-documentation.md` |
| Lens 10 — Cross-Platform | 125 | `.planning/audits/AUDIT-lens10-cross-platform.md` |
| Lens 11 — Karpathy | 116 | `.planning/audits/AUDIT-lens11-karpathy.md` |
| Lens 13 — Observability | 126 | `.planning/audits/AUDIT-lens13-observability.md` |
| Lens 14 — Naming | 274 | `.planning/audits/AUDIT-lens14-naming.md` |
| Lens 15 — Coverage | 161 | `.planning/audits/AUDIT-lens15-coverage.md` |
| Helper — Dedup + TOP 20 | 197 | `.planning/audits/AUDIT-helper-dedup.md` |
| Helper — Verify (50 samples) | 205 | `.planning/audits/AUDIT-helper-verify.md` |
| **Total raw audit content** | **2,138** | |
| This summary | — | `audit/17-lens-audit-summary.md` |
