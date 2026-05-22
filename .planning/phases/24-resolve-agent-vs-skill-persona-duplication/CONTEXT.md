# Phase 24 — Resolve Agent vs Skill Persona Duplication

**Issue:** #714
**Branch:** rcode/autonomous-m1-agent-slim-20260510-125703
**Preceded by:** Phase 23 (agent-slim-remaining-24) — VERIFIED ✓

## Goal

Eliminate the dual-content problem: each of 10 persona agents currently carries
condensed Identity/Communication/Principles/Capabilities/Constraints sections
IN the agent file even though the same persona content is already in
`rcode/skills/agents/<name>/SKILL.md` (which is already @-included by the agent).

After this phase every affected agent stub is ≤40 lines: frontmatter + @-includes only.
The SKILL.md becomes the single source of truth for persona content.

## Affected Personas (10)

| Persona | Agent file (L) | Skill dir | Skill file (L) |
|---------|---------------|-----------|----------------|
| hanzla  | 78            | hanzla-engineer/ | 158 |
| waleed  | 76            | waleed-architect/ | 153 |
| sadiq   | 73            | sadiq-analyst/ | 162 |
| fatima  | 81            | fatima-qa/ | 157 |
| ahmed   | 67            | ahmed-hassani-director/ | 149 |
| hussain-pm | 84         | hussain-pm/ | 166 |
| layla   | 58            | layla-designer/ | 124 |
| mariam  | 72            | mariam-marketing/ | 181 |
| nasser  | 58            | nasser-eng-manager/ | 155 |
| noor    | 62            | noor-writer/ | 133 |

**Not affected:** rcode-khalid.md (99L) — no matching skill dir, not a persona agent.
**Not affected:** haitham/omar/yousef — already slimmed in Phase 23, no matching SKILL.md.

## Key Finding: @-include Already Exists

All 10 persona agent files already contain:
```
@.rcode/skills/agents/<name>/SKILL.md
```

So when Claude spawns these agents, it loads BOTH the full SKILL.md content AND
the condensed duplicate sections in the agent file. Phase 24 removes the redundant
agent-file sections; SKILL.md already has everything.

## What to Keep in Each Agent Stub

```markdown
---
name: rcode-<name>
description: |
  <existing description — keep verbatim, it drives council dispatch>
tools: <existing tools list>
color: <existing color if present>
---

@.rcode/references/agent-shared-rules.md
@.rcode/references/codebase-grounding.md
@.rcode/references/karpathy-guidelines.md   (only if currently present)
@.rcode/skills/agents/<name>/SKILL.md
```

No persona content below the @-includes. The SKILL.md carries everything.

## What to Remove from Each Agent Stub

- `# <Name> — <Role>` heading and all content below it
- Identity, Communication Style, Principles, Capabilities, Persistent Context sections
- Redirects, Constraints, note at bottom pointing to SKILL.md

## Target Line Counts

Each agent stub: ≤40 lines (frontmatter ~15L + blank line + 3-4 @-includes + blank).

## Success Criteria

1. `wc -l rcode/agents/rcode-{hanzla,waleed,sadiq,fatima,ahmed,hussain-pm,layla,mariam,nasser,noor}.md` — all ≤40
2. `grep -l "@.rcode/skills/agents" rcode/agents/*.md` — all 10 present
3. No content below the last @-include line in any of the 10 files
4. rcode-khalid.md unchanged
5. All SKILL.md files unchanged (source of truth, not touched)

## Install.js Path Check

`cli/install.js` copies `rcode/agents/*.md` → `~/.claude/agents/*.md`. Slim stubs still
satisfy this — the agent file just needs valid frontmatter + @-includes. No path
changes needed.

## Risk

Low. The @-include to SKILL.md already existed. Removing the duplicate sections
from the agent file only shrinks context — it cannot break behavior since SKILL.md
already provides the full content.
