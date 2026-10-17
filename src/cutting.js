/* ================= KH Fab — cutting technology: speed tables, heat order, chain cut, collision avoidance,
   slug destroy, spiral / centre leads, skeleton cut, fly-cut ================= */

/* ---------- reference cutting data (fiber laser, mm/min). Typical published charts — tune to your machine. ---------- */
const CUTDATA = {
  // carbon steel: O2 from 3 mm, air/N2 below
  cs: {
    1.5: [[1, 15000], [2, 5000], [3, 3000], [4, 2400], [5, 2000], [6, 1600], [8, 1100], [10, 900], [12, 700], [14, 600]],
    3: [[1, 28000], [2, 8000], [3, 4200], [4, 3300], [5, 2800], [6, 2400], [8, 1900], [10, 1300], [12, 1000], [14, 850], [16, 750], [20, 600]],
    6: [[1, 40000], [2, 20000], [3, 6000], [4, 4000], [5, 3500], [6, 3000], [8, 2500], [10, 2200], [12, 1800], [16, 1300], [20, 1000], [22, 900], [25, 700]],
    12: [[2, 30000], [3, 7000], [6, 3500], [8, 3000], [10, 2500], [12, 2200], [16, 1800], [20, 1400], [25, 1100], [30, 800], [40, 400]],
    20: [[3, 8000], [6, 4000], [10, 2800], [16, 2100], [20, 1700], [25, 1400], [30, 1100], [40, 600], [50, 350]]
  },
  // stainless: N2
  ss: {
    1.5: [[1, 20000], [2, 6000], [3, 2000], [4, 1200], [5, 700], [6, 400]],
    3: [[1, 30000], [2, 13000], [3, 6000], [4, 3500], [5, 2400], [6, 1600], [8, 800], [10, 500], [12, 300]],
    6: [[1, 45000], [2, 30000], [3, 18000], [4, 12000], [5, 8000], [6, 6000], [8, 3500], [10, 2000], [12, 1300], [16, 700], [20, 400]],
    12: [[3, 30000], [6, 15000], [8, 9000], [10, 6000], [12, 4500], [16, 2500], [20, 1500], [25, 900], [30, 500], [40, 250]],
    20: [[6, 22000], [10, 11000], [16, 5000], [20, 3500], [30, 1500], [40, 700], [50, 350]]
  },
  // aluminium: N2
  al: {
    1.5: [[1, 12000], [2, 4000], [3, 1000], [4, 500]],
    3: [[1, 25000], [2, 10000], [3, 5000], [4, 3000], [5, 1800], [6, 1000], [8, 500]],
    6: [[1, 40000], [2, 25000], [3, 15000], [4, 9000], [5, 7000], [6, 5000], [8, 3000], [10, 1600], [12, 1000], [16, 500]],
    12: [[3, 25000], [6, 11000], [8, 7000], [10, 5000], [12, 3500], [16, 2000], [20, 1200], [25, 700], [30, 400]],
    20: [[6, 18000], [10, 9000], [16, 4000], [20, 2600], [30, 1200], [40, 500]]
  }
};
const PIERCE_CS = [[1, 0.1], [3, 0.3], [6, 0.6], [10, 1.2], [12, 1.6], [16, 2.8], [20, 4], [25, 6], [30, 9], [40, 15], [50, 22]];
const MAT_CLS = [['cs', 'Хар ган'], ['hx', 'Hardox / элэгдэлд тэсвэртэй'], ['ss', 'Зэвэрдэггүй'], ['al', 'Хөнгөн цагаан']];
const LASER_KW = [1.5, 2, 3, 4, 6, 8, 12, 15, 20];

function matCls(m) {
  if (m && m.cls) return m.cls;
  const n = String(m && m.name || '');
  if (/зэвэрдэг|stainless|\b30[14]\b|\b316\b|aisi/i.test(n)) return 'ss';
  if (/цагаан|alum|\b5083\b|\b6061\b|\b5754\b/i.test(n)) return 'al';
  if (/hardox|strenx|quard|nm\s?[345]00|wear|элэгд/i.test(n)) return 'hx';
  return 'cs';
}
function lerpTab(tab, t) { // tab sorted [[x, y]]; null outside the top end
  if (!tab.length) return null;
  if (t <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (t <= tab[i][0] + 1e-9) { const a = tab[i - 1], b = tab[i], k = (t - a[0]) / (b[0] - a[0]); return a[1] + k * (b[1] - a[1]); }
  return null;
}
function tabMax(tab) { return tab.length ? tab[tab.length - 1][0] : 0; }
/* speed for class + power + thickness; interpolates between the two nearest power tables */
function laserSpeed(cls, kW, t) {
  const base = cls === 'hx' ? 'cs' : cls, D = CUTDATA[base] || CUTDATA.cs, ps = Object.keys(D).map(Number).sort((a, b) => a - b);
  kW = Math.max(0.5, +kW || 3);
  const at = p => ({ v: lerpTab(D[p], t), max: tabMax(D[p]) });
  let v, maxT;
  if (kW <= ps[0]) { const a = at(ps[0]), f = kW / ps[0]; v = a.v == null ? null : a.v * f; maxT = a.max * Math.sqrt(f); }
  else if (kW >= ps[ps.length - 1]) { const a = at(ps[ps.length - 1]); v = a.v; maxT = a.max; }
  else {
    let i = 1; while (ps[i] < kW) i++;
    const p1 = ps[i - 1], p2 = ps[i], k = (kW - p1) / (p2 - p1), a = at(p1), b = at(p2);
    maxT = a.max + k * (b.max - a.max);
    if (t > maxT + 1e-9) v = null;
    else if (a.v != null && b.v != null) v = a.v + k * (b.v - a.v);
    else v = b.v != null ? b.v * (0.55 + 0.45 * k) : null;
  }
  if (v != null && cls === 'hx') v *= 0.85;
  let p = (lerpTab(PIERCE_CS, t) ?? (PIERCE_CS[PIERCE_CS.length - 1][1] * t / 50)) * Math.sqrt(3 / kW);
  if (cls === 'ss' || cls === 'al') p *= 0.6; if (cls === 'hx') p *= 1.3;
  return { v: v == null ? null : Math.round(v), p: Math.max(0.05, Math.round(p * 100) / 100), maxT: Math.round(maxT * 10) / 10 };
}

/* ---------- small geometry ---------- */
function circleOf(lp) {
  if (lp.length < 2) return null;
  let cx = 0, cy = 0, r = 0, n = 0;
  for (let i = 0; i < lp.length; i++) {
    if (Math.abs(lp[i].b) < 1e-9) return null;
    const s = segArc(lp[i], lp[(i + 1) % lp.length], lp[i].b); if (s.line) return null;
    if (n && (Math.hypot(s.cx - cx / n, s.cy - cy / n) > 0.01 * s.r + 0.01 || Math.abs(s.r - r / n) > 0.01 * s.r + 0.01)) return null;
    cx += s.cx; cy += s.cy; r += s.r; n++;
  }
  return { cx: cx / n, cy: cy / n, r: r / n };
}
/* centre-pierce lead for a circular hole: a chain of half circles from the centre that ends tangentially at the start vertex.
   n = 1 is a plain centre arc lead; larger n is a spiral that also breaks the slug. */
function spiralLead(lp, c, n) {
  const S0 = lp[0], ux = (S0.x - c.cx) / c.r, uy = (S0.y - c.cy) / c.r, sg = Math.sign(lp[0].b) || -1;
  n = Math.max(1, n | 0); if (n % 2 === 0) n++;
  const pts = [];
  for (let k = 0; k <= n; k++) { const s = k === 0 ? 0 : (k % 2 ? 1 : -1) * c.r * k / n; pts.push({ x: c.cx + ux * s, y: c.cy + uy * s, b: k < n ? sg : 0 }); }
  pts[n] = { x: S0.x, y: S0.y, b: 0 };
  return pts;
}
/* parallel grid lines inside a hole polygon (slug destroy) — kept `gap` mm away from the contour */
function clipLines(poly, axis, c, gap) {
  const xs = [], o = axis === 'x' ? 0 : 1, q = 1 - o;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[o] > c) !== (b[o] > c)) xs.push(a[q] + (c - a[o]) / (b[o] - a[o]) * (b[q] - a[q]));
  }
  xs.sort((m, n) => m - n);
  const out = [];
  for (let i = 0; i + 1 < xs.length; i += 2) {
    const lo = xs[i] + gap, hi = xs[i + 1] - gap; if (hi - lo < 2 * gap) continue;
    out.push(axis === 'x' ? [c, lo, c, hi] : [lo, c, hi, c]);
  }
  return out;
}
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
  let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
function polyDist(px, py, poly) { let d = Infinity; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const e = segDist(px, py, poly[j][0], poly[j][1], poly[i][0], poly[i][1]); if (e < d) d = e; } return d; }
function slugLines(lp, minSize, step, gap) {
  const poly = flattenLoop(lp, 0.2), bb = bboxPts(poly), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0;
  if (Math.min(w, h) < minSize) return [];
  const lines = [];
  const nx = Math.floor(w / step), ny = Math.floor(h / step);
  for (let i = 1; i <= nx; i++) { const x = bb.x0 + w * i / (nx + 1); lines.push(...clipLines(poly, 'x', x, gap)); }
  for (let j = 1; j <= ny; j++) { const y = bb.y0 + h * j / (ny + 1); lines.push(...clipLines(poly, 'y', y, gap)); }
  return lines;
}
/* skeleton cut: vertical lines through scrap, every `step` mm, never closer than `clear` to a part */
function skeletonLines(s, units, step, clear, xMax) {
  const out = [], W = s.W, polys = units.map(u => ({ bb: u.bb, poly: u.flat || [[u.bb.x0, u.bb.y0], [u.bb.x1, u.bb.y0], [u.bb.x1, u.bb.y1], [u.bb.x0, u.bb.y1]] }));
  for (let x = step; x < xMax - clear; x += step) {
    const near = polys.filter(p => p.bb.x0 - clear <= x && p.bb.x1 + clear >= x);
    const free = y => near.every(p => y < p.bb.y0 - clear || y > p.bb.y1 + clear || (!pointInPoly(x, y, p.poly) && polyDist(x, y, p.poly) >= clear));
    let st = null;
    const N = Math.ceil(W), dy = W / N;
    for (let k = 0; k <= N; k++) {
      const y = k * dy, ok = free(y);
      if (ok && st == null) st = y;
      if ((!ok || k === N) && st != null) {
        const y1 = ok ? y : y - dy;
        if (y1 - st >= Math.min(30, W / 4)) out.push([x, st <= 0 ? -1 : st, x, y1 >= W - 1e-6 ? W + 1 : y1]);
        st = null;
      }
    }
  }
  return out;
}
/* axis-aligned rectangle outline? → {x0,y0,x1,y1} */
function axisRect(lp) {
  if (lp.length !== 4 || lp.some(v => Math.abs(v.b) > 1e-9)) return null;
  for (let i = 0; i < 4; i++) { const a = lp[i], b = lp[(i + 1) % 4]; if (Math.abs(a.x - b.x) > 1e-4 && Math.abs(a.y - b.y) > 1e-4) return null; }
  const xs = lp.map(v => v.x), ys = lp.map(v => v.y);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
/* fly-cut passes for a set of aligned rectangles: edges grouped by line, each pass snakes along one line */
function flyPasses(rects) {
  const H = new Map(), V = new Map(), key = v => (Math.round(v * 100) / 100).toFixed(2);
  for (const r of rects) {
    for (const y of [r.y0, r.y1]) { const k = key(y); if (!H.has(k)) H.set(k, []); H.get(k).push([r.x0, r.x1]); }
    for (const x of [r.x0, r.x1]) { const k = key(x); if (!V.has(k)) V.set(k, []); V.get(k).push([r.y0, r.y1]); }
  }
  const merge = arr => { arr.sort((a, b) => a[0] - b[0]); const o = []; for (const s of arr) { const l = o[o.length - 1]; if (l && s[0] <= l[1] + 1e-6) l[1] = Math.max(l[1], s[1]); else o.push(s.slice()); } return o; };
  const passes = [];
  [...H.entries()].sort((a, b) => +a[0] - +b[0]).forEach(([k, arr], i) => { const segs = merge(arr).map(s => [s[0], +k, s[1], +k]); if (i % 2) segs.reverse().forEach(s => s.splice(0, 4, s[2], s[3], s[0], s[1])); passes.push({ dir: 'h', segs }); });
  [...V.entries()].sort((a, b) => +a[0] - +b[0]).forEach(([k, arr], i) => { const segs = merge(arr).map(s => [+k, s[0], +k, s[1]]); if (i % 2) segs.reverse().forEach(s => s.splice(0, 4, s[2], s[3], s[0], s[1])); passes.push({ dir: 'v', segs }); });
  return passes;
}
/* does a straight link cross any part (cut or not)? used for chain cutting */
function linkClear(a, b, units) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]); if (d < 0.5) return true;
  const n = Math.max(2, Math.ceil(d / 1.5));
  for (const u of units) {
    if (Math.max(a[0], b[0]) < u.bb.x0 - 1 || Math.min(a[0], b[0]) > u.bb.x1 + 1 || Math.max(a[1], b[1]) < u.bb.y0 - 1 || Math.min(a[1], b[1]) > u.bb.y1 + 1) continue;
    for (let k = 1; k < n; k++) {
      const t = k / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
      if (Math.hypot(x - a[0], y - a[1]) < 0.4 || Math.hypot(x - b[0], y - b[1]) < 0.4) continue;
      if (x > u.bb.x0 && x < u.bb.x1 && y > u.bb.y0 && y < u.bb.y1 && (!u.flat || pointInPoly(x, y, u.flat))) return false;
    }
  }
  return true;
}
/* rapid move that steers around parts already cut free; falls back to a head lift */
function rapidRoute(from, to, freed, clear) {
  if (!freed.length || !crossesCut(from, to, freed)) return { via: null, lift: false, len: Math.hypot(to[0] - from[0], to[1] - from[1]) };
  const ok = pts => { for (let i = 1; i < pts.length; i++) if (crossesCut(pts[i - 1], pts[i], freed)) return false; return true; };
  const plen = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  const cands = [[from, [to[0], from[1]], to], [from, [from[0], to[1]], to]];
  const blockers = freed.filter(u => crossesCut(from, to, [u]));
  for (const u of blockers.slice(0, 6)) {
    const c = [[u.bb.x0 - clear, u.bb.y0 - clear], [u.bb.x1 + clear, u.bb.y0 - clear], [u.bb.x1 + clear, u.bb.y1 + clear], [u.bb.x0 - clear, u.bb.y1 + clear]];
    for (let i = 0; i < 4; i++) { cands.push([from, c[i], to]); cands.push([from, c[i], c[(i + 1) % 4], to]); cands.push([from, c[i], c[(i + 3) % 4], to]); }
  }
  let best = null, bl = Infinity;
  for (const p of cands) { const L = plen(p); if (L < bl && ok(p)) { bl = L; best = p; } }
  if (best) return { via: best.slice(1, -1), lift: false, len: bl };
  return { via: null, lift: true, len: Math.hypot(to[0] - from[0], to[1] - from[1]) };
}
