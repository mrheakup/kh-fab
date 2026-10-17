/* ================= KH Fab — plate rolling (галзуу): developed length, 3-roll set-up, check template ================= */
if (!S.bend.rolls) S.bend.rolls = [];
S.bend.rollM = Object.assign({ name: '3 булт галзуу', a: 260, Dt: 200, Dl: 170, ton: 60, maxT: 16, maxW: 2000 }, S.bend.rollM || {});
const curRoll = () => S.bend.rolls.find(r => r.id === S.bend.rollCur) || S.bend.rolls[0];
function rollDefaults() { return { id: uid(), name: 'Галзуу хавтан', mat: S.defMat, thk: 10, W: 1000, R: 400, dims: 'in', ang: 90, L1: 300, L2: 300, qty: 1, allow: true }; }
function rollCalc(r) {
  const M = S.bend.rollM, t = Math.max(0.5, +r.thk || 1), R = Math.max(0, +r.R || 0);
  const Ri = r.dims === 'out' ? R - t : r.dims === 'mid' ? R - t / 2 : R, Ro = Ri + t;
  const th = Math.max(0, Math.min(360, +r.ang || 0)) * D2R, K = kFactor(Math.max(Ri, 0.01), t), Rn = Ri + K * t;
  const L1 = Math.max(0, +r.L1 || 0), L2 = Math.max(0, +r.L2 || 0), arcN = th * Rn, flat = L1 + L2 + arcN;
  const warn = [], e = (+M.a || 0) / 2, closed = th >= TAU - 1e-6;
  // a 3-roll pyramid machine leaves ≈ half the lower-roll spacing flat at each end
  const add1 = r.allow && !closed ? Math.max(0, e - L1) : 0, add2 = r.allow && !closed ? Math.max(0, e - L2) : 0;
  if (closed && r.allow) warn.push(`Бүтэн цилиндр: төгсгөлүүдийг прессээр урьдчилан нугална (≈ ${nf(e)} мм шулуун үлдэнэ)`);
  else if (!r.allow && (L1 < e || L2 < e)) warn.push(`Төгсгөлд ≈ ${nf(e)} мм шулуун үлдэнэ — прессээр урьдчилан нугалах эсвэл «Тайрах нэмэгдэл» сонгоно уу`);
  if (!(Ri > 0)) warn.push('Дотор радиус 0-ээс их байх ёстой');
  const rl = (+M.Dl || 0) / 2, rt = (+M.Dt || 0) / 2;
  let stroke = null;
  if (Ri <= rt) warn.push(`R${nf(Ri)} нь дээд булны радиусаас (${nf(rt)}) бага — энэ машинаар галзуудахгүй, прессээр алхамчлан нугална`);
  else if (Ro + rl > e) { const g = Math.sqrt((Ro + rl) ** 2 - e * e) - (Ri - rt), g0 = rl + t + rt; stroke = g0 - g; }
  if (t > +M.maxT) warn.push(`Зузаан ${t} мм машины хязгаараас (${M.maxT} мм) их`);
  if (+r.W > +M.maxW) warn.push(`Өргөн ${r.W} мм машины булны уртаас (${M.maxW} мм) их`);
  if (Ri / t < 5) warn.push(`R/t = ${nf(Ri / t, 1)} — бага радиус, хагарах эрсдэлтэй (Hardox-д нийлүүлэгчийн доод радиусыг шалгана уу)`);
  const m = matOf(r.mat), cls = matCls(m), rm = +m.rm || 420, sy = rm * (cls === 'hx' ? 0.85 : 0.7);
  const F = sy * (+r.W || 0) * t * t / Math.max(1, +M.a || 1) / 1000 / 9.81; // tonnes on the top roll, plastic moment over half the spacing
  if (F > +M.ton) warn.push(`Шаардлагатай хүч ≈ ${nf(F, 1)} т, машин ${M.ton} т — өргөнийг хувааж эсвэл том машинд галзуудна`);
  const c = Math.min(500, 1.6 * Ro, th < Math.PI ? 2 * Ro * Math.sin(th / 2) : 1e9), sag = (rr) => rr - Math.sqrt(Math.max(0, rr * rr - c * c / 4));
  const kg = (flat + add1 + add2) * (+r.W || 0) * t * m.rho / 1e6;
  return { t, Ri, Ro, Rn, K, th, L1, L2, arcN, arcIn: th * Ri, arcOut: th * Ro, flat, add1, add2, flatCut: flat + add1 + add2, e, stroke, F, sy, chord: c, sagO: sag(Ro), sagI: sag(Ri), kg, warn, cls };
}
function rollPts(r, c) { // neutral line of the rolled profile
  const pts = [[0, 0]]; let x = c.L1, y = 0; pts.push([x, y]);
  const n = Math.max(8, Math.ceil(c.th / (4 * D2R)));
  for (let i = 1; i <= n; i++) { const a = -Math.PI / 2 + c.th * i / n; pts.push([c.L1 + c.Rn * Math.cos(a), c.Rn + c.Rn * Math.sin(a)]); }
  const last = pts[pts.length - 1], dx = Math.cos(c.th), dy = Math.sin(c.th);
  pts.push([last[0] + dx * c.L2, last[1] + dy * c.L2]);
  return pts;
}
function drawRoll(cv, r, c, mini) {
  const { x, w, h } = prepCanvas(cv), pal = bpal(), pts = rollPts(r, c);
  const T = fitBox(pts, w, h, mini ? 8 : 40), X = p => T.ox + p[0] * T.sc, Y = p => T.oy - p[1] * T.sc;
  x.lineCap = 'butt'; x.lineJoin = 'round'; x.strokeStyle = pal.part; x.lineWidth = Math.max(mini ? 2 : 3, c.t * T.sc);
  x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(X(p), Y(p)) : x.moveTo(X(p), Y(p))); x.stroke();
  if (mini) return;
  x.fillStyle = pal.ink; x.font = `600 12px ${pal.font}`; x.textAlign = 'center';
  x.beginPath(); x.arc(X([c.L1, c.Rn]), Y([c.L1, c.Rn]), 3, 0, TAU); x.fill();
  x.fillText(`R${nf(c.Ri)} (дотор)`, X([c.L1, c.Rn]), Y([c.L1, c.Rn]) - 8);
  if (c.L1 > 0) x.fillText(`${nf(c.L1)}`, X([c.L1 / 2, 0]), Y([0, 0]) + 18);
  x.fillText(`${nf(+r.ang)}°`, X([c.L1 + c.Rn * 0.5, c.Rn * 0.5]), Y([0, c.Rn * 0.5]));
}
function drawRollFlat(cv, r, c) {
  const { x, w, h } = prepCanvas(cv), pal = bpal(), L = c.flatCut, W = +r.W || 1;
  const T = fitBox([[0, 0], [L, W]], w, h, 34), X = v => T.ox + v * T.sc, Y = v => T.oy - v * T.sc;
  x.fillStyle = pal.sheet; x.fillRect(X(0), Y(W), L * T.sc, W * T.sc); x.strokeStyle = pal.ink; x.lineWidth = 1.2; x.strokeRect(X(0), Y(W), L * T.sc, W * T.sc);
  const z0 = c.add1 + c.L1, z1 = z0 + c.arcN;
  x.fillStyle = pal.part; x.globalAlpha = 0.18; x.fillRect(X(z0), Y(W), c.arcN * T.sc, W * T.sc); x.globalAlpha = 1;
  x.setLineDash([6, 4]); x.strokeStyle = pal.part; x.lineWidth = 1.4;
  [z0, z1].forEach(v => { x.beginPath(); x.moveTo(X(v), Y(0)); x.lineTo(X(v), Y(W)); x.stroke(); });
  x.strokeStyle = pal.bad; [c.add1, L - c.add2].forEach((v, i) => { if ((i ? c.add2 : c.add1) > 0) { x.beginPath(); x.moveTo(X(v), Y(0)); x.lineTo(X(v), Y(W)); x.stroke(); } });
  x.setLineDash([]); x.fillStyle = pal.ink; x.font = `600 12px ${pal.font}`; x.textAlign = 'center';
  x.fillText(`${nf(L, 1)} мм`, X(L / 2), Y(0) + 18);
  x.fillText(`галзуудах бүс ${nf(c.arcN, 1)}`, X((z0 + z1) / 2), Y(W / 2));
}
const RT = { tab: 'prof' };
function renderRollSide() {
  const M = S.bend.rollM;
  [['rm_a', 'a'], ['rm_Dt', 'Dt'], ['rm_Dl', 'Dl'], ['rm_ton', 'ton'], ['rm_maxT', 'maxT'], ['rm_maxW', 'maxW']].forEach(([id, k]) => $('#' + id).value = M[k]);
  const el = $('#rList');
  el.innerHTML = S.bend.rolls.length ? S.bend.rolls.map(r => { let c = null; try { c = rollCalc(r); } catch (e) { } return `<div class="bitem${r.id === (curRoll() || {}).id ? ' on' : ''}" data-id="${r.id}"><canvas data-id="${r.id}"></canvas><div style="min-width:0"><div class="t">${esc(r.name)}</div><div class="m">${r.thk} мм · R${r.R} · ${r.ang}° · ${r.qty} ш</div><div class="m">${c ? `дэлгэмэл ${nf(c.flatCut, 1)} × ${nf(r.W)}` : ''}</div></div><button class="x" data-del aria-label="Устгах">×</button></div>`; }).join('') : '<div class="emptyp">Галзуу алга. <b>+ Шинэ галзуу</b> эсвэл шанага үүсгэгчээс ороох хавтанг илгээнэ.</div>';
  $$('#rList canvas').forEach(cv => { const r = S.bend.rolls.find(q => q.id === cv.dataset.id); try { drawRoll(cv, r, rollCalc(r), true); } catch (e) { } });
}
function renderRollMain() {
  const r = curRoll(), el = $('#rollMain');
  if (!r) { el.innerHTML = '<div class="jempty"><b>Галзуу алга</b><br>Зүүн талын <b>+ Шинэ галзуу</b> товчоор эхэлнэ. Шанагын ороох хавтан, цилиндр, хоолой, конусын бус нумын хавтанд тохирно.</div>'; return; }
  const c = rollCalc(r), M = S.bend.rollM;
  const fld = (k, lbl, step, extra) => `<label class="fld sm"><span>${lbl}</span><input data-r="${k}" type="number" step="${step || 1}" value="${r[k]}" class="mono"${extra || ''}></label>`;
  el.innerHTML = `
    <div class="bhead">
      <label class="fld grow">Нэр<input data-r="name" value="${esc(r.name)}"></label>
      <label class="fld">Материал<select data-r="mat">${matOptions(r.mat)}</select></label>
      ${fld('thk', 'Зузаан, мм', 0.5)}${fld('W', 'Өргөн, мм', 10)}${fld('R', 'Радиус, мм', 5)}
      <label class="fld"><span>Радиус нь</span><select data-r="dims"><option value="in"${r.dims === 'in' ? ' selected' : ''}>Дотор</option><option value="mid"${r.dims === 'mid' ? ' selected' : ''}>Дунд</option><option value="out"${r.dims === 'out' ? ' selected' : ''}>Гадна</option></select></label>
      ${fld('ang', 'Нумын өнцөг, °', 1, ' min="1" max="360"')}${fld('L1', 'Шулуун 1, мм', 5)}${fld('L2', 'Шулуун 2, мм', 5)}${fld('qty', 'Тоо', 1, ' min="1"')}
    </div>
    <label class="check" style="margin:2px 0"><input type="checkbox" data-r="allow"${r.allow ? ' checked' : ''}><span><b>Тайрах нэмэгдэл</b> — галзуудаагүй шулуун төгсгөлийг (≈ ${nf(c.e)} мм) нэмж үлдээгээд дараа нь тайрна</span></label>
    <div class="bgrid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
      <div class="bcard"><div class="bcard-h">Профиль</div><canvas id="rProf" class="bcv"></canvas></div>
      <div class="bcard"><div class="bcard-h">Дэлгэмэл <span class="muted" style="font-weight:400">${nf(c.flatCut, 1)} × ${nf(r.W)} мм</span></div><canvas id="rFlat" class="bcv"></canvas></div>
    </div>
    <div class="summary">${[
      ['Дэлгэмэл урт', `${nf(c.flatCut, 1)}<small>мм</small>`, c.add1 + c.add2 > 0 ? `үүнээс тайрах ${nf(c.add1 + c.add2, 0)} мм` : `${nf(c.kg, 1)} кг`],
      ['Нумын урт (тэнхлэг)', `${nf(c.arcN, 1)}<small>мм</small>`, `дотор ${nf(c.arcIn, 1)} · гадна ${nf(c.arcOut, 1)}`],
      ['K-factor', nf(c.K, 3), `тэнхлэгийн R ${nf(c.Rn, 1)}`],
      ['Дээд булны суулт', c.stroke == null ? '—' : `${nf(c.stroke, 1)}<small>мм</small>`, 'хавтанд хүрсэн байрлалаас, буцалтгүй'],
      ['Хүч', `${nf(c.F, 1)}<small>т</small>`, `машин ${M.ton} т · σт ≈ ${nf(c.sy)} МПа`],
      ['Шаблон', `${nf(c.sagO, 1)}<small>мм</small>`, `хөвч ${nf(c.chord)} мм дээрх гадна хотгор`]
    ].map(s => `<div class="stat"><div class="k">${s[0]}</div><div class="v">${s[1]}</div><div class="s">${esc(s[2])}</div></div>`).join('')}</div>
    ${c.warn.length ? `<div class="warnbox">${c.warn.map(esc).join('<br>')}</div>` : ''}
    <div class="jcard"><div class="bcard-h">Галзуудах заавар</div><div class="jbody"><ol class="note" style="margin:0;padding-left:18px;line-height:1.7">
      ${c.add1 + c.add2 > 0 || c.th >= TAU - 1e-6 ? `<li>Төгсгөлийг прессээр R${nf(c.Ri)}-д урьдчилан нугална, эсвэл нэмэгдэлтэй хавтанг галзуудаад ${nf(c.add1)} / ${nf(c.add2)} мм-ийг тайрна.</li>` : ''}
      <li>Хавтангийн ирмэгийг булнуудтай зэрэгцүүлж, дээд булыг хавтанд хүргэнэ (тэг байрлал).</li>
      <li>${c.stroke == null ? 'Дээд булыг' : `Дээд булыг нийт ≈ ${nf(c.stroke, 1)} мм хүртэл`} 3–4 дамжлагаар аажмаар дарна. ${c.cls === 'hx' ? 'Hardox-д уян буцалт их тул эхний дамжлагад 70% орчим дарна.' : 'Эхний дамжлагад 80% орчим дарна.'}</li>
      <li>Дамжлага бүрийн дараа ${nf(c.chord)} мм хөвчтэй шаблоноор шалгана: гадна хотгор ${nf(c.sagO, 1)} мм, дотор ${nf(c.sagI, 1)} мм.</li>
      <li>Галзуудах бүс: дэлгэмэлийн ${nf(c.add1 + c.L1, 1)} – ${nf(c.add1 + c.L1 + c.arcN, 1)} мм (шохойгоор тэмдэглэнэ).</li>
    </ol></div></div>
    <div class="exports">
      <button class="btn primary" id="rToNest">Дэлгэмэл Nesting руу</button>
      <button class="btn" id="rTpl">Шаблон Nesting руу (2 мм)</button>
      <button class="btn" id="rDxf">Дэлгэмэл DXF</button>
      <button class="btn ghost" id="rDup">Хуулбар</button>
    </div>`;
  drawRoll($('#rProf'), r, c); drawRollFlat($('#rFlat'), r, c);
  el.querySelectorAll('[data-r]').forEach(i => i.addEventListener('change', e => {
    const k = e.target.dataset.r;
    r[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'number' ? Math.max(k === 'ang' ? 1 : 0, +e.target.value || 0) : e.target.value;
    if (k === 'ang') r.ang = Math.min(360, r.ang); if (k === 'qty') r.qty = Math.max(1, Math.round(r.qty));
    save(); renderRollSide(); renderRollMain();
  }));
  $('#rToNest').addEventListener('click', () => {
    S.parts.push({ id: uid(), name: `${r.name} (галзуу дэлгэмэл)`, qty: r.qty, mat: r.mat, thk: +r.thk, rot: true, mir: false, prio: 0, outer: rectLoop(Math.round(c.flatCut * 10) / 10, +r.W, 0), holes: [], bends: [], roll: { L1: c.L1 + c.add1, R: c.Ri, ang: +r.ang, L2: c.L2 + c.add2, W: +r.W } });
    save(); renderParts(); toast(`Дэлгэмэл ${nf(c.flatCut, 1)} × ${nf(r.W)} мм Nesting-д нэмэгдлээ`);
  });
  $('#rTpl').addEventListener('click', () => {
    const cc = c.chord, H = Math.round(c.sagO + 40), bu = -2 * c.sagO / cc;
    S.parts.push({ id: uid(), name: `Шаблон R${nf(c.Ro)} (гадна)`, qty: 1, mat: S.defMat, thk: 2, rot: true, mir: false, prio: 0, outer: [{ x: 0, y: 0, b: 0 }, { x: cc, y: 0, b: 0 }, { x: cc, y: H, b: bu }, { x: 0, y: H, b: 0 }], holes: [circleLoop(20, 15, 5)], bends: [] });
    save(); renderParts(); toast('Шаблон Nesting-д нэмэгдлээ — 2 мм хавтангаас зүснэ');
  });
  $('#rDxf').addEventListener('click', () => {
    const w = dxfWriter(), L = c.flatCut, W = +r.W, z0 = c.add1 + c.L1;
    w.loop('OUTER', rectLoop(L, W, 0)); w.line('BEND_UP', z0, 0, z0, W); w.line('BEND_UP', z0 + c.arcN, 0, z0 + c.arcN, W);
    if (c.add1 > 0) w.line('TRIM', c.add1, 0, c.add1, W); if (c.add2 > 0) w.line('TRIM', L - c.add2, 0, L - c.add2, W);
    const name = safeName(`${r.name}_галзуу_${nf(L, 1).replace(/\s/g, '')}x${W}`) + '.dxf', txt = w.doc();
    if (inHost && !window.kh) { if (!window.JSZip) { toast('ZIP сан ачаалагдсангүй'); return; } const z = new JSZip(); z.file(name, txt); z.generateAsync({ type: 'blob' }).then(b => saveFile(name.replace(/\.dxf$/, '.zip'), b)); }
    else saveFile(name, txt, 'application/dxf');
  });
  $('#rDup').addEventListener('click', () => { const q = { ...JSON.parse(JSON.stringify(r)), id: uid(), name: r.name + ' (хуулбар)' }; S.bend.rolls.unshift(q); S.bend.rollCur = q.id; save(); renderRollSide(); renderRollMain(); });
}
function showBendTab(t) {
  RT.tab = t;
  $$('[data-btab]').forEach(x => x.classList.toggle('on', x.dataset.btab === t));
  ['prof', 'tools', 'roll'].forEach(k => $('#btab-' + k).hidden = k !== t);
  const inBend = !$('#bendSide').hidden;
  $('#bendMain').hidden = !inBend || t === 'roll'; $('#rollMain').hidden = !inBend || t !== 'roll';
  if (t === 'roll' && inBend) { renderRollSide(); renderRollMain(); }
}
function rollFromPart(p) {
  const q = p.roll || {};
  const r = { ...rollDefaults(), name: p.name.replace(/ \(галзуу.*\)$/, ''), mat: p.mat, thk: +p.thk, W: Math.round(q.W || partInfo(p).h), R: Math.round((q.R || 400) * 10) / 10, dims: 'in', ang: q.ang || 90, L1: Math.round((q.L1 || 0) * 10) / 10, L2: Math.round((q.L2 || 0) * 10) / 10, qty: p.qty || 1, allow: false };
  S.bend.rolls.unshift(r); S.bend.rollCur = r.id; save();
  setModule('bend'); showBendTab('roll'); toast('Галзуудах тооцоо үүслээ');
}
$('#rNew').addEventListener('click', () => { const r = rollDefaults(); S.bend.rolls.unshift(r); S.bend.rollCur = r.id; save(); renderRollSide(); renderRollMain(); });
$('#rList').addEventListener('click', e => {
  const it = e.target.closest('.bitem'); if (!it) return;
  if (e.target.closest('[data-del]')) { S.bend.rolls = S.bend.rolls.filter(r => r.id !== it.dataset.id); if (S.bend.rollCur === it.dataset.id) S.bend.rollCur = S.bend.rolls[0]?.id || null; save(); renderRollSide(); renderRollMain(); return; }
  S.bend.rollCur = it.dataset.id; save(); renderRollSide(); renderRollMain();
});
[['rm_a', 'a'], ['rm_Dt', 'Dt'], ['rm_Dl', 'Dl'], ['rm_ton', 'ton'], ['rm_maxT', 'maxT'], ['rm_maxW', 'maxW']].forEach(([id, k]) => $('#' + id).addEventListener('change', e => { S.bend.rollM[k] = Math.max(1, +e.target.value || 1); save(); renderRollSide(); renderRollMain(); }));

