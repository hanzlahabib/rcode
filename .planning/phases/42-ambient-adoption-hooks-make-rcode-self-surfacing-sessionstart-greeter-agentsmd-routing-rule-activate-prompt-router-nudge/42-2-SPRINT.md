---
sprint: 42.2
goal: "Add the session-start subcommand to rcode-hooks.cjs (one-line phase primer via systemMessage), extract shared state-reading helpers into rcode/bin/lib/state-reader.cjs to stay under the 1000-line limit, and register SessionStart in settings-hooks.json + enable-hooks.md. (#947)"
depends_on: []
files_modified:
  - rcode/bin/rcode-hooks.cjs
  - rcode/bin/lib/state-reader.cjs
  - rcode/templates/settings-hooks.json
  - rcode/workflows/enable-hooks.md
sequential: false
---

# Sprint 42.2 — SessionStart greeter hook + state-reader extraction (#947)

**Phase:** 42 — Ambient adoption hooks — make rcode self-surfacing
**Status:** planned
**Velocity target:** 21 points
**Started:** —

## Sprint Goal

Implement the `session-start` subcommand in `rcode/bin/rcode-hooks.cjs` so Claude Code greets the user with a one-line project status primer on every session open. The file is exactly 1000 lines — adding the subcommand directly would exceed the limit. The plan therefore first extracts the shared state-reading logic from `preCompact` into `rcode/bin/lib/state-reader.cjs`, then refactors `preCompact` to use it (freeing ~50 net lines: §2 phase resolution, §3 sprint reading, §4 git-log, and §5 milestone — all four blocks extracted, one `require` line added), and finally adds `session-start` using the same helpers in the freed headroom.

The greeter emits a one-line `systemMessage` such as:  
`📍 Phase 42 executing · 1/3 sprints done · next: /rcode-execute`

It derives the "next" command from phase status: `planned` with no sprint files → `/rcode-plan`, `planned` with sprint files → `/rcode-execute`, `executing` → `/rcode-execute`, `complete` → `/rcode-add-phase`, no active phase → exits silently. Advisory only — exits 0 on any error.

SessionStart entry is also added to `rcode/templates/settings-hooks.json` and documented in `rcode/workflows/enable-hooks.md`.

## Stories

| ID | Title | Points | Status | Done when |
|----|-------|--------|--------|-----------|
| 42.2.01 | Extract state-reading helpers into `rcode/bin/lib/state-reader.cjs` | 5 | planned | New file exports `resolveActivePhase(state)`, `readSprintProgress(phaseLabel, cwd)`, `readMilestoneHint(state, cwd)`, and `readRecentCommits(cwd)` as CommonJS; `node --check rcode/bin/lib/state-reader.cjs` passes; all four helpers produce identical results to the inlined preCompact logic (same logic, different module). |
| 42.2.02 | Refactor `preCompact` to use `state-reader.cjs`; verify line count ≤ 950 | 3 | planned | `preCompact` calls all four extracted helpers (§2 phase, §3 sprint, §4 git-log, §5 milestone) instead of containing the logic inline; `wc -l rcode/bin/rcode-hooks.cjs` reports ≤ 950; `node --check rcode/bin/rcode-hooks.cjs` passes; preCompact behavior is unchanged (HANDOFF.json still written, systemMessage still emitted). |
| 42.2.03 | Add `session-start` subcommand to `rcode-hooks.cjs` | 8 | planned | `promptRouter` pattern followed: synchronous stdin drain, fail-open, exit 0 always; uses `resolveActivePhase` from state-reader.cjs; emits `{ systemMessage }` with the one-line primer; derives next-command from phase status mapping; registered in `main()` switch and usage string; file header doc comment updated; final `wc -l` ≤ 1000. |
| 42.2.04 | Add `SessionStart` entry to `rcode/templates/settings-hooks.json` | 2 | planned | A `SessionStart` key is added to the `hooks` object with a matcher `""` and command `node .rcode/bin/rcode-hooks.cjs session-start`; file is valid JSON (`JSON.parse` check passes). |
| 42.2.05 | Update `rcode/workflows/enable-hooks.md` for SessionStart | 3 | planned | Step 3's hook-type list includes `SessionStart`; Step 5.5 confirmation message lists `session-start` greeter; purpose block in the `<purpose>` header mentions the new hook; enable-hooks.md is consistent with the updated settings-hooks.json. |

## Capacity

- **Velocity target:** 21 points
- **Total committed:** 21 points
- **Buffer:** 0 points (0%)

## Dependencies

| Story | Depends on | Status |
|-------|-----------|--------|
| 42.2.02 | 42.2.01 (state-reader.cjs must exist before preCompact is refactored) | planned |
| 42.2.03 | 42.2.02 (hooks file must be ≤ 950 lines before adding session-start) | planned |
| 42.2.05 | 42.2.04 (settings-hooks.json must be updated before enable-hooks docs can reference it) | planned |

## Stories — detail

### Story 42.2.01 — Extract state-reading helpers into `rcode/bin/lib/state-reader.cjs`

<objective>
Create `rcode/bin/lib/state-reader.cjs` extracting the four state-reading helpers currently inlined in `preCompact` (lines 355–416 of `rcode/bin/rcode-hooks.cjs`): phase resolution (§2), sprint reading (§3), recent git commits (§4), and milestone hint (§5). This module will be required by both the refactored `preCompact` and the new `session-start` subcommand.
</objective>

<action>
Create `/home/hanzla/development/rihal-code/rcode/bin/lib/state-reader.cjs` with the following four exported functions. Logic is extracted verbatim from `preCompact` — no behavioral changes.

```js
'use strict';
/**
 * state-reader.cjs — shared state-reading helpers for rcode-hooks.cjs subcommands.
 * Extracted from preCompact to keep rcode-hooks.cjs under 1000 lines.
 * Pure Node stdlib. No external dependencies.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Resolve the active phase entry and a human-readable label from state.json.
 * Returns { activePhase, phaseLabel } — both may be null if state is absent.
 */
function resolveActivePhase(state) {
  const phases = Array.isArray(state?.phases) ? state.phases : [];
  const executing = phases.find((p) => p && p.status === 'executing');
  const matched = phases.find(
    (p) => p && (p.name === state?.current_phase || p.number === state?.current_phase)
  );
  const activePhase = executing || matched || null;
  const phaseLabel = activePhase
    ? (activePhase.number || activePhase.name || state?.current_phase)
    : (state?.current_phase || null);
  return { activePhase, phaseLabel };
}

/**
 * Read the most recent SPRINT.md under .planning/phases/<phaseLabel>*/ and return
 * sprint progress counts + up to 10 incomplete task strings.
 * Returns { completedCount: { done, total }, incompleteTasks: string[] }.
 */
function readSprintProgress(phaseLabel, cwd) {
  const completedCount = { done: 0, total: 0 };
  const incompleteTasks = [];
  const planningBase = path.join(cwd, '.planning', 'phases');
  if (!phaseLabel || !fs.existsSync(planningBase)) {
    return { completedCount, incompleteTasks };
  }
  try {
    const phaseDirs = fs.readdirSync(planningBase)
      .filter(d => d.startsWith(String(phaseLabel)));
    for (const pd of phaseDirs) {
      const pdPath = path.join(planningBase, pd);
      if (!fs.statSync(pdPath).isDirectory()) continue;
      const sprintFiles = fs.readdirSync(pdPath)
        .filter(f => f.endsWith('-SPRINT.md'))
        .sort()
        .reverse();
      if (sprintFiles.length === 0) continue;
      const sprintText = fs.readFileSync(path.join(pdPath, sprintFiles[0]), 'utf8');
      for (const line of sprintText.split('\n')) {
        const done = /^\s*-\s*\[x\]/i.test(line);
        const pending = /^\s*-\s*\[ \]/.test(line);
        if (done || pending) completedCount.total++;
        if (done) completedCount.done++;
        if (pending) {
          const task = line.replace(/^\s*-\s*\[ \]\s*/, '').trim();
          if (task) incompleteTasks.push(task);
        }
      }
      break; // use first matching phase dir only
    }
  } catch { /* ignore — readSprintProgress is advisory */ }
  return { completedCount, incompleteTasks: incompleteTasks.slice(0, 10) };
}

/**
 * Read the 5 most recent git commit subjects. Returns string[].
 * Returns [] when git is unavailable or outside a repository.
 */
function readRecentCommits(cwd) {
  try {
    const log = execSync('git log --oneline -5 --no-decorate 2>/dev/null', {
      cwd, encoding: 'utf8', timeout: 3000,
    }).trim();
    return log ? log.split('\n').filter(Boolean) : [];
  } catch { return []; }
}

/**
 * Read the milestone hint from state.json or .planning/ROADMAP.md.
 * Returns a string or null.
 */
function readMilestoneHint(state, cwd) {
  if (state?.milestone) return state.milestone;
  for (const rp of ['.planning/ROADMAP.md', '.planning/milestones/ROADMAP.md']) {
    const full = path.join(cwd, rp);
    if (!fs.existsSync(full)) continue;
    try {
      const m = fs.readFileSync(full, 'utf8').match(/^##\s+Milestone\s+(M\d+[^\n]*)/m);
      if (m) return m[1].trim();
    } catch { /* ignore */ }
  }
  return null;
}

module.exports = { resolveActivePhase, readSprintProgress, readRecentCommits, readMilestoneHint };
```

NOTE: The PostToolUse `sync-bin-on-edit.sh` hook in this repo auto-copies `rcode/bin/` → `.rcode/bin/` on every Edit/Write, so `.rcode/bin/lib/state-reader.cjs` will be synced automatically.
</action>

<verify>
<automated>
node --check rcode/bin/lib/state-reader.cjs
node -e "const sr=require('./rcode/bin/lib/state-reader.cjs'); if(typeof sr.resolveActivePhase!=='function')throw new Error('resolveActivePhase missing'); if(typeof sr.readSprintProgress!=='function')throw new Error('readSprintProgress missing'); if(typeof sr.readRecentCommits!=='function')throw new Error('readRecentCommits missing'); if(typeof sr.readMilestoneHint!=='function')throw new Error('readMilestoneHint missing'); console.log('state-reader exports OK');"
</automated>
</verify>

### Story 42.2.02 — Refactor `preCompact` to use `state-reader.cjs`; verify line count ≤ 950

<objective>
Replace all four inlined logic blocks in `preCompact` with calls to the extracted helpers (§2 phase resolution ~10 lines, §3 sprint reading ~31 lines, §4 git-log ~8 lines, §5 milestone ~10 lines → total ~59 lines removed, +1 require line = ~58 net lines freed), then verify the file is at or below 950 lines. Behavioral output of preCompact must be unchanged.
</objective>

<action>
In `rcode/bin/rcode-hooks.cjs`:

1. At the top of the file (after `const { execSync, spawnSync } = require('child_process');`), add:
   ```js
   const { resolveActivePhase, readSprintProgress, readRecentCommits, readMilestoneHint } = require('./lib/state-reader.cjs');
   ```

2. In `preCompact()`, replace the four inlined sections with helper calls:

   Replace §2 (lines ~355–364):
   ```js
   // ── 2. Determine active phase ────────────────────────────────────────
   const { activePhase, phaseLabel } = resolveActivePhase(state);
   ```

   Replace §3 (lines ~366–396):
   ```js
   // ── 3. Read active SPRINT.md (incomplete tasks) ──────────────────────
   const { completedCount, incompleteTasks } = readSprintProgress(phaseLabel, cwd);
   ```

   Replace §4 (lines ~398–405):
   ```js
   // ── 4. Recent git commits ────────────────────────────────────────────
   const recentCommits = readRecentCommits(cwd);
   ```

   Replace §5 (lines ~407–416):
   ```js
   // ── 5. Read milestone / roadmap headline ────────────────────────────
   const milestoneHint = readMilestoneHint(state, cwd);
   ```

3. Remove the now-redundant variable declarations that were scoped to those blocks.
4. Verify the file compiles and line count is ≤ 950 (expected ~942 after all four extractions).
</action>

<verify>
<automated>
node --check rcode/bin/rcode-hooks.cjs
COUNT=$(wc -l < rcode/bin/rcode-hooks.cjs); echo "Line count after refactor: $COUNT"; [ "$COUNT" -le 1000 ] || (echo "ERROR: file exceeds 1000 lines ($COUNT)" && exit 1)
node -e "const r=require('./rcode/bin/lib/state-reader.cjs'); console.log('require OK')"
</automated>
</verify>

### Story 42.2.03 — Add `session-start` subcommand to `rcode-hooks.cjs`

<objective>
Add a `sessionStart()` function and register `session-start` in `main()`'s switch. It reads state.json, derives a one-line primer from phase + sprint state, and emits `{ systemMessage }` — mirroring how `preCompact` emits its post-compaction message. Fail-open: exits 0 on any error. Implementation must be ≤ 39 lines (function + JSDoc, excluding the 3 main() additions) to leave comfortable headroom below the 1000-line gate.
</objective>

<action>
Add the following function to `rcode/bin/rcode-hooks.cjs`, placed just before the `main()` function. The implementation is intentionally compact — no blank lines between logical blocks, multi-branch ternary for nextCmd derivation.

```js
/**
 * session-start: Emit a one-line project status primer at session open. (#947)
 * Uses resolveActivePhase from state-reader.cjs. Advisory only — exits 0 on any error.
 */
function sessionStart() {
  try {
    try { fs.readFileSync(0, 'utf8'); } catch { /* drain stdin */ }
    const cwd = process.cwd();
    const statePath = path.join(cwd, '.rcode', 'state.json');
    if (!fs.existsSync(statePath)) process.exit(0);
    let state;
    try { state = JSON.parse(fs.readFileSync(statePath, 'utf8')); } catch { process.exit(0); }
    const { activePhase, phaseLabel } = resolveActivePhase(state);
    if (!phaseLabel) process.exit(0);
    const phaseKey = String(activePhase?.number ?? phaseLabel);
    const phaseSprints = (Array.isArray(state.sprints) ? state.sprints : []).filter(s => String(s.phase) === phaseKey);
    const doneCount = phaseSprints.filter(s => s.status === 'completed' || s.status === 'complete').length;
    const sprintSummary = phaseSprints.length > 0 ? `${doneCount}/${phaseSprints.length} sprints done` : 'no sprints yet';
    const phaseStatus = activePhase?.status || 'planned';
    const nextCmd = phaseStatus === 'executing' ? '/rcode-execute'
      : phaseStatus === 'complete' ? '/rcode-add-phase'
      : phaseSprints.length === 0 ? `/rcode-plan ${phaseLabel}`
      : '/rcode-execute';
    const primer = `\u{1F4CD} Phase ${phaseLabel} ${phaseStatus} · ${sprintSummary} · next: ${nextCmd}`;
    process.stdout.write(JSON.stringify({ systemMessage: primer }) + '\n');
  } catch { /* fail open — never block session start */ }
  process.exit(0);
}
```

Note: `\u{1F4CD}` = 📍, `·` = · (middle dot). Using Unicode escapes avoids embedding multibyte characters in source.

Then in `main()`:
1. Add `case 'session-start': sessionStart(); break;` to the switch.
2. Update the usage string to include `session-start`.
3. Update the file-header doc comment (`Subcommands:` block) to add:  
   `*   session-start — emit one-line project status primer at session open (#947)`
</action>

<verify>
<automated>
node --check rcode/bin/rcode-hooks.cjs
COUNT=$(wc -l < rcode/bin/rcode-hooks.cjs); echo "Line count after session-start: $COUNT"; [ "$COUNT" -le 1000 ] || (echo "ERROR: exceeds 1000 lines" && exit 1)
grep -c "session-start" rcode/bin/rcode-hooks.cjs
grep -c "sessionStart" rcode/bin/rcode-hooks.cjs
# Smoke: run against a project without state.json — must exit 0 cleanly.
printf '' | node rcode/bin/rcode-hooks.cjs session-start; echo "exit: $?"
</automated>
</verify>

### Story 42.2.04 — Add `SessionStart` entry to `rcode/templates/settings-hooks.json`

<objective>
Add a `SessionStart` hook block to `rcode/templates/settings-hooks.json` so the opt-in `/rcode-enable-hooks` flow can merge it into consumer projects' `.claude/settings.json`.
</objective>

<action>
Edit `rcode/templates/settings-hooks.json`. After the closing `]` of the `"UserPromptSubmit"` array and before the outer `}` closing the `hooks` object, add:

```json
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .rcode/bin/rcode-hooks.cjs session-start"
          }
        ]
      }
    ]
```

Also update the `_comment` field at the top to mention `session-start (SessionStart)` alongside the existing hook list.

Verify the file is valid JSON after the edit.
</action>

<verify>
<automated>
node -e "JSON.parse(require('fs').readFileSync('rcode/templates/settings-hooks.json','utf8')); console.log('valid JSON')"
node -e "const j=JSON.parse(require('fs').readFileSync('rcode/templates/settings-hooks.json','utf8')); if(!j.hooks.SessionStart)throw new Error('SessionStart missing'); if(!j.hooks.UserPromptSubmit)throw new Error('UserPromptSubmit missing'); console.log('SessionStart present')"
</automated>
</verify>

### Story 42.2.05 — Update `rcode/workflows/enable-hooks.md` for SessionStart

<objective>
Update `rcode/workflows/enable-hooks.md` so the enable-hooks workflow correctly handles the new `SessionStart` hook type and tells the user about the new greeter.
</objective>

<action>
Edit `rcode/workflows/enable-hooks.md`:

1. **`<purpose>` block** (line 4): update the sentence that lists enabled guardrails to add `session-start (SessionStart — one-line project status primer at session open)` at the end of the list.

2. **Step 3 — Merge hooks** (line 47): the current text lists `PreToolUse`, `PostToolUse`, `PreCompact`, `Stop`, `UserPromptSubmit` as hook types. Add `SessionStart` to this list.

3. **Step 5.5 — Print confirmation** (lines 73–91): add a bullet:
   `  • session-start: Greets the session with one-line phase status and suggested next command`

No other changes to enable-hooks.md — the merge algorithm (Steps 2–4) already handles arbitrary hook types generically.
</action>

<verify>
<automated>
grep -c "SessionStart" rcode/workflows/enable-hooks.md
grep -c "session-start" rcode/workflows/enable-hooks.md
</automated>
</verify>

## Files Touched

**Creates:**
- `rcode/bin/lib/state-reader.cjs` — CommonJS module exporting `resolveActivePhase`, `readSprintProgress`, `readRecentCommits`, `readMilestoneHint` extracted from `preCompact`

**Modifies:**
- `rcode/bin/rcode-hooks.cjs` — requires `state-reader.cjs`; refactors `preCompact` to use all four helpers; adds `sessionStart()` function + `session-start` switch case + usage/header doc updates
- `rcode/templates/settings-hooks.json` — adds `SessionStart` hook entry
- `rcode/workflows/enable-hooks.md` — adds `SessionStart` to hook type list + confirmation message

**Note:** The `sync-bin-on-edit.sh` PostToolUse hook in this repo auto-copies `rcode/bin/` → `.rcode/bin/` on every Edit/Write. Both `rcode-hooks.cjs` and the new `lib/state-reader.cjs` will be synced to `.rcode/bin/` automatically when edited.

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Extracting helpers changes preCompact behavior | HANDOFF.json written incorrectly | Extract logic verbatim (no behavior change); verify block in Story 42.2.02 |
| Line count after refactor + session-start exceeds 1000 | 1000-line rule violated | Refactor frees ~50 net lines (→ ~950); sessionStart adds ~27 lines; final ~977; wc -l gate in both 42.2.02 and 42.2.03 verify steps |
| `SessionStart` hook event name mismatch with Claude Code's actual event | Greeter never fires | Check Claude Code docs — event name in settings.json must exactly match; use `SessionStart` (CamelCase) per Claude Code hook spec |
| `session-start` reads state.json in a non-rcode project | Harmless — exits 0 when statePath absent | Already handled: `if (!fs.existsSync(statePath)) process.exit(0);` |
