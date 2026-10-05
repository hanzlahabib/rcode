# plan - step 05: Handle planner return, phase-split recommendation, initial plan commit, specialist review panel

This step file was split verbatim out of `workflows/plan.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

## 9. Handle Planner Return

- **`## PLANNING COMPLETE`:** Display plan count. Compute `SPRINT_COUNT` and `EFFORT_TIER_SKIP_VERIFY` below (Sprint count guard + Post-Plan Effort-Tier Gate) BEFORE evaluating this line. If `--skip-verify` or `plan_checker_enabled` is false (from init) or `EFFORT_TIER_SKIP_VERIFY` is `true`: skip to step 13. Otherwise: step 10.
- **`## PHASE SPLIT RECOMMENDED`:** The planner determined the phase is too complex to implement all user decisions without simplifying them. Handle in step 9b.
- **`## CHECKPOINT REACHED`:** Present to user, get response, spawn continuation (step 12)
- **`## PLANNING INCONCLUSIVE`:** Show attempts, offer: Add context / Retry / Manual

**Sprint count guard (token cost protection):**

After planner returns `## PLANNING COMPLETE`, immediately count sprint files:

```bash
MAX_SPRINTS=$($TOOL config-get workflow.max_sprints_per_phase 2>/dev/null)
MAX_SPRINTS=${MAX_SPRINTS:-4}  # config-get exits 0 with empty output when key absent
SPRINT_COUNT=$(find "${PHASE_DIR}" -maxdepth 1 -name "*-SPRINT.md" | wc -l | tr -d ' ')
```

**Post-Plan Effort-Tier Gate (#950):** Apply `plan-effort-tier.md` § Post-Plan
Gate now (already loaded into context at step 4.5) to compute
`EFFORT_TIER_SKIP_VERIFY` from `SPRINT_COUNT`, `RISK_KEYWORDS_FOUND`, and
`FILE_OWNERSHIP_COLLISIONS` (from step 8.5). This only ever fires when
`SPRINT_COUNT == 1` — it cannot change behavior for the 2-3 sprint case,
which is today's unmodified default pipeline.

If `SPRINT_COUNT > MAX_SPRINTS`:

```
⚠ Phase {N}: Planner created {SPRINT_COUNT} sprint files (limit: {MAX_SPRINTS}).
  This phase is too large — the sprint-checker will be expensive and revision
  loops will multiply the cost.

  Recommended: split this phase into two using /rcode-plan --split {N}

Options:
  1. Split phase now (recommended)
  2. Continue anyway (accept higher token cost)
  3. Re-plan with explicit 4-sprint limit
```

In `mode: yolo` / autonomous: auto-select option 3 (re-plan with limit). Do not halt or ask.

Re-plan prompt appended: `"IMPORTANT: Create at most {MAX_SPRINTS} SPRINT.md files. Merge smaller tasks into the nearest related sprint instead of creating new ones."`

## 9b. Handle Phase Split Recommendation

When the planner returns `## PHASE SPLIT RECOMMENDED`, it means the phase has too many decisions to implement at full fidelity within the plan budget. The planner proposes groupings.

**Extract from planner return:**
- Proposed sub-phases (e.g., "17a: processing core (D-01 to D-19)", "17b: billing + config UX (D-20 to D-27)")
- Which D-XX decisions go in each sub-phase
- Why the split is necessary (decision count, complexity estimate)

**Present to user:**
```
## Phase {X} is too complex for full-fidelity implementation

The planner found {N} decisions that cannot all be implemented without
simplifying some. Instead of reducing your decisions, we recommend splitting:

**Option 1: Split into sub-phases**
- Phase {X}a: {name} — {D-XX to D-YY} ({N} decisions)
- Phase {X}b: {name} — {D-XX to D-YY} ({M} decisions)

**Option 2: Proceed anyway** (planner will attempt all, quality may degrade)

**Option 3: Prioritize** — you choose which decisions to implement now,
rest become a follow-up phase
```

Use AskUserQuestion with these 3 options.

**If "Split":** Use `/rcode-insert-phase` to create the sub-phases, then replan each.
**If "Proceed":** Return to planner with instruction to attempt all decisions at full fidelity, accepting more plans/tasks.
**If "Prioritize":** Use AskUserQuestion (multiSelect) to let user pick which D-XX are "now" vs "later". Create CONTEXT.md for each sub-phase with the selected decisions.

## 9.4. Commit Initial Plan (crash-resilience checkpoint, #recovery-hardening)

**Why this step exists.** `rcode-planner` already wrote `*-SPRINT.md` to disk in
step 9 — that write survives independently of this orchestrating session. But
nothing commits it, and everything from here through step 13 (specialist
review panel, sprint-checker, up to 3 revision iterations) can run for hours
(step 9.5's own docs cite "the first hour of specialist review" on a single
phase) as pure in-context orchestration with no further disk writes until a
revision re-invokes the planner. If this session's connection drops anywhere
in that window, the freshly-planned SPRINT.md sits untracked and easy to lose
(a stray `git clean`, a `git checkout .` from a confused resume, or simply a
fresh session with no idea unrecorded work exists) — the file existing on disk
is not the same as it being safe. Commit it now, before the expensive review
loop begins:

```bash
if [ "${commit_docs}" = "true" ]; then
  git add ${PHASE_DIR}/*-SPRINT.md
  git commit -m "docs(phase-${PHASE_NUMBER}): initial plan — ${SPRINT_COUNT} sprint(s), pre-review checkpoint"
fi
```

Skip silently if `commit_docs` is `false` (project keeps `.planning/` local —
see step 0's config load). This is a plain commit, not a push — it stays
local exactly like every other artifact this workflow produces, and later
steps (9.5 panel findings baked into a revision, the step 12 revision loop,
the final step 13b) still get their own commit(s) below so nothing here
replaces the final "planning complete" record.

## 9.5. Specialist Review Panel (domain-routed)

**Why this step exists.** Until now one generalist (`rcode-planner`) produced the
entire plan and one generalist (`rcode-sprint-checker`) graded it against the
phase goal. Nobody asked *"is this design wrong"* or *"what will this guard
miss"*. Confirmed live on a real project: nine phases planned and shipped this
way, and the first hour of specialist review found an inert RLS backstop, an
authorization mutation with no relationship check, a core feature whose only
importer was its own test, and real personal data committed to the repo. The
sprint-checker missed all four because none of them is a goal-coverage question.

**Skip only if:** `specialist_review_enabled` from the INIT JSON is `false`
(set `workflow.specialist_review: false` in `.rcode/config.yaml`; absent key =
enabled), or `--no-panel` was passed. In
autonomous/yolo mode this step is **NOT skippable** — yolo removes the human
mid-loop check, so plan-time review is the only review left.

### 9.5a — Pick the panel

**You route this, from context — not from a keyword table.** Read the evidence
first, then decide:

1. The plans' `<files>` fields — every path this phase will actually touch.
2. Migrations, schema files, and config the plans create or alter.
3. CONTEXT.md decisions (D-XX) and the phase goal.
4. The installed roster and what each persona actually owns:
   ```bash
   node ".rcode/bin/rcode-tools.cjs" list-agents
   ```

Then pick the domain seats by asking, per candidate: *given these files and
these decisions, does this persona's lens see something the others cannot?* If
the answer is no, do not seat them.

Run the keyword scorer as **one input, never the verdict**:

```bash
node ".rcode/bin/rcode-tools.cjs" select-panel \
  "${PHASE_GOAL}. ${CONTEXT_DECISIONS_SUMMARY}" --explain
```

It is a weighted keyword table, so it routes on the words the phase text happens
to use, not on what the phase touches — a phase full of `drizzle/*.sql` RLS
policies that never writes the word "security" scores near zero for the security
lens. That is the same enumerate-a-location shape this panel exists to hunt for,
so treat a high score as corroboration and a zero score as no information.

**When your reading and the scorer disagree, your reading wins — and you must
say so in the panel report**: which persona you seated or dropped against the
score, and the file or decision that made you do it. A routing override with no
stated reason is indistinguishable from a coin flip.

Panel composition:

- **Always include `rcode-waleed`** (architecture lens) — the "is this design
  wrong" seat. Every phase gets it.
- **Always include `rcode-fatima`** (quality lens) — the "what will this guard
  miss" seat. Every phase gets it.
- **Plus 1-2 domain personas** chosen by the reading above. Seat a persona only
  when you can name the file, migration, or decision that needs their lens. A
  seat filled to reach a quota costs tokens and adds nothing.

Cap the panel at 4. If nothing in the plans needs a third lens, the two standing
seats ARE the panel — a correct outcome, not a failure to route.

### 9.5b — Run the panel in parallel

Spawn all panel members in a single message so they run concurrently. Each gets
the same narrow contract:

```
You are reviewing SPRINT plans BEFORE execution, through your lens only.

Read: {PHASE_DIR}/*-SPRINT.md, {PHASE_DIR}/CONTEXT.md, ROADMAP.md phase {N}.

Return ONLY blocking issues — things that would make the executed phase wrong,
unsafe, or unverifiable. Not style, not preferences, not "consider also".
For each issue: what is wrong, the file:line or task id it lives in, and the
specific change that fixes it.

Two questions you MUST answer explicitly, even if the answer is "none":
  1. Which task in this plan enumerates a LOCATION where it should derive from a
     PROPERTY? (a glob, a single filename, one role, one directory) — that shape
     is how a guard ends up green while pointing where the problem is not.
  2. Which delivered module would have no production importer after this phase
     executes — reachable only from its own test?

If you have no blocking issues, return exactly: NO BLOCKING ISSUES.
Do not restate the plan. Do not summarize. {response_language pass-through}
```

### 9.5c — Handle panel return

- All members return `NO BLOCKING ISSUES` → proceed to step 10.
- Any blocking issue → feed it into the **existing revision loop (step 12)**
  alongside the checker's issues. Do not build a second revision mechanism.
- Panel issues and checker issues are deduped by task id before re-spawning the
  planner.

Report to the user which agents sat on the panel and what each blocked on — a
silent panel is indistinguishable from a skipped one.

### 9.5d — Carry the panel's domain seat into `owner:`

The panel just picked a domain persona by reading this phase's actual files,
migrations, and decisions. **That selection is the execution owner** — pass it to
the planner so each SPRINT.md carries `owner: {persona-id}` in its frontmatter,
and `execute-sprint.md`'s `owner_agent_resolution` spawns that persona instead of
the generic `rcode-executor`.

Without this step the chain breaks in the middle: the panel seats the right
specialists, they find real problems, and then every sprint is handed to a
generic executor — plan-time expertise that never reaches the implementation.

Only the engineer personas can own a sprint (`haitham`, `hanzla`, `omar`,
`waleed`, `yousef`). If the panel's domain seat was advisory-only (Fatima,
Sadiq), or the panel was the two standing seats alone, leave `owner:` unset —
`rcode-executor` is the correct default. **Do not invent an owner to fill the
field**; an absent `owner:` is safe, a wrong one sends the work to someone whose
lens does not fit it.

Next: Read `.rcode/workflows/plan/steps/06-checker-revision.md` before starting it (skip it if its Read-when condition is false).
