# discuss-phase - step 07: Auto-advance, power-user mode, success criteria

This step file was split verbatim out of `workflows/discuss-phase.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<step name="auto_advance">
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

**If `--auto` or `--chain` flag present AND `AUTO_CHAIN` is not true:** Persist chain flag to config (handles direct usage without new-project):
```bash
node ".rcode/bin/rcode-tools.cjs" config-set workflow._auto_chain_active true
```

**If `--auto` flag present OR `--chain` flag present OR `AUTO_CHAIN` is true OR `AUTO_CFG` is true:**

Display banner:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► AUTO-ADVANCING TO PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Context captured. Launching plan...
```

Launch plan using the Skill tool to avoid nested Task sessions (which cause runtime freezes due to deep agent nesting):
```
Skill(skill="rcode-plan", args="${PHASE} --auto ${RCODE_WS}")
```

This keeps the auto-advance chain flat — discuss, plan, and execute all run at the same nesting level rather than spawning increasingly deep Task agents.

**Handle plan return:**
- **PHASE COMPLETE** → Full chain succeeded. Display:
  ```
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   rcode ► PHASE ${PHASE} COMPLETE
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Auto-advance pipeline finished: discuss → plan → execute

  /clear then:

  Next: /rcode-discuss-phase ${NEXT_PHASE} ${WAS_CHAIN ? "--chain" : "--auto"} ${RCODE_WS}
  ```
- **PLANNING COMPLETE** → Planning done, execution didn't complete:
  ```
  Auto-advance partial: Planning complete, execution did not finish.
  Continue: /rcode-execute ${PHASE} ${RCODE_WS}
  ```
- **PLANNING INCONCLUSIVE / CHECKPOINT** → Stop chain:
  ```
  Auto-advance stopped: Planning needs input.
  Continue: /rcode-plan ${PHASE} ${RCODE_WS}
  ```
- **GAPS FOUND** → Stop chain:
  ```
  Auto-advance stopped: Gaps found during execution.
  Continue: /rcode-plan ${PHASE} --gaps ${RCODE_WS}
  ```

**If none of `--auto`, `--chain`, nor config enabled:**
Route to `confirm_creation` step (existing behavior — show manual next steps).
</step>

</process>

<power_user_mode>
When `--power` flag is present in ARGUMENTS, skip interactive questioning and execute the power user workflow.

The power user mode generates ALL questions upfront into machine-readable and human-friendly files, then waits for the user to answer at their own pace before processing all answers in a single pass.

**Full step-by-step instructions:** @.rcode/workflows/discuss-phase-power.md

**Summary of flow:**
1. Run the same phase analysis (gray area identification) as standard mode
2. Write all questions to `{phase_dir}/{padded_phase}-QUESTIONS.json` and `{phase_dir}/{padded_phase}-QUESTIONS.html`
3. Notify user with file paths and wait for a "refresh" or "finalize" command
4. On "refresh": read the JSON, process answered questions, update stats and HTML
5. On "finalize": read all answers from JSON, generate CONTEXT.md in the standard format
</power_user_mode>

<success_criteria>
- Phase validated against roadmap
- Prior context loaded (PROJECT.md, REQUIREMENTS.md, STATE.md, prior CONTEXT.md files)
- Already-decided questions not re-asked (carried forward from prior phases)
- Codebase scouted for reusable assets, patterns, and integration points
- Gray areas identified through intelligent analysis with code and prior decision annotations
- User selected which areas to discuss
- Each selected area explored until user satisfied (with code-informed and prior-decision-informed options)
- Scope creep redirected to deferred ideas
- CONTEXT.md captures actual decisions, not vague vision
- CONTEXT.md includes canonical_refs section with full file paths to every spec/ADR/doc downstream agents need (MANDATORY — never omit)
- CONTEXT.md includes code_context section with reusable assets and patterns
- Deferred ideas preserved for future phases
- STATE.md updated with session info
- User knows next steps
- Checkpoint file written after each area completes (incremental save)
- Interrupted sessions can be resumed from checkpoint (no re-answering completed areas)
- Checkpoint file cleaned up after successful CONTEXT.md write
- `--chain` triggers interactive discuss followed by auto plan+execute (no auto-answering)
- `--chain` and `--auto` both persist chain flag and auto-advance to plan
</success_criteria>

## Next Up

- `/rcode-plan` — plan the phase using the decisions captured in CONTEXT.md
- `/rcode-research-phase` — research implementation details before planning

Next: end of workflow.
