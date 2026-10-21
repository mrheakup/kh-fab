/* ================= Kh International — customer quotation forms («Маягт»), one or more per organisation =================
   Баримт бичиг → «Маягт»: each organisation's ready quotation form (terms, included / excluded, special note,
   contact, line style). A quote picks its organisation's form automatically (★ default) or by hand; edits made
   on a linked quote are written back to the form and logged, so the form register stays current. */
const FORM_K = ['lead', 'delivery', 'pay', 'mode', 'note', 'incl', 'excl', 'custId', 'address', 'person', 'email', 'phone', 'discount'];
const FORM_SYNC = FORM_K.filter(k => k !== 'discount');           // one-off discount stays on the quote
const forms = () => (S.forms = Array.isArray(S.forms) ? S.forms : []);
const formOrgKey = n => { const o = orgFind(n); return lc(o ? o.name : n); };
const formsOf = org => { const k = formOrgKey(org); return k ? forms().filter(f => formOrgKey(f.org) === k) : []; };
const formDefOf = org => { const L = formsOf(org); return L.find(f => f.def) || L[0] || null; };
const formById = id => forms().find(f => f.id === id) || null;
const formNo = () => 'MF-' + String(S.formSeq = (S.formSeq || 0) + 1).padStart(3, '0');
function formNew(org, from, name) {
  const d = {}; FORM_K.forEach(k => d[k] = from && from[k] != null ? from[k] : '');
  if (!from) Object.assign(d, { delivery: "Kh will delivery customer's WHS", pay: '100% after work completion', mode: 'single', note: QF_NOTE, incl: 'All consumables required for the work are included in the quoted price.' });
  const f = { id: uid(), no: formNo(), org: String(org || '').trim(), name: name || 'Үндсэн маягт', def: !formsOf(org).length, d, created: today(), updated: today(), uses: 0, log: [{ t: today(), m: from ? 'Үнийн саналаас үүсгэсэн' : 'Шинээр үүсгэсэн' }] };
  forms().push(f); save(); return f;
}
const formLog = (f, m) => { f.log = f.log || []; const last = f.log[f.log.length - 1]; if (last && last.t === today() && last.m === m) return; f.log.push({ t: today(), m }); if (f.log.length > 60) f.log.splice(0, f.log.length - 60); };
/* copy a form into a quote form (qf) */
function formApply(qf, f) {
  FORM_K.forEach(k => { const v = f.d[k]; if (k === 'discount') { if (+v) qf.discount = +v; return; } if (v !== '' && v != null) qf[k] = v; });
  qf.formId = f.id; f.uses = (f.uses || 0) + 1; save();
}
/* a new quote form for an organisation that has a ★ form starts from it */
function formAuto(qf, org) { if (!qf || qf.formId || qf._formOff) return false; const f = formDefOf(org); if (!f) return false; formApply(qf, f); return true; }
/* quote edited → keep its form current (or register a first form for the organisation) */
const FORM_TOLD = new Set();
function formSync(qf, org, quoteNo) {
  if (!qf || !String(org || '').trim() || qf._formOff) return;
  let f = qf.formId ? formById(qf.formId) : null;
  if (!f && !formsOf(org).length) {
    f = formNew(org, qf); qf.formId = f.id; formLog(f, 'Бүртгэсэн: ' + (quoteNo || 'үнийн санал'));
    toast(`📄 «${(orgFind(org) || {}).name || org}» байгууллагын маягт Баримт бичигт бүртгэгдлээ (${f.no})`, 5000); return;
  }
  if (!f) return;
  const ch = FORM_SYNC.filter(k => String(f.d[k] ?? '') !== String(qf[k] ?? '') && !(qf[k] === '' || qf[k] == null));
  if (!ch.length) return;
  ch.forEach(k => f.d[k] = qf[k]); f.updated = today(); formLog(f, `Шинэчилсэн (${quoteNo || 'үнийн санал'}): ` + ch.map(formKName).join(', ')); save();
  if (!FORM_TOLD.has(f.id)) { FORM_TOLD.add(f.id); toast(`📄 Маягт ${f.no} «${f.name}» шинэчлэгдлээ — Баримт бичиг → Маягт`, 4000); }
}
const FORM_KN = { lead: 'Lead time', delivery: 'Delivery term', pay: 'Payment term', mode: 'Мөрийн хэлбэр', note: 'Special note', incl: 'Included', excl: 'Excluded', custId: 'Customer ID', address: 'Хаяг', person: 'Холбоо барих хүн', email: 'Email', phone: 'Утас', discount: 'Хөнгөлөлт' };
const formKName = k => FORM_KN[k] || k;

/* bar on the quote card: which form, pick / save / detach */
function qfFormBarHTML(qf, org) {
  const L = formsOf(org), cur = qf.formId ? formById(qf.formId) : null, other = forms().filter(f => !L.includes(f));
  const o = f => `<option value="${f.id}"${cur === f ? ' selected' : ''}>${f.def ? '★ ' : ''}${esc(f.name)} · ${esc(f.no)}</option>`;
  return `<div class="qfform"><span class="qfsec-t">Маягт</span><select class="inp" id="qfFormSel"><option value="">— Маягтгүй (зөвхөн энэ санал) —</option>${L.length ? `<optgroup label="${esc((orgFind(org) || {}).name || org || 'Энэ байгууллага')}">${L.map(o).join('')}</optgroup>` : ''}${other.length ? `<optgroup label="Бусад байгууллагын маягт">${other.map(f => `<option value="${f.id}"${cur === f ? ' selected' : ''}>${esc(f.org || '—')} — ${esc(f.name)}</option>`).join('')}</optgroup>` : ''}</select>
    <button class="btn sm ghost" id="qfFormNew" title="Энэ саналын нөхцөлөөр шинэ маягт үүсгэж Баримт бичигт бүртгэнэ">＋ Шинэ маягт болгох</button>
    <span class="muted qfform-n">${cur ? `Энд хийсэн өөрчлөлт маягт ${esc(cur.no)}-д автоматаар бүртгэгдэнэ` : org ? (L.length ? 'Маягт сонгоогүй — өөрчлөлт зөвхөн энэ саналд' : 'Энэ байгууллагад маягт алга — нөхцөлөө засахад автоматаар бүртгэгдэнэ') : 'Захиалагч сонгоход тухайн байгууллагын маягт орно'}</span></div>`;
}
function bindQfFormBar(el, job, qf, org, rerender) {
  const s = el.querySelector('#qfFormSel'); if (!s) return;
  s.addEventListener('change', () => {
    if (!s.value) { qf.formId = ''; qf._formOff = 1; save(); rerender(); return; }
    const f = formById(s.value); if (!f) return; qf._formOff = 0; formApply(qf, f); formLog(f, 'Ашигласан: ' + ((job.quote || {}).no || job.no || 'үнийн санал')); toast(`Маягт «${f.name}» орлоо`); rerender();
  });
  el.querySelector('#qfFormNew').addEventListener('click', () => {
    if (!org) { toast('Эхлээд захиалагч (байгууллага) оруулна уу'); return; }
    const nm = prompt('Маягтын нэр (жишээ нь: Засвар, Шинэ үйлдвэрлэл, Шанага)', formsOf(org).length ? 'Маягт ' + (formsOf(org).length + 1) : 'Үндсэн маягт'); if (nm == null) return;
    const f = formNew(org, qf, nm.trim() || 'Маягт'); qf.formId = f.id; qf._formOff = 0; save(); toast(`📄 ${f.no} «${f.name}» Баримт бичигт бүртгэгдлээ`); rerender();
  });
}

/* ---------- Баримт бичиг → Маягт (side list + editor) ---------- */
const FM = { sel: null, q: '' };
function renderFormSide() {
  const box = $('#fmList'); if (!box) return; const q = lc(FM.q);
  const L = forms().filter(f => !q || lc([f.org, f.name, f.no].join(' ')).includes(q));
  const G = {}; L.forEach(f => { const k = (orgFind(f.org) || {}).name || f.org || '— Байгууллагагүй —'; (G[k] = G[k] || []).push(f); });
  box.innerHTML = Object.keys(G).sort().map(k => `<div class="fmorg">${esc(k)}</div>` + G[k].map(f => `<div class="bitem fmi${FM.sel === f.id && J.tab === 'forms' ? ' on' : ''}" data-fm="${f.id}"><div style="min-width:0"><div class="t">${f.def ? '★ ' : ''}${esc(f.name)}</div><div class="m">${esc(f.no)} · ${esc(f.updated || '')} · ${f.uses || 0} удаа</div></div></div>`).join('')).join('') || '<p class="note">Маягт алга. «+ Шинэ маягт» эсвэл үнийн санал дээр нөхцөлөө засахад автоматаар бүртгэгдэнэ.</p>';
}
(() => {
  const n = $('#fmNew'); if (n) n.addEventListener('click', () => { const org = prompt('Байгууллагын нэр', ''); if (org == null) return; const f = formNew(org.trim(), null, 'Үндсэн маягт'); orgLearn({ org: f.org }); FM.sel = f.id; renderFormSide(); renderJobMain(); });
  const s = $('#fmSearch'); if (s) s.addEventListener('input', () => { FM.q = s.value; renderFormSide(); });
  const l = $('#fmList'); if (l) l.addEventListener('click', e => { const it = e.target.closest('[data-fm]'); if (!it) return; FM.sel = it.dataset.fm; renderFormSide(); renderJobMain(); });
})();
function formPreviewJob(f) {
  const qf = Object.assign({ title: 'Sample work description', rfqName: 'Sample RFQ', rfqNo: 'N/A' }, f.d, { discount: +f.d.discount || 0, mode: 'single' });
  return { _nest: 1, no: 'SQ-0000', title: 'Sample work description', customer: (orgFind(f.org) || {}).name || f.org, quote: { no: 'SQ-0000', date: today(), valid: 14, vat: 10, qf }, _linesFn: () => [{ d: qf.title, u: 'set', q: 1, p: 1000000 }] };
}
function renderFormMain(el) {
  const f = formById(FM.sel);
  if (!f) {
    const L = forms();
    el.innerHTML = `<div class="dhead"><div><h2>Байгууллагын маягтууд</h2><p class="muted">${L.length} маягт · ${new Set(L.map(x => formOrgKey(x.org))).size} байгууллага. Үнийн санал дээр захиалагч сонгоход ★ маягт автоматаар орно.</p></div><span class="sp" style="flex:1"></span><button class="btn primary" id="fmNew2">+ Шинэ маягт</button></div>
      <div class="jcard"><div class="tblwrap" style="border:0"><table class="dt"><thead><tr><th>№</th><th>Байгууллага</th><th>Маягт</th><th>Payment term</th><th>Lead time</th><th class="r">Ашигласан</th><th>Шинэчилсэн</th></tr></thead><tbody>
      ${L.map(x => `<tr class="jrow" data-fm="${x.id}" style="cursor:pointer"><td class="num"><b>${esc(x.no)}</b></td><td>${esc((orgFind(x.org) || {}).name || x.org || '—')}</td><td>${x.def ? '★ ' : ''}${esc(x.name)}</td><td>${esc(x.d.pay || '')}</td><td>${esc(x.d.lead || '')}</td><td class="r num">${x.uses || 0}</td><td class="num">${esc(x.updated || '')}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Маягт алга</td></tr>'}
      </tbody></table></div></div>`;
    el.querySelector('#fmNew2').addEventListener('click', () => $('#fmNew').click());
    el.querySelectorAll('[data-fm]').forEach(r => r.addEventListener('click', () => { FM.sel = r.dataset.fm; renderFormSide(); renderJobMain(); }));
    return;
  }
  const d = f.d, used = (S.jobs || []).filter(j => j.quote && j.quote.qf && j.quote.qf.formId === f.id);
  el.innerHTML = `<div class="dhead"><div><h2>${esc(f.no)} · ${esc(f.name)}</h2><p class="muted">${esc((orgFind(f.org) || {}).name || f.org || '—')} · үүсгэсэн ${esc(f.created)} · шинэчилсэн ${esc(f.updated)}</p></div><span class="sp" style="flex:1"></span><button class="btn ghost" id="fmBack">← Жагсаалт</button><button class="btn ghost" id="fmDup">Хуулбар</button><button class="btn ghost" id="fmDel">Устгах</button></div>
    <div class="jcard"><div class="bcard-h">Маягт <span class="sp"></span><button class="btn ghost sm" id="fmPrint">🖨 Жишээ хэвлэх</button></div><div class="jbody qfwrap"><div class="qfprevbox" title="Жишээ — дарж томруулна"><img class="qfprev" alt="Маягт"></div><div class="qffields">
      <div class="qfsec"><div class="qfsec-t">Маягт</div><div class="jgrid">${fldIn('fm_org', 'Байгууллага', f.org, { list: 'dl-org' })}${fldIn('fm_name', 'Маягтын нэр', f.name)}<label class="fld">Үндсэн (★)<select id="fm_def"><option value="1"${f.def ? ' selected' : ''}>Тийм — шинэ саналд автоматаар орно</option><option value=""${f.def ? '' : ' selected'}>Үгүй — гараар сонгоно</option></select></label></div></div>
      <div class="qfsec"><div class="qfsec-t">Захиалагч</div><div class="jgrid">${fldIn('fd_custId', 'Customer ID', d.custId)}${fldIn('fd_address', "Customer's address", d.address)}${fldIn('fd_person', 'Name / Position', d.person, { list: 'dl-person' })}${fldIn('fd_email', 'Email', d.email)}${fldIn('fd_phone', 'Phone number', d.phone)}</div></div>
      <div class="qfsec"><div class="qfsec-t">Нөхцөл</div><div class="jgrid">${fldIn('fd_lead', 'Lead time', d.lead, { ph: '5 business days' })}${fldIn('fd_pay', 'Payment term', d.pay)}${fldIn('fd_delivery', 'Delivery term', d.delivery)}${fldIn('fd_discount', 'Discount, ₮', d.discount || '', { num: 1 })}
        <label class="fld">Мөрийн хэлбэр<select id="fd_mode">${[['single', 'Нэг мөр (set × 1)'], ['sections', 'Хэсгээр'], ['detail', 'Дэлгэрэнгүй (мөр бүр)'], ['fixed', 'Excel-ийн мөрүүд']].map(([v, n]) => `<option value="${v}"${d.mode === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div></div>
      <div class="qfsec"><div class="qfsec-t">Агуулга</div>${fldIn('fd_note', 'Special note', d.note, { area: 1, rows: 2 })}
      <div class="jgrid qfcl"><div class="fld"><span class="flab">Quote included — үнэд багтсан</span><div class="clbox" data-ck="incl"></div></div><div class="fld"><span class="flab">Quote excluded — үнэд ороогүй</span><div class="clbox" data-ck="excl"></div></div></div></div>
    </div></div></div>
    <div class="jcard"><div class="bcard-h">Бүртгэл — өөрчлөлт, ашигласан <span class="sp"></span><span class="muted" style="font-weight:400;font-size:12px">${used.length} санал холбоотой</span></div><div class="jbody">
      ${used.length ? `<p class="note">${used.map(j => `<a href="#" class="linkbtn" data-fj="${j.id}">${esc((j.quote && j.quote.no) || j.no)}</a>`).join(' · ')}</p>` : ''}
      <ul class="fmlog">${(f.log || []).slice().reverse().map(x => `<li><span class="num muted">${esc(x.t)}</span> ${esc(x.m)}</li>`).join('')}</ul></div></div>`;
  const re = () => { renderFormSide(); renderFormMain(el); };
  const img = el.querySelector('.qfprev'); let tm = 0;
  const touch = () => { f.updated = today(); save(); };
  const refresh = () => { clearTimeout(tm); tm = setTimeout(() => quoteFormImgs(formPreviewJob(f), PREV_K).then(im => { if (img.isConnected) img.src = im[0].url; }).catch(() => { }), 200); };
  FORM_K.forEach(k => { const i = el.querySelector('#fd_' + k); if (i) i.addEventListener('change', () => { d[k] = k === 'discount' ? Math.max(0, +i.value || 0) : i.value; formLog(f, 'Засварласан: ' + formKName(k)); touch(); refresh(); }); });
  el.querySelectorAll('.clbox').forEach(b => clauseBox(b, d, b.dataset.ck, () => { formLog(f, 'Засварласан: ' + formKName(b.dataset.ck)); touch(); refresh(); }));
  el.querySelector('#fm_org').addEventListener('change', e => { f.org = e.target.value.trim(); if (f.org) orgLearn({ org: f.org }); touch(); renderFormSide(); });
  el.querySelector('#fm_name').addEventListener('change', e => { f.name = e.target.value.trim() || f.name; touch(); renderFormSide(); });
  el.querySelector('#fm_def').addEventListener('change', e => { if (e.target.value) formsOf(f.org).forEach(x => x.def = x === f); else f.def = false; touch(); renderFormSide(); });
  el.querySelector('#fmBack').addEventListener('click', () => { FM.sel = null; renderFormSide(); renderJobMain(); });
  el.querySelector('#fmDup').addEventListener('click', () => { const x = formNew(f.org, f.d, f.name + ' (хуулбар)'); x.def = false; FM.sel = x.id; save(); renderFormSide(); renderJobMain(); });
  el.querySelector('#fmDel').addEventListener('click', () => { if (!confirm(`${f.no} «${f.name}» маягтыг устгах уу? (Өмнөх үнийн саналууд өөрчлөгдөхгүй)`)) return; S.forms = forms().filter(x => x !== f); (S.jobs || []).forEach(j => { const q = j.quote && j.quote.qf; if (q && q.formId === f.id) q.formId = ''; }); if (f.def) { const n = formsOf(f.org)[0]; if (n) n.def = true; } FM.sel = null; save(); renderFormSide(); renderJobMain(); });
  el.querySelector('#fmPrint').addEventListener('click', async () => printImgs(await quoteFormImgs(formPreviewJob(f)), false, 'letter', `${f.no} - ${f.org} - ${f.name}`));
  el.querySelector('.qfprevbox').addEventListener('click', async () => printImgs(await quoteFormImgs(formPreviewJob(f)), false, 'letter', `${f.no} - ${f.name}`, true));
  el.querySelectorAll('[data-fj]').forEach(a => a.addEventListener('click', ev => { ev.preventDefault(); const j = findJob(a.dataset.fj); if (!j) return; setModule(isQ(j) ? 'quotes' : 'jobs'); J.sel = j.id; renderJobs(); }));
  refresh();
}
