# Architecture Audit

## System map

```
rihal-code/
├── cli/            SOURCE — CLI commands + installer logic (Node.js CJS)
│   ├── index.js    entry point: command router
│   ├── install.js  2,988 lines: installs .rcode/ into a target project
│   ├── lib/        shared CLI utilities (config, manifest, schemas, prompts)
│   └── *.js        one file per subcommand (update, uninstall, doctor, etc.)
│
├── server/         SOURCE — Diwan dashboard (view-only HTTP + WebSocket server)
│   ├── dashboard.js  HTTP server, serves Preact SPA
│   ├── orchestrator.js  WebSocket + PTY runner for agent sessions
│   └── lib/        scanner (filesystem reader) + API handlers + HTML shell
│
├── rcode/          SOURCE — Prompt assets shipped to users on install
│   ├── skills/     agent SKILL.md files (agents/, actions/, core/)
│   ├── bin/        hook scripts (rcode-hooks.cjs, rcode-tools.cjs) + lib/
│   ├── workflows/  Markdown workflow files
│   ├── commands/   slash-command prompt files
│   └── ...         brain/, templates/, references/, config.yaml, state.json
│
├── .rcode/         RUNTIME — self-hosted copy, seeded by `rcode install --self`
│   └── bin/        identical content to rcode/bin/ (synced via sync-bin.sh)
│
├── dist/           BUILD OUTPUT — esbuild bundle of cli/ (839 KB, single file)
│   └── rcode.js    published npm binary (`bin.rcode` in package.json)
│
├── scripts/        Build tooling
│   ├── build.cjs           cli/ → dist/rcode.js via esbuild
│   ├── sync-bin.sh         rcode/bin/ → .rcode/bin/ for dogfood dev loop
│   └── build-skills-catalog.cjs  generates docs/skills-catalog.md
│
├── test/           Node built-in test runner (~55 .test.cjs files)
├── docs/           Markdown documentation (not shipped in npm package)
├── .github/        CI workflows, issue templates, CODEOWNERS
└── .planning/      Project management artifacts (phases, milestones, STATE.md)
```

**Dependency direction:**
```
cli/ ──────────────────────────────► dist/rcode.js  (build-time)
  └─► cli/lib/  (internal)
server/ ──────────────────────────► standalone (no cli/ dependency)
rcode/ ──────────────────────────► installed into .rcode/ (copy-on-install)
.rcode/bin/ ──────────────────────► reads .rcode/config.yaml (stdlib only)
```

No cross-layer circular dependencies were found. `cli/`, `server/`, and `rcode/bin/` each depend only on Node stdlib and npm packages; none require each other.

## Build pipeline

```
Source: cli/index.js + cli/**  →  Build: scripts/build.cjs (esbuild)  →  Output: dist/rcode.js
```

- esbuild bundles all devDependencies inline; only Node built-ins are external.
- `prepack` hook runs the build automatically before `npm publish`.
- `dist/rcode.js` is **committed to the repo** (839 KB). It must be rebuilt manually (`pnpm build`) after any change to `cli/`. There is no watch mode.
- `rcode/bin/` changes require a separate manual step (`scripts/sync-bin.sh`) to propagate into `.rcode/bin/`. The dogfood-check gate catches drift but only if run explicitly.

## Coupling analysis

| Direction | Coupled? | Notes |
|-----------|----------|-------|
| `cli/` → `server/` | No | `cli/dashboard.js` spawns `server/dashboard.js` via `child_process`, no `require` |
| `cli/` → `rcode/` | Yes, at install-time | `cli/lib/manifest.cjs` resolves `rcode/skills/` paths to enumerate assets |
| `server/` → `cli/` | No | Server is fully standalone |
| `.rcode/bin/` → `cli/` | No | Hooks are stdlib-only; no require back into package source |
| `dist/rcode.js` → everything | Yes | Single bundle contains all of `cli/` and its deps |

## Concerns

### [HIGH] `cli/install.js` is a god file (2,988 lines)
Single file mixes CLI flag parsing, IDE detection, file-copy orchestration, config writing, git integration, Zod schema validation, and multi-IDE installer strategies. Any change risks unintended side effects across unrelated install paths. The file already exceeds the 1,000-line limit stated in CLAUDE.md.

### [HIGH] `dist/rcode.js` is a committed binary (839 KB)
The bundle is checked into git. Every `cli/` change produces a large diff that inflates history and PR noise. If a contributor edits `cli/` without running `pnpm build`, the committed bundle silently goes stale.

### [HIGH] Dual-path config duplication
`cli/lib/config.cjs` and `rcode/bin/lib/config.cjs` are **separate implementations** of config loading — both parse `.rcode/config.yaml` but with different feature sets (3-level cascade in cli/ vs. single-file YAML in rcode/bin/). They can drift in key names or parsing rules with no shared test.

### [MED] `rcode/bin/` ↔ `.rcode/bin/` manual sync
The only thing keeping source and runtime in sync is a manual shell script. Developers can edit `rcode/bin/` and forget `sync-bin.sh`, causing silent dogfood failures. The dogfood gate catches this, but it is not enforced in CI pre-commit.

### [MED] Skills/agents loaded via filesystem scan (no registry)
`cli/lib/manifest.cjs` enumerates `rcode/skills/` with `fs.readdirSync`. There is no central registry. Adding a skill requires only dropping a directory in the right place, which is flexible but means the set of available skills is never statically knowable; typos in directory names silently exclude agents.

### [LOW] CLI entry (`package.json: "main"`) vs. actual binary (`bin.rcode`) mismatch
`"main": "cli/index.js"` implies this is a library, but `rcode` is CLI-only. No public API is exported. Consumers who do `require('@hanzlaa/rcode')` get the CLI router, not a usable library.

## Strengths

- **Clean layer separation**: `cli/`, `server/`, `rcode/bin/` have no circular imports.
- **Self-contained binary**: esbuild bundle means zero runtime npm dependency resolution for end users.
- **Comprehensive test coverage**: 55 test files covering install, uninstall, compliance, and hooks.
- **Config cascade is documented and single-sourced** (within `cli/lib/config.cjs`).
- **Hooks are stdlib-only**: `.rcode/bin/rcode-hooks.cjs` has no external dependencies, making it reliable across environments.

## Recommendations

1. **Split `cli/install.js`** into logical modules: `install-detect-ide.js`, `install-copy-assets.js`, `install-config.js`, `install-validate.js`. No functional changes needed — just file boundaries.
2. **Add `dist/rcode.js` to `.gitignore`** and generate it in CI before publish. Use `prepack` (already wired) to generate on `npm publish`. Eliminates 839 KB binary diffs from PRs.
3. **Unify config parsers**: extract the YAML-reading logic into `rcode/bin/lib/config.cjs` and have `cli/lib/config.cjs` delegate or re-export it. One parser, one test surface.
4. **Automate `sync-bin.sh`** via a git pre-commit hook or a `prepare` script so source↔runtime drift is impossible without a manual override.
5. **Remove `"main": "cli/index.js"`** from `package.json` or replace it with an explicit `"exports": null` to prevent accidental library-style consumption.
