# Agent Reference

All 35+ agents in Rihal Code, their roles, and when they spawn.

---

## Council Agents (5)

These are the primary decision-makers, spawned by `/rihal:council` debates.

### 🧭 Sadiq (صادق) — Director of Strategy

**Role:** Strategic prioritization, go/no-go decisions, market timing, kill criteria.

**Spawns for:**
- "Should we build X?" questions
- Pivot/pivot-not decisions
- Kill criteria discussions
- Market timing and GTM questions
- Scope prioritization

**Response style:** Direct, decisive. Rates options on strategic value. Calls out kill criteria early.

**Profile:** Thinks in terms of impact vs. effort. Focuses on market fit first. Asks: "Why does this matter?"

---

### 🏗️ Waleed (وليد) — CTO

**Role:** Architecture, stack choices, feasibility, scalability, technical debt, security.

**Spawns for:**
- Stack selection ("postgres or nosql?")
- Architecture decisions
- Feasibility questions
- Tech debt discussions
- Performance/scale concerns
- Security decisions

**Response style:** Systematic, constraint-aware. Proposes trade-offs. Focuses on long-term maintainability.

**Profile:** Thinks in systems. Concerned with edge cases, error paths, and operational complexity. Asks: "How does this fail?"

---

### 🛡️ Fatima (فاطمة) — QA Lead

**Role:** Test strategy, release readiness, risk assessment, coverage analysis.

**Spawns for:**
- "Is this release ready?" questions
- Test strategy discussions
- Regression risk assessment
- Coverage adequacy questions
- Quality gate decisions

**Response style:** Risk-forward, specific. Names worst-case scenarios. Defines verifiable success criteria.

**Profile:** Thinks in failure modes. Concerned with what's not being tested. Asks: "What breaks?"

---

### 📣 Mariam (مريم) — Marketing & Growth

**Role:** Market research, GTM strategy, positioning, GCC/MENA markets, user research.

**Spawns for:**
- Market research questions
- GTM positioning
- User research insights
- GCC/MENA-specific questions (auto-triggered by multilingual classifier)
- Growth strategy
- Competitive analysis

**Response style:** User-centric, narrative. Connects to customer problems. Positions solutions in market context.

**Profile:** Thinks in users. Concerned with PMF and adoption. Asks: "Who needs this and why?"

**Auto-triggers:** Questions containing `dubai`, `affiliate`, `karobar`, `bnanai`, `دبئی`, `مارکیٹ`, etc.

---

### 📋 Hussain-PM (حسين) — Product Manager

**Role:** Scope definition, roadmap, features, user stories, PRDs, sprint planning.

**Spawns for:**
- Scope questions ("What should we build?")
- Feature prioritization
- Roadmap planning
- User story definition
- PRD creation
- Sprint planning

**Response style:** Structured, requirements-focused. Produces actionable specs. Balances stakeholder needs.

**Profile:** Thinks in user value and business outcomes. Concerned with scope creep and dependencies. Asks: "What's the outcome?"

---

## Specialist Agents (30+)

Spawned by specific commands and workflows. Not typically called directly; the system routes you to them.

### Execution Agents

#### rihal-executor
**Purpose:** Execute tasks from a plan. Creates files, runs commands, writes code.

**Spawned by:** `/rihal:execute`, `/rihal:quick`, `/rihal:autonomous`

**Constraints:**
- Follows Karpathy guidelines (think first, simplicity, surgical changes, goal-driven)
- Implements only what's in the PLAN.md task
- Makes atomic commits per task
- Stops and reports blockers, doesn't guess

---

#### rihal-planner
**Purpose:** Break down a goal into PLAN.md with tasks, subtasks, success criteria.

**Spawned by:** `/rihal:plan`, `/rihal:chain research-plan`, chain pipelines

**Output:** `.planning/phases/{NN}/PLAN.md` with:
- Task list (numbered)
- Subtasks per task
- Success criteria (verifiable)
- Estimated effort
- Dependencies

**Loops:** If plan-checker fails, planner gets feedback and retries (max 2 retries).

---

#### rihal-verifier
**Purpose:** Verify that completed code matches plan intent.

**Spawned by:** `/rihal:execute` (post-completion)

**Checks:**
- All tasks from plan are complete
- No extra undocumented changes
- Files match expected structure
- Tests written as specified

---

#### rihal-plan-checker
**Purpose:** Validate PLAN.md before execution.

**Spawned by:** `/rihal:plan` (post-planner)

**Checks:**
- All referenced files exist in codebase
- All referenced functions/classes exist
- All dependencies installed
- Test infrastructure present
- No circular dependencies

**Behavior:** On failure, passes feedback to planner (max 2 retries).

---

#### rihal-debugger
**Purpose:** Systematic debugging of failed tasks.

**Spawned by:** `/rihal:debug`, `/rihal:correct-course`

**Approach:**
1. Reproduce the error
2. Isolate the root cause
3. Propose minimal fix
4. Validate fix

---

### Discovery Agents

#### rihal-codebase-mapper
**Purpose:** Analyze and document project structure.

**Spawned by:** `/rihal:map-codebase`, `/rihal:new-project`

**Output:**
- Module/service topology
- Key files and entry points
- Technology stack
- Dependency graph

---

#### rihal-project-researcher
**Purpose:** Research a project topic deeply.

**Spawned by:** `/rihal:chain research-plan`, `/rihal:new-project`

**Output:** RESEARCH.md with:
- Market context
- Competitor analysis
- User needs analysis
- Technology trends
- Regulatory considerations

---

#### rihal-roadmapper
**Purpose:** Create a phased roadmap from research.

**Spawned by:** `/rihal:chain gtm-to-build`, chain pipelines

**Output:** ROADMAP.md with:
- Phases and dependencies
- Milestones
- Release criteria
- Success metrics

---

#### rihal-phase-researcher
**Purpose:** Deep research for a specific phase.

**Spawned by:** `/rihal:chain research-plan`, `/rihal:do` (when planning)

**Focuses on:** What needs to be learned before building this phase.

---

#### rihal-advisor-researcher
**Purpose:** Expert advice gathering (interview subjects, domain experts).

**Spawned by:** Research workflows when external expertise needed

**Output:** Interview summaries and expert recommendations.

---

#### rihal-assumptions-analyzer
**Purpose:** Surface hidden assumptions in a plan.

**Spawned by:** `/rihal:review-adversarial`

**Produces:**
- List of assumptions made
- Risk if assumption is wrong
- Validation strategy

---

#### rihal-research-synthesizer
**Purpose:** Synthesize multiple research sources into actionable insights.

**Spawned by:** Chain pipelines after researcher outputs

**Output:** SYNTHESIS.md with:
- Key findings
- Confidence levels
- Actionable next steps

---

### Verification & Quality Agents

#### rihal-integration-checker
**Purpose:** Cross-phase E2E verification.

**Spawned by:** `/rihal:execute` (post-gate)

**Checks:**
- No phase breaks previous phases
- All inter-phase contracts maintained
- E2E flows work end-to-end
- Data contracts honored

---

#### rihal-nyquist-auditor
**Purpose:** Verify test coverage is adequate.

**Spawned by:** `/rihal:execute` (post-gate)

**Checks:**
- Coverage thresholds met
- Happy path + error path covered
- Edge cases have tests
- No obvious gaps

**Named after:** Nyquist sampling theorem (sample at 2x frequency to avoid aliasing — test at 2x typical edge frequency).

---

#### rihal-tech-writer
**Purpose:** Write technical documentation.

**Spawned by:** `/rihal:docs-update`, `/rihal:document-project`

**Produces:**
- Architecture docs
- API documentation
- Deployment guides
- Troubleshooting guides

---

#### rihal-ux-designer
**Purpose:** Design interaction flows and UI specs.

**Spawned by:** `/rihal:ui-phase`, `/rihal:plan` (for UI-heavy phases)

**Output:** UI-SPEC.md with:
- Component list
- Wire frames
- Design system usage
- Accessibility checklist

---

#### rihal-architect
**Purpose:** Design system architecture.

**Spawned by:** `/rihal:chain feasibility`, `/rihal:council` (architecture debates)

**Output:**
- Architecture diagrams
- Data flow
- Service boundaries
- Scaling considerations

---

#### rihal-code-reviewer
**Purpose:** Review code for quality and style.

**Spawned by:** `/rihal:code-review`, `/rihal:audit-fix`

**Checks:**
- Code clarity
- Naming conventions
- Complexity
- Test coverage
- Performance

---

#### rihal-code-fixer
**Purpose:** Auto-fix code review issues.

**Spawned by:** `/rihal:code-review-fix`, `/rihal:audit-fix`

**Implements:**
- Style fixes
- Refactoring suggestions
- Test additions
- Documentation

---

#### rihal-edge-case-hunter
**Purpose:** Find error paths and boundary conditions.

**Spawned by:** `/rihal:review-edge-case-hunter`, `/rihal:audit-fix`

**Finds:**
- Uncaught exceptions
- Boundary conditions
- Race conditions
- Input validation gaps

---

#### rihal-deviation-analyzer
**Purpose:** Detect when code deviates from plan.

**Spawned by:** `/rihal:execute` (verification step)

**Checks:**
- Implemented vs. planned scope match
- Naming matches plan
- No undocumented features

---

### More Specialized Agents

#### rihal-docs-auditor
**Purpose:** Audit documentation completeness and accuracy.

**Spawned by:** `/rihal:docs-update`, `/rihal:secure-phase`

---

#### rihal-doc-verifier
**Purpose:** Verify documentation is up-to-date with code.

**Spawned by:** Post-execute workflows

---

#### rihal-doc-writer
**Purpose:** Write user-facing documentation.

**Spawned by:** `/rihal:docs-update`

---

#### rihal-repo-metrics
**Purpose:** Calculate project health metrics.

**Spawned by:** `/rihal:stats`, `/rihal:health`

---

#### rihal-security-auditor
**Purpose:** Security-focused code review.

**Spawned by:** `/rihal:secure-phase`, `/rihal:review-adversarial`

---

## Global Agents (Custom)

You can define your own agents at:

```
~/.rihal/agents/rihal-<name>.md
```

They appear in every project without forking. Format:

```markdown
---
name: rihal-my-expert
alias: my-expert
role: Your custom role
model: claude-opus-4-20250514
---

(Agent persona and constraints)
```

**Trigger in commands:**
```
/rihal:discuss my-expert should we use this library?
/rihal:chain my-expert,sadiq,waleed your topic
```

---

## How to spawn agents

### Explicitly (by name)
```
/rihal:discuss waleed what's the best stack?
/rihal:chain researcher,planner,executor "your topic"
```

### Implicitly (by panel scorer)
```
/rihal:council should we build this?
```
Scorer picks 3-5 agents based on question keywords.

### Via specific commands
```
/rihal:plan build auth module
```
Spawns: planner → plan-checker (verification) → may spawn executor

```
/rihal:execute .planning/phases/01/PLAN.md
```
Spawns: executor → verifier → integration-checker → nyquist-auditor

---

## Panel scoring (deterministic)

The council scorer is deterministic, not LLM-based:

```javascript
// cli/lib/council-panel.cjs
const KEYWORD_WEIGHTS = {
  "sadiq": ["should", "kill", "pivot", "worth", "start"],
  "waleed": ["architecture", "stack", "scale", "tech debt", "security"],
  "fatima": ["test", "release", "ready", "coverage", "risk"],
  "mariam": ["market", "gtm", "user", "research", "growth"],
  "hussain-pm": ["scope", "feature", "roadmap", "prd", "sprint"],
};
```

Run with `--explain` to see scoring:

```
/rihal:council should we move to microservices? --explain
```

Output:
```
Panel: [waleed, sadiq, fatima]
- waleed: 45 points (architecture +20, scale +15, tech debt +10)
- sadiq: 30 points (pivot concerns +15, kill criteria +15)
- fatima: 25 points (release risk +15, testing +10)
```

---

## Agent response style contracts

Every agent has documented response constraints:

1. **Scope** — what topics are in scope vs. out
2. **Tone** — formal vs. conversational
3. **Output format** — structured vs. narrative
4. **Disagreement style** — how they challenge others

Read agent files in `.claude/agents/rihal-*.md` for full definitions.

---

## See also

- `README.md` — Agent overview
- `docs/three-modes.md` — Council vs. chain vs. discuss
- `docs/faq.md` — "How do I customize an agent?"
