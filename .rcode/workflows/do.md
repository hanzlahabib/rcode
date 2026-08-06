<purpose>
Analyze freeform text from the user and route to the most appropriate rcode command. This is a dispatcher — it never does the work itself. Match user intent to the best command, confirm the routing, and hand off.
</purpose>

<required_reading>
@.rcode/references/auto-init-guard.md
@.rcode/references/output-format.md
@.rcode/references/verb-dictionary.md
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

`.rcode/references/dispatch-banner.md` is NOT required reading here — its banner format is scoped to real `Task(subagent_type=...)` spawns. `/rcode-do` never spawns a Task/subagent (see guardrails); it only dispatches via the `Skill` tool, so it uses the plain `ROUTING` banner defined in the `display` step below.

<process>

<step name="auto_init_check">
Run the auto-init guard from `@.rcode/references/auto-init-guard.md` before anything else.
If the project is not initialized, complete the inline init flow, then continue.
</step>

<step name="parse_args">
Extract `$ARGUMENTS`, detect `--auto` flag, and check config mode:

```bash
AUTO_MODE=false
QUESTION="$ARGUMENTS"
if [[ "$ARGUMENTS" == *"--auto"* ]]; then
  AUTO_MODE=true
  QUESTION=$(echo "$ARGUMENTS" | sed 's/--auto[[:space:]]*//' | xargs)
fi
# Also auto-dispatch in yolo mode
CONFIG_MODE=$(node .rcode/bin/rcode-tools.cjs config-get mode 2>/dev/null || echo "guided")
if [[ "$CONFIG_MODE" == "yolo" ]]; then
  AUTO_MODE=true
fi
```
</step>

<step name="persona_shortcut" priority="first-match">
**Recognize `@persona CODE` shortcuts as the deterministic API surface.**

Every rcode persona file has a Capabilities table listing 2-3-letter codes (Waleed: ADR/RV/TS/FZ/KS · Hussain-PM: CP/VP/EP/CE/CS/IR/CC · Mariam: MR/ICP/GTM/POS/LP · Fatima: TS/RG/EC/RR/RP/FT · Hanzla: DS/IS/BF/RF/KA/CR · Sadiq: KC/OC/PT/MT/KS · Dalil: SC/MC/RF/TS · Khattat / Munaffidh / Bahith / Muhaqqiq similarly).

Match if `$QUESTION` starts with `@<persona> <CODE>` or `@<persona>:<CODE>` — case-insensitive on persona, codes uppercase. Examples:

- `@hussain CP` → dispatch to Hussain-PM with capability `CP` (Create PRD via interview)
- `@waleed ADR` → dispatch to Waleed with capability `ADR` (write an ADR)
- `@fatima RG` → dispatch to Fatima with capability `RG` (release-gate review)
- `@dalil SC --topic "Sentry"` → dispatch to Dalil with capability `SC` (lightweight scan, topic phrase passed)

**Persona-name aliases** (lowercased, common nicknames):
| Alias | Resolves to | Agent file |
|---|---|---|
| `sadiq`, `strategy`, `director` | Sadiq | rcode-sadiq |
| `waleed`, `cto`, `architect` | Waleed | rcode-waleed |
| `hussain`, `hussain-pm`, `pm` | Hussain | rcode-hussain-pm |
| `mariam`, `marketing` | Mariam | rcode-mariam |
| `fatima`, `qa` | Fatima | rcode-fatima |
| `hanzla`, `dev`, `engineer` | Hanzla | rcode-hanzla |
| `dalil`, `scout`, `mapper` | Dalil | rcode-codebase-mapper |
| `khattat`, `planner` | Khattat | rcode-planner |
| `munaffidh`, `executor` | Munaffidh | rcode-executor |

**Behavior:**

1. Parse the persona alias and CODE.
2. Read the persona's agent file at `.claude/agents/{agent-id}.md` (or `.claude/agents/{agent-id}.local.md` if it exists — local overrides take precedence).
3. Look up the CODE in the Capabilities table. If found, the table row's "Skill / workflow" column tells you which sub-command to invoke; pass the rest of `$QUESTION` (after the shortcut) as arguments.
4. If the CODE is not in that persona's Capabilities table, print:
   ```
   Persona '{persona}' has no capability '{CODE}'. Available codes:
   {list from the persona's Capabilities table}
   ```
   And stop. Do not fall back to fuzzy intent matching — the user used the deterministic API, honour it.
5. Dispatch directly: show the plain `ROUTING` banner (the `display` step's format — "Routing to: {chosen command}") and call the `Skill` tool. Skip greenfield_guard / external_data_guard / explicit_intent_check / route — the user already chose the persona AND the action. This is a `Skill()` dispatch, not a `Task(subagent_type=...)` spawn, so it does NOT use the persona-voiced `dispatch-banner.md` format. The persona itself can still refuse internally if its preconditions aren't met.

**This is the deterministic API surface.** Power users (and other agents in council follow-ups) can invoke specific capabilities without re-reading triggers or risking fuzzy match. It's the cheapest way to get repeatable behaviour out of the persona system.

**Edge cases:**

- `@waleed` (no code) → dispatch to Waleed with no capability hint; persona uses its default workflow.
- `@nobody CP` (unknown persona) → fail loud: list known personas, exit.
- `CP @hussain` (code first) → reorder; do not match. The `@persona CODE` order is canonical.
- `@hussain CP fix the auth bug` → dispatch with `CP` and pass `fix the auth bug` as argument context.

If this step does NOT fire (no `@` prefix), continue to validate.
</step>

<step name="validate">
**Check for input.**

If `$QUESTION` is empty, present the main menu via AskUserQuestion:

```
What would you like to do?

— Talk —
1. Quick chat with one expert (/rcode-discuss)
2. Convene the council (/rcode-council)
3. Discuss an unlocked phase (/rcode-discuss-phase)

— Plan & build —
4. Plan a phase (/rcode-plan)
5. Execute a phase (/rcode-execute)
6. Sprint planning (/rcode-sprint-planning)
7. Execute a sprint (/rcode-execute-sprint)
8. Break milestone into epics & stories (/rcode-create-epics-and-stories)
9. Implement a story (/rcode-dev-story)

— Status & recovery —
10. Check progress (/rcode-progress)
11. Check sprint status (/rcode-sprint-status)
12. Auto-advance to next step (/rcode-next)
13. Debug an issue (/rcode-debug)
14. Resume paused work (/rcode-resume-work)

— Other —
15. Add a note (/rcode-note)
16. Something else — describe it
0.  Cancel — exit without running anything
```

If user picks 1-15, invoke that command. If 16, capture text and continue. If 0 (or empty / Esc), print `Cancelled.` and STOP — do not fall through to project-state survey.
</step>

<step name="check_project">
**Check if project exists + state survey.**

Detect PRD / epics with glob — projects use either singular files (`.planning/prd.md`) OR per-milestone directories (`.planning/prds/v1.8.md`). Closes #377 — false 'create-prd first' redirects on multi-milestone repos.

```bash
INIT=$(node ".rcode/bin/rcode-tools.cjs" state load 2>/dev/null || echo '{"ok":false,"error":"state_load_failed"}')
HAS_PRD=$( ( ls .planning/prd.md .planning/PRD.md .planning/prds/*.md .planning/milestones/*/PRD.md 2>/dev/null | head -1 ) && echo true || echo false)
HAS_EPICS=$( ( ls .planning/epics.md .planning/EPICS.md .planning/epics/*.md .planning/milestones/*/EPICS.md 2>/dev/null | head -1 ) && echo true || echo false)
PHASE_COUNT=$(node ".rcode/bin/rcode-tools.cjs" progress init 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin).get('phase_count',0))" 2>/dev/null || echo 0)
HAS_PHASES=$([ "$PHASE_COUNT" -gt 0 ] && echo true || echo false)

# State-aware milestone detection (#374) — used by explicit_intent_check
ACTIVE_MILESTONE=$(grep -m1 '^## Current Milestone' .planning/PROJECT.md 2>/dev/null | sed 's/^## Current Milestone[: ]*//' | xargs)
LAST_SHIPPED_VERSION=$(grep -m1 -oE 'v[0-9]+\.[0-9]+' .planning/MILESTONES.md 2>/dev/null | head -1)
```

These flags drive the greenfield guard AND the explicit_intent_check below. `.planning/` existing alone is not enough — we need to know whether the methodology chain has actually run (PRD → milestone → epics → phases) AND which milestone is currently open.
</step>

<step name="greenfield_guard" priority="first-match">
**Block methodology inversion.**

Some routes ASSUME upstream artifacts exist. If they don't, dispatching to them inverts the chain (the autonomous-bypass pattern that produced the interpos disaster — issue #220 + #219).

Apply this guard BEFORE the routing table below:

| Intent contains... | AND state shows... | Then re-route to... | Why |
|--------------------|---------------------|----------------------|-----|
| "draft phases", "all phases", "build all phases", "groom phases", "auto mode" + "phases" | `HAS_PRD=false` | `/rcode-create-prd` first | Phases need a PRD foundation. Without one, the autonomous flow hallucinates requirements. |
| "execute phase", "build phase N", "run phase N" | `HAS_PHASES=false` OR SPRINT.md missing for phase N | `/rcode-plan N` first (or `/rcode-create-prd` if no PRD) | Can't execute what hasn't been planned. |
| "sprint planning", "plan the sprint" | `HAS_EPICS=false` | `/rcode-create-epics-and-stories` first | Sprints draw stories from epics. No epics = no stories to schedule. |
| "create stories", "epics" | `HAS_PRD=false` | `/rcode-create-prd` first | Epics decompose a milestone. Milestone needs PRD. |
| "create milestones", "roadmap" | `HAS_PRD=false` | `/rcode-create-prd` first | Roadmap is derived from PRD success metrics. |

When the guard fires, print a clear message:

```
⚠ Cannot {requested action}: missing prerequisite — {what's missing}.

Re-routing to: /rcode-{prerequisite-command}
Once that completes, re-run your original request.
```

Then dispatch to the prerequisite command instead of the originally-matched route.

The guard never silently rejects intent — it always either dispatches to a sensible alternative OR explicitly tells the user what flag overrides it (e.g. `--skip-prerequisites` for the rare legitimate use case).
</step>

<step name="external_data_guard" priority="first-match">
**Block code-only routing when the actionable signal lives in an external system.**

Some tasks reference systems whose data is NOT in the repo — observability platforms, issue trackers, analytics, and product dashboards. A pure codebase scan can map *instrumentation* but cannot classify *what is actually firing*. Routing such requests to `/rcode-scan` or `/rcode-map-codebase` without first establishing a data source produces theoretical output (violates the codebase-first rule).

**External-data signals** — match if `$QUESTION` contains any of:

- Observability: `sentry`, `datadog`, `new relic`, `newrelic`, `bugsnag`, `rollbar`, `honeycomb`, `grafana`, `prometheus`, `splunk`, `cloudwatch`
- Analytics: `google analytics`, ` GA4`, `mixpanel`, `amplitude`, `posthog`, `heap`
- Issue/support: `linear`, `jira`, `zendesk`, `intercom`, `freshdesk`, `pagerduty`
- Product/CRM: `stripe dashboard`, `hubspot`, `salesforce`

**Action verbs** — match if `$QUESTION` contains any of: `audit`, `clean up`, `cleanup`, `classify`, `triage`, `review errors`, `noisy`, `top errors`, `which errors`, `production errors`, `dashboard`.

If BOTH a system signal AND an action verb match, fire the guard. Ask via AskUserQuestion BEFORE choosing a route:

```
The task involves {detected system} — the actionable data lives there, not in the repo.
A codebase scan alone will only show instrumentation, not which errors are firing.

How should we access the external data?

1. MCP/API access available — pull the data and analyze it
2. I'll paste the top errors / dashboard export manually
3. Codebase-only scan is fine — I just want the instrumentation map
4. Cancel — let me reformulate
```

Then route accordingly:
- **Option 1:** Continue to `route` step but tag the chosen command with a note to use the external data source. If no rcode command natively reads the external system, route to `/rcode-discuss` and have the agent guide MCP/API setup.
- **Option 2:** Route to `/rcode-discuss` so the user can paste data into a focused conversation, OR `/rcode-note` to capture, then re-run.
- **Option 3:** Continue to `route` step normally (likely `/rcode-scan` or `/rcode-map-codebase`) but display a clear caveat: *"Output will be an instrumentation map only — it cannot classify which errors are noisy vs critical."*
- **Option 4:** Stop. Print the original input back so the user can rephrase.

Skip this guard when `AUTO_MODE=true` AND the input explicitly contains `--codebase-only` or `instrumentation map` — those signal the user already accepted the limitation.
</step>

<step name="explicit_intent_check" priority="first-match">
**Honor explicit user verbs — skip ambiguity prompts when intent is unambiguous.**

When the user uses a literal create/make/start verb paired with a scope-noun (milestone, phase, story, epic, sprint, plan, PRD, roadmap, council), dispatch IMMEDIATELY. Do not present a multi-route ambiguity menu. The user already chose.

This was a real bug: `/rcode-do "milestone bnao aur ... list down karo"` triggered an ambiguity prompt offering new-milestone vs add-phase vs create-epics-and-stories — even though the user literally said "milestone bnao" (= "create a milestone" in Roman Urdu). That second-guessing wasted the user's time and broke trust.

**Verb + scope detection — sourced from `@.rcode/references/verb-dictionary.md`.**

Match if `$QUESTION` contains any verb from §Create or §Add (English + Roman Urdu/Hindi + Arabic transliteration — full list lives in the dictionary file, do not duplicate here). Pair with a scope noun to determine the route.

The full mapping is in the dictionary's "Scope nouns" table. Pre-conditions enforced by this workflow:

| Scope noun | Direct route | Pre-condition (this workflow only) |
|---|---|---|
| milestone | `/rcode-new-milestone` | none — methodology chain assumed when greenfield_guard cleared |
| phase | `/rcode-add-phase` | HAS_PHASES OR HAS_PRD true |
| story | `/rcode-create-story` | HAS_EPICS true |
| epic | `/rcode-create-epics-and-stories` | HAS_PRD true |
| sprint | `/rcode-sprint-planning` | HAS_EPICS true |
| PRD | `/rcode-create-prd` | none |
| roadmap | `/rcode-new-milestone` | HAS_PRD true |
| council | `/rcode-council` | none |
| plan (verb) | `/rcode-plan` | HAS_PHASES true |

**Behavior:**
1. If both a verb AND a scope-noun match, fire this step.
2. Skip the ambiguity-handling logic in the `route` step entirely.
3. Apply the state-aware redirect rules below.
4. Print the routing banner with `Reason: explicit user verb — "{matched verb}" + "{matched noun}"` plus any state-redirect explanation.
5. Dispatch immediately.

**State-aware redirects (closes #374):**

The naive route is "user said milestone bnao → dispatch new-milestone". But if a milestone is already active, that violates the one-active-milestone convention and triggers a second prompt downstream. Apply these state-aware overrides BEFORE dispatching:

| Verb + scope | State signal | Redirect | Banner message |
|---|---|---|---|
| create + milestone | `$ACTIVE_MILESTONE` is non-empty AND user did NOT pass `--force-new-milestone` | `/rcode-add-phase` | `$ACTIVE_MILESTONE is active — adding as a phase to it instead of opening a new milestone. Override: add `--force-new-milestone` to the original input.` |
| create + milestone | No active milestone | `/rcode-new-milestone $NEXT_VERSION` (auto-derived from `$LAST_SHIPPED_VERSION` + 0.1) | `Auto-versioned $NEXT_VERSION based on last shipped $LAST_SHIPPED_VERSION.` |
| create + phase | `$HAS_PHASES=false` AND `$HAS_PRD=false` | `/rcode-create-prd` | greenfield_guard already covers this; this row is for completeness. |
| create + story | `$HAS_EPICS=false` | `/rcode-create-epics-and-stories` (greenfield_guard) | likewise. |

**Auto-version computation when no milestone is active:**

```bash
# Parse last shipped version (e.g. "v1.7"), bump minor by default
if [ -n "$LAST_SHIPPED_VERSION" ]; then
  MAJOR=$(echo "$LAST_SHIPPED_VERSION" | sed -E 's/v([0-9]+)\.[0-9]+/\1/')
  MINOR=$(echo "$LAST_SHIPPED_VERSION" | sed -E 's/v[0-9]+\.([0-9]+)/\1/')
  NEXT_VERSION="v${MAJOR}.$((MINOR + 1))"
else
  NEXT_VERSION="v1.0"
fi
```

Pass `$NEXT_VERSION` as the dispatch arg. The user is NOT prompted to pick a version — the workflow just chose the right one based on history.

**Edge case — multiple scope-nouns in one input** (e.g. "milestone bnao aur usmy phase 1 banao"): take the OUTER/PARENT scope. "Milestone bnao aur usmy phase X" → state-aware-redirect kicks in. If active milestone exists → `/rcode-add-phase` (the inner phase becomes the dispatched action directly). If not → `/rcode-new-milestone $NEXT_VERSION` (the dispatched workflow will create phase 1 internally).

**Edge case — verb without scope-noun** (e.g. "kuch karo", "do something"): do NOT fire this step. Fall through to the normal routing table which can ask for clarification.

**Edge case — explicit override via flag** (`--force-new-milestone`, `--force-new`): bypasses the active-milestone redirect. Use sparingly — usually for emergency hotfix tracks that genuinely need a parallel milestone.

If this step fires, skip the route-step's ambiguity prompt entirely and proceed to display + dispatch.
</step>

<step name="route">
**Match intent to command.**

(Run only after greenfield_guard, external_data_guard, AND explicit_intent_check have all cleared without dispatching.)

Evaluate `$QUESTION` against these routing rules. Apply the **first matching** rule:

| If the text describes... | Route to | Why |
|--------------------------|----------|-----|
| Starting a new project, "set up", "initialize" | `/rcode-new-project` | Needs full project initialization |
| Mapping or analyzing an existing codebase | `/rcode-map-codebase` | Codebase discovery |
| A bug, error, crash, failure, or something broken | `/rcode-debug` | Needs systematic investigation |
| Validate an idea, "working backwards", "press release", "PRFAQ", "is this worth building" | `/rcode-prfaq` | Stress-test concept before committing sprint capacity |
| Brainstorm, generate ideas, "explore options", "what could we do" | `/rcode-brainstorm` | Structured ideation before planning |
| "karpathy", "review changes", "check my diff", "too complex" — 4-principle code audit against a diff | `/rcode-karpathy-audit` | Runs the karpathy-audit workflow directly (review.md has no `--karpathy` flag) |
| Walk through a change, "checkpoint", "explain this diff", "human review" | `/rcode-checkpoint-preview` | Human-in-the-loop diff walkthrough |
| Exploring, researching, comparing, or "how does X work" | `/rcode-research-phase` | Domain research before planning |
| Scope unclear, conflicting UIs/options, "which one", "better UX", "still have confusion", "how should X look", brainstorming vision | `/rcode-discuss-phase` | Decisions not yet locked — gather before planning |
| A complex task: refactoring, migration, multi-file architecture, system redesign | `/rcode-add-phase` | Needs a full phase with plan/build cycle |
| Planning a specific phase, "plan phase N" | `/rcode-plan` | Direct phase-level planning |
| "Sprint planning", "plan the sprint", "next sprint", "what's in this sprint" | `/rcode-sprint-planning` | Sprint-level scope/capacity planning |
| Executing a sprint, "run the sprint", "start sprint", "work on sprint" | `/rcode-execute-sprint` | Sprint execution with wave batching |
| Sprint status, "how is the sprint going", "sprint board", "sprint progress" | `/rcode-sprint-status` | Current sprint state |
| "Create milestones", "plan milestones", "create roadmap", "what milestones do I need", "break project into milestones" | `/rcode-new-milestone` | Roadmap-level planning — designs M1..Mn from the PRD. Do NOT route to `create-epics-and-stories`; that skill decomposes a single milestone into epics |
| Break milestone into epics/stories, "create stories", "user stories", "epics" | `/rcode-create-epics-and-stories` | Milestone → epic → story decomposition (assumes roadmap already exists) |
| Create a single story, "add story", "write a story for X" | `/rcode-create-story` | Single story addition |
| Implement a story, "work on story", "dev story", "build story" | `/rcode-dev-story` | Story-level implementation |
| Find gaps in milestone plans, "gaps in plans", "missing plan", "unplanned phases" | `/rcode-plan-milestone-gaps` | Identify and fill planning gaps |
| Executing a phase, "build phase N", "run phase N", "implement phase" | `/rcode-execute` | Direct phase execution request |
| `/rcode-phase <number>` where number matches an existing phase dir | `/rcode-execute <N>` | User mistyped phase instead of execute — detect bare integer + existing dir, route to execute |
| Running all remaining phases automatically | `/rcode-autonomous` | Full autonomous execution |
| A review or quality concern about existing work | `/rcode-verify-work` | Needs verification |
| "Council", "discuss strategy", "should we" | `/rcode-council` | Multi-agent strategic discussion |
| List plans across phases, "all plans", "show plans" | `/rcode-list-plans` | Cross-phase plan table |
| Checking progress, status, "where am I", "board" | `/rcode-progress` | Status check |
| Resuming work, "pick up where I left off" | `/rcode-resume-work` | Session restoration |
| A note, idea, or "remember to..." | `/rcode-note` | Capture for later |
| Adding tests, "write tests", "test coverage" | `/rcode-add-tests` | Test generation |
| Completing a milestone, shipping, releasing | `/rcode-complete-milestone` | Milestone lifecycle |
| Drift / out-of-date / "verify docs vs code" / "audit feature docs" / "fill out existing PRD/epics/stories" | `/rcode-feature-drift` | Detects PRD↔epics↔stories↔code drift; --fix patches trivial items |
| Bare "audit" / "code review" / re-audit / extend / fill out / expand an existing artifact | `/rcode-audit` | Unified audit entry — disambiguates plans/phase/milestone/UAT/code before dispatching |
| A specific, actionable, small task (add feature, fix typo, update config) | `/rcode-quick` | Self-contained, single executor |
| Market/discovery/greenfield question (from classify) | `/rcode-council` | Needs multi-perspective discovery |

If no rule matches, fall back to the classifier:

```bash
CLASSIFY=$(node ".rcode/bin/rcode-tools.cjs" classify-question "$QUESTION")
```

Parse `type` from JSON — map codebase/team/release → `/rcode-discuss`; market/discovery/greenfield → `/rcode-council`; drift → `/rcode-feature-drift`. Default: `/rcode-discuss`.

**No-route exit (issue #458):** If neither the routing table nor the classifier yields a confident match, you MUST STOP. Print this disambiguation menu via AskUserQuestion and wait:

```
I can't route this cleanly. Pick one:
  1. /rcode-add-phase — if it's a new phase
  2. /rcode-plan — if scope is clear, jump to plan
  3. /rcode-discuss-phase — if you want to think through it first
  4. /rcode-audit — if you want to extend an existing audit/plan
  5. Describe more specifically what you want
```

Do NOT execute the work yourself. Do NOT run grep, find, Read, Bash, or Write to "investigate before routing." If you feel the urge to investigate, the dispatcher contract has already failed — STOP and ask.

**Requires `.planning/` directory:** All routes except `/rcode-new-project`, `/rcode-map-codebase`, `/rcode-help`, `/rcode-discuss`, `/rcode-council`. If the project doesn't exist and the route requires it, suggest `/rcode-new-project` first.

**Ambiguity handling:** If the text could reasonably match multiple routes, ask the user via AskUserQuestion with the top 2-3 options. Prefer `discuss-phase` over `plan`/`add-phase` when scope-uncertainty signals are present ("confusion", "not sure", "which one", "better way", "how should", ≥2 conflicting UIs/options mentioned).

Example:

```
"Refactor the auth system" could be:
1. /rcode-add-phase — Full planning cycle (recommended for multi-file refactors)
2. /rcode-discuss-phase — Gather decisions first (recommended if scope is fuzzy)
3. /rcode-quick — Quick execution (if scope is small and clear)

Which approach fits better?
```
</step>

<step name="display">
**Show the routing decision.**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► ROUTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Input: {first 80 chars of $QUESTION}
Scope: {one-line scope summary}
Routing to: {chosen command}
Reason: {one-line why}
```
</step>

<step name="dispatch">
**Invoke the chosen command via the Skill tool — do NOT just print it as text.**

CRITICAL: The dispatch step is an *action*, not a *display*. You must call the `Skill` tool with `skill: "rcode-{command}"` (and `args:` for any arguments). Printing the slash-command in a code block, in a banner, or in a "Dispatching..." message is NOT dispatch — it is just text rendering, and the routed command will never run. Past failure: model emitted the dispatch banner three times in a row without ever invoking the Skill tool, then stalled.

Canonical form: skills are namespaced with a hyphen, e.g. `rcode-discuss-phase`, `rcode-plan`, `rcode-status`. The colon form `rcode:discuss-phase` is NOT used in this project (avoided for cross-IDE compatibility) — do not display it to users or pass it to the Skill tool.

Rules:
- One Skill tool call per `/rcode-do` invocation. Never emit the same dispatch banner twice.
- Do NOT print `/rcode-{command}` inside a fenced code block as your "action" — that is display-only.
- The routing banner from the `display` step is the ONLY user-facing summary of the dispatch. After it, the very next thing you do is the Skill tool call.

If `AUTO_MODE` is true OR routing is unambiguous:
1. Confirm the routing banner has been shown once (from the `display` step).
2. Immediately call the Skill tool: `Skill(skill: "rcode-{command}", args: "{arguments}")`.
3. Stop. The dispatched command handles everything from here.

Otherwise (ambiguous, non-auto), use AskUserQuestion to confirm:

```
Based on your request, I'd use: /rcode-{command} {arguments}

1. Yes, run it
2. Pick a different route
3. Cancel
```

On "Yes" → call Skill tool as above. On "Pick a different route" → restart routing. On "Cancel" → stop.

If the chosen command expects a phase number and one wasn't provided in the text, extract it from context or ask via AskUserQuestion BEFORE the Skill call.
</step>

</process>

<guardrails>
**Hard prohibitions during /rcode-do execution (issue #458, refined by #1007):**

The steps above (`parse_args`, `check_project`, `auto_init_check`, `greenfield_guard`, `explicit_intent_check`, `persona_shortcut`) legitimately call Bash for structured state/config lookups (`rcode-tools.cjs state load`, `progress init`, `config-get mode`, `classify-question`, milestone/PRD/epic detection via `ls`/`grep`) and Read for the specific persona/capability-table lookup in `persona_shortcut` step 2. That is routing plumbing, not investigation, and is allowed. What's prohibited is using those same tools to figure out the route by inspecting application code, or to do the routed work itself:

- MUST NOT use Bash/Read/Grep/Glob to explore or read application source code to guess what a vague request means. The state/config lookups named above are the only sanctioned uses — anything beyond them (grepping `src/`, reading a feature file to understand behavior, etc.) means the dispatcher contract has failed — STOP and use the no-route exit instead.
- MUST NOT call Write or Edit. The dispatcher never modifies files.
- MUST NOT spawn Task / Agent / subagents. Dispatch is a `Skill` tool call to a routed command — nothing else.
- MUST NOT "do a quick check" of source code before routing. If you feel the urge to grep or read application code to "figure out the right route," the dispatcher contract has already failed — STOP and use the no-route exit.
- If the user's input doesn't match any route and the classifier is ambiguous: invoke the no-route exit menu. Do not "be helpful" by executing the work yourself.

Why this is hard: do.md is a router. The moment it does the work itself (as opposed to looking up state to decide *where to route*), two failure modes appear: (a) the work is duplicated when the user re-invokes the proper command, or (b) the work happens in the wrong context with the wrong subagent and produces inferior output. Both are worse than a 1-second routing prompt.
</guardrails>

<success_criteria>
- [ ] Input validated (not empty)
- [ ] Intent matched to exactly one rcode command
- [ ] Ambiguity resolved via user question (if needed)
- [ ] Scope-uncertainty signals steer to `/rcode-discuss-phase` over planning routes
- [ ] Project existence checked for routes that require it
- [ ] Routing decision displayed before dispatch (exactly once)
- [ ] Command invoked via the Skill tool — NOT printed as text
- [ ] Dispatch banner not repeated (single emission only)
- [ ] No work done directly — dispatcher only
- [ ] No Write/Edit/Task tool calls, and no Bash/Read/Grep/Glob use beyond the sanctioned state/config lookups and persona/capability-table reads
- [ ] On no-route, exit cleanly with the disambiguation menu — never silently fall through to inline work
</success_criteria>
</content>
</invoke>
## Next Up

- `/rcode-status` — check project state if you're not sure what to do
- `/rcode-next` — auto-advance to the next logical step
