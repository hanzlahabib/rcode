# Execution Summary

**Phase:** 29 — Security hardening (orchestrator RCE, bash-guard bypasses, file-read scoping)
**Sprint:** 29-3 — Scope file reads and remove shell-string interpolation in git calls (#754)
**Completed:** 2026-05-15
**Executor:** Claude Code (audit-gap-closure branch)

## What Was Built

Closed issue #754 by removing two injection / unscoped-read vectors:

1. **post-commit `-F` file read scoping** — the post-commit hook previously called
   `fs.readFileSync(fMatch[1], 'utf8')` on any path captured from a `git commit -F <path>`
   command. An attacker-controlled commit command could point `-F` at a file outside the
   repo (e.g. `~/.ssh/id_rsa`). The `-F` path is now resolved against `process.cwd()`,
   symlink-dereferenced with `fs.realpathSync`, and verified to start with the repo root —
   mirroring the path-traversal guard in `server/lib/api.js:131-141`. An explicit,
   commented exception allows the rihal-controlled commit-message tmp file
   (`os.tmpdir()/rihal-commit-msg-<digits>.txt`) so legitimate commit flows are not broken.

2. **rihal-tools.cjs git calls via argument arrays** — `git add` and `git ls-files
   --error-unmatch` previously interpolated filenames into shell strings passed to
   `execSync`, so a crafted filename (containing `;`, `$()`, backticks, spaces) could
   inject commands. Both now run via `execFileSync('git', [...])` argument arrays — no
   shell, filenames pass as literal argv entries. The two `git diff --cached --name-only`
   calls were left as `execSync` (no user input interpolated — out of scope per #754).

## Stories Completed

| ID | Title | Status |
|----|-------|--------|
| 29.3.1 | Constrain post-commit `-F` message file reads to the repo working tree | done |
| 29.3.2 | Switch rihal-tools.cjs git add / git ls-files to execFileSync argument arrays | done |
| 29.3.3 | Smoke-verify the git-call refactor with a real commit path | done |

## Files Modified

| File | Change |
|------|--------|
| `rihal/bin/rihal-hooks.cjs` | post-commit: `-F` path resolved + realpathSync + repo-root `startsWith` containment check; rihal-commit-msg tmp-file exception added & commented; `path`/`os` required inside `postCommit` |
| `rihal/bin/rihal-tools.cjs` | `execFileSync` added to child_process destructure; `git add` and `git ls-files --error-unmatch` switched from interpolated `execSync` strings to `execFileSync('git', [...])` argument arrays |

## Deviations from Plan

None. All tasks executed exactly as specified in 29-3-SPRINT.md. The unused `addResult`
local variable in the old `git add` block was dropped (it was never read), keeping the
surrounding try/catch and gitignore-stderr detection intact.

## Blockers Encountered

None. One minor friction: the `const { execSync } = require('child_process')` string was
not unique in the file (3 occurrences); resolved by anchoring the edit to the
"Stage files if --files provided" comment above line 3604.

## Verification

- [x] `node -c rihal/bin/rihal-hooks.cjs` parses clean
- [x] `node -c rihal/bin/rihal-tools.cjs` parses clean
- [x] Task 29.3.1 automated verify: `realpathSync` + `rihal-commit-msg-` present — PASS
- [x] Task 29.3.2 automated verify: `execFileSync('git', ['add'`/`['ls-files'` present, `git add ${` gone — PASS
- [x] `grep -c "ls-files --error-unmatch \""` returns 0
- [x] Smoke test (throwaway repo): normal file stages OK; gitignored file triggers
      stderr detection (`ignored by one of your .gitignore`); `git ls-files
      --error-unmatch` throws for untracked file as expected
- [x] `node --test` full suite — 3 failures, all matching the known pre-sprint baseline
      (`scope-history-parity` — unrelated `kanban`/`orchestrator` scopes; broken
      `@`-references baseline test; `command-workflow @-includes` test). No NEW failures.

## Next Steps

Phase 29 security-hardening work continues per ROADMAP. Issue #754 is closed by this sprint.
