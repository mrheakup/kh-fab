/* ================= KH Bending: flat pattern, tooling, force, sequence ================= */
const RM_DEFAULT = { 'Ст3 / S235': 420, 'S355 / 09Г2С': 510, 'Hardox 450': 1400, 'Зэвэрдэггүй 304': 620, 'Хөнгөн цагаан 5083': 290, 'Цайрдсан': 400 };
function bendDefaults() {
  const dies = [6, 8, 10, 12, 16, 20, 24, 32, 40, 50, 63, 80, 100, 125].map(v => ({ id: 'V' + v, name: `V${v} 88°`, V: v, ang: 88 }));
  return {
    machine: { name: 'Нугалах пресс', ton: 100, len: 3100, bgMax: 600, finger: 60 },
    punches: [
      { id: 'P1', name: 'Шулуун пуансон 88° R0.8', ang: 88, r: 0.8, h: 120, w: 14, goose: false },
      { id: 'P2', name: 'Шулуун пуансон 88° R3', ang: 88, r: 3, h: 120, w: 18, goose: false },
      { id: 'P3', name: 'Хүзүүт пуансон 88° R1', ang: 88, r: 1, h: 120, w: 14, goose: true, throat: 55 }
    ],
    dies,
    profiles: [],
    cur: null
  };
}
function sampleProfiles() {
  return [
    { id: uid(), name: 'П суваг 100×60', mat: 'Ст3 / S235', thk: 3, len: 1500, qty: 10, dims: 'out', flanges: [60, 100, 60], bends: [{ ang: 90, dir: 'up' }, { ang: 90, dir: 'up' }], dieId: '', punchId: '', k: null, r: null },
    { id: uid(), name: 'Z профиль', mat: 'Ст3 / S235', thk: 4, len: 1200, qty: 6, dims: 'out', flanges: [50, 120, 50], bends: [{ ang: 90, dir: 'up' }, { ang: 90, dir: 'down' }], dieId: '', punchId: '', k: null, r: null },
    { id: uid(), name: 'C профиль (буцаалттай)', mat: 'Ст3 / S235', thk: 2, len: 2000, qty: 8, dims: 'out', flanges: [20, 50, 120, 50, 20], bends: [{ ang: 90, dir: 'up' }, { ang: 90, dir: 'up' }, { ang: 90, dir: 'up' }, { ang: 90, dir: 'up' }], dieId: '', punchId: '', k: null, r: null }
  ];
}
const BT = { 'L': { flanges: [80, 80], bends: [{ ang: 90, dir: 'up' }] }, 'П': { flanges: [50, 100, 50], bends: [{ ang: 90, dir: 'up' }, { ang: 90, dir: 'up' }] }, 'Z': { flanges: [50, 100, 50], bends: [{ ang: 90, dir: 'up' }, { ang: 90, dir: 'down' }] }, 'C': { flanges: [20, 50, 100, 50, 20], bends: [{ ang: 90, dir: 'up' }, { ang: 90, dir: 'up' }, { ang: 90, dir: 'up' }, { ang: 90, dir: 'up' }] }, 'Малгай': { flanges: [30, 40, 80, 40, 30], bends: [{ ang: 90, dir: 'down' }, { ang: 90, dir: 'up' }, { ang: 90, dir: 'up' }, { ang: 90, dir: 'down' }] }, 'Налуу': { flanges: [100, 100], bends: [{ ang: 45, dir: 'up' }] } };

function rmOf(mat) { const m = matOf(mat); return m.rm || RM_DEFAULT[mat] || 420; }
function recV(t) { return t <= 3 ? 6 * t : t <= 8.5 ? 8 * t : t <= 11 ? 10 * t : 12 * t; }
/* DIN 6935 neutral axis: k = 0.65 + 0.5·log10(r/s) (≤1), neutral fibre at k·s/2 from the inside */
function kFactor(R, t) { const k = Math.min(1, Math.max(0.5, 0.65 + 0.5 * Math.log10(Math.max(R, 0.01) / t))); return k / 2; }
function tonnage(rm, t, Lmm, V) { return 650 * (rm / 450) * t * t * (Lmm / 1000) / V / 9.81; } // metric tonnes (from P[kN] = 650·S²·L[m]/V at σb 450)

function bendCalc(p) {
  const B = S.bend, t = +p.thk, rm = rmOf(p.mat), warn = [];
  const n = p.bends.length;
  // die: chosen or recommended, enlarged until force fits the machine
  let die = B.dies.find(d => d.id === p.dieId);
  const rec = recV(t);
  if (!die) {
    const sorted = B.dies.slice().sort((a, b) => Math.abs(a.V - rec) - Math.abs(b.V - rec));
    die = sorted[0];
    const ok = B.dies.filter(d => d.V >= rec * 0.75 && tonnage(rm, t, p.len, d.V) <= B.machine.ton * 0.9).sort((a, b) => Math.abs(a.V - rec) - Math.abs(b.V - rec) || b.V - a.V);
    if (ok.length) die = ok[0];
  }
  const punch = B.punches.find(x => x.id === p.punchId) || (p.bends.length > 2 ? B.punches.find(x => x.goose) : null) || B.punches[0];
  const V = die ? die.V : rec;
  let Rauto = Math.max(0.16 * V * Math.max(1, rm / 450), punch ? punch.r : 0);
  const R = p.r > 0 ? +p.r : Math.round(Rauto * 10) / 10;
  const K = p.k > 0 ? +p.k : kFactor(R, t);
  const bends = p.bends.map(b => {
    const th = Math.min(179, Math.max(1, +b.ang)) * D2R, R_i = b.r > 0 ? +b.r : R, K_i = p.k > 0 ? +p.k : kFactor(R_i, t);
    const OSSB = Math.tan(th / 2) * (R_i + t), ISSB = Math.tan(th / 2) * R_i, BA = th * (R_i + K_i * t), BD = 2 * OSSB - BA;
    return { ang: +b.ang, dir: b.dir, R: R_i, K: K_i, OSSB, ISSB, BA, BD, ton: tonnage(rm, t, p.len, V) * (+b.ang > 90 ? 1.0 : 1) };
  });
  const sb = i => (i >= 0 && i < n) ? (p.dims === 'in' ? bends[i].ISSB : bends[i].OSSB) : 0;
  const seg = p.flanges.map((L, i) => +L - sb(i - 1) - sb(i));
  seg.forEach((s, i) => { if (s < 0) warn.push(`${i + 1}-р мөр хэт богино (тэгш хэсэг ${nf(s, 1)} мм)`); });
  let flat = 0; const pos = [];
  seg.forEach((s, i) => { flat += s; if (i < n) { pos.push(flat + bends[i].BA / 2); flat += bends[i].BA; } });
  const minFl = 0.71 * V;
  p.flanges.forEach((L, i) => { const outer = p.dims === 'in' ? +L + t : +L; if ((i === 0 || i === p.flanges.length - 1) && outer < minFl) warn.push(`${i + 1}-р мөр ${nf(outer, 1)} мм < хамгийн бага ${nf(minFl, 1)} мм (V${V})`); });
  const tonMax = bends.reduce((a, b) => Math.max(a, b.ton), 0);
  if (tonMax > B.machine.ton) warn.push(`Хүч ${nf(tonMax, 1)} т > машины ${B.machine.ton} т`);
  if (p.len > B.machine.len) warn.push(`Нугалах урт ${p.len} мм > машины ${B.machine.len} мм`);
  if (!die) warn.push('Матриц сонгогдоогүй');
  if (V < rec * 0.7) warn.push(`V${V} нь ${t} мм-д хэт нарийн (зөвлөмж ≈ V${Math.round(rec)})`);
  return { t, rm, die, punch, V, R, K, bends, seg, flat, pos, minFl, tonMax, rec, warn, kg: flat * p.len * t * matOf(p.mat).rho / 1e6 };
}

/* ---- 2D bend simulation for sequence planning ---- */
function chainPts(p, c, from, step, sign, done, startAng) {
  // walks flanges away from bend index; returns points [x,y] along the outside line
  const pts = [[0, 0]]; let ang = startAng, x = 0, y = 0;
  const idxs = step > 0 ? [...Array(p.flanges.length - from).keys()].map(k => from + k) : [...Array(from + 1).keys()].map(k => from - k);
  idxs.forEach((fi, k) => {
    if (k > 0) { const bi = step > 0 ? fi - 1 : fi; if (done.has(bi)) { const s = (p.bends[bi].dir === 'up' ? 1 : -1) * sign; ang += (step > 0 ? 1 : -1) * s * p.bends[bi].ang * D2R; } }
    const L = (k === 0 || k === idxs.length - 1) ? +p.flanges[fi] : +p.flanges[fi];
    const len = (k === 0 ? L - (step > 0 ? 0 : 0) : L);
    const seglen = k === 0 ? (step > 0 ? +p.flanges[fi] : +p.flanges[fi]) : len;
    x += Math.cos(ang) * seglen; y += Math.sin(ang) * seglen; pts.push([x, y]);
  });
  return pts;
}
function simulateBend(p, c, bi, done, frac, mirror) {
  // part turned so bend bi bends upward; mirror swaps front and back; frac 0..1 of the bend
  const sign = p.bends[bi].dir === 'up' ? 1 : -1, th = p.bends[bi].ang * D2R * frac;
  let left = chainPts(p, c, bi, -1, sign, done, Math.PI - th / 2), right = chainPts(p, c, bi + 1, 1, sign, done, th / 2);
  if (mirror) { const m = ch => ch.map(q => [-q[0], q[1]]); [left, right] = [m(right), m(left)]; }
  return { left, right, sign, mirror: !!mirror };
}
function punchHit(c, x, y) {
  // straight punch: blade |x| < w/2 up to h, tool holder above. gooseneck: blade only near the tip, body set back (+x) by the throat depth
  const pw = (c.punch ? c.punch.w : 14) / 2, ph = c.punch ? c.punch.h : 120;
  if (y <= c.t + 2) return null;
  if (c.punch && c.punch.goose) {
    const g = c.punch.throat || 55, low = ph * 0.45;
    if (y < low) return Math.abs(x) < pw ? 'пуансон' : null;
    if (y < ph) return (x > g - pw && x < g + pw) || (y < low + pw * 2 && x > -pw && x < g + pw) ? 'пуансон' : null;
    return Math.abs(x - g) < 35 ? 'пуансоны эзэмшигч' : null;
  }
  if (y < ph) return Math.abs(x) < pw ? 'пуансон' : null;
  return Math.abs(x) < 35 ? 'пуансоны эзэмшигч' : null;
}
function collisions(p, c, sim) {
  const V = c.V, hits = [], near = (c.punch ? c.punch.w : 14) * 1.2 + c.t + 2;
  const test = (a, b, skipStart) => {
    const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
    for (let k = skipStart ? 1 : 0; k <= n; k++) {
      const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n;
      if (Math.hypot(x, y) < near) continue;
      if (y < -1 && Math.abs(x) > V / 2 + 1) return 'матриц/ширээ';
      const h = punchHit(c, x, y); if (h) return h;
    }
    return null;
  };
  for (const ch of [sim.left, sim.right]) for (let i = 0; i + 1 < ch.length; i++) { const h = test(ch[i], ch[i + 1], i === 0); if (h) hits.push(h); }
  return [...new Set(hits)];
}
function backGauge(p, c, sim) {
  // back gauge stands behind the die (+x): distance from the bend line to the rear edge resting on the fingers
  const ch = sim.right, f = S.bend.machine.finger;
  let X = 0;
  for (let i = 1; i < ch.length; i++) { const q = ch[i]; if (q[1] > f || q[1] < -1) break; X = Math.max(X, Math.abs(q[0])); }
  return X;
}
function planSequence(p, c) {
  const n = p.bends.length; if (!n) return { steps: [], ok: true };
  const idx = [...Array(n).keys()];
  const perms = []; const permute = (a, l) => { if (perms.length > 5040) return; if (l === a.length) { perms.push(a.slice()); return; } for (let i = l; i < a.length; i++) { [a[l], a[i]] = [a[i], a[l]]; permute(a, l + 1); [a[l], a[i]] = [a[i], a[l]]; } };
  if (n <= 7) permute(idx, 0); else perms.push(idx.slice(0, Math.ceil(n / 2)).concat(idx.slice(Math.ceil(n / 2)).reverse()));
  let best = null;
  const B = S.bend.machine;
  for (const order of perms) {
    const done = new Set(); let cost = 0, flips = 0, turns = 0; const steps = [];
    for (const bi of order) {
      let pick = null;
      for (const mirror of [false, true]) {
        const sim0 = simulateBend(p, c, bi, done, 0, mirror);
        const hits = [...new Set([...collisions(p, c, simulateBend(p, c, bi, done, 1, mirror)), ...collisions(p, c, simulateBend(p, c, bi, done, 0.5, mirror))])];
        const X = backGauge(p, c, sim0), bad = X <= 0 || X > B.bgMax;
        const sc = hits.length * 1000 + (bad ? 200 : 0) + (steps.length && steps[steps.length - 1].mirror !== mirror ? 5 : 0) + X * 0.01;
        if (!pick || sc < pick.sc) pick = { sc, hits, X: bad && X > B.bgMax ? X : X, mirror, sign: sim0.sign };
      }
      const prev = steps[steps.length - 1];
      const flip = !!prev && pick.sign !== prev.sign, turn = !!prev && pick.mirror !== prev.mirror;
      if (flip) flips++; if (turn) turns++;
      cost += pick.sc;
      steps.push({ bi, hits: pick.hits, X: pick.X, mirror: pick.mirror, flip, turn, sign: pick.sign, ton: c.bends[bi].ton });
      done.add(bi);
    }
    cost += flips * 30 + turns * 10;
    if (!best || cost < best.cost) best = { order, steps, cost, flips, turns };
  }
  best.ok = best.steps.every(s => !s.hits.length);
  return best;
}

/* ---- drawing helpers ---- */
function profilePolyline(p, c) {
  // outside line of the finished profile; turned so the longest flange lies flat at the bottom
  let ang = 0, x = 0, y = 0; const pts = [[0, 0]], angs = [];
  p.flanges.forEach((L, i) => { angs.push(ang); x += Math.cos(ang) * L; y += Math.sin(ang) * L; pts.push([x, y]); if (i < p.bends.length) ang += (p.bends[i].dir === 'up' ? 1 : -1) * p.bends[i].ang * D2R; });
  let li = 0; p.flanges.forEach((L, i) => { if (+L > +p.flanges[li]) li = i; });
  const r = -angs[li], cs = Math.cos(r), sn = Math.sin(r);
  let q = pts.map(v => [v[0] * cs - v[1] * sn, v[0] * sn + v[1] * cs]);
  const yb = q[li][1], above = q.reduce((a, v) => a + (v[1] - yb), 0);
  if (above < -1e-6) q = q.map(v => [v[0], -v[1]]);
  return q;
}
function fitBox(pts, w, h, pad) { const bb = bboxPts(pts), sc = Math.min((w - 2 * pad) / Math.max(1e-6, bb.x1 - bb.x0), (h - 2 * pad) / Math.max(1e-6, bb.y1 - bb.y0)); return { sc, ox: (w - (bb.x1 - bb.x0) * sc) / 2 - bb.x0 * sc, oy: (h + (bb.y1 - bb.y0) * sc) / 2 + bb.y0 * sc }; }
function prepCanvas(cv) { const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h); return { x, w, h }; }
function drawProfile(cv, p, c, pal) {
  const { x, w, h } = cv.getContext ? prepCanvas(cv) : cv;
  const pts = profilePolyline(p, c); if (pts.length < 2) return;
  const T = fitBox(pts, w, h, pal.mini ? 6 : Math.min(40, w * 0.12)), X = q => T.ox + q[0] * T.sc, Y = q => T.oy - q[1] * T.sc;
  const fs = pal.fs || 12, k = pal.lw || 1;
  x.lineJoin = 'round'; x.lineCap = 'butt'; x.strokeStyle = pal.part; x.lineWidth = Math.max(3 * k, c.t * T.sc);
  x.beginPath(); pts.forEach((q, i) => i ? x.lineTo(X(q), Y(q)) : x.moveTo(X(q), Y(q))); x.stroke();
  if (pal.mini) return;
  x.fillStyle = pal.ink; x.font = `500 ${fs}px ${pal.font}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], mx = (X(a) + X(b)) / 2, my = (Y(a) + Y(b)) / 2, dx = X(b) - X(a), dy = Y(b) - Y(a), l = Math.hypot(dx, dy) || 1;
    const nx = dy / l * fs * 1.3, ny = -dx / l * fs * 1.3;
    x.fillText(`${nf(+p.flanges[i], 1)}`, mx + nx, my + ny);
  }
  x.fillStyle = pal.accent; x.font = `600 ${fs * 0.9}px ${pal.font}`;
  for (let i = 1; i + 1 < pts.length; i++) { const b = p.bends[i - 1]; x.beginPath(); x.arc(X(pts[i]), Y(pts[i]), fs * 0.75, 0, TAU); x.fill(); x.fillStyle = '#fff'; x.fillText(String(i), X(pts[i]), Y(pts[i])); x.fillStyle = pal.accent; }
}
function drawFlat(cv, p, c, pal) {
  // flat width (with bend lines) across; bend length shown up the canvas, compressed when long
  const { x, w, h } = cv.getContext ? prepCanvas(cv) : cv;
  const fs = pal.fs || 11, k = pal.lw || 1, W = c.flat, L = +p.len;
  const padX = fs * 3, sc = (w - 2 * padX) / Math.max(1, W), hh = Math.min(L * sc, h - fs * 9), ox = padX, oy = h / 2 + hh / 2 + fs;
  x.fillStyle = pal.sheet; x.fillRect(ox, oy - hh, W * sc, hh); x.strokeStyle = pal.ink; x.lineWidth = 1.2 * k; x.strokeRect(ox, oy - hh, W * sc, hh);
  if (hh < L * sc - 1) { x.strokeStyle = pal.sheet; x.lineWidth = 3 * k; const ym = oy - hh / 2; x.beginPath(); x.moveTo(ox - 2, ym); x.lineTo(ox + W * sc + 2, ym); x.stroke(); x.strokeStyle = pal.ink; x.lineWidth = 0.8 * k; x.beginPath(); x.moveTo(ox - 4, ym - 3 * k); x.lineTo(ox + 4, ym + 3 * k); x.moveTo(ox + W * sc - 4, ym - 3 * k); x.lineTo(ox + W * sc + 4, ym + 3 * k); x.stroke(); }
  x.setLineDash([6 * k, 4 * k]); x.lineWidth = 1.2 * k;
  c.pos.forEach((d, i) => { x.strokeStyle = p.bends[i].dir === 'up' ? pal.accent : pal.blue; x.beginPath(); x.moveTo(ox + d * sc, oy); x.lineTo(ox + d * sc, oy - hh); x.stroke(); });
  x.setLineDash([]);
  x.textAlign = 'center';
  c.pos.forEach((d, i) => {
    const row = i % 2, X = ox + d * sc;
    x.fillStyle = p.bends[i].dir === 'up' ? pal.accent : pal.blue; x.font = `600 ${fs * 0.9}px ${pal.font}`;
    x.textBaseline = 'bottom'; x.fillText(`${i + 1} ${p.bends[i].dir === 'up' ? '↑' : '↓'}${p.bends[i].ang}°`, X, oy - hh - fs * 0.3 - row * fs * 1.15);
    x.textBaseline = 'top'; x.font = `500 ${fs * 0.85}px ${pal.font}`; x.fillText(nf(d, 1), X, oy + fs * 0.3 + row * fs * 1.05);
  });
  x.fillStyle = pal.ink; x.font = `500 ${fs}px ${pal.font}`; x.textBaseline = 'top';
  x.fillText(`дэлгэмэл ${nf(W, 2)} мм`, ox + W * sc / 2, oy + fs * 2.6);
  x.save(); x.translate(ox - fs * 0.5, oy - hh / 2); x.rotate(-Math.PI / 2); x.textBaseline = 'bottom'; x.fillText(`${nf(L)} мм`, 0, 0); x.restore();
}
function drawSim(cv, p, c, plan, k, pal) {
  const { x, w, h } = cv.getContext ? prepCanvas(cv) : cv;
  if (!plan.steps.length) return;
  const st = plan.steps[Math.min(k, plan.steps.length - 1)], done = new Set(plan.steps.slice(0, Math.min(k, plan.steps.length - 1)).map(s => s.bi));
  const sim = simulateBend(p, c, st.bi, done, 1, st.mirror);
  const all = sim.left.concat(sim.right).concat([[-c.V * 1.5, -c.V], [c.V * 1.5, (c.punch ? c.punch.h : 120)]]);
  const T = fitBox(all, w, h, 20), X = q => T.ox + q[0] * T.sc, Y = q => T.oy - q[1] * T.sc;
  // die
  const V = c.V, dw = Math.max(V * 1.6, 30), dh = V * 0.9;
  x.fillStyle = pal.tool; x.beginPath(); x.moveTo(X([-dw, 0]), Y([0, 0])); x.lineTo(X([-V / 2, 0]), Y([0, 0])); x.lineTo(X([0, -V / 2 / Math.tan(44 * D2R)]), Y([0, -V / 2 / Math.tan(44 * D2R)])); x.lineTo(X([V / 2, 0]), Y([0, 0])); x.lineTo(X([dw, 0]), Y([0, 0])); x.lineTo(X([dw, -dh]), Y([0, -dh])); x.lineTo(X([-dw, -dh]), Y([0, -dh])); x.closePath(); x.fill();
  // punch
  const pw = (c.punch ? c.punch.w : 14) / 2, ph = c.punch ? c.punch.h : 120, P = [];
  if (c.punch && c.punch.goose) { const g = c.punch.throat || 55, low = ph * 0.45; P.push([0, c.t], [-pw, c.t + pw], [-pw, low + pw * 2], [g - pw, low + pw * 2], [g - pw, ph + 30], [g + pw + 20, ph + 30], [g + pw, ph], [g + pw, low], [pw, low], [pw, c.t + pw]); }
  else P.push([0, c.t], [-pw, c.t + pw], [-pw, ph], [-30, ph], [-30, ph + 30], [30, ph + 30], [30, ph], [pw, ph], [pw, c.t + pw]);
  x.beginPath(); P.forEach((q, i) => i ? x.lineTo(X(q), Y(q)) : x.moveTo(X(q), Y(q))); x.closePath(); x.fill();
  // part
  x.strokeStyle = st.hits.length ? pal.bad : pal.part; x.lineWidth = Math.max(2.5 * (pal.lw || 1), c.t * T.sc); x.lineJoin = 'round';
  for (const ch of [sim.left, sim.right]) { x.beginPath(); ch.forEach((q, i) => i ? x.lineTo(X(q), Y(q)) : x.moveTo(X(q), Y(q))); x.stroke(); }
  // back gauge
  if (st.X > 0) { const gw = Math.max(3 * (pal.lw || 1), 6 * T.sc); x.fillStyle = pal.blue; x.fillRect(X([st.X, 0]), Y([0, S.bend.machine.finger]), gw, S.bend.machine.finger * T.sc); }
}
