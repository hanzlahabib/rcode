# Workflow: rihal-health

<purpose>
Run 9-point health check: 6 installation checks + 3 project-state checks. Each check is pass/fail. Summary at the end.
</purpose>


## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:

```
/rihal-health <argument-here>
```

**Examples:**
```
/rihal-health example 1
/rihal-health example 2
```

STOP — do not proceed.

## Step 0 — Verify .rihal/ directory exists and is writable

**Action:** Check if `.rihal/` directory exists and current user can write to it.

```bash
test -d .rihal && test -w .rihal
```

**PASS if:**
- `.rihal/` exists
- Current user can write to it

**Output on pass:**
```
✓ PASS — .rihal/ directory exists and is writable
```

**Output on fail:**
```
❌ FAIL — .rihal/ does not exist or is not writable. Run: /rihal-update to repair
```

## Step 1 — Verify file manifest exists and is valid CSV

**Action:** Check `.rihal/_config/files-manifest.csv` and parse as CSV.

```bash
test -f .rihal/_config/files-manifest.csv
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
❌ FAIL — files-manifest.csv is missing or corrupted. Run: /rihal-update to repair
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
Run: /rihal-update to repair
```

## Step 3 — Verify state.json exists and is valid

**Action:** Check `.rihal/state.json` and validate JSON structure.

```bash
test -f .rihal/state.json
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
❌ FAIL — state.json is missing or invalid. Run: /rihal-update to repair
```

## Step 4 — Verify agent-manifest.csv is present and populated

**Action:** Check `.rihal/_config/agent-manifest.csv` for header and at least one agent.

```bash
test -f .rihal/_config/agent-manifest.csv
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
❌ FAIL — agent-manifest.csv is missing or empty. Run: /rihal-update to repair
```

## Step 5 — Verify rihal-tools.cjs is executable and responsive

**Action:** Check rihal-tools.cjs exists, is executable, and responds to version command.

```bash
test -f .rihal/bin/rihal-tools.cjs && test -x .rihal/bin/rihal-tools.cjs
node .rihal/bin/rihal-tools.cjs version
```

**Output on pass:**
```
✓ PASS — rihal-tools.cjs is executable and responsive
```

**Output on fail:**
```
❌ FAIL — rihal-tools.cjs is missing or broken. Run: /rihal-update to repair
```

## Step 6 — Project state health checks (3 checks)

Run these after installation checks. Skip if `.rihal/state.json` doesn't exist.

**Check 7 — state.json phase count matches ROADMAP.md**

```bash
ROADMAP_PHASES=$(grep -c '^## Phase\|^### Phase\|^- Phase' .planning/ROADMAP.md 2>/dev/null || echo 0)
STATE_PHASES=$(node .rihal/bin/rihal-tools.cjs state read 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('phases',[])) if d else 0)" 2>/dev/null || echo 0)
```

If counts match: `✓ PASS — {N} phases in ROADMAP.md and state.json are in sync`
If they differ: `⚠ WARN — ROADMAP.md has ${ROADMAP_PHASES} phases, state.json has ${STATE_PHASES}. Run: /rihal-status to investigate`

**Check 8 — current phase has a SPRINT.md or CONTEXT.md**

```bash
CURRENT=$(node .rihal/bin/rihal-tools.cjs state read 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('current_phase',''))" 2>/dev/null)
find .planning/phases/*${CURRENT}* -name "*-SPRINT.md" -o -name "*-CONTEXT.md" 2>/dev/null | head -1
```

If current_phase is null or empty: skip this check (not started).
If file found: `✓ PASS — current phase ${CURRENT} has planning artifacts`
If no file: `⚠ WARN — current phase ${CURRENT} has no SPRINT.md or CONTEXT.md. Run: /rihal-plan ${CURRENT}`

**Check 9 — no phantom-complete phases (ROADMAP says complete but no artifacts)**

```bash
node .rihal/bin/rihal-tools.cjs state snapshot 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
insights = d.get('insights', [])
phantom = [i for i in insights if i.get('kind') == 'phantom-complete']
print(len(phantom))
" 2>/dev/null || echo 0
```

If 0 phantoms: `✓ PASS — no phantom-complete phases detected`
If any: `⚠ WARN — {N} phantom-complete phase(s) detected. Run: /rihal-audit to inspect`

---

## Step 7 — Count results and print final summary

**Action:** Count all pass/fail/warn results and display overall status.

Total: `{N}/9 checks passed`

If all 9 pass:
```
✓ All systems nominal — rihal is healthy
```

If fewer than 9 pass:
```
⚠ {N}/9 checks passed — {M} issue(s) found
Run: /rihal-update to repair installation issues
Run: /rihal-status for project-state issues
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

- **Issues found:** `/rihal-forensics` — deep diagnostic on specific failures
- **Ready to continue:** `/rihal-do` — interactive router guides next step
- **Fix specific phase:** `/rihal-correct-course {phase}` — targeted correction
