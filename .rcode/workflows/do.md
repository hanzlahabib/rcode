<purpose>
Analyze freeform text and route it to the best rcode command. A dispatcher: it never does the work itself. Match intent, confirm when ambiguous, hand off. This file is only the router; the long branches live in references that you Read on demand (paths below carry no `@` on purpose, so they cost nothing until read).
</purpose>

<process>

<step name="init_check">
If `.rcode/config.yaml` does not exist, Read `.rcode/references/auto-init-guard.md`, run its inline init flow, then continue. Otherwise skip it.
</step>

<step name="parse_args">
```bash
AUTO_MODE=false
QUESTION="$ARGUMENTS"
if [[ "$ARGUMENTS" == *"--auto"* ]]; then
  AUTO_MODE=true
  QUESTION=$(echo "$ARGUMENTS" | sed 's/--auto[[:space:]]*//' | xargs)
fi
# Users say "yolo mode" / "autonomous mode" in free text far more than they type --auto.
if echo "$ARGUMENTS" | grep -qiE '(\byolo\b|\bautonomous(ly)? mode\b|\bno pauses?\b|\bwithout (asking|stopping|pausing)\b)'; then
  AUTO_MODE=true
fi
CONFIG_MODE=$(node .rcode/bin/rcode-tools.cjs config-get mode 2>/dev/null || echo "guided")
if [[ "$CONFIG_MODE" == "yolo" ]]; then AUTO_MODE=true; fi
```
</step>

<step name="branch_shortcuts" priority="first-match">
- `$QUESTION` starts with `@` (`@persona CODE`): Read `.rcode/references/do-persona.md`, follow it, and stop here.
- `$QUESTION` is empty: AskUserQuestion with this menu. 1-12 invoke the command; 13 captures free text and continues; 0 prints `Cancelled.` and STOPS.
  1 Quick task (/rcode-quick) · 2 Plan a phase (/rcode-plan) · 3 Execute a phase (/rcode-execute) · 4 Verify a phase (/rcode-verify-phase) · 5 Ship a PR (/rcode-ship) · 6 Check status (/rcode-status) · 7 Next step (/rcode-next) · 8 Debug an issue (/rcode-debug) · 9 Discuss a phase (/rcode-discuss-phase) · 10 Resume paused work (/rcode-resume-work) · 11 Add a note (/rcode-note) · 12 Convene the council (/rcode-council) · 13 Something else, describe it · 0 Cancel
</step>

<step name="check_project">
State flags used by the routes and guards (cheap file checks; do not read state.json):

```bash
HAS_PRD=$( ( ls .planning/prd.md .planning/PRD.md .planning/prds/*.md .planning/milestones/*/PRD.md 2>/dev/null | head -1 ) && echo true || echo false)
HAS_EPICS=$( ( ls .planning/epics.md .planning/EPICS.md .planning/epics/*.md .planning/milestones/*/EPICS.md 2>/dev/null | head -1 ) && echo true || echo false)
PHASE_COUNT=$(node ".rcode/bin/rcode-tools.cjs" progress init 2>/dev/null | python3 -c "import sys,json;print(json.load(sys.stdin).get('phase_count',0))" 2>/dev/null || echo 0)
HAS_PHASES=$([ "$PHASE_COUNT" -gt 0 ] && echo true || echo false)
ACTIVE_MILESTONE=$(grep -m1 '^## Current Milestone' .planning/PROJECT.md 2>/dev/null | sed 's/^## Current Milestone[: ]*//' | xargs)
LAST_SHIPPED_VERSION=$(grep -m1 -oE 'v[0-9]+\.[0-9]+' .planning/MILESTONES.md 2>/dev/null | head -1)
```
</step>

<step name="guards" priority="first-match">
Read `.rcode/references/do-guards.md` and apply it BEFORE the routing table when ANY of these hold; otherwise skip it:
- the input chains 2+ pipeline stages (scan, init, council, plan, execute/build/yolo) joined by and/&/then/commas;
- a create/add verb (English, Roman Urdu/Hindi, Arabic transliteration) pairs with milestone, phase, story, epic, sprint, PRD, roadmap or council;
- an external system (sentry, datadog, analytics, jira, linear, ...) pairs with audit/triage/cleanup;
- the likely route is `/rcode-execute`, `/rcode-sprint-planning`, `/rcode-create-epics-and-stories` or `/rcode-new-milestone` (prerequisite check).

If the input concerns SEO, schema, backlinks, AI search, local SEO, content generation, or Next.js/React/LLM best practices, Read `.rcode/references/do-routing-extras.md` instead of using the table below.
</step>

<step name="route">
Apply the FIRST matching row.

| If the text describes... | Route to | Why |
|--------------------------|----------|-----|
| Starting a new project, "set up", "initialize" | `/rcode-new-project` | Full project initialization |
| Mapping or analyzing an existing codebase | `/rcode-map-codebase` | Codebase discovery |
| A bug, error, crash, failure, something broken | `/rcode-debug` | Systematic investigation |
| Validate an idea, "PRFAQ", "is this worth building" | `/rcode-prfaq` | Stress-test a concept |
| Brainstorm, "explore options", "what could we do" | `/rcode-brainstorm` | Structured ideation |
| "karpathy", "check my diff", "too complex" | `/rcode-karpathy-audit` | 4-principle diff audit |
| "be lazy", "simplest solution", "yagni", "over-engineered", "kam code likho" | `/rcode-lazy` | Simplicity lens before code is written |
| "checkpoint", "explain this diff", "human review" | `/rcode-checkpoint-preview` | Diff walkthrough |
| Researching, comparing, "how does X work" | `/rcode-research-phase` | Research before planning |
| Unclear scope, conflicting options, "which one", "how should X look" | `/rcode-discuss-phase` | Decisions not locked yet |
| Image/screenshot/mockup + "build this", no live URL | `/rcode-ui-phase --image <path>` | UI-SPEC from the image; not clone-website (needs a URL) |
| Live URL + "clone this site", "pixel-perfect clone" | `rcode-clone-website` | Live-DOM clone |
| Refactor, migration, multi-file architecture, redesign | `/rcode-add-phase` | Needs a phase with plan/build cycle |
| "plan phase N" | `/rcode-plan` | Phase planning |
| "sprint planning", "next sprint" | `/rcode-sprint-planning` | Sprint scope |
| "run the sprint", "start sprint" | `/rcode-execute-sprint` | Sprint execution |
| "sprint status", "sprint board" | `/rcode-sprint-status` | Sprint state |
| "create milestones", "roadmap", "plan milestones" | `/rcode-new-milestone` | Roadmap-level planning (not create-epics-and-stories) |
| "epics", "user stories", break milestone down | `/rcode-create-epics-and-stories` | Milestone to epics to stories |
| "add story", "write a story for X" | `/rcode-create-story` | Single story |
| "work on story", "dev story" | `/rcode-dev-story` | Story implementation |
| "gaps in plans", "unplanned phases" | `/rcode-plan-milestone-gaps` | Fill planning gaps |
| "build phase N", "run phase N", "implement phase" | `/rcode-execute` | Phase execution |
| `/rcode-phase <N>` where phase dir N exists | `/rcode-execute <N>` | Mistyped phase for execute |
| "run all remaining phases" | `/rcode-autonomous` | Autonomous execution |
| A review or quality concern about existing work | `/rcode-verify-work` | Verification |
| "council", "should we", "discuss strategy" | `/rcode-council` | Multi-agent discussion |
| "all plans", "show plans" | `/rcode-list-plans` | Cross-phase plans |
| "where am I", "status", "board" | `/rcode-progress` | Status check |
| "pick up where I left off" | `/rcode-resume-work` | Session restore |
| A note, idea, "remember to..." | `/rcode-note` | Capture |
| "write tests", "test coverage" | `/rcode-add-tests` | Test generation |
| Complete/ship/release a milestone | `/rcode-complete-milestone` | Milestone lifecycle |
| Drift, "verify docs vs code", "fill out existing PRD/epics" | `/rcode-feature-drift` | PRD/epics/stories/code drift |
| Bare "audit" / "code review" / extend an existing artifact | `/rcode-audit` | Unified audit entry |
| A small, specific task (add feature, fix typo, update config) | `/rcode-quick` | Single executor |
| Market/discovery/greenfield question | `/rcode-council` | Multi-perspective discovery |

If no rule matches, classify: `node ".rcode/bin/rcode-tools.cjs" classify-question "$QUESTION"` and map `type`: codebase/team/release -> `/rcode-discuss`; market/discovery/greenfield -> `/rcode-council`; drift -> `/rcode-feature-drift`; default `/rcode-discuss`.

**No-route exit:** if neither the table nor the classifier is confident, STOP and ask via AskUserQuestion: add-phase / plan / discuss-phase / audit / describe more specifically. Never investigate source code to guess a route.

**Profile check:** before dispatching, confirm `.claude/commands/rcode-<command>.md` exists. If it does not, print `/rcode-<command> is not in your install profile (minimal). Add everything: rcode install --profile full` and stop.

**Requires `.planning/`:** every route except new-project, map-codebase, help, discuss, council; otherwise suggest `/rcode-new-project` first. **Ambiguity:** ask with the top 2-3 options; prefer discuss-phase over plan/add-phase when scope-uncertainty signals are present.
</step>

<step name="display_and_dispatch">
Print once:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► ROUTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Input: {first 80 chars of $QUESTION}
Routing to: {chosen command}
Reason: {one line}
```

For `/rcode-execute` or `/rcode-add-phase`, read the cache `node .rcode/bin/rcode-tools.cjs config-get workflow._herdr_available`; if `true`, add one `Note:` line that herdr multi-agent orchestration will be offered (confirmation is required downstream). Never probe herdr or call `config-set` here.

Dispatch is a `Skill` tool call, not text: `Skill(skill: "rcode-{command}", args: "{arguments}")`, hyphen form only, exactly one call, banner shown once. If `AUTO_MODE` or the route is unambiguous, call it immediately. Otherwise AskUserQuestion first: "I'd use /rcode-{command} {arguments}: 1 Yes, run it · 2 Pick a different route · 3 Cancel". If the command needs a phase number that is not in the text, ask for it BEFORE the Skill call.
</step>

</process>

<guardrails>
Allowed Bash/Read: the state/config lookups above, `.rcode/references/do-*.md`, and the persona agent file. Prohibited: reading or grepping application source to guess a route; Write or Edit; spawning Task/Agent/subagents; doing the routed work yourself. If you feel the urge to investigate, the dispatcher contract has failed: use the no-route exit.
</guardrails>

<success_criteria>
- [ ] Intent matched to exactly one rcode command (or no-route exit taken)
- [ ] Guard references read only when their trigger condition held
- [ ] Routing banner shown once, then one Skill tool call
- [ ] No work done directly; no Write/Edit/Task calls
</success_criteria>
