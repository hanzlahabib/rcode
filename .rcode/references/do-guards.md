# /rcode-do — routing guards

Read only when the input chains 2+ pipeline stages, pairs a create/add verb with a scope noun (milestone, phase, story, epic, sprint, PRD, roadmap, council), mentions an external system with an audit verb, or targets execute/sprint/epics routes. Referenced from `.rcode/workflows/do.md`. Uses `$HAS_PRD`, `$HAS_EPICS`, `$HAS_PHASES`, `$ACTIVE_MILESTONE`, `$LAST_SHIPPED_VERSION`, `$AUTO_MODE` computed by the workflow.

For the verb/scope vocabulary Read `.rcode/references/verb-dictionary.md`.

**Detect compound/chained requests and preflight the whole chain before dispatching step one.**

`/rcode-do` is a single-dispatch router by design — it normally picks ONE command and hands off. But real input often chains several actions in one sentence (e.g. "scan and init my project & get council decision on X and plan and execute on yolo mode"). If the router just dispatches to the first-matched command and lets each downstream skill discover its own missing prerequisites, the user sees red errors scattered mid-flight instead of one clear picture up front (issue #1034/#1035).

**Detection:** `$QUESTION` matches this step if it contains 2+ pipeline-stage signals joined by `and`/`&`/`then`/`,`. Pipeline-stage signals: `scan`/`map`, `init`, `council`/`decide`/`architect`, `plan`, `execute`/`build`/`implement`/`yolo`.

**If detected, run one consolidated readiness check before dispatching anything:**

```bash
PROJECT_STATUS=$(node .rcode/bin/rcode-tools.cjs project-status 2>/dev/null || echo uninitialized)
```

Using `$PROJECT_STATUS`, `$HAS_PRD`, `$HAS_PHASES` (already computed in `check_project`), and any `--agents=` list the user named, build the ordered stage list implied by the request and check each stage's precondition against state already on hand — do not re-derive it per stage, and do not spawn anything yet:

| Stage (if requested) | Precondition | If unmet |
|---|---|---|
| scan/map | none | always runnable |
| init | none — auto-init guard already ran | always runnable |
| council | none, BUT if the user passed an explicit `--agents=` list, validate every id against the roster now: `sadiq, hussain-pm, waleed, ahmed-hassani, nasser, layla, zahra, haitham, yousef, zayd, fatima, khalid, mariam, noor` | flag unknown ids and show the valid list in the preflight report — do not let council fail on this mid-run |
| plan | a phase must exist (`$PROJECT_STATUS == real` OR `$HAS_PHASES == true`) after council — since council alone does not create a phase | note that `/rcode-add-phase` will run between council and plan to create one |
| execute | a plan (SPRINT.md) must exist for the phase — this is always true after a successful plan stage in the same chain | n/a within a single chain |

Print one consolidated block before touching any subagent:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► CHAIN PREFLIGHT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Detected stages: {ordered list, e.g. scan → init → council → add-phase → plan → execute}
{✓ or ⚠ per stage, with the one-line reason for any ⚠}
{if --agents had unknown ids: "⚠ Unknown agent id(s): {ids}. Valid: {roster list}. Continuing with the corrected/auto-selected panel."}
```

Then dispatch the stages in order via the `Skill` tool, one at a time, re-using this preflight's state instead of letting each stage rediscover it. If a stage's precondition is genuinely unmet and nothing in the chain fixes it (e.g. user asked to `plan` but not `council`/`add-phase` and no phase exists), stop before dispatching that stage and tell the user which single command to run first — do not let it fail loudly mid-chain.

This step does not replace `greenfield_guard` or `explicit_intent_check` below — it only applies when a *chain* is detected. Single-verb requests fall through to those steps as before.

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
| "run the content factory", "cluster keywords", "brief location pages", "audit my SEO" | `HAS_PRD=false` | `/rcode-new-project` | SEO work requires project context — keyword strategy and content architecture are anchored to a specific domain/PROJECT.md |

When the guard fires, print a clear message:

```
⚠ Cannot {requested action}: missing prerequisite — {what's missing}.

Re-routing to: /rcode-{prerequisite-command}
Once that completes, re-run your original request.
```

Then dispatch to the prerequisite command instead of the originally-matched route.

The guard never silently rejects intent — it always either dispatches to a sensible alternative OR explicitly tells the user what flag overrides it (e.g. `--skip-prerequisites` for the rare legitimate use case).

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

**Honor explicit user verbs — skip ambiguity prompts when intent is unambiguous.**

When the user uses a literal create/make/start verb paired with a scope-noun (milestone, phase, story, epic, sprint, plan, PRD, roadmap, council), dispatch IMMEDIATELY. Do not present a multi-route ambiguity menu. The user already chose.

This was a real bug: `/rcode-do "milestone bnao aur ... list down karo"` triggered an ambiguity prompt offering new-milestone vs add-phase vs create-epics-and-stories — even though the user literally said "milestone bnao" (= "create a milestone" in Roman Urdu). That second-guessing wasted the user's time and broke trust.

**Verb + scope detection — sourced from `.rcode/references/verb-dictionary.md`.**

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
