// ============================================================
// mechanics/_choice.js — the EXPLORE-ONLY picture-choice variant (v2 §1 split).
// ⚠️ NOT for measured items. Measured recognize/discriminate/comprehend now use
//    _measured-core.js (first-tap-selects + central target button) via
//    path-choice / light-beam / scene-hide. Using two-tap on a MEASURED item is
//    the exact validity bug the v2 redirect fixes (pre-hearing every option).
//
// This variant is used ONLY by UNMEASURED interactions (function / meet-explore),
// where letting a tap play a picture's own name is legitimate — nothing is scored.
//   • two-tap: tap1 on a card = play THAT picture's English audio (explore);
//              tap2 on the same card = commit.
//   • no_read: cards show a picture only — never the word as text.
//   • zero punishment: wrong → Lumi patient/curious, correct stays available.
//   • 🆘 help button → speaks help_he (a gentle meaning hint, not a translation).
//
// Config (opts): { item, lumi, emoji, help_he, promptAudio, gestureMood,
//                  instructionHe, showInstruction, taskAudio, measured:false,
//                  celebrate, onResolve(result), onDone }
// The host owns any ingest via onResolve; this file never touches BKT.
// ============================================================
window.LumiChoice = (function () {
  'use strict';

  function emojiFor(emoji, img) { return emoji[img] || '❔'; }

  // Present one choice item. Returns nothing; calls opts.onResolve once, with
  // { firstCorrect } on the first committed selection (that is the measured one).
  function present(root, opts) {
    var item = opts.item;
    var lumi = opts.lumi;
    var emoji = opts.emoji || {};
    var options = item.options || [];
    var stage = { armed: null, measured: false, help: 0, resolved: false };

    root.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'choice';
    wrap.innerHTML =
      '<div class="choice-prompt">' +
        '<button class="prompt-replay" type="button" aria-label="שמעו שוב">' +
          '<span class="prompt-replay-ic">🔊</span>' +
        '</button>' +
        '<div class="choice-instr" hidden></div>' +
      '</div>' +
      '<div class="choice-cards"></div>' +
      '<button class="help-btn" type="button" aria-label="עזרה">🆘</button>';
    root.appendChild(wrap);

    var replayBtn = wrap.querySelector('.prompt-replay');
    var cardsEl   = wrap.querySelector('.choice-cards');
    var instrEl   = wrap.querySelector('.choice-instr');
    var helpBtn   = wrap.querySelector('.help-btn');

    // first-time-only procedural instruction (Hebrew, from the dictionary).
    if (opts.instructionHe && opts.showInstruction) {
      instrEl.hidden = false;
      instrEl.textContent = opts.instructionHe;
    }

    function playPrompt() {
      // full chunk (comprehend/function) or single word (recognize/discriminate).
      if (Array.isArray(opts.promptAudio)) return LumiAudio.sequence(opts.promptAudio);
      var p = LumiAudio.english(opts.promptAudio);
      if (opts.taskAudio) return p.then(function () { return LumiAudio.english(opts.taskAudio); });
      return p;
    }

    replayBtn.addEventListener('click', function () {
      if (lumi) lumi.setMood(opts.gestureMood || 'listen');
      playPrompt();
    });

    helpBtn.addEventListener('click', function () {
      // 🆘 = gentle Hebrew meaning-hint on demand. Not always-on, not a sentence
      // translation. Also nudges scaffolding one notch.
      if (opts.help_he) { if (lumi) lumi.say('<span class="bubble-hint">🆘</span>'); LumiAudio.hebrew(opts.help_he); }
      escalateHelp();
    });

    function buildCards() {
      cardsEl.innerHTML = '';
      options.forEach(function (opt, i) {
        var card = document.createElement('button');
        card.type = 'button';
        card.className = 'card';
        card.dataset.idx = String(i);
        card.dataset.correct = opt.correct ? '1' : '0';
        card.innerHTML = '<span class="card-emoji" aria-hidden="true">' +
          emojiFor(emoji, opt.img) + '</span>';
        // accessible label in Hebrew UI terms only ("picture"), never the English word.
        card.setAttribute('aria-label', 'תמונה ' + (i + 1));
        card.addEventListener('click', function () { onCardTap(i, card, opt); });
        cardsEl.appendChild(card);
      });
    }

    function clearArmed() {
      cardsEl.querySelectorAll('.card').forEach(function (c) { c.classList.remove('card--armed'); });
    }

    function onCardTap(idx, card, opt) {
      if (stage.resolved && !stage.retryOpen) return;

      // TWO-TAP:
      if (stage.armed !== idx) {
        // tap1 → play this picture's English audio (the img name). NOT measured.
        stage.armed = idx;
        clearArmed();
        card.classList.add('card--armed');
        LumiAudio.english(opt.img);
        return;
      }
      // tap2 on the same card → SELECT.
      commit(idx, card, opt);
    }

    function commit(idx, card, opt) {
      var isCorrect = !!opt.correct;

      if (!stage.measured) {
        // the FIRST committed selection is the measured one (two-tap contract).
        stage.measured = true;
        if (typeof opts.onResolve === 'function') {
          try { opts.onResolve({ firstCorrect: isCorrect }); } catch (e) {}
        }
      }

      if (isCorrect) {
        // celebrate — NO audio repeat after correct.
        stage.resolved = true; stage.retryOpen = false;
        card.classList.add('card--correct');
        clearArmed();
        cardsEl.querySelectorAll('.card').forEach(function (c) { c.disabled = true; });
        if (lumi) { lumi.setMood(opts.celebrate === 'hug' ? 'hug' : 'happy'); lumi.pulse(); }
        LumiFx.sparkle(card);
        setTimeout(function () {
          if (typeof opts.onDone === 'function') opts.onDone({ correct: true });
        }, 850);
      } else {
        // ZERO PUNISHMENT — patient Lumi, listen again, correct stays available.
        stage.retryOpen = true;
        stage.armed = null; clearArmed();
        if (lumi) lumi.setMood('dim');
        card.classList.add('card--soft'); // a soft dim, never red
        LumiAudio.english('Let’s listen again').then(playPrompt);
        setTimeout(function () { if (lumi) lumi.setMood(opts.gestureMood || 'listen'); }, 400);
        escalateHelp();
      }
    }

    // graded help: 1 replay → 2 gesture + drop a distractor → 3 point to correct.
    function escalateHelp() {
      stage.help++;
      if (stage.help >= 2) {
        // reduce to 2 options: dim one wrong card (keep correct + one distractor).
        var wrongs = Array.prototype.filter.call(cardsEl.querySelectorAll('.card'),
          function (c) { return c.dataset.correct === '0' && !c.classList.contains('card--faded'); });
        if (wrongs.length > 1) { wrongs[0].classList.add('card--faded'); wrongs[0].disabled = true; }
      }
      if (stage.help >= 3) {
        // demonstrate: Lumi points, correct card beckons.
        if (lumi) lumi.setMood('points');
        var correct = cardsEl.querySelector('.card[data-correct="1"]');
        if (correct) correct.classList.add('card--beckon');
      }
    }

    buildCards();
    // open: gesture + play the prompt once.
    if (lumi) lumi.setMood(opts.gestureMood || 'listen');
    setTimeout(playPrompt, 250);

    // ---- QA autoplay (?autoplay=1) — simulates a child two-tapping the correct
    //      card, so the full journey can be screenshot-verified. No effect on the
    //      real child loop (flag is off by default). ----
    if (window.LUMI_AUTOPLAY) {
      var ci = -1;
      options.forEach(function (o, i) { if (o.correct) ci = i; });
      if (ci >= 0) setTimeout(function () {
        var c = cardsEl.querySelector('.card[data-correct="1"]');
        if (!c) return;
        onCardTap(ci, c, options[ci]);                 // tap1 = listen
        setTimeout(function () { onCardTap(ci, c, options[ci]); }, 520); // tap2 = select
      }, 1100);
    }
  }

  return { present: present, emojiFor: emojiFor };
})();
