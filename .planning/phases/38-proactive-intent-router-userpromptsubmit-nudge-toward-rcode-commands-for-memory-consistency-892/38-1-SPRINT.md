---
sprint: 38.1
goal: "Add the prompt-router subcommand to rcode-hooks.cjs — keyword-match the user's prompt against the do.md-derived routing table, respect the prompt_nudge toggle + per-session dedupe, emit a memory-framed additionalContext advisory, and swallow every error (exit 0 silent)."
depends_on: []
files_modified:
  - rcode/bin/rcode-hooks.cjs
  - test/prompt-router.test.cjs
sequential: false
---

# Sprint 38.1 — prompt-router subcommand + tests

**Phase:** 38 — Proactive intent router (UserPromptSubmit nudge toward rcode commands for memory consistency, #892)
**Status:** planned
**Velocity target:** 13 points
**Started:** —

## Sprint Goal

Implement the `prompt-router` subcommand inside `rcode/bin/rcode-hooks.cjs`. It runs on every `UserPromptSubmit`, so it must mirror the `cli/rcode-slash-router.cjs` fail-open safety contract exactly: dependency-free Node stdlib, never block, exit 0 with no output on any error or non-match. It keyword-matches the user's prompt against a routing table derived verbatim from `rcode/workflows/do.md` (the `/rcode-do` table at lines ~285-320), then — gated by the `prompt_nudge` toggle in `.rcode/config.yaml` (`every | once-per-intent | when-stale | off`, default `every`) and a per-session dedupe file — emits a one-line advisory framed around long-term MEMORY CONSISTENCY (point at the matched command + `/rcode-memory-update`, note that planning/exploration that bypasses rcode never lands in `.rcode/state.json`).

This sprint delivers the subcommand and its full test coverage. It does NOT wire the hook into any install path (Sprint 38.2) and does NOT add the drift-guard test against do.md (Sprint 38.3).

## Stories

| ID | Title | Points | Status | Done when |
|----|-------|--------|--------|-----------|
| 38.1.1 | Add INTENT_TABLE keyword map mirroring do.md | 3 | planned | `INTENT_TABLE` array of `{ keywords, command }` entries exists in rcode-hooks.cjs with a header comment citing `rcode/workflows/do.md` lines ~285-320 as the single source of truth; covers the locked intents (explore/brainstorm, audit/lens-audit, debug, plan/add-phase, review, map-codebase, milestone/phase creation). |
| 38.1.2 | Add `prompt-router` subcommand: stdin read, match, emit, fail-open | 5 | planned | Subcommand registered in the `main()` switch; reads prompt via the slash-router's sync `fs.readFileSync(0)` + JSON.parse with the multi-spelling prompt field fallback; on a keyword match emits `hookSpecificOutput.additionalContext` JSON to stdout framed around memory consistency; any error/no-match/empty exits 0 with no output. |
| 38.1.3 | Toggle (`prompt_nudge`) + per-session dedupe for `once-per-intent` | 3 | planned | Subcommand reads `prompt_nudge` from `.rcode/config.yaml` (flat key, default `every`); `off` → silent exit 0; `once-per-intent` → suppress repeat of the same matched command within a session via a temp dedupe file keyed by session_id + command; `every` always fires; unknown/missing value falls back to `every`. |
| 38.1.4 | `test/prompt-router.test.cjs` — match / no-match / error-swallow / dedupe / toggle | 2 | planned | `node --test test/prompt-router.test.cjs` passes; covers: matching prompt emits memory-framed additionalContext naming the right command; non-matching prompt → empty stdout exit 0; malformed/empty stdin → empty stdout exit 0; `prompt_nudge: off` → silent; `once-per-intent` second identical intent → silent on second call. |

## Capacity

- **Velocity target:** 13 points
- **Total committed:** 13 points
- **Buffer:** 0 points (0%)

## Stories — detail

### Story 38.1.1 — Add INTENT_TABLE keyword map mirroring do.md

<objective>
Create a single in-file routing table in `rcode-hooks.cjs` that maps user-intent keywords to rcode commands, derived verbatim from the `/rcode-do` routing table in `rcode/workflows/do.md` (the markdown table starting at "| If the text describes... |", lines ~285-320). This is the single source of truth — the table here must NOT silently diverge.
</objective>

<action>
- Add a module-level `const INTENT_TABLE` near the top of `rcode-hooks.cjs` (after the requires), as an array of `{ keywords: string[], command: string, intent: string }` objects.
- Above it, add a header comment block: WHY it exists, and the explicit cross-reference: `// Single source of truth: rcode/workflows/do.md routing table (lines ~285-320, "If the text describes..."). Keep in sync — see test/prompt-router-table-sync.test.cjs (Sprint 38.3).`
- Populate entries from the locked decisions + the do.md rows. At minimum (one row → one entry):
  - explore/research/"how does X work" → `/rcode-research-phase` (+ brainstorm keywords → `/rcode-brainstorm`)
  - "explore options"/brainstorm/"generate ideas"/"what could we do" → `/rcode-brainstorm`
  - audit/"review changes"/"check my diff"/karpathy/"too complex" → `/rcode-review --karpathy`
  - general audit / re-audit / "extend"/"fill out" existing artifact → `/rcode-audit`
  - bug/error/crash/failure/broken → `/rcode-debug`
  - map/analyze existing codebase → `/rcode-map-codebase`
  - plan/build/"let's plan"/"plan phase" → `/rcode-plan`
  - refactor/migration/"multi-file"/"system redesign" → `/rcode-add-phase`
  - "create milestones"/"create roadmap"/"break project into milestones" → `/rcode-new-milestone`
  - "create epics"/"user stories" → `/rcode-create-epics-and-stories`
- Keep `intent` as a short stable slug (e.g. `explore`, `audit`, `plan`) — used by the `once-per-intent` dedupe key in 38.1.3.
- Order entries first-match-wins, matching do.md's "Apply the first matching rule" semantics. Keep more-specific keyword sets before broad ones.
- Each `keywords` entry is matched case-insensitively against the lowercased prompt as a substring/word check (mirror the simple `.includes`/`\b` style already used in `preWorkflow`'s `suspiciousPatterns`). No regex engine beyond what stdlib gives you.
</action>

<verify>
<automated>
node --check rcode/bin/rcode-hooks.cjs
node -e "const s=require('fs').readFileSync('rcode/bin/rcode-hooks.cjs','utf8'); if(!/INTENT_TABLE/.test(s)) throw new Error('INTENT_TABLE missing'); if(!/do\.md/.test(s)) throw new Error('do.md cross-reference missing'); if(!/rcode-research-phase|rcode-brainstorm/.test(s)||!/rcode-audit/.test(s)||!/rcode-debug/.test(s)||!/rcode-plan/.test(s)) throw new Error('expected commands missing from table');"
</automated>
</verify>

### Story 38.1.2 — Add `prompt-router` subcommand: stdin read, match, emit, fail-open

<objective>
Add a `promptRouter()` function and register `prompt-router` in `main()`'s switch. It mirrors the slash-router's runtime contract: read the prompt from stdin JSON, match against `INTENT_TABLE`, emit a memory-framed advisory via `hookSpecificOutput.additionalContext`, and on ANY error or non-match exit 0 with no output.
</objective>

<action>
- Implement `promptRouter()` as a synchronous-style runner that does NOT use the existing async `readInputJson()` (that one rejects on bad JSON, which would surface an error). Instead mirror `cli/rcode-slash-router.cjs`: read with `fs.readFileSync(0, 'utf8')` inside try/catch, `JSON.parse`, and on any failure `return` (silent). This keeps the swallow-all-errors contract.
- Extract the prompt with the same multi-spelling fallback the slash-router uses: `data.prompt ?? data.user_prompt ?? data.userPrompt ?? data.message ?? data.input ?? ''`. If not a string or empty after trim → return (no output).
- If the prompt already starts with `/rcode-` → return (no output): the user is already invoking a command; nudging is noise. (Reuse the slash-router's `/^\/rcode-/` leading check on the trimmed prompt.)
- Lowercase the prompt once; iterate `INTENT_TABLE` first-match-wins; find the first entry where any keyword matches.
- On match, build a one-line advisory framed around MEMORY CONSISTENCY. It MUST: (a) name the matched command, (b) reference `/rcode-memory-update`, (c) note that work done outside rcode does not land in `.rcode/state.json`. Example shape (keep concise, single line):
  `rcode tip: this looks like <intent> work — consider /rcode-<cmd> so the outcome is captured in .rcode/state.json. Decisions made outside rcode commands won't persist; run /rcode-memory-update to keep long-term memory consistent.`
- Emit via a local `emit()` helper identical in shape to the slash-router's: `{ hookSpecificOutput: { hookEventName, additionalContext } }`, written with `process.stdout.write(JSON.stringify(...))`. Resolve `hookEventName` from `data.hook_event_name || data.hookEventName || 'UserPromptSubmit'`.
- Wrap the body in `try { ... } catch { /* fail open */ }` and ensure the subcommand path ends at `process.exit(0)`. Register `case 'prompt-router': promptRouter(); break;` in `main()` and add it to the usage strings + the file header doc comment (the `Subcommands:` block at the top).
- IMPORTANT: `prompt-router` must call `process.exit(0)` regardless of outcome — do not let it fall through to the async `readInputJson` error path. Because `main()` is `async`, guard the new case so it returns synchronously (call `promptRouter()` which itself exits, or `await Promise.resolve()` then exit).
</action>

<verify>
<automated>
node --check rcode/bin/rcode-hooks.cjs
printf '%s' '{"prompt":"explore how the auth flow works","hook_event_name":"UserPromptSubmit"}' | node rcode/bin/rcode-hooks.cjs prompt-router | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);if(!/state\.json/.test(o.hookSpecificOutput.additionalContext))throw new Error('not memory-framed');if(!/rcode-/.test(o.hookSpecificOutput.additionalContext))throw new Error('no command named');})"
printf '%s' '{"prompt":"what is the weather today"}' | node rcode/bin/rcode-hooks.cjs prompt-router | wc -c | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{if(parseInt(s.trim())!==0)throw new Error('non-match must emit nothing');})"
printf '%s' 'not json at all' | node rcode/bin/rcode-hooks.cjs prompt-router; test $? -eq 0
</automated>
</verify>

### Story 38.1.3 — Toggle (`prompt_nudge`) + per-session dedupe for `once-per-intent`

<objective>
Gate the advisory behind the `prompt_nudge` config toggle and add the per-session dedupe that the `once-per-intent` mode requires. Default `every`; `off` fully silences.
</objective>

<action>
- Read `prompt_nudge` from `.rcode/config.yaml` using a tiny inline flat-key parser (mirror `parseSimpleYaml` in `rcode-tools.cjs:91` — `key: value`, strip `#` comments and quotes). Do NOT add a dependency on rcode-tools.cjs (the hook stays standalone). Read from `path.join(process.cwd(), '.rcode', 'config.yaml')`; if missing/unreadable, default `every`.
- Accept values `every | once-per-intent | when-stale | off`. Unknown/empty → treat as `every`. `off` → return before emitting (silent exit 0).
- For `when-stale`: implement a minimal definition grounded in existing state — fire only when `.rcode/state.json` exists AND its mtime is older than the most recent git commit, OR when state.json is absent in a `.planning/` project. Keep the staleness check cheap and wrapped in try/catch; if it can't be determined, fall back to firing (treat as stale). Document the chosen heuristic in a comment.
- For `once-per-intent`: maintain a per-session dedupe file in `os.tmpdir()`, keyed by session id + intent slug — mirror `compactNudge`'s counter-file pattern (`rcode-nudge-<session>.count`). Use e.g. `rcode-prompt-nudge-<sessionId>.json` storing an array/set of already-nudged intent slugs. `sessionId` from `data.session_id || data.tool_input?.session_id || 'default'`. If the intent slug is already recorded for this session → silent return; otherwise record it then emit.
- All file I/O wrapped so failures never break the fail-open contract (a missing/locked dedupe file just means "fire").
</action>

<verify>
<automated>
node --check rcode/bin/rcode-hooks.cjs
# off → silent (run in a temp project dir with config.yaml prompt_nudge: off)
T=$(mktemp -d); mkdir -p "$T/.rcode"; printf 'prompt_nudge: off\n' > "$T/.rcode/config.yaml"; cd "$T"; printf '%s' '{"prompt":"audit the diff for complexity"}' | node /home/hanzla/development/rihal-code/rcode/bin/rcode-hooks.cjs prompt-router | wc -c | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{if(parseInt(s.trim())!==0)throw new Error('off must be silent');})"; cd - >/dev/null; rm -rf "$T"
</automated>
</verify>

### Story 38.1.4 — `test/prompt-router.test.cjs` — match / no-match / error-swallow / dedupe / toggle

<objective>
Add a `node --test` suite covering the prompt-router's full behaviour, in the style of `test/compact-nudge-hook.test.cjs` (spawnSync the hook, feed stdin JSON, assert status + stdout).
</objective>

<action>
- Create `test/prompt-router.test.cjs`. Use `node:test`, `node:assert`, `spawnSync(process.execPath, [HOOK, 'prompt-router'], { input, cwd, env })`.
- Tests to include:
  1. **match emits memory-framed advisory** — prompt "explore how the auth flow works" → status 0, stdout parses to JSON whose `hookSpecificOutput.additionalContext` contains `state.json`, `/rcode-memory-update`, and a `/rcode-` command.
  2. **audit prompt routes to audit/review** — prompt "audit X for too much complexity" → additionalContext names `/rcode-review` or `/rcode-audit`.
  3. **non-match is silent** — prompt "what time is it" → status 0, stdout empty.
  4. **leading /rcode- is silent** — prompt "/rcode-plan phase 38" → status 0, stdout empty (already a command).
  5. **malformed stdin is swallowed** — input "garbage" → status 0, stdout empty.
  6. **empty stdin is swallowed** — input "" → status 0, stdout empty.
  7. **prompt_nudge: off silences** — run with `cwd` = a temp dir containing `.rcode/config.yaml` with `prompt_nudge: off` → status 0, stdout empty. Use a `mkdtempSync` temp project; clean up after.
  8. **once-per-intent dedupe** — `cwd` = temp project with `prompt_nudge: once-per-intent`; first call with a fixed `session_id` + explore prompt emits; second call same session + another explore prompt → stdout empty. Clean up the dedupe temp file after.
- Mirror compact-nudge's `uniqueSession()` + `cleanup()` helpers for the dedupe temp files so tests don't leak across runs.
</action>

<verify>
<automated>
node --test test/prompt-router.test.cjs
</automated>
</verify>

## Files Touched

**Creates:**
- `test/prompt-router.test.cjs` — behaviour suite for the prompt-router subcommand (match/no-match/error/dedupe/toggle)

**Modifies:**
- `rcode/bin/rcode-hooks.cjs` — adds `INTENT_TABLE`, the `promptRouter()` runner, the `prompt-router` switch case + usage/header doc updates

**Tests:**
- `test/prompt-router.test.cjs` — covers Stories 38.1.2–38.1.4

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| `main()` is async; new case could fall through to the async error path | Hook errors leak to host CLI | `promptRouter()` calls `process.exit(0)` itself; never delegates to `readInputJson()` |
| Table drifts from do.md over time | Nudges point at stale/removed commands | Cross-reference comment now; automated drift test in Sprint 38.3 |
