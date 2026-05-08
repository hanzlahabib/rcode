---
name: rihal-trim
internal: true
description: Code simplification.
triggers:
  - "trim this"
  - "simplify this code"
  - "code is too long"
  - "reduce complexity"
  - "deduplicate"
  - "remove dead code"
  - "tighten this function"
  - "extract dead branches"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

Reduces a file's surface area without changing behaviour. The skill is conservative: every removed line must be either dead, redundant, or replaceable by a tighter form that reads the same to a downstream user. No "while I'm here" rewrites — that's `rihal-incremental`'s job paired with a real task.

## Workflow

1. **Read the file with tests as ground truth.** If there are no tests, run `rihal-prove-it` first to capture current behaviour. Trimming without a safety net is a refactor in disguise.
2. **Identify removable categories** in priority order:
   1. **Dead code** — unreachable branches, unused exports, commented-out blocks. Verify with grep that no other file references them.
   2. **Duplicate code** — same logic in two places. Extract carefully.
   3. **Premature abstractions** — wrappers that add a layer for one caller. Inline.
   4. **Dead arguments** — parameters that are always passed the default. Remove.
   5. **Verbose conditionals** — collapse to early returns or guard clauses.
   6. **Comments that restate the code** — delete.
3. **Apply one category per commit.** Run tests after each. If anything goes red, the change wasn't actually safe — revert.
4. **Stop trimming when** the file reads top-to-bottom with no "wait, why is that here?" moments. There's a floor of natural complexity; below it, you're losing intent.

## Don't touch

- Comments that explain WHY (constraints, invariants, surprising behaviour) — these earn their lines.
- Verbose names that prevent confusion. `userIdAfterRotation` beats `id`.
- Defensive validation at system boundaries (user input, external APIs).

## Output Format

```
File: <path>
Before: <N> lines, <M> functions
After: <N'> lines, <M'> functions
Net change: <-X> lines

Per-category cuts:
  Dead code:        <count> lines
  Duplicates:       <count> lines (extracted to <where>)
  Premature wrap:   <count> lines (inlined)
  Dead args:        <count> arguments
  Conditionals:     <count> blocks collapsed
  Stale comments:   <count> lines

Verification:
  ✓ all tests still passing
  ✓ no behavioural change
```

Do NOT include: changes that touch behaviour; "while I'm here, also..."; trimming that makes the code less clear in the name of being shorter.

## Examples

**Happy path** — A 220-line component with 4 unused props, 2 dead useState hooks, and 30 lines of commented-out exploration code → trim to 140 lines, behaviour unchanged, tests green.

**Edge case — comment that earns its lines** — `// see issue #234 — Postgres pre-13 doesn't return rowCount on UPSERT, so we re-query`. Don't touch it. The comment captures a constraint that won't be obvious from the code alone.

**Negative — "simplify by rewriting"** — User asks to "clean up" a working module. If the rewrite is bigger than the cuts, it's not trimming — it's a refactor. Refuse and route to `rihal-incremental` with a real task.

## Memory Bank Hooks

- **Reads:** `.rihal/memory/project/decisions.md` (so historical "why this exists" context is loaded — prevents trimming load-bearing complexity)
- **Writes:** if a trimmed pattern was load-bearing for a documented decision, update the decision's "current code reference" pointer
