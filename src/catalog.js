/* ================= Kh International — material / price catalogue =================
   Items: {id, name, grp, cat, unit, price, kgu (kg per unit), sup (supplier), spec (requirement / grade), vat (price incl. VAT), date}
   TT_2026_05 = Түмэн Төмөрт Групп price list (May 2026, VAT included), injected by build.py.
   Weights: geometry (pipes, hollow sections, sheets, bars) and the Maiak-M catalogue tables (MAIAK_PROFILES). */
const TT_SUP = 'Түмэн Төмөрт Групп';
const RHO = { st: 7.85, ss: 7.93, al: 2.70 };
const GOST8239 = { 10: 9.46, 12: 11.5, 14: 13.7, 16: 15.9, 18: 18.4, 20: 21.0, 22: 24.0, 24: 27.3, 27: 31.5, 30: 36.5, 33: 42.2, 36: 48.6, 40: 57.0, 45: 66.5 };
const JIS_H = { '100×100': 17.2, '150×150': 31.5, '200×200': 49.9, '244×175': 44.1, '250×250': 72.4, '300×300': 94.0, '350×175': 49.6, '400×200': 66.0, '450×200': 76.0 };
const num = s => +String(s || '').replace(',', '.').replace(/[^\d.]/g, '') || 0;
const dims = s => String(s || '').split(/[*×x]/).map(num);
/* kg per unit from group + sizes */
function kgPerUnit(it) {
  const g = it.grp || '', a = it.a, b = it.b, c = it.c;
  const rho = /нерж|ss3/i.test(g) ? RHO.ss : /хөнгөн/i.test(g) ? RHO.al : RHO.st;
  if (/^Труба/.test(g)) { const D = num(a), t = num(b); return D && t ? Math.round((D - t) * t * Math.PI * 7.85e-3 * 1000) / 1000 : 0; }
  if (/^Квадрат/.test(g)) { const [w, h] = dims(String(a).split('-')[0]), t = num(b); if (!(w && h && t)) return 0; const ro = 2 * t, ri = t, A = 2 * t * (w + h - 2 * t) - (4 - Math.PI) * (ro * ro - ri * ri); return Math.round(A * 7.85e-3 * 1000) / 1000; }
  if (/^Лист/.test(g) && !/торон|нүхтэй/.test(g)) { const t = num(a); if (!t) return 0; const perM2 = t * rho; if (it.unit === 'хуудас') { const [x, y] = dims(b); return x && y ? Math.round(x * y * perM2 * 10) / 10 : 0; } return Math.round(perM2 * 100) / 100; }
  if (/^Круг 6/.test(g)) { const s = num(a); return Math.round(0.866025 * s * s * 7.85e-3 * 1000) / 1000; }
  if (/^Круг/.test(g)) { const d = num(a); return Math.round(Math.PI * d * d / 4 * 7.85e-3 * 1000) / 1000; }
  if (/^Полоса/.test(g)) { const w = num(a) * 10, t = num(b); return Math.round(w * t * 7.85e-3 * 1000) / 1000; }
  if (/^Арматур|^Катанги/.test(g)) return 1000;
  if (/^Швеллер/.test(g)) { const n = String(a).split('-')[0]; if (n.includes('*')) return 0; const k = 'GOST 8240 №' + (n === '6' ? '6,5' : n); const P = MAIAK_PROFILES[k]; return n === '5' ? 4.84 : P ? (n === '27' ? 27.7 : P.kg) : 0; }
  if (/^Двутавр/.test(g)) return GOST8239[num(String(a).split('-')[0])] || 0;
  if (/^А двутавр/.test(g)) return JIS_H[String(a).replace('*', '×')] || 0;
  return 0;
}
const kgNote = it => /^Швеллер/.test(it.grp) ? 'кг: ГОСТ 8240 (Маяк-М каталог), ойролцоо' : /^Двутавр/.test(it.grp) ? 'кг: ГОСТ 8239, ойролцоо' : /^А двутавр/.test(it.grp) ? 'кг: JIS H-beam, ойролцоо' : /^Квадрат/.test(it.grp) ? 'кг: EN 10219 томьёо' : '';
function ttItems() {
  return TT_2026_05.map(it => ({ id: 'tt-' + it.name, name: it.name, grp: it.grp, cat: 'mat', unit: it.unit, price: it.price, kgu: kgPerUnit(it), sup: TT_SUP, vat: true, date: '2026-05',
    spec: [it.sheetQ ? 'Үнийн хуудсанд «1м.кв үнэ» гэсэн ч хэмжээгээр харьцуулахад нэг хуудасны үнэ бололтой — нийлүүлэгчээс тодруулна' : '', kgNote(it), /Q345/.test(it.name) ? 'Q345 ≈ S355' : ''].filter(Boolean).join('; '), src: 'tt' }));
}
function CAT() {
  if (!Array.isArray(S.catalog)) S.catalog = [];
  if (!S.catalogTT) { // seed once; later price lists update by name
    const have = new Map(S.catalog.map(c => [c.name.toLowerCase(), c]));
    ttItems().forEach(it => { const o = have.get(it.name.toLowerCase()); if (o) Object.assign(o, { price: it.price, kgu: o.kgu || it.kgu, sup: it.sup, vat: true, date: it.date }); else S.catalog.push(it); });
    CONS_PRESET.forEach(([name, unit, price]) => { if (!S.catalog.some(c => c.name === name)) S.catalog.push({ id: uid(), name, grp: 'Consumable', cat: 'cons', unit, price, kgu: unit === 'кг' ? 1 : 0, sup: '', spec: '', vat: true, date: '' }); });
    S.catalogTT = 1; save();
  }
  return S.catalog;
}
const catFindExact = name => { const n = String(name || '').trim().toLowerCase(); return n ? CAT().find(c => c.name.toLowerCase() === n) : null; };
/* best match for a typed name: every typed token present → cheapest ₮/kg (or ₮/unit) */
function catFindFuzzy(name, cat) {
  const toks = String(name || '').toLowerCase().replace(/[×x*]/g, ' ').replace(/(\d)\s*(мм|mm)/g, '$1').split(/[\s,/()]+/).filter(t => t.length > 0 && !/^(мм|mm|м)$/.test(t));
  if (!toks.length) return null;
  const hits = CAT().filter(c => (!cat || c.cat === cat) && (() => { const h = (c.name + ' ' + (c.grp || '') + ' ' + (c.spec || '')).toLowerCase().replace(/[×x*]/g, ' ').replace(/(\d)\s*(мм|mm)/g, '$1'); const words = h.split(/[\s,/()øØ№]+/); const pool = words.slice(); return toks.every(t => { if (!/^\d/.test(t)) return h.includes(t); const i = pool.findIndex(w => w === t || w === t.replace('.', ',')); if (i < 0) return false; pool.splice(i, 1); return true; }); })());
  if (!hits.length) return null;
  return hits.sort((a, b) => (a.kgu ? a.price / a.kgu : a.price) - (b.kgu ? b.price / b.kgu : b.price))[0];
}
const netPrice = (c, q) => Math.round(c.vat && (!q || q.netIn !== false) ? c.price / (1 + ((q && +q.vat) || 10) / 100) : c.price);
/* quote line hook: fill from catalogue / learn new items */
function quoteLineHook(job, id, row, key) {
  const cat = { qm: 'mat', qc: 'cons', qe: 'equip', qo: 'other' }[id]; if (!cat) return;
  const q = job.quote;
  if (key === 'name') {
    let c = catFindExact(row.name), fz = false;
    if (!c && row.name && !(+row.price > 0)) { c = catFindFuzzy(row.name, cat === 'mat' ? 'mat' : null); fz = !!c; }
    if (c) {
      if (fz) row.name = c.name;
      row.unit = c.unit; row.price = netPrice(c, q); row.kgu = c.kgu || ''; row.sup = c.sup || ''; row.catId = c.id;
      row.note = [c.sup, c.vat && q.netIn !== false ? 'НӨАТ-гүй үнэ' : '', fz ? 'сангаас автоматаар' : ''].filter(Boolean).join(' · ');
      if (fz) toast('Сангаас сонгогдлоо: ' + c.name);
      return;
    }
  }
  if (row.name && !+row.kgu && /м²|м2/.test(row.unit || '') && thkOf(row.name)) { const G = gradeOf(row.name); row.kgu = Math.round(thkOf(row.name) * (G && G.t === 'al' ? 2.7 : G && G.t === 'ss' ? 7.93 : 7.85) * 100) / 100; }
  if (row.name && !+row.kgu && row.unit === 'кг') row.kgu = 1;
  if (!row.name || !(+row.price > 0)) return;
  const ex = catFindExact(row.name);
  if (ex) { if (['price', 'unit', 'kgu'].includes(key) && ex.src !== 'tt') { ex.price = row.note && /НӨАТ-гүй/.test(row.note) && ex.vat ? Math.round(row.price * (1 + (+q.vat || 10) / 100)) : +row.price; ex.unit = row.unit; if (row.kgu) ex.kgu = +row.kgu; ex.date = today(); } return; }
  CAT().push({ id: uid(), name: row.name.trim(), grp: 'Миний оруулсан', cat, unit: row.unit || 'ш', price: +row.price, kgu: +row.kgu || (row.unit === 'кг' ? 1 : 0), sup: (row.note || '').split('·')[0].trim(), spec: '', vat: false, date: today(), src: 'user' });
  toast('Шинэ материал санд нэмэгдлээ: ' + row.name);
}
function catDatalists() {
  const C = CAT(), opt = c => `<option value="${esc(c.name)}">${esc(`${money(c.price)} ₮/${c.unit}${c.kgu && c.unit !== 'кг' ? ' · ' + money(c.price / c.kgu) + ' ₮/кг' : ''} · ${c.sup || ''}`)}</option>`;
  return `<datalist id="dl-mat">${C.filter(c => c.cat === 'mat').map(opt).join('')}</datalist><datalist id="dl-any">${C.filter(c => c.cat !== 'mat').map(opt).join('')}</datalist>`;
}

/* ---------- catalogue management (Jobs → «Үнийн сан») ---------- */
const CV = { q: '', grp: '', sup: '', lim: 120 };
const CAT_COLS = [{ k: 'name', t: 'Нэр', w: 300 }, { k: 'grp', t: 'Бүлэг', w: 150 }, { k: 'cat', t: 'Ангилал', sel: [['mat', 'Материал'], ['cons', 'Consumable'], ['equip', 'Тоног, үйлчилгээ'], ['other', 'Бусад']], w: 120 }, { k: 'unit', t: 'Нэгж', w: 64 }, { k: 'price', t: 'Үнэ, ₮', num: 1, w: 105 }, { k: 'kgu', t: 'кг/нэгж', num: 1, w: 80 }, { k: 'pk', t: '₮/кг', calc: r => r.kgu ? money(r.price / r.kgu) : '—' }, { k: 'vat', t: 'НӨАТ орсон', chk: 1, w: 70 }, { k: 'sup', t: 'Нийлүүлэгч', w: 150 }, { k: 'spec', t: 'Шаардлага / стандарт / тэмдэглэл' }, { k: 'date', t: 'Огноо', w: 90 }];
function renderCatMain(el) {
  const C = CAT(), q = CV.q.toLowerCase();
  const list = C.filter(c => (!CV.grp || c.grp === CV.grp) && (!CV.sup || c.sup === CV.sup) && (!q || (c.name + ' ' + c.spec + ' ' + c.sup).toLowerCase().includes(q)));
  const grps = [...new Set(C.map(c => c.grp).filter(Boolean))].sort(), sups = [...new Set(C.map(c => c.sup).filter(Boolean))].sort();
  const shown = list.slice(0, CV.lim);
  el.innerHTML = `<div class="bhead">
      <label class="fld grow">Хайх<input id="cv_q" value="${esc(CV.q)}" placeholder="жишээ: труба 159, лист 10, Q345…"></label>
      <label class="fld">Бүлэг<select id="cv_grp"><option value="">Бүгд</option>${grps.map(g => `<option${g === CV.grp ? ' selected' : ''}>${esc(g)}</option>`).join('')}</select></label>
      <label class="fld">Нийлүүлэгч<select id="cv_sup"><option value="">Бүгд</option>${sups.map(g => `<option${g === CV.sup ? ' selected' : ''}>${esc(g)}</option>`).join('')}</select></label>
    </div>
    <div class="exports"><button class="btn" id="cvImport">Excel / CSV үнийн хуудас импортлох</button><button class="btn ghost" id="cvTT">Түмэн Төмөрт 2026-05 дахин ачаалах</button><input type="file" id="cvFile" accept=".xlsx,.xls,.csv,.txt" hidden><span class="note">${list.length} / ${C.length} бараа${list.length > shown.length ? ` · эхний ${shown.length}-г харуулж байна` : ''}. Үнийн саналд шинээр шивсэн материал энд автоматаар нэмэгдэнэ.</span></div>
    <div class="jcard"><div class="jbody">${edTable('cv', CAT_COLS, shown)}${list.length > shown.length ? '<button class="btn sm" id="cvMore">Цааш харуулах</button>' : ''}</div></div>
    <p class="note">Excel/CSV багана: нэр, нэгж, үнэ, кг/нэгж, нийлүүлэгч, шаардлага (эхний мөр гарчиг). Ижил нэртэй бараа байвал үнэ нь шинэчлэгдэнэ. Түмэн Төмөрт Группийн үнэд НӨАТ орсон; үнийн саналд НӨАТ-гүй үнээр орно.</p>`;
  const re = () => renderCatMain(el);
  [['cv_q', 'q'], ['cv_grp', 'grp'], ['cv_sup', 'sup']].forEach(([id, k]) => el.querySelector('#' + id).addEventListener('change', e => { CV[k] = e.target.value; CV.lim = 120; re(); }));
  bindEd(el, { cv: { arr: () => { const o = { length: shown.length, splice: i => { const k = C.indexOf(shown[i]); if (k >= 0) C.splice(k, 1); }, push: v => C.unshift(v) }; shown.forEach((r, i) => o[i] = r); return o; }, cols: CAT_COLS, blank: () => ({ id: uid(), name: 'Шинэ бараа', grp: CV.grp || 'Миний оруулсан', cat: 'mat', unit: 'ш', price: 0, kgu: 0, sup: CV.sup || '', spec: '', vat: false, date: today(), src: 'user' }) } }, re);
  const mo = el.querySelector('#cvMore'); if (mo) mo.addEventListener('click', () => { CV.lim += 300; re(); });
  el.querySelector('#cvTT').addEventListener('click', () => { S.catalogTT = 0; CAT(); re(); toast('Түмэн Төмөрт Группийн үнэ шинэчлэгдлээ'); });
  el.querySelector('#cvImport').addEventListener('click', () => el.querySelector('#cvFile').click());
  el.querySelector('#cvFile').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      let rows;
      if (/\.csv$|\.txt$/i.test(f.name)) { const t = await f.text(), sep = (t.split('\n')[0].match(/;/g) || []).length > (t.split('\n')[0].match(/,/g) || []).length ? ';' : ','; rows = t.split(/\r?\n/).filter(Boolean).map(l => l.split(sep)); }
      else { if (!window.XLSX) await loadScript(XLSX_URL); const wb = XLSX.read(await f.arrayBuffer()); rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }); }
      const sup = prompt('Нийлүүлэгчийн нэр (бүх мөрд бичигдэнэ):', '') || '';
      let n = 0, u = 0; rows.slice(1).forEach(r => { const name = String(r[0] || '').trim(), price = num(r[2]); if (!name || !price) return; const ex = catFindExact(name); if (ex) { ex.price = price; ex.date = today(); if (r[1]) ex.unit = String(r[1]); if (num(r[3])) ex.kgu = num(r[3]); if (sup || r[4]) ex.sup = sup || String(r[4]); u++; } else { C.push({ id: uid(), name, grp: sup || 'Импорт', cat: 'mat', unit: String(r[1] || 'ш'), price, kgu: num(r[3]), sup: sup || String(r[4] || ''), spec: String(r[5] || ''), vat: true, date: today(), src: 'import' }); n++; } });
      save(); re(); toast(`${n} шинэ, ${u} шинэчлэгдсэн`);
    } catch (err) { toast('Файл уншигдсангүй'); }
  });
}

function renderCatSide() {
  const el = $('#catSups'); if (!el) return; const C = CAT(), by = {};
  C.forEach(c => { const k = c.sup || '— нийлүүлэгчгүй'; by[k] = by[k] || { n: 0, d: '' }; by[k].n++; if ((c.date || '') > by[k].d) by[k].d = c.date || ''; });
  el.innerHTML = Object.entries(by).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => `<div class="jitem${CV.sup === k ? ' on' : ''}" data-sup="${esc(k)}"><span class="no" style="font-family:inherit">${esc(k)}</span><span class="pill">${v.n}</span><span class="t">${v.d ? 'үнэ: ' + esc(v.d) : ''}</span></div>`).join('');
  el.querySelectorAll('[data-sup]').forEach(x => x.addEventListener('click', () => { CV.sup = CV.sup === x.dataset.sup || x.dataset.sup.startsWith('—') ? '' : x.dataset.sup; renderCatSide(); renderCatMain($('#jobsMain')); }));
}
