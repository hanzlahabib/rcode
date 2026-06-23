---
sprint: 38.2
goal: "Wire the prompt-router as a UserPromptSubmit hook into settings-hooks.json and the opt-in enable-hooks flow, plus declare the prompt_nudge config key, so the proactive nudge installs for Claude Code only when the user opts in. Idempotent merge, never on by default."
depends_on: [38.1]
files_modified:
  - rcode/templates/settings-hooks.json
  - rcode/workflows/enable-hooks.md
  - cli/install.js
  - test/prompt-router-install.test.cjs
sequential: false
---

# Sprint 38.2 — opt-in install wiring (settings-hooks.json + enable-hooks + config key)

**Phase:** 38 — Proactive intent router (UserPromptSubmit nudge toward rcode commands for memory consistency, #892)
**Status:** planned
**Velocity target:** 8 points
**Started:** —

## Sprint Goal

Make the Sprint 38.1 `prompt-router` subcommand reachable in a real install — but ONLY via the opt-in `/rcode-enable-hooks` flow, never on by default. Add a `UserPromptSubmit` matcher to `rcode/templates/settings-hooks.json` (the template the enable-hooks workflow merges into `.claude/settings.json`), update `enable-hooks.md` so its purpose/confirmation text and success criteria reflect the new guardrail, and declare `prompt_nudge` in the config schema so it validates. The Claude install path itself currently writes NO `.claude/settings.json` hooks (verified: hooks are exclusively opt-in via enable-hooks merging settings-hooks.json) — so "wired into the Claude Code install path" is satisfied by the template + enable-hooks flow, not by adding always-on settings.json writes.

## Stories

| ID | Title | Points | Status | Done when |
|----|-------|--------|--------|-----------|
| 38.2.1 | Add UserPromptSubmit prompt-router matcher to settings-hooks.json | 3 | planned | `rcode/templates/settings-hooks.json` has a `UserPromptSubmit` hook group running `node .rcode/bin/rcode-hooks.cjs prompt-router`; file stays valid JSON; existing PreToolUse/PostToolUse/PreCompact/Stop groups untouched. |
| 38.2.2 | Update enable-hooks.md for the prompt-router guardrail | 2 | planned | `enable-hooks.md` purpose, Step 3 hook-type list, and the Step 5.5 confirmation enumerate `prompt-router` (memory-consistency nudge); the merge handles the `UserPromptSubmit` event type. |
| 38.2.3 | Declare `prompt_nudge` in the config schema | 1 | planned | `ConfigSchema` in `cli/install.js` accepts `prompt_nudge` as an optional enum (`every | once-per-intent | when-stale | off`); install no longer needs to write it (default lives in the hook), but validation does not reject it. |
| 38.2.4 | `test/prompt-router-install.test.cjs` — template + merge idempotency | 2 | planned | `node --test test/prompt-router-install.test.cjs` passes: asserts settings-hooks.json contains the UserPromptSubmit prompt-router entry and is valid JSON; asserts a simulated merge into an existing settings.json is idempotent (no duplicate prompt-router command on re-merge). |

## Capacity

- **Velocity target:** 8 points
- **Total committed:** 8 points
- **Buffer:** 0 points (0%)

## Dependencies

| Story | Depends on | Status |
|-------|-----------|--------|
| 38.2.* | 38.1 (the `prompt-router` subcommand must exist before wiring it) | planned |

## Stories — detail

### Story 38.2.1 — Add UserPromptSubmit prompt-router matcher to settings-hooks.json

<objective>
Register the prompt-router as a `UserPromptSubmit` hook in the template that `/rcode-enable-hooks` merges, so opting into hooks turns on the proactive nudge.
</objective>

<action>
- Edit `rcode/templates/settings-hooks.json`. Add a top-level `UserPromptSubmit` key (sibling to `PreToolUse`, `PostToolUse`, `PreCompact`, `Stop`) inside the `hooks` object:
  ```json
  "UserPromptSubmit": [
    {
      "matcher": "",
      "hooks": [
        { "type": "command", "command": "node .rcode/bin/rcode-hooks.cjs prompt-router" }
      ]
    }
  ]
  ```
- Match the existing formatting/indent (2-space). Do not reorder or modify the existing groups.
- Update the leading `_comment` if needed to note the prompt-router is advisory (emits additionalContext, never blocks).
</action>

<verify>
<automated>
node -e "const c=JSON.parse(require('fs').readFileSync('rcode/templates/settings-hooks.json','utf8')); const g=c.hooks.UserPromptSubmit; if(!Array.isArray(g))throw new Error('UserPromptSubmit missing'); const cmds=g.flatMap(x=>x.hooks||[]).map(h=>h.command); if(!cmds.some(x=>/prompt-router/.test(x)))throw new Error('prompt-router command missing'); if(!c.hooks.PreToolUse||!c.hooks.Stop)throw new Error('existing groups disturbed');"
</automated>
</verify>

### Story 38.2.2 — Update enable-hooks.md for the prompt-router guardrail

<objective>
Keep the opt-in workflow's documentation truthful: the merge now installs a ninth guardrail, the proactive memory-consistency nudge.
</objective>

<action>
- Edit `rcode/workflows/enable-hooks.md`:
  - `<purpose>`: change "all 8 guardrails" → "all 9 guardrails" and append "prompt-router (proactive nudge toward the right rcode command for long-term memory consistency)".
  - Step 3 ("For each hook type (`PreToolUse`, `PostToolUse`)"): add `UserPromptSubmit` to the enumerated hook types so the merge covers it. (PreCompact/Stop are already merged in practice via the template; align the wording with the real template's full key set: PreToolUse, PostToolUse, PreCompact, Stop, UserPromptSubmit.)
  - Step 5.5 confirmation block: add a bullet `• prompt-router: Nudges toward the matching /rcode-* command and /rcode-memory-update so work lands in .rcode/state.json (toggle via prompt_nudge in .rcode/config.yaml: every|once-per-intent|when-stale|off)`.
  - Success Criteria: no change needed unless a criterion enumerates hook count.
- Do NOT change the merge mechanics (duplicate detection by command match still applies and already covers the new entry).
</action>

<verify>
<automated>
node -e "const s=require('fs').readFileSync('rcode/workflows/enable-hooks.md','utf8'); if(!/prompt-router/.test(s))throw new Error('prompt-router not documented'); if(!/prompt_nudge/.test(s))throw new Error('prompt_nudge toggle not documented'); if(!/UserPromptSubmit/.test(s))throw new Error('UserPromptSubmit not in merge step');"
</automated>
</verify>

### Story 38.2.3 — Declare `prompt_nudge` in the config schema

<objective>
Ensure a user who sets `prompt_nudge` in `.rcode/config.yaml` passes install-time zod validation, and the key is documented as a first-class option.
</objective>

<action>
- Edit the `ConfigSchema` z.object in `cli/install.js` (around line 138). Add:
  ```js
  prompt_nudge: z.enum(['every', 'once-per-intent', 'when-stale', 'off']).optional(),
  ```
  Note `ConfigSchema` is already `.passthrough()`, so an unknown key wouldn't error — but declaring it gives an explicit allowed-value list and self-documents the option.
- Do NOT make install write `prompt_nudge` into config.yaml. The default (`every`) lives in the hook (Sprint 38.1.3) so the feature is dormant until hooks are opted into. Adding it to the generated config would risk turning behaviour on implicitly.
</action>

<verify>
<automated>
node -e "const s=require('fs').readFileSync('cli/install.js','utf8'); if(!/prompt_nudge/.test(s))throw new Error('prompt_nudge not in ConfigSchema'); if(!/once-per-intent/.test(s))throw new Error('enum values missing');"
node --check cli/install.js
</automated>
</verify>

### Story 38.2.4 — `test/prompt-router-install.test.cjs` — template + merge idempotency

<objective>
Lock in that the template carries the prompt-router entry and that merging it into an existing settings.json twice does not duplicate the command (the same idempotency contract the slash-router wiring enforces).
</objective>

<action>
- Create `test/prompt-router-install.test.cjs` using `node:test` / `node:assert`.
- Test 1 — **template present & valid**: read `rcode/templates/settings-hooks.json`, JSON.parse it, assert `hooks.UserPromptSubmit` exists and some command matches `/prompt-router/`.
- Test 2 — **merge idempotency (simulated)**: write a minimal `settings.json` containing only an unrelated `PreToolUse` hook into a `mkdtempSync` dir; apply the merge logic the enable-hooks flow describes (append UserPromptSubmit group from the template, skipping a command that already exists by substring); run it twice; assert the resulting `UserPromptSubmit` group contains exactly one `prompt-router` command after the second merge. Implement the merge inline in the test (mirroring `mergeSlashRouterHook`'s "skip if command substring already present" rule) — the goal is to verify the contract the workflow promises, not to import install.js internals. Clean up the temp dir.
</action>

<verify>
<automated>
node --test test/prompt-router-install.test.cjs
</automated>
</verify>

## Files Touched

**Creates:**
- `test/prompt-router-install.test.cjs` — verifies template entry + merge idempotency

**Modifies:**
- `rcode/templates/settings-hooks.json` — adds the UserPromptSubmit prompt-router hook group
- `rcode/workflows/enable-hooks.md` — documents the new guardrail + prompt_nudge toggle
- `cli/install.js` — declares `prompt_nudge` in ConfigSchema

**Tests:**
- `test/prompt-router-install.test.cjs` — covers 38.2.1 and merge idempotency

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Adding UserPromptSubmit to the template turns the nudge on for everyone with hooks already enabled, on next merge | Surprise behaviour | Acceptable per phase decisions (opt-in = hooks enabled); default `prompt_nudge: every` is the locked default; `off` fully silences. Document in enable-hooks confirmation so users see it. |
| Merge logic in enable-hooks.md is LLM-executed, not code | Possible duplicate entries | Idempotency test encodes the contract; the slash-router precedent (`mergeSlashRouterHook`) shows the substring-skip rule works |
