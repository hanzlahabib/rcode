# Majlis Real Convene — Multi-Agent Dispatch Workflow

This workflow makes the Majlis **genuinely multi-agent**. Instead of a single Claude roleplaying all team members, it dispatches real subagents (via Claude Code's `Task` tool or compatible harness) — each with isolated context — and synthesizes their actual responses into the Majlis verdict.

**Why this matters:**
- Each agent's reasoning happens in a separate context window
- Agents cannot influence each other mid-reasoning
- Dissent is real, not simulated
- The orchestrator (you) only sees the final responses, not how each arrived there
- True parallelism — 12 dispatches run simultaneously

**When to use this over single-Claude Majlis:**
- High-stakes strategic decisions
- Technical audience demos (shows real multi-agent)
- When you want audit trail of actual independent agent reasoning
- When the decision affects multiple domains and you need uncontaminated perspectives

**When single-Claude Majlis is enough:**
- Quick cross-domain sanity checks
- When the question is already mostly clear and you just want structured framing
- When subagent dispatch is not available in the current harness

---

<workflow>

<step n="1" goal="Frame the question and determine the council">

<ask>What question brings you to the Majlis today?</ask>

<action>Restate the question clearly so every agent answers the same thing</action>

<action>Determine council scope:
  - **Full** (12 agents): cross-domain strategic questions — default
  - **Technical** (5 agents: Waleed, Omar/Haitham/Yousef, Zayd, Fatima, Khalid): pure tech decisions
  - **Business** (4 agents: Sadiq, Hussain-PM, Mariam, Noor): positioning, scope, GTM
  - **Design** (3 agents: Zahra, Layla, Haitham): visual/UX/brand decisions
</action>

<action>Present the council list to the user and confirm before dispatching</action>

<critical>Dispatching is expensive (tokens + time). Confirm the scope before spawning subagents.</critical>

</step>

<step n="2" goal="Prepare dispatch briefs for each council member">

For each agent in the council, prepare a dispatch brief that:

1. **Loads their persona** — read the agent's SKILL.md to get principles, authority, communication style
2. **States the question** — exact same wording for every agent (so answers are comparable)
3. **Provides project context** — relevant facts from `.rihal/state.json` and `.rihal/context/active.md`
4. **Requests structured output** — every agent must respond in this exact format:

```markdown
# {Agent Name} — {Role} — Position

## Position
{One of: STRONG SUPPORT / SUPPORT / CONDITIONAL / NEUTRAL / OPPOSE / STRONG OPPOSE}

## Confidence
{Critical / High / Medium / Low}

## Key Reason
{2-3 sentences — the core of my position}

## What I'd Reject
{What alternative paths I would NOT support, and why}

## Conditions
{If my position is CONDITIONAL — what must be true for me to support}

## Cost to My Domain
{If this proceeds, what's the impact on my area of authority}

## Open Questions
{What I don't know that would change my position}
```

<critical>The format must be identical across all agents. Do NOT ask for free-form responses — they become impossible to synthesize.</critical>

</step>

<step n="3" goal="Dispatch subagents in parallel">

<action>For each agent in the council, invoke the Task tool with:
  - `subagent_type`: "general-purpose" (or a specific Rihal-aware subagent if available)
  - `description`: "{Agent name} position on: {question}"
  - `prompt`: The dispatch brief from Step 2, including:
    - Load the agent's SKILL.md content inline (do NOT reference by path)
    - The restated question
    - Project context summary
    - The required output format (exactly as above)
    - Critical instruction: "Stay in character. Answer only from this agent's perspective. Do not consider what other agents might say. Your response will be combined with others by the Majlis orchestrator."
</action>

<critical>
Dispatch ALL agents in a SINGLE message with multiple Task tool calls. Do NOT dispatch sequentially.
This gives true parallelism and keeps the council's voices uncontaminated by each other.
</critical>

<action>Note: For Claude Code specifically, this means multiple Task tool calls in one turn.</action>

</step>

<step n="4" goal="Collect and structure responses">

<action>Wait for all subagents to return. Each returns a structured markdown response as specified in Step 2.</action>

<action>Parse each response into a standard record:
```
agent_name | role | position | confidence | key_reason | rejections | conditions | cost | questions
```
</action>

<action>Verify every council member responded. If any agent timed out or returned unusable output, note it explicitly in the final synthesis as "Agent X's position could not be captured — re-dispatch if needed."</action>

<action>Do NOT silently drop missing agents. Transparency is load-bearing.</action>

</step>

<step n="5" goal="Build the positions table">

<action>Produce a markdown table with columns:
| Agent | Role | Position | Confidence | Key Reason |

Use color icons for at-a-glance scanning:
- 🟢 STRONG SUPPORT / SUPPORT
- 🟡 CONDITIONAL / NEUTRAL
- 🔴 OPPOSE / STRONG OPPOSE
</action>

</step>

<step n="6" goal="Identify alignment and dissent">

<action>Group agents by position:
- Who aligns? (count and name them)
- Who dissents? (count and name them)
- Who is conditional? (on what specific condition)
</action>

<action>For each dissent, quote the agent's Key Reason verbatim. Dissent is surfaced, not summarized.</action>

<critical>Never hide minority views. If even ONE agent strongly opposes, their full reasoning gets a dedicated paragraph in the output.</critical>

</step>

<step n="7" goal="Assess the weight of each position">

<action>Not all positions carry equal weight. Weight by:
1. **Authority:** Does this agent have final say in the domain the decision touches?
   - Waleed on tech stack
   - Sadiq on strategy
   - Hussain-PM on product scope
   - Fatima on release readiness
   - Ahmed Al Hassani on delivery feasibility
2. **Confidence:** Critical > High > Medium > Low
3. **Cost to their domain:** An agent who says "this destroys my ability to function" carries more weight than one who says "it'll be fine"

Produce a weighted summary: "The council is split X/Y, but Fatima's opposition is load-bearing because she owns release gating and her confidence is Critical."
</action>

</step>

<step n="8" goal="Generate paths forward">

<action>Based on the council's real positions (not a majority vote), synthesize 2-3 concrete paths:
- **Path A:** The preferred path respecting authority boundaries
- **Path B:** The alternative for those who dissented
- **Path C:** A middle path if the split is genuine and irreconcilable

Each path includes:
- What we'd do
- Who it satisfies / who it disappoints
- Kill criterion (when we'd abandon this path)
- Trade-off summary
</action>

</step>

<step n="9" goal="Name the decision owner">

<action>Based on the question's primary domain, name the agent with final authority:
- Tech question → Waleed (CTO)
- Strategy question → Sadiq
- Product scope → Hussain-PM
- Release readiness → Fatima
- Delivery feasibility → Ahmed Al Hassani
- Brand identity → Zahra
- Multi-domain strategic → Escalate to human user (Hanzla)

The Majlis synthesizes but does NOT decide. The decision owner makes the call with the Majlis output as input.
</action>

</step>

<step n="10" goal="Save the session">

<action>Save the complete Majlis session to `.rihal/progress/majlis-{YYYY-MM-DD}-{slug}.md`:

```markdown
# Majlis Session — {date}

**Question:** {restated question}
**Council scope:** {full / technical / business / design}
**Agents convened:** {list}
**Dispatch mode:** real (subagent parallel)

## Framing
{context, reversibility, decision owner}

## Positions Table
{markdown table}

## Alignment
{who agreed}

## Dissent (not buried)
{full paragraph per dissenter}

## Weight Analysis
{who's load-bearing}

## Majlis Synthesis
{2-3 paragraphs}

## Paths Forward
{Path A / B / C with trade-offs}

## Decision Owner
{agent name + what they need to decide}

## Full Agent Responses (appendix)
{verbatim responses from each dispatched subagent}
```
</action>

<action>Also append a summary entry to `.rihal/progress/majlis-history.md` for quick browsing.</action>

</step>

<step n="11" goal="Present to user">

<action>Deliver the markdown output inline in the conversation. Highlight:
- The split (e.g., "5/3 with 4 conditional")
- Critical dissent (if any)
- Recommended path
- Who decides next
- File path where full session is saved
</action>

<action>Ask: "Do you want me to (1) escalate to Raees for execution, (2) re-dispatch with refined question, (3) save and end?"</action>

</step>

</workflow>

---

## Failure Modes and Recovery

### Failure 1: Subagent dispatch not available
**Cause:** Current harness doesn't support Task tool or multi-agent dispatch.

**Recovery:** Fall back to single-Claude Majlis (the default `majlis-council` skill). Warn user: "Real multi-agent dispatch unavailable. Running single-Claude Majlis instead — same structure, but reasoning is not truly independent."

### Failure 2: Agent timeout
**Cause:** One or more subagents take too long or crash.

**Recovery:** Note missing agents explicitly in the output. Do NOT fabricate their positions. Re-dispatch only the missing ones if the user wants.

### Failure 3: Unusable agent response
**Cause:** A subagent returns free-form text instead of the required format.

**Recovery:** Re-dispatch that single agent with a more explicit format reminder. If it fails twice, note "Agent X response could not be structured — raw response available in appendix."

### Failure 4: Token explosion
**Cause:** Full council dispatch on a complex question consumes 50k+ tokens.

**Recovery:** Suggest user narrow the council scope (technical / business / design) instead of full. Only dispatch 3-6 agents unless the question genuinely touches every domain.

---

## Example Invocation (Claude Code Pseudocode)

```
User: *convene "Should we pivot to private enterprise?"

Majlis:
  Framing: "Question restated: should Rihal shift its GTM from government-first to enterprise-first?"
  Council: Sadiq, Waleed, Hussain-PM, Mariam, Khalid, Noor (6 agents — business-focused scope)

  [Parallel dispatch — ONE message, SIX Task calls]
  Task(description="Sadiq position on GTM pivot", prompt="<Sadiq's full persona + question + format>")
  Task(description="Waleed position on GTM pivot", prompt="<Waleed's full persona + question + format>")
  Task(description="Hussain-PM position on GTM pivot", prompt="<Hussain-PM's full persona + question + format>")
  Task(description="Mariam position on GTM pivot", prompt="<Mariam's full persona + question + format>")
  Task(description="Khalid position on GTM pivot", prompt="<Khalid's full persona + question + format>")
  Task(description="Noor position on GTM pivot", prompt="<Noor's full persona + question + format>")

  [Wait for all 6 to return structured responses]

  [Synthesize table, alignment, dissent, paths, decision owner]

  [Save to .rihal/progress/majlis-2026-04-10-gtm-pivot.md]

  [Present inline to user]
```

---

## Why This Is Different From Single-Claude Majlis

| Dimension | Single-Claude Majlis | Real Multi-Agent Majlis |
|---|---|---|
| Agent reasoning | One model roleplaying 12 personas | 12 separate model invocations |
| Context isolation | None — all personas share context | Full — each subagent has its own |
| Parallelism | Sequential (Claude writes one voice at a time) | True parallel (all dispatch at once) |
| Dissent authenticity | Simulated (Claude constructs disagreement) | Real (agents disagree because their priors differ) |
| Demo credibility | "Structured framework" | "Actual multi-agent system" |
| Token cost | Low (single response) | High (12x dispatches) |
| Time | Fast (seconds) | Slower (minutes) |
| Use case | Quick sanity checks, cross-domain framing | High-stakes decisions, demos, audit trails |

Use the right tool for the job. Both are valid; they serve different needs.
