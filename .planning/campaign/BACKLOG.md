# rcode Fix Campaign Backlog

Generated from FIXLIST.md + CONSOLIDATED-VERDICT.md + GH issues #882 / #883.
Updated as items are completed.

## Done (Wave 5)
- [x] #882: agent double-prefix bug (cli/agent.js)
- [x] #883: workflow-show prefix resolution (cli/workflow.js)
- [x] #883: codex added to SUPPORTED_IDES (cli/install.js)
- [x] #883: lifecycle aliases plan/execute/ship (cli/index.js)

## Wave 6 — In Flight

- [ ] **W6-A**: Add CHANGELOG.md entry for v4.1.1 (fixes pre-existing test failure)
- [ ] **W6-B**: Fix phase/sprint helpers inconsistency (FIXLIST #8) — padded_phase, null phase_slug, sprint add rejection  
- [ ] **W6-C**: Fix scaffold-project brownfield / --here path (FIXLIST #10)

## Wave 7 — Queued

- [ ] **W7-A**: Fix internal-ref leaks in generated artifacts (FIXLIST #15)
- [ ] **W7-B**: Improve install docs cross-IDE (FIXLIST #14) — pnpm rec, Gemini note
- [ ] **W7-C**: Fix golden-paths project init guidance (FIXLIST #7)
- [ ] **W7-D**: ship.md guard for no-push workspaces (CONSOLIDATED-VERDICT #3)

## Wave 8 — Queued

- [ ] **W8-A**: Dashboard port disclosure (FIXLIST #18)
- [ ] **W8-B**: set-mode yolo availability (CONSOLIDATED-VERDICT #5)
- [ ] **W8-C**: No-git-repo guard in commit-dependent workflows (CONSOLIDATED-VERDICT #6)

## Out of scope / Won't fix this campaign

- FIXLIST #12: namespace bloat (architectural — separate PR)
- FIXLIST #13: installer global side effects (architectural)
- FIXLIST #19, #20: content quality gaps (not package runtime bugs)
