# AUDIT — `/rcode-plan` Dispatch Integrity

**Scope:** `rcode/workflows/plan.md` (1000 lines) + `rcode/commands/plan.md` + every file it `@`-includes, checked against the three dispatch defects already confirmed for `/rcode-execute` and `/rcode-dev-story` in issues #1003/#1004/#1005.

**Verdict: plan.md is clean on all three counts.** No evidence of false persona dispatch, no `dev-story.md` reference, no dead command references.

---

## What was checked

`rcode/commands/plan.md` is a 20-line wrapper (`Read, Write, Glob, Grep, Bash, Agent` tools) that does nothing but `@`-include `rcode/workflows/plan.md` and tell the model to execute it end-to-end (`rcode/commands/plan.md:13,17`). It does not diverge from the workflow file — there is no second, inconsistent copy of the planning logic the way there was for execute/dev-story.

`plan.md` pulls in 11 files via `@.rcode/...` include syntax (`rcode/workflows/plan.md:44-53,224,231,285,406`):

```
references/auto-init-guard.md
references/karpathy-guidelines.md
references/output-format.md
references/plan-gaps-mode.md
references/plan-thinking-partner.md
references/plan-windows-troubleshooting.md
references/thinking-models-planning.md
references/ui-brand.md
workflows/plan-prd-express.md
workflows/plan-research-validation.md
workflows/plan-spawn-planner.md
```

All 11 exist on disk (verified with `ls`, mapping the installed `.rcode/` prefix back to source `rcode/`). One further nested reference, `references/karpathy-guidelines-full.md` (pointed to from `karpathy-guidelines.md:4`), also exists. No missing includes anywhere in the call graph.

Grepped this full file set (plan.md + all 11 includes) for the three specific defect patterns.

---

## 1. Engineer-persona false dispatch — NOT PRESENT

`grep -niE "rcode-hanzla|rcode-yousef|rcode-haitham|rcode-omar|rihal-hanzla|rihal-yousef|rihal-haitham|rihal-omar"` across `plan.md` and all 11 includes: **zero matches**.

`plan.md`'s `<available_agent_types>` block (`rcode/workflows/plan.md:56-61`) declares exactly three subagents:

```
- rcode-phase-researcher — Researches technical approaches for a phase
- rcode-planner — Creates detailed plans from phase scope
- rcode-sprint-checker — Reviews plan quality before execution
```

Every `Task(...)` call in the pipeline uses one of these three `subagent_type` values, with no others appearing anywhere:

| Location | subagent_type |
|---|---|
| `rcode/workflows/plan.md:586` | `rcode-sprint-checker` (step 10, initial check) |
| `rcode/workflows/plan.md:693` | `rcode-planner` (step 12, revision loop) |
| `rcode/workflows/plan-spawn-planner.md:353` | `rcode-planner` (step 8, first plan) |
| `rcode/workflows/plan-research-validation.md:113` | `rcode-phase-researcher` (step 5, research) |

Each of these three agents has a real `.md` definition under `rcode/agents/` (`rcode-planner.md`, `rcode-phase-researcher.md`, `rcode-sprint-checker.md`) with `tools:` frontmatter that matches what the workflow asks them to do — `rcode-planner` and `rcode-phase-researcher` both carry `Write` (they produce `SPRINT.md`/`RESEARCH.md`), `rcode-sprint-checker` is read-only (`Read, Bash, Glob, Grep`, no `Write`) because it only verifies. Unlike the engineer personas, there is no separate "skill" wrapper under `rcode/skills/` for any of these three names that could misrepresent the dispatch as something it isn't — `find rcode/skills -iname "*planner*" -o -iname "*phase-researcher*" -o -iname "*sprint-checker*"` returns nothing. The `Task()` call is the only description of how these agents run, and it matches reality.

Two `Skill()` calls also appear in the pipeline (auto-advance and UI-phase branch-off): `Skill(skill="rcode-execute", ...)` (`rcode/workflows/plan.md:872`) and `Skill(skill="rcode-ui-phase", ...)` (`rcode/workflows/plan-research-validation.md:220`). Both target real, existing commands (`rcode/commands/execute.md`, `rcode/commands/ui-phase.md`), and the workflow explicitly documents *why* `Skill()` is used instead of `Task()` here — to avoid nested-Task runtime freezes (`rcode/workflows/plan.md:869`) — rather than silently mischaracterizing the dispatch mechanism.

**Conclusion:** plan.md's planning-to-execution handoff never claims or implies that named engineer personas are involved. The only "next step" toward execution is the `/rcode-execute` routing in `<offer_next>` (`rcode/workflows/plan.md:952-959`) and the auto-advance `Skill(skill="rcode-execute", ...)` call — both correctly pointed at the real execute command, not at any persona.

---

## 2. `dev-story.md` reference — NOT PRESENT

`grep -niE "dev-story"` across `plan.md` and all 11 includes: **zero matches**.

`plan.md` has no code path that hands off to `dev-story` at all — its only downstream target is `/rcode-execute` (`<offer_next>`, `rcode/workflows/plan.md:952-959,996-1000`) and, in gaps/reviews branches, back to itself or to `/rcode-review`. The dead-command problem confirmed for `/rcode-dev-story` (pointing at a dead `/rcode-*` command) has no analog here because plan.md never mentions dev-story in the first place.

---

## 3. Dead command references — NOT PRESENT

Every `/rcode-*` reference in `plan.md` and its 11 includes was extracted and checked against `rcode/commands/*.md`:

| Referenced command | Exists under `rcode/commands/` |
|---|---|
| `/rcode-add-phase` | ✓ `add-phase.md` |
| `/rcode-complete-milestone` | ✓ `complete-milestone.md` |
| `/rcode-debug` | ✓ `debug.md` |
| `/rcode-discuss-phase` | ✓ `discuss-phase.md` |
| `/rcode-do` | ✓ `do.md` |
| `/rcode-execute` | ✓ `execute.md` |
| `/rcode-init` | ✓ `init.md` |
| `/rcode-insert-phase` | ✓ `insert-phase.md` |
| `/rcode-new-milestone` | ✓ `new-milestone.md` |
| `/rcode-new-project` | ✓ `new-project.md` |
| `/rcode-next` | ✓ `next.md` |
| `/rcode-plan` | ✓ `plan.md` (self) |
| `/rcode-progress` | ✓ `progress.md` |
| `/rcode-quick` | ✓ `quick.md` |
| `/rcode-research-phase` | ✓ `research-phase.md` |
| `/rcode-review` | ✓ `review.md` |
| `/rcode-status` | ✓ `status.md` |
| `/rcode-ui-phase` | ✓ `ui-phase.md` |
| `/rcode-verify-phase` | ✓ `verify-phase.md` |

All 19 resolve to real command files. No dead references.

Two additional near-matches were checked and ruled out as false positives:
- `/rcode-alternative-1` / `/rcode-alternative-2` in `rcode/references/output-format.md:290-291` are template placeholder text inside a generic "Next Up Block" formatting example (`{Identifier}`-style docs), not real command references intended to resolve to anything.
- `/rcode-tools` matches are all `node ".rcode/bin/rcode-tools.cjs" ...` CLI invocations of the bundled tools script, not slash-command references — `rcode-tools.cjs` exists at `rcode/bin/rcode-tools.cjs` and is a real file, just not a command.

---

## Why plan.md didn't inherit the execute/dev-story defects

The root cause behind #1003/#1004 was that the engineer-persona *skill* files (`rcode-hanzla-engineer`, etc.) describe themselves as spawning real Task-tool subagents, while `/rcode-execute`'s actual dispatch logic only ever calls a generic `rcode-executor`, leaving the personas as session-local roleplay whose `.claude/agents/*.md` twins are under-provisioned (no `Write`/`Edit`). `/rcode-plan` has no equivalent indirection: its three declared agents (`rcode-phase-researcher`, `rcode-planner`, `rcode-sprint-checker`) are dispatched directly by name via `Task(subagent_type=...)`, have no separate "persona" skill layer making competing claims, and their tool grants line up with what the workflow asks them to produce. `#1005`'s defect (`/rcode-dev-story` pointing at a dead command) also has no analog because `plan.md` never references `dev-story` or any command outside `rcode/commands/`.

---

## Method

All findings were produced by direct `grep`/`ls`/`find` against the checked-out source tree (`rcode/workflows/plan.md`, `rcode/commands/plan.md`, `rcode/agents/*.md`, `rcode/commands/*.md`, `rcode/skills/`) in this worktree — no claim in this report is inferred from documentation or naming convention alone.
