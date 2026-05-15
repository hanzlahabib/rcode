# Rihal Code — Starter Example

This walkthrough takes you from an empty directory to a planned sprint in ~10 minutes.

## Prerequisites

- Node.js 18+
- Git
- Claude Code (or compatible agent)

## 1. Install Rihal Code

```bash
npx @hanzlaa/rcode install
```

## 2. Initialize the project

Always start with `/rihal-init` — it is the single entry point:

```
/rihal-init employee leave tracker for an Omani government ministry
```

`/rihal-init` detects this is a fresh project and routes into `/rihal-new-project` for you. The agent asks 5–10 questions about scope, users, constraints, then produces:
- `.planning/PROJECT.md` — project definition
- `.planning/REQUIREMENTS.md` — categorized requirements
- `.planning/ROADMAP.md` — phased execution plan

## 3. Plan the first sprint

```
/rihal-plan 01
```

Produces `.planning/phases/01-*/SPRINT.md` with stories, acceptance criteria, and dependency waves.

## 4. Execute the sprint

```
/rihal-execute 01
```

The executor agent works through each story — writes code, runs tests, commits atomically.

## 5. Check status

```
/rihal-status
```

Shows progress, blockers, and next actions.

## What's next?

- `/rihal-code-review` — review changes before merging
- `/rihal-sprint-status` — detailed sprint progress
- `/rihal-retrospective` — run a retro after the sprint
