---
sprint: 26.1
status: complete
stories_completed: 2
commits: 2
---

## Summary

Added reference catalogue and agent authoring rule. Also fixed pre-existing test failure
(`scope-history-parity`) by adding `phases` and `references` to the allowed scopes list.

## Files Changed

- `rihal/references/REFERENCES_INDEX.md` — NEW, 17 cluster references catalogued with live-grep-derived agent mappings
- `CONTRIBUTING.md` — EDITED: added "Agent File Size Rule" subsection + `phases`/`references` scopes
- `AGENTS.md` — EDITED: added `phases`, `references` to allowed scopes (test fix)
- `CLAUDE.md` — EDITED: added `phases`, `references`, `cli` to scopes

## Verification Results

| Criterion | Result |
|-----------|--------|
| REFERENCES_INDEX.md exists and lists 18 cluster reference entries | ✓ (18 matches) |
| CONTRIBUTING.md has "Agent File Size Rule" | ✓ |
| Rule text includes ">100 lines", "rihal/references/", "@-include" | ✓ |
| Accepted exceptions (nyquist-auditor, docs-auditor) documented | ✓ |
| `node --test` passes with 0 failures | ✓ |

## Bonus Fix

Pre-existing `scope-history-parity` test failure resolved: added `phases` and `references`
to AGENTS.md + CONTRIBUTING.md scope lists (introduced by phase 22-23 commits).

## Commits

- `chore(scopes): add phases + references to allowed scope list — fix scope-history-parity test`
- `docs(references): add REFERENCES_INDEX.md + agent file size rule to CONTRIBUTING.md (#716)`
