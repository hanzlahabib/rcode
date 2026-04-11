/**
 * Zero-dep interactive prompt helpers for the Rihal Code CLI.
 *
 * Why this exists:
 *   Hand-rolled readline.question() crashes or silently aborts when a user
 *   types an unexpected value (e.g. "a" instead of "1"). bmad-method uses
 *   @clack/prompts; we stay zero-dep by implementing a small, well-tested
 *   helper with validation loops, friendly errors, and clean SIGINT/EOF
 *   handling.
 *
 * Public API:
 *   askChoice(question, { choices, default, allowMulti, expand, maxAttempts })
 *     → Promise<string[]>   (resolved ids)
 *   askConfirm(question, { default, maxAttempts })
 *     → Promise<boolean>
 *   askText(question, { default, validate, maxAttempts })
 *     → Promise<string>
 *   PromptAbortError          — thrown on EOF / max-attempts / explicit abort
 *
 * All helpers:
 *   - Create and close their own readline.Interface (no leaks).
 *   - Install a one-shot SIGINT handler on first use that prints "Cancelled."
 *     and exits 0 (no stack trace).
 *   - Re-prompt on invalid input up to maxAttempts (default 3) rounds.
 *   - Accept empty input as "use default" when a default is provided.
 */

const readline = require('readline');

class PromptAbortError extends Error {
  constructor(message = 'Prompt aborted') {
    super(message);
    this.name = 'PromptAbortError';
  }
}

// Install SIGINT handler once — repeated requires don't stack handlers.
let sigintInstalled = false;
function installSigintHandler() {
  if (sigintInstalled) return;
  sigintInstalled = true;
  process.on('SIGINT', () => {
    // Newline so the "Cancelled." line doesn't append to the half-typed prompt.
    process.stdout.write('\n\nCancelled.\n');
    process.exit(0);
  });
}

/**
 * Process-wide shared readline session.
 *
 * Why singleton: opening and closing a fresh readline.Interface for each
 * prompt loses buffered pipe input between prompts — the second session
 * sees stdin as already closed (EOF). So we keep exactly one session for
 * the whole process lifetime. It's cheap (one interface) and it exits
 * naturally when the process exits.
 *
 * Why line-event queue instead of rl.question(): node's rl.question() has
 * a known quirk where the second call on piped input hangs even with
 * more lines buffered. A line queue + pending-resolver pattern avoids it.
 */
let sharedSession = null;
function getSession() {
  if (sharedSession) return sharedSession;
  sharedSession = openSession();
  return sharedSession;
}

function openSession() {
  installSigintHandler();
  const isTTY = !!process.stdin.isTTY;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: isTTY,
  });

  let closedByUs = false;
  let streamClosed = false;

  rl.on('close', () => {
    streamClosed = true;
  });

  // Two code paths:
  //
  // 1. TTY mode — hand the whole ask off to rl.question(). Readline
  //    owns printing the prompt, tracking cursor position, handling
  //    backspace / arrow keys / history. If we printed the prompt
  //    ourselves, readline's internal cursor tracking walks past the
  //    prompt on backspace and erases it — that was the bug in #16.
  //
  // 2. Piped mode (CI, test harness, rihal-code install | tee ...) —
  //    rl.question() has a quirk where the second call in a sequence
  //    can miss the next buffered line. The line-event queue pattern
  //    below avoids it: we listen for `line` events ourselves and
  //    match them to pending waiters.
  //
  // Both paths share the same closed-stream handling and abort semantics.

  const lineQueue = [];
  const waiters = [];

  if (!isTTY) {
    rl.on('line', (line) => {
      if (waiters.length > 0) {
        const { resolve } = waiters.shift();
        resolve(line);
      } else {
        lineQueue.push(line);
      }
    });
    rl.on('close', () => {
      // Reject every pending waiter so askers don't hang forever.
      while (waiters.length > 0) {
        const { reject } = waiters.shift();
        if (!closedByUs) {
          reject(new PromptAbortError('Input stream closed'));
        }
      }
    });
  }

  function ask(question) {
    if (isTTY) {
      if (streamClosed) {
        return Promise.reject(new PromptAbortError('Input stream closed'));
      }
      // Readline handles the whole prompt lifecycle: print, cursor,
      // backspace, submit. No manual process.stdout.write here — that
      // was the source of the backspace-erases-prompt bug (#16).
      return new Promise((resolve, reject) => {
        // readline docs: on close while a question is pending, resolve
        // is invoked with undefined. We treat that as abort.
        let settled = false;
        const onClose = () => {
          if (!settled && !closedByUs) {
            settled = true;
            reject(new PromptAbortError('Input stream closed'));
          }
        };
        rl.once('close', onClose);
        rl.question(question, (answer) => {
          if (settled) return;
          settled = true;
          rl.removeListener('close', onClose);
          resolve((answer || '').trim());
        });
      });
    }

    // Piped path — print prompt manually, drain queue before giving up.
    process.stdout.write(question);

    // CRITICAL: check the queue FIRST, even if the stream has closed.
    // Lines that were already read but not yet consumed must still be
    // returned. Only reject when both the queue is empty AND the stream
    // is closed — nothing more is coming.
    if (lineQueue.length > 0) {
      return Promise.resolve((lineQueue.shift() || '').trim());
    }
    if (streamClosed) {
      return Promise.reject(new PromptAbortError('Input stream closed'));
    }
    return new Promise((resolve, reject) => {
      waiters.push({
        resolve: (line) => resolve((line || '').trim()),
        reject,
      });
    });
  }

  function close() {
    closedByUs = true;
    rl.close();
  }

  return { ask, close };
}

/**
 * Ask the user to pick one or more choices from a list.
 *
 * choices: array of { key, id, label }
 *   - `key` is the short token the user types ("1", "2", ...).
 *   - `id`  is the canonical identifier returned to the caller.
 *   - `label` is the human name shown in error messages.
 *
 * Options:
 *   default      — default token(s) when user hits Enter (string, may be comma list)
 *   allowMulti   — if false, reject multi-token answers (default: true)
 *   expand       — optional (id) => string[] to expand aliases like "all"
 *   maxAttempts  — retry limit on all-invalid input (default: 3)
 *
 * Return value semantics:
 *   - All tokens valid  → return resolved/expanded ids
 *   - Mixed valid+invalid → accept valid, warn about invalid, return (no re-prompt)
 *   - Zero valid tokens  → print friendly error + list valid options + re-prompt
 *   - After maxAttempts failed rounds → throw PromptAbortError
 */
async function askChoice(
  question,
  {
    choices,
    default: defaultAnswer = '',
    allowMulti = true,
    expand = null,
    maxAttempts = 3,
  } = {}
) {
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error('askChoice: `choices` must be a non-empty array');
  }

  const validKeys = choices.map((c) => c.key);
  const validIds = choices.map((c) => c.id);
  const hint = `Valid options: ${validKeys.join(', ')} (or ${validIds.join(', ')})`;

  const session = getSession();
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const raw = await session.ask(question);
    const source = raw === '' ? defaultAnswer : raw;

    if (source === '') {
      console.log(`   ⚠ No input and no default. ${hint}`);
      continue;
    }

    const tokens = source
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!allowMulti && tokens.length > 1) {
      console.log(`   ⚠ Only one choice allowed, you typed ${tokens.length}.`);
      continue;
    }

    const resolved = [];
    const invalid = [];
    for (const tok of tokens) {
      const match = choices.find((c) => c.key === tok || c.id === tok);
      if (!match) {
        invalid.push(tok);
      } else if (expand) {
        for (const id of expand(match.id)) resolved.push(id);
      } else {
        resolved.push(match.id);
      }
    }

    if (resolved.length === 0) {
      console.log(`   ⚠ Didn't recognize: ${invalid.map((t) => `"${t}"`).join(', ')}`);
      console.log(`   ${hint}`);
      console.log();
      continue;
    }

    if (invalid.length > 0) {
      console.log(`   ⚠ Skipping unknown: ${invalid.map((t) => `"${t}"`).join(', ')}`);
    }

    // Deduplicate while preserving order
    return [...new Set(resolved)];
  }

  throw new PromptAbortError(
    `No valid selection after ${maxAttempts} attempts`
  );
}

/**
 * Yes/no prompt. Returns boolean.
 *
 * Options:
 *   default       — 'y' | 'n' (default: 'n')
 *   maxAttempts   — retry limit (default: 3)
 */
async function askConfirm(
  question,
  { default: defaultAnswer = 'n', maxAttempts = 3 } = {}
) {
  const dflt = defaultAnswer.toLowerCase() === 'y' ? 'y' : 'n';

  const session = getSession();
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const raw = (await session.ask(question)).toLowerCase();
    const answer = raw === '' ? dflt : raw;

    if (answer === 'y' || answer === 'yes') return true;
    if (answer === 'n' || answer === 'no') return false;

    console.log(`   ⚠ Please answer "y" or "n".`);
  }

  throw new PromptAbortError(
    `No valid yes/no answer after ${maxAttempts} attempts`
  );
}

/**
 * Free-text prompt with optional validation.
 *
 * Options:
 *   default      — returned when user hits Enter with no input
 *   validate     — (value) => true | string  (string = error message to show)
 *   maxAttempts  — retry limit (default: 3)
 */
async function askText(
  question,
  { default: defaultAnswer = '', validate = null, maxAttempts = 3 } = {}
) {
  const session = getSession();
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const raw = await session.ask(question);
    const value = raw === '' ? defaultAnswer : raw;

    if (validate) {
      const result = validate(value);
      if (result !== true) {
        console.log(`   ⚠ ${typeof result === 'string' ? result : 'Invalid input.'}`);
        continue;
      }
    } else if (value === '') {
      console.log(`   ⚠ Please enter a value.`);
      continue;
    }

    return value;
  }

  throw new PromptAbortError(
    `No valid text input after ${maxAttempts} attempts`
  );
}

/**
 * Close the shared session so the process can exit cleanly.
 * Safe to call even if no prompts were used. Idempotent.
 */
function closeSession() {
  if (sharedSession) {
    sharedSession.close();
    sharedSession = null;
  }
}

module.exports = {
  askChoice,
  askConfirm,
  askText,
  closeSession,
  PromptAbortError,
};
