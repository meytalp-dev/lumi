// ============================================================
// scene.js — reusable sunset-landscape backdrops (pure SVG, file://-safe) and
// small scene helpers shared by every mechanic. No external images.
// Two backdrops:
//   backdropPath()  — winding path toward a glowing home (grove / meet / wind / gift / produce)
//   backdropScene() — a richer world with a tree, bushes, home (hide & seek)
// Helpers: motes(), speakerSVG(), rewardBurst(), homeGlow tweaks.
// ============================================================
window.LumiScene = (function () {
  'use strict';

  // shared sky/hills/sun defs + a cozy home on the horizon.
  function skyAndHills() {
    return (
      '<defs>' +
        '<radialGradient id="sunGlow" cx="50%" cy="86%" r="60%">' +
          '<stop offset="0%" stop-color="#fff2c4"/><stop offset="35%" stop-color="#ffcf7a"/>' +
          '<stop offset="70%" stop-color="#f0955a" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#6b5680"/><stop offset="100%" stop-color="#584a72"/></linearGradient>' +
        '<linearGradient id="hillMid" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#b5637a"/><stop offset="100%" stop-color="#8a4f6e"/></linearGradient>' +
        '<linearGradient id="hillNear" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0%" stop-color="#5e8f72"/><stop offset="100%" stop-color="#3f6d55"/></linearGradient>' +
      '</defs>' +
      '<ellipse cx="400" cy="470" rx="520" ry="360" fill="url(#sunGlow)"/>' +
      '<circle cx="400" cy="452" r="66" fill="#fff0be" opacity="0.85"/>' +
      '<path d="M0,360 Q200,300 400,352 T800,336 V600 H0 Z" fill="url(#hillFar)"/>' +
      '<path d="M0,430 Q160,372 360,420 T800,408 V600 H0 Z" fill="url(#hillMid)" opacity="0.96"/>'
    );
  }

  // a small cottage with a warm glowing window, sitting at (cx,cy).
  function home(cx, cy, s) {
    s = s || 1;
    var w = 54 * s, h = 40 * s;
    return (
      '<g transform="translate(' + cx + ',' + cy + ')">' +
        '<rect x="' + (-w/2) + '" y="' + (-h/2) + '" width="' + w + '" height="' + h + '" rx="4" fill="#4a3a5c"/>' +
        '<path d="M' + (-w/2-6) + ',' + (-h/2) + ' L0,' + (-h/2-26*s) + ' L' + (w/2+6) + ',' + (-h/2) + ' Z" fill="#3a2c50"/>' +
        '<rect x="' + (-9*s) + '" y="' + (-6*s) + '" width="' + (18*s) + '" height="' + (18*s) + '" rx="2" fill="#ffd98a">' +
          '<animate attributeName="opacity" values="0.75;1;0.75" dur="3s" repeatCount="indefinite"/></rect>' +
        '<circle cx="0" cy="' + (2*s) + '" r="' + (40*s) + '" fill="#ffd98a" opacity="0.16"/>' +
      '</g>'
    );
  }

  function backdropPath() {
    var el = document.createElement('div');
    el.className = 'scene-bg';
    el.innerHTML =
      '<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
        skyAndHills() +
        // winding lantern path leading to the home
        '<path d="M400,600 Q470,520 430,470 Q390,420 470,388 Q540,362 560,360" ' +
          'fill="none" stroke="#f6c98a" stroke-width="30" stroke-linecap="round" opacity="0.5"/>' +
        '<path d="M400,600 Q470,520 430,470 Q390,420 470,388 Q540,362 560,360" ' +
          'fill="none" stroke="#fff0c8" stroke-width="10" stroke-linecap="round" opacity="0.6" stroke-dasharray="2 26"/>' +
        '<path d="M0,452 Q220,398 460,440 T800,430 V600 H0 Z" fill="url(#hillNear)"/>' +
        home(560, 352, 1.1) +
      '</svg>';
    return el;
  }

  function backdropScene() {
    var el = document.createElement('div');
    el.className = 'scene-bg';
    el.innerHTML =
      '<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
        skyAndHills() +
        '<path d="M0,452 Q220,398 460,440 T800,430 V600 H0 Z" fill="url(#hillNear)"/>' +
        // path
        '<path d="M420,600 Q380,520 430,470 Q480,430 470,392" fill="none" stroke="#f6c98a" stroke-width="30" stroke-linecap="round" opacity="0.45"/>' +
        // home upper-right
        home(650, 372, 1.0) +
        // big tree left
        '<g transform="translate(150,470)">' +
          '<rect x="-12" y="-70" width="24" height="90" rx="8" fill="#5a4636"/>' +
          '<circle cx="0" cy="-90" r="72" fill="#4f7d5e"/>' +
          '<circle cx="-46" cy="-64" r="46" fill="#5e8f72"/>' +
          '<circle cx="44" cy="-66" r="50" fill="#456b53"/>' +
        '</g>' +
        // bushes
        '<g transform="translate(430,520)"><ellipse cx="0" cy="0" rx="72" ry="40" fill="#3f6d55"/>' +
          '<ellipse cx="-40" cy="6" rx="40" ry="26" fill="#4f7d5e"/><ellipse cx="42" cy="8" rx="42" ry="26" fill="#38614a"/></g>' +
        '<g transform="translate(720,540)"><ellipse cx="0" cy="0" rx="64" ry="36" fill="#3f6d55"/></g>' +
      '</svg>';
    return el;
  }

  // floating warm light motes
  function motes(n) {
    n = n || 10;
    var d = document.createElement('div'); d.className = 'motes';
    for (var i = 0; i < n; i++) {
      var m = document.createElement('span'); m.className = 'mote';
      m.style.left = Math.round(Math.random() * 100) + '%';
      m.style.top = Math.round(20 + Math.random() * 70) + '%';
      m.style.setProperty('--md', (7 + Math.random() * 6).toFixed(1) + 's');
      m.style.setProperty('--mx', (Math.random() * 30 - 15).toFixed(0) + 'px');
      m.style.setProperty('--my', (-15 - Math.random() * 25).toFixed(0) + 'px');
      m.style.animationDelay = (Math.random() * 5).toFixed(1) + 's';
      d.appendChild(m);
    }
    return d;
  }

  var SPEAKER_SVG =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M11 5L6 9H3v6h3l5 4V5z" fill="currentColor"/>' +
      '<path d="M15.5 8.5a4 4 0 0 1 0 7M18 6a7 7 0 0 1 0 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
    '</svg>';

  // reward burst of little stars from a screen point (cx,cy in px).
  function rewardBurst(cx, cy, glyphs) {
    glyphs = glyphs || ['✨', '⭐', '🌟', '✨', '💫'];
    for (var i = 0; i < 12; i++) {
      var s = document.createElement('span');
      s.className = 'burst-star';
      s.textContent = glyphs[i % glyphs.length];
      var ang = (Math.PI * 2 * i) / 12 + Math.random() * 0.4;
      var dist = 60 + Math.random() * 70;
      s.style.left = cx + 'px'; s.style.top = cy + 'px';
      s.style.setProperty('--bx', Math.cos(ang) * dist + 'px');
      s.style.setProperty('--by', Math.sin(ang) * dist + 'px');
      s.style.setProperty('--br', Math.round(Math.random() * 80 - 40) + 'deg');
      document.body.appendChild(s);
      (function (el) { setTimeout(function () { el.remove(); }, 820); })(s);
    }
  }

  function centerOf(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  return {
    backdropPath: backdropPath,
    backdropScene: backdropScene,
    motes: motes,
    home: home,
    SPEAKER_SVG: SPEAKER_SVG,
    rewardBurst: rewardBurst,
    centerOf: centerOf,
  };
})();
