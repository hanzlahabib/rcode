---
phase: 13-parser-walker-consolidation
sprint: 13.2
type: execute
wave: 2
depends_on: ["13.1"]
sequential: true
sequential_after: "13.1"
files_modified:
  - rihal/bin/rihal-tools.cjs
  - rihal/bin/lib/phase-dirs.cjs
autonomous: true
requirements_addressed:
  - "#469 — single canonical phase-dir walker"
  - "BRIEF acceptance: grep -c 'function walkPhaseDirs' rihal/bin/rihal-tools.cjs → exactly 1"
  - "BRIEF acceptance: cmdInit phase-aware fields keep working (Phase 10 #466 / Phase 12 #468 contracts)"
must_haves:
  truths:
    - "`node rihal/bin/rihal-tools.cjs init phase-op 6` returns phase_found, phase_dir, has_research, has_context, has_verification, has_plans, plan_count, has_reviews, has_uat — same shape as before"
    - "`node rihal/bin/rihal-tools.cjs progress init` includes phase disk artifact info in identical shape to before this sprint"
    - "All 132/132 existing tests still pass"
    - "Dogfood Check 6 (phase-status alignment #461) still passes"
  artifacts:
    - "New file rihal/bin/lib/phase-dirs.cjs exporting `walkPhaseDirs(phasesDir)` and `inspectPhaseDir(phasesDirEntry, phaseNum)` — the two shapes the codebase needs"
    - "rihal/bin/rihal-tools.cjs no longer contains a nested `function walkPhaseDirs` inside cmdProgress"
    - "rihal/bin/rihal-tools.cjs cmdInit's inline phase-dir scan (lines 421-460) is replaced with a call to inspectPhaseDir"
  key_links:
    - "cmdProgress calls walkPhaseDirs() via require('./lib/phase-dirs.cjs')"
    - "cmdInit calls inspectPhaseDir() via require('./lib/phase-dirs.cjs')"
    - "Both helpers share one underlying directory scan; output shapes are explicit per caller (cmdProgress wants by-num map; cmdInit wants single-phase shape with phase_slug)"
---

<objective>
Lift the two phase-dir walkers into one module: `rihal/bin/lib/phase-dirs.cjs`. cmdProgress and cmdInit both consume it. The output shapes differ (cmdProgress wants {by-num map of {plan_count, summary_count, has_research, has_context, has_verification}}; cmdInit wants {single phase: phase_slug, phase_dir, has_research, has_context, has_verification, has_plans, plan_count, has_reviews, has_uat}) — expose two functions sharing one scanner so neither caller's contract changes.

Purpose: Eliminates the second drift source. Phase 12 (#468) added `has_reviews`/`has_uat` to cmdInit only; cmdProgress's walker doesn't know about them. Lifting prevents this kind of one-sided drift.

Output: One canonical scanner. Both callers go through it. No behavior changes for downstream consumers.
</objective>

<context>
@.planning/STATE.md
@.planning/phases/13-parser-walker-consolidation/13-BRIEF.md
@.planning/phases/13-parser-walker-consolidation/13-1-SPRINT.md
@rihal/bin/lib/roadmap.cjs
</context>

<tasks>

### Story 13.2.1 — Create lib/phase-dirs.cjs with walkPhaseDirs + inspectPhaseDir

<files>
- rihal/bin/lib/phase-dirs.cjs (NEW FILE — creates: rihal/bin/lib/phase-dirs.cjs)
</files>

<read_first>
- rihal/bin/rihal-tools.cjs lines 3959-3980 (existing walkPhaseDirs nested in cmdProgress — output shape: by-num map with `path`, `dirName`, `plan_count`, `summary_count`, `has_research`, `has_context`, `has_verification`)
- rihal/bin/rihal-tools.cjs lines 421-460 (cmdInit's inline scan — output shape: single-phase fields `has_research`, `has_context`, `has_verification`, `has_plans`, `plan_count`, `has_reviews`, `has_uat`, plus `phase_slug` and `phase_dir`)
- rihal/bin/lib/roadmap.cjs (style reference — match the JSDoc comment style and stdlib-only constraint)
</read_first>

<action>
Create `rihal/bin/lib/phase-dirs.cjs`. Pure stdlib (`fs`, `path`). Export two functions backed by one private scanner:

```js
const fs = require('fs');
const path = require('path');

// Single source-of-truth artifact patterns. If a new artifact type lands
// (Phase 12 added REVIEWS.md + UAT.md — same drift class this phase fixes),
// add it here once and both consumers see it.
const ARTIFACT_PATTERNS = {
  has_research:     /(?:^|-)RESEARCH\.md$/i,
  has_context:      /(?:^|-)CONTEXT\.md$/i,
  has_verification: /(?:^|-)VERIFICATION\.md$/i,
  has_reviews:      /(?:^|-)REVIEWS\.md$/i,
  has_uat:          /(?:^|-)UAT\.md$/i,
};
const PLAN_RE    = /(?:^|-)(PLAN|SPRINT)\.md$/i;
const SUMMARY_RE = /(?:^|-)SUMMARY\.md$/i;

function scanPhaseDir(fullPath) {
  const files = fs.readdirSync(fullPath);
  const out = {
    plan_count:    files.filter(f => PLAN_RE.test(f)).length,
    summary_count: files.filter(f => SUMMARY_RE.test(f)).length,
    has_plans:     files.some(f => PLAN_RE.test(f)),
  };
  for (const [key, re] of Object.entries(ARTIFACT_PATTERNS)) {
    out[key] = files.some(f => re.test(f));
  }
  out._files = files; // exposed for files0()-style lookups by callers
  return out;
}

/**
 * walkPhaseDirs(phasesDir) — by-number map of every phase dir on disk.
 * Used by cmdProgress. Output shape preserves what cmdProgress expects today:
 *   { '6': { path, dirName, plan_count, summary_count, has_research, has_context, has_verification }, ... }
 * (Note: includes has_reviews / has_uat / has_plans too — superset; cmdProgress
 * is free to ignore the extras.)
 */
function walkPhaseDirs(phasesDir) {
  if (!fs.existsSync(phasesDir)) return {};
  const byNum = {};
  for (const entry of fs.readdirSync(phasesDir)) {
    const full = path.join(phasesDir, entry);
    if (!fs.statSync(full).isDirectory()) continue;
    const numMatch = entry.match(/^(\d{1,3}(?:\.\d+)?)/);
    if (!numMatch) continue;
    const num = numMatch[1];
    const scan = scanPhaseDir(full);
    delete scan._files;
    byNum[num] = { path: full, dirName: entry, ...scan };
  }
  return byNum;
}

/**
 * inspectPhaseDir(phasesDir, phaseNum) — single-phase lookup for cmdInit.
 * Returns { found, phase_slug, phase_dir, dirName, files, plan_count, has_*... }
 * or { found: false } if no matching directory exists.
 *
 * Matches both 'N-name' and zero-padded 'NN-name' (Phase 10 #466 lookup logic).
 */
function inspectPhaseDir(phasesDir, phaseNum) {
  if (!fs.existsSync(phasesDir)) return { found: false };
  const padded = String(phaseNum).padStart(2, '0');
  const target = String(phaseNum);
  let dirName = null;
  for (const entry of fs.readdirSync(phasesDir)) {
    if (entry === target || entry.startsWith(`${target}-`) || entry.startsWith(`${padded}-`)) {
      dirName = entry;
      break;
    }
  }
  if (!dirName) return { found: false };
  const full = path.join(phasesDir, dirName);
  const scan = scanPhaseDir(full);
  return {
    found: true,
    dirName,
    phase_slug: dirName.replace(/^\d+-/, ''),
    phase_dir: full,
    files: scan._files,
    plan_count: scan.plan_count,
    summary_count: scan.summary_count,
    has_plans: scan.has_plans,
    has_research: scan.has_research,
    has_context: scan.has_context,
    has_verification: scan.has_verification,
    has_reviews: scan.has_reviews,
    has_uat: scan.has_uat,
  };
}

module.exports = { walkPhaseDirs, inspectPhaseDir, scanPhaseDir };
```

Notes:
- The cmdInit inline scan currently uses `/(?:^|-)PLAN\.md$/i` -> match pattern. Cross-check the exact regex used today for each `has_*` field at lines 444-451. The patterns above match what's there.
- `_files` is a pragmatic escape hatch so cmdInit's `files0()` helper (used at lines 463-477 to compute `context_path`/`research_path`/`reviews_path`/`uat_path`) can still find the matching filename. We expose the raw file list rather than reimplementing files0() inside the lib.

Do NOT delete the duplicates yet — that happens in 13.2.2 and 13.2.3.
</action>

<verify>
<automated>
cd /home/hanzla/development/rihal-code && node -e "
const { walkPhaseDirs, inspectPhaseDir } = require('./rihal/bin/lib/phase-dirs.cjs');
const dirs = walkPhaseDirs('.planning/phases');
const phase13 = dirs['13'];
if (!phase13 || !phase13.path) { console.error('FAIL: phase 13 not found via walker'); process.exit(1); }
console.log('PASS walkPhaseDirs:', Object.keys(dirs).length, 'phases; phase 13 dirName=', phase13.dirName);
const ins = inspectPhaseDir('.planning/phases', 13);
if (!ins.found || !ins.phase_slug) { console.error('FAIL: inspectPhaseDir(13) missing fields'); process.exit(1); }
if (typeof ins.has_reviews !== 'boolean' || typeof ins.has_uat !== 'boolean') { console.error('FAIL: missing reviews/uat fields'); process.exit(1); }
console.log('PASS inspectPhaseDir: slug=' + ins.phase_slug + ' has_reviews=' + ins.has_reviews + ' has_uat=' + ins.has_uat);
"
</automated>
</verify>

<done>
- `rihal/bin/lib/phase-dirs.cjs` exists, ~80 lines, pure stdlib
- Exports `walkPhaseDirs`, `inspectPhaseDir`, `scanPhaseDir`
- Smoke test against `.planning/phases` returns the expected shapes for both functions
- The file has a JSDoc block matching the style of `rihal/bin/lib/roadmap.cjs`
</done>

---

### Story 13.2.2 — Replace nested walkPhaseDirs in cmdProgress with the lifted helper

<files>
- rihal/bin/rihal-tools.cjs (delete the function at lines 3959-3980; rewire its call sites)
</files>

<read_first>
- rihal/bin/rihal-tools.cjs lines 3879-end-of-cmdProgress (find the nested `walkPhaseDirs` definition and every `walkPhaseDirs()` call inside cmdProgress)
- rihal/bin/lib/phase-dirs.cjs (just-created in 13.2.1)
</read_first>

<action>
1. Inside `cmdProgress`, add (or reuse if already present at top of cmdProgress) `const phaseDirs = require(path.join(__dirname, 'lib', 'phase-dirs.cjs'));`. Place it near the other helper requires for cmdProgress.
2. Replace every call to `walkPhaseDirs()` (no args) with `phaseDirs.walkPhaseDirs(phasesDir)` — the lifted helper takes the phasesDir explicitly rather than closing over it.
3. Delete the entire nested `function walkPhaseDirs() { ... }` block (lines 3959-3980).
4. Verify with grep that no orphan callers remain.
</action>

<verify>
<automated>
cd /home/hanzla/development/rihal-code && grep -c "function walkPhaseDirs" rihal/bin/rihal-tools.cjs | grep -q "^0$" && echo "PASS: no nested walkPhaseDirs definition" || { echo "FAIL: nested function still present"; grep -n "function walkPhaseDirs" rihal/bin/rihal-tools.cjs; exit 1; }
</automated>

<automated>
cd /home/hanzla/development/rihal-code && node rihal/bin/rihal-tools.cjs progress init 2>&1 > /tmp/progress-after.json && [ -s /tmp/progress-after.json ] && echo "PASS: progress init produces output" && head -c 400 /tmp/progress-after.json || { echo "FAIL: progress init broken"; cat /tmp/progress-after.json; exit 1; }
</automated>
</verify>

<done>
- `grep "function walkPhaseDirs" rihal/bin/rihal-tools.cjs` → 0 matches
- `node rihal/bin/rihal-tools.cjs progress init` runs without error
- Output shape unchanged (verifiable by diffing against a baseline captured before this sprint started)
</done>

---

### Story 13.2.3 — Replace cmdInit's inline phase-dir scan with inspectPhaseDir

<files>
- rihal/bin/rihal-tools.cjs (lines 421-478 inside cmdInit's phase-aware branch)
</files>

<read_first>
- rihal/bin/rihal-tools.cjs lines 395-520 (cmdInit phase-aware branch, full context including the `files0()` helper usages at lines 463-478)
- rihal/bin/lib/phase-dirs.cjs (the inspectPhaseDir contract, especially the `files` field for files0-style lookups)
</read_first>

<action>
At rihal-tools.cjs ~line 415 already does `const roadmap = require(...)`. Add a parallel:
```js
const phaseDirs = require(path.join(__dirname, 'lib', 'phase-dirs.cjs'));
```

Replace the block at lines 421-460 (the inline phase-dir scan):

BEFORE (current code at 421-460):
```js
let phaseDirEntry = null;
if (fs.existsSync(phasesDir)) {
  const padded = String(phaseNum).padStart(2, '0');
  for (const entry of fs.readdirSync(phasesDir)) { ... }
}
out.phase_found = roadmapPhase !== null;
out.phase_number = String(phaseNum);
out.padded_phase = String(phaseNum).padStart(2, '0');
out.phase_name = roadmapPhase ? roadmapPhase.name : null;
out.phase_slug = phaseDirEntry ? phaseDirEntry.replace(/^\d+-/, '') : null;
out.phase_dir = phaseDirEntry ? path.join(...) : null;
if (phaseDirEntry) {
  const dirFull = path.join(phasesDir, phaseDirEntry);
  const files = fs.readdirSync(dirFull);
  out.has_research = files.some(...);
  // ... 7 more lines
} else {
  out.has_research = false;
  // ... 7 more lines
}
```

AFTER:
```js
const inspect = phaseDirs.inspectPhaseDir(phasesDir, phaseNum);
out.phase_found = roadmapPhase !== null;
out.phase_number = String(phaseNum);
out.padded_phase = String(phaseNum).padStart(2, '0');
out.phase_name = roadmapPhase ? roadmapPhase.name : null;
out.phase_slug = inspect.found ? inspect.phase_slug : null;
out.phase_dir   = inspect.found ? inspect.phase_dir   : null;
out.has_research     = inspect.found ? inspect.has_research     : false;
out.has_context      = inspect.found ? inspect.has_context      : false;
out.has_verification = inspect.found ? inspect.has_verification : false;
out.has_plans        = inspect.found ? inspect.has_plans        : false;
out.plan_count       = inspect.found ? inspect.plan_count       : 0;
out.has_reviews      = inspect.found ? inspect.has_reviews      : false;
out.has_uat          = inspect.found ? inspect.has_uat          : false;
```

The `files0(out.phase_dir, /CONTEXT\.md$/i)` calls below (lines 463-478) keep working as-is — they re-read the directory. (Optional micro-optimization later: pass `inspect.files` into a variant of files0() to avoid the second readdirSync. Out of scope for this sprint.)

Note: `out.phase_found` retains its EXISTING semantic (driven by `roadmapPhase !== null`, NOT by `inspect.found`). Do not change that — it would break the workflow contract that distinguishes "phase declared in ROADMAP" from "phase has artifacts on disk".
</action>

<verify>
<automated>
cd /home/hanzla/development/rihal-code && node rihal/bin/rihal-tools.cjs init phase-op "13" 2>&1 | node -e "
let buf=''; process.stdin.on('data',c=>buf+=c).on('end',()=>{
  let j; try { j = JSON.parse(buf); } catch(e) { console.error('FAIL non-JSON:', buf.slice(0,200)); process.exit(1); }
  const need = ['phase_found','phase_number','padded_phase','phase_slug','phase_dir','has_research','has_context','has_verification','has_plans','plan_count','has_reviews','has_uat'];
  for (const k of need) { if (!(k in j)) { console.error('FAIL missing field:', k); process.exit(1); } }
  console.log('PASS init phase-op 13: all 12 fields present; slug=' + j.phase_slug + ' has_uat=' + j.has_uat);
});
"
</automated>

<automated>
# Final consolidation gate for walker
cd /home/hanzla/development/rihal-code && total=$(grep -c "function walkPhaseDirs" rihal/bin/rihal-tools.cjs); [ "$total" = "0" ] && echo "PASS: no nested walkPhaseDirs in rihal-tools.cjs (lifted to lib/phase-dirs.cjs)" || { echo "FAIL: $total walker definitions remain"; exit 1; }
</automated>

<automated>
cd /home/hanzla/development/rihal-code && pnpm test 2>&1 | tail -10 | grep -qE "132 (passed|passing)" && echo "PASS 132 tests" || { echo "FAIL: tests broken"; pnpm test 2>&1 | tail -40; exit 1; }
</automated>

<automated>
cd /home/hanzla/development/rihal-code && bash scripts/dogfood-check.sh 2>&1 | tail -5 | grep -q "Dogfood checks passed" && echo "PASS dogfood" || { echo "FAIL dogfood"; bash scripts/dogfood-check.sh 2>&1; exit 1; }
</automated>
</verify>

<done>
- `grep "function walkPhaseDirs" rihal/bin/rihal-tools.cjs` returns 0 matches (the canonical now lives in `rihal/bin/lib/phase-dirs.cjs`)
- The inline phase-dir scan block in cmdInit (was ~40 lines, 421-460) is replaced by a single `inspectPhaseDir` call + flat field assignments
- `node rihal/bin/rihal-tools.cjs init phase-op "13"` returns all 12 expected fields with correct values
- 132/132 tests pass
- `scripts/dogfood-check.sh` passes
</done>

</tasks>

<verification>
- `grep -c "function walkPhaseDirs" rihal/bin/rihal-tools.cjs` → 0 (canonical lives in lib/phase-dirs.cjs)
- `grep -c "function walkPhaseDirs\|function inspectPhaseDir" rihal/bin/lib/phase-dirs.cjs` → 2
- `node rihal/bin/rihal-tools.cjs init phase-op "13"` returns full Phase 12 (#468) field contract
- `node rihal/bin/rihal-tools.cjs progress init` produces output identical in shape to baseline
- 132/132 tests pass
- Dogfood Check 6 (phase-status alignment #461) still passes
</verification>

<success_criteria>
1. Exactly one canonical walker implementation, in lib/phase-dirs.cjs
2. cmdInit + cmdProgress both go through the lifted helper
3. cmdInit Phase 12 (#468) field contract preserved (`has_reviews`, `has_uat`, paths)
4. 132/132 tests pass
5. Dogfood checks pass
</success_criteria>

<output>
On completion, write `.planning/phases/13-parser-walker-consolidation/13-2-SUMMARY.md` documenting:
- New file lib/phase-dirs.cjs (LOC, exports, design rationale)
- Lines deleted from rihal-tools.cjs (count + line ranges)
- Verification gate output
</output>
