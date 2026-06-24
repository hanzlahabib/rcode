# Play 3 — The Goals Protocol (`/goal`)

A meta-technique that makes ANY output dramatically better by adding a **worker → evaluator** loop instead of a one-shot prompt. Invoked in Claude with `/goal`. Use it whenever a deliverable must be airtight (keyword list, page spec, audit, plan).

## How it differs from a normal prompt
- Normal prompt: prompt in → output out. No check.
- Goals Protocol: a **worker agent** iterates on the deliverable, then a fresh **evaluator agent** (no memory of the work) audits it against your acceptance criteria one-by-one and either marks complete or kicks it back to the worker (which may ask you for missing info). Result quality jumps because every criterion is independently verified.

## The five components (GOALS)
- **G — Goal statement**: one sentence, action verb first, names a single deliverable, fits on one line.
- **O — Output spec**: exact filename, format, columns/schema. The evaluator can only audit what you specify.
- **A — Acceptance criteria**: numbered checklist; every item answerable yes/no or a number.
- **L — Limits / constraints**: forbidden actions, scope walls, resource caps (what NOT to do).
- **S — Stop and verify**: force the agent to list evidence for each criterion before declaring done, then hand to the evaluator.

Template: `templates/goal-protocol.md`. Tip: you can paste the template into Claude and say "here's what I'm trying to do — fill this in correctly," then run it.

## Apply the 3 quality tests (from dos-and-donts.md)
Stranger test · Spreadsheet test · Runway test. If the prompt fails any, tighten before running.

## Common failure modes → fixes
| Failure | Fix |
|--------|-----|
| Multiple goals jammed into one | Split into sequenced single-goal runs |
| Too vague / no end state | Add concrete output spec + numeric criteria |
| Missing acceptance criteria | Add the numbered yes/no checklist |
| Overpacked (e.g. 47 criteria) | Trim to the few that define "done" |
| Agent runs out of tokens | Reduce scope per run |

## Good vs bad (illustrative)
- ❌ "Find me some keywords for my dog grooming business and make sure they're good for SEO." — vague verb, no output spec, no criteria, no constraints, no stop condition → the agent guesses wildly.
- ✅ Goal: build a local SEO keyword list for `{{business}}` in `{{location}}`. Output: `keywords.csv` with columns keyword, intent, est_volume, est_KD, suggested_title. Acceptance: ≥25 keywords; ≥15 with KD ≤30; every keyword has a local modifier. Limits: no out-of-area keywords; no titles >60 chars; max 50 keywords. Stop & verify: list each criterion with evidence, then hand to evaluator.

This play composes with all others — wrap any of the local prompts or the content engine in `/goal` when the stakes warrant it.
