# rcode 4.1.0 Harness Fix List

Source audits:
- `/home/hanzla/development/rcode-harness-demos/codex/AUDIT-cld.md`
- `/home/hanzla/development/rcode-harness-demos/grok/AUDIT-codex.md`
- `/home/hanzla/development/rcode-harness-demos/copilot/AUDIT-grok.md`
- `/home/hanzla/development/rcode-harness-demos/cld/AUDIT-copilot.md`

## P0 - First-Use Breakage

1. Broken installed skill path resolution across multiple workflows.
   - Workflows for `create-prd`, `create-architecture`, `sprint-planning`, and `retrospective` search `.rcode/skills/actions/...` or `.claude/skills/...` even though project installs flatten skills under `.rcode/skills/<name>/`.
   - Impact: commands falsely report "skill not installed" after a normal install.

2. Dashboard command does not resolve local npm installs.
   - Resolver checks `./server`, `./.rcode/lib/server`, globals, and PATH, but omits `./node_modules/@hanzlaa/rcode/server/dashboard.js`.
   - Impact: `npm install @hanzlaa/rcode` plus `/rcode-dashboard` fails in the common local dependency case.

3. Agent namespace fails on first use after install.
   - Council and execute flows tell agents to spawn `rcode-*` subagents, but runtime registries can still expose only existing `rihal-*` agents until reload.
   - Impact: council and executor commands fail out of the box in common harness paths.

4. State sync wipes sprint state and velocity history.
   - `state sync --from-disk` reports no sprints when it cannot parse sprint artifacts, then overwrites `sprints[]` and history with empty state.
   - Impact: sprint planning, execute, retrospective, and velocity learning lose data.

5. CLI does not expose lifecycle command bridge for Codex/Copilot/Grok.
   - `rcode --help` omits lifecycle verbs such as `new-project`, `create-prd`, `plan`, `execute`, `ship`, `audit`.
   - Impact: non-Claude agents must manually read markdown workflows instead of invoking a discoverable `rcode` command.

6. Workflow/template path mismatches.
   - `brainstorm` references `rcode/references/brain-methods.csv` instead of `.rcode/references/brain-methods.csv`.
   - `verify-phase` references `.rcode/templates/verification-report.md` and output paths under `.rcode/phases`, while installed/runtime artifacts use `.planning/phases` and the verifier rules template.
   - `create-architecture` expects `.rcode/config.json`; install creates `.rcode/config.yaml`.

## P1 - Workflow/State Consistency

7. Golden paths skip required project initialization.
   - Several lifecycle sequences assume `/rcode-new-project` created real `PROJECT`, `REQUIREMENTS`, `ROADMAP`, phases, and state, but install only creates stubs.
   - Impact: downstream commands need manual ROADMAP/STATE edits.

8. Phase and sprint helpers are inconsistent.
   - `init phase-op` can return `padded_phase: "1"` for Phase `01`, with null `phase_slug` and `phase_dir`.
   - `sprint add` rejects phase names and gives no sync hint when state is stale.
   - Manual artifact naming with `001-*` vs `01-*` is under-documented and detection is brittle.

9. Guided/default modes block automation.
   - Council, discuss, sprint-planning, retrospective, create-architecture, and audit use AskUserQuestion or hard confirmations without a consistent `--auto`/explicit-target escape.
   - Impact: CI/headless agents stall unless they know hidden flags or abandon the workflow.

10. Scaffold-project cannot initialize an existing working directory.
    - It is greenfield clone-only, with no `--here` or "planning only" path.
    - Impact: harnesses and brownfield projects cannot use the command as the first lifecycle step.

## P2 - Token Waste and Output Quality

11. High prompt payload in workflow files.
    - `retrospective` is about 1,492 lines, mostly scripted roleplay.
    - `discuss-phase` is about 973 lines plus optional references.
    - `council`, `execute-sprint`, and `init` carry large inline prose and repeated required reading.
    - Impact: small projects burn thousands of tokens before implementation.

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

16. Config value quoting is sloppy.
    - `project_name` can persist literal quotes and dashboard displays names like `"codex"`.

17. Generated `.gitignore` misses `node_modules/`.
    - Impact: fresh npm projects can accidentally stage dependencies.

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
