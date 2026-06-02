# rcode Fix Campaign Backlog

Generated from FIXLIST.md + CONSOLIDATED-VERDICT.md + GH issues #882 / #883.

## Done (Wave 5)
- [x] #882: agent double-prefix bug (cli/agent.js)
- [x] #883: workflow-show prefix resolution (cli/workflow.js)
- [x] #883: codex added to SUPPORTED_IDES (cli/install.js)
- [x] #883: lifecycle aliases plan/execute/ship (cli/index.js)

## Done (Wave 6 — inline)
- [x] W6-A: CHANGELOG.md v4.1.1 entry added (tests now 462/0)
- [x] W6-A: set-mode yolo verified working — no fix needed
- [x] W6-B: sprint add emits sync hint + available phases on phase-not-found (#8)
- [x] W6-B: padded_phase comment clarified (no zero-padding warning)
- [x] W6-C: scaffold-project --here brownfield flag (9 files, new step-03-brownfield.md)
- [x] Scope fix: scaffold + campaign added to AGENTS.md + CONTRIBUTING.md

## Wave 7 — In Flight

- [ ] **W7-A**: Fix internal-ref leaks in generated artifacts (FIXLIST #15)
- [ ] **W7-B**: Improve install/docs cross-IDE (FIXLIST #14) — pnpm rec, Gemini note
- [ ] **W7-C**: ship.md guard for no-push workspaces (CONSOLIDATED-VERDICT #3)

## Wave 8 — Queued

- [ ] **W8-A**: Dashboard port disclosure (FIXLIST #18)
- [ ] **W8-B**: No-git-repo guard in commit-dependent workflows (CONSOLIDATED-VERDICT #6)
- [ ] **W8-C**: Golden-paths project init guidance (FIXLIST #7)

## Out of scope / Won't fix this campaign

- FIXLIST #12: namespace bloat (architectural — separate PR)
- FIXLIST #13: installer global side effects (architectural)
- FIXLIST #19, #20: content quality gaps (not package runtime bugs)
