// ============================================================
// mechanics/produce.js — 🗣️ the SELF-LISTENING loop (v2 §6).
// "Lumi heard you!" alone is an empty celebration (a child can mumble anything).
// Instead we build a self-listening loop that develops the child's own ear:
//   1. Lumi says the word           (👂 target)
//   2. the child records            (🎤)
//   3. the child hears THEMSELVES   (🧒 — the point of the whole thing)
//   4. the child hears Lumi again   (🔆)
//   5. the child chooses "again" or "continue"
// Lumi reacts to the ATTEMPT, never to quality. NEVER scored, NEVER fed to BKT
// (records an engagement flag only). Speaking stays optional (skip always there).
// receptive-before-productive (learning-model §3).
// ============================================================
window.LumiProduce = (function () {
  'use strict';

  function present(root, opts) {
    var item = opts.item;
    var lumi = opts.lumi;
    var word = (item.target && item.target[0]) || '';
    var learnerId = opts.learnerId;
    var done = false, spoke = false;
    var rec = { recorder: null, chunks: [], url: null, stream: null };

    root.innerHTML = '';
    var wrap = document.createElement('div');
    wrap.className = 'produce';
    wrap.innerHTML =
      '<button class="prompt-replay produce-replay" type="button" aria-label="שמעו את לומי">' +
        '<span aria-hidden="true">👂</span></button>' +
      '<button class="mic-btn" type="button" aria-label="דברו">' +
        '<span class="mic-ic" aria-hidden="true">🎤</span><span class="mic-ring"></span></button>' +
      '<div class="produce-loop" hidden>' +
        '<button class="loop-btn loop-me" type="button" aria-label="שמעו את עצמכם">🧒</button>' +
        '<button class="loop-btn loop-lumi" type="button" aria-label="שמעו את לומי">🔆</button>' +
      '</div>' +
      '<div class="produce-actions" hidden>' +
        '<button class="again-btn" type="button">🎤 שׁוּב</button>' +
        '<button class="continue-btn" type="button">הַמְשִׁיכוּ ➜</button>' +
      '</div>' +
      '<button class="skip-btn" type="button">דַּלְּגוּ ➜</button>';
    root.appendChild(wrap);

    var replay   = wrap.querySelector('.produce-replay');
    var mic      = wrap.querySelector('.mic-btn');
    var loop     = wrap.querySelector('.produce-loop');
    var actions  = wrap.querySelector('.produce-actions');
    var loopMe   = wrap.querySelector('.loop-me');
    var loopLumi = wrap.querySelector('.loop-lumi');
    var againBtn = wrap.querySelector('.again-btn');
    var contBtn  = wrap.querySelector('.continue-btn');
    var skip     = wrap.querySelector('.skip-btn');

    function sayLumiWord() {
      if (lumi) lumi.setMood('lean');
      return LumiAudio.english(word);   // Lumi models the target word itself
    }
    replay.addEventListener('click', sayLumiWord);
    loopLumi.addEventListener('click', sayLumiWord);

    // ---- hear yourself ----
    function hearMyself() {
      if (rec.url) { try { var a = new Audio(rec.url); a.play(); return; } catch (e) {} }
      // no recording available (no mic / headless): a gentle non-lying beat — we
      // simply cannot replay, so nudge back to trying rather than faking audio.
      if (lumi) lumi.pulse();
    }
    loopMe.addEventListener('click', hearMyself);

    // ---- recording (best-effort; degrades gracefully with no mic) ----
    function startRecording() {
      if (lumi) { mic.classList.add('mic--live'); }
      var got = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
      if (!got) { setTimeout(function () { finishRecording(false); }, 1100); return; }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        rec.stream = stream;
        try {
          rec.recorder = new MediaRecorder(stream);
          rec.chunks = [];
          rec.recorder.ondataavailable = function (e) { if (e.data && e.data.size) rec.chunks.push(e.data); };
          rec.recorder.onstop = function () {
            try {
              var blob = new Blob(rec.chunks, { type: 'audio/webm' });
              if (rec.url) URL.revokeObjectURL(rec.url);
              rec.url = URL.createObjectURL(blob);
            } catch (e) {}
            stream.getTracks().forEach(function (t) { t.stop(); });
            finishRecording(true);
          };
          rec.recorder.start();
          setTimeout(function () { try { rec.recorder.stop(); } catch (e) { finishRecording(true); } }, 1600);
        } catch (e) { stream.getTracks().forEach(function (t) { t.stop(); }); finishRecording(false); }
      }).catch(function () { setTimeout(function () { finishRecording(false); }, 900); });
    }

    function finishRecording(hasAudio) {
      mic.classList.remove('mic--live');
      mic.classList.add('mic--heard');
      spoke = true;
      if (learnerId) { try { LumiBKT.recordProduction(learnerId, word, true); } catch (e) {} }
      // Lumi reacts to the ATTEMPT — warm, never a verdict.
      if (lumi) { lumi.setMood('hug'); lumi.pulse(); }
      LumiFx.sparkle(mic);
      LumiAudio.english(item.feedback_en || 'You tried! Listen…').then(function () {
        loop.hidden = false; actions.hidden = false; loopMe.disabled = !hasAudio;
        // walk the child through: hear yourself → hear Lumi.
        setTimeout(function () {
          hearMyself();
          setTimeout(sayLumiWord, hasAudio ? 1900 : 300);
        }, 250);
      });
    }

    mic.addEventListener('click', function () { if (!done) startRecording(); });

    againBtn.addEventListener('click', function () {
      loop.hidden = true; actions.hidden = true;
      mic.classList.remove('mic--heard');
      startRecording();
    });
    contBtn.addEventListener('click', function () { finish({ spoke: spoke }); });
    skip.addEventListener('click', function () { if (lumi) lumi.setMood('happy'); finish({ spoke: false, skipped: true }); });

    function finish(res) {
      if (done) return; done = true;
      try { if (rec.stream) rec.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      if (typeof opts.onDone === 'function') opts.onDone(res);
    }

    setTimeout(sayLumiWord, 260);

    // QA autoplay — run the loop end-to-end, then continue.
    if (window.LUMI_AUTOPLAY) setTimeout(function () {
      mic.click();
      setTimeout(function () { if (!done) contBtn.click(); }, 2600);
    }, 900);
  }

  return { present: present };
})();
