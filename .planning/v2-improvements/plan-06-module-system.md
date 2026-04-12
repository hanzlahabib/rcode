---
plan: "06"
title: Module system — installable capability bundles beyond core
priority: low
depends_on: ["01", "02", "03", "04", "05"]
estimated_effort: large
---

## Objective

Rihal v2 installs one monolithic `core` module. As the agent roster grows (executor, planner, new specialists), users shouldn't have to install everything. This plan introduces a lightweight module system where capabilities are grouped into installable bundles, and `/rihal:install <module>` adds them to an existing project.

## Context

- Current manifest: `manifest.yaml` has `modules: [core]` — this field exists but is unused
- `install-v2.js` currently copies everything unconditionally
- A module is a named bundle of: agents, workflows, commands, references, rihal-tools extensions
- Modules should be additive — installing a module never removes existing capabilities
- Do not over-engineer: no dependency resolver, no semver, no npm. Just YAML config + file copies.

## Proposed modules for v2

| Module | Contents | Installs |
|---|---|---|
| `core` | council agents (5), /rihal:council, /rihal:discuss, /rihal:status | Always installed |
| `execution` | rihal-executor, rihal-planner, /rihal:execute, /rihal:plan | Opt-in |
| `research` | Mariam (enhanced), research workflow extensions | Opt-in |

For now: define `core` and `execution`. `research` is a placeholder.

## Module manifest format

Each module is defined in `rihal/v2/modules/{name}.yaml`:

```yaml
# rihal/v2/modules/execution.yaml
name: execution
version: "1.0"
description: "Plan execution — write and run PLAN.md files with rihal-executor and rihal-planner"
requires: ["core"]  # modules that must be installed first
agents:
  - rihal-executor.md
  - rihal-planner.md
workflows:
  - execute.md
  - plan.md
commands:
  - execute.md
  - plan.md
references:
  - execution-protocol.md
rihal_tools_commands:
  - "init execute"
  - "state advance-plan"
  - "state record-execution"
  - "plan list"
  - "init plan"
```

## Tasks

### Task 1 — Define module YAML files
type: auto
**Steps:**
1. Create `rihal/v2/modules/core.yaml` — lists everything currently installed by install-v2.js under core:
   - Agents: all 5 council agents
   - Workflows: council.md, discuss.md, status.md
   - Commands: council.md, discuss.md, status.md
   - References: council-protocol.md, commit-conventions.md
   - rihal_tools_commands: init council, select-panel, classify-question, agent-info, list-agents, state record-council, state record-session, state read, init discuss, select-panel --top
2. Create `rihal/v2/modules/execution.yaml` — lists Plan 01 + Plan 03 outputs:
   - Agents: rihal-executor.md, rihal-planner.md
   - Workflows: execute.md, plan.md
   - Commands: execute.md, plan.md
   - References: execution-protocol.md
   - rihal_tools_commands: init execute, state advance-plan, state record-execution, init plan, plan list
3. Keep YAML files minimal — they are manifests, not documentation
**Done when:** both module YAML files exist and are internally consistent with what's installed
**Commit:** `feat(modules): add core and execution module manifests`

### Task 2 — Refactor install-v2.js to be module-aware
type: auto
**Steps:**
1. Read current `cli/install-v2.js` fully
2. Refactor the copy logic:
   - Instead of hardcoded copy lists, read `rihal/v2/modules/core.yaml`
   - Parse the YAML (using the same `parseSimpleYaml` helper or extend it for lists)
   - Build copy list dynamically from module YAML
   - Execute copies as before
3. On install, write installed modules to `manifest.yaml`:
   ```yaml
   modules:
     - core
   ```
4. Do NOT break existing behavior — a fresh install should produce identical results to before the refactor
5. Add a `--module <name>` flag to `install-v2.js` CLI: `node cli/install-v2.js --module execution` installs just that module
**Done when:** `node cli/install-v2.js` reads from `core.yaml` and produces the same files as before
**Commit:** `refactor(install): drive install-v2 from module YAML manifests`

### Task 3 — Add /rihal:install slash command
type: auto
**Steps:**
1. Create `rihal/v2/commands/install.md`:
   ```yaml
   ---
   name: rihal:install
   description: Install a Rihal module into the current project
   argument-hint: "<module-name>"
   allowed-tools: [Read, Bash]
   ---
   ```
2. Create `rihal/v2/workflows/install.md`:

   **Step 0:** Validate argument is a known module name (`core`, `execution`). If unknown: list available modules and exit.

   **Step 1:** Check `manifest.yaml` — is the module already installed? If yes: print "Module {name} already installed." and exit.

   **Step 2:** Check `requires` — are required modules installed? If not: print "Module {name} requires {dep} to be installed first. Run /rihal:install {dep}." and exit.

   **Step 3:** Run install:
   ```bash
   node $(npm root -g)/@hanzlahabib/rihal-code/cli/install-v2.js --module {module_name}
   ```
   Or if local dev: `node ./cli/install-v2.js --module {module_name}`
   Print: "Installing module: {name}..."

   **Step 4:** Update `manifest.yaml` — append module name to `modules:` list.

   **Step 5:** Print summary:
   ```
   ✅ Module installed: {name}
   Added {n} agents, {n} workflows, {n} commands

   New commands available:
   /rihal:execute — {description}
   /rihal:plan — {description}
   ```

3. Note: this workflow requires the rihal-code package to be accessible. Document the requirement.
4. Add to install-v2.js: copy `install.md` command and workflow as part of core install (so users can always run /rihal:install after initial setup)
**Done when:** workflow and command files exist
**Commit:** `feat(workflows): add /rihal:install module management command`

### Task 4 — Extend rihal-tools.cjs with module subcommands
type: auto
**Steps:**
1. Add `module list` — reads `rihal/v2/modules/*.yaml` from the package, prints available modules with names, descriptions, and installed status (cross-referenced with `.rihal/_config/manifest.yaml`)
2. Add `module installed` — reads manifest.yaml, returns `{ installed: ["core", "execution"] }`
3. Add `module check-requires <name>` — reads module YAML, checks `requires` against installed list, returns `{ ok: true }` or `{ ok: false, missing: ["core"] }`
**Done when:** all three subcommands work
**Commit:** `feat(cli): add module list/installed/check-requires to rihal-tools`

### Task 5 — Integration test: install execution module on a fresh project
type: checkpoint:human-verify
**What executor does:** Runs fresh install (core only), then `/rihal:install execution`, then checks installed files.
**Verify:**
- Before: `.claude/agents/rihal-executor.md` does not exist
- After `/rihal:install execution`: `.claude/agents/rihal-executor.md` exists
- After: `.claude/commands/rihal/execute.md` exists
- After: `manifest.yaml` contains `execution` in modules list
- After: `/rihal:execute` is accessible as a slash command
- Core commands (`/rihal:council`, `/rihal:status`) still work after module install

## Success criteria
- [ ] `core.yaml` and `execution.yaml` module manifests exist and are internally consistent
- [ ] `install-v2.js` reads from module YAML instead of hardcoded lists
- [ ] `node cli/install-v2.js --module execution` installs only the execution module files
- [ ] `/rihal:install execution` works end-to-end in an installed project
- [ ] `manifest.yaml` is updated after module install
- [ ] Installing a module a second time is a no-op (idempotent)
- [ ] Installing a module whose `requires` are not met prints a clear error
