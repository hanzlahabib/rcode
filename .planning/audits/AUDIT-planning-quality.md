# Audit: Planning Quality — rcode's Own Planning Artifacts & Workflow

**Scope:** `.rcode/` (state.json, memory/, brain/, HANDOFF.json), `.planning/` (milestones, phases, ROADMAP/STATE/MILESTONES), `rcode/workflows/*.md`, `rcode/commands/*.md`, and their cross-references into `.rcode/workflows/`, `.rcode/references/`, `.rcode/skills/`.

**Method:** Read-only. Every finding below was verified against the actual file on disk (existence checks via `test -f`/`find`, content diffs, or direct `Read`) — nothing here is inferred from naming conventions alone. No fixes applied.

**Date:** 2026-09-02

---

## P0 — Contradicts actual state, would actively mislead an agent or break execution

### P0-1. No milestone directory exists for the current active milestone (M3)
- **Files:** `.planning/milestones/` (only contains `M1-ship-v2/` and `M2-hardening-polish/`); vs. `.rcode/state.json` (`"milestone": "M3 — Archon Dashboard Port (v5)"`), `.planning/STATE.md`, `.planning/PROJECT.md` (`## Current Milestone: M3 — Archon Dashboard Port (v5)`), `.planning/REQUIREMENTS.md` (`# Requirements — M3 Archon Dashboard Port (v5)`), and `.planning/ROADMAP.md` (line 362, `# M3 — Archon Dashboard Port (v5)`).
- **Issue:** Every other milestone (M1, M2) has its own `.planning/milestones/<id>/MILESTONE.md` scaffold. M3 is the active milestone — phases 34–47 (14 phases, several already complete, including phase 47 dated 2026-08-09) were executed under it — but no `M3-*/MILESTONE.md` was ever created. The milestone-scaffolding convention this project uses on itself was silently abandoned for its own current work.
- **Fix suggestion:** Run whatever `/rcode-new-milestone`-equivalent scaffolds `MILESTONE.md`, backfill `M3-archon-dashboard-port/MILESTONE.md` from the M3 section already drafted in `ROADMAP.md`.

### P0-2. `.planning/ROADMAP.md` and `.rcode/state.json` mark completed phases as "Planned"
- **File:** `.planning/ROADMAP.md` — Phase 34 (line 378, `**Status:** Planned`), Phase 35 (line 400, `Planned`), Phase 36 (line 424, `Planned`), Phase 37 (line 446, `Planned`), Phase 42 (line 269, `Planned`), Phase 43 (line 282, `Planned`).
- **Contradiction:** All six phases have `SUMMARY.md` files on disk (34: 3 summaries + `34-REVIEW.md`/`34-REVIEW-FIX.md`; 35: 2 summaries + `35-REVIEW.md`; 36: 2 summaries; 37: 2 summaries; 42: 3 summaries + `42-REVIEW.md`; 43: 1 summary) — i.e. they were executed. Worse, `.rcode/state.json`'s own machine-readable `phases[]` array agrees the markdown is wrong for 42 and 43 (`status: "complete"`) but is itself also wrong for 34, 35, 36, 37 (`status: "planned"` in the JSON, not just the `.md` rendering).
- **Fix suggestion:** Regenerate `.rcode/state.json` phase statuses from disk reality (SUMMARY.md presence), then regenerate `ROADMAP.md` from `state.json` rather than hand-editing one and not the other.

### P0-3. Dogfood `.rcode/workflows/` is missing 5 files that `rcode/commands/*.md` (and this repo's own installed commands) `@`-include
- **Files/refs:** `rcode/commands/execute-milestone.md` → `@.rcode/workflows/execute-milestone.md`; `rcode/commands/lazy.md` → `@.rcode/workflows/lazy.md`; `rcode/commands/plan-milestone.md` → `@.rcode/workflows/plan-milestone.md`; `rcode/commands/scaffold-milestone.md` → `@.rcode/workflows/scaffold-milestone.md`; `rcode/workflows/audit.md:173` → `` `@.rcode/workflows/audit-worktrees.md` ``.
- **Verified:** All 5 target files exist in the source tree `rcode/workflows/` but are absent from `.rcode/workflows/` (the copy this repo's own installed slash commands actually resolve `@`-includes against, confirmed via `~/.claude/commands/rcode-plan.md` which itself includes `@.rcode/workflows/plan.md` — i.e. `@` paths resolve against the current project's `.rcode/`, not the command file's own tree). Running `/rcode-plan-milestone`, `/rcode-scaffold-milestone`, `/rcode-execute-milestone`, `/rcode-lazy`, or the worktree-audit branch of `/rcode-audit` inside this repo would silently fail to load their execution body. `.rcode/_config/files-manifest.csv` lists all 5 as expected (with checksums) at those exact `.rcode/workflows/` paths — confirming this is a failed/incomplete sync, not an intentional omission.
- **Fix suggestion:** Sync `rcode/workflows/{execute-milestone,lazy,plan-milestone,scaffold-milestone,audit-worktrees}.md` into `.rcode/workflows/` (re-run whatever install/sync step keeps these mirrored per `files-manifest.csv`).

### P0-4. Dogfood `.rcode/references/` is missing 8 files conditionally `@`-included by `.rcode/workflows/execute.md`, `plan.md`, and `lens-audit.md`
- **Refs:** `.rcode/workflows/execute.md` → `execute-auto-copy-learnings.md`, `execute-close-parent-artifacts.md`, `execute-interactive-mode.md`, `execute-notify-webhooks.md`; `.rcode/workflows/plan.md` → `plan-gaps-mode.md`, `plan-thinking-partner.md`, `plan-windows-troubleshooting.md`; also `.rcode/references/github-comment-style.md` is missing (present in `rcode/references/`, not referenced-checked further here).
- **Verified:** All 7 (+1) exist in `rcode/references/` but not `.rcode/references/` — same drift pattern as P0-3. These are conditional includes (`${FLAG === 'true' ? '@.rcode/references/X.md' : ''}`), so they only break when the corresponding flag/mode is active (interactive mode, gaps mode, thinking-partner mode, Windows, webhook-configured, gap-closure phase, auto-copy-learnings) — meaning the gap is latent and will surface unpredictably mid-execution.
- **Fix suggestion:** Same as P0-3 — sync the 8 missing files from `rcode/references/` into `.rcode/references/`.

### P0-5. `lens-audit.md` references a skill path that doesn't exist in the dogfood tree
- **File:** `rcode/workflows/lens-audit.md:627` — `` rcode-lazy ladder as the rubric (@.rcode/skills/core/rcode-lazy/SKILL.md). ``
- **Verified:** `.rcode/skills/` contains only 2 skill directories (`rcode-create-epics-and-stories`, `rcode-create-prd`) out of 67 in `rcode/skills/`. `rcode-lazy` (which does exist at `rcode/skills/core/rcode-lazy/SKILL.md` in the source tree) is not among them, so this `@`-include resolves to nothing when `/rcode-lens-audit` runs in this repo.
- **Fix suggestion:** Either sync the specific skill file into `.rcode/skills/core/rcode-lazy/`, or change the reference to point at the source tree path if `.rcode/skills/` is intentionally a partial mirror.

---

## P1 — Stale but lower blast-radius, or a documented process gap left unresolved

### P1-1. 11 phases in the active milestones (M2/M3) shipped without a goal-backward `VERIFICATION.md`
Phases with `SUMMARY.md` on disk but **no** `VERIFICATION.md`: **20** (dashboard-ux-quick-wins), **27** (realtime-kanban-orchestration-dashboard), **28** (audit-gap-closure), **29** (security-hardening), **30** (marketability), **34** (status-summary-bar), **35** (session-history-panel), **36** (command-palette), **37** (phase-dependency-graph), **42** (ambient-adoption-hooks), **43** (ship-rcode-data). Compare to phases 38, 44, 45, 46, 47 which *do* have `VERIFICATION.md` — so the goal-backward check is applied inconsistently, not universally skipped.
- **Fix suggestion:** Run `/rcode-verify-phase` retroactively for these 11, or explicitly record in `MILESTONES.md`/`ROADMAP.md` (as M1 already does for its own gaps) that verification was skipped and why.

### P1-2. Memory distillate is 2.5+ months stale and describes the wrong milestone
- **File:** `.rcode/memory/distillates/project.distillate.md` (`generated-at: 2026-05-22T21:10:24Z`) — its "Current milestone" section says `(v4.0.0 rebrand + OSS release prep)`, "Started 2026-05-20, rolling close 2026-06-15... Remaining: close #861... regenerate Memory Bank distillates (this commit)".
- **Contradiction:** Its own source file `.rcode/memory/milestones/current.md` (undated header, clearly newer content) says the v4.0.0 rebrand milestone is "archived history — package is at v4.9.0" and the actual current milestone is M3 — Archon Dashboard Port, active phase = "Fix execute.md core bugs..." (phase 47). The distillate's `source-digest` field exists precisely to detect this kind of drift and was never acted on.
- **Fix suggestion:** Run `/rcode-memory-distill` to regenerate.

### P1-3. `.rcode/HANDOFF.json` and `.rcode/.continue-here.md` are a stale pre-compact snapshot, 14 phases and a full milestone behind
- **Files:** `.rcode/HANDOFF.json` (`"generated_at": "2026-05-22T08:20:52.816Z"`, `"phase": "Dashboard command runner"`, `"milestone": "M2 — Hardening & Polish"`), `.rcode/.continue-here.md` (same snapshot, same timestamp).
- **Issue:** Actual current phase is 47 (complete 2026-08-09), milestone M3. These resume-context files are meant to be regenerated on every compaction event but haven't been touched since May 22 — an agent that trusts them without cross-checking `.rcode/state.json` would believe the project is 14 phases behind reality.
- **Fix suggestion:** Regenerate on next compaction, or have `/rcode-resume-work` warn when `HANDOFF.json`'s `generated_at` is older than `state.json`'s `updated`.

### P1-4. `ROADMAP.md`'s top-level milestone list omits M3 entirely
- **File:** `.planning/ROADMAP.md`, top `## Milestones` bullet list (lines 3–4) lists only `✓ M1 — Ship v2 + Tier Docs` and `🚧 M2 — Hardening & Polish (v4) — Phases 20–33 (in progress)` — no M3 bullet, and M2's own bullet still says "Phases 20–33" though the file's own body goes through phase 47.
- **Contradiction:** A full `# M3 — Archon Dashboard Port (v5)` section exists 360 lines further down in the same file. The document disagrees with itself about how many milestones exist.
- **Fix suggestion:** Add the M3 bullet to the top list; update the M2 bullet's phase range or close M2 out explicitly at phase 33/31 per its own MILESTONE.md.

### P1-5. Duplicate phase entry: "Phase 41" is a near-verbatim copy of "Phase 39," and Phase 41 has no directory
- **File:** `.planning/ROADMAP.md` — Phase 41 (line 252, `## Phase 41 — SEO Module: bundle top-notch SEO skills as a native rcode module`, Status: Planned) duplicates Phase 39 (line 497, `## Phase 39 — SEO Module: bundle top-notch SEO skills as a native rcode module`, Status: Planned) almost word for word.
- **Verified:** `.planning/phases/39-seo-module/` exists (3 draft `SPRINT.md` files, no `SUMMARY.md`). No `.planning/phases/41-*` directory exists anywhere on disk.
- **Fix suggestion:** Delete the orphaned Phase 41 entry from `ROADMAP.md` (or renumber/merge if 41 was meant to supersede 39).

### P1-6. `.planning/milestones/M2-hardening-polish/MILESTONE.md`'s phase table stops at phase 31 and hasn't been updated in 16 phases
- **File:** `.planning/milestones/M2-hardening-polish/MILESTONE.md` — phase table (lines 17–29) ends at `| 31 | Preact migration — Majlis dashboard client | planning | — |`. No rows for phases 32–47, several of which (32, 33, 38, 44, 45, 46, 47) are complete per disk/`state.json`.
- **Fix suggestion:** Extend the table through 47, or note in the file that phases 32+ are tracked only in `ROADMAP.md`/`state.json` going forward.

---

## P2 — Cosmetic / minor / self-documented already

### P2-1. Phase 21 and Phase 39 are dormant drafts with no owner/staleness flag
- Phase 21 (`Dashboard Data Pipeline`) has a `SPRINT.md` (1) and `CONTEXT.md` since 2026-05, zero `SUMMARY.md` — never executed. Phase 39 (`SEO Module`) has 3 draft `SPRINT.md` files, zero `SUMMARY.md`. Both correctly show "Planned"/"not started" in `state.json` and `ROADMAP.md` (not a contradiction), but neither file flags that the plan has sat untouched for months.
- **Fix suggestion:** Not urgent — cosmetic. Consider a `stale-plan` marker in `ROADMAP.md` for phases planned >60 days with no sprint activity.

### P2-2. M1's own "Known Gaps" self-audit is itself incomplete
- **File:** `.planning/MILESTONES.md` "Known Gaps" section documents phases 05, 07, 13, 18, 19 as missing `SUMMARY.md`. Verified accurate for those five, but M1 also has phases 04, 6, 8, 9, 10, 11, 12, 14, 15, 17 with `SUMMARY.md` present but **no** `VERIFICATION.md` — not mentioned anywhere. Low severity since M1 is closed/shipped history (2026-05-16), not actionable, but the self-audit undersells the actual gap count.
- **Fix suggestion:** None required — informational; M1 is archived. Worth a one-line addendum if `MILESTONES.md` is ever revisited.

### P2-3. `rcode/skills/actions/**/SKILL.md` — 17 skills self-annotated as unreachable via `delegate_to_skill`, confirmed still true, but this is a *known, deliberately deferred* gap, not a fresh finding
- Verified via `AUDIT-redundant-work.md` finding 3 (2026-07-29) and phase 45's remediation (`45-4-SUMMARY.md`: "documentation/notice-only... No files deleted, no new execution wiring built"). The `<!-- Bridge status -->` comments are accurate and the gap is intentionally left open, not silently rotting. Not re-flagged as new; listed here only for completeness since it touches the same skill/workflow bridge the P0 findings above are about.

### P2-4. `rcode/workflows/audit-plans.md` has no matching top-level command file
- Unlike sibling audit subroutes `audit-milestone`, `audit-uat`, `audit-fix` (each gets a dedicated `rcode/commands/*.md`), `audit-plans` has none — reachable only via `/rcode-audit plans` dispatch, not directly. Inconsistent pattern, not broken.
- **Fix suggestion:** Add `rcode/commands/audit-plans.md` for consistency, or document why this one subroute is the exception.

### P2-5. `.rcode/references/REFERENCES_INDEX.md` is stale/incomplete
- Claims to be "the human-maintained catalogue of which reference files are loaded by which agents and workflows," but roughly 40 of the ~95 files actually in `.rcode/references/` are never mentioned — including `agent-contracts.md`, `commit-conventions.md`, `common-bug-patterns.md`/`-index.md`, `git-integration.md`, `git-preflight.md`, `state-schema.md`, `tdd.md`, `universal-anti-patterns.md`, `verification-patterns.md`/`-index.md`, `gates.md`, `questioning.md`, and all 6 `checklist-*.md` files.
- **Fix suggestion:** Regenerate/update the index, or drop the "human-maintained catalogue" claim if it isn't being kept current.

### P2-6. Broken relative link inside a skill workflow doc
- `.rcode/skills/rcode-create-epics-and-stories/workflow.md` links `../../_shared/state-sync-rule.md`, which resolves to `.rcode/_shared/state-sync-rule.md` — does not exist. The actual file lives at `.rcode/brain/best-practices/state-sync-rule.md`.
- **Fix suggestion:** Correct the relative path.

---

## Notes on what was checked and ruled out

- `rcode/commands/config.md` → `@.rcode/workflows/settings.md` and `rcode/commands/review-fix.md` → `@.rcode/workflows/code-review-fix.md` look like broken command→workflow name mismatches on a naive name diff, but both resolve correctly — verified by reading the files. Not a finding.
- `rcode/workflows/execute-waves.md`, `execute-regression-gates.md`, `execute-verify-phase-goal.md`, `new-project-create-roadmap.md`, `new-project-define-requirements.md`, `new-project-research-decision.md`, `plan-prd-express.md`, `plan-research-validation.md`, `plan-spawn-planner.md`, `discuss-phase-discuss-areas.md`, `autonomous-smart-discuss.md`, `review-adversarial.md`, and other "workflows with no matching command" are internal helper workflows `@`-included by their parent workflow (execute.md, new-project.md, plan.md, discuss-phase.md, autonomous.md, code-review.md respectively), not orphaned. Not a finding.
- `.rcode/workflows/update.md:188` referencing `.claude/skills/rcode-create-prd/workflow.md` is correct — `.claude/skills/` is the real installer target for user-facing skills per `cli/install.js:1396-1471`, distinct from `.rcode/skills/`.
- `.rcode/skills/` only having 2 entries (`rcode-create-prd`, `rcode-create-epics-and-stories`) against ~150 skills in `rcode/skills/` is by design — these two are "halt-and-wait conversation" workflows their commands load directly rather than delegating to a subagent, not meant to be a general skill mirror. (This does not cover the separate, still-broken `rcode-lazy` skill reference in P0-5, which points at a third skill not covered by that design rationale.)
- `.planning/INSTALL-AUDIT-STATUS.md` and `.planning/campaign/STATE.md` exist as additional trackers but were not found to contradict the milestone/phase findings above within the scope of this pass.
- This worktree's `.claude/` has no installed commands (only `hooks/`/`settings.json`) — normal worktree behavior (install not run here), not a repo-wide defect.
