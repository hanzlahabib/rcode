# Rihal Code

<div dir="rtl">طريقة رحال</div>

> **Install Rihal's brain into your project in one command.** Every Rihalian — engineer, PM, designer, CTO, QA — gets an AI assistant that already knows how Rihal builds: PR standards, commit conventions, architecture patterns, sprint cadence, the Rihal team's agent personas. No onboarding. No prompting. Works in Claude Code, Cursor, and any compatible AI IDE.

---

## Why this exists

Every Rihal project carries unwritten context — how we review PRs, what "done" means, how we sequence milestones, how PRDs travel from Product into Engineering. That context sits in people's heads, Slack, Notion, senior engineers' review comments. AI assistants pick it up never, because every new chat session starts knowing nothing about how Rihal works.

**Rihal Code fixes that.** One install, and the AI knows. Every session. Every repo. Every Rihalian.

See [`docs/what-is-rihal-code.md`](docs/what-is-rihal-code.md) for the full story, and [`docs/ROADMAP.md`](docs/ROADMAP.md) for where this is going (next: live MCP server in v3.0).

---

## 🚦 Start Here

Rihal Code packages a lot. To keep things approachable, everything is organized into **four tiers**:

| Tier | Who it's for | Start with |
|------|--------------|-----------|
| 🌱 **[Starter](docs/TIERS.md#-starter--the-golden-path)** | First-time Rihalian | 7 skills — the Golden Path |
| 🌿 **[Advanced](docs/TIERS.md#-advanced--real-sprint-team)** | Teams running sprints | PRD variants, architecture, UX, QA |
| 🌳 **[Ultra Advanced](docs/TIERS.md#-ultra-advanced--power-user-workflows)** | Power users | Multi-agent council, dashboard, clone-website |
| 📐 **[Standards](docs/STANDARDS.md)** | Contributors | Skill spec, commit rules, PR checklist |

**Brand new?** Do the [Golden Path](docs/TIERS.md#-starter--the-golden-path): scaffold → PRD → stories → sprint → dev → review → status. Seven skills, one project, end-to-end.

> **v2.0 — Rihal Brain.** v1 was a generic AI-engineering methodology. v2 keeps all of that and adds the Rihal context layer on top: standards, guides, and institutional knowledge pulled fresh from Rihal's own repos on install and on `/rihal:update`. See [`CHANGELOG.md`](CHANGELOG.md) and the [v2.0 milestone](https://github.com/hanzlahabib/rihal-code/milestone/4).

---

## What is this

Most AI tools give you one assistant pretending to be everything. **Rihal Code gives you Rihal's team — and Rihal's brain — inside every project.**

- **45 agents** with clear roles, cultural identity (Arabic names), and hard scope boundaries
- **99 slash commands** covering research, planning, execution, verification, and recovery
- **3 execution modes**: parallel debate (`/rihal:council`), sequential pipelines (`/rihal:chain`), and quick-sync (`/rihal:discuss`)
- **File-based state** in `.rihal/` that every workflow reads and updates
- **Intent guards** on every workflow — catch wrong commands early with copy-paste redirects
- **Karpathy-inspired coding guidelines** wired into every code-writing agent
- **Numeric ID system** (M1 milestones, NN phases, NN.M plans, NN.M.T tasks, with decimal insertion for urgent work)
- **Plan verification loop** that validates file/symbol references before execution
- **Post-execute gates** (integration-checker, nyquist-auditor) verify completeness
- **Global agents** at `~/.rihal/agents/` — customize without forking

It's not a chatbot. It's a methodology.

---

## Install — one command

In any project directory (existing codebase OR empty folder):

```bash
npx @hanzlaa/rcode install
```

[Live on npm](https://www.npmjs.com/package/@hanzlaa/rcode) as `@hanzlaa/rcode` · current version `v2.1.0`. See [`docs/install.md`](docs/install.md) for flavors (module subsets, IDE options, version pinning, yolo mode).

One unified installer. Pure file shipping, no runtime dependencies. Installs into:

- `.rihal/` — config, workflows, references, bin (Rihal infrastructure)
- `.claude/agents/` — 45 first-class subagents
- `.claude/commands/rihal/` — 99 slash commands
- `.claude/skills/` — 57 phrase-activated skills (scaffold-project, create-prd, prfaq, retrospective, etc.)
- `rihal/brain/` — Rihal standards pulled from upstream (PR / commit / architecture docs)
- `.planning/` — where your artifacts land (council sessions, plans, chains, summaries)

Restart Claude Code (or your IDE), type `/`, and every `rihal:*` command appears.

Update anytime with `npx @hanzlaa/rcode update` (or `/rihal:update` inside a Claude session).

### Then begin the rihla

```
/rihal:init
```

Detects your project state (fresh / existing-with-no-rihal / returning), asks a few configuration questions, and routes you to the right first action.

### Install a specific module

```bash
npx @hanzlaa/rcode install --module core         # council + quick-sync only
npx @hanzlaa/rcode install --module execution --force
npx @hanzlaa/rcode install --module discovery --force
```

### Multi-IDE support

```bash
npx @hanzlaa/rcode install --ide claude    # default
npx @hanzlaa/rcode install --ide cursor
npx @hanzlaa/rcode install --ide gemini
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

## Filesystem layout

**System-owned directories (do not edit):**

```
.rihal/                        — Rihal infrastructure + state
  config.yaml                  — preferences (model, language, mode, branching)
  state.json                   — project phases, decisions, sessions, workstreams
  RIHLA.md                      — project journey baseline
  HANDOFF.json                  — pause-work context for resuming
  bin/
    rihal-tools.cjs            — CLI helper (state read/write, panel scoring, etc.)
    lib/council-panel.cjs      — deterministic panel scorer
  workflows/                   — 69 slash command workflows
  references/                  — shared contracts (council-protocol, gates, karpathy-guidelines, etc.)
  agents-rules/                — lazy-loaded agent rule files (planner, executor, debugger)
```

**Your artifacts (created automatically):**

```
.planning/                     — your work outputs
  phases/01-name/PLAN.md       — plans organized by phase number (01, 02, 02.1, etc.)
  council-sessions/            — debate artifacts
  chains/                       — pipeline outputs (RESEARCH.md → SCOPE.md → PLAN.md)
  notes/                        — quick notes from /rihal:note
  HANDOFF.json                  — pause-work checkpoint
  .continue-here.md            — human-readable handoff summary
```

---

## The team

**5 council agents** with cultural identity, each with hard scope boundaries and response-style contracts:

| Agent | Role | Spawns for |
|-------|------|-----------|
| 🧭 **Sadiq (صادق)** | Director of Strategy | Priorities, kill criteria, market timing, "should we build this" |
| 🏗️ **Waleed (وليد)** | CTO | Architecture, stack, feasibility, security, scale, tech debt |
| 🛡️ **Fatima (فاطمة)** | QA Lead | Test strategy, release readiness, regression risk, coverage |
| 📣 **Mariam (مريم)** | Marketing & Growth | Market research, GTM, positioning, GCC/MENA markets |
| 📋 **Hussain-PM (حسين)** | Product Manager | Scope, roadmap, features, user stories, PRDs, sprint planning |

**30+ specialist agents** for execution, discovery, and verification:

- **Execution**: rihal-executor, rihal-planner, rihal-verifier, rihal-plan-checker, rihal-debugger
- **Discovery**: rihal-codebase-mapper, rihal-project-researcher, rihal-roadmapper, rihal-phase-researcher, rihal-advisor-researcher, rihal-assumptions-analyzer, rihal-research-synthesizer
- **Verification**: rihal-integration-checker, rihal-nyquist-auditor
- **Quality**: rihal-tech-writer, rihal-ux-designer, rihal-architect, rihal-code-reviewer, rihal-code-fixer, rihal-edge-case-hunter, rihal-deviation-analyzer
- **And more**: rihal-docs-auditor, rihal-doc-verifier, rihal-doc-writer, rihal-repo-metrics, rihal-security-auditor, etc.

**Customize globally:** Define reusable agents in `~/.rihal/agents/rihal-<name>.md`. They appear in every project alongside project-local agents, without forking the repo.

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

### PRFAQ — validate before you build

Amazon's "Working Backwards" method: write the finished-product press release *before* writing a line of code. If you can't write a compelling press release, the product isn't ready. `/rihal:prfaq` runs a 5-stage coaching gauntlet — Ignition → Press Release → Customer FAQ → Internal FAQ → Verdict — and outputs a battle-hardened concept document plus a PRD distillate ready for `/rihal:create-prd`.

**When to use it:** Any time a PM or engineer wants to validate whether an idea is worth building before committing sprint capacity. The skill challenges vague thinking, enforces customer-first framing, and gives a build/refine/kill verdict.

```
/rihal:prfaq                                         → interactive gauntlet
/rihal:prfaq --headless --customer "..." --problem "..." --solution "..."   → autonomous first draft
```

### Karpathy coding guidelines

4 behavioral principles from [Andrej Karpathy's observations on LLM coding pitfalls](https://github.com/forrestchang/andrej-karpathy-skills), wired into every code-writing agent as hard constraints:

1. **Think before coding** — surface assumptions, don't hide confusion
2. **Simplicity first** — minimum code, no speculative abstractions
3. **Surgical changes** — touch only what's needed, match existing style
4. **Goal-driven execution** — define verifiable success criteria

`/rihal:karpathy-audit` runs these 4 principles as a post-hoc audit against any diff or phase. Use it after implementation to catch bloated, over-engineered, or scope-creeping changes before they land in a PR.

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

## What's new in v2-prototype

Recent additions in this session:

- **69 slash commands** across 3 modes and 3 modules (up from 64)
- **Numeric ID system** — milestones (M1, M2), phases (01, 02, 02.1), plans (01.01, 02.03), tasks (01.01.01) with decimal insertion for urgent inserts
- **Intent guards** (`Step 0.5`) — every workflow detects mismatched intent and redirects instead of failing
- **Plan-checker loop** — `/rihal:plan` now verifies file existence and symbol definitions; loops back to planner on validation failure
- **Post-execute gates** — `/rihal:execute` runs integration-checker (E2E) and nyquist-auditor (coverage) as hard gates
- **Multilingual classifier** — Roman Urdu, Arabic, English with cultural signal routing (Mariam leads GCC/MENA)
- **Karpathy guidelines enforcement** — 4 coding principles baked into every code-writing agent
- **Global agents** — customize agents in `~/.rihal/agents/` without forking the repo
- **Multi-IDE installer** — support for Claude Code, Cursor, Gemini CLI
- **Hooks system** — opt-in pre-edit, pre-workflow, post-commit enforcement
- **Session pause/resume** — `/rihal:pause-work` + `/rihal:resume-work` with HANDOFF.json
- **Workspace isolation** — `/rihal:new-workspace` for parallel tracks
- **Decimal phase insertion** — `/rihal:insert-phase` for urgent mid-cycle work

---

## Full command surface (99 commands)

### Router + lifecycle
`init` · `do` · `help` · `status` · `stats` · `health` · `forensics` · `update`

### Discovery + research
`new-project` · `map-codebase` · `scan` · `explore` · `document-project` · `analyze-dependencies` · `discuss-phase-power`

### Discovery + validation
`prfaq` · `brainstorm` · `market-research` · `domain-research` · `technical-research` · `product-brief`

### Planning
`plan` · `chain` · `create-epics-and-stories` · `create-story` · `dev-story` · `sprint-planning`

### Execution
`execute` · `quick` · `autonomous` · `audit-fix` · `undo` · `check-implementation-readiness`

### Observability + review
`code-review` · `code-review-fix` · `review-adversarial` · `review-edge-case-hunter` · `karpathy-audit` · `checkpoint-preview` · `secure-phase` · `show` · `why` · `rerun` · `diff`

### Recovery + correction
`pause-work` · `resume-work` · `correct-course` · `next` · `config`

### Multi-agent modes
`council` · `chain` · `discuss`

### Configuration + setup
`settings` · `install` · `enable-hooks` · `profile-user`

### Lifecycle + phases
`insert-phase` · `new-milestone` · `audit-milestone` · `complete-milestone` · `milestone-summary` · `new-workspace` · `list-workspaces` · `remove-workspace` · `workstream`

### Docs + notes + reporting
`docs-update` · `note` · `report` · `session-report` · `add-todo` · `import` · `inbox`

### UI design
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

Full install = all 3 modules = 201 files.

---

## Testing

```bash
node --test test/*.cjs test/lib/*.cjs
```

95 tests across 10 test files (8 compliance + 87 unit) verify:
- Every command has a matching workflow file
- Every agent has valid frontmatter + constraints
- Module manifests match installed files
- rihal-tools.cjs help matches implemented subcommands
- Panel scorer routes correctly across 10+ question types
- Classifier handles Roman Urdu + Arabic + edge cases

---

## Why "Rihal"

رحّال (Rihāl) is Arabic for "traveler" — someone who journeys between places carrying knowledge. [Rihal](https://rihal.om) is also one of Oman's fastest-growing tech companies. The agent names are Arabic placeholders — swap them for your team in `rihal/team.yaml`.

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
