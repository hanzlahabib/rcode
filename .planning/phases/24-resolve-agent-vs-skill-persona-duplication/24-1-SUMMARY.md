---
sprint: 24.1
status: complete
stories_completed: 3
commits: 1
---

## Summary

Stripped duplicate persona content from 10 persona agent stubs. All 10 files now contain only frontmatter + @-include block. SKILL.md files serve as the single source of truth.

## Line Count Before → After

| Agent | Before | After |
|-------|--------|-------|
| rihal-hanzla.md | 78 | 18 |
| rihal-waleed.md | 76 | 20 |
| rihal-sadiq.md | 73 | 18 |
| rihal-fatima.md | 81 | 19 |
| rihal-ahmed.md | 67 | 10 |
| rihal-hussain-pm.md | 84 | 19 |
| rihal-layla.md | 58 | 10 |
| rihal-mariam.md | 72 | 18 |
| rihal-nasser.md | 58 | 10 |
| rihal-noor.md | 62 | 11 |
| **Total** | **709** | **153** |

Lines removed: **556 lines** across 10 files.

## Verification Results

- All 10 files ≤40 lines: ✓
- All 10 files retain `@.rihal/skills/agents/<name>/SKILL.md`: ✓
- No persona headings below last @-include in any file: ✓
- rihal-khalid.md unchanged (99L): ✓
- SKILL.md files unchanged: ✓ (hanzla: 158L, hussain-pm: 166L)

## Commit

`chore(agents): slim 10 persona stubs — strip duplicate content already in SKILL.md (#714)`
