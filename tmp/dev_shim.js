/* Tymczasowy adapter: nowe API rysunków (drawSpecies(id, mode)) na starym art.js + data.js. */
const OLD = Object.fromEntries(OLDART.RAW.map(r => [r[0], { a: r[3], o: r[4] }]));
const { drawEgg, drawEggCracked, ARCH_LIST } = OLDART;
const drawSpecies = (id, mode) => { const s = SPECIES.find(x => x.id === id); const o = OLD[s && s.legacy.opus] || { a: 'thero', o: {} };
  return OLDART.drawSpecies(o, mode === 'ghost' ? 'ghost' : 'full'); };
const drawCustom = (arch, opts, mode) => OLDART.drawSpecies({ a: arch, o: opts }, mode === 'ghost' ? 'ghost' : 'full');
