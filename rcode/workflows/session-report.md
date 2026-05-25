# Workflow: rcode-session-report

<purpose>
Generate a comprehensive session report covering work done, token usage estimation, commits, decisions, blockers, and council sessions. Writes SESSION-REPORT-{date}.md to .planning/ directory.
</purpose>


## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:

```
/rcode-session-report <argument-here>
```

**Examples:**
```
/rcode-session-report example 1
/rcode-session-report example 2
```

STOP — do not proceed.

## Step 1 — Check usage

Verify .rcode/state.json exists:

```bash
test -f .rcode/state.json && echo "exists" || echo "missing"
```

If missing, print and stop:

```
No state found. Run /rcode-council or execute a plan to initialize state.
```

## Step 2 — Read state

```bash
cat .rcode/state.json
```

Parse the JSON. Extract:

- `created` — project creation timestamp
- `updated` — last update timestamp
- `current_phase` — current phase (or null)
- `current_plan` — plan number (0-based)
- `executions` — array of execution records
- `decisions` — array of decision records
- `blockers` — array of blocker records
- `council_sessions` — array of session records

## Step 3 — Compute duration

Calculate time span covered by this session:

- **Start:** First timestamp in state (created, or first session/decision/blocker timestamp)
- **End:** Last timestamp in state (updated, or last session/decision/blocker timestamp)
- **Duration:** Human-readable format (e.g. "2 hours 15 minutes", "1 day")

If no timestamps available, use current time as both start/end.

## Step 4 — Count artifacts

List all artifacts in `.planning/`:

```bash
find .planning -type f \( -name "council-session-*.json" -o -name "*-chain.md" -o -name "*-discuss.md" \) | wc -l
```

Extract counts:
- **Council sessions:** count of `council-session-*.json` files
- **Chains:** count of `*-chain.md` files
- **Discusses:** count of `*-discuss.md` files

## Step 5 — Token usage (measured or estimated)

### Step 5a — Prefer measured totals from cost.jsonl

If the `cost-track` hook (#745) is enabled, it appends one usage record per
response to `.rcode/telemetry/cost.jsonl`. Check for it first:

```bash
test -f .rcode/telemetry/cost.jsonl && echo "measured" || echo "estimated"
```

**If `.rcode/telemetry/cost.jsonl` exists:** sum the `input_tokens` and
`output_tokens` across every line and report the **measured** totals — label
them clearly as "measured":

```bash
node -e "
const fs=require('fs');
let i=0,o=0,n=0;
for(const l of fs.readFileSync('.rcode/telemetry/cost.jsonl','utf8').split('\n').filter(Boolean)){
  try{const r=JSON.parse(l);i+=r.input_tokens||0;o+=r.output_tokens||0;n++;}catch{}
}
console.log('responses='+n,'input='+i,'output='+o,'total='+(i+o));
"
```

Report: `Total (measured): {input} input + {output} output = {total} tokens
across {responses} responses`. Skip the heuristic estimate below — measured
data supersedes it.

**If `.rcode/telemetry/cost.jsonl` does NOT exist:** fall back to the heuristic
estimate in Step 5b and label the result "estimated".

### Step 5b — Heuristic estimate (fallback only)

Calculate estimated tokens (note: these are rough approximations, not actual measurements).

Read context_window from config to calibrate multipliers:

```bash
CW=$(node .rcode/bin/rcode-tools.cjs config-get context_window 2>/dev/null || echo "200000")
```

Scale multipliers: if `CW >= 500000`, multiply by 2× (larger context windows → more content read per agent turn).

| Artifact type | Base tokens | Rationale |
|---------------|-------------|-----------|
| Council session | 50,000 | 5 agents × 2 rounds × ~5K avg |
| Chain | 30,000 | 3–5 stages × ~8K avg |
| Discuss | 10,000 | single agent, focused |
| Execute | 20,000 | executor + verifier per plan |

Apply context window scale: `estimate = base × max(1, CW / 200000)`

**Total estimate:** sum of above, rounded to nearest 1K (with clear disclaimer: "Rough estimate — actual usage depends on codebase size, plan length, and model")

**Note for accuracy:** actual token counts require the `/usage` endpoint or Claude Code session logs. These multipliers are 2024 baselines updated for 1M-context models.

## Step 6 — List commits

Get commits touching rcode paths since state creation:

```bash
SINCE_DATE=$(node -e "try{const s=require('fs').readFileSync('.rcode/state.json','utf8');console.log(JSON.parse(s).created||'')}catch(e){}" 2>/dev/null)
if [[ -n "$SINCE_DATE" ]]; then
  git log --since="$SINCE_DATE" --oneline -- .rcode rcode/ .planning 2>/dev/null | head -20
else
  git log --all --oneline -- .rcode rcode/ .planning 2>/dev/null | head -20
fi
```

Extract commit hashes and subjects. If git errors, report gracefully (project may not be git-based).

## Step 7 — Build report

Write `.planning/SESSION-REPORT-{YYYY-MM-DD-HHmmss}.md` with this structure:

```markdown
# Session Report — {project_name}

**Period:** {start_date} → {end_date} ({duration})

## Work Summary

- **Current Phase:** {phase or "None started"}
- **Plan Progress:** {current_plan} / {total_plans}
- **Council Sessions:** {count}
- **Chains:** {count}
- **Discusses:** {count}
- **Decisions Logged:** {count}
- **Blockers Identified:** {count} ({open_count} open)
- **Commits:** {count}

## Token Usage ({measured|estimated})

**If cost.jsonl exists — measured:**

- Responses tracked: {count}
- Input tokens: {input}
- Output tokens: {output}
- **Total (measured): {grand_total} tokens**

**If cost.jsonl absent — estimated** (approximations based on artifact counts):

- Council Sessions: {count} × 50K = {total}K
- Chains: {count} × 30K = {total}K
- Discusses: {count} × 10K = {total}K
- Execute/Deploy: {count} × 20K = {total}K
- **Total Estimate: {grand_total}K tokens**

## Recent Decisions

{list last 5 decisions, format: "• {decision} — {phase} ({date})"}

{or: "No decisions logged in this session."}

## Open Blockers

{list all unresolved blockers, format: "⚠ {description} — {phase} (added {date})"}

{or: "No open blockers."}

## Recent Council Sessions

{list last 5 council sessions, format: "• {date} — {question_slug} — Panel: {panel}"}

{or: "No council sessions in this session."}

## Commits in Phase

{list commits with hash and subject}

{or: "No commits to tracked paths."}

## Next Steps

- Address {count} open blocker(s) before proceeding
- Plan next phase with `/rcode-plan {next_phase}`
```

## Step 8 — Print confirmation

Print success:

```
✓ Session report written to .planning/SESSION-REPORT-{date}.md
```

Then print summary:
- Period covered
- Total artifacts
- Estimated tokens
- Open blockers count

## Success Criteria

- [ ] `.planning/SESSION-REPORT-{date}.md` written with all sections populated
- [ ] Report includes artifact counts, token estimates, decisions, blockers, and commits
- [ ] Confirmation message printed with period and summary
- [ ] Report is readable markdown with proper formatting

## On Error

- **No state.json found:** print error and stop (Step 1).
- **state.json has invalid JSON:** print error with path and stop.
- **No artifacts in .planning/:** report gracefully ("No session artifacts found yet.").
- **Git not available:** report gracefully ("Git not available, skipping commit history.").
- **Write permission denied to .planning/:** print error and stop.
- **Insufficient readable history:** report gracefully and skip that section.

## On Completion

/rcode-progress — see full roadmap status
/rcode-next — get suggested next action
/rcode-resume-work — pick up where you left off

## Next Up

- `/rcode-pause-work` — capture handoff context before ending the session
- `/rcode-new-milestone` — plan the next milestone based on session outcomes
