/* ================= Kh International — «Үзлэг» module: daily inspection sheets, work instructions, logs ================= */
const IN2 = { sel: null, tab: 'today', recId: null, month: today().slice(0, 7) };
const IC = { dark: '#2b2f33', acc: '#e0650f', soft: '#fdf1e8', zebra: '#eef2f8', line: '#a4adb7', key: '#f3f4f6', ink: '#141a20', mute: '#5c6773' };
function IS() {
  if (!S.insp) S.insp = {};
  const I = S.insp;
  if (!Array.isArray(I.machines)) I.machines = JSON.parse(JSON.stringify(INSP_DEFAULT));
  if (!Array.isArray(I.recs)) I.recs = []; if (!Array.isArray(I.logs)) I.logs = [];
  if (I.daily == null) I.daily = 18;
  return I;
}
const imach = id => IS().machines.find(m => m.id === id);
const instrOf = m => m.instr || JSON.parse(JSON.stringify(INSTR[m.ins] || INSTR.mill));
const recsOf = mid => IS().recs.filter(r => r.mid === mid).sort((a, b) => (b.date + b.shift).localeCompare(a.date + a.shift));
const conclName = k => (INSP_CONCL.find(c => c[0] === k) || [, '—'])[1];

/* ---------- drawing an A5 half-sheet (148.5 × 210 mm) — matches the company forms ---------- */
const IF = DF;
function itxt(x, s, X, Y, o = {}) {
  x.font = `${o.b ? 700 : o.sb ? 600 : 400} ${o.s || 2.4}px ${o.m ? DFM : IF}`; x.fillStyle = o.c || IC.ink; x.textAlign = o.a || 'left'; x.textBaseline = 'middle';
  let t = trDoc(String(s ?? '')); if (o.w) while (t.length > 1 && x.measureText(t).width > o.w) t = t.slice(0, -2) + '…';
  x.fillText(t, X, Y);
}
function icell(x, X, Y, w, h, fill) { if (fill) { x.fillStyle = fill; x.fillRect(X, Y, w, h); } x.strokeStyle = IC.line; x.lineWidth = 0.18; x.strokeRect(X, Y, w, h); }
const IL = 12.4, IW = 128;
function ititle(x, t) { x.fillStyle = IC.dark; x.fillRect(IL, 8.9, IW, 5.8); itxt(x, t, IL + IW / 2, 11.8, { b: 1, s: 3.1, c: '#fff', a: 'center', w: IW - 4 }); }
function drawCover(x, m) {
  drawLogo(x, IL, 9, 12.4);
  itxt(x, 'Kh International', IL + IW, 15.8, { b: 1, s: 2.6, a: 'right' }); itxt(x, 'ISO 9001 чанарын удирдлагын тогтолцоо', IL + IW, 19.2, { s: 2, c: IC.mute, a: 'right' });
  x.strokeStyle = IC.acc; x.lineWidth = 0.35; x.beginPath(); x.moveTo(IL, 25.6); x.lineTo(IL + IW, 25.6); x.stroke();
  x.fillStyle = IC.acc; x.fillRect(IL, 30, 2.6, 14);
  itxt(x, 'ӨДӨР ТУТМЫН ҮЗЛЭГИЙН ХУУДАС', IL + 5.5, 34.6, { b: 1, s: 4.3 }); itxt(x, m.name, IL + 5.5, 40.4, { b: 1, s: 3.1, c: IC.acc, w: IW - 8 });
  const kv = (rows, Y, rh, fill) => rows.forEach(([k, v], i) => { const y = Y + i * rh; icell(x, IL, y, 51, rh, fill); icell(x, IL + 51, y, IW - 51, rh); itxt(x, k, IL + 1, y + rh / 2, { b: 1, s: 2.3 }); itxt(x, v, IL + 52.5, y + rh / 2, { s: 2.3, w: IW - 54 }); });
  kv([['Тоног төхөөрөмж:', m.name], ['Загвар / Марк:', m.model], [`Хариуцсан ${m.role}:`, '____________________________'], ['Хугацаа:', '______ он    ______ сар']], 48.7, 5.15, IC.key);
  kv([['Баталгаажуулсан ахлах:', '____________________________'], ['Гарын үсэг:', ''], ['Огноо:', '______ / ______ / ______']], 73.6, 5.6, IC.soft);
  const J0 = 94.4, jh = 6 + INSP_JURAM.length * 2.8; icell(x, IL, J0, IW, jh, '#f7f7f7'); x.fillStyle = IC.acc; x.fillRect(IL, J0, 0.5, jh);
  itxt(x, 'ЖУРАМ:', IL + 2.4, J0 + 3, { b: 1, s: 2.4, c: IC.acc }); INSP_JURAM.forEach((t, i) => itxt(x, `${i + 1}. ${t}`, IL + 2.4, J0 + 6.2 + i * 2.8, { s: 1.95, c: '#333', w: IW - 5 }));
}
function drawSheet(x, m, rec) {
  ititle(x, m.title || (m.name.toUpperCase() + ' ӨДӨР ТУТМЫН ҮЗЛЭГИЙН ХУУДАС'));
  const cw = [32, 32, 32, 32]; let X = IL;
  const shift = rec ? (rec.shift === 'pm' ? 'Өглөө☐  Үдэш☑' : 'Өглөө☑  Үдэш☐') : 'Өглөө☐  Үдэш☐';
  [[['Байгууллага:', 1], ['Kh International'], ['Марк:', 1], [m.model]], [['Огноо:', 1], [rec ? rec.date.split('-').reverse().join('/') : '____/____/______'], ['Ээлж:', 1], [shift]]].forEach((row, r) => {
    X = IL; row.forEach(([t, k], j) => { icell(x, X, 18.3 + r * 4.35, cw[j], 4.35, k ? IC.key : null); itxt(x, t, X + 1, 18.3 + r * 4.35 + 2.2, { b: k, s: 2.2, w: cw[j] - 2 }); X += cw[j]; });
  });
  const ws = [5, 19, 54, 10.4, 16, 23.6], hd = ['№', 'Шалгах хэсэг', 'Шалгах зүйл', 'Хэвийн', 'Асуудалтай', 'Тайлбар'];
  let y = 30.2; X = IL; x.fillStyle = IC.dark; x.fillRect(IL, y, IW, 4.1); hd.forEach((t, j) => { itxt(x, t, X + ws[j] / 2, y + 2.05, { b: 1, s: 2.1, c: '#fff', a: 'center' }); X += ws[j]; }); y += 4.1;
  const n = m.items.length, rh = Math.min(5.3, 100.5 / Math.max(1, n));
  m.items.forEach(([sec, it], i) => {
    X = IL; const fill = i % 2 ? IC.zebra : '#fff', r = rec ? rec.res[i] : '', note = rec ? (rec.notes[i] || '') : '';
    ws.forEach((w, j) => { icell(x, X, y, w, rh, fill); X += w; });
    X = IL; const cy = y + rh / 2, fs = Math.min(2.3, rh * 0.5);
    itxt(x, i + 1, X + ws[0] / 2, cy, { s: fs, a: 'center' }); X += ws[0];
    itxt(x, sec, X + 1, cy, { b: 1, s: fs, w: ws[1] - 2 }); X += ws[1];
    itxt(x, it, X + 1, cy, { s: fs * 0.95, w: ws[2] - 2 }); X += ws[2];
    itxt(x, r === 'ok' ? '☑' : '☐', X + ws[3] / 2, cy, { s: fs * 1.15, a: 'center', c: r === 'ok' ? '#1f7a3a' : IC.ink }); X += ws[3];
    itxt(x, r === 'bad' ? '☑' : '☐', X + ws[4] / 2, cy, { s: fs * 1.15, a: 'center', c: r === 'bad' ? '#bf2f2f' : IC.ink }); X += ws[4];
    itxt(x, note, X + 1, cy, { s: fs * 0.85, w: ws[5] - 2 });
    y += rh;
  });
  INSP_CONCL.forEach(([k, t], i) => {
    X = IL; [ws[0], ws[1], IW - ws[0] - ws[1]].forEach(w => { icell(x, X, y, w, 4.6, IC.soft); X += w; });
    if (!i) itxt(x, 'Дүгнэлт:', IL + ws[0] + 1, y + 2.3, { b: 1, s: 2.2 });
    itxt(x, `${t} ${rec && rec.concl === k ? '☑' : '☐'}`, IL + ws[0] + ws[1] + 1, y + 2.3, { s: 2.2, b: rec && rec.concl === k });
    y += 4.6;
  });
  y += 3.2;
  [['Үзлэг хийсэн ажилтан:', rec && rec.by], ['Хянасан ахлах ажилтан:', rec && rec.chk]].forEach(([k, v], i) => {
    icell(x, IL, y, 48, 4.3, IC.key); icell(x, IL + 48, y, IW - 48, 4.3); itxt(x, k, IL + 1, y + 2.15, { b: 1, s: 2.2 });
    itxt(x, `Нэр: ${v ? v : '_______________'}   Гарын үсэг: _________`, IL + 49, y + 2.15, { s: 2.2, w: IW - 50 }); y += 4.3;
  });
  y += 3;
  const ft = `1. Хариуцаж буй ${m.role} үзлэгийг өдөр бүр заавал хийсэн байх.  2. Үзүүлэлтүүдийг бүрэн бичсэн байх.  3. Солигдох үед дахин бүртгэсэн байх.  4. Ахлахаар хянуулсны дараа ажлыг эхлүүлнэ.`.replace(/^/, '');
  const ftT = trDoc(ft);
  x.font = `400 1.8px ${IF}`; const words = ftT.split(' '), lines = []; let ln = '';
  words.forEach(wd => { if (x.measureText(ln + wd).width > IW - 4) { lines.push(ln); ln = ''; } ln += wd + ' '; }); lines.push(ln);
  const fh = lines.length * 2.3 + 1.6; x.fillStyle = IC.soft; x.fillRect(IL, y, IW, fh); x.strokeStyle = IC.acc; x.lineWidth = 0.2; x.strokeRect(IL, y, IW, fh);
  lines.forEach((l, i) => itxt(x, l, IL + 1.5, y + 1.9 + i * 2.3, { s: 1.8, c: '#555' }));
  if (rec && rec.note) itxt(x, 'Тэмдэглэл: ' + rec.note, IL, y + fh + 3, { s: 2.1, w: IW });
}
const LOGCOLS = { vehicle: [['№', 4.6], ['Явсан огноо, цаг', 20.7], ['Ирсэн огноо, цаг', 20.7], ['Жолооч', 20.2], ['Чиглэл / Зорчсон газар', 26.4], ['Гүйлт (км)', 13.7], ['Гарын үсэг', 21.7]],
  machine: [['№', 5], ['Засварын огноо', 20.3], ['Дараагийн засвар', 20.2], ['Тайлбар / Орлуулсан сэлбэг, тоо', 37.3], ['Засварласан ажилтан', 26.4], ['Гарын үсэг', 18.8]] };
function drawLog(x, m, rows, start = 0) {
  const veh = m.kind === 'vehicle', cols = LOGCOLS[veh ? 'vehicle' : 'machine'], n = veh ? 16 : 18, rh = veh ? 6.5 : 6.2;
  ititle(x, veh ? 'ЖОЛООНЫ БҮРТГЭЛ' : 'ЗАСВАР ҮЙЛЧИЛГЭЭНИЙ БҮРТГЭЛ');
  icell(x, IL, 18.3, IW / 2, 4.4, IC.key); icell(x, IL + IW / 2, 18.3, IW / 2, 4.4, IC.key);
  itxt(x, 'Байгууллага: Kh International', IL + 1, 20.5, { s: 2.1 }); itxt(x, `${veh ? 'Улсын дугаар' : 'Загвар / Марк'}: ${m.model}`, IL + IW / 2 + 1, 20.5, { s: 2.1, w: IW / 2 - 2 });
  let y = 26, X = IL; x.fillStyle = IC.dark; x.fillRect(IL, y, IW, 7);
  cols.forEach(([t, w]) => { const parts = t.length > 14 && t.includes(' ') ? [t.slice(0, t.lastIndexOf(' ', 16) > 0 ? t.lastIndexOf(' ', 16) : 14), t.slice(t.lastIndexOf(' ', 16) > 0 ? t.lastIndexOf(' ', 16) + 1 : 14)] : [t]; parts.forEach((p, k) => itxt(x, p, X + w / 2, y + 3.5 + (k - (parts.length - 1) / 2) * 2.4, { b: 1, s: 2, c: '#fff', a: 'center', w: w - 1 })); X += w; });
  y += 7;
  for (let i = 0; i < n; i++) {
    X = IL; const r = rows[i]; cols.forEach(([, w]) => { icell(x, X, y, w, rh, i % 2 ? IC.zebra : '#fff'); X += w; });
    itxt(x, start + i + 1, IL + 1.2, y + rh / 2, { s: 2.1 });
    if (r) { X = IL + cols[0][1]; const v = veh ? [r.out, r.in, r.driver, r.route, r.km, ''] : [r.date, r.next, r.desc, r.by, '']; v.forEach((t, j) => { itxt(x, t, X + 1, y + rh / 2, { s: 2, w: cols[j + 1][1] - 2, m: j < 2 }); X += cols[j + 1][1]; }); }
    y += rh;
  }
  y += 3; icell(x, IL, y, 48, 7, IC.soft); icell(x, IL + 48, y, IW - 48, 7, IC.soft); itxt(x, 'Хянасан ахлах ажилтан:', IL + 1, y + 3.5, { b: 1, s: 2.2 }); itxt(x, 'Нэр: ____________  Гарын үсэг: ____________  Огноо: __________', IL + 49, y + 3.5, { s: 2.1, w: IW - 50 });
}
/* A4 landscape with the same A5 form twice (cut in half), exactly like the paper originals */
const twoUp = f => x => { f(x); x.save(); x.translate(148.5, 0); f(x); x.restore(); x.strokeStyle = '#d0d5db'; x.setLineDash([1.5, 1.5]); x.lineWidth = 0.15; x.beginPath(); x.moveTo(148.5, 4); x.lineTo(148.5, 206); x.stroke(); x.setLineDash([]); };
async function packImgs(ms, daily) {
  try { await document.fonts.ready; } catch (e) { } await logoImg();
  const imgs = [];
  for (const m of ms) {
    const c = await pageImg(true, twoUp(x => drawCover(x, m))), d = await pageImg(true, twoUp(x => drawSheet(x, m, null))), l = await pageImg(true, twoUp(x => drawLog(x, m, [])));
    imgs.push({ url: c, alias: m.id + 'c' }); for (let i = 0; i < daily; i++) imgs.push({ url: d, alias: m.id + 'd' }); imgs.push({ url: l, alias: m.id + 'l' }, { url: l, alias: m.id + 'l' });
  }
  return imgs;
}
async function inspOut(mode, kind, m, extra) {
  try {
    const I = IS(); let imgs, land = true, name;
    if (kind === 'pack') { imgs = await packImgs([m], Math.max(1, +I.daily || 1)); name = `${m.no}_${m.name}_үзлэгийн_хуудас`; }
    else if (kind === 'all') { imgs = await packImgs(I.machines, Math.max(1, +I.daily || 1)); name = 'Kh_International_бүх_үзлэгийн_хуудас'; }
    else if (kind === 'sheet') { await logoImg(); imgs = [{ url: await pageImg(true, twoUp(x => drawSheet(x, m, null))), alias: 's' }]; name = `${m.no}_${m.name}_үзлэг`; }
    else if (kind === 'log') { const rows = I.logs.filter(r => r.mid === m.id); const per = m.kind === 'vehicle' ? 16 : 18, pages = Math.max(1, Math.ceil(rows.length / per)); imgs = []; for (let p = 0; p < pages; p++) { const sl = rows.slice(p * per, (p + 1) * per); imgs.push({ url: await pageImg(false, x => { x.save(); x.scale(Math.SQRT2, Math.SQRT2); drawLog(x, m, sl, p * per); x.restore(); }), alias: 'l' + p }); } land = false; name = `${m.no}_${m.name}_${m.kind === 'vehicle' ? 'жолооны' : 'засварын'}_бүртгэл`; }
    else if (kind === 'rec') { await logoImg(); imgs = [{ url: await pageImg(false, x => { x.save(); x.scale(Math.SQRT2, Math.SQRT2); drawSheet(x, m, extra); x.restore(); }), alias: 'r' }]; land = false; name = `${m.no}_${m.name}_үзлэг_${extra.date}`; }
    else if (kind === 'instr') { const D = await instrDoc(m); if (mode === 'print') docPrint(D, `${m.no}_${m.name}_ажлын_заавар`); else docPdf(D, `${m.no}_${m.name}_ажлын_заавар`); return; }
    else if (kind === 'instrAll') { const all = []; for (const q of I.machines) all.push(...docImgs(await instrDoc(q)).map((p, i) => ({ url: p.url, alias: q.id + i }))); imgs = all; land = false; name = 'Kh_International_ажлын_заавар_бүгд'; }
    if (mode === 'print') printImgs(imgs, land, 'a4', name); else pdfImgs(imgs, land, name);
  } catch (e) { console.error(e); toast('Алдаа: ' + e.message); }
}
async function instrDoc(m) {
  const T = instrOf(m), D = await kdoc({ title: 'АЖЛЫН БАЙРНЫ ЗААВАР', sub: `${m.no} · ${m.name}`, code: S.iso.formInstr || '' });
  D.kv([['Тоног төхөөрөмж', m.name], ['Загвар / Марк', m.model], ['Хэрэглэгч', `Хариуцсан ${m.role}`], ['Хүчинтэй', `${today()}-аас`]], 2);
  D.para(`Энэхүү зааврыг ${m.name}-тэй ажиллах бүх ажилтан ажил эхлэхээс өмнө танилцаж, доорх бүртгэлд гарын үсэг зурна. Заавар зөрчсөн тохиолдолд компанийн журмын дагуу хариуцлага тооцно.`, { size: 2.9, color: DC.ink2 });
  const sec = [['ppe', 'Хувийн хамгаалах хэрэгсэл (PPE)'], ['before', 'Ажил эхлэхийн өмнө'], ['during', 'Ажиллах үед'], ['after', 'Ажил дууссаны дараа'], ['forbid', 'ХОРИГЛОХ зүйл'], ['emerg', 'Осол, яаралтай үед']];
  sec.forEach(([k, t]) => { if (T[k] && T[k].length) D.box(t.toUpperCase(), T[k].map((s, i) => `${i + 1}. ${s}`)); });
  D.box('ӨДӨР ТУТМЫН ҮЗЛЭГ', [`Ажил эхлэхийн өмнө «${m.title || m.name}»-ийг бөглөж, ахлахаар хянуулна. «Ашиглахыг хориглоно» дүгнэлттэй бол тоног төхөөрөмжийг ашиглахгүй.`]);
  D.h2('Заавартай танилцсан ажилтны бүртгэл');
  D.table([{ t: '№', w: 10, m: 1 }, { t: 'Овог, нэр' }, { t: 'Албан тушаал', w: 42 }, { t: 'Огноо', w: 30 }, { t: 'Гарын үсэг', w: 36 }], Array.from({ length: 8 }, (_, i) => [i + 1, '', '', '', '']), { minRh: 7 });
  D.sigs(['Боловсруулсан', 'Хянасан (ХАБ)', 'Баталсан']);
  return D;
}

/* ---------- UI ---------- */
function renderInsp() { renderInspSide(); renderInspMain(); }
function renderInspSide() {
  const I = IS(), el = $('#iList'); if (!el) return;
  $('#iDaily').value = I.daily;
  const t = today(), grp = [['machine', 'Тоног төхөөрөмж'], ['vehicle', 'Автомашин']];
  el.innerHTML = grp.map(([k, n]) => { const ms = I.machines.filter(m => (m.kind === 'vehicle') === (k === 'vehicle')); return ms.length ? `<div class="igrp">${n}</div>` + ms.map(m => { const r = recsOf(m.id)[0], done = r && r.date === t; return `<div class="jitem${m.id === IN2.sel ? ' on' : ''}" data-id="${m.id}"><span class="no">${esc(m.no)} · ${esc(m.name)}</span><span class="pill ${done ? (r.concl === 'ok' && !r.res.includes('bad') ? 'st-done' : 'st-weld') : ''}">${done ? 'өнөөдөр ✓' : r ? esc(r.date.slice(5)) : 'үзлэггүй'}</span><span class="t">${esc(m.model)}${m.added ? ' · нэмсэн загвар' : ''}</span></div>`; }).join('') : ''; }).join('');
}
const ITABS = [['today', 'Өнөөдрийн үзлэг'], ['hist', 'Түүх, сарын хяналт'], ['sheet', 'Хэвлэх хуудас'], ['instr', 'Заавар, ханын самбар'], ['log', 'Засвар / жолооны бүртгэл']];
/* inspector / supervisor picked from the team list (Баг → хүмүүс); a new name can be added right here */
function inspPersonSel(id, label, val, kind) {
  const P = people().filter(p => p.active !== false), pref = P.filter(p => p.insp === kind || (kind === 'chk' ? /ахлах|мастер|инженер|хяналт|supervisor/i.test(p.role || '') : true));
  const names = [...new Set(pref.concat(P).map(p => p.name).filter(Boolean))]; if (val && !names.includes(val)) names.unshift(val);
  return `<label class="fld">${label}<select id="${id}" data-ipp="${kind}" data-last="${esc(val || '')}"><option value="">— сонгох —</option>${names.map(n => `<option value="${esc(n)}"${n === val ? ' selected' : ''}>${esc(n)}</option>`).join('')}<option value="__new">＋ Шинэ нэр нэмэх…</option></select></label>`;
}
function renderInspMain() {
  const I = IS(), el = $('#inspMain'); if (!el) return;
  const m = imach(IN2.sel) || I.machines[0]; if (!m) { el.innerHTML = '<div class="jempty">Тоног төхөөрөмж алга</div>'; return; }
  IN2.sel = m.id;
  const bar = `<nav class="rtabs jsub">${ITABS.map(([k, n]) => `<button data-itab2="${k}" class="${IN2.tab === k ? 'on' : ''}">${n}</button>`).join('')}</nav>`;
  const head = `<div class="bhead">
      <label class="fld sm">№<input id="im_no" value="${esc(m.no)}" class="mono"></label>
      <label class="fld grow">Тоног төхөөрөмж<input id="im_name" value="${esc(m.name)}"></label>
      <label class="fld grow">Загвар / Марк / Улсын дугаар<input id="im_model" value="${esc(m.model)}"></label>
      <label class="fld">Хариуцагч<select id="im_role">${['оператор', 'ажилтан', 'жолооч', 'гагнуурчин'].map(r => `<option${r === m.role ? ' selected' : ''}>${r}</option>`).join('')}</select></label>
      <label class="fld">Төрөл<select id="im_kind"><option value="machine"${m.kind !== 'vehicle' ? ' selected' : ''}>Тоног төхөөрөмж</option><option value="vehicle"${m.kind === 'vehicle' ? ' selected' : ''}>Автомашин</option></select></label>
    </div>`;
  let body = '';
  if (IN2.tab === 'sheet') body = `
    <div class="exports"><span class="outb"><button class="btn primary" data-iout="pdf" data-k="pack">Сарын багц PDF</button><button class="btn ghost" data-iout="print" data-k="pack">🖨 Хэвлэх</button></span>
      <span class="outb"><button class="btn" data-iout="pdf" data-k="sheet">Нэг хуудас PDF</button><button class="btn ghost" data-iout="print" data-k="sheet">🖨</button></span>
      <span class="note">Сарын багц = нүүр хуудас + ${I.daily} өдрийн хуудас + ${m.kind === 'vehicle' ? 'жолооны' : 'засварын'} бүртгэл ×2 (A4 хэвтээ, A5 ×2 — хагаслаж хайчилна)</span></div>
    <div class="jcard"><div class="bcard-h">Хуудасны гарчиг</div><div class="jbody"><input id="im_title" class="inp" value="${esc(m.title || '')}"></div></div>
    <div class="jcard"><div class="bcard-h">Шалгах зүйлс <span class="sp"></span><span class="muted" style="font-weight:400;font-size:12px">${m.items.length} мөр · «Заалт: ____» гэж бичвэл хэмжилтийн утга бичих зай гарна</span></div><div class="jbody">${edTable('it', ICOLS, m.items.map(([sec, item]) => ({ sec, item })))}</div></div>
    <div class="jcard"><div class="bcard-h">Урьдчилан харах</div><div class="jbody"><canvas id="iPrev" class="iprev"></canvas></div></div>
    <div class="exports"><button class="btn ghost" id="imReset">Анхны загвар руу буцаах</button><button class="btn ghost" id="imDel">Энэ тоногийг жагсаалтаас хасах</button></div>`;
  else if (IN2.tab === 'today') {
    const rec = I.recs.find(r => r.id === IN2.recId) || { id: '', mid: m.id, date: today(), shift: new Date().getHours() < 14 ? 'am' : 'pm', res: m.items.map(() => ''), notes: m.items.map(() => ''), concl: '', by: '', chk: '', note: '' };
    IN2.draft = rec;
    body = `<div class="jcard"><div class="bcard-h">${rec.id ? 'Үзлэг засах' : 'Шинэ үзлэг'} <span class="sp"></span><button class="btn sm" id="irAllOk">Бүгд хэвийн</button></div><div class="jbody">
      <div class="jgrid">${fldIn('ir_date', 'Огноо', rec.date, { type: 'date' })}<label class="fld">Ээлж<select id="ir_shift"><option value="am"${rec.shift !== 'pm' ? ' selected' : ''}>Өглөө</option><option value="pm"${rec.shift === 'pm' ? ' selected' : ''}>Үдэш</option></select></label>${inspPersonSel('ir_by', `Үзлэг хийсэн ${m.role}`, rec.by, 'by')}${inspPersonSel('ir_chk', 'Хянасан ахлах', rec.chk, 'chk')}</div>
      <div class="tblwrap"><table class="dt irt"><thead><tr><th>№</th><th>Шалгах хэсэг</th><th>Шалгах зүйл</th><th class="r">Хэвийн</th><th class="r">Асуудалтай</th><th>Тайлбар / заалт</th></tr></thead><tbody>
      ${m.items.map(([sec, it], i) => `<tr data-i="${i}" class="${rec.res[i] === 'bad' ? 'bad' : ''}"><td class="num muted">${i + 1}</td><td><b>${esc(sec)}</b></td><td style="white-space:normal">${esc(it)}</td><td class="r"><input type="radio" name="ir${i}" value="ok"${rec.res[i] === 'ok' ? ' checked' : ''}></td><td class="r"><input type="radio" name="ir${i}" value="bad"${rec.res[i] === 'bad' ? ' checked' : ''}></td><td><input data-note="${i}" value="${esc(rec.notes[i] || '')}"></td></tr>`).join('')}
      </tbody></table></div>
      <div class="jgrid"><label class="fld">Дүгнэлт<select id="ir_concl"><option value="">— сонгох —</option>${INSP_CONCL.map(([k, n]) => `<option value="${k}"${rec.concl === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>${fldIn('ir_note', 'Тэмдэглэл', rec.note)}</div>
      <div class="exports"><button class="btn primary" id="irSave">Хадгалах</button><button class="btn" id="irPdf">Бөглөсөн хуудас PDF</button><button class="btn ghost" id="irPrint">🖨 Хэвлэх</button>${rec.id ? '<button class="btn ghost" id="irNew">+ Шинэ үзлэг</button>' : ''}<span class="note" id="irMsg"></span></div>
    </div></div>`;
  } else if (IN2.tab === 'instr') {
    const T = instrOf(m);
    const P = posterOf(m);
    body = `<div class="jcard"><div class="bcard-h">Ханын самбар <span class="sp"></span><span class="muted" style="font-weight:400;font-size:12px">тэмдгүүд ISO 7010 өнгө, хэлбэрийн дагуу</span></div><div class="jbody pst">
        <div class="pstprev"><img id="pstImg" alt="самбар"></div>
        <div class="pstside">
          <div class="exports"><span class="outb"><button class="btn primary" data-pst="pdf" data-f="a3">A3 PDF</button><button class="btn ghost" data-pst="print" data-f="a3">🖨 A3</button></span><span class="outb"><button class="btn" data-pst="pdf" data-f="a4">A4 PDF</button><button class="btn ghost" data-pst="print" data-f="a4">🖨 A4</button></span></div>
          <div class="exports"><button class="btn" id="pstPhoto">${m.photo ? 'Зураг солих' : 'Тоногийн зураг оруулах'}</button>${m.photo ? '<button class="btn ghost" id="pstPhotoDel">Зураг хасах</button>' : ''}</div>
          <div class="fld">Анхааруулах тэмдэг<div class="chips">${Object.entries(WARN_LIB).map(([k, [, t]]) => `<button class="chip${P.warn.includes(k) ? ' on' : ''}" data-pw="${k}">${t}</button>`).join('')}</div></div>
          <div class="fld">Хориглох тэмдэг (4 хүртэл)<div class="chips">${Object.entries(FORBID_LIB).map(([k, [, t]]) => `<button class="chip${P.forbid.includes(k) ? ' on' : ''}" data-pf="${k}">${t}</button>`).join('')}</div></div>
          <div class="jgrid">${fldIn('pst_boss', 'Хариуцсан ахлах', P.boss)}${fldIn('pst_phone', 'Утас', P.phone)}</div>
          <p class="note">Хамгаалах хэрэгслийн тэмдэг доорх «Хувийн хамгаалах хэрэгсэл» текстээс автоматаар сонгогдоно (дуулга, бээлий, гутал, нүдний шил, чихэвч, хантааз…).</p>
        </div></div></div>
      <div class="exports"><span class="outb"><button class="btn primary" data-iout="pdf" data-k="instr">Ажлын заавар PDF</button><button class="btn ghost" data-iout="print" data-k="instr">🖨 Хэвлэх</button></span><button class="btn ghost" id="isReset">Анхны текст</button><span class="note">Мөр бүр нэг заалт. Засвар автоматаар хадгалагдана.</span></div>
      <div class="jgrid igrid">${[['ppe', 'Хувийн хамгаалах хэрэгсэл'], ['before', 'Ажил эхлэхийн өмнө'], ['during', 'Ажиллах үед'], ['after', 'Ажил дууссаны дараа'], ['forbid', 'Хориглох зүйл'], ['emerg', 'Осол, яаралтай үед']].map(([k, n]) => `<div class="jcard"><div class="bcard-h">${n}</div><div class="jbody"><textarea data-ins="${k}" rows="${Math.max(4, (T[k] || []).length + 1)}" class="inp">${esc((T[k] || []).join('\n'))}</textarea></div></div>`).join('')}</div>`;
  } else if (IN2.tab === 'log') {
    const veh = m.kind === 'vehicle', rows = I.logs.filter(r => r.mid === m.id);
    const cols = veh ? [{ k: 'out', t: 'Явсан огноо, цаг', ph: '10/21 09:00' }, { k: 'in', t: 'Ирсэн огноо, цаг', ph: '10/21 17:30' }, { k: 'driver', t: 'Жолооч' }, { k: 'route', t: 'Чиглэл / зорчсон газар' }, { k: 'km', t: 'Гүйлт (км)', num: 1, w: 90 }] : [{ k: 'date', t: 'Засварын огноо', date: 1, w: 140 }, { k: 'next', t: 'Дараагийн засвар', date: 1, w: 140 }, { k: 'desc', t: 'Тайлбар / орлуулсан сэлбэг, тоо' }, { k: 'by', t: 'Засварласан ажилтан' }];
    IN2.logCols = cols;
    body = `<div class="exports"><span class="outb"><button class="btn" data-iout="pdf" data-k="log">Бүртгэл PDF</button><button class="btn ghost" data-iout="print" data-k="log">🖨 Хэвлэх</button></span>${veh ? `<span class="note">Нийт гүйлт: ${nf(rows.reduce((a, r) => a + (+r.km || 0), 0))} км</span>` : (() => { const nx = rows.map(r => r.next).filter(Boolean).sort().filter(d => d >= today())[0]; return nx ? `<span class="note">Дараагийн засвар: <b class="${daysLeft(nx) <= 7 ? 'late' : ''}">${nx}</b> (${daysLeft(nx)} хоног)</span>` : ''; })()}</div>
      <div class="jcard"><div class="bcard-h">${veh ? 'Жолооны бүртгэл' : 'Засвар үйлчилгээний бүртгэл'}</div><div class="jbody">${edTable('lg', cols, rows)}</div></div>`;
  } else {
    const rs = recsOf(m.id), [yy, mm] = IN2.month.split('-').map(Number), nd = new Date(yy, mm, 0).getDate(), first = (new Date(yy, mm - 1, 1).getDay() + 6) % 7;
    const byDay = {}; rs.forEach(r => { if (r.date.startsWith(IN2.month)) (byDay[+r.date.slice(8)] = byDay[+r.date.slice(8)] || []).push(r); });
    const bad = rs.filter(r => r.date.startsWith(IN2.month) && r.res.includes('bad')).length;
    body = `<div class="jcard"><div class="bcard-h">Сарын хяналт <span class="sp"></span><input type="month" id="ihMonth" value="${IN2.month}" class="inp" style="width:auto"></div><div class="jbody">
      <div class="note">${Object.keys(byDay).length} өдөр үзлэг хийсэн / ${nd} · асуудалтай ${bad} удаа</div>
      <div class="ical">${['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'].map(d => `<b>${d}</b>`).join('')}${'<span></span>'.repeat(first)}${Array.from({ length: nd }, (_, i) => { const r = (byDay[i + 1] || [])[0], c = r ? (r.concl === 'stop' ? 'c-stop' : r.concl === 'fix' || r.res.includes('bad') ? 'c-fix' : 'c-ok') : ''; return `<span class="${c}${r ? ' has' : ''}" ${r ? `data-rid="${r.id}"` : ''}>${i + 1}</span>`; }).join('')}</div>
      <div class="note">Ногоон — хэвийн · шар — асуудалтай / засвар · улаан — ашиглахыг хориглосон. Өдөр дээр дарж нээнэ.</div></div></div>
      <div class="jcard"><div class="bcard-h">Үзлэгийн түүх</div><div class="jbody">${rs.length ? `<div class="tblwrap"><table class="dt"><thead><tr><th>Огноо</th><th>Ээлж</th><th>Үзсэн</th><th class="r">Хэвийн</th><th class="r">Асуудалтай</th><th>Дүгнэлт</th><th>Асуудал</th><th></th></tr></thead><tbody>
      ${rs.map(r => `<tr data-rid="${r.id}" style="cursor:pointer"><td class="num">${esc(r.date)}</td><td>${r.shift === 'pm' ? 'Үдэш' : 'Өглөө'}</td><td>${esc(r.by)}</td><td class="r num">${r.res.filter(v => v === 'ok').length}</td><td class="r num ${r.res.includes('bad') ? 'late' : ''}">${r.res.filter(v => v === 'bad').length}</td><td><span class="pill ${r.concl === 'ok' ? 'st-done' : r.concl ? 'st-weld' : ''}">${conclName(r.concl)}</span></td><td style="white-space:normal">${esc(r.res.map((v, i) => v === 'bad' ? (m.items[i] ? m.items[i][1] : '') + (r.notes[i] ? ': ' + r.notes[i] : '') : '').filter(Boolean).join('; '))}</td><td><button class="x" data-rdel="${r.id}" aria-label="Устгах">×</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="note">Үзлэг бүртгэгдээгүй. «Өнөөдрийн үзлэг» табд өдөр бүр бөглөнө.</p>'}</div></div>`;
  }
  el.innerHTML = bar + head + body;
  el.querySelectorAll('[data-itab2]').forEach(b => b.addEventListener('click', () => { IN2.tab = b.dataset.itab2; if (IN2.tab !== 'today') IN2.recId = null; renderInspMain(); }));
  [['im_no', 'no'], ['im_name', 'name'], ['im_model', 'model'], ['im_role', 'role'], ['im_kind', 'kind'], ['im_title', 'title']].forEach(([id, k]) => { const f = el.querySelector('#' + id); if (f) f.addEventListener('change', () => { m[k] = f.value; save(); renderInsp(); }); });
  el.querySelectorAll('[data-iout]').forEach(b => b.addEventListener('click', () => inspOut(b.dataset.iout, b.dataset.k, m)));
  if (IN2.tab === 'sheet') {
    bindEd(el, { it: { arr: () => { const a = m.items.map(([sec, item]) => ({ sec, item })); a._m = 1; return new Proxy(a, { get: (t, p) => p === 'splice' ? (...g) => { const r = m.items.splice(...g); return r; } : p === 'push' ? v => m.items.push([v.sec, v.item]) : t[p] }); }, cols: ICOLS, blank: () => ({ sec: '', item: '' }) } }, () => renderInspMain());
    el.querySelector('.ed tbody').addEventListener('change', ev => { const t = ev.target; if (t.dataset.ed !== 'it') return; const i = +t.dataset.r; if (m.items[i]) { m.items[i][t.dataset.k === 'sec' ? 0 : 1] = t.value; save(); drawPrev(); } }, true);
    const drawPrev = () => { const cv = el.querySelector('#iPrev'); if (!cv) return; const K = 4; cv.width = 297 * K; cv.height = 210 * K; const x = cv.getContext('2d'); x.scale(K, K); x.fillStyle = '#fff'; x.fillRect(0, 0, 297, 210); logoImg().then(() => { drawCover(x, m); x.save(); x.translate(148.5, 0); drawSheet(x, m, null); x.restore(); }); };
    drawPrev();
    el.querySelector('#imReset').addEventListener('click', () => { const d = INSP_DEFAULT.find(q => q.id === m.id); if (!d) { toast('Энэ тоног анхны жагсаалтад байхгүй'); return; } Object.assign(m, JSON.parse(JSON.stringify(d))); delete m.instr; save(); renderInsp(); toast('Анхны загвар сэргээгдлээ'); });
    el.querySelector('#imDel').addEventListener('click', ev => { const b = ev.currentTarget; if (!b.dataset.arm) { b.dataset.arm = 1; b.textContent = 'Дахин дарж баталгаажуулна'; setTimeout(() => { delete b.dataset.arm; b.textContent = 'Энэ тоногийг жагсаалтаас хасах'; }, 3000); return; } I.machines = I.machines.filter(q => q !== m); IN2.sel = null; save(); renderInsp(); });
  }
  if (IN2.tab === 'today') {
    el.querySelectorAll('select[data-ipp]').forEach(sel => sel.addEventListener('change', () => {
      if (sel.value !== '__new') { sel.dataset.last = sel.value; return; }
      const n = (prompt(sel.dataset.ipp === 'chk' ? 'Хянасан ахлахын нэр (жишээ: Б. Бат)' : 'Үзлэг хийсэн ажилтны нэр (жишээ: Д. Дорж)', '') || '').trim();
      if (!n) { sel.value = sel.dataset.last || ''; return; }
      const P = people(); if (!P.some(p => lc(p.name) === lc(n))) P.push({ id: uid(), name: n, role: sel.dataset.ipp === 'chk' ? 'Ахлах (хяналт)' : 'Ажилтан (үзлэг)', phone: '', active: true, insp: sel.dataset.ipp });
      else { const p = P.find(p => lc(p.name) === lc(n)); p.insp = p.insp || sel.dataset.ipp; }
      save(); const o = document.createElement('option'); o.value = n; o.textContent = n; sel.insertBefore(o, sel.querySelector('option[value="__new"]')); sel.value = n; sel.dataset.last = n; sel.dispatchEvent(new Event('change', { bubbles: true })); toast(`«${n}» нэр нэмэгдлээ (Баг → хүмүүс)`);
    }));
    const rec = IN2.draft, tb = el.querySelector('.irt tbody');
    const read = () => { rec.date = el.querySelector('#ir_date').value || today(); rec.shift = el.querySelector('#ir_shift').value; rec.by = el.querySelector('#ir_by').value; rec.chk = el.querySelector('#ir_chk').value; rec.concl = el.querySelector('#ir_concl').value; rec.note = el.querySelector('#ir_note').value; m.items.forEach((_, i) => { const r = el.querySelector(`input[name="ir${i}"]:checked`); rec.res[i] = r ? r.value : ''; rec.notes[i] = el.querySelector(`[data-note="${i}"]`).value; }); };
    tb.addEventListener('change', ev => { const tr = ev.target.closest('tr'); if (ev.target.type === 'radio') tr.classList.toggle('bad', ev.target.value === 'bad'); read(); const s = rec.res.includes('bad') ? (rec.concl === 'stop' ? 'stop' : 'fix') : rec.res.every(v => v === 'ok') ? (rec.concl || 'ok') : rec.concl; if (s !== rec.concl || !el.querySelector('#ir_concl').value) { el.querySelector('#ir_concl').value = s || ''; rec.concl = s || ''; } });
    el.querySelector('#irAllOk').addEventListener('click', () => { el.querySelectorAll('.irt input[value="ok"]').forEach(r => { r.checked = true; r.closest('tr').classList.remove('bad'); }); read(); if (!rec.concl) { el.querySelector('#ir_concl').value = 'ok'; rec.concl = 'ok'; } });
    el.querySelector('#irSave').addEventListener('click', () => {
      read(); const miss = rec.res.filter(v => !v).length;
      if (!rec.by) { toast('Үзлэг хийсэн ажилтны нэрийг оруулна уу'); return; }
      if (!rec.id) { rec.id = uid(); I.recs.push(rec); }
      save(); IN2.recId = rec.id; renderInsp(); toast(miss ? `Хадгалагдлаа — ${miss} мөр бөглөгдөөгүй` : 'Үзлэг хадгалагдлаа');
    });
    el.querySelector('#irPdf').addEventListener('click', () => { read(); inspOut('pdf', 'rec', m, rec); });
    el.querySelector('#irPrint').addEventListener('click', () => { read(); inspOut('print', 'rec', m, rec); });
    const nw = el.querySelector('#irNew'); if (nw) nw.addEventListener('click', () => { IN2.recId = null; renderInspMain(); });
  }
  if (IN2.tab === 'instr') {
    el.querySelectorAll('[data-ins]').forEach(t => t.addEventListener('change', () => { const T = instrOf(m); T[t.dataset.ins] = t.value.split('\n').map(s => s.trim()).filter(Boolean); m.instr = T; save(); }));
    el.querySelector('#isReset').addEventListener('click', () => { delete m.instr; save(); renderInspMain(); });
    const P = posterOf(m), setP = () => { m.poster = P; save(); renderInspMain(); };
    el.querySelectorAll('[data-pw]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.pw, i = P.warn.indexOf(k); if (i >= 0) P.warn.splice(i, 1); else P.warn.push(k); setP(); }));
    el.querySelectorAll('[data-pf]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.pf, i = P.forbid.indexOf(k); if (i >= 0) P.forbid.splice(i, 1); else { if (P.forbid.length >= 4) P.forbid.shift(); P.forbid.push(k); } setP(); }));
    [['pst_boss', 'boss'], ['pst_phone', 'phone']].forEach(([id, k]) => el.querySelector('#' + id).addEventListener('change', e => { P[k] = e.target.value; setP(); }));
    el.querySelector('#pstPhoto').addEventListener('click', () => pickMachinePhoto(m, () => renderInspMain()));
    const pd = el.querySelector('#pstPhotoDel'); if (pd) pd.addEventListener('click', () => { delete m.photo; save(); renderInspMain(); });
    el.querySelectorAll('[data-pst]').forEach(b => b.addEventListener('click', () => posterOut(b.dataset.pst, [m], b.dataset.f)));
    el.querySelectorAll('[data-ins]').forEach(t => t.addEventListener('change', () => posterImg(m, 'a4', true).then(u => { const i = el.querySelector('#pstImg'); if (i) i.src = u; })));
    posterImg(m, 'a4', true).then(u => { const i = el.querySelector('#pstImg'); if (i) i.src = u; });
  }
  if (IN2.tab === 'log') {
    bindEd(el, { lg: { arr: () => { const rows = I.logs.filter(r => r.mid === m.id); return { length: rows.length, splice: (i) => { I.logs.splice(I.logs.indexOf(rows[i]), 1); }, push: v => I.logs.push(v), ...rows }; }, cols: IN2.logCols, blank: () => m.kind === 'vehicle' ? { mid: m.id, out: '', in: '', driver: '', route: '', km: '' } : { mid: m.id, date: today(), next: '', desc: '', by: '' } } }, () => renderInspMain());
  }
  if (IN2.tab === 'hist') {
    el.querySelector('#ihMonth').addEventListener('change', e => { IN2.month = e.target.value || today().slice(0, 7); renderInspMain(); });
    el.querySelectorAll('[data-rid]').forEach(r => r.addEventListener('click', ev => { if (ev.target.closest('[data-rdel]')) return; IN2.recId = r.dataset.rid; IN2.tab = 'today'; renderInspMain(); }));
    el.querySelectorAll('[data-rdel]').forEach(b => b.addEventListener('click', ev => { ev.stopPropagation(); const k = b.dataset.rdel; if (!b.dataset.arm) { b.dataset.arm = 1; b.textContent = '?'; setTimeout(() => { delete b.dataset.arm; b.textContent = '×'; }, 2500); return; } I.recs = I.recs.filter(r => r.id !== k); save(); renderInsp(); }));
  }
}
const ICOLS = [{ k: 'sec', t: 'Шалгах хэсэг', w: 150 }, { k: 'item', t: 'Шалгах зүйл' }];
(() => {
  const L = $('#iList'); if (!L) return;
  L.addEventListener('click', e => { const it = e.target.closest('.jitem'); if (!it) return; IN2.sel = it.dataset.id; IN2.recId = null; renderInsp(); });
  $('#iDaily').addEventListener('change', e => { IS().daily = Math.max(1, Math.min(40, Math.round(+e.target.value || 18))); save(); renderInspMain(); });
  $('#iAdd').addEventListener('click', () => {
    const I = IS(), src = imach(IN2.sel) || I.machines[0], no = String(Math.max(0, ...I.machines.map(m => +m.no || 0)) + 1).padStart(2, '0');
    const m = { id: uid(), no, added: 1, name: 'Шинэ тоног төхөөрөмж', model: '', role: src ? src.role : 'ажилтан', kind: src ? src.kind : 'machine', ins: src ? src.ins : 'mill', title: '', items: src ? JSON.parse(JSON.stringify(src.items)) : [['Өмнөх үзлэг', '']] };
    I.machines.push(m); IN2.sel = m.id; IN2.tab = 'sheet'; save(); renderInsp(); toast('Шинэ тоног нэмэгдлээ — нэр, шалгах зүйлсийг засна уу');
  });
  $('#iAllPdf').addEventListener('click', () => inspOut('pdf', 'all'));
  $('#iAllPrint').addEventListener('click', () => inspOut('print', 'all'));
  $('#iInstrAll').addEventListener('click', () => inspOut('pdf', 'instrAll'));
  $('#iPosterAll').addEventListener('click', () => posterOut('pdf', IS().machines, 'a3'));
})();
