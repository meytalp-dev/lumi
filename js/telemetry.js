// ============================================================
// telemetry.js — Stage 0.0 CENTRAL EVENT CONTRACT (SPEC-stage0 §1).
// Every measured first-attempt from every game funnels through ONE point → BKT,
// so the 12 games can't drift into 12 interpretations of "correct". Before this,
// each game passed an empty `onMeasured` stub and the learning signal was thrown
// away (bkt.js was never fed).
//
// Load AFTER bkt.js. beginSession fires once per page load (= one play sitting).
//
//   LumiTelemetry.recordMeasured({
//     word, dimension, context,           // required
//     res: { firstCorrect, usedHelp },    // from the mechanic's onMeasured
//     kc_comprehension, repType, isDiscriminate, newImage   // optional
//   })
//   LumiTelemetry.meet(word)            // exposure — never raises mastery
//   LumiTelemetry.produce(word, spoke)  // engagement evidence — never mastery
// ============================================================
window.LumiTelemetry = (function () {
  'use strict';
  var LEARNER = (window.LumiBKT && LumiBKT.learnerId && LumiBKT.learnerId()) || 'local';   // per-student (unified via bkt.js)
  var EV_KEY = 'lumi-events-v1', EV_CAP = 5000;

  if (window.LumiBKT) { try { LumiBKT.beginSession(LEARNER); } catch (e) {} }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'e' + Date.now() + Math.random().toString(16).slice(2);
  }
  var SESSION = uid();
  var ACTIVITY = (function () { try { return (location.pathname.split('/').pop() || '').replace('.html', ''); } catch (e) { return null; } })();

  // append-only, immutable raw-event log (SPEC-stage0 §2). NEVER stores computed
  // state (pKnown/strength/mastered) — mastery is DERIVED by bkt.js separately.
  function appendEvent(ev) {
    try {
      var arr = JSON.parse(localStorage.getItem(EV_KEY) || '[]');
      arr.push(ev);
      if (arr.length > EV_CAP) arr = arr.slice(arr.length - EV_CAP);
      localStorage.setItem(EV_KEY, JSON.stringify(arr));
    } catch (e) {}
  }
  function events() { try { return JSON.parse(localStorage.getItem(EV_KEY) || '[]'); } catch (e) { return []; } }

  function recordMeasured(o) {
    if (!window.LumiBKT || !o || !o.word || !o.res) return;
    var supports = (o.res.supportsUsed || []).slice();
    LumiBKT.ingest({
      learnerId: LEARNER,
      word: o.word,
      dimension: o.dimension || 'recognize',
      kc_comprehension: o.kc_comprehension,
      is_correct: !!o.res.firstCorrect,
      usedHelp: !!o.res.usedHelp,
      repType: o.repType || 'emoji',          // placeholder art; real PNGs add rep TYPES
      context: o.context || o.dimension || 'recognize',
      isDiscriminate: !!o.isDiscriminate,
      newImage: !!o.newImage,
    });
    appendEvent({
      schemaVersion: 1,
      eventId: uid(),
      eventType: 'learning_attempt',
      learnerId: LEARNER,
      sessionId: SESSION,
      activityId: ACTIVITY,
      targetId: o.word,
      sourceWorld: o.context || null,
      skillDimension: o.dimension || 'recognize',
      responseMode: o.responseMode || 'choice',
      supportLevel: supports.length ? 'guided' : 'independent',
      supportsUsed: supports,
      correct: !!o.res.firstCorrect,
      firstCorrect: !!o.res.firstCorrect,
      usedHelp: !!o.res.usedHelp,
      responseTimeMs: (o.res.responseTimeMs != null ? o.res.responseTimeMs : null),
      occurredAt: new Date().toISOString(),
    });
  }
  function meet(word)           { if (window.LumiBKT) { try { LumiBKT.markMet(LEARNER, word); } catch (e) {} } }
  function produce(word, spoke) { if (window.LumiBKT) { try { LumiBKT.recordProduction(LEARNER, word, !!spoke); } catch (e) {} } }

  return { LEARNER: LEARNER, recordMeasured: recordMeasured, meet: meet, produce: produce, events: events };
})();
