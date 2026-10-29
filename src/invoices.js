/* ================= Kh International — invoices (INVOICE) in one place =================
   Баримт бичиг → «Нэхэмжлэх»: every invoice — from jobs and stand-alone — with the company INVOICE form
   (BILL TO, CUSTOMER PO, TERMS, lines, VAT, bank, «Invoiced by» with optional stamp/signature).
   Old Excel invoices (… INV …xlsx) can be imported; each organisation's last BILL TO fills the next invoice. */
const stdInvs = () => (S.invoices = Array.isArray(S.invoices) ? S.invoices : []);
const INVV = { sel: null, q: '', st: '' };
function allInvoices() {
  const A = []; (S.jobs || []).forEach(j => (j.inv || []).forEach(i => { if (!i.id) i.id = uid(); A.push({ i, job: j }); }));
  stdInvs().forEach(i => { if (!i.id) i.id = uid(); A.push({ i, job: null }); });
  return A;
}
const invFind = id => allInvoices().find(o => o.i.id === id) || null;
function nextInvNo() {
  // continue from the most recent 4-digit invoice number (by date), never reuse a number
  const A = allInvoices().map(o => ({ m: String(o.i.no || '').match(/^INV-?(\d{1,4})$/i), d: o.i.date || '', imp: o.i.imp })).filter(x => x.m).map(x => ({ n: +x.m[1], d: x.d, imp: x.imp }));
  const byDate = A.slice().sort((a, b) => b.d.localeCompare(a.d) || b.n - a.n)[0], own = A.filter(x => !x.imp).reduce((m, x) => Math.max(m, x.n), 0);
  let n = Math.max(byDate ? byDate.n : 0, own, (+S.invSeq || 0) < 10000 ? +S.invSeq || 0 : 0) + 1; const used = new Set(A.map(x => x.n)); while (used.has(n)) n++;
  S.invSeq = n; return 'INV' + String(n).padStart(4, '0');
}
const invCo = o => (o.i.bill && o.i.bill.company) || (o.job && o.job.customer) || '';
/* BILL TO for an organisation: its last invoice, otherwise the customer directory */
function billFor(org, job) {
  const k = formOrgKey(org || ''), last = k ? allInvoices().filter(o => o.i.bill && o.i.bill.company && formOrgKey(o.i.bill.company) === k).sort((a, b) => String(b.i.date || '').localeCompare(String(a.i.date || '')))[0] : null;
  if (last) { const b = JSON.parse(JSON.stringify(last.i.bill)); return b; }
  const o = orgFind(org), f = job && job.quote && job.quote.qf, p = o && o.persons[0];
  return { name: (f && f.person) || (p ? personFull(p) : ''), company: (o && o.name) || org || '', address: (f && f.address) || (o && o.address) || '', phone: (f && f.phone) || (p && p.phone) || '', mail: (f && f.email) || (p && p.email) || '' };
}
function invTotals(i) { const sub = (i.items || []).reduce((a, r) => a + Math.round((+r.q || 0) * (+r.p || 0)), 0), vat = Math.round(sub * (+i.vat || 0) / 100); return { sub, vat, tot: sub + vat }; }
/* make sure an invoice has the full form fields (old ones only had no / date / due / amount) */
function invFill(i, job) {
  if (!i.id) i.id = uid();
  if (i.vat == null) i.vat = job && job.quote && job.quote.vat != null ? +job.quote.vat || 0 : 10;
  if (!i.bill) i.bill = billFor(job ? job.customer : '', job);
  if (i.po == null) i.po = ''; if (i.terms == null) i.terms = job ? (job.title || '') : ''; if (i.comment == null) i.comment = '';
  if (!Array.isArray(i.items) || !i.items.length) { const net = Math.round((+i.amount || 0) / (1 + (+i.vat || 0) / 100)); i.items = [{ d: (job && ((job.quote && job.quote.qf && job.quote.qf.title) || job.title)) || '', q: 1, p: net }]; }
  return i;
}
function invSync(i) { if (i.items && i.items.length) i.amount = invTotals(i).tot; }

/* ---------- the INVOICE form (A4), drawn like the company's Excel invoice ---------- */
async function invoiceImgs(i, KK) {
  try { await document.fonts.ready; } catch (e) { } await logoImg();
  const C = company(), ST = docStyle('invoice'), W = 210, H = 297, K = KK || window.__docK || PRINT_K, L = 24, R = 186, BL = '#1270c0', F = QFS.F;
  const c = document.createElement('canvas'); c.__fs = docFs('invoice'); c.width = W * K; c.height = H * K; const x = c.getContext('2d'); x.scale(K, K); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  const T = (s, X, Y, o = {}) => { x.font = `${o.b ? 700 : 400} ${(o.s || 2.9) * 1.08}px ${F}`; x.fillStyle = o.c || '#000'; x.textAlign = o.a || 'left'; x.textBaseline = 'middle'; let v = String(s ?? ''); if (o.w) while (v.length > 1 && x.measureText(v).width > o.w) v = v.slice(0, -2) + '…'; x.fillText(v, X, Y); return x.measureText(v).width; };
  const bar = (X, Y, w, h) => { x.fillStyle = BL; x.fillRect(X, Y, w, h); };
  const box = (X, Y, w, h, f) => { if (f) { x.fillStyle = f; x.fillRect(X, Y, w, h); } x.strokeStyle = '#000'; x.lineWidth = 0.2; x.strokeRect(X, Y, w, h); };
  const wrap = (s, w, sz) => { x.font = `400 ${sz * 1.08}px ${F}`; const out = []; String(s || '').split('\n').forEach(p => { let l = ''; p.split(' ').forEach(wd => { const t = l ? l + ' ' + wd : wd; if (x.measureText(t).width > w && l) { out.push(l); l = wd; } else l = t; }); out.push(l); }); return out; };
  const B = i.bill || {}, tt = invTotals(i), RL = ST.logo === 'right';
  // header
  const lh = Math.min(18, 13 * docLogoK('invoice')); if (ST.logo !== 'none') drawLogo(x, RL ? R : L, 30 - lh, lh, RL ? 'right' : 'left');
  T('INVOICE', RL ? L + 30 : 145, 25, { b: 1, s: 6.2, c: BL, a: 'center' });
  [C.a1 + ' ' + (C.a2 || '').replace(/^\s+/, ''), C.a3].join('\n').split('\n').filter(Boolean).forEach((a, k) => T(a.trim(), L, 36 + k * 4.2, { s: 2.9 }));
  T('Contact: ' + (C.phone || ''), L, 36 + 2 * 4.2, { s: 2.9 }); T('Mail: ', L, 36 + 3 * 4.2, { s: 2.9 }); T(C.mail || '', L + 8.3, 36 + 3 * 4.2, { s: 2.9, c: QFS.link });
  bar(124, 43.2, R - 124, 4.2); T('INVOICE #', 140, 45.3, { b: 1, s: 2.8, c: '#fff', a: 'center' }); T('DATE', 168, 45.3, { b: 1, s: 2.8, c: '#fff', a: 'center' });
  T(i.no || '', 140, 50, { s: 2.9, a: 'center' }); T(fmtD(i.date), 168, 50, { s: 2.9, a: 'center' });
  x.fillStyle = QFS.purple; x.fillRect(L, 54.5, 165 - L, 0.45);
  // bill to · po · terms
  bar(L, 60, 84, 4.2); T('BILL TO', L + 1, 62.1, { b: 1, s: 2.8, c: '#fff' });
  bar(124, 60, R - 124, 4.2); T('CUSTOMER PO', 140, 62.1, { b: 1, s: 2.8, c: '#fff', a: 'center' }); T('TERMS', 168, 62.1, { b: 1, s: 2.8, c: '#fff', a: 'center' });
  T(i.po || '', 140, 68, { s: 2.8, a: 'center', w: 30 }); wrap(i.terms || '', 34, 2.8).slice(0, 4).forEach((l, k) => T(l, 168, 68 + k * 3.6, { s: 2.8, a: 'center' }));
  let y = 67.5; const KV = (k, v) => { const w = T(k, L, y, { b: 1, s: 2.9 }); const ls = wrap(v || '', 98 - w, 2.9); ls.forEach((l, n) => T(l, L + w + 1, y + n * 3.8, { s: 2.9 })); y += Math.max(1, ls.length) * 3.8; };
  KV('Name:', B.name); KV('Company Name:', B.company); KV('Address:', B.address); y = Math.max(y + 4, 92); KV('Phone:', B.phone); KV('Mail:', B.mail);
  // items
  y = Math.max(y + 6, 108); const cols = [[L, 33], [33, 92], [92, 105], [105, 135], [135, R]];
  cols.forEach(([a, b], k) => { box(a, y, b - a, 5.4, BL); T(['No.', 'Description', 'QTY', 'EACH PRICE', 'AMOUNT'][k], k === 1 ? a + 1.5 : (a + b) / 2, y + 2.7, { b: 1, s: 2.8, c: '#fff', a: k === 1 ? 'left' : 'center' }); });
  y += 5.4;
  (i.items || []).forEach((r, k) => {
    const ls = wrap(r.d || '', 92 - 33 - 3, 2.8), rh = Math.max(7.6, ls.length * 3.5 + 3);
    cols.forEach(([a, b]) => box(a, y, b - a, rh)); const cy = y + rh / 2;
    T(k + 1, (L + 33) / 2, cy, { s: 2.8, a: 'center' }); ls.forEach((l, n) => T(l, 62.5, y + rh / 2 + (n - (ls.length - 1) / 2) * 3.5, { s: 2.8, a: 'center' }));
    T(n0(r.q), 98.5, cy, { s: 2.8, a: 'center' }); T(+r.p ? n0(r.p) : '', 133.5, cy, { s: 2.8, a: 'right' }); T(n0(Math.round((+r.q || 0) * (+r.p || 0))), R - 1.5, cy, { s: 2.7, a: 'right' });
    y += rh;
  });
  [['Total', n0(tt.sub)], ['VAT', n0(tt.vat)], ['TOTAL WITH VAT', n0(tt.tot)]].forEach(([k, v]) => { box(L, y, 105 - L, 4.4, '#f2f2f2'); box(105, y, 30, 4.4, '#f2f2f2'); box(135, y, R - 135, 4.4, '#f2f2f2'); T(k, (L + 105) / 2, y + 2.2, { b: 1, s: 2.8, a: 'center' }); T(v, R - 1.5, y + 2.2, { s: 2.8, a: 'right' }); y += 4.4; });
  box(L, y, 45 - L, 4.4, '#f2f2f2'); box(45, y, R - 45, 4.4); T('COMMENT:', (L + 45) / 2, y + 2.2, { b: 1, s: 2.8, a: 'center' }); T(i.comment || '', 46.5, y + 2.2, { s: 2.7, w: R - 48 }); y += 4.4;
  // bank
  y += 14; T('Bank: ' + String(C.bank || '').split(/\s+/)[0], L, y, { s: 2.9 }); T('Account:' + String(C.bank || '').split(/\s+/).slice(1).join(' '), L, y + 4, { s: 2.9 });
  T('Name: ' + (C.name || ''), L, y + 11, { s: 2.9 }); T('Register: ' + (C.reg || ''), L, y + 15, { s: 2.9 });
  // invoiced by (+ stamp / signature)
  y += 27; T('Invoiced by ….............................................', 105, y, { s: 2.9, a: 'center' });
  if (i.stamp !== false && C.stamp) { const im = await imgLoad(C.stamp); if (im) { const h = 24, w = h * im.naturalWidth / im.naturalHeight; x.drawImage(im, 108 - w / 2, y - h / 2 - 1, w, h); } }
  return [{ url: c.toDataURL('image/jpeg', 0.95), alias: 'inv' }];
}
async function invOut(i, mode) {
  try { const imgs = await invoiceImgs(i), name = `${i.no || 'INV'} - ${(i.bill && i.bill.company) || 'Customer'} - Invoice`; if (mode === 'print') printImgs(imgs, false, 'a4', name); else pdfImgs(imgs, false, name); }
  catch (e) { console.error(e); toast('Алдаа: ' + e.message); }
}

/* ---------- Баримт бичиг → Нэхэмжлэх ---------- */
function renderInvSide() {
  const box = $('#ivList'); if (!box) return; const q = lc(INVV.q);
  const L = allInvoices().filter(o => (!q || lc([o.i.no, invCo(o), o.i.po, o.i.terms, o.job && o.job.no].join(' ')).includes(q)) && (!INVV.st || (INVV.st === 'imp' ? o.i.imp : !o.i.imp && invState(o.i)[0] === INVV.st)));
  const G = {}; L.forEach(o => { const k = (orgFind(invCo(o)) || {}).name || invCo(o) || '— Байгууллагагүй —'; (G[k] = G[k] || []).push(o); });
  box.innerHTML = Object.keys(G).sort().map(k => `<div class="fmorg">${esc(k)} <span class="muted">· ${G[k].length}</span></div>` + G[k].sort((a, b) => String(b.i.date || '').localeCompare(String(a.i.date || ''))).map(o => { const st = invState(o.i); return `<div class="bitem fmi${INVV.sel === o.i.id && J.tab === 'invoices' ? ' on' : ''}" data-iv="${o.i.id}"><div style="min-width:0"><div class="t"><span class="mono">${esc(o.i.no || '—')}</span> · ${money(+o.i.amount || 0)} ₮</div><div class="m">${esc(o.i.date || '')}${o.job ? ' · ' + esc(o.job.no) : ''} · ${o.i.imp ? 'Excel (түүх)' : st[1]}</div></div></div>`; }).join('')).join('') || '<p class="note">Нэхэмжлэх алга. «+ Шинэ нэхэмжлэх», ажлын «Нэхэмжлэл, төлбөр» хэсэг, эсвэл Excel-ээс оруулна.</p>';
}
(() => {
  const n = $('#ivNew'); if (n) n.addEventListener('click', () => { const org = prompt('Хэнд нэхэмжлэх вэ? (байгууллагын нэр)', ''); if (org == null) return; const i = invFill({ id: uid(), no: nextInvNo(), date: today(), due: addDays(today(), 30), amount: 0, pays: [], bill: billFor(org.trim()), items: [{ d: '', q: 1, p: 0 }] }, null); stdInvs().unshift(i); save(); INVV.sel = i.id; renderInvSide(); renderJobMain(); });
  const s = $('#ivSearch'); if (s) s.addEventListener('input', () => { INVV.q = s.value; renderInvSide(); });
  const f = $('#ivFilter'); if (f) f.addEventListener('change', () => { INVV.st = f.value; renderInvSide(); });
  const l = $('#ivList'); if (l) l.addEventListener('click', e => { const it = e.target.closest('[data-iv]'); if (!it) return; INVV.sel = it.dataset.iv; renderInvSide(); renderJobMain(); });
  const b = $('#ivImp'), i = $('#ivImpIn'); if (b && i) { b.addEventListener('click', () => i.click()); i.addEventListener('change', async () => { const F = [...i.files]; i.value = ''; if (F.length) await invImportFiles(F); }); }
})();
function openInvoice(id) { setModule('docs'); J.tab = 'invoices'; $$('[data-jtab]').forEach(x => x.classList.toggle('on', x.dataset.jtab === 'invoices')); ['jobs', 'kits', 'certs', 'dockets', 'forms', 'scopes', 'invoices'].forEach(t => { const e = $('#jtab-' + t); if (e) e.hidden = t !== 'invoices'; }); INVV.sel = id; renderInvSide(); renderJobMain(); }
function renderInvTab(el) {
  const o = INVV.sel ? invFind(INVV.sel) : null;
  if (!o) {
    const A = allInvoices().filter(x => !x.i.imp), open = A.filter(x => ['open', 'part', 'late'].includes(invState(x.i)[0])), late = A.filter(x => invState(x.i)[0] === 'late');
    const L = allInvoices().sort((a, b) => String(b.i.date || '').localeCompare(String(a.i.date || '')));
    el.innerHTML = `<div class="dhead"><div><h2>Нэхэмжлэх (INVOICE)</h2><p class="muted">${L.length} нэхэмжлэх · ажлаас болон бие даасан · Excel-ээс оруулсан түүх</p></div><span class="sp" style="flex:1"></span><button class="btn primary" id="ivNew2">+ Шинэ нэхэмжлэх</button></div>
      <div class="summary">${[['Авлага', money(open.reduce((a, x) => a + (+x.i.amount || 0) - invPaid(x.i), 0)), `${open.length} нэхэмжлэх`], ['Хугацаа хэтэрсэн', money(late.reduce((a, x) => a + (+x.i.amount || 0) - invPaid(x.i), 0)), `${late.length} нэхэмжлэх`, late.length ? 'late' : ''], ['Энэ сард нэхэмжилсэн', money(A.filter(x => String(x.i.date || '').slice(0, 7) === today().slice(0, 7)).reduce((a, x) => a + (+x.i.amount || 0), 0)), today().slice(0, 7)]].map(([k, v, s2, cl]) => `<div class="stat"><div class="k">${k}</div><div class="v ${cl || ''}">${v}<small>₮</small></div><div class="muted" style="font-size:12px">${s2}</div></div>`).join('')}</div>
      <div class="jcard"><div class="tblwrap" style="border:0"><table class="dt"><thead><tr><th>№</th><th>Огноо</th><th>Байгууллага</th><th>Ажил / Terms</th><th>PO</th><th class="r">Дүн (НӨАТ-тай), ₮</th><th>Төлөв</th></tr></thead><tbody>
      ${L.map(x => { const st = invState(x.i); return `<tr class="jrow" data-iv="${x.i.id}" style="cursor:pointer"><td class="num"><b>${esc(x.i.no || '—')}</b></td><td class="num">${esc(x.i.date || '')}</td><td>${esc(invCo(x) || '—')}</td><td>${x.job ? `<span class="mono">${esc(x.job.no)}</span> ` : ''}${esc(x.i.terms || '')}</td><td class="num">${esc(x.i.po || '')}</td><td class="r num">${money(+x.i.amount || 0)}</td><td>${x.i.imp ? '<span class="pill">Excel</span>' : `<span class="pill ${st[0] === 'paid' ? 'st-done' : st[0] === 'late' ? 'qst-lost' : st[0] === 'part' ? 'st-nest' : 'qst-sent'}">${st[1]}</span>`}</td></tr>`; }).join('') || '<tr><td colspan="7" class="muted">Нэхэмжлэх алга</td></tr>'}
      </tbody></table></div></div>`;
    el.querySelector('#ivNew2').addEventListener('click', () => $('#ivNew').click());
    el.querySelectorAll('[data-iv]').forEach(r => r.addEventListener('click', () => { INVV.sel = r.dataset.iv; renderInvSide(); renderJobMain(); }));
    return;
  }
  const i = invFill(o.i, o.job), B = i.bill, tt = invTotals(i), st = invState(i);
  el.innerHTML = `<div class="dhead"><div><h2>${esc(i.no || 'INVOICE')}</h2><p class="muted">${o.job ? `Ажил <a href="#" class="linkbtn" id="ivJob">${esc(o.job.no)}</a> · ` : 'Бие даасан · '}${i.imp ? 'Excel-ээс оруулсан (түүх)' : st[1]}</p></div><span class="sp" style="flex:1"></span>
    <button class="btn ghost" id="ivBack">← Жагсаалт</button><button class="btn ghost" id="ivDup">⧉ Хуулбар</button><button class="btn ghost" id="ivDel">Устгах</button><span class="outb"><button class="btn primary" data-ivo="pdf">INVOICE PDF</button><button class="btn ghost" data-ivo="print">🖨 Хэвлэх</button></span></div>
    <div class="dlwrap"><div>
      <div class="jcard"><div class="bcard-h">Нэхэмжлэх</div><div class="jbody"><div class="jgrid">${fldIn('iv_no', 'INVOICE #', i.no)}${fldIn('iv_date', 'Огноо (DATE)', i.date, { type: 'date' })}${fldIn('iv_due', 'Төлөх хугацаа', i.due, { type: 'date' })}${fldIn('iv_po', 'CUSTOMER PO', i.po)}${fldIn('iv_terms', 'TERMS (ажлын нэр)', i.terms)}${fldIn('iv_vat', 'НӨАТ, %', i.vat, { num: 1 })}</div></div></div>
      <div class="jcard"><div class="bcard-h">BILL TO <span class="sp"></span><button class="btn sm ghost" id="ivBillFill" title="Энэ байгууллагын сүүлийн нэхэмжлэх / харилцагчийн мэдээллээс бөглөх">↻ Сүүлийнхээс бөглөх</button></div><div class="jbody"><div class="jgrid">${fldIn('ivb_company', 'Company Name', B.company, { list: 'dl-org' })}${fldIn('ivb_name', 'Name (холбоо барих хүн)', B.name, { list: 'dl-person' })}${fldIn('ivb_phone', 'Phone', B.phone)}${fldIn('ivb_mail', 'Mail', B.mail)}</div>${fldIn('ivb_address', 'Address', B.address, { area: 1, rows: 2 })}</div></div>
      <div class="jcard"><div class="bcard-h">Мөрүүд</div><div class="jbody"><table class="dt qlt"><thead><tr><th style="width:26px">No.</th><th>Description</th><th class="r" style="width:70px">QTY</th><th class="r" style="width:130px">EACH PRICE, ₮</th><th class="r" style="width:120px">AMOUNT, ₮</th><th style="width:26px"></th></tr></thead><tbody>
        ${i.items.map((r, k) => `<tr><td class="num muted">${k + 1}</td><td><textarea class="inp" rows="1" data-ivl="${k}" data-ivk="d">${esc(r.d || '')}</textarea></td><td><input class="inp mono" type="number" step="any" data-ivl="${k}" data-ivk="q" value="${r.q ?? 1}" style="text-align:right"></td><td><input class="inp mono" type="number" step="any" data-ivl="${k}" data-ivk="p" value="${r.p ?? ''}" style="text-align:right"></td><td class="r num">${n0(Math.round((+r.q || 0) * (+r.p || 0)))}</td><td><button class="x" data-ivx="${k}" type="button">×</button></td></tr>`).join('')}
        <tr class="tot"><td></td><td colspan="3">Total</td><td class="r num">${n0(tt.sub)}</td><td></td></tr><tr><td></td><td colspan="3">VAT ${i.vat}%</td><td class="r num">${n0(tt.vat)}</td><td></td></tr><tr class="tot"><td></td><td colspan="3">TOTAL WITH VAT</td><td class="r num">${n0(tt.tot)}</td><td></td></tr></tbody></table>
        <div class="addrow"><button class="btn sm" id="ivAddL" type="button">+ Мөр</button>${o.job ? '<button class="btn sm ghost" id="ivFromQ" type="button">Үнийн саналын мөрүүдээс</button>' : ''}</div>
        ${fldIn('iv_comment', 'COMMENT', i.comment)}
        <label class="check" style="margin-top:8px"><input type="checkbox" id="iv_stamp"${i.stamp !== false ? ' checked' : ''}><span>Тамга, гарын үсгийн зураг тавих${company().stamp ? '' : ' — зураг оруулаагүй'}</span></label> <button class="btn sm ghost" id="ivStampPick" type="button">${company().stamp ? 'Тамга/гарын үсэг солих' : '+ Тамга/гарын үсгийн зураг'}</button>${company().stamp ? '<button class="btn sm ghost" id="ivStampDel" type="button">Хасах</button>' : ''}
      </div></div>
      <div class="jcard"><div class="bcard-h">Төлбөр <span class="sp"></span><button class="btn sm" id="ivPay">+ Төлбөр</button></div><div class="jbody">${(i.pays || []).length ? `<ul class="fmlog">${i.pays.map((p, k) => `<li><span class="num">${esc(p.date)}</span> · ${money(p.amount)} ₮ <button class="linkbtn" data-ivpx="${k}">✕</button></li>`).join('')}</ul>` : '<p class="note">Төлбөр бүртгээгүй.</p>'}<p class="note">Төлсөн ${money(invPaid(i))} ₮ · үлдэгдэл ${money(Math.max(0, (+i.amount || 0) - invPaid(i)))} ₮${i.imp ? ' · Excel-ээс оруулсан нэхэмжлэх авлагад тооцогдохгүй' : ''}</p>${i.imp ? '<label class="check"><input type="checkbox" id="iv_imp" checked><span>Түүх (авлагад тооцохгүй)</span></label>' : ''}</div></div>
    </div><div><div class="dlprev" title="Дарж томруулна"><img id="ivImg" alt="INVOICE"></div></div></div>`;
  const img = el.querySelector('#ivImg'); let tm = 0;
  const refresh = () => { clearTimeout(tm); tm = setTimeout(() => invoiceImgs(i, 3).then(im => { if (img.isConnected) img.src = im[0].url; }).catch(() => { }), 200); };
  const re = () => { invSync(i); save(); renderInvSide(); renderInvTab(el); if (o.job && typeof renderJList === 'function') { } };
  [['iv_no', 'no'], ['iv_date', 'date'], ['iv_due', 'due'], ['iv_po', 'po'], ['iv_terms', 'terms'], ['iv_comment', 'comment']].forEach(([id, k]) => el.querySelector('#' + id).addEventListener('change', e => { i[k] = e.target.value; save(); renderInvSide(); refresh(); }));
  el.querySelector('#iv_vat').addEventListener('change', e => { i.vat = +e.target.value || 0; re(); });
  ['company', 'name', 'phone', 'mail', 'address'].forEach(k => el.querySelector('#ivb_' + k).addEventListener('change', e => { B[k] = e.target.value; if (k === 'company' && B.company) orgLearn({ org: B.company }); save(); renderInvSide(); refresh(); }));
  el.querySelector('#ivBillFill').addEventListener('click', () => { const nb = billFor(B.company || (o.job && o.job.customer) || '', o.job); i.bill = nb; save(); renderInvTab(el); });
  el.querySelectorAll('[data-ivl]').forEach(f => f.addEventListener('change', () => { const r = i.items[+f.dataset.ivl], k = f.dataset.ivk; r[k] = k === 'd' ? f.value : (+f.value || 0); re(); }));
  el.querySelectorAll('[data-ivx]').forEach(b => b.addEventListener('click', () => { i.items.splice(+b.dataset.ivx, 1); if (!i.items.length) i.items.push({ d: '', q: 1, p: 0 }); re(); }));
  el.querySelector('#ivAddL').addEventListener('click', () => { i.items.push({ d: '', q: 1, p: 0 }); re(); });
  const fq = el.querySelector('#ivFromQ'); if (fq) fq.addEventListener('click', () => { try { const L = qfLines(o.job); if (L.length) { i.items = L.map(l => ({ d: l.d, q: l.q, p: Math.round(l.p) })); re(); toast('Үнийн саналын мөрүүд орлоо'); } } catch (e) { toast('Үнийн саналын мөр алга'); } });
  el.querySelector('#iv_stamp').addEventListener('change', e => { i.stamp = e.target.checked; save(); refresh(); });
  el.querySelector('#ivStampPick').addEventListener('click', () => { const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.onchange = async () => { const file = f.files[0]; if (!file) return; const C2 = company(); C2.stamp = await imgThumb(file, 900); S.company = C2; save(); renderInvTab(el); toast('Тамга / гарын үсгийн зураг хадгалагдлаа — бүх нэхэмжлэхэд гарна'); }; f.click(); });
  const sd = el.querySelector('#ivStampDel'); if (sd) sd.addEventListener('click', () => { const C2 = company(); delete C2.stamp; S.company = C2; save(); renderInvTab(el); });
  el.querySelector('#ivPay').addEventListener('click', () => { const left = (+i.amount || 0) - invPaid(i); const v = prompt(`Төлбөрийн дүн, ₮ (үлдэгдэл ${money(left)}):`, String(Math.max(0, left))); if (v == null) return; const amt = +String(v).replace(/[^\d.]/g, ''); if (!amt) return; const d = prompt('Төлсөн огноо (YYYY-MM-DD):', today()) || today(); (i.pays = i.pays || []).push({ date: d, amount: amt }); if (o.job) jobLog(`Төлбөр орсон: ${money(amt)} ₮ (${i.no})`, o.job); re(); });
  el.querySelectorAll('[data-ivpx]').forEach(b => b.addEventListener('click', () => { i.pays.splice(+b.dataset.ivpx, 1); re(); }));
  const ii = el.querySelector('#iv_imp'); if (ii) ii.addEventListener('change', e => { i.imp = e.target.checked; re(); });
  el.querySelector('#ivBack').addEventListener('click', () => { INVV.sel = null; renderInvSide(); renderJobMain(); });
  el.querySelector('#ivDel').addEventListener('click', () => { if (!confirm(`${i.no} нэхэмжлэхийг устгах уу?`)) return; if (o.job) o.job.inv = o.job.inv.filter(x => x !== i); else S.invoices = stdInvs().filter(x => x !== i); INVV.sel = null; save(); renderInvSide(); renderJobMain(); });
  el.querySelector('#ivDup').addEventListener('click', () => { const n = JSON.parse(JSON.stringify(i)); Object.assign(n, { id: uid(), no: nextInvNo(), date: today(), due: i.due && i.date ? addDays(today(), Math.max(0, Math.round((new Date(i.due) - new Date(i.date)) / 864e5))) : addDays(today(), 30), pays: [] }); delete n.imp; if (o.job) { o.job.inv.push(n); jobLog(`Нэхэмжлэл ${i.no}-ээс ${n.no} хуулсан`, o.job); } else stdInvs().unshift(n); INVV.sel = n.id; save(); renderInvSide(); renderJobMain(); toast('⧉ ' + n.no + ' үүслээ'); });
  el.querySelectorAll('[data-ivo]').forEach(b => b.addEventListener('click', () => { invOut(i, b.dataset.ivo); if (o.job && b.dataset.ivo === 'pdf') jobLog(`Нэхэмжлэх ${i.no} PDF гаргасан`, o.job); }));
  el.querySelector('.dlprev').addEventListener('click', async () => printImgs(await invoiceImgs(i), false, 'a4', i.no, true));
  const jl = el.querySelector('#ivJob'); if (jl) jl.addEventListener('click', ev => { ev.preventDefault(); setModule('jobs'); J.sel = o.job.id; J.sub = 'main'; renderJobs(); });
  refresh();
}

/* ---------- import the company's Excel invoice books (each sheet = one INVOICE) ---------- */
function invParseSheet(ws, X) {
  const R = X.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }), str = v => String(v ?? '').replace(/\r/g, '').trim();
  const find = re => { for (let r = 0; r < R.length; r++) for (let c = 0; c < R[r].length; c++) if (re.test(str(R[r][c]))) return [r, c]; return null; };
  const below = p => { if (!p) return ''; for (let r = p[0] + 1; r < Math.min(R.length, p[0] + 3); r++) { const v = R[r][p[1]]; if (str(v)) return v; } return ''; };
  const hI = find(/^INVOICE\s*#/i); if (!hI) return null;
  const no = str(below(hI)), dv = below(find(/^DATE$/i)), po = str(below(find(/^CUSTOMER\s*PO/i))), terms = str(below(find(/^TERMS$/i))).replace(/\s*\n\s*/g, ' ');
  const date = typeof dv === 'number' ? new Date(Math.round((dv - 25569) * 864e5)).toISOString().slice(0, 10) : str(dv).slice(0, 10);
  const bill = { name: '', company: '', address: '', phone: '', mail: '' }; let inAddr = false; const addr = [];
  const hB = find(/^BILL TO$/i), hN = find(/^No\.?$/i);
  for (let r = hB ? hB[0] + 1 : 0; r < (hN ? hN[0] : R.length); r++) {
    const v = str(R[r][0]); if (!v) continue;
    let m;
    if ((m = v.match(/^Company Name\s*:\s*(.*)$/is))) { bill.company = m[1].replace(/["“”]/g, '').trim(); inAddr = false; }
    else if ((m = v.match(/^Name\s*:\s*(.*)$/is))) { bill.name = m[1].trim(); inAddr = false; }
    else if ((m = v.match(/^Address\s*:\s*(.*)$/is))) { if (m[1].trim()) addr.push(m[1].trim()); inAddr = true; }
    else if ((m = v.match(/^Phone\s*:\s*(.*)$/is))) { bill.phone = m[1].trim(); inAddr = false; }
    else if ((m = v.match(/^Mail\s*:\s*(.*)$/is))) { bill.mail = m[1].trim(); inAddr = false; }
    else if (inAddr) addr.push(v);
  }
  { const seen = new Set(), parts = []; addr.join('\n').split(/\n+/).map(s => s.trim()).filter(Boolean).forEach(s => { const k = s.toLowerCase().replace(/\W+/g, ''); if ([...seen].some(x => x.includes(k) || k.includes(x))) return; seen.add(k); parts.push(s); }); bill.address = parts.join(', '); }
  const items = []; let vatAmt = 0, sub = 0;
  if (hN) for (let r = hN[0] + 1; r < R.length; r++) {
    const a = str(R[r][0]); if (/^total\b/i.test(a) && !/with/i.test(a)) { sub = +R[r][4] || 0; continue; } if (/^VAT$/i.test(a)) { vatAmt = +R[r][4] || 0; continue; } if (/^TOTAL WITH VAT/i.test(a) || /^COMMENT/i.test(a)) break;
    const d = str(R[r][1]).replace(/\s*\n\s*/g, ' '); if (!d && !+R[r][4]) continue;
    const q = +R[r][2] || 1, p = +R[r][3] || (+R[r][4] ? (+R[r][4]) / q : 0); items.push({ d, q, p: Math.round(p) });
  }
  const cm = find(/^COMMENT/i), comment = cm ? str(R[cm[0]].slice(1).find(v => str(v)) || '') : '';
  const vat = sub ? Math.round(vatAmt / sub * 100) : 10;
  if (!no || !bill.company) return null;
  return { no, date, po, terms, bill, items, vat: vat === 10 || vat === 0 ? vat : 10, comment };
}
async function invImportFiles(files) {
  if (!window.XLSX) await loadScript(XLSX_URL);
  const got = [], bad = [];
  for (const f of files) { try { const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); let n = 0; wb.SheetNames.forEach(sn => { const r = invParseSheet(wb.Sheets[sn], XLSX); if (r) { got.push(r); n++; } }); if (!n) bad.push(f.name); } catch (e) { bad.push(f.name); } }
  const tot = r => (r.items || []).reduce((a, x) => a + Math.round((+x.q || 0) * (+x.p || 0)), 0), key = r => (r.no + '|' + formOrgKey(r.bill.company) + '|' + tot(r)).toLowerCase(), have = new Set(allInvoices().map(o => key({ no: o.i.no, bill: o.i.bill || { company: invCo(o) }, items: o.i.items || [{ q: 1, p: Math.round((+o.i.amount || 0) / 1.1) }] })));
  let n = 0, dup = 0;
  got.forEach(r => { const k = key(r); if (have.has(k)) { dup++; return; } have.add(k); const i = { id: uid(), ...r, due: '', pays: [], imp: 1 }; invSync(i); stdInvs().push(i); n++;
    orgLearn({ org: r.bill.company, person: r.bill.name, email: r.bill.mail, phone: r.bill.phone, address: r.bill.address }, true); });
  save(); contactLists(); renderInvSide(); renderJobMain();
  toast(`🧾 ${n} нэхэмжлэх орлоо${dup ? ` · ${dup} давхардсаныг алгассан` : ''}${bad.length ? ' · уншаагүй: ' + bad.join(', ') : ''}`, 8000);
}
