/* ================= Kh International — customers: organisations & contact persons =================
   Built automatically from jobs and quotations; used as pick-lists everywhere a customer / contact is typed,
   and as a search filter in the job list. Сан → «Харилцагч» shows each organisation with its people and jobs. */
const lc = s => String(s || '').trim().toLowerCase();
function orgs() {
  if (!Array.isArray(S.orgs)) {
    S.orgs = [];
    (S.jobs || []).forEach(j => { const f = j.quote && j.quote.qf; orgLearn({ org: j.customer, ...(f || {}) }, true); });
    if (S.quote && S.quote.customer) orgLearn({ org: S.quote.customer, ...(S.quote.qf || {}) }, true);
    save();
  }
  return S.orgs;
}
const orgFind = name => { const n = lc(name); return n ? orgs().find(o => lc(o.name) === n || (o.alias || []).some(a => lc(a) === n)) : null; };
const personSplit = s => { const m = String(s || '').match(/^(.*?)\s*\((.*)\)\s*$/); return m ? { name: m[1].trim(), pos: m[2].trim() } : { name: String(s || '').trim(), pos: '' }; };
const personFull = p => p.pos ? `${p.name} (${p.pos})` : p.name;
/* upsert organisation + person from a job / quote form ({org, custId, address, person, email, phone}) */
function orgLearn(d, quiet) {
  const name = String(d.org || '').trim(); if (!name) return null;
  let o = (Array.isArray(S.orgs) ? S.orgs : (S.orgs = [])).find(x => lc(x.name) === lc(name));
  if (!o) { o = { id: uid(), name, custId: '', address: '', phone: '', note: '', persons: [], added: today() }; S.orgs.push(o); }
  if (d.custId && !o.custId) o.custId = d.custId; if (d.address && !o.address) o.address = d.address;
  const P = personSplit(d.person);
  if (P.name) {
    let p = o.persons.find(x => lc(x.name) === lc(P.name));
    if (!p) { p = { name: P.name, pos: '', email: '', phone: '' }; o.persons.push(p); }
    if (P.pos) p.pos = P.pos; if (d.email) p.email = d.email; if (d.phone) p.phone = d.phone;
  }
  if (!quiet) { save(); contactLists(); }
  return o;
}
function contactLists() {
  let h = document.getElementById('ctLists'); if (!h) { h = document.createElement('div'); h.id = 'ctLists'; h.hidden = true; document.body.appendChild(h); }
  const O = orgs();
  h.innerHTML = `<datalist id="dl-org">${O.map(o => `<option value="${esc(o.name)}">${esc([o.custId, o.persons.length ? o.persons.length + ' хүн' : ''].filter(Boolean).join(' · '))}</option>`).join('')}</datalist>
    <datalist id="dl-person">${O.flatMap(o => o.persons.map(p => `<option value="${esc(personFull(p))}">${esc([o.name, p.email || p.phone].filter(Boolean).join(' · '))}</option>`)).join('')}</datalist>`;
}
/* when a person is picked on a quote form, fill the empty contact fields from the directory */
function qfFillFromDir(f, orgName) {
  const o = orgFind(orgName), P = personSplit(f.person);
  const p = (o && o.persons.find(x => lc(x.name) === lc(P.name))) || orgs().flatMap(x => x.persons).find(x => lc(x.name) === lc(P.name));
  let ch = false;
  if (p) { if (!f.email && p.email) { f.email = p.email; ch = true; } if (!f.phone && p.phone) { f.phone = p.phone; ch = true; } }
  if (o) { if (!f.address && o.address) { f.address = o.address; ch = true; } if (!f.custId && o.custId) { f.custId = o.custId; ch = true; } }
  return ch;
}
const jobsOfOrg = o => (S.jobs || []).filter(j => lc(j.customer) === lc(o.name) || (o.alias || []).some(a => lc(a) === lc(j.customer)));

/* ---------- Сан → «Харилцагч» ---------- */
const CT = { sel: null, q: '' };
function renderOrgSide() {
  const el = $('#orgList'); if (!el) return; const q = lc(CT.q);
  const list = orgs().filter(o => !q || lc([o.name, o.custId, o.address, ...o.persons.map(p => [p.name, p.pos, p.email, p.phone].join(' '))].join(' ')).includes(q)).sort((a, b) => a.name.localeCompare(b.name));
  el.innerHTML = list.length ? list.map(o => { const n = jobsOfOrg(o).length; return `<div class="jitem${CT.sel === o.id ? ' on' : ''}" data-org="${o.id}"><span class="no" style="font-family:inherit">${esc(o.name)}</span><span class="pill">${n} ажил</span><span class="t">${esc(o.persons.map(p => p.name).join(', ') || '—')}</span></div>`; }).join('') : '<p class="note">Харилцагч алга. Ажил, үнийн саналд захиалагчийн нэр бичихэд энд автоматаар нэмэгдэнэ.</p>';
}
const PER_COLS = [{ k: 'name', t: 'Нэр' }, { k: 'pos', t: 'Албан тушаал' }, { k: 'email', t: 'Email' }, { k: 'phone', t: 'Утас', w: 140 }];
function renderOrgMain(el) {
  const o = orgs().find(x => x.id === CT.sel);
  if (!o) {
    const O = orgs();
    el.innerHTML = `<div class="jcard"><div class="bcard-h">Харилцагч — байгууллага, холбогдох хүн</div><div class="jbody">
      <p class="note">Ажил нээж захиалагчийн нэр бичих, үнийн саналд холбогдох хүн, email, утас бөглөх бүрт энд бүртгэгдэнэ. Дараа нь бүх талбарт жагсаалтаас сонгоход хаяг, Customer ID, email, утас автоматаар бөглөгдөнө.</p>
      <div class="summary">${[['Байгууллага', O.length], ['Холбогдох хүн', O.reduce((a, o) => a + o.persons.length, 0)], ['Ажил', (S.jobs || []).length]].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>
      <div class="addrow"><button class="btn primary" id="orgNew">+ Шинэ байгууллага</button></div></div></div>`;
    el.querySelector('#orgNew').addEventListener('click', () => { const n = prompt('Байгууллагын нэр:', ''); if (!n) return; const x = orgLearn({ org: n }); CT.sel = x.id; renderOrgSide(); renderOrgMain(el); });
    return;
  }
  const JL = jobsOfOrg(o);
  el.innerHTML = `<div class="jcard"><div class="bcard-h">${esc(o.name)} <span class="sp"></span><button class="btn sm ghost" id="orgDel">Устгах</button></div><div class="jbody">
      <div class="jgrid">${fldIn('og_name', 'Байгууллагын нэр', o.name)}${fldIn('og_custId', 'Customer ID', o.custId)}${fldIn('og_phone', 'Утас', o.phone)}${fldIn('og_alias', 'Өөр нэр (таслалаар)', (o.alias || []).join(', '))}</div>
      ${fldIn('og_address', "Хаяг (Customer's address)", o.address)}${fldIn('og_note', 'Тэмдэглэл', o.note)}
    </div></div>
    <div class="jcard"><div class="bcard-h">Холбогдох хүмүүс</div><div class="jbody">${edTable('op', PER_COLS, o.persons)}</div></div>
    <div class="jcard"><div class="bcard-h">Ажил, үнийн санал (${JL.length})</div><div class="jbody">${JL.length ? `<div class="tblwrap"><table class="dt"><thead><tr><th>Ажил</th><th>Нэр</th><th>Үнийн санал</th><th>Холбогдох хүн</th><th class="r">Дүн, ₮</th><th>Төлөв</th></tr></thead><tbody>${JL.map(j => { const q = j.quote || {}, f = q.qf || {}; let net = 0; try { net = j.quote ? quoteCalc(j).net : 0; } catch (e) { } return `<tr class="jrow" data-job="${j.id}" style="cursor:pointer"><td class="num">${esc(j.no)}</td><td>${esc(j.title || '—')}</td><td class="num">${esc(q.no || '')}${q.date ? ' · ' + esc(q.date) : ''}</td><td>${esc(f.person || '')}</td><td class="r num">${net ? money(net) : ''}</td><td><span class="pill st-${j.status}">${jstName(j.status)}</span></td></tr>`; }).join('')}</tbody></table></div>` : '<p class="note">Энэ байгууллагад ажил алга.</p>'}</div></div>`;
  const re = () => { save(); contactLists(); renderOrgSide(); renderOrgMain(el); };
  ['name', 'custId', 'phone', 'address', 'note'].forEach(k => el.querySelector('#og_' + k).addEventListener('change', e => {
    const v = e.target.value.trim(); if (k === 'name') { if (!v) return; const old = o.name; (S.jobs || []).forEach(j => { if (lc(j.customer) === lc(old)) j.customer = v; }); o.alias = [...new Set([...(o.alias || [])].filter(a => lc(a) !== lc(v)))]; } o[k] = v; re();
  }));
  el.querySelector('#og_alias').addEventListener('change', e => { o.alias = e.target.value.split(',').map(s => s.trim()).filter(Boolean); re(); });
  el.querySelector('#orgDel').addEventListener('click', () => { if (!confirm(`«${o.name}»-г жагсаалтаас устгах уу? (ажлууд хэвээр үлдэнэ)`)) return; S.orgs = orgs().filter(x => x !== o); CT.sel = null; re(); });
  bindEd(el, { op: { arr: () => o.persons, cols: PER_COLS, blank: () => ({ name: '', pos: '', email: '', phone: '' }) } }, () => { save(); contactLists(); renderOrgSide(); });
  el.querySelectorAll('[data-job]').forEach(r => r.addEventListener('click', () => { J.sel = r.dataset.job; J.dash = false; J.sub = 'main'; setModule('jobs'); renderJobs(); }));
}
(() => {
  const s = $('#orgSearch'); if (s) s.addEventListener('input', () => { CT.q = s.value; renderOrgSide(); });
  const l = $('#orgList'); if (l) l.addEventListener('click', e => { const it = e.target.closest('[data-org]'); if (!it) return; CT.sel = CT.sel === it.dataset.org ? null : it.dataset.org; renderOrgSide(); renderOrgMain($('#infoMain')); });
})();
