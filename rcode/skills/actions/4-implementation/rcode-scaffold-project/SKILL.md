---
name: rcode-scaffold-project
internal: true
description: >
  Scaffold a new project for rcode users using the official rcode template repo,
  or initialize rcode in an existing project (brownfield / --here mode).
  Activates when the user says "scaffold project", "create project", "new project",
  "initialize project", "setup new project", "scaffold from template", "create from template",
  "rcode new project", "start a new rcode project", "scaffold here", "use here",
  "scaffold in this project", or "initialize rcode here". Do NOT use for generating
  project context files (use rcode-generate-project-context) or cloning websites
  (use rcode-clone-website).
triggers:
  - "scaffold project"
  - "create project"
  - "new project"
  - "initialize project"
  - "setup new project"
  - "scaffold from template"
  - "create from template"
  - "rcode new project"
  - "start a new rcode project"
  - "scaffold here"
  - "scaffold --here"
  - "use current directory"
  - "scaffold in this project"
  - "initialize rcode here"
  - "add rcode to existing project"
user-invocable: true
---
@.rcode/references/karpathy-guidelines.md


## Workflow


# Scaffold Project from rcode Template

## Overview

This skill operates in two modes:

**Greenfield mode (default):** Bootstraps a new rcode project by cloning the
official rcode template (`https://github.com/rcode-om/template`) into a target
directory. Always clones fresh from GitHub.

**Brownfield mode (`--here`):** Initializes rcode in an *existing* project
without cloning the template. Use this when your codebase already exists and
you just want to add rcode structure to it. Invoke as:
`/rcode-scaffold-project --here` or just say "scaffold here" / "add rcode to
this existing project".

The workflow enforces safety: it never overwrites an existing non-empty directory
without explicit user consent (greenfield), and never modifies existing project
files in brownfield mode.

## On Activation

Load config from `{project-root}/.rcode/config.json` and resolve:
- `{user_name}` for greeting
- `{communication_language}` for all agent communication

Greet the user as `{user_name}` in `{communication_language}`.

Then proceed to `./steps/step-01-target.md`.

## Stages

| # | Stage | Purpose | File |
|---|-------|---------|------|
| 1 | Target Directory | Get + validate destination path; detect `--here` flag | `steps/step-01-target.md` |
| 2 | Safety Check | Verify folder is empty or get new path (greenfield); brownfield consent (brownfield) | `steps/step-02-safety.md` |
| 3a | Clone | Clone template repo fresh from GitHub *(greenfield only)* | `steps/step-03-clone.md` |
| 3b | Brownfield Init | Overlay rcode structure into existing project *(brownfield only)* | `steps/step-03-brownfield.md` |
| 4 | Post-Setup | Rename, init git, suggest next steps | `steps/step-04-post-setup.md` |

## Post-Clone Checklist (Greenfield)

After cloning the template and before handing off to the user, run these steps in order:

### 1. pnpm-first — Install Dependencies with pnpm

**Never use `npm install`.** Always install with pnpm:

```bash
corepack enable pnpm   # ensure pnpm is available via corepack
pnpm install           # install all dependencies
```

If `package.json` contains a `packageManager` field, verify it is set to a `pnpm@x.y.z` string. If it is missing or set to `npm`, update it to `pnpm` before installing.

### 2. Node.js 20+ Verification

Check `.nvmrc` (if present) and the `engines.node` field in `package.json`. If either targets Node 16 or Node 18, update to `>=20.0.0`:

- `.nvmrc`: change content to `20`
- `package.json` `engines.node`: change `>=16.0.0` or `>=18.0.0` to `>=20.0.0`

Report the result to the user: "Node target verified: 20+" or "Node target updated from X to 20+".

### 3. Modern Dependency Check

Scan the scaffolded `package.json` for known deprecated packages and flag them to the user:

| Found | Suggestion |
|-------|-----------|
| `moment` | Replace with `date-fns` (tree-shakeable, no-timezone footgun) |
| `axios` | Native `fetch` is available in Node 18+; only keep `axios` if fetch polyfill is needed |
| `request` | Unmaintained — use native `fetch` or `undici` |

Do **not** auto-remove these; surface the finding and let the user decide.

### 4. rcode Config Scaffold

After cloning, create `.rcode/config.yaml` with starter content if it does not already exist:

```yaml
project_name: "{PROJECT_NAME}"
current_phase: 1
```

Replace `{PROJECT_NAME}` with the actual project name supplied by the user. Do not overwrite an existing `.rcode/config.yaml`.

## Design Decisions

- **Always clone fresh** — never cache template locally. Template updates are free.
- **No local template copy** — single source of truth is `https://github.com/rcode-om/template`.
- **Safety first** — never touch a non-empty directory without user approval.
- **Brownfield never overwrites** — in `--here` mode, existing files are never modified.
- **Minimal assumptions** — ask before acting on any ambiguity.
- **pnpm always** — never use npm or yarn for installs; always use pnpm via corepack.

### Safety Check: What "non-empty" means

A directory is considered **non-empty** (and therefore protected) if it contains **any files or directories other than**:
- `.git/` (git metadata only)
- `README.md` (bare readme with no project code)

Everything else — including `package.json`, `src/`, `.rcode/`, `node_modules/`, dotfiles like `.env` — counts as content. If any such file is present, the safety check triggers and the user must explicitly consent before the skill proceeds.

## Output Format

- New project directory scaffolded at the specified path
- Fresh git history (template history stripped, new `git init` applied)
- `.rcode/config.yaml` initialized with project name and current phase
- Dependencies installed via `pnpm install`
- Node.js target verified or updated to 20+
- Deprecated dependency findings reported (if any)
- Console summary: path created, files scaffolded, next steps

## Examples

### Happy Path
**Input:** "scaffold a new project called my-app"
**Expected:** Ask for target path (default: `./my-app`), verify empty, clone template, strip git history, init fresh repo, summarize.

### Edge Case: Non-empty Directory
**Input:** Target directory already has files
**Expected:** "This folder isn't empty. Should I create a new folder `my-app-1` instead, or would you like to empty it first? (I won't delete anything without your go-ahead.)"

### Edge Case: No Name Given
**Input:** "scaffold project"
**Expected:** Ask for project name before proceeding.

### Happy Path — Brownfield (--here)
**Input:** "/rcode-scaffold-project --here" or "add rcode to this existing project"
**Expected:** Detect brownfield mode, use current directory, ask for consent, overlay
`.rcode/` structure only, never touch existing files, summarize what was added.

### Edge Case — Brownfield, .rcode already exists
**Input:** `--here` flag but `.rcode/` already present in current dir
**Expected:** "rcode is already initialized here. Run `/rcode-init` to reconfigure."

### Negative Test
**Input:** "scaffold my existing repo" (existing non-empty dir provided, no --here flag)
**Expected:** Safety check triggers. Never overwrites. Offers alternatives including
"Use `--here` mode to add rcode to this existing project instead".
