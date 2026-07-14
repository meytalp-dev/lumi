// _build-data.js — embeds the item bank into data.js so journey.html opens from file://
// Run from repo root:  node lumi/app/js/_build-data.js
// (Avnei-Yesod uses the same "embedded-data" trick; Lumi keeps its own, self-contained.)
const fs = require('fs');
const path = require('path');

const itemsDir = path.join(__dirname, '..', '..', 'items');
const items = JSON.parse(fs.readFileSync(path.join(itemsDir, 'animals.json'), 'utf8'));
// Additive topic banks (each self-contained; not duplicated in animals.json).
['t3-emotions.json', 't4-colors.json', 't5-numbers.json', 't6-actioninstruction.json', 't7-greetingsfriends.json', 't8-fruits.json', 't9-snacksmeal.json', 't10-face.json', 't11-body.json', 't12-family.json'].forEach((f) => {
  const p = path.join(itemsDir, f);
  if (fs.existsSync(p)) items.push.apply(items, JSON.parse(fs.readFileSync(p, 'utf8')));
});
const emoji = JSON.parse(fs.readFileSync(path.join(itemsDir, '_emoji.json'), 'utf8'));
const instructions = JSON.parse(fs.readFileSync(path.join(itemsDir, 'instructions-he.json'), 'utf8'));
// v2 §4: multi-representation glyphs per word (additive; does not touch item fields).
const repsRaw = JSON.parse(fs.readFileSync(path.join(itemsDir, '_reps.json'), 'utf8'));
const reps = {};
Object.keys(repsRaw).forEach((k) => { if (k[0] !== '_') reps[k] = repsRaw[k]; });

const banner =
  '// AUTO-GENERATED from lumi/items/*.json — do not edit by hand.\n' +
  '// Regenerate: node lumi/app/js/_build-data.js\n';
const body = 'window.LUMI_DATA = ' + JSON.stringify({ items, emoji, instructions, reps }) + ';\n';

fs.writeFileSync(path.join(__dirname, 'data.js'), banner + body);
console.log('data.js written:', items.length, 'items,', Object.keys(emoji).length, 'emoji,', Object.keys(reps).length, 'rep-sets');
