---
phase: 25-rcode-agent-cli-command
sprint: 25.1
type: execute
wave: 1
depends_on: []
files_modified:
  - cli/index.js          # verified exists: 166 lines
creates:
  - cli/agent.js          # confirmed does NOT exist (test -f returned DOES NOT EXIST)
autonomous: true
requirements:
  - "issue-715: add rcode agent <name> command wrapping claude --agent rcode-<name>"

must_haves:
  truths:
    - "rcode agent hanzla spawns claude --agent rcode-hanzla"
    - "rcode agent --list prints all 41 agent names from rcode/agents/"
    - "rcode agent badname exits 1 with error message and available list"
    - "rcode agent (no args) prints usage then available agent list"
    - "rcode help shows agent entry under the TEAM section"
    - "cli/index.js boots without errors after the edit"
  artifacts:
    - cli/agent.js (new, ≤80 lines)
    - cli/index.js (edited, ≤200 lines — currently 166, adds ~10)
  key_links:
    - "cli/index.js COMMANDS dict → must include agent: require('./agent')"
    - "cli/agent.js → reads rcode/agents/ at packageRoot, not CWD"
    - "cli/agent.js → uses spawnSync with stdio: 'inherit' (NOT execSync)"
---

# Sprint 25.1 — rcode agent CLI Command

**Phase:** 25 — rcode agent CLI Command
**Status:** Ready
**Velocity target:** 3 points
**Started:** 2026-05-10

## Sprint Goal

Add `rcode agent <name>` as a first-class CLI command that wraps `claude --agent rcode-<name>`.
Enables direct specialist-agent invocation without paying the council/orchestration token tax.
Two files changed: create `cli/agent.js`, edit `cli/index.js`.

## Stories

| ID | Title | Points | Status | Done when |
|----|-------|--------|--------|-----------|
| 25.1.01 | Create cli/agent.js command module | 2 | Ready | `node cli/index.js agent --list` prints 41 names; `agent badname` exits 1; `agent` (no args) prints usage; file is ≤80 lines |
| 25.1.02 | Wire agent into cli/index.js | 1 | Ready | `rcode help` shows `agent` under TEAM; `node cli/index.js` boots clean; index.js ≤200 lines |

---

### Story 25.1.01 — Create cli/agent.js command module

**Wave:** 1 — no dependencies

<objective>
Create the new `cli/agent.js` module that implements the `rcode agent` command.
Purpose: Allow users to invoke a named specialist agent directly via `claude --agent rcode-<name>` without going through the orchestration layer.
Output: `cli/agent.js` (new file, ≤80 lines)
</objective>

<tasks>

#### Task 1 — Write cli/agent.js (auto, 20 min)

<files>
creates: cli/agent.js
</files>

<action>
Create `cli/agent.js` following the existing module pattern:
`module.exports = function agent(args, { packageRoot }) {}`

Implement exactly as specified in CONTEXT.md. Key rules:
- Use `require('child_process').spawnSync` with `stdio: 'inherit'` — NOT `execSync`. Reason: interactive terminal passthrough; execSync buffers output and creates shell injection vectors.
- Agent directory: `path.join(packageRoot, 'rcode/agents')` — packageRoot comes from the caller, do NOT use `process.cwd()`.
- `--list` or zero args: enumerate `rcode/agents/rcode-*.md` files, strip `rcode-` prefix and `.md` suffix, sort, print. When zero args also print usage line first.
- Validation: check the resolved `rcode/agents/rcode-<name>.md` path exists with `fs.existsSync` before spawning. On failure: `console.error` the missing name + available list, `process.exit(1)`.
- `which claude` check via `spawnSync('which', ['claude'], { encoding: 'utf8' })` before spawning. On non-zero status: print install hint, `process.exit(1)`.
- Pass-through args: collect everything after `--` separator and append to the spawn call.
- Final spawn: `spawnSync('claude', ['--agent', agentName, ...extra], { stdio: 'inherit' })`. Exit with `result.status ?? 0`.

Do NOT add path traversal protection (that belongs in digest.js which normalises names from user input — agent.js resolves through `fs.existsSync` which is safe by construction since the attacker can only navigate within packageRoot).

Keep file ≤80 lines.
</action>

<verify>
<automated>
node -e "
const fn = require('./cli/agent.js');
console.assert(typeof fn === 'function', 'must export a function');
console.log('export shape: OK');
" && \
node cli/index.js agent --list 2>&1 | grep -c "rcode agent" | grep -qv "^0$" && echo "list: OK" && \
node cli/index.js agent badname; [ $? -eq 1 ] && echo "exit-1 on bad name: OK"
</automated>
</verify>

<done>
- `cli/agent.js` exists and is ≤80 lines (`wc -l cli/agent.js` output ≤80)
- `node cli/index.js agent --list` exits 0 and prints ≥41 `rcode agent <name>` lines
- `node cli/index.js agent` (no args) prints `Usage: rcode agent <name>` then the list
- `node cli/index.js agent badname` exits 1 and prints "No agent named 'rcode-badname' found" plus available names
- `node cli/index.js agent hanzla` either spawns claude or exits with "claude binary not found" error (both are correct — depends on whether claude is on PATH in the test environment)
</done>

<evidence>
- `creates: cli/agent.js` — confirmed does not exist: `test -f cli/agent.js && echo EXISTS || echo "DOES NOT EXIST"` → DOES NOT EXIST
- `rcode/agents/` contains 41 `.md` files matching `rcode-*.md` pattern: `ls rcode/agents/*.md | wc -l` → 41 (advisor-researcher, ahmed, assumptions-analyzer, … zayd — full list verified)
- Pattern reference: `cli/digest.js:43-71` — shows exact `module.exports = function digest(args, { packageRoot })` shape and `path.join(packageRoot, 'rcode/agents')` access pattern
- Pattern reference: `cli/team.js:8-35` — confirms `fs.readdirSync` + `.filter(f => f.endsWith('.md'))` idiom used across the codebase
</evidence>

</tasks>

---

### Story 25.1.02 — Wire agent into cli/index.js

**Wave:** 1 (parallel with 25.1.01 but logically depends on it at integration — can be sequenced after)

<objective>
Register the new `agent` command in `cli/index.js` COMMANDS dict, update `printHelp`, and update the top comment block.
Purpose: Make `rcode agent` discoverable and reachable through the standard CLI dispatcher.
Output: `cli/index.js` edited — 3 surgical additions, final line count ≤200.
</objective>

<tasks>

#### Task 1 — Edit cli/index.js in 3 places (auto, 15 min)

<files>
lines: cli/index.js:1-14 (top comment), cli/index.js:22-43 (COMMANDS dict), cli/index.js:45-92 (printHelp)
</files>

<action>
Make exactly 3 targeted edits to `cli/index.js`. Do NOT touch any other part of the file.

**Edit 1 — Top comment block (lines 1-14):**
Add `rcode agent <name>` to the usage list in the JSDoc comment at the top. Insert after line 10 (the `digest` entry):
```
 *   npx @hanzlaa/rcode agent <name>    → launch a specialist agent directly
```

**Edit 2 — COMMANDS dict (lines 22-43):**
Add `agent: require('./agent'),` to the COMMANDS object. Insert after the `team:` entry (currently line 32). Place it in the TEAM group logically adjacent to `team` and `digest`:
```js
  agent: require('./agent'),
```

**Edit 3 — printHelp TEAM section (lines 69-75):**
Insert after `  digest         Print compact digests for all agents` the following two-line entry:
```
  agent <name>   Launch a specialist agent directly (bypasses orchestration)
                 rcode agent --list   to see available agents
```

Do NOT alter spacing of the existing entries, do NOT reorder COMMANDS, do NOT change any logic.
</action>

<verify>
<automated>
node cli/index.js help 2>&1 | grep -q "agent" && echo "agent in help: OK" && \
node cli/index.js 2>&1 | grep -qv "Error" && echo "boots clean: OK" && \
wc -l cli/index.js | awk '{print ($1 <= 200) ? "line-count OK: " $1 : "FAIL line-count: " $1}'
</automated>
</verify>

<done>
- `node cli/index.js help` output contains the word `agent` under the TEAM section
- `node cli/index.js` boots without throwing (exit 0 when no command defaults to help)
- `wc -l cli/index.js` reports ≤200 lines
- `node cli/index.js agent --list` routes correctly to the new module (i.e., `require('./agent')` resolves)
</done>

<evidence>
- `lines: cli/index.js:22-43` — COMMANDS dict verified by direct read; `team: require('./team')` at line 32 is the insertion anchor
- `lines: cli/index.js:69-75` — `printHelp` TEAM section verified: `team`, `digest`, `show-model`, `dashboard`, `serve` entries exist; `agent` is missing
- `lines: cli/index.js:1-14` — top comment verified; `digest` entry at line 9 is the insertion anchor
- `wc -l cli/index.js` → 166 lines currently; adding ~10 lines stays well under 200 limit
</evidence>

</tasks>

---

## Capacity

- **Velocity target:** 3 points
- **Total committed:** 3 points
- **Buffer:** 0 points (0%)

## Verification

Overall sprint passes when all 6 success criteria from CONTEXT.md are met:

```bash
# 1. --list works
node cli/index.js agent --list | grep "rcode agent" | wc -l
# expect: 41

# 2. named agent routes to spawn (claude on PATH) or fails with clear error (claude not on PATH)
node cli/index.js agent hanzla 2>&1 | grep -E "rcode-hanzla|claude binary not found"

# 3. bad name exits 1
node cli/index.js agent badname; echo "exit: $?"
# expect: exit: 1

# 4. no args prints usage + list
node cli/index.js agent 2>&1 | grep "Usage:"

# 5. help shows agent in TEAM section
node cli/index.js help | grep -A20 "TEAM" | grep "agent"

# 6. CLI boots cleanly
node cli/index.js 2>&1 | head -1 | grep -v "Error"

# 7. line counts
wc -l cli/agent.js     # expect ≤80
wc -l cli/index.js     # expect ≤200
```

## Success Criteria

| # | Criterion | Measured by |
|---|-----------|-------------|
| 1 | `--list` prints all 41 agent names | `node cli/index.js agent --list \| grep "rcode agent" \| wc -l` → 41 |
| 2 | `agent hanzla` spawns or fails with clear claude-not-found message | exit code propagates; no silent failure |
| 3 | `agent badname` exits 1 with error + available list | `$?` = 1; stderr contains "No agent named" |
| 4 | `agent` (no args) prints usage + list | stdout contains "Usage:" |
| 5 | `rcode help` shows `agent` under TEAM | grep match in printHelp output |
| 6 | CLI boots without errors | `node cli/index.js` exit 0 |
| 7 | `cli/agent.js` ≤80 lines | `wc -l cli/agent.js` |
| 8 | `cli/index.js` ≤200 lines | `wc -l cli/index.js` |

<output>
Create `.planning/phases/25-rcode-agent-cli-command/25-1-SUMMARY.md` after sprint completion.
</output>
