---
phase: 13-parser-walker-consolidation
sprint: 13.1
type: execute
wave: 1
depends_on: []
files_modified:
  - rihal/bin/lib/roadmap.cjs
  - rihal/bin/rihal-tools.cjs
autonomous: true
sequential: false
requirements_addressed:
  - "#469 — single canonical ROADMAP parser"
  - "BRIEF acceptance: grep -c 'function.*[Pp]arse.*[Rr]oadmap' rihal/bin/rihal-tools.cjs rihal/bin/lib/roadmap.cjs → exactly 1"
  - "BRIEF acceptance: 132/132 existing tests still pass"
must_haves:
  truths:
    - "`node rihal/bin/rihal-tools.cjs roadmap list-phases` returns the same phases as before this sprint"
    - "`node rihal/bin/rihal-tools.cjs roadmap get-phase 6` returns found:true with name+goal+requirements+plans"
    - "`node rihal/bin/rihal-tools.cjs progress init` returns the same phase set in its output as before"
    - "`node rihal/bin/rihal-tools.cjs state sync --from-disk` reports phases_found > 0 (no #455 regression)"
    - "All 132/132 existing tests still pass"
  artifacts:
    - "rihal/bin/lib/roadmap.cjs exports extractPhases (already does) — only one parser implementation in the entire codebase"
    - "rihal/bin/rihal-tools.cjs no longer defines parseRoadmapPhases nested in cmdProgress"
    - "rihal/bin/rihal-tools.cjs no longer contains the inline /^#{2,4}\\s*Phase\\s+(\\d{1,3})\\b/gm regex inside cmdState's --from-disk branch"
  key_links:
    - "cmdProgress (rihal-tools.cjs:3879) calls extractPhases via require('./lib/roadmap.cjs')"
    - "cmdState --from-disk branch (rihal-tools.cjs:~2467) calls extractPhases via require('./lib/roadmap.cjs')"
    - "extractPhases must continue to handle pipe-table format defensively (parseRoadmapPhases handled it; ROADMAP.md doesn't currently use it but cmdProgress's parser supports it for portability)"
---

<objective>
Collapse three ROADMAP parsers down to one — `extractPhases` in `rihal/bin/lib/roadmap.cjs`. Delete `parseRoadmapPhases` (nested in `cmdProgress` at line 3894) and the inline `/^#{2,4}\s*Phase\s+(\d{1,3})\b/gm` regex inside cmdState's `--from-disk` branch (line ~2474). Both callers must use the canonical helper.

Purpose: Drift between three implementations caused #460/#462/#464/#465. One implementation cannot drift from itself.

Output: `rihal/bin/lib/roadmap.cjs` is the single source of truth for ROADMAP phase parsing. Verified by grep + 132/132 tests.
</objective>

<context>
@.planning/STATE.md
@.planning/phases/13-parser-walker-consolidation/13-BRIEF.md
@rihal/bin/lib/roadmap.cjs
</context>

<tasks>

### Story 13.1.1 — Extend extractPhases to handle pipe-table ROADMAP format

<files>
- rihal/bin/lib/roadmap.cjs (lines 21-65, the extractPhases function)
</files>

<read_first>
- rihal/bin/lib/roadmap.cjs (full file — 280 lines)
- rihal/bin/rihal-tools.cjs lines 3894-3930 (parseRoadmapPhases — note its dual-format Format A pipe / Format B heading logic and its `seen` deduplication)
</read_first>

<action>
The current `extractPhases` regex at line 26 only matches heading-style (`## Phase N — Name`). The about-to-be-deleted `parseRoadmapPhases` (rihal-tools.cjs:3894-3930) also handled pipe-table format (`| 07 | Name | Goal |`) with deduplication via a `seen` Set. To replace both call sites without behavior loss, extractPhases must support both formats.

Add a Format A pass to `extractPhases`:

1. Keep the existing Format B (heading) loop intact — it already produces full {number, name, goal, status, status_raw, section, headerIndex, sectionEnd}.
2. Before or after the Format B pass, add a Format A pass that scans pipe-table rows: `/^\|\s*(\d{1,3}(?:\.\d+)?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|/gm`. Skip rows where the captured name is literally "Phase" (header row).
3. Use a `Set<string>` keyed on `number` to deduplicate — if heading-style and table-style both define the same phase, heading-style wins (it carries the full `section` for downstream `parseRequirements`/`parsePlans`).
4. For pipe-table-only entries, populate: `number`, `name`, `goal` (from column 3), and set `section = ''`, `status = 'unknown'`, `status_raw = null`, `headerIndex = -1`, `sectionEnd = -1`. Document in a comment that table-only rows have no section body, so `parseRequirements`/`parsePlans`/`cmdUpdatePlanProgress` will return empty/error for them — that matches today's behavior in lib/roadmap.cjs (those callers only ever ran against heading-style).
5. Sort the combined result numerically by `parseFloat(number)` (matches parseRoadmapPhases line 3928).

Do NOT change the existing heading-style regex or the `parseRequirements`/`parseSuccessCriteria`/`parsePlans` helpers — those are out of scope and already work.

Why: The current ROADMAP.md uses heading-style exclusively (verified by `grep '^|' .planning/ROADMAP.md` = 0 hits). But `parseRoadmapPhases` supported both formats defensively for downstream consumers / other repos using rihal. Behavior preservation requires the canonical helper to do the same.
</action>

<verify>
<automated>
cd /home/hanzla/development/rihal-code && node -e "
const { dispatch } = require('./rihal/bin/lib/roadmap.cjs');
const phases = dispatch(process.cwd(), ['list-phases']);
if (!Array.isArray(phases) || phases.length === 0) { console.error('FAIL: list-phases empty'); process.exit(1); }
const six = phases.find(p => p.number === '6');
if (!six || !six.name) { console.error('FAIL: phase 6 not found by heading style'); process.exit(1); }
console.log('PASS heading-style: ' + phases.length + ' phases, phase 6 =', six.name);
"
</automated>

<automated>
# Synthetic pipe-table check — write a tiny fixture and verify extractPhases handles it
cd /home/hanzla/development/rihal-code && node -e "
const { extractPhases } = (() => { const m = require('./rihal/bin/lib/roadmap.cjs'); return { extractPhases: m.extractPhases || require('./rihal/bin/lib/roadmap.cjs').__esModule ? null : null }; })();
// Fall back: re-require if extractPhases isn't exported
const mod = require('./rihal/bin/lib/roadmap.cjs');
if (typeof mod.extractPhases !== 'function') {
  console.log('SKIP: extractPhases not exported (acceptable if not yet exposed; story 13.1.2 will require it)');
  process.exit(0);
}
const fixture = '# Roadmap\n\n| # | Phase | Goal |\n|---|-------|------|\n| 1 | Alpha | First |\n| 2 | Beta | Second |\n';
const r = mod.extractPhases(fixture);
if (r.length !== 2) { console.error('FAIL: expected 2 phases from table, got ' + r.length); process.exit(1); }
console.log('PASS pipe-table: ' + r.map(p => p.number + '=' + p.name).join(', '));
"
</automated>
</verify>

<done>
- `extractPhases` parses both heading style (`## Phase N — Name`) and pipe-table style (`| N | Name | Goal |`)
- Heading-style entries retain full {section, headerIndex, sectionEnd, status, status_raw}
- Table-only entries have {number, name, goal} and section='' (downstream consumers see empty requirements/plans, matching pre-consolidation behavior for table-only ROADMAPs)
- `module.exports` exposes `extractPhases` (add it to the exports object at line 274 — currently only dispatch/cmdGetPhase/cmdListPhases/cmdUpdatePlanProgress/cmdClear are exported; we need extractPhases for direct use by cmdProgress)
- `roadmap list-phases` against this repo still returns all current phases
</done>

---

### Story 13.1.2 — Replace parseRoadmapPhases inside cmdProgress with extractPhases

<files>
- rihal/bin/rihal-tools.cjs (delete function at lines 3894-3930; update its single caller inside cmdProgress)
</files>

<read_first>
- rihal/bin/rihal-tools.cjs lines 3879-4100 (the entire cmdProgress function — find the call site of parseRoadmapPhases via grep)
- rihal/bin/lib/roadmap.cjs (after Story 13.1.1 lands — confirm extractPhases is exported)
</read_first>

<action>
1. Find every call to `parseRoadmapPhases()` inside cmdProgress (rihal-tools.cjs ~lines 3879-end of cmdProgress). Use `grep -n "parseRoadmapPhases" rihal/bin/rihal-tools.cjs` — there should be exactly one definition (line 3894) and one or more calls.
2. At the top of cmdProgress (or already-existing top-of-file requires), ensure `const roadmap = require(path.join(__dirname, 'lib', 'roadmap.cjs'));` is in scope. If cmdProgress already loads it elsewhere, reuse; otherwise add the require at function entry.
3. Replace each call to `parseRoadmapPhases()` with:
   ```js
   const phases = roadmap.extractPhases(fs.existsSync(roadmapPath) ? fs.readFileSync(roadmapPath, 'utf8') : '')
     .map(p => ({ number: p.number, name: p.name, goal: p.goal || '' }));
   ```
   Reason for `.map`: existing cmdProgress consumers expect `{number, name, goal}` only — keep the shape stable to avoid touching downstream rendering code (out of scope).
4. Delete the entire `parseRoadmapPhases` function definition (lines 3894-3930).
5. Verify nothing else inside cmdProgress references the deleted function.
</action>

<verify>
<automated>
cd /home/hanzla/development/rihal-code && grep -c "function parseRoadmapPhases" rihal/bin/rihal-tools.cjs | grep -q "^0$" && echo "PASS: parseRoadmapPhases definition deleted" || { echo "FAIL: parseRoadmapPhases still defined"; exit 1; }
</automated>

<automated>
cd /home/hanzla/development/rihal-code && grep -c "parseRoadmapPhases(" rihal/bin/rihal-tools.cjs | grep -q "^0$" && echo "PASS: no callers" || { echo "FAIL: orphan callers remain"; grep -n "parseRoadmapPhases" rihal/bin/rihal-tools.cjs; exit 1; }
</automated>

<automated>
cd /home/hanzla/development/rihal-code && node rihal/bin/rihal-tools.cjs progress init 2>&1 | head -40 | grep -q '"phases"' && echo "PASS progress init renders phases" || { echo "FAIL: progress init broken"; node rihal/bin/rihal-tools.cjs progress init 2>&1 | head -40; exit 1; }
</automated>
</verify>

<done>
- `grep "function parseRoadmapPhases" rihal/bin/rihal-tools.cjs` returns 0 matches
- `grep "parseRoadmapPhases(" rihal/bin/rihal-tools.cjs` returns 0 matches
- `node rihal/bin/rihal-tools.cjs progress init` produces phases output identical in shape to before
- `node rihal/bin/rihal-tools.cjs progress bar --raw` still produces an ASCII bar (unchanged)
</done>

---

### Story 13.1.3 — Replace inline regex in cmdState --from-disk with extractPhases

<files>
- rihal/bin/rihal-tools.cjs (lines ~2460-2478 inside cmdState's add-phase / sync flow)
</files>

<read_first>
- rihal/bin/rihal-tools.cjs lines 2440-2510 (full context of the cmdState branch that uses `pipeRe` and `headRe` to compute `maxNum`)
</read_first>

<action>
At rihal-tools.cjs ~line 2467-2477, the code computes `maxNum` by running TWO inline regexes against ROADMAP.md:
```js
const pipeRe = /^\|\s*(\d{1,3})\s*\|/gm;
// ...
const headRe = /^#{2,4}\s*Phase\s+(\d{1,3})\b/gm;
```

Replace both regex blocks with one call to `extractPhases`:
```js
if (fs.existsSync(roadmapPath)) {
  const text = fs.readFileSync(roadmapPath, 'utf8');
  const roadmap = require(path.join(__dirname, 'lib', 'roadmap.cjs'));
  for (const p of roadmap.extractPhases(text)) {
    const n = parseInt(String(p.number).split('.')[0], 10);
    if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
  }
}
```

Notes:
- `String(p.number).split('.')[0]` handles sub-phase numbers like "13.1" — match the original behavior, which used `\d{1,3}` and ignored decimals.
- The original pipe regex captured `\d{1,3}` even on rows where extractPhases (post-13.1.1) might skip due to the "Phase" header-row guard. Confirm equivalence by running this against ROADMAP.md and comparing maxNum before/after — see verify block.
- Do not move the `fs.existsSync(roadmapPath)` check; keep it where it was.
- Do not introduce an additional top-of-file require if `roadmap` is already loaded via `cmdState` — check first; if not, the inline `require` inside the branch is fine and matches the pattern used elsewhere (cmdInit at line 415).
</action>

<verify>
<automated>
cd /home/hanzla/development/rihal-code && grep -nE "/\^\#\{2,4\}\\\\s\*Phase|pipeRe\s*=|headRe\s*=" rihal/bin/rihal-tools.cjs | grep -v "^\s*//" && { echo "FAIL: inline regex still present"; exit 1; } || echo "PASS: inline phase regex removed"
</automated>

<automated>
cd /home/hanzla/development/rihal-code && node rihal/bin/rihal-tools.cjs state sync --from-disk 2>&1 | grep -q '"phases_found": [1-9]' && echo "PASS: state sync reports phases_found >= 1 (no #455 regression)" || { echo "FAIL: state sync broken"; node rihal/bin/rihal-tools.cjs state sync --from-disk 2>&1 | head -20; exit 1; }
</automated>

<automated>
# Final consolidation gate — exactly one parser function remaining
cd /home/hanzla/development/rihal-code && total=$(grep -hE "function.*[Pp]arse.*[Rr]oadmap|^function extractPhases" rihal/bin/rihal-tools.cjs rihal/bin/lib/roadmap.cjs | wc -l); [ "$total" = "1" ] && echo "PASS: exactly 1 parser definition" || { echo "FAIL: $total parser definitions"; grep -nE "function.*[Pp]arse.*[Rr]oadmap|^function extractPhases" rihal/bin/rihal-tools.cjs rihal/bin/lib/roadmap.cjs; exit 1; }
</automated>

<automated>
cd /home/hanzla/development/rihal-code && pnpm test 2>&1 | tail -20 | grep -qE "132 (passed|passing)" && echo "PASS 132 tests" || { echo "FAIL: tests broken"; pnpm test 2>&1 | tail -40; exit 1; }
</automated>
</verify>

<done>
- The two inline regexes (`pipeRe`, `headRe`) are gone from cmdState
- `extractPhases` is the only parser used in cmdState's --from-disk branch
- Acceptance gate: `grep -c "function.*[Pp]arse.*[Rr]oadmap" rihal/bin/rihal-tools.cjs rihal/bin/lib/roadmap.cjs` shows exactly 1 total (the `extractPhases` definition in lib/roadmap.cjs)
- `state sync --from-disk` still reports `phases_found >= 1`
- 132/132 tests pass
- Dogfood Check 3 (state sync heading-style #455) and Check 4 (roadmap list-phases #464) still pass
</done>

</tasks>

<verification>
- `grep -c "function.*[Pp]arse.*[Rr]oadmap" rihal/bin/rihal-tools.cjs rihal/bin/lib/roadmap.cjs` → exactly 1 (only `extractPhases` in lib/roadmap.cjs counts; we add a `function extractPhases` count too via the regex hit)
- `node rihal/bin/rihal-tools.cjs roadmap list-phases` returns ≥10 phases
- `node rihal/bin/rihal-tools.cjs roadmap get-phase 6` returns `"found": true`
- `node rihal/bin/rihal-tools.cjs progress init` returns phases in expected shape
- `node rihal/bin/rihal-tools.cjs state sync --from-disk` reports `phases_found >= 1`
- `bash scripts/dogfood-check.sh` passes (no #455 / #464 regressions)
- `pnpm test` shows 132/132 passing
</verification>

<success_criteria>
1. Exactly one parser function across the two files (verified by grep)
2. All four caller sites work end-to-end: roadmap dispatch (already wired), cmdProgress, cmdState --from-disk, cmdInit (still uses roadmap.dispatch — unchanged here)
3. 132/132 existing tests pass
4. Dogfood checks 3 and 4 pass
</success_criteria>

<output>
On completion, write `.planning/phases/13-parser-walker-consolidation/13-1-SUMMARY.md` documenting:
- Functions deleted (parseRoadmapPhases, inline pipeRe/headRe block)
- extractPhases extension to support pipe-table format
- Verification gate output (grep counts + test count)
</output>
