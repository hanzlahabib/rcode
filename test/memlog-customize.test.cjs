/**
 * memlog + customize — the two surfaces that keep a run's reasoning and a
 * project's local rules from being lost.
 *
 * memlog: decisions were recorded manually at the end of a session, so anything
 * decided in between vanished on the next /clear or resume.
 * customize: customising rcode meant editing installed files, which the
 * installer regenerates — the edit worked until the next update, silently.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const memlog = require(path.resolve(__dirname, '../rcode/bin/lib/memlog.cjs'));
const customize = require(path.resolve(__dirname, '../rcode/bin/lib/customize.cjs'));

function tmp(sub) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-mc-'));
  const p = path.join(d, sub);
  fs.mkdirSync(p, { recursive: true });
  return p;
}

test('memlog appends are ordered and typed', () => {
  const planning = tmp('.planning');
  memlog.append(planning, { type: 'decision', text: 'Stack: Astro' });
  memlog.append(planning, { type: 'assumption', text: 'English only' });
  const r = memlog.read(planning);
  assert.equal(r.total, 2);
  assert.equal(r.entries[0].text, 'Stack: Astro');
  assert.match(r.entries[1].type, /^assumption/);
});

test('memlog rejects an unknown type rather than logging it', () => {
  const planning = tmp('.planning');
  assert.throws(() => memlog.append(planning, { type: 'guess', text: 'x' }), /unknown memlog type/);
});

test('memlog open surfaces assumptions, overrides and blockers only', () => {
  const planning = tmp('.planning');
  memlog.append(planning, { type: 'decision', text: 'settled' });
  memlog.append(planning, { type: 'assumption', text: 'unconfirmed thing' });
  memlog.append(planning, { type: 'blocker', text: 'waiting on hosting' });
  const o = memlog.open(planning);
  assert.equal(o.count, 2);
  assert.deepEqual(o.open.map(e => e.text), ['unconfirmed thing', 'waiting on hosting']);
});

test('a pipe in the text cannot break the memlog table', () => {
  const planning = tmp('.planning');
  memlog.append(planning, { type: 'event', text: 'ran a | b | c' });
  const r = memlog.read(planning);
  assert.equal(r.total, 1, 'one row, not three');
  assert.equal(r.entries[0].text, 'ran a | b | c', 'the literal pipes survive the round trip');
});

test('customize returns an empty block when nothing is overridden', () => {
  const rcodeDir = tmp('.rcode');
  const r = customize.resolve(rcodeDir, 'plan');
  assert.equal(r.has_overrides, false);
  assert.equal(r.block, '', 'callers must never special-case the empty result');
});

test('customize layers team before user', () => {
  const rcodeDir = tmp('.rcode');
  fs.mkdirSync(path.join(rcodeDir, 'custom'), { recursive: true });
  fs.writeFileSync(path.join(rcodeDir, 'custom', 'plan.md'), 'team rule');
  fs.writeFileSync(path.join(rcodeDir, 'custom', 'plan.user.md'), 'personal rule');
  const r = customize.resolve(rcodeDir, 'plan');
  assert.deepEqual(r.layers.map(l => l.kind), ['team', 'user']);
  assert.ok(r.block.indexOf('team rule') < r.block.indexOf('personal rule'), 'team first, user last');
});

test('customize list distinguishes team-only from both layers', () => {
  const rcodeDir = tmp('.rcode');
  fs.mkdirSync(path.join(rcodeDir, 'custom'), { recursive: true });
  fs.writeFileSync(path.join(rcodeDir, 'custom', 'plan.md'), 'x');
  fs.writeFileSync(path.join(rcodeDir, 'custom', 'execute.md'), 'x');
  fs.writeFileSync(path.join(rcodeDir, 'custom', 'execute.user.md'), 'x');
  const l = customize.list(rcodeDir);
  const byName = Object.fromEntries(l.overrides.map(o => [o.name, o.kinds]));
  assert.deepEqual(byName.plan, ['team']);
  assert.deepEqual(byName.execute, ['team', 'user']);
});
