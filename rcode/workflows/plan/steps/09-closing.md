# plan - step 09: Banner emission gate, offer-next, Windows troubleshooting, success criteria

This step file was split verbatim out of `workflows/plan.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<banner_emission_gate>
The success banner is gated on real verification, not vibes.
Before emitting `PLANNED ✓`, confirm one of these is true:

1. A passing CHECK.md exists at `${PHASE_DIR}/*-CHECK.md` from rcode-sprint-checker
   in this run AND its overall verdict is `pass` (or `pass-with-cautions`).
2. The user has explicitly said "skip verification" / "override" this run AND that
   override is recorded in the offer-next output's `Verification:` field as
   `Passed with override`.
3. `plan_checker_enabled` is false in config — recorded as `Verification: Skipped
   (config-disabled)`.

If none of the three holds (sprint-checker was never spawned, or it returned a
fail verdict, or its CHECK.md is missing) — DO NOT emit `PLANNED ✓`. Emit:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► PHASE {X} PLANNED ⚠ (gates skipped)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plans were written but rcode-sprint-checker did not return a passing
CHECK.md. Run /rcode-plan {X} --reviews to gate the plans before
executing, or pass --skip-verify if you accept the risk.
```

The same rule applies to `VERIFIED ✓` (after /rcode-verify-phase) and
`DONE ✓` (after /rcode-execute) — the success-tick is reserved for
gate-passed states.
</banner_emission_gate>

<offer_next>
Output this markdown directly (not as a code block):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► PHASE {X} PLANNED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {X}: {Name}** — {N} plan(s) in {M} wave(s)

| Wave | Plans | What it builds |
|------|-------|----------------|
| 1    | 01, 02 | [objectives] |
| 2    | 03     | [objective]  |

Research: {Completed | Used existing | Skipped}
Verification: {Passed | Passed with override | Skipped}

───────────────────────────────────────────────────────────────

## ▶ Next Up

**Execute Phase {X}** — run all {N} plans

/clear then:

/rcode-execute {X} ${RCODE_WS}

**Next step — paste this to execute:**
> /rcode-execute {X}

───────────────────────────────────────────────────────────────

**Also available:**
- cat .planning/phases/{phase-dir}/*-SPRINT.md — review plans
- /rcode-plan {X} --research — re-research first
- /rcode-review --phase {X} --all — peer review plans with external AIs
- /rcode-plan {X} --reviews — replan incorporating review feedback

───────────────────────────────────────────────────────────────
</offer_next>

<windows_troubleshooting>
```bash
# Windows-only content (stdio deadlock recovery) — skip the read on other platforms.
WINDOWS=$([[ "$(uname -s 2>/dev/null)" == MINGW* || "$(uname -s 2>/dev/null)" == CYGWIN* || -n "$WINDIR" ]] && echo true || echo false)
```
${WINDOWS === 'true' ? '@.rcode/references/plan-windows-troubleshooting.md' : ''}
</windows_troubleshooting>

<success_criteria>
- [ ] .planning/ directory validated
- [ ] Phase validated against roadmap
- [ ] Phase directory created if needed
- [ ] CONTEXT.md loaded early (step 4) and passed to ALL agents
- [ ] Research completed (unless --skip-research or --gaps or exists)
- [ ] Auto-advance fired only on an explicit `--auto`/`--chain` or an answered confirmation, never on `auto_advance` config alone
- [ ] Specialist review panel spawned (Waleed + Fatima + domain agents) and its blocking issues fed into the revision loop, or `workflow.specialist_review: false` recorded
- [ ] rcode-phase-researcher spawned with CONTEXT.md
- [ ] Existing plans checked
- [ ] rcode-planner spawned with CONTEXT.md + RESEARCH.md
- [ ] Plans created (PLANNING COMPLETE or CHECKPOINT handled)
- [ ] rcode-sprint-checker spawned with CONTEXT.md
- [ ] Verification passed OR user override OR max iterations with user decision
- [ ] User sees status between agent spawns
- [ ] User knows next steps
</success_criteria>

## Next Up

- `/rcode-execute` — execute the SPRINT.md plans the planner produced
- `/rcode-discuss-phase` — revisit decisions if the sprint-checker flagged grey areas
- `/rcode-research-phase` — run deeper research if RESEARCH.md was skipped

Next: end of workflow.
