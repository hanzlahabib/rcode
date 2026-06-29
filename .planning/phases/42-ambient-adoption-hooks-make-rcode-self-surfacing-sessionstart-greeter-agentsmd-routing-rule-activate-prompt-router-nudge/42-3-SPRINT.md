---
sprint: 42.3
goal: "Dogfood both hooks in this repo: merge UserPromptSubmit (prompt-router) + SessionStart (session-start) into .claude/settings.json without clobbering the two existing dev hooks; verify prompt_nudge config default. (#892)"
depends_on:
  - 42.2
files_modified:
  - .claude/settings.json
  - .rcode/config.yaml
sequential_after: 42.2
---

# Sprint 42.3 — Activate prompt-router + session-start hooks (dogfood) (#892)

**Phase:** 42 — Ambient adoption hooks — make rcode self-surfacing
**Status:** planned
**Velocity target:** 8 points
**Started:** —

## Sprint Goal

Wire the prompt-router (`UserPromptSubmit`) and session-start (`SessionStart`) hooks into this repository's `.claude/settings.json` so rcode dogfoods its own ambient adoption hooks when working on itself. This is an additive idempotent merge — the two existing dev hooks (`block-unregistered-phase-writes.sh` under `PreToolUse` and `sync-bin-on-edit.sh` under `PostToolUse`) must be preserved exactly.

Also confirm `.rcode/config.yaml` exposes the `prompt_nudge` key with a comment; the key is absent today, and the default when absent is `every` — no behavioral change needed, but a commented stub makes the toggle discoverable.

**Prerequisite:** Sprint 42-2 must be complete (SessionStart entry must exist in `rcode/templates/settings-hooks.json` and `session-start` subcommand must exist in `.rcode/bin/rcode-hooks.cjs`).

## Stories

| ID | Title | Points | Status | Done when |
|----|-------|--------|--------|-----------|
| 42.3.01 | Merge UserPromptSubmit + SessionStart hooks into `.claude/settings.json` | 5 | planned | `.claude/settings.json` contains both the existing dev hooks (unchanged) AND new `UserPromptSubmit` (prompt-router) and `SessionStart` (session-start) entries; file is valid JSON; `node -e "JSON.parse(...)"` passes. |
| 42.3.02 | Add discoverable `prompt_nudge` stub to `.rcode/config.yaml` | 2 | planned | `.rcode/config.yaml` contains a commented `# prompt_nudge: every  # every|once-per-intent|when-stale|off` stub; existing config keys are unchanged; YAML is valid. |
| 42.3.03 | Smoke-test the activated hooks | 1 | planned | `node .rcode/bin/rcode-hooks.cjs session-start < /dev/null` exits 0 and emits JSON with a `systemMessage` key (or exits 0 silently if no state.json context); `node .rcode/bin/rcode-hooks.cjs prompt-router` with a planning prompt exits 0. |

## Capacity

- **Velocity target:** 8 points
- **Total committed:** 8 points
- **Buffer:** 0 points (0%)

## Stories — detail

### Story 42.3.01 — Merge UserPromptSubmit + SessionStart hooks into `.claude/settings.json`

<objective>
Read the current `.claude/settings.json` (which has PreToolUse and PostToolUse dev hooks) and add:
1. A `UserPromptSubmit` array with the prompt-router hook command
2. A `SessionStart` array with the session-start hook command

Preserve the existing `$comment`, `PreToolUse`, and `PostToolUse` entries exactly.
</objective>

<action>
Read the current `.claude/settings.json`:

```json
{
  "$comment": "Project-level Claude Code settings. Checked in. Hooks: (1) PostToolUse auto-syncs rcode/bin → .rcode/bin (#470), (2) PreToolUse blocks unregistered phase writes (#475).",
  "hooks": {
    "PreToolUse": [...],
    "PostToolUse": [...]
  }
}
```

Write the merged `.claude/settings.json` as follows (preserving existing hooks verbatim, adding two new blocks):

```json
{
  "$comment": "Project-level Claude Code settings. Checked in. Hooks: (1) PostToolUse auto-syncs rcode/bin → .rcode/bin (#470), (2) PreToolUse blocks unregistered phase writes (#475), (3) UserPromptSubmit prompt-router nudge (#892), (4) SessionStart greeter (#947).",
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/block-unregistered-phase-writes.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": ".claude/hooks/sync-bin-on-edit.sh"
          }
        ]
      }
    ],
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
    ],
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .rcode/bin/rcode-hooks.cjs session-start"
          }
        ]
      }
    ]
  }
}
```

CRITICAL: Read the current `.claude/settings.json` first and reproduce the `PreToolUse` and `PostToolUse` blocks exactly as they appear (do not paraphrase). If the current file differs from the version shown above, use the actual current content for those blocks.
</action>

<verify>
<automated>
node -e "const j=JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); const h=j.hooks; if(!h.PreToolUse)throw new Error('PreToolUse missing'); if(!h.PostToolUse)throw new Error('PostToolUse missing'); if(!h.UserPromptSubmit)throw new Error('UserPromptSubmit missing'); if(!h.SessionStart)throw new Error('SessionStart missing'); const pt=h.PreToolUse[0].hooks[0].command; if(!pt.includes('block-unregistered'))throw new Error('dev hook PreToolUse clobbered'); const po=h.PostToolUse[0].hooks[0].command; if(!po.includes('sync-bin'))throw new Error('dev hook PostToolUse clobbered'); console.log('all hooks present, dev hooks preserved');"
</automated>
</verify>

### Story 42.3.02 — Add discoverable `prompt_nudge` stub to `.rcode/config.yaml`

<objective>
Add a commented stub for `prompt_nudge` to `.rcode/config.yaml` so users can discover the toggle without hunting through source code. The key is commented out (so the default `every` behavior is unchanged). All existing config keys are preserved.
</objective>

<action>
Read `.rcode/config.yaml` (current content verified earlier):

```yaml
user_name: hanzla
project_name: rcode
communication_language: Mixed
mode: yolo
model_profile: balanced
commit_planning: true
model_override:
rcode_source_path:
workflow:
  research_by_default: false
  plan_checker: true
  post_execute_gates: true
  ui_safety_gate: true
  discuss_mode: adaptive
  _auto_chain_active: false
git:
  branching_strategy: feature-branch
```

Add the following block at the end of the file:

```yaml

# prompt_nudge controls how aggressively the UserPromptSubmit hook nudges toward rcode commands.
# Valid values: every (default) | once-per-intent | when-stale | off
# Uncomment and set to change behavior:
# prompt_nudge: every
```

This is a comment-only addition — no YAML keys are added or changed, so the `readPromptNudgeToggle` function still returns `every` (default when key absent). The stub is purely for discoverability.
</action>

<verify>
<automated>
grep "prompt_nudge" .rcode/config.yaml
# Verify existing keys are still present
grep "model_profile" .rcode/config.yaml
grep "branching_strategy" .rcode/config.yaml
</automated>
</verify>

### Story 42.3.03 — Smoke-test the activated hooks

<objective>
Run both newly wired hooks against the local repo state to confirm they fire correctly (or fail open gracefully). This is a runtime sanity check after the wiring.
</objective>

<action>
Run the following checks in order:

1. Test `session-start` — supply empty stdin (SessionStart sends no body in some implementations):
   ```bash
   printf '' | node .rcode/bin/rcode-hooks.cjs session-start; echo "exit: $?"
   ```
   Expected: exits 0; may emit a JSON `systemMessage` line or nothing if state.json has no matching phase.

2. Test `prompt-router` with a planning prompt:
   ```bash
   printf '{"prompt":"let us plan the next phase for rcode"}' | node .rcode/bin/rcode-hooks.cjs prompt-router; echo "exit: $?"
   ```
   Expected: exits 0; emits JSON with `hookSpecificOutput.additionalContext` naming `/rcode-plan` or similar.

3. Verify `.claude/settings.json` is valid JSON with all 4 hook types:
   ```bash
   node -e "const j=JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); console.log(Object.keys(j.hooks));"
   ```
   Expected output: `[ 'PreToolUse', 'PostToolUse', 'UserPromptSubmit', 'SessionStart' ]`
</action>

<verify>
<automated>
printf '' | node .rcode/bin/rcode-hooks.cjs session-start; test $? -eq 0
printf '{"prompt":"let us plan the next phase for rcode"}' | node .rcode/bin/rcode-hooks.cjs prompt-router; test $? -eq 0
node -e "const j=JSON.parse(require('fs').readFileSync('.claude/settings.json','utf8')); const k=Object.keys(j.hooks); if(!k.includes('UserPromptSubmit'))throw new Error('UserPromptSubmit missing'); if(!k.includes('SessionStart'))throw new Error('SessionStart missing'); console.log('OK:', k);"
</automated>
</verify>

## Files Touched

**Modifies:**
- `.claude/settings.json` — additive merge: adds `UserPromptSubmit` (prompt-router) and `SessionStart` (session-start) blocks; updates `$comment`; preserves existing dev hooks verbatim
- `.rcode/config.yaml` — appends commented `prompt_nudge` discovery stub (no active key change)

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `.claude/settings.json` edit clobbers existing dev hooks | `block-unregistered-phase-writes.sh` and `sync-bin-on-edit.sh` stop firing | Story 42.3.01 action explicitly preserves existing blocks; verify step asserts dev hooks are present |
| `session-start` fires before Sprint 42-2 ships the subcommand | `node .rcode/bin/rcode-hooks.cjs session-start` errors on unknown subcommand | Sprint 42-3 depends on 42-2 (sequential_after); executor must not run 42-3 until 42-2 is committed |
| `prompt_nudge` stub comment breaks YAML parsing | `readPromptNudgeToggle` throws | Stub is a pure comment line; YAML comments are always valid |
