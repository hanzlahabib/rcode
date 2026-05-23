<!-- RIHLA (رحلة) = "the journey". Not a typo of RIHAL (رحّال) = "the traveler" / the tool itself. Same root, different word. This file documents your project's journey; Rihal is the tool that walks it with you. -->
# RIHLA — Project journey baseline

**Written by:** /rihal-init
**Date:** 2026-05-16
**Project:** rihal-code
**Detected state:** returning (reconfigured via --reset)

## At a glance

- **Primary language:** JavaScript (Node.js, ESM + .cjs tooling)
- **Framework signals:** CLI tool (`@hanzlaa/rcode` v3.5.0); dependency-free dashboard server on Node stdlib; Preact-based dashboard client (migration in progress)
- **Git history:** 50 commits visible, all dated 2026-05-16 (shallow or recent history window)
- **Top-level dirs:** `cli/`, `rihal/`, `server/`, `dist/`, `docs/`, `examples/`, `scripts/`, `.rihal/`

## What's here

Rihal Code (`rcode`) — an AI team methodology packaged as an npm tool. One install gives
AI IDEs a persistent project brain: ~45 specialist agents, 116 commands, and a Memory Bank
at `.rihal/`. Published on npm as `@hanzlaa/rcode` v3.5.x, tested with `node --test`.

The full loop runs in three commands — `/rihal-council` → `/rihal-plan` → `/rihal-execute`.
The Diwan dashboard (`npm run dashboard`) renders project state, decisions, and the Memory
Bank in one view. Core value prop: AI assistants lose context on session reset; Rihal fixes
this with file-based state, checked-in memory, and opinionated research → plan → execute →
verify → recover workflows.

## Dependencies (from package manifest)

- **ws** — WebSocket server for dashboard live updates (only runtime dep)
- **@clack/prompts** (dev) — interactive CLI prompts for the installer
- **diff** (dev) — file diffing in install/update flows
- **esbuild** (dev) — bundles the CLI into `dist/rcode.js`
- **fast-glob** (dev) — file globbing across skills/agents
- **nanospinner** (dev) — CLI spinner UX
- **picocolors** (dev) — terminal colors
- **semver** (dev) — version comparison for updates
- **zod** (dev) — schema validation

## Recent work (last 10 commits)

```
f09e9e1 fix(dashboard): return vnode array instead of unsupported htm <> fragment
6b6a337 fix(dashboard): drop unused memo/createContext/useContext re-exports
7f3818d fix(dashboard): import createContext from preact core not preact/hooks
4f9f952 fix(dashboard): remove empty htm interpolations breaking App.js parse
deee81d docs(phases): complete phase 33 — command runner verification, review, summaries
990bdd9 chore(phases): mark phase 33 review clean, defer L3 to GH issue
df33edc fix(dashboard): correct stale JSDoc, undefined CSS token, and setTimeout leak
190a2fa fix(orchestrator): close allowlist bypass when body.cmd is falsy on cmd- sessions
e5a05e6 docs(phases): add 33-3-SUMMARY.md, update ROADMAP and STATE for sprint 33.3
831fd7b feat(dashboard): disable Run button while cmd session is running
```

Current branch: `31-preact-migration` — dashboard client is being migrated to Preact.

## Not scanned

This file is a journey baseline — intentionally shallow. For deep analysis run:
- `/rihal-map-codebase` — structured codebase documents per focus area
- `/rihal-scan` — rapid codebase assessment
- `/rihal-explore` — socratic ideation against the codebase
