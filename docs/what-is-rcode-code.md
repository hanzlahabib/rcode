# What is rcode

**rcode is rcode's brain, installable into any project in one command.**

When a rcode user — engineer, PM, designer, CTO, QA — opens Claude Code (or Cursor, or any compatible AI IDE) inside a project that has rcode installed, the AI already knows how rcode builds: the PR standards, the commit conventions, the architecture patterns, the way PRDs are written, the way milestones are sequenced, the way reviews are done. No prompting. No onboarding. The context is already in the room.

That is the only job of this package.

---

## Why it exists

Every rcode project today carries unwritten context. How we review PRs. What "done" means. How architecture decisions are captured. How a sprint is planned. How a PRD is structured when it leaves a PM and lands in engineering. Which agent to consult when the question is strategic vs. tactical.

That knowledge lives in people's heads, Slack history, Notion pages, senior engineers' review comments. New rcode users pick it up slowly. AI assistants pick it up never — because every new chat session starts with the model knowing nothing about how rcode works.

rcode fixes that. One install, and the AI now knows. Every session. Every repo. Every rcode user.

---

## Who it's for

- **Every rcode user** building anything at rcode. Engineer, PM, designer, CTO, QA, junior, senior, new hire. If you use an AI assistant to get work done, this is for you.
- **Curious non-rcode users** who want to see how a mature AI-engineering methodology is structured and packaged. The methodology itself is transferable; the rcode-specific context is not — they'll be installing an empty brain with the scaffolding around it.

---

## What you get when you install it

Running `pnpm dlx @hanzlaa/rcode install` into a project produces:

- **86 phrase-activated skills** (from `/rcode-create-prd` to `/rcode-sprint-planning` to `/rcode-dev-story`) that route your request to the right workflow.
- **116 slash commands** wired through to the skills, agents, and workflows.
- **45 agents** — rcode's team in AI form: Sadiq for strategy, Waleed for architecture, Hussain for product, Layla for UX, Fatima for QA, and more. Each has a hard scope boundary, so you know which one to talk to.
- **File-based state** at `.rcode/` that every workflow reads and writes — project status, decisions, blockers, roadmap, sprints.
- **The rcode brain** at `rcode/brain/` (pulled fresh on install, refreshable with `/rcode-update`):
  - PR / issue / commit standards from the rcode GitHub org
  - Architecture docs and internal guides from the rcode docs repo
  - Coding best practices accumulated from real rcode projects
- **Planning workflows** — council, research, plan, execute, verify, review — that match how rcode actually runs sprints.

---

## What rcode is *not*

- Not a code generator. It does not write your app for you.
- Not a replacement for your AI assistant. It makes Claude Code / Cursor / Codex *better* — it does not replace them.
- Not a rcode-only tool. Anyone can install it. The skills and agents work for anyone. The rcode-specific brain content, however, is pulled from rcode repos — non-rcode users installing will get the scaffolding without the proprietary context.
- Not a methodology book. It is the methodology, executable, inside your editor.

---

## Where the context comes from

The brain is not baked into the package at build time. It is pulled live from three sources on install and on demand:

1. **rcode GitHub org** — PR standards, commit standards, issue standards live here.
2. **rcode docs repo** — architecture decisions, internal guides, role playbooks.
3. **In-repo best practices** — accumulated from real project experience and owned inside this repo under `rcode/skills/_shared/`.

Run `/rcode-update` any time to pull the latest. The pulled content is the single source of truth — local edits to installed brain files are overwritten on update (by design). If a rcode user wants to change the standard, they contribute upstream to the rcode docs repo or here — where every rcode user benefits.

---

## What changed in v4

v4.0.0 is the rename release: the `rihal-*` prefix was retired across the entire stack and replaced with `rcode-*`. Memory Bank now ships populated (rcode dogfoods its own bank under `.rcode/memory/`), and `brain pull` is end-to-end working against real sources.

---

## Where this is going

- **v4.x** — Live brain pull on demand, full per-role ownership: PM updates PM skills, CTO updates CTO skills. CODEOWNERS enforces. Contributing is one command, one PR.
- **v5.0** — Live MCP server. No more `/rcode-update` needed. The brain is queried live; every rcode user's AI always sees the latest rcode standard the moment it's published.
- **v5.x** — Internal rcode package registry replaces GitHub release as the distribution channel.

See `docs/ROADMAP.md` for the full roadmap.

---

## How to get involved

If you are a rcode user and the skill for your role doesn't match how you actually work — fix it. PM skills live under `rcode/skills/actions/2-plan/` (for planning artifacts) and `rcode/skills/agents/pm/` (for the agent personas). CTO / architecture skills live under `rcode/skills/agents/cto/` and `rcode/skills/actions/3-solutioning/`. CODEOWNERS routes your PR to the right reviewer automatically.

See `CONTRIBUTING.md` for the per-role walkthrough. Every role gets one paragraph, one command sequence, one PR.
