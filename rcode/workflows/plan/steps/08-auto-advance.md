# plan - step 08: Auto-advance check (only when --auto / chained execution applies)

This step file was split verbatim out of `workflows/plan.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

## 15. Auto-Advance Check

Check for auto-advance trigger:

1. Parse `--auto` and `--chain` flags from $ARGUMENTS
2. **Sync chain flag with intent** — if user invoked manually (no `--auto` and no `--chain`), clear the ephemeral chain flag from any previous interrupted `--auto` chain. This does NOT touch `workflow.auto_advance` (the user's persistent settings preference):
   ```bash
   if [[ ! "$ARGUMENTS" =~ --auto ]] && [[ ! "$ARGUMENTS" =~ --chain ]]; then
     node ".rcode/bin/rcode-tools.cjs" config-set workflow._auto_chain_active false 2>/dev/null
   fi
   ```
3. Read both the chain flag and user preference:
   ```bash
   AUTO_CHAIN=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow._auto_chain_active 2>/dev/null || echo "false")
   AUTO_CFG=$(node ".rcode/bin/rcode-tools.cjs" config-get workflow.auto_advance 2>/dev/null || echo "false")
   ```

**If `--auto` or `--chain` flag present AND `AUTO_CHAIN` is not true:** Persist chain flag to config (handles direct invocation without prior discuss-phase):
```bash
if ([[ "$ARGUMENTS" =~ --auto ]] || [[ "$ARGUMENTS" =~ --chain ]]) && [[ "$AUTO_CHAIN" != "true" ]]; then
  node ".rcode/bin/rcode-tools.cjs" config-set workflow._auto_chain_active true
fi
```

**`AUTO_CFG` alone is NOT sufficient.** A persistent `workflow.auto_advance: true`
in settings must never silently turn "plan this" into "plan and build this". The
user's invocation is their declared scope: they typed a planning command, so
planning is what was authorized. A config flag set weeks ago is not consent for
this build.

Confirmed live: a user asked for a project to be planned, `auto_advance` was on,
and the session planned and then built a WordPress theme, then migrated the whole
thing to Astro to undo its own stack choice. The user's words were "plan karo".
Nothing in the loop stopped at the boundary they actually drew.

**If `AUTO_CFG` is true but neither `--auto`/`--chain` nor `AUTO_CHAIN` is set:**
ask before advancing, and default to stopping:

```
AskUserQuestion:
  question: "Plans are ready. auto_advance is on in your config — execute phase {N} now?"
  options:
    - label: "Stop here (Recommended)"
      description: "Plans written and verified. Review them, then run /rcode-execute {N} when ready."
    - label: "Execute now"
      description: "Chain straight into execution, as auto_advance requests."
```

In `--text` mode present this as a numbered list. If the user does not answer,
STOP — an unanswered question is not approval.

**If `--auto` or `--chain` flag present OR `AUTO_CHAIN` is true:**

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► AUTO-ADVANCING TO EXECUTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plans ready. Launching execute-phase...
```

Launch execute-phase using the Skill tool to avoid nested Task sessions (which cause runtime freezes due to deep agent nesting). Skill() keeps execute.md running in this same context — set `AUTO_CHAINED_FROM_PLAN=true` so execute.md's required_reading doesn't re-read files this context already loaded (see AUDIT-workflow-complexity.md finding 3):
```
AUTO_CHAINED_FROM_PLAN=true
Skill(skill="rcode-execute", args="${PHASE} --auto --no-transition ${RCODE_WS}")
```

The `--no-transition` flag tells execute-phase to return status after verification instead of chaining further. This keeps the auto-advance chain flat — each phase runs at the same nesting level rather than spawning deeper Task agents.

**Handle execute-phase return:**
- **PHASE COMPLETE** → Display final summary:
  ```
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   rcode ► PHASE ${PHASE} COMPLETE ✓
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Auto-advance pipeline finished.

  Next: /rcode-discuss-phase ${NEXT_PHASE} --auto ${RCODE_WS}
  ```
- **GAPS FOUND / VERIFICATION FAILED** → Display result, stop chain:
  ```
  Auto-advance stopped: Execution needs review.

  Review the output above and continue manually:
  /rcode-execute ${PHASE} ${RCODE_WS}
  ```

**If neither `--auto` nor config enabled:**
Route to `<offer_next>` (existing behavior).

</process>

Next: Read `.rcode/workflows/plan/steps/09-closing.md` before starting it (skip it if its Read-when condition is false).
