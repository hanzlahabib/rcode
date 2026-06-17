---
sprint: 38.3
goal: "Prevent silent drift: add a sync test that asserts every command the INTENT_TABLE routes to actually appears in the do.md routing table (the single source of truth), so a future edit to do.md that removes/renames a command fails CI rather than leaving the nudge pointing at a dead command."
depends_on: [38.1]
files_modified:
  - test/prompt-router-table-sync.test.cjs
  - rcode/bin/rcode-hooks.cjs
sequential: true
sequential_after: 38-1
conflicting_files: [rcode/bin/rcode-hooks.cjs]
---

# Sprint 38.3 — keep INTENT_TABLE synced with do.md (drift guard)

**Phase:** 38 — Proactive intent router (UserPromptSubmit nudge toward rcode commands for memory consistency, #892)
**Status:** planned
**Velocity target:** 3 points
**Started:** —

## Sprint Goal

The hard constraint says the keyword→command table must derive from `rcode/workflows/do.md` as the single source of truth and must NOT silently fork. Sprint 38.1 added the table with a cross-reference comment; this sprint adds the automated guard that makes the cross-reference enforceable. A test parses the `/rcode-do` routing table out of `do.md` and asserts that every `command` referenced by `INTENT_TABLE` exists as a route in that table. If someone renames `/rcode-research-phase` or drops a row from do.md without updating the hook, the test fails — turning silent drift into a loud failure.

## Stories

| ID | Title | Points | Status | Done when |
|----|-------|--------|--------|-----------|
| 38.3.1 | Export INTENT_TABLE for test consumption | 1 | planned | `INTENT_TABLE` (and the command-extraction needed to read it) is importable from a test — either via a guarded `module.exports` at the bottom of `rcode-hooks.cjs` or a tiny exported accessor; running the hook as a CLI is unaffected. |
| 38.3.2 | `test/prompt-router-table-sync.test.cjs` — assert no drift vs do.md | 2 | planned | `node --test test/prompt-router-table-sync.test.cjs` passes; parses the do.md routing table, extracts the `/rcode-*` route from each row, and asserts every base command in INTENT_TABLE appears among them; the test fails if a table command is absent from do.md. |

## Capacity

- **Velocity target:** 3 points
- **Total committed:** 3 points
- **Buffer:** 0 points (0%)

## Dependencies

| Story | Depends on | Status |
|-------|-----------|--------|
| 38.3.* | 38.1 (INTENT_TABLE must exist) | planned |

## Stories — detail

### Story 38.3.1 — Export INTENT_TABLE for test consumption

<objective>
Make `INTENT_TABLE` reachable from a Node test without disturbing the CLI behaviour of `rcode-hooks.cjs` (which is invoked as `node rcode-hooks.cjs <subcommand>` and exits).
</objective>

<action>
- At the very bottom of `rcode/bin/rcode-hooks.cjs`, after the existing `main().catch(...)` invocation, add a guarded export. The file currently calls `main()` at module top-level — adding `module.exports = { INTENT_TABLE }` is harmless because `require()`-ing the file would also trigger `main()`. To avoid that, guard the auto-run: wrap the `main().catch(...)` call in `if (require.main === module) { main().catch(...); }` and then `module.exports = { INTENT_TABLE };`.
- Verify the CLI still runs: `node rcode-hooks.cjs prompt-router` must behave exactly as before (require.main === module is true when executed directly).
- This is the minimal, idiomatic Node pattern for "runnable as CLI, importable as module". Confirm no other subcommand relied on the unconditional top-level `main()` call (it didn't — `main()` only dispatches on argv).
</action>

<verify>
<automated>
node --check rcode/bin/rcode-hooks.cjs
node -e "const m=require('./rcode/bin/rcode-hooks.cjs'); if(!Array.isArray(m.INTENT_TABLE))throw new Error('INTENT_TABLE not exported'); if(m.INTENT_TABLE.length===0)throw new Error('INTENT_TABLE empty');"
# CLI still works (require.main guard intact): non-match must stay silent
printf '%s' '{"prompt":"what time is it"}' | node rcode/bin/rcode-hooks.cjs prompt-router | wc -c | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{if(parseInt(s.trim())!==0)throw new Error('CLI behaviour changed');})"
</automated>
</verify>

### Story 38.3.2 — `test/prompt-router-table-sync.test.cjs` — assert no drift vs do.md

<objective>
Parse the do.md routing table and assert the hook's INTENT_TABLE references only commands that still exist there.
</objective>

<action>
- Create `test/prompt-router-table-sync.test.cjs` (`node:test` / `node:assert`).
- Read `rcode/workflows/do.md`. Slice out the routing table: from the line containing `| If the text describes...` down to the line `If no rule matches, fall back to the classifier:` (the table body, lines ~285-320).
- For each table row, extract the route command(s) — they appear as backticked `` `/rcode-<name>` `` in the middle column. Build a set of base command names (strip args/flags: `/rcode-review --karpathy` → `/rcode-review`).
- `require('../rcode/bin/rcode-hooks.cjs')` → `INTENT_TABLE`. For each entry, take its `command`, strip flags/args to the base `/rcode-<name>`, and assert that base appears in the do.md command set. Collect all misses and assert the miss list is empty with a message naming the offending command(s) and pointing at do.md.
- Add a sanity assertion that the do.md command set is non-empty (guards against a parser that silently matches nothing and makes the test pass vacuously).
</action>

<verify>
<automated>
node --test test/prompt-router-table-sync.test.cjs
</automated>
</verify>

## Files Touched

**Creates:**
- `test/prompt-router-table-sync.test.cjs` — drift guard: INTENT_TABLE commands ⊆ do.md routes

**Modifies:**
- `rcode/bin/rcode-hooks.cjs` — `require.main === module` guard + `module.exports = { INTENT_TABLE }`

**Tests:**
- `test/prompt-router-table-sync.test.cjs` — covers 38.3.2

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| do.md table format changes (column order, fences) break the parser | Test fails spuriously | Parse defensively (extract all backticked `/rcode-*` tokens in the table slice); non-empty sanity assertion catches a totally-broken parse |
| `require.main === module` guard accidentally disables CLI auto-run | Hook silently no-ops in production | Verify step re-runs the CLI after the change and asserts unchanged behaviour |
