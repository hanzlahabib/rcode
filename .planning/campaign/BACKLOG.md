# GitHub Ticket Campaign — Backlog

Source: `gh issue list --repo hanzlahabib/rcode --state open` (re-verified 2026-09-03 against a fresh fetch after catching a transcription error in the first draft of this file — issue numbers/titles below are copied mechanically from that fetch, not retyped by hand).
Repo: hanzlahabib/rcode (this repo, rihal-code). Integration branch: `campaign-github-tickets`.
Landing: commit locally only — no push, no PR, per user instruction (2026-09-03).
Baseline: `node --test` = 664/664 passing on `main` before this campaign started.

## Special handling — plan-first, no autonomous execution (one-way architectural changes)

- [ ] **#110** refactor(core): simplify hierarchy — Phase → Sprint → Story/Task (remove Plan level)
- [ ] **#179** refactor(skills): deep folder reorganization under role directories
- [ ] **#204** refactor(cli): rihal-tools.cjs is 3691 lines — split into lib/ modules per subcommand family

These three get a PLAN produced by an agent, then come back to the user for explicit go/no-go before any code changes.

## Wave queue — oldest first, everything else

- [ ] #946 feat(agents): route natural-language build/plan intent to rcode commands via AGENTS.md rule
- [ ] #947 feat(hooks): SessionStart greeter — surface active phase + next command on session open
- [ ] #949 perf(cli): fold/cache rcode-tools calls per workflow run to cut cold-start parses
- [ ] #950 feat(workflows): auto-scale plan pipeline depth by effort tier — skip hops for trivial work
- [ ] #958 feat(memory): memory bank is pull-only and goes stale — add relevance-ranked injection + drift detection
- [ ] #968 feat(dashboard): Memory view shows only byte counts — surface freshness ages and drift results
- [ ] #1034 council's Next-Up suggestion recommends /rcode-plan before a phase exists
- [ ] #1035 council panel scorer used substring matching, causing keyword collisions (e.g. 'storage' -> 'rag')
- [ ] #1036 persona-owned sprint execution (owner: field) refused by the persona when spawned outside a real /rcode-execute dispatch
- [ ] #1038 fix(progress): zero-padded phase dirs never matched state.json phase numbers
- [ ] #1039 fix(state): sync --from-disk did not read status from disk
- [ ] #1040 fix(verifier): phase completion was never written back to state.json
- [ ] #1041 fix(hooks): stop-verify reported valid jsonc configs as broken, on every stop
- [ ] #1042 fix(planner): sprint verify blocks accepted assertions that can never fail
- [ ] #1043 feat(progress): nothing detected a verified phase that was never recorded complete
- [ ] #1044 feat(verifier): phase verification was self-certified with nothing testing the conclusion
- [ ] #1045 feat(verifier): reachability was checked for UI routes only, so backend dead code passed
- [ ] #1046 feat(planner): planning had no design or guard-shape review, only goal coverage
- [ ] #1047 feat(orchestrator): no registered orchestrator owned the run
- [ ] #1048 feat(hooks): a crashing hook repeated its error on every event forever
- [ ] #1049 feat(agent-rules): agents were pushed against over-claiming and biased into under-claiming
- [ ] #1050 feat(agent-rules): personas could not redirect, and dispatched agents could post to github
- [ ] #1051 fix(roadmap): get-phase could not parse the roadmap shapes roadmapper writes
- [ ] #1052 feat(planner): project artifacts had no glossary, assumptions index, or stakes-scaled depth
- [ ] #1053 feat(verifier): verification criteria were invented at verification time, not written with the requirement
- [ ] #1054 fix(phases): stale phase directory names after a roadmap rewrite were undetectable
- [ ] #1055 feat(planner): nothing prevented roadmaps from being cut into horizontal layers
- [ ] #1056 fix(install): rcode skills never reached codex, and its agents never can
- [ ] #1057 feat(memory): run reasoning was lost on resume and local customizations on update
- [ ] #1058 fix(review): rcode's reviewer was invisible to the model, and thinner than it should be — SUPPORTING EVIDENCE 2026-09-03: a Codex CLI review of an unrelated repo's PR caught 4 real bugs (a rolling-deploy data-loss race, a worker-crash-on-config-swap risk, an unbounded-dispatch gap, a file-size-rule violation) that rcode's own audit personas (one manual pass + two specialist subagents) missed entirely on the same diff. Feed this into the fix: the reviewer needs to catch this class of finding, not just structure/style issues.
- [ ] #1059 fix(install): no markdown template was ever installed, only starter projects
- [ ] #1066 refactor(cli): cmdState() and installInner() are 2858- and 1012-line single functions handling ~50 unrelated subcommands

(#1067 already fixed and committed on main this session — not in this campaign.)
