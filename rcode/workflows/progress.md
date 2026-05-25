# Workflow: rcode-progress

<purpose>
**`/rcode-progress` is an alias of `/rcode-status --verbose`.**

Historically this was a separate workflow with overlapping data and a heavier render. They both read the same source of truth (`rcode-tools progress init`), so we collapsed them: `/rcode-status` is the canonical renderer with built-in slim/verbose modes, and `/rcode-progress` is a thin alias that always runs in verbose mode.

Use whichever name you prefer — they produce the same output.
</purpose>

<required_reading>
@.rcode/workflows/status.md
</required_reading>

<process>

## Step 1 — Delegate to /rcode-status in verbose mode

Execute the workflow defined in `.rcode/workflows/status.md` end-to-end, with one override:

- Always render in **verbose mode** (full Steps 2–6 output: banner + phases + insights + decisions + blockers + Next Up route tree).
- Treat `$ARGUMENTS` exactly as `/rcode-status --verbose $ARGUMENTS` would.

Do not parse ROADMAP.md, walk SUMMARY.md files, or grep state.json directly. If the underlying CLI reports a drift insight, surface it — do not silently compensate.

## Step 2 — Footer note (one-time alias hint)

After the verbose status output, append a single grey line:

```
(/rcode-progress is an alias of /rcode-status --verbose — same data, same source.)
```

Skip this footer if `$ARGUMENTS` already contains `--no-alias-hint`.

</process>

## Success Criteria

- [ ] Calls the status workflow with verbose mode forced
- [ ] No independent CLI parsing — single source of truth via `progress init`
- [ ] Optional alias hint footer printed unless suppressed

## On Error

Defer to `.rcode/workflows/status.md` error handling. This workflow adds nothing on top.

## Next Up

- `/rcode-next` — auto-advance to the next logical step
- `/rcode-do` — take action on what the progress view surfaced
