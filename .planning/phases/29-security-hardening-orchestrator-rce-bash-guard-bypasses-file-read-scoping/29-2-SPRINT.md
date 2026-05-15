---
phase: 29
plan_number: 2
sprint: 29.2
type: execute
wave: 1
depends_on: []
files_modified:
  - rihal/bin/rihal-hooks.cjs
  - test/bash-guard-hook.test.cjs
autonomous: true
requirements: [REQ-753]
must_haves:
  truths:
    - "`echo RIHAL_PUSH_OK; git push` is BLOCKED — the token only un-gates a push when it is a real env-var prefix."
    - "`git push origin +main` is BLOCKED — a `+`-prefixed refspec is recognized as a force-push."
    - "A genuine `RIHAL_PUSH_OK=1 git push origin main` is still ALLOWED."
  artifacts:
    - "rihal/bin/rihal-hooks.cjs — anchored token regex, +-refspec detection, best-effort comment"
    - "test/bash-guard-hook.test.cjs — bypass regression cases added"
  key_links:
    - "bashGuard is registered as a PreToolUse:Bash hook — exit 2 blocks, exit 0 allows."
---

<objective>
Close two bash-guard bypasses in `rihal/bin/rihal-hooks.cjs` (#753).
Purpose: (1) `RIHAL_PUSH_OK` is matched as a bare substring anywhere in the command, so `echo RIHAL_PUSH_OK; git push` un-gates a real unapproved push; (2) a `+`-prefixed refspec force-push (`git push origin +main`) matches neither `--force` nor `-f` and slips through the force-push block.
Output: token anchored as a real env-var prefix, `+`-refspec detected as force-push, a code comment documenting the guard as best-effort, and bypass regression tests.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
</context>

<tasks>

<task id="29.2.1" type="auto">
<title>Anchor RIHAL_PUSH_OK as a real env-var prefix, not a substring</title>
<read_first>
- rihal/bin/rihal-hooks.cjs lines 190-221 (bashGuard: isPush detection, force block, the substring token check at line 216)
</read_first>
<files>rihal/bin/rihal-hooks.cjs</files>
<action>
Replace the token check at line 216 (`!/RIHAL_PUSH_OK/.test(command)`) with an anchored regex that only matches the token as a leading env-var assignment on the command: `/^\s*RIHAL_PUSH_OK=1(\s|$)/`. This means `echo RIHAL_PUSH_OK; git push` no longer matches (the token is mid-command text, not a prefix), while `RIHAL_PUSH_OK=1 git push origin main` still matches. Note the `=1` value is now required — bare `RIHAL_PUSH_OK` with no value will no longer un-gate. Keep the existing `block(...)` call and guidance message; just update the test condition. Add a code comment above the check: `// Token must be a real leading env-var assignment — substring match is bypassable via 'echo RIHAL_PUSH_OK; git push'.`
</action>
<acceptance_criteria>
- `grep -n "RIHAL_PUSH_OK=1" rihal/bin/rihal-hooks.cjs` shows the anchored `^\s*` regex.
- `grep -c "RIHAL_PUSH_OK/.test" rihal/bin/rihal-hooks.cjs` returns 0 (old substring check gone).
</acceptance_criteria>
<verify>
<automated>
node -c rihal/bin/rihal-hooks.cjs && grep -q "RIHAL_PUSH_OK=1" rihal/bin/rihal-hooks.cjs && ! grep -q "RIHAL_PUSH_OK/.test" rihal/bin/rihal-hooks.cjs && echo PASS
</automated>
</verify>
<done>The token only un-gates a push when present as a leading `RIHAL_PUSH_OK=1 ` env prefix; substring occurrences are ignored.</done>
<evidence>lines: rihal/bin/rihal-hooks.cjs:216 (`if (isPush && !/RIHAL_PUSH_OK/.test(command))` — the substring bug)</evidence>
</task>

<task id="29.2.2" type="auto">
<title>Detect +-prefixed refspec force-push and document the guard as best-effort</title>
<read_first>
- rihal/bin/rihal-hooks.cjs lines 205-221 (isPush, force-push block at 208, push-approval block at 216)
- rihal/bin/rihal-hooks.cjs lines 182-189 (bashGuard doc comment)
</read_first>
<files>rihal/bin/rihal-hooks.cjs</files>
<action>
1. Extend the force-push detection at line 208. A `+`-prefixed refspec (`git push origin +main`, `git push origin +HEAD:main`) is a force-push. Add a clause: when `isPush`, check the command for a refspec token starting with `+` — match `(?:^|\s)\+[^\s]+` appearing AFTER the `git push` portion. Simplest robust approach: split the command on whitespace, drop tokens up to and including `push`, and if any remaining non-flag token starts with `+`, treat it as a force-push. Route it through the same `block('git push --force is never permitted.', ...)` call. Note `+` is not a glob/option so a leading-`+` token is unambiguous.
2. Update the bashGuard doc comment (lines 182-189) — append a sentence: `This guard is best-effort, NOT a security boundary: a determined caller can still craft a bypass (e.g. obscure git aliases). It enforces AGENTS.md conventions, not a sandbox.`
</action>
<acceptance_criteria>
- `grep -n "best-effort" rihal/bin/rihal-hooks.cjs` returns >= 1 match in the bashGuard comment block.
- `+`-refspec detection logic present and routes to the force-push block.
</acceptance_criteria>
<verify>
<automated>
node -c rihal/bin/rihal-hooks.cjs && grep -q "best-effort" rihal/bin/rihal-hooks.cjs && echo PASS
</automated>
</verify>
<done>`git push origin +main` is blocked as a force-push; the guard is documented as best-effort, not a security boundary.</done>
<evidence>lines: rihal/bin/rihal-hooks.cjs:208 (`/(--force\b|--force-with-lease\b|(?:^|\s)-f\b)/` — does not match `+main`), :182-189 (doc comment to amend)</evidence>
</task>

<task id="29.2.3" type="auto">
<title>Add bash-guard bypass regression tests</title>
<read_first>
- test/bash-guard-hook.test.cjs lines 19-43 (runGuard helper, existing push tests)
</read_first>
<files>test/bash-guard-hook.test.cjs</files>
<action>
Add new `test(...)` cases to `test/bash-guard-hook.test.cjs` (do not modify existing cases):
1. `test('substring RIHAL_PUSH_OK does not un-gate a push', ...)` — assert `runGuard('echo RIHAL_PUSH_OK; git push')` === BLOCKED, and `runGuard('git push # RIHAL_PUSH_OK')` === BLOCKED.
2. `test('+-prefixed refspec force-push is blocked', ...)` — assert `runGuard('git push origin +main')` === BLOCKED, `runGuard('RIHAL_PUSH_OK=1 git push origin +main')` === BLOCKED, `runGuard('git push origin +HEAD:refs/heads/main')` === BLOCKED.
3. `test('genuine authorized push still works', ...)` — assert `runGuard('RIHAL_PUSH_OK=1 git push origin main')` === ALLOWED (no regression).
</action>
<acceptance_criteria>
- `node --test test/bash-guard-hook.test.cjs` passes with all old + new cases.
- New cases cover both the substring bypass and the `+`-refspec bypass.
</acceptance_criteria>
<verify>
<automated>
node --test test/bash-guard-hook.test.cjs && echo PASS
</automated>
</verify>
<done>`node --test test/bash-guard-hook.test.cjs` passes; both bypasses proven closed and the authorized-push path proven intact.</done>
<evidence>lines: test/bash-guard-hook.test.cjs:30-43 (existing push tests — extend, do not replace)</evidence>
</task>

</tasks>

<verification>
- `node -c rihal/bin/rihal-hooks.cjs` parses clean.
- `node --test test/bash-guard-hook.test.cjs` passes.
- `node --test` across the repo shows no new failures.
</verification>

<success_criteria>
- `echo RIHAL_PUSH_OK; git push` is BLOCKED.
- `git push origin +main` is BLOCKED.
- `RIHAL_PUSH_OK=1 git push origin main` is still ALLOWED.
- bashGuard comment states it is best-effort, not a security boundary.
</success_criteria>

<output>
Create `.planning/phases/29-security-hardening-orchestrator-rce-bash-guard-bypasses-file-read-scoping/29-2-SUMMARY.md`
</output>
