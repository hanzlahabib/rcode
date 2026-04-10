/**
 * rihal-code team — list the team roster
 */

const fs = require('fs');
const path = require('path');

module.exports = function team(args, { packageRoot }) {
  const digestDir = path.join(packageRoot, 'rihal/digests');

  if (!fs.existsSync(digestDir)) {
    console.error('Agent digests not found. Is the package installed correctly?');
    process.exit(1);
  }

  const files = fs.readdirSync(digestDir).filter((f) => f.endsWith('.md') && f !== 'README.md');

  console.log(`\n🕌 Rihal Code Team Roster (${files.length} agents)\n`);
  console.log('─'.repeat(80));

  for (const file of files.sort()) {
    const content = fs.readFileSync(path.join(digestDir, file), 'utf8');
    const firstLine = content.split('\n')[0].replace(/^#\s*/, '');
    const arabic = (content.match(/\*\*Arabic:\*\*\s*(.+)/) || [])[1] || '';
    const authority = (content.match(/\*\*Authority:\*\*\s*(.+)/) || [])[1] || '';

    console.log(`${firstLine.padEnd(45)} ${arabic.padEnd(15)}`);
    if (authority) console.log(`  → ${authority.slice(0, 70)}`);
    console.log();
  }

  console.log('─'.repeat(80));
  console.log(`\nFor full agent details: cat rihal/digests/{agent}.md`);
  console.log(`For full skill: rihal/skills/agents/{agent-dir}/SKILL.md\n`);
};
