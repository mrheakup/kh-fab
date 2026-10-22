/* ================= Kh International — customer quotation in the company's own form =================
   Reproduces «SQ… - Quotation» (Excel → PDF, US Letter): logo + tagline, company address, purple rule,
   customer box, QUOTATION box, address row, items table, special note, included / excluded,
   terms + totals block, thank-you band. Coordinates measured from the original (mm). */
const CO_DEF = { name: 'Kh International LLC', tag: 'Know us, know the quality', a1: 'Ulaanbaatar Mongolia,', a2: 'Songino Khairkhan District, 20th Khoroo', a3: 'Sonsgolon Street, 18131, 67th Unit', bank: 'KHAS 5004206842', reg: '6215572', currency: 'MNT', phone: '(976) 8801 2130, (976) 8992 8989', mail: 'info@khinternational.mn', prep: 'Х. Очирбат / Ochirbat.Kh', appr: 'Munkhjargal.S', prepMn: 'Х. Очирбат', apprMn: 'С. Мөнхжаргал' };
/* Mongolian-language quotation (some customers get the form in Mongolian) */
const QF_NOTE_MN = 'Энэхүү үнийн санал нь ажлын цар хүрээ өөрчлөгдөх, тухайлбал нэмэлт инженерийн зураг, эсвэл боловсруулалтын үйлчилгээ зэрэг өөрчлөлтүүд гарсан тохиолдолд дахин хянагдаж, шинэчлэгдэх боломжтой.';
const QF_MN = { "Customer's name": 'Харилцагч', 'RFQ name': 'Ажлын нэр', 'RFQ number': 'Ажлын дугаар', 'Name/Position': 'Холбогдох хүн', 'Email': 'Email', 'Phone number': 'Утасны дугаар', 'QUOTATION': 'ҮНИЙН САНАЛ', 'Date': 'Огноо', 'Valid Until': 'Хүртэл хүчинтэй', 'Quote #': 'Үнийн саналын №', 'Customer ID': 'Харилцагч ID', 'Lead time': 'Гүйцэтгэх хугацаа',
  "Customer's address:": 'Харилцагчийн хаяг:', '№': '№', 'Description': 'Ажлын тайлбар', 'UOM': 'Нэгж', 'QTY': 'Тоо', 'Unit price': 'Үнэ MNT', 'Total excluded\nVAT': 'Нийт\n/НӨАТ ороогүй/', 'Special Note :': 'Тусгай тэмдэглэл:', 'Quote included:': 'Үнийн саналд багтсан:', 'Quote excluded:': 'Үнийн саналд багтаагүй:',
  'Payment Term': 'Төлбөрийн нөхцөл', 'Delivery Term': 'Хүргэлтийн нөхцөл', 'Bank account': 'Банкны мэдээлэл', 'Currency': 'Валют', 'Registration of Company': 'Компанийн регистр', 'Total excluded VAT': 'НӨАТ ороогүй үнэ', 'Discount': 'Хөнгөлөлт', 'VAT rate': 'НӨАТ-ын хувь', 'VAT': 'НӨАТ', 'Total included VAT': 'НӨАТ орсон нийт', 'THANK YOU FOR YOUR COOPERATION!': 'ХАМТРАН АЖИЛЛАСАНД БАЯРЛАЛАА!' };
const CO_MN = { prepLbl: 'Боловсруулсан:', apprLbl: 'Хянаж, зөвшөөрсөн:', name: 'Кэй Эйч Интернэшнл ХХК', a1: 'Монгол улс, Улаанбаатар хот,', a2: 'Сонгино Хайрхан дүүрэг, 20-р хороо,', a3: 'Сонсголон 18131, 67-р хаалга' };
const QF_NOTE = 'This quotation may be subject to revision in the event of any variation or modification to the scope of work, including but not limited to additional engineering drawings or fabrication services.';
/* standard «Quote included / excluded» clauses. A line starting with "- " is a sub-item. */
const QF_CLAUSES = {
  incl: ['Engineering drawing', 'Finite Element Analysis (FEA)', 'Material (Fiber laser cutting for preparation)', 'Destructive Test (Material chemical composition and Mechanical property test)', "Steel fabrication is in accordance with customer's specs", 'Fabrication welding and cleaning', 'Internal Non-Destructive Testing (NDT)', '- Visual Inspection - 100%', '- Magnetic particle test - 25%', '- Ultrasonic test - 10%', 'Proof load test', 'Sandblasting is in accordance with specs (125 micron)', 'Painting', 'Manufacturers Data Record (MDR)', '- Material certificates', '- Weld traceability maps', '- Welding procedures', '- Welder qualifications', '- Welding supervisor qualifications', '- Dimensional inspection reports', '- Inspection Test Plans (ITPs)', '- Painting reports', '- Packing list reports', 'All consumables required for the work are included in the quoted price.', 'Packing (wooden pallet, film)', "Delivery to customer's warehouse (Ulaanbaatar)"],
  excl: ['Engineering drawing and FEA', '3rd party NDT / inspection', 'Machining and line boring', 'Sandblasting and painting', 'Site installation', 'Freight outside Ulaanbaatar', 'Customer-supplied materials and parts', 'Overtime and weekend work', 'Any work outside the agreed scope', 'Bending and rolling', 'Heat treatment (PWHT)']
};
const qfClauses = () => (S.qfClauses = S.qfClauses || { incl: [], excl: [] });
const company = () => (S.company = Object.assign({}, CO_DEF, S.company || {}));
const QFS = { fill: '#d9e1f2', line: '#000', purple: '#7030a0', blue: '#4472c4', link: '#0563c1', F: '"Times New Roman", Times, "Liberation Serif", serif' };
const fmtD = d => { if (!d) return ''; const t = new Date(d + 'T00:00:00'); return isNaN(t) ? d : `${t.getDate()}-${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][t.getMonth()]}-${String(t.getFullYear()).slice(2)}`; };
const n0 = v => Math.round(+v || 0).toLocaleString('en-US');
function qfDefaults(job) {
  if (!job._nest) jx(job); const q = job.quote, sc = job.scope || { incl: '', excl: '' };
  if (q.qf) return q.qf;
  q.qf = { custId: '', rfqName: job.title || '', rfqNo: 'N/A', person: '', email: '', phone: '', address: '', lead: '', delivery: "Kh will delivery customer's WHS", pay: '100% after work completion', discount: 0, mode: 'single', note: QF_NOTE,
    incl: (sc.incl ? sc.incl.split(/\n|;/) : []).map(s => s.trim()).filter(Boolean).join('\n') || 'All consumables required for the work are included in the quoted price.', excl: (sc.excl || '').split(/\n|;/).map(s => s.trim()).filter(Boolean).join('\n'), title: job.title || '' };
  if (job.customer) formAuto(q.qf, job.customer);
  return q.qf;
}
/* line items for the form, net of VAT, margin spread so the sum = offer */
/* Engineering drawing / FEA (engineer rows) + Material / Consumable / Labour / Machining / Equipment / Other — margin included */
function qfBreakdown(job) {
  const q = job.quote, c = quoteCalc(job), f = qfDefaults(job), kc = c.kc || {}, K = cat => kc[cat] || c.k, MN = f.lang === 'mn';
    const B = [], kl = K('labor');
    c.labor.filter(l => l.cost && l.rt === 'eng').forEach(l => B.push({ d: MN ? l.name : (l.en || l.name), u: 'lot', q: 1, p: l.cost * kl }));
    const mach = c.labor.filter(l => l.cost && (l.rt === 'lathe' || l.rt === 'mill')).reduce((a, l) => a + l.cost, 0), lab = c.labor.filter(l => l.cost && !['eng', 'lathe', 'mill'].includes(l.rt)).reduce((a, l) => a + l.cost, 0);
    [[MN ? 'Материал' : 'Material', c.mat + c.scrap + c.trans, 'mat'], [MN ? 'Туслах материал (consumable)' : 'Consumable', c.cons, 'cons'], [MN ? 'Ажиллах хүч' : 'Labour cost', lab, 'labor'], [MN ? 'Механик боловсруулалт (токар, фрезер)' : 'Machining cost', mach, 'labor'], [MN ? 'Тоног төхөөрөмж, үйлчилгээ' : 'Equipment and services', c.equip, 'equip'], [MN ? 'Бусад' : 'Other', c.other, 'other']]
      .forEach(([d, v, cat]) => { if (v > 0) B.push({ d, u: 'lot', q: 1, p: v * K(cat) }); });
    return B;
}
/* sub-rows printed under the main line(s): own list if typed, otherwise from the costing */
function qfSubRows(job) {
  const f = qfDefaults(job); if (!f.showBd || f.mode === 'breakdown' || f.mode === 'detail' || f.mode === 'sections') return [];
  if (Array.isArray(f.bd) && f.bd.some(r => r.d)) return f.bd.filter(r => r.d).map(r => ({ d: r.d, p: +r.p || 0 }));
  try { return qfBreakdown(job).map(l => ({ d: l.d, p: l.p })); } catch (e) { return []; }
}
function qfLines(job) {
  if (job._linesFn) return job._linesFn();
  const q = job.quote, c = quoteCalc(job), f = qfDefaults(job), kc = c.kc || {}, K = cat => kc[cat] || c.k, MN = f.lang === 'mn';
  if (f.mode === 'fixed' && Array.isArray(q.lines) && q.lines.length) return q.lines.map(l => ({ d: l.d, u: l.u || 'ea', q: +l.q || 1, p: +l.p || 0 }));
  if (f.mode === 'single') return [{ d: f.title || job.title || 'Fabrication work', u: 'set', q: 1, p: c.net, b: 1 }];
  if (f.mode === 'sections') return [[MN ? 'Материал, худалдан авалт (хаягдал, тээвэр орсон)' : 'Materials and purchasing (incl. scrap allowance, transport)', c.matTotal - c.cons, 'mat'], [MN ? 'Туслах материал (consumable)' : 'Consumables', c.cons, 'cons'], [MN ? 'Ажиллах хүч' : 'Labour', c.laborTotal, 'labor'], [MN ? 'Тоног төхөөрөмж, үйлчилгээ' : 'Equipment and services', c.equip, 'equip'], [MN ? 'Бусад' : 'Other', c.other, 'other']].filter(r => r[1] > 0).map(([d, v, cat]) => ({ d, u: 'lot', q: 1, p: v * K(cat) }));
  if (f.mode === 'breakdown') return qfBreakdown(job);
  const L = []; const add = (arr, cat) => arr.filter(r => r.name && +r.qty).forEach(r => L.push({ d: r.name, u: r.unit || 'pcs', q: +r.qty, p: (+r.price || 0) * K(cat) }));
  add(q.mats, 'mat'); if (c.scrap) L.push({ d: MN ? `Хаягдал нөөц (${q.scrapPct}%)` : `Scrap allowance (${q.scrapPct}%)`, u: 'lot', q: 1, p: c.scrap * K('mat') }); if (c.trans) L.push({ d: MN ? 'Тээвэр, хүргэлт' : 'Transport / delivery', u: 'lot', q: 1, p: c.trans * K('mat') });
  add(q.cons, 'cons'); c.labor.filter(l => l.cost).forEach(l => L.push({ d: MN ? l.name : (l.en || `Labour — ${l.name}`), u: 'h', q: l.h, p: l.rate * K('labor') }));
  add(q.equipRows, 'equip'); if (c.equipPctV) L.push({ d: MN ? 'Тоног төхөөрөмжийн элэгдэл' : 'Equipment wear', u: 'lot', q: 1, p: c.equipPctV * K('equip') }); add(q.other, 'other');
  return L;
}
async function quoteFormImgs(job, KK) {
  try { await document.fonts.ready; } catch (e) { } await logoImg();
  const q = job.quote, f = qfDefaults(job), MN = f.lang === 'mn', C = MN ? Object.assign({}, company(), CO_MN) : company(), lines = qfLines(job), vatR = +q.vat || 0, Lb = t => MN ? (QF_MN[t] || t) : t;
  window.__noTr = MN;
  try {
  const excl = lines.reduce((a, l) => a + Math.round(l.p) * l.q, 0), disc = +f.discount || 0, vat = Math.round((excl - disc) * vatR / 100), total = excl - disc + vat;
  const W = 215.9, H = 279.4, K = KK || PRINT_K, L0 = 23.9, R0 = 198.0, pages = [];
  let x, y;
  const newPage = () => { const c = document.createElement('canvas'); c.width = Math.round(W * K); c.height = Math.round(H * K); x = c.getContext('2d'); x.scale(K, K); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); pages.push(c); };
  const T = (s, X, Y, o = {}) => { x.font = `${o.b ? 700 : 400} ${(o.s || 2.55) * 1.08}px ${QFS.F}`; x.fillStyle = o.c || '#000'; x.textAlign = o.a || 'left'; x.textBaseline = 'middle'; let v = String(s ?? ''); if (o.w) while (v.length > 1 && x.measureText(v).width > o.w) v = v.slice(0, -2) + '…'; x.fillText(v, X, Y); if (o.u) { const w = x.measureText(v).width, x0 = o.a === 'right' ? X - w : o.a === 'center' ? X - w / 2 : X; x.strokeStyle = o.c; x.lineWidth = 0.12; x.beginPath(); x.moveTo(x0, Y + 1.1); x.lineTo(x0 + w, Y + 1.1); x.stroke(); } };
  const box = (X, Y, w, h, fill) => { if (fill) { x.fillStyle = fill; x.fillRect(X, Y, w, h); } x.strokeStyle = QFS.line; x.lineWidth = 0.22; x.strokeRect(X, Y, w, h); };
  const ln = (X1, Y1, X2, Y2, w = 0.22) => { x.strokeStyle = QFS.line; x.lineWidth = w; x.beginPath(); x.moveTo(X1, Y1); x.lineTo(X2, Y2); x.stroke(); };
  const wrap = (s, w, font) => { x.font = font; const out = []; String(s || '').split('\n').forEach(p => { let l = ''; p.split(' ').forEach(wd => { const t = l ? l + ' ' + wd : wd; if (x.measureText(t).width > w && l) { out.push(l); l = wd; } else l = t; }); out.push(l); }); return out; };
  const header = () => {
    drawLogo(x, 25.0, 23.8, 15.4);
    T(C.tag, 30.7, 42.1, { b: 1, s: 2.75, c: QFS.blue });
    T(C.name, R0 - 0.3, 29.8, { b: 1, s: 3.25, a: 'right' });
    [C.a1, C.a2, C.a3].forEach((a, i) => T(a, R0 - 0.3, 33.9 + i * 4.05, { s: 2.55, a: 'right' }));
    x.strokeStyle = QFS.purple; x.lineWidth = 0.35; x.beginPath(); x.moveTo(L0, 46.1); x.lineTo(R0, 46.1); x.stroke();
  };
  const itemHead = Y => { const cols = [[L0, 29.8, '№'], [29.8, 128.9, Lb('Description')], [128.9, 143.7, Lb('UOM')], [143.7, 157.1, Lb('QTY')], [157.1, 176.4, Lb('Unit price')], [176.4, R0, Lb('Total excluded\nVAT')]]; cols.forEach(([a, b, t]) => { box(a, Y, b - a, 6.8, QFS.fill); const ls = t.split('\n'); ls.forEach((l, i) => T(l, (a + b) / 2, Y + 3.4 + (i - (ls.length - 1) / 2) * 2.6, { b: 1, s: 2.55, a: 'center' })); }); return Y + 6.8; };
  newPage(); header();
  // customer box
  const cb = [52.5, 128.9], rows = [[Lb('RFQ name'), f.rfqName, 1], [Lb('RFQ number'), f.rfqNo], [Lb('Name/Position'), f.person], ['Email', f.email, 0, 1], [Lb('Phone number'), f.phone, 0, 1]];
  box(L0, 52.5, cb[1] - L0, 78.6 - 52.5); box(L0, 52.5, cb[1] - L0, 5.5, QFS.fill); ln(55.7, 52.5, 55.7, 78.6);
  T(Lb("Customer's name"), (L0 + 55.7) / 2, 55.25, { b: 1, s: 2.55, a: 'center' }); T(job.customer || '', 59.1, 55.25, { b: 1, s: 2.6, w: 68 });
  rows.forEach(([k, v, b, u], i) => { const Y = 60.2 + i * 4.08; T(k, 50.0, Y, { s: 2.5, a: 'right' }); T(v || '', 59.1, Y, { b, s: b ? 2.6 : 2.5, c: u && v ? QFS.link : '#000', u: u && v, w: 68 }); });
  // QUOTATION box
  const qd = MN ? 163.5 : 156.8; box(137.3, 52.5, R0 - 137.3, 78.6 - 52.5); box(137.3, 52.5, R0 - 137.3, 5.5, QFS.fill); ln(qd, 58.0, qd, 78.6);
  T(Lb('QUOTATION'), (137.3 + R0) / 2, 55.25, { b: 1, s: 2.6, a: 'center' });
  const until = q.date ? addDays(q.date, +q.valid || 0) : '';
  [[Lb('Date'), fmtD(q.date || today())], [Lb('Valid Until'), fmtD(until)], [Lb('Quote #'), q.no || job.no], [Lb('Customer ID'), f.custId], [Lb('Lead time'), f.lead || q.delivery || '']].forEach(([k, v], i) => { const Y = 60.2 + i * 4.08; T(k, qd - 2.9, Y, { s: MN ? 2.35 : 2.5, a: 'right' }); T(v, qd + 3.4, Y, { s: 2.5, w: R0 - qd - 4 }); });
  // address
  box(L0, 82.7, 55.7 - L0, 6.2, QFS.fill); box(55.7, 82.7, R0 - 55.7, 6.2); T(Lb("Customer's address:"), (L0 + 55.7) / 2, 85.8, { b: 1, s: 2.55, a: 'center' }); T(f.address, 59.1, 85.8, { s: 2.5, w: R0 - 61 });
  // items
  y = itemHead(93.4);
  const rowFont = `700 ${2.55 * 1.08}px ${QFS.F}`;
  lines.forEach((l, i) => {
    const ds = wrap(l.d, 128.9 - 29.8 - 3, rowFont), rh = Math.max(4.1, ds.length * 3.1 + 1);
    if (y + rh > H - 20) { newPage(); header(); y = itemHead(52.5); }
    [[L0, 29.8], [29.8, 128.9], [128.9, 143.7], [143.7, 157.1], [157.1, 176.4], [176.4, R0]].forEach(([a, b]) => box(a, y, b - a, rh));
    const cy = y + rh / 2; T(i + 1, (L0 + 29.8) / 2, cy, { b: 1, s: 2.55, a: 'center' });
    ds.forEach((d, j) => T(d, 31.2, y + 0.5 + 3.1 * (j + 0.5) + (rh - 1 - ds.length * 3.1) / 2, { b: 1, s: 2.55 }));
    T(l.u, (128.9 + 143.7) / 2, cy, { b: 1, s: 2.55, a: 'center' }); T(n0(Math.round(l.q * 100) / 100), (143.7 + 157.1) / 2, cy, { b: 1, s: 2.55, a: 'center' });
    T(n0(l.p), 175.9, cy, { b: 1, s: 2.55, a: 'right' }); T(n0(Math.round(l.p) * l.q), R0 - 0.4, cy, { b: 1, s: 2.55, a: 'right' });
    y += rh;
  });
  qfSubRows(job).forEach(r => {
    const rh = 3.8; if (y + rh > H - 20) { newPage(); header(); y = itemHead(52.5); }
    [[L0, 29.8], [29.8, 128.9], [128.9, 143.7], [143.7, 157.1], [157.1, 176.4], [176.4, R0]].forEach(([a, b]) => box(a, y, b - a, rh));
    const cy = y + rh / 2; T('– ' + r.d, 34.5, cy, { s: 2.35, c: '#333', w: 128.9 - 36 }); T(n0(r.p), 175.9, cy, { s: 2.35, c: '#333', a: 'right' });
    y += rh;
  });
  // notes block (left 23.9–157.1), right columns continue down
  const noteF = `400 ${2.3 * 1.08}px ${QFS.F}`, SN = Lb('Special Note :'), nl = wrap(SN + ' ' + (f.note || ''), 157.1 - L0 - 8, noteF), inc = f.incl.split('\n').filter(Boolean), exc = f.excl.split('\n').filter(Boolean);
  const nh = nl.length * 2.75 + 2.6, blockH = 4.1 + nh + 6 + inc.length * 4.1 + 4.6 + exc.length * 4.1 + 1.5;
  if (y + blockH + 28 > H - 12) { newPage(); header(); y = 52.5; }
  const y0 = y; box(L0, y, 157.1 - L0, 4.1); y += 4.1;
  box(L0, y, 157.1 - L0, nh, QFS.fill);
  nl.forEach((l, i) => { const Y = y + 1.3 + 2.75 * (i + 0.5); if (i === 0) { x.font = `700 ${2.3 * 1.08}px ${QFS.F}`; const lw = x.measureText(SN).width, rest = l.slice(SN.length); x.font = noteF; const tw = lw + x.measureText(rest).width, X0 = (L0 + 157.1) / 2 - tw / 2; T(SN, X0, Y, { b: 1, s: 2.3 }); T(rest, X0 + lw, Y, { s: 2.3 }); } else T(l, (L0 + 157.1) / 2, Y, { s: 2.3, a: 'center' }); });
  y += nh;
  T(Lb('Quote included:'), 27.0, y + 3.2, { b: 1, s: 2.45 }); y += 6.2;
  const clause = (arr, dy) => { let n = 0; arr.forEach(t => { const sub = /^\s*[-–•]\s*/.test(t), v = t.replace(/^\s*[-–•]\s*/, ''); if (sub) T('• ' + v, 41.0, y + dy, { s: 2.2, w: 157.1 - 43 }); else T(`${++n}. ${v}`, 34.8, y + dy, { s: 2.3, w: 157.1 - 37 }); y += sub ? 3.5 : 4.1; }); };
  clause(inc, 0);
  T(Lb('Quote excluded:'), 27.0, y + 1.2, { b: 1, s: 2.45 }); y += 3.4;
  clause(exc, 1.2);
  y += 1.5;
  ln(L0, y0 + 4.1, L0, y); ln(157.1, y0, 157.1, y); ln(176.4, y0, 176.4, y); ln(R0, y0, R0, y);
  // terms + totals
  const tY = y, rh = 4.1, terms = [[Lb('Payment Term'), f.pay], [Lb('Delivery Term'), f.delivery], [Lb('Bank account'), C.bank], [Lb('Currency'), C.currency], [Lb('Registration of Company'), C.reg]];
  const tots = [[Lb('Total excluded VAT'), n0(excl)], [Lb('Discount'), disc ? n0(disc) : '-'], [Lb('VAT rate'), vatR + '%'], [Lb('VAT'), n0(vat)], [Lb('Total included VAT'), n0(total)]];
  box(L0, tY, R0 - L0, rh * 5); ln(55.7, tY, 55.7, tY + rh * 5); ln(128.9, tY, 128.9, tY + rh * 5); ln(157.1, tY, 157.1, tY + rh * 5);
  terms.forEach(([k, v], i) => { const Y = tY + rh * (i + 0.5); T(k, L0 + 0.5, Y, { b: 1, s: 2.4, w: 31 }); T(v, 61.8, Y, { s: 2.5, w: 66 }); });
  tots.forEach(([k, v], i) => { const Y = tY + rh * (i + 0.5); T(k, 129.3, Y, { b: 1, s: 2.45, w: 27.5 }); T(v, R0 - 0.4, Y, { b: 1, s: 2.5, a: 'right' }); });
  y = tY + rh * 5; box(L0, y, R0 - L0, 8.1, QFS.fill); T(Lb('THANK YOU FOR YOUR COOPERATION!'), (L0 + R0) / 2, y + 4.05, { b: 1, s: 3.35, a: 'center' });
  y += 8.1;
  // photos (product / drawing / reference) under the quotation, or on their own page
  { const P = (await Promise.all((f.photos || []).slice(0, 4).map(async p => ({ im: await imgLoad(p.src), cap: p.cap || '' })))).filter(p => p.im);
    if (P.length) {
      const n = P.length, cols = n === 1 ? 1 : 2, rows = Math.ceil(n / cols), gw = (R0 - L0 - (cols - 1) * 4) / cols, capH = P.some(p => p.cap) ? 4.5 : 0;
      const room = H - 14 - (y + 12), cellH = Math.min(n === 1 ? 110 : 75, (f.phPos === 'page' ? 999 : room) / rows - capH - 4);
      if (f.phPos === 'page' || cellH < 38) { newPage(); header(); y = 52.5; } else y += 8;
      const ch = Math.min(n === 1 ? 150 : 95, (H - 16 - y - 8) / rows - capH - 4);
      box(L0, y, R0 - L0, 6.2, QFS.fill); T(MN ? 'Зураг' : 'Illustrations', (L0 + R0) / 2, y + 3.1, { b: 1, s: 2.6, a: 'center' }); y += 9;
      P.forEach((p, i) => { const cx = L0 + (i % cols) * (gw + 4), cy = y + Math.floor(i / cols) * (ch + capH + 4), r = Math.min(gw / p.im.naturalWidth, ch / p.im.naturalHeight), w = p.im.naturalWidth * r, h = p.im.naturalHeight * r;
        x.drawImage(p.im, cx + (gw - w) / 2, cy + (ch - h) / 2, w, h); x.strokeStyle = '#c8c8c8'; x.lineWidth = 0.15; x.strokeRect(cx, cy, gw, ch);
        if (p.cap) T(p.cap, cx + gw / 2, cy + ch + 2.6, { s: 2.35, a: 'center', w: gw - 2 }); });
      y += rows * (ch + capH + 4);
    } }
  if (pages.length > 1) pages.forEach((c, i) => { const g = c.getContext('2d'); g.font = `400 2.3px ${QFS.F}`; g.fillStyle = '#555'; g.textAlign = 'right'; g.textBaseline = 'alphabetic'; g.fillText(`Page ${i + 1} of ${pages.length}`, R0, H - 8); });
  return pages.map((c, i) => ({ url: c.toDataURL('image/jpeg', 0.95), alias: 'qf' + i }));
  } finally { window.__noTr = false; }
}
async function quoteFormOut(job, mode) {
  try { const imgs = await quoteFormImgs(job), f = qfDefaults(job), name = `${job.quote.no || job.no} - ${job.customer || 'Customer'} - Quotation for ${f.title || job.title || ''}`.trim();
    if (mode === 'print') printImgs(imgs, false, 'letter', name); else { pdfImgs(imgs, false, name, 'letter'); if (!job._nest) jobLog('Үнийн санал (Kh загвар) PDF гаргасан', job); } }
  catch (e) { console.error(e); toast('Алдаа: ' + e.message); }
}
const QF_PV = new Map();
const qfOrg = job => job._nest ? (S.quote.customer || '') : (job.customer || '');
function qfCardHTML(job) {
  const f = qfDefaults(job), C = company();
  return `<div class="jcard"><div class="bcard-h">Захиалагчид өгөх үнийн санал — Kh International загвар <span class="sp"></span><span class="outb"><button class="btn primary" data-qf="pdf">Үнийн санал PDF</button><button class="btn ghost" data-qf="print">🖨 Хэвлэх</button></span></div><div class="jbody qfwrap"><div class="qfprevbox" title="Урьдчилан харах — дарж томруулна"><img class="qfprev" alt="Үнийн санал"></div><div class="qffields">
    ${qfFormBarHTML(f, qfOrg(job))}
    <div class="qfsec"><div class="qfsec-t">Ажил · RFQ</div><div class="jgrid">${fldIn('qf_title', 'Ажлын нэр (Description)', f.title)}${fldIn('qf_rfqName', 'RFQ name', f.rfqName)}${fldIn('qf_rfqNo', 'RFQ number', f.rfqNo)}</div></div>
    <div class="qfsec"><div class="qfsec-t">Захиалагч</div><div class="jgrid">${fldIn('qf_custId', 'Customer ID', f.custId)}${fldIn('qf_person', 'Name / Position', f.person, { list: 'dl-person', ph: 'Нэр (албан тушаал)' })}${fldIn('qf_email', 'Email', f.email)}${fldIn('qf_phone', 'Phone number', f.phone)}${fldIn('qf_address', "Customer's address", f.address)}</div></div>
    <div class="qfsec"><div class="qfsec-t">Нөхцөл</div><div class="jgrid">${fldIn('qf_lead', 'Lead time', f.lead, { ph: '5 business days' })}${fldIn('qf_pay', 'Payment term', f.pay)}${fldIn('qf_delivery', 'Delivery term', f.delivery)}${fldIn('qf_discount', 'Discount, ₮', f.discount || '', { num: 1 })}
      <label class="fld">Маягтын хэл<select id="qf_lang"><option value="">English</option><option value="mn"${f.lang === 'mn' ? ' selected' : ''}>Монгол</option></select></label>
      <label class="fld">Мөрийн хэлбэр<select id="qf_mode"><option value="single"${f.mode === 'single' ? ' selected' : ''}>Нэг мөр (set × 1)</option><option value="sections"${f.mode === 'sections' ? ' selected' : ''}>Хэсгээр (материал, хүч, тоног…)</option><option value="breakdown"${f.mode === 'breakdown' ? ' selected' : ''}>Задаргаа (Engineering drawing, FEA, Material, Consumable, Labour…)</option><option value="detail"${f.mode === 'detail' ? ' selected' : ''}>Дэлгэрэнгүй (мөр бүр)</option>${Array.isArray(job.quote && job.quote.lines) && job.quote.lines.length ? `<option value="fixed"${f.mode === 'fixed' ? ' selected' : ''}>Excel-ээс оруулсан мөрүүд (${job.quote.lines.length})</option>` : ''}</select></label></div></div>
    ${['single', 'fixed', ''].includes(f.mode || '') ? `<div class="qfsec"><label class="check"><input type="checkbox" id="qf_showBd"${f.showBd ? ' checked' : ''}><span><b>Үндсэн мөрийн доор задаргаа харуулах</b> (Engineering drawing, FEA, Material, Consumable, Labour… — дүн нь нийт үнэд нэмэгдэхгүй, зөвхөн тайлбар)</span></label>
      ${f.showBd ? (() => { const auto = (() => { try { return qfBreakdown(job); } catch (e) { return []; } })(), R = Array.isArray(f.bd) ? f.bd : [], tot = qfLines(job).reduce((a, l) => a + Math.round(l.p) * l.q, 0), sub = qfSubRows(job).reduce((a, r) => a + (+r.p || 0), 0);
        return `<div class="bdwrap">${R.length ? `<table class="dt bdt"><thead><tr><th>Задаргааны мөр</th><th class="r">Дүн, ₮</th><th></th></tr></thead><tbody>${R.map((r, i) => `<tr><td><input class="inp" data-bd="${i}" data-bk="d" value="${esc(r.d || '')}" list="dl-bd"></td><td><input class="inp mono" type="number" step="any" data-bd="${i}" data-bk="p" value="${r.p ?? ''}" style="text-align:right"></td><td><button class="x" data-bdx="${i}" type="button">×</button></td></tr>`).join('')}</tbody></table>` : `<p class="note">${auto.length ? 'Тооцооноос автоматаар: ' + auto.map(l => esc(l.d)).join(', ') : 'Зардлын тооцоо хоосон — мөрүүдийг гараар нэмнэ үү.'}</p>`}
          <div class="addrow"><button class="btn sm" id="bdAdd" type="button">+ Мөр</button><button class="btn sm ghost" id="bdFill" type="button" ${auto.length ? '' : 'disabled'}>Тооцооноос бөглөх</button>${R.length ? '<button class="btn sm ghost" id="bdClr" type="button">Цэвэрлэх (автомат руу)</button>' : ''}<span class="note ${Math.abs(sub - tot) > 1 && sub ? 'late' : ''}">Задаргааны нийлбэр ${n0(sub)} ₮ · саналын дүн ${n0(tot)} ₮</span></div>
          <datalist id="dl-bd">${['Engineering drawing', 'Finite Element Analysis (FEA)', 'Drawing and FEA', 'Material', 'Consumable', 'Labour cost', 'Machining cost', 'Linebore', '3rd Party NDT', 'Freight', 'QA/QC', 'Painting', 'Sandblasting'].map(t => `<option value="${t}">`).join('')}</datalist></div>`; })() : ''}</div>` : ''}
    <div class="qfsec"><div class="qfsec-t">Агуулга</div>${fldIn('qf_note', 'Special note', f.note, { area: 1, rows: 2 })}
    <div class="jgrid qfcl"><div class="fld"><span class="flab">Quote included — үнэд багтсан</span><div class="clbox" data-ck="incl"></div></div><div class="fld"><span class="flab">Quote excluded — үнэд ороогүй</span><div class="clbox" data-ck="excl"></div></div></div></div>
    <div class="qfsec"><div class="qfsec-t">Зураг — санал дээр харуулах (4 хүртэл)</div><div class="qfph">${(f.photos || []).map((p, i) => `<figure><img src="${p.src}" alt=""><input class="inp" data-qpc="${i}" value="${esc(p.cap || '')}" placeholder="Тайлбар (заавал биш)"><button class="x" data-qpx="${i}" aria-label="Устгах">×</button></figure>`).join('')}
      ${(f.photos || []).length < 4 ? `<button class="btn sm" id="qfPhAdd" type="button">+ Зураг нэмэх</button>${!job._nest && (job.files || []).some(x => jfIsImg(x)) ? '<button class="btn sm ghost" id="qfPhFiles" type="button">Хавсралтаас</button>' : ''}` : ''}</div>
      ${(f.photos || []).length ? `<label class="fld" style="max-width:260px">Байрлал<select id="qfPhPos"><option value="">Үнийн саналын доор (нэг хуудсанд багтвал)</option><option value="page"${f.phPos === 'page' ? ' selected' : ''}>Тусдаа хуудсанд (Хавсралт)</option></select></label>` : '<p class="note">Бүтээгдэхүүн, зураг төсөл, жишээ ажлын зураг — PDF болон хэвлэхэд саналын доор гарна.</p>'}</div>
    <details><summary class="note" style="cursor:pointer">Компанийн мэдээлэл (загварын толгой, банк, регистр)</summary><div class="jgrid" style="margin-top:8px">${[['name', 'Компанийн нэр'], ['tag', 'Уриа'], ['a1', 'Хаяг 1'], ['a2', 'Хаяг 2'], ['a3', 'Хаяг 3'], ['bank', 'Bank account'], ['reg', 'Registration'], ['currency', 'Currency']].map(([k, n]) => fldIn('co_' + k, n, C[k])).join('')}</div></details>
  </div></div></div>`;
}
function bindQfCard(el, job) {
  const f = qfDefaults(job), C = company();
  ['title', 'rfqName', 'rfqNo', 'custId', 'person', 'email', 'phone', 'lead', 'address', 'pay', 'delivery', 'note'].forEach(k => { const i = el.querySelector('#qf_' + k); if (i) i.addEventListener('change', () => { f[k] = i.value; save(); }); });
  const orgName = () => job._nest ? (S.quote.customer || '') : (job.customer || '');
  const learn = () => orgLearn({ org: orgName(), ...f });
  ['person', 'email', 'phone', 'address', 'custId'].forEach(k => { const i = el.querySelector('#qf_' + k); if (i) i.addEventListener('change', () => { if (k === 'person' && qfFillFromDir(f, orgName())) ['email', 'phone', 'address', 'custId'].forEach(z => { const e = el.querySelector('#qf_' + z); if (e) e.value = f[z] || ''; }); learn(); }); });
  const d = el.querySelector('#qf_discount'); if (d) d.addEventListener('change', () => { f.discount = Math.max(0, +d.value || 0); save(); });
  const m = el.querySelector('#qf_mode'); if (m) m.addEventListener('change', () => { f.mode = m.value; save(); setTimeout(() => { if (job._nest) renderTable(); else renderJobMain(); }, 0); });
  { const reCard = () => { if (job._nest) renderTable(); else renderJobMain(); };
    const sb = el.querySelector('#qf_showBd'); if (sb) sb.addEventListener('change', e => { e.stopPropagation(); f.showBd = sb.checked; save(); reCard(); });
    el.querySelectorAll('[data-bd]').forEach(i => i.addEventListener('change', e => { e.stopPropagation(); const r = f.bd[+i.dataset.bd]; r[i.dataset.bk] = i.dataset.bk === 'p' ? +i.value || 0 : i.value; save(); reCard(); }));
    el.querySelectorAll('[data-bdx]').forEach(b => b.addEventListener('click', () => { f.bd.splice(+b.dataset.bdx, 1); save(); reCard(); }));
    const ba = el.querySelector('#bdAdd'); if (ba) ba.addEventListener('click', () => { f.bd = Array.isArray(f.bd) ? f.bd : []; f.bd.push({ d: '', p: '' }); save(); reCard(); });
    const bf = el.querySelector('#bdFill'); if (bf) bf.addEventListener('click', () => { f.bd = qfBreakdown(job).map(l => ({ d: l.d, p: Math.round(l.p) })); save(); reCard(); });
    const bc = el.querySelector('#bdClr'); if (bc) bc.addEventListener('click', () => { f.bd = []; save(); reCard(); }); }
  const lg = el.querySelector('#qf_lang'); if (lg) lg.addEventListener('change', () => { f.lang = lg.value; if (f.lang === 'mn' && f.note === QF_NOTE) { f.note = QF_NOTE_MN; const n = el.querySelector('#qf_note'); if (n) n.value = f.note; } else if (!f.lang && f.note === QF_NOTE_MN) { f.note = QF_NOTE; const n = el.querySelector('#qf_note'); if (n) n.value = f.note; } save(); });
  Object.keys(CO_DEF).forEach(k => { const i = el.querySelector('#co_' + k); if (i) i.addEventListener('change', () => { C[k] = i.value; S.company = C; save(); }); });
  el.querySelectorAll('[data-qf]').forEach(b => b.addEventListener('click', () => quoteFormOut(job, b.dataset.qf)));
  bindQfFormBar(el, job, f, orgName(), () => { if (job._nest) renderTable(); else renderJobMain(); });
  const img = el.querySelector('.qfprev'); let tm = 0, syT = 0;
  const reBar = () => { const b = el.querySelector('.qfform'); if (!b) return; b.outerHTML = qfFormBarHTML(f, orgName()); bindQfFormBar(el, job, f, orgName(), () => { if (job._nest) renderTable(); else renderJobMain(); }); };
  const sync = () => { clearTimeout(syT); syT = setTimeout(() => { const was = f.formId; formSync(f, orgName(), (job.quote && job.quote.no) || job.no); if (f.formId !== was) reBar(); }, 400); };
  /* preview is cached per quote: re-rendering the page does not redraw the form unless something on it changed */
  const pvKey = () => { try { return JSON.stringify([job.quote, job.customer, job.title, company(), LANG, job._nest ? qfLines(job) : 0]); } catch (e) { return Math.random(); } };
  const pid = job._nest ? '_nest' : job.id, hit = QF_PV.get(pid); if (hit) img.src = hit.url;
  const refresh = () => { sync(); clearTimeout(tm); tm = setTimeout(() => { const k = pvKey(), h = QF_PV.get(pid); if (h && h.k === k) { if (img.isConnected && img.src !== h.url) img.src = h.url; return; }
    quoteFormImgs(job, PREV_K).then(im => { QF_PV.set(pid, { k, url: im[0].url }); if (img.isConnected) { img.src = im[0].url; img._imgs = im; } }).catch(() => { }); }, 300); };
  el.querySelector('.qffields').addEventListener('change', refresh);
  el.querySelectorAll('.clbox').forEach(b => clauseBox(b, f, b.dataset.ck, refresh)); refresh();
  { const reCard = () => { if (job._nest) renderTable(); else renderJobMain(); };
    const addPh = async blobs => { f.photos = f.photos || []; for (const b of blobs) { if (f.photos.length >= 4) break; f.photos.push({ src: await imgThumb(b, 1400), cap: '' }); } save(); reCard(); };
    const a = el.querySelector('#qfPhAdd'); if (a) a.addEventListener('click', () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.multiple = true; i.onchange = () => addPh([...i.files]); i.click(); });
    const ff = el.querySelector('#qfPhFiles'); if (ff) ff.addEventListener('click', async () => { const L = (job.files || []).filter(x => jfIsImg(x)); const pick = L.length === 1 ? L[0] : L[(+prompt(L.map((x, i) => `${i + 1}. ${x.name}`).join('\n') + '\n\nДугаар:', '1') || 1) - 1]; if (!pick) return; const d = await docGet(pick.id); if (d) addPh([d.blob]); });
    el.querySelectorAll('[data-qpx]').forEach(b => b.addEventListener('click', () => { f.photos.splice(+b.dataset.qpx, 1); save(); reCard(); }));
    el.querySelectorAll('[data-qpc]').forEach(i => i.addEventListener('change', e => { e.stopPropagation(); f.photos[+i.dataset.qpc].cap = i.value; save(); refresh(); }));
    const ps = el.querySelector('#qfPhPos'); if (ps) ps.addEventListener('change', () => { f.phPos = ps.value; save(); }); }
  el.querySelector('.qfprevbox').addEventListener('click', async () => { printImgs(await quoteFormImgs(job), false, 'letter', `${job.quote.no || job.no} - Quotation`, true); });
}
/* included / excluded editor: pick from the standard + own list, or type a new clause (it is remembered) */
function clauseBox(box, f, k, refresh) {
  const get = () => String(f[k] || '').split('\n').map(t => t.replace(/\s+$/, '')).filter(t => t.trim()), put = a => { f[k] = a.join('\n'); save(); draw(); refresh(); };
  const draw = () => {
    const a = get(), my = qfClauses()[k], used = new Set(a.map(t => t.trim()));
    const opt = t => `<option value="${esc(t)}"${used.has(t) ? ' disabled' : ''}>${/^- /.test(t) ? '   • ' + esc(t.slice(2)) : esc(t)}</option>`;
    box.innerHTML = `<ol class="clist">${a.map((t, i) => { const sub = /^\s*[-–•]\s*/.test(t); return `<li class="${sub ? 'sub' : ''}"><input class="inp" data-ce="${i}" value="${esc(t.replace(/^\s*[-–•]\s*/, ''))}"><button class="linkbtn" data-cs="${i}" title="${sub ? 'Үндсэн заалт болгох' : 'Дэд заалт болгох (дээрх заалтын доор)'}">${sub ? '⇤' : '⇥'}</button><button class="linkbtn" data-cu="${i}" title="Дээш">↑</button><button class="linkbtn" data-cx="${i}" title="Хасах">✕</button></li>`; }).join('') || '<li class="muted" style="list-style:none">— хоосон —</li>'}</ol>
      <div class="cladd"><select class="inp" data-ca><option value="">+ Сонголтоос нэмэх…</option><optgroup label="Стандарт">${QF_CLAUSES[k].map(opt).join('')}</optgroup>${my.length ? `<optgroup label="Миний нэмсэн">${my.map(opt).join('')}</optgroup>` : ''}</select>
      <input class="inp" data-cn placeholder="Гараар нэмэх… (Enter)"><button class="btn sm" data-cb>+</button></div>`;
  };
  box.addEventListener('change', e => {
    e.stopPropagation(); const t = e.target, a = get();
    if (t.dataset.ce != null) { const i = +t.dataset.ce, sub = /^\s*[-–•]\s*/.test(a[i]); a[i] = (sub ? '- ' : '') + t.value.trim(); if (!t.value.trim()) a.splice(i, 1); put(a); }
    else if (t.hasAttribute('data-ca') && t.value) { a.push(t.value); put(a); }
  });
  const addNew = () => { const i = box.querySelector('[data-cn]'), v = i.value.trim(); if (!v) return; const a = get(); a.push(v); const my = qfClauses()[k]; if (!QF_CLAUSES[k].includes(v) && !my.includes(v)) my.push(v); put(a); };
  box.addEventListener('keydown', e => { if (e.target.hasAttribute('data-cn') && e.key === 'Enter') { e.preventDefault(); addNew(); } });
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; const a = get();
    if (b.hasAttribute('data-cb')) return addNew();
    if (b.dataset.cx != null) { a.splice(+b.dataset.cx, 1); put(a); }
    else if (b.dataset.cu != null) { const i = +b.dataset.cu; if (i > 0) { [a[i - 1], a[i]] = [a[i], a[i - 1]]; put(a); } }
    else if (b.dataset.cs != null) { const i = +b.dataset.cs; a[i] = /^\s*[-–•]\s*/.test(a[i]) ? a[i].replace(/^\s*[-–•]\s*/, '') : '- ' + a[i]; put(a); }
  });
  draw();
}
/* Nesting → «Үнийн санал» tab: same company form from the nesting result */
function nestQuoteJob() {
  const q = S.quote; if (!q.qf) q.qf = { custId: '', rfqName: S.jobName || '', rfqNo: 'N/A', person: '', email: '', phone: '', address: '', lead: '', delivery: "Kh will delivery customer's WHS", pay: '100% after work completion', discount: 0, mode: 'detail', note: QF_NOTE, incl: 'Material and laser cutting are included in the quoted price.', excl: 'Bending, welding and painting are not included.', title: S.jobName || '' };
  if (q.customer) formAuto(q.qf, q.customer);
  const fn = () => { const d = quoteData(); if (q.qf.mode === 'single') return [{ d: q.qf.title || S.jobName || 'Laser cutting', u: 'set', q: 1, p: d.sub }];
    const lines = d.lines.map(l => ({ d: `${l.p.name} — ${l.g.label}, ${nf(l.p.info.w, 0)}×${nf(l.p.info.h, 0)} mm`, u: 'pcs', q: l.n, p: l.unit }));
    if (d.setup) lines.push({ d: 'Setup / preparation', u: 'lot', q: 1, p: d.setup }); return lines; };
  return { _nest: 1, no: q.no || 'SQ', title: S.jobName, customer: q.customer || '', quote: { no: q.no, date: today(), valid: +q.valid || 14, vat: q.vat ? 10 : 0, qf: q.qf }, _linesFn: fn };
}
