# Workflow: rcode-update

<purpose>
Pull the latest rcode from npm and install it **non-destructively** —
overwrite only files the user hasn't customized since their last install.
User-modified files are preserved and reported. Closes #232.

Default invocation:
```
npx @hanzlaa/rcode@latest install . --non-destructive --yes
```

The `--non-destructive` flag (set by default in this workflow) makes the
installer compare each file's current SHA256 to the SHA256 stored in
`.rcode/_config/files-manifest.csv` from the previous install:
- Hashes match → file is pristine → safe to overwrite with new version
- Hashes differ → user has edited it → SKIP and report

Per-project state is ALWAYS preserved (never touched by either mode):
- `.rcode/config.yaml`
- `.rcode/state.json` (and `.lock`)
- `.planning/` (PRD, ROADMAP, sprints, SUMMARY files)
- `.rcode/brain/` content (refreshed via `brain pull` separately)
</purpose>


## Step 0 — Usage check

If `$ARGUMENTS` contains `--help` or `-h`:

```
/rihal-update                       # pull latest, preserve user-modified files
/rihal-update v2.4.0                # pin to a specific version
/rihal-update --force-overwrite     # discard local edits, overwrite all rcode files
```

**Examples:**
```
/rihal-update
/rihal-update v2.4.0
/rihal-update --force-overwrite
```

## Step 1 — Locate installed package

Find the local rcode installer (used as the network-fallback path in
Step 7). Try in order:

1. `$(npm root -g)/@hanzlaa/rcode/cli/install.js` (global install)
2. `./cli/install.js` (local clone)
3. If neither exists, skip — Step 7's primary path uses `npx @hanzlaa/rcode@latest` and works without a local installer.

Store the resolved path (or empty) in `$INSTALLER_PATH`.

## Step 2 — Read installed manifest

Read `.rcode/_config/files-manifest.csv` from the current project:

```bash
cat .rcode/_config/files-manifest.csv
```

If the file doesn't exist:
```
ℹ️ No rcode installation detected in this project.
Run: npx @hanzlaa/rcode@latest install . --yes
```
Exit.

Parse the CSV (columns: `rel,sha256,size`). Store as `$INSTALLED_HASHES` (map rel → sha256).

## Step 3 — Read source manifest

Run the installer helper to read the source package's file list:

```bash
node "$INSTALLER_PATH" --list-files 2>/dev/null || echo "[]"
```

If that flag doesn't exist, walk the source package's `rihal/` directory manually:
- Find all files in `$(npm root -g)/@hanzlaa/rcode/rcode/` (or local `./rihal/`)
- Compute SHA256 for each
- Store as `$SOURCE_HASHES` (map rel → sha256)

## Step 4 — Compute changelog

Compare `$INSTALLED_HASHES` against `$SOURCE_HASHES`:

- **Added:** files in SOURCE but not in INSTALLED
- **Changed:** files in both with different SHA256
- **Removed:** files in INSTALLED but not in SOURCE

Count each category. Store results in `$ADDED`, `$CHANGED`, `$REMOVED` (arrays of rel paths).

If all three lists are empty:
```
✓ rcode is up to date (no changes detected)
```
Exit.

## Step 5 — Print changelog

Print a human-readable changelog:

```
📦 rcode Update Available

Added files (3):
  ✨ rihal/commands/update.md
  ✨ rihal/workflows/update.md
  ✨ rihal/commands/stats.md

Changed files (2):
  🔄 rihal/modules/core.yaml
  🔄 cli/install-v2.js

Removed files (1):
  ❌ rihal/references/old-style.md

Total: +3 / ~2 / -1
```

## Step 6 — Ask user confirmation

Call AskUserQuestion:

```
Proceed with update?

Options:
[1] Proceed — Apply update
[2] Cancel — Skip for now
[3] Show diff — List all changed files
```

- If user chooses [3], print full diff (all added/changed/removed file names, 1 per line)
- Then re-ask the confirmation question
- If user chooses [1], proceed to Step 7
- If user chooses [2], print "Update cancelled" and exit

## Step 7 — Apply update (non-destructive by default per #232)

Pull from npm AND install non-destructively. User-modified files are
preserved automatically; the installer reports each one in the summary.

```bash
npx @hanzlaa/rcode@latest install . --non-destructive --yes
```

**If the user explicitly wants destructive overwrite** (rare — only
when they intentionally want to discard their customizations):

```bash
npx @hanzlaa/rcode@latest install . --force-overwrite --yes
```

**Version pinning** — if the user passed `/rihal-update v2.4.0`, pass
the version through:

```bash
npx @hanzlaa/rcode@2.4.0 install . --non-destructive --yes
```

**Local fallback** — if the user's network can't reach npm, fall back
to the locally-cached installer (still non-destructive):

```bash
node "$INSTALLER_PATH" . --non-destructive --yes
```

If the command exits with non-zero status, print:

```
❌ Update failed. Check the output above.
   Tip: try --force-overwrite if you intentionally want to overwrite
   your customizations, or run with the local installer fallback.
```

Exit with error code.

## Step 7.5 — Surface preserved files

The installer's stdout will include a "user-modified preserved" report
when relevant. Capture it and re-print as a callout so users notice:

```
ℹ Files preserved (your customizations were kept):
   - .claude/skills/rihal-create-prd/workflow.md
   - rihal/workflows/sprint-planning.md
   - .rcode/references/output-format.md

These will not auto-update on future /rihal-update calls. To force
their update next time, run /rihal-update --force-overwrite.
```

## Step 8 — Pull Rihal brain content (v2.0)

After installer finishes, refresh the brain content from configured sources (issue #158). This is idempotent and safe to re-run.

```bash
node .rcode/bin/rcode-tools.cjs brain pull
```

Parse the JSON output. Report counts to the user:
- `pulled[]` — sources actually fetched (git or in-repo)
- `skipped[]` — sources with `<PLACEHOLDER>` URLs (waiting on issue #162 / M5)
- `errors[]` — sources that failed (network, auth, etc.)

If the user passed a version argument (`/rihal-update v1.3.0`), pass it through to `brain pull` as `--version v1.3.0`. When supported, `brain pull` will pin each source to the commit recorded in that release's `sources.yaml`. Unknown versions: treat as latest and warn.

## Step 9 — Success summary

Print:

```
✓ rcode updated successfully

Updated files: N
  - file-path-1
  - file-path-2
  ...

Rihal brain: M sources pulled, K skipped (placeholder URLs)

New version available at: .rcode/

Run /rihal-status to verify installation.
```

## Success Criteria

- [ ] Task completed as requested
- [ ] Output saved or reported
- [ ] State updated if necessary
- [ ] No errors encountered

## On Error

If arguments are invalid, missing files, or subagent fails:
- Validate inputs match expected format
- Check that required files exist
- Retry with clearer arguments or report the specific error to the user

