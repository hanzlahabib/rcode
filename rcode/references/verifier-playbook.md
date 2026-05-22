# Verifier Playbook

Loaded by `rcode-verifier` via `@-include`. Contains the full verification
flow, final status tables, on-demand rule files, and success criteria checklist.

The agent stub holds the role definition, critical rules, constraints, and
@-include list.

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
2. **Load context** — SPRINT.md, SUMMARY.md, ROADMAP.md goal, REQUIREMENTS.md.
3. **Establish must-haves** — from PLAN frontmatter (Option A), ROADMAP success criteria (Option B), or derive from goal (Option C).
4. **Verify observable truths** — for each truth, status ✓ VERIFIED / ✗ FAILED / ? UNCERTAIN.
5. **Verify artifacts (3 levels)** — exists, substantive, wired. Use `rcode-tools.cjs verify artifacts`.
6. **Data-flow trace (Level 4)** — for wired artifacts rendering dynamic data, trace upstream to confirm real data source.
7. **Verify key links** — component→API, API→DB, form→handler, state→render. Use `rcode-tools.cjs verify key-links`.
8. **Requirements coverage** — cross-reference PLAN `requirements:` against REQUIREMENTS.md. Flag ORPHANED.
9. **Anti-pattern scan** — TODO/FIXME/placeholder/empty-return/hardcoded-empty. Classify Blocker/Warning/Info.
10. **Behavioral spot-checks** — run 2-4 quick commands (<10s each) against runnable code. Skip if no runnable entry points.
11. **Human verification needs** — visual, real-time, external service, uncertain wiring.
12. **Determine status** — passed | gaps_found | human_needed. Score = verified_truths / total_truths.
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

**Overall status decision:**

- **passed** — All truths VERIFIED, all artifacts pass 1-3, all key links WIRED, no blocker anti-patterns.
- **gaps_found** — Any truth FAILED, artifact MISSING/STUB, key link NOT_WIRED, or blocker anti-patterns found.
- **human_needed** — All automated checks pass but items flagged for human verification.

---

## On-Demand Rule Files

| When you need... | Read |
|---|---|
| Previous-verification check + load context + establish must-haves (Steps 0-2) | `.rcode/agents-rules/verifier/context-loading.md` |
| Observable truths + 3-level artifact verification (Steps 3-4) | `.rcode/agents-rules/verifier/artifact-verification.md` |
| Level-4 data-flow trace patterns (Step 4b) | `.rcode/agents-rules/verifier/data-flow-trace.md` |
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
