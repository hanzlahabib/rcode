# Rihal Code

<div dir="rtl">طريقة رحال</div>

> **An AI engineering methodology — 22 agents, 64 slash commands, 3 execution modes, file-based state. Install in one command into any Claude Code, Cursor, or Antigravity project.**

---

## What is this

Most AI tools give you one assistant pretending to be everything. **Rihal Code gives you a real team.**

- **22 agents** with clear roles, cultural identity (Arabic names), and hard scope boundaries
- **64 slash commands** covering research, planning, execution, verification, and recovery
- **3 execution modes**: parallel debate (`/rihal:council`), sequential pipelines (`/rihal:chain`), and quick-sync (`/rihal:discuss`)
- **File-based state** in `.rihal/` that every workflow reads
- **Intent guards** on every workflow — catch wrong commands early with copy-paste redirects
- **Karpathy-inspired coding guidelines** wired into every code-writing agent

It's not a chatbot. It's a methodology.

---

## Install — one command

In any project directory:

```bash
git clone --branch v2-prototype --depth 1 https://github.com/hanzlahabib/rihal-code.git /tmp/rihal-src && \
node /tmp/rihal-src/cli/install-v2.js . --yes --user "$(whoami)" --project "$(basename $(pwd))"
```

That's it. No npm dependency. No global install. Pure file shipping:

- `.rihal/` — config, workflows, references, bin, state.json (178 files total)
- `.claude/agents/` — 22 first-class subagents
- `.claude/commands/rihal/` — 64 slash commands
- `.planning/` — where your artifacts land (council sessions, plans, chains, summaries)

Restart Claude Code (or your IDE), type `/`, and every `rihal:*` command appears.

### Install a specific module

```bash
# Council agents + quick-sync only (lightweight)
node /tmp/rihal-src/cli/install-v2.js . --yes --module core

# Add planning + execution
node /tmp/rihal-src/cli/install-v2.js . --yes --module execution --force

# Add research + codebase discovery
node /tmp/rihal-src/cli/install-v2.js . --yes --module discovery --force
```

### Multi-IDE support

```bash
node /tmp/rihal-src/cli/install-v2.js . --ide claude    # default
node /tmp/rihal-src/cli/install-v2.js . --ide cursor
node /tmp/rihal-src/cli/install-v2.js . --ide gemini
```

---

## 90-second tour

```
/rihal:do                                    → interactive router
/rihal:council should I rewrite auth?        → 5 agents debate in parallel, 2 rounds
/rihal:discuss waleed what stack for saas?   → single expert, fast
/rihal:chain research-plan dubai affiliate   → Mariam → Hussain-PM → Planner pipeline
/rihal:plan --research build a rental app    → researcher grounds, plan-checker verifies
/rihal:execute .planning/plans/01/PLAN.md    → atomic commits + post-gates
/rihal:status                                → phases, decisions, blockers, sessions
/rihal:karpathy-audit HEAD~5..HEAD           → audit changes vs 4 coding principles
```

---

## The team

5 council agents with cultural identity, each with hard scope boundaries and response-style contracts:

| Agent | Role | Spawns for |
|-------|------|-----------|
| 🧭 **Sadiq (صادق)** | Director of Strategy | Priorities, kill criteria, market timing, "should we build this" |
| 🏗️ **Waleed (وليد)** | CTO | Architecture, stack, feasibility, security, scale, tech debt |
| 🛡️ **Fatima (فاطمة)** | QA Lead | Test strategy, release readiness, regression risk, coverage |
| 📣 **Mariam (مريم)** | Marketing & Growth | Market research, GTM, positioning, GCC/MENA markets |
| 📋 **Hussain-PM (حسين)** | Product Manager | Scope, roadmap, features, user stories, PRDs, sprint planning |

Plus **17 specialist agents** for execution and discovery: rihal-executor, rihal-planner, rihal-verifier, rihal-plan-checker, rihal-debugger, rihal-codebase-mapper, rihal-project-researcher, rihal-roadmapper, rihal-phase-researcher, rihal-advisor-researcher, rihal-assumptions-analyzer, rihal-research-synthesizer, rihal-integration-checker, rihal-nyquist-auditor, rihal-tech-writer, rihal-ux-designer, rihal-architect.

---

## Three modes, three mental models

### 🏛️ `/rihal:council` — Parallel debate

3-5 agents answer simultaneously in Round 1, then Round 2 lets each agent challenge the others' Round 1 responses. Result: one session artifact with all voices + orchestrator note flagging the sharpest disagreement.

**Best for:** strategic decisions where you want disagreement, not consensus.

```
/rihal:council should we migrate from monolith to microservices?
```

### 🔗 `/rihal:chain` — Sequential pipeline

Each agent runs after the previous one finishes, reading that agent's artifact as input. Result: a typed artifact per stage (RESEARCH.md → SCOPE.md → PLAN.md) in `.planning/chains/`.

**Best for:** when you know roughly what you want and each specialist needs to do their part in order.

```
/rihal:chain research-plan dubai affiliate site for mobile accessories
/rihal:chain feasibility migrate postgres to neon serverless
/rihal:chain gtm-to-build saas bookkeeping in oman
```

Presets: `research-plan` · `feasibility` · `gtm-to-build` · `full-discovery`. Or custom: `/rihal:chain mariam,waleed,fatima "your topic"`.

### 💬 `/rihal:discuss` — Single agent, quick-sync

One agent, one round, conversational tone, no mandatory artifact. Feels like texting one colleague.

```
/rihal:discuss waleed can we use postgres jsonb for this?
/rihal:discuss fatima is this release ready?
/rihal:discuss what's the kill criterion for this project?
```

If no agent named, the panel scorer picks the top match.

---

## What makes Rihal different

### Intent guards catch wrong commands

Run the wrong command and you get a single-line copy-paste redirect — not a useless output.

```
/rihal:plan should we use postgres or mongo?
⚠ That's a decision question, not a planning input.
Copy-paste this to ask the council instead:
/rihal:council should we use postgres or mongo?
```

Every workflow has a Step 0.5 intent detector.

### Multilingual — Roman Urdu + Arabic + English

The classifier recognizes `dubai`, `affiliate`, `bnanai`, `karobar`, `site banana`, `دبئی`, `مارکیٹ`, `کاروبار` and many more. Mariam leads for GCC/MENA market questions.

```
/rihal:council yar affiliate site bnanai hai dubai ma for quick bucks
→ panel: [mariam, hussain-pm, sadiq]
```

### Karpathy coding guidelines

4 behavioral principles from [Andrej Karpathy's observations on LLM coding pitfalls](https://github.com/forrestchang/andrej-karpathy-skills), wired into every code-writing agent as hard constraints:

1. **Think before coding** — surface assumptions, don't hide confusion
2. **Simplicity first** — minimum code, no speculative abstractions
3. **Surgical changes** — touch only what's needed, match existing style
4. **Goal-driven execution** — define verifiable success criteria

Audit recent changes:

```
/rihal:karpathy-audit HEAD~5..HEAD
/rihal:karpathy-audit 03 --files=src/auth/
```

### Plan verification + post-execute gates

`/rihal:plan` runs `rihal-plan-checker` after the planner writes PLAN.md. On failure, loops back to planner with feedback (max 2 retries).

`/rihal:execute` runs `rihal-integration-checker` (cross-phase E2E) and `rihal-nyquist-auditor` (test coverage) after completion. Both append to SUMMARY.md.

### Model profiles

```bash
/rihal:settings       # interactive config
```

- **quality** — opus/sonnet-4.6 for reasoning agents
- **balanced** — sonnet-4.6 across the board (default)
- **budget** — haiku-4.5 everywhere
- **inherit** — use parent session's model

### Session handoff

```
/rihal:pause-work    → writes .rihal/HANDOFF.json + .continue-here.md
/rihal:resume-work   → reads HANDOFF, surfaces blocking constraints
```

---

## Full command surface (64 commands)

### Router + lifecycle
`do` · `help` · `status` · `stats` · `health` · `forensics` · `update`

### Discovery
`new-project` · `map-codebase` · `scan` · `explore` · `generate-project-context` · `document-project`

### Planning
`plan` · `chain` · `prfaq` · `create-epics-and-stories` · `create-story` · `dev-story` · `sprint-planning`

### Execution
`execute` · `quick` · `autonomous` · `audit-fix` · `undo` · `check-implementation-readiness`

### Review
`code-review` · `code-review-fix` · `review-adversarial` · `review-edge-case-hunter` · `karpathy-audit` · `secure-phase`

### Recovery
`pause-work` · `resume-work` · `correct-course` · `next`

### Multi-agent
`council` · `chain` · `discuss` · `brainstorm`

### Configuration
`settings` · `install` · `enable-hooks` · `profile-user`

### Lifecycle management
`insert-phase` · `new-milestone` · `audit-milestone` · `complete-milestone` · `milestone-summary` · `new-workspace` · `list-workspaces` · `remove-workspace` · `workstream`

### Docs + notes
`docs-update` · `note` · `report` · `session-report` · `add-todo` · `import` · `inbox`

### UI-specific
`ui-phase` · `ui-review`

---

## Configuration

`.rihal/config.yaml` — edit directly or run `/rihal:settings`:

```yaml
user_name: "Hanzla"
project_name: "your-project"
communication_language: "English"   # or Urdu, Arabic, etc.
mode: "guided"                       # or yolo
model_profile: "balanced"            # quality | balanced | budget | inherit
workflow:
  research_by_default: false
  plan_checker: true
  post_execute_gates: true
  ui_safety_gate: true
git:
  branching_strategy: "none"         # none | feature-branch | worktree-isolation
```

---

## State tracking

`.rihal/state.json` tracks everything:

- `current_phase`, `current_plan`
- `phases[]`, `executions[]`, `decisions[]`, `blockers[]`
- `council_sessions[]`, `chains[]`
- `workstreams[]`, `active_workstream`, `last_session`

View formatted:
```bash
node .rihal/bin/rihal-tools.cjs state read
# or
/rihal:status
```

---

## Hooks (opt-in)

```bash
/rihal:enable-hooks
```

Installs 3 opt-in hooks into `.claude/settings.json`:
1. **pre-edit** — enforces read-before-edit
2. **pre-workflow** — soft intent warnings on mismatched commands
3. **post-commit** — validates commit format, blocks AI attribution

---

## Modules

| Module | Contents |
|--------|----------|
| **core** | 5 council agents, `/rihal:council`, `/rihal:discuss`, `/rihal:status`, `/rihal:do`, `/rihal:help`, state management |
| **execution** | Executor, planner, verifier + checker agents, `/rihal:execute`, `/rihal:plan`, `/rihal:quick`, `/rihal:debug`, `/rihal:audit-fix`, `/rihal:undo` |
| **discovery** | Codebase-mapper, project-researcher, roadmapper, `/rihal:new-project`, `/rihal:map-codebase`, `/rihal:scan`, `/rihal:explore`, `/rihal:code-review`, `/rihal:docs-update` |

Full install = all 3 modules = 178 files.

---

## Testing

```bash
node --test test/
```

29 compliance tests verify:
- Every command has a matching workflow file
- Every agent has valid frontmatter + constraints
- Module manifests match installed files
- rihal-tools.cjs help matches implemented subcommands
- Panel scorer routes correctly across 10+ question types
- Classifier handles Roman Urdu + Arabic + edge cases

---

## Why "Rihal"

رحّال (Rihāl) is Arabic for "traveler" — someone who journeys between places carrying knowledge. [Rihal](https://rihal.om) is also one of Oman's fastest-growing tech companies. The agent names are Arabic placeholders — swap them for your team in `rihal/v2/team.yaml`.

---

## Credits

- Karpathy coding guidelines adapted from [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) (MIT)
- File-shipping installer pattern inspired by the broader agent-skill ecosystem

---

## License

MIT

---

## Roadmap

See [GitHub Issues](https://github.com/hanzlahabib/rihal-code/issues) for tracked work. Current branch: `v2-prototype` — under active development. Main branch will track stable releases.

**This branch is pre-release.** For production, wait for `v0.2.0` on main.
