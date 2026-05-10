/**
 * rcode agent <name> — launch a specialist agent via claude --agent rihal-<name>
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = function agent(args, { packageRoot }) {
  const agentDir = path.join(packageRoot, 'rihal/agents');

  // --list or zero args: enumerate available agents
  if (args.includes('--list') || args.length === 0) {
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

  // Validate agent file exists
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

  // Check claude binary is on PATH
  const claudeCheck = spawnSync('which', ['claude'], { encoding: 'utf8' });
  if (claudeCheck.status !== 0) {
    console.error('Error: claude binary not found. Install Claude Code: https://claude.ai/code');
    process.exit(1);
  }

  // Collect pass-through args after -- separator
  const dashIdx = args.indexOf('--');
  const extra = dashIdx !== -1 ? args.slice(dashIdx + 1) : [];

  // Spawn claude --agent rihal-<name> [extra...]
  const result = spawnSync('claude', ['--agent', agentName, ...extra], { stdio: 'inherit' });
  process.exit(result.status ?? 0);
};
