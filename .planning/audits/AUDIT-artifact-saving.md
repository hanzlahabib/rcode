# Audit: Artifact Saving / Persistence Patterns

Date: 2026-09-02
Scope: Memory Bank (`.rcode/memory/`), `.rcode/state.json`, `.planning/` artifacts (SPRINT/SUMMARY/VERIFICATION/CONTEXT/VALIDATION/RESEARCH), memory-distill drift, parallel-agent write races.
Method: static read of `.rcode/bin/rcode-tools.cjs`, `.rcode/workflows/*.md`, `rcode/skills/core/rcode-memory-*`, plus live inspection of this worktree's `.rcode/state.json` and `.planning/phases/*`. Read-only — no fixes applied.

---

## P0 — 2

### 1. `phase` CLI subcommand family bypasses the locked/atomic state writer, and runs concurrently under wave-parallel execution
- **File**: `.rcode/bin/rcode-tools.cjs:3968` (`phase add`), `:4041` (`phase complete`), `:4144` (`phase sync-sprints`), `:4184` (`phase set-status`), `:4364` (`phase scaffold-all`)
- **Issue**: The `state` command group has a safe writer, `writeState()` (`:1143`–`:1218`), which takes a `.lock` file with stale-PID detection (`:1195`–`:1208`) and writes via temp-file + `fs.renameSync` (`:1211`–`:1214`) — a genuinely atomic, coordinated write. The separate `phase` command group (`:3727` onward) re-implements state.json read/write from scratch with its own local `const statePath = ...` (`:3776`, `:3992`, `:4080`, `:4163`, `:4262`) and calls `fs.writeFileSync(statePath, ...)` **directly on the final path**, with no lock file and no temp+rename. `.rcode/workflows/execute.md:197` ("Spawning {N} rcode-executor agents in parallel") confirms multiple executor agents run concurrently per wave; each can independently call `phase set-status`/`phase complete` for its own phase against the *same* `state.json`. Two concurrent unlocked read-modify-write cycles produce a classic lost-update race (last writer's full-object write silently discards the other's changes), and a process kill mid-`writeFileSync` (OOM, timeout, ctrl-C) can leave `state.json` truncated/corrupt with no recovery — exactly the failure mode `writeState()` was built to prevent.
- **Fix**: Route every `phase *` subcommand through `readState()`/`writeState()` instead of ad-hoc `JSON.parse`/`fs.writeFileSync` pairs.

### 2. `executed`→`complete` status aliasing silently defeats the VERIFICATION.md gate, and this is already visible in the live state.json
- **File**: `.rcode/bin/rcode-tools.cjs:1067`–`1078` (`PHASE_STATUS_ALIASES`, `normalizePhaseStatus`), applied at `:1124` inside `migrateState()`, persisted back to disk at `:1054`–`1056` inside `readState()`
- **Issue**: `.rcode/workflows/execute.md:788`–`791` documents an intentional two-step completion gate: a phase advances to `status: executed` when its plans finish, and is only promoted to `status: complete` once a passing `VERIFICATION.md` exists (checked again by `ship.md:16,45,119-122` before shipping). But `PHASE_STATUS_ALIASES` maps `executed → 'complete'` as if it were a legacy spelling, and `migrateState()` applies that mapping to every phase on every `state read`/`state get` call (session-start greeter, `/rcode-status`, `/rcode-progress`, the dashboard, etc.), then `readState()` **persists** the collapsed value back to `state.json` the first time it's seen (`hasLegacyStatus` → `writeState(migrated)`). This means the moment anything reads state after a phase finishes execution, its `executed` status is rewritten to `complete` regardless of whether `VERIFICATION.md` exists — the gate is bypassed by the read path, not just occasionally skipped by a workflow.
- **Live evidence in this worktree**: of the 27 phases under `.planning/phases/` with at least one `*-SUMMARY.md`, 24 have **no** `*-VERIFICATION.md` on disk (phases 20, 22–33, 38, 42–47), yet `.rcode/state.json` shows every one of them as `"status": "complete"`. Only 3 `VERIFICATION.md` files exist in the entire `.planning/phases/` tree.
- **Fix**: Remove `executed`/`verified` from `PHASE_STATUS_ALIASES` (they are not legacy spellings, they are distinct pipeline states) and give `migrateState()`/the status enum an explicit `executed` value so the verification gate in `execute.md`/`ship.md` has something real to check against.

---

## P1 — 3

### 3. `phase` subcommands read `state.json` raw, skipping schema migration and the corruption guard
- **File**: `.rcode/bin/rcode-tools.cjs:3997` (`phase complete`), `:4168` (`phase set-status`), `:4286` (`phase scaffold-milestone`)
- **Issue**: These call `JSON.parse(fs.readFileSync(statePath, 'utf8'))` directly instead of `readState()` (`:1036`–`1062`), so they get neither the 10 MB corruption guard (`:1039`–`1041`) nor `migrateState()`'s shape normalization (uniform `phases[]` entries, `milestones[]` synthesis, status alias resolution at `:1090`–`1140`). A state.json last touched only by `state`-group commands is v2-normalized; one that has been touched by a `phase`-group command may carry legacy/mixed shapes indefinitely, since nothing forces it back through the migrator. Two divergent read paths for the same file is itself the root enabler of finding #1 and #2 being possible at all.
- **Fix**: Have every `phase *` subcommand call `readState()`/`writeState()` (also resolves #1).

### 4. Memory Bank distillate freshness check uses an mtime-based digest that breaks across git checkouts/worktrees, with no deterministic tool behind it
- **File**: `.rcode/workflows/memory-distill.md:41`–`47` (digest formula `sha1(path + ":" + mtime, sorted)`), `rcode/skills/core/rcode-memory-distill/SKILL.md:34`
- **Issue**: The digest is computed by the LLM narratively while executing the workflow — `.rcode/bin/rcode-tools.cjs` has zero `digest`/`distill` logic (grep confirms no CLI support), so there is no deterministic, verifiable implementation, only prose instructions. Worse, keying the hash on file `mtime` is unsound for a git-tracked repo: `git clone`/`git worktree add`/`git checkout` all stamp fresh mtimes at checkout time regardless of whether content changed, so the digest recorded in a committed distillate can never match a freshly checked-out tree even when content is byte-identical.
- **Live evidence**: in this worktree, all 6 Memory Bank source files for the project distillate (`project/stack.md`, `project/decisions.md`, `project/glossary.md`, `people/stakeholders.md`, `milestones/current.md`, `incidents/known-issues.md`) share the identical mtime `2026-09-02 13:48:20` (this worktree's checkout time). `.rcode/memory/distillates/project.distillate.md` frontmatter records `source-digest: 1eb6706dd167496e23589a5c6c3c5c9a14084362`, `generated-at: 2026-05-22T21:10:24Z` — a digest that was necessarily computed from a completely different set of mtimes. Any agent that actually recomputed the digest correctly right now would find a mismatch on every single file, independent of real content drift.
- **Fix**: Key the digest on file content hash (e.g. `git hash-object` or a real `sha1` of file bytes) rather than mtime, and give it a CLI subcommand in `rcode-tools.cjs` so the check is deterministic instead of LLM-approximated.

### 5. `rcode-memory-audit`'s "distillate freshness" check inherits the same broken staleness signal
- **File**: `rcode/skills/core/rcode-memory-audit/SKILL.md:59` (check #6), `:81`–`83` (example output)
- **Issue**: This audit check is defined as "`source-digest` does not match current source files," which resolves to the same mtime-based comparison from finding #4. On any fresh clone, CI run, or worktree (like this one), it will report every distillate as stale (false positive) regardless of actual content drift, while offering no independent content-level check to fall back on.
- **Fix**: Depends on #4's fix — once the digest is content-based, this check becomes trustworthy without further changes.

---

## P2 — 4

### 6. `writeState()` runs its `_seeded_stub`-clearing logic twice per call
- **File**: `.rcode/bin/rcode-tools.cjs:1153`–`1171` and `:1173`–`1191`
- **Issue**: The exact same block (read `state.phases`, compute `hasRealPhase`/`hasRequirements`, conditionally `delete state._seeded_stub`) appears twice in immediate succession inside `writeState()`. Harmless — the operation is idempotent — but it's dead duplicate code on the hottest write path in the file.
- **Fix**: Delete one copy.

### 7. `phase set-status`'s status enum has drifted from the canonical `PHASE_STATUS_ENUM`
- **File**: `.rcode/bin/rcode-tools.cjs:4158` (`validStatuses = ['planned', 'in_progress', 'executed', 'complete', 'blocked']`) vs `:1072` (`PHASE_STATUS_ENUM = new Set(['planned', 'executing', 'complete'])`)
- **Issue**: Two different enums for the same concept coexist in one file: different spelling (`in_progress` vs `executing`) and different membership (`blocked` and `executed` accepted by `set-status` but not present in the canonical post-migration enum; `executed` is even aliased away by `normalizePhaseStatus`, per finding #2). A value written via `set-status` as `"executed"` or `"blocked"` will be silently reshaped (or not recognized) the next time the same state is read through `readState()`.
- **Fix**: Reconcile the two enums into a single source of truth.

### 8. Nyquist validation artifacts (`VALIDATION.md`, `RESEARCH.md`) are referenced by 3 workflows but effectively never produced
- **File**: `.rcode/workflows/plan.md:425`, `.rcode/workflows/plan-research-validation.md:127`–`148`, `.rcode/workflows/validate-phase.md:44`–`129`
- **Issue**: Creation is gated behind `nyquist_validation_enabled` / `research_enabled` config flags. `node .rcode/bin/rcode-tools.cjs config-get workflow.nyquist_validation_enabled` and `...research_enabled` both return empty (unset) in this project, and `.rcode/config.yaml` has no entry for either key. Across 27+ executed phases in `.planning/phases/`, `RESEARCH.md` exists exactly once and `VALIDATION.md` exists zero times. The feature is not broken, but it is dead weight that's been silently off for the project's entire history — three workflow files carry logic and templates for an artifact type that has never been written.
- **Fix**: Either turn the flags on and verify the path actually works, or drop the dead branches from the three workflows.

### 9. Duplicate-topic audit reports accumulate in `.planning/audits/` with no supersession marker
- **File**: `.planning/audits/AUDIT-lens11-karpathy.md` vs `AUDIT2-lens11-karpathy.md`; `AUDIT-lens13-observability.md` vs `AUDIT2-lens13-observability.md`; `AUDIT-lens14-naming.md`/`AUDIT2-lens14-naming.md`/`AUDIT-naming.md`; `AUDIT-lens15-coverage.md` vs `AUDIT2-lens15-coverage.md`
- **Issue**: Multiple audit runs on the same lens/topic are kept side-by-side under different filename generations (`AUDIT-`, `AUDIT2-`, `AUDIT3-`) with nothing in either file marking one as superseded. A reader (human or agent) pulling audit context has no way to tell which report reflects current reality without opening and diffing both.
- **Fix**: Adopt a single naming convention with a date or sequence in frontmatter, and archive/delete superseded reports instead of accumulating parallel copies.

---

## Summary

The most significant risk is structural, not cosmetic: `.rcode/state.json` has two divergent write paths — the `state` command group's locked, atomic `writeState()`, and the `phase` command group's raw, unlocked `fs.writeFileSync` (findings #1, #3) — and the second path is exercised concurrently by wave-parallel executor agents (`execute.md:197`), which is a real corruption/lost-update risk, not a theoretical one. Compounding that, the status-normalization logic that runs on every state read treats the intentional "executed, pending verification" state as a legacy alias for "complete" and persists that collapse back to disk (finding #2) — this isn't hypothetical either: 24 of 27 phases in this repo's own `.planning/` are marked `complete` in `state.json` with no `VERIFICATION.md` ever having been written, which is precisely the gate `execute.md` and `ship.md` claim to enforce. Separately, the Memory Bank's distillate-freshness mechanism (findings #4, #5) is undermined by keying its change-detection on file mtime rather than content, which is demonstrably unreliable the instant the repo is cloned or checked into a fresh worktree — as this very audit's own worktree shows. The P2 items (duplicate code, drifted enums, dead validation-artifact code paths, duplicate audit files) are hygiene issues that don't corrupt state but add maintenance and trust-erosion cost.
