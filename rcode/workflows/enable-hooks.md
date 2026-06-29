# Workflow: rcode-enable-hooks

<purpose>
Merge rcode opt-in hooks from settings-hooks.json into .claude/settings.json. Creates settings.json if missing. Enables all 10 guardrails: pre-edit (read-before-edit check), pre-workflow (command hint), post-commit (format validation), bash-guard (blocks dangerous commands), pre-compact (refreshes HANDOFF.json before context compaction), stop-verify (syntax-checks files changed during the response), cost-track (logs measured token usage to .rcode/telemetry/cost.jsonl), compact-nudge (advises /rcode-trim or /clear after many edits), prompt-router (proactive nudge toward the right rcode command for long-term memory consistency), and session-start (SessionStart — one-line project status primer at session open).
</purpose>


## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:

```
/rcode-enable-hooks <argument-here>
```

**Examples:**
```
/rcode-enable-hooks example 1
/rcode-enable-hooks example 2
```

STOP — do not proceed.

## Step 1 — Load hooks template

```bash
cat .rcode/templates/settings-hooks.json
```

Parse the JSON. If file does not exist, print error and stop:

```
Error: .rcode/templates/settings-hooks.json not found. Run 'npx @hanzlaa/rcode install' to reinstall.
```

## Step 2 — Load or create settings.json

Check if `.claude/settings.json` exists in the project root.

- **If it exists:** Read and parse it. Merge incoming hooks into the existing `hooks` object (or create if missing).
- **If it does not exist:** Create a minimal settings.json with the hooks from step 1.

If `.claude/` directory does not exist, create it first.

## Step 3 — Merge hooks

For each hook type (`PreToolUse`, `PostToolUse`, `PreCompact`, `Stop`, `UserPromptSubmit`, `SessionStart`):

- If the hook type does not exist in the current settings.json, add it.
- If it exists, append the new matchers and hook commands (avoid duplicates by checking for exact command matches).

**Duplicate detection:** If a matcher + command pair already exists, skip it.

## Step 4 — Write merged settings.json

Write the merged settings.json back to `.claude/settings.json` with proper JSON formatting (2-space indent).

## Step 5 — Verify hook binary

Verify that the hook binary exists and is executable:

```bash
if [ ! -f .rcode/bin/rcode-hooks.cjs ]; then
  echo "⚠ Hook binary missing at .rcode/bin/rcode-hooks.cjs"
  echo "  Run: npx @hanzlaa/rcode install --force --yes"
  exit 1
fi
node .rcode/bin/rcode-hooks.cjs --help 2>&1 || true
```

If the binary is missing, print error and stop. Otherwise, test it with `--help` (ignore exit code).

## Step 5.5 — Print confirmation

Print success message:

```
✓ rcode hooks installed to .claude/settings.json

Enabled guardrails:
  • pre-edit: Verifies files are Read() before Edit/Write
  • pre-workflow: Warns if rcode-* commands look suspicious
  • post-commit: Validates commit format and bans "Generated with Claude" patterns
  • bash-guard: Blocks unapproved git push, --force, --no-verify, and unscoped rm -rf
  • pre-compact: Refreshes HANDOFF.json before context compaction
  • stop-verify: Syntax-checks files changed during the response
  • cost-track: Logs measured token usage to .rcode/telemetry/cost.jsonl
  • compact-nudge: Advises /rcode-trim or /clear after many edits
  • prompt-router: Nudges toward the matching /rcode-* command and /rcode-memory-update so work lands in .rcode/state.json (toggle via prompt_nudge in .rcode/config.yaml: every|once-per-intent|when-stale|off)
  • session-start: Greets the session with one-line phase status and suggested next command

To disable, remove the hooks section from .claude/settings.json or edit .rcode/templates/settings-hooks.json and re-run.
```

## Success Criteria

- [ ] `.claude/settings.json` created or updated with hooks merged
- [ ] No duplicate hook entries in merged settings
- [ ] File written with valid JSON formatting
- [ ] Confirmation message printed to user

## On Error

- **Template not found:** print error and stop (Step 1).
- **`.claude/` directory creation fails:** print error and stop.
- **state.json missing:** continue without error — hooks installation is standalone.
- **settings.json has invalid JSON:** print error with path and stop.
- **Permission denied writing .claude/settings.json:** print error and stop.
- **Merge produces duplicate hooks:** skip duplicates (Step 3).

## Next Up

- `/rcode-settings` — configure additional project settings
- `/rcode-do` — continue with guardrails now active
