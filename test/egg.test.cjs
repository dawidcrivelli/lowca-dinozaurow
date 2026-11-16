// Egg SVG must never carry negative radii (browser rejects them: "attribute rx: A negative value is not valid").
const test = require('node:test'), assert = require('node:assert');
const { drawEgg, drawEggCracked } = require('../js/art.js');

const SEEDS = ['progress', 'brand', ...Array.from({ length: 300 }, (_, i) => 'sp' + i)];
const radii = svg => [...svg.matchAll(/\br[xy]?="(-?[\d.]+)"/g)].map(m => +m[1]);

test('egg radii are positive', () => {
  for (const s of SEEDS) for (let r = 1; r <= 4; r++)
    for (const svg of [drawEgg(r, s), drawEggCracked(r, s)]) assert.ok(radii(svg).every(v => v > 0), `${s} r=${r}`);
});
