/**
 * rcode agent <name> — launch a specialist agent via claude --agent rcode-<name>
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = function agent(args, { packageRoot }) {
  const agentDir = path.join(packageRoot, 'rcode/agents');

  // --list or zero args: enumerate available agents
  if (args.includes('--list') || args.length === 0) {
    const names = fs.readdirSync(agentDir)
      .filter(f => f.startsWith('rcode-') && f.endsWith('.md'))
      .map(f => f.replace(/^rcode-/, '').replace(/\.md$/, ''))
      .sort();
    if (args.length === 0) {
      console.log('Usage: rcode agent <name> [-- extra args]\n');
    }
    console.log(`Available agents (${names.length}):\n`);
    names.forEach(n => console.log(`  rcode agent ${n}`));
    return;
  }

  const name = args[0];
  // Strip rcode- prefix if already provided so rcode agent rcode-executor works (#882)
  const bare = name.startsWith('rcode-') ? name.slice('rcode-'.length) : name;
  const agentName = `rcode-${bare}`;

  // Validate agent file exists
  const agentFile = path.join(agentDir, `${agentName}.md`);
  if (!fs.existsSync(agentFile)) {
    const available = fs.readdirSync(agentDir)
      .filter(f => f.startsWith('rcode-') && f.endsWith('.md'))
      .map(f => f.replace(/^rcode-/, '').replace(/\.md$/, ''))
      .sort()
      .join(', ');
    console.error(`Error: No agent named '${agentName}' found.`);
    console.error(`Available: ${available}`);
    process.exit(1);
  }

  // Check claude binary is on PATH (cross-platform: 'where' on Windows, 'which' elsewhere)
  const whichCmd = process.platform === 'win32' ? 'where' : 'which';
  const claudeCheck = spawnSync(whichCmd, ['claude'], { encoding: 'utf8' });
  if (claudeCheck.status !== 0) {
    console.error('Error: claude binary not found. Install Claude Code: https://claude.ai/code');
    process.exit(1);
  }

  // Collect pass-through args after -- separator
  const dashIdx = args.indexOf('--');
  const extra = dashIdx !== -1 ? args.slice(dashIdx + 1) : [];

  // Spawn claude --agent rcode-<name> [extra...]
  const result = spawnSync('claude', ['--agent', agentName, ...extra], { stdio: 'inherit' });
  process.exit(result.status ?? 0);
};
