// ============================================================
// mechanics/scene-hide.js — MEASURED mechanic #3 (v2 §3.3).
// A little world (tree, bushes, cottage). Animals PEEK from behind the objects.
// Lumi asks a whole CHUNK — "Where is the dog?" / "Find the duck." — and the child
// finds the peeking animal and taps it.
//   • Physical action  : search a populated scene for a half-hidden animal.
//   • Cognitive action : COMPREHEND a whole instruction (not a bare word) → locate
//     its referent. This is why it feeds the SEPARATE chunk-comprehension KC.
//   • 3rd CONTEXT (v2 §4): in-world, occluded — different again from path & beam.
// Uses LumiMeasured. Context id: "scene".
// ============================================================
window.LumiSceneHide = (function () {
  'use strict';

  // peek anchor points (percent) tucked against scene objects.
  var SPOTS = [
    [16, 52], [52, 60], [82, 54], [34, 68], [68, 66],
  ];

  function present(root, opts) {
    var item = opts.item;
    var emoji = opts.emoji || {};
    var options = item.options || [];
    var targetRep = opts.targetRep || null;

    var m = LumiMeasured.mount(root, {
      lumi: opts.lumi,
      targetAudio: (item.prompt && item.prompt.audio_en),   // the CHUNK
      gestureMood: 'points',
      help_he: item.help_he,
      instructionHe: opts.instructionHe, showInstruction: opts.showInstruction,
      onMeasured: opts.onMeasured,
      onDone: opts.onDone,
    });
    var scene = m.sceneEl, ctl = m.ctl;

    var world = document.createElement('div');
    world.className = 'hide-scene';
    scene.appendChild(world);
    try { world.appendChild(LumiScene.backdropScene()); } catch (e) {}

    var correctOpt = null;
    options.forEach(function (o, i) {
      var glyph = o.correct && targetRep ? targetRep.glyph : (emoji[o.img] || '❔');
      var pos = SPOTS[i % SPOTS.length];
      var pk = document.createElement('button');
      pk.type = 'button';
      pk.className = 'peeker';
      pk.style.insetInlineStart = pos[0] + '%';
      pk.style.top = pos[1] + '%';
      pk.style.setProperty('--pk', (2.6 + Math.random() * 1.4).toFixed(1) + 's');
      pk.setAttribute('aria-label', 'חיה ' + (i + 1));
      pk.innerHTML = '<span class="p-emoji">' + glyph + '</span>';
      world.appendChild(pk);

      var opt = ctl.registerOption({
        isCorrect: !!o.correct, img: o.img, key: i,
        onArm: function () { pk.classList.add('armed'); },
        disarm: function () { pk.classList.remove('armed'); },
        onCorrect: function () { pk.classList.add('chosen'); LumiFx.sparkle(pk); },
        onWrong: function () { pk.classList.add('startle-soft'); setTimeout(function () { pk.classList.remove('startle-soft'); }, 600); },
        beckon: function () { pk.classList.add('beckon'); },
        fade: function () { pk.classList.add('faded'); },
      });
      if (o.correct) correctOpt = opt;
      pk.addEventListener('click', function () { ctl.pick(opt); });
    });

    if (window.LUMI_AUTOPLAY && correctOpt) setTimeout(function () { ctl.pick(correctOpt); }, 1300);
  }

  return { present: present };
})();
