# AUDIT2 — Lens 2: Performance (Round 2)

**Branch:** `audit2-lens-2-performance`
**Date:** 2026-05-25
**Auditor:** lens-2-performance agent
**Prior audit:** `audit/06-performance.md`
**Scope:** General code-health performance scan — NOT rebrand residue. Fresh eyes on sync I/O patterns, loop anti-patterns, caching gaps, JSON.parse safety, quadratic algorithms, and missing memoization.

---

## Scope Scanned

| Path | Description |
|------|-------------|
| `cli/install.js` (2992 lines) | Primary install path — runs on every `pnpm add` |
| `cli/github-sync.js` (1020 lines) | GitHub integration — reads phases/stories from disk |
| `cli/doctor.js` (446 lines) | Health-check command |
| `cli/update.js` (469 lines) | Update command |
| `server/dashboard.js` | HTTP server + routing |
| `server/lib/scanner.js` (375 lines) | `scanState()` implementation |
| `server/lib/api.js` (185 lines) | API route handlers |
| `server/lib/html/client/` | Dashboard client-side JS |
| `rcode/workflows/*.md` | Workflow scripts (bash snippets) |
| `.rcode/state.json` (34 KB, 1016 lines) | Live state file |

---

## Commands Run

```bash
grep -n "readFileSync" cli/install.js | wc -l                     # 38
grep -n "readdirSync" cli/install.js | wc -l                      # 21
grep -n "existsSync" cli/install.js | wc -l                       # 90
grep -rn "scanState(" server/                                      # 3 call sites
grep -n "JSON.parse" cli/github-sync.js                           # 2 unguarded
grep -rn "setInterval" server/lib/html/client/                    # 30s + 4s polls
grep -n "walkScanDir\|walkForSkills" cli/install.js               # recursive, no depth cap
python3 [loop-context script]                                      # confirmed 10 readFileSync-in-loop sites
ls -la .rcode/state.json                                           # 34,141 bytes
wc -l cli/install.js cli/github-sync.js cli/doctor.js ...
```

---

## Findings

| ID | File:Line | Description | Severity |
|----|-----------|-------------|----------|
| P01 | `cli/install.js:1378–1382` | `readFileSync` inside `for (const entry of plan)` loop — reads every agent .md file synchronously one-by-one | **critical** |
| P02 | `cli/install.js:1400–1405` | `readFileSync` inside second plan loop (existing-agents reconciliation) — `readdirSync(agentDir)` + `readFileSync` per file | **critical** |
| P03 | `cli/install.js:1435–1440` | `readFileSync` inside skill-scan loop — `readdirSync(scanDir)` then `readFileSync` per skill file | **critical** |
| P04 | `cli/install.js:1461–1464` | `readFileSync` inside files-manifest generation loop — reads every planned file into a buffer to compute sha256 | **critical** |
| P05 | `cli/install.js:1506–1512` | `readFileSync(manifestPath)` then inner loop calling `readFileSync(full)` per surviving row — two-level sync I/O | **critical** |
| P06 | `cli/github-sync.js:225–227` | `for (const file of readdirSync(storiesDir))` + `readFileSync` per story file — O(stories) blocking reads | **critical** |
| P07 | `cli/github-sync.js:262–264` | Same pattern for tasks dir — `readdirSync(tasksDir)` + `readFileSync` per task file | **critical** |
| P08 | `server/dashboard.js:129` + `server/lib/api.js:9,154` | `scanState(RCODE_DIR)` called **3 independent times per page load**: once for `GET /` (HTML), once for `GET /api/state` (30s client poll), once for `GET /api/hierarchy` — no TTL cache, no memoization | **warn** |
| P09 | `cli/github-sync.js:195` | `loadState()` calls `JSON.parse(readFileSync(statePath))` with **no try/catch** — malformed `state.json` throws unhandled exception, crashing sync | **warn** |
| P10 | `cli/github-sync.js:347` | `loadSyncMap()` same pattern — `JSON.parse(readFileSync(mapPath))` with no error handling | **warn** |
| P11 | `cli/install.js:1476–1484` | `walkScanDir()` is **unbounded recursive** — no `maxDepth` parameter, no symlink cycle guard, no file-count cap | **warn** |
| P12 | `cli/install.js:1081–1090` | `walkForSkills()` is **unbounded recursive** — same pattern, walks any depth | **warn** |
| P13 | `cli/github-sync.js:242–248` | **O(N×M) sprint lookup**: for each story (outer loop), iterates all sprint IDs (inner `for...of Object.entries(sprintMap)`) calling `storyList.some()` — quadratic over (stories × sprints) | **warn** |
| P14 | `cli/install.js:1506,2018` | `files-manifest.csv` read via `readFileSync(...).split('\n')` **without a size guard** — manifest grows unboundedly with each install; no limit before splitting | **warn** |
| P15 | `rcode/workflows/pause-work.md:47` | `find .planning -type f -name "*.md"` — **no `-maxdepth` and no `head -N` limit**; on large projects with many phase dirs this scans every nested file | **info** |
| P16 | `rcode/workflows/dev-story.md:196` | Complex `find .planning/epics` piped through `xargs -I {} find` — double-find with no depth limit | **info** |

---

## Detailed Analysis

### P01–P05 — readFileSync in install loops (`cli/install.js`)

The `generateAgentManifest()` function at lines ~1374–1445 has **three nested sync-read loops**:

```js
// Loop 1 (line 1378): over install plan entries
for (const entry of plan) {
  const text = fs.readFileSync(filePath, 'utf8');   // line 1382 — 1 read per planned agent
  ...
}

// Loop 2 (line 1400): over existing files on disk
const existingFiles = fs.readdirSync(agentDir)...   // line 1400 — directory scan
for (const file of existingFiles) {
  const text = fs.readFileSync(filePath, 'utf8');   // line 1405 — 1 read per existing agent
  ...
}

// Loop 3 (line 1435): global skills scan
files = fs.readdirSync(scanDir)...                  // line 1435 — another directory scan
  try { text = fs.readFileSync(filePath, 'utf8'); } // line 1440 — 1 read per skill
```

And `generateFilesManifest()` at lines ~1457–1520 adds two more:

```js
for (const entry of plan) {
  const buf = fs.readFileSync(filePath);            // line 1464 — read to hash
  ...
}
// Manifest merge inner loop:
for (const row of oldRows) {
  const buf = fs.readFileSync(full);                // line 1512 — read each surviving file
}
```

A typical install with 200 skills/agents/workflows processes ~200–800 `readFileSync` calls in tight loops. All synchronous — blocks the event loop for the entire duration. On NFS/WSL2 this is the primary source of the ~151ms cold-start measured in the prior audit.

### P06–P07 — readFileSync in github-sync loops

`loadPhaseData()` in `cli/github-sync.js` (line ~220):

```js
for (const file of fs.readdirSync(storiesDir)) {    // line 225
  const content = fs.readFileSync(path.join(storiesDir, file), 'utf8');  // line 227
```

And similarly for `tasksDir` at lines 262–264. These are hit every time `rcode github-sync` runs, reading each story/task file one-at-a-time.

### P08 — scanState called 3× per page interaction, no cache

The dashboard calls `scanState(RCODE_DIR)` on three independent routes:

| Trigger | Call site | Frequency |
|---------|-----------|-----------|
| Browser page load `GET /` | `server/dashboard.js:129` | Every page load |
| 30s auto-poll `GET /api/state` | `server/lib/api.js:9` | Every 30 seconds |
| Client hierarchy request `GET /api/hierarchy` | `server/lib/api.js:154` | On demand |

`scanState()` reads `state.json` (34 KB), walks `.planning/phases/` for sprint files, reads each `*-SPRINT.md`, parses frontmatter, and extracts task blocks. On a project with 30 phases and 90 sprint files, this is **90+ file reads per poll cycle**.

The prior audit recommended a 5–10s TTL cache. This has **not been implemented** — every request hits disk.

**Additionally**, the 4-second orchestrator session poll (`orchestrator.js:143 — setInterval(_poll, 4000)`) calls `/api/sessions` on the orchestrator process (port 7718), not the dashboard — but the 30s `fetchAndRerender` loop hits `scanState` every 30 seconds with no caching.

### P09–P10 — JSON.parse without try/catch in github-sync.js

```js
// cli/github-sync.js:190–196
function loadState(cwd) {
  const statePath = path.join(cwd, '.rcode/state.json');
  if (!fs.existsSync(statePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(statePath, 'utf8'));  // no try/catch
}

// cli/github-sync.js:344–348
function loadSyncMap(cwd) {
  ...
  return JSON.parse(fs.readFileSync(mapPath, 'utf8'));    // no try/catch
}
```

`state.json` is 34 KB and written by multiple concurrent agents. A partial write (Ctrl+C mid-session, disk-full, concurrent writes) produces malformed JSON. Without `try/catch`, the entire `github-sync` command throws `SyntaxError: Unexpected token` — with no user-friendly error message and no recovery path.

### P11–P12 — Unbounded recursive walks

`walkScanDir()` at `cli/install.js:1476`:

```js
function walkScanDir(absDir) {
  if (!fs.existsSync(absDir)) return;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const full = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      walkScanDir(full);    // unbounded recursion — no depth limit
    } else if (entry.isFile()) {
      const buf = fs.readFileSync(full);   // read every file found
```

No `maxDepth` parameter. No symlink detection (`withFileTypes: true` is used but `entry.isSymbolicLink()` is not checked). If a symlink loop exists, or `extraScanDirs` points to a large tree (e.g. home directory), this walks and hashes every file it finds.

`walkForSkills()` at `cli/install.js:1081` has the same pattern.

### P13 — O(N×M) sprint-story lookup in github-sync.js

```js
// cli/github-sync.js:242–248
for (const [sid, storyList] of Object.entries(phase.sprintMap)) {
  if (storyList.some((s) => s === id || id.startsWith(s))) {
    sprintId = sid;
    break;
  }
}
```

This is called **inside the per-story loop** (`for (const file of readdirSync(storiesDir))`). For a phase with S stories and M sprints each containing K story IDs, the cost is `O(S × M × K)`. On a milestone with 5 phases, 10 sprints each, 20 stories each: ~1,000 comparisons. Acceptable now; becomes quadratic as phase count and sprint depth grow.

**Fix:** pre-build a `storyId → sprintId` Map once before the story loop.

---

## Comparison to Prior Audit (`audit/06-performance.md`)

| Prior Finding | Status | Notes |
|--------------|--------|-------|
| Excessive sync I/O in install path (140 sync calls) | **PERSISTS** | Count now 38 readFileSync + 21 readdirSync + 90 existsSync = 149 total; similar magnitude |
| Dashboard `scanState()` on every `GET /` — no cache | **PERSISTS** | Now also called on `/api/state` + `/api/hierarchy` — 3 call sites vs 1 previously |
| Static JS `Cache-Control: no-cache` | **FIXED** | Static JS now `max-age=300` (5 min) |
| Bundle unminified (839 KB) | **FIXED** | `scripts/build.cjs` has `minify: true`; dist/ not in repo |
| `cli/install.js` 2,988 lines — single-file bottleneck | **PERSISTS** | Now 2,992 lines (grew by 4 lines) |
| `JSON.parse(JSON.stringify(...))` absent | **PASS** | Still not present — confirmed clean |

**New findings not in prior audit:** P06, P07, P09, P10, P11, P12, P13, P14, P15, P16

---

## Verification Notes

All findings were verified against actual source files with line-number references:

- **P01–P05**: Confirmed by running `python3` loop-context script over `cli/install.js` — 10 readFileSync sites with loop-context within 8 lines. Key sites manually reviewed via `sed -n`.
- **P06–P07**: Confirmed by reading `cli/github-sync.js:225–227` and `262–264` directly.
- **P08**: Confirmed 3 `scanState(` call sites via `grep -rn "scanState(" server/` — dashboard.js:129, api.js:9, api.js:154. No cache variable in scope of any.
- **P09–P10**: Confirmed — `loadState()` and `loadSyncMap()` both have `JSON.parse(readFileSync(...))` with no try/catch wrapper.
- **P11–P12**: Confirmed by reading `walkScanDir` at lines 1476–1492 and `walkForSkills` at lines 1081–1090 — no depth counter, no symlink check.
- **P13**: Confirmed by reading github-sync.js:225–248 — `storyList.some()` inside per-story `for...of readdirSync()`.
- **P14**: Confirmed — `readFileSync(manifestPath, 'utf8').split('\n')` at lines 1506 and 2018, no size check.
- **P15–P16**: Confirmed in workflow markdown files via `grep -rn "find " rcode/workflows/`.

---

## Recommendations (Priority Order)

### 1. Add TTL cache to `scanState()` (P08) — highest impact

```js
// server/lib/scanner.js (or dashboard.js module scope)
let _stateCache = null;
const CACHE_TTL_MS = 5000; // 5 seconds

function scanStateCached(rcodeDir) {
  if (_stateCache && Date.now() - _stateCache.ts < CACHE_TTL_MS) {
    return _stateCache.value;
  }
  const value = scanState(rcodeDir);
  _stateCache = { value, ts: Date.now() };
  return value;
}
```

This collapses 3 full directory scans per page-load + 2 per 30s poll into at most 1 per 5 seconds. Zero external dependencies, ~5 lines.

### 2. Add try/catch to JSON.parse in github-sync.js (P09–P10)

```js
function loadState(cwd) {
  const statePath = path.join(cwd, '.rcode/state.json');
  if (!fs.existsSync(statePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch (err) {
    console.error(`[github-sync] state.json is malformed: ${err.message}`);
    return null;
  }
}
```

### 3. Pre-build sprint lookup Map in github-sync.js (P13)

```js
// Build once before the story loop
const storyToSprint = new Map();
for (const [sid, storyList] of Object.entries(phase.sprintMap)) {
  for (const s of storyList) storyToSprint.set(s, sid);
}

// Inside the story loop:
sprintId = storyToSprint.get(id)
  || [...storyToSprint.keys()].find(k => id.startsWith(k)) && storyToSprint.get([...storyToSprint.keys()].find(k => id.startsWith(k)));
```

Drops per-story sprint lookup from O(M×K) to O(1) for exact matches.

### 4. Add size guard to manifest CSV reads (P14)

```js
const manifestPath = path.join(target, '.rcode', '_config', 'files-manifest.csv');
if (fs.existsSync(manifestPath)) {
  const stat = fs.statSync(manifestPath);
  if (stat.size > 10 * 1024 * 1024) { // 10 MB guard
    console.warn('[install] files-manifest.csv exceeds 10 MB — skipping merge');
  } else {
    const oldRows = fs.readFileSync(manifestPath, 'utf8').split('\n').slice(1).filter(Boolean);
    ...
  }
}
```

### 5. Add depth limit and symlink guard to walkScanDir / walkForSkills (P11–P12)

```js
function walkScanDir(absDir, depth = 0) {
  if (depth > 8) return;   // guard against deep trees
  if (!fs.existsSync(absDir)) return;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;  // skip symlinks
    ...
    if (entry.isDirectory()) walkScanDir(full, depth + 1);
```

### 6. Add -maxdepth to workflow find commands (P15–P16)

`rcode/workflows/pause-work.md:47` → `find .planning -maxdepth 4 -type f -name "*.md"`

---

## Status: **WARN**

7 critical-severity findings (readFileSync-in-loop, P01–P07), all in the install and sync paths. None crash production but each adds measurable blocking time. 2 prior findings fixed (bundle minification, JS asset caching). 4 prior findings persist (sync I/O count, scanState caching, install.js monolith size).
