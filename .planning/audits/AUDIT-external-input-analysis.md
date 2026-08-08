# AUDIT — External Transcript Analysis (progress-tracker production trace)

**Scope:** Verify the 4 candidate signals in `INPUT-external-transcript.md` against this
repo's actual current `rcode/` and `.rcode/` source. Diagnosis only — nothing in `rcode/`
or `.rcode/` was modified to produce this report except where explicitly noted under
"Fix applied" below.

**Method:** Direct `Read`/`grep` of `rcode/agents/rcode-planner.md`,
`rcode/references/planner-playbook.md`, `rcode/templates/sprint.md`,
`rcode/agents/rules/planner/task-templates.md`, `rcode/workflows/execute-sprint.md`,
`rcode/workflows/execute.md`, `rcode/workflows/plan-spawn-planner.md`,
`rcode/references/sprint-checker-playbook.md`, `.rcode/bin/rcode-tools.cjs`, and
`rcode/references/gates.md`, cross-checked with `git log -p` on the relevant files to
establish when the drift was introduced. Sibling audits already in
`.planning/audits/` (`AUDIT-token-cost.md`, `AUDIT-schema-drift.md`) were read for
cross-reference on signal 4 — the transcript's exact filenames
(`AUDIT-token-tax.md`, `AUDIT-duplication.md`, `AUDIT-lazy-load.md`) do not exist in
this repo; the closest real siblings are named above.

---

## Findings table

| # | Signal from transcript | Verdict | Evidence (file:line) | Scope |
|---|---|---|---|---|
| 1 | Planner's output contract doesn't hard-require `<acceptance_criteria>`, so drift goes uncaught | **TRUE — confirmed, worse than the transcript's own framing** | See full write-up below | **In scope** |
| 2 | `.gitignore` "collision" false positive is rcode's own tooling | **FALSE** | No `check-req-coverage.sh` or gitignore-collision check exists anywhere in `rcode/` or `.rcode/` (`find . -iname check-req-coverage.sh` → 0 hits in this repo) | Out of scope — consuming project's custom script |
| 2 | "npm run" / "pnpm run" substring false positive is rcode's own tooling | **FALSE** | `grep -rn "npm run|pnpm run" rcode/ .rcode/` → all hits are markdown prose/examples, not executable substring-matching code; `.rcode/bin/rcode-tools.cjs` has no npm/pnpm string check at all | Out of scope — consuming project's custom script |
| 3 | Numbered "Gate 8.5 / 12 / 12.5 / 13" system and `CHAIN-LOG.md` "⊘ owed" debt tracking is native rcode | **PARTIALLY TRUE** | `grep -rln "CHAIN-LOG|⊘ owed|Gate 8.5|Gate 12.5|Gate 13" rcode/ .rcode/` → 0 hits (fully custom). But Gate 12.5's actual command (`node .rcode/bin/rcode-tools.cjs pl...`) *is* native — `.rcode/bin/rcode-tools.cjs:5343` ships `plan check-wave-overlaps <phase>` (issue #768). Native gate vocabulary exists but is conceptually different: `rcode/references/gates.md` defines 4 *gate types* (Pre-Flight, Revision, Escalation, +1), not numbered per-check IDs; `rcode/references/sprint-checker-playbook.md:68-79` defines 12 *verification dimensions*, also not numbered 8.5/12/13-style | Native piece (wave-overlap) in scope conceptually; the numbering/CHAIN-LOG system itself is out of scope (consuming project's invention) |
| 4 | Cost/token signals ($21.97, 104.6k/158.7k-token sub-agents for narrow tasks) corroborate token-tax findings | **TRUE — already documented by an existing sibling audit** | `.planning/audits/AUDIT-token-cost.md` — Finding 1 documents every SPRINT.md unconditionally `@`-including the 1,000+ line `execute.md` orchestrator instead of the 613-line `execute-sprint.md` executor recipe; Finding 2 documents this repo's own `mode: yolo` config forecloses the one documented low-cost path | In scope, but no new work needed here — already tracked, see Further Audit Plan item 3 |

---

## Finding 1 — full write-up: `<acceptance_criteria>` vs `<evidence>`/`<done>` is a real, unintended contract drift

The transcript's own framing ("mandatory check is conditional, so drift can happen
silently") undersells the bug. The real picture, verified from source:

**The planner's actual, followed contract never emits `<acceptance_criteria>` at all.**

- `rcode/agents/rcode-planner.md:12` `@`-includes `rcode/references/planner-playbook.md`
  as the agent's system prompt.
- `rcode/references/planner-playbook.md:25-34` (Task Anatomy) and `:159-193` (canonical
  Plan Structure template) define the task schema as `<files>`, `<action>`,
  `<verify><automated>`, `<done>`, `<evidence>` — **no `<acceptance_criteria>` tag
  anywhere.** `<evidence>` is called out as "**REQUIRED** (issue #649)... A task
  without `<evidence>` is theoretical and MUST NOT be written."
- `rcode/templates/sprint.md:23-27` — the literal template file
  `rcode-planner.md:29` instructs the agent to use — has `<verify>`, `<done>{measurable
  acceptance criteria}</done>`, `<evidence>{grep/lines/creates evidence per issue
  #649}</evidence>`. Same schema, same omission.
- `rcode/agents/rules/planner/task-templates.md` (11 worked examples, loaded on-demand
  per the playbook's table) — every example uses `<done>[Measurable acceptance
  criteria]</done>`, never a literal `<acceptance_criteria>` tag.

**The programmatic, actually-enforced check only validates `<evidence>`.**

- `rcode/references/sprint-checker-playbook.md:68-79` lists the 12 verification
  dimensions sprint-checker grades. Dimension 12, "Evidence Grounding (issue #649)," is
  the only one about task-body content shape, and it's explicitly marked **critical**
  (`:95` — "Block execution if critical dimensions fail (Evidence Grounding is
  critical)").
- `.rcode/bin/rcode-tools.cjs:5104` `cmdPlanValidateEvidence()` — the actual code the
  playbook tells sprint-checker to run (`:89-93`, `plan validate-evidence <phase>
  --spot-check`) — greps for `<evidence>...</evidence>` (`:5170`) and nothing else.
  There is no equivalent `validate-acceptance-criteria` function anywhere in the
  4,700-line file (`grep -n "acceptance_criteria" .rcode/bin/rcode-tools.cjs` → 0
  hits).

**Meanwhile the consumer side still expects `<acceptance_criteria>` as a real, distinct tag.**

- `rcode/workflows/execute-sprint.md:200-205` — task-completion precedence lists three
  tiers: `<verify><automated>` (highest), `<done>`, `<acceptance_criteria>` (lowest),
  plus a "MANDATORY acceptance_criteria check" that only fires "if it has
  `<acceptance_criteria>`."
- `rcode/workflows/plan-spawn-planner.md:117` (the actual prompt text fed to the
  planner subagent when spawned by `/rcode-plan`) states `<acceptance_criteria>` is
  "MANDATORY on every task," and its own `<quality_gate>` checklist at `:328` repeats
  "Every task has `<acceptance_criteria>` with grep-verifiable conditions" — but this
  checklist item cites no dimension number and has never been reconciled with
  Dimension 12 (Evidence Grounding), which is the dimension that's actually wired to a
  programmatic check.

**This is a byproduct of a real, dated schema-unification commit that didn't audit the consumer side.**

`git log -p -- rcode/templates/sprint.md rcode/references/planner-playbook.md` shows
commit `2894765` ("fix(planner): unify task-output schema across templates and
playbook", closes #981-#983, 2026-07-30) deliberately rewrote
`planner-playbook.md`, `sprint.md`, and `task-templates.md` to the current
`<verify>`/`<done>`/`<evidence>` shape so it would match `scanner.js`'s parser. That
commit's diff (`git show --stat 2894765`) touches exactly those 3 files —
`execute-sprint.md`, `execute.md`, and `plan-spawn-planner.md` are untouched. The
producer side (what the planner is told to write) was unified around `<evidence>`;
the consumer side (what execute-sprint.md checks for, what plan-spawn-planner.md's
prompt demands) was never updated to match. This is the same bug class as #1012
(rcode-verifier's `status:`/`result:` key drift): a schema change landed on one side
of a producer→consumer contract and nothing failed loudly on the other side, because
the check is soft ("if it has").

**Verdict on the transcript's own question ("deliberate flexibility or unintended
gap?"):** unintended gap. The commit message and issue trail (#981-#983 vs #649) show
two different fix efforts touching the same schema at different times without cross-
referencing each other's consumer surface.

**Not applied as a fix here** (per the task's own instruction to keep fixes small/safe
and this deliverable focused on findings): resolving this requires a judgment call —
either (a) drop `<acceptance_criteria>` from `execute-sprint.md`/`execute.md`/
`plan-spawn-planner.md` and rely on `<done>` + `<evidence>` (matches what's actually
enforced today), or (b) add `<acceptance_criteria>` back to the planner's real
template/playbook/task-templates.md and to `validate-evidence`'s check (restores the
three-tier precedence execute-sprint.md already documents). That's a real design
decision, not a mechanical patch, so it's left for a scoped follow-up rather than an
inline `/rcode-quick` fix.

**Recommendation:** file a GH issue in the style of #1012 (Problem / Workaround /
Notes for whoever picks this up). Not yet filed — confirmed via `gh issue list
--search "acceptance_criteria"` (0 results) that this isn't already tracked.

---

## FURTHER AUDIT PLAN

1. **Audit every "MANDATORY... if it has" / soft-conditional check in
   `execute-sprint.md` and `execute.md` against what `rcode-planner`,
   `rcode-executor`, and `rcode-verifier` actually emit.** Reason: finding 1 and
   the already-closed #1012 are the same bug class (consumer expects a field the
   producer's real template doesn't guarantee); there is no reason to believe these
   are the only two instances — a dedicated pass through `execute-sprint.md`'s full
   task-completion-precedence section and `execute.md`'s `uat_gate`/review-gate
   parsing would likely surface more.

2. **Reconcile `rcode/workflows/plan-spawn-planner.md`'s `<quality_gate>` checklist
   (`:317-333`) against `rcode/references/sprint-checker-playbook.md`'s actual 12
   dimensions.** Reason: the checklist cites "Dimension 8" and "Dimension 2" for
   `<verify>` and `<done>` but never mentions Dimension 12 (Evidence Grounding,
   issue #649) — the one dimension that's actually backed by a programmatic
   `validate-evidence` check — suggesting this checklist predates #649 and was never
   updated when the schema-unification commit (`2894765`) landed.

3. **Do a synthesis/dedup pass across the ~40 files already in `.planning/audits/`
   before filing new GH issues from any of them**, starting with
   `AUDIT-token-cost.md` and `AUDIT-schema-drift.md`. Reason: this transcript's
   signal 4 (cost/token overhead) is already independently and more thoroughly
   documented in `AUDIT-token-cost.md` (15 ranked findings, real Phase 44 evidence);
   filing a fresh issue from this transcript alone would duplicate work that's
   already scoped and ranked.

4. **Audit `rcode/references/gates.md` and `sprint-checker-playbook.md`'s dimension
   list for user-facing discoverability** (e.g. is either surfaced from
   `docs/REFERENCE.md` or a README, or only reachable via the "read on-demand"
   `@`-include comment in `plan.md:52`?). Reason: signal 3 showed a real consuming
   project reverse-engineering its own numbered gate/debt-tracking system
   (`CHAIN-LOG.md`, "Gate 8.5/12/12.5/13") apparently without knowing rcode already
   ships an equivalent concept (4 gate types + 12 verification dimensions) — worth
   checking whether that's a genuine discoverability gap or this transcript's project
   simply chose to roll its own for reasons unrelated to rcode's docs.

5. **Grep the full `rcode/` + `.rcode/` tree for other `<tag>` names referenced in
   consumer-side workflows but absent from the producer-side templates/playbooks
   that actually get `@`-included into planner/executor agent prompts** (e.g.
   `<interfaces>`, `<read_first>`, `<key_links>` — anything mentioned in
   `plan-spawn-planner.md`'s deep-work rules or quality gate but not present in
   `planner-playbook.md`'s canonical template). Reason: finding 1 was found by
   diffing exactly two files by hand; a systematic tag-inventory diff across all
   producer/consumer file pairs would catch the rest of this class in one pass
   instead of one grep at a time.
