# Workflow: rcode-decisions

<purpose>
Surface recent decisions across every rcode project on this machine. Decisions are mirrored to `~/.rcode/decisions.jsonl` whenever a project runs `state add-decision`. Use this to see what was decided elsewhere, find precedent for a similar call you are about to make, or answer "what did I commit to last week?".
</purpose>

<output_format>
Open with banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► DECISIONS (cross-project)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Newest decisions first. One row per decision with project, date, phase, and summary. Truncate long summaries to 80 chars.
</output_format>

<required_reading>
@.rcode/references/output-format.md
</required_reading>

<process>
## Step 0 — Usage check

If `$ARGUMENTS` contains `--help` or `-h`:

```
/rcode-decisions [--limit N] [--project <name>] [--since <ISO-date>] [--this-project]

  --limit N         Max rows to show (default 20, max 500)
  --project <name>  Filter to one project name (as recorded in state.project)
  --since <ISO>     Only decisions after the given ISO timestamp (e.g. 2026-01-01)
  --this-project    Shortcut: filter to the current project (uses state.project)
```

STOP — do not proceed.

## Step 1 — Resolve filters

Parse args. If `--this-project` is set:

```bash
CURRENT_PROJECT=$(node .rcode/bin/rcode-tools.cjs state read 2>/dev/null | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.stdout.write(JSON.parse(s).project||'')}catch{}}")
```

If non-empty, pass `--project "$CURRENT_PROJECT"` to the next step. If empty, print a warning and fall through to the unfiltered query.

## Step 2 — Query the global log

```bash
QUERY_ARGS=()
[ -n "$LIMIT" ]    && QUERY_ARGS+=(--limit "$LIMIT")
[ -n "$PROJECT" ]  && QUERY_ARGS+=(--project "$PROJECT")
[ -n "$SINCE" ]    && QUERY_ARGS+=(--since "$SINCE")
RESULT=$(node .rcode/bin/rcode-tools.cjs state decisions-global "${QUERY_ARGS[@]}" 2>/dev/null || echo '{"decisions":[],"total":0}')
```

The result is JSON: `{decisions: [...], total: N}`. If `decisions` is empty:

```
No decisions logged yet.

Decisions are mirrored to ~/.rcode/decisions.jsonl whenever /rcode-execute or /rcode-council records one. Run a council or complete a sprint to populate this log.
```

STOP.

## Step 3 — Render the table

For each decision, show:

```
| Date        | Project          | Phase | Decision                                                                     |
|-------------|------------------|-------|------------------------------------------------------------------------------|
| 2026-04-18  | rcode       | 04    | Ship list-plans as a table rather than a tree view                           |
| 2026-04-17  | siraaj-platform  | 07    | Migrate queue workers to Fluid Compute for cold-start savings                |
```

Format date as `YYYY-MM-DD` (strip time) to keep the table readable. Keep project column to 16 chars; phase to 5. Truncate the Decision column with `…` if longer than 80 chars.

## Step 4 — Footer

```
Showing {rendered}/{total} decisions{ filter suffix }.
  ~/.rcode/decisions.jsonl  ({size} records)
```

Where filter suffix is, for example: ` · project=rcode · since=2026-01-01`.

## Step 5 — Next Up routing

- If `--this-project` was used and results look thin (fewer than 3) → `Next: /rcode-council "<open question>"  (then decisions flow back here)`
- Otherwise → `Next: /rcode-decisions --project <name>  for deeper history on one project`
</process>

## Success Criteria

- Empty `~/.rcode/decisions.jsonl` produces a clear empty-state message, not an error
- `--project` and `--since` filters pass through to `state decisions-global`
- Malformed JSONL lines are skipped (handled by rcode-tools reader), not displayed as garbage
- Newest decision appears first
- Table remains readable with long project names / summaries (truncation applied)

## On Error

If `~/.rcode/decisions.jsonl` cannot be read (permissions, missing home dir), print the underlying error and suggest `chmod`/`ls -la ~/.rcode/` for diagnosis. Do not crash other workflows — this command is read-only.

## Next Up

- `/rcode-plan` — plan with prior decisions in mind
- `/rcode-do` — continue working informed by the decision history
