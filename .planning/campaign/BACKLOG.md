# GitHub Ticket Campaign — Backlog

Repo: hanzlahabib/rcode (this repo, rihal-code). Integration branch: `campaign-github-tickets`.
Landing: commit locally only — no push, no PR, per user instruction (2026-09-03).
Baseline: `node --test` = 664/664 passing on `main` before this campaign started.

## Started with 33 open issues (+ #1067 fixed same session before campaign start)

**26 closed this campaign** — most (#947, #949, #1034, #1035, #1038-1035, #1040-1059 minus gaps) turned out to already be fully fixed in code, just never closed after merge. Full evidence trail is in each issue's closing comment on GitHub, not duplicated here.

**4 issues split off from stale/oversized originals**: #1068, #1069 (from #110), #1070 (detection-depth follow-up from #1058), #1066 narrowed in place (installInner only, cmdState half now tracked by #204).

## Still open / in flight

- [~] #204 — refactor(cli): rcode-tools.cjs split (cmdState/cmdPhase). Approved, execution agent running (4-step phased plan).
- [ ] #1066 — refactor(cli): cli/install.js installInner() split (narrowed scope). Not yet planned in detail.
- [x] #1068 — docs: PLAN.md → SPRINT.md refs. Fixed (99c18b4), merged to campaign-github-tickets. Open on GitHub until landed to main.
- [x] #1069 — fix(state): entry.plans vs entry.sprints[] unify. Fixed (e61872e), merged to campaign-github-tickets. Open on GitHub until landed to main.
- [ ] #1036 — persona-owned sprint execution refusal. Mitigation shipped; needs a LIVE /rcode-execute dispatch to verify, not code work. Left open with status comment.
- [x] #958 — already fully implemented (28th such finding). Closed with evidence.
- [x] #968 — already resolved as a side effect of #958. Closed with evidence.
- [ ] #1070 — feat(review): detection-depth gap vs Codex (new, filed 2026-09-03). Not yet scoped/started.
- [ ] #1071 — chore(memory): this repo's own Memory Bank has real drift (new, filed 2026-09-03, found while verifying #958). Small, self-contained.

## Done (this session, outside the original 33)

- #1067 — prompt-router false-positive fix (fixed before campaign started)
