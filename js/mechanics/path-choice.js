// ============================================================
// mechanics/path-choice.js — MEASURED mechanic #1 (v2 §3.1).
// Several glowing trails fork away from Lumi, each ending at a different animal.
// The child LEADS LUMI down the trail to the animal he named. The choice is the
// DIRECTION (a spatial commitment), not a tap on an abstract card.
//   • Physical action  : pick a path / send Lumi along it.
//   • Cognitive action : map heard word → destination, hold it across the fork.
// Clean-measurement: one deliberate decision, no dexterity, no timing.
// Uses LumiMeasured (first-tap-selects · central target button · learning mode).
// Context id: "path".
// ============================================================
window.LumiPathChoice = (function () {
  'use strict';

  function present(root, opts) {
    var item = opts.item;
    var emoji = opts.emoji || {};
    var options = item.options || [];
    var targetRep = opts.targetRep || null;

    var m = LumiMeasured.mount(root, {
      lumi: opts.lumi,
      targetAudio: (item.prompt && item.prompt.audio_en),   // the WORD, e.g. "dog"
      gestureMood: 'listen',
      help_he: item.help_he,
      instructionHe: opts.instructionHe, showInstruction: opts.showInstruction,
      onMeasured: opts.onMeasured,
      onDone: opts.onDone,
    });
    var scene = m.sceneEl, ctl = m.ctl;

    var paths = document.createElement('div');
    paths.className = 'paths';
    paths.innerHTML = '<div class="fork"><span class="fork-lumi">🔆</span></div>';
    scene.appendChild(paths);

    var correctOpt = null;
    options.forEach(function (o, i) {
      var glyph = o.correct && targetRep ? targetRep.glyph : (emoji[o.img] || '❔');
      var trail = document.createElement('div');
      trail.className = 'trail';
      trail.style.setProperty('--ti', i);
      trail.innerHTML =
        '<div class="trail-line"></div>' +
        '<button class="trail-animal" type="button" aria-label="שביל ' + (i + 1) + '">' +
          '<span class="ta-emoji">' + glyph + '</span>' +
        '</button>';
      paths.appendChild(trail);
      var btn = trail.querySelector('.trail-animal');

      var opt = ctl.registerOption({
        isCorrect: !!o.correct, img: o.img, key: i,
        onArm: function () { btn.classList.add('armed'); },
        disarm: function () { btn.classList.remove('armed'); },
        onCorrect: function () {
          trail.classList.add('chosen');
          paths.classList.add('leading');
          LumiFx.sparkle(btn);
        },
        onWrong: function () { btn.classList.add('soft'); setTimeout(function () { btn.classList.remove('soft'); }, 700); },
        beckon: function () { trail.classList.add('beckon'); },
        fade: function () { trail.classList.add('faded'); },
      });
      if (o.correct) correctOpt = opt;
      btn.addEventListener('click', function () { ctl.pick(opt); });
    });

    // QA autoplay — one deliberate pick of the correct path (measured = one tap).
    if (window.LUMI_AUTOPLAY && correctOpt) setTimeout(function () { ctl.pick(correctOpt); }, 1200);
  }

  return { present: present };
})();
