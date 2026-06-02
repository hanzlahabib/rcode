# rcode 4.1.0 Harness Fix List

Source audits:
- `/home/hanzla/development/rcode-harness-demos/codex/AUDIT-cld.md`
- `/home/hanzla/development/rcode-harness-demos/grok/AUDIT-codex.md`
- `/home/hanzla/development/rcode-harness-demos/copilot/AUDIT-grok.md`
- `/home/hanzla/development/rcode-harness-demos/cld/AUDIT-copilot.md`

## P0 - First-Use Breakage

1. ✅ FIXED (ce1c5e0) — Broken installed skill path resolution across multiple workflows.
   - Workflows for `create-prd`, `create-architecture`, `sprint-planning`, and `retrospective` search `.rcode/skills/actions/...` or `.claude/skills/...` even though project installs flatten skills under `.rcode/skills/<name>/`.

2. ✅ FIXED (09e1a81) — Dashboard command does not resolve local npm installs.
   - Resolver now checks `./node_modules/@hanzlaa/rcode/server/dashboard.js`.

3. ✅ FIXED (this branch) — Agent namespace fails on first use after install.
   - council.md and execute-sprint.md now document `rihal-{id}` fallback when `rcode-{id}` is not yet registered (pre-reload state).

4. ✅ FIXED (328facb) — State sync wipes sprint state and velocity history.
   - `state sync --from-disk` now preserves existing sprint/story data.

5. ✅ FIXED (this branch) — CLI lifecycle bridge missing for Codex/Copilot/Grok.
   - Added `rcode workflow list|show <name>` command and updated help text.

6. ✅ FIXED (this branch, partial) — Workflow/template path mismatches.
   - `brainstorm.md`: `rcode/references/` → `.rcode/references/`
   - `execute-sprint.md`: `config.json` → `config.yaml`
   - `retrospective/workflow.md`: `config.json` → `config.yaml`
   - NOTE: `verify-phase` `.rcode/phases` vs `.planning/phases` discrepancy not confirmed in current code; investigate separately.

## P1 - Workflow/State Consistency

7. OPEN — Golden paths skip required project initialization.
   - Several lifecycle sequences assume `/rcode-new-project` created real `PROJECT`, `REQUIREMENTS`, `ROADMAP`, phases, and state, but install only creates stubs.
   - Impact: downstream commands need manual ROADMAP/STATE edits.

8. OPEN — Phase and sprint helpers are inconsistent.
   - `init phase-op` can return `padded_phase: "1"` for Phase `01`, with null `phase_slug` and `phase_dir`.
   - `sprint add` rejects phase names and gives no sync hint when state is stale.
   - Manual artifact naming with `001-*` vs `01-*` is under-documented and detection is brittle.

9. ✅ FIXED (this branch) — Guided/default modes block automation.
   - sprint-planning.md: yolo/--auto mode bypasses first-sprint velocity prompt and capacity confirmation.
   - retrospective/workflow.md: AUTO MODE preamble skips all 25 WAIT gates and roleplay dialog.
   - discuss-phase.md: already had --auto flag.
   - audit.md: added explicit --auto flag that forces MODE=yolo for one invocation; updated help text.
   - create-architecture/workflow.md: added AUTO MODE section + config.json→config.yaml fix.
   - create-architecture/steps/step-01-init.md: confirmation gate now skipped in auto/yolo mode.

10. Scaffold-project cannot initialize an existing working directory.
    - It is greenfield clone-only, with no `--here` or "planning only" path.
    - Impact: harnesses and brownfield projects cannot use the command as the first lifecycle step.

## P2 - Token Waste and Output Quality

11. ✅ FIXED (this branch, partial) — High prompt payload in workflow files.
    - `retrospective/workflow.md`: added AUTO MODE preamble — skips roleplay dialog entirely in yolo/--auto mode. Full roleplay theater still present for interactive mode but skipped automatically for CI/headless.
    - `discuss-phase.md`: condensed <philosophy> block (17→3 lines). Conditional reading already minimizes domain-probes.md/gate-prompts.md load.
    - REMAINING: further reduction of Bob/Alice roleplay bodies in retrospective/workflow.md (risky without full rewrite), and council.md required reading (output-format.md 398 lines).

12. Duplicate global namespace bloat.
    - Installing `rcode-*` alongside existing `rihal-*` commands/skills doubles visible rosters in some runtimes.
    - Impact: every turn can pay for duplicate skill listings.

13. Installer has surprising global side effects and high footprint.
    - Local install/first `npx rcode` writes global `~/.claude` assets; project install writes hundreds of files and duplicates IDE surfaces.
    - Impact: isolation is poor and cleanup burden is high.

14. Install and docs remain Claude-centric despite cross-IDE claims.
    - Output advertises `.claude` paths for VS Code/Copilot, Gemini is explicitly not implemented, and Grok has no native surface.
    - Impact: Codex/Copilot/Grok users get methodology files but no direct runtime integration.

15. Generated artifacts leak internal references.
    - Planning stubs and skill bodies mention internal GitHub issue numbers and `rihal-code` references.
    - Impact: user-facing output looks unfinished.

16. ✅ FIXED (f9128e4) — Config value quoting is sloppy.
    - `config-set` now strips surrounding quotes from stored values.

17. ✅ FIXED (4c7ef2d) — Generated `.gitignore` misses `node_modules/`.
    - Installer now adds node_modules to .gitignore by default.

## P3 - Product Polish

18. Dashboard "view-only" starts an additional orchestrator port without clear disclosure.

19. Python/mixed-language workflows lack interpreter/version guidance.

20. File-organizer harness surfaced planning quality gaps.
    - Generated story pseudocode included a live directory iterator mutation bug, broad `except Exception`, and overwrite risk. This is mainly a content/checklist issue rather than a package runtime bug.

## Working Priority

1. Fix path resolution and local dashboard lookup.
2. Protect state sync from deleting sprint/velocity data.
3. Improve phase/sprint helper output and hints.
4. Add non-Claude CLI/discoverability bridge or at least expose lifecycle commands in help.
5. Reduce the largest prompt payloads.
6. Clean generated artifacts, install messaging, `.gitignore`, and config quoting.
