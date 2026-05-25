<purpose>
Research how to implement a phase. Spawns rcode-phase-researcher with phase context.

Standalone research command. For most workflows, use `/rcode-plan` which integrates research automatically.
</purpose>

<available_agent_types>
Valid rcode subagent types (use exact names — do not fall back to 'general-purpose'):
- rcode-phase-researcher — Researches technical approaches for a phase
</available_agent_types>

<process>

## Step 0: Resolve Model Profile

@.rcode/references/model-profile-resolution.md

Resolve model for:
- `rcode-phase-researcher`

## Step 1: Normalize and Validate Phase

@.rcode/references/phase-argument-parsing.md

```bash
PHASE_INFO=$(node ".rcode/bin/rcode-tools.cjs" roadmap get-phase "${PHASE}")
```

If `found` is false: Error and exit.

## Step 2: Check Existing Research

```bash
ls .planning/phases/${PHASE}-*/RESEARCH.md 2>/dev/null || true
```

If exists: Offer update/view/skip options.

## Step 3: Gather Phase Context

```bash
INIT=$(node ".rcode/bin/rcode-tools.cjs" init phase-op "${PHASE}" 2>/dev/null)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
# If INIT is empty or INIT.ok is false: print "Error: rcode-tools init failed." and exit.
# Extract: phase_dir, padded_phase, phase_number, state_path, requirements_path, context_path, response_language
# If response_language is set, include "Respond in {value}." in all spawned subagent prompts.
AGENT_SKILLS_RESEARCHER=$(node ".rcode/bin/rcode-tools.cjs" agent-skills rcode-phase-researcher 2>/dev/null)
```

## Step 4: Spawn Researcher

```
Task(
  prompt="<objective>
Research implementation approach for Phase {phase}: {name}

Why this phase matters: {description}
Broader goal: this research output must enable the planning step to break
Phase {phase} into concrete, buildable sprints — a sufficient result gives
planning specific approaches, libraries (with versions/rationale), and known
pitfalls, not a vague survey.
</objective>

<objective_context>
Phase {phase} goal: {description}
Downstream consumer: /rcode-plan reads {phase}-RESEARCH.md to structure sprints.
</objective_context>

<files_to_read>
- {context_path} (USER DECISIONS from /rcode-discuss-phase)
- {requirements_path} (Project requirements)
- {state_path} (Project decisions and history)
</files_to_read>

${AGENT_SKILLS_RESEARCHER}

<additional_context>
Phase description: {description}
</additional_context>

<output>
Write to: .planning/phases/${PHASE}-{slug}/${PHASE}-RESEARCH.md
</output>",
  subagent_type="rcode-phase-researcher",
  model="{researcher_model}"
)
```

## Step 5: Handle Return

@.rcode/references/iterative-retrieval.md

**Sufficiency loop (runs before routing):** When `rcode-phase-researcher`
returns its `## RESEARCH COMPLETE` summary, evaluate it for sufficiency
against the Step-4 objective — does it cover every dimension the phase goal
asked for, are recommendations specific (versions/rationale) not vague, and
were any `## RESEARCH INCONCLUSIVE` or blocked signals returned. If
insufficient, re-dispatch `rcode-phase-researcher` with a follow-up prompt
that names the specific gaps and includes the prior result, asking only for
the missing pieces. This loop is hard-capped at 3 cycles (initial + up to 2
follow-ups). After the cap, proceed with the best result and note residual
gaps in the RESEARCH.md artifact. Then offer the routing options below.

- `## RESEARCH COMPLETE` — Display summary, offer: Plan/Dig deeper/Review/Done
- `## CHECKPOINT REACHED` — Present to user, spawn continuation
- `## RESEARCH INCONCLUSIVE` — Show attempts, offer: Add context/Try different mode/Manual

</process>

## Next Up

- `/rcode-plan` — plan the phase using research findings
- `/rcode-discuss-phase` — discuss research findings before planning
