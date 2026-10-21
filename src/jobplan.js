/* ================= Kh International — job templates, recurring tasks, all-jobs Gantt + machine load, invoices & payments ================= */

/* ---------- machines (for load planning) ---------- */
const MACH_DEF = [['laser', 'Лазер зүсэгч', 48], ['press', 'Нугалах пресс', 48], ['lathe', 'Токарь CA6240', 48], ['bore', 'Line bore', 48], ['weld', 'Гагнуурын пост', 96], ['blast', 'Элс цэвэрлэгээ, будаг', 48], ['mill', 'Фрезер', 48], ['crane', 'Гүүрэн кран', 60]];
function machines() { if (!Array.isArray(S.machines)) S.machines = MACH_DEF.map(([id, name, cap]) => ({ id, name, cap })); return S.machines; }
const machName = id => (machines().find(m => m.id === id) || {}).name || '';
function stageCols() { return STAGE_COLS.concat([{ k: 'mach', t: 'Машин / пост', sel: [['', '—']].concat(machines().map(m => [m.id, m.name])), w: 150 }]); }

/* ---------- job templates ---------- */
const JT_DEF = [
  { id: 'bucket', name: 'Шанага засвар', ops: ['weld', 'repair', 'ndt', 'blast'], stages: [['Хүлээн авах, үзлэг (VIR)', 1, 1, 2, 4, ''], ['Хуучин хуяг, ирмэг авах (gouging)', 2, 2, 2, 8, 'weld'], ['Хуяг, ирмэг зүсэх', 2, 1, 1, 6, 'laser'], ['Гагнуур, угсралт', 4, 5, 3, 8, 'weld'], ['NDT, хэмжилт', 9, 1, 1, 6, ''], ['Будаг, хүлээлгэх', 10, 1, 2, 6, 'blast']], tasks: [['Үзлэгийн тайлан (VIR) бэлдэх', 0], ['Hardox материал захиалах', 1], ['Гагнуурын WPS шалгах', 2], ['NDT тайлан', 9], ['Packing list, хүлээлгэх', 10]], cons: ['Hyundai 71MC Ф1.6', 'Gauge / Гауж элэктрод 8мм', 'CO2/ Нүүрс төрөгч', 'Grindering disk Ф125 / 5мм /'] },
  { id: 'linebore', name: 'Line bore засвар', ops: ['bore', 'weld', 'ndt', 'site'], stages: [['Хэмжилт, үзлэг', 1, 1, 2, 4, ''], ['Нүх наплавка (build-up)', 2, 2, 1, 8, 'weld'], ['Line bore боловсруулалт', 4, 2, 1, 8, 'bore'], ['Хэмжилт, тайлан', 6, 1, 1, 4, '']], tasks: [['Line bore багаж бэлдэх', 0], ['Хэмжилтийн тайлан', 6]], cons: ['70 S6 Ф1.2', 'Argon 100%'] },
  { id: 'fence', name: 'Хашаа, металл хийц (цуврал)', ops: ['laser', 'weld', 'blast', 'buy'], stages: [['Зураг, BOM', 1, 1, 1, 6, ''], ['Материал худалдан авах', 1, 3, 1, 4, ''], ['Зүсэлт', 3, 2, 1, 8, 'laser'], ['Гагнуур, угсралт', 5, 5, 4, 8, 'weld'], ['Будаг', 10, 2, 2, 8, 'blast'], ['Савлах, тээвэр', 12, 1, 3, 4, 'crane']], tasks: [['Материалын захиалга (PO)', 0], ['Анхны дээж (first article) шалгах', 5], ['Тээвэр захиалах', 11]], cons: ['Lincoln / Линколн Ф1,2', 'Epoxy Paint', 'Cutting disk Ф125 / 1мм /'] },
  { id: 'laser', name: 'Лазер зүсэлт (лист)', ops: ['laser'], stages: [['Өрөлт, программ', 1, 1, 1, 2, ''], ['Лазер зүсэлт', 1, 1, 1, 6, 'laser'], ['Шалгах, савлах', 2, 1, 1, 2, '']], tasks: [['Материал шалгах (heat №)', 0], ['Зүсэлтийн бүртгэл', 1]], cons: [] },
  { id: 'mach', name: 'Токарь / механик боловсруулалт', ops: ['mach'], stages: [['Зураг, технологи', 1, 1, 1, 2, ''], ['Токарь', 1, 2, 1, 8, 'lathe'], ['Хэмжилт', 3, 1, 1, 2, '']], tasks: [['Материал (бар, хоолой) бэлдэх', 0], ['Хэмжилтийн хуудас', 3]], cons: [] }
];
function jtemplates() { if (!Array.isArray(S.jtpl)) S.jtpl = JSON.parse(JSON.stringify(JT_DEF)); return S.jtpl; }
function applyTemplate(job, t) {
  jx(job); const sc = job.scope;
  job.ops = [...new Set([...(job.ops || []), ...(t.ops || [])])];
  if (t.stages && t.stages.length) sc.stages = t.stages.map(([name, start, dur, people, hours, mach]) => ({ name, start, dur, people, hours, pct: 0, mach: mach || '' }));
  if (!sc.start) sc.start = today();
  (t.cons || []).forEach(n => { if (job.quote.cons.some(r => r.name === n)) return; const c = catFindExact(n); const r = { grp: c ? c.grp : '', name: n, qty: 0, unit: c ? c.unit : 'ш', price: c ? netPrice(c, job.quote) : '', note: '' }; job.quote.cons.push(r); });
  (t.tasks || []).forEach(([title, off]) => newTask({ title, jobId: job.id, type: 'job', assignee: '', due: addDays(sc.start, +off || 0) }));
  if (!job.due) { const end = Math.max(1, ...sc.stages.map(s => (+s.start || 1) + (+s.dur || 1) - 1)); job.due = addDays(sc.start, end); }
  jobLog(`Загвар хэрэглэсэн: ${t.name}`, job); save();
}
function templateFromJob(job, name) {
  const sc = job.scope || { stages: [], start: '' }, T = tasks().filter(t => t.jobId === job.id), st = sc.start || job.created || today();
  const t = { id: uid(), name, ops: job.ops || [], stages: sc.stages.map(s => [s.name, +s.start || 1, +s.dur || 1, +s.people || 1, +s.hours || 0, s.mach || '']), tasks: T.map(x => [x.title, x.due ? Math.max(0, Math.round((new Date(x.due) - new Date(st)) / 864e5)) : 0]), cons: (job.quote && job.quote.cons || []).map(r => r.name).filter(Boolean) };
  jtemplates().push(t); save(); return t;
}
function jobTplHTML(job) {
  return `<div class="jcard" data-v="main"><div class="bcard-h">Ажлын загвар <span class="sp"></span><select id="jtSel" class="inp" style="width:auto"><option value="">Загвар хэрэглэх…</option>${jtemplates().map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select><button class="btn sm ghost" id="jtSave" title="Энэ ажлын үе шат, даалгавар, consumable-ийг загвар болгон хадгална">Энэ ажлыг загвар болгох</button></div>
    <div class="jbody"><p class="note">Загвар нь ажлын төрөл, үе шат (машинтай), даалгавар (огноотой), consumable-ийг бэлэн бөглөнө. Одоо байгаа даалгавар устахгүй.</p></div></div>`;
}
function bindJobTpl(el, job) {
  const s = el.querySelector('#jtSel'); if (s) s.addEventListener('change', () => { const t = jtemplates().find(x => x.id === s.value); if (!t) return; if (!confirm(`«${t.name}» загварыг хэрэглэх үү? Үе шат солигдож, даалгавар нэмэгдэнэ.`)) { s.value = ''; return; } applyTemplate(job, t); toast('Загвар хэрэглэлээ: ' + t.name); renderJobMain(); });
  const b = el.querySelector('#jtSave'); if (b) b.addEventListener('click', () => { const n = prompt('Загварын нэр:', job.title || 'Шинэ загвар'); if (!n) return; templateFromJob(job, n); toast('Загвар хадгалагдлаа: ' + n); renderJobMain(); });
}

/* ---------- recurring tasks ---------- */
const TREP = [['', 'Давтахгүй'], ['daily', 'Өдөр бүр'], ['weekly', 'Долоо хоног бүр'], ['monthly', 'Сар бүр'], ['quarterly', 'Улирал бүр']];
function nextDue(d, r) { const t = new Date((d || today()) + 'T00:00:00'); if (r === 'daily') t.setDate(t.getDate() + 1); else if (r === 'weekly') t.setDate(t.getDate() + 7); else if (r === 'monthly') t.setMonth(t.getMonth() + 1); else if (r === 'quarterly') t.setMonth(t.getMonth() + 3); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; }
function spawnRecurring(t) {
  if (!t.repeat || t.status !== 'done' || t._spawned) return;
  t._spawned = 1; let due = nextDue(t.due || today(), t.repeat); while (due < today()) due = nextDue(due, t.repeat);
  const n = newTask({ title: t.title, desc: t.desc, prio: t.prio, assignee: t.assignee, type: t.type, jobId: t.jobId, due, repeat: t.repeat, tags: (t.tags || []).slice(), sub: (t.sub || []).map(x => ({ t: x.t, done: false })) });
  toast(`↻ Дараагийн «${t.title}» → ${due}`); return n;
}

/* ---------- invoices & payments ---------- */
const invs = job => (job.inv = job.inv || []);
const invPaid = i => (i.pays || []).reduce((a, p) => a + (+p.amount || 0), 0);
function invState(i) { const p = invPaid(i), a = +i.amount || 0; if (a && p >= a) return ['paid', 'Төлсөн']; if (i.due && i.due < today()) return ['late', 'Хугацаа хэтэрсэн']; if (p > 0) return ['part', 'Хэсэгчлэн төлсөн']; return ['open', 'Нэхэмжилсэн']; }
function jobInvSum(job) { const I = invs(job), inv = I.reduce((a, i) => a + (+i.amount || 0), 0), paid = I.reduce((a, i) => a + invPaid(i), 0), late = I.filter(i => invState(i)[0] === 'late').reduce((a, i) => a + (+i.amount || 0) - invPaid(i), 0); return { inv, paid, due: inv - paid, late, n: I.length }; }
function jobInvHTML(job) {
  const I = invs(job), s = jobInvSum(job); let c = null; try { c = quoteCalc(job); } catch (e) { }
  const contract = (+job.price || (c ? c.net : 0)) * (1 + ((job.quote && +job.quote.vat) || 0) / 100);
  return `<div class="jcard" data-v="main"><div class="bcard-h">Нэхэмжлэл, төлбөр <span class="pill ${s.late ? 'qst-lost' : s.inv && !s.due ? 'st-done' : s.inv ? 'qst-sent' : ''}">${s.late ? 'хугацаа хэтэрсэн' : s.inv && !s.due ? 'бүрэн төлсөн' : s.inv ? 'авлагатай' : 'нэхэмжлээгүй'}</span><span class="sp"></span><button class="btn sm" id="invAdd">+ Нэхэмжлэл</button></div><div class="jbody">
    <div class="summary">${[['Гэрээ (НӨАТ-тай)', money(contract)], ['Нэхэмжилсэн', money(s.inv)], ['Төлөгдсөн', money(s.paid)], ['Авлага', money(s.due), s.late ? 'late' : '']].map(([k, v, cl]) => `<div class="stat"><div class="k">${k}</div><div class="v ${cl || ''}">${v}<small>₮</small></div></div>`).join('')}</div>
    ${I.length ? `<div class="tblwrap"><table class="dt"><thead><tr><th>Нэхэмжлэл №</th><th>Огноо</th><th>Төлөх хугацаа</th><th class="r">Дүн, ₮</th><th class="r">Төлсөн, ₮</th><th>Төлөв</th><th></th></tr></thead><tbody>
      ${I.map((i, k) => { const [st, sn] = invState(i); return `<tr><td><input class="inp cell" data-iv="${k}" data-ik="no" value="${esc(i.no)}"></td><td><input class="inp cell" type="date" data-iv="${k}" data-ik="date" value="${esc(i.date)}"></td><td><input class="inp cell" type="date" data-iv="${k}" data-ik="due" value="${esc(i.due)}"></td><td class="r"><input class="inp cell mono" type="number" style="text-align:right" data-iv="${k}" data-ik="amount" value="${esc(i.amount)}"></td><td class="r num">${money(invPaid(i))}<div class="muted" style="font-size:11px">${(i.pays || []).map(p => `${esc(p.date)} · ${money(p.amount)}`).join('<br>')}</div></td><td><span class="pill ${st === 'paid' ? 'st-done' : st === 'late' ? 'qst-lost' : st === 'part' ? 'st-nest' : 'qst-sent'}">${sn}</span></td><td style="white-space:nowrap"><button class="btn sm" data-pay="${k}">+ Төлбөр</button><button class="x" data-idel="${k}">×</button></td></tr>`; }).join('')}
    </tbody></table></div>` : '<p class="note">Нэхэмжлэл үүсгээгүй. «+ Нэхэмжлэл» дарахад гэрээний үлдэгдэл дүнгээр бөглөгдөнө (урьдчилгаа бол дүнг засна).</p>'}
  </div></div>`;
}
function bindJobInv(el, job) {
  const re = () => { save(); renderJobMain(); };
  const a = el.querySelector('#invAdd'); if (a) a.addEventListener('click', () => { let c = null; try { c = quoteCalc(job); } catch (e) { } const contract = Math.round((+job.price || (c ? c.net : 0)) * (1 + ((job.quote && +job.quote.vat) || 0) / 100)), s = jobInvSum(job); S.invSeq = (+S.invSeq || 0) + 1; invs(job).push({ no: 'INV-' + String(S.invSeq).padStart(4, '0'), date: today(), due: addDays(today(), 30), amount: Math.max(0, contract - s.inv), pays: [] }); jobLog('Нэхэмжлэл үүсгэсэн', job); re(); });
  el.querySelectorAll('[data-iv]').forEach(f => f.addEventListener('change', () => { const i = invs(job)[+f.dataset.iv]; i[f.dataset.ik] = f.dataset.ik === 'amount' ? +f.value || 0 : f.value; re(); }));
  el.querySelectorAll('[data-pay]').forEach(b => b.addEventListener('click', () => { const i = invs(job)[+b.dataset.pay], left = (+i.amount || 0) - invPaid(i); const v = prompt(`Төлбөрийн дүн, ₮ (үлдэгдэл ${money(left)}):`, String(Math.max(0, left))); if (v == null) return; const amt = +String(v).replace(/[^\d.]/g, ''); if (!amt) return; const d = prompt('Төлсөн огноо (YYYY-MM-DD):', today()) || today(); (i.pays = i.pays || []).push({ date: d, amount: amt }); jobLog(`Төлбөр орсон: ${money(amt)} ₮ (${i.no})`, job); re(); }));
  el.querySelectorAll('[data-idel]').forEach(b => b.addEventListener('click', () => { if (!confirm('Нэхэмжлэлийг устгах уу?')) return; invs(job).splice(+b.dataset.idel, 1); re(); }));
}
function receivables() {
  const R = []; S.jobs.forEach(j => (j.inv || []).forEach(i => { const left = (+i.amount || 0) - invPaid(i); if (left > 0) R.push({ j, i, left, st: invState(i) }); }));
  return R.sort((a, b) => String(a.i.due || '').localeCompare(String(b.i.due || '')));
}

/* ---------- all-jobs Gantt + machine load (Үйлдвэрлэл → Төлөвлөгөө) ---------- */
const PL = { weeks: 8 };
const isoMon = d => { const t = new Date(d + 'T00:00:00'); const w = (t.getDay() + 6) % 7; t.setDate(t.getDate() - w); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
function planJobs() { return S.jobs.filter(j => !isQ(j) && !['done', 'given'].includes(j.status)).map(j => { jx(j); const sc = j.scope, st = sc.start || j.created || today(), end = Math.max(1, ...sc.stages.map(s => (+s.start || 1) + (+s.dur || 1) - 1)); return { j, st, en: j.due && j.due > st ? j.due : addDays(st, end - 1), sc }; }); }
function machineLoad(P) {
  const w0 = isoMon(today()), weeks = Array.from({ length: PL.weeks }, (_, i) => addDays(w0, i * 7)), L = {};
  machines().forEach(m => L[m.id] = weeks.map(() => 0));
  P.forEach(({ sc, st }) => sc.stages.forEach(s => { if (!s.mach || !L[s.mach]) return; const dur = Math.max(1, +s.dur || 1), h = (+s.people || 0) * (+s.hours || 0) * (1 - Math.min(100, +s.pct || 0) / 100); for (let d = 0; d < dur; d++) { const day = addDays(st, (+s.start || 1) - 1 + d), wi = weeks.indexOf(isoMon(day)); if (wi >= 0) L[s.mach][wi] += h / dur; } }));
  return { weeks, L };
}
function renderPlan(el) {
  const P = planJobs(); if (!el) return;
  const t0 = P.length ? P.map(p => p.st).sort()[0] : today(), t1 = P.length ? P.map(p => p.en).sort().slice(-1)[0] : addDays(today(), 30);
  const a = isoMon(t0 < today() ? t0 : addDays(today(), -7)), days = Math.max(28, Math.round((new Date(t1) - new Date(a)) / 864e5) + 7), pc = d => Math.max(0, Math.min(100, (new Date(d + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5 / days * 100));
  const ticks = []; for (let d = 0; d < days; d += 7) ticks.push(addDays(a, d));
  const { weeks, L } = machineLoad(P), M = machines();
  el.innerHTML = `<div class="dhead"><div><h2>Үйлдвэрлэлийн төлөвлөгөө</h2><p class="muted">${P.length} идэвхтэй ажил · үе шат бүрт машин/пост оноосноор ачаалал бодогдоно</p></div><span class="sp" style="flex:1"></span><button class="btn ghost" id="plMach">Машин, хүчин чадал</button></div>
    <div class="jcard"><div class="bcard-h">Бүх ажлын хуваарь (Gantt)</div><div class="jbody">
      <div class="pg"><div class="pgh"><span></span><div class="pgt">${ticks.map(d => `<i style="left:${pc(d)}%">${d.slice(5)}</i>`).join('')}<b class="today" style="left:${pc(today())}%"></b></div></div>
      ${P.sort((x, y) => x.st.localeCompare(y.st)).map(({ j, st, en, sc }) => { const late = j.due && j.due < today(); return `<div class="pgr" data-pj="${j.id}"><span class="pgl"><b class="mono">${esc(j.no)}</b> ${esc(j.title || '')}<small>${esc(j.customer || '')}${j.owner ? ' · ' + esc(pName(j.owner)) : ''}</small></span><div class="pgb"><div class="pgjob st-${j.status}${late ? ' late' : ''}" style="left:${pc(st)}%;width:${Math.max(0.8, pc(addDays(en, 1)) - pc(st))}%"></div>${sc.stages.map(s => { const s0 = addDays(st, (+s.start || 1) - 1); return `<div class="pgst" title="${esc(s.name)}${s.mach ? ' · ' + esc(machName(s.mach)) : ''} · ${+s.pct || 0}%" style="left:${pc(s0)}%;width:${Math.max(0.5, pc(addDays(s0, +s.dur || 1)) - pc(s0))}%"><i style="width:${Math.min(100, +s.pct || 0)}%"></i></div>`; }).join('')}<b class="today" style="left:${pc(today())}%"></b></div></div>`; }).join('') || '<p class="note">Идэвхтэй ажил алга.</p>'}</div>
      <p class="note">Саарал — ажлын нийт хугацаа (эхлэх → дуусах), өнгөт — үе шатууд ба гүйцэтгэл. Мөр дээр дарж ажлыг нээнэ. Эхлэх огноо, үе шатыг ажлын «Үйлдвэрлэл → Хуваарь» дээр засна.</p></div></div>
    <div class="jcard"><div class="bcard-h">Машин, постын ачаалал — 7 хоногоор (цаг / хүчин чадал)</div><div class="tblwrap" style="border:0"><table class="dt load"><thead><tr><th>Машин / пост</th><th class="r">Чадал/7хон</th>${weeks.map(w => `<th class="r">${w.slice(5)}</th>`).join('')}</tr></thead><tbody>
      ${M.map(m => `<tr><td>${esc(m.name)}</td><td class="r num">${m.cap}</td>${L[m.id].map(h => { const p = m.cap ? h / m.cap * 100 : 0; return `<td class="r num lc" style="--p:${Math.min(100, p)}%;${p > 100 ? 'color:#b42318;font-weight:700' : ''}">${h ? Math.round(h) + ' <small>' + Math.round(p) + '%</small>' : ''}</td>`; }).join('')}</tr>`).join('')}
    </tbody></table></div><div class="jbody"><p class="note">Ачаалал = үе шатны хүн × цаг (гүйцэтгэлийн хувийг хасаад), үргэлжлэх хоногт тэнцүү хуваана. 100%-аас дээш бол улаан.</p></div></div>`;
  el.querySelectorAll('[data-pj]').forEach(r => r.addEventListener('click', () => { setModule('jobs'); J.sel = r.dataset.pj; J.sub = 'scope'; J.mk = 'scope'; renderJobs(); }));
  el.querySelector('#plMach').addEventListener('click', () => {
    const txt = prompt('Машин бүрийг «нэр = 7 хоногийн цаг» гэж нэг мөрөнд таслалаар (жишээ: Лазер зүсэгч = 48, Токарь CA6240 = 48):', machines().map(m => `${m.name} = ${m.cap}`).join(', '));
    if (txt == null) return; const old = machines(); S.machines = txt.split(',').map(p => p.split('=')).filter(x => x[0].trim()).map(([n, c]) => { const nm = n.trim(), o = old.find(m => m.name === nm); return { id: o ? o.id : 'm' + uid().slice(0, 6), name: nm, cap: +c || 48 }; }); save(); renderPlan(el);
  });
}
