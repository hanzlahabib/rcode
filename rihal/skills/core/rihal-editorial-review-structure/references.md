# Editorial Review (Structure) — Detailed Reference

Detailed principles and models for [`SKILL.md`](SKILL.md).

---

## Core principles

- **Comprehension through calibration** — minimum words needed to maintain understanding.
- **Front-load value** — critical information first; nice-to-know last (or cut).
- **One source of truth** — if information appears identically twice, consolidate.
- **Scope discipline** — content that belongs in a different document should be cut or linked.
- **Propose, don't execute** — output recommendations; the user decides what to accept.
- **Content is sacrosanct** — never challenge ideas, only optimise how they're organised.

---

## Human-reader principles (preserve unless clearly wasteful)

When `reader_type=humans`:

- **Visual aids** — diagrams, images, flowcharts anchor understanding.
- **Expectation-setting** — "What you'll learn" helps readers confirm fit.
- **Reader's journey** — organise biologically (linear progression), not logically (database).
- **Mental models** — overview before details prevents cognitive overload.
- **Warmth** — encouraging tone reduces anxiety for new users.
- **Whitespace** — admonitions and callouts provide visual breathing room.
- **Summaries** — recaps reinforce; they're not redundancy.
- **Examples** — concrete illustrations make abstract concepts accessible.
- **Engagement** — transitions and variety maintain attention; they're functional, not "fluff".

---

## LLM-reader principles (when `reader_type=llm`)

Optimise for precision and unambiguity:

- **Dependency-first** — define concepts before usage to minimise hallucination risk.
- **Cut emotional language**, encouragement, orientation sections.
- **Reference known standards** ("conventional commits", "Google style guide") — leverage training. But still provide examples to ground specific expectations.
- **Consistent terminology** — same word for same concept throughout.
- **Eliminate hedging** — no "might", "could", "generally". Direct statements.
- **Prefer structured formats** — tables, lists, YAML — over prose.
- **Unambiguous references** — no unclear antecedents like "it", "this", "the above".

LLM-targeted documents may be longer than human ones in some areas (more explicit) and shorter in others (no warmth).

---

## Structure models

Pick the one matching the document's purpose.

### Tutorial / Guide (Linear)
**For:** tutorials, how-to articles, walkthroughs.
- Prerequisites: setup must precede action.
- Sequence: strict chronological or logical dependency order.
- Goal-oriented: clear "Definition of Done" at the end.

### Reference / Database
**For:** API docs, glossaries, configuration references, cheat sheets.
- Random access — no narrative flow required; users jump to specific items.
- MECE — topics are Mutually Exclusive and Collectively Exhaustive.
- Consistent schema — every item follows identical structure (Signature → Params → Returns).

### Explanation (Conceptual)
**For:** deep dives, architecture overviews, conceptual guides, project context.
- Abstract → concrete: definition → context → implementation/example.
- Scaffolding: complex ideas built on established foundations.

### Prompt / Task Definition (Functional)
**For:** Rihal tasks, prompts, system instructions, XML definitions.
- Meta-first: inputs, usage constraints, context defined before instructions.
- Separation of concerns: instructions (logic) separate from data (content).
- Step-by-step: execution flow explicit and ordered.

### Strategic / Context (Pyramid)
**For:** PRDs, research reports, proposals, decision records.
- Top-down: conclusion / status / recommendation starts the document.
- Grouping: supporting context grouped logically below the headline.
- Ordering: most critical information first.
- MECE: arguments are Mutually Exclusive and Collectively Exhaustive.
- Evidence: data supports arguments, never leads.

---

## Recommendation categories

| Category | Use when |
|---|---|
| `CUT` | Section adds no value to the stated purpose; remove entirely |
| `MERGE` | Two sections cover overlapping ground; combine |
| `MOVE` | Critical information is buried, or details precede their setup |
| `CONDENSE` | Section is needed but verbose — shorten significantly |
| `QUESTION` | Decision the author needs to make (not the editor's call) |
| `PRESERVE` | Element looks cuttable but actually serves comprehension — explicitly keep |

---

## HALT conditions

- HALT with error if content is empty or fewer than 3 words.
- HALT with error if `reader_type` is not `humans` or `llm`.
- If no structural issues found: output "No substantive changes recommended — document structure is sound." (Valid completion, not an error.)

---

## Style guide override

If a `style_guide` is provided, it overrides all generic principles in this skill — including human-reader principles, LLM-reader principles, structure-model selection, and the Microsoft Writing Style Guide baseline. The single exception is **content is sacrosanct**: never change what ideas say, only how they're expressed.
