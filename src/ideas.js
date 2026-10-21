/* ================= Kh International — ideas & shop-floor improvements (Санаа, сайжруулалт) =================
   Anyone records an idea (тохижуулалт, сайжруулалт, ХАБ, чанар…) with the problem, the proposal, the expected
   benefit and a costed budget; it moves Санаа → Судалж буй → Захиралд танилцуулсан → Батлагдсан → Хэрэгжиж буй →
   Дууссан (or Татгалзсан). One click prints a «Захиралд танилцуулах» proposal with budget, payback and a decision box. */
const ICAT = ['Үйлдвэрийн тохижуулалт', 'Үйл явцын сайжруулалт', 'ХАБ, аюулгүй байдал', 'Чанар', 'Тоног төхөөрөмж', 'Зардал хэмнэлт', 'Ажилчдын нөхцөл', 'Бусад'];
const IST = [['idea', 'Санаа', '#98a2b3'], ['study', 'Судалж буй', '#3e63dd'], ['present', 'Захиралд танилцуулсан', '#f79009'], ['ok', 'Батлагдсан', '#12b76a'], ['doing', 'Хэрэгжиж буй', '#7a5af8'], ['done', 'Дууссан', '#027a48'], ['no', 'Татгалзсан', '#f04438']];
const istName = k => (IST.find(s => s[0] === k) || IST[0])[1];
const IV = { sel: null, st: '', q: '' };
const ideas = () => (Array.isArray(S.ideas) ? S.ideas : (S.ideas = []));
const ideaCost = i => (i.budget || []).reduce((a, r) => a + (+r.qty || 0) * (+r.price || 0), 0);
const ideaPayback = i => { const c = ideaCost(i), s = +i.saving || 0; return c && s ? c / s : null; };
function newIdea() {
  S.ideaSeq = (+S.ideaSeq || 0) + 1;
  const i = { id: uid(), no: 'ID-' + String(S.ideaSeq).padStart(3, '0'), title: '', cat: ICAT[0], st: 'idea', prio: 'med', by: S.me || '', owner: '', problem: '', proposal: '', benefit: '', saving: '', due: '', budget: [], photos: [], decision: '', decisionDate: '', decisionNote: '', created: today(), log: [] };
  ideas().unshift(i); save(); return i;
}
function renderIdeasSide() {
  const el = $('#idList'); if (!el) return; const q = IV.q.toLowerCase();
  const L = ideas().filter(i => (!IV.st || i.st === IV.st) && (!q || [i.no, i.title, i.cat, i.problem, i.proposal].join(' ').toLowerCase().includes(q)));
  $('#idSt').innerHTML = `<button data-ist="" class="${!IV.st ? 'on' : ''}">Бүгд <span class="mono">${ideas().length}</span></button>` + IST.map(([k, n]) => { const c = ideas().filter(i => i.st === k).length; return c ? `<button data-ist="${k}" class="${IV.st === k ? 'on' : ''}">${n} <span class="mono">${c}</span></button>` : ''; }).join('');
  el.innerHTML = L.length ? L.map(i => `<div class="jitem${IV.sel === i.id ? ' on' : ''}" data-id="${i.id}"><span class="no" style="font-family:inherit">${esc(i.title || '(гарчиггүй)')}</span><span class="pill" style="background:${(IST.find(s => s[0] === i.st) || IST[0])[2]}22;color:${(IST.find(s => s[0] === i.st) || IST[0])[2]};box-shadow:none">${istName(i.st)}</span><span class="t">${esc(i.no)} · ${esc(i.cat)}${ideaCost(i) ? ' · ' + money(ideaCost(i)) + ' ₮' : ''}</span></div>`).join('') : '<div class="emptyp">Санаа алга. «+ Шинэ санаа» дарж эхэлнэ.</div>';
}
(() => {
  const a = $('#idNew'); if (a) a.addEventListener('click', () => { const i = newIdea(); IV.sel = i.id; renderIdeas(); setTimeout(() => { const t = $('#ii_title'); if (t) t.focus(); }, 60); });
  const s = $('#idQ'); if (s) s.addEventListener('input', () => { IV.q = s.value; renderIdeasSide(); });
  const st = $('#idSt'); if (st) st.addEventListener('click', e => { const b = e.target.closest('[data-ist]'); if (b) { IV.st = b.dataset.ist; renderIdeasSide(); } });
  const l = $('#idList'); if (l) l.addEventListener('click', e => { const it = e.target.closest('[data-id]'); if (it) { IV.sel = it.dataset.id; renderIdeas(); } });
})();
function renderIdeas() { renderIdeasSide(); const el = $('#ideaMain'); const i = ideas().find(x => x.id === IV.sel); if (i) renderIdea(el, i); else renderIdeasBoard(el); }
function renderIdeasBoard(el) {
  const I = ideas(), sum = a => a.reduce((s, i) => s + ideaCost(i), 0), by = k => I.filter(i => i.st === k);
  const pend = I.filter(i => ['study', 'present'].includes(i.st)), okd = I.filter(i => ['ok', 'doing', 'done'].includes(i.st)), sav = okd.reduce((a, i) => a + (+i.saving || 0), 0);
  el.innerHTML = `<div class="dhead"><div><h2>Санаа, сайжруулалт</h2><p class="muted">Үйлдвэрийн тохижуулалт, сайжруулалтын санал — төсөв, үр ашиг, захирлын шийдвэр</p></div><span class="sp" style="flex:1"></span><button class="btn primary" id="idNew2">+ Шинэ санаа</button><button class="btn" data-iout="pdf">Нэгдсэн жагсаалт PDF</button><button class="btn ghost" data-iout="print">🖨</button></div>
    <div class="summary">${[['Нийт санаа', I.length, `${by('idea').length} шинэ`], ['Шийдвэр хүлээж буй', pend.length, `${money(sum(pend))} ₮ төсөв`], ['Батлагдсан', okd.length, `${money(sum(okd))} ₮ төсөв`], ['Хүлээгдэж буй хэмнэлт', money(sav) + '<small>₮/сар</small>', 'батлагдсан санаануудаар']].map(s => `<div class="stat"><div class="k">${s[0]}</div><div class="v">${s[1]}</div><div class="s">${s[2]}</div></div>`).join('')}</div>
    <div class="kanban ikb">${IST.map(([k, n, c]) => { const a = by(k); return `<div class="kcol" data-col="${k}"><div class="kh"><i style="background:${c}"></i>${n}<span class="muted mono">${a.length}</span></div><div class="kl">${a.map(i => `<div class="tcard" draggable="true" data-iid="${i.id}"><div class="tt"><b>${esc(i.title || '(гарчиггүй)')}</b></div><div class="tj">${esc(i.cat)}</div><div class="tf">${typeof avatar === 'function' ? avatar(i.owner || i.by, 22) : ''}<span class="sp" style="flex:1"></span>${ideaCost(i) ? `<span class="tdue">${money(ideaCost(i))} ₮</span>` : ''}</div></div>`).join('')}</div></div>`; }).join('')}</div>`;
  el.querySelector('#idNew2').addEventListener('click', () => $('#idNew').click());
  el.querySelectorAll('[data-iid]').forEach(c => { c.addEventListener('click', () => { IV.sel = c.dataset.iid; renderIdeas(); }); c.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', c.dataset.iid)); });
  el.querySelectorAll('.kcol').forEach(col => { col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); }); col.addEventListener('dragleave', () => col.classList.remove('over')); col.addEventListener('drop', e => { e.preventDefault(); const i = ideas().find(x => x.id === e.dataTransfer.getData('text/plain')); if (i && i.st !== col.dataset.col) { i.log.push({ t: today(), m: `${istName(i.st)} → ${istName(col.dataset.col)}` }); i.st = col.dataset.col; save(); } renderIdeas(); }); });
  el.querySelectorAll('[data-iout]').forEach(b => b.addEventListener('click', () => docOut(b.dataset.iout, ideasListDoc, 'Санаа_сайжруулалт_жагсаалт')));
}
const IB_COLS = [{ k: 'name', t: 'Зардлын нэр (материал, ажил, худалдан авалт)', list: 'dl-any' }, { k: 'qty', t: 'Тоо', num: 1, w: 80 }, { k: 'unit', t: 'Нэгж', w: 70 }, { k: 'price', t: 'Нэгж үнэ, ₮', num: 1, w: 110 }, { k: 'sum', t: 'Нийт, ₮', calc: r => money((+r.qty || 0) * (+r.price || 0)) }, { k: 'note', t: 'Нийлүүлэгч / тайлбар' }];
function renderIdea(el, i) {
  const pb = ideaPayback(i), cost = ideaCost(i);
  el.innerHTML = `<div class="dhead"><div><h2>${esc(i.title || 'Шинэ санаа')}</h2><p class="muted">${esc(i.no)} · ${esc(i.created)}${i.by ? ' · санаачлагч ' + esc(pName(i.by)) : ''}</p></div><span class="sp" style="flex:1"></span><button class="btn ghost" id="iiBack">← Самбар</button><button class="btn primary" data-iout="pdf">Захиралд танилцуулах PDF</button><button class="btn ghost" data-iout="print">🖨 Хэвлэх</button><button class="btn ghost" id="iiDel">Устгах</button></div>
    <div class="spipe">${IST.map(([k, n]) => `<button data-ist2="${k}" class="${i.st === k ? 'now' : ''}"><i>${IST.findIndex(s => s[0] === k) + 1}</i>${n}</button>`).join('')}</div>
    <div class="jcard"><div class="jbody">
      <div class="jgrid">${fldIn('ii_title', 'Санааны нэр', i.title, { cls: 'grow' })}<label class="fld">Ангилал<select id="ii_cat">${ICAT.map(c => `<option${c === i.cat ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
        <label class="fld">Санаачлагч<select id="ii_by">${peopleOpts(i.by, '—')}</select></label><label class="fld">Хариуцагч<select id="ii_owner">${peopleOpts(i.owner, '—')}</select></label>
        <label class="fld">Ач холбогдол<select id="ii_prio">${TPRIO.map(([k, n]) => `<option value="${k}"${i.prio === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>${fldIn('ii_due', 'Хэрэгжүүлэх хугацаа', i.due, { type: 'date' })}</div>
      ${fldIn('ii_problem', 'Одоогийн байдал / асуудал', i.problem, { area: 1, rows: 3 })}
      ${fldIn('ii_proposal', 'Санал болгож буй шийдэл', i.proposal, { area: 1, rows: 3 })}
      <div class="jgrid">${fldIn('ii_benefit', 'Үр ашиг (аюулгүй байдал, бүтээмж, чанар…)', i.benefit, { area: 1, rows: 2 })}${fldIn('ii_saving', 'Хэмнэлт, ₮ / сар (тооцож болох бол)', i.saving, { num: 1 })}</div>
    </div></div>
    <div class="jcard"><div class="bcard-h">Төсөвт өртөг <span class="sp"></span><span class="mono" style="font-size:15px">${money(cost)} ₮</span></div><div class="jbody">
      ${edTable('ib', IB_COLS, i.budget, { foot: `<tr class="tot"><td></td><td colspan="4">Нийт төсөв</td><td class="r num">${money(cost)}</td><td colspan="2"></td></tr>` })}
      <p class="note">Материал, consumable-ийг үнийн сангаас сонгоход үнэ нь автоматаар бөглөгдөнө. ${pb ? `Өөрийгөө нөхөх хугацаа ≈ <b>${nf(pb, 1)} сар</b>.` : ''}</p>
    </div></div>
    <div class="jcard"><div class="bcard-h">Зураг (одоогийн байдал, санаа)</div><div class="jbody"><div class="dkph">${(i.photos || []).map((p, k) => `<figure><img src="${p}" alt=""><button class="x" data-iph="${k}">×</button></figure>`).join('')}<button class="btn sm" id="iiPhoto">+ Зураг</button></div></div></div>
    <div class="jcard"><div class="bcard-h">Захирлын шийдвэр</div><div class="jbody"><div class="jgrid">
      <label class="fld">Шийдвэр<select id="ii_decision"><option value="">— хүлээгдэж буй —</option><option value="ok"${i.decision === 'ok' ? ' selected' : ''}>Зөвшөөрсөн</option><option value="mod"${i.decision === 'mod' ? ' selected' : ''}>Засвартай зөвшөөрсөн</option><option value="later"${i.decision === 'later' ? ' selected' : ''}>Хойшлуулсан</option><option value="no"${i.decision === 'no' ? ' selected' : ''}>Татгалзсан</option></select></label>
      ${fldIn('ii_decisionDate', 'Огноо', i.decisionDate, { type: 'date' })}${fldIn('ii_decisionNote', 'Тайлбар, батлагдсан төсөв', i.decisionNote, { cls: 'grow' })}</div>
      <div class="addrow"><button class="btn" id="iiTask">→ Даалгавар болгох</button><span class="note">Батлагдсаны дараа хэрэгжүүлэх ажлыг Даалгавар руу илгээнэ.</span></div>
    </div></div>
    <div class="jcard"><div class="bcard-h">Түүх</div><div class="jbody"><div class="jlog">${(i.log || []).slice().reverse().map(l => `<div><span class="mono">${esc(l.t)}</span>${esc(l.m)}</div>`).join('') || '<span class="note">—</span>'}</div></div></div>`;
  const re = () => renderIdeas();
  [['title'], ['cat'], ['by'], ['owner'], ['prio'], ['due'], ['problem'], ['proposal'], ['benefit'], ['saving', 1], ['decisionDate'], ['decisionNote']].forEach(([k, n]) => { const f = el.querySelector('#ii_' + k); if (f) f.addEventListener('change', () => { i[k] = n ? (f.value === '' ? '' : +f.value) : f.value.trim(); save(); if (['title', 'cat', 'saving', 'by'].includes(k)) re(); }); });
  el.querySelector('#ii_decision').addEventListener('change', e => { i.decision = e.target.value; if (!i.decisionDate) i.decisionDate = today(); const map = { ok: 'ok', mod: 'ok', no: 'no' }; if (map[i.decision] && i.st !== map[i.decision]) { i.log.push({ t: today(), m: `Захирлын шийдвэр: ${e.target.selectedOptions[0].text}` }); i.st = map[i.decision]; } save(); re(); });
  el.querySelectorAll('[data-ist2]').forEach(b => b.addEventListener('click', () => { if (i.st === b.dataset.ist2) return; i.log.push({ t: today(), m: `${istName(i.st)} → ${istName(b.dataset.ist2)}` }); i.st = b.dataset.ist2; save(); re(); }));
  bindEd(el, { ib: { arr: () => i.budget, cols: IB_COLS, blank: () => ({ name: '', qty: 1, unit: 'ш', price: '', note: '' }) } }, () => { save(); re(); }, (id, row, key) => { if (key === 'name') { const c = catFindExact(row.name); if (c) { row.unit = c.unit; row.price = c.price; row.note = c.sup || ''; } } });
  el.querySelector('#iiBack').addEventListener('click', () => { IV.sel = null; re(); });
  el.querySelector('#iiDel').addEventListener('click', () => { if (!confirm('Энэ санааг устгах уу?')) return; S.ideas = ideas().filter(x => x !== i); IV.sel = null; save(); re(); });
  el.querySelector('#iiPhoto').addEventListener('click', () => { const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.multiple = true; f.onchange = async () => { for (const file of f.files) i.photos.push(await imgThumb(file, 1400)); i.photos = i.photos.slice(0, 6); save(); re(); }; f.click(); });
  el.querySelectorAll('[data-iph]').forEach(b => b.addEventListener('click', () => { i.photos.splice(+b.dataset.iph, 1); save(); re(); }));
  el.querySelector('#iiTask').addEventListener('click', () => { const t = newTask({ title: i.title || 'Сайжруулалт', desc: `${i.no}\n${i.proposal || ''}`, type: 'internal', assignee: i.owner || '', due: i.due || '' }); i.log.push({ t: today(), m: 'Даалгавар үүсгэсэн' }); if (i.st === 'ok') i.st = 'doing'; save(); TM.sel = t.id; TM.tab = 'tasks'; setModule('team'); });
  el.querySelectorAll('[data-iout]').forEach(b => b.addEventListener('click', () => { if (i.st === 'idea' || i.st === 'study') { i.log.push({ t: today(), m: 'Захиралд танилцуулах баримт гаргасан' }); i.st = 'present'; save(); } docOut(b.dataset.iout, () => ideaDoc(i), `${i.no}_${i.title || 'санаа'}`).then(re); }));
}
/* «Захиралд танилцуулах» — one-page proposal */
async function ideaDoc(i) {
  const D = await kdoc({ title: 'САНАЛ — ҮЙЛДВЭРИЙН САЙЖРУУЛАЛТ', sub: `${i.no} · ${today()}` });
  D.kv([['Санааны нэр', i.title || '—'], ['Ангилал', i.cat], ['Санаачлагч', pName(i.by) || '—'], ['Хариуцагч', pName(i.owner) || '—'], ['Ач холбогдол', (TPRIO.find(p => p[0] === i.prio) || TPRIO[2])[1]], ['Хэрэгжүүлэх хугацаа', i.due || '—']], 2);
  if (i.problem) D.box('Одоогийн байдал / асуудал', [i.problem]);
  if (i.proposal) D.box('Санал болгож буй шийдэл', [i.proposal]);
  if (i.benefit || i.saving) D.box('Үр ашиг', [i.benefit || '', i.saving ? `Хэмнэлт: ${money(i.saving)} ₮ / сар${ideaPayback(i) ? ` · өөрийгөө нөхөх ≈ ${nf(ideaPayback(i), 1)} сар` : ''}` : ''].filter(Boolean));
  D.h2('Төсөвт өртөг');
  const rows = (i.budget || []).filter(r => r.name).map((r, k) => [k + 1, r.name, Number.isInteger(+r.qty) ? String(+r.qty) : nf(+r.qty || 0, 2), r.unit || '', money(r.price), money((+r.qty || 0) * (+r.price || 0)), r.note || '']);
  D.table([{ t: '№', w: 8, m: 1 }, { t: 'Зардлын нэр' }, { t: 'Тоо', w: 14, a: 'r', m: 1 }, { t: 'Нэгж', w: 12 }, { t: 'Нэгж үнэ, ₮', w: 24, a: 'r', m: 1 }, { t: 'Нийт, ₮', w: 26, a: 'r', m: 1 }, { t: 'Тайлбар', w: 34 }], rows.length ? rows : [['', 'Төсөв оруулаагүй', '', '', '', '', '']]);
  D.totals([['Нийт төсөв', money(ideaCost(i)) + ' ₮', 1]]);
  if ((i.photos || []).length) {
    D.h2('Зураг'); const ims = (await Promise.all(i.photos.slice(0, 4).map(imgLoad))).filter(Boolean), w = (D.W - 6) / 2, h = 55;
    for (let k = 0; k < ims.length; k += 2) { D.need(h + 4); ims.slice(k, k + 2).forEach((im, j) => { const s = Math.min(w / im.naturalWidth, h / im.naturalHeight), iw = im.naturalWidth * s, ih = im.naturalHeight * s; D.x.drawImage(im, D.M + j * (w + 6) + (w - iw) / 2, D.y, iw, ih); }); D.y += h + 4; }
  }
  D.h2('Захирлын шийдвэр');
  const dec = { ok: 'Зөвшөөрсөн', mod: 'Засвартай зөвшөөрсөн', later: 'Хойшлуулсан', no: 'Татгалзсан' }[i.decision];
  D.box('Шийдвэр', [dec ? `${dec}${i.decisionDate ? ' · ' + i.decisionDate : ''}${i.decisionNote ? ' — ' + i.decisionNote : ''}` : '☐ Зөвшөөрсөн     ☐ Засвартай зөвшөөрсөн     ☐ Хойшлуулсан     ☐ Татгалзсан', 'Батлагдсан төсөв: ____________________ ₮']);
  D.sigs(['Санал гаргасан', 'Хянасан', 'Захирал'], { names: [pName(i.by) || '', pName(i.owner) || '', ''] });
  return D;
}
async function ideasListDoc() {
  const D = await kdoc({ title: 'САНАА, САЙЖРУУЛАЛТЫН ЖАГСААЛТ', sub: today() });
  IST.forEach(([k, n]) => { const L = ideas().filter(i => i.st === k); if (!L.length) return; D.h2(n, `${L.length} санаа · ${money(L.reduce((a, i) => a + ideaCost(i), 0))} ₮`);
    D.table([{ t: '№', w: 16, m: 1 }, { t: 'Санаа' }, { t: 'Ангилал', w: 34 }, { t: 'Хариуцагч', w: 28 }, { t: 'Төсөв, ₮', w: 24, a: 'r', m: 1 }, { t: 'Хэмнэлт/сар', w: 22, a: 'r', m: 1 }], L.map(i => [i.no, i.title || '—', i.cat, pName(i.owner) || '—', money(ideaCost(i)), i.saving ? money(i.saving) : ''])); });
  D.sigs(['Бэлтгэсэн', 'Захирал']);
  return D;
}
