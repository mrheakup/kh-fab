/* ================= Kh International — Худалдан авалт (ISO 9001 §8.4 гаднаас нийлүүлэгдэх)
   Хэрэгцээ (MRP: доод хэмжээ + үйлдвэрлэлийн захиалгын материал − үлдэгдэл − ирэх) → Худалдан авалтын захиалга (PO) → нийлүүлэгч →
   хүлээн авах (агуулахын орлого, хайлалтын дугаар/гэрчилгээ, VIR шалгалт, ажилд шууд) → нийлүүлэгчийн үнэлгээ ================= */
const PV = { tab: 'po', sel: null, q: '', f: 'open' };
try { const o = JSON.parse(localStorage.getItem('kh-pv') || '{}'); if (o.tab) PV.tab = o.tab; } catch (e) { }
const pvSave = () => { try { localStorage.setItem('kh-pv', JSON.stringify({ tab: PV.tab })); } catch (e) { } };
const pos = () => (Array.isArray(S.pos) ? S.pos : (S.pos = []));
const PO_ST = [['draft', 'Ноорог', 'draft'], ['sent', 'Илгээсэн', 'sent'], ['part', 'Хэсэгчлэн ирсэн', 'open'], ['recv', 'Бүрэн ирсэн', 'done'], ['cancel', 'Цуцалсан', 'late']];
const poLeft = l => Math.max(0, (+l.qty || 0) - (+l.recv || 0));
const poSum = p => (p.lines || []).reduce((a, l) => a + (+l.qty || 0) * (+l.price || 0), 0);
const poLate = p => ['sent', 'part'].includes(p.status) && p.need && p.need < today();
/* ordered but not yet received, per warehouse item */
function poOnOrder() { const M = {}; pos().filter(p => ['sent', 'part'].includes(p.status)).forEach(p => (p.lines || []).forEach(l => { if (l.stk) M[l.stk] = (M[l.stk] || 0) + poLeft(l); })); return M; }
function newPO(d) {
  const p = Object.assign({ id: uid(), no: mfNo('PO'), sup: '', contact: '', date: today(), need: addDays(today(), 7), status: 'draft', vat: 10, terms: 'Төлбөр: нэхэмжлэх ирснээс хойш 14 хоногт', deliv: 'Kh International үйлдвэр, Сонгинохайрхан дүүрэг', lines: [], note: '', by: S.me || '', appr: '', recvs: [], log: [] }, d || {});
  mfLog(p, 'Үүсгэсэн'); pos().unshift(p); save(); return p;
}
/* ---------- MRP: what has to be bought ---------- */
function poNeeds() {
  const oo = poOnOrder(), need = {}, add = (it, q, why) => { if (!it) return; const n = need[it.id] || (need[it.id] = { it, req: 0, why: [] }); n.req += q; if (why) n.why.push(why); };
  /* materials of open manufacturing orders that are not issued yet */
  (typeof mos === 'function' ? mos() : []).filter(m => ['draft', 'plan', 'run'].includes(m.status)).forEach(m => (m.mats || []).forEach(x => { if (x.stk && !x.mv && +x.qty > 0) add(stkFind(x.stk), +x.qty, `${m.no} × ${x.qty}`); }));
  const R = [];
  stk().forEach(it => {
    const n = need[it.id], have = +it.qty || 0, ord = oo[it.id] || 0, req = n ? n.req : 0, min = +it.min || 0;
    const short = Math.max(0, req + min - have - ord); if (short <= 0) return;
    const sug = Math.max(short, min > 0 ? Math.ceil(min * 2 + req - have - ord) : short);
    R.push({ it, have, ord, req, min, short: Math.round(short * 1000) / 1000, sug: Math.round(sug * 1000) / 1000, why: (n ? n.why : []).concat(min && have + ord - req < min ? [`доод хэмжээ ${min}`] : []) });
  });
  return R.sort((a, b) => b.req - a.req || a.it.name.localeCompare(b.it.name));
}
/* ---------- supplier evaluation (ISO 9001 §8.4.1) ---------- */
function poSupEval() {
  const M = {};
  pos().filter(p => p.sup && p.status !== 'cancel').forEach(p => {
    const s = M[p.sup] || (M[p.sup] = { sup: p.sup, n: 0, sum: 0, recv: 0, onTime: 0, lead: [], vir: 0, virFail: 0, ncr: 0, last: '' });
    s.n++; s.sum += poSum(p); if (p.date > s.last) s.last = p.date;
    const r = (p.recvs || [])[0]; if (r) { s.recv++; if (!p.need || r.date <= p.need) s.onTime++; s.lead.push(Math.round((new Date(r.date) - new Date(p.date)) / 864e5)); }
    (typeof qcs === 'function' ? qcs() : []).filter(q => q.po === p.id && q.res).forEach(q => { s.vir++; if (q.res === 'fail') s.virFail++; });
  });
  const heatSup = {}; (S.certs || []).forEach(c => { if (c.sup) heatSup[lc(c.heat)] = c.sup; });
  (typeof ncrs === 'function' ? ncrs() : []).filter(n => n.src === 'sup').forEach(n => { const sp = n.sup || heatSup[lc(n.heat || '')]; if (sp && M[sp]) M[sp].ncr++; });
  return Object.values(M).map(s => { const ot = s.recv ? s.onTime / s.recv * 100 : null, qu = s.vir ? (s.vir - s.virFail) / s.vir * 100 : 100, q2 = Math.max(0, qu - s.ncr * 10), sc = ot == null ? null : Math.round(ot * 0.5 + q2 * 0.5);
    return Object.assign(s, { ot, qu: q2, score: sc, grade: sc == null ? '—' : sc >= 90 ? 'A' : sc >= 75 ? 'B' : 'C', leadAvg: s.lead.length ? Math.round(s.lead.reduce((a, b) => a + b, 0) / s.lead.length) : null }); }).sort((a, b) => b.sum - a.sum);
}

/* ---------- page ---------- */
const PO_TABS = [['po', 'Худалдан авалтын захиалга'], ['need', 'Хэрэгцээ (MRP)'], ['sup', 'Нийлүүлэгчийн үнэлгээ']];
function renderPoSide() { const b = $('#poList'); if (!b) return; const N = poNeeds().length, L = pos().filter(poLate).length; b.innerHTML = PO_TABS.map(([k, n]) => `<div class="engitem${PV.tab === k ? ' on' : ''}" data-pvt="${k}"><b>${esc(n)}</b>${k === 'need' && N ? `<span class="mono muted">${N}</span>` : k === 'po' && L ? `<span class="mono late">${L}</span>` : ''}</div>`).join(''); b.querySelectorAll('[data-pvt]').forEach(x => x.addEventListener('click', () => { PV.tab = x.dataset.pvt; PV.sel = null; pvSave(); renderPo(); })); }
function renderPo() {
  renderPoSide(); const el = $('#poMain'); if (!el) return;
  if (PV.tab === 'need') poNeedPage(el); else if (PV.tab === 'sup') poSupPage(el); else { const p = PV.sel && pos().find(x => x.id === PV.sel); p ? poForm(el, p) : poList(el); }
  if (typeof erpOn === 'function' && erpOn() && typeof erpNav === 'function') erpNav();
}
const poGo = (tab, sel) => { PV.tab = tab; pvSave(); if (typeof erpOn === 'function' && erpOn()) erpGo(tab === 'po' ? 'po' : 'po:' + tab, { keep: 1 }); else setModule('po'); PV.sel = sel || null; renderPo(); };
function poList(el) {
  const A = pos(), F = { open: p => ['draft', 'sent', 'part'].includes(p.status), late: poLate, recv: p => p.status === 'recv' };
  const R = A.filter(p => (!PV.f || !F[PV.f] || F[PV.f](p)) && mfMatch(p, [p.no, p.sup, (p.lines || []).map(l => l.desc || stkName(stkFind(l.stk))).join(' ')], PV));
  mfListPage(el, { st: PV, rr: renderPo, main: '#poMain', title: 'Худалдан авалтын захиалга', ph: 'Хайх: PO дугаар, нийлүүлэгч, бараа…', rows: R,
    right: '<button class="btn primary" id="poNew">+ Худалдан авалтын захиалга</button><button class="btn" id="poNeedGo">Хэрэгцээ (MRP) →</button>',
    chips: [['open', 'Нээлттэй', A.filter(F.open).length], ['late', 'Хоцорсон', A.filter(F.late).length], ['recv', 'Ирсэн', A.filter(F.recv).length]],
    cols: [['no', 'Дугаар', '', p => `<b class="mono">${esc(p.no)}</b>`], ['sup', 'Нийлүүлэгч', '', p => esc(p.sup || '—')], ['d', 'Огноо', '', p => `<span class="num">${esc(p.date)}</span>`], ['n', 'Ирэх хугацаа', '', p => `<span class="num${poLate(p) ? ' late' : ''}">${esc(p.need || '')}</span>`],
      ['l', 'Бараа', '', p => esc((p.lines || []).slice(0, 2).map(l => l.desc || stkName(stkFind(l.stk))).join(', ') + ((p.lines || []).length > 2 ? ` +${p.lines.length - 2}` : ''))],
      ['r', 'Ирсэн', 'r', p => { const q = (p.lines || []).reduce((a, l) => a + (+l.qty || 0), 0), r = (p.lines || []).reduce((a, l) => a + Math.min(+l.qty || 0, +l.recv || 0), 0); const pc = q ? r / q * 100 : 0; return `<div class="erp-prog"><i><b style="width:${Math.round(pc)}%"></b></i><span>${Math.round(pc)}%</span></div>`; }],
      ['s', 'Дүн, ₮', 'r', p => `<span class="num">${money(poSum(p))}</span>`], ['st', 'Төлөв', '', p => { const s = stOf(PO_ST, p.status); return mfB(s[2], s[1]); }]],
    foot: `<td colspan="6">${R.length} захиалга</td><td class="r num">${money(R.reduce((a, p) => a + poSum(p), 0))}</td><td></td>`,
    empty: 'Худалдан авалтын захиалга алга', emptyHint: ' «Хэрэгцээ (MRP)» хуудаснаас дутуу материалыг сонгож захиалга үүсгэнэ, эсвэл гараар.' });
  el.querySelector('#poNew').addEventListener('click', () => { const p = newPO({}); PV.sel = p.id; renderPo(); });
  el.querySelector('#poNeedGo').addEventListener('click', () => poGo('need'));
}
const PO_LCOLS = () => [{ k: 'desc', t: 'Бараа / тодорхойлолт', list: 'dl-postk' }, { k: 'mat', t: 'Марк', w: 90, list: 'dl-pomat' }, { k: 'thk', t: 'Зузаан', num: 1, w: 64 }, { k: 'size', t: 'Хэмжээ', w: 110 }, { k: 'qty', t: 'Тоо', num: 1, w: 70 }, { k: 'unit', t: 'Нэгж', w: 56 }, { k: 'price', t: 'Нэгж үнэ, ₮', num: 1, w: 110 },
  { k: 'sum', t: 'Дүн, ₮', calc: l => money((+l.qty || 0) * (+l.price || 0)) }, { k: 'job', t: 'Ажилд шууд', sel: [['', '— агуулахад —']].concat(mfJobs().filter(j => !['done', 'given'].includes(j.status)).map(j => [j.id, `${j.no} · ${String(j.title || '').slice(0, 24)}`])) }, { k: 'recv', t: 'Ирсэн', calc: l => `<span class="${+l.recv >= +l.qty && +l.qty ? 'ok' : ''}">${nf(+l.recv || 0, 2)}</span>` }];
function poForm(el, p) {
  const st = stOf(PO_ST, p.status), sum = poSum(p), vat = sum * (+p.vat || 0) / 100, ord = pos().map(x => x.id), idx = ord.indexOf(p.id), O = orgs().slice().sort((a, b) => a.name.localeCompare(b.name));
  let acts = '';
  if (p.status === 'draft') acts = '<button class="btn primary" data-pst="sent">Батлах, илгээсэн гэж тэмдэглэх</button>';
  if (['sent', 'part'].includes(p.status)) acts = '<button class="btn primary" id="poRecv">⇩ Бараа хүлээн авах</button><button class="btn" data-pst="draft">Ноорог руу</button>';
  if (p.status !== 'cancel' && p.status !== 'recv') acts += '<button class="btn ghost" data-pst="cancel">Цуцлах</button>'; else if (p.status === 'cancel') acts = '<button class="btn" data-pst="draft">Сэргээх</button>';
  el.innerHTML = mfFormTop({ crumbs: [['Худалдан авалтын захиалга'], [p.no]],
    right: `<span class="erp-pager">${idx + 1} / ${ord.length}<button data-ppg="-1"${idx <= 0 ? ' disabled' : ''}>‹</button><button data-ppg="1"${idx >= ord.length - 1 ? ' disabled' : ''}>›</button></span><button class="btn" data-poout="pdf">PO PDF</button><button class="btn ghost" data-poout="print">🖨</button><button class="btn ghost" id="poDel">Устгах</button>`,
    acts, stages: PO_ST.filter(s => s[0] !== 'cancel' || p.status === 'cancel').map(([k, n], i, L) => `<button class="${k === p.status ? 'on' : i < L.findIndex(x => x[0] === p.status) ? 'past' : ''}">${esc(n)}</button>`).join('') }) + `<div class="mf-body">
    ${poLate(p) ? `<div class="mf-warn"><b>Ирэх хугацаа хэтэрсэн</b> (${esc(p.need)}). Нийлүүлэгчтэй холбогдоно уу — нийлүүлэгчийн үнэлгээнд тооцогдоно.</div>` : ''}
    ${mfCard('Нийлүүлэгч, нөхцөл', `<div class="jgrid">${fldIn('po_sup', 'Нийлүүлэгч', p.sup, { list: 'dl-posup', cls: 'grow' })}${fldIn('po_contact', 'Холбоо барих хүн, утас', p.contact, { cls: 'grow' })}${fldIn('po_date', 'Захиалсан огноо', p.date, { type: 'date' })}${fldIn('po_need', 'Ирэх хугацаа', p.need, { type: 'date' })}${fldIn('po_vat', 'НӨАТ, %', p.vat, { num: 1 })}
      ${fldIn('po_deliv', 'Хүргэх хаяг', p.deliv, { cls: 'grow' })}${fldIn('po_terms', 'Төлбөрийн нөхцөл', p.terms, { cls: 'grow' })}${mfSel('po_by', mfPeople(), p.by, 'Захиалсан')}${mfSel('po_appr', mfPeople(), p.appr, 'Баталсан')}</div>${fldIn('po_note', 'Шаардлага (EN 10204 3.1 гэрчилгээ, тэмдэглэгээ, савлагаа…)', p.note, { area: 1, rows: 2 })}
      <datalist id="dl-posup">${O.map(o => `<option value="${esc(o.name)}">`).join('')}</datalist>`)}
    ${mfCard('Бараа', `${edTable('pol', PO_LCOLS(), p.lines || [], { extra: '<button class="btn sm" id="poAddNeed">+ Хэрэгцээнээс нэмэх</button>' })}
      <datalist id="dl-postk">${stk().map(it => `<option value="${esc(stkName(it))}">${esc(it.mat || '')} ${it.thk ? it.thk + 'мм' : ''} · үлд. ${nf(+it.qty || 0, 2)} ${esc(it.unit)}</option>`).join('')}</datalist>
      <datalist id="dl-pomat">${(S.materials || []).map(m => `<option value="${esc(m.name)}">`).join('')}</datalist>
      <div class="mf-tot"><span>Дүн <b class="mono">${money(sum)}</b></span><span>НӨАТ ${+p.vat || 0}% <b class="mono">${money(vat)}</b></span><span class="big">Нийт <b class="mono">${money(sum + vat)} ₮</b></span></div>
      <p class="note">Агуулахын бараатай нэрээр таарвал хүлээн авахад тэр бараанд орлого орно; таарахгүй бол шинэ бараа үүснэ. «Ажилд шууд» сонгосон мөр ирэнгүүт тухайн ажлын зардалд орно.</p>`, `<span class="mono">${(p.lines || []).length} мөр</span>`)}
    ${(p.recvs || []).length ? mfCard('Хүлээн авалт', `<div class="tblwrap"><table class="dt"><thead><tr><th>Огноо</th><th>Хүлээн авсан</th><th>Бараа</th><th class="r">Тоо</th><th>Хайлалт / гэрчилгээ</th><th>Шалгалт</th></tr></thead><tbody>${p.recvs.flatMap(r => r.lines.map(x => { const l = (p.lines || []).find(y => y.id === x.lid) || {}, q = x.qc && qcs().find(y => y.id === x.qc); return `<tr><td class="num">${esc(r.date)}</td><td>${esc(pName(r.by) || r.by || '')}</td><td>${esc(l.desc || '')}</td><td class="r num">${nf(+x.qty, 2)} ${esc(l.unit || '')}</td><td class="mono">${esc([x.heat, x.cert].filter(Boolean).join(' · '))}</td><td>${q ? `<button class="linkbtn" data-goqc="${q.id}">${esc(q.no)}</button> ${mfB(stOf(QC_RES, q.res)[2], stOf(QC_RES, q.res)[1])}` : ''}</td></tr>`; })).join('')}</tbody></table></div>`) : ''}
    ${mfCard('Түүх', mfLogHTML(p))}</div>`;
  const re = () => renderPo();
  mfBind(el, p, [['po_sup', 'sup'], ['po_contact', 'contact'], ['po_date', 'date'], ['po_need', 'need'], ['po_vat', 'vat', 1], ['po_deliv', 'deliv'], ['po_terms', 'terms'], ['po_by', 'by'], ['po_appr', 'appr'], ['po_note', 'note']], k => { if (k === 'sup' && p.sup) { const o = orgLearn({ org: p.sup }); if (o) { p.sup = o.name; o.supplier = true; if (!p.contact && o.persons && o.persons[0]) p.contact = [o.persons[0].name, o.persons[0].phone].filter(Boolean).join(', '); save(); re(); } } if (k === 'vat') re(); });
  bindEd(el, { pol: { arr: () => (p.lines = p.lines || []), cols: PO_LCOLS(), blank: () => ({ id: uid(), stk: '', desc: '', mat: '', thk: '', size: '', qty: 1, unit: 'ш', price: '', recv: 0, job: '' }), onDel: l => !(+l.recv > 0) || (toast('Ирсэн мөрийг устгахгүй'), false) } }, re,
    (id, l, k) => { if (k === 'desc') { const it = stk().find(x => lc(stkName(x)) === lc(l.desc) || lc(x.name) === lc(l.desc)); if (it) { l.stk = it.id; l.desc = stkName(it); l.mat = l.mat || it.mat || ''; l.thk = l.thk || it.thk || ''; l.size = l.size || it.size || ''; l.unit = it.unit || l.unit; if (!+l.price && +it.price) l.price = +it.price; } else l.stk = ''; } });
  el.querySelectorAll('[data-pst]').forEach(b => b.addEventListener('click', () => {
    const to = b.dataset.pst; if (to === 'sent') { if (!p.sup) { toast('Нийлүүлэгчийг бөглөнө үү'); return; } if (!(p.lines || []).some(l => +l.qty > 0)) { toast('Барааны мөр нэмнэ үү'); return; } }
    if (to === 'cancel' && !confirm(`${p.no}-г цуцлах уу?`)) return;
    mfLog(p, `${stOf(PO_ST, p.status)[1]} → ${stOf(PO_ST, to)[1]}`); p.status = to; save(); re(); }));
  const rv = el.querySelector('#poRecv'); if (rv) rv.addEventListener('click', () => poRecvDlg(p));
  el.querySelector('#poAddNeed').addEventListener('click', () => { const N = poNeeds(); if (!N.length) { toast('Дутуу материал алга'); return; } const have = new Set((p.lines || []).map(l => l.stk)); let n = 0; N.filter(x => !have.has(x.it.id)).forEach(x => { p.lines.push(poLineOf(x)); n++; }); mfLog(p, `Хэрэгцээнээс ${n} мөр`); save(); toast(n ? `${n} мөр нэмэгдлээ` : 'Бүгд аль хэдийн орсон'); re(); });
  el.querySelectorAll('[data-goqc]').forEach(b => b.addEventListener('click', () => mfGo('qc', b.dataset.goqc)));
  el.querySelectorAll('[data-ppg]').forEach(b => b.addEventListener('click', () => { const n = ord[idx + +b.dataset.ppg]; if (n) { PV.sel = n; re(); } }));
  el.querySelectorAll('[data-poout]').forEach(b => b.addEventListener('click', () => docOut(b.dataset.poout, () => poDoc(p), `${p.no}_${p.sup || ''}`)));
  el.querySelector('#poDel').addEventListener('click', () => { if ((p.recvs || []).length) { toast('Хүлээн авалт хийгдсэн тул устгахгүй — «Цуцлах» ашиглана уу'); return; } if (!confirm(`${p.no}-г устгах уу?`)) return; S.pos = pos().filter(x => x !== p); PV.sel = null; save(); re(); });
  erpBindCrumbs(el, [['', () => { PV.sel = null; re(); }], ['']]);
}
const poLineOf = x => ({ id: uid(), stk: x.it.id, desc: stkName(x.it), mat: x.it.mat || '', thk: x.it.thk || '', size: x.it.size || '', qty: x.sug, unit: x.it.unit || 'ш', price: +x.it.price || '', recv: 0, job: '' });
/* receiving: stock in (moving average price), mill certificate per heat, incoming inspection, direct-to-job issue */
function poRecvDlg(p) {
  const L = (p.lines || []).filter(l => poLeft(l) > 0); if (!L.length) { toast('Ирэх үлдэгдэл алга'); return; }
  const dlg = document.createElement('div'); dlg.className = 'po-dlg';
  dlg.innerHTML = `<div class="po-dlgb"><div class="md-h"><b>${esc(p.no)} — бараа хүлээн авах</b><span class="sp"></span><button class="md-x">×</button></div>
    <div class="po-dlgc"><div class="jgrid">${fldIn('rv_date', 'Огноо', today(), { type: 'date' })}${mfSel('rv_by', mfPeople(), S.me || '', 'Хүлээн авсан')}</div>
    <div class="tblwrap"><table class="dt"><thead><tr><th>Бараа</th><th class="r">Үлдэгдэл</th><th class="r">Хүлээн авах</th><th>Хайлалтын дугаар</th><th>Гэрчилгээ №</th></tr></thead><tbody>${L.map(l => `<tr data-rl="${l.id}"><td>${esc(l.desc || '')}<div class="sub">${esc([l.mat, l.thk ? l.thk + 'мм' : '', l.size].filter(Boolean).join(' · '))}${l.job ? ' · ажилд шууд: ' + esc((findJob(l.job) || {}).no || '') : ''}</div></td><td class="r num">${nf(poLeft(l), 2)} ${esc(l.unit)}</td>
      <td class="r"><input class="mono" type="number" step="any" data-k="qty" value="${poLeft(l)}" style="width:90px;text-align:right"></td><td><input data-k="heat" placeholder="${l.mat || l.thk ? 'жишээ: 24A1187' : '—'}" style="width:130px"></td><td><input data-k="cert" placeholder="MTC / 3.1" style="width:120px"></td></tr>`).join('')}</tbody></table></div>
    <label class="chk" style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="rv_vir" checked> Хүлээн авах үзлэг (VIR) бүртгэл нээх — ISO 9001 §8.4.2</label></div>
    <div class="po-dlgf"><button class="btn" data-x="1">Болих</button><button class="btn primary" id="rv_ok">⇩ Хүлээн авах</button></div></div>`;
  document.body.appendChild(dlg); const close = () => dlg.remove(); dlg.querySelector('.md-x').onclick = close; dlg.querySelector('[data-x]').onclick = close;
  dlg.querySelector('#rv_ok').onclick = () => {
    const date = dlg.querySelector('#rv_date').value || today(), by = dlg.querySelector('#rv_by').value, vir = dlg.querySelector('#rv_vir').checked, rec = { date, by, lines: [] };
    dlg.querySelectorAll('[data-rl]').forEach(tr => {
      const l = p.lines.find(x => x.id === tr.dataset.rl), g = k => tr.querySelector(`[data-k="${k}"]`).value.trim(), q = +g('qty') || 0; if (!(q > 0)) return;
      let it = l.stk && stkFind(l.stk);
      if (!it) { it = stk().find(x => lc(stkName(x)) === lc(l.desc) || lc(x.name) === lc(l.desc)); if (!it) it = stkNew({ name: l.desc || 'Бараа', mat: l.mat || '', thk: +l.thk || '', size: l.size || '', unit: l.unit || 'ш', cat: +l.thk ? 'plate' : /труба|профиль|швеллер|уголок|двутавр|pipe|beam|tube|channel/i.test(l.desc) ? 'profile' : 'other' }); l.stk = it.id; }
      const heat = g('heat'), cert = g('cert');
      stkMove(it, 'in', q, { price: +l.price || 0, date, who: by, note: `${p.no} · ${p.sup}${heat ? ' · хайлалт ' + heat : ''}` });
      let cid = ''; if (heat) { const m = String(l.size || '').match(/(\d{3,5})\s*[x×*]\s*(\d{3,5})/); const c = { id: uid(), heat, cert, mat: l.mat || it.mat || '', thk: +l.thk || +it.thk || 0, L: m ? +m[2] > +m[1] ? +m[2] : +m[1] : 0, W: m ? Math.min(+m[1], +m[2]) : 0, qty: q, used: 0, sup: p.sup, date, po: p.id }; (S.certs = S.certs || []).unshift(c); cid = c.id; }
      if (l.job) { const mv = stkMove(it, 'out', q, { job: l.job, date, who: by, note: `${p.no} → ажилд шууд${heat ? ' · хайлалт ' + heat : ''}` }); if (mv && heat) { mv.heat = heat; mv.cert = cert; } }
      let qid = ''; if (vir && typeof newQC === 'function') { const qq = newQC({ type: 'VIR', item: `${l.desc || stkName(it)}${l.size ? ' · ' + l.size : ''}`, heat, job: l.job || '', po: p.id, note: `${p.no} · ${p.sup} · ${q} ${l.unit || ''}${cert ? ' · гэрчилгээ ' + cert : ''}`, insp: by || S.me || '' }); qid = qq.id; }
      l.recv = Math.round(((+l.recv || 0) + q) * 1000) / 1000; rec.lines.push({ lid: l.id, qty: q, heat, cert, cert_id: cid, qc: qid });
    });
    if (!rec.lines.length) { toast('Хүлээн авах тоо оруулна уу'); return; }
    (p.recvs = p.recvs || []).push(rec); p.status = (p.lines || []).every(l => poLeft(l) <= 0) ? 'recv' : 'part';
    mfLog(p, `Хүлээн авсан: ${rec.lines.length} мөр (${pName(by) || ''})`); save(); close(); toast(`⇩ ${rec.lines.length} мөр агуулахад орлоо${vir ? ' · VIR бүртгэл нээгдлээ' : ''}`); renderPo();
  };
}
async function poDoc(p) {
  const sum = poSum(p), vat = sum * (+p.vat || 0) / 100, co = typeof company === 'function' ? company() : {};
  const D = await kdoc({ title: 'ХУДАЛДАН АВАЛТЫН ЗАХИАЛГА', sub: `${p.no} · ${p.date}`, code: mfIso('formPO') || 'KH-PU-F01' });
  D.kv([['Захиалгын №', p.no], ['Огноо', p.date], ['Нийлүүлэгч', p.sup || '—'], ['Холбоо барих', p.contact || '—'], ['Захиалагч', co.name || 'Kh International'], ['Ирэх хугацаа', p.need || '—'], ['Хүргэх хаяг', p.deliv || '—'], ['Төлбөрийн нөхцөл', p.terms || '—']], 2);
  D.table([{ t: '№', w: 8, m: 1 }, { t: 'Бараа / тодорхойлолт' }, { t: 'Марк', w: 24 }, { t: 'Зузаан', w: 15, a: 'r', m: 1 }, { t: 'Хэмжээ', w: 28, m: 1 }, { t: 'Тоо', w: 16, a: 'r', m: 1 }, { t: 'Нэгж', w: 12 }, { t: 'Нэгж үнэ', w: 24, a: 'r', m: 1 }, { t: 'Дүн', w: 26, a: 'r', m: 1 }],
    (p.lines || []).map((l, i) => [i + 1, l.desc, l.mat, l.thk ? l.thk + ' мм' : '', l.size, nf(+l.qty || 0, 2), l.unit, l.price ? money(+l.price) : '', money((+l.qty || 0) * (+l.price || 0))]));
  D.totals([['Дүн', money(sum)], [`НӨАТ ${+p.vat || 0}%`, money(vat)], ['НИЙТ, ₮', money(sum + vat), 1]], { w: 90 });
  D.box('Шаардлага', [p.note || '—', 'Хавтан, профилийн материалд EN 10204 3.1 чанарын гэрчилгээ (хайлалтын дугаартай) заавал хавсаргана. Гэрчилгээгүй, тэмдэглэгээгүй материалыг хүлээн авахгүй.']);
  D.sigs(['Захиалсан', 'Баталсан', 'Нийлүүлэгч (хүлээн авсан)'], { names: [pName(p.by), pName(p.appr), ''] });
  return D;
}

/* ===== Хэрэгцээ (MRP) ===== */
function poNeedPage(el) {
  const N = poNeeds(), sel = PV.need || (PV.need = {}), O = orgs().filter(o => o.supplier).concat(orgs().filter(o => !o.supplier)).map(o => o.name);
  el.innerHTML = erpCP({ crumbs: [['Хэрэгцээ (MRP)']], right: `<input class="inp" id="ndSup" list="dl-ndsup" placeholder="Нийлүүлэгч" style="width:200px"><datalist id="dl-ndsup">${O.map(n => `<option value="${esc(n)}">`).join('')}</datalist><button class="btn primary" id="ndPO">Сонгосноор PO үүсгэх</button>` }) + `<div class="mf-body">
    <div class="mf-info">Хэрэгцээ = нээлттэй үйлдвэрлэлийн захиалгын олгогдоогүй материал + агуулахын доод хэмжээ − үлдэгдэл − захиалсан (ирэх). Санал болгосон тоо нь доод хэмжээний 2 дахинтай тэнцэх хүртэл нөхнө.</div>
    ${N.length ? `<div class="erp-list"><table><thead><tr><th style="width:30px"><input type="checkbox" id="ndAll"></th><th>Бараа</th><th>Шалтгаан</th><th class="r">Үлдэгдэл</th><th class="r">Ирэх</th><th class="r">Шаардлага</th><th class="r">Доод хэм.</th><th class="r">Дутуу</th><th class="r">Захиалах</th></tr></thead><tbody>
      ${N.map(x => `<tr data-nd="${x.it.id}"><td><input type="checkbox" data-ndc${sel[x.it.id] !== false ? ' checked' : ''}></td><td><b>${esc(stkName(x.it))}</b><div class="sub">${esc([x.it.mat, x.it.thk ? x.it.thk + 'мм' : '', x.it.size].filter(Boolean).join(' · '))}</div></td><td class="sub">${esc(x.why.join(', '))}</td><td class="r num">${nf(x.have, 2)}</td><td class="r num">${x.ord ? nf(x.ord, 2) : ''}</td><td class="r num">${x.req ? nf(x.req, 2) : ''}</td><td class="r num">${x.min || ''}</td><td class="r num late">${nf(x.short, 2)}</td><td class="r"><input class="mono" type="number" step="any" data-ndq value="${PV.nq && PV.nq[x.it.id] != null ? PV.nq[x.it.id] : x.sug}" style="width:80px;text-align:right"> ${esc(x.it.unit)}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="erp-empty"><b>Дутуу материал алга</b>Агуулахын барааны «Доод хэмжээ»-г тохируулж, үйлдвэрлэлийн захиалгад материал нэмбэл энд гарна.</div>'}</div>`;
  PV.nq = PV.nq || {};
  el.querySelectorAll('[data-nd]').forEach(tr => { const id = tr.dataset.nd; tr.querySelector('[data-ndc]').addEventListener('change', e => { sel[id] = e.target.checked; }); tr.querySelector('[data-ndq]').addEventListener('change', e => { PV.nq[id] = +e.target.value || 0; }); });
  const all = el.querySelector('#ndAll'); if (all) all.addEventListener('change', () => { el.querySelectorAll('[data-nd]').forEach(tr => { sel[tr.dataset.nd] = all.checked; tr.querySelector('[data-ndc]').checked = all.checked; }); });
  el.querySelector('#ndPO').addEventListener('click', () => {
    const pick = N.filter(x => sel[x.it.id] !== false); if (!pick.length) { toast('Бараа сонгоно уу'); return; }
    const sup = el.querySelector('#ndSup').value.trim(), p = newPO({ sup }); p.lines = pick.map(x => Object.assign(poLineOf(x), { qty: PV.nq[x.it.id] != null ? PV.nq[x.it.id] : x.sug })); if (sup) { const o = orgLearn({ org: sup }); if (o) { o.supplier = true; p.sup = o.name; } }
    mfLog(p, `Хэрэгцээнээс ${p.lines.length} мөр`); save(); PV.need = {}; PV.nq = {}; poGo('po', p.id); toast(`${p.no} үүслээ`);
  });
}
/* ===== Нийлүүлэгчийн үнэлгээ ===== */
function poSupPage(el) {
  const E = poSupEval();
  el.innerHTML = erpCP({ crumbs: [['Нийлүүлэгчийн үнэлгээ']], right: '<button class="btn" data-spout="pdf">Үнэлгээ PDF</button><button class="btn ghost" data-spout="print">🖨</button>' }) + `<div class="mf-body">
    <div class="mf-info">ISO 9001 §8.4.1 — гаднаас нийлүүлэгчийг хугацаандаа нийлүүлэлт (50%) ба чанар (VIR тэнцсэн %, нийлүүлэгчийн NCR бүр −10) (50%)-аар үнэлнэ. A ≥ 90 — батлагдсан, B ≥ 75 — хяналттай, C — сайжруулах / солих.</div>
    ${E.length ? `<div class="erp-list"><table><thead><tr><th>Нийлүүлэгч</th><th class="r">PO</th><th class="r">Нийт дүн, ₮</th><th class="r">Хугацаандаа</th><th class="r">Дундаж хугацаа</th><th class="r">VIR тэнцсэн</th><th class="r">NCR</th><th class="r">Оноо</th><th>Зэрэг</th><th>Сүүлд</th></tr></thead><tbody>
      ${E.map(s => `<tr><td><b>${esc(s.sup)}</b></td><td class="r num">${s.n}</td><td class="r num">${money(s.sum)}</td><td class="r num">${s.ot == null ? '—' : Math.round(s.ot) + '%'}</td><td class="r num">${s.leadAvg == null ? '—' : s.leadAvg + ' хоног'}</td><td class="r num">${s.vir ? Math.round((s.vir - s.virFail) / s.vir * 100) + '%' : '—'}</td><td class="r num${s.ncr ? ' late' : ''}">${s.ncr || ''}</td><td class="r num"><b>${s.score == null ? '—' : s.score}</b></td><td>${s.grade === '—' ? '<span class="sub">хүлээн авалт алга</span>' : mfB(s.grade === 'A' ? 'done' : s.grade === 'B' ? 'open' : 'late', s.grade)}</td><td class="num">${esc(s.last)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="erp-empty"><b>Үнэлгээ алга</b>Худалдан авалтын захиалга үүсгэж, бараа хүлээн авбал нийлүүлэгч бүрийн үнэлгээ автоматаар гарна.</div>'}</div>`;
  el.querySelectorAll('[data-spout]').forEach(b => b.addEventListener('click', () => docOut(b.dataset.spout, async () => { const D = await kdoc({ title: 'НИЙЛҮҮЛЭГЧИЙН ҮНЭЛГЭЭ', sub: today(), code: mfIso('formSup') || 'KH-PU-F02', landscape: true }); D.para('ISO 9001:2015 §8.4.1. Хугацаандаа нийлүүлэлт 50% + чанар 50%. A ≥ 90 батлагдсан, B ≥ 75 хяналттай, C сайжруулах / солих.', { size: 2.8 }); D.table([{ t: 'Нийлүүлэгч' }, { t: 'PO', w: 14, a: 'r' }, { t: 'Нийт дүн', w: 34, a: 'r', m: 1 }, { t: 'Хугацаандаа', w: 24, a: 'r' }, { t: 'Дундаж хугацаа', w: 28, a: 'r' }, { t: 'VIR тэнцсэн', w: 24, a: 'r' }, { t: 'NCR', w: 14, a: 'r' }, { t: 'Оноо', w: 16, a: 'r' }, { t: 'Зэрэг', w: 16, a: 'c' }], E.map(s => [s.sup, s.n, money(s.sum), s.ot == null ? '—' : Math.round(s.ot) + '%', s.leadAvg == null ? '—' : s.leadAvg + ' хоног', s.vir ? Math.round((s.vir - s.virFail) / s.vir * 100) + '%' : '—', s.ncr || '', s.score == null ? '—' : s.score, s.grade])); D.sigs(['Үнэлсэн', 'Баталсан']); return D; }, 'Нийлүүлэгчийн_үнэлгээ')));
}
{ const _smP = setModule; setModule = function (v) { _smP(v); const on = v === 'po', sd = $('#poSide'), mn = $('#poMain'); if (sd) sd.hidden = !on; if (mn) mn.hidden = !on; if (on) renderPo(); }; }
