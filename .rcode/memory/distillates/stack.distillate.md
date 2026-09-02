---
generated: true
do-not-edit: true
regenerate-with: /rcode-memory-distill
source-digest: f1c009ceab5f88ec5e7745635904d7f5988a14cf
generated-at: 2026-09-02T09:34:42Z
source-files:
  - project/stack.md
token-estimate: ~350
---

# Stack Distillate — `rcode`

> Lossless compression of `project/stack.md`. Use when you need stack context without full project history. `source-digest` is a content hash via `node .rcode/bin/rcode-tools.cjs memory-digest stack` (#1065).

## One-liner

`rcode` is a Node.js CLI shipping skills, agents, and workflows for AI coding tools (Claude Code, Cursor, Gemini). Zero runtime dependencies by design.

## Runtime

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Language | JavaScript (CommonJS) | Node ≥18 | `package.json` `engines.node: >=18.0.0` |
| Test runner | `node --test` | built-in | No Jest, no Mocha — built-ins only |
| Bundler | esbuild | ^0.25 | devDep; bundles `cli/` to `dist/rcode.js` |
| CLI helpers | `picocolors`, `nanospinner`, `@clack/prompts`, `fast-glob`, `zod`, `semver`, `diff` | varies | All devDeps, bundled by esbuild — zero RUNTIME deps |
| HTTP server | Node `http` module | built-in | Diwan dashboard at `server/dashboard.js`, port 7717 |

## Frontend

Diwan dashboard: server-rendered HTML + inline CSS + inline JS, no build step, no framework. Render via hand-written template strings in `server/lib/html/{shell,css,client}.js`. Routing: hash-based (`location.hash`). Styling: CSS variables + system fonts + Inter via Google Fonts CDN.

## Infrastructure

Dev environment: pure Node, no Docker required. Distribution: npm registry, package `@hanzlaa/rcode`. Install target: user repos via `npx @hanzlaa/rcode install`. CI/CD: GitHub Actions — `.github/workflows/test.yml` (Node 18/20/22/24 matrix), `release.yml`, `semantic.yaml`, `commit-author.yaml`.

## Third-party integrations

Claude Code (primary, `.claude/` install path) · Cursor (secondary, `.cursor/`) · Gemini CLI (tertiary, `.gemini/`) · GitHub (issue/PR sync via `cli/github-sync.js`).

## Storage

`.rcode/state.json` project state (phases, decisions, sessions) · `.rcode/memory/` Memory Bank (this file lives here, dogfood) · `.rcode/context/active.md` current task context · `.rcode/brain/` institutional knowledge pulled from upstream rcode repos · `.planning/` runtime artefacts (phases, councils, summaries).

## Why these choices

Zero runtime dependencies — keeps the surface simple, CI runs on a clean checkout with nothing but Node (see ADR 0001). Built-in test runner — every contributor runs the suite offline, no install step. Hand-written HTML/CSS/JS dashboard — avoids a frontend toolchain; dashboard is view-only (~1880 lines across 5 files), so a framework would be more weight than insight. `node:http` instead of Express — same reason, and it guarantees no write endpoints exist.
