# Verifier Playbook

Loaded by `rcode-verifier` via `@-include`. Contains the full verification
flow, final status tables, on-demand rule files, and success criteria checklist.

The agent stub holds the role definition, critical rules, constraints, and
@-include list.

**Calibration:** follow the Calibration discipline section of
`@rcode/references/agent-shared-rules.md`. Reporting a gap the evidence does not
support is the same defect as missing one — report the level the evidence supports,
and every hedge must name the specific thing you did not check.

---

## Project Context Loading

Before verifying, discover project context:

- **Project instructions:** Read `./CLAUDE.md` if it exists. Follow project-specific guidelines.
- **Project skills:** Check `.agent/skills/` or `.agents/skills/` directories. Load relevant `SKILL.md` indexes and `rules/*.md` files as needed during verification.

---

## Core Principle

**Task completion ≠ Goal achievement.** A task "create chat component" can be marked complete when the component is a placeholder. Goal-backward verification asks:

1. What must be TRUE for the goal to be achieved?
2. What must EXIST for those truths to hold?
3. What must be WIRED for those artifacts to function?
4. What data must FLOW for those artifacts to be real?

---

## Verification Flow (Slim)

1. **Check for previous VERIFICATION.md** — if exists with gaps, enter RE-VERIFICATION MODE (skip to Step 3).
2. **Load context** — SPRINT.md, SUMMARY.md, ROADMAP.md goal, REQUIREMENTS.md. If CONTEXT.md exists for this phase, read its `## Claude's Discretion` section — each item there is a decision `/rcode-discuss-phase` deferred to implementation time (e.g. "entry point left to Claude's judgment"). Nothing downstream currently checks these were actually resolved as claimed; Step 3 below folds each one into must-haves instead of letting it silently disappear.
3. **Establish must-haves** — from PLAN frontmatter (Option A), ROADMAP success criteria (Option B), or derive from goal (Option C). **Also fold in CONTEXT.md's discretion items (if any from Step 2):** each one becomes its own must-have truth to verify (e.g. "entry point left to Claude's judgment" → truth: "the feature has a real, working entry point — check what was actually built, not just that something exists"). A deferred decision that never got checked isn't verified, it's forgotten.
4. **Verify observable truths** — for each truth, status ✓ VERIFIED / ✗ FAILED / ? UNCERTAIN.
5. **Verify artifacts (4 levels)** — exists, substantive, wired, data-flows. Use `rcode-tools.cjs verify artifacts`.
6. **Data-flow trace (Level 4)** — for wired artifacts rendering dynamic data, trace upstream to confirm real data source.
6c. **Production reachability (Level 5b) — EVERY phase, including backend-only.**
For each non-UI module this phase delivered, list its importers and classify them
production vs test. If every importer is a test file, the phase shipped dead code
and this is a BLOCKING FAIL. Then read what production actually calls for this
behaviour: if it re-implements the behaviour inline instead of calling the
delivered module, that is two implementations side by side — the tested one
unreachable, the shipped one unverified — and is also a BLOCKING FAIL regardless
of a green suite. See `reachability-check.md` Step 6c.

6b. **Reachability (Level 5)** — for any artifact that is a user-facing route/page/screen: is it linked from the app's actual navigation (nav bar, sidebar, a button/link a real user would click), not just directly URL-addressable? See `reachability-check.md`. A page that only a developer typing its exact URL can reach is NOT reachable.
7. **Verify key links** — component→API, API→DB, form→handler, state→render. Use `rcode-tools.cjs verify key-links`.
8. **Requirements coverage** — cross-reference PLAN `requirements:` against REQUIREMENTS.md. Flag ORPHANED.
9. **Anti-pattern scan** — TODO/FIXME/placeholder/empty-return/hardcoded-empty. Classify Blocker/Warning/Info.
10. **Behavioral spot-checks** — run 2-4 quick commands (<10s each) against runnable code. Skip if no runnable entry points.
10b. **Live UI smoke check (UI-facing phases only)** — start the dev server if not already running, hit the phase's actual entry point (the URL a real user would land on, e.g. `/`, not just the new route directly), and confirm the delivered feature is reachable from there. See `reachability-check.md`. Skip only for phases with no user-facing route.
11. **Human verification needs** — visual, real-time, external service, uncertain wiring. Flagging an item here does NOT mean it passed — it means a human still needs to look before this phase can be called done.
12. **Determine status** — passed | gaps_found | human_needed. Score = verified_truths / total_truths. **`human_needed` and `gaps_found` are NOT "complete" or "shippable"** — say that plainly in the summary handed back to the orchestrator so it isn't rounded up to a checkmark.
13. **Structure gap output** — YAML frontmatter for `/rcode-plan --gaps`.
14. **Create VERIFICATION.md** — use Write tool (never heredoc). Return to orchestrator. DO NOT COMMIT.

---

## Final Status Tables

**Artifact status (all 4 levels):**

| Exists | Substantive | Wired | Data Flows | Status |
| ------ | ----------- | ----- | ---------- | ------ |
| ✓ | ✓ | ✓ | ✓ | ✓ VERIFIED |
| ✓ | ✓ | ✓ | ✗ | ⚠️ HOLLOW — wired but data disconnected |
| ✓ | ✓ | ✗ | - | ⚠️ ORPHANED |
| ✓ | ✗ | - | - | ✗ STUB |
| ✗ | - | - | - | ✗ MISSING |

**For user-facing routes/pages, add a 5th column — Reachable (linked from the app's real navigation, confirmed by a live smoke check):**

| ...Levels 1-4 | Reachable | Status |
| --- | --- | --- |
| all ✓ | ✓ | ✓ VERIFIED |
| all ✓ | ✗ | ⚠️ ORPHANED-FROM-UI — code works, no real user can find it |

**Overall status decision:**

- **passed** — All truths VERIFIED, all artifacts pass levels 1-4 (and level 5 Reachable for UI-facing artifacts), all key links WIRED, no blocker anti-patterns.
- **gaps_found** — Any truth FAILED, artifact MISSING/STUB/ORPHANED-FROM-UI, key link NOT_WIRED, or blocker anti-patterns found.
- **human_needed** — All automated checks pass but items flagged for human verification.

**None of these three statuses means "done" or "shippable" on their own except `passed` with zero open human-verification items.** Never let a phase get summarized to the user as complete/closed/shippable while `gaps_found` or unresolved `human_needed` items exist — say what's actually still open.

---

## On-Demand Rule Files

| When you need... | Read |
|---|---|
| Previous-verification check + load context + establish must-haves (Steps 0-2) | `.rcode/agents-rules/verifier/context-loading.md` |
| Observable truths + 3-level artifact verification (Steps 3-4) | `.rcode/agents-rules/verifier/artifact-verification.md` |
| Level-4 data-flow trace patterns (Step 4b) | `.rcode/agents-rules/verifier/data-flow-trace.md` |
| Level-5 reachability + live UI smoke check (Steps 6b, 10b) | `.rcode/agents-rules/verifier/reachability-check.md` |
| Key link wiring fallback patterns (Step 5) | `.rcode/agents-rules/verifier/key-links.md` |
| Requirements coverage + orphaned detection (Step 6) | `.rcode/agents-rules/verifier/requirements-coverage.md` |
| Anti-pattern grep commands + stub reference patterns (Step 7) | `.rcode/agents-rules/verifier/anti-patterns.md` |
| Behavioral spot-check command examples (Step 7b) | `.rcode/agents-rules/verifier/behavioral-spot-checks.md` |
| Status determination + gap YAML structure (Steps 8-10) | `.rcode/agents-rules/verifier/gap-output.md` |
| VERIFICATION.md template + return-to-orchestrator format | `.rcode/agents-rules/verifier/verification-report.md` |

Read these ONLY when the current step needs them. Don't preemptively load.

---

## Success Criteria

- [ ] Previous VERIFICATION.md checked (Step 0)
- [ ] Must-haves loaded (re-verification) or established (initial mode)
- [ ] All truths verified with status and evidence
- [ ] All artifacts checked at levels 1-3 (exists, substantive, wired)
- [ ] Data-flow trace (Level 4) run on wired artifacts that render dynamic data
- [ ] Reachability (Level 5) checked for every user-facing route/page — linked from real nav, confirmed by a live smoke check, not just directly URL-addressable
- [ ] All key links verified
- [ ] Requirements coverage assessed (if applicable)
- [ ] Anti-patterns scanned and categorized
- [ ] Behavioral spot-checks run on runnable code (or skipped with reason)
- [ ] Human verification items identified
- [ ] Overall status determined
- [ ] Gaps structured in YAML frontmatter (if gaps_found)
- [ ] Re-verification metadata included (if previous existed)
- [ ] VERIFICATION.md created via Write tool
- [ ] Results returned to orchestrator (NOT committed)
