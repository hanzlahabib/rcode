# rcode Council Protocol

Shared reference document `@`-included by every council-related workflow.

## The 5-step majlis

Every rcode council session follows the same five steps. This is the protocol the orchestrator implements:

1. **Initialize** — load config, state, installed agent list, parse arguments.
2. **Observe** — run a cheap, bounded codebase scan (config, state, git log, top-level files). Produces a 5-8 line factual summary every subagent will be briefed on.
3. **Select** — pick 3-5 agents via deterministic keyword scoring. User can override with `--agents=` or force all with `--full`.
4. **Consult** — spawn selected agents in parallel via the Task tool. Each agent gets the same observed-context brief and the user's question. Cross-talk rounds include previous panelists' responses.
5. **Record** — save the session artifact under `.planning/council-sessions/council-{date}-{slug}.md`.

Never collapse steps. Never skip the observe step — a council that answers from vibes is worse than no council.

## Cross-talk convention

When agents speak in a council, they can and should reference each other by name when they build on or disagree with a point. The orchestrator passes previous-agent responses as context to later panelists.

Good cross-talk:

> 🛡️ **Fatima:** Waleed's migration plan is solid on the forward path, but he's
> skipping the rollback test. If the backfill fails at row 2M of 5M, how do
> we recover? Not covered in the plan.

Bad cross-talk:

> 🛡️ **Fatima:** I agree with Waleed.

Agreements without new information are silence. If an agent genuinely has nothing to add, they should say so in one sentence rather than pad.

## Panel selection (deterministic scoring)

rcode's council uses a pure-function keyword scorer (`rcode/bin/lib/council-panel.cjs` source, installed at `.rcode/bin/lib/council-panel.cjs`) instead of LLM judgment. This is intentional:

- **Deterministic:** same question produces same panel every time
- **Testable:** the scoring function has unit tests
- **Auditable:** users can pass `--explain` to see why each agent was picked or skipped
- **Cheap:** zero LLM calls before the council starts

The scoring table is versioned with the package. Users who want different weights edit the source and rebuild — there is no runtime config knob for this, and that's by design. The panel selection must be reproducible across machines.

**Padding rules:**

- Strategic questions (containing "should i", "worth", "kill", "pivot", "start new") always include Sadiq even if topic keywords score low.
- Scope/feature questions (containing "scope", "feature", "roadmap", "prd") always include Hussain-PM.
- If fewer than the minimum panel size (default 3) score non-zero, the panel is padded with the STRATEGIC_PADDING_ORDER list: sadiq, hussain-pm, waleed, fatima, nasser.

**Installed roster:** the full agent roster (currently 45 agents under `rcode/agents/`) is installed as first-class subagents. The scorer may still select an agent id that isn't present in a given project's installed set — the orchestrator filters the scored panel down to `installed_agents` from `init council` and pads from the fallback order if needed.

## Response presentation

Two presentation modes control how panel responses appear inline. The session artifact (see below) always stores the full verbatim text regardless of mode — only the inline presentation differs:

- **Default (compact summary)** — scannable in ~20 seconds: a one-sentence paraphrased position per agent, a convergence/divergence table, and Round 2 deltas. No verbatim transcripts inline.
- **Verbose** (`--verbose` flag or `output.verbose: true` in config) — full verbatim responses printed in panel order, no summarization.

The user came to the council to hear the agents' actual positions, not filler agreement — so even in compact mode, paraphrase the substance, not "I agree with X."

After the panel output, the orchestrator may add a single **Orchestrator Note** (max 2-3 sentences) that flags a disagreement worth following up on or recommends a second round. The Orchestrator Note is clearly labeled so it's not confused with agent speech.

## Session artifact format

Every council session is saved to `.planning/council-sessions/council-{YYYY-MM-DD}-{slug}.md`. The slug is lowercase-hyphenated from the first 6 words of the question. Format:

```markdown
# Council Session — {short summary}

**Date:** {ISO date}
**Panel:** {names}
**Mode:** {guided|yolo}
**Project:** {project name from .rcode/config.yaml}

## Question
{original question}

## Observed Context
{the Step 2 summary block}

## Panel Responses
### 🧭 Sadiq
{verbatim}
### 🏗️ Waleed
{verbatim}
### 🛡️ Fatima
{verbatim}

## Orchestrator Note
{if any}

## Follow-ups
- [ ] {action items}
```

The artifact is a first-class project document. It's committed to git, reviewed in retros, and referenced when the same question comes up again. The Follow-ups section is the bridge between council and execution.
