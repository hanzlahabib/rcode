---
generated: true
do-not-edit: true
regenerate-with: /rcode-memory-distill
source-digest: b333d083828f629bdb7a6adfe826ed5e92a4a1c4
generated-at: 2026-05-22T21:10:24Z
source-files:
  - project/stack.md
---

# Stack Distillate — `rcode`

> Lossless compression of `project/stack.md`. Use when you need stack context without full project history.

## One-liner

`rcode` is a Node.js CLI (CommonJS, ≥18) that ships skills, agents, and workflows for AI coding IDEs (Claude Code, Cursor, Gemini). **Zero runtime dependencies by design.**

## Runtime

| Layer | Choice |
|---|---|
| Language | JavaScript / CommonJS, Node ≥18 (`engines.node`) |
| Test runner | built-in `node --test` (no Jest, no Mocha) |
| Bundler | `esbuild ^0.25` (devDep) → bundles `cli/` to `dist/rcode.js` |
| CLI helpers | `picocolors`, `nanospinner`, `@clack/prompts`, `fast-glob`, `zod`, `semver`, `diff` — all devDeps, bundled, **zero RUNTIME deps** |
| HTTP server | `node:http` only (Diwan dashboard, `server/dashboard.js`, port 7717) |

## Frontend (Diwan dashboard)

Server-rendered HTML + inline CSS + inline JS. No build step, no framework. Templates in `server/lib/html/{shell,css,client}.js`. Hash-based routing via `location.hash`. Styling = CSS variables + system fonts + Inter via Google Fonts CDN. View-only — no write endpoints.

## Infrastructure

| Layer | Choice |
|---|---|
| Dev env | Pure Node, no Docker |
| Distribution | npm — `@hanzlaa/rcode` |
| Install | `pnpm dlx @hanzlaa/rcode install` (preferred) or `npx` into user repo |
| CI/CD | GitHub Actions — `test.yml` (Node 18/20/22/24 matrix), `release.yml`, `semantic.yaml`, `commit-author.yaml` |

## Integrations

| Service | Purpose |
|---|---|
| Claude Code | primary AI IDE target → `.claude/` |
| Cursor | secondary → `.cursor/` |
| Gemini CLI | tertiary → `.gemini/` |
| GitHub | issue/PR sync via `cli/github-sync.js` |

## Storage

- `.rcode/state.json` — project state (phases, decisions, sessions)
- `.rcode/memory/` — Memory Bank (this file lives here — dogfood)
- `.rcode/context/active.md` — current task context
- `.rcode/brain/` — institutional knowledge pulled from upstream rcode repos
- `.planning/` — runtime artefacts (phases, councils, summaries)

## Why these choices

- **Zero runtime deps** — forces simple surface, CI runs on clean checkout with nothing but Node. See ADR 0001.
- **Built-in test runner** — every contributor can run the suite offline, no install.
- **Hand-written dashboard (~1880 LOC)** — avoids a frontend toolchain; view-only so framework would outweigh insight.
- **`node:http` over Express** — same reason + guarantees no write endpoints exist.
