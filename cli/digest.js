/**
 * rcode digest — print compact agent digests
 *
 * Resolution order for a specific agent:
 *   1. rcode/digests/<name>.md            (curated 20-line digest)
 *   2. rcode/agents/rcode-<name>.md       (fallback: full agent file)
 *
 * Accepts both `sadiq` and `rcode-sadiq` as input (rcode- prefix stripped).
 */

const fs = require('fs');
const path = require('path');

function normalize(name) {
  const stripped = name.replace(/^rcode-/, '');
  // Reject path traversal attempts — names must be simple identifiers
  if (stripped.includes('..') || stripped.includes('/') || stripped.includes('\\')) {
    throw new Error(`Invalid agent name: '${name}'`);
  }
  return stripped;
}

function listAvailable(digestDir, agentsDir) {
  const digestNames = fs.existsSync(digestDir)
    ? fs.readdirSync(digestDir).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => f.replace('.md', ''))
    : [];
  const agentNames = fs.existsSync(agentsDir)
    ? fs.readdirSync(agentsDir)
        .filter((f) => f.endsWith('.md') && f.startsWith('rcode-'))
        .map((f) => f.replace(/^rcode-/, '').replace('.md', ''))
    : [];
  return Array.from(new Set([...digestNames, ...agentNames])).sort();
}

function resolveAgentFile(name, digestDir, agentsDir) {
  const digestFile = path.join(digestDir, `${name}.md`);
  if (fs.existsSync(digestFile)) return { file: digestFile, source: 'digest' };
  const agentFile = path.join(agentsDir, `rcode-${name}.md`);
  if (fs.existsSync(agentFile)) return { file: agentFile, source: 'agent' };
  return null;
}

module.exports = function digest(args, { packageRoot }) {
  const digestDir = path.join(packageRoot, 'rcode/digests');
  const agentsDir = path.join(packageRoot, 'rcode/agents');
  const specificAgent = args[0];

  if (specificAgent) {
    const name = normalize(specificAgent);
    const resolved = resolveAgentFile(name, digestDir, agentsDir);
    if (!resolved) {
      console.error(`No digest or agent found for: ${specificAgent}`);
      console.error(`Available: ${listAvailable(digestDir, agentsDir).join(', ')}`);
      process.exit(1);
    }
    if (resolved.source === 'agent') {
      console.log(`# (fallback: full agent file — no curated digest exists)\n`);
    }
    console.log(fs.readFileSync(resolved.file, 'utf8'));
    return;
  }

  const names = listAvailable(digestDir, agentsDir);
  console.log(`\n🕌 All rcode Agent Digests\n`);
  for (const name of names) {
    const resolved = resolveAgentFile(name, digestDir, agentsDir);
    if (!resolved) continue;
    console.log(fs.readFileSync(resolved.file, 'utf8'));
    console.log('\n' + '═'.repeat(80) + '\n');
  }
};
