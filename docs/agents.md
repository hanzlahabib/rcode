# Agent Reference

All 43 agents in rcode, their roles, and when they spawn.

---

## Council Agents (5)

These are the primary decision-makers, spawned by `/rcode-council` debates.

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

## Specialist Agents (39)

Spawned by specific commands and workflows. Not typically called directly; the system routes you to them.

### Execution Agents

#### rcode-executor
**Purpose:** Execute tasks from a plan. Creates files, runs commands, writes code.

**Spawned by:** `/rcode-execute`, `/rcode-quick`, `/rcode-autonomous`

**Constraints:**
- Follows Karpathy guidelines (think first, simplicity, surgical changes, goal-driven)
- Implements only what's in the PLAN.md task
- Makes atomic commits per task
- Stops and reports blockers, doesn't guess

---

#### rcode-planner
**Purpose:** Break down a goal into PLAN.md with tasks, subtasks, success criteria.

**Spawned by:** `/rcode-plan`, `/rcode-chain research-plan`, chain pipelines

**Output:** `.planning/phases/{NN}/PLAN.md` with:
- Task list (numbered)
- Subtasks per task
- Success criteria (verifiable)
- Estimated effort
- Dependencies

**Loops:** If plan-checker fails, planner gets feedback and retries (max 2 retries).

---

#### rcode-verifier
**Purpose:** Verify that completed code matches plan intent.

**Spawned by:** `/rcode-execute` (post-completion)

**Checks:**
- All tasks from plan are complete
- No extra undocumented changes
- Files match expected structure
- Tests written as specified

---

#### rcode-plan-checker
**Purpose:** Validate PLAN.md before execution.

**Spawned by:** `/rcode-plan` (post-planner)

**Checks:**
- All referenced files exist in codebase
- All referenced functions/classes exist
- All dependencies installed
- Test infrastructure present
- No circular dependencies

**Behavior:** On failure, passes feedback to planner (max 2 retries).

---

#### rcode-debugger
**Purpose:** Systematic debugging of failed tasks.

**Spawned by:** `/rcode-debug`, `/rcode-correct-course`

**Approach:**
1. Reproduce the error
2. Isolate the root cause
3. Propose minimal fix
4. Validate fix

---

### Discovery Agents

#### rcode-codebase-mapper
**Purpose:** Analyze and document project structure.

**Spawned by:** `/rcode-map-codebase`, `/rcode-new-project`

**Output:**
- Module/service topology
- Key files and entry points
- Technology stack
- Dependency graph

---

#### rcode-project-researcher
**Purpose:** Research a project topic deeply.

**Spawned by:** `/rcode-chain research-plan`, `/rcode-new-project`

**Output:** RESEARCH.md with:
- Market context
- Competitor analysis
- User needs analysis
- Technology trends
- Regulatory considerations

---

#### rcode-roadmapper
**Purpose:** Create a phased roadmap from research.

**Spawned by:** `/rcode-chain gtm-to-build`, chain pipelines

**Output:** ROADMAP.md with:
- Phases and dependencies
- Milestones
- Release criteria
- Success metrics

---

#### rcode-phase-researcher
**Purpose:** Deep research for a specific phase.

**Spawned by:** `/rcode-chain research-plan`, `/rcode-do` (when planning)

**Focuses on:** What needs to be learned before building this phase.

---

#### rcode-advisor-researcher
**Purpose:** Expert advice gathering (interview subjects, domain experts).

**Spawned by:** Research workflows when external expertise needed

**Output:** Interview summaries and expert recommendations.

---

#### rcode-assumptions-analyzer
**Purpose:** Surface hidden assumptions in a plan.

**Spawned by:** `/rcode-review --attack`

**Produces:**
- List of assumptions made
- Risk if assumption is wrong
- Validation strategy

---

#### rcode-research-synthesizer
**Purpose:** Synthesize multiple research sources into actionable insights.

**Spawned by:** Chain pipelines after researcher outputs

**Output:** SYNTHESIS.md with:
- Key findings
- Confidence levels
- Actionable next steps

---

### Verification & Quality Agents

#### rcode-integration-checker
**Purpose:** Cross-phase E2E verification.

**Spawned by:** `/rcode-execute` (post-gate)

**Checks:**
- No phase breaks previous phases
- All inter-phase contracts maintained
- E2E flows work end-to-end
- Data contracts honored

---

#### rcode-nyquist-auditor
**Purpose:** Verify test coverage is adequate.

**Spawned by:** `/rcode-execute` (post-gate)

**Checks:**
- Coverage thresholds met
- Happy path + error path covered
- Edge cases have tests
- No obvious gaps

**Named after:** Nyquist sampling theorem (sample at 2x frequency to avoid aliasing — test at 2x typical edge frequency).

---

#### rcode-noor
**Purpose:** Write technical documentation.

**Spawned by:** `/rcode-docs-update`, `/rcode-document-project`

**Produces:**
- Architecture docs
- API documentation
- Deployment guides
- Troubleshooting guides

---

#### rcode-ux-designer
**Purpose:** Design interaction flows and UI specs.

**Spawned by:** `/rcode-ui-phase`, `/rcode-plan` (for UI-heavy phases)

**Output:** UI-SPEC.md (component list, design system usage, accessibility checklist) plus WIREFRAMES.md (per-role screen inventory with loading/empty/error states)

---

#### rcode-reviewer
**Purpose:** Review code for quality and style.

**Spawned by:** `/rcode-review`, `/rcode-audit-fix`

**Checks:**
- Code clarity
- Naming conventions
- Complexity
- Test coverage
- Performance

---

#### rcode-fixer
**Purpose:** Auto-fix code review issues.

**Spawned by:** `/rcode-review-fix`, `/rcode-audit-fix`

**Implements:**
- Style fixes
- Refactoring suggestions
- Test additions
- Documentation

---

#### rcode-edge-case-hunter
**Purpose:** Find error paths and boundary conditions.

**Spawned by:** `/rcode-review --edge-cases`, `/rcode-audit-fix`

**Finds:**
- Uncaught exceptions
- Boundary conditions
- Race conditions
- Input validation gaps

---

#### rcode-deviation-analyzer
**Purpose:** Detect when code deviates from plan.

**Spawned by:** `/rcode-execute` (verification step)

**Checks:**
- Implemented vs. planned scope match
- Naming matches plan
- No undocumented features

---

### More Specialized Agents

#### rcode-docs-auditor
**Purpose:** Audit documentation completeness and accuracy.

**Spawned by:** `/rcode-docs-update`, `/rcode-secure-phase`

---


#### rcode-security-auditor
**Purpose:** Security-focused code review.

**Spawned by:** `/rcode-secure-phase`, `/rcode-review --attack`

---

### Team Agents (added in v1.0)

#### rcode-layla 🎭
**Purpose:** UX Designer — interaction design, user flows, wireframes, accessibility audits, design systems.

**Spawned by:** `/rcode-council`, design-related discussions

---

#### rcode-nasser 👥
**Purpose:** Engineering Manager — 1:1s, hiring, onboarding, growth plans, performance, team health.

**Spawned by:** `/rcode-council`, people-ops questions

---

#### rcode-khalid 🚀
**Purpose:** DevOps & Infrastructure — CI/CD, containers, monitoring, deployment pipelines.

**Spawned by:** `/rcode-council`, infrastructure questions

---

#### rcode-zahra ✨
**Purpose:** Branding & Creative Director — typography, color systems, design tokens, brand consistency.

**Spawned by:** `/rcode-council`, brand-related discussions

---

#### rcode-noor 📝
**Purpose:** Technical Writer — docs, Mermaid diagrams, presentations, changelogs.

**Spawned by:** `/rcode-council`, `/rcode-docs-update`

---

#### rcode-ahmed 📋
**Purpose:** Technology & Development Director — delivery coordination, DORA metrics, engineering scorecards.

**Spawned by:** `/rcode-council`, delivery planning

---

#### rcode-hanzla ⚡
**Purpose:** Senior Full-Stack Engineer — story execution, code implementation, complex features.

**Spawned by:** `/rcode-execute`, `/rcode-dev-story`

---

#### rcode-omar 🔧
**Purpose:** Software Engineer — generalist implementation, bug fixes, testing.

**Spawned by:** `/rcode-execute`, `/rcode-dev-story`

---

#### rcode-haitham 💻
**Purpose:** Senior Frontend Engineer — React/Next.js, component design, RTL/Arabic layouts, frontend performance.

**Spawned by:** `/rcode-council`, `/rcode-ui-phase`, frontend implementation discussions

---

#### rcode-yousef ⚙️
**Purpose:** Senior Backend Engineer — API design, database queries, performance, queues, webhooks.

**Spawned by:** `/rcode-council`, backend implementation discussions

---

#### rcode-zayd 🧠
**Purpose:** Senior ML Engineer — LLM integration, RAG/retrieval, embeddings, prompt engineering, evals.

**Spawned by:** `/rcode-council`, AI/ML feature discussions

---

#### rcode-sprint-checker ✅
**Purpose:** Verify sprint plans will achieve the phase goal before execution.

**Spawned by:** `/rcode-plan` (post-planner, pre-execution)

**Checks:** Goal-backward analysis — does the plan actually deliver what the phase promises?

---

#### rcode-ui-auditor 🎨
**Purpose:** Retroactive visual audit of implemented frontend code across 6 quality pillars.

**Spawned by:** `/rcode-ui-review`

---

#### rcode-profiler 👤
**Purpose:** Analyze user behavior patterns, create personas, identify usage flows.

**Spawned by:** `/rcode-profile-user`

---

#### rcode-security-adversary 🔴
**Purpose:** Adversarial security review — think like an attacker, find exploitation paths.

**Spawned by:** `/rcode-review --attack`, `/rcode-secure-phase`

---

#### rcode-remediation-planner 🔧
**Purpose:** Plan remediation for issues and blockers — create action plans to recover from deviations.

**Spawned by:** `/rcode-correct-course`, post-execute failure workflows

---

## Global Agents (Custom)

You can define your own agents at:

```
~/.rcode/agents/rcode-<name>.md
```

They appear in every project without forking. Format:

```markdown
---
name: rcode-my-expert
alias: my-expert
role: Your custom role
model: claude-opus-4-20250514
---

(Agent persona and constraints)
```

**Trigger in commands:**
```
/rcode-discuss my-expert should we use this library?
/rcode-chain my-expert,sadiq,waleed your topic
```

---

## How to spawn agents

### Explicitly (by name)
```
/rcode-discuss waleed what's the best stack?
/rcode-chain researcher,planner,executor "your topic"
```

### Implicitly (by panel scorer)
```
/rcode-council should we build this?
```
Scorer picks 3-5 agents based on question keywords.

### Via specific commands
```
/rcode-plan build auth module
```
Spawns: planner → plan-checker (verification) → may spawn executor

```
/rcode-execute .planning/phases/01/PLAN.md
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
/rcode-council should we move to microservices? --explain
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

Read agent files in `.claude/agents/rcode-*.md` for full definitions.

---

## See also

- `README.md` — Agent overview
- `docs/three-modes.md` — Council vs. chain vs. discuss
- `docs/faq.md` — "How do I customize an agent?"
