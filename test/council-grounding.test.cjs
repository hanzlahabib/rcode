/**
 * Council grounding-gate scan.
 *
 * Catches regressions of #963 — a council run on a market/discovery/greenfield
 * question that answers from training data with zero live research, and no
 * signal to the user that this happened.
 *
 * Checks that council.md (both the source workflow and the dogfooded install
 * copy) declares the research-artifact gate, the UNGROUNDED banner, and the
 * mandatory Data freshness footer — and that the three market-facing agent
 * defs (mariam, sadiq, waleed) declare the per-claim grounding rule.
 *
 * Run: node --test test/council-grounding.test.cjs
 */

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const COUNCIL_WORKFLOWS = [
  path.join(PROJECT_ROOT, 'rcode', 'workflows', 'council.md'),
  path.join(PROJECT_ROOT, '.rcode', 'workflows', 'council.md'),
];

const GROUNDING_RULE_RE =
  /pricing, fee, rate, market-size, or regulation claim MUST be verified with\s+WebSearch\/WebFetch in-session.*explicitly tagged `\[unverified — training data\]`/s;

const AGENT_DEFS = [
  path.join(PROJECT_ROOT, 'rcode', 'agents', 'rcode-mariam.md'),
  path.join(PROJECT_ROOT, 'rcode', 'agents', 'rcode-sadiq.md'),
  path.join(PROJECT_ROOT, 'rcode', 'agents', 'rcode-waleed.md'),
  path.join(PROJECT_ROOT, '.rcode', 'agents', 'rcode-mariam.md'),
  path.join(PROJECT_ROOT, '.rcode', 'agents', 'rcode-sadiq.md'),
  path.join(PROJECT_ROOT, '.rcode', 'agents', 'rcode-waleed.md'),
];

const AGENT_SKILLS = [
  path.join(PROJECT_ROOT, 'rcode', 'skills', 'agents', 'mariam-marketing', 'SKILL.md'),
  path.join(PROJECT_ROOT, 'rcode', 'skills', 'agents', 'sadiq-analyst', 'SKILL.md'),
  path.join(PROJECT_ROOT, 'rcode', 'skills', 'agents', 'waleed-architect', 'SKILL.md'),
];

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

for (const wfPath of COUNCIL_WORKFLOWS) {
  const rel = path.relative(PROJECT_ROOT, wfPath);

  test(`council-grounding: ${rel} gates the research pre-step behind a written artifact`, () => {
    const text = readFile(wfPath);
    const hasResearchFileVar = /RESEARCH_FILE=/.test(text);
    const hasGateLanguage =
      /MANDATORY ARTIFACT GATE|write the Research context block to disk/i.test(text);
    assert.ok(
      hasResearchFileVar && hasGateLanguage,
      `${rel} must write the research pre-step's "Research context" block to a ` +
        '$RESEARCH_FILE on disk before spawning panelists — the pre-step must not ' +
        'remain unenforced prose. See #963.',
    );
  });

  test(`council-grounding: ${rel} spawn step passes the research file content verbatim to every agent`, () => {
    const text = readFile(wfPath);
    assert.ok(
      /\$RESEARCH_FILE/.test(text) &&
        /verbatim content of `?\$RESEARCH_FILE`?/i.test(text),
      `${rel} must include $RESEARCH_FILE's content verbatim in every panelist ` +
        'prompt for research-typed questions. See #963.',
    );
  });

  test(`council-grounding: ${rel} synthesis opens with an UNGROUNDED banner when the research file is missing`, () => {
    const text = readFile(wfPath);
    assert.ok(
      /UNGROUNDED — answered from model knowledge, no live research ran/.test(text),
      `${rel} synthesis step must open with the "⚠ UNGROUNDED — answered from ` +
        'model knowledge, no live research ran" banner when $RESEARCH_FILE is ' +
        'missing for a research-typed question. See #963.',
    );
    assert.ok(
      /test -f "\$RESEARCH_FILE"/.test(text),
      `${rel} must actually check for $RESEARCH_FILE's existence before deciding ` +
        'whether to show the UNGROUNDED banner (not just assert the banner text ' +
        'exists somewhere in prose).',
    );
  });

  test(`council-grounding: ${rel} synthesis output format has a mandatory Data freshness footer`, () => {
    const text = readFile(wfPath);
    assert.ok(
      /\*\*Data freshness\*\*/.test(text) && /live-verified/.test(text) && /from model knowledge/.test(text),
      `${rel} must define a mandatory "Data freshness" footer in the synthesis ` +
        'output format: N claims live-verified (sources) / M from model ' +
        'knowledge. See #963.',
    );
  });
}

for (const agentPath of AGENT_DEFS) {
  const rel = path.relative(PROJECT_ROOT, agentPath);

  test(`council-grounding: ${rel} declares the per-claim grounding rule`, () => {
    assert.ok(fs.existsSync(agentPath), `${rel} does not exist`);
    const text = readFile(agentPath);
    assert.ok(
      GROUNDING_RULE_RE.test(text),
      `${rel} must require that any pricing, fee, rate, market-size, or ` +
        'regulation claim is either WebSearch/WebFetch-verified in-session or ' +
        'explicitly tagged `[unverified — training data]`. See #963.',
    );
  });
}

for (const skillPath of AGENT_SKILLS) {
  const rel = path.relative(PROJECT_ROOT, skillPath);

  test(`council-grounding: ${rel} declares the per-claim grounding rule`, () => {
    assert.ok(fs.existsSync(skillPath), `${rel} does not exist`);
    const text = readFile(skillPath);
    assert.ok(
      GROUNDING_RULE_RE.test(text),
      `${rel} must require that any pricing, fee, rate, market-size, or ` +
        'regulation claim is either WebSearch/WebFetch-verified in-session or ' +
        'explicitly tagged `[unverified — training data]`. See #963.',
    );
  });
}
