/* ================= Kh International — automatic preheat (AWS D1.1 prequalified table / SSAB) + standards library =================
   Carbon & C-Mn structural steel: AWS D1.1 prequalified minimum preheat & interpass temperature (Table 5.8 in D1.1:2020,
   Table 3.3 in older editions), by steel category and thickness of the thickest part at the point of welding.
   Hardox / Strenx: SSAB recommended minimum preheat (single plate thickness) and maximum interpass temperature.
   Values are the code / maker minimums — the governing WPS always takes precedence. */
const D11 = { A: [[20, 0], [38, 66], [65, 107], [1e9, 150]], B: [[20, 0], [38, 10], [65, 66], [1e9, 107]], C: [[20, 10], [38, 66], [65, 107], [1e9, 150]], D: [[1e9, 0]] };
const D11_DESC = {
  A: 'SMAW — бага устөрөгчийн бус электрод (E6010, E6013…). ASTM A36, A53, A500 г.м. (S235/S275-тай дүйцэхүйц)',
  B: 'SMAW бага устөрөгчийн электрод (E7018…), SAW, GMAW, FCAW. ASTM A36, A572 Gr50, A992… (S235–S355, 09Г2С-тэй дүйцэхүйц)',
  C: 'B-тэй ижил процесс, өндөр бат бэхийн ган: ASTM A572 Gr60/65, A913 Gr60/65… (S420–S460-тай дүйцэхүйц)',
  D: 'ASTM A913 Gr50–70, бага устөрөгчийн процессоор'
};
/* SSAB: [upper thickness mm, min preheat °C], max interpass °C */
const SSAB_PH = {
  'Hardox HiTuf': [[[40, 0], [70, 100], [160, 125]], 300], 'Hardox 400': [[[20, 0], [45, 75], [50, 100], [80, 175], [100, 200]], 225],
  'Hardox 450': [[[25, 0], [40, 125], [160, 150]], 225], 'Hardox 500': [[[13, 0], [30, 175], [103, 200]], 225],
  'Hardox 500 Tuf': [[[16, 0], [25.4, 75], [35, 125], [38.1, 150]], 225], 'Hardox 550': [[[11, 125], [30, 175], [65, 200]], 225],
  'Hardox 600': [[[10, 150], [30, 175]], 225],
  'Strenx 700 E': [[[30, 0], [45, 75], [160, 100]], 300], 'Strenx 700 F': [[[15, 0], [20, 50], [45, 75], [130, 100]], 300],
  'Strenx 900 E': [[[10, 0], [30, 75], [120, 100]], 300], 'Strenx 960 E': [[[10, 0], [12, 75], [120, 100]], 300],
  'Strenx 960 F': [[[10, 0], [12, 75], [100, 100]], 300], 'Strenx 1100': [[[10, 0], [15, 75], [40, 125]], 200], 'Strenx 1300': [[[8, 0], [10, 100], [15, 125]], 200]
};
const WELD_PROC = [['lowH', 'GMAW / FCAW / SAW / SMAW E7018 (бага устөрөгч)'], ['smaw', 'SMAW — бага устөрөгчийн бус электрод (E6013…)']];
/* classify a material name */
function gradeOf(name) {
  const n = String(name || '').toLowerCase().replace(/\s+/g, ' ');
  let m;
  if (/hardox ?hi ?tuf/.test(n)) return { g: 'Hardox HiTuf', t: 'ssab' };
  if ((m = n.match(/(?:hardox|nm|ar|xar) ?(400|450|500|550|600)( ?tuf)?/))) { const g = 'Hardox ' + m[1] + (m[2] && m[1] === '500' ? ' Tuf' : ''); return { g, t: 'ssab', eq: !/hardox/.test(n) }; }
  if (/hardox/.test(n)) return { g: 'Hardox 450', t: 'ssab', guess: 1 };
  if ((m = n.match(/strenx ?(700|900|960|1100|1300) ?(e|f|mc|plus)?/))) { let g = 'Strenx ' + m[1]; if (m[1] === '700' || m[1] === '960') g += m[2] === 'f' ? ' F' : ' E'; else if (m[1] === '900') g += ' E'; return { g, t: 'ssab' }; }
  if (/зэвэрд|stainless|aisi|\b30[14]l?\b|\b316l?\b|\b321\b/.test(n)) return { g: 'Зэвэрдэггүй (аустенит)', t: 'ss' };
  if (/хөнгөн|цагаан|alum|\b5083\b|\b6061\b|\b5754\b/.test(n)) return { g: 'Хөнгөн цагаан', t: 'al' };
  if (/s4[2-6]0|a572 ?gr ?6[05]|a913 ?gr ?6[05]|q460/.test(n)) return { g: 'S420–S460', t: 'cs', cat: 'C' };
  if (/a913/.test(n)) return { g: 'ASTM A913', t: 'cs', cat: 'D' };
  if (/s355|09г2с|09g2s|a572|a992|q345|q355|ss490|s275|st52/.test(n)) return { g: 'S355 / 09Г2С', t: 'cs', cat: 'B' };
  if (/s235|ст ?3|st ?3|a36|ss400|q235|st37/.test(n)) return { g: 'S235 / Ст3', t: 'cs', cat: 'B' };
  if (/ган|steel|лист|хавтан|труба|профиль|швеллер|уголок|арматур/.test(n)) return { g: 'Нүүрстөрөгчийн ган', t: 'cs', cat: 'B', guess: 1 };
  return null;
}
const thkOf = name => { const m = String(name || '').match(/(\d+(?:[.,]\d+)?)\s*(?:мм|mm)\b/i) || String(name || '').match(/\b(\d+(?:[.,]\d+)?)\s*(?:мм|mm)/i); return m ? +m[1].replace(',', '.') : 0; };
const stepVal = (tab, t) => { for (const [u, v] of tab) if (t <= u + 1e-9) return v; return tab[tab.length - 1][1]; };
/* minimum preheat for one material / thickness */
function preheatFor(matName, t, proc = 'lowH', cold = false) {
  const G = gradeOf(matName) || { g: matName || '—', t: 'cs', cat: 'B', guess: 1 }; let min = 0, max = null, std = '', note = '';
  if (G.t === 'ssab') {
    const [tab, mx] = SSAB_PH[G.g] || SSAB_PH['Hardox 450']; const lo = tab[0];
    min = t < (lo[0] === 40 ? 0 : 0) ? 0 : stepVal(tab, t); max = mx; std = 'SSAB зөвлөмж';
    if (t > tab[tab.length - 1][0]) note = 'Зузаан хүснэгтээс их — SSAB WeldCalc-аар тооцно';
    if (G.eq) note = 'Hardox-той ижил гэж тооцсон — үйлдвэрлэгчийн зөвлөмжийг шалгана';
    if (G.guess) note = 'Hardox зэрэг тодорхойгүй — 450 гэж тооцсон';
    if (proc === 'smaw') note = (note ? note + '; ' : '') + 'SSAB зөвхөн бага устөрөгчийн нэмэлт материал зөвлөдөг';
  } else if (G.t === 'ss') { min = 0; max = 150; std = 'Аустенит зэвэрдэггүй'; note = 'Халаалт шаардлагагүй, interpass ≤150 °C'; }
  else if (G.t === 'al') { min = 0; max = 120; std = 'Хөнгөн цагаан'; note = 'Ихэвчлэн халаалтгүй; чийгийг 50–80 °C хүртэл халааж арилгаж болно'; }
  else { const cat = proc === 'smaw' && G.cat === 'B' ? 'A' : (G.cat || 'B'); min = stepVal(D11[cat], t); std = `AWS D1.1 · Category ${cat}`; if (G.guess) note = 'Ган гэж таамагласан — материалыг тодруулна уу'; }
  if (cold && min < 20) { min = 20; note = (note ? note + '; ' : '') + 'Металл 0 °C-аас хүйтэн бол 20 °C хүртэл халаана'; }
  return { grade: G.g, t, min, max, std, note, type: G.t };
}
const phTxt = r => r.min > 0 ? `${r.min} °C` : 'шаардлагагүй';
/* plates of a job: parts + quote material lines */
function jobWeldRows(job) {
  const W = job.weld || (job.weld = { proc: 'lowH', cold: false }), by = new Map();
  const add = (mat, t, src) => { if (!(t > 0)) return; const G = gradeOf(mat); const k = G ? G.g : mat; const o = by.get(k) || { mat, t: 0, src: new Set() }; if (t > o.t) { o.t = t; o.mat = mat; } o.src.add(src); by.set(k, o); };
  try { jobParts(job).forEach(p => add(p.mat, +p.thk, 'партууд')); } catch (e) { }
  ((job.quote && job.quote.mats) || []).forEach(r => add(r.name + ' ' + (r.note || ''), thkOf(r.name), 'үнийн санал'));
  const rows = [...by.values()].map(o => ({ ...preheatFor(o.mat, o.t, W.proc, W.cold), mat: o.mat, src: [...o.src].join(', ') })).sort((a, b) => b.min - a.min || b.t - a.t);
  return { rows, max: rows.reduce((a, r) => Math.max(a, r.min), 0), W };
}
function preheatHint(list, proc = 'lowH') {
  const rows = list.filter(p => p.thk > 0).map(p => ({ ...preheatFor(p.mat, +p.thk, proc), lbl: p.lbl })), need = rows.filter(r => r.min > 0);
  const top = rows.reduce((a, r) => r.min > a.min ? r : a, { min: 0 });
  return `<div class="phint ${need.length ? 'need' : ''}"><b>🔥 Халаалт:</b> ${need.length ? `хамгийн багадаа <b>${top.min} °C</b> (${esc(top.grade)}, ${top.t} мм — ${esc(top.std)})` : 'шаардлагагүй'}${need.length > 1 ? ' · ' + need.slice(1).map(r => `${esc(r.grade)} ${r.t} мм → ${r.min} °C`).join(' · ') : ''}${top.max ? ` · interpass ≤ ${top.max} °C` : ''}</div>`;
}
/* scope-tab card */
function weldCardHTML(job) {
  const { rows, max, W } = jobWeldRows(job);
  return `<div class="jcard"><div class="bcard-h">Гагнуур · урьдчилан халаалт (автомат) <span class="sp"></span><span class="muted" style="font-weight:400;font-size:12px">AWS D1.1 · SSAB</span></div><div class="jbody">
    <div class="jgrid"><label class="fld">Гагнуурын процесс<select id="w_proc">${WELD_PROC.map(([k, n]) => `<option value="${k}"${W.proc === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="check" style="align-self:end"><input type="checkbox" id="w_cold"${W.cold ? ' checked' : ''}><span>Хүйтэн улиралд (металл 0 °C-аас доош)</span></label></div>
    ${rows.length ? `<div class="phint ${max ? 'need' : ''}"><b>🔥 Энэ ажилд:</b> ${max ? `урьдчилан халаалт <b>${max} °C</b>-аас багагүй. Гагнуурын тэнхлэгээс хоёр тийш зузаанаас багагүй, 75 мм-ээс багагүй зайд халаана.` : 'урьдчилан халаалт шаардлагагүй.'}</div>
    <div class="tblwrap"><table class="dt"><thead><tr><th>Материал</th><th>Ангилал</th><th class="r">Хамгийн их зузаан, мм</th><th class="r">Халаалт, min</th><th class="r">Interpass, max</th><th>Эх үүсвэр</th><th>Тайлбар</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${esc(r.mat)}</td><td>${esc(r.grade)}</td><td class="r num">${r.t}</td><td class="r num ${r.min ? 'late' : ''}">${phTxt(r)}</td><td class="r num">${r.max ? r.max + ' °C' : '—'}</td><td>${esc(r.std)}</td><td style="white-space:normal">${esc(r.note || r.src)}</td></tr>`).join('')}
    </tbody></table></div>${max ? '<div class="exports"><button class="btn sm" id="w_toQuote">Халаалтын зардлыг үнийн саналд нэмэх</button></div>' : ''}` : '<p class="note">Ажилд парт эсвэл үнийн саналд зузаантай материал (жишээ: «Hardox 450 20мм») ормогц халаалт автоматаар тооцогдоно.</p>'}
    <p class="note">AWS D1.1-ийн урьдчилан баталгаажсан (prequalified) хамгийн бага утга. Hardox, Strenx-д SSAB-ийн зөвлөмж. Батлагдсан WPS байвал түүнийг мөрдөнө.</p>
  </div></div>`;
}
function bindWeldCard(root, job, re) {
  const p = root.querySelector('#w_proc'); if (!p) return;
  p.addEventListener('change', () => { job.weld.proc = p.value; save(); re(); });
  root.querySelector('#w_cold').addEventListener('change', e => { job.weld.cold = e.target.checked; save(); re(); });
  const q = root.querySelector('#w_toQuote'); if (q) q.addEventListener('click', () => { const mx = jobWeldRows(job).max; jx(job); job.quote.equipRows = job.quote.equipRows.filter(r => !r.ph); job.quote.equipRows.push({ name: `Урьдчилан халаалт ${mx} °C (хий, шарагч / индукц)`, qty: 1, unit: 'иж', price: 0, note: 'AWS D1.1 / SSAB — үнийг оруулна', ph: 1 }); save(); toast('Үнийн санал → D хэсэгт нэмэгдлээ, үнийг оруулна уу'); });
}

/* ---------- standards library: info tab «Стандарт» ---------- */
const DOCS_DB = 'kh-docs';
function idb() { return new Promise((res, rej) => { const r = indexedDB.open(DOCS_DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('docs', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
async function docsAll() { try { const db = await idb(); return await new Promise(res => { const out = []; const c = db.transaction('docs').objectStore('docs').openCursor(); c.onsuccess = () => { const k = c.result; if (k) { const v = k.value; out.push({ id: v.id, name: v.name, size: v.size, added: v.added, tag: v.tag }); k.continue(); } else res(out); }; c.onerror = () => res(out); }); } catch (e) { return []; } }
async function docGet(id) { const db = await idb(); return new Promise(res => { const r = db.transaction('docs').objectStore('docs').get(id); r.onsuccess = () => res(r.result); r.onerror = () => res(null); }); }
async function docPut(o) { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction('docs', 'readwrite'); t.objectStore('docs').put(o); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }
async function docDel(id) { const db = await idb(); return new Promise(res => { const t = db.transaction('docs', 'readwrite'); t.objectStore('docs').delete(id); t.oncomplete = () => res(); }); }
const STDV = { calc: { mat: 'S355 / 09Г2С', t: 25, proc: 'lowH', cold: false }, open: null };
async function renderStdSide() {
  const el = $('#stdDocs'); if (!el) return; const list = await docsAll();
  el.innerHTML = list.length ? list.map(d => `<div class="jitem${STDV.open === d.id ? ' on' : ''}" data-doc="${d.id}"><span class="no" style="font-family:inherit">${esc(d.name)}</span><button class="x" data-ddel="${d.id}" aria-label="Устгах">×</button><span class="t">${esc(d.tag || '')} · ${nf(d.size / 1048576, 1)} MB · ${esc(d.added)}</span></div>`).join('') : '<p class="note">Хавсаргасан стандарт алга.</p>';
}
async function renderStdMain(el) {
  const C = STDV.calc, r = preheatFor(C.mat, +C.t || 0, C.proc, C.cold);
  const mats = [...new Set(S.materials.map(m => m.name).concat(Object.keys(SSAB_PH)))];
  let viewer = '';
  if (STDV.open) { const d = await docGet(STDV.open); if (d) { if (STDV.url) URL.revokeObjectURL(STDV.url); STDV.url = URL.createObjectURL(d.blob); viewer = `<div class="jcard"><div class="bcard-h">${esc(d.name)} <span class="sp"></span><button class="btn sm" id="stdSave">Компьютерт хадгалах</button><button class="btn sm ghost" id="stdClose">Хаах</button></div><iframe class="stdview" src="${STDV.url}#view=FitH" title="${esc(d.name)}"></iframe></div>`; } }
  const tbl = (rows, head) => `<div class="tblwrap"><table class="dt"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  const rng = tab => tab.length === 1 && tab[0][0] >= 1e8 ? `Бүх зузаан: <b>${tab[0][1] ? tab[0][1] + ' °C' : '—'}</b>` : tab.map(([u, v], i) => `${i ? '>' + tab[i - 1][0] : '≤'}${u >= 1e8 ? '' : (i ? '–' : '') + u} мм: <b>${v ? v + ' °C' : '—'}</b>`.replace('≤', '≤ ').replace(/^>(\d+(?:\.\d+)?)$/, '> $1')).join(' · ');
  el.innerHTML = `${viewer}
    <div class="jcard"><div class="bcard-h">Урьдчилан халаалтын тооцоолуур</div><div class="jbody">
      <div class="jgrid"><label class="fld">Материал<input id="sc_mat" list="stdMats" value="${esc(C.mat)}"><datalist id="stdMats">${mats.map(m => `<option value="${esc(m)}">`).join('')}</datalist></label>
        <label class="fld">Хамгийн зузаан хэсэг, мм<input id="sc_t" type="number" min="1" step="1" value="${C.t}" class="mono"></label>
        <label class="fld">Процесс<select id="sc_proc">${WELD_PROC.map(([k, n]) => `<option value="${k}"${C.proc === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="check" style="align-self:end"><input type="checkbox" id="sc_cold"${C.cold ? ' checked' : ''}><span>Металл 0 °C-аас доош</span></label></div>
      <div class="summary">${[['Урьдчилан халаалт', r.min ? r.min + '<small>°C</small>' : '—', r.min ? 'хамгийн бага' : 'шаардлагагүй'], ['Interpass', r.max ? '≤' + r.max + '<small>°C</small>' : '—', 'хамгийн их'], ['Ангилал', esc(r.grade), esc(r.std)], ['Халаах бүс', `${Math.max(75, +C.t || 0)}<small>мм</small>`, 'тэнхлэгээс хоёр тийш']].map(s => `<div class="stat"><div class="k">${s[0]}</div><div class="v" style="white-space:normal;font-size:16px">${s[1]}</div><div class="s">${s[2]}</div></div>`).join('')}</div>
      ${r.note ? `<p class="note">${esc(r.note)}</p>` : ''}
    </div></div>
    <div class="jcard"><div class="bcard-h">AWS D1.1 — урьдчилан баталгаажсан халаалт (хураангуй)</div><div class="jbody">
      ${tbl(['A', 'B', 'C', 'D'].map(k => `<tr><td><b>${k}</b></td><td style="white-space:normal">${esc(D11_DESC[k])}</td><td style="white-space:normal">${rng(D11[k])}</td></tr>`), ['Ангилал', 'Ган, процесс', 'Хамгийн их зузаан → хамгийн бага халаалт'])}
      <ul class="stdl"><li>Зузааныг гагнах цэг дээрх хамгийн зузаан эд ангиар авна.</li><li>Хүснэгтэд «—» байсан ч металл 0 °C-аас хүйтэн бол 20 °C хүртэл халааж, гагнуурын турш барина.</li><li>Гагнуурын тэнхлэгээс бүх чиглэлд зузаантай тэнцүү, гэхдээ 75 мм-ээс багагүй зайд халаана.</li><li>Interpass температур мөн адил хамгийн бага утгаас доош унах ёсгүй.</li><li>Урьдчилан баталгаажаагүй (non-prequalified) материал, нөхцөлд PQR-аар баталгаажсан WPS шаардлагатай.</li></ul>
      <p class="note">Энэ бол хураангуй. Стандартын албан ёсны текстийг AWS худалдаалдаг тул програмд хавсаргаагүй. Танай компанид байгаа D1.1-ийн хувийг зүүн талын «Стандарт хавсаргах» товчоор оруулбал энд нээгдэнэ.</p>
    </div></div>
    <div class="jcard"><div class="bcard-h">Hardox / Strenx — SSAB зөвлөмж <span class="sp"></span><a class="linkbtn" href="https://www.ssab.com/en/support/how-to-process/how-to-weld" target="_blank" rel="noopener">ssab.com ↗</a></div><div class="jbody">
      ${tbl(Object.entries(SSAB_PH).map(([g, [tab, mx]]) => `<tr><td><b>${esc(g)}</b></td><td style="white-space:normal">${rng(tab)}</td><td class="r num">${mx} °C</td></tr>`), ['Зэрэг', 'Хавтангийн зузаан → хамгийн бага халаалт', 'Interpass max'])}
      <p class="note">Нэг хавтангийн зузаанаар. Өөр өөр зузаан, зэрэгтэй хавтанг холбоход өндөр шаардлагатайг нь мөрдөнө. Нэмэлт материал заавал бага устөрөгчийн (≤5 мл/100 г) байна.</p>
    </div></div>`;
  const up = () => { C.mat = el.querySelector('#sc_mat').value; C.t = +el.querySelector('#sc_t').value || 0; C.proc = el.querySelector('#sc_proc').value; C.cold = el.querySelector('#sc_cold').checked; renderStdMain(el); };
  ['#sc_mat', '#sc_t', '#sc_proc', '#sc_cold'].forEach(s => el.querySelector(s).addEventListener('change', up));
  const sv = el.querySelector('#stdSave'); if (sv) sv.addEventListener('click', async () => { const d = await docGet(STDV.open); if (d) saveFile(d.name, d.blob); });
  const cl = el.querySelector('#stdClose'); if (cl) cl.addEventListener('click', () => { STDV.open = null; renderStdSide(); renderStdMain(el); });
}
(() => {
  const L = $('#stdDocs'); if (!L) return;
  $('#stdAdd').addEventListener('click', () => $('#stdFile').click());
  $('#stdFile').addEventListener('change', async e => {
    const fs = [...e.target.files]; e.target.value = ''; let n = 0;
    for (const f of fs) { try { await docPut({ id: uid(), name: f.name, size: f.size, added: today(), tag: /d1\.1|aws/i.test(f.name) ? 'AWS D1.1' : (f.name.split('.').pop() || '').toUpperCase(), blob: f }); n++; } catch (err) { toast('Хадгалж чадсангүй: ' + f.name); } }
    if (n) toast(`${n} файл стандартын санд нэмэгдлээ`); renderStdSide();
  });
  L.addEventListener('click', async e => {
    const d = e.target.closest('[data-ddel]'); if (d) { e.stopPropagation(); if (!d.dataset.arm) { d.dataset.arm = 1; d.textContent = '?'; setTimeout(() => { delete d.dataset.arm; d.textContent = '×'; }, 2500); return; } await docDel(d.dataset.ddel); if (STDV.open === d.dataset.ddel) STDV.open = null; renderStdSide(); renderInfoMain(); return; }
    const it = e.target.closest('[data-doc]'); if (!it) return; STDV.open = it.dataset.doc; renderStdSide(); renderInfoMain();
  });
})();
