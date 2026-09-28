# Portfolio Management

We may run dozens of SEO projects at once, each its own repository (an SEO site is not a
subdirectory of the rcode project — it's an independent codebase that has rcode installed into it).
This file defines how the OS reasons about many projects at once without building a database,
dashboard, or daemon (per spec's "do not over-engineer" instruction).

## The funnel

Do not invest equally in every project. Move each one through:

```text
cheap research
      ↓
cheap prototype
      ↓
initial launch
      ↓
indexation
      ↓
observe signals
      ↓
invest in winners  ──or──  hold / kill weak projects
```

This funnel maps onto the lifecycle states in `LIFECYCLE-AND-STAGE-GATES.md`: `IDEA`→`VALIDATED`
is "cheap research", `ARCHITECTED`→`FUNCTIONAL` is "cheap prototype", `LAUNCH_READY`→`LAUNCHED` is
"initial launch", `OBSERVING` is "observe signals", and Gate 9's decision
(`EXPANDING`/`IMPROVING`/`HOLD`/`CONSOLIDATING`/`KILLED`/`SOLD`) is "invest in winners / hold or
kill weak projects". Don't build a second stage model here — reuse that one.

## The portfolio index is derived, not authored

There is no hand-maintained cross-repo portfolio file. Instead, `seo-portfolio-summary.cjs` scans a
set of sibling project directories (defaulting to the siblings of the current working directory —
i.e. other checked-out site repos next to the one you're in) for the presence of
`.rcode/seo/STATE.md` and `.rcode/seo/PROJECT.md`, and regenerates a table from what it finds:

| project | domain | type | stage | priority | next action |
|---|---|---|---|---|---|

- **project** — the `Project:` field from `PROJECT.md`, or the directory name if absent.
- **domain** — the `Domain:` field from `PROJECT.md`.
- **type** — the `Project type:` field from `PROJECT.md` (see `PROJECT-CLASSIFICATION.md`).
- **stage** — the `Stage:` field from `STATE.md` (see `LIFECYCLE-AND-STAGE-GATES.md`'s 16 states);
  a directory with no `.rcode/seo/STATE.md` is not a tracked project and is skipped.
- **priority** — the `Priority:` field from `STATE.md` (`HIGH`/`MEDIUM`/`LOW`), if present, else `-`.
- **next action** — the first item under `STATE.md`'s `## Next recommended actions` heading.

Re-running the script always reflects current file state — there is nothing to keep in sync by
hand, and nothing to build (no server, no stored index) beyond the script itself.

## Why derived, not a database

- SEO sites are independent repos; a shared database would require a shared service, credentials,
  and a sync process — none of which rcode currently has (per spec's "do not over-engineer"
  instruction and the repo's existing view-only-dashboard convention, see `AGENTS.md`'s Dashboard
  Server Rules).
- Markdown files are already the project's source of truth (`.rcode/seo/*`), inspected and edited
  directly by the agent working on that project. A derived table never drifts from them because it
  is regenerated from them on every run.
- Cross-project learning (spec's "portfolio learning") still happens through an agent reading
  multiple `DECISIONS.md`/`STATE.md` files directly when asked — the summary script's job is only
  to make "what needs attention across N projects" a single command instead of N manual reads.

## Data and actions now exist

Two things this file previously reserved are built:

- `.rcode/seo/data/{gsc,ahrefs,analytics,crawls,backlinks,serp,competitors}/` — the raw export
  drop zone, created on first import. See `DATA-WORKSPACE.md` for the layout and freshness rules.
- `.rcode/seo/actions/ACTIONS.md` — the structured, machine-readable action queue that promotes
  `STATE.md`'s freeform "Next recommended actions" list into deduped, prioritized records. See
  `ACTION-QUEUE.md` and `seo-action-queue.cjs`. `seo-portfolio-summary.cjs` still reads the current
  freeform "Next recommended actions" heading with a regex, not the queue schema — that parsing
  choice didn't need to change; `ACTIONS.md` is a separate file the summary doesn't scan, and a
  project should keep `STATE.md`'s heading pointing at its top items for the portfolio view to stay
  useful without a script change.

## Capital allocation

Connect real performance data (from `GSC-GROWTH-ENGINE.md`'s winner/weak-project detection) to the
lifecycle states already defined in `LIFECYCLE-AND-STAGE-GATES.md` — no new states, just a decision
mapping for what to do once evidence exists:

| Evidence pattern | Decision | Lifecycle expression |
|---|---|---|
| Strong organic signals (winner-detection criteria met) | Invest more | `OBSERVING` → `EXPANDING` |
| Some impressions, weak CTR or unrealized potential | Optimize | `OBSERVING` → `IMPROVING` |
| No evidence after a reasonable observation window | Hold | `OBSERVING` → `HOLD` |
| Thesis invalidated (weak-project-detection criteria met) | Kill / reposition | `OBSERVING` → `KILLED` or `CONSOLIDATING` |

This is a business decision, not an emotional one: a project with no evidence after a reasonable test
gets `HOLD`, not another content sprint on hope. See `GSC-GROWTH-ENGINE.md`'s "Winner detection" and
"Weak-project detection" sections for the underlying signal lists that justify each row.

## Answering portfolio-level questions

The portfolio view should make these questions answerable without a bespoke investigation each time:

| Question | Where the answer comes from |
|---|---|
| Which sites deserve more investment? | `GSC-GROWTH-ENGINE.md` winner detection + this file's capital-allocation table |
| Which pages are closest to meaningful growth? | `seo-page-opportunity-score.cjs` high-band pages (`OPPORTUNITY-SCORING.md` Part 2) |
| Which projects have no evidence yet? | `STATE.md` stage = `OBSERVING` with no `.rcode/seo/data/` GSC import yet (`DATA-WORKSPACE.md`) |
| Which sites are decaying? | `seo-gsc-decay.cjs`'s `decaying[]` output, aggregated per project |
| Which projects generate leads? | Business-value tracking in `PROJECT.md`/`STATE.md` (`OPPORTUNITY-SCORING.md` Part 2's business-value dimension) |
| Which experiments are waiting for observation? | `ACTION-QUEUE.md` rows with `status: OBSERVING` and an unreached minimum review date |
| Which projects should be stopped? | `GSC-GROWTH-ENGINE.md` weak-project detection → this file's `KILLED`/`CONSOLIDATING` row |

Keep the implementation lightweight — this table is a pointer to existing scripts/files, not a new
aggregation service. Answering "which projects should be stopped" still means running
`seo-portfolio-summary.cjs` and reading the flagged projects' `STATE.md`/`ACTIONS.md`, not querying a
database that doesn't exist.

## Using the script

```bash
# Scan siblings of the current directory (default)
node path/to/seo-os/scripts/seo-portfolio-summary.cjs

# Scan explicit project directories
node path/to/seo-os/scripts/seo-portfolio-summary.cjs ../site-a ../site-b ../site-c
```

Prints a Markdown table to stdout. Directories without `.rcode/seo/STATE.md` are silently skipped
(not an error) — most sibling directories of a given project will not be rcode SEO projects.

**See also:** `LIFECYCLE-AND-STAGE-GATES.md` for the stage enum, `MONETIZATION.md` for the
per-project economics a priority decision should be based on, `DATA-WORKSPACE.md` for the data drop
zone, `ACTION-QUEUE.md` for the structured action queue, `GSC-GROWTH-ENGINE.md` for the winner/weak-
project signals this file's capital-allocation table consumes, `OPPORTUNITY-SCORING.md` Part 2 for
per-page scoring that feeds the "closest to meaningful growth" question.
