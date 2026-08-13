# CHANGELOG

All notable changes to rcode are documented here.

---
## v4.11.0 (2026-08-13) — Verification catches "built but unreachable" UI, frontend planning methodology

### Features
- **`rcode-verifier` gains a Level-5 Reachability check** — a page/route can
  pass exists/substantive/wired/data-flows checks while having no link from
  the app's actual navigation. The verifier now greps the app shell for a
  nav link and, for UI-facing phases, runs a live smoke check against the
  dev server (or a browser tool) confirming the entry point actually links
  there. `roadmapper-playbook.md` now mandates an app-shell phase (nav,
  layout, auth entry) for any UI project instead of assuming it comes free
  alongside domain phases.
- **Enterprise-readiness planning gate** — roadmapper now requires an
  auth-strategy decision and role-to-screen mapping in the foundation phase
  for multi-role/SSO/compliance projects, plus an explicit Information
  Architecture decision before phases are finalized. `discuss-phase` gained
  discretionary (not forced) standing checks for entry-point, auth-strategy,
  and roles/permissions. `project-types.yaml` gained enterprise signal
  keywords and bundled discovery questions (RBAC, SSO/IdP, audit/residency,
  i18n/RTL).
- **`/rcode-ui-phase` now produces WIREFRAMES.md alongside UI-SPEC.md** —
  every screen from the roadmap's IA, with role visibility and all four
  required states (loading/empty/error/populated) per screen, grounded in a
  new vendored design-library (`rcode/references/design-library/`, MIT
  licensed style/palette/typography/UX-rules reference data) instead of an
  agent inventing tokens from nothing. The UI safety gate this workflow
  always documented is now actually wired into `plan.md`.
- **Sprint-checker semantic verification** — a `<verify>` that only
  compiles/lints no longer satisfies a task claiming user-facing behavior;
  a UI artifact with no nav-wiring task, a dynamic-data component with no
  loading/empty/error states, or a new route with no role-access statement
  (multi-role projects) are now blockers, not silent passes.
- **`rcode install` writes a small rcode-owned "/rcode-do" preferred-command
  block** into whichever rule file each installed IDE actually reads
  (`CLAUDE.md`, `AGENTS.md`, or a dedicated `.mdc` rule for Cursor/Windsurf)
  — existing rule content is never touched.

### Fixes
- `execute-sprint.md` now actually advances `state.json`'s phase status
  (`phase_status_gate`) — it previously stayed stuck at planning-time status
  regardless of real progress. Dashboard `scanner.js` no longer renders a
  phase as done from a self-reported status alone; requires a passing
  `*-VERIFICATION.md`.
- `phase complete` (the completion path every workflow actually calls) was
  missing a stale-earlier-phase hygiene warning that only its unused twin
  `state complete-phase` had — ported over, twin marked deprecated.
- `state set --ui-spec-path`/`--wireframes-path` were completely unhandled
  by `rcode-tools.cjs` — added and verified live.
- `ship.md` now requires an explicit `## Known Gaps` PR section whenever
  VERIFICATION.md status isn't a clean `passed`, instead of letting
  `human_needed`/`gaps_found` ship silently.
- `council.md` — hedged/conditional panelist positions can no longer
  collapse into an unqualified "consensus" decision record; a panel that
  never directly addresses the literal question triggers a mandatory
  completeness check.

Tests: 611/612 (1 pre-existing unrelated scope-parity failure — `map-codebase`
scope missing from AGENTS.md's allowed list).

---
## v4.10.6 (2026-08-12) — Guardrail hooks on by default, dashboard state sync fixes

### Features
- **`rcode install` now merges guardrail hooks into `.claude/settings.json` by
  default** — pre-edit checks, bash-guard, prompt-router, cost-track, and the
  rest are on out of the box instead of requiring a separate
  `/rcode-enable-hooks` step. Interactive installs get a Y-default confirm;
  non-interactive (`--yes` / postinstall) installs enable by default. Opt out
  with `--no-hooks`, force on with `--enable-hooks`.
- **herdr-orchestrated agents now get `/rcode-do` as the literal first line**
  of their spawn prompt (single-shot and wave dispatch), routing dispatch
  through rcode's command picker instead of a hand-rolled instruction.

### Fixes
- Renamed a leftover `GLOBAL_RIHAL` shell variable to `GLOBAL_RCODE` in
  `auto-init-guard.md` (closes the same ref-cleanup class as #861).
- `planner-playbook.md` now points to `rcode/templates/sprint.md` as the
  single canonical SPRINT.md template instead of an inline copy that could
  drift out of sync.
- `council.md` now records consensus decisions via `state add-decision` so
  the dashboard's Decisions view reflects council outcomes, not just
  `record-council` session logs.
- `execute-sprint.md` now syncs per-task story status to `state.json` after
  every commit (not just at phase end), and retries a persona spawn once via
  `rcode-executor` when the persona refuses a hand-authored dispatch prompt.

Tests: 611/612 (1 pre-existing unrelated scope-parity failure — `map-codebase` scope missing from AGENTS.md's allowed list).

---
## v4.10.5 (2026-08-11) — Config questions now asked consistently, not by accident

### Fixes
- **Users routed through `/rcode-do` (or any workflow using the lightweight
  auto-init-guard) never got asked their name/language/mode/model-profile
  preferences — they silently ran on installer-seeded defaults forever.**
  `auto-init-guard.md`'s check was a plain `test -f .rcode/config.yaml`,
  which can't distinguish "the user answered these questions" from "the
  installer pre-seeded plausible defaults nobody confirmed" — `rcode
  install` writes both a marker comment (`# Generated by install.`) and
  default values into `config.yaml` so the tool has something to read
  before first real use. Meanwhile `/rcode-init` itself (only reached if
  a user happens to run it directly) already distinguished this correctly
  via a `JOURNEY.md`-presence check. The guard now checks for the same
  installer marker + missing `JOURNEY.md` and routes to the same question
  flow either way — consistent behavior regardless of which command a
  user's session happens to enter through.

Tests: 611/612 (1 pre-existing unrelated scope-parity failure).

---
## v4.10.4 (2026-08-11) — One canonical SPRINT.md template, not three

### Fixes
- **A yolo/autonomous planning run silently broke dashboard state sync** —
  found live: an autonomous `/rcode-plan` run produced a SPRINT.md using
  `### Story N — Title` markdown headings with bold-label metadata instead
  of `<task id=...>` XML blocks and YAML frontmatter. The sprint executed
  and committed real, working code (6/6 commits, tests passing), but every
  downstream dashboard-state-sync command (`state story move`,
  `owner_agent_resolution`) parses the file with `grep`/regex against the
  canonical shape — against headings, those greps silently returned
  nothing, so the dashboard never learned any of it happened.
- **Root cause, traced to source:** `rcode-planner.md`'s own role
  definition literally instructed `### Story {sprint-id}.{NN} — {name}`
  markdown headings as the required format — directly contradicting both
  `rcode/templates/sprint.md` and `planner-playbook.md`, which each used
  `<task>` XML blocks. Worse, those two files *also* disagreed with each
  other (one had YAML frontmatter, one didn't) — three files, three
  different implicit "this is the template" claims in the same agent's
  context. Under autonomous conditions with no interactive correction to
  anchor it, the planner had no unambiguous source of truth and produced
  a fourth, even older format matching neither.
- Consolidated to one canonical template (`rcode/templates/sprint.md`,
  now with the full YAML frontmatter + `<task>` schema, matching what
  `execute-sprint.md` actually parses) and repointed `rcode-planner.md`
  and `planner-playbook.md` at it instead of each independently
  describing the format. `rcode-planner.md`'s heading-ID instruction is
  now explicit that headings are a legacy fallback, not the target format.

Tests: 611/612 (1 pre-existing unrelated scope-parity failure).

---
## v4.10.3 (2026-08-11) — Council decisions now reach the dashboard

### Fixes
- **Council decisions never appeared in the dashboard's "Decisions (ADRs)"
  view, even after multiple real council sessions** — `council.md` recorded
  the session (`state record-council`, populating `council_sessions[]`) but
  never called `state add-decision`, which is the only command that writes
  to `state.json`'s `decisions[]` array — the exact field the dashboard
  reads. Council now records one concise decision line per distinct
  consensus reached, right after writing the session artifact.
- Also confirmed live: the new persona-owned execution feature
  (`owner:` field, shipped in 4.10.1) can get refused by the persona agent
  when spawned outside a real `/rcode-execute` dispatch — a hand-authored
  "you are the sprint executor" trigger reads like a prompt-injection
  attempt to the persona's own scope-discipline instincts, and it declines,
  correctly. `execute-sprint.md`'s fallback-to-`rcode-executor` path now
  also triggers on persona refusal (zero commits + refusal-shaped
  response), not just "agent not installed." Full fix for real-dispatch
  provenance tracked separately (#1036).

---
## v4.10.2 (2026-08-11) — Dashboard state sync for partial/manual execution

### Fixes
- **A committed, tested, verified task still showed "todo" on the
  dashboard after a manual `--wave N` run** — `execute-sprint.md`'s task
  commit protocol never called `state story add`/`state story move`, so
  the dashboard's per-story status override (read from `.rcode/state.json`)
  had nothing to pick up; a task only ever flipped to "done" once the
  ENTIRE phase completed. Added a step that syncs sprint/story state after
  every task commit, not just at phase completion.
- Dashboard "Decisions (ADRs)" label now spells out Architecture Decision
  Record on first mention.

---
## v4.10.1 (2026-08-11) — Council routing, yolo detection, and persona execution

Found live during a real end-to-end rehearsal (`/rcode-do` → council →
add-phase → plan → execute) on a demo app.

### Fixes
- **Council's keyword scorer used substring matching, causing collisions**
  — `"storage"` matched the ML agent's `"rag"` keyword (retrieval-augmented-
  generation) as a substring, silently misrouting a password-reset
  architecture question to the ML panel. `council-panel.cjs` now matches
  keywords on word boundaries. (#1035)
- **Council's "Next Up" suggested `/rcode-plan` before a phase existed** —
  `/rcode-plan` legitimately requires a phase (via `/rcode-add-phase` or
  `/rcode-new-project`), but council's own closing suggestion and
  `/rcode-plan`'s own preflight error didn't mention the lightweight fix.
  Both now check `project-status` and point at `/rcode-add-phase` first
  when no phase exists. (#1034)
- **`/rcode-do` never preflighted compound requests** — a single sentence
  chaining scan → init → council → plan → execute let each stage discover
  its own missing prerequisites mid-run instead of surfacing them once,
  up front. Added a `compound_chain_preflight` step that validates the
  whole chain (project-status, council `--agents` ids) before dispatching
  anything.
- **"on yolo mode" in free text was silently ignored** — `/rcode-do` only
  recognized the literal `--auto` flag or a persisted `config.mode: yolo`;
  natural-language yolo phrasing in the request itself did nothing, so
  users who typed "...and execute on yolo mode" still hit interactive
  confirmation prompts. Both `do.md` and `council.md` now detect inline
  yolo phrasing directly in the request text.

### Added
- **Council personas can now execute the sprint they informed** — SPRINT.md
  frontmatter carries an optional `owner:` field (set by the planner from
  the council decision's lead persona). `/rcode-execute` resolves it to
  spawn that persona (e.g. `rcode-yousef`) instead of the generic
  `rcode-executor`, via a shared conditional clause
  (`persona-executor-mode.md`) rather than duplicating execution machinery
  into every persona file. Falls back to `rcode-executor` when absent.
- **SPRINT.md now opens with a plain-English summary** — sprint goal,
  2-4 sentence recap, and a numbered list of task titles, before the XML
  execution prompt the agent actually reads. Costs nothing extra — it's
  assembled from the same task titles the planner already writes.

Tests: 611/612 passing (1 pre-existing unrelated failure: a historical
commit scope not yet added to AGENTS.md's allowed list).

---
## v4.10.0 (2026-08-11) — Dashboard now tells the truth about what's running

Found live during a real end-to-end rehearsal (council → plan → execute →
review → verify), watching the dashboard update in real time alongside it.

### Fixes
- **Dashboard never showed a task as "in progress" during a real
  `/rcode-execute` run** — `scanner.js` checked the wrong field name
  (`p.state` instead of `p.status`) and, separately, didn't recognize
  `"executing"` as an active status. A `toState()` helper already existed
  for exactly this normalization; the task-progress logic just never used
  it. Live-verified: the dashboard now correctly shows all in-flight tasks
  during real execution instead of none.
- **Task cards suggested commands from the wrong pipeline** — every task
  card's hints (and its actual clickable run button) were hardcoded to
  `dev-story`/`create-story`/`verify-work`/`review`, which only parse
  2-part `epic.story` ids. Real phase-pipeline tasks use 3-part
  `phase.sprint.task` ids (e.g. `1.1.2`), which silently fail to parse —
  meaning the run button did nothing on the pipeline real execution
  actually uses. Now branches on the task's `phaseId` to suggest
  `/rcode-execute`, `/rcode-verify-phase`, and `/rcode-review --phase`
  instead.

Tests: 612/612 passing.

---
## v4.9.1 (2026-08-11) — Codex on existing projects, brownfield scan honesty, brain-pull fixes

Closes out the full open-bug backlog. Every fix below was live-verified end
to end against real headless runs, a real public GitHub repo, or a real
scratch project — not just read and assumed correct.

### Fixes
- **`/rcode-init` never generated `AGENTS.md` for a project that already had
  `CLAUDE.md`** — the common case, since most projects start on Claude Code.
  Codex reads `AGENTS.md`, not `CLAUDE.md`, so this left Codex with zero
  ambient routing instruction on existing projects. Both the workflow gate
  and the underlying generator now handle the two files independently.
- **`/rcode-scan`, run exactly as `/rcode-init` recommends it (no args),
  didn't scan** — printed a usage message instead of applying its own
  documented `tech+arch` default. Now it actually applies the default.
- **`PROJECT.md`/`STATE.md` stayed install-stub placeholders** even after a
  fully successful, accurate `/rcode-scan` run — the scan's own findings
  never propagated into the files a user opens first. Now they do (no-op
  once real content exists, never overwrites user-authored docs).
- **A normal first `/rcode-init` run on a brownfield project reported
  "Setup recovery complete,"** implying something broke. Root cause: install
  always seeds `state.json`, so its mere presence was misread as "returning"
  state. Now distinguishes a genuine first run from an actual interrupted
  init.
- **`.antigravity/` was installed by default** despite the installer's own
  warning that it's inert without `--global` — no longer written on
  project-local installs.
- **Brain-pull sparse-checkout over-fetched on bare-filename path patterns**
  — a `paths:` entry like `README.md` matched that filename at any depth in
  the source repo, not just the root. Confirmed live: 6 files landed for 2
  declared paths; now correctly anchored to the repo root.
- **Cold brain-pull (~58s live) sat dangerously close to install's 60s
  timeout**, ~6x over the feature's own 10s target. It's already
  best-effort and never fails install, so it now runs detached — install
  returns immediately instead of risking a mid-clone kill.
- **Deterministic engineer-dispatch classification** (`classify-plan`) —
  replaces the prose-pseudocode routing logic from v4.9.0 that a real
  production run showed being silently skipped; now a real CLI command
  computes and returns the routing decision.
- **Install could silently lose every top-level agent file** — a dedup bug
  incorrectly deferred `.claude/agents/` to a global install the same way
  commands/skills legitimately do; agents are project-local by design and
  are no longer deduped away.
- **Legacy `rihal-*` cleanup never actually removed agent files** (scanned
  but silently dropped from both the count and the deletion pass) and had
  zero awareness of Codex-targeted installs — both fixed and live-verified
  against a real machine with 45 leftover legacy agent files.
- Plus: dashboard sidebar badges wired to real session state, docked
  terminal header no longer clips at 1920px, github-sync cross-track ID
  collision fix, benchmark script no longer counts timeouts as valid runs,
  prompt-router word-boundary fix (was over-firing on English substrings
  like "debugger"), sprint frontmatter parsing fix (dependency-order
  hazard), and a Memory Bank reconciliation pass (9 stale entries for
  long-closed issues removed).

Tests: 612/612 passing.

---
## v4.9.0 (2026-08-09) — Engineer dispatch was still a coin flip, and a real install could silently lose its own agents

v4.8.0 wired named-engineer routing into `/rcode-execute`. Running it against a
real production project immediately surfaced two more layers of the same
problem: the routing logic was prose an orchestrator had to compute by hand
(and skipped), and some real installs had already lost their agent files to
an unrelated dedup bug — silently falling back to a global install with no
warning. Both are fixed here, along with 7 execute/init/add-phase bugs found
by an actual live trace and a first pass at making rcode's own token cost
honest and measurable.

### Fixes
- **Plan-to-engineer classification was pseudocode, not a check.** `/rcode-execute`
  routes plans to `rcode-haitham`/`yousef`/`hanzla` by file-scope, but the
  matching logic lived only as prose the orchestrating session had to
  hand-compute per plan — confirmed live to be silently skipped even when a
  plan's `files_modified` obviously matched the documented backend rule. Now
  a real `classify-plan` command in `rcode-tools.cjs` computes it
  deterministically; `execute-waves.md` calls it and uses the literal
  answer. 6 new tests lock in frontend/backend/full-stack/ambiguous cases.
- **A real install could end up with zero top-level agent files.** `install.js`'s
  command-dedup logic (defer to a global install when no project-local
  commands exist) was incorrectly also applied to `.claude/agents/` — agents
  are project-local by design (see the existing #381 fix), unlike
  commands/skills. A project could lose every `rcode-*.md` agent file this
  way while `rules/` subdirectories survived, silently falling back to
  whatever happened to be in `~/.claude/` with no warning. Agents are no
  longer deduped against global; verified against a simulated broken layout
  that custom `rules/` content survives untouched.
- **`/rcode-execute` refused to run on a fresh project's default branch**
  even with `branching_strategy: none` configured, and its documented
  override flag (`--allow-main`) didn't match what the code actually checked
  (`--on-main`) — a brand-new user's very first execute hit a dead end with
  a workaround that didn't work either.
- **`config-get`'s "exits 0 with empty output" footgun** (already patched in
  `plan.md`) recurred unpatched in 4 other gates across
  `plan-research-validation.md` and `execute.md`.
- **The main executor was spawned with an unresolved model profile name**
  (`model="balanced"`) instead of a real model id, while the correct
  resolver was already used one spawn away for the reviewer.
- **`<acceptance_criteria>` was documented as mandatory** in
  `execute-sprint.md` and `plan-spawn-planner.md` long after the planner's
  real template moved to `<done>`/`<evidence>` — confirmed missing from 26/26
  tasks in a real phase. Consumer-side language now matches what's actually
  enforced.
- **`add-phase.md`'s `roadmap_exists` check could never fire** (wrong arg
  value silently failed the guard on every call), and its milestone-health
  step made 4 redundant subprocess calls for data already returned inline
  elsewhere in the same workflow. `/rcode-init`'s context-refresh step was a
  guaranteed no-op on every fresh project.
- **Stale `RIHAL ►` banner examples** in `output-format.md` survived the
  v4.0.0 rebrand.
- **`test/agent-team-parity.test.cjs` resolved agents by filename only** —
  couldn't tell that `rcode-code-reviewer.md` declares `name: rcode-reviewer`
  internally, so a correct fix looked like a broken reference. Now resolves
  by declared name too.

### Token cost (first honest numbers)
- A live, real (not simulated) trace of `init → add-phase → plan → execute`
  shipping one file with one paragraph cost **≈262,500 tokens and 7.6
  minutes** across 5 subagent spawns — the actual floor, not an estimate.
  Full trace in `.planning/audits/AUDIT-golden-path.md`.
- 3 safe fixes landed against this: an unused 127-line reference no longer
  loads on every `/rcode-plan`, 7 audit-only agents now load an 11-line
  guideline summary instead of the full version, and a 254-line UI/brand
  reference is now gated behind actual UI relevance in 2 workflows.
- `/rcode-init` and README now surface `/rcode-enable-hooks` — the
  session-status primer hook existed but was undiscoverable.

### Skill authoring
- New skills aren't done until a control/treatment subagent pair confirms
  they actually change behavior on the trigger scenario, not just that the
  markdown has the right sections (`scaffold-skill.md`).

Tests: 602/604 passing (2 pre-existing, unrelated eval-drift failures).

---
## v4.8.0 (2026-08-06) — Named engineer personas now actually execute, instead of being decorative

Found by an 8-agent herdr audit checking why `/rcode-execute` never seemed to
engage the named team (Hanzla/Yousef/Haitham/Omar) — turned out real phase
execution always dispatched to one generic executor, the persona skills were
inline roleplay dressed up to look like real subagent spawns, and their
Task-dispatchable twins couldn't write files even if invoked. 13 issues
filed (#1003-#1013), all fixed this release.

### Features
- **`/rcode-execute` now routes each plan to the matching named engineer**
  instead of always using the generic `rcode-executor`. `execute-waves.md`
  classifies a plan by its `files_modified` globs (falling back to objective
  keywords) into frontend/backend/full-stack/other and dispatches to
  `rcode-haitham`/`rcode-yousef`/`rcode-hanzla` accordingly, falling back to
  `rcode-executor` only when the classification is ambiguous or the plan is
  docs/config-only (#1003).

### Fixes
- **`rcode-hanzla`/`yousef`/`haitham`/`omar` couldn't write files.** Their
  descriptions claimed "code implementation" and "hands-on development" but
  `tools:` granted neither `Write` nor `Edit`. Also fixed the same gap on
  `rcode-nyquist-auditor`, `rcode-hussain-pm`, and `rcode-waleed`, and
  trimmed an unused `Edit` grant from `rcode-remediation-planner` (#1004,
  #1006).
- **Persona skills read as if they spawn a real isolated subagent** when
  invoking them (e.g. "talk to Hanzla") actually loads persona instructions
  inline into the current session — no isolation, no `Task()` call.
  `hanzla-engineer`/`yousef-backend`/`haitham-frontend` now say so plainly,
  matching the precedent already set for `majlis-council` (#1004, #1009).
- **`raees-orchestrator` narrated dispatching other agents** ("Layla invoked
  first", "Dispatching Haitham directly") while its own capability table
  marked every dispatch mechanism unimplemented, and no real dispatchable
  agent exists for it at all. Rewritten to describe its output as a dispatch
  *plan*, not an action (#1009).
- **`hussain-sm`'s retrospective capability was labeled "Multi-agent review"**
  but is single-session roleplay with no real `Task`-dispatchable twin —
  relabeled (#1009).
- **`/rcode-dev-story`'s only next-step pointed at `/rcode` (no hyphen), a
  command that doesn't exist** anywhere in this project's hyphenated
  `/rcode-*` namespace (#1005).
- **`/rcode-do`'s persona shortcut (`@hanzla DS`) printed a banner reserved
  for real `Task(subagent_type=...)` spawns** while the router's own
  guardrails forbid ever calling `Task()` — and those same guardrails
  ("Nothing else. Period.") contradicted the router's own preceding steps,
  which use `Bash`/`Read` throughout (#1007).
- **3 of `lens-audit.md`'s 16 lenses were never actually dispatched** despite
  the workflow's own header claiming every lens delegates via `Task()` —
  `rcode-dep-auditor`, `rcode-cross-platform-auditor`, and
  `rcode-observability-auditor` now are (#1008).
- **`/rcode-council` never populated `response_language` or the mandatory
  "Domain:" banner** outside `--explain`, and its required-reading file had
  a path to a nonexistent script plus a stale "3 agents installed" claim
  (actual: 45) (#1010).
- **`execute.md`'s code-review gate spawned a non-existent
  `rcode-code-reviewer` agent type** (the real one is `rcode-reviewer`) —
  same rename applied everywhere else the wrong name appeared
  (`code-review.md`, `code-review-fix.md`, `lens-audit.md`) (#1011).
- **`rcode-verifier` could emit `result: PASS` instead of the required
  `status: passed`**, which `execute.md`'s UAT gate greps for explicitly —
  pinned the `VERIFICATION.md` template's schema so this can't drift again
  (#1012).
- **`roadmap update-plan-progress` reported success but left ROADMAP.md's
  prose text stale** ("Planned" / `_TBD_`) after a phase actually completed,
  even returning `updated: false` while claiming the right computed status.
  Fixed the root cause in `roadmap.cjs`; added 5 regression tests (#1013).

Tests: 596/598 passing (2 pre-existing unrelated eval-drift failures, unchanged from before this release).

---
## v4.7.3 (2026-07-29) — Dashboard task titles and acceptance criteria were unreadable

### Fixes
- **Tasks showed as "Task 1", "Task 2", "Task 3" instead of their real
  title.** `rcode-planner` emits `<task id="..." title="...">` as an
  attribute, but `scanner.js` only ever looked for a nested
  `<title>...</title>` child element no current planner output
  produces — the match always failed and every task silently fell
  back to a generic placeholder. Now reads the `title="..."` attribute
  first (same place `id` comes from), falling back to the legacy
  nested tag for old SPRINT.md files.
- **Acceptance criteria rendered as one unreadable run-on line.**
  SPRINT.md stores them as `- line\n- line`, but the dashboard
  interpolated that raw text into a flex row, so the browser collapsed
  the newlines. Added `AcceptanceList` to split and render them as an
  actual bullet list.
- **`fix(init)` (v4.7.1) used a commit scope never added to either
  allowed-scope list** — added `init` to both `AGENTS.md` and
  `CONTRIBUTING.md`, fixing both scope-parity tests.

Tests: 591 passing.

---
## v4.7.2 (2026-07-29) — Planners now self-split before the checker has to reject them

Diagnosed against a real run: a 58-file phase produced one 31-task
mega-sprint, got rejected by `rcode-sprint-checker`'s own "scope exceeds
context budget" rule, and cost a full extra planner run to reshard —
1h27m and 600k+ tokens for a plan that should have split on the first pass.

### Fixes
- **`rcode-planner.md` documented a `## Scope` sizing contract
  (`plan-spawn-planner.md`) never emitted** (#979). The planner now gets
  an explicit instruction to self-upgrade to `initiative` scope and emit
  multiple SPRINT.md files mid-decomposition, instead of waiting for the
  checker to force a resharding pass.
- **`rcode-do` router never named its own trigger phrases** — saying "use
  rcode" / "rcode kar do" with a bundled multi-part task had nothing to
  match against, so it got hand-rolled instead of routed. The router's
  description now names these phrases explicitly.

### Dashboard
- **Empty-state command hints are now click-to-copy** (`CmdHint`) across
  Backlog, Kanban, Memory, Phases, Sprints, and Tasks — previously plain
  text you had to retype. Guarded with `stopPropagation` where it sits
  inside a clickable card row (SprintCard's empty state).

---
## v4.7.1 (2026-07-26) — Close the ambient-instruction gap for existing-project installs

Diagnosed against a real consumer project: a project set up via `/rcode-init`
alone (the common "add rcode to an existing codebase" path, as opposed to
`/rcode-new-project`) never got a `CLAUDE.md`/`AGENTS.md` command-routing
file — so an agent told to "use rcode" with no specific slash command had
nothing rcode-specific loaded and improvised instead of routing correctly.

### Fixes
- **`/rcode-init` now generates `CLAUDE.md`/`AGENTS.md`** (#978) when
  missing — previously only `/rcode-new-project`'s roadmap flow did this.
- **The `/rcode-new-project` flow itself was silently broken** (#978) — the
  file it actually includes (`new-project-create-roadmap.md`) referenced an
  undefined `$INSTRUCTION_FILE` variable and falsely claimed
  `generate-claude-md` didn't exist. A prior fix had landed in a
  similarly-named but unused file instead. Fixed at the file that's
  actually wired in.
- **Planners no longer re-paste full decision rationale into tasks** (#977)
  — a real SPRINT.md hit 1000+ lines because a task's action steps
  re-explained CONTEXT.md's decisions in full instead of just referencing
  the ID. The playbook now says reference, don't restate.
- **Executors are told explicitly not to freehand status docs** (#977) —
  root-level `AGENT_X_DONE.md`-style handoff files are out; the completion
  record is always `SUMMARY.md` under `.planning/phases/`, including in
  parallel multi-agent runs.

Tests: 591 passing.

---
## v4.7.0 (2026-07-26) — Same-page drawers, Backlog view, README diagrams

Clicking a task, decision, blocker, or sprint used to either do nothing or
navigate you away from what you were looking at. It now opens in a drawer on
top of the current view — no lost place, no dead-end "View plan file" button.

### Dashboard
- **Same-page detail drawers** (#971) — Overview cards (Completed Tasks, In
  Progress, Recent Decisions, Blockers, Progress Timeline) and the
  Phases/Sprints/Tasks/Kanban/Decisions pages all open a drawer in place
  instead of navigating away. `scanner.js` now attaches real file paths to
  tasks and sprints, so there's something concrete to open — previously the
  data simply didn't exist. Decisions and blockers (no backing file) get a
  lightweight fields-only drawer instead.
- **Backlog view** (#972) — a new nav entry lists not-yet-started phases
  (real `state.json` data, `state === 'todo'`), deep-linking into the
  existing phase detail page.
- **Dependency graph honest empty state** (#973) — when a milestone has no
  cross-phase dependencies, the graph no longer falls back to a grid of
  disconnected chips under a misleading "Dependency Graph" heading. It's
  relabeled "Phases" and rendered as a compact connected sequence instead.
- **Files view presentation** (#974) — inline `style=` attributes replaced
  with CSS classes, file-type icons per row, and total/per-group file counts.
- **Theme toggle icon** (#975) — the topbar's theme button showed a generic
  "⋯" regardless of theme; it now shows sun/moon matching the theme you'll
  switch to.

### Docs
- **README diagrams** (#976) — Mermaid diagrams added to "What it actually
  is", "Why I built it", and "The full loop" so the core mental model doesn't
  rely on prose alone. `/rcode-from-template` also gets its first README
  mention.

Tests: 591 passing (no new automated coverage this cycle — dashboard UI and
README changes, verified by manual browser QA against the running server).

---
## v4.6.0 (2026-07-11) — Diwan dashboard redesign + live agent orchestration rail

The dashboard gets its Diwan design system — a full visual rebrand plus a
restructured Orchestration view where you watch every running agent at a
glance — and the hook/runtime bugs that made sessions hang or crash are gone.

### Dashboard — Diwan design system
- **Full-fidelity rebrand** — new token system (teal accent, sunken surfaces, per-status wash/border families) applied across every view including the previously-exempt Overview card namespace and phase-graph tokens; zero orphan legacy colors (verified by computed-style checks in both themes).
- **Orchestration view restructured** to the design's 2-column layout: left rail (header, live Agents card, Pipeline card), right full-height docked terminal with traffic-dot chrome, live indicator, and Stop.
- **Live agents at a glance** — the left rail now lists the orchestrator's running sessions (status pill, elapsed / idle / files-changed line); clicking any agent, pipeline row, or history row attaches the docked terminal to that session; Stop targets the attached session only. Command launching moved to a compact footer control, flow unchanged.
- Found and fixed along the way: a CSS comment bug silently dropping ~34 rules, a `.view.active` specificity conflict, and an undefined accent fallback rendering Discord-indigo.

### Reliability
- **Dashboard no longer hangs WSL** (#964) — a duplicate `server.on('error')` handler defeated the EADDRINUSE exit(2) guard, so any occupied orchestrator port triggered an infinite 3-second respawn loop. Single error path now; port conflicts log once and stay functional.
- **Hooks self-heal missing lib modules** (#960) — fresh worktrees/merges no longer crash every hook with a loader error; `requireLib()` restores the module from the in-repo source or degrades gracefully.
- **Orchestrator port no longer hard-coded** (#969) — the server injects `ORCH_PORT` into the client and CSP, so a second dashboard instance can never silently drive the wrong orchestrator.

### Council grounding (#963)
- Market/discovery/greenfield councils must now write a research artifact before spawning; synthesis opens with an "⚠ UNGROUNDED" banner if it's missing, panelists must verify or tag `[unverified — training data]` on pricing/fee/market claims, and every verdict carries a "Data freshness" footer. 17 lint tests lock the contract.

### Known issues filed this cycle
- #965 sidebar badges not wired to sessions · #966 stale/junk state entries · #967 dashboard view-only toggle · #968 Memory view health signals · #970 terminal header overflow at 1920px · #961 gitignore slice_end · #962 bench error rows

Tests: 574 → 591 passing.

---
## v4.5.0 (2026-07-10) — Ambient memory: relevance-ranked injection + drift detection

The Memory Bank stops being pull-only. Session start and pre-compact now inject
relevance-ranked memory automatically, a post-commit drift check catches
"memory says X, code does Y", and the audit that motivated all of it fixed the
silent failures that kept consumer installs broken.

### Memory (#958)
- **Relevance-ranked injection** — `rcode/bin/lib/memory-select.cjs` scores Memory Bank files against the current phase, git branch, and recently touched files; `session-start` injects the top excerpts within a ~1500-token budget (override: `memory_inject_budget` in `.rcode/config.yaml`), `pre-compact` within ~600.
- **Drift detection** — `rcode/bin/lib/memory-drift.cjs` compares `stack.md`/`decisions.md` claims against the last 10 commits and the working tree (dep contradictions, missing paths, stale INDEX). Post-commit nudges once per session; `rcode-hooks drift` prints the full report.

### Fixes from the 2026-07-10 product gap audit
- **Silent no-op when `rcode/data/` is missing** (#952 follow-up) — prompt-router now emits an actionable "run `npx @hanzlaa/rcode update`" warning instead of silently disabling skill auto-detection.
- **Audit routing** (#956) — bare "audit" routes to `/rcode-audit`; the karpathy intent points at the real entry point; removed a false "records to state.json" claim from the nudge.
- **Roman-Urdu + Arabic intent keywords** (#957) — prompt-router now matches bilingual prompts, not just English.
- **State hygiene** (#955) — canonical `planned|executing|complete` status enum with load-time migration; `resolveActivePhase()` no longer announces a stale phase in the session greeter; gate warns when completing a phase while an earlier one is stuck executing.
- **Namespace cleanup** (#954) — migrate path backs up and removes legacy `rihal-*` twins and duplicate command registrations; doctor reports duplication, missing data files, stale executing phases, and Memory Bank staleness.
- **Truthful docs** (#958, #959) — memory INDEX no longer claims automatic reads it didn't do (now it does, and says how); AGENTS.md dashboard rule matches the real architecture; TODO compliance grep no longer self-triggers.

### Refactor
- **rcode-tools split begins** (#204) — brain, progress, summary, and gitignore families extracted to `rcode/bin/lib/` (`cmdState` deferred to a focused pass).

### Known issues filed, not yet fixed
- #960 `rcode/bin` → `.rcode/bin` mirror desyncs on git merge/pull (SessionStart crash until synced)
- #961 `slice_end` ReferenceError in gitignore block rewrite (pre-existing, surfaced by the split)
- #962 bench.cjs counts timed-out runs as 1-line outputs

Tests: 509 → 574 passing.

---
## v4.4.4 (2026-06-28) — Milestone guidance can't be bypassed

A cluster of "the signal is computed but only surfaced if you run the right
command" gaps — guidance moved to the CLI chokepoints so no entry point skips it.

### Fixed

- **Phase-threshold guidance fires from the CLI** (#942) — the "milestone has too many open phases → close it" nudge previously lived only in `add-phase.md` prose, so adding phases via the CLI (`phase add --number`), the bulk-draft path, or `state insert-phase` bypassed it. A real project reached 93 open phases in one milestone with no guidance. Now emitted from every phase-add chokepoint (returns `milestone_health` + a `nudge` at ≥8 / ≥12 open); `plan.md` + `insert-phase.md` surface it.
- **Auto phase-number guard no longer misfires on high-base schemes** (#944) — the guard compared the next number against the phase *count*, so an intentional 1031-style scheme aborted and forced `--number` on every add (which then bypassed #942). Now it compares against the max *tracked* number: a contiguous next (`maxTracked+1`) is always allowed; only a non-tracked ROADMAP/dir entry >50 above the tracked max is treated as a phantom.
- **End-of-milestone nudge on completion** (#943) — `phase complete` was silent when the last phase finished; it now emits a milestone-complete nudge (→ `/rcode-complete-milestone` / `/rcode-new-milestone`) when no open phases remain, and `execute.md` surfaces it instead of auto-advancing past a finished milestone.
- **`workflow-config-audit` is now gated** (#945) — the stale-`config.json` scanner had no consumer; a test runs it and fails on any stale reference.

---
## v4.4.3 (2026-06-27) — Security hardening + green suite + manifests

Closes the full audit backlog: dashboard/orchestrator security, a fully green
test suite, SEO-module compliance, and parity manifests. No breaking changes.

### Security

- **Confirmation gate before orchestrator spawn** (#916) — the dashboard no longer launches an agent session on the first click; both spawn paths open a `RunConfirmDialog` that names the privilege grant and shows the exact command. In-app dialog, not `confirm()`.
- **orch-token same-origin guard** (#917) — `/api/orch-token` rejects cross-origin requests so a malicious tab can't exfiltrate the token.
- **Skip-permissions documented + audible** (#918) — explained why orchestrated PTY runs skip permissions; spawn-time warning logged.
- **Allowlist closes the non-cmd bypass** (#919) — non-`cmd-` sessions may only run slash commands, not free-form prompts.
- **Request-body cap** (#921) — orchestrator `parseBody` caps at 1 MB and destroys the socket on overflow.
- **No package install on dashboard open** (#922) — missing `node-pty` degrades the terminal with a message instead of running `pnpm/npm install`.
- **postinstall opt-out** (#924) — `RCODE_NO_POSTINSTALL=1` skips the global `~/.claude` auto-install.
- **brain pull supply-chain guard** (#925) — only github.com repos under an approved org are pulled; unpinned (branch-tracking) sources are skipped unless explicitly overridden.

### Fixed

- **Green test suite** (#923) — all formerly-failing tests pass; suite is 502/502.
- **SEO module compliance** (#934) — 8 skill names prefixed `rcode-`, 4 oversized skills split into sibling `references.md`, bloated trigger lists trimmed to ~12.
- **Doc counts synced** (#931) — README + install.md agree (45 agents / 117 commands / 96 skills), generated by `benchmarks/facts.cjs`.

### Added

- **`--local-only` install flag** (#938) — forces a self-contained project install instead of deferring to global skills; the global-deferral skip now warns explicitly.
- **Command-alias manifest** (#933) — `rcode/command-aliases.yaml` + test for intentional command→workflow name mismatches.
- **Internal-workflow manifest** (#939) — `rcode/internal-workflows.yaml` + test so command-less workflows are declared internal, not mistaken for drift.
- **Command-palette rationale** (#932) — documented why the runner exposes only the safe read-only subset.

---
## v4.4.2 (2026-06-27) — Fresh-install verification fixes

Follow-up to v4.4.1 from a real fresh-install verification. Fixes a `validate`
crash, aligns installed `state.json` with the canonical schema, ships the
benchmark script, and corrects stale README numbers.

### Fixed

- **`rcode-tools validate` crashed** with `readState is not defined` (nested function unreachable from the validate switch); now reads `state.json` at module scope (#940)
- **`validate` miswired against a phantom schema** — checked `current_milestone` (doesn't exist), required `current_phase` (null on fresh installs), and required `current_phase` in `config.yaml` (lives in state). Now validates the real schema and is lenient on fresh/stub projects (#940)
- **Installed `state.json` was non-conformant** — `install.js` now writes `schema_version: 2`, `milestones: []` (plural array), and a non-null `project`, matching `cli/lib/schemas.cjs` (#940)
- **`/rcode-lazy` referenced a stale source path** (`@rcode/skills/...`); the command now invokes the `rcode-lazy` skill by name, resolving under both global and local installs (#929 follow-up)
- **README "By the numbers" was stale/false** — claimed "497 tests, 0 failing / 100% passing" (actual: 495 tests); removed the stale receipt screenshot and corrected all counts to match `benchmarks/facts.cjs`; no longer asserts a green suite while tests fail (#927)

### Added

- **`benchmarks/` now committed** — `facts.cjs` and friends ship in the repo so the README's "clone and run it" instruction works; generated `results/` are gitignored

### Note

- rcode-tools remains zero-runtime-dependency — `validate` uses hand-rolled checks, not the zod-based `schemas.cjs` (a devDependency)

---
## v4.4.1 (2026-06-27) — Audit fixes: install hygiene, dead commands, security

Bug-fix patch from a community usefulness + security audit. No new features.

### Fixed

- **Fresh install state drift** — ROADMAP.md stub no longer includes a `## Phase 01` heading; `progress init` no longer warns about 0-vs-1 phase mismatch on a brand-new project (#935)
- **Machine path in config** — `rcode_source_path` removed from generated `.rcode/config.yaml`; committed configs are now identical across machines (#937)
- **`--no-prompt` planning default** — `rcode install --yes` now defaults `commit_planning: true` so CI/automated installs version planning files alongside code (#936)
- **Dead `/rcode-lazy` route** — added `rcode/commands/lazy.md` so the router's "be lazy / YAGNI" entry resolves to a real slash command (#929)
- **`/rcode-create-milestone` references** — renamed to `/rcode-new-milestone` across 8 doc and workflow files (#928)
- **Help listed unimplemented commands** — `/rcode-fast` and `/rcode-bootstrap` ("not yet implemented") removed from help output (#930)
- **`ws` DoS vulnerability** — bumped from `^8.20.1` to `^8.21.0` (#920)
- **Skill stubs blocked direct invocation** — generated `.claude/skills/rcode-*/SKILL.md` stubs now have `user-invocable: true`; `/rcode-do` and others no longer show "can only be invoked by Claude" when typed directly
- **README stale version and test count** — version updated to v4.4.0→v4.4.1; hardcoded test count replaced with CI badge reference (#926)
- **`benchmarks/facts.cjs` false claim** — removed unresolvable `node benchmarks/facts.cjs` command from README (#927)
- **Dashboard "view-only" label** — removed from README and installer welcome message; dashboard is not view-only (#916 partial)

### Added

- **Feedback prompt in installer** — `pnpm dlx @hanzlaa/rcode install` now shows a thank-you note and 30-second issue-reporting guide at the end

---
## v4.3.3 (2026-06-23) — Cross-IDE accuracy + intent-router reach

Marketing-readiness pass: make rcode actually work and read truthfully across
non-Claude IDEs, and stop the intent-router losing planning/architecture prompts.

### Added
- Per-task **actions + results** in the Diwan dashboard (GOAP-style execution transparency) (#905)
- Intent-router keyword coverage for `integration`/`integrate`, `please plan`, `scope this`, `design this`, `architect this` so planning/architecture prompts route to rcode (#907)

### Changed
- Intent-router advisory is now **directive** ("use X for this task"), not a soft "consider" tip, so it competes with imperative SessionStart primers (#907)
- Installer **warns** when `--ide codex`/`antigravity` is selected without `--global` (the slash-router hook only wires on a global install) (#908)
- Docs (`install.md`, `getting-started.md`, README): correct the Codex/Grok slash-command story (UserPromptSubmit hook router, not "paste manually"); replace the false "Gemini" IDE-support claim with Codex; fix legacy `rihal-code` repo URLs (#909)
- herdr-orchestration skill: shared mid-wave doc, verify-beyond-TSC gate, wave cost budget, reviewer agent, blast-radius safety, retro (#898–904, #906)

### Fixed
- README hero images now committed (`brand/`) — were 404ing on GitHub (#909)

---
## v4.3.2 (2026-06-13) — Dashboard refactor follow-ups

Patch release. No behavior changes; internal cleanup from a code-review pass.

### Changed
- `server/lib/html/client/util.js`: hoisted shared `phaseMilestone` derivation into util and removed the duplicated copies in `PhasesView.js` / `SprintsView.js`
- `server/lib/html/client/components/StatusSummaryBar.js`: added `sessionChip()` for consistent session-status vocabulary
- `server/orchestrator.js` / `server/dashboard.js`: minor follow-up polish

---
## v4.3.1 (2026-06-13) — Banner cleanup + clearer dashboard/orchestrator URLs

Patch release. No behavior changes.

### Fixed
- `rcode/references/output-format.md` + `rcode/skills/.../rcode-create-milestone/steps/step-10-complete.md`: stage-banner prefix `RIHAL ►` → `RCODE ►` (leftover from the v4.0.0 rename — workflows were still printing the old brand in stage headers)
- `rcode/references/auto-init-guard.md`: internal `GLOBAL_RIHAL` shell var renamed to `GLOBAL_RCODE`
- `server/orchestrator.js`: hitting the orchestrator port (7718) in a browser returned a bare `{"error":"unauthorized"}`; it now serves a friendly landing page that points to the dashboard. The `/api/*` endpoints stay token-guarded.
- `server/dashboard.js`: startup banner now highlights the dashboard URL to open (`👉 OPEN THIS`) and labels port 7718 as the internal orchestrator API (not for the browser); passes `DASH_PORT` to the orchestrator so its landing page links back correctly

---
## v4.3.0 (2026-06-13) — Majlis dashboard redesign: live orchestration, multi-runner, dependency graph

Minor release. No breaking changes; drop-in upgrade. Bundles the v4.2.0 changes (never published) plus a major dashboard overhaul and cross-platform test hardening.

### Added
- **Dashboard redesign** — the Majlis dashboard (`server/`) is rebuilt to a navy analytics layout with a full theme system (`--dash-*` tokens, working dark + light), an overview of nine cards (progress donut, current phase + milestone stepper, timeline, completed/in-progress tasks, blockers by severity, project health, recent decisions, progress timeline), and a polished sidebar with live health badges
- **File + Memory readers** — clicking a file or memory entry opens a shared slide-over reader (`server/lib/html/client/components/FileReader.js`) rendering markdown
- **Agents view** — team-grouped cards with role badges and tool chips; clicking an agent opens a drawer with its full prompt (`/api/file` extended to read `rcode/agents/*.md`)
- **Multi-runner picker** — Run buttons let you choose the agent CLI (Claude + Codex/Copilot/Gemini/Grok/Cursor/Antigravity behind a `Beta` badge) and model; argv builders are grounded in each CLI's real flags, with availability detection and disabled entries for untested/missing CLIs (`GET /api/runners`)
- **Live orchestration** — running sessions now surface across Tasks, Kanban and the Overview In Progress card (pulsing indicators, elapsed time, click-to-open terminal); blocked-session detection raises a notification banner + topbar bell, with running/blocked/exited status dots everywhere
- **Run history** — orchestrator persists completed runs to `~/.rcode/orch-history.json`, served via `GET /api/history`
- **Phase dependency graph** — inline-SVG DAG on the Roadmap view, layered by `depends_on`, with hover highlighting and click-to-navigate
- **Per-task pipeline** — every task row shows a stage stepper derived from real status
- `.gitattributes` — forces `eol=lf` on source/fixtures so Windows checkouts stop CRLF-breaking parsers and baselines

### Fixed
- **Cross-platform tests** — resolves Windows + macOS suite failures (path handling via `path.join`/`path.sep`, `safeRmSync` realpath containment for macOS `/private/tmp`, POSIX-only mode assertions guarded, symlink tests skipped on win32, CRLF-tolerant parsers); the full suite now passes on Ubuntu/macOS/Windows across Node 18–24
- **CI** — `test.yml` and `dogfood.yml` install devDependencies (suite exercises `cli/*` which needs `zod`/`picocolors`/`@clack/prompts`); `ws` documented as the sole allowed runtime dependency; semantic-PR workflow granted `pull-requests: read`
- **Data integrity** — dashboard components no longer show sample-as-real data; honest empty states throughout; fabricated metrics replaced with real values or "—"
- **Runtime** — preact/htm vendored locally (offline-safe), scanner mtime cache, poll re-render dedupe, slice-level store subscriptions; mobile layout + accessibility baseline pass

---
## v4.2.0 (2026-06-11) — Grok support and slash-command hook router for Codex/Antigravity

Minor release. No breaking changes; drop-in upgrade.

### Added
- `cli/install.js`: `grok` joins `SUPPORTED_IDES` — Grok Build is Claude-Code-compatible and reads the global `.claude/commands/` layout, so `--ide grok` now installs instead of rejecting
- `cli/rcode-slash-router.cjs`: dependency-free prompt-submit hook router — intercepts `/rcode-<name> [args]` and injects the command body via `hookSpecificOutput.additionalContext`
- `cli/install.js`: `--global` install wires the router for Codex (`~/.codex/hooks.json` `UserPromptSubmit`) and Antigravity (`~/.gemini/antigravity/settings.json` `UserPrompt`); hook merge is idempotent and preserves existing third-party entries
- `cli/uninstall.js`: removes only the rcode hook entry and router files on uninstall, leaving other hooks intact
- `test/slash-hook-router.test.cjs`: covers routing, hook wiring, and removal

### Fixed
- `.github/workflows/release.yml`: release job now uses pnpm instead of `npm ci` (repo has no `package-lock.json`), unblocking tag-triggered releases
- `test/bash-guard-hook.test.cjs`: rm-rf allowlist assertion pins `TMPDIR` so it passes on hosts where `os.tmpdir()` is `/tmp`

### Notes
- Antigravity router wiring is best-effort: live audit (`.planning/audits/AUDIT-ide-slash-commands.md`) could not confirm `agy` honors `additionalContext` injection
- File-based Codex/Antigravity slash-command branches (`feat/multi-agent-slash-parity`, `feat/codex-prompts`, `feat/antigravity-skills`) were superseded by the hook router after live verification showed the file approach never surfaces in either CLI

---
## v4.1.2 (2026-06-04) — installer UX, workflow quality, and IDE-neutral docs

Patch release shipping Wave 10–11 fixes. No breaking changes; drop-in upgrade.

### Fixed
- `cli/install.js`: warns when both `rcode-*` and `rihal-*` namespaces are installed; `--dry-run` / `--list-files` preview flags added
- `rcode/workflows/plan.md`, `execute.md`, `sprint-planning.md`: project-status preflight guard halts on uninitialized/stub projects
- `rcode/bin/rcode-tools.cjs`: `sprint add` error includes sync hint ("run rcode state sync or /rcode-update")
- `rcode/workflows/review.md`: null `phase_dir` guard added
- `rcode/workflows/execute-waves.md`, `execute-regression-gates.md`: Python prerequisites note and planning pseudocode quality checklist

### Docs
- `docs/install.md`: Grok and Codex CLI added to IDE table; namespace coexistence and dry-run sections added
- `docs/getting-started.md`: manual invocation note for runtimes without native slash commands

---
## v4.1.1 (2026-06-03) — cross-IDE harness fixes: double-prefix, codex IDE, lifecycle aliases

Patch release shipping the fixes surfaced by cross-IDE (cld/codex/grok/copilot) re-verification of v4.1.0. No breaking changes; drop-in upgrade.

### Fixed

- **agent double-prefix bug (#882)** — `rcode agent rcode-executor` no longer resolves to `rcode-rcode-executor`; already-prefixed names are stripped before re-prefixing.
- **workflow-show prefix resolution (#883)** — `npx rcode workflow show rcode-plan` now resolves correctly; prefixed names are normalised at lookup time.
- **codex IDE support (#883)** — `--ide codex` is now a supported install target; added to `SUPPORTED_IDES`, signal detection, and the install wizard multiselect.
- **lifecycle aliases (#883)** — Thin `rcode plan`, `rcode execute`, and `rcode ship` top-level commands added as aliases that delegate to `workflow show <name>`.

---
## v4.1.0 (2026-05-30) — readiness fixes: fresh-install doctor, uninstall cleanup, CLI polish

Stability and compliance hardening across doctor, uninstall, bash-guard, roster, and skill scaffolding. No breaking changes; drop-in upgrade from v4.0.0.

### Fixed

- **doctor fresh-install command path (#873)** — `rcode doctor` now exits 0 when run from a freshly-installed directory that has never had rcode in it; the manifest compliance check no longer fails on a missing source tree.
- **doctor 5-component enforcement (#874)** — doctor enforces the 5-component SKILL.md standard across all 61 skills and surfaces non-compliant files by name.
- **dogfood phase-derivation for get-phase (#875)** — `scripts/dogfood-check.sh` now validates `roadmap get-phase` against heading-style ROADMAP files, closing a silent pass on malformed phase lookups.
- **uninstall artifact cleanup + --purge (#876)** — `rcode uninstall` reliably removes `.claude/`, `.cursor/`, `.vscode/` artifacts; new `--purge` flag additionally removes `.rcode/` config, state, and brain directories.
- **bash-guard test alignment (#877)** — bash-guard hook test corrected: `/tmp/scratch` (outside `os.tmpdir()`) is now asserted blocked, not allowed, matching the real hook's allowlist.
- **herdr-orchestration SKILL compliance and references split (#878)** — `rcode-herdr-orchestration` SKILL.md trimmed to comply with the 5-component standard; extracted references moved to a new `references.md` sibling file.
- **roster canonicalization and REFERENCE agents section (#879)** — `agent-manifest.csv` de-duplicated and canonicalized to 45 entries; `docs/REFERENCE.md` gains an Agents section with the full roster.
- **CLI/UX polish: --help for set-mode/set-profile, github-sync empty-phases exit (#880)** — `set-mode` and `set-profile` now respond to `--help`; `github-sync` exits 0 with a notice when `phases/` is empty rather than erroring; dashboard stop-help updated from `lsof` to `ss -ltnp` for WSL2 compatibility.

---
## v4.0.0 (2026-05-23) — open-source release, full `rihal` → `rcode` rename

**BREAKING CHANGE.** Hard cutover from the internal Rihal Code brand to the public rcode open-source project. v3.x configs and installations are not auto-migrated. The project is now MIT-licensed and accepts public contributions.

### Renamed

- Source directory `rihal/` → `rcode/`; installed directory `.rihal/` → `.rcode/`
- Binaries `rihal-tools.cjs` → `rcode-tools.cjs`, `rihal-hooks.cjs` → `rcode-hooks.cjs`
- Slash commands `/rihal-*` → `/rcode-*` (116 commands)
- All 45 agent and 85 skill names: `rihal-foo` → `rcode-foo`
- Code identifiers: `RIHAL_DIR` → `RCODE_DIR`, `rihal_source_path` → `rcode_source_path`, `.rihalignore` → `.rcodeignore`
- Brand `Rihal Code` → `rcode` in all prose

Preserved intentionally: `hanzlahabib/rihal-code` GitHub repo URL, `https://rihal.om` (Omani company, unrelated), and the Arabic etymology terms `رحّال` / `طريقة رحال`.

### Added

- **`brain pull`** now works end-to-end against real external GitHub repos. Point `rcode/brain/sources.yaml` at any public or private repo and have its docs land under `.rcode/brain/<dest>/` on every install/update via git sparse-checkout. Verified against `anthropic-quickstarts`. (commit `adf6f7e`)
- **Memory Bank populated with real content** for the rcode project itself: stack, decisions, glossary, stakeholders, milestones, known-issues. Lossless distillates regenerate via `/rcode-memory-distill` — currently ~2.2K tokens combined for the full bank. (commits `da20232`, `817a937`)
- **`mode` field** promoted to top-level of `rcode-tools init` output so workflows do not need to dig into nested `config.*`. (`d4c4a59`)
- **`state set` compatibility shim** routes agent-generated `state set current_phase N` calls to the real `state set-phase` subcommand. (`cdfac2a`)
- **`roadmap update-plan-progress`** now accepts a 1-arg form (phase only) that scans the phase directory and infers progress from on-disk `*-SPRINT.md` / `*-SUMMARY.md` counts. (`cdfac2a`)
- **CI badge** and **MIT license badge** in README.
- **SECURITY.md**, **CODE_OF_CONDUCT.md** (Contributor Covenant 2.1).
- New 6th USP section in `docs/USP.md`: pull any public GitHub docs repo into project context via `sources.yaml`.

### Changed

- README rewritten around solo-build framing, methodology-as-files, and anti-hype honesty. (`c987624`)
- USP corrected: command count `109 → 116`, IDE list now reflects actual `SUPPORTED_IDES` (Claude, Cursor, Gemini, VS Code, Antigravity, Windsurf — no Codex), role breakdown corrected to `16 named personas + 29 workflow specialists`, install time updated from "60 seconds" to measured `~500ms`, "battle-tested production" softened to "dogfooded on real projects". (`f1a8f68`)
- `team.yaml` synced with `rcode/agents/` source: 7 stale orphan entries removed, 2 missing entries added, `utility_agents:` duplicate block deleted. (`f480f11`)
- `listInstalledAgents()` now scans `~/.claude/agents/` (Claude Code install location) instead of the never-populated `~/.rihal/agents/`. (`d4c4a59`)
- `resolveStableSourcePath()` walks candidate dirs (global pnpm/npm, local `node_modules`) before falling back to `process.argv[1]`, so `rcode_source_path` in `config.yaml` survives temp `npx` installs. (`d4c4a59`)
- `state.json` template now seeded with `__PROJECT_NAME__` placeholder substituted from `opts.projectName` during install. (`7af108d`)
- `agent-manifest.csv` scanner now includes the source agents dir so the manifest is never empty on fresh install. (`9f7fa82`)
- `cmdInitState` clears install-stub state entries when a real project init runs. (`aa3dc53`)
- 9 source workflow files migrated from `.planning/config.json` to `.rcode/config.yaml` or `rcode-tools config` subcommand calls. (`c4775c4`)
- `set-phase` deduplicates by `(name, number, id)` match instead of exact-name only, eliminating phantom duplicate phase entries. (`5870210`)
- Health-check workflow Step 8 now prints a visible `SKIP` line for the no-active-phase case and adjusts the denominator instead of silently passing.
- Documentation across `docs/`, `BRAND.md`, `MEMORY_BANK.md`, `MIGRATIONS.md` refreshed for v4 reality. (`6a42bd6`, `d905cb8`)

### Fixed

- **Greedy rename bug**: `rihal-codebase-mapper` had been corrupted to `rcodebase-mapper` by an over-broad `rihal-code → rcode` replacement during the rename batch. Fixed across 33 files. (in `4da7c1e`)
- **Broken `brain pull` sparse-checkout**: `git clone --depth=1 --filter=blob:none --sparse` had an intermittent failure mode where git misread the URL as a local path. Split into `--no-checkout` + `sparse-checkout init` + `set` + `checkout`. (`adf6f7e`)
- 25 source files had stale `/rcode:` colon-prefix slash commands instead of the project-standard `/rcode-` hyphen-prefix. (`11028b1`)
- `rihal-sprint-status` workflow pointed at the non-existent `.rcode/config.json`; now reads `.rcode/config.yaml`. (`662de35`)
- Guarded commit pattern in `new-project.md` no longer emits a false-positive "gitignored" message on the first run. (`8663434`)

### Removed

- All compatibility shims that read or write to legacy `.rihal/` paths. The hard cutover assumed zero existing users; reinstall from scratch if you were on v3.x.
- Stale `_pycache_` directories now in `.gitignore`.

### Migration from v3.x

There is no automatic migration. Steps for a clean re-bootstrap:

```bash
rm -rf .rihal/ .claude/agents/rihal-* .claude/commands/rihal/ .claude/skills/rihal-*
pnpm dlx @hanzlaa/rcode install
```

Your `.planning/` artefacts and Memory Bank under `.rihal/memory/` should be moved to `.rcode/memory/` manually before reinstall if you want to preserve them. The structure is identical; only the parent directory name changed.

### Cumulative commit count since v3.6.20

20 commits, 339/339 tests passing on every commit. Full `git log v3.6.20..v4.0.0` for the audit trail.

---


## v3.6.14 (2026-05-19) — pre-release audit fixes

Patch release closing gaps found during pre-announce audit pass.

- **README accuracy** — corrected agent name `rcode-plan-checker → rcode-sprint-checker`, updated version ref to v3.6.x
- **Workflow health checks** — fixed stale `10 checks` → `9 checks` in `health.md` output format
- **CLI flags** — `rcode --help` and `rcode --version` now correctly alias to `help`/`version` subcommands instead of exiting with error
- **CONTRIBUTING.md** — fixed stale `rcode/agents/team.yaml` path → `rcode/team.yaml`
- **ROADMAP** — filled TBD goals for Phase 20 and Phase 21
- **Commit scopes** — added `orchpanel` and `status` to allowed scopes in AGENTS.md
- **Command @-includes** — corrected `execute-milestone`, `plan-milestone`, `scaffold-milestone` workflow references

---

## v3.6.1 (2026-05-16) — dashboard + CLI gap fixes

Patch release closing the gaps found in v3.6.0 dashboard UAT plus two `rcode-tools`
fixes surfaced while planning a new milestone.

**Dashboard & CLI gap closure (#763–#767)**
- **`/api/clean-sessions` implemented** — the OrchPanel "Clean" button POSTed to a route
  the orchestrator never handled (404). Added the handler: removes ended sessions,
  leaves running ones untouched. (#763)
- **Legacy SPRINT.md task parsing** — the roadmap phase tree only counted `<task>` blocks,
  so pre-`<task>`-format phases (20–30) showed 0 tasks. Added a fallback that parses
  `### Story|Task <id> — <title>` headings. (#764)
- **`phase sync-sprints` command** — planner agents write SPRINT.md files without always
  registering sprint records in `state.json`. New command derives and writes sprint/story
  records from the `.planning/` filesystem deterministically. (#765)
- **`phase complete` command** — `execute.md` called a `phase complete` subcommand that
  never existed (`Unknown phase subcommand`). Added it: marks the phase complete and
  returns next-phase metadata. (#766)
- **CSS cleanup** — dropped 11 unused design tokens; fixed a `letter---spacing` typo
  (an invalid property the browser was silently dropping). (#767)

**CLI fixes (#768–#769)**
- **`phase scaffold-milestone` numbering** — the next phase number was derived from
  ROADMAP.md headings and directory-less `state.json` entries, so scaffolding skipped
  past an already-written roadmap range (e.g. created phases 38–41 for a 34–37
  milestone). It now numbers from phase directories only, reconciles phantom state
  entries instead of aborting, and skips appending a duplicate roadmap stub when the
  phase section already exists. (#769)
- **`plan check-wave-overlaps`** — the subcommand was referenced by the plan workflow's
  wave-parallelism gate but never implemented, so the gate silently no-opped. Added it:
  it detects same-wave plans that share a `files_modified` path without being marked
  `sequential` and returns a structured conflict report. (#768)

---

## v3.6.0 (2026-05-16) — dashboard revamp: Preact migration, theming, command runner

A major revamp of the Majlis dashboard across three phases (31–33), plus a sweep of
in-browser bug fixes from UAT.

**Preact migration (Phase 31)**
- Rebuilt the entire dashboard client as Preact components via `htm` + ESM CDN imports — no build step
- All 12 views migrated; the 3 legacy string-concatenation render modules deleted
- xterm.js terminal wrapped as a Preact component, not replaced

**Theming (Phase 32)**
- Single design-token layer (color, spacing, typography, radii) driving both light and dark themes
- Every emoji-as-icon replaced with inline SVG icons — 35-icon Lucide-style set

**Command runner (Phase 33)**
- Run `init` and other safe rcode commands from the dashboard UI via the orchestrator
- Server-side command allowlist as the security boundary; `dashboard.js` stays view-only

**Dashboard fixes**
- Roadmap derives the phase/sprint/task tree from the `.planning/` filesystem — accurate counts regardless of `state.json`
- Phase/sprint Run buttons carry the correct id; Run is gated on sprint-plan existence
- Milestone-level Run All + Audit actions; empty phases/sprints surface create/plan command hints
- Fixed: htm fragment crash, `esm.sh` import errors, intermittent zero counts on refresh

---

## v3.5.0 (2026-05-15) — audit gap closure: hooks, security, marketability

A three-phase release closing gaps found auditing rcode against the `everything-claude-code` reference setup, plus a security and marketability self-audit. Covers GitHub issues #742–#762.

**Hooks & infrastructure (Phase 28)**
- Lifecycle hooks expanded to 8: added `bash-guard` (blocks unapproved `git push`, `--force`, `--no-verify`, `rm -rf`), `pre-compact`, `stop-verify`, `cost-track`, `compact-nudge`
- Agent-behavior regression harness — snapshot + diff on skill changes, wired into `dogfood-check.sh`
- zod artifact-schema validation for SKILL.md / agent / `state.json`, enforced by `cli/doctor.js`
- Bounded iterative-retrieval loop for research subagents

**Security hardening (Phase 29)**
- Closed an unauthenticated network-reachable RCE in the orchestrator (127.0.0.1 bind, per-session auth token, path-traversal guard)
- Hardened `bash-guard` against token-smuggling and `+`-refspec push bypasses
- Scoped `post-commit` file reads; de-shelled `rcode-tools` git calls

**Marketability (Phase 30)**
- Adopted the MIT license (resolves the prior `UNLICENSED` + public-npm contradiction)
- README cut 535 → ~180 lines; metadata counts reconciled (45 agents, 116 commands, 85 skills, 126 workflows)
- Onboarding clarified; differentiation table and worked example added

**Test suite:** 341 tests, all passing.

---

## v3.4.33 (2026-05-11) — code-review dispatch fix (closes #720)

`/rcode-review` was crashing with `Agent type 'rcode-review-adversarial-general' not found`. The step-02 dispatch text said "Invoke via the rcode-review-adversarial-general skill" — but that name exists as a **skill** in `rcode/skills/core/`, not a subagent. The surrounding "Launch parallel subagents" instruction made the AI dispatch `Task(subagent_type=X)` which failed.

Three reviewer roles now dispatch to actual agents in `rcode/agents/`:
- Blind Hunter → `rcode-security-adversary`
- Edge Case Hunter → `rcode-edge-case-hunter`
- Acceptance Auditor → `rcode-reviewer`

Wording also switched from ambiguous "Invoke via the X skill" to explicit `Task(subagent_type=...)` so future readers can't mis-dispatch.

---

## v3.4.32 (2026-05-11) — milestone discipline (closes #718)

Two gaps surfaced by audit-style outputs that produced `A1-A7` / `B1-B5` phase IDs:

- **Phase IDs unenforced** — `/rcode-plan` and `/rcode-audit-milestone` freestyled. rcode's actual convention (integer or decimal-subphase) was undocumented + unvalidated.
- **Milestone closure never prompted** — `/rcode-add-phase` happily appended phase #25 under M1 without nudging toward `/rcode-complete-milestone`. rcode's own state.json hit 25 open phases dogfooding the bug.

3 new `rcode-tools` subcommands: `validate-phase-id`, `validate-roadmap`, `milestone-health`. Workflow wiring in `add-phase.md` + `status.md`. Convention pinned in `rcode/references/phase-id-conventions.md`. 14 new tests, 273/273 passing.

---

## v3.4.31 (2026-05-08) — picker footprint trim (closes #710)

Users hit "Skill listing will be truncated — 491 descriptions dropped" on every Claude Code session because rcode shipped 85 skills with **zero** marked `internal: true`. Every action skill was picker-visible even though they're invoked via slash commands.

- **fix(skills):** Mark all 37 `rcode/skills/actions/**/SKILL.md` as `internal: true`. They route to `.rcode/skills/` (private) instead of `.claude/skills/` (picker). Slash dispatch unchanged.
- **fix(skills):** Trim `SIDEBAR_COMMANDS` from 43 → 10 daily-driver entries. Niche commands (`prfaq`, `ui-phase`, `forensics`, `map-codebase`, etc.) stay reachable via `/` autocomplete; they just don't claim sidebar slots.

**Picker footprint: 82 → 57 entries (-30%).** Combined with `/plugins → uninstall` for any unused plugins (vercel adds 42 alone), most users drop below the truncation threshold without raising `skillListingBudgetFraction`.

---

## v3.4.30 (2026-05-08) — regression tests for batch 5 (closes #708)

17 new tests pinning every batch-5 fix so the same bugs can't silently regress. Test totals: 242 → 259 passing.

- 5 tests for `rcode update` YAML config handling (#701)
- 9 tests for install manifest, sweep path-traversal guard, _seeded_stub guard, brain-pull timeout (#702/#703/#705/#706a)
- 3 tests for vscode/gemini coverage in planToPathList (#706b)

Each test names the issue it pins and emits a "regression of #N" marker so future refactors get a CI failure pointing at the original ticket.

---

## v3.4.29 (2026-05-08) — install/uninstall/update batch 5 (closes #701-#706)

Post-fix audit found 5 still-real critical issues that 8 rounds of fixes had missed. All shipped.

- **fix(update):** `rcode update` was broken end-to-end — read `.rcode/config.json` and `JSON.parse`d it, but installer writes `.rcode/config.yaml` (#701). Switched to YAML parser; `detectInstalledEditors` falls back to `~/.claude/skills/` for post-#679-dedup case; surgical `setYamlKey` preserves comments + ordering.
- **fix(install):** `files-manifest.csv` was generated BEFORE `installSkills`, so 100+ skill files never entered the manifest — orphan sweep + doctor drift detection blind to renamed/removed skills (#702). Manifest write moved to AFTER all skill installations; new `extraScanDirs` option walks `.claude/skills/` and `.rcode/skills/`.
- **fix(install):** `sweepStaleInstalledFiles` called `fs.rmSync(path.join(target, rel))` with `rel` from the user-readable CSV — a `../../etc/passwd` entry could escape project root (#703). The whole point of #688's `safeRmSync` was bypassed in the most exposed code path. Now routes through `safeRmSync(full, targetRoot)` with a pre-check that rejects `..` segments.
- **fix(uninstall):** Backup tarball excluded flat `.claude/commands/rcode-*.md` files (#704). Only the legacy `.claude/commands/rcode/` subdir was added; modern claude installs (post-#697) had every slash command missing from the rollback. `planToPathList` now disambiguates by `rcode-` prefix.
- **fix(install):** `_seeded_stub:true` was seeded into state.json even when `.planning/ROADMAP.md` already had real (non-stub) phases (#705). User who manually deleted state.json had their real project mis-classified as fresh on re-install. Guard checks ROADMAP for the `INSTALL STUB` banner.
- **fix(install,uninstall):** brain-pull `execFileSync` had no timeout — slow URL hung install indefinitely (#706a). Added `timeout: 60_000`. Plus `cli/uninstall.js` had no branches for `vscode` or `gemini` despite SUPPORTED_IDES listing both (#706b) — added marker-dir cleanup for vscode and `.gemini/rcode/{agents,commands}` removal for gemini.

**Net: 242/242 tests passing. Every critical from the post-fix audit closed.**

---

## v3.4.28 (2026-05-07) — green test suite (closes #698)

- **fix(test):** Make pre-existing test failures aware of the #679 dedup reality. After globals shadow project skills, tests that count `./.claude/skills/` etc. would erroneously fail with "0 found". Fall back to `~/.claude/` mirroring the runtime behavior. Touches `agent-size-budget`, `skill-description-budget`, `help-md-parity`, `no-absolute-home-paths`.
- **fix(lib/manifest):** `verifyClaudeInstall` had a pre-existing bug where the actions filter `!n.startsWith('rcode-')` excluded ALL real installed actions (since `installSkills` prefixes every action with `rcode-`). Rewrote to compare against the prefixed package set directly. Drift detection now actually works.
- **fix(test):** `manifest.test.cjs` was seeding `.claude/skills/rcode-X` for agents — but the post-v3 layout puts agents at `.claude/agents/rcode-X.md`. Updated the two drift tests to match.
- **feat(lib/manifest):** Added `{ globalFallback: false }` option to `verifyClaudeInstall` so tests can isolate from the contributor's real `~/.claude/`. Default remains true to preserve runtime behavior.
- **fix(test):** `no-source-command-skill-dupes` now exempts the 6 phase-flow commands (`rcode-sprint-planning`, `rcode-dev-story`, etc.) that legitimately ship as both real skills and sidebar entries — matching the generator's runtime behavior.
- **fix(meta):** AGENTS.md + CONTRIBUTING.md scope lists synced. New scopes added: `build`, `council`, `doctor`, `postinstall`, `progress`, `security`, `test`, `tools`, `uninstall` (all already used in commits).

**Net: full suite goes from 231/241 → 241/241 passing.**

---

## v3.4.27 (2026-05-07) — install/uninstall batch 4 (closes #696 #697)

- **test(uninstall,postinstall,update):** 38 new tests for the previously-untested CLI modules (#696). Closes Wave 3 W3.2/W3.3/W3.4 from `.planning/INSTALL-AUDIT-STATUS.md`. Refactors three files for testability: `cli/postinstall.js` now wraps top-level effect in `require.main === module` so importing it doesn't fire the postinstall logic; `cli/uninstall.js` extracts the gitignore-strip regex into pure `stripRcodeGitignoreBlock`; `cli/update.js` adds named exports for `parseArgs` and `detectInstalledEditors`.
- **refactor(install,uninstall):** Single `SUPPORTED_IDES` source of truth (#697). Promotes the canonical IDE list to a frozen module-level constant in `cli/install.js`, exported and imported by `cli/uninstall.js`. Drift guard test fails CI if anyone re-introduces a local copy or a hardcoded literal of the same shape.

12 + 14 + 12 + 4 = 42 new tests covering every fix from Wave 1+2 plus the post-fix coverage gaps.

---

## v3.4.26 (2026-05-07) — hotfix

- **fix(build):** Replace dynamic `require(path.join(__dirname, 'lib', X))` with static `require('./lib/X.cjs')` so esbuild resolves them at bundle time. 3.4.24 + 3.4.25 shipped a bundle that hit `MODULE_NOT_FOUND` at runtime when `npm exec`-launched (the bundled `dist/rcode.js` has no `lib/` siblings). Static paths fix all three sites (install.js × 2, uninstall.js × 1).

---

## v3.4.25 (2026-05-07) — install/uninstall batch 3 (closes #691 #692 #693 #694)

- **fix(install):** PID-based exclusive lock at `.rcode/.install.lock` (#691). Concurrent installs no longer corrupt the manifest. Stale locks (dead PID) auto-reclaimed; live locks exit 3 with a clear message and the lock path.
- **fix(install):** Honor wizard's IDE selection — no double-prompt (#692). `resolveIde` early-returns if `opts.ides` is already set; wizard now also seeds `opts.ide` and `opts.ideProvided` to fix the field-shape drift between the singular and array forms.
- **fix(uninstall):** Dynamic `KNOWN_ACTION_SKILLS` + IDE list parity with installer (#693). The hardcoded 23-entry list was 14 entries behind the source; now derived from `cli/lib/manifest.cjs` at runtime (37 actions). Editor list now matches installer's surface (claude/cursor/gemini/vscode/antigravity), so users with vscode-installed rcode can finally `rcode uninstall`.
- **test(install):** First batch of integration tests (#694). 12 new tests covering `safeRmSync` (#688), atomic state writes (#687), `--reset` fail-fast (#680), idempotency, and the install-lock behavior (#691). Spawn-based — catches bundler-skew issues like the 3.4.22 stale-dist regression.

---

## v3.4.24 (2026-05-07) — install/uninstall safety batch 2 (closes #687 #688 #689)

- **fix(install):** Use `writeFileAtomic` for state.json, config.yaml, .gitignore, and pre-commit hook (#687). 11 critical writes converted; Ctrl+C / OOM / disk-full mid-write no longer truncates user state or silently destroys lines below the rcode .gitignore block.
- **fix(install,uninstall):** Symlink-traversal guard on `fs.rmSync` (#688). New `safeRmSync` helper refuses to recurse into a top-level symlink and refuses paths whose realpath escapes the project root. 7 call sites converted across install.js and uninstall.js. Verified: `rcode uninstall --purge` with `.planning` symlinked to `/tmp/outside` leaves the target intact.
- **fix(install):** Health-check thresholds derive from the package manifest (#689) instead of hardcoded `<20`. Skills count gets a global fallback to mirror the agents/commands fallback (#664/#666/#669) — necessary now that #679 dedup means project skills folder may have only sidebar stubs while `~/.claude/skills/` holds the real ones.

---

## v3.4.23 (2026-05-07) — hotfix

- **fix(build):** Add `prepack` lifecycle script so `npm publish` always rebuilds `dist/rcode.js` from current `cli/` source. 3.4.22 shipped a stale `dist/` (built from an older checkout), so the slash-picker dedup fix in #679 was not actually delivered to npm users. 3.4.23 has the correct bundle.

---

## v3.4.22 (2026-05-07)

### Install / uninstall / update flow audit — Wave 1+2 (closes #679 #680 #681 #682 #683 #684 #685)

User-blocking fix:

- **fix(install):** skills/ dedup — picker no longer shows /rcode-* twice (#679). When `~/.claude/skills/<name>` exists, project install skips writing the same skill (and its sidebar stub) under `.claude/skills/`. Verified: 0 overlap on a fresh install where 119 global rcode skills exist. `*.local.md` overrides always preserved.

UX correctness:

- **fix(install):** `--reset` alone now fails fast (exit 2) instead of silently doing nothing (#680). `--reset` requires `--force` to confirm the destructive intent.
- **feat(state):** `_seeded_stub:true` auto-clears on project graduation (#681). `writeState()` drops the marker once the project has REQUIREMENTS.md or a real phase. New `state clear-stub` subcommand for explicit clearing from `/rcode-new-project`.
- **docs(cli):** Normalize package name to `@hanzlaa/rcode` in JSDoc headers (#682). 16 stale `@hanzlahabib/rihal-code` references replaced. `cli/nuke.js` keeps both names for legacy migration.

Safety / data-loss fixes:

- **fix(uninstall):** `--purge` backup now includes `.rcode/` + `.planning/` (#683). The previous backup tarball excluded the very directories `--purge` deletes, plus the tarball itself was written into `.rcode/backups/` and got nuked seconds later by the rmSync of `.rcode/`. Backup now writes to `.rcode-backups/` (sibling) when purging and includes `.rcode/<every entry except backups>` plus `.planning/`. Verified `state.json` and `PROJECT.md` are restorable from the post-purge tarball.
- **fix(uninstall):** Tighten `.gitignore` strip regex — no longer eats user comments (#684). The legacy `# rcode[\s\S]*?` pattern matched any user line starting with `# rcode` and greedily consumed up to the next blank line, silently nuking user content. New regex requires both the `===== rcode-managed gitignore block =====` opener AND closer.
- **fix(install):** Keep `commit_planning` in `config.yaml` in sync with `.gitignore` on re-install (#685). Re-install previously rewrote `.gitignore` from the new prompt answer but preserved the old `config.yaml`, leaving two sources of truth. `resolveCommitPlanning` now reads existing config as default; surgical key update on actual change.

---

## v3.4.21 (2026-05-07)

### Fixes carried over from 3.4.20 main (commit b3428c1 missed the 3.4.20 release window — closes #677)

- **fix(install):** health check + summary respect global precedence (#664, #666, #669) — when project install removes local agent/command copies in favor of `~/.claude/` globals, the summary and verifier now fall back to counting from `~/.claude/agents/` and `~/.claude/commands/` instead of reporting `0`.

### `/rcode-new-project` first-run gaps (closes #670 #671 #672 #673 #674 #675 #676)

- **fix(install):** `seedStarterPlanning()` no longer pre-seeds `.rcode/state.json` with a fake `Setup & Scaffolding` phase (#670). State is seeded as `{_seeded_stub: true, project: null, phases: []}` so Step 0.5 can detect the stub.
- **fix(install):** stub `.planning/PROJECT.md`, `ROADMAP.md`, `STATE.md` now carry an `INSTALL STUB` HTML banner so users (and downstream tooling) can tell them apart from real planning artifacts (#676).
- **fix(workflows):** `/rcode-new-project` Step 0.5 rewritten with stub-vs-real classification (#671). Real-project signals: `REQUIREMENTS.md`, `research/`, >1 phase, or first-phase-name ≠ "Setup & Scaffolding".
- **feat(workflows):** `/rcode-new-project` accepts `--force` / `--reinit` (#672). Creates a `pre-rcode-rewrite-<timestamp>` git tag for rollback before overwriting.
- **fix(workflows):** Step 0.5 error message now lists the escape hatches: `--force`, `rcode install --reset` (#673).
- **fix(workflows):** `--auto` no longer blocked on stub state (#674) — the new stub classification proceeds without prompting.

---

## Unreleased — post v3.4.4 (2026-04-27 → present)

50 commits since v3.4.4. Grouped by area.

### Dashboard (Phases 20–21)
- **fix(dashboard):** phase 20 UX quick-wins — remove sidebar file tree, add empty states with `/rcode-plan` hints, deduplicate `/api/files` fetch (`125ebff`)
- **fix(dashboard):** phase 21 data pipeline — decimal phase IDs (split `.` before `padStart`), SPRINT.md fallback task parser, `String()` coercion on phase ID comparisons (`c0d681b`)
- **feat(dashboard):** add phases 20–21 in ROADMAP and state (`6a082f5`)

### Plan / Tools (`rcode-tools.cjs`)
- **fix(plan,tools):** researcher skip when CONTEXT.md exists (`--research` to force), ghost phase number sanity guard, two-layer gitignore commit guard — closes #588 #583 #566 (`20c3a3e`)

### Lens Audit
- **feat(lens-audit):** rewrite `lens-audit.md` — all 15 lenses dispatched via skill subagents (`3031b2b`)
- **feat(skills):** add 4 gap audit skills for lenses 5, 8, 10, 13 (`a1a7370`)
- **feat(workflows):** add 15-lens audit workflow + wire into `/rcode-audit` (`66ccd33`)

### Config / State
- **feat(config):** `state migrate-schema` subcommand normalises phases to current schema — closes #558 (`79b0d27`)
- **fix(config):** phase transition guards in `begin-phase` and `complete-phase` — closes #559 (`3ba0b6d`)
- **fix(config):** read `commit_docs` from both bare and `git.commit_docs` keys — closes #511 (`93505bd`)

### Workflow Resilience & Error Handling
- **fix(workflows):** add `.ok` guard after `INIT` in 7 workflows — closes #518 (`8728330`)
- **fix(workflows):** add partial panel failure handler in council Round 1 — closes #556 (`ae96ed3`)
- **fix(workflows):** all-fail fallback in `discuss-phase` advisor_research — closes #555 (`37515fb`)
- **fix(workflows):** Task() failure handler in import sprint-checker step — closes #554 (`3adf7bf`)
- **fix(workflows):** cap `SUMMARY.md` reads in `complete-milestone` evolve step — closes #512 (`ec0f50e`)
- **fix(workflows):** cap SPRINT.md find with `maxdepth 5 + head -50` in forensics — closes #517 (`5b0e4c8`)
- **fix(workflows):** `sprint-status.md` guard 3 state calls with `2>/dev/null` — closes #557 (`a438888`)

### Workflow Consistency & i18n
- **fix(workflows):** add `response_language` handling to 8 subagent-spawning workflows — closes #560 (`6fc849b`)
- **fix(workflows):** standardize `PHASE_NUM → PHASE_NUMBER` — closes #523 (`84ad704`)
- **fix(workflows):** add `2>/dev/null` guards to top 10 unguarded rcode-tools calls — closes #516 (`de55229`)
- **fix(workflows):** enforce `MAX_PASSES` cap in `discuss-phase` loop — closes #534 (`19215e8`)
- **fix(workflows):** replace stale `PLAN.md` refs with `SPRINT.md` in 6 workflows — closes #522 (`271dda9`)
- **fix(workflows):** add `done_field_protocol` to executor prompt in `execute.md` — closes #514 (`a3bd4d1`)
- **fix(workflows):** add Next Up footers to 17 dead-end workflows — closes #513 (`613d978`)
- **fix(workflows):** add `<purpose>` block to 5 workflows + lock with parity test (`a366417`)
- **fix(workflows):** macOS compat — `stat -c` fallback, `readlink -f` fallback, `mapfile→while-read` — closes #564 (`177c3e6`)
- **fix(workflows):** session-report.md broken nested command substitution + `date -d` — closes #565 (`e4a04f2`)
- **fix(workflows):** close dead-end, broken-ref, and orphan gaps — phase 17 (`da5bf5a`)

### Templates & References
- **fix(templates):** add YAML frontmatter to `summary.md` template; fix `PLAN.md → SPRINT.md` — closes #510 (`dcf66b3`)
- **fix(references):** add RTL/Arabic output safety guidance to `output-format.md` — closes #561

### Agents & Skills
- **fix(agents):** create `rcode-deviation-analyzer` skill stub — closes #515 (`ec882e3`)
- **fix(skills):** close 19 agent persona name/dir mismatches (`f1b30ac`)
- **fix(agents):** normalize 7 non-standard colors to safe palette (`8de6220`)
- **feat(skills):** add 4 gap audit skills for lens-audit lenses 5, 8, 10, 13 (`a1a7370`)

### Commands & GitHub
- **feat(commands):** add `/rcode-capture` + `/rcode-phase` unified entries — refs #484 (`e10a567`)
- **feat(github):** require-issue-link CI gate — flag PRs without `Closes/Refs/Fixes #N` (`281429d`)

### Performance
- **perf(plan,autonomous):** 3 token-burn guards — sprint cap, revision limit, `/clear` offer (`6ee9f1a`)

### Docs
- **fix(docs):** `getting-started.md` replace stale `git clone + install-v2.js` path — closes #531 (`4d22cc4`)
- **fix(docs):** update `install.md` version `v2.1.0 → v3.4.4` — closes #527 (`842a7f6`)

---

## v3.4.4 — current pinned version (2026-04-27)

Release-train backfill — entries for v3.3.1 → v3.4.4 captured below as a block. Each `chore(release):` commit was a bump-only ship; the underlying changes landed in the feature/fix commit between bumps.

### v3.4.4 (commit `714369f`)
- Bump-only release.

### v3.4.3 (commit `3c89802`) — preceded by `c5eeac4`
- **fix(cli):** handle multi-IDE array in buildInstallPlan.

### v3.4.2 (commit `d208f26`)
- Bump-only release.

### v3.4.1 (commit `7d16b83`) — preceded by `615a17b`
- **fix(refs):** migrate `rcode:command` to `rcode-command` slash syntax.

### v3.4.0 (commit `cc5b46a`)
- **feat(cli):** multi-IDE install, dashboard phase browser, agent cards. Detects every Claude Code-compatible IDE on the machine and offers an install picker.

### v3.3.2 (commit `12aaca6`) — preceded by `3eb9fa5`
- **fix(workflows):** resolve three autonomous-execution bugs (#454).

### v3.3.1 (no separate release commit found in main; npm version exists)
- Likely shipped from a tag-only push or hotfix branch. No content delta in source between v3.3.0 and v3.3.2.

---

## v3.3.0 — sidebar discoverability: install-time skill stubs for slash commands (2026-04-27)

VS Code's Claude Code extension only lists `.claude/skills/` in its sidebar — slash commands at `.claude/commands/rcode/` are reachable only via the `/` autocomplete picker. Users expected `rcode-do` to appear in the sidebar alongside other rcode skills.

This release closes the gap **without duplicating files in the source codebase** — sidebar stubs are generated only at install destination.

### Added

- **`cli/generate-command-skills.cjs`** — install-time generator that creates `.claude/skills/rcode-<cmd>/SKILL.md` for a curated list of 28 user-facing commands (`do`, `status`, `progress`, `next`, `plan`, `execute`, `council`, `discuss`, `ship`, `audit`, `verify-phase`, `verify-work`, `note`, `add-todo`, `check-todos`, `pause-work`, `resume-work`, etc.). Each stub:
  - Has `generated: true` and `generated-by: rcode-install-vX.Y.Z` frontmatter so the next install can refresh it idempotently
  - Includes a prominent `<!-- AUTO-GENERATED — Do NOT edit -->` HTML comment
  - Points the user at the source of truth (`rcode/commands/<cmd>.md` and `rcode/workflows/<cmd>.md`)
  - Skipped automatically when a real skill with the same name already exists (e.g. `rcode-debug`, `rcode-review`)
- **`test/no-source-command-skill-dupes.test.cjs`** — guards the source codebase from accidentally introducing the very duplication this generator solves at install time. Catches if a future PR ships a `rcode-do` skill folder that would shadow the generated stub.

### Fixed

- Issue users reported after upgrading to v3.2.1: VS Code sidebar didn't list `rcode-do` even though the command existed. Now it appears as a sidebar skill stub, sourced from the same single command file.

### Counts

- 132 passing tests (was 130; +2 dedupe guards)
- 80 skills in source + 26 sidebar stubs at install destination = **106 skills visible in VS Code sidebar after install**
- 95 slash commands (unchanged — the source of truth for invocation behaviour)

### Honesty about the duplication

The stubs ARE duplicates of the slash commands in a sense — they invoke the same workflow files. The difference: they live ONLY at the install destination (`.claude/skills/`), never in the rcode source tree (`rcode/skills/`). One source of truth per command + a generated sidebar entry, refreshed every install. CI test #no-source-command-skill-dupes prevents anyone from sneaking duplicate source folders past review.

---

## v3.2.1 — VS Code + Antigravity end-to-end install paths (2026-04-27)

Patch for v3.2.0 — selecting VS Code or Antigravity from the install menu now actually completes the install instead of erroring with "not supported".

### Fixed

- **`--ide vscode`** now routes through `getPathsForIde()` to install at `.claude/agents/`, `.claude/commands/rcode/`, and `.claude/skills/` (where the Claude Code / Continue / Copilot extensions read from). User-visible: install completes; the user-facing notice reads "VS Code → installing to .claude/ paths".
- **`--ide antigravity`** routes to `.antigravity/rcode/{agents,commands}/`, mirroring the `.gemini/rcode/` layout. Marked experimental — the user is told at install time that Antigravity's plugin protocol is still firming up and they may need to adjust paths via `.rcode/config.yaml`.
- **Health check** at end of install now reads from the IDE-specific install paths (was hardcoded to `.claude/`). Cursor / Gemini / VS Code / Antigravity installs no longer false-fail the agent / command counts.
- **IDE-validation list** in `cli/install.js` extended to include `vscode` and `antigravity` so explicit `--ide vscode` / `--ide antigravity` flags pass validation.

### Verified

- `node dist/rcode.js install /tmp/test-vscode --ide vscode --yes` → 41 agents + 80 skills + 95 commands, health check ✓
- `node dist/rcode.js install /tmp/test-anti --ide antigravity --yes` → 41 agents + 80 skills + 95 commands at `.antigravity/rcode/`, health check ✓
- 130 tests still passing

---

## v3.2.0 — install UX overhaul: arrow-key prompts, two new IDEs, interactive upgrade resolver (2026-04-27)

Closes the 5 install-UX bugs (#449–#453) from the v3.1.0 user feedback session. The headline win is upgrade ergonomics — the wall of `differs from package version` warnings is gone, replaced by a categorised summary and an interactive per-file resolver.

### Added

- **VS Code** as a first-class IDE target — detected via `.vscode/`, `~/.vscode/`, `~/.config/Code/`, `VSCODE_PID` env. Installs alongside Claude Code if both are present.
- **Antigravity** as an experimental IDE target — detected via `.antigravity/` and `~/.antigravity/`.
- **Interactive upgrade resolver** in `cli/install.js` — when conflicts are detected on upgrade, the installer offers three paths via `@clack/prompts`:
  - **Review each one** (default) — per-file: see diff stats, choose take-upstream / keep-local / view-full-diff
  - **Take vX.Y.Z for all** — single bulk override
  - **Keep my local edits** — current behaviour (skip upstream updates)
  Replaces the previous all-or-nothing `--force-overwrite` choice. (#453)

### Changed — install prompts

- **Arrow-key navigation** for IDE selection and gitignore-planning prompts. Uses `@clack/prompts` instead of Node's built-in readline; adds Ctrl-C handling. (#449)
- **Categorised conflict summary** — instead of 44 lines of `differs from package version`, the installer now prints one summary line per category (workflows / agents / commands / skills / references) and surfaces the choice via the interactive resolver above. (#451)
- **Visual separation** between prompt phase and install phase — clarifies that conflicts are unrelated to the user's gitignore-planning choice. (#452)

### Affected files

- `cli/install.js` — replaced 2 readline prompt blocks with `@clack/prompts` calls; added VS Code + Antigravity detection signals; replaced per-file diff warnings with buffered conflict array + interactive resolver
- `package.json` — version bumped, description updated to mention new IDE targets
- `DOCS.md` — Troubleshooting section adds the new upgrade flow + manual workaround for v3.1.0 and earlier

### Notable

- Falls back to the previous behaviour when stdout is not a TTY or `--yes` is passed (CI-friendly).
- `--force-overwrite` still works for users who want the legacy all-or-nothing path.
- Test suite unchanged at 130 cases — install UX paths are interactive and CI-skipped.

### Issue links

- #449 — readline → `@clack/prompts`
- #450 — VS Code + Antigravity IDE targets
- #451 — warning overload → categorised summary
- #452 — gitignore prompt vs warnings cognitive conflation
- #453 — interactive upgrade resolver (the umbrella)

---

## v3.1.0 — pipeline integrity audit: 9 silent-malfunction bugs fixed (2026-04-27)

Patch release closing the 9 bugs surfaced during the 2026-04-27 pipeline integrity audit (see [`docs/audits/2026-04-27-pipeline-integrity.md`](docs/audits/2026-04-27-pipeline-integrity.md)). All 9 issues affected silent runtime behaviour — the test suite at v3.0.0 didn't catch them because tests cover rcode source invariants, not target-project runtime. Issue range: #440–#448.

### Fixed — agent runtime

- **#440 / #445 (CRITICAL):** 10 agents declared tools using Gemini-style snake_case names (`read_file`, `run_shell_command`, etc.). Claude Code silently rejected these — agents narrated what they would do without invoking any tool. Affected: `rcode-sprint-checker`, `rcode-verifier`, `rcode-codebase-mapper` (Dalil), `rcode-integration-checker`, `rcode-roadmapper`, `rcode-advisor-researcher`, `rcode-assumptions-analyzer`, `rcode-phase-researcher`, `rcode-project-researcher`, `rcode-research-synthesizer`. All renamed to PascalCase (`Read`, `Bash`, `Grep`, `Glob`, `Write`, `WebFetch`, `WebSearch`).
- **#440 (defence):** `plan.md` now refuses to advance plans on empty sprint-checker output. Sprint-checker MUST emit YAML evidence markers (`issues:`, `verified_files:`, file:line refs) — empty narrative output is treated as malfunction, not pass.

### Fixed — workflow correctness

- **#441:** Planner now verifies every file in `files_modified` actually exists on disk before committing it to a plan. Plans referencing fictional file names are rejected.
- **#442:** New `12.5. Wave Parallelism File-Overlap Check` in `plan.md`. Calls `rcode-tools plan check-wave-overlaps`; auto-corrects same-wave plans with overlapping files to `sequential: true`.
- **#443 / #448:** New `executed` → `complete` state transition. Phase moves to `executed` after work is done; only a passing VERIFICATION.md promotes to `complete`. `/rcode-next` refuses to advance from `executed`. Closes the gap where phases reached `complete` without UAT.
- **#446:** Removed `git commit --no-verify` recommendation from parallel-execution mode in `execute.md`. AGENTS.md forbids `--no-verify`. Replaced with file-based commit lock (`.rcode/.commit-lock`) so hooks run normally per commit.

### Fixed — documentation drift

- **#444:** `.planning/` gitignore + `git add -f` constraint now documented in `rcode-executor.md` so every executor session loads it. Prevents silently-dropped SUMMARY.md commits.
- **#447:** 9 legacy core skills now declare `## Memory Bank Hooks` (matching the post-Phase-3 5-component standard): `rcode-init`, `rcode-help`, `rcode-index-docs`, `rcode-shard-doc`, `rcode-party-mode`, `rcode-brainstorming`, `rcode-editorial-review-prose`, `rcode-review-adversarial-general`, `rcode-review-edge-case-hunter`.

### Added — regression-prevention tests (4 new test files, +10 cases)

- `test/agents-tool-conventions.test.cjs` — asserts every agent uses Claude Code PascalCase tool naming
- `test/skills-memory-hooks.test.cjs` — asserts every core SKILL.md has a non-empty `Memory Bank Hooks` section
- `test/workflows-no-verify.test.cjs` — scans for `--no-verify` recommendations (allowing negative-form prohibitions)
- `test/workflows-state-gating.test.cjs` — asserts `execute.md` has the UAT gate, `plan.md` has the sprint-checker malfunction guard and wave-overlap check

Test suite: **120 → 130 cases**, all green.

### Audit artefact

- [`docs/audits/2026-04-27-pipeline-integrity.md`](docs/audits/2026-04-27-pipeline-integrity.md) catalogues the 5 anti-patterns found and prescribes detection commands for each.

### Counts after this release

- 130 passing tests (was 120) — added 10 new regression cases
- 80 skills (unchanged)
- 45 agents (unchanged)
- 95 slash commands (unchanged)
- Zero runtime dependencies preserved

---

## v3.0.0 — rcode improvement programme: Memory Bank, brand vocab, engineering + real-pain skills (2026-04-26)

The largest single delta since v2.0. 10 phases, 80+ commits, 19 new skills, comprehensive test coverage. See [`MIGRATIONS.md`](MIGRATIONS.md) for the upgrade path and [`TASKS.md`](TASKS.md) for the work log. Issue history: #386–#439.

### Added — `Memory Bank` primitive (Phase 3)

Persistent, structured, checked-in project context. `.rcode/memory/` directory with project, people, milestones, incidents, change-records, and distillates subdirectories.

- `rcode-memory-init` skill — bootstrap a Memory Bank for an existing project
- `rcode-memory-update` skill — surgical update from conversation context
- `rcode-memory-distill` skill — regenerate token-optimised distillates
- `rcode-memory-audit` skill — find stale entries and contradictions
- 4 slash commands: `/rcode-memory-init`, `-update`, `-distill`, `-audit`
- 13 template files at `rcode/templates/memory/`
- Diwan dashboard `/api/memory` endpoint + `/memory` view (additive to `server/lib/*`)
- `MEMORY_BANK.md` specification at repo root

### Added — Engineering rigour skills (Phase 11, 11 skills)

Stack-grounded for Next.js 16, React 19, Strapi, Postgres, Three.js, Sentry, Temporal, Helm/K8s.

- `rcode-incremental` — atomic, verifiable shipping
- `rcode-prove-it` — TDD with Jest + Playwright + node:test
- `rcode-source-truth` — cite official docs before code
- `rcode-browser-verify` — Chrome DevTools MCP for runtime verification
- `rcode-debug` — root-cause debugging via the scientific method
- `rcode-trim` — code simplification (no behaviour change)
- `rcode-harden` — security checklist for SaaS auth/tenant patterns
- `rcode-perf` — performance optimisation per stack layer
- `rcode-git-flow` — branching aligned with Epic→Feature→Task hierarchy
- `rcode-ci` — Helm + K8s + Docker Compose quality gates
- `rcode-migrate` — MVP-to-production transitions

### Added — Real-pain skills (Phase 12, 8 skills)

Encoded from verified rcode incidents — no other tool has these because they require the scars.

- `rcode-auth-audit` — Keycloak ↔ AD sync verification, JWT validation, tenant isolation
- `rcode-deploy-unify` — multiple-deploy-paths detection (Siraaj incident)
- `rcode-ocr-consistency` — OCR pipeline determinism + ground-truth validation
- `rcode-theme-system` — design token audit before launch (rebrand incident)
- `rcode-mvp-graduate` — MVP-to-production strategic plan with stakeholder sequencing
- `rcode-client-gate` — client requirement freeze gates and async-comm patterns
- `rcode-rebrand` — stack-wide rebranding migration (9 surfaces)
- `rcode-incident-record` — change-record + post-mortem in one flow

### Added — Brand & docs (Phase 1, Phase 8)

- `BRAND.md` — voice guide, naming conventions, persona glossary
- `MIGRATIONS.md` — every renamed/dropped surface from this programme
- `TASKS.md` — master task tracker driving GitHub issue hierarchy
- `docs/skills-catalog.md` — auto-generated catalogue of all 80 skills
- `scripts/build-skills-catalog.cjs` — catalogue generator
- README "Who is rcode for" target-audience section
- Refreshed `package.json` description for the rcode positioning

### Added — Test coverage (Phase 7 + Phase 10)

- `test/skills-compliance.test.cjs` — every SKILL.md has frontmatter + line budget + prefix convention (4 tests)
- `test/dashboard-boot.test.cjs` — boot smoke for `/health`, `/api/state`, `/api/memory` (2 tests)
- `test/memory-templates.test.cjs` — required files, INDEX coverage, distillate frontmatter (5 tests)
- `test/agents-registry.test.cjs` — team.yaml integrity, no orphans (5 tests)
- `test/dashboard-e2e.test.cjs` — 9 end-to-end content assertions across all routes
- Total: 25 new test cases. Suite at 120 passing.

### Changed — Slash commands (Phase 2 + Phase 4)

| Old | New |
|---|---|
| `/rcode-report` | `/rcode-session-report` (was a pure alias) |
| `/rcode-karpathy-audit <args>` | `/rcode-review <args> --karpathy` |
| `/rcode-review-adversarial <args>` | `/rcode-review <args> --attack` (plain English) |
| `/rcode-review-edge-case-hunter <args>` | `/rcode-review <args> --edge-cases` |
| `/rcode-discuss-phase-power <args>` | `/rcode-discuss-phase <args> --power` |

Underlying workflow files retained — `code-review` delegates to them on flag match.

### Changed — Agents (Phase 2 + Phase 4)

- `rcode-architect` agent dropped — folded into `rcode-waleed` (CTO + Chief Architect)
- `rcode-tech-writer` agent dropped — folded into `rcode-noor` (Technical Writer & Presentation Lead). Noor gained `Write, Edit` tools.
- `team.yaml` agent count: 47 → 45

### Changed — Skills slimmed (Phase 4 Group 4)

8 oversized SKILL.md files moved to ≤120 lines with detail in sibling `references.md`:

- `rcode-clone-website` (416 → 75)
- `rcode-distillator` (212 → 63)
- `rcode-editorial-review-structure` (211 → 73)
- `rcode-advanced-elicitation` (167 → 67)
- `dalil-scout` (202 → 120)
- `majlis-council` (192 → 98)
- `raees-orchestrator` (166 → 105)
- `rcode-frontend-design` (182 → 92)

### Removed (user-facing slashes only — internal workflows preserved)

- `/rcode-report`, `/rcode-new-project-research`, `/rcode-new-project-roadmap`, `/rcode-check-implementation-readiness`
- `/rcode-discuss-phase-power`, `/rcode-karpathy-audit`, `/rcode-review-adversarial`, `/rcode-review-edge-case-hunter`

### Notable decisions

- **Path B** — skill folder names stay `rcode-*` for `cli/install.js` compatibility; brand vocabulary lives in slash names and content. See [`BRAND.md`](BRAND.md).
- **Plain English over jargon** — `--attack` instead of `--adversarial`, `--edge-cases` instead of `--edge-case-hunter`. Audience includes non-native English speakers.
- **Workflow file splits skipped** — Phase 5 work was deferred. Rationale: workflows are dense executable bash + agent-dispatch, not redundant prose. Trimming carried unverified runtime risk.
- **Off-limits files preserved** — `cli/install.js`, `cli/update.js`, `cli/github-sync.js`, `cli/postinstall.js`, `cli/uninstall.js` were not modified in this programme. `server/dashboard.js` was extended additively (one route registration) with explicit user approval.

### Counts after this release

- 45 agents (was 47)
- 95 slash commands (was 99)
- **80 skills** (was 56) — Memory Bank + Engineering + Real-pain layers added
- 120 passing tests (was ~95) — added 25 new test cases
- Zero runtime dependencies preserved

### Upgrade path

See [`MIGRATIONS.md`](MIGRATIONS.md) for the per-surface mapping. CI catches old references at install time.

---

## v2.3.4 — Doctor fixes: actions drift false positive + memory bank stub (2026-04-25)

### Fixed
- `doctor` no longer reports `actions 0/4 missing: 1-analysis, 2-plan, ...` — manifest builder now walks action bucket dirs recursively (matching `installSkills` behavior) instead of adding bucket directory names that never appear in `.claude/skills/`
- `doctor` no longer reports `Memory bank: never initialized` immediately after fresh install — `install` now seeds empty `.rcode/context/active.md` and `.rcode/context/project-brief.md` stubs so the "never" state is skipped; message reads "run /rcode-init in your editor to populate project context"

---

## v2.3.3 — CLI aliases + state.json fix + stale install-v2 refs removed (2026-04-25)

### Added
- `rcode` bin alias in package.json — `rcode install`, `rcode update`, `rcode uninstall` now work alongside `rcode` and `rcode`
- `rcode/state.json` template — install now seeds `.rcode/state.json` correctly on first install (was silently skipped because template was missing, causing health check failure `✗ .rcode/state.json parses — missing`)

### Fixed
- Replaced all `rcode install-v2` error messages in workflows (council.md, chain.md, discuss.md, enable-hooks.md) — stale v1 command, now `npx @hanzlaa/rcode install`
- Corrected agent/command counts everywhere: **43 agents, 99 commands** (plan-checker alias shares sprint-checker file; 99 command files on disk)
  - README.md, docs/agents.md, docs/TIERS.md all updated

### No behavior change
- `rcode` alias preserved for backward compatibility
- `npx @hanzlaa/rcode` still works as before

---

## v2.3.2 — Documentation audit: agent counts corrected, orphaned stubs removed (2026-04-25)

**Documentation correctness pass.** No behavior changes.

### Fixed

- Corrected `team.yaml` YAML structure: tactical agents block was nested inside `routing:` mapping, causing parse errors. Added proper `tactical_agents:` top-level key.
- Registered `rcode-plan-checker` in `team.yaml` (alias for `rcode-sprint-checker`; referenced in `verify-work.md` workflow but was never registered)
- Removed 3 dead stub entries from `docs/agents.md`: `rcode-doc-verifier`, `rcode-doc-writer`, `rcode-repo-metrics` — no agent files exist, no workflow references found
- Corrected agent counts across all docs: 46 → 44 (17 persona + 27 tactical)
  - `docs/agents.md` header
  - `README.md` feature list and health check output
  - `docs/TIERS.md` preview section

---

## v2.3.1 — Auto-heal: full skill compliance + 26 tactical agents registered (2026-04-25)

**Maintenance release.** Zero behavior changes — all fixes are structural correctness.

### Fixed

- All 56 SKILL.md files now pass the 5-component compliance check: `triggers:`, `## Overview`, `## Workflow`, `## Output Format`, `## Examples`
- Added `triggers:` frontmatter to 39 action + core skills previously missing it (agents were fixed in v2.3.0)
- Added `## Overview` to 34 skills, `## Workflow` to 12 skills
- Renamed `## On Activation` → `## Workflow` in all 17 agent SKILL.md files
- Fixed 7 broken `@`-includes across workflows: `autonomous.md`, `sprint-planning.md`, `checkpoint-preview.md`, `prfaq.md`, `document-project.md`
- Fixed broken `@.rcode/workflows/execute-plan.md` reference in `rcode-planner.md` → `execute.md`
- Removed legacy nested duplicate SKILL.md dirs (`rcode-shard-doc/rcode-shard-doc`, `rcode-advanced-elicitation/rcode-advanced-elicitation`)
- Added `skill_path:` field to 14 agents in `team.yaml` linking persona IDs to `skills/agents/` dirs
- Registered all 26 tactical/workflow agents in `team.yaml` (executor, planner, verifier, debugger, etc.) — were on disk but invisible to council dispatch (#201)
- Added retroactive `SPRINT.md` for phases 01–03 (completed before sprint tracking was standardized)
- Fixed stale counts in `README.md` and `docs/TIERS.md`
- Fixed `CHANGELOG.md` missing entries for v2.3.0 and v2.3.1

---

## v2.3.0 — State integrity + commit sync + brainstorm dashboard (2026-04-25)

**State integrity pass.** Focused on making state.json the reliable source of truth and wiring it to git.

### Added

- Auto-sync state on commit (pre-commit hook writes `.rcode/state.json` on every `git commit`)
- `/rcode-brainstorm` skill — structured ideation with reverse-brainstorm, SCAMPER, and 6-hats modes
- 24 tactical sub-agents registered in `team.yaml` (partial — full registration in v2.3.1)
- Dashboard: hierarchical nav (milestones → phases → sprints → tasks), file browser, auto-refresh, blocker banner, design system, dark/light toggle, keyboard shortcuts

### Fixed

- Dashboard: strip YAML frontmatter before rendering markdown in file viewer
- Dashboard: project name showing `.` instead of `rcode`
- Dashboard: auto-refresh re-renders active view without page reload
- Dashboard: modularized monolithic 1200-line file into `server/lib/` modules
- Planning: aligned `.planning/` structure with the rcode standard layout (phases 01–05 dirs, PLAN.md, VERIFICATION.md)
- Config: `project_name: '.'` → `rcode`; stale `rcode_source_path` cleared

---

## v2.2.0 — Auto-managed .gitignore on install (2026-04-24)

**Installer polish.** Before v2.2, a fresh `rcode install` + `git add .` would bloat the user's repo by 676 methodology files (~3.8 MB) that regenerate on every update. This release fixes that at the install step, not after-the-fact.

### Added

- `cli/install.js` now appends an idempotent `rcode-managed gitignore block` to the project's `.gitignore` on first install. Block is marked with a sentinel comment so re-runs detect and skip. Existing user entries are preserved when rcode appends; never overwrites.
- `docs/install.md` grows a **"What gets committed vs ignored"** table with the rationale for each path.

### The committable split

- ✅ **Commit:** `.rcode/config.yaml` (project mode/language/profile), `.rcode/state.json` (decisions log + roadmap + blockers), `.planning/` (PRD, roadmap, sprints, SUMMARY files).
- ❌ **Ignore:** `.claude/`, `.rcode/{bin,workflows,references,commands,skills}/`, `rcode/brain/`, lock files, debug artifacts.

### Verified

3-scenario smoke test:
- Fresh project, no `.gitignore` → **created** with rcode block.
- Re-run install → detects sentinel, **already-present** (no duplicate append).
- Existing `.gitignore` with user entries (e.g. `node_modules/`) → **appended**; user entries preserved byte-for-byte.

### Deferred

Users already on v2.1.0 who accidentally committed `.claude/` etc. will need a one-off cleanup: `git rm -r --cached .claude .rcode/workflows .rcode/bin .rcode/references rcode/brain && git commit -m "chore: stop tracking rcode-managed files"`. A follow-up `rcode migrate` subcommand could automate this but it's not shipped here.

---

## v2.1.0 — First npm publish as @hanzlaa/rcode (2026-04-24)

**Shipping release.** Live on npm at [@hanzlaa/rcode](https://www.npmjs.com/package/@hanzlaa/rcode). Previously only installable by cloning the repo; now available as `npx @hanzlaa/rcode install` from any project anywhere.

Also bundles M2.5 (rebuilt `/progress` and `/status`, PR #166) + the orphan fixes (#135 story-level state sync, #136 verification matrix, #137 create-milestone compliance audit, PR #167 + #168).

### Added

- **npm package:** `@hanzlaa/rcode` scoped under the personal `hanzlaa` npm account (pending rcode org approval for a future `@rcode/code` rename).
- **Binary aliases:** `rcode` (primary) + `rcode` (legacy alias — existing commands keep working).
- **`docs/install.md`** — dedicated install guide covering flavors (module subsets, IDE options, version pinning), yolo mode, troubleshooting, uninstall.
- **M2.5 CLI subcommands** (via PR #166):
  - `rcode-tools progress init` — single pre-computed snapshot for `/rcode-progress` rendering.
  - `rcode-tools progress bar --raw` — ASCII bar string only.
  - `rcode-tools progress insights` — drift / undercount / between-milestones detection.
  - `rcode-tools progress routes` — intent-tree for Route A/B/C Next Up menu.
  - `rcode-tools summary-extract` — surgical field extraction from SUMMARY.md (no whole-file load).
  - `rcode-tools state-snapshot` — compact state for display.
  - `rcode-tools state promote-backlog 999.x --to NN` — parking-lot promotion.
- **Story- and sprint-level state sync** (PR #167, issue #135): `state sync --from-disk` now parses `epics.md` for stories + walks `.rcode/phases/*/sprint-*.md` for sprint entries. Status preservation verified end-to-end.
- **`docs/verification/v2.0-gap-fixes.md`** (PR #168, issue #136): 9-row verification matrix confirming the v2.0 gap batch is intact.
- **`docs/parking-lot-convention.md`**: 999.x numbering documentation.

### Changed

- **Workflow shrinkage:** `rcode/workflows/progress.md` dropped from 573 to 184 lines (68% reduction) — CLI does the thinking, workflow renders.
- **`/rcode-status`** and **`/rcode-progress`** both call the same CLI subcommand — guaranteed consistency, closes the seam from issue #131.
- **README** install command updated to `npx @hanzlaa/rcode install`.

### Fixed

- Self-drift on the rcode repo itself — phases 04, 05 now have proper `number` fields in `.rcode/state.json`, drift-detection reports clean.

### Deferred to follow-ups (issues open in v3.0 milestone)

- Full skill-folder reorganization under role directories (#179).
- Real rcode brain URLs (#162) — pending rcode approval.
- CI Actions quota fix (#165) — pending billing action.

---

## v2.0.0 — rcode Brain (2026-04-15)

**Repositioning release.** rcode is no longer a generic AI-engineering methodology that happens to be written at rcode. It is **the installable context-brain for Rihalians** — every rcode project can now pull PR standards, commit conventions, architecture docs, and internal guides straight from rcode's own repos into the AI assistant's context on install.

The v1 methodology, agents, and skills all remain. v2 adds the brain layer on top and reorganizes contribution around role-owners.

Tracked in GitHub [milestone #4](https://github.com/hanzlahabib/rihal-code/milestone/4).

### Added

- **`docs/what-is-rcode.md`** — product story for the v2 repositioning.
- **`docs/ROADMAP.md`** — public roadmap through v3.0 (MCP server) with binary kill criteria.
- **`rcode/brain/`** — new content tree with `sources.yaml` (placeholder URLs until M5) and pull destinations for `rcode-github/`, `rcode-docs/`, and `best-practices/`.
- **`rcode-tools brain pull`** — CLI subcommand that fetches configured sources via `git` sparse-checkout. Mirrors the `state sync --from-disk` pattern shipped in v1.0.0-beta.0 / issue #126.
- **Install hook** runs `brain pull` automatically (graceful no-op when sources are placeholders).
- **`.github/CODEOWNERS`** — per-role ownership enforcement so PM / CTO / UX / QA etc. changes route to the right reviewers.
- **`CONTRIBUTING.md` — per-role guide** — one paragraph, one command sequence, one PR per role.
- **`.github/workflows/release.yml`** — semver release pipeline: compliance check → bundle → GitHub release artefact.
- **`docs/adr/mcp-design.md`** — design doc stub for the v3.0 MCP server (tracks open questions, not yet implemented).

### Changed

- **README.md** — new top section leads with the brain-in-a-box framing. Tier structure and methodology docs unchanged beneath it.
- **`/rcode-update`** — now also runs `brain pull`, supports version pinning (`/rcode-update v1.3.0`).

### Documentation

- Public roadmap surfaces M2.5 (progress/status UX overhaul), M3 (role ownership), M4 (release pipeline), M5 (real rcode content URLs), M6 (MCP).

### Deferred to follow-up releases

- **Full skill-folder reorganization under role owners** — CODEOWNERS ships in v2.0 covering the current folder layout; deeper reorg is a v2.1 scope.
- **Elegant /progress and /status rebuild** — tracked as issue #159, landing in v2.5.
- **Live MCP server** — v3.0 (design doc only in v2.0).

---

## v1.0.0-beta.0 (2026-04-15)

First beta release. v1 and v2 methodologies unified into a single landscape.

### Breaking

- **`rcode/v2/` directory removed.** All contents promoted to `rcode/` root. Any external scripts referencing `rcode/v2/...` paths must update to `rcode/...`.
- **`cli/install-v2.js` renamed to `cli/install.js`.** Old script path invalid.
- **`npx rcode install` is now the single entry point.** Routes through the unified installer (was previously routing to v1's `cli/init.js`).
- **Multi-IDE support reduced to Claude / Cursor / Gemini.** Dropped Windsurf, Antigravity, Codex direct install paths (AGENTS.md still applies).

### Added

- **Unified installer** — installs v2 agents/commands/workflows AND v1 phrase-activated skills in one command. 93 slash commands + 44 agents + 58 skills.
- **`/rcode-dashboard`** slash command — launches Diwan view-only dashboard from inside Claude Code.
- **`rcode-scaffold-project`** skill — bootstraps a new Rihalian project from `github.com/rcode-om/template`. Fresh clone, no cache, safety checks on non-empty dirs.
- **Tier-based docs** — `docs/TIERS.md`, `docs/STANDARDS.md`. Skills organized into Starter / Advanced / Ultra Advanced / Standards.
- **`npx rcode tiers`** CLI command — prints the tier map.
- **Golden Path** — 7-step Starter tier (scaffold → PRD → story → sprint → dev → review → status) for first-time users.
- **`.planning/PROJECT.md` + `ROADMAP.md` + `STATE.md`** — dogfooded tracking artifacts for rcode itself.

### Changed

- **Install output** now reports `Skills: N phrase-activated` in addition to files/commands/agents.
- **`README.md`** — "Start Here" tier navigation block at the top. Install section collapsed to one command.
- **CLI help** — commands grouped into PROJECT / TEAM / META (was flat list of 17).
- **Postinstall** — shows 7-step Golden Path instead of generic command list.
- **`rcode/team.yaml`** — v2 schema (agents + utility_agents + routing). v1 schema removed.

### Removed

- `rcode/agents/*.agent.md` — 14 v1 persona agents (superseded by v2's 36).
- `rcode/workflows/` (v1 — 13 files). Replaced by v2's 68 workflows.
- `rcode/v2/` directory entirely (contents promoted).
- All inspiration-source references from commit history (rewritten in 95 commits).

### Fixed

- `.rcode/state.json` was previously committed with the literal string `bad json`. Now gitignored and regenerated on install.
- `rcode/v2/` hardcoded paths in 3 test files, CLI, references, workflows — all updated.

### Internal

- Backup tag `backup/pre-v1v2-merge` kept locally (not pushed) for rollback.
- `pnpm test`: 95/95 passing after merge.
- Dashboard server boots cleanly (view-only, pure Node stdlib).

---

## v2-prototype (pre-merge, archived)

v2-prototype is the current active branch. Stable releases will be tagged on main.

### Added

#### Core Features
- **69 slash commands** across 3 modes (council, chain, discuss) and 3 modules (core, execution, discovery)
- **35+ agents** with clear roles, cultural identity (Arabic names), and hard scope boundaries
- **Numeric ID system** — milestones (M1, M2), phases (01, 02, 02.1), plans (01.01, 02.03), tasks (01.01.01)
  - Decimal phase insertion (02.1) for urgent mid-cycle work
  - Hierarchical IDs used throughout for cross-referencing
- **Multi-agent modes:**
  - `/rcode-council` — parallel debate (Round 1 + Round 2)
  - `/rcode-chain` — sequential pipeline with typed outputs per stage
  - `/rcode-discuss` — single expert, conversational tone

#### Planning & Execution
- `/rcode-plan` with **plan-verification loop** — rcode-plan-checker validates file/symbol references; loops back on failure
- `/rcode-chain` with preset pipelines: research-plan, feasibility, gtm-to-build, full-discovery
- `/rcode-execute` with **post-execute gates:**
  - rcode-integration-checker (cross-phase E2E verification)
  - rcode-nyquist-auditor (test coverage audit)
  - Both append findings to SUMMARY.md
- `/rcode-quick` — trivial task execution without ceremony
- `/rcode-autonomous` — run all remaining phases with token/phase budget

#### Intent Guards & Safety
- **Step 0.5** on every workflow — detects mismatched intent and redirects with copy-paste fix
- No more confusing output; wrong command → single-line redirect
- Examples: "That's a decision question, not a planning input. Copy-paste this instead: /rcode-council ..."

#### Multilingual Support
- **Multilingual classifier** — recognizes Roman Urdu, Arabic, English
- Auto-routes to Mariam for GCC/MENA questions
- Keywords: `dubai`, `affiliate`, `bnanai`, `karobar`, `site banana`, `دبئی`, `مارکیٹ`, `کاروبار`, and 20+ more
- Example: `/rcode-council yar affiliate site bnanai hai dubai ma` → picks [mariam, hussain-pm, sadiq]

#### Code Quality
- **Karpathy coding guidelines** enforcement — 4 principles wired into every code-writing agent:
  1. Think before coding (surface assumptions)
  2. Simplicity first (no speculative abstractions)
  3. Surgical changes (touch only what's needed)
  4. Goal-driven execution (define verifiable success criteria)
- `/rcode-karpathy-audit HEAD~5..HEAD` — audit recent changes vs. guidelines
- Karpathy-guidelines.md in references/ loaded by all executor/planner agents

#### State Management & Recovery
- `.rcode/state.json` — comprehensive project state tracking
  - Phases, executions, decisions, blockers
  - Council sessions and chain runs
  - Workstreams and milestones
- `/rcode-status` — formatted state viewer
- `/rcode-pause-work` → creates `.rcode/HANDOFF.json` + `.planning/.continue-here.md`
- `/rcode-resume-work` → re-surfaces blocking constraints + last context
- `/rcode-health --fix` → recovers from corrupted state

#### Observability & Debugging
- `/rcode-show <id>` — display artifact by numeric ID
- `/rcode-why <topic>` — explain why agent was picked (panel scoring breakdown)
- `/rcode-rerun <id>` — re-execute previous command/session
- `/rcode-diff <id1> <id2>` — compare phases/plans/artifacts
- `/rcode-report <phase>` — generate phase report (decisions, blockers, time)
- `/rcode-session-report` — comprehensive session summary

#### Hooks System (opt-in)
- `/rcode-enable-hooks` — installs 3 opt-in hooks into `.claude/settings.json`
- **pre-edit** — enforces read-before-edit
- **pre-workflow** — soft intent warnings on mismatched commands
- **post-commit** — validates commit format, blocks AI attribution

#### Multi-IDE Support
- Installer supports: Claude Code, Cursor, Gemini CLI
- `--ide=claude` (default), `--ide=cursor`, `--ide=gemini`
- Same commands across all IDEs

#### Phase Management
- `/rcode-insert-phase 02 "urgent fix"` — creates 02.1 between 02 and 03
- `/rcode-new-milestone` — start new milestone cycle
- `/rcode-complete-milestone` — mark milestone complete + generate summary
- `/rcode-audit-milestone` — verify milestone completeness

#### Workspace Isolation
- `/rcode-new-workspace "experimental-auth"` — create isolated parallel track
- `/rcode-list-workspaces` — list all workspaces and active one
- `/rcode-remove-workspace` — delete a workspace
- Useful for A/B testing, parallel R&D, feature branches

#### Miscellaneous Commands
- `/rcode-diff` — compare phases/plans/artifacts
- `/rcode-config` — view/edit config directly
- `/rcode-init` — initialize project with Arabic greeting + setup
- `/rcode-do` — interactive router (guides you to next action)
- `/rcode-health` — diagnose state/artifacts/locks
- `/rcode-forensics` — post-mortem analysis
- `/rcode-next` — advance to next phase
- `/rcode-correct-course` — recover from failed phase
- `/rcode-undo` — safely revert last phase
- `/rcode-note` — zero-friction idea capture
- `/rcode-add-todo` — add task to backlog
- `/rcode-inbox` — review + process captured notes/todos

#### Documentation & References
- 35+ reference documents in `rcode/references/`
- council-protocol.md — 5-step majlis + deterministic panel scoring
- karpathy-guidelines.md — 4 coding principles + validation framework
- state-schema.md — complete state.json documentation
- execution-protocol.md — task execution contract
- gate-prompts.md — post-execute gate implementations
- verification-patterns.md — quality verification patterns
- And 25+ more (checklists, domain probes, response styles, etc.)

#### Global Agent Customization
- `~/.rcode/agents/rcode-<name>.md` — define custom agents globally
- Agents appear in every project without forking
- Supported in v2.1+ roadmap

#### Token & Cost Tracking
- Token cost footer on heavy workflows
- `/rcode-stats` — displays token usage by model
- Model profiles: quality, balanced, budget, inherit

#### Configuration
- `.rcode/config.yaml` with 10+ settings:
  - user_name, project_name, communication_language
  - mode (guided/yolo), model_profile
  - workflow toggles (plan_checker, post_execute_gates)
  - git branching_strategy
- `/rcode-settings` — interactive configuration editor

#### Testing & Validation
- 95+ compliance tests verify:
  - Every command has matching workflow file
  - Every agent has valid frontmatter + constraints
  - Module manifests match installed files
  - CLI help matches implemented subcommands
  - Panel scorer routes correctly (10+ question types)
  - Classifier handles Roman Urdu, Arabic, English + edge cases
- `node --test test/*.cjs test/lib/*.cjs` to run full suite

---

### Fixed

#### Plan Verification
- Plan-checker now verifies file existence and symbol definitions before execution
- References that don't exist trigger feedback loop (max 2 retries)
- Pre-execute gate prevents running broken plans

#### State Integrity
- Stale lock files no longer block all state writes
- State initialization recovers from corrupted state.json
- Orphaned execution records cleaned up on health check

#### Agent Consistency
- Council/chain agent lists derived from installed_agents.yaml (not hardcoded)
- Panel falls back to 3-agent minimum if fewer agents score non-zero
- Deterministic scoring ensures reproducibility

#### Workflow Issues
- All 69 commands now have consistent Step 0 (success criteria) + Step 0.5 (intent guard) + On Error
- Workflows load shared references correctly (@included in every workflow)
- Cross-project file leaks fixed via CLI subcommand isolation

#### Bug Fixes
- 13 missing subagent files created (rcode-executor, rcode-planner, rcode-verifier, etc.)
- 25 orphaned commands wired into module YAMLs
- Pre-workflow intent gates now respect multiline input
- `/rcode-init` no longer drops global saves in TTY
- Backspace in TTY-based prompts preserves prompt text
- Multi-IDE installer no longer conflicts with existing .claude/ structure
- Workstream flag conflicts resolved
- Git planning commit format validated post-commit
- ~80+ other bug fixes from stress testing + E2E audit

---

### Removed

#### Deprecated
- `/rcode-generate-project-context` (replaced by `/rcode-init`)
- Hardcoded agent lists (now derived from installed_agents.yaml)
- Old cross-system path references and branding leaks

#### Safety Improvements
- Unauthorized git operations blocked (no auto-push)
- Worktree isolation removed (safety concern)

---

### Changed

#### API/Behavior
- Panel scorer now deterministic (deterministic keyword matching, not LLM)
- Council Round 2 now includes agent names in responses (better cross-talk)
- Plan-checker loops back instead of failing hard (user-friendly recovery)
- Post-execute gates append to SUMMARY.md instead of separate files (consolidated output)
- Intent guards provide copy-paste redirects (not just warnings)

#### Architecture
- Agent rules split into slim index + lazy-loaded files (77% token reduction)
- Module system refactored to 3 explicit modules (core, execution, discovery)
- Workflows now consistently use `@` references to shared contracts
- Numeric ID system adopted across all workflows and state

#### Documentation
- README rewritten for v2-prototype (64 → 69 commands, 22 → 35+ agents)
- Added "What's new" section highlighting recent additions
- Filesystem layout documented (.rcode/ vs .planning/)
- Three modes deep-dive: Council vs. Chain vs. Discuss

---

### Known Issues

#### Limitations
- Global agents (`~/.rcode/agents/`) not yet supported (roadmap for v2.1)
- Mariam and Hussain-PM not installed as first-class council agents (workaround: copy and customize)
- Worktree isolation removed (auto-branch isolation available instead)
- Token budgeting on `/rcode-autonomous` is advisory (soft limit, not hard)

#### Experimental
- Decimal phase insertion (02.1) is new; test coverage in progress
- Multilingual classifier covers ~30 keywords; expansion ongoing

---

## v1.0.0 (Historical Reference)

Earlier versions tracked on main branch. See GitHub Releases for details.

---

## Roadmap (planned)

### v2.1
- Global agents fully supported (`~/.rcode/agents/`)
- Mariam and Hussain-PM as first-class council agents
- Extended multilingual classifier (50+ keywords)
- Integration with external knowledge bases

### v2.2
- Dashboard improvements (realtime state viewer)
- Workspace branch tracking (git integration)
- Agent performance metrics

### v3.0 (future)
- Integration with external planning tools (Jira, Linear, etc.)
- Real-time collaboration features
- Custom workflow builders (no-code)

---

## Statistics (v2-prototype)

| Metric | Count |
|--------|-------|
| Commands | 69 |
| Agents | 35+ |
| References | 35+ |
| Test files | 10 |
| Tests | 95+ |
| Module files | 238 total |
| Max file size limit | 1000 lines |

---

## Feedback

Found a bug? Have a suggestion? Open an issue on GitHub:
[github.com/hanzlahabib/rihal-code/issues](https://github.com/hanzlahabib/rihal-code/issues)

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

This project follows Conventional Commits. Agent definitions must pass the 5-component compliance check:
1. YAML trigger header (5-12 triggers + negative boundaries)
2. Overview paragraph
3. Workflow/instructions
4. Output Format section
5. Examples (happy + edge + negative cases)

---

Last updated: 2026-04-12
