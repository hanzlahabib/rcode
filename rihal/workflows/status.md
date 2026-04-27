# Workflow: rihal-status

<purpose>
Render a human-readable project status dashboard. All data comes from a single `rihal-tools progress init` call — this workflow does NOT parse ROADMAP.md, walk SUMMARY.md files, or grep state.json itself. Rendering only. See `rihal-tools.cjs` `cmdProgress` for the source-of-truth logic (issue #159 M2.5).

**SSOT:** `.rihal/state.json`. `/rihal-status` and `/rihal-progress` both call the same CLI so they cannot disagree. If the CLI reports a drift insight, surface it — do not silently compensate.
</purpose>

<required_reading>
@.rihal/references/output-format.md
</required_reading>

<process>

## Step 1 — Fetch the snapshot

```bash
SNAPSHOT=$(node .rihal/bin/rihal-tools.cjs progress init)
VERBOSE=$(node .rihal/bin/rihal-tools.cjs config-get output.verbose 2>/dev/null || echo "false")
```

Parse as JSON. If `SNAPSHOT.ok` is not true, print a one-line error and stop.

**Slim mode** (default when `VERBOSE != "true"`): Output Steps 2–3 only (banner + phases list). Skip decisions, blockers detail, and route menu — just print the top route as a single "Next: `/rihal-X`" line. Append `(run /rihal-status --verbose for full detail)`.

**Verbose mode** (`VERBOSE == "true"` or `$ARGUMENTS` contains `--verbose`): Full Steps 2–6 output.

If `SNAPSHOT.project` is empty and `SNAPSHOT.phases` is empty, print:

```
No state found. Run a council session or execute a plan to initialize state.
```

Then stop.

## Step 2 — Print banner + dashboard

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► STATUS — {SNAPSHOT.project}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╭─ Rihal Status — {SNAPSHOT.project} ─────────────────────╮
│ Milestone:  {SNAPSHOT.milestone or "—"}                 │
│ Phase:      {SNAPSHOT.current_phase or "none started"}  │
│ Progress:   {SNAPSHOT.bar}                              │
│ Weighted:   {SNAPSHOT.weighted_bar}                     │
│ Updated:    {relative_time(SNAPSHOT.updated)}           │
╰─────────────────────────────────────────────────────────╯
```

If `SNAPSHOT.weighted_progress > 0` but `SNAPSHOT.completed_count === 0`, display
the weighted bar as the primary progress indicator to avoid a misleading `0/N (0%)`.

## Step 3 — Phases section

For each entry in `SNAPSHOT.phases[]`:

- `▶` if `phase.number === SNAPSHOT.current_phase`
- `✓` if `phase.disk.summary_count > 0` AND matches `phase.disk.plan_count` (complete)
- `◆` if `phase.disk.plan_count > phase.disk.summary_count` (executing — has plans, not all summarized)
- `◇` if `phase.disk.has_context && !phase.disk.plan_count` (discussing — CONTEXT.md exists but no plan yet)
- `◈` if `phase.disk.has_research && !phase.disk.plan_count` (researched — RESEARCH.md but no plan)
- `○` otherwise (planned — no artifacts on disk)

```
Phases:
  ▶ [04] Component compaction — executing (1/3 plans)
  ✓ [03] Auth hardening — complete
  ◇ [05] Billing rewrite — discussing
  ◈ [06] API optimization — researched
  ○ [07] Final cleanup — planned
```

If a phase number starts with `999.`, render with a `🅿` marker and the label `(parking lot)`.

## Step 4 — Insights (NEW — issue #159)

If `SNAPSHOT.insights[]` is non-empty, print above the Next Up section:

```
Insights:
  ⚠ {insight.message}       (for severity: warn)
  ℹ {insight.message}       (for severity: info)
```

Do NOT hide insights. They exist because the CLI noticed something the workflow would otherwise gloss over.

## Step 5 — Recent decisions + blockers

- If `SNAPSHOT.decisions.length > 0`, print the last 3 (most recent first).
- If `SNAPSHOT.blockers.length > 0`, render each with ⚠ and the blocker description.

Omit a section entirely when its array is empty.

## Step 6 — Next Up (intent-tree)

Render `SNAPSHOT.routes[]` as a Route A/B/C menu:

```
Next Up:

  [A] {route where letter === "A"}
      → {route.command}

  [B] {route where letter === "B"}
      → {route.command}

  [C] {route where letter === "C"}
      → {route.command}
```

Group routes by letter. If multiple routes share a letter, list them indented. If there are no routes, print the fallback suggestion from the CLI output.

</process>

## Success Criteria

- [ ] State read via `progress init` — no direct ROADMAP.md or SUMMARY.md parsing
- [ ] Drift insights surfaced if present
- [ ] Banner + dashboard printed
- [ ] Phases section shows symbols based on CLI-computed disk state
- [ ] Next Up is a route tree, not a single suggestion

## On Error

- **CLI not found:** "Rihal Code install missing. Run: npx @hanzlaa/rcode install"
- **state.json invalid JSON:** report the CLI's exact error string — the CLI already has a clean error shape.
- **Unexpected shape:** fall back to the banner + "State present but unreadable. Try: node .rihal/bin/rihal-tools.cjs state read"
