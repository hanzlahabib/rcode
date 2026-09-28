'use strict';

/**
 * keyword-grouping.cjs — Step 2 (candidate grouping via union-find over
 * token-overlap + shared-ranking-URL signals) and group assembly/aggregation
 * for seo-keyword-preprocess.cjs. Split out of the main script (Karpathy
 * file-size discipline) — no behavior change, pure extraction. See
 * seo-keyword-preprocess.cjs's module doc for the full signal/aggregation
 * rules this implements.
 */

const { maxDefined, minDefined, sumDefined } = require('./keyword-value-helpers.cjs');
const { jaccardSimilarity, divergenceCuesDiffer } = require('./keyword-normalize.cjs');

/**
 * Inverted token index bounding candidate-pair generation to sub-quadratic
 * work: only units sharing at least one (non-too-common) token are ever
 * compared. See seo-keyword-preprocess.cjs's module doc rule 2 for the
 * `tokenBucketCap` tradeoff.
 * @param {object[]} units
 * @param {number} tokenBucketCap
 */
function buildTokenIndex(units, tokenBucketCap) {
  const index = new Map();
  units.forEach((unit, i) => {
    for (const token of new Set(unit.tokens)) {
      let list = index.get(token);
      if (!list) {
        list = [];
        index.set(token, list);
      }
      list.push(i);
    }
  });
  for (const [token, list] of index) {
    if (list.length > tokenBucketCap) index.delete(token);
  }
  return index;
}

function makeDisjointSet(size) {
  const parent = Array.from({ length: size }, (_, i) => i);
  const rank = new Array(size).fill(0);
  function find(x) {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    if (rank[ra] < rank[rb]) parent[ra] = rb;
    else if (rank[ra] > rank[rb]) parent[rb] = ra;
    else {
      parent[rb] = ra;
      rank[ra] += 1;
    }
    return true;
  }
  return { find, union };
}

/**
 * Step 2: candidate grouping over deduplicated units. Returns the
 * union-find structure (grouping decisions), the per-edge signal metadata
 * (for confidence scoring later), and the pairs that were EXCLUDED from
 * grouping because of an intent-divergence cue despite high token overlap.
 * @param {object[]} units
 * @param {{jaccardThreshold: number, tokenBucketCap: number}} options
 */
function buildCandidateGroups(units, options) {
  const dsu = makeDisjointSet(units.length);
  const edgeSignals = new Map();
  const flaggedPairs = [];
  const considered = new Set();

  function considerTokenOverlapPair(i, j) {
    if (i === j) return;
    const a = Math.min(i, j);
    const b = Math.max(i, j);
    const key = `${a}|${b}`;
    if (considered.has(key)) return;
    considered.add(key);

    const unitA = units[a];
    const unitB = units[b];
    const sim = jaccardSimilarity(unitA.tokens, unitB.tokens);
    if (sim < options.jaccardThreshold) return;

    const diverging = divergenceCuesDiffer(unitA.cues, unitB.cues);
    if (diverging.size > 0) {
      // Hard boundary: token overlap alone never merges across a diverging
      // cue — recorded so the AI reviewer sees the near-miss explicitly.
      flaggedPairs.push({
        keywordA: unitA.representative,
        keywordB: unitB.representative,
        jaccard: Number(sim.toFixed(3)),
        divergingCues: [...diverging],
        reason: 'high token overlap but differs on an intent-signalling modifier — not merged',
      });
      return;
    }

    dsu.union(a, b);
    edgeSignals.set(key, { ...(edgeSignals.get(key) || {}), tokenOverlap: true, jaccard: sim });
  }

  const tokenIndex = buildTokenIndex(units, options.tokenBucketCap);
  for (const list of tokenIndex.values()) {
    for (let x = 0; x < list.length; x += 1) {
      for (let y = x + 1; y < list.length; y += 1) {
        considerTokenOverlapPair(list[x], list[y]);
      }
    }
  }

  // Shared-ranking-URL signal: real ranking evidence, so it unions even
  // across a diverging cue (the resulting group is flagged
  // intent-divergence-risk in assembleGroups() rather than blocked here).
  const urlBuckets = new Map();
  units.forEach((unit, i) => {
    const url = unit.metrics.url;
    if (!url) return;
    let list = urlBuckets.get(url);
    if (!list) {
      list = [];
      urlBuckets.set(url, list);
    }
    list.push(i);
  });
  for (const list of urlBuckets.values()) {
    if (list.length < 2) continue;
    for (let x = 1; x < list.length; x += 1) {
      dsu.union(list[0], list[x]);
      const a = Math.min(list[0], list[x]);
      const b = Math.max(list[0], list[x]);
      const key = `${a}|${b}`;
      edgeSignals.set(key, { ...(edgeSignals.get(key) || {}), sharedUrl: units[list[0]].metrics.url });
    }
  }

  return { dsu, edgeSignals, flaggedPairs };
}

/**
 * Turns the union-find result into final candidateGroups/singletons, with
 * aggregation (see seo-keyword-preprocess.cjs's module doc), signals, flags,
 * and a confidence label.
 * @param {object[]} units
 * @param {{find: Function}} dsu
 * @param {Map<string, object>} edgeSignals
 */
function assembleGroups(units, dsu, edgeSignals) {
  const rootMap = new Map();
  units.forEach((unit, i) => {
    const root = dsu.find(i);
    let list = rootMap.get(root);
    if (!list) {
      list = [];
      rootMap.set(root, list);
    }
    list.push(i);
  });

  const groups = [];
  const singletons = [];

  for (const indices of rootMap.values()) {
    if (indices.length === 1) {
      singletons.push(units[indices[0]]);
      continue;
    }

    const members = indices.map((i) => units[i]);
    const volumeSum = sumDefined(members.map((u) => u.metrics.volume));
    const difficultyMax = maxDefined(members.map((u) => u.metrics.difficulty));
    const cpcMax = maxDefined(members.map((u) => u.metrics.cpc));
    const positionMin = minDefined(members.map((u) => u.metrics.position));

    const sharedUrls = new Set();
    let maxJaccard = null;
    for (let x = 0; x < indices.length; x += 1) {
      for (let y = x + 1; y < indices.length; y += 1) {
        const a = Math.min(indices[x], indices[y]);
        const b = Math.max(indices[x], indices[y]);
        const edge = edgeSignals.get(`${a}|${b}`);
        if (!edge) continue;
        if (edge.sharedUrl) sharedUrls.add(edge.sharedUrl);
        if (typeof edge.jaccard === 'number') {
          maxJaccard = maxJaccard === null ? edge.jaccard : Math.max(maxJaccard, edge.jaccard);
        }
      }
    }

    // Re-check cue divergence across every pair in the FINAL group (a
    // sharedUrl union can pull in a diverging pair that token-overlap never
    // considered) — group sizes here are small so O(k^2) is cheap.
    const divergingCues = new Set();
    for (let x = 0; x < members.length; x += 1) {
      for (let y = x + 1; y < members.length; y += 1) {
        const diff = divergenceCuesDiffer(members[x].cues, members[y].cues);
        for (const c of diff) divergingCues.add(c);
      }
    }

    const flags = [];
    if (divergingCues.size > 0) {
      flags.push(
        `intent-divergence-risk: members differ on modifier(s) ${[...divergingCues].join(', ')} — verify intent before treating as one page`
      );
    }

    let confidence;
    if (divergingCues.size > 0) confidence = 'low';
    else if (sharedUrls.size > 0) confidence = 'high';
    else if (maxJaccard !== null && maxJaccard >= 0.75) confidence = 'high';
    else if (maxJaccard !== null && maxJaccard >= 0.6) confidence = 'medium';
    else confidence = 'low';

    // Representative label = highest-volume member (ties keep first-seen).
    let repMember = members[0];
    for (const m of members) {
      if ((m.metrics.volume ?? -1) > (repMember.metrics.volume ?? -1)) repMember = m;
    }

    groups.push({
      representative: repMember.representative,
      memberCount: members.length,
      memberKeywords: members.map((m) => m.representative),
      members,
      aggregated: {
        totalVolume: volumeSum.value,
        volumeIncomplete: volumeSum.missingCount > 0,
        maxDifficulty: difficultyMax,
        maxCpc: cpcMax,
        bestPosition: positionMin,
      },
      signals: { sharedUrls: [...sharedUrls], maxJaccard },
      confidence,
      flags,
    });
  }

  return { groups, singletons };
}

module.exports = {
  buildTokenIndex,
  makeDisjointSet,
  buildCandidateGroups,
  assembleGroups,
};
