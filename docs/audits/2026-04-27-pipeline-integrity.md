# Pipeline Integrity Audit — 2026-04-27

**Trigger:** Phase 96 execution-gaps memory file flagged 5 systemic bugs in the rcode plan→execute→verify pipeline. This audit broadens the search for the same patterns across the codebase and documents every finding.

**Outcome:** **9 GitHub issues filed (#440–#448).** 4 critical / blocker-class, 4 high, 1 medium. The pipeline is silently broken in ways that don't show up in the test suite because all 120 tests test rcode itself, not target projects.

**Source memory:** `~/.claude/projects/-home-hanzla-development-rcode/memory/project-phase96-execution-gaps.md`

---

## The 9 issues

| # | Severity | Title | Pattern |
|---|---|---|---|
| #440 | 🔴 Critical | rcode-sprint-checker tool names snake_case → silently malfunctions | Tool-name drift |
| #441 | 🟠 High | Planner writes `files_modified` without verifying file existence | Field drift |
| #442 | 🟠 High | Wave parallelism not validated — same depends_on, overlapping files | Rule unenforced |
| #443 | 🟠 High | Phase marked complete without UAT — verify-work is suggestion, not gate | Suggestion-only gate |
| #444 | 🟡 Medium | `.planning/` gitignore + `git add -f` constraint undocumented | Undocumented constraint |
| #445 | 🔴 Critical | **10 agents** use Gemini-style snake_case tool names (umbrella) | Tool-name drift, generalised |
| #446 | 🟠 High | execute.md tells parallel executors to use `git commit --no-verify` | AGENTS.md violation |
| #447 | 🟡 Medium | 9 legacy core skills missing `Memory Bank Hooks` section | Standards drift |
| #448 | 🟠 High | "Next Up" suggestions are not state-gated — phase advancement bypasses prerequisites | Suggestion-only gate, generalised |

---

## Pattern catalogue

The 9 issues collapse into 5 distinct anti-patterns. Future audits should look for these.

### 1. Tool-name drift (snake_case vs PascalCase)

**Symptom:** Agent declares tools using snake_case names (Gemini convention). Claude Code expects PascalCase. Tool calls silently rejected; agent narrates without invoking.

**Detection:**
```bash
grep -nE "^tools:.*[a-z]+_[a-z]" rcode/agents/*.md
```

**Affected:** 10 agents (#440 + #445).

**Fix:** Replace snake_case with PascalCase mapping:

| Snake | PascalCase |
|---|---|
| `read_file` | `Read` |
| `write_file` | `Write` |
| `run_shell_command` | `Bash` |
| `search_file_content` | `Grep` |
| `glob` | `Glob` |
| `google_web_search` | `WebSearch` |
| `web_fetch` | `WebFetch` |

**Prevention:** New compliance test `test/agents-tool-conventions.test.cjs` asserts every `rcode/agents/*.md` uses Claude Code naming. Run in CI.

### 2. Field drift (write fields without verification)

**Symptom:** Planner / executor writes structured fields (`files_modified`, `symbol_path`, etc.) populated from memory rather than verified against the actual file tree or AST.

**Detection:** look for fields that name external entities; check whether the workflow has a `find` / `grep` / `ls` step that proves they exist before commitment.

**Affected:** #441 (planner files_modified).

**Fix:** Mandatory pre-write validation step. For `files_modified`, run `find src/ -name "<candidate>"` for each entry and refuse to commit unresolved names.

**Prevention:** Add a sprint-checker BLOCKER rule: file-existence check on every `files_modified` entry. (Requires fixing #440 first so sprint-checker can actually invoke tools.)

### 3. Rule unenforced (declared but not checked)

**Symptom:** Workflow or agent prose states a rule ("no overlap → parallel; overlap → sequential") but no automation enforces it.

**Detection:** search for "MUST" / "SHOULD" / "never" rules; cross-reference against actual code paths.

**Affected:** #442 (wave parallelism rule).

**Fix:** Promote rules from prose to executable checks. Rule that cannot be enforced is rule that gets ignored.

**Prevention:** When writing a workflow rule, ask "what code path enforces it?" If none, the rule is theatrical.

### 4. Suggestion-only gates

**Symptom:** Workflow ends with a `Next Up` block recommending a verification step, but state.json is updated regardless of whether the user runs the recommended step. Autonomous mode happily skips the gate.

**Detection:**
```bash
grep -nE "Next Up|Suggest|Recommend" rcode/workflows/*.md
```

**Affected:** #443 (UAT gate), #448 (general pattern).

**Fix:** Use intermediate states: `status: executed` (work done) vs `status: complete` (work done AND verified). `/rcode-next` and autonomous mode advance only from `complete`. Verify-work and similar gates promote from `executed` → `complete`.

**Prevention:** Audit every workflow that writes a terminal state — does it actually verify the prerequisite gate ran?

### 5. Undocumented constraints

**Symptom:** Workflow has runtime constraints (`.planning/` gitignored, requires `git add -f`) that aren't documented anywhere agents would read them. Agents discover empirically.

**Detection:** grep for fragile patterns (`-f`, `--no-verify`, `chmod`, `sudo`) in workflows; cross-reference against `.rcode/context/active.md` template.

**Affected:** #444 (`.planning/` gitignore).

**Fix:** Document the constraint in `.rcode/context/active.md` so every executor session loads it as part of the standard context.

**Prevention:** Any new constraint added in a PR must include a doc update to `.rcode/context/active.md` (or equivalent always-loaded context).

### Bonus pattern — AGENTS.md violations

#446 is a different beast — workflow tells executors to do something AGENTS.md forbids (`--no-verify`). Two contradictory sources of truth.

**Detection:** grep for AGENTS.md prohibited patterns inside workflow files.

**Prevention:** add a CI check that scans `rcode/workflows/` for `--no-verify`, `git push --force`, and other forbidden patterns. Block PRs that introduce them.

---

## What didn't show up

Things I checked that came back clean:

- **Hardcoded skill paths in install.js** — none beyond the documented `rcode-` prefix logic
- **Cross-tab token leaks in dashboard** — Diwan is view-only, no auth tokens served
- **Shadowed agents in team.yaml** — `agents-registry.test.cjs` already gates this
- **Missing SKILL.md files** — `skills-compliance.test.cjs` already gates this

---

## Recommended fix order

1. **#445** (10-agent tool-name fix) — single bulk PR. Unblocks every other gate that depends on agent tools actually invoking. **Do this first.**
2. **#446** (`--no-verify` removal) — single workflow file. Enforce AGENTS.md.
3. **#440** (sprint-checker malfunction guard) — adds BLOCK behaviour when checker returns zero tool uses. Defence in depth on top of #445.
4. **#443 + #448** (state-gate UAT and verify-work) — paired structural change. New `status: executed` → `status: complete` transition.
5. **#441** (planner file-existence verification) — depends on #445 (sprint-checker working).
6. **#442** (wave parallelism overlap check) — depends on #441.
7. **#444** (`.planning/` gitignore docs) — small doc change.
8. **#447** (Memory Bank Hooks on legacy skills) — small doc change.

---

## Test gaps to close as part of this work

- `test/agents-tool-conventions.test.cjs` — assert every agent uses PascalCase tools (catches #445 regression)
- `test/skills-memory-hooks.test.cjs` — assert every SKILL.md has Memory Bank Hooks section (catches #447 regression)
- `test/workflows-no-verify.test.cjs` — assert no workflow contains `git commit --no-verify` (catches #446 regression)
- `test/workflows-state-gating.test.cjs` — assert every workflow that writes `status: complete` has a verifiable prerequisite (catches #443 / #448 regression)

These four tests would have caught all 9 issues before they shipped. Building them is part of the v3.1.0 patch release plan.

---

## Note on test suite scope

The current 120 tests cover:

- rcode source repo invariants (skills, agents, dashboard, memory templates)
- compliance and consistency checks
- end-to-end dashboard routes

They do NOT cover:

- agent runtime behaviour (whether agents actually invoke their declared tools)
- workflow runtime behaviour (whether `--no-verify` actually fires, whether `Next Up` is heeded)
- target-project integration (whether installed rcode behaves correctly in a downstream project)

The 9 issues here all fall in the second and third categories. Closing them requires expanding the test boundary — adding harness tests that simulate a target project and exercise rcode against it. That's tracked separately from the v3.1.0 fixes.
