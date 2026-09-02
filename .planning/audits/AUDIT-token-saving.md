# AUDIT: Token Saving / Efficiency Across rihal-code

**Scope:** Read-only diagnosis of token/efficiency waste in workflows, hook scripts, agent/subagent fan-out, and memory/distillate freshness across this repo. No fixes applied.
**Method:** Direct `wc`/`grep`/`Read` over `.rcode/workflows/*.md`, `.rcode/bin/rcode-hooks.cjs`, `.rcode/bin/lib/*.cjs`, `.rcode/memory/**`, `.claude/settings.json` and `.claude/hooks/*`, cross-checked against this repo's own live state (`.rcode/state.json`, `.planning/STATE.md`, `.planning/ROADMAP.md`) so every token estimate below is a measured figure on *this* repo, not a hypothetical. Char-count ÷ 4 used as the tokens-per-char proxy, consistent with `.rcode/bin/lib/memory-select.cjs`'s own `CHARS_PER_TOKEN` constant.

**Related prior audits** (do not duplicate — read first if extending this one): `AUDIT-token-cost.md` (plan→execute→verify pipeline agent-hop cost), `AUDIT-token-tax.md` (per-command `@`-include chains, ranked table), `AUDIT-lazy-load.md` (ternary-guard conversion sweep, still in progress across `.rcode/workflows/*.md`). Those three cover **static `@`-include tax**. This audit covers a different, unaddressed angle: **runtime data dumps** (`cat`/`state read` of live, growing files), **memory staleness**, **subagent fan-out sizing**, and **router-chain overhead** — none of which appear in the three prior reports.

---

## Findings

### P0-1 — `/rcode-autonomous` re-reads full STATE.md + ROADMAP.md on every phase-loop iteration, not just once
**File:** `.rcode/workflows/autonomous.md:226` (`cat .planning/ROADMAP.md` in `discover_phases`), `:694-703` (`cat .planning/ROADMAP.md` + `cat .planning/STATE.md` + `node rcode-tools.cjs state read`, repeated **after every phase completes**, inside the execution loop)
**Cost:** On this repo, `.planning/STATE.md` is 73,285 bytes (~18,300 tokens) and `.planning/ROADMAP.md` is 23,437 bytes (~5,900 tokens) = **~24,200 tokens per `cat` pair**. `discover_phases` pays it once at startup; the loop then pays it again **after every single phase**, unfiltered, even though the only thing extracted afterward is "which phases are still incomplete" and "are there new blockers." A 10-phase autonomous run pays this ≥11 times = **~266K tokens** of pure redundant full-file re-reads, on top of whatever the phase's own plan/execute/verify hops cost (see `AUDIT-token-cost.md`).
**Fix:** Replace the unconditional `cat` with the same field-extraction pattern already used elsewhere in this codebase (`health.md:174,183` and `decisions.md:44` pipe `state read` through `python3 -c`/`node -e` to pull one field). Track the previously-seen phase list in a shell variable instead of re-parsing the whole ROADMAP.md each loop iteration; only re-parse if `wc -l ROADMAP.md` changed.

### P0-2 — `/rcode-next` full-reads STATE.md + ROADMAP.md for what's meant to be a cheap "what's next" check
**File:** `.rcode/workflows/next.md:36-43`
**Cost:** Same two files, same **~24,200 tokens**, for a command explicitly positioned as the low-friction "auto-advance" router — one users are expected to run frequently, mid-session, as a status check. This dwarfs the cost of the command's own body.
**Fix:** Mirror `health.md`'s extraction pattern — pull only `current_phase`, `current_sprint`, `phases[].status`, and the top of the Blockers section, not the whole document.

### P1-1 — Memory distillates are 103 days stale and describe a milestone/version that no longer exists, yet are injected into every SessionStart
**File:** `.rcode/memory/distillates/project.distillate.md`, `.rcode/memory/distillates/stack.distillate.md`
**Cost:** Both carry `generated-at: 2026-05-22T21:10:24Z`; today is 2026-09-02 (103 days stale). The distillate's own text says "v4.0.0 hard-break rebrand... Started 2026-05-20, rolling close 2026-06-15" and "Current milestone (v4.0.0 rebrand + OSS release prep)" — but the repo's actual last commit (`f7c744c`) is `chore(release): v4.16.0`, and this session's own SessionStart hook injected this exact stale text verbatim (see the SessionStart system-reminder at the top of this conversation). `.rcode/bin/lib/memory-select.cjs` budgets 1,500 tokens per session and this distillate wins the relevance-ranking almost every time (recency-decay favors it since it's still the newest thing under `distillates/`), so **every session start spends its full memory budget on outdated identity/milestone context** — a real cost (~1.5K tokens/session) that also risks steering the agent toward wrong assumptions (wrong current milestone, wrong version), which compounds into wasted follow-up turns correcting course.
**Fix:** `/rcode-memory-distill` needs to be re-run. More durably: add a staleness check to `session-start()` in `rcode-hooks.cjs` — if `generated-at` is >30 days old, either skip injecting that chunk or append a one-line `⚠ memory distillate is N days stale — run /rcode-memory-distill` instead of silently serving outdated content as fact.

### P1-2 — `discuss-phase.md` and `autonomous-smart-discuss.md` unconditionally `cat` full PROJECT.md + REQUIREMENTS.md + STATE.md at the start of every phase discussion
**File:** `.rcode/workflows/discuss-phase.md:277-283`, `.rcode/workflows/autonomous-smart-discuss.md:28-33`
**Cost:** STATE.md alone is ~18,300 tokens on this repo; PROJECT.md/REQUIREMENTS.md add more. The very next lines in both files say only specific fields are needed ("Vision, principles, non-negotiables", "Current progress, any flags or session notes") — the full-file `cat` is broader than the stated need. `discuss-phase` is a per-phase, potentially multi-invocation command, so this is paid repeatedly across a milestone.
**Fix:** Same extraction pattern as P0-1/P0-2; if STATE.md's "current position" is reliably in a delimited section (e.g. `## Current Position`), `sed -n '/^## Current Position/,/^## /p'` instead of `cat`.

### P1-3 — `resume-work.md` unconditionally `cat`s full STATE.md + PROJECT.md
**File:** `.rcode/workflows/resume-work.md:41-48`
**Cost:** Same ~18K+ token STATE.md dump for a command whose stated extraction need is just "Project Reference: Core value and current focus."
**Fix:** Same as above.

### P1-4 — `/rcode-audit lens all` can fan out to ~25-30 Task subagent spawns in one invocation, with no applicability pre-check
**File:** `.rcode/workflows/lens-audit.md` (line 36: "run all 15 lenses sequentially"; multiple lenses define both `PRIMARY = Task(...)` and `SECONDARY = Task(...)`, e.g. lines 155/173, 221/239, 445/464, 542/558, 580/596)
**Cost:** Several of the 15 lenses spawn 2 Task agents each (primary + secondary reviewer); across all 15 that's up to ~25-30 subagent spawns for a single `lens all` run, each paying its own context-startup cost, run sequentially (not even parallelized to save wall-clock — the token cost is paid regardless). No visible pre-check skips a lens when it's structurally inapplicable (e.g. an i18n or SXO lens on a project with no user-facing strings/pages).
**Fix:** Add an applicability gate per lens mirroring `plan.md:49`'s `PHASE_GOAL_HAS_UI` ternary pattern (a cheap `grep -l` over the codebase to decide relevance) so structurally-inapplicable lenses report "not applicable" without spawning agents at all.

### P1-5 — Fixed-size agent panels regardless of question/project complexity
**File:** `.rcode/workflows/council.md:86` (council always spawns 3-5 agents "for debate"), `.rcode/workflows/new-project.md:26,87` ("Run domain research (4 parallel agents + synthesizer)")
**Cost:** A narrow, single-domain council question (e.g. "should we use Postgres or SQLite here") pays the same 3-5-agent panel cost as a genuinely cross-cutting strategic question. Same for `new-project`'s fixed 4-researcher-agent fan-out on small/scaffold-only projects.
**Fix:** Scale panel/researcher count to detected question breadth (number of distinct domain keywords matched) rather than a fixed constant; `council.md` already has a "For one expert, use: ..." escape hatch (line 86) — the auto-routed default path doesn't use it.

### P2-1 — This very audit request paid for two full router-workflow hops (`/rcode-do` → `/rcode-audit`) before reaching any real work, and matched neither's canned targets
**File:** `.rcode/workflows/do.md` (474-line body; declares `required_reading` of `auto-init-guard.md` 127 lines + `output-format.md` 398 lines + `verb-dictionary.md` 186 lines = up to 711 more lines if fully complied with — matches the ~1,190-line / ~11,000-token figure already measured for `do` in `AUDIT-token-tax.md`), `.rcode/workflows/audit.md` (208-line body, adds ~1,500 more tokens)
**Cost:** ~12,500+ tokens of pure routing scaffold were loaded (do.md's full required_reading + body, then audit.md's full body) for an input that was fully self-specified (explicit scope, explicit output path, explicit severity scheme, explicit git commands) and ultimately matched **none** of `audit.md`'s 9 canned targets (`plans/phase/milestone/uat/code/fix/work/lens/worktrees`) — the actual work had to be executed ad hoc regardless. The routing added latency and tokens without adding routing value on this input shape.
**Fix:** Either (a) have `do.md`'s routing table recognize "fully-specified, self-contained audit request with explicit output path" as a `/rcode-quick`-style direct-execution case rather than `/rcode-audit`, or (b) have `audit.md` Step 1 short-circuit to a "no canned target fits — proceeding as a bespoke read-only diagnostic" fallback instead of silently falling through its yolo-mode auto-pick heuristic (which would have guessed `code`/`plans`/`work` here, none of which fit).

### P2-2 — `do.md` calls a nonexistent `rcode-tools.cjs` subcommand (`state load`), so its state-aware routing logic silently always runs on a failure fallback
**File:** `.rcode/workflows/do.md:132` — `INIT=$(node ".rcode/bin/rcode-tools.cjs" state load 2>/dev/null || echo '{"ok":false,"error":"state_load_failed"}')`
**Verified:** `node .rcode/bin/rcode-tools.cjs state load` → `rcode-tools error: Unknown state subcommand: load. Common: read, set-phase, advance-plan, ...`. The real subcommand is `state read`. Because the call always fails, `$INIT` is always the `{"ok":false,...}` fallback — the state-aware milestone/PRD detection this powers never sees real project state.
**Cost today:** Low direct token cost — the bug accidentally *avoids* paying for a real `state read`, which dumps the full unfiltered `state.json` (measured at 73,537 bytes / ~18,400 tokens on this repo; confirmed no field-filtering wrapper exists for this particular call site, unlike `health.md`/`decisions.md`'s correct usage). **Latent risk:** a naive fix (`load` → `read`) without also adding the field-extraction wrapper used elsewhere would silently introduce an ~18K-token regression identical in shape to P0-1/P0-2, on every single `/rcode-do` invocation.
**Fix:** Fix the subcommand name **and** add the extraction wrapper in the same change — mirror `decisions.md:44`'s `state read | node -e '...JSON.parse...print one field...'` pattern.

### P2-3 — `sprint-planning.md` captures full unfiltered `state read` output into a bash variable
**File:** `.rcode/workflows/sprint-planning.md:83` — `STATE=$(node .rcode/bin/rcode-tools.cjs state read)`
**Cost:** Same ~18,400-token unfiltered capture as P0-1/P0-2/P2-2, with no `2>/dev/null` fallback guard and no field extraction. Whether this actually reaches model context depends on whether a later step echoes `$STATE` or relies on the model inferring its contents — the risk exists either way since the workflow's prose ("Extract: Current phase from state, ...") implies the model needs visibility into the raw content.
**Fix:** Same extraction wrapper as above.

---

## Summary table

| # | Severity | File | One-line fix | Est. token cost |
|---|---|---|---|---|
| P0-1 | P0 | `.rcode/workflows/autonomous.md:226,694-703` | Replace `cat` STATE/ROADMAP with field-extraction; only re-parse ROADMAP on change | ~24.2K tokens × N phase iterations (≥2, often 10+) |
| P0-2 | P0 | `.rcode/workflows/next.md:36-43` | Extract fields via python/node, don't `cat` full files | ~24.2K tokens per invocation |
| P1-1 | P1 | `.rcode/memory/distillates/*.distillate.md` | Re-run `/rcode-memory-distill`; add staleness check to `session-start()` | ~1.5K tokens/session, wrong content risk |
| P1-2 | P1 | `.rcode/workflows/discuss-phase.md:280`, `autonomous-smart-discuss.md:31` | Section-grep instead of full `cat` | ~18K+ tokens per phase discussion |
| P1-3 | P1 | `.rcode/workflows/resume-work.md:44` | Section-grep instead of full `cat` | ~18K+ tokens per invocation |
| P1-4 | P1 | `.rcode/workflows/lens-audit.md` | Add applicability pre-check per lens before spawning | ~25-30 subagent spawns avoidable per `lens all` run |
| P1-5 | P1 | `.rcode/workflows/council.md:86`, `new-project.md:26` | Scale panel/researcher count to detected complexity | 2-4x agent-spawn overhead on narrow questions |
| P2-1 | P2 | `.rcode/workflows/do.md` + `audit.md` | Short-circuit fully-specified requests past the second router hop | ~12.5K tokens of routing scaffold, this session |
| P2-2 | P2 | `.rcode/workflows/do.md:132` | Fix `state load`→`state read` + add extraction wrapper together | 0 today; ~18.4K latent regression risk |
| P2-3 | P2 | `.rcode/workflows/sprint-planning.md:83` | Add extraction wrapper | ~18.4K tokens, exposure unclear |

---

## Not flagged (checked, found adequate)

- `.rcode/bin/lib/memory-select.cjs` — SessionStart memory injection is already relevance-ranked and budget-capped (default 1,500 tokens via `DEFAULT_BUDGET_TOKENS`), not a raw dump. The problem found here is the *content* being stale (P1-1), not the injection mechanism.
- `UserPromptSubmit` → `rcode-hooks.cjs promptRouter()` — already has `once-per-intent` dedupe, a config off-switch, and explicitly skips when the prompt starts with `/rcode-` (avoids double-nudging on direct slash invocations). Low per-turn overhead.
- `.claude/hooks/sync-bin-on-edit.sh` / `block-unregistered-phase-writes.sh` — small (34/118 lines), path-matched, no-op unless `rcode/bin/**` or `rcode/data/**` touched.
- `health.md`, `decisions.md`, `export-to-github.md` — correctly pipe `state read` through `python3 -c`/`node -e` to extract a single field instead of capturing the full JSON. This is the pattern every P0/P2 finding above should be converted to match.

## Next steps (not performed — read-only audit)

- `/rcode-audit fix` or manual patches for P0-1/P0-2 first (highest, most-frequently-paid cost).
- `/rcode-memory-distill` to clear P1-1.
- Cross-reference this report with `AUDIT-token-cost.md`/`AUDIT-token-tax.md`/`AUDIT-lazy-load.md` before filing GitHub issues, to avoid duplicate tracking of the `@`-include-chain class of finding (already owned by those three).
