---
name: rcode-client-gate
description: Client requirement freeze gates and async-comm patterns to stop late requirements from derailing.
triggers:
  - "client gate"
  - "freeze requirements"
  - "scope creep"
  - "client slow response"
  - "requirements freeze"
  - "client comm pattern"
  - "stop late requirements"
  - "delivery slipping"
user-invocable: true
---
@.rcode/references/karpathy-guidelines.md


## Overview

Late client requirements aren't the client's fault — they're the project's structural failure to define when input is welcome and when it's not. This skill installs three gates: a **scope freeze** at sprint start, a **decision deadline** for blocking questions, and a **change-control** path for everything that arrives after the freeze. Without these, every client comment becomes a potential mid-sprint pivot.

## The 3 gates

### Gate 1 — Scope freeze at sprint start

- Sprint scope is locked at sprint kickoff, in writing, with the client signing off.
- "Locked" means: no new stories enter the sprint without going through Gate 3 (change control).
- The scope doc lives in `.rcode/memory/milestones/current.md` (not just a Slack message).
- Sign-off is explicit — a thumbs-up emoji doesn't count. Email or document sign-off.

### Gate 2 — Decision deadline for blocking questions

- Every blocking question to the client carries a deadline: e.g. "we need an answer by Wed EOD or we ship the default option".
- Deadlines are enforced — when missed, the team picks the documented default and moves on.
- Defaults are documented BEFORE asking — "if you don't reply, we'll do X".
- Stakeholder response cadences from `.rcode/memory/people/stakeholders.md` inform the deadline (don't give a 24h deadline to a stakeholder with a documented 1-week cadence).

### Gate 3 — Change control after the freeze

- Anything new that arrives after the sprint kickoff goes into a queue, not the current sprint.
- Each change-request gets evaluated weekly:
  - **Critical** (broken core flow, security): emergency mid-sprint slot — but explicit, with a story shipped late.
  - **High** (next sprint priority): goes to top of next sprint's backlog.
  - **Medium / nice-to-have**: parked, reviewed at next milestone.
- Client sees the queue; transparency prevents "where did my request go?" friction.

## Workflow

1. **At project kickoff:** install the 3 gates. Walk the client through them — explain that this is how delivery dates stay credible.
2. **At each sprint kickoff:** run Gate 1. Write down the scope. Get sign-off.
3. **Throughout the sprint:** any blocking question gets Gate 2 (deadline + default). Any new requirement gets Gate 3 (queue).
4. **At sprint close:** review the change queue with the client. Triage.
5. **Persist all gate events** to `.rcode/memory/people/stakeholders.md` and the change-records folder. The pattern of "client always responds Friday afternoon" becomes a planning input.

## Output Format

For each sprint:

```
Sprint kickoff — <date>
Scope (signed off by <client>):
  - Story 1
  - Story 2
  ...

Active blocking questions:
  Q1 (asked <date>, deadline <date>): <question>
  Default if no answer: <documented default>

Change queue (post-freeze):
  Critical:   <count>
  High:       <count>
  Medium:     <count>

Memory Bank update:
  → .rcode/memory/milestones/current.md (scope sign-off)
  → .rcode/memory/people/stakeholders.md (cadence observations)
```

## Examples

**Happy path — government client** — Client has documented 1-week response cadence. Gate 2 deadline becomes 5 days, with a default ("we'll go with option B unless you reply"). Project ships on time despite slow comms.

**Happy path — scope freeze enforced** — Day 4 of sprint, client adds 3 requirements. Gate 3 queues all 3. Client sees them in the next-sprint backlog. No mid-sprint pivot.

**Edge case — "but this requirement is critical"** — Run the Gate 3 critical-or-not test: does this break a core flow? Is it a security issue? If yes, emergency mid-sprint slot with explicit story shipped late. If no, it's a next-sprint priority. Don't let "critical" be a synonym for "I'd really like this".

**Negative — "we'll just be more flexible"** — Refuse. Flexibility without gates is how every rcode-style late-requirements incident happens. Gates make the flexibility explicit and survivable.

## Memory Bank Hooks

- **Reads:** `.rcode/memory/people/stakeholders.md` (response cadences), `.rcode/memory/milestones/current.md`
- **Writes:** scope sign-offs to `.rcode/memory/milestones/current.md`; client change requests to `.rcode/memory/change-records/YYYYMMDD-NNN.md`
