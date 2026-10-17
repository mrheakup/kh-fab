/* ================= KH Fab — parametric product templates: flat cut parts + 3D bodies + assembly placement =================
   The same geometry is ported 1:1 to the Inventor iLogic rules (ilogic.js) — keep both in step. Units: mm, Z up. */
const TG = {
  R(x, y, w, h, r) { return rectLoop(w, h, r || 0).map(v => ({ x: v.x + x, y: v.y + y, b: v.b })); },
  C(cx, cy, r) { return [{ x: cx + r, y: cy, b: 1 }, { x: cx - r, y: cy, b: 1 }]; },
  S(cx, cy, len, w, vert) { // obround slot; len = overall length
    const r = w / 2, l = Math.max(0, len - w);
    if (l < 1e-6) return TG.C(cx, cy, r);
    if (!vert) return [{ x: cx - l / 2, y: cy - r, b: 0 }, { x: cx + l / 2, y: cy - r, b: 1 }, { x: cx + l / 2, y: cy + r, b: 0 }, { x: cx - l / 2, y: cy + r, b: 1 }];
    return [{ x: cx + r, y: cy - l / 2, b: 0 }, { x: cx + r, y: cy + l / 2, b: 1 }, { x: cx - r, y: cy + l / 2, b: 0 }, { x: cx - r, y: cy - l / 2, b: 1 }];
  },
  P(a) { return a.map(p => ({ x: p[0], y: p[1], b: p[2] || 0 })); },
  mv(lp, dx, dy) { return lp.map(v => ({ x: v.x + dx, y: v.y + dy, b: v.b })); },
  F(o, u, v) { const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]; return { o, u, v, n }; },
  rotZ(o, deg) { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return TG.F(o, [c, s, 0], [-s, c, 0]); },
  solid(loops, t, fr) { return { loops, t, fr: fr || TG.F([0, 0, 0], [1, 0, 0], [0, 1, 0]) }; },
  box(x, y, z, dx, dy, dz) { return TG.solid([TG.R(0, 0, dx, dy, 0)], dz, TG.F([x, y, z], [1, 0, 0], [0, 1, 0])); },
  // frame point: o + x·u + y·v + z·n
  at(fr, x, y, z) { return [0, 1, 2].map(i => fr.o[i] + x * fr.u[i] + y * fr.v[i] + (z || 0) * fr.n[i]); },
  // compose: placement (world) ∘ local frame
  comp(P, f) { const m = q => [0, 1, 2].map(i => q[0] * P.u[i] + q[1] * P.v[i] + q[2] * P.n[i]); return { o: TG.at(P, f.o[0], f.o[1], f.o[2]), u: m(f.u), v: m(f.v), n: m(f.n) }; }
};
/* 90° bend constants for sheet t with inside radius R = t (DIN 6935 K) */
function bend90(t) { const R = t, K = kFactor(R, t), BA = Math.PI / 2 * (R + K * t), OS = R + t; return { R, K, BA, OS, BD: 2 * OS - BA }; }
/* flanged tray: outer W × D, flanges F high on the chosen sides [y0, x=W, y=D, x0] */
function trayFlat(W, D, F, t, sd) {
  const k = bend90(t), a = F - k.OS, b = k.BA;
  const [s0, s1, s2, s3] = sd, xl = s3 ? a + b : 0, xr = s1 ? a + b : 0, yb = s0 ? a + b : 0, yt = s2 ? a + b : 0;
  const c = W - (s3 ? k.OS : 0) - (s1 ? k.OS : 0), d = D - (s0 ? k.OS : 0) - (s2 ? k.OS : 0);
  const X1 = xl + c, Y1 = yb + d, TW = X1 + xr, TH = Y1 + yt;
  const raw = [[xl, 0], [X1, 0], [X1, yb], [TW, yb], [TW, Y1], [X1, Y1], [X1, TH], [xl, TH], [xl, Y1], [0, Y1], [0, yb], [xl, yb]];
  const pts = [];
  raw.forEach(p => { const l = pts[pts.length - 1]; if (!l || Math.hypot(l[0] - p[0], l[1] - p[1]) > 1e-9) pts.push(p); });
  while (pts.length > 1 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-9) pts.pop();
  const clean = pts.filter((p, i) => { const A = pts[(i - 1 + pts.length) % pts.length], B = pts[(i + 1) % pts.length]; return Math.abs((p[0] - A[0]) * (B[1] - p[1]) - (p[1] - A[1]) * (B[0] - p[0])) > 1e-9; });
  const bends = [];
  if (s0) bends.push({ x1: xl, y1: a + b / 2, x2: X1, y2: a + b / 2, up: false, ang: 90 });
  if (s2) bends.push({ x1: xl, y1: Y1 + b / 2, x2: X1, y2: Y1 + b / 2, up: false, ang: 90 });
  if (s3) bends.push({ x1: a + b / 2, y1: yb, x2: a + b / 2, y2: Y1, up: false, ang: 90 });
  if (s1) bends.push({ x1: X1 + b / 2, y1: yb, x2: X1 + b / 2, y2: Y1, up: false, ang: 90 });
  return {
    outer: TG.P(clean), bends, W: TW, H: TH, k,
    X: x => xl + x - (s3 ? k.OS : 0), Y: y => yb + y - (s0 ? k.OS : 0),          // panel point (outer dims) → flat
    fl: (side, along, e) => side === 0 ? [xl + along - (s3 ? k.OS : 0), e] : side === 2 ? [xl + along - (s3 ? k.OS : 0), TH - e] : side === 3 ? [e, yb + along - (s0 ? k.OS : 0)] : [TW - e, yb + along - (s0 ? k.OS : 0)] // flange point: distance `along` the panel edge, `e` from the free edge
  };
}
/* tray as 3D bodies (part-local): panel on top at z = F, flanges hanging down to z = 0 */
function tray3D(W, D, F, t, sd, panelHoles) {
  const out = [TG.solid([TG.R(0, 0, W, D, 0), ...(panelHoles || [])], t, TG.F([0, 0, F - t], [1, 0, 0], [0, 1, 0]))];
  const y0 = sd[0] ? t : 0, y1 = sd[2] ? D - t : D, h = F - t;
  if (sd[0]) out.push(TG.box(0, 0, 0, W, t, h));
  if (sd[2]) out.push(TG.box(0, D - t, 0, W, t, h));
  if (sd[3]) out.push(TG.box(0, y0, 0, t, y1 - y0, h));
  if (sd[1]) out.push(TG.box(W - t, y0, 0, t, y1 - y0, h));
  return out;
}
/* L-angle with one 90° bend: legs A and B (outer), width w, length along the bend */
function angleFlat(A, B, len, t) { const k = bend90(t), a = A - k.OS, b = B - k.OS; return { outer: TG.R(0, 0, a + k.BA + b, len, 0), bends: [{ x1: a + k.BA / 2, y1: 0, x2: a + k.BA / 2, y2: len, up: false, ang: 90 }], fx1: x => x, fx2: x => a + k.BA + (x - k.OS), W: a + k.BA + b, k }; }
function angle3D(A, B, len, t) { return [TG.box(0, 0, 0, A, t, len), TG.box(0, t, 0, t, B - t, len)]; }

/* ---------- templates ---------- */
const TPL = {
  pegboard: {
    name: 'Pegboard — багажны самбар', cat: 'Цех',
    desc: 'Дөрвөн талдаа нугалсан ирмэгтэй, нүх/ангархай торон самбар. Хананд 4 нүхээр бэхэлнэ.',
    params: [['W', 'Өргөн', 1000, 10], ['H', 'Өндөр', 600, 10], ['t', 'Зузаан', 1.5, 0.5], ['F', 'Ирмэгийн өндөр', 25, 1], ['p', 'Нүхний алхам', 38, 1], ['hw', 'Нүхний өргөн', 6, 0.5], ['hl', 'Нүхний урт (= өргөн бол дугуй)', 20, 1], ['m', 'Захын зай', 45, 1], ['md', 'Бэхэлгээний нүх Ø', 8, 0.5], ['n', 'Тоо', 1, 1]],
    mat: 'Ст3 / S235',
    build(p) {
      const sd = [1, 1, 1, 1], tf = trayFlat(p.W, p.H, p.F, p.t, sd), holesP = [];
      const nx = Math.max(1, Math.floor((p.W - 2 * p.m) / p.p) + 1), ny = Math.max(1, Math.floor((p.H - 2 * p.m - (p.hl - p.hw)) / p.p) + 1);
      const x0 = (p.W - (nx - 1) * p.p) / 2, y0 = (p.H - (ny - 1) * p.p) / 2;
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) holesP.push([x0 + i * p.p, y0 + j * p.p]);
      const mnt = [[p.m / 2, p.m / 2], [p.W - p.m / 2, p.m / 2], [p.W - p.m / 2, p.H - p.m / 2], [p.m / 2, p.H - p.m / 2]];
      const flatHoles = holesP.map(q => TG.S(tf.X(q[0]), tf.Y(q[1]), p.hl, p.hw, true)).concat(mnt.map(q => TG.C(tf.X(q[0]), tf.Y(q[1]), p.md / 2)));
      const panelHoles = holesP.map(q => TG.S(q[0], q[1], p.hl, p.hw, true)).concat(mnt.map(q => TG.C(q[0], q[1], p.md / 2)));
      const parts = [{ key: 'board', name: `Pegboard ${p.W}×${p.H}`, thk: p.t, qty: p.n, outer: tf.outer, holes: flatHoles, bends: tf.bends }];
      const bodies = { board: tray3D(p.W, p.H, p.F, p.t, sd, panelHoles) };
      const place = []; for (let i = 0; i < p.n; i++) place.push({ key: 'board', fr: TG.F([i * (p.W + 20), 0, 0], [1, 0, 0], [0, 0, 1]) });
      return { parts, bodies, place, info: `${nx * ny} нүх · дэлгэмэл ${nf(tf.W, 1)} × ${nf(tf.H, 1)} мм` };
    }
  },
  bench: {
    name: 'Ажлын ширээ', cat: 'Цех',
    desc: 'Нугалсан тавцан, доод тавиур, булангийн 4 өнцөгт хөл. Бүгд боолтоор угсрагдана.',
    params: [['L', 'Урт', 1500, 10], ['D', 'Гүн', 700, 10], ['H', 'Өндөр', 900, 10], ['t', 'Тавцангийн зузаан', 3, 0.5], ['F', 'Тавцангийн ирмэг', 50, 1], ['A', 'Хөлийн өнцөгт', 60, 1], ['tl', 'Хөлийн зузаан', 4, 0.5], ['zs', 'Доод тавиурын өндөр', 200, 10], ['ts', 'Тавиурын зузаан', 2, 0.5], ['Fs', 'Тавиурын ирмэг', 30, 1], ['bd', 'Боолтны нүх Ø', 9, 0.5]],
    mat: 'Ст3 / S235',
    build(p) {
      const sd = [1, 1, 1, 1], top = trayFlat(p.L, p.D, p.F, p.t, sd);
      const SL = p.L - 2 * p.t - 2 * p.tl, SD = p.D - 2 * p.t - 2 * p.tl, sh = trayFlat(SL, SD, p.Fs, p.ts, sd);
      const Lg = p.H - p.t, lg = angleFlat(p.A, p.A, Lg, p.tl), r = p.bd / 2;
      // bolt positions: legs sit in the tray corners; holes at mid flange height
      const cTop = p.t + p.A / 2, cSh = p.A / 2 - p.tl;
      const topH = [], shH = [];
      [[0, p.L], [2, p.L], [1, p.D], [3, p.D]].forEach(([s, len]) => { [cTop, len - cTop].forEach(a => topH.push(TG.C(...top.fl(s, a, p.F / 2), r))); });
      [[0, SL], [2, SL], [1, SD], [3, SD]].forEach(([s, len]) => { [cSh, len - cSh].forEach(a => shH.push(TG.C(...sh.fl(s, a, p.Fs / 2), r))); });
      const legH = [];
      [p.H - p.F / 2, p.zs - p.Fs / 2].forEach(y => { legH.push(TG.C(lg.fx1(p.A / 2), y, r)); legH.push(TG.C(lg.fx2(p.A / 2), y, r)); });
      const parts = [
        { key: 'top', name: `Тавцан ${p.L}×${p.D}`, thk: p.t, qty: 1, outer: top.outer, holes: topH, bends: top.bends },
        { key: 'shelf', name: `Доод тавиур ${Math.round(SL)}×${Math.round(SD)}`, thk: p.ts, qty: 1, outer: sh.outer, holes: shH, bends: sh.bends },
        { key: 'leg', name: `Хөл ∟${p.A}×${p.A}×${p.tl}, L${Math.round(Lg)}`, thk: p.tl, qty: 4, outer: lg.outer, holes: legH, bends: lg.bends }
      ];
      const bodies = { top: tray3D(p.L, p.D, p.F, p.t, sd), shelf: tray3D(SL, SD, p.Fs, p.ts, sd), leg: angle3D(p.A, p.A, Lg, p.tl) };
      const place = [{ key: 'top', fr: TG.F([0, 0, p.H - p.F], [1, 0, 0], [0, 1, 0]) }, { key: 'shelf', fr: TG.F([p.t + p.tl, p.t + p.tl, p.zs - p.Fs], [1, 0, 0], [0, 1, 0]) }];
      [[p.t, p.t, 0], [p.L - p.t, p.t, 90], [p.L - p.t, p.D - p.t, 180], [p.t, p.D - p.t, 270]].forEach(([x, y, a]) => place.push({ key: 'leg', fr: TG.rotZ([x, y, 0], a) }));
      return { parts, bodies, place, info: `тавцан дэлгэмэл ${nf(top.W, 1)} × ${nf(top.H, 1)} мм` };
    }
  },
  chair: {
    name: 'Сандал (лазер, боолттой)', cat: 'Тавилга',
    desc: 'Хоёр хажуу хүрээ, нугалсан суудал, түшлэг. Хажуу хүрээнд боолтны нүх тааруулж гарна.',
    params: [['Ws', 'Суудлын өргөн', 430, 5], ['Ds', 'Суудлын гүн', 420, 5], ['Hs', 'Суудлын өндөр', 450, 5], ['Hb', 'Нийт өндөр', 820, 5], ['a', 'Түшлэгийн налуу, °', 8, 1], ['pw', 'Хүрээний өргөн', 45, 1], ['tf', 'Хүрээний зузаан', 5, 0.5], ['t', 'Суудал, түшлэгийн зузаан', 2, 0.5], ['F', 'Нугалаас', 30, 1], ['Hbp', 'Түшлэгийн өндөр', 260, 5], ['bd', 'Боолтны нүх Ø', 7, 0.5], ['n', 'Тоо', 1, 1]],
    mat: 'Ст3 / S235',
    build(p) {
      const ta = Math.tan(p.a * Math.PI / 180), ca = Math.cos(p.a * Math.PI / 180), sa = Math.sin(p.a * Math.PI / 180), r = p.bd / 2;
      const G = [p.pw - p.Hs * ta, p.Hs];
      const side = TG.P([[0, 0], [p.Ds, 0], [p.Ds, p.Hs], G, [p.pw - p.Hb * ta, p.Hb, 0.35], [-p.Hb * ta, p.Hb]]);
      const cut = TG.R(p.pw + 30, 60, Math.max(20, p.Ds - p.pw - 70), Math.max(20, p.Hs - 120), 20);
      // seat: tray with flanges on x = 0 and x = Ws
      const Dp = Math.round(p.Ds - Math.max(G[0], p.pw) - 5), seat = trayFlat(p.Ws, Dp, p.F, p.t, [0, 1, 0, 1]);
      const back = trayFlat(p.Ws, p.Hbp, p.F, p.t, [0, 1, 0, 1]);
      const sFr = TG.F([0, p.Ds - Dp, p.Hs - p.F], [1, 0, 0], [0, 1, 0]);
      const y0 = p.Hb - 20 - p.Hbp, vB = [0, -sa, ca], nB = [0, ca, sa];
      const P0 = [p.Ws, p.pw - y0 * ta, y0], bFr = { o: [P0[0] - p.F * nB[0], P0[1] - p.F * nB[1], P0[2] - p.F * nB[2]], u: [-1, 0, 0], v: vB, n: nB };
      const sideHoles = [], seatH = [], backH = [];
      [0.25, 0.75].forEach(f => {
        const al = f * Dp; seatH.push(TG.C(...seat.fl(3, al, p.F / 2), r), TG.C(...seat.fl(1, al, p.F / 2), r));
        const w = TG.at(sFr, 0, al, p.F / 2); sideHoles.push(TG.C(w[1], w[2], r));
        const bl = f * p.Hbp; backH.push(TG.C(...back.fl(3, bl, p.F / 2), r), TG.C(...back.fl(1, bl, p.F / 2), r));
        const q = TG.at(bFr, 0, bl, p.F / 2); sideHoles.push(TG.C(q[1], q[2], r));
      });
      const parts = [
        { key: 'side', name: 'Хажуу хүрээ', thk: p.tf, qty: 2 * p.n, outer: side, holes: [cut, ...sideHoles], bends: [] },
        { key: 'seat', name: `Суудал ${p.Ws}×${Dp}`, thk: p.t, qty: p.n, outer: seat.outer, holes: seatH, bends: seat.bends },
        { key: 'back', name: `Түшлэг ${p.Ws}×${p.Hbp}`, thk: p.t, qty: p.n, outer: back.outer, holes: backH, bends: back.bends }
      ];
      const sideFr = TG.F([0, 0, 0], [0, 1, 0], [0, 0, 1]);
      const bodies = { side: [TG.solid([side, cut, ...sideHoles], p.tf, sideFr)], seat: tray3D(p.Ws, Dp, p.F, p.t, [0, 1, 0, 1]), back: tray3D(p.Ws, p.Hbp, p.F, p.t, [0, 1, 0, 1]) };
      const place = [];
      for (let i = 0; i < p.n; i++) {
        const dx = i * (p.Ws + 2 * p.tf + 150);
        place.push({ key: 'side', fr: TG.F([dx - p.tf, 0, 0], [1, 0, 0], [0, 1, 0]) }, { key: 'side', fr: TG.F([dx + p.Ws, 0, 0], [1, 0, 0], [0, 1, 0]) });
        place.push({ key: 'seat', fr: { o: [sFr.o[0] + dx, sFr.o[1], sFr.o[2]], u: sFr.u, v: sFr.v, n: sFr.n } }, { key: 'back', fr: { o: [bFr.o[0] + dx, bFr.o[1], bFr.o[2]], u: bFr.u, v: bFr.v, n: bFr.n } });
      }
      return { parts, bodies, place, info: `суудал ${nf(seat.W, 1)} × ${nf(seat.H, 1)}, түшлэг ${nf(back.W, 1)} × ${nf(back.H, 1)} мм дэлгэмэл` };
    }
  },
  rack: {
    name: 'Тавиур (стеллаж)', cat: 'Агуулах',
    desc: '4 өнцөгт тулгуур (нүхтэй), нугалсан тавиурууд. Тавиурын өндрийг нүхний алхмаар тохируулна.',
    params: [['L', 'Урт', 1000, 10], ['D', 'Гүн', 400, 10], ['H', 'Өндөр', 1800, 10], ['k', 'Тавиурын тоо', 5, 1], ['ts', 'Тавиурын зузаан', 1.2, 0.1], ['F', 'Тавиурын ирмэг', 30, 1], ['A', 'Тулгуурын өнцөгт', 40, 1], ['tl', 'Тулгуурын зузаан', 2, 0.5], ['pt', 'Нүхний алхам', 50, 5], ['bd', 'Нүх Ø', 9, 0.5]],
    mat: 'Ст3 / S235',
    build(p) {
      const sd = [1, 1, 1, 1], SL = p.L - 2 * p.tl, SD = p.D - 2 * p.tl, sh = trayFlat(SL, SD, p.F, p.ts, sd), lg = angleFlat(p.A, p.A, p.H, p.tl), r = p.bd / 2;
      const rows = []; for (let y = p.pt / 2; y < p.H - p.pt / 4; y += p.pt) rows.push(y);
      const legH = []; rows.forEach(y => { legH.push(TG.C(lg.fx1(p.A / 2), y, r), TG.C(lg.fx2(p.A / 2), y, r)); });
      const c = p.A / 2 - p.tl, shH = [];
      [[0, SL], [2, SL], [1, SD], [3, SD]].forEach(([s, len]) => [c, len - c].forEach(a => shH.push(TG.C(...sh.fl(s, a, p.F / 2), r))));
      // shelf levels: flange holes on a hole row, evenly spread
      const lv = []; const k = Math.max(1, Math.round(p.k));
      for (let i = 0; i < k; i++) { const want = k === 1 ? p.H / 2 : 120 + i * (p.H - 120 - p.F) / (k - 1); let best = rows[0]; rows.forEach(y => { if (Math.abs(y - (want - p.F / 2)) < Math.abs(best - (want - p.F / 2))) best = y; }); lv.push(best + p.F / 2); }
      const parts = [
        { key: 'shelf', name: `Тавиур ${Math.round(SL)}×${Math.round(SD)}`, thk: p.ts, qty: k, outer: sh.outer, holes: shH, bends: sh.bends },
        { key: 'post', name: `Тулгуур ∟${p.A}×${p.A}×${p.tl}, L${p.H}`, thk: p.tl, qty: 4, outer: lg.outer, holes: legH, bends: lg.bends }
      ];
      const bodies = { shelf: tray3D(SL, SD, p.F, p.ts, sd), post: angle3D(p.A, p.A, p.H, p.tl) };
      const place = lv.map(z => ({ key: 'shelf', fr: TG.F([p.tl, p.tl, z - p.F], [1, 0, 0], [0, 1, 0]) }));
      [[0, 0, 0], [p.L, 0, 90], [p.L, p.D, 180], [0, p.D, 270]].forEach(([x, y, a]) => place.push({ key: 'post', fr: TG.rotZ([x, y, 0], a) }));
      return { parts, bodies, place, info: `тавиурын өндрүүд: ${lv.map(z => Math.round(z)).join(', ')} мм` };
    }
  },
  lbracket: {
    name: 'L бэхэлгээ (тавиурын кронштейн)', cat: 'Бэхэлгээ',
    desc: 'Нэг нугалаастай L хэлбэрийн бэхэлгээ, хоёр мөрөндөө нүхтэй.',
    params: [['A', 'Мөр 1', 150, 5], ['B', 'Мөр 2', 100, 5], ['w', 'Өргөн', 50, 5], ['t', 'Зузаан', 4, 0.5], ['d', 'Нүх Ø', 11, 0.5], ['nh', 'Нүх мөр тус бүрт', 2, 1], ['n', 'Тоо', 4, 1]],
    mat: 'Ст3 / S235',
    build(p) {
      const k = bend90(p.t), a = p.A - k.OS, b = p.B - k.OS, fl = angleFlat(p.A, p.B, p.w, p.t), holes = [], r = p.d / 2, nh = Math.max(0, Math.round(p.nh));
      for (let i = 0; i < nh; i++) {
        const x1 = p.t + (p.A - p.t) * (i + 1) / (nh + 1), x2 = p.t + (p.B - p.t) * (i + 1) / (nh + 1); // distance from the outer corner
        holes.push(TG.C(p.A - x1, p.w / 2, r), TG.C(fl.fx2(x2), p.w / 2, r));
      }
      const parts = [{ key: 'br', name: `L бэхэлгээ ${p.A}×${p.B}×${p.w}`, thk: p.t, qty: p.n, outer: fl.outer, holes, bends: fl.bends }];
      const bodies = { br: [TG.solid([TG.R(0, 0, p.A, p.w, 0)], p.t, TG.F([0, 0, 0], [1, 0, 0], [0, 1, 0])), TG.solid([TG.R(0, 0, p.B - p.t, p.w, 0)], p.t, TG.F([p.t, 0, p.t], [0, 0, 1], [0, 1, 0]))] };
      const place = []; for (let i = 0; i < p.n; i++) place.push({ key: 'br', fr: TG.F([i * (p.A + 40), 0, 0], [1, 0, 0], [0, 1, 0]) });
      return { parts, bodies, place, info: `дэлгэмэл ${nf(fl.W, 1)} × ${p.w} мм` };
    }
  },
  baseplate: {
    name: 'Суурь хавтан (баганын)', cat: 'Бэхэлгээ',
    desc: 'Анкер боолтны нүхтэй тэгш өнцөгт хавтан, төвийн нүх, булангийн радиустай.',
    params: [['L', 'Урт', 400, 5], ['W', 'Өргөн', 400, 5], ['t', 'Зузаан', 20, 1], ['nx', 'Нүх X', 2, 1], ['ny', 'Нүх Y', 2, 1], ['e', 'Захаас нүх хүртэл', 50, 1], ['d', 'Нүх Ø', 26, 1], ['R', 'Булангийн R', 0, 1], ['d0', 'Төвийн нүх Ø (0 = үгүй)', 0, 1], ['n', 'Тоо', 4, 1]],
    mat: 'S355 / 09Г2С',
    build(p) {
      const holes = [], nx = Math.max(1, Math.round(p.nx)), ny = Math.max(1, Math.round(p.ny));
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
        const x = nx === 1 ? p.L / 2 : p.e + i * (p.L - 2 * p.e) / (nx - 1), y = ny === 1 ? p.W / 2 : p.e + j * (p.W - 2 * p.e) / (ny - 1);
        if (nx > 1 && ny > 1 && i > 0 && i < nx - 1 && j > 0 && j < ny - 1) continue; // perimeter pattern only
        holes.push(TG.C(x, y, p.d / 2));
      }
      if (p.d0 > 0) holes.push(TG.C(p.L / 2, p.W / 2, p.d0 / 2));
      const outer = TG.R(0, 0, p.L, p.W, p.R);
      const parts = [{ key: 'bp', name: `Суурь хавтан ${p.L}×${p.W}×${p.t}`, thk: p.t, qty: p.n, outer, holes, bends: [] }];
      const bodies = { bp: [TG.solid([outer, ...holes], p.t)] };
      const place = []; for (let i = 0; i < p.n; i++) place.push({ key: 'bp', fr: TG.F([i * (p.L + 60), 0, 0], [1, 0, 0], [0, 1, 0]) });
      return { parts, bodies, place, info: `${holes.length} нүх` };
    }
  }
};
/* bucket → 3D (uses bucketCalc from bucket.js) */
function bucket3D(B) {
  const c = bucketCalc(B); if (c.err.length) return null;
  const W = c.W, D = c.D, H = c.H, R = c.R, tw = c.tw, ts = c.ts, te = +B.ear.thk, twr = +B.wear.thk, Q = Math.tan(Math.PI / 8);
  const bodies = {}, place = [];
  const byName = k => c.parts.find(p => p.name.startsWith(k));
  const XZ = o => TG.F(o, [1, 0, 0], [0, 0, 1]); // normal −Y
  bodies.side = [TG.solid([c.side], ts, XZ([0, 0, 0]))];
  place.push({ key: 'side', fr: TG.F([0, 0, 0], [1, 0, 0], [0, 1, 0]) }, { key: 'side', fr: TG.F([0, W + ts, 0], [1, 0, 0], [0, 1, 0]) });
  const wrapLoop = TG.P([[D - c.lipL, 0], [R, 0, -Q], [0, R], [0, H - c.tt], [tw, H - c.tt], [tw, R, Q], [R, tw], [D - c.lipL, tw]]);
  bodies.wrap = [TG.solid([wrapLoop], W, XZ([0, W, 0]))];
  place.push({ key: 'wrap', fr: TG.F([0, 0, 0], [1, 0, 0], [0, 1, 0]) });
  bodies.lip = [TG.solid([TG.R(0, 0, c.lipL, W, 0)], c.tl)]; place.push({ key: 'lip', fr: TG.F([D - c.lipL, 0, 0], [1, 0, 0], [0, 1, 0]) });
  bodies.top = [TG.solid([TG.R(0, 0, c.topD, W, 0)], c.tt)]; place.push({ key: 'top', fr: TG.F([0, 0, H - c.tt], [1, 0, 0], [0, 1, 0]) });
  const ear = byName('Чих');
  if (ear) {
    bodies.ear = [TG.solid([ear.outer, ...ear.holes], te, TG.F([0, 0, 0], [1, 0, 0], [0, 0, 1]))];
    const n = ear.qty, ex0 = c.topD / 2 - (+B.pitch) / 2;
    for (let k = 0; k < n; k++) { const y = W * (k + 1) / (n + 1) + te / 2; place.push({ key: 'ear', fr: TG.F([ex0, y, H], [1, 0, 0], [0, 1, 0]) }); }
  }
  const wear = byName('Элэгдлийн');
  if (wear) {
    bodies.wear = [TG.solid([TG.R(0, 0, +B.wearW, c.Lb - 40, 0)], twr, TG.F([0, 0, 0], [0, 1, 0], [1, 0, 0]))];
    for (let k = 0; k < wear.qty; k++) { const y = W * (k + 1) / (wear.qty + 1) - (+B.wearW) / 2; place.push({ key: 'wear', fr: TG.F([R + 20, y, 0], [1, 0, 0], [0, 1, 0]) }); }
  }
  if (B.cutter && byName('Хажуугийн ир')) {
    const L = Math.round(c.Lm), ux = (c.Bx - D) / c.Lm, uz = H / c.Lm;
    bodies.cut = [TG.solid([TG.R(0, 0, L, +B.cutterW, 0)], ts)];
    // left: on the outer face (y = −ts) growing outwards, starting at the lip tip
    place.push({ key: 'cut', fr: { o: [D, -ts, 0], u: [ux, 0, uz], v: [-uz, 0, ux], n: [0, -1, 0] } });
    place.push({ key: 'cut', fr: { o: [c.Bx, W + ts, H], u: [-ux, 0, -uz], v: [-uz, 0, ux], n: [0, 1, 0] } });
  }
  const keyOf = { side: 'Хажуу хавтан', wrap: 'Ороох', lip: 'Ирний', top: 'Дээд', ear: 'Чих', wear: 'Элэгдлийн', cut: 'Хажуугийн ир' };
  const parts = Object.entries(keyOf).filter(([k]) => bodies[k]).map(([k, nm]) => ({ ...byName(nm), key: k }));
  return { parts, bodies, place, c };
}
/* flatten a template result into placed solids (world) for the viewer / STEP / STL */
function worldSolids(res) {
  const out = [];
  res.place.forEach((pl, i) => (res.bodies[pl.key] || []).forEach(s => out.push({ key: pl.key, inst: i, loops: s.loops, t: s.t, fr: TG.comp(pl.fr, s.fr) })));
  return out;
}
