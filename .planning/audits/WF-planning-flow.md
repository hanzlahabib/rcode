# Audit: planning-flow

**Lens:** planning-flow
**Date:** 2026-09-16
**Auditor:** rcode-audit
**Branch:** wf-planning-flow

---

## Verdict

**Good bones, buried under institutional debt.**

`/rcode-plan` is one of rcode's strongest workflows when you get past the first wall — the planner prompt alone (`plan-spawn-planner.md`) is genuinely production-grade: cross-sprint file ownership manifests, guard-test red-first rules, aggregator-file append rules, verify-command accuracy table. That depth earns trust.

The problem is everything before step 8. The path from "I want to plan phase 5" to an executable SPRINT.md passes through 7 interactive decision points (discuss-phase, research decision, UI-SPEC gate, security banner, 5.7 schema gate, specialist panel, sprint-checker loop), each of which can stall, fork, or exit the workflow entirely. For a casual or first-time user, the workflow reads as overhead rather than leverage. For a power user who knows which flags to pass, it collapses to a satisfying chain. The surface area between those two experiences is the problem.

Two live bugs (requirements coverage extractor and duplicate `model=` in research prompt) are confirmed in the source. One structural discontinuity (CONTEXT.md gate exits the entire process) forces manual re-invocation. These are not theoretical risks — they are observable failures today.

**Rating: 7/10 for expert users, 4/10 for everyone else.**

---

## The user's actual experience

### Happy path (no prior context, no existing plans, no flags)

```
/rcode-plan 5
```

1. **Step 0:** Model profile resolution — silent, ~2s Node cold start.
2. **Step 1:** Phase arg parsing — another Node call. Silent.
3. **Step 2-3:** Init — another Node call. Silent.
4. **Step 4:** CONTEXT.md check. **If missing: workflow exits entirely** with a recommendation to run `/rcode-discuss-phase 5` first. User must manually re-invoke. The two workflows are not chained — they are sequential manual hand-offs. (`plan.md:358-365`)
5. *(User runs `/rcode-discuss-phase 5`, answers 3-4 questions, gets CONTEXT.md.)*
6. *(User re-runs `/rcode-plan 5`.)*
7. **Step 4.5:** Effort-tier keyword scan. One-liner output, then:
8. **Step 5:** Research prompt. If RESEARCH.md missing and no `--auto`:
   - Another AskUserQuestion: "Research first or skip?"
   - If research: spawns `rcode-phase-researcher` — **user waits**. Call it 90–180s.
9. **Step 5.5:** Nyquist VALIDATION.md creation. Reads a template file, writes a new file. Silent.
10. **Step 5.55:** Security banner printed unconditionally (config default is `true`). No action required from user, but it's a banner with opt-out instructions mid-stream.
11. **Step 5.6:** UI-SPEC gate. If phase has frontend keywords and no UI-SPEC.md:
    - Another AskUserQuestion: "Generate UI-SPEC first / continue without / not a frontend phase"
    - "Generate UI-SPEC first" exits the workflow. User must run `/rcode-ui-phase`, then re-run `/rcode-plan`. Another manual re-invocation.
12. **Step 5.7:** Schema push detection. Silent grep over phase text. Usually a no-op.
13. **Step 6:** Load `plan-effort-tier.md`. Already done at step 4.5. Silent.
14. **Step 7:** Pre-plan checklist. Reads ROADMAP + requirements. Silent.
15. **Step 8:** Spawns `rcode-planner` — **user waits**. Call it 120–300s.
16. **Step 9:** Sprint count + effort-tier post-plan gate. Silent.
17. **Step 10:** Sprint-checker grading. **User waits.** Another agent spawn. 60–120s.
18. **Step 11-12:** Revision loop — if checker rejects plan, planner respawns. Up to 3 iterations. **Each iteration: user waits another 120–300s.**
19. **Step 13:** Specialist review panel: Waleed + Fatima + up to 2 domain agents **in parallel**. (`plan.md:675-795`) — **user waits** 90–180s. Up to 4 agents spawn without announcement.
20. **Step 14:** Panel outputs digested, plan updated if needed.
21. **Step 15:** memlog write + state.json update.
22. **Step 16:** Done banner.

**Minimum elapsed time for a fresh phase with research:** ~10–15 minutes, 3+ agent spawns, 2 possible workflow exits requiring manual re-entry.

**Power-user path with `--auto --chain --tier normal --no-panel --skip-research`:** drops to 3–5 minutes, 1–2 agent spawns, zero interruptions.

That flag gap is the UX story.

---

## Leaks

### L1 — CONTEXT.md missing exits the workflow; no auto-chain into `/rcode-discuss-phase`
**File:** `plan.md:358-365`
**Evidence:**
```markdown
If `has_context` is false: Print "Phase {X} has no context..." recommendation to run
/rcode-discuss-phase {N}. Exit workflow.
```
There is no `--auto` branch here that spawns `rcode-discuss-phase` before continuing. The `--chain` flag is mentioned for discuss-phase's *own* workflow (`discuss-phase.md`) as "chain to plan+execute after", but `/rcode-plan` has no inverse: it cannot pull discuss-phase in. The user must exit, run a separate command, and re-enter. On a project with 40+ phases, this is the most common first-time frustration.

**Blast radius:** Every fresh phase invocation until CONTEXT.md exists. This is the majority of invocations on a new project.

---

### L2 — Specialist panel spawns up to 4 agents with no upfront disclosure of cost or skip option
**File:** `plan.md:675-795`
**Evidence:** The panel dispatches Waleed (arch), Fatima (QA), and up to two domain-specialist agents (frontend/backend/security/UX/DevOps based on phase keywords). There is a `--no-panel` flag, but:
- It is not surfaced in any banner before the panel fires.
- It is not listed in the `plan.md` command help/argument-hint.
- Its existence is mentioned only in the panel-dispatch step itself, after the decision to spawn has already been made.

A user who didn't know about `--no-panel` gets 4 agents silently spawned for every plan, whether the phase is "update README" or "implement OAuth". For token-conscious users, this is a silent cost multiplier of ~4× on the planning step.

---

### L3 — Requirements coverage extractor silently skips non-`REQ-*` IDs (confirmed live bug)
**File:** `plan.md:1047-1058`
**Evidence:** The file itself documents this:
```
# NOTE: this only works for REQ-* format today; domain-prefixed IDs like FOUND-01
# or RENT-04 are silently skipped. See issue #XXX.
```
`grep -E "^REQ-[0-9]+"` matches `REQ-01`, `REQ-AUTH-01`, but not `FOUND-01`, `AUTH-01`, `RENT-04`, or any domain-prefixed format. A project that uses non-`REQ-*` IDs (which the researcher and planner both emit) gets a coverage check that always passes vacuously because no IDs are extracted to check against. This makes Dimension 6 (requirements coverage) a false green for the majority of real-world projects.

---

### L4 — UI-SPEC gate can exit the workflow a second time, compounding L1
**File:** `plan-research-validation.md:241-257` (step 5.6)
**Evidence:**
```
"Generate UI-SPEC first" → Display: "Run /rcode-ui-phase {N}... then re-run /rcode-plan {N}". Exit workflow.
```
A user hitting a fresh phase with no CONTEXT.md and no UI-SPEC.md for a frontend phase will be exited from `/rcode-plan` twice — once at L1, once here. They must manually sequence: `discuss-phase → ui-phase → plan`. Nothing in any command's help text or banner explains this dependency chain upfront.

---

### L5 — Duplicate `model=` key in research Task() call
**File:** `plan-research-validation.md:121-123`
**Evidence:**
```python
Task(
  prompt=research_prompt,
  subagent_type="rcode-phase-researcher",
  model="{model}",
  model="{researcher_model}",   # ← duplicate key
  description="Research Phase {phase}"
)
```
Python dicts with duplicate keys silently keep the last value. The `{model}` placeholder is dead — `{researcher_model}` wins. But because it's unvalidated markdown, if the orchestrator serializes this differently (e.g., YAML or JSON), behavior is undefined. The `{model}` key should be removed. This is a documentation/template integrity bug that will confuse anyone reading the source.

---

### L6 — Effort-tier keyword scan uses bash process substitution; breaks in non-bash shells
**File:** `plan-effort-tier.md:61-71`
**Evidence:**
```bash
RISK_KEYWORDS_MATCH=$(grep -iEl "security|migration|auth|payment|schema" \
  "${PHASE_DIR}"/*-CONTEXT.md \
  "${TASKS_FILE}" \
  <(node ".rcode/bin/rcode-tools.cjs" roadmap get-phase "${PHASE}" --pick section 2>/dev/null) \
  2>/dev/null | head -1)
```
`<(node ...)` is bash process substitution — it does not work in `/bin/sh`, `dash`, `zsh` (without `setopt`), or any POSIX shell. Claude Code on macOS defaults to `zsh`; if the shell context is not explicitly `bash`, this silently evaluates to an empty file descriptor or an error. When it fails silently, `RISK_KEYWORDS_FOUND=false` is set unconditionally, skipping research for every phase regardless of actual risk content. The fix is to write the roadmap section to a temp file first, or use a subshell in a way that is portable.

---

## Strengthenings

### S1 — Auto-chain discuss-phase into plan when CONTEXT.md is missing
**Where:** `plan.md` step 4 CONTEXT.md check
**What:** When `has_context` is false AND (`--auto` OR `AUTO_CHAIN`), invoke `Skill("rcode-discuss-phase", ...)` inline rather than exiting. The `--auto` flag already exists and already has meaning ("skip interactive prompts, make defaults") — it should propagate into this gate. A user who explicitly passes `--auto` has already consented to automatic behavior; exiting on missing CONTEXT.md contradicts that contract.
**Cost:** Low. The discuss-phase skill already handles `--auto` mode (auto-selects all gray areas). No new flag needed.

---

### S2 — Surface `--no-panel --tier --skip-research` in the opening banner
**Where:** `plan.md` step 0 or step 1 banner
**What:** After printing the phase name, print a single line like:
```
Flags: --tier trivial|small|normal|complex  --no-panel  --skip-research  --auto
```
This costs zero tokens to the user and makes the power-user path discoverable without reading 1347 lines of workflow documentation. The flags exist; they're just invisible.

---

### S3 — Fix the requirements coverage extractor to support domain-prefixed IDs
**Where:** `plan.md:1047-1058`
**What:** Extend the regex from `^REQ-[0-9]+` to a broader pattern that matches any `CAPS-NN` format: `^[A-Z][A-Z0-9]+-[0-9]+`. This is a one-line grep change. The live bug comment in the file already names the correct fix direction — it just hasn't been implemented.
**Risk:** Low. The checker is advisory, not blocking on ID format. A broader regex will catch more IDs than before, which is strictly better than the current false-green behavior.

---

### S4 — Consolidate the three workflow-exit gates (L1, L4) into a single upfront dependency check
**Where:** `plan.md` steps 4 and 5.6
**What:** At step 2 (init), after `has_context` and `UI_SPEC_FILE` are resolved, run a single dependency summary:
```
Phase 5: Auth Dashboard
Missing prerequisites:
  [1] CONTEXT.md — run /rcode-discuss-phase 5 first, or pass --auto
  [2] UI-SPEC.md — run /rcode-ui-phase 5 first, or continue without

Continue anyway? (y/N)
```
This replaces two separate workflow exits with one upfront decision point. The user sees the full picture before committing to the invocation, not mid-stream after the researcher has already run.

---

### S5 — Replace process substitution in effort-tier scan with a temp file
**Where:** `plan-effort-tier.md:61-71`
**What:** Write the roadmap section to `${TMPDIR:-/tmp}/rcode-phase-section.$$` first, then pass the temp file path to `grep`. Remove the temp file in a `trap`. This is a 3-line change that makes the keyword scan portable across all shell environments. Given that macOS users run `zsh` by default, this is a correctness fix, not a style preference.

---

## Kill your darlings

### K1 — Kill the standalone `/rcode-research-phase` command
**File:** `rcode/commands/research-phase.md`, `rcode/workflows/research-phase.md`
**Evidence:** The command's own stub says: "For most workflows, use `/rcode-plan` which integrates research automatically." (`research-phase.md:6`). The sufficiency loop (3-cycle max) in the standalone workflow duplicates the same logic already in `plan.md` step 5. The standalone command exists as a "just in case" escape hatch that teaches users the wrong mental model: that research and planning are separate concerns. They aren't — research without planning is orphaned output. Merging the standalone command into `plan.md --research-only` (a flag that stops after writing RESEARCH.md) eliminates the duplicate code path and the confusing fork.

---

### K2 — Kill the security banner that prints with no user action required
**File:** `plan-research-validation.md:161-188` (step 5.55)
**Evidence:**
```
display banner: "rcode ► SECURITY THREAT MODEL REQUIRED (ASVS L{SECURITY_ASVS})"
...
Continue to step 5.6. Security config is passed to the planner in step 8.
```
The banner is printed unconditionally (config default: `true`), then the workflow immediately continues. There is no user prompt, no blocker, no action. The only effect is displaying a wall of text that says "each SPRINT.md must include a `<threat_model>` block" — which is enforced (or not) at step 10 by the sprint-checker, not here. This step is pure noise: it adds tokens to every planning run for every user without providing any interactive value. Move the security constraint silently into the planner prompt (step 8) where it actually has effect, and delete this display-only step.

---

### K3 — Kill the Trivial-Tier Pre-Flight Redirect's file-count heuristic for `--auto` runs
**File:** `plan-effort-tier.md:105-163`
**Evidence:** The redirect counts distinct filenames in CONTEXT.md/TASKS.md text (not actual `files_modified` frontmatter, which doesn't exist yet) and offers to send the user to `/rcode-quick` instead. The signal is noisy: a phase that mentions 2 files in its context description but actually touches 15 files (via generated scaffolding, test files, config) will get a "looks small, redirect?" prompt that is wrong. In `--auto` mode this becomes `FILE_MENTION_COUNT < 4 → redirect to /rcode-quick` without confirmation — the user explicitly invoked `/rcode-plan` and gets silently redirected to a different command. The effort-tier goal (skip expensive phases of the pipeline for genuinely simple work) is served adequately by the keyword scan (L-/S-tier via `--tier`) and the post-plan sprint count gate. The pre-flight file-count estimate adds a third, lower-signal heuristic that contradicts explicit user invocation. Remove it; keep the keyword scan and sprint-count gate.
