/* ================= KH Fab — «Мэдээлэл · сан»: mining machines, bucket types, product templates, own file library ================= */
const IN = { tab: 'cat', cat: 'all', q: '', sel: null, bt: null, tpl: 'pegboard', lib: null, p: {} };
let LIB = (() => { try { return JSON.parse(localStorage.getItem('kh-lib') || '[]'); } catch (e) { return []; } })();
function saveLib() { try { localStorage.setItem('kh-lib', JSON.stringify(LIB)); return true; } catch (e) { toast('Санд хадгалах зай дүүрсэн — хуучин зүйлсээ устгана уу', 6000); return false; } }
const catName = c => (MCAT.find(x => x[0] === c) || [, c])[1];
const fmtN = (v, d, u) => v == null ? '—' : `${nf(v, d)}${u ? ' ' + u : ''}`;
const capTxt = m => !m.cap ? '—' : m.cap[0] === m.cap[1] ? `${nf(m.cap[0], 1)} м³` : `${nf(m.cap[0], 1)}–${nf(m.cap[1], 1)} м³`;
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };

/* ---------- machine → bucket preset ---------- */
function bucketPreset(m, V, type) {
  const B = bucketDefaults(), cat = m.cat, wt = m.w || (m.pay ? m.pay * 2.8 : 30);
  const ix = (() => { const j = [1.2, 3, 6, 10, 16].findIndex(x => V < x); return j < 0 ? 5 : j; })(), step = (v, arr) => arr[ix];
  const heavy = type === 'rock' || type === 'xhd' || cat === 'lhd';
  const hx = pickMat(/hardox\s*500/i, pickMat(/hardox|элэгд/i)), hx45 = pickMat(/hardox|элэгд/i), s355 = pickMat(/s355|09г2с/i);
  B.name = `${m.make} ${m.model} шанага ${nf(V, 1)} м³`;
  const k = cat === 'wl' ? 1.9 : cat === 'lhd' ? 1.45 : 1.12;
  B.W = Math.round((m.bw ? m.bw - 2 * step(V, [12, 16, 20, 25, 30, 40]) : 1000 * k * Math.cbrt(V)) / 10) * 10;
  const shape = cat === 'wl' ? { h: 0.85, r: 0.36, a: 10, lip: 0.2 } : cat === 'lhd' ? { h: 0.7, r: 0.3, a: 8, lip: 0.2 } : { h: 0.92, r: 0.4, a: 25, lip: 0.16 };
  B.alpha = shape.a;
  B.side = { mat: s355, thk: step(V, [12, 16, 20, 25, 30, 40]) }; B.top = { mat: s355, thk: B.side.thk };
  B.wrap = { mat: heavy ? hx : hx45, thk: step(V, [10, 12, 16, 20, 25, 30]) + (heavy ? 4 : 0) };
  B.lip = { mat: heavy ? hx : hx45, thk: step(V, [25, 35, 50, 60, 80, 100]) };
  B.ear = { mat: s355, thk: step(V, [30, 40, 50, 60, 80, 100]) }; B.wear = { mat: heavy ? hx : hx45, thk: B.wrap.thk };
  B.pin = Math.round(28 * Math.pow(wt, 0.36) / 5) * 5; B.pitch = Math.round(5.5 * B.pin / 10) * 10; B.hc = Math.round(1.9 * B.pin / 5) * 5; B.boss = Math.round(0.6 * B.pin / 5) * 5; B.earQty = 4;
  B.wearN = Math.max(2, Math.round(B.W / 400)); B.wearW = Math.round(Math.min(200, Math.max(80, V * 20 + 60)) / 10) * 10; B.cutter = cat !== 'lhd'; B.cutterW = Math.round(Math.min(250, 80 + V * 10) / 10) * 10;
  // scale the profile until the heaped capacity matches
  const set = s => { B.D = Math.round(s); B.H = Math.round(s * shape.h); B.R = Math.round(s * shape.r); B.lipL = Math.round(s * shape.lip); B.topD = Math.round(s * 0.22); };
  let lo = 150, hi = 8000;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; set(mid); const c = bucketCalc(B); const v = c.err.length ? 0 : c.Vh; if (v < V) lo = mid; else hi = mid; }
  set(hi);
  return B;
}

/* ---------- side panel ---------- */
$$('[data-itab]').forEach(b => b.addEventListener('click', () => { IN.tab = b.dataset.itab; renderInfo(); }));
function renderInfo() {
  $$('[data-itab]').forEach(x => x.classList.toggle('on', x.dataset.itab === IN.tab));
  ['mach', 'bt', 'tpl', 'lib', 'std', 'cat', 'org'].forEach(t => $('#itab-' + t).hidden = t !== IN.tab);
  if (IN.tab === 'mach') renderMachList(); else if (IN.tab === 'bt') renderBtList(); else if (IN.tab === 'tpl') renderTplList(); else if (IN.tab === 'std') { renderStdSide(); renderInfoMain(); } else if (IN.tab === 'cat') { renderCatSide(); renderInfoMain(); } else if (IN.tab === 'org') { renderOrgSide(); } else renderLibSide();
  renderInfoMain();
}
function renderMachList() {
  $('#mCats').innerHTML = [['all', 'Бүгд'], ...MCAT].map(([k, n]) => `<button class="chip${IN.cat === k ? ' on' : ''}" data-c="${k}">${esc(n)} <span class="mono">${k === 'all' ? MACHINES.length : MACHINES.filter(m => m.cat === k).length}</span></button>`).join('');
  const q = IN.q.toLowerCase(), list = MACHINES.filter(m => (IN.cat === 'all' || m.cat === IN.cat) && (!q || `${m.make} ${m.model}`.toLowerCase().includes(q)));
  $('#mList').innerHTML = list.map(m => `<div class="jitem${IN.sel === m.id ? ' on' : ''}" data-id="${m.id}"><span class="no">${esc(m.make)} ${esc(m.model)}</span><span class="pill">${esc(catName(m.cat).split(' (')[0].split(',')[0])}</span><span class="t mono">${[m.pay ? nf(m.pay, 1) + ' т даац' : '', m.w ? nf(m.w, 1) + ' т' : m.gvw ? 'GVW ' + nf(m.gvw, 0) + ' т' : '', capTxt(m)].filter(x => x && x !== '—').join(' · ')}</span></div>`).join('') || '<div class="emptyp">Олдсонгүй.</div>';
}
$('#mCats').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; IN.cat = b.dataset.c; renderMachList(); });
$('#mSearch').addEventListener('input', e => { IN.q = e.target.value; renderMachList(); });
$('#mList').addEventListener('click', e => { const it = e.target.closest('.jitem'); if (!it) return; IN.sel = it.dataset.id; renderMachList(); renderInfoMain(); });
function renderBtList() {
  $('#btList').innerHTML = BTYPES.map(b => `<div class="jitem${IN.bt === b.id ? ' on' : ''}" data-id="${b.id}"><span class="no">${esc(b.name)}</span><span class="t">${esc(b.use)}</span></div>`).join('');
}
$('#btList').addEventListener('click', e => { const it = e.target.closest('.jitem'); if (!it) return; IN.bt = it.dataset.id; renderBtList(); renderInfoMain(); });
function renderTplList() {
  const all = [['bucket', 'Шанага (параметрт)', 'Уурхай'], ...Object.entries(TPL).map(([k, t]) => [k, t.name, t.cat])];
  $('#tplList').innerHTML = all.map(([k, n, c]) => `<div class="jitem${IN.tpl === k ? ' on' : ''}" data-id="${k}"><span class="no">${esc(n)}</span><span class="pill">${esc(c)}</span></div>`).join('');
}
$('#tplList').addEventListener('click', e => { const it = e.target.closest('.jitem'); if (!it) return; if (it.dataset.id === 'bucket') { J.tab = 'kits'; J.bucket = true; BK.edit = null; $$('[data-jtab]').forEach(x => x.classList.toggle('on', x.dataset.jtab === 'kits')); ['jobs', 'kits', 'certs', 'dockets'].forEach(t => $('#jtab-' + t).hidden = t !== 'kits'); setModule('jobs'); return; } IN.tpl = it.dataset.id; renderTplList(); renderInfoMain(); });
function renderLibSide() {
  $('#extLinks').innerHTML = EXTLIBS.map(x => `<div class="jitem"><span class="no"><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a></span><span class="pill">${esc(x.kind)}</span><span class="t">${esc(x.lic)}</span></div>`).join('');
  $('#libCount').textContent = LIB.length ? `${LIB.length} зүйл` : '';
}

/* ---------- main panel ---------- */
function renderInfoMain() {
  const el = $('#infoMain'); const oldV = V3D.get($('#tpl3d') || {}); if (oldV && IN.tab !== 'tpl') oldV.dispose();
  if (IN.tab === 'mach') return IN.sel ? renderMachine(el, MACHINES.find(m => m.id === IN.sel)) : renderMachOverview(el);
  if (IN.tab === 'bt') return renderBucketTypes(el);
  if (IN.tab === 'tpl') return renderTemplate(el);
  if (IN.tab === 'std') return renderStdMain(el);
  if (IN.tab === 'cat') return renderCatMain(el);
  if (IN.tab === 'org') return renderOrgMain(el);
  return renderLib(el);
}
function renderMachOverview(el) {
  el.innerHTML = `<div class="jcard"><div class="bcard-h">Уул уурхайн техникийн сан</div><div class="jbody">
    <p style="margin:0 0 8px">Монголын уурхайнуудад түгээмэл ашиглагддаг ${MACHINES.length} техникийн үндсэн үзүүлэлт. Техник сонгоод шанагыг нь параметрээр үүсгэж, иж бүрдэл, DXF, STEP, Inventor iLogic болгоно.</p>
    <p class="note" style="margin:0">Үзүүлэлтүүдийг үйлдвэрлэгч, дилерийн техникийн хуудаснаас авсан (эх сурвалжийг техник бүрт заасан). Тохиргоо, зах зээлээс хамаарч өөр байж болно — үнийн санал өгөхөөс өмнө машины өөрийн паспортоор шалгана уу.</p></div></div>
    ${MCAT.map(([c, n]) => { const ms = MACHINES.filter(m => m.cat === c); return `<div class="jcard"><div class="bcard-h">${esc(n)} <span class="sp"></span><span class="muted mono" style="font-weight:400">${ms.length}</span></div>
      <div class="tblwrap" style="border:0"><table class="dt"><thead><tr><th>Үйлдвэрлэгч</th><th>Загвар</th><th class="r">${c === 'truck' ? 'Даац, т' : c === 'lhd' ? 'Даац, т' : 'Ажлын жин, т'}</th><th class="r">${c === 'truck' ? 'Нийт жин, т' : 'Хөдөлгүүр, кВт'}</th><th class="r">${c === 'truck' ? 'Тэвш' : c === 'dozer' ? 'Ир' : 'Шанага'}</th>${c === 'truck' ? '<th class="r">Хөдөлгүүр, кВт</th>' : ''}</tr></thead><tbody>
      ${ms.map(m => `<tr class="jrow" data-id="${m.id}" style="cursor:pointer"><td>${esc(m.make)}</td><td><b>${esc(m.model)}</b></td><td class="r num">${c === 'truck' || c === 'lhd' ? fmtN(m.pay, 1) : fmtN(m.w, 1)}</td><td class="r num">${c === 'truck' ? fmtN(m.gvw, 1) : fmtN(m.kW, 0)}</td><td class="r num">${capTxt(m)}</td>${c === 'truck' ? `<td class="r num">${fmtN(m.kW, 0)}</td>` : ''}</tr>`).join('')}
      </tbody></table></div></div>`; }).join('')}`;
  el.querySelectorAll('.jrow').forEach(r => r.addEventListener('click', () => { IN.sel = r.dataset.id; renderMachList(); renderInfoMain(); }));
}
function renderMachine(el, m) {
  const canB = ['lhd', 'exc', 'wl'].includes(m.cat) && m.cap;
  const caps = !m.cap ? [] : [...new Set([m.std, m.cap[0], (m.cap[0] + m.cap[1]) / 2, m.cap[1]].filter(v => v > 0).map(v => Math.round(v * 10) / 10))].sort((a, b) => a - b);
  const types = BTYPES.filter(b => b.for.split(' ').includes(m.cat));
  const rows = [
    m.pay != null ? [m.cat === 'lhd' ? 'Даац (tramming)' : 'Даац', `${nf(m.pay, 1)} т`] : null,
    m.w != null ? [m.cat === 'truck' ? 'Хоосон жин' : 'Ажлын жин', `${nf(m.w, 1)} т`] : null,
    m.gvw != null ? ['Нийт жин (GVW)', `${nf(m.gvw, 1)} т`] : null,
    m.kW != null ? ['Хөдөлгүүр', `${nf(m.kW)} кВт`] : null,
    m.cap ? [m.cat === 'truck' ? 'Тэвш (овоолсон)' : m.cat === 'dozer' ? 'Ирний багтаамж' : 'Шанага', capTxt(m) + (m.std ? ` · стандарт ${nf(m.std, 1)} м³` : '')] : null,
    m.bw ? ['Шанагын өргөн', `${nf(m.bw)} мм`] : null
  ].filter(Boolean);
  el.innerHTML = `
    <div class="bhead" style="align-items:center"><div style="flex:1"><div class="muted" style="font-size:12px">${esc(catName(m.cat))}</div><div style="font-size:20px;font-weight:700">${esc(m.make)} ${esc(m.model)}</div></div><button class="btn ghost" id="mBack">← Бүх техник</button></div>
    <div class="bgrid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
      <div class="bcard"><div class="bcard-h">Үзүүлэлт</div><div class="tblwrap"><table class="dt" style="min-width:0;width:100%"><tbody>${rows.map(r => `<tr><td>${esc(r[0])}</td><td class="r num"><b>${esc(r[1])}</b></td></tr>`).join('')}</tbody></table></div>
        ${m.note ? `<div class="jbody"><p class="note" style="margin:0">${esc(m.note)}</p></div>` : ''}
        <div class="jbody"><div class="muted" style="font-size:12px">Эх сурвалж</div>${m.src.map(u => `<div><a href="${esc(u)}" target="_blank" rel="noopener">${esc(host(u))}</a></div>`).join('')}</div></div>
      <div class="bcard"><div class="bcard-h">Kh International-д хийх боломжтой</div><div class="jbody"><ul style="margin:0;padding-left:18px;line-height:1.8">${(MFAB[m.cat] || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        ${canB ? `<div class="jbody" style="border-top:1px solid var(--line-2)"><div style="font-weight:600;margin-bottom:6px">Шанага үүсгэх</div>
          <div class="grid2"><label class="fld">Багтаамж, м³<select id="mCap">${caps.map(v => `<option value="${v}"${v === (m.std || caps[0]) ? ' selected' : ''}>${nf(v, 1)}</option>`).join('')}</select></label>
          <label class="fld">Төрөл<select id="mType">${types.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label></div>
          <div class="addrow"><button class="btn primary" id="mMake">Шанага үүсгэгч рүү</button></div>
          <p class="note">Хэмжээг багтаамжаас тооцсон эхлэх утга. Пин, чихний хоорондын зай, амны хэмжээг машин дээрээс заавал хэмжиж оруулна.</p></div>` : ''}
      </div>
    </div>
    ${types.length ? `<div class="jcard"><div class="bcard-h">Энэ төрлийн техникт хэрэглэгддэг шанага</div><div class="tblwrap" style="border:0"><table class="dt" style="min-width:0;width:100%"><thead><tr><th>Төрөл</th><th>Хэрэглээ</th><th>Бүтэц</th><th>Материал</th></tr></thead><tbody>${types.map(t => `<tr><td><b>${esc(t.name)}</b></td><td>${esc(t.use)}</td><td>${esc(t.build)}</td><td>${esc(t.mat)}</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
  $('#mBack').addEventListener('click', () => { IN.sel = null; renderMachList(); renderInfoMain(); });
  if (canB) $('#mMake').addEventListener('click', () => {
    S.bucket = bucketPreset(m, +$('#mCap').value, $('#mType').value); save();
    J.tab = 'kits'; J.bucket = true; BK.edit = null; $$('[data-jtab]').forEach(x => x.classList.toggle('on', x.dataset.jtab === 'kits')); ['jobs', 'kits', 'certs', 'dockets'].forEach(t => $('#jtab-' + t).hidden = t !== 'kits');
    setModule('jobs'); toast('Шанагын эхлэх хэмжээ бэлэн — пин, чихний хэмжээг шалгана уу', 4500);
  });
}
function renderBucketTypes(el) {
  const sel = BTYPES.find(b => b.id === IN.bt);
  el.innerHTML = `
    ${sel ? `<div class="jcard"><div class="bcard-h">${esc(sel.name)}</div><div class="jbody"><table class="dt" style="min-width:0;width:100%"><tbody><tr><td style="width:120px">Хэрэглээ</td><td>${esc(sel.use)}</td></tr><tr><td>Бүтэц</td><td>${esc(sel.build)}</td></tr><tr><td>Материал</td><td>${esc(sel.mat)}</td></tr><tr><td>Техник</td><td>${sel.for.split(' ').map(c => esc(catName(c))).join(', ')}</td></tr></tbody></table></div></div>` : ''}
    <div class="jcard"><div class="bcard-h">Шанагын хэмжээ сонгох тооцоо</div><div class="jbody">
      <div class="jgrid">
        <label class="fld">Материал<select id="bcMat">${DENS.map(([n, d], i) => `<option value="${d}">${esc(n)} — ${d} т/м³</option>`).join('')}</select></label>
        <label class="fld">Нягт, т/м³ (сул)<input id="bcRho" type="number" step="0.05" value="${DENS[0][1]}"></label>
        <label class="fld">Шанагын даац, т<input id="bcPay" type="number" step="0.5" value="15"></label>
        <label class="fld">Дүүргэлтийн коэффициент<input id="bcFill" type="number" step="0.05" value="0.9"></label>
      </div>
      <p id="bcOut" style="font-size:16px;margin:10px 0 0"></p>
      <p class="note">Шаардлагатай багтаамж = даац ÷ (сул нягт × дүүргэлт). Нягт нь гарын авлагын ерөнхий утга, өөрийн уурхайн материалаар засна уу. Машины даацаас хэтэрсэн шанага хийхгүй.</p>
    </div></div>
    <div class="jcard"><div class="bcard-h">Шанагын төрлүүд</div><div class="tblwrap" style="border:0"><table class="dt" style="min-width:0;width:100%"><thead><tr><th>Төрөл</th><th>Хэрэглээ</th><th>Бүтэц</th><th>Материал</th></tr></thead><tbody>${BTYPES.map(t => `<tr${t.id === IN.bt ? ' style="background:var(--accent-soft)"' : ''}><td><b>${esc(t.name)}</b></td><td>${esc(t.use)}</td><td>${esc(t.build)}</td><td>${esc(t.mat)}</td></tr>`).join('')}</tbody></table></div></div>`;
  const calc = () => { const rho = +$('#bcRho').value || 1, pay = +$('#bcPay').value || 0, fill = +$('#bcFill').value || 0.9; $('#bcOut').innerHTML = `Шаардлагатай багтаамж ≈ <b class="mono">${nf(pay / (rho * fill), 2)} м³</b>`; };
  $('#bcMat').addEventListener('change', e => { $('#bcRho').value = e.target.value; calc(); });
  ['bcRho', 'bcPay', 'bcFill'].forEach(id => $('#' + id).addEventListener('input', calc)); calc();
}

/* ---------- templates ---------- */
function tplParams(id) { const T = TPL[id]; if (!IN.p[id]) { IN.p[id] = {}; T.params.forEach(q => IN.p[id][q[0]] = q[2]); } return IN.p[id]; }
function renderTemplate(el) {
  const T = TPL[IN.tpl], p = tplParams(IN.tpl); let r;
  try { r = T.build(p); } catch (e) { el.innerHTML = `<div class="warnbox">${esc(e.message)}</div>`; return; }
  const mat = S.materials.some(x => x.name === T.mat) ? T.mat : S.defMat, dark = isDark();
  const kg = r.parts.reduce((a, q) => a + partInfo(q).area * q.thk * matOf(mat).rho / 1e6 * q.qty, 0);
  el.innerHTML = `
    <div class="bhead" style="align-items:center"><div style="flex:1"><div style="font-size:18px;font-weight:700">${esc(T.name)}</div><div class="note" style="margin:2px 0 0">${esc(T.desc)}</div></div></div>
    <div class="bgrid" style="grid-template-columns:minmax(240px,320px) minmax(0,1fr)">
      <div class="bcard"><div class="bcard-h">Хэмжээ, мм</div><div class="jbody"><div class="grid2">${T.params.map(([k, l, d, st]) => `<label class="fld"><span>${esc(l)}</span><input data-tp="${k}" type="number" step="${st}" value="${p[k]}" class="mono"></label>`).join('')}</div>
        <label class="fld" style="margin-top:8px">Материал<select id="tpMat">${matOptions(mat)}</select></label>
        <div class="addrow"><button class="btn sm ghost" id="tpReset">Анхны утга</button></div></div></div>
      <div class="bcard"><div class="bcard-h">3D <span class="sp"></span><span class="muted" style="font-weight:400;font-size:12px">хулганаар эргүүлж, томруулна</span></div><div id="tpl3d" class="v3d"></div></div>
    </div>
    <div class="summary">${[['Эд анги', `${r.parts.length}<small>төрөл</small>`, `${r.parts.reduce((a, q) => a + q.qty, 0)} ширхэг`], ['Жин', `${nf(kg, 1)}<small>кг</small>`, esc(mat)], ['Тэмдэглэл', '', r.info || '']].map(s => `<div class="stat"><div class="k">${s[0]}</div><div class="v">${s[1]}</div><div class="s">${s[2]}</div></div>`).join('')}</div>
    <div class="jcard"><div class="bcard-h">Хавтгай эд ангиуд (лазер)</div><div class="tblwrap" style="border:0"><table class="dt"><thead><tr><th style="width:60px"></th><th>Нэр</th><th class="r">Зузаан</th><th class="r">Дэлгэмэл, мм</th><th class="r">Нүх</th><th class="r">Нугалаа</th><th class="r">Тоо</th></tr></thead><tbody>
      ${r.parts.map((q, i) => { const inf = partInfo(q); return `<tr><td><canvas class="thumb" style="width:44px;height:44px" data-i="${i}"></canvas></td><td>${esc(q.name)}</td><td class="r num">${q.thk}</td><td class="r num">${nf(inf.w, 1)} × ${nf(inf.h, 1)}</td><td class="r num">${q.holes.length}</td><td class="r num">${(q.bends || []).length}</td><td class="r num">${q.qty}</td></tr>`; }).join('')}
    </tbody></table></div></div>
    <div class="exports">
      <button class="btn primary" id="tpKit">Иж бүрдэл үүсгэх</button>
      <button class="btn" id="tpNest">Nesting руу ×</button><input id="tpN" type="number" min="1" value="1" class="inp mono" style="width:64px">
      <button class="btn" id="tpIl">Inventor iLogic</button>
      <button class="btn" id="tpStep">STEP</button>
      <button class="btn" id="tpStl">STL</button>
      <button class="btn" id="tpDxf">DXF (дэлгэмэл)</button>
    </div>
    <p class="note">Нугалах эд ангийн дэлгэмэлийг дотор R = зузаан, DIN 6935 K-аар тооцсон. Bending модулийн багажаар шалгаад шаардлагатай бол засна. 3D/STEP-д нугалаасыг шулуун хана болгож харуулсан.</p>`;
  el.querySelectorAll('canvas.thumb').forEach(c => drawPartBox(c, r.parts[+c.dataset.i], partColor(+c.dataset.i, dark, 0.85)));
  show3D($('#tpl3d'), worldSolids(r)).catch(e => { $('#tpl3d').innerHTML = `<div class="emptyp">3D сан ачаалагдсангүй: ${esc(e.message || '')}</div>`; });
  el.querySelectorAll('[data-tp]').forEach(i => i.addEventListener('change', e => { p[e.target.dataset.tp] = +e.target.value || 0; renderTemplate(el); }));
  $('#tpReset').addEventListener('click', () => { delete IN.p[IN.tpl]; renderTemplate(el); });
  const pm = () => $('#tpMat').value;
  const toParts = mult => r.parts.map(q => ({ id: uid(), name: q.name, qty: q.qty * mult, mat: pm(), thk: q.thk, rot: true, mir: false, prio: 0, outer: q.outer, holes: q.holes, bends: q.bends || [] }));
  $('#tpKit').addEventListener('click', () => { const k = { id: uid(), name: T.name.split(' —')[0] + ' ' + T.params.slice(0, 3).map(q => p[q[0]]).join('×'), desc: T.desc, parts: toParts(1).map(cleanPart) }; S.kits.unshift(k); save(); toast(`«${k.name}» иж бүрдэл үүслээ (Ажил → Иж бүрдэл)`); });
  $('#tpNest').addEventListener('click', () => { const n = Math.max(1, Math.round(+$('#tpN').value || 1)); S.parts.push(...toParts(n)); save(); renderParts(); toast(`${r.parts.length} төрлийн эд анги Nesting-д нэмэгдлээ`); });
  const base = safeName(T.name.split(' —')[0].split(' (')[0]);
  $('#tpIl').addEventListener('click', () => saveFile(`KH_${IN.tpl}.iLogicVb`, ilogicRule(IN.tpl, { ...p }, T.name), 'text/plain'));
  $('#tpStep').addEventListener('click', () => saveFile(`${base}.stp`, stepFile(worldSolids(r), base), 'application/step'));
  $('#tpStl').addEventListener('click', async () => saveFile(`${base}.stl`, await stlFile(worldSolids(r)), 'model/stl'));
  $('#tpDxf').addEventListener('click', async () => {
    if (!window.JSZip) { toast('ZIP сан ачаалагдсангүй'); return; }
    const z = new JSZip();
    r.parts.forEach(q => { const w = dxfWriter(); w.loop('OUTER', orientLoop(q.outer, true)); q.holes.forEach(h => w.loop('INNER', h)); (q.bends || []).forEach(b => w.line(b.up ? 'BEND_UP' : 'BEND_DOWN', b.x1, b.y1, b.x2, b.y2)); z.file(safeName(`${q.name}_${q.thk}mm_x${q.qty}`) + '.dxf', w.doc()); });
    saveFile(`${base}_DXF.zip`, await z.generateAsync({ type: 'blob', compression: 'DEFLATE' }));
  });
}

/* ---------- own library ---------- */
function renderLib(el) {
  const sel = LIB.find(x => x.id === IN.lib), dark = isDark(), cats = [...new Set(LIB.map(x => x.cat).filter(Boolean))];
  el.innerHTML = `
    <div class="jcard"><div class="bcard-h">Миний сан — татсан DXF, SVG, PDF, STEP файлууд <span class="sp"></span><span class="muted" style="font-weight:400;font-size:12px">энэ компьютерт хадгалагдана</span></div><div class="jbody">
      <div class="jgrid">
        <label class="fld">Ангилал<input id="lbCat" list="lbCats" placeholder="жишээ: Тавилга"><datalist id="lbCats">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist></label>
        <label class="fld">Эх сурвалж (холбоос)<input id="lbSrc" placeholder="https://grabcad.com/…"></label>
        <label class="fld">Лиценз / тэмдэглэл<input id="lbLic" placeholder="жишээ: хувийн хэрэглээнд, зохиогч: …"></label>
        <label class="fld">Материал<select id="lbMat">${matOptions(S.defMat)}</select></label>
      </div>
      <div class="addrow"><label class="btn primary" for="lbIn">Файл нэмэх</label><input type="file" id="lbIn" accept=".dxf,.svg,.pdf,.ai,.plt,.hpgl,.step,.stp,.iges,.igs,.brep" multiple hidden><span class="note">STEP/IGES-ээс хавтгай хавтангуудыг зузаантай нь автоматаар салгана.</span></div>
    </div></div>
    ${LIB.length ? `<div class="jcard"><div class="bcard-h">${LIB.length} зүйл</div><div class="libgrid">${LIB.map((x, i) => `<div class="libit${x.id === IN.lib ? ' on' : ''}" data-id="${x.id}"><canvas data-i="${i}"></canvas><div class="t">${esc(x.name)}</div><div class="m">${esc(x.cat || '—')} · ${x.parts.length} төрөл · ${x.parts.reduce((a, q) => a + q.qty, 0)} ш</div></div>`).join('')}</div></div>` : '<div class="jempty"><b>Сан хоосон</b><br>GrabCAD, 3axis.co зэргээс өөрийн бүртгэлээр татсан файлаа энд нэмбэл ангилал, эх сурвалж, лицензийн тэмдэглэлтэй нь хадгалагдаж, дараа нь нэг товчоор Nesting-д орно.</div>'}
    ${sel ? `<div class="jcard"><div class="bcard-h">${esc(sel.name)} <span class="sp"></span><button class="btn sm" id="lbNest">Nesting руу</button><button class="btn sm" id="lbKit">Иж бүрдэл болгох</button><button class="btn sm ghost" id="lbDel">Устгах</button></div><div class="jbody">
      <p class="note" style="margin:0">${sel.src ? `Эх сурвалж: <a href="${esc(sel.src)}" target="_blank" rel="noopener">${esc(host(sel.src))}</a> · ` : ''}${sel.lic ? 'Лиценз: ' + esc(sel.lic) + ' · ' : ''}нэмсэн ${esc(sel.date)}</p>
      <div class="tblwrap" style="margin-top:8px"><table class="dt"><thead><tr><th>Нэр</th><th class="r">Зузаан</th><th class="r">Хэмжээ, мм</th><th class="r">Тоо</th></tr></thead><tbody>${sel.parts.map(q => { const inf = partInfo(q); return `<tr><td>${esc(q.name)}</td><td class="r num">${q.thk || '—'}</td><td class="r num">${nf(inf.w, 1)} × ${nf(inf.h, 1)}</td><td class="r num">${q.qty}</td></tr>`; }).join('')}</tbody></table></div></div></div>` : ''}`;
  el.querySelectorAll('.libit canvas').forEach(c => { const x = LIB[+c.dataset.i]; const q = x.parts.slice().sort((a, b) => partInfo(b).area - partInfo(a).area)[0]; drawPartBox(c, q, partColor(+c.dataset.i + 2, dark, 0.85)); });
  el.querySelectorAll('.libit').forEach(d => d.addEventListener('click', () => { IN.lib = d.dataset.id; renderLib(el); }));
  $('#lbIn').addEventListener('change', async e => {
    const files = [...e.target.files]; e.target.value = ''; let n = 0; const msgs = [];
    for (const f of files) {
      try {
        const st = /\.(step|stp|iges|igs|brep)$/i.test(f.name);
        if (st) toast('3D файл уншиж байна…', 8000);
        const r = st ? await importStep(f) : await importAnyFile(f);
        if (!r.parts.length) { msgs.push(`${f.name}: хавтгай хэлбэр олдсонгүй${r.bent ? ` (${r.bent} нугалсан/муруй бие)` : ''}`); continue; }
        LIB.unshift({ id: uid(), name: f.name.replace(/\.[^.]+$/, ''), cat: $('#lbCat').value.trim(), src: $('#lbSrc').value.trim(), lic: $('#lbLic').value.trim(), mat: $('#lbMat').value, date: today(), parts: r.parts.map(q => ({ name: q.name, qty: q.qty || 1, thk: q.thk || null, outer: q.outer, holes: q.holes, bends: q.bends || [] })) });
        n++; if (r.bent) msgs.push(`${f.name}: ${r.bent} нугалсан/муруй биеийг алгассан`);
      } catch (err) { msgs.push(`${f.name}: ${err.message || 'уншигдсангүй'}`); }
    }
    if (n) { saveLib(); IN.lib = LIB[0].id; }
    renderLibSide(); renderLib(el); toast((n ? `${n} файл санд нэмэгдлээ` : 'Нэмэгдсэнгүй') + (msgs.length ? ' · ' + msgs.join(' · ') : ''), msgs.length ? 9000 : 2600);
  });
  if (sel) {
    const toParts = () => sel.parts.map(q => ({ id: uid(), name: q.name, qty: q.qty, mat: sel.mat || S.defMat, thk: q.thk || +S.defThk, rot: true, mir: false, prio: 0, outer: q.outer, holes: q.holes, bends: q.bends || [] }));
    $('#lbNest').addEventListener('click', () => { S.parts.push(...toParts()); save(); renderParts(); toast(`${sel.parts.length} төрөл Nesting-д нэмэгдлээ`); });
    $('#lbKit').addEventListener('click', () => { S.kits.unshift({ id: uid(), name: sel.name, desc: sel.src || '', parts: toParts().map(cleanPart) }); save(); toast('Иж бүрдэл үүслээ'); });
    $('#lbDel').addEventListener('click', ev => { const b = ev.currentTarget; if (!b.dataset.arm) { b.dataset.arm = 1; b.textContent = 'Дахин дарж баталгаажуулна'; return; } LIB = LIB.filter(x => x !== sel); IN.lib = null; saveLib(); renderLibSide(); renderLib(el); });
  }
}

try { const m0 = localStorage.getItem(KEY + ':mod'); if (['bend', 'jobs', 'info', 'insp', 'dash', 'quotes', 'docs', 'team'].includes(m0)) setModule(m0); } catch (e) { }
