// ============================================================
// mechanics/meet.js — the cinematic FIRST MEETING with a word (not measured).
// Lumi meets the animal: big picture blooms in, media.audio_en is spoken ×2-3,
// Lumi reacts. No interaction. Then the word's lantern is lit (dim) and we move
// on. This is the gate every measured item depends on (Meet-before-Recognize).
// ============================================================
window.LumiMeet = (function () {
  'use strict';

  function present(root, opts) {
    var item = opts.item;
    var lumi = opts.lumi;
    var emoji = opts.emoji || {};
    var word = (item.target && item.target[0]) || '';
    var glyph = emoji[(item.media && item.media.img) || word] || '❔';

    root.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'meet';
    wrap.innerHTML =
      '<div class="meet-scene">' +
        '<div class="meet-halo"></div>' +
        '<div class="meet-emoji" aria-hidden="true">' + glyph + '</div>' +
      '</div>';
    root.appendChild(wrap);

    if (lumi) { lumi.setMood('happy'); lumi.say(''); }

    // bloom in, then speak the audio_en sequence (e.g. ["dog","dog","A dog!"]).
    requestAnimationFrame(function () { wrap.querySelector('.meet-scene').classList.add('meet-in'); });

    var seq = (item.media && item.media.audio_en) || [word];
    setTimeout(function () {
      LumiAudio.sequence(seq, 480).then(function () {
        // record the Meet so the guard unlocks this word for measured items.
        if (opts.learnerId) LumiBKT.markMet(opts.learnerId, word);
        if (lumi) { lumi.setMood('glow'); lumi.pulse(); }
        LumiFx.sparkle(wrap.querySelector('.meet-emoji'));
        setTimeout(function () {
          if (typeof opts.onDone === 'function') opts.onDone({ met: word });
        }, 900);
      });
    }, 500);
  }

  return { present: present };
})();
