---
lens: 6
name: error-recovery
round: 2
date: 2026-05-25
status: WARN
prior_audit: none (first lens-6 run)
---

# Lens 6 — Error Recovery: Round-2 Audit

## Scope Scanned

| Area | Files |
|------|-------|
| `rcode/workflows/` | All `*.md` — embedded shell and workflow prose |
| `rcode/bin/rcode-tools.cjs` | 7 366 lines — primary Node.js tool |
| `rcode/bin/rcode-hooks.cjs` | Hooks harness |
| `rcode/bin/lib/*.cjs` | `verify`, `code-references`, `config`, `council-panel`, `roadmap` |
| `.rcode/workflows/` | Mirror install — spot-checked key files |

**Not in scope:** `rcode/skills/`, `rcode/agents/` (prose-only), `rcode/references/` (doc files).

## Commands Run

```bash
grep -rn '\$(' rcode/workflows/ --include="*.md" | grep -v '2>/dev/null'
grep -rn -E 'INIT=\$\(node' rcode/workflows/ --include="*.md" | grep -v '2>/dev/null'
grep -rn -E 'AGENT_SKILLS[A-Z_]*=\$\(node[^)]+2>/dev/null\)$' rcode/workflows/ --include="*.md"
grep -rn -E 'Task\(|Agent\(' rcode/workflows/ --include="*.md"
grep -n -E '(JSON\.parse|try \{|catch|\.catch\()' rcode/bin/rcode-tools.cjs
grep -n 'catch {' rcode/bin/rcode-tools.cjs
# Per-file .ok checks: grep -n -E '(if.*INIT|INIT.*ok|\.ok|error.*exit)' <file>
```

---

## Findings

### A. `INIT=` assignments — missing `2>/dev/null` AND missing `.ok` check

21 workflows call `INIT=$(node .rcode/bin/rcode-tools.cjs init ...)` without redirecting
stderr. If the node process fails (missing binary, bad state), node's stack trace bleeds
directly to the user's terminal and `INIT` is silently empty. Six of those 21 also have no
downstream `.ok` validation — the workflow proceeds as if init succeeded.

| File:Line | Description | Severity |
|-----------|-------------|----------|
| `rcode/workflows/review-edge-case-hunter.md:31` | `INIT=$(node ... init review-edge-case-hunter "$ARGUMENTS")` — no `2>/dev/null`, no `.ok` check | **warn** |
| `rcode/workflows/correct-course.md:32` | `INIT=$(node ... init correct-course "$ARGUMENTS")` — no `2>/dev/null`, no `.ok` check | **warn** |
| `rcode/workflows/chain.md:48` | `INIT=$(node ... init chain "$ARGUMENTS")` — no `2>/dev/null`, no `.ok` check | **warn** |
| `rcode/workflows/review-adversarial.md:33` | `INIT=$(node ... init review-adversarial "$ARGUMENTS")` — no `2>/dev/null`, no `.ok` check | **warn** |
| `rcode/workflows/document-project.md:31` | `INIT=$(node ... init document-project "$ARGUMENTS")` — no `2>/dev/null`, no `.ok` check | **warn** |
| `rcode/workflows/profile-user.md:31` | `INIT=$(node ... init profile-user "$ARGUMENTS")` — no `2>/dev/null`, no `.ok` check | **warn** |
| `rcode/workflows/ui-review.md:31` | `INIT=$(node ... init ui-review "$ARGUMENTS")` — no `2>/dev/null`, no `.ok` check | **warn** |
| `rcode/workflows/ui-phase.md:31` | `INIT=$(node ... init ui-phase "$ARGUMENTS")` — no `2>/dev/null`, no `.ok` check | **warn** |

**Note:** Several other INIT= lines without `2>/dev/null` do have `@file:*` path expansion
(`if [[ "$INIT" == @file:* ]]; then INIT=$(cat ...); fi`) but that handles large output, not failures.
Only the files above lack any `.ok` gate. Files with explicit `.ok` checks (even without `2>/dev/null`):
`execute.md:207`, `review.md:74`, `code-review-fix.md:40`, `add-phase.md:32`, `add-tests.md:37`,
`validate-phase.md:20`, `karpathy-audit.md:39`, `execute-sprint.md:24`.

**Fix pattern:**
```bash
INIT=$(node ".rcode/bin/rcode-tools.cjs" init <cmd> "$ARGUMENTS" 2>/dev/null || echo '{"ok":false,"error":"init_failed"}')
# then check:
# If INIT.ok is false: print error and exit.
```

---

### B. `$(git ...)` calls — missing `2>/dev/null`, high-impact contexts

| File:Line | Description | Severity |
|-----------|-------------|----------|
| `rcode/workflows/execute-waves.md:72` | `EXPECTED_BASE=$(git rev-parse HEAD)` — no `2>/dev/null`; if git fails in a detached/corrupt state, `EXPECTED_BASE` is empty and the subsequent merge-base check (`git merge-base HEAD {EXPECTED_BASE}`) runs with a literal empty string | **critical** |
| `rcode/workflows/execute-waves.md:116-117` | `ACTUAL_BASE=$(git merge-base HEAD {EXPECTED_BASE})` / `CURRENT_HEAD=$(git rev-parse HEAD)` — template placeholders; same risk as line 72 if EXPECTED_BASE is empty | **critical** |
| `rcode/workflows/pr-branch.md:55` | `FILES=$(git diff-tree --no-commit-id --name-only -r $HASH)` — `$HASH` unquoted (word-split risk); no `2>/dev/null`; empty FILES silently classifies commit as "planning-only" and excludes it from PR branch | **warn** |
| `rcode/workflows/execute-waves.md:254` | `COMMITS_FOUND=$(git log --oneline --all --grep="{phase_number}-{plan_padded}" --since="1 hour ago" \| head -1)` — no `2>/dev/null`; template phase number could be empty → git error leaks | **warn** |
| `rcode/workflows/pr-branch.md:15` | `CURRENT_BRANCH=$(git branch --show-current)` — no `2>/dev/null`; acceptable in normal repo but fails silently in detached HEAD | **info** |
| `rcode/workflows/pause-work.md:105` | `GIT_STATUS=$(git status --short)` — no `2>/dev/null`; git status rarely fails in a valid repo | **info** |

---

### C. `$(node ...)` with `2>/dev/null` but no `||` fallback — silent empty value

These assignments suppress stderr (good) but produce an empty string on failure with no
`|| echo fallback`. Downstream code interpolates `${AGENT_SKILLS}` into Task() prompts
silently without skill context, which degrades agent quality without any warning to the user.

| File:Line | Description | Severity |
|-----------|-------------|----------|
| `rcode/workflows/execute.md:209` | `AGENT_SKILLS=$(node ... agent-skills rcode-executor 2>/dev/null)` — empty if node fails; executor spawned without skill injection | **warn** |
| `rcode/workflows/verify-work.md:52-53` | `AGENT_SKILLS_PLANNER` / `AGENT_SKILLS_CHECKER` with `2>/dev/null` only | **warn** |
| `rcode/workflows/plan.md:74-76` | Three AGENT_SKILLS vars with `2>/dev/null` only | **warn** |
| `rcode/workflows/execute-verify-phase-goal.md:9` | `VERIFIER_SKILLS=$(node ... 2>/dev/null)` — verifier spawned without skills if fails | **warn** |
| `rcode/workflows/plan-research-validation.md:195` | `PHASE_SECTION=$(node ... roadmap get-phase "${PHASE}" 2>/dev/null)` — empty on failure; subsequent `grep` on empty silently returns "no UI" | **warn** |
| `rcode/workflows/plan-research-validation.md:259` | Same pattern, second call | **warn** |
| `rcode/workflows/debug.md:108` | `AGENT_SKILLS_DEBUGGER=$(node ... 2>/dev/null)` — debug agents spawned without skills | **info** |
| `rcode/workflows/research-phase.md:47` | `AGENT_SKILLS_RESEARCHER=$(node ... 2>/dev/null)` | **info** |
| `rcode/workflows/map-codebase.md:93` | `AGENT_SKILLS_MAPPER=$(node ... 2>/dev/null)` | **info** |

**Fix pattern:** `|| echo ''` is already an implicit fallback for empty; the real gap is missing
a non-silent path. Add: `|| { echo "[warn] agent-skills unavailable — continuing without skill context"; echo ''; }`.

---

### D. `RESULT=` assignments — inconsistent error contracts

| File:Line | Description | Severity |
|-----------|-------------|----------|
| `rcode/workflows/insert-phase.md:48` | `RESULT=$(node ... state insert-phase ...)` — no `2>/dev/null`; node stderr bleeds. Has downstream `if ok is false: exit` but node crash (non-zero exit) doesn't set `ok=false` — it sets `RESULT=""` | **warn** |
| `rcode/workflows/workstream.md:45` | `RESULT=$(node ... state workstream-validate ... 2>&1)` — captures stderr as value (will get mixed JSON+stack-trace string on crash); prose says "If validation fails, print error and STOP" but no explicit `.ok` JSON parse is described | **warn** |

---

### E. Task() subagent calls — failure branch coverage

| Workflow | Task() site | Failure branch? | Status |
|----------|-------------|-----------------|--------|
| `rcode/workflows/plan.md:564,684` | rcode-planner + rcode-sprint-checker | `## ISSUES FOUND` → loop; `Max iterations reached` → user prompt | **PASS** |
| `rcode/workflows/verify-work.md:503,554,597` | verifier / planner / checker | "If any fail: route to `/rcode-plan --gaps`" (line 16) | **PASS** |
| `rcode/workflows/code-review.md:391` | rcode-code-reviewer | Explicit: line 427 "If the Task() call fails (agent error, timeout, or exception): display non-blocking error, proceed" | **PASS** |
| `rcode/workflows/new-project-roadmap.md:178,275` | rcode-roadmapper | `## ROADMAP BLOCKED` → user prompt; retry loop | **PASS** |
| `rcode/workflows/autonomous.md:435,458` | rcode-planner + rcode-sprint-checker | `handle_blocker` step with 3 options | **PASS** |
| `rcode/workflows/debug.md:116` | rcode-debugger (implied) | No explicit failure branch documented | **warn** |

---

### F. Bare `catch {}` in `rcode/bin/rcode-tools.cjs` — silent swallow inventory

Most are intentional. The following are **acceptable** with implicit rationale:

| Line(s) | Context | Assessment |
|---------|---------|------------|
| 71 | Startup diagnostic — comment: `/* never crash startup on diagnostic logic */` | intentional |
| 143, 165 | Optional config read — returns `{}` / `null` fallback | intentional |
| 447, 485 | Parser failure in init — comment: `/* parser failure shouldn't break init */` | intentional |
| 1013, 1034, 1054 | `process.kill(pid, 0)` signal-check — catch = "process dead" | intentional |
| 1070, 1084 | `fs.unlinkSync(lockPath)` — cleanup, ignore if already gone | intentional |
| 1135, 1198, 1215 | Fallback to basename when path parse fails | intentional |
| 3963 | `git ls-files --error-unmatch` — catch = "file not tracked" | intentional |
| 5988 | `fs.rmSync` tmp dir cleanup | intentional |

The following deserve **attention**:

| File:Line | Description | Severity |
|-----------|-------------|----------|
| `rcode/bin/rcode-tools.cjs:3697` | `} catch {}` inside phase-dir parsing loop — silently skips any directory whose `number` field fails `parseInt`; caller gets wrong `maxNum` and may number new phases incorrectly | **warn** |
| `rcode/bin/rcode-tools.cjs:3758` | `try { state = JSON.parse(...) } catch {}` — silently returns `{ phases: [] }` if STATE.json is corrupt; caller never knows state was lost | **warn** |
| `rcode/bin/rcode-hooks.cjs:163` | `} catch {}` — commit-msg read failure swallowed; hook produces incomplete commit message without surfacing the read error | **warn** |
| `rcode/bin/rcode-hooks.cjs:393` | `} catch {}` in phase-dir lookup during hook context — silently misses phase context for HANDOFF | **info** |
| `rcode/bin/rcode-tools.cjs:5666,5680,5691` | Handoff write/read — bare `catch {}` on `writeFileSync` and `JSON.parse`; handoff token silently lost; caller receives `{ found: false }` with no warning | **warn** |

---

### G. Promise rejections — top-level coverage

| File | Pattern | Status |
|------|---------|--------|
| `rcode/bin/rcode-tools.cjs:7362` | `main().catch((err) => { console.error(...); process.exit(1); })` | **PASS** |
| `rcode/bin/rcode-hooks.cjs:708` | `main().catch((err) => { console.error(...); process.exit(1); })` | **PASS** |

No `.then()` chains without paired `.catch()` found. Async functions all use `await` inside
try/catch or top-level main() catch.

---

### H. `set -euo pipefail` — shell strictness

No workflow markdown declares `set -euo pipefail`. The embedded shell blocks are
pseudo-code instructions for an LLM agent to execute via the Bash tool — they are not
directly invoked as shell scripts, so strict-mode is not applicable. The reference in
`rcode/workflows/lens-audit.md:326` is descriptive context for the lens, not a violation.

**Status: N/A** (not a shell-script codebase at workflow layer).

---

## Verification Notes

- All `AGENT_SKILLS_*` vars with `2>/dev/null` produce empty string on failure — this is
  a soft degradation (agent works without skill context) not a hard failure. Severity
  intentionally kept at warn/info.
- The `execute-waves.md` `EXPECTED_BASE` finding is critical because worktree agents
  use this SHA to validate their base commit; an empty `EXPECTED_BASE` causes the
  `git merge-base HEAD ""` call to fail, suppressed by `2>/dev/null || true` in the
  worktree prompt (line ~120), so the base-check silently passes when it shouldn't.
- `rcode-hooks.cjs` bare catches at 393/431 are in the HANDOFF enrichment path —
  failures degrade HANDOFF quality but do not break the commit hook chain.

---

## Summary Table

| Category | Critical | Warn | Info |
|----------|----------|------|------|
| INIT= missing 2>/dev/null + .ok check | 0 | 8 | 0 |
| Git $() in critical workflows | 2 | 2 | 2 |
| AGENT_SKILLS/RESULT silently empty | 0 | 6 | 3 |
| Task() missing failure branch | 0 | 1 | 0 |
| Bare catch swallowing state loss | 0 | 4 | 1 |
| Promise rejection coverage | 0 | 0 | 0 |
| **Total** | **2** | **21** | **6** |

## Status: WARN

Two critical findings in `execute-waves.md` (EXPECTED_BASE without error guard). No prior
lens-6 audit exists — all findings are new. No findings are carry-overs.

## Top Remediation Priority

1. **`execute-waves.md:72`** — add `2>/dev/null || { echo "ERROR: git rev-parse HEAD failed"; exit 1; }` before EXPECTED_BASE is used as a merge-base argument.
2. **`rcode/workflows/review-edge-case-hunter.md`, `correct-course.md`, `chain.md`, `review-adversarial.md`, `document-project.md`, `profile-user.md`, `ui-review.md`, `ui-phase.md`** — add `2>/dev/null || echo '{"ok":false}'` to INIT= and gate on `.ok`.
3. **`rcode-tools.cjs:3758`** — add a `console.error('[warn] STATE.json corrupt: ', e.message)` before returning `{ phases: [] }` so the corruption is visible in debug output.
4. **`pr-branch.md:55`** — quote `"$HASH"` and add `2>/dev/null`.
