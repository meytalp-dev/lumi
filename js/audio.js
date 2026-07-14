// ============================================================
// audio.js — Lumi's abstract audio layer.
// Pilot backend = English browser TTS (Web Speech). The mechanics NEVER call
// speechSynthesis directly; they call LumiAudio.speak(text) / .sequence([...]).
// Later, a recorded-character-voice backend can be dropped in behind the same
// API (a clip map keyed by text/id) without touching a single mechanic.
//
// Design notes:
//  - English only for content audio (audio_en). Hebrew is UI/help, spoken via
//    a separate he-IL utterance so the accent is right.
//  - Every call returns a Promise that resolves when the utterance ENDS, so
//    mechanics can await ×2-3 repeats (Meet) or gate the next beat.
//  - "two-tap" relies on playing a single word on demand — that is just speak().
// ============================================================
window.LumiAudio = (function () {
  'use strict';

  var RATE_EN = 0.82;   // slow & clear for a 6-year-old L2 listener
  var RATE_HE = 0.9;
  var PITCH   = 1.06;   // a hair bright — Lumi is a warm little creature

  // ---- future recorded-clip backend hook (empty in pilot) --------------------
  // If LumiAudio.clipMap[text] exists (an <audio> src / id), playClip() would be
  // used instead of TTS. Kept as a seam so recorded voice is a config swap.
  var clipMap = {};

  var voicesReady = false;
  function primeVoices() {
    if (typeof speechSynthesis === 'undefined') return;
    try {
      speechSynthesis.getVoices();
      speechSynthesis.onvoiceschanged = function () { voicesReady = true; };
    } catch (e) {}
  }
  primeVoices();

  function pickVoice(lang) {
    if (typeof speechSynthesis === 'undefined') return null;
    var voices = [];
    try { voices = speechSynthesis.getVoices() || []; } catch (e) { return null; }
    var pref = voices.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf(lang) === 0; });
    // prefer a female/child-ish voice when available (heuristic on name)
    var nice = pref.find(function (v) { return /female|samantha|zira|google/i.test(v.name); });
    return nice || pref[0] || null;
  }

  function stop() {
    if (typeof speechSynthesis === 'undefined') return;
    try { speechSynthesis.cancel(); } catch (e) {}
  }

  // Core speak — lang: 'en' | 'he'. Resolves on end (or immediately if no TTS).
  function speak(text, opts) {
    opts = opts || {};
    var lang = opts.lang === 'he' ? 'he-IL' : 'en-US';
    return new Promise(function (resolve) {
      if (!text) { resolve(false); return; }

      // recorded-clip seam (pilot: never taken)
      if (clipMap[text]) { return playClip(clipMap[text], resolve); }

      if (typeof speechSynthesis === 'undefined') {
        // No TTS (some headless contexts). Resolve after a readable beat so the
        // visual flow still paces correctly.
        setTimeout(function () { resolve(false); }, Math.min(1400, 350 + text.length * 55));
        return;
      }
      try {
        stop();
        var u = new SpeechSynthesisUtterance(text);
        u.lang = lang;
        u.rate = lang === 'he-IL' ? RATE_HE : RATE_EN;
        u.pitch = PITCH;
        var v = pickVoice(lang === 'he-IL' ? 'he' : 'en');
        if (v) u.voice = v;
        var done = false;
        u.onend = function () { if (!done) { done = true; resolve(true); } };
        u.onerror = function () { if (!done) { done = true; resolve(false); } };
        speechSynthesis.speak(u);
        // safety timeout — some browsers drop onend
        setTimeout(function () { if (!done) { done = true; resolve(true); } }, 400 + text.length * 130);
      } catch (e) { resolve(false); }
    });
  }

  function playClip(src, resolve) {
    try {
      var a = new Audio(src);
      a.onended = function () { resolve(true); };
      a.onerror = function () { resolve(false); };
      // play() rejects when the autoplay policy blocks it (no user gesture yet).
      // Swallow it so it never surfaces as an unhandled rejection in the console.
      var pr = a.play();
      if (pr && pr.catch) pr.catch(function () { resolve(false); });
    } catch (e) { resolve(false); }
  }

  // speak English (content). audio_en is a string or array; array → sequence.
  function english(textOrArr, gapMs) {
    if (Array.isArray(textOrArr)) return sequence(textOrArr, gapMs, 'en');
    return speak(textOrArr, { lang: 'en' });
  }

  function hebrew(text) { return speak(text, { lang: 'he' }); }

  // sequence — play items back-to-back with a small gap. Used by Meet (×2-3).
  function sequence(list, gapMs, lang) {
    gapMs = gapMs == null ? 420 : gapMs;
    var i = 0;
    function next() {
      if (i >= list.length) return Promise.resolve(true);
      var t = list[i++];
      return speak(t, { lang: lang === 'he' ? 'he' : 'en' }).then(function () {
        return new Promise(function (r) { setTimeout(r, gapMs); }).then(next);
      });
    }
    return next();
  }

  return {
    speak: speak,
    english: english,
    hebrew: hebrew,
    sequence: sequence,
    stop: stop,
    clipMap: clipMap,     // exposed so a recorded-voice backend can register clips
  };
})();
