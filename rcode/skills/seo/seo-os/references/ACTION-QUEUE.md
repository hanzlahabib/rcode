# Action Queue

**Purpose:** the single destination for prioritized work discovered by every other intelligence
module (`TECHNICAL-INTELLIGENCE.md`, `INTERNAL-LINK-INTELLIGENCE.md`, `GSC-GROWTH-ENGINE.md`,
`BACKLINK-INTELLIGENCE.md`). This un-reserves `PORTFOLIO-MANAGEMENT.md`'s previously-reserved
`ACTIONS.md` — the structured queue that promotes `STATE.md`'s freeform "Next recommended actions"
list into machine-readable records — backed by `seo-action-queue.cjs`.

## Action record contract

```
project, url, issue, evidence, action, priority (HIGH|MEDIUM|LOW), effort (LOW|MEDIUM|HIGH),
expectedEffect, status (OPEN|IN_PROGRESS|OBSERVING|DONE|REJECTED|
  NEEDS_OWNER_INPUT|NEEDS_SCREENSHOT|NEEDS_CUSTOMER_DATA|NEEDS_CASE_STUDY|NEEDS_EXPERT_REVIEW),
created, lastReviewed
```

Dedupe key: normalized `(project, url, issue)`.

Example:

```
URL: /speed-to-lead-calculator/
Evidence: 1,900 impressions, position 10.7, CTR 0.8%, query intent matches page
Action: add missing benchmark section and link from two related pages
Priority: HIGH
```

## Using the script

```
seo-action-queue.cjs add --file=f --project= --url= --issue= --evidence= --action= --priority=
  --effort= --expectedEffect= [--status=OPEN] [--reopen --reopenReason="why"]
  → {added, reason, priorStatus, reopenReason, row}
seo-action-queue.cjs list --file=f [--status=] [--priority=]  → {rows}
```

Defaults to `.rcode/seo/actions/ACTIONS.md`, created from the `ACTIONS.md` template on first use if
absent (never overwritten if present — same idiom as `seo-project-init.cjs`).

## Preventing duplication

Before adding a new action, the script checks whether an existing record already covers this
`(project, url, issue)` — spec §45's five checks (existing action? already implemented? already
tested? explicitly rejected? currently observing?) all reduce to the same lookup: does a record
already exist, and what does it say.

**Any existing row for that key blocks a plain `add`, regardless of its status** — `OPEN`,
`IN_PROGRESS`, `OBSERVING`, `DONE`, and `REJECTED` all block. `DONE` and `REJECTED` are exactly the
cases this check exists to catch: a monthly review re-running the same GSC analysis must not
silently re-add something that already shipped or was already declined. A blocked `add` returns
`{added: false, reason: "duplicate", priorStatus: <the existing row's status>, existingRow}` instead
of appending a second row, so the caller sees what happened to it and why without a second lookup.

**Legitimate re-proposal** — the underlying situation changed enough to justify a fresh record
(e.g. a keyword's volume grew after a `REJECTED` verdict, or a fix that shipped `DONE` regressed) —
requires the explicit `--reopen` flag plus a required `--reopenReason` explaining why. This appends a
new row (the prior record is left untouched as history) and returns `{added: true,
reason: "reopened", priorStatus, reopenReason, row}`. Omitting `--reopenReason` with `--reopen` set
is a hard error — the override must be deliberate and auditable, never silent.

## Observation windows

SEO changes need time to show up. When an action moves to `OBSERVING`, record:

```
change date       baseline        minimum review date        success metric
```

Use a window sized to the change type, not one universal wait — a title/meta-description edit can be
reasonably checked after re-crawl/re-indexation (often 1-3 weeks); a content rewrite or a new
internal-link pass needs longer for authority signals to settle; a technical fix (fixing a
`NOINDEX_ACCIDENT`) should be checked as soon as re-indexation is confirmed, not on a fixed calendar
date. Do not let a future agent revert an optimization two days later because rankings fluctuated
inside normal noise — that is exactly the failure mode a recorded minimum review date prevents.

## Change attribution

When several changes land close together (a content update, three new internal links, and a new
backlink all in the same week), record that overlap explicitly and **do not assign the resulting
ranking change to any one of them with confidence**. State the uncertainty:

```
ranking improved after: content update + 3 internal links + new backlink
cannot confidently assign causation
```

Manufacturing a clean causal story from noisy, overlapping changes produces false lessons that get
reapplied incorrectly next time. When attribution is genuinely uncertain, say so in the record rather
than picking the most flattering explanation.

## Human-layer hooks

Some actions cannot proceed without something only the project owner can provide. Rather than
fabricating a business fact, screenshot, customer quote, or case study, set `status` to the matching
marker (reusing `EVIDENCE-POLICY.md`'s `NEEDS_*` vocabulary):

```
NEEDS_OWNER_INPUT      NEEDS_SCREENSHOT      NEEDS_CUSTOMER_DATA
NEEDS_CASE_STUDY       NEEDS_EXPERT_REVIEW
```

and continue other queue work instead of blocking on it or inventing a placeholder that looks real.

## Recommendation output format

Default growth recommendations to this shape (this is the format the router and the review
workflows should produce, not just an internal record layout):

```
ACTION              <what to change, on which URL>
EVIDENCE            <the numbers/observations backing it>
WHY                 <why this is worth doing now, at this cost>
EFFORT              <LOW|MEDIUM|HIGH>
CONFIDENCE          <how sure the evidence supports the expected effect>
NEXT VERIFICATION   <what to check, and roughly when, per the observation-window guidance above>
```

Example:

```
ACTION      Improve /installation-cost/
EVIDENCE    2,800 impressions, position 9.8, CTR 0.6%, competitors include a cost table we lack
WHY         existing relevance means lower effort than building a new page
EFFORT      medium
CONFIDENCE  high
NEXT VERIFICATION   compare the 28-day period after recrawl/indexation
```

## See also

- `TECHNICAL-INTELLIGENCE.md`, `INTERNAL-LINK-INTELLIGENCE.md`, `GSC-GROWTH-ENGINE.md`,
  `BACKLINK-INTELLIGENCE.md` — the modules that produce records for this queue.
- `PORTFOLIO-MANAGEMENT.md` — where `ACTIONS.md`'s existence is now assumed rather than reserved.
- `EVIDENCE-POLICY.md` — the `NEEDS_*` vocabulary this module reuses rather than redefines.
- `REVIEW-WORKFLOWS.md` — the recurring cycle that reads and updates this queue.
