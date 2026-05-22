# rcode — Starter Example

This walkthrough takes you from an empty directory to a planned sprint in ~10 minutes.

## Prerequisites

- Node.js 18+
- Git
- Claude Code (or compatible agent)

## 1. Install rcode

```bash
npx @hanzlaa/rcode install
```

## 2. Initialize the project

Always start with `/rcode-init` — it is the single entry point:

```
/rcode-init employee leave tracker for an Omani government ministry
```

`/rcode-init` detects this is a fresh project and routes into `/rcode-new-project` for you. The agent asks 5–10 questions about scope, users, constraints, then produces:
- `.planning/PROJECT.md` — project definition
- `.planning/REQUIREMENTS.md` — categorized requirements
- `.planning/ROADMAP.md` — phased execution plan

## 3. Plan the first sprint

```
/rcode-plan 01
```

Produces `.planning/phases/01-*/SPRINT.md` with stories, acceptance criteria, and dependency waves.

## 4. Execute the sprint

```
/rcode-execute 01
```

The executor agent works through each story — writes code, runs tests, commits atomically.

## 5. Check status

```
/rcode-status
```

Shows progress, blockers, and next actions.

## What's next?

- `/rcode-review` — review changes before merging
- `/rcode-sprint-status` — detailed sprint progress
- `/rcode-retrospective` — run a retro after the sprint
