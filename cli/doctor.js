/**
 * rihal-code doctor — run compliance check on skills
 */

const fs = require('fs');
const path = require('path');

function findSkillFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSkillFiles(full));
    } else if (entry.isFile() && entry.name === 'SKILL.md') {
      results.push(full);
    }
  }
  return results;
}

function checkCompliance(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const missing = [];
  if (!/^name:/m.test(content)) missing.push('name');
  if (!/^description:/m.test(content)) missing.push('description');
  if (!/^## Output Format/m.test(content)) missing.push('Output Format');
  if (!/^## Examples/m.test(content)) missing.push('Examples');
  return missing;
}

module.exports = function doctor(args, { packageRoot }) {
  console.log(`\n🕌 Rihal Code — Compliance Doctor\n`);

  // Core skills (init, help, brainstorming, etc.) are utility skills with their
  // own conventions — they don't follow the 5-component standard used by agents
  // and actions. Skip them in the compliance check.
  const skillDirs = [
    path.join(packageRoot, 'rihal/skills/agents'),
    path.join(packageRoot, 'rihal/skills/actions'),
  ];

  let totalSkills = 0;
  let failing = 0;
  const problems = [];

  for (const dir of skillDirs) {
    const files = findSkillFiles(dir);
    for (const file of files) {
      totalSkills++;
      const missing = checkCompliance(file);
      if (missing.length > 0) {
        failing++;
        const rel = path.relative(packageRoot, file);
        problems.push({ file: rel, missing });
      }
    }
  }

  if (problems.length > 0) {
    console.log(`❌ ${failing} / ${totalSkills} skills are non-compliant:\n`);
    for (const p of problems) {
      console.log(`   ${p.file}`);
      console.log(`     missing: ${p.missing.join(', ')}`);
    }
  } else {
    console.log(`✅ All ${totalSkills} skills are compliant with the 5-component standard.`);
  }

  // Check digest count
  const digestDir = path.join(packageRoot, 'rihal/digests');
  if (fs.existsSync(digestDir)) {
    const digestCount = fs.readdirSync(digestDir).filter(f => f.endsWith('.md') && f !== 'README.md').length;
    console.log(`\n📋 Agent digests: ${digestCount}`);
  }

  // Check dashboard server
  const dashboardPath = path.join(packageRoot, 'server/dashboard.js');
  if (fs.existsSync(dashboardPath)) {
    console.log(`📊 Dashboard server: present`);
  }

  // Check models config
  const modelsPath = path.join(packageRoot, 'rihal/config/models.json');
  if (fs.existsSync(modelsPath)) {
    try {
      const models = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
      const agentCount = Object.keys(models.agents || {}).length;
      const tierCount = Object.keys(models.tiers || {}).length;
      console.log(`⚙️  Model config: ${tierCount} tiers, ${agentCount} agents mapped`);
    } catch (e) {
      console.log(`⚠️  Model config: exists but invalid JSON`);
    }
  }

  console.log();
  process.exit(failing > 0 ? 1 : 0);
};
