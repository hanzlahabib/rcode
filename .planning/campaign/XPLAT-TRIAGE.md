# #889 Cross-platform test failures — shared triage (CI run 27432528373)

Local box is Linux/WSL2 — Windows/macOS verification happens via CI after merge.
HARD RULE for every agent: `node --test` must stay 475/475 green locally (Linux).
Fix code to be platform-agnostic; only skip a test on a platform when the FEATURE
itself is posix-only (e.g. symlink traversal) — with a comment saying why.

## Family A — line endings (likely one root cause: Windows git autocrlf → CRLF)
- agents-registry ×2, frontmatter validation ×3, skills-compliance
- run-eval.cjs baseline drift + suite file, update-config-yaml.test.cjs suite
- router body-injection regex "did not match"
Fix BOTH ends: (1) add .gitattributes forcing `eol=lf` for source/md/yaml so
checkouts are LF everywhere; (2) make parsers/regexes CRLF-tolerant (\r?\n,
trimEnd) so they survive user files regardless.

## Family B — fs/path safety
- safeRmSync: mac (2 tests — /tmp vs /private/tmp realpath; see commit 5d78a4b
  for the TMPDIR pin pattern) + windows realpath-escape test
- writeFileAtomic custom file mode (POSIX chmod semantics absent on win)
- --purge ×2 (ENOENT Temp\...\.planning\PROJECT.md; symlink refusal #688)
- --include-planning flag test, isGlobalInstall ×2 (path string logic),
  dashboard boot test on windows

## Family C — installer / router / hooks
- dry-run default banner, project .claude/{agents,commands,skills} dry-run plan ×3
- codex install (bodies + router + hook merge), antigravity UserPrompt hook merge
- #705 stub-ROADMAP re-seed
Mostly hardcoded '/' joins and regexes; use path.join/path.sep, normalize before
compare.
