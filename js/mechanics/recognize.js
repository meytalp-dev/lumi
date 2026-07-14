// ============================================================
// mechanics/recognize.js — DEPRECATED shim (v2 redirect).
// "Recognize" is now delivered as the MEASURED path-choice mechanic (§3.1), which
// carries the two-tap fix (first-tap-selects + central target button). This shim
// keeps the old name working; the engine calls LumiPathChoice directly.
// ============================================================
window.LumiRecognize = { present: function (root, opts) { return LumiPathChoice.present(root, opts); } };
