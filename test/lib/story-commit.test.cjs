/**
 * Tests for cli/lib/story-commit.cjs — pure formatter with label
 * validation. No git, no I/O — just string in, string out.
 */

const { test } = require('node:test');
const assert = require('node:assert');

const {
  formatCommitMessage,
  validateLabels,
  parseTrailers,
  extractLabels,
  VALID_LABELS,
  VALID_COMMIT_TYPES,
} = require('../../cli/lib/story-commit.cjs');

test('formatCommitMessage produces Conventional Commits header', () => {
  const msg = formatCommitMessage({
    type: 'feat',
    storyId: 'story-1-2-signup',
    title: 'email/password login',
  });
  assert.ok(msg.startsWith('feat(story-1-2): email/password login'));
});

test('formatCommitMessage derives scope from story id pattern', () => {
  const msg = formatCommitMessage({
    type: 'fix',
    storyId: 'story-3-4-edge-case',
    title: 'handle nulls',
  });
  assert.ok(msg.startsWith('fix(story-3-4): handle nulls'));
});

test('formatCommitMessage uses raw story id as scope when pattern doesnt match', () => {
  const msg = formatCommitMessage({
    type: 'docs',
    storyId: 'custom-story',
    title: 'readme',
  });
  assert.ok(msg.startsWith('docs(custom-story): readme'));
});

test('formatCommitMessage rejects invalid commit type with suggestion', () => {
  try {
    formatCommitMessage({
      type: 'feet',
      storyId: 'story-1-1',
      title: 'title',
    });
    assert.fail('should have thrown');
  } catch (err) {
    assert.match(err.message, /Invalid commit type/);
    assert.strictEqual(err.suggestion, 'feat');
  }
});

test('formatCommitMessage rejects invalid commit type without suggestion when typo is too far', () => {
  try {
    formatCommitMessage({
      type: 'nonsense',
      storyId: 'story-1-1',
      title: 'title',
    });
    assert.fail('should have thrown');
  } catch (err) {
    assert.match(err.message, /Invalid commit type/);
    assert.strictEqual(err.suggestion, null);
  }
});

test('formatCommitMessage rejects invalid labels with suggestion', () => {
  try {
    formatCommitMessage({
      type: 'feat',
      storyId: 'story-1-1',
      title: 'title',
      labels: ['priority:ciritical'],
    });
    assert.fail('should have thrown');
  } catch (err) {
    assert.match(err.message, /Invalid label/);
    assert.strictEqual(err.suggestion, 'priority:critical');
  }
});

test('formatCommitMessage requires storyId', () => {
  assert.throws(
    () => formatCommitMessage({ type: 'feat', title: 'x' }),
    /storyId is required/,
  );
});

test('formatCommitMessage requires title', () => {
  assert.throws(
    () => formatCommitMessage({ type: 'feat', storyId: 'story-1-1' }),
    /title is required/,
  );
});

test('formatCommitMessage emits all trailer fields in canonical order', () => {
  const msg = formatCommitMessage({
    type: 'feat',
    storyId: 'story-1-1-login',
    title: 'login form',
    issueNum: 42,
    sprint: 'sprint-01',
    milestone: 'm-0.2.0',
    labels: ['type:story', 'priority:high'],
    coordinatedBy: ['Haitham (frontend)', 'Yousef (backend)'],
  });

  const lines = msg.split('\n');
  assert.ok(lines.includes('Refs: #42'));
  assert.ok(lines.includes('Sprint: sprint-01'));
  assert.ok(lines.includes('Story: story-1-1-login'));
  assert.ok(lines.includes('Milestone: m-0.2.0'));
  assert.ok(lines.includes('Labels: type:story, priority:high'));
  assert.ok(lines.includes('Co-ordinated-By: Haitham (frontend), Yousef (backend)'));

  // Order: Refs → Sprint → Story → Milestone → Labels → Co-ordinated-By
  const refsIdx = lines.indexOf('Refs: #42');
  const storyIdx = lines.indexOf('Story: story-1-1-login');
  const labelsIdx = lines.findIndex((l) => l.startsWith('Labels:'));
  assert.ok(refsIdx < storyIdx);
  assert.ok(storyIdx < labelsIdx);
});

test('formatCommitMessage supports optional body lines', () => {
  const msg = formatCommitMessage({
    type: 'feat',
    storyId: 'story-1-1',
    title: 'title',
    bodyLines: ['First body line.', 'Second body line.'],
  });

  assert.ok(msg.includes('First body line.'));
  assert.ok(msg.includes('Second body line.'));
  // Body should appear after header blank line, before trailers
  const lines = msg.split('\n');
  assert.strictEqual(lines[0], 'feat(story-1-1): title');
  assert.strictEqual(lines[1], '');
  assert.strictEqual(lines[2], 'First body line.');
});

test('formatCommitMessage omits trailers section when nothing to emit', () => {
  const msg = formatCommitMessage({
    type: 'chore',
    storyId: 'story-1-1',
    title: 'cleanup',
  });
  // No labels, no issueNum, no sprint, no milestone, no coordinators
  // — but we always include a Story trailer, so there will still be one.
  assert.ok(msg.includes('Story: story-1-1'));
});

test('validateLabels returns ok:true for valid labels', () => {
  const result = validateLabels(['type:story', 'priority:high', 'FE']);
  assert.strictEqual(result.ok, true);
});

test('validateLabels returns the first invalid label with suggestion', () => {
  const result = validateLabels(['type:story', 'prioriy:high']);
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.invalid, 'prioriy:high');
  assert.strictEqual(result.suggestion, 'priority:high');
});

test('validateLabels rejects non-array input', () => {
  const result = validateLabels('not-an-array');
  assert.strictEqual(result.ok, false);
});

test('parseTrailers extracts key:value pairs from a commit body', () => {
  const msg = `feat(story-1-1): title

Some body text.

Refs: #42
Sprint: sprint-01
Labels: type:story, priority:high`;

  const trailers = parseTrailers(msg);
  assert.strictEqual(trailers.Refs, '#42');
  assert.strictEqual(trailers.Sprint, 'sprint-01');
  assert.strictEqual(trailers.Labels, 'type:story, priority:high');
});

test('parseTrailers handles empty / null input', () => {
  assert.deepStrictEqual(parseTrailers(''), {});
  assert.deepStrictEqual(parseTrailers(null), {});
});

test('extractLabels returns [] when no Labels trailer present', () => {
  assert.deepStrictEqual(extractLabels({}), []);
  assert.deepStrictEqual(extractLabels({ Sprint: 'sprint-01' }), []);
});

test('extractLabels splits and trims the Labels trailer', () => {
  const labels = extractLabels({ Labels: 'type:story, priority:high, FE' });
  assert.deepStrictEqual(labels, ['type:story', 'priority:high', 'FE']);
});

test('VALID_LABELS contains canonical taxonomy', () => {
  // Spot-check one from each category
  assert.ok(VALID_LABELS.has('type:story'));
  assert.ok(VALID_LABELS.has('priority:high'));
  assert.ok(VALID_LABELS.has('status:in-progress'));
  assert.ok(VALID_LABELS.has('FE'));
});

test('VALID_COMMIT_TYPES contains Conventional Commits types', () => {
  for (const t of ['feat', 'fix', 'refactor', 'docs', 'chore', 'perf']) {
    assert.ok(VALID_COMMIT_TYPES.has(t), `missing type: ${t}`);
  }
});
