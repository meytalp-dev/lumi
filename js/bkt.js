// ============================================================
// bkt.js — Lumi's evidence engine (v2). BKT stays BEHIND THE SCENES for item
// selection; grown-ups see TRANSPARENT EVIDENCE, never "87% mastery" (v2 §5).
//
// Exactly THREE knowledge components (v2 §5):
//   • word_receptive       — "heard the word → found it"      (words bucket)
//   • chunk_comprehension   — "understood a whole instruction" (comp bucket)
//   • engagement/production — EVIDENCE ONLY, never mastery     (prod bucket)
//
// 🔒 Multi-context mastery gate (v2 §4): a word is NEVER "mastered" on a number
// alone. It also needs INDEPENDENT first-try success across ≥2 representation
// TYPES and ≥2 CONTEXTS (mechanics). pKnown feeds selection; the gate lights
// the lantern.
//
// Transparent evidence tracked per word (shown to grown-ups, v2 §5):
//   firstSuccess · successNoHelp · successNewImage · successInSentence ·
//   successNextSession
//
// Wiring contract:
//   path-choice / light-beam (measured, first attempt) → word_receptive
//   scene-hide  (measured, first attempt, chunk)        → chunk_comprehension
//   meet / function / produce                           → NEVER feed BKT
//
// Persistence: localStorage 'lumi-bkt-v1' (offline-first, file://-safe). A tiny
// separate 'lumi-history-v1' survives reset() so "success next session" is real.
// ============================================================
window.LumiBKT = (function () {
  'use strict';

  var STORAGE_KEY = 'lumi-bkt-v1';
  var HISTORY_KEY = 'lumi-history-v1';   // cross-session; NOT cleared by reset()

  var P = {
    word:          { pL0: 0.14, pT: 0.14, pG: 0.30, pS: 0.08 },
    comprehension: { pL0: 0.16, pT: 0.12, pG: 0.30, pS: 0.10 },
  };

  var MASTERY  = 0.82;   // v2 §5: starting threshold ~0.80–0.85 …
  var LIGHT_ON = 0.42;   // … gated by the multi-context rule below.
  var MIN_CORRECT_FOR_MASTERY = 2;
  var MIN_REPTYPES = 2;  // 🔒 v2 §4: independent success across ≥2 representations …
  var MIN_CONTEXTS = 2;  // 🔒 v2 §4: … AND ≥2 contexts (mechanics).

  // ---- storage ----
  function loadRaw(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; } }
  function saveRaw(key, s) { try { localStorage.setItem(key, JSON.stringify(s)); } catch (e) {} }
  function load() { return loadRaw(STORAGE_KEY); }
  function save(s) { saveRaw(STORAGE_KEY, s); }

  function learnerRoot(state, learnerId) {
    var r = state[learnerId] || (state[learnerId] = {});
    r.words = r.words || {};
    r.comp  = r.comp  || {};
    r.prod  = r.prod  || {};
    r.met   = r.met   || {};
    if (r.session == null) r.session = 0;
    return r;
  }

  function emptyWord(kind) {
    var p = P[kind] || P.word;
    return {
      pKnown: p.pL0, attempts: 0, correct: 0, wrong: 0, masteredAt: null,
      repTypes: [], contexts: [],                    // multi-context gate evidence
      discriminateSuccess: false,                    // 🔒 a REAL confusable-pair win (Meytal 13.7)
      firstSuccess: false, successNoHelp: false,     // transparent evidence flags
      successNewImage: false, successInSentence: false, successNextSession: false,
    };
  }
  function emptyProd() { return { attempts: 0, spoke: 0 }; }

  function bktUpdate(pKnown, isCorrect, p) {
    var post;
    if (isCorrect) {
      var nC = pKnown * (1 - p.pS), dC = nC + (1 - pKnown) * p.pG;
      post = dC > 0 ? nC / dC : pKnown;
    } else {
      var nW = pKnown * p.pS, dW = nW + (1 - pKnown) * (1 - p.pG);
      post = dW > 0 ? nW / dW : pKnown;
    }
    return post + (1 - post) * p.pT;
  }

  function pushUnique(arr, v) { if (v && arr.indexOf(v) === -1) arr.push(v); }

  // ---- session bookkeeping — each play sitting ADVANCES the session counter, so
  //      state accrues across days and "next session" evidence is genuine. ----
  function beginSession(learnerId) {
    var state = load();
    var root = learnerRoot(state, learnerId);
    root.session = (root.session || 0) + 1;
    save(state);
    return root.session;
  }

  // ---- Meet guard ----
  function markMet(learnerId, word) {
    var s = load(), r = learnerRoot(s, learnerId);
    r.met[word] = (r.met[word] || 0) + 1; save(s);
  }
  function hasMet(learnerId, word) {
    var r = learnerRoot(load(), learnerId); return (r.met[word] || 0) > 0;
  }

  // ---- the ONE measured-ingest point ----
  // evt: { learnerId, word, dimension, kc_comprehension, is_correct,
  //        repType, context, usedHelp, newImage }
  function ingest(evt) {
    if (!evt || !evt.word) return null;
    var dim = evt.dimension;
    var learnerId = evt.learnerId || 'local';
    var isWord = (dim === 'path' || dim === 'beam' || dim === 'careful' || dim === 'recognize' || dim === 'discriminate');
    var isComp = (dim === 'scene' || dim === 'comprehend') && evt.kc_comprehension !== false;
    if (!isWord && !isComp) return null;   // meet/function/produce never reach here

    var state = load();
    var root = learnerRoot(state, learnerId);
    var bucket = isComp ? root.comp : root.words;
    var kind = isComp ? 'comprehension' : 'word';
    var rec = bucket[evt.word] || (bucket[evt.word] = emptyWord(kind));
    var p = P[kind];

    rec.attempts++;
    if (evt.is_correct) rec.correct++; else rec.wrong++;
    rec.pKnown = bktUpdate(rec.pKnown, evt.is_correct === true, p);

    if (evt.is_correct) {
      pushUnique(rec.repTypes, evt.repType);
      pushUnique(rec.contexts, evt.context || dim);
      if (evt.isDiscriminate) rec.discriminateSuccess = true;  // a real confusable-pair win
      if (!rec.firstSuccess) rec.firstSuccess = true;
      if (!evt.usedHelp) rec.successNoHelp = true;
      if (evt.newImage) rec.successNewImage = true;
      if (isComp) rec.successInSentence = true;   // a chunk IS a sentence context
      // cross-session evidence (survives reset via HISTORY_KEY)
      if (recordHistorySuccess(learnerId, evt.word, root.session)) rec.successNextSession = true;
    }

    // 🔒 the gate: number AND breadth of evidence. For the WORD KC the context set
    // must include a REAL discriminate (confusable-pair) success — recognize
    // contexts alone can NEVER light the lantern (Meytal 13.7).
    if (!rec.masteredAt &&
        rec.pKnown >= MASTERY &&
        rec.correct >= MIN_CORRECT_FOR_MASTERY &&
        rec.repTypes.length >= (isComp ? 1 : MIN_REPTYPES) &&
        rec.contexts.length >= (isComp ? 1 : MIN_CONTEXTS) &&
        (isComp || rec.discriminateSuccess === true)) {
      rec.masteredAt = Date.now();
    }
    save(state);

    return {
      word: evt.word, kc: kind, pKnown: rec.pKnown, correct: rec.correct,
      contexts: rec.contexts.length, repTypes: rec.repTypes.length,
      lantern: wordLevel(rec), mastered: !!rec.masteredAt,
    };
  }

  // production evidence (engagement) — NEVER mastery, NEVER lanterns.
  function recordProduction(learnerId, word, spoke) {
    var s = load(), r = learnerRoot(s, learnerId);
    var rec = r.prod[word] || (r.prod[word] = emptyProd());
    rec.attempts++; if (spoke) rec.spoke++; save(s);
  }

  // history store (cross-session). Returns true if this word already had a
  // success in an EARLIER session (=> "success next session" evidence).
  function recordHistorySuccess(learnerId, word, session) {
    var h = loadRaw(HISTORY_KEY);
    var lr = h[learnerId] || (h[learnerId] = {});
    var w = lr[word] || (lr[word] = { sessions: [] });
    var earlier = w.sessions.some(function (s) { return s < session; });
    pushUnique(w.sessions, session);
    saveRaw(HISTORY_KEY, h);
    return earlier;
  }

  // ---- lantern level (v2 §8: lit = the multi-context gate is met) ----
  function wordLevel(rec) {
    if (rec && rec.masteredAt) return 'lit';
    if (rec && (rec.pKnown >= LIGHT_ON || rec.firstSuccess)) return 'dim';
    return 'off';
  }
  function lanternLevel(learnerId, word) {   // (learnerId, word) OR legacy (pKnown)
    if (typeof learnerId === 'number') { return learnerId >= MASTERY ? 'lit' : (learnerId >= LIGHT_ON ? 'dim' : 'off'); }
    return wordLevel(getWord(learnerId, word));
  }

  // ---- reads ----
  function getWord(learnerId, word) { return learnerRoot(load(), learnerId).words[word] || emptyWord('word'); }
  function getComprehension(learnerId, word) { return learnerRoot(load(), learnerId).comp[word] || emptyWord('comprehension'); }
  function isMastered(learnerId, word) { return !!getWord(learnerId, word).masteredAt; }
  function coveredContexts(learnerId, word) { return (getWord(learnerId, word).contexts || []).slice(); }
  function snapshot(learnerId) {
    var r = learnerRoot(load(), learnerId);
    return JSON.parse(JSON.stringify({ words: r.words, comp: r.comp, prod: r.prod, met: r.met }));
  }
  function reset(learnerId) {
    var s = load();
    var r = s[learnerId];
    if (!r) { r = s[learnerId] = { session: 0 }; }
    r.session = (r.session || 0) + 1;   // advance session (keep the counter for "next session")
    r.words = {}; r.comp = {}; r.prod = {}; r.met = {};
    save(s);
  }

  return {
    beginSession: beginSession,
    ingest: ingest,
    recordProduction: recordProduction,
    markMet: markMet, hasMet: hasMet,
    getWord: getWord, getComprehension: getComprehension,
    isMastered: isMastered, coveredContexts: coveredContexts,
    lanternLevel: lanternLevel, wordLevel: wordLevel,
    snapshot: snapshot, reset: reset,
    MASTERY: MASTERY, LIGHT_ON: LIGHT_ON,
    MIN_REPTYPES: MIN_REPTYPES, MIN_CONTEXTS: MIN_CONTEXTS,
  };
})();
