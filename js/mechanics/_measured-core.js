// ============================================================
// mechanics/_measured-core.js — THE MEASUREMENT CONTRACT (v2 §1).
// Shared by every MEASURED mechanic (path-choice, light-beam, scene-hide) so they
// all behave identically where it matters for validity. This is the fix for the
// critical two-tap bug.
//
//   🔴 BEFORE (bug): tap-1 on an option played THAT option's name → the child
//      could pre-hear every picture and match sounds. Recognition collapsed into
//      audio-matching (false positives).
//
//   ✅ AFTER: in a MEASURED item the FIRST tap on an option = SELECTION. Options
//      never say their own names during measurement. A prominent CENTRAL TARGET
//      button replays the target WORD/CHUNK (never an option). Only the FIRST
//      attempt is measured. A wrong first answer drops into a LEARNING MODE that
//      is instruction, not assessment (two-tap allowed, pictures may say their
//      names, Lumi demonstrates) — and is NEVER fed to BKT.
//
// The mechanic owns the SCENE and the option visuals; it calls ctl.pick(opt) when
// the child activates an option. The core owns the contract.
//
// mount(root, opts) → { sceneEl, ctl }
//   opts: { lumi, targetAudio(str|arr), gestureMood, help_he,
//           instructionHe, showInstruction,
//           gateOnPrompt,     // opt-in (brief §6): options are LOCKED (taps ignored)
//                             //   until the FIRST target audio finishes. Default off,
//                             //   so path-choice/light-beam/scene-hide are unchanged.
//           onArmed(),        // fires once when the gate lifts (options interactive)
//           onMeasured({firstCorrect, usedHelp}),  // fires EXACTLY once
//           onDone({correct}) }
//   ctl:  { pick(opt), isLearning(), isLocked(), playTarget(), enterLearning(),
//           finish(res), options:[], registerOption(opt) }
//   opt:  { isCorrect, img, key, onArm(), onCorrect(), onWrong(), beckon(), fade() }
// ============================================================
window.LumiMeasured = (function () {
  'use strict';

  function mount(root, opts) {
    var lumi = opts.lumi;
    var st = {
      measured: false, resolved: false, learning: false,
      armedKey: null, help: 0, helpBeforeFirst: false, options: [],
      locked: !!opts.gateOnPrompt,   // §6: no selection while the prompt audio plays
    };

    root.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'measure';
    wrap.innerHTML =
      '<div class="measure-top">' +
        '<button class="target-btn" type="button" aria-label="שמעו את המילה">' +
          '<span class="target-ic">👂</span>' +
          '<span class="target-wave"></span>' +
        '</button>' +
        '<div class="measure-instr" hidden></div>' +
      '</div>' +
      '<div class="measure-scene"></div>' +
      '<button class="help-fab" type="button" aria-label="עזרה">🆘</button>';
    root.appendChild(wrap);

    var targetBtn = wrap.querySelector('.target-btn');
    var sceneEl   = wrap.querySelector('.measure-scene');
    var instrEl   = wrap.querySelector('.measure-instr');
    var helpBtn   = wrap.querySelector('.help-fab');

    if (opts.instructionHe && opts.showInstruction) {
      instrEl.hidden = false;
      instrEl.textContent = opts.instructionHe;
    }

    function playTarget() {
      if (lumi) lumi.setMood(opts.gestureMood || 'listen');
      targetBtn.classList.remove('pinging'); void targetBtn.offsetWidth; targetBtn.classList.add('pinging');
      if (Array.isArray(opts.targetAudio)) return LumiAudio.sequence(opts.targetAudio);
      return LumiAudio.english(opts.targetAudio);
    }
    targetBtn.addEventListener('click', playTarget);

    helpBtn.addEventListener('click', function () {
      if (!st.measured) st.helpBeforeFirst = true;
      if (opts.help_he) { if (lumi) lumi.say('<span>🆘</span>'); LumiAudio.hebrew(opts.help_he); }
      escalateHelp();
    });

    function registerOption(opt) { st.options.push(opt); return opt; }

    // ---- the state machine ----
    function pick(opt) {
      if (st.resolved) return;
      if (st.locked) return;   // §6: prompt audio still playing → not interactive yet

      if (!st.measured) {
        // MEASURED PHASE — first tap SELECTS. No pre-hearing of options.
        st.measured = true;
        var usedHelp = st.helpBeforeFirst;
        if (typeof opts.onMeasured === 'function') {
          try { opts.onMeasured({ firstCorrect: !!opt.isCorrect, usedHelp: usedHelp }); } catch (e) {}
        }
        if (opt.isCorrect) return commitCorrect(opt);
        return enterLearning(opt);   // wrong first answer → teach, don't grade
      }

      // LEARNING PHASE — two-tap explore (NOT measured). Pictures say their names.
      if (opt.isCorrect && st.armedKey === opt.key) return commitCorrect(opt);
      if (st.armedKey !== opt.key) {
        st.armedKey = opt.key;
        clearArms();
        if (opt.onArm) opt.onArm();
        LumiAudio.english(opt.img);        // legitimate here: this is instruction
        return;
      }
      // second tap on a wrong card in learning → gentle, keep exploring
      if (opt.onWrong) opt.onWrong();
      LumiAudio.english(opt.img);
    }

    function clearArms() { st.options.forEach(function (o) { if (o.disarm) o.disarm(); }); }

    function commitCorrect(opt) {
      st.resolved = true;
      clearArms();
      if (lumi) { lumi.setMood('happy'); lumi.pulse(); }
      if (opt.onCorrect) opt.onCorrect();
      setTimeout(function () {
        if (typeof opts.onDone === 'function') opts.onDone({ correct: true });
      }, 900);
    }

    function enterLearning(opt) {
      st.learning = true;
      if (opt && opt.onWrong) opt.onWrong();       // soft — never red / never an X
      if (lumi) lumi.setMood('dim');
      // demonstrate: patient Lumi, replay the target, point to the answer.
      LumiAudio.english('Let’s listen again').then(function () {
        return playTarget();
      }).then(function () {
        if (lumi) lumi.setMood('points');
        // reveal the answer gently — the correct option beckons.
        var correct = st.options.filter(function (o) { return o.isCorrect; })[0];
        if (correct && correct.beckon) correct.beckon();
      });
    }

    function escalateHelp() {
      st.help++;
      if (st.help === 1) { playTarget(); }
      if (st.help === 2) {
        // drop one distractor (keep correct + one other).
        var wrongs = st.options.filter(function (o) { return !o.isCorrect && !o._faded; });
        if (wrongs.length > 1 && wrongs[0].fade) { wrongs[0].fade(); wrongs[0]._faded = true; }
      }
      if (st.help >= 3) {
        if (lumi) lumi.setMood('points');
        var correct = st.options.filter(function (o) { return o.isCorrect; })[0];
        if (correct && correct.beckon) correct.beckon();
      }
    }

    function finish(res) { if (typeof opts.onDone === 'function') opts.onDone(res || {}); }

    // open: gesture + play the target once (no option ever speaks first).
    // When gated (§6), options stay LOCKED until this first prompt finishes.
    if (lumi) lumi.setMood(opts.gestureMood || 'listen');
    setTimeout(function () {
      var p = playTarget();
      if (st.locked) {
        Promise.resolve(p).then(function () {
          st.locked = false;
          if (typeof opts.onArmed === 'function') { try { opts.onArmed(); } catch (e) {} }
        });
      }
    }, 260);

    var ctl = {
      pick: pick,
      registerOption: registerOption,
      isLearning: function () { return st.learning; },
      isResolved: function () { return st.resolved; },
      isLocked: function () { return st.locked; },
      playTarget: playTarget,
      enterLearning: enterLearning,
      finish: finish,
      options: st.options,
      targetBtn: targetBtn, helpBtn: helpBtn,
    };
    return { sceneEl: sceneEl, ctl: ctl };
  }

  return { mount: mount };
})();
