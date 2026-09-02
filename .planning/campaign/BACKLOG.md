# GitHub Ticket Campaign — Backlog

Repo: hanzlahabib/rcode (this repo, rihal-code). Integration branch: `campaign-github-tickets`.
Landing: commit locally only — no push, no PR, per user instruction (2026-09-03).
Baseline: `node --test` = 664/664 passing on `main` before this campaign started.

## Started with 33 open issues (+ #1067 fixed same session before campaign start)

**26 closed this campaign** — most (#947, #949, #1034, #1035, #1038-1035, #1040-1059 minus gaps) turned out to already be fully fixed in code, just never closed after merge. Full evidence trail is in each issue's closing comment on GitHub, not duplicated here.

**4 issues split off from stale/oversized originals**: #1068, #1069 (from #110), #1070 (detection-depth follow-up from #1058), #1066 narrowed in place (installInner only, cmdState half now tracked by #204).

## Still open / in flight

- [x] #204 — refactor(cli): rcode-tools.cjs split (cmdState/cmdPhase). Done: 7827→4258 lines, 9 new lib/*.cjs modules, 668/668 tests. First attempt's worktree hit git corruption (interrupted process, empty objects) — isolated to that unmerged branch, main/campaign both verified healthy throughout, salvaged files reused for the successful retry. Also caught+fixed a real installed-mirror sync bug post-merge (0ab045d6). Merged to campaign-github-tickets, open on GitHub until landed to main.
- [ ] #1066 — refactor(cli): cli/install.js installInner() split (narrowed scope). Not yet planned in detail.
- [x] #1068 — docs: PLAN.md → SPRINT.md refs. Fixed (99c18b4), merged to campaign-github-tickets. Open on GitHub until landed to main.
- [x] #1069 — fix(state): entry.plans vs entry.sprints[] unify. Fixed (e61872e), merged to campaign-github-tickets. Open on GitHub until landed to main.
- [ ] #1036 — persona-owned sprint execution refusal. Mitigation shipped; needs a LIVE /rcode-execute dispatch to verify, not code work. Left open with status comment.
- [x] #958 — already fully implemented (28th such finding). Closed with evidence.
- [x] #968 — already resolved as a side effect of #958. Closed with evidence.
- [ ] #1070 — feat(review): detection-depth gap vs Codex (new, filed 2026-09-03). Not yet scoped/started.
- [x] #1071 — chore(memory): this repo's own Memory Bank has real drift. Fixed (bfffefa), merged to campaign-github-tickets. Open on GitHub until landed to main.

## Done (this session, outside the original 33)

- #1067 — prompt-router false-positive fix (fixed before campaign started)
