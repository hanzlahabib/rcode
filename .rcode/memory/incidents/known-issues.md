# Known Issues — `rcode`

Active bugs and workarounds. Searchable so an agent doesn't waste cycles re-debugging an already-known issue.

> **Add an entry when:** a workaround ships before the real fix, OR a bug is acknowledged but won't be fixed this sprint.
> **Remove an entry when:** the real fix lands and is verified in production.

---

## Format

```
### Issue title

- **Symptom:** what users see
- **Surface:** which area / file / route
- **Workaround:** what we do today
- **Real fix planned for:** milestone / phase / "out of scope"
- **First seen:** YYYY-MM-DD
- **Tracking:** GitHub issue # / Linear ID
```

---

## Issues

### Leftover `rihal` references in installed surface (post v4.0 rename)

- **Symptom:** Fresh install of `@hanzlaa/rcode` still surfaces `rihal*` strings in workflows, agent dispatch logs, and a handful of skill bodies.
- **Surface:** `rcode/skills/**`, `rcode/workflows/**`, install-time templating
- **Workaround:** none yet — cosmetic, doesn't break functionality
- **Real fix planned for:** v4.0 hardening sprint (post-rename pass 2)
- **First seen:** 2026-05-22
- **Tracking:** #861

### 25+ skill workflows reference non-existent paths

- **Symptom:** Workflows `@`-include or `Read` paths that don't exist after the v4 rename or never existed
- **Surface:** `rcode/workflows/*.md`
- **Workaround:** spot-fix on touch; planner blocks if it encounters one
- **Real fix planned for:** v4.0 hardening sprint
- **First seen:** 2026-05-22
- **Tracking:** #860

### `rcode-codebase-mapper` agent stalls at 600s with no output

- **Symptom:** Mapper agent times out without producing the codebase analysis document
- **Surface:** `rcode/skills/agents/rcode-codebase-mapper/`
- **Workaround:** rerun manually; check for huge node_modules globs that explode the scan
- **Real fix planned for:** triage in v4.0 hardening
- **First seen:** 2026-05-21
- **Tracking:** #859

### `roadmap list-phases` shows wrong phase as `in_progress`

- **Symptom:** CLI prints a phase as active when state.json says it's completed
- **Surface:** `.rcode/bin/lib/roadmap.cjs`
- **Workaround:** trust state.json; ignore CLI output until fixed
- **Real fix planned for:** v4.0.x patch
- **First seen:** 2026-05-21
- **Tracking:** #856

### `state set-phase` write inconsistency

- **Symptom:** `set-phase` (a) doesn't mark the previous phase as completed (#854) and (b) writes to the wrong file path under some configs (#855)
- **Surface:** `.rcode/bin/lib/config.cjs`, state helpers
- **Workaround:** manually edit `.rcode/state.json`
- **Real fix planned for:** v4.0.x patch
- **First seen:** 2026-05-21
- **Tracking:** #854, #855

### ts-node symlink creation fails during pnpm install

- **Symptom:** `pnpm install` on user repos fails to create the `ts-node` bin symlink
- **Surface:** install path / postinstall
- **Workaround:** recommend `pnpm dlx @hanzlaa/rcode install` (also avoids npm 11.x npx incompatibility per `3ba90fd`)
- **Real fix planned for:** investigate in v4.0 hardening
- **First seen:** 2026-05-20
- **Tracking:** #852

### Planner output quality drifts on complex stack hints

- **Symptom:** `rcode-planner` emits wrong TypeScript version pins (#842) and incorrect Drizzle migration format (#839)
- **Surface:** `rcode/skills/agents/rcode-planner/`
- **Workaround:** human-review the planner output before `/rcode-execute`
- **Real fix planned for:** v4.1 planner refresh
- **First seen:** 2026-05-15
- **Tracking:** #842, #839

### Workflow files exceed 500-line target

- **Symptom:** `wc -l rcode/workflows/*.md` shows several files >500 lines (`autonomous.md`, `complete-milestone.md`, `council.md`, `code-review.md`, `code-review-fix.md`)
- **Surface:** `rcode/workflows/*.md`
- **Workaround:** files run correctly; only line-count budget is breached.
- **Real fix planned for:** out of scope until a workflow runtime test scaffold exists
- **First seen:** 2026-04-26
- **Tracking:** TASKS.md "Phase 5 — Workflow file splits ⏭ skipped"

### `execute.md`'s code_review_gate spawns a non-existent agent type — FIXED

- **Symptom:** `execute.md`'s `code_review_gate` step spawned `subagent_type="rcode-code-reviewer"`, but the actual registry only has `rcode-reviewer` — the Task/Agent call failed with "Agent type not found" rather than falling back gracefully.
- **Surface:** `rcode/workflows/execute.md` (code_review_gate step), plus the same stray `rcode-code-reviewer` string in `code-review.md`, `code-review-fix.md`, and `lens-audit.md` (both `rcode/workflows/` and the mirrored `.rcode/workflows/` install).
- **Fix:** all `subagent_type="rcode-code-reviewer"` references (and matching prose) renamed to `rcode-reviewer` across both trees.
- **First seen:** 2026-08-06
- **Tracking:** #1011

### `rcode-verifier` output schema drifts from `status: passed`, and `phase complete` doesn't always persist ROADMAP.md text

- **Symptom:** (a) A `rcode-verifier` run wrote `46-VERIFICATION.md` with `result: PASS` instead of this repo's established `status: passed` frontmatter key (compare `44-VERIFICATION.md`/`45-VERIFICATION.md`), which silently fails `execute.md`'s `uat_gate` grep (`^status:[[:space:]]*passed`) and would strand the phase at `status: executed` forever without a human noticing the schema mismatch. (b) Separately, `node rcode-tools.cjs phase complete` and `roadmap update-plan-progress` correctly updated `.rcode/state.json`/STATE.md to `status: complete`, but left the ROADMAP.md phase block's prose text as `**Status:** Planned` / `**Plans:** - _TBD_` — `update-plan-progress` even returned `"updated": false` while reporting the correct computed status.
- **Surface:** `rcode-verifier` agent output (VERIFICATION.md template drift), `.rcode/bin/lib/roadmap.cjs` (`phase complete` / `update-plan-progress`)
- **Workaround:** hand-correct the VERIFICATION.md frontmatter key before the uat_gate check; hand-correct ROADMAP.md's Status/Plans text after `phase complete` reports success.
- **Real fix planned for:** out of scope — pin rcode-verifier's output template, and fix `update-plan-progress`'s "updated": false no-op path
- **First seen:** 2026-08-06
- **Tracking:** discovered during Phase 46 (#1003) execution, not yet filed
