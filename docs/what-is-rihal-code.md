# What is Rihal Code

**Rihal Code is Rihal's brain, installable into any project in one command.**

When a Rihalian — engineer, PM, designer, CTO, QA — opens Claude Code (or Cursor, or any compatible AI IDE) inside a project that has Rihal Code installed, the AI already knows how Rihal builds: the PR standards, the commit conventions, the architecture patterns, the way PRDs are written, the way milestones are sequenced, the way reviews are done. No prompting. No onboarding. The context is already in the room.

That is the only job of this package.

---

## Why it exists

Every Rihal project today carries unwritten context. How we review PRs. What "done" means. How architecture decisions are captured. How a sprint is planned. How a PRD is structured when it leaves a PM and lands in engineering. Which agent to consult when the question is strategic vs. tactical.

That knowledge lives in people's heads, Slack history, Notion pages, senior engineers' review comments. New Rihalians pick it up slowly. AI assistants pick it up never — because every new chat session starts with the model knowing nothing about how Rihal works.

Rihal Code fixes that. One install, and the AI now knows. Every session. Every repo. Every Rihalian.

---

## Who it's for

- **Every Rihalian** building anything at Rihal. Engineer, PM, designer, CTO, QA, junior, senior, new hire. If you use an AI assistant to get work done, this is for you.
- **Curious non-Rihalians** who want to see how a mature AI-engineering methodology is structured and packaged. The methodology itself is transferable; the Rihal-specific context is not — they'll be installing an empty brain with the scaffolding around it.

---

## What you get when you install it

Running `npx rihal-code install` into a project produces:

- **55+ phrase-activated skills** (from `/rihal:create-prd` to `/rihal:sprint-planning` to `/rihal:dev-story`) that route your request to the right workflow.
- **35+ agents** — Rihal's team in AI form: Sadiq for strategy, Waleed for architecture, Hussain for product, Layla for UX, Fatima for QA, and more. Each has a hard scope boundary, so you know which one to talk to.
- **File-based state** at `.rihal/` that every workflow reads and writes — project status, decisions, blockers, roadmap, sprints.
- **The Rihal brain** at `rihal/brain/` (pulled fresh on install, refreshable with `/rihal:update`):
  - PR / issue / commit standards from the Rihal GitHub org
  - Architecture docs and internal guides from the Rihal docs repo
  - Coding best practices accumulated from real Rihal projects
- **Planning workflows** — council, research, plan, execute, verify, review — that match how Rihal actually runs sprints.

---

## What Rihal Code is *not*

- Not a code generator. It does not write your app for you.
- Not a replacement for your AI assistant. It makes Claude Code / Cursor / Codex *better* — it does not replace them.
- Not a Rihal-only tool. Anyone can install it. The skills and agents work for anyone. The Rihal-specific brain content, however, is pulled from Rihal repos — non-Rihalians installing will get the scaffolding without the proprietary context.
- Not a methodology book. It is the methodology, executable, inside your editor.

---

## Where the context comes from

The brain is not baked into the package at build time. It is pulled live from three sources on install and on demand:

1. **Rihal GitHub org** — PR standards, commit standards, issue standards live here.
2. **Rihal docs repo** — architecture decisions, internal guides, role playbooks.
3. **In-repo best practices** — accumulated from real project experience and owned inside this repo under `rihal/skills/_shared/`.

Run `/rihal:update` any time to pull the latest. The pulled content is the single source of truth — local edits to installed brain files are overwritten on update (by design). If a Rihalian wants to change the standard, they contribute upstream to the Rihal docs repo or here — where every Rihalian benefits.

---

## What changes from v1 to v2

Rihal Code v1 was a generic AI-engineering methodology. It worked for anyone, and any team could install it.

Rihal Code v2 keeps all of that — and adds the Rihal brain layer on top. The repositioning is the product statement: Rihal Code is primarily for Rihalians now. The generic methodology is still there and still works, but the headline feature is the always-current Rihal context that makes every Rihalian's AI assistant feel like it's been working at Rihal for a year.

---

## Where this is going

- **v2.0** — Brain in a box, static + semi-dynamic pull (where we are).
- **v2.1** — Full per-role ownership: PM updates PM skills, CTO updates CTO skills. CODEOWNERS enforces. Contributing is one command, one PR.
- **v2.5** — Progress/status UX overhaul: AI-friendly CLI output, intent-based "next-up" menus, drift detection.
- **v3.0** — Live MCP server. No more `/rihal:update` needed. The brain is queried live; every Rihalian's AI always sees the latest Rihal standard the moment it's published.
- **v3.x** — Internal Rihal package registry replaces GitHub release as the distribution channel.

See `docs/ROADMAP.md` for the full roadmap.

---

## How to get involved

If you are a Rihalian and the skill for your role doesn't match how you actually work — fix it. PM skills live under `rihal/skills/actions/2-plan/` (for planning artifacts) and `rihal/skills/agents/pm/` (for the agent personas). CTO / architecture skills live under `rihal/skills/agents/cto/` and `rihal/skills/actions/3-solutioning/`. CODEOWNERS routes your PR to the right reviewer automatically.

See `CONTRIBUTING.md` for the per-role walkthrough. Every role gets one paragraph, one command sequence, one PR.
