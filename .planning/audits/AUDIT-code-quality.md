# Code Quality Audit — rihal-code (`rcode/`, `server/`, `cli/`, `test/`)

**Date:** 2026-09-02
**Scope:** `rcode/bin/**/*.cjs`, `server/**/*.js` (excl. `server/lib/html/client/vendor/*` — vendored preact/htm), `cli/**/*.js|*.cjs`, `test/**/*.cjs`
**Method:** Read-only diagnosis by two parallel specialist audits (silent-failure/observability lens + dead-code/duplication/size/inconsistency lens), cross-verified against actual call sites before being reported. No code was modified.
**Files audited:** 18 in `rcode/bin`, 60 in `server` (excl. vendor), 34 in `cli`, 91 in `test` — 203 total.

---

## Summary

| Severity | Count |
|---|---|
| P0 | 5 |
| P1 | 12 |
| P2 | 6 |

**Top risk:** two structurally identical bugs — `rcode/bin/rcode-tools.cjs:4451` and `server/orchestrator.js:300-311` — both reset a state object to `{}` on a JSON parse failure and then write a partial update back, silently wiping every other tracked entry. This "reset-then-writeback" shape is worth a dedicated grep sweep beyond what this audit covered; it's an easy pattern to reintroduce elsewhere.

**Second risk:** `cmdState()` in `rcode-tools.cjs` is a single 2858-line function handling ~50 unrelated subcommands. This is a bigger structural hazard than the file's raw line count — splitting the file into modules won't fix anything until this function itself is decomposed.

---

## P0 — Fix before anything else touches these paths

### 1. `rcode/bin/rcode-tools.cjs:4451` — corrupt state.json silently wipes all phases
`phase scaffold-milestone` sets `let state = { phases: [] }`, then `try { state = JSON.parse(readFileSync(statePath)) } catch {}` swallows a corrupt/invalid `state.json`. `state` silently stays `{ phases: [] }`, and the function writes it back to `statePath` at line 4529 — permanently deleting every previously-tracked phase entry. Sibling handlers at lines 4162, 4250, and 3945 correctly `throw new Error('Invalid JSON in state.json: ...')` on the same parse; this is the one handler that breaks that convention.
**Fix:** match the established pattern — `catch (e) { throw new Error(\`Invalid JSON in state.json: ${e.message}\`) }` instead of swallowing.

### 2. `server/orchestrator.js:300-311` — corrupt board-overrides.json wipes all task overrides
`setTaskOverride()` (writes `.rcode/board-overrides.json`) does `let overrides = {}` then `try { overrides = JSON.parse(readFileSync(overridesPath)) } catch { overrides = {} }`. A single corrupted read (torn write from a crash, disk hiccup) silently resets `overrides` to `{}`; only `overrides[storyId]` is then set and the whole object is written back at line 310, wiping every other task's stored status override in one shot.
**Fix:** on parse failure, back up the corrupt file and start fresh with a logged warning, or refuse the write and surface an error instead of silently discarding sibling entries.

### 3. `cli/install.js:2637-2733` — `--non-destructive` silently overwrites user-modified files on manifest corruption
`files-manifest.csv` (prior-install file hashes) is read inside a `try { ... } catch { /* best-effort */ }`, leaving `priorManifest` an empty Map on any parse error. Traced consequence: `priorManifest.get(relForward)` returns `undefined` → the "preserve user-modified file" branch (2679-2698) is skipped → falls through to the `if (!opts.yes && !opts.nonDestructive)` guard at 2702, which is `false` because `opts.nonDestructive` is `true` → conflict-buffering/prompt path is also skipped → unconditional `fs.writeFileSync(destPath, ...)` at line 2731. A malformed manifest defeats `--non-destructive`'s entire purpose with zero warning.
**Fix:** on manifest parse failure, abort non-destructive mode with an explicit error, or fall back to the interactive-conflict path — never to unconditional overwrite.

### 4. `rcode/bin/rcode-tools.cjs:1031-3889` — `cmdState()` is a 2858-line function covering ~50 unrelated subcommands
Implements state read/init/set/snapshot, sprint/story CRUD, workstream lifecycle, ID resolution, schema migration, decisions/blockers, and git sync as one flat if/else-if chain on `sub`. This is the dominant structural risk in the file — bigger than its raw 7772-line total, since splitting the file alone won't address it.
**Fix:** extract each subcommand family into its own function/file (state-core, sprint+story, workstream, id-resolution+schema-migration, decisions+blockers, sync-from-git) and dispatch from a lookup table.

### 5. `cli/install.js:2436-3448` — `installInner()` is a ~1012-line single async function
Covers interactive prompts, IDE validation, plan building, dry-run, backup, orphan sweep, manifest diffing, file copy + conflict resolution, global-vs-project dedup, manifest generation, config.yaml/state.json writing, planning scaffolding, skill installation, and health check — in one function, longer than the project's own 1000-line file limit. Inline comments (e.g. ~line 2657 "#667 — placeholder...") show even the original author was tracking cross-cutting state by comment rather than structure.
**Fix:** extract `resolveInstallOptions()`, `buildValidatedPlan()`, `copyFilesWithConflictResolution()`, `writeManifestsAndConfig()`, `seedProjectScaffolding()` — the existing `// ──` section comments already mark the seams.

---

## P1

### File-size violations (over CLAUDE.md's 1000-line limit)

| File | Lines | Split seam |
|---|---|---|
| `rcode/bin/rcode-tools.cjs` | 7772 | Beyond `cmdState` (P0 #4), `cmdPhase` (3889-4702, 813 lines) is a second oversized handler with the same subcommand-dispatch shape. Target module split: state.cjs, phase.cjs, plan.cjs, panel/agents.cjs, config.cjs, roadmap.cjs, driven by the existing `case` dispatch around line 7130. |
| `cli/install.js` | 3710 | Beyond `installInner` (P0 #5), split by function seam: install-plan.js, install-copy.js, install-manifest.js, install-scaffold.js; reduce install.js to arg parsing + orchestration. |
| `rcode/bin/rcode-hooks.cjs` | 1352 | No single mega-function, but `promptRouter()` (908-1091, 183 lines) and `driftCommand()` (217-607, ~390 lines) are the largest — natural split into prompt-router.cjs and drift.cjs imported by a thin entrypoint. |
| `cli/uninstall.js` | 1060 | Not independently traced to one dominant function; split by phase (editor-file removal, `.rcode/` removal, `.planning/` removal, gitignore-block removal) matches its existing `parseArgs` opts shape (`editor`, `keepState`, `deleteState`, `purge`). |

**Not a violation:** `server/lib/html/css.js` (5607 lines) carries an explicit exemption at line 1 (`/* CLAUDE.md exemption: pure CSS data file, no logic — 1000-line limit does not apply */`) — deliberate, documented opt-out. Do not re-flag.

### Silent failures / weak error handling

6. **`rcode/bin/rcode-tools.cjs:4390`** — `phase scaffold` has the same corrupt-JSON swallow as P0 #1, but read-only (only computes `maxNum` for phase numbering). Can't corrupt state.json, but a corrupted file silently causes phase-number collisions instead of surfacing. **Fix:** same pattern as #1, or at minimum log a warning.

7. **`rcode/bin/rcode-tools.cjs:5529`** — spot-check evidence validator: `rg --count-matches ... 2>/dev/null | awk -F: '{s+=$2} END {print s+0}'`. If `rg` isn't installed, stderr is suppressed but the pipe to `awk` still succeeds and prints `0` — `execSync` never throws, so the surrounding `catch (_) { /* rg/grep not available shouldn't fail validation */ }` never fires. `actualCount = 0` is treated as a real result; if `claimedCount > 0` the drift check at line 5533 computes 100% drift and raises a spurious `spot-check-mismatch` BLOCKER against a valid task. **Fix:** check `rg` availability before building the pipeline, or validate stdout shape before trusting `0`.

8. **`rcode/bin/lib/code-references.cjs:156-166`** — `grep -r "\b${symbol}\b" ... 2>/dev/null | head -1` wrapped in try/catch conflates "grep binary missing", "permission error", and "no matches" into `missingSymbols.add(symbol)`. A missing `grep` on the host silently marks every referenced symbol as not-found instead of surfacing an environment problem. Also noted (adjacent, outside stated scope but worth flagging): `symbol` is interpolated unescaped into the shell command string — a potential injection vector if `symbol` ever derives from parsed file/task content. **Fix:** distinguish grep-exit-1 (no match) from grep-threw/ENOENT before deciding missing-vs-environment-error; separately, shell-escape or avoid string interpolation for `symbol`.

9. **`server/orchestrator.js:785-829`** — the main HTTP listener has no try/catch wrapper, unlike `server/dashboard.js` (see its explicit comment at 75-86 documenting the same protection). A synchronous throw or rejected promise inside any route handler is caught only by the global `unhandledRejection`/`uncaughtException` handlers (778-783), which just `console.error` and never touch `res` — the request hangs until client-side timeout instead of getting a clean 500. **Fix:** wrap the listener body in try/catch mirroring dashboard.js, writing a 500 on the error path.

10. **`cli/uninstall.js:165-183`** — `removeMatching()` (7 call sites: skills, agents, cursor/windsurf dirs, etc.) only special-cases `safeRmSync`'s `'outside-root'` failure reason; every other failure reason (`'lstat: ...'`, `'unlink: ...'` — permission errors, locked files) falls through to unconditional `count++`. The function's docstring claims its return value is "the number of entries removed" — it isn't, on any non-outside-root failure. **Fix:** `if (!result.ok) { console.log(...); continue; }` unconditionally, special-casing only the message text for the outside-root case.

11. **`cli/nuke.js:334-345`** — `executePlan()`'s package-removal loop: `uninstallPackage()` returns `false` on failure and falls back to `rmrf(p.dir)`, but the fallback's own boolean return is never checked — `removed++` runs regardless of whether the fallback actually succeeded. Not fully silent (rmrf does log a warning per item), but the closing `✅ Done. Removed N item(s).` banner can over-report success. **Fix:** `if (!ok) { if (rmrf(p.dir)) removed++; } else { removed++; }`.

### Dead code

12. **`server/lib/scanner.js:937`** — exports `buildDashboard`, `safeReadText`, `safeReadJson`, `listDir`, `parseSimpleYaml`; repo-wide grep (excl. scanner.js and vendor/) confirms none of the five is imported or called anywhere else. Only `scanState`/`scanMemoryBank` (same export line) are actually consumed, by `server/dashboard.js` and `server/lib/api.js`. `buildDashboard` is referenced only in stale comments (`server/lib/html/client.js:25`, `server/lib/html/client/store.js:20`) claiming data is "derived server-side by scanner.buildDashboard" — comment/code drift, since nothing calls it. **Fix:** trim the export list to `{ scanState, scanMemoryBank }`, or wire `buildDashboard` in and update the stale comments if it's meant to replace ad-hoc shaping in dashboard.js/api.js.

13. **`cli/github-sync.js:193-230`** — `diffIssue(existing, desired, opts)` (38 lines, computes body/labels/milestone/state diff for GH issue sync) is defined but never called anywhere in the file or repo. **Fix:** delete, or confirm it's superseded by inline logic elsewhere and remove.

### Duplication

14. **`.rcode/` existence guard, 5 near-identical copies:** `cli/config.js:91-95`, `cli/config.js:119-123` (same file, second copy), `cli/set-mode.js:46-50`, `cli/set-profile.js:31-35`, `cli/context.js:45-50`. All print the same `❌ No .rcode/ directory found in ${cwd}` + `Run 'rcode install' first` + `process.exit(1)`. `cli/context.js` already extracts this as `ensureRcodeDir(cwd)` — the one copy that should be the shared util. **Fix:** move `ensureRcodeDir` into a shared `cli/lib/` util and import it at the other four call sites.

---

## P2

15. **Four independent hand-rolled flat-YAML parsers**, all named `parseSimpleYaml`/`parseSimpleYamlInline`, none sharing a module: `rcode/bin/rcode-tools.cjs:91`, `cli/install.js:2133`, `server/lib/scanner.js:45`, `rcode/bin/rcode-hooks.cjs:819`. The hooks.cjs copy is documented as a deliberate mirror (comment cites rcode-tools.cjs:91), so it's not silently drifting — but `scanner.js` (regex-based, no comment-strip on empty val) and `install.js` (supports nested keys) are semantically different from the others. Not a live bug, but any future fix to flat-key parsing (e.g. a quoted-value edge case) has to be applied by hand in up to 4 places. **Fix:** extract to a single shared micro-YAML util module.

16. **`cli/install.js:814-822` `walkFiles(dir, extraIgnore)`** (fast-glob-based) vs **`rcode/bin/rcode-tools.cjs:248-256` `walkFiles(dir)`** (hand-rolled recursive walk) — same function name, different signature and semantics, both touched during install. Not a bug today; a name-collision risk if code is ever copy-pasted between the two files. **Fix:** rename one (e.g. `globFiles` in install.js, since it's glob-backed).

17. **No shared CLI arg-parsing helper** — 9 separate hand-rolled `parseArgs(args)` loops: `cli/show-model.js:19`, `cli/config.js:29`, `cli/update.js:87`, `cli/migrate-namespace.js:16`, `cli/context.js:30`, `cli/github-sync.js:68`, `cli/uninstall.js:34`, `cli/install.js:171`, `rcode/bin/rcode-tools.cjs:332`. Each returns a different opts shape, so this isn't true duplication worth forcing into one generic parser — but `--flag=value` vs `--flag value` vs bare-boolean conventions are inconsistently mixed with no shared "is this a flag" predicate. **Fix:** low priority; revisit if a 10th command is added.

18. **21 of 91 `test/*.cjs` files hand-roll `fs.mkdtempSync` + manual `fs.rmSync` teardown** (e.g. `test/build-skills-catalog.test.cjs:80`, `test/memory-drift.test.cjs:25`, `test/github-sync.test.cjs:83`, `test/memlog-customize.test.cjs:20`, `test/nuke.test.cjs:55`, +16 more) despite `test/lib/` already existing as a shared-helper location (`fsutil.test.cjs`, `manifest.test.cjs`). No `tmpdir.js` helper exists yet. Test-only, low risk. **Fix:** add a `withTmpDir()` helper in `test/lib/` to remove ~2-3 boilerplate lines × 21 files.

19. **`rcode/bin/rcode-tools.cjs:1031-3889` `cmdState()`, `rcode/bin/rcode-hooks.cjs` `driftCommand()`/`promptRouter()`, `cli/install.js` `installInner()`** — beyond their individual size flags above, all three follow the same "no structural decomposition, comment-driven state tracking" pattern. Grouped here as one systemic observation: this codebase's largest files got large by accretion of subcommands/options onto a single function rather than by genuine single-responsibility growth. Worth a standing convention (e.g. "no handler function over 150 lines") rather than fixing these three in isolation.

20. **Reset-then-writeback pattern risk (cross-cutting, not a single file):** P0 #1 (`rcode-tools.cjs:4451`) and P0 #2 (`orchestrator.js:300-311`) are structurally identical bugs — `let x = {}` → `try { x = JSON.parse(...) } catch { x = {} }` → partial mutation of `x` → unconditional writeback. **Fix:** grep-sweep the repo for this shape (`try {`/`JSON.parse`/`catch` followed by a writeback within the same function) beyond what this audit covered — it's an easy pattern to reintroduce in new code.

---

## Not findings (verified-good patterns worth pointing to)

- **`server/lib/api.js:123-160`** `handleApiFile` — path-resolve + realpath double-check against `root + path.sep`, extension whitelist to `.md`. Correctly guarded; the natural place a path-traversal bug would hide, and it isn't one.
- **`server/lib/scanner.js`'s `safeReadJson`** — logs a warning and surfaces `__parseError` rather than silently defaulting. This is the house style the P0 findings above should have followed.
- **`server/dashboard.js:75-86`** — explicitly wraps every request in try/catch to prevent an unhandled throw from breaking the process; `server/orchestrator.js`'s listener (P1 #9) should mirror this.
- Most empty `catch {}` blocks across the codebase are legitimate, traced, best-effort fallbacks (advisory git metadata, tmp-file cleanup, read-only dashboard scans) — not flagged as findings after tracing blast radius.
- No dead-code-after-return/throw or commented-out-code blocks were found anywhere in the files scanned (checked via return/throw-reachability and consecutive-comment-line heuristics).

---

## Scope notes

- `server/lib/html/client/vendor/*` (preact.js, preact-hooks.js, htm.js) is vendored third-party code and was excluded from this audit by design.
- The brief specified `test/**/*.js` and `test/**/*.mjs`; the actual test suite is entirely `test/**/*.cjs` (91 files, ~13,114 lines, zero `.js`/`.mjs` files under `test/`). Audited the `.cjs` suite as the evident intended scope.
- This audit's dispatch chain surfaced a separate, already-known documentation/workflow drift issue: `.rcode/workflows/audit.md`'s "code" target routes to `/rcode-review --karpathy`, but `review.md` is actually a cross-AI phase-plan reviewer with no `--karpathy` flag — the correct sub-workflow is `karpathy-audit.md`, and even that is diff/phase-scoped rather than a full static repo scan. Not fixed here (out of scope — read-only audit of `rcode/`/`server/`/`cli`/`test` source, not of `.rcode/workflows/*.md`), but worth a ticket since it matches the already-tracked "25+ skill workflows reference non-existent paths" class of issue.
