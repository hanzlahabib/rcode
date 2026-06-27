/**
 * workflow-config-audit gate (#945).
 *
 * cmdWorkflowConfigAudit scans workflows for stale `.planning/config.json`
 * references (the config moved to `.rcode/config.yaml`, #733). The command
 * existed but nothing ran it, so stale refs could accumulate undetected. This
 * test exercises it and fails if any workflow still references the old config.
 *
 * Run: node --test test/workflow-config-audit.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const TOOLS = path.resolve(__dirname, '../rcode/bin/rcode-tools.cjs');

test('no workflow references the stale .planning/config.json', () => {
  const out = execFileSync(process.execPath, [TOOLS, 'workflow-config-audit'], {
    env: { ...process.env, RCODE_PROJECT_ROOT: path.resolve(__dirname, '..') },
    encoding: 'utf8',
  });
  const res = JSON.parse(out);
  assert.strictEqual(res.ok, true, 'audit should run cleanly');
  assert.ok(res.audited > 0, 'audit should scan some workflows');
  assert.strictEqual(
    res.stale_count, 0,
    `Workflows still reference the stale .planning/config.json:\n` +
      JSON.stringify(res.hits, null, 2),
  );
});
