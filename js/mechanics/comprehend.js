// ============================================================
// mechanics/comprehend.js — DEPRECATED shim (v2 redirect).
// "Comprehend" (whole-chunk "Where is the dog?") is now delivered as the MEASURED
// scene-hide mechanic (§3.3) — a 3rd context — carrying the two-tap fix. This shim
// keeps the old name working; the engine calls LumiSceneHide directly.
// ============================================================
window.LumiComprehend = { present: function (root, opts) { return LumiSceneHide.present(root, opts); } };
