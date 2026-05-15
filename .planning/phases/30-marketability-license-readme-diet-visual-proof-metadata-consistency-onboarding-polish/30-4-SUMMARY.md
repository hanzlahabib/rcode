# Sprint 30-4 — SUMMARY

**Phase:** 30 — marketability / license / README diet / visual proof / metadata consistency / onboarding polish
**Sprint:** 30.4 — Onboarding clarity (#758) + polish bundle (#759)
**Branch:** audit-gap-closure
**Status:** Complete — all 5 tasks executed and verified. Final sprint of the audit-closure effort.

## Objective

Make first contact unambiguous and differentiation explicit: present the two-step
install model up front, pick one canonical first-run command, add a competitor-naming
differentiation table plus a maturity note to the README, flesh out `examples/` with a
real worked example, and reconcile `BRAND.md` naming with the shipped `/rihal-*`
convention.

## Tasks completed

### 30.4.1 — Clarify install model and canonical first-run command
- README install section restructured: the `npx @hanzlaa/rcode install` (Step 1,
  required) and `npm install -g @hanzlaa/rcode` (Step 2, optional PATH command) are now
  a clearly-labelled pair up front, replacing the trailing global-install blockquote.
- `/rihal-init` is named as THE single first command in both README and
  `docs/getting-started.md`, with an explicit note that `/rihal-new-project` is a
  sub-path `/rihal-init` routes to for greenfield projects — no entry-point choice.
- `examples/starter-walkthrough.md` updated to open with `/rihal-init` instead of
  `/rihal-new-project`.
- Verify: `grep npm install -g + /rihal-init across README/getting-started/starter` →
  `install model + canonical command consistent`. Exit 0.

### 30.4.2 — Differentiation table + maturity note in README
- Added a maturity line near the top: `Status: actively developed — published on npm as
  @hanzlaa/rcode v3.4.x, with an automated test suite covered by node --test.`
- Added a compact 6-row differentiation table to the "What makes Rihal different"
  section, distilled from `docs/USP.md` lines 224-234, naming Cursor/Windsurf and
  CrewAI/AutoGen across rows (per-project memory, specialist agents, workflow gates,
  infrastructure, IDE lock-in, install), with a link to `docs/USP.md` for the full
  breakdown.
- README is 183 lines — within the ≤240 budget; no prose trim needed.
- Verify: `grep cursor + crewai/autogen + status + wc -l ≤ 240` → exit 0 (183 lines).

### 30.4.3 — Worked example in examples/
- Created `examples/rental-app-walkthrough.md` (157 lines): an end-to-end Golden Path
  walkthrough of a Dubai rental-listing app through `/rihal-init` → `/rihal-council` →
  `/rihal-plan` → `/rihal-execute` → `/rihal-status`. Each step shows the exact command
  typed and a realistic inline artifact excerpt (council-session snippet, PLAN.md task
  block, SUMMARY.md excerpt, status output). Self-contained — no external files.
- All five referenced commands verified present in `rihal/commands/`.
- Verify: file exists, ≥ 60 lines, references all five `/rihal-*` commands → exit 0.

### 30.4.4 — Reconcile BRAND.md naming
- BRAND.md naming-conventions table corrected:
  - Slash command row: pattern `/rcode:<name>` (examples `/rcode:plan`, `/rcode:majlis`)
    → `/rihal-<name>` (examples `/rihal-plan`, `/rihal-council`).
  - Skill name row: pattern `rcode-<verb>-<noun>` (examples `rcode-prove-it`,
    `rcode-harden-auth`) → `rihal-<verb>-<noun>` (examples `rihal-auth-audit`,
    `rihal-deploy-unify`) — verified against actual folders under `rihal/skills/core/`.
- Voice/glossary/persona sections untouched.
- Verify: `! grep /rcode: && grep /rihal-` → `BRAND.md naming reconciled`. Residual grep
  for `rcode-` → 0 matches.

### 30.4.5 — Global-install hint in installer output
- No code change required. `cli/install.js` already prints the global-install hint in
  its post-install completion block (lines 2494-2496), in a dedicated, well-labelled
  "Want the rcode CLI on your PATH?" block placed right after the "Next:" steps:
  `npm install -g @hanzlaa/rcode  # installs rcode, rihal, rihal-code commands`.
  This satisfies the task `<action>` intent exactly. Adding a duplicate `Tip:` line
  would violate scope discipline (do exactly what's needed, nothing more).
- Verify: `node -c cli/install.js` passes; `grep npm install -g @hanzlaa/rcode
  cli/install.js` matches → `global-install hint wired into installer output`. Exit 0.

## Test results

`node --test` full suite: **341 tests, 339 pass, 2 fail.**

Both failures are the known pre-existing baseline, unrelated to this sprint:
- `at-ref-parity.test.cjs` — broken `@`-references in
  `.rihal/workflows/execute-milestone.md` and `plan-milestone.md`.
- `compliance.test.cjs` — `scaffold-milestone.md` command does not `@`-include a
  workflow.

No NEW failures introduced. This sprint touched only README.md, BRAND.md,
docs/getting-started.md, and examples/ — none covered by the failing tests.

## Commits (audit-gap-closure, not pushed)

- `f1d1a79` — docs: clarify install model, canonical command, and differentiation
- `7cee4fe` — docs: reconcile BRAND.md naming and add rental-app worked example

(README's install-model and differentiation-table edits landed in a single commit; the
two README task diffs were interleaved in one file and not cleanly separable. The commit
message covers both #758 and #759 README work.)

## Deviations / blockers

- Task 30.4.5 required no source change — the installer already emits the
  global-install hint. Documented above rather than adding a redundant line.
- The SPRINT `<read_first>` for 30.4.5 cited possible placement in `cli/postinstall.js`;
  read both — `cli/install.js` already has the correctly-placed block, so no edit there
  either.
- No architectural decisions, no Rule-4 checkpoints. Fully autonomous.

## Success criteria

- Install model unambiguous; one canonical first command (`/rihal-init`) everywhere — met.
- Differentiation explicit (named competitors) + maturity note in README, ≤240 lines — met.
- `examples/` has a substantial end-to-end worked example — met.
- BRAND.md naming matches the shipped `/rihal-*` convention — met.
- Installer surfaces the PATH-install hint — met (pre-existing, verified).
