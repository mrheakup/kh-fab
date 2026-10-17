/* ---------- vector import: SVG, PDF/AI, HPGL/PLT + arc recovery ---------- */
function circ3(a, b, c) {
  const ax = a[0], ay = a[1], bx = b[0], by = b[1], cx = c[0], cy = c[1];
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-12) return null;
  const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
  const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d, uy = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d;
  return [ux, uy, Math.hypot(ax - ux, ay - uy)];
}
function dedupePts(pts, eps) { const o = []; for (const p of pts) { const l = o[o.length - 1]; if (!l || Math.hypot(p[0] - l[0], p[1] - l[1]) > eps) o.push(p); } return o; }
/* turn a dense polyline into lines + true arcs (bulges) within tol */
function fitPoly(pts, closed, tol) {
  pts = dedupePts(pts, 1e-6);
  if (closed && pts.length > 2 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-6) pts.pop();
  const P = closed ? pts.concat([pts[0]]) : pts, n = P.length, out = [];
  if (n < 2) return pts.map(p => ({ x: p[0], y: p[1], b: 0 }));
  let i = 0;
  while (i < n - 1) {
    let jl = i + 1;
    for (let j = i + 2; j < n && j - i <= 800; j++) {
      const a = P[i], b = P[j]; let ok = true;
      for (let k = i + 1; k < j; k++) if (exPD(P[k][0], P[k][1], a[0], a[1], b[0], b[1]) > tol) { ok = false; break; }
      if (!ok) break; jl = j;
    }
    let ja = -1, jb = 0;
    for (let j = i + 3; j < n && j - i <= 800; j++) {
      const m = (i + j) >> 1, c = circ3(P[i], P[m], P[j]);
      if (!c || c[2] > 5e4) break;
      let ok = true;
      for (let k = i + 1; k < j; k++) if (Math.abs(Math.hypot(P[k][0] - c[0], P[k][1] - c[1]) - c[2]) > tol) { ok = false; break; }
      if (ok) for (let k = i; k < j; k++) { const L = Math.hypot(P[k + 1][0] - P[k][0], P[k + 1][1] - P[k][1]) / 2; if (c[2] - Math.sqrt(Math.max(0, c[2] * c[2] - L * L)) > tol) { ok = false; break; } }
      if (!ok) break;
      const turn = (P[m][0] - P[i][0]) * (P[j][1] - P[m][1]) - (P[m][1] - P[i][1]) * (P[j][0] - P[m][0]);
      let prev = Math.atan2(P[i][1] - c[1], P[i][0] - c[0]), sw = 0, mono = true;
      for (let k = i + 1; k <= j; k++) {
        const a = Math.atan2(P[k][1] - c[1], P[k][0] - c[0]); let d = a - prev; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
        if ((turn > 0 && d < -1e-9) || (turn < 0 && d > 1e-9) || Math.abs(d) > 0.4) { mono = false; break; }
        sw += d; prev = a;
      }
      if (!mono || Math.abs(sw) > TAU * 0.97) break;
      ja = j; jb = Math.tan(sw / 4);
    }
    if (ja > jl) { out.push({ x: P[i][0], y: P[i][1], b: jb }); i = ja; }
    else { out.push({ x: P[i][0], y: P[i][1], b: 0 }); i = jl; }
  }
  if (!closed) out.push({ x: P[n - 1][0], y: P[n - 1][1], b: 0 });
  return out;
}
function cubicPts(p0, p1, p2, p3, scale, out) {
  const L = (Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + Math.hypot(p3[0] - p2[0], p3[1] - p2[1])) * scale;
  const n = Math.max(6, Math.min(256, Math.ceil(L / 0.6)));
  for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); }
}
function quadPts(p0, p1, p2, scale, out) { cubicPts(p0, [p0[0] + 2 / 3 * (p1[0] - p0[0]), p0[1] + 2 / 3 * (p1[1] - p0[1])], [p2[0] + 2 / 3 * (p1[0] - p2[0]), p2[1] + 2 / 3 * (p1[1] - p2[1])], p2, scale, out); }
const mapPt = (M, p) => [M[0] * p[0] + M[2] * p[1] + M[4], M[1] * p[0] + M[3] * p[1] + M[5]];
const isSimilar = M => Math.abs(M[0] * M[2] + M[1] * M[3]) < 1e-6 * (M[0] * M[0] + M[1] * M[1] + 1e-12) && Math.abs((M[0] * M[0] + M[1] * M[1]) - (M[2] * M[2] + M[3] * M[3])) < 1e-6 * (M[0] * M[0] + M[1] * M[1] + 1e-12);

/* collects geometry in mm: closed polylines -> loops, open -> segments */
function geoSink() {
  const g = { segs: [], loops: [], box: null };
  g.poly = (pts, closed, tol) => {
    pts = dedupePts(pts, 1e-6);
    if (pts.length < 2) return;
    const f = pts[0], l = pts[pts.length - 1];
    if (!closed && pts.length > 2 && Math.hypot(f[0] - l[0], f[1] - l[1]) < 0.02) closed = true;
    const v = fitPoly(pts, closed, tol || 0.05);
    if (closed) { if (v.length >= 2) g.loops.push(v); }
    else for (let i = 0; i + 1 < v.length; i++) g.segs.push({ a: { x: v[i].x, y: v[i].y }, b: { x: v[i + 1].x, y: v[i + 1].y }, bulge: v[i].b });
  };
  g.loop = (vs, M) => {
    if (isSimilar(M)) { const s = (M[0] * M[3] - M[1] * M[2]) < 0 ? -1 : 1; g.loops.push(vs.map(v => { const p = mapPt(M, [v.x, v.y]); return { x: p[0], y: p[1], b: v.b * s }; })); }
    else g.poly(flattenLoop(vs, 0.02).map(p => mapPt(M, p)), true);
  };
  return g;
}

/* --- SVG --- */
function svgLen(v) { const m = /^\s*([-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?)\s*(mm|cm|in|pt|pc|px)?\s*$/i.exec(v || ''); if (!m) return null; return +m[1] * { mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6, px: 25.4 / 96 }[(m[2] || 'px').toLowerCase()]; }
function svgTransform(str) {
  let M = [1, 0, 0, 1, 0, 0]; const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g; let m;
  while ((m = re.exec(str || ''))) {
    const a = m[2].trim().split(/[\s,]+/).map(Number); let T;
    switch (m[1]) {
      case 'matrix': T = a.slice(0, 6); break;
      case 'translate': T = [1, 0, 0, 1, a[0] || 0, a[1] || 0]; break;
      case 'scale': T = [a[0], 0, 0, a.length > 1 ? a[1] : a[0], 0, 0]; break;
      case 'rotate': { const r = a[0] * D2R, c = Math.cos(r), s = Math.sin(r); T = [c, s, -s, c, 0, 0]; if (a.length > 2) T = mmul(mmul([1, 0, 0, 1, a[1], a[2]], T), [1, 0, 0, 1, -a[1], -a[2]]); break; }
      case 'skewX': T = [1, 0, Math.tan(a[0] * D2R), 1, 0, 0]; break;
      case 'skewY': T = [1, Math.tan(a[0] * D2R), 0, 1, 0, 0]; break;
    }
    M = mmul(M, T);
  }
  return M;
}
function svgPathSubpaths(d, scale) {
  // returns [{pts:[[x,y]...], closed}] in local user units
  let i = 0; const s = d || '', subs = []; let cur = null, cmd = '', x = 0, y = 0, sx = 0, sy = 0, lc = null, lq = null;
  const ws = () => { while (i < s.length && /[\s,]/.test(s[i])) i++; };
  const num = () => { ws(); const m = /^[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/.exec(s.slice(i, i + 40)); if (!m) return null; i += m[0].length; return +m[0]; };
  const flag = () => { ws(); const c = s[i]; if (c === '0' || c === '1') { i++; return c === '1'; } return null; };
  const start = () => { cur = { pts: [[x, y]], closed: false }; subs.push(cur); };
  while (i < s.length) {
    ws(); if (i >= s.length) break;
    if (/[A-Za-z]/.test(s[i])) { cmd = s[i++]; if (cmd === 'Z' || cmd === 'z') { if (cur) { cur.closed = true; x = sx; y = sy; } cur = null; lc = lq = null; continue; } }
    else if (!cmd) break;
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'M') { const a = num(), b = num(); if (a === null || b === null) break; x = ox + a; y = oy + b; sx = x; sy = y; start(); cmd = rel ? 'l' : 'L'; lc = lq = null; continue; }
    if (!cur) start();
    if (C === 'L') { const a = num(), b = num(); if (a === null || b === null) break; x = ox + a; y = oy + b; cur.pts.push([x, y]); lc = lq = null; }
    else if (C === 'H') { const a = num(); if (a === null) break; x = (rel ? x : 0) + a; cur.pts.push([x, y]); lc = lq = null; }
    else if (C === 'V') { const a = num(); if (a === null) break; y = (rel ? y : 0) + a; cur.pts.push([x, y]); lc = lq = null; }
    else if (C === 'C' || C === 'S') {
      let c1;
      if (C === 'C') { const a = num(), b = num(); if (b === null) break; c1 = [ox + a, oy + b]; } else c1 = lc ? [2 * x - lc[0], 2 * y - lc[1]] : [x, y];
      const c = num(), d2 = num(), e = num(), f = num(); if (f === null) break;
      const c2 = [ox + c, oy + d2], p = [ox + e, oy + f];
      cubicPts([x, y], c1, c2, p, scale, cur.pts); lc = c2; lq = null; x = p[0]; y = p[1];
    }
    else if (C === 'Q' || C === 'T') {
      let q;
      if (C === 'Q') { const a = num(), b = num(); if (b === null) break; q = [ox + a, oy + b]; } else q = lq ? [2 * x - lq[0], 2 * y - lq[1]] : [x, y];
      const e = num(), f = num(); if (f === null) break;
      const p = [ox + e, oy + f]; quadPts([x, y], q, p, scale, cur.pts); lq = q; lc = null; x = p[0]; y = p[1];
    }
    else if (C === 'A') {
      let rx = num(), ry = num(); const rot = num(), fa = flag(), fs = flag(), e = num(), f = num(); if (f === null || fa === null || fs === null) break;
      const p = [ox + e, oy + f];
      rx = Math.abs(rx); ry = Math.abs(ry);
      if (rx < 1e-12 || ry < 1e-12) { cur.pts.push(p); }
      else {
        const phi = rot * D2R, cp = Math.cos(phi), sp = Math.sin(phi);
        const dx = (x - p[0]) / 2, dy = (y - p[1]) / 2, x1 = cp * dx + sp * dy, y1 = -sp * dx + cp * dy;
        let lam = x1 * x1 / (rx * rx) + y1 * y1 / (ry * ry); if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
        let num2 = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1; num2 = Math.max(0, num2);
        let co = Math.sqrt(num2 / (rx * rx * y1 * y1 + ry * ry * x1 * x1)); if (fa === fs) co = -co;
        const cx1 = co * rx * y1 / ry, cy1 = -co * ry * x1 / rx;
        const cx = cp * cx1 - sp * cy1 + (x + p[0]) / 2, cy = sp * cx1 + cp * cy1 + (y + p[1]) / 2;
        const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
        const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry); let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
        if (!fs && dt > 0) dt -= TAU; else if (fs && dt < 0) dt += TAU;
        const n = Math.max(8, Math.min(360, Math.ceil(Math.abs(dt) * Math.max(rx, ry) * scale / 0.5)));
        for (let k = 1; k <= n; k++) { const t = t1 + dt * k / n, ex = rx * Math.cos(t), ey = ry * Math.sin(t); cur.pts.push([cp * ex - sp * ey + cx, sp * ex + cp * ey + cy]); }
      }
      x = p[0]; y = p[1]; lc = lq = null;
    }
    else { i++; }
  }
  return subs;
}
function svgGeometry(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.nodeName.toLowerCase() !== 'svg') throw new Error('SVG файл уншигдсангүй');
  const vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  const W = svgLen(svg.getAttribute('width')), H = svgLen(svg.getAttribute('height'));
  let sx = 25.4 / 96, sy = sx, ox = 0, oy = 0;
  if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) { ox = vb[0]; oy = vb[1]; if (W) sx = W / vb[2]; if (H) sy = H / vb[3]; if (W && !H) sy = sx; if (H && !W) sx = sy; if (!W && !H) sx = sy = 25.4 / 96; }
  const M0 = [sx, 0, 0, -sy, -ox * sx, oy * sy];
  const g = geoSink();
  if (vb.length === 4 && vb[2] > 0) { const a = mapPt(M0, [vb[0], vb[1]]), b = mapPt(M0, [vb[0] + vb[2], vb[1] + vb[3]]); g.box = { x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]), x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]) }; }
  const SKIP = new Set(['defs', 'clippath', 'mask', 'pattern', 'marker', 'symbol', 'title', 'desc', 'metadata', 'text', 'style', 'image', 'script', 'lineargradient', 'radialgradient', 'filter', 'foreignobject']);
  const num = (el, a, d = 0) => { const v = parseFloat(el.getAttribute(a)); return isFinite(v) ? v : d; };
  const walk = (el, M, depth) => {
    if (depth > 30) return;
    const tag = (el.localName || el.nodeName || '').toLowerCase();
    if (SKIP.has(tag)) return;
    if ((el.getAttribute && (el.getAttribute('display') === 'none' || /display\s*:\s*none/.test(el.getAttribute('style') || '')))) return;
    const T = el.getAttribute ? mmul(M, svgTransform(el.getAttribute('transform'))) : M;
    const sc = Math.sqrt(Math.abs(T[0] * T[3] - T[1] * T[2])) || 1;
    switch (tag) {
      case 'svg': case 'g': case 'a': case 'switch': break;
      case 'use': {
        const href = el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || el.getAttribute('xlink:href');
        const ref = href && href[0] === '#' ? doc.getElementById(href.slice(1)) : null;
        if (ref) { const U = mmul(T, [1, 0, 0, 1, num(el, 'x'), num(el, 'y')]); if ((ref.localName || '').toLowerCase() === 'symbol') for (const c of ref.children) walk(c, U, depth + 1); else walk(ref, U, depth + 1); }
        return;
      }
      case 'rect': {
        const x = num(el, 'x'), y = num(el, 'y'), w = num(el, 'width'), h = num(el, 'height'); if (w <= 0 || h <= 0) return;
        let rx = num(el, 'rx', -1), ry = num(el, 'ry', -1); if (rx < 0) rx = ry; if (ry < 0) ry = rx; rx = Math.max(0, rx);
        if (rx > 0 && Math.abs(rx - ry) > 1e-6) { const pts = []; const r = Math.min(rx, w / 2), q = Math.min(ry, h / 2); for (let k = 0; k <= 64; k++) { const t = k / 64 * TAU, cxx = Math.cos(t) >= 0 ? x + w - r : x + r, cyy = Math.sin(t) >= 0 ? y + h - q : y + q; pts.push(mapPt(T, [cxx + r * Math.cos(t), cyy + q * Math.sin(t)])); } g.poly(pts, true); return; }
        g.loop(rectLoop(w, h, Math.min(rx, w / 2, h / 2)).map(v => ({ x: v.x + x, y: v.y + y, b: v.b })), T); return;
      }
      case 'circle': { const r = num(el, 'r'); if (r > 0) g.loop(circleLoop(num(el, 'cx'), num(el, 'cy'), r), T); return; }
      case 'ellipse': {
        const rx = num(el, 'rx'), ry = num(el, 'ry'), cx = num(el, 'cx'), cy = num(el, 'cy'); if (rx <= 0 || ry <= 0) return;
        if (Math.abs(rx - ry) < 1e-9) { g.loop(circleLoop(cx, cy, rx), T); return; }
        const n = Math.max(48, Math.min(720, Math.ceil(TAU * Math.max(rx, ry) * sc / 0.5))), pts = [];
        for (let k = 0; k < n; k++) { const t = k / n * TAU; pts.push(mapPt(T, [cx + rx * Math.cos(t), cy + ry * Math.sin(t)])); }
        g.poly(pts, true); return;
      }
      case 'line': g.poly([mapPt(T, [num(el, 'x1'), num(el, 'y1')]), mapPt(T, [num(el, 'x2'), num(el, 'y2')])], false); return;
      case 'polyline': case 'polygon': {
        const a = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number), pts = [];
        for (let k = 0; k + 1 < a.length; k += 2) pts.push(mapPt(T, [a[k], a[k + 1]]));
        g.poly(pts, tag === 'polygon'); return;
      }
      case 'path': { for (const sp of svgPathSubpaths(el.getAttribute('d'), sc)) g.poly(sp.pts.map(p => mapPt(T, p)), sp.closed); return; }
      default: if (depth > 0 && !['svg', 'g'].includes(tag)) return;
    }
    for (const c of el.children || []) walk(c, T, depth + 1);
  };
  walk(svg, M0, 0);
  return g;
}

/* --- HPGL / PLT --- */
function hpglGeometry(text) {
  const g = geoSink(), U = 0.025, re = /([A-Za-z]{2})([^A-Za-z;\x03]*)/g;
  let m, pen = false, abs = true, x = 0, y = 0, cur = null;
  const flush = () => { if (cur && cur.length > 1) g.poly(cur.map(p => [p[0] * U, p[1] * U]), false, 0.05); cur = null; };
  const go = (nx, ny) => { if (pen) { if (!cur) cur = [[x, y]]; cur.push([nx, ny]); } x = nx; y = ny; };
  const seq = a => { for (let k = 0; k + 1 < a.length; k += 2) go(abs ? a[k] : x + a[k], abs ? a[k + 1] : y + a[k + 1]); };
  while ((m = re.exec(text))) {
    const c = m[1].toUpperCase(), a = (m[2].match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || []).map(Number);
    switch (c) {
      case 'IN': case 'DF': flush(); pen = false; abs = true; break;
      case 'PA': abs = true; seq(a); break;
      case 'PR': abs = false; seq(a); break;
      case 'PU': flush(); pen = false; seq(a); break;
      case 'PD': pen = true; seq(a); break;
      case 'SP': flush(); pen = false; break;
      case 'CI': { const r = Math.abs(a[0] || 0); if (r > 0) { flush(); g.loops.push(circleLoop(x * U, y * U, r * U)); } break; }
      case 'AA': case 'AR': {
        if (a.length < 3) break;
        const cx = c === 'AA' ? a[0] : x + a[0], cy = c === 'AA' ? a[1] : y + a[1], sw = a[2] * D2R;
        const r = Math.hypot(x - cx, y - cy), t0 = Math.atan2(y - cy, x - cx), n = Math.max(8, Math.ceil(Math.abs(sw) * r * U / 0.5));
        for (let k = 1; k <= n; k++) { const t = t0 + sw * k / n; go(cx + r * Math.cos(t), cy + r * Math.sin(t)); }
        break;
      }
      default: break;
    }
  }
  flush();
  return g;
}

/* --- PDF / AI (needs pdf.js, loaded on demand) --- */
const PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
function loadScript(url) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = url; s.onload = res; s.onerror = () => rej(new Error('Сан ачаалагдсангүй: ' + url)); document.head.appendChild(s); }); }
async function getPdfjs() {
  if (!window.pdfjsLib) await loadScript(PDFJS_URL);
  const lib = window.pdfjsLib;
  if (!lib.__khReady) {
    lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    if (!/^https?:/.test(PDFJS_WORKER)) { if (!window.pdfjsWorker) await loadScript(PDFJS_WORKER); } // offline app: run the parser on the page
    else { try { lib.GlobalWorkerOptions.workerPort = new Worker(URL.createObjectURL(new Blob([`importScripts('${PDFJS_WORKER}');`], { type: 'text/javascript' }))); } catch (e) { } }
    lib.__khReady = true;
  }
  return lib;
}
async function pdfGeometry(buf) {
  const lib = await getPdfjs();
  let pdf;
  try { pdf = await lib.getDocument({ data: new Uint8Array(buf.slice(0)), isEvalSupported: false }).promise; }
  catch (e) { lib.GlobalWorkerOptions.workerPort = null; pdf = await lib.getDocument({ data: new Uint8Array(buf.slice(0)), isEvalSupported: false }).promise; }
  const OPS = lib.OPS, PT = 25.4 / 72, pages = [];
  for (let pn = 1; pn <= Math.min(pdf.numPages, 50); pn++) {
    const page = await pdf.getPage(pn), ol = await page.getOperatorList(), g = geoSink();
    const v = page.view; g.box = { x0: v[0] * PT, y0: v[1] * PT, x1: v[2] * PT, y1: v[3] * PT };
    let ctm = [PT, 0, 0, PT, 0, 0]; const stack = []; let path = [], cur = null;
    const paint = new Set([OPS.stroke, OPS.closeStroke, OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
    const closing = new Set([OPS.closeStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
    for (let i = 0; i < ol.fnArray.length; i++) {
      const fn = ol.fnArray[i], a = ol.argsArray[i];
      if (fn === OPS.save) stack.push(ctm.slice());
      else if (fn === OPS.restore) ctm = stack.pop() || ctm;
      else if (fn === OPS.transform) ctm = mmul(ctm, a);
      else if (fn === OPS.paintFormXObjectBegin) { stack.push(ctm.slice()); if (a && a[0]) ctm = mmul(ctm, a[0]); }
      else if (fn === OPS.paintFormXObjectEnd) ctm = stack.pop() || ctm;
      else if (fn === OPS.constructPath) {
        const sub = a[0], co = a[1]; let k = 0;
        const sc = Math.sqrt(Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2])) || 1;
        const last = () => cur.raw[cur.raw.length - 1];
        for (const op of sub) {
          if (op === OPS.moveTo) { cur = { raw: [[co[k], co[k + 1]]], closed: false, M: ctm }; path.push(cur); k += 2; }
          else if (op === OPS.lineTo) { if (!cur) { cur = { raw: [[co[k], co[k + 1]]], closed: false, M: ctm }; path.push(cur); } else cur.raw.push([co[k], co[k + 1]]); k += 2; }
          else if (op === OPS.curveTo) { if (cur) cubicPts(last(), [co[k], co[k + 1]], [co[k + 2], co[k + 3]], [co[k + 4], co[k + 5]], sc, cur.raw); k += 6; }
          else if (op === OPS.curveTo2) { if (cur) { const l = last(); cubicPts(l, l, [co[k], co[k + 1]], [co[k + 2], co[k + 3]], sc, cur.raw); } k += 4; }
          else if (op === OPS.curveTo3) { if (cur) cubicPts(last(), [co[k], co[k + 1]], [co[k + 2], co[k + 3]], [co[k + 2], co[k + 3]], sc, cur.raw); k += 4; }
          else if (op === OPS.closePath) { if (cur) { cur.closed = true; const f = cur.raw[0]; cur = { raw: [f.slice()], closed: false, M: ctm }; path.push(cur); } }
          else if (op === OPS.rectangle) { const x = co[k], y = co[k + 1], w = co[k + 2], h = co[k + 3]; path.push({ raw: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], closed: true, M: ctm }); cur = null; k += 4; }
        }
      }
      else if (paint.has(fn) || fn === OPS.endPath) {
        if (fn !== OPS.endPath) for (const sp of path) { if (sp.raw.length < 2) continue; g.poly(sp.raw.map(p => mapPt(sp.M, p)), sp.closed || closing.has(fn)); }
        path = []; cur = null;
      }
    }
    pages.push(g);
  }
  return pages;
}

/* --- shared clean-up: drop page frames and duplicate contours, then build parts --- */
function geomToParts(g, name) {
  const ch = chainSegments(g.segs, 0.05, 0.25);
  let loops = g.loops.concat(ch.loops);
  const info = loops.map(v => { const f = flattenLoop(v, 0.1); return { v, a: Math.abs(loopArea(v)), bb: bboxPts(f) }; }).filter(o => o.a > 1e-3);
  const keep = [];
  for (const o of info) {
    if (g.box && Math.abs(o.bb.x0 - g.box.x0) < 0.6 && Math.abs(o.bb.y0 - g.box.y0) < 0.6 && Math.abs(o.bb.x1 - g.box.x1) < 0.6 && Math.abs(o.bb.y1 - g.box.y1) < 0.6) continue;
    if (keep.some(k => Math.abs(k.a - o.a) <= 1e-3 * o.a + 0.05 && Math.abs(k.bb.x0 - o.bb.x0) < 0.05 && Math.abs(k.bb.y0 - o.bb.y0) < 0.05 && Math.abs(k.bb.x1 - o.bb.x1) < 0.05 && Math.abs(k.bb.y1 - o.bb.y1) < 0.05)) continue;
    keep.push(o);
  }
  return { parts: loopsToParts(keep.map(k => k.v), name), open: ch.open };
}
async function importAnyFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase(), base = file.name.replace(/\.[^.]+$/, '');
  if (ext === 'dxf') { const r = importDXF(await file.text(), file.name); return { parts: r.parts, open: r.open }; }
  if (ext === 'svg') { return geomToParts(svgGeometry(await file.text()), base); }
  if (['plt', 'hpgl', 'hgl', 'hpg'].includes(ext)) { return geomToParts(hpglGeometry(await file.text()), base); }
  if (ext === 'pdf' || ext === 'ai') {
    const buf = await file.arrayBuffer();
    if (ext === 'ai' && new TextDecoder().decode(new Uint8Array(buf.slice(0, 5))) !== '%PDF-') throw new Error('Энэ AI файл PDF нийцтэй биш байна — Illustrator-оос «Create PDF Compatible File» сонголттой хадгална уу');
    const pages = await pdfGeometry(buf);
    const parts = []; let open = 0;
    pages.forEach((g, i) => { const r = geomToParts(g, pages.length > 1 ? `${base}-х${i + 1}` : base); parts.push(...r.parts); open += r.open; });
    return { parts, open };
  }
  if (ext === 'cdr' || ext === 'cmx') throw new Error('CorelDRAW-ийн .cdr хаалттай формат тул шууд уншихгүй. Corel-д: Ctrl+Q-ээр текстийг муруй болгоод Файл → Экспорт → DXF, SVG, PDF эсвэл PLT сонгоно уу');
  if (ext === 'dwg') throw new Error('DWG хаалттай формат. AutoCAD/Inventor-оос «Save As → DXF» хийнэ үү');
  if (ext === 'eps' || ext === 'ps') throw new Error('EPS дэмжихгүй — PDF эсвэл SVG болгож экспортлоно уу');
  throw new Error('Танихгүй формат: .' + ext);
}
