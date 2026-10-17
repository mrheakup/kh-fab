'use strict';
/* KH Nesting — true-shape raster nesting engine (runs in a Web Worker) */
let RES = 2, MB = 0;
const FULL = { full: true };
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/* ---------- rasterisation ---------- */
function transformPts(pts, ang, mir) {
  const a = ang * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return pts.map(p => { const x = mir ? -p[0] : p[0], y = p[1]; return [x * c - y * s, x * s + y * c]; });
}

function traverse(x0, y0, x1, y1, mark) {
  let i = Math.floor(x0), j = Math.floor(y0);
  const dx = x1 - x0, dy = y1 - y0;
  const si = dx > 0 ? 1 : -1, sj = dy > 0 ? 1 : -1;
  const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity, tdy = dy !== 0 ? Math.abs(1 / dy) : Infinity;
  let tx = dx !== 0 ? (si > 0 ? (i + 1 - x0) : (x0 - i)) * tdx : Infinity;
  let ty = dy !== 0 ? (sj > 0 ? (j + 1 - y0) : (y0 - j)) * tdy : Infinity;
  mark(i, j);
  let guard = 0;
  while ((tx <= 1 || ty <= 1) && guard++ < 1e6) {
    if (Math.abs(tx - ty) < 1e-12) { mark(i + si, j); mark(i, j + sj); i += si; j += sj; tx += tdx; ty += tdy; }
    else if (tx < ty) { i += si; tx += tdx; }
    else { j += sj; ty += tdy; }
    mark(i, j);
  }
}

function rasterCover(rings, res) {
  let maxx = 0, maxy = 0;
  for (const r of rings) for (const p of r) { if (p[0] > maxx) maxx = p[0]; if (p[1] > maxy) maxy = p[1]; }
  const cw = Math.max(1, Math.ceil(maxx / res - 1e-9)), ch = Math.max(1, Math.ceil(maxy / res - 1e-9));
  const g = new Uint8Array(cw * ch);
  for (let j = 0; j < ch; j++) {
    const yc = (j + 0.5) * res, xs = [];
    for (const r of rings) {
      const n = r.length;
      for (let k = 0; k < n; k++) {
        const p = r[k], q = r[(k + 1) % n];
        if ((p[1] <= yc) !== (q[1] <= yc)) xs.push(p[0] + (yc - p[1]) * (q[0] - p[0]) / (q[1] - p[1]));
      }
    }
    xs.sort((a, b) => a - b);
    for (let m = 0; m + 1 < xs.length; m += 2) {
      const i0 = Math.max(0, Math.ceil(xs[m] / res - 0.5)), i1 = Math.min(cw - 1, Math.floor(xs[m + 1] / res - 0.5));
      for (let i = i0; i <= i1; i++) g[j * cw + i] = 1;
    }
  }
  const mark = (i, j) => {
    if (i < 0) i = 0; else if (i >= cw) i = cw - 1;
    if (j < 0) j = 0; else if (j >= ch) j = ch - 1;
    g[j * cw + i] = 1;
  };
  for (const r of rings) {
    const n = r.length;
    for (let k = 0; k < n; k++) { const p = r[k], q = r[(k + 1) % n]; traverse(p[0] / res, p[1] / res, q[0] / res, q[1] / res, mark); }
  }
  return { cw, ch, g };
}

function dilate(cov, Rr) {
  const r = Math.ceil(Rr), W = cov.cw + 2 * r, H = cov.ch + 2 * r, d = new Uint8Array(W * H);
  const half = [];
  for (let dy = -r; dy <= r; dy++) { const v = Rr * Rr - dy * dy; half.push(v >= 0 ? Math.floor(Math.sqrt(v)) : -1); }
  const { cw, ch, g } = cov;
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    if (!g[j * cw + i]) continue;
    const edge = i === 0 || j === 0 || i === cw - 1 || j === ch - 1 || !g[j * cw + i - 1] || !g[j * cw + i + 1] || !g[(j - 1) * cw + i] || !g[(j + 1) * cw + i];
    if (!edge) { d[(j + r) * W + i + r] = 1; continue; }
    for (let k = 0; k <= 2 * r; k++) {
      const h = half[k]; if (h < 0) continue;
      const row = (j + k) * W, a = i + r - h, b = i + r + h;
      for (let x = a; x <= b; x++) d[row + x] = 1;
    }
  }
  return { r, W, H, d };
}

function colSpans(g, W, H) {
  const idx = new Int32Array(W + 1), sp = [];
  for (let i = 0; i < W; i++) {
    idx[i] = sp.length / 2;
    let j = 0;
    while (j < H) {
      if (g[j * W + i]) { const s = j; while (j < H && g[j * W + i]) j++; sp.push(s, j - 1); } else j++;
    }
  }
  idx[W] = sp.length / 2;
  return { idx, sp: Int32Array.from(sp) };
}

function buildVariant(t, ang, mir, Rr, pip) {
  const outer = transformPts(t.outer, ang, mir), holes = t.holes.map(h => transformPts(h, ang, mir));
  let minx = Infinity, miny = Infinity;
  for (const p of outer) { if (p[0] < minx) minx = p[0]; if (p[1] < miny) miny = p[1]; }
  const sh = pts => pts.map(p => [p[0] - minx, p[1] - miny]);
  const o = sh(outer), hs = holes.map(sh);
  const cov = rasterCover(pip ? [o, ...hs] : [o], RES);
  const dil = dilate(cov, Rr);
  const c = colSpans(cov.g, cov.cw, cov.ch), d = colSpans(dil.d, dil.W, dil.H);
  return {
    ang, mir, ox: -minx, oy: -miny, cw: cov.cw, ch: cov.ch, r: dil.r, Wd: dil.W, Hd: dil.H,
    cIdx: c.idx, cSp: c.sp, dIdx: d.idx, dSp: d.sp, key: t.id + '|' + ang + '|' + (mir ? 1 : 0), lastHit: 0
  };
}

/* ---------- sheets ---------- */
const pool = new Map();
function makeSheet(Lmm, Wmm, shape) {
  const Wc = Math.max(1, Math.floor(Lmm / RES + 1e-9)), Hc = Math.max(1, Math.min(65000, Math.floor(Wmm / RES + 1e-9)));
  const fr = new Uint16Array(Wc * Hc), or = new Uint16Array(Wc * Hc);
  for (let X = 0; X < Wc; X++) { const b = X * Hc; for (let y = 0; y < Hc; y++) fr[b + y] = Hc - y; }
  const sh = { Lmm, Wmm, Wc, Hc, fr, or, ptr: new Map(), placed: [], right: 0, kind: 'std', remId: null, key: Lmm + 'x' + Wmm };
  if (shape) {
    // cells that are not fully inside the material (outside, in a defect, or on its edge) are blocked; then grown by the margin
    const fill = { cw: Math.ceil(Lmm / RES), ch: Math.ceil(Wmm / RES) }, cw = Math.min(fill.cw, Wc), ch = Math.min(fill.ch, Hc);
    const onlyFill = new Uint8Array(fill.cw * fill.ch);
    for (let j = 0; j < fill.ch; j++) {
      const yc = (j + 0.5) * RES, xs = [];
      for (const r of shape) { const n = r.length; for (let k = 0; k < n; k++) { const p = r[k], q = r[(k + 1) % n]; if ((p[1] <= yc) !== (q[1] <= yc)) xs.push(p[0] + (yc - p[1]) * (q[0] - p[0]) / (q[1] - p[1])); } }
      xs.sort((a, b) => a - b);
      for (let m = 0; m + 1 < xs.length; m += 2) { const i0 = Math.max(0, Math.ceil(xs[m] / RES - 0.5)), i1 = Math.min(fill.cw - 1, Math.floor(xs[m + 1] / RES - 0.5)); for (let i = i0; i <= i1; i++) onlyFill[j * fill.cw + i] = 1; }
    }
    const blocked = new Uint8Array(Wc * Hc);
    for (let j = 0; j < Hc; j++) for (let i = 0; i < Wc; i++) blocked[j * Wc + i] = (i < cw && j < ch && onlyFill[j * fill.cw + i]) ? 0 : 1;
    const mk = (i, j) => { if (i >= 0 && j >= 0 && i < Wc && j < Hc) blocked[j * Wc + i] = 1; };
    for (const r of shape) { const n = r.length; for (let k = 0; k < n; k++) { const p = r[k], q = r[(k + 1) % n]; traverse(p[0] / RES, p[1] / RES, q[0] / RES, q[1] / RES, mk); } }
    const g = MB > 0 ? dilate({ cw: Wc, ch: Hc, g: blocked }, MB) : null;
    for (let X = 0; X < Wc; X++) {
      const b = X * Hc; let any = false;
      for (let y = 0; y < Hc; y++) { const bl = g ? g.d[(y + g.r) * g.W + X + g.r] : blocked[y * Wc + X]; if (bl) { fr[b + y] = 0; any = true; } }
      if (any) recomputeCol(sh, X);
    }
    sh.key = 'shape';
  }
  return sh;
}
function getSheet(L, W, shape, key) {
  const k = key || (L + 'x' + W), a = pool.get(k);
  if (a && a.length) return a.pop();
  const s = makeSheet(L, W, shape); s.key = k; return s;
}
function releaseSheet(sh) {
  while (sh.placed.length) unplaceLast(sh);
  sh.ptr = new Map(); sh.right = 0;
  const k = sh.key;
  let a = pool.get(k); if (!a) { a = []; pool.set(k, a); }
  if (a.length < 6) a.push(sh);
}
function recomputeCol(sh, X) {
  const H = sh.Hc, b = X * H, fr = sh.fr, or = sh.or;
  let f = 0, o = 0;
  for (let y = H - 1; y >= 0; y--) {
    if (fr[b + y] === 0) { o++; f = 0; } else { f++; o = 0; }
    fr[b + y] = f; or[b + y] = o;
  }
}
function place(sh, v, x, y, tid) {
  const H = sh.Hc, r = v.r;
  for (let i = 0; i < v.cw; i++) {
    const X = x + r + i, base = X * H;
    for (let k = v.cIdx[i]; k < v.cIdx[i + 1]; k++) {
      const s = y + r + v.cSp[2 * k], e = y + r + v.cSp[2 * k + 1];
      for (let Y = s; Y <= e; Y++) sh.fr[base + Y] = 0;
    }
    recomputeCol(sh, X);
  }
  sh.placed.push({ tid, v, x, y });
  const right = x + r + v.cw; if (right > sh.right) sh.right = right;
}
function unplaceLast(sh) {
  const p = sh.placed.pop(); if (!p) return;
  const { v, x, y } = p, r = v.r, H = sh.Hc;
  for (let i = 0; i < v.cw; i++) {
    const X = x + r + i, base = X * H;
    for (let k = v.cIdx[i]; k < v.cIdx[i + 1]; k++) {
      const s = y + r + v.cSp[2 * k], e = y + r + v.cSp[2 * k + 1];
      for (let Y = s; Y <= e; Y++) sh.fr[base + Y] = 1;
    }
    recomputeCol(sh, X);
  }
  let m = 0; for (const q of sh.placed) { const rr = q.x + q.v.r + q.v.cw; if (rr > m) m = rr; }
  sh.right = m;
}

/* first-fit search in column-major order (leftmost x, then lowest y), resumable */
function findPos(sh, v, sx, sy) {
  const H = sh.Hc, Wc = sh.Wc, fr = sh.fr, or = sh.or, r = v.r;
  const xmin = MB - r, xmax = Wc - MB - r - v.cw, ymin = MB - r, ymax = H - MB - r - v.ch;
  if (xmax < xmin || ymax < ymin) return null;
  let x = sx == null ? xmin : Math.max(sx, xmin);
  let y0 = sy == null ? ymin : Math.max(sy, ymin);
  const idx = v.dIdx, sp = v.dSp, Wd = v.Wd;
  for (; x <= xmax; x++) {
    let y = y0; y0 = ymin;
    scan: while (y <= ymax) {
      const j0 = v.lastHit < Wd ? v.lastHit : 0;
      for (let c = 0; c < Wd; c++) {
        const jj = c === 0 ? j0 : (c <= j0 ? c - 1 : c);
        const X = x + jj;
        if (X < 0 || X >= Wc) continue;
        const base = X * H;
        for (let k = idx[jj], ke = idx[jj + 1]; k < ke; k++) {
          const s0 = sp[2 * k];
          let a = y + s0, b = y + sp[2 * k + 1];
          if (a < 0) a = 0; if (b >= H) b = H - 1;
          if (a > b) continue;
          const f = fr[base + a];
          if (f >= b - a + 1) continue;
          const Y = a + f, ny = Y + or[base + Y] - s0;
          v.lastHit = jj;
          y = ny > y ? ny : y + 1;
          continue scan;
        }
      }
      return { x, y };
    }
  }
  return null;
}

function tryPlace(sh, vars, mode, tid) {
  let best = null, b0 = 0, b1 = 0, b2 = 0;
  for (const v of vars) {
    const p = sh.ptr.get(v.key);
    if (p === FULL) continue;
    const pos = findPos(sh, v, p ? p.x : null, p ? p.y : null);
    if (!pos) { sh.ptr.set(v.key, FULL); continue; }
    sh.ptr.set(v.key, pos);
    const right = pos.x + v.r + v.cw;
    let s0, s1, s2;
    if (mode === 'left') { s0 = pos.x; s1 = pos.y; s2 = right; }
    else if (mode === 'low') { s0 = pos.y + v.ch; s1 = pos.x; s2 = right; }
    else { s0 = Math.max(0, right - sh.right); s1 = pos.x; s2 = pos.y; }
    if (!best || s0 < b0 || (s0 === b0 && (s1 < b1 || (s1 === b1 && s2 < b2)))) { best = { v, pos }; b0 = s0; b1 = s1; b2 = s2; }
  }
  if (!best) return false;
  place(sh, best.v, best.pos.x, best.pos.y, tid);
  return true;
}

/* ---------- one complete nesting pass ---------- */
function runNest(order, strat, stock, opt) {
  const sheets = [], open = [], unplaced = {};
  const rems = stock.rems.map(r => ({ ...r, left: r.qty }));
  let remIdx = 0;
  const newSheet = () => {
    while (remIdx < rems.length && rems[remIdx].left <= 0) remIdx++;
    let s;
    if (remIdx < rems.length) { const r = rems[remIdx]; r.left--; s = getSheet(r.L, r.W, r.shape, r.shape ? 'rem:' + r.id : null); s.kind = 'rem'; s.remId = r.id; s.shapeRings = r.shape || null; }
    else if (stock.std) { s = getSheet(stock.std.L, stock.std.W); s.kind = 'std'; s.remId = null; s.shapeRings = null; }
    else return null;
    sheets.push(s); open.push(s);
    if (open.length > 5) open.shift();
    return s;
  };
  for (const t of order) {
    const vars = strat.lock && t.lock ? t.lock : t.vars;
    let rem = t.qty;
    if (opt.keep && rem > 0) {
      for (const s of open) {
        const snap = new Map(s.ptr); let c = 0;
        while (c < rem && tryPlace(s, vars, strat.mode, t.id)) c++;
        if (c === rem) { rem = 0; break; }
        for (let k = 0; k < c; k++) unplaceLast(s);
        s.ptr = snap;
      }
    }
    let guard = 0;
    while (rem > 0 && guard++ < 100000) {
      if (!opt.keep) {
        for (const s of open) { while (rem > 0 && tryPlace(s, vars, strat.mode, t.id)) rem--; if (!rem) break; }
        if (!rem) break;
      }
      const s = newSheet();
      if (!s) { unplaced[t.id] = (unplaced[t.id] || 0) + rem; rem = 0; break; }
      const snap = new Map(s.ptr); let c = 0;
      while (rem - c > 0 && tryPlace(s, vars, strat.mode, t.id)) c++;
      if (opt.keep && s.kind === 'rem' && c < rem) { for (let k = 0; k < c; k++) unplaceLast(s); s.ptr = snap; continue; }
      rem -= c;
      if (c === 0 && s.kind === 'std') { unplaced[t.id] = (unplaced[t.id] || 0) + rem; rem = 0; break; }
    }
  }
  return { sheets, unplaced };
}

function scoreRun(run, opt) {
  const used = run.sheets.filter(s => s.placed.length);
  let un = 0; for (const k in run.unplaced) un += run.unplaced[k];
  let area = 0;
  used.forEach((s, i) => {
    let L = s.Lmm;
    const last = i === used.length - 1;
    if (opt.trim && s.kind === 'std' && (opt.trimAll || last)) L = Math.min(L, s.right * RES + opt.margin);
    area += L * s.Wmm * (s.kind === 'rem' ? 0.6 : 1);
  });
  return un * 1e13 + used.length * 1e3 + area;
}

function scoreExtract(ex, opt) {
  let un = 0; for (const k in ex.unplaced) un += ex.unplaced[k];
  let area = 0;
  ex.sheets.forEach((s, i) => {
    let L = s.L;
    if (opt.trim && s.kind === 'std' && (opt.trimAll || i === ex.sheets.length - 1)) L = Math.min(L, s.rightMM + opt.margin);
    area += L * s.W * (s.kind === 'rem' ? 0.6 : 1);
  });
  return un * 1e13 + ex.sheets.length * 1e3 + area;
}
function compactExtract(ex, typeMap, S) {
  for (const s of ex.sheets) {
    const parts = s.pl.map(pl => { const t = typeMap.get(pl.id); const tf = pts => transformPts(pts, pl.ang, pl.mir).map(p => [p[0] + pl.tx, p[1] + pl.ty]); return { rings: [tf(t.outer), ...t.holes.map(tf)] }; });
    const shape = s.shape ? s.shape : null;
    const E = exBuild(s.L, s.W, parts, shape, S.gap + 2 * S.sagTol, S.margin);
    exCompact(E, 3);
    let right = 0;
    s.pl.forEach((pl, i) => { const P = E.parts[i]; pl.tx += P.dx; pl.ty += P.dy; if (P.bb.x1 > right) right = P.bb.x1; });
    s.rightMM = right;
  }
}
function extract(run) {
  const used = run.sheets.filter(s => s.placed.length);
  return {
    sheets: used.map(s => ({
      L: s.Lmm, W: s.Wmm, kind: s.kind, remId: s.remId, rightMM: s.right * RES, shape: s.shapeRings || null,
      pl: s.placed.map(p => ({ id: p.tid, ang: p.v.ang, mir: p.v.mir, tx: (p.x + p.v.r) * RES + p.v.ox, ty: (p.y + p.v.r) * RES + p.v.oy }))
    })),
    unplaced: run.unplaced
  };
}
function releaseRun(run) { for (const s of run.sheets) releaseSheet(s); }

function computeLocks(types, std) {
  if (!std) return;
  const sh = getSheet(std.L, std.W);
  for (const t of types) {
    t.lock = null;
    if (t.qty < 2 || t.vars.length < 2) continue;
    const k = Math.min(t.qty, 24);
    let best = null, bs = Infinity;
    for (const v of t.vars) {
      if (v.mir) continue;
      let c = 0;
      while (c < k && tryPlace(sh, [v], 'left', t.id)) c++;
      const sc = (k - c) * 1e9 + (c ? sh.right / c : 1e8);
      if (sc < bs) { bs = sc; best = v; }
      while (sh.placed.length) unplaceLast(sh);
      sh.ptr = new Map(); sh.right = 0;
    }
    if (best) {
      const twin = t.vars.filter(v => !v.mir && v !== best && Math.abs(((v.ang - best.ang) % 360 + 360) % 360 - 180) < 1e-6);
      t.lock = [best, ...twin];
    }
  }
  releaseSheet(sh);
}

const ORDERS = {
  area: t => t.area,
  bbox: t => t.bw * t.bh,
  side: t => Math.max(t.bw, t.bh)
};
function sortTypes(types, key) {
  const f = ORDERS[key];
  return types.slice().sort((a, b) => (b.prio - a.prio) || (f(b) - f(a)));
}

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function nestGroup(g, S, budgetMs, progress, gi, gn, wid, nw, rnd) {
  const N = { fast: 1500, normal: 3000, fine: 5000 }[S.prec] || 3000;
  const cands = g.stock.std.slice();
  let maxSide = 0;
  for (const c of cands) maxSide = Math.max(maxSide, c.L, c.W);
  for (const r of g.stock.rems) maxSide = Math.max(maxSide, r.L, r.W);
  if (!maxSide) throw new Error('Листийн хэмжээ сонгогдоогүй байна');
  RES = Math.min(10, Math.max(0.3, maxSide / N));
  MB = Math.ceil(S.margin / RES - 1e-9);
  const Rr = (S.gap + 2 * S.sagTol) / RES + 1.42;
  pool.clear();
  const typeMap = new Map(g.types.map(t => [t.id, t]));
  const types = g.types.map(t => {
    const vars = [];
    for (const a of t.angles) {
      vars.push(buildVariant(t, a, false, Rr, S.pip));
      if (t.mirror) vars.push(buildVariant(t, a, true, Rr, S.pip));
    }
    return { id: t.id, qty: t.qty, prio: t.prio || 0, area: t.area, bw: t.bw, bh: t.bh, vars, lock: null };
  });
  const opt = { keep: S.keep, trim: S.trim, trimAll: S.trimScope === 'all', margin: S.margin };
  const t0 = nowMs();
  let best = null, bestScore = Infinity, bestStd = null, bestOrder = null, bestStrat = null;
  const alts = new Map(); // best layout per (sheet size, strategy) — offered to the user as alternatives
  const tryRun = (order, strat, std) => {
    const run = runNest(order, strat, { rems: g.stock.rems, std }, opt);
    const sc = scoreRun(run, opt);
    if (sc < bestScore) { best = extract(run); bestScore = sc; bestStd = std; bestOrder = order; bestStrat = strat; }
    const ak = `${std ? std.L + 'x' + std.W : 'rem'}|${strat.mode}|${strat.lock ? 1 : 0}`, a = alts.get(ak);
    if (!a || sc < a.sc) alts.set(ak, { sc, std, strat, ex: sc === bestScore ? best : extract(run) });
    releaseRun(run);
    return sc;
  };
  // 1) sheet size: same deterministic trial in every worker, so all agree
  const list = cands.length ? cands : [null];
  const base = sortTypes(types, 'area');
  list.forEach((std, i) => {
    if (wid === 0) progress(`${g.label}: ${std ? std.L + '×' + std.W : 'үлдэгдэл'} лист туршиж байна`, (gi + 0.25 * (i + 1) / list.length) / gn);
    tryRun(base, { mode: 'len', lock: false }, std);
  });
  // 2) optimise on the chosen size
  computeLocks(types, bestStd);
  const strats = [];
  for (const mode of ['len', 'left', 'low']) for (const lock of [true, false]) strats.push({ mode, lock });
  const orders = ['area', 'bbox', 'side'].map(k => sortTypes(types, k));
  const queue = [];
  for (const o of orders) for (const st of strats) queue.push([o, st]);
  const mine = queue.filter((q, i) => i % nw === wid);
  let runs = list.length, qi = 0;
  const deadline = t0 + budgetMs;
  const n = types.length;
  while (nowMs() < deadline || qi === 0) {
    let o, st;
    if (qi < mine.length) { [o, st] = mine[qi++]; }
    else {
      qi++;
      o = bestOrder.slice();
      const r = rnd();
      if (n > 1) {
        if (r < 0.5) { const i = Math.floor(rnd() * n), j = Math.floor(rnd() * n); const tmp = o[i]; o[i] = o[j]; o[j] = tmp; }
        else if (r < 0.8) { const i = Math.floor(rnd() * n), j = Math.floor(rnd() * n); const [x] = o.splice(i, 1); o.splice(j, 0, x); }
        else { const i = Math.floor(rnd() * (n - 1)); const seg = o.splice(i, 2 + Math.floor(rnd() * 3)); o.splice(Math.floor(rnd() * (o.length + 1)), 0, ...seg.reverse()); }
      }
      st = rnd() < 0.55 ? bestStrat : strats[Math.floor(rnd() * strats.length)];
      if (n <= 1 && qi > mine.length + strats.length) break;
    }
    tryRun(o, st, bestStd);
    runs++;
    if (wid === 0) progress(`${g.label}: оновчлол — ${runs * nw} хувилбар`, (gi + 0.25 + 0.65 * Math.min(1, (nowMs() - t0) / Math.max(1, budgetMs))) / gn);
  }
  pool.clear();
  // 3) exact compaction of the best layout
  if (wid === 0) progress(`${g.label}: партуудыг нарийн шахаж байна`, (gi + 0.93) / gn);
  compactExtract(best, typeMap, S);
  const score = scoreExtract(best, opt);
  // alternatives: other sheet sizes / strategies, compacted too (time-boxed)
  const out = [], seen = new Set(), tA = nowMs();
  [...alts.values()].sort((a, b) => a.sc - b.sc).forEach(a => {
    if (a.ex === best || out.length >= 7 || nowMs() - tA > Math.max(400, budgetMs * 0.25) || (a.sc >= 1e13 && score < 1e13)) return;
    const sig = `${a.std ? a.std.L + 'x' + a.std.W : 'rem'}|${a.ex.sheets.length}|${Math.round(a.sc / 5e3)}`; if (seen.has(sig)) return; seen.add(sig);
    compactExtract(a.ex, typeMap, S);
    out.push({ std: a.std, strat: a.strat, score: scoreExtract(a.ex, opt), ...a.ex });
  });
  return { key: g.key, std: bestStd, strat: bestStrat, res: RES, runs, score, ...best, alts: out };
}

self.onmessage = e => {
  const { job, wid = 0, nw = 1, seed = 1 } = e.data;
  try {
    const rnd = mulberry32(seed);
    const out = [];
    const total = job.groups.length;
    const per = Math.max(300, (job.S.optTime * 1000) / Math.max(1, total));
    job.groups.forEach((g, gi) => {
      out.push(nestGroup(g, job.S, per, (msg, frac) => self.postMessage({ type: 'progress', msg, frac }), gi, total, wid, nw, rnd));
    });
    self.postMessage({ type: 'done', groups: out, wid });
  } catch (err) {
    self.postMessage({ type: 'error', msg: String((err && err.message) || err), wid });
  }
};
