// ============================================================
// mechanics/discriminate.js — DEPRECATED shim (v2 redirect).
// "Discriminate" (hard distractors) is now delivered as the MEASURED light-beam
// mechanic (§3.2) — a 2nd visual context — carrying the two-tap fix. This shim
// keeps the old name working; the engine calls LumiLightBeam directly.
// ============================================================
window.LumiDiscriminate = { present: function (root, opts) { return LumiLightBeam.present(root, opts); } };
