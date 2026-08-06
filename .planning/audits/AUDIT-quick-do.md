# Audit: quick.md / do.md dispatch integrity

**Scope:** Does `rcode/workflows/quick.md` or `rcode/workflows/do.md` share the dispatch problems already confirmed for `/rcode-execute`, engineer personas, and `/rcode-dev-story` (GH issues #1003, #1004, #1005 in hanzlahabib/rcode)? Specifically:

1. Does `do.md`'s persona keyword table (`hanzla`/`dev`/`engineer` → `rcode-hanzla`) ever actually spawn a `Task()` subagent, or is it inline roleplay presented as a real dispatch?
2. Does `quick.md`'s trivial-inline mode ever falsely claim an engineer/persona is engaged?

**Method:** Read both files end to end, plus `do.md`'s `required_reading` includes and the `rcode-hanzla` agent file. All claims below are grep/line-anchored against the repo state at commit `1c48786` on branch `audit-quick`. No code was modified.

**Verdict:** `quick.md` is clean on the specific question asked. `do.md` is **not** clean — it reproduces the same "presented-as-real-dispatch, actually-inline" pattern found in #1003/#1004, and additionally contains internal contradictions between its own `<guardrails>` block and its own `<process>` steps that are independent of the persona question.

---

## 1. `do.md` — persona keyword table exists, is gated, and never spawns `Task()`

**The table exists as described:**

```
rcode/workflows/do.md:58
| `hanzla`, `dev`, `engineer` | Hanzla | rcode-hanzla |
```

This lives inside the `persona_shortcut` step (`do.md:38-86`), part of the `@persona CODE` "deterministic API surface" — e.g. `@hanzla DS`.

**Important scoping correction:** this table is **not** a fuzzy free-text router. It only fires when the input literally starts with `@<persona>` (`do.md:85`: *"If this step does NOT fire (no `@` prefix), continue to validate."*). Casual mentions of "hanzla" or "engineer" in a plain-English request do **not** hit this table — they fall through to the normal `route` step (`do.md:279-374`), which has no persona routes at all; every row there maps to a `/rcode-*` workflow command, never to a persona ID. So the specific failure mode from #1003 (routing "implement this" style requests to a persona) is not reachable via `do.md`'s fuzzy path — only via the explicit `@hanzla CODE` syntax.

**Confirmed: `do.md` never calls `Task()` or `Agent()`, anywhere, for any route, including persona shortcuts.**

```bash
$ grep -n "Task(\|Agent(" rcode/workflows/do.md
# (no output — zero matches)
```

The file's own guardrails make this explicit and absolute:

```
rcode/workflows/do.md:429
- MUST NOT spawn Task / Agent / subagents. Dispatch is a Skill tool call to a routed command — nothing else.
```

So to directly answer the audit question: **invoking `@hanzla DS` never spawns a real `Task()` subagent.** Per `persona_shortcut` step behavior (`do.md:63-76`):

```
do.md:66  2. Read the persona's agent file at `.claude/agents/{agent-id}.md`...
do.md:67  3. Look up the CODE in the Capabilities table. If found, the table row's
          "Skill / workflow" column tells you which sub-command to invoke...
do.md:74  5. Dispatch directly via the routing banner. ...
```

it reads the persona's markdown file for its capability table, then dispatches via the `Skill` tool (`do.md:405`: `Skill(skill: "rcode-{command}", args: "{arguments}")`) to whatever workflow that capability code maps to. That is a workflow-command dispatch, not a subagent spawn — same mechanism the file uses for every other route.

**Where `@hanzla DS` actually goes — confirmed against the live persona file** (`rcode/agents/rcode-hanzla.md:36-43`, which the persona_shortcut step reads at `do.md:66`):

```
| Code | Description                                    | Skill / workflow                    |
|------|-------------------------------------------------|--------------------------------------|
| DS   | Execute a single dev story                       | rcode-dev-story                     |
| IS   | Implement a story under a sprint                  | rcode-create-story → dev-story chain|
| BF   | Bug-fix with regression test                      | inline                              |
| RF   | Incremental refactor                              | inline                              |
| KA   | Karpathy-style audit of recent changes            | rcode-karpathy-audit                |
| CR   | Self-review changes before opening a PR           | rcode-review                        |
```

So `@hanzla DS` — the code you'd expect an engineer-persona invocation to actually use — dispatches straight into `/rcode-dev-story`, which is already confirmed elsewhere in this audit series (issue context, claim c) to "never spawn anything and point at a dead `/rcode` command." **The persona keyword table in `do.md` is a second entry point into that already-broken path.** `BF` and `RF` map to the literal string `inline`, which `do.md` has no defined handling for (see §2 below) — that ambiguity is a separate bug, not evidence of a real spawn.

---

## 2. `do.md` — required reading actively misrepresents the mechanism as a real subagent spawn

This is the concrete instance of the #1004 pattern living inside `do.md` itself, not just inherited from the persona skill files.

`do.md`'s `required_reading` block pulls in a file specifically about announcing subagent hand-offs:

```
do.md:9   @.rcode/references/dispatch-banner.md
```

That file states its own applicability up front:

```
.rcode/references/dispatch-banner.md:3   Purpose: every time a rcode workflow spawns a sub-agent (mapper,
                                          planner, executor, council member, etc.), the user must see WHO
                                          is taking over, in their voice...
.rcode/references/dispatch-banner.md:5   This banner format is mandatory for every `Task(subagent_type=...)`
                                          invocation in any rcode workflow.
```

It includes an explicit persona registry row for the exact agent the audit asked about:

```
.rcode/references/dispatch-banner.md:30   | `rcode-hanzla` | Hanzla | Senior Full-Stack Engineer | ⚡ |
```

And it defines a mandatory first-person banner for that spawn (`dispatch-banner.md:45-67`):

```
السلام عليكم — I'm {Persona-first-name}, your {short role}.
{One-sentence first-person statement of what this agent will do...}
Working now — I'll surface anything I'm unsure about before returning.
```

`do.md`'s `persona_shortcut` step then instructs, verbatim: *"Dispatch directly via the routing banner"* (`do.md:74`). "Dispatch banner" is not a generic term here — it is the literal name of the required-reading file whose entire content is scoped to `Task(subagent_type=...)` spawns. Nothing in `do.md` disambiguates this from the plain `ROUTING` banner defined in its own `display` step (`do.md:376-389`, which prints `Routing to: {chosen command}` — a command name, not a persona).

The result: `do.md` is instructed to either (a) print a persona-voiced "I'm Hanzla... Working now" banner that `dispatch-banner.md` explicitly reserves for real `Task()` spawns, while its own guardrails (`do.md:429`) forbid ever calling `Task()` — the same false-appearance-of-dispatch problem confirmed in #1004, reachable directly through `do.md`'s own required reading and its own persona table — or (b) the `dispatch-banner.md` required-reading is simply dead weight loaded into every `/rcode-do` invocation with no defined consumer, which is its own defect (loaded content with no instructed use). Either reading is a real bug; there is no clean interpretation under which both `do.md:9`, `do.md:74`, and `dispatch-banner.md:5` are mutually consistent.

---

## 3. `do.md` — guardrails contradict its own process steps (independent of the persona question)

Not what was asked, but discovered while verifying the dispatch mechanism, and severe enough to flag: `do.md`'s guardrails claim a much stricter tool contract than the process steps above them actually follow.

```
do.md:428   MUST NOT call Bash, Read, Grep, Glob, Write, or Edit tools. The dispatcher
             does not investigate, read code, or write files. Period.
do.md:431   The ONLY tools allowed inside /rcode-do are: AskUserQuestion (for
             disambiguation), Skill (for dispatch), and the one Bash call to the
             classifier (`classify-question`). Nothing else.
```

Yet the process itself, which runs *before* the guardrails could apply, calls Bash repeatedly:

```
do.md:24-35    parse_args step — Bash block computing AUTO_MODE and
               CONFIG_MODE via `node .rcode/bin/rcode-tools.cjs config-get mode`
do.md:130-140  check_project step — Bash block computing INIT, HAS_PRD,
               HAS_EPICS, PHASE_COUNT, HAS_PHASES, ACTIVE_MILESTONE,
               LAST_SHIPPED_VERSION via multiple `node`, `ls`, and `grep` calls
do.md:257-266  explicit_intent_check step — Bash block using `sed` to compute
               NEXT_VERSION
do.md:66       persona_shortcut step — explicit instruction to Read
               `.claude/agents/{agent-id}.md`
```

That's at minimum 8 distinct Bash invocations and one explicit Read instruction, against a guardrail that permits exactly one Bash call (the classifier) and zero Read calls. This isn't a persona-dispatch issue — it's `do.md` making an absolute, capitalized claim about its own tool contract ("Nothing else." / "Period.") that its own preceding steps violate on every single invocation, not just persona shortcuts. Whether the guardrails are stale (written for an earlier, thinner version of the router) or the process steps are the drift, the two blocks cannot both be followed literally.

---

## 4. `quick.md` — clean on the specific question; one adjacent gap noted

**Confirmed clean:** the trivial-inline path never claims an engineer or persona is engaged.

```
rcode/workflows/quick.md:96    **No SPRINT.md. No subagents. Just do it.**
rcode/workflows/quick.md:196   - NEVER spawn a Task/subagent — this runs inline (except via the
                                add-phase auto-route, which is itself a workflow dispatch, not a
                                Task spawn)
```

```bash
$ grep -n -i "hanzla\|yousef\|haitham\|omar\|persona" rcode/workflows/quick.md
# (no output — zero matches)
```

`quick.md` never mentions any named persona anywhere. `execute_inline` (`quick.md:89-97`) is explicit and honest: it reads files, edits them, and verifies — no fictitious engineer hand-off, no dispatch banner implying a subagent took over. This is the correct behavior and the opposite of the #1004 pattern.

**Adjacent gap (not the asked question, noted for completeness):** the `bulk_detection` step's hand-off instruction is textual only, with no explicit tool-call mandate:

```
quick.md:63   4. Dispatch `/rcode-add-phase {phase-slug}` and pass `$TASK` verbatim.
```

Compare this to `do.md`'s own explicit warning about exactly this failure mode, written after a real incident:

```
do.md:394   Printing the slash-command in a code block, in a banner, or in a
            "Dispatching..." message is NOT dispatch — it is just text
            rendering, and the routed command will never run. Past failure:
            model emitted the dispatch banner three times in a row without
            ever invoking the Skill tool, then stalled.
```

`quick.md:63` never says "call the Skill tool" — it just says "Dispatch `/rcode-add-phase {phase-slug}`." This is not a false-persona-engagement claim (so it does not match what was asked), but it is the same category of under-specification `do.md` had to explicitly patch for itself elsewhere in the same workflow suite, and it is unverified whether an executing model reliably turns this into a real `Skill()` call or just prints the sentence.

---

## Summary

| Question | Answer | Evidence |
|---|---|---|
| Does `do.md` have a keyword table mapping `hanzla`/`dev`/`engineer` → `rcode-hanzla`? | Yes | `do.md:58` |
| Is that table reachable from plain-English text, or only `@persona CODE`? | Only `@persona CODE` — gated | `do.md:85` |
| Does invoking it ever call `Task()`/`Agent()`? | No — never, confirmed by grep and by explicit guardrail | `do.md:429`, zero `Task(`/`Agent(` matches in file |
| Is the dispatch nonetheless dressed up to look like a real persona hand-off? | Yes — required reading (`dispatch-banner.md`) is explicitly scoped to real `Task(subagent_type=...)` spawns and includes a first-person "I'm Hanzla... Working now" banner for this exact agent, with no disambiguation from the plain routing banner | `do.md:9`, `do.md:74`, `dispatch-banner.md:3-5,30,45-67` |
| Where does `@hanzla DS` actually land? | `/rcode-dev-story` — already confirmed broken elsewhere | `rcode-hanzla.md:38` |
| Does `quick.md` ever falsely claim an engineer is engaged? | No — explicitly disclaims subagents/personas | `quick.md:96`, `quick.md:196` |
| Any adjacent gap in `quick.md`? | Bulk-route dispatch instruction lacks the explicit "call the Skill tool" mandate that `do.md` had to add after a real incident | `quick.md:63` vs `do.md:394` |

**No code changes made — diagnose-only per instructions.**
