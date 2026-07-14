// ============================================================
// mechanics/function.js — 💬 a little communicative scenario. Lumi expresses
// itself ("I like dogs!") + a task ("Give Lumi the animal"), the child "gives"
// Lumi the picture. Pure ENGAGEMENT — measured:false, NEVER feeds BKT. Every
// tap is a warm hug from Lumi. Uses LumiChoice but resolves without ingest.
// ============================================================
window.LumiFunction = (function () {
  'use strict';

  function present(root, opts) {
    var item = opts.item;
    LumiChoice.present(root, {
      item: item,
      lumi: opts.lumi,
      emoji: opts.emoji,
      help_he: item.help_he,
      // say the feeling first, then the task ("Give Lumi the animal").
      promptAudio: item.prompt && item.prompt.audio_en,
      taskAudio: item.task_audio,
      gestureMood: 'hug',
      instructionHe: opts.instructionHe,                        // "תְּנוּ לְלוּמִי"
      showInstruction: opts.showInstruction,
      measured: false,
      celebrate: 'hug',
      // engagement flag only — explicitly NOT sent to BKT.
      onResolve: function (r) {
        if (typeof opts.onEngagement === 'function') {
          opts.onEngagement({ dimension: 'function', word: item.target[0], correct: r.firstCorrect });
        }
      },
      onDone: opts.onDone,
    });
  }

  return { present: present };
})();
