/* ================= Kh International — warehouse (Агуулах): stock on hand, receipts, issues to jobs, counts =================
   Items: plates, profiles, consumables, other. Every move is logged (орлого / зарлага / тооллого).
   Issuing to a job also books the cost in that job's «Явц, зардал» expenses, so actual cost follows the warehouse. */
const STK_CAT = [['plate', 'Хавтан'], ['profile', 'Профиль, труба'], ['cons', 'Consumable'], ['part', 'Худалдан авсан эд анги'], ['other', 'Бусад']];
const STK_EXP = { plate: 'mat', profile: 'mat', part: 'mat', cons: 'cons', other: 'other' };
const SK = { sel: null, q: '', cat: '', low: false };
const stk = () => (S.stock = Array.isArray(S.stock) ? S.stock : []);
const stkMoves = () => (S.stockMoves = Array.isArray(S.stockMoves) ? S.stockMoves : []);
const stkFind = id => stk().find(x => x.id === id);
const stkLow = it => +it.min > 0 && +it.qty <= +it.min;
const stkName = it => it ? [it.name, it.cat === 'plate' && it.thk ? `${it.thk}мм` : ''].filter(Boolean).join(' ') : '—';
function stkNew(d) { const it = Object.assign({ id: uid(), code: '', name: '', cat: 'plate', mat: '', thk: '', size: '', unit: 'ш', qty: 0, min: 0, price: 0, loc: '', note: '', added: today() }, d || {}); stk().unshift(it); save(); return it; }
/* one movement; type: in (орлого) / out (зарлага) / adj (тооллого: qty = counted) */
function stkMove(it, type, qty, o = {}) {
  qty = +qty || 0; if (!it || (!qty && type !== 'adj')) return null;
  const before = +it.qty || 0, after = type === 'in' ? before + qty : type === 'out' ? before - qty : qty;
  if (type === 'in' && +o.price > 0) { it.price = before > 0 && +it.price > 0 ? Math.round((before * it.price + qty * o.price) / (before + qty)) : +o.price; }   // moving average
  it.qty = Math.round(after * 1000) / 1000;
  const m = { id: uid(), date: o.date || today(), item: it.id, type, qty: type === 'adj' ? Math.round((after - before) * 1000) / 1000 : qty, after: it.qty, price: +o.price || +it.price || 0, job: o.job || '', who: o.who || S.me || '', note: o.note || '', doc: o.doc || '' };
  stkMoves().unshift(m);
  if (type === 'out' && o.job) { const j = findJob(o.job); if (j) { jx(j); j.prog.exp.push({ date: m.date, cat: STK_EXP[it.cat] || 'mat', stage: '', desc: `Агуулахаас: ${stkName(it)} × ${qty} ${it.unit}`, hours: '', amount: Math.round(qty * (+it.price || 0)), who: m.who ? pName(m.who) || m.who : '', stk: m.id }); jobLog(`Агуулахаас зарлагадсан: ${stkName(it)} × ${qty} ${it.unit}`, j); } }
  save(); return m;
}
/* ---------- side list ---------- */
function renderWhSide() {
  const box = $('#skList'); if (!box) return; const q = lc(SK.q);
  const L = stk().filter(it => (!SK.cat || it.cat === SK.cat) && (!SK.low || stkLow(it)) && (!q || lc([it.code, it.name, it.mat, it.thk, it.size, it.loc].join(' ')).includes(q)));
  const lowN = stk().filter(stkLow).length, lb = $('#skLowN'); if (lb) lb.textContent = lowN ? `(${lowN})` : '';
  box.innerHTML = L.map(it => `<div class="bitem fmi${SK.sel === it.id ? ' on' : ''}" data-sk="${it.id}"><div style="min-width:0"><div class="t">${esc(stkName(it))}${it.size ? ` <span class="muted">${esc(it.size)}</span>` : ''}</div><div class="m"><b class="${stkLow(it) ? 'late' : ''}">${nf(+it.qty || 0, it.unit === 'кг' || it.unit === 'м' ? 1 : 0)} ${esc(it.unit)}</b>${it.loc ? ' · ' + esc(it.loc) : ''}${stkLow(it) ? ' · ⚠ доод хэмжээ ' + it.min : ''}</div></div></div>`).join('') || '<p class="note">Бараа алга. «+ Бараа» эсвэл «Сангаас нэмэх».</p>';
}
(() => {
  const n = $('#skNew'); if (n) n.addEventListener('click', () => { const it = stkNew({ name: '' }); SK.sel = it.id; renderWh(); setTimeout(() => { const i = $('#sk_name'); if (i) i.focus(); }, 60); });
  const s = $('#skQ'); if (s) s.addEventListener('input', () => { SK.q = s.value; renderWhSide(); });
  const c = $('#skCat'); if (c) { c.innerHTML = '<option value="">Бүх төрөл</option>' + STK_CAT.map(([k, n]) => `<option value="${k}">${n}</option>`).join(''); c.addEventListener('change', () => { SK.cat = c.value; renderWhSide(); }); }
  const lw = $('#skLow'); if (lw) lw.addEventListener('change', () => { SK.low = lw.checked; renderWhSide(); });
  const l = $('#skList'); if (l) l.addEventListener('click', e => { const it = e.target.closest('[data-sk]'); if (!it) return; SK.sel = it.dataset.sk; renderWh(); });
  const fc = $('#skFromCat'); if (fc) fc.addEventListener('click', () => stkFromCatalog());
})();
function renderWh() { renderWhSide(); renderWhMain($('#stockMain')); }
/* add catalogue entries (Үнийн сан) as warehouse items */
function stkFromCatalog() {
  const have = new Set(stk().map(it => lc(it.name))), C = CAT().filter(c => !have.has(lc(c.name)));
  const q = prompt(`Үнийн сангаас нэмэх — нэрний хэсгийг бичнэ үү (жишээ: «S355», «утас», «труба»).\nСанд ${C.length} бараа байна. Хоосон бол consumable бүгд.`, ''); if (q == null) return;
  const L = C.filter(c => q.trim() ? lc(c.name + ' ' + (c.grp || '')).includes(lc(q.trim())) : c.cat === 'cons').slice(0, 200);
  if (!L.length) { toast('Тохирох бараа олдсонгүй'); return; }
  if (!confirm(`${L.length} бараа агуулахад нэмэх үү? (Үлдэгдэл 0, дараа нь орлого авна)`)) return;
  L.forEach(c => stkNew({ name: c.name, cat: c.cat === 'cons' ? 'cons' : /труба|pipe|профиль|швеллер|уголок|двутавр|channel|angle|beam|tube/i.test(c.name) ? 'profile' : c.cat === 'mat' ? 'plate' : 'other', unit: c.unit || 'ш', price: Math.round(+c.price || 0), code: c.code || '' }));
  toast(`${L.length} бараа нэмэгдлээ`); renderWh();
}
/* ---------- main ---------- */
function renderWhMain(el) {
  if (!el) return; const it = stkFind(SK.sel);
  if (!it) {
    const L = stk(), val = L.reduce((a, x) => a + (+x.qty || 0) * (+x.price || 0), 0), low = L.filter(stkLow), mv = stkMoves().slice(0, 25);
    el.innerHTML = `<div class="dhead"><div><h2>Агуулах</h2><p class="muted">${L.length} бараа · үлдэгдлийн үнэ ${money(val)} ₮</p></div><span class="sp" style="flex:1"></span><button class="btn" id="skIn2">+ Орлого</button><button class="btn" id="skOut2">− Зарлага (ажилд)</button><button class="btn ghost" id="skXls">Excel</button></div>
      <div class="summary">${[['Бараа', L.length, 'нэр төрөл'], ['Үлдэгдлийн үнэ', money(val) + '<small>₮</small>', 'дундаж үнээр'], ['Доод хэмжээнд хүрсэн', `<span class="${low.length ? 'late' : ''}">${low.length}</span>`, low.slice(0, 3).map(stkName).join(', ') || 'алга'], ['Энэ сарын зарлага', money(stkMoves().filter(m => m.type === 'out' && String(m.date).slice(0, 7) === today().slice(0, 7)).reduce((a, m) => a + m.qty * m.price, 0)) + '<small>₮</small>', today().slice(0, 7)]].map(([k, v, s]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div><div class="muted" style="font-size:12px">${esc(String(s))}</div></div>`).join('')}</div>
      ${low.length ? `<div class="jcard"><div class="bcard-h">⚠ Захиалах шаардлагатай</div><div class="tblwrap" style="border:0"><table class="dt"><thead><tr><th>Бараа</th><th class="r">Үлдэгдэл</th><th class="r">Доод хэмжээ</th><th>Байршил</th></tr></thead><tbody>${low.map(x => `<tr class="jrow" data-sk="${x.id}" style="cursor:pointer"><td>${esc(stkName(x))}</td><td class="r num late">${x.qty} ${esc(x.unit)}</td><td class="r num">${x.min}</td><td>${esc(x.loc || '')}</td></tr>`).join('')}</tbody></table></div></div>` : ''}
      <div class="jcard"><div class="bcard-h">Сүүлийн хөдөлгөөн</div><div class="tblwrap" style="border:0"><table class="dt"><thead><tr><th>Огноо</th><th>Төрөл</th><th>Бараа</th><th class="r">Тоо</th><th class="r">Үлдэгдэл</th><th>Ажил</th><th>Тайлбар</th></tr></thead><tbody>
      ${mv.map(m => { const x = stkFind(m.item), j = m.job ? findJob(m.job) : null; return `<tr><td class="num">${esc(m.date)}</td><td>${m.type === 'in' ? '<span class="pill st-done">орлого</span>' : m.type === 'out' ? '<span class="pill qst-sent">зарлага</span>' : '<span class="pill">тооллого</span>'}</td><td>${esc(stkName(x))}</td><td class="r num">${m.qty > 0 && m.type !== 'out' ? '+' : m.type === 'out' ? '−' : ''}${Math.abs(m.qty)} ${esc(x ? x.unit : '')}</td><td class="r num">${m.after}</td><td class="num">${j ? esc(j.no) : ''}</td><td>${esc(m.note || '')}</td></tr>`; }).join('') || '<tr><td colspan="7" class="muted">Хөдөлгөөн алга</td></tr>'}
      </tbody></table></div></div>`;
    el.querySelectorAll('[data-sk]').forEach(r => r.addEventListener('click', () => { SK.sel = r.dataset.sk; renderWh(); }));
    el.querySelector('#skIn2').addEventListener('click', () => stkMoveDlg('in'));
    el.querySelector('#skOut2').addEventListener('click', () => stkMoveDlg('out'));
    el.querySelector('#skXls').addEventListener('click', stkExcel);
    return;
  }
  const mv = stkMoves().filter(m => m.item === it.id);
  el.innerHTML = `<div class="dhead"><div><h2>${esc(stkName(it) || 'Шинэ бараа')}</h2><p class="muted">Үлдэгдэл <b class="${stkLow(it) ? 'late' : ''}">${it.qty} ${esc(it.unit)}</b> · ${money((+it.qty || 0) * (+it.price || 0))} ₮</p></div><span class="sp" style="flex:1"></span>
    <button class="btn ghost" id="skBack">← Жагсаалт</button><button class="btn primary" data-skm="in">+ Орлого</button><button class="btn" data-skm="out">− Зарлага</button><button class="btn ghost" data-skm="adj">Тооллого</button><button class="btn ghost" id="skDel">Устгах</button></div>
    <div class="jcard"><div class="bcard-h">Бараа</div><div class="jbody"><div class="jgrid">
      ${fldIn('sk_name', 'Нэр', it.name, { list: 'dl-any' })}<label class="fld">Төрөл<select id="sk_cat">${STK_CAT.map(([k, n]) => `<option value="${k}"${it.cat === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>${fldIn('sk_code', 'Код', it.code)}
      ${fldIn('sk_mat', 'Материал (марк)', it.mat, { ph: 'S355, Hardox 450…' })}${fldIn('sk_thk', 'Зузаан, мм', it.thk, { num: 1 })}${fldIn('sk_size', 'Хэмжээ', it.size, { ph: '1500×6000, Ø89×5, L=6м' })}
      ${fldIn('sk_unit', 'Нэгж', it.unit, { ph: 'ш, кг, м, лист' })}${fldIn('sk_min', 'Доод хэмжээ (сануулга)', it.min || '', { num: 1 })}${fldIn('sk_price', 'Нэгж үнэ (дундаж), ₮', it.price || '', { num: 1 })}${fldIn('sk_loc', 'Байршил (тавиур, агуулах)', it.loc)}
    </div>${fldIn('sk_note', 'Тэмдэглэл', it.note)}</div></div>
    <div class="jcard"><div class="bcard-h">Хөдөлгөөн <span class="sp"></span><span class="muted" style="font-weight:400;font-size:12px">${mv.length} бичлэг</span></div><div class="tblwrap" style="border:0"><table class="dt"><thead><tr><th>Огноо</th><th>Төрөл</th><th class="r">Тоо</th><th class="r">Үнэ</th><th class="r">Үлдэгдэл</th><th>Ажил</th><th>Хэн</th><th>Тайлбар</th></tr></thead><tbody>
      ${mv.map(m => { const j = m.job ? findJob(m.job) : null; return `<tr><td class="num">${esc(m.date)}</td><td>${m.type === 'in' ? 'орлого' : m.type === 'out' ? 'зарлага' : 'тооллого'}</td><td class="r num">${m.type === 'out' ? '−' : m.qty > 0 ? '+' : ''}${Math.abs(m.qty)}</td><td class="r num">${money(m.price)}</td><td class="r num">${m.after}</td><td class="num">${j ? `<a href="#" class="linkbtn" data-skj="${j.id}">${esc(j.no)}</a>` : ''}</td><td>${esc(pName(m.who) || m.who || '')}</td><td>${esc(m.note || '')}</td></tr>`; }).join('') || '<tr><td colspan="8" class="muted">Хөдөлгөөн алга</td></tr>'}
    </tbody></table></div></div>`;
  [['name'], ['code'], ['mat'], ['size'], ['unit'], ['loc'], ['note'], ['thk', 1], ['min', 1], ['price', 1]].forEach(([k, num]) => el.querySelector('#sk_' + k).addEventListener('change', e => { it[k] = num ? (+e.target.value || 0) : e.target.value.trim(); save(); renderWhSide(); }));
  el.querySelector('#sk_cat').addEventListener('change', e => { it.cat = e.target.value; save(); renderWhSide(); });
  el.querySelector('#skBack').addEventListener('click', () => { SK.sel = null; renderWh(); });
  el.querySelector('#skDel').addEventListener('click', () => { if (!confirm(`«${stkName(it)}»-г устгах уу? Хөдөлгөөний бүртгэл хадгалагдана.`)) return; S.stock = stk().filter(x => x !== it); SK.sel = null; save(); renderWh(); });
  el.querySelectorAll('[data-skm]').forEach(b => b.addEventListener('click', () => stkMoveDlg(b.dataset.skm, it)));
  el.querySelectorAll('[data-skj]').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); setModule('jobs'); J.sel = a.dataset.skj; J.sub = 'prog'; J.mk = 'prog'; renderJobs(); }));
}
/* small in-page dialog for a movement */
function stkMoveDlg(type, it0) {
  const T = { in: 'Орлого авах', out: 'Зарлага — ажилд олгох', adj: 'Тооллого — бодит үлдэгдэл' }[type];
  const jobs = (S.jobs || []).filter(j => !isQ(j) && !['given'].includes(j.status));
  const d = document.createElement('div'); d.className = 'skdlg';
  d.innerHTML = `<div class="skbox"><h3>${T}</h3>
    <label class="fld">Бараа<select id="skd_it">${stk().map(x => `<option value="${x.id}"${it0 && it0.id === x.id ? ' selected' : ''}>${esc(stkName(x))} — ${x.qty} ${esc(x.unit)}</option>`).join('')}</select></label>
    <div class="jgrid"><label class="fld">${type === 'adj' ? 'Тоолсон үлдэгдэл' : 'Тоо хэмжээ'}<input id="skd_q" type="number" step="any" class="mono"></label>${type === 'in' ? '<label class="fld">Нэгж үнэ, ₮<input id="skd_p" type="number" step="any" class="mono"></label>' : ''}<label class="fld">Огноо<input id="skd_d" type="date" value="${today()}"></label></div>
    ${type === 'out' ? `<label class="fld">Ажил (зардалд бичигдэнэ)<select id="skd_j"><option value="">— ажилгүй (дотоод хэрэгцээ) —</option>${jobs.map(j => `<option value="${j.id}"${J.sel === j.id ? ' selected' : ''}>${esc(j.no)} ${esc(j.title || '')}</option>`).join('')}</select></label>` : ''}
    <label class="fld">${type === 'in' ? 'Нийлүүлэгч / баримт' : 'Тайлбар'}<input id="skd_n"></label>
    <div class="addrow" style="justify-content:flex-end"><button class="btn ghost" id="skd_x">Болих</button><button class="btn primary" id="skd_ok">Бүртгэх</button></div></div>`;
  document.body.appendChild(d);
  const close = () => d.remove(); d.querySelector('#skd_x').addEventListener('click', close); d.addEventListener('click', e => { if (e.target === d) close(); });
  if (!stk().length) { d.querySelector('.skbox').insertAdjacentHTML('afterbegin', '<p class="note late">Эхлээд бараа нэмнэ үү.</p>'); }
  setTimeout(() => { const q = d.querySelector('#skd_q'); if (q) q.focus(); }, 30);
  d.querySelector('#skd_ok').addEventListener('click', () => {
    const it = stkFind(d.querySelector('#skd_it').value), q = +d.querySelector('#skd_q').value; if (!it) return; if (!(q > 0) && type !== 'adj') { toast('Тоо оруулна уу'); return; }
    if (type === 'out' && q > +it.qty && !confirm(`Үлдэгдэл ${it.qty} ${it.unit} — ${q} гаргах уу? (сөрөг болно)`)) return;
    const m = stkMove(it, type, q, { price: d.querySelector('#skd_p') ? +d.querySelector('#skd_p').value : 0, date: d.querySelector('#skd_d').value, job: d.querySelector('#skd_j') ? d.querySelector('#skd_j').value : '', note: d.querySelector('#skd_n').value.trim() });
    if (m) toast(`${T}: ${stkName(it)} → үлдэгдэл ${it.qty} ${it.unit}${stkLow(it) ? ' ⚠ доод хэмжээ' : ''}`);
    close(); SK.sel = it.id; if (!$('#stockMain').hidden) renderWh(); else if (typeof renderJobMain === 'function' && !$('#jobsMain').hidden) renderJobMain();
  });
}
async function stkExcel() {
  if (!window.XLSX) await loadScript(XLSX_URL);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Код', 'Нэр', 'Төрөл', 'Материал', 'Зузаан', 'Хэмжээ', 'Үлдэгдэл', 'Нэгж', 'Доод хэмжээ', 'Нэгж үнэ', 'Нийт үнэ', 'Байршил']].concat(stk().map(x => [x.code, x.name, (STK_CAT.find(c => c[0] === x.cat) || [, ''])[1], x.mat, x.thk, x.size, +x.qty || 0, x.unit, +x.min || 0, +x.price || 0, (+x.qty || 0) * (+x.price || 0), x.loc]))), 'Үлдэгдэл');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Огноо', 'Төрөл', 'Бараа', 'Тоо', 'Үнэ', 'Үлдэгдэл', 'Ажил', 'Тайлбар']].concat(stkMoves().map(m => { const x = stkFind(m.item), j = m.job ? findJob(m.job) : null; return [m.date, m.type === 'in' ? 'орлого' : m.type === 'out' ? 'зарлага' : 'тооллого', stkName(x), m.qty, m.price, m.after, j ? j.no : '', m.note]; }))), 'Хөдөлгөөн');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }); saveFile(`Kh International агуулах ${today()}.xlsx`, new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
}
/* job page: what went to this job from the warehouse */
function jobStockHTML(job) {
  const M = stkMoves().filter(m => m.job === job.id && m.type === 'out'); const sum = M.reduce((a, m) => a + m.qty * m.price, 0);
  return `<div class="jcard" data-v="main"><div class="bcard-h">Агуулахаас зарцуулсан <span class="pill">${money(sum)} ₮</span><span class="sp"></span><button class="btn sm" id="jStkOut">− Агуулахаас олгох</button></div><div class="jbody">${M.length ? `<table class="dt"><tbody>${M.map(m => { const x = stkFind(m.item); return `<tr><td class="num">${esc(m.date)}</td><td>${esc(stkName(x))}</td><td class="r num">${m.qty} ${esc(x ? x.unit : '')}</td><td class="r num">${money(m.qty * m.price)} ₮</td></tr>`; }).join('')}</tbody></table>` : '<p class="note">Агуулахаас олгосон зүйл алга. Олгоход «Явц, зардал»-д бодит зардал болж бичигдэнэ.</p>'}</div></div>`;
}
function bindJobStock(el, job) { const b = el.querySelector('#jStkOut'); if (b) b.addEventListener('click', () => { J.sel = job.id; stkMoveDlg('out'); }); }
