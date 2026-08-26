# Audit: Four Stale-Looking Open Issues

Date: 2026-08-25
Scope: verify whether #947, #958, #1035, #1034 are already fixed on `camp-stale-triage`. No issues closed, no `gh` write commands run — verdicts only.

---

## #947 — SessionStart greeter

**Acceptance conditions (from issue body):**
1. New `session-start` subcommand in `rcode/bin/rcode-hooks.cjs`, reusing `pre-compact`'s state-reading helpers.
2. `SessionStart` entry in `rcode/templates/settings-hooks.json`.
3. Advisory only — never blocks session start.

**Evidence:**
- `sessionStart()` implemented at `rcode/bin/rcode-hooks.cjs:1176-1217`, dispatched from `case 'session-start'` at `rcode/bin/rcode-hooks.cjs:1326-1327`. Uses `resolveActivePhase(state)` (shared with pre-compact) to build the primer.
- `rcode/templates/settings-hooks.json:89` has a `"SessionStart"` array entry (comment on line 2 documents its purpose).
- Whole function body is wrapped in `try { ... } catch { /* fail open — never block session start */ } process.exit(0);` (`rcode/bin/rcode-hooks.cjs:1176`, `1215-1216`).

**Exercised directly** — ran the hook against this repo's own `.rcode/state.json`:
```
$ echo '{}' | node rcode/bin/rcode-hooks.cjs session-start
{"systemMessage":"📍 Phase 47 complete · 0/1 sprints done · next: /rcode-add-phase", ...}
```
Real primer with correct phase/sprint/next-command, matching the issue's example format (`📍 Phase 35 executing · 0/2 sprints done · next: /rcode-execute`).

**Verdict: FIXED.**

---

## #958 — Memory bank relevance-ranked injection + drift detection

**Acceptance conditions (from issue body, "Proposed direction" section, 4 items):**
1. Ambient injection: session-start (and pre-compact) selects top-K memory chunks within a declared token budget.
2. Staleness signal: doctor/session-start warns when memory INDEX is older than N days or contradicts state.json.
3. Drift daemon: post-commit hook diffs touched files against `project/stack.md` / `decisions.md` claims.
4. Delete `.planning/memory/`.

**Evidence:**
1. `rcode/bin/lib/memory-select.cjs` exports `selectMemoryChunks`, `formatMemoryContext`, `hasMemory`, `DEFAULT_BUDGET_TOKENS = 1500` (line 17). Wired into `sessionStart()` (`rcode/bin/rcode-hooks.cjs:1202-1213`, uses the 1500-token default) and into the pre-compact handler (`rcode/bin/rcode-hooks.cjs:577-583`, explicit `{ defaultBudget: 600 }`). Budget is config-overridable via `getConfiguredBudget()` reading `memory_inject_budget` from config (`rcode/bin/lib/memory-select.cjs:63-72`).
2. Staleness: `cli/doctor.js` imports `checkStaleness` from `cli/lib/memory-bank.cjs` (line 19) and separately checks `.rcode/memory/INDEX.md` mtime age against a threshold (`cli/doctor.js:388-409`, "Memory INDEX.md" check).
3. Drift daemon: `rcode/bin/lib/memory-drift.cjs` implements `checkDrift()` with `dep-contradiction`, `missing-path`, and `stale-index` checks (confirmed by exercising below). Wired into the post-commit hook via `maybeEmitDriftNudge()` (`rcode/bin/rcode-hooks.cjs:186-211`), called at `rcode/bin/rcode-hooks.cjs:308` inside the post-commit handler, once-per-session-deduped. Standalone `drift` subcommand also exists (`rcode/bin/rcode-hooks.cjs:217-224`, dispatched at line 1329).
4. `.planning/memory/` does not exist in the working tree (`find . -iname "*memory*" -path "*.planning*"` returns nothing under `.planning/`).

**Exercised directly:**
- `session-start` hook output (see #947 evidence) includes a full `additionalContext` block with the project distillate — ambient injection is live, not theoretical.
- `node rcode/bin/rcode-hooks.cjs drift` on this repo returned real findings: a `dep-contradiction` (stack.md claims zero runtime deps, `package.json` now lists `ws`), two `missing-path` findings, and a `stale-index` finding (INDEX.md 46 days old, threshold 30). This matches the issue author's own comment verbatim ("drift checker's first run on this repo found real drift (stack.md claims zero runtime deps but package.json ships `ws`; a referenced ADR file is missing)").
- `node cli/doctor.js` (via `require` + call) printed `✓ Memory INDEX.md   fresh — updated 0d ago` in this worktree — this measures file **mtime**, not the "Last updated" field the drift checker parses from INDEX.md content, so the two staleness signals can disagree (mtime resets on checkout/clone; the drift checker's date field does not). Noted as a minor inconsistency between the two staleness mechanisms, not a missing feature — both mechanisms independently exist and run.

**Issue's own comment history confirms this** (issue #958, comments 2-3): "Feature work landed on local main: f967817/f4fe089/842254c — relevance-ranked memory injection ... and f14a0bd/2c520cd — drift detection ... Verified live ... 574/574 tests." and "Core feature work (relevance-ranked injection + drift detection) shipped in v4.5.0. Leaving open for the remaining direction items: version-stamp update nudge for consumers and richer relevance signals (embeddings) if heuristics prove insufficient." — i.e. the issue is intentionally left open by its author for optional future work, not because the stated acceptance conditions are unmet.

**Verdict: FIXED** (all 4 original scope items present and exercised; issue kept open by author for optional follow-on enhancements outside original scope, not a gap in what was asked).

---

## #1035 — Council scorer substring collisions (e.g. "storage" → "rag")

**Acceptance conditions (from issue body):**
1. `scoreAgent()` and all `*_TRIGGERS.some(...)` checks in `council-panel.cjs` use word-boundary matching instead of substring `.includes()`.
2. All 27 existing tests in `test/council-panel-and-roadmap.test.cjs` still pass.
3. Repro question no longer misclassifies as `ml`/Zayd.

**Evidence:**
- `matchesKeyword(text, word)` at `rcode/bin/lib/council-panel.cjs:411-415` uses `new RegExp('\\b' + escapeRegExp(word) + '\\b').test(text)` — word-boundary regex, not substring.
- Every scoring/trigger call site (`scoreAgent` line 417-429, `applyPriorityBoosts` lines 432-475, `explainSelection` lines 579-584) calls `matchesKeyword(...)`, not `.includes(...)`. The only remaining `.includes()` in the file (line 501) is `AGENT_IDS.includes(id)` — an array-membership check on agent id strings, unrelated to keyword text matching.

**Exercised directly** — ran the issue's own repro:
```
$ node -e 'const cp=require("./rcode/bin/lib/council-panel.cjs"); console.log(JSON.stringify(cp.explainSelection("... token strategy (format, expiry, storage/hashing), email delivery ..."), null, 2))'
```
Result: `zayd: 0` (was `7` pre-fix per the issue), `domain: "general"`, panel `["sadiq","ahmed-hassani","layla"]` — no `ml`/Zayd misclassification. Matches the issue's stated "after fix" result (`zayd score: 0, domain: general`).

Ran `node --test test/council-panel-and-roadmap.test.cjs`: **27/27 pass**, 0 fail.

**Separate note:** the issue's own "Separate, not fixed here" section flags that council's roster has no dedicated security specialist (`Unknown agent id(s): security-auditor`) — explicitly out of scope for this issue and left as a follow-up by the author. Not part of this issue's acceptance criteria.

**Verdict: FIXED.**

---

## #1034 — Council Next-Up recommends /rcode-plan before a phase exists

**Acceptance conditions (from issue body):**
1. `rcode/workflows/council.md` "Next Up" section checks `project-status` before suggesting `/rcode-plan`, and suggests `/rcode-add-phase` first when no phase exists.
2. `rcode/workflows/plan.md` Step 0 preflight error message mentions `/rcode-add-phase` alongside `/rcode-new-project`.

**Evidence:**
- `rcode/workflows/council.md:682-692` ("## Next Up" section): runs `PROJECT_STATUS=$(node .rcode/bin/rcode-tools.cjs project-status ...)`, then branches — `real` → `/rcode-plan {phase-number}`; otherwise (`uninstalled`/`uninitialized`/`stub`) → `/rcode-add-phase`.
- `rcode/workflows/plan.md:103-115` ("## 0.5. Project-Status Preflight"): same `project-status` check; on non-`real` status prints `"Project not initialized for planning. Run /rcode-new-project (full roadmap) or /rcode-add-phase (if you just want to add one phase), then return here."` and stops.

**Exercised directly** — reproduced the exact failure condition from the issue (fresh `.rcode/config.yaml` + `state.json` with `phases: []`, no `REQUIREMENTS.md`, no `research/`):
```
$ RCODE_PROJECT_ROOT=<tmp> node rcode/bin/rcode-tools.cjs project-status
{"ok":true,"status":"stub","signals":{...,"phase_count":0,"first_phase_name":null}}
```
This confirms `project-status` correctly returns `stub` under the exact repro conditions (`/rcode-init` → `/rcode-scan` → `/rcode-council`, no phase yet) — the signal that both `council.md`'s Next-Up branch and `plan.md`'s preflight branch key off is proven to fire correctly. (`council.md`/`plan.md` are markdown-driven agent instructions, not standalone executables — the check itself, `project-status`, was exercised directly; the markdown branching logic was verified by direct reading of the conditional blocks, which are unambiguous and match the issue's fix description exactly.)

Cross-checked in this repo (which does have phases): `project-status` returns `real` (phase_count 26), confirming the command differentiates correctly both ways.

**Verdict: FIXED.**

---

## Test suite

`npm test` (612 tests, `node --test`): **611 pass / 1 fail**.

The one failure — `test/at-ref-parity.test.cjs`: "broken @-references do not regress past baseline" — is **unrelated to all four issues above**. It flags `@.rcode/references/persona-executor-mode.md`, referenced by 5 agent persona files (`rcode-hanzla.md`, `rcode-waleed.md`, `rcode-yousef.md`, `rcode-omar.md`, `rcode-haitham.md`) and `rcode/workflows/execute-sprint.md`, but the target file was never created in either `rcode/references/` or `.rcode/references/` (confirmed via `find`). Git history shows the `@`-ref lines were added in a prior commit (`fix(agents): correct tool-grant mismatches across agent templates`) without the corresponding content file. CHANGELOG.md documents this feature ("Council personas can now execute the sprint they informed ... via a shared conditional clause (`persona-executor-mode.md`)") as already shipped, meaning the file should contain the shared execution contract (atomic commits, deviation handling, checkpoint protocol) matching `rcode-executor`'s behavior.

**Reporting as BLOCKED, not fixed:** authoring this file correctly requires synthesizing `rcode-executor`'s full execution contract (checkpoints, deviation handling, commit protocol) from multiple other reference docs — that is nontrivial content-authoring work well outside the scope of this verification task (four named, unrelated stale-issue checks), and guessing at its content risks shipping a wrong/incomplete execution contract that all 5 senior personas would silently pick up. Per task instructions, not fixed here; flagged for a dedicated follow-up (recommend filing a GH issue, not fixing ad hoc).

---

## Summary

| Issue | Verdict |
|---|---|
| #947 | **FIXED** |
| #958 | **FIXED** |
| #1035 | **FIXED** |
| #1034 | **FIXED** |

No code changes were made — all four issues are already resolved on this branch. One unrelated pre-existing test failure (`at-ref-parity.test.cjs`, missing `persona-executor-mode.md`) was discovered and is reported as blocked, not fixed, since it falls outside this audit's scope and requires nontrivial content authoring.
