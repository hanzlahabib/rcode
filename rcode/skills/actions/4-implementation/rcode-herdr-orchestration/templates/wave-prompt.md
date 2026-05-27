# Wave-Agent Prompt Template

Use this as the body of `herdr pane send-text` when dispatching each agent in a wave. Replace the placeholders.

---

```
You are in an isolated worktree at <WORKTREE_PATH> on branch <BRANCH_NAME>. <REPO_NAME> repo.

YOUR PARENT BRANCH IS <INTEGRATION_BRANCH> (NOT master). Your branch was forked from <INTEGRATION_BRANCH>. When you finish, the orchestrator will merge your branch INTO <INTEGRATION_BRANCH> (not master). Master stays untouched throughout the campaign.

If you need to pull the latest parent work (rare, only between waves):
  git fetch origin
  git merge origin/<INTEGRATION_BRANCH> --no-edit

CAMPAIGN MODE — pick top 3-5 pending P1/P2 items from <AUDIT_DOC_PATH> and ship them. Long-running autonomous fix campaign — your branch will be merged into the campaign integration branch when done.

PROTOCOL
1. Read <AUDIT_DOC_PATH> fully. Identify items marked pending, ⏳, [ ], TODO, or labeled P1/P2 that are NOT already shipped (cross-reference `git log <INTEGRATION_BRANCH>` to avoid double-fixing).
2. Pick 3-5 items that are surgical, well-scoped, and unrelated to other in-flight campaign agents (no overlap with: <IN_FLIGHT_AREAS>).
3. Implement each item as a small, separately-committed change. Conventional commit format (e.g. `fix(area): summary` / `feat(area): summary`). Each commit message must reference the audit finding.
4. STRICT auto-heal from project CLAUDE.md while editing:
   - super_admin in role filters
   - no silent .catch(()=>{}) — use logger.warn with reason
   - no React.FC, no style={{}}, no raw <button> (use Button component)
   - no alert()/confirm() — use toast/AlertDialog
   - Prisma schema changes need migration files via `prisma migrate dev --create-only --name <slug>`
   - new /api routes need server/middleware/routeSecurity.js MANIFEST entries
5. Keep TSC at baseline. Run `pnpm tsc --noEmit` before final commit. If you introduce a NEW error, fix it before committing.
6. STAY on branch <BRANCH_NAME>. Do NOT push. Do NOT merge to master. Do NOT merge to <INTEGRATION_BRANCH>. Do NOT touch other audit areas.
7. End with a short numbered summary listing each commit (hash + one-line message) and what audit item it addressed.

DO NOT
- Touch master at all
- Merge into the integration branch (the orchestrator does that — your job is to commit on your own branch and stop)
- Touch out-of-scope code outside the audit area
- Add new abstractions or refactor wholesale
- Make schema changes without a migration file
- Write tests "as a bonus" unless the audit specifically called for them
- Push to origin

Begin by reading the audit doc and listing the candidate items you'll fix.
```

---

## Placeholders

| Placeholder | Source |
|---|---|
| `<WORKTREE_PATH>` | `../sm-worktrees/camp-<area>` |
| `<BRANCH_NAME>` | `campaign-<area>` |
| `<INTEGRATION_BRANCH>` | `campaign-integration` (default) or `campaign-<topic>` for named campaigns |
| `<REPO_NAME>` | e.g. `LeadLyze` |
| `<AUDIT_DOC_PATH>` | `.planning/audits/AUDIT-<area>.md` |
| `<IN_FLIGHT_AREAS>` | Comma-list from STATE.md |

## When to deviate from this template
- **Heavy schema work**: add explicit migration-naming guidance and require `prisma migrate diff` review before commit.
- **Pure UI/CSS area**: drop the routeSecurity MANIFEST bullet, add "use design tokens not hex codes".
- **Authentication / RBAC area**: add "no role-relation rename without checking every call site; super_admin always included".

## Related templates
- `BACKLOG-template.md` — initial backlog format
- `heartbeat.sh` — secondary heartbeat process

## Related rules
- `rules/integration-branch.md` — why the parent branch is `<INTEGRATION_BRANCH>` and not master
- `rules/merge-strategy.md` — what happens after sub-agent commits land on the branch
