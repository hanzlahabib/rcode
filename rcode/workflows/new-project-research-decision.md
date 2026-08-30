<purpose>
Sub-step of new-project.md — Step 6 Research Decision. Decides whether to run domain research agents, handles existing research, and synthesizes findings before requirements.
</purpose>

## 6. Research Decision

**If auto mode:** Default to "Research first" without asking.

Use AskUserQuestion:

- header: "Research"
- question: "Research the domain ecosystem before defining requirements?"
- options:
  - "Research first (Recommended)" — Discover standard stacks, expected features, architecture patterns
  - "Skip research" — I know this domain well, go straight to requirements

**If "Research first":**

Display stage banner:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► RESEARCHING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Researching [domain] ecosystem...
```

Create research directory:

```bash
mkdir -p .planning/research
```

**Determine milestone context:**

- If no "Validated" requirements in PROJECT.md → Greenfield (building from scratch)
- If "Validated" requirements exist → Subsequent milestone (adding to existing app)

Display spawning indicator:

```
◆ Spawning 4 researchers in parallel...
  → Stack research
  → Features research
  → Architecture research
  → Pitfalls research
```

Spawn 4 parallel rcode-project-researcher agents:

```
Task(prompt="<research_type>
Project Research — Stack dimension for [domain].
</research_type>

<milestone_context>
[greenfield OR subsequent]

Greenfield: Research the standard stack for building [domain] from scratch.
Subsequent: Research what's needed to add [target features] to an existing [domain] app.
</milestone_context>

<question>
What's the standard 2026 stack for [domain]?
</question>

<files_to_read>
- .planning/PROJECT.md (Project context and goals)
</files_to_read>

${AGENT_RESEARCHER}

<downstream_consumer>
Your STACK.md feeds into roadmap creation. Be prescriptive:
- Specific libraries with versions
- Clear rationale for each choice
- What NOT to use and why
</downstream_consumer>

<quality_gate>
- [ ] Versions are current (verify with Context7/official docs, not training data)
- [ ] Rationale explains WHY, not just WHAT
- [ ] Confidence levels assigned to each recommendation
</quality_gate>

<output>
Write to: .planning/research/STACK.md
</output>
", subagent_type="rcode-project-researcher", model="${RESEARCHER_MODEL}", description="Stack research")

Task(prompt="<research_type>
Project Research — Features dimension for [domain].
</research_type>

<milestone_context>
[greenfield OR subsequent]

Greenfield: What features do [domain] products have? What's table stakes vs differentiating?
Subsequent: How do [target features] typically work? What's expected behavior?
</milestone_context>

<files_to_read>
- .planning/PROJECT.md
</files_to_read>

${AGENT_RESEARCHER}

<downstream_consumer>
Your FEATURES.md feeds into requirements definition. Categorize clearly:
- Table stakes (must have or users leave)
- Differentiators (competitive advantage)
- Anti-features (things to deliberately NOT build)
</downstream_consumer>

<quality_gate>
- [ ] Categories are clear (table stakes vs differentiators vs anti-features)
- [ ] Complexity noted for each feature
- [ ] Dependencies between features identified
</quality_gate>

<output>
Write to: .planning/research/FEATURES.md
</output>
", subagent_type="rcode-project-researcher", model="${RESEARCHER_MODEL}", description="Features research")

Task(prompt="<research_type>
Project Research — Architecture dimension for [domain].
</research_type>

<milestone_context>
[greenfield OR subsequent]

Greenfield: How are [domain] systems typically structured? What are major components?
Subsequent: How do [target features] integrate with existing [domain] architecture?
</milestone_context>

<files_to_read>
- .planning/PROJECT.md
</files_to_read>

${AGENT_RESEARCHER}

<downstream_consumer>
Your ARCHITECTURE.md informs phase structure in roadmap. Include:
- Component boundaries (what talks to what)
- Data flow (how information moves)
- Suggested build order (dependencies between components)
</downstream_consumer>

<quality_gate>
- [ ] Components clearly defined with boundaries
- [ ] Data flow direction explicit
- [ ] Build order implications noted
</quality_gate>

<output>
Write to: .planning/research/ARCHITECTURE.md
</output>
", subagent_type="rcode-project-researcher", model="${RESEARCHER_MODEL}", description="Architecture research")

Task(prompt="<research_type>
Project Research — Pitfalls dimension for [domain].
</research_type>

<milestone_context>
[greenfield OR subsequent]

Greenfield: What do [domain] projects commonly get wrong? Critical mistakes?
Subsequent: What are common mistakes when adding [target features] to [domain]?
</milestone_context>

<files_to_read>
- .planning/PROJECT.md
</files_to_read>

${AGENT_RESEARCHER}

<downstream_consumer>
Your PITFALLS.md prevents mistakes in roadmap/planning. For each pitfall:
- Warning signs (how to detect early)
- Prevention strategy (how to avoid)
- Which phase should address it
</downstream_consumer>

<quality_gate>
- [ ] Pitfalls are specific to this domain (not generic advice)
- [ ] Prevention strategies are actionable
- [ ] Phase mapping included where relevant
</quality_gate>

<output>
Write to: .planning/research/PITFALLS.md
</output>
", subagent_type="rcode-project-researcher", model="${RESEARCHER_MODEL}", description="Pitfalls research")
```

After all 4 agents complete, spawn synthesizer to create SUMMARY.md:

```
Task(prompt="
<task>
Synthesize research outputs into SUMMARY.md.
</task>

<files_to_read>
- .planning/research/STACK.md
- .planning/research/FEATURES.md
- .planning/research/ARCHITECTURE.md
- .planning/research/PITFALLS.md
</files_to_read>

${AGENT_SYNTHESIZER}

<output>
Write to: .planning/research/SUMMARY.md
Synthesize into: recommended stack, table stakes vs differentiators, architecture outline, top pitfalls to avoid.
</output>
", subagent_type="rcode-research-synthesizer", model="${SYNTHESIZER_MODEL}", description="Synthesize research")
```

**Commit research (guarded):**

```bash
git add .planning/research/ 2>/dev/null \
  && git commit -m "docs: add project research" 2>/dev/null \
  || echo "ℹ .planning/ gitignored — research written, not committed"
```

Display research complete banner and key findings:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 rcode ► RESEARCH COMPLETE ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Key Findings

**Stack:** [from SUMMARY.md]
**Table Stakes:** [from SUMMARY.md]
**Watch Out For:** [from SUMMARY.md]

Files: `.planning/research/`
```

## 6b. Stack confirmation gate — HARD STOP

**The stack is never decided for the user. Not by research, not by a
recommendation, not by "the obvious choice for this domain."** Research produces
a *suggestion*; only the user turns it into a decision.

This gate runs whether research ran or was skipped. If research was skipped, ask
with no recommendation attached — you have no grounds for one.

```
AskUserQuestion:
  header: "Stack"
  question: "Research suggests {STACK} because {the one reason that actually drove it}. Confirm?"
  options:
    - label: "Confirm {STACK}"
      description: "{the trade-off the user is accepting, stated plainly}"
    - label: "I'll choose the stack"
      description: "Tell me what to build on and I'll record that instead."
    - label: "Research more first"
      description: "Compare against {the closest alternative} before deciding."
```

**Nothing proceeds until the user answers.** Not requirements, not the roadmap,
not a single file. An unanswered question is not a confirmation, and neither is
silence, `--auto`, or `auto_advance`. **Auto mode does NOT bypass this gate** —
every other question in this workflow has an auto default; this one does not,
because a wrong stack is the most expensive thing in the project to reverse.

State the reason the suggestion exists, in one sentence, in the user's terms.
"Research recommends WordPress" is not a reason. "WordPress because a
non-technical client will update content themselves, with no dev retainer" is —
and stated that way the user can see immediately whether the premise is true.

Record the answer with `state add-decision`, including the premise it rests on:

```bash
node ".rcode/bin/rcode-tools.cjs" state add-decision \
  "Stack: {chosen}. Premise: {the one reason}. Confirmed by user {date}."
node ".rcode/bin/rcode-tools.cjs" memlog append --type decision \
  --text "Stack: {chosen}. Premise: {the one reason}. User-confirmed at the stack gate."
```

### The premise is part of the decision

**A stack decision is only valid while its premise holds.** Write the premise
into the decision, then re-open the decision the moment the premise changes.

Confirmed live: a site was scoped for a non-technical client, so research picked
WordPress and the roadmap locked it. The project later pivoted to a model with no
client at all — the maintainer was the technical owner. Every planning doc was
rewritten for the pivot and the stack stayed "Locked", because nothing in the
loop treats a locked decision as re-openable. A PHP theme got built and then
migrated wholesale to a static generator to undo it.

**On any pivot, re-run this gate** for every decision whose stated premise the
pivot invalidated. A decision whose reason has expired is not locked, it is
stale.

**If "Research more first":** run the comparison against the named alternative,
then return to this gate. Do not proceed past it.

**If "Skip research":** Continue to Step 6b — you still need the stack gate,
you just have no suggestion to offer.


## Next Up

This is a sub-step invoked by `/rcode-new-project`. If you reached this directly:

- `/rcode-new-project` — re-enter the parent flow which orchestrates research → requirements → roadmap
- `/rcode-status` — see where you are in the current project lifecycle
