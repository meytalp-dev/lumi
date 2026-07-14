// ============================================================
// lumi-character.js — Lumi, the small GLOWING grove-creature. Renders the REAL
// illustrated character (assets/character/lumi/lumi-*.png, transparent PNG) so
// Lumi looks identical everywhere — the lantern-grove pilot AND every minigame /
// the journey — instead of a schematic SVG placeholder.
//
// Meaning through gesture (comprehensible input, learning-model §2) via mood art:
//   listen  → lumi-listening   (recognize / discriminate — "listen")
//   points  → lumi-pointing    (comprehend / find-it — "where?")
//   lean    → lumi-curious     (produce invitation)
//   hug/glow→ lumi-celebrate   (celebration / a lantern lit)
//   dim     → lumi-try-again   (drifted, patient "let's listen again")
//   happy   → lumi-happy   ·   idle → lumi-idle
//
// API unchanged: LumiCharacter.mount(el) → { setMood(name), say(html), pulse() }.
// Self-contained: injects its own stylesheet once, so it needs no page CSS. Paths
// are relative to the page (all callers live in lumi/app/), matching the minigames.
// ============================================================
window.LumiCharacter = (function () {
  'use strict';

  var BASE = 'assets/character/lumi/';
  // code mood  →  real portrait file (the 7 illustrated moods we have)
  var MOOD_SRC = {
    idle: 'lumi-idle', listen: 'lumi-listening', points: 'lumi-pointing',
    lean: 'lumi-curious', hug: 'lumi-celebrate', glow: 'lumi-celebrate',
    dim: 'lumi-try-again', happy: 'lumi-happy'
  };
  var MOODS = Object.keys(MOOD_SRC);

  function injectCSS() {
    if (document.getElementById('lumi-character-css')) return;
    var rules = [
      '.lumi-stage { position: relative; }',
      // the portrait fills whatever box the page gives .lumi-stage (contain → no crop)
      '.lumi-stage .lc-figure { width: 100%; height: 100%; background: center / contain no-repeat;',
      '  transition: transform .28s var(--ease, cubic-bezier(.34,1.3,.5,1)); transform-origin: 50% 88%; }',
      // soft aura so Lumi glows like a grove-creature, on any background
      '.lumi-stage .lc-glow { position: absolute; z-index: -1; inset: 14% 4% 4%; border-radius: 50%;',
      '  background: radial-gradient(circle, var(--lumi-aura, rgba(255,210,120,.55)), rgba(255,210,120,0) 70%);',
      '  filter: blur(5px); opacity: .55; animation: lumiBreathe 3.8s ease-in-out infinite; }',
      '@keyframes lumiBreathe { 0%,100% { transform: scale(1); opacity: .5; } 50% { transform: scale(1.08); opacity: .72; } }'
    ];
    // per-mood portrait
    MOODS.forEach(function (m) {
      rules.push('.lumi-stage[data-mood="' + m + '"] .lc-figure { background-image: url(' + BASE + MOOD_SRC[m] + '.png); }');
    });
    // gentle mood body-language (on the figure, so a page-level float on .lumi-stage still runs)
    rules.push('.lumi-stage[data-mood="listen"] .lc-figure { transform: rotate(-3deg); }');
    rules.push('.lumi-stage[data-mood="points"] .lc-figure { transform: translateX(-4%) scale(1.03); }');
    rules.push('.lumi-stage[data-mood="lean"]   .lc-figure { transform: rotate(4deg) translateY(-2%); }');
    rules.push('.lumi-stage[data-mood="dim"]    .lc-figure { filter: saturate(.75) brightness(.92); }');
    rules.push('.lumi-stage[data-mood="dim"]    .lc-glow { opacity: .25; }');
    rules.push('.lumi-stage[data-mood="happy"]  .lc-glow, .lumi-stage[data-mood="hug"] .lc-glow, .lumi-stage[data-mood="glow"] .lc-glow { opacity: .85; }');
    rules.push('.lumi-stage.lumi-pulse .lc-figure { animation: lumiJoy .62s var(--ease, cubic-bezier(.34,1.3,.5,1)); }');
    rules.push('@keyframes lumiJoy { 0% { transform: scale(1); } 40% { transform: scale(1.12) rotate(-2deg); } 100% { transform: scale(1); } }');
    // legacy: any leftover inline SVG from old markup stays hidden
    rules.push('.lumi-stage .lumi-svg { display: none; }');

    var st = document.createElement('style');
    st.id = 'lumi-character-css';
    st.textContent = rules.join('\n');
    document.head.appendChild(st);
  }

  function mount(el) {
    injectCSS();
    el.classList.add('lumi');
    el.innerHTML =
      '<div class="lumi-stage" data-mood="idle">' +
        '<div class="lc-glow"></div>' +
        '<div class="lc-figure"></div>' +
      '</div>' +
      '<div class="lumi-bubble" hidden></div>';
    var stage  = el.querySelector('.lumi-stage');
    var bubble = el.querySelector('.lumi-bubble');

    function setMood(name) {
      if (!MOOD_SRC[name]) name = 'idle';
      stage.setAttribute('data-mood', name);
    }

    // say — bubble content is HTML (gesture glyphs / Hebrew procedural UI only).
    // NEVER English word-text in the child loop. Pass '' to hide.
    function say(html) {
      if (!html) { bubble.hidden = true; bubble.innerHTML = ''; return; }
      bubble.hidden = false;
      bubble.innerHTML = html;
    }

    // pulse — a quick celebratory bloom (a lantern lit / correct answer).
    function pulse() {
      stage.classList.remove('lumi-pulse');
      void stage.offsetWidth;   // restart the animation
      stage.classList.add('lumi-pulse');
    }

    return { setMood: setMood, say: say, pulse: pulse, el: el };
  }

  return { mount: mount, MOODS: MOODS };
})();
