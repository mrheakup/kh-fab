/* ---------- Bending UI ---------- */
if (!S.bend) { S.bend = bendDefaults(); S.bend.profiles = sampleProfiles(); S.bend.cur = S.bend.profiles[0].id; }
S.materials.forEach(m => { if (!(m.rm > 0)) m.rm = RM_DEFAULT[m.name] || 420; });
S.bend.punches.forEach(p => { if (p.goose && !(p.throat > 0)) p.throat = 55; });
let BST = { step: 0, plan: null, calc: null };
const curProf = () => S.bend.profiles.find(p => p.id === S.bend.cur) || S.bend.profiles[0];
function bpal(print) {
  if (print) return { part: '#cf4a0c', ink: '#141b23', accent: '#cf4a0c', blue: '#2563a8', sheet: '#e8ecf0', tool: '#9aa5b1', bad: '#c43131', font: 'IBM Plex Sans, Arial, sans-serif' };
  return { part: cssv('--accent'), ink: cssv('--ink'), accent: cssv('--accent'), blue: isDark() ? '#6ea8ff' : '#2563a8', sheet: cssv('--sheet'), tool: isDark() ? '#55626f' : '#b9c3cd', bad: cssv('--bad'), font: 'IBM Plex Sans, Arial, sans-serif' };
}
/* module switch */
const MOD_ALIAS = { dash: 'jobs', quotes: 'jobs', jobs: 'jobs', docs: 'jobs' };
const JVIEW_T = { dash: ['Хяналтын самбар', 'Үнийн санал → ажил → ашиг'], quotes: ['Үнийн санал', 'Бэлдэх, илгээх, ажил болгох'], jobs: ['Ажил', 'Scope, үйлдвэрлэл, явц, хүлээлгэх'], docs: ['Баримт бичиг', 'Packing list, маягт, иж бүрдэл, гэрчилгээ'] };
function setModule(v) {
  const m = MOD_ALIAS[v] || v;
  $$('.modtabs button').forEach(b => b.classList.toggle('on', b.dataset.mod === v));
  if (m === 'jobs' && typeof J !== 'undefined') {
    document.documentElement.dataset.jview = v;
    J.dash = v === 'dash';
    if (v === 'docs') { if (!['kits', 'certs', 'dockets', 'forms', 'scopes', 'invoices'].includes(J.tab)) J.tab = 'dockets'; } else J.tab = 'jobs';
    $$('[data-jtab]').forEach(x => x.classList.toggle('on', x.dataset.jtab === J.tab)); ['jobs', 'kits', 'certs', 'dockets', 'forms', 'scopes', 'invoices'].forEach(t => { const e = $('#jtab-' + t); if (e) e.hidden = t !== J.tab; });
    const f = $('#jFilter'); if (f && (v === 'quotes' || v === 'jobs')) f.value = v;
    if (v === 'quotes' || v === 'jobs') { const cur = findJob(J.sel); if (!cur || (v === 'quotes') !== isQ(cur)) { const first = S.jobs.find(j => (v === 'quotes') === isQ(j)); J.sel = first ? first.id : null; } J.sub = v === 'quotes' ? 'quote' : (J.sub === 'quote' ? 'main' : J.sub); }
    const pt = $('#jobsPT'); if (pt) pt.innerHTML = `${JVIEW_T[v][0]}<small>${JVIEW_T[v][1]}</small>`;
  } else document.documentElement.dataset.jview = '';
  $('#nestSide').hidden = $('#nestMain').hidden = m !== 'nest';
  $('#bendSide').hidden = $('#bendMain').hidden = m !== 'bend'; if ($('#rollMain')) $('#rollMain').hidden = true;
  $('#jobsSide').hidden = $('#jobsMain').hidden = m !== 'jobs';
  if ($('#infoSide')) $('#infoSide').hidden = $('#infoMain').hidden = m !== 'info';
  if ($('#inspSide')) $('#inspSide').hidden = $('#inspMain').hidden = m !== 'insp';
  if ($('#teamSide')) $('#teamSide').hidden = $('#teamMain').hidden = m !== 'team';
  if ($('#planSide')) $('#planSide').hidden = $('#planMain').hidden = m !== 'plan';
  if ($('#ideasSide')) $('#ideasSide').hidden = $('#ideaMain').hidden = m !== 'ideas';
  if ($('#stockSide')) $('#stockSide').hidden = $('#stockMain').hidden = m !== 'stock';
  if (m === 'stock' && typeof renderWh === 'function') setTimeout(renderWh, 0);
  if (m === 'info') { if (typeof renderInfo === 'function') renderInfo(); } else if (m === 'insp') { if (typeof renderInsp === 'function') renderInsp(); } else if (m === 'team') { if (typeof renderTeam === 'function') renderTeam(); } else if (m === 'ideas') { if (typeof renderIdeas === 'function') renderIdeas(); } else if (m === 'plan') { if (typeof renderPlan === 'function') renderPlan($('#planMain')); } else if (m === 'bend') { renderBend(); if (typeof showBendTab === 'function') showBendTab(RT.tab); } else if (m === 'jobs') renderJobs(); else drawView();
  try { localStorage.setItem(KEY + ':mod', v); } catch (e) { }
}
$$('.modtabs button').forEach(b => b.addEventListener('click', () => setModule(b.dataset.mod)));
$$('[data-btab]').forEach(b => b.addEventListener('click', () => showBendTab(b.dataset.btab)));

function renderBend() { renderBList(); renderBTools(); renderBEditor(); }
function renderBList() {
  $('#bNewT').innerHTML = '<option value="">+ Шинэ профиль…</option>' + Object.keys(BT).map(k => `<option value="${k}">${k} хэлбэр</option>`).join('');
  const el = $('#bList');
  if (!S.bend.profiles.length) { el.innerHTML = '<div class="emptyp">Профиль алга. Дээрх цэснээс загвар сонгоно уу.</div>'; return; }
  el.innerHTML = S.bend.profiles.map(p => { let c = null; try { c = bendCalc(p); } catch (e) { } return `<div class="bitem${p.id === S.bend.cur ? ' on' : ''}" data-id="${p.id}"><canvas data-id="${p.id}"></canvas><div style="min-width:0"><div class="t">${esc(p.name)}</div><div class="m">${p.thk} мм · ${p.bends.length} нугалаа · ${p.qty} ш</div><div class="m">${c ? `дэлгэмэл ${nf(c.flat, 1)} × ${nf(p.len)}` : ''}</div></div><button class="x" data-del aria-label="Устгах">×</button></div>`; }).join('');
  $$('#bList canvas').forEach(cv => { const p = S.bend.profiles.find(q => q.id === cv.dataset.id); try { const c = bendCalc(p); drawProfile(cv, p, c, { ...bpal(), mini: true }); } catch (e) { } });
}
$('#bList').addEventListener('click', e => {
  const it = e.target.closest('.bitem'); if (!it) return;
  if (e.target.closest('[data-del]')) { S.bend.profiles = S.bend.profiles.filter(p => p.id !== it.dataset.id); if (S.bend.cur === it.dataset.id) S.bend.cur = S.bend.profiles[0]?.id || null; save(); renderBend(); return; }
  S.bend.cur = it.dataset.id; BST.step = 0; save(); renderBend();
});
$('#bNewT').addEventListener('change', e => {
  const k = e.target.value; if (!k) return; e.target.value = '';
  const t = BT[k], p = { id: uid(), name: `${k} профиль`, mat: S.defMat, thk: Math.min(+S.defThk || 3, 6), len: 1000, qty: 1, dims: 'out', flanges: t.flanges.slice(), bends: t.bends.map(b => ({ ...b })), dieId: '', punchId: '', k: null, r: null };
  S.bend.profiles.unshift(p); S.bend.cur = p.id; BST.step = 0; save(); renderBend();
});
$('#bDup').addEventListener('click', () => { const p = curProf(); if (!p) return; const q = JSON.parse(JSON.stringify(p)); q.id = uid(); q.name += ' (хуулбар)'; S.bend.profiles.unshift(q); S.bend.cur = q.id; save(); renderBend(); });
$('#bDel').addEventListener('click', () => { const p = curProf(); if (!p) return; S.bend.profiles = S.bend.profiles.filter(x => x !== p); S.bend.cur = S.bend.profiles[0]?.id || null; save(); renderBend(); });

function renderBTools() {
  const B = S.bend, m = B.machine;
  $('#m_name').value = m.name; $('#m_ton').value = m.ton; $('#m_len').value = m.len; $('#m_bg').value = m.bgMax; $('#m_fin').value = m.finger;
  $('#punBody').innerHTML = B.punches.map((p, i) => `<tr data-i="${i}"><td><input data-k="name" value="${esc(p.name)}" style="font-family:var(--f-ui)"></td><td><input data-k="r" type="number" step="0.1" value="${p.r}"></td><td><input data-k="h" type="number" value="${p.h}"></td><td><input data-k="w" type="number" value="${p.w}"></td><td style="white-space:nowrap"><input data-k="goose" type="checkbox" ${p.goose ? 'checked' : ''} style="width:auto"> <input data-k="throat" type="number" value="${p.throat || 55}" style="width:48px" title="Хүзүүний гүн, мм"></td><td><button class="x" aria-label="Устгах">×</button></td></tr>`).join('');
  $('#dieBody').innerHTML = B.dies.map((d, i) => `<tr data-i="${i}"><td><input data-k="name" value="${esc(d.name)}" style="font-family:var(--f-ui)"></td><td><input data-k="V" type="number" step="1" value="${d.V}"></td><td><input data-k="ang" type="number" value="${d.ang}"></td><td><button class="x" aria-label="Устгах">×</button></td></tr>`).join('');
  $('#rmBody').innerHTML = S.materials.map((m, i) => `<tr data-i="${i}"><td>${esc(m.name)}</td><td><input type="number" step="10" value="${m.rm || 420}"></td></tr>`).join('');
}
[['m_name', 'name', 's'], ['m_ton', 'ton', 'n'], ['m_len', 'len', 'n'], ['m_bg', 'bgMax', 'n'], ['m_fin', 'finger', 'n']].forEach(([id, k, t]) => $('#' + id).addEventListener('change', e => { S.bend.machine[k] = t === 'n' ? Math.max(1, +e.target.value || 1) : e.target.value; save(); renderBEditor(); }));
const tblEdit = (body, arr, after) => {
  $(body).addEventListener('change', e => { const tr = e.target.closest('tr'), o = arr()[+tr.dataset.i], k = e.target.dataset.k; o[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' ? Math.max(0, +e.target.value || 0) : e.target.value; if (k === 'V') o.id = o.id || uid(); save(); after(); });
  $(body).addEventListener('click', e => { if (!e.target.matches('.x')) return; arr().splice(+e.target.closest('tr').dataset.i, 1); save(); renderBTools(); after(); });
};
tblEdit('#punBody', () => S.bend.punches, () => renderBEditor());
tblEdit('#dieBody', () => S.bend.dies, () => renderBEditor());
$('#rmBody').addEventListener('change', e => { const tr = e.target.closest('tr'); S.materials[+tr.dataset.i].rm = Math.max(50, +e.target.value || 420); save(); renderBEditor(); });
$('#punAdd').addEventListener('click', () => { S.bend.punches.push({ id: uid(), name: 'Шинэ пуансон', ang: 88, r: 1, h: 120, w: 14, goose: false }); save(); renderBTools(); });
$('#dieAdd').addEventListener('click', () => { S.bend.dies.push({ id: uid(), name: 'V20 88°', V: 20, ang: 88 }); save(); renderBTools(); });

function renderBEditor() {
  const p = curProf();
  $('#bendMain').querySelectorAll('input,select,button').forEach(el => { if (!['bNewT'].includes(el.id)) el.disabled = !p; });
  if (!p) { ['bProf', 'bFlat', 'bSim'].forEach(id => prepCanvas($('#' + id))); $('#bSegs').innerHTML = ''; $('#bSum').innerHTML = ''; $('#bSeq').innerHTML = ''; $('#bWarn').innerHTML = ''; return; }
  $('#b_name').value = p.name; $('#b_mat').innerHTML = matOptions(p.mat); $('#b_thk').value = p.thk; $('#b_len').value = p.len; $('#b_qty').value = p.qty; $('#b_dims').value = p.dims;
  $('#b_die').innerHTML = '<option value="">Авто</option>' + S.bend.dies.map(d => `<option value="${d.id}"${d.id === p.dieId ? ' selected' : ''}>${esc(d.name)}</option>`).join('');
  $('#b_pun').innerHTML = '<option value="">Авто</option>' + S.bend.punches.map(d => `<option value="${d.id}"${d.id === p.punchId ? ' selected' : ''}>${esc(d.name)}</option>`).join('');
  $('#b_r').value = p.r > 0 ? p.r : ''; $('#b_k').value = p.k > 0 ? p.k : '';
  let h = '';
  p.flanges.forEach((L, i) => {
    h += `<div class="brow"><span>Мөр ${i + 1}</span><input data-f="${i}" type="number" step="0.1" min="0" value="${L}" aria-label="Мөр ${i + 1}, мм"><span class="muted">мм</span></div>`;
    if (i < p.bends.length) { const b = p.bends[i]; h += `<div class="brow bend"><span>Нугалаа ${i + 1}</span><input data-a="${i}" type="number" step="0.5" min="1" max="179" value="${b.ang}" aria-label="Өнцөг"><select data-d="${i}" style="width:auto"><option value="up"${b.dir === 'up' ? ' selected' : ''}>↑ дээш</option><option value="down"${b.dir === 'down' ? ' selected' : ''}>↓ доош</option></select></div>`; }
  });
  $('#bSegs').innerHTML = h;
  let c;
  try { c = bendCalc(p); } catch (err) { $('#bWarn').innerHTML = `<div class="warnbox">${esc(err.message)}</div>`; return; }
  const plan = planSequence(p, c); BST.calc = c; BST.plan = plan; if (BST.step >= plan.steps.length) BST.step = 0;
  const pal = bpal();
  drawProfile($('#bProf'), p, c, pal); drawFlat($('#bFlat'), p, c, pal);
  $('#bFlatDim').textContent = `${nf(c.flat, 2)} × ${nf(p.len)} мм`;
  const bdTxt = c.bends.length ? `BD ${nf(c.bends[0].BD, 2)} · BA ${nf(c.bends[0].BA, 2)}` : '';
  const stats = [['Дэлгэмэл', `${nf(c.flat, 2)}<small>мм</small>`, `× ${nf(p.len)} мм, ${nf(c.kg, 2)} кг`], ['Матриц', c.die ? `V${c.V}` : '—', `зөвлөмж ≈ V${Math.round(c.rec)}`], ['Дотор R', `${nf(c.R, 2)}<small>мм</small>`, p.r > 0 ? 'гараар' : '≈ 0.16·V'], ['K-factor', nf(c.K, 3), p.k > 0 ? 'гараар' : 'DIN 6935'], ['Нугалах хасалт', c.bends.length ? `${nf(c.bends[0].BD, 2)}<small>мм</small>` : '—', bdTxt], ['Хүч', `${nf(c.tonMax, 1)}<small>т</small>`, `машин ${S.bend.machine.ton} т`], ['Мөрийн доод', `${nf(c.minFl, 1)}<small>мм</small>`, `0.71·V${c.V}`]];
  $('#bSum').innerHTML = stats.map(s => `<div class="stat"><div class="k">${s[0]}</div><div class="v">${s[1]}</div><div class="s">${s[2]}</div></div>`).join('');
  const warns = c.warn.concat(plan.ok ? [] : ['Зарим алхамд мөргөлдөх эрсдэл байна — пуансоноо (хүзүүт) эсвэл дарааллаа өөрчилнө үү']);
  $('#bWarn').innerHTML = warns.length ? `<div class="warnbox">${warns.map(esc).join('<br>')}</div>` : '';
  $('#bSeqNote').textContent = plan.steps.length ? `${plan.flips} удаа урвуулна, ${plan.turns} удаа урд/хойд солино` : '';
  $('#bSeq').innerHTML = plan.steps.length ? `<table class="dt" style="min-width:520px"><thead><tr><th>Алхам</th><th>Нугалаа</th><th class="r">Өнцөг</th><th>Барих</th><th class="r">Back-gauge X</th><th class="r">Хүч, т</th><th>Тэмдэглэл</th></tr></thead><tbody>${plan.steps.map((s, i) => `<tr${i === BST.step ? ' style="background:var(--accent-soft)"' : ''}><td class="num">${i + 1}</td><td>№${s.bi + 1}</td><td class="r num">${p.bends[s.bi].ang}°</td><td>${[s.flip ? 'урвуулах' : '', s.turn ? 'урд/хойд солих' : ''].filter(Boolean).join(', ') || '—'}</td><td class="r num">${s.X > 0 ? nf(s.X, 1) : '—'}</td><td class="r num">${nf(s.ton, 1)}</td><td>${s.hits.length ? `<span class="pill bad">${esc(s.hits.join(', '))}</span>` : '<span class="pill ok">OK</span>'}</td></tr>`).join('')}</tbody></table>` : '<p class="note" style="padding:10px">Нугалаа алга.</p>';
  $('#bStLbl').textContent = plan.steps.length ? ` ${BST.step + 1}/${plan.steps.length} ` : '';
  drawSim($('#bSim'), p, c, plan, BST.step, pal);
}
const bUpd = (fn) => e => { const p = curProf(); if (!p) return; fn(p, e.target); save(); renderBEditor(); renderBList(); };
$('#b_name').addEventListener('change', bUpd((p, t) => p.name = t.value || 'Профиль'));
$('#b_mat').addEventListener('change', bUpd((p, t) => p.mat = t.value));
$('#b_thk').addEventListener('change', bUpd((p, t) => p.thk = Math.max(0.3, +t.value || 1)));
$('#b_len').addEventListener('change', bUpd((p, t) => p.len = Math.max(1, +t.value || 1)));
$('#b_qty').addEventListener('change', bUpd((p, t) => p.qty = Math.max(1, Math.round(+t.value || 1))));
$('#b_dims').addEventListener('change', bUpd((p, t) => p.dims = t.value));
$('#b_die').addEventListener('change', bUpd((p, t) => p.dieId = t.value));
$('#b_pun').addEventListener('change', bUpd((p, t) => p.punchId = t.value));
$('#b_r').addEventListener('change', bUpd((p, t) => p.r = +t.value > 0 ? +t.value : null));
$('#b_k').addEventListener('change', bUpd((p, t) => p.k = +t.value > 0 ? Math.min(0.5, +t.value) : null));
$('#bSegs').addEventListener('change', bUpd((p, t) => {
  if (t.dataset.f != null) p.flanges[+t.dataset.f] = Math.max(0, +t.value || 0);
  if (t.dataset.a != null) p.bends[+t.dataset.a].ang = Math.min(179, Math.max(1, +t.value || 90));
  if (t.dataset.d != null) p.bends[+t.dataset.d].dir = t.value;
}));
$('#bAddF').addEventListener('click', bUpd(p => { p.bends.push({ ang: 90, dir: 'up' }); p.flanges.push(50); }));
$('#bDelF').addEventListener('click', bUpd(p => { if (p.bends.length) { p.bends.pop(); p.flanges.pop(); } }));
$('#bStPrev').addEventListener('click', () => { if (!BST.plan || !BST.plan.steps.length) return; BST.step = (BST.step - 1 + BST.plan.steps.length) % BST.plan.steps.length; renderBEditor(); });
$('#bStNext').addEventListener('click', () => { if (!BST.plan || !BST.plan.steps.length) return; BST.step = (BST.step + 1) % BST.plan.steps.length; renderBEditor(); });

/* flat blank → nesting part with bend lines */
function flatPart(p, c) {
  const W = c.flat, L = +p.len;
  return { outer: rectLoop(W, L, 0), holes: [], bends: c.pos.map((d, i) => ({ x1: d, y1: 0, x2: d, y2: L, up: p.bends[i].dir === 'up', ang: p.bends[i].ang })) };
}
$('#bToNest').addEventListener('click', () => {
  const p = curProf(); if (!p) return; const c = bendCalc(p), g = flatPart(p, c);
  S.parts.push({ id: uid(), name: `${p.name} (дэлгэмэл)`, qty: p.qty, mat: p.mat, thk: p.thk, rot: true, mir: false, prio: 0, outer: g.outer, holes: g.holes, bends: g.bends });
  save(); renderParts(); toast(`«${p.name}» дэлгэмэл Nesting-д нэмэгдлээ (${nf(c.flat, 1)} × ${nf(p.len)} мм)`);
});
$('#bDxf').addEventListener('click', () => {
  const p = curProf(); if (!p) return; const c = bendCalc(p), g = flatPart(p, c), w = dxfWriter();
  w.loop('OUTER', g.outer); g.bends.forEach(b => w.line(b.up ? 'BEND_UP' : 'BEND_DOWN', b.x1, b.y1, b.x2, b.y2));
  const name = safeName(`${p.name}_дэлгэмэл_${nf(c.flat, 1).replace(/\s/g, '')}x${p.len}`) + '.dxf', txt = w.doc();
  if (inHost && !window.kh) { if (!window.JSZip) { toast('ZIP сан ачаалагдсангүй'); return; } const z = new JSZip(); z.file(name, txt); z.generateAsync({ type: 'blob' }).then(b => saveFile(name.replace(/\.dxf$/, '.zip'), b)); }
  else saveFile(name, txt, 'application/dxf');
});

/* nesting part with bend lines → bending profile */
function profileFromPart(part) {
  const bl = part.bends || []; if (!bl.length) return null;
  const vertical = bl.every(b => Math.abs(b.x1 - b.x2) < 0.01), horizontal = bl.every(b => Math.abs(b.y1 - b.y2) < 0.01);
  if (!vertical && !horizontal) return null;
  const inf = partInfo(part), W = vertical ? inf.w : inf.h, L = vertical ? inf.h : inf.w;
  const pos = bl.map(b => vertical ? b.x1 : b.y1).sort((a, b) => a - b);
  const sortedB = bl.slice().sort((a, b) => (vertical ? a.x1 - b.x1 : a.y1 - b.y1));
  const p = { id: uid(), name: part.name.replace(/ \(дэлгэмэл\)$/, ''), mat: part.mat, thk: part.thk, len: Math.round(L * 10) / 10, qty: part.qty, dims: 'out', flanges: [], bends: sortedB.map(b => ({ ang: b.ang || 90, dir: b.up === false ? 'down' : 'up' })), dieId: '', punchId: '', k: null, r: null };
  // invert the flat-length math: flat segments between bend centre lines → outside flange lengths
  const c0 = bendCalc({ ...p, flanges: new Array(pos.length + 1).fill(100) });
  const edges = [0, ...pos, W];
  for (let i = 0; i <= pos.length; i++) {
    const a = i > 0 ? c0.bends[i - 1] : null, b = i < pos.length ? c0.bends[i] : null;
    const s = (edges[i + 1] - edges[i]) - (a ? a.BA / 2 : 0) - (b ? b.BA / 2 : 0);
    p.flanges.push(Math.round((s + (a ? a.OSSB : 0) + (b ? b.OSSB : 0)) * 100) / 100);
  }
  return p;
}
function sendPartToBend(id) {
  const part = S.parts.find(q => q.id === id); const p = part && profileFromPart(part);
  if (!p) { toast('Нугалах шугамууд зэрэгцээ биш тул профиль болгох боломжгүй'); return; }
  S.bend.profiles.unshift(p); S.bend.cur = p.id; save(); setModule('bend'); toast('Профиль үүслээ — өнцөг, чиглэлийг шалгана уу');
}

/* operator sheet */
async function bendPdf() {
  const p = curProf(); if (!p) return;
  if (!window.jspdf) { toast('PDF сан ачаалагдсангүй'); return; }
  try { await document.fonts.ready; } catch (e) { } await logoImg();
  const c = bendCalc(p), plan = planSequence(p, c), PW = 210, PH = 297, K = PRINT_K, F = '"IBM Plex Sans", Arial, sans-serif', FM = '"IBM Plex Mono", Consolas, monospace', pages = [];
  const page = () => { const cv = document.createElement('canvas'); cv.width = PW * K; cv.height = PH * K; const x = cv.getContext('2d'); x.scale(K, K); x.fillStyle = '#fff'; x.fillRect(0, 0, PW, PH); pages.push(cv); return x; };
  const sub = (x, X0, Y0, w, h) => { const cv = document.createElement('canvas'); cv.width = w * K; cv.height = h * K; cv.style.width = w + 'px'; const cx = cv.getContext('2d'); cx.scale(K, K); return { cv, ctx: { x: cx, w, h } }; };
  let x = page(); const pal = bpal(true);
  x.fillStyle = '#10161c'; x.font = `700 5.5px ${F}`; x.textBaseline = 'alphabetic'; x.fillText('Нугалах операторын хуудас', 15, 20); drawLogo(x, PW - 15, 12, 9, 'right'); x.textBaseline = 'alphabetic'; x.textAlign = 'left';
  x.font = `400 3.2px ${F}`; x.fillStyle = '#4f5b68'; x.fillText(`Kh International · ISO 9001 · ${new Date().toLocaleDateString('mn-MN')} · ${S.bend.machine.name} (${S.bend.machine.ton} т)`, 15, 26);
  x.strokeStyle = '#cf4a0c'; x.lineWidth = 0.5; x.beginPath(); x.moveTo(15, 30); x.lineTo(PW - 15, 30); x.stroke();
  x.fillStyle = '#10161c'; x.font = `600 4.5px ${F}`; x.fillText(p.name, 15, 38);
  const info = [['Материал', `${p.mat}, ${p.thk} мм`], ['Дэлгэмэл', `${nf(c.flat, 2)} × ${nf(p.len)} мм`], ['Тоо', `${p.qty} ш`], ['Матриц', c.die ? c.die.name : '—'], ['Пуансон', c.punch ? c.punch.name : '—'], ['Дотор R / K', `${nf(c.R, 2)} мм / ${nf(c.K, 3)}`], ['Хүч (хамгийн их)', `${nf(c.tonMax, 1)} т`], ['Хэмжээ', p.dims === 'in' ? 'дотор' : 'гадна']];
  let yy = 46; x.font = `400 3.1px ${F}`;
  info.forEach(([k, v], i) => { const col = i % 2, X0 = 15 + col * 92; if (col === 0 && i) yy += 5.5; x.fillStyle = '#6a7684'; x.textAlign = 'left'; x.fillText(k, X0, yy); x.fillStyle = '#141b23'; x.font = `500 3.1px ${FM}`; x.fillText(v, X0 + 32, yy); x.font = `400 3.1px ${F}`; });
  yy += 8;
  const draw = (fn, X0, Y0, w, h, ...args) => { const s = sub(x, X0, Y0, w, h); fn(s.ctx, ...args); x.drawImage(s.cv, X0, Y0, w, h); x.strokeStyle = '#d5dbe2'; x.lineWidth = 0.3; x.strokeRect(X0, Y0, w, h); };
  draw((ctx) => drawProfile(ctx, p, c, { ...pal, font: F, fs: 3, lw: 0.25 }), 15, yy, 88, 70); draw((ctx) => drawFlat(ctx, p, c, { ...pal, font: F, fs: 2.8, lw: 0.25 }), 107, yy, 88, 70);
  yy += 78;
  x.fillStyle = '#10161c'; x.font = `600 3.8px ${F}`; x.textAlign = 'left'; x.fillText('Нугалах дараалал', 15, yy); yy += 3;
  const cols = [['Алхам', 13], ['Нугалаа', 17], ['Өнцөг', 14], ['Чиглэл', 15], ['Барих', 34], ['Back-gauge X', 25], ['Хүч, т', 14], ['Шалгалт', 48]];
  let cx = 15; x.font = `600 2.8px ${F}`; x.fillStyle = '#6a7684'; cols.forEach(([t, w]) => { x.fillText(t, cx + 1, yy + 4); cx += w; }); yy += 6;
  plan.steps.forEach((s, i) => { cx = 15; const row = [i + 1, '№' + (s.bi + 1), p.bends[s.bi].ang + '°', p.bends[s.bi].dir === 'up' ? 'дээш' : 'доош', [s.flip ? 'урвуулах' : '', s.turn ? 'урд/хойд' : ''].filter(Boolean).join(', ') || '—', s.X > 0 ? nf(s.X, 1) : '—', nf(s.ton, 1), s.hits.length ? 'мөргөлдөх: ' + s.hits.join(', ') : 'OK']; x.font = `400 3px ${FM}`; x.fillStyle = s.hits.length ? '#c43131' : '#141b23'; cols.forEach(([, w], j) => { x.fillText(String(row[j]), cx + 1, yy + 4); cx += w; }); x.strokeStyle = '#e3e8ee'; x.beginPath(); x.moveTo(15, yy + 6); x.lineTo(PW - 15, yy + 6); x.stroke(); yy += 6; });
  yy += 6;
  const per = 3, sw = (PW - 30 - (per - 1) * 4) / per, sh = 48;
  plan.steps.forEach((s, i) => {
    if (yy + sh + 8 > PH - 15) { x = page(); yy = 20; }
    const col = i % per, X0 = 15 + col * (sw + 4);
    draw((ctx) => drawSim(ctx, p, c, plan, i, { ...pal, font: F, lw: 0.25 }), X0, yy, sw, sh);
    x.fillStyle = '#141b23'; x.font = `600 3px ${F}`; x.textAlign = 'left'; x.fillText(`Алхам ${i + 1}: №${s.bi + 1} ${p.bends[s.bi].ang}°${s.X > 0 ? ' · X ' + nf(s.X, 1) : ''}`, X0, yy + sh + 4);
    if (col === per - 1) yy += sh + 9;
  });
  if (c.warn.length) { yy = Math.min(PH - 25, yy + sh + 12); x.fillStyle = '#c43131'; x.font = `400 3px ${F}`; c.warn.forEach(w => { x.fillText('• ' + w, 15, yy); yy += 4.5; }); }
  pages.forEach(cv => { const g = cv.getContext('2d'); g.font = `400 2.6px ${F}`; g.fillStyle = '#6a7684'; g.textAlign = 'left'; g.fillText('Kh International · ISO 9001 чанарын удирдлагын тогтолцоо · Бэлтгэсэн: ________  Хянасан: ________  Оператор: ________', 15, PH - 8); });
  if (window.__pv) { window.__pv = 0; printImgs(pages.map((c, i) => ({ url: c.toDataURL('image/jpeg', 0.95), alias: 'p' + i })), false, 'a4', "Нугалах_хуудас"); return; }
  const pdf = i18nPdf(new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true }));
  pages.forEach((cv, i) => { if (i) pdf.addPage(); pdf.addImage(cv.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, PW, PH); });
  saveFile(safeName(`Нугалах_${p.name}`) + '.pdf', pdf.output('blob'), 'application/pdf');
}
$('#bPdf').addEventListener('click', bendPdf);
$('#bPrint').addEventListener('click', () => { window.__pv = 1; bendPdf(); });
new ResizeObserver(() => { if (!$('#bendMain').hidden) renderBEditor(); }).observe($('#bendMain'));
