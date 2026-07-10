/**
 * rcode Local Orchestrator — port 7718
 *
 * Spawns interactive `claude` sessions inside a real pseudo-terminal
 * (node-pty) and bridges each one to the browser over a WebSocket.
 * The browser renders the raw terminal with xterm.js, so the session
 * is fully interactive — the user types, Claude responds, just like a
 * local terminal.
 *
 * HTTP (control plane):
 *   POST /api/run      { storyId, cmd?, runner?, model? } → spawn a PTY session
 *   POST /api/stop     { storyId }        → SIGTERM the PTY
 *   GET  /api/sessions                    → list all sessions (status is
 *        'blocked' instead of 'running' when the PTY is idle on a question —
 *        see looksBlocked(); each entry also carries lastOutputAt)
 *   GET  /api/runners                     → detected agent CLIs + their models
 *   GET  /api/history                    → completed run history (newest-first)
 * WebSocket (data plane):
 *   /ws/<storyId>?token=...               → live terminal I/O
 *
 * Wire protocol (JSON each frame):
 *   server→client  { t:'o', d }            terminal output
 *                  { t:'s', s }            status change (running|done|exited|stopped|error)
 *                  { t:'hist', d }         scrollback replay on connect
 *   client→server  { t:'i', d }            keystroke input
 *                  { t:'r', cols, rows }   resize
 */

'use strict';

const http   = require('http');
const path   = require('path');
const os     = require('os');
const crypto = require('crypto');
const fs     = require('fs');
const { execFile } = require('child_process');

// @lydell/node-pty ships prebuilt binaries and never invokes node-gyp, so a
// plain `npm install` works on any common platform with no build toolchain.
// It is still an optionalDependency: on an unsupported platform the require
// throws, the orchestrator stays up, and /api/run reports a clear error
// instead of crashing — `npx rcode` keeps working everywhere.
let pty = null;
try { pty = require('@lydell/node-pty'); } catch { /* handled in handleRun */ }

let WebSocketServer = null;
try { ({ WebSocketServer } = require('ws')); } catch { /* handled at boot */ }

const PORT = parseInt(process.env.ORCH_PORT || '7718', 10);
// Use the project root passed by the dashboard (RCODE_DIR → parent, or explicit
// PROJECT_ROOT env var). Fall back to cwd so standalone orchestrator runs work.
// NEVER use __dirname-relative path — that resolves to the npm package dir when
// rcode is installed globally, not the user's actual project.
const PROJECT_ROOT = process.env.PROJECT_ROOT
  || (process.env.RCODE_DIR ? path.dirname(process.env.RCODE_DIR) : null)
  || process.cwd();
const CLAUDE_BIN   = process.env.CLAUDE_BIN || 'claude';

// Per-session auth token — see authed(). The dashboard passes ORCH_TOKEN in
// via env; standalone runs generate one and print it on boot.
const AUTH_TOKEN = process.env.ORCH_TOKEN || crypto.randomBytes(24).toString('hex');

// storyId must be a safe single path segment — no separators, no traversal.
const STORY_ID_RE = /^[A-Za-z0-9._-]+$/;

// Command allowlist — the SECURITY BOUNDARY for the dashboard command runner.
// Only commands listed here may be launched via the UI command picker.
// Slash-commands that launch dev work (rcode-dev-story, rcode-execute, etc.)
// are NOT listed here; they are composed by the UI itself via storyId, not
// by the command runner. This list covers read-mostly and informational rcode
// slash-commands that are safe to run from the browser without further context.
const COMMAND_ALLOWLIST = new Set([
  '/rcode-init',
  '/rcode-status',
  '/rcode-progress',
  '/rcode-help',
  '/rcode-health',
  '/rcode-next',
  '/rcode-show',
  '/rcode-list-plans',
  '/rcode-sprint-status',
  '/rcode-config',
  '/rcode-diff',
  '/rcode-stats',
]);

// ── Runner registry ──────────────────────────────────────────────────────────
// Each entry describes one agent CLI the dashboard can launch. `args` builds
// the full argv array (never a shell string — user input is never shell-
// interpolated). `models` is the closed set accepted by POST /api/run; an
// empty/omitted model means "let the CLI use its own default", and an empty
// models[] hides the model dropdown in the UI entirely.
//
// Every args builder below is grounded in the CLI's real `--help` output
// (verified against the installed versions: codex-cli 0.139.0, grok 0.2.22,
// copilot 1.0.60). Each launches the CLI's INTERACTIVE entry — we spawn
// inside a PTY and the user keeps typing after the initial prompt — so
// headless one-shot flags (`copilot -p`, `gemini -p`, `grok --single`) are
// deliberately avoided: they exit after one response.
//
// `promptViaStdin: true` marks a CLI with no interactive initial-prompt flag
// (grok): the prompt is written to the PTY as keystrokes once the TUI is up.
//
// `beta: true` renders a "Beta" pill in the picker — claude is the first-class
// default; every other runner is beta. `untested: true` forces a runner
// unavailable (reason 'untested flags') even when its binary is on PATH:
// nobody has live-verified its argv, so the picker disables it with a tooltip
// instead of letting users hit a crash.
//
// The default runner is claude with no model flag — identical argv to the
// pre-registry behavior, so /api/run calls without {runner, model} are
// backward compatible.
const RUNNERS = [
  {
    // claude --help: `claude [prompt]` starts interactive; `--model` takes an
    // alias ('fable', 'opus', 'sonnet') or a full model id like fable-5.
    id: 'claude', label: 'Claude Code', bin: CLAUDE_BIN, modelFlag: '--model',
    models: ['fable-5', 'opus', 'sonnet', 'haiku'],
    // #918 — orchestrated sessions run in a detached PTY with no human at the
    // keyboard to answer permission prompts, so the agent is launched with
    // --dangerously-skip-permissions. This is a real privilege grant: the
    // agent can run any local command without a gate. Containment relies on
    // (a) the loopback-only + token-gated API and (b) running in the project
    // CWD. A visible warning is emitted at spawn time (see handleRun).
    args: (model, prompt) => model
      ? [prompt, '--dangerously-skip-permissions', '--model', model]
      : [prompt, '--dangerously-skip-permissions'],
  },
  {
    // codex --help: `codex [OPTIONS] [PROMPT]` — positional prompt starts the
    // interactive TUI (`codex exec` is the NON-interactive path; not used).
    // `-m, --model <MODEL>`. Model list: gpt-5.5 is the current model on this
    // install (~/.codex/config.toml model migrations end at gpt-5.5); older
    // ids are auto-migrated server-side, so only the verified-current one is
    // offered. Live-verified: in an untrusted directory codex first shows its
    // own interactive "Do you trust the contents of this directory?" dialog —
    // that is codex UX, not a launch failure; answer it in the terminal.
    // A wrong model id does NOT abort the TUI (verified with a bogus id).
    id: 'codex', label: 'Codex CLI', bin: 'codex', modelFlag: '--model', beta: true,
    models: ['gpt-5.5'],
    args: (model, prompt) => model ? ['--model', model, prompt] : [prompt],
  },
  {
    // copilot --help: `-i, --interactive <prompt>` = "Start interactive mode
    // and automatically execute this prompt" (NOT `-p`, which is headless and
    // exits after completion). `--model <model>` documents only 'auto' as a
    // guaranteed value ("use 'auto' to let Copilot pick automatically").
    id: 'copilot', label: 'GitHub Copilot CLI', bin: 'copilot', modelFlag: '--model', beta: true,
    models: ['auto'],
    args: (model, prompt) => model ? ['--model', model, '-i', prompt] : ['-i', prompt],
  },
  {
    // gemini --help: `-i, --prompt-interactive <prompt>` = "Execute the
    // provided prompt and continue in interactive mode"; `-m, --model`.
    // gemini-2.5-pro / gemini-2.5-flash are the documented stable ids.
    id: 'gemini', label: 'Gemini CLI', bin: 'gemini', modelFlag: '--model', beta: true,
    models: ['gemini-2.5-pro', 'gemini-2.5-flash'],
    args: (model, prompt) => model ? ['--model', model, '-i', prompt] : ['-i', prompt],
  },
  {
    // grok --help: the TUI has NO interactive initial-prompt flag — `-p` /
    // `--prompt-file` are single-turn headless and exit after the response.
    // So: launch the bare TUI (plus `-m, --model`) and type the prompt into
    // the PTY after boot (promptViaStdin). Model ids come from the CLI's own
    // ~/.grok/models_cache.json: grok-build, grok-composer-2.5-fast.
    id: 'grok', label: 'Grok CLI', bin: 'grok', modelFlag: '--model', beta: true,
    models: ['grok-build', 'grok-composer-2.5-fast'],
    promptViaStdin: true,
    args: (model) => model ? ['--model', model] : [],
  },
  {
    // cursor-agent --help: `cursor-agent [options] [prompt...]` — positional
    // prompt, interactive by default; `--model <model>` with documented
    // examples "gpt-5, sonnet-4, sonnet-4-thinking".
    id: 'cursor', label: 'Cursor Agent', bin: 'cursor-agent', modelFlag: '--model', beta: true,
    models: ['gpt-5', 'sonnet-4', 'sonnet-4-thinking'],
    args: (model, prompt) => model ? ['--model', model, prompt] : [prompt],
  },
  {
    // Not installed on any tested machine — its flags have never been
    // live-verified, so `untested` keeps it disabled (picker tooltip:
    // 'untested flags') even if an `antigravity` binary appears on PATH.
    // Remove `untested` only after grounding the argv in its real --help
    // and a successful spawn test.
    id: 'antigravity', label: 'Antigravity', bin: 'antigravity', modelFlag: null, beta: true,
    untested: true,
    models: [],
    args: (model, prompt) => [prompt],
  },
];

// How long to wait before typing the initial prompt into a promptViaStdin
// runner's PTY — the TUI needs to finish mounting or the keystrokes land on
// a splash screen. PTYs buffer input, so erring high is safe.
const STDIN_PROMPT_DELAY_MS = 2000;

// True when `bin` resolves to an executable — either an explicit path (e.g.
// CLAUDE_BIN=/opt/claude/bin/claude) or a name found on PATH.
async function binAvailable(bin) {
  if (!bin) return false;
  const exts = process.platform === 'win32' ? ['', '.exe', '.cmd', '.bat'] : [''];
  async function executable(p) {
    for (const ext of exts) {
      try { await fs.promises.access(p + ext, fs.constants.X_OK); return true; } catch { /* keep looking */ }
    }
    return false;
  }
  if (bin.includes('/') || bin.includes(path.sep)) return executable(bin);
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (dir && await executable(path.join(dir, bin))) return true;
  }
  return false;
}

// Availability is detected once at boot and cached on each registry entry,
// along with a human-readable reason when a runner is unusable. Route
// handlers await this so an early request never reads a stale flag.
const runnersReady = Promise.all(
  RUNNERS.map(async r => {
    if (r.untested) { r.available = false; r.reason = 'untested flags'; return; }
    r.available = await binAvailable(r.bin);
    r.reason = r.available ? '' : 'not installed';
  })
);

// Cap kept-in-memory scrollback per session so a long run can't grow unbounded.
const SCROLLBACK_MAX = 256 * 1024;

// Map<storyId, Session>
// Session: { proc, status, startTime, cmd, cols, rows, scrollback, wsClients:Set }
const sessions = new Map();

const HISTORY_FILE     = path.join(os.homedir(), '.rcode', 'orch-history.json');
const HISTORY_MAX      = 200; // cap persisted runs so the file cannot grow unbounded
const REJECTIONS_PATH  = path.join(os.homedir(), '.rcode', 'rejections.json');

function loadHistory() {
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let history = loadHistory();

function persistRun(storyId, s, status) {
  const endTime    = new Date().toISOString();
  const durationMs = Date.parse(endTime) - (Date.parse(s.startTime) || Date.parse(endTime));
  const entry = { storyId, cmd: s.cmd, status, startTime: s.startTime, endTime, durationMs };
  history.push(entry);
  if (history.length > HISTORY_MAX) history = history.slice(-HISTORY_MAX);
  try {
    fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
  } catch (err) {
    console.error('[orchestrator] failed to persist run history:', err.message);
  }
}

// ── Rejection persistence ─────────────────────────────────────────────────────

function readRejections() {
  try {
    const raw = fs.readFileSync(REJECTIONS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function appendRejection(entry) {
  try {
    const list = readRejections();
    list.push(entry);
    const dir = path.dirname(REJECTIONS_PATH);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REJECTIONS_PATH, JSON.stringify(list, null, 2));
    return true;
  } catch (err) {
    console.error('[orchestrator] failed to persist rejection:', err.message);
    return false;
  }
}

// ── Board overlay ─────────────────────────────────────────────────────────────
// Writes a single entry to .rcode/board-overrides.json. The scanner reads this
// file on every scan and applies it on top of derived story statuses.
function setTaskOverride(storyId, status, runner) {
  const overridesPath = path.join(PROJECT_ROOT, '.rcode', 'board-overrides.json');
  let overrides = {};
  try {
    const raw = fs.readFileSync(overridesPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) overrides = parsed;
  } catch { overrides = {}; }
  overrides[storyId] = { status, runner: runner || null, updatedAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(overridesPath), { recursive: true });
  fs.writeFileSync(overridesPath, JSON.stringify(overrides, null, 2));
}

// ── helpers ──────────────────────────────────────────────────────────────────

function json(res, code, body) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

// Constant-time token check. Token arrives as `Authorization: Bearer <t>`
// (HTTP) or `?token=<t>` (WebSocket upgrade — the browser cannot set
// headers on a WebSocket handshake).
function authed(req) {
  let presented = null;
  const auth = req.headers && req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    presented = auth.slice('Bearer '.length);
  } else {
    const qIdx = (req.url || '').indexOf('?');
    if (qIdx !== -1) {
      presented = new URLSearchParams((req.url || '').slice(qIdx + 1)).get('token');
    }
  }
  if (typeof presented !== 'string') return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(AUTH_TOKEN);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function validStoryId(id) {
  return typeof id === 'string'
    && id.length > 0
    && id.length <= 128
    && !id.includes('..')
    && STORY_ID_RE.test(id);
}

// Cap request bodies so a malicious or buggy caller can't exhaust memory by
// streaming an unbounded payload (#921). 1 MB is far more than any legitimate
// run/stop/reject body. On overflow we destroy the socket and resolve {} —
// the handler then rejects it as an invalid body.
const MAX_BODY_BYTES = 1 * 1024 * 1024;

function parseBody(req) {
  return new Promise(resolve => {
    let buf = '';
    let size = 0;
    let aborted = false;
    req.on('data', c => {
      if (aborted) return;
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        aborted = true;
        try { req.destroy(); } catch {}
        resolve({});
        return;
      }
      buf += c;
    });
    req.on('end', () => { if (!aborted) { try { resolve(JSON.parse(buf)); } catch { resolve({}); } } });
    req.on('error', () => { if (!aborted) { aborted = true; resolve({}); } });
  });
}

// Send one wire frame to every WebSocket client attached to a session.
function wsSend(s, obj) {
  const payload = JSON.stringify(obj);
  for (const ws of s.wsClients) {
    try { ws.send(payload); } catch { s.wsClients.delete(ws); }
  }
}

function setStatus(s, status) {
  s.status = status;
  wsSend(s, { t: 's', s: status });
}

// Set of working-tree files with uncommitted changes. A session's
// "files changed" is the current dirty set minus the set captured when it
// started — an estimate of what that session touched.
function gitModified() {
  return new Promise(resolve => {
    execFile('git', ['-C', PROJECT_ROOT, 'status', '--porcelain'],
      { timeout: 5000 }, (err, stdout) => {
        if (err) { resolve(new Set()); return; }
        const set = new Set();
        for (const line of String(stdout).split('\n')) {
          const f = line.slice(3).trim();
          if (f) set.add(f);
        }
        resolve(set);
      });
  });
}

// A running session that has produced no terminal output for this long is
// almost certainly waiting for the user (a question, or end of a turn).
const IDLE_THRESHOLD_MS = 20000;

// ── Blocked-session detection ─────────────────────────────────────────────────
// A session is classified "blocked" when its PTY has been silent for at least
// BLOCKED_IDLE_MS AND the scrollback tail looks like a question / permission
// prompt / idle input box. Deliberately conservative: both conditions must
// hold, and the patterns below only match clear ask-the-user shapes.
const BLOCKED_IDLE_MS   = 10000;
const BLOCKED_TAIL_CHARS = 2000;

// Strip ANSI escape sequences (OSC, CSI, other ESC) and carriage returns so
// pattern matching sees plain text, not control bytes.
function stripAnsi(str) {
  return String(str)
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]/g, '')
    .replace(/\x1b[@-_]/g, '')
    .replace(/\r/g, '');
}

// Heuristic: does the recent scrollback tail look like the CLI is asking the
// user something? Checks only the last few visible lines (box-drawing borders
// removed) for question/permission shapes:
//   - "Do you want …"            - "[y/n]" / "(y/n)"
//   - "Enter to select/confirm"  - "❯" idle/selection prompt
//   - a "1. … / 2. …" option list - a line ending with "?"
function looksBlocked(scrollback) {
  const tail = stripAnsi(String(scrollback || '').slice(-BLOCKED_TAIL_CHARS));
  const lines = tail.split('\n')
    .map(l => l.replace(/[│┃┆┇┊┋]/g, ' ').replace(/[─━╭╮╰╯└┘┌┐├┤╴╶]+/g, ' ').trim())
    .filter(Boolean);
  const recent = lines.slice(-12);
  if (recent.length === 0) return false;
  const text = recent.join('\n');
  if (/\bdo you want\b/i.test(text)) return true;
  if (/\[y\/n\]|\(y\/n\)/i.test(text)) return true;
  if (/enter to (select|confirm|continue)|press enter/i.test(text)) return true;
  if (/❯/.test(recent.slice(-6).join('\n'))) return true;
  const hasOpt1 = recent.some(l => /^❯?\s*1[.)]\s+\S/.test(l));
  const hasOpt2 = recent.some(l => /^❯?\s*2[.)]\s+\S/.test(l));
  if (hasOpt1 && hasOpt2) return true;
  if (recent.slice(-3).some(l => /\?\s*$/.test(l))) return true;
  return false;
}

// Classify a session for /api/sessions: a live PTY whose output has gone
// idle on a question shape reports 'blocked'; otherwise the lifecycle status
// (running / done / exited / stopped / error) passes through unchanged.
function classifyStatus(s, idleMs) {
  if (s.status === 'running' && idleMs > BLOCKED_IDLE_MS && looksBlocked(s.scrollback)) {
    return 'blocked';
  }
  return s.status;
}

// ── route handlers ────────────────────────────────────────────────────────────

async function handleRunners(res) {
  await runnersReady;
  json(res, 200, {
    runners: RUNNERS.map(r => ({
      id: r.id, label: r.label, available: !!r.available, models: r.models,
      beta: !!r.beta, reason: r.reason || '',
    })),
  });
}

async function handleSessions(res) {
  const current = await gitModified();
  const now = Date.now();
  const out = [];
  for (const [id, s] of sessions) {
    const start = s.filesAtStart || new Set();
    let changed = 0;
    for (const f of current) if (!start.has(f)) changed++;
    const idleMs = now - (s.lastDataAt || now);
    out.push({
      storyId:      id,
      status:       classifyStatus(s, idleMs),
      pid:          s.proc ? s.proc.pid : null,
      cmd:          s.cmd,
      runner:       s.runner || 'claude',
      model:        s.model  || '',
      startTime:    s.startTime,
      lastOutputAt: s.lastDataAt ? new Date(s.lastDataAt).toISOString() : s.startTime,
      clients:      s.wsClients.size,
      filesChanged: changed,
      idleSeconds:  Math.floor(idleMs / 1000),
      waiting:      s.status === 'running' && idleMs > IDLE_THRESHOLD_MS,
    });
  }
  json(res, 200, { sessions: out });
}

function handleHistory(res) {
  const out = [...history].sort((a, b) => String(b.endTime || '').localeCompare(String(a.endTime || '')));
  json(res, 200, { history: out });
}

async function handleRun(req, res) {
  const body    = await parseBody(req);
  const storyId = String(body.storyId || '').trim();
  if (!validStoryId(storyId)) { json(res, 400, { error: 'invalid storyId' }); return; }

  // Gate the allowlist on command-runner sessions only.
  // Command-runner sessions always use a storyId with the "cmd-" prefix
  // (e.g. "cmd-rcode-init"). Existing dev-run sessions use storyIds such as
  // "phase-33", "sprint-33.1", or a raw task id — never "cmd-*" — and MUST NOT
  // be gated here, even though they also supply body.cmd explicitly.
  // This prefix check is the authoritative discriminant between the two call paths.
  // NOTE: The gate fires for ANY cmd- storyId — a missing or empty body.cmd is
  // also rejected. Previously the truthiness check on body.cmd allowed falsy values
  // to bypass the allowlist and fall through to the /rcode-dev-story fallback.
  if (storyId.startsWith('cmd-')) {
    const reqCmd = typeof body.cmd === 'string' ? body.cmd.trim() : '';
    if (!reqCmd || !COMMAND_ALLOWLIST.has(reqCmd)) {
      json(res, 403, { error: 'command not in allowlist', cmd: reqCmd });
      return;
    }
  } else if (typeof body.cmd === 'string' && body.cmd.trim() !== '') {
    // #919 — non-cmd sessions (dev-runs: phase-N, sprint-N.M, task ids) may
    // supply an explicit cmd, but it MUST be a slash command (e.g.
    // "/rcode-dev-story phase-3"). Free-form prompt text is rejected so the
    // allowlist isn't trivially bypassed by using a non-cmd- storyId. The
    // default path (no body.cmd) uses "/rcode-dev-story <storyId>" — also a
    // slash command — so this never blocks the normal flow.
    if (!body.cmd.trim().startsWith('/')) {
      json(res, 403, { error: 'non-command sessions must run a slash command (got free-form prompt)' });
      return;
    }
  }

  // Runner + model selection — STRICT validation against the registry.
  // Omitted runner → claude with no model flag (pre-registry behavior).
  // An explicitly requested runner must exist AND be installed; a model must
  // be in that runner's closed list. Everything is spawned as an argv array,
  // so none of these values ever reach a shell.
  await runnersReady;
  const runnerId = (body.runner === undefined || body.runner === null || body.runner === '')
    ? 'claude' : String(body.runner);
  const runner = RUNNERS.find(r => r.id === runnerId);
  if (!runner) { json(res, 400, { error: 'unknown runner: ' + runnerId }); return; }
  if (body.runner !== undefined && body.runner !== null && body.runner !== '' && !runner.available) {
    json(res, 400, { error: 'runner unavailable (' + (runner.reason || 'not installed') + '): ' + runnerId });
    return;
  }
  const model = (body.model === undefined || body.model === null) ? '' : String(body.model);
  if (model && !runner.models.includes(model)) {
    json(res, 400, { error: 'invalid model for ' + runnerId + ': ' + model });
    return;
  }

  if (!pty) {
    json(res, 503, { error: 'interactive terminal unavailable on this platform — run: pnpm add @lydell/node-pty' });
    return;
  }

  const existing = sessions.get(storyId);
  if (existing && existing.status === 'running') {
    json(res, 409, { error: 'already running', pid: existing.proc && existing.proc.pid });
    return;
  }
  // Replacing a finished session — drop any sockets still attached.
  if (existing) { for (const ws of existing.wsClients) { try { ws.close(); } catch {} } }

  // Initial prompt. `claude [prompt]` starts an interactive session that
  // processes the prompt, then waits for further input — exactly the
  // run-then-communicate flow we want.
  const cmd  = String(body.cmd || `/rcode-dev-story ${storyId}`);
  const cols = 120, rows = 30;

  // #918 — make the privilege grant audible. Every orchestrated run launches
  // the agent with permissions skipped; surface it in the server log so it's
  // never silent.
  console.warn(`[orchestrator] ⚠ spawning ${runner.id} for "${storyId}" with permissions SKIPPED — agent can run any local command in ${PROJECT_ROOT}`);

  let proc;
  try {
    proc = pty.spawn(runner.bin, runner.args(model, cmd), {
      name: 'xterm-color',
      cols, rows,
      cwd: PROJECT_ROOT,
      env: process.env,
    });
  } catch (err) {
    json(res, 500, { error: 'spawn failed: ' + err.message });
    return;
  }

  const s = {
    proc, status: 'running', cmd, cols, rows,
    runner: runner.id, model,
    startTime:   new Date().toISOString(),
    lastDataAt:  Date.now(),
    scrollback:  '',
    wsClients:   new Set(),
    filesAtStart: new Set(),
  };
  sessions.set(storyId, s);
  // Snapshot the dirty working tree so /api/sessions can report how many
  // files this session has changed since it began.
  gitModified().then(set => { s.filesAtStart = set; });

  proc.onData(d => {
    s.lastDataAt = Date.now();
    s.scrollback += d;
    if (s.scrollback.length > SCROLLBACK_MAX) {
      s.scrollback = s.scrollback.slice(-SCROLLBACK_MAX);
    }
    wsSend(s, { t: 'o', d });
  });

  proc.onExit(({ exitCode, signal }) => {
    const status = signal ? 'stopped' : (exitCode === 0 ? 'done' : 'exited');
    setStatus(s, status);
    persistRun(storyId, s, status);
    if (status === 'done'
        && !storyId.startsWith('cmd-')
        && !storyId.startsWith('sprint-')
        && !storyId.startsWith('phase-')) {
      try { setTaskOverride(storyId, 'done', null); } catch (err) {
        console.error('[orchestrator] board-overrides write failed:', err.message);
      }
    }
  });

  // CLIs with no interactive initial-prompt flag (see registry) get the
  // prompt typed into the PTY once their TUI has had time to mount. The
  // timer is unref'd so it never holds the process open, and the write is
  // skipped if the session already ended.
  if (runner.promptViaStdin && cmd) {
    const t = setTimeout(() => {
      if (s.status === 'running') { try { proc.write(cmd + '\r'); } catch { /* pty gone */ } }
    }, STDIN_PROMPT_DELAY_MS);
    if (t.unref) t.unref();
  }

  json(res, 200, { storyId, pid: proc.pid, status: 'running' });
}

async function handleStop(req, res) {
  const body    = await parseBody(req);
  const storyId = String(body.storyId || '').trim();
  if (!validStoryId(storyId)) { json(res, 400, { error: 'invalid storyId' }); return; }
  const s = sessions.get(storyId);
  if (!s) { json(res, 404, { error: 'no session' }); return; }
  try { s.proc.kill(); } catch {}
  setStatus(s, 'stopped');
  json(res, 200, { storyId, status: 'stopped' });
}

// Remove ended sessions (done/exited/stopped/error). Running sessions are never
// touched. Optional body.olderThanDays gates removal by session start age.
async function handleCleanSessions(req, res) {
  const body = await parseBody(req);
  const olderThanDays = Number(body.olderThanDays) || 0;
  const cutoff = olderThanDays > 0 ? Date.now() - olderThanDays * 86400000 : null;
  let removed = 0;
  for (const [id, s] of sessions) {
    if (s.status === 'running') continue;
    if (cutoff !== null && (Date.parse(s.startTime || '') || 0) > cutoff) continue;
    s.wsClients.forEach(ws => { try { ws.close(); } catch {} });
    sessions.delete(id);
    removed++;
  }
  json(res, 200, { removed });
}

async function handleReject(req, res) {
  const body    = await parseBody(req);
  const storyId = String(body.storyId || '').trim();
  if (!validStoryId(storyId)) { json(res, 400, { error: 'invalid storyId' }); return; }
  const text = String(body.reason || '').trim();
  if (!text) { json(res, 400, { error: 'reason required' }); return; }
  if (text.length > 2000) { json(res, 400, { error: 'reason too long' }); return; }
  const entry = {
    storyId,
    phase:  body.phase || null,
    reason: text,
    ts:     new Date().toISOString(),
  };
  if (!appendRejection(entry)) { json(res, 500, { error: 'could not persist rejection' }); return; }
  json(res, 200, { ok: true, entry });
}

function handleRejections(res) {
  json(res, 200, { rejections: readRejections() });
}

const TASK_STATUS_ENUM = new Set(['todo', 'in_progress', 'blocked', 'done']);

async function handleTaskStatus(req, res) {
  const body    = await parseBody(req);
  const storyId = String(body.storyId || '').trim();
  if (!validStoryId(storyId)) { json(res, 400, { error: 'invalid storyId' }); return; }
  const status = String(body.status || '').trim();
  if (!TASK_STATUS_ENUM.has(status)) { json(res, 400, { error: 'invalid status — must be one of todo,in_progress,blocked,done' }); return; }
  try {
    setTaskOverride(storyId, status, null);
  } catch (err) {
    console.error('[orchestrator] handleTaskStatus write failed:', err.message);
    json(res, 500, { error: 'could not write board-overrides' }); return;
  }
  json(res, 200, { ok: true });
}

// ── WebSocket data plane ───────────────────────────────────────────────────────

function attachWebSocket(ws, storyId) {
  const s = sessions.get(storyId);
  if (!s) {
    ws.send(JSON.stringify({ t: 's', s: 'error' }));
    ws.close();
    return;
  }

  s.wsClients.add(ws);
  // Replay history so a late-joining client sees the session so far.
  if (s.scrollback) ws.send(JSON.stringify({ t: 'hist', d: s.scrollback }));
  ws.send(JSON.stringify({ t: 's', s: s.status }));

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.t === 'i' && typeof msg.d === 'string' && s.status === 'running') {
      try { s.proc.write(msg.d); } catch {}
    } else if (msg.t === 'r' && s.status === 'running') {
      const cols = parseInt(msg.cols, 10), rows = parseInt(msg.rows, 10);
      if (cols > 0 && rows > 0) {
        s.cols = cols; s.rows = rows;
        try { s.proc.resize(cols, rows); } catch {}
      }
    }
  });

  ws.on('close', () => s.wsClients.delete(ws));
  ws.on('error', () => s.wsClients.delete(ws));
}

// ── server ────────────────────────────────────────────────────────────────────

process.on('unhandledRejection', (reason) => {
  console.error('[' + new Date().toISOString() + '] [orchestrator] unhandledRejection:', reason && reason.stack || reason);
});
process.on('uncaughtException', (err) => {
  console.error('[' + new Date().toISOString() + '] [orchestrator] uncaughtException:', err && err.stack || err);
});

const server = http.createServer(async (req, res) => {
  const method = req.method || '';
  const url    = req.url    || '';

  // CORS — the dashboard is served from a different port (7717), so every
  // browser call here is cross-origin. The loopback bind + token are what
  // gate access; a wildcard origin is safe with no cookies involved.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const pathOnly = url.indexOf('?') === -1 ? url : url.slice(0, url.indexOf('?'));

  // Friendly landing for browser navigation (no token needed). Hitting this
  // port directly is a common mistake — the orchestrator is the INTERNAL API,
  // not the dashboard. Point people at the dashboard instead of a bare 401.
  if (method === 'GET' && (pathOnly === '/' || pathOnly === '/favicon.ico')) {
    const dashUrl = 'http://localhost:' + (process.env.DASH_PORT || '7717');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><meta charset="utf-8"><title>rcode orchestrator</title>'
      + '<body style="font-family:system-ui,sans-serif;background:#05080f;color:#e6edf7;'
      + 'display:grid;place-items:center;height:100vh;margin:0;text-align:center">'
      + '<div><h1 style="color:#2dd4bf;margin:0 0 .5rem">rcode orchestrator</h1>'
      + '<p style="color:#8595ad">This is the internal API (port ' + PORT + ') — not the dashboard.</p>'
      + '<p>Open the dashboard → <a style="color:#a78bfa" href="' + dashUrl + '">' + dashUrl + '</a></p></div>');
    return;
  }

  if (!authed(req)) { json(res, 401, { error: 'unauthorized' }); return; }

  if (method === 'GET'  && pathOnly === '/api/status')   { json(res, 200, { ok: true, sessions: sessions.size }); return; }
  if (method === 'GET'  && pathOnly === '/api/runners')  { await handleRunners(res); return; }
  if (method === 'GET'  && pathOnly === '/api/sessions') { await handleSessions(res); return; }
  if (method === 'GET'  && pathOnly === '/api/history')  { handleHistory(res); return; }
  if (method === 'POST' && pathOnly === '/api/run')      { await handleRun(req, res);  return; }
  if (method === 'POST' && pathOnly === '/api/stop')     { await handleStop(req, res); return; }
  if (method === 'POST' && pathOnly === '/api/clean-sessions') { await handleCleanSessions(req, res); return; }
  if (method === 'POST' && pathOnly === '/api/reject')         { await handleReject(req, res); return; }
  if (method === 'GET'  && pathOnly === '/api/rejections')     { handleRejections(res); return; }
  if (method === 'POST' && pathOnly === '/api/task-status')    { await handleTaskStatus(req, res); return; }

  res.writeHead(404); res.end('Not found');
});

// NOTE: the single server 'error' handler lives below the WebSocket block —
// a second handler here would fire first and exit(1) before the EADDRINUSE
// exit(2) path runs, re-triggering the dashboard's 3s respawn loop (#964).

// WebSocket upgrade — authenticate, validate the storyId, then hand off.
if (WebSocketServer) {
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', (req, socket, head) => {
    const url      = req.url || '';
    const pathOnly = url.indexOf('?') === -1 ? url : url.slice(0, url.indexOf('?'));
    if (!pathOnly.startsWith('/ws/') || !authed(req)) { socket.destroy(); return; }
    const storyId = decodeURIComponent(pathOnly.slice('/ws/'.length));
    if (!validStoryId(storyId)) { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => attachWebSocket(ws, storyId));
  });
}

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    // Exit with code 2 so the dashboard knows this is a port-conflict (not a crash)
    // and can suppress the restart loop + print a one-time user hint.
    console.error(`[orch] port ${PORT} already in use. Set ORCH_PORT=<N> env var to use a different port. Exiting without retry.`);
    process.exit(2);
  }
  console.error('[orch] server error:', err.message);
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('\n🤖 rcode Orchestrator');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Port:   ' + PORT);
  console.log('   Bind:   127.0.0.1 (loopback only)');
  console.log('   Token:  ' + AUTH_TOKEN.slice(0, 8) + '... (redacted)');
  console.log('   PTY:    ' + (pty ? 'node-pty ready' : 'node-pty MISSING'));
  console.log('   WS:     ' + (WebSocketServer ? 'ready' : 'ws MISSING'));
  console.log('   POST /api/run   GET /api/sessions   GET /api/runners   WS /ws/<id>');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});
