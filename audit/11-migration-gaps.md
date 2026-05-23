# Migration Gap Audit — rihal-code → rcode

## Summary
- Total `rihal` hits (post-filter, excl. node_modules/.git/archive): 3,627 raw lines
- INTENTIONAL (preserved by design): ~3,380 — agent persona names, /rihal-* slash commands, repo URL, company attribution, skill dirs
- GAPS (need fix): ~247 lines across ~40 files
- Files with actionable gaps: 31

---

## Categorization

### A. Intentional namespace (preserved — do not change)

| Category | Count |
|---|---|
| `rihal-*` agent persona dirs in `.rcode/skills/` and `.cursor/rules/rihal/agents/` | ~50 dirs |
| `/rihal-*` slash command names in workflow prose | ~200 refs |
| `Rihal` / `rihal.om` as company/brand attribution | ~30 refs |
| `github.com/hanzlahabib/rihal-code` repo URL | ~25 refs in dist/docs |
| `@hanzlahabib/rihal-code` legacy npm package name (nuke.js backward compat) | ~5 refs |
| `.planning/archive/` historical artifacts | excluded |
| `CHANGELOG.md` / `ATTRIBUTION.md` history | excluded |
| `rihal_source_path` config key in `.rcode/config.yaml` | 1 — intentional schema field |

---

### B. GAPS — must fix before public launch

#### B1. Source code symbol gaps (high priority)

| File | Line | Symbol / Issue | Suggested fix |
|---|---|---|---|
| `cli/nuke.js` | 90 | Function `findRihalPackages()` — internal function name, not user-visible | Rename to `findRcodePackages()` |
| `cli/nuke.js` | 154 | Function `findRihalBins()` — internal function name | Rename to `findRcodeBins()` |
| `cli/uninstall.js` | 444 | Function `stripRihalFromAgentsMd()` — internal function name | Rename to `stripRcodeFromAgentsMd()` |
| `dist/rcode.js` | 18252, 18655, 18703 | Bundled copies of above three functions (auto-generated from cli/ sources) | Will auto-fix when cli/ sources are fixed and rebuilt |
| `.rcode/skills/rihal-init/scripts/rihal_init.py` | entire file | Python script named `rihal_init.py`, docstring uses `python rihal_init.py`, references `_rihal/` config dir | Rename to `rcode_init.py`; update `_rihal/` → `_rcode/`; but see B6 note |
| `.rcode/skills/rihal-init/scripts/tests/test_rihal_init.py` | 7, 19 | Imports from `rihal_init` module; module docstring | Rename to `test_rcode_init.py`, update import |
| `rcode/skills/core/rcode-init/scripts/tests/test_rcode_init.py` | 163, 167, 173, 181 | Test data contains `"Rihal Core Module"` and `"Rihal"` as module name values | Replace with `"rcode Core Module"` / `"rcode"` |

#### B2. User-facing string gaps (high priority)

| File | Line | Current text | Suggested fix |
|---|---|---|---|
| `cli/tiers.js` | 15 | `First-time Rihalian. Scaffold → ship, end-to-end.` | `First-time rcode user. Scaffold → ship, end-to-end.` |
| `rcode/skills/actions/4-implementation/rcode-scaffold-project/SKILL.md` | 5, 33 | `Rihalians`, `Rihalian project` | `rcode users`, `rcode project` |
| `rcode/brain/README.md` | 3, 25 | `Rihalian's project`, `every Rihalian benefits` | `rcode user's project`, `every rcode user` |
| `rcode/brain/sources.yaml` | 5, 29 | `every Rihalian's project`, `Rihalian's AI` | `every rcode user's project`, `rcode user's AI` |
| `.rcode/RIHLA.md` | 6, 12, 14, 20 | `Project: rihal-code`, `v3.5.0`, lists `.rihal/` in top-level dirs, `@hanzlaa/rcode v3.5.x` | Regenerate via `/rihal-init`; or update to `rcode`, `v4.0.0`, `.rcode/` |

#### B3. Workflow / agent-rules path gaps (critical — broken at runtime)

These files tell agents to call `.rihal/bin/rihal-tools.cjs` — a path that no longer exists (renamed to `.rcode/bin/rcode-tools.cjs`). Agents executing these instructions will get `MODULE_NOT_FOUND` errors.

**Files with `.rihal/bin/rihal-tools.cjs` refs (should be `.rcode/bin/rcode-tools.cjs`):**

| File | Occurrences |
|---|---|
| `.rcode/agents-rules/executor/execution-flow.md` | 5 |
| `.rcode/agents-rules/executor/task-commit-protocol.md` | 2 |
| `.rcode/agents-rules/executor/summary-creation.md` | 5 |
| `.rcode/agents-rules/verifier/key-links.md` | 1 |
| `.rcode/agents-rules/verifier/context-loading.md` | 2 |
| `.rcode/agents-rules/verifier/anti-patterns.md` | 2 |
| `.rcode/agents-rules/verifier/artifact-verification.md` | 1 |
| `.rcode/agents-rules/sprint-checker/process.md` | 5 |
| `.rcode/agents-rules/sprint-checker/dimensions.md` | 1 (`require('.rihal/bin/lib/code-references.cjs')`) |
| `.rcode/agents-rules/phase-researcher/detailed-guide.md` | 3 |
| `.rcode/agents-rules/project-researcher/detailed-guide.md` | 1 |

**Total: 34 occurrences across 11 files.** These are the most critical runtime-breaking gaps.

**Files with `.rihal/debug/`, `.rihal/research/`, `.rihal/codebase/` path refs (wrong dir name):**

| File | Stale path referenced |
|---|---|
| `.rcode/agents-rules/debugger/debug-session-state.md` | `.rihal/debug/session.json`, `.rihal/debug/investigation.md`, `.rihal/debug/archives/` |
| `.rcode/agents-rules/debugger/checkpoint-recovery.md` | `.rihal/debug/session.json`, `.rihal/debug/investigation.md`, `.rihal/debug/backlog.md` |
| `.rcode/agents-rules/debugger/investigation-protocol.md` | `.rihal/debug/investigation.md` |
| `.rcode/agents-rules/project-researcher/detailed-guide.md` | `.rihal/research/` (5 output files) |
| `.rcode/agents-rules/codebase-mapper/detailed-guide.md` | `.rihal/codebase/` |
| `.rcode/agents-rules/roadmapper/detailed-guide.md` | `.rihal/ROADMAP.md`, `.rihal/STATE.md`, `.rihal/REQUIREMENTS.md`, `.rihal/templates/` |
| `.rcode/agents-rules/verifier/requirements-coverage.md` | `.rihal/REQUIREMENTS.md` |
| `.rcode/agents-rules/verifier/verification-report.md` | `.rihal/phases/` |

**Total: 8 more files.** Agents writing to these paths will produce artifacts that the rest of the toolchain won't find.

#### B4. Workflow file gaps (user-facing banners and example paths)

| File | Line | Issue |
|---|---|---|
| `.rcode/workflows/update.md` | 80–81 | Fallback path `$(npm root -g)/rihal-code/rihal/` and `./rihal/` — stale pkg name + dir name |
| `.rcode/workflows/update.md` | 97 | Banner: `✓ rihal-code is up to date` → should be `✓ rcode is up to date` |
| `.rcode/workflows/update.md` | 106 | Banner: `📦 rihal-code Update Available` → `📦 rcode Update Available` |
| `.rcode/workflows/update.md` | 109–118 | Example changeset paths use `rihal/commands/`, `rihal/workflows/`, `rihal/modules/`, `rihal/references/` → should be `rcode/commands/` etc. |
| `.rcode/workflows/update.md` | 189 | Example user-modified file path: `rihal/workflows/sprint-planning.md` |
| `.rcode/workflows/update.md` | 201 | Calls `node .rcode/bin/rihal-tools.cjs brain pull` — wrong bin name |
| `.rcode/workflows/update.md` | 216 | Banner: `✓ rihal-code updated successfully` → `✓ rcode updated successfully` |
| `.rcode/workflows/execute-verify-phase-goal.md` | 9, 93 | Calls `.rcode/bin/rihal-tools.cjs` — wrong bin name (should be `rcode-tools.cjs`) |
| `.rcode/workflows/execute-waves.md` | 313, 340, 384 | Calls `.rcode/bin/rihal-tools.cjs` — wrong bin name |
| `.rcode/workflows/docs-update.md` | 1 | Title `# Workflow: rihal-docs-update` — stale heading |
| `.rcode/workflows/workstream.md` | 1, 4 | Title + description reference `Rihal` as tool name |
| `.rcode/workflows/init.md` | 162 | `find` excludes `.rihal*` — harmless now but mirrors old dir name |
| `.rcode/workflows/init.md` | 349 | Error msg: `rihal-tools.cjs not found` — stale bin name in user-visible error |

#### B5. Config / data gaps

| File | Line | Issue |
|---|---|---|
| `.rcode/RIHLA.md` | 6, 12, 14, 20 | Auto-generated snapshot listing project as `rihal-code`, version `v3.5.0`, dirs `rihal/` and `.rihal/` — stale; should be regenerated |
| `.rcode/state.json` | 77, 105, 115, 128, 151 | Historical phase goal strings reference `rihal/agents/`, `rihal/references/` dirs — these are frozen goals in completed plans; low risk but misleading |
| `.rcode/state.json` | 345 | Goal string: `RIHAL_PUSH_OK` in bash-guard hardening — this is an env var name in the actual feature, not a stale ref; leave as-is |
| `.claude/settings.local.json` | 4–6 | Allowlisted `Bash(cp ~/.claude/get-shit-done/workflows/...)`, `sed` rewriting `gsd-tools.cjs → rihal-tools.cjs` and `.rihal` paths — these are debug/dev allowlist entries from pre-v4; safe to prune but not user-blocking |
| `.claude/settings.local.json` | 20–21 | Allowlist: `mkdir -p .claude/commands/rihal` and file copy — stale dev scaffolding entries |
| `.claude/settings.local.json` | 29 | `mkdir -p /tmp/rcode-test-multi3/.rihal/_config` — test fixture uses old `.rihal/` dir |

#### B6. Filename gaps (require renames)

| Path | Issue | Suggested action |
|---|---|---|
| `.rcode/skills/rihal-init/scripts/rihal_init.py` | Python module named for old brand; imported as `rihal_init` | Rename to `rcode_init.py`; update SKILL.md invoke command |
| `.rcode/skills/rihal-init/scripts/tests/test_rihal_init.py` | Imports `from rihal_init import` | Rename to `test_rcode_init.py`; update import |

Note: The `.rcode/skills/rihal-init/` skill directory name itself is intentional namespace (rihal-* skill names are preserved per `feedback-rihal-hyphen-namespace`). Only the internal Python script filenames are gaps.

#### B7. Comment / doc gaps in source

| File | Line | Issue |
|---|---|---|
| `cli/nuke.js` | 5 | Comment refers to "legacy @hanzlahabib/rihal-code" — intentional backward-compat note, keep |
| `cli/nuke.js` | 88 | Comment `Looks for both @hanzlaa/rcode (current) and @hanzlahabib/rihal-code (legacy)` — intentional, keep |
| `cli/uninstall.js` | 444 | Function comment implicit in name `stripRihalFromAgentsMd` — should be `stripRcodeFromAgentsMd` |
| `.rcode/agents-rules/verifier/verification-report.md` | 97 | `_Verifier: the agent (rihal-verifier)_` — intentional agent name, keep |

---

## Stale references that point at non-existent paths (broken at runtime)

1. `.rcode/agents-rules/executor/execution-flow.md:8` — `node ".rihal/bin/rihal-tools.cjs"` — path doesn't exist; real path is `.rcode/bin/rcode-tools.cjs`
2. `.rcode/agents-rules/sprint-checker/process.md:6` — same
3. `.rcode/agents-rules/sprint-checker/dimensions.md:377` — `require('.rihal/bin/lib/code-references.cjs')` — dir and bin both renamed
4. `.rcode/agents-rules/debugger/debug-session-state.md:9,67,197` — `.rihal/debug/` dir — agents will write here but no toolchain reads it
5. `.rcode/agents-rules/roadmapper/detailed-guide.md:456–460` — `.rihal/ROADMAP.md`, `.rihal/STATE.md` — wrong dir prefix for top-level planning files
6. `.rcode/agents-rules/project-researcher/detailed-guide.md:131` — `.rihal/research/` — output dir doesn't match actual install
7. `.rcode/workflows/update.md:201` — `node .rcode/bin/rihal-tools.cjs` — bin renamed to `rcode-tools.cjs`
8. `.rcode/workflows/execute-verify-phase-goal.md:9` — `node ".rcode/bin/rihal-tools.cjs"` — same
9. `.rcode/workflows/init.md:162` — `find` exclude `.rihal*` — the `.rihal/` dir no longer exists; exclude is harmless but confusing

---

## Verdict

**MIGRATION HAS GAPS REMAINING**

- Estimated fix effort: **MEDIUM** (2–4 hours, mostly sed-based bulk replace)
- Critical-path issues (would break users / agents at runtime): **34** — the `.rihal/bin/rihal-tools.cjs` references across 11 agent-rules files; every agent invocation of executor, verifier, sprint-checker, or phase-researcher will fail with `MODULE_NOT_FOUND`
- User-facing brand string issues: **~20** — banners in update.md say "rihal-code"; tiers.js says "Rihalian"; SKILL.md files say "Rihalians"
- Internal symbol renames (not user-visible): **3** — `findRihalPackages`, `findRihalBins`, `stripRihalFromAgentsMd` in cli/nuke.js and cli/uninstall.js
- Cosmetic / frozen-data issues: **~10** — state.json historical goal strings, RIHLA.md snapshot

---

## Next steps (prioritized)

1. **Critical — fix agent-rules bin path (34 refs across 11 files):**
   ```bash
   find .rcode/agents-rules .rcode/workflows -name "*.md" \
     -exec sed -i 's|\.rihal/bin/rihal-tools\.cjs|.rcode/bin/rcode-tools.cjs|g' {} +
   ```

2. **Critical — fix `.rihal/` dir refs in agent-rules docs (8 files):**
   ```bash
   find .rcode/agents-rules -name "*.md" \
     -exec sed -i 's|\.rihal/debug/|.rcode/debug/|g; s|\.rihal/research/|.rcode/research/|g; s|\.rihal/codebase/|.rcode/codebase/|g; s|\.rihal/ROADMAP\.md|.rcode/ROADMAP.md|g; s|\.rihal/STATE\.md|.rcode/STATE.md|g; s|\.rihal/REQUIREMENTS\.md|.rcode/REQUIREMENTS.md|g; s|\.rihal/phases/|.rcode/phases/|g; s|\.rihal/templates/|.rcode/templates/|g' {} +
   ```

3. **High — fix update.md user-facing banners** (rihal-code → rcode, rihal/ → rcode/ in example paths).

4. **High — fix tiers.js "Rihalian" string** → `rcode user`.

5. **High — rename** `.rcode/skills/rihal-init/scripts/rihal_init.py` → `rcode_init.py` and update the test file import.

6. **Medium — fix SKILL.md files** referencing "Rihalians" in rcode-scaffold-project and brain/README.md.

7. **Medium — rename CLI internal functions**: `findRihalPackages` → `findRcodePackages`, `findRihalBins` → `findRcodeBins`, `stripRihalFromAgentsMd` → `stripRcodeFromAgentsMd` in `cli/nuke.js` and `cli/uninstall.js`, then rebuild dist.

8. **Low — regenerate `.rcode/RIHLA.md`** via `/rihal-init --reset` after other fixes land.

9. **Low — prune `.claude/settings.local.json`** stale dev allowlist entries (lines 4–6, 20–21, 29).
