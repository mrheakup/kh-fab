/* ================= Kh International — customer quotation forms («Маягт»), one or more per organisation =================
   Баримт бичиг → «Маягт»: each organisation's ready quotation form (terms, included / excluded, special note,
   contact, line style). A quote picks its organisation's form automatically (★ default) or by hand; edits made
   on a linked quote are written back to the form and logged, so the form register stays current. */
const FORM_K = ['lang', 'lead', 'delivery', 'pay', 'mode', 'note', 'incl', 'excl', 'custId', 'address', 'person', 'email', 'phone', 'discount'];
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
  FORM_K.forEach(k => { const v = f.d[k]; if (k === 'discount') { if (+v) qf.discount = +v; return; } if (k === 'lang') { qf.lang = v || ''; return; } if (v !== '' && v != null) qf[k] = v; });
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
  const ch = FORM_SYNC.filter(k => String(f.d[k] ?? '') !== String(qf[k] ?? '') && (k === 'lang' || !(qf[k] === '' || qf[k] == null)));
  if (!ch.length) return;
  ch.forEach(k => f.d[k] = qf[k]); f.updated = today(); formLog(f, `Шинэчилсэн (${quoteNo || 'үнийн санал'}): ` + ch.map(formKName).join(', ')); save();
  if (!FORM_TOLD.has(f.id)) { FORM_TOLD.add(f.id); toast(`📄 Маягт ${f.no} «${f.name}» шинэчлэгдлээ — Баримт бичиг → Маягт`, 4000); }
}
const FORM_KN = { lang: 'Хэл', lead: 'Lead time', delivery: 'Delivery term', pay: 'Payment term', mode: 'Мөрийн хэлбэр', note: 'Special note', incl: 'Included', excl: 'Excluded', custId: 'Customer ID', address: 'Хаяг', person: 'Холбоо барих хүн', email: 'Email', phone: 'Утас', discount: 'Хөнгөлөлт' };
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
const FM = { sel: null, q: '', view: 'lib', dk: '_all' };
function renderFormSide() {
  { const o = $('#fmOrgBox'), l = $('#fmLibBox'); if (o) o.hidden = FM.view !== 'org'; if (l) l.hidden = FM.view !== 'lib'; document.querySelectorAll('[data-fmv]').forEach(b => b.classList.toggle('on', b.dataset.fmv === FM.view)); }
  { const L = $('#dlList'); if (L) L.innerHTML = [{ k: '_all', n: 'Бүх маягтад нийтлэг (компани, үндсэн хэв маяг)' }].concat(DOC_KINDS).map(d => { const st = d.k === '_all' ? null : (S.docStyle || {})[d.k]; return `<div class="bitem fmi${FM.dk === d.k && J.tab === 'forms' && FM.view === 'lib' ? ' on' : ''}" data-dk="${d.k}"><div style="min-width:0"><div class="t">${esc(d.n)}</div><div class="m">${d.k === '_all' ? 'лого, компанийн мэдээлэл' : st && Object.keys(st).length ? 'тусгай тохиргоотой' : 'нийтлэг тохиргоогоор'}</div></div></div>`; }).join(''); }
  const box = $('#fmList'); if (!box) return; const q = lc(FM.q);
  const L = forms().filter(f => !q || lc([f.org, f.name, f.no].join(' ')).includes(q));
  const G = {}; L.forEach(f => { const k = (orgFind(f.org) || {}).name || f.org || '— Байгууллагагүй —'; (G[k] = G[k] || []).push(f); });
  box.innerHTML = Object.keys(G).sort().map(k => `<div class="fmorg">${esc(k)}</div>` + G[k].map(f => `<div class="bitem fmi${FM.sel === f.id && J.tab === 'forms' ? ' on' : ''}" data-fm="${f.id}"><div style="min-width:0"><div class="t">${f.def ? '★ ' : ''}${esc(f.name)}</div><div class="m">${esc(f.no)} · ${esc(f.updated || '')} · ${f.uses || 0} удаа</div></div></div>`).join('')).join('') || '<p class="note">Маягт алга. «+ Шинэ маягт» эсвэл үнийн санал дээр нөхцөлөө засахад автоматаар бүртгэгдэнэ.</p>';
}
(() => {
  const n = $('#fmNew'); if (n) n.addEventListener('click', () => { const org = prompt('Байгууллагын нэр', ''); if (org == null) return; const f = formNew(org.trim(), null, 'Үндсэн маягт'); orgLearn({ org: f.org }); FM.sel = f.id; renderFormSide(); renderJobMain(); });
  const s = $('#fmSearch'); if (s) s.addEventListener('input', () => { FM.q = s.value; renderFormSide(); });
  document.querySelectorAll('[data-fmv]').forEach(b => b.addEventListener('click', () => { FM.view = b.dataset.fmv; renderFormSide(); renderJobMain(); }));
  const dl = $('#dlList'); if (dl) dl.addEventListener('click', e => { const it = e.target.closest('[data-dk]'); if (!it) return; FM.dk = it.dataset.dk; renderFormSide(); renderJobMain(); });
  const l = $('#fmList'); if (l) l.addEventListener('click', e => { const it = e.target.closest('[data-fm]'); if (!it) return; FM.sel = it.dataset.fm; renderFormSide(); renderJobMain(); });
})();
function formPreviewJob(f) {
  const qf = Object.assign({ title: 'Sample work description', rfqName: 'Sample RFQ', rfqNo: 'N/A' }, f.d, { discount: +f.d.discount || 0, mode: 'single' });
  return { _nest: 1, no: 'SQ-0000', title: 'Sample work description', customer: (orgFind(f.org) || {}).name || f.org, quote: { no: 'SQ-0000', date: today(), valid: 14, vat: 10, qf }, _linesFn: () => [{ d: qf.title, u: 'set', q: 1, p: 1000000 }] };
}
function renderFormMain(el) {
  if (FM.view === 'lib') return renderDocLib(el);
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
        <label class="fld">Маягтын хэл<select id="fd_lang"><option value="">English</option><option value="mn"${d.lang === 'mn' ? ' selected' : ''}>Монгол</option></select></label>
        <label class="fld">Мөрийн хэлбэр<select id="fd_mode">${[['single', 'Нэг мөр (set × 1)'], ['sections', 'Хэсгээр'], ['breakdown', 'Задаргаа (Engineering drawing, FEA, Material, Consumable, Labour…)'], ['detail', 'Дэлгэрэнгүй (мөр бүр)'], ['fixed', 'Excel-ийн мөрүүд']].map(([v, n]) => `<option value="${v}"${d.mode === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label></div></div>
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

/* ---------- import the company's Excel quotation forms («<Org> - Form.xlsx», «SQ… - Quotation….xlsx») ----------
   Every sheet that has «Customer's name» is one quote to one contact person. Only rows visible in Excel are
   taken (hidden clause rows are the ones not used). One form per organisation (from its newest sheet);
   every contact person goes to the organisation's directory. */
const FX_SUB = /^(visual inspection|magnetic particle|ultrasonic|dye penetrant|liquid penetrant|radiograph|material certificates?|weld traceability|welding procedures?|welder|q\d{3}|s\d{3}|rock wool|galvani[sz]ed|.*\bsquare tube\b)/i;
const FX_LAB = [[/^(customer'?s?\s*name|харилцагч)$/i, 'org'], [/^(rfq\s*name|ажлын нэр)$/i, 'rfqName'], [/^(rfq\s*(number|no)|ажлын дугаар)$/i, 'rfqNo'], [/^(contact|position|name\s*\/\s*position|name|х[оа][лг]богдох хүн)$/i, 'person'], [/^(e-?mail|и-?мэйл)$/i, 'email'], [/^(phone|утас)/i, 'phone'],
  [/^(customer\s*id|харилцагч id)$/i, 'custId'], [/^(lead\s*time|гүйцэтгэх хугацаа)$/i, 'lead'], [/^(customer'?s?\s*address|харилцагчийн хаяг)/i, 'address'], [/^registration$/i, 'reg'], [/^(payment\s*term|төлбөрийн нөхцөл)/i, 'pay'], [/^(delivery\s*term|хүргэлтийн нөхцөл)/i, 'delivery'], [/^(quote\s*#|үнийн саналын №)/i, 'quoteNo'], [/^(date|огноо)$/i, 'date'], [/^(currency|валют)$/i, 'currency']];
const FX_TPL = ['engineering drawing', 'finite element ana', 'material (fiber las', 'destructive test', 'steel fabrication', 'fabrication welding', 'internal non-destu', 'visual inspection', 'magnetic particle', 'proof load test', 'sandblasting is in', 'painting', 'manufacturers data', 'material certifica', 'weld traceability', 'welding procedure', 'welder', 'delivery to ot ub', 'machining work'];
const FX_MN = /^(харилцагч|ажлын нэр|огноо|төлбөрийн нөхцөл)$/i;
function fxParseSheet(ws, X) {
  const R = X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: true }), r0 = ws['!ref'] ? X.utils.decode_range(ws['!ref']).s.r : 0, hid = new Set(); (ws['!rows'] || []).forEach((r, i) => { if (r && r.hidden) hid.add(i - r0); });
  const str = v => String(v ?? '').replace(/\s+/g, ' ').trim();
  let maxC = -1; R.forEach(r => r.forEach((c, j) => { if (/^(total\s*excluded\s*vat|нийт ?\/?нөат ороогүй|нөат ороогүй)/i.test(str(c))) maxC = Math.max(maxC, j); })); if (maxC < 0) maxC = 9;
  const d = {}, cl = { incl: [], excl: [] }; let sec = '', note = '', had = 0, mn = 0;
  R.forEach((row, i) => {
    const cells = row.slice(0, maxC + 1).map(str), first = cells.findIndex(Boolean); if (first < 0) return; const t0 = cells[first];
    if (/^(quote\s*excluded|үнийн саналд багтаагүй)/i.test(t0)) { sec = 'excl'; return; }
    if (/^(quote\s*included|үнийн саналд багтсан)/i.test(t0)) { sec = had ? 'excl' : 'incl'; had = 1; return; }   // a 2nd «included» header in some files is the excluded list
    if (/^(special\s*note|тусгай тэмдэглэл)/i.test(t0)) { note = t0.replace(/^(special\s*note|тусгай тэмдэглэл)\s*:?\s*/i, ''); sec = ''; return; }
    if (/^(payment\s*term|төлбөрийн нөхцөл|thank you|хамтран ажилласанд)/i.test(t0)) sec = '';
    if (sec) { if (hid.has(i)) return; const txt = cells.slice(first).find(c => c && !/^\d+\.?$/.test(c)); if (!txt) return;
      const raw = String(row.slice(0, maxC + 1).find(c => str(c) === txt) ?? txt), parts = raw.split(/\n+/).map(t => t.replace(/^\s*\d+[.)]\s*/, '').replace(/\s+/g, ' ').trim()).filter(Boolean);
      parts.forEach((p, k) => cl[sec].push((k > 0 || FX_SUB.test(p)) && cl[sec].length ? '- ' + p : p)); return; }
    const lab = c => c.replace(/\s*:\s*$/, '');
    for (let j = 0; j < cells.length; j++) { const c = lab(cells[j]); if (FX_MN.test(c)) mn = 1; const L = FX_LAB.find(([re]) => re.test(c)); if (!L || d[L[1]]) continue; const v = cells.slice(j + 1).find(Boolean); if (v && !FX_LAB.some(([re]) => re.test(lab(v))) && !/^(n\/?a|-|—)$/i.test(v)) d[L[1]] = v; }
  });
  if (!d.org) return null;
  if (/^\d{5}(\.\d+)?$/.test(d.date || '')) { const t = new Date(Math.round((+d.date - 25569) * 864e5)); d.date = t.toISOString().slice(0, 10); }
  // the Excel template carries the full standard clause list; a list that is only that list was never filled in
  const key = t => t.replace(/^- /, '').toLowerCase().replace(/\s+/g, ' ').slice(0, 18), isT = t => FX_TPL.some(k => key(t).startsWith(k.slice(0, Math.min(18, k.length))));
  const mains = a => a.filter(t => !/^- /.test(t)), unfilled = a => mains(a).length >= 8 && mains(a).every(isT), inK = new Set(cl.incl.map(key));
  const incl = unfilled(cl.incl) ? [] : cl.incl;
  let excl = [], drop = false; cl.excl.forEach(t => { const sub = /^- /.test(t); if (!sub) drop = !!incl.length && inK.has(key(t)); if (sub ? drop || !excl.length : drop) return; excl.push(t); }); if (unfilled(cl.excl)) excl = [];
  return { ...d, lang: mn ? 'mn' : '', note: note && !/^this quotation may be subject|^энэхүү үнийн санал нь ажлын цар/i.test(note) ? note : (mn ? QF_NOTE_MN : QF_NOTE), incl: incl.join('\n'), excl: excl.join('\n') };
}
function fxParseBook(buf, X) {
  const wb = X.read(buf, { type: 'array', cellStyles: true }), out = [];
  wb.SheetNames.forEach((n, i) => { if (((wb.Workbook || {}).Sheets || [])[i] && wb.Workbook.Sheets[i].Hidden) return; const r = fxParseSheet(wb.Sheets[n], X); if (r) out.push({ ...r, sheet: n }); });
  return out;
}
/* sheets → organisations + persons + one ★ form per organisation (existing forms are updated, not duplicated) */
function fxImport(list) {
  const G = {}; list.forEach(s => { const k = lc(s.org); (G[k] = G[k] || []).push(s); });
  let nf = 0, nu = 0, np = 0;
  Object.values(G).forEach(L => {
    L.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    const top = L[0], before = (orgFind(top.org) || { persons: [] }).persons.length;
    L.forEach(s => orgLearn({ org: s.org, custId: s.custId, address: s.address, person: s.person, email: s.email, phone: s.phone }, true));
    const o = orgFind(top.org); if (o && top.reg && !o.reg) o.reg = top.reg; np += ((o || { persons: [] }).persons.length - before);
    const fd = { lang: top.lang || '', lead: top.lead || '', delivery: top.delivery || '', pay: top.pay || '', mode: 'single', note: top.note, incl: top.incl || '', excl: top.excl || '', custId: top.custId || '', address: top.address || '', person: top.person || '', email: top.email || '', phone: top.phone || '', discount: '' };
    const ex = formsOf(top.org).find(f => f.src === 'excel');
    if (ex) { Object.assign(ex.d, fd); ex.updated = today(); formLog(ex, `Excel-ээс шинэчилсэн (${top.quoteNo || top.sheet})`); nu++; }
    else { const f = formNew(top.org, fd, 'Үндсэн маягт'); f.src = 'excel'; f.log = [{ t: today(), m: `Excel маягтаас оруулсан (${top.quoteNo || top.sheet}, ${L.length} хуудас)` }]; nf++; }
  });
  save(); contactLists();
  return { orgs: Object.keys(G).length, nf, nu, np };
}
async function fxImportFiles(files) {
  if (!window.XLSX) await loadScript(XLSX_URL);
  const all = [], bad = [];
  for (const f of files) { try { const r = fxParseBook(await f.arrayBuffer(), XLSX); if (r.length) all.push(...r); else bad.push(f.name); } catch (e) { bad.push(f.name); } }
  if (!all.length) { toast('Маягт олдсонгүй — «Customer\'s name» мөртэй Excel сонгоно уу'); return; }
  const r = fxImport(all);
  toast(`📄 ${r.orgs} байгууллага: ${r.nf} шинэ маягт, ${r.nu} шинэчилсэн, ${r.np} холбоо барих хүн нэмэгдлээ${bad.length ? ' · уншаагүй: ' + bad.join(', ') : ''}`, 8000);
  renderFormSide(); renderJobMain();
}
(() => {
  const b = $('#fmImp'), i = $('#fmImpIn'); if (!b || !i) return;
  b.addEventListener('click', () => i.click());
  i.addEventListener('change', async () => { const F = [...i.files]; i.value = ''; if (F.length) await fxImportFiles(F); });
})();

/* ---------- form library: style editor with a live sample ---------- */
function docSampleJob() {
  const j = { id: 'sample', no: 'KH-2026-000', short: '000', title: 'Жишээ ажил — AXLE STAND', customer: 'Sample LLC', due: '', status: 'new', note: '', items: [], extra: [], est: null, act: { hours: '', kg: '', other: '' }, trace: [], log: [], created: today() };
  jx(j); const q = j.quote; q.no = 'SQ0000'; q.mats = [{ name: 'Ган хавтан S355 10мм', qty: 120, unit: 'кг', price: 4500 }, { name: 'Труба 89×5', qty: 6, unit: 'м', price: 38000 }]; q.cons = [{ name: 'Гагнуурын утас 1.2мм', qty: 5, unit: 'кг', price: 15000 }];
  q.qf = { custId: 'S01', rfqName: 'Sample RFQ', rfqNo: 'N/A', person: 'Contact Person', email: 'contact@sample.mn', phone: '(976) 9900 0000', address: 'Ulaanbaatar, Mongolia', lead: '10 business days', delivery: "Kh will delivery customer's WHS", pay: '100% after work completion', discount: 0, mode: 'single', note: QF_NOTE, incl: 'Engineering drawing\nMaterial (Fiber laser cutting for preparation)\nFabrication welding and cleaning', excl: '3rd party NDT / inspection', title: 'AXLE STAND - 2', formId: '', _formOff: 1 };
  j.dock = { no: '0000', date: today(), to: 'Sample LLC', supplied: 'Kh International', po: 'PO-0000', orderDate: today(), delDate: today(), phone: '(976) 9900 0000', contact: 'Contact Person', address: 'Ulaanbaatar', items: [{ desc: 'AXLE STAND', ordered: 2, shipped: 2, pk: 1, kg: 240 }], photos: [], delivered: '', received: '', note: '', tagsPer: 4 };
  return j;
}
async function docSample(k) {
  const prev = window.__docK; window.__docK = 3;
  try {
    const J0 = docSampleJob(), first = D => D.pages[0].toDataURL('image/jpeg', 0.9);
    if (k === 'quote' || k === '_all') return (await quoteFormImgs(J0, 3))[0].url;
    if (k === 'docket') return (await docketImgs(J0, 3))[0].url;
    if (k === 'invoice') return (await invoiceImgs({ no: 'INV0000', date: today(), po: 'PO-0000', terms: 'AXLE STAND - 2', vat: 10, comment: '', bill: { name: 'Contact Person', company: 'Sample LLC', address: 'Ulaanbaatar, Mongolia', phone: '(976) 9900 0000', mail: 'contact@sample.mn' }, items: [{ d: 'AXLE STAND', q: 2, p: 1500000 }] }, 3))[0].url;
    if (k === 'qdetail') return first(await quoteDoc(J0));
    if (k === 'scope') return first(await scopeDoc(J0));
    if (k === 'cost') return first(await costDoc(J0));
    if (k === 'prog') return first(await progDoc(J0));
    if (k === 'acc') return first(await accDoc(J0));
    const m = (IS().machines || [])[0];
    if (k === 'instr') return m ? first(await instrDoc(m)) : '';
    if (k === 'insp') { if (!m) return ''; await logoImg(); return await pageImg(true, twoUp(x => drawCover(x, m)), 3); }
    if (k === 'idea') return first(await ideaDoc({ no: 'ID-000', title: 'Жишээ санал', cat: (typeof ICAT !== 'undefined' ? ICAT[0] : ''), prio: 'med', by: '', owner: '', problem: 'Одоогийн байдал …', proposal: 'Санал болгож буй шийдэл …', benefit: '', saving: '', due: '', budget: [], photos: [], st: 'idea' }));
  } catch (e) { console.error(e); return ''; } finally { window.__docK = prev; }
  return '';
}
function renderDocLib(el) {
  const k = FM.dk || '_all', A = (S.docStyle = S.docStyle || {}), own = A[k] = A[k] || {}, base = Object.assign({}, DOC_STYLE_DEF, k === '_all' ? {} : A._all || {}), cur = Object.assign({}, base, own), d = DOC_KINDS.find(x => x.k === k) || { n: 'Бүх маягтад нийтлэг', k: '_all' }, kd = !!d.title, C = company();
  const val = f => own[f] != null && own[f] !== '' ? own[f] : '';
  el.innerHTML = `<div class="dhead"><div><h2>${esc(d.n)}</h2><p class="muted">${k === '_all' ? 'Энд тавьсан тохиргоо бүх маягтад үйлчилнэ; маягт бүрт тусад нь өөрчилж болно.' : 'Хоосон талбар нь «Бүх маягтад нийтлэг» тохиргоогоор явна.'}</p></div><span class="sp" style="flex:1"></span>${Object.keys(own).length ? '<button class="btn ghost" id="dlReset">Анхны тохиргоонд буцаах</button>' : ''}<button class="btn" id="dlPrint">🖨 Жишээ хэвлэх</button></div>
    <div class="dlwrap"><div>
      <div class="jcard"><div class="bcard-h">Хэв маяг</div><div class="jbody"><div class="dlset">
        <label class="fld">Үсгийн хэмжээ — <b id="dlFsV">${cur.fs}%</b><input type="range" min="80" max="130" step="5" id="dl_fs" value="${cur.fs}"></label>
        <label class="fld">Логоны хэмжээ — <b id="dlLhV">${cur.logoH}%</b><input type="range" min="50" max="160" step="5" id="dl_logoH" value="${cur.logoH}"></label>
        <label class="fld">Логоны байршил<select id="dl_logo">${[['left', 'Зүүн дээд'], ['right', 'Баруун дээд'], ['none', 'Харуулахгүй']].map(([v, n]) => `<option value="${v}"${cur.logo === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        ${kd ? `<label class="fld">Гарчиг<input id="dl_title" value="${esc(val('title'))}" placeholder="${esc(d.title)}"></label>` : ''}
        ${kd || k === '_all' ? `<label class="fld" style="grid-column:1/-1">Хөлийн бичиг (хуудасны доор)<input id="dl_foot" value="${esc(val('foot'))}" placeholder="Kh International · ISO 9001 чанарын удирдлагын тогтолцоо"></label>` : ''}
      </div><p class="note">Үсгийг 115%-иас том болговол урт хүснэгтэд мөр давхцаж магадгүй — жишээн дээр шалгана уу.</p></div></div>
      ${k === '_all' || k === 'quote' || k === 'docket' || k === 'invoice' ? `<div class="jcard"><div class="bcard-h">Компанийн мэдээлэл (маягтын толгой)</div><div class="jbody"><div class="jgrid">${[['name', 'Компанийн нэр'], ['tag', 'Уриа'], ['a1', 'Хаяг 1'], ['a2', 'Хаяг 2'], ['a3', 'Хаяг 3'], ['phone', 'Утас'], ['mail', 'Имэйл'], ['bank', 'Банкны данс'], ['reg', 'Регистр'], ['currency', 'Валют']].map(([f, n]) => fldIn('dco_' + f, n, C[f])).join('')}</div>
        <div class="logoset" style="margin-top:10px"><span class="logo-wrap"><img class="brand-logo" alt="лого" src="${logoSrc()}"></span><button class="btn sm" id="dlLogo">Лого солих</button><button class="btn sm ghost" id="dlLogoReset">Анхны лого</button></div></div></div>` : ''}
    </div><div><div class="dlprev" title="Дарж томруулна"><img id="dlImg" alt="Жишээ"></div><p class="note" id="dlNote" style="text-align:center">Жишээ ачаалж байна…</p></div></div>`;
  const img = el.querySelector('#dlImg'), note = el.querySelector('#dlNote'); let tm = 0;
  const refresh = () => { clearTimeout(tm); tm = setTimeout(async () => { const u = await docSample(k); if (!img.isConnected) return; if (u) { img.src = u; note.textContent = 'Жишээ өгөгдлөөр'; } else note.textContent = k === 'instr' || k === 'insp' ? 'Үзлэг · ХАБ хэсэгт тоног төхөөрөмж нэмсний дараа жишээ гарна' : 'Жишээ гаргаж чадсангүй'; }, 250); };
  const setv = (f, v) => { if (v === '' || v == null || (k !== '_all' && String(v) === String(base[f]))) delete own[f]; else own[f] = v; save(); renderFormSide(); refresh(); };
  const fs = el.querySelector('#dl_fs'), lhv = el.querySelector('#dl_logoH');
  fs.addEventListener('input', () => { el.querySelector('#dlFsV').textContent = fs.value + '%'; }); fs.addEventListener('change', () => setv('fs', +fs.value));
  lhv.addEventListener('input', () => { el.querySelector('#dlLhV').textContent = lhv.value + '%'; }); lhv.addEventListener('change', () => setv('logoH', +lhv.value));
  el.querySelector('#dl_logo').addEventListener('change', e => setv('logo', e.target.value));
  ['title', 'foot'].forEach(f => { const i = el.querySelector('#dl_' + f); if (i) i.addEventListener('change', () => setv(f, i.value.trim())); });
  el.querySelectorAll('[id^="dco_"]').forEach(i => i.addEventListener('change', () => { const C2 = company(); C2[i.id.slice(4)] = i.value; S.company = C2; save(); refresh(); }));
  const rs = el.querySelector('#dlReset'); if (rs) rs.addEventListener('click', () => { A[k] = {}; save(); renderFormSide(); renderDocLib(el); });
  const lg = el.querySelector('#dlLogo'); if (lg) lg.addEventListener('click', () => { const b = $('#logoPick'); if (b) b.click(); setTimeout(refresh, 1500); });
  const lr = el.querySelector('#dlLogoReset'); if (lr) lr.addEventListener('click', () => { const b = $('#logoReset'); if (b) b.click(); setTimeout(() => { el.querySelector('.brand-logo').src = logoSrc(); refresh(); }, 300); });
  const pr = async () => { const u = await (async () => { const p = window.__docK; window.__docK = 0; try { return k === 'quote' || k === '_all' ? (await quoteFormImgs(docSampleJob()))[0].url : null; } finally { window.__docK = p; } })(); if (u) printImgs([{ url: u, alias: 's' }], false, 'letter', d.n, true); else if (img.src) printImgs([{ url: img.src, alias: 's' }], k === 'insp', 'a4', d.n, true); };
  el.querySelector('#dlPrint').addEventListener('click', pr); el.querySelector('.dlprev').addEventListener('click', pr);
  refresh();
}
