/**
 * Memory Bank template tests.
 *
 * Verifies that rihal/templates/memory/ contains the structure rcode-memory-init
 * expects to copy into a fresh project. The init skill is documented in
 * rihal/skills/core/rihal-memory-init/SKILL.md and copies this directory
 * verbatim, so any drift here breaks the bootstrap flow.
 *
 * Run: node --test test/memory-templates.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TEMPLATES_DIR = path.join(PROJECT_ROOT, 'rihal', 'templates', 'memory');

const REQUIRED_FILES = [
  'INDEX.md',
  'project/stack.md',
  'project/decisions.md',
  'project/glossary.md',
  'people/stakeholders.md',
  'people/team.md',
  'milestones/current.md',
  'milestones/archive/.gitkeep',
  'incidents/known-issues.md',
  'incidents/post-mortems/.gitkeep',
  'change-records/.gitkeep',
  'distillates/project.distillate.md',
  'distillates/stack.distillate.md',
];

test('memory-templates: directory exists', () => {
  assert.ok(fs.existsSync(TEMPLATES_DIR), `expected templates dir at ${TEMPLATES_DIR}`);
});

test('memory-templates: every required file exists', () => {
  const missing = [];
  for (const rel of REQUIRED_FILES) {
    const full = path.join(TEMPLATES_DIR, rel);
    if (!fs.existsSync(full)) missing.push(rel);
  }
  assert.deepEqual(missing, [], `Missing template files:\n${missing.join('\n')}`);
});

test('memory-templates: INDEX.md references all major sections', () => {
  const indexPath = path.join(TEMPLATES_DIR, 'INDEX.md');
  const text = fs.readFileSync(indexPath, 'utf8');
  // Every subdirectory should be referenced from INDEX so a fresh user
  // can navigate the bank without reading source code.
  const expected = ['project/', 'people/', 'milestones/', 'incidents/', 'change-records/', 'distillates/'];
  const missing = expected.filter((p) => !text.includes(p));
  assert.deepEqual(missing, [], `INDEX.md should reference subdirectories:\n${missing.join('\n')}`);
});

test('memory-templates: distillates declare generated:true frontmatter', () => {
  // Distillates are regenerated, never hand-edited. The frontmatter contract
  // protects users from accidentally editing them.
  const offenders = [];
  for (const rel of ['distillates/project.distillate.md', 'distillates/stack.distillate.md']) {
    const text = fs.readFileSync(path.join(TEMPLATES_DIR, rel), 'utf8');
    if (!/^generated:\s*true/m.test(text)) offenders.push(rel);
    if (!/regenerate-with:/m.test(text)) offenders.push(`${rel} (missing regenerate-with)`);
  }
  assert.deepEqual(offenders, [], `Distillates should declare generated:true and regenerate-with:\n${offenders.join('\n')}`);
});

test('memory-templates: placeholders use {{PROJECT_NAME}} consistently', () => {
  // The init skill substitutes {{PROJECT_NAME}} and {{INIT_DATE}}. If a
  // template uses a different placeholder (e.g. PROJECT_TITLE) the substitution
  // silently fails and users see literal handlebars.
  const allowed = new Set(['{{PROJECT_NAME}}', '{{INIT_DATE}}']);
  const offenders = [];
  for (const rel of REQUIRED_FILES.filter((p) => p.endsWith('.md'))) {
    const text = fs.readFileSync(path.join(TEMPLATES_DIR, rel), 'utf8');
    const matches = text.match(/\{\{[A-Z_]+\}\}/g) || [];
    for (const m of matches) {
      if (!allowed.has(m)) offenders.push(`${rel} — unknown placeholder: ${m}`);
    }
  }
  assert.deepEqual(offenders, [], `Template placeholder consistency:\n${offenders.join('\n')}`);
});
