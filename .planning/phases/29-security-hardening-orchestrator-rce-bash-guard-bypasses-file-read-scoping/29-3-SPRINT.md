---
phase: 29
plan_number: 3
sprint: 29.3
type: execute
wave: 2
depends_on: ["29-2"]
files_modified:
  - rihal/bin/rihal-hooks.cjs
  - rihal/bin/rihal-tools.cjs
autonomous: true
requirements: [REQ-754]
must_haves:
  truths:
    - "The post-commit hook never reads a `-F` message file located outside the repo working tree."
    - "`rihal-tools.cjs` git add / git ls-files run via argument arrays — a filename with shell metacharacters cannot inject a command."
  artifacts:
    - "rihal/bin/rihal-hooks.cjs — post-commit `-F` path constrained to repo root"
    - "rihal/bin/rihal-tools.cjs — execFileSync('git', [...]) replaces interpolated execSync strings"
  key_links:
    - "Sequenced after 29-2 because both sprints edit rihal/bin/rihal-hooks.cjs — wave 2 avoids a same-file collision."
---

<objective>
Scope file reads and remove shell-string interpolation in git calls (#754).
Purpose: the `post-commit` hook reads any `-F`-captured path with `fs.readFileSync` (an attacker-controlled commit command could point it at `~/.ssh/id_rsa`); and `rihal-tools.cjs` interpolates filenames straight into `execSync` shell strings for `git add` and `git ls-files`, so a crafted filename can inject commands.
Output: post-commit `-F` path resolved and confirmed inside the repo before reading; git calls switched to `execFileSync('git', [...])` argument arrays with no shell.
NOTE: this sprint shares `rihal/bin/rihal-hooks.cjs` with 29-2 — it is wave 2 / `depends_on: 29-2` to serialize the edits. Pull the latest file before starting.
</objective>

<execution_context>
@.rihal/workflows/execute.md
@.rihal/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
</context>

<tasks>

<task id="29.3.1" type="auto">
<title>Constrain post-commit -F message file reads to the repo working tree</title>
<read_first>
- rihal/bin/rihal-hooks.cjs lines 113-145 (postCommit: -F match at 135, fs.readFileSync at 138)
- server/lib/api.js lines 122-141 — the path-traversal guard pattern (resolve + startsWith + realpathSync) to mirror
</read_first>
<files>rihal/bin/rihal-hooks.cjs</files>
<action>
1. At the top of `postCommit` (after the existing requires — `fs` is already imported at line 15), add `const path = require('path');` if not present.
2. Replace the `-F` handling block at lines 135-139. After matching `fMatch`, resolve the captured path against `process.cwd()` (the hook runs at the repo root): `const resolved = path.resolve(process.cwd(), fMatch[1]);`. Then dereference symlinks with `fs.realpathSync` (catch + skip on failure) and verify `realPath.startsWith(process.cwd() + path.sep)` — mirroring `server/lib/api.js:131-141`. Only `fs.readFileSync(resolved, 'utf8')` when the path is confirmed inside the repo; otherwise skip silently (the existing block already swallows read errors, so out-of-repo paths just yield no message text — no behavior break for legitimate in-repo `-F` files like the tmp-file path some flows use).
3. IMPORTANT edge case: `rihal-tools.cjs` writes its commit message tmp file to `os.tmpdir()` (see rihal-tools.cjs:3668) — that is OUT of the repo. The post-commit hook reading it would now be blocked. Since post-commit only uses `commitMsg` to scan for banned patterns and the tmp-file path is rihal-controlled (not attacker input), add an explicit allowance: also permit a path inside `os.tmpdir()` whose basename matches `/^rihal-commit-msg-\d+\.txt$/`. Document this exception with a comment.
</action>
<acceptance_criteria>
- `grep -n "realpathSync" rihal/bin/rihal-hooks.cjs` shows a match in postCommit.
- `grep -n "startsWith" rihal/bin/rihal-hooks.cjs` shows the repo-root containment check.
- The `rihal-commit-msg-` tmp-file exception is present and commented.
</acceptance_criteria>
<verify>
<automated>
node -c rihal/bin/rihal-hooks.cjs && grep -q "realpathSync" rihal/bin/rihal-hooks.cjs && grep -q "rihal-commit-msg-" rihal/bin/rihal-hooks.cjs && echo PASS
</automated>
</verify>
<done>post-commit reads a `-F` file only when it resolves inside the repo working tree (or is the rihal-owned commit-msg tmp file); out-of-repo paths are skipped.</done>
<evidence>lines: rihal/bin/rihal-hooks.cjs:135-139 (`fMatch` + unbounded `fs.readFileSync(fMatch[1], ...)` — the unscoped read); rihal-tools.cjs:3668 (tmp-file path that must stay readable)</evidence>
</task>

<task id="29.3.2" type="auto">
<title>Switch rihal-tools.cjs git add / git ls-files to execFileSync argument arrays</title>
<read_first>
- rihal/bin/rihal-tools.cjs lines 3604-3666 (execSync require at 3604, git add at 3617-3620, git diff --cached at 3639, git ls-files at 3646)
</read_first>
<files>rihal/bin/rihal-tools.cjs</files>
<action>
1. At line 3604, add `execFileSync` to the destructure: `const { execSync, execFileSync } = require('child_process');`.
2. Replace the `git add` call (lines 3617-3620). Instead of building the interpolated string `git add "f1" "f2"`, call `execFileSync('git', ['add', ...files], { cwd: PROJECT_ROOT, stdio: 'pipe' })`. The argument array means filenames pass as literal argv entries — no shell, so a filename with `;`, `$()`, backticks, or spaces cannot inject. Keep the surrounding try/catch and the gitignore-stderr detection (lines 3621-3631) unchanged — `execFileSync` errors carry `.stderr`/`.stdout` the same way.
3. Replace the `git ls-files --error-unmatch` call at line 3646: `execFileSync('git', ['ls-files', '--error-unmatch', f], { cwd: PROJECT_ROOT, stdio: 'pipe' })`. Keep it inside its try/catch (a non-tracked file still throws, which the catch handles).
4. Leave the two `git diff --cached --name-only` calls (lines 3639, 3662) as `execSync` — they interpolate no user input, so they are not injection vectors; converting them is out of scope per the issue spec.
</action>
<acceptance_criteria>
- `grep -n "execFileSync('git', \['add'" rihal/bin/rihal-tools.cjs` returns 1 match.
- `grep -n "execFileSync('git', \['ls-files'" rihal/bin/rihal-tools.cjs` returns 1 match.
- `grep -c "git add \${" rihal/bin/rihal-tools.cjs` returns 0 (interpolated string gone).
- `grep -c "ls-files --error-unmatch \\\\\"" rihal/bin/rihal-tools.cjs` returns 0.
</acceptance_criteria>
<verify>
<automated>
node -c rihal/bin/rihal-tools.cjs && grep -q "execFileSync('git', \['add'" rihal/bin/rihal-tools.cjs && grep -q "execFileSync('git', \['ls-files'" rihal/bin/rihal-tools.cjs && ! grep -q 'git add \${' rihal/bin/rihal-tools.cjs && echo PASS
</automated>
</verify>
<done>`git add` and `git ls-files` in rihal-tools.cjs run via `execFileSync` argument arrays — no shell string interpolation of filenames remains.</done>
<evidence>lines: rihal/bin/rihal-tools.cjs:3617-3620 (`git add ${files.map(...).join(' ')}` — interpolated into a shell string), :3646 (`git ls-files --error-unmatch "${f}"` — same)</evidence>
</task>

<task id="29.3.3" type="auto">
<title>Smoke-verify the git-call refactor with a real commit path</title>
<read_first>
- rihal/bin/rihal-tools.cjs lines 3604-3669 (the modified commit/staging block)
</read_first>
<files>rihal/bin/rihal-tools.cjs</files>
<action>
No code change — verification task. Run the repo test suite and a manual smoke of the commit subcommand against a throwaway staged file to confirm the `execFileSync` switch did not break staging behavior. Confirm: (1) staging a normal file still works, (2) staging a gitignored file still produces the existing gitignore error message (the catch-block stderr detection still fires), (3) `node --test` passes with no new failures. If any check fails, fix the regression in 29.3.2 before marking done.
</action>
<acceptance_criteria>
- `node --test` exits 0 with no new failures vs. the pre-sprint baseline.
- The commit subcommand still stages a normal file and still rejects a gitignored file with the documented message.
</acceptance_criteria>
<verify>
<automated>
node -c rihal/bin/rihal-tools.cjs && node --test 2>&1 | tail -5 && echo PASS
</automated>
</verify>
<done>Repo test suite passes; the git-staging path works for normal files and still rejects gitignored files cleanly.</done>
<evidence>lines: rihal/bin/rihal-tools.cjs:3621-3631 (gitignore-stderr detection that must keep working after the execFileSync switch)</evidence>
</task>

</tasks>

<verification>
- `node -c rihal/bin/rihal-hooks.cjs` and `node -c rihal/bin/rihal-tools.cjs` parse clean.
- `node --test` across the repo shows no new failures.
- `grep "git add \${\|ls-files --error-unmatch \"" rihal/bin/rihal-tools.cjs` returns nothing.
</verification>

<success_criteria>
- post-commit ignores out-of-repo `-F` paths; in-repo and the rihal commit-msg tmp file still read.
- `git add` and `git ls-files` use `execFileSync` argument arrays — no shell interpolation.
- Repo test suite passes.
</success_criteria>

<output>
Create `.planning/phases/29-security-hardening-orchestrator-rce-bash-guard-bypasses-file-read-scoping/29-3-SUMMARY.md`
</output>
