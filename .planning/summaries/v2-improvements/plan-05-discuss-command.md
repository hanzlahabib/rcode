---
plan: "05"
title: /rihal-discuss — lightweight single-agent quick-sync
priority: medium
depends_on: ["01", "02"]
estimated_effort: small
---

## Objective

Add `/rihal-discuss` as a lightweight alternative to `/rihal-council`. Council is heavyweight — 2 rounds, 3-5 agents, session artifact saved. Sometimes Hanzla just wants to think something through with one agent quickly. Discuss is that: one agent, conversational, no artifact unless asked.

## Context

- The v1 rihal apparently had a `strategy-session` and `majlis-sequential` workflow — check `rihal/workflows/` for patterns to learn from
- The key difference from council: single agent, no Round 2, no mandatory session save, faster
- Routing: `rihal-discuss sadiq what's the kill criterion for this idea` → spawns only Sadiq
- If no agent specified: route to the most relevant agent using classify-question (same scorer, pick top 1)
- `/rihal-discuss` should feel like texting one colleague, not calling a board meeting

## Discuss vs Council comparison

| Feature | /rihal-discuss | /rihal-council |
|---|---|---|
| Agents | 1 | 3-5 |
| Rounds | 1 | 2 (with cross-talk) |
| Session artifact | Optional (only if user says "save this") | Always saved |
| State update | last_session only | Full council_sessions[] record |
| Panel confirmation | No | Yes (in guided mode) |
| Codebase scan | Optional | Always |
| Best for | Quick check, rubber duck, fast decision | Strategic question, major decision |

## Tasks

### Task 1 — Read v1 strategy-session and majlis-sequential workflows for patterns
type: auto
**Steps:**
1. Read `rihal/workflows/strategy-session/instructions.md`
2. Read `rihal/workflows/majlis-sequential/instructions.md`
3. Note: what agent routing did v1 use? How did it handle single-agent vs multi-agent? Any prompt patterns worth keeping?
4. Document useful patterns as inline notes — do not copy v1 code verbatim
**Done when:** you understand what v1 did and can describe what to keep vs discard
**Commit:** none (read-only)

### Task 2 — Create /rihal-discuss command and workflow
type: auto
**Steps:**
1. Create `rihal/v2/commands/discuss.md`:
   ```yaml
   ---
   name: rihal-discuss
   description: Quick sync with one Rihal agent. Lighter than /rihal-council — one agent, no cross-talk, optional save.
   argument-hint: "[agent-name] <question>"
   allowed-tools: [Read, Bash, Agent, AskUserQuestion]
   ---
   ```
2. Create `rihal/v2/workflows/discuss.md` with these steps:

   **Step 0 — Parse arguments:**
   ```bash
   node .rihal/bin/rihal-tools.cjs init discuss "$ARGUMENTS"
   ```
   Returns: `{ agent_id, question, config, paths }` — where `agent_id` is either the explicit first token (if it matches an installed agent id) or the top-scored agent from `select-panel` with `--top 1` flag.

   **Step 1 — Resolve agent:**
   - If first word of ARGUMENTS is an installed agent id (`sadiq`, `waleed`, `fatima`, `mariam`, `hussain-pm`) → use it, strip from question
   - Else → call `node .rihal/bin/rihal-tools.cjs select-panel "$ARGUMENTS" --top 1` → pick the top scorer
   - Print: `💬 Discussing with {agent display name}...`

   **Step 2 — Optional codebase scan** (only if question_type is codebase/team/release):
   ```bash
   test -f .rihal/config.yaml && cat .rihal/config.yaml
   test -f README.md && head -30 README.md
   git log --oneline -5 2>/dev/null
   ```
   Skip scan for market/discovery/greenfield questions — they don't need codebase context.

   **Step 3 — Spawn single agent:**
   Spawn the selected agent via Agent tool with:
   - The question
   - The codebase/research context (whichever is relevant)
   - Instruction: "This is a quick discuss session — one round, conversational tone. Be direct and concise. Scale your response to the substance — a simple question gets a short answer."

   **Step 4 — Print response verbatim** (no orchestrator note, no round labeling)

   **Step 5 — Offer to save (only in guided mode):**
   If `config.mode === 'guided'`, ask:
   "Save this discussion? [y/N]"
   If yes → write minimal artifact to `.planning/council-sessions/discuss-{date}-{slug}.md`
   If no or yolo → skip.

   **Step 6 — Update state:**
   ```bash
   node .rihal/bin/rihal-tools.cjs state record-session
   ```

3. Register in skills manifest.
**Done when:** workflow and command files exist and cover all steps
**Commit:** `feat(workflows): add /rihal-discuss lightweight single-agent command`

### Task 3 — Extend rihal-tools.cjs with init discuss and select-panel --top N
type: auto
**Steps:**
1. Add `init discuss "<args>"` subcommand:
   - Same config/paths/installed_agents as `init council`
   - Additionally: resolve `agent_id` by checking if first token is an installed agent id
   - If first token is agent id: `{ agent_id: "sadiq", question: "rest of args", ... }`
   - If not: `{ agent_id: null, question: "$ARGUMENTS", ... }` (orchestrator will call select-panel to resolve)
2. Add `--top N` flag to `select-panel` subcommand:
   - Instead of returning full panel, return only top N agents by score
   - `node rihal-tools.cjs select-panel "question" --top 1` → `{ panel: ["sadiq"], scores: {...} }`
**Done when:** both work from command line
**Commit:** `feat(cli): add init discuss and select-panel --top flag`

### Task 4 — Wire /rihal-discuss into install-v2.js
type: auto
**Steps:**
1. Add `discuss.md` to command copy step → `.claude/commands/rihal/discuss.md`
2. Add `discuss.md` to workflow copy step → `.rihal/workflows/discuss.md`
3. Add skills manifest entry for `/rihal-discuss`
**Done when:** fresh install includes the discuss command
**Commit:** `feat(install): wire /rihal-discuss into install pipeline`

## Success criteria
- [ ] `/rihal-discuss sadiq should I pivot this idea?` spawns only Sadiq with the question
- [ ] `/rihal-discuss what stack should I use?` auto-routes to Waleed (CTO) via scorer
- [ ] Response is printed verbatim with no round labels or orchestrator note
- [ ] In guided mode, user is offered to save; in yolo mode, save is skipped
- [ ] `state.json` `last_session` is updated after discuss
- [ ] Total token cost of discuss session is significantly lower than council session (no Round 2, 1 agent)
