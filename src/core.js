/*CORE-START*/
const TAU = Math.PI * 2, D2R = Math.PI / 180;

/* ---------- bulge geometry ---------- */
function segArc(a, b, bu) {
  const dx = b.x - a.x, dy = b.y - a.y, c = Math.hypot(dx, dy);
  if (Math.abs(bu) < 1e-9 || c < 1e-12) return { line: true, len: c };
  const th = 4 * Math.atan(bu), r = c / (2 * Math.abs(Math.sin(th / 2)));
  const h = (c / 2) / Math.tan(th / 2);
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  return { line: false, len: Math.abs(th) * r, theta: th, r, cx: mx - dy / c * h, cy: my + dx / c * h };
}
function flattenLoop(vs, tol) {
  const out = [], n = vs.length;
  for (let i = 0; i < n; i++) {
    const a = vs[i], b = vs[(i + 1) % n];
    out.push([a.x, a.y]);
    if (Math.abs(a.b) > 1e-9) {
      const s = segArc(a, b, a.b);
      if (!s.line) {
        const sa = Math.atan2(a.y - s.cy, a.x - s.cx);
        const step = 2 * Math.acos(Math.max(-1, 1 - Math.min(tol, s.r) / s.r));
        const k = Math.min(720, Math.max(2, Math.ceil(Math.abs(s.theta) / Math.max(step, 1e-3))));
        for (let j = 1; j < k; j++) { const t = sa + s.theta * j / k; out.push([s.cx + s.r * Math.cos(t), s.cy + s.r * Math.sin(t)]); }
      }
    }
  }
  return out;
}
function loopArea(vs) {
  let A = 0; const n = vs.length;
  for (let i = 0; i < n; i++) {
    const a = vs[i], b = vs[(i + 1) % n];
    A += (a.x * b.y - b.x * a.y) / 2;
    if (Math.abs(a.b) > 1e-9) { const s = segArc(a, b, a.b); if (!s.line) { const t = Math.abs(s.theta); A += Math.sign(a.b) * s.r * s.r / 2 * (t - Math.sin(t)); } }
  }
  return A;
}
function loopLen(vs) { let L = 0; const n = vs.length; for (let i = 0; i < n; i++) L += segArc(vs[i], vs[(i + 1) % n], vs[i].b).len; return L; }
function xformLoop(vs, ang, mir, tx, ty) {
  const a = ang * D2R, c = Math.cos(a), s = Math.sin(a);
  return vs.map(v => { const x = mir ? -v.x : v.x; return { x: x * c - v.y * s + tx, y: x * s + v.y * c + ty, b: mir ? -v.b : v.b }; });
}
function xformPts(pts, ang, mir, tx, ty) {
  const a = ang * D2R, c = Math.cos(a), s = Math.sin(a);
  return pts.map(p => { const x = mir ? -p[0] : p[0]; return [x * c - p[1] * s + tx, x * s + p[1] * c + ty]; });
}
function bboxPts(pts) { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of pts) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; } return { x0: a, y0: b, x1: c, y1: d }; }
function pointInPoly(x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }

function reverseLoop(vs) { const n = vs.length; return vs.map((v, i) => ({ x: vs[n - 1 - i].x, y: vs[n - 1 - i].y, b: -vs[(2 * n - 2 - i) % n].b })); }
function rotateLoop(vs, k) { return vs.slice(k).concat(vs.slice(0, k)); }
function orientLoop(vs, ccw) { const a = loopArea(vs); return (ccw ? a < 0 : a > 0) ? reverseLoop(vs) : vs; }
function isRectPart(p) {
  if (p.outer.length !== 4 || p.outer.some(v => Math.abs(v.b) > 1e-9)) return false;
  for (let i = 0; i < 4; i++) { const a = p.outer[i], b = p.outer[(i + 1) % 4]; if (Math.abs(a.x - b.x) > 1e-6 && Math.abs(a.y - b.y) > 1e-6) return false; }
  return true;
}
function normalizePart(outer, holes) {
  const bb = bboxPts(flattenLoop(outer, 0.05));
  const sh = vs => vs.map(v => ({ x: v.x - bb.x0, y: v.y - bb.y0, b: v.b }));
  return { outer: sh(outer), holes: holes.map(sh) };
}
function partInfo(p) {
  if (p._i) return p._i;
  const bb = bboxPts(flattenLoop(p.outer, 0.05));
  let ah = 0, cut = loopLen(p.outer);
  for (const h of p.holes) { ah += Math.abs(loopArea(h)); cut += loopLen(h); }
  const ao = Math.abs(loopArea(p.outer));
  Object.defineProperty(p, '_i', { value: { w: bb.x1 - bb.x0, h: bb.y1 - bb.y0, area: ao - ah, gross: ao, cut, pierce: 1 + p.holes.length }, enumerable: false, configurable: true, writable: true });
  return p._i;
}

/* ---------- parametric shapes ---------- */
const BQ = Math.tan(Math.PI / 8); // quarter-arc bulge
function circleLoop(cx, cy, r) { return [{ x: cx + r, y: cy, b: 1 }, { x: cx - r, y: cy, b: 1 }]; }
function rectLoop(L, W, R) {
  R = Math.max(0, Math.min(R || 0, L / 2 - 1e-6, W / 2 - 1e-6));
  if (R <= 0.001) return [{ x: 0, y: 0, b: 0 }, { x: L, y: 0, b: 0 }, { x: L, y: W, b: 0 }, { x: 0, y: W, b: 0 }];
  return [{ x: R, y: 0, b: 0 }, { x: L - R, y: 0, b: BQ }, { x: L, y: R, b: 0 }, { x: L, y: W - R, b: BQ }, { x: L - R, y: W, b: 0 }, { x: R, y: W, b: BQ }, { x: 0, y: W - R, b: 0 }, { x: 0, y: R, b: BQ }];
}
function slotLoop(cx, cy, l, w) { const r = w / 2; if (l <= 0) return circleLoop(cx, cy, r); return [{ x: cx - l / 2, y: cy - r, b: 0 }, { x: cx + l / 2, y: cy - r, b: 1 }, { x: cx + l / 2, y: cy + r, b: 0 }, { x: cx - l / 2, y: cy + r, b: 1 }]; }
const SHAPE_CATS = [['plate', 'Хавтан'], ['round', 'Дугуй'], ['bracket', 'Бракет, профиль'], ['sign', 'Тэмдэг']];
const poly = pts => pts.map(p => ({ x: p[0], y: p[1], b: 0 }));
const need = (c, m) => { if (!c) throw new Error(m); };
function lugLoop(W, H, R) {
  const C = [W / 2, H];
  const tang = (P, right) => {
    const dx = P[0] - C[0], dy = P[1] - C[1], d = Math.hypot(dx, dy); need(d > R + 1e-6, 'Радиус хэт том байна');
    const phi = Math.atan2(dy, dx), be = Math.acos(R / d), c1 = [C[0] + R * Math.cos(phi + be), C[1] + R * Math.sin(phi + be)], c2 = [C[0] + R * Math.cos(phi - be), C[1] + R * Math.sin(phi - be)];
    return right ? (c1[0] > c2[0] ? c1 : c2) : (c1[0] < c2[0] ? c1 : c2);
  };
  const tr = tang([W, 0], true), tl = tang([0, 0], false);
  let sw = Math.atan2(tl[1] - C[1], tl[0] - C[0]) - Math.atan2(tr[1] - C[1], tr[0] - C[0]); while (sw <= 0) sw += TAU;
  return [{ x: 0, y: 0, b: 0 }, { x: W, y: 0, b: 0 }, { x: tr[0], y: tr[1], b: Math.tan(sw / 4) }, { x: tl[0], y: tl[1], b: 0 }];
}
const SHAPES = {
  rect: { cat: 'plate', label: 'Тэгш өнцөгт хавтан', f: [['L', 'Урт', 400], ['W', 'Өргөн', 250], ['R', 'Булангийн радиус', 0], ['D', 'Булангийн нүх Ø (0 = үгүй)', 0], ['E', 'Нүхний төв захаас', 30]],
    build: v => { const holes = []; if (v.D > 0) { const e = v.E, r = v.D / 2; need(e - r > 0 && v.L - 2 * e > v.D && v.W - 2 * e > v.D, 'Нүх хавтанд багтахгүй байна'); [[e, e], [v.L - e, e], [v.L - e, v.W - e], [e, v.W - e]].forEach(c => holes.push(circleLoop(c[0], c[1], r))); } return { outer: rectLoop(v.L, v.W, v.R), holes }; } },
  chamfer: { cat: 'plate', label: 'Налуу булантай хавтан', f: [['L', 'Урт', 300], ['W', 'Өргөн', 200], ['C', 'Налуу (фаска)', 30], ['D', 'Төв нүх Ø (0 = үгүй)', 0]],
    build: v => { const c = v.C; need(c < Math.min(v.L, v.W) / 2, 'Фаска хэт том байна'); return { outer: poly(c > 0 ? [[c, 0], [v.L - c, 0], [v.L, c], [v.L, v.W - c], [v.L - c, v.W], [c, v.W], [0, v.W - c], [0, c]] : [[0, 0], [v.L, 0], [v.L, v.W], [0, v.W]]), holes: v.D > 0 ? [circleLoop(v.L / 2, v.W / 2, v.D / 2)] : [] }; } },
  base: { cat: 'plate', label: 'Суурь хавтан (боолттой)', f: [['L', 'Урт', 400], ['W', 'Өргөн', 300], ['R', 'Булангийн радиус', 10], ['D', 'Боолтны нүх Ø', 22], ['E', 'Нүхний төв захаас', 40], ['NX', 'Урт талын нүхний тоо', 3], ['NY', 'Өргөн талын нүхний тоо', 2], ['DC', 'Төв нүх Ø (0 = үгүй)', 0]],
    build: v => {
      const nx = Math.max(2, Math.round(v.NX)), ny = Math.max(2, Math.round(v.NY)), e = v.E, r = v.D / 2;
      need(e - r > 0 && v.L - 2 * e > 0 && v.W - 2 * e > 0, 'Нүх хавтанд багтахгүй байна');
      const pts = new Map(), add = (x, y) => pts.set(x.toFixed(3) + ',' + y.toFixed(3), [x, y]);
      for (let i = 0; i < nx; i++) { const x = e + (v.L - 2 * e) * i / (nx - 1); add(x, e); add(x, v.W - e); }
      for (let j = 0; j < ny; j++) { const y = e + (v.W - 2 * e) * j / (ny - 1); add(e, y); add(v.L - e, y); }
      const holes = [...pts.values()].map(p => circleLoop(p[0], p[1], r));
      if (v.DC > 0) { need(v.DC / 2 + r < Math.min(v.L, v.W) / 2 - e + r, 'Төв нүх хэт том байна'); holes.push(circleLoop(v.L / 2, v.W / 2, v.DC / 2)); }
      return { outer: rectLoop(v.L, v.W, v.R), holes };
    } },
  perf: { cat: 'plate', label: 'Перфорацтай хавтан', f: [['L', 'Урт', 300], ['W', 'Өргөн', 200], ['D', 'Нүх Ø', 10], ['P', 'Нүхний алхам', 18], ['E', 'Захын зай', 20], ['ST', 'Шатрын хэлбэр (0/1)', 1]],
    build: v => {
      need(v.P > v.D + 1, 'Алхам нүхний диаметрээс их байх ёстой');
      const holes = [], st = v.ST >= 0.5, dy = st ? v.P * Math.sin(Math.PI / 3) : v.P, r = v.D / 2;
      for (let y = v.E + r, row = 0; y <= v.W - v.E - r + 1e-6; y += dy, row++) for (let x = v.E + r + (st && row % 2 ? v.P / 2 : 0); x <= v.L - v.E - r + 1e-6; x += v.P) holes.push(circleLoop(x, y, r));
      need(holes.length > 0 && holes.length <= 4000, holes.length ? 'Нүх хэт олон байна (4000-аас ихгүй)' : 'Нүх багтахгүй байна');
      return { outer: rectLoop(v.L, v.W, 0), holes };
    } },
  slot: { cat: 'plate', label: 'Ховилтой хавтан', f: [['L', 'Урт', 300], ['W', 'Өргөн', 120], ['R', 'Булангийн радиус', 10], ['S', 'Ховилын урт (төв хооронд)', 120], ['H', 'Ховилын өргөн', 22]],
    build: v => { need(v.S + v.H < v.L - 10 && v.H < v.W - 10, 'Ховил хавтанд багтахгүй байна'); return { outer: rectLoop(v.L, v.W, v.R), holes: [slotLoop(v.L / 2, v.W / 2, v.S, v.H)] }; } },
  trap: { cat: 'plate', label: 'Трапец', f: [['A', 'Доод тал', 300], ['B', 'Дээд тал', 180], ['H', 'Өндөр', 150]],
    build: v => { need(v.B >= 0 && v.B <= v.A, 'Дээд тал доод талаас их байж болохгүй'); return { outer: poly(v.B > 0 ? [[0, 0], [v.A, 0], [(v.A + v.B) / 2, v.H], [(v.A - v.B) / 2, v.H]] : [[0, 0], [v.A, 0], [v.A / 2, v.H]]), holes: [] }; } },
  circle: { cat: 'round', label: 'Дугуй', f: [['D', 'Диаметр', 200]], build: v => ({ outer: circleLoop(v.D / 2, v.D / 2, v.D / 2), holes: [] }) },
  ring: { cat: 'round', label: 'Фланц / шайба', f: [['D', 'Гадна Ø', 300], ['d', 'Дотор Ø (0 = үгүй)', 120], ['n', 'Боолтны нүхний тоо', 8], ['h', 'Боолтны нүх Ø', 18], ['P', 'Нүхний тойрог (PCD)', 240]],
    build: v => { const R = v.D / 2, holes = []; if (v.d > 0) { need(v.d < v.D, 'Дотор Ø гадна Ø-ээс бага байх ёстой'); holes.push(circleLoop(R, R, v.d / 2)); }
      const n = Math.round(v.n); if (n > 0 && v.h > 0) { const pr = v.P / 2; need(!(pr + v.h / 2 >= R || (v.d > 0 && pr - v.h / 2 <= v.d / 2)), 'Боолтны нүх фланцад багтахгүй байна'); for (let i = 0; i < n; i++) { const t = i / n * TAU; holes.push(circleLoop(R + pr * Math.cos(t), R + pr * Math.sin(t), v.h / 2)); } }
      return { outer: circleLoop(R, R, R), holes }; } },
  sector: { cat: 'round', label: 'Цагирган сегмент', f: [['R', 'Гадна радиус', 300], ['r', 'Дотор радиус (0 = зүсмэл)', 200], ['A', 'Өнцөг, °', 60]],
    build: v => { need(v.A > 0 && v.A < 360, 'Өнцөг 0–360° байна'); need(v.r < v.R, 'Дотор радиус гаднаас бага байх ёстой'); const a = v.A * D2R, b = Math.tan(a / 4);
      return { outer: v.r > 0 ? [{ x: v.r, y: 0, b: 0 }, { x: v.R, y: 0, b }, { x: v.R * Math.cos(a), y: v.R * Math.sin(a), b: 0 }, { x: v.r * Math.cos(a), y: v.r * Math.sin(a), b: -b }] : [{ x: 0, y: 0, b: 0 }, { x: v.R, y: 0, b }, { x: v.R * Math.cos(a), y: v.R * Math.sin(a), b: 0 }], holes: [] }; } },
  polygon: { cat: 'round', label: 'Олон өнцөгт', f: [['N', 'Талын тоо', 6], ['S', 'Хавтгай хоорондын зай', 120], ['D', 'Төв нүх Ø (0 = үгүй)', 40]],
    build: v => { const n = Math.round(v.N); need(n >= 3 && n <= 64, 'Талын тоо 3–64'); const Rc = v.S / (2 * Math.cos(Math.PI / n)), o = -Math.PI / 2 + Math.PI / n, pts = [];
      for (let k = 0; k < n; k++) pts.push([Rc * Math.cos(o + k * TAU / n), Rc * Math.sin(o + k * TAU / n)]);
      need(!(v.D > 0) || v.D < v.S - 2, 'Төв нүх хэт том байна'); return { outer: poly(pts), holes: v.D > 0 ? [circleLoop(0, 0, v.D / 2)] : [] }; } },
  obround: { cat: 'round', label: 'Зууван (ховил)', f: [['L', 'Урт', 200], ['W', 'Өргөн', 80], ['D', 'Нүх Ø (0 = үгүй)', 0]],
    build: v => { need(v.L >= v.W, 'Урт өргөнөөс их байх ёстой'); return { outer: slotLoop(v.L / 2, v.W / 2, v.L - v.W, v.W), holes: v.D > 0 ? [circleLoop(v.W / 2, v.W / 2, v.D / 2), circleLoop(v.L - v.W / 2, v.W / 2, v.D / 2)] : [] }; } },
  ellipse: { cat: 'round', label: 'Эллипс', f: [['A', 'Том тэнхлэг', 300], ['B', 'Бага тэнхлэг', 180]],
    build: v => { const pts = []; for (let k = 0; k < 720; k++) { const t = k / 720 * TAU; pts.push([v.A / 2 * Math.cos(t), v.B / 2 * Math.sin(t)]); } return { outer: fitPoly(pts, true, 0.03), holes: [] }; } },
  gusset: { cat: 'bracket', label: 'Гуссет (гурвалжин)', f: [['A', 'Хэвтээ тал', 200], ['B', 'Босоо тал', 150], ['C', 'Өнцгийн тайрдас', 15]],
    build: v => { const c = Math.max(0, v.C); need(c < Math.min(v.A, v.B) * 0.8, 'Тайрдас хэт том байна'); return { outer: poly(c > 0 ? [[c, 0], [v.A, 0], [0, v.B], [0, c]] : [[0, 0], [v.A, 0], [0, v.B]]), holes: [] }; } },
  gusset2: { cat: 'bracket', label: 'Трапец гуссет', f: [['A', 'Хэвтээ тал', 250], ['B', 'Босоо тал', 200], ['T', 'Дээд тэгш хэсэг', 60], ['C', 'Өнцгийн тайрдас', 15], ['D', 'Нүх Ø (0 = үгүй)', 0]],
    build: v => { need(v.T < v.A, 'Дээд хэсэг хэвтээ талаас бага байх ёстой'); const c = Math.max(0, v.C); const holes = v.D > 0 ? [circleLoop(v.T / 2 + c / 2, v.B * 0.55, v.D / 2)] : [];
      return { outer: poly(c > 0 ? [[c, 0], [v.A, 0], [v.T, v.B], [0, v.B], [0, c]] : [[0, 0], [v.A, 0], [v.T, v.B], [0, v.B]]), holes }; } },
  lbr: { cat: 'bracket', label: 'L бракет', f: [['A', 'Хэвтээ мөр', 200], ['B', 'Босоо мөр', 180], ['T', 'Мөрний өргөн', 50], ['R', 'Дотор радиус', 20], ['D', 'Нүх Ø (0 = үгүй)', 14]],
    build: v => { need(v.T < Math.min(v.A, v.B) && v.T + v.R < Math.min(v.A, v.B), 'Мөрний өргөн хэт их байна'); need(!(v.D > 0) || v.D < v.T - 4, 'Нүх мөрөнд багтахгүй'); const T = v.T, R = v.R;
      const outer = R > 0 ? [{ x: 0, y: 0, b: 0 }, { x: v.A, y: 0, b: 0 }, { x: v.A, y: T, b: 0 }, { x: T + R, y: T, b: -BQ }, { x: T, y: T + R, b: 0 }, { x: T, y: v.B, b: 0 }, { x: 0, y: v.B, b: 0 }] : poly([[0, 0], [v.A, 0], [v.A, T], [T, T], [T, v.B], [0, v.B]]);
      return { outer, holes: v.D > 0 ? [circleLoop((v.A + T + R) / 2, T / 2, v.D / 2), circleLoop(T / 2, (v.B + T + R) / 2, v.D / 2)] : [] }; } },
  ushape: { cat: 'bracket', label: 'П хэлбэр', f: [['W', 'Өргөн', 240], ['H', 'Өндөр', 160], ['T', 'Хананы зузаан', 40], ['R', 'Дотор радиус', 15]],
    build: v => { const W = v.W, H = v.H, T = v.T, R = v.R; need(2 * T + 2 * R < W && T + R < H, 'Хэмжээ тохирохгүй байна');
      return { outer: R > 0 ? [{ x: 0, y: 0, b: 0 }, { x: W, y: 0, b: 0 }, { x: W, y: H, b: 0 }, { x: W - T, y: H, b: 0 }, { x: W - T, y: T + R, b: -BQ }, { x: W - T - R, y: T, b: 0 }, { x: T + R, y: T, b: -BQ }, { x: T, y: T + R, b: 0 }, { x: T, y: H, b: 0 }, { x: 0, y: H, b: 0 }] : poly([[0, 0], [W, 0], [W, H], [W - T, H], [W - T, T], [T, T], [T, H], [0, H]]), holes: [] }; } },
  tshape: { cat: 'bracket', label: 'Т хэлбэр', f: [['W', 'Дээд өргөн', 200], ['H', 'Нийт өндөр', 180], ['T', 'Дээд хэсгийн зузаан', 40], ['t', 'Хөлийн өргөн', 50]],
    build: v => { need(v.t < v.W && v.T < v.H, 'Хэмжээ тохирохгүй байна'); const a = (v.W - v.t) / 2; return { outer: poly([[a, 0], [a + v.t, 0], [a + v.t, v.H - v.T], [v.W, v.H - v.T], [v.W, v.H], [0, v.H], [0, v.H - v.T], [a, v.H - v.T]]), holes: [] }; } },
  lug: { cat: 'bracket', label: 'Өргөх чих', f: [['W', 'Суурийн өргөн', 160], ['H', 'Нүхний төв хүртэл', 140], ['R', 'Дээд радиус', 55], ['D', 'Нүх Ø', 40]],
    build: v => { need(v.D < 2 * v.R - 10, 'Нүх радиуст багтахгүй байна'); need(v.H > v.R, 'Өндөр радиусаас их байх ёстой'); return { outer: lugLoop(v.W, v.H, v.R), holes: [circleLoop(v.W / 2, v.H, v.D / 2)] }; } },
  cross: { cat: 'sign', label: 'Загалмай / нэмэх', f: [['L', 'Нийт хэмжээ', 200], ['T', 'Мөрний өргөн', 60]],
    build: v => { need(v.T < v.L, 'Мөр хэт өргөн'); const a = (v.L - v.T) / 2, b = a + v.T, L = v.L; return { outer: poly([[a, 0], [b, 0], [b, a], [L, a], [L, b], [b, b], [b, L], [a, L], [a, b], [0, b], [0, a], [a, a]]), holes: [] }; } },
  arrow: { cat: 'sign', label: 'Сум', f: [['L', 'Нийт урт', 300], ['W', 'Ишний өргөн', 50], ['HL', 'Толгойн урт', 100], ['HW', 'Толгойн өргөн', 140]],
    build: v => { need(v.HL < v.L && v.W < v.HW, 'Хэмжээ тохирохгүй байна'); const m = v.HW / 2, s = v.L - v.HL; return { outer: poly([[0, m - v.W / 2], [s, m - v.W / 2], [s, 0], [v.L, m], [s, v.HW], [s, m + v.W / 2], [0, m + v.W / 2]]), holes: [] }; } },
  star: { cat: 'sign', label: 'Од', f: [['N', 'Үзүүрийн тоо', 5], ['R', 'Гадна радиус', 120], ['r', 'Дотор радиус', 50]],
    build: v => { const n = Math.round(v.N); need(n >= 3 && n <= 40 && v.r < v.R, 'Утга тохирохгүй байна'); const pts = []; for (let k = 0; k < 2 * n; k++) { const t = Math.PI / 2 + k * Math.PI / n, rr = k % 2 ? v.r : v.R; pts.push([rr * Math.cos(t), rr * Math.sin(t)]); } return { outer: poly(pts), holes: [] }; } },
  heart: { cat: 'sign', label: 'Зүрх', f: [['W', 'Өргөн', 200]],
    build: v => { const pts = [], s = v.W / 32; for (let k = 0; k < 720; k++) { const t = k / 720 * TAU; pts.push([s * 16 * Math.pow(Math.sin(t), 3), s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]); } return { outer: fitPoly(pts, true, 0.03), holes: [] }; } }
};

/* ---------- DXF reading ---------- */
function dxfPairs(text) {
  const lines = text.split(/\r\n|\r|\n/), pairs = [];
  for (let i = 0; i + 1 < lines.length; i += 2) { const c = parseInt(lines[i].trim(), 10); if (isNaN(c)) { i--; continue; } pairs.push([c, lines[i + 1].trim()]); }
  return pairs;
}
function readEntities(pairs, i, endTok) {
  const list = [];
  while (i < pairs.length) {
    const c = pairs[i][0], v = pairs[i][1];
    if (c === 0 && (v === endTok || v === 'ENDSEC')) return { list, i: i + 1 };
    if (c === 0) {
      const ent = { type: v, codes: [] }; i++;
      while (i < pairs.length && pairs[i][0] !== 0) { ent.codes.push(pairs[i]); i++; }
      if (v === 'POLYLINE') {
        ent.vertices = [];
        while (i < pairs.length && pairs[i][0] === 0 && pairs[i][1] === 'VERTEX') { const vt = { codes: [] }; i++; while (i < pairs.length && pairs[i][0] !== 0) { vt.codes.push(pairs[i]); i++; } ent.vertices.push(vt); }
        if (i < pairs.length && pairs[i][1] === 'SEQEND') { i++; while (i < pairs.length && pairs[i][0] !== 0) i++; }
      }
      list.push(ent);
    } else i++;
  }
  return { list, i };
}
function parseDXF(text) {
  const pairs = dxfPairs(text);
  let units = 0;
  for (let i = 0; i < pairs.length - 1; i++) if (pairs[i][0] === 9 && pairs[i][1] === '$INSUNITS') { units = parseInt(pairs[i + 1][1], 10) || 0; break; }
  const blocks = {}; let entities = [], i = 0;
  while (i < pairs.length) {
    if (pairs[i][0] === 0 && pairs[i][1] === 'SECTION' && pairs[i + 1]) {
      const name = pairs[i + 1][1]; i += 2;
      if (name === 'ENTITIES') { const r = readEntities(pairs, i, 'ENDSEC'); entities = r.list; i = r.i; }
      else if (name === 'BLOCKS') {
        while (i < pairs.length && !(pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC')) {
          if (pairs[i][0] === 0 && pairs[i][1] === 'BLOCK') {
            let j = i + 1, bname = '', bx = 0, by = 0;
            while (j < pairs.length && pairs[j][0] !== 0) { if (pairs[j][0] === 2) bname = pairs[j][1]; if (pairs[j][0] === 10) bx = +pairs[j][1]; if (pairs[j][0] === 20) by = +pairs[j][1]; j++; }
            const r = readEntities(pairs, j, 'ENDBLK'); blocks[bname] = { base: { x: bx, y: by }, list: r.list }; i = r.i;
          } else i++;
        }
      } else { while (i < pairs.length && !(pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC')) i++; }
    } else i++;
  }
  return { units, entities, blocks };
}
function gnum(e, code, def) { for (const p of e.codes) if (p[0] === code) { const n = parseFloat(p[1]); return isNaN(n) ? (def ?? 0) : n; } return def ?? 0; }
function gstr(e, code) { for (const p of e.codes) if (p[0] === code) return p[1]; return ''; }
function deBoor(p, t, c, w, x) {
  const n = c.length; let k = p; while (k < n - 1 && x >= t[k + 1]) k++;
  const d = [];
  for (let j = 0; j <= p; j++) { const i = j + k - p, ww = w ? w[i] : 1; d.push([c[i][0] * ww, c[i][1] * ww, ww]); }
  for (let r = 1; r <= p; r++) for (let j = p; j >= r; j--) { const i = j + k - p, den = t[j + 1 + k - r] - t[i], a = den === 0 ? 0 : (x - t[i]) / den; for (let q = 0; q < 3; q++) d[j][q] = (1 - a) * d[j - 1][q] + a * d[j][q]; }
  return [d[p][0] / d[p][2], d[p][1] / d[p][2]];
}
const mmul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];

const BEND_RE = /bend|нугал|гулзай|fold|knick|biege/i;
function dxfGeometry(d) {
  const scale = { 0: 1, 1: 25.4, 2: 304.8, 4: 1, 5: 10, 6: 1000, 8: 0.0254, 9: 0.0254 }[d.units] ?? 1;
  const segs = [], loops = [], bendSegs = []; let skipped = 0, curBend = null;
  const ap = (M, x, y) => ({ x: M[0] * x + M[2] * y + M[4], y: M[1] * x + M[3] * y + M[5] });
  const det = M => M[0] * M[3] - M[1] * M[2];
  const ocs = (e, M) => gnum(e, 230, 1) < 0 ? mmul(M, [-1, 0, 0, 1, 0, 0]) : M;
  const addSeg = (M, p, q, b) => { const a = ap(M, p.x, p.y), c = ap(M, q.x, q.y); if (Math.hypot(a.x - c.x, a.y - c.y) < 1e-9) return; if (curBend) { bendSegs.push({ x1: a.x, y1: a.y, x2: c.x, y2: c.y, up: curBend.up, ang: 90 }); return; } segs.push({ a, b: c, bulge: det(M) < 0 ? -b : b }); };
  const addLoop = (M, vs) => { const s = det(M) < 0 ? -1 : 1; loops.push(vs.map(v => { const p = ap(M, v.x, v.y); return { x: p.x, y: p.y, b: v.b * s }; })); };
  const polyOut = (M, vs, closed) => {
    vs = vs.filter((v, i) => i === 0 || Math.hypot(v.x - vs[i - 1].x, v.y - vs[i - 1].y) > 1e-9 || Math.abs(vs[i - 1].b) > 1e-9);
    if (vs.length < 2) return;
    const f = vs[0], l = vs[vs.length - 1];
    if (vs.length > 2 && Math.hypot(f.x - l.x, f.y - l.y) < 1e-9) { vs.pop(); closed = true; }
    if (closed) addLoop(M, vs); else for (let i = 0; i + 1 < vs.length; i++) addSeg(M, vs[i], vs[i + 1], vs[i].b);
  };
  const ent = (e, M, depth) => {
    const lay = gstr(e, 8); if (/^defpoints$/i.test(lay)) return;
    curBend = BEND_RE.test(lay) ? { up: !/down|доош|unten/i.test(lay) } : null;
    if (curBend && !['LINE', 'LWPOLYLINE', 'POLYLINE'].includes(e.type)) return;
    switch (e.type) {
      case 'LINE': addSeg(M, { x: gnum(e, 10), y: gnum(e, 20) }, { x: gnum(e, 11), y: gnum(e, 21) }, 0); break;
      case 'ARC': {
        const m = ocs(e, M), cx = gnum(e, 10), cy = gnum(e, 20), r = gnum(e, 40), sa = gnum(e, 50) * D2R, ea = gnum(e, 51) * D2R;
        if (r <= 0) break;
        let sw = ea - sa; while (sw <= 1e-9) sw += TAU;
        if (sw >= TAU - 1e-6) addLoop(m, circleLoop(cx, cy, r));
        else addSeg(m, { x: cx + r * Math.cos(sa), y: cy + r * Math.sin(sa) }, { x: cx + r * Math.cos(ea), y: cy + r * Math.sin(ea) }, Math.tan(sw / 4));
        break;
      }
      case 'CIRCLE': { const m = ocs(e, M), r = gnum(e, 40); if (r > 0) addLoop(m, circleLoop(gnum(e, 10), gnum(e, 20), r)); break; }
      case 'LWPOLYLINE': {
        const m = ocs(e, M), vs = [];
        for (const [c, v] of e.codes) { if (c === 10) vs.push({ x: +v, y: 0, b: 0 }); else if (c === 20 && vs.length) vs[vs.length - 1].y = +v; else if (c === 42 && vs.length) vs[vs.length - 1].b = +v; }
        polyOut(m, vs, (gnum(e, 70, 0) & 1) === 1); break;
      }
      case 'POLYLINE': {
        const fl = gnum(e, 70, 0); if (fl & (16 | 64)) break;
        const m = ocs(e, M);
        const vs = (e.vertices || []).map(vt => ({ x: gnum(vt, 10), y: gnum(vt, 20), b: gnum(vt, 42, 0), f: gnum(vt, 70, 0) })).filter(v => !(v.f & 16));
        polyOut(m, vs, (fl & 1) === 1); break;
      }
      case 'SPLINE': {
        const deg = gnum(e, 71, 3), knots = [], ctrl = [], w = [], fit = []; let cur = null, fc = null;
        for (const [c, v] of e.codes) { if (c === 40) knots.push(+v); else if (c === 10) { cur = [+v, 0]; ctrl.push(cur); } else if (c === 20 && cur) cur[1] = +v; else if (c === 41) w.push(+v); else if (c === 11) { fc = [+v, 0]; fit.push(fc); } else if (c === 21 && fc) fc[1] = +v; }
        let pts = [];
        if (ctrl.length > deg && knots.length === ctrl.length + deg + 1) {
          const n = ctrl.length, u0 = knots[deg], u1 = knots[n], N = Math.min(2000, Math.max(32, n * 12));
          const ww = w.length === n ? w : null;
          for (let i = 0; i <= N; i++) { let u = u0 + (u1 - u0) * i / N; if (i === N) u = u1 - 1e-10 * Math.max(1, Math.abs(u1 - u0)); pts.push(deBoor(deg, knots, ctrl, ww, u)); }
        } else if (fit.length > 1) pts = fit; else break;
        polyOut(M, pts.map(p => ({ x: p[0], y: p[1], b: 0 })), (gnum(e, 70, 0) & 1) === 1); break;
      }
      case 'ELLIPSE': {
        const m = ocs(e, M), cx = gnum(e, 10), cy = gnum(e, 20), mx = gnum(e, 11), my = gnum(e, 21), ra = gnum(e, 40, 1);
        const t0 = gnum(e, 41, 0); let sw = gnum(e, 42, TAU) - t0; while (sw <= 1e-9) sw += TAU;
        const full = sw >= TAU - 1e-6, a = Math.hypot(mx, my);
        const N = Math.max(32, Math.min(1440, Math.ceil(a * sw / 2)));
        const pts = [];
        for (let i = 0; i <= (full ? N - 1 : N); i++) { const t = t0 + sw * i / N; pts.push({ x: cx + mx * Math.cos(t) - ra * my * Math.sin(t), y: cy + my * Math.cos(t) + ra * mx * Math.sin(t), b: 0 }); }
        polyOut(m, pts, full); break;
      }
      case 'INSERT': {
        if (depth > 8) break;
        const b = d.blocks[gstr(e, 2)]; if (!b) break;
        const ix = gnum(e, 10), iy = gnum(e, 20), sx = gnum(e, 41, 1), sy = gnum(e, 42, 1), rot = gnum(e, 50, 0) * D2R;
        const cols = Math.max(1, gnum(e, 70, 1)), rows = Math.max(1, gnum(e, 71, 1)), cs = gnum(e, 44, 0), rs = gnum(e, 45, 0);
        const m0 = ocs(e, M), c = Math.cos(rot), s = Math.sin(rot);
        for (let ci = 0; ci < cols; ci++) for (let ri = 0; ri < rows; ri++) {
          const ox = ix + ci * cs * c - ri * rs * s, oy = iy + ci * cs * s + ri * rs * c;
          walk(b.list, mmul(m0, mmul([c * sx, s * sx, -s * sy, c * sy, ox, oy], [1, 0, 0, 1, -b.base.x, -b.base.y])), depth + 1);
        }
        break;
      }
      default: break;
    }
  };
  const walk = (list, M, depth) => { for (const e of list) { try { ent(e, M, depth); } catch (err) { skipped++; } } };
  walk(d.entities, [scale, 0, 0, scale, 0, 0], 0);
  return { segs, loops, skipped, bendSegs };
}

function chainSegments(segs, tol, gapTol) {
  const used = new Uint8Array(segs.length), map = new Map();
  const kk = (x, y) => Math.round(x / tol) + ',' + Math.round(y / tol);
  const add = (k, v) => { let a = map.get(k); if (!a) { a = []; map.set(k, a); } a.push(v); };
  segs.forEach((s, i) => { add(kk(s.a.x, s.a.y), [i, 0]); add(kk(s.b.x, s.b.y), [i, 1]); });
  const find = p => {
    const kx = Math.round(p.x / tol), ky = Math.round(p.y / tol); let best = null, bd = Infinity;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const a = map.get((kx + dx) + ',' + (ky + dy)); if (!a) continue;
      for (const [i, e] of a) { if (used[i]) continue; const q = e ? segs[i].b : segs[i].a; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < bd && d <= tol * 1.5) { bd = d; best = [i, e]; } }
    }
    return best;
  };
  const near = (p, q) => Math.hypot(p.x - q.x, p.y - q.y) <= tol * 1.5;
  const loops = []; let open = 0;
  for (let s0 = 0; s0 < segs.length; s0++) {
    if (used[s0]) continue; used[s0] = 1;
    const list = [{ a: segs[s0].a, b: segs[s0].b, bulge: segs[s0].bulge }];
    let closed = false;
    for (let g = 0; g < 1e6; g++) {
      if (list.length > 1 && near(list[list.length - 1].b, list[0].a)) { closed = true; break; }
      const f = find(list[list.length - 1].b); if (!f) break; used[f[0]] = 1; const s = segs[f[0]];
      list.push(f[1] === 0 ? { a: s.a, b: s.b, bulge: s.bulge } : { a: s.b, b: s.a, bulge: -s.bulge });
    }
    if (!closed) {
      for (let g = 0; g < 1e6; g++) {
        const f = find(list[0].a); if (!f) break; used[f[0]] = 1; const s = segs[f[0]];
        list.unshift(f[1] === 1 ? { a: s.a, b: s.b, bulge: s.bulge } : { a: s.b, b: s.a, bulge: -s.bulge });
        if (near(list[list.length - 1].b, list[0].a)) { closed = true; break; }
      }
    }
    const gap = Math.hypot(list[list.length - 1].b.x - list[0].a.x, list[list.length - 1].b.y - list[0].a.y);
    if ((closed || gap <= gapTol) && (list.length > 1 || Math.abs(list[0].bulge) > 1e-9)) loops.push(list.map(s => ({ x: s.a.x, y: s.a.y, b: s.bulge })));
    else open += list.length;
  }
  return { loops, open };
}

function loopsToParts(loops, baseName, bendSegs) {
  const items = loops.map(v => { const poly = flattenLoop(v, 0.05); return { v, poly, area: Math.abs(loopArea(v)), bb: bboxPts(poly), depth: 0, parent: -1 }; })
    .filter(it => it.area > 1e-4).sort((a, b) => b.area - a.area);
  for (let i = 0; i < items.length; i++) {
    const it = items[i], p = it.poly[0];
    for (let j = i - 1; j >= 0; j--) {
      const o = items[j];
      if (it.bb.x0 >= o.bb.x0 - 1e-6 && it.bb.y0 >= o.bb.y0 - 1e-6 && it.bb.x1 <= o.bb.x1 + 1e-6 && it.bb.y1 <= o.bb.y1 + 1e-6 && pointInPoly(p[0], p[1], o.poly)) { it.parent = j; it.depth = o.depth + 1; break; }
    }
  }
  const parts = [];
  items.forEach((it, i) => {
    if (it.depth % 2) return;
    const holes = items.filter(h => h.parent === i && h.depth === it.depth + 1).map(h => h.v);
    const np = normalizePart(it.v, holes);
    const bb = bboxPts(flattenLoop(it.v, 0.05));
    const bends = (bendSegs || []).filter(b => pointInPoly((b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2, it.poly)).map(b => ({ x1: b.x1 - bb.x0, y1: b.y1 - bb.y0, x2: b.x2 - bb.x0, y2: b.y2 - bb.y0, up: b.up, ang: b.ang }));
    if (bends.length) np.bends = bends;
    parts.push(np);
  });
  // merge identical shapes (same area, cut length and size)
  const groups = [];
  for (const g of parts) {
    const inf = partInfo(g), sig = [inf.area.toFixed(1), inf.cut.toFixed(1), Math.min(inf.w, inf.h).toFixed(1), Math.max(inf.w, inf.h).toFixed(1), g.holes.length, (g.bends || []).length].join('|');
    const ex = groups.find(x => x.sig === sig);
    if (ex) ex.qty++; else groups.push({ sig, qty: 1, geom: g });
  }
  return groups.map((g, i) => ({ name: groups.length > 1 ? `${baseName}-${i + 1}` : baseName, qty: g.qty, outer: g.geom.outer, holes: g.geom.holes, bends: g.geom.bends }));
}

function importDXF(text, name) {
  const d = parseDXF(text);
  const g = dxfGeometry(d);
  const ch = chainSegments(g.segs, 0.02, 0.25);
  const parts = loopsToParts(g.loops.concat(ch.loops), name.replace(/\.dxf$/i, ''), g.bendSegs);
  return { parts, open: ch.open, skipped: g.skipped, units: d.units, bends: g.bendSegs.length };
}

/* ---------- DXF writing (R12, closed polylines keep arcs as bulges) ---------- */
function fmt(n) { return (Math.abs(n) < 5e-7 ? 0 : n).toFixed(4).replace(/\.?0+$/, '') || '0'; }
function dxfText(s) { return String(s).replace(/[^\x20-\x7e]/g, ch => '\\U+' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')); }
function dxfWriter() {
  const out = [];
  const w = (c, v) => out.push(String(c), String(v));
  return {
    loop(layer, vs) {
      if (vs.length === 2 && Math.abs(Math.abs(vs[0].b) - 1) < 1e-9 && Math.abs(vs[0].b - vs[1].b) < 1e-9) {
        w(0, 'CIRCLE'); w(8, layer); w(10, fmt((vs[0].x + vs[1].x) / 2)); w(20, fmt((vs[0].y + vs[1].y) / 2)); w(30, 0); w(40, fmt(Math.hypot(vs[0].x - vs[1].x, vs[0].y - vs[1].y) / 2)); return;
      }
      w(0, 'POLYLINE'); w(8, layer); w(66, 1); w(10, 0); w(20, 0); w(30, 0); w(70, 1);
      for (const v of vs) { w(0, 'VERTEX'); w(8, layer); w(10, fmt(v.x)); w(20, fmt(v.y)); w(30, 0); if (Math.abs(v.b) > 1e-9) w(42, fmt(v.b)); }
      w(0, 'SEQEND'); w(8, layer);
    },
    open(layer, vs) {
      w(0, 'POLYLINE'); w(8, layer); w(66, 1); w(10, 0); w(20, 0); w(30, 0); w(70, 0);
      vs.forEach((v, i) => { w(0, 'VERTEX'); w(8, layer); w(10, fmt(v.x)); w(20, fmt(v.y)); w(30, 0); if (i < vs.length - 1 && Math.abs(v.b) > 1e-9) w(42, fmt(v.b)); });
      w(0, 'SEQEND'); w(8, layer);
    },
    poly(layer, pts) { this.open(layer, pts.map(p => ({ x: p[0], y: p[1], b: 0 }))); },
    line(layer, x1, y1, x2, y2) { w(0, 'LINE'); w(8, layer); w(10, fmt(x1)); w(20, fmt(y1)); w(30, 0); w(11, fmt(x2)); w(21, fmt(y2)); w(31, 0); },
    text(layer, x, y, h, s) { w(0, 'TEXT'); w(8, layer); w(10, fmt(x)); w(20, fmt(y)); w(30, 0); w(40, fmt(h)); w(1, dxfText(s)); w(72, 1); w(11, fmt(x)); w(21, fmt(y)); w(31, 0); },
    doc() {
      const layers = [['OUTER', 7], ['INNER', 3], ['LEADIN', 4], ['BEND_UP', 5], ['BEND_DOWN', 140], ['SHEET', 8], ['TRIM', 6], ['LABEL', 2], ['MARK', 1], ['SLUG', 30], ['SKELETON', 9], ['CHAIN', 6]];
      const h = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC',
        '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LTYPE', '70', '1', '0', 'LTYPE', '2', 'CONTINUOUS', '70', '0', '3', 'Solid line', '72', '65', '73', '0', '40', '0.0', '0', 'ENDTAB',
        '0', 'TABLE', '2', 'LAYER', '70', String(layers.length)];
      for (const [n, c] of layers) h.push('0', 'LAYER', '2', n, '70', '0', '62', String(c), '6', 'CONTINUOUS');
      h.push('0', 'ENDTAB', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES');
      return h.concat(out, ['0', 'ENDSEC', '0', 'EOF']).join('\r\n') + '\r\n';
    }
  };
}
/*CORE-END*/
