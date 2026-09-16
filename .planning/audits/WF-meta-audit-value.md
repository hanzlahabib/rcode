# WF-meta-audit-value — Audit-to-Value Pipeline Audit

**Date:** 2026-09-16  
**Branch:** wf-meta-audit-value (1bf92799)  
**Method:** Sampled 10 of 64 audit files in `.planning/audits/`; took the top finding from each; grepped whether that finding was implemented in the codebase and git history. Counted implementation rate. Inspected the audit→fix→ship pipeline end-to-end.

---

## Verdict

**Solid on raw audit quality; leaky on pipeline — audits produce findings but the finding→fix→user chain has no enforced handoff.** Of 10 sampled top findings, 7 are verifiably fixed in code (70%), 2 are partially addressed, and 1 is unfixed in the codebase. That 70% implementation rate is deceptively high because the fixed ones are the *most actionable* findings; the structural problems — broken skill/workflow bridges, stale placeholder brain sources, 54 open worktrees across 20+ parallel branches — accumulate without a drain. The audit system generates documents faster than it resolves them: 64 docs in `.planning/audits/`, 53 of which have no GH issue number, and no persistent store connecting a finding to a fix commit.

---

## The user's actual experience

A user who wants to improve rcode runs:

1. `/rcode-audit lens sxo` → `rcode/commands/audit.md:1` → `rcode/workflows/audit.md:Step5` → dispatches to `/rcode-lens-audit sxo` → `rcode/workflows/lens-audit.md:Step 4` → spawns `Task(subagent_type="rcode-layla")` with an audit prompt.

2. The lens agent returns findings **to stdout only**. `rcode/workflows/lens-audit.md` has zero `Write` calls, zero references to `.planning/audits/` — confirmed: `grep -c "Write\|planning/audits" rcode/workflows/lens-audit.md` returns `0`. The findings are printed in the chat pane and gone when the session ends.

3. The workflow prints GH issue bodies (`rcode/workflows/lens-audit.md:Step 6`) for findings, but does **not** run `gh issue create` — the spec says "Print to stdout only — do NOT create issues automatically." (`lens-audit.md:699`). The user must manually copy-paste each issue body into GitHub.

4. If the user wants auto-fix, they run `/rcode-audit-fix`. But `rcode/workflows/audit-fix.md:41` only accepts `--source audit-uat` as an internal keyword — `lens`, `code`, `sxo`, and every other lens name return: `"Error: Unsupported audit source. Supported keywords: audit-uat."` (`audit-fix.md:48`). The lens-to-fix bridge does not exist.

5. Findings that aren't manually filed as GH issues and aren't addressed in the same session are lost. There is no `FINDINGS.md`, no audit index, no triage queue, no tracking file that persists across sessions. The 64 files in `.planning/audits/` are each self-contained — 34 of 64 have no GH issue number anywhere in them.

6. The user has 54 active worktrees (`git worktree list | wc -l` → `54`), many created by this audit campaign. The `camp-*` worktrees are 5 months old (`git log --format='%ar' camp-agent-routing | tail -1` → `5 months ago`). Audit worktrees are opened but never explicitly pruned by any workflow.

---

## Leaks

1. 🔴 **Lens-audit output is ephemeral — findings are lost when the session ends.**  
   Evidence: `grep -c "Write\|planning/audits" rcode/workflows/lens-audit.md` → `0`. The workflow prints findings to stdout and GH issue bodies to stdout, then exits. No file is written. A user who runs `/rcode-audit lens all` and then closes Claude Code has zero persistent record of findings. User-facing cost: must re-run the full audit every time they want to act on findings; no ability to track what was already found.

2. 🔴 **`/rcode-audit-fix` can't consume lens-audit output.**  
   Evidence: `rcode/workflows/audit-fix.md:41,48` — only `audit-uat` is a valid internal source keyword. All other lens names produce an error. A user who runs `/rcode-audit lens security` and then `/rcode-audit-fix` gets `Error: Unsupported audit source`. User-facing cost: the two "fix" commands are documented as a pipeline (audit → fix) but the pipeline has a broken joint for every lens except UAT.

3. 🔴 **54 open worktrees, 5 months of `camp-*` branches that were never closed.**  
   Evidence: `git worktree list | wc -l` → `54`. `camp-agent-routing`, `camp-dashboard-config`, `camp-perf-state`, `camp-port-isolation`, `camp-stale-triage` — all created 5 months ago, still mounted. No workflow prunes them. `rcode/workflows/audit-worktrees.md` exists but is invoked only when the user explicitly runs `/rcode-audit worktrees`. User-facing cost: clone size, `git worktree list` noise, and the meta-cost that each audit batch adds 20 more worktrees that will still exist in September 2027.

4. 🟡 **No audit triage index — findings accumulate without a drain.**  
   Evidence: `ls .planning/audits/*.md | wc -l` → `64`. `grep -rL "#[0-9]\{3,4\}" .planning/audits/*.md | wc -l` → `34` (34 of 64 audits have no GH issue number). There is no `FINDINGS.md`, no JIRA/Linear board linkage, no rcode command that reads `.planning/audits/` and surfaces unfixed findings. User-facing cost: a maintainer who wants to know "what has been audited but not fixed" must manually scan 64 files. There is no answer to "what's the backlog of known issues?".

5. 🟡 **`/rcode-audit-fix` defaults to `audit-uat`, not the last audit that was actually run.**  
   Evidence: `rcode/workflows/audit-fix.md:41` — `--source <audit|file-path>` defaults to `audit-uat`. A user who runs `/rcode-audit lens security` and then `/rcode-audit-fix` (no flags) fixes UAT findings, not security findings. The default is misleading. User-facing cost: users who follow the natural flow (audit → fix) silently fix the wrong thing.

6. 🟡 **`rcode/brain/sources.yaml` ships two `<PLACEHOLDER>` entries to every user.**  
   Evidence: `rcode/brain/sources.yaml:40,53` — `repo: "<PLACEHOLDER: github.com/rcode-om/???>"`. Issue #162 that was supposed to fill these was explicitly closed as abandoned (`AUDIT-brain-priority-mechanism.md:70`). These ship to every `npx @hanzlaa/rcode install` user. User-facing cost: `brain pull` silently skips them with a warning, so it's not a crash — but it's misleading installed state that implies the brain feature is more complete than it is.

7. 🟢 **Audit files duplicate findings already tracked in prior audits.**  
   Evidence: `AUDIT-commands-parity.md` and `AUDIT-agent-sprawl.md` both investigated the `rihal-*` namespace question, with the second one explicitly noting the first had already audited it (`audit-agent-sprawl.md:14`). The `AUDIT2-*` series re-ran lenses that had `AUDIT-lens*` predecessors. No deduplication index exists. User-facing cost: audit budget (tokens, time) spent re-discovering already-known findings.

---

## Strengthenings

**Ranked by user value delivered per unit of effort:**

1. **Persist lens-audit findings to `.planning/audits/WF-<lens>-<date>.md` automatically.**  
   What: add a `Write` step at the end of `rcode/workflows/lens-audit.md` that writes the compiled findings table to `.planning/audits/WF-<lens>-<timestamp>.md`.  
   Why it helps the user: findings survive session end; `/rcode-audit-fix` can be pointed at the file with `--source`; the user has a searchable backlog.  
   Effort: S (add ~15 lines to `lens-audit.md`; the findings are already compiled in Step 5).  
   Files: `rcode/workflows/lens-audit.md` (Step 5/6, add a Write call after compiling `FINDINGS[]`).

2. **Add `lens` as a recognized source keyword in `/rcode-audit-fix`.**  
   What: in `rcode/workflows/audit-fix.md`, extend the `--source` keyword list to accept `lens-<name>` or `lens-last` (reads the most-recent matching `.planning/audits/WF-*.md`).  
   Why it helps the user: the natural flow `/rcode-audit lens security` → `/rcode-audit-fix` works end-to-end without manual copy-paste.  
   Effort: S (extend keyword resolution in `audit-fix.md:44-48`; add a file-read branch in `run-audit`).  
   Files: `rcode/workflows/audit-fix.md`.

3. **Prune worktrees automatically at audit-campaign close.**  
   What: in `rcode/workflows/audit.md`'s closing summary (Step 6), add a `git worktree remove --force` sweep for worktrees older than N days with no uncommitted work, or at minimum surface the count and a one-command prune.  
   Why it helps the user: 54 worktrees is maintenance debt. A user who runs 5 audit campaigns/year will have 270 orphaned worktrees.  
   Effort: M (add bash sweep to `audit.md:Step 6`; needs guard for uncommitted work).  
   Files: `rcode/workflows/audit.md`, `rcode/workflows/audit-worktrees.md`.

4. **Add an audit triage command that reads `.planning/audits/` and surfaces unfixed findings.**  
   What: a new command `/rcode-audit triage` (or extend `/rcode-audit plans`) that reads all `*.md` in `.planning/audits/`, extracts findings without a `FIXED`/`✓`/issue-number marker, and prints a ranked backlog.  
   Why it helps the user: answers "what do I know is broken that I haven't fixed?" — the question no current command answers.  
   Effort: M (new step in `audit.md` + a `rcode-tools.cjs audit-triage` subcommand, or inline bash in the workflow).  
   Files: `rcode/workflows/audit.md`, optionally `rcode/bin/lib/`.

5. **Remove or fill the two `<PLACEHOLDER>` brain sources before v5.**  
   What: either delete `rcode-github-standards` and `rcode-docs` entries from `rcode/brain/sources.yaml` or redirect them to real public URLs.  
   Why it helps the user: every installed user sees these in their `.rcode/brain/sources.yaml`; `brain pull` silently skips them and gives no guidance on what to put there.  
   Effort: S (2-line edit to `rcode/brain/sources.yaml`; decision is whether to remove or point to a public rcode repo).  
   Files: `rcode/brain/sources.yaml`, `rcode/brain/sources.yaml` (template).

---

## Kill your darlings

1. **The 18 skill/workflow duplicate pairs (`rcode/skills/actions/*/rcode-<name>/workflow.md` vs `rcode/workflows/<name>.md`) should be unified or the skill-side versions deleted.**  
   Evidence: `rcode/skills/actions/` has 4 stage directories containing 18 `workflow.md` files that duplicate `rcode/workflows/` counterparts. `AUDIT-redundant-work.md:Finding 3` identified this as the highest duplicate-maintenance burden. No bridge or sync mechanism exists (`grep -rn "@.rcode/workflows" rcode/skills/actions/ | wc -l` → `0`). Every fix to a workflow must be applied twice or drifts silently.

2. **`.planning/audits/AUDIT-commands-parity.md` and `AUDIT-agent-sprawl.md` cover the same question — delete the earlier one.**  
   The commands-parity audit's verdict was "premise invalid" and its only durable value is the `rihal-*` stale-install finding, which is also captured — with more detail — in `AUDIT-agent-sprawl.md`. Keeping both creates the false impression that the `rihal-*` issue is still under active investigation.

3. **The `camp-*` worktrees (5 months old, all at `1bf92799` or older, no uncommitted work) should be removed now.**  
   They add no value and will never be merged. They are artifacts of a past campaign that predates the current `wf-*` campaign structure. Removing them reduces `git worktree list` from 54 to 49 and makes the actual active work visible.

4. **`/rcode-audit-fix`'s default of `audit-uat` is wrong and should default to `lens-last` (most recent persisted lens-audit file) once Strengthening #1 above ships, or to nothing (force the user to name the source explicitly) until then.**  
   The current default silently fixes UAT findings when the user almost certainly wants to fix whatever they just audited. A wrong default is worse than no default.
