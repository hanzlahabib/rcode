<purpose>
Lightweight codebase assessment. Spawns a single rcode-codebase-mapper agent for one focus area,
producing targeted documents in `.planning/codebase/`.
</purpose>

<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>

<available_agent_types>
Valid rcode subagent types (use exact names — do not fall back to 'general-purpose'):
- rcode-codebase-mapper — Maps project structure and dependencies
</available_agent_types>

## Step 0 — Usage check

If `$ARGUMENTS` is empty or contains only `--help` or `-h`:
- Print the usage block below
- STOP — do not proceed

**Usage:**
```
/rcode-scan [--focus tech|arch|quality|concerns|tech+arch] [--refresh] [--reset]
```

**Examples:**
```
/rcode-scan --focus tech
/rcode-scan --focus arch
/rcode-scan --focus tech+arch
/rcode-scan --refresh                 # auto-update stale docs, brief diff, log to CHANGELOG.md
/rcode-scan --reset --focus tech+arch # silent overwrite (CI / autonomous)
```

**Refresh flag — memory-bank pattern.** When `--refresh` is passed AND existing docs are present, the orchestrator:

1. Captures a *pre-state snapshot* (top-level dirs, manifests, dep counts, file counts, git HEAD).
2. Reads the oldest existing target doc's mtime — anchor for "changes since last scan".
3. Runs git log + dir diff + manifest diff against that anchor.
4. Spawns Dalil with the diff context, instructs him to overwrite docs AND prepend a "Changes since last scan" section to each.
5. Appends a structured entry to `.planning/codebase/CHANGELOG.md` with the brief.

This is the canonical way to keep the memory bank fresh without losing the audit trail of what changed and why.

<process>

## Focus-to-Document Mapping

| Focus | Documents Produced |
|-------|-------------------|
| `tech` | STACK.md, INTEGRATIONS.md |
| `arch` | ARCHITECTURE.md, STRUCTURE.md |
| `quality` | CONVENTIONS.md, TESTING.md |
| `concerns` | CONCERNS.md |
| `tech+arch` | STACK.md, INTEGRATIONS.md, ARCHITECTURE.md, STRUCTURE.md |

## Step 1: Parse arguments and resolve focus

Parse the user's input for `--focus <area>`. Default to `tech+arch` if not specified.

Validate that the focus is one of: `tech`, `arch`, `quality`, `concerns`, `tech+arch`.

Also parse:
- `--refresh` → auto-update mode (briefs the user on what changed, then overwrites)
- `--reset` → silent overwrite (no prompt, no brief — for CI / autonomous chains)

If invalid focus:
```
Unknown focus area: "{input}". Valid options: tech, arch, quality, concerns, tech+arch
```
Exit.

## Step 2: Check for existing documents

```bash
INIT=$(node "$PROJECT_ROOT/.rcode/bin/rcode-tools.cjs" init scan 2>/dev/null || echo "{}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi
```

Extract `response_language` from INIT JSON. If set, include `Respond in {response_language}.` in all spawned subagent prompts.

Look up which documents would be produced for the selected focus (from the mapping table above).

For each target document, check if it already exists in `.planning/codebase/`:
```bash
ls -la .planning/codebase/{DOCUMENT}.md 2>/dev/null
```

**Three modes:**

### 2a — Refresh mode (`--refresh` flag)

Skip the [y/N] prompt. Instead, run the diff analysis in Step 2c and proceed to dispatch with refresh context.

### 2b — Reset mode (`--reset` flag)

Silent overwrite. No prompt, no brief, no CHANGELOG entry. Use only for CI or chained autonomous workflows.

### 2c — Default mode (no flag)

If any target doc exists, show their mod dates AND age in days, AND a one-line activity hint, then ask:

```bash
# For each existing doc, compute relative age:
for DOC in {document_list}; do
  if [ -f ".planning/codebase/$DOC" ]; then
    MTIME=$(stat -c %Y ".planning/codebase/$DOC" 2>/dev/null || stat -f %m ".planning/codebase/$DOC" 2>/dev/null)
    NOW=$(date +%s)
    AGE_DAYS=$(( (NOW - MTIME) / 86400 ))
    COMMITS_SINCE=$(git log --oneline --since="@$MTIME" 2>/dev/null | wc -l | tr -d ' ')
    echo "  - $DOC ({date}, ${AGE_DAYS}d ago, ${COMMITS_SINCE} commits since)"
  fi
done
```

```
Existing documents found:
  - STACK.md         (2026-03-22, 35d ago, 14 commits since)
  - INTEGRATIONS.md  (2026-03-22, 35d ago, 14 commits since)

These docs are stale. Three options:
  [Y]   Refresh — analyze what changed, briefly explain, then overwrite + log to CHANGELOG.md
  [o]   Overwrite blind — skip the diff brief, just rebuild
  [n]   Keep as-is, exit
```

Map the answer:
- `Y` / `y` / empty → set internal mode to **refresh**, continue to Step 2d
- `o` → set mode to **reset**, continue to Step 4
- `n` / `no` → exit

## Step 2d — Pre-state capture (refresh mode only)

Before dispatching Dalil, capture a structured snapshot for diff comparison. Fire each command and save the output verbatim — it goes into the dispatch prompt and the CHANGELOG entry.

```bash
# Anchor mtime — oldest existing target doc
ANCHOR_TS=$(for DOC in {document_list}; do
  [ -f ".planning/codebase/$DOC" ] && stat -c %Y ".planning/codebase/$DOC" 2>/dev/null || stat -f %m ".planning/codebase/$DOC" 2>/dev/null
done | sort -n | head -1)
ANCHOR_DATE=$(date -d "@$ANCHOR_TS" -u +%Y-%m-%d 2>/dev/null || date -r "$ANCHOR_TS" -u +%Y-%m-%d 2>/dev/null)

# Commits since anchor
echo "=== COMMITS SINCE $ANCHOR_DATE ==="
git log --oneline --since="@$ANCHOR_TS" 2>/dev/null | head -50

# Top-level dir set
echo "=== TOP-LEVEL DIRS ==="
find . -maxdepth 1 -type d -not -name '.git' -not -name 'node_modules' -not -name '.next' -not -name 'dist' -not -name '.venv' -not -name '__pycache__' | sort

# Manifest hashes (changed if deps shifted)
echo "=== MANIFEST HASHES ==="
for M in package.json pnpm-lock.yaml pyproject.toml requirements.txt Cargo.toml go.mod; do
  [ -f "$M" ] && echo "$M  $(sha256sum "$M" 2>/dev/null | awk '{print $1}' || shasum -a 256 "$M" | awk '{print $1}')"
done

# Source file count by language
echo "=== SOURCE FILE COUNTS ==="
for EXT in py ts tsx js jsx go rs rb; do
  COUNT=$(find . -name "*.$EXT" -not -path '*/node_modules/*' -not -path '*/.venv/*' -not -path '*/dist/*' 2>/dev/null | wc -l | tr -d ' ')
  [ "$COUNT" -gt 0 ] && echo "*.$EXT  $COUNT"
done
```

Store this entire output as `$PRE_STATE` for the dispatch prompt.

## Step 3: Create output directory

```bash
mkdir -p .planning/codebase
```

## Step 4: Announce dispatch (persona-driven)

Use the canonical dispatch-banner spec at `.rcode/references/dispatch-banner.md`. Read it now if you have not already — it defines the persona-driven first-person hand-off pattern.

For this workflow, the dispatched agent is `rcode-codebase-mapper` → persona **Dalil (دليل) — Codebase Scout** 🧭.

Print the DISPATCH banner per the spec. Filled-in template for this workflow:

```
╭─────────────────────────────────────────────────────────╮
│  🧭  Dalil (دليل) — Codebase Scout                       │
╰─────────────────────────────────────────────────────────╯

السلام عليكم — I'm Dalil, your codebase scout.

I'll map this repo for you with focus: {focus}{ — topic: "{topic}" if topic else ""}.
Before I start I'll discover every source root (not just `src/`),
detect the language mix from manifests, and — if you gave me a
topic phrase — sweep for it across all roots before narrowing.

Scope:
  • Focus: {focus}
  • Topic phrase: {topic-keyword or "none — broad scan"}
  • Read-only: I never edit code.

Output:
  → .planning/codebase/{document_list}

Working now — I'll come back with a Scan Scope declaration
so you see exactly what I covered (and what I skipped).
```

Always first-person. Always include the deliverable path. If a topic phrase isn't provided, drop the topic-related lines rather than printing "none".

## Step 5: Spawn mapper agent

Spawn a single `rcode-codebase-mapper` agent. Pass the persona instructions in the prompt so the agent's own response opens in-character.

**Base prompt (always sent):**

```
Task(
  prompt="You are spawned as **Dalil (دليل) — Codebase Scout**. Open your response with a one-line in-character continuity beat (e.g. 'Dalil here — starting the scan.') and sign your closing summary with your persona name. Use first-person.

  Scan this codebase with focus: {focus}.
  Topic phrase (literal search target, may be empty): {topic-keyword}
  Write results to .planning/codebase/. Produce only: {document_list}.

  REQUIRED — every document must open with a 'Scan Scope' section per `.rcode/agents-rules/codebase-mapper/detailed-guide.md` that declares:
  - Source roots discovered (top-level non-vendored directories)
  - Source roots searched (grep/glob targets)
  - Source roots NOT searched and why
  - Languages detected (from package manifests)
  - If a topic phrase was provided: a literal `grep -rl '<phrase>' <discovered-roots>` run across ALL source roots, with the file count and an excerpt of matches

  This scope section is non-negotiable — the orchestrator will reject documents missing it.",
  subagent_type="rcode-codebase-mapper",
  model="{model}",
  model="{resolved_model}"
)
```

**Refresh-mode addendum (append to the prompt above when mode === "refresh"):**

```
  REFRESH MODE — this is NOT a first scan. Existing docs are present and stale.

  Anchor date (last scan): {ANCHOR_DATE}
  Pre-state snapshot (verbatim from orchestrator):
  {PRE_STATE}

  Additional requirements for refresh runs:
  1. After the Scan Scope section in EACH document, insert a section titled
     '## Changes since last scan ({ANCHOR_DATE} → today)' that lists, in bullets:
     - new files / removed files relevant to this doc's focus
     - new dependencies / removed dependencies (for STACK.md / INTEGRATIONS.md)
     - new modules / removed modules (for ARCHITECTURE.md / STRUCTURE.md)
     - new TODO/FIXME or eliminated ones (for CONCERNS.md)
     - 3-7 most-important commit subjects from the pre-state COMMITS list
       that materially shaped the current state
  2. The body of each document must reflect CURRENT state — not a diff. The
     'Changes since last scan' section is the ONLY place where pre-state and
     diff narrative belongs.
  3. Include a final line in your return summary:
     'Brief: {one-paragraph plain-English summary of the most important changes
     since last scan, suitable for posting to CHANGELOG.md}'
     The orchestrator extracts this verbatim.
```

When refresh mode is active, also include `topic_keyword` (if any) and the resolved focus in the prompt as before.

## Step 6: Announce return (persona-driven)

When the agent returns, print the RETURNED banner per `.rcode/references/dispatch-banner.md`. Filled-in template:

```
╭─────────────────────────────────────────────────────────╮
│  ✓  Dalil — back from scout                              │
╰─────────────────────────────────────────────────────────╯

Done — here's what I covered for you.

Covered:
  • Searched: {roots actually iterated}
  • Languages: {detected language mix}
  • Topic sweep: {file count + sample paths, or "n/a"}

Skipped / blind spots:
  • {explicit list — never leave empty without justification}

Wrote:
  → .planning/codebase/{doc} ({N} lines)

{Optional: 1-2 follow-up questions Dalil surfaces in his own voice,
 e.g. "I noticed X — want me to dig deeper?"}

I'm still here if you want to follow up on what I found,
until the next dispatch. — Dalil
```

If the document is missing its Scan Scope section, do NOT print the success banner. Instead print:

```
⚠  Dalil returned without a Scan Scope declaration.
    Treating this run as incomplete — re-spawn with stricter instructions?
```

## Follow-up framing

Until the next `Task()` dispatch, answer follow-up questions about the scan AS Dalil — first-person, sign with `— Dalil`. If the user asks something outside Dalil's scope (e.g. strategy, planning, code editing), hand off explicitly per the dispatch-banner spec and print a fresh DISPATCH banner for the new persona.

## Step 6.5: Append to CHANGELOG.md (refresh mode only)

When mode === "refresh", extract Dalil's `Brief:` line from his RETURNED summary and append a structured entry to `.planning/codebase/CHANGELOG.md`. Create the file if missing. Use the Read tool first if updating, then Edit/Write — never blind-overwrite a file with prior entries.

**Entry format:**

```markdown
## {today's ISO date} — refresh

**Anchor:** {ANCHOR_DATE} ({age in days} days ago)
**Focus:** {focus}
**Commits since anchor:** {count}
**Docs touched:** {comma-separated list}

{Dalil's Brief: line, verbatim, formatted as a paragraph}

**Top-level signals:**
- Source roots: {comma-separated list of dirs from PRE_STATE}
- Languages: {detected mix}
- Manifest changes: {hash diff summary, e.g. "package.json: changed", "pyproject.toml: unchanged"}

---
```

Insert at the TOP of the file body (newest-first), under any pre-existing `# Changelog — Codebase Memory Bank` H1. If the file doesn't exist, write it with this header:

```markdown
# Changelog — Codebase Memory Bank

This file tracks structural changes between scans. Each entry is auto-written by `/rcode-scan --refresh`. Newest entries first.

---

{first entry here}
```

This file is **read by future `/rcode-scan --refresh` runs** as additional anchor context — the memory bank is self-improving across scans.

## Step 7: Final cue (orchestrator-level, after RETURNED banner)

The RETURNED banner above is Dalil's voice. After it, the orchestrator may add ONE neutral cue line if the user might want a deeper scan:

```
Tip: `/rcode-map-codebase` runs a 4-area parallel scan if you want broader coverage.
```

Skip this cue if the user already asked for a focused scan — don't push an upsell.

</process>

<success_criteria>
- [ ] Focus area correctly parsed (default: tech+arch)
- [ ] Existing documents detected with modification dates shown
- [ ] User prompted before overwriting
- [ ] Single mapper agent spawned with correct focus
- [ ] Output documents written to .planning/codebase/
</success_criteria>

## Success Criteria

- [ ] Focus area correctly parsed from arguments (defaults to `tech+arch` when omitted)
- [ ] Existing `.planning/codebase/` documents detected and shown with modification dates before overwriting
- [ ] User prompted for confirmation before any existing document is overwritten
- [ ] Single `rcode-codebase-mapper` agent spawned with the correct focus area
- [ ] Output document(s) written to `.planning/codebase/` with more than 20 non-empty lines

## On Error

If arguments are invalid, missing files, or subagent fails:
- Validate inputs match expected format
- Check that required files exist
- Retry with clearer arguments or report the specific error to the user


## On Completion

/rcode-council {your question} — strategic question about what was found
/rcode-plan {N} — plan fixes for discovered issues
/rcode-explore — go deeper with socratic analysis
/rcode-next — get suggested next action
