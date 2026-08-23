# GitHub Comment & PR Body Style

Shared reference for every workflow or agent that writes text a human will read on
GitHub: PR bodies, PR review comments, issue comments, issue bodies. Hard contract,
not a suggestion.

## The principle

Write like the engineer who did the work, not like a tool reporting on it. A reviewer
opens the comment to learn three things: what this changes, what was decided and why,
and what is still open. Everything else is noise they have to scroll past.

## Never include

- **Em-dashes (`—`) or en-dashes used as punctuation.** They are the single clearest
  tell that text was machine-written. Use a comma, a colon, parentheses, or a full
  stop. (This applies to the GitHub surface only, not to rcode's own planning docs.)
- **A gates / verification / CI block.** `Gates: biome clean, typecheck 12/12, server
  2100 passed / 367 skipped` and anything shaped like it. CI already reports pass/fail
  on the PR; restating it is pure noise, and it goes stale the moment a commit lands.
- **Internal git process talk.** "merged, not rebased, per repo convention", "branch
  updated from main", "squashed the fixup commits". The reviewer reviews the diff, not
  how the branch got there. The one exception: branch staleness when it is the actual
  cause of a red check or a conflict the reviewer will hit.
- **Self-blame or status filler.** "This is on me", "Apologies for the churn",
  "Working on it now", "Let me know if you'd like anything changed".
- **AI attribution of any kind.** No "Generated with", no "Co-Authored-By: Claude",
  no bot emoji sign-off.
- **Emoji-decorated section headers** (🚀 ✨ 🎯). One plain heading is enough.

## Always include

- What the change does, in the reviewer's terms (behaviour, not file inventory).
- Any non-obvious decision, with the reason it was chosen over the alternative.
- What is still open, blocked, or deliberately out of scope.

## Agent dispatch rule

When dispatching a subagent that touches a repo with a GitHub remote, **explicitly
forbid every `gh` write operation** in the dispatch prompt: `gh pr create`,
`gh pr comment`, `gh pr edit`, `gh pr merge`, `gh issue create`, `gh issue comment`,
`gh api` with a non-GET method. "Do not push" is NOT sufficient — an agent can post a
comment or open a PR without ever pushing, and that reaches other humans immediately.
The orchestrator posts to GitHub, after the user approves the text.

Related: agents' scratch notes (`REPLY.md`, `STATUS.md`, `NOTES.md`) must never be
committed to a branch that becomes a PR; they show up in the diff and read as leaked
machine output. Keep them in the scratchpad directory.

## Self-check before posting

```bash
# must print nothing
grep -n '—' "$BODY_FILE"
grep -niE '^ *(gates|verification|checks) *:' "$BODY_FILE"
grep -niE 'rebase|not rebased|merged from (main|master)|co-authored-by|generated with' "$BODY_FILE"
```
