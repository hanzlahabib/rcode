---
status: passed
phase: 38
generated: 2026-06-18T00:00:00Z
---

# Phase 38 Verification — Proactive Intent Router

Goal-backward verification. Each acceptance criterion checked against the
actual code and empirical output, not SUMMARY claims.

---

## AC1: prompt-router subcommand emits a correct, memory-framed nudge

**PASS**

Verified by running the hook directly:

```
printf '%s' '{"prompt":"audit the auth module"}' | node rcode/bin/rcode-hooks.cjs prompt-router
```

Output:
```json
{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"rcode tip: this looks like audit-karpathy work — consider /rcode-review --karpathy so the outcome is captured in .rcode/state.json. Decisions made outside rcode commands won't persist; run /rcode-memory-update to keep long-term memory consistent."}}
```

Exit code: 0.

```
printf '%s' '{"prompt":"let'\''s plan the new auth phase"}' | node rcode/bin/rcode-hooks.cjs prompt-router
```

Output includes `plan work` intent and `/rcode-plan` command. Advisory text mentions `state.json` and `/rcode-memory-update` on every match — the memory-framing requirement is met.

Implementation in `/home/hanzla/development/rihal-code/rcode/bin/rcode-hooks.cjs`:
- `INTENT_TABLE` at line 638 (16 entries mirroring do.md routing table)
- `promptRouter()` at line 828 (synchronous, keyword-matches lower-cased prompt against INTENT_TABLE, emits `hookSpecificOutput.additionalContext`)
- Advisory template at line 922: includes both `state.json` and `/rcode-memory-update`

---

## AC2: Emits nothing (exit 0) on non-matching prompts and on any internal error

**PASS**

Non-match:
```
printf '%s' '{"prompt":"what time is it"}' | node rcode/bin/rcode-hooks.cjs prompt-router
```
Output: empty. Exit code: 0.

Error-swallow (malformed JSON):
```
printf 'not json' | node rcode/bin/rcode-hooks.cjs prompt-router
```
Output: empty. Exit code: 0.

Empty stdin:
```
printf '' | node rcode/bin/rcode-hooks.cjs prompt-router
```
Output: empty. Exit code: 0.

Prompt already starting with `/rcode-` is silenced (line 861: `if (/^\/rcode-/.test(trimmed)) process.exit(0)`).

All error paths in `promptRouter()` are wrapped in a top-level `try/catch` that calls `process.exit(0)` with no output (line 933-935).

---

## AC3: .rcode/config.yaml toggle `prompt_nudge` controls aggressiveness

**PASS**

Four modes verified:

**off — fully silences:**
Created a temp project with `prompt_nudge: off` in `.rcode/config.yaml`. Matching prompt produced empty stdout, exit 0. Test `prompt_nudge: off produces no output` also passes (test suite line 158-171).

**when-stale — fires only when state is stale:**
- With no `.planning/` dir and no `state.json`: silent (not stale).
- With `.planning/` dir but no `state.json`: fires (hasPlanning=true, state absent = stale).
Logic at lines 789-816 (`isStateStaleFallbackTrue`).

**once-per-intent — dedupes within session:**
Test `once-per-intent: first call emits; second call with same session+intent is silent` passes (test suite line 175-196). Session scoped via `ppid + hourly bucket` (line 897-898).

**every (default):** Always fires on match. Confirmed by AC1 tests above. `readPromptNudgeToggle()` at line 767 returns `'every'` when key absent, file missing, or value unrecognized.

---

## AC4: UserPromptSubmit matcher in settings-hooks.json, wired opt-in only via /rcode-enable-hooks

**PASS**

`/home/hanzla/development/rihal-code/rcode/templates/settings-hooks.json` lines 74-84:
```json
"UserPromptSubmit": [
  {
    "matcher": "",
    "hooks": [
      {
        "type": "command",
        "command": "node .rcode/bin/rcode-hooks.cjs prompt-router"
      }
    ]
  }
]
```

Opt-in gating confirmed:

1. `cli/install.js` line 163: `prompt_nudge` appears only in the Zod schema as `optional()` with a comment "Install does NOT write this key; the feature stays dormant until hooks are opted into via /rcode-enable-hooks." No write path for `prompt_nudge` or `UserPromptSubmit` hook in install.js.

2. `rcode/workflows/enable-hooks.md` lines 47 and 89: `enable-hooks` workflow explicitly merges `UserPromptSubmit` from the template, and the confirmation message names `prompt-router` as one of the 9 opt-in guardrails.

3. `install.js` `mergeSlashRouterHook()` function (lines 1989-2017) is used only for the slash-router (Codex/Antigravity), not for `prompt-router`. The `prompt-router` hook is never auto-wired at install time.

---

## AC5: Tests — match, no-match, error-swallow, per-session dedupe, config toggle, and drift guard

**PASS**

All 18 tests pass:

```
node --test test/prompt-router.test.cjs test/prompt-router-install.test.cjs test/prompt-router-table-sync.test.cjs

pass 18 / fail 0 / cancelled 0 / skipped 0 / todo 0
duration_ms 610.164028
```

Coverage breakdown:

| File | Tests | Covers |
|------|-------|--------|
| `test/prompt-router.test.cjs` | 9 (+ 4 keyword-tightening) = 9 total run | match, no-match, `off` toggle, `once-per-intent` dedupe, error-swallow (malformed JSON, empty), `/rcode-` passthrough, `hookEventName` forwarded |
| `test/prompt-router-install.test.cjs` | 2 | settings-hooks.json has valid UserPromptSubmit entry; merge idempotency (double-apply yields exactly one command) |
| `test/prompt-router-table-sync.test.cjs` | 3 (sanity + 2 drift guards) | do.md parser sanity; every INTENT_TABLE command exists in do.md; new do.md routes not in INTENT_TABLE must be in known-uncovered allowlist |

Drift guard specifically: `module.exports = { INTENT_TABLE }` at line 1031, guarded by `require.main === module` at line 1024-1028, so requiring the file in tests does not trigger CLI dispatch.

---

## Additional observations (no gaps, informational only)

- `when-stale` mode uses a git-based heuristic (`state.json` mtime vs last commit timestamp). If git is unavailable, it returns `false` (don't nag) rather than failing open — this is a deliberate conservative choice documented at line 811.
- The `once-per-intent` dedupe key falls back to `ppid + hourly bucket` when no `session_id` is in the payload (line 897-898), preventing cross-session dedupe leakage.
- No `prompt_nudge` key is written into any template config file shipped during install, preserving the opt-in contract end-to-end.

---

## Summary

All 5 acceptance criteria are delivered and verified empirically. Phase 38 goal is achieved: rcode is proactive via an opt-in, dependency-free, deterministic UserPromptSubmit hook that keyword-routes prompts to rcode commands and frames the advisory around long-term memory consistency, with a config toggle, per-session dedupe, and a drift guard keeping INTENT_TABLE aligned with do.md.
