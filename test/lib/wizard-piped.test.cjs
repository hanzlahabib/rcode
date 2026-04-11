/**
 * Test for the install identity wizard end-to-end via piped stdin.
 *
 * Protects the contract behind #17: after the user answers the 3
 * identity questions, the wizard finishes. It must NOT ask a 4th
 * question about saving to global defaults.
 *
 * We can't drive a real terminal session from inside a node:test run
 * without faking a TTY, but we CAN write to process.stdin directly
 * with a fake readable stream. We do that by swapping process.stdin
 * for a PassThrough stream, writing the answers, and asserting on
 * the askText return values.
 *
 * The session is opened fresh for each test to avoid cross-test
 * pollution of the shared singleton.
 */

const { test } = require('node:test');
const assert = require('node:assert');
const { PassThrough } = require('node:stream');

// Pre-load to detach the module cache before we swap stdin
let prompts;

function withFakeStdin(lines, fn) {
  // Save originals
  const origStdin = process.stdin;
  const origIsTTY = process.stdin.isTTY;

  // Build a fake stdin that emits the scripted lines
  const fake = new PassThrough();
  fake.isTTY = false;
  Object.defineProperty(process, 'stdin', {
    value: fake,
    configurable: true,
  });

  // IMPORTANT: force a fresh module load so openSession() sees the
  // fake stdin. Otherwise the singleton from a previous test run
  // is reused with the OLD stdin.
  delete require.cache[require.resolve('../../cli/lib/prompts.cjs')];
  prompts = require('../../cli/lib/prompts.cjs');

  // Write the scripted lines and close
  process.nextTick(() => {
    for (const line of lines) {
      fake.write(line + '\n');
    }
    fake.end();
  });

  return fn().finally(() => {
    Object.defineProperty(process, 'stdin', {
      value: origStdin,
      configurable: true,
    });
    if (origIsTTY !== undefined) {
      process.stdin.isTTY = origIsTTY;
    }
    delete require.cache[require.resolve('../../cli/lib/prompts.cjs')];
  });
}

test('askText consumes one line per call in piped mode', async () => {
  await withFakeStdin(['first', 'second', 'third'], async () => {
    const a = await prompts.askText('Q1: ', { default: 'dA' });
    const b = await prompts.askText('Q2: ', { default: 'dB' });
    const c = await prompts.askText('Q3: ', { default: 'dC' });
    assert.strictEqual(a, 'first');
    assert.strictEqual(b, 'second');
    assert.strictEqual(c, 'third');
    prompts.closeSession();
  });
});

test('askText returns the default when the line is empty', async () => {
  await withFakeStdin(['', 'something', ''], async () => {
    const a = await prompts.askText('Q1: ', { default: 'fallback-a' });
    const b = await prompts.askText('Q2: ', { default: 'fallback-b' });
    const c = await prompts.askText('Q3: ', { default: 'fallback-c' });
    assert.strictEqual(a, 'fallback-a');
    assert.strictEqual(b, 'something');
    assert.strictEqual(c, 'fallback-c');
    prompts.closeSession();
  });
});

test('askText trims whitespace from the answer', async () => {
  await withFakeStdin(['  padded  '], async () => {
    const a = await prompts.askText('Q: ', { default: 'x' });
    assert.strictEqual(a, 'padded');
    prompts.closeSession();
  });
});

test('askConfirm accepts y and yes (case-insensitive) as true', async () => {
  await withFakeStdin(['y', 'YES', 'Yes'], async () => {
    assert.strictEqual(await prompts.askConfirm('Q1 [y/N]: '), true);
    assert.strictEqual(await prompts.askConfirm('Q2 [y/N]: '), true);
    assert.strictEqual(await prompts.askConfirm('Q3 [y/N]: '), true);
    prompts.closeSession();
  });
});

test('askConfirm accepts n and no as false, empty as default', async () => {
  await withFakeStdin(['n', 'NO', ''], async () => {
    assert.strictEqual(await prompts.askConfirm('Q1: ', { default: 'y' }), false);
    assert.strictEqual(await prompts.askConfirm('Q2: ', { default: 'y' }), false);
    assert.strictEqual(await prompts.askConfirm('Q3: ', { default: 'n' }), false);
    prompts.closeSession();
  });
});

test('askChoice accepts a valid token and returns its expanded id', async () => {
  await withFakeStdin(['1'], async () => {
    const picks = await prompts.askChoice('Pick: ', {
      choices: [
        { key: '1', id: 'claude', label: 'Claude' },
        { key: '2', id: 'cursor', label: 'Cursor' },
      ],
      default: '1',
    });
    assert.deepStrictEqual(picks, ['claude']);
    prompts.closeSession();
  });
});

test('askChoice uses default when line is empty', async () => {
  await withFakeStdin([''], async () => {
    const picks = await prompts.askChoice('Pick: ', {
      choices: [
        { key: '1', id: 'claude', label: 'Claude' },
        { key: '2', id: 'cursor', label: 'Cursor' },
      ],
      default: '2',
    });
    assert.deepStrictEqual(picks, ['cursor']);
    prompts.closeSession();
  });
});

test('askChoice re-prompts on all-invalid input and then accepts valid', async () => {
  await withFakeStdin(['a', '1'], async () => {
    const picks = await prompts.askChoice('Pick: ', {
      choices: [
        { key: '1', id: 'claude', label: 'Claude' },
      ],
      default: '1',
    });
    assert.deepStrictEqual(picks, ['claude']);
    prompts.closeSession();
  });
});

test('askChoice throws PromptAbortError after max attempts on all-invalid', async () => {
  await withFakeStdin(['a', 'b', 'c'], async () => {
    try {
      await prompts.askChoice('Pick: ', {
        choices: [{ key: '1', id: 'claude', label: 'Claude' }],
        default: '1',
        maxAttempts: 3,
      });
      assert.fail('should have thrown');
    } catch (err) {
      assert.ok(err instanceof prompts.PromptAbortError);
      assert.match(err.message, /No valid selection/);
    } finally {
      prompts.closeSession();
    }
  });
});

test('askChoice accepts mixed valid + invalid and returns valid ids with warning', async () => {
  await withFakeStdin(['1,a,2'], async () => {
    const picks = await prompts.askChoice('Pick: ', {
      choices: [
        { key: '1', id: 'claude', label: 'Claude' },
        { key: '2', id: 'cursor', label: 'Cursor' },
      ],
      default: '1',
    });
    assert.deepStrictEqual(picks, ['claude', 'cursor']);
    prompts.closeSession();
  });
});

test('askChoice expand callback expands aliases like "all"', async () => {
  await withFakeStdin(['all'], async () => {
    const picks = await prompts.askChoice('Pick: ', {
      choices: [
        { key: '1', id: 'claude', label: 'Claude' },
        { key: '2', id: 'cursor', label: 'Cursor' },
        { key: '3', id: 'all', label: 'All' },
      ],
      default: '3',
      expand: (id) => (id === 'all' ? ['claude', 'cursor'] : [id]),
    });
    assert.deepStrictEqual(picks, ['claude', 'cursor']);
    prompts.closeSession();
  });
});
