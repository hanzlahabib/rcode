# Majlis Sequential — Chain-of-Thought Multi-Agent

Sequential agent dispatch instead of parallel. Each agent reads the previous responses before adding their own. This is the **default Majlis mode** because it:

1. **Avoids filter triggers** — one persona at a time, no massive multi-voice simulation
2. **Produces richer dialogue** — agent N can respond to agent N-1's argument, not just work in isolation
3. **Works with any harness** — doesn't require Task tool or subagent dispatch
4. **Supports model mixing** — each dispatch can use a different model (Opus for strategists, Sonnet for execution, Haiku for quick checks)
5. **More auditable** — the chain of reasoning is visible

The trade-off: it's serial, not parallel. Total time = sum of agent times, not max.

---

## Default Council Chain

For a full strategic question, the council runs in this order (order matters — each agent builds on the previous):

```
1. Sadiq (Strategy)          → frames the strategic question
2. Hussain-PM (Product)      → translates to product scope
3. Waleed (CTO)              → assesses technical architecture
4. Ahmed Al Hassani (Tech Director) → assesses delivery feasibility
5. Zayd (ML) — IF ML-relevant → AI/data perspective
6. Haitham (Frontend)        → UI/UX implementation reality
7. Yousef (Backend)          → API and data layer reality
8. Fatima (QA)               → release gating and risk
9. Khalid (DevOps)           → infrastructure and ops cost
10. Zahra (Branding) — IF brand-relevant → visual identity
11. Mariam (Marketing)       → go-to-market implications
12. Nasser (Eng Manager)     → team capacity and burnout risk
13. Noor (Scribe)            → documentation and communication cost
```

**Why this order?**
- Strategy first (Sadiq frames) → then scope (Hussain-PM) → then feasibility (Waleed, Ahmed) → then execution reality (Zayd/Haitham/Yousef) → then gates (Fatima/Khalid) → then outward (Zahra/Mariam) → then people (Nasser) → then comms (Noor)
- Later agents see the full context from earlier agents, so they can respond to concerns raised

Override the default order when the question is narrow:
- **Technical question:** Waleed → Omar → Fatima → Khalid
- **Brand question:** Zahra → Layla → Haitham → Mariam
- **Hiring question:** Nasser → Ahmed Al Hassani → Waleed → Sadiq (budget)
- **Crisis:** Fatima → Khalid → Waleed → Hussain-PM → Sadiq (if strategic)

---

<workflow>

<step n="1" goal="Frame and scope">

<ask>What question brings you to the Majlis today?</ask>

<action>Restate the question clearly.</action>

<action>Determine the council order:
  - Full strategic (13 agents, default order)
  - Technical (Waleed → Omar → Fatima → Khalid)
  - Brand (Zahra → Layla → Haitham → Mariam)
  - Custom (user specifies)
</action>

<action>Load .rihal/models.json and .rihal/context/active.md to pick the right model per agent and establish project context.</action>

<critical>Show the planned chain to the user and get confirmation before starting. Sequential dispatch is a serial investment — abort early if the question is wrong.</critical>

</step>

<step n="2" goal="Load agent digests (not full SKILL.md files)">

<action>For each agent in the chain, load their digest from rihal/digests/{agent}.md — these are 20-line compact summaries with principles, authority, and domain.</action>

<action>Full SKILL.md files are loaded lazily — only if an agent's response needs deeper context during the dispatch.</action>

<critical>Loading 13 digests = ~3k tokens. Loading 13 full SKILL.md files = ~25k tokens. Always use digests for Majlis.</critical>

</step>

<step n="3" goal="Dispatch agent 1 (Sadiq or the chain starter)">

<action>Build the dispatch prompt for agent 1:

```
You are {agent_name} ({arabic_name}), Rihal's {role}.

Your principles:
{from digest}

Your authority:
{from digest}

Project context:
{from .rihal/context/active.md, compacted to 500 tokens max}

Question for the Majlis:
{restated question}

You are the FIRST voice in this Majlis convening. Others will read your response and build on it. Give your honest position following this exact format:

# {Your Name} — {Your Role}

## Position
{STRONG SUPPORT / SUPPORT / CONDITIONAL / NEUTRAL / OPPOSE / STRONG OPPOSE}

## Confidence
{Critical / High / Medium / Low}

## Key Reason
{2-3 sentences — why this is your position}

## What I'd Reject
{Alternative paths you explicitly won't support}

## Conditions (if conditional)
{What must be true for your support}

## Questions for the Rest of the Council
{Things you want other agents to address — this shapes the rest of the chain}

Stay strictly in character. Do not simulate other agents. Do not pre-empt their arguments. You are ONE voice.
```
</action>

<action>Send this prompt. Receive response. Save to conversation state as `agent_1_response`.</action>

<action>Model selection: check models.json for this agent's tier (strategic/execution/quick). Use that model for this dispatch.</action>

</step>

<step n="4" goal="Dispatch agents 2 through N (chain)">

<action>For each subsequent agent in the chain:

Build prompt:
```
You are {agent_name} ({arabic_name}), Rihal's {role}.

Your principles:
{from digest}

Your authority:
{from digest}

Project context:
{same 500-token summary}

Question for the Majlis:
{restated question}

Previous council voices (read these carefully before answering):

## {agent_1_name} said:
{agent_1_response, full}

## {agent_2_name} said:
{agent_2_response, full}

... (all previous agents)

You are agent #{N} in the chain. You have read every voice before you. Your job is to:
1. Add YOUR perspective from your domain of authority
2. If you agree with a previous agent, say so explicitly and strengthen the argument
3. If you disagree with a previous agent, say so by name and explain why
4. If previous agents raised a question in your domain, answer it
5. Do NOT simulate other agents' voices — only your own

Use the exact format:

# {Your Name} — {Your Role}

## Position
{...}

## Confidence
{...}

## Response to Previous Voices
{Who you agree with and why, who you disagree with and why. Name names.}

## Key Reason
{Your core position}

## What I'd Reject
{Paths you won't support}

## Conditions (if conditional)
{...}

## Questions for Remaining Council
{Things you want later agents to address}

Stay strictly in character. You are ONE voice.
```

Send. Receive. Save as `agent_N_response`. Move to next agent.
</action>

<critical>
If an agent's response raises a question in a later agent's domain, the later agent MUST address it in their "Response to Previous Voices" section. This is the chain-of-thought benefit of sequential dispatch.
</critical>

</step>

<step n="5" goal="After the chain completes — Majlis synthesis">

<action>You (the Majlis orchestrator) now read ALL agent responses as a single document.</action>

<action>Produce the Majlis synthesis document:

```markdown
# Majlis Session — {date}

**Question:** {restated}
**Mode:** sequential chain
**Council:** {agent list in order}
**Models used:** {mapping of agent → model from models.json}

## Framing
{from Sadiq's opening response + any reversibility notes}

## Chain of Voices (in order)

### 1. {Sadiq}
{Position + Key Reason from his response}

### 2. {Hussain-PM}
{His position + what he said in response to Sadiq}

### 3. {Waleed}
{His position + response to previous}

... (all agents)

## Positions Summary Table

| # | Agent | Role | Position | Confidence | Responding To |
|---|---|---|---|---|---|
| 1 | Sadiq | Strategy | {pos} | {conf} | — (opening) |
| 2 | Hussain-PM | Product | {pos} | {conf} | Sadiq |
| ... |

## Alignment
{who agreed, who disagreed — but drawn from their actual responses, not fabricated}

## Dissent (surfaced, not buried)
{full paragraphs from dissenting agents, verbatim quotes where possible}

## Critical Questions Raised
{questions that were raised but NOT answered — flag for the user}

## Majlis Synthesis
{2-3 paragraph synthesis that respects authority hierarchy}

## Paths Forward
{2-3 concrete paths with tradeoffs}

## Decision Owner
{agent with final authority + what they need to confirm}

## Full Appendix
{verbatim responses from each agent, in order}
```

Save to `.rihal/progress/majlis-{date}-{slug}.md`.
</action>

</step>

<step n="6" goal="Present to user">

<action>Deliver the synthesis inline. Highlight:
- Chain length (e.g., "9 agents consulted sequentially")
- Any critical dissent with verbatim quote
- Recommended path
- Decision owner
- Token usage (approximate)
- Model mix (e.g., "Opus for 4 strategists, Sonnet for 5 executors")
- File saved at
</action>

<action>Ask: "Proceed with Path A? Or re-convene on a refined question?"</action>

</step>

</workflow>

---

## Why Sequential is Better Than Parallel (for most cases)

| Dimension | Parallel | Sequential |
|---|---|---|
| Filter triggers | High (12 personas simulated at once) | Low (one at a time) |
| Harness support | Requires Task tool | Works everywhere |
| Model mixing | Hard | Easy (per-dispatch) |
| Agent dialogue | None (isolated) | Rich (chain of thought) |
| Time | Fast (parallel) | Slower (serial) |
| Token cost | 12 × full prompt | 1 × prompt + 12 × accumulating chain |
| Dissent quality | Clean but isolated | Contextual and responsive |
| Audit trail | Tree of dispatches | Linear chain |
| Reliability | Depends on all dispatches succeeding | Graceful degradation if one agent times out |

**Sequential is the default.** Use parallel only when:
- You have Task tool access AND
- You specifically want truly uncontaminated reasoning AND
- You're willing to pay the higher token cost

---

## Failure Recovery

### An agent times out mid-chain
Do NOT abort the whole chain. Skip that agent, note in the synthesis: "Agent X timed out — their voice is missing from this Majlis." Continue with the next agent. Offer the user to re-dispatch just the missing agent.

### An agent's response is unusable
Note it explicitly: "Agent X's response was unusable — format violation." Include raw response in appendix. Continue chain.

### The chain contradicts itself late
This is actually valuable. Don't try to resolve it — surface it in the synthesis as "Agent N raised a concern that invalidates earlier assumptions. Re-convening recommended."
