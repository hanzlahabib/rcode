<purpose>
Push a verified feature branch and open a pull request with an auto-generated
body drawn from planning artifacts (ROADMAP, VERIFICATION, SUMMARY). Closes
the plan → execute → verify → **ship** loop.

**What this command does:**
1. Runs preflight: clean tree, on a feature branch, VERIFICATION.md passed, gh CLI authenticated
2. Pushes the branch to origin
3. Generates a rich PR body — phase goal, list of changes, requirements addressed, verification status
4. Creates the PR via `gh pr create`
5. Optionally requests a reviewer
6. Updates STATE.md with shipping status

**Preconditions (all must be true before running):**
- `/rcode-execute <phase>` completed
- `/rcode-verify-phase <phase>` passed (VERIFICATION.md exists with `status: passed`)
- You are on a feature branch (not main/develop directly)
- `gh` CLI is authenticated (`gh auth status`)

@.rcode/references/karpathy-guidelines.md

**This command is NOT for:**
- Publishing npm packages → use `npm publish`
- Creating git release tags → use `git tag -a vX.Y.Z && git push --tags`
- Repos that commit directly to main (`git.branching_strategy: none`)
- The rcode framework repo itself (no phases exist there)

**Typical usage:**
```
/rcode-plan 1          → plan the phase
/rcode-execute 1       → build it
/rcode-verify-phase 1  → prove it works
/rcode-ship 1          → PR it ← you are here
```
</purpose>

<prerequisites>

**Required before running `/rcode-ship`:**

1. **Git remote configured** — `git remote -v` must list at least one remote (typically `origin`). Without a remote, the push and PR steps will fail.
2. **`gh` CLI authenticated** — `gh auth status` must succeed. Without this, PR creation will fail.
3. **Clean working tree** — no uncommitted changes (`git status --short` returns nothing).
4. **On a feature branch** — not on `main` or `develop` directly.
5. **Verification passed** — `/rcode-verify-phase <phase>` must have run and produced a VERIFICATION.md with `status: passed`.

</prerequisites>

<warning>

**If your workspace has no git remote or `gh` is not authenticated, the push and PR steps will fail.**

Check before running:
```bash
git remote -v          # must list at least one remote
gh auth status         # must exit 0
```

**Manual fallbacks if these are missing:**

- **No remote:** Add one with `git remote add origin <repo-url>`, then re-run `/rcode-ship`. Or push manually:
  ```bash
  git push origin <branch>
  ```
  Then open a PR via the GitHub web UI at `https://github.com/<owner>/<repo>/compare/<branch>`.

- **`gh` not authenticated:** Run `gh auth login` to authenticate, then re-run `/rcode-ship`. Or create the PR directly at:
  ```
  https://github.com/<owner>/<repo>/compare/<branch>
  ```

- **Git worktree context:** If `.git` is a file (not a directory), you are in a worktree. Remotes are shared with the main repo — run `git remote -v` from the main repo root to verify. If the main repo has `origin`, the worktree inherits it automatically.

</warning>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<process>

<step name="initialize">
Parse arguments and load project state:

```bash
INIT=$(node ".rcode/bin/rcode-tools.cjs" init phase-op "${PHASE_ARG}" 2>/dev/null)
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

If `INIT` is empty or `INIT.ok` is false, print error and exit:
```
Error: rcode-tools init failed. Verify .rcode/ is installed and state.json is valid.
```

Parse from init JSON: `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `padded_phase`, `commit_docs`.

Also load config for branching strategy:
```bash
CONFIG=$(node ".rcode/bin/rcode-tools.cjs" state load)
```

Extract: `branching_strategy`, `branch_name`.

Detect base branch for PRs and merges:
```bash
BASE_BRANCH=$(node ".rcode/bin/rcode-tools.cjs" config-get git.base_branch 2>/dev/null || echo "")
if [ -z "$BASE_BRANCH" ] || [ "$BASE_BRANCH" = "null" ]; then
  BASE_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|^refs/remotes/origin/||')
  BASE_BRANCH="${BASE_BRANCH:-main}"
fi
```
</step>

<step name="preflight_checks">
Verify the work is ready to ship:

1. **Verification passed?**
   ```bash
   VERIFICATION=$(cat ${PHASE_DIR}/*-VERIFICATION.md 2>/dev/null)
   ```
   Check for `status: passed` or `status: human_needed` (with human approval).
   If no VERIFICATION.md or status is `gaps_found`: warn and ask user to confirm.

   **If proceeding with anything other than a clean `status: passed`** (i.e.
   `human_needed` or a user-confirmed `gaps_found`): the generated PR body
   (step below) MUST include a `## Known Gaps` section listing every
   unresolved human-verification item or gap from VERIFICATION.md — mirroring
   `complete-milestone.md`'s `### Known Gaps` pattern. This is not optional
   cosmetic detail: a PR shipped on `human_needed`/`gaps_found` without this
   section reads to a reviewer as fully verified when it isn't. Do not rely on
   the `## Verification` section's item list alone (below) to carry this —
   that section is easy to skim past; `## Known Gaps` must be its own
   clearly-labeled heading.

2. **Clean working tree?**
   ```bash
   git status --short
   ```
   If uncommitted changes exist: ask user to commit or stash first.

3. **On correct branch?**
   ```bash
   CURRENT_BRANCH=$(git branch --show-current)
   ```
   If on `${BASE_BRANCH}`: warn — should be on a feature branch.
   If branching_strategy is `none`: offer to create a branch now.

4. **Remote configured?**
   ```bash
   git remote -v | head -2
   ```
   Detect `origin` remote. If no remote: error — can't create PR.

   **If running in a git worktree** (`.git` is a file, not a directory): remotes are shared with the main repo. Run `git remote -v` from the main repo root to confirm — if the main repo has `origin`, run `git remote add origin <url>` in the worktree context or add the remote in the main repo, then retry `/rcode-ship`.

   **If not in a worktree:** Run `git remote add origin <url>` to add a remote, then retry `/rcode-ship`.

5. **`gh` CLI available?**
   ```bash
   which gh && gh auth status 2>&1
   ```
   If `gh` not found or not authenticated: provide setup instructions and exit.
</step>

<step name="push_branch">
Push the current branch to remote:

```bash
git push origin ${CURRENT_BRANCH} 2>&1
```

If push fails (e.g., no upstream): set upstream:
```bash
git push --set-upstream origin ${CURRENT_BRANCH} 2>&1
```

Report: "Pushed `{branch}` to origin ({commit_count} commits ahead of ${BASE_BRANCH})"
</step>

<step name="generate_pr_body">
Auto-generate a rich PR body from planning artifacts:

**1. Title:**
```
Phase {phase_number}: {phase_name}
```
Or for milestone: `Milestone {version}: {name}`

**2. Summary section:**
Read ROADMAP.md for phase goal. Read VERIFICATION.md for verification status.

```markdown
## Summary

**Phase {N}: {Name}**
**Goal:** {goal from ROADMAP.md}
**Status:** Verified ✓

{One paragraph synthesized from SUMMARY.md files — what was built}
```

**3. Changes section:**
For each SUMMARY.md in the phase directory:
```markdown
## Changes

### Plan {plan_id}: {plan_name}
{one_liner from SUMMARY.md frontmatter}

**Key files:**
{key-files.created and key-files.modified from SUMMARY.md frontmatter}
```

**4. Requirements section:**
```markdown
## Requirements Addressed

{REQ-IDs from plan frontmatter, linked to REQUIREMENTS.md descriptions}
```

**5. Testing section:**
```markdown
## Verification

- [x] Automated verification: {pass/fail from VERIFICATION.md}
- {human verification items from VERIFICATION.md, if any}
```

**5b. Known Gaps section (only when VERIFICATION.md status is not a clean `passed`):**
```markdown
## Known Gaps

This PR ships with `status: {human_needed|gaps_found}` per VERIFICATION.md, confirmed by the user in preflight.

- {gap/human-verification item 1 — file/truth + what's unconfirmed}
- {gap/human-verification item 2}
```
Omit this section entirely when VERIFICATION.md status is a clean `passed` with zero open items.

**6. Decisions section:**
```markdown
## Key Decisions

{Decisions from STATE.md accumulated context relevant to this phase}
```
</step>

<step name="create_pr">
**Before creating the PR, apply `@rcode/references/github-comment-style.md` to `${PR_BODY}`** —
no em-dashes, no gates/CI block, no git-process talk, no AI attribution. Run the
self-check greps in that reference; they must print nothing.

Create the PR using the generated body:

```bash
gh pr create \
  --title "Phase ${PHASE_NUMBER}: ${PHASE_NAME}" \
  --body "${PR_BODY}" \
  --base ${BASE_BRANCH}
```

If `--draft` flag was passed: add `--draft`.

Report: "PR #{number} created: {url}"
</step>

<step name="optional_review">
Ask if user wants to trigger a code review:

```
AskUserQuestion:
  question: "PR created. Run a code review before merge?"
  options:
    - label: "Skip review"
      description: "PR is ready — merge when CI passes"
    - label: "Self-review"
      description: "I'll review the diff in the PR myself"
    - label: "Request review"
      description: "Request review from a teammate"
```

**If "Request review":**
```bash
gh pr edit ${PR_NUMBER} --add-reviewer "${REVIEWER}"
```

**If "Self-review":**
Report the PR URL and suggest: "Review the diff at {url}/files"
</step>

<step name="track_shipping">
Update STATE.md to reflect the shipping action:

```bash
node ".rcode/bin/rcode-tools.cjs" state update "Last Activity" "$(date +%Y-%m-%d)"
node ".rcode/bin/rcode-tools.cjs" state update "Status" "Phase ${PHASE_NUMBER} shipped — PR #${PR_NUMBER}"
```

If `commit_docs` is true:
```bash
node ".rcode/bin/rcode-tools.cjs" commit "docs(${padded_phase}): ship phase ${PHASE_NUMBER} — PR #${PR_NUMBER}" --files .planning/STATE.md
```
</step>

<step name="report">
```
───────────────────────────────────────────────────────────────

## ✓ Phase {X}: {Name} — Shipped

PR: #{number} ({url})
Branch: {branch} → ${BASE_BRANCH}
Commits: {count}
Verification: ✓ Passed
Requirements: {N} REQ-IDs addressed

Next steps:
- Review/approve PR
- Merge when CI passes
- /rcode-complete-milestone (if last phase in milestone)
- /rcode-progress (to see what's next)

───────────────────────────────────────────────────────────────
```
</step>

</process>

<offer_next>
After shipping:

- /rcode-complete-milestone — if all phases in milestone are done
- /rcode-progress — see overall project state
- /rcode-execute {next} — continue to next phase
</offer_next>

<success_criteria>
- [ ] Preflight checks passed (verification, clean tree, branch, remote, gh)
- [ ] Branch pushed to remote
- [ ] PR created with rich auto-generated body
- [ ] STATE.md updated with shipping status
- [ ] User knows PR number and next steps
</success_criteria>

## Next Up

- `/rcode-complete-milestone` — mark the milestone done if all phases are now shipped
- `/rcode-execute` — continue to the next phase after shipping this one
- `/rcode-progress` — check overall project state after the PR is merged
