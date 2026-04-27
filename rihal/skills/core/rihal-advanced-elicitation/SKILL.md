---
name: rihal-advanced-elicitation
description: Push the LLM to reconsider, refine, and improve its recent output through structured methods like socratic questioning, first principles, pre-mortem, and red-teaming. Use when the user asks for deeper critique, says "push harder on this", "go deeper", "challenge this", "stress-test this section", or names a specific elicitation method. For prose editing use rihal-editorial-review-prose; for structural review use rihal-editorial-review-structure.
agent_party: '{project-root}/.rihal/team.yaml'
triggers:
  - "advanced elicitation"
  - "push deeper"
  - "go deeper"
  - "challenge this"
  - "stress-test this"
  - "pre-mortem"
  - "red team this"
  - "first principles"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

Iterative menu-driven enhancement of recently-generated content. Presents 5 contextually-chosen elicitation methods (from `methods.csv`), runs the user's pick against the current content, shows the improvement, and re-offers the menu until the user picks `x` to proceed. Designed to be invoked indirectly from a parent prompt that just produced a section, then return the enhanced version. Detailed method registry, response cases, and execution rules live in [`references.md`](references.md).

## Process

1. **Method registry loading.** Read `./methods.csv` and `{agent_party}` from `.rihal/team.yaml`.
2. **Context analysis.** Use conversation history to detect content type, complexity, stakeholder needs, risk level, creative potential.
3. **Smart selection.** Pick 5 methods from the CSV that best match the context. Balance foundational and specialised techniques.
4. **Present menu.** Show the 5 options + `r` (reshuffle), `a` (list all), `x` (proceed). HALT for input.
5. **Execute on selection.** Apply the chosen method to the current content. Show the enhanced version. Ask the user `apply changes? y/n`. HALT.
6. **On `y`** apply changes; on `n` discard. Re-present the menu — every method runs against the latest enhanced version.
7. **On `x`** return the fully enhanced content to the invoking skill.

**Iterative enhancement:** every method (1-5) applies to the current enhanced version, not the original. The loop continues until `x`.

## Output Format

```
**Advanced Elicitation Options**
_If party mode is active, agents will join in._
Choose a number (1-5), [r] to Reshuffle, [a] List All, or [x] to Proceed:

1. <Method name>
2. <Method name>
3. <Method name>
4. <Method name>
5. <Method name>
r. Reshuffle the list with 5 new options
a. List all methods with descriptions
x. Proceed / No further actions
```

After execution: show the enhanced version, then ask `apply changes? (y/n/other)`, HALT, and re-present the menu.

## Examples

**Happy path** — `push deeper on this PRD section` → menu of 5 → user picks "Pre-Mortem" → analysis surfaces 3 blind spots → user approves → menu re-offered → user types `x` → return enhanced content to caller.

**Edge case — no content in context** — skill asks the user to provide or point to the content to enhance.

**Negative — wrong skill** — `review this code for bugs` is code review, not elicitation. Route to `rihal-code-review`.

## Memory Bank Hooks

- **Reads:** `methods.csv`, `.rihal/team.yaml` (agent_party), the section content being enhanced
- **Writes:** the enhanced content is returned to the invoking skill — this skill does not write Memory Bank files itself

## Detailed reference

See [`references.md`](references.md) for: the CSV schema, the full case-by-case response handler (1-5 / r / a / x / direct feedback / multiple numbers), execution guidelines, and HALT conditions.
