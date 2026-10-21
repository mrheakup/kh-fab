/* ================= Kh International — job attachments (drawings, photos, PDFs) + BOM / cutting split =================
   Files live in IndexedDB (kh-docs, tagged with the job); the job keeps a small list with thumbnails.
   Click → viewer (image / every PDF page) → print or save. «BOM / зүсэлт ялгах» reads the parts list from a
   drawing (PDF text table, Excel/CSV) and the contours (PDF/DXF/SVG) and splits them into
   laser-cut parts (→ job parts → nesting) and BOM / purchase lines (→ quotation materials). */
const jfIsImg = f => /^image\//.test(f.type || '') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(f.name);
const jfIsPdf = f => /pdf/.test(f.type || '') || /\.pdf$/i.test(f.name);
const jfCanSplit = f => /\.(pdf|dxf|svg|xlsx|xls|xlsm|csv|txt)$/i.test(f.name);
const fsz = b => b >= 1048576 ? nf(b / 1048576, 1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
const jfExt = n => (String(n).split('.').pop() || '').toUpperCase().slice(0, 4);
function imgThumb(blob, max = 360) {
  return new Promise(res => { const u = URL.createObjectURL(blob), im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.8)); }; im.onerror = () => { URL.revokeObjectURL(u); res(''); }; im.src = u; });
}
/* PDF pages → images (view + print) */
async function pdfPages(blob, dpi = 220, maxPages = 30) {
  const lib = await getPdfjs(), buf = await blob.arrayBuffer();
  let pdf; try { pdf = await lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise; } catch (e) { lib.GlobalWorkerOptions.workerPort = null; pdf = await lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise; }
  const out = [];
  for (let i = 1; i <= Math.min(pdf.numPages, maxPages); i++) {
    const pg = await pdf.getPage(i), vp = pg.getViewport({ scale: dpi / 72 }), c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); await pg.render({ canvasContext: x, viewport: vp }).promise;
    out.push({ url: c.toDataURL('image/jpeg', 0.9), w: c.width, h: c.height, land: c.width > c.height, alias: 'pp' + i });
  }
  return out;
}
async function jobFilesAdd(job, files) {
  job.files = job.files || []; let n = 0;
  for (const f of files) {
    if (f.size > 60 * 1048576) { toast(`${f.name}: 60 MB-аас том`); continue; }
    const id = 'jf-' + uid(); let thumb = '';
    try { if (jfIsImg(f)) thumb = await imgThumb(f); else if (jfIsPdf(f)) { const p = await pdfPages(f, 40, 1); thumb = p[0] ? p[0].url : ''; } } catch (e) { }
    await docPut({ id, name: f.name, size: f.size, added: today(), tag: 'Ажил ' + job.no, blob: f, type: f.type, job: job.id });
    job.files.push({ id, name: f.name, type: f.type, size: f.size, added: today(), thumb, note: '' }); n++;
  }
  if (n) { jobLog(`${n} файл хавсаргасан`, job); save(); }
}
function jobFilesHTML(job) {
  const F = job.files || [];
  return `<div class="jcard jfcard" data-v="main"><div class="bcard-h">Хавсралт — зураг, ажлын зураг, файл <span class="pill">${F.length}</span><span class="sp"></span><button class="btn sm primary" id="jfAdd">+ Хавсаргах</button><input type="file" id="jfIn" multiple hidden accept="image/*,.pdf,.dxf,.svg,.xlsx,.xls,.csv,.docx,.doc,.step,.stp,.ipt,.iam,.dwg"></div><div class="jbody">
    ${F.length ? `<div class="jfgrid">${F.map(f => `<figure class="jf" data-jf="${f.id}" title="Дарж харах, хэвлэх"><div class="th">${f.thumb ? `<img src="${f.thumb}" alt="">` : `<span class="ext">${esc(jfExt(f.name))}</span>`}</div><figcaption><b>${esc(f.name)}</b><small>${fsz(f.size)} · ${esc(f.added)}${f.note ? ' · ' + esc(f.note) : ''}</small></figcaption>${jfCanSplit(f) ? `<button class="btn sm ghost jfsplit" data-jfs="${f.id}" title="Зургаас BOM болон лазер зүсэлтийн партыг ялгах">⚙ BOM / зүсэлт</button>` : ''}<button class="x" data-jfdel="${f.id}" aria-label="Устгах">×</button></figure>`).join('')}</div>` : '<p class="note">Ажлын зураг (PDF, DXF), фото, захиалагчийн илгээсэн файлыг энд чирж оруулах эсвэл «+ Хавсаргах»-аар сонгоно. Дарахад томорч, шууд хэвлэгдэнэ.</p>'}
  </div></div>`;
}
function bindJobFiles(el, job) {
  const card = el.querySelector('.jfcard'); if (!card) return;
  const inp = card.querySelector('#jfIn'), done = () => renderJobMain();
  card.querySelector('#jfAdd').addEventListener('click', () => inp.click());
  inp.addEventListener('change', async () => { const fs = [...inp.files]; inp.value = ''; if (fs.length) { toast('Хавсаргаж байна…'); await jobFilesAdd(job, fs); done(); } });
  card.addEventListener('dragover', e => { e.preventDefault(); card.classList.add('drop'); });
  card.addEventListener('dragleave', () => card.classList.remove('drop'));
  card.addEventListener('drop', async e => { e.preventDefault(); e.stopPropagation(); card.classList.remove('drop'); const fs = [...(e.dataTransfer.files || [])]; if (fs.length) { await jobFilesAdd(job, fs); done(); } });
  card.addEventListener('click', async e => {
    const del = e.target.closest('[data-jfdel]'), sp = e.target.closest('[data-jfs]'), fig = e.target.closest('[data-jf]');
    if (del) { const f = job.files.find(x => x.id === del.dataset.jfdel); if (!f || !confirm(`«${f.name}» хавсралтыг устгах уу?`)) return; await docDel(f.id); job.files = job.files.filter(x => x !== f); save(); done(); return; }
    if (sp) { jfSplit(job, sp.dataset.jfs); return; }
    if (fig) jfView(job, fig.dataset.jf);
  });
}
/* image → A4 page with a small header (job, file name), fitted */
async function jfImagePages(job, f, blob) {
  const u = URL.createObjectURL(blob), im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u; });
  const land = im.naturalWidth > im.naturalHeight * 1.05, W = land ? 297 : 210, H = land ? 210 : 297, K = 6, c = document.createElement('canvas'); c.width = W * K; c.height = H * K;
  const x = c.getContext('2d'); x.scale(K, K); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#10161c'; x.font = `700 3.6px ${DF}`; x.textBaseline = 'middle'; x.fillText(`${job.no}${job.title ? ' · ' + job.title : ''}`, 10, 9);
  x.font = `400 3px ${DF}`; x.fillStyle = '#555'; x.textAlign = 'right'; x.fillText(`${f.name} · ${today()}`, W - 10, 9); x.textAlign = 'left';
  x.strokeStyle = '#7030a0'; x.lineWidth = 0.3; x.beginPath(); x.moveTo(10, 12.5); x.lineTo(W - 10, 12.5); x.stroke();
  const bw = W - 20, bh = H - 24, k = Math.min(bw / im.naturalWidth, bh / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k;
  x.drawImage(im, 10 + (bw - w) / 2, 15 + (bh - h) / 2, w, h); URL.revokeObjectURL(u);
  return { imgs: [{ url: c.toDataURL('image/jpeg', 0.92), alias: 'ji' }], land };
}
async function jfView(job, id, src) {
  const f = src ? src.f : (job.files || []).find(x => x.id === id), d = src ? src.d : f && await docGet(id); if (!d) { toast('Файл олдсонгүй (өөр компьютерт хавсаргасан байж магадгүй)'); return; }
  const old = document.getElementById('pvModal'); if (old) old.remove();
  const m = document.createElement('div'); m.id = 'pvModal'; m.className = 'pvmodal';
  m.innerHTML = `<div class="pvbar"><b>${esc(f.name)}</b><span class="muted">${esc(job.no)} · ${fsz(f.size)}</span><span class="sp" style="flex:1"></span>
    ${src ? `<button class="btn" data-a="attach">+ Ажилд хавсаргах</button><button class="btn ghost" data-a="ext">Програмаар нээх</button>` : `<input class="inp" id="jfNote" placeholder="Тайлбар (жишээ: Rev B, захиалагчийн зураг)" value="${esc(f.note || '')}" style="width:260px">`}
    ${jfCanSplit(f) ? '<button class="btn" data-a="split">⚙ BOM / зүсэлт ялгах</button>' : ''}<button class="btn primary" data-a="print" disabled>🖨 Хэвлэх</button><button class="btn" data-a="save">Компьютерт хадгалах</button><button class="btn ghost" data-a="close">Хаах ✕</button></div>
    <div class="pvpages"><p class="muted" style="padding:30px">Ачаалж байна…</p></div>`;
  document.body.appendChild(m);
  const close = () => { m.remove(); document.removeEventListener('keydown', ek); }, ek = e => { if (e.key === 'Escape' && document.activeElement.id !== 'jfNote') close(); };
  document.addEventListener('keydown', ek);
  let P = null; const box = m.querySelector('.pvpages'), pb = m.querySelector('[data-a="print"]');
  try {
    if (jfIsImg(f)) { const u = URL.createObjectURL(d.blob); box.innerHTML = `<figure><img src="${u}" alt="" style="max-width:100%"></figure>`; P = await jfImagePages(job, f, d.blob); }
    else if (jfIsPdf(f)) { const pg = await pdfPages(d.blob); box.innerHTML = pg.map((p, k) => `<figure class="${p.land ? 'land' : ''}"><img src="${p.url}" alt=""><figcaption>${k + 1} / ${pg.length}</figcaption></figure>`).join(''); P = { imgs: pg, land: pg[0] && pg[0].land }; }
    else box.innerHTML = `<div class="jcard" style="max-width:520px;margin:40px auto"><div class="jbody"><p><b>${esc(f.name)}</b> — энэ төрлийн файлыг програм дотор харуулахгүй.</p><p class="note">«Компьютерт хадгалах» дарж өөрийн програмаар (Excel, Word, AutoCAD, Inventor…) нээнэ үү.${jfCanSplit(f) ? ' Эсвэл «BOM / зүсэлт ялгах»-аар доторх жагсаалт, контурыг уншина.' : ''}</p></div></div>`;
  } catch (e) { console.error(e); box.innerHTML = `<p class="note" style="padding:30px">Харуулж чадсангүй: ${esc(e.message || e)}. «Компьютерт хадгалах»-аар нээнэ үү.</p>`; }
  if (P) pb.disabled = false;
  const nt = m.querySelector('#jfNote'); if (nt) nt.addEventListener('change', e => { f.note = e.target.value.trim(); save(); });
  m.addEventListener('click', e => {
    const b = e.target.closest('[data-a]'); if (e.target === m) close(); if (!b) return; const a = b.dataset.a;
    if (a === 'close') close(); else if (a === 'save') saveFile(f.name, d.blob); else if (a === 'ext' && src) window.kh.openPath(src.f.path); else if (a === 'attach' && src) { jobFilesAdd(job, [new File([d.blob], f.name, { type: f.type || '' })]).then(() => toast('Ажилд хавсаргалаа: ' + f.name)); }
    else if (a === 'print' && P) { close(); printImgs(P.imgs, !!P.land, 'a4', `${job.no} - ${f.name.replace(/\.[^.]+$/, '')}`); }
    else if (a === 'split') { close(); jfSplit(job, id, src); }
  });
  const t = setInterval(() => { if (!m.isConnected) { clearInterval(t); renderJobMain(); } }, 400);
}

/* ---------- BOM / cutting split ---------- */
/* PDF text → lines of cells (x-sorted), per page */
async function pdfTextLines(blob) {
  const lib = await getPdfjs(), buf = await blob.arrayBuffer();
  let pdf; try { pdf = await lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise; } catch (e) { lib.GlobalWorkerOptions.workerPort = null; pdf = await lib.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise; }
  const pages = [];
  for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
    const pg = await pdf.getPage(i), tc = await pg.getTextContent(), items = tc.items.filter(t => t.str && t.str.trim()).map(t => ({ s: t.str.trim(), x: t.transform[4], y: t.transform[5], w: t.width || 0, h: Math.abs(t.transform[3]) || 6 }));
    items.sort((a, b) => b.y - a.y || a.x - b.x); const lines = [];
    items.forEach(t => { const l = lines.find(l => Math.abs(l.y - t.y) < Math.max(1.5, t.h * 0.35)); if (l) l.it.push(t); else lines.push({ y: t.y, it: [t] }); });
    lines.forEach(l => { l.it.sort((a, b) => a.x - b.x); const cells = []; l.it.forEach(t => { const c = cells[cells.length - 1]; if (c && t.x - (c.x1) < Math.max(2.2, t.h * 0.45)) { c.s += (t.x - c.x1 > t.h * 0.12 ? ' ' : '') + t.s; c.x1 = t.x + t.w; } else cells.push({ s: t.s, x: t.x, x1: t.x + t.w }); }); l.cells = cells; });
    lines.sort((a, b) => b.y - a.y); pages.push(lines);
  }
  return pages;
}
const BOMH = { no: /^(item|№|no\.?|#|поз\.?|pos\.?|д\/д|ref)$/i, qty: /^(тоо|ширхэг|qty\.?|quantity|pcs|count|кол\.?|ш\.?|тоо\s*ширхэг)$/i, name: /^(description|part\s*(no|number|name)?|name|нэр|нэршил|наименование|title|деталь|обозначение)/i, mat: /^(материал|material|марка|grade|ган)/i, thk: /^(зузаан|thickness|thk|толщина)/i, size: /^(size|dimension|stock|хэмжээ|размер|profile|section)/i, mass: /^(mass|weight|жин|масса|kg)/i };
function pdfBomRows(pages) {
  const out = [];
  pages.forEach((lines, pi) => {
    lines.forEach((l, li) => {
      const H = {}; l.cells.forEach(c => { for (const [k, re] of Object.entries(BOMH)) if (H[k] == null && re.test(c.s.trim())) { H[k] = c.x; break; } });
      if (H.qty == null || (H.name == null && H.no == null)) return;
      const cols = Object.entries(H).sort((a, b) => a[1] - b[1]), x0 = cols[0][1] - 6;
      const rowOf = L => { const r = {}; L.cells.forEach(c => { if (c.x1 < x0) return; let k = cols[0][0]; cols.forEach(([kk, xx]) => { if (c.x >= xx - 4) k = kk; }); r[k] = r[k] ? r[k] + ' ' + c.s : c.s; }); return r; };
      const grab = dir => { let miss = 0; for (let j = li + dir; j >= 0 && j < lines.length && miss < 2; j += dir) { const r = rowOf(lines[j]), q = bomNum(r.qty); if (q > 0 && (r.name || r.size) && !BOMH.qty.test(r.qty || '')) { out.push({ ...r, qty: q, pg: pi + 1 }); miss = 0; } else miss++; } };
      grab(1); grab(-1);
    });
  });
  const seen = new Set(); return out.filter(r => { const k = [r.pg, r.no, r.name, r.qty].join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
}
const PURCHASE_RE = /\b(bolt|nut|washer|screw|pin|bearing|bush(ing)?|seal|grease|nipple|spring|clip|rivet|hinge|болт|гайка|шайба|шпилька|подшипник|втулка|холхивч|стандарт)\b|DIN\s*\d|ISO\s*\d{3,}|GB\/?T/i;
const PROFILE_RE = /(pipe|tube|труба|хоолой|beam|швеллер|двутавр|уголок|angle|channel|RHS|SHS|CHS|\bUB\b|\bUC\b|PFC|\bEA\b|\bUA\b|\bHEA\b|\bHEB\b|\bIPE\b|\bUPN\b|round\s*bar|flat\s*bar|кругл|арматур|rod|bar\b)/i;
const PLATE_RE = /(\bPL\.?\s*\d|plate|лист|хавтан|sheet|ПЛ\.?\s*\d|\bt\s*=\s*\d|Hardox|Strenx|S235|S275|S355|09Г2С|Q235|Q345|Ст\s*3|AR\s*400|AR\s*500|\bNM\s*\d)/i;
function bomRowParse(r) {
  const txt = [r.name, r.size, r.mat].filter(Boolean).join(' ');
  let thk = bomNum(r.thk); const m3 = txt.match(/(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)(?:\s*[x×*]\s*(\d+(?:[.,]\d+)?))?/), pl = txt.match(/(?:PL|ПЛ|t\s*=)\.?\s*(\d+(?:[.,]\d+)?)/i);
  let L = 0, W = 0;
  if (m3) { const n = [m3[1], m3[2], m3[3]].filter(Boolean).map(v => +v.replace(',', '.')); if (n.length === 3) { const s = n.slice().sort((a, b) => a - b); if (!(thk > 0)) thk = s[0]; [W, L] = [s[1], s[2]]; } else if (n.length === 2) { if (pl && n.length === 2) { L = Math.max(...n); W = Math.min(...n); } else { L = Math.max(...n); W = Math.min(...n); } } }
  if (!(thk > 0) && pl) thk = +pl[1].replace(',', '.');
  const type = PURCHASE_RE.test(txt) ? 'buy' : PROFILE_RE.test(txt) ? 'mat' : (PLATE_RE.test(txt) || (thk > 0 && L > 0 && W > 0)) ? 'cut' : 'mat';
  return { no: r.no || '', name: String(r.name || r.size || '').trim(), qty: Math.round(+r.qty || 0) || 1, mat: String(r.mat || (txt.match(/Hardox\s*\d+|Strenx\s*\d+|S\d{3}\w*|09Г2С|Q\d{3}\w*|Ст\s*3|AR\s*\d{3}|NM\s*\d{3}/i) || [''])[0]).trim(), thk: thk > 0 ? thk : '', L: L || '', W: W || '', type, on: type !== 'skip' };
}
async function jfSplit(job, id, src) {
  const f = src ? src.f : (job.files || []).find(x => x.id === id), d = src ? src.d : f && await docGet(id); if (!d) { toast('Файл олдсонгүй'); return; }
  toast('Зургийг уншиж байна…');
  let rows = [], geo = [], msg = [];
  const file = new File([d.blob], f.name, { type: f.type || '' });
  try {
    if (/\.(xlsx|xls|xlsm|csv|txt)$/i.test(f.name)) { const R = await readBomRows(file), { map, start } = bomMap(R); rows = R.slice(start).map(r => { const g = k => map[k] != null ? r[map[k]] : ''; return { name: String(g('name') || ''), qty: bomNum(g('qty')), mat: String(g('mat') || ''), thk: g('thk'), size: [g('L'), g('W')].filter(v => +bomNum(v) > 0).join('x') }; }).filter(r => r.qty > 0 && r.name); }
    else if (jfIsPdf(f)) { rows = pdfBomRows(await pdfTextLines(d.blob)); if (!rows.length) msg.push('PDF-ээс BOM хүснэгт (Item / Qty / Description) олдсонгүй — зураг скан эсвэл текстгүй байж магадгүй.'); }
  } catch (e) { msg.push('BOM уншихад алдаа: ' + (e.message || e)); }
  try { if (/\.(pdf|dxf|svg)$/i.test(f.name)) { const g = await importAnyFile(file); geo = (g.parts || []).filter(p => { const i = partInfo(p); return i.w > 5 && i.h > 5; }).map((p, k) => { const i = partInfo(p); return { p, on: false, name: `${f.name.replace(/\.[^.]+$/, '')}-${k + 1}`, w: i.w, h: i.h, qty: 1 }; }); } } catch (e) { msg.push('Контур: ' + (e.message || e)); }
  const B = rows.map(bomRowParse);
  job.bomx = { file: f.name, rows: B, at: today() }; save();
  jfSplitModal(job, f, B, geo, msg);
}
function jfSplitModal(job, f, B, geo, msg) {
  const old = document.getElementById('pvModal'); if (old) old.remove();
  const m = document.createElement('div'); m.id = 'pvModal'; m.className = 'pvmodal';
  const mats = S.materials.map(x => x.name), TYPES = [['cut', '✂ Лазер зүсэлт'], ['mat', 'BOM · материал / профиль'], ['buy', 'Худалдан авах (стандарт эд)'], ['skip', 'Алгасах']];
  const draw = () => {
    const nC = B.filter(r => r.on && r.type === 'cut').length, nB = B.filter(r => r.on && (r.type === 'mat' || r.type === 'buy')).length, nG = geo.filter(g => g.on).length;
    m.innerHTML = `<div class="pvbar"><b>BOM / зүсэлт ялгах</b><span class="muted">${esc(f.name)} · ${B.length} мөр · ${geo.length} контур</span><span class="sp" style="flex:1"></span>
      <button class="btn primary" data-a="cut"${nC + nG ? '' : ' disabled'}>✂ Зүсэлт → ажлын парт (${nC + nG})</button><button class="btn primary" data-a="bom"${nB ? '' : ' disabled'}>BOM → үнийн саналын материал (${nB})</button><button class="btn" data-a="csv"${B.length ? '' : ' disabled'}>BOM CSV</button><button class="btn ghost" data-a="close">Хаах ✕</button></div>
      <div class="pvpages" style="display:block;padding:16px;overflow:auto"><div class="jcard" style="max-width:1200px;margin:0 auto 14px"><div class="jbody">
        ${msg.length ? `<p class="phint need">${msg.map(esc).join('<br>')}</p>` : ''}
        <p class="note">Мөр бүрийн төрлийг шалгана: <b>Лазер зүсэлт</b> — хавтан (зузаан, урт × өргөнтэй) → ажлын «Нэмэлт парт» болж Зүсэлт модульд өрөгдөнө. <b>BOM</b> — профиль, хоолой, стандарт эд → үнийн саналын «A. Материал»-д үнийн сангаас үнэтэйгээ орно.</p>
        ${B.length ? `<div class="tblwrap"><table class="dt ed"><thead><tr><th><input type="checkbox" data-all ${B.every(r => r.on) ? 'checked' : ''}></th><th>Item</th><th>Нэр / тайлбар</th><th class="r">Тоо</th><th>Материал</th><th class="r">Зузаан</th><th class="r">Урт</th><th class="r">Өргөн</th><th>Төрөл</th></tr></thead><tbody>
          ${B.map((r, i) => `<tr data-i="${i}" class="${r.type === 'cut' ? 'rcut' : ''}"><td><input type="checkbox" data-k="on" ${r.on ? 'checked' : ''}></td><td class="num">${esc(r.no)}</td><td><input data-k="name" value="${esc(r.name)}"></td><td style="width:70px"><input data-k="qty" type="number" class="mono" style="text-align:right" value="${r.qty}"></td><td style="width:150px"><input data-k="mat" list="splMats" value="${esc(r.mat)}"></td><td style="width:70px"><input data-k="thk" type="number" class="mono" style="text-align:right" value="${r.thk}"></td><td style="width:80px"><input data-k="L" type="number" class="mono" style="text-align:right" value="${r.L}"></td><td style="width:80px"><input data-k="W" type="number" class="mono" style="text-align:right" value="${r.W}"></td><td><select data-k="type">${TYPES.map(([k, n]) => `<option value="${k}"${r.type === k ? ' selected' : ''}>${n}</option>`).join('')}</select></td></tr>`).join('')}
        </tbody></table></div>` : '<p class="muted">BOM мөр алга.</p>'}
      </div></div>
      ${geo.length ? `<div class="jcard" style="max-width:1200px;margin:0 auto"><div class="bcard-h">Зурагнаас олдсон хаалттай контур — зүсэх парт болгох</div><div class="jbody"><p class="note">Ажлын зурагт хүрээ, хэмжээсийн шугам, өөр харагдац орсон байж болно — зөвхөн зүсэх хавтангийн контурыг сонгоно. Хэмжээ нь зурагны масштабаар (DXF 1:1 бол үнэн).</p>
        <div class="jgrid"><label class="fld">Материал<input id="splMat" list="splMats" value="${esc(S.defMat || mats[0] || '')}"></label><label class="fld">Зузаан, мм<input id="splThk" type="number" class="mono" value="${esc(S.defThk || 10)}"></label></div>
        <div class="jfgrid">${geo.map((g, i) => `<figure class="jf geo${g.on ? ' on' : ''}" data-g="${i}"><div class="th"><canvas width="160" height="110"></canvas></div><figcaption><b><input type="checkbox" ${g.on ? 'checked' : ''}> ${nf(g.w, 0)} × ${nf(g.h, 0)} мм</b><small>Тоо <input type="number" min="1" data-gq="${i}" value="${g.qty}" style="width:56px" class="mono"></small></figcaption></figure>`).join('')}</div></div></div>` : ''}
      <datalist id="splMats">${mats.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>`;
    m.querySelectorAll('.geo canvas').forEach((c, i) => { try { drawPartBox(c, geo[i].p, '#e8833a'); } catch (e) { } });
  };
  document.body.appendChild(m); draw();
  const close = () => { m.remove(); renderJobMain(); };
  m.addEventListener('change', e => {
    const t = e.target, tr = t.closest('tr[data-i]');
    if (t.hasAttribute('data-all')) { B.forEach(r => r.on = t.checked); draw(); return; }
    if (tr) { const r = B[+tr.dataset.i], k = t.dataset.k; r[k] = k === 'on' ? t.checked : ['qty', 'thk', 'L', 'W'].includes(k) ? (t.value === '' ? '' : +t.value) : t.value; if (k === 'type' || k === 'on') draw(); save(); return; }
    if (t.dataset.gq != null) { geo[+t.dataset.gq].qty = Math.max(1, +t.value || 1); return; }
  });
  m.addEventListener('click', e => {
    const g = e.target.closest('[data-g]'); if (g && !e.target.matches('input[type=number]')) { const o = geo[+g.dataset.g]; o.on = !o.on; draw(); return; }
    const b = e.target.closest('[data-a]'); if (e.target === m) return close(); if (!b) return; const a = b.dataset.a;
    if (a === 'close') return close();
    if (a === 'csv') { const csv = '﻿Item;Нэр;Тоо;Материал;Зузаан;Урт;Өргөн;Төрөл\r\n' + B.map(r => [r.no, r.name, r.qty, r.mat, r.thk, r.L, r.W, TYPES.find(t => t[0] === r.type)[1]].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n'); saveFile(`${job.no}_BOM_${f.name.replace(/\.[^.]+$/, '')}.csv`, csv, 'text/csv'); return; }
    if (a === 'cut') {
      const added = new Set(), ps = [], skip = [];
      B.filter(r => r.on && r.type === 'cut').forEach(r => { if (+r.L > 0 && +r.W > 0) ps.push({ id: uid(), name: r.name || `Парт ${r.no}`, qty: r.qty, mat: bomMat(r.mat, added), thk: +r.thk || +S.defThk, rot: true, mir: false, prio: 0, outer: rectLoop(+r.L, +r.W, 0), holes: [], bends: [], src: f.name }); else skip.push(r.name || r.no); });
      const gm = (m.querySelector('#splMat') || {}).value, gt = +((m.querySelector('#splThk') || {}).value) || +S.defThk;
      geo.filter(o => o.on).forEach(o => ps.push({ ...cleanPart({ ...o.p, name: o.name, qty: o.qty, mat: gm ? bomMat(gm, added) : S.defMat, thk: gt }), src: f.name }));
      job.extra.push(...ps); jobLog(`«${f.name}»-аас ${ps.length} зүсэх парт нэмсэн`, job); save();
      toast(`${ps.length} зүсэх парт ажилд нэмэгдлээ («Үйлдвэрлэл» алхам → Nesting)${skip.length ? ` · хэмжээгүй: ${skip.slice(0, 3).join(', ')}${skip.length > 3 ? '…' : ''}` : ''}${added.size ? ' · шинэ материал: ' + [...added].join(', ') : ''}`);
      B.filter(r => r.on && r.type === 'cut' && +r.L > 0 && +r.W > 0).forEach(r => r.on = false); geo.forEach(o => o.on = false); draw(); return;
    }
    if (a === 'bom') {
      jx(job); let n = 0;
      B.filter(r => r.on && (r.type === 'mat' || r.type === 'buy')).forEach(r => { const row = { name: [r.name, r.mat && !String(r.name).includes(r.mat) ? r.mat : ''].filter(Boolean).join(' '), qty: r.qty, unit: 'ш', kgu: '', price: '', note: (r.type === 'buy' ? 'Худалдан авах · ' : '') + 'BOM: ' + f.name }; quoteLineHook(job, 'qm', row, 'name'); job.quote.mats.push(row); r.on = false; n++; });
      jobLog(`«${f.name}»-аас ${n} BOM мөр үнийн саналд нэмсэн`, job); save(); toast(`${n} мөр «Үнийн санал → A. Материал»-д нэмэгдлээ — үнэгүй мөрийг бөглөнө үү`); draw(); return;
    }
  });
}

/* ---------- linked SQ / job folder on the PC (Electron): live file list, view, print, attach ---------- */
const MIME = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', svg: 'image/svg+xml', dxf: 'application/dxf', csv: 'text/csv', txt: 'text/plain', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
const fileUrl = p => 'file:///' + String(p).replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:');
function srcFolderHTML(job) {
  const q = job.quote || {}, el = !!(window.kh && window.kh.listDir);
  if (!q.srcFolder && !el) return '';
  return `<div class="jcard sfcard" data-v="main"><div class="bcard-h">📁 Фолдер — файлууд <span class="pill" id="sfN">${q.srcFolder ? '…' : '—'}</span><span class="sp"></span>
    ${q.srcFolder && el ? '<button class="btn sm ghost" id="sfOpen">Explorer-т нээх</button><button class="btn sm ghost" id="sfRe" title="Дахин унших">↻</button>' : ''}${el ? `<button class="btn sm ghost" id="sfPick">${q.srcFolder ? 'Фолдер солих' : 'Фолдер холбох'}</button>` : ''}${q.srcFolder ? '<button class="btn sm ghost" id="sfDel" title="Фолдерыг энэ ажлаас салгана (компьютерын файлууд устахгүй)">✕ Салгах</button>' : ''}</div>
    <div class="jbody"><div class="muted mono sfpath">${esc(q.srcFolder || 'Энэ ажил, саналд компьютерын фолдер холбоогүй байна — «Фолдер холбох».')}</div><div class="jfgrid sfgrid" id="sfList">${!el && q.srcFiles ? q.srcFiles.map(n => `<figure class="jf"><div class="th"><span class="ext">${esc(jfExt(n))}</span></div><figcaption><b>${esc(n)}</b></figcaption></figure>`).join('') : ''}</div></div></div>`;
}
const SF_CACHE = {}, TH_CACHE = new Map();
/* thumbnails are made by the desktop side (small PNG) one by one, and cached for the session */
async function sfThumbs(root) {
  for (const im of root.querySelectorAll('img[data-th]')) {
    const p = im.dataset.th; let u = TH_CACHE.get(p);
    if (u === undefined) { try { u = await window.kh.thumb(p, 240); } catch (e) { u = ''; } TH_CACHE.set(p, u); }
    if (!im.isConnected) return; if (u) im.src = u; else im.replaceWith(Object.assign(document.createElement('span'), { className: 'ext', textContent: jfExt(p) }));
  }
}
async function bindSrcFolder(el, job) {
  const card = el.querySelector('.sfcard'); if (!card) return;
  if (!(window.kh && window.kh.listDir)) { const dz = card.querySelector('#sfDel'); if (dz) dz.addEventListener('click', () => { if (!confirm('Фолдерыг салгах уу?')) return; job.quote.srcFolder = ''; job.quote.srcFiles = []; save(); renderJobMain(); }); return; }
  const q = job.quote; jx(job);
  const pk = card.querySelector('#sfPick'); if (pk) pk.addEventListener('click', async () => { const d = await window.kh.pickDir(); if (d) { q.srcFolder = d; SF_CACHE._force = 1; jobLog('Фолдер холбосон: ' + d, job); save(); renderJobMain(); } });
  const op = card.querySelector('#sfOpen'); if (op) op.addEventListener('click', async () => { const e = await window.kh.openPath(q.srcFolder); if (e) toast('Фолдер олдсонгүй'); });
  const dz = card.querySelector('#sfDel'); if (dz) dz.addEventListener('click', () => { if (!confirm('Фолдерыг энэ ажил/саналаас салгах уу? (Компьютер дээрх файлууд устахгүй)')) return; jobLog('Фолдер салгасан: ' + q.srcFolder, job); q.srcFolder = ''; q.srcFiles = []; save(); renderJobMain(); });
  const rr = card.querySelector('#sfRe'); if (rr) rr.addEventListener('click', () => { SF_CACHE._force = 1; renderJobMain(); });
  if (!q.srcFolder) return;
  const list = card.querySelector('#sfList'), n = card.querySelector('#sfN');
  const ck = q.srcFolder, hit = SF_CACHE[ck]; let r;
  if (hit && !SF_CACHE._force && Date.now() - hit.t < 120e3) r = hit.r; else { SF_CACHE._force = 0; n.textContent = '…'; try { r = await window.kh.listDir(q.srcFolder); } catch (e) { r = { error: e.message }; } if (r && !r.error) SF_CACHE[ck] = { t: Date.now(), r }; }
  if (!list.isConnected) return;
  if (!r || r.error) { n.textContent = '!'; list.innerHTML = `<p class="note">Фолдер олдсонгүй: ${esc(q.srcFolder)}. Өөр компьютер эсвэл зөөгдсөн байж магадгүй — «Фолдер солих».</p>`; return; }
  const F = r.files.slice().sort((a, b) => (/\.(xlsx|pdf)$/i.test(b.rel) && /^SQ/i.test(b.rel)) - (/\.(xlsx|pdf)$/i.test(a.rel) && /^SQ/i.test(a.rel)) || b.mtime - a.mtime);
  n.textContent = F.length;
  list.innerHTML = F.map((f, i) => { const img = /\.(png|jpe?g|gif|webp|bmp)$/i.test(f.rel); return `<figure class="jf" data-sf="${i}" title="${esc(f.rel)}"><div class="th">${img ? (window.kh.thumb ? `<img data-th="${esc(f.path)}" alt="">` : `<img loading="lazy" decoding="async" src="${fileUrl(f.path)}" alt="">`) : `<span class="ext">${esc(jfExt(f.rel))}</span>`}</div><figcaption><b>${esc(f.rel.split('/').pop())}</b><small>${f.rel.includes('/') ? esc(f.rel.split('/').slice(0, -1).join('/')) + ' · ' : ''}${fsz(f.size)} · ${new Date(f.mtime).toISOString().slice(0, 10)}</small></figcaption>${jfCanSplit({ name: f.rel }) ? `<button class="btn sm ghost jfsplit" data-sfs="${i}">⚙ BOM / зүсэлт</button>` : ''}</figure>`; }).join('') || '<p class="note">Фолдер хоосон байна.</p>';
  sfThumbs(list);
  const src = async i => { const f = F[i], name = f.rel.split('/').pop(), ext = (name.split('.').pop() || '').toLowerCase(); const buf = await window.kh.readFile(f.path); const blob = new Blob([buf], { type: MIME[ext] || '' }); return { f: { name, type: MIME[ext] || '', size: f.size, path: f.path }, d: { blob } }; };
  list.addEventListener('click', async e => {
    const sp = e.target.closest('[data-sfs]'), fig = e.target.closest('[data-sf]');
    try {
      if (sp) { e.stopPropagation(); jfSplit(job, null, await src(+sp.dataset.sfs)); return; }
      if (!fig) return; const f = F[+fig.dataset.sf];
      if (/\.(pdf|png|jpe?g|gif|webp|bmp)$/i.test(f.rel)) jfView(job, null, await src(+fig.dataset.sf)); else { const er = await window.kh.openPath(f.path); if (er) toast('Нээж чадсангүй: ' + er); }
    } catch (err) { toast('Файл уншиж чадсангүй: ' + (err.message || err)); }
  });
}
