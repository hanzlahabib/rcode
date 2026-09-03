# Stack — `rcode`

rcode is a Node.js CLI that ships skills, agents, and workflows for AI coding tools (Claude Code, Cursor, Gemini). Minimal runtime footprint by design — one exception, `ws`, was added for `server/orchestrator.js`.

---

## Runtime

| Layer | Choice | Version | Notes |
|---|---|---|---|
| Language | JavaScript (CommonJS) | Node ≥ 18 | `package.json` `engines.node: >=18.0.0` |
| Test runner | `node --test` | built-in | No Jest, no Mocha — built-ins only |
| Bundler | esbuild | ^0.25 | devDep; bundles `cli/` to `dist/rcode.js` for distribution |
| CLI helpers | `picocolors`, `nanospinner`, `@clack/prompts`, `fast-glob`, `zod`, `semver`, `diff` | varies | All devDeps; bundled by esbuild — no runtime footprint |
| HTTP server | Node `http` module | built-in | Diwan dashboard at `server/dashboard.js` (port 7717) |
| WebSocket | `ws` | ^8.21.0 | Real runtime dependency (only one) — used by `server/orchestrator.js` |

## Frontend

The Diwan dashboard is server-rendered HTML + inline CSS + inline JS. No build step, no framework.

| Layer | Choice |
|---|---|
| Render | Hand-written template strings in `server/lib/html/{shell,css,client}.js` |
| Routing | Hash-based (`location.hash`) — see `server/lib/html/client.js` |
| Styling | CSS variables + system fonts + Inter via Google Fonts CDN |

## Infrastructure

| Layer | Choice |
|---|---|
| Dev environment | Pure Node (no Docker required) |
| Distribution | npm registry — package `@hanzlaa/rcode` |
| Install target | User repos via `npx @hanzlaa/rcode install` |
| CI/CD | GitHub Actions — `.github/workflows/test.yml` (Node 18/20/22/24 matrix), `release.yml`, `semantic.yaml`, `commit-author.yaml` |

## Third-party integrations

| Service | Purpose |
|---|---|
| Claude Code | Primary AI IDE target (`.claude/` install path) |
| Cursor | Secondary target (`.cursor/` install path) |
| Gemini CLI | Tertiary target (`.gemini/` install path) |
| GitHub | Issue / PR sync via `cli/github-sync.js` |

## Storage

- **`.rcode/state.json`** — project state (phases, decisions, sessions)
- **`.rcode/memory/`** — Memory Bank (this file lives here, dogfood)
- **`.rcode/context/active.md`** — current task context
- **`.rcode/brain/`** — institutional knowledge pulled from upstream rcode repos
- **`.planning/`** — runtime artefacts (phases, councils, summaries)

---

## Why these choices

- **Minimal runtime footprint.** Forces the surface to stay simple and CI to run on a clean checkout with almost nothing but Node — `ws` (for `server/orchestrator.js`) is the one exception as of `ws@^8.21.0`.
- **Built-in test runner.** Same reason — every contributor can run the suite offline with no install step.
- **Hand-written HTML/CSS/JS dashboard.** Avoids a frontend toolchain. The dashboard is view-only (~1880 lines across 5 files), so a framework would be more weight than insight.
- **`node:http` instead of Express.** Same reason — and it lets us guarantee no write endpoints exist.
