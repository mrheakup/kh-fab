/* ================= KH Nesting — application ================= */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const KEY = 'kh-nesting-v1';
const uid = () => Math.random().toString(36).slice(2, 9);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = (n, d = 0) => { if (!isFinite(n)) return '—'; const s = Math.abs(n).toFixed(d).split('.'); s[0] = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' '); return (n < 0 ? '−' : '') + s.join('.'); };
const fmtTime = min => { if (!isFinite(min)) return '—'; const h = Math.floor(min / 60), m = Math.round(min - h * 60); return h ? `${h} ц ${m} мин` : `${m} мин`; };

/* ---------- state ---------- */
function defaults() {
  return {
    v: 1, jobName: 'Ажил-001',
    materials: [
      { name: 'Ст3 / S235', rho: 7.85, price: 3800 }, { name: 'S355 / 09Г2С', rho: 7.85, price: 4300 },
      { name: 'Hardox 450', rho: 7.85, price: 14000 }, { name: 'Зэвэрдэггүй 304', rho: 7.93, price: 16000 },
      { name: 'Хөнгөн цагаан 5083', rho: 2.66, price: 18000 }, { name: 'Цайрдсан', rho: 7.85, price: 4500 }
    ],
    std: [{ L: 2500, W: 1250, on: true }, { L: 3000, W: 1500, on: true }, { L: 6000, W: 1500, on: true }, { L: 6000, W: 2000, on: false }, { L: 2000, W: 1000, on: false }],
    sheetMode: 'auto', fixedIdx: 1,
    remnants: [{ id: uid(), mat: 'Ст3 / S235', thk: 6, L: 1500, W: 1200, qty: 1 }],
    useRem: true,
    s: { gap: 6, margin: 10, rot: 90, prec: 'normal', opt: 6, sag: 0.05, keep: true, pip: true, mir: false, cl: true, trim: true, trimScope: 'last', trimStep: 50, minRem: 300, dxfSheet: 1, dxfBend: 0, leadIn: 0, rapid: 20000 },
    quote: { customer: '', no: 'ҮС-001', valid: 7, markup: 20, setup: 0, vat: true, by: 'Х. Очирбат', contact: '', note: 'Үнэд материал болон лазер зүсэлт багтсан. Гулзайлт, гагнуур, будаг ороогүй.' },
    cut: { speeds: [[1, 20000, 0.3], [2, 9000, 0.5], [3, 5000, 0.8], [4, 3800, 1], [5, 3000, 1.2], [6, 2500, 1.5], [8, 1800, 2], [10, 1300, 2.5], [12, 1000, 3], [16, 700, 4], [20, 500, 6]], cutPrice: 1200, piercePrice: 100 },
    defMat: 'Ст3 / S235', defThk: 6,
    parts: []
  };
}
function sampleParts() {
  const mk = (name, type, vals, qty, thk = 6, mat = 'Ст3 / S235') => { const g = SHAPES[type].build(vals); return { id: uid(), name, qty, mat, thk, rot: true, mir: false, prio: 0, outer: g.outer, holes: g.holes }; };
  const bracket = { id: uid(), name: 'Тулгуур L 200×180', qty: 12, mat: 'Ст3 / S235', thk: 6, rot: true, mir: false, prio: 0,
    outer: [{ x: 0, y: 0, b: 0 }, { x: 200, y: 0, b: 0 }, { x: 200, y: 50, b: 0 }, { x: 70, y: 50, b: -BQ }, { x: 50, y: 70, b: 0 }, { x: 50, y: 180, b: 0 }, { x: 0, y: 180, b: 0 }],
    holes: [circleLoop(170, 25, 7), circleLoop(25, 150, 7)] };
  return [
    mk('Фланц Ø300', 'ring', { D: 300, d: 120, n: 8, h: 18, P: 240 }, 8),
    mk('Хавтан 400×250', 'rect', { L: 400, W: 250, R: 20, D: 14, E: 30 }, 14),
    mk('Гуссет 200×150', 'gusset', { A: 200, B: 150, C: 15 }, 30),
    bracket,
    mk('Шайба Ø80', 'ring', { D: 80, d: 33, n: 0, h: 0, P: 0 }, 40),
    mk('Жийргэвч 150×100', 'rect', { L: 150, W: 100, R: 0, D: 0, E: 30 }, 24),
    mk('Бэхэлгээ 300×120', 'slot', { L: 300, W: 120, R: 10, S: 120, H: 22 }, 6, 10)
  ];
}
function load() { try { const t = localStorage.getItem(KEY); if (!t) return null; const o = JSON.parse(t); if (!o || o.v !== 1 || !Array.isArray(o.parts)) return null; return mergeState(o); } catch (e) { return null; } }
function mergeState(o) { const d = defaults(); const r = Object.assign(d, o); r.s = Object.assign(defaults().s, o.s || {}); r.cut = Object.assign(defaults().cut, o.cut || {}); r.quote = Object.assign(defaults().quote, o.quote || {}); return r; }
let S = load();
let firstRun = false;
if (!S) { S = defaults(); S.parts = sampleParts(); firstRun = true; }
let saveT = 0;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }, 250); }

let R = null;            // nesting result
let V = { g: 0, l: 0, k: 1, px: 0, py: 0, labels: true, hover: null, rtab: 'sheets', edit: false, sel: null, drag: null, path: false };

/* ---------- small helpers ---------- */
function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, ms); }
function isDark() { const a = document.documentElement.getAttribute('data-theme'); if (a) return a === 'dark'; return matchMedia('(prefers-color-scheme: dark)').matches; }
function cssv(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function partColor(i, dark, alpha = 1) { const h = (i * 137.508 + 200) % 360; return dark ? `hsla(${h},48%,${50}%,${alpha})` : `hsla(${h},58%,${62}%,${alpha})`; }
function matOf(name) { return S.materials.find(m => m.name === name) || { name, rho: 7.85, price: 0 }; }
function speedFor(t) {
  const a = S.cut.speeds.filter(r => r[0] > 0 && r[1] > 0).sort((x, y) => x[0] - y[0]);
  if (!a.length) return { v: 2000, p: 1 };
  if (t <= a[0][0]) return { v: a[0][1], p: a[0][2] };
  for (let i = 1; i < a.length; i++) if (t <= a[i][0]) { const k = (t - a[i - 1][0]) / (a[i][0] - a[i - 1][0]); return { v: a[i - 1][1] + k * (a[i][1] - a[i - 1][1]), p: a[i - 1][2] + k * (a[i][2] - a[i - 1][2]) }; }
  const l = a[a.length - 1]; return { v: l[1], p: l[2] };
}
function matOptions(sel) { const names = S.materials.map(m => m.name); if (sel && !names.includes(sel)) names.push(sel); return names.map(n => `<option${n === sel ? ' selected' : ''}>${esc(n)}</option>`).join(''); }

/* draw a part into a box (thumbnails, dialog preview) */
function drawPartBox(cv, part, color) {
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth || cv.width, h = cv.clientHeight || cv.height;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
  if (!part) return;
  const inf = partInfo(part), pad = 6, sc = Math.min((w - 2 * pad) / Math.max(inf.w, 1e-6), (h - 2 * pad) / Math.max(inf.h, 1e-6));
  const ox = (w - inf.w * sc) / 2, oy = (h + inf.h * sc) / 2;
  x.beginPath();
  for (const lp of [part.outer, ...part.holes]) { const pts = flattenLoop(lp, Math.max(0.2, 0.5 / sc)); pts.forEach((p, i) => { const X = ox + p[0] * sc, Y = oy - p[1] * sc; i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.closePath(); }
  x.fillStyle = color; x.fill('evenodd'); x.lineWidth = 1; x.strokeStyle = cssv('--ink-2'); x.stroke();
}

/* ---------- tabs ---------- */
$$('.tabs button').forEach(b => b.addEventListener('click', () => {
  $$('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  ['parts', 'stock', 'settings'].forEach(t => $('#tab-' + t).hidden = t !== b.dataset.tab);
}));

/* ---------- parts tab ---------- */
function renderParts() {
  const el = $('#partList'), dark = isDark();
  $('#cntParts').textContent = S.parts.reduce((a, p) => a + (+p.qty || 0), 0) || '';
  if (!S.parts.length) { el.innerHTML = '<div class="emptyp">Парт алга. <b>DXF нэмэх</b> эсвэл <b>Хэлбэр нэмэх</b> товчоор эхэлнэ үү.</div>'; return; }
  el.innerHTML = S.parts.map((p, i) => {
    const inf = partInfo(p), m = matOf(p.mat), kg = inf.area * p.thk * m.rho / 1e6;
    return `<div class="pitem" data-id="${p.id}">
      <canvas class="thumb" data-i="${i}"></canvas>
      <div style="min-width:0">
        <input class="pname" data-f="name" value="${esc(p.name)}" aria-label="Партын нэр">
        <div class="pmeta mono">${nf(inf.w, 1)} × ${nf(inf.h, 1)} · ${p.holes.length} нүх · ${nf(kg, 2)} кг${p.bends && p.bends.length ? ` · ${p.bends.length} нугалаа` : ''}</div>
        <div class="prow">
          <select data-f="mat" aria-label="Материал">${matOptions(p.mat)}</select>
          <span class="nowrap"><input class="pthk" data-f="thk" type="number" min="0.1" step="0.1" value="${p.thk}" aria-label="Зузаан, мм">мм</span>
          <button class="tog${p.rot ? ' on' : ''}" data-t="rot" title="Эргүүлэхийг зөвшөөрөх">↻ Эргүүлэх</button>
          <button class="tog${p.prio ? ' on' : ''}" data-t="prio" title="Эхэлж өрөх">Эхэнд</button>${p.bends && p.bends.length ? '<button class="tog" data-t="bend" title="Bending модуль руу">Bending руу</button>' : ''}
        </div>
      </div>
      <div class="pqty"><label>Тоо</label><input data-f="qty" type="number" min="0" step="1" value="${p.qty}" aria-label="Тоо ширхэг"></div>
      <button class="x" data-del aria-label="Устгах">×</button>
    </div>`;
  }).join('');
  $$('#partList .thumb').forEach(c => drawPartBox(c, S.parts[+c.dataset.i], partColor(+c.dataset.i, dark, 0.85)));
}
$('#partList').addEventListener('change', e => {
  const it = e.target.closest('.pitem'); if (!it) return; const p = S.parts.find(x => x.id === it.dataset.id); const f = e.target.dataset.f; if (!p || !f) return;
  if (f === 'qty') p.qty = Math.max(0, Math.round(+e.target.value || 0));
  else if (f === 'thk') p.thk = Math.max(0.1, +e.target.value || p.thk);
  else p[f] = e.target.value;
  save(); renderParts();
});
$('#partList').addEventListener('click', e => {
  const it = e.target.closest('.pitem'); if (!it) return; const p = S.parts.find(x => x.id === it.dataset.id); if (!p) return;
  if (e.target.closest('[data-del]')) { S.parts = S.parts.filter(x => x !== p); save(); renderParts(); return; }
  const t = e.target.closest('[data-t]'); if (t) { if (t.dataset.t === 'bend') { sendPartToBend(p.id); return; } if (t.dataset.t === 'rot') p.rot = !p.rot; else p.prio = p.prio ? 0 : 1; save(); renderParts(); }
});
$('#btnClear').addEventListener('click', e => {
  const b = e.currentTarget;
  if (b.dataset.arm) { S.parts = []; save(); renderParts(); b.textContent = 'Бүгдийг устгах'; delete b.dataset.arm; return; }
  b.dataset.arm = 1; b.textContent = 'Дахин дарж баталгаажуулна'; setTimeout(() => { if (b.dataset.arm) { delete b.dataset.arm; b.textContent = 'Бүгдийг устгах'; } }, 3000);
});
function renderDefaults() { $('#defMat').innerHTML = matOptions(S.defMat); $('#defThk').value = S.defThk; }
$('#defMat').addEventListener('change', e => { S.defMat = e.target.value; save(); });
$('#defThk').addEventListener('change', e => { S.defThk = Math.max(0.1, +e.target.value || 6); save(); });

/* ---------- DXF import ---------- */
async function importFiles(files) {
  let added = 0; const msgs = [];
  for (const f of files) {
    try {
      const r = await importAnyFile(f);
      if (!r.parts.length) { msgs.push(`${f.name}: хаалттай контур олдсонгүй`); continue; }
      for (const p of r.parts) { S.parts.push({ id: uid(), name: p.name, qty: p.qty, mat: S.defMat, thk: S.defThk, rot: true, mir: false, prio: 0, outer: p.outer, holes: p.holes, ...(p.bends ? { bends: p.bends } : {}) }); added++; }
      if (r.open) msgs.push(`${f.name}: ${r.open} нээлттэй шугам (гулзайлтын шугам, текст г.м.) алгассан`);
    } catch (err) { msgs.push(`${f.name}: ${err && err.message ? err.message : 'уншиж чадсангүй'}`); }
  }
  save(); renderParts();
  toast((added ? `${added} парт нэмэгдлээ` : 'Парт нэмэгдсэнгүй') + (msgs.length ? ' · ' + msgs.join(' · ') : ''), msgs.length ? 9000 : 2600);
}
$('#dxfIn').addEventListener('change', e => { importFiles([...e.target.files]); e.target.value = ''; });
let dragN = 0;
window.addEventListener('dragenter', e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { dragN++; $('#drop').hidden = false; e.preventDefault(); } });
window.addEventListener('dragover', e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault(); });
window.addEventListener('dragleave', () => { dragN = Math.max(0, dragN - 1); if (!dragN) $('#drop').hidden = true; });
window.addEventListener('drop', e => { e.preventDefault(); dragN = 0; $('#drop').hidden = true; const fs = [...(e.dataTransfer?.files || [])]; if (fs.length) importFiles(fs); });

/* ---------- shape dialog ---------- */
let shCur = null, shType = 'rect';
function shapeDefaults(k) { const v = {}; SHAPES[k].f.forEach(f => v[f[0]] = f[2]); return v; }
function openShape() {
  const dark = isDark();
  $('#shPick').innerHTML = SHAPE_CATS.map(([c, l]) => `<h4>${l}</h4><div class="shgrid">${Object.entries(SHAPES).filter(([, v]) => v.cat === c).map(([k, v]) => `<button class="shcard${k === shType ? ' on' : ''}" data-k="${k}"><canvas data-k="${k}"></canvas>${v.label}</button>`).join('')}</div>`).join('');
  $$('#shPick canvas').forEach(c => { try { const g = SHAPES[c.dataset.k].build(shapeDefaults(c.dataset.k)); drawPartBox(c, normalizePart(g.outer, g.holes), partColor(3, dark, 0.85)); } catch (e) { } });
  buildShapeFields(); $('#shQty').value = 1; $('#modal').hidden = false;
  const on = $('#shPick .shcard.on'); if (on) { on.scrollIntoView({ block: 'nearest' }); on.focus(); }
}
function buildShapeFields() {
  const t = SHAPES[shType];
  $('#shLabel').textContent = t.label;
  $('#shFields').innerHTML = t.f.map(([k, l, d]) => `<label class="fld">${l}<input type="number" step="any" data-k="${k}" value="${d}"></label>`).join('');
  $('#shName').value = t.label; updateShape();
}
$('#shPick').addEventListener('click', e => { const b = e.target.closest('.shcard'); if (!b) return; shType = b.dataset.k; $$('#shPick .shcard').forEach(x => x.classList.toggle('on', x === b)); buildShapeFields(); });
function updateShape() {
  const t = SHAPES[shType], vals = {};
  $$('#shFields input').forEach(i => vals[i.dataset.k] = +i.value);
  try {
    for (const [kk] of t.f) if (!isFinite(vals[kk]) || vals[kk] < 0) throw new Error('Утга буруу байна');
    const g = t.build(vals), n = normalizePart(g.outer, g.holes), inf = partInfo({ outer: n.outer, holes: n.holes });
    if (inf.w <= 0 || inf.h <= 0) throw new Error('Хэмжээ 0 байна');
    shCur = n; $('#shErr').textContent = '';
    drawPartBox($('#shPrev'), n, partColor(S.parts.length, isDark(), 0.85));
    $('#shDim').textContent = `${nf(inf.w, 1)} × ${nf(inf.h, 1)} мм · ${n.holes.length} нүх · зүсэлт ${nf(inf.cut / 1000, 2)} м`;
  } catch (err) { shCur = null; $('#shErr').textContent = err.message; drawPartBox($('#shPrev'), null); $('#shDim').textContent = ''; }
}
$('#btnShape').addEventListener('click', openShape);
$('#shFields').addEventListener('input', updateShape);
const closeDlg = () => { $('#modal').hidden = true; };
$('#dlgX').addEventListener('click', closeDlg); $('#dlgCancel').addEventListener('click', closeDlg);
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeDlg(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#modal').hidden) closeDlg(); });
$('#dlgOk').addEventListener('click', () => {
  if (!shCur) return;
  const n = normalizePart(shCur.outer, shCur.holes);
  S.parts.push({ id: uid(), name: $('#shName').value.trim() || 'Парт', qty: Math.max(1, Math.round(+$('#shQty').value || 1)), mat: S.defMat, thk: S.defThk, rot: true, mir: false, prio: 0, outer: n.outer, holes: n.holes });
  save(); renderParts(); closeDlg(); toast('Парт нэмэгдлээ');
});

/* ---------- stock tab ---------- */
function renderStock() {
  $('#stdList').innerHTML = S.std.map((s, i) => `<div class="srow" data-i="${i}"><input type="checkbox" ${s.on ? 'checked' : ''} aria-label="Идэвхтэй"><span class="mono">${nf(s.L)} × ${nf(s.W)}</span><span class="muted" style="font-size:12px">${nf(s.L * s.W / 1e6, 2)} м²</span><button class="x" aria-label="Устгах">×</button></div>`).join('');
  $('#stdFixed').innerHTML = S.std.map((s, i) => `<option value="${i}"${i === S.fixedIdx ? ' selected' : ''}>${s.L}×${s.W}</option>`).join('');
  $$('input[name=smode]').forEach(r => r.checked = r.value === S.sheetMode);
  $('#useRem').checked = S.useRem;
  $('#remMat').innerHTML = matOptions(S.defMat); $('#remThk').value = S.defThk;
  $('#remList').innerHTML = S.remnants.length ? S.remnants.map(r => `<div class="srow" data-id="${r.id}" style="grid-template-columns:minmax(0,1fr) auto 24px"><span><b class="mono">${nf(r.L)} × ${nf(r.W)}</b> <span class="muted">· ${esc(r.mat)} · ${r.thk} мм</span>${r.shape ? ' <span class="pill rem">хэлбэртэй</span>' : ''}</span><span class="mono">${r.qty} ш</span><button class="x" aria-label="Устгах">×</button></div>`).join('') : '<div class="note">Бүртгэлтэй үлдэгдэл алга.</div>';
}
$('#stdList').addEventListener('click', e => { const row = e.target.closest('.srow'); if (!row) return; const i = +row.dataset.i; if (e.target.matches('.x')) { S.std.splice(i, 1); if (S.fixedIdx >= S.std.length) S.fixedIdx = 0; } else if (e.target.matches('input')) S.std[i].on = e.target.checked; else return; save(); renderStock(); });
$('#stdAdd').addEventListener('click', () => { const L = +$('#stdL').value, W = +$('#stdW').value; if (!(L > 0 && W > 0)) { toast('Урт, өргөнийг оруулна уу'); return; } S.std.push({ L: Math.max(L, W), W: Math.min(L, W), on: true }); $('#stdL').value = $('#stdW').value = ''; save(); renderStock(); });
$$('input[name=smode]').forEach(r => r.addEventListener('change', () => { S.sheetMode = r.value; save(); }));
$('#stdFixed').addEventListener('change', e => { S.fixedIdx = +e.target.value; S.sheetMode = 'fixed'; save(); renderStock(); });
$('#useRem').addEventListener('change', e => { S.useRem = e.target.checked; save(); });
$('#remDxf').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const t = +$('#remThk').value, q = Math.max(1, Math.round(+$('#remQ').value || 1));
  if (!(t > 0)) { toast('Үлдэгдлийн зузааныг оруулна уу'); return; }
  try {
    const r = await importAnyFile(f);
    const loops = r.parts.flatMap(p => [p.outer, ...p.holes].map((v, i) => ({ v, a: Math.abs(loopArea(v)) }))).sort((a, b) => b.a - a.a);
    if (!loops.length) throw 0;
    const outer = loops[0].v, fo = flattenLoop(outer, 0.1);
    const holes = loops.slice(1).filter(l => { const p = flattenLoop(l.v, 0.5)[0]; return pointInPoly(p[0], p[1], fo); }).map(l => l.v);
    const n = normalizePart(outer, holes), inf = partInfo({ outer: n.outer, holes: n.holes });
    S.remnants.push({ id: uid(), mat: $('#remMat').value, thk: t, L: Math.round(inf.w * 10) / 10, W: Math.round(inf.h * 10) / 10, qty: q, shape: { outer: n.outer, holes: n.holes } });
    save(); renderStock(); toast(`Хэлбэртэй үлдэгдэл нэмэгдлээ · ${nf(inf.w)}×${nf(inf.h)} мм, ${holes.length} гэмтэлтэй хэсэг`);
  } catch (err) { toast(err && err.message ? err.message : 'Файлаас хаалттай контур олдсонгүй', 7000); }
});
$('#remList').addEventListener('click', e => { if (!e.target.matches('.x')) return; const id = e.target.closest('.srow').dataset.id; S.remnants = S.remnants.filter(r => r.id !== id); save(); renderStock(); });
$('#remAdd').addEventListener('click', () => { const L = +$('#remL').value, W = +$('#remW').value, q = Math.max(1, Math.round(+$('#remQ').value || 1)), t = +$('#remThk').value; if (!(L > 0 && W > 0 && t > 0)) { toast('Үлдэгдлийн хэмжээ, зузааныг оруулна уу'); return; } S.remnants.push({ id: uid(), mat: $('#remMat').value, thk: t, L: Math.max(L, W), W: Math.min(L, W), qty: q }); $('#remL').value = $('#remW').value = ''; save(); renderStock(); });

/* ---------- settings tab ---------- */
const SET = [['s_gap', 'gap', 'n'], ['s_margin', 'margin', 'n'], ['s_rot', 'rot', 'n'], ['s_prec', 'prec', 's'], ['s_opt', 'opt', 'n'], ['s_sag', 'sag', 'n'], ['s_keep', 'keep', 'b'], ['s_pip', 'pip', 'b'], ['s_mir', 'mir', 'b'], ['s_cl', 'cl', 'b'], ['s_lead', 'leadIn', 'n'], ['s_rapid', 'rapid', 'n'], ['s_trim', 'trim', 'b'], ['s_trimScope', 'trimScope', 's'], ['s_trimStep', 'trimStep', 'n'], ['s_minRem', 'minRem', 'n'], ['s_dxfSheet', 'dxfSheet', 'n'], ['s_dxfBend', 'dxfBend', 'n']];
function renderSettings() {
  for (const [id, k, t] of SET) { const el = $('#' + id); if (t === 'b') el.checked = !!S.s[k]; else el.value = S.s[k]; }
  $('#matBody').innerHTML = S.materials.map((m, i) => `<tr data-i="${i}"><td><input data-k="name" value="${esc(m.name)}" style="font-family:var(--f-ui)"></td><td><input data-k="rho" type="number" step="0.01" value="${m.rho}"></td><td><input data-k="price" type="number" step="10" value="${m.price}"></td><td><button class="x" aria-label="Устгах">×</button></td></tr>`).join('');
  $('#spdBody').innerHTML = S.cut.speeds.map((r, i) => `<tr data-i="${i}"><td><input data-k="0" type="number" step="0.5" value="${r[0]}"></td><td><input data-k="1" type="number" step="50" value="${r[1]}"></td><td><input data-k="2" type="number" step="0.1" value="${r[2]}"></td><td><button class="x" aria-label="Устгах">×</button></td></tr>`).join('');
  $('#c_cut').value = S.cut.cutPrice; $('#c_pierce').value = S.cut.piercePrice;
  $('#jobName').value = S.jobName;
}
for (const [id, k, t] of SET) $('#' + id).addEventListener('change', e => { S.s[k] = t === 'b' ? e.target.checked : t === 'n' ? Math.max(0, +e.target.value || 0) : e.target.value; save(); if (R && ['trim', 'trimScope', 'trimStep', 'minRem', 'leadIn', 'rapid'].includes(k)) { recomputeResult(); } });
$('#matBody').addEventListener('change', e => { const tr = e.target.closest('tr'); const m = S.materials[+tr.dataset.i]; const k = e.target.dataset.k; if (k === 'name') { const old = m.name, nw = e.target.value.trim() || old; S.parts.forEach(p => { if (p.mat === old) p.mat = nw; }); S.remnants.forEach(r => { if (r.mat === old) r.mat = nw; }); if (S.defMat === old) S.defMat = nw; m.name = nw; } else m[k] = Math.max(0, +e.target.value || 0); save(); renderParts(); renderDefaults(); if (R) recomputeResult(); });
$('#matBody').addEventListener('click', e => { if (!e.target.matches('.x')) return; if (S.materials.length <= 1) return; S.materials.splice(+e.target.closest('tr').dataset.i, 1); save(); renderSettings(); renderDefaults(); renderParts(); });
$('#matAdd').addEventListener('click', () => { S.materials.push({ name: 'Шинэ материал ' + (S.materials.length + 1), rho: 7.85, price: 0 }); save(); renderSettings(); renderDefaults(); });
$('#spdBody').addEventListener('change', e => { const tr = e.target.closest('tr'); S.cut.speeds[+tr.dataset.i][+e.target.dataset.k] = Math.max(0, +e.target.value || 0); save(); if (R) recomputeResult(); });
$('#spdBody').addEventListener('click', e => { if (!e.target.matches('.x')) return; S.cut.speeds.splice(+e.target.closest('tr').dataset.i, 1); save(); renderSettings(); });
$('#spdAdd').addEventListener('click', () => { S.cut.speeds.push([25, 400, 8]); save(); renderSettings(); });
$('#c_cut').addEventListener('change', e => { S.cut.cutPrice = Math.max(0, +e.target.value || 0); save(); if (R) recomputeResult(); });
$('#c_pierce').addEventListener('change', e => { S.cut.piercePrice = Math.max(0, +e.target.value || 0); save(); if (R) recomputeResult(); });
$('#jobName').addEventListener('change', e => { S.jobName = e.target.value.trim() || 'Ажил'; save(); });

/* ---------- nesting run ---------- */
let workers = [];
function anglesFor(p) {
  const st = +S.s.rot; if (!p.rot || !st) return [0];
  const a = []; for (let x = 0; x < 360 - 1e-6; x += st) a.push(Math.round(x * 1000) / 1000); return a;
}
function stockStd() {
  let std = S.std.filter(s => s.on).map(s => ({ L: s.L, W: s.W }));
  if (S.sheetMode === 'fixed' && S.std[S.fixedIdx]) std = [{ L: S.std[S.fixedIdx].L, W: S.std[S.fixedIdx].W }];
  return std;
}
/* common-line: arrange a rectangular part into full columns with shared edges */
function planBlocks(p, inf, sizes) {
  if (!sizes.length) return null;
  const m = +S.s.margin;
  const Wmin = Math.min(...sizes.map(z => z.W)) - 2 * m, Lmin = Math.min(...sizes.map(z => z.L)) - 2 * m;
  let best = null;
  for (const o of (p.rot && +S.s.rot ? [0, 90] : [0])) {
    const cw = o ? inf.h : inf.w, ch = o ? inf.w : inf.h;
    const r = Math.min(p.qty, Math.floor((Wmin + 1e-6) / ch)), cmax = Math.floor((Lmin + 1e-6) / cw);
    if (r < 1 || cmax < 1) continue;
    const fill = r * ch / Wmin;
    if (!best || fill > best.fill + 1e-9) best = { o, cw, ch, r, cmax, fill };
  }
  if (!best) return null;
  const cols = Math.floor(p.qty / best.r);
  if (cols * best.r < 2) return null;
  const blocks = []; let left = cols;
  while (left > 0) { const c = Math.min(best.cmax, left); blocks.push(c); left -= c; }
  const corners = xformPts([[0, 0], [inf.w, 0], [inf.w, inf.h], [0, inf.h]], best.o, false, 0, 0);
  const bb = bboxPts(corners);
  return { ...best, blocks, rest: p.qty - cols * best.r, bx: bb.x0, by: bb.y0 };
}
function buildJob() {
  const groups = new Map(), snapshot = new Map(), blocks = new Map(), remShapes = new Map();
  const std = stockStd(), tol = Math.max(0.01, +S.s.sag || 0.05);
  S.parts.forEach((p, i) => {
    const inf = partInfo(p);
    snapshot.set(p.id, { id: p.id, idx: i, name: p.name, mat: p.mat, thk: p.thk, qty: p.qty, outer: p.outer, holes: p.holes, bends: p.bends || [], info: inf, flat: { outer: flattenLoop(p.outer, 0.05), holes: p.holes.map(h => flattenLoop(h, 0.05)) } });
    if (!(p.qty > 0)) return;
    const key = p.mat + '|' + p.thk;
    if (!groups.has(key)) groups.set(key, { key, mat: p.mat, thk: p.thk, label: `${p.mat} ${p.thk}мм`, types: [] });
    const G = groups.get(key);
    let qty = p.qty;
    if (S.s.cl && p.qty >= 4 && isRectPart(p) && !(p.bends && p.bends.length)) {
      const rems = S.remnants.filter(r => r.mat === p.mat && +r.thk === +p.thk && !r.shape);
      const plan = planBlocks(p, inf, std.length ? std : rems);
      if (plan) {
        const counts = {}; plan.blocks.forEach(c => counts[c] = (counts[c] || 0) + 1);
        for (const [c, n] of Object.entries(counts)) {
          const id = `B|${p.id}|${c}`, W = +c * plan.cw, H = plan.r * plan.ch;
          blocks.set(id, { partId: p.id, o: plan.o, cw: plan.cw, ch: plan.ch, r: plan.r, c: +c, bx: plan.bx, by: plan.by });
          G.types.push({ id, qty: n, prio: p.prio || 0, outer: [[0, 0], [W, 0], [W, H], [0, H]], holes: [], angles: [0], mirror: false, area: W * H, bw: W, bh: H });
        }
        qty = plan.rest;
      }
    }
    if (qty > 0) G.types.push({ id: p.id, qty, prio: p.prio || 0, outer: flattenLoop(p.outer, tol), holes: p.holes.map(h => flattenLoop(h, tol)), angles: anglesFor(p), mirror: !!S.s.mir, area: inf.area, bw: inf.w, bh: inf.h });
  });
  S.remnants.forEach(r => {
    if (!r.shape) return;
    const rings = [r.shape.outer, ...r.shape.holes];
    remShapes.set(r.id, { rings, flat: rings.map(v => flattenLoop(v, 0.1)), area: Math.abs(loopArea(r.shape.outer)) - r.shape.holes.reduce((a, h) => a + Math.abs(loopArea(h)), 0) });
  });
  const gs = [...groups.values()].filter(g => g.types.length).map(g => ({ ...g, stock: { std, rems: S.useRem ? S.remnants.filter(r => r.mat === g.mat && +r.thk === +g.thk && r.qty > 0).sort((a, b) => b.L * b.W - a.L * a.W).map(r => ({ id: r.id, L: r.L, W: r.W, qty: r.qty, shape: r.shape ? remShapes.get(r.id).flat : null })) : [] } }));
  return { job: { groups: gs, S: { gap: +S.s.gap, margin: +S.s.margin, prec: S.s.prec, pip: !!S.s.pip, keep: !!S.s.keep, trim: !!S.s.trim, trimScope: S.s.trimScope, optTime: Math.max(0, +S.s.opt), sagTol: tol } }, snapshot, blocks, remShapes, meta: gs.map(g => ({ key: g.key, mat: g.mat, thk: g.thk, label: g.label })) };
}
function stopWorkers() { workers.forEach(w => w.terminate()); workers = []; }
function runNesting(quick) {
  const built = buildJob();
  if (!built.job.groups.length) { toast('Өрөх парт алга — тоо ширхэгийг оруулна уу'); return; }
  if (!built.job.groups.every(g => g.stock.std.length || g.stock.rems.length)) { toast('Лист сонгогдоогүй байна — «Лист» хэсэгт хэмжээ идэвхжүүлнэ үү'); return; }
  if (quick) built.job.S.optTime = Math.min(built.job.S.optTime, 2);
  stopWorkers();
  const nw = Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1));
  const url = URL.createObjectURL(new Blob([$('#nestWorker').textContent], { type: 'text/javascript' }));
  const t0 = performance.now(), results = []; let doneN = 0, lastErr = null;
  $('#btnRun').disabled = true; $('#btnStop').hidden = false; $('#progBar').style.width = '2%'; $('#progMsg').textContent = `Эхэлж байна… (${nw} урсгал)`;
  const finishOne = () => {
    if (++doneN < nw) return;
    finishRun(); stopWorkers(); URL.revokeObjectURL(url);
    if (!results.length) { $('#progMsg').textContent = 'Алдаа: ' + (lastErr || 'тооцоолол зогслоо'); return; }
    const groups = built.job.groups.map((g, gi) => results.map(r => r[gi]).sort((a, b) => a.score - b.score)[0]);
    R = { raw: groups, parts: built.snapshot, blocks: built.blocks, remShapes: built.remShapes, meta: built.meta, opt: { gap: built.job.S.gap, margin: built.job.S.margin }, time: (performance.now() - t0) / 1000, date: new Date(), undo: [] };
    explodeBlocks();
    V.g = 0; V.l = 0; V.k = 1; V.px = V.py = 0; V.sel = null;
    recomputeResult();
    const runs = results.reduce((a, r) => a + r.reduce((b, g) => b + g.runs, 0), 0);
    $('#progMsg').textContent = `Дууслаа · ${nf(R.time, 1)} сек · ${runs} хувилбар туршсан`;
  };
  for (let w = 0; w < nw; w++) {
    const wk = new Worker(url); workers.push(wk);
    wk.onmessage = e => {
      const m = e.data;
      if (m.type === 'progress') { $('#progBar').style.width = Math.round(Math.min(1, m.frac) * 100) + '%'; $('#progMsg').textContent = m.msg; return; }
      if (m.type === 'error') lastErr = m.msg; else results.push(m.groups);
      finishOne();
    };
    wk.onerror = e => { lastErr = e.message || 'тооцоолол зогслоо'; finishOne(); };
    wk.postMessage({ job: built.job, wid: w, nw, seed: ((Date.now() & 0xffffff) * (w + 7) + w * 2654435761) >>> 0 });
  }
}
function explodeBlocks() {
  R.raw.forEach(g => {
    g.sheets.forEach(sh => {
      const pl = [], blocks = [];
      sh.pl.forEach(p => {
        const b = R.blocks.get(p.id);
        if (!b) { pl.push(p); return; }
        const key = uid();
        blocks.push({ key, partId: b.partId, r: b.r, c: b.c, cw: b.cw, ch: b.ch, x: p.tx, y: p.ty });
        for (let i = 0; i < b.c; i++) for (let j = 0; j < b.r; j++) pl.push({ id: b.partId, ang: b.o, mir: false, tx: p.tx + i * b.cw - b.bx, ty: p.ty + j * b.ch - b.by, blk: key });
      });
      sh.pl = pl; sh.blocks = blocks;
    });
    const un = {};
    for (const [id, n] of Object.entries(g.unplaced || {})) { const b = R.blocks.get(id); if (b) un[b.partId] = (un[b.partId] || 0) + n * b.r * b.c; else un[id] = (un[id] || 0) + n; }
    g.unplaced = un;
  });
}
function finishRun() { $('#btnRun').disabled = false; $('#btnStop').hidden = true; $('#progBar').style.width = '100%'; }
$('#btnRun').addEventListener('click', () => runNesting(false));
$('#btnStop').addEventListener('click', () => { stopWorkers(); finishRun(); $('#progBar').style.width = '0'; $('#progMsg').textContent = 'Зогсоосон'; });

/* ---------- cut order: holes first, nearest-next, lead-ins ---------- */
function cutPlan(s) {
  const LI = Math.max(0, +S.s.leadIn || 0), units = [];
  const blk = new Map((s.blocks || []).map(b => [b.key, { b, holes: [] }]));
  s.pl.forEach(pl => {
    const p = R.parts.get(pl.id);
    const holes = p.holes.map(h => orientLoop(xformLoop(h, pl.ang, pl.mir, pl.tx, pl.ty), false));
    if (pl.blk && blk.has(pl.blk)) { blk.get(pl.blk).holes.push(...holes); return; }
    const outer = orientLoop(xformLoop(p.outer, pl.ang, pl.mir, pl.tx, pl.ty), true);
    const flat = xformPts(p.flat.outer, pl.ang, pl.mir, pl.tx, pl.ty);
    units.push({ outer, holes, flat, bb: bboxPts(flat), deps: [] });
  });
  for (const { b, holes } of blk.values()) {
    const lines = [], W = b.c * b.cw, H = b.r * b.ch;
    for (let j = 0; j <= b.r; j++) lines.push([b.x, b.y + j * b.ch, b.x + W, b.y + j * b.ch]);
    for (let i = 0; i <= b.c; i++) lines.push([b.x + i * b.cw, b.y, b.x + i * b.cw, b.y + H]);
    units.push({ outer: null, holes, lines, bb: { x0: b.x, y0: b.y, x1: b.x + W, y1: b.y + H }, deps: [] });
  }
  for (const Q of units) for (const P of units) {
    if (P === Q || !P.outer || !Q.outer) continue;
    if (Q.bb.x0 >= P.bb.x0 && Q.bb.x1 <= P.bb.x1 && Q.bb.y0 >= P.bb.y0 && Q.bb.y1 <= P.bb.y1 && pointInPoly(Q.flat[0][0], Q.flat[0][1], P.flat)) P.deps.push(Q);
  }
  const seq = []; let pos = [0, 0], travel = 0, cut = 0;
  const nearV = vs => { let k = 0, d = Infinity; vs.forEach((v, i) => { const e = Math.hypot(v.x - pos[0], v.y - pos[1]); if (e < d) { d = e; k = i; } }); return [k, d]; };
  const emitLoop = (vs, layer) => {
    const lp = rotateLoop(vs, nearV(vs)[0]), st = lp[0];
    let lead = null;
    if (LI > 0 && lp.length > 1) {
      const a = lp[0], b = lp[1]; let cx = b.x - a.x, cy = b.y - a.y; const cl = Math.hypot(cx, cy) || 1; cx /= cl; cy /= cl;
      const th = 4 * Math.atan(a.b), c = Math.cos(-th / 2), sn = Math.sin(-th / 2), tx = cx * c - cy * sn, ty = cx * sn + cy * c;
      const bb = bboxPts(lp.map(v => [v.x, v.y])), Lr = Math.min(LI, 0.4 * Math.min(bb.x1 - bb.x0, bb.y1 - bb.y0));
      lead = [st.x + ty * Lr, st.y - tx * Lr];
    }
    const entry = lead || [st.x, st.y];
    travel += Math.hypot(entry[0] - pos[0], entry[1] - pos[1]);
    cut += loopLen(lp) + (lead ? Math.hypot(lead[0] - st.x, lead[1] - st.y) : 0);
    seq.push({ type: 'loop', loop: lp, layer, lead, entry });
    pos = [st.x, st.y];
  };
  const emitLine = ln => {
    const d1 = Math.hypot(ln[0] - pos[0], ln[1] - pos[1]), d2 = Math.hypot(ln[2] - pos[0], ln[3] - pos[1]);
    const l = d2 < d1 ? [ln[2], ln[3], ln[0], ln[1]] : ln;
    travel += Math.min(d1, d2); cut += Math.hypot(l[2] - l[0], l[3] - l[1]);
    seq.push({ type: 'line', line: l, layer: 'OUTER', entry: [l[0], l[1]] });
    pos = [l[2], l[3]];
  };
  const bbDist = bb => Math.hypot(Math.max(bb.x0 - pos[0], 0, pos[0] - bb.x1), Math.max(bb.y0 - pos[1], 0, pos[1] - bb.y1));
  const done = new Set();
  while (done.size < units.length) {
    let best = null, bd = Infinity;
    for (const u of units) { if (done.has(u) || u.deps.some(d => !done.has(d))) continue; const d = bbDist(u.bb); if (d < bd) { bd = d; best = u; } }
    if (!best) best = units.find(u => !done.has(u));
    done.add(best);
    const hs = best.holes.slice();
    while (hs.length) { let bi = 0, bdd = Infinity; hs.forEach((h, i) => { const d = nearV(h)[1]; if (d < bdd) { bdd = d; bi = i; } }); emitLoop(hs.splice(bi, 1)[0], 'INNER'); }
    if (best.lines) { const ls = best.lines.slice(); while (ls.length) { let bi = 0, bdd = Infinity; ls.forEach((l, i) => { const d = Math.min(Math.hypot(l[0] - pos[0], l[1] - pos[1]), Math.hypot(l[2] - pos[0], l[3] - pos[1])); if (d < bdd) { bdd = d; bi = i; } }); emitLine(ls.splice(bi, 1)[0]); } }
    if (best.outer) emitLoop(best.outer, 'OUTER');
  }
  return { seq, travel, cut };
}

/* ---------- result processing ---------- */
function recomputeResult() {
  if (!R) return;
  const st = S.s, step = Math.max(1, +st.trimStep || 1), rapid = Math.max(1000, +st.rapid || 20000);
  R.groups = R.raw.map((g, gi) => {
    const meta = R.meta.find(m => m.key === g.key) || R.meta[gi];
    const mat = matOf(meta.mat), thk = +meta.thk, sp = speedFor(thk);
    const sheets = g.sheets.map((raw, si) => {
      const s = { ...raw, raw, idx: si };
      let area = 0;
      for (const pl of s.pl) area += R.parts.get(pl.id).info.area;
      const shp = s.kind === 'rem' && s.remId ? R.remShapes.get(s.remId) : null;
      s.shapeInfo = shp || null;
      const plan = cutPlan(s);
      const isLast = si === g.sheets.length - 1;
      let right = 0; for (const pl of s.pl) { const p = R.parts.get(pl.id); const bb = bboxPts(xformPts(p.flat.outer, pl.ang, pl.mir, pl.tx, pl.ty)); if (bb.x1 > right) right = bb.x1; }
      const usedR = Math.min(s.L, Math.ceil((right + st.margin) / step) * step);
      const trimmed = !!st.trim && s.kind === 'std' && (st.trimScope === 'all' || isLast) && usedR < s.L - 1e-6;
      const cL = trimmed ? usedR : s.L, left = trimmed ? s.L - usedR : 0;
      const sheetArea = shp ? shp.area : cL * s.W;
      return Object.assign(s, { area, plan, cut: plan.cut, pierce: plan.seq.length, travel: plan.travel, n: s.pl.length, trimmed, cL, left, remOk: trimmed && left >= st.minRem, util: area / sheetArea, sheetArea, kg: sheetArea * thk * mat.rho / 1e6, time: plan.cut / sp.v + plan.seq.length * sp.p / 60 + plan.travel / rapid });
    });
    const lays = [], bySig = new Map();
    sheets.forEach(s => {
      const sig = [s.L, s.W, s.kind, s.remId, s.trimmed, s.cL, ...s.pl.map(p => `${p.id}:${p.ang}:${p.mir ? 1 : 0}:${p.tx.toFixed(1)}:${p.ty.toFixed(1)}`).sort()].join('|');
      if (bySig.has(sig)) bySig.get(sig).sheets.push(s); else { const L = { sheet: s, sheets: [s] }; bySig.set(sig, L); lays.push(L); }
    });
    lays.forEach((l, i) => { l.no = i + 1; l.count = l.sheets.length; });
    const tot = sheets.reduce((a, s) => ({ area: a.area + s.area, cut: a.cut + s.cut, pierce: a.pierce + s.pierce, kg: a.kg + s.kg, sheetArea: a.sheetArea + s.sheetArea, time: a.time + s.time, travel: a.travel + s.travel, n: a.n + s.n }), { area: 0, cut: 0, pierce: 0, kg: 0, sheetArea: 0, time: 0, travel: 0, n: 0 });
    tot.partsKg = tot.area * thk * mat.rho / 1e6;
    tot.scrapKg = tot.kg - tot.partsKg;
    tot.util = tot.sheetArea ? tot.area / tot.sheetArea : 0;
    tot.matCost = tot.kg * mat.price;
    tot.cutCost = tot.cut / 1000 * S.cut.cutPrice + tot.pierce * S.cut.piercePrice;
    tot.cost = tot.matCost + tot.cutCost;
    const bySize = {}; sheets.forEach(s => { const k = (s.kind === 'rem' ? 'Үлдэгдэл ' : '') + `${s.L}×${s.W}`; bySize[k] = (bySize[k] || 0) + 1; });
    const placed = {}; sheets.forEach(s => s.pl.forEach(p => placed[p.id] = (placed[p.id] || 0) + 1));
    const clN = sheets.reduce((a, s) => a + (s.blocks || []).reduce((b, k) => b + k.r * k.c, 0), 0);
    return { key: g.key, mat: meta.mat, thk, label: meta.label, std: g.std, res: g.res, sheets, lays, tot, bySize, placed, clN, unplaced: g.unplaced || {}, matInfo: mat, raw: g };
  });
  if (V.g >= R.groups.length) V.g = 0;
  if (R.groups[V.g] && V.l >= R.groups[V.g].lays.length) V.l = 0;
  EX = null;
  renderResults();
}

/* ---------- results UI ---------- */
function curG() { return R && R.groups[V.g]; }
function curL() { const g = curG(); return g && g.lays[V.l]; }
function renderResults() {
  const g = curG();
  $('#groupChips').innerHTML = R && R.groups.length > 1 ? R.groups.map((x, i) => `<button class="chip${i === V.g ? ' on' : ''}" data-g="${i}">${esc(x.label)} <span class="mono">${x.sheets.length} лист</span></button>`).join('') : '';
  if (!g) {
    $('#summary').innerHTML = ''; $('#sheetStrip').innerHTML = ''; $('#rtable').innerHTML = ''; $('#warn').innerHTML = '';
    $('#vTitle').textContent = 'Лист'; $('#vEmpty').hidden = false;
    $('#vEmpty').innerHTML = 'Партуудаа нэмээд <b>Өрөх</b> товчийг дарна уу.';
    drawView(); return;
  }
  $('#vEmpty').hidden = true;
  const t = g.tot, un = Object.entries(g.unplaced).filter(([, n]) => n > 0);
  $('#warn').innerHTML = un.length ? `<div class="warnbox"><b>Багтаагүй:</b> ${un.map(([id, n]) => `${esc(R.parts.get(id)?.name)} — ${n} ш`).join(', ')}. Листийн хэмжээ партаас бага эсвэл захын зай хэт их байна.</div>` : '';
  const sizes = Object.entries(g.bySize).map(([k, n]) => `${k} ×${n}`).join(', ');
  const stats = [
    ['Лист', `${g.sheets.length}`, sizes],
    ['Ашиглалт', `${nf(t.util * 100, 1)}<small>%</small>`, `хаягдал ${nf(t.scrapKg, 1)} кг`],
    ['Зүсэх урт', `${nf(t.cut / 1000, 2)}<small>м</small>`, `${nf(t.n)} парт` + (g.clN ? ` · ${g.clN} хамтын шугамтай` : '')],
    ['Цоолт', `${nf(t.pierce)}`, `хоосон явалт ${nf(t.travel / 1000, 1)} м`],
    ['Материал', `${nf(t.kg, 1)}<small>кг</small>`, `партын жин ${nf(t.partsKg, 1)} кг`],
    ['Хугацаа', fmtTime(t.time), `${g.label}`],
    ['Өртөг', `${nf(t.cost / 1000, 0)}<small>мян₮</small>`, `материал + зүсэлт`]
  ];
  $('#summary').innerHTML = stats.map(s => `<div class="stat"><div class="k">${s[0]}</div><div class="v">${s[1]}</div><div class="s" title="${esc(s[2])}">${esc(s[2])}</div></div>`).join('');
  $('#sheetStrip').innerHTML = g.lays.map((l, i) => `<button class="chip${i === V.l ? ' on' : ''}" data-l="${i}"><b>${l.no}</b><span class="mono">${l.sheet.L}×${l.sheet.W}</span>${l.count > 1 ? `<span class="mono">×${l.count}</span>` : ''}${l.sheet.kind === 'rem' ? '<span class="pill rem">үлдэгдэл</span>' : ''}<span class="util" title="${nf(l.sheet.util * 100, 1)}%"><i style="width:${Math.min(100, l.sheet.util * 100)}%"></i></span></button>`).join('');
  const l = curL();
  $('#vTitle').innerHTML = l ? `Лист ${l.no}${l.count > 1 ? ` <span class="pill">×${l.count} ижил</span>` : ''}<span class="mono">${l.sheet.L} × ${l.sheet.W} мм · ${l.sheet.n} парт · ${nf(l.sheet.util * 100, 1)}%</span>` : 'Лист';
  renderTable(); drawView();
}
$('#groupChips').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; V.g = +b.dataset.g; V.l = 0; V.k = 1; V.px = V.py = 0; renderResults(); });
$('#sheetStrip').addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (!b) return; V.l = +b.dataset.l; V.k = 1; V.px = V.py = 0; renderResults(); });
$('#vPrev').addEventListener('click', () => { const g = curG(); if (!g) return; V.l = (V.l - 1 + g.lays.length) % g.lays.length; V.k = 1; V.px = V.py = 0; renderResults(); });
$('#vNext').addEventListener('click', () => { const g = curG(); if (!g) return; V.l = (V.l + 1) % g.lays.length; V.k = 1; V.px = V.py = 0; renderResults(); });
$('#vFit').addEventListener('click', () => { V.k = 1; V.px = V.py = 0; drawView(); });
$('#vLabels').addEventListener('click', e => { V.labels = !V.labels; e.currentTarget.classList.toggle('on', V.labels); drawView(); });
$$('.rtabs button').forEach(b => b.addEventListener('click', () => { V.rtab = b.dataset.r; $$('.rtabs button').forEach(x => x.classList.toggle('on', x === b)); renderTable(); }));

function renderTable() {
  const g = curG(), el = $('#rtable');
  if (!g) { el.innerHTML = ''; return; }
  if (V.rtab === 'quote') { renderQuote(el); return; }
  const dark = isDark();
  if (V.rtab === 'sheets') {
    el.innerHTML = `<div class="tblwrap"><table class="dt"><thead><tr><th>№</th><th>Хэмжээ, мм</th><th>Төрөл</th><th class="r">Давталт</th><th class="r">Парт</th><th class="r">Ашиглалт</th><th class="r">Зарцуулах урт</th><th class="r">Зүсэлт, м</th><th class="r">Цоолт</th><th class="r">Хоосон явалт, м</th><th class="r">Хугацаа</th><th class="r">Жин, кг</th></tr></thead><tbody>${g.lays.map(l => { const s = l.sheet; return `<tr><td><b>${l.no}</b></td><td class="num">${s.L} × ${s.W}</td><td>${s.kind === 'rem' ? `<span class="pill rem">${s.shapeInfo ? 'хэлбэртэй ' : ''}үлдэгдэл</span>` : '<span class="pill">стандарт</span>'}${(s.blocks || []).length ? ' <span class="pill ok">хамтын шугам</span>' : ''}${s.trimmed ? ' <span class="pill ok">тайрна</span>' : ''}</td><td class="r num">×${l.count}</td><td class="r num">${s.n}</td><td class="r num">${nf(s.util * 100, 1)}%</td><td class="r num">${nf(s.cL)}${s.trimmed ? ` <span class="muted">/ ${nf(s.L)}</span>` : ''}</td><td class="r num">${nf(s.cut / 1000, 2)}</td><td class="r num">${s.pierce}</td><td class="r num">${nf(s.travel / 1000, 1)}</td><td class="r num">${fmtTime(s.time)}</td><td class="r num">${nf(s.kg, 1)}</td></tr>`; }).join('')}
      <tr class="tot"><td colspan="3">Нийт</td><td class="r num">${g.sheets.length}</td><td class="r num">${g.tot.n}</td><td class="r num">${nf(g.tot.util * 100, 1)}%</td><td></td><td class="r num">${nf(g.tot.cut / 1000, 2)}</td><td class="r num">${g.tot.pierce}</td><td class="r num">${nf(g.tot.travel / 1000, 1)}</td><td class="r num">${fmtTime(g.tot.time)}</td><td class="r num">${nf(g.tot.kg, 1)}</td></tr></tbody></table></div>
      <p class="note">Ижил байрлалтай листүүдийг нэгтгэсэн (×N) — нэг DXF-ээр N удаа зүснэ. Хугацаанд зүсэлт, цоолт, хоосон явалт орсон. Эхний өрөлт ${nf(g.res, 2)} мм/нүд растераар, дараа нь жинхэнэ геометрээр шахсан.</p>`;
  } else if (V.rtab === 'parts') {
    const ids = [...new Set(g.sheets.flatMap(s => s.pl.map(p => p.id)).concat(Object.keys(g.unplaced)))];
    const rows = [...R.parts.values()].filter(p => ids.includes(p.id) || (p.mat + '|' + p.thk) === g.key);
    el.innerHTML = `<div class="tblwrap"><table class="dt"><thead><tr><th>#</th><th>Нэр</th><th class="r">Хэмжээ, мм</th><th class="r">Захиалга</th><th class="r">Өрсөн</th><th class="r">Талбай 1ш, м²</th><th class="r">Жин 1ш, кг</th><th class="r">Зүсэлт 1ш, м</th><th class="r">Нийт жин, кг</th><th class="r">Нийт зүсэлт, м</th></tr></thead><tbody>${rows.map(p => { const pl = g.placed[p.id] || 0, kg = p.info.area * g.thk * g.matInfo.rho / 1e6; return `<tr><td class="num">${p.idx + 1}</td><td><span class="sw" style="background:${partColor(p.idx, dark)}"></span>${esc(p.name)}</td><td class="r num">${nf(p.info.w, 1)} × ${nf(p.info.h, 1)}</td><td class="r num">${p.qty}</td><td class="r num">${pl === p.qty ? pl : `<span class="pill bad">${pl}</span>`}</td><td class="r num">${nf(p.info.area / 1e6, 4)}</td><td class="r num">${nf(kg, 2)}</td><td class="r num">${nf(p.info.cut / 1000, 3)}</td><td class="r num">${nf(kg * pl, 1)}</td><td class="r num">${nf(p.info.cut * pl / 1000, 2)}</td></tr>`; }).join('')}</tbody></table></div>`;
  } else {
    const used = {}; g.sheets.filter(s => s.kind === 'rem').forEach(s => used[s.remId] = (used[s.remId] || 0) + 1);
    const usedRows = Object.entries(used).map(([id, n]) => { const r = S.remnants.find(x => x.id === id); return r ? `<tr><td>Ашигласан</td><td class="num">${r.L} × ${r.W}</td><td>${esc(r.mat)} ${r.thk}мм</td><td class="r num">−${n}</td></tr>` : ''; }).join('');
    const nw = g.sheets.filter(s => s.remOk);
    const newRows = nw.map(s => `<tr><td>Шинэ (лист ${g.lays.find(l => l.sheets.includes(s))?.no})</td><td class="num">${nf(s.left)} × ${s.W}</td><td>${esc(g.mat)} ${g.thk}мм</td><td class="r num">+1</td></tr>`).join('');
    el.innerHTML = (usedRows || newRows) ? `<div class="tblwrap"><table class="dt"><thead><tr><th>Төлөв</th><th>Хэмжээ, мм</th><th>Материал</th><th class="r">Тоо</th></tr></thead><tbody>${usedRows}${newRows}</tbody></table></div>
      <div class="addrow"><button class="btn primary sm" id="remApply">Үлдэгдлийн бүртгэлд тусгах</button><span class="note">Ашигласныг хасаж, шинээр гарсныг бүртгэлд нэмнэ.</span></div>`
      : `<p class="note">Энэ бүлэгт үлдэгдэл ашиглаагүй, шинэ үлдэгдэл гараагүй. Тайралт тохиргооноос хамаарна (доод урт ${S.s.minRem} мм).</p>`;
    const b = $('#remApply'); if (b) b.addEventListener('click', () => {
      for (const [id, n] of Object.entries(used)) { const r = S.remnants.find(x => x.id === id); if (r) r.qty = Math.max(0, r.qty - n); }
      S.remnants = S.remnants.filter(r => r.qty > 0);
      nw.forEach(s => S.remnants.push({ id: uid(), mat: g.mat, thk: g.thk, L: Math.max(s.left, s.W), W: Math.min(s.left, s.W), qty: 1 }));
      save(); renderStock(); b.disabled = true; b.textContent = 'Бүртгэлд тусгасан'; toast('Үлдэгдлийн бүртгэл шинэчлэгдлээ');
    });
  }
}

/* ---------- sheet drawing ---------- */
function layPaths(l) {
  if (l._paths) return l._paths;
  return l._paths = l.sheet.pl.map((pl, i) => {
    const p = R.parts.get(pl.id);
    const outer = xformPts(p.flat.outer, pl.ang, pl.mir, pl.tx, pl.ty);
    const bl = (p.bends || []).map(b => { const q = xformPts([[b.x1, b.y1], [b.x2, b.y2]], pl.ang, pl.mir, pl.tx, pl.ty); return { a: q[0], b: q[1], up: b.up }; });
    return { i, pl, p, outer, holes: p.flat.holes.map(h => xformPts(h, pl.ang, pl.mir, pl.tx, pl.ty)), bb: bboxPts(outer), bl };
  });
}
function palette(dark, print) {
  if (print) return { bg: '#ffffff', sheet: '#e8ecf0', edge: '#55626f', margin: '#9aa5b1', stroke: '#2c3640', label: '#10161c', labelBg: 'rgba(255,255,255,.85)', trim: '#cf4a0c', left: 'rgba(207,74,12,.10)', path: '#cf4a0c', bad: '#c43131', dark: false };
  return { bg: cssv('--view'), sheet: cssv('--sheet'), edge: cssv('--sheet-edge'), margin: cssv('--ink-3'), stroke: dark ? 'rgba(10,14,20,.85)' : 'rgba(20,28,36,.75)', label: cssv('--ink'), labelBg: dark ? 'rgba(22,29,37,.8)' : 'rgba(255,255,255,.8)', trim: cssv('--accent'), left: dark ? 'rgba(255,123,58,.12)' : 'rgba(207,74,12,.10)', path: cssv('--accent'), bad: cssv('--bad'), dark };
}
function drawLayout(x, l, T, pal, opt = {}) {
  const k = opt.lw || 1;
  const s = l.sheet, X = v => T.ox + v * T.sc, Y = v => T.oy - v * T.sc;
  const ring = (r, close = true) => { r.forEach((p, i) => { const a = X(p[0]), b = Y(p[1]); i ? x.lineTo(a, b) : x.moveTo(a, b); }); if (close) x.closePath(); };
  if (s.shapeInfo) {
    x.beginPath(); s.shapeInfo.flat.forEach(r => ring(r)); x.fillStyle = pal.sheet; x.fill('evenodd');
    x.strokeStyle = pal.edge; x.lineWidth = 1.2 * k; x.stroke();
    x.setLineDash([4 * k, 4 * k]); x.strokeStyle = pal.margin; x.lineWidth = 0.6 * k; x.strokeRect(X(0), Y(s.W), s.L * T.sc, s.W * T.sc); x.setLineDash([]);
  } else {
    x.fillStyle = pal.sheet; x.fillRect(X(0), Y(s.W), s.L * T.sc, s.W * T.sc);
    if (s.trimmed) {
      x.fillStyle = pal.left; x.fillRect(X(s.cL), Y(s.W), (s.L - s.cL) * T.sc, s.W * T.sc);
      x.save(); x.beginPath(); x.rect(X(s.cL), Y(s.W), (s.L - s.cL) * T.sc, s.W * T.sc); x.clip();
      x.strokeStyle = pal.trim; x.globalAlpha = 0.25; x.lineWidth = 1 * k;
      const step = 14 * k; for (let q = X(s.cL) - s.W * T.sc; q < X(s.L); q += step) { x.beginPath(); x.moveTo(q, Y(0)); x.lineTo(q + s.W * T.sc, Y(s.W)); x.stroke(); }
      x.restore();
    }
    x.strokeStyle = pal.edge; x.lineWidth = 1.2 * k; x.strokeRect(X(0), Y(s.W), s.L * T.sc, s.W * T.sc);
    const m = +S.s.margin;
    if (m > 0) { x.setLineDash([4 * k, 4 * k]); x.strokeStyle = pal.margin; x.lineWidth = 0.8 * k; x.strokeRect(X(m), Y(s.W - m), (s.L - 2 * m) * T.sc, (s.W - 2 * m) * T.sc); x.setLineDash([]); }
  }
  const paths = layPaths(l), mv = opt.move;
  for (const P of paths) {
    const moving = mv && mv.set.has(P.i);
    if (moving) { x.save(); x.translate(mv.dx * T.sc, -mv.dy * T.sc); }
    x.beginPath(); for (const r of [P.outer, ...P.holes]) ring(r);
    const hot = (opt.hover && opt.hover === P.p.id) || (opt.sel && opt.sel.has(P.i));
    x.fillStyle = partColor(P.p.idx, pal.dark, hot ? 1 : 0.88); x.fill('evenodd');
    x.lineWidth = (hot || moving ? 2 : 0.9) * k; x.strokeStyle = moving && !mv.ok ? pal.bad : hot ? pal.trim : pal.stroke; x.stroke();
    if (P.bl.length) { x.setLineDash([5 * k, 3 * k]); x.lineWidth = 0.9 * k; P.bl.forEach(b => { x.strokeStyle = b.up ? pal.trim : pal.stroke; x.beginPath(); x.moveTo(X(b.a[0]), Y(b.a[1])); x.lineTo(X(b.b[0]), Y(b.b[1])); x.stroke(); }); x.setLineDash([]); }
    if (moving) x.restore();
  }
  // common-line blocks: shared edges
  for (const b of s.blocks || []) {
    const off = mv && mv.blk === b.key ? [mv.dx, mv.dy] : [0, 0];
    x.strokeStyle = pal.trim; x.lineWidth = 1.4 * k; x.beginPath();
    for (let j = 0; j <= b.r; j++) { x.moveTo(X(b.x + off[0]), Y(b.y + off[1] + j * b.ch)); x.lineTo(X(b.x + off[0] + b.c * b.cw), Y(b.y + off[1] + j * b.ch)); }
    for (let i = 0; i <= b.c; i++) { x.moveTo(X(b.x + off[0] + i * b.cw), Y(b.y + off[1])); x.lineTo(X(b.x + off[0] + i * b.cw), Y(b.y + off[1] + b.r * b.ch)); }
    x.stroke();
  }
  if (s.trimmed) {
    x.strokeStyle = pal.trim; x.lineWidth = 2 * k; x.setLineDash([8 * k, 5 * k]); x.beginPath(); x.moveTo(X(s.cL), Y(0) + 8 * k); x.lineTo(X(s.cL), Y(s.W) - 8 * k); x.stroke(); x.setLineDash([]);
  }
  if (opt.path && s.plan) {
    let pos = [0, 0];
    x.lineWidth = 0.8 * k; x.strokeStyle = pal.path; x.fillStyle = pal.path;
    s.plan.seq.forEach(it => {
      x.setLineDash([3 * k, 3 * k]); x.globalAlpha = 0.7; x.beginPath(); x.moveTo(X(pos[0]), Y(pos[1])); x.lineTo(X(it.entry[0]), Y(it.entry[1])); x.stroke(); x.setLineDash([]); x.globalAlpha = 1;
      if (it.lead) { const st = it.loop[0]; x.beginPath(); x.moveTo(X(it.lead[0]), Y(it.lead[1])); x.lineTo(X(st.x), Y(st.y)); x.stroke(); }
      x.beginPath(); x.arc(X(it.entry[0]), Y(it.entry[1]), 2.2 * k, 0, TAU); x.fill();
      pos = it.type === 'line' ? [it.line[2], it.line[3]] : [it.loop[0].x, it.loop[0].y];
    });
  }
  const fs = opt.fs || 12, font = opt.font || 'IBM Plex Sans, Arial, sans-serif';
  if (opt.labels !== false) {
    x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const P of paths) {
      const w = (P.bb.x1 - P.bb.x0) * T.sc, h = (P.bb.y1 - P.bb.y0) * T.sc;
      if (Math.min(w, h) < fs * 1.5) continue;
      const o = mv && mv.set.has(P.i) ? [mv.dx, mv.dy] : [0, 0];
      const cx = X((P.bb.x0 + P.bb.x1) / 2 + o[0]), cy = Y((P.bb.y0 + P.bb.y1) / 2 + o[1]), t = String(P.p.idx + 1);
      x.font = `600 ${fs}px ${font}`; const tw = x.measureText(t).width + fs * 0.6;
      x.fillStyle = pal.labelBg; x.fillRect(cx - tw / 2, cy - fs * 0.7, tw, fs * 1.4);
      x.fillStyle = pal.label; x.fillText(t, cx, cy + 0.5);
    }
  }
  x.fillStyle = pal.label; x.font = `500 ${fs}px ${font}`; x.textAlign = 'center'; x.textBaseline = 'top';
  x.fillText(`${nf(s.L)} мм`, X(s.L / 2), Y(0) + fs * 0.5);
  x.save(); x.translate(X(0) - fs * 0.6, Y(s.W / 2)); x.rotate(-Math.PI / 2); x.textBaseline = 'bottom'; x.fillText(`${nf(s.W)} мм`, 0, 0); x.restore();
  if (s.trimmed) {
    x.fillStyle = pal.trim; x.textBaseline = 'bottom'; x.textAlign = 'center';
    x.fillText(`тайрах ${nf(s.cL)}`, X(s.cL), Y(s.W) - fs * 0.3);
    if ((s.L - s.cL) * T.sc > fs * 6) { x.textBaseline = 'middle'; x.fillText(s.remOk ? `үлдэгдэл ${nf(s.left)}×${nf(s.W)}` : `хаягдал ${nf(s.left)}`, X((s.cL + s.L) / 2), Y(s.W / 2)); }
  }
}
const cv = $('#view');
function viewT(l) {
  const w = cv.clientWidth, h = cv.clientHeight, pad = 34, s = l.sheet;
  const sc0 = Math.min((w - 2 * pad) / s.L, (h - 2 * pad) / s.W), sc = sc0 * V.k;
  return { sc, ox: (w - s.L * sc) / 2 + V.px, oy: (h + s.W * sc) / 2 + V.py, w, h };
}
function drawView() {
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const dark = isDark(), pal = palette(dark);
  x.fillStyle = pal.bg; x.fillRect(0, 0, w, h);
  const l = curL(); $('#legend').hidden = !l;
  $('#ebar').hidden = !(l && V.edit);
  $('#cwrap').classList.toggle('editing', !!V.edit);
  if (!l) return;
  let sel = null, move = null;
  if (V.edit) ensureEx();
  if (V.edit && EX && V.sel != null && EX.units[V.sel]) sel = new Set(EX.units[V.sel].idx);
  if (V.drag && EX) move = { set: new Set(EX.units[V.drag.ui].idx), dx: V.drag.dx, dy: V.drag.dy, ok: V.drag.ok, blk: EX.units[V.drag.ui].blk };
  drawLayout(x, l, viewT(l), pal, { labels: V.labels, hover: V.edit ? null : V.hover, path: V.path, sel, move });
  $('#legend').textContent = V.edit ? 'Засах горим · партыг чирж зөөнө' : `${Math.round(V.k * 100)}% · хулганы дугуйгаар томруулна, чирж хөдөлгөнө`;
  updateEbar();
}
new ResizeObserver(() => drawView()).observe($('#cwrap'));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { renderParts(); drawView(); renderTable(); });

/* ---------- manual editing ---------- */
let EX = null;
function unitsOf(s) {
  const map = new Map(), units = [];
  s.pl.forEach((pl, i) => {
    if (pl.blk) { if (!map.has(pl.blk)) { const u = { idx: [], blk: pl.blk }; map.set(pl.blk, u); units.push(u); } map.get(pl.blk).idx.push(i); }
    else units.push({ idx: [i] });
  });
  return units;
}
function unitRings(s, u, paths) {
  if (u.blk) { const b = s.blocks.find(z => z.key === u.blk), W = b.c * b.cw, H = b.r * b.ch; return [[[b.x, b.y], [b.x + W, b.y], [b.x + W, b.y + H], [b.x, b.y + H]]]; }
  const P = paths[u.idx[0]]; return [P.outer, ...P.holes];
}
function ensureEx() {
  const l = curL(); if (!l) return null;
  if (EX && EX.sheet === l.sheet) return EX;
  const s = l.sheet, paths = layPaths(l), units = unitsOf(s);
  EX = exBuild(s.L, s.W, units.map(u => ({ rings: unitRings(s, u, paths) })), s.shapeInfo ? s.shapeInfo.flat : null, R.opt.gap + 0.1, R.opt.margin);
  EX.units = units; EX.sheet = s;
  return EX;
}
function unitAt(wx, wy) {
  const l = curL(); if (!l) return -1;
  const paths = layPaths(l), ex = ensureEx();
  for (const P of paths) {
    if (wx < P.bb.x0 || wx > P.bb.x1 || wy < P.bb.y0 || wy > P.bb.y1) continue;
    if (pointInPoly(wx, wy, P.outer) && !P.holes.some(h => pointInPoly(wx, wy, h))) return ex.units.findIndex(u => u.idx.includes(P.i));
  }
  return -1;
}
function editTargets(l) { return $('#eAll').checked ? l.sheets : [l.sheet]; }
function matchPl(s, rp) { return s.pl.findIndex(p => p.id === rp.id && p.ang === rp.ang && !!p.mir === !!rp.mir && Math.abs(p.tx - rp.tx) < 0.05 && Math.abs(p.ty - rp.ty) < 0.05); }
function matchBlk(s, rb) { return (s.blocks || []).findIndex(b => b.partId === rb.partId && Math.abs(b.x - rb.x) < 0.05 && Math.abs(b.y - rb.y) < 0.05); }
function pushUndo() { R.undo.push(JSON.stringify(R.raw)); if (R.undo.length > 30) R.undo.shift(); }
function afterEdit(rawSheet) {
  recomputeResult();
  const g = curG();
  if (g) { const i = g.lays.findIndex(l => l.sheets.some(s => s.raw === rawSheet)); if (i >= 0) V.l = i; }
  EX = null; renderResults();
}
function updateEbar() {
  if (!V.edit || !R) return;
  const l = curL(), ex = EX, u = ex && V.sel != null ? ex.units[V.sel] : null;
  const g = curG();
  $('#eRot').disabled = !u || !!u.blk; $('#eDel').disabled = !u; $('#eUndo').disabled = !R.undo.length;
  if (u) { const p = R.parts.get(l.sheet.pl[u.idx[0]].id); $('#eSel').textContent = u.blk ? `Хамтын шугамтай блок · ${p.name} ×${u.idx.length}` : `${p.idx + 1}. ${p.name}`; }
  else $('#eSel').textContent = 'Партыг чирж зөөнө. Сонгоод эргүүлэх, хасах боломжтой.';
  const un = Object.entries(g?.unplaced || {}).filter(([, n]) => n > 0);
  const cur = $('#eAddSel').value;
  $('#eAddSel').innerHTML = un.length ? un.map(([id, n]) => `<option value="${id}">${esc(R.parts.get(id)?.name)} (${n})</option>`).join('') : '<option value="">Байрлаагүй парт алга</option>';
  if (un.some(([id]) => id === cur)) $('#eAddSel').value = cur;
  $('#eAdd').disabled = !un.length;
}
function commitMove(ui, dx, dy) {
  const l = curL(), u = EX.units[ui], s0 = l.sheet;
  const ref = u.idx.map(i => ({ ...s0.pl[i] })), rb = u.blk ? { ...s0.blocks.find(b => b.key === u.blk) } : null;
  pushUndo();
  for (const s of editTargets(l)) {
    const ks = ref.map(rp => matchPl(s, rp));
    ks.forEach(k => { if (k >= 0) { s.pl[k].tx += dx; s.pl[k].ty += dy; } });
    if (rb) { const bi = matchBlk(s, rb); if (bi >= 0) { s.blocks[bi].x += dx; s.blocks[bi].y += dy; } }
  }
  afterEdit(s0.raw);
}
$('#vEdit').addEventListener('click', e => { if (!curL()) { toast('Эхлээд өрөлт хийнэ үү'); return; } V.edit = !V.edit; V.sel = null; e.currentTarget.classList.toggle('on', V.edit); EX = null; drawView(); });
$('#vPath').addEventListener('click', e => { V.path = !V.path; e.currentTarget.classList.toggle('on', V.path); drawView(); });
$('#eRot').addEventListener('click', () => {
  const l = curL(), ex = ensureEx(), u = ex.units[V.sel]; if (!u || u.blk) return;
  const s0 = l.sheet, pl = s0.pl[u.idx[0]], p = R.parts.get(pl.id), P = ex.parts[V.sel];
  const cx = (P.bb.x0 + P.bb.x1) / 2, cy = (P.bb.y0 + P.bb.y1) / 2, na = (pl.ang + 90) % 360;
  const bb0 = bboxPts(xformPts(p.flat.outer, na, pl.mir, 0, 0)), tx = cx - (bb0.x0 + bb0.x1) / 2, ty = cy - (bb0.y0 + bb0.y1) / 2;
  const rings = [xformPts(p.flat.outer, na, pl.mir, tx, ty), ...p.flat.holes.map(h => xformPts(h, na, pl.mir, tx, ty))];
  exRemovePart(ex, V.sel); const old = { rings: P.rings, segs: P.segs, bb: P.bb };
  P.rings = rings; P.segs = exSegsOf(rings); P.bb = exBB(rings[0]); exAddPart(ex, V.sel);
  const ok = exValid(ex, V.sel, 0, 0, true);
  if (!ok) { exRemovePart(ex, V.sel); Object.assign(P, old); exAddPart(ex, V.sel); toast('Эргүүлэхэд зай хүрэхгүй байна'); return; }
  const rp = { ...pl }; pushUndo();
  for (const s of editTargets(l)) { const k = matchPl(s, rp); if (k >= 0) Object.assign(s.pl[k], { ang: na, tx, ty }); }
  afterEdit(s0.raw);
});
$('#eDel').addEventListener('click', () => {
  const l = curL(), ex = ensureEx(), u = ex.units[V.sel]; if (!u) return;
  const s0 = l.sheet, ref = u.idx.map(i => ({ ...s0.pl[i] })), rb = u.blk ? { ...s0.blocks.find(b => b.key === u.blk) } : null, g = curG().raw;
  pushUndo();
  for (const s of editTargets(l)) {
    const ks = ref.map(rp => matchPl(s, rp)).filter(k => k >= 0).sort((a, b) => b - a);
    ks.forEach(k => { const id = s.pl[k].id; g.unplaced[id] = (g.unplaced[id] || 0) + 1; s.pl.splice(k, 1); });
    if (rb) { const bi = matchBlk(s, rb); if (bi >= 0) s.blocks.splice(bi, 1); }
  }
  V.sel = null;
  if (s0.pl.length === 0) { const gi = curG().raw.sheets; editTargets(l).forEach(s => { const i = gi.indexOf(s.raw); if (i >= 0) gi.splice(i, 1); }); recomputeResult(); V.l = 0; EX = null; renderResults(); return; }
  afterEdit(s0.raw);
});
$('#eCompact').addEventListener('click', () => {
  const l = curL(); if (!l) return;
  const ex = ensureEx(), s0 = l.sheet;
  const refs = ex.units.map(u => ({ pls: u.idx.map(i => ({ ...s0.pl[i] })), rb: u.blk ? { ...s0.blocks.find(b => b.key === u.blk) } : null }));
  const moved = exCompact(ex, 3);
  if (moved < 0.05) { toast('Шахах зай үлдээгүй байна'); return; }
  pushUndo();
  for (const s of editTargets(l)) refs.forEach((r, ui) => {
    const P = ex.parts[ui]; if (!P.dx && !P.dy) return;
    r.pls.map(rp => matchPl(s, rp)).forEach(k => { if (k >= 0) { s.pl[k].tx += P.dx; s.pl[k].ty += P.dy; } });
    if (r.rb) { const bi = matchBlk(s, r.rb); if (bi >= 0) { s.blocks[bi].x += P.dx; s.blocks[bi].y += P.dy; } }
  });
  afterEdit(s0.raw); toast(`Шахлаа · нийт ${nf(moved, 1)} мм шилжилт`);
});
$('#eAdd').addEventListener('click', () => {
  const id = $('#eAddSel').value, l = curL(); if (!id || !l) return;
  const g = curG().raw, targets = editTargets(l);
  if ((g.unplaced[id] || 0) < targets.length) { toast(`${targets.length} ижил листэнд нэмэхэд ${g.unplaced[id] || 0} ш хүрэхгүй — «Ижил бүх листэд»-ийг болиулна уу`); return; }
  const ex = ensureEx(), p = R.parts.get(id), src = S.parts.find(q => q.id === id);
  const angs = src && src.rot && +S.s.rot ? [0, 90, 180, 270] : [0];
  const m = R.opt.margin, gp = R.opt.gap + 0.1;
  const xs = [m], ys = [m];
  ex.parts.forEach(P => { xs.push(P.bb.x1 + gp + 0.01, P.bb.x0); ys.push(P.bb.y1 + gp + 0.01, P.bb.y0); P.rings.slice(1).forEach(h => { const b = exBB(h); xs.push(b.x0 + gp); ys.push(b.y0 + gp); }); });
  const ux = [...new Set(xs.map(v => Math.round(v * 100) / 100))].sort((a, b) => a - b), uy = [...new Set(ys.map(v => Math.round(v * 100) / 100))].sort((a, b) => a - b);
  let found = null;
  for (const a of angs) {
    const bb = bboxPts(xformPts(p.flat.outer, a, false, 0, 0));
    const rings = [xformPts(p.flat.outer, a, false, -bb.x0, -bb.y0), ...p.flat.holes.map(h => xformPts(h, a, false, -bb.x0, -bb.y0))];
    const pi = ex.parts.length;
    ex.parts.push({ rings, segs: exSegsOf(rings), bb: exBB(rings[0]), dx: 0, dy: 0 }); exAddPart(ex, pi);
    let hit = null;
    outer: for (const x0 of ux) { if (found && x0 > found.x) break; for (const y0 of uy) { if (exValid(ex, pi, x0, y0, true)) { hit = { x: x0, y: y0 }; break outer; } } }
    if (hit) { exMove(ex, pi, hit.x, hit.y); exSlide(ex, pi, -1, 0); exSlide(ex, pi, 0, -1); exSlide(ex, pi, -1, 0); const P = ex.parts[pi]; if (!found || P.bb.x0 < found.x - 0.5) found = { x: P.bb.x0, a, tx: P.dx - bb.x0, ty: P.dy - bb.y0 }; }
    exRemovePart(ex, pi); ex.parts.pop();
  }
  if (!found) { toast('Энэ листэд багтах зай олдсонгүй'); return; }
  pushUndo();
  for (const s of targets) s.pl.push({ id, ang: found.a, mir: false, tx: found.tx, ty: found.ty });
  g.unplaced[id] -= targets.length;
  afterEdit(l.sheet.raw); toast('Парт байрлууллаа');
});
$('#eUndo').addEventListener('click', () => { if (!R || !R.undo.length) return; R.raw = JSON.parse(R.undo.pop()); V.sel = null; recomputeResult(); });

// pan / zoom / hover / drag
const ptrs = new Map(); let pinch0 = null;
function zoomAt(mx, my, f) {
  const l = curL(); if (!l) return;
  const T = viewT(l), wx = (mx - T.ox) / T.sc, wy = (T.oy - my) / T.sc;
  V.k = Math.min(60, Math.max(0.3, V.k * f));
  const T2 = viewT(l), dx = mx - (T2.ox + wx * T2.sc), dy = my - (T2.oy - wy * T2.sc);
  V.px += dx; V.py += dy; drawView();
}
function toWorld(e) { const r = cv.getBoundingClientRect(), l = curL(), T = viewT(l); return [(e.clientX - r.left - T.ox) / T.sc, (T.oy - (e.clientY - r.top)) / T.sc]; }
cv.addEventListener('wheel', e => { if (!curL()) return; e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId);
  if (V.edit && curL() && ptrs.size === 0) {
    const [wx, wy] = toWorld(e), ui = unitAt(wx, wy);
    V.sel = ui >= 0 ? ui : null;
    if (ui >= 0) { V.drag = { ui, sx: wx, sy: wy, dx: 0, dy: 0, ok: true }; $('#tip').hidden = true; drawView(); return; }
    drawView();
  }
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); $('#cwrap').classList.add('drag');
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); }
});
cv.addEventListener('pointermove', e => {
  const r = cv.getBoundingClientRect();
  if (V.drag) {
    const [wx, wy] = toWorld(e); V.drag.dx = wx - V.drag.sx; V.drag.dy = wy - V.drag.sy;
    V.drag.ok = exValid(EX, V.drag.ui, V.drag.dx, V.drag.dy, true); drawView(); return;
  }
  if (ptrs.has(e.pointerId)) {
    const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2 && pinch0) { const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, d / pinch0); pinch0 = d; }
    else { V.px += e.clientX - prev.x; V.py += e.clientY - prev.y; drawView(); }
    $('#tip').hidden = true; return;
  }
  if (!V.edit) hoverAt(e.clientX - r.left, e.clientY - r.top);
});
const endPtr = e => {
  if (V.drag) {
    const d = V.drag; V.drag = null;
    if (Math.abs(d.dx) + Math.abs(d.dy) > 0.05) { if (d.ok) commitMove(d.ui, d.dx, d.dy); else { toast('Бусад парттай давхцаж эсвэл зай хүрэхгүй байна — буцаалаа'); drawView(); } }
    else drawView();
    return;
  }
  ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = null; if (!ptrs.size) $('#cwrap').classList.remove('drag');
};
cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
cv.addEventListener('pointerleave', () => { $('#tip').hidden = true; if (V.hover) { V.hover = null; drawView(); } });
cv.addEventListener('dblclick', () => { if (V.edit) return; V.k = 1; V.px = V.py = 0; drawView(); });
document.addEventListener('keydown', e => {
  if (!V.edit || V.sel == null || e.target.matches('input,select,textarea')) return;
  if (e.key === 'r' || e.key === 'R') $('#eRot').click();
  else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); $('#eDel').click(); }
  else if (e.key.startsWith('Arrow')) {
    e.preventDefault(); ensureEx(); const st = e.shiftKey ? 10 : 1, dx = e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0, dy = e.key === 'ArrowDown' ? -st : e.key === 'ArrowUp' ? st : 0;
    if (exValid(EX, V.sel, dx, dy, true)) commitMove(V.sel, dx, dy); else toast('Энэ чиглэлд зай алга');
  }
});
function hoverAt(mx, my) {
  const l = curL(); if (!l) return;
  const T = viewT(l), wx = (mx - T.ox) / T.sc, wy = (T.oy - my) / T.sc;
  let hit = null;
  for (const P of layPaths(l)) { if (wx < P.bb.x0 || wx > P.bb.x1 || wy < P.bb.y0 || wy > P.bb.y1) continue; if (pointInPoly(wx, wy, P.outer) && !P.holes.some(h => pointInPoly(wx, wy, h))) { hit = P; break; } }
  const id = hit ? hit.p.id : null;
  if (id !== V.hover) { V.hover = id; drawView(); }
  const tip = $('#tip');
  if (!hit) { tip.hidden = true; return; }
  const onSheet = l.sheet.pl.filter(p => p.id === id).length;
  tip.innerHTML = `<b>${hit.p.idx + 1}. ${esc(hit.p.name)}</b>${nf(hit.p.info.w, 1)} × ${nf(hit.p.info.h, 1)} мм · ${hit.pl.ang}°${hit.pl.mir ? ' толин' : ''}<br>Энэ листэд ${onSheet} ш · X ${nf(hit.bb.x0, 1)} Y ${nf(hit.bb.y0, 1)}`;
  tip.hidden = false;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  tip.style.left = Math.min(mx + 14, cv.clientWidth - tw - 6) + 'px'; tip.style.top = Math.min(my + 14, cv.clientHeight - th - 6) + 'px';
}

/* ---------- file saving ---------- */
const DL = (window.claude && typeof window.claude.use === 'function') ? Promise.resolve(window.claude.use('downloads')).catch(() => null) : Promise.resolve(null);
const inHost = !!(window.claude && typeof window.claude.use === 'function');
async function saveFile(name, data, mime) {
  if (window.kh) {
    try { const buf = data instanceof Blob ? await data.arrayBuffer() : data; const p = await window.kh.saveFile(name, buf); if (p) toast('Хадгалагдлаа: ' + p, 4000); }
    catch (err) { toast('Файл хадгалж чадсангүй'); }
    return;
  }
  if (inHost) {
    const dl = await DL;
    if (dl) {
      try { await dl.save({ filename: name, data }); toast('Файл хадгалагдлаа'); }
      catch (err) { if (err && err.code === 'declined') return; toast(err && err.code === 'rejected_extension' ? 'Энэ төрлийн файл энд хадгалагдахгүй' : 'Файл хадгалж чадсангүй'); }
      return;
    }
  }
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
const safeName = s => String(s).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_');

/* ---------- DXF export ---------- */
function layoutDXF(l) {
  const w = dxfWriter(), s = l.sheet;
  if (+S.s.dxfSheet) {
    if (s.shapeInfo) s.shapeInfo.rings.forEach(r => w.loop('SHEET', r));
    else w.loop('SHEET', [{ x: 0, y: 0, b: 0 }, { x: s.L, y: 0, b: 0 }, { x: s.L, y: s.W, b: 0 }, { x: 0, y: s.W, b: 0 }]);
  }
  if (s.trimmed) w.line('TRIM', s.cL, 0, s.cL, s.W);
  // contours in cutting order: holes before the outer contour, nearest next, part-in-part first
  if (+S.s.dxfBend) for (const pl of s.pl) { const p = R.parts.get(pl.id); (p.bends || []).forEach(b => { const q = xformPts([[b.x1, b.y1], [b.x2, b.y2]], pl.ang, pl.mir, pl.tx, pl.ty); w.line(b.up ? 'BEND_UP' : 'BEND_DOWN', q[0][0], q[0][1], q[1][0], q[1][1]); }); }
  for (const it of s.plan.seq) {
    if (it.type === 'line') { w.line('OUTER', ...it.line); continue; }
    if (it.lead) w.line('LEADIN', it.lead[0], it.lead[1], it.loop[0].x, it.loop[0].y);
    w.loop(it.layer, it.loop);
  }
  return w.doc();
}
function layFile(g, l) { return safeName(`${S.jobName}_${g.mat}_${g.thk}mm_L${String(l.no).padStart(2, '0')}_${l.sheet.L}x${l.sheet.W}_x${l.count}`) + '.dxf'; }
$('#vDxf').addEventListener('click', async () => {
  const g = curG(), l = curL(); if (!l) { toast('Эхлээд өрөлт хийнэ үү'); return; }
  const name = layFile(g, l), txt = layoutDXF(l);
  if (inHost) { if (!window.JSZip) { toast('ZIP сан ачаалагдсангүй'); return; } const z = new JSZip(); z.file(name, txt); saveFile(name.replace(/\.dxf$/, '.zip'), await z.generateAsync({ type: 'blob' })); }
  else saveFile(name, txt, 'application/dxf');
});
$('#xDxfAll').addEventListener('click', async () => {
  if (!R) { toast('Эхлээд өрөлт хийнэ үү'); return; }
  if (!window.JSZip) { toast('ZIP сан ачаалагдсангүй — интернэт холболтоо шалгана уу'); return; }
  const z = new JSZip();
  R.groups.forEach(g => g.lays.forEach(l => z.file(layFile(g, l), layoutDXF(l))));
  z.file('README.txt', 'KH Nesting\r\nOUTER - gadna kontur ba hamtyn shugam, INNER - nuh, LEADIN - orolt, SHEET - listiin huree, TRIM - tairah shugam.\r\nKonturuud zusekh daraallaar bichigdsen (nuh ehelj, oir dotroo).\r\n_xN - ijil listiig N udaa zusne.\r\n');
  saveFile(safeName(S.jobName) + '_DXF.zip', await z.generateAsync({ type: 'blob', compression: 'DEFLATE' }));
});

/* ---------- CSV ---------- */
$('#xCsv').addEventListener('click', () => {
  if (!R) { toast('Эхлээд өрөлт хийнэ үү'); return; }
  const q = v => { const s = String(v ?? ''); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const rows = [['Ажил', S.jobName], ['Огноо', R.date.toLocaleString()], []];
  rows.push(['Бүлэг', 'Лист №', 'Урт', 'Өргөн', 'Төрөл', 'Давталт', 'Парт', 'Ашиглалт %', 'Зарцуулах урт', 'Зүсэлт м', 'Цоолт', 'Хугацаа мин', 'Жин кг']);
  R.groups.forEach(g => g.lays.forEach(l => { const s = l.sheet; rows.push([g.label, l.no, s.L, s.W, s.kind === 'rem' ? 'үлдэгдэл' : 'стандарт', l.count, s.n, (s.util * 100).toFixed(1), s.cL, (s.cut / 1000).toFixed(2), s.pierce, s.time.toFixed(1), s.kg.toFixed(1)]); }));
  rows.push([]);
  rows.push(['Бүлэг', '#', 'Парт', 'Урт', 'Өргөн', 'Захиалга', 'Өрсөн', 'Талбай м²', 'Жин 1ш кг', 'Зүсэлт 1ш м', 'Нийт жин кг', 'Нийт зүсэлт м']);
  R.groups.forEach(g => [...R.parts.values()].filter(p => (p.mat + '|' + p.thk) === g.key).forEach(p => { const pl = g.placed[p.id] || 0, kg = p.info.area * g.thk * g.matInfo.rho / 1e6; rows.push([g.label, p.idx + 1, p.name, p.info.w.toFixed(1), p.info.h.toFixed(1), p.qty, pl, (p.info.area / 1e6).toFixed(4), kg.toFixed(3), (p.info.cut / 1000).toFixed(3), (kg * pl).toFixed(2), (p.info.cut * pl / 1000).toFixed(2)]); }));
  rows.push([]);
  rows.push(['Бүлэг', 'Лист', 'Материал кг', 'Партын жин кг', 'Хаягдал кг', 'Ашиглалт %', 'Зүсэлт м', 'Цоолт', 'Хугацаа мин', 'Өртөг ₮']);
  R.groups.forEach(g => { const t = g.tot; rows.push([g.label, g.sheets.length, t.kg.toFixed(1), t.partsKg.toFixed(1), t.scrapKg.toFixed(1), (t.util * 100).toFixed(1), (t.cut / 1000).toFixed(2), t.pierce, t.time.toFixed(1), Math.round(t.cost)]); });
  saveFile(safeName(S.jobName) + '_тооцоо.csv', '﻿' + rows.map(r => r.map(q).join(',')).join('\r\n'), 'text/csv');
});

/* ---------- PDF report ---------- */
function reportPages() {
  const PW = 297, PH = 210, K = 6, pages = [], F = '"IBM Plex Sans", Arial, sans-serif', FM = '"IBM Plex Mono", Consolas, monospace';
  const dateStr = R.date.toLocaleDateString('mn-MN') + ' ' + R.date.toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' });
  const page = () => {
    const c = document.createElement('canvas'); c.width = PW * K; c.height = PH * K;
    const x = c.getContext('2d'); x.scale(K, K); x.fillStyle = '#fff'; x.fillRect(0, 0, PW, PH);
    x.fillStyle = '#10161c'; x.font = `600 4.2px ${F}`; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
    x.fillText('Kh International · Зүсэлтийн өрөлтийн тайлан', 12, 13);
    x.textAlign = 'right'; x.font = `400 3.2px ${F}`; x.fillStyle = '#4f5b68';
    x.fillText(`${S.jobName} · ${dateStr} · хуудас ${pages.length + 1}`, PW - 12, 13);
    x.strokeStyle = '#cf4a0c'; x.lineWidth = 0.5; x.beginPath(); x.moveTo(12, 16); x.lineTo(PW - 12, 16); x.stroke();
    x.textAlign = 'left'; x.font = `400 2.6px ${F}`; x.fillStyle = '#6a7684'; x.fillText('Kh International · ISO 9001 чанарын удирдлагын тогтолцоо · Бэлтгэсэн: ________  Хянасан: ________', 12, PH - 6);
    pages.push(c); return x;
  };
  const table = (x, X0, y, cols, rows, opt = {}) => {
    const rh = opt.rh || 5.6; let cx = X0;
    x.font = `600 2.7px ${F}`; x.fillStyle = '#6a7684'; x.textBaseline = 'middle';
    cols.forEach(c => { x.textAlign = c.a === 'r' ? 'right' : 'left'; x.fillText(c.t, c.a === 'r' ? cx + c.w - 1.5 : cx + 1.5, y + rh / 2); cx += c.w; });
    const tw = cols.reduce((a, c) => a + c.w, 0);
    x.strokeStyle = '#c6ced7'; x.lineWidth = 0.3; x.beginPath(); x.moveTo(X0, y + rh); x.lineTo(X0 + tw, y + rh); x.stroke();
    y += rh;
    rows.forEach((r, i) => {
      if (r.bold) { x.fillStyle = '#eef1f4'; x.fillRect(X0, y, tw, rh); }
      cx = X0;
      cols.forEach((c, j) => {
        const v = r.cells ? r.cells[j] : r[j];
        if (c.sw && v != null && v !== '') { x.fillStyle = v; x.fillRect(cx + 1.5, y + rh / 2 - 1.3, 2.6, 2.6); cx += c.w; return; }
        x.font = `${r.bold ? 600 : 400} 3px ${c.m ? FM : F}`; x.fillStyle = '#141b23'; x.textAlign = c.a === 'r' ? 'right' : 'left';
        let s = String(v ?? ''); while (s.length > 2 && x.measureText(s).width > c.w - 3) s = s.slice(0, -2) + '…';
        x.fillText(s, c.a === 'r' ? cx + c.w - 1.5 : cx + 1.5, y + rh / 2); cx += c.w;
      });
      x.strokeStyle = '#e3e8ee'; x.beginPath(); x.moveTo(X0, y + rh); x.lineTo(X0 + tw, y + rh); x.stroke();
      y += rh;
    });
    return y;
  };
  // summary page(s)
  let x = page(), y = 22;
  x.textAlign = 'left'; x.fillStyle = '#10161c'; x.font = `600 6px ${F}`; x.fillText(S.jobName, 12, y + 4); y += 10;
  x.font = `400 3.1px ${F}`; x.fillStyle = '#4f5b68';
  x.fillText(`Зай ${S.s.gap} мм · захын зай ${S.s.margin} мм · эргүүлэлт ${+S.s.rot ? S.s.rot + '°' : 'үгүй'} · ${S.s.keep ? 'ижил партуудыг салгахгүй' : 'ижил партууд чөлөөтэй'} · ${S.s.trim ? 'тайралттай' : 'тайралтгүй'}`, 12, y); y += 6;
  y = table(x, 12, y, [{ t: 'Материал', w: 52 }, { t: 'Лист', w: 42 }, { t: 'Ашиглалт', w: 20, a: 'r', m: 1 }, { t: 'Зүсэлт, м', w: 22, a: 'r', m: 1 }, { t: 'Цоолт', w: 16, a: 'r', m: 1 }, { t: 'Материал, кг', w: 24, a: 'r', m: 1 }, { t: 'Партууд, кг', w: 24, a: 'r', m: 1 }, { t: 'Хаягдал, кг', w: 22, a: 'r', m: 1 }, { t: 'Хугацаа', w: 22, a: 'r' }, { t: 'Өртөг, ₮', w: 29, a: 'r', m: 1 }],
    R.groups.map(g => { const t = g.tot; return [g.label, Object.entries(g.bySize).map(([k, n]) => `${k} ×${n}`).join(', '), nf(t.util * 100, 1) + '%', nf(t.cut / 1000, 2), t.pierce, nf(t.kg, 1), nf(t.partsKg, 1), nf(t.scrapKg, 1), fmtTime(t.time), nf(t.cost)]; }), { rh: 6.2 });
  y += 8;
  x.textAlign = 'left'; x.font = `600 3.6px ${F}`; x.fillStyle = '#10161c'; x.fillText('Партын жагсаалт', 12, y); y += 3;
  const pcols = [{ t: '', w: 6, sw: 1 }, { t: '#', w: 9, m: 1 }, { t: 'Нэр', w: 58 }, { t: 'Материал', w: 40 }, { t: 'Хэмжээ, мм', w: 32, a: 'r', m: 1 }, { t: 'Захиалга', w: 18, a: 'r', m: 1 }, { t: 'Өрсөн', w: 16, a: 'r', m: 1 }, { t: 'Жин 1ш, кг', w: 22, a: 'r', m: 1 }, { t: 'Зүсэлт 1ш, м', w: 24, a: 'r', m: 1 }, { t: 'Нийт, кг', w: 23, a: 'r', m: 1 }, { t: 'Нийт, м', w: 25, a: 'r', m: 1 }];
  const prow = [];
  R.groups.forEach(g => [...R.parts.values()].filter(p => (p.mat + '|' + p.thk) === g.key).forEach(p => { const pl = g.placed[p.id] || 0, kg = p.info.area * g.thk * g.matInfo.rho / 1e6; prow.push([partColor(p.idx, false), p.idx + 1, p.name, g.label, `${nf(p.info.w, 1)}×${nf(p.info.h, 1)}`, p.qty, pl, nf(kg, 2), nf(p.info.cut / 1000, 3), nf(kg * pl, 1), nf(p.info.cut * pl / 1000, 2)]); }));
  let i0 = 0;
  while (i0 < prow.length) { const fit = Math.max(1, Math.floor((PH - 14 - y) / 5.6) - 1); y = table(x, 12, y, pcols, prow.slice(i0, i0 + fit)); i0 += fit; if (i0 < prow.length) { x = page(); y = 22; } }
  // one page per layout
  const pal = palette(false, true);
  R.groups.forEach(g => g.lays.forEach(l => {
    const x = page(), s = l.sheet;
    x.textAlign = 'left'; x.fillStyle = '#10161c'; x.font = `600 5px ${F}`;
    x.fillText(`Лист ${l.no}${l.count > 1 ? '  ×' + l.count : ''}`, 12, 25);
    x.font = `400 3.3px ${F}`; x.fillStyle = '#4f5b68';
    x.fillText(`${g.label} · ${s.L} × ${s.W} мм · ${s.kind === 'rem' ? (s.shapeInfo ? 'хэлбэртэй үлдэгдэл' : 'үлдэгдэл') : 'стандарт лист'}${(s.blocks || []).length ? ' · хамтын шугам' : ''}`, 50, 25);
    const box = { x: 14, y: 32, w: 196, h: 164 };
    const sc = Math.min(box.w / s.L, box.h / s.W);
    drawLayout(x, l, { sc, ox: box.x + (box.w - s.L * sc) / 2, oy: box.y + (box.h + s.W * sc) / 2 }, pal, { labels: true, fs: 2.6, font: F, lw: 0.2 });
    let yy = 32; const X0 = 218;
    const kv = [['Ашиглалт', nf(s.util * 100, 1) + '%'], ['Партын тоо', s.n], ['Зүсэлт', nf(s.cut / 1000, 2) + ' м'], ['Цоолт', s.pierce], ['Хоосон явалт', nf(s.travel / 1000, 1) + ' м'], ['Хугацаа', fmtTime(s.time)], ['Листийн жин', nf(s.kg, 1) + ' кг'], ['Зарцуулах урт', nf(s.cL) + ' мм']];
    if (s.trimmed) kv.push([s.remOk ? 'Үлдэгдэл' : 'Хаягдал', `${nf(s.left)}×${nf(s.W)} мм`]);
    x.font = `400 3.1px ${F}`;
    kv.forEach(([k, v]) => { x.textAlign = 'left'; x.fillStyle = '#6a7684'; x.fillText(k, X0, yy); x.textAlign = 'right'; x.fillStyle = '#141b23'; x.font = `500 3.1px ${FM}`; x.fillText(String(v), PW - 12, yy); x.font = `400 3.1px ${F}`; yy += 5; });
    yy += 3;
    const cnt = {}; s.pl.forEach(p => cnt[p.id] = (cnt[p.id] || 0) + 1);
    const rows = Object.entries(cnt).map(([id, n]) => { const p = R.parts.get(id); return [partColor(p.idx, false), p.idx + 1, p.name, n]; }).sort((a, b) => a[1] - b[1]);
    const maxRows = Math.floor((PH - 14 - yy) / 5.2) - 1;
    table(x, X0, yy, [{ t: '', w: 6, sw: 1 }, { t: '#', w: 8, m: 1 }, { t: 'Парт', w: 40 }, { t: 'Тоо', w: 13, a: 'r', m: 1 }], rows.slice(0, maxRows), { rh: 5.2 });
  }));
  return pages;
}
$('#xPdf').addEventListener('click', async () => {
  if (!R) { toast('Эхлээд өрөлт хийнэ үү'); return; }
  if (!window.jspdf) { toast('PDF сан ачаалагдсангүй — интернэт холболтоо шалгана уу'); return; }
  toast('PDF бэлтгэж байна…');
  try { await document.fonts.ready; } catch (e) { }
  const pages = reportPages();
  const pdf = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  pages.forEach((c, i) => { if (i) pdf.addPage(); pdf.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 297, 210); });
  saveFile(safeName(S.jobName) + '_тайлан.pdf', pdf.output('blob'), 'application/pdf');
});


/* ---------- quote ---------- */
function quoteData() {
  const q = S.quote, lines = [];
  R.groups.forEach(g => {
    const parts = [...R.parts.values()].filter(p => (g.placed[p.id] || 0) > 0 && (p.mat + '|' + p.thk) === g.key);
    const sa = parts.reduce((a, p) => a + p.info.area * g.placed[p.id], 0) || 1, sc = parts.reduce((a, p) => a + p.info.cut * g.placed[p.id], 0) || 1;
    parts.forEach(p => {
      const n = g.placed[p.id], cost = g.tot.matCost * p.info.area * n / sa + g.tot.cutCost * p.info.cut * n / sc;
      const unit = Math.ceil(cost / n * (1 + (+q.markup || 0) / 100) / 10) * 10;
      lines.push({ p, g, n, unit, sum: unit * n, cost });
    });
  });
  const setup = +q.setup || 0, sub = lines.reduce((a, l) => a + l.sum, 0) + setup, vat = q.vat ? Math.round(sub * 0.1) : 0;
  return { lines, setup, sub, vat, total: sub + vat, cost: lines.reduce((a, l) => a + l.cost, 0) };
}
const QF = [['customer', 'Захиалагч', 'text'], ['no', 'Саналын дугаар', 'text'], ['valid', 'Хүчинтэй хугацаа, хоног', 'number'], ['markup', 'Ашгийн хувь, %', 'number'], ['setup', 'Бэлтгэл ажлын төлбөр, ₮', 'number'], ['by', 'Бэлтгэсэн', 'text'], ['contact', 'Холбоо барих (утас, и-мэйл)', 'text']];
function renderQuote(el) {
  const q = S.quote, d = quoteData();
  el.innerHTML = `<div class="qgrid">${QF.map(([k, l, t]) => `<label class="fld">${l}<input id="q_${k}" type="${t}" value="${esc(q[k])}"></label>`).join('')}
      <label class="check" style="align-self:end"><input type="checkbox" id="q_vat" ${q.vat ? 'checked' : ''}><span>НӨАТ 10% нэмэх</span></label></div>
    <label class="fld" style="margin-bottom:12px">Тайлбар<input id="q_note" value="${esc(q.note)}"></label>
    <div class="tblwrap"><table class="dt"><thead><tr><th>#</th><th>Нэр</th><th>Материал</th><th class="r">Хэмжээ, мм</th><th class="r">Тоо</th><th class="r">Өртөг 1ш</th><th class="r">Нэгж үнэ, ₮</th><th class="r">Дүн, ₮</th></tr></thead><tbody>
    ${d.lines.map((l, i) => `<tr><td class="num">${i + 1}</td><td>${esc(l.p.name)}</td><td>${esc(l.g.label)}</td><td class="r num">${nf(l.p.info.w)}×${nf(l.p.info.h)}</td><td class="r num">${l.n}</td><td class="r num muted">${nf(l.cost / l.n)}</td><td class="r num">${nf(l.unit)}</td><td class="r num">${nf(l.sum)}</td></tr>`).join('')}
    ${d.setup ? `<tr><td></td><td colspan="6">Бэлтгэл ажил</td><td class="r num">${nf(d.setup)}</td></tr>` : ''}
    </tbody></table></div>
    <div class="qtot"><div><span>Дүн</span><span>${nf(d.sub)} ₮</span></div>${S.quote.vat ? `<div><span>НӨАТ 10%</span><span>${nf(d.vat)} ₮</span></div>` : ''}<div class="big"><span>Нийт</span><span>${nf(d.total)} ₮</span></div><div class="muted" style="font-size:12px"><span>Өртөг</span><span>${nf(d.cost)} ₮</span></div></div>
    <div class="addrow"><button class="btn primary" id="qPdf">Үнийн санал PDF</button><span class="note">Материалын өртгийг партын талбайгаар, зүсэлтийн өртгийг зүсэх уртаар хуваарилж, ашгийн хувийг нэмсэн.</span></div>`;
  [...QF.map(f => f[0]), 'note'].forEach(k => $('#q_' + k).addEventListener('change', e => { S.quote[k] = e.target.type === 'number' ? Math.max(0, +e.target.value || 0) : e.target.value; save(); renderQuote(el); }));
  $('#q_vat').addEventListener('change', e => { S.quote.vat = e.target.checked; save(); renderQuote(el); });
  $('#qPdf').addEventListener('click', quotePdf);
}
function wrapText(x, text, maxW) { const words = String(text).split(/\s+/), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }
async function quotePdf() {
  if (!window.jspdf) { toast('PDF сан ачаалагдсангүй — интернэт холболтоо шалгана уу'); return; }
  try { await document.fonts.ready; } catch (e) { }
  const q = S.quote, d = quoteData(), PW = 210, PH = 297, K = 6, F = '"IBM Plex Sans", Arial, sans-serif', FM = '"IBM Plex Mono", Consolas, monospace', pages = [];
  const today = new Date(), until = new Date(today.getTime() + (+q.valid || 0) * 864e5), ds = t => t.toLocaleDateString('mn-MN');
  const page = () => { const c = document.createElement('canvas'); c.width = PW * K; c.height = PH * K; const x = c.getContext('2d'); x.scale(K, K); x.fillStyle = '#fff'; x.fillRect(0, 0, PW, PH); pages.push(c); return x; };
  let x = page();
  x.fillStyle = '#10161c'; x.font = `700 6px ${F}`; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.fillText('Kh International', 15, 22);
  x.font = `400 3.2px ${F}`; x.fillStyle = '#4f5b68'; x.fillText('ISO 9001 гэрчилгээтэй · Ган хийц, металл боловсруулалт, лазер зүсэлт', 15, 28); if (q.contact) x.fillText(q.contact, 15, 33);
  x.textAlign = 'right'; x.fillStyle = '#cf4a0c'; x.font = `700 8px ${F}`; x.fillText('ҮНИЙН САНАЛ', PW - 15, 22);
  x.fillStyle = '#10161c'; x.font = `400 3.3px ${F}`; x.fillText(`№ ${q.no}  ·  ${ds(today)}`, PW - 15, 28); x.fillText(`Хүчинтэй: ${ds(until)} хүртэл`, PW - 15, 33);
  x.strokeStyle = '#cf4a0c'; x.lineWidth = 0.5; x.beginPath(); x.moveTo(15, 38); x.lineTo(PW - 15, 38); x.stroke();
  x.textAlign = 'left'; x.fillStyle = '#6a7684'; x.font = `400 3.1px ${F}`; x.fillText('Захиалагч', 15, 46); x.fillStyle = '#10161c'; x.font = `600 4.2px ${F}`; x.fillText(q.customer || '—', 15, 52);
  x.fillStyle = '#6a7684'; x.font = `400 3.1px ${F}`; x.textAlign = 'right'; x.fillText(`Ажил: ${S.jobName}`, PW - 15, 52);
  const cols = [{ t: '#', w: 8 }, { t: 'Нэр', w: 56 }, { t: 'Материал', w: 38 }, { t: 'Хэмжээ, мм', w: 24, a: 'r' }, { t: 'Тоо', w: 12, a: 'r' }, { t: 'Нэгж үнэ, ₮', w: 21, a: 'r' }, { t: 'Дүн, ₮', w: 21, a: 'r' }];
  const head = y => { let cx = 15; x.font = `600 2.8px ${F}`; x.fillStyle = '#6a7684'; x.textBaseline = 'middle'; cols.forEach(c => { x.textAlign = c.a === 'r' ? 'right' : 'left'; x.fillText(c.t, c.a === 'r' ? cx + c.w - 1.5 : cx + 1.5, y + 3); cx += c.w; }); x.strokeStyle = '#c6ced7'; x.lineWidth = 0.3; x.beginPath(); x.moveTo(15, y + 6); x.lineTo(PW - 15, y + 6); x.stroke(); return y + 6; };
  const rows = d.lines.map((l, i) => [i + 1, l.p.name, l.g.label, `${nf(l.p.info.w)}×${nf(l.p.info.h)}`, l.n, nf(l.unit), nf(l.sum)]);
  if (d.setup) rows.push(['', 'Бэлтгэл ажил', '', '', '', '', nf(d.setup)]);
  let y = head(60);
  rows.forEach(r => {
    if (y > PH - 70) { x = page(); y = head(20); }
    let cx = 15; x.textBaseline = 'middle';
    cols.forEach((c, j) => { x.font = `400 3px ${j >= 3 ? FM : F}`; x.fillStyle = '#141b23'; x.textAlign = c.a === 'r' ? 'right' : 'left'; let s = String(r[j]); while (s.length > 2 && x.measureText(s).width > c.w - 3) s = s.slice(0, -2) + '…'; x.fillText(s, c.a === 'r' ? cx + c.w - 1.5 : cx + 1.5, y + 3); cx += c.w; });
    x.strokeStyle = '#e3e8ee'; x.beginPath(); x.moveTo(15, y + 6); x.lineTo(PW - 15, y + 6); x.stroke(); y += 6;
  });
  y += 6; x.textBaseline = 'alphabetic';
  const tot = [['Дүн', nf(d.sub) + ' ₮']]; if (q.vat) tot.push(['НӨАТ 10%', nf(d.vat) + ' ₮']); tot.push(['Нийт төлөх', nf(d.total) + ' ₮']);
  tot.forEach(([k, v], i) => { const last = i === tot.length - 1; x.font = `${last ? 700 : 400} ${last ? 4.2 : 3.3}px ${F}`; x.fillStyle = '#10161c'; x.textAlign = 'left'; x.fillText(k, 125, y); x.textAlign = 'right'; x.font = `${last ? 700 : 500} ${last ? 4.2 : 3.3}px ${FM}`; x.fillText(v, PW - 15, y); y += last ? 7 : 5.5; });
  y += 6; x.textAlign = 'left'; x.font = `400 3.1px ${F}`; x.fillStyle = '#4f5b68';
  if (q.note) wrapText(x, q.note, PW - 30).forEach(t => { x.fillText(t, 15, y); y += 4.6; });
  y = Math.max(y + 14, PH - 35);
  x.fillStyle = '#10161c'; x.font = `400 3.3px ${F}`; x.fillText('Бэлтгэсэн: ____________________  / ' + (q.by || '') + ' /', 15, y);
  const pdf = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  pages.forEach((c, i) => { if (i) pdf.addPage(); pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, PW, PH); });
  saveFile(safeName(`Үнийн_санал_${q.no}_${q.customer || S.jobName}`) + '.pdf', pdf.output('blob'), 'application/pdf');
}

/* ---------- project save / open ---------- */
$('#btnSaveProj').addEventListener('click', () => saveFile(safeName(S.jobName) + '.khnest.json', JSON.stringify(S), 'application/json'));
$('#btnOpenProj').addEventListener('click', () => $('#projFile').click());
$('#projFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { const o = JSON.parse(await f.text()); if (!o || !Array.isArray(o.parts)) throw 0; S = mergeState(o); save(); R = null; renderAll(); toast('Төсөл нээгдлээ'); }
  catch (err) { toast('Төслийн файл буруу байна'); }
});

/* ---------- init ---------- */
function renderAll() { renderParts(); renderDefaults(); renderStock(); renderSettings(); renderResults(); }
renderAll();
runNesting(true);

/* ---------- text dialog ---------- */
let tMode = 'letters', tRes = null, tTimer = 0;
const T_NOTES = {
  letters: 'Үсэг бүр тусдаа парт болно. Ижил үсгүүдийг тоогоор нь нэгтгэнэ.',
  sign: 'Мөр бүрийн үсгүүдийг доороо туузаар холбож нэг самбар болгоно.',
  plate: 'Хавтан дээр текстийг нүх болгон зүснэ. Гүүр нь О, А, Ө зэрэг үсгийн дотор хэсгийг унахаас хамгаална. Жинхэнэ stencil фонтод гүүр шаардлагагүй.'
};
function fontOptions() {
  const g = (grp, label) => `<optgroup label="${label}">${FONTS.filter(f => f.group === grp).map(f => `<option value="${esc(f.name)}">${esc(f.name)}</option>`).join('')}</optgroup>`;
  return g('mn', 'Кирилл, монгол үсэгтэй') + g('stencil', 'Stencil (латин үсэг)') + (customFonts.length ? `<optgroup label="Өөрийн фонт">${customFonts.map((f, i) => `<option value="custom:${i}">${esc(f.name)}</option>`).join('')}</optgroup>` : '');
}
function setTMode(m) {
  tMode = m; $$('#tMode button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  $$('#tmodal [data-for]').forEach(el => el.hidden = el.dataset.for !== m);
  $('#tModeNote').textContent = T_NOTES[m];
}
async function openText() {
  $('#tmodal').hidden = false; $('#tErr').textContent = ''; $('#tInfo').textContent = 'Фонт ачаалж байна…';
  try { await ensureTextLibs(); } catch (e) { $('#tErr').textContent = 'Текстийн сан ачаалагдсангүй — интернэт холболтоо шалгана уу'; return; }
  const cur = $('#tFont').value; $('#tFont').innerHTML = fontOptions(); if (cur) $('#tFont').value = cur;
  $('#tBridge').value = Math.max(3, +S.defThk || 3);
  setTMode(tMode); updateText(); $('#tText').focus();
}
function textOpts() {
  return { text: $('#tText').value, font: $('#tFont').value, mode: tMode, h: Math.max(3, +$('#tH').value || 50), spacing: +$('#tSp').value || 0, lead: Math.max(1, +$('#tLead').value || 1.6), align: $('#tAlign').value,
    bar: Math.max(0, +$('#tBar').value || 0), barPad: Math.max(0, +$('#tBarPad').value || 0), margin: Math.max(2, +$('#tMargin').value || 20), radius: Math.max(0, +$('#tRad').value || 0), hole: Math.max(0, +$('#tHole').value || 0), bridge: Math.max(0, +$('#tBridge').value || 0) };
}
function updateText() {
  clearTimeout(tTimer);
  tTimer = setTimeout(() => {
    if (!window.ClipperLib || !window.opentype) return;
    try {
      tRes = buildTextParts(textOpts()); $('#tErr').textContent = tRes.warn.join(' · ');
      drawTextPreview(tRes.parts);
      const n = tRes.parts.reduce((a, p) => a + p.qty, 0), cut = tRes.parts.reduce((a, p) => a + partInfo(p).cut * p.qty, 0);
      const bb = tRes.parts.length === 1 ? partInfo(tRes.parts[0]) : null;
      $('#tInfo').textContent = `${tRes.parts.length} төрөл, ${n} ширхэг парт · зүсэлт ${nf(cut / 1000, 2)} м` + (bb ? ` · ${nf(bb.w, 1)} × ${nf(bb.h, 1)} мм` : '');
    } catch (err) { tRes = null; $('#tErr').textContent = err.message; drawTextPreview([]); $('#tInfo').textContent = ''; }
  }, 120);
}
function drawTextPreview(parts) {
  const cv = $('#tPrev'), dpr = window.devicePixelRatio || 1, w = cv.clientWidth, h = cv.clientHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
  if (!parts.length) return;
  // lay parts out in a row (letters) or show the single part
  const items = []; let cx = 0, maxH = 0;
  for (const p of parts) { const inf = partInfo(p); items.push({ p, x: cx }); cx += inf.w + (parts.length > 1 ? 8 : 0); maxH = Math.max(maxH, inf.h); }
  const totW = cx, pad = 12, sc = Math.min((w - 2 * pad) / Math.max(totW, 1), (h - 2 * pad) / Math.max(maxH, 1));
  const ox = (w - totW * sc) / 2, oy = (h + maxH * sc) / 2, dark = isDark();
  x.beginPath();
  for (const it of items) for (const lp of [it.p.outer, ...it.p.holes]) { flattenLoop(lp, Math.max(0.05, 0.5 / sc)).forEach((q, i) => { const X = ox + (q[0] + it.x) * sc, Y = oy - q[1] * sc; i ? x.lineTo(X, Y) : x.moveTo(X, Y); }); x.closePath(); }
  x.fillStyle = partColor(tMode === 'plate' ? 1 : 4, dark, 0.9); x.fill('evenodd'); x.lineWidth = 1; x.strokeStyle = cssv('--ink-2'); x.stroke();
}
$('#btnText').addEventListener('click', openText);
$('#tMode').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; setTMode(b.dataset.m); if (b.dataset.m === 'plate') { const f = FONTS.find(z => z.name === $('#tFont').value); $('#tBridge').value = f && f.group === 'stencil' ? 0 : Math.max(3, +S.defThk || 3); } updateText(); });
['tText', 'tFont', 'tH', 'tSp', 'tLead', 'tAlign', 'tBar', 'tBarPad', 'tMargin', 'tRad', 'tHole', 'tBridge'].forEach(id => $('#' + id).addEventListener('input', updateText));
$('#tFontFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { await ensureTextLibs(); const font = opentype.parse(await f.arrayBuffer()); customFonts.push({ name: f.name.replace(/\.[^.]+$/, ''), font }); $('#tFont').innerHTML = fontOptions(); $('#tFont').value = 'custom:' + (customFonts.length - 1); updateText(); toast('Фонт нэмэгдлээ'); }
  catch (err) { toast('Фонт уншигдсангүй — TTF эсвэл OTF файл оруулна уу'); }
});
const closeT = () => { $('#tmodal').hidden = true; };
$('#tX').addEventListener('click', closeT); $('#tCancel').addEventListener('click', closeT);
$('#tmodal').addEventListener('click', e => { if (e.target.id === 'tmodal') closeT(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#tmodal').hidden) closeT(); });
$('#tOk').addEventListener('click', () => {
  if (!tRes || !tRes.parts.length) return;
  const q = Math.max(1, Math.round(+$('#tQty').value || 1));
  for (const p of tRes.parts) S.parts.push({ id: uid(), name: p.name, qty: p.qty * q, mat: S.defMat, thk: S.defThk, rot: true, mir: false, prio: 0, outer: p.outer, holes: p.holes });
  save(); renderParts(); closeT(); toast(`${tRes.parts.length} парт нэмэгдлээ`);
});

/* ---------- desktop (Electron) integration ---------- */
if (window.kh) {
  document.documentElement.classList.add('desktop');
  $('#appBox').hidden = false;
  const UPD = { checking: 'Шинэчлэл шалгаж байна…', latest: 'Хамгийн сүүлийн хувилбар', downloading: 'Шинэ хувилбар татаж байна', ready: 'Шинэ хувилбар бэлэн', error: 'Шинэчлэл шалгаж чадсангүй', unconfigured: 'GitHub хаяг тохируулаагүй', dev: 'Хөгжүүлэлтийн горим', idle: '' };
  const showUpd = s => {
    const b = $('#updBadge');
    $('#appUpd').textContent = (UPD[s.state] || '') + (s.version ? ` · v${s.version}` : '') + (s.state === 'downloading' && s.percent ? ` · ${s.percent}%` : '') + (s.state === 'error' && s.message ? ` (${s.message})` : '');
    if (s.state === 'ready') { b.hidden = false; b.textContent = `v${s.version} бэлэн — дарж суулгана`; b.style.cursor = 'pointer'; $('#appInstall').hidden = false; }
    else if (s.state === 'downloading') { b.hidden = false; b.textContent = `Шинэчлэл татаж байна ${s.percent || 0}%`; }
    else b.hidden = true;
  };
  window.kh.info().then(i => { $('#appVer').textContent = 'v' + i.version; $('#appOwner').value = i.ghOwner; $('#appRepo').value = i.ghRepo; showUpd(i.upd || {}); });
  window.kh.onUpdate(showUpd);
  $('#updBadge').addEventListener('click', () => { if ($('#updBadge').textContent.includes('бэлэн')) window.kh.installUpdate(); });
  $('#appInstall').addEventListener('click', () => window.kh.installUpdate());
  $('#appCheck').addEventListener('click', () => window.kh.checkUpdate());
  $('#appSaveFeed').addEventListener('click', async () => { await window.kh.setFeed($('#appOwner').value, $('#appRepo').value); toast('Шинэчлэлийн хаяг хадгалагдлаа'); });
  window.kh.onOpenFiles(files => {
    const proj = files.filter(f => /\.khnest\.json$/i.test(f.name)), geo = files.filter(f => !/\.khnest\.json$/i.test(f.name));
    if (geo.length) { setModule('nest'); importFiles(geo.map(f => new File([f.data], f.name))); }
    if (proj.length) { try { S = mergeState(JSON.parse(new TextDecoder().decode(proj[0].data))); save(); R = null; renderAll(); toast('Төсөл нээгдлээ'); } catch (e) { toast('Төслийн файл буруу байна'); } }
  });
}
