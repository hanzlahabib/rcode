# Phase 9 — Plan 3: State Path Audit

**Status: Clean**

**Audit date:** 2026-04-29
**Pattern this catches:** #462 (cmdPhase wrote to PLANNING_DIR/state.json instead of RCODE_DIR/state.json — fixed)

---

## Canonical path

`.rcode/state.json` — RCODE_DIR-rooted, gitignored, used by every state-touching command.

---

## All references found

### Canonical reads/writes in code (5 — all correct)

| File | Line | Context |
|---|---|---|
| rcode/bin/rcode-tools.cjs | 634 | `const statePath = path.join(RCODE_DIR, 'state.json');` (cmdState) |
| rcode/bin/rcode-tools.cjs | 2280 | `const statePath = path.join(RCODE_DIR, 'state.json');` (cmdPhase, post-#462) |
| rcode/bin/rcode-tools.cjs | 2522 | `paths: { ... state: path.join(RCODE_DIR, 'state.json') }` (init context) |
| rcode/bin/rcode-tools.cjs | 2621 | Same pattern in `cmdInitDiscuss` |
| rcode/bin/rcode-tools.cjs | 2641 | Same pattern in `cmdInitChain` |

All 5 use `RCODE_DIR` consistently. No drift.

### Wrong-path code paths (0)

**None.** Every code-path `state.json` reference resolves to `RCODE_DIR/state.json`. The orphan `.planning/state.json` introduced by acb77b2 was deleted in 651738e. #462 closed.

### Documentation references in workflow .md files (25 files)

All 25 workflow files that mention `state.json` reference it as `.rcode/state.json` explicitly. Sample: `rcode/workflows/init.md:43`, `rcode/workflows/pause-work.md:38`, `rcode/workflows/forensics.md:26`, `rcode/workflows/memory-init.md:73`, `rcode/workflows/dashboard.md:4`, etc. All consistent.

### Config / gitignore (3 entries)

| File | Line | Entry |
|---|---|---|
| .gitignore | (top) | `.rcode/state.json` |
| .gitignore | (lock) | `.rcode/state.json.lock` |
| .gitignore | (comment) | `# .rcode/state.json — decisions, roadmap pointer, blockers` |

Gitignore correctly excludes the canonical state file (it's per-machine, not part of source).

---

## Summary

| Category | Count | Drift |
|---|---|---|
| Canonical code reads/writes | 5 | 0 |
| Wrong-path code references | 0 | 0 |
| Workflow .md documentation references | 25 | 0 |
| Gitignore / config entries | 3 | 0 |
| **Total** | **33** | **0** |

**No new issues filed.** The #462 fix held — phase add now writes to the canonical file, and no other code path is divergent. Plan 9.4's CI gate adds an orphan-state-file detector to keep this clean going forward.
