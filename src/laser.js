/* ================= KH Fab — laser features: marking, micro-joints, checks, G-code ================= */

/* ---------- single-stroke font for laser marking (grid 4 × 6) ---------- */
const STROKE_FONT = (() => {
  const O = [[1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5], [4, 1], [3, 0], [1, 0]];
  const P = [[0, 0], [0, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]];
  return {
    '0': [[[1.2, 0], [0, 1.4], [0, 4.6], [1.2, 6], [2.8, 6], [4, 4.6], [4, 1.4], [2.8, 0], [1.2, 0]]],
    '1': [[[1, 5], [2, 6], [2, 0]], [[1, 0], [3, 0]]],
    '2': [[[0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [0, 0], [4, 0]]],
    '3': [[[0, 6], [4, 6], [2, 3.5], [3, 3.5], [4, 2.5], [4, 1], [3, 0], [1, 0], [0, 1]]],
    '4': [[[3, 0], [3, 6], [0, 2], [4, 2]]],
    '5': [[[4, 6], [0, 6], [0, 3.5], [3, 3.5], [4, 2.5], [4, 1], [3, 0], [0, 0]]],
    '6': [[[4, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1], [4, 2.5], [3, 3.5], [0, 3.5]]],
    '7': [[[0, 6], [4, 6], [1.5, 0]]],
    '8': [[[1, 3], [0, 4], [0, 5], [1, 6], [3, 6], [4, 5], [4, 4], [3, 3], [1, 3], [0, 2], [0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [3, 3]]],
    '9': [[[4, 2.5], [1, 2.5], [0, 3.5], [0, 5], [1, 6], [3, 6], [4, 5], [4, 1], [3, 0], [0, 0]]],
    '-': [[[0.5, 3], [3.5, 3]]],
    '.': [[[1.6, 0], [2.4, 0], [2.4, 0.8], [1.6, 0.8], [1.6, 0]]],
    '/': [[[0, 0], [4, 6]]],
    'A': [[[0, 0], [0, 4], [2, 6], [4, 4], [4, 0]], [[0, 2.5], [4, 2.5]]],
    'B': [[[0, 0], [0, 6], [3, 6], [4, 5], [4, 4], [3, 3], [0, 3]], [[3, 3], [4, 2], [4, 1], [3, 0], [0, 0]]],
    'C': [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1]]],
    'D': [[[0, 0], [0, 6], [2.5, 6], [4, 4.5], [4, 1.5], [2.5, 0], [0, 0]]],
    'E': [[[4, 6], [0, 6], [0, 0], [4, 0]], [[0, 3], [3, 3]]],
    'F': [[[4, 6], [0, 6], [0, 0]], [[0, 3], [3, 3]]],
    'G': [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 1], [1, 0], [3, 0], [4, 1], [4, 3], [2, 3]]],
    'H': [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
    'I': [[[1, 6], [3, 6]], [[2, 6], [2, 0]], [[1, 0], [3, 0]]],
    'J': [[[4, 6], [4, 1], [3, 0], [1, 0], [0, 1]]],
    'K': [[[0, 0], [0, 6]], [[4, 6], [0, 2.5]], [[1.3, 3.5], [4, 0]]],
    'L': [[[0, 6], [0, 0], [4, 0]]],
    'M': [[[0, 0], [0, 6], [2, 3], [4, 6], [4, 0]]],
    'N': [[[0, 0], [0, 6], [4, 0], [4, 6]]],
    'O': [O],
    'P': [P],
    'Q': [O, [[2.5, 1.5], [4, 0]]],
    'R': [P, [[2, 3], [4, 0]]],
    'S': [[[4, 5], [3, 6], [1, 6], [0, 5], [0, 4], [1, 3], [3, 3], [4, 2], [4, 1], [3, 0], [1, 0], [0, 1]]],
    'T': [[[0, 6], [4, 6]], [[2, 6], [2, 0]]],
    'U': [[[0, 6], [0, 1], [1, 0], [3, 0], [4, 1], [4, 6]]],
    'V': [[[0, 6], [2, 0], [4, 6]]],
    'W': [[[0, 6], [1, 0], [2, 3], [3, 0], [4, 6]]],
    'X': [[[0, 0], [4, 6]], [[0, 6], [4, 0]]],
    'Y': [[[0, 6], [2, 3], [4, 6]], [[2, 3], [2, 0]]],
    'Z': [[[0, 6], [4, 6], [0, 0], [4, 0]]]
  };
})();
/* text → strokes centred on (0,0); cap height h */
function markText(s, h) {
  const k = h / 6, chars = [...String(s).toUpperCase()], n = chars.length, W = Math.max(0, (n * 5 - 1) * k);
  const strokes = [];
  chars.forEach((ch, i) => { const g = STROKE_FONT[ch]; if (!g) return; const ox = i * 5 * k - W / 2; g.forEach(st => strokes.push(st.map(p => [ox + p[0] * k, p[1] * k - h / 2]))); });
  return { strokes, w: W, h };
}
function markLen(strokes) { let L = 0; strokes.forEach(st => { for (let i = 1; i < st.length; i++) L += Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]); }); return L; }

/* ---------- where does a w×h box fit inside a part (local coords)? ---------- */
function segHitsRect(a, b, r) { // Liang–Barsky: does segment touch rect r={x0,y0,x1,y1}
  let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
  const p = [-dx, dx, -dy, dy], q = [a[0] - r.x0, r.x1 - a[0], a[1] - r.y0, r.y1 - a[1]];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-12) { if (q[i] < 0) return false; continue; }
    const t = q[i] / p[i];
    if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}
function boxFree(r, outer, holes) {
  const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
  if (!pointInPoly(cx, cy, outer) || holes.some(h => pointInPoly(cx, cy, h))) return false;
  for (const ring of [outer, ...holes]) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) if (segHitsRect(ring[j], ring[i], r)) return false;
  return true;
}
/* returns {x, y, rot, h} in part-local coords or null */
function markSpot(outer, holes, text, h0, minH, clear) {
  const bb = bboxPts(outer), cx0 = (bb.x0 + bb.x1) / 2, cy0 = (bb.y0 + bb.y1) / 2;
  for (let h = h0; h >= minH - 1e-9; h = h > minH ? Math.max(minH, h * 0.75) : -1) {
    const m = markText(text, h); if (!m.w) return null;
    for (const rot of [0, 90]) {
      const bw = (rot ? m.h : m.w) + 2 * clear, bh = (rot ? m.w : m.h) + 2 * clear;
      if (bw > bb.x1 - bb.x0 || bh > bb.y1 - bb.y0) continue;
      const step = Math.max(0.5, Math.sqrt((bb.x1 - bb.x0) * (bb.y1 - bb.y0) / 2500));
      const cand = [];
      for (let x = bb.x0 + bw / 2; x <= bb.x1 - bw / 2 + 1e-9; x += step) for (let y = bb.y0 + bh / 2; y <= bb.y1 - bh / 2 + 1e-9; y += step) cand.push([x, y, (x - cx0) ** 2 + (y - cy0) ** 2]);
      cand.sort((a, b) => a[2] - b[2]);
      for (const [x, y] of cand) if (boxFree({ x0: x - bw / 2, y0: y - bh / 2, x1: x + bw / 2, y1: y + bh / 2 }, outer, holes)) return { x, y, rot, h };
    }
    if (h === minH) break;
  }
  return null;
}
/* strokes of a part's mark placed on the sheet (never mirrored, so it reads from above) */
function markOnSheet(spot, text, pl) {
  const m = markText(text, spot.h), c = xformPts([[spot.x, spot.y]], pl.ang, pl.mir, pl.tx, pl.ty)[0];
  let a = (spot.rot + pl.ang) % 360; if (a > 90 && a <= 270) a = (a + 180) % 360; // keep upright
  const r = a * D2R, cs = Math.cos(r), sn = Math.sin(r);
  return m.strokes.map(st => st.map(p => [c[0] + p[0] * cs - p[1] * sn, c[1] + p[0] * sn + p[1] * cs]));
}

/* ---------- micro-joints: split a closed bulge loop into open pieces ---------- */
function segPoint(a, b, bu, t) {
  const s = segArc(a, b, bu);
  if (s.line) return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  const sa = Math.atan2(a.y - s.cy, a.x - s.cx), an = sa + s.theta * t;
  return { x: s.cx + s.r * Math.cos(an), y: s.cy + s.r * Math.sin(an) };
}
const subBulge = (bu, f) => Math.abs(bu) < 1e-12 ? 0 : Math.tan(Math.atan(bu) * f);
function tabSegments(vs, n, gap) {
  const N = vs.length, segs = []; let L = 0;
  for (let i = 0; i < N; i++) { const len = segArc(vs[i], vs[(i + 1) % N], vs[i].b).len; segs.push({ i, len, mid: L + len / 2 }); L += len; }
  const ok = segs.filter(s => s.len >= Math.max(4 * gap, 3)), used = new Set();
  for (let k = 0; k < n && used.size < ok.length; k++) {
    const p = L * (k + 0.5) / n; let best = null, bd = Infinity;
    for (const s of ok) { if (used.has(s.i)) continue; const d = Math.min(Math.abs(s.mid - p), L - Math.abs(s.mid - p)); if (d < bd) { bd = d; best = s; } }
    if (best) used.add(best.i);
  }
  return new Map([...used].map(i => [i, Math.min(0.5, gap / segs[i].len)]));
}
function refineArcs(vs) { // split arcs > 90° so circles can carry several joints
  const out = [], N = vs.length;
  for (let i = 0; i < N; i++) {
    const a = vs[i], b = vs[(i + 1) % N], s = segArc(a, b, a.b);
    const k = s.line ? 1 : Math.ceil(Math.abs(s.theta) / (Math.PI / 2) - 1e-9);
    if (k <= 1) { out.push(a); continue; }
    const sb = subBulge(a.b, 1 / k);
    for (let j = 0; j < k; j++) { const p = j ? segPoint(a, b, a.b, j / k) : a; out.push({ x: p.x, y: p.y, b: sb }); }
  }
  return out;
}
function splitTabs(vs, n, gap) {
  if (!(n > 0) || !(gap > 0)) return null;
  vs = refineArcs(vs);
  const T = tabSegments(vs, n, gap); if (!T.size) return null;
  const N = vs.length, pieces = []; let cur = [{ x: vs[0].x, y: vs[0].y, b: 0 }];
  for (let i = 0; i < N; i++) {
    const a = vs[i], b = vs[(i + 1) % N];
    if (!T.has(i)) { cur[cur.length - 1].b = a.b; cur.push({ x: b.x, y: b.y, b: 0 }); continue; }
    const g = T.get(i), t1 = 0.5 - g / 2, t2 = 0.5 + g / 2;
    const P1 = segPoint(a, b, a.b, t1), P2 = segPoint(a, b, a.b, t2);
    cur[cur.length - 1].b = subBulge(a.b, t1); cur.push({ x: P1.x, y: P1.y, b: 0 }); pieces.push(cur);
    cur = [{ x: P2.x, y: P2.y, b: subBulge(a.b, 1 - t2) }, { x: b.x, y: b.y, b: 0 }];
  }
  pieces.push(cur);
  return pieces.filter(p => p.length > 1);
}
function openLen(vs) { let L = 0; for (let i = 0; i + 1 < vs.length; i++) L += segArc(vs[i], vs[i + 1], vs[i].b).len; return L; }
function flattenOpen(vs, tol) {
  const out = [];
  for (let i = 0; i + 1 < vs.length; i++) {
    const a = vs[i], b = vs[i + 1]; out.push([a.x, a.y]);
    if (Math.abs(a.b) > 1e-9) { const s = segArc(a, b, a.b); if (!s.line) { const sa = Math.atan2(a.y - s.cy, a.x - s.cx), step = 2 * Math.acos(Math.max(-1, 1 - Math.min(tol, s.r) / s.r)), k = Math.min(720, Math.max(2, Math.ceil(Math.abs(s.theta) / Math.max(step, 1e-3)))); for (let j = 1; j < k; j++) { const t = sa + s.theta * j / k; out.push([s.cx + s.r * Math.cos(t), s.cy + s.r * Math.sin(t)]); } } }
  }
  const l = vs[vs.length - 1]; out.push([l.x, l.y]);
  return out;
}

/* ---------- manufacturability checks ---------- */
function smallFeatures(p, thk, holeK, kerf) {
  let small = 0, tiny = 0;
  for (const h of p.holes) { const bb = bboxPts(flattenLoop(h, 0.05)); if (Math.min(bb.x1 - bb.x0, bb.y1 - bb.y0) < holeK * thk - 1e-6) small++; }
  for (const lp of [p.outer, ...p.holes]) for (let i = 0; i < lp.length; i++) if (segArc(lp[i], lp[(i + 1) % lp.length], lp[i].b).len < Math.max(kerf, 0.05)) tiny++;
  return { small, tiny };
}

/* ---------- rapid moves passing over parts that are already cut free ---------- */
function crossesCut(a, b, cutUnits) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d < 1) return 0;
  const n = Math.ceil(d / 4); let hit = 0;
  for (const u of cutUnits) {
    if (Math.max(a[0], b[0]) < u.bb.x0 || Math.min(a[0], b[0]) > u.bb.x1 || Math.max(a[1], b[1]) < u.bb.y0 || Math.min(a[1], b[1]) > u.bb.y1) continue;
    for (let k = 1; k < n; k++) { const x = a[0] + (b[0] - a[0]) * k / n, y = a[1] + (b[1] - a[1]) * k / n; if (x > u.bb.x0 && x < u.bb.x1 && y > u.bb.y0 && y < u.bb.y1 && (u.flat ? pointInPoly(x, y, u.flat) : true)) { hit++; break; } }
  }
  return hit;
}

/* ---------- G-code ---------- */
function laserDefaults() {
  return { tabN: 0, tabW: 0.6, tabMax: 0, order: 'near', strip: 300, kerf: 0.2, holeK: 1, markFeed: 6000,
    avoid: true, chain: false, chainMax: 25, chainDxf: false, slug: false, slugMin: 80, slugStep: 50, slugGap: 2, spiral: 'off', spiralMax: 60, spiralPitch: 4, skel: false, skelStep: 500, skelClear: 3, fly: false, flyMaxT: 3,
    gc: { head: '; Kh International · KH Fab\n; {job} · лист {sheet} · {mat} {thk}mm · {L}x{W}\nG21\nG90', foot: 'G00 X0 Y0\nM30', on: 'M07', off: 'M08', mOn: 'M07 ; MARK', mOff: 'M08', pierce: 'G04 P{t}', liftUp: '', liftDown: '', dec: 3, ext: 'nc' } };
}
function gcodeSheet(seq, o) {
  const c = o.gc, D = Math.max(0, Math.min(5, +c.dec || 3)), f = v => (Math.abs(v) < 5e-7 ? 0 : v).toFixed(D);
  const sub = s => String(s || '').replace(/\{(\w+)\}/g, (m, k) => o.vars[k] ?? m);
  const out = []; const line = s => { if (s) String(s).split(/\r?\n/).forEach(l => out.push(l)); };
  line(sub(c.head));
  const offLines = String(c.off || '').split(/\r?\n/).filter(Boolean);
  const feed = Math.round(o.feed), pierce = sub(String(c.pierce || '').replace('{t}', (+o.pierceSec || 0).toFixed(2)));
  const path = (vs, closed) => {
    const n = vs.length, m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const a = vs[i], b = vs[(i + 1) % n];
      if (Math.abs(a.b) > 1e-9) { const s = segArc(a, b, a.b); if (!s.line) { out.push(`${a.b > 0 ? 'G03' : 'G02'} X${f(b.x)} Y${f(b.y)} I${f(s.cx - a.x)} J${f(s.cy - a.y)}`); continue; } }
      out.push(`G01 X${f(b.x)} Y${f(b.y)}`);
    }
  };
  const rapidTo = (it, e) => {
    if (it.lift) line(c.liftUp);
    (it.via || []).forEach(v => out.push(`G00 X${f(v[0])} Y${f(v[1])}`));
    out.push(`G00 X${f(e[0])} Y${f(e[1])}`);
    if (it.lift) line(c.liftDown);
  };
  for (const it of seq) {
    if (it.type === 'mark') {
      for (const st of it.strokes) { out.push(`G00 X${f(st[0][0])} Y${f(st[0][1])}`); line(c.mOn); out.push(`G01 X${f(st[1][0])} Y${f(st[1][1])} F${Math.round(o.markFeed)}`); for (let i = 2; i < st.length; i++) out.push(`G01 X${f(st[i][0])} Y${f(st[i][1])}`); line(c.mOff); }
      continue;
    }
    if (it.type === 'line') { const l = it.line; rapidTo(it, [l[0], l[1]]); line(c.on); line(pierce); out.push(`G01 X${f(l[2])} Y${f(l[3])} F${feed}`); line(c.off); continue; }
    if (it.type === 'fly') { // flying cut: one pierce, beam toggled along the line without stopping
      it.segs.forEach((g, i) => {
        if (i === 0) { rapidTo(it, [g[0], g[1]]); line(c.on); line(pierce); }
        else { out.push(`G01 X${f(g[0])} Y${f(g[1])} F${feed}`); line(c.on); }
        out.push(`G01 X${f(g[2])} Y${f(g[3])} F${feed}`); line(c.off);
      });
      continue;
    }
    const st = it.loop[0], pieces = it.pieces || [it.loop.concat([{ x: st.x, y: st.y, b: 0 }])];
    if (it.chain) { // beam stays on from the previous contour
      if (offLines.length && offLines.every((l, i) => out[out.length - offLines.length + i] === l)) out.length -= offLines.length;
      out.push(`G01 X${f(st.x)} Y${f(st.y)} F${feed}`); path(pieces[0], false); line(c.off); continue;
    }
    pieces.forEach((pc, k) => {
      if (k === 0 && it.leadPath) { const lp = it.leadPath; rapidTo(it, [lp[0].x, lp[0].y]); line(c.on); line(pierce); out.push(`G01 F${feed}`); path(lp, false); }
      else {
        const e = k === 0 && it.lead ? it.lead : [pc[0].x, pc[0].y];
        if (k === 0) rapidTo(it, e); else out.push(`G00 X${f(e[0])} Y${f(e[1])}`);
        line(c.on); if (k === 0) line(pierce);
        if (k === 0 && it.lead) out.push(`G01 X${f(pc[0].x)} Y${f(pc[0].y)} F${feed}`);
        else out.push(`G01 F${feed}`);
      }
      path(pc, false); line(c.off);
    });
  }
  line(sub(c.foot));
  return out.join('\r\n') + '\r\n';
}
