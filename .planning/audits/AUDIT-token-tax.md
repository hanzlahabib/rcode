# AUDIT: Token Tax of the 10 Most-Used rcode Commands

**Scope:** For the 10 highest-traffic `/rcode-*` commands, trace the full `@`-include chain each one pulls in (recursively) and quantify it as a token-proxy. Identify unconditional loads that are dead weight in the common case, and safely convert any clean candidates to the codebase's existing lazy-load ternary pattern.
**Method:** Direct `wc -l`/`wc -w` over `rcode/commands/*.md` → `rcode/workflows/*.md` → every file each one `@`-includes, resolved recursively (script-driven, not sampled). `.rcode/` is a byte-identical installed mirror of `rcode/` in this repo (verified via `diff`), so all citations below use the `rcode/` source paths. Conversion note: ~0.75 words/token (tokens ≈ words ÷ 0.75), per OpenAI's standard rule of thumb — a proxy, not a tokenizer-exact count.
**Commands profiled:** `execute`, `verify-work`, `plan`, `new-project`, `discuss-phase`, `do`, `dev-story`, `council`, `quick`, `ship` — all 10 confirmed to exist under `rcode/commands/`.

---

## How "unconditional" was determined (important caveat)

This codebase's `@path` syntax is not a single mechanism — tracing it naively (regex-matching every `@rcode/...md` / `@.rcode/...md` occurrence) overcounts real cost unless three distinct shapes are told apart:

1. **`<required_reading>` bare `@path`** (own line, no `${...}` wrapper) — genuinely paid every time the containing file is loaded into whichever context reads it. This is the real "token tax."
2. **`${COND ? '@path' : ''}`** — the established lazy-load convention (confirmed in use at `rcode/workflows/execute.md:182-188,345,712,831,865` and `rcode/workflows/plan.md:49,601`, and documented in `CHANGELOG.md` under "Agent rules split into slim index + lazy-loaded files (77% token reduction)"). `COND` is a shell/config-derived flag (e.g. `SPRINT_HAS_CHECKPOINT=$(grep -rl "checkpoint" "${phase_dir}"/*-SPRINT.md ...)` at `execute.md:259`, or `THINKING_PARTNER_ENABLED=$(node .rcode/bin/rcode-tools.cjs config-get features.thinking_partner ...)` at `plan.md:599`). These are genuinely skipped in the common case.
3. **Bare `@path` inside a conditionally-*reached* `<step>` body** (e.g. `verify-work.md`'s `diagnose_issues` step, only entered "if issues > 0" per `verify-work.md:428`) — not syntactically guarded, but the workflow's own step-branching means the file is only actually read if that step is reached. This is *already* effectively lazy in the common (all-tests-pass) case, even though the raw grep counts it as "unconditional." Converting these to explicit ternaries is usually not possible without a pre-computable condition, and doing so with a fabricated one risks a wrong guard.

The table below reports two figures per command: **lines/tokens if every syntactically-unconditional `@path` fires** (shape 1 + shape 3, i.e. what a naive grep sees) and **files pulled in worst-case** (shapes 1+2+3 combined, i.e. every possible branch). The findings section below the table is where shape 3 gets manually disambiguated from shape 1 for the top offenders — that's where the real signal is.

---

## Ranked table (worst first, by unconditional-line total)

| Rank | Command | Direct file | Files pulled in (uncond / worst-case) | Lines (uncond / worst-case) | Est. tokens (uncond / worst-case) | Notably large single includes |
|---|---|---|---|---|---|---|
| 1 | `execute` | `rcode/commands/execute.md` | 13 / 20 | 3,361 / 4,784 | ~23,900 / ~32,000 | `execute.md` itself (996 ln); `checkpoints.md` (778 ln, **guarded** — `${SPRINT_HAS_CHECKPOINT \|\| PRIOR_WAVE_FAILED ? ... : ''}`, only fires for executor subagents when a SPRINT.md mentions "checkpoint" or a prior wave failed); `execute-sprint.md` (667 ln, lands in the **executor subagent's** context, not the orchestrator's own) |
| 2 | `verify-work` | `rcode/commands/verify-work.md` | 8 / 8 | 3,333 / 3,333 | ~17,800 / ~17,800 | `checkpoints.md` (778 ln, pulled in via `verification-patterns.md:603`'s own unconditional include — see Finding B below); `verify-work.md` itself (733 ln); `common-bug-patterns.md` (621 ln) |
| 3 | `plan` (after fix) | `rcode/commands/plan.md` | 9 / 14 | 2,419 / 2,934 | ~17,100 / ~20,600 | `plan.md` itself (1,000 ln, at the repo's own file-size cap); `output-format.md` (398 ln); `plan-spawn-planner.md` (362 ln) |
| 4 | `new-project` | `rcode/commands/new-project.md` | 7 / 7 | 2,152 / 2,152 | ~11,000 / ~11,000 | `new-project.md` itself (1,001 ln); `output-format.md` (398 ln) |
| 5 | `discuss-phase` | `rcode/commands/discuss-phase.md` | 7 / 7 | 2,070 / 2,070 | ~15,500 / ~15,500 | `discuss-phase.md` itself (960 ln); `discuss-phase-power.md` (332 ln); `discuss-phase-discuss-areas.md` (275 ln) |
| 6 | `do` | `rcode/commands/do.md` | 5 / 5 | 1,190 / 1,190 | ~11,000 / ~11,000 | `do.md` itself (458 ln); `output-format.md` (398 ln); `verb-dictionary.md` (186 ln) |
| 7 | `dev-story` | `rcode/commands/dev-story.md` | 8 / 8 | 909 / 909 | ~6,400 / ~6,400 | `dev-story.md` itself (441 ln); `commit-conventions.md` (125 ln) |
| 8 | `council` | `rcode/commands/council.md` | 4 / 4 | 861 / 861 | ~6,700 / ~6,700 | `council.md` itself (623 ln) |
| 9 | `quick` | `rcode/commands/quick.md` | 4 / 4 | 530 / 530 | ~5,000 / ~5,000 | `quick.md` itself (213 ln); `verb-dictionary.md` (186 ln) |
| 10 | `ship` | `rcode/commands/ship.md` | 4 / 4 | 443 / 443 | ~2,900 / ~2,900 | `ship.md` itself (323 ln) |

`plan`'s row already reflects the fix applied below (before the fix: 2,546 lines / 13,316 words unconditional — see Finding A).

---

## Findings on the worst 3 offenders

### Finding A — FIXED: `plan.md` unconditionally loaded a 127-line file nothing ever reads

**File:** `rcode/workflows/plan.md:53` (and its byte-identical mirror `.rcode/workflows/plan.md:53`)

`<required_reading>` had a bare `@.rcode/references/thinking-models-planning.md` (127 lines / ~536 words: pre-mortem analysis, MECE decomposition, constraint analysis, reversibility testing — four planning "mental models" with prompt templates). This fired on **every** `/rcode-plan` invocation, regardless of phase content.

Verified via grep across `rcode/references/planner-playbook.md`, `rcode/agents/rcode-planner.md`, `rcode/references/sprint-checker-playbook.md`, and `rcode/agents/rcode-sprint-checker.md`: none of them ever reference the file's own vocabulary ("Planning Context", "Pre-Mortem", "MECE", "Binding Constraint", "One-Way Decision" — the section headers `thinking-models-planning.md` itself says should be added to SPRINT.md). Nothing downstream consumes it. It is pure unconditional overhead.

Direct precedent for the fix: commit `27e0bf3` (#998, "extract rare-mode sections to bring plan.md/execute.md under 1000 lines") did exactly this to `plan.md` for two other files — quoting its own message: *"Removed plan.md's unconditional includes of revision-loop.md and gate-prompts.md (neither describes a process plan.md actually implements)"* — and, in the same commit, extracted `thinking-models-planning.md`'s **thematic sibling**, `plan-thinking-partner.md`, into a proper gated include:

```
THINKING_PARTNER_ENABLED=$(node ".rcode/bin/rcode-tools.cjs" config-get features.thinking_partner 2>/dev/null || echo "false")
${THINKING_PARTNER_ENABLED === 'true' ? '@.rcode/references/plan-thinking-partner.md' : ''}
```

`thinking-models-planning.md` was simply missed by that pass — it's the older (pre-v4 `rihal`-era) file, and #998 only touched the newer sibling.

**Fix applied** (via `/rcode-quick`, in both `rcode/workflows/plan.md` and its `.rcode/` mirror):

```diff
 <!-- Read .rcode/references/agent-contracts.md only if defining or debugging agent contracts -->
-<!-- Read .rcode/references/gates.md only if implementing or troubleshooting gate logic -->
-@.rcode/references/thinking-models-planning.md
+<!-- Read .rcode/references/gates.md only if implementing or troubleshooting gate logic; thinking-models-planning.md (127 lines) only if features.thinking_partner is enabled -->
+${THINKING_PARTNER_ENABLED === 'true' ? '@.rcode/references/thinking-models-planning.md' : ''}
```

This reuses the `THINKING_PARTNER_ENABLED` variable that already exists later in the same file (`plan.md:599`, computed for `plan-thinking-partner.md`'s own gate at `plan.md:601`) — no new variable, no new computation, same file. This mirrors the file's own established precedent of a `required_reading` line referencing a guard variable computed later in the same document (`PHASE_GOAL_HAS_UI` is used at `plan.md:49` but not computed until `plan.md:103`), so this isn't a new pattern for the file.

Net effect on the file's own size: the `<!-- ... -->` comment was folded onto the existing `gates.md` comment line rather than added as a new line, so `plan.md` stays at exactly **1,000 lines** — the file-size cap #998 was originally enforcing (it would have become 1,001 with a separate comment line).

**Before/after (common case: `features.thinking_partner` disabled, the config default):**

| | Unconditional lines | Unconditional words | Est. tokens |
|---|---|---|---|
| Before | 2,546 | 13,316 | ~17,755 |
| After | 2,419 | 12,794 | ~17,059 |
| **Savings** | **−127 lines** | **−522 words** | **~−700 tokens** per `/rcode-plan` run |

Risk assessment: **low**. The removed content has zero downstream consumers (confirmed by grep, not assumption), the flag it's now gated behind already exists and already gates its thematic twin, and the fix is a 2-line diff with no behavior change for any user who has `features.thinking_partner` enabled — they still get the exact same content, now alongside `plan-thinking-partner.md` under the same flag instead of always.

### Finding B — NOT FIXED (documented only): `verify-work.md`'s heaviest includes are step-gated, not truly unconditional

`checkpoints.md` (778 ln) and `common-bug-patterns.md` + `verification-patterns.md` (1,233 ln combined) only entered `verify-work`'s trace through `verify-work.md:479`'s `Follow @.rcode/workflows/diagnose-issues.md` — and that line lives inside `<step name="diagnose_issues">`, which `verify-work.md:428` only enters **"If issues > 0."** In the common case (all tests pass), this step, and everything it pulls in, is never reached — the workflow's own step-based branching already makes this lazy in practice, even though a raw `@`-grep (and my first-pass script) flags it as "unconditional."

I looked for a precomputable condition to make this an explicit `${...}` ternary (matching the established pattern) but couldn't find one: whether issues exist is only known *after* the test-verification loop runs (`present_test`/`process_response`/`complete_session` steps, `verify-work.md:247-427`), not before `verify-work.md` is first loaded. Fabricating a guard here — e.g. trying to precompute "will this session hit an issue" from stale state — would risk silently breaking diagnosis for real failures, which is exactly the "wrong guard breaks the command for users who needed that content" failure mode I was told to avoid. **Left as-is.** If this is worth tightening later, the safer fix is likely inside `diagnose-issues.md` itself (does it need the *entire* 621-line `common-bug-patterns.md` catalogue, or just the summary table at its tail?) rather than gating the include boundary.

### Finding C — NOT FIXED (verified core, not dead weight): `execute.md`'s remaining unconditional includes

`execute.md`'s `<required_reading>` (`execute.md:180-188`) already has 3 of 5 entries properly gated on `AUTO_CHAINED_FROM_PLAN` (added since the prior `AUDIT-token-cost.md` was written — that audit's Finding 6 is now partially stale). The two still-unconditional entries — `git-preflight.md` (117 ln, pre-execution git-state safety checks) and `execution-protocol.md` (155 ln, core execution rules) — read as genuinely load-bearing for every execution, not rare-mode content; I found no evidence (no unused-downstream signal, no thematic "sibling that's already gated") to justify touching either. `execute-sprint.md` (667 ln) and `checkpoints.md` (778 ln, itself already gated per `execute-waves.md:224`) land in the **spawned executor subagent's** context via the `<execution_context>` template `execute-waves.md` constructs for `Task()` — not the orchestrator's own context — so they inflate the full-pipeline total in the ranked table but aren't "unconditional main-loop bloat" in the same sense as Finding A. No changes made.

---

## What was *not* attempted

- No changes to `execute.md`, `verify-work.md`, or any command other than `plan.md` — the other 9 commands' unconditional totals were reviewed (Findings B/C) but no fix cleared the safety bar this audit was asked to hold to.
- No attempt to gate `output-format.md` (398 ln, appears unconditionally in 6 of the 10 commands' required-reading blocks) — it's small-but-pervasive formatting/banner rules, used by every command's own output, not a rare-mode candidate.
- No attempt to touch `common-bug-patterns.md` / `verification-patterns.md` internals (Finding B) — flagged for a future, narrower audit rather than acted on here.

---

## Files changed

- `rcode/workflows/plan.md` — 1 line converted to conditional load (Finding A)
- `.rcode/workflows/plan.md` — same change, installed mirror kept in sync
