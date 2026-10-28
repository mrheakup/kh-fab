/* ================= Kh International — Scope without a quotation + printable Gantt charts =================
   Баримт бичиг → «Scope»: a work scope (description, stages, schedule, risks, tools) can be written straight away,
   with no quotation or job behind it; it can later become a job. Gantt charts (one job, or all jobs) go to PDF / print. */
const stdScopes = () => (S.scopes = Array.isArray(S.scopes) ? S.scopes : []);
const SCV = { sel: null };
function newStdScope() {
  S.scopeSeq = (+S.scopeSeq || 0) + 1;
  const x = { id: uid(), _std: 1, _sc: 1, no: 'SC-' + String(S.scopeSeq).padStart(4, '0'), short: '', title: '', customer: '', due: '', status: 'new', note: '', items: [], extra: [], est: null, act: { hours: '', kg: '', other: '' }, trace: [], log: [], files: [], created: today() };
  jx(x); x.scope.start = today(); stdScopes().unshift(x); save(); return x;
}
function scStdBar(job) {
  return `<div class="dhead"><div><h2>Scope · ${esc(job.no)}</h2><p class="muted">Үнийн саналгүй, бие даасан scope${job.customer ? ' · ' + esc(job.customer) : ''}</p></div><span class="sp" style="flex:1"></span>
    <button class="btn ghost" id="scBack">← Жагсаалт</button><button class="btn ghost" id="scDup">⧉ Хуулбар</button><button class="btn" id="scToJob" title="Энэ scope-оор шинэ ажил үүсгэнэ (KH дугаартай) — scope бүхэлдээ шилжинэ">✓ Ажил болгох</button><button class="btn ghost" id="scDel">Устгах</button></div>`;
}
function renderScopeSide() {
  const box = $('#scList'); if (!box) return; const q = lc(($('#scSearch') || {}).value || '');
  const own = stdScopes().filter(x => !q || lc([x.no, x.title, x.customer].join(' ')).includes(q));
  const jobsW = (S.jobs || []).filter(j => j.scope && (j.scope.desc || j.scope.contract) && (!q || lc([j.no, j.title, j.customer].join(' ')).includes(q)));
  box.innerHTML = (own.length ? '<div class="fmorg">Бие даасан scope</div>' : '') + own.map(x => `<div class="bitem fmi${SCV.sel === x.id && J.tab === 'scopes' ? ' on' : ''}" data-sc="${x.id}"><div style="min-width:0"><div class="t"><span class="mono">${esc(x.no)}</span> ${esc(x.title || '—')}</div><div class="m">${esc(x.customer || '')} · ${esc(x.created)}</div></div></div>`).join('')
    + (jobsW.length ? '<div class="fmorg">Ажлын scope</div>' : '') + jobsW.map(j => `<div class="bitem fmi" data-scj="${j.id}"><div style="min-width:0"><div class="t"><span class="mono">${esc(j.no)}</span> ${esc(j.title || '—')}</div><div class="m">${esc(j.customer || '')}${isQ(j) ? ' · үнийн санал' : ''}</div></div></div>`).join('')
    || '<p class="note">Scope алга. «+ Шинэ Scope» дарж үнийн саналгүйгээр шууд бичнэ.</p>';
}
(() => {
  const n = $('#scNew'); if (n) n.addEventListener('click', () => { const x = newStdScope(); SCV.sel = x.id; renderScopeSide(); renderJobMain(); setTimeout(() => { const i = $('#sc_title'); if (i) i.focus(); }, 60); });
  const s = $('#scSearch'); if (s) s.addEventListener('input', renderScopeSide);
  const l = $('#scList'); if (l) l.addEventListener('click', e => {
    const a = e.target.closest('[data-sc]'), b = e.target.closest('[data-scj]');
    if (a) { SCV.sel = a.dataset.sc; renderScopeSide(); renderJobMain(); }
    if (b) { const j = findJob(b.dataset.scj); if (!j) return; setModule(isQ(j) ? 'quotes' : 'jobs'); J.sel = j.id; J.sub = 'scope'; if (!isQ(j)) J.mk = 'scope'; renderJobs(); }
  });
})();
function renderScopeTab(el) {
  const x = stdScopes().find(o => o.id === SCV.sel);
  if (!x) {
    const L = stdScopes();
    el.innerHTML = `<div class="dhead"><div><h2>Scope — ажлын хамрах хүрээ</h2><p class="muted">Үнийн саналгүйгээр шууд scope, хуваарь, Gantt гаргана. Дараа нь «Ажил болгох» боломжтой.</p></div><span class="sp" style="flex:1"></span><button class="btn primary" id="scNew2">+ Шинэ Scope</button></div>
      <div class="jcard"><div class="tblwrap" style="border:0"><table class="dt"><thead><tr><th>№</th><th>Төсөл</th><th>Захиалагч</th><th>Эхлэх</th><th class="r">Үе шат</th><th>Үүсгэсэн</th></tr></thead><tbody>
      ${L.map(o => `<tr class="jrow" data-sc="${o.id}" style="cursor:pointer"><td class="num"><b>${esc(o.no)}</b></td><td>${esc(o.title || '—')}</td><td>${esc(o.customer || '')}</td><td class="num">${esc(o.scope.start || '')}</td><td class="r num">${o.scope.stages.length}</td><td class="num">${esc(o.created)}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Бие даасан scope алга</td></tr>'}
      </tbody></table></div></div>`;
    el.querySelector('#scNew2').addEventListener('click', () => $('#scNew').click());
    el.querySelectorAll('[data-sc]').forEach(r => r.addEventListener('click', () => { SCV.sel = r.dataset.sc; renderScopeSide(); renderJobMain(); }));
    return;
  }
  renderScope(el, x);
  el.querySelectorAll('[data-out]').forEach(b => b.addEventListener('click', () => jobDocOut(x, b.dataset.doc, b.dataset.out)));
  el.querySelector('#scBack').addEventListener('click', () => { SCV.sel = null; renderScopeSide(); renderJobMain(); });
  el.querySelector('#scDel').addEventListener('click', () => { if (!confirm(`${x.no}-г устгах уу?`)) return; S.scopes = stdScopes().filter(o => o !== x); SCV.sel = null; save(); renderScopeSide(); renderJobMain(); });
  el.querySelector('#scDup').addEventListener('click', () => { const c = JSON.parse(JSON.stringify(x)); S.scopeSeq = (+S.scopeSeq || 0) + 1; Object.assign(c, { id: uid(), no: 'SC-' + String(S.scopeSeq).padStart(4, '0'), created: today(), log: [] }); c.scope.stages.forEach(s => s.pct = 0); stdScopes().unshift(c); SCV.sel = c.id; save(); renderScopeSide(); renderJobMain(); toast('⧉ ' + c.no + ' үүслээ'); });
  el.querySelector('#scToJob').addEventListener('click', () => {
    if (!confirm(`${x.no}-оор шинэ ажил үүсгэх үү? Scope бүхэлдээ ажилд шилжинэ.`)) return;
    const y = new Date().getFullYear(); if (S.jobYear !== y) { S.jobYear = y; S.jobSeq = 0; } const n = ++S.jobSeq, short = String(n).padStart(3, '0');
    const j = JSON.parse(JSON.stringify(x)); delete j._std; delete j._sc; Object.assign(j, { id: uid(), no: `KH-${y}-${short}`, short, owner: S.me || '', created: today() });
    S.jobs.unshift(j); jobLog(`Scope ${x.no}-оос ажил үүсгэсэн`, j); S.scopes = stdScopes().filter(o => o !== x); SCV.sel = null; save();
    setModule('jobs'); J.sel = j.id; J.sub = 'scope'; J.mk = 'scope'; renderJobs(); toast('Ажил боллоо: ' + j.no);
  });
}

/* ---------- Gantt documents (landscape) ---------- */
function ganttGrid(D, rows, t0, days, o = {}) {
  // rows: [{ label, sub, bars: [{ a: 'YYYY-MM-DD', d: days, pct, name }], span?: { a, d }, late, bold }]
  const x = D.x, lw = o.lw || 70, X0 = D.M + lw, tw = D.W - lw, rh = o.rh || 7.5, day = tw / days, dx = s => X0 + Math.max(0, (new Date(s + 'T00:00:00') - new Date(t0 + 'T00:00:00')) / 864e5) * day;
  const step = days > 120 ? 14 : days > 45 ? 7 : days > 20 ? 2 : 1;
  const ticks = []; for (let d = 0; d < days; d++) { const dt = addDays(t0, d), mon = new Date(dt + 'T00:00:00').getDay() === 1; if (step >= 7 ? mon : d % step === 0) ticks.push(d); }
  const chunk = (R, from) => {
    const x = D.x, Y = D.y; x.fillStyle = '#f3f6fa'; x.fillRect(D.M, Y, D.W, 9);
    x.font = `600 2.5px ${DF}`; x.fillStyle = DC.ink2; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(o.lt || 'Ажил / үе шат', D.M + 1.5, Y + 4.5);
    ticks.forEach(d => { const X = X0 + d * day, dt = addDays(t0, d); x.font = `400 2.2px ${DFM}`; x.fillStyle = DC.mute; x.textAlign = step >= 7 ? 'left' : 'center'; x.fillText(step >= 7 ? dt.slice(5) : dt.slice(8), step >= 7 ? X + 0.6 : X + day / 2, Y + 6.2); });
    if (step < 7) { x.font = `600 2.2px ${DF}`; x.fillStyle = DC.ink2; x.textAlign = 'left'; let m = ''; for (let d = 0; d < days; d++) { const dt = addDays(t0, d); if (dt.slice(0, 7) !== m) { m = dt.slice(0, 7); x.fillText(m, X0 + d * day + 0.5, Y + 2.6); } } }
    const top = Y + 9, H = R.length * rh;
    R.forEach((r, k) => { const i = from + k, Yr = top + k * rh; x.fillStyle = i % 2 ? DC.zebra : '#fff'; x.fillRect(D.M, Yr, D.W, rh); });
    x.strokeStyle = DC.line2; x.lineWidth = 0.15; ticks.forEach(d => { const X = X0 + d * day; x.beginPath(); x.moveTo(X, top); x.lineTo(X, top + H); x.stroke(); });
    R.forEach((r, k) => {
      const Yr = top + k * rh;
      x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillStyle = r.late ? '#b42318' : DC.ink; x.font = `${r.bold ? 700 : 400} ${r.sub ? 2.6 : 2.8}px ${DF}`;
      let t = r.label; while (t.length > 2 && x.measureText(t).width > lw - 3) t = t.slice(0, -2) + '…'; x.fillText(t, D.M + 1.5, r.sub ? Yr + rh * 0.36 : Yr + rh / 2);
      if (r.sub) { x.font = `400 2.1px ${DF}`; x.fillStyle = DC.mute; let u = r.sub; while (u.length > 2 && x.measureText(u).width > lw - 3) u = u.slice(0, -2) + '…'; x.fillText(u, D.M + 1.5, Yr + rh * 0.74); }
      if (r.span) { const a = dx(r.span.a); x.fillStyle = '#dfe4ea'; x.fillRect(a, Yr + 1.2, Math.max(0.8, Math.min(X0 + tw - a, r.span.d * day)), rh - 2.4); }
      (r.bars || []).forEach(b => { const a = dx(b.a), w = Math.max(0.8, Math.min(X0 + tw - a, b.d * day)), p = Math.min(100, Math.max(0, +b.pct || 0)) / 100, h = r.span ? rh * 0.42 : rh - 3, y = r.span ? Yr + (rh - h) / 2 : Yr + 1.5;
        x.fillStyle = '#f6c9a8'; x.fillRect(a, y, w, h); x.strokeStyle = '#fff'; x.lineWidth = 0.25; x.strokeRect(a, y, w, h); x.fillStyle = DC.acc; x.fillRect(a, y, w * p, h);
        if (b.name && w > 12) { x.font = `400 2px ${DF}`; x.fillStyle = DC.ink; x.textAlign = 'left'; let t = b.name; while (t.length > 2 && x.measureText(t).width > w - 1.5) t = t.slice(0, -2) + '…'; x.fillText(t, a + 0.8, y + h / 2); } });
    });
    if (today() >= t0 && today() < addDays(t0, days)) { const tX = dx(today()); x.strokeStyle = '#2563eb'; x.lineWidth = 0.35; x.setLineDash([1, 0.8]); x.beginPath(); x.moveTo(tX, top); x.lineTo(tX, top + H); x.stroke(); x.setLineDash([]); }
    x.strokeStyle = DC.line; x.lineWidth = 0.2; x.strokeRect(D.M, Y, D.W, 9 + H); x.beginPath(); x.moveTo(D.M, top); x.lineTo(D.M + D.W, top); x.moveTo(X0, Y); x.lineTo(X0, top + H); x.stroke();
    D.y = top + H;
  };
  let i = 0;
  while (i < rows.length) {
    let fit = Math.floor((D.PH - 18 - (D.y + 9)) / rh); if (fit < 2) { D.page(); fit = Math.floor((D.PH - 18 - (D.y + 9)) / rh); }
    const R = rows.slice(i, i + fit); chunk(R, i); i += R.length; if (i < rows.length) D.page();
  }
  D.y += 4; const x2 = D.x;
  x2.font = `400 2.3px ${DF}`; x2.fillStyle = DC.mute; x2.textAlign = 'left'; x2.textBaseline = 'alphabetic'; x2.fillText('Улбар шар — үе шат (тод хэсэг нь гүйцэтгэл %) · саарал — ажлын нийт хугацаа · цэнхэр тасархай — өнөөдөр', D.M, D.y); D.y += 5;
}
async function ganttJobDoc(job) {
  jx(job); const sc = job.scope, st = sc.start || job.created || today(), end = Math.max(1, ...sc.stages.map(s => (+s.start || 1) + (+s.dur || 1) - 1));
  const D = await kdoc({ title: 'АЖЛЫН ХУВААРЬ — GANTT', sub: `${job.no} · ${today()}`, landscape: true, kind: 'scope' });
  D.kv([['Ажил', `${job.no} ${job.title || ''}`], ['Захиалагч', job.customer || '—'], ['Эхлэх', st], ['Дуусах', addDays(st, end - 1) + (job.due ? ` (хугацаа ${job.due})` : '')]], 4);
  const days = Math.max(7, end + 2);
  ganttGrid(D, sc.stages.map(s => ({ label: s.name || '—', sub: `${addDays(st, (+s.start || 1) - 1).slice(5)} → ${addDays(st, (+s.start || 1) + (+s.dur || 1) - 2).slice(5)} · ${s.dur} хон · ${+s.pct || 0}%${s.mach ? ' · ' + machName(s.mach) : ''}`, bars: [{ a: addDays(st, (+s.start || 1) - 1), d: +s.dur || 1, pct: s.pct }] })), addDays(st, -1), days, { lt: 'Үе шат' });
  D.sigs(['Бэлтгэсэн', 'Хянасан', 'Танилцсан']);
  return D;
}
async function ganttAllDoc() {
  const P = planJobs().sort((a, b) => a.st.localeCompare(b.st));
  const t0 = addDays(P.length ? P.map(p => p.st).sort()[0] : today(), -1), t1 = P.length ? P.map(p => p.en).sort().slice(-1)[0] : addDays(today(), 30), days = Math.max(14, Math.round((new Date(t1) - new Date(t0)) / 864e5) + 3);
  const D = await kdoc({ title: 'ҮЙЛДВЭРЛЭЛИЙН ТӨЛӨВЛӨГӨӨ — GANTT', sub: `${P.length} ажил · ${today()}`, landscape: true, kind: 'scope' });
  const rows = P.map(({ j, st, en, sc }) => ({ label: `${j.no} ${j.title || ''}`, sub: [j.customer, j.owner ? pName(j.owner) : '', `${st.slice(5)} → ${en.slice(5)}`].filter(Boolean).join(' · '), late: j.due && j.due < today(), bold: 1,
    span: { a: st, d: Math.max(1, Math.round((new Date(en) - new Date(st)) / 864e5) + 1) }, bars: sc.stages.map(s => ({ a: addDays(st, (+s.start || 1) - 1), d: +s.dur || 1, pct: s.pct, name: s.name })) }));
  if (!rows.length) { D.para('Идэвхтэй ажил алга.'); return D; }
  ganttGrid(D, rows, t0, days, { lw: 78, rh: 9, lt: 'Ажил' });
  return D;
}
