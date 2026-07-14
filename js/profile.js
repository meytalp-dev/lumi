// ============================================================
// profile.js — the child's opening ENGLISH literacy profile (from mapping.html),
// read by every minigame to set task DEPTH per station.
//
// Placement model (locked with Meytal, 2026-07-14): "עומק פר-תחנה" — everyone
// plays the SAME 12 stations; the profile does NOT move a child to a different
// station. It sets a TIER (1–3) that scales how much SUPPORT vs CHALLENGE each
// station gives. Consistent with the avnei-yesod placement principle (§2.5:
// class-anchor, personal stage — depth, not a separate path).
//
// The lever is the number of DISTRACTORS shown in a recognize item (support ↔
// challenge), NOT the amount of content (never teach a struggling child fewer
// words — that widens gaps / Matthew effect):
//   tier 1 (Pre-A1, most support) → 1 distractor  = 2 options
//   tier 2 (default)              → 2 distractors  = 3 options
//   tier 3 (A1, challenge)        → 3 distractors  = 4 options
// slice(0, N) is safe when a pool has fewer than N — it just returns the pool.
// ============================================================
window.LumiProfile = (function () {
  'use strict';
  function read() {
    try { return JSON.parse(localStorage.getItem('lumi-profile')) || {}; }
    catch (e) { return {}; }
  }
  function tier() {
    var t = read().tier;
    return (t === 1 || t === 2 || t === 3) ? t : 2;   // default = middle
  }
  // how many distractors a recognize item should show, at the current tier.
  function distractors() { return ({ 1: 1, 2: 2, 3: 3 })[tier()]; }
  return { read: read, tier: tier, distractors: distractors };
})();
