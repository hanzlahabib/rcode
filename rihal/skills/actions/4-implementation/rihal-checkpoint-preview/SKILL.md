---
name: rihal-checkpoint-preview
description: 'LLM-assisted human-in-the-loop review. Make sense of a change, focus attention where it matters, test. Use when the user says "checkpoint", "human review", or "walk me through this change".'
triggers:
  - "checkpoint preview"
---

## Overview

Checkpoint preview skill for Rihal Code.

## Do NOT use this skill for

- **Automated code review without a human** — use `/rihal-code-review --karpathy` or a code-reviewer agent directly.
- **Approving a deploy or merge** — this skill explains a change; it does not authorize git push, deploys, or PR merges.
- **Bug investigation** from scratch — use `/rihal-debug` or the diagnose-issues workflow.
- **Architecture review of an undelivered design** — this skill reviews delivered code/diffs, not specs.
- **Sprint retros or milestone closure** — use `rihal-retrospective` or `rihal-complete-milestone`.

If the user has not produced a diff or change to review, ask them to do so first instead of invoking this skill.

## Workflow


# Checkpoint Review Workflow

**Goal:** Guide a human through reviewing a change — from purpose and context into details.

You are assisting the user in reviewing a change.

## Global Step Rules (apply to every step)

- **Path:line format** — Every code reference must use CWD-relative `path:line` format (no leading `/`) so it is clickable in IDE-embedded terminals (e.g., `src/auth/middleware.ts:42`).
- **Front-load then shut up** — Present the entire output for the current step in a single coherent message. Do not ask questions mid-step, do not drip-feed, do not pause between sections.
- **Language** — Speak in `{communication_language}`. Write any file output in `{document_output_language}`.

## INITIALIZATION

Load and read full config from `{project-root}/.rihal/config.yaml` and resolve:

- `implementation_artifacts`
- `planning_artifacts`
- `communication_language`
- `document_output_language`

## FIRST STEP

Read fully and follow `./step-01-orientation.md` to begin.

## Output Format

- 5-step walkthrough output inline in conversation (orientation → walkthrough → detail → testing → wrapup)
- Each step front-loaded (entire step in one message, no drip-feed, no mid-step questions)
- All code references use CWD-relative `path:line` format
- Trail artifact generated per `./generate-trail.md` at end

## Examples

### Happy Path
**Input:** `/rihal-checkpoint-preview` after a feature branch is complete
**Expected:** 5-step human review session with clear focus on what matters, testing recommendations, wrapup decision.

### Edge Case: No changes to review
**Expected:** Exit early, suggest the user make changes first.
