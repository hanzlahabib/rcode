# discuss-phase - step 01: Required/conditional reading, downstream awareness, philosophy, scope guardrail, gray-area identification, answer validation

This step file was split verbatim out of `workflows/discuss-phase.md`. Any `@path` below is a plain path, not an auto-include: use the Read tool on each referenced file before acting on this step.

<required_reading>
@.rcode/references/universal-anti-patterns.md
@.rcode/references/source-of-truth-grounding.md
</required_reading>

<conditional_reading>
Load these only when the phase involves user-facing features or product decisions:
- If phase goal contains UI/product/design/integration signals: `@.rcode/references/domain-probes.md` (213 lines of domain-specific question banks)
- At the final approval step only: `@.rcode/references/gate-prompts.md` (212 lines of quality gate decision trees)

To detect phase type before loading:
```bash
PHASE_GOAL=$(grep -A5 "^## Phase ${PHASE_NUMBER}" .planning/ROADMAP.md 2>/dev/null | head -5)
echo "$PHASE_GOAL" | grep -iE "UI|UX|product|feature|integration|API|user|screen|flow|dashboard" > /dev/null 2>&1
HAS_PRODUCT_SIGNALS=$?
```
Only include domain-probes.md when `HAS_PRODUCT_SIGNALS` is 0.
</conditional_reading>

<downstream_awareness>
**CONTEXT.md feeds into:**

1. **rcode-phase-researcher** — Reads CONTEXT.md to know WHAT to research
   - "User wants card-based layout" → researcher investigates card component patterns
   - "Infinite scroll decided" → researcher looks into virtualization libraries

2. **rcode-planner** — Reads CONTEXT.md to know WHAT decisions are locked
   - "Pull-to-refresh on mobile" → planner includes that in task specs
   - "Claude's Discretion: loading skeleton" → planner can decide approach

**Your job:** Capture decisions clearly enough that downstream agents can act on them without asking the user again.

**Not your job:** Figure out HOW to implement. That's what research and planning do with the decisions you capture.
</downstream_awareness>

<philosophy>
User = visionary (knows what, not how). Claude = builder (asks about choices, not implementation).
Ask about vision and decisions. Capture for downstream agents. Never ask about codebase patterns,
technical risks, or architecture — those are research/planner territory.
</philosophy>

<scope_guardrail>
**CRITICAL: No scope creep.**

The phase boundary comes from ROADMAP.md and is FIXED. Discussion clarifies HOW to implement what's scoped, never WHETHER to add new capabilities.

**Allowed (clarifying ambiguity):**
- "How should posts be displayed?" (layout, density, info shown)
- "What happens on empty state?" (within the feature)
- "Pull to refresh or manual?" (behavior choice)

**Not allowed (scope creep):**
- "Should we also add comments?" (new capability)
- "What about search/filtering?" (new capability)
- "Maybe include bookmarking?" (new capability)

**The heuristic:** Does this clarify how we implement what's already in the phase, or does it add a new capability that could be its own phase?

**When user suggests scope creep:**
```
"[Feature X] would be a new capability — that's its own phase.
Want me to note it for the roadmap backlog?

For now, let's focus on [phase domain]."
```

Capture the idea in a "Deferred Ideas" section. Don't lose it, don't act on it.
</scope_guardrail>

<gray_area_identification>
Gray areas are **implementation decisions the user cares about** — things that could go multiple ways and would change the result.

**How to identify gray areas:**

1. **Read the phase goal** from ROADMAP.md
2. **Understand the domain** — What kind of thing is being built?
   - Something users SEE → visual presentation, interactions, states matter
   - Something users CALL → interface contracts, responses, errors matter
   - Something users RUN → invocation, output, behavior modes matter
   - Something users READ → structure, tone, depth, flow matter
   - Something being ORGANIZED → criteria, grouping, handling exceptions matter
3. **Generate phase-specific gray areas** — Not generic categories, but concrete decisions for THIS phase

**Don't use generic category labels** (UI, UX, Behavior). Generate specific gray areas:

```
Phase: "User authentication"
→ Auth strategy (SSO/Entra/OAuth vs local accounts vs magic link), Session handling, Error responses, Multi-device policy, Recovery flow

Phase: "Organize photo library"
→ Grouping criteria, Duplicate handling, Naming convention, Folder structure

Phase: "CLI for database backups"
→ Output format, Flag design, Progress reporting, Error recovery

Phase: "API documentation"
→ Structure/navigation, Code examples depth, Versioning approach, Interactive elements
```

**The key question:** What decisions would change the outcome that the user should weigh in on?

**Claude handles these (don't ask):**
- Technical implementation details
- Architecture patterns
- Performance optimization
- Scope (roadmap defines this)
</gray_area_identification>

<answer_validation>
**IMPORTANT: Answer validation** — After every AskUserQuestion call, check if the response is empty or whitespace-only. If so:
1. Retry the question once with the same parameters
2. If still empty, present the options as a plain-text numbered list and ask the user to type their choice number
Never proceed with an empty answer.

**Text mode (`workflow.text_mode: true` in config or `--text` flag):**
When text mode is active, **do not use AskUserQuestion at all**. Instead, present every
question as a plain-text numbered list and ask the user to type their choice number.
This is required for Claude Code remote sessions (`/rc` mode) where the Claude App
cannot forward TUI menu selections back to the host.

Enable text mode:
- Per-session: pass `--text` flag to any command (e.g., `/rcode-discuss-phase --text`)
- Per-project: `rcode-tools config-set workflow.text_mode true`

Text mode applies to ALL workflows in the session, not just discuss-phase.
</answer_validation>

Next: Read `.rcode/workflows/discuss-phase/steps/02-init-checks.md` before starting it (skip it if its Read-when condition is false).
