# State, Recovery, and Handoff

How rcode tracks project state, survives interruptions, and resumes work.

---

## State Tracking: state.json

**Location:** `.rcode/state.json`

**Purpose:** Single source of truth for project progress. Every command reads and updates this file.

**Readable format:**
```bash
/rcode-status
# or
node .rcode/bin/rcode-tools.cjs state read
```

---

## State Schema

```json
{
  "version": "1",
  "project": "my-project",
  "created": "2026-04-01T10:30:00Z",
  "updated": "2026-04-12T15:45:30Z",
  
  "current_phase": "02",
  "current_plan": 2,
  
  "phases": [
    {
      "number": 1,
      "name": "Setup & Scaffolding",
      "started": "2026-04-01T10:30:00Z",
      "completed": "2026-04-03T14:20:00Z"
    },
    {
      "number": 2,
      "name": "Authentication",
      "started": "2026-04-04T09:00:00Z",
      "completed": null
    }
  ],
  
  "executions": [
    {
      "id": "01.01",
      "phase": "01",
      "status": "complete",
      "timestamp": "2026-04-01T10:30:00Z",
      "executor": "rcode-executor",
      "commit_hash": "abc123..."
    }
  ],
  
  "decisions": [
    {
      "id": "dec-001",
      "phase": "01",
      "title": "Use PostgreSQL for primary database",
      "made_by": "council-2026-04-01",
      "timestamp": "2026-04-01T11:00:00Z",
      "rationale": "ACID compliance + JSON support"
    }
  ],
  
  "blockers": [
    {
      "id": "block-001",
      "phase": "02",
      "title": "SSL certificate provider slow to respond",
      "severity": "high",
      "opened": "2026-04-05T14:00:00Z",
      "resolved": null,
      "workaround": "Using self-signed cert for dev"
    }
  ],
  
  "council_sessions": [
    {
      "id": "council-2026-04-01-auth-strategy",
      "date": "2026-04-01T11:00:00Z",
      "question": "Should we use JWT or session-based auth?",
      "agents": ["sadiq", "waleed", "fatima"],
      "artifact": ".planning/council-sessions/council-2026-04-01-auth-strategy.md"
    }
  ],
  
  "chains": [
    {
      "id": "chain-2026-04-02-research-plan",
      "date": "2026-04-02T10:00:00Z",
      "preset": "research-plan",
      "topic": "build rental app for dubai",
      "phases": ["mariam", "hussain-pm", "planner"],
      "artifact": ".planning/chains/chain-2026-04-02-research-plan.md"
    }
  ],
  
  "workstreams": [
    {
      "id": "auth-refactor",
      "name": "Refactor Auth System",
      "phases": [2, 3, 4],
      "status": "in-progress",
      "started": "2026-04-04T09:00:00Z"
    }
  ],
  
  "active_workstream": "auth-refactor",
  "last_session": "2026-04-12T15:45:30Z",
  "model_profile": "balanced"
}
```

---

## Field Reference

### Root fields

| Field | Type | Purpose |
|-------|------|---------|
| `version` | string | Schema version (always "1") |
| `project` | string | Project name from config |
| `created` | ISO date | When rcode was initialized (never changes) |
| `updated` | ISO date | Last write timestamp |
| `current_phase` | string or null | Active phase (e.g., "02") |
| `current_plan` | number | Plan counter (increments per phase) |

### Arrays

**`phases[]`** — All phases, in order.
- `number` — Phase number (01, 02, 02.1, etc.)
- `name` — Human-readable name
- `started` — When phase began
- `completed` — When phase finished (or null if in-progress)

**`executions[]`** — All execution records.
- `id` — Plan ID (e.g., "01.01")
- `phase` — Which phase it belongs to
- `status` — complete | in-progress | failed
- `timestamp` — When execution started
- `executor` — Which agent ran it
- `commit_hash` — Git commit if applicable

**`decisions[]`** — Strategic/technical decisions made.
- `id` — Decision ID (auto-generated)
- `phase` — Which phase it applies to
- `title` — Decision statement
- `made_by` — Council session or agent that made it
- `timestamp` — When decided
- `rationale` — Why this decision

**`blockers[]`** — Known blockers and their status.
- `id` — Blocker ID
- `phase` — Which phase it affects
- `title` — What's blocked
- `severity` — high | medium | low
- `opened` — When discovered
- `resolved` — When fixed (or null)
- `workaround` — Temporary solution if any

**`council_sessions[]`** — All council debates.
- `id` — Session ID (timestamped)
- `date` — When session ran
- `question` — What was debated
- `agents` — Panel members
- `artifact` — Path to session markdown

**`chains[]`** — All pipeline runs.
- `id` — Chain ID (timestamped)
- `date` — When it ran
- `preset` — Preset name (research-plan, feasibility, etc.)
- `topic` — What was the topic
- `phases` — Agent sequence
- `artifact` — Path to output markdown

**`workstreams[]`** — Cross-phase work threads.
- `id` — Workstream ID (human-readable)
- `name` — Display name
- `phases` — Array of phase numbers
- `status` — in-progress | complete | blocked
- `started` — When created

### Singletons

- `active_workstream` — Which workstream is currently active
- `last_session` — Last command timestamp (for recovery)
- `model_profile` — Model profile in use (quality, balanced, budget, inherit)

---

## Pausing and Resuming Work

### Pause: Save context for later

```
/rcode-pause-work
```

Creates two files:

**1. `.rcode/HANDOFF.json`** (machine-readable)
```json
{
  "timestamp": "2026-04-12T15:45:30Z",
  "phase": "02",
  "plan": "02.01",
  "last_command": "execute .planning/phases/02/02.01.PLAN.md",
  "last_artifact": ".planning/phases/02/02.01.SUMMARY.md",
  "blocking_constraints": [
    "SSL certificate pending from provider",
    "Database migration script needs review"
  ],
  "next_steps": [
    "Resolve SSL blocker",
    "Review and execute 02.02 plan",
    "Run post-execute gates"
  ],
  "state_snapshot": {
    "phases": [...],
    "blockers": [...]
  }
}
```

**2. `.planning/.continue-here.md`** (human-readable)
```markdown
# Continue Here — Paused at 2026-04-12 15:45

## What you were doing
Executing Phase 02 — Authentication
Currently on plan 02.01: User authentication flow

## Current blockers
1. **SSL certificate pending** — Provider slow to respond
   - Workaround: Using self-signed for dev
   - Action: Follow up with provider, switch when arrives

2. **Database migration review** — Waiting on senior dev
   - Action: Ping review queue tomorrow

## What's next
1. Run `/rcode-resume-work` to load saved context
2. Resolve SSL blocker or confirm workaround sufficient
3. Review 02.02 plan: Admin authentication
4. Execute 02.02
5. Run post-gates before moving to phase 03

## Project state snapshot
- Phases complete: 01 (Setup)
- Current phase: 02 (Authentication) — in progress
- Plans completed in phase: 02.01 (done)
- Plans remaining: 02.02, 02.03
- Workstream: auth-refactor (in-progress)

## Last artifacts
- Phase summary: .planning/phases/02/02.01.SUMMARY.md
- Full state: .rcode/state.json
```

---

### Resume: Reload context

```
/rcode-resume-work
```

Reads HANDOFF.json and surfaces:

```
✓ Loaded context from 2026-04-12 15:45
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 You were on: Phase 02 — Authentication
   Plan 02.01: User authentication flow ✓ DONE
   Plan 02.02: Admin authentication (NEXT)

🚫 Blocking constraints:
   1. SSL certificate pending (workaround: self-signed in dev)
   2. Database migration awaiting review

📋 Suggested next action:
   /rcode-plan 02.02 implement admin authentication

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready to continue? Type /rcode-plan 02.02 or /rcode-do
```

The handoff re-surfaces:
- Current phase and plan
- Blocking constraints (so you don't forget)
- Last artifacts created
- Suggested next command

---

## Recovery: Fix corruption or stale state

### Health check

```
/rcode-health
```

Detects:
- Corrupted state.json (malformed JSON)
- Missing referenced artifacts
- Orphaned lock files
- Stale phases (started but never completed)

**Auto-fix safe issues:**
```
/rcode-health --fix
```

Recovers from:
- Missing SUMMARY.md files
- Orphaned locks
- Invalid timestamps

---

### Forensics: Post-mortem analysis

```
/rcode-forensics --last
/rcode-forensics 2026-04-12
```

Analyzes:
- Last failed command and error
- State mutations around failure
- Log entries from specific date
- Orphaned artifacts

---

### Undo last phase

```
/rcode-undo
```

Reverts:
- Last phase marked incomplete
- Commits from that phase
- Removes phase from state (but keeps artifacts)

```
/rcode-undo --keep-artifacts
```

Also keeps artifacts for reference.

---

### Correct course

```
/rcode-correct-course
```

Suggests recovery options:
1. Rollback to previous phase
2. Skip current phase and continue
3. Pivot to different approach
4. Merge with different branch

Interactive prompt helps choose.

---

## Workspace Isolation

Run parallel experiments without conflicts:

```
/rcode-new-workspace "experimental-auth"
```

Creates isolated:
- Config file
- State file
- Planning directory
- Phase tracking

Switch workspaces:
```
/rcode-list-workspaces
/rcode-switch-workspace experimental-auth
```

Useful for:
- A/B testing implementations
- Parallel research tracks
- Feature branches with separate planning

---

## Lock files

rcode creates temporary lock files to prevent concurrent access:

```
.rcode/.lock              — Active command lock
.rcode/state.lock         — State mutation lock
```

**Why:** Multiple agents shouldn't mutate state simultaneously.

**Stale locks:** If a command crashes, lock may persist. Fix with:
```
/rcode-health --fix
```

---

## Git integration

State changes are **not** automatically committed. You control commits:

```
# rcode writes to state.json
/rcode-plan build auth module

# You commit explicitly
git add .rcode/state.json .planning/phases/01/
git commit -m "feat(phases): plan 01.01 user auth"
```

**Recommendation:** Commit state + artifacts together:
```bash
git commit -m "feat(phase-01): user authentication (01.01, 01.02)"
```

Reference the numeric IDs in commits for traceability.

---

## Backup strategy

rcode state is in two places:
1. `.rcode/state.json` — active state
2. `.rcode/HANDOFF.json` — pause-work snapshot
3. `.planning/` — all artifacts (markdown files)

**All are version-controlled.** Treat like any other project files:

```bash
git log --oneline .rcode/state.json
git log --oneline .planning/
```

**Recovery from git:**
```bash
# See what changed
git diff HEAD~1 .rcode/state.json

# Revert to previous state
git checkout HEAD~1 -- .rcode/state.json
```

---

## Best practices

1. **Commit state frequently** — After each phase/plan completes.
2. **Pause before context-switch** — Use `/rcode-pause-work` if stopping mid-phase.
3. **Use workspaces for experiments** — Don't fork main state for R&D.
4. **Document blockers in state** — Use `/rcode-add-blocker` or directly edit.
5. **Review HANDOFF.md before resuming** — Refresh on context before continuing.
6. **Run health checks regularly** — Especially after crashes: `/rcode-health`.

---

## See also

- `docs/numbering.md` — Understanding numeric IDs in state
- `docs/commands.md` — `/rcode-pause-work`, `/rcode-resume-work`, `/rcode-health`
- `docs/getting-started.md` — First run initialization
