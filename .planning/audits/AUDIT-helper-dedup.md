# AUDIT — Helper: Dedup + Consolidation

**Branch:** audit-helper-dedup
**Date:** 2026-05-24
**Role:** Dedup all 10 sibling lens audits; produce master findings table and TOP 20 GAP findings.
**Lenses available:** 1, 4, 7, 8, 9, 10, 13, 14, 15 (9 of 10; lens-11 audit file not written at time of run)

---

## Lens Status Overview

| Lens | Name | Status | Notes |
|------|------|--------|-------|
| 1 | Security | **WARN** | 5 warn, 7 info; no credential leaks |
| 4 | Extensibility | **FAIL** | 115 workflow files, 1,704 rihal- hits; 39 stale skill dirs |
| 7 | State Machine | **WARN** | 2 warn (frozen state.json data); 10 items verified fixed |
| 8 | i18n / Brand Strings | **WARN** | 1 critical (nonexistent binary), 6 warn, 1 info |
| 9 | Documentation | **WARN** | 1 critical, 10 warn; 11 dead workflow targets |
| 10 | Cross-Platform | **WARN** | 2 critical (gitignore + cursor rules), 3 warn, 3 info |
| 11 | Karpathy | **NOT WRITTEN** | Audit file absent at time of this run |
| 13 | Observability | **FAIL** | 5 critical (silent agent failures), 9 warn, 9 info |
| 14 | Naming | **FAIL** | PHASE_NUM regression (88 occurrences), 15 warn |
| 15 | Coverage | **WARN** | 2 critical (broken @-refs), 4 warn (test blind spots) |

**Lenses with PASS status:** None — every lens found at least warn-level gaps.
**Lenses with FAIL status:** 4, 13, 14 (3 of 9).

---

## Classification Legend

| Code | Meaning |
|------|---------|
| **GAP-AGENT-ID** | Stale `rihal-` agent ID in `subagent_type` or `agent-skills` call; causes silent runtime failure |
| **GAP-TOOL-NAME** | Stale/nonexistent tool or binary name referenced in user instructions |
| **GAP-WORKFLOW-CMD** | Dead or wrong `/rihal-X` command reference; no matching workflow or skill |
| **GAP-STATE-DATA** | Stale `rihal/` paths or absolute paths embedded in state/data files |
| **GAP-DOCSTRING** | User-visible strings printing old brand name (banners, AskUserQuestion, menus) |
| **GAP-PATH-INSTALL** | `.rcode/` install mirror not synced with rebranded `rcode/` source paths |
| **GAP-TEST** | Test suite blind spot that lets broken `.rcode/` paths pass CI silently |
| **GAP-VAR-NAME** | Shell variable name uses stale prefix (`PHASE_NUM`, `Rihal_WS`, `Rihal_SKIP_…`) |
| **GAP-CONFIG** | Config key or default value retains stale brand prefix |
| **INT-SLASH** | Intentional — `/rihal-*` slash command preserved for backward-compat |
| **INT-COMPANY** | Intentional — "Rihal" as Omani company attribution in agent personas / docs |
| **INT-REPO-URL** | Intentional — `github.com/hanzlahabib/rihal-code` URL (actual current repo name) |
| **INT-LEGACY-SCOPE** | Intentional — `rihal-tools` commit scope retained for backward-compat (documented) |
| **INT-MIGRATION-DOC** | Intentional — `.rihal/` reference in migration instructions |

---

## Master Findings Table (Deduplicated)

Rows are sorted: critical → warn → info. Rows seen by 2+ lenses carry all lens numbers; duplicates are merged.

### Critical

| ID | Lens(es) | Severity | File:Line | Description | Classification |
|----|----------|----------|-----------|-------------|----------------|
| C01 | L14 | critical | `.rcode/workflows/autonomous.md:multiple` + 11 other files (88 total occurrences) | `PHASE_NUM` used in 88 places across `autonomous.md` (33×), `autonomous-smart-discuss.md` (3×), `phase.md` (2×), verifier rules (4×), `execute-sprint.md` (2×), `execute-milestone.md` (2×); CHANGELOG calls this fixed (commit 84ad704) but the rename to `PHASE_NUMBER` was never completed — autonomous flow passes empty string to all sub-skills | GAP-VAR-NAME |
| C02 | L4 | critical | `.rcode/workflows/do.md:96–221` | Dispatch menu (15 commands), routing fallback table, and entity→command table all hardcode `/rihal-*` commands (`/rihal-plan`, `/rihal-execute`, `/rihal-council`, `/rihal-add-phase`, `/rihal-create-story`, etc.) — primary user-facing routing table | GAP-WORKFLOW-CMD |
| C03 | L4 | critical | `.rcode/workflows/next.md:53,85,107–147` | Auto-advance workflow emits 10+ hardcoded `/rihal-*` routes (`/rihal-new-project`, `/rihal-health`, `/rihal-sprint-planning`, etc.) | GAP-WORKFLOW-CMD |
| C04 | L4 | critical | `.rcode/workflows/lens-audit.md:41–55` | Lens-to-subagent dispatch maps 10 lenses to `rihal-*` agent IDs (`rihal-security-adversary`, `rihal-perf`, `rihal-edge-case-hunter`, `rihal-deviation-analyzer`, `rihal-dep-auditor`, `rihal-debugger`, `rihal-i18n-auditor`, `rihal-docs-auditor`, `rihal-cross-platform-auditor`, `rihal-observability-auditor`, `rihal-layla`, `rihal-fatima`) | GAP-AGENT-ID |
| C05 | L4 | critical | `.rcode/workflows/help.md:59–75` | Complete user-facing command reference table uses stale `/rihal-init`, `/rihal-new-project`, `/rihal-plan`, `/rihal-execute`, `/rihal-next`, `/rihal-status`, `/rihal-progress`, `/rihal-help` | GAP-WORKFLOW-CMD |
| C06 | L4 | critical | `.rcode/workflows/*.md` (115 files) | 1,704 total `/rihal-*` occurrences across all installed workflow files; source `rcode/workflows/` is clean — the `.rcode/` install mirror was never refreshed after rebrand | GAP-PATH-INSTALL |
| C07 | L4, L13, L15 | critical | `.rcode/skills/rihal-code-review/steps/step-02-review.md:23` | `Task(subagent_type="rihal-security-adversary", …)` — agent is registered as `rcode-security-adversary`; `rihal-` type does not exist in Claude Code agent registry; Task() dispatch silently fails | GAP-AGENT-ID |
| C08 | L4, L13, L15 | critical | `.rcode/skills/rihal-code-review/steps/step-02-review.md:26` | `Task(subagent_type="rihal-edge-case-hunter", …)` — same; correct name is `rcode-edge-case-hunter` | GAP-AGENT-ID |
| C09 | L4, L13 | critical | `.rcode/workflows/verify-work.md:53` | `agent-skills rihal-checker 2>/dev/null` — `rihal-checker` not a known alias; `resolveAgentId` strips `rcode-` not `rihal-`; exits 1 silently; `AGENT_SKILLS_CHECKER` becomes empty string; subagent spawned without any checker configuration | GAP-AGENT-ID |
| C10 | L4, L13 | critical | `.rcode/workflows/discuss-phase.md:155` | `agent-skills rihal-advisor 2>/dev/null` — same resolution failure; `AGENT_SKILLS_ADVISOR` becomes empty; advisor subagent spawned without model/skill config | GAP-AGENT-ID |
| C11 | L4, L13 | critical | `.rcode/workflows/research-phase.md:47` | `agent-skills rihal-researcher 2>/dev/null` — same; `AGENT_SKILLS_RESEARCHER` becomes empty; researcher subagent spawned unconfigured | GAP-AGENT-ID |
| C12 | L4 | critical | `.rcode/skills/` (39 dirs) | All 39 installed skill directories carry `rihal-` prefix; Skill tool dispatch by `rcode-` name cannot find them; blocks every `/rcode-create-prd`, `/rcode-plan`, etc. invocation | GAP-PATH-INSTALL |
| C13 | L10 | critical | `.gitignore:46–73` | `rcode-managed` gitignore block (lines 46–73) still lists `.rihal/bin/`, `.rihal/workflows/`, `.rihal/references/`, `.rihal/commands/`, `.rihal/skills/`, `.rihal/brain/rihal-github/`, `.rihal/state.json.lock`; `install.js` now generates `.rcode/` equivalents but this repo's managed block was never refreshed | GAP-PATH-INSTALL |
| C14 | L10 | critical | `.cursor/rules/rihal/` (182 files) | 182 git-tracked Cursor IDE rule files under old `.cursor/rules/rihal/` namespace; all reference `@.rihal/workflows/`, `@.rihal/references/`, `@.rihal/skills/` — paths that no longer exist; `install.js` now writes to `.cursor/rules/rcode/` but that directory is absent; `.cursor/rules/rihal/` was never purged | GAP-PATH-INSTALL |
| C15 | L8, L9 | critical | `.rcode/workflows/dev-story.md:338,387,401,409` | `/rihal-code` referenced as a runnable binary in user-facing "next step" instructions; `package.json` ships only `rcode` binary — this command does not exist; also appears in `.rcode/workflows/create-story.md:254` | GAP-TOOL-NAME |
| C16 | L15 | critical | `.rcode/workflows/prfaq.md:7` | `@rcode/skills/actions/1-analysis/rihal-prfaq/SKILL.md` — skill dir was renamed to `rcode-prfaq`; @-ref resolves to nothing; workflow loads no skill content; `rcode/workflows/prfaq.md:7` already uses correct `rcode-` prefix | GAP-PATH-INSTALL |
| C17 | L15 | critical | `.rcode/workflows/checkpoint-preview.md:7` | `@rcode/skills/actions/4-implementation/rihal-checkpoint-preview/SKILL.md` — skill renamed to `rcode-checkpoint-preview`; same broken @-ref pattern as C16 | GAP-PATH-INSTALL |
| C18 | L9 | critical | `.rcode/workflows/secure-phase.md:168` | Post-security-check routing banner directs user to `/rihal-validate`; correct command is `/rihal-validate-phase` (workflow exists); user following this banner gets command-not-found | GAP-WORKFLOW-CMD |

### Warning

| ID | Lens(es) | Severity | File:Line | Description | Classification |
|----|----------|----------|-----------|-------------|----------------|
| W01 | L8 | warn | 8 workflow files (~90 occurrences) | `${Rihal_WS}` used in user-facing command suggestions in `execute.md`, `resume-work.md`, `discuss-phase.md`, `validate-phase.md`, `plan-research-validation.md`, `plan.md`, `execute-verify-phase-goal.md`, `execute-regression-gates.md`; users must type `${Rihal_WS}` to run commands | GAP-VAR-NAME |
| W02 | L8 | warn | `.rcode/references/auto-init-guard.md:22` | User-facing onboarding banner: `"Rihal isn't configured for this project yet."` — first string a new user sees on init | GAP-DOCSTRING |
| W03 | L8 | warn | `.rcode/references/auto-init-guard.md:53,55` | AskUserQuestion config table: `"Your name (what Rihal calls you)"` and `"Mode (how Rihal handles decision gates)"` — shown to user during first-run setup | GAP-DOCSTRING |
| W04 | L8 | warn | `.rcode/references/auto-init-guard.md:100` | Success banner after first-run setup: `"✓ Rihal configured for this project."` | GAP-DOCSTRING |
| W05 | L8 | warn | `.rcode/workflows/execute-regression-gates.md:84,91,119` | Env var `Rihal_SKIP_SCHEMA_CHECK` appears in user-visible warning banner (line 91) and in numbered menu option user must type (line 119); should be `RCODE_SKIP_SCHEMA_CHECK` | GAP-VAR-NAME |
| W06 | L1, L10 | warn | `.rcode/skills/rihal-init/resources/core-module.yaml:24` | `default: "_rihal-output"` — default output folder for `rihal-init` skill; propagated into `SKILL.md:87–91`; every init creates `_rihal-output/` in user project instead of `_rcode-output/` | GAP-CONFIG |
| W07 | L7 | warn | `.rcode/state.json:77,105,115,128,151` | Frozen phase-2 sprint goal strings reference `rihal/agents/` and `rihal/references/` paths (e.g. `"Slim rihal/agents/rihal-integration-checker.md"`); these dirs no longer exist; an agent asked to replay a sprint from these goals will fail at the filesystem layer | GAP-STATE-DATA |
| W08 | L7 | warn | `.rcode/state.json:1001,1010` | Milestone `path` fields contain absolute paths `/home/hanzla/development/rihal-code/.planning/…`; valid only on this machine; dashboard `/api/hierarchy` will show broken links on CI or any collaborator machine | GAP-STATE-DATA |
| W09 | L13 | warn | `.rcode/workflows/create-architecture.md:12` | `find .rcode/skills/actions -path "*rihal-create-architecture/workflow.md"` — double mismatch: dir `.rcode/skills/actions/` does not exist AND skill renamed to `rcode-create-architecture`; find silently returns empty; user sees misleading "reinstall" error | GAP-PATH-INSTALL |
| W10 | L13 | warn | `.rcode/workflows/validate-prd.md:12` | Same pattern as W09 — `find .rcode/skills/actions -path "*rihal-validate-prd/workflow.md"` | GAP-PATH-INSTALL |
| W11 | L13 | warn | `.rcode/workflows/create-prd.md:12` | Same pattern — `rihal-create-prd` | GAP-PATH-INSTALL |
| W12 | L13 | warn | `.rcode/workflows/edit-prd.md:12` | Same pattern — `rihal-edit-prd` | GAP-PATH-INSTALL |
| W13 | L13 | warn | `.rcode/workflows/scaffold-project.md:12` | Same pattern — `rihal-scaffold-project` | GAP-PATH-INSTALL |
| W14 | L13 | warn | `.rcode/workflows/retrospective.md:12` | Same pattern — `rihal-retrospective` | GAP-PATH-INSTALL |
| W15 | L14 | warn | `.rcode/skills/agents/` (9 SKILL.md files) | Nine agent SKILL.md files in installed `.rcode/` tree still have `name: rihal-*` while `rcode/` source has updated `rcode-*` equivalents: `ahmed-hassani-director`, `dalil-scout`, `haitham-frontend`, `layla-designer`, `nasser-eng-manager`, `noor-writer`, `yousef-backend`, `zahra-branding`, `zayd-ml` | GAP-AGENT-ID |
| W16 | L14 | warn | `.rcode/skills/agents/` (5 SKILL.md files) | Five agent SKILL.md files have `rcode-` prefix but truncated suffix vs dir name: `fatima-qa`→`rcode-fatima`, `hanzla-engineer`→`rcode-hanzla`, `mariam-marketing`→`rcode-mariam`, `sadiq-analyst`→`rcode-sadiq`, `waleed-architect`→`rcode-waleed` | GAP-AGENT-ID |
| W17 | L4, L14, L15 | warn | `.rcode/skills/agents/rihal-deviation-analyzer/` (dir) | Install mirror dir retains `rihal-` prefix; source has `rcode/skills/agents/rcode-deviation-analyzer/`; no `rcode-deviation-analyzer` in `.rcode/skills/agents/` | GAP-PATH-INSTALL |
| W18 | L14 | warn | `.rcode/skills/agents/agents/SKILL.md:2` | Misplaced root-level SKILL.md in parent `agents/` dir (not inside a skill subdir); `name: rihal-agent-dalil-scout`; no counterpart in `rcode/` source — likely leaked from old scaffold | GAP-PATH-INSTALL |
| W19 | L9 | warn | Multiple workflows (39 call-sites, 11 distinct dead commands) | 11 `/rihal-X` command names with no matching workflow or skill: `/rihal-sprint-plan` (7 sites in `plan.md`, 2 in `plan-research-validation.md`), `/rihal-create-milestone` (6 sites), `/rihal-plan-phase` (5 sites), `/rihal-manager` (2 sites in `analyze-dependencies.md`), `/rihal-decisions-export` (`export-to-github.md:129`), `/rihal-workspace` (2 sites), `/rihal-list-phase-assumptions` (`help.md:272`) | GAP-WORKFLOW-CMD |
| W20 | L14 | warn | `.planning/milestones/M1-ship-v2/phases/` (5 files) | `01-tier-docs/PLAN.md`, `02-scaffold-skill/PLAN.md`, `03-v2-stabilization/PLAN.md`, `04-dashboard-refresh/PLAN.md`, `05-marketing-launch/PLAN.md` — old `PLAN.md` format; convention requires rename to `*-SUPERSEDED.md`; agents loading milestone context may confuse these with active sprint files | GAP-STATE-DATA |
| W21 | L15 | warn | `test/agent-team-parity.test.cjs` | `walkMd` scans `rcode/workflows/` only; `.rcode/skills/` never walked — all `subagent_type="rihal-*"` refs in skills pass silently (C07, C08 invisible to CI) | GAP-TEST |
| W22 | L15 | warn | `test/at-ref-parity.test.cjs` | `SCAN_DIR = rcode/` only; `.rcode/workflows/` @-refs never tested — C16 and C17 broken @-refs pass CI silently with baseline 0 failures | GAP-TEST |
| W23 | L1, L8, L13 | warn | `.rcode/workflows/review.md:138–171` | 8 temp file paths named `/tmp/rihal-review-prompt-{phase}.md`, `/tmp/rihal-review-gemini-{phase}.md`, etc. appear in shell output; stale brand prefix; `$(cat /tmp/rihal-review-prompt-{phase}.md)` also carries pre-existing shell-injection concern (P1 from `audit/01-security.md`) | GAP-TOOL-NAME |
| W24 | L1 | warn | `rcode/config/model-profiles.schema.json:3` | JSON Schema `$id` URI points to `https://github.com/hanzlahabib/rihal-code/blob/main/rcode/config/model-profiles.schema.json`; validators that dereference `$id` (ajv with `loadSchema`, VS Code JSON server) will attempt fetch from old URL | GAP-CONFIG |
| W25 | L1, L4, L10, L13 | warn | `.github/workflows/semantic.yaml:94` | `rihal-tools` listed as allowed commit scope alongside `rcode-tools`; documented as intentional backward-compat in `CONTRIBUTING.md:342` but actively encodes old namespace in CI enforcement indefinitely | INT-LEGACY-SCOPE |

### Info / Intentional

| ID | Lens(es) | Severity | File:Line | Description | Classification |
|----|----------|----------|-----------|-------------|----------------|
| I01 | L1, L4, L9, L13 | info | `CONTRIBUTING.md:342` + `AGENTS.md:27` + `CLAUDE.md:27` | `rihal-tools` documented and listed as valid backward-compat commit scope in contributor docs and AGENTS.md | INT-LEGACY-SCOPE |
| I02 | L1, L10, L13 | info | `package.json:54,57,59` | `repository.url`, `bugs.url`, `homepage` all point to `github.com/hanzlahabib/rihal-code`; reflects actual GitHub repo name | INT-REPO-URL |
| I03 | L1, L10, L13 | info | `cli/index.js:94` | `Documentation: https://github.com/hanzlahabib/rihal-code` in `rcode --help` footer | INT-REPO-URL |
| I04 | L1, L10, L13 | info | `cli/install.js:360,684` | Two GitHub URL occurrences in installer banner and AGENTS.md template | INT-REPO-URL |
| I05 | L1, L10, L13 | info | `cli/postinstall.js:127` | `Docs: https://github.com/hanzlahabib/rihal-code` in post-install footer | INT-REPO-URL |
| I06 | L1, L10, L13 | info | `scripts/build.cjs:54` | Bundle banner comment embeds `github.com/hanzlahabib/rihal-code`; no exec risk | INT-REPO-URL |
| I07 | L1, L10, L13 | info | `cli/nuke.js:5,88,380` | `@hanzlahabib/rihal-code` package name in uninstall logic — intentional; nuke.js must detect and remove the old package during upgrades | INT-REPO-URL |
| I08 | L8 | info | `README.md:3,163` + `rcode/config.yaml:4` + `.rcode/JOURNEY.md:1` + `.rcode/workflows/init.md:167` | Arabic `رحّال` / `طريقة رحال` strings — etymology of tool name (traveler); explicitly preserved per `CHANGELOG.md:19` and `init.md:167` ("do NOT remove") | INT-COMPANY |
| I09 | L8 | info | `.rcode/skills/agents/*/SKILL.md` (~12 files) | "This skill embodies X, Rihal's Y" — agent personas employed at Rihal the Omani company; design intention, not stale brand | INT-COMPANY |
| I10 | L7 | info | `MIGRATIONS.md:17,30–31` | Instructs v3→v4 upgraders to `rm -rf .rihal/` — correct migration documentation | INT-MIGRATION-DOC |
| I11 | L14 | info | `MIGRATIONS.md:21` + `.rcode/workflows/do.md:371` | Documents old `/rihal:foo` → `/rcode-foo` migration path; `do.md` explicitly warns agents not to emit colon form | INT-MIGRATION-DOC |
| I12 | L7 | info | `.gitignore:6–19` | Pre-v4 hand-written block with `.rihal/_config/`, `.rihal/bin/`, etc. — superseded by the managed block (C13) but non-executable; low urgency | GAP-PATH-INSTALL |

---

## Previously Fixed (Verified Clean by Multiple Lenses)

| Item | Fixed State | Verified by |
|------|------------|-------------|
| `.rihal/` directory on disk | Not present | L7 |
| `.rcode/agents-rules/` — 34 critical `.rihal/bin/rihal-tools.cjs` refs (audit/11 B3) | Zero hits | L1, L7 |
| `files-manifest.csv` — 193 stale `.rihal/` rows | Zero `.rihal/` rows | L7 |
| `.rcode/config.yaml` `rihal_source_path` key | Renamed `rcode_source_path` | L7 |
| `rcode/bin/rcode-tools.cjs` binary naming | Clean; zero rihal refs | L1, L4, L13 |
| `.rcode/workflows/docs-update.md` title | Renamed to `rcode-docs-update` | L8 |
| `cli/tiers.js:15` "First-time Rihalian." | Fixed to "First-time rcode user." | L8 |
| `rcode/brain/README.md` "Rihalians" strings | Fixed | L8 |
| `examples/` — `RIHAL ►` banners | Removed | L9 |
| `RIHAL_TOKEN/SECRET/KEY/AUTH/VPS` credentials | None found | L1 |
| `server/dashboard.js` `RCODE_DIR` path | Clean | L7 |
| Orphan `.planning/state.json` (regression #462) | Not present | L7 |
| `rcode/workflows/` source tree `/rihal-*` commands | Zero hits | L4 |

---

## TOP 20 GAP FINDINGS (Severity × Frequency)

Sorted: critical first (by lenses confirming), then warn (by scope / user impact).

| Rank | ID | Sev | Lens Count | File / Area | Impact | Fix Priority |
|------|----|-----|-----------|-------------|--------|--------------|
| 1 | C01 | critical | L14 | `autonomous.md` + 11 files — PHASE_NUM 88× | Autonomous workflow passes empty phase to all sub-skills; phase discussion, plan, execution, verification all broken | **P1** |
| 2 | C06 | critical | L4 | `.rcode/workflows/*.md` (115 files, 1,704 hits) | Every installed workflow emits stale `/rihal-*` commands; users running any installed workflow get wrong command names | **P1** |
| 3 | C12 | critical | L4 | `.rcode/skills/` (39 dirs named `rihal-*`) | Skill tool dispatch by `rcode-` name fails for all 39 skills; blocks entire skill layer | **P1** |
| 4 | C14 | critical | L10 | `.cursor/rules/rihal/` (182 files) | All Cursor IDE rules reference `@.rihal/` dead paths; Cursor users on any OS get silently broken rule loading | **P1** |
| 5 | C09 | critical | L4, L13 | `verify-work.md:53` — rihal-checker | `AGENT_SKILLS_CHECKER` silently empty; verify-work spawns unconfigured subagent | **P1** |
| 6 | C10 | critical | L4, L13 | `discuss-phase.md:155` — rihal-advisor | `AGENT_SKILLS_ADVISOR` silently empty; advisor subagent spawned without model config | **P1** |
| 7 | C11 | critical | L4, L13 | `research-phase.md:47` — rihal-researcher | `AGENT_SKILLS_RESEARCHER` silently empty; researcher spawned unconfigured | **P1** |
| 8 | C07 | critical | L4, L13, L15 | `step-02-review.md:23` — rihal-security-adversary | `Task()` dispatch silently fails; code review never runs security adversary | **P1** |
| 9 | C08 | critical | L4, L13, L15 | `step-02-review.md:26` — rihal-edge-case-hunter | `Task()` dispatch silently fails; code review never runs edge-case hunter | **P1** |
| 10 | C13 | critical | L10 | `.gitignore:46–73` managed block | `.gitignore` managed block ignores nonexistent `.rihal/` paths; `.rcode/` equivalents are not gitignored | **P1** |
| 11 | C15 | critical | L8, L9 | `dev-story.md:338,387,401,409` + `create-story.md:254` | `/rihal-code` binary does not exist; users following "Running This Story" get `command not found` | **P1** |
| 12 | C16 | critical | L15 | `prfaq.md:7` | `@rcode/skills/actions/…/rihal-prfaq/SKILL.md` broken; workflow loads no skill content | **P1** |
| 13 | C17 | critical | L15 | `checkpoint-preview.md:7` | `@rcode/skills/actions/…/rihal-checkpoint-preview/SKILL.md` broken; same silent no-op | **P1** |
| 14 | C18 | critical | L9 | `secure-phase.md:168` | Routes user to `/rihal-validate` (nonexistent); correct is `/rihal-validate-phase` | **P1** |
| 15 | W01 | warn | L8 | 8 workflow files, 90 occurrences `${Rihal_WS}` | Every workflow step that emits a next-command shows `${Rihal_WS}` — stale brand in user-copied commands | **P2** |
| 16 | W02–W04 | warn | L8 | `auto-init-guard.md:22,53,55,100` | First strings new user sees on `rihal-init` all print "Rihal" — onboarding experience shows wrong brand | **P2** |
| 17 | W09–W14 | warn | L13 | 6 workflow `find .rcode/skills/actions` calls | All 6 silently fail with empty result; user shown misleading "run reinstall" error even though skill exists in `rcode/` | **P2** |
| 18 | W19 | warn | L9 | 11 dead commands, 39 call-sites | 11 distinct `/rihal-X` commands with no target; users following workflow routing hit dead-ends | **P2** |
| 19 | W21–W22 | warn | L15 | `test/agent-team-parity.test.cjs` + `test/at-ref-parity.test.cjs` | Test blind spots: CI passes on broken `.rcode/` @-refs and stale `subagent_type` in skills; regressions like C07–C11, C16–C17 invisible | **P2** |
| 20 | W15–W16 | warn | L14 | `.rcode/skills/agents/` (14 SKILL.md `name:` mismatches) | IDE skill discovery and `/`-autocomplete surfaces `rihal-*` names; invoking `rcode-` name may silently load wrong skill | **P2** |

---

## Deduplication Summary

| Category | Unique Findings | Notes |
|----------|----------------|-------|
| critical GAPs | 18 | C01–C18 |
| warn GAPs | 25 | W01–W25 |
| info / intentional | 12 | I01–I12 |
| **Total deduplicated** | **55** | Merged from 9 lens reports |
| Multi-lens duplicates merged | 14 rows | C07/C08/C09/C10/C11/C12/C14/C16/C17 picked up by 2–3 lenses each |
| Previously fixed (verified clean) | 13 items | See "Previously Fixed" table above |

---

## Root Cause Summary

Three root causes account for the majority of findings:

1. **`.rcode/` install mirror not refreshed** (C06, C12, C13, C14, C16, C17, W09–W14, W17, W18) — The `rcode/` source tree was fully rebranded, but the `.rcode/` installed artifacts were never regenerated by running `rcode install`. Re-running install would fix gitignore, cursor rules, and workflow files in one step.

2. **Agent ID resolver gap in `rcode-tools.cjs`** (C07–C11) — `resolveAgentId` strips `rcode-` prefix to find aliases but does not strip `rihal-`; all `agent-skills rihal-*` and `Task(subagent_type="rihal-*")` calls silently fail. Fix: extend `AGENT_ID_ALIASES` to accept `rihal-` prefix during transition, or rename the call sites.

3. **`PHASE_NUM` rename declared done but incomplete** (C01) — CHANGELOG entry and commit `84ad704` declare `PHASE_NUM → PHASE_NUMBER` standardized; 88 occurrences remain in `autonomous.md` and related files. The fix was applied to some files but not the autonomous workflow (the highest-traffic path).
