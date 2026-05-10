# Phase 25 — rcode agent CLI Command

**Issue:** #715
**Branch:** rihal/autonomous-m1-agent-slim-20260510-125703
**Preceded by:** Phase 24 (persona dedup) — VERIFIED ✓

## Goal

Add `rcode agent <name>` command to `cli/index.js` that wraps `claude --agent rihal-<name>`.
Bypasses council/orchestration token tax for single-specialist queries.

## Usage

```bash
rcode agent hanzla              # → claude --agent rihal-hanzla
rcode agent waleed              # → claude --agent rihal-waleed
rcode agent --list              # → list all available agents from rihal/agents/
rcode agent hanzla -- "prompt" # → claude --agent rihal-hanzla "prompt"
rcode agent badname             # → Error: No agent named 'rihal-badname' ...
rcode agent                     # (no name) → print usage + --list output
```

## Files to Create / Edit

1. **NEW** `cli/agent.js` — the command module
2. **EDIT** `cli/index.js` — add to COMMANDS dict + printHelp + top comment

## Implementation Details

### cli/agent.js

```js
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = function agent(args, { packageRoot }) {
  // --list: enumerate agents from rihal/agents/
  if (args.includes('--list') || args.length === 0) {
    const agentDir = path.join(packageRoot, 'rihal/agents');
    const names = fs.readdirSync(agentDir)
      .filter(f => f.startsWith('rihal-') && f.endsWith('.md'))
      .map(f => f.replace(/^rihal-/, '').replace(/\.md$/, ''))
      .sort();
    if (args.length === 0) {
      console.log('Usage: rcode agent <name> [-- extra args]\n');
    }
    console.log(`Available agents (${names.length}):\n`);
    names.forEach(n => console.log(`  rcode agent ${n}`));
    return;
  }

  const name = args[0];
  const agentName = `rihal-${name}`;

  // Validate agent exists
  const agentDir = path.join(packageRoot, 'rihal/agents');
  const agentFile = path.join(agentDir, `${agentName}.md`);
  if (!fs.existsSync(agentFile)) {
    const available = fs.readdirSync(agentDir)
      .filter(f => f.startsWith('rihal-') && f.endsWith('.md'))
      .map(f => f.replace(/^rihal-/, '').replace(/\.md$/, ''))
      .sort()
      .join(', ');
    console.error(`Error: No agent named '${agentName}' found.`);
    console.error(`Available: ${available}`);
    process.exit(1);
  }

  // Find claude binary
  const claudeCheck = spawnSync('which', ['claude'], { encoding: 'utf8' });
  if (claudeCheck.status !== 0) {
    console.error('Error: claude binary not found. Install Claude Code: https://claude.ai/code');
    process.exit(1);
  }

  // Extra args after --
  const dashIdx = args.indexOf('--');
  const extra = dashIdx !== -1 ? args.slice(dashIdx + 1) : [];

  // Spawn claude --agent rihal-<name> [extra...]
  const result = spawnSync('claude', ['--agent', agentName, ...extra], { stdio: 'inherit' });
  process.exit(result.status ?? 0);
};
```

### cli/index.js changes

1. Add `agent: require('./agent'),` to COMMANDS (under `team:`)
2. Add to printHelp under `👥 TEAM`:
   ```
   agent <name>   Launch a specialist agent directly (bypasses orchestration)
                  rcode agent --list   to see available agents
   ```
3. Update top comment block to include `rcode agent <name>`

## Success Criteria

1. `node cli/index.js agent --list` prints all 41 agent names
2. `node cli/index.js agent hanzla` spawns `claude --agent rihal-hanzla` (or fails with "claude not found" if not on PATH in test)
3. `node cli/index.js agent badname` prints error + available list, exits 1
4. `node cli/index.js agent` (no args) prints usage + list
5. `node cli/index.js help` shows `agent` in the TEAM section
6. `cli/agent.js` ≤80 lines
7. `cli/index.js` still boots without errors

## Constraints

- Use `child_process.spawnSync` with `stdio: 'inherit'` — interactive, not piped
- Do NOT use `execSync` (no shell injection vector)
- No new npm dependencies
- `cli/agent.js` must follow existing module pattern: `module.exports = function agent(args, { packageRoot }) {}`
