# Three Modes: Council vs. Chain vs. Discuss

Understanding when and how to use each execution mode.

---

## Quick comparison

| Mode | Command | Agents | Parallelism | Output | Use when |
|------|---------|--------|-------------|--------|----------|
| **Council** | `/rcode-council` | 3-5 | Parallel | Single artifact with all voices | Making decisions where disagreement is valuable |
| **Chain** | `/rcode-chain` | 2-7+ | Sequential | Typed artifacts per stage (RESEARCH → SCOPE → PLAN) | Building something step-by-step where each step depends on the previous |
| **Discuss** | `/rcode-discuss` | 1 | N/A | Conversational, optional artifact | Quick questions, expert advice, fast feedback |

---

## Council Mode: Parallel Debate

**Command:** `/rcode-council "your question"`

**Mental model:** Bring together 3-5 people in a room. Each speaks for the question. Then they challenge each other's points. You hear all perspectives before deciding.

### When to use

- **Strategic decisions** where you want disagreement:
  - "Should we rewrite the auth system?"
  - "Should we pivot to a different market?"
  - "Is this tech debt worth addressing now?"

- **Risk assessment** across disciplines:
  - "What could go wrong with this approach?"
  - "Is this release ready?"
  - "Can we scale this architecture?"

- **Option evaluation** where trade-offs exist:
  - "PostgreSQL or MongoDB?"
  - "Monolith or microservices?"
  - "Buy or build this feature?"

- **Kill criteria** — when you need a no-go decision:
  - "What would make us stop this project?"
  - "When should we pivot away from this approach?"

### Example

```
/rcode-council should we migrate from monolith to microservices?
```

**Flow:**

**Round 1:** All agents answer independently
- Waleed (CTO): Pros/cons, architecture complexity, scaling benefit
- Sadiq (Strategy): Time/cost trade-off, market window, hiring needs
- Fatima (QA): Testing implications, deployment risk, rollback difficulty
- Mariam (Marketing): Time to new features (go-to-market impact)
- Hussain-PM (PM): Feature velocity impact, scope boundaries

**Round 2:** Each agent responds to others' points
- Waleed challenges Sadiq's timeline ("3 months is optimistic")
- Fatima pushes back on Mariam ("Feature velocity actually decreases initially")
- Sadiq questions whether the market window justifies the risk
- Etc.

**Output:** `.planning/council-sessions/council-2026-04-12-microservices.md`

Contains all Round 1 + Round 2 responses, flagged with the sharpest disagreements.

### Command syntax

```
# Basic debate
/rcode-council should we use react or vue?

# Override panel (pick specific agents)
/rcode-council --agents=waleed,fatima should we move to serverless?

# Force all 5 agents
/rcode-council --full "our biggest technical risk"

# See panel scoring breakdown
/rcode-council --explain "should we hire a DevOps person?"
```

### Output format

```markdown
# Council Session: Should we migrate to microservices?

**Date:** 2026-04-12 15:00  
**Panel:** Waleed (CTO), Sadiq (Strategy), Fatima (QA), Mariam (Marketing)  
**Status:** Concluded, decision pending

---

## Round 1 — Initial Responses

### 🏗️ Waleed (CTO)

[Full response on architecture, scaling, complexity, risk, timeline]

Recommendation: YES, but phase over 6 months, not 3

### 🧭 Sadiq (Strategy)

[Full response on market timing, competitive advantage, cost, hiring]

Recommendation: NO — market window closes in 4 months, can't migrate in time

### 🛡️ Fatima (QA)

[Full response on testing, deployment, rollback, regression risk]

Recommendation: MAYBE — depends on deployment automation quality

### 📣 Mariam (Marketing)

[Full response on feature velocity, GTM, market perception]

Recommendation: YES — but only if we can ship features on month 4

---

## Round 2 — Cross-talk & Challenges

### 🏗️ Waleed

> On Sadiq's timeline concern: A phased approach could deliver business value earlier...

[Detailed response]

### 🧭 Sadiq

> Waleed's 6-month timeline is realistic, but Mariam's assumption of month-4 feature ships is unrealistic...

[Detailed response]

### 🛡️ Fatima

> Both are underestimating automation effort. Here's what I've seen in similar migrations...

[Detailed response]

---

## Orchestrator's Note

**Sharpest disagreement:** Sadiq (NO on timing) vs. Waleed (YES, phased)

**Key open question:** Can we ship new features month 4-6 during migration? Fatima says unlikely without DevOps hire first.

**Suggested decision path:**
1. Hire DevOps engineer (de-risks timeline)
2. Commit to 6-month phase (Waleed's estimate)
3. Re-evaluate market window (Sadiq's concern)
```

---

## Chain Mode: Sequential Pipeline

**Command:** `/rcode-chain [preset|agents] "your topic"`

**Mental model:** Assembly line. Researcher passes findings to architect, who passes to PM, who passes to planner. Each stage refines, doesn't redo.

### When to use

- **Structured workflows** where sequence matters:
  - Research → Scope → Plan (GTM discovery)
  - Research → Architecture → Feasibility → Plan
  - Market research → GTM strategy → Feature scope → Plan

- **Building something complex** with multiple specialties:
  - "Build a SaaS for X market in Y region"
  - "Feasibility of migrating to serverless"
  - "Full discovery for new product"

- **When you need typed outputs** at each stage:
  - RESEARCH.md — what we learned
  - SCOPE.md — what we'll build
  - PLAN.md — how we'll build it

- **Exploratory discovery** before committing to a direction

### Example

```
/rcode-chain research-plan build a rental app for dubai
```

**Preset:** `research-plan` (researcher → PM → planner)

**Flow:**

1. **Researcher (Mariam)** runs first
   - Inputs: "rental app for dubai"
   - Outputs: RESEARCH.md (market size, competitors, user needs, regulatory environment)

2. **PM (Hussain-PM)** reads RESEARCH.md
   - Inputs: RESEARCH.md + original topic
   - Outputs: SCOPE.md (features, user stories, MVP definition)

3. **Planner** reads SCOPE.md
   - Inputs: SCOPE.md + original topic
   - Outputs: PLAN.md (phases, tasks, timelines, success criteria)

Each agent reads the previous output and builds on it. No information is lost; everything compounds.

### Presets

Built-in presets for common workflows:

**`research-plan`** — Mariam → Hussain-PM → Planner
- Best for: New product ideas, market entry strategy
- Output: 3 documents (RESEARCH.md, SCOPE.md, PLAN.md)

**`feasibility`** — Waleed → Architect → Plan-checker
- Best for: Technical feasibility questions, "can we do this?"
- Output: 3 documents (FEASIBILITY.md, ARCHITECTURE.md, VERIFICATION.md)

**`gtm-to-build`** — Mariam → Waleed → Hussain-PM → Planner
- Best for: End-to-end GTM + build discovery
- Output: 4 documents (MARKET.md, ARCHITECTURE.md, SCOPE.md, PLAN.md)

**`full-discovery`** — Researcher → Advisor-researcher → Architect → PM → Planner
- Best for: Complete discovery before building anything
- Output: 5 documents (RESEARCH.md, SYNTHESIS.md, ARCHITECTURE.md, SCOPE.md, PLAN.md)

### Custom chains

```
/rcode-chain researcher,architect,planner "should we rewrite in Go?"
```

Comma-separated agent names in order. Each reads previous output.

### Command syntax

```
# Preset
/rcode-chain research-plan build a rental app

# Feasibility check
/rcode-chain feasibility migrate to serverless

# GTM + build path
/rcode-chain gtm-to-build build a saas for docstring generation

# Custom chain
/rcode-chain advisor-researcher,architect,auditor "is this framework suitable?"
```

### Output format

```markdown
# Chain: Research-Plan for Rental App (Dubai)

**Status:** Complete (3 stages)  
**Date:** 2026-04-12 10:00–12:30  
**Duration:** 2.5 hours

---

## Stage 1: Research (Mariam)

**Input:** "build a rental app for dubai"

[RESEARCH.md content]

---

## Stage 2: Scope (Hussain-PM)

**Input:** 
- Topic: "build a rental app for dubai"
- Previous: RESEARCH.md

[SCOPE.md content]

---

## Stage 3: Plan (Planner)

**Input:**
- Topic: "build a rental app for dubai"
- Previous: RESEARCH.md, SCOPE.md

[PLAN.md content]

---

## Next Steps

Suggested action: `/rcode-execute .planning/phases/01/PLAN.md`

---

## Chain Summary

- **Market finding:** Underserved rental market, 45K monthly searches, high unit economics
- **Planned MVP:** Web-first, focus on B2C, payment integration via Stripe
- **Estimated effort:** 4 phases over 8 weeks
- **Key unknowns:** Regulatory environment (flagged for phase 2)
```

---

## Discuss Mode: Quick Expert Sync

**Command:** `/rcode-discuss [agent] "your question"`

**Mental model:** Text one colleague. Fast, conversational, no ceremony. Optional artifact.

### When to use

- **Quick questions** where one expert is enough:
  - "Can we use Redis for this?"
  - "Is this release ready?"
  - "What's the simplest way to add 2FA?"

- **Expert advice** without needing full debate:
  - "What's the right testing strategy here?"
  - "Is this a code smell?"
  - "How would you approach this problem?"

- **Sanity checks** mid-execution:
  - "Are we on track?"
  - "Should we pivot on this task?"

- **No artifact needed** — just guidance

### Example

```
/rcode-discuss waleed should we use postgres jsonb or separate tables for nested data?
```

**Flow:**

1. Question is routed to Waleed (if specified) or auto-routed by panel scorer
2. Agent responds conversationally (no Round 2, no required structure)
3. Response can be 2 sentences or a detailed architectural note
4. Optional artifact saved if response is substantive

**Output:** Conversational response, saved only if agent decides to create artifact.

### Auto-routing

If no agent specified:

```
/rcode-discuss what's the best way to handle authentication errors?
```

Panel scorer picks agent by keyword (likely Waleed for tech, Fatima for testing, Sadiq for strategy).

Run with `--explain` to see scoring:

```
/rcode-discuss --explain "how do we handle authentication errors?"

→ Fatima picked (test strategy +20, error handling +15)
```

### Command syntax

```
# Ask specific agent
/rcode-discuss waleed can we use redis for sessions?

# Auto-route to best expert
/rcode-discuss what's the kill criterion for this project?

# Named discussion (gives it a title)
/rcode-discuss --title="Redis Session Store" waleed "Redis vs sessions?"

# Show agent scoring
/rcode-discuss --explain "should we use TypeScript?"
```

### Output format

Informal, conversational. Example:

```
> /rcode-discuss fatima is this release ready?

🛡️ Fatima

Depends — what's your definition of "ready"?

If you mean "no known critical bugs and feature-complete", we're solid. Test coverage is 87% (above 80% threshold). 

If you mean "zero edge cases", never. There's always one more scenario.

**My vote:** YES, release. But flag these as known limitations:
- Bulk import over 100K items not tested (can add after launch)
- Multi-region sync timing edge case (rare, documented)

**Recommendation:** Ship with v1.0 label, plan v1.1 for these edge cases post-launch.
```

---

## Comparison: When to pick each

### Council if...
- Decision requires multiple perspectives ✓
- You want to hear disagreement ✓
- Strategic/kill criteria decision ✓
- Need artifact documenting all viewpoints ✓
- Example: "Should we rewrite the auth system?"

### Chain if...
- Building something step-by-step ✓
- Each stage depends on previous ✓
- Need typed outputs (RESEARCH → SCOPE → PLAN) ✓
- Exploratory, gathering info first ✓
- Example: "Plan a new product launch"

### Discuss if...
- Quick question, one expert enough ✓
- No artifact needed ✓
- Just need guidance/sanity check ✓
- Conversational tone preferred ✓
- Example: "Should we use Redis here?"

---

## Combining modes

Common workflow:

```
# 1. Quick research
/rcode-discuss what market should we target?

# 2. Full discovery
/rcode-chain research-plan build app for that market

# 3. Debate next steps
/rcode-council should we build this or acquire?

# 4. Finalize plan
/rcode-plan implement feature from chain

# 5. Execute
/rcode-execute .planning/phases/01/PLAN.md
```

Each mode feeds into the next.

---

## Output comparison

**Council output:**
```
council-2026-04-12-microservices.md
├── Round 1 — All agents independently
├── Round 2 — Cross-talk and challenges
└── Orchestrator's note — Sharpest disagreement
```

**Chain output:**
```
chain-2026-04-12-research-plan.md
├── Stage 1 — Researcher output (RESEARCH.md)
├── Stage 2 — Architect output (ARCHITECTURE.md)
└── Stage 3 — Planner output (PLAN.md)
```

**Discuss output:**
```
[Conversational response in thread, optional artifact]
```

---

## Pro tips

1. **Start with discuss** — quick sanity check
2. **Then chain** — if you need structured discovery
3. **Then council** — if you need decision consensus
4. **Then plan + execute** — once direction is clear

2. **Use `--explain`** on council/discuss to see panel scoring logic

3. **Presets encode best practices** — `research-plan` is 3 agents in order; customize only if you need something different

4. **Save chain outputs** — Artifact is a single document per stage, easy to share/version control

5. **Council is for debate, not planning** — If you already know what to build, chain or plan directly

---

## See also

- `docs/commands.md` — Full syntax for each mode
- `docs/agents.md` — Which agents appear in each mode
- README.md — 90-second examples
