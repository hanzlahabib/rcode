# Workflow: rihal:council

<purpose>
Orchestrate a parallel panel of Rihal specialist subagents answering a strategic question. This is the v2 council — deterministic panel scoring via `rihal-tools.cjs`, parallel Task-tool spawning (not sequential roleplay), and structured artifact output to `.planning/council-sessions/`.
</purpose>

<required_reading>
Before executing this workflow, the orchestrator must have loaded:

- `.rihal/references/council-protocol.md` — the 5-step majlis protocol and cross-talk conventions
- `.rihal/references/commit-conventions.md` — commit format rules (for the session-save artifact)
- This file

These are `@`-included in the slash command's `<execution_context>` block.
</required_reading>

<available_agent_types>
Use these exact `subagent_type` values when calling the Task tool:

- `rihal-sadiq` — Director of Strategy
- `rihal-waleed` — CTO
- `rihal-fatima` — QA Lead

Do not invoke `general-purpose` or any other agent type. If `rihal-tools.cjs select-panel` returns an agent id not in this list, error and ask the user to re-run with `--agents=...` explicitly.
</available_agent_types>

## Step 0 — Initialize

Call the helper binary once to load all context:

```bash
INIT_JSON=$(node .rihal/bin/rihal-tools.cjs init council "$ARGUMENTS")
```

Parse the JSON for:

- `question` — the cleaned question text (ARGUMENTS minus flags)
- `flags.full` — boolean, `--full` was passed
- `flags.agents` — string[], explicit `--agents=...` list or empty
- `flags.explain` — boolean, show panel scoring
- `panel` — string[], the pre-computed panel (respects `--full` and `--agents`)
- `scores` — object, per-agent scoring for explain mode
- `question_type` — `"codebase" | "discovery" | "market" | "greenfield"` — drives Step 1 branching
- `question_signals` — string[], matched phrases that drove the classification
- `config` — `{ user_name, project_name, language, mode }` from `.rihal/config.yaml`
- `paths` — `{ state, planning_root, sessions_dir, references_dir }`
- `state_exists` — boolean, `.rihal/state.json` present
- `installed_agents` — the authoritative list of installed agent ids (for validation)

**If the panel contains any id not in `installed_agents`:** stop, print `Unknown agent: {id}. Installed: {installed_agents.join(', ')}`, exit.

## Step 1 — Pre-consultation context gathering

**Branch on `question_type`** (returned by `rihal-tools.cjs init` as `question_type`):

- `codebase` — existing code question → codebase scan
- `team` — people/process question → codebase scan (for team context from README/state) + no external research
- `release` — shipping/incident → codebase scan
- `design` — UX/brand → codebase scan
- `market` — external plan/geography/regulation → research pre-step
- `discovery` — what to build/which sector → research pre-step
- `greenfield` — starting from scratch → research pre-step

### If `question_type` is `"codebase"`, `"team"`, `"release"`, or `"design"` — run the codebase scan

Run this block ONCE. Target < 2k tokens output. Do not read files not listed here.

```bash
# Cheap, bounded signals only — orchestrator uses the output to brief subagents.
test -f .rihal/state.json && cat .rihal/state.json
test -f .rihal/config.yaml && cat .rihal/config.yaml
test -f README.md && head -60 README.md
test -f package.json && head -40 package.json
test -f pyproject.toml && head -40 pyproject.toml
test -f Cargo.toml && head -40 Cargo.toml
test -f go.mod && head -20 go.mod
git log --oneline -20 2>/dev/null
ls -la
```

Emit a 5-8 line "Observed context" block to the user:

```
📁 Observed context (codebase)
   Stack: <detected stack>
   State: <current phase/sprint if any>
   Recent commits: <top 3 one-liners>
   Notable files: <any .md files that jump out>
```

### If `question_type` is `"market"`, `"discovery"`, or `"greenfield"` — run the research pre-step

Do NOT skip this step. A council that answers market questions from training data alone is producing confident guesses, not grounded advice.

1. Run 1-3 targeted `WebSearch` queries to gather real facts relevant to the question. Choose queries that will return authoritative sources (government plans, industry reports, named organizations).
2. Synthesize into a 6-10 line "Research context" block that names specific facts, sectors, figures, or constraints. This block is passed verbatim to every subagent.

```
📋 Research context (market/discovery)
   Source 1: <name + 2-line summary>
   Source 2: <name + 2-line summary>
   Key facts: <bullet list of 4-6 specific, citable data points>
   Constraints: <regulatory, geographic, or operational limits>
```

Also run the minimal codebase scan (config.yaml + README only) so subagents know the team's current capabilities:

```bash
test -f .rihal/config.yaml && cat .rihal/config.yaml
test -f README.md && head -40 README.md
```

This is the factual baseline every subagent will be briefed on. It replaces the v1 "vibes-based council" problem.

## Step 2 — Panel selection

**If `flags.explain` is true:** print the panel scoring table before proceeding:

```
Panel scoring:
  sadiq    [score]  — [top matched keyword or "padded"]
  waleed   [score]  — ...
  fatima   [score]  — ...

Selected: sadiq, waleed, fatima
```

**If `config.mode === 'guided'`:** confirm with the user:

```
Panel for this question: <comma-separated display names>
Proceed? [Y/n]
```

Use the AskUserQuestion tool (not raw stdin) for the confirmation.

**If `config.mode === 'yolo'`:** print the panel one-liner and proceed without confirmation.

## Step 3 — Spawn the panel in parallel (two rounds)

### Round 1 — Independent perspectives

**Spawn all panelists in a single response with multiple Task tool calls.** Do not spawn sequentially — the whole point of v2 is real parallel dispatch.

For each agent id in `panel`, build this prompt:

```
You are being spawned as part of a Rihal council session.

## The user's question
{question}

## Observed context
{the summary block from Step 1 — codebase scan OR research context depending on question_type}

## Session metadata
- Project: {config.project_name}
- User: {config.user_name}
- Communication language: {config.language}

## Instructions
This is Round 1 — give your independent perspective. Follow your agent file's
response format exactly. Scale to the substance — do not pad. Start your reply
with your icon + name header.
```

Spawn all at once:

```
(Task tool call with subagent_type = "rihal-sadiq", prompt = <above>)
(Task tool call with subagent_type = "rihal-waleed", prompt = <above>)
(Task tool call with subagent_type = "rihal-fatima", prompt = <above>)
```

All in the same assistant response block so they execute concurrently.

### Round 2 — Cross-talk

After Round 1 completes, spawn all panelists again in a single response. Pass each agent the full set of Round 1 responses and ask them to react:

```
You are in Round 2 of a Rihal council session.

## The user's question
{question}

## Observed context
{same summary as Round 1}

## Round 1 responses from your fellow panelists
### 🧭 Sadiq (Round 1)
{sadiq_round1_response}

### 🏗️ Waleed (Round 1)
{waleed_round1_response}

### 🛡️ Fatima (Round 1)
{fatima_round1_response}

## Instructions
This is Round 2 — cross-talk. Reference specific points from your colleagues by name.
Build on where they are right. Push back where they are wrong or incomplete. If you
genuinely have nothing to add, say so in one sentence. Do NOT repeat your Round 1 answer.
Start your reply with your icon + name header.
```

Spawn all at once (same pattern as Round 1).

**Skip Round 2** only if:
- All three panelists in Round 1 gave the same recommendation (genuine consensus), OR
- One or more panelists explicitly said they had nothing to add

## Step 4 — Present responses

Present Round 1 then Round 2 **verbatim and in panel order**. Do NOT summarize. Do NOT paraphrase.

```
### Round 1

🧭 **Sadiq:**
<full verbatim response>

🏗️ **Waleed:**
<full verbatim response>

🛡️ **Fatima:**
<full verbatim response>

### Round 2 — Cross-talk

🧭 **Sadiq:**
<full verbatim response>

🏗️ **Waleed:**
<full verbatim response>

🛡️ **Fatima:**
<full verbatim response>
```

After all responses, add an **Orchestrator Note** (max 3 sentences) flagging the sharpest disagreement or the clearest action:

```
---
**Orchestrator Note:** ...
```

The Orchestrator Note is **your own voice**, not an agent voice. Label it clearly.

## Step 5 — Save the session

Write the session artifact to `{paths.sessions_dir}/council-{YYYY-MM-DD}-{slug}.md`:

```markdown
# Council Session — {short question summary}

**Date:** {ISO date}
**Panel:** {comma-separated display names}
**Mode:** {guided | yolo}
**Project:** {config.project_name}

## Question
{original question}

## Observed Context
{the Step 1 summary block}

## Panel Responses

### Round 1
#### 🧭 Sadiq
{verbatim}

#### 🏗️ Waleed
{verbatim}

#### 🛡️ Fatima
{verbatim}

### Round 2 — Cross-talk
#### 🧭 Sadiq
{verbatim}

#### 🏗️ Waleed
{verbatim}

#### 🛡️ Fatima
{verbatim}

## Orchestrator Note
{if any}

## Follow-ups
{Extract concrete action items from the session. Read through ALL panelist responses and pull out:
- Explicit "next step" statements ("first, validate X", "before committing, answer Y")
- Open questions that need a human decision
- Risks that were named but not resolved
Format each as a checkbox:}
- [ ] {action item}
```

The `{slug}` is a lowercase-hyphenated slug of the first 6 words of the question. Create `{paths.sessions_dir}` if it doesn't exist (`mkdir -p`).

**Follow-ups must NOT be empty.** Every council session produces at least one actionable item. If panelists only asked clarifying questions, the follow-up is "Answer the panel's clarifying questions and re-run /rihal:council".

Print the artifact path to the user at the end:

```
💾 Session saved: .planning/council-sessions/council-2026-04-12-should-i-start-new-project.md
```

## Errors

- **`rihal-tools.cjs` not found at `.rihal/bin/rihal-tools.cjs`:** user has v1 installed or the package is broken. Tell the user to run `rihal-code install-v2`.
- **Panel contains unknown agent:** print the installed-agent list and exit.
- **All panelists return empty responses:** likely the subagents were spawned without proper prompts. Re-check Step 3 prompt construction.
- **`.rihal/config.yaml` missing:** warn and use defaults (`user_name=User`, `language=English`, `mode=guided`).
