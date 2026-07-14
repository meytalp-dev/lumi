// ============================================================
// resolve-practice.js — weakness-targeted item selection + Meet-first guard.
// Mirrors Avnei-Yesod's resolvePractice PATTERN, Lumi-clean.
//
// Rules (brief §6, learning-model §1):
//   • Never serve a MEASURED item for a word that has not passed its Meet scene.
//   • Pick the WEAKEST not-yet-mastered word (lowest pKnown) for the round.
//   • recognize first; once a word's mastery consolidates, prefer discriminate.
//   • Rotate items for a word so the correct position/distractors vary.
//   • Do NOT re-order an item's options — positions are pre-randomized in the bank.
// ============================================================
window.LumiResolve = (function () {
  'use strict';

  // group the bank once, by dimension → word → [items]
  function index(items) {
    var byDim = {};
    items.forEach(function (it) {
      var dim = it.dimension;
      var word = (it.target && it.target[0]) || '_';
      if (!byDim[dim]) byDim[dim] = {};
      if (!byDim[dim][word]) byDim[dim][word] = [];
      byDim[dim][word].push(it);
    });
    return byDim;
  }

  // pick the weakest eligible word among `words` for a measured dimension.
  // eligible = has Met, has at least one item in that dimension, not mastered.
  function weakestWord(learnerId, words, byDim, dimension, comprehension) {
    var pool = byDim[dimension] || {};
    var best = null, bestP = Infinity;
    words.forEach(function (w) {
      if (!pool[w] || !pool[w].length) return;              // no item of this kind
      if (!LumiBKT.hasMet(learnerId, w)) return;            // Meet-first guard
      var rec = comprehension ? LumiBKT.getComprehension(learnerId, w)
                              : LumiBKT.getWord(learnerId, w);
      if (rec.masteredAt) return;                            // already lit — skip
      if (rec.pKnown < bestP) { bestP = rec.pKnown; best = w; }
    });
    return best;
  }

  // choose a specific item for a word+dimension, rotating through variants and
  // avoiding an immediate repeat of the last item id served.
  function pickItem(pool, word, seen) {
    var variants = (pool[word] || []).slice();
    if (!variants.length) return null;
    var fresh = variants.filter(function (it) { return !seen[it.id]; });
    var chosen = (fresh.length ? fresh : variants)[Math.floor(Math.random() * (fresh.length ? fresh.length : variants.length))];
    return chosen;
  }

  // High-level: given the learner + bank + the segment's word list, return the
  // next MEASURED item, preferring discriminate for words whose recognition is
  // consolidating. Returns null when the measured pool for this segment is done.
  function nextMeasured(learnerId, items, words, seen) {
    var byDim = index(items);

    // 1) any word whose recognition is consolidating (pKnown high but not yet
    //    mastered, and a discriminate item exists) → serve the harder item.
    var discWord = null, discP = Infinity;
    words.forEach(function (w) {
      if (!(byDim.discriminate && byDim.discriminate[w])) return;
      if (!LumiBKT.hasMet(learnerId, w)) return;
      var rec = LumiBKT.getWord(learnerId, w);
      if (rec.masteredAt) return;
      if (rec.pKnown >= LumiBKT.LIGHT_ON && rec.pKnown < discP) { discP = rec.pKnown; discWord = w; }
    });
    if (discWord) {
      var di = pickItem(byDim.discriminate, discWord, seen);
      if (di) return di;
    }

    // 2) otherwise recognize the weakest met, unmastered word.
    var recWord = weakestWord(learnerId, words, byDim, 'recognize', false);
    if (recWord) {
      var ri = pickItem(byDim.recognize, recWord, seen);
      if (ri) return ri;
    }
    return null;
  }

  // v2 §3 + Meytal 13.7: pick a concrete item for a word given the CONTEXT.
  //   'path'       → a recognize item (single word, easy distractors)
  //   'beam'       → a recognize item (a 2nd, spaced, DIFFERENT-visual recognize)
  //   'careful'    → a DISCRIMINATE item (the confusable pair) — the required
  //                  discriminate context; recognize path+beam alone can't master.
  //   'comprehend' → a comprehend item (whole chunk)
  // Rotates variants (via `seen`) so distractors/positions differ across contexts.
  function pickForContext(byDim, word, context, seen) {
    if (context === 'comprehend') return pickItem(byDim.comprehend || {}, word, seen);
    if (context === 'careful') return pickItem(byDim.discriminate || {}, word, seen);
    return pickItem(byDim.recognize || {}, word, seen);   // 'path' and 'beam'
  }

  // ---- SHORT-SESSION planner (Meytal 13.7: ~10 min sittings; mastery accrues
  //      across days via spaced practice). Returns a budgeted, prioritized list of
  //      core beats ({t:'meet'|'measure', word, context}). Priorities:
  //        (a) unmet NEW words → meet + a first small action (path)
  //        (b) met words CLOSEST to mastery that still need one more context
  //        (c) spaced retrieval of prior words in a NOT-yet-seen context
  //      A word earns at most ONE new context per session, so path → beam →
  //      careful (the discriminate win) spreads over ~3 sittings. ----
  var CTX_ORDER = ['path', 'beam', 'careful'];

  function hasItemFor(byDim, word, context) {
    if (context === 'careful') return !!((byDim.discriminate || {})[word]);
    return !!((byDim.recognize || {})[word]);
  }
  function nextContextFor(learnerId, byDim, word) {
    var cov = LumiBKT.coveredContexts(learnerId, word);
    for (var i = 0; i < CTX_ORDER.length; i++) {
      var c = CTX_ORDER[i];
      if (cov.indexOf(c) === -1 && hasItemFor(byDim, word, c)) return c;
    }
    return null;
  }

  function sessionPlan(learnerId, words, byDim, cfg) {
    cfg = cfg || {};
    var budget = cfg.budget || 8;
    var newPer = cfg.newPerSession || 3;

    var beats = [];
    // (a) brand-new words → meet + first (path) context (a small action right away)
    var newWords = words.filter(function (w) { return !LumiBKT.hasMet(learnerId, w); }).slice(0, newPer);
    newWords.forEach(function (w) {
      beats.push({ t: 'meet', word: w });
      beats.push({ t: 'measure', word: w, context: nextContextFor(learnerId, byDim, w) || 'path' });
    });

    // (b)+(c) prior met, not-yet-mastered words that still need a context.
    var needers = words.filter(function (w) {
      return LumiBKT.hasMet(learnerId, w) && !LumiBKT.isMastered(learnerId, w) &&
             nextContextFor(learnerId, byDim, w) && newWords.indexOf(w) === -1;
    });
    needers.sort(function (a, b) {
      var ca = LumiBKT.coveredContexts(learnerId, a).length;
      var cb = LumiBKT.coveredContexts(learnerId, b).length;
      if (cb !== ca) return cb - ca;                       // closest-to-mastery first
      return LumiBKT.getWord(learnerId, b).pKnown - LumiBKT.getWord(learnerId, a).pKnown;
    });
    needers.forEach(function (w) { beats.push({ t: 'measure', word: w, context: nextContextFor(learnerId, byDim, w) }); });

    return beats.slice(0, budget);
  }

  return {
    index: index,
    weakestWord: weakestWord,
    pickItem: pickItem,
    pickForContext: pickForContext,
    nextContextFor: nextContextFor,
    sessionPlan: sessionPlan,
    nextMeasured: nextMeasured,
  };
})();
