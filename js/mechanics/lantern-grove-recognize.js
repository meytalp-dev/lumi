// ============================================================
// mechanics/lantern-grove-recognize.js — the LANTERN GROVE skin of MEASURED
// Recognize (Lumi pilot, brief 2026-07-13).
//
// The child hears an English word. Three lanterns hang in a twilight grove, an
// animal hidden inside each. The child taps ONE lantern (first tap = the answer).
// Correct → the lantern lights, the animal is revealed, Lumi is happy, one light
// on the path kindles. Wrong → nothing red, no X: the lantern breathes softly,
// Lumi encourages, the word plays again, and we drop into a gentle LEARNING mode
// that reveals the answer without grading it.
//
// This file owns ONLY the SCENE + option visuals. All measurement validity lives
// in LumiMeasured (_measured-core.js): first-tap-selects, one measured attempt,
// a separate replay button, wrong-first → learning (never re-fed to BKT). We opt
// into `gateOnPrompt` so the lanterns are inert while the first word plays (§6).
//
// ── THE CONTRACT CODEX STYLES AGAINST (do not rename without updating the CSS) ──
//   .lg-grove[data-phase]        prompting | awaiting | revealing | success | retry
//   .lumi-companion[data-mood]   idle | listening | pointing | curious | happy
//                                | celebrate | try-again   ← maps 1:1 to lumi-*.png
//   .lg-lantern[data-state]      idle | active | revealing | success | retry
//                                | hint | dimmed
//     └ layers (all present, empty — Codex paints them):
//        .lg-glow  .lg-shell  .lg-animal[data-animal]  .lg-glass
//   The animal PNG is selected by .lg-animal[data-animal="dog"] (emoji is only a
//   dev placeholder until assets/animals/pets/*.png land).
// ============================================================
window.LumiLanternGrove = (function () {
  'use strict';

  // internal measured-core moods → Lantern-Grove asset states (lumi-*.png names).
  var MOOD = {
    listen: 'listening', dim: 'try-again', points: 'pointing',
    happy: 'happy', glow: 'celebrate', hug: 'happy', lean: 'curious', idle: 'idle',
  };

  // A companion controller with the same surface LumiMeasured expects
  // (setMood / say / pulse / el). Placeholder visual = the shared SVG Lumi so the
  // pilot is alive TODAY; Codex swaps it for lumi-*.png via [data-mood] in CSS and
  // hides the .lc-figure fallback. Nothing here needs to change when art lands.
  function makeCompanion() {
    var el = document.createElement('div');
    el.className = 'lumi-companion';
    el.setAttribute('data-mood', 'idle');
    el.innerHTML =
      '<div class="lc-glow" aria-hidden="true"></div>' +
      '<div class="lc-figure" aria-hidden="true"></div>' +
      '<div class="lc-bubble" hidden></div>';
    var figure = el.querySelector('.lc-figure');
    var bubble = el.querySelector('.lc-bubble');
    var svg = (window.LumiCharacter && LumiCharacter.mount) ? LumiCharacter.mount(figure) : null;

    function setMood(name) {
      el.setAttribute('data-mood', MOOD[name] || 'idle');   // ← asset-state contract
      if (svg) svg.setMood(name);                            // placeholder reacts too
    }
    function say(html) {
      if (!html) { bubble.hidden = true; bubble.innerHTML = ''; return; }
      bubble.hidden = false; bubble.innerHTML = html;
    }
    function pulse() {
      el.classList.remove('lc-pulse'); void el.offsetWidth; el.classList.add('lc-pulse');
      if (svg && svg.pulse) svg.pulse();
    }
    return { el: el, setMood: setMood, say: say, pulse: pulse };
  }

  function present(root, opts) {
    var item = opts.item;
    var emoji = opts.emoji || {};
    var options = item.options || [];
    var targetRep = opts.targetRep || null;

    var companion = makeCompanion();

    var m = LumiMeasured.mount(root, {
      lumi: companion,
      targetAudio: (item.prompt && item.prompt.audio_en),   // the WORD, e.g. "dog"
      gestureMood: 'listen',
      help_he: item.help_he,
      instructionHe: opts.instructionHe, showInstruction: opts.showInstruction,
      gateOnPrompt: true,                                    // §6: inert during first audio
      onArmed: function () { grove.setAttribute('data-phase', 'awaiting'); },
      onMeasured: opts.onMeasured,
      onDone: opts.onDone,
    });
    var scene = m.sceneEl, ctl = m.ctl;

    // ---- the grove scene (owns companion + lanterns) ----
    var grove = document.createElement('div');
    grove.className = 'lg-grove';
    grove.setAttribute('data-phase', 'prompting');           // → 'awaiting' once armed
    grove.innerHTML = '<div class="lg-bg" aria-hidden="true"></div>';
    grove.appendChild(companion.el);
    var lanterns = document.createElement('div');
    lanterns.className = 'lg-lanterns';
    grove.appendChild(lanterns);
    scene.appendChild(grove);

    var all = [];
    var correctOpt = null;

    options.forEach(function (o, i) {
      var glyph = o.correct && targetRep ? targetRep.glyph : (emoji[o.img] || '❔');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lg-lantern';
      btn.setAttribute('data-state', 'idle');
      btn.setAttribute('aria-label', 'פנס ' + (i + 1));       // system a11y; no visible EN
      btn.disabled = true;                                     // §6: locked until armed
      btn.style.setProperty('--li', i);
      btn.innerHTML =
        '<span class="lg-glow" aria-hidden="true"></span>' +
        '<span class="lg-shell" aria-hidden="true"></span>' +
        '<span class="lg-animal" data-animal="' + o.img + '" aria-hidden="true">' + glyph + '</span>' +
        '<span class="lg-glass" aria-hidden="true"></span>';
      lanterns.appendChild(btn);

      function set(state) { btn.setAttribute('data-state', state); }

      var opt = ctl.registerOption({
        isCorrect: !!o.correct, img: o.img, key: i,
        onArm:    function () { set('active'); },
        disarm:   function () { if (btn.getAttribute('data-state') === 'active') set('idle'); },
        onCorrect: function () {
          set('revealing');
          all.forEach(function (b) { if (b !== btn) b.setAttribute('data-state', 'dimmed'); });
          grove.setAttribute('data-phase', 'revealing');
          setTimeout(function () {
            set('success');
            grove.setAttribute('data-phase', 'success');
            LumiFx.sparkle(btn);
          }, 520);
        },
        onWrong:  function () {
          set('retry'); grove.setAttribute('data-phase', 'retry');
          setTimeout(function () { if (btn.getAttribute('data-state') === 'retry') set('idle'); }, 700);
        },
        beckon:   function () { set('hint'); },
        fade:     function () { set('dimmed'); },
      });

      btn.addEventListener('click', function () { ctl.pick(opt); });
      all.push(btn);
      if (o.correct) correctOpt = opt;
    });

    // when the gate lifts, the lanterns become interactive (§6 awaiting-choice).
    var origArmed = grove.getAttribute('data-phase');
    var poll = setInterval(function () {
      if (!ctl.isLocked()) {
        clearInterval(poll);
        all.forEach(function (b) { b.disabled = false; });
        if (grove.getAttribute('data-phase') === 'prompting') grove.setAttribute('data-phase', 'awaiting');
        // QA autoplay — one deliberate pick of the correct lantern (measured = 1 tap)
        if (window.LUMI_AUTOPLAY && correctOpt) setTimeout(function () { ctl.pick(correctOpt); }, 900);
      }
    }, 80);
    void origArmed;
  }

  return { present: present };
})();
