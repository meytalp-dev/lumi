// ============================================================
// mechanics/light-beam.js — MEASURED mechanic #2 (v2 §3.2).
// A dusky scene where animals rest as faint silhouettes. The child SWEEPS a beam
// of light across the space; whatever the beam falls on brightens. When they find
// the animal Lumi named, they tap it.
//   • Physical action  : move a light through 2-D space (a search sweep).
//   • Cognitive action : hold the target word while visually scanning; match.
//   • 2nd VISUAL CONTEXT (v2 §4): a night scene + silhouettes — different from the
//     bright trails of path-choice, so success here is real transfer.
// Kept GENTLE: the animal is findable (always faintly visible), never a reflex or
// a timed catch — so game-load never confounds the English measure.
// Uses LumiMeasured. Context id: "beam".
// ============================================================
window.LumiLightBeam = (function () {
  'use strict';

  // spread positions (percent) so the search covers real space, not a row.
  var SPOTS = [
    [24, 34], [70, 30], [48, 64], [20, 70], [78, 66], [50, 26],
  ];

  function present(root, opts) {
    var item = opts.item;
    var emoji = opts.emoji || {};
    var options = item.options || [];
    var targetRep = opts.targetRep || null;

    var m = LumiMeasured.mount(root, {
      lumi: opts.lumi,
      targetAudio: (item.prompt && item.prompt.audio_en),
      gestureMood: 'listen',
      help_he: item.help_he,
      instructionHe: opts.instructionHe, showInstruction: opts.showInstruction,
      onMeasured: opts.onMeasured,
      onDone: opts.onDone,
    });
    var scene = m.sceneEl, ctl = m.ctl;

    var field = document.createElement('div');
    field.className = 'beam-scene';
    field.innerHTML = '<div class="beam" hidden></div>';
    scene.appendChild(field);
    var beam = field.querySelector('.beam');

    var animals = [];
    var correctOpt = null;
    options.forEach(function (o, i) {
      var glyph = o.correct && targetRep ? targetRep.glyph : (emoji[o.img] || '❔');
      var pos = SPOTS[i % SPOTS.length];
      var a = document.createElement('button');
      a.type = 'button';
      a.className = 'beam-animal';
      a.style.insetInlineStart = pos[0] + '%';
      a.style.top = pos[1] + '%';
      a.setAttribute('aria-label', 'חיה ' + (i + 1));
      a.innerHTML = '<span class="ba-emoji">' + glyph + '</span>';
      field.appendChild(a);

      var opt = ctl.registerOption({
        isCorrect: !!o.correct, img: o.img, key: i,
        onArm: function () { a.classList.add('armed'); },
        disarm: function () { a.classList.remove('armed'); },
        onCorrect: function () { a.classList.add('found', 'chosen'); LumiFx.sparkle(a); },
        onWrong: function () { a.classList.add('soft'); setTimeout(function () { a.classList.remove('soft'); }, 700); },
        beckon: function () { a.classList.add('found', 'beckon'); },
        fade: function () { a.classList.add('faded'); },
      });
      if (o.correct) correctOpt = opt;
      animals.push({ el: a, opt: opt });
      a.addEventListener('click', function (e) { e.stopPropagation(); ctl.pick(opt); });
    });

    // ---- the beam follows the finger/pointer; nearest animal brightens ----
    function moveBeamTo(clientX, clientY) {
      var r = field.getBoundingClientRect();
      var x = clientX - r.left, y = clientY - r.top;
      beam.hidden = false;
      beam.style.left = x + 'px';
      beam.style.top = y + 'px';
      var best = null, bestD = 1e9;
      animals.forEach(function (a) {
        var ar = a.el.getBoundingClientRect();
        var dx = (ar.left + ar.width / 2) - clientX, dy = (ar.top + ar.height / 2) - clientY;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestD) { bestD = d; best = a; }
      });
      animals.forEach(function (a) { a.el.classList.toggle('found', a === best && bestD < 90); });
    }
    field.addEventListener('pointermove', function (e) { moveBeamTo(e.clientX, e.clientY); });
    field.addEventListener('pointerdown', function (e) { moveBeamTo(e.clientX, e.clientY); });

    // QA autoplay — reveal the field, then one deliberate pick of the correct animal.
    if (window.LUMI_AUTOPLAY && correctOpt) {
      animals.forEach(function (a) { a.el.classList.add('found'); });
      setTimeout(function () { ctl.pick(correctOpt); }, 1300);
    }
  }

  return { present: present };
})();
