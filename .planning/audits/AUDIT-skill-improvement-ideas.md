# AUDIT — Skill-Authoring Improvement Ideas

**Date:** 2026-08-09
**Status:** SURVEY — candidate ideas only, none implemented here except item 0
**Scope:** `rcode/workflows/scaffold-skill.md`, `rcode/skills/**`, `test/compliance.test.cjs`

---

## Implemented this session

### 0. Behavioral-verification gate on skill scaffolding

Added a "Prove It Moved the Needle" step to `rcode/workflows/scaffold-skill.md` (Step 3.5). The existing 5-component compliance check only verifies structure — frontmatter, Overview, Workflow, Output Format, Examples. It has no way to catch a skill that is structurally perfect but produces zero behavioral change when loaded. The new gate requires a paired control/treatment subagent run against the skill's own trigger scenario before the skill is considered ready to ship. See the commit for this change.

---

## Surveyed but not implemented

These are genuine gaps spotted while reading `scaffold-skill.md`, the compliance test, and a sample of existing `SKILL.md` files. Each is a real, well-known practice in agentic development that rcode's current skill-authoring path doesn't cover. None of these have been built — they're written up here for a future `/rcode-add-phase` or `/rcode-plan` pass, not acted on.

### 1. No adversarial self-check before a skill is marked "done"

**The gap:** `scaffold-skill.md` and the skill-authoring path generally treat "5 components present" as the finish line. There's no step that asks a second, independently-primed reader to try to break the skill's instructions — find an ambiguous trigger phrase, a workflow step two models would interpret differently, an Output Format that doesn't actually constrain the output shape. rcode already has this exact pattern for code (`rcode-reviewer`, the self-audit language baked into several agent SKILL.md files) but doesn't apply it to the skills that *produce* that code.

**Why it matters:** A skill with vague wording ships clean through compliance and then drifts in practice — two different models (or the same model on two different days) act differently on the same trigger, and nobody notices until a user complains the skill "isn't working right."

**Shape of a fix:** A `rcode-skill-adversary` step (or reuse of an existing reviewer-style agent) that reads a finished SKILL.md cold and tries to answer: "which sentence in this skill would two competent readers interpret two different ways?" Flag ambiguous steps before compliance is declared final. This is a review gate, not a rewrite — cheap to add, doesn't require new infrastructure beyond a subagent spawn, similar in spirit to the behavioral-verification gate added above but catching a different failure mode (ambiguity vs. no-op).

### 2. Skills aren't versioned or diffed against their own behavioral history

**The gap:** When an existing skill's SKILL.md is edited (not scaffolded fresh), there's no mechanism that compares "what this skill produced before the edit" against "what it produces after." The compliance check re-verifies structure on every touch, but nothing captures a regression where an edit intended to sharpen one scenario quietly weakens the skill's behavior on a different, previously-working scenario.

**Why it matters:** Skill files accumulate edits over months (trigger phrase tweaks, workflow rewording, example additions). Without a lightweight before/after comparison, a skill can silently regress on scenarios nobody re-tests, because the compliance check has no memory of past behavior — only present structure.

**Shape of a fix:** Not full behavioral regression testing (too heavy for rcode's file-based, no-persistent-eval-harness design) — but a convention of keeping 1-2 named "golden scenarios" per skill (a couple of sentences in the SKILL.md itself, or a sibling file) that get re-run through the paired control/treatment check from item 0 whenever the skill is materially edited, not just when it's created. This turns the one-time gate in item 0 into a recurring one for high-traffic skills.

### 3. No parallel-dispatch guidance baked into the scaffolder template

**The gap:** `scaffold-skill.md`'s template (Step 2) produces a Workflow section with plain numbered steps, no guidance on when a skill's steps are independent enough to fan out to parallel subagents versus needing strict sequencing. Several existing rcode skills (`rcode-council`, `rcode-majlis-council`) do parallel dispatch well, but that pattern isn't captured anywhere reusable — every new skill author has to rediscover it from reading an unrelated skill's source.

**Why it matters:** New skills default to sequential steps even when the underlying work is embarrassingly parallel (e.g., gathering input from N independent sources before synthesis), because the scaffold template doesn't prompt the author to even consider the question. This is a missed efficiency gap, not a correctness gap — but it compounds across every skill written from the template.

**Shape of a fix:** Add one line to the Step 2 template's Workflow section comment: a reminder to mark which numbered steps could run as parallel subagent dispatches versus which must be sequential, with a one-line pointer to an existing skill (e.g., `rcode-council`) as a worked example. Low-cost, doesn't require new tooling — just a documentation nudge at the point where the decision is easiest to make (skill creation time, not after the fact).

---

## Notes on method

These three ideas came from general knowledge of established agentic-development practices — adversarial review gates, before/after regression discipline, and parallel-vs-sequential task decomposition — cross-checked against what `rcode/workflows/scaffold-skill.md`, `test/compliance.test.cjs`, and a sample of existing `rcode/skills/**/SKILL.md` files actually contain today. None of them assume functionality that doesn't exist; each identifies a step the current skill-authoring path is missing.
