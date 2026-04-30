---
plan: "02"
title: state.json — project memory and /rihal-status dashboard
priority: critical
depends_on: ["01"]
estimated_effort: medium
---

## Objective

Create `.rihal/state.json` as the canonical project memory store and a `/rihal-status` slash command that prints a readable dashboard from it. Right now every council session starts blind — no memory of decisions, phases, or what's been executed.

## Context

- `rihal-tools.cjs` already has `state advance-plan` and `state record-execution` stubs from Plan 01
- State is written to `.rihal/state.json` in the installed project (not in the rihal-code repo itself)
- The council workflow already saves session artifacts to `.planning/council-sessions/` — status should surface those too
- Template for the initial state file needs to live at `rihal/v2/` so `install-v2.js` can seed it on fresh installs
- Keep state.json simple and human-readable — this is not a database

## state.json schema

```json
{
  "version": "1",
  "project": "project-name",
  "created": "ISO-DATE",
  "updated": "ISO-DATE",
  "current_phase": null,
  "current_plan": 0,
  "phases": [],
  "executions": [],
  "decisions": [],
  "blockers": [],
  "council_sessions": [],
  "last_session": null
}
```

Field definitions:
- `current_phase` — string, name of active phase (null if none started)
- `current_plan` — int, index within current phase (incremented by `state advance-plan`)
- `phases[]` — `{ name, started, completed, plan_count }` — appended when a phase begins
- `executions[]` — `{ plan, tasks, duration_ms, committed_at, commit_hash }` — appended after each plan run
- `decisions[]` — `{ summary, phase, plan, date }` — key decisions made during execution
- `blockers[]` — `{ description, phase, plan, date, resolved }` — issues flagged during execution
- `council_sessions[]` — `{ date, question_slug, panel, artifact_path }` — auto-appended after each council session
- `last_session` — ISO timestamp, updated on every rihal workflow run

## Tasks

### Task 1 — Write state.json template and seed file
type: auto
**Steps:**
1. Create `rihal/v2/state.json` with the schema above, all values at their defaults:
   ```json
   {
     "version": "1",
     "project": "__PROJECT_NAME__",
     "created": "__INSTALL_DATE__",
     "updated": "__INSTALL_DATE__",
     "current_phase": null,
     "current_plan": 0,
     "phases": [],
     "executions": [],
     "decisions": [],
     "blockers": [],
     "council_sessions": [],
     "last_session": null
   }
   ```
   The `__PLACEHOLDER__` tokens get replaced by `install-v2.js` at install time.
2. Add copy step in `install-v2.js`: copy `rihal/v2/state.json` → `.rihal/state.json`, replacing `__PROJECT_NAME__` with the project name from config and `__INSTALL_DATE__` with current ISO timestamp.
3. Skip the copy if `.rihal/state.json` already exists (don't overwrite on re-install).
**Done when:** fresh `install-v2` creates a valid `.rihal/state.json` with correct project name
**Commit:** `feat(state): add state.json template and seed on install`

### Task 2 — Implement full state subcommands in rihal-tools.cjs
type: auto
**Steps:**
1. Read the current `rihal-tools.cjs` to see what state stubs exist from Plan 01
2. Implement all missing state subcommands:

   **`state read`** — print full state.json as formatted JSON to stdout

   **`state init`** — create state.json at `.rihal/state.json` if missing. Accept `--project <name>` flag.

   **`state set-phase <name>`** — set `current_phase`, reset `current_plan` to 0, append to `phases[]`

   **`state advance-plan`** — increment `current_plan`, update `updated` timestamp

   **`state record-execution --plan <name> --tasks <n> --duration <ms> --hash <git-hash>`** — append to `executions[]`

   **`state add-decision "<summary>"`** — append to `decisions[]` with current phase/plan context

   **`state add-blocker "<description>"`** — append to `blockers[]` with resolved: false

   **`state resolve-blocker <index>`** — set `blockers[index].resolved = true`

   **`state record-session`** — update `last_session` to current ISO timestamp

   **`state record-council --slug <slug> --panel <csv> --artifact <path>`** — append to `council_sessions[]`

3. All subcommands: read → mutate → write. Atomic write (write to temp file, rename).
4. All subcommands return JSON on success: `{ "ok": true, "state": <updated state> }`
**Done when:** all subcommands work against a real `.rihal/state.json`
**Commit:** `feat(cli): implement full state subcommands in rihal-tools`

### Task 3 — Wire council workflow to auto-update state after session save
type: auto
**Steps:**
1. Read `rihal/v2/workflows/council.md` — find Step 5 (session save)
2. After the artifact write, add a state update step:
   ```bash
   node .rihal/bin/rihal-tools.cjs state record-council \
     --slug "{slug}" \
     --panel "{comma-separated panel names}" \
     --artifact "{artifact path}"
   node .rihal/bin/rihal-tools.cjs state record-session
   ```
3. This step is silent — do not print anything to the user for the state update. The session save message is already printed.
4. Add a note in the workflow: "If rihal-tools.cjs state commands fail (state.json missing), continue without error — state is optional, session artifact is mandatory."
**Done when:** council workflow file contains the state update step after artifact save
**Commit:** `feat(workflows): wire council session save to state.json update`

### Task 4 — Create /rihal-status slash command and workflow
type: auto
**Steps:**
1. Create `rihal/v2/commands/status.md` — the slash command definition:
   ```yaml
   ---
   name: rihal-status
   description: Print current project state — phase, plan progress, recent decisions, blockers, last council session
   allowed-tools: [Read, Bash]
   ---
   ```
2. Create `rihal/v2/workflows/status.md` — the workflow:

   **Step 1:** Run `node .rihal/bin/rihal-tools.cjs state read` → parse JSON
   **Step 2:** If state.json missing → print "No state found. Run a council session or execute a plan to initialize state." and exit.
   **Step 3:** Print dashboard in this format:
   ```
   ╭─ Rihal Status — {project_name} ─────────────────────╮
   │ Phase:    {current_phase or "none started"}          │
   │ Plan:     {current_plan} completed                   │
   │ Updated:  {updated, human-readable: "2 hours ago"}   │
   ╰──────────────────────────────────────────────────────╯

   Recent decisions ({last 3}):
   • {decision summary} — {phase}, {date}

   Open blockers ({count}):
   ⚠ {blocker description} — {phase}

   Council sessions ({last 3}):
   • {date} — {question_slug} — Panel: {panel}

   Last session: {last_session, human-readable}
   ```
   **Step 4:** If any open blockers exist, end with: "⚠ {n} unresolved blockers. Address before proceeding."

3. Add `status.md` to `install-v2.js` copy steps (→ `.claude/commands/rihal/status.md` and `.rihal/workflows/status.md`)
4. Register `/rihal-status` in skills manifest (same pattern as council and execute)
**Done when:** `/rihal-status` prints the dashboard from a real state.json
**Commit:** `feat(workflows): add /rihal-status dashboard command`

### Task 5 — Wire execute workflow to update state after plan completion
type: auto
**Steps:**
1. Read `rihal/v2/workflows/execute.md`
2. After each plan completes (PLAN COMPLETE returned from executor), add:
   ```bash
   node .rihal/bin/rihal-tools.cjs state advance-plan
   node .rihal/bin/rihal-tools.cjs state record-execution \
     --plan "{plan name}" --tasks "{n}" --duration "{ms}" --hash "{commit hash}"
   node .rihal/bin/rihal-tools.cjs state record-session
   ```
3. Same silent-failure rule as council: if state.json missing, continue without error.
**Done when:** execute workflow file contains state update steps after plan completion
**Commit:** `feat(workflows): wire execute plan completion to state.json update`

## Success criteria
- [ ] Fresh install creates `.rihal/state.json` with correct project name and ISO date
- [ ] Re-install does not overwrite existing `state.json`
- [ ] `rihal-tools.cjs state read` returns valid JSON
- [ ] `rihal-tools.cjs state record-council` appends to `council_sessions[]`
- [ ] Council workflow auto-updates state after session save
- [ ] Execute workflow auto-updates state after plan completion
- [ ] `/rihal-status` prints readable dashboard from state.json
- [ ] `/rihal-status` on missing state.json prints a clean "no state" message, not an error
