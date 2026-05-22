# rcode

<div dir="rtl">طريقة رحال</div>

> **A methodology for building software with AI — shipped as files.** Folders, markdown, slash commands. No multi-agent harness. No vector DB. Your IDE keeps the methodology; the project keeps the memory.

```bash
pnpm dlx @hanzlaa/rcode install
```

[![npm version](https://img.shields.io/npm/v/@hanzlaa/rcode)](https://www.npmjs.com/package/@hanzlaa/rcode)
[![downloads](https://img.shields.io/npm/dw/@hanzlaa/rcode)](https://www.npmjs.com/package/@hanzlaa/rcode)

Status: `@hanzlaa/rcode` v4.0.0 on npm. 30 automated tests, 45 agents, 116 commands, 85 skills. Actively dogfooded on real projects every week.

---

## Who builds this

One developer ([Hanzla Habib](https://github.com/hanzlahabib)) — building rcode **with** Claude, not just for it. Every workflow, agent, and skill in this repo was designed in dialogue with the same LLM you'll be running. The methodology shipped here is the one I use to build rcode itself.

That means two things:
- **The dogfood loop is the test suite.** Every release is run against fresh projects (calories-counter RN, reelspeed services) before publish. Bugs surface as GitHub issues, get fixed, ship.
- **The tool grows from real friction, not theory.** Half the v3.6.20 fixes came from a single dogfeed session where 3 parallel agents found 50+ real bugs in 4 hours.

If you're a solo dev or small team using Claude Code (or Cursor, Gemini, VS Code), rcode gives you the **scaffolding a 10-person engineering org would have**: code review standards, sprint cadence, decision archives, onboarding context — without hiring the org.

---

## What it actually is

Three layers, specialised for software delivery:

| Layer | What lives here | Example |
|-------|-----------------|---------|
| **Memory** | `.rcode/memory/` — git-tracked markdown, lossless distillates | "We chose Postgres over Mongo because of JSON-B + RLS — see ADR-007" |
| **Skills** | `rcode/skills/` — 85 phrase-activated playbooks | `rcode-sprint-checker` validates file/symbol refs before execute |
| **Workflows** | `rcode/workflows/` — orchestrated multi-step paths | `/rcode-plan` runs research → planner → checker → confirm |

Single agent navigates the structure. No LangChain, no AutoGen, no orchestrator process. Just folders the model can read.

---

## Why I built it

I've shipped products solo for years and watched the same failure repeat in every project:

- **Session 1:** Productive — agent helps me design auth, picks Postgres, plans the schema.
- **Session 5:** Agent has no idea I picked Postgres. Suggests Mongo. We argue. I copy-paste the decision back in.
- **Session 20:** I'm pasting in 4K tokens of "here's what we decided" every session. The agent never learns. The project file structure isn't enough — decisions live in chat.

rcode is the answer I built for myself. **The decision lives in `.rcode/memory/decisions.md`. The agent reads it. Done.**

Same problem at team scale: onboarding takes 30 minutes of archaeology. Late requirements shift goalposts with no audit trail. MVPs work but can't be revamped because the original "why" is gone. rcode checks the context in, so the next person (or session) starts oriented.

---

## Concrete benefits

What you'll feel in week one:

- **No more re-explaining.** Decisions, blockers, conventions live in `.rcode/memory/` — agent reads them at session start automatically (~5K tokens, fully oriented).
- **Phased delivery without ceremony.** `/rcode-new-project` produces a roadmap with phases → sprints → tasks. `/rcode-plan` produces SPRINT.md files. `/rcode-execute` runs them with atomic commits. No Jira required.
- **Specialist review on tap.** Want a Karpathy-style review of your last commit? `/rcode-review --karpathy`. Want a council debate on a decision? `/rcode-council should I rewrite auth?` — 5 agents answer in parallel, round 2 they challenge each other.
- **Intent guards.** Run the wrong command and get a one-line redirect, not a useless output.
- **Health check.** `rcode-tools health` returns JSON — milestone health, state snapshot, project status. Wire it into your dashboard.
- **Drift detection.** SEO-style drift baselines for any URL the project ships. Catches when somebody silently breaks your `<title>` or schema markup.

What you won't get:
- Magic. The agent still needs precise prompts; rcode just removes the boilerplate context-loading from each one.
- A productivity multiplier on a 200-line side project. You'll feel it on real work — multi-week, multi-contributor, multi-decision.

---

## What it isn't (anti-hype)

I dogfood this hard, so the honest version:

- **Not a chatbot wrapper.** Zero opinions about which LLM. Works with Claude Code, Cursor, Gemini, VS Code, Antigravity, Windsurf. Bring your own keys.
- **Not a multi-agent framework.** No agent-to-agent message bus. One agent reads markdown structure and navigates it.
- **Not a no-code tool.** You will read markdown files. You will write commit messages. You will type slash commands.
- **Not finished.** v3.6 is solid for solo and small-team work. Open issues are tracked at the [issues page](https://github.com/hanzlahabib/rihal-code/issues) — most P1 bugs get fixed within 48 hours of a dogfeed run.
- **Not replacing senior engineers.** It gives you their scaffolding (review standards, sprint hygiene, decision archives). You still need judgment for the hard calls.

---

## How it stacks up

| | Cursor / Windsurf | CrewAI / AutoGen | LangChain / LlamaIndex | **rcode** |
|---|---|---|---|---|
| **Per-project memory** | Per-user, not git-tracked | Vector DB | Vector DB + chunking | Git-tracked markdown |
| **Specialist agents** | 1 generalist | Define in Python | Define in Python | 45 shipped |
| **Install** | IDE extension | `pip install` + config | `pip install` + code | `pnpm dlx` — one command |
| **Infrastructure** | Cloud API | Python server | Vector store + indexer | Zero — pure files |
| **IDE lock-in** | Cursor only | Framework-specific | Framework-specific | Claude / Cursor / Gemini / VS Code / Antigravity / Windsurf |
| **Auditability** | Chat scrollback | Tracing dashboard | Tracing dashboard | `git log` |

The point isn't "I beat LangChain." The point is **you don't need LangChain for software delivery**. You need a methodology that survives session resets, and a methodology lives in files.

---

## Quickstart

```bash
# 1. Install into any project (existing codebase or empty folder)
pnpm dlx @hanzlaa/rcode install

# 2. Restart Claude Code, then:
/rcode-init
```

`/rcode-init` detects your project state (fresh / existing / returning) and routes to the right first action. For a greenfield project it auto-routes to `/rcode-new-project`.

### The full loop

```
/rcode-council should I rewrite auth?        → 5 agents debate, 2 rounds
/rcode-plan --research build a rental app    → researcher grounds, sprint-checker verifies
/rcode-execute .planning/plans/01/PLAN.md    → atomic commits + post-gates
/rcode-status                                → phases, decisions, blockers, sessions
```

Full install flavors and IDE options: [`docs/install.md`](docs/install.md). Step-by-step first project: [`docs/getting-started.md`](docs/getting-started.md).

---

## What's next (roadmap)

The directions I'm building toward — open to PRs on any of these:

**Near-term (next 2 releases):**
- **Dialogue → pillars extractor.** Run a discussion, get back reusable voice/constraint/methodology MDs. `/rcode-discuss-phase` already captures decisions; this would distill *style* and *constraints* too.
- **User-level pillars** (`~/.rcode/pillars/`) for cross-project reuse — your voice, your review style, your testing standards live once, used everywhere.
- **Token telemetry.** Real per-response cost tracking via Claude Code's Stop hook (issue #745).
- **Slim agent split.** 6 agents currently exceed the 100-line lean target — splitting into role-focused variants.

**Mid-term:**
- **Cloud sync for Memory Bank** (opt-in) — so distributed teams share `.rcode/memory/` without merge conflicts.
- **Voice-controlled sessions** — drive rcode in a live meeting via voice; trigger workflows by keyword in conversation.
- **Multi-language docs** — Arabic-first, English mirrored. Currently the methodology is English-only with Arabic naming.

**Long-term direction:**
The bet: **methodology as a product**. Skills, workflows, and agents become a portable "engineering org in a folder" that travels with you across projects, IDEs, and LLM vendors. The methodology outlives any specific model.

The non-goal: building yet another agent framework. There are enough. rcode stays files.

---

## Honest state of things

- **v3.6.20** shipped 2026-05-22 with 50+ bug fixes from a full 3-project dogfeed run.
- **Open issues**: ~50 — half are feature requests, the rest are backlog bugs ranked by severity.
- **Test suite**: 30 tests, 100% pass on every release. Coverage is structural (compliance + artifact schema + workflow behavioral), not line-coverage.
- **Real users**: I run it on 4 projects daily. A handful of others run it on theirs. If you find a bug, file it — most P1s ship within 48 hours.
- **Funding**: none. This is solo work. If your company wants commercial support, [email me](mailto:hanzla.dev@gmail.com).

---

## Why "rcode"

رحّال (Rihāl) means "traveler" in Arabic — someone who carries knowledge between places. The persona names (Sadiq, Waleed, Fatima, Hussain, etc.) are Arabic placeholders. Swap them for your team in `rcode/team.yaml`. The methodology is the persona, not the names.

[rcode](https://rihal.om) is also one of Oman's fastest-growing tech companies — naming inspiration, not commercial affiliation.

---

## Learn more

| Document | What's in it |
|---|---|
| [`DOCS.md`](DOCS.md) | Complete docs — install, concepts, all commands, Memory Bank, dashboard, testing, architecture |
| [`docs/getting-started.md`](docs/getting-started.md) | Step-by-step first project |
| [`docs/TIERS.md`](docs/TIERS.md) | Starter / Advanced / Power-user paths |
| [`docs/dogfeed-flows.md`](docs/dogfeed-flows.md) | Live dogfeed log — every Q&A flow, every bug found, every fix shipped |
| [`MEMORY_BANK.md`](MEMORY_BANK.md) | Memory Bank specification |
| [`BRAND.md`](BRAND.md) | Naming, voice, persona glossary |
| [`CHANGELOG.md`](CHANGELOG.md) | Release history |

---

## Credits

- [Andrej Karpathy's coding observations](https://github.com/forrestchang/andrej-karpathy-skills) (MIT) — wired into the code-review agents as hard constraints.
- Built solo with [Claude Code](https://claude.com/claude-code) — the methodology shipped here is the one used to build it.

---

## License

Released under the [MIT License](LICENSE). Use it, fork it, ship it.
