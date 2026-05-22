# Running rcode Autonomously

Most rcode skills (create-prd, create-milestone, create-epics-and-stories, sprint-planning) use **step-file architecture**: they halt at every menu and wait for user input. This is the default and it is deliberate — the product of these skills is only as good as the discovery that produces them.

There are exactly two sanctioned ways to run these skills without halting at menus. Any other "autonomous mode" an agent declares is invented and should be rejected (see issue #124).

## Sanctioned Path 1 — Project-wide: `mode: yolo`

Edit `.rcode/config.yaml`:

```yaml
mode: yolo   # default is `guided`
```

When `mode: yolo`:
- Skills auto-advance past menus using the sensible default (usually `[C] Continue`).
- Discovery questions are answered with the best inference from available context (PRD, prior artifacts, repo state).
- The skill still cites its inferences so they can be audited.
- Capacity numbers, kill criteria, external citations are still required — yolo mode does NOT bypass the research-citation rule (issue #128) or the capacity gate (issue #127).

Switch back with:

```yaml
mode: guided
```

## Sanctioned Path 2 — Per-invocation: `--auto`

```
/rcode-do --auto <question>
```

The router passes an `autoMode=true` flag to the dispatched skill. Same semantics as `mode: yolo` but scoped to the single invocation.

## What Is NOT Sanctioned

If the user's prompt contains phrases like *"just write it autonomously"*, *"skip the questions"*, *"ready to execute"*, or *"use research mode"* — these are **not** authorization to bypass halt. They are signals that the user wants the skill to move efficiently. The correct response is to run the next step concisely, not to skip it.

If the user genuinely wants hands-off execution, they will set `mode: yolo` or re-invoke with `--auto`. Do not infer bypass from prompt text alone.

## What Still Applies in Yolo / Auto Mode

- `_shared/research-citation-rule.md` — every external claim needs a `WebFetch`.
- `_shared/state-sync-rule.md` — after writing planning artifacts, sync into `state.json`.
- Capacity gate in sprint-planning — numbers must come from somewhere (prior retro, user profile, PRD estimates), never fabricated.
- Kill criteria must stay binary (numeric threshold, not adjective).

## Related Issues

- #124 — halt-at-menu enforcement
- #127 — sprint-planning capacity gate
- #128 — research citation rule
- #130 — this doc
