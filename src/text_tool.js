/* ================= text → cut geometry ================= */
const OT_URL = 'https://cdnjs.cloudflare.com/ajax/libs/opentype.js/1.3.4/opentype.min.js';
const CLIP_URL = 'https://cdn.jsdelivr.net/npm/clipper-lib@6.4.2/clipper.js';
async function ensureTextLibs() {
  if (!window.opentype) await loadScript(OT_URL);
  if (!window.ClipperLib) await loadScript(CLIP_URL);
}
const fontCache = new Map(), customFonts = [];
function b64buf(b64) { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }
function getFont(key) {
  if (fontCache.has(key)) return fontCache.get(key);
  let f = null;
  if (key.startsWith('custom:')) f = customFonts[+key.slice(7)]?.font || null;
  else { const d = FONTS.find(x => x.name === key); if (d) f = opentype.parse(b64buf(d.data)); }
  if (f) fontCache.set(key, f);
  return f;
}
const CSC = 1000;
const toCP = pts => pts.map(p => ({ X: Math.round(p[0] * CSC), Y: Math.round(p[1] * CSC) }));
const fromCP = path => path.map(p => [p.X / CSC, p.Y / CSC]);
function clipRun(subj, clip, type, fill) {
  const C = ClipperLib, c = new C.Clipper();
  c.AddPaths(subj.map(toCP), C.PolyType.ptSubject, true);
  if (clip && clip.length) c.AddPaths(clip.map(toCP), C.PolyType.ptClip, true);
  const tree = new C.PolyTree();
  c.Execute(type, tree, fill, fill);
  const out = [];
  const walk = node => { for (const ch of node.Childs()) { if (ch.IsHole()) continue; const holes = []; for (const h of ch.Childs()) { holes.push(fromCP(h.Contour())); walk(h); } out.push({ outer: fromCP(ch.Contour()), holes }); } };
  walk(tree);
  return out.filter(s => s.outer.length >= 3);
}
const shapeRings = s => [s.outer, ...s.holes];
function unionShapes(list) { const C = ClipperLib; return clipRun(list.flatMap(shapeRings), null, C.ClipType.ctUnion, C.PolyFillType.pftNonZero); }
function glyphContours(glyph, x, y, size) {
  const cmds = glyph.getPath(x, -y, size).commands, rings = []; let cur = null, last = null;
  for (const c of cmds) {
    if (c.type === 'M') { cur = [[c.x, -c.y]]; rings.push(cur); last = [c.x, -c.y]; }
    else if (c.type === 'L') { cur.push([c.x, -c.y]); last = [c.x, -c.y]; }
    else if (c.type === 'Q') { quadPts(last, [c.x1, -c.y1], [c.x, -c.y], 1, cur); last = [c.x, -c.y]; }
    else if (c.type === 'C') { cubicPts(last, [c.x1, -c.y1], [c.x2, -c.y2], [c.x, -c.y], 1, cur); last = [c.x, -c.y]; }
  }
  return rings.map(r => dedupePts(r, 1e-6)).filter(r => r.length >= 3);
}
function capHeightUnits(font) {
  const os2 = font.tables.os2;
  if (os2 && os2.sCapHeight > 0) return os2.sCapHeight;
  const g = font.charToGlyph('H'); const bb = g.getBoundingBox(); return (bb.y2 - bb.y1) || font.unitsPerEm * 0.7;
}
/* lays out text; returns [{ch, line, shapes:[{outer,holes}]}] in mm, baseline of first line at y=0 */
function layoutText(o) {
  const font = getFont(o.font); if (!font) throw new Error('Фонт ачаалагдсангүй');
  const size = o.h * font.unitsPerEm / capHeightUnits(font), k = size / font.unitsPerEm;
  const lines = String(o.text).replace(/\r/g, '').split('\n'), out = [], missing = new Set();
  const widths = [];
  lines.forEach((line, li) => {
    const glyphs = font.stringToGlyphs(line); let x = 0; const items = [];
    glyphs.forEach((g, i) => {
      const ch = line[i] ?? '';
      if (g.index === 0 && ch.trim()) missing.add(ch);
      items.push({ g, x, ch });
      x += g.advanceWidth * k + o.spacing;
      if (i + 1 < glyphs.length) x += font.getKerningValue(g, glyphs[i + 1]) * k;
    });
    widths.push(Math.max(0, x - o.spacing)); out.push(items);
  });
  const maxW = Math.max(...widths, 0), res = [];
  out.forEach((items, li) => {
    const dx = o.align === 'center' ? (maxW - widths[li]) / 2 : o.align === 'right' ? maxW - widths[li] : 0, y = -li * o.h * o.lead;
    for (const it of items) {
      if (!it.ch.trim()) continue;
      const rings = glyphContours(it.g, it.x + dx, y, size);
      if (!rings.length) continue;
      const shapes = clipRun(rings, null, ClipperLib.ClipType.ctUnion, ClipperLib.PolyFillType.pftNonZero);
      res.push({ ch: it.ch, line: li, shapes });
    }
  });
  return { glyphs: res, missing: [...missing], lines: lines.length };
}
function shapesBB(shapes) { return bboxPts(shapes.flatMap(s => s.outer)); }
/* split islands with bridges so nothing falls out of a cut-through stencil */
function bridgeShapes(shapes, bw) {
  const C = ClipperLib;
  let cur = shapes;
  for (const dir of ['v', 'h']) {
    const next = [];
    for (const s of cur) {
      if (!s.holes.length) { next.push(s); continue; }
      const bb = bboxPts(s.outer), strips = s.holes.map(h => {
        const hb = bboxPts(h);
        if (dir === 'v') { const cx = (hb.x0 + hb.x1) / 2; return [[cx - bw / 2, bb.y0 - 1], [cx + bw / 2, bb.y0 - 1], [cx + bw / 2, bb.y1 + 1], [cx - bw / 2, bb.y1 + 1]]; }
        const cy = (hb.y0 + hb.y1) / 2; return [[bb.x0 - 1, cy - bw / 2], [bb.x1 + 1, cy - bw / 2], [bb.x1 + 1, cy + bw / 2], [bb.x0 - 1, cy + bw / 2]];
      });
      next.push(...clipRun(shapeRings(s), strips, C.ClipType.ctDifference, C.PolyFillType.pftNonZero));
    }
    cur = next;
  }
  return cur;
}
const toPart = (s, tol = 0.03) => normalizeShape({ outer: fitPoly(s.outer, true, tol), holes: s.holes.map(h => fitPoly(h, true, tol)) });
function normalizeShape(g) { return normalizePart(g.outer, g.holes); }
/* builds the parts for one text request */
function buildTextParts(o) {
  const L = layoutText(o), C = ClipperLib, warn = [];
  if (L.missing.length) warn.push(`Фонтод байхгүй тэмдэгт: ${L.missing.join(' ')}`);
  if (!L.glyphs.length) throw new Error('Текст хоосон байна');
  const parts = [];
  if (o.mode === 'letters') {
    const groups = new Map();
    for (const g of L.glyphs) g.shapes.forEach((s, i) => {
      const key = g.ch + '|' + i + '|' + g.shapes.length;
      if (groups.has(key)) groups.get(key).qty++;
      else groups.set(key, { qty: 1, s, name: `«${g.ch}»` + (g.shapes.length > 1 ? ` ${i + 1}/${g.shapes.length}` : '') });
    });
    for (const gr of groups.values()) parts.push({ name: gr.name, qty: gr.qty, ...toPart(gr.s) });
  } else if (o.mode === 'sign') {
    for (let li = 0; li < L.lines; li++) {
      const gl = L.glyphs.filter(g => g.line === li).flatMap(g => g.shapes); if (!gl.length) continue;
      const bb = shapesBB(gl), y = -li * o.h * o.lead, t = o.bar;
      const bar = { outer: [[bb.x0 - o.barPad, y - t / 2], [bb.x1 + o.barPad, y - t / 2], [bb.x1 + o.barPad, y + t / 2], [bb.x0 - o.barPad, y + t / 2]], holes: [] };
      const u = unionShapes(gl.concat(t > 0 ? [bar] : [])).sort((a, b) => Math.abs(polyArea(b.outer)) - Math.abs(polyArea(a.outer)));
      const label = L.lines > 1 ? `Самбар ${li + 1}: ` : 'Самбар: ';
      parts.push({ name: label + o.text.split('\n')[li].slice(0, 24), qty: 1, ...toPart(u[0]) });
      if (u.length > 1) { warn.push(`${u.length - 1} салангид хэсэг (цэг, тэмдэг) тусдаа парт болсон`); u.slice(1).forEach((s, i) => parts.push({ name: `${label}хэсэг ${i + 1}`, qty: 1, ...toPart(s) })); }
    }
  } else {
    let cut = unionShapes(L.glyphs.flatMap(g => g.shapes));
    if (o.bridge > 0) cut = bridgeShapes(cut, o.bridge);
    if (cut.some(s => s.holes.length)) warn.push('Зарим үсгийн дотор хэсэг унах эрсдэлтэй — гүүрийн өргөнийг нэмнэ үү');
    const bb = shapesBB(cut), m = o.margin;
    const W = bb.x1 - bb.x0 + 2 * m, H = bb.y1 - bb.y0 + 2 * m, ox = bb.x0 - m, oy = bb.y0 - m;
    const holes = cut.map(s => fitPoly(s.outer.map(p => [p[0] - ox, p[1] - oy]), true, 0.03));
    if (o.hole > 0) { const e = Math.max(o.hole, m / 2); [[e, e], [W - e, e], [W - e, H - e], [e, H - e]].forEach(c => holes.push(circleLoop(c[0], c[1], o.hole / 2))); }
    parts.push({ name: 'Stencil хавтан: ' + o.text.replace(/\n/g, ' ').slice(0, 24), qty: 1, ...normalizePart(rectLoop(W, H, Math.min(o.radius, W / 2, H / 2)), holes) });
  }
  return { parts, warn };
}
function polyArea(r) { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
