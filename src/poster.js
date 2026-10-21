/* ================= Kh International — wall poster of a work instruction (A3 / A4) =================
   Safety signs follow the ISO 7010 colour/shape system (blue = mandatory, red = prohibited,
   yellow = warning, green = emergency); the pictograms are drawn here, not copied. */
const SG = { blue: '#1b5aa6', red: '#d21f26', yel: '#f6c400', green: '#1e8e3e', ink: '#111' };
/* ---- glyphs: drawn in a unit box (-1..1), colour c ---- */
const GL = {
  helmet(x, c) { x.fillStyle = c; x.beginPath(); x.arc(0, 0.2, 0.62, Math.PI, 0); x.closePath(); x.fill(); x.fillRect(-0.85, 0.16, 1.7, 0.18); x.fillRect(-0.06, -0.45, 0.12, 0.62); },
  goggles(x, c) { x.fillStyle = c; x.fillRect(-0.95, -0.05, 1.9, 0.1); [-0.38, 0.38].forEach(X => { x.beginPath(); x.ellipse(X, 0, 0.34, 0.25, 0, 0, Math.PI * 2); x.fill(); }); },
  glove(x, c) { x.fillStyle = c; rr(x, -0.38, -0.12, 0.72, 0.72, 0.15); x.fill(); [-0.36, -0.17, 0.02, 0.21].forEach((X, i) => { rr(x, X, -0.72 + (i === 0 || i === 3 ? 0.12 : 0), 0.15, 0.7, 0.07); x.fill(); }); x.save(); x.translate(0.38, 0.12); x.rotate(-0.7); rr(x, -0.07, -0.42, 0.15, 0.5, 0.07); x.fill(); x.restore(); },
  boot(x, c) { x.fillStyle = c; x.beginPath(); x.moveTo(-0.45, -0.75); x.lineTo(0.08, -0.75); x.lineTo(0.08, 0.12); x.quadraticCurveTo(0.7, 0.2, 0.72, 0.5); x.lineTo(0.72, 0.68); x.lineTo(-0.45, 0.68); x.closePath(); x.fill(); },
  ear(x, c) { x.strokeStyle = c; x.fillStyle = c; x.lineWidth = 0.13; x.beginPath(); x.arc(0, 0.05, 0.58, Math.PI, 0); x.stroke(); rr(x, -0.78, -0.05, 0.32, 0.6, 0.12); x.fill(); rr(x, 0.46, -0.05, 0.32, 0.6, 0.12); x.fill(); },
  vest(x, c, bg) { x.fillStyle = c; x.beginPath(); x.moveTo(-0.6, -0.65); x.lineTo(-0.25, -0.65); x.lineTo(0, -0.2); x.lineTo(0.25, -0.65); x.lineTo(0.6, -0.65); x.lineTo(0.66, 0.7); x.lineTo(-0.66, 0.7); x.closePath(); x.fill(); x.fillStyle = bg; x.fillRect(-0.66, 0.1, 1.32, 0.1); x.fillRect(-0.66, 0.35, 1.32, 0.1); },
  shirt(x, c) { x.fillStyle = c; x.beginPath(); x.moveTo(-0.3, -0.65); x.lineTo(0.3, -0.65); x.lineTo(0.85, -0.25); x.lineTo(0.62, 0.02); x.lineTo(0.42, -0.12); x.lineTo(0.42, 0.7); x.lineTo(-0.42, 0.7); x.lineTo(-0.42, -0.12); x.lineTo(-0.62, 0.02); x.lineTo(-0.85, -0.25); x.closePath(); x.fill(); },
  mask(x, c, bg) { x.strokeStyle = c; x.lineWidth = 0.1; x.beginPath(); x.ellipse(0, -0.05, 0.48, 0.65, 0, 0, Math.PI * 2); x.stroke(); x.fillStyle = c; x.beginPath(); x.ellipse(0, 0.25, 0.42, 0.32, 0, 0, Math.PI * 2); x.fill(); [-0.5, 0.5].forEach(X => { x.beginPath(); x.arc(X, 0.3, 0.2, 0, Math.PI * 2); x.fill(); }); x.fillStyle = bg; [-0.2, 0.2].forEach(X => { x.beginPath(); x.ellipse(X, -0.25, 0.12, 0.07, 0, 0, Math.PI * 2); x.fill(); }); },
  weldmask(x, c, bg) { x.fillStyle = c; rr(x, -0.52, -0.7, 1.04, 1.4, 0.35); x.fill(); x.fillStyle = bg; rr(x, -0.34, -0.25, 0.68, 0.24, 0.05); x.fill(); },
  apron(x, c) { x.fillStyle = c; x.beginPath(); x.moveTo(-0.3, -0.45); x.lineTo(0.3, -0.45); x.lineTo(0.5, 0.75); x.lineTo(-0.5, 0.75); x.closePath(); x.fill(); x.strokeStyle = c; x.lineWidth = 0.08; x.beginPath(); x.arc(0, -0.5, 0.28, Math.PI, 0); x.stroke(); },
  belt(x, c, bg) { GL.person(x, c); x.strokeStyle = bg; x.lineWidth = 0.12; x.beginPath(); x.moveTo(-0.3, -0.3); x.lineTo(0.3, 0.25); x.stroke(); },
  person(x, c) { x.fillStyle = c; x.beginPath(); x.arc(0, -0.62, 0.2, 0, Math.PI * 2); x.fill(); rr(x, -0.26, -0.36, 0.52, 0.66, 0.1); x.fill(); x.fillRect(-0.24, 0.25, 0.2, 0.55); x.fillRect(0.04, 0.25, 0.2, 0.55); },
  load(x, c) { x.strokeStyle = c; x.fillStyle = c; x.lineWidth = 0.08; x.beginPath(); x.moveTo(0, -0.95); x.lineTo(0, -0.55); x.stroke(); x.beginPath(); x.arc(0, -0.4, 0.15, -Math.PI / 2, Math.PI * 1.1); x.stroke(); x.beginPath(); x.moveTo(-0.05, -0.27); x.lineTo(-0.45, 0.1); x.moveTo(0.05, -0.27); x.lineTo(0.45, 0.1); x.stroke(); x.fillRect(-0.55, 0.1, 1.1, 0.6); },
  under(x, c) { x.save(); x.translate(0, -0.35); x.scale(0.6, 0.6); GL.load(x, c); x.restore(); x.save(); x.translate(0, 0.42); x.scale(0.55, 0.55); GL.person(x, c); x.restore(); },
  flame(x, c) { x.fillStyle = c; x.beginPath(); x.moveTo(0, -0.85); x.bezierCurveTo(0.55, -0.3, 0.6, 0.1, 0.45, 0.45); x.bezierCurveTo(0.3, 0.8, -0.3, 0.8, -0.45, 0.45); x.bezierCurveTo(-0.6, 0.1, -0.35, -0.2, -0.12, -0.35); x.bezierCurveTo(-0.1, -0.05, 0.05, 0.05, 0.1, -0.15); x.bezierCurveTo(0.15, -0.4, 0.05, -0.6, 0, -0.85); x.fill(); },
  bolt(x, c) { x.fillStyle = c; x.beginPath(); x.moveTo(0.15, -0.85); x.lineTo(-0.4, 0.1); x.lineTo(-0.02, 0.1); x.lineTo(-0.18, 0.85); x.lineTo(0.42, -0.15); x.lineTo(0.04, -0.15); x.closePath(); x.fill(); },
  laser(x, c) { x.strokeStyle = c; x.fillStyle = c; x.lineWidth = 0.09; x.beginPath(); x.moveTo(-0.9, 0); x.lineTo(0.1, 0); x.stroke(); x.beginPath(); x.arc(0.35, 0, 0.12, 0, Math.PI * 2); x.fill(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; x.beginPath(); x.moveTo(0.35 + Math.cos(a) * 0.22, Math.sin(a) * 0.22); x.lineTo(0.35 + Math.cos(a) * 0.45, Math.sin(a) * 0.45); x.stroke(); } },
  gear(x, c, bg) { x.fillStyle = c; for (let i = 0; i < 8; i++) { x.save(); x.rotate(i * Math.PI / 4); x.fillRect(-0.12, -0.78, 0.24, 0.3); x.restore(); } x.beginPath(); x.arc(0, 0, 0.55, 0, Math.PI * 2); x.fill(); x.fillStyle = bg; x.beginPath(); x.arc(0, 0, 0.2, 0, Math.PI * 2); x.fill(); },
  crush(x, c) { x.fillStyle = c; x.fillRect(-0.8, -0.85, 1.6, 0.35); x.fillRect(-0.8, 0.5, 1.6, 0.35); x.beginPath(); x.moveTo(0, -0.42); x.lineTo(-0.15, -0.2); x.lineTo(0.15, -0.2); x.closePath(); x.fill(); x.save(); x.translate(0.05, 0.15); x.rotate(Math.PI / 2); x.scale(0.42, 0.42); GL.glove(x, c); x.restore(); },
  hot(x, c) { x.strokeStyle = c; x.lineWidth = 0.1; [-0.35, 0, 0.35].forEach(X => { x.beginPath(); x.moveTo(X, 0.3); x.bezierCurveTo(X - 0.18, 0.1, X + 0.18, -0.15, X, -0.4); x.bezierCurveTo(X - 0.15, -0.55, X + 0.1, -0.65, X, -0.8); x.stroke(); }); x.fillStyle = c; x.fillRect(-0.75, 0.45, 1.5, 0.25); },
  car(x, c, bg) { x.fillStyle = c; x.beginPath(); x.moveTo(-0.9, 0.25); x.lineTo(-0.85, -0.05); x.lineTo(-0.45, -0.12); x.lineTo(-0.25, -0.45); x.lineTo(0.35, -0.45); x.lineTo(0.55, -0.1); x.lineTo(0.88, 0); x.lineTo(0.9, 0.25); x.closePath(); x.fill(); x.fillStyle = bg; [-0.5, 0.5].forEach(X => { x.beginPath(); x.arc(X, 0.3, 0.2, 0, Math.PI * 2); x.fill(); }); x.fillStyle = c; [-0.5, 0.5].forEach(X => { x.beginPath(); x.arc(X, 0.3, 0.13, 0, Math.PI * 2); x.fill(); }); },
  phone(x, c, bg) { x.fillStyle = c; rr(x, -0.3, -0.7, 0.6, 1.4, 0.1); x.fill(); x.fillStyle = bg; x.fillRect(-0.22, -0.55, 0.44, 0.9); },
  bottle(x, c) { x.fillStyle = c; x.fillRect(-0.09, -0.85, 0.18, 0.35); x.beginPath(); x.moveTo(-0.09, -0.5); x.lineTo(-0.3, -0.25); x.lineTo(-0.3, 0.8); x.lineTo(0.3, 0.8); x.lineTo(0.3, -0.25); x.lineTo(0.09, -0.5); x.closePath(); x.fill(); },
  cig(x, c) { x.fillStyle = c; x.fillRect(-0.75, 0.1, 1.3, 0.22); x.fillRect(0.6, 0.1, 0.15, 0.22); x.strokeStyle = c; x.lineWidth = 0.07; x.beginPath(); x.moveTo(0.68, 0); x.bezierCurveTo(0.5, -0.2, 0.85, -0.35, 0.65, -0.6); x.stroke(); },
  drop(x, c) { x.fillStyle = c; x.beginPath(); x.moveTo(0, -0.8); x.bezierCurveTo(0.35, -0.3, 0.55, 0.05, 0.5, 0.3); x.arc(0, 0.3, 0.5, 0, Math.PI); x.bezierCurveTo(-0.55, 0.05, -0.35, -0.3, 0, -0.8); x.fill(); },
  eye(x, c, bg) { x.fillStyle = c; x.beginPath(); x.moveTo(-0.85, 0); x.quadraticCurveTo(0, -0.7, 0.85, 0); x.quadraticCurveTo(0, 0.7, -0.85, 0); x.fill(); x.fillStyle = bg; x.beginPath(); x.arc(0, 0, 0.28, 0, Math.PI * 2); x.fill(); x.fillStyle = c; x.beginPath(); x.arc(0, 0, 0.14, 0, Math.PI * 2); x.fill(); },
  key(x, c, bg) { x.fillStyle = c; x.fillRect(-0.6, -0.55, 1.2, 0.22); x.fillRect(-0.1, -0.4, 0.2, 1.1); x.fillRect(-0.18, 0.45, 0.36, 0.3); },
  estop(x) { x.fillStyle = SG.yel; x.beginPath(); x.arc(0, 0, 0.95, 0, Math.PI * 2); x.fill(); x.fillStyle = SG.red; x.beginPath(); x.arc(0, 0, 0.62, 0, Math.PI * 2); x.fill(); x.fillStyle = '#fff'; x.font = `700 0.32px ${DF}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('STOP', 0, 0.02); },
  ext(x, c) { x.fillStyle = c; rr(x, -0.25, -0.35, 0.5, 1.1, 0.15); x.fill(); x.fillRect(-0.1, -0.6, 0.2, 0.25); x.fillRect(-0.3, -0.68, 0.6, 0.1); x.strokeStyle = c; x.lineWidth = 0.08; x.beginPath(); x.moveTo(0.3, -0.63); x.quadraticCurveTo(0.7, -0.6, 0.6, -0.1); x.stroke(); },
  aid(x, c) { x.fillStyle = c; x.fillRect(-0.18, -0.65, 0.36, 1.3); x.fillRect(-0.65, -0.18, 1.3, 0.36); },
  noentry(x, c) { GL.person(x, c); }
};
function rr(x, X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
/* sign frames; cx, cy centre, d size (mm) */
function signDraw(x, kind, g, cx, cy, d) {
  x.save(); x.translate(cx, cy); const r = d / 2;
  if (kind === 'm') { x.fillStyle = SG.blue; x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.fill(); x.scale(r * 0.62, r * 0.62); GL[g](x, '#fff', SG.blue); }
  else if (kind === 'p') { x.fillStyle = '#fff'; x.beginPath(); x.arc(0, 0, r, 0, Math.PI * 2); x.fill(); x.save(); x.scale(r * 0.56, r * 0.56); GL[g](x, SG.ink, '#fff'); x.restore(); x.strokeStyle = SG.red; x.lineWidth = r * 0.17; x.beginPath(); x.arc(0, 0, r * 0.91, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.moveTo(-r * 0.64, -r * 0.64); x.lineTo(r * 0.64, r * 0.64); x.stroke(); }
  else if (kind === 'w') { const h = r * 1.75; x.fillStyle = SG.ink; x.beginPath(); x.moveTo(0, -h * 0.62); x.lineTo(r * 1.02, h * 0.42); x.lineTo(-r * 1.02, h * 0.42); x.closePath(); x.lineJoin = 'round'; x.lineWidth = r * 0.12; x.strokeStyle = SG.ink; x.stroke(); x.fill(); x.fillStyle = SG.yel; x.beginPath(); x.moveTo(0, -h * 0.48); x.lineTo(r * 0.84, h * 0.34); x.lineTo(-r * 0.84, h * 0.34); x.closePath(); x.fill(); x.translate(0, h * 0.08); x.scale(r * 0.5, r * 0.5); GL[g](x, SG.ink, SG.yel); }
  else if (kind === 'e') { if (g === 'estop') { x.scale(r, r); GL.estop(x); } else { x.fillStyle = SG.green; rr(x, -r, -r, d, d, r * 0.12); x.fill(); x.scale(r * 0.62, r * 0.62); GL[g](x, '#fff', SG.green); } }
  x.restore();
}
/* library: PPE from text keywords; warnings & prohibitions selectable */
const PPE_KEYS = [[/гагнуурын баг|weld/i, 'weldmask'], [/дуулга|helmet/i, 'helmet'], [/нүдний шил|лазерын хамгаалалтын шил|glasses|goggle/i, 'goggles'], [/бээлий|glove/i, 'glove'], [/гутал|boot/i, 'boot'], [/чихэвч|ear/i, 'ear'], [/хантааз|vest/i, 'vest'], [/амьсгал|respir/i, 'mask'], [/хормогч|apron/i, 'apron'], [/бүс|belt/i, 'belt'], [/хувцас|cloth/i, 'shirt']];
const WARN_LIB = { load: ['load', 'Өргөлттэй ачаа'], crush: ['crush', 'Гар хавчуулах аюул'], elec: ['bolt', 'Цахилгааны аюул'], hot: ['hot', 'Халуун гадаргуу'], gear: ['gear', 'Эргэлдэх хэсэг'], laser: ['laser', 'Лазерын цацраг'], fire: ['flame', 'Галын аюул'], arc: ['laser', 'Нумын хурц гэрэл'], car: ['car', 'Хөдөлгөөнт техник'], noise: ['ear', 'Чанга дуу чимээ'] };
const FORBID_LIB = { under: ['under', 'Ачааны доор зогсохгүй'], ride: ['person', 'Хүн өргөхгүй'], unauth: ['person', 'Эрхгүй хүн ажиллуулахгүй'], smoke: ['cig', 'Тамхи, ил гал хориглоно'], flame: ['flame', 'Шатамхай зүйл ойртуулахгүй'], wet: ['drop', 'Нойтон гараар хүрэхгүй'], glove: ['glove', 'Бээлийтэй ажиллахгүй'], hand: ['glove', 'Гар оруулахгүй'], phone: ['phone', 'Утсаар ярихгүй'], alcohol: ['bottle', 'Согтуу жолоодохгүй'], eye: ['eye', 'Цацраг руу харахгүй'], key: ['key', 'Түлхүүр орхихгүй'] };
const POSTER_DEF = { crane: [['load', 'crush'], ['under', 'ride', 'unauth']], gen: [['elec', 'hot', 'noise'], ['smoke', 'wet']], mill: [['gear', 'crush'], ['glove', 'hand']], wire: [['elec'], ['hand', 'wet']], press: [['crush', 'elec'], ['hand', 'unauth']], vehicle: [['car'], ['phone', 'alcohol', 'smoke']], laser: [['laser', 'fire', 'elec'], ['eye', 'flame']], lathe: [['gear'], ['glove', 'key']], weld: [['arc', 'elec', 'fire'], ['flame', 'wet']], forklift: [['car', 'load'], ['ride', 'phone', 'unauth']] };
const posterOf = m => { const d = POSTER_DEF[m.ins] || [['crush'], ['unauth']]; return m.poster || { warn: d[0].slice(), forbid: d[1].slice(), phone: '', boss: '' }; };
const ppeGlyph = t => (PPE_KEYS.find(([re]) => re.test(t)) || [, null])[1];
const loadImgSrc = src => new Promise(res => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

/* ---------- the poster, designed on A3 (297 × 420 mm) ---------- */
async function posterImg(m, fmt) {
  try { await document.fonts.ready; } catch (e) { } await logoImg();
  const photo = await loadImgSrc(m.photo), T = instrOf(m), P = posterOf(m), s = fmt === 'a3' ? 1 : 210 / 297, K = fmt === 'a3' ? 4 : 5;
  const W = 297, H = 420, M = 12, c = document.createElement('canvas'); c.width = Math.round(W * s * K); c.height = Math.round(H * s * K);
  const x = c.getContext('2d'); x.scale(s * K, s * K); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  const txt = (t, X, Y, o = {}) => { x.font = `${o.b ? 700 : o.sb ? 600 : 400} ${o.s || 4}px ${DF}`; x.fillStyle = o.c || SG.ink; x.textAlign = o.a || 'left'; x.textBaseline = o.bl || 'alphabetic'; let v = tr(String(t)); if (o.w) while (v.length > 1 && x.measureText(v).width > o.w) v = v.slice(0, -2) + '…'; x.fillText(v, X, Y); };
  const wrap = (t, w, font) => { x.font = font; const out = []; tr(String(t)).split('\n').forEach(p => { let ln = ''; p.split(' ').forEach(wd => { const tt = ln ? ln + ' ' + wd : wd; if (x.measureText(tt).width > w && ln) { out.push(ln); ln = wd; } else ln = tt; }); out.push(ln); }); return out; };
  /* list block that shrinks its font until it fits */
  const listBlock = (items, X, Y, w, h, color, opt = {}) => {
    let fs = opt.max || 5.2, lines;
    for (; fs > 2.6; fs -= 0.15) { const f = `400 ${fs}px ${DF}`; lines = items.map((t, i) => wrap(t, w - fs * 2.3, f)); const tot = lines.reduce((a, l) => a + l.length, 0) * fs * 1.32 + items.length * fs * 0.55; if (tot <= h) break; }
    let y = Y + fs; lines.forEach((ls, i) => {
      x.fillStyle = color; x.beginPath(); x.arc(X + fs * 0.75, y - fs * 0.33, fs * 0.72, 0, Math.PI * 2); x.fill();
      txt(i + 1, X + fs * 0.75, y - fs * 0.33, { b: 1, s: fs * 0.82, c: '#fff', a: 'center', bl: 'middle' });
      ls.forEach(l => { txt(l, X + fs * 2.1, y, { s: fs }); y += fs * 1.32; }); y += fs * 0.55;
    });
  };
  // header
  x.fillStyle = '#23272b'; x.fillRect(0, 0, W, 44); x.fillStyle = SG.yel; x.fillRect(0, 44, W, 2.2);
  x.fillStyle = '#fff'; rr(x, M, 9, 74, 26, 3); x.fill(); drawLogo(x, M + 4, 13, 18);
  txt('АЖЛЫН БАЙРНЫ ЗААВАР', M + 84, 22, { b: 1, s: 11, c: '#fff' });
  txt(m.name, M + 84, 34, { b: 1, s: 7.5, c: '#ff9a4a', w: W - M * 2 - 84 });
  txt(`№ ${m.no}  ·  ${m.model}`, W - M, 41.5, { s: 3.4, c: '#c9cfd6', a: 'right', w: 120 });
  // photo
  const pY = 52, pW = 132, pH = 82; x.fillStyle = '#eef1f4'; rr(x, M, pY, pW, pH, 3); x.fill();
  if (photo) { x.save(); rr(x, M, pY, pW, pH, 3); x.clip(); const sc = Math.max(pW / photo.naturalWidth, pH / photo.naturalHeight), iw = photo.naturalWidth * sc, ih = photo.naturalHeight * sc; x.drawImage(photo, M + (pW - iw) / 2, pY + (pH - ih) / 2, iw, ih); x.restore(); }
  else { x.save(); x.translate(M + pW / 2, pY + pH / 2 - 6); x.scale(26, 26); GL[m.kind === 'vehicle' ? 'car' : 'gear'](x, '#b9c2cc', '#eef1f4'); x.restore(); txt('Тоногийн зураг', M + pW / 2, pY + pH - 10, { s: 3.6, c: '#8a95a1', a: 'center' }); }
  x.strokeStyle = '#c6ced7'; x.lineWidth = 0.4; rr(x, M, pY, pW, pH, 3); x.stroke();
  // PPE
  const ppe = (T.ppe || []).map(t => [ppeGlyph(t), t]).filter(p => p[0]).slice(0, 6);
  const RX = M + pW + 8, RW = W - M - RX;
  x.fillStyle = SG.blue; rr(x, RX, pY, RW, 9, 2); x.fill(); txt('ЗААВАЛ ХЭРЭГЛЭХ ХАМГААЛАХ ХЭРЭГСЭЛ', RX + 3, pY + 6.3, { b: 1, s: 3.9, c: '#fff', w: RW - 6 });
  const pc = Math.min(3, Math.max(1, ppe.length)), pcw = RW / pc, pd = Math.min(30, pcw - 10), rows = Math.ceil(ppe.length / pc) || 1, prh = (pH - 12) / Math.max(rows, 2);
  ppe.forEach(([g, t], i) => { const cx = RX + pcw * (i % pc) + pcw / 2, cy = pY + 13 + Math.floor(i / pc) * prh + Math.min(pd, prh - 9) / 2; const dd = Math.min(pd, prh - 10); signDraw(x, 'm', g, cx, cy, dd); wrap(t, pcw - 3, `600 3.2px ${DF}`).slice(0, 2).forEach((l, k) => txt(l, cx, cy + dd / 2 + 4.2 + k * 3.8, { sb: 1, s: 3.2, a: 'center' })); });
  if (!ppe.length) txt('—', RX + RW / 2, pY + 50, { s: 6, a: 'center', c: '#999' });
  // warnings strip
  let y = pY + pH + 8; const wn = P.warn.filter(k => WARN_LIB[k]);
  if (wn.length) {
    x.fillStyle = '#fff7d1'; rr(x, M, y, W - 2 * M, 28, 3); x.fill(); x.strokeStyle = SG.yel; x.lineWidth = 0.8; rr(x, M, y, W - 2 * M, 28, 3); x.stroke();
    txt('АНХААР', M + 5, y + 16, { b: 1, s: 5, c: '#7a5a00' });
    const ww = (W - 2 * M - 40) / wn.length;
    wn.forEach((k, i) => { const [g, t] = WARN_LIB[k], cx = M + 40 + ww * i + 16; signDraw(x, 'w', g, cx, y + 14, 20); txt(t, cx + 14, y + 15, { sb: 1, s: 3.6, w: ww - 34, bl: 'middle' }); });
    y += 34;
  }
  // three columns
  const cols = [['1', 'АЖИЛ ЭХЛЭХИЙН ӨМНӨ', T.before || [], SG.blue], ['2', 'АЖИЛЛАХ ҮЕД', T.during || [], '#e0650f'], ['3', 'АЖИЛ ДУУССАНЫ ДАРАА', T.after || [], SG.green]];
  const gap = 6, cw = (W - 2 * M - gap * 2) / 3, ch = 102;
  cols.forEach(([n, t, items, col], i) => {
    const X = M + i * (cw + gap); x.fillStyle = '#f7f8fa'; rr(x, X, y, cw, ch, 3); x.fill(); x.fillStyle = col; rr(x, X, y, cw, 13, 3); x.fill(); x.fillRect(X, y + 8, cw, 5);
    txt(n, X + 6, y + 9.8, { b: 1, s: 7, c: '#fff', a: 'center' }); txt(t, X + 12, y + 9, { b: 1, s: 4, c: '#fff', w: cw - 14 });
    listBlock(items, X + 4, y + 17, cw - 7, ch - 21, col);
  });
  y += ch + 6;
  // prohibited
  const fb = P.forbid.filter(k => FORBID_LIB[k]), ph = 54;
  x.strokeStyle = SG.red; x.lineWidth = 0.9; rr(x, M, y, W - 2 * M, ph, 3); x.stroke(); x.fillStyle = SG.red; rr(x, M, y, W - 2 * M, 11, 3); x.fill(); x.fillRect(M, y + 7, W - 2 * M, 4);
  txt('ХОРИГЛОНО', M + 5, y + 8.2, { b: 1, s: 5, c: '#fff' });
  const fiW = Math.min(132, fb.length * 33); fb.slice(0, 4).forEach((k, i) => { const [g, t] = FORBID_LIB[k], cx = M + 18 + i * 33; signDraw(x, 'p', g, cx, y + 27, 22); wrap(t, 31, `600 2.9px ${DF}`).slice(0, 3).forEach((l, j) => txt(l, cx, y + 43 + j * 3.4, { sb: 1, s: 2.9, a: 'center' })); });
  listBlock(T.forbid || [], M + Math.max(fiW, 8) + 8, y + 14, W - 2 * M - Math.max(fiW, 8) - 12, ph - 17, SG.red, { max: 4.6 });
  y += ph + 6;
  // emergency
  const eh = H - y - 17; x.fillStyle = '#e9f6ed'; rr(x, M, y, W - 2 * M, eh, 3); x.fill(); x.fillStyle = SG.green; rr(x, M, y, W - 2 * M, 11, 3); x.fill(); x.fillRect(M, y + 7, W - 2 * M, 4);
  txt('ОСОЛ, ЯАРАЛТАЙ ҮЕД', M + 5, y + 8.2, { b: 1, s: 5, c: '#fff' });
  [['estop', 'Яаралтай зогсоох'], ['ext', 'Галын хор'], ['aid', 'Анхны тусламж']].forEach(([g, t], i) => { const cx = M + 16 + i * 27; signDraw(x, 'e', g, cx, y + 26, 19); wrap(t, 26, `600 2.8px ${DF}`).forEach((l, j) => txt(l, cx, y + 40 + j * 3.3, { sb: 1, s: 2.8, a: 'center' })); });
  const eX = M + 96, eW = 92; listBlock(T.emerg || [], eX, y + 14, eW, eh - 17, SG.green, { max: 4.2 });
  const nX = eX + eW + 6, nW = W - M - nX - 3; [['101', 'Гал түймэр'], ['102', 'Цагдаа'], ['103', 'Түргэн тусламж']].forEach(([n, t], i) => { const Y = y + 14 + i * 10.5; x.fillStyle = '#fff'; rr(x, nX, Y, nW, 9, 2); x.fill(); txt(n, nX + 3, Y + 6.9, { b: 1, s: 6.2, c: SG.red }); txt(t, nX + 21, Y + 6.2, { sb: 1, s: 3.6, w: nW - 24 }); });
  txt(`Ахлах: ${P.boss || '________________'}   Утас: ${P.phone || '____________'}`, nX, y + 14 + 3 * 10.5 + 4, { s: 3.2, w: nW });
  // footer
  x.fillStyle = '#23272b'; x.fillRect(0, H - 13, W, 13);
  txt(`Kh International · ISO 9001${S.iso.formInstr ? ' · ' + S.iso.formInstr : ''}${S.iso.rev ? ' · Хувилбар ' + S.iso.rev : ''}`, M, H - 4.8, { s: 3.2, c: '#c9cfd6' });
  txt(`Баталсан: ____________   Огноо: ${today()}`, W - M, H - 4.8, { s: 3.2, c: '#c9cfd6', a: 'right' });
  return c.toDataURL('image/jpeg', 0.92);
}
async function posterOut(mode, ms, fmt) {
  try { const imgs = []; for (const m of ms) imgs.push({ url: await posterImg(m, fmt), alias: 'pst' + m.id }); const name = ms.length === 1 ? `${ms[0].no}_${ms[0].name}_ханын_самбар_${fmt.toUpperCase()}` : `Kh_International_ханын_самбар_бүгд_${fmt.toUpperCase()}`; if (mode === 'print') printImgs(imgs, false, fmt, name); else pdfImgs(imgs, false, name, fmt); }
  catch (e) { console.error(e); toast('Алдаа: ' + e.message); }
}
/* store a machine photo, downscaled */
function pickMachinePhoto(m, done) {
  const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*';
  f.onchange = () => { const file = f.files[0]; if (!file) return; const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => { const sc = Math.min(1, 1000 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * sc); c.height = Math.round(im.naturalHeight * sc); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); m.photo = c.toDataURL('image/jpeg', 0.82); save(); done(); toast('Зураг нэмэгдлээ'); }; im.onerror = () => toast('Зураг уншигдсангүй'); im.src = rd.result; }; rd.readAsDataURL(file); };
  f.click();
}
