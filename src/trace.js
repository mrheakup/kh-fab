/* ================= KH Fab — sketch / photo → parts: perspective fix, threshold, contour trace, arcs, AI dimension reading ================= */
const TR = { img: null, src: null, work: null, k: 0, corners: [], ref: [], mode: '', loops: [], parts: [], scale: 0, ai: null, view: null };
const PAPER = { A4: [210, 297], A3: [297, 420], A5: [148, 210], Letter: [216, 279] };

/* ---------- image helpers ---------- */
function trCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function trGray(cv) {
  const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data, g = new Float32Array(cv.width * cv.height);
  for (let i = 0; i < g.length; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  return g;
}
async function trLoadFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Зураг нээгдсэнгүй — JPG, PNG эсвэл WebP файл сонгоно уу')); i.src = url; });
    const M = 1800, f = Math.min(1, M / Math.max(im.naturalWidth, im.naturalHeight));
    const c = trCanvas(Math.round(im.naturalWidth * f), Math.round(im.naturalHeight * f));
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return c;
  } finally { URL.revokeObjectURL(url); }
}
/* homography: maps dst rectangle pixels → src photo pixels */
function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = dst[i], [u, v] = src[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  for (let c = 0; c < 8; c++) { // gaussian elimination
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) { if (r === c) continue; const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
  }
  return b.map((v, i) => v / A[i][i]).concat([1]);
}
function orderCorners(pts) {
  const cx = pts.reduce((a, p) => a + p[0], 0) / 4, cy = pts.reduce((a, p) => a + p[1], 0) / 4;
  const s = pts.slice().sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx)); // TL first after rotation
  let i0 = 0, best = Infinity; s.forEach((p, i) => { const d = p[0] + p[1]; if (d < best) { best = d; i0 = i; } });
  return [0, 1, 2, 3].map(k => s[(i0 + k) % 4]); // TL, TR, BR, BL (clockwise in image space)
}
function rectify(src, corners, paper, k) {
  let [PW, PH] = paper;
  const q = orderCorners(corners), wTop = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]), hL = Math.hypot(q[3][0] - q[0][0], q[3][1] - q[0][1]);
  if ((wTop > hL) !== (PW > PH)) [PW, PH] = [PH, PW];
  const W = Math.round(PW * k), H = Math.round(PH * k), Hm = homography(q, [[0, 0], [W, 0], [W, H], [0, H]]);
  const sd = src.getContext('2d').getImageData(0, 0, src.width, src.height), S0 = sd.data, sw = src.width, sh = src.height;
  const out = trCanvas(W, H), od = out.getContext('2d').createImageData(W, H), D = od.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const z = Hm[6] * x + Hm[7] * y + 1, u = (Hm[0] * x + Hm[1] * y + Hm[2]) / z, v = (Hm[3] * x + Hm[4] * y + Hm[5]) / z;
    const o = (y * W + x) * 4;
    if (u < 0 || v < 0 || u >= sw - 1 || v >= sh - 1) { D[o] = D[o + 1] = D[o + 2] = 255; D[o + 3] = 255; continue; }
    const x0 = u | 0, y0 = v | 0, fx = u - x0, fy = v - y0, i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
    for (let c = 0; c < 3; c++) D[o + c] = (S0[i00 + c] * (1 - fx) + S0[i10 + c] * fx) * (1 - fy) + (S0[i01 + c] * (1 - fx) + S0[i11 + c] * fx) * fy;
    D[o + 3] = 255;
  }
  out.getContext('2d').putImageData(od, 0, 0);
  return out;
}
/* adaptive threshold (local mean via integral image) → ink mask */
function inkMask(cv, C, win) {
  const w = cv.width, h = cv.height, g = trGray(cv), I = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) { let row = 0; for (let x = 0; x < w; x++) { row += g[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row; } }
  const r = Math.max(4, win >> 1), m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r), y1 = Math.min(h, y + r + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r), x1 = Math.min(w, x + r + 1), n = (y1 - y0) * (x1 - x0);
      const mean = (I[y1 * (w + 1) + x1] - I[y0 * (w + 1) + x1] - I[y1 * (w + 1) + x0] + I[y0 * (w + 1) + x0]) / n;
      m[y * w + x] = g[y * w + x] < mean - C ? 1 : 0;
    }
  }
  return m;
}
function dilate(m, w, h, r) {
  if (r < 1) return m;
  let a = m;
  for (let k = 0; k < r; k++) {
    const b = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; b[i] = a[i] || (x > 0 && a[i - 1]) || (x < w - 1 && a[i + 1]) || (y > 0 && a[i - w]) || (y < h - 1 && a[i + w]) ? 1 : 0; }
    a = b;
  }
  return a;
}
/* 4-connected labelling of pixels where sel(i) is true */
function labels(w, h, sel) {
  const L = new Int32Array(w * h).fill(-1), comps = [], st = new Int32Array(w * h);
  for (let s = 0; s < w * h; s++) {
    if (L[s] >= 0 || !sel(s)) continue;
    const id = comps.length; let n = 0, top = 0, x0 = w, y0 = h, x1 = 0, y1 = 0, border = false;
    st[top++] = s; L[s] = id;
    while (top) {
      const i = st[--top], x = i % w, y = (i / w) | 0; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (!x || !y || x === w - 1 || y === h - 1) border = true;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const j of nb) if (j >= 0 && L[j] < 0 && sel(j)) { L[j] = id; st[top++] = j; }
    }
    comps.push({ id, n, x0, y0, x1, y1, border });
  }
  return { L, comps };
}
/* boundary loops of one labelled component (pixel-corner polygons, 4-connectivity) */
function traceComp(L, w, h, c) {
  const W = c.x1 - c.x0 + 3, H = c.y1 - c.y0 + 3, VW = W + 1, out1 = new Int32Array(VW * (H + 1)).fill(-1), out2 = new Int32Array(VW * (H + 1)).fill(-1);
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h && L[y * w + x] === c.id;
  const add = (ax, ay, bx, by) => { const a = (ay - c.y0 + 1) * VW + (ax - c.x0 + 1), b = (by - c.y0 + 1) * VW + (bx - c.x0 + 1); if (out1[a] < 0) out1[a] = b; else out2[a] = b; };
  for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) {
    if (!inside(x, y)) continue;
    if (!inside(x, y - 1)) add(x, y, x + 1, y);
    if (!inside(x + 1, y)) add(x + 1, y, x + 1, y + 1);
    if (!inside(x, y + 1)) add(x + 1, y + 1, x, y + 1);
    if (!inside(x - 1, y)) add(x, y + 1, x, y);
  }
  const loops = [], vx = v => v % VW + c.x0 - 1, vy = v => ((v / VW) | 0) + c.y0 - 1;
  for (let s = 0; s < out1.length; s++) {
    while (out1[s] >= 0 || out2[s] >= 0) {
      const pts = []; let v = s, px = 0, py = 0, guard = 0;
      do {
        let nx;
        if (out1[v] >= 0 && out2[v] >= 0) { // ambiguous corner: take the right turn (keeps diagonal pixels apart)
          const rx = -py, ry = px, a = out1[v], ax = vx(a) - vx(v), ay = vy(a) - vy(v);
          if (ax === rx && ay === ry) { nx = a; out1[v] = out2[v]; out2[v] = -1; } else { nx = out2[v]; out2[v] = -1; }
        } else if (out1[v] >= 0) { nx = out1[v]; out1[v] = -1; } else { nx = out2[v]; out2[v] = -1; }
        pts.push([vx(v), vy(v)]); px = vx(nx) - vx(v); py = vy(nx) - vy(v); v = nx;
      } while (v !== s && ++guard < 4e6);
      // drop collinear staircase midpoints
      const q = pts.filter((p, i) => { const a = pts[(i - 1 + pts.length) % pts.length], b = pts[(i + 1) % pts.length]; return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]) !== 0; });
      if (q.length >= 4) loops.push(q);
    }
  }
  return loops;
}
const trPolyArea = p => { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]); return a / 2; };
function smoothLoop(p, step, win, passes) {
  // resample along the perimeter, then circular moving average
  const out = []; let L = 0; const n = p.length;
  for (let i = 0; i < n; i++) L += Math.hypot(p[(i + 1) % n][0] - p[i][0], p[(i + 1) % n][1] - p[i][1]);
  const m = Math.max(8, Math.round(L / step)); let seg = 0, acc = 0, segL = Math.hypot(p[1 % n][0] - p[0][0], p[1 % n][1] - p[0][1]);
  for (let k = 0; k < m; k++) {
    const t = k * L / m;
    while (acc + segL < t && seg < n - 1) { acc += segL; seg++; segL = Math.hypot(p[(seg + 1) % n][0] - p[seg][0], p[(seg + 1) % n][1] - p[seg][1]); }
    const f = segL ? (t - acc) / segL : 0, a = p[seg], b = p[(seg + 1) % n];
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  let q = out;
  for (let r = 0; r < passes; r++) q = q.map((_, i) => { let x = 0, y = 0; for (let d = -win; d <= win; d++) { const o = q[(i + d + q.length) % q.length]; x += o[0]; y += o[1]; } return [x / (2 * win + 1), y / (2 * win + 1)]; });
  return q;
}
function dpSimplify(pts, tol) {
  if (pts.length < 4) return pts;
  // closed: split at the two farthest points
  let ia = 0, ib = 0, bd = -1; for (let i = 0; i < pts.length; i += Math.max(1, pts.length >> 6)) for (let j = i + 1; j < pts.length; j += Math.max(1, pts.length >> 6)) { const d = (pts[i][0] - pts[j][0]) ** 2 + (pts[i][1] - pts[j][1]) ** 2; if (d > bd) { bd = d; ia = i; ib = j; } }
  const run = (a, b) => { const seq = []; for (let i = a; ; i = (i + 1) % pts.length) { seq.push(pts[i]); if (i === b) break; } return seq; };
  const dp = s => {
    if (s.length < 3) return s;
    let mi = 0, md = 0; const a = s[0], b = s[s.length - 1];
    for (let i = 1; i < s.length - 1; i++) { const d = segDist(s[i][0], s[i][1], a[0], a[1], b[0], b[1]); if (d > md) { md = d; mi = i; } }
    return md > tol ? dp(s.slice(0, mi + 1)).slice(0, -1).concat(dp(s.slice(mi))) : [a, b];
  };
  return dp(run(ia, ib)).slice(0, -1).concat(dp(run(ib, ia)).slice(0, -1));
}
function offsetLoop(pts, d) {
  if (!window.ClipperLib || Math.abs(d) < 0.05) return pts;
  const S = 100, path = pts.map(p => ({ X: Math.round(p[0] * S), Y: Math.round(p[1] * S) }));
  if (!ClipperLib.Clipper.Orientation(path)) path.reverse();
  const co = new ClipperLib.ClipperOffset(2, 0.25 * S); co.AddPath(path, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const res = new ClipperLib.Paths(); co.Execute(res, d * S);
  if (!res.length) return pts;
  res.sort((a, b) => Math.abs(ClipperLib.Clipper.Area(b)) - Math.abs(ClipperLib.Clipper.Area(a)));
  return res[0].map(p => [p.X / S, p.Y / S]);
}

/* ---------- main analysis: work canvas → pixel loops ---------- */
function traceLoops(cv, o) {
  const w = cv.width, h = cv.height;
  const ink0 = inkMask(cv, o.C, o.win), band = Math.max(3, Math.round(0.012 * Math.min(w, h)));
  // paper edges / table shadow are not part of the drawing
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < band || y < band || x >= w - band || y >= h - band) ink0[y * w + x] = 0;
  const ink = dilate(ink0, w, h, o.close);
  const minA = Math.max(30, o.minArea * w * h / 1e4);
  let inkN = 0, edges = 0; for (let i = 0; i < w * h; i++) if (ink0[i]) { inkN++; const x = i % w; if (x < w - 1 && !ink0[i + 1]) edges++; if (i + w < w * h && !ink0[i + w]) edges++; }
  const stroke = edges ? Math.max(1, Math.min(12, 2 * inkN / edges)) : 2; // ≈ 2·area / perimeter
  const loops = [];
  if (o.fill) {
    const { L, comps } = labels(w, h, i => ink[i] === 1);
    for (const c of comps) { if (c.n < minA / 6 || c.border) continue; traceComp(L, w, h, c).forEach(p => { if (Math.abs(trPolyArea(p)) >= minA / 4) loops.push({ px: p, off: 0 }); }); }
  } else {
    const { L, comps } = labels(w, h, i => ink[i] === 0);
    for (const c of comps) {
      if (c.border || c.n < minA / 6) continue;
      const ls = traceComp(L, w, h, c); if (!ls.length) continue;
      ls.sort((a, b) => Math.abs(trPolyArea(b)) - Math.abs(trPolyArea(a)));
      loops.push({ px: ls[0], off: stroke / 2 + o.close }); // inner edge of the stroke → centre line
    }
  }
  // small closed loops are kept only inside a bigger outline (holes); standalone ones are text or specks
  const big = loops.map(l => ({ l, a: Math.abs(trPolyArea(l.px)), bb: bboxPts(l.px) })).sort((a, b) => b.a - a.a);
  const keep = big.filter((it, i) => it.a >= minA || big.slice(0, i).some(o => o.a > 4 * it.a && it.bb.x0 >= o.bb.x0 && it.bb.x1 <= o.bb.x1 && it.bb.y0 >= o.bb.y0 && it.bb.y1 <= o.bb.y1 && pointInPoly(it.l.px[0][0], it.l.px[0][1], o.l.px))).map(it => it.l);
  // the sheet of paper itself (photo not straightened): a huge outline that only frames the drawing
  if (keep.length > 1) { const a0 = Math.abs(trPolyArea(keep[0].px)); if (a0 > 0.3 * w * h) keep.shift(); }
  return { loops: keep, stroke, ink: ink0, w, h };
}
/* pixel loops → mm parts */
function loopsToMm(res, s, tolPx) {
  const H = res.h, mm = [];
  for (const l of res.loops) {
    let p = smoothLoop(l.px, 1, 2, 2);
    p = offsetLoop(p, l.off);
    p = dpSimplify(p, Math.max(0.4, tolPx * 0.6));
    if (p.length < 3) continue;
    const q = p.map(v => [v[0] * s, (H - v[1]) * s]);
    const fitted = fitPoly(smoothLoop(q, Math.max(0.3, s), 1, 1), true, Math.max(0.05, tolPx * s));
    if (fitted.length >= 2 && Math.abs(loopArea(fitted)) > 1) mm.push(fitted);
  }
  return mm;
}

/* ---------- AI dimension reading (Anthropic API, user's own key, desktop) ---------- */
function aiCfg() { try { return Object.assign({ key: '', model: 'claude-sonnet-5-5' }, JSON.parse(localStorage.getItem('kh-ai') || '{}')); } catch (e) { return { key: '', model: 'claude-sonnet-5-5' }; } }
function aiSave(c) { try { localStorage.setItem('kh-ai', JSON.stringify(c)); } catch (e) { } }
async function aiReadDims(cv) {
  const c = aiCfg(); if (!c.key) throw new Error('AI түлхүүр (API key) оруулаагүй байна');
  const f = Math.min(1, 1568 / Math.max(cv.width, cv.height)), sc = trCanvas(Math.round(cv.width * f), Math.round(cv.height * f));
  sc.getContext('2d').drawImage(cv, 0, 0, sc.width, sc.height);
  const b64 = sc.toDataURL('image/jpeg', 0.9).split(',')[1];
  const prompt = `This is a hand-drawn sheet-metal part sketch (image ${sc.width}x${sc.height} px). Read every handwritten dimension. Reply with JSON only, no prose:
{"overall":{"width_mm":number|null,"height_mm":number|null},"dims":[{"text":"as written","value":number,"type":"linear"|"diameter"|"radius"|"angle","p1":[x,y],"p2":[x,y]}],"thickness_mm":number|null,"qty":number|null,"material":string|null,"notes":string}
p1/p2 are the pixel coordinates of the two feature points the dimension measures (for a diameter: two opposite points on the circle; for a radius: centre and a point on the arc). Values in millimetres. "overall" is the total width/height of the part if a dimension gives it. Use null when unknown.`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': c.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: c.model || 'claude-sonnet-5-5', max_tokens: 2000, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } }, { type: 'text', text: prompt }] }] })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('AI алдаа: ' + ((j.error && j.error.message) || r.status));
  const txt = (j.content || []).map(x => x.text || '').join('');
  const m = txt.match(/\{[\s\S]*\}/); if (!m) throw new Error('AI хариу уншигдсангүй');
  const o = JSON.parse(m[0]);
  (o.dims || []).forEach(d => { if (d.p1) d.p1 = [d.p1[0] / f, d.p1[1] / f]; if (d.p2) d.p2 = [d.p2[0] / f, d.p2[1] / f]; });
  return o;
}
/* scale from AI dims: overall size against the traced outline, else the median of linear dims */
function aiScale(ai, pxBox) {
  if (!ai) return 0;
  const o = ai.overall || {};
  if (pxBox && o.width_mm > 0) return o.width_mm / (pxBox.x1 - pxBox.x0);
  if (pxBox && o.height_mm > 0) return o.height_mm / (pxBox.y1 - pxBox.y0);
  const r = (ai.dims || []).filter(d => d.type !== 'angle' && d.value > 0 && d.p1 && d.p2).map(d => d.value / Math.max(1, Math.hypot(d.p2[0] - d.p1[0], d.p2[1] - d.p1[1]) * (d.type === 'radius' ? 1 : 1))).sort((a, b) => a - b);
  return r.length ? r[r.length >> 1] : 0;
}
/* snap traced circles to the diameters written on the sketch */
function snapCircles(loops, ai) {
  const ds = (ai && ai.dims || []).filter(d => d.type === 'diameter' && d.value > 0).map(d => d.value);
  const rs = (ai && ai.dims || []).filter(d => d.type === 'radius' && d.value > 0).map(d => 2 * d.value);
  const all = ds.concat(rs); let n = 0;
  const out = loops.map(lp => {
    const c = circleOf(lp) || (() => { const f = flattenLoop(lp, 0.1), bb = bboxPts(f), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, a = Math.abs(loopArea(lp)); return Math.abs(w - h) < 0.06 * w && Math.abs(a - Math.PI * w * h / 4) < 0.05 * a ? { cx: (bb.x0 + bb.x1) / 2, cy: (bb.y0 + bb.y1) / 2, r: (w + h) / 4 } : null; })();
    if (!c) return lp;
    const D = 2 * c.r; let best = null, bd = Infinity;
    all.forEach(v => { const e = Math.abs(v - D) / v; if (e < bd) { bd = e; best = v; } });
    if (best && bd < 0.12) { n++; return circleLoop(c.cx, c.cy, best / 2); }
    return lp;
  });
  return { loops: out, n };
}

/* ---------- dialog ---------- */
function trOpts() {
  return { C: +$('#tr_C').value, win: 41, close: +$('#tr_close').value, minArea: +$('#tr_min').value, fill: $('#tr_fill').value === 'fill' };
}
function trScale(pxBox) {
  const mode = $('#tr_sc').value;
  if (mode === 'paper' && TR.k) return 1 / TR.k;
  if (mode === 'ref' && TR.ref.length === 2 && +$('#tr_refmm').value > 0) return +$('#tr_refmm').value / Math.hypot(TR.ref[1][0] - TR.ref[0][0], TR.ref[1][1] - TR.ref[0][1]);
  if (mode === 'width' && pxBox && +$('#tr_W').value > 0) return +$('#tr_W').value / (pxBox.x1 - pxBox.x0);
  if (mode === 'ai' && TR.ai) return aiScale(TR.ai, pxBox);
  return 0;
}
function trRun() {
  if (!TR.work) return;
  const res = traceLoops(TR.work, trOpts()); TR.res = res;
  // main outline box (largest loop) in pixels — used for width / AI scaling
  let big = null, ba = 0; res.loops.forEach(l => { const a = Math.abs(trPolyArea(l.px)); if (a > ba) { ba = a; big = l.px; } });
  TR.pxBox = big ? bboxPts(big) : null;
  if (TR.pxBox && TR.res.loops.length) { const off = res.loops[0].off; TR.pxBox = { x0: TR.pxBox.x0 - off, y0: TR.pxBox.y0 - off, x1: TR.pxBox.x1 + off, y1: TR.pxBox.y1 + off }; }
  const s = trScale(TR.pxBox); TR.scale = s;
  let loops = s > 0 ? loopsToMm(res, s, 0.9) : [];
  let snapped = 0;
  if (loops.length && TR.ai && $('#tr_snap').checked) { const r = snapCircles(loops, TR.ai); loops = r.loops; snapped = r.n; }
  TR.mm = loops;
  TR.parts = loops.length ? loopsToParts(loops, $('#tr_name').value.trim() || 'Зургаас') : [];
  const info = TR.parts.map(p => partInfo(p));
  $('#trInfo').innerHTML = !res.loops.length ? '<span class="late">Хаалттай контур олдсонгүй.</span> Тодруулгыг өөрчлөх, «Завсар хаах»-ыг нэмэх эсвэл «Дүүргэсэн дүрс» горимыг туршина уу.'
    : !(s > 0) ? `<b>${res.loops.length}</b> контур олдлоо. Одоо масштабаа сонгоно уу.`
    : `<b>${TR.parts.length}</b> парт (${TR.parts.reduce((a, p) => a + p.holes.length, 0)} нүх) · ${TR.parts.map((p, i) => `${nf(info[i].w, 1)}×${nf(info[i].h, 1)} мм${p.qty > 1 ? ` ×${p.qty}` : ''}`).join(', ')} · масштаб ${nf(s, 4)} мм/px · шугамын зузаан ≈ ${nf(res.stroke, 1)} px${snapped ? ` · ${snapped} дугуйг AI хэмжээнд тааруулсан` : ''}${TR.k ? '' : ' · <b>Утсаар авсан зураг бол «4 булан заах»-аар хазайлтыг засна — эс бөгөөс хэмжээ зөрнө.</b>'}`;
  $('#trAdd').disabled = !TR.parts.length;
  trDraw();
}
function trDraw() {
  const cv = $('#trCv'), wrap = cv.parentElement, img = TR.mode === 'corners' || !TR.work ? TR.src : TR.work;
  const dpr = window.devicePixelRatio || 1, W = wrap.clientWidth, H = wrap.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = cssv('--view'); x.fillRect(0, 0, W, H);
  if (!img) { x.fillStyle = cssv('--ink-3'); x.font = '14px IBM Plex Sans, sans-serif'; x.textAlign = 'center'; x.fillText('Зураг сонгох эсвэл Ctrl+V-ээр буулгана', W / 2, H / 2); return; }
  const k = Math.min((W - 16) / img.width, (H - 16) / img.height), ox = (W - img.width * k) / 2, oy = (H - img.height * k) / 2;
  TR.view = { k, ox, oy, img };
  x.drawImage(img, ox, oy, img.width * k, img.height * k);
  const acc = cssv('--accent');
  if (TR.mode === 'corners' || (!TR.k && TR.corners.length && img === TR.src)) {
    x.fillStyle = acc; x.strokeStyle = acc; x.lineWidth = 2;
    if (TR.corners.length > 1) { x.beginPath(); TR.corners.forEach((p, i) => i ? x.lineTo(ox + p[0] * k, oy + p[1] * k) : x.moveTo(ox + p[0] * k, oy + p[1] * k)); if (TR.corners.length === 4) x.closePath(); x.stroke(); }
    TR.corners.forEach(p => { x.beginPath(); x.arc(ox + p[0] * k, oy + p[1] * k, 6, 0, TAU); x.fill(); });
    return;
  }
  if (TR.res && $('#tr_showInk').checked) {
    const { w, h, ink } = TR.res, ov = trCanvas(w, h), od = ov.getContext('2d').createImageData(w, h);
    for (let i = 0; i < w * h; i++) if (ink[i]) { od.data[i * 4] = 37; od.data[i * 4 + 1] = 99; od.data[i * 4 + 2] = 168; od.data[i * 4 + 3] = 150; }
    ov.getContext('2d').putImageData(od, 0, 0); x.drawImage(ov, ox, oy, w * k, h * k);
  }
  // traced result (mm → px)
  if (TR.parts.length && TR.scale > 0) {
    const s = TR.scale, Hh = TR.work.height;
    const loops = TR.mm || [];
    x.lineWidth = 2; x.strokeStyle = acc; x.fillStyle = acc;
    x.beginPath();
    loops.forEach(lp => { flattenLoop(lp, 0.3).forEach((p, i) => { const X = ox + p[0] / s * k, Y = oy + (Hh - p[1] / s) * k; i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.closePath(); });
    x.globalAlpha = 0.22; x.fill('evenodd'); x.globalAlpha = 1; x.stroke();
  } else if (TR.res) {
    x.lineWidth = 1.5; x.strokeStyle = acc;
    TR.res.loops.forEach(l => { x.beginPath(); l.px.forEach((p, i) => i ? x.lineTo(ox + p[0] * k, oy + p[1] * k) : x.moveTo(ox + p[0] * k, oy + p[1] * k)); x.closePath(); x.stroke(); });
  }
  if (TR.ai) {
    x.strokeStyle = cssv('--bad'); x.fillStyle = cssv('--bad'); x.lineWidth = 1.2; x.font = '600 12px IBM Plex Sans, sans-serif';
    (TR.ai.dims || []).forEach(d => { if (!d.p1 || !d.p2) return; const a = [ox + d.p1[0] * k, oy + d.p1[1] * k], b = [ox + d.p2[0] * k, oy + d.p2[1] * k]; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); x.fillText(d.text || String(d.value), (a[0] + b[0]) / 2 + 4, (a[1] + b[1]) / 2 - 4); });
  }
  if (TR.ref.length) { x.fillStyle = '#16a34a'; x.strokeStyle = '#16a34a'; x.lineWidth = 2; x.beginPath(); TR.ref.forEach((p, i) => i ? x.lineTo(ox + p[0] * k, oy + p[1] * k) : x.moveTo(ox + p[0] * k, oy + p[1] * k)); x.stroke(); TR.ref.forEach(p => { x.beginPath(); x.arc(ox + p[0] * k, oy + p[1] * k, 5, 0, TAU); x.fill(); }); }
}
function trSetMode(m) {
  TR.mode = m;
  $('#trHint').textContent = m === 'corners' ? `Цаасны 4 буланг дарна уу (${TR.corners.length}/4)` : m === 'ref' ? `Мэдэгдэх хэмжээний 2 үзүүрийг дарна уу (${TR.ref.length}/2)` : '';
  trDraw();
}
async function trSetFile(file) {
  try {
    TR.src = await trLoadFile(file); TR.work = TR.src; TR.k = 0; TR.corners = []; TR.ref = []; TR.ai = null; TR.res = null; TR.parts = [];
    $('#tr_name').value = (file.name || 'Зургаас').replace(/\.[^.]+$/, '');
    $('#trAiOut').innerHTML = ''; if ($('#tr_sc').value === 'paper' || $('#tr_sc').value === 'ai') $('#tr_sc').value = 'width';
    trSetMode(''); trRun();
  } catch (e) { toast(e.message || 'Зураг нээгдсэнгүй', 6000); }
}
function openTrace() {
  $('#trModal').hidden = false;
  if (!window.ClipperLib) loadScript(CLIP_URL).then(() => { if (TR.res) trRun(); }).catch(() => { });
  const c = aiCfg(); $('#ai_key').value = c.key ? '••••••••' + c.key.slice(-4) : ''; $('#ai_model').value = c.model;
  $('#tr_mat').innerHTML = matOptions(S.defMat); $('#tr_thk').value = S.defThk;
  setTimeout(trDraw, 30);
}
$('#btnTrace').addEventListener('click', openTrace);
$('#trX').addEventListener('click', () => { $('#trModal').hidden = true; });
$('#trFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) trSetFile(f); });
window.addEventListener('paste', e => { if ($('#trModal').hidden) return; const it = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/')); if (it) { e.preventDefault(); trSetFile(new File([it.getAsFile()], 'Буулгасан зураг.png', { type: it.type })); } });
$('#trCorners').addEventListener('click', () => { if (!TR.src) { toast('Эхлээд зураг сонгоно уу'); return; } TR.corners = []; TR.k = 0; TR.work = TR.src; trSetMode('corners'); });
$('#trRefBtn').addEventListener('click', () => { if (!TR.work) { toast('Эхлээд зураг сонгоно уу'); return; } TR.ref = []; $('#tr_sc').value = 'ref'; trSetMode('ref'); });
$('#trCv').addEventListener('click', e => {
  if (!TR.view || !TR.mode) return;
  const r = e.currentTarget.getBoundingClientRect(), V = TR.view, p = [(e.clientX - r.left - V.ox) / V.k, (e.clientY - r.top - V.oy) / V.k];
  if (p[0] < 0 || p[1] < 0 || p[0] > V.img.width || p[1] > V.img.height) return;
  if (TR.mode === 'corners') {
    TR.corners.push(p);
    if (TR.corners.length === 4) {
      const paper = $('#tr_paper').value === 'custom' ? [+$('#tr_pw').value || 210, +$('#tr_ph').value || 297] : PAPER[$('#tr_paper').value];
      TR.k = Math.min(5, 1600 / Math.max(...paper)); TR.work = rectify(TR.src, TR.corners, paper, TR.k);
      $('#tr_sc').value = 'paper'; TR.ref = []; trSetMode(''); trRun(); return;
    }
    trSetMode('corners'); return;
  }
  if (TR.mode === 'ref') { TR.ref.push(p); if (TR.ref.length === 2) { trSetMode(''); trRun(); } else trSetMode('ref'); }
});
['tr_C', 'tr_close', 'tr_min', 'tr_fill', 'tr_sc', 'tr_W', 'tr_refmm', 'tr_snap', 'tr_showInk'].forEach(id => $('#' + id).addEventListener(id === 'tr_C' || id === 'tr_min' ? 'input' : 'change', () => { clearTimeout(TR._t); TR._t = setTimeout(trRun, 120); }));
$('#ai_key').addEventListener('change', e => { const v = e.target.value.trim(); if (v.startsWith('••')) return; const c = aiCfg(); c.key = v; aiSave(c); e.target.value = v ? '••••••••' + v.slice(-4) : ''; });
$('#ai_model').addEventListener('change', e => { const c = aiCfg(); c.model = e.target.value.trim() || 'claude-sonnet-5-5'; aiSave(c); });
$('#trAi').addEventListener('click', async e => {
  if (!TR.work) { toast('Эхлээд зураг сонгоно уу'); return; }
  if (!aiCfg().key) { $('#trAiSet').open = true; toast('AI түлхүүрээ оруулна уу', 4000); return; }
  const b = e.currentTarget; b.disabled = true; b.textContent = 'Уншиж байна…';
  try {
    TR.ai = await aiReadDims(TR.work);
    const d = TR.ai.dims || [];
    $('#trAiOut').innerHTML = `<div class="tblwrap" style="margin-top:6px"><table class="dt"><thead><tr><th>Бичсэн</th><th>Төрөл</th><th class="r">мм</th></tr></thead><tbody>${d.map(x => `<tr><td>${esc(x.text || '')}</td><td>${({ linear: 'урт', diameter: 'Ø', radius: 'R', angle: 'өнцөг' })[x.type] || esc(x.type)}</td><td class="r num">${nf(+x.value, 1)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">хэмжээ олдсонгүй</td></tr>'}</tbody></table></div>${TR.ai.notes ? `<p class="note">${esc(TR.ai.notes)}</p>` : ''}`;
    if (TR.ai.thickness_mm > 0) $('#tr_thk').value = TR.ai.thickness_mm;
    if (TR.ai.qty > 0) $('#tr_qty').value = Math.round(TR.ai.qty);
    if (!(TR.k > 0)) $('#tr_sc').value = 'ai';
    trRun();
  } catch (err) { toast(err.message || 'AI алдаа', 8000); }
  b.disabled = false; b.textContent = 'AI-аар хэмжээ унших';
});
$('#trAdd').addEventListener('click', () => {
  const thk = Math.max(0.1, +$('#tr_thk').value || S.defThk), mat = $('#tr_mat').value, mult = Math.max(1, Math.round(+$('#tr_qty').value || 1));
  TR.parts.forEach(p => S.parts.push({ id: uid(), name: p.name, qty: p.qty * mult, mat, thk, rot: true, mir: false, prio: 0, outer: p.outer, holes: p.holes }));
  save(); renderParts(); $('#trModal').hidden = true;
  toast(`${TR.parts.length} парт нэмэгдлээ — хэмжээг нь шалгаад шаардлагатай бол DXF-ээр засна уу`, 4000);
});
window.addEventListener('resize', () => { if (!$('#trModal').hidden) trDraw(); });
