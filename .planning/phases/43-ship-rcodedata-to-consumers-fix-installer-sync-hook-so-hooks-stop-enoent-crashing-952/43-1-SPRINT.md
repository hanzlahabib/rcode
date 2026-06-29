---
sprint: 43.1
goal: "Ship rcode/data/ to consumers via installer and sync hook so .rcode/data/intent-table.json is present on install and rcode-hooks.cjs stops ENOENT-crashing (#952)"
phase: 43
plan_number: 1
wave: 1
depends_on: []
autonomous: true
files_modified: [cli/install.js, .claude/hooks/sync-bin-on-edit.sh]
---

# Sprint 43.1 — Ship rcode/data/ to consumers; fix installer and sync hook (#952)

**Phase:** 43 — Ship rcode/data/ to consumers — fix installer + sync hook so hooks stop ENOENT-crashing (#952)
**Status:** planned
**Velocity target:** 5 points
**Started:** —

## Sprint Goal

`rcode/data/intent-table.json` is never copied to consumer installs because `cli/install.js` has no copy block for `rcode/data/`, the module filter does not passthrough `.rcode/data/`, the generated `.gitignore` does not list `.rcode/data/`, and the dogfood sync hook does not watch `rcode/data/**`. The fail-open wrap in `rcode-hooks.cjs` was already shipped in Phase 42 — this sprint closes the distribution gap only. Two files change, nothing else.

## Stories

| ID | Title | Points | Status | Done when |
|----|-------|--------|--------|-----------|
| 43.1.01 | Verify live anchors in cli/install.js and sync hook | 1 | planned | Executor has confirmed exact line numbers for the copy block, module filter, gitignore array, and sync hook case — all match the text below before edits are applied. |
| 43.1.02 | Add .rcode/data/ copy block to install plan builder | 2 | planned | `grep -q "SOURCE_ROOT, 'data'" cli/install.js` exits 0; `node --check cli/install.js` exits 0; dry plan includes a `rel` of `.rcode/data/intent-table.json`. |
| 43.1.03 | Add .rcode/data/ passthrough to module filter and gitignore | 1 | planned | `grep -q "'.rcode', 'data'" cli/install.js` exits 0 (module-filter line); `grep -q ".rcode/data/" cli/install.js` exits 0 (gitignore array); `node --check cli/install.js` exits 0. |
| 43.1.04 | Extend sync hook to watch rcode/data/ edits | 1 | planned | `bash -n .claude/hooks/sync-bin-on-edit.sh` exits 0; `grep -q 'rcode/data' .claude/hooks/sync-bin-on-edit.sh` exits 0. |

## Capacity

- **Velocity target:** 5 points
- **Total committed:** 5 points
- **Buffer:** 0 points (0%)

## Stories — detail

### Story 43.1.01 — Verify live anchors in cli/install.js and sync hook

<objective>
Confirm that the four anchor locations in `cli/install.js` and the case block in `.claude/hooks/sync-bin-on-edit.sh` match what the stories below assume before any edits are applied. Line numbers may have shifted slightly from the planning estimate — read the actual file and note the current lines.
</objective>

<read_first>
- /home/hanzla/development/rihal-code/cli/install.js lines 1285–1355 (plan builder: copy blocks for bin, workflows, references, agentRulesDir)
- /home/hanzla/development/rihal-code/cli/install.js lines 1405–1425 (filterPlanByModules function)
- /home/hanzla/development/rihal-code/cli/install.js lines 880–910 (gitignore lines array)
- /home/hanzla/development/rihal-code/.claude/hooks/sync-bin-on-edit.sh (full file)
</read_first>

<files>
- cli/install.js (read-only in this story)
- .claude/hooks/sync-bin-on-edit.sh (read-only in this story)
</files>

<action>
Read the four locations listed above and record:
1. The line number of the closing `}` of the `// .rcode/bin/` copy block (currently around line 1311).
2. The line number of `if (entry.rel.startsWith(path.join('.rcode', 'bin'))) return true;` inside `filterPlanByModules` (currently around line 1420).
3. The line number of `'.rcode/bin/',` inside the gitignore `lines` array (currently around line 890).
4. The line number of `*/rcode/bin/*)` in the sync hook case (currently line 16).
Confirm `rcode/data/intent-table.json` exists at source: `ls /home/hanzla/development/rihal-code/rcode/data/intent-table.json`.
</action>

<acceptance_criteria>
- All four anchor locations confirmed to exist in the files.
- `rcode/data/intent-table.json` confirmed present at source path.
- No edits made in this story — read-only verification only.
</acceptance_criteria>

<verify>
<automated>
ls /home/hanzla/development/rihal-code/rcode/data/intent-table.json
grep -n "rcode/bin/" /home/hanzla/development/rihal-code/cli/install.js | head -10
grep -n "filterPlanByModules\|\.rcode.*bin" /home/hanzla/development/rihal-code/cli/install.js | head -10
grep -n "\.rcode/bin/" /home/hanzla/development/rihal-code/cli/install.js | head -5
grep -n "rcode/bin" /home/hanzla/development/rihal-code/.claude/hooks/sync-bin-on-edit.sh
</automated>
</verify>

<done>
Anchor line numbers recorded. No file changes. Proceed to 43.1.02.
</done>

---

### Story 43.1.02 — Add .rcode/data/ copy block to install plan builder

<objective>
Insert a new `// .rcode/data/` copy block in `buildInstallPlan` inside `cli/install.js`, immediately after the closing `}` of the existing `// .rcode/bin/` block (around line 1311). The new block follows the same literal-join pattern used by the `agentRulesDir` block at line 1347 — no new `paths.dataDir` variable is needed.
</objective>

<read_first>
- /home/hanzla/development/rihal-code/cli/install.js lines 1307–1325 (bin block and what follows it)
</read_first>

<files>
- cli/install.js
</files>

<action>
In `cli/install.js`, immediately after the closing `}` of the `// .rcode/bin/` block (the block ending at approximately line 1311), insert the following new block:

```js
  // .rcode/data/
  for (const f of walkFiles(path.join(SOURCE_ROOT, 'data'))) {
    const rel = path.relative(path.join(SOURCE_ROOT, 'data'), f);
    plan.push({ src: f, rel: path.join('.rcode', 'data', rel) });
  }
```

The blank line before the next comment (`// .rcode/templates/projects/`) must be preserved. No other changes in this story.
</action>

<acceptance_criteria>
- `grep -q "SOURCE_ROOT, 'data'" cli/install.js` exits 0.
- `node --check cli/install.js` exits 0.
- The plan entry for `intent-table.json` has `rel` equal to `.rcode/data/intent-table.json` — verify via a node one-liner that exercises the block logic (see automated verify).
</acceptance_criteria>

<verify>
<automated>
node --check /home/hanzla/development/rihal-code/cli/install.js
grep -q "SOURCE_ROOT, 'data'" /home/hanzla/development/rihal-code/cli/install.js && echo "copy-block OK"
node -e "
const path = require('path');
const SOURCE_ROOT = '/home/hanzla/development/rihal-code/rcode';
const fs = require('fs');
function walkFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkFiles(p));
    else out.push(p);
  }
  return out;
}
const plan = [];
for (const f of walkFiles(path.join(SOURCE_ROOT, 'data'))) {
  const rel = path.relative(path.join(SOURCE_ROOT, 'data'), f);
  plan.push({ src: f, rel: path.join('.rcode', 'data', rel) });
}
const hit = plan.find(e => e.rel.includes('intent-table.json'));
if (!hit) { console.error('FAIL: intent-table.json not in plan'); process.exit(1); }
console.log('plan entry OK:', hit.rel);
"
</automated>
</verify>

<done>
`cli/install.js` has the `.rcode/data/` copy block. `node --check` passes. Plan entry for `intent-table.json` confirmed. Proceed to 43.1.03.
</done>

---

### Story 43.1.03 — Add .rcode/data/ passthrough to module filter and gitignore array

<objective>
Two more edits in `cli/install.js`:
1. In `filterPlanByModules`, add a passthrough guard for `.rcode/data/` entries (same pattern as the existing `.rcode/bin/` guard) so `--modules` installs do not silently drop data files.
2. In the gitignore `lines` array, add `'.rcode/data/'` immediately after `'.rcode/bin/'` so the generated `.gitignore` documents the installed directory.
</objective>

<read_first>
- /home/hanzla/development/rihal-code/cli/install.js lines 1417–1425 (filterPlanByModules filter block)
- /home/hanzla/development/rihal-code/cli/install.js lines 888–896 (gitignore lines array)
</read_first>

<files>
- cli/install.js
</files>

<action>
**Edit 1 — module filter** (around line 1420 after Story 43.1.02 shifts lines):
In `filterPlanByModules`, find the line:
```js
    if (entry.rel.startsWith(path.join('.rcode', 'bin'))) return true;
```
Immediately after it, add:
```js
    if (entry.rel.startsWith(path.join('.rcode', 'data'))) return true;
```

**Edit 2 — gitignore manifest** (around line 890):
In the `lines` array inside the gitignore-block builder, find `'.rcode/bin/',` and add `'.rcode/data/',` on the next line:
```js
    '.rcode/bin/',
    '.rcode/data/',
    '.rcode/workflows/',
```

No other changes.
</action>

<acceptance_criteria>
- `grep -q "'.rcode', 'data'" cli/install.js` exits 0 (module-filter passthrough present).
- `grep -q "'.rcode/data/'" cli/install.js` exits 0 (gitignore array entry present).
- `node --check cli/install.js` exits 0.
</acceptance_criteria>

<verify>
<automated>
node --check /home/hanzla/development/rihal-code/cli/install.js
grep -q "'.rcode', 'data'" /home/hanzla/development/rihal-code/cli/install.js && echo "module-filter OK"
grep -q "'.rcode/data/'" /home/hanzla/development/rihal-code/cli/install.js && echo "gitignore-entry OK"
</automated>
</verify>

<done>
Module filter passes `.rcode/data/` entries through. Gitignore manifest lists `.rcode/data/`. `node --check` passes. Proceed to 43.1.04.
</done>

---

### Story 43.1.04 — Extend sync hook to watch rcode/data/ edits

<objective>
`.claude/hooks/sync-bin-on-edit.sh` currently only syncs `rcode/bin/` edits to `.rcode/bin/`. Extend it to also sync `rcode/data/` edits to `.rcode/data/` so dogfood sessions stay current when `intent-table.json` is edited during development. The existing `set -e` discipline and `exit 0` tail must be preserved.
</objective>

<read_first>
- /home/hanzla/development/rihal-code/.claude/hooks/sync-bin-on-edit.sh (full file — 26 lines)
</read_first>

<files>
- .claude/hooks/sync-bin-on-edit.sh
</files>

<action>
Replace the content of `.claude/hooks/sync-bin-on-edit.sh` with the following (changes: header comment updated to mention data; new `*/rcode/data/*` case added in the `case` block):

```bash
#!/usr/bin/env bash
# .claude/hooks/sync-bin-on-edit.sh — triggered by PostToolUse hook on Edit/Write.
#
# When an Edit/Write touches rcode/bin/**, sync the source to .rcode/bin/ so
# the runtime copy that workflows invoke stays current. Closes #470.
# When an Edit/Write touches rcode/data/**, sync to .rcode/data/ so the
# intent-table and any future data files stay current on dogfood sessions. (#952)
#
# Receives the tool's JSON payload on stdin. Extracts the file path from
# `tool_input.file_path` and acts only if it's under rcode/bin/ or rcode/data/.

set -e

input="$(cat)"
file_path="$(printf '%s' "$input" | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed -E 's/.*"file_path"[[:space:]]*:[[:space:]]*"([^"]*)".*/\1/')"

case "$file_path" in
  */rcode/bin/*)
    REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
    [ -n "$REPO_ROOT" ] || exit 0
    [ -d "$REPO_ROOT/.rcode/bin" ] || exit 0
    cp -r "$REPO_ROOT/rcode/bin/." "$REPO_ROOT/.rcode/bin/"
    echo "[sync-bin] rcode/bin/ → .rcode/bin/ (after edit to $file_path)" >&2
    ;;
  */rcode/data/*)
    REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"
    [ -n "$REPO_ROOT" ] || exit 0
    mkdir -p "$REPO_ROOT/.rcode/data"
    cp -r "$REPO_ROOT/rcode/data/." "$REPO_ROOT/.rcode/data/"
    echo "[sync-data] rcode/data/ → .rcode/data/ (after edit to $file_path)" >&2
    ;;
esac

exit 0
```

Key points:
- The `*/rcode/data/*` case uses `mkdir -p` before `cp -r` because `.rcode/data/` may not exist yet on fresh dogfood sessions (unlike `.rcode/bin/` which the installer creates first). No `[ -d ... ] || exit 0` guard needed — the `mkdir -p` handles it.
- Both cases resolve `REPO_ROOT` independently (they share no state across case arms).
- `set -e` is preserved at the top. `exit 0` is preserved at the tail.
</action>

<acceptance_criteria>
- `bash -n .claude/hooks/sync-bin-on-edit.sh` exits 0.
- `grep -q 'rcode/data' .claude/hooks/sync-bin-on-edit.sh` exits 0.
- `grep -q 'mkdir -p' .claude/hooks/sync-bin-on-edit.sh` exits 0 (guard for missing dir).
- `grep -q 'set -e' .claude/hooks/sync-bin-on-edit.sh` exits 0 (safety preserved).
</acceptance_criteria>

<verify>
<automated>
bash -n /home/hanzla/development/rihal-code/.claude/hooks/sync-bin-on-edit.sh && echo "syntax OK"
grep -q 'rcode/data' /home/hanzla/development/rihal-code/.claude/hooks/sync-bin-on-edit.sh && echo "data-case OK"
grep -q 'mkdir -p' /home/hanzla/development/rihal-code/.claude/hooks/sync-bin-on-edit.sh && echo "mkdir-guard OK"
grep -q 'set -e' /home/hanzla/development/rihal-code/.claude/hooks/sync-bin-on-edit.sh && echo "set-e OK"
</automated>
</verify>

<done>
Sync hook handles both `rcode/bin/` and `rcode/data/` edits. `bash -n` passes. All grep gates pass.
</done>

---

## must_haves

- `node --check cli/install.js` exits 0 after all edits.
- `grep -q "SOURCE_ROOT, 'data'" cli/install.js` exits 0 — copy block is present.
- `grep -q "'.rcode', 'data'" cli/install.js` exits 0 — module filter passthrough is present.
- `grep -q "'.rcode/data/'" cli/install.js` exits 0 — gitignore manifest entry is present.
- `bash -n .claude/hooks/sync-bin-on-edit.sh` exits 0 — hook is syntactically valid.
- `grep -q 'rcode/data' .claude/hooks/sync-bin-on-edit.sh` exits 0 — data case is present.
- Node one-liner confirms the plan entry for `intent-table.json` has `rel` equal to `.rcode/data/intent-table.json`.

## update.js — No Change

`cli/update.js` has no independent `walkFiles`/`SOURCE_ROOT,'bin'` copy logic. It delegates to the same install plan builder. No edit to `update.js` is needed or permitted.

## Files Touched

**Modifies:**
- `cli/install.js` — (1) adds `.rcode/data/` copy block after bin block in `buildInstallPlan`; (2) adds `.rcode/data/` passthrough in `filterPlanByModules`; (3) adds `'.rcode/data/'` to gitignore lines array.
- `.claude/hooks/sync-bin-on-edit.sh` — adds `*/rcode/data/*` case with `mkdir -p` + `cp -r` sync; updates header comment to reference #952.

**Creates:** nothing.

**Tests:** none (verification is grep + node --check + inline node one-liner).

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `rcode/data/` is empty or absent at build time | `walkFiles` returns empty array — no-op, no crash | `walkFiles` already handles empty dirs in the existing pattern |
| Sync hook fires on a fresh dogfood session where `.rcode/data/` does not yet exist | `cp -r` would fail without target dir | `mkdir -p "$REPO_ROOT/.rcode/data"` guard added before `cp -r` |
| Line-shift after Story 43.1.02 inserts lines affects Story 43.1.03 anchor search | Wrong lines edited | Stories 43.1.02 and 43.1.03 use text-search (`grep -n`) to locate anchors, not raw line numbers |
