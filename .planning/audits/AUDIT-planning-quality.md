# AUDIT — Planning Artifact Quality (rcode's own `.rcode/` + `.planning/` + workflow/command layer)

**Scope:** Quality of rcode's *own* planning artifacts and workflow machinery — `.rcode/state.json`, `.rcode/memory/`, `.rcode/brain/`, `.planning/` (phases, sprints, verifications, roadmap), `rcode/workflows/*.md`, `rcode/commands/*.md`, and the `.rcode/` runtime mirror this repo dogfoods itself against. Diagnosis only — nothing outside this file was modified to produce this report; every claim below was verified directly against files on disk, not inferred from filenames or descriptions.

**Date:** 2026-09-02 · **Branch:** `audit-planning-quality`

---

## Summary

The single biggest problem is that `.rcode/state.json` — the file every workflow trusts as ground truth — actively disagrees with the phase directories on disk in both directions: it calls four fully-executed-and-reviewed phases "planned" (§1), and its top-level `current_phase`/`current_plan` pointer still targets a phase that its own `phases[]` array already marks `complete` (§2). This is not a new discovery — `.rcode/decisions/001-state-json-completion-tracking-gap.md` (ADR-001, 2026-07-30) already root-caused the mechanism and proposed a fix; §1/§2 are live reproductions showing the fix hasn't shipped. Separately, this repo's own installed `.rcode/workflows/` and `.rcode/references/` mirrors are missing 13 files that this repo's own commands/workflows `@`-include (§4, §5) — a real, reproducible dispatch failure, not a staleness nit. 11 phases marked "complete" — including the security-hardening phase — shipped with no `VERIFICATION.md`, despite `verify-phase.md` describing that file as the mandatory terminal gate before `/rcode-ship` (§6).

---

## P0 — Critical (contradicts actual state / would break execution or mislead an agent into skipping-or-redoing work)

### 1. `state.json` marks 4 fully-executed phases as "planned"
**Files:** `.rcode/state.json` (`phases[].status` for ids 34–37), `.planning/ROADMAP.md` (lines 378–467, "Status: Planned" for the same four)
Phases 34 (Status Summary Bar), 35 (Session History Panel), 36 (Command Palette), 37 (Phase Dependency Graph) all have **every** sprint's `SPRINT.md` + `SUMMARY.md` on disk (34/35 additionally have `REVIEW.md`/`REVIEW-FIX.md` — i.e. code-reviewed). Both `state.json`'s `phases[].status` and `ROADMAP.md`'s prose status agree with each other and are both wrong: `"planned"` / "Planned" (not-started). An agent trusting either file would re-plan or re-execute already-shipped work.
**Fix:** run `state sync-from-git` (the manual escape hatch ADR-001 names) to reconcile phase status against `*-SUMMARY.md` presence, then ship ADR-001 item 2 (make `update-progress --sprint` phase-aware) so this can't recur.

### 2. `current_phase`/`current_plan` still point at a phase already marked `complete`
**File:** `.rcode/state.json` (top-level `current_phase`, `current_plan: 6`)
`current_phase` is the phase-47 description ("Fix execute.md core bugs…") and `current_plan` is `6`, but `phases[]` in the same file already lists phase **47 as `"status": "complete"`**. The pointer was never advanced after phase 47 finished, so any workflow reading `current_phase` (`/rcode-next`, `/rcode-resume-work`) is told to resume work that's already done.
**Fix:** advance `current_phase`/`current_plan` to the next genuinely un-started phase (21 or 39) as part of closing out phase 47, or automate this alongside the §1 fix.

### 3. `.rcode/workflows/` (this repo's own installed runtime mirror) is missing 5 files its own commands `@`-include
**Files/refs:** `rcode/commands/execute-milestone.md` → `@.rcode/workflows/execute-milestone.md`; `rcode/commands/lazy.md` → `@.rcode/workflows/lazy.md`; `rcode/commands/plan-milestone.md` → `@.rcode/workflows/plan-milestone.md`; `rcode/commands/scaffold-milestone.md` → `@.rcode/workflows/scaffold-milestone.md`; `rcode/workflows/audit.md:173` → `@.rcode/workflows/audit-worktrees.md`
Verified: all 5 target files exist in the source tree `rcode/workflows/` but are absent from `.rcode/workflows/` (confirmed via `test -f`). `@`-includes in installed commands resolve against the current project's `.rcode/`, not the source tree, so running `/rcode-plan-milestone`, `/rcode-scaffold-milestone`, `/rcode-execute-milestone`, `/rcode-lazy`, or the worktree-audit branch of `/rcode-audit` **inside this repo right now** would silently fail to load their execution body. `.rcode/_config/files-manifest.csv` lists all 5 as expected at those exact `.rcode/workflows/` paths, confirming this is a failed/incomplete sync rather than an intentional omission.
**Fix:** sync `rcode/workflows/{execute-milestone,lazy,plan-milestone,scaffold-milestone,audit-worktrees}.md` into `.rcode/workflows/` (re-run whatever install/sync step keeps these mirrored per `files-manifest.csv`).

### 4. `.rcode/references/` is missing 8 files conditionally `@`-included by `.rcode/workflows/execute.md` and `plan.md`
**Refs:** `execute.md` → `execute-auto-copy-learnings.md`, `execute-close-parent-artifacts.md`, `execute-interactive-mode.md`, `execute-notify-webhooks.md`; `plan.md` → `plan-gaps-mode.md`, `plan-thinking-partner.md`, `plan-windows-troubleshooting.md`; plus `github-comment-style.md`
Verified: all 8 exist in `rcode/references/` but not `.rcode/references/` — same sync-drift pattern as §3. These are conditional includes (only loaded when a specific mode/flag is active — interactive mode, gaps mode, thinking-partner mode, Windows, webhook config), so the gap is latent and will surface unpredictably mid-execution rather than immediately.
**Fix:** same as §3 — sync the 8 files from `rcode/references/` into `.rcode/references/`.

### 5. `lens-audit.md` references a skill path that isn't installed in this project's `.rcode/skills/`
**File:** `rcode/workflows/lens-audit.md:627` — `` rcode-lazy ladder as the rubric (@.rcode/skills/core/rcode-lazy/SKILL.md). ``
Verified: `rcode-lazy`'s frontmatter has no `internal: true` flag, so per `cli/install.js:1400-1447` it installs as a normal user-facing skill to `.claude/skills/rcode-lazy/` (global), never to `.rcode/skills/`. (`.rcode/skills/` correctly holds only the project's 2 genuinely `internal: true`-and-not-`user-invocable` skills by design — this is *not* itself a gap, see the "ruled out" note below.) The `@.rcode/skills/core/rcode-lazy/SKILL.md` path therefore resolves to nothing in any install, not just this one.
**Fix:** change the reference to point at the skill by name/phrase-trigger (the way every other skill is referenced from workflows) instead of a literal `.rcode/skills/` path.

### 6. 11 "complete" phases across M2/M3 shipped with no goal-backward `VERIFICATION.md`
**Files:** `.planning/phases/{20,27,28,29,30,34,35,36,37,42,43}-*/` — no `*-VERIFICATION.md` in any of these 11 directories
`rcode/workflows/verify-phase.md:384,399` states verification is `"MANDATORY when status is passed... the terminal step"`, and `rcode/workflows/ship.md:16,45,119-122` gates `/rcode-ship` on a `VERIFICATION.md` with `status: passed`. Yet phases 20 (Dashboard UX Quick Wins), 27 (Realtime Kanban Orchestration Dashboard), 28 (Audit gap closure), **29 (Security hardening — orchestrator RCE, bash-guard bypasses, file-read scoping)**, 30 (Marketability), 34–37 (see §1), 42 (Ambient adoption hooks), and 43 (Ship rcode/data to consumers) all show execution evidence (`SUMMARY.md`, several with `REVIEW.md`) but no verification artifact. Contrast with phases 22–26, 31–33, 38, 44–47, which *do* have `VERIFICATION.md` — the gate is applied inconsistently, not universally skipped. Phase 29 is the most severe instance: a security-hardening phase's goal-backward check ("did the RCE/bash-guard fixes actually land and hold") was never run or recorded.
**Fix:** retroactively run `/rcode-verify-phase` for these 11, or explicitly record in `MILESTONES.md`/`ROADMAP.md` (M1 already documents its own gaps this way) that verification was skipped and why. Prioritize phase 29 given its security scope.

---

## P1 — Significant staleness / drift (needs a human to notice; workaround exists)

### 7. `.planning/milestones/M2-hardening-polish/MILESTONE.md` frontmatter and phase table are 16 phases and 3 months stale
**File:** `.planning/milestones/M2-hardening-polish/MILESTONE.md`
Frontmatter says `status: active`, `target: 2026-06` (target month has long passed; phase 47 completed 2026-08-09). Its phase table (lines 17–29) stops at phase 31 with status "planning" — but phase 31 is actually complete (has `SUMMARY.md`/`VERIFICATION.md`/`REVIEW.md`) and phases 32–47 exist with no row at all. There is also no `M3-*/MILESTONE.md` scaffold anywhere (unlike M1 and M2, which both have one) even though `.planning/ROADMAP.md:362`, `.planning/PROJECT.md:9`, `.planning/REQUIREMENTS.md:1`, and `.rcode/memory/milestones/current.md` all already describe "M3 — Archon Dashboard Port (v5)" as the active milestone with phases running through 47 — so M3 is documented in prose in four places but never given the same structured scaffold M1/M2 got, and the M2→M3 boundary (which phase M2 actually closed at) is never recorded anywhere.
**Fix:** decide and record where M2 closed (31? 33?), create `.planning/milestones/M3-archon-dashboard-port/MILESTONE.md` from the content already drafted in `ROADMAP.md`, and update M2's frontmatter `status`/`target`.

### 8. `ROADMAP.md`'s own top-level milestone list omits M3 entirely
**File:** `.planning/ROADMAP.md`, lines 3–6 (`## Milestones` bullet list: only `✓ M1` and `🚧 M2 — Phases 20–33 (in progress)`)
A full `# M3 — Archon Dashboard Port (v5)` section exists 356 lines further down the same file (line 362), and the M2 bullet's own claimed range ("Phases 20–33") is superseded by the file's own body, which documents phases through 47. The document disagrees with itself about how many milestones exist and where M2 ends.
**Fix:** add an M3 bullet to the top list and correct M2's phase range once §7 is resolved.

### 9. `ROADMAP.md` has a duplicate, orphaned "Phase 41" section that duplicates the real Phase 39
**File:** `.planning/ROADMAP.md` (`## Phase 41 —` at line 252 vs. `## Phase 39 —` at line 497, identical title "SEO Module: bundle top-notch SEO skills as a native rcode module", both "Status: Planned")
The real phase is `.planning/phases/39-seo-module/` (3 draft `SPRINT.md`, no `SUMMARY.md`) and `state.json` id `"39"` — no phase 40 or 41 exists anywhere in `state.json` or on disk. The document also lists phases out of numeric order (42–47 appear before 34–38, and 39 appears again at the very end). An agent skimming ROADMAP.md for "what is phase 39/41" gets two different answers.
**Fix:** delete the orphaned "Phase 41" section (lines 252–264) and re-sort the document by ascending phase number.

### 10. `STATE.md` is a 16-day-stale generated snapshot
**File:** `.planning/STATE.md` (`Generated: 2026-08-09T07:28:24.748Z`) vs. `.rcode/state.json` (`updated: 2026-08-25T06:38:33.365Z`)
`STATE.md` embeds a full copy of `state.json` as of its generation time and inherits the phase-47/current-phase staleness from §2 verbatim.
**Fix:** regenerate `STATE.md` from current `state.json` more frequently (or on every `state.json` write).

### 11. `.rcode/HANDOFF.json` / `.continue-here.md` are ~3 months and 14 phases stale
**Files:** `.rcode/HANDOFF.json`, `.rcode/.continue-here.md` (both `generated_at: 2026-05-22T08:20:52.816Z`, `"phase": "Dashboard command runner"` = phase 33, `current_sprint: "33.1"`)
These are the files `/rcode-resume-work` reads to restore context after a compact. Actual progress is at phase 47 (complete). Running `/rcode-resume-work` today would hand back a session-resume primer for phase-33 work that finished long ago.
**Fix:** regenerate on every pre-compact event (per their own `"reason": "pre-compact"` field) — check why the pre-compact hook stopped firing/writing after 2026-05-22; have `/rcode-resume-work` warn when `generated_at` is older than `state.json`'s `updated`.

### 12. Memory distillate is 2.5+ months stale and describes an already-archived milestone as current
**File:** `.rcode/memory/distillates/project.distillate.md` (`generated-at: 2026-05-22T21:10:24Z`) — "Current milestone" section describes the v4.0.0 rebrand ("Started 2026-05-20, rolling close 2026-06-15... Remaining: close #861")
Its own source file, `.rcode/memory/milestones/current.md` (newer, undated header), explicitly says that milestone "shipped and is archived history — package is at v4.9.0," and that the real current milestone is M3 (phase 47). The distillate carries a `source-digest` field specifically to detect this kind of drift, and it was never acted on.
**Fix:** run `/rcode-memory-distill` to regenerate.

### 13. `rcode/workflows/*.md` ↔ `rcode/skills/**/SKILL.md` bridge is still broken for 17 of 18 same-named pairs — a known, deliberately-deferred gap, still open
**Files:** 17 `SKILL.md` files under `rcode/skills/actions/*/rcode-*/SKILL.md` (`rcode-dev-story`, `rcode-debug`, `rcode-code-review`, `rcode-correct-course`, `rcode-sprint-status`, `rcode-scaffold-project`, `rcode-checkpoint-preview`, `rcode-retrospective`, `rcode-create-prd`, `rcode-create-story`, `rcode-create-epics-and-stories`, `rcode-validate-prd`, `rcode-edit-prd`, `rcode-prfaq`, `rcode-document-project`, `rcode-check-implementation-readiness`, `rcode-create-architecture`)
Each carries a `<!-- Bridge status: not currently invoked by any rcode/workflows/*.md file... -->` comment, and `grep -rl "delegate_to_skill" rcode/workflows/*.md` independently returns **zero** files. This was already documented in `AUDIT-redundant-work.md` finding 3, and phase 45's remediation (`45-4-SUMMARY.md`, task 45.4.2) deliberately chose to add the bridge-status comments as a documented, intentional deferral rather than wire the bridge — so this is not silently rotting, but it is still unresolved and is exactly the "broken cross-reference between commands/workflows/skills" class this audit was asked to check for.
**Fix:** either wire `delegate_to_skill`/`@`-inclusion from each workflow to its same-named skill, or (per `AUDIT-redundant-work.md`'s own recommendation) drop the now-permanently-dead `internal: true` skill copies from the shipped package.

---

## P2 — Cosmetic / documentation drift

### 14. `REFERENCES_INDEX.md` is missing ~40 of the ~109 actual reference files
**File:** `.rcode/references/REFERENCES_INDEX.md` (self-described: "Human-maintained catalogue... Update this file whenever you add a new reference")
Files present in `.rcode/references/` but absent from the index include `state-schema.md`, `commit-conventions.md`, `gates.md`, `gate-prompts.md`, `agent-contracts.md`, `checklist-story-dod.md`, `checklist-story-draft.md`, `checklist-pm.md`, `checklist-architect.md`, `checklist-change.md`, `checklist-po-master.md`, `checkpoints.md`, `checkpoints-index.md`, `git-preflight.md`, `git-integration.md`, `git-planning-commit.md`, `phase-id-conventions.md`, `phase-argument-parsing.md`, `model-profiles.md`, `model-profile-resolution.md`, `tdd.md`, `questioning.md`, `verification-patterns.md`, `verification-patterns-index.md`, `universal-anti-patterns.md`, `common-bug-patterns.md`, `common-bug-patterns-index.md`, and more — roughly 40% of the directory.
**Fix:** regenerate the index from a directory listing, or add a lint check that fails when `.rcode/references/*.md` and the index diverge.

### 15. Phase 47 carries an ad-hoc `TASKS.md` outside the standard artifact set
**File:** `.planning/phases/47-*/TASKS.md`
Every other phase directory uses only `CONTEXT.md` / `*-SPRINT.md` / `*-SUMMARY.md` / `*-VERIFICATION.md` / `*-REVIEW.md`/`*-CHECK.md`. Phase 47 is the only one with a `TASKS.md`, and no `TASKS.md` template exists under `.rcode/templates/`.
**Fix:** fold its content into the standard `SPRINT.md`/`SUMMARY.md` shape, or add it to `.rcode/templates/` and document when to use it.

### 16. 59 files in `.planning/audits/` carry no resolved/status marker, and at least one is confirmed stale
**File:** `.planning/audits/AUDIT-schema-drift.md` finding #1 ("`cli/github-sync.js` still hardcodes the dead `.rcode/phases/` layout — NOT fixed, only planned")
Independently re-verified: `grep -n "\.rcode/phases" cli/github-sync.js` now returns **zero matches**, and `.planning/phases/44-.../44-1-SUMMARY.md` + `44-VERIFICATION.md` exist — phase 44 executed and fixed exactly this bug. The audit file still reads as describing a live, unfixed bug, with no note that it was subsequently closed. `grep -Lc "RESOLVED\|Verdict: FIXED\|status: resolved" .planning/audits/*.md` shows 58 of 59 audit files carry no resolution marker at all, so there's no way to distinguish a still-open finding from a long-fixed one without re-verifying every claim by hand.
**Fix:** add a `Status: open | resolved (phase N) | superseded` line to each audit file, updated when the referenced fix ships; or move resolved audits to `.planning/audits/resolved/`.

### 17. `rcode/workflows/audit-plans.md` has no matching top-level command file
Unlike sibling audit subroutes `audit-milestone`, `audit-uat`, `audit-fix` (each has a dedicated `rcode/commands/*.md`), `audit-plans` has none — reachable only via `/rcode-audit plans` dispatch, not directly as its own slash command. Inconsistent, not broken.
**Fix:** add `rcode/commands/audit-plans.md` for consistency, or document why this subroute is the exception.

### 18. Broken relative link inside an installed skill workflow doc
**File:** `.rcode/skills/rcode-create-epics-and-stories/workflow.md` links `../../_shared/state-sync-rule.md`, which resolves to `.rcode/_shared/state-sync-rule.md` — does not exist. The actual file lives at `.rcode/brain/best-practices/state-sync-rule.md`.
**Fix:** correct the relative path.

### 19. Only 15 of 26 phase directories have a secondary `REVIEW.md`/`CHECK.md`, with no documented rule for when it's required
**Files:** phases 22, 31–38, 44–47 have review/check artifacts; phases 20, 21, 23–30, 39, 42, 43 do not.
Not necessarily wrong — some phases may not warrant a secondary review pass — but no workflow doc or template explains the criterion, so it reads as inconsistent rather than intentional.
**Fix:** document the trigger for REVIEW.md/CHECK.md (e.g. in `rcode/workflows/verify-phase.md`) so the gap is legible as a rule rather than an omission.

---

## Ruled out (checked, not a finding)

- `rcode/commands/config.md` → `@.rcode/workflows/settings.md` and `rcode/commands/review-fix.md` → `@.rcode/workflows/code-review-fix.md` look like broken command→workflow name mismatches on a naive basename diff, but both resolve correctly — verified by reading the files.
- `rcode/workflows/execute-waves.md`, `execute-regression-gates.md`, `execute-verify-phase-goal.md`, `new-project-create-roadmap.md`, `new-project-define-requirements.md`, `new-project-research-decision.md`, `plan-prd-express.md`, `plan-research-validation.md`, `plan-spawn-planner.md`, `discuss-phase-discuss-areas.md`, `autonomous-smart-discuss.md`, `review-adversarial.md`, and other "workflows with no matching command" are internal helper workflows `@`-included by their parent workflow (execute.md, new-project.md, plan.md, discuss-phase.md, autonomous.md, code-review.md respectively), not orphaned.
- `.rcode/skills/` containing only 2 entries (`rcode-create-prd`, `rcode-create-epics-and-stories`) against ~95 skills in `rcode/skills/` is **by design**, not a gap: per `cli/install.js:1400-1447`, only skills with `internal: true` and *not* `user-invocable: true` install to `.rcode/skills/`; everything else installs to `.claude/skills/` (global). These 2 are the only skills that currently satisfy that condition. (This does not cover the separate, genuinely broken `rcode-lazy` reference in §5, which points at a skill that was never meant to be in `.rcode/skills/` at all.)
- `.gitignore` marking `.rcode/skills/` ignored while `.rcode/workflows/`/`.rcode/references/`/`.rcode/bin/`/`.rcode/commands/` are force-tracked is consistent with the above — `.rcode/skills/`'s 2 tracked files are the complete correct set, not a partial mirror.
- `.planning/INSTALL-AUDIT-STATUS.md` and `.planning/campaign/STATE.md` exist as additional trackers but don't contradict any finding above.

---

## Cross-references for follow-up

- ADR-001 (`.rcode/decisions/001-state-json-completion-tracking-gap.md`) already proposes the concrete fix for §1/§2 — implementation status per this audit: **proposed, not shipped**.
- `AUDIT-redundant-work.md` finding 3 documents §13 in more depth (the 18-pair inventory, `internal: true` install routing, a `rcode-code-review`/`rcode-review` `name:` field mismatch worth a separate look).
- `AUDIT-schema-drift.md` finding #1 is now resolved (§16) but the file doesn't say so.

---

*Read-only diagnosis. No files outside `.planning/audits/AUDIT-planning-quality.md` were modified to produce this report.*
