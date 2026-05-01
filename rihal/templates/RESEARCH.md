# Phase {{N}} — Research

**Phase:** {{N}} — {{phase_name}}
**Researcher:** {{user_name}}
**Date:** {{date}}
**Status:** Draft

---

## Question

What does this phase need to know **before** the planner can write SPRINT.md?

State the central question this RESEARCH.md answers. Keep it tight — one or two sentences. The planner reads this top-down and stops as soon as the question is answered, so do not bury the lede.

---

## Sources

Only cite material you actually fetched in this session. WebSearch snippets are not sufficient evidence. See [`@rihal/skills/_shared/research-citation-rule.md`](../skills/_shared/research-citation-rule.md).

| # | Source | Why it matters |
|---|--------|----------------|
| 1 | {{url or file path}} | {{one-line reason}} |
| 2 | | |

---

## Findings

Group by sub-question. Each finding should be defensible — link back to a source row above.

### Finding A — {{summary}}

- **Evidence:** [src #1, src #2]
- **What:** {{two or three sentences max}}
- **So what:** {{implication for the plan — concrete}}

### Finding B — {{summary}}

- **Evidence:** [src #3]
- **What:**
- **So what:**

---

## Decisions implied

What does the research force us to decide? List the gray areas the planner now needs to lock down. These become discussion items in CONTEXT.md, not silent assumptions.

- D-1: {{decision name}} — {{options + recommendation if any}}
- D-2:

---

## Out of scope

What did we NOT research and why. Name future work explicitly so it doesn't quietly fall through.

- {{topic}} — {{reason: deferred / blocked on / not needed for this phase}}

---

## Open questions

Questions that surfaced during research and stay open. The planner can ask the user, defer to a follow-up, or accept the risk. Don't pretend they are answered.

- Q-1:
- Q-2:

---

## Validation Architecture

<!-- MANDATORY — absence of this section disables Dimension 8 (Nyquist Compliance) in the plan checker. -->
<!-- If no automated tests are feasible, state that explicitly with a reason. -->

| Concern | Test File | Command | When (Wave) |
|---------|-----------|---------|-------------|
| {{feature/requirement}} | {{path/to/test.ts}} | {{run command}} | Wave {{N}} |

---

*Phase {{N}} research artifact. Consumed by `rihal-planner` per the [`@.rihal/workflows/plan.md`](../workflows/plan.md) sequence.*
