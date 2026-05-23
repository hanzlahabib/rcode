# rcode — Unique Selling Proposition

> **The only AI workflow system where agents never start from zero.**

This document frames the five structural advantages that make rcode fundamentally different from every other AI coding tool, agent framework, and workflow system on the market. It's written for potential users evaluating rcode, Rihalians explaining it to clients, and contributors understanding the design philosophy.

---

## The Market Today

Every AI coding tool fits one of three buckets:

| Bucket | Examples | What they do | What they don't do |
|--------|----------|--------------|-------------------|
| **Chat wrappers** | ChatGPT, Claude, Gemini | One-shot conversations with a generalist | Remember decisions, enforce upstream dependencies, maintain team context |
| **Code agents** | Cursor, Windsurf, Copilot Workspace, Devin | AI writes code with IDE context | Persist project knowledge across sessions, enforce workflow gates, specialise by role |
| **Agent frameworks** | CrewAI, AutoGen, LangGraph, Agency Swarm | Multi-agent orchestration via code | Ship without custom infrastructure, work offline, integrate with git natively |

rcode sits in none of these buckets. It is not a chat wrapper, not a code agent, and not a framework you program against. **rcode is a checked-in project brain that makes any AI IDE smarter — permanently.**

---

## Six Structural USPs

### 1. Persistent Memory That Survives Everything

**The problem everyone else ignores:** Every AI session starts from scratch. The assistant that helped you pick PostgreSQL over MongoDB on Monday has no idea by Wednesday. The context is gone — lost to token limits, session resets, and context window eviction.

**How rcode solves it:**

```
.rcode/memory/
├── project/stack.md          # what we're building with
├── project/decisions.md      # every choice + rationale + alternatives
├── project/glossary.md       # domain terms
├── people/stakeholders.md    # who decides what
├── milestones/current.md     # what we're doing now
├── incidents/known-issues.md # what's broken and why
└── distillates/              # lossless <5K token summaries
```

This is not a database. It's **plain markdown, checked into git**. Every agent reads it on session start. Every workflow writes to it as decisions happen. It survives:

- Session resets ✅
- Context window limits ✅
- Team member changes ✅
- IDE switches (Claude → Cursor → Gemini) ✅
- AI model upgrades ✅

**No other tool does this.** Cursor has "Memories" but they're per-user, not per-project, and not git-tracked. ChatGPT has "Memory" but it's opaque, per-account, and you can't inspect or version it. CrewAI has "memory" abstractions but they require a running server and a vector database.

rcode's Memory Bank is **a folder in your repo**. `cat` works. `git blame` works. Your CI can read it. Your new teammate can read it on day one.

---

### 2. Specialists, Not Generalists

**The problem:** Every AI tool gives you one assistant pretending to be everything — strategy, product, engineering, design, QA, and DevOps in one entity. The result is mush: hedged opinions, generic advice, no sharp edges.

**How rcode solves it:** 45 named agents, each with a hard scope boundary and explicit deferral rules.

```
                     Sadiq (why should we build this?)
                         │
                    ┌────┴────┐
                    │         │
               Waleed        Hussain-PM
           (how to build)    (what to build)
                    │              │
              ┌─────┼─────┐    Layla ◀── Zahra
              │     │     │  (how it feels) (how it looks)
           Hanzla Haitham Yousef
           (full)  (front) (back)
              │     │     │
              └─────┼─────┘
                    │
               Fatima (is it ready?)
                    │
               Khalid (ship it)
```

**Each agent refuses to answer outside their domain.** Ask Waleed (CTO) to write a PRD and he'll tell you to talk to Hussain. Ask Haitham (frontend) about database schema and he'll redirect you to Yousef. This isn't a gimmick — it produces sharper outputs because each agent's prompt is optimised for one job, not diluted across twenty.

**Why 45?** Because real teams have role layers. rcode splits them into 16 named personas + 29 workflow specialists:

**16 named personas** — the team you'd hire:
- 2 strategic (Sadiq, Ahmed)
- 1 product (Hussain-PM)
- 1 growth (Mariam)
- 2 design (Layla, Zahra)
- 6 engineering (Waleed, Yousef, Haitham, Zayd, Hanzla, Omar)
- 1 quality (Fatima)
- 1 ops (Khalid)
- 1 content (Noor)
- 1 management (Nasser)

**29 workflow specialists** — the tactical agents your workflows spawn:
- 3 planning (planner, roadmapper, remediation-planner)
- 4 research (phase-researcher, project-researcher, research-synthesizer, advisor-researcher)
- 4 analysis (assumptions-analyzer, codebase-mapper, deviation-analyzer, profiler)
- 2 execution (executor, debugger)
- 2 code (code-reviewer, code-fixer)
- 5 quality (verifier, sprint-checker, integration-checker, nyquist-auditor, edge-case-hunter)
- 5 audit (docs, i18n, cross-platform, dep, observability)
- 2 security (security-adversary, security-auditor)
- 2 design/UI (ui-auditor, ux-designer)

Every one is a separate file at `rcode/agents/<name>.md` that you can `cat`, edit, fork, or delete.

**No framework does this at install-time.** CrewAI lets you define agents in code — you have to build and maintain them yourself. rcode ships 45 agents in one `pnpm dlx install`, all dogfooded on real projects (calories-counter RN, reelspeed services) before each release.

---

### 3. Upstream-Grounded Workflows (No Hallucinated Requirements)

**The problem:** The #1 failure mode of AI planning is the generalist confidently inventing epics, stories, and architecture from nothing. It looks impressive. It's usually wrong.

**How rcode solves it:** Every creation skill **refuses to run** without its upstream artifact. This is structural, not advisory.

```
Can't create epics → without a PRD
Can't create stories → without epics
Can't plan a sprint → without stories
Can't execute a story → without a sprint plan
Can't ship → without verification
```

The chain is enforced. If you try to run `/rcode-create-epics-and-stories` and no PRD exists in `.rcode/phases/`, the skill stops and tells you: *"Run rcode-create-prd first. I cannot invent requirements."* It doesn't hedge. It doesn't offer to "help you get started." It refuses, names the missing upstream, and gives you the exact command to run.

**Why this matters:** Every other tool will happily generate a 20-epic backlog from a one-sentence prompt. rcode won't. The constraint is the feature. Your epics are grounded in a PRD. Your stories are grounded in epics. Your sprint is grounded in stories. There is no hallucinated layer in the chain.

**Verification closes the loop.** After execution, `/rcode-verify-phase` performs a goal-backward audit — "does the codebase actually deliver what the phase promised?" — not just "did the tasks complete?" This catches drift between plan and reality before it ships.

---

### 4. Zero Infrastructure, Pure Files

**The problem with agent frameworks:** They need servers. CrewAI needs Python + a running process. AutoGen needs a runtime. LangGraph needs LangChain infrastructure. Agency Swarm needs an API. To use them in CI, you need Docker. To collaborate, you need a shared server. To debug, you need logging infrastructure.

**rcode needs nothing.**

```bash
pnpm dlx @hanzlaa/rcode install   # done — ~500ms on a fresh project
```

What you get is **files**. Markdown files, YAML files, JSON files. Dropped into your repo. Read by your AI IDE natively. No server, no database, no vector store, no API key, no Docker, no Python, no runtime dependency.

| Property | rcode | Agent frameworks |
|----------|-------|-----------------|
| Install | `pnpm dlx @hanzlaa/rcode install` (one command, ~500ms) | pip/npm + config + env vars + API keys |
| Runtime | None (files read by IDE) | Python/Node server process |
| State | Git-tracked markdown | Database / vector store / Redis |
| Offline | Works on a plane | Requires API connectivity |
| Debugging | `cat .rcode/memory/project/decisions.md` | Log aggregation + tracing |
| CI integration | `grep` / `cat` / any shell tool | Docker + SDK + API calls |
| Collaboration | `git pull` | Shared server + auth |
| IDE support | Claude, Cursor, Gemini, VS Code, Antigravity, Windsurf | Framework-specific |
| Upgrade | `pnpm dlx @hanzlaa/rcode update` | Dependency hell |
| Uninstall | `pnpm dlx @hanzlaa/rcode uninstall` (creates backup) | Hope nothing breaks |

**The simplicity is the moat.** Anyone can read the state. Anyone can debug the state. `git blame` tells you who decided what and when. No vendor lock-in, no opaque database, no "it works on my machine."

---

### 5. Battle-Tested Pain Skills (Not Theoretical Best Practices)

**The problem:** Most AI tools ship generic capabilities. "Write code." "Review code." "Plan a project." They've never been burned by the specific ways real projects fail.

**rcode encodes 8 real-pain skills** from actual rcode production incidents:

| Skill | Pain it addresses | What happened |
|-------|-------------------|---------------|
| `rcode-auth-audit` | Keycloak ↔ AD sync silently broke logins | Users disappeared. Tokens accepted post-deactivation. Phantom sessions. |
| `rcode-client-gate` | Late client requirements derailed delivery | Client added scope mid-sprint. Project slipped 3 weeks. The fix is structural gates, not "communicate better." |
| `rcode-deploy-unify` | Multiple deploy paths broke production | Docker Compose + Helm + manual scripts + Vercel. "Which one runs in prod?" cost a week of debugging. |
| `rcode-mvp-graduate` | MVP worked but couldn't be revamped | Original context lost. Rewrite-from-scratch was the only option. |
| `rcode-rebrand` | Mid-project rebrand touched 100+ files | Rename rippled through code, config, env vars, docs, redirects. Broke 3 deploys. |
| `rcode-ocr-consistency` | OCR pipeline gave different results each run | Arabic/English routing failures. Triton inconsistencies. No ground-truth checks. |
| `rcode-theme-system` | Design tokens drifted until full audit was needed | Scattered hex values, hardcoded spacing, missing dark mode support. |
| `rcode-migrate` | MVP-to-production gap with no migration path | Flaky deploys, manual ops, no observability, hand-rolled auth. |

Plus 11 engineering-rigor skills that enforce discipline:

| Skill | What it enforces |
|-------|-----------------|
| `rcode-prove-it` | Test-first development — failing test before code |
| `rcode-harden` | Security hardening checklist before launch |
| `rcode-perf` | Performance budgets (LCP, TBT, CLS, frame budget, query plans) |
| `rcode-debug` | Scientific method debugging — hypothesis → experiment → observe |
| `rcode-trim` | Code simplification — reduce lines, collapse abstractions |
| `rcode-incremental` | Atomic commits — one logical change per commit, test after each |
| `rcode-source-truth` | Cite upstream docs before writing framework code |
| `rcode-browser-verify` | DevTools verification — DOM state, console errors, network, perf traces |
| `rcode-ci` | CI/CD quality gates for GitHub Actions + K8s |
| `rcode-git-flow` | Branching, commits, conflicts aligned to project hierarchy |
| `rcode-incident-record` | Post-mortem + change record in one flow |

**These aren't checklists someone wrote in a weekend.** They're encoded from incidents on real Rihal projects (where rcode's methodology was first developed before being separated and rebranded). The auth-audit skill knows about Keycloak sync drift because a Rihal project lived through it. The deploy-unify skill knows about overlapping deploy mechanisms because three deploys broke before the team got it right. rcode brings that institutional pain into your project from day one.

---

### 6. Pull Any Public Docs Repo Into Project Context

**The problem:** Every team accumulates institutional knowledge — PR standards, architecture decisions, internal playbooks. Today that lives in Notion, Confluence, a wiki, or a private GitHub repo. AI assistants can't see it because they have no native way to inject "the team's docs" into a project's working context without copy-paste or a custom RAG pipeline.

**How rcode solves it:** Point `rcode/brain/sources.yaml` at any GitHub repo (public or private via `gh auth`), declare which paths to pull, and `rcode-tools brain pull` does sparse-checkout into `.rcode/brain/<dest>/` on install and every `/rcode-update`.

```yaml
# rcode/brain/sources.yaml
sources:
  - name: my-org-standards
    repo: "https://github.com/my-org/engineering-docs.git"
    branch: main
    paths:
      - "pr-standards.md"
      - "architecture/**/*.md"
      - "review-checklist.md"
    dest: my-org-standards/
```

**Why this matters:** Every agent in your project now sees your team's standards as part of its base context. No copy-paste. No re-explaining. When the upstream docs repo updates, every project running rcode picks up the change on next `/rcode-update`. A 6-hour cache TTL keeps it fast.

**Try it in 60 seconds.** Point at any public docs repo — say [Anthropic's prompt-engineering tutorial](https://github.com/anthropics/prompt-eng-interactive-tutorial) — drop it into `sources.yaml`, and the next `/rcode-update` puts those docs at `.rcode/brain/anthropic-prompting/` where every agent sees them on session start.

**For an organisation:** fork rcode, fill `sources.yaml` with your org's public docs repo URLs, and you have a company-flavoured rcode where every project starts already oriented to how your team builds.

---

## The Compound Effect

Any single USP is useful. Together, they compound:

```
Memory Bank              → agents never start from zero
  + Specialists          → each agent is sharp, not generic
  + Upstream grounding   → no hallucinated plans
  + Zero infrastructure  → anyone can adopt in under a second
  + Pain-grounded skills → real-world incidents are pre-encoded
  + Brain pull           → your org's docs ride along
  ─────────────────────────────────────────────────────
  = A project brain that gets smarter with every session
```

The more you use rcode, the more `.rcode/memory/` accumulates. The more memory accumulates, the sharper every agent response becomes. The sharper the responses, the less time you spend re-explaining context. **The flywheel is: use → remember → improve → use.**

No other tool creates this flywheel because no other tool persists project context in a git-native, AI-readable, human-inspectable format that survives every session reset.

---

## Who rcode Is For

| Audience | Why rcode fits |
|----------|---------------|
| **Solo devs** | You are the whole team. rcode gives you 45 specialists without hiring anyone. |
| **Startup teams (2-8)** | Context loss across team members is your #1 time sink. Memory Bank fixes it. |
| **SaaS builders** | The pain skills (auth-audit, deploy-unify, mvp-graduate) are written for your stack. |
| **Agencies / consultancies** | Client context survives project handoffs. New devs onboard from `.rcode/memory/`, not Slack archaeology. |
| **AI-native teams** | You already use Claude/Cursor/Gemini daily. rcode makes them 10x better on your specific project. |
| **OSS contributors using AI** | Your fork's decisions, conventions, and rationale live in `.rcode/memory/` — reviewers can `git diff` your project brain alongside the code. |
| **AI tooling researchers** | Every primitive is a markdown file. Fork it, instrument it, write a paper on what works — no proprietary runtime in the way. |

## Who rcode Is NOT For

- Teams that don't use AI coding assistants (rcode has no value without an AI IDE)
- One-off scripts or throwaway prototypes (the overhead isn't worth it for a 2-hour project)
- Teams allergic to opinionated tooling (rcode has strong opinions about workflow gates and agent boundaries)

---

## The One-Line Pitch

> **rcode: your project's brain — 45 specialist agents, persistent memory, zero infrastructure. Install once, context never lost.**

---

## Competitive Positioning

| Dimension | ChatGPT / Claude | Cursor / Windsurf | CrewAI / AutoGen | **rcode** |
|-----------|-----------------|-------------------|------------------|-----------|
| Memory | Per-account, opaque | Per-user, not git-tracked | Requires vector DB | **Git-tracked, per-project, inspectable** |
| Agents | 1 generalist | 1 generalist with IDE context | Define your own in code | **45 shipped at install time** |
| Workflow gates | None | None | Build your own | **Structural — refuses without upstream** |
| Infrastructure | Cloud API | Cloud API + local IDE | Python server + dependencies | **Zero — pure files** |
| Pain encoding | Generic | Generic | Generic | **8 incident-grounded skills + 11 rigor skills** |
| Install | N/A | IDE extension | pip install + config + code | **`pnpm dlx install` — under 1 second** |
| Collaboration | Share chat link | Share workspace | Shared server | **`git pull`** |
| Offline | ❌ | Partial | ❌ | **✅ Full offline** |
| IDE support | ChatGPT only | Cursor only | Framework only | **Claude, Cursor, Gemini, VS Code, Antigravity, Windsurf** |

---

*This document is part of the rcode project. See [README.md](../README.md) for installation and [DOCS.md](../DOCS.md) for the complete reference.*
