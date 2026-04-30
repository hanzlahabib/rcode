# PostToolUse Hooks for Auto-Heal

Layer real-time drift detection on top of the manual auto-heal tools. When you edit a doc, story, or spec, a hook fires `/rihal-feature-drift --quick` automatically. Findings show up in your conversation. The hook **never modifies files** — it's strictly report-only.

## What the hook does

Triggers on **PostToolUse** (after Claude Code's Edit / Write tools complete) when the touched file matches:

```
docs/**/*.md
.planning/**/*.md
prd/**/*.md
epics/**/*.md
stories/**/*.md
```

Runs `/rihal-feature-drift --quick` against the project, surfaces any drift the audit finds. Target runtime: **<2 seconds**. Designed not to block your edit flow.

## Why PostToolUse, not PreToolUse

PreToolUse blocks the edit until the hook returns. That's wrong for drift detection — we want to know AFTER the edit, when the new state can be compared against the rest of the chain. PreToolUse would fire on the OLD state and miss what just changed.

PostToolUse is also non-blocking — your edit lands, the drift report comes shortly after as a tool result. If the hook errors or hangs, the edit isn't undone.

## Safety: `--quick` is always report-only

The `--quick` flag in `feature-drift.md` is hard-coded to suppress `--fix` regardless of other arguments. Even if a malicious or buggy hook config tries `feature-drift --quick --fix`, the workflow logs a notice that `--fix` was suppressed and runs report-only. Hooks **cannot mutate files** through this mechanism. Period.

This is enforced in `rihal/workflows/feature-drift.md` parse_args step:

```bash
if [[ "$ARGUMENTS" =~ (^|[[:space:]])--quick($|[[:space:]]) ]]; then
  QUICK_MODE=true
  FIX_MODE=false   # safety override, intentional
fi
```

If you want auto-fix behavior, run `feature-drift --fix` manually outside the hook context. Never configure `--fix` in any settings.json hook.

## Opt-in via `/rihal-enable-hooks`

The hook is **off by default**. To enable, run `/rihal-enable-hooks` (or paste the JSON block below into your `.claude/settings.json` manually).

### settings.json block

Add this to `.claude/settings.json` under the `"hooks"` key:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/feature-drift-quick.js \"$CLAUDE_TOOL_INPUT_FILE_PATH\"",
            "filePatterns": [
              "docs/**/*.md",
              ".planning/**/*.md",
              "prd/**/*.md",
              "epics/**/*.md",
              "stories/**/*.md"
            ]
          }
        ]
      }
    ]
  }
}
```

The hook command resolves to a small wrapper at `.claude/hooks/feature-drift-quick.js` that invokes the workflow. The wrapper:

1. Verifies the touched file matches one of the listed patterns (defense-in-depth — `filePatterns` is the primary gate but the wrapper double-checks).
2. Spawns `/rihal-feature-drift --quick` via the same Skill mechanism Claude Code uses internally.
3. Prints findings to stdout. Claude Code surfaces them as a tool result in the conversation.
4. Returns exit 0 even on findings — the hook reports, it doesn't fail builds.

## Disabling the hook

Either:
- Remove the `PostToolUse` block from `.claude/settings.json`
- Or run `/rihal-enable-hooks --disable` (if the skill exposes a teardown path)

Disabling is reversible — re-running `/rihal-enable-hooks` puts it back.

## When to enable vs skip

**Enable** if:
- Your team is ≥3 people editing PRD / epics / stories concurrently
- You've shipped phase 6+ and are accumulating documentation that drifts
- Your workflow has a habit of "I'll fix the doc later" (the hook won't let later happen silently)

**Skip** if:
- You're a solo dev with a small project — manual `/rihal-feature-drift` weekly is enough
- Your repo is mostly code with minimal docs — false-positive rate will be high
- You're not opted into Claude Code's hook system at all

## What you'll see

When the hook fires after an edit, expect a tool-result block in your conversation that looks like:

```
✓ feature-drift --quick: 0 findings (clean)
```

or

```
⚠ feature-drift --quick: 2 findings
  - [trivial] PRD line 47: stale date "2025-12-31" — code references suggest 2026
  - [minor] epic 03: claims "uses Postgres" but stack.md says "uses Neon"
  Full report: .planning/audits/feature-drift-2026-04-29T15-22.md
```

Findings ≥ minor are surfaced inline. Trivial-only runs are usually quiet (just a checkmark).

## Cadence relationship

The hook complements `/rihal-feature-drift` on its scheduled cadence (see [AUTO-HEAL-CADENCE.md](AUTO-HEAL-CADENCE.md)):

- **Hook** — fires on every doc edit, `--quick`, surfaces drift introduced by THIS edit
- **CI dogfood gate** — fires on every push, full mode (no `--quick`), surfaces drift accumulated since last push
- **Daily/weekly schedule** — fires on a clock, full mode, catches drift the hook + CI missed (rare)

You don't need all three. Pick based on your team size and edit volume.
