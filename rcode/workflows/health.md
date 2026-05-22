# Workflow: rcode-health

<purpose>
Run 9-point health check: 6 installation checks + 3 project-state checks. Each check is pass/fail. Summary at the end.
</purpose>


## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:

```
/rcode-health <argument-here>
```

**Examples:**
```
/rcode-health example 1
/rcode-health example 2
```

STOP — do not proceed.

## Step 0 — Verify .rcode/ directory exists and is writable

**Action:** Check if `.rcode/` directory exists and current user can write to it.

```bash
test -d .rcode && test -w .rcode
```

**PASS if:**
- `.rcode/` exists
- Current user can write to it

**Output on pass:**
```
✓ PASS — .rcode/ directory exists and is writable
```

**Output on fail:**
```
❌ FAIL — .rcode/ does not exist or is not writable. Run: /rcode-update to repair
```

## Step 1 — Verify file manifest exists and is valid CSV

**Action:** Check `.rcode/_config/files-manifest.csv` and parse as CSV.

```bash
test -f .rcode/_config/files-manifest.csv
```

Verify:
- File exists
- Header row: `rel,sha256,size`
- At least 1 data row
- All rows have exactly 3 columns

**Output on pass:**
```
✓ PASS — files-manifest.csv is valid (N files tracked)
```

**Output on fail:**
```
❌ FAIL — files-manifest.csv is missing or corrupted. Run: /rcode-update to repair
```

## Step 2 — Verify all manifest files exist and hashes match

**Action:** For each row in files-manifest.csv, check file exists and hash matches.

For each file:
- Extract: `rel`, `sha256`, `size`
- Verify file at `./{rel}` exists
- Compute SHA256 hash of actual file
- Compare against manifest entry

Detect drift: files that exist but hash doesn't match.

**Output on pass:**
```
✓ PASS — All files match manifest (no drift detected)
```

**Output on fail (drift found):**
```
❌ FAIL — File drift detected: N files changed or missing
  Modified: file1.md, file2.js
  Missing: file3.md
Run: /rcode-update to repair
```

## Step 3 — Verify state.json exists and is valid

**Action:** Check `.rcode/state.json` and validate JSON structure.

```bash
test -f .rcode/state.json
```

Parse as JSON. Verify top-level keys present:
- `version`
- `project`
- `created`
- `updated`
- `phases` (array)
- `executions` (array)
- `decisions` (array)
- `blockers` (array)
- `council_sessions` (array)

**Output on pass:**
```
✓ PASS — state.json is valid and initialized
```

**Output on fail:**
```
❌ FAIL — state.json is missing or invalid. Run: /rcode-update to repair
```

## Step 4 — Verify agent-manifest.csv is present and populated

**Action:** Check `.rcode/_config/agent-manifest.csv` for header and at least one agent.

```bash
test -f .rcode/_config/agent-manifest.csv
```

Verify:
- File exists
- Header row present
- At least 1 data row (one agent installed)

**Output on pass:**
```
✓ PASS — agent-manifest.csv is valid (N agents installed)
```

**Output on fail:**
```
❌ FAIL — agent-manifest.csv is missing or empty. Run: /rcode-update to repair
```

## Step 5 — Verify rcode-tools.cjs is executable and responsive

**Action:** Check rcode-tools.cjs exists, is executable, and responds to version command.

```bash
test -f .rcode/bin/rcode-tools.cjs && test -x .rcode/bin/rcode-tools.cjs
node .rcode/bin/rcode-tools.cjs version
```

**Output on pass:**
```
✓ PASS — rcode-tools.cjs is executable and responsive
```

**Output on fail:**
```
❌ FAIL — rcode-tools.cjs is missing or broken. Run: /rcode-update to repair
```

## Step 6 — Project state health checks (3 checks)

Run these after installation checks. Skip if `.rcode/state.json` doesn't exist.

**Check 7 — state.json phase count matches ROADMAP.md**

```bash
ROADMAP_PHASES=$(grep -c '^## Phase\|^### Phase\|^- Phase' .planning/ROADMAP.md 2>/dev/null || echo 0)
STATE_PHASES=$(node .rcode/bin/rcode-tools.cjs state read 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('phases',[])) if d else 0)" 2>/dev/null || echo 0)
```

If counts match: `✓ PASS — {N} phases in ROADMAP.md and state.json are in sync`
If they differ: `⚠ WARN — ROADMAP.md has ${ROADMAP_PHASES} phases, state.json has ${STATE_PHASES}. Run: /rcode-status to investigate`

**Check 8 — current phase has a SPRINT.md or CONTEXT.md**

```bash
CURRENT=$(node .rcode/bin/rcode-tools.cjs state read 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('current_phase',''))" 2>/dev/null)
find .planning/phases/*${CURRENT}* -name "*-SPRINT.md" -o -name "*-CONTEXT.md" 2>/dev/null | head -1
```

If current_phase is null or empty: print `ℹ SKIP — Check 8: no active phase set (run /rcode-new-project or /rcode-plan to start one)` and treat as skipped (do not count toward pass/fail).
If file found: `✓ PASS — current phase ${CURRENT} has planning artifacts`
If no file: `⚠ WARN — current phase ${CURRENT} has no SPRINT.md or CONTEXT.md. Run: /rcode-plan ${CURRENT}`

**Check 9 — no phantom-complete phases (ROADMAP says complete but no artifacts)**

```bash
node .rcode/bin/rcode-tools.cjs state snapshot 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
insights = d.get('insights', [])
phantom = [i for i in insights if i.get('kind') == 'phantom-complete']
print(len(phantom))
" 2>/dev/null || echo 0
```

If 0 phantoms: `✓ PASS — no phantom-complete phases detected`
If any: `⚠ WARN — {N} phantom-complete phase(s) detected. Run: /rcode-audit to inspect`

**Check 10 — no orphaned executor worktrees or branches**

```bash
ORPHAN_WTS=$(git worktree list --porcelain \
  | awk '/^branch /{if($2 ~ /refs\/heads\/worktree-agent-/) print $2}' \
  | wc -l 2>/dev/null || echo 0)
ORPHAN_BR=$(git branch --list 'worktree-agent-*' 2>/dev/null | wc -l || echo 0)
ORPHANS=$((ORPHAN_WTS + ORPHAN_BR))
echo "$ORPHANS"
```

If `ORPHANS` is 0: `✓ PASS — no orphaned executor worktrees or branches`
If `ORPHANS > 0`: `⚠ WARN — ${ORPHANS} orphaned worktree-agent-* artifact(s) from a previous /rcode-execute. Run: /rcode-audit worktrees --prune`

---

## Step 7 — Count results and print final summary

**Action:** Count all pass/fail/warn results and display overall status.
Track SKIPPED checks separately — a skipped check does not count as pass or fail.

Total: `{N}/{TOTAL} checks passed` where TOTAL = 9 minus number of skipped checks.
If any checks were skipped: append `({SKIPPED} skipped — see above)`

If all 9 pass:
```
✓ All systems nominal — rcode is healthy (9/9)
```

If fewer than 9 pass:
```
⚠ {N}/9 checks passed — {M} issue(s) found
Run: /rcode-update to repair installation issues
Run: /rcode-status for project-state issues
Run: /rcode-audit worktrees --prune to clean orphaned executor artifacts
```

## Success Criteria

- [ ] All 9 checks executed (skip state checks if no state.json)
- [ ] Each check result printed clearly
- [ ] Final summary shows pass/fail count
- [ ] Repair instructions shown if any checks fail

## On Error

- **Directory not readable:** Print error and suggest filesystem check
- **CSV parsing fails:** Print error and suggest re-running update
- **JSON corruption:** Print error and suggest state.json reset

## ▶ Next Up

- /rcode-forensics
- /rcode-do
- /rcode-correct-course {phase}
