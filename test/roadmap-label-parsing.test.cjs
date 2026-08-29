/**
 * roadmap get-phase must read the roadmap shapes rcode's OWN roadmapper writes.
 *
 * Regression: the parser demanded `**Success Criteria**:` (colon outside the
 * bold) while rcode-roadmapper emits `**Success criteria:**` (colon inside), and
 * it only recognised a following list block while roadmapper writes requirements
 * inline on the label line. Result: get-phase returned requirements: [] and
 * success_criteria: [] on files rcode itself had just produced.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const roadmap = require(path.resolve(__dirname, '../rcode/bin/lib/roadmap.cjs'));
const fs = require('node:fs');
const os = require('node:os');

function withRoadmap(body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rcode-roadmap-'));
  fs.mkdirSync(path.join(dir, '.planning'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.planning', 'ROADMAP.md'), body);
  return dir;
}

const SHAPES = {
  'inline requirements, colon inside bold (what roadmapper writes)': {
    body: `## Phase 1 — A\n\n**Goal:** g\n\n**Requirements:** FOUND-01, FOUND-02, RENT-04\n\n**Success criteria:**\n- Visitor sees the city number\n`,
    reqs: ['FOUND-01', 'FOUND-02', 'RENT-04'],
    sc: ['Visitor sees the city number'],
  },
  'list requirements, colon outside bold (legacy)': {
    body: `## Phase 1 — A\n\n**Goal:** g\n\n**Requirements**:\n- REQ-001 user can log in\n\n**Success Criteria**:\n- User lands on dashboard\n`,
    reqs: ['REQ-001 user can log in'],
    sc: ['User lands on dashboard'],
  },
  'heading style keeps the full bullet text': {
    body: `## Phase 1 — A\n\n**Goal:** g\n\n### Requirements\n- CITY-02 per-city page exists\n\n### Success criteria\n- Page renders in under 1s\n`,
    reqs: ['CITY-02 per-city page exists'],
    sc: ['Page renders in under 1s'],
  },
};

for (const [name, shape] of Object.entries(SHAPES)) {
  test(`get-phase parses: ${name}`, () => {
    const dir = withRoadmap(shape.body);
    const r = roadmap.dispatch(dir, ['get-phase', '1']);
    assert.deepEqual(r.requirements, shape.reqs, 'requirements');
    assert.deepEqual(r.success_criteria, shape.sc, 'success_criteria');
  });
}

test('domain-prefixed ids are recognised, plain prose is not', () => {
  const dir = withRoadmap(`## Phase 1 — A\n\n**Goal:** g\n\n**Requirements:** AUTHZ-04, OBJ-06\n`);
  const r = roadmap.dispatch(dir, ['get-phase', '1']);
  assert.deepEqual(r.requirements, ['AUTHZ-04', 'OBJ-06']);
});
