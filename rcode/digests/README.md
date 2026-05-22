# Agent Digests — Lean Context Loader

Each digest is a 20-line compact summary of an agent. Used when you need to know **who an agent is and what they care about** without loading their full SKILL.md (which is 10x larger).

## When to Use Digests vs Full SKILL.md

| Use Digest | Use Full SKILL.md |
|---|---|
| Majlis convening (need all agents' positions) | Agent is actively doing work |
| Raees dispatch planning (routing decisions) | Agent is invoked directly by user |
| Quick "what would Fatima say about this?" | Debugging agent behavior |
| Cross-agent consultation | First-time loading an agent |
| Context budgets under 10k tokens | Full agent behavior needed |

## Token Math

- Full SKILL.md: ~150 lines × 12 agents = 1,800 lines = ~25k tokens
- Digest: 20 lines × 12 agents = 240 lines = ~3k tokens
- **Savings: 8x** for cross-agent operations

## Format (strict — keep every digest to this shape)

```
# {agent-name} — {Role}

**Arabic:** {arabic name}
**Authority:** {what they own — 1 line}
**Defers to:** {who outranks them in what — 1 line}

## Principles (5 max)
- Principle 1
- Principle 2
- Principle 3
- Principle 4
- Principle 5

## Domain
{what they work on — 2 lines max}

## Communication Style
{1 line}

## Typical Position
{how they usually respond to cross-domain questions — 2 lines}

## Full skill
`rcode/skills/agents/{dir}/SKILL.md`
```

Keep it to ~20 lines. No examples, no capabilities tables, no activation steps — those live in the full SKILL.md.
