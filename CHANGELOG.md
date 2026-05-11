# CHANGELOG

All notable changes to Rihal Code are documented here.

---

## v3.4.33 (2026-05-11) — code-review dispatch fix (closes #720)

`/rihal-code-review` was crashing with `Agent type 'rihal-review-adversarial-general' not found`. The step-02 dispatch text said "Invoke via the rihal-review-adversarial-general skill" — but that name exists as a **skill** in `rihal/skills/core/`, not a subagent. The surrounding "Launch parallel subagents" instruction made the AI dispatch `Task(subagent_type=X)` which failed.

Three reviewer roles now dispatch to actual agents in `rihal/agents/`:
- Blind Hunter → `rihal-security-adversary`
- Edge Case Hunter → `rihal-edge-case-hunter`
- Acceptance Auditor → `rihal-code-reviewer`

Wording also switched from ambiguous "Invoke via the X skill" to explicit `Task(subagent_type=...)` so future readers can't mis-dispatch.

---

## v3.4.32 (2026-05-11) — milestone discipline (closes #718)

Two gaps surfaced by audit-style outputs that produced `A1-A7` / `B1-B5` phase IDs:

- **Phase IDs unenforced** — `/rihal-plan` and `/rihal-audit-milestone` freestyled. rcode's actual convention (integer or decimal-subphase) was undocumented + unvalidated.
- **Milestone closure never prompted** — `/rihal-add-phase` happily appended phase #25 under M1 without nudging toward `/rihal-complete-milestone`. rcode's own state.json hit 25 open phases dogfooding the bug.

3 new `rihal-tools` subcommands: `validate-phase-id`, `validate-roadmap`, `milestone-health`. Workflow wiring in `add-phase.md` + `status.md`. Convention pinned in `rihal/references/phase-id-conventions.md`. 14 new tests, 273/273 passing.

---

## v3.4.31 (2026-05-08) — picker footprint trim (closes #710)

Users hit "Skill listing will be truncated — 491 descriptions dropped" on every Claude Code session because rcode shipped 85 skills with **zero** marked `internal: true`. Every action skill was picker-visible even though they're invoked via slash commands.

- **fix(skills):** Mark all 37 `rihal/skills/actions/**/SKILL.md` as `internal: true`. They route to `.rihal/skills/` (private) instead of `.claude/skills/` (picker). Slash dispatch unchanged.
- **fix(skills):** Trim `SIDEBAR_COMMANDS` from 43 → 10 daily-driver entries. Niche commands (`prfaq`, `ui-phase`, `forensics`, `map-codebase`, etc.) stay reachable via `/` autocomplete; they just don't claim sidebar slots.

**Picker footprint: 82 → 57 entries (-30%).** Combined with `/plugins → uninstall` for any unused plugins (vercel adds 42 alone), most users drop below the truncation threshold without raising `skillListingBudgetFraction`.

---

## v3.4.30 (2026-05-08) — regression tests for batch 5 (closes #708)

17 new tests pinning every batch-5 fix so the same bugs can't silently regress. Test totals: 242 → 259 passing.

- 5 tests for `rcode update` YAML config handling (#701)
- 9 tests for install manifest, sweep path-traversal guard, _seeded_stub guard, brain-pull timeout (#702/#703/#705/#706a)
- 3 tests for vscode/gemini coverage in planToPathList (#706b)

Each test names the issue it pins and emits a "regression of #N" marker so future refactors get a CI failure pointing at the original ticket.

---

## v3.4.29 (2026-05-08) — install/uninstall/update batch 5 (closes #701-#706)

Post-fix audit found 5 still-real critical issues that 8 rounds of fixes had missed. All shipped.

- **fix(update):** `rcode update` was broken end-to-end — read `.rihal/config.json` and `JSON.parse`d it, but installer writes `.rihal/config.yaml` (#701). Switched to YAML parser; `detectInstalledEditors` falls back to `~/.claude/skills/` for post-#679-dedup case; surgical `setYamlKey` preserves comments + ordering.
- **fix(install):** `files-manifest.csv` was generated BEFORE `installSkills`, so 100+ skill files never entered the manifest — orphan sweep + doctor drift detection blind to renamed/removed skills (#702). Manifest write moved to AFTER all skill installations; new `extraScanDirs` option walks `.claude/skills/` and `.rihal/skills/`.
- **fix(install):** `sweepStaleInstalledFiles` called `fs.rmSync(path.join(target, rel))` with `rel` from the user-readable CSV — a `../../etc/passwd` entry could escape project root (#703). The whole point of #688's `safeRmSync` was bypassed in the most exposed code path. Now routes through `safeRmSync(full, targetRoot)` with a pre-check that rejects `..` segments.
- **fix(uninstall):** Backup tarball excluded flat `.claude/commands/rihal-*.md` files (#704). Only the legacy `.claude/commands/rihal/` subdir was added; modern claude installs (post-#697) had every slash command missing from the rollback. `planToPathList` now disambiguates by `rihal-` prefix.
- **fix(install):** `_seeded_stub:true` was seeded into state.json even when `.planning/ROADMAP.md` already had real (non-stub) phases (#705). User who manually deleted state.json had their real project mis-classified as fresh on re-install. Guard checks ROADMAP for the `INSTALL STUB` banner.
- **fix(install,uninstall):** brain-pull `execFileSync` had no timeout — slow URL hung install indefinitely (#706a). Added `timeout: 60_000`. Plus `cli/uninstall.js` had no branches for `vscode` or `gemini` despite SUPPORTED_IDES listing both (#706b) — added marker-dir cleanup for vscode and `.gemini/rihal/{agents,commands}` removal for gemini.

**Net: 242/242 tests passing. Every critical from the post-fix audit closed.**

---

## v3.4.28 (2026-05-07) — green test suite (closes #698)

- **fix(test):** Make pre-existing test failures aware of the #679 dedup reality. After globals shadow project skills, tests that count `./.claude/skills/` etc. would erroneously fail with "0 found". Fall back to `~/.claude/` mirroring the runtime behavior. Touches `agent-size-budget`, `skill-description-budget`, `help-md-parity`, `no-absolute-home-paths`.
- **fix(lib/manifest):** `verifyClaudeInstall` had a pre-existing bug where the actions filter `!n.startsWith('rihal-')` excluded ALL real installed actions (since `installSkills` prefixes every action with `rihal-`). Rewrote to compare against the prefixed package set directly. Drift detection now actually works.
- **fix(test):** `manifest.test.cjs` was seeding `.claude/skills/rihal-X` for agents — but the post-v3 layout puts agents at `.claude/agents/rihal-X.md`. Updated the two drift tests to match.
- **feat(lib/manifest):** Added `{ globalFallback: false }` option to `verifyClaudeInstall` so tests can isolate from the contributor's real `~/.claude/`. Default remains true to preserve runtime behavior.
- **fix(test):** `no-source-command-skill-dupes` now exempts the 6 phase-flow commands (`rihal-sprint-planning`, `rihal-dev-story`, etc.) that legitimately ship as both real skills and sidebar entries — matching the generator's runtime behavior.
- **fix(meta):** AGENTS.md + CONTRIBUTING.md scope lists synced. New scopes added: `build`, `council`, `doctor`, `postinstall`, `progress`, `security`, `test`, `tools`, `uninstall` (all already used in commits).

**Net: full suite goes from 231/241 → 241/241 passing.**

---

## v3.4.27 (2026-05-07) — install/uninstall batch 4 (closes #696 #697)

- **test(uninstall,postinstall,update):** 38 new tests for the previously-untested CLI modules (#696). Closes Wave 3 W3.2/W3.3/W3.4 from `.planning/INSTALL-AUDIT-STATUS.md`. Refactors three files for testability: `cli/postinstall.js` now wraps top-level effect in `require.main === module` so importing it doesn't fire the postinstall logic; `cli/uninstall.js` extracts the gitignore-strip regex into pure `stripRihalGitignoreBlock`; `cli/update.js` adds named exports for `parseArgs` and `detectInstalledEditors`.
- **refactor(install,uninstall):** Single `SUPPORTED_IDES` source of truth (#697). Promotes the canonical IDE list to a frozen module-level constant in `cli/install.js`, exported and imported by `cli/uninstall.js`. Drift guard test fails CI if anyone re-introduces a local copy or a hardcoded literal of the same shape.

12 + 14 + 12 + 4 = 42 new tests covering every fix from Wave 1+2 plus the post-fix coverage gaps.

---

## v3.4.26 (2026-05-07) — hotfix

- **fix(build):** Replace dynamic `require(path.join(__dirname, 'lib', X))` with static `require('./lib/X.cjs')` so esbuild resolves them at bundle time. 3.4.24 + 3.4.25 shipped a bundle that hit `MODULE_NOT_FOUND` at runtime when `npm exec`-launched (the bundled `dist/rcode.js` has no `lib/` siblings). Static paths fix all three sites (install.js × 2, uninstall.js × 1).

---

## v3.4.25 (2026-05-07) — install/uninstall batch 3 (closes #691 #692 #693 #694)

- **fix(install):** PID-based exclusive lock at `.rihal/.install.lock` (#691). Concurrent installs no longer corrupt the manifest. Stale locks (dead PID) auto-reclaimed; live locks exit 3 with a clear message and the lock path.
- **fix(install):** Honor wizard's IDE selection — no double-prompt (#692). `resolveIde` early-returns if `opts.ides` is already set; wizard now also seeds `opts.ide` and `opts.ideProvided` to fix the field-shape drift between the singular and array forms.
- **fix(uninstall):** Dynamic `KNOWN_ACTION_SKILLS` + IDE list parity with installer (#693). The hardcoded 23-entry list was 14 entries behind the source; now derived from `cli/lib/manifest.cjs` at runtime (37 actions). Editor list now matches installer's surface (claude/cursor/gemini/vscode/antigravity), so users with vscode-installed rihal can finally `rcode uninstall`.
- **test(install):** First batch of integration tests (#694). 12 new tests covering `safeRmSync` (#688), atomic state writes (#687), `--reset` fail-fast (#680), idempotency, and the install-lock behavior (#691). Spawn-based — catches bundler-skew issues like the 3.4.22 stale-dist regression.

---

## v3.4.24 (2026-05-07) — install/uninstall safety batch 2 (closes #687 #688 #689)

- **fix(install):** Use `writeFileAtomic` for state.json, config.yaml, .gitignore, and pre-commit hook (#687). 11 critical writes converted; Ctrl+C / OOM / disk-full mid-write no longer truncates user state or silently destroys lines below the rcode .gitignore block.
- **fix(install,uninstall):** Symlink-traversal guard on `fs.rmSync` (#688). New `safeRmSync` helper refuses to recurse into a top-level symlink and refuses paths whose realpath escapes the project root. 7 call sites converted across install.js and uninstall.js. Verified: `rcode uninstall --purge` with `.planning` symlinked to `/tmp/outside` leaves the target intact.
- **fix(install):** Health-check thresholds derive from the package manifest (#689) instead of hardcoded `<20`. Skills count gets a global fallback to mirror the agents/commands fallback (#664/#666/#669) — necessary now that #679 dedup means project skills folder may have only sidebar stubs while `~/.claude/skills/` holds the real ones.

---

## v3.4.23 (2026-05-07) — hotfix

- **fix(build):** Add `prepack` lifecycle script so `npm publish` always rebuilds `dist/rcode.js` from current `cli/` source. 3.4.22 shipped a stale `dist/` (built from an older checkout), so the slash-picker dedup fix in #679 was not actually delivered to npm users. 3.4.23 has the correct bundle.

---

## v3.4.22 (2026-05-07)

### Install / uninstall / update flow audit — Wave 1+2 (closes #679 #680 #681 #682 #683 #684 #685)

User-blocking fix:

- **fix(install):** skills/ dedup — picker no longer shows /rihal-* twice (#679). When `~/.claude/skills/<name>` exists, project install skips writing the same skill (and its sidebar stub) under `.claude/skills/`. Verified: 0 overlap on a fresh install where 119 global rihal skills exist. `*.local.md` overrides always preserved.

UX correctness:

- **fix(install):** `--reset` alone now fails fast (exit 2) instead of silently doing nothing (#680). `--reset` requires `--force` to confirm the destructive intent.
- **feat(state):** `_seeded_stub:true` auto-clears on project graduation (#681). `writeState()` drops the marker once the project has REQUIREMENTS.md or a real phase. New `state clear-stub` subcommand for explicit clearing from `/rihal-new-project`.
- **docs(cli):** Normalize package name to `@hanzlaa/rcode` in JSDoc headers (#682). 16 stale `@hanzlahabib/rihal-code` references replaced. `cli/nuke.js` keeps both names for legacy migration.

Safety / data-loss fixes:

- **fix(uninstall):** `--purge` backup now includes `.rihal/` + `.planning/` (#683). The previous backup tarball excluded the very directories `--purge` deletes, plus the tarball itself was written into `.rihal/backups/` and got nuked seconds later by the rmSync of `.rihal/`. Backup now writes to `.rihal-backups/` (sibling) when purging and includes `.rihal/<every entry except backups>` plus `.planning/`. Verified `state.json` and `PROJECT.md` are restorable from the post-purge tarball.
- **fix(uninstall):** Tighten `.gitignore` strip regex — no longer eats user comments (#684). The legacy `# rcode[\s\S]*?` pattern matched any user line starting with `# rcode` and greedily consumed up to the next blank line, silently nuking user content. New regex requires both the `===== rcode-managed gitignore block =====` opener AND closer.
- **fix(install):** Keep `commit_planning` in `config.yaml` in sync with `.gitignore` on re-install (#685). Re-install previously rewrote `.gitignore` from the new prompt answer but preserved the old `config.yaml`, leaving two sources of truth. `resolveCommitPlanning` now reads existing config as default; surgical key update on actual change.

---

## v3.4.21 (2026-05-07)

### Fixes carried over from 3.4.20 main (commit b3428c1 missed the 3.4.20 release window — closes #677)

- **fix(install):** health check + summary respect global precedence (#664, #666, #669) — when project install removes local agent/command copies in favor of `~/.claude/` globals, the summary and verifier now fall back to counting from `~/.claude/agents/` and `~/.claude/commands/` instead of reporting `0`.

### `/rihal-new-project` first-run gaps (closes #670 #671 #672 #673 #674 #675 #676)

- **fix(install):** `seedStarterPlanning()` no longer pre-seeds `.rihal/state.json` with a fake `Setup & Scaffolding` phase (#670). State is seeded as `{_seeded_stub: true, project: null, phases: []}` so Step 0.5 can detect the stub.
- **fix(install):** stub `.planning/PROJECT.md`, `ROADMAP.md`, `STATE.md` now carry an `INSTALL STUB` HTML banner so users (and downstream tooling) can tell them apart from real planning artifacts (#676).
- **fix(workflows):** `/rihal-new-project` Step 0.5 rewritten with stub-vs-real classification (#671). Real-project signals: `REQUIREMENTS.md`, `research/`, >1 phase, or first-phase-name ≠ "Setup & Scaffolding".
- **feat(workflows):** `/rihal-new-project` accepts `--force` / `--reinit` (#672). Creates a `pre-rihal-rewrite-<timestamp>` git tag for rollback before overwriting.
- **fix(workflows):** Step 0.5 error message now lists the escape hatches: `--force`, `rcode install --reset` (#673).
- **fix(workflows):** `--auto` no longer blocked on stub state (#674) — the new stub classification proceeds without prompting.

---

## Unreleased — post v3.4.4 (2026-04-27 → present)

50 commits since v3.4.4. Grouped by area.

### Dashboard (Phases 20–21)
- **fix(dashboard):** phase 20 UX quick-wins — remove sidebar file tree, add empty states with `/rihal-plan` hints, deduplicate `/api/files` fetch (`125ebff`)
- **fix(dashboard):** phase 21 data pipeline — decimal phase IDs (split `.` before `padStart`), SPRINT.md fallback task parser, `String()` coercion on phase ID comparisons (`c0d681b`)
- **feat(dashboard):** add phases 20–21 in ROADMAP and state (`6a082f5`)

### Plan / Tools (`rihal-tools.cjs`)
- **fix(plan,tools):** researcher skip when CONTEXT.md exists (`--research` to force), ghost phase number sanity guard, two-layer gitignore commit guard — closes #588 #583 #566 (`20c3a3e`)

### Lens Audit
- **feat(lens-audit):** rewrite `lens-audit.md` — all 15 lenses dispatched via skill subagents (`3031b2b`)
- **feat(skills):** add 4 gap audit skills for lenses 5, 8, 10, 13 (`a1a7370`)
- **feat(workflows):** add 15-lens audit workflow + wire into `/rihal-audit` (`66ccd33`)

### Config / State
- **feat(config):** `state migrate-schema` subcommand normalises phases to current schema — closes #558 (`79b0d27`)
- **fix(config):** phase transition guards in `begin-phase` and `complete-phase` — closes #559 (`3ba0b6d`)
- **fix(config):** read `commit_docs` from both bare and `git.commit_docs` keys — closes #511 (`93505bd`)

### Workflow Resilience & Error Handling
- **fix(workflows):** add `.ok` guard after `INIT` in 7 workflows — closes #518 (`8728330`)
- **fix(workflows):** add partial panel failure handler in council Round 1 — closes #556 (`ae96ed3`)
- **fix(workflows):** all-fail fallback in `discuss-phase` advisor_research — closes #555 (`37515fb`)
- **fix(workflows):** Task() failure handler in import sprint-checker step — closes #554 (`3adf7bf`)
- **fix(workflows):** cap `SUMMARY.md` reads in `complete-milestone` evolve step — closes #512 (`ec0f50e`)
- **fix(workflows):** cap SPRINT.md find with `maxdepth 5 + head -50` in forensics — closes #517 (`5b0e4c8`)
- **fix(workflows):** `sprint-status.md` guard 3 state calls with `2>/dev/null` — closes #557 (`a438888`)

### Workflow Consistency & i18n
- **fix(workflows):** add `response_language` handling to 8 subagent-spawning workflows — closes #560 (`6fc849b`)
- **fix(workflows):** standardize `PHASE_NUM → PHASE_NUMBER` — closes #523 (`84ad704`)
- **fix(workflows):** add `2>/dev/null` guards to top 10 unguarded rihal-tools calls — closes #516 (`de55229`)
- **fix(workflows):** enforce `MAX_PASSES` cap in `discuss-phase` loop — closes #534 (`19215e8`)
- **fix(workflows):** replace stale `PLAN.md` refs with `SPRINT.md` in 6 workflows — closes #522 (`271dda9`)
- **fix(workflows):** add `done_field_protocol` to executor prompt in `execute.md` — closes #514 (`a3bd4d1`)
- **fix(workflows):** add Next Up footers to 17 dead-end workflows — closes #513 (`613d978`)
- **fix(workflows):** add `<purpose>` block to 5 workflows + lock with parity test (`a366417`)
- **fix(workflows):** macOS compat — `stat -c` fallback, `readlink -f` fallback, `mapfile→while-read` — closes #564 (`177c3e6`)
- **fix(workflows):** session-report.md broken nested command substitution + `date -d` — closes #565 (`e4a04f2`)
- **fix(workflows):** close dead-end, broken-ref, and orphan gaps — phase 17 (`da5bf5a`)

### Templates & References
- **fix(templates):** add YAML frontmatter to `summary.md` template; fix `PLAN.md → SPRINT.md` — closes #510 (`dcf66b3`)
- **fix(references):** add RTL/Arabic output safety guidance to `output-format.md` — closes #561

### Agents & Skills
- **fix(agents):** create `rihal-deviation-analyzer` skill stub — closes #515 (`ec882e3`)
- **fix(skills):** close 19 agent persona name/dir mismatches (`f1b30ac`)
- **fix(agents):** normalize 7 non-standard colors to safe palette (`8de6220`)
- **feat(skills):** add 4 gap audit skills for lens-audit lenses 5, 8, 10, 13 (`a1a7370`)

### Commands & GitHub
- **feat(commands):** add `/rihal-capture` + `/rihal-phase` unified entries — refs #484 (`e10a567`)
- **feat(github):** require-issue-link CI gate — flag PRs without `Closes/Refs/Fixes #N` (`281429d`)

### Performance
- **perf(plan,autonomous):** 3 token-burn guards — sprint cap, revision limit, `/clear` offer (`6ee9f1a`)

### Docs
- **fix(docs):** `getting-started.md` replace stale `git clone + install-v2.js` path — closes #531 (`4d22cc4`)
- **fix(docs):** update `install.md` version `v2.1.0 → v3.4.4` — closes #527 (`842a7f6`)

---

## v3.4.4 — current pinned version (2026-04-27)

Release-train backfill — entries for v3.3.1 → v3.4.4 captured below as a block. Each `chore(release):` commit was a bump-only ship; the underlying changes landed in the feature/fix commit between bumps.

### v3.4.4 (commit `714369f`)
- Bump-only release.

### v3.4.3 (commit `3c89802`) — preceded by `c5eeac4`
- **fix(cli):** handle multi-IDE array in buildInstallPlan.

### v3.4.2 (commit `d208f26`)
- Bump-only release.

### v3.4.1 (commit `7d16b83`) — preceded by `615a17b`
- **fix(refs):** migrate `rihal:command` to `rihal-command` slash syntax.

### v3.4.0 (commit `cc5b46a`)
- **feat(cli):** multi-IDE install, dashboard phase browser, agent cards. Detects every Claude Code-compatible IDE on the machine and offers an install picker.

### v3.3.2 (commit `12aaca6`) — preceded by `3eb9fa5`
- **fix(workflows):** resolve three autonomous-execution bugs (#454).

### v3.3.1 (no separate release commit found in main; npm version exists)
- Likely shipped from a tag-only push or hotfix branch. No content delta in source between v3.3.0 and v3.3.2.

---

## v3.3.0 — sidebar discoverability: install-time skill stubs for slash commands (2026-04-27)

VS Code's Claude Code extension only lists `.claude/skills/` in its sidebar — slash commands at `.claude/commands/rihal/` are reachable only via the `/` autocomplete picker. Users expected `rihal-do` to appear in the sidebar alongside other rcode skills.

This release closes the gap **without duplicating files in the source codebase** — sidebar stubs are generated only at install destination.

### Added

- **`cli/generate-command-skills.cjs`** — install-time generator that creates `.claude/skills/rihal-<cmd>/SKILL.md` for a curated list of 28 user-facing commands (`do`, `status`, `progress`, `next`, `plan`, `execute`, `council`, `discuss`, `ship`, `audit`, `verify-phase`, `verify-work`, `note`, `add-todo`, `check-todos`, `pause-work`, `resume-work`, etc.). Each stub:
  - Has `generated: true` and `generated-by: rcode-install-vX.Y.Z` frontmatter so the next install can refresh it idempotently
  - Includes a prominent `<!-- AUTO-GENERATED — Do NOT edit -->` HTML comment
  - Points the user at the source of truth (`rihal/commands/<cmd>.md` and `rihal/workflows/<cmd>.md`)
  - Skipped automatically when a real skill with the same name already exists (e.g. `rihal-debug`, `rihal-code-review`)
- **`test/no-source-command-skill-dupes.test.cjs`** — guards the source codebase from accidentally introducing the very duplication this generator solves at install time. Catches if a future PR ships a `rihal-do` skill folder that would shadow the generated stub.

### Fixed

- Issue users reported after upgrading to v3.2.1: VS Code sidebar didn't list `rihal-do` even though the command existed. Now it appears as a sidebar skill stub, sourced from the same single command file.

### Counts

- 132 passing tests (was 130; +2 dedupe guards)
- 80 skills in source + 26 sidebar stubs at install destination = **106 skills visible in VS Code sidebar after install**
- 95 slash commands (unchanged — the source of truth for invocation behaviour)

### Honesty about the duplication

The stubs ARE duplicates of the slash commands in a sense — they invoke the same workflow files. The difference: they live ONLY at the install destination (`.claude/skills/`), never in the rcode source tree (`rihal/skills/`). One source of truth per command + a generated sidebar entry, refreshed every install. CI test #no-source-command-skill-dupes prevents anyone from sneaking duplicate source folders past review.

---

## v3.2.1 — VS Code + Antigravity end-to-end install paths (2026-04-27)

Patch for v3.2.0 — selecting VS Code or Antigravity from the install menu now actually completes the install instead of erroring with "not supported".

### Fixed

- **`--ide vscode`** now routes through `getPathsForIde()` to install at `.claude/agents/`, `.claude/commands/rihal/`, and `.claude/skills/` (where the Claude Code / Continue / Copilot extensions read from). User-visible: install completes; the user-facing notice reads "VS Code → installing to .claude/ paths".
- **`--ide antigravity`** routes to `.antigravity/rihal/{agents,commands}/`, mirroring the `.gemini/rihal/` layout. Marked experimental — the user is told at install time that Antigravity's plugin protocol is still firming up and they may need to adjust paths via `.rihal/config.yaml`.
- **Health check** at end of install now reads from the IDE-specific install paths (was hardcoded to `.claude/`). Cursor / Gemini / VS Code / Antigravity installs no longer false-fail the agent / command counts.
- **IDE-validation list** in `cli/install.js` extended to include `vscode` and `antigravity` so explicit `--ide vscode` / `--ide antigravity` flags pass validation.

### Verified

- `node dist/rcode.js install /tmp/test-vscode --ide vscode --yes` → 41 agents + 80 skills + 95 commands, health check ✓
- `node dist/rcode.js install /tmp/test-anti --ide antigravity --yes` → 41 agents + 80 skills + 95 commands at `.antigravity/rihal/`, health check ✓
- 130 tests still passing

---

## v3.2.0 — install UX overhaul: arrow-key prompts, two new IDEs, interactive upgrade resolver (2026-04-27)

Closes the 5 install-UX bugs (#449–#453) from the v3.1.0 user feedback session. The headline win is upgrade ergonomics — the wall of `differs from package version` warnings is gone, replaced by a categorised summary and an interactive per-file resolver.

### Added

- **VS Code** as a first-class IDE target — detected via `.vscode/`, `~/.vscode/`, `~/.config/Code/`, `VSCODE_PID` env. Installs alongside Claude Code if both are present.
- **Antigravity** as an experimental IDE target — detected via `.antigravity/` and `~/.antigravity/`.
- **Interactive upgrade resolver** in `cli/install.js` — when conflicts are detected on upgrade, the installer offers three paths via `@clack/prompts`:
  - **Review each one** (default) — per-file: see diff stats, choose take-upstream / keep-local / view-full-diff
  - **Take vX.Y.Z for all** — single bulk override
  - **Keep my local edits** — current behaviour (skip upstream updates)
  Replaces the previous all-or-nothing `--force-overwrite` choice. (#453)

### Changed — install prompts

- **Arrow-key navigation** for IDE selection and gitignore-planning prompts. Uses `@clack/prompts` instead of Node's built-in readline; adds Ctrl-C handling. (#449)
- **Categorised conflict summary** — instead of 44 lines of `differs from package version`, the installer now prints one summary line per category (workflows / agents / commands / skills / references) and surfaces the choice via the interactive resolver above. (#451)
- **Visual separation** between prompt phase and install phase — clarifies that conflicts are unrelated to the user's gitignore-planning choice. (#452)

### Affected files

- `cli/install.js` — replaced 2 readline prompt blocks with `@clack/prompts` calls; added VS Code + Antigravity detection signals; replaced per-file diff warnings with buffered conflict array + interactive resolver
- `package.json` — version bumped, description updated to mention new IDE targets
- `DOCS.md` — Troubleshooting section adds the new upgrade flow + manual workaround for v3.1.0 and earlier

### Notable

- Falls back to the previous behaviour when stdout is not a TTY or `--yes` is passed (CI-friendly).
- `--force-overwrite` still works for users who want the legacy all-or-nothing path.
- Test suite unchanged at 130 cases — install UX paths are interactive and CI-skipped.

### Issue links

- #449 — readline → `@clack/prompts`
- #450 — VS Code + Antigravity IDE targets
- #451 — warning overload → categorised summary
- #452 — gitignore prompt vs warnings cognitive conflation
- #453 — interactive upgrade resolver (the umbrella)

---

## v3.1.0 — pipeline integrity audit: 9 silent-malfunction bugs fixed (2026-04-27)

Patch release closing the 9 bugs surfaced during the 2026-04-27 pipeline integrity audit (see [`docs/audits/2026-04-27-pipeline-integrity.md`](docs/audits/2026-04-27-pipeline-integrity.md)). All 9 issues affected silent runtime behaviour — the test suite at v3.0.0 didn't catch them because tests cover rcode source invariants, not target-project runtime. Issue range: #440–#448.

### Fixed — agent runtime

- **#440 / #445 (CRITICAL):** 10 agents declared tools using Gemini-style snake_case names (`read_file`, `run_shell_command`, etc.). Claude Code silently rejected these — agents narrated what they would do without invoking any tool. Affected: `rihal-sprint-checker`, `rihal-verifier`, `rihal-codebase-mapper` (Dalil), `rihal-integration-checker`, `rihal-roadmapper`, `rihal-advisor-researcher`, `rihal-assumptions-analyzer`, `rihal-phase-researcher`, `rihal-project-researcher`, `rihal-research-synthesizer`. All renamed to PascalCase (`Read`, `Bash`, `Grep`, `Glob`, `Write`, `WebFetch`, `WebSearch`).
- **#440 (defence):** `plan.md` now refuses to advance plans on empty sprint-checker output. Sprint-checker MUST emit YAML evidence markers (`issues:`, `verified_files:`, file:line refs) — empty narrative output is treated as malfunction, not pass.

### Fixed — workflow correctness

- **#441:** Planner now verifies every file in `files_modified` actually exists on disk before committing it to a plan. Plans referencing fictional file names are rejected.
- **#442:** New `12.5. Wave Parallelism File-Overlap Check` in `plan.md`. Calls `rihal-tools plan check-wave-overlaps`; auto-corrects same-wave plans with overlapping files to `sequential: true`.
- **#443 / #448:** New `executed` → `complete` state transition. Phase moves to `executed` after work is done; only a passing VERIFICATION.md promotes to `complete`. `/rihal-next` refuses to advance from `executed`. Closes the gap where phases reached `complete` without UAT.
- **#446:** Removed `git commit --no-verify` recommendation from parallel-execution mode in `execute.md`. AGENTS.md forbids `--no-verify`. Replaced with file-based commit lock (`.rihal/.commit-lock`) so hooks run normally per commit.

### Fixed — documentation drift

- **#444:** `.planning/` gitignore + `git add -f` constraint now documented in `rihal-executor.md` so every executor session loads it. Prevents silently-dropped SUMMARY.md commits.
- **#447:** 9 legacy core skills now declare `## Memory Bank Hooks` (matching the post-Phase-3 5-component standard): `rihal-init`, `rihal-help`, `rihal-index-docs`, `rihal-shard-doc`, `rihal-party-mode`, `rihal-brainstorming`, `rihal-editorial-review-prose`, `rihal-review-adversarial-general`, `rihal-review-edge-case-hunter`.

### Added — regression-prevention tests (4 new test files, +10 cases)

- `test/agents-tool-conventions.test.cjs` — asserts every agent uses Claude Code PascalCase tool naming
- `test/skills-memory-hooks.test.cjs` — asserts every core SKILL.md has a non-empty `Memory Bank Hooks` section
- `test/workflows-no-verify.test.cjs` — scans for `--no-verify` recommendations (allowing negative-form prohibitions)
- `test/workflows-state-gating.test.cjs` — asserts `execute.md` has the UAT gate, `plan.md` has the sprint-checker malfunction guard and wave-overlap check

Test suite: **120 → 130 cases**, all green.

### Audit artefact

- [`docs/audits/2026-04-27-pipeline-integrity.md`](docs/audits/2026-04-27-pipeline-integrity.md) catalogues the 5 anti-patterns found and prescribes detection commands for each.

### Counts after this release

- 130 passing tests (was 120) — added 10 new regression cases
- 80 skills (unchanged)
- 45 agents (unchanged)
- 95 slash commands (unchanged)
- Zero runtime dependencies preserved

---

## v3.0.0 — rcode improvement programme: Memory Bank, brand vocab, engineering + real-pain skills (2026-04-26)

The largest single delta since v2.0. 10 phases, 80+ commits, 19 new skills, comprehensive test coverage. See [`MIGRATIONS.md`](MIGRATIONS.md) for the upgrade path and [`TASKS.md`](TASKS.md) for the work log. Issue history: #386–#439.

### Added — `Memory Bank` primitive (Phase 3)

Persistent, structured, checked-in project context. `.rihal/memory/` directory with project, people, milestones, incidents, change-records, and distillates subdirectories.

- `rihal-memory-init` skill — bootstrap a Memory Bank for an existing project
- `rihal-memory-update` skill — surgical update from conversation context
- `rihal-memory-distill` skill — regenerate token-optimised distillates
- `rihal-memory-audit` skill — find stale entries and contradictions
- 4 slash commands: `/rcode:memory-init`, `-update`, `-distill`, `-audit`
- 13 template files at `rihal/templates/memory/`
- Diwan dashboard `/api/memory` endpoint + `/memory` view (additive to `server/lib/*`)
- `MEMORY_BANK.md` specification at repo root

### Added — Engineering rigour skills (Phase 11, 11 skills)

Stack-grounded for Next.js 16, React 19, Strapi, Postgres, Three.js, Sentry, Temporal, Helm/K8s.

- `rihal-incremental` — atomic, verifiable shipping
- `rihal-prove-it` — TDD with Jest + Playwright + node:test
- `rihal-source-truth` — cite official docs before code
- `rihal-browser-verify` — Chrome DevTools MCP for runtime verification
- `rihal-debug` — root-cause debugging via the scientific method
- `rihal-trim` — code simplification (no behaviour change)
- `rihal-harden` — security checklist for SaaS auth/tenant patterns
- `rihal-perf` — performance optimisation per stack layer
- `rihal-git-flow` — branching aligned with Epic→Feature→Task hierarchy
- `rihal-ci` — Helm + K8s + Docker Compose quality gates
- `rihal-migrate` — MVP-to-production transitions

### Added — Real-pain skills (Phase 12, 8 skills)

Encoded from verified Rihal incidents — no other tool has these because they require the scars.

- `rihal-auth-audit` — Keycloak ↔ AD sync verification, JWT validation, tenant isolation
- `rihal-deploy-unify` — multiple-deploy-paths detection (Siraaj incident)
- `rihal-ocr-consistency` — OCR pipeline determinism + ground-truth validation
- `rihal-theme-system` — design token audit before launch (rebrand incident)
- `rihal-mvp-graduate` — MVP-to-production strategic plan with stakeholder sequencing
- `rihal-client-gate` — client requirement freeze gates and async-comm patterns
- `rihal-rebrand` — stack-wide rebranding migration (9 surfaces)
- `rihal-incident-record` — change-record + post-mortem in one flow

### Added — Brand & docs (Phase 1, Phase 8)

- `BRAND.md` — voice guide, naming conventions, persona glossary
- `MIGRATIONS.md` — every renamed/dropped surface from this programme
- `TASKS.md` — master task tracker driving GitHub issue hierarchy
- `docs/skills-catalog.md` — auto-generated catalogue of all 80 skills
- `scripts/build-skills-catalog.cjs` — catalogue generator
- README "Who is rcode for" target-audience section
- Refreshed `package.json` description for the rcode positioning

### Added — Test coverage (Phase 7 + Phase 10)

- `test/skills-compliance.test.cjs` — every SKILL.md has frontmatter + line budget + prefix convention (4 tests)
- `test/dashboard-boot.test.cjs` — boot smoke for `/health`, `/api/state`, `/api/memory` (2 tests)
- `test/memory-templates.test.cjs` — required files, INDEX coverage, distillate frontmatter (5 tests)
- `test/agents-registry.test.cjs` — team.yaml integrity, no orphans (5 tests)
- `test/dashboard-e2e.test.cjs` — 9 end-to-end content assertions across all routes
- Total: 25 new test cases. Suite at 120 passing.

### Changed — Slash commands (Phase 2 + Phase 4)

| Old | New |
|---|---|
| `/rihal-report` | `/rihal-session-report` (was a pure alias) |
| `/rihal-karpathy-audit <args>` | `/rihal-code-review <args> --karpathy` |
| `/rihal-review-adversarial <args>` | `/rihal-code-review <args> --attack` (plain English) |
| `/rihal-review-edge-case-hunter <args>` | `/rihal-code-review <args> --edge-cases` |
| `/rihal-discuss-phase-power <args>` | `/rihal-discuss-phase <args> --power` |

Underlying workflow files retained — `code-review` delegates to them on flag match.

### Changed — Agents (Phase 2 + Phase 4)

- `rihal-architect` agent dropped — folded into `rihal-waleed` (CTO + Chief Architect)
- `rihal-tech-writer` agent dropped — folded into `rihal-noor` (Technical Writer & Presentation Lead). Noor gained `Write, Edit` tools.
- `team.yaml` agent count: 47 → 45

### Changed — Skills slimmed (Phase 4 Group 4)

8 oversized SKILL.md files moved to ≤120 lines with detail in sibling `references.md`:

- `rihal-clone-website` (416 → 75)
- `rihal-distillator` (212 → 63)
- `rihal-editorial-review-structure` (211 → 73)
- `rihal-advanced-elicitation` (167 → 67)
- `dalil-scout` (202 → 120)
- `majlis-council` (192 → 98)
- `raees-orchestrator` (166 → 105)
- `rihal-frontend-design` (182 → 92)

### Removed (user-facing slashes only — internal workflows preserved)

- `/rihal-report`, `/rihal-new-project-research`, `/rihal-new-project-roadmap`, `/rihal-check-implementation-readiness`
- `/rihal-discuss-phase-power`, `/rihal-karpathy-audit`, `/rihal-review-adversarial`, `/rihal-review-edge-case-hunter`

### Notable decisions

- **Path B** — skill folder names stay `rihal-*` for `cli/install.js` compatibility; brand vocabulary lives in slash names and content. See [`BRAND.md`](BRAND.md).
- **Plain English over jargon** — `--attack` instead of `--adversarial`, `--edge-cases` instead of `--edge-case-hunter`. Audience includes non-native English speakers.
- **Workflow file splits skipped** — Phase 5 work was deferred. Rationale: workflows are dense executable bash + agent-dispatch, not redundant prose. Trimming carried unverified runtime risk.
- **Off-limits files preserved** — `cli/install.js`, `cli/update.js`, `cli/github-sync.js`, `cli/postinstall.js`, `cli/uninstall.js` were not modified in this programme. `server/dashboard.js` was extended additively (one route registration) with explicit user approval.

### Counts after this release

- 45 agents (was 47)
- 95 slash commands (was 99)
- **80 skills** (was 56) — Memory Bank + Engineering + Real-pain layers added
- 120 passing tests (was ~95) — added 25 new test cases
- Zero runtime dependencies preserved

### Upgrade path

See [`MIGRATIONS.md`](MIGRATIONS.md) for the per-surface mapping. CI catches old references at install time.

---

## v2.3.4 — Doctor fixes: actions drift false positive + memory bank stub (2026-04-25)

### Fixed
- `doctor` no longer reports `actions 0/4 missing: 1-analysis, 2-plan, ...` — manifest builder now walks action bucket dirs recursively (matching `installSkills` behavior) instead of adding bucket directory names that never appear in `.claude/skills/`
- `doctor` no longer reports `Memory bank: never initialized` immediately after fresh install — `install` now seeds empty `.rihal/context/active.md` and `.rihal/context/project-brief.md` stubs so the "never" state is skipped; message reads "run /rihal-init in your editor to populate project context"

---

## v2.3.3 — CLI aliases + state.json fix + stale install-v2 refs removed (2026-04-25)

### Added
- `rihal` bin alias in package.json — `rihal install`, `rihal update`, `rihal uninstall` now work alongside `rcode` and `rihal-code`
- `rihal/state.json` template — install now seeds `.rihal/state.json` correctly on first install (was silently skipped because template was missing, causing health check failure `✗ .rihal/state.json parses — missing`)

### Fixed
- Replaced all `rihal-code install-v2` error messages in workflows (council.md, chain.md, discuss.md, enable-hooks.md) — stale v1 command, now `npx @hanzlaa/rcode install`
- Corrected agent/command counts everywhere: **43 agents, 99 commands** (plan-checker alias shares sprint-checker file; 99 command files on disk)
  - README.md, docs/agents.md, docs/TIERS.md all updated

### No behavior change
- `rihal-code` alias preserved for backward compatibility
- `npx @hanzlaa/rcode` still works as before

---

## v2.3.2 — Documentation audit: agent counts corrected, orphaned stubs removed (2026-04-25)

**Documentation correctness pass.** No behavior changes.

### Fixed

- Corrected `team.yaml` YAML structure: tactical agents block was nested inside `routing:` mapping, causing parse errors. Added proper `tactical_agents:` top-level key.
- Registered `rihal-plan-checker` in `team.yaml` (alias for `rihal-sprint-checker`; referenced in `verify-work.md` workflow but was never registered)
- Removed 3 dead stub entries from `docs/agents.md`: `rihal-doc-verifier`, `rihal-doc-writer`, `rihal-repo-metrics` — no agent files exist, no workflow references found
- Corrected agent counts across all docs: 46 → 44 (17 persona + 27 tactical)
  - `docs/agents.md` header
  - `README.md` feature list and health check output
  - `docs/TIERS.md` preview section

---

## v2.3.1 — Auto-heal: full skill compliance + 26 tactical agents registered (2026-04-25)

**Maintenance release.** Zero behavior changes — all fixes are structural correctness.

### Fixed

- All 56 SKILL.md files now pass the 5-component compliance check: `triggers:`, `## Overview`, `## Workflow`, `## Output Format`, `## Examples`
- Added `triggers:` frontmatter to 39 action + core skills previously missing it (agents were fixed in v2.3.0)
- Added `## Overview` to 34 skills, `## Workflow` to 12 skills
- Renamed `## On Activation` → `## Workflow` in all 17 agent SKILL.md files
- Fixed 7 broken `@`-includes across workflows: `autonomous.md`, `sprint-planning.md`, `checkpoint-preview.md`, `prfaq.md`, `document-project.md`
- Fixed broken `@.rihal/workflows/execute-plan.md` reference in `rihal-planner.md` → `execute.md`
- Removed legacy nested duplicate SKILL.md dirs (`rihal-shard-doc/rihal-shard-doc`, `rihal-advanced-elicitation/rihal-advanced-elicitation`)
- Added `skill_path:` field to 14 agents in `team.yaml` linking persona IDs to `skills/agents/` dirs
- Registered all 26 tactical/workflow agents in `team.yaml` (executor, planner, verifier, debugger, etc.) — were on disk but invisible to council dispatch (#201)
- Added retroactive `SPRINT.md` for phases 01–03 (completed before sprint tracking was standardized)
- Fixed stale counts in `README.md` and `docs/TIERS.md`
- Fixed `CHANGELOG.md` missing entries for v2.3.0 and v2.3.1

---

## v2.3.0 — State integrity + commit sync + brainstorm dashboard (2026-04-25)

**State integrity pass.** Focused on making state.json the reliable source of truth and wiring it to git.

### Added

- Auto-sync state on commit (pre-commit hook writes `.rihal/state.json` on every `git commit`)
- `/rihal-brainstorm` skill — structured ideation with reverse-brainstorm, SCAMPER, and 6-hats modes
- 24 tactical sub-agents registered in `team.yaml` (partial — full registration in v2.3.1)
- Dashboard: hierarchical nav (milestones → phases → sprints → tasks), file browser, auto-refresh, blocker banner, design system, dark/light toggle, keyboard shortcuts

### Fixed

- Dashboard: strip YAML frontmatter before rendering markdown in file viewer
- Dashboard: project name showing `.` instead of `rihal-code`
- Dashboard: auto-refresh re-renders active view without page reload
- Dashboard: modularized monolithic 1200-line file into `server/lib/` modules
- Planning: aligned `.planning/` structure with the rcode standard layout (phases 01–05 dirs, PLAN.md, VERIFICATION.md)
- Config: `project_name: '.'` → `rihal-code`; stale `rihal_source_path` cleared

---

## v2.2.0 — Auto-managed .gitignore on install (2026-04-24)

**Installer polish.** Before v2.2, a fresh `rcode install` + `git add .` would bloat the user's repo by 676 methodology files (~3.8 MB) that regenerate on every update. This release fixes that at the install step, not after-the-fact.

### Added

- `cli/install.js` now appends an idempotent `rcode-managed gitignore block` to the project's `.gitignore` on first install. Block is marked with a sentinel comment so re-runs detect and skip. Existing user entries are preserved when rcode appends; never overwrites.
- `docs/install.md` grows a **"What gets committed vs ignored"** table with the rationale for each path.

### The committable split

- ✅ **Commit:** `.rihal/config.yaml` (project mode/language/profile), `.rihal/state.json` (decisions log + roadmap + blockers), `.planning/` (PRD, roadmap, sprints, SUMMARY files).
- ❌ **Ignore:** `.claude/`, `.rihal/{bin,workflows,references,commands,skills}/`, `rihal/brain/`, lock files, debug artifacts.

### Verified

3-scenario smoke test:
- Fresh project, no `.gitignore` → **created** with rcode block.
- Re-run install → detects sentinel, **already-present** (no duplicate append).
- Existing `.gitignore` with user entries (e.g. `node_modules/`) → **appended**; user entries preserved byte-for-byte.

### Deferred

Users already on v2.1.0 who accidentally committed `.claude/` etc. will need a one-off cleanup: `git rm -r --cached .claude .rihal/workflows .rihal/bin .rihal/references rihal/brain && git commit -m "chore: stop tracking rcode-managed files"`. A follow-up `rcode migrate` subcommand could automate this but it's not shipped here.

---

## v2.1.0 — First npm publish as @hanzlaa/rcode (2026-04-24)

**Shipping release.** Live on npm at [@hanzlaa/rcode](https://www.npmjs.com/package/@hanzlaa/rcode). Previously only installable by cloning the repo; now available as `npx @hanzlaa/rcode install` from any project anywhere.

Also bundles M2.5 (rebuilt `/progress` and `/status`, PR #166) + the orphan fixes (#135 story-level state sync, #136 verification matrix, #137 create-milestone compliance audit, PR #167 + #168).

### Added

- **npm package:** `@hanzlaa/rcode` scoped under the personal `hanzlaa` npm account (pending Rihal org approval for a future `@rihal/code` rename).
- **Binary aliases:** `rcode` (primary) + `rihal-code` (legacy alias — existing commands keep working).
- **`docs/install.md`** — dedicated install guide covering flavors (module subsets, IDE options, version pinning), yolo mode, troubleshooting, uninstall.
- **M2.5 CLI subcommands** (via PR #166):
  - `rihal-tools progress init` — single pre-computed snapshot for `/rihal-progress` rendering.
  - `rihal-tools progress bar --raw` — ASCII bar string only.
  - `rihal-tools progress insights` — drift / undercount / between-milestones detection.
  - `rihal-tools progress routes` — intent-tree for Route A/B/C Next Up menu.
  - `rihal-tools summary-extract` — surgical field extraction from SUMMARY.md (no whole-file load).
  - `rihal-tools state-snapshot` — compact state for display.
  - `rihal-tools state promote-backlog 999.x --to NN` — parking-lot promotion.
- **Story- and sprint-level state sync** (PR #167, issue #135): `state sync --from-disk` now parses `epics.md` for stories + walks `.rihal/phases/*/sprint-*.md` for sprint entries. Status preservation verified end-to-end.
- **`docs/verification/v2.0-gap-fixes.md`** (PR #168, issue #136): 9-row verification matrix confirming the v2.0 gap batch is intact.
- **`docs/parking-lot-convention.md`**: 999.x numbering documentation.

### Changed

- **Workflow shrinkage:** `rihal/workflows/progress.md` dropped from 573 to 184 lines (68% reduction) — CLI does the thinking, workflow renders.
- **`/rihal-status`** and **`/rihal-progress`** both call the same CLI subcommand — guaranteed consistency, closes the seam from issue #131.
- **README** install command updated to `npx @hanzlaa/rcode install`.

### Fixed

- Self-drift on the rihal-code repo itself — phases 04, 05 now have proper `number` fields in `.rihal/state.json`, drift-detection reports clean.

### Deferred to follow-ups (issues open in v3.0 milestone)

- Full skill-folder reorganization under role directories (#179).
- Real Rihal brain URLs (#162) — pending Rihal approval.
- CI Actions quota fix (#165) — pending billing action.

---

## v2.0.0 — Rihal Brain (2026-04-15)

**Repositioning release.** Rihal Code is no longer a generic AI-engineering methodology that happens to be written at Rihal. It is **the installable context-brain for Rihalians** — every Rihal project can now pull PR standards, commit conventions, architecture docs, and internal guides straight from Rihal's own repos into the AI assistant's context on install.

The v1 methodology, agents, and skills all remain. v2 adds the brain layer on top and reorganizes contribution around role-owners.

Tracked in GitHub [milestone #4](https://github.com/hanzlahabib/rihal-code/milestone/4).

### Added

- **`docs/what-is-rihal-code.md`** — product story for the v2 repositioning.
- **`docs/ROADMAP.md`** — public roadmap through v3.0 (MCP server) with binary kill criteria.
- **`rihal/brain/`** — new content tree with `sources.yaml` (placeholder URLs until M5) and pull destinations for `rihal-github/`, `rihal-docs/`, and `best-practices/`.
- **`rihal-tools brain pull`** — CLI subcommand that fetches configured sources via `git` sparse-checkout. Mirrors the `state sync --from-disk` pattern shipped in v1.0.0-beta.0 / issue #126.
- **Install hook** runs `brain pull` automatically (graceful no-op when sources are placeholders).
- **`.github/CODEOWNERS`** — per-role ownership enforcement so PM / CTO / UX / QA etc. changes route to the right reviewers.
- **`CONTRIBUTING.md` — per-role guide** — one paragraph, one command sequence, one PR per role.
- **`.github/workflows/release.yml`** — semver release pipeline: compliance check → bundle → GitHub release artefact.
- **`docs/adr/mcp-design.md`** — design doc stub for the v3.0 MCP server (tracks open questions, not yet implemented).

### Changed

- **README.md** — new top section leads with the brain-in-a-box framing. Tier structure and methodology docs unchanged beneath it.
- **`/rihal-update`** — now also runs `brain pull`, supports version pinning (`/rihal-update v1.3.0`).

### Documentation

- Public roadmap surfaces M2.5 (progress/status UX overhaul), M3 (role ownership), M4 (release pipeline), M5 (real Rihal content URLs), M6 (MCP).

### Deferred to follow-up releases

- **Full skill-folder reorganization under role owners** — CODEOWNERS ships in v2.0 covering the current folder layout; deeper reorg is a v2.1 scope.
- **Elegant /progress and /status rebuild** — tracked as issue #159, landing in v2.5.
- **Live MCP server** — v3.0 (design doc only in v2.0).

---

## v1.0.0-beta.0 (2026-04-15)

First beta release. v1 and v2 methodologies unified into a single landscape.

### Breaking

- **`rihal/v2/` directory removed.** All contents promoted to `rihal/` root. Any external scripts referencing `rihal/v2/...` paths must update to `rihal/...`.
- **`cli/install-v2.js` renamed to `cli/install.js`.** Old script path invalid.
- **`npx rihal-code install` is now the single entry point.** Routes through the unified installer (was previously routing to v1's `cli/init.js`).
- **Multi-IDE support reduced to Claude / Cursor / Gemini.** Dropped Windsurf, Antigravity, Codex direct install paths (AGENTS.md still applies).

### Added

- **Unified installer** — installs v2 agents/commands/workflows AND v1 phrase-activated skills in one command. 93 slash commands + 44 agents + 58 skills.
- **`/rihal-dashboard`** slash command — launches Diwan view-only dashboard from inside Claude Code.
- **`rihal-scaffold-project`** skill — bootstraps a new Rihalian project from `github.com/rihal-om/template`. Fresh clone, no cache, safety checks on non-empty dirs.
- **Tier-based docs** — `docs/TIERS.md`, `docs/STANDARDS.md`. Skills organized into Starter / Advanced / Ultra Advanced / Standards.
- **`npx rihal-code tiers`** CLI command — prints the tier map.
- **Golden Path** — 7-step Starter tier (scaffold → PRD → story → sprint → dev → review → status) for first-time users.
- **`.planning/PROJECT.md` + `ROADMAP.md` + `STATE.md`** — dogfooded tracking artifacts for rihal-code itself.

### Changed

- **Install output** now reports `Skills: N phrase-activated` in addition to files/commands/agents.
- **`README.md`** — "Start Here" tier navigation block at the top. Install section collapsed to one command.
- **CLI help** — commands grouped into PROJECT / TEAM / META (was flat list of 17).
- **Postinstall** — shows 7-step Golden Path instead of generic command list.
- **`rihal/team.yaml`** — v2 schema (agents + utility_agents + routing). v1 schema removed.

### Removed

- `rihal/agents/*.agent.md` — 14 v1 persona agents (superseded by v2's 36).
- `rihal/workflows/` (v1 — 13 files). Replaced by v2's 68 workflows.
- `rihal/v2/` directory entirely (contents promoted).
- All inspiration-source references from commit history (rewritten in 95 commits).

### Fixed

- `.rihal/state.json` was previously committed with the literal string `bad json`. Now gitignored and regenerated on install.
- `rihal/v2/` hardcoded paths in 3 test files, CLI, references, workflows — all updated.

### Internal

- Backup tag `backup/pre-v1v2-merge` kept locally (not pushed) for rollback.
- `pnpm test`: 95/95 passing after merge.
- Dashboard server boots cleanly (view-only, pure Node stdlib).

---

## v2-prototype (pre-merge, archived)

v2-prototype is the current active branch. Stable releases will be tagged on main.

### Added

#### Core Features
- **69 slash commands** across 3 modes (council, chain, discuss) and 3 modules (core, execution, discovery)
- **35+ agents** with clear roles, cultural identity (Arabic names), and hard scope boundaries
- **Numeric ID system** — milestones (M1, M2), phases (01, 02, 02.1), plans (01.01, 02.03), tasks (01.01.01)
  - Decimal phase insertion (02.1) for urgent mid-cycle work
  - Hierarchical IDs used throughout for cross-referencing
- **Multi-agent modes:**
  - `/rihal-council` — parallel debate (Round 1 + Round 2)
  - `/rihal-chain` — sequential pipeline with typed outputs per stage
  - `/rihal-discuss` — single expert, conversational tone

#### Planning & Execution
- `/rihal-plan` with **plan-verification loop** — rihal-plan-checker validates file/symbol references; loops back on failure
- `/rihal-chain` with preset pipelines: research-plan, feasibility, gtm-to-build, full-discovery
- `/rihal-execute` with **post-execute gates:**
  - rihal-integration-checker (cross-phase E2E verification)
  - rihal-nyquist-auditor (test coverage audit)
  - Both append findings to SUMMARY.md
- `/rihal-quick` — trivial task execution without ceremony
- `/rihal-autonomous` — run all remaining phases with token/phase budget

#### Intent Guards & Safety
- **Step 0.5** on every workflow — detects mismatched intent and redirects with copy-paste fix
- No more confusing output; wrong command → single-line redirect
- Examples: "That's a decision question, not a planning input. Copy-paste this instead: /rihal-council ..."

#### Multilingual Support
- **Multilingual classifier** — recognizes Roman Urdu, Arabic, English
- Auto-routes to Mariam for GCC/MENA questions
- Keywords: `dubai`, `affiliate`, `bnanai`, `karobar`, `site banana`, `دبئی`, `مارکیٹ`, `کاروبار`, and 20+ more
- Example: `/rihal-council yar affiliate site bnanai hai dubai ma` → picks [mariam, hussain-pm, sadiq]

#### Code Quality
- **Karpathy coding guidelines** enforcement — 4 principles wired into every code-writing agent:
  1. Think before coding (surface assumptions)
  2. Simplicity first (no speculative abstractions)
  3. Surgical changes (touch only what's needed)
  4. Goal-driven execution (define verifiable success criteria)
- `/rihal-karpathy-audit HEAD~5..HEAD` — audit recent changes vs. guidelines
- Karpathy-guidelines.md in references/ loaded by all executor/planner agents

#### State Management & Recovery
- `.rihal/state.json` — comprehensive project state tracking
  - Phases, executions, decisions, blockers
  - Council sessions and chain runs
  - Workstreams and milestones
- `/rihal-status` — formatted state viewer
- `/rihal-pause-work` → creates `.rihal/HANDOFF.json` + `.planning/.continue-here.md`
- `/rihal-resume-work` → re-surfaces blocking constraints + last context
- `/rihal-health --fix` → recovers from corrupted state

#### Observability & Debugging
- `/rihal-show <id>` — display artifact by numeric ID
- `/rihal-why <topic>` — explain why agent was picked (panel scoring breakdown)
- `/rihal-rerun <id>` — re-execute previous command/session
- `/rihal-diff <id1> <id2>` — compare phases/plans/artifacts
- `/rihal-report <phase>` — generate phase report (decisions, blockers, time)
- `/rihal-session-report` — comprehensive session summary

#### Hooks System (opt-in)
- `/rihal-enable-hooks` — installs 3 opt-in hooks into `.claude/settings.json`
- **pre-edit** — enforces read-before-edit
- **pre-workflow** — soft intent warnings on mismatched commands
- **post-commit** — validates commit format, blocks AI attribution

#### Multi-IDE Support
- Installer supports: Claude Code, Cursor, Gemini CLI
- `--ide=claude` (default), `--ide=cursor`, `--ide=gemini`
- Same commands across all IDEs

#### Phase Management
- `/rihal-insert-phase 02 "urgent fix"` — creates 02.1 between 02 and 03
- `/rihal-new-milestone` — start new milestone cycle
- `/rihal-complete-milestone` — mark milestone complete + generate summary
- `/rihal-audit-milestone` — verify milestone completeness

#### Workspace Isolation
- `/rihal-new-workspace "experimental-auth"` — create isolated parallel track
- `/rihal-list-workspaces` — list all workspaces and active one
- `/rihal-remove-workspace` — delete a workspace
- Useful for A/B testing, parallel R&D, feature branches

#### Miscellaneous Commands
- `/rihal-diff` — compare phases/plans/artifacts
- `/rihal-config` — view/edit config directly
- `/rihal-init` — initialize project with Arabic greeting + setup
- `/rihal-do` — interactive router (guides you to next action)
- `/rihal-health` — diagnose state/artifacts/locks
- `/rihal-forensics` — post-mortem analysis
- `/rihal-next` — advance to next phase
- `/rihal-correct-course` — recover from failed phase
- `/rihal-undo` — safely revert last phase
- `/rihal-note` — zero-friction idea capture
- `/rihal-add-todo` — add task to backlog
- `/rihal-inbox` — review + process captured notes/todos

#### Documentation & References
- 35+ reference documents in `rihal/references/`
- council-protocol.md — 5-step majlis + deterministic panel scoring
- karpathy-guidelines.md — 4 coding principles + validation framework
- state-schema.md — complete state.json documentation
- execution-protocol.md — task execution contract
- gate-prompts.md — post-execute gate implementations
- verification-patterns.md — quality verification patterns
- And 25+ more (checklists, domain probes, response styles, etc.)

#### Global Agent Customization
- `~/.rihal/agents/rihal-<name>.md` — define custom agents globally
- Agents appear in every project without forking
- Supported in v2.1+ roadmap

#### Token & Cost Tracking
- Token cost footer on heavy workflows
- `/rihal-stats` — displays token usage by model
- Model profiles: quality, balanced, budget, inherit

#### Configuration
- `.rihal/config.yaml` with 10+ settings:
  - user_name, project_name, communication_language
  - mode (guided/yolo), model_profile
  - workflow toggles (plan_checker, post_execute_gates)
  - git branching_strategy
- `/rihal-settings` — interactive configuration editor

#### Testing & Validation
- 95+ compliance tests verify:
  - Every command has matching workflow file
  - Every agent has valid frontmatter + constraints
  - Module manifests match installed files
  - CLI help matches implemented subcommands
  - Panel scorer routes correctly (10+ question types)
  - Classifier handles Roman Urdu, Arabic, English + edge cases
- `node --test test/*.cjs test/lib/*.cjs` to run full suite

---

### Fixed

#### Plan Verification
- Plan-checker now verifies file existence and symbol definitions before execution
- References that don't exist trigger feedback loop (max 2 retries)
- Pre-execute gate prevents running broken plans

#### State Integrity
- Stale lock files no longer block all state writes
- State initialization recovers from corrupted state.json
- Orphaned execution records cleaned up on health check

#### Agent Consistency
- Council/chain agent lists derived from installed_agents.yaml (not hardcoded)
- Panel falls back to 3-agent minimum if fewer agents score non-zero
- Deterministic scoring ensures reproducibility

#### Workflow Issues
- All 69 commands now have consistent Step 0 (success criteria) + Step 0.5 (intent guard) + On Error
- Workflows load shared references correctly (@included in every workflow)
- Cross-project file leaks fixed via CLI subcommand isolation

#### Bug Fixes
- 13 missing subagent files created (rihal-executor, rihal-planner, rihal-verifier, etc.)
- 25 orphaned commands wired into module YAMLs
- Pre-workflow intent gates now respect multiline input
- `/rihal-init` no longer drops global saves in TTY
- Backspace in TTY-based prompts preserves prompt text
- Multi-IDE installer no longer conflicts with existing .claude/ structure
- Workstream flag conflicts resolved
- Git planning commit format validated post-commit
- ~80+ other bug fixes from stress testing + E2E audit

---

### Removed

#### Deprecated
- `/rihal-generate-project-context` (replaced by `/rihal-init`)
- Hardcoded agent lists (now derived from installed_agents.yaml)
- Old cross-system path references and branding leaks

#### Safety Improvements
- Unauthorized git operations blocked (no auto-push)
- Worktree isolation removed (safety concern)

---

### Changed

#### API/Behavior
- Panel scorer now deterministic (deterministic keyword matching, not LLM)
- Council Round 2 now includes agent names in responses (better cross-talk)
- Plan-checker loops back instead of failing hard (user-friendly recovery)
- Post-execute gates append to SUMMARY.md instead of separate files (consolidated output)
- Intent guards provide copy-paste redirects (not just warnings)

#### Architecture
- Agent rules split into slim index + lazy-loaded files (77% token reduction)
- Module system refactored to 3 explicit modules (core, execution, discovery)
- Workflows now consistently use `@` references to shared contracts
- Numeric ID system adopted across all workflows and state

#### Documentation
- README rewritten for v2-prototype (64 → 69 commands, 22 → 35+ agents)
- Added "What's new" section highlighting recent additions
- Filesystem layout documented (.rihal/ vs .planning/)
- Three modes deep-dive: Council vs. Chain vs. Discuss

---

### Known Issues

#### Limitations
- Global agents (`~/.rihal/agents/`) not yet supported (roadmap for v2.1)
- Mariam and Hussain-PM not installed as first-class council agents (workaround: copy and customize)
- Worktree isolation removed (auto-branch isolation available instead)
- Token budgeting on `/rihal-autonomous` is advisory (soft limit, not hard)

#### Experimental
- Decimal phase insertion (02.1) is new; test coverage in progress
- Multilingual classifier covers ~30 keywords; expansion ongoing

---

## v1.0.0 (Historical Reference)

Earlier versions tracked on main branch. See GitHub Releases for details.

---

## Roadmap (planned)

### v2.1
- Global agents fully supported (`~/.rihal/agents/`)
- Mariam and Hussain-PM as first-class council agents
- Extended multilingual classifier (50+ keywords)
- Integration with external knowledge bases

### v2.2
- Dashboard improvements (realtime state viewer)
- Workspace branch tracking (git integration)
- Agent performance metrics

### v3.0 (future)
- Integration with external planning tools (Jira, Linear, etc.)
- Real-time collaboration features
- Custom workflow builders (no-code)

---

## Statistics (v2-prototype)

| Metric | Count |
|--------|-------|
| Commands | 69 |
| Agents | 35+ |
| References | 35+ |
| Test files | 10 |
| Tests | 95+ |
| Module files | 238 total |
| Max file size limit | 1000 lines |

---

## Feedback

Found a bug? Have a suggestion? Open an issue on GitHub:
[github.com/hanzlahabib/rihal-code/issues](https://github.com/hanzlahabib/rihal-code/issues)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

This project follows Conventional Commits. Agent definitions must pass the 5-component compliance check:
1. YAML trigger header (5-12 triggers + negative boundaries)
2. Overview paragraph
3. Workflow/instructions
4. Output Format section
5. Examples (happy + edge + negative cases)

---

Last updated: 2026-04-12
