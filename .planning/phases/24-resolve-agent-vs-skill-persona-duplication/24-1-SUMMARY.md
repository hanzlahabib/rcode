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
| rcode-hanzla.md | 78 | 18 |
| rcode-waleed.md | 76 | 20 |
| rcode-sadiq.md | 73 | 18 |
| rcode-fatima.md | 81 | 19 |
| rcode-ahmed.md | 67 | 10 |
| rcode-hussain-pm.md | 84 | 19 |
| rcode-layla.md | 58 | 10 |
| rcode-mariam.md | 72 | 18 |
| rcode-nasser.md | 58 | 10 |
| rcode-noor.md | 62 | 11 |
| **Total** | **709** | **153** |

Lines removed: **556 lines** across 10 files.

## Verification Results

- All 10 files ≤40 lines: ✓
- All 10 files retain `@.rcode/skills/agents/<name>/SKILL.md`: ✓
- No persona headings below last @-include in any file: ✓
- rcode-khalid.md unchanged (99L): ✓
- SKILL.md files unchanged: ✓ (hanzla: 158L, hussain-pm: 166L)

## Commit

`chore(agents): slim 10 persona stubs — strip duplicate content already in SKILL.md (#714)`
