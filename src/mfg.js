/* ================= Kh International — Үйлдвэрлэл & Чанар (MRP-style, ISO 9001)
   · Үйлдвэрлэлийн захиалга (MO): маршрут (үйлдэл → ажлын байр), материал (хайлалтын дугаартай), цехийн гүйцэтгэл (эхлэх/зогсоох/дууссан, бодит цаг)
   · Ажлын байр: хүчин чадал, цагийн өртөг, ачааллын график; захиалгуудыг хүчин чадлаар нь урагш төлөвлөнө
   · Чанар: шалгалт (VIR, хэмжээс, VT, NDT, DFT, сорил, эцсийн), NCR + залруулах арга хэмжээ, хэмжих багажийн тохируулга, мөшгөлт
   ISO 9001:2015 — §7.1.5 хэмжих нөөц, §8.4 гаднаас нийлүүлэгдэх, §8.5.1 үйлдвэрлэлийн хяналт, §8.5.2 таних & мөшгөх, §8.6 гаргах, §8.7 үл тохирол, §10.2 залруулах ================= */
const MF = { tab: 'mo', sel: null, q: '', f: 'act' };
try { const o = JSON.parse(localStorage.getItem('kh-mf') || '{}'); if (o.tab) MF.tab = o.tab; } catch (e) { }
const mfSave = () => { try { localStorage.setItem('kh-mf', JSON.stringify({ tab: MF.tab })); } catch (e) { } };
const mfArr = k => (Array.isArray(S[k]) ? S[k] : (S[k] = []));
const mos = () => mfArr('mos'), qcs = () => mfArr('qcs'), ncrs = () => mfArr('ncrs'), gauges = () => mfArr('gauges');
function mfNo(k) { const y = today().slice(0, 4); if (!S.mfSeq || typeof S.mfSeq !== 'object') S.mfSeq = {}; const key = k + y; S.mfSeq[key] = (+S.mfSeq[key] || 0) + 1; return `${k}-${y}-${String(S.mfSeq[key]).padStart(3, '0')}`; }
const mfLog = (o, m) => { (o.log = o.log || []).push({ t: today(), who: S.me || '', m }); };
const mfIso = k => (S.iso && S.iso[k]) || { formMO: 'KH-PR-F01', formQC: 'KH-QC-F01', formNCR: 'KH-QC-F02', formTrace: 'KH-QC-F03', formGauge: 'KH-QC-F04', formPO: 'KH-PU-F01', formSup: 'KH-PU-F02' }[k] || '';
const mfJobs = () => topJobs().filter(j => !isQ(j));
const mfJobTxt = id => { const j = id && findJob(id); return j ? `${j.no}${j.customer ? ' · ' + j.customer : ''}` : ''; };
const mfB = (cls, t) => `<span class="erp-b s-${cls}">${esc(t)}</span>`;
const mfD = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
const mfOff = d => new Date(d + 'T00:00:00Z').getUTCDay() === 0;   // Ням гараг амралт
const mfH = v => nf(Math.round((+v || 0) * 10) / 10, 1).replace(/[.,]0$/, '');

/* ---------- statuses ---------- */
const MO_ST = [['draft', 'Ноорог', 'draft'], ['plan', 'Төлөвлөсөн', 'sent'], ['run', 'Хийгдэж буй', 'cut'], ['done', 'Дууссан', 'weld'], ['closed', 'Гаргахыг зөвшөөрсөн', 'done']];
const OP_ST = { wait: ['Хүлээгдэж буй', 'draft'], run: ['Хийгдэж буй', 'cut'], pause: ['Түр зогссон', 'open'], done: ['Дууссан', 'done'] };
const HOLD = [['', '—'], ['H', 'H · Hold (зогсох цэг)'], ['W', 'W · Witness (гэрчлэх)'], ['R', 'R · Бүртгэл шалгах']];
const QC_T = [
  ['VIR', 'Хүлээн авах үзлэг (материал)', 'ISO 9001 §8.4.2 · EN 10204 3.1', ['Чанарын гэрчилгээ (EN 10204 3.1) ирсэн', 'Хайлалтын дугаар гэрчилгээтэй таарсан', 'Марк (Q235B / Q355B / Hardox…)', 'Зузаан, хэмжээ', 'Гадаргуу: зэв, хуулралт, гэмтэл']],
  ['DIM', 'Хэмжээсийн шалгалт', 'ISO 2768-m · ISO 13920-B', ['Нийт урт', 'Нийт өргөн / өндөр', 'Нүхний диаметр, байрлал', 'Перпендикуляр, хавтгай байдал', 'Диагональ']],
  ['VT', 'Гагнуурын нүдэн шалгалт (VT)', 'ISO 17637 · ISO 5817-C', ['Катет / гагнуурын хэмжээ', 'Хагарал', 'Нүх сүв (porosity)', 'Ирмэг идэгдэл (undercut)', 'Шаар, цацраг', 'Гагнуурын урт, байрлал']],
  ['NDT', 'Үл эвдэх сорил (MT / UT / PT)', 'ISO 17638 · ISO 17640 · ISO 3452 · ISO 9712', ['Арга, багаж', 'Шалгасан гагнуур / урт', 'Илэрсэн заалт', 'Хүлээн авах түвшин']],
  ['DFT', 'Гадаргуу бэлтгэл, будгийн зузаан', 'ISO 8501-1 · ISO 19840 · ISO 2409', ['Гадаргуу бэлтгэл Sa 2½', 'Барзгар байдал, мкм', 'Праймер DFT, мкм', 'Өнгөлгөө DFT, мкм', 'Наалдац (cross-cut)']],
  ['FUN', 'Ажиллагааны / ачааллын сорил', 'Захиалагчийн шаардлага · зураг', ['Сорилын ачаалал', 'Барих хугацаа', 'Үлдэгдэл хэв гажилт', 'Гоожилт, чимээ']],
  ['FINAL', 'Эцсийн шалгалт (гаргах)', 'ISO 9001 §8.6', ['Зураг, хувилбар таарсан', 'Тоо ширхэг', 'Тэмдэглэгээ, хайлалтын дугаар', 'Баримт бичиг (MDR, гэрчилгээ) бүрэн', 'Савлагаа, хамгаалалт']]];
const qcT = k => QC_T.find(t => t[0] === k) || QC_T[1];
const QC_RES = [['', 'Хүлээгдэж буй', 'draft'], ['pass', 'Тэнцсэн', 'done'], ['cond', 'Нөхцөлтэй', 'open'], ['fail', 'Тэнцээгүй', 'late']];
const NCR_ST = [['open', 'Нээлттэй', 'late'], ['disp', 'Шийдвэр гарсан', 'open'], ['ca', 'Залруулах арга хэмжээ', 'sent'], ['closed', 'Хаагдсан', 'done']];
const NCR_SRC = [['int', 'Дотоод (үйлдвэрлэл)'], ['sup', 'Нийлүүлэгч / материал'], ['cust', 'Захиалагчийн гомдол']];
const NCR_DISP = [['', '— сонгох —'], ['rework', 'Дахин боловсруулах (rework)'], ['repair', 'Засварлах (repair)'], ['use', 'Хэвээр ашиглах (захиалагчийн зөвшөөрлөөр)'], ['scrap', 'Хаягдал болгох'], ['rts', 'Нийлүүлэгчид буцаах']];
const NCR_6M = ['Хүн', 'Машин, тоног', 'Арга, технологи', 'Материал', 'Хэмжилт', 'Орчин'];
const stOf = (L, k) => L.find(s => s[0] === k) || L[0];

/* ---------- MO helpers ---------- */
const opPlanH = (op, mo) => (+op.setup || 0) + (+op.run || 0) * Math.max(1, +mo.qty || 1);
const opActH = op => (+op.act || 0) + (op.st === 'run' && op.t0 ? (Date.now() - op.t0) / 3.6e6 : 0);
const machRate = id => +((machines().find(m => m.id === id) || {}).rate) || 0;
function moCost(mo) {
  const lab = (mo.ops || []).reduce((a, o) => { const r = machRate(o.mach) || +S.mfRate || 25000; a.p += opPlanH(o, mo) * r; a.a += opActH(o) * r; return a; }, { p: 0, a: 0 });
  const mat = (mo.mats || []).reduce((a, m) => { const it = m.stk && stkFind(m.stk), v = (+m.qty || 0) * (+m.price || (it ? +it.price : 0) || 0); a.p += v; if (m.mv) a.a += v; return a; }, { p: 0, a: 0 });
  return { labP: lab.p, labA: lab.a, matP: mat.p, matA: mat.a, p: lab.p + mat.p, a: lab.a + mat.a };
}
function moPct(mo) { const O = mo.ops || [], T = O.reduce((a, o) => a + opPlanH(o, mo), 0); if (!T) return mo.status === 'done' || mo.status === 'closed' ? 100 : 0; return Math.min(100, O.reduce((a, o) => a + (o.st === 'done' ? opPlanH(o, mo) : Math.min(opPlanH(o, mo) * .95, opActH(o))), 0) / T * 100); }
function newMO(d) {
  const mo = Object.assign({ id: uid(), no: mfNo('MO'), job: '', item: '', qty: 1, unit: 'ш', start: today(), due: '', prio: 'n', status: 'draft', dwg: '', rev: '', std: 'ISO 13920-B · ISO 5817-C', prep: S.me || '', appr: '', ops: [], mats: [], note: '', log: [], created: today() }, d || {});
  if (mo.job && !d.due) { const j = findJob(mo.job); if (j && j.due) mo.due = j.due; }
  mfLog(mo, 'Үүсгэсэн'); mos().unshift(mo); save(); return mo;
}
/* routing from the job's scope stages (name, machine, hours) */
function moOpsFromJob(mo) {
  const j = findJob(mo.job); if (!j) return 0; jx(j); const st = (j.scope && j.scope.stages || []).filter(s => String(s.name || '').trim());
  const q = Math.max(1, +mo.qty || 1);
  mo.ops = st.filter(s => !/худалдан авах|савлагаа|ачилт|shop drawing|цехийн зураг/i.test(s.name)).map(s => ({ id: uid(), name: s.name, mach: s.mach || (typeof machFor === 'function' ? machFor(s.rt, s.name) : ''), setup: 0, run: Math.round((+s.hours || 8) / q * 100) / 100, hold: /NDT|чанар|үзлэг|VIR|шалгалт/i.test(s.name) ? 'H' : /гагнуур|weld/i.test(s.name) ? 'W' : '', who: '', st: 'wait', act: 0 }));
  if (mo.ops.length) mfLog(mo, `Маршрут ажлын scope-оос: ${mo.ops.length} үйлдэл`); save(); return mo.ops.length;
}
/* ---------- finite-capacity forward scheduling (h/day = cap per week / 6, Sunday off) ---------- */
function mfSchedule() {
  const R = {}, M = {}, used = {}, bk = {};
  const capDay = id => { const m = machines().find(x => x.id === id); return m ? Math.max(1, (+m.cap || 48) / 6) : 8; };
  const P = { u: 0, h: 1, n: 2 };
  const L = mos().filter(m => ['plan', 'run'].includes(m.status)).slice().sort((a, b) => (P[a.prio] ?? 2) - (P[b.prio] ?? 2) || String(a.due || '9').localeCompare(String(b.due || '9')) || String(a.created).localeCompare(String(b.created)));
  L.forEach(mo => {
    let cur = mo.start && mo.start > today() ? mo.start : today(), first = null;
    (mo.ops || []).forEach(op => {
      if (op.st === 'done') { R[op.id] = { s: op.d0 || op.done, e: op.done, done: 1 }; first = first || R[op.id].s; return; }
      let need = Math.max(0.25, opPlanH(op, mo) - opActH(op)), d = cur, s = null, g = 0; const key = op.mach || '_' + mo.id, cap = op.mach ? capDay(op.mach) : 8, u = used[key] || (used[key] = {});
      while (g++ < 800) {
        if (!mfOff(d)) { const free = cap - (u[d] || 0); if (free > 0.01) { s = s || d; const t = Math.min(free, need); u[d] = (u[d] || 0) + t; need -= t; if (op.mach) ((bk[op.mach] = bk[op.mach] || {})[d] = bk[op.mach][d] || []).push({ mo: mo.no, id: mo.id, op: op.name, h: t }); } }
        if (need <= 0.01) break; d = mfD(d, 1);
      }
      R[op.id] = { s: s || d, e: d }; first = first || R[op.id].s; cur = d;
    });
    M[mo.id] = { s: first || cur, e: cur, late: !!(mo.due && cur > mo.due) };
  });
  return { R, M, used, bk, capDay };
}
/* ISO 9001 §8.6 — what still blocks release */
function moBlockers(mo) {
  const B = [], O = mo.ops || [], Q = qcs().filter(q => q.mo === mo.id);
  if (!O.length) B.push('Маршрутад үйлдэл алга');
  O.filter(o => o.st !== 'done').forEach(o => B.push(`Үйлдэл дуусаагүй: ${o.name}`));
  O.filter(o => o.hold === 'H' || o.hold === 'W').forEach(o => { if (!Q.some(q => q.op === o.id && q.res === 'pass' || q.op === o.id && q.res === 'cond')) B.push(`${o.hold === 'H' ? 'Hold' : 'Witness'} цэгийн шалгалт тэнцээгүй/хийгдээгүй: ${o.name}`); });
  if (!Q.some(q => q.type === 'FINAL' && q.res === 'pass')) B.push('Эцсийн шалгалт (FINAL) тэнцсэн бүртгэл алга');
  ncrs().filter(n => n.mo === mo.id && n.st !== 'closed').forEach(n => B.push(`Нээлттэй NCR: ${n.no}`));
  (mo.mats || []).filter(m => m.stk && !m.mv).forEach(m => B.push(`Материал агуулахаас олгогдоогүй: ${m.desc || stkName(stkFind(m.stk))}`));
  if (!mo.appr) B.push('Баталсан хүн (гаргахыг зөвшөөрөх эрхтэй) сонгогдоогүй');
  return B;
}
/* actual hours of a finished operation go into the job's expenses as labour (one line per operation, kept in step) */
function moLaborExp(mo, op) {
  const j = mo.job && findJob(mo.job); if (!j) return; jx(j); const r = machRate(op.mach) || +S.mfRate || 25000, h = Math.round((+op.act || 0) * 100) / 100;
  let e = j.prog.exp.find(x => x.ref === op.id); if (!h || op.st !== 'done') { if (e) j.prog.exp.splice(j.prog.exp.indexOf(e), 1); return; }
  if (!e) { e = { ref: op.id, date: today(), cat: 'labor', stage: '' }; j.prog.exp.push(e); }
  Object.assign(e, { desc: `${mo.no}: ${op.name} (${machName(op.mach) || 'гар ажил'})`, hours: h, amount: Math.round(h * r), who: pName(op.who) || '' });
}
function opSetSt(mo, op, st, o = {}) {
  const j = mo.job && findJob(mo.job);
  if (op.st === 'run' && op.t0) { op.act = Math.round(((+op.act || 0) + (Date.now() - op.t0) / 3.6e6) * 100) / 100; op.t0 = null; }
  if (st === 'run') { op.t0 = Date.now(); op.d0 = op.d0 || today(); if (!op.who && S.me) op.who = S.me; if (mo.status === 'plan' || mo.status === 'draft') { mo.status = 'run'; mfLog(mo, 'Үйлдвэрлэл эхэлсэн'); } }
  if (st === 'done') {
    if (op.hold === 'H' && !qcs().some(q => q.mo === mo.id && q.op === op.id && ['pass', 'cond'].includes(q.res)) && o.remote) throw new Error(`«${op.name}» бол Hold цэг — чанарын шалгалт тэнцсэний дараа дуусгана. Чанарын хяналтын ажилтанд мэдэгдэнэ үү.`);
    if (op.hold === 'H' && !qcs().some(q => q.mo === mo.id && q.op === op.id && ['pass', 'cond'].includes(q.res)) && !confirm(`«${op.name}» бол Hold (зогсох) цэг. Чанарын шалгалт тэнцээгүй байна.\nЭнэ үйлдлийг дууссан гэж тэмдэглээд, дараагийнхыг шалгалтгүйгээр эхлүүлэх үү?`)) return;
    op.done = today(); op.d0 = op.d0 || today();
    if (j) { jx(j); const sg = (j.scope.stages || []).find(s => String(s.name).trim().toLowerCase() === String(op.name).trim().toLowerCase()); if (sg) sg.pct = 100; jobLog(`${mo.no}: «${op.name}» дууссан (${mfH(op.act)} цаг)`, j); }
  }
  op.st = st; mfLog(mo, `${o.remote ? '📱 ' : ''}${op.name}: ${OP_ST[st][0]}${o.who ? ' — ' + o.who : ''}`); moLaborExp(mo, op);
  if (st === 'done' && (mo.ops || []).every(o => o.st === 'done') && mo.status !== 'closed') { mo.status = 'done'; mfLog(mo, 'Бүх үйлдэл дууссан'); }
  save();
}
function issueMat(mo, m) {
  const it = stkFind(m.stk); if (!it) { toast('Агуулахын бараа сонгоно уу'); return; } const q = +m.qty || 0; if (!(q > 0)) { toast('Тоо хэмжээ оруулна уу'); return; }
  if (+it.qty < q && !confirm(`Агуулахад ${nf(+it.qty, 2)} ${it.unit} байна. ${q}-г олгоход үлдэгдэл хасах болно. Үргэлжлүүлэх үү?`)) return;
  const c = m.cert && (S.certs || []).find(x => x.id === m.cert);
  const mv = stkMove(it, 'out', q, { job: mo.job || '', note: `${mo.no}${c ? ' · хайлалт ' + c.heat : ''}` }); if (!mv) return;
  mv.mo = mo.id; if (c) { mv.heat = c.heat; mv.cert = c.cert; if (it.cat === 'plate') c.used = (+c.used || 0) + q; }
  m.mv = mv.id; m.price = mv.price; m.date = today(); m.heat = c ? c.heat : (m.heat || ''); mfLog(mo, `Материал олгосон: ${stkName(it)} × ${q} ${it.unit}${c ? ' · хайлалт ' + c.heat : ''}`); save();
}
function newQC(d) { const t = qcT(d && d.type || 'DIM'); const q = Object.assign({ id: uid(), no: mfNo('QC'), type: t[0], date: today(), job: '', mo: '', op: '', item: '', heat: '', insp: S.me || '', gauge: '', std: t[2], rows: t[3].map(ch => ({ ch, nom: '', tol: '', act: '', ok: '' })), res: '', note: '', log: [] }, d || {}); if (q.mo && !q.job) q.job = (mos().find(m => m.id === q.mo) || {}).job || ''; mfLog(q, 'Үүсгэсэн'); qcs().unshift(q); save(); return q; }
function newNCR(d) { const n = Object.assign({ id: uid(), no: mfNo('NCR'), date: today(), src: 'int', job: '', mo: '', qc: '', item: '', heat: '', qty: '', desc: '', by: S.me || '', disp: '', dispBy: '', dispNote: '', cause6: '', cause: '', ca: '', caOwner: '', caDue: '', verify: '', verBy: '', verDate: '', cost: '', st: 'open', log: [] }, d || {}); mfLog(n, 'Нээсэн'); ncrs().unshift(n); save(); return n; }
const gNext = g => g.last && +g.months ? mfD(g.last, Math.round(+g.months * 30.44)) : '';
const gSt = g => { const n = gNext(g); if (!n) return ['', 'Огноо алга', 'draft']; if (n < today()) return ['over', 'Хугацаа хэтэрсэн', 'late']; if (n <= mfD(today(), 30)) return ['soon', '30 хоногт дуусна', 'open']; return ['ok', 'Хүчинтэй', 'done']; };

/* ---------- page ---------- */
const MF_TABS = [['mo', 'Үйлдвэрлэлийн захиалга'], ['wc', 'Ажлын байр, ачаалал'], ['qc', 'Чанарын шалгалт'], ['ncr', 'Үл тохирол (NCR)'], ['trace', 'Мөшгөлт'], ['gauge', 'Хэмжих багаж']];
function renderMfgSide() {
  const box = $('#mfgList'); if (!box) return; const oN = ncrs().filter(n => n.st !== 'closed').length, gO = gauges().filter(g => gSt(g)[0] === 'over').length, aM = mos().filter(m => ['plan', 'run'].includes(m.status)).length;
  const cnt = { mo: aM, ncr: oN, gauge: gO };
  box.innerHTML = MF_TABS.map(([k, n]) => `<div class="engitem${MF.tab === k ? ' on' : ''}" data-mft="${k}"><b>${esc(n)}</b>${cnt[k] ? `<span class="mono muted">${cnt[k]}</span>` : ''}</div>`).join('');
  box.querySelectorAll('[data-mft]').forEach(b => b.addEventListener('click', () => { MF.tab = b.dataset.mft; MF.sel = null; MF.q = ''; mfSave(); renderMfg(); }));
}
function renderMfg() {
  renderMfgSide(); const el = $('#mfgMain'); if (!el) return; const t = MF.tab;
  if (t === 'mo') { const mo = MF.sel && mos().find(x => x.id === MF.sel); mo ? moForm(el, mo) : moList(el); }
  else if (t === 'qc') { const q = MF.sel && qcs().find(x => x.id === MF.sel); q ? qcForm(el, q) : qcList(el); }
  else if (t === 'ncr') { const n = MF.sel && ncrs().find(x => x.id === MF.sel); n ? ncrForm(el, n) : ncrList(el); }
  else if (t === 'wc') wcPage(el); else if (t === 'trace') tracePage(el); else gaugePage(el);
  if (typeof erpOn === 'function' && erpOn() && typeof erpNav === 'function') erpNav();
}
const mfGo = (tab, sel) => { MF.tab = tab; MF.sel = sel || null; mfSave(); if (typeof erpOn === 'function' && erpOn() && typeof erpGo === 'function') { erpGo(tab === 'mo' ? 'mfg' : 'mfg:' + tab, { keep: 1 }); MF.sel = sel || null; renderMfg(); } else { setModule('mfg'); } };
/* list page shell: control panel + filter chips + table */
function mfListPage(el, o) {
  const st = o.st || MF, rr = o.rr || renderMfg, mid = o.main || '#mfgMain';
  el.innerHTML = erpCP({ crumbs: [[o.title]], right: o.right || '',
    row2: `<div class="erp-search">${erpIcon('search').replace('<svg', '<svg width="16" height="16" style="color:var(--ink-3);flex:none"')}<input id="mfQ" placeholder="${esc(o.ph || 'Хайх…')}" value="${esc(st.q || '')}"></div>
      ${o.chips ? `<div class="erp-filters">${o.chips.map(([k, n, c]) => `<button class="erp-chip${st.f === k ? ' on' : ''}" data-mff="${k}">${esc(n)}${c != null ? ` <span class="mono">${c}</span>` : ''}</button>`).join('')}</div>` : ''}
      <span class="erp-pager">${o.rows.length} бичлэг</span>` }) +
    `<div class="erp-view">${o.top || ''}${o.rows.length ? `<div class="erp-list"><table><thead><tr>${o.cols.map(c => `<th class="${c[2] || ''}">${esc(c[1])}</th>`).join('')}</tr></thead><tbody>${o.rows.map(r => `<tr class="rec" data-mfr="${r.id}">${o.cols.map(c => `<td class="${c[2] || ''}">${c[3](r)}</td>`).join('')}</tr>`).join('')}</tbody>${o.foot ? `<tfoot><tr>${o.foot}</tr></tfoot>` : ''}</table></div>` : `<div class="erp-empty"><b>${esc(o.empty || 'Бичлэг алга')}</b>${esc(o.emptyHint || '')}</div>`}</div>`;
  const qi = el.querySelector('#mfQ'); let tm; qi.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { st.q = qi.value; rr(); const n = $('#mfQ'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); });
  el.querySelectorAll('[data-mff]').forEach(b => b.addEventListener('click', () => { st.f = st.f === b.dataset.mff ? '' : b.dataset.mff; rr(); }));
  el.querySelectorAll('[data-mfr]').forEach(r => r.addEventListener('click', () => { st.sel = r.dataset.mfr; rr(); const m = $(mid); if (m) m.scrollTop = 0; }));
}
const mfMatch = (o, keys, st) => { const q = lc((st || MF).q || ''); return !q || lc(keys.join(' ')).includes(q); };
/* form page shell: control panel + status bar, then the body */
function mfFormTop(o) {
  return erpCP({ crumbs: o.crumbs, right: o.right || '' }) + `<div class="erp-sbar"><div class="acts">${o.acts || ''}</div>${o.stages ? `<div class="erp-stages">${o.stages}</div>` : ''}</div>`;
}
const mfStages = (L, cur) => { const ci = L.findIndex(s => s[0] === cur); return L.map(([k, n], i) => `<button data-mfst="${k}" class="${k === cur ? 'on' : i < ci ? 'past' : ''}">${esc(n)}</button>`).join(''); };
const mfCard = (title, body, right) => `<div class="jcard"><div class="bcard-h">${title}${right ? `<span class="sp"></span>${right}` : ''}</div><div class="jbody">${body}</div></div>`;
const mfSel = (id, opts, v, label, cls) => `<label class="fld${cls ? ' ' + cls : ''}">${label}<select id="${id}">${opts.map(([k, n]) => `<option value="${esc(k)}"${String(k) === String(v ?? '') ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>`;
const mfJobOpts = () => [['', '— ажилгүй (дотоод) —']].concat(mfJobs().map(j => [j.id, `${j.no} · ${j.customer || ''} · ${j.title || ''}`.slice(0, 90)]));
const mfPeople = () => [['', '—']].concat(people().filter(p => p.active !== false).map(p => [p.id, p.name]));
const mfMach = () => [['', '— гар ажил —']].concat(machines().map(m => [m.id, m.name]));
const mfLogHTML = o => `<div class="jlog">${(o.log || []).slice().reverse().map(l => `<div><span class="mono">${esc(l.t)}</span>${l.who ? `<b>${esc(pName(l.who) || '')}</b> ` : ''}${esc(l.m)}</div>`).join('') || '<span class="note">—</span>'}</div>`;
function mfBind(el, obj, keys, after) { keys.forEach(([id, k, num]) => { const f = el.querySelector('#' + id); if (f) f.addEventListener('change', () => { obj[k] = num ? (f.value === '' ? '' : +f.value) : f.value; save(); if (after) after(k); }); }); }

/* ===== Үйлдвэрлэлийн захиалга: жагсаалт ===== */
function moList(el) {
  const SC = mfSchedule(), A = mos();
  const F = { act: m => ['plan', 'run'].includes(m.status), late: m => SC.M[m.id] && SC.M[m.id].late, draft: m => m.status === 'draft', done: m => ['done', 'closed'].includes(m.status) };
  const R = A.filter(m => (!MF.f || !F[MF.f] || F[MF.f](m)) && mfMatch(m, [m.no, m.item, mfJobTxt(m.job), (findJob(m.job) || {}).title || '']));
  mfListPage(el, { title: 'Үйлдвэрлэлийн захиалга', ph: 'Хайх: MO дугаар, ажил, захиалагч, бүтээгдэхүүн…', rows: R,
    right: '<button class="btn primary" id="moNew">+ Үйлдвэрлэлийн захиалга</button><button class="btn" id="moFromJobs" title="Идэвхтэй ажил бүрт (MO-гүй) захиалга үүсгэж, маршрутыг scope-оос бөглөнө">⚡ Ажлуудаас үүсгэх</button>',
    chips: [['act', 'Идэвхтэй', A.filter(F.act).length], ['late', 'Хоцорч буй', A.filter(F.late).length], ['draft', 'Ноорог', A.filter(F.draft).length], ['done', 'Дууссан', A.filter(F.done).length]],
    cols: [['no', 'Дугаар', '', m => `<b class="mono">${esc(m.no)}</b>${m.prio === 'u' ? ' <span class="erp-b s-late">яаралтай</span>' : ''}`], ['job', 'Ажил', '', m => esc(mfJobTxt(m.job) || '—')], ['item', 'Бүтээгдэхүүн', '', m => esc(m.item || '—')], ['qty', 'Тоо', 'r', m => `<span class="num">${nf(+m.qty || 0)} ${esc(m.unit || '')}</span>`],
      ['s', 'Эхлэх', '', m => `<span class="num">${esc((SC.M[m.id] || {}).s || m.start || '')}</span>`], ['e', 'Төлөвлөсөн дуусах', '', m => { const x = SC.M[m.id]; return x ? `<span class="num${x.late ? ' late' : ''}">${esc(x.e)}</span>` : '<span class="sub">—</span>'; }],
      ['due', 'Хугацаа', '', m => `<span class="num">${esc(m.due || '')}</span>`], ['pct', 'Явц', 'r', m => { const p = moPct(m); return `<div class="erp-prog"><i><b style="width:${Math.round(p)}%"></b></i><span>${Math.round(p)}%</span></div>`; }],
      ['st', 'Төлөв', '', m => { const s = stOf(MO_ST, m.status); return mfB(s[2], s[1]); }]],
    empty: 'Үйлдвэрлэлийн захиалга алга', emptyHint: ' «+ Үйлдвэрлэлийн захиалга» эсвэл «⚡ Ажлуудаас үүсгэх» товчоор эхэлнэ.' });
  el.querySelector('#moNew').addEventListener('click', () => { const mo = newMO({}); MF.sel = mo.id; renderMfg(); });
  el.querySelector('#moFromJobs').addEventListener('click', () => {
    const J2 = mfJobs().filter(j => !['done', 'given'].includes(j.status) && !mos().some(m => m.job === j.id)); if (!J2.length) { toast('MO-гүй идэвхтэй ажил алга'); return; }
    if (!confirm(`${J2.length} ажилд үйлдвэрлэлийн захиалга үүсгэх үү?\n${J2.slice(0, 8).map(j => j.no).join(', ')}${J2.length > 8 ? '…' : ''}`)) return;
    J2.forEach(j => { const mo = newMO({ job: j.id, item: j.title || '', due: j.due || '', status: 'draft' }); moOpsFromJob(mo); }); toast(`${J2.length} захиалга үүслээ`); renderMfg();
  });
}

/* ===== Үйлдвэрлэлийн захиалга: маягт ===== */
const MO_OPCOLS = () => [{ k: 'name', t: 'Үйлдэл', list: 'dl-mfwork' }, { k: 'mach', t: 'Ажлын байр', sel: mfMach() }, { k: 'setup', t: 'Бэлтгэл, цаг', num: 1, w: 80 }, { k: 'run', t: 'Ажил, цаг/ш', num: 1, w: 90 }, { k: 'hold', t: 'Хяналтын цэг', sel: HOLD }, { k: 'who', t: 'Гүйцэтгэгч', sel: mfPeople() }];
function moForm(el, mo) {
  const SC = mfSchedule(), sm = SC.M[mo.id], c = moCost(mo), j = mo.job && findJob(mo.job), st = stOf(MO_ST, mo.status);
  const Q = qcs().filter(q => q.mo === mo.id), N = ncrs().filter(n => n.mo === mo.id), planH = (mo.ops || []).reduce((a, o) => a + opPlanH(o, mo), 0), actH = (mo.ops || []).reduce((a, o) => a + opActH(o), 0);
  const ord = mos().map(m => m.id), idx = ord.indexOf(mo.id);
  let acts = '';
  if (mo.status === 'draft') acts = '<button class="btn primary" data-mfst="plan">Төлөвлөх (батлах)</button>';
  else if (mo.status === 'plan') acts = '<button class="btn primary" data-mfst="run">▶ Эхлүүлэх</button><button class="btn" data-mfst="draft">Ноорог руу</button>';
  else if (mo.status === 'run') acts = '<button class="btn primary" data-mfst="done">Дууссан гэж тэмдэглэх</button>';
  else if (mo.status === 'done') acts = '<button class="btn primary" id="moRel">✓ Гаргахыг зөвшөөрөх (ISO 8.6)</button><button class="btn" data-mfst="run">Буцаах</button>';
  else acts = '<button class="btn" data-mfst="done">Зөвшөөрлийг цуцлах</button>';
  acts += '<button class="btn" id="moQC">+ Чанарын шалгалт</button><button class="btn" id="moNCR">+ NCR</button>';
  const opRows = (mo.ops || []).map((o, i) => { const r = SC.R[o.id] || {}, os = OP_ST[o.st || 'wait'], q = Q.filter(x => x.op === o.id), qb = q.length ? q.map(x => mfB(stOf(QC_RES, x.res)[2], `${x.no} ${stOf(QC_RES, x.res)[1]}`)).join(' ') : '';
    return `<tr><td class="num muted">${i + 1}</td><td><b>${esc(o.name || '—')}</b>${o.hold ? ` <span class="erp-b s-${o.hold === 'H' ? 'late' : 'sent'}" title="${esc((HOLD.find(h => h[0] === o.hold) || [])[1] || '')}">${o.hold}</span>` : ''}<div class="sub">${esc(machName(o.mach) || 'гар ажил')}${o.who ? ' · ' + esc(pName(o.who)) : ''}</div></td>
      <td class="num">${r.s ? `${esc(r.s.slice(5))} → ${esc(r.e.slice(5))}` : '—'}</td><td class="r num">${mfH(opPlanH(o, mo))}</td>
      <td class="r"><input class="mono" data-opact="${i}" type="number" step="0.1" value="${o.st === 'run' ? mfH(opActH(o)) : (o.act || '')}" style="width:70px;text-align:right"${o.st === 'run' ? ' disabled title="Хэмжиж байна"' : ''}></td>
      <td>${mfB(os[1], os[0])}${qb ? `<div style="margin-top:3px">${qb}</div>` : ''}</td>
      <td class="r" style="white-space:nowrap">${o.st !== 'run' && o.st !== 'done' ? `<button class="btn sm primary" data-opst="${i}:run">▶ Эхлэх</button>` : ''}${o.st === 'run' ? `<button class="btn sm" data-opst="${i}:pause">⏸ Зогсоох</button>` : ''}${o.st !== 'done' ? `<button class="btn sm" data-opst="${i}:done">✓ Дууссан</button>` : `<button class="btn sm ghost" data-opst="${i}:wait">↺</button>`}<button class="btn sm ghost" data-opqc="${i}" title="Энэ үйлдэлд чанарын шалгалт">QC</button></td></tr>`; }).join('');
  const stkOpts = [['', '— агуулахын бараа —']].concat(stk().map(it => [it.id, `${stkName(it)}${it.mat ? ' · ' + it.mat : ''} · үлд. ${nf(+it.qty || 0, 2)} ${it.unit}`]));
  const certOpts = m => { const it = m.stk && stkFind(m.stk), C = (S.certs || []).slice().sort((a, b) => ((it && b.mat === it.mat && +b.thk === +it.thk) - (it && a.mat === it.mat && +a.thk === +it.thk))); return [['', '— гэрчилгээгүй —']].concat(C.map(x => [x.id, `${x.heat}${x.cert ? ' · ' + x.cert : ''} · ${x.mat} ${x.thk}мм · үлд. ${Math.max(0, (+x.qty || 0) - (+x.used || 0))}`])); };
  const matRows = (mo.mats || []).map((m, i) => { const it = m.stk && stkFind(m.stk), dis = m.mv ? ' disabled' : '';
    return `<tr><td class="num muted">${i + 1}</td><td><select data-mm="${i}:stk"${dis}>${stkOpts.map(([k, n]) => `<option value="${esc(k)}"${k === (m.stk || '') ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>${!m.stk ? `<input data-mm="${i}:desc" value="${esc(m.desc || '')}" placeholder="эсвэл тайлбар (агуулахгүй)" style="margin-top:4px"${dis}>` : ''}</td>
      <td><select data-mm="${i}:cert"${dis}>${certOpts(m).map(([k, n]) => `<option value="${esc(k)}"${k === (m.cert || '') ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></td>
      <td class="r"><input class="mono" type="number" step="any" data-mm="${i}:qty" value="${esc(m.qty ?? '')}" style="width:80px;text-align:right"${dis}> <span class="muted">${esc(it ? it.unit : '')}</span></td>
      <td class="r num">${money((+m.qty || 0) * (+m.price || (it ? +it.price : 0) || 0))}</td>
      <td>${m.mv ? mfB('done', 'олгосон ' + (m.date || '')) : m.stk ? `<button class="btn sm primary" data-mmiss="${i}">Агуулахаас олгох</button>` : mfB('draft', 'гаднаас')}</td>
      <td>${m.mv ? '' : `<button class="x" data-mmdel="${i}">×</button>`}</td></tr>`; }).join('');
  const blk = mo.status === 'done' || mo.status === 'closed' ? moBlockers(mo) : [];
  el.innerHTML = mfFormTop({ crumbs: [['Үйлдвэрлэлийн захиалга'], [mo.no]],
    right: `<span class="erp-pager">${idx + 1} / ${ord.length}<button data-mfpg="-1"${idx <= 0 ? ' disabled' : ''}>‹</button><button data-mfpg="1"${idx >= ord.length - 1 ? ' disabled' : ''}>›</button></span><button class="btn" data-moout="pdf">Маршрутын карт PDF</button><button class="btn ghost" data-moout="print">🖨</button><button class="btn ghost" id="moDel">Устгах</button>`,
    acts, stages: mfStages(MO_ST, mo.status) }) +
    `<div class="mf-body">
    <div class="erp-kpis mf-kpis">${[['Төлөвлөсөн цаг', mfH(planH), `${(mo.ops || []).length} үйлдэл`], ['Бодит цаг', mfH(actH), planH ? `${Math.round(actH / planH * 100)}% төлөвлөгөөнөөс` : ''], ['Төлөвлөсөн дуусах', sm ? sm.e : mo.status === 'closed' || mo.status === 'done' ? 'дууссан' : '—', mo.due ? `хугацаа ${mo.due}` : '', sm && sm.late ? 'bad' : ''], ['Өртөг: төлөвлөгөө / бодит', `${nf(c.p / 1e6, 2)} / ${nf(c.a / 1e6, 2)}<small>сая ₮</small>`, `ажиллах хүч ${money(c.labA)} · материал ${money(c.matA)}`, c.a > c.p * 1.05 && c.p ? 'bad' : '']].map(([l, v, s, cl]) => `<div class="erp-kpi${cl ? ' ' + cl : ''}" style="cursor:default"><div class="k">${l}</div><div class="v">${v}</div><div class="s">${esc(s || '')}</div></div>`).join('')}</div>
    ${blk.length ? `<div class="mf-warn"><b>Гаргахаас өмнө шийдэх (ISO 9001 §8.6):</b><ul>${blk.map(b => `<li>${esc(b)}</li>`).join('')}</ul></div>` : mo.status === 'closed' ? `<div class="mf-ok">✓ Гаргахыг зөвшөөрсөн: ${esc(pName(mo.relBy) || '')} · ${esc(mo.relDate || '')}</div>` : ''}
    ${mfCard('Ерөнхий мэдээлэл', `<div class="jgrid">${mfSel('mo_job', mfJobOpts(), mo.job, 'Ажил (захиалга)', 'grow')}${fldIn('mo_item', 'Бүтээгдэхүүн / эд анги', mo.item, { cls: 'grow' })}${fldIn('mo_qty', 'Тоо', mo.qty, { num: 1 })}${fldIn('mo_unit', 'Нэгж', mo.unit)}
      ${fldIn('mo_start', 'Эхлэх огноо', mo.start, { type: 'date' })}${fldIn('mo_due', 'Дуусах хугацаа', mo.due, { type: 'date' })}${mfSel('mo_prio', [['n', 'Энгийн'], ['h', 'Өндөр'], ['u', 'Яаралтай']], mo.prio, 'Ач холбогдол')}
      ${fldIn('mo_dwg', 'Зургийн дугаар', mo.dwg)}${fldIn('mo_rev', 'Зургийн хувилбар (rev)', mo.rev)}${fldIn('mo_std', 'Хүлээн авах стандарт', mo.std, { cls: 'grow' })}
      ${mfSel('mo_prep', mfPeople(), mo.prep, 'Боловсруулсан')}${mfSel('mo_appr', mfPeople(), mo.appr, 'Баталсан (гаргах эрхтэй)')}</div>${fldIn('mo_note', 'Тусгай шаардлага, тэмдэглэл', mo.note, { area: 1, rows: 2 })}`)}
    ${mfCard('Маршрут — үйлдлүүд', `${edTable('mfops', MO_OPCOLS(), mo.ops || [], { extra: `<button class="btn sm" id="moFromScope"${j ? '' : ' disabled title="Эхлээд ажил сонгоно уу"'}>⚡ Ажлын scope-оос бөглөх</button>` })}
      <datalist id="dl-mfwork">${(typeof workAll === 'function' ? workAll() : []).map(w => `<option value="${esc(w[0])}">${esc(w[1])}</option>`).join('')}</datalist>
      <p class="note">Үйлдэл бүр ажлын байрны хүчин чадлаар (цаг/долоо хоног ÷ 6, ням амарна) дарааллаар нь урагш төлөвлөгдөнө. H — чанарын шалгалт тэнцэхгүй бол дараагийн үйлдэл эхлэхгүй; W — захиалагч/хяналтын байгууллага гэрчилнэ.</p>`, `<span class="mono">${mfH(planH)} цаг</span>`)}
    ${mfCard('Цехийн гүйцэтгэл', (mo.ops || []).length ? `<div class="tblwrap"><table class="dt"><thead><tr><th style="width:28px">№</th><th>Үйлдэл</th><th>Төлөвлөгөө</th><th class="r">Төл. цаг</th><th class="r">Бодит цаг</th><th>Төлөв</th><th></th></tr></thead><tbody>${opRows}</tbody></table></div>` : '<p class="note">Маршрутад үйлдэл нэмбэл энд гүйцэтгэлийг бүртгэнэ.</p>')}
    ${mfCard('Материал — хайлалтын дугаартай (мөшгөлт)', `<div class="tblwrap"><table class="dt ed"><thead><tr><th style="width:28px">№</th><th>Материал</th><th>Хайлалтын дугаар / гэрчилгээ</th><th class="r">Тоо</th><th class="r">Дүн, ₮</th><th>Олголт</th><th style="width:28px"></th></tr></thead><tbody>${matRows}</tbody></table></div>
      <div class="addrow"><button class="btn sm" id="moMatAdd">+ Материал</button><span class="note">Олгоход агуулахаас хасагдаж, ажлын зардалд орно; хавтангийн гэрчилгээний ашигласан тоо нэмэгдэнэ.</span></div>`, `<span class="mono">${money(c.matP)} ₮</span>`)}
    ${mfCard('Чанар', `${Q.length ? `<div class="tblwrap"><table class="dt"><tbody>${Q.map(q => `<tr class="rec" data-goqc="${q.id}"><td class="mono">${esc(q.no)}</td><td>${esc(qcT(q.type)[1])}</td><td>${esc(((mo.ops || []).find(o => o.id === q.op) || {}).name || '')}</td><td class="num">${esc(q.date)}</td><td>${mfB(stOf(QC_RES, q.res)[2], stOf(QC_RES, q.res)[1])}</td></tr>`).join('')}</tbody></table></div>` : '<p class="note">Шалгалт бүртгэгдээгүй.</p>'}
      ${N.length ? `<div class="tblwrap" style="margin-top:8px"><table class="dt"><tbody>${N.map(n => `<tr class="rec" data-goncr="${n.id}"><td class="mono">${esc(n.no)}</td><td>${esc(n.desc.slice(0, 80))}</td><td>${mfB(stOf(NCR_ST, n.st)[2], stOf(NCR_ST, n.st)[1])}</td></tr>`).join('')}</tbody></table></div>` : ''}`)}
    ${mfCard('Түүх', mfLogHTML(mo))}</div>`;
  const re = () => renderMfg();
  mfBind(el, mo, [['mo_job', 'job'], ['mo_item', 'item'], ['mo_qty', 'qty', 1], ['mo_unit', 'unit'], ['mo_start', 'start'], ['mo_due', 'due'], ['mo_prio', 'prio'], ['mo_dwg', 'dwg'], ['mo_rev', 'rev'], ['mo_std', 'std'], ['mo_prep', 'prep'], ['mo_appr', 'appr'], ['mo_note', 'note']], k => {
    if (k === 'job') { const jj = findJob(mo.job); if (jj) { if (!mo.item) mo.item = jj.title || ''; if (!mo.due) mo.due = jj.due || ''; if (!(mo.ops || []).length) moOpsFromJob(mo); save(); } }
    if (k === 'rev' || k === 'dwg') mfLog(mo, `Зураг: ${mo.dwg || '—'} rev ${mo.rev || '—'}`);
    if (['job', 'qty', 'start', 'prio', 'appr'].includes(k)) re();
  });
  bindEd(el, { mfops: { arr: () => (mo.ops = mo.ops || []), cols: MO_OPCOLS(), blank: () => ({ id: uid(), name: '', mach: '', setup: 0, run: 1, hold: '', who: '', st: 'wait', act: 0 }), onDel: r => r.st === 'wait' || !r.st || confirm('Энэ үйлдэл эхэлсэн байна. Устгах уу?') } }, re,
    (id, r, k) => { if (k === 'name' && typeof workFind === 'function') { const w = workFind(r.name); if (w) { r.name = w[0]; if (!r.mach && typeof machFor === 'function') r.mach = machFor(w[2], w[0]); if (+r.run === 1) r.run = w[3]; } } });
  el.querySelectorAll('[data-mfst]').forEach(b => b.addEventListener('click', () => {
    const to = b.dataset.mfst; if (to === mo.status) return;
    if (to === 'closed') { el.querySelector('#moRel') && el.querySelector('#moRel').click(); return; }
    if (to === 'plan' && !(mo.ops || []).length) { toast('Эхлээд маршрутад үйлдэл нэмнэ үү'); return; }
    if (to === 'done' && (mo.ops || []).some(o => o.st !== 'done') && !confirm('Дуусаагүй үйлдэл байна. Бүгдийг дууссан гэж тэмдэглэх үү?')) return;
    if (to === 'done') (mo.ops || []).forEach(o => { if (o.st !== 'done') { if (o.st === 'run' && o.t0) { o.act = Math.round(((+o.act || 0) + (Date.now() - o.t0) / 3.6e6) * 100) / 100; o.t0 = null; } o.st = 'done'; o.done = today(); moLaborExp(mo, o); } });
    mfLog(mo, `${stOf(MO_ST, mo.status)[1]} → ${stOf(MO_ST, to)[1]}`); mo.status = to; if (to !== 'closed') { mo.relBy = ''; mo.relDate = ''; } save(); re();
  }));
  const rel = el.querySelector('#moRel'); if (rel) rel.addEventListener('click', () => {
    const B = moBlockers(mo); if (B.length) { alert('Гаргах боломжгүй (ISO 9001 §8.6):\n\n• ' + B.join('\n• ')); return; }
    mo.status = 'closed'; mo.relBy = mo.appr; mo.relDate = today(); mfLog(mo, `Гаргахыг зөвшөөрсөн: ${pName(mo.appr)}`); if (j) jobLog(`${mo.no} гаргахыг зөвшөөрсөн (${pName(mo.appr)})`, j); save(); re();
  });
  el.querySelectorAll('[data-opst]').forEach(b => b.addEventListener('click', () => { const [i, s] = b.dataset.opst.split(':'); const o = mo.ops[+i]; if (!o) return; if (s === 'wait') { o.st = 'wait'; o.done = ''; moLaborExp(mo, o); mfLog(mo, `${o.name}: дахин нээсэн`); save(); } else opSetSt(mo, o, s); re(); }));
  el.querySelectorAll('[data-opact]').forEach(f => f.addEventListener('change', () => { const o = mo.ops[+f.dataset.opact]; o.act = +f.value || 0; moLaborExp(mo, o); save(); re(); }));
  el.querySelectorAll('[data-opqc]').forEach(b => b.addEventListener('click', () => { const o = mo.ops[+b.dataset.opqc]; const ty = /гагнуур|weld/i.test(o.name) ? 'VT' : /будаг|элс|paint|blast/i.test(o.name) ? 'DFT' : /NDT/i.test(o.name) ? 'NDT' : /хүлээн авах|VIR/i.test(o.name) ? 'VIR' : 'DIM'; const q = newQC({ type: ty, mo: mo.id, op: o.id, job: mo.job, item: mo.item, std: /гагнуур/i.test(o.name) ? qcT('VT')[2] : qcT(ty)[2] }); mfLog(mo, `${q.no} шалгалт нээсэн (${o.name})`); save(); mfGo('qc', q.id); }));
  el.querySelector('#moQC').addEventListener('click', () => { const fin = mo.status === 'done'; const q = newQC({ type: fin ? 'FINAL' : 'DIM', mo: mo.id, job: mo.job, item: mo.item }); mfLog(mo, `${q.no} шалгалт нээсэн`); save(); mfGo('qc', q.id); });
  el.querySelector('#moNCR').addEventListener('click', () => { const n = newNCR({ mo: mo.id, job: mo.job, item: mo.item }); mfLog(mo, `${n.no} NCR нээсэн`); save(); mfGo('ncr', n.id); });
  const fs = el.querySelector('#moFromScope'); if (fs) fs.addEventListener('click', () => { if ((mo.ops || []).length && !confirm('Одоогийн маршрутыг scope-оос дахин бөглөх үү?')) return; const n = moOpsFromJob(mo); toast(n ? `${n} үйлдэл нэмэгдлээ` : 'Ажлын scope-д үе шат алга'); re(); });
  el.querySelector('#moMatAdd').addEventListener('click', () => { (mo.mats = mo.mats || []).push({ id: uid(), stk: '', cert: '', qty: '', desc: '' }); save(); re(); });
  el.querySelectorAll('[data-mm]').forEach(f => f.addEventListener('change', () => { const [i, k] = f.dataset.mm.split(':'), m = mo.mats[+i]; m[k] = k === 'qty' ? (f.value === '' ? '' : +f.value) : f.value; if (k === 'cert') { const c = (S.certs || []).find(x => x.id === m.cert); m.heat = c ? c.heat : ''; } save(); re(); }));
  el.querySelectorAll('[data-mmiss]').forEach(b => b.addEventListener('click', () => { issueMat(mo, mo.mats[+b.dataset.mmiss]); re(); }));
  el.querySelectorAll('[data-mmdel]').forEach(b => b.addEventListener('click', () => { mo.mats.splice(+b.dataset.mmdel, 1); save(); re(); }));
  el.querySelectorAll('[data-goqc]').forEach(r => r.addEventListener('click', () => mfGo('qc', r.dataset.goqc)));
  el.querySelectorAll('[data-goncr]').forEach(r => r.addEventListener('click', () => mfGo('ncr', r.dataset.goncr)));
  el.querySelectorAll('[data-mfpg]').forEach(b => b.addEventListener('click', () => { const n = ord[idx + +b.dataset.mfpg]; if (n) { MF.sel = n; re(); } }));
  el.querySelectorAll('[data-moout]').forEach(b => b.addEventListener('click', () => docOut(b.dataset.moout, () => moDoc(mo), `${mo.no}_маршрутын_карт`)));
  el.querySelector('#moDel').addEventListener('click', () => { if ((mo.mats || []).some(m => m.mv)) { toast('Материал олгосон тул устгах боломжгүй — «Ноорог» болгож, тайлбар бичнэ үү'); return; } if (!confirm(`${mo.no}-г устгах уу?`)) return; S.mos = mos().filter(x => x !== mo); MF.sel = null; save(); re(); });
  erpBindCrumbs(el, [['', () => { MF.sel = null; re(); }], ['']]);
}
/* phone link for one MO (works when «Утаснаас бүртгэх» is on): the shop scans the route card */
async function mfQrUrl(mo) {
  try { if (!(window.kh && window.kh.linkInfo)) return ''; const I = await window.kh.linkInfo(); if (!I.mobile || !I.token || !(I.ips || []).length) return ''; if (!window.qrcode) { try { await loadScript('vendor/qrcode.js'); } catch (e) { } } return `http://${I.ips[0]}:${I.port}/m?t=${encodeURIComponent(I.token)}&mo=${encodeURIComponent(mo.id)}`; } catch (e) { return ''; }
}
async function moDoc(mo) {
  const SC = mfSchedule(), j = mo.job && findJob(mo.job), c = moCost(mo);
  const D = await kdoc({ title: 'ҮЙЛДВЭРЛЭЛИЙН ЗАХИАЛГА — МАРШРУТЫН КАРТ', sub: `${mo.no} · ${today()}`, code: mfIso('formMO') });
  D.kv([['MO дугаар', mo.no], ['Ажил', j ? j.no : '—'], ['Захиалагч', j ? j.customer || '—' : '—'], ['Бүтээгдэхүүн', mo.item || '—'], ['Тоо', `${nf(+mo.qty || 0)} ${mo.unit || ''}`], ['Хугацаа', mo.due || '—'], ['Зураг / rev', `${mo.dwg || '—'} / ${mo.rev || '—'}`], ['Хүлээн авах стандарт', mo.std || '—']], 2);
  { const qr = await mfQrUrl(mo); if (qr && window.qrcode) { D.need(30); const y = D.y + 1; drawQR(D.x, qr, D.PW - D.M - 26, y, 26); D.x.fillStyle = '#1f2328'; D.x.font = `600 3.2px ${DF}`; D.x.fillText('Цехийн терминал', D.M, y + 8); D.x.font = `400 2.8px ${DF}`; D.x.fillStyle = '#475467'; D.x.fillText('Утасны камераар QR-ыг уншуулж үйлдлээ ▶ эхлүүлэх, ⏸ зогсоох, ✓ дуусгах — бодит цаг автоматаар бүртгэгдэнэ.', D.M, y + 13); D.x.fillText('Утас үйлдвэрийн Wi-Fi-д холбогдсон байна.', D.M, y + 17.5); D.y = y + 28; } }
  D.h2('Маршрут', 'H — зогсох цэг · W — гэрчлэх · R — бүртгэл');
  D.table([{ t: '№', w: 8, m: 1 }, { t: 'Үйлдэл' }, { t: 'Ажлын байр', w: 34 }, { t: 'Цэг', w: 10, a: 'c' }, { t: 'Төлөвлөгөө', w: 26, m: 1 }, { t: 'Төл. цаг', w: 15, a: 'r', m: 1 }, { t: 'Бодит цаг', w: 16, a: 'r', m: 1 }, { t: 'Гүйцэтгэгч / гарын үсэг', w: 38 }],
    (mo.ops || []).map((o, i) => { const r = SC.R[o.id] || {}; return [i + 1, o.name, machName(o.mach) || 'гар ажил', o.hold || '', r.s ? `${r.s.slice(5)} → ${r.e.slice(5)}` : '', mfH(opPlanH(o, mo)), o.act ? mfH(o.act) : '', o.who ? pName(o.who) : '']; }), { minRh: 8 });
  const M = (mo.mats || []); if (M.length) { D.h2('Материал (§8.5.2 таних, мөшгөх)'); D.table([{ t: '№', w: 8, m: 1 }, { t: 'Материал' }, { t: 'Хайлалтын дугаар', w: 34, m: 1 }, { t: 'Гэрчилгээ', w: 30 }, { t: 'Тоо', w: 18, a: 'r', m: 1 }, { t: 'Олгосон', w: 22, m: 1 }], M.map((m, i) => { const it = m.stk && stkFind(m.stk), cc = m.cert && (S.certs || []).find(x => x.id === m.cert); return [i + 1, it ? `${stkName(it)}${it.mat ? ' · ' + it.mat : ''}` : m.desc || '', m.heat || (cc ? cc.heat : ''), cc ? cc.cert : '', `${m.qty || ''} ${it ? it.unit : ''}`, m.date || '']; })); }
  const Q = qcs().filter(q => q.mo === mo.id); if (Q.length) { D.h2('Чанарын шалгалт'); D.table([{ t: 'Дугаар', w: 28, m: 1 }, { t: 'Төрөл' }, { t: 'Огноо', w: 22, m: 1 }, { t: 'Шалгагч', w: 34 }, { t: 'Дүн', w: 24 }], Q.map(q => [q.no, qcT(q.type)[1], q.date, pName(q.insp), stOf(QC_RES, q.res)[1]])); }
  D.totals([['Ажиллах хүч (төлөвлөгөө / бодит)', `${money(c.labP)} / ${money(c.labA)}`], ['Материал (төлөвлөгөө / олгосон)', `${money(c.matP)} / ${money(c.matA)}`], ['Нийт', `${money(c.p)} / ${money(c.a)}`, 1]], { w: 110 });
  if (mo.note) D.box('Тусгай шаардлага', [mo.note]);
  D.sigs(['Боловсруулсан', 'Баталсан', 'Чанарын хяналт (гаргах)'], { names: [pName(mo.prep), pName(mo.appr), mo.relBy ? `${pName(mo.relBy)} · ${mo.relDate}` : ''] });
  return D;
}

/* ===== Ажлын байр, хүчин чадал, ачаалал ===== */
const WC_COLS = [{ k: 'name', t: 'Ажлын байр / машин' }, { k: 'cap', t: 'Хүчин чадал, цаг/7 хоног', num: 1, w: 120 }, { k: 'rate', t: 'Цагийн өртөг, ₮', num: 1, w: 120 }, { k: 'oee', t: 'Ашиглалтын зорилт, %', num: 1, w: 110 }];
function wcPage(el) {
  const SC = mfSchedule(), M = machines(), days = []; for (let d = today(), g = 0; days.length < 21 && g < 40; d = mfD(d, 1), g++) if (!mfOff(d)) days.push(d);
  const wk = [0, 1, 2, 3].map(w => { const s = mfD(today(), w * 7); return [s, mfD(s, 6)]; });
  const load = (id, a, b) => Object.entries(SC.used[id] || {}).filter(([d]) => d >= a && d <= b).reduce((s, [, h]) => s + h, 0);
  el.innerHTML = erpCP({ crumbs: [['Ажлын байр, ачаалал']], right: '<button class="btn" id="wcSched" title="Бүх идэвхтэй захиалгыг хүчин чадлаар дахин төлөвлөнө">↻ Дахин төлөвлөх</button>' }) + `<div class="mf-body">
    ${mfCard('Ачаалал — дараагийн 4 долоо хоног', `<div class="tblwrap"><table class="dt"><thead><tr><th>Ажлын байр</th><th class="r">Цаг/7 хоног</th>${wk.map(([a]) => `<th class="r">${a.slice(5)} ~</th>`).join('')}</tr></thead><tbody>${M.map(m => `<tr><td>${esc(m.name)}</td><td class="r num">${m.cap}</td>${wk.map(([a, b]) => { const h = load(m.id, a, b), p = +m.cap ? h / +m.cap * 100 : 0; return `<td class="r num lc" style="--p:${Math.min(100, p)}%;${p > 95 ? 'color:#b42318;font-weight:700' : ''}" title="${mfH(h)} цаг">${Math.round(p)}%</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`)}
    ${mfCard('Хуваарь — 21 ажлын өдөр', `<div class="mf-gantt" style="--n:${days.length}"><div class="h"></div>${days.map(d => `<div class="h${d === today() ? ' t' : ''}">${d.slice(8)}<small>${['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'][new Date(d + 'T00:00:00Z').getUTCDay()]}</small></div>`).join('')}
      ${M.map(m => `<div class="n">${esc(m.name)}</div>${days.map(d => { const b = (SC.bk[m.id] || {})[d] || [], h = b.reduce((a, x) => a + x.h, 0), cap = SC.capDay(m.id), p = h / cap; return `<div class="c${b.length ? ' on' : ''}${p > 1.001 ? ' over' : ''}" ${b.length ? `data-gmo="${b[0].id}" title="${esc(b.map(x => `${x.mo} · ${x.op} · ${mfH(x.h)} ц`).join('\n'))}"` : ''} style="--p:${Math.min(1, p)}">${b.length ? esc(b[0].mo.slice(-3)) : ''}</div>`; }).join('')}`).join('')}</div>
      <p class="note">Нүдэнд дарвал захиалга нээгдэнэ. Хүчин чадлыг доор засна; «Төлөвлөсөн» ба «Хийгдэж буй» захиалгууд ач холбогдол → хугацаагаар эрэмбэлэгдэж төлөвлөгдөнө.</p>`)}
    ${mfCard('Ажлын байрууд', `${edTable('wc', WC_COLS, M)}<p class="note">Цагийн өртөг нь захиалгын ажиллах хүчний өртөгт (төлөвлөгөө ба бодит) ордог. Гар ажлын өртөг: <input id="wcRate" type="number" class="mono" style="width:110px;text-align:right" value="${esc(S.mfRate || 25000)}"> ₮/цаг.</p>`)}</div>`;
  bindEd(el, { wc: { arr: machines, cols: WC_COLS, blank: () => ({ id: 'm' + uid(), name: '', cap: 48, rate: '' }), onDel: r => !mos().some(m => (m.ops || []).some(o => o.mach === r.id && o.st !== 'done')) || confirm('Энэ ажлын байранд дуусаагүй үйлдэл байна. Устгах уу?') } }, () => renderMfg());
  el.querySelector('#wcRate').addEventListener('change', e => { S.mfRate = +e.target.value || 0; save(); });
  el.querySelector('#wcSched').addEventListener('click', () => { renderMfg(); toast('Дахин төлөвлөлөө'); });
  el.querySelectorAll('[data-gmo]').forEach(c => c.addEventListener('click', () => mfGo('mo', c.dataset.gmo)));
}

/* ===== Чанарын шалгалт ===== */
function qcList(el) {
  const A = qcs(), F = { pend: q => !q.res, fail: q => q.res === 'fail', pass: q => q.res === 'pass' };
  const R = A.filter(q => (!MF.f || !F[MF.f] || F[MF.f](q)) && mfMatch(q, [q.no, qcT(q.type)[1], mfJobTxt(q.job), q.item, q.heat, (mos().find(m => m.id === q.mo) || {}).no || '']));
  mfListPage(el, { title: 'Чанарын шалгалт', ph: 'Хайх: QC дугаар, төрөл, ажил, MO, хайлалтын дугаар…', rows: R,
    right: `<select class="inp" id="qcNewT" style="width:auto"><option value="">+ Шинэ шалгалт…</option>${QC_T.map(t => `<option value="${t[0]}">${esc(t[1])}</option>`).join('')}</select><button class="btn" data-qlout="pdf">Бүртгэл PDF</button>`,
    chips: [['pend', 'Хүлээгдэж буй', A.filter(F.pend).length], ['fail', 'Тэнцээгүй', A.filter(F.fail).length], ['pass', 'Тэнцсэн', A.filter(F.pass).length]],
    cols: [['no', 'Дугаар', '', q => `<b class="mono">${esc(q.no)}</b>`], ['t', 'Төрөл', '', q => esc(qcT(q.type)[1])], ['d', 'Огноо', '', q => `<span class="num">${esc(q.date)}</span>`], ['j', 'Ажил / MO', '', q => esc([mfJobTxt(q.job), (mos().find(m => m.id === q.mo) || {}).no].filter(Boolean).join(' · ') || '—')],
      ['i', 'Эд анги', '', q => esc(q.item || '')], ['h', 'Хайлалт', '', q => `<span class="mono">${esc(q.heat || '')}</span>`], ['p', 'Шалгагч', '', q => esc(pName(q.insp) || '')], ['r', 'Дүн', '', q => { const s = stOf(QC_RES, q.res); return mfB(s[2], s[1]); }]],
    empty: 'Шалгалт бүртгэгдээгүй', emptyHint: ' Дээрээс төрлөө сонгож эхэлнэ, эсвэл үйлдвэрлэлийн захиалгын үйлдэл бүрээс «QC» товчоор нээнэ.' });
  el.querySelector('#qcNewT').addEventListener('change', e => { if (!e.target.value) return; const q = newQC({ type: e.target.value }); MF.sel = q.id; renderMfg(); });
  el.querySelectorAll('[data-qlout]').forEach(b => b.addEventListener('click', () => docOut(b.dataset.qlout, () => qcRegDoc(R), 'Чанарын_шалгалтын_бүртгэл')));
}
const QC_ROWCOLS = [{ k: 'ch', t: 'Шалгах үзүүлэлт' }, { k: 'nom', t: 'Шаардлага / нэрлэсэн', w: 130 }, { k: 'tol', t: 'Хүлцэл', w: 90 }, { k: 'act', t: 'Хэмжсэн / ажигласан', w: 140 }, { k: 'ok', t: 'Дүгнэлт', sel: [['', '—'], ['ok', '✓ Тохирсон'], ['ng', '✗ Тохироогүй'], ['na', 'Хамаарахгүй']] }];
function qcForm(el, q) {
  const mo = q.mo && mos().find(m => m.id === q.mo), g = q.gauge && gauges().find(x => x.id === q.gauge), gs = g ? gSt(g) : null, ng = (q.rows || []).filter(r => r.ok === 'ng').length, N = ncrs().filter(n => n.qc === q.id);
  const moOpts = [['', '—']].concat(mos().map(m => [m.id, `${m.no} · ${m.item || ''}`.slice(0, 70)])), opOpts = [['', '—']].concat((mo && mo.ops || []).map(o => [o.id, o.name]));
  const gOpts = [['', '— багаж сонгох —']].concat(gauges().filter(x => x.active !== false).map(x => [x.id, `${x.code || ''} ${x.name}${gSt(x)[0] === 'over' ? ' (тохируулга хэтэрсэн!)' : ''}`]));
  el.innerHTML = mfFormTop({ crumbs: [['Чанарын шалгалт'], [q.no]], right: `<button class="btn" data-qcout="pdf">Шалгалтын тайлан PDF</button><button class="btn ghost" data-qcout="print">🖨</button><button class="btn ghost" id="qcDel">Устгах</button>`,
    acts: `<button class="btn primary" data-qres="pass">✓ Тэнцсэн</button><button class="btn" data-qres="cond">Нөхцөлтэй</button><button class="btn" data-qres="fail">✗ Тэнцээгүй</button>${q.res === 'fail' || ng ? '<button class="btn" id="qcNCR">→ NCR нээх</button>' : ''}${mo ? `<button class="btn ghost" id="qcMO">← ${esc(mo.no)}</button>` : ''}`,
    stages: QC_RES.map(([k, n]) => `<button class="${(q.res || '') === k ? 'on' : ''}" data-qres="${k}">${esc(n)}</button>`).join('') }) + `<div class="mf-body">
    ${gs && gs[0] === 'over' ? `<div class="mf-warn"><b>Хэмжих багажийн тохируулгын хугацаа хэтэрсэн (ISO 9001 §7.1.5):</b> ${esc(g.code || '')} ${esc(g.name)} · дараагийн ${esc(gNext(g))}. Энэ багажаар хийсэн хэмжилт хүчингүй байж болно.</div>` : ''}
    ${ng && q.res !== 'fail' ? `<div class="mf-warn">${ng} үзүүлэлт тохироогүй байна — дүнг «Тэнцээгүй» эсвэл «Нөхцөлтэй» болгож, NCR нээнэ үү (§8.7).</div>` : ''}
    ${mfCard(esc(qcT(q.type)[1]), `<div class="jgrid">${mfSel('qc_type', QC_T.map(t => [t[0], t[1]]), q.type, 'Төрөл')}${fldIn('qc_date', 'Огноо', q.date, { type: 'date' })}${mfSel('qc_job', mfJobOpts(), q.job, 'Ажил', 'grow')}${mfSel('qc_mo', moOpts, q.mo, 'Үйлдвэрлэлийн захиалга')}${mfSel('qc_op', opOpts, q.op, 'Үйлдэл (хяналтын цэг)')}
      ${fldIn('qc_item', 'Эд анги / бүтээгдэхүүн', q.item, { cls: 'grow' })}${fldIn('qc_heat', 'Хайлалтын дугаар', q.heat, { list: 'dl-heat' })}${fldIn('qc_std', 'Хүлээн авах шалгуур / стандарт', q.std, { cls: 'grow' })}${mfSel('qc_insp', mfPeople(), q.insp, 'Шалгагч')}${mfSel('qc_gauge', gOpts, q.gauge, 'Хэмжих багаж')}</div>
      <datalist id="dl-heat">${(S.certs || []).map(c => `<option value="${esc(c.heat)}">${esc(c.mat)} ${c.thk}мм${c.cert ? ' · ' + esc(c.cert) : ''}</option>`).join('')}</datalist>`)}
    ${mfCard('Шалгалтын үр дүн', edTable('qcr', QC_ROWCOLS, q.rows || []), ng ? `<span class="erp-b s-late">${ng} тохироогүй</span>` : '')}
    ${mfCard('Дүгнэлт, тэмдэглэл', fldIn('qc_note', '', q.note, { area: 1, rows: 3 }))}
    ${N.length ? mfCard('Холбоотой NCR', `<div class="tblwrap"><table class="dt"><tbody>${N.map(n => `<tr class="rec" data-goncr="${n.id}"><td class="mono">${esc(n.no)}</td><td>${esc(n.desc.slice(0, 80))}</td><td>${mfB(stOf(NCR_ST, n.st)[2], stOf(NCR_ST, n.st)[1])}</td></tr>`).join('')}</tbody></table></div>`) : ''}
    ${mfCard('Түүх', mfLogHTML(q))}</div>`;
  const re = () => renderMfg();
  mfBind(el, q, [['qc_date', 'date'], ['qc_job', 'job'], ['qc_mo', 'mo'], ['qc_op', 'op'], ['qc_item', 'item'], ['qc_heat', 'heat'], ['qc_std', 'std'], ['qc_insp', 'insp'], ['qc_gauge', 'gauge'], ['qc_note', 'note']], k => { if (k === 'mo') { const m = mos().find(x => x.id === q.mo); if (m) { q.job = m.job; if (!q.item) q.item = m.item; } q.op = ''; save(); } if (['mo', 'gauge'].includes(k)) re(); });
  el.querySelector('#qc_type').addEventListener('change', e => { const t = qcT(e.target.value), empty = (q.rows || []).every(r => !r.act && !r.ok); q.type = t[0]; if (empty) { q.rows = t[3].map(ch => ({ ch, nom: '', tol: '', act: '', ok: '' })); q.std = t[2]; } save(); re(); });
  bindEd(el, { qcr: { arr: () => (q.rows = q.rows || []), cols: QC_ROWCOLS, blank: () => ({ ch: '', nom: '', tol: '', act: '', ok: '' }) } }, re);
  el.querySelectorAll('[data-qres]').forEach(b => b.addEventListener('click', () => {
    const r = b.dataset.qres; if (r === (q.res || '')) return;
    if (r === 'pass' && (q.rows || []).some(x => x.ok === 'ng') && !confirm('Тохироогүй үзүүлэлт байна. «Тэнцсэн» гэж тэмдэглэх үү?')) return;
    if (r === 'pass' && g && gSt(g)[0] === 'over' && !confirm('Хэмжих багажийн тохируулга хэтэрсэн байна. Тэнцсэн гэж тэмдэглэх үү?')) return;
    if (r && !q.insp) { toast('Шалгагчийг сонгоно уу'); return; }
    q.res = r; mfLog(q, `Дүн: ${stOf(QC_RES, r)[1]}`); const m = q.mo && mos().find(x => x.id === q.mo); if (m) mfLog(m, `${q.no}: ${stOf(QC_RES, r)[1]}`); save();
    if (r === 'fail' && !ncrs().some(n => n.qc === q.id) && confirm('Тэнцээгүй — үл тохирлын тайлан (NCR) нээх үү? (ISO 9001 §8.7)')) { const n = newNCR({ qc: q.id, mo: q.mo, job: q.job, item: q.item, heat: q.heat, desc: (q.rows || []).filter(x => x.ok === 'ng').map(x => `${x.ch}: ${x.act || ''} (шаардлага ${x.nom || '—'}${x.tol ? ' ' + x.tol : ''})`).join('\n'), src: q.type === 'VIR' ? 'sup' : 'int' }); mfGo('ncr', n.id); return; }
    re();
  }));
  const nb = el.querySelector('#qcNCR'); if (nb) nb.addEventListener('click', () => { const n = newNCR({ qc: q.id, mo: q.mo, job: q.job, item: q.item, heat: q.heat, desc: (q.rows || []).filter(x => x.ok === 'ng').map(x => `${x.ch}: ${x.act || ''} (шаардлага ${x.nom || '—'}${x.tol ? ' ' + x.tol : ''})`).join('\n'), src: q.type === 'VIR' ? 'sup' : 'int' }); mfGo('ncr', n.id); });
  const mb = el.querySelector('#qcMO'); if (mb) mb.addEventListener('click', () => mfGo('mo', q.mo));
  el.querySelectorAll('[data-goncr]').forEach(r => r.addEventListener('click', () => mfGo('ncr', r.dataset.goncr)));
  el.querySelectorAll('[data-qcout]').forEach(b => b.addEventListener('click', () => docOut(b.dataset.qcout, () => qcDoc(q), `${q.no}_шалгалт`)));
  el.querySelector('#qcDel').addEventListener('click', () => { if (q.res && !confirm('Дүгнэлт гарсан бүртгэл байна (ISO-ийн бүртгэл). Устгах уу?')) return; if (!q.res && !confirm(`${q.no}-г устгах уу?`)) return; S.qcs = qcs().filter(x => x !== q); MF.sel = null; save(); re(); });
  erpBindCrumbs(el, [['', () => { MF.sel = null; re(); }], ['']]);
}
async function qcDoc(q) {
  const mo = q.mo && mos().find(m => m.id === q.mo), j = q.job && findJob(q.job), g = q.gauge && gauges().find(x => x.id === q.gauge), op = mo && (mo.ops || []).find(o => o.id === q.op);
  const D = await kdoc({ title: 'ЧАНАРЫН ШАЛГАЛТЫН ТАЙЛАН', sub: `${q.no} · ${q.date}`, code: mfIso('formQC') });
  D.kv([['Шалгалтын төрөл', qcT(q.type)[1]], ['Огноо', q.date], ['Ажил', j ? `${j.no} · ${j.customer || ''}` : '—'], ['MO / үйлдэл', [mo && mo.no, op && op.name].filter(Boolean).join(' · ') || '—'], ['Эд анги', q.item || '—'], ['Хайлалтын дугаар', q.heat || '—'], ['Шалгуур / стандарт', q.std || '—'], ['Хэмжих багаж', g ? `${g.code || ''} ${g.name} · тохир. ${gNext(g) || '—'} хүртэл` : '—']], 2);
  D.h2('Үр дүн');
  D.table([{ t: '№', w: 8, m: 1 }, { t: 'Шалгах үзүүлэлт' }, { t: 'Шаардлага', w: 34 }, { t: 'Хүлцэл', w: 22 }, { t: 'Хэмжсэн / ажигласан', w: 38 }, { t: 'Дүгнэлт', w: 24, a: 'c' }], (q.rows || []).map((r, i) => ({ cells: [i + 1, r.ch, r.nom, r.tol, r.act, { ok: 'Тохирсон', ng: 'ТОХИРООГҮЙ', na: 'Х/А', '': '' }[r.ok || '']], fill: r.ok === 'ng' ? '#fef3f2' : '' })), { minRh: 7 });
  D.totals([['ДҮГНЭЛТ', stOf(QC_RES, q.res)[1].toUpperCase(), 1, q.res === 'fail' ? '#fef3f2' : q.res === 'pass' ? '#ecfdf3' : '']], { w: 90 });
  if (q.note) D.box('Тэмдэглэл', [q.note]);
  const N = ncrs().filter(n => n.qc === q.id); if (N.length) D.box('Үл тохирол', N.map(n => `${n.no} · ${stOf(NCR_ST, n.st)[1]} · ${n.desc}`));
  D.sigs(['Шалгасан', 'Чанарын хариуцсан', 'Захиалагч / гэрч'], { names: [pName(q.insp), '', ''] });
  return D;
}
async function qcRegDoc(R) {
  const D = await kdoc({ title: 'ЧАНАРЫН ШАЛГАЛТЫН БҮРТГЭЛ', sub: today(), code: mfIso('formQC'), landscape: true });
  D.table([{ t: 'Дугаар', w: 28, m: 1 }, { t: 'Огноо', w: 22, m: 1 }, { t: 'Төрөл', w: 52 }, { t: 'Ажил', w: 40 }, { t: 'MO', w: 28, m: 1 }, { t: 'Эд анги' }, { t: 'Хайлалт', w: 26, m: 1 }, { t: 'Шалгагч', w: 30 }, { t: 'Дүн', w: 24 }], R.map(q => [q.no, q.date, qcT(q.type)[1], mfJobTxt(q.job), (mos().find(m => m.id === q.mo) || {}).no || '', q.item, q.heat, pName(q.insp), stOf(QC_RES, q.res)[1]]));
  return D;
}

/* ===== NCR — үл тохирол, залруулах арга хэмжээ ===== */
function ncrList(el) {
  const A = ncrs(), F = { open: n => n.st !== 'closed', late: n => n.st !== 'closed' && n.caDue && n.caDue < today(), closed: n => n.st === 'closed' };
  const R = A.filter(n => (!MF.f || !F[MF.f] || F[MF.f](n)) && mfMatch(n, [n.no, n.desc, n.item, n.heat, mfJobTxt(n.job), n.cause, n.ca]));
  const cost = R.reduce((a, n) => a + (+n.cost || 0), 0);
  const by6 = NCR_6M.map(c => [c, A.filter(n => n.cause6 === c).length]).filter(x => x[1]);
  mfListPage(el, { title: 'Үл тохирол (NCR)', ph: 'Хайх: NCR дугаар, тайлбар, ажил, хайлалт…', rows: R,
    right: '<button class="btn primary" id="ncrNew">+ NCR нээх</button><button class="btn" data-nlout="pdf">Бүртгэл PDF</button>',
    chips: [['open', 'Нээлттэй', A.filter(F.open).length], ['late', 'Хугацаа хэтэрсэн', A.filter(F.late).length], ['closed', 'Хаагдсан', A.filter(F.closed).length]],
    top: by6.length ? `<div class="mf-6m"><b>Шалтгааны ангилал (6M):</b>${by6.map(([c, n]) => `<span>${esc(c)} <b class="mono">${n}</b></span>`).join('')}<span class="sp"></span><span>Үл тохирлын зардал: <b class="mono">${money(cost)} ₮</b></span></div>` : '',
    cols: [['no', 'Дугаар', '', n => `<b class="mono">${esc(n.no)}</b>`], ['d', 'Огноо', '', n => `<span class="num">${esc(n.date)}</span>`], ['s', 'Эх үүсвэр', '', n => esc((NCR_SRC.find(s => s[0] === n.src) || [, ''])[1])], ['j', 'Ажил', '', n => esc(mfJobTxt(n.job) || '—')],
      ['x', 'Тайлбар', '', n => esc(String(n.desc || '').slice(0, 70))], ['p', 'Шийдвэр', '', n => esc((NCR_DISP.find(d => d[0] === n.disp && d[0]) || [, ''])[1])], ['due', 'ЗАХ хугацаа', '', n => `<span class="num${n.st !== 'closed' && n.caDue && n.caDue < today() ? ' late' : ''}">${esc(n.caDue || '')}</span>`],
      ['st', 'Төлөв', '', n => { const s = stOf(NCR_ST, n.st); return mfB(s[2], s[1]); }]],
    empty: 'NCR бүртгэгдээгүй', emptyHint: ' Тэнцээгүй шалгалтаас автоматаар, эсвэл «+ NCR нээх» товчоор нээнэ.' });
  el.querySelector('#ncrNew').addEventListener('click', () => { const n = newNCR({}); MF.sel = n.id; renderMfg(); });
  el.querySelectorAll('[data-nlout]').forEach(b => b.addEventListener('click', () => docOut(b.dataset.nlout, () => ncrRegDoc(R), 'NCR_бүртгэл')));
}
function ncrNext(n) { if (n.st === 'open') return n.disp && n.dispBy ? null : 'Шийдвэр (disposition) ба шийдвэр гаргасан хүнийг сонгоно уу'; if (n.st === 'disp') return n.cause6 && String(n.cause).trim() && String(n.ca).trim() && n.caOwner ? null : 'Үндсэн шалтгаан (6M + тайлбар), залруулах арга хэмжээ, хариуцагчийг бөглөнө үү'; if (n.st === 'ca') return String(n.verify).trim() && n.verBy ? null : 'Үр нөлөөг шалгасан тэмдэглэл ба шалгасан хүнийг бөглөнө үү'; return null; }
function ncrForm(el, n) {
  const ci = NCR_ST.findIndex(s => s[0] === n.st), nx = NCR_ST[ci + 1], qc = n.qc && qcs().find(x => x.id === n.qc), mo = n.mo && mos().find(m => m.id === n.mo), why = ncrNext(n);
  el.innerHTML = mfFormTop({ crumbs: [['Үл тохирол (NCR)'], [n.no]], right: `<button class="btn" data-ncout="pdf">NCR PDF</button><button class="btn ghost" data-ncout="print">🖨</button><button class="btn ghost" id="ncDel">Устгах</button>`,
    acts: `${nx ? `<button class="btn primary" id="ncNext"${why ? ` title="${esc(why)}"` : ''}>→ ${esc(nx[1])}</button>` : '<button class="btn" id="ncReopen">Дахин нээх</button>'}${qc ? `<button class="btn ghost" data-goqc="${qc.id}">← ${esc(qc.no)}</button>` : ''}${mo ? `<button class="btn ghost" data-gomo="${mo.id}">← ${esc(mo.no)}</button>` : ''}${n.disp === 'rework' || n.disp === 'repair' ? `<button class="btn" id="ncReQC">+ Дахин шалгалт</button>` : ''}`,
    stages: NCR_ST.map(([k, t], i) => `<button class="${k === n.st ? 'on' : i < ci ? 'past' : ''}">${esc(t)}</button>`).join('') }) + `<div class="mf-body">
    ${why && nx ? `<div class="mf-info">Дараагийн шат руу шилжихийн тулд: ${esc(why)}.</div>` : ''}
    ${mfCard('1. Үл тохирлын тодорхойлолт', `<div class="jgrid">${fldIn('nc_date', 'Огноо', n.date, { type: 'date' })}${mfSel('nc_src', NCR_SRC, n.src, 'Эх үүсвэр')}${mfSel('nc_job', mfJobOpts(), n.job, 'Ажил', 'grow')}${fldIn('nc_item', 'Эд анги / материал', n.item, { cls: 'grow' })}${fldIn('nc_heat', 'Хайлалтын дугаар', n.heat, { list: 'dl-heat' })}${n.src === 'sup' ? fldIn('nc_sup', 'Нийлүүлэгч', n.sup || '', { list: 'dl-ncsup' }) : ''}${fldIn('nc_qty', 'Тоо хэмжээ', n.qty)}${mfSel('nc_by', mfPeople(), n.by, 'Илрүүлсэн')}</div>
      ${fldIn('nc_desc', 'Юу шаардлага хангаагүй вэ (шаардлага ↔ бодит байдал)', n.desc, { area: 1, rows: 3 })}<datalist id="dl-heat">${(S.certs || []).map(c => `<option value="${esc(c.heat)}">`).join('')}</datalist><datalist id="dl-ncsup">${orgs().map(o => `<option value="${esc(o.name)}">`).join('')}</datalist>`)}
    ${mfCard('2. Шийдвэр (disposition) — ISO 9001 §8.7', `<div class="jgrid">${mfSel('nc_disp', NCR_DISP, n.disp, 'Шийдвэр', 'grow')}${mfSel('nc_dispBy', mfPeople(), n.dispBy, 'Шийдвэр гаргасан')}${fldIn('nc_cost', 'Үл тохирлын зардал, ₮', n.cost, { num: 1 })}</div>${fldIn('nc_dispNote', 'Тайлбар (захиалагчийн зөвшөөрөл, засварын арга…)', n.dispNote, { area: 1, rows: 2 })}`)}
    ${mfCard('3. Үндсэн шалтгаан ба залруулах арга хэмжээ — §10.2', `<div class="jgrid">${mfSel('nc_cause6', [['', '— 6M ангилал —']].concat(NCR_6M.map(c => [c, c])), n.cause6, 'Шалтгааны ангилал')}${mfSel('nc_caOwner', mfPeople(), n.caOwner, 'Хариуцагч')}${fldIn('nc_caDue', 'Хэрэгжүүлэх хугацаа', n.caDue, { type: 'date' })}</div>
      ${fldIn('nc_cause', 'Үндсэн шалтгаан (5 яагаад)', n.cause, { area: 1, rows: 3 })}${fldIn('nc_ca', 'Залруулах арга хэмжээ (дахин гаргахгүйн тулд)', n.ca, { area: 1, rows: 3 })}
      <div class="addrow"><button class="btn sm" id="ncTask"${n.ca ? '' : ' disabled'}>→ Даалгавар болгох</button><span class="note">Залруулах арга хэмжээг хариуцагчид даалгавар болгон илгээнэ.</span></div>`)}
    ${mfCard('4. Үр нөлөөг шалгах, хаах', `<div class="jgrid">${mfSel('nc_verBy', mfPeople(), n.verBy, 'Шалгасан')}${fldIn('nc_verDate', 'Огноо', n.verDate, { type: 'date' })}</div>${fldIn('nc_verify', 'Арга хэмжээ үр дүнтэй болсон эсэх', n.verify, { area: 1, rows: 2 })}`)}
    ${mfCard('Түүх', mfLogHTML(n))}</div>`;
  const re = () => renderMfg();
  mfBind(el, n, [['nc_date', 'date'], ['nc_src', 'src'], ['nc_job', 'job'], ['nc_item', 'item'], ['nc_heat', 'heat'], ['nc_qty', 'qty'], ['nc_sup', 'sup'], ['nc_by', 'by'], ['nc_desc', 'desc'], ['nc_disp', 'disp'], ['nc_dispBy', 'dispBy'], ['nc_cost', 'cost', 1], ['nc_dispNote', 'dispNote'], ['nc_cause6', 'cause6'], ['nc_caOwner', 'caOwner'], ['nc_caDue', 'caDue'], ['nc_cause', 'cause'], ['nc_ca', 'ca'], ['nc_verBy', 'verBy'], ['nc_verDate', 'verDate'], ['nc_verify', 'verify']], k => { if (k === 'heat' && n.src === 'sup' && !n.sup) { const c = (S.certs || []).find(x => lc(x.heat) === lc(n.heat)); if (c && c.sup) { n.sup = c.sup; save(); re(); } } if (['disp', 'dispBy', 'cause6', 'caOwner', 'verBy', 'ca', 'src'].includes(k)) re(); });
  const nb = el.querySelector('#ncNext'); if (nb) nb.addEventListener('click', () => { const w = ncrNext(n); if (w) { toast(w); return; } mfLog(n, `${stOf(NCR_ST, n.st)[1]} → ${nx[1]}`); n.st = nx[0]; if (n.st === 'closed' && !n.verDate) n.verDate = today(); save(); re(); });
  const ro = el.querySelector('#ncReopen'); if (ro) ro.addEventListener('click', () => { n.st = 'ca'; mfLog(n, 'Дахин нээсэн'); save(); re(); });
  const rq = el.querySelector('#ncReQC'); if (rq) rq.addEventListener('click', () => { const old = qc; const q = newQC({ type: old ? old.type : 'DIM', mo: n.mo, op: old ? old.op : '', job: n.job, item: n.item, heat: n.heat, note: `${n.no}-ийн дараах дахин шалгалт` }); mfLog(n, `Дахин шалгалт ${q.no}`); save(); mfGo('qc', q.id); });
  const tk = el.querySelector('#ncTask'); if (tk) tk.addEventListener('click', () => { if (typeof newTask !== 'function') return; newTask({ title: `${n.no}: залруулах арга хэмжээ`, desc: n.ca, type: 'internal', assignee: n.caOwner || '', due: n.caDue || '', jobId: n.job || '' }); mfLog(n, 'Даалгавар үүсгэсэн'); save(); toast('Даалгавар үүслээ'); re(); });
  el.querySelectorAll('[data-goqc]').forEach(b => b.addEventListener('click', () => mfGo('qc', b.dataset.goqc)));
  el.querySelectorAll('[data-gomo]').forEach(b => b.addEventListener('click', () => mfGo('mo', b.dataset.gomo)));
  el.querySelectorAll('[data-ncout]').forEach(b => b.addEventListener('click', () => docOut(b.dataset.ncout, () => ncrDoc(n), `${n.no}`)));
  el.querySelector('#ncDel').addEventListener('click', () => { if (!confirm(`${n.no}-г устгах уу? (ISO-ийн бүртгэлийг хадгалах нь зүйтэй)`)) return; S.ncrs = ncrs().filter(x => x !== n); MF.sel = null; save(); re(); });
  erpBindCrumbs(el, [['', () => { MF.sel = null; re(); }], ['']]);
}
async function ncrDoc(n) {
  const j = n.job && findJob(n.job), mo = n.mo && mos().find(m => m.id === n.mo), qc = n.qc && qcs().find(x => x.id === n.qc);
  const D = await kdoc({ title: 'ҮЛ ТОХИРЛЫН ТАЙЛАН (NCR)', sub: `${n.no} · ${n.date}`, code: mfIso('formNCR') });
  D.kv([['NCR дугаар', n.no], ['Төлөв', stOf(NCR_ST, n.st)[1]], ['Эх үүсвэр', (NCR_SRC.find(s => s[0] === n.src) || [, ''])[1]], ['Ажил', j ? `${j.no} · ${j.customer || ''}` : '—'], ['MO / шалгалт', [mo && mo.no, qc && qc.no].filter(Boolean).join(' · ') || '—'], ['Эд анги', n.item || '—'], ['Хайлалтын дугаар', n.heat || '—'], ['Тоо хэмжээ', n.qty || '—'], ['Илрүүлсэн', pName(n.by) || '—'], ['Зардал', n.cost ? money(n.cost) + ' ₮' : '—']], 2);
  D.box('1. Үл тохирлын тодорхойлолт', [n.desc || '—']);
  D.box('2. Шийдвэр (ISO 9001 §8.7)', [`${(NCR_DISP.find(d => d[0] === n.disp && d[0]) || [, '—'])[1]} · шийдвэр гаргасан: ${pName(n.dispBy) || '—'}`, n.dispNote || '']);
  D.box('3. Үндсэн шалтгаан (§10.2)', [`Ангилал: ${n.cause6 || '—'}`, n.cause || '—']);
  D.box('Залруулах арга хэмжээ', [n.ca || '—', `Хариуцагч: ${pName(n.caOwner) || '—'} · хугацаа: ${n.caDue || '—'}`]);
  D.box('4. Үр нөлөөг шалгасан', [n.verify || '—', `Шалгасан: ${pName(n.verBy) || '—'} · ${n.verDate || ''}`]);
  D.sigs(['Илрүүлсэн', 'Шийдвэр гаргасан', 'Чанарын хариуцсан (хаасан)'], { names: [pName(n.by), pName(n.dispBy), pName(n.verBy)] });
  return D;
}
async function ncrRegDoc(R) {
  const D = await kdoc({ title: 'ҮЛ ТОХИРЛЫН БҮРТГЭЛ', sub: today(), code: mfIso('formNCR'), landscape: true });
  D.table([{ t: 'Дугаар', w: 28, m: 1 }, { t: 'Огноо', w: 22, m: 1 }, { t: 'Ажил', w: 34 }, { t: 'Тайлбар' }, { t: 'Шийдвэр', w: 38 }, { t: 'Шалтгаан', w: 26 }, { t: 'Хариуцагч', w: 28 }, { t: 'Хугацаа', w: 22, m: 1 }, { t: 'Төлөв', w: 28 }], R.map(n => [n.no, n.date, mfJobTxt(n.job), n.desc, (NCR_DISP.find(d => d[0] === n.disp && d[0]) || [, ''])[1], n.cause6, pName(n.caOwner), n.caDue, stOf(NCR_ST, n.st)[1]]));
  return D;
}

/* ===== Хэмжих багаж — тохируулга (§7.1.5) ===== */
const G_COLS = [{ k: 'code', t: 'Код', w: 80 }, { k: 'name', t: 'Багаж', ph: 'Штангенциркуль 0–300' }, { k: 'serial', t: 'Сериал №', w: 100 }, { k: 'range', t: 'Хэмжих хязгаар / нарийвчлал', w: 150 }, { k: 'loc', t: 'Байршил / эзэмшигч', w: 120 }, { k: 'last', t: 'Сүүлд тохируулсан', date: 1, w: 130 }, { k: 'months', t: 'Давтамж, сар', num: 1, w: 80 }, { k: 'cert', t: 'Гэрчилгээ №', w: 110 },
  { k: 'next', t: 'Дараагийн', calc: g => `<span class="${gSt(g)[0] === 'over' ? 'late' : ''}">${esc(gNext(g))}</span>` }, { k: 'st', t: 'Төлөв', calc: g => { const s = gSt(g); return mfB(s[2], s[1]); } }];
function gaugePage(el) {
  const G = gauges(), over = G.filter(g => gSt(g)[0] === 'over').length, soon = G.filter(g => gSt(g)[0] === 'soon').length;
  el.innerHTML = erpCP({ crumbs: [['Хэмжих багаж — тохируулга']], right: '<button class="btn" data-gout="pdf">Бүртгэл PDF</button><button class="btn ghost" data-gout="print">🖨</button>' }) + `<div class="mf-body">
    ${over ? `<div class="mf-warn"><b>${over} багажийн тохируулгын хугацаа хэтэрсэн.</b> Эдгээрийг ашиглалтаас гаргаж, тохируулга хийлгэнэ үү (ISO 9001 §7.1.5.2).</div>` : soon ? `<div class="mf-info">${soon} багажийн тохируулга 30 хоногт дуусна.</div>` : ''}
    ${mfCard('Хэмжих, хяналтын багажийн бүртгэл', `${edTable('gg', G_COLS, G)}${G.length ? '' : '<p class="note">Жишээ: штангенциркуль, микрометр, гагнуурын калибр, DFT хэмжигч, хатуулаг хэмжигч, рулет, түвшин, момент түлхүүр, UT/MT багаж.</p>'}`)}
    ${mfCard('ISO маягтын код', `<div class="jgrid">${[['formMO', 'Маршрутын карт'], ['formQC', 'Шалгалтын тайлан'], ['formNCR', 'NCR'], ['formTrace', 'Мөшгөлтийн тайлан'], ['formGauge', 'Багажийн бүртгэл'], ['formPO', 'Худалдан авалтын захиалга'], ['formSup', 'Нийлүүлэгчийн үнэлгээ']].map(([k, l]) => fldIn('iso2_' + k, l, mfIso(k))).join('')}</div><p class="note">PDF баримт бүрийн доод буланд хэвлэгдэнэ.</p>`)}</div>`;
  bindEd(el, { gg: { arr: gauges, cols: G_COLS, blank: () => ({ id: uid(), code: 'G-' + String(gauges().length + 1).padStart(3, '0'), name: '', serial: '', range: '', loc: '', last: today(), months: 12, cert: '', active: true }) } }, () => renderMfg());
  ['formMO', 'formQC', 'formNCR', 'formTrace', 'formGauge', 'formPO', 'formSup'].forEach(k => { const f = el.querySelector('#iso2_' + k); if (f) f.addEventListener('change', () => { S.iso = S.iso || {}; S.iso[k] = f.value.trim(); save(); }); });
  el.querySelectorAll('[data-gout]').forEach(b => b.addEventListener('click', () => docOut(b.dataset.gout, async () => { const D = await kdoc({ title: 'ХЭМЖИХ БАГАЖИЙН ТОХИРУУЛГЫН БҮРТГЭЛ', sub: today(), code: mfIso('formGauge'), landscape: true }); D.table([{ t: 'Код', w: 20, m: 1 }, { t: 'Багаж' }, { t: 'Сериал', w: 26, m: 1 }, { t: 'Хязгаар', w: 34 }, { t: 'Байршил', w: 30 }, { t: 'Тохируулсан', w: 24, m: 1 }, { t: 'Сар', w: 12, a: 'r', m: 1 }, { t: 'Дараагийн', w: 24, m: 1 }, { t: 'Гэрчилгээ', w: 26 }, { t: 'Төлөв', w: 30 }], gauges().map(g => ({ cells: [g.code, g.name, g.serial, g.range, g.loc, g.last, g.months, gNext(g), g.cert, gSt(g)[1]], fill: gSt(g)[0] === 'over' ? '#fef3f2' : '' }))); D.sigs(['Бүртгэсэн', 'Чанарын хариуцсан']); return D; }, 'Багажийн_тохируулга')));
}

/* ===== Мөшгөлт — хайлалтын дугаар ↔ ажил ↔ MO ↔ шалгалт ↔ хүргэлт (§8.5.2) ===== */
function traceFind(q) {
  q = lc(String(q || '').trim()); if (!q) return null; const has = v => lc(v || '').includes(q);
  const C = (S.certs || []).filter(c => has(c.heat) || has(c.cert)), heats = new Set(C.map(c => lc(c.heat)));
  const J = (S.jobs || []).filter(j => has(j.no) || has(j.customer) && q.length > 3);
  const jobIds = new Set(J.map(j => j.id));
  const hHit = h => h && (heats.has(lc(h)) || has(h));
  const MO = mos().filter(m => has(m.no) || jobIds.has(m.job) || (m.mats || []).some(x => hHit(x.heat)));
  MO.forEach(m => { if (m.job) jobIds.add(m.job); (m.mats || []).forEach(x => { if (x.heat) heats.add(lc(x.heat)); }); });
  const NT = []; (S.jobs || []).forEach(j => (j.trace || []).forEach(t => { if (hHit(t.heat) || jobIds.has(j.id)) { NT.push({ j, t }); if (t.heat) heats.add(lc(t.heat)); jobIds.add(j.id); } }));
  const C2 = (S.certs || []).filter(c => heats.has(lc(c.heat)));
  const moIds = new Set(MO.map(m => m.id));
  const QC = qcs().filter(x => hHit(x.heat) || heats.has(lc(x.heat)) || moIds.has(x.mo) || jobIds.has(x.job) || has(x.no));
  const NC = ncrs().filter(x => hHit(x.heat) || heats.has(lc(x.heat)) || moIds.has(x.mo) || jobIds.has(x.job) || has(x.no));
  const MV = stkMoves().filter(m => (m.heat && heats.has(lc(m.heat))) || jobIds.has(m.job) || moIds.has(m.mo));
  const JOBS = [...jobIds].map(findJob).filter(Boolean);
  return { C: C2, J: JOBS, MO, NT, QC, NC, MV };
}
function tracePage(el) {
  const R = traceFind(MF.tq), sec = (t, n, body) => mfCard(`${t} <span class="mono muted">${n}</span>`, n ? body : '<p class="note">—</p>');
  const tbl = (h, rows) => `<div class="tblwrap"><table class="dt"><thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  el.innerHTML = erpCP({ crumbs: [['Мөшгөлт']], right: R ? '<button class="btn" data-tout="pdf">Мөшгөлтийн тайлан PDF</button><button class="btn ghost" data-tout="print">🖨</button>' : '',
    row2: `<div class="erp-search" style="flex:1">${erpIcon('search').replace('<svg', '<svg width="16" height="16" style="color:var(--ink-3);flex:none"')}<input id="trQ" placeholder="Хайлалтын дугаар, гэрчилгээ, ажлын дугаар (KH-…), MO-…, захиалагч" value="${esc(MF.tq || '')}" list="dl-trq"></div><datalist id="dl-trq">${(S.certs || []).slice(0, 200).map(c => `<option value="${esc(c.heat)}">${esc(c.mat)} ${c.thk}мм</option>`).join('')}</datalist>` }) +
    `<div class="mf-body">${!R ? `<div class="erp-empty"><b>Мөшгөлт</b>Хайлалтын дугаараар хайвал тэр хавтан аль ажил, үйлдвэрлэлийн захиалга, шалгалт, NCR, хүргэлтэд орсныг; ажлын дугаараар хайвал тэр ажилд ямар хайлалтын материал орсныг харуулна (ISO 9001 §8.5.2).</div>` :
      sec('Материалын гэрчилгээ', R.C.length, tbl(['Хайлалт', 'Гэрчилгээ', 'Марк', 'Зузаан', 'Нийлүүлэгч', 'Огноо', 'Тоо / ашигласан'], R.C.map(c => `<tr><td class="mono"><b>${esc(c.heat)}</b></td><td>${esc(c.cert || '')}</td><td>${esc(c.mat)}</td><td class="num">${c.thk} мм</td><td>${esc(c.sup || '')}</td><td class="num">${esc(c.date || '')}</td><td class="num">${c.qty} / ${c.used || 0}</td></tr>`))) +
      sec('Ажил', R.J.length, tbl(['Дугаар', 'Захиалагч', 'Ажил', 'Төлөв', 'Хүргэлт'], R.J.map(j => `<tr class="rec" data-goj="${j.id}"><td class="mono"><b>${esc(j.no)}</b></td><td>${esc(j.customer || '')}</td><td>${esc(j.title || '')}</td><td>${esc((JST.find(s => s[0] === j.status) || [, ''])[1])}</td><td>${j.dock && j.dock.issued ? 'Packing list ' + esc(j.dock.no || '') + ' ' + esc(j.dock.date || '') : '—'}</td></tr>`))) +
      sec('Үйлдвэрлэлийн захиалга', R.MO.length, tbl(['MO', 'Ажил', 'Бүтээгдэхүүн', 'Материал (хайлалт)', 'Төлөв'], R.MO.map(m => `<tr class="rec" data-gomo="${m.id}"><td class="mono"><b>${esc(m.no)}</b></td><td>${esc(mfJobTxt(m.job))}</td><td>${esc(m.item || '')}</td><td class="mono">${esc((m.mats || []).map(x => x.heat).filter(Boolean).join(', '))}</td><td>${mfB(stOf(MO_ST, m.status)[2], stOf(MO_ST, m.status)[1])}</td></tr>`))) +
      sec('Лазер зүсэлтийн бүртгэл (өрөлт)', R.NT.length, tbl(['Огноо', 'Ажил', 'Лист', 'Хэмжээ', 'Материал', 'Ширхэг', 'Хайлалт'], R.NT.map(({ j, t }) => `<tr><td class="num">${esc(t.date)}</td><td class="mono">${esc(j.no)}</td><td>${esc(t.lay)}</td><td class="num">${esc(t.size)}</td><td>${esc(t.mat)} ${t.thk}мм</td><td class="num">${t.count}</td><td class="mono">${esc(t.heat || '')}</td></tr>`))) +
      sec('Агуулахын хөдөлгөөн', R.MV.length, tbl(['Огноо', 'Бараа', 'Төрөл', 'Тоо', 'Ажил', 'Тэмдэглэл'], R.MV.slice(0, 80).map(m => `<tr><td class="num">${esc(m.date)}</td><td>${esc(stkName(stkFind(m.item)))}</td><td>${{ in: 'Орлого', out: 'Зарлага', adj: 'Тооллого' }[m.type] || ''}</td><td class="num">${m.qty}</td><td class="mono">${esc(m.jobNo || '')}</td><td>${esc(m.note || '')}</td></tr>`))) +
      sec('Чанарын шалгалт', R.QC.length, tbl(['Дугаар', 'Төрөл', 'Огноо', 'Хайлалт', 'Дүн'], R.QC.map(q => `<tr class="rec" data-goqc="${q.id}"><td class="mono"><b>${esc(q.no)}</b></td><td>${esc(qcT(q.type)[1])}</td><td class="num">${esc(q.date)}</td><td class="mono">${esc(q.heat || '')}</td><td>${mfB(stOf(QC_RES, q.res)[2], stOf(QC_RES, q.res)[1])}</td></tr>`))) +
      sec('Үл тохирол', R.NC.length, tbl(['Дугаар', 'Огноо', 'Тайлбар', 'Төлөв'], R.NC.map(n => `<tr class="rec" data-goncr="${n.id}"><td class="mono"><b>${esc(n.no)}</b></td><td class="num">${esc(n.date)}</td><td>${esc(String(n.desc || '').slice(0, 90))}</td><td>${mfB(stOf(NCR_ST, n.st)[2], stOf(NCR_ST, n.st)[1])}</td></tr>`)))}</div>`;
  const qi = el.querySelector('#trQ'); let tm; qi.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { MF.tq = qi.value; renderMfg(); const n = $('#trQ'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 350); });
  el.querySelectorAll('[data-gomo]').forEach(r => r.addEventListener('click', () => mfGo('mo', r.dataset.gomo)));
  el.querySelectorAll('[data-goqc]').forEach(r => r.addEventListener('click', () => mfGo('qc', r.dataset.goqc)));
  el.querySelectorAll('[data-goncr]').forEach(r => r.addEventListener('click', () => mfGo('ncr', r.dataset.goncr)));
  el.querySelectorAll('[data-goj]').forEach(r => r.addEventListener('click', () => { if (typeof erpGo === 'function' && erpOn()) erpGo('jobs'); else setModule('jobs'); J.sel = r.dataset.goj; J.sub = 'main'; renderJobs(); }));
  el.querySelectorAll('[data-tout]').forEach(b => b.addEventListener('click', () => docOut(b.dataset.tout, () => traceDoc(MF.tq, R), `Мөшгөлт_${MF.tq}`)));
}
async function traceDoc(q, R) {
  const D = await kdoc({ title: 'МӨШГӨЛТИЙН ТАЙЛАН', sub: `«${q}» · ${today()}`, code: mfIso('formTrace'), landscape: true });
  D.para(`Хайлт: «${q}». ISO 9001:2015 §8.5.2 — гаралтыг таних, мөшгөх. Материалын гэрчилгээнээс ажил, үйлдвэрлэлийн захиалга, шалгалт, хүргэлт хүртэлх холбоо.`, { size: 2.8 });
  if (R.C.length) { D.h2('Материалын гэрчилгээ'); D.table([{ t: 'Хайлалт', w: 34, m: 1 }, { t: 'Гэрчилгээ', w: 40 }, { t: 'Марк', w: 30 }, { t: 'Зузаан', w: 18, a: 'r' }, { t: 'Нийлүүлэгч' }, { t: 'Огноо', w: 24, m: 1 }, { t: 'Тоо/ашигл.', w: 22, a: 'r' }], R.C.map(c => [c.heat, c.cert, c.mat, c.thk + ' мм', c.sup, c.date, `${c.qty}/${c.used || 0}`])); }
  if (R.J.length) { D.h2('Ажил ба хүргэлт'); D.table([{ t: 'Ажил', w: 34, m: 1 }, { t: 'Захиалагч', w: 50 }, { t: 'Ажлын нэр' }, { t: 'Хүргэлт', w: 60 }], R.J.map(j => [j.no, j.customer, j.title, j.dock && j.dock.issued ? `Packing list ${j.dock.no || ''} ${j.dock.date || ''}` : '—'])); }
  if (R.MO.length) { D.h2('Үйлдвэрлэлийн захиалга'); D.table([{ t: 'MO', w: 30, m: 1 }, { t: 'Ажил', w: 40 }, { t: 'Бүтээгдэхүүн' }, { t: 'Хайлалт', w: 60, m: 1 }, { t: 'Төлөв', w: 34 }], R.MO.map(m => [m.no, mfJobTxt(m.job), m.item, (m.mats || []).map(x => x.heat).filter(Boolean).join(', '), stOf(MO_ST, m.status)[1]])); }
  if (R.NT.length) { D.h2('Лазер зүсэлт'); D.table([{ t: 'Огноо', w: 22, m: 1 }, { t: 'Ажил', w: 30, m: 1 }, { t: 'Лист' }, { t: 'Хэмжээ', w: 28, m: 1 }, { t: 'Материал', w: 36 }, { t: 'Ширхэг', w: 16, a: 'r' }, { t: 'Хайлалт', w: 34, m: 1 }], R.NT.map(({ j, t }) => [t.date, j.no, t.lay, t.size, `${t.mat} ${t.thk}мм`, t.count, t.heat])); }
  if (R.QC.length) { D.h2('Чанарын шалгалт'); D.table([{ t: 'Дугаар', w: 28, m: 1 }, { t: 'Төрөл' }, { t: 'Огноо', w: 22, m: 1 }, { t: 'Хайлалт', w: 34, m: 1 }, { t: 'Дүн', w: 26 }], R.QC.map(x => [x.no, qcT(x.type)[1], x.date, x.heat, stOf(QC_RES, x.res)[1]])); }
  if (R.NC.length) { D.h2('Үл тохирол'); D.table([{ t: 'Дугаар', w: 28, m: 1 }, { t: 'Огноо', w: 22, m: 1 }, { t: 'Тайлбар' }, { t: 'Төлөв', w: 34 }], R.NC.map(n => [n.no, n.date, n.desc, stOf(NCR_ST, n.st)[1]])); }
  D.sigs(['Бэлтгэсэн', 'Чанарын хариуцсан']);
  return D;
}

/* module switch */
{ const _smM = setModule; setModule = function (v) { _smM(v); const on = v === 'mfg', sd = $('#mfgSide'), mn = $('#mfgMain'); if (sd) sd.hidden = !on; if (mn) mn.hidden = !on; if (on) renderMfg(); }; }
/* a running operation shows its live hours */
setInterval(() => { const mn = $('#mfgMain'); if (mn && !mn.hidden && MF.tab === 'mo' && MF.sel) { const mo = mos().find(m => m.id === MF.sel); if (mo && (mo.ops || []).some(o => o.st === 'run')) mn.querySelectorAll('[data-opact]').forEach(f => { const o = mo.ops[+f.dataset.opact]; if (o && o.st === 'run') f.value = mfH(opActH(o)); }); } }, 30000);
