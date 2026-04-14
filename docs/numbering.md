# Numeric ID System

Rihal uses a hierarchical numeric ID system to organize work across milestones, phases, plans, and tasks.

---

## Overview

```
M1, M2, M3, ...              — Milestones (major work cycles)
└── 01, 02, 03, ...          — Phases within a milestone
    └── 01.01, 01.02, ...    — Plans within a phase
        └── 01.01.01, ...    — Tasks within a plan
```

Additionally:
- **Decimal phases** (01.1, 01.2) — urgent inserts between standard phases
- **Session IDs** — council sessions and chains timestamped

---

## Milestones (M notation)

**Format:** `M{N}` where N is a number.

**Examples:**
- `M1` — Initial launch
- `M2` — Scale phase
- `M3` — Expansion

**Scope:** Major cycle, typically several months. Contains multiple phases.

**Commands:**
```
/rihal:new-milestone "M2: Scaling Phase"
/rihal:complete-milestone M1
/rihal:audit-milestone M2
```

**Files:**
```
.planning/phases/M1/          # All phases within M1
```

---

## Phases (NN notation)

**Format:** `{NN}` or `{NN}.{N}` where NN is 01-99, optional decimal for urgent inserts.

**Standard phases:**
- `01` — First phase of current milestone
- `02` — Second phase
- `03`, etc.

**Decimal phases (urgent inserts):**
- `02.1` — Inserted between `02` and `03` (urgent bug fix, blocked dependency)
- `02.2` — Another insert after `02.1`
- Then normal `03` resumes

**Examples:**
```
M1
├── 01 Setup & Scaffolding
├── 02 Authentication
├── 02.1 (urgent) Fix SSL cert issue     ← inserted mid-cycle
├── 03 Payment integration
└── 04 Launch
```

**Scope:** 1-2 weeks of work. Contains multiple plans.

**Commands:**
```
/rihal:plan build auth module           # Creates 02/PLAN.md
/rihal:insert-phase 02 "fix ssl bug"    # Creates 02.1, renumbers
/rihal:next                              # Advances to next phase
```

**Files:**
```
.planning/phases/02/PLAN.md
.planning/phases/02/SUMMARY.md
.planning/phases/02.1/PLAN.md            # Decimal insert
```

---

## Plans (NN.NN notation)

**Format:** `{NN}.{NN}` where first number is phase, second is plan sequence.

**Examples:**
```
01.01  — First plan in phase 01 (auth scaffolding)
01.02  — Second plan in phase 01 (test setup)
02.01  — First plan in phase 02 (payment integration)
02.02  — Second plan in phase 02 (payment webhooks)
```

**Scope:** 1-3 days of work. Contains multiple tasks.

**Commands:**
```
/rihal:plan 02.01 implement payment gateway   # Creates 02.01/PLAN.md
/rihal:execute .planning/phases/02/02.01.PLAN.md
/rihal:show 02.01                             # Display that plan
```

**Files:**
```
.planning/phases/02/02.01.PLAN.md
.planning/phases/02/02.01.SUMMARY.md
```

---

## Tasks (NN.NN.T notation)

**Format:** `{NN}.{NN}.{T}` where T is task sequence within a plan.

**Examples:**
```
02.01.01  — First task in plan 02.01
02.01.02  — Second task in plan 02.01
02.01.03  — Third task in plan 02.01
```

**Scope:** 1-4 hours of work.

**Syntax in PLAN.md:**
```markdown
## Tasks

### 02.01.01 — Set up payment gateway SDK
- [ ] Install stripe-js npm package
- [ ] Create payment service module
- [ ] Configure API keys from config

### 02.01.02 — Implement checkout flow
- [ ] Create checkout form component
- [ ] Add payment processing logic
- [ ] Wire to API endpoint

### 02.01.03 — Test payment flow
- [ ] Test successful charge
- [ ] Test failed payment
- [ ] Test refunds
```

**Commands:**
```
/rihal:show 02.01.02              # Display that task
/rihal:why 02.01.02               # Explain why task was created
```

---

## Reading & Using IDs

### In commands

```
# Reference a phase
/rihal:execute 02
/rihal:plan 02                    # Plans in phase 02
/rihal:show 02

# Reference a specific plan
/rihal:show 02.01
/rihal:execute .planning/phases/02/02.01.PLAN.md

# Reference a task (usually just in viewing/documentation)
/rihal:show 02.01.02
```

### In markdown

Always include the ID in headers:

**Good:**
```markdown
## Phase 02: Authentication

### Phase Plan: 02.01 — Set up authentication scaffolding

#### Task 02.01.01 — Install Passport.js
```

**Bad:**
```markdown
## Authentication

### Set up scaffolding

#### Install libraries
```

---

## Naming conventions

### Phase names (NN)
```
01 Setup & Scaffolding
02 Authentication
03 Payment Integration
04 Launch Prep
05 Post-Launch Improvements
```

Use:
- Descriptive noun phrases
- 2-4 words max
- Order implies sequence (no "Q1", "Q2", etc.)

### Plan names (NN.NN)
```
01.01 Project initialization
01.02 Create data models
02.01 User authentication flow
02.02 Admin authentication
03.01 Payment gateway integration
03.02 Subscription billing
```

Use:
- Active voice where possible
- Shorter than phase names
- Specific outcome-focused

### Task names (NN.NN.T)
```
01.01.01 Initialize Git repo and package.json
01.02.01 Create User and Role models
02.01.01 Build login form component
02.01.02 Implement JWT token generation
03.01.01 Install Stripe SDK
```

Use:
- Even more specific
- 1-2 actions max
- Implementable in 1-4 hours

---

## Decimal phase insertion

When urgent work appears mid-cycle, insert a decimal phase:

```
Before:
01 Setup
02 Auth
03 Payments
04 Launch

Urgent: Critical database bug discovered

After:
01 Setup
02 Auth
02.1 (urgent) Fix database connection pooling
03 Payments
04 Launch
```

**Command:**
```
/rihal:insert-phase 02 "fix database connection pooling"
```

**Behavior:**
- Creates phase `02.1`
- All subsequent phases unchanged (`03`, `04`, etc.)
- If `02.1` is completed, `03` becomes next phase
- Can insert multiple decimals: `02.1`, `02.2`, `02.3`, etc.

---

## Example project structure

```
.planning/
├── phases/
│   ├── 01/
│   │   ├── PLAN.md           # Phase plan
│   │   ├── SUMMARY.md        # Execution summary
│   │   ├── 01.01.PLAN.md     # Plan 1
│   │   ├── 01.02.PLAN.md     # Plan 2
│   │   └── notes/
│   ├── 02/
│   │   ├── PLAN.md
│   │   ├── SUMMARY.md
│   │   ├── 02.01.PLAN.md
│   │   └── notes/
│   ├── 02.1/                 # Urgent decimal insert
│   │   ├── PLAN.md
│   │   └── SUMMARY.md
│   └── 03/
│       └── ...
├── council-sessions/
│   ├── council-2026-04-01-auth-strategy.md
│   ├── council-2026-04-05-tech-debt.md
│   └── ...
└── chains/
    ├── chain-2026-04-02-research-plan.md
    └── ...
```

---

## State tracking

Your `.rihal/state.json` tracks:
```json
{
  "current_phase": "02",
  "current_plan": 2,
  "phases": [
    {"number": 1, "name": "Setup & Scaffolding", "completed": "2026-04-03T14:20:00Z"},
    {"number": 2, "name": "Authentication", "started": "2026-04-04T09:00:00Z", "completed": null}
  ],
  "executions": [
    {"id": "01.01", "phase": "01", "status": "complete", "timestamp": "..."},
    {"id": "01.02", "phase": "01", "status": "complete", "timestamp": "..."}
  ]
}
```

View with:
```
/rihal:status
node .rihal/bin/rihal-tools.cjs state read
```

---

## When to increment each level

| Level | When | Command |
|-------|------|---------|
| Milestone | Completing major cycle (1+ months) | `/rihal:new-milestone` |
| Phase | Completing phase (1-2 weeks) | `/rihal:next` |
| Plan | Breaking phase into work chunks | Automatic when planning |
| Task | Within a plan | Automatic when executor runs |
| Decimal | Emergency work mid-phase | `/rihal:insert-phase` |

---

## Tips

1. **Keep phase names short** — They appear everywhere (CLI, files, state).
2. **Number sequentially** — Don't skip numbers (01, 02, 03 not 01, 03, 05).
3. **Use decimals for emergencies only** — Decimal phases should be rare (1-2 per milestone).
4. **Reference IDs in commit messages** — Helps trace code to plans:
   ```
   feat(auth): implement 2FA flow (02.01.02)
   ```
5. **Query by ID** — Reference system supports:
   ```
   /rihal:show 02.01.02
   /rihal:why 02.01
   /rihal:diff 01 02
   ```

---

## See also

- `docs/getting-started.md` — Quick onboarding
- `docs/state-and-recovery.md` — How state.json uses IDs
- `docs/commands.md` — Commands that reference IDs
