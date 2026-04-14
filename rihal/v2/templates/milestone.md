# Milestone Template

Use this template when starting a new milestone with `/rihal:new-milestone`.

## ROADMAP.md

```markdown
# Milestone: {NAME}

**Started:** {ISO_DATE}
**Status:** PLANNING

## Goals

Measurable outcomes for this milestone (3-5 items):

- Goal 1: [Specific, measurable outcome]
- Goal 2: [Specific, measurable outcome]
- Goal 3: [Specific, measurable outcome]

## Phases

High-level breakdown of work:

| # | Name | Status | Owner | Completion |
|---|------|--------|-------|------------|
| 1 | {Phase Name} | PLAN | {Owner} | 0% |

## Success Criteria

What does "done" look like?

- All goals achieved
- All phases completed
- No critical blockers outstanding

## Kill Criteria

Under what conditions do we stop this milestone?

- No engagement after 60 days
- Core technical blocker cannot be resolved
- Strategic shift makes it obsolete
```

## STATE.md

```markdown
# Milestone State: {NAME}

**Last Updated:** {ISO_DATE}
**Current Phase:** PLANNING

## Decisions Made

Log of all significant decisions with context:

| Decision | Rationale | Date | Owner |
|----------|-----------|------|-------|
| {Decision} | {Why} | {Date} | {Person} |

## Blockers

Active blockers preventing progress:

- [Blocker 1] (since date, assigned to person, depends on X)
- [Blocker 2] (since date, assigned to person, depends on Y)

## Active Workstreams

Parallel work streams running concurrently:

- Workstream 1: {Description} (owner, expected completion)
- Workstream 2: {Description} (owner, expected completion)

## Quick Tasks Completed

Small items completed outside the main phase structure:

| Task | Date | Owner |
|------|------|-------|
| {Task} | {Date} | {Person} |

## Metrics

Current health metrics:

- Phase completion: X%
- Velocity: {points/day}
- Risk level: {HIGH|MEDIUM|LOW}
```

## REQUIREMENTS.md

```markdown
# Requirements: {NAME}

**Updated:** {ISO_DATE}

## User Stories

Features requested from user perspective:

```gherkin
As a {user}, I want {capability} so that {benefit}
Acceptance Criteria:
  - [ ] Criterion 1
  - [ ] Criterion 2
```

## Technical Specifications

Implementation-level details:

- {Spec 1}
- {Spec 2}

## Acceptance Criteria

How do we validate completion?

- [ ] Criteria 1 met and tested
- [ ] Criteria 2 met and tested

## Out of Scope

What are we explicitly NOT doing?

- Out of scope item 1
- Out of scope item 2

## Dependencies

What must be done before this milestone can succeed?

- External dependency 1
- Internal dependency 1
```

## Best Practices

1. **Keep goals measurable** — "Increase signup rate by 15%" not "improve signup"
2. **Name owners for every phase** — accountability matters
3. **Update STATE.md weekly** — don't let decisions get lost
4. **Kill criteria first** — know what stops work before starting
5. **Scope creep signal** — if new phases appear, escalate
6. **Document assumptions** — every phase starts with assumptions listed
