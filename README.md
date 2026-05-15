# Rihal Code (rcode)

<div dir="rtl">طريقة رحال</div>

> **The AI team that never forgets.** Persistent memory, 45 specialist agents, 95 commands — install once, and your AI IDE gets a project brain that survives every session reset.

```bash
npx @hanzlaa/rcode install    # one command, zero dependencies
```

[![npm version](https://img.shields.io/npm/v/@hanzlaa/rcode)](https://www.npmjs.com/package/@hanzlaa/rcode)
[![downloads](https://img.shields.io/npm/dw/@hanzlaa/rcode)](https://www.npmjs.com/package/@hanzlaa/rcode)

---

## See it work

The full loop in three commands — `/rihal-council` → `/rihal-plan` → `/rihal-execute`:

![Rihal Code demo](docs/assets/hero-demo.gif)

The Diwan dashboard renders project state, decisions, and the Memory Bank in one view:

![Diwan dashboard](docs/assets/diwan-dashboard.png)

---

## Why this exists

Every project carries unwritten context — how the team reviews PRs, what "done" means, how milestones sequence. That context sits in people's heads, Slack, and senior engineers' review comments. AI assistants pick it up never, because every new chat session starts knowing nothing about how this project actually works.

You'll feel rcode pay off if you've lived any of these:

- **AI agents lose context mid-project.** Three sessions in, the assistant has forgotten the architectural decision you made on day one.
- **Onboarding a teammate** means a 30-minute archaeology dig through Slack, Notion, and review comments.
- **Late client requirements** keep shifting the goal posts, with no record of what was decided when.
- **MVPs that work but can't be revamped** without rewriting from scratch — the original context is lost.

rcode fixes that with a checked-in **Memory Bank** (`.rihal/memory/`), distinctive engineering personas, and a phased workflow that survives session resets. One install, and the AI knows. Every session. Every repo. Every contributor.

It's not a chatbot. It's a methodology.

---

## Quickstart

### Install — one command

In any project directory (existing codebase OR empty folder):

```bash
npx @hanzlaa/rcode install
```

[Live on npm](https://www.npmjs.com/package/@hanzlaa/rcode) as `@hanzlaa/rcode`. Pure file shipping, no runtime dependencies. Installs into:

- `.rihal/` — config, workflows, references, bin (Rihal infrastructure)
- `.claude/agents/` — 45 first-class subagents
- `.claude/commands/rihal/` — 95 slash commands
- `.claude/skills/` — 105 phrase-activated skills
- `rihal/brain/` — Rihal standards pulled from upstream
- `.planning/` — where your artifacts land

Restart Claude Code (or your IDE), type `/`, and every `rihal-*` command appears. Update anytime with `npx @hanzlaa/rcode update`.

> **Want `rcode` on your PATH?** For the `rcode` CLI command (e.g. `rcode version`, `rcode update`), install globally once:
> ```bash
> npm install -g @hanzlaa/rcode
> ```

See [`docs/install.md`](docs/install.md) for flavors (module subsets, IDE options, version pinning, yolo mode).

### Then begin the rihla

```
/rihal-init
```

Detects your project state (fresh / existing-with-no-rihal / returning), asks a few configuration questions, and routes you to the right first action.

### The full loop

```
/rihal-council should I rewrite auth?        → 5 agents debate in parallel, 2 rounds
/rihal-plan --research build a rental app    → researcher grounds, plan-checker verifies
/rihal-execute .planning/plans/01/PLAN.md    → atomic commits + post-gates
/rihal-status                                → phases, decisions, blockers, sessions
```

**Brand new?** Do the [Golden Path](docs/TIERS.md#-starter--the-golden-path): scaffold → PRD → stories → sprint → dev → review → status. Seven skills, one project, end-to-end.

---

## What makes Rihal different

Most AI tools give you one assistant pretending to be everything. **Rihal Code gives you Rihal's team — and Rihal's brain — inside every project.**

### Persistent project memory

A checked-in **Memory Bank** at `.rihal/memory/` — visible in the Diwan dashboard, with lossless distillates for fast LLM hydration. A typical session loads ~5K tokens of Memory Bank and is fully oriented to the project's history, decisions, and known issues. See [`MEMORY_BANK.md`](MEMORY_BANK.md) for the spec.

### Intent guards catch wrong commands

Run the wrong command and you get a single-line copy-paste redirect — not a useless output.

```
/rihal-plan should we use postgres or mongo?
⚠ That's a decision question, not a planning input.
/rihal-council should we use postgres or mongo?
```

Every workflow has a Step 0.5 intent detector.

### Markdown-first agent design

Most agent frameworks wrap their logic in Python classes, JSON schemas, and orchestration layers. rcode doesn't. Every agent is a markdown file — the model follows structured prose, no wrapper needed.

The design rule: **markdown owns the logic, scripts own the boundaries.** Heavy playbook content lives in `rihal/references/` and gets `@-include`d at spawn time, so agent files stay thin (≤100 lines) without losing context.

### Three execution modes

- **`/rihal-council`** — parallel debate: 3-5 agents answer simultaneously, then challenge each other in Round 2. For strategic decisions where you want disagreement, not consensus.
- **`/rihal-chain`** — sequential pipeline: each agent reads the previous one's artifact (RESEARCH.md → SCOPE.md → PLAN.md).
- **`/rihal-discuss`** — single agent, quick-sync: one expert, conversational, no mandatory artifact.

### Karpathy coding guidelines

4 behavioral principles from [Andrej Karpathy's observations on LLM coding pitfalls](https://github.com/forrestchang/andrej-karpathy-skills), wired into every code-writing agent as hard constraints: think before coding, simplicity first, surgical changes, goal-driven execution. `/rihal-code-review --karpathy` runs them as a post-hoc audit against any diff.

### Verification built in

`/rihal-plan` runs `rihal-plan-checker` to validate file/symbol references before execution. `/rihal-execute` runs `rihal-integration-checker` (cross-phase E2E) and `rihal-nyquist-auditor` (test coverage) after completion.

---

## Learn more

| Document | What's in it |
|----------|--------------|
| [`DOCS.md`](DOCS.md) | Complete documentation — install, concepts, all commands, Memory Bank, dashboard, testing & CI, architecture |
| [`docs/getting-started.md`](docs/getting-started.md) | Step-by-step first project |
| [`docs/TIERS.md`](docs/TIERS.md) | Starter / Advanced / Power-user paths |
| [`MEMORY_BANK.md`](MEMORY_BANK.md) | Memory Bank specification |
| [`BRAND.md`](BRAND.md) | Naming, voice, and persona glossary |
| [`MIGRATIONS.md`](MIGRATIONS.md) | Upgrade path from a pre-Memory-Bank install |
| [`CHANGELOG.md`](CHANGELOG.md) | Release history |

---

## Why "Rihal"

رحّال (Rihāl) is Arabic for "traveler" — someone who journeys between places carrying knowledge. [Rihal](https://rihal.om) is also one of Oman's fastest-growing tech companies. The agent names are Arabic placeholders — swap them for your team in `rihal/team.yaml`.

---

## Credits

- Karpathy coding guidelines adapted from [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) (MIT)
- File-shipping installer pattern inspired by the broader agent-skill ecosystem

---

## License

Released under the [MIT License](LICENSE).
