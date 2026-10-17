/* ================= KH Fab — parametric excavator bucket (шанага) → kit of flat plates ================= */
function pickMat(re, fb) { const m = S.materials.find(x => re.test(x.name)); return m ? m.name : (fb || S.defMat); }
function bucketDefaults() {
  const hx = pickMat(/hardox|элэгд/i), s355 = pickMat(/s355|09г2с/i);
  return {
    name: 'PC200 шанага', W: 1100, D: 1150, H: 1000, R: 420, alpha: 25,
    lipL: 220, topD: 260,
    pin: 80, pitch: 440, hc: 150, boss: 45, earQty: 4,
    wearN: 3, wearW: 100, cutter: true, cutterW: 120,
    side: { mat: s355, thk: 16 }, wrap: { mat: hx, thk: 12 }, lip: { mat: hx, thk: 30 }, top: { mat: s355, thk: 20 },
    ear: { mat: s355, thk: 30 }, wear: { mat: hx, thk: 12 }
  };
}
/* ear plate: flat base, two pin holes, rounded top */
function earLoop(P, Re, hc) {
  const b = Math.tan(Math.PI / 8);
  return [{ x: -Re, y: 0, b: 0 }, { x: P + Re, y: 0, b: 0 }, { x: P + Re, y: hc, b }, { x: P, y: hc + Re, b: 0 }, { x: 0, y: hc + Re, b }, { x: -Re, y: hc, b: 0 }];
}
function bucketCalc(B) {
  const n = k => Math.max(0, +B[k] || 0);
  const W = n('W'), D = n('D'), H = n('H'), R = n('R'), al = Math.min(60, n('alpha')) * D2R;
  const ts = +B.side.thk, tw = +B.wrap.thk, tl = +B.lip.thk, tt = +B.top.thk, te = +B.ear.thk, twr = +B.wear.thk;
  const lipL = n('lipL'), topD = n('topD'), Bx = D - H * Math.tan(al);
  const err = [];
  if (!(W > 100 && D > 200 && H > 200)) err.push('Өргөн, гүн, өндрийг оруулна уу');
  if (!(R > tw + 10)) err.push(`Ороох радиус R нь хавтангийн зузаанаас (${tw} мм) их байх ёстой`);
  if (R > Math.min(D - lipL, H - tt) - 20) err.push('R хэт том — гүн, өндрөөс багасгана уу');
  if (Bx < topD + 50) err.push('Амны налуу (α) хэт их эсвэл дээд хавтан хэт өргөн — дээд урд булан дээд хавтантай давхцаж байна');
  if (lipL >= D - R) err.push('Ирний хавтангийн урт хэт их');
  const side = [{ x: R, y: 0, b: 0 }, { x: D, y: 0, b: 0 }, { x: Bx, y: H, b: 0 }, { x: 0, y: H, b: 0 }, { x: 0, y: R, b: Math.tan(Math.PI / 8) }];
  const Lm = Math.hypot(D - Bx, H);
  const A = Math.abs(loopArea(side));
  const Vs = A * W / 1e9, Vh = Vs + Math.max(0, (Lm * Lm * W / 8 - Lm * Lm * Lm / 24)) / 1e9;
  // wrap plate: bottom straight + 90° roll + back straight, outer surface on the side-plate edge
  const Lb = D - lipL - R, Lk = H - tt - R, Ri = Math.max(1, R - tw), K = kFactor(Ri, tw), arc = Math.PI / 2 * (Ri + K * tw);
  const wrapL = Lb + Lk + arc;
  const Re = n('pin') / 2 + n('boss');
  const P = (name, part, qty, outer, holes, extra) => ({ name, mat: part.mat, thk: +part.thk, qty, outer, holes: holes || [], ...(extra || {}) });
  const parts = [];
  if (!err.length) {
    parts.push(P('Хажуу хавтан', B.side, 2, side, [], { mir: true }));
    parts.push(P(`Ороох хавтан (R${Math.round(R)}, галзуу)`, B.wrap, 1, rectLoop(Math.round(wrapL * 10) / 10, W, 0), [], { roll: { L1: Lb, R: Ri, ang: 90, L2: Lk, W } }));
    parts.push(P('Ирний хавтан', B.lip, 1, rectLoop(lipL, W, 0)));
    parts.push(P('Дээд хавтан', B.top, 1, rectLoop(topD, W, 0)));
    if (n('earQty') > 0) parts.push(P('Чих (холбоосны хавтан)', B.ear, Math.round(n('earQty')), earLoop(n('pitch'), Re, n('hc')), [circleLoop(0, n('hc'), n('pin') / 2), circleLoop(n('pitch'), n('hc'), n('pin') / 2)]));
    if (n('wearN') > 0 && n('wearW') > 0 && Lb > 80) parts.push(P('Элэгдлийн тууз', B.wear, Math.round(n('wearN')), rectLoop(n('wearW'), Math.round(Lb - 40), 0)));
    if (B.cutter && n('cutterW') > 0) parts.push(P('Хажуугийн ир', B.side, 2, rectLoop(Math.round(Lm), n('cutterW'), 0)));
  }
  const kg = parts.reduce((a, p) => a + partInfo(p).area * p.thk * matOf(p.mat).rho / 1e6 * p.qty, 0);
  return { err, side, Bx, Lm, A, Vs, Vh, Lb, Lk, Ri, K, arc, wrapL, Re, parts, kg, W, D, H, R, tw, tl, tt, lipL, topD, ts, te };
}
function drawBucket(cv, B, c) {
  const { x, w, h } = prepCanvas(cv); if (c.err.length) return;
  const pal = bpal(), ink = pal.ink, acc = pal.accent;
  const ear = earLoop(+B.pitch, c.Re, +B.hc), ex0 = Math.max(0, c.topD / 2 - +B.pitch / 2);
  const all = [...flattenLoop(c.side, 1), ...flattenLoop(ear, 1).map(p => [p[0] + ex0, p[1] + c.H])];
  const T = fitBox(all, w, h, 34), X = p => T.ox + p[0] * T.sc, Y = p => T.oy - p[1] * T.sc;
  const poly = (pts, close) => { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(X(p), Y(p)) : x.moveTo(X(p), Y(p))); if (close) x.closePath(); };
  // side plate
  poly(flattenLoop(c.side, 0.5), true); x.fillStyle = pal.sheet; x.fill(); x.lineWidth = 1.2; x.strokeStyle = ink; x.stroke();
  // wrap plate (inner offset band)
  const band = []; const t = c.tw;
  band.push([c.D - c.lipL, 0], [c.R, 0]);
  for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 - i / 24 * Math.PI / 2; band.push([c.R + c.R * Math.cos(a), c.R + c.R * Math.sin(a)]); }
  band.push([0, c.H - c.tt]);
  const inner = [[t, c.H - c.tt]];
  for (let i = 24; i >= 0; i--) { const a = -Math.PI / 2 - i / 24 * Math.PI / 2; inner.push([c.R + (c.R - t) * Math.cos(a), c.R + (c.R - t) * Math.sin(a)]); }
  inner.push([c.D - c.lipL, t]);
  poly(band.concat(inner), true); x.fillStyle = acc; x.globalAlpha = 0.85; x.fill(); x.globalAlpha = 1;
  // lip, top plate, ears
  poly([[c.D - c.lipL, 0], [c.D, 0], [c.D - c.tl * 0.6, c.tl], [c.D - c.lipL, c.tl]], true); x.fillStyle = pal.blue; x.fill();
  poly([[0, c.H - c.tt], [c.topD, c.H - c.tt], [c.topD, c.H], [0, c.H]], true); x.fillStyle = pal.tool; x.fill(); x.strokeStyle = ink; x.lineWidth = 0.8; x.stroke();
  poly(flattenLoop(ear, 0.5).map(p => [p[0] + ex0, p[1] + c.H]), true); x.fillStyle = pal.tool; x.globalAlpha = 0.7; x.fill(); x.globalAlpha = 1; x.stroke();
  [[0, +B.hc], [+B.pitch, +B.hc]].forEach(q => { x.beginPath(); x.arc(X([q[0] + ex0, 0]), Y([0, q[1] + c.H]), +B.pin / 2 * T.sc, 0, TAU); x.fillStyle = cssv('--view'); x.fill(); x.stroke(); });
  // dimensions
  x.fillStyle = ink; x.font = `600 12px ${pal.font}`; x.textAlign = 'center';
  x.fillText(`D ${nf(c.D)}`, X([c.D / 2, 0]), Y([0, 0]) + 18);
  x.save(); x.translate(X([0, 0]) - 14, Y([0, c.H / 2])); x.rotate(-Math.PI / 2); x.fillText(`H ${nf(c.H)}`, 0, 0); x.restore();
  x.fillText(`R ${nf(c.R)}`, X([c.R * 0.45, 0]), Y([0, c.R * 0.45]));
  x.textAlign = 'left'; x.fillText(`амны урт ${nf(c.Lm)}`, X([(c.D + c.Bx) / 2, 0]) + 14, Y([0, c.H / 2]));
}
const BK = { edit: null };
function renderBucketMain(el) {
  if (!S.bucket) S.bucket = bucketDefaults();
  const B = BK.edit ? (findKit(BK.edit) || {}).bucket || S.bucket : S.bucket;
  const c = bucketCalc(B), dark = isDark();
  const num = (k, lbl, step) => `<label class="fld sm"><span>${lbl}</span><input data-b="${k}" type="number" min="0" step="${step || 1}" value="${B[k]}" class="mono"></label>`;
  const plate = (k, lbl) => `<tr data-p="${k}"><td>${lbl}</td><td><select data-pk="mat" class="inp" style="width:100%;min-width:0">${matOptions(B[k].mat)}</select></td><td><input data-pk="thk" type="number" min="1" step="1" value="${B[k].thk}" class="inp mono" style="width:100%;min-width:0"></td></tr>`;
  el.innerHTML = `
    <div class="bhead"><label class="fld grow">Шанагын нэр<input id="bk_name" value="${esc(B.name)}"></label>
      ${num('W', 'Дотор өргөн W, мм', 10)}${num('D', 'Гүн D, мм', 10)}${num('H', 'Өндөр H, мм', 10)}${num('R', 'Ороох R, мм', 5)}${num('alpha', 'Амны налуу α, °', 1)}</div>
    <div class="bgrid" style="grid-template-columns:minmax(260px,340px) minmax(0,1fr)">
      <div class="bcard"><div class="bcard-h">Хавтан, материал</div>
        <div class="tblwrap"><table class="dt" style="table-layout:fixed;min-width:0;width:100%"><thead><tr><th style="width:34%">Эд анги</th><th>Материал</th><th style="width:72px">Зузаан</th></tr></thead><tbody id="bkPlates">
          ${plate('side', 'Хажуу')}${plate('wrap', 'Ороох')}${plate('lip', 'Ир')}${plate('top', 'Дээд')}${plate('ear', 'Чих')}${plate('wear', 'Элэгдлийн тууз')}
        </tbody></table></div>
        <div class="jbody"><div class="grid2">
          ${num('lipL', 'Ирний өргөн, мм', 5)}${num('topD', 'Дээд хавтан, мм', 5)}
          ${num('pin', 'Пин Ø, мм', 1)}${num('pitch', 'Пин хоорондын зай, мм', 5)}
          ${num('hc', 'Пин төвийн өндөр, мм', 5)}${num('boss', 'Нүхний ханын зузаан, мм', 1)}
          ${num('earQty', 'Чихний тоо', 1)}${num('wearN', 'Элэгдлийн тууз, ш', 1)}
          ${num('wearW', 'Туузны өргөн, мм', 5)}${num('cutterW', 'Хажуугийн ирний өргөн, мм', 5)}
        </div><label class="check" style="margin-top:8px"><input type="checkbox" id="bk_cutter"${B.cutter ? ' checked' : ''}><span>Хажуугийн ир (амны ирмэг дагуу) нэмэх</span></label></div>
      </div>
      <div class="bcard"><div class="bcard-h">Хажуугийн харагдац <span class="sp"></span><span class="muted" style="font-weight:400;font-size:12px">ороох — улбар шар, ир — цэнхэр</span></div><canvas id="bkCv" class="bcv tall" style="height:340px"></canvas></div>
    </div>
    ${c.err.length ? `<div class="warnbox">${c.err.map(esc).join('<br>')}</div>` : `
    <div class="summary">${[
      ['Багтаамж (тэгш)', `${nf(c.Vs, 2)}<small>м³</small>`, 'SAE J296-аар ойролцоо'],
      ['Багтаамж (овоолсон)', `${nf(c.Vh, 2)}<small>м³</small>`, '1:1 овоолго'],
      ['Нийт жин', `${nf(c.kg, 0)}<small>кг</small>`, `${c.parts.reduce((a, p) => a + p.qty, 0)} хавтан, гагнуургүй`],
      ['Ороох хавтан', `${nf(c.wrapL, 1)}<small>мм</small>`, `× ${nf(c.W)} · дотор R${nf(c.Ri)} · K ${nf(c.K, 3)}`],
      ['Амны урт', `${nf(c.Lm)}<small>мм</small>`, `хажуугийн талбай ${nf(c.A / 1e6, 3)} м²`]
    ].map(s => `<div class="stat"><div class="k">${s[0]}</div><div class="v">${s[1]}</div><div class="s">${esc(s[2])}</div></div>`).join('')}</div>
    <div class="jcard"><div class="bcard-h">Хавтгай эд ангиуд — нэг шанагад</div>
      <div class="tblwrap" style="border:0"><table class="dt"><thead><tr><th style="width:60px"></th><th>Нэр</th><th>Материал</th><th class="r">Зузаан</th><th class="r">Хэмжээ, мм</th><th class="r">Тоо</th><th class="r">Жин, кг</th></tr></thead><tbody>
      ${c.parts.map((p, i) => { const inf = partInfo(p); return `<tr><td><canvas class="thumb" style="width:44px;height:44px" data-i="${i}"></canvas></td><td>${esc(p.name)}</td><td>${esc(p.mat)}</td><td class="r num">${p.thk}</td><td class="r num">${nf(inf.w, 1)} × ${nf(inf.h, 1)}</td><td class="r num">${p.qty}</td><td class="r num">${nf(inf.area * p.thk * matOf(p.mat).rho / 1e6 * p.qty, 1)}</td></tr>`; }).join('')}
      </tbody></table></div></div>`}
    <div class="exports">
      <button class="btn primary" id="bkKit"${c.err.length ? ' disabled' : ''}>${BK.edit ? 'Иж бүрдлийг шинэчлэх' : 'Иж бүрдэл үүсгэх'}</button>
      <button class="btn" id="bkRoll"${c.err.length ? ' disabled' : ''}>Ороох хавтанг галзуу руу</button>
      <button class="btn" id="bkNest"${c.err.length ? ' disabled' : ''}>Nesting руу шууд ×</button><input id="bkN" type="number" min="1" value="1" class="inp mono" style="width:64px">
      <span style="flex:1"></span><button class="btn ghost" id="bkReset">Анхны утга</button>
    </div>
    <p class="note">Загвар нь хялбаршуулсан: доод тал хэвтээ, нуруу босоо, 90° ороолттой. Ороох хавтангийн урт нь гадна гадаргуу хажуугийн хавтангийн ирмэгтэй тэгшилнэ гэж тооцсон (DIN 6935 K). Ирний налуу, шүдний адаптер, бэхэлгээний нүхийг гараар нэмнэ.</p>`;
  if (!c.err.length) { drawBucket($('#bkCv'), B, c); el.querySelectorAll('canvas.thumb').forEach(cv => drawPartBox(cv, c.parts[+cv.dataset.i], partColor(+cv.dataset.i, dark, 0.85))); }
  const upd = () => { save(); renderBucketMain(el); };
  el.querySelectorAll('[data-b]').forEach(i => i.addEventListener('change', e => { B[e.target.dataset.b] = Math.max(0, +e.target.value || 0); upd(); }));
  $('#bk_name').addEventListener('change', e => { B.name = e.target.value.trim() || B.name; save(); });
  $('#bk_cutter').addEventListener('change', e => { B.cutter = e.target.checked; upd(); });
  $('#bkPlates').addEventListener('change', e => { const k = e.target.closest('tr').dataset.p, f = e.target.dataset.pk; B[k][f] = f === 'thk' ? Math.max(1, +e.target.value || B[k].thk) : e.target.value; upd(); });
  $('#bkReset').addEventListener('click', () => { const d = bucketDefaults(); Object.keys(d).forEach(k => B[k] = d[k]); upd(); });
  const kitParts = () => bucketCalc(B).parts.map(p => cleanPart({ ...p, rot: true }));
  $('#bkKit').addEventListener('click', () => {
    let k = BK.edit && findKit(BK.edit);
    if (k) { k.parts = kitParts(); k.name = B.name; k.bucket = JSON.parse(JSON.stringify(B)); toast('Иж бүрдэл шинэчлэгдлээ'); }
    else { k = { id: uid(), name: B.name, desc: `W${B.W} × D${B.D} × H${B.H}, R${B.R} · ${nf(c.Vh, 2)} м³`, parts: kitParts(), bucket: JSON.parse(JSON.stringify(B)) }; S.kits.unshift(k); toast('Иж бүрдэл үүслээ — ажилд «× тоо»-гоор нэмнэ'); }
    BK.edit = null; J.kit = k.id; J.bucket = false; save(); renderJobs();
  });
  $('#bkNest').addEventListener('click', () => { const nn = Math.max(1, Math.round(+$('#bkN').value || 1)); kitParts().forEach(p => S.parts.push({ ...p, id: uid(), qty: p.qty * nn })); save(); renderParts(); toast(`${B.name} ×${nn} — ${c.parts.length} төрлийн хавтан Nesting-д нэмэгдлээ`); });
  $('#bkRoll').addEventListener('click', () => { const w = c.parts.find(p => p.roll); if (!w) return; rollFromPart({ ...w, name: `${B.name} — ороох хавтан` }); });
}
