# Install / Uninstall / Update Flow — Audit Cleanup

**Branch:** `fix/install-flow-audit-batch` (from `main` @ `6154f39`)
**Started:** 2026-05-07
**Source:** 3 lens audits (security+observability+cross-platform / error-recovery+state-machine+dep-health / coverage+extensibility+naming) on `cli/install.js`, `cli/uninstall.js`, `cli/postinstall.js`, `cli/index.js`, `cli/lib/manifest.cjs`. Plus user-reported `/rihal-*` picker duplication (#679).

**Goal:** ship safety + correctness fixes commit-by-commit. One issue → one commit → update this file → repeat.

---

## Scope summary

- **Critical findings:** ~30 across 3 lenses
- **Warn findings:** ~50
- **Info findings:** ~30+
- **Test gap:** entire `cli/uninstall.js`, `cli/postinstall.js`, `cli/update.js` untested. Idempotency, version-upgrade, multi-IDE all untested.

This MD only tracks items we're acting on this session. Everything else is filed as a GH issue and listed in `Backlog` below.

---

## Wave 1 — User-blocking + immediate-impact (this session)

| # | Issue | Commit | Status |
|---|-------|--------|--------|
| W1.1 | [#679](https://github.com/hanzlahabib/rihal-code/issues/679) skills/ dedup missing — picker shows everything twice | `cli/install.js`, `cli/generate-command-skills.cjs` | ✅ done — verified 0 overlap |
| W1.2 | [#680](https://github.com/hanzlahabib/rihal-code/issues/680) `--reset` alone silently does nothing | `cli/install.js` | ✅ done — fail-fast at install() entry, exit 2 |
| W1.3 | [#681](https://github.com/hanzlahabib/rihal-code/issues/681) `_seeded_stub` never cleared | `rihal/bin/rihal-tools.cjs` | ✅ done — auto-clear in writeState + explicit `state clear-stub` |
| W1.4 | [#682](https://github.com/hanzlahabib/rihal-code/issues/682) Package-name drift in CLI JSDocs | `cli/index.js`, `cli/set-profile.js`, `cli/show-model.js` | ✅ done — 16 stale refs replaced; `nuke.js` left alone (legacy migration) |

**Wave 1 complete.** Commits on branch: 4 (skills dedup, --reset fast-fail, _seeded_stub clear, package-name normalization). Issues filed: #679, #680, #681, #682.

## Wave 2 — Safety fixes (may not finish this session)

| # | Finding | File:line | Severity |
|---|---------|-----------|----------|
| W2.1 | [#683](https://github.com/hanzlahabib/rihal-code/issues/683) `--purge` backup never includes `.rihal/`, deleted with rmSync | `uninstall.js` | ✅ done — backup includes .rihal/+.planning/ when purging, written to .rihal-backups/ sibling so rmSync can't kill it |
| W2.2 | [#684](https://github.com/hanzlahabib/rihal-code/issues/684) `# rcode` regex over-matches user .gitignore content | `uninstall.js` | ✅ done — regex now requires both sentinels; user `# rcode...` comments preserved |
| W2.3 | `fs.rmSync` recursive without symlink guard (3 sites) | `install.js:1815`, `uninstall.js:513,633` | critical |
| W2.4 | `execFileSync` of target's `.rihal/bin/rihal-tools.cjs` without integrity check | `install.js:1962` | critical |
| W2.5 | Atomic-writes helper exists but unused for `.gitignore`, `state.json`, `config.yaml`, hooks | `install.js:706,732,…` | warn |
| W2.6 | No file lock — concurrent installs corrupt manifest | `install.js` (whole) | critical |
| W2.7 | `commit_planning` two-source-of-truth drift between `.gitignore` and `config.yaml` on re-install | `install.js:1862,1346,1948` | critical |
| W2.8 | Health-check thresholds hardcoded `<20` instead of using package manifest | `install.js:2182-2192` | warn |

## Wave 3 — Test coverage (separate phase)

`cli/uninstall.js`, `cli/postinstall.js`, `cli/update.js`, idempotency, multi-IDE, version upgrade, `--reset --force`, conflict resolution interactive flow, brain pull failure, network down, disk full — all untested. Defer to a follow-up phase with sufficient context budget.

## Wave 4 — Naming + extensibility (separate phase)

- `opts.ide` vs `opts.ides` field-shape drift + double-prompt
- IDE list duplicated in 10+ places (no registry)
- `gemini` in installer but not uninstaller; `windsurf` in uninstaller but not installer
- `KNOWN_ACTION_SKILLS` hardcoded list in `uninstall.js:220-244` drifts from source
- Various function names that lie about scope (`installSkills`, `installBrainScaffold`)

---

## Backlog (filed but not in this session's commits)

Will be linked here as filed:

- (to be added after batch ticket creation)

---

## Decisions log

- 2026-05-07: Workaround applied to local repo — removed 119 duplicate project-side rihal skills via `rm -rf ./.claude/skills/rihal-*` for skills present in `~/.claude/skills/`. User's picker now de-duplicated; `Window → Reload` required.
- 2026-05-07: No `dev` branch in repo; canonical work on `main`. Created `fix/install-flow-audit-batch` from `main @ 6154f39`.
- 2026-05-07: Wave 3 (tests) deferred — too large for one session given audit fix scope. Will be a separate phase after Wave 1+2 ship.

---

## Process rules

1. One commit = one issue = one row update here.
2. Each commit references the issue number in the message.
3. No push without explicit approval.
4. No npm publish until Wave 1 (at minimum) is complete and on main.
5. Test failures pre-existing on main are not regressions — note but don't block.
