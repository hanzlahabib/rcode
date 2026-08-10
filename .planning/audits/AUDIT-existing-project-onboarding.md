# AUDIT — Existing-Project (Brownfield) Onboarding, A-to-Z Live Trace

**Date:** 2026-08-10
**Method:** Live measurement, not static review. A disposable scratch project (`/tmp/rcode-existing-project-test`, deleted after this trace) was created with a small but real pre-existing Node/Express codebase (6 source files: `package.json`, `README.md`, `.gitignore`, `src/server.js`, `src/routes/widgets.js`, `src/lib/db.js`, `src/lib/db.test.js` — 100 lines of real app code), committed to git as a baseline. The real installer (`node cli/install.js`) was run against it, then a genuine headless Claude Code session (`claude -p "/rcode-init"` and `claude -p "/rcode-scan ..."`, `--permission-mode bypassPermissions`) was used to execute the actual slash commands end-to-end — not a simulation of what they'd do. This exercises the **existing-new-rcode / "returning"** path, distinct from the earlier `AUDIT-golden-path.md` trace which used an empty scaffold and hit the fresh-init path.

---

## Step-by-step trace

| # | Step | Command | Wall time | What it actually did |
|---|---|---|---|---|
| 0 | Scratch project setup | (manual — wrote 6 files, `git init` + commit) | — | `acme-widgets-api`: Express app, one router (`widgets`), an in-memory `Map`-backed data module, one `node:test` unit test, a README describing 4 endpoints. Declares `better-sqlite3` as a dependency but never imports it (deliberately included as a realistic "planned but unused dep" trap). Committed as `43b6e31`. |
| 1 | Installer | `node cli/install.js /tmp/rcode-existing-project-test --yes --force --user hanzla --project acme-widgets-api` | 0.6s | 856 files installed: `.rcode/` (bin, workflows, references, skills, agents-rules, templates, brain, context, `_config`), `.claude/agents/` (45 agents), `.cursor/`, `.antigravity/` (experimental, project-local only — no global hook wiring per its own warning), `.planning/` with **install-stub** `PROJECT.md`/`ROADMAP.md`/`STATE.md` (each headed `<!-- INSTALL STUB — overwritten by /rcode-new-project -->`). `.rcode/config.yaml` and `.rcode/state.json` (`_seeded_stub: true`) written. `.gitignore` had an rcode-managed block appended (idempotent, correctly preserved the pre-existing `node_modules/`/`*.log`/`.env` lines). Pre-commit hook installed. No `CLAUDE.md`/`AGENTS.md` yet — those come from `/rcode-init`. |
| 2 | `/rcode-init` | `claude -p "/rcode-init" --permission-mode bypassPermissions` | **62.4s** wall (58.3s API, 13 turns, $0.607, ~827K cache tokens) | Detected `_seeded_stub: true` + no JOURNEY.md → took the **recovery path**, not a fresh-first-run path (self-reported result text: *"Setup recovery complete... rcode reconfigured baseline restored"*). Wrote `.rcode/JOURNEY.md`, `.rcode/context/active.md`, `.rcode/context/project-brief.md`, and root-level `CLAUDE.md` + `AGENTS.md` (identical content, 82 lines each). Recommended next step: **`/rcode-scan`**. Did NOT touch `.planning/PROJECT.md`/`ROADMAP.md`/`STATE.md` — those stayed as install stubs (see gap #4 below). |
| 3 | `/rcode-scan` (as literally recommended, no args) | `claude -p "/rcode-scan"` | 5.2s | **Did not scan.** Printed a usage/help message and asked the user to pick a `--focus`, despite documenting a `tech+arch` default in the same message. This is a real dead end for a user following init's own printed instruction verbatim (see gap #1). |
| 3b | `/rcode-scan --focus tech+arch` (manually supplying the documented default) | `claude -p "/rcode-scan --focus tech+arch"` | **103.7s** wall (9.25s reported API `duration_ms`, 2 turns, $0.774) | Spawned the "Dalil" scout persona, which read all 4 real source files + `package.json`/`README.md`/`.gitignore` and wrote 4 grounded documents to `.planning/codebase/`: `STACK.md` (38 lines), `INTEGRATIONS.md` (29 lines), `ARCHITECTURE.md` (57 lines), `STRUCTURE.md` (42 lines). |

**No #859-class stall observed.** The scan (which spawns `rcode-codebase-mapper`-adjacent tooling) completed in under two minutes on this small repo with no timeout, no silent hang, no missing output.

---

## Accuracy check: does the scan output match the real project?

Verified line-by-line against the actual files on disk. All four documents were accurate, well-grounded, and cited real file:line evidence:

- **STACK.md** correctly identified Express `^4.19.2`, CommonJS module system, `node:test`/`node:assert` as the (only) test tooling, `PORT` as the only env var, and — notably — flagged that `better-sqlite3` is declared in `package.json:13` but never imported anywhere in `src/`, cross-referencing the README's "sqlite planned" line. This was a deliberately planted trap in the scratch project and the scan caught it correctly with correct evidence citations.
- **ARCHITECTURE.md** correctly traced the 3-layer request flow (`server.js` → `routes/widgets.js` → `lib/db.js`), correctly identified the module-singleton `Map` pattern, correctly noted the absence of error-handling middleware and any auth/service/repository layers, with line-number citations that all check out (`src/server.js:1-2`, `src/routes/widgets.js:12`, `src/lib/db.js:1`, etc. all verified correct).
- **INTEGRATIONS.md** correctly reported zero external services/APIs, zero auth middleware, and repeated the `better-sqlite3`-declared-but-unused finding independently.
- **STRUCTURE.md** correctly rendered the actual 4-file directory tree, correctly noted the `node --test src/lib/*.test.js` glob is non-recursive (a real, correct, and non-obvious observation — a test file placed in `src/routes/` would silently not run).

No hallucinated files, no hallucinated dependencies, no stale/wrong line numbers found in a manual cross-check. This is a genuinely strong result — the scan reasoned about a real trap (the unused dependency) without being told to look for it.

---

## Concrete bugs/gaps found (not fixed — pure diagnosis per instructions)

1. **`/rcode-scan`, run exactly as `/rcode-init` recommends it (no arguments), does not scan.** `/rcode-init`'s own completion message tells the user to run `/rcode-scan` with no qualification. Doing exactly that produces a usage/help message that asks the user to choose `--focus`, even though the same message states the default is `tech+arch` if no preference is given — it does not actually apply that default and run. A first-time user following the tool's own printed next-step literally hits a stop, not a scan. (Confirmed live: step 3 above, 5.2s, zero files written, `is_error: false` — it "succeeded" at doing nothing.)

2. **`.planning/PROJECT.md`, `ROADMAP.md`, and `STATE.md` remain install stubs after both `/rcode-init` and `/rcode-scan --focus tech+arch` complete successfully on a real, non-trivial existing codebase.** All three still carry `<!-- INSTALL STUB — overwritten by /rcode-new-project -->` and placeholder text ("Describe what this project is in one sentence", "No phases yet") after the full existing-project onboarding sequence traced here. Despite `/rcode-scan` producing an accurate 4-document codebase analysis and `/rcode-init` producing an accurate JOURNEY.md/project-brief.md, none of that grounded content propagates into `PROJECT.md`/`ROADMAP.md`/`STATE.md` — the three files a user is most likely to open first to understand "what does rcode think this project is" are the three left completely blank/generic. A user reading `.planning/STATE.md` after this whole sequence still sees "Current phase: none — run /rcode-new-project or /rcode-add-phase" with no acknowledgment that `/rcode-init` + `/rcode-scan` already ran and already understand the project correctly.

3. **`/rcode-init` on an existing, non-empty, already-committed project takes the "recovery" path and reports "Setup recovery complete," language that reads as if something was broken and got fixed.** Nothing was broken — this is simply the correct first run of `/rcode-init` on a brownfield project (fresh install, real code already present, no prior rcode state). The wording ("reconfigured baseline restored") is confusing for what is actually the intended brownfield-onboarding flow, not an error-recovery flow. This matches — and is a second live confirmation of — the same "returning" vs. "fresh" state-detection wording issue implicitly present in `AUDIT-golden-path.md`'s step 1 finding (`state was 'returning' + JOURNEY missing → recovery path, not full first-run path`), now reproduced independently on a genuinely different, non-trivial codebase.

4. **`/rcode-init` costs 62 seconds and ~827K cached tokens ($0.61) to produce four short files** (JOURNEY.md 40 lines, active.md 20 lines, project-brief.md 20 lines, CLAUDE.md/AGENTS.md 82 lines each, effectively duplicated) on a 4-file, 100-line codebase. The `iterations`/turn count (13 turns) suggests multiple internal tool round-trips for a task that is fundamentally "read 6 files, write 5 short files."

5. **`.antigravity/` was installed by default with an explicit self-reported warning that it doesn't work project-locally** ("Antigravity /rcode-* slash commands need a GLOBAL install — re-run with `--global`. This project-local install does NOT wire the hook."). The installer still writes these non-functional files into every fresh project by default rather than skipping them until `--global` is used, adding dead weight to the initial file count (856 files) for functionality that is guaranteed inert as installed.

---

## What worked well

- The installer is fast (0.6s), idempotent-looking `.gitignore` merge, correctly preserved pre-existing `.gitignore` content, and printed an accurate, honest health check at the end (all 5 checks passed and were independently verified — `.rcode/config.yaml` present, `state.json` valid JSON, 45 agents, 38 skills + 117 commands).
- `/rcode-init`'s brownfield detection (language, framework, dependencies, recent commits) was 100% accurate against the real scratch project.
- `/rcode-scan --focus tech+arch` produced genuinely high-quality, well-cited, non-hallucinated analysis of a real codebase, including catching a subtle unused-dependency trap without being asked to look for it.
- No reproduction of the previously-tracked `rcode-codebase-mapper` 600s-stall issue (#859) — the scan completed in well under 2 minutes on this repo size.

---

## Cleanup

Scratch project `/tmp/rcode-existing-project-test` deleted after this trace was captured (`rm -rf`, outside the git repo, disposable). This document and the trace above are the only artifacts kept.
