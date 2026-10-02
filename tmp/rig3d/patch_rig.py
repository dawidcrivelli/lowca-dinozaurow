p = 'js/rig3d.js'; s = open(p).read()
def rep(a, b):
    global s
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)
rep("""    let g = 0, look = null, kx = 1, offX = 0, lastBlink = 0, gap = GAP0;
    const move = s => moves[c.alias?.[s] || s] || moves.bite || Object.values(moves)[0];
    const add = (A, t, k = 1) => { for (const n in A.ch) ch[n] += curve(A, n, t) * k; };""",
"""    let g = 0, look = null, kx = 1, offX = 0, pk = null, pt = 0, fresh = false, side = 1, gap = GAP0;
    const move = s => moves[c.alias?.[s] || s] || moves.bite || Object.values(moves)[0];
    /* wariant ruchu V = { s, L, A, m: strona ±1, k: amplituda, ms }: losowy z listy L, rozrzut ±JIT; self.fv / fm wymuszają wariant i stronę (podgląd) */
    const cur = {}, re = {}, KO = { A: REAC.ko[0], m: 1, k: 1 };
    const roll = (V, L, s, v = self.fv) => { const r = v == null, j = () => r ? 1 + (Math.random() * 2 - 1) * JIT : 1, A = L[r ? Math.random() * L.length | 0 : Math.min(v, L.length - 1)];
      return Object.assign(V, { s, L, A, m: r ? (Math.random() < .5 ? -1 : 1) : self.fm, k: j(), ms: Math.min(MS_MAX, Math.round(A.ms * j())) }); };
    const lunge = s => cur.s === s ? cur : roll(cur, move(s), s);
    const cv = (V, n, t) => curve(V.A, n, t) * (MIR.has(n) ? V.m : 1) * (FIX.has(n) ? 1 : V.k);
    const add = (V, t) => { for (const n in V.A.ch) ch[n] += cv(V, n, t); };""")
rep("""        const kick = !L.front && L.side > 0 ? ch.kk : 0, stomp = L.side > 0 && L.front === c.legs.some(o => o.front) ? ch.st : 0, paw = L.front && L.side > 0 ? ch.ar : 0;""",
"""        const kick = !L.front && L.side === side ? ch.kk : 0, stomp = L.side === side && L.front === c.legs.some(o => o.front) ? ch.st : 0, paw = L.front && L.side === side ? ch.ar : 0;""")
rep("""      half, ms: s => move(s).ms, hitAt: s => move(s).hit,
      root(k, s, t) { const A = move(s); R.fwd = curve(A, 'fwd', t) * (STAY.has(s) ? 1 : reach()); R.up = curve(A, 'up', t); R.pitch = curve(A, 'pit', t); R.yaw = curve(A, 'yaw', t); return R; },""",
"""      half, fv: null, fm: 1,
      ms(s) { fresh = true; return roll(cur, move(s), s).ms; }, hitAt: s => lunge(s).A.hit,   // ms() = początek wypadu: losuje wariant
      root(k, s, t) { const V = lunge(s); R.fwd = curve(V.A, 'fwd', t) * (STAY.has(s) ? 1 : reach()); R.up = cv(V, 'up', t); R.pitch = cv(V, 'pit', t); R.yaw = cv(V, 'yaw', t); return R; },""")
rep("""        const { k, t, tm, dt } = st, A = k === 'lunge' ? move(st.style) : k === 'hit' ? RX[GRP[st.style]] || REAC.hit : k && REAC[k];
        if (k !== 'lunge' && st.gap) gap = st.gap;
        for (const n in ch) ch[n] = 0;
        if (A) add(A, t);
        if (st.ko && !A) add(REAC.ko, 1);""",
"""        const { k, t, tm, dt } = st, L = k === 'hit' ? RX[GRP[st.style]] || REAC.hit : k !== 'lunge' && REAC[k], nw = k !== pk || t < pt, t0 = nw ? -1 : pt;
        if (nw && k === 'lunge' && !fresh) roll(cur, move(st.style), st.style);   // nowa animacja: wariant (wypad bez ms() / reakcja)
        if (L && (nw || re.L !== L)) roll(re, L, k);
        if (nw) fresh = false; pk = k; pt = t;
        const V = k === 'lunge' ? lunge(st.style) : L ? re : null, A = V?.A;
        side = k === 'lunge' ? cur.m : 1;
        if (k !== 'lunge' && st.gap) gap = st.gap;
        for (const n in ch) ch[n] = 0;
        if (A) add(V, t);
        if (st.ko && !A) add(KO, 1);""")
rep("""tw = (A ? curve(A, 'tw', t - i * .035) : 0)""", """tw = (A ? cv(V, 'tw', t - i * .035) : 0)""")
rep("""        c.arms.forEach(a => { const r = ch.ar, j = Math.sin(tm * 1.6 + ph + a.s) * .05 * idle;
          a.b[0].rotation.set(-a.s * ch.wg * .8, 0, r * .9 + j); a.b[1].rotation.set(0, 0, -.3 * Math.max(0, -r) + r * .4 - j); a.b[2].rotation.set(0, 0, -r * .3); });""",
"""        // ręce: zamach w przód (ar), ręka wiodąca (al), rozłożenie (ax), machanie (af, na zmianę), w spoczynku zginanie łokci i dłoni
        c.arms.forEach(a => { const r = ch.ar + ch.al * a.s + ch.af * Math.sin(tm * 17 + a.s * 2), j = Math.sin(tm * 1.6 + ph + a.s) * .12 * idle;
          a.b[0].rotation.set(-a.s * (ch.wg * .8 + ch.ax), 0, r * .9 + j); a.b[1].rotation.set(0, 0, -.3 * Math.max(0, -r) + r * .4 - j); a.b[2].rotation.set(0, 0, -r * .3 + j * .8); });""")
rep("""t >= A.hit && lastBlink < A.hit && window.Arena3D?.S) Arena3D.S.shake = .3;   // tupnięcie trzęsie ziemią
        lastBlink = k === 'lunge' ? t : 0;""", """t >= A.hit && t0 < A.hit && window.Arena3D?.S) Arena3D.S.shake = .3;   // tupnięcie trzęsie ziemią""")
open(p, 'w').write(s)
