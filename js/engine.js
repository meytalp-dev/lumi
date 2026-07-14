// ============================================================
// engine.js — Lumi's game loop (v2 redirect). The spine that turns the item bank
// into an INTERLEAVED journey where the child ACTS IN THE WORLD and English is
// the tool that moves them forward — not a quiz that lights lanterns.
//
// v2 changes vs v1:
//   §2 INTERLEAVED flow — woven per-word mini-arcs + spacing + context-switching
//       (meet → small action → next word → spaced retrieval in a NEW context …),
//       replacing the old all-Meet → all-Recognize → … dimension blocks.
//   §3 THREE genuinely-different MEASURED mechanics: path-choice · light-beam ·
//       scene-hide (routed by "context"), each measurement-clean.
//   §4 MULTI-REPRESENTATION + MULTI-CONTEXT: path shows one representation, beam
//       shows another; the BKT gate needs success across ≥2 reps AND ≥2 contexts
//       before a word (lantern) is "mastered". Light distractor anti-leakage.
//   §5 Transparent grown-ups panel (evidence, not %); 3 KCs.
//   §7 Parent moments woven through (pre = intro, mid = card, end = summary).
//   §8 Finale = a gate of light / a piece of the map — the journey continues.
// ============================================================
window.LumiEngine = (function () {
  'use strict';

  // neutral objects used to relieve an over-used, not-yet-known animal distractor
  // (v2 §4 anti-leakage: don't keep testing an unmastered animal AS a distractor).
  var OBJECT_POOL = ['ball','apple','banana','car','sun','star','hat','cup','book','flower','bus','shoe','tree','moon'];
  var DISTRACTOR_CAP = 2;

  function unique(a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }); }

  function start(opts) {
    var data = window.LUMI_DATA || { items: [], emoji: {}, instructions: {}, reps: {} };
    var learnerId = opts.learnerId || 'local';
    var subtopic = opts.subtopic || 'pets';
    var stageEl = opts.stageRoot;
    var lumi = opts.lumi;
    var reps = data.reps || {};

    LumiBKT.beginSession(learnerId);

    var segItems = data.items.filter(function (it) {
      return it.topic === 'animals' && it.subtopic === subtopic;
    });
    var words = unique(segItems
      .filter(function (it) { return it.dimension === 'meet'; })
      .map(function (it) { return it.target[0]; }));

    var byDim = LumiResolve.index(segItems);

    var run = {
      seen: {}, shownInstr: {}, distractorCount: {},
      stats: { measured: 0, correct: 0, comp: 0, produced: 0, skipped: 0 },
    };

    var plan = assembleSession();
    var pi = 0;

    renderPath();
    flashPeek();
    next();
    return { restart: function () { start(opts); } };

    // ---------------------------------------------------------------
    // §2 + Meytal 13.7 — a SHORT session (~10 min / ~10–14 beats). Core learning
    // beats come from the budgeted, cross-session planner (resolve-practice); we
    // weave a parent moment, one comprehension, one self-listening produce, and
    // always end on the gate-of-light finale so the sitting feels complete.
    // Mastery accrues over several sittings (spaced practice) — not in one run.
    // ---------------------------------------------------------------
    function assembleSession() {
      var core = LumiResolve.sessionPlan(learnerId, words, byDim, { budget: 8, newPerSession: 3 });
      var plan = core.slice();
      var sessionWords = {};
      core.forEach(function (b) { if (b.word) sessionWords[b.word] = true; });

      // a woven mid parent moment
      if (plan.length >= 4) plan.splice(Math.floor(plan.length / 2), 0, { t: 'parent', kind: 'mid' });
      // one comprehension (secondary KC) for a word in this sitting
      var compWord = words.filter(function (w) { return sessionWords[w] && (byDim.comprehend || {})[w]; })[0];
      if (compWord) plan.push({ t: 'comprehend', word: compWord });
      // one self-listening produce (engagement, unmeasured)
      var prodWord = words.filter(function (w) { return sessionWords[w] && (byDim.produce || {})[w]; })[0];
      if (prodWord) plan.push({ t: 'produce', word: prodWord });
      // the sitting always ends on a satisfying gate-of-light beat
      plan.push({ t: 'finale' });
      return plan;
    }

    // ---------------------------------------------------------------
    // instruction (first-time-only Hebrew procedural line)
    // ---------------------------------------------------------------
    function instrFor(item) {
      var key = (item.prompt && item.prompt.instruction_key) || item.task_key;
      if (!key) return { he: null, show: false };
      var he = (data.instructions[key] && data.instructions[key].he) || null;
      var show = !run.shownInstr[key];
      run.shownInstr[key] = true;
      return { he: he, show: show };
    }

    // §4 — representation for the correct option, chosen by context so path & beam
    // show DIFFERENT representations (guaranteeing rep-variety for the gate).
    function repFor(word, context) {
      var set = reps[word] || [];
      if (!set.length) return { glyph: (data.emoji[word] || '❔'), type: 'default', _new: false };
      var idx = context === 'beam' ? 1 : (context === 'careful' ? (set[2] ? 2 : 1) : 0); // path=0, beam=1, careful=2/1
      var r = set[idx] || set[0];
      var covered = LumiBKT.getWord(learnerId, word).repTypes || [];
      return { glyph: r.glyph, type: r.type, scale: r.scale || 1, _new: covered.indexOf(r.type) === -1 };
    }

    // §4 — light anti-leakage: relieve an unmastered animal that has appeared as a
    // distractor too many times (swap it for a neutral object). Never touches the
    // correct option; keeps 3 options.
    function sanitize(item) {
      var used = (item.options || []).map(function (o) { return o.img; });
      var out = (item.options || []).map(function (o) {
        if (o.correct) return { img: o.img, correct: true };
        run.distractorCount[o.img] = (run.distractorCount[o.img] || 0) + 1;
        var isAnimal = !!reps[o.img];
        var overused = run.distractorCount[o.img] > DISTRACTOR_CAP;
        if (isAnimal && overused && !LumiBKT.isMastered(learnerId, o.img)) {
          var swap = OBJECT_POOL.filter(function (g) { return used.indexOf(g) === -1; })[0];
          if (swap) { used.push(swap); return { img: swap, correct: false, _swapped: true }; }
        }
        return { img: o.img, correct: false };
      });
      return Object.assign({}, item, { options: out });
    }

    // ---------------------------------------------------------------
    // the ONE measured ingest — feeds BKT with rep/context/help evidence
    // ---------------------------------------------------------------
    function onMeasured(beat, rep, payload, isDiscriminate) {
      run.stats.measured++;
      if (payload.firstCorrect) run.stats.correct++;
      var dim = beat.context === 'comprehend' ? 'scene' : beat.context; // 'path'|'beam'|'scene'
      var res = LumiBKT.ingest({
        learnerId: learnerId,
        word: beat.word,
        dimension: dim,
        kc_comprehension: beat.context === 'comprehend',
        is_correct: payload.firstCorrect,
        repType: rep.type,
        context: beat.context,
        usedHelp: !!payload.usedHelp,
        newImage: !!rep._new,
        isDiscriminate: !!isDiscriminate,   // 🔒 only a REAL discriminate item can complete the gate
      });
      if (beat.context === 'comprehend') run.stats.comp++;
      if (res) { renderPath(); flashPeek(); }
    }

    // ---------------------------------------------------------------
    // the beat runner
    // ---------------------------------------------------------------
    function next() {
      if (lumi) lumi.say('');
      if (pi >= plan.length) return finale();
      var beat = plan[pi++];

      if (beat.t === 'meet') return runMeet(beat);
      if (beat.t === 'measure') return runMeasure(beat);
      if (beat.t === 'comprehend') return runComprehend(beat);
      if (beat.t === 'function') return runFunction(beat);
      if (beat.t === 'produce') return runProduce(beat);
      if (beat.t === 'parent') return runParent(beat);
      if (beat.t === 'finale') return finale();
      return next();
    }

    function runMeet(beat) {
      var meetItem = (byDim.meet[beat.word] || [])[0];
      setHeader('meet', beat.word);
      return LumiMeet.present(stageEl, {
        item: meetItem, lumi: lumi, emoji: data.emoji, learnerId: learnerId,
        onDone: function () { renderPath(); next(); },
      });
    }

    function runMeasure(beat) {
      var item = LumiResolve.pickForContext(byDim, beat.word, beat.context, run.seen);
      if (!item) return next();
      run.seen[item.id] = true;
      var isDisc = item.dimension === 'discriminate';   // only the 'careful' beat serves the confusable-pair item
      item = sanitize(item);
      var rep = repFor(beat.word, beat.context);
      var ins = instrFor(item);
      // path → PathChoice; beam & careful (careful listen) → LightBeam.
      // World flag (opt-in, §18): in Lantern Grove the 'path' recognize context is
      // rendered by LumiLanternGrove instead of PathChoice — same LumiMeasured
      // contract, lantern skin. PathChoice/LightBeam are untouched otherwise.
      var beamOrCareful = (beat.context === 'beam' || beat.context === 'careful');
      var Mech = beamOrCareful ? LumiLightBeam
        : (window.LUMI_WORLD === 'lantern-grove' && window.LumiLanternGrove) ? LumiLanternGrove
        : LumiPathChoice;
      setHeader(beat.context, beat.word);
      return Mech.present(stageEl, {
        item: item, lumi: lumi, emoji: data.emoji, reps: reps, targetRep: rep,
        instructionHe: ins.he, showInstruction: ins.show,
        onMeasured: function (payload) { onMeasured(beat, rep, payload, isDisc); },
        onDone: function () { next(); },
      });
    }

    function runComprehend(beat) {
      var item = LumiResolve.pickForContext(byDim, beat.word, 'comprehend', run.seen);
      if (!item) return next();
      run.seen[item.id] = true;
      item = sanitize(item);
      var rep = repFor(beat.word, 'comprehend');
      var ins = instrFor(item);
      setHeader('comprehend', beat.word);
      return LumiSceneHide.present(stageEl, {
        item: item, lumi: lumi, emoji: data.emoji, reps: reps, targetRep: rep,
        instructionHe: ins.he, showInstruction: ins.show,
        onMeasured: function (payload) { onMeasured(beat, rep, payload); },
        onDone: function () { next(); },
      });
    }

    function runFunction(beat) {
      var fi = (byDim['function'][beat.word] || [])[0];
      if (!fi) return next();
      var ins = instrFor(fi);
      setHeader('function', beat.word);
      return LumiFunction.present(stageEl, {
        item: fi, lumi: lumi, emoji: data.emoji,
        instructionHe: ins.he, showInstruction: ins.show,
        onEngagement: function () {},   // engagement only — never BKT
        onDone: function () { next(); },
      });
    }

    function runProduce(beat) {
      var pItem = (byDim.produce[beat.word] || [])[0];
      if (!pItem) return next();
      setHeader('produce', beat.word);
      return LumiProduce.present(stageEl, {
        item: pItem, lumi: lumi, emoji: data.emoji, learnerId: learnerId,
        onDone: function (r) { if (r && r.spoke) run.stats.produced++; if (r && r.skipped) run.stats.skipped++; next(); },
      });
    }

    // §7 — a woven mid-journey parent moment (concrete, non-judgmental, ~a beat).
    function runParent(beat) {
      setHeader('', '');
      if (lumi) lumi.setMood('glow');
      stageEl.innerHTML =
        '<div class="parent-moment" lang="he">' +
          '<div class="pm-badge">רֶגַע לַהוֹרֶה</div>' +
          '<p class="pm-body">בַּדֶּרֶךְ לַמִּטְבָּח שַׁאֲלוּ: <b lang="en">Where is the dog?</b> ' +
          'אֶפְשָׁר לְהַצְבִּיעַ עַל צַעֲצוּעַ אוֹ תְּמוּנָה. אֵין צֹרֶךְ לְתַרְגֵּם.</p>' +
          '<button class="btn-big pm-go" type="button">הַמְשִׁיכוּ ➜</button>' +
        '</div>';
      var go = stageEl.querySelector('.pm-go');
      if (go) go.addEventListener('click', next);
      if (window.LUMI_AUTOPLAY) setTimeout(next, 1200);
    }

    // ---------------------------------------------------------------
    // header + lantern path + transparent peek
    // ---------------------------------------------------------------
    function setHeader(kind, word) {
      if (!opts.headerRoot) return;
      var labels = {
        meet: 'פְּגִישָׁה', path: 'הַקְשָׁבָה', beam: 'חִפּוּשׂ בְּאוֹר', careful: 'הַקְשָׁבָה מְדֻיֶּקֶת',
        comprehend: 'הֲבָנָה', 'function': 'שִׂיחָה', produce: 'אֲמִירָה',
      };
      opts.headerRoot.textContent = labels[kind] || 'מַסָּע';
    }

    function renderPath() {
      var pathEl = opts.pathRoot;
      if (!pathEl) return;
      pathEl.innerHTML = '';
      words.forEach(function (w, i) {
        var lvl = LumiBKT.hasMet(learnerId, w) ? LumiBKT.wordLevel(LumiBKT.getWord(learnerId, w)) : 'unmet';
        var node = document.createElement('div');
        node.className = 'lantern lantern--' + lvl;
        node.style.setProperty('--i', i);
        node.innerHTML =
          '<span class="lantern-flame"></span>' +
          '<span class="lantern-emoji" aria-hidden="true">' + (data.emoji[w] || '•') + '</span>';
        pathEl.appendChild(node);
      });
    }

    // §5 — grown-ups see EVIDENCE, never a percentage.
    function flashPeek() {
      if (!opts.peekRoot) return;
      var snap = LumiBKT.snapshot(learnerId);
      function chip(on, glyph, title) {
        return '<span class="ev ' + (on ? 'on' : 'off') + '" title="' + title + '">' + glyph + '</span>';
      }
      var rows = words.map(function (w) {
        var wd = snap.words[w] || {};
        var cd = snap.comp[w] || {};
        var lit = wd.masteredAt ? '<span class="pw-lit" title="נדלק">🏮</span>' : '';
        return '<div class="peek-word">' +
          '<span class="pw-emoji">' + (data.emoji[w] || '•') + '</span>' +
          chip(wd.firstSuccess, '🎯', 'הצלחה ראשונה') +
          chip(wd.successNoHelp, '🙌', 'בלי עזרה') +
          chip(wd.successNewImage, '🖼️', 'בתמונה חדשה') +
          chip(wd.discriminateSuccess, '🎧', 'הבחין בין דומים (הכרחי לפנס)') +
          chip(cd.successInSentence, '💬', 'בתוך משפט') +
          chip(wd.successNextSession, '🔁', 'במפגש הבא') +
          '<span class="pw-ctx" title="הקשרים">' + ((wd.contexts || []).length) + '</span>' +
          lit +
        '</div>';
      }).join('');
      opts.peekRoot.innerHTML =
        '<div class="peek-legend">🎯 ראשונה · 🙌 בלי עזרה · 🖼️ תמונה חדשה · 🎧 הבחנה · 💬 במשפט · 🔁 מפגש הבא</div>' +
        rows +
        '<div class="peek-foot">המספרים (BKT) נשארים מאחורי הקלעים. פנס נדלק רק אחרי ' + LumiBKT.MIN_REPTYPES +
          ' ייצוגים, ' + LumiBKT.MIN_CONTEXTS + ' הקשרים, <b>וגם</b> הצלחה אמיתית בהבחנה בין־דומים 🎧.</div>';
    }

    // ---------------------------------------------------------------
    // §8 — finale: a gate of light opens; the journey continues.
    // ---------------------------------------------------------------
    function finale() {
      setHeader('', '');
      if (lumi) { lumi.setMood('glow'); lumi.pulse(); }

      var independent = words.filter(function (w) {
        var wd = LumiBKT.getWord(learnerId, w); return wd.masteredAt || (wd.firstSuccess && wd.successNoHelp);
      });
      var leaning = words.filter(function (w) { return independent.indexOf(w) === -1 && LumiBKT.hasMet(learnerId, w); });

      stageEl.innerHTML =
        '<div class="finale">' +
          '<div class="finale-glow"></div>' +
          '<div class="finale-gate" aria-hidden="true">🌟</div>' +
          '<div class="finale-lanterns"></div>' +
          '<div class="finale-tagline" lang="he">שַׁעַר שֶׁל אוֹר נִפְתַּח — הַמַּסָּע נִמְשָׁךְ</div>' +
          '<div class="finale-map" lang="he">אָסַפְנוּ חֵלֶק מֵהַמַּפָּה ✦ עוֹד עוֹלָם מְחַכֶּה</div>' +
          '<div class="finale-parent" lang="he">' +
            '<strong>רֶגַע לַהוֹרֶה:</strong> <span class="finale-parent-body"></span>' +
          '</div>' +
          '<button class="finale-again" type="button">שׁוּב ➜</button>' +
        '</div>';

      var lanternWrap = stageEl.querySelector('.finale-lanterns');
      words.forEach(function (w, i) {
        var lvl = LumiBKT.wordLevel(LumiBKT.getWord(learnerId, w));
        var n = document.createElement('div');
        n.className = 'lantern lantern--' + (lvl === 'off' ? 'dim' : lvl) + ' finale-lantern';
        n.style.setProperty('--i', i);
        n.innerHTML = '<span class="lantern-flame"></span><span class="lantern-emoji">' + (data.emoji[w] || '•') + '</span>';
        lanternWrap.appendChild(n);
      });

      // concrete, non-judgmental (v2 §7). English animal-names are fine in the
      // GROWN-UP summary (the parent mediates); the child sees only Hebrew/visual.
      var body = '';
      if (independent.length) body += 'זִהָה עַצְמָאִית: <b lang="en">' + independent.join(', ') + '</b>. ';
      if (leaning.length) body += 'עֲדַיִן נֶעֱזָר בְּהַשְׁמָעָה: <b lang="en">' + leaning.join(', ') + '</b>. ';
      body += 'שַׂחֲקוּ מָחָר: אִמְרוּ <b lang="en">' + (words[0] || 'dog') + '</b> וּבַקְּשׁוּ לְהַצְבִּיעַ.';
      stageEl.querySelector('.finale-parent-body').innerHTML = body;

      LumiAudio.english('A gate of light! The journey goes on.');
      renderPath(); flashPeek();

      // "again" = a NEW sitting that CONTINUES progress (does not wipe state);
      // lanterns still in-progress resume and can light on a later session.
      var again = stageEl.querySelector('.finale-again');
      if (again) again.addEventListener('click', function () { start(opts); });
      if (typeof opts.onFinale === 'function') opts.onFinale(run.stats);
    }
  }

  return { start: start };
})();

// ---- tiny FX shared by mechanics (sparkle bloom on a lit moment) ----
window.LumiFx = (function () {
  'use strict';
  function sparkle(anchor) {
    if (!anchor || !anchor.getBoundingClientRect) return;
    var r = anchor.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (var i = 0; i < 10; i++) {
      var s = document.createElement('span');
      s.className = 'spark';
      var ang = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
      var dist = 40 + Math.random() * 40;
      s.style.left = cx + 'px'; s.style.top = cy + 'px';
      s.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      s.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
      document.body.appendChild(s);
      (function (el) { setTimeout(function () { el.remove(); }, 750); })(s);
    }
  }
  return { sparkle: sparkle };
})();
