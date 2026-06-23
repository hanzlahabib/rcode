---
status: issues_found
phase: 38
critical: 0
high: 0
medium: 1
low: 2
generated: 2026-06-17T21:05:28Z
resolved: 2026-06-18
---

## Resolution (post review-fix, verified)

Fixed and verified in-code + by test (commits c97fc61, 321ff91, ced414e, f708adf):

- **H1 — session dedupe** ✓ `once-per-intent` fallback now `ppid + hourly-bucket` instead of a shared `'default'` file (rcode-hooks.cjs:898); `session_id` still used when present.
- **H2 — one-directional drift guard** ✓ added reverse assertion with `KNOWN_UNCOVERED_ROUTES` allowlist — a NEW do.md route not covered and not allowlisted now fails the test.
- **M2 — inline require('child_process')** ✓ hoisted to module-level import (rcode-hooks.cjs:23); 4 inline sites removed.
- **M3 — over-broad keywords** ✓ `'error'`/`'how does'`/`'how do'`/bare `'research'` tightened to intent-bearing multi-word phrases; tests confirm "what does this error message mean" no longer nudges while "getting an error when I deploy" does.

**Remaining (non-blocking):**
- **M1** — rcode-hooks.cjs is 1031 lines (31 over the 1000-line AGENTS.md limit). Deferred per original sprint spec; tracked as follow-up (extract INTENT_TABLE → `.rcode/data/intent-table.json`).
- **L1/L2** — minor keyword-ordering test gap; pre-existing inline `require` in compactNudge.
- (L3 — two commit-message nits — already committed; not worth a history rewrite.)

Tests: 18 phase-38 + regression green. Gate cleared (critical 0 / high 0).

---


# Phase 38 Code Review — Proactive Intent Router

**Branch:** feat/proactive-intent-router  
**Commits reviewed:** ff276d5..f244c69 (base 0581204)  
**Files reviewed:** rcode/bin/rcode-hooks.cjs, rcode/templates/settings-hooks.json, rcode/workflows/enable-hooks.md, cli/install.js, test/prompt-router.test.cjs, test/prompt-router-install.test.cjs, test/prompt-router-table-sync.test.cjs

---

## Pattern Check

The implementation correctly mirrors the fail-open/exit-0 contract from `cli/rcode-slash-router.cjs`. `fs.readFileSync(0, 'utf8')` is used synchronously (matching the reference), every error path exits 0, and `process.stdout.write` is inside the outer `try`. The `require.main === module` guard added in sprint 38.3 cleanly prevents CLI side-effects on `require()`. All 13 tests pass. No external dependencies introduced. No AI attribution in any commit message. Commit scopes (`hooks`, `bin`, `install`, `planning`) are all in the allowed list per AGENTS.md.

---

## High Severity

### H1 — `once-per-intent` dedupe collapses all sessions into one file when `session_id` is absent

**File:** `rcode/bin/rcode-hooks.cjs:893-894`

```js
const sessionId =
  data.session_id || data.tool_input?.session_id || 'default';
```

When Claude Code does not include a `session_id` in the `UserPromptSubmit` payload — which is the common case in the current protocol — every session writes to and reads from `$TMPDIR/rcode-prompt-nudge-default.json`. A user who enables `once-per-intent` will be nudged for `debug` work in session A, and when they open a completely new session B, the dedupe file already marks `debug` as seen. The intent they most need routing for — recurring bugs — is permanently silenced across all future sessions until the file is manually deleted.

This is a functional defect in `once-per-intent` mode. The `every` default is unaffected. `when-stale` is unaffected.

**Recommended fix:** Use a per-session timestamp or startup time as the fallback key rather than the literal string `'default'`. A cheap option: fall back to `String(process.ppid) + '-' + String(Math.floor(Date.now() / 3600000))` (process parent PID + hour bucket), which naturally scopes to the current shell session without requiring session_id from the payload. Alternatively, document that `once-per-intent` requires session_id in payload — but that makes the mode unreliable and should be noted prominently.

---

### H2 — Drift guard only checks INTENT_TABLE → do.md, not the reverse; 17 do.md routes have no coverage

**File:** `test/prompt-router-table-sync.test.cjs:87`

The test asserts "every INTENT_TABLE command exists in do.md" — a valid check that prevents phantom entries. It does NOT assert the converse. As a result, do.md contains 33 routable commands while INTENT_TABLE covers only 16. The 17 uncovered commands include high-traffic routes: `/rcode-progress`, `/rcode-resume-work`, `/rcode-quick`, `/rcode-prfaq`, `/rcode-sprint-status`, `/rcode-create-story`, `/rcode-dev-story`, `/rcode-autonomous`, `/rcode-verify-work`, `/rcode-council`, `/rcode-note`, `/rcode-add-tests`, `/rcode-complete-milestone`, `/rcode-plan-milestone-gaps`, `/rcode-execute`, `/rcode-list-plans`, `/rcode-phase`.

The problem is not that these 17 are absent — the phase spec says INTENT_TABLE covers only the subset worth nudging — but the drift guard cannot detect when a route is removed from do.md (forward direction is guarded) while it cannot detect when an important new route is added to do.md without a corresponding INTENT_TABLE entry (backward direction is not guarded). The summary documents this as intentional partial coverage, but the test is misleadingly named "drift guard" when it only guards one direction.

This is a correctness gap, not a blocking defect today. It becomes a silent drift vector when a new route is added to do.md in a future phase.

**Recommended fix:** Either (a) add a second assertion that flags new do.md routes not in INTENT_TABLE as a warning (not a hard fail, since partial coverage is intentional), or (b) rename the test file and test description to `every INTENT_TABLE entry is backed by a do.md route` to accurately scope what is and is not protected. Option (b) is the minimum; option (a) is stronger.

---

## Medium Severity

### M1 — File size at 1025 lines, 25 over the 1000-line AGENTS.md limit

**File:** `rcode/bin/rcode-hooks.cjs` (current: 1025 lines)

AGENTS.md states "Maximum file size: 1000 lines — refactor before exceeding." The sprint 38.1 summary acknowledges the violation and defers resolution, citing the standalone/no-cross-require constraint as justification. The constraint is real — this file must be dependency-free — but the justification for keeping `isStateStaleFallbackTrue`, `readPromptNudgeToggle`, and `parseSimpleYamlInline` (three new helpers totaling ~75 lines) inside the main file is sound only as long as the file stays near the limit.

This is not a blocking defect because the sprint spec was explicit and the executor noted it. However the 25-line overage leaves no headroom for the next feature.

**Recommended fix:** File a tracking issue before phase 39 work touches this file. The most extractable block is `INTENT_TABLE` (97 lines of data) into a `.rcode/data/intent-table.json` that `promptRouter()` reads at runtime — no cross-file `require()` needed; it would be a `fs.readFileSync` of a data file, which does not violate the stdlib-only rule. This alone brings the file to ~928 lines.

---

### M2 — `isStateStaleFallbackTrue` has an inline `require('child_process')` that violates the pre-existing house pattern

**File:** `rcode/bin/rcode-hooks.cjs:790`

```js
function isStateStaleFallbackTrue(cwd) {
  try {
    const { execSync } = require('child_process');
```

The file already imports `fs`, `os`, and `path` at lines 20-22. The inline `require('child_process')` pattern was pre-existing in `preCompact` (line 342) and `stopVerify` (line 523) — this is a known code smell in the file, not introduced by phase 38. However phase 38 added a third instance of the same smell. Per the global CLAUDE.md rule: "Copying an old pattern from existing code in the same repo is NOT a justification. If the surrounding code is outdated, flag it. Do not propagate the smell."

The inline `require` is not harmful at runtime (Node caches modules; repeated `require('child_process')` is O(1)). The defect is readability and maintainability: a reader scanning the top of the file for dependencies will miss `child_process`.

**Recommended fix:** Add `const { execSync } = require('child_process');` to the module-level imports at line 20-22, alongside `fs`, `os`, and `path`. Remove the three inline require calls. This is a one-line addition and three one-line deletions — no behavioral change.

---

### M3 — `'error'`, `'research'`, `'how does'`, and `'how do'` keywords are too broad and will generate high false-positive nudge noise

**File:** `rcode/bin/rcode-hooks.cjs:657, 681`

Three keyword issues:

1. `'error'` (line 657, `debug` entry): matches any prompt containing the word "error" — "syntax error in my question", "is there an error in config X?", "what does this error mean?" — all route to `/rcode-debug`. This is the most common English word in developer prompts after "the".

2. `'research'` (line 681, `explore` entry): matches "I've done research on this", "based on research", "your research says" — none of which are navigation intent.

3. `'how does'` and `'how do'` (line 681): "how do I format a string in JS?" is a question-answering request, not research-phase intent. Every factual question with "how do" triggers `/rcode-research-phase`.

These are advisory nudges, not blocks, so the failure mode is annoyance rather than broken behavior. But a hook that fires on 30% of prompts trains users to ignore all nudges, defeating the memory-consistency goal.

**Recommended fix:** Tighten `debug` keywords to multi-word forms (`'getting an error'`, `'throwing an error'`, `'error in the'`) or require the word `'bug'`/`'broken'`/`'crash'` which are much more signal-dense. Replace `'research'` with `'research phase'` or `'do some research'`. Replace `'how does'`/`'how do'` with `'how does X work'`-style multi-word patterns, or remove them in favour of more specific `'understand how'`/`'look into how'` which are already present.

---

## Low Severity

### L1 — `'how should'` keyword (discuss entry) creates ordering ambiguity with `add-phase`

**File:** `rcode/bin/rcode-hooks.cjs:687`

`'how should'` is in the `discuss` entry (line 687) with command `/rcode-discuss-phase`. The phrase "how should I refactor the auth layer?" would match `discuss` before it reaches the `add-phase` entry (line 693). do.md's own routing table acknowledges this ambiguity (line 345: "prefer `discuss-phase` over `plan`/`add-phase` when scope-uncertainty signals are present"). The behavior is technically correct per do.md precedence, but the keyword `'how should'` covers cases where `add-phase` is clearly the right route (e.g., "how should I structure this multi-file migration"). No test exercises this cross-entry ordering.

**Recommended fix:** This is low risk because `discuss-phase` is the correct conservative choice when scope is unclear. No immediate action required. Worth adding a test case: `'how should I structure this migration?'` should route to `discuss`, not `add-phase` — confirm that behavior is intentional.

---

### L2 — `compactNudge()` at line 943 still uses inline `require('path')` and `require('os')`

**File:** `rcode/bin/rcode-hooks.cjs:943-944`

This is pre-existing debt, not introduced by phase 38. Noted here because phase 38 added a third inline-require function (`isStateStaleFallbackTrue`) and the pattern is now present in four functions. Each sprint that touches this file without cleaning it makes a future extraction harder. Documented for the next maintainer.

**Recommended fix:** Covered by the fix in M2 — adding `child_process`, `path`, and `os` to module-level requires in one pass cleans all four sites simultaneously.

---

### L3 — Commit `e5d635d` subject missing ticket reference; `047d128` subject is truncated in git log

**File:** commit history

`e5d635dfcbcde2b4f36b11e210f6ee4cdced2676` — `feat(hooks): guard main() with require.main===module; export INTENT_TABLE` — does not include `(#892)`. All other phase 38 commits include the ticket. Inconsistent but not a policy violation (AGENTS.md requires conventional-commit format, not mandatory ticket references). Two other commits (`ff276d5`, `4e6b8da`) in sprint 38.1 omit the ticket from the full commit body — only the subject line is checked, not the body.

`047d12881c96f4417f6a5ec6c41061d43bb222c6` — `test(hooks): add prompt-router-table-sync drift guard vs do.md routing table` — subject is 77 characters, 5 over the 72-char limit stated in AGENTS.md.

**Recommended fix:** No corrective action needed now. Note for future sprints: subject line should stay under 72 characters; include `(#892)` in all phase commits for traceability.

---

## Test Coverage Assessment

Coverage is good for the stated scope. 9 behavioral tests (match, no-match, malformed input, empty input, toggle-off, once-per-intent dedupe, /rcode- skip, hookEventName forwarding) plus 2 install tests and 2 drift-guard tests. The fail-open contract is directly verified by tests 5 and 6 (malformed/empty stdin exit 0 with empty stdout).

Gaps:
- No test for `when-stale` mode (only `every`, `once-per-intent`, and `off` are tested).
- No test for the `'default'` session_id collision scenario (H1 above).
- No test confirms `isStateStaleFallbackTrue` git-unavailable branch (`lastCommitTs === null` → return false).

---

## Summary

No critical defects. The fail-open/exit-0 contract is correctly implemented and verified. The two high findings are a functional defect in `once-per-intent` mode (H1, affects users without session_id in payload) and a one-directional drift guard that cannot detect new do.md routes missing from INTENT_TABLE (H2). The three medium findings are a file-size limit breach (M1), a propagated inline-require smell (M2), and overly broad keywords that will generate noise on common developer queries (M3). Process rules (no AI attribution, no push, valid scopes) are clean.
