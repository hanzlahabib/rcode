/**
 * rihal-code digest — print compact agent digests
 */

const fs = require('fs');
const path = require('path');

module.exports = function digest(args, { packageRoot }) {
  const digestDir = path.join(packageRoot, 'rihal/digests');
  const specificAgent = args[0];

  if (specificAgent) {
    const file = path.join(digestDir, `${specificAgent}.md`);
    if (!fs.existsSync(file)) {
      console.error(`No digest found for agent: ${specificAgent}`);
      console.error(`Available: ${fs.readdirSync(digestDir).filter(f => f.endsWith('.md') && f !== 'README.md').map(f => f.replace('.md','')).join(', ')}`);
      process.exit(1);
    }
    console.log(fs.readFileSync(file, 'utf8'));
    return;
  }

  // Print all digests
  const files = fs.readdirSync(digestDir).filter((f) => f.endsWith('.md') && f !== 'README.md').sort();

  console.log(`\n🕌 All Rihal Code Agent Digests\n`);
  for (const file of files) {
    const content = fs.readFileSync(path.join(digestDir, file), 'utf8');
    console.log(content);
    console.log('\n' + '═'.repeat(80) + '\n');
  }
};
