# Audit: Multi-Project Workflow

**Lens:** multi-project
**Date:** 2026-09-16
**Auditor:** WF-multi-project (parallel auditor, diagnose-only)

---

## Verdict

The multi-project story in rcode is **phantom architecture**. The documented experience — isolated workspaces, cross-project workstream switching, dashboard with project tabs — does not exist as working code. One narrow feature is real: cross-project decision mirroring to `~/.rcode/decisions.jsonl`. Everything else is either silently broken, unimplemented, or a no-op. A user who installs rcode into 15 repos today has exactly the same experience as a user who installs it into 1 repo: zero isolation, zero switching, zero cross-project visibility. The guard meant to prevent write operations from targeting the wrong project contains a `ReferenceError` that is silently swallowed, making it inert. The `--workspace` flag exists in a reference document but has never been wired to any CLI command. `workstream-switch` writes a field in state.json and changes nothing about which planning directory the agent operates on.

**Risk level: HIGH.** Any user following the documented multi-project workflow will silently operate on the wrong project's state.

---

## The User's Actual Experience

A lead engineer manages 15 microservices. They install rcode into each repo, read the docs on workstreams and workspaces, and attempt the advertised workflow.

**What they try and what actually happens:**

1. `/rcode-new-workspace "Billing Rewrite"` — The workflow runs. It calls `mkdir -p .rcode/workspaces/billing-rewrite` and writes to `.rcode/workspaces.csv`. But this entire creation flow exists only as a markdown workflow file (`rcode/workflows/new-workspace.md`) that is never invoked by any CLI command. The filesystem changes described in the workflow do not happen because there is no CLI handler behind them. The user gets no workspace directory, no registry entry, and no error — the skill simply narrates a plan and stops.

2. `/rcode-list-workspaces` — Reads `.rcode/workspaces.csv`. The file does not exist. Output: "No workspaces defined yet." This is technically accurate but the cause is invisible to the user.

3. `node .rcode/bin/rcode-tools.cjs state workstream-create --name "billing"` — This works. The workstream appears in `state.json`. The user switches context with `workstream-switch --name billing`. The `active_workstream` field in state.json is updated. The agent now... uses the same `.planning/phases/` directory as before. `workstream-switch` (`rcode/bin/lib/state-workstreams.cjs:93-107`) does nothing except flip a field in state.json. The plan/execute workflows never read `active_workstream` to redirect to a different phase directory.

4. The user opens another terminal in a different repo. Both terminals run rcode. Because `assertCwdMatchesProjectRoot()` (`rcode/bin/rcode-tools.cjs:57-75`) is silently broken, if either terminal accidentally invokes rcode from the wrong CWD, writes go to the wrong `state.json` with no warning.

5. The user opens the dashboard (`node server/dashboard.js`). They see one project. There is no UI to add, switch to, or compare other repos. `RCODE_DIR` is `path.join(process.cwd(), '.rcode')` — hardcoded to the process's CWD at startup. Multi-project dashboard view does not exist.

The **one thing that works**: decisions made in any project are appended to `~/.rcode/decisions.jsonl` with `project_root` and project name. If the user inspects that file manually, they can see cross-project decision history. No tooling surfaces this to the user inside rcode.

---

## Leaks

### LEAK 1 — Cross-project pollution guard is a dead letter
**File:** `rcode/bin/rcode-tools.cjs:57-75`
**Severity:** Critical

`assertCwdMatchesProjectRoot()` is the only protection against writing to the wrong project's state.json when multiple rcode repos are open. It is silently non-functional:

```js
// line 60 — variable declared as cwdrcode (lowercase r)
const cwdrcode = path.join(cwd, '.rcode');
// ...
// line 68 — variable used as cwdRcode (camelCase R) — UNDEFINED
process.stderr.write(`...node "${cwdRcode}/bin/rcode-tools.cjs" <args>\n`);
process.exit(2);   // never reached
```

The `ReferenceError` thrown at line 68 is swallowed by `catch {}` on line 70. `process.exit(2)` never runs. Every write subcommand in `main()` calls this guard at startup (`rcode/bin/rcode-tools.cjs:3827`), but all calls are silently no-ops. A user who `cd`s to the wrong repo and runs any write command (plan, execute, state write) will corrupt a different project's state without any warning.

**Exact fix required:** rename `cwdRcode` → `cwdrcode` on the `process.stderr.write` line.

---

### LEAK 2 — `--workspace` flag is documented but has zero implementation
**Files:** `rcode/references/workstream-flag.md`, `rcode/workflows/plan.md`, `rcode/workflows/execute.md`, `rcode/bin/rcode-tools.cjs`
**Severity:** Critical

`rcode/references/workstream-flag.md` documents that `/rcode-plan`, `/rcode-execute`, and related commands accept a `--workspace=<name>` flag to scope operations to a named workspace. Grep across all three files returns **zero matches** for `--workspace` or `workspace.*flag`. The flag is not parsed, not passed, and not acted upon. Users who follow the reference docs and type `/rcode-plan 5 --workspace=billing` are running a plan command with an unrecognized flag that is silently ignored — the plan is created in the default workspace with no indication that the workspace scoping failed.

---

### LEAK 3 — `workstream-switch` is a metadata-only no-op
**File:** `rcode/bin/lib/state-workstreams.cjs:93-107`
**Severity:** Critical

```js
// workstream-switch writes ONE field in state.json and returns
state.workstreams.forEach((w) => { w.active = w.name === name; });
state.active_workstream = name;
return writeState(state);
```

The plan/execute workflows read `SNAPSHOT.current_phase` and walk `.planning/phases/`. Neither reads `active_workstream`. There is no fork in any workflow that says "if `active_workstream` is set, use a different phase directory." Switching workstreams has the same effect as changing a config file that nothing reads: the state changes, the behavior does not.

---

### LEAK 4 — Workspace filesystem infrastructure is entirely absent
**Files:** `rcode/workflows/new-workspace.md`, `rcode/workflows/list-workspaces.md`
**Severity:** High

`new-workspace.md` describes creating `.rcode/workspaces/<name>/planning/`, `.rcode/workspaces/<name>/phases/`, `.rcode/workspaces/<name>/artifacts/`, `.rcode/workspaces.csv`, and `.rcode/workspaces/<name>/.workspace-meta.json`. None of this is backed by a CLI command. The workflow is a markdown description of behavior that doesn't exist. `list-workspaces.md` faithfully checks `.rcode/workspaces.csv` — which never gets created — and correctly reports "No workspaces defined yet." The user sees this as misconfiguration when it is actually an unimplemented feature.

---

### LEAK 5 — Dashboard is single-project by construction
**File:** `server/dashboard.js:47-48`
**Severity:** Medium

```js
const RCODE_DIR = process.env.RCODE_DIR || path.join(process.cwd(), '.rcode');
const PROJECT_ROOT = path.dirname(RCODE_DIR);
```

The dashboard reads one project determined at process startup. There is no route, API endpoint, or UI element for multi-project views, project switching, or cross-repo comparison. The docs and README present rcode as a tool for managing multiple projects; the only visual interface is locked to one.

---

### LEAK 6 — Cross-project decisions log has no user-facing surface
**File:** `rcode/bin/lib/state-decisions.cjs:134-143`
**Severity:** Low (the feature works; the discoverability is the gap)

The one real multi-project feature — mirroring every decision to `~/.rcode/decisions.jsonl` with `project_root` — is invisible in every user-facing command. `/rcode-status` does not mention it. The dashboard does not render it. No workflow reads it. It is a write-only log that a user would have to discover by reading source code. The value it could provide (cross-project decision audit, drift detection, project-to-project knowledge sharing) is entirely unrealized.

---

## Strengthenings

**S1 — Fix the typo before anything else.**
`cwdRcode` → `cwdrcode` in `rcode/bin/rcode-tools.cjs:68`. One character change. Restores the only protection that exists against cross-project writes. This is a P0 fix — everything else is moot if writes can silently target the wrong repo.

**S2 — Remove the `--workspace` flag from `workstream-flag.md` or implement it.**
A reference document that documents non-existent behavior is actively harmful. Either delete the flag documentation and file an issue for the real implementation, or implement the flag as a path prefix override in `plan.md` and `execute.md`. Half-measure: add a single guard at the top of the plan/execute workflows that checks for `--workspace` in `$ARGUMENTS` and prints "⚠ --workspace is not yet implemented; the flag was ignored" — this converts silent misbehavior into visible failure.

**S3 — Make `workstream-switch` redirect the phase directory.**
When `active_workstream` is set, plan/execute workflows should look for phases under `.planning/workstreams/<name>/phases/` instead of `.planning/phases/`. This is a two-line change in `progress init` and the phase-resolution path in `rcode-tools.cjs`. Without it, workstreams are a naming feature with no execution semantics.

**S4 — Wire `new-workspace` to a CLI command or remove it.**
If workspace isolation is desired, `rcode-tools.cjs` needs a `workspace-create` subcommand that actually writes the directories and CSV row. If it's not being implemented, the workflow files and the `workstream-flag.md` reference should be removed to prevent user confusion.

**S5 — Surface `~/.rcode/decisions.jsonl` in `/rcode-status`.**
A one-line addition: "N decisions logged across M projects." This transforms an invisible write-only artifact into a value signal. The data is already there; it just needs to be read.

---

## Kill Your Darlings

**Kill the workspace/workstream split.** rcode has two separate parallel-work concepts that use overlapping terminology: `workstreams` (state.json-based, `rcode/bin/lib/state-workstreams.cjs`) and `workspaces` (CSV-based, `rcode/workflows/new-workspace.md`). Neither works end-to-end. Together they create confusion about which concept a user should use and why they're different. If the goal is isolated parallel work, pick one concept, implement it properly, and delete the other. The workspace CSV approach is more flexible (actual directory isolation) but requires more implementation. The workstream state.json approach is already partially implemented but missing the execution routing. Merge them: one concept, one command, one state representation. The current split multiplies surface area while delivering zero multi-project value.

**Kill the `assertCwdMatchesProjectRoot` guard pattern.** The guard-as-protection approach is architecturally weak: it fires only when CWD already has a `.rcode/`, it exits the process rather than routing to the correct project, and one typo makes it useless for years. The better design is to make `RCODE_PROJECT_ROOT` a first-class concept: document it, set it from the session-start hook, and have every write command print "Writing to: /path/to/project/.rcode" so the user can see where writes are going. Visible routing beats invisible guards.
