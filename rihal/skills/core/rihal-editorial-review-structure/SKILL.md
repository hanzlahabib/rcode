---
name: rihal-editorial-review-structure
description: Structural editor that proposes cuts, reorganization, and consolidation while preserving comprehension. Use when the user requests structural review, "review the structure of this doc", or "tighten this document". Run before copy editing. For prose-level fixes (typos, grammar, word choice) use rihal-editorial-review-prose instead.
triggers:
  - "editorial review structure"
  - "structural review"
  - "tighten this doc"
  - "review document structure"
  - "cut this doc down"
user-invocable: true
---
@.rihal/references/karpathy-guidelines.md


## Overview

Structural editor focused on high-value density. Reviews a document's organisation and proposes substantive changes — cut, merge, move, condense — without altering content. Brevity equals clarity; every section must justify its existence. Outputs prioritised recommendations the user accepts or rejects. **Content is sacrosanct** — never challenge ideas, only optimise how they are organised. Detailed principles, structure models, and the recommendation schema live in [`references.md`](references.md).

## Inputs

- `content` (required) — the document
- `style_guide` (optional) — overrides all generic principles in this skill except "content is sacrosanct"
- `purpose` (optional) — e.g. "quickstart tutorial", "API reference"
- `target_audience` (optional) — e.g. "new users", "decision makers"
- `reader_type` (optional, default `humans`) — `humans` preserves comprehension aids; `llm` optimises for precision and density
- `length_target` (optional) — e.g. "30% shorter", "no limit"

## Process

1. **Validate input.** HALT if content is fewer than 3 words or `reader_type` is invalid. Note current word and section counts.
2. **Understand purpose.** Use provided `purpose` and `target_audience` or infer them. Pick the structure model that fits (Tutorial / Reference / Explanation / Prompt / Pyramid — see references).
3. **Structural analysis.** If `style_guide` provided, consult it first. Map every section's word count. Test against the model's rules (e.g. "does the recommendation come first?" for Pyramid). Identify cuts, merges, moves, splits, true redundancies, scope violations, buried critical information.
4. **Flow analysis.** Does the sequence match how readers use the doc? Look for premature detail, missing scaffolding, FAQs that should be inline, appendices that should be cut, summaries that repeat the body verbatim.
5. **Generate recommendations.** Categorise each: `CUT`, `MERGE`, `MOVE`, `CONDENSE`, `QUESTION`, `PRESERVE`. One-sentence rationale, estimated word impact. Flag cuts that may hurt comprehension when `reader_type=humans`.
6. **Output.** Document summary + prioritised recommendations + total estimated reduction. If nothing to fix: "No substantive changes recommended — document structure is sound." (valid completion, not an error.)

## Output Format

```markdown
## Document Summary
- Purpose: ...
- Audience: ...
- Reader type: humans | llm
- Structure model: tutorial | reference | explanation | prompt | pyramid
- Current length: X words across Y sections

## Recommendations
### 1. [CUT|MERGE|MOVE|CONDENSE|QUESTION|PRESERVE] — Section name
Rationale: ...
Impact: ~X words
Comprehension note: (if applicable)

## Summary
- Total recommendations: N
- Estimated reduction: X words (Y%)
- Meets length target: Yes | No | no target specified
- Comprehension trade-offs: ...
```

## Examples

**Happy path** — `structural review of this tutorial` → 6 recommendations (2 CUT, 1 MERGE, 2 MOVE, 1 CONDENSE) → ~30% reduction estimated.

**Edge case — already tight** — Output: "No substantive changes recommended — document structure is sound."

**Negative — wrong skill** — `fix the typos in this doc` is prose, not structure. Route to `rihal-editorial-review-prose`.

## Memory Bank Hooks

- **Reads:** the document passed in; `style_guide` if referenced
- **Writes:** nothing — produces a recommendations report only

## Detailed reference

See [`references.md`](references.md) for: the full principle list, human-reader vs LLM-reader principles, the five structure models with applicability rules, and HALT conditions.
