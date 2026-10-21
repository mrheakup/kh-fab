/* ================= Kh International — job scope, detailed quotation, progress & expenses, acceptance =================
   Built on the company's «Ажлын scope» workbook: 1. Мэдээлэл & хуваарь, 2. Зардал & хүчин, 3. Эрсдэл & тоног, 4. Акт & өөрчлөлт. */
const COST_DEF = { rate: 22000, rateK: 1.2, equipPct: 5, scrapPct: 5, vat: 10, margin: 15 };
const DEF_STAGES = [['Бэлтгэл ажил', 1, 3, 2, 8], ['Таслалт / Лазер зүсэлт', 2, 4, 1, 8], ['Угсралтын ажил', 3, 8, 3, 8], ['Гагнуурын ажил', 7, 6, 2, 8], ['Чанарын шалгалт (QC/NDT)', 11, 2, 1, 4], ['Цэвэрлэгээ будаг & Хүлээлгэж өгөлт', 13, 2, 2, 8]];
const DEF_RISKS = [['Материал дутагдах', 'Нийлүүлэгч хоцрох', 2, 2, 'Нөөц материал урьдчилан захиалах', 'Менежер'], ['Гагнуурын гэмтэл', 'Чанаргүй гагнуур', 2, 3, 'NDT шалгалт, мэргэшсэн гагнуурч', 'QC'], ['Лазер машины эвдрэл', 'Техник доголдол', 2, 3, 'Урьдчилан засвар, нөөц lens', 'Техникч'], ['Ажилчдын осол', 'Аюулгүй байдлын зөрчил', 1, 3, 'PPE хэрэглэх, briefing', 'Хяналтын ахлах'], ['Хуваарийн хоцрогдол', 'Нэмэлт ажил', 2, 2, 'Буфер хоног нэмэх', 'Менежер'], ['Scope өөрчлөгдөх', 'Захиалагч хүсэлт', 2, 2, 'Change order бичих', 'Менежер'], ['Хүчдэл тасрах', 'ЦДАШ доголдол', 1, 2, 'UPS / backup эх үүсвэр', 'Техникч']];
const DEF_EQUIP = [['Fiber Laser 15kW', 'Үндсэн', 1, 'ш', 'Цех', 'Ажиллагаатай', 'Таслалт'], ['MIG/MAG гагнуурын аппарат', 'Үндсэн', 2, 'ш', 'Цех', 'Ажиллагаатай', 'Гагнуур'], ['Angle grinder 125mm', 'Багаж', 4, 'ш', 'Цех', 'Ажиллагаатай', 'Гагнуур / угсралт'], ['Гүүрэн кран 16 тн', 'Туслах', 1, 'ш', 'Цех', 'Ажиллагаатай', 'Угсралт'], ['Forklift', 'Туслах', 1, 'ш', 'Цех', 'Ажиллагаатай', 'Бэлтгэл / угсралт'], ['NDT / Ultrasonic төхөөрөмж', 'Хяналт', 1, 'ш', 'QC', 'Ажиллагаатай', 'Чанарын шалгалт'], ['Хэмжих хэрэгсэл (штангенциркуль…)', 'Багаж', 1, 'иж', 'Цех', 'Ажиллагаатай', 'Бүх үе шат'], ['PPE (дуулга, нүдний хамгаалалт)', 'Хамгаалалт', 1, 'иж', 'Агуулах', 'Бэлэн', 'Бүх үе шат']];
const DEF_CHECKS = [['Хэмжээс зурагтай тохирч байгаа эсэх', 'Зураг дээрхтэй тохирно'], ['Гагнуурын чанар (визуал)', 'Crack, porosity байхгүй'], ['NDT / Ultrasonic шалгалт', 'Тайлан бэлэн байна'], ['Гадаргуугийн чанар (будаг)', 'Spec-д нийцсэн'], ['Материалын үлдэгдэл буцаасан', 'Бүрэн буцаасан'], ['Ажлын талбай цэвэрлэсэн', 'Цэвэрхэн болсон'], ['Баримт бичгүүд бүрдсэн', 'Зураг, тайлан бэлэн']];
const XCATS = [['mat', 'Материал'], ['cons', 'Consumable'], ['labor', 'Ажиллах хүч'], ['equip', 'Тоног, үйлчилгээ'], ['trans', 'Тээвэр'], ['other', 'Бусад']];
const xcat = k => (XCATS.find(c => c[0] === k) || XCATS[5])[1];
const JSUB = [['main', 'Мэдээлэл', 'Захиалагч, хугацаа, төлөв'], ['scope', 'Хамрах хүрээ', 'Ажлын тайлбар, үе шат, хуваарь, эрсдэл, халаалт'], ['quote', 'Үнийн санал', 'Материал, хүч, тоног, ашиг → захиалагчид PDF'], ['prod', 'Үйлдвэрлэл', 'Парт, өрөлт, зүсэлтийн бүртгэл, шошго, ажлын карт'], ['prog', 'Явц, зардал', 'Гүйцэтгэл %, зарлага, төсөв ба бодит'], ['acc', 'Хүлээлгэх', 'Delivery docket, шошго, хүлээн авалтын акт']];
function jobStepDone(job, k) {
  const q = job.quote, a = job.acc, sc = job.scope;
  if (k === 'main') return !!(job.title && job.customer);
  if (k === 'scope') return !!(sc && (sc.desc || sc.contract));
  if (k === 'quote') return !!(+job.price || (q && (q.mats.length || +q.fixedNet)));
  if (k === 'prod') return !!(job.est || (job.trace && job.trace.length));
  if (k === 'prog') return !!(sc && sc.stages.length && sc.stages.every(s => +s.pct >= 100));
  if (k === 'acc') return !!((a && a.done) || (job.dock && job.dock.issued));
}
function jobNextHTML(job) {
  return `<div class="jcard" data-v="main"><div class="bcard-h">Ажлын алхмууд</div><div class="jbody"><div class="jsteps">${JSUB.slice(1).map(([k, n, d], i) => `<button class="jstep${jobStepDone(job, k) ? ' done' : ''}" data-go="${k}"><span class="sn">${jobStepDone(job, k) ? '✓' : i + 2}</span><span><b>${n}</b><small>${d}</small></span></button>`).join('')}</div></div></div>`;
}

function costDef() { S.costDef = Object.assign({}, COST_DEF, S.costDef || {}); return S.costDef; }
function jx(job) {
  const cd = costDef();
  if (!job.scope) job.scope = { contract: '', start: job.created || today(), location: 'Kh International Workshop', desc: '', incl: 'Материал, хийцлэл, будаг, хүргэлт', excl: '',
    stages: DEF_STAGES.map(([name, start, dur, people, hours]) => ({ name, start, dur, people, hours, pct: 0 })),
    risks: DEF_RISKS.map(([d, cause, p, i, prev, owner]) => ({ d, cause, p, i, prev, owner, note: '' })),
    equip: DEF_EQUIP.map(([name, cat, qty, unit, loc, st, stage]) => ({ name, cat, qty, unit, loc, st, stage, note: '' })) };
  if (!job.quote) job.quote = { no: '', date: today(), valid: 14, rate: cd.rate, rateK: cd.rateK, equipPct: cd.equipPct, scrapPct: cd.scrapPct, vat: cd.vat, margin: cd.margin, fixedNet: 0, trans: 0,
    mats: [], cons: [], equipRows: [], other: [], spread: true, pay: 'Урьдчилгаа 50%, ажил хүлээлгэж өгөхөд 50%', delivery: '', note: '', contact: '' };
  if (!job.prog) job.prog = { exp: [] };
  if (!job.acc) job.acc = { done: '', names: ['', '', ''], checks: DEF_CHECKS.map(([item, req]) => ({ item, req, res: '', note: '' })), changes: [] };
  return job;
}
const qline = arr => (arr || []).reduce((a, r) => a + (+r.qty || 0) * (+r.price || 0), 0);
function quoteCalc(job) {
  jx(job); const q = job.quote, sc = job.scope, rate = (+q.rate || 0) * (+q.rateK || 1);
  const matKg = (q.mats || []).reduce((a, r) => a + (+r.qty || 0) * (+r.kgu || 0), 0), mat = qline(q.mats), scrap = mat * (+q.scrapPct || 0) / 100, trans = +q.trans || 0, cons = qline(q.cons);
  const matTotal = mat + scrap + trans + cons;
  const labor = sc.stages.map(s => ({ name: s.name, people: +s.people || 0, hours: +s.hours || 0, h: (+s.people || 0) * (+s.hours || 0), cost: (+s.people || 0) * (+s.hours || 0) * rate }));
  const laborTotal = labor.reduce((a, l) => a + l.cost, 0), laborH = labor.reduce((a, l) => a + l.h, 0);
  const equipRows = qline(q.equipRows), equipPctV = matTotal * (+q.equipPct || 0) / 100, equip = equipRows + equipPctV, other = qline(q.other);
  const cost = matTotal + laborTotal + equip + other;
  const net = +q.fixedNet > 0 ? +q.fixedNet : cost * (1 + (+q.margin || 0) / 100), profit = net - cost;
  const vat = net * (+q.vat || 0) / 100, total = net + vat, k = cost > 0 ? net / cost : 1;
  const chg = (job.acc ? job.acc.changes : []).filter(c => c.ok).reduce((a, c) => a + (+c.cost || 0), 0);
  const budget = { mat: mat + scrap, cons, labor: laborTotal, equip, trans, other };
  return { rate, matKg, mat, scrap, trans, cons, matTotal, labor, laborTotal, laborH, equipRows, equipPctV, equip, other, cost, net, profit, vat, total, k, chg, budget };
}
function progCalc(job) {
  jx(job); const sc = job.scope, c = quoteCalc(job), exp = job.prog.exp;
  const act = {}; XCATS.forEach(([k]) => act[k] = 0); exp.forEach(e => { act[e.cat] = (act[e.cat] || 0) + expAmt(job, e); });
  const AC = Object.values(act).reduce((a, b) => a + b, 0);
  const wt = sc.stages.map((s, i) => c.labor[i].cost || (+s.dur || 0)), W = wt.reduce((a, b) => a + b, 0) || 1;
  const pct = sc.stages.reduce((a, s, i) => a + wt[i] * Math.min(100, Math.max(0, +s.pct || 0)) / 100, 0) / W;
  const day = sc.start ? Math.floor((new Date(today() + 'T00:00:00') - new Date(sc.start + 'T00:00:00')) / 864e5) + 1 : 0;
  const plan = sc.stages.reduce((a, s, i) => { const f = Math.min(1, Math.max(0, (day - (+s.start || 1) + 1) / Math.max(1, +s.dur || 1))); return a + wt[i] * f; }, 0) / W;
  const EV = c.cost * pct, PV = c.cost * plan, CPI = AC > 0 ? EV / AC : null, SPI = PV > 0 ? EV / PV : null;
  const EAC = CPI ? c.cost / CPI : Math.max(c.cost, AC), price = (+job.price || c.net) + c.chg;
  const end = Math.max(0, ...sc.stages.map(s => (+s.start || 1) + (+s.dur || 1) - 1));
  return { c, act, AC, pct, plan, day, EV, PV, CPI, SPI, EAC, price, profitF: price - EAC, end };
}
const expAmt = (job, e) => +e.amount || (e.cat === 'labor' && +e.hours ? +e.hours * quoteCalc(job).rate : 0);
const addDays = (d, n) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

/* ---------- small editable-table helper ---------- */
function edTable(id, cols, rows, o = {}) {
  const cell = (c, r, i) => {
    const v = r[c.k] ?? '', a = `data-ed="${id}" data-r="${i}" data-k="${c.k}"`;
    if (c.calc) return `<td class="r num">${c.calc(r, i)}</td>`;
    if (c.sel) return `<td><select ${a}>${c.sel.map(([k, n]) => `<option value="${esc(k)}"${String(k) === String(v) ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></td>`;
    if (c.chk) return `<td style="text-align:center"><input type="checkbox" ${a}${v ? ' checked' : ''} style="width:auto"></td>`;
    return `<td${c.w ? ` style="min-width:${c.w}px;width:${c.w}px"` : ''}><input ${a} ${c.num ? 'type="number" step="any" class="mono" style="text-align:right"' : c.date ? 'type="date"' : ''} value="${esc(v)}"${c.ph ? ` placeholder="${esc(c.ph)}"` : ''}${c.list ? ` list="${c.list}"` : ''}></td>`;
  };
  return `<div class="tblwrap"><table class="dt ed"><thead><tr><th style="width:28px">№</th>${cols.map(c => `<th${c.num || c.calc ? ' class="r"' : ''}>${c.t}</th>`).join('')}<th style="width:28px"></th></tr></thead><tbody>
    ${rows.map((r, i) => `<tr><td class="num muted">${i + 1}</td>${cols.map(c => cell(c, r, i)).join('')}<td><button class="x" data-edel="${id}" data-r="${i}" aria-label="Устгах">×</button></td></tr>`).join('')}
    ${o.foot || ''}</tbody></table></div><div class="addrow"><button class="btn sm" data-eadd="${id}">+ Мөр нэмэх</button>${o.extra || ''}</div>`;
}
function bindEd(root, map, after, hook) {
  root._edMap = map; root._edAfter = after; root._edHook = hook || null; if (root._edBound) return; root._edBound = true;
  root.addEventListener('change', ev => {
    const t = ev.target, id = t.dataset.ed, M = root._edMap; if (!id || !M[id]) return;
    const arr = M[id].arr(), r = arr[+t.dataset.r], col = M[id].cols.find(c => c.k === t.dataset.k); if (!r || !col) return;
    r[t.dataset.k] = col.chk ? t.checked : col.num ? (t.value === '' ? '' : +t.value) : t.value; if (root._edHook) root._edHook(id, r, t.dataset.k); save(); root._edAfter(id);
  });
  root.addEventListener('click', ev => {
    const M = root._edMap, d = ev.target.closest('[data-edel]'), a = ev.target.closest('[data-eadd]');
    if (d && M[d.dataset.edel]) { M[d.dataset.edel].arr().splice(+d.dataset.r, 1); save(); root._edAfter(d.dataset.edel); }
    if (a && M[a.dataset.eadd]) { M[a.dataset.eadd].arr().push(M[a.dataset.eadd].blank()); save(); root._edAfter(a.dataset.eadd); }
  });
}
const fldIn = (id, label, v, o = {}) => `<label class="fld${o.cls ? ' ' + o.cls : ''}">${label}${o.area ? `<textarea id="${id}" rows="${o.rows || 3}" class="inp">${esc(v ?? '')}</textarea>` : `<input id="${id}"${o.type ? ` type="${o.type}"` : ''}${o.num ? ' type="number" step="any" class="mono"' : ''} value="${esc(v ?? '')}"${o.ph ? ` placeholder="${esc(o.ph)}"` : ''}${o.list ? ` list="${o.list}"` : ''}>`}</label>`;
function bindFields(root, obj, keys, after) {
  keys.forEach(([id, k, num]) => { const el = root.querySelector('#' + id); if (el) el.addEventListener('change', () => { obj[k] = num ? (+el.value || 0) : el.value; save(); after && after(k); }); });
}

/* ---------- sub-tab bar ---------- */
function jobSubBar(job) {
  if (job.kind === 'quote') return `<nav class="rtabs jsub stepper qbar"><span class="pill qst-${job.qst || 'draft'}" style="align-self:center">ҮНИЙН САНАЛ</span><b class="mono" style="align-self:center">${esc(job.no)}</b>
    <input id="qb_cust" class="inp" list="dl-org" placeholder="Захиалагч (байгууллага)" value="${esc(job.customer)}" style="flex:1 1 200px;min-width:0">
    <input id="qb_title" class="inp" placeholder="Ажлын нэр" value="${esc(job.title)}" style="flex:1 1 200px;min-width:0">
    <select id="qb_st" class="inp" style="width:auto">${QST.filter(x => x[0] !== 'won').map(([k, n]) => `<option value="${k}"${(job.qst || 'draft') === k ? ' selected' : ''}>${n}</option>`).join('')}</select>
    <button class="btn primary" id="qb_won" title="Захиалагч баталсан — бүх алхам (scope, үйлдвэрлэл, явц, хүлээлгэх) нээгдэнэ">✓ Ажил болгох</button><button class="btn ghost" id="qb_del">Устгах</button></nav>`;
  return `<nav class="rtabs jsub stepper">${JSUB.map(([k, n, d], i) => `${i ? '<span class="arr">›</span>' : ''}<button data-jsub="${k}" title="${d}" class="${(J.sub || 'main') === k ? 'on' : ''}${jobStepDone(job, k) ? ' done' : ''}"><span class="sn">${jobStepDone(job, k) ? '✓' : i + 1}</span>${n}</button>`).join('')}<span class="sp" style="flex:1"></span><span class="muted mono" style="align-self:center;font-size:12px;padding-right:6px">${esc(job.no)}${job.title ? ' · ' + esc(job.title) : ''}</span></nav>`;
}
function bindSubBar(el) {
  el.querySelectorAll('[data-jsub]').forEach(b => b.addEventListener('click', () => { J.sub = b.dataset.jsub; renderJobMain(); }));
  const job = findJob(J.sel); if (!job || job.kind !== 'quote') return;
  const c = el.querySelector('#qb_cust'), t = el.querySelector('#qb_title'), st = el.querySelector('#qb_st');
  if (c) c.addEventListener('change', () => { job.customer = c.value.trim(); if (job.customer) { orgLearn({ org: job.customer }); if (job.quote.qf) qfFillFromDir(job.quote.qf, job.customer); } save(); renderJList(); renderJobMain(); });
  if (t) t.addEventListener('change', () => { job.title = t.value.trim(); if (job.quote.qf && !job.quote.qf.title) { job.quote.qf.title = job.title; job.quote.qf.rfqName = job.quote.qf.rfqName || job.title; } save(); renderJList(); renderJobMain(); });
  if (st) st.addEventListener('change', () => { job.qst = st.value; jobLog('Саналын төлөв: ' + qstName(job.qst), job); renderJList(); });
  const w = el.querySelector('#qb_won'); if (w) w.addEventListener('click', () => { if (!confirm(`${job.no} саналыг баталж ажил болгох уу? Бүх мэдээлэл хадгалагдана.`)) return; quoteToJob(job); renderJobs(); toast('Ажил боллоо: ' + job.no); });
  const d = el.querySelector('#qb_del'); if (d) d.addEventListener('click', ev => { const b = ev.currentTarget; if (!b.dataset.arm) { b.dataset.arm = 1; b.textContent = 'Дахин дарж баталгаажуулна'; setTimeout(() => { delete b.dataset.arm; b.textContent = 'Устгах'; }, 3000); return; } S.jobs = S.jobs.filter(j => j !== job); J.sel = null; save(); renderJobs(); });
}
function renderJobSub(el, job) {
  jx(job);
  if (J.sub === 'scope') renderScope(el, job); else if (J.sub === 'quote') renderJQuote(el, job); else if (J.sub === 'prog') renderProg(el, job); else renderAcc(el, job);
  bindSubBar(el);
  el.querySelectorAll('[data-out]').forEach(b => b.addEventListener('click', () => jobDocOut(job, b.dataset.doc, b.dataset.out)));
}
function jobDocOut(job, id, mode) {
  const B = { scope: [scopeDoc, 'Scope_хуваарь'], quote: [quoteDoc, 'Үнийн_санал'], cost: [costDoc, 'Зардлын_тооцоо'], prog: [progDoc, 'Явцын_тайлан'], acc: [accDoc, 'Хүлээн_авалтын_акт'] }[id];
  if (!B) return; docOut(mode, () => B[0](job), `${job.no}_${B[1]}`); if (mode === 'pdf') jobLog(`${B[1].replace(/_/g, ' ')} PDF гаргасан`, job);
}

/* ---------- Scope · schedule · risks · equipment ---------- */
function ganttHTML(job, P) {
  const sc = job.scope, end = Math.max(P ? P.end : 1, ...sc.stages.map(s => (+s.start || 1) + (+s.dur || 1) - 1), 1), day = P ? P.day : null;
  const pc = d => (d - 1) / end * 100;
  return `<div class="gantt sgantt">${sc.stages.map(s => { const a = pc(+s.start || 1), w = (+s.dur || 1) / end * 100, p = Math.min(100, Math.max(0, +s.pct || 0)); return `<div class="grow"><span class="gl">${esc(s.name)}</span><span class="gt"><i class="gb" style="left:${a}%;width:${w}%;opacity:.28"></i><i class="gb" style="left:${a}%;width:${w * p / 100}%"></i>${day != null && day >= 1 && day <= end + 1 ? `<i class="gn" style="left:${Math.min(100, pc(day))}%"></i>` : ''}</span><span class="gd mono">${sc.start ? esc(addDays(sc.start, (+s.start || 1) - 1).slice(5)) + ' → ' + esc(addDays(sc.start, (+s.start || 1) + (+s.dur || 1) - 2).slice(5)) : `${s.start}–${(+s.start || 1) + (+s.dur || 1) - 1}`} · ${p}%</span></div>`; }).join('')}
    <div class="note" style="margin-top:2px">Нийт ${end} хоног${sc.start ? ` · ${esc(sc.start)} → ${esc(addDays(sc.start, end - 1))}` : ''}. Цайвар — төлөвлөгөө, тод — гүйцэтгэл, босоо зураас — өнөөдөр.</div></div>`;
}
const STAGE_COLS = [{ k: 'name', t: 'Үе шатны нэр' }, { k: 'start', t: 'Эхлэх хоног', num: 1, w: 80 }, { k: 'dur', t: 'Үргэлжлэх хоног', num: 1, w: 80 }, { k: 'people', t: 'Хүн', num: 1, w: 60 }, { k: 'hours', t: 'Нэг хүний цаг', num: 1, w: 80 }];
const RISK_COLS = [{ k: 'd', t: 'Эрсдэлийн тайлбар' }, { k: 'cause', t: 'Шалтгаан' }, { k: 'p', t: 'Магадлал (1–3)', num: 1, w: 70 }, { k: 'i', t: 'Нөлөөлөл (1–3)', num: 1, w: 70 }, { k: 'sc', t: 'Оноо', calc: r => { const s = (+r.p || 0) * (+r.i || 0); return `<span class="${s >= 6 ? 'late' : ''}">${s}</span>`; } }, { k: 'prev', t: 'Урьдчилан сэргийлэх' }, { k: 'owner', t: 'Хариуцах', w: 100 }];
const EQUIP_COLS = [{ k: 'name', t: 'Нэр / загвар' }, { k: 'cat', t: 'Ангилал', w: 90 }, { k: 'qty', t: 'Тоо', num: 1, w: 50 }, { k: 'unit', t: 'Нэгж', w: 50 }, { k: 'loc', t: 'Байршил', w: 80 }, { k: 'st', t: 'Төлөв', w: 100 }, { k: 'stage', t: 'Ашиглах үе шат' }];
function renderScope(el, job) {
  const sc = job.scope, P = progCalc(job);
  el.innerHTML = `${jobSubBar(job)}
    <div class="exports">${outBtns('scope', 'Scope')}</div>
    <div class="jcard"><div class="bcard-h">Мэдээлэл</div><div class="jbody"><div class="jgrid">
      <label class="fld">Төслийн нэр<input id="sc_title" value="${esc(job.title)}"></label>
      <label class="fld">Захиалагч<input id="sc_customer" value="${esc(job.customer)}"></label>
      <label class="fld">Гүйцэтгэгч<input value="Kh International" disabled></label>
      ${fldIn('sc_contract', 'Гэрээний дугаар', sc.contract)}${fldIn('sc_start', 'Эхлэх огноо', sc.start, { type: 'date' })}${fldIn('sc_location', 'Ажлын байршил', sc.location)}
    </div></div></div>
    <div class="jcard"><div class="bcard-h">Хамрах хүрээ</div><div class="jbody">
      ${fldIn('sc_desc', 'Ажлын тайлбар', sc.desc, { area: 1, rows: 3 })}
      <div class="jgrid">${fldIn('sc_incl', 'Scope-д орох', sc.incl, { area: 1, rows: 3 })}${fldIn('sc_excl', 'Scope-д ОРОХГҮЙ', sc.excl, { area: 1, rows: 3 })}</div>
    </div></div>
    <div class="jcard"><div class="bcard-h">Үе шат — хуваарь <span class="sp"></span><span class="muted" style="font-weight:400;font-size:12px">Хүн × цаг нь үнийн саналын ажиллах хүчний зардал болно</span></div><div class="jbody">
      ${edTable('st', STAGE_COLS, sc.stages)}
      ${ganttHTML(job, P)}
    </div></div>
    ${weldCardHTML(job)}
    <div class="jcard"><div class="bcard-h">Эрсдэлийн бүртгэл <span class="sp"></span><span class="muted" style="font-weight:400;font-size:12px">1 = бага · 2 = дунд · 3 = өндөр</span></div><div class="jbody">${edTable('rk', RISK_COLS, sc.risks)}</div></div>
    <div class="jcard"><div class="bcard-h">Тоног төхөөрөмж, багаж хэрэгсэл</div><div class="jbody">${edTable('eq', EQUIP_COLS, sc.equip)}</div></div>`;
  const re = () => renderJobMain();
  bindWeldCard(el, job, re);
  bindFields(el, sc, [['sc_contract', 'contract'], ['sc_start', 'start'], ['sc_location', 'location'], ['sc_desc', 'desc'], ['sc_incl', 'incl'], ['sc_excl', 'excl']], k => { if (k === 'start') re(); });
  [['sc_title', 'title'], ['sc_customer', 'customer']].forEach(([id, k]) => el.querySelector('#' + id).addEventListener('change', e => { job[k] = e.target.value; save(); renderJList(); }));
  bindEd(el, { st: { arr: () => sc.stages, cols: STAGE_COLS, blank: () => ({ name: '', start: 1, dur: 1, people: 1, hours: 8, pct: 0 }) }, rk: { arr: () => sc.risks, cols: RISK_COLS, blank: () => ({ d: '', cause: '', p: 1, i: 1, prev: '', owner: '' }) }, eq: { arr: () => sc.equip, cols: EQUIP_COLS, blank: () => ({ name: '', cat: '', qty: 1, unit: 'ш', loc: 'Цех', st: 'Ажиллагаатай', stage: '' }) } }, re);
}

/* ---------- detailed quotation ---------- */
const MAT_COLS = [{ k: 'name', t: 'Нэр (сангаас сонгох эсвэл шинээр шивэх)', list: 'dl-mat' }, { k: 'qty', t: 'Тоо', num: 1, w: 80 }, { k: 'unit', t: 'Нэгж', w: 64 }, { k: 'kgu', t: 'кг / нэгж', num: 1, w: 80 }, { k: 'kg', t: 'Жин, кг', calc: r => r.kgu ? nf((+r.qty || 0) * r.kgu, 1) : '—' }, { k: 'price', t: 'Нэгж үнэ, ₮', num: 1, w: 110 }, { k: 'pk', t: '₮ / кг', calc: (r, i) => r.kgu ? money(r.price / r.kgu) + (r.unit !== 'кг' ? ` <button class="linkbtn" data-kgc="${i}" title="Энэ мөрийг кг-аар бодох">→ кг</button>` : '') : '—' }, { k: 'sum', t: 'Нийт, ₮', calc: r => money((+r.qty || 0) * (+r.price || 0)) }, { k: 'note', t: 'Нийлүүлэгч / тайлбар' }];
const toKg = r => { if (!r.kgu || r.unit === 'кг') return; r.qty = Math.round((+r.qty || 0) * r.kgu * 10) / 10; r.price = Math.round(r.price / r.kgu); r.note = [r.note, `${r.unit} → кг (${r.kgu} кг/${r.unit})`].filter(Boolean).join(' · '); r.unit = 'кг'; r.kgu = 1; };
const LINE_COLS = [{ k: 'name', t: 'Нэр', list: 'dl-any' }, { k: 'qty', t: 'Тоо', num: 1, w: 80 }, { k: 'unit', t: 'Нэгж', w: 70 }, { k: 'price', t: 'Нэгж үнэ, ₮', num: 1, w: 110 }, { k: 'sum', t: 'Нийт, ₮', calc: r => money((+r.qty || 0) * (+r.price || 0)) }, { k: 'note', t: 'Нийлүүлэгч / тайлбар' }];
const CONS_COLS = [{ k: 'grp', t: 'Бүлэг (код)', w: 150, list: 'dl-cgrp' }, { k: 'name', t: 'Consumable (сангаас сонгох эсвэл шивэх)', list: 'dl-cons' }, { k: 'qty', t: 'Тоо', num: 1, w: 80 }, { k: 'unit', t: 'Нэгж', w: 64 }, { k: 'price', t: 'Нэгж үнэ, ₮ (засна)', num: 1, w: 120 }, { k: 'sum', t: 'Нийт, ₮', calc: r => money((+r.qty || 0) * (+r.price || 0)) }, { k: 'note', t: 'Нийлүүлэгч / тайлбар' }];
const consGroups = () => { const m = new Map(); CAT().filter(c => c.cat === 'cons').forEach(c => { const g = c.grp || 'Consumable'; if (!m.has(g)) m.set(g, []); m.get(g).push(c); }); return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])); };
function consPickHTML(q) {
  const G = consGroups(), have = new Set(q.cons.map(r => String(r.name || '').toLowerCase()));
  const by = {}; q.cons.forEach(r => { const g = r.grp || '—'; by[g] = (by[g] || 0) + (+r.qty || 0) * (+r.price || 0); });
  return `<select id="qConsPre" class="inp" style="width:auto;max-width:340px"><option value="">+ Сангаас нэмэх…</option>${G.map(([g, a]) => `<optgroup label="${esc(g)}">${a.map(c => `<option value="${esc(c.id)}"${have.has(c.name.toLowerCase()) ? ' disabled' : ''}>${esc(c.name)} — ${money(c.price)} ₮/${esc(c.unit)}</option>`).join('')}</optgroup>`).join('')}</select>
    <select id="qConsGrp" class="inp" style="width:auto"><option value="">+ Бүлгээр бүгдийг…</option>${G.map(([g, a]) => `<option value="${esc(g)}">${esc(g)} (${a.length})</option>`).join('')}</select>
    <button class="btn sm ghost" id="qConsZero" title="Тоо нь 0 мөрүүдийг хасах">0-тэйг хасах</button>
    <span class="note" style="margin:0">Үнийг мөрөн дээр засахад сан дахь үнэ шинэчлэгдэнэ.</span>
    ${Object.keys(by).length > 1 || (Object.keys(by)[0] && Object.keys(by)[0] !== '—') ? `<div class="chips" style="width:100%;margin-top:6px">${Object.entries(by).sort().map(([g, v]) => `<span class="chip">${esc(g)}: <b class="mono">${money(v)}</b> ₮</span>`).join('')}</div>` : ''}`;
}
const CONS_PRESET = [['Гагнуурын утас ER70S-6 Ø1.2', 'кг', 9500], ['CO₂ / хольц хий', 'баллон', 85000], ['Зүсэх диск 125мм', 'ш', 3500], ['Өнгөлөх диск 125мм', 'ш', 4500], ['Будаг (грунт + өнгөлгөө)', 'л', 28000], ['Уусгагч', 'л', 9000], ['Лазерын хий (N₂ / O₂)', 'баллон', 95000], ['Электрод E7018 Ø3.2', 'кг', 12000]];
function renderJQuote(el, job) {
  const q = job.quote, c = quoteCalc(job), sc = job.scope;
  const sumRow = (label, v, ex = 0) => `<tr class="tot"><td></td><td colspan="${4 + ex}">${label}</td><td class="r num">${money(v)}</td><td colspan="2"></td></tr>`;
  el.innerHTML = `${jobSubBar(job)}
    <div class="exports">${outBtns('quote', 'Дэлгэрэнгүй задаргаа')}${outBtns('cost', 'Дотоод тооцоо')}<span class="sp" style="flex:1"></span><button class="btn" id="qFromNest"${job.est ? '' : ' disabled title="Ажлыг өрөлтөд ачаалж өрнө үү"'}>Өрөлтөөс материал, зүсэлт</button></div>
    <div class="summary">${[['Материал + consumable', money(c.matTotal)], ['Ажиллах хүч', money(c.laborTotal), `${nf(c.laborH, 0)} цаг × ${money(c.rate)}`], ['Тоног, үйлчилгээ', money(c.equip)], ['Өртөг', money(c.cost)], ['Ашиг', money(c.profit), c.net ? nf(c.profit / c.net * 100, 1) + '%' : ''], ['Санал (НӨАТ-гүй)', money(c.net)], ['Нийт (НӨАТ-тай)', money(c.total)]].map(s => `<div class="stat"><div class="k">${s[0]}</div><div class="v">${s[1]}<small>₮</small></div><div class="s">${s[2] || ''}</div></div>`).join('')}</div>
    ${qfCardHTML(job)}
    <div class="jcard"><div class="bcard-h">Саналын мэдээлэл</div><div class="jbody"><div class="jgrid">
      ${fldIn('q_no', 'Саналын дугаар', q.no, { ph: job.no + '-Q1' })}${fldIn('q_date', 'Огноо', q.date, { type: 'date' })}${fldIn('q_valid', 'Хүчинтэй хугацаа, хоног', q.valid, { num: 1 })}${fldIn('q_delivery', 'Хийж дуусгах хугацаа', q.delivery, { ph: `${progCalc(job).end} хоног` })}
      ${fldIn('q_pay', 'Төлбөрийн нөхцөл', q.pay)}${fldIn('q_contact', 'Холбоо барих (утас, и-мэйл)', q.contact)}
      <label class="check" style="align-self:end"><input type="checkbox" id="q_netIn"${q.netIn !== false ? ' checked' : ''}><span>Нийлүүлэгчийн НӨАТ-тай үнийг НӨАТ-гүй болгож оруулах</span></label>
    </div></div></div>${catDatalists()}
    <div class="jcard"><div class="bcard-h">A. Материал & худалдан авалт</div><div class="jbody">
      ${edTable('qm', MAT_COLS, q.mats, { foot: `<tr class="tot"><td></td><td colspan="3">Материалын дүн</td><td class="r num">${nf(c.matKg, 1)}</td><td></td><td class="r num">${c.matKg ? money(c.mat / c.matKg) : ''}</td><td class="r num">${money(c.mat)}</td><td colspan="2"></td></tr>`, extra: `<button class="btn sm ghost" id="qAllKg">Бүх мөрийг кг-аар бодох</button><span class="note">Нэрийг шивэхэд сангаас санал болгоно. Санд байхгүй бол үнэ, нийлүүлэгчийг нь бичихэд автоматаар хадгална.</span>` })}
      ${(() => { const nk = job.est ? job.est.kg : 0, pk = (() => { try { return jobWeight(jobParts(job)); } catch (e) { return 0; } })(); if (!c.matKg && !nk && !pk) return ''; const ref = nk || pk, d = ref && c.matKg ? (c.matKg - ref) / ref * 100 : null; return `<div class="phint ${d != null && d < -2 ? 'need' : ''}"><b>⚖ Жингийн шалгалт:</b> санал ${nf(c.matKg, 1)} кг${c.matKg ? ` (дундаж ${money(c.mat / c.matKg)} ₮/кг)` : ''}${nk ? ` · өрөлтийн листийн жин ${nf(nk, 1)} кг` : ''}${pk ? ` · партуудын цэвэр жин ${nf(pk, 1)} кг` : ''}${d != null ? ` · зөрүү <b>${d > 0 ? '+' : ''}${nf(d, 1)}%</b>${d < -2 ? ' — саналын материал дутуу байж магадгүй' : ''}` : ''}</div>`; })()}
      <div class="jgrid">${fldIn('q_trans', 'Тээвэр / хүргэлт, ₮', q.trans, { num: 1 })}${fldIn('q_scrap', 'Хаягдал нөөц, %', q.scrapPct, { num: 1 })}<div class="fld">Хаягдал нөөц, ₮<div class="mono" style="padding:7px 0">${money(c.scrap)}</div></div></div>
    </div></div>
    <div class="jcard"><div class="bcard-h">B. Consumable (гагнуурын утас, хий, диск, будаг…)</div><div class="jbody">
      ${edTable('qc', CONS_COLS, q.cons, { foot: sumRow('Consumable дүн', c.cons, 1), extra: consPickHTML(q) })}
    </div></div>
    <div class="jcard"><div class="bcard-h">C. Ажиллах хүч <span class="sp"></span><span class="muted" style="font-weight:400;font-size:12px">Энд засахад «Хамрах хүрээ»-ний хуваарь мөн шинэчлэгдэнэ</span></div><div class="jbody">
      <div class="jgrid">${fldIn('q_rate', 'Цагийн хөлс, ₮', q.rate, { num: 1 })}${fldIn('q_rateK', 'Нэмэгдэл коэффициент (НДШ, ХАОАТ…)', q.rateK, { num: 1 })}<div class="fld">Тооцох хөлс, ₮/цаг<div class="mono" style="padding:7px 0">${money(c.rate)}</div></div></div>
      ${edTable('ql', [{ k: 'name', t: 'Ажил / үе шат (гагнуурчин, слесарь, будаг…)' }, { k: 'people', t: 'Хүн', num: 1, w: 70 }, { k: 'hours', t: 'Нэг хүний цаг', num: 1, w: 90 }, { k: 'th', t: 'Нийт цаг', calc: (r, i) => nf(c.labor[i] ? c.labor[i].h : 0, 1) }, { k: 'tc', t: 'Нийт цалин, ₮', calc: (r, i) => money(c.labor[i] ? c.labor[i].cost : 0) }], sc.stages, { foot: `<tr class="tot"><td></td><td colspan="3">Хүчний нийт дүн</td><td class="r num">${nf(c.laborH, 1)}</td><td class="r num">${money(c.laborTotal)}</td><td></td></tr>` })}
    </div></div>
    <div class="jcard"><div class="bcard-h">D. Тоног төхөөрөмж, үйлчилгээ (лазер зүсэлт, нугалалт, NDT, кран…)</div><div class="jbody">
      ${edTable('qe', LINE_COLS, q.equipRows, { foot: sumRow('Тоног, үйлчилгээний мөрүүд', c.equipRows) })}
      <div class="jgrid">${fldIn('q_equipPct', 'Тоног төхөөрөмжийн элэгдэл, % (материалаас)', q.equipPct, { num: 1 })}<div class="fld">Элэгдэл, ₮<div class="mono" style="padding:7px 0">${money(c.equipPctV)}</div></div></div>
    </div></div>
    <div class="jcard"><div class="bcard-h">E. Бусад зардал</div><div class="jbody">${edTable('qo', LINE_COLS, q.other, { foot: sumRow('Бусад зардлын дүн', c.other) })}</div></div>
    <div class="jcard"><div class="bcard-h">Нийт зардлын дүгнэлт</div><div class="jbody">
      <div class="jgrid">${fldIn('q_margin', 'Ашгийн хувь, %', q.margin, { num: 1 })}${fldIn('q_fixed', 'Эсвэл саналын дүнг шууд оруулах (НӨАТ-гүй), ₮', q.fixedNet || '', { num: 1, ph: '0 = ашгийн хувиар' })}${fldIn('q_vat', 'НӨАТ, %', q.vat, { num: 1 })}
      <label class="check" style="align-self:end"><input type="checkbox" id="q_spread"${q.spread ? ' checked' : ''}><span>Ашгийг мөр бүрийн үнэд шингээх (захиалагчид өртөг харагдахгүй)</span></label></div>
      <div class="tblwrap"><table class="dt"><tbody>
        ${[['1. Материалын нийт зардал (хаягдал, тээвэр, consumable орсон)', c.matTotal], ['2. Ажиллах хүчний зардал', c.laborTotal], ['3. Тоног төхөөрөмж, үйлчилгээний зардал', c.equip], ['4. Бусад зардал', c.other]].map(([k, v]) => `<tr><td>${k}</td><td class="r num">${money(v)}</td></tr>`).join('')}
        <tr class="tot"><td>Өртөг (татваргүй)</td><td class="r num">${money(c.cost)}</td></tr>
        <tr><td>Ашиг (${c.net ? nf(c.profit / c.net * 100, 1) : 0}% саналаас, ${c.cost ? nf(c.profit / c.cost * 100, 1) : 0}% өртгөөс)</td><td class="r num ${c.profit < 0 ? 'late' : ''}">${money(c.profit)}</td></tr>
        <tr class="tot"><td>Үнийн саналын дүн (НӨАТ-гүй)</td><td class="r num">${money(c.net)}</td></tr>
        <tr><td>НӨАТ (${q.vat}%)</td><td class="r num">${money(c.vat)}</td></tr>
        <tr class="tot"><td>НИЙТ ДҮН (НӨАТ-тай)</td><td class="r num">${money(c.total)}</td></tr>
      </tbody></table></div>
      ${fldIn('q_note', 'Нэмэлт нөхцөл, тайлбар (санал дээр хэвлэгдэнэ)', q.note, { area: 1, rows: 3 })}
      <div class="exports"><button class="btn" id="qToPrice">Санал (НӨАТ-гүй)-ийг ажлын гэрээний үнэ болгох</button><span class="note">Одоогийн гэрээний үнэ: ${job.price ? money(job.price) + ' ₮' : '—'}</span></div>
    </div></div>`;
  const re = () => renderJobMain();
  bindFields(el, q, [['q_no', 'no'], ['q_date', 'date'], ['q_valid', 'valid', 1], ['q_delivery', 'delivery'], ['q_pay', 'pay'], ['q_contact', 'contact'], ['q_trans', 'trans', 1], ['q_scrap', 'scrapPct', 1], ['q_rate', 'rate', 1], ['q_rateK', 'rateK', 1], ['q_equipPct', 'equipPct', 1], ['q_margin', 'margin', 1], ['q_fixed', 'fixedNet', 1], ['q_vat', 'vat', 1], ['q_note', 'note']], k => {
    if (['rate', 'rateK', 'equipPct', 'scrapPct', 'vat', 'margin'].includes(k)) Object.assign(costDef(), { [k]: q[k] });
    if (!['no', 'date', 'delivery', 'pay', 'contact', 'note'].includes(k)) re();
  });
  el.querySelector('#q_spread').addEventListener('change', e => { q.spread = e.target.checked; save(); });
  bindQfCard(el, job);
  el.querySelector('#q_netIn').addEventListener('change', e => { q.netIn = e.target.checked; save(); });
  el.querySelectorAll('[data-kgc]').forEach(b => b.addEventListener('click', () => { toKg(q.mats[+b.dataset.kgc]); save(); re(); }));
  el.querySelector('#qAllKg').addEventListener('click', () => { q.mats.forEach(toKg); save(); re(); });
  const L = () => ({ name: '', qty: 1, unit: 'ш', price: 0, note: '' });
  bindEd(el, { qm: { arr: () => q.mats, cols: MAT_COLS, blank: L }, ql: { arr: () => sc.stages, cols: [{ k: 'name' }, { k: 'people', num: 1 }, { k: 'hours', num: 1 }], blank: () => ({ name: '', start: 1, dur: 1, people: 1, hours: 8, pct: 0 }) }, qc: { arr: () => q.cons, cols: CONS_COLS, blank: () => ({ grp: '', name: '', qty: 1, unit: 'ш', price: '', note: '' }) }, qe: { arr: () => q.equipRows, cols: LINE_COLS, blank: L }, qo: { arr: () => q.other, cols: LINE_COLS, blank: L } }, re, (id, row, key) => quoteLineHook(job, id, row, key));
  const consRow = c => { const r = { grp: c.grp || '', name: c.name, qty: 1, unit: c.unit, price: netPrice(c, q), note: '' }; quoteLineHook(job, 'qc', r, 'name'); return r; };
  el.querySelector('#qConsPre').addEventListener('change', e => { const c = CAT().find(x => x.id === e.target.value); if (!c) return; q.cons.push(consRow(c)); save(); re(); });
  el.querySelector('#qConsGrp').addEventListener('change', e => { const g = consGroups().find(([k]) => k === e.target.value); if (!g) return; const have = new Set(q.cons.map(r => String(r.name).toLowerCase())); let n = 0; g[1].forEach(c => { if (have.has(c.name.toLowerCase())) return; const r = consRow(c); r.qty = 0; q.cons.push(r); n++; }); save(); re(); toast(`${g[0]}: ${n} мөр нэмэгдлээ — тоог бөглөнө үү`); });
  el.querySelector('#qConsZero').addEventListener('click', () => { const n = q.cons.length; q.cons = q.cons.filter(r => +r.qty > 0); save(); re(); toast(`${n - q.cons.length} мөр хасагдлаа`); });
  el.querySelector('#qToPrice').addEventListener('click', () => { job.price = Math.round(c.net); jobLog(`Гэрээний үнэ саналаас: ${money(job.price)} ₮`, job); re(); toast('Гэрээний үнэ шинэчлэгдлээ'); });
  el.querySelector('#qFromNest').addEventListener('click', () => {
    const e = job.est; if (!e) return;
    q.mats = q.mats.filter(r => !r.auto); q.equipRows = q.equipRows.filter(r => !r.auto);
    (e.groups || []).forEach(g => { if (g.kg) q.mats.push({ name: `Хавтан ${g.label} (${g.sizes})`, qty: Math.round(g.kg * 10) / 10, unit: 'кг', price: Math.round(g.matCost / g.kg), note: 'өрөлтөөс', auto: 1 }); });
    if (!(e.groups || []).some(g => g.kg) && e.kg) q.mats.push({ name: 'Хавтан материал', qty: Math.round(e.kg * 10) / 10, unit: 'кг', price: Math.round(e.matCost / e.kg), note: 'өрөлтөөс', auto: 1 });
    if (e.time) q.equipRows.push({ name: `Лазер зүсэлт (${nf(e.cut / 1000, 1)} м, ${e.pierce} цоолт)`, qty: Math.round(e.time / 60 * 100) / 100, unit: 'цаг', price: Math.round(e.cutCost / (e.time / 60)), note: 'өрөлтөөс', auto: 1 });
    save(); re(); toast('Өрөлтийн материал, зүсэлт нэмэгдлээ');
  });
}

/* ---------- progress & expenses ---------- */
const EXP_COLS = [{ k: 'date', t: 'Огноо', date: 1, w: 130 }, { k: 'cat', t: 'Ангилал', sel: XCATS, w: 130 }, { k: 'stage', t: 'Үе шат' }, { k: 'desc', t: 'Тайлбар' }, { k: 'hours', t: 'Цаг (хүч)', num: 1, w: 70 }, { k: 'amount', t: 'Дүн, ₮', num: 1, w: 110 }, { k: 'who', t: 'Хариуцсан / баримт', w: 120 }];
function renderProg(el, job) {
  const P = progCalc(job), c = P.c, sc = job.scope;
  const stageOpts = [['', '—']].concat(sc.stages.map(s => [s.name, s.name]));
  const cols = EXP_COLS.map(x => x.k === 'stage' ? { ...x, sel: stageOpts } : x);
  const bar = (v, max) => `<span class="jprog" style="width:90px"><i style="width:${Math.min(100, max ? v / max * 100 : 0)}%;${max && v > max ? 'background:var(--bad)' : ''}"></i></span>`;
  const idx = v => v == null ? '—' : `<span class="${v < 0.95 ? 'late' : ''}">${nf(v, 2)}</span>`;
  el.innerHTML = `${jobSubBar(job)}
    <div class="exports">${outBtns('prog', 'Явцын тайлан')}</div>
    <div class="summary">${[
      ['Гүйцэтгэл', `${nf(P.pct * 100, 0)}<small>%</small>`, `төлөвлөгөөгөөр ${nf(P.plan * 100, 0)}% (${P.day > 0 ? P.day + '-р хоног' : 'эхлээгүй'})`],
      ['Зарцуулсан', `${money(P.AC)}<small>₮</small>`, `төсөв ${money(c.cost)} ₮`],
      ['Үлдэгдэл төсөв', `${money(c.cost - P.AC)}<small>₮</small>`, c.cost ? nf(P.AC / c.cost * 100, 1) + '% зарцуулсан' : ''],
      ['CPI зардал', idx(P.CPI), 'гүйцэтгэл ÷ зардал (1-ээс бага = хэтрэлт)'],
      ['SPI хуваарь', idx(P.SPI), 'гүйцэтгэл ÷ төлөвлөгөө (1-ээс бага = хоцрол)'],
      ['Эцсийн өртөг (таамаг)', `${money(P.EAC)}<small>₮</small>`, `гэрээ ${money(P.price)} ₮`],
      ['Таамаг ашиг', `<span class="${P.profitF < 0 ? 'late' : ''}">${money(P.profitF)}</span><small>₮</small>`, P.price ? nf(P.profitF / P.price * 100, 1) + '%' : '']
    ].map(s => `<div class="stat"><div class="k">${s[0]}</div><div class="v">${s[1]}</div><div class="s">${s[2]}</div></div>`).join('')}</div>
    <div class="jcard"><div class="bcard-h">Ажлын явц — үе шат бүрийн гүйцэтгэл</div><div class="jbody">
      <div class="tblwrap"><table class="dt"><thead><tr><th>Үе шат</th><th>Төлөвлөсөн</th><th class="r">Гүйцэтгэл, %</th><th>Бодит эхэлсэн</th><th>Бодит дууссан</th><th class="r">Хүчний төсөв, ₮</th><th class="r">Хүчний бодит, ₮</th></tr></thead><tbody>
      ${sc.stages.map((s, i) => { const lab = job.prog.exp.filter(e => e.cat === 'labor' && e.stage === s.name).reduce((a, e) => a + expAmt(job, e), 0); return `<tr data-i="${i}"><td>${esc(s.name)}</td><td class="num">${sc.start ? esc(addDays(sc.start, (+s.start || 1) - 1)) + ' · ' + s.dur + ' хоног' : s.start + '-р хоног · ' + s.dur}</td><td class="r"><input data-pk="pct" type="number" min="0" max="100" step="5" value="${+s.pct || 0}" class="mono" style="width:70px;text-align:right"></td><td><input data-pk="aStart" type="date" value="${esc(s.aStart || '')}"></td><td><input data-pk="aEnd" type="date" value="${esc(s.aEnd || '')}"></td><td class="r num">${money(c.labor[i].cost)}</td><td class="r num ${lab > c.labor[i].cost && c.labor[i].cost ? 'late' : ''}">${lab ? money(lab) : '—'}</td></tr>`; }).join('')}
      </tbody></table></div>
      ${ganttHTML(job, P)}
    </div></div>
    <div class="jcard"><div class="bcard-h">Зардал — төсөв ба бодит</div><div class="jbody"><div class="tblwrap"><table class="dt"><thead><tr><th>Ангилал</th><th class="r">Төсөв, ₮</th><th class="r">Бодит, ₮</th><th class="r">Зөрүү, ₮</th><th>Зарцуулалт</th></tr></thead><tbody>
      ${XCATS.map(([k, n]) => { const b = c.budget[k] || 0, a = P.act[k] || 0; return `<tr><td>${n}</td><td class="r num">${money(b)}</td><td class="r num">${money(a)}</td><td class="r num ${a > b ? 'late' : ''}">${a - b > 0 ? '+' : ''}${money(a - b)}</td><td>${bar(a, b)} <span class="mono muted">${b ? nf(a / b * 100, 0) + '%' : a ? '∞' : ''}</span></td></tr>`; }).join('')}
      <tr class="tot"><td>Нийт</td><td class="r num">${money(c.cost)}</td><td class="r num">${money(P.AC)}</td><td class="r num ${P.AC > c.cost ? 'late' : ''}">${P.AC - c.cost > 0 ? '+' : ''}${money(P.AC - c.cost)}</td><td>${bar(P.AC, c.cost)}</td></tr>
    </tbody></table></div>${c.cost ? '' : '<p class="note">Төсөв алга — «Үнийн санал» табд материал, үе шатны хүн цагийг оруулна уу.</p>'}</div></div>
    <div class="jcard"><div class="bcard-h">Зарлагын бүртгэл <span class="sp"></span><span class="muted" style="font-weight:400;font-size:12px">Ажиллах хүч: зөвхөн цаг оруулбал дүнг ${money(c.rate)} ₮/цаг-аар бодно</span></div><div class="jbody">
      ${edTable('ex', cols, job.prog.exp)}
    </div></div>`;
  const re = () => renderJobMain();
  el.querySelector('.dt tbody').addEventListener('change', ev => { const t = ev.target, k = t.dataset.pk, tr = t.closest('tr[data-i]'); if (!k || !tr) return; const s = sc.stages[+tr.dataset.i]; s[k] = k === 'pct' ? Math.min(100, Math.max(0, +t.value || 0)) : t.value; if (k === 'pct' && s.pct >= 100 && !s.aEnd) s.aEnd = today(); if (k === 'pct' && s.pct > 0 && !s.aStart) s.aStart = today(); save(); re(); });
  bindEd(el, { ex: { arr: () => job.prog.exp, cols, blank: () => ({ date: today(), cat: 'mat', stage: '', desc: '', hours: '', amount: '', who: '' }) } }, re);
}

/* ---------- acceptance act & change log ---------- */
const CHK_COLS = [{ k: 'item', t: 'Шалгах зүйл' }, { k: 'req', t: 'Шаардлага' }, { k: 'res', t: 'Үр дүн', sel: [['', '—'], ['yes', 'Тийм'], ['no', 'Үгүй']], w: 90 }, { k: 'note', t: 'Тайлбар' }];
const CHG_COLS = [{ k: 'date', t: 'Огноо', date: 1, w: 130 }, { k: 'desc', t: 'Өөрчлөлтийн тайлбар' }, { k: 'reason', t: 'Шалтгаан' }, { k: 'impact', t: 'Нөлөөлөл (хоног, ажил)' }, { k: 'cost', t: 'Зардал, ₮', num: 1, w: 110 }, { k: 'ok', t: 'Зөвшөөрсөн', chk: 1, w: 80 }, { k: 'note', t: 'Тайлбар' }];
function renderAcc(el, job) {
  const A = job.acc, tot = A.changes.reduce((a, c) => a + (+c.cost || 0), 0), ok = A.changes.filter(c => c.ok).reduce((a, c) => a + (+c.cost || 0), 0);
  el.innerHTML = `${jobSubBar(job)}
    ${dockCardHTML(job)}
    <div class="exports">${outBtns('acc', 'Хүлээн авалтын акт')}</div>
    <div class="jcard"><div class="bcard-h">C. Ажил хүлээн авалтын акт (sign-off)</div><div class="jbody">
      <div class="jgrid">${fldIn('a_done', 'Дуусгасан огноо', A.done, { type: 'date' })}${fldIn('a_n0', 'Гүйцэтгэгч (нэр)', A.names[0])}${fldIn('a_n1', 'Захиалагч (нэр)', A.names[1])}${fldIn('a_n2', 'Хяналт (нэр)', A.names[2])}</div>
      ${edTable('ck', CHK_COLS, A.checks)}
    </div></div>
    <div class="jcard"><div class="bcard-h">D. Өөрчлөлтийн бүртгэл (change order) <span class="sp"></span><span class="muted mono" style="font-weight:400;font-size:12px">нийт ${money(tot)} ₮ · зөвшөөрсөн ${money(ok)} ₮</span></div><div class="jbody">
      ${edTable('cg', CHG_COLS, A.changes)}
      <p class="note">Зөвшөөрсөн өөрчлөлтийн зардал гэрээний үнэд нэмэгдэж, «Явц · зардал»-ын таамаг ашигт тусна.</p>
    </div></div>`;
  const re = () => renderJobMain();
  bindFields(el, A, [['a_done', 'done']]);
  [0, 1, 2].forEach(i => el.querySelector('#a_n' + i).addEventListener('change', e => { A.names[i] = e.target.value; save(); }));
  const DK = bindDockCard(el, job); DK.refresh();
  bindEd(el, { ...DK.edMap, ck: { arr: () => A.checks, cols: CHK_COLS, blank: () => ({ item: '', req: '', res: '', note: '' }) }, cg: { arr: () => A.changes, cols: CHG_COLS, blank: () => ({ date: today(), desc: '', reason: '', impact: '', cost: '', ok: false, note: '' }) } }, id => { if (id === 'dki') { DK.refresh(); renderJobMain(); } else re(); });
}

/* ================= printable documents ================= */
const docHeadKV = job => [['Төслийн нэр', job.title || '—'], ['Захиалагч', job.customer || '—'], ['Гүйцэтгэгч', 'Kh International'], ['Ажлын дугаар', job.no], ['Гэрээний дугаар', job.scope.contract || '—'], ['Эхлэх огноо', job.scope.start || '—']];
function ganttDoc(D, job, P) {
  const sc = job.scope, end = Math.max(1, ...sc.stages.map(s => (+s.start || 1) + (+s.dur || 1) - 1)), lw = 58, rw = 26, tw = D.W - lw - rw, rh = 6;
  D.need(sc.stages.length * rh + 14); const x = D.x, X0 = D.M + lw, Y0 = D.y;
  x.font = `400 2.3px ${DFM}`; x.fillStyle = DC.mute; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  const step = Math.max(1, Math.ceil(end / 30));
  for (let d = 1; d <= end; d += step) { const X = X0 + (d - 0.5) / end * tw; x.fillText(sc.start ? addDays(sc.start, d - 1).slice(8) : String(d), X, Y0 + 2.5); }
  sc.stages.forEach((s, i) => {
    const Y = Y0 + 4 + i * rh, a = X0 + ((+s.start || 1) - 1) / end * tw, w = (+s.dur || 1) / end * tw, p = Math.min(100, Math.max(0, +s.pct || 0)) / 100;
    x.fillStyle = i % 2 ? DC.zebra : '#fff'; x.fillRect(D.M, Y, D.W, rh);
    x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = DC.ink; x.font = `400 2.7px ${DF}`; let t = s.name; while (t.length > 2 && x.measureText(t).width > lw - 3) t = t.slice(0, -2) + '…'; x.fillText(t, D.M + 1.5, Y + rh / 2);
    x.fillStyle = '#f6c9a8'; x.fillRect(a, Y + 1.4, w, rh - 2.8); x.fillStyle = DC.acc; x.fillRect(a, Y + 1.4, w * p, rh - 2.8);
    x.textAlign = 'right'; x.font = `400 2.5px ${DFM}`; x.fillStyle = DC.ink2; x.fillText(`${s.dur} хон · ${Math.round(p * 100)}%`, D.M + D.W - 1, Y + rh / 2);
  });
  x.strokeStyle = DC.line; x.lineWidth = 0.15; for (let d = 0; d <= end; d += step) { const X = X0 + d / end * tw; x.beginPath(); x.moveTo(X, Y0 + 4); x.lineTo(X, Y0 + 4 + sc.stages.length * rh); x.stroke(); }
  if (P && P.day >= 1 && P.day <= end) { const X = X0 + (P.day - 0.5) / end * tw; x.strokeStyle = DC.ink; x.lineWidth = 0.4; x.beginPath(); x.moveTo(X, Y0 + 3); x.lineTo(X, Y0 + 5 + sc.stages.length * rh); x.stroke(); }
  D.y = Y0 + 6 + sc.stages.length * rh; x.textBaseline = 'alphabetic';
  D.para(`Нийт ${end} хоног${sc.start ? ` (${sc.start} → ${addDays(sc.start, end - 1)})` : ''}. Цайвар — төлөвлөгөө, тод — гүйцэтгэл${P && P.day >= 1 && P.day <= end ? ', босоо зураас — өнөөдөр' : ''}.`, { size: 2.6, color: DC.mute });
}
async function scopeDoc(job) {
  jx(job); const sc = job.scope, c = quoteCalc(job);
  const D = await kdoc({ title: 'АЖЛЫН SCOPE — МЭДЭЭЛЭЛ & ХУВААРЬ', sub: `${job.no} · ${today()}`, code: S.iso.formScope || '' });
  D.kv(docHeadKV(job).concat([['Ажлын байршил', sc.location || '—'], ['Хугацаа', job.due || '—']]), 2);
  D.h2('Хамрах хүрээ');
  if (sc.desc) D.para(sc.desc);
  D.table([{ t: 'Scope-д орох', w: 0 }, { t: 'Scope-д ОРОХГҮЙ', w: 0 }], [[sc.incl || '—', sc.excl || '—']], { zebra: false });
  D.h2('Үе шат — хуваарь');
  D.table([{ t: '№', w: 8, m: 1 }, { t: 'Үе шатны нэр' }, { t: 'Эхлэх', w: 24, m: 1 }, { t: 'Дуусах', w: 24, m: 1 }, { t: 'Хоног', w: 14, a: 'r', m: 1 }, { t: 'Хүн', w: 12, a: 'r', m: 1 }, { t: 'Нийт цаг', w: 18, a: 'r', m: 1 }],
    sc.stages.map((s, i) => [i + 1, s.name, sc.start ? addDays(sc.start, (+s.start || 1) - 1) : `${s.start}-р хоног`, sc.start ? addDays(sc.start, (+s.start || 1) + (+s.dur || 1) - 2) : '', s.dur, s.people, nf(c.labor[i].h, 0)]));
  ganttDoc(D, job, null);
  { const Wr = jobWeldRows(job); if (Wr.rows.length) { D.h2('Гагнуур · урьдчилан халаалт', WELD_PROC.find(p => p[0] === Wr.W.proc)[1]); D.table([{ t: 'Материал' }, { t: 'Ангилал', w: 34 }, { t: 'Зузаан, мм', w: 18, a: 'r', m: 1 }, { t: 'Халаалт min', w: 22, a: 'r', m: 1 }, { t: 'Interpass max', w: 22, a: 'r', m: 1 }, { t: 'Эх үүсвэр', w: 34 }], Wr.rows.map(r => ({ cells: [r.mat, r.grade, r.t, phTxt(r), r.max ? r.max + ' °C' : '—', r.std], fill: r.min ? '#fff1e6' : null }))); D.para(Wr.max ? `Урьдчилан халаалт ${Wr.max} °C-аас багагүй; гагнуурын тэнхлэгээс хоёр тийш зузаанаас багагүй, 75 мм-ээс багагүй зайд. Батлагдсан WPS-ийг мөрдөнө.` : 'Урьдчилан халаалт шаардлагагүй (металл 0 °C-аас хүйтэн бол 20 °C хүртэл халаана).', { size: 2.7, color: DC.ink2 }); } }
  D.h2('Эрсдэлийн бүртгэл', '1 = бага · 2 = дунд · 3 = өндөр');
  D.table([{ t: '№', w: 8, m: 1 }, { t: 'Эрсдэл' }, { t: 'Шалтгаан' }, { t: 'Магадлал', w: 16, a: 'c', m: 1 }, { t: 'Нөлөө', w: 14, a: 'c', m: 1 }, { t: 'Оноо', w: 12, a: 'c', m: 1 }, { t: 'Урьдчилан сэргийлэх' }, { t: 'Хариуцах', w: 26 }],
    sc.risks.filter(r => r.d).map((r, i) => { const s = (+r.p || 0) * (+r.i || 0); return { cells: [i + 1, r.d, r.cause, r.p, r.i, s, r.prev, r.owner], fill: s >= 6 ? '#fde7e7' : null }; }));
  D.h2('Тоног төхөөрөмж, багаж хэрэгсэл');
  D.table([{ t: '№', w: 8, m: 1 }, { t: 'Нэр / загвар' }, { t: 'Ангилал', w: 24 }, { t: 'Тоо', w: 12, a: 'r', m: 1 }, { t: 'Нэгж', w: 12 }, { t: 'Байршил', w: 20 }, { t: 'Төлөв', w: 26 }, { t: 'Ашиглах үе шат', w: 32 }],
    sc.equip.filter(r => r.name).map((r, i) => [i + 1, r.name, r.cat, r.qty, r.unit, r.loc, r.st, r.stage]));
  D.sigs(['Бэлтгэсэн', 'Хянасан', 'Батласан']);
  return D;
}
/* customer quotation — detailed: materials, consumables, labour, equipment */
async function quoteDoc(job) {
  jx(job); const q = job.quote, c = quoteCalc(job), sc = job.scope, k = q.spread ? c.k : 1, P = progCalc(job);
  const D = await kdoc({ title: 'ҮНИЙН САНАЛ', sub: `№ ${q.no || job.no} · ${q.date || today()}`, code: S.iso.formQuote || '' });
  const until = q.date ? addDays(q.date, +q.valid || 0) : '';
  D.kv([['Захиалагч', job.customer || '—'], ['Саналын дугаар', q.no || job.no], ['Ажлын нэр', job.title || '—'], ['Огноо', q.date || today()], ['Гүйцэтгэгч', 'Kh International · ISO 9001'], ['Хүчинтэй', until ? `${until} хүртэл (${q.valid} хоног)` : '—'], ['Хийж дуусгах хугацаа', q.delivery || `${P.end} хоног`], ['Холбоо барих', q.contact || '—']], 2, { kw: 34 });
  if (sc.desc) { D.h2('Ажлын тайлбар'); D.para(sc.desc); }
  const lineCols = [{ t: '№', w: 8, m: 1 }, { t: 'Нэр' }, { t: 'Тоо', w: 18, a: 'r', m: 1 }, { t: 'Нэгж', w: 14 }, { t: 'Нэгж үнэ, ₮', w: 26, a: 'r', m: 1 }, { t: 'Нийт, ₮', w: 28, a: 'r', m: 1 }];
  const lineRows = (arr, extra = []) => arr.filter(r => r.name || +r.price).map((r, i) => [i + 1, r.name, nf(+r.qty || 0, 2).replace(/[.,]00$/, ''), r.unit, money((+r.price || 0) * k), money((+r.qty || 0) * (+r.price || 0) * k)]).concat(extra);
  const tot = (label, v) => ({ bold: 1, fill: DC.soft, cells: ['', label, '', '', '', money(v * k)] });
  let n = 0; const sec = t => `${String.fromCharCode(65 + n++)}. ${t}`;
  const mrows = lineRows(q.mats); if (c.scrap) mrows.push(['', `Хаягдал нөөц (${q.scrapPct}%)`, '', '', '', money(c.scrap * k)]); if (c.trans) mrows.push(['', 'Тээвэр / хүргэлт', '', '', '', money(c.trans * k)]);
  if (mrows.length) {
    D.h2(sec('Материал & худалдан авалт'), c.matKg ? `нийт ${nf(c.matKg, 1)} кг` : '');
    if (c.matKg) { const mc = [{ t: '№', w: 8, m: 1 }, { t: 'Нэр' }, { t: 'Тоо', w: 16, a: 'r', m: 1 }, { t: 'Нэгж', w: 12 }, { t: 'Жин, кг', w: 18, a: 'r', m: 1 }, { t: 'Нэгж үнэ, ₮', w: 24, a: 'r', m: 1 }, { t: 'Нийт, ₮', w: 26, a: 'r', m: 1 }];
      const rr2 = q.mats.filter(r => r.name || +r.price).map((r, i) => [i + 1, r.name, nf(+r.qty || 0, 2).replace(/[.,]00$/, ''), r.unit, r.kgu ? nf((+r.qty || 0) * r.kgu, 1) : '', money((+r.price || 0) * k), money((+r.qty || 0) * (+r.price || 0) * k)]);
      if (c.scrap) rr2.push(['', `Хаягдал нөөц (${q.scrapPct}%)`, '', '', '', '', money(c.scrap * k)]); if (c.trans) rr2.push(['', 'Тээвэр / хүргэлт', '', '', '', '', money(c.trans * k)]);
      D.table(mc, rr2.concat([{ bold: 1, fill: DC.soft, cells: ['', 'Материалын дүн', '', '', nf(c.matKg, 1), '', money((c.mat + c.scrap + c.trans) * k)] }])); }
    else D.table(lineCols, mrows.concat([tot('Материалын дүн', c.mat + c.scrap + c.trans)]));
  }
  if (q.cons.length) { D.h2(sec('Consumable')); D.table(lineCols, lineRows(q.cons).concat([tot('Consumable дүн', c.cons)])); }
  if (c.laborTotal) {
    D.h2(sec('Ажиллах хүч'));
    D.table([{ t: '№', w: 8, m: 1 }, { t: 'Үе шат' }, { t: 'Хүн', w: 14, a: 'r', m: 1 }, { t: 'Нийт цаг', w: 20, a: 'r', m: 1 }, { t: 'Ц/х, ₮', w: 24, a: 'r', m: 1 }, { t: 'Дүн, ₮', w: 28, a: 'r', m: 1 }],
      c.labor.filter(l => l.cost).map((l, i) => [i + 1, l.name, l.people, nf(l.h, 1), money(c.rate * k), money(l.cost * k)]).concat([{ bold: 1, fill: DC.soft, cells: ['', 'Ажиллах хүчний дүн', '', nf(c.laborH, 1), '', money(c.laborTotal * k)] }]));
  }
  const erows = lineRows(q.equipRows); if (c.equipPctV) erows.push(['', `Тоног төхөөрөмжийн элэгдэл (${q.equipPct}%)`, '', '', '', money(c.equipPctV * k)]);
  if (erows.length) { D.h2(sec('Тоног төхөөрөмж, үйлчилгээ')); D.table(lineCols, erows.concat([tot('Тоног, үйлчилгээний дүн', c.equip)])); }
  if (q.other.length) { D.h2(sec('Бусад')); D.table(lineCols, lineRows(q.other).concat([tot('Бусад дүн', c.other)])); }
  D.h2('Нийт дүн');
  const lines = [];
  if (!q.spread) { lines.push(['Өртөг', money(c.cost)]); lines.push(['Удирдлага, ашиг', money(c.profit)]); }
  lines.push(['Үнийн санал (НӨАТ-гүй)', money(c.net), true], [`НӨАТ ${q.vat}%`, money(c.vat)], ['НИЙТ ТӨЛӨХ ДҮН', money(c.total) + ' ₮', true, '#f9d9c2']);
  D.totals(lines, { w: 100 });
  const cond = [sc.incl ? 'Үнэд орсон: ' + sc.incl : '', sc.excl ? 'Үнэд ороогүй: ' + sc.excl : '', q.pay ? 'Төлбөрийн нөхцөл: ' + q.pay : '', `Санал ${until ? until + ' хүртэл' : q.valid + ' хоног'} хүчинтэй.`, q.note].filter(Boolean);
  D.box('НӨХЦӨЛ', cond);
  D.sigs(['Бэлтгэсэн (Kh International)', 'Хянасан', 'Захиалагч зөвшөөрсөн']);
  return D;
}
/* internal costing — the «Зардал & хүчин» sheet */
async function costDoc(job) {
  jx(job); const q = job.quote, c = quoteCalc(job);
  const D = await kdoc({ title: 'ЗАРДАЛ & АЖИЛЛАХ ХҮЧНИЙ ТООЦООЛОЛ', sub: `${job.no} · дотоод · ${today()}` });
  D.kv(docHeadKV(job).slice(0, 4), 2);
  const cols = [{ t: '№', w: 8, m: 1 }, { t: 'Нэр' }, { t: 'Тоо', w: 16, a: 'r', m: 1 }, { t: 'Нэгж', w: 14 }, { t: 'Нэгж үнэ, ₮', w: 24, a: 'r', m: 1 }, { t: 'Нийт, ₮', w: 26, a: 'r', m: 1 }, { t: 'Тайлбар', w: 36 }];
  const rows = arr => arr.map((r, i) => [i + 1, r.name, r.qty, r.unit, money(r.price), money((+r.qty || 0) * (+r.price || 0)), r.note || '']);
  const T = (l, v) => ({ bold: 1, fill: DC.soft, cells: ['', l, '', '', '', money(v), ''] });
  D.h2('A. Материал & худалдан авалт');
  D.table(cols, rows(q.mats).concat([T('Материалын дүн', c.mat), ['', '+ Тээвэр / хүргэлт', '', '', '', money(c.trans), ''], ['', `+ Хаягдал нөөц (${q.scrapPct}%)`, '', '', '', money(c.scrap), ''], ['', '+ Consumable', '', '', '', money(c.cons), ''], T('Материалын нийт дүн', c.matTotal)]));
  if (q.cons.length) { D.h2('Consumable задаргаа'); D.table(cols, rows(q.cons).concat([T('Consumable дүн', c.cons)])); }
  D.h2('B. Ажиллах хүчний тооцоолол', `цагийн хөлс ${money(q.rate)} × ${q.rateK} = ${money(c.rate)} ₮`);
  D.table([{ t: '№', w: 8, m: 1 }, { t: 'Үе шатны нэр' }, { t: 'Хүн', w: 14, a: 'r', m: 1 }, { t: 'Нэг хүний цаг', w: 22, a: 'r', m: 1 }, { t: 'Нийт цаг', w: 18, a: 'r', m: 1 }, { t: 'Ц/х, ₮', w: 22, a: 'r', m: 1 }, { t: 'Нийт цалин, ₮', w: 28, a: 'r', m: 1 }],
    c.labor.map((l, i) => [i + 1, l.name, l.people, l.hours, nf(l.h, 1), money(c.rate), money(l.cost)]).concat([{ bold: 1, fill: DC.soft, cells: ['', 'Хүчний нийт дүн', '', '', nf(c.laborH, 1), '', money(c.laborTotal)] }]));
  if (q.equipRows.length || c.equipPctV) { D.h2('Тоног төхөөрөмж, үйлчилгээ'); D.table(cols, rows(q.equipRows).concat([['', `Элэгдэл (${q.equipPct}% материалаас)`, '', '', '', money(c.equipPctV), ''], T('Тоног, үйлчилгээний дүн', c.equip)])); }
  if (q.other.length) { D.h2('Бусад зардал'); D.table(cols, rows(q.other).concat([T('Бусад дүн', c.other)])); }
  D.h2('C. Нийт зардлын дүгнэлт');
  D.totals([['1. Материалын нийт зардал', money(c.matTotal)], ['2. Ажиллах хүчний зардал', money(c.laborTotal)], ['3. Тоног төхөөрөмжийн зардал', money(c.equip)], ['4. Бусад зардал', money(c.other)], ['ӨРТӨГ (татваргүй)', money(c.cost), true], [`НӨАТ (${q.vat}%) өртгөөс`, money(c.cost * q.vat / 100)], ['Өртөг (татвартай)', money(c.cost * (1 + q.vat / 100))], ['ҮНИЙН САНАЛ (татвартай)', money(c.total), true], ['АШИГ', money(c.profit), true, c.profit < 0 ? '#fde7e7' : '#e6f4ea'], ['АШГИЙН ХУВЬ (саналаас)', c.net ? nf(c.profit / c.net * 100, 1) + '%' : '—']], { w: 120 });
  D.sigs(['Бэлтгэсэн', 'Хянасан (санхүү)', 'Батласан']);
  return D;
}
async function progDoc(job) {
  const P = progCalc(job), c = P.c, sc = job.scope;
  const D = await kdoc({ title: 'АЖЛЫН ЯВЦ & ЗАРДЛЫН ТАЙЛАН', sub: `${job.no} · ${today()}` });
  D.kv(docHeadKV(job).slice(0, 4).concat([['Гүйцэтгэл', `${nf(P.pct * 100, 0)}% (төлөвлөгөө ${nf(P.plan * 100, 0)}%)`], ['Тайлангийн огноо', today()]]), 2);
  D.h2('Үзүүлэлт');
  D.totals([['Төсөв (өртөг)', money(c.cost)], ['Зарцуулсан', money(P.AC)], ['Гүйцэтгэлийн үнэлгээ (EV)', money(P.EV)], ['CPI · SPI', `${P.CPI == null ? '—' : nf(P.CPI, 2)} · ${P.SPI == null ? '—' : nf(P.SPI, 2)}`], ['Эцсийн өртөг (таамаг)', money(P.EAC), true], ['Гэрээ (өөрчлөлт орсон)', money(P.price)], ['Таамаг ашиг', money(P.profitF), true, P.profitF < 0 ? '#fde7e7' : '#e6f4ea']], { w: 110 });
  D.h2('Үе шатны явц');
  D.table([{ t: 'Үе шат' }, { t: 'Төлөвлөсөн эхлэх', w: 26, m: 1 }, { t: 'Хоног', w: 12, a: 'r', m: 1 }, { t: 'Бодит эхэлсэн', w: 24, m: 1 }, { t: 'Бодит дууссан', w: 24, m: 1 }, { t: 'Гүйцэтгэл', w: 18, a: 'r', m: 1 }],
    sc.stages.map(s => [s.name, sc.start ? addDays(sc.start, (+s.start || 1) - 1) : s.start, s.dur, s.aStart || '', s.aEnd || '', (+s.pct || 0) + '%']));
  ganttDoc(D, job, P);
  D.h2('Зардал — төсөв ба бодит');
  D.table([{ t: 'Ангилал' }, { t: 'Төсөв, ₮', w: 32, a: 'r', m: 1 }, { t: 'Бодит, ₮', w: 32, a: 'r', m: 1 }, { t: 'Зөрүү, ₮', w: 30, a: 'r', m: 1 }, { t: '%', w: 16, a: 'r', m: 1 }],
    XCATS.map(([k, n]) => { const b = c.budget[k] || 0, a = P.act[k] || 0; return { cells: [n, money(b), money(a), money(a - b), b ? nf(a / b * 100, 0) : ''], fill: a > b && b ? '#fde7e7' : null }; }).concat([{ bold: 1, fill: DC.soft, cells: ['Нийт', money(c.cost), money(P.AC), money(P.AC - c.cost), c.cost ? nf(P.AC / c.cost * 100, 0) : ''] }]));
  if (job.prog.exp.length) {
    D.h2('Зарлагын бүртгэл');
    D.table([{ t: 'Огноо', w: 20, m: 1 }, { t: 'Ангилал', w: 24 }, { t: 'Үе шат', w: 32 }, { t: 'Тайлбар' }, { t: 'Цаг', w: 12, a: 'r', m: 1 }, { t: 'Дүн, ₮', w: 26, a: 'r', m: 1 }, { t: 'Хариуцсан', w: 24 }],
      job.prog.exp.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).map(e => [e.date, xcat(e.cat), e.stage, e.desc, e.hours || '', money(expAmt(job, e)), e.who]).concat([{ bold: 1, fill: DC.soft, cells: ['', '', '', 'Нийт', '', money(P.AC), ''] }]));
  }
  D.sigs(['Бэлтгэсэн', 'Хянасан']);
  return D;
}
async function accDoc(job) {
  jx(job); const A = job.acc;
  const D = await kdoc({ title: 'ХҮЛЭЭН АВАЛТЫН АКТ & ӨӨРЧЛӨЛТИЙН БҮРТГЭЛ', sub: `${job.no} · ${today()}` });
  D.kv([['Төслийн нэр', job.title || '—'], ['Захиалагч', job.customer || '—'], ['Гэрээний дугаар', job.scope.contract || '—'], ['Дуусгасан огноо', A.done || '____ / ____ / ______']], 2);
  D.h2('A. Ажил хүлээн авалтын акт (sign-off)');
  D.table([{ t: '№', w: 8, m: 1 }, { t: 'Шалгах зүйл' }, { t: 'Шаардлага' }, { t: 'Үр дүн', w: 30, a: 'c' }, { t: 'Тайлбар', w: 40 }],
    A.checks.map((r, i) => [i + 1, r.item, r.req, r.res === 'yes' ? '☑ Тийм   ☐ Үгүй' : r.res === 'no' ? '☐ Тийм   ☑ Үгүй' : '☐ Тийм   ☐ Үгүй', r.note]), { minRh: 6.5 });
  D.sigs(['Гүйцэтгэгч (Kh International)', 'Захиалагч', 'Хяналт'], { names: A.names });
  D.h2('B. Өөрчлөлтийн бүртгэл (change log)');
  const rows = A.changes.length ? A.changes.map((c, i) => [i + 1, c.date, c.desc, c.reason, c.impact, money(c.cost), c.ok ? '☑' : '☐', c.note]) : Array.from({ length: 6 }, (_, i) => [i + 1, '', '', '', '', '', '☐', '']);
  D.table([{ t: '№', w: 8, m: 1 }, { t: 'Огноо', w: 20, m: 1 }, { t: 'Өөрчлөлтийн тайлбар' }, { t: 'Шалтгаан', w: 30 }, { t: 'Нөлөөлөл', w: 26 }, { t: 'Зардал, ₮', w: 24, a: 'r', m: 1 }, { t: 'Зөвш.', w: 12, a: 'c' }, { t: 'Тайлбар', w: 24 }],
    rows.concat([{ bold: 1, fill: DC.soft, cells: ['', '', 'НИЙТ НЭМЭЛТ ЗАРДАЛ', '', '', money(A.changes.reduce((a, c) => a + (+c.cost || 0), 0)), '', ''] }]), { minRh: 6.5 });
  return D;
}
