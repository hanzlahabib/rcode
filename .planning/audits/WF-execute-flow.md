# Audit: execute-flow workflow (`/rcode-execute-phase` end to end)

**Lens:** execute-flow
**Files read:** `rcode/workflows/execute.md` (1110 lines), `rcode/workflows/execute-waves.md` (504 lines), `rcode/workflows/execute-verify-phase-goal.md` (224 lines), `rcode/workflows/execute-sprint.md` (746 lines), `rcode/workflows/execute-regression-gates.md`, `rcode/workflows/verify-phase.md` (460 lines), `.rcode/templates/summary.md`, `.rcode/templates/verification-report.md`, `.claude/agents/rcode-verifier.md`, `rcode/references/verifier-playbook.md`
**Date:** 2026-09-16

---

## Verdict

The execute-flow is structurally ambitious and largely correct: the falsification pass, the self-certification warning, the worktree-isolation merge protocol, and the fail-safe `verifier_failed` abort are all genuine strengths that few comparable tools have. However, the workflow has at least three silent-failure modes where the user sees `✓ Phase complete` for work that was never independently verified — the UAT gate checks only `status: passed` in VERIFICATION.md without requiring the `falsification: upheld` frontmatter key that the very same workflow mandates, the spot-check in execute-waves considers `SUMMARY.md exists` to be evidence of success when SUMMARY is written by the executor itself, and the VERIFICATION.md status-parsing grep can return `verifier_failed` when the verifier produced a valid file formatted exactly per the template. The workflow is solid, not broken — but these three leaks combine to mean the falsification pass (the most important safety net) can be silently skipped and the phase still reaches `COMPLETE ✓`.

---

## The user's actual experience

### Happy path

1. User types `/rcode-execute 12` (or `/rcode-execute-phase 12`). `rcode/commands/execute.md` (19 lines) loads `@.rcode/workflows/execute.md` — a one-liner entrypoint with no logic of its own.

2. **Pre-flight** (`execute.md:38-115`): branch checked (refuses `main` unless `branching_strategy: none` or `--on-main`), `init execute` called, phase-plan-index built, init JSON parsed. If the user has never seen the init JSON keys change (they did change in the Phase 47 bug batch), the documented keys they're reading in the workflow silently mismatch the real ones — but after the Phase 47 fix this is now correct.

3. **Three options** (`execute.md:145-265`): in yolo mode the workflow auto-picks option A (Autonomous). The user sees no menu. They don't choose their execution model. They might not realise they're in autonomous mode until the agents are already running.

4. **Wave dispatch** (`execute-waves.md`): the orchestrator classifies each plan by `classify-plan` (file-glob heuristic, fallback to objective keywords), selects the persona subagent (`rcode-hanzla`/`haitham`/`yousef`/`omar`/`executor`), builds wave batches, launches Task() calls with `run_in_background: true`. The user sees agent-presence on canvas if MagicPath is open; otherwise they see nothing until waves complete.

5. **Intra-wave overlap detection** (`execute-waves.md:step 2`): if two plans share `files_modified` entries, wave forces them sequential. This is correct. However, the `files_modified` field comes from SPRINT.md frontmatter, written by the planner. If the planner under-declared `files_modified` (e.g. the executor touches a file not listed), overlap is not detected and two agents can collide on the same file.

6. **Per-sprint execution** (`execute-sprint.md`): the executor builds the code, writes SUMMARY.md. SUMMARY.md is the executor's self-certification — it says what the agent believes it did.

7. **Spot-check** (`execute-waves.md:step 4.5`): after each wave the orchestrator checks `SUMMARY.md exists AND git commits found`. If both are true, the wave is marked successful. No content is checked. A SUMMARY.md saying "I tried but ran out of context" passes this gate.

8. **Code review gate** (`execute.md:code_review_gate`): `rcode-reviewer` spawned; blocks on `CRITICAL_COUNT > 0 OR HIGH_COUNT > 0`. Fail-safe: if REVIEW.md is missing or malformed, `CRITICAL_COUNT=1` by default, which correctly blocks. This gate genuinely catches structural problems.

9. **Verify commands** (`execute.md:run_verify_commands`): runs `<verify><automated>` blocks from SPRINT.md. These are shell commands the planner wrote — their quality depends entirely on the planner. The orchestrator runs them but cannot distinguish a well-constructed verify block from `echo "ok"`.

10. **Verify phase goal** (`execute-verify-phase-goal.md`): `rcode-verifier` spawned with must-haves and phase goal. Returns `*-VERIFICATION.md`. Status parsed by `grep "^status:"`.

11. **UAT gate** (`execute.md:uat_gate`): reads VERIFICATION.md status. If `passed`, phase goes to `COMPLETE ✓`. If anything else, phase lands at `status: executed`.

12. User sees banner: `✓ Phase 12: {Name} — COMPLETE` — or, if verification failed, `Phase 12 executed (not verified)`. The distinction is visible but brief; in yolo/auto-advance mode the workflow may already be advancing to phase 13.

### What the user never sees

- Whether the falsification pass actually ran (`falsification: upheld` in frontmatter is not checked by the UAT gate).
- Whether `files_modified` in SPRINT.md was accurate (overlap detection silently degrades when it's wrong).
- Which persona agent ran their work (only visible in agent presence, not in the summary banner).
- Whether the code review found medium/low issues that were silently accepted (only critical/high block).
- Snapshot tags are replaced on every re-execute — the "before execution" snapshot for a failed-then-retried phase is gone.

---

## Leaks

### 🔴 LEAK 1 — UAT gate does not check `falsification: upheld`

**File:** `rcode/workflows/execute.md` (uat_gate step) + `rcode/workflows/execute-verify-phase-goal.md:113-114`
**Evidence:** `execute-verify-phase-goal.md:113-114` states explicitly: *"A `passed` with no `falsification:` key means the pass never ran, and downstream should treat it as unverified."* The uat_gate step in `execute.md` reads `VERIFY_STATUS=$(grep "^status:" ...)` and branches on `passed` with no secondary check for `falsification: upheld`. There is no `grep "^falsification:" "$VERIFICATION_FILE"` anywhere in execute.md.
**User-facing cost:** A phase that passed the first verifier but whose falsification agent crashed, timed out, or was never spawned (e.g. because the orchestrator's own context was exhausted mid-workflow) reaches `COMPLETE ✓`. The single most important safety net in the entire workflow — the adversarial second pass — can be silently skipped with no user signal.
**Fix shape:** Add one check after `VERIFY_STATUS=passed`: `FALSIFICATION=$(grep "^falsification:" "$VERIFICATION_FILE" | head -1 | cut -d: -f2 | tr -d ' ')` and if empty or not `upheld`, treat as `verifier_failed` or `human_needed` depending on policy.

---

### 🔴 LEAK 2 — VERIFICATION.md status-grep fails on template-formatted files

**File:** `rcode/workflows/execute-verify-phase-goal.md:48-54`, `.rcode/templates/verification-report.md`
**Evidence:** The VERIFICATION.md template wraps its frontmatter in a YAML code fence:

```
---
status: passed
phase: 12
...
---
```

The grep `grep "^status:" "$VERIFICATION_FILE"` matches bare frontmatter lines — which is exactly how the Phase 47 verification (`47-VERIFICATION.md` lines 1-8) was written. However, the template file itself wraps the frontmatter block in `---` delimiters at the start of the document, not inside a code fence. If a verifier follows the template precisely and writes bare `---` delimiters, the grep works. But if the verifier outputs prose before the frontmatter (a common LLM behaviour when returning a markdown document with a preamble) the grep returns nothing → `VERIFY_STATUS` is empty → falls to `verifier_failed` despite a fully valid verification. The Phase 47 VERIFICATION.md succeeded because the frontmatter is on line 1 — but there is no instruction to the verifier enforcing this, and no validation error tells the user what went wrong.
**User-facing cost:** A real `passed` verdict is silently treated as `verifier_failed`. The user sees the verifier-failure abort message and is told to re-run, wasting a full verifier agent round-trip with no explanation.
**Fix shape:** Use `grep -m 1 "^status:" "$VERIFICATION_FILE"` (already there) but also try `awk '/^---/{c++;next} c==1 && /^status:/{print;exit}' "$VERIFICATION_FILE"` as a fallback that handles preamble prose.

---

### 🔴 LEAK 3 — Wave spot-check accepts SUMMARY.md as evidence of success

**File:** `rcode/workflows/execute-waves.md` (post-wave spot-check, step 4.5)
**Evidence:** The check is `SUMMARY.md exists AND git commits found`. SUMMARY.md is written by the executor — the same agent that did the work. A SUMMARY.md claiming "delivered all must-haves" is self-certification by definition. The verifier playbook (`rcode/references/verifier-playbook.md`) explicitly warns: *"A must-have supported only by a SUMMARY line is UNVERIFIED"* and *"a phase whose SUMMARY was written by the same sprint that built it has been self-certified."* The wave spot-check does exactly what the verifier playbook warns against.
**User-facing cost:** The wave ends with a green banner, and the user moves to the code-review gate believing work is complete. Gaps in delivery are not discovered until the verifier runs — but by then the user has already waited through the entire code-review gate. More critically, in auto-advance mode the next phase may already be planning before the verifier runs.
**Fix shape:** The spot-check should verify at least one `<verify><automated>` block from the SPRINT.md ran and passed, not just that a SUMMARY.md exists. Alternatively, add a line noting the spot-check is existence-only and surface that explicitly to the user.

---

### 🟡 LEAK 4 — Snapshot tag is replaced on every re-execute

**File:** `rcode/workflows/execute.md` (create_phase_snapshot step, ~line 390)
**Evidence:** The snapshot tag `snapshot/{phase}-pre-execution` is created with `git tag -f`. The `-f` flag force-replaces an existing tag. If a phase fails mid-execution and the user re-runs, the pre-failure snapshot is gone. There is no `snapshot/{phase}-pre-execution-{N}` versioning.
**User-facing cost:** The user cannot diff against "what the codebase looked like before the failed attempt" because the tag now points to after the first (failed) execution. In worktree mode this is less critical because the main branch was not modified — but in sequential execution this is the only rollback handle.
**Fix shape:** Before creating the snapshot tag, check if it already exists: `git rev-parse "snapshot/${PHASE}-pre-execution" 2>/dev/null` and if it does, create a versioned tag `snapshot/${PHASE}-pre-execution-2` instead.

---

### 🟡 LEAK 5 — Dead code path: post-wave hook step (execute-waves.md step 5)

**File:** `rcode/workflows/execute-waves.md` (step 5, post-wave hook validation)
**Evidence:** Step 5 runs `git hook run pre-commit` and is labelled *"when agents committed with `--no-verify`"*. But `AGENTS.md` (CLAUDE.md line: `NEVER use --no-verify`) explicitly forbids `--no-verify` in all agent commits. The commit spinlock (step 3) runs hooks normally. There is no execution path in any agent definition that bypasses hooks. Step 5 is therefore dead code — it will always either succeed trivially (hooks already ran) or fail unexpectedly on a clean codebase that has a hook that wasn't meant to be re-run.
**User-facing cost:** Cognitive overhead — the user reading execute-waves.md cannot understand why step 5 exists or when it fires. It also creates a false security signal: readers may believe hooks are being checked here when in reality they ran at commit time.
**Fix shape:** Delete step 5, or rewrite its condition so it only fires when `HookBypassDetected=true` (a flag that can only be set if `--no-verify` is actually used, which will never happen in normal operation).

---

### 🟡 LEAK 6 — Template literal in markdown is never evaluated

**File:** `rcode/workflows/execute.md:277-288`
**Evidence:** The required-reading block contains:
```
${AUTO_CHAINED_FROM_PLAN ? '' : '@.rcode/references/auto-init-guard.md'}
${AUTO_CHAINED_FROM_PLAN ? '@.rcode/references/karpathy-guidelines.md' : ''}
```
These are JavaScript template literal expressions inside a markdown file. They are never evaluated — the orchestrating LLM reads this as literal text (`${...}`), not a conditional. `auto-init-guard.md` and `karpathy-guidelines.md` are therefore always loaded or never loaded depending on how the LLM interprets the unparsed text.
**User-facing cost:** The intended conditional behaviour (different guidelines for chained vs standalone execution) silently never fires. The LLM may follow the conditional text as a prose instruction and try to evaluate it, or may skip it as code syntax — behaviour is undefined and model-dependent.
**Fix shape:** Replace the template literals with explicit prose: two separate bulleted instructions for the two cases, or a single `@-include` with both files always loaded and a prose note about chain context.

---

### 🟡 LEAK 7 — `files_modified` accuracy is planner-declared, not enforced

**File:** `rcode/workflows/execute-waves.md` (step 2, intra-wave overlap detection)
**Evidence:** Overlap detection uses `files_modified` from each plan's SPRINT.md frontmatter. These are written by the planner at plan-time, before execution. The planner estimates which files will be modified; the executor is not constrained to that list. If an executor touches `src/lib/utils.ts` that was not declared in `files_modified`, a second parallel executor touching the same file passes the overlap check and a merge conflict results.
**User-facing cost:** Silent parallel conflict. The wave merge (step 5.5) will encounter a conflict; the orchestrator must resolve it. The workflow has no documented resolution path for mid-wave merge conflicts — the post-wave cleanup assumes clean merges.
**Fix shape:** After each wave, diff the committed files against the declared `files_modified` list and warn when executors touched undeclared files. This catches drift for the *next* wave's overlap detection even if it cannot help the current wave.

---

### 🟢 LEAK 8 — Persona routing fallback is silent

**File:** `rcode/workflows/execute-sprint.md` (owner_agent_resolution)
**Evidence:** If a classified plan routes to `rcode-hanzla` but that agent type is unavailable or refuses, the fallback is `rcode-executor`. This fallback is correct — but it is silent. The SUMMARY.md will show `rcode-executor` ran, not `rcode-hanzla`, and no warning is emitted to the orchestrator or the user.
**User-facing cost:** Minor. The user may notice unexpected executor attribution in SUMMARY.md but the work still happens.

---

## Strengthenings

### 1. Check `falsification: upheld` in the UAT gate (Effort: S, files: `execute.md`)

Add a two-line `FALSIFICATION=$(grep ...)` check between the `VERIFY_STATUS=passed` branch and the `update_roadmap` call. A passed-but-unfalsified verification should route to `human_needed` or emit a named warning. **Why it helps the user:** closes the most dangerous silent-success path in the entire workflow — makes the falsification pass's guarantee actually binding instead of advisory.

### 2. Robust VERIFICATION.md status parsing (Effort: S, files: `execute-verify-phase-goal.md`)

Replace the single `grep "^status:"` with an `awk` fallback that handles frontmatter preceded by preamble prose. Add a secondary check: if `grep` returns empty but the file is non-empty, try the awk path before declaring `verifier_failed`. **Why it helps the user:** eliminates false `verifier_failed` aborts on valid verifications, saving a full agent round-trip per occurrence.

### 3. Surface falsification status in the `COMPLETE ✓` banner (Effort: S, files: `execute.md`)

When printing the phase-complete banner, append one line: `Verification: passed (falsification: upheld)` vs `Verification: passed (falsification: NOT RUN — re-verify)`. **Why it helps the user:** the user gets an explicit signal at the one moment they're paying attention — the completion banner — rather than having to read VERIFICATION.md frontmatter manually.

### 4. Wave spot-check: note that SUMMARY.md is self-certified (Effort: S, files: `execute-waves.md`)

Change the spot-check success banner from `✓ Wave {N} complete` to `✓ Wave {N}: executor self-reports complete (SUMMARY.md present) — verifier will independently confirm`. **Why it helps the user:** sets correct expectations — the user knows the wave result is a claim, not a fact, and they understand the verification step coming later is not redundant.

### 5. Snapshot tag versioning on re-execute (Effort: S, files: `execute.md`)

Before `git tag -f snapshot/{phase}-pre-execution`, check if it exists and if so create a versioned copy. **Why it helps the user:** rollback handle survives re-execution; the user can `git diff snapshot/12-pre-execution-1 HEAD` after a failed retry to understand what the first attempt changed.

### 6. Delete the dead post-wave hook step (Effort: S, files: `execute-waves.md`)

Remove step 5 or add a guard condition that can only fire when hooks were actually bypassed. **Why it helps the user:** the workflow becomes shorter and the reader's mental model is not polluted by a step that never fires.

### 7. Replace template literal conditionals with explicit prose (Effort: S, files: `execute.md:277-288`)

The `${...}` conditionals are read as literal text by the LLM. Replace with explicit prose instructions. **Why it helps the user:** the conditional behaviour (chained vs standalone init guard) actually fires, and the workflow is unambiguous.

### 8. Post-wave files_modified drift detection (Effort: M, files: `execute-waves.md`)

After wave merge, diff `git diff HEAD~{commit_count} --name-only` against the declared `files_modified` for that wave's plans. Log any undeclared files as `[overlap-risk]` entries in STATE.md. **Why it helps the user:** overlap detection for future waves becomes more accurate as planning drift is visible; prevents silent merge conflicts accumulating across waves.

---

## Kill your darlings

### Kill: Post-wave hook re-run step (`execute-waves.md` step 5)

This step cannot fire in any normal execution because `--no-verify` is prohibited by AGENTS.md and the commit spinlock runs hooks at commit time. It exists for a scenario that is explicitly forbidden. Delete it. If hook-bypass detection becomes necessary in the future, wire it to a `HookBypassDetected` flag set by the commit monitor, not as an unconditional post-wave step.

### Kill: Template literal conditionals in required-reading block (`execute.md:277-288`)

The two `${...}` expressions produce undefined LLM behaviour. They have never been evaluated as code in any execution of this workflow. Remove them and replace with two explicit prose bullets or always-load both references. The conditional loading of `auto-init-guard.md` only when not auto-chained is a valid goal — implement it as prose, not syntax.

### Kill: Wave spot-check `SUMMARY.md exists` as a success criterion

Replace with either no check (the verifier is coming) or a check that at least one `<verify><automated>` command passed. The current check creates false confidence and contradicts the verifier-playbook's explicit self-certification warning. A SUMMARY.md existing means an agent ran, not that work is done.

### Simplify: Three-option execution menu in yolo mode

In yolo mode, options B (Interactive) and C (Wave-only) are never selected. Option D is documented as "never auto-selected." The three-option section adds ~120 lines of conditional prose that the yolo path skips entirely. Move options B/C/D to a `@.rcode/references/execute-modes.md` file included only in guided mode. Reduces the orchestrator's reading burden on every auto-execute run.

### Simplify: `execute.md` orchestrator length (1110 lines → target ~700)

The orchestrator has grown to include complete sub-workflows inline (code review gate, UAT gate, regression gate, snapshot steps) that could each be `@`-included like `execute-waves.md` is. The 1000-line CLAUDE.md cap was enforced for execute.md at 998 lines after Phase 47 — the `.rcode/` mirror is the actively executed copy, and it has no line cap enforced. Splitting gates into `@`-included files would keep the orchestrator as a readable control-flow document and the gate logic as auditable standalone files, making both shorter and easier to reason about independently.
