/* ---------- exact clearance checks and compaction (shared by worker and page) ---------- */
function exPD(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy; let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = t < 0 ? 0 : t > 1 ? 1 : t; return Math.hypot(px - ax - t * dx, py - ay - t * dy); }
function exSegDist(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1x = bx - ax, d1y = by - ay, d2x = dx - cx, d2y = dy - cy, den = d1x * d2y - d1y * d2x;
  if (den !== 0) { const t = ((cx - ax) * d2y - (cy - ay) * d2x) / den, u = ((cx - ax) * d1y - (cy - ay) * d1x) / den; if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0; }
  return Math.min(exPD(ax, ay, cx, cy, dx, dy), exPD(bx, by, cx, cy, dx, dy), exPD(cx, cy, ax, ay, bx, by), exPD(dx, dy, ax, ay, bx, by));
}
function exPIP(x, y, r) { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function exInMat(rings, x, y) { if (!exPIP(x, y, rings[0])) return false; for (let k = 1; k < rings.length; k++) if (exPIP(x, y, rings[k])) return false; return true; }
function exSegsOf(rings) { const a = []; for (const r of rings) for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a.push(p[0], p[1], q[0], q[1]); } return Float64Array.from(a); }
function exBB(r) { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const p of r) { if (p[0] < a) a = p[0]; if (p[1] < b) b = p[1]; if (p[0] > c) c = p[0]; if (p[1] > d) d = p[1]; } return { x0: a, y0: b, x1: c, y1: d }; }
function exKey(i, j) { return (i + 4096) * 65536 + (j + 4096); }
function exAddPart(ex, pi) {
  const P = pi < 0 ? ex.sheetPart : ex.parts[pi], s = P.segs, c = ex.cell; P.cells = [];
  for (let k = 0; k < s.length; k += 4) {
    const i0 = Math.floor(Math.min(s[k], s[k + 2]) / c), i1 = Math.floor(Math.max(s[k], s[k + 2]) / c), j0 = Math.floor(Math.min(s[k + 1], s[k + 3]) / c), j1 = Math.floor(Math.max(s[k + 1], s[k + 3]) / c);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const key = exKey(i, j); let a = ex.grid.get(key); if (!a) { a = []; ex.grid.set(key, a); } a.push(pi, k); P.cells.push(key); }
  }
}
function exRemovePart(ex, pi) {
  const P = ex.parts[pi];
  for (const key of new Set(P.cells)) { const a = ex.grid.get(key); if (!a) continue; const b = []; for (let e = 0; e < a.length; e += 2) if (a[e] !== pi) b.push(a[e], a[e + 1]); ex.grid.set(key, b); }
  P.cells = [];
}
/* parts: [{rings:[[ [x,y]... ] ...]}] in sheet coords; shape: rings of a shaped sheet or null */
function exBuild(L, W, parts, shape, gap, margin) {
  const ex = { L, W, gap: Math.max(gap, 0.05), margin, cell: Math.max(20, gap * 3, margin * 2), grid: new Map(), parts: [], shape: shape || null, sheetPart: null };
  parts.forEach((p, i) => { ex.parts.push({ rings: p.rings, segs: exSegsOf(p.rings), bb: exBB(p.rings[0]), dx: 0, dy: 0 }); exAddPart(ex, i); });
  if (shape) { ex.sheetPart = { rings: shape, segs: exSegsOf(shape), bb: exBB(shape[0]) }; exAddPart(ex, -1); }
  return ex;
}
function exValid(ex, pi, dx, dy, contain) { // pi: index of the moving unit
  const P = ex.parts[pi], bb = P.bb, m = ex.margin, g = ex.gap, c = ex.cell;
  if (bb.x0 + dx < m - 1e-9 || bb.y0 + dy < m - 1e-9 || bb.x1 + dx > ex.L - m + 1e-9 || bb.y1 + dy > ex.W - m + 1e-9) return false;
  const s = P.segs, reach = Math.max(g, ex.shape ? m : 0);
  for (let k = 0; k < s.length; k += 4) {
    const ax = s[k] + dx, ay = s[k + 1] + dy, bx = s[k + 2] + dx, by = s[k + 3] + dy;
    const x0 = Math.min(ax, bx) - reach, x1 = Math.max(ax, bx) + reach, y0 = Math.min(ay, by) - reach, y1 = Math.max(ay, by) + reach;
    const i0 = Math.floor(x0 / c), i1 = Math.floor(x1 / c), j0 = Math.floor(y0 / c), j1 = Math.floor(y1 / c);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const a = ex.grid.get(exKey(i, j)); if (!a) continue;
      for (let e = 0; e < a.length; e += 2) {
        const qi = a[e]; if (qi === pi) continue;
        const Q = qi < 0 ? ex.sheetPart : ex.parts[qi], qs = Q.segs, q = a[e + 1], need = qi < 0 ? m : g;
        const cx = qs[q], cy = qs[q + 1], ex2 = qs[q + 2], ey = qs[q + 3];
        if (Math.max(cx, ex2) < Math.min(ax, bx) - need || Math.min(cx, ex2) > Math.max(ax, bx) + need || Math.max(cy, ey) < Math.min(ay, by) - need || Math.min(cy, ey) > Math.max(ay, by) + need) continue;
        if (exSegDist(ax, ay, bx, by, cx, cy, ex2, ey) < need - 1e-7) return false;
      }
    }
  }
  if (contain) {
    const p0 = P.rings[0][0], px = p0[0] + dx, py = p0[1] + dy;
    if (ex.shape && !exInMat(ex.shape, px, py)) return false;
    for (let qi = 0; qi < ex.parts.length; qi++) {
      if (qi === pi) continue; const Q = ex.parts[qi], qb = Q.bb;
      if (qb.x1 < bb.x0 + dx || qb.x0 > bb.x1 + dx || qb.y1 < bb.y0 + dy || qb.y0 > bb.y1 + dy) continue;
      if (exInMat(Q.rings, px, py)) return false;
      const q0 = Q.rings[0][0];
      if (exInMat(P.rings, q0[0] - dx, q0[1] - dy)) return false;
    }
  }
  return true;
}
function exMove(ex, pi, dx, dy) {
  exRemovePart(ex, pi);
  const P = ex.parts[pi];
  P.rings = P.rings.map(r => r.map(p => [p[0] + dx, p[1] + dy]));
  P.segs = exSegsOf(P.rings); P.bb = exBB(P.rings[0]); P.dx += dx; P.dy += dy;
  exAddPart(ex, pi);
}
function exSlide(ex, pi, ux, uy) {
  const P = ex.parts[pi], step = Math.max(0.5, Math.min(ex.gap * 2, 4));
  const cap = ux ? P.bb.x0 : P.bb.y0;
  let t = 0;
  while (t < cap && exValid(ex, pi, ux * (t + step), uy * (t + step), true)) t += step;
  let lo = t, hi = t + step;
  for (let k = 0; k < 8; k++) { const mid = (lo + hi) / 2; if (exValid(ex, pi, ux * mid, uy * mid, true)) lo = mid; else hi = mid; }
  if (lo > 0.01) { exMove(ex, pi, ux * lo, uy * lo); return lo; }
  return 0;
}
function exCompact(ex, passes) {
  let total = 0;
  for (let p = 0; p < (passes || 3); p++) {
    let moved = 0;
    const byX = ex.parts.map((P, i) => i).sort((a, b) => ex.parts[a].bb.x0 - ex.parts[b].bb.x0);
    for (const i of byX) moved += exSlide(ex, i, -1, 0);
    const byY = ex.parts.map((P, i) => i).sort((a, b) => ex.parts[a].bb.y0 - ex.parts[b].bb.y0);
    for (const i of byY) moved += exSlide(ex, i, 0, -1);
    total += moved;
    if (moved < 0.5) break;
  }
  return total;
}
