---
phase: 21-dashboard-data-pipeline
sprint: 21.1
type: execute
wave: 1
depends_on: []
files_modified:
  - server/lib/scanner.js
  - server/lib/html/client.js
autonomous: true
requirements: ["#591"]

must_haves:
  truths:
    - Phase IDs like "100.1" resolve to the correct filesystem directory (e.g. "100-name") in the dashboard
    - Integer phase IDs (e.g. "13") continue to resolve to "13-name" directories without regression
    - Clicking a phase card with a decimal ID navigates to the correct phase detail view
    - When state.json sprints[].stories is empty but a sprintFile path exists, the Tasks view shows tasks parsed from the SPRINT.md file
  artifacts:
    - server/lib/scanner.js with decimal-safe padded ID at line 85 and SPRINT.md fallback parser after line 81
    - server/lib/html/client.js with String() normalization on ph.id and subId comparisons at line 456
  key_links:
    - scanner.js line 85 padded var feeds the directory prefix match at line 89 — must produce integer portion only
    - scanner.js allStories flatmap at line 81 is upstream of the stories/storiesDone counts in the returned phase object
    - client.js renderPhases(subId) line 456 find() receives subId as a URL string segment — must coerce both sides
---

<objective>
Fix two root-cause bugs that prevent decimal phase IDs from resolving in the dashboard (#591) and
extend scanner.js with a SPRINT.md fallback parser so tasks appear when state.json stories are empty.

Purpose: Phase IDs like "100.1" are written to state.json by rihal-planner but the scanner constructs
a padded directory prefix from the full decimal string, producing "100.1" instead of "100", so no
directory match is found. Client-side, renderPhases passes a string subId from the URL hash while
ph.id may be a number, causing strict equality to fail.

Output:
- server/lib/scanner.js: decimal-safe ID extraction + SPRINT.md fallback parser
- server/lib/html/client.js: String() normalization on all phase ID comparisons
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/phases/21-dashboard-data-pipeline/CONTEXT.md
</context>

<tasks>

### Task 21.1.01 — Fix decimal phase ID in scanner.js (line 85) + add SPRINT.md fallback parser
type: auto
estimate: 30 min

<read_first>
- server/lib/scanner.js (full file, 217 lines) — understand the phase mapping block (lines 77-111)
</read_first>

<action>
Open server/lib/scanner.js. Make two targeted edits — do not touch any other lines.

**Edit 1 — Fix line 85: decimal-safe padded ID**

Current line 85:
```js
      const padded = String(p.id || p.number || '').padStart(2, '0');
```

Replace with:
```js
      const intId  = String(p.id || p.number || '').split('.')[0];
      const padded = intId.padStart(2, '0');
```

This splits "100.1" → "100", then pads — "100" is already 3 chars so padStart(2) is a no-op, which is correct.
Integer IDs like "13" split to ["13"], take [0] = "13", pad to "13" — no regression.

**Edit 2 — SPRINT.md fallback parser after the allStories block (after line 83, before the padded declaration)**

Current lines 80-83:
```js
      const sprints    = Array.isArray(p.sprints) ? p.sprints : [];
      const allStories = sprints.flatMap(s => Array.isArray(s.stories) ? s.stories : []);
      const done  = allStories.filter(s => s.status === 'done' || s.status === 'completed').length;
      const total = allStories.length;
```

Replace the entire block (lines 80-83) with the following expanded version:

```js
      const sprints    = Array.isArray(p.sprints) ? p.sprints : [];
      let   allStories = sprints.flatMap(s => Array.isArray(s.stories) ? s.stories : []);

      // #590 fallback: when state.json has no stories but a sprintFile exists, parse the SPRINT.md
      // to extract task lines as synthetic story entries so the Tasks view is not empty.
      if (allStories.length === 0) {
        // sprintFile is built later in this same map() call — we need a temporary dir scan here.
        const phasesDir2 = path.join(projectDir, '.planning', 'phases');
        try {
          const intIdFb   = String(p.id || p.number || '').split('.')[0];
          const paddedFb  = intIdFb.padStart(2, '0');
          const dirsFb    = fs.readdirSync(phasesDir2, { withFileTypes: true });
          const matchFb   = dirsFb.find(d => d.isDirectory() && d.name.startsWith(paddedFb + '-'));
          if (matchFb) {
            const allMdFb   = fs.readdirSync(path.join(phasesDir2, matchFb.name)).filter(f => f.endsWith('.md'));
            const numberedFb = allMdFb.filter(f => /^\d{2}-\d{2}-/.test(f)).sort().reverse();
            const chosenFb  = numberedFb.length ? numberedFb[0] : allMdFb.sort().reverse()[0];
            if (chosenFb) {
              const mdText = safeReadText(path.join(phasesDir2, matchFb.name, chosenFb));
              if (mdText) {
                // Match "- [ ] ...", "- [x] ...", "- [X] ..." task list lines
                const taskLines = mdText.split('\n').filter(l =>
                  /^[-*]\s+\[[ xX]\]/.test(l.trim())
                );
                allStories = taskLines.map((l, i) => {
                  const checked = /\[[ xX]\]/.test(l) && !/\[ \]/.test(l);
                  const title   = l.replace(/^[-*]\s+\[[ xX]\]\s*/, '').trim();
                  return {
                    id:     (p.id || p.number || 'p') + '-task-' + (i + 1),
                    title:  title || ('Task ' + (i + 1)),
                    status: checked ? 'done' : 'todo',
                    _source: 'sprint-md-fallback',
                  };
                });
              }
            }
          }
        } catch { /* phasesDir missing or unreadable — leave allStories empty */ }
      }

      const done  = allStories.filter(s => s.status === 'done' || s.status === 'completed').length;
      const total = allStories.length;
```

IMPORTANT: After this block, line 85 (now shifted down) still reads:
```js
      const padded = String(p.id || p.number || '').padStart(2, '0');
```
Apply Edit 1 to that line as well — it now appears after the fallback block. The final file must have both fixes.

Do NOT modify scanMemoryBank, the exports, or any other function.
</action>

<verify>
```bash
node -e "
const { scanState } = require('./server/lib/scanner.js');
console.log('scanner loaded OK');
"
```
Expected output: `scanner loaded OK` — no syntax errors or require failures.

```bash
node -e "
const src = require('fs').readFileSync('./server/lib/scanner.js','utf8');
const hasIntId = src.includes(\"split('.')[0]\");
const hasFallback = src.includes('sprint-md-fallback');
console.log('decimal fix:', hasIntId);
console.log('fallback parser:', hasFallback);
"
```
Expected output:
```
decimal fix: true
fallback parser: true
```
</verify>

<acceptance_criteria>
1. `grep -n "split('\.')\[0\]" server/lib/scanner.js` returns at least 2 matches (one in fallback block, one in the padded declaration)
2. `grep -n "sprint-md-fallback" server/lib/scanner.js` returns 1 match
3. `node -e "require('./server/lib/scanner.js')" ` exits with code 0
4. `grep -n "const padded" server/lib/scanner.js` shows `split('.')[0]` on the same or adjacent line
</acceptance_criteria>

---

### Task 21.1.02 — Normalize phase ID comparisons in client.js
type: auto
estimate: 20 min

<read_first>
- server/lib/html/client.js lines 453-460 — renderPhases find() call
- server/lib/html/client.js line 164 — isCur comparison
- server/lib/html/client.js line 506 — renderSprints find() call
</read_first>

<action>
Open server/lib/html/client.js. Make three targeted line edits only — do not rewrite any surrounding blocks.

**Edit 1 — line 456: renderPhases subId lookup**

Current:
```js
    const p = _phases.find(ph => ph.id === subId || ph.number === subId);
```

Replace with:
```js
    const p = _phases.find(ph => String(ph.id) === String(subId) || String(ph.number) === String(subId));
```

Reason: `subId` comes from `location.hash.slice(1)` which is always a string. `ph.id` may be a number
(e.g. `100`) when deserialized from JSON. Strict equality `100 === "100"` is false; String() coercion fixes it.

**Edit 2 — line 164: isCur comparison in phaseCard**

Current:
```js
  const isCur = p.id === S.currentPhase;
```

Replace with:
```js
  const isCur = String(p.id) === String(S.currentPhase);
```

Reason: Same type mismatch risk — currentPhase from state.json may be stored as a number.

**Edit 3 — line 506: renderSprints subId lookup**

Current:
```js
    const s = sprints.find(sp => sp.id === subId);
```

Replace with:
```js
    const s = sprints.find(sp => String(sp.id) === String(subId));
```

Reason: Sprint IDs like "21.1" follow the same string-vs-number risk when navigated via hash route.

Do NOT change any other lines. Do NOT modify the `esc()` calls, `navTo()` calls, or onclick attributes.
</action>

<verify>
```bash
node -e "
const src = require('fs').readFileSync('./server/lib/html/client.js','utf8');
const lines = src.split('\n');
const line456 = lines.find(l => l.includes('_phases.find(ph =>'));
const line164 = lines.find(l => l.includes('isCur'));
const line506 = lines.find(l => l.includes('sprints.find(sp =>'));
console.log('renderPhases find:', line456 && line456.includes('String(ph.id)') ? 'OK' : 'MISSING');
console.log('isCur:', line164 && line164.includes('String(p.id)') ? 'OK' : 'MISSING');
console.log('renderSprints find:', line506 && line506.includes('String(sp.id)') ? 'OK' : 'MISSING');
"
```
Expected output:
```
renderPhases find: OK
isCur: OK
renderSprints find: OK
```
</verify>

<acceptance_criteria>
1. `grep -n "String(ph.id)" server/lib/html/client.js` returns 1 match on the renderPhases find line
2. `grep -n "String(p.id)" server/lib/html/client.js` returns 1 match on the isCur line (phaseCard)
3. `grep -n "String(sp.id)" server/lib/html/client.js` returns 1 match on the renderSprints find line
4. `grep -n "ph\.id === subId" server/lib/html/client.js` returns 0 matches (old form fully replaced)
5. `grep -n "p\.id === S\.currentPhase" server/lib/html/client.js` returns 0 matches
6. `grep -n "sp\.id === subId" server/lib/html/client.js` returns 0 matches
</acceptance_criteria>

---

### Task 21.1.03 — Integration smoke test
type: checkpoint:human-verify
estimate: 15 min

<read_first>
- server/lib/scanner.js (verify edits from Task 01 are present)
- server/lib/html/client.js (verify edits from Task 02 are present)
</read_first>

<action>
Run the dashboard server and verify the two bugs are resolved:

```bash
node /home/hanzla/development/rihal-code/server/dashboard.js
```

Open http://localhost:3000 (or whichever port dashboard.js reports).

Manual checks:
1. Navigate to Phases view. Click on a phase with a decimal ID (e.g. phase "21" or any phase whose
   directory is named "21-dashboard-data-pipeline"). Verify the phase detail card loads — not "Phase not found."
2. Navigate to Tasks view. If any phase has an empty stories array in state.json but has a SPRINT.md file,
   verify tasks appear (sourced from the fallback parser — they will have status "todo" or "done").
3. Verify an integer phase ID (e.g. phase "13" or "20") still opens its detail page without regression.

These are visual checks that cannot be fully automated — pause for human verification.
</action>

<verify>
```bash
node -e "
const { scanState } = require('./server/lib/scanner.js');
// smoke: scanner loads and exports correctly
const s = scanState('/home/hanzla/development/rihal-code/.rihal');
console.log('phases:', s.phases.length);
console.log('projectName:', s.projectName || '(none)');
console.log('smoke OK');
"
```
Expected: prints phase count and project name, ends with `smoke OK`.
</verify>

<acceptance_criteria>
1. Dashboard server starts without errors: `node server/dashboard.js` exits cleanly if no .rihal/ — or serves on port when .rihal/ exists
2. Human confirms: decimal phase ID click opens phase detail (not "Phase not found.")
3. Human confirms: integer phase IDs still open correctly
4. Human confirms: Tasks view shows entries for phases that have SPRINT.md but empty stories in state.json (or confirms tasks present from state.json)
</acceptance_criteria>

</tasks>

<verification>
```bash
# 1. Both files load without syntax errors
node -e "require('./server/lib/scanner.js'); console.log('scanner OK')"

# 2. Decimal fix present in scanner.js
grep -c "split('\.')[0]" server/lib/scanner.js

# 3. Fallback parser present in scanner.js
grep -c "sprint-md-fallback" server/lib/scanner.js

# 4. All three String() normalizations present in client.js
grep -c "String(ph\.id)" server/lib/html/client.js
grep -c "String(p\.id)" server/lib/html/client.js
grep -c "String(sp\.id)" server/lib/html/client.js

# 5. Old strict equality forms are gone
grep -c "ph\.id === subId" server/lib/html/client.js    # must be 0
grep -c "sp\.id === subId" server/lib/html/client.js    # must be 0
```
</verification>

<success_criteria>
- scanner.js: `split('.')[0]` present on line computing `intId` (appears twice: once in fallback block, once for `padded`)
- scanner.js: `sprint-md-fallback` string present (marks synthetic story source)
- scanner.js: `node -e "require('./server/lib/scanner.js')"` exits 0
- client.js: `String(ph.id) === String(subId)` on the renderPhases find line
- client.js: `String(p.id) === String(S.currentPhase)` on the isCur line
- client.js: `String(sp.id) === String(subId)` on the renderSprints find line
- No other lines in either file were modified (git diff line count is minimal)
</success_criteria>

<output>
Create `.planning/phases/21-dashboard-data-pipeline/21-01-SUMMARY.md` on sprint completion.
</output>
