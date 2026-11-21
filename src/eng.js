/* ================= Kh International — Инженерийн тооцоо: даац (дам нуруу), боолт, гагнуур, өргөх чих, металлын жин,
   нэгж хувиргагч, хатуулаг. Units in mm · N · MPa unless shown; results are design estimates for the engineer to check. ================= */
const ENG = { tool: 'beam', v: {} };
try { Object.assign(ENG, JSON.parse(localStorage.getItem('kh-eng') || '{}')); } catch (e) { }
const engSave = () => { try { localStorage.setItem('kh-eng', JSON.stringify(ENG)); } catch (e) { } };
const ENG_MAT = [ // name, yield Fy MPa, ultimate fu MPa, E MPa, density kg/m³
  ['S235', 235, 360, 200000, 7850], ['S275', 275, 430, 200000, 7850], ['S355', 355, 490, 200000, 7850], ['Ст3 (St3sp)', 245, 370, 200000, 7850],
  ['09Г2С', 345, 490, 200000, 7850], ['Hardox 450', 1200, 1400, 205000, 7850], ['AISI 304', 205, 515, 193000, 7930], ['Al 6061-T6', 276, 310, 69000, 2700]];
const ENG_TOOLS = [
  ['beam', 'Даацын тооцоо — дам нуруу', 'Хүчдэл, нугаралт, зөвшөөрөгдөх ачаалал'],
  ['bolt', 'Боолт — эрэг чангалах момент', 'Эхний таталт, момент, зүсэлт, суналтын даац, нүх'],
  ['weld', 'Гагнуурын даац (өнцөг гагнуур)', 'Катет → ажлын зузаан → даац'],
  ['lug', 'Өргөх чих (lifting lug)', 'Суналт, урагдал, даралт — урьдчилсан шалгалт'],
  ['weight', 'Металлын жин', 'Хавтан, дугуй, хоолой, профиль, булан'],
  ['units', 'Нэгж хувиргагч', 'Урт, хүч, момент, даралт, жин, температур…'],
  ['hard', 'Хатуулгийн хувиргалт', 'HRC ↔ HV ↔ HB ↔ бат бэх (ойролцоо)']];
const ef = (v, d = 1) => (v == null || !isFinite(v)) ? '—' : nf(v, d);
/* ---------- beams ---------- */
const BEAM_CASE = [['ss_p', 'Хоёр тулгууртай — голдоо цэгэн ачаалал'], ['ss_u', 'Хоёр тулгууртай — жигд тархсан ачаалал'], ['cl_p', 'Консоль — үзүүрт цэгэн ачаалал'], ['cl_u', 'Консоль — жигд тархсан ачаалал'], ['fx_p', 'Хоёр үзүүр бэхэлсэн — голдоо цэгэн'], ['fx_u', 'Хоёр үзүүр бэхэлсэн — жигд тархсан']];
const BEAM_SEC = [['rect', 'Тэгш өнцөгт (хавтан, тэнхлэг)', ['b', 'h']], ['rhs', 'Тэгш өнцөгт хоолой (RHS)', ['B', 'H', 't']], ['bar', 'Дугуй цул', ['d']], ['pipe', 'Дугуй хоолой', ['D', 't']], ['ibeam', 'Хоёр тавиурт (I, H)', ['H', 'B', 'tw', 'tf']], ['custom', 'Өөрөө оруулах (I, W)', ['I', 'W']]];
function secProps(s, p) {
  const v = k => +p[k] || 0; let I = 0, c = 0, A = 0, W = 0;
  if (s === 'rect') { I = v('b') * v('h') ** 3 / 12; c = v('h') / 2; A = v('b') * v('h'); }
  else if (s === 'rhs') { const bi = v('B') - 2 * v('t'), hi = v('H') - 2 * v('t'); I = (v('B') * v('H') ** 3 - bi * hi ** 3) / 12; c = v('H') / 2; A = v('B') * v('H') - bi * hi; }
  else if (s === 'bar') { I = Math.PI * v('d') ** 4 / 64; c = v('d') / 2; A = Math.PI * v('d') ** 2 / 4; }
  else if (s === 'pipe') { const di = v('D') - 2 * v('t'); I = Math.PI * (v('D') ** 4 - di ** 4) / 64; c = v('D') / 2; A = Math.PI * (v('D') ** 2 - di ** 2) / 4; }
  else if (s === 'ibeam') { I = (v('B') * v('H') ** 3 - (v('B') - v('tw')) * (v('H') - 2 * v('tf')) ** 3) / 12; c = v('H') / 2; A = 2 * v('B') * v('tf') + (v('H') - 2 * v('tf')) * v('tw'); }
  else if (s === 'custom') { I = v('I') * 1e4; W = v('W') * 1e3; return { I, W, A: 0 }; }
  return { I, W: c ? I / c : 0, A };
}
function beamCalc(o) {
  const m = ENG_MAT[+o.mat || 0], E = m[3], Fy = m[1], L = +o.L || 0, sp = secProps(o.sec, o), I = sp.I, W = sp.W;
  const P = (+o.P || 0) * 1e3, selfw = o.self && sp.A ? sp.A * 1e-6 * m[4] * 9.81 / 1000 : 0;   // N/mm
  const k = o.case, isP = /_p$/.test(k), w = isP ? 0 : P / (L || 1) + selfw, F = isP ? P : 0;
  const Mc = { ss_p: F * L / 4, ss_u: w * L * L / 8, cl_p: F * L, cl_u: w * L * L / 2, fx_p: F * L / 8, fx_u: w * L * L / 12 }[k];
  const Dc = { ss_p: F * L ** 3 / (48 * E * I), ss_u: 5 * w * L ** 4 / (384 * E * I), cl_p: F * L ** 3 / (3 * E * I), cl_u: w * L ** 4 / (8 * E * I), fx_p: F * L ** 3 / (192 * E * I), fx_u: w * L ** 4 / (384 * E * I) }[k];
  const Vc = { ss_p: F / 2, ss_u: w * L / 2, cl_p: F, cl_u: w * L, fx_p: F / 2, fx_u: w * L / 2 }[k];
  let Mt = Mc, Dt = Dc;
  if (isP && selfw) { const add = { ss_p: [selfw * L * L / 8, 5 * selfw * L ** 4 / (384 * E * I)], cl_p: [selfw * L * L / 2, selfw * L ** 4 / (8 * E * I)], fx_p: [selfw * L * L / 12, selfw * L ** 4 / (384 * E * I)] }[k]; Mt += add[0]; Dt += add[1]; }
  const sig = W ? Mt / W : null, SF = +o.sf || 1.5, allow = Fy / SF, util = sig ? sig / allow : null;
  const Pallow = sig && P ? P / 1e3 * allow / sig * (Mc / (Mt || 1)) : null, lim = L / (+o.dlim || 250);
  return { I, W, A: sp.A, M: Mt, V: Vc, sig, allow, util, defl: Dt, lim, Pallow, selfw, Fy, E, mass: sp.A * 1e-6 * m[4] * L / 1000 };
}
/* ---------- bolts: ISO 261 coarse thread, ISO 898-1 classes, torque T = K·F·d ---------- */
const BOLTS = [ // d, pitch, stress area As mm², wrench s, clearance hole (medium, ISO 273)
  [6, 1, 20.1, 10, 6.6], [8, 1.25, 36.6, 13, 9], [10, 1.5, 58.0, 16, 11], [12, 1.75, 84.3, 18, 13.5], [14, 2, 115, 21, 15.5], [16, 2, 157, 24, 17.5], [18, 2.5, 192, 27, 20], [20, 2.5, 245, 30, 22],
  [22, 2.5, 303, 34, 24], [24, 3, 353, 36, 26], [27, 3, 459, 41, 30], [30, 3.5, 561, 46, 33], [33, 3.5, 694, 50, 36], [36, 4, 817, 55, 39], [42, 4.5, 1120, 65, 45], [48, 5, 1470, 75, 52]];
const BCLS = { '4.6': [225, 400, .6], '5.6': [280, 500, .6], '8.8': [null, null, .6], '10.9': [830, 1040, .5], '12.9': [970, 1220, .5] };
const bclsProps = (c, d) => c === '8.8' ? (d <= 16 ? [580, 800, .6] : [600, 830, .6]) : BCLS[c];
const BFRIC = [['0.20', 'Хуурай, ган (K = 0.20)'], ['0.17', 'Цайрдсан (K = 0.17)'], ['0.15', 'Тосолсон (K = 0.15)'], ['0.12', 'MoS₂ тостой (K = 0.12)']];
function boltRow(b, cls, K, pct) { const [d, p, As, s, h] = b, [Sp, fu, av] = bclsProps(cls, d), F = Sp * As * pct / 100, T = K * F * d / 1000; const fub = { '4.6': 400, '5.6': 500, '8.8': 800, '10.9': 1000, '12.9': 1200 }[cls];   // EN 1993-1-8 Table 3.1 nominal fub
  return { d, p, As, s, h, tap: d - p, F, T, Fv: av * fub * As / 1.25, Ft: .9 * fub * As / 1.25, Sp, fu }; }
/* ---------- fillet weld EN 1993-1-8 simplified method ---------- */
const WELD_BW = { 'S235': .8, 'S275': .85, 'S355': .9, 'Ст3 (St3sp)': .8, '09Г2С': .9 };
/* ---------- units ---------- */
const UNITS = {
  len: ['Урт', [['mm', 1e-3], ['cm', 1e-2], ['m', 1], ['km', 1e3], ['in', .0254], ['ft', .3048], ['yd', .9144], ['mile', 1609.344]]],
  force: ['Хүч', [['N', 1], ['kN', 1e3], ['MN', 1e6], ['kgf', 9.80665], ['tf (тонн-хүч)', 9806.65], ['lbf', 4.448222], ['kip', 4448.222]]],
  torque: ['Эргүүлэх момент', [['N·m', 1], ['kN·m', 1e3], ['N·mm', 1e-3], ['kgf·m', 9.80665], ['lbf·ft', 1.355818], ['lbf·in', .1129848]]],
  press: ['Даралт, хүчдэл', [['MPa (N/mm²)', 1e6], ['kPa', 1e3], ['Pa', 1], ['bar', 1e5], ['atm', 101325], ['psi', 6894.757], ['ksi', 6894757], ['kgf/cm²', 98066.5]]],
  mass: ['Жин', [['g', 1e-3], ['kg', 1], ['t (тонн)', 1e3], ['lb', .45359237], ['oz', .028349523], ['short ton', 907.18474]]],
  area: ['Талбай', [['mm²', 1e-6], ['cm²', 1e-4], ['m²', 1], ['in²', 6.4516e-4], ['ft²', .09290304], ['га', 1e4]]],
  vol: ['Эзлэхүүн', [['cm³', 1e-6], ['L', 1e-3], ['m³', 1], ['in³', 1.6387064e-5], ['ft³', .028316847], ['gal (US)', .003785412]]],
  power: ['Чадал', [['W', 1], ['kW', 1e3], ['hp (метр)', 735.49875], ['hp (US)', 745.69987], ['kcal/h', 1.163]]],
  speed: ['Хурд', [['m/s', 1], ['m/min', 1 / 60], ['km/h', 1 / 3.6], ['mm/s', 1e-3], ['ft/min', .00508], ['mph', .44704]]],
  energy: ['Энерги', [['J', 1], ['kJ', 1e3], ['kWh', 3.6e6], ['kcal', 4186.8], ['BTU', 1055.056]]],
  temp: ['Температур', [['°C'], ['°F'], ['K']]]
};
const tConv = (v, a, b) => { const c = a === '°C' ? v : a === '°F' ? (v - 32) * 5 / 9 : v - 273.15; return b === '°C' ? c : b === '°F' ? c * 9 / 5 + 32 : c + 273.15; };
/* ---------- hardness (ASTM E140, steels, approximate) ---------- */
const HARD = [[20, 238, 226, 770], [22, 248, 237, 800], [25, 266, 253, 860], [28, 286, 271, 925], [30, 302, 286, 985], [32, 318, 301, 1035], [35, 345, 327, 1130], [38, 372, 353, 1215], [40, 392, 371, 1290], [42, 412, 390, 1360], [45, 446, 421, 1480], [48, 484, 456, 1630], [50, 513, 481, 1720], [52, 544, 500, 1830], [55, 595, null, 2030], [58, 653, null, null], [60, 697, null, null], [62, 746, null, null], [65, 832, null, null]];

/* ---------- UI ---------- */
function renderEngSide() {
  const el = $('#engList'); if (!el) return;
  el.innerHTML = ENG_TOOLS.map(([k, n, d]) => `<button class="engitem${ENG.tool === k ? ' on' : ''}" data-et="${k}"><b>${esc(n)}</b><span>${esc(d)}</span></button>`).join('');
  el.querySelectorAll('[data-et]').forEach(b => b.addEventListener('click', () => { ENG.tool = b.dataset.et; engSave(); renderEng(); }));
}
const EV0 = { beam: { case: 'ss_p', sec: 'rhs', mat: 2, L: 2000, P: 10, B: 100, H: 200, t: 6, b: 50, h: 100, d: 60, D: 114, tw: 8, tf: 12, I: 1000, W: 100, sf: 1.5, self: 1, dlim: 250 },
  bolt: { cls: '8.8', K: '0.20', pct: 75, d: 20, n: 4 }, weld: { mat: 'S355', leg: 8, L: 200, F: 100, sides: 1 }, lug: { mat: 2, t: 20, w: 120, R: 60, dh: 42, dp: 40, P: 5, dyn: 1.25, sf: 3 },
  weight: { shape: 'plate', mat: 0, a: 1000, b: 2000, t: 10, d: 50, D: 114, L: 6000, q: 1 }, units: { cat: 'force', v: 1, a: 'tf (тонн-хүч)', b: 'kN' }, hard: { v: 40, k: 'HRC' } };
const ev = t => { const o = ENG.v[t] = ENG.v[t] || {}; Object.keys(EV0[t]).forEach(k => { if (o[k] === undefined) o[k] = EV0[t][k]; }); return o; };   // one object per tool, defaults filled in
function engIn(t, k, l, o = {}) { const v = ev(t)[k]; if (o.sel) return `<label class="fld">${l}<select data-ek="${k}" class="inp">${o.sel.map(([a, b]) => `<option value="${esc(a)}"${String(a) === String(v) ? ' selected' : ''}>${esc(b)}</option>`).join('')}</select></label>`;
  if (o.chk) return `<label class="check" style="align-self:end"><input type="checkbox" data-ek="${k}"${v ? ' checked' : ''}><span>${l}</span></label>`;
  return `<label class="fld">${l}<input data-ek="${k}" type="number" step="any" class="mono" value="${esc(v)}"></label>`; }
const engRes = rows => `<div class="tblwrap"><table class="dt"><tbody>${rows.map(([a, b, c]) => `<tr${c ? ` class="${c}"` : ''}><td>${a}</td><td class="r num" style="font-weight:600">${b}</td></tr>`).join('')}</tbody></table></div>`;
const engOk = (u, txt) => u == null ? '' : `<div class="engv ${u <= 1 ? 'ok' : 'bad'}">${u <= 1 ? '✓ ' : '✗ '}${txt} · ашиглалт ${nf(u * 100, 0)}%</div>`;
function renderEng() {
  renderEngSide(); const el = $('#engMain'); if (!el) return; const t = ENG.tool, o = ev(t), tool = ENG_TOOLS.find(x => x[0] === t);
  const matSel = ENG_MAT.map((m, i) => [i, `${m[0]} · Fy ${m[1]} МПа`]);
  let form = '', res = '', note = '';
  if (t === 'beam') {
    const sec = BEAM_SEC.find(s => s[0] === o.sec) || BEAM_SEC[0], r = beamCalc(o);
    form = `${engIn(t, 'case', 'Тулгуур ба ачаалал', { sel: BEAM_CASE })}${engIn(t, 'sec', 'Огтлол', { sel: BEAM_SEC.map(s => [s[0], s[1]]) })}${engIn(t, 'mat', 'Материал', { sel: matSel })}
      ${engIn(t, 'L', 'Урт L, мм')}${engIn(t, 'P', /_u$/.test(o.case) ? 'Нийт тархсан ачаалал, кН' : 'Цэгэн ачаалал P, кН')}
      ${sec[2].map(k => engIn(t, k, { b: 'Өргөн b, мм', h: 'Өндөр h, мм', B: 'Өргөн B, мм', H: 'Өндөр H, мм', t: 'Зузаан t, мм', d: 'Диаметр d, мм', D: 'Гадна диаметр D, мм', tw: 'Хананы зузаан tw, мм', tf: 'Тавиурын зузаан tf, мм', I: 'Инерцийн момент I, см⁴', W: 'Эсэргүүцлийн момент W, см³' }[k])).join('')}
      ${engIn(t, 'sf', 'Аюулгүйн коэффициент')}${engIn(t, 'dlim', 'Нугаралтын хязгаар L/…')}${o.sec !== 'custom' ? engIn(t, 'self', 'Өөрийн жинг тооцох', { chk: 1 }) : ''}`;
    res = engOk(r.util, r.util <= 1 ? 'Хүчдэл зөвшөөрөгдөх дотор' : 'Хүчдэл хэтэрсэн') + engOk(r.defl / r.lim, r.defl <= r.lim ? 'Нугаралт хязгаар дотор' : 'Нугаралт хэтэрсэн') + engRes([
      ['Инерцийн момент I', `${ef(r.I / 1e4, 1)} см⁴`], ['Эсэргүүцлийн момент W', `${ef(r.W / 1e3, 1)} см³`], ...(r.A ? [['Огтлолын талбай', `${ef(r.A / 100, 2)} см²`], ['Дам нурууны жин', `${ef(r.mass, 1)} кг`]] : []),
      ['Хамгийн их момент M', `${ef(r.M / 1e6, 2)} кН·м`], ['Хамгийн их зүсэх хүч V', `${ef(r.V / 1e3, 2)} кН`],
      ['Нугалах хүчдэл σ = M/W', `${ef(r.sig, 1)} МПа`, r.util > 1 ? 'late' : ''], ['Зөвшөөрөгдөх хүчдэл Fy/SF', `${ef(r.allow, 1)} МПа`],
      ['Нугаралт δ', `${ef(r.defl, 2)} мм`, r.defl > r.lim ? 'late' : ''], [`Зөвшөөрөгдөх нугаралт L/${o.dlim}`, `${ef(r.lim, 2)} мм`],
      ['Зөвшөөрөгдөх ачаалал (хүчдэлээр)', r.Pallow ? `${ef(r.Pallow, 2)} кН` : '—']]);
    note = 'Шугаман уян харимхай онол: M = PL/4, δ = PL³/48EI гэх мэт; хажуугийн эргэлдэлт (LTB), орон нутгийн бөхийлт, тулгуурын даралтыг шалгаагүй. Чухал хийцэд инженер баталгаажуулна.';
  } else if (t === 'bolt') {
    const K = +o.K, B = BOLTS.map(b => boltRow(b, o.cls, K, +o.pct || 75)), cur = B.find(b => b.d === +o.d) || B[8];
    form = `${engIn(t, 'd', 'Боолт', { sel: BOLTS.map(b => [b[0], 'M' + b[0] + ' × ' + b[1]]) })}${engIn(t, 'cls', 'Бат бэхийн анги (ISO 898-1)', { sel: Object.keys(BCLS).map(k => [k, k]) })}${engIn(t, 'K', 'Гадаргуу, тос', { sel: BFRIC })}${engIn(t, 'pct', 'Эхний таталт, % (proof load)')}${engIn(t, 'n', 'Боолтын тоо (холболтод)')}`;
    res = engRes([['Эрэг чангалах момент T = K·F·d', `<span style="font-size:18px">${ef(cur.T, 0)} Н·м</span>`], ['Эхний таталт F (нэг боолт)', `${ef(cur.F / 1e3, 1)} кН`], ['Нийт таталт (' + o.n + ' боолт)', `${ef(cur.F * o.n / 1e3, 1)} кН`],
      ['Зүсэлтийн даац Fv,Rd (нэг зүсэлт, эрэг дээр)', `${ef(cur.Fv / 1e3, 1)} кН`], ['Суналтын даац Ft,Rd', `${ef(cur.Ft / 1e3, 1)} кН`], ['Нийт зүсэлтийн даац', `${ef(cur.Fv * o.n / 1e3, 1)} кН`],
      ['Хүчдлийн талбай As', `${cur.As} мм²`], ['Proof / суналтын бат бэх', `${cur.Sp} / ${cur.fu} МПа`], ['Түлхүүр (S)', `${cur.s} мм`], ['Нэвтрэх нүх (дунд, ISO 273)', `${cur.h} мм`], ['Метчикийн өрөм', `${ef(cur.tap, 1)} мм`]]) +
      `<h3>Бүх хэмжээ — ${o.cls}, K = ${o.K}</h3><div class="tblwrap"><table class="dt"><thead><tr><th>Боолт</th><th class="r">As, мм²</th><th class="r">Таталт, кН</th><th class="r">Момент, Н·м</th><th class="r">Fv,Rd, кН</th><th class="r">Ft,Rd, кН</th><th class="r">Түлхүүр</th><th class="r">Нүх</th><th class="r">Өрөм</th></tr></thead><tbody>${B.map(b => `<tr${b.d === cur.d ? ' style="background:var(--accent-soft)"' : ''}><td class="num">M${b.d}×${b.p}</td><td class="r num">${b.As}</td><td class="r num">${ef(b.F / 1e3, 1)}</td><td class="r num"><b>${ef(b.T, 0)}</b></td><td class="r num">${ef(b.Fv / 1e3, 1)}</td><td class="r num">${ef(b.Ft / 1e3, 1)}</td><td class="r num">${b.s}</td><td class="r num">${b.h}</td><td class="r num">${ef(b.tap, 1)}</td></tr>`).join('')}</tbody></table></div>`;
    note = 'T = K·F·d (K — хуурай 0.20). Эхний таталт = proof load-ийн 75% (ISO 898-1). Fv,Rd = αv·fub·As/γM2, Ft,Rd = 0.9·fub·As/γM2, γM2 = 1.25 (EN 1993-1-8). Түлхүүрийн хэмжээ ISO 4014; M10/12/14/22-т DIN-ээр 17/19/22/32 байж болно.';
  } else if (t === 'weld') {
    const m = ENG_MAT.find(x => x[0] === o.mat) || ENG_MAT[2], bw = WELD_BW[m[0]] || .9, a = .7 * (+o.leg || 0), fvw = m[2] / (Math.sqrt(3) * bw * 1.25), Fr = fvw * a * (+o.L || 0) * (+o.sides || 1) / 1e3, u = (+o.F || 0) / (Fr || 1);
    form = `${engIn(t, 'mat', 'Үндсэн металл', { sel: ENG_MAT.filter(x => WELD_BW[x[0]]).map(x => [x[0], `${x[0]} · fu ${x[2]} МПа`]) })}${engIn(t, 'leg', 'Катет (z), мм')}${engIn(t, 'L', 'Гагнуурын урт (нэг талын), мм')}${engIn(t, 'sides', 'Гагнуурын тоо (тал)')}${engIn(t, 'F', 'Үйлчлэх хүч, кН')}`;
    res = engOk(u, u <= 1 ? 'Гагнуур хүрэлцэнэ' : 'Гагнуур хүрэлцэхгүй') + engRes([['Ажлын зузаан a = 0.7·z', `${ef(a, 2)} мм`], ['Зүсэлтийн бат бэх fvw,d = fu/(√3·βw·γM2)', `${ef(fvw, 1)} МПа`], ['βw', `${bw}`], ['Нэгж уртын даац', `${ef(fvw * a / 1e3, 3)} кН/мм`], ['Гагнуурын нийт даац', `<span style="font-size:18px">${ef(Fr, 1)} кН</span>`], ['Шаардлагатай урт (нийт)', `${ef((+o.F || 0) * 1e3 / (fvw * a), 0)} мм`]]);
    note = 'EN 1993-1-8 §4.5.3.3 хялбаршуулсан арга (γM2 = 1.25). Электрод үндсэн металлаас бат бэх байх ёстой. Хамгийн бага катет ихэвчлэн 3 мм, a ≥ 3 мм.';
  } else if (t === 'lug') {
    const m = ENG_MAT[+o.mat || 0], P = (+o.P || 0) * 9.80665 * 1e3 * (+o.dyn || 1), tt = +o.t, sf = +o.sf || 3, allow = m[1] / sf;
    const sT = P / ((+o.w - +o.dh) * tt), sS = P / (2 * (+o.R - +o.dh / 2) * tt), sB = P / ((+o.dp) * tt);
    const uT = sT / allow, uS = sS / (allow * .6), uB = sB / (allow * 1.5), u = Math.max(uT, uS, uB), Wll = (+o.P || 0) / (u || 1);
    form = `${engIn(t, 'mat', 'Материал', { sel: matSel })}${engIn(t, 'P', 'Ачаалал (нэг чихэнд), тонн')}${engIn(t, 'dyn', 'Динамик коэффициент')}${engIn(t, 'sf', 'Аюулгүйн коэффициент')}${engIn(t, 't', 'Хавтангийн зузаан t, мм')}${engIn(t, 'w', 'Нүхний орчмын өргөн w, мм')}${engIn(t, 'R', 'Нүхний төвөөс ирмэг хүртэл R, мм')}${engIn(t, 'dh', 'Нүхний диаметр, мм')}${engIn(t, 'dp', 'Тээглүүрийн (pin) диаметр, мм')}`;
    res = engOk(u, u <= 1 ? 'Чих хүрэлцэнэ' : 'Чих хүрэлцэхгүй') + engRes([['Тооцооны хүч (динамиктай)', `${ef(P / 1e3, 1)} кН`], ['Суналт (w − d)·t', `${ef(sT, 1)} / ${ef(allow, 0)} МПа`, uT > 1 ? 'late' : ''], ['Урагдал (2 хавтгай)', `${ef(sS, 1)} / ${ef(allow * .6, 0)} МПа`, uS > 1 ? 'late' : ''], ['Тээглүүрийн даралт', `${ef(sB, 1)} / ${ef(allow * 1.5, 0)} МПа`, uB > 1 ? 'late' : ''], ['Зөвшөөрөгдөх ачаалал (WLL ойролцоо)', `<span style="font-size:18px">${ef(Wll, 2)} т</span>`]]);
    note = 'Урьдчилсан шалгалт: суналт Fy/SF, зүсэлт 0.6·Fy/SF, даралт 1.5·Fy/SF. Гагнуур, хажуугийн ачаалал, хавтангийн тогтворжилтыг тусад нь шалгана. Өргөх хэрэгслийг стандартын дагуу (ASME BTH-1, EN 13155) инженер баталгаажуулж, туршина.';
  } else if (t === 'weight') {
    const m = ENG_MAT[+o.mat || 0], rho = m[4], v = k => +o[k] || 0; let A = 0, sh = o.shape;
    const SH = [['plate', 'Хавтан (a × b × t)'], ['bar', 'Дугуй цул (d × L)'], ['pipe', 'Дугуй хоолой (D × t × L)'], ['rhs', 'Тэгш өнцөгт хоолой (a × b × t × L)'], ['angle', 'Булан (a × b × t × L)'], ['flat', 'Хавтгай зурвас (a × t × L)'], ['hex', 'Зургаан талт (S × L)']];
    let vol = 0;
    if (sh === 'plate') vol = v('a') * v('b') * v('t'); else { if (sh === 'bar') A = Math.PI * v('d') ** 2 / 4; else if (sh === 'pipe') A = Math.PI * (v('D') ** 2 - (v('D') - 2 * v('t')) ** 2) / 4; else if (sh === 'rhs') A = v('a') * v('b') - (v('a') - 2 * v('t')) * (v('b') - 2 * v('t')); else if (sh === 'angle') A = (v('a') + v('b') - v('t')) * v('t'); else if (sh === 'flat') A = v('a') * v('t'); else if (sh === 'hex') A = Math.sqrt(3) / 2 * v('d') ** 2; vol = A * v('L'); }
    const kg = vol * 1e-9 * rho;
    const fl = { plate: ['a', 'b', 't'], bar: ['d', 'L'], pipe: ['D', 't', 'L'], rhs: ['a', 'b', 't', 'L'], angle: ['a', 'b', 't', 'L'], flat: ['a', 't', 'L'], hex: ['d', 'L'] }[sh] || [];
    const lab = { a: sh === 'plate' ? 'Урт a, мм' : 'Тал a, мм', b: sh === 'plate' ? 'Өргөн b, мм' : 'Тал b, мм', t: 'Зузаан t, мм', d: sh === 'hex' ? 'Түлхүүрийн хэмжээ S, мм' : 'Диаметр d, мм', D: 'Гадна диаметр D, мм', L: 'Урт L, мм' };
    form = `${engIn(t, 'shape', 'Хэлбэр', { sel: SH })}${engIn(t, 'mat', 'Материал', { sel: ENG_MAT.map((x, i) => [i, `${x[0]} · ${x[4]} кг/м³`]) })}${fl.map(k => engIn(t, k, lab[k])).join('')}${engIn(t, 'q', 'Тоо, ш')}`;
    res = engRes([['Нэг ширхэгийн жин', `<span style="font-size:18px">${ef(kg, 2)} кг</span>`], ['Нийт жин', `${ef(kg * v('q'), 2)} кг`], ...(A ? [['Нэг метрийн жин', `${ef(A * 1e-6 * rho, 2)} кг/м`], ['Огтлолын талбай', `${ef(A / 100, 2)} см²`]] : [['Нэг м²-ийн жин', `${ef(v('t') * 1e-3 * rho, 2)} кг/м²`]])]);
    note = 'Нягт: ган 7850, зэвэрдэггүй 7930, хөнгөн цагаан 2700 кг/м³. Профилийн булангийн радиусыг тооцоогүй (бодит жин 1–3% бага).';
  } else if (t === 'units') {
    const C = UNITS[o.cat] || UNITS.force, U = C[1]; if (!U.some(u => u[0] === o.a)) o.a = U[0][0]; if (!U.some(u => u[0] === o.b)) o.b = U[1][0];
    const conv = (val, a, b) => o.cat === 'temp' ? tConv(val, a, b) : val * U.find(u => u[0] === a)[1] / U.find(u => u[0] === b)[1];
    const out = conv(+o.v || 0, o.a, o.b);
    form = `${engIn(t, 'cat', 'Төрөл', { sel: Object.entries(UNITS).map(([k, x]) => [k, x[0]]) })}${engIn(t, 'v', 'Утга')}${engIn(t, 'a', 'Хаанаас', { sel: U.map(u => [u[0], u[0]]) })}${engIn(t, 'b', 'Хаашаа', { sel: U.map(u => [u[0], u[0]]) })}`;
    res = `<div class="engbig"><span class="mono">${ef(+o.v, 6).replace(/[.,]?0+$/, '')} ${esc(o.a)}</span> = <b class="mono">${(Math.abs(out) >= 1e6 || (Math.abs(out) < 1e-3 && out)) ? out.toExponential(4) : ef(out, 6).replace(/([.,]\d*?)0+$/, '$1').replace(/[.,]$/, '')} ${esc(o.b)}</b></div>` +
      `<div class="tblwrap"><table class="dt"><tbody>${U.map(u => { const x = conv(+o.v || 0, o.a, u[0]); return `<tr${u[0] === o.b ? ' style="background:var(--accent-soft)"' : ''}><td>${esc(u[0])}</td><td class="r num">${(Math.abs(x) >= 1e7 || (Math.abs(x) < 1e-4 && x)) ? x.toExponential(4) : ef(x, 6).replace(/([.,]\d*?)0+$/, '$1').replace(/[.,]$/, '')}</td></tr>`; }).join('')}</tbody></table></div>`;
    note = '1 тонн-хүч = 9.807 кН · 1 МПа = 1 Н/мм² = 10.2 кгс/см² · 1 Н·м = 0.738 lbf·ft.';
  } else if (t === 'hard') {
    const col = { HRC: 0, HV: 1, HB: 2, 'Rm, МПа': 3 }[o.k] ?? 0, x = +o.v || 0, R = HARD.filter(r => r[col] != null);
    let a = R[0], b = R[R.length - 1]; for (let i = 0; i < R.length - 1; i++) if (R[i][col] <= x && R[i + 1][col] >= x) { a = R[i]; b = R[i + 1]; }
    const f = b[col] !== a[col] ? (x - a[col]) / (b[col] - a[col]) : 0, ip = i => a[i] != null && b[i] != null ? a[i] + (b[i] - a[i]) * f : null, out = x < R[0][col] || x > R[R.length - 1][col];
    form = `${engIn(t, 'k', 'Хэмжүүр', { sel: [['HRC', 'Роквелл HRC'], ['HV', 'Виккерс HV'], ['HB', 'Бринелль HB'], ['Rm, МПа', 'Суналтын бат бэх Rm, МПа']] })}${engIn(t, 'v', 'Утга')}`;
    res = (out ? '<div class="engv bad">Хүснэгтийн хязгаараас гадуур</div>' : '') + engRes([['Роквелл HRC', ef(ip(0), 1)], ['Виккерс HV', ef(ip(1), 0)], ['Бринелль HB', ef(ip(2), 0)], ['Суналтын бат бэх Rm ≈', ip(3) ? ef(ip(3), 0) + ' МПа' : '—']]) +
      `<h3>Хүснэгт</h3><div class="tblwrap"><table class="dt"><thead><tr><th class="r">HRC</th><th class="r">HV</th><th class="r">HB</th><th class="r">Rm ≈, МПа</th></tr></thead><tbody>${HARD.map(r => `<tr><td class="r num">${r[0]}</td><td class="r num">${r[1]}</td><td class="r num">${r[2] ?? '—'}</td><td class="r num">${r[3] ?? '—'}</td></tr>`).join('')}</tbody></table></div>`;
    note = 'ASTM E140 (нүүрстөрөгчийн болон хайлшин ган) ойролцоо хувиргалт. Хувиргалт нь хэмжилтийг орлохгүй; Hardox 450 ≈ 425–475 HBW.';
  }
  el.innerHTML = `<div class="dhead"><div><h2>${esc(tool[1])}</h2><p class="muted">${esc(tool[2])}</p></div></div>
    <div class="enggrid"><div class="jcard"><div class="bcard-h">Оролт</div><div class="jbody"><div class="jgrid">${form}</div></div></div>
    <div class="jcard"><div class="bcard-h">Үр дүн</div><div class="jbody">${res}</div></div></div>
    <p class="note">${esc(note)}</p>`;
  if (typeof erpOn === 'function' && erpOn() && typeof erpNav === 'function') erpNav();
  el.querySelectorAll('[data-ek]').forEach(i => i.addEventListener(i.tagName === 'SELECT' || i.type === 'checkbox' ? 'change' : 'input', () => { const k = i.dataset.ek; o[k] = i.type === 'checkbox' ? (i.checked ? 1 : 0) : i.tagName === 'SELECT' ? i.value : i.value; engSave(); clearTimeout(ENG._t); const focus = i.dataset.ek; ENG._t = setTimeout(() => { renderEng(); const n = el.querySelector(`[data-ek="${focus}"]`); if (n && n.tagName === 'INPUT' && n.type !== 'checkbox') { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (e) { } } }, i.tagName === 'SELECT' ? 0 : 350); }));
}

/* module switch: the engineering page has its own side list and main area */
{ const _smE = setModule; setModule = function (v) { _smE(v); const on = v === 'eng', sd = $('#engSide'), mn = $('#engMain'); if (sd) sd.hidden = !on; if (mn) mn.hidden = !on; if (on) renderEng(); }; }
