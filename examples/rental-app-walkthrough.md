# rcode — Worked Example: A Rental-Listing App

This is a full, end-to-end walkthrough of the Golden Path on one concrete project: a
rental-listing app for a Dubai property agency. Every step shows the exact command you
type and a realistic excerpt of the artifact it produces. All artifact excerpts are
inline — nothing here references an external file.

The path is: `/rcode-init` → `/rcode-council` → `/rcode-plan` → `/rcode-execute` → `/rcode-status`.

---

## 0. The project

> A rental-listing app where landlords post units and tenants browse, filter by area
> and price, and request viewings. Bilingual (English / Arabic), mobile-first.

---

## 1. Initialize — `/rcode-init`

`/rcode-init` is the single entry point. It detects this is an empty directory, so it
routes into the greenfield sub-path automatically — you do not call `/rcode-new-project`
yourself.

```
/rcode-init rental-listing app for a Dubai property agency
```

It asks a few configuration questions (language, model profile, new vs existing) and
writes the project baseline:

```
.rcode/config.yaml          # language: en, profile: balanced
.rcode/JOURNEY.md             # project identity + conventions
.planning/PROJECT.md        # one-paragraph definition
.planning/ROADMAP.md        # empty phase skeleton
```

---

## 2. Decide the hard question — `/rcode-council`

Before planning, settle an architecture question that planning should not invent an
answer to. The council convenes specialists in parallel.

```
/rcode-council should listings search be Postgres full-text or a dedicated search index?
```

Excerpt of the council session written to `.planning/council-sessions/`:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 RIHAL ► COUNCIL SESSION — listings search backend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏗️ Waleed (CTO): Postgres `tsvector` + a GIN index covers area/price/keyword
   filtering for the launch volume. A separate search service is premature.

📊 Sadiq (strategy): Agency has < 5k listings. Search is not the moat — speed to
   market is. Defer the dedicated index until volume justifies the ops cost.

🧪 Fatima (QA): Postgres FTS is testable with plain SQL fixtures. A search index
   adds a second source of truth to keep in sync.

━━━ SYNTHESIS ━━━
Decision: Postgres full-text search (tsvector + GIN) for launch.
Consensus: 3/3 agree. Revisit if listings exceed ~50k.
```

The decision is logged to `.rcode/decisions.jsonl` and is now visible to every later
agent — the planner will not re-litigate it.

---

## 3. Plan the first phase — `/rcode-plan`

With the decision settled, plan phase 1. `--research` grounds the plan in the codebase
and the council decision first.

```
/rcode-plan --research phase 1: listing CRUD + Postgres search
```

The planner runs, then `rcode-plan-checker` validates every file/symbol reference.
Excerpt of a task block in `.planning/phases/1-listing-crud-search/PLAN.md`:

```
### Task 1.3 — Listing search endpoint
<files>server/routes/listings.js, server/db/search.sql</files>
<action>
Add GET /listings/search backed by a Postgres tsvector query (per council
decision: FTS, not a separate index). Filters: area, min/max price, keyword.
</action>
<acceptance_criteria>
- Query uses the GIN index on listings.search_vector.
- Bilingual keyword match works for English and Arabic input.
</acceptance_criteria>
<verify><automated>node --test test/listings-search.test.js</automated></verify>
```

---

## 4. Execute the plan — `/rcode-execute`

The executor works task by task, makes one atomic commit per task, and runs the
post-execute gates.

```
/rcode-execute .planning/phases/1-listing-crud-search/PLAN.md
```

Excerpt of `.planning/phases/1-listing-crud-search/1-SUMMARY.md`:

```
## SPRINT COMPLETE
Sprint: 1-1
Stories: 4/4

Commits:
- a1b2c3d  feat(listings): add listing CRUD endpoints
- d4e5f6a  feat(listings): add Postgres tsvector search endpoint
- 9g8h7i6  test(listings): cover bilingual search filters

Post-execute gates:
- rcode-integration-checker: PASS (cross-phase E2E)
- rcode-nyquist-auditor:     PASS (search paths covered)
```

---

## 5. Check where you are — `/rcode-status`

```
/rcode-status
```

```
RIHAL ► STATUS
Phase 1 — listing CRUD + search ........ done (4/4 tasks)
Decisions ............................. 1 logged (search backend)
Blockers .............................. none
Next .................................. /rcode-plan phase 2: viewing requests
```

---

## What this example shows

- `/rcode-init` is always the first command — greenfield routing is automatic.
- A `/rcode-council` decision becomes durable context the planner respects.
- `/rcode-plan` is grounded and reference-checked before any code is written.
- `/rcode-execute` commits atomically and runs verification gates.
- `/rcode-status` reads project state back out at any point.

Every command here ships in the box: `rcode/commands/init.md`, `council.md`, `plan.md`,
`execute.md`, `status.md`.
