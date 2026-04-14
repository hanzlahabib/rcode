# Workflow: rihal:health

<purpose>
Run 6-point compliance check on rihal installation. Each check is pass/fail. Summary at the end.
</purpose>

## Check 1 — Directory exists and is writable

Verify `.rihal/` directory:

```bash
test -d .rihal && test -w .rihal
```

**PASS if:**
- `.rihal/` exists
- Current user can write to it

**Output:**
```
✅ PASS — .rihal/ directory exists and is writable
```

**Output on fail:**
```
❌ FAIL — .rihal/ does not exist or is not writable. Run: /rihal:update to repair
```

## Check 2 — File manifest exists and is valid CSV

Verify `.rihal/_config/files-manifest.csv`:

```bash
test -f .rihal/_config/files-manifest.csv
```

Read the file and parse as CSV:
- Must have header row: `rel,sha256,size`
- Must have at least 1 data row
- All rows must have exactly 3 columns

**PASS if:**
- File exists
- Header is valid
- At least 1 data row

**Output:**
```
✅ PASS — files-manifest.csv is valid (N files tracked)
```

**Output on fail:**
```
❌ FAIL — files-manifest.csv is missing or corrupted. Run: /rihal:update to repair
```

## Check 3 — All manifest files exist and hash matches

For each row in files-manifest.csv (skip header):
- Extract: `rel`, `sha256`, `size`
- Check if file at `./{rel}` exists
- Compute SHA256 of actual file
- Compare against manifest entry

**PASS if:**
- All listed files exist
- All hashes match exactly

**Count drift:** files that exist but hash doesn't match.

**Output on pass:**
```
✅ PASS — All files match manifest (no drift detected)
```

**Output on fail (drift found):**
```
❌ FAIL — File drift detected: N files changed or missing
  Modified: file1.md, file2.js
  Missing: file3.md
Run: /rihal:update to repair
```

## Check 4 — state.json exists and is valid JSON

Verify `.rihal/state.json`:

```bash
test -f .rihal/state.json
```

Read and parse as JSON. Verify it contains these top-level keys:
- `version`
- `project`
- `created`
- `updated`
- `phases` (array)
- `executions` (array)
- `decisions` (array)
- `blockers` (array)
- `council_sessions` (array)

**PASS if:**
- File exists
- Parses as valid JSON
- Has all required keys

**Output:**
```
✅ PASS — state.json is valid and initialized
```

**Output on fail:**
```
❌ FAIL — state.json is missing or invalid. Run: /rihal:update to repair
```

## Check 5 — agent-manifest.csv has header and data rows

Verify `.rihal/_config/agent-manifest.csv`:

```bash
test -f .rihal/_config/agent-manifest.csv
```

Read and parse as CSV:
- Must have header row
- Must have at least 1 data row (at least one agent installed)

**PASS if:**
- File exists
- Header is present
- At least 1 data row

**Output:**
```
✅ PASS — agent-manifest.csv is valid (N agents installed)
```

**Output on fail:**
```
❌ FAIL — agent-manifest.csv is missing or empty. Run: /rihal:update to repair
```

## Check 6 — rihal-tools.cjs is executable and responsive

Verify `.rihal/bin/rihal-tools.cjs`:

```bash
test -f .rihal/bin/rihal-tools.cjs && test -x .rihal/bin/rihal-tools.cjs
node .rihal/bin/rihal-tools.cjs version
```

**PASS if:**
- File exists
- Is executable (or runs via node anyway)
- `version` subcommand returns output without error

**Output:**
```
✅ PASS — rihal-tools.cjs is executable and responsive
```

**Output on fail:**
```
❌ FAIL — rihal-tools.cjs is missing or broken. Run: /rihal:update to repair
```

## Final Summary

Count total passes and failures: `{N}/6 checks passed`

If all 6 pass:
```
✅ All systems nominal — rihal is healthy
```

If < 6 pass:
```
⚠️ {N}/6 checks passed — {M} issue(s) found
Run: /rihal:update to repair
```
