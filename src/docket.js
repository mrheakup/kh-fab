/* ================= Kh International — Delivery Docket (packing list) + packing tags =================
   Last step of a job («Хүлээлгэх»): after quote → scope → production → progress, the goods leave with a
   Delivery Docket in the company's own layout (logo + tagline, company block, purple rule, DELIVERY DOCKET /
   DOCKET NO, date / delivery to / supplied by, PO / order / delivery date / phone, № | Description | Quantity
   (Ordered · Shipped · Backorder), product photo, Delivered / Received signatures) and a tag for each package. */
const fmtDL = d => { if (!d) return ''; const t = new Date(d + 'T00:00:00'); return isNaN(t) ? d : `${t.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][t.getMonth()]} ${t.getFullYear()}`; };
const dockNo = n => String(n).padStart(4, '0');
function dockDefaults(job) {
  if (job.dock) return job.dock;
  jx(job); const f = (job.quote && job.quote.qf) || {}, P = personSplit(f.person || '');
  S.docketSeq = (+S.docketSeq || 231) + 1;
  job.dock = { no: dockNo(S.docketSeq), date: today(), to: job.customer || '', supplied: 'Kh International', po: '', orderDate: job.quote.date || job.created || '', delDate: today(), phone: f.phone || '', contact: P.name || '', address: f.address || '',
    items: dockItemsFrom(job, 'quote'), photos: [], delivered: '', received: '', note: '', tagsPer: 4 };
  save(); return job.dock;
}
function dockItemsFrom(job, src) {
  if (src === 'parts') { try { return jobParts(job).map(p => ({ desc: `${p.name} — ${p.mat} ${p.thk} mm`, ordered: p.qty, shipped: p.qty, pk: 1, kg: Math.round(partInfo(p).area * p.thk * matOf(p.mat).rho / 1e6 * p.qty * 10) / 10 })); } catch (e) { return []; } }
  let L = []; try { L = qfLines(job).filter(l => l.u !== 'h' && !/^Labour|^Scrap|^Transport|^Equipment|^Consumables$/i.test(l.d)); } catch (e) { }
  const f = (job.quote && job.quote.qf) || {};
  if (!L.length || (f.mode || 'single') !== 'detail') return [{ desc: f.title || job.title || 'Fabrication work', ordered: 1, shipped: 1, pk: 1, kg: '' }];
  return L.map(l => ({ desc: l.d, ordered: Math.round(l.q * 100) / 100, shipped: Math.round(l.q * 100) / 100, pk: 1, kg: '' }));
}
const dockBack = r => Math.max(0, Math.round(((+r.ordered || 0) - (+r.shipped || 0)) * 100) / 100);
const imgLoad = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

async function docketImgs(job, KK) {
  try { await document.fonts.ready; } catch (e) { } await logoImg();
  const D = dockDefaults(job), C = company(), W = 210, H = 297, K = KK || PRINT_K, L0 = 18, R0 = 192;
  const c = document.createElement('canvas'); c.width = W * K; c.height = H * K; const x = c.getContext('2d'); x.scale(K, K); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  const T = (s, X, Y, o = {}) => { x.font = `${o.b ? 700 : 400} ${(o.s || 3.1) * 1.08}px ${QFS.F}`; x.fillStyle = o.c || '#000'; x.textAlign = o.a || 'left'; x.textBaseline = 'middle'; let v = trDoc(String(s ?? '')); if (o.w) while (v.length > 1 && x.measureText(v).width > o.w) v = v.slice(0, -2) + '…'; x.fillText(v, X, Y); return x.measureText(v).width; };
  const ln = (a, b, c2, d, w = 0.25, col = '#000') => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(a, b); x.lineTo(c2, d); x.stroke(); };
  const KV = (k, v, X, Y, o = {}) => { const w = T(k, X, Y, { b: 1, s: 3.2 }); T(' ' + (v || ''), X + w, Y, { s: 3.2, w: o.w, b: o.vb }); };
  // header
  drawLogo(x, L0, 12, 19);
  T(C.tag, L0 + 2, 35.5, { b: 1, s: 3.0, c: QFS.blue });
  T(C.name, R0, 15, { b: 1, s: 4.1, a: 'right' });
  [C.a1 + ' ' + C.a2, C.a3, C.phone, C.mail].filter(Boolean).forEach((a, i) => T(a, R0, 20.5 + i * 4.4, { s: 2.95, a: 'right', c: a === C.mail ? QFS.link : '#000' }));
  x.fillStyle = QFS.purple; x.fillRect(L0, 41.2, R0 - L0, 0.7);
  // title block
  T('DELIVERY DOCKET', R0, 51, { b: 1, s: 4.6, a: 'right' });
  T('DOCKET NO:' + (D.no || ''), R0, 57.5, { b: 1, s: 3.6, a: 'right' });
  KV('DATE:', fmtDL(D.date), L0, 66);
  KV('Delivery to:', D.to, L0, 72.5, { w: 95, vb: 0 });
  KV('Supplied by:', D.supplied, 128, 72.5, { w: 42 });
  KV('Customer PO#:', D.po, L0, 83);
  KV('Phone No:', D.phone, 128, 83, { w: 45 });
  KV('Order Date:', fmtDL(D.orderDate), L0, 89.5);
  if (D.contact) KV('Contact:', D.contact, 128, 89.5, { w: 45 });
  KV('Delivery Date:', fmtDL(D.delDate), L0, 96);
  if (D.address) KV('Address:', D.address, 128, 96, { w: 46 });
  // table
  const X = [L0, 30, 132, 152, 172, R0], y0 = 104, h1 = 7, h2 = 6.5;
  x.fillStyle = QFS.fill; x.fillRect(L0, y0, R0 - L0, h1 + h2);
  const rowsY = y0 + h1 + h2, items = D.items.filter(r => r.desc || +r.ordered), rh = items.map(r => { x.font = `400 ${3.1 * 1.08}px ${QFS.F}`; const words = trDoc(String(r.desc || '')).split(' '); let l = '', n = 1; words.forEach(wd => { const t = l ? l + ' ' + wd : wd; if (x.measureText(t).width > X[2] - X[1] - 4 && l) { n++; l = wd; } else l = t; }); return Math.max(7, n * 4 + 3); });
  const yEnd = rowsY + rh.reduce((a, b) => a + b, 0);
  x.strokeStyle = '#000'; x.lineWidth = 0.3; x.strokeRect(L0, y0, R0 - L0, yEnd - y0);
  ln(L0, rowsY, R0, rowsY); ln(X[2], y0 + h1, R0, y0 + h1);
  [X[1], X[2]].forEach(v => ln(v, y0, v, yEnd)); [X[3], X[4]].forEach(v => ln(v, y0 + h1, v, yEnd));
  T('№', (X[0] + X[1]) / 2, y0 + (h1 + h2) / 2, { b: 1, s: 3.3, a: 'center' }); T('Description', (X[1] + X[2]) / 2, y0 + (h1 + h2) / 2, { b: 1, s: 3.3, a: 'center' });
  T('Quantity', (X[2] + R0) / 2, y0 + h1 / 2, { b: 1, s: 3.3, a: 'center' });
  ['Ordered', 'Shipped', 'Backorder'].forEach((t, i) => T(t, (X[2 + i] + X[3 + i]) / 2, y0 + h1 + h2 / 2, { b: 1, s: 3.0, a: 'center' }));
  let y = rowsY;
  items.forEach((r, i) => {
    if (i) ln(L0, y, R0, y);
    const h = rh[i], cy = y + h / 2; T(i + 1, (X[0] + X[1]) / 2, cy, { s: 3.2, a: 'center' });
    x.font = `400 ${3.1 * 1.08}px ${QFS.F}`; const words = trDoc(String(r.desc || '')).split(' '), ls = []; let l = ''; words.forEach(wd => { const t = l ? l + ' ' + wd : wd; if (x.measureText(t).width > X[2] - X[1] - 4 && l) { ls.push(l); l = wd; } else l = t; }); ls.push(l);
    ls.forEach((t, j) => T(t, X[1] + 2, cy + (j - (ls.length - 1) / 2) * 4, { s: 3.1 }));
    [r.ordered, r.shipped, dockBack(r)].forEach((v, k) => T(n0d(v), (X[2 + k] + X[3 + k]) / 2, cy, { s: 3.2, a: 'center' }));
    y += h;
  });
  // photos
  const sigY = H - 22, ph = (D.photos || []).slice(0, 4), top = yEnd + 5, avail = sigY - 14 - top;
  if (D.note) { T('Note: ' + D.note, L0, top - 2, { s: 2.9, w: R0 - L0 }); }
  if (ph.length && avail > 25) {
    const ims = (await Promise.all(ph.map(imgLoad))).filter(Boolean), n = ims.length, cols = n > 1 ? 2 : 1, rows = Math.ceil(n / cols), gw = (R0 - L0 - (cols - 1) * 6) / cols, gh = (avail - (rows - 1) * 6 - (D.note ? 4 : 0)) / rows;
    let yy = top + (D.note ? 4 : 0);
    for (let r0 = 0; r0 < n; r0 += cols) { const row = ims.slice(r0, r0 + cols).map(im => { const k = Math.min(gw / im.naturalWidth, gh / im.naturalHeight); return { im, w: im.naturalWidth * k, h: im.naturalHeight * k }; }), rh = Math.max(...row.map(o => o.h));
      row.forEach((o, j) => x.drawImage(o.im, L0 + j * (gw + 6) + (gw - o.w) / 2, yy, o.w, o.h)); yy += rh + 6; }
  }
  // signatures
  T('Delivered sign:', L0, sigY, { b: 1, s: 3.3 }); ln(L0 + 24, sigY + 1.2, 95, sigY + 1.2, 0.25);
  T('Received sign:', 118, sigY, { b: 1, s: 3.3 }); ln(118 + 23, sigY + 1.2, R0, sigY + 1.2, 0.25);
  if (D.delivered) T(D.delivered, L0 + 24, sigY + 5, { s: 2.8, c: '#444' }); if (D.received) T(D.received, 141, sigY + 5, { s: 2.8, c: '#444' });
  return [{ url: c.toDataURL('image/jpeg', 0.95), alias: 'dd' }];
}
const n0d = v => { const n = +v || 0; return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100); };

/* packing tags: one per package; 4 (A6) or 8 per A4 sheet */
async function tagImgs(job) {
  try { await document.fonts.ready; } catch (e) { } await logoImg();
  const D = dockDefaults(job), C = company(), per = +D.tagsPer === 8 ? 8 : 4, tags = [];
  const items = D.items.filter(r => r.desc && +r.shipped > 0);
  items.forEach((r, i) => { const n = Math.max(1, Math.round(+r.pk || 1)); for (let k = 1; k <= n; k++) tags.push({ r, i, k, n }); });
  if (!tags.length) throw new Error('Шошго гаргах мөр алга (Shipped > 0)');
  const W = 210, H = 297, K = PRINT_K, cols = 2, rows = per / 2, M = 6, gw = (W - 2 * M) / cols, gh = (H - 2 * M) / rows, pages = [];
  for (let s = 0; s < tags.length; s += per) {
    const c = document.createElement('canvas'); c.width = W * K; c.height = H * K; const x = c.getContext('2d'); x.scale(K, K); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    tags.slice(s, s + per).forEach((t, j) => {
      const X = M + (j % cols) * gw, Y = M + Math.floor(j / cols) * gh, w = gw - 4, h = gh - 4, X0 = X + 2, Y0 = Y + 2, sc = per === 8 ? 0.72 : 1;
      x.setLineDash([1.2, 1.2]); x.strokeStyle = '#999'; x.lineWidth = 0.2; x.strokeRect(X, Y, gw, gh); x.setLineDash([]);
      x.strokeStyle = '#000'; x.lineWidth = 0.5; x.strokeRect(X0, Y0, w, h);
      const T = (v, a, b, o = {}) => { x.font = `${o.b ? 700 : 400} ${(o.s || 3) * sc * 1.08}px ${o.m ? DFM : QFS.F}`; x.fillStyle = o.c || '#000'; x.textAlign = o.a || 'left'; x.textBaseline = 'middle'; let z = trDoc(String(v ?? '')); if (o.w) while (z.length > 1 && x.measureText(z).width > o.w) z = z.slice(0, -2) + '…'; x.fillText(z, a, b); };
      drawLogo(x, X0 + 3, Y0 + 3, 10 * sc); T(C.name, X0 + w - 3, Y0 + 6 * sc, { b: 1, s: 3.2, a: 'right' }); T(C.phone, X0 + w - 3, Y0 + 10.5 * sc, { s: 2.3, a: 'right', w: w * 0.6 });
      x.fillStyle = QFS.purple; x.fillRect(X0 + 3, Y0 + 15 * sc, w - 6, 0.5);
      x.fillStyle = '#10161c'; x.fillRect(X0 + 3, Y0 + 18 * sc, w - 6, 10 * sc); T(`PACKAGE ${t.k} / ${t.n}`, X0 + 6, Y0 + 23 * sc, { b: 1, s: 4.2, c: '#fff' }); T(`DOCKET ${D.no}`, X0 + w - 6, Y0 + 23 * sc, { b: 1, s: 3.4, c: '#fff', a: 'right' });
      const qr = Math.min(32 * sc, h * 0.3), lw = w - 10 - qr;
      x.font = `700 ${5 * sc * 1.08}px ${QFS.F}`; const words = trDoc(String(t.r.desc)).split(' '), ls = []; let l = ''; words.forEach(wd => { const z = l ? l + ' ' + wd : wd; if (x.measureText(z).width > w - 8 && l) { ls.push(l); l = wd; } else l = z; }); ls.push(l);
      ls.slice(0, 3).forEach((z, q) => T(z, X0 + 4, Y0 + (35 + q * 6.2) * sc, { b: 1, s: 5 }));
      const kv = [['Customer', D.to], ['PO #', D.po], ['Job No', job.no], ['Item', `${t.i + 1}  ·  Qty ${n0d(t.r.shipped)}${t.n > 1 ? ` (${t.n} pkg)` : ''}`], ['Weight', t.r.kg ? `${n0d(+t.r.kg / t.n)} kg` : ''], ['Date', fmtDL(D.delDate)]];
      const ky = Y0 + (35 + Math.min(3, ls.length) * 6.2 + 2) * sc;
      kv.forEach(([k, v], q) => { const yy = ky + q * 5.6 * sc; T(k, X0 + 4, yy, { s: 2.8, c: '#555' }); T(v || '—', X0 + 4 + 20 * sc, yy, { b: 1, s: 3.2, w: w - 12 - 20 * sc }); });
      drawQR(x, [job.no, 'DD' + D.no, D.po ? 'PO ' + D.po : '', `#${t.i + 1}`, `${t.k}/${t.n}`, t.r.desc].filter(Boolean).join(' | '), X0 + w - 4 - qr, Y0 + h - 4 - qr - 5 * sc, qr);
      T('Know us, know the quality', X0 + 4, Y0 + h - 4 * sc, { s: 2.4, c: QFS.blue, b: 1 }); T(C.mail, X0 + w - 4, Y0 + h - 4 * sc, { s: 2.3, a: 'right', c: QFS.link });
    });
    pages.push({ url: c.toDataURL('image/jpeg', 0.95), alias: 'tg' + pages.length });
  }
  return pages;
}
async function dockOut(job, what, mode) {
  try {
    const D = dockDefaults(job), imgs = what === 'tag' ? await tagImgs(job) : await docketImgs(job), name = what === 'tag' ? `${job.no} - Tags - DD${D.no}` : `DD${D.no} - ${D.to || 'Customer'} - Delivery Docket`;
    if (mode === 'print') printImgs(imgs, false, 'a4', name); else { pdfImgs(imgs, false, name, 'a4'); jobLog(what === 'tag' ? `Шошго (${D.no}) PDF гаргасан` : `Delivery Docket ${D.no} PDF гаргасан`, job); }
    if (what !== 'tag' && !D.issued) { D.issued = today(); save(); }
  } catch (e) { console.error(e); toast('Алдаа: ' + e.message); }
}
const DOCK_COLS = [{ k: 'desc', t: 'Description' }, { k: 'ordered', t: 'Ordered', num: 1, w: 80 }, { k: 'shipped', t: 'Shipped', num: 1, w: 80 }, { k: 'back', t: 'Backorder', calc: r => n0d(dockBack(r)) }, { k: 'pk', t: 'Багц (tag)', num: 1, w: 80 }, { k: 'kg', t: 'Жин, кг', num: 1, w: 80 }];
function dockCardHTML(job) {
  const D = dockDefaults(job), ntag = D.items.filter(r => r.desc && +r.shipped > 0).reduce((a, r) => a + Math.max(1, Math.round(+r.pk || 1)), 0);
  return `<div class="jcard"><div class="bcard-h">A. Delivery Docket — Packing list <span class="pill">№ ${esc(D.no)}</span>${D.issued ? `<span class="pill st-done">гаргасан ${esc(D.issued)}</span>` : ''}<span class="sp"></span><span class="outb"><button class="btn primary" data-dk="doc:pdf">Docket PDF</button><button class="btn ghost" data-dk="doc:print">🖨 Хэвлэх</button></span></div><div class="jbody qfwrap"><div class="qfprevbox" title="Урьдчилан харах — дарж томруулна"><img class="qfprev dkprev" alt="Delivery docket"></div><div class="qffields dkfields">
    <div class="jgrid">${fldIn('dk_no', 'Docket No', D.no)}${fldIn('dk_date', 'Date', D.date, { type: 'date' })}${fldIn('dk_to', 'Delivery to', D.to, { list: 'dl-org' })}${fldIn('dk_supplied', 'Supplied by', D.supplied)}
      ${fldIn('dk_po', 'Customer PO#', D.po)}${fldIn('dk_orderDate', 'Order Date', D.orderDate, { type: 'date' })}${fldIn('dk_delDate', 'Delivery Date', D.delDate, { type: 'date' })}${fldIn('dk_phone', 'Phone No', D.phone)}
      ${fldIn('dk_contact', 'Хүлээн авах хүн', D.contact, { list: 'dl-person' })}${fldIn('dk_address', 'Хүргэх хаяг', D.address)}${fldIn('dk_delivered', 'Хүлээлгэсэн (нэр)', D.delivered)}${fldIn('dk_received', 'Хүлээн авсан (нэр)', D.received)}</div>
    ${edTable('dki', DOCK_COLS, D.items, { extra: job._std ? '' : `<button class="btn sm ghost" data-dfrom="quote">↺ Үнийн саналын мөрөөс</button><button class="btn sm ghost" data-dfrom="parts">↺ Партуудаас</button>` })}
    ${fldIn('dk_note', 'Тэмдэглэл (docket дээр)', D.note)}
    <div class="dkph">${(D.photos || []).map((p, i) => `<figure><img src="${p}" alt=""><button class="x" data-dph="${i}" aria-label="Устгах">×</button></figure>`).join('')}<button class="btn sm" id="dkPhoto">+ Бүтээгдэхүүний зураг</button>${(job.files || []).some(f => f.thumb && jfIsImg(f)) ? '<button class="btn sm ghost" id="dkFromFiles">Хавсралтаас</button>' : ''}</div>
  </div></div></div>
  <div class="jcard"><div class="bcard-h">B. Шошго (tag) — багц бүрт <span class="pill">${ntag} ш</span><span class="sp"></span><label class="check" style="font-weight:400"><select id="dk_tagsPer" class="inp" style="width:auto"><option value="4"${+D.tagsPer !== 8 ? ' selected' : ''}>A4-т 4 (A6)</option><option value="8"${+D.tagsPer === 8 ? ' selected' : ''}>A4-т 8</option></select></label><span class="outb"><button class="btn primary" data-dk="tag:pdf">Шошго PDF</button><button class="btn ghost" data-dk="tag:print">🖨 Хэвлэх</button></span></div><div class="jbody">
    <p class="note">Мөр бүрийн «Багц» тоогоор шошго гарна (жишээ: 3 багцад ачсан бол 3 шошго, 1/3, 2/3, 3/3). Шошгон дээр захиалагч, PO, ажлын дугаар, docket №, жин, QR код байна.</p></div></div>`;
}
function bindDockCard(el, job) {
  const D = dockDefaults(job), img = el.querySelector('.dkprev'); let tm = 0;
  const refresh = () => { clearTimeout(tm); tm = setTimeout(() => docketImgs(job, PREV_K).then(im => { if (img && img.isConnected) { img.src = im[0].url; img._imgs = im; } }).catch(e => console.error(e)), 150); };
  const re = () => renderJobMain();
  ['no', 'date', 'to', 'supplied', 'po', 'orderDate', 'delDate', 'phone', 'contact', 'address', 'delivered', 'received', 'note'].forEach(k => { const i = el.querySelector('#dk_' + k); if (i) i.addEventListener('change', () => {
    D[k] = i.value.trim(); if (k === 'no') { const n = parseInt(D.no, 10); if (n > (+S.docketSeq || 0)) S.docketSeq = n; }
    if (k === 'to' && D.to) orgLearn({ org: D.to });
    if (k === 'contact') { const o = orgFind(D.to), p = o && o.persons.find(x => lc(x.name) === lc(personSplit(D.contact).name)); if (p) { D.contact = p.name; if (!D.phone && p.phone) { D.phone = p.phone; el.querySelector('#dk_phone').value = p.phone; } } }
    save(); refresh(); }); });
  const tp = el.querySelector('#dk_tagsPer'); if (tp) tp.addEventListener('change', () => { D.tagsPer = +tp.value; save(); });
  el.querySelectorAll('[data-dk]').forEach(b => b.addEventListener('click', () => { const [w, m] = b.dataset.dk.split(':'); dockOut(job, w, m); }));
  el.querySelectorAll('[data-dfrom]').forEach(b => b.addEventListener('click', () => { const it = dockItemsFrom(job, b.dataset.dfrom); if (!it.length) { toast('Мөр олдсонгүй'); return; } if (D.items.some(r => r.desc) && !confirm('Одоогийн мөрүүдийг солих уу?')) return; D.items = it; save(); re(); }));
  const addPh = src => { D.photos = (D.photos || []).concat(src).slice(0, 4); save(); re(); };
  const pb = el.querySelector('#dkPhoto'); if (pb) pb.addEventListener('click', () => { const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.onchange = async () => { const file = f.files[0]; if (file) addPh(await imgThumb(file, 1400)); }; f.click(); });
  const ff = el.querySelector('#dkFromFiles'); if (ff) ff.addEventListener('click', async () => { const imgsF = (job.files || []).filter(f => jfIsImg(f)); const pick = imgsF.length === 1 ? imgsF[0] : imgsF[(+prompt(imgsF.map((f, i) => `${i + 1}. ${f.name}`).join('\n') + '\n\nДугаар:', '1') || 1) - 1]; if (!pick) return; const d = await docGet(pick.id); if (d) addPh(await imgThumb(d.blob, 1400)); });
  el.querySelectorAll('[data-dph]').forEach(b => b.addEventListener('click', () => { D.photos.splice(+b.dataset.dph, 1); save(); re(); }));
  el.querySelector('.qfprevbox').addEventListener('click', async () => { printImgs(await docketImgs(job), false, 'a4', `DD${D.no} - Delivery Docket`); });
  return { refresh, edMap: { dki: { arr: () => D.items, cols: DOCK_COLS, blank: () => ({ desc: '', ordered: 1, shipped: 1, pk: 1, kg: '' }) } } };
}

/* ---------- Packing list archive (Баримт бичиг → Packing list): job dockets + stand-alone ones ---------- */
const stdDocks = () => (Array.isArray(S.dockets) ? S.dockets : (S.dockets = []));
function allDocks() {
  const a = S.jobs.filter(j => j.dock).map(j => ({ src: j, std: false, D: j.dock, job: j }));
  return a.concat(stdDocks().map(x => ({ src: x, std: true, D: x.dock, job: null }))).sort((p, q) => String(q.D.date || '').localeCompare(String(p.D.date || '')) || String(q.D.no).localeCompare(String(p.D.no)));
}
function newStdDock() {
  S.docketSeq = (+S.docketSeq || 231) + 1;
  const x = { id: uid(), _std: 1, no: '', title: '', customer: '', created: today(), log: [], files: [], quote: {}, dock: { no: dockNo(S.docketSeq), date: today(), to: '', supplied: 'Kh International', po: '', orderDate: '', delDate: today(), phone: '', contact: '', address: '', items: [{ desc: '', ordered: 1, shipped: 1, pk: 1, kg: '' }], photos: [], delivered: '', received: '', note: '', tagsPer: 4 } };
  stdDocks().unshift(x); save(); return x;
}
function renderDockSide() {
  const el = $('#dkList'); if (!el) return; const q = ($('#dkSearch').value || '').toLowerCase();
  const L = allDocks().filter(o => !q || [o.D.no, o.D.to, o.D.po, o.D.contact, o.job && o.job.no, o.job && o.job.title, ...(o.D.items || []).map(i => i.desc)].join(' ').toLowerCase().includes(q));
  el.innerHTML = L.length ? L.map(o => `<div class="jitem${J.dsel === o.src.id ? ' on' : ''}" data-dk="${o.src.id}"><span class="no">DD ${esc(o.D.no)}</span><span class="pill ${o.D.issued ? 'st-done' : 'st-new'}">${o.D.issued ? 'гаргасан' : 'ноорог'}</span><span class="t">${esc(o.D.to || '—')}${o.D.po ? ' · PO ' + esc(o.D.po) : ''} · ${o.std ? 'бие даасан' : esc(o.job.no)} · ${esc(o.D.date || '')}</span></div>`).join('') : '<div class="emptyp">Packing list алга.</div>';
}
(() => {
  const n = $('#dkNew'); if (n) n.addEventListener('click', () => { const x = newStdDock(); J.dsel = x.id; renderDockSide(); renderJobMain(); setTimeout(() => { const i = $('#dk_to'); if (i) i.focus(); }, 60); });
  const s = $('#dkSearch'); if (s) s.addEventListener('input', renderDockSide);
  const l = $('#dkList'); if (l) l.addEventListener('click', e => { const it = e.target.closest('[data-dk]'); if (!it) return; const j = findJob(it.dataset.dk); if (j) { J.sel = j.id; setModule('jobs'); J.sel = j.id; J.sub = 'acc'; renderJobs(); return; } J.dsel = it.dataset.dk; renderDockSide(); renderJobMain(); });
})();
function renderDocketMain(el) {
  const x = stdDocks().find(o => o.id === J.dsel);
  if (!x) {
    const L = allDocks();
    el.innerHTML = `<div class="dhead"><div><h2>Packing list архив</h2><p class="muted">${L.length} баримт · ${L.filter(o => o.D.issued).length} гаргасан</p></div><span class="sp" style="flex:1"></span><button class="btn primary" id="dkNew2">+ Шинэ Packing list</button></div>
      <div class="jcard"><div class="tblwrap" style="border:0"><table class="dt"><thead><tr><th>Docket №</th><th>Огноо</th><th>Хүлээн авагч</th><th>PO</th><th>Бараа</th><th class="r">Тоо</th><th>Ажил</th><th>Төлөв</th></tr></thead><tbody>
      ${L.map(o => `<tr class="jrow" data-dk="${o.src.id}" style="cursor:pointer"><td class="num"><b>${esc(o.D.no)}</b></td><td class="num">${esc(o.D.date || '')}</td><td>${esc(o.D.to || '—')}</td><td class="num">${esc(o.D.po || '')}</td><td>${esc(((o.D.items || [])[0] || {}).desc || '')}${(o.D.items || []).length > 1 ? ` <span class="muted">+${o.D.items.length - 1}</span>` : ''}</td><td class="r num">${(o.D.items || []).reduce((a, i) => a + (+i.shipped || 0), 0)}</td><td class="num">${o.std ? '<span class="muted">бие даасан</span>' : esc(o.job.no)}</td><td><span class="pill ${o.D.issued ? 'st-done' : 'st-new'}">${o.D.issued ? 'гаргасан ' + esc(o.D.issued) : 'ноорог'}</span></td></tr>`).join('') || '<tr><td colspan="8" class="muted">Packing list алга. Ажил бүртгэлгүй бол «+ Шинэ Packing list»-ээр шууд гаргана.</td></tr>'}
      </tbody></table></div></div>`;
    el.querySelector('#dkNew2').addEventListener('click', () => $('#dkNew').click());
    el.querySelectorAll('[data-dk]').forEach(r => r.addEventListener('click', () => { const j = findJob(r.dataset.dk); if (j) { setModule('jobs'); J.sel = j.id; J.sub = 'acc'; renderJobs(); return; } J.dsel = r.dataset.dk; renderDockSide(); renderJobMain(); }));
    return;
  }
  el.innerHTML = `<div class="dhead"><div><h2>Packing list · DD ${esc(x.dock.no)}</h2><p class="muted">Ажилд бүртгэгдээгүй — бие даасан баримт</p></div><span class="sp" style="flex:1"></span><button class="btn ghost" id="dkBack">← Жагсаалт</button><button class="btn ghost" id="dkDel">Устгах</button></div>${dockCardHTML(x)}`;
  const DK = bindDockCard(el, x); DK.refresh();
  bindEd(el, DK.edMap, () => { save(); renderDockSide(); renderJobMain(); });
  el.querySelector('#dkBack').addEventListener('click', () => { J.dsel = null; renderDockSide(); renderJobMain(); });
  el.querySelector('#dkDel').addEventListener('click', () => { if (!confirm(`DD ${x.dock.no}-г устгах уу?`)) return; S.dockets = stdDocks().filter(o => o !== x); J.dsel = null; save(); renderDockSide(); renderJobMain(); });
  const t = el.querySelector('#dk_to'); if (t) t.addEventListener('change', () => { x.customer = x.dock.to; renderDockSide(); });
}
