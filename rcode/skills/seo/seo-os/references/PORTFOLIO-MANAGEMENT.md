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

## Reserved, not built here

- A `data/` subdirectory under `.rcode/seo/` (raw GSC/Ahrefs export drop zone) is reserved for
  Prompt #2's data-ingest work. Do not create it speculatively.
- A structured `ACTIONS.md` promoting `STATE.md`'s freeform "Next recommended actions" list into a
  machine-readable action queue is Prompt #2's job (see `EVIDENCE-POLICY.md` and the design's
  extension-point notes). `seo-portfolio-summary.cjs` reads the current freeform heading with a
  regex, not a queue schema, and that parsing choice should not need to change when the queue is
  added later — it would just start reading richer content under the same heading.

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
per-project economics a priority decision should be based on.
