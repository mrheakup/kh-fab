/* ================= KH Fab — jobs (ажил), kits (иж бүрдэл), material certificates, ISO trace, labels ================= */
const JST = [['new', 'Шинэ'], ['nest', 'Бэлтгэл'], ['cut', 'Үйлдвэрлэж буй'], ['weld', 'Шалгалт, QC'], ['done', 'Дууссан'], ['given', 'Хүлээлгэсэн']];
/* what kind of work a job involves — not every job is laser cutting */
const JOPS = [['laser', 'Лазер зүсэлт'], ['bend', 'Нугалалт'], ['weld', 'Гагнуур, угсралт'], ['mach', 'Токарь, механик'], ['bore', 'Line bore'], ['repair', 'Засвар'], ['blast', 'Элсэн цэвэрлэгээ, будаг'], ['ndt', 'NDT, шалгалт'], ['site', 'Талбайн ажил'], ['buy', 'Худалдан авалт']];
const jstName = k => (JST.find(s => s[0] === k) || JST[0])[1];
const J = { tab: 'jobs', sel: null, kit: null, traceForm: false };
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const findJob = id => S.jobs.find(j => j.id === id);
const findKit = id => S.kits.find(k => k.id === id);

function jobLog(msg, job) {
  job = job || findJob(S.activeJob); if (!job) return;
  job.log.unshift({ t: new Date().toISOString().slice(0, 16).replace('T', ' '), m: msg });
  if (job.log.length > 200) job.log.length = 200;
  save();
}
const QST = [['draft', 'Ноорог'], ['sent', 'Илгээсэн'], ['won', 'Батлагдсан'], ['lost', 'Татгалзсан']];
const qstName = k => (QST.find(x => x[0] === k) || QST[0])[1];
const isQ = j => j && j.kind === 'quote';
/* quick quotation: only customer + quote; «Ажил болгох» turns it into a full job keeping everything */
/* SQ number is the user's own (e.g. SQ1756); the next one is only suggested from the last used */
function nextSQ() {
  let mx = 0, pre = 'SQ', w = 0;
  S.jobs.forEach(j => { const m = String((j.quote && j.quote.no) || '').match(/^(.*?)(\d+)\s*$/); if (m && /^SQ/i.test(m[1]) && +m[2] > mx) { mx = +m[2]; pre = m[1]; w = m[2].length; } });
  return mx ? pre + String(mx + 1).padStart(w, '0') : 'SQ';
}
function newQuote() {
  const no = nextSQ();
  const job = { id: uid(), owner: S.me || '', kind: 'quote', qst: 'draft', no, short: no.replace(/^\D+/, ''), customer: '', title: '', due: '', status: 'new', note: '', items: [], extra: [], est: null, act: { hours: '', kg: '', other: '' }, trace: [], log: [], created: today() };
  S.jobs.unshift(job); jx(job); job.quote.no = no; jobLog('Үнийн санал нээсэн', job);
  J.sel = job.id; J.sub = 'quote'; J.dash = false; save(); return job;
}
/* import quotations prepared from the SQ… folders (Excel quote files) */
function importQuotes(arr) {
  let n = 0, u = 0; const skip = [];
  arr.forEach(r => {
    if (!r || !r.no) return;
    let job = S.jobs.find(j => (j.quote && j.quote.no) === r.no || j.no === r.no);
    const isNew = !job;
    if (isNew) { job = { id: uid(), owner: S.me || '', kind: 'quote', qst: r.qst || 'sent', no: r.no, short: r.no.replace(/^\D+/, ''), customer: '', title: '', due: '', status: 'new', note: '', items: [], extra: [], est: null, act: { hours: '', kg: '', other: '' }, trace: [], log: [], created: r.date || today() }; S.jobs.push(job); jx(job); job.scope.stages = []; }
    else if (!job.quote.imported) { skip.push(r.no); return; }
    const q = job.quote; job.customer = r.customer || job.customer; job.title = r.title || job.title;
    Object.assign(q, { no: r.no, date: r.date || q.date, valid: r.valid || q.valid, vat: r.vat != null ? r.vat : q.vat, fixedNet: +r.net || 0, lines: r.lines || [], imported: true, noCost: true, srcFolder: r.folder || '', srcFiles: r.files || [] });
    q.qf = Object.assign(qfDefaults(job), r.qf || {}, { mode: (r.lines || []).length ? 'fixed' : 'single' });
    if (r.breakdown && r.breakdown.length) job.scope.desc = 'Задаргаа (Excel):\n' + r.breakdown.map(b => `• ${b.d} — ${b.q} ${b.u} × ${money(b.p)}`).join('\n');
    if (job.customer) orgLearn({ org: job.customer, ...q.qf });
    if (isNew) { jobLog(`Үнийн санал импортолсон (${r.src || 'Excel'})`, job); n++; } else u++;
  });
  S.jobs.sort((a, b) => String((b.quote && b.quote.date) || b.created || '').localeCompare(String((a.quote && a.quote.date) || a.created || '')));
  save(); return { n, u, skip };
}
function quoteToJob(job) {
  const y = new Date().getFullYear();
  if (S.jobYear !== y) { S.jobYear = y; S.jobSeq = 0; }
  const n = ++S.jobSeq, short = String(n).padStart(3, '0');
  if (!job.quote.no) job.quote.no = job.no;
  delete job.kind; job.qst = 'won'; job.no = `KH-${y}-${short}`; job.short = short; job.status = 'new';
  if (!+job.price) { try { job.price = Math.round(quoteCalc(job).net); } catch (e) { } }
  jobLog(`Үнийн санал ${job.quote.no} батлагдаж ажил болсон`, job); J.sub = 'main'; save();
}
/* duplicate a quote or job: same content, new number, fresh status; history, files, invoices, docket and records are not copied */
function dupJob(src) {
  const c = JSON.parse(JSON.stringify(src)); c.id = uid(); c.created = today(); c.log = []; c.trace = []; c.inv = []; c.files = []; delete c.dock; c.due = ''; c.act = { hours: '', kg: '', other: '' }; c.need = '';
  Object.keys(c).forEach(k => { if (k[0] === '_') delete c[k]; });
  if (c.scope && Array.isArray(c.scope.stages)) c.scope.stages.forEach(st => { st.pct = 0; });
  if (isQ(src)) { const no = nextSQ(); c.no = no; c.short = no.replace(/^\D+/, ''); c.qst = 'draft'; if (c.quote) { c.quote.no = no; c.quote.date = today(); c.quote.srcFiles = []; } }
  else { const y = new Date().getFullYear(); if (S.jobYear !== y) { S.jobYear = y; S.jobSeq = 0; } const n = ++S.jobSeq, short = String(n).padStart(3, '0'); c.no = `KH-${y}-${short}`; c.short = short; c.status = 'new'; if (c.quote) { c.quote.no = ''; c.quote.date = today(); } }
  if (c.title) c.title = c.title.replace(/\s*\(хуулбар\)$/, '');
  S.jobs.splice(Math.max(0, S.jobs.indexOf(src)), 0, c);
  jobLog(`${isQ(src) ? 'Үнийн санал' : 'Ажил'} ${isQ(src) ? (src.quote && src.quote.no) || src.no : src.no}-ээс хуулж үүсгэсэн`, c); save(); return c;
}
function newJob() {
  const y = new Date().getFullYear();
  if (S.jobYear !== y) { S.jobYear = y; S.jobSeq = 0; }
  const n = ++S.jobSeq, short = String(n).padStart(3, '0');
  const job = { id: uid(), owner: S.me || '', no: `KH-${y}-${short}`, short, customer: '', title: '', due: '', status: 'new', note: '', items: [], extra: [], est: null, act: { hours: '', kg: '', other: '' }, trace: [], log: [], created: today() };
  S.jobs.unshift(job); jobLog('Ажил нээсэн', job);
  J.sel = job.id; save(); return job;
}
const cleanPart = p => ({ id: uid(), name: p.name, qty: Math.max(0, Math.round(+p.qty || 0)), mat: p.mat, thk: +p.thk, rot: p.rot !== false, mir: !!p.mir, prio: p.prio || 0, outer: p.outer, holes: p.holes, bends: p.bends || [], ...(p.roll ? { roll: p.roll } : {}) });
function jobParts(job) {
  const out = [];
  job.items.forEach(it => { const k = findKit(it.kitId); if (!k) return; k.parts.forEach(p => out.push({ ...cleanPart(p), qty: p.qty * Math.max(0, +it.n || 0), kit: k.name })); });
  job.extra.forEach(p => out.push({ ...cleanPart(p), kit: '' }));
  return out.filter(p => p.qty > 0).map((p, i) => ({ ...p, pno: String(i + 1).padStart(2, '0'), job: job.no, jobShort: job.short, jobId: job.id }));
}
function jobWeight(parts) { return parts.reduce((a, p) => a + partInfo(p).area * p.thk * matOf(p.mat).rho / 1e6 * p.qty, 0); }

/* ---------- nesting hooks ---------- */
function jobsOnResult() {
  const job = findJob(S.activeJob); if (!job || !R) return;
  if (![...R.parts.values()].some(p => p.jobId === job.id)) return;
  const t = R.groups.reduce((a, g) => { const x = g.tot; return { sheets: a.sheets + g.sheets.length, kg: a.kg + x.kg, partsKg: a.partsKg + x.partsKg, cut: a.cut + x.cut, pierce: a.pierce + x.pierce, time: a.time + x.time, matCost: a.matCost + x.matCost, cutCost: a.cutCost + x.cutCost, cost: a.cost + x.cost, sheetArea: a.sheetArea + x.sheetArea, area: a.area + x.area }; }, { sheets: 0, kg: 0, partsKg: 0, cut: 0, pierce: 0, time: 0, matCost: 0, cutCost: 0, cost: 0, sheetArea: 0, area: 0 });
  t.util = t.sheetArea ? t.area / t.sheetArea : 0; t.date = new Date().toISOString().slice(0, 16).replace('T', ' ');
  t.groups = R.groups.map(g => ({ label: g.label, sheets: g.sheets.length, kg: g.tot.kg, matCost: g.tot.matCost, cutCost: g.tot.cutCost, sizes: Object.entries(g.bySize).map(([k, n]) => `${k} ×${n}`).join(', ') }));
  const first = !job.est; job.est = t;
  if (job.status === 'new') job.status = 'nest';
  if (first) jobLog(`Өрөлт: ${t.sheets} лист, ${nf(t.kg, 1)} кг, ашиглалт ${nf(t.util * 100, 1)}%`, job);
  save();
  if (!$('#jobsMain').hidden) renderJobMain();
}
function loadJobToNest(job) {
  const parts = jobParts(job);
  if (!parts.length) { toast('Ажилд парт алга — иж бүрдэл эсвэл нэмэлт парт оруулна уу'); return; }
  S.parts = parts.map(p => ({ id: uid(), name: p.kit ? `${p.name}` : p.name, qty: p.qty, mat: p.mat, thk: p.thk, rot: p.rot, mir: p.mir, prio: p.prio, outer: p.outer, holes: p.holes, bends: p.bends, ...(p.roll ? { roll: p.roll } : {}), job: p.job, jobShort: p.jobShort, jobId: p.jobId, pno: p.pno, kit: p.kit }));
  S.jobName = job.no + (job.title ? ' ' + job.title : '');
  S.activeJob = job.id; R = null;
  jobLog(`Өрөлтөд ачаалсан: ${parts.length} төрөл, ${parts.reduce((a, p) => a + p.qty, 0)} ширхэг`, job);
  save(); renderAll(); setModule('nest');
  toast(`${job.no} ачаалагдлаа — «Өрөх» товчийг дарна уу`, 4000);
}

/* ---------- money: plan (nest estimate + planned extras) vs actual ---------- */
function jobMoney(job) {
  const e = job.est, a = job.act || {}, actH = +a.hours || 0, actKg = +a.kg || 0, other = +a.other || 0;
  const g0 = e ? (e.kg ? e.matCost / e.kg : 0) : 0, rate = e && e.time ? e.cutCost / (e.time / 60) : 0;
  const has = !!(actKg || actH || other);
  const act = e ? (actKg || e.kg) * g0 + (actH ? actH * rate : e.cutCost) + other : other;
  let plan = (e ? e.cost : 0) + (+job.planOther || 0), price = +job.price || 0, act2 = act, has2 = has;
  if (job.quote || job.prog) {
    const c = quoteCalc(job); if (c.mat + c.cons + c.equipRows + c.other > 0) { plan = c.cost; if (!price) price = c.net; } price += c.chg;
    const ex = job.prog.exp.reduce((s, x) => s + expAmt(job, x), 0); if (ex > 0) { act2 = ex + other; has2 = true; }
  }
  return { plan, act: has2 ? act2 : null, price, margin: price ? price - (has2 ? act2 : plan) : null, has: has2, actH, actKg, other, g0, rate };
}
const daysLeft = d => d ? Math.round((new Date(d + 'T00:00:00') - new Date(today() + 'T00:00:00')) / 864e5) : null;

/* ---------- side panel ---------- */
$$('[data-jtab]').forEach(b => b.addEventListener('click', () => { J.tab = b.dataset.jtab; $$('[data-jtab]').forEach(x => x.classList.toggle('on', x === b)); ['jobs', 'kits', 'certs', 'dockets', 'forms', 'scopes', 'invoices'].forEach(t => $('#jtab-' + t).hidden = t !== J.tab); renderJobs(); }));
function renderJobs() { renderJList(); renderKList(); renderCertSide(); renderDockSide(); renderFormSide(); renderScopeSide(); renderInvSide(); renderJobMain(); }
function renderJList() {
  $('#cntJobs').textContent = S.jobs.filter(j => isQ(j) ? j.qst !== 'lost' : !['done', 'given'].includes(j.status)).length || '';
  { const v = document.documentElement.dataset.jview, sg = $('#jSeg'), fv = $('#jFilter').value, opts = v === 'quotes' ? [['quotes', 'Идэвхтэй'], ['closed', 'Татгалзсан'], ['all', 'Бүгд']] : v === 'jobs' ? [['jobs', 'Идэвхтэй'], ['closed', 'Архив'], ['all', 'Бүгд']] : null;
    if (sg) { sg.hidden = !opts; if (opts) { const arch = S.jobs.filter(j => v === 'quotes' ? isQ(j) && j.qst === 'lost' : !isQ(j) && ['done', 'given'].includes(j.status)).length; sg.innerHTML = opts.map(([k, n]) => `<button data-jf="${k}" class="${fv === k ? 'on' : ''}">${n}${k === 'closed' && arch ? ` <span class="mono">${arch}</span>` : ''}</button>`).join(''); } } }
  const q = ($('#jSearch').value || '').toLowerCase(), f = $('#jFilter').value, os = $('#jOrg'), og = os.value;
  { const O = orgs().slice().sort((a, b) => a.name.localeCompare(b.name)); os.innerHTML = `<option value="">Бүх байгууллага (${O.length})</option>${O.map(o => `<option value="${esc(o.id)}"${o.id === og ? ' selected' : ''}>${esc(o.name)} · ${jobsOfOrg(o).length}</option>`).join('')}`; }
  const org = orgs().find(o => o.id === og), inOrg = org ? new Set(jobsOfOrg(org)) : null;
  const hay = j => { const f2 = (j.quote && j.quote.qf) || {}; return [j.no, j.customer, j.title, j.quote && j.quote.no, f2.person, f2.email, f2.phone, f2.rfqName, f2.rfqNo, j.dock && j.dock.no, j.dock && j.dock.po].join(' ').toLowerCase(); };
  const fOk = j => f === 'all' ? true : f === 'quotes' ? isQ(j) : f === 'jobs' ? !isQ(j) && !['done', 'given'].includes(j.status) : f === 'closed' ? (document.documentElement.dataset.jview === 'quotes' ? isQ(j) && j.qst === 'lost' : document.documentElement.dataset.jview === 'jobs' ? !isQ(j) && ['done', 'given'].includes(j.status) : (isQ(j) ? j.qst === 'lost' : ['done', 'given'].includes(j.status))) : (isQ(j) ? j.qst !== 'lost' : !['done', 'given'].includes(j.status));
  const list = S.jobs.filter(j => fOk(j) && (!inOrg || inOrg.has(j)) && (!q || hay(j).includes(q)));
  $('#jList').innerHTML = list.length ? list.map(j => {
    const late = j.due && j.due < today() && !['done', 'given'].includes(j.status);
    return `<div class="jitem${J.sel === j.id && J.tab === 'jobs' ? ' on' : ''}" data-id="${j.id}"><span class="no">${esc(j.no)}${S.activeJob === j.id ? ' <span class="pill rem">өрөлтөд</span>' : ''}</span>${isQ(j) ? `<span class="pill qst-${j.qst || 'draft'}">Санал · ${qstName(j.qst)}</span>` : `<span class="pill st-${j.status}">${jstName(j.status)}</span>`}<span class="t">${esc(j.title || '—')}${j.customer ? ' · ' + esc(j.customer) : ''}${j.quote && j.quote.qf && j.quote.qf.person ? ' · ' + esc(personSplit(j.quote.qf.person).name) : ''}${j.owner && typeof pName === 'function' && pName(j.owner) ? ' · 👤 ' + esc(pName(j.owner)) : ''}${j.need ? ' · ⚠ ' + esc(j.need) : ''}${j.due ? ` · <span class="${late ? 'late' : ''}">${esc(j.due)}</span>` : ''}</span></div>`;
  }).join('') : `<div class="emptyp">${S.jobs.length ? 'Хайлтад тохирох ажил алга.' : 'Ажил алга. <b>+ Шинэ ажил</b> товчоор эхэлнэ.'}</div>`;
  ['formTrace', 'rev', 'operators', 'formQuote', 'formScope', 'formInstr'].forEach(k => $('#iso_' + k).value = S.iso[k] || '');
}
$('#jDash').addEventListener('click', () => setModule('dash'));
$('#jList').addEventListener('click', e => { const it = e.target.closest('.jitem'); if (!it) return; J.sel = it.dataset.id; { const v = document.documentElement.dataset.jview, q = isQ(findJob(J.sel)); if (v === 'dash' || (v === 'quotes' && !q) || (v === 'jobs' && q)) { setModule(q ? 'quotes' : 'jobs'); J.sel = it.dataset.id; } } J.traceForm = false; J.dash = false; renderJList(); renderJobMain(); });
$('#qImp').addEventListener('click', () => $('#qImpIn').click());
$('#qImpIn').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const d = JSON.parse(await f.text()); const r = importQuotes(Array.isArray(d) ? d : d.quotes || []); setModule('quotes'); renderJobs(); toast(`${r.n} үнийн санал нэмэгдлээ${r.u ? `, ${r.u} шинэчлэгдлээ` : ''}${r.skip.length ? ` · ${r.skip.length} нь аль хэдийн байсан тул алгассан` : ''}`); } catch (err) { console.error(err); toast('Файл уншигдсангүй: ' + err.message); } });
$('#qNew').addEventListener('click', () => { const q = newQuote(); setModule('quotes'); J.sel = q.id; J.sub = 'quote'; renderJobs(); setTimeout(() => { const el = $('#qb_no'); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, 50); });
$('#jNew').addEventListener('click', () => { const nj = newJob(); setModule('jobs'); J.sel = nj.id; J.dash = false; J.sub = 'main'; renderJobs(); setTimeout(() => { const el = $('#jf_title'); if (el) el.focus(); }, 50); });
$('#jSearch').addEventListener('input', renderJList);
$('#jFilter').addEventListener('change', renderJList);
$('#jOrg').addEventListener('change', renderJList);
$('#jSeg').addEventListener('click', e => { const b = e.target.closest('[data-jf]'); if (!b) return; $('#jFilter').value = b.dataset.jf; renderJList(); });
['formTrace', 'rev', 'operators', 'formQuote', 'formScope', 'formInstr'].forEach(k => $('#iso_' + k).addEventListener('change', e => { S.iso[k] = e.target.value.trim(); save(); }));

function renderKList() {
  $('#cntKits').textContent = S.kits.length || '';
  const dark = isDark();
  $('#kList').innerHTML = S.kits.length ? S.kits.map((k, i) => {
    const n = k.parts.reduce((a, p) => a + p.qty, 0), kg = jobWeight(k.parts);
    return `<div class="bitem${J.kit === k.id && J.tab === 'kits' ? ' on' : ''}" data-id="${k.id}"><canvas data-i="${i}"></canvas><div style="min-width:0"><div class="t">${esc(k.name)}</div><div class="m">${k.parts.length} төрөл · ${n} ш · ${nf(kg, 1)} кг</div></div><span></span></div>`;
  }).join('') : '<div class="emptyp">Иж бүрдэл алга. Nesting дээр шанаганы эд ангиудаа оруулаад <b>Иж бүрдэл болгох</b> товчийг дарна уу.</div>';
  $$('#kList canvas').forEach(c => { const k = S.kits[+c.dataset.i]; const p = k.parts.slice().sort((a, b) => partInfo(b).area - partInfo(a).area)[0]; drawPartBox(c, p, partColor(+c.dataset.i + 3, dark, 0.85)); });
}
$('#kList').addEventListener('click', e => { const it = e.target.closest('.bitem'); if (!it) return; J.kit = it.dataset.id; J.bucket = false; BK.edit = null; renderKList(); renderJobMain(); });
$('#kBucket').addEventListener('click', () => { J.bucket = true; BK.edit = null; renderKList(); renderJobMain(); });
function kitFromParts() {
  if (!S.parts.length) { toast('Nesting-д парт алга'); return null; }
  const k = { id: uid(), name: 'Шинэ иж бүрдэл ' + (S.kits.length + 1), desc: '', parts: S.parts.filter(p => p.qty > 0).map(cleanPart) };
  S.kits.unshift(k); J.kit = k.id; save(); return k;
}
$('#kFromParts').addEventListener('click', () => { if (kitFromParts()) { renderJobs(); toast('Иж бүрдэл үүслээ — нэрийг нь өгнө үү'); } });
$('#btnKitFrom').addEventListener('click', () => {
  if (!kitFromParts()) return;
  J.tab = 'kits'; $$('[data-jtab]').forEach(x => x.classList.toggle('on', x.dataset.jtab === 'kits')); ['jobs', 'kits', 'certs', 'dockets', 'forms', 'scopes', 'invoices'].forEach(t => $('#jtab-' + t).hidden = t !== 'kits');
  setModule('docs'); toast('Иж бүрдэл үүслээ — нэрийг нь өгнө үү');
});

function renderCertSide() {
  $('#c_mat').innerHTML = matOptions(S.defMat); if (!$('#c_thk').value) $('#c_thk').value = S.defThk;
}
$('#cAdd').addEventListener('click', () => {
  const heat = $('#c_heat').value.trim(), thk = +$('#c_thk').value, L = +$('#c_L').value, W = +$('#c_W').value, qty = Math.max(1, Math.round(+$('#c_qty').value || 1));
  if (!heat || !(thk > 0)) { toast('Хайлалтын дугаар, зузааныг оруулна уу'); return; }
  S.certs.unshift({ id: uid(), heat, cert: $('#c_cert').value.trim(), mat: $('#c_mat').value, thk, L: L || 0, W: W || 0, qty, used: 0, sup: $('#c_sup').value.trim(), date: today() });
  ['c_heat', 'c_cert', 'c_L', 'c_W', 'c_sup'].forEach(id => $('#' + id).value = ''); $('#c_qty').value = 1;
  save(); renderJobMain(); toast('Гэрчилгээ бүртгэгдлээ');
});

/* ---------- main panel ---------- */
function renderJobMain() {
  const el = $('#jobsMain');
  if (J.tab === 'kits') { if (J.bucket) renderBucketMain(el); else renderKitMain(el); return; }
  if (J.tab === 'certs') { renderCertMain(el); return; }
  if (J.tab === 'dockets') { renderDocketMain(el); return; }
  if (J.tab === 'forms') { renderFormMain(el); return; }
  if (J.tab === 'scopes') { renderScopeTab(el); return; }
  if (J.tab === 'invoices') { renderInvTab(el); return; }
  if (J.dash && S.jobs.length) { renderDash(el); return; }
  const job = findJob(J.sel) || findJob(S.activeJob) || S.jobs[0];
  if (!job) { el.innerHTML = '<div class="jempty"><b>Ажил алга</b><br>Зүүн талын <b>+ Шинэ ажил</b> товчоор ажлын дугаар үүсгэнэ. Дугаар нь <span class="mono">KH-' + new Date().getFullYear() + '-001</span> хэлбэртэй, жил бүр шинээр эхэлнэ.</div>'; return; }
  J.sel = job.id;
  if (isQ(job) && J.sub !== 'scope') J.sub = 'quote';
  if (J.sub && !['main', 'prod'].includes(J.sub)) { renderJobSub(el, job); return; }
  const parts = jobParts(job), pcs = parts.reduce((a, p) => a + p.qty, 0), kg = jobWeight(parts);
  const kitOpts = sel => '<option value="">— сонгох —</option>' + S.kits.map(k => `<option value="${k.id}"${k.id === sel ? ' selected' : ''}>${esc(k.name)}</option>`).join('');
  const e = job.est, a = job.act || {};
  const actH = +a.hours || 0, actKg = +a.kg || 0, other = +a.other || 0;
  const g0 = e ? (e.kg ? e.matCost / e.kg : 0) : 0, rate = e && e.time ? e.cutCost / (e.time / 60) : 0;
  const actCost = e ? (actKg || e.kg) * g0 + (actH ? actH * rate : e.cutCost) + other : 0, money = jobMoney(job);
  const dlt = (est, act) => { if (!est || !act) return ''; const d = (act - est) / est * 100; return `<div class="d ${d > 0 ? 'd-up' : 'd-dn'}">${d > 0 ? '+' : ''}${nf(d, 1)}%</div>`; };
  const ops = (S.iso.operators || '').split(',').map(x => x.trim()).filter(Boolean);
  const rows = job.trace.map((t, i) => `<tr data-i="${i}"><td class="num">${esc(t.date)}</td><td>${esc(t.lay)}</td><td class="num">${esc(t.size)}</td><td>${esc(t.mat)} ${t.thk}мм</td><td class="r num">${t.count}</td><td class="num">${esc(t.heat)}</td><td class="num">${esc(t.cert || '')}</td><td>${esc(t.op || '')}</td><td><button class="x" data-tdel aria-label="Устгах">×</button></td></tr>`).join('');
  el.innerHTML = `${jobSubBar(job)}
    <div class="bhead" data-v="main">
      <label class="fld sm" style="width:150px">Ажлын дугаар<input id="jf_no" class="mono" value="${esc(job.no)}"></label>
      <label class="fld grow">Ажлын нэр<input id="jf_title" value="${esc(job.title)}" placeholder="жишээ: PC200 шанага ×2"></label>
      <label class="fld grow">Захиалагч (байгууллага)<input id="jf_customer" list="dl-org" value="${esc(job.customer)}" placeholder="жагсаалтаас сонгох эсвэл шинээр"></label>
      <label class="fld">Хугацаа<input id="jf_due" type="date" value="${esc(job.due)}"></label>
      <label class="fld" hidden>Төлөв<select id="jf_status">${JST.map(([k, n]) => `<option value="${k}"${k === job.status ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="fld grow">Тайлбар<input id="jf_note" value="${esc(job.note)}"></label>
      <label class="fld">Гэрээний үнэ, ₮<input id="jf_price" type="number" min="0" step="10000" value="${esc(job.price || '')}" class="mono"></label>
    </div>
    <div class="exports" data-v="prod">
      <button class="btn primary" id="jLoad">Өрөлтөд ачаалах</button>
      <button class="btn" id="jLabels">Шошго PDF (QR)</button>
      <label class="check" style="margin:0 6px 0 0"><input type="checkbox" id="jEach"><span>Ширхэг бүрт шошго</span></label>
      <span class="outb"><button class="btn" id="jCard">Ажлын карт PDF (ISO)</button><button class="btn ghost" id="jCardPrint" title="Хэвлэх">🖨</button></span>
      <span class="sp" style="flex:1"></span>
      <button class="btn ghost" id="jDel">Ажил устгах</button>
    </div>
    <div class="jcard" data-v="prod"><div class="bcard-h">Бүрэлдэхүүн <span class="sp"></span><span class="muted mono" style="font-weight:400">${parts.length} төрөл · ${pcs} ш · ${nf(kg, 1)} кг</span></div><div class="jbody">
      <div class="tblwrap"><table class="dt"><thead><tr><th>Иж бүрдэл</th><th class="r" style="width:110px">Тоо</th><th class="r">Парт, ш</th><th class="r">Жин, кг</th><th style="width:30px"></th></tr></thead><tbody>
      ${job.items.map((it, i) => { const k = findKit(it.kitId); const n = k ? k.parts.reduce((a, p) => a + p.qty, 0) * (+it.n || 0) : 0; return `<tr data-i="${i}"><td><select data-k="kitId">${kitOpts(it.kitId)}</select></td><td><input data-k="n" type="number" min="0" value="${it.n}" class="mono" style="text-align:right"></td><td class="r num">${n}</td><td class="r num">${k ? nf(jobWeight(k.parts) * (+it.n || 0), 1) : '—'}</td><td><button class="x" data-idel aria-label="Хасах">×</button></td></tr>`; }).join('')}
      ${job.extra.length ? `<tr><td>Нэмэлт партууд <span class="muted">(${job.extra.length} төрөл)</span></td><td class="r num">—</td><td class="r num">${job.extra.reduce((a, p) => a + p.qty, 0)}</td><td class="r num">${nf(jobWeight(job.extra), 1)}</td><td><button class="x" data-xdel title="Нэмэлт партуудыг хасах">×</button></td></tr>` : ''}
      </tbody></table></div>
      <div class="addrow"><button class="btn sm" id="jAddKit"${S.kits.length ? '' : ' disabled title="Эхлээд иж бүрдэл үүсгэнэ"'}>+ Иж бүрдэл</button><button class="btn sm" id="jAddExtra">+ Nesting-ийн одоогийн партуудыг нэмэх</button>${S.kits.length ? '' : '<span class="note">Иж бүрдэл алга — «Иж бүрдэл» таб эсвэл Nesting дээрх «Иж бүрдэл болгох» товчоор үүсгэнэ.</span>'}</div>
    </div></div>
    <div class="jcard" data-v="prod"><div class="bcard-h">Тооцоо — төлөвлөсөн ба бодит <span class="sp"></span><span class="muted" style="font-weight:400;font-size:12px">${e ? 'өрөлт: ' + esc(e.date) : 'өрөлт хийгдээгүй'}</span></div><div class="jbody">
      ${e ? `<div class="cmpv">
        <div><div class="k">Лист</div><div class="v">${e.sheets}</div><div class="d muted">${esc(e.groups.map(g => g.label + ': ' + g.sizes).join('; '))}</div></div>
        <div><div class="k">Материал, кг</div><div class="v">${nf(e.kg, 1)}${actKg ? ` → ${nf(actKg, 1)}` : ''}</div>${dlt(e.kg, actKg)}</div>
        <div><div class="k">Зүсэлт, цаг</div><div class="v">${nf(e.time / 60, 2)}${actH ? ` → ${nf(actH, 2)}` : ''}</div>${dlt(e.time / 60, actH)}</div>
        <div><div class="k">Зүсэх урт, м</div><div class="v">${nf(e.cut / 1000, 1)}</div><div class="d muted">${e.pierce} цоолт · ашиглалт ${nf(e.util * 100, 1)}%</div></div>
        <div><div class="k">Өртөг, ₮</div><div class="v">${nf(e.cost)}${(actKg || actH || other) ? ` → ${nf(actCost)}` : ''}</div>${(actKg || actH || other) ? dlt(e.cost, actCost) : ''}</div>
      </div>` : '<p class="note">«Өрөлтөд ачаалах» → «Өрөх» хийхэд төлөвлөсөн лист, кг, хугацаа, өртөг энд автоматаар бичигдэнэ.</p>'}
      <div class="jgrid">
        <label class="fld">Бодит зүсэлтийн хугацаа, цаг<input id="ja_hours" type="number" min="0" step="0.1" value="${esc(a.hours)}"></label>
        <label class="fld">Бодит зарцуулсан материал, кг<input id="ja_kg" type="number" min="0" step="1" value="${esc(a.kg)}"></label>
        <label class="fld">Бусад зардал (хий, ажиллах хүч), ₮<input id="ja_other" type="number" min="0" step="1000" value="${esc(a.other)}"></label>
        <label class="fld">Төлөвлөсөн бусад зардал (гагнуур, будаг), ₮<input id="jp_other" type="number" min="0" step="1000" value="${esc(job.planOther || '')}"></label>
      </div>
      ${money.price ? `<p class="note" style="margin-top:8px">Гэрээ ${nf(money.price)} ₮ · төсөв ${nf(money.plan)} ₮${money.has ? ` · бодит ${nf(money.act)} ₮` : ''} · <b class="${money.margin < 0 ? 'late' : ''}">ашиг ${nf(money.margin)} ₮ (${nf(money.margin / money.price * 100, 1)}%)</b></p>` : ''}
    </div></div>
    <div class="jcard" data-v="prod"><div class="bcard-h">Зүсэлтийн бүртгэл — ISO 9001 ул мөр <span class="sp"></span><button class="btn sm" id="jTraceNest">Өрөлтөөс бүртгэх</button><button class="btn sm ghost" id="jTraceAdd">+ Гараар</button></div><div class="jbody">
      <div id="jTraceForm"></div>
      ${job.trace.length ? `<div class="tblwrap"><table class="dt"><thead><tr><th>Огноо</th><th>Лист</th><th>Хэмжээ</th><th>Материал</th><th class="r">Тоо</th><th>Хайлалт №</th><th>Гэрчилгээ №</th><th>Оператор</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : '<p class="note">Зүссэн лист бүрийн хавтангийн хайлалтын дугаар, операторыг энд бүртгэнэ. ISO аудитад бүтээгдэхүүнээс материалын гэрчилгээ хүртэл мөрдөх боломжтой болно.</p>'}
    </div></div>
    ${jobNextHTML(job)}${jobInvHTML(job)}${jobTasksHTML(job)}${jobTplHTML(job)}${jobFilesHTML(job)}${srcFolderHTML(job)}<div class="jcard" data-v="main"><div class="bcard-h">Түүх</div><div class="jbody"><div class="jlog">${job.log.map(l => `<div><span class="mono">${esc(l.t)}</span>${esc(l.m)}</div>`).join('') || '<span class="note">—</span>'}</div></div></div>
    <datalist id="opList">${ops.map(o => `<option value="${esc(o)}">`).join('')}</datalist>`;
  bindSubBar(el); bindJobFiles(el, job); bindJobTasks(el, job); bindSrcFolder(el, job); bindJobInv(el, job); bindJobTpl(el, job);
  el.querySelectorAll('[data-st]').forEach(b => b.addEventListener('click', () => { if (b.dataset.st === job.status) return; const o = jstName(job.status); job.status = b.dataset.st; jobLog(`Төлөв: ${o} → ${jstName(job.status)}`, job); save(); renderJList(); renderJobMain(); }));
  el.querySelectorAll('[data-op]').forEach(b => b.addEventListener('click', () => { const o = job.ops = job.ops || [], k = b.dataset.op, i = o.indexOf(k); if (i >= 0) o.splice(i, 1); else o.push(k); save(); renderJobMain(); }));
  { const nd = el.querySelector('#jf_need'); if (nd) nd.addEventListener('change', () => { job.need = nd.value.trim(); if (job.need) jobLog('Тэмдэглэл: ' + job.need, job); save(); renderJList(); }); }
  { const v = J.sub === 'prod' ? 'prod' : 'main'; el.querySelectorAll('[data-v]').forEach(n => { n.hidden = n.dataset.v !== v; }); el.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { J.sub = b.dataset.go === 'make' ? (J.mk || 'prod') : b.dataset.go; renderJobMain(); })); }
  // field bindings
  ['no', 'title', 'customer', 'due', 'note'].forEach(k => $('#jf_' + k).addEventListener('change', ev => { const v = ev.target.value.trim(); if (k === 'no' && !v) return; if (k === 'no') { job.no = v; job.short = (v.match(/(\d+)\s*$/) || [, v])[1]; } else job[k] = v; if (k === 'customer' && v) { orgLearn({ org: v }); if (job.quote && job.quote.qf) { if (formAuto(job.quote.qf, v)) toast('📄 «' + v + '» маягт үнийн саналд орлоо'); else if (qfFillFromDir(job.quote.qf, v)) toast('Захиалагчийн хаяг, ID үнийн саналд бөглөгдлөө'); } } save(); renderJList(); }));
  $('#jf_status').addEventListener('change', ev => { const o = jstName(job.status); job.status = ev.target.value; jobLog(`Төлөв: ${o} → ${jstName(job.status)}`, job); renderJList(); renderJobMain(); });
  ['hours', 'kg', 'other'].forEach(k => $('#ja_' + k).addEventListener('change', ev => { job.act[k] = ev.target.value; save(); renderJobMain(); }));
  $('#jf_price').addEventListener('change', ev => { job.price = Math.max(0, +ev.target.value || 0); save(); renderJobMain(); });
  $('#jp_other').addEventListener('change', ev => { job.planOther = Math.max(0, +ev.target.value || 0); save(); renderJobMain(); });
  el.querySelector('tbody').addEventListener('change', ev => { const tr = ev.target.closest('tr[data-i]'); if (!tr) return; const it = job.items[+tr.dataset.i], k = ev.target.dataset.k; if (k === 'n') it.n = Math.max(0, Math.round(+ev.target.value || 0)); else it.kitId = ev.target.value; save(); renderJobMain(); });
  el.querySelector('tbody').addEventListener('click', ev => { if (ev.target.matches('[data-idel]')) { job.items.splice(+ev.target.closest('tr').dataset.i, 1); save(); renderJobMain(); } else if (ev.target.matches('[data-xdel]')) { job.extra = []; save(); renderJobMain(); } });
  $('#jAddKit').addEventListener('click', () => { job.items.push({ kitId: S.kits[0] ? S.kits[0].id : '', n: 1 }); save(); renderJobMain(); });
  $('#jAddExtra').addEventListener('click', () => { const ps = S.parts.filter(p => p.qty > 0 && p.jobId !== job.id); if (!ps.length) { toast('Nesting-д нэмэх парт алга'); return; } job.extra.push(...ps.map(cleanPart)); jobLog(`Нэмэлт ${ps.length} төрлийн парт нэмсэн`, job); renderJobMain(); toast(`${ps.length} төрлийн парт нэмэгдлээ`); });
  $('#jLoad').addEventListener('click', () => loadJobToNest(job));
  $('#jLabels').addEventListener('click', () => jobLabelsPdf(job, $('#jEach').checked));
  $('#jCard').addEventListener('click', () => jobCardPdf(job));
  $('#jCardPrint').addEventListener('click', () => { window.__pv = 1; jobCardPdf(job); });
  $('#jDel').addEventListener('click', ev => { const b = ev.currentTarget; if (!b.dataset.arm) { b.dataset.arm = 1; b.textContent = 'Дахин дарж баталгаажуулна'; setTimeout(() => { delete b.dataset.arm; b.textContent = 'Ажил устгах'; }, 3000); return; } S.jobs = S.jobs.filter(j => j !== job); if (S.activeJob === job.id) S.activeJob = null; J.sel = null; save(); renderJobs(); });
  const tb = el.querySelectorAll('tbody')[1]; if (tb) tb.addEventListener('click', ev => { if (!ev.target.matches('[data-tdel]')) return; const t = job.trace.splice(+ev.target.closest('tr').dataset.i, 1)[0]; const c = S.certs.find(x => x.heat === t.heat && x.mat === t.mat && +x.thk === +t.thk); if (c) c.used = Math.max(0, c.used - t.count); jobLog(`Бүртгэл устгасан: ${t.lay} (${t.heat})`, job); renderJobMain(); });
  $('#jTraceAdd').addEventListener('click', () => traceForm(job, null));
  $('#jTraceNest').addEventListener('click', () => { if (!R || S.activeJob !== job.id) { toast('Энэ ажлыг эхлээд өрөлтөд ачаалж, өрнө үү'); return; } traceForm(job, R); });
}
function heatOptions(mat, thk) {
  const cs = S.certs.filter(c => c.mat === mat && +c.thk === +thk);
  const rest = S.certs.filter(c => !(c.mat === mat && +c.thk === +thk));
  const o = c => `<option value="${c.id}">${esc(c.heat)}${c.cert ? ' · ' + esc(c.cert) : ''} · ${esc(c.mat)} ${c.thk}мм · үлдсэн ${Math.max(0, c.qty - c.used)}</option>`;
  return '<option value="">— хайлалт сонгох —</option>' + cs.map(o).join('') + (rest.length ? `<optgroup label="Бусад материал">${rest.map(o).join('')}</optgroup>` : '') + '<option value="__rem">Үлдэгдлээс (гэрчилгээ нь эх ажилд)</option>';
}
function traceForm(job, res) {
  const box = $('#jTraceForm');
  const lays = res ? res.groups.flatMap(g => g.lays.map(l => ({ g, l }))) : [{ g: null, l: null }];
  box.innerHTML = `<div class="tblwrap"><table class="dt"><thead><tr><th style="width:26px"></th><th>Лист</th><th>Хэмжээ</th><th>Материал</th><th class="r" style="width:70px">Тоо</th><th>Хайлалт</th><th>Оператор</th></tr></thead><tbody>
    ${lays.map(({ g, l }, i) => `<tr data-i="${i}"><td><input type="checkbox" data-k="on" checked></td>
      <td>${l ? `Лист ${l.no}` : `<input data-k="lay" placeholder="Лист / тайлбар">`}</td>
      <td class="num">${l ? `${l.sheet.L}×${l.sheet.W}${l.sheet.kind === 'rem' ? ' (үлд.)' : ''}` : '<input data-k="size" placeholder="3000×1500">'}</td>
      <td>${g ? `${esc(g.mat)} ${g.thk}мм` : `<select data-k="mat">${matOptions(S.defMat)}</select>`}</td>
      <td><input data-k="count" type="number" min="1" value="${l ? l.count : 1}" class="mono" style="text-align:right"></td>
      <td><select data-k="heat">${heatOptions(g ? g.mat : S.defMat, g ? g.thk : S.defThk)}</select></td>
      <td><input data-k="op" list="opList" placeholder="Оператор"></td></tr>`).join('')}
    </tbody></table></div>
    <div class="addrow">${res ? '' : `<label class="fld" style="width:110px">Зузаан, мм<input id="tf_thk" type="number" step="0.1" value="${S.defThk}"></label>`}<button class="btn primary sm" id="tfSave">Бүртгэх</button><button class="btn sm ghost" id="tfCancel">Болих</button><span class="note">Хайлалт сонгосон листүүдийн тоог материалын бүртгэлээс хасна.</span></div>`;
  $('#tfCancel').addEventListener('click', () => box.innerHTML = '');
  $('#tfSave').addEventListener('click', () => {
    let n = 0;
    box.querySelectorAll('tbody tr').forEach(tr => {
      const v = k => { const el = tr.querySelector(`[data-k="${k}"]`); return el ? (el.type === 'checkbox' ? el.checked : el.value) : null; };
      if (!v('on')) return;
      const { g, l } = lays[+tr.dataset.i], hid = v('heat'), c = S.certs.find(x => x.id === hid), count = Math.max(1, Math.round(+v('count') || 1));
      const mat = g ? g.mat : v('mat'), thk = g ? +g.thk : +($('#tf_thk') ? $('#tf_thk').value : S.defThk);
      const remNoTxt = l && l.sheet.kind === 'rem' ? (S.remnants.find(r => r.id === l.sheet.remId) || {}).no || 'үлдэгдэл' : '';
      job.trace.push({ date: today(), lay: l ? `Лист ${l.no}` + (remNoTxt ? ` (${remNoTxt})` : '') : (v('lay') || '—'), size: l ? `${l.sheet.L}×${l.sheet.W}` : (v('size') || ''), mat, thk, count, heat: c ? c.heat : hid === '__rem' ? 'үлдэгдэл' + (remNoTxt ? ' ' + remNoTxt : '') : '—', cert: c ? c.cert : '', op: v('op') || '' });
      if (c) c.used += count;
      n++;
    });
    if (!n) { toast('Мөр сонгоогүй байна'); return; }
    if (['new', 'nest'].includes(job.status)) job.status = 'cut';
    jobLog(`Зүсэлт бүртгэсэн: ${n} мөр`, job);
    box.innerHTML = ''; renderJList(); renderJobMain(); toast('Зүсэлтийн бүртгэл хадгалагдлаа');
  });
}
function renderKitMain(el) {
  const k = findKit(J.kit) || S.kits[0];
  if (!k) { el.innerHTML = '<div class="jempty"><b>Иж бүрдэл алга</b><br>Nesting дээр нэг шанаганы (эсвэл бусад бүтээгдэхүүний) бүх эд ангийг нэг ширхэгийн тоогоор оруулаад <b>Иж бүрдэл болгох</b> товчийг дарна. Дараа нь ажилд «× тоо» гэж оруулахад автоматаар үржинэ.</div>'; return; }
  J.kit = k.id; const dark = isDark(), usedIn = S.jobs.filter(j => j.items.some(it => it.kitId === k.id));
  el.innerHTML = `
    <div class="bhead"><label class="fld grow">Иж бүрдлийн нэр<input id="kf_name" value="${esc(k.name)}" placeholder="жишээ: PC200 шанага 0.8 м³"></label><label class="fld grow">Тайлбар<input id="kf_desc" value="${esc(k.desc)}"></label></div>
    <div class="exports">${k.bucket ? '<button class="btn" id="kBkEdit">Шанагын хэмжээг засах</button>' : ''}<button class="btn primary" id="kToNest">Nesting руу нэмэх ×</button><input id="kN" type="number" min="1" value="1" class="inp mono" style="width:70px"><button class="btn" id="kAddParts">Nesting-ийн партуудыг энд нэмэх</button><span style="flex:1"></span><button class="btn ghost" id="kDel">Иж бүрдэл устгах</button></div>
    <div class="jcard"><div class="bcard-h">Эд ангиуд — нэг иж бүрдэлд <span class="sp"></span><span class="muted mono" style="font-weight:400">${k.parts.reduce((a, p) => a + p.qty, 0)} ш · ${nf(jobWeight(k.parts), 1)} кг</span></div>
      <div class="tblwrap" style="border:0"><table class="dt"><thead><tr><th style="width:60px"></th><th>Нэр</th><th>Материал</th><th style="width:90px">Зузаан</th><th class="r">Хэмжээ, мм</th><th class="r">Жин 1ш, кг</th><th class="r" style="width:90px">Тоо</th><th style="width:30px"></th></tr></thead><tbody>
      ${k.parts.map((p, i) => { const inf = partInfo(p); return `<tr data-i="${i}"><td><canvas class="thumb" style="width:44px;height:44px" data-i="${i}"></canvas></td><td><input data-k="name" value="${esc(p.name)}"></td><td><select data-k="mat">${matOptions(p.mat)}</select></td><td><input data-k="thk" type="number" step="0.1" value="${p.thk}" class="mono"></td><td class="r num">${nf(inf.w, 1)}×${nf(inf.h, 1)}</td><td class="r num">${nf(inf.area * p.thk * matOf(p.mat).rho / 1e6, 2)}</td><td><input data-k="qty" type="number" min="0" value="${p.qty}" class="mono" style="text-align:right"></td><td><button class="x" data-pdel aria-label="Хасах">×</button></td></tr>`; }).join('')}
      </tbody></table></div></div>
    <p class="note">${usedIn.length ? 'Ашигласан ажил: ' + usedIn.map(j => esc(j.no)).join(', ') : 'Ямар ч ажилд ашиглаагүй.'}</p>`;
  el.querySelectorAll('canvas.thumb').forEach(c => drawPartBox(c, k.parts[+c.dataset.i], partColor(+c.dataset.i, dark, 0.85)));
  if ($('#kBkEdit')) $('#kBkEdit').addEventListener('click', () => { BK.edit = k.id; J.bucket = true; renderJobMain(); });
  $('#kf_name').addEventListener('change', e => { k.name = e.target.value.trim() || k.name; save(); renderKList(); });
  $('#kf_desc').addEventListener('change', e => { k.desc = e.target.value; save(); });
  el.querySelector('tbody').addEventListener('change', e => { const tr = e.target.closest('tr'), p = k.parts[+tr.dataset.i], f = e.target.dataset.k; if (f === 'qty') p.qty = Math.max(0, Math.round(+e.target.value || 0)); else if (f === 'thk') p.thk = Math.max(0.1, +e.target.value || p.thk); else p[f] = e.target.value; save(); renderKList(); renderKitMain(el); });
  el.querySelector('tbody').addEventListener('click', e => { if (!e.target.matches('[data-pdel]')) return; k.parts.splice(+e.target.closest('tr').dataset.i, 1); save(); renderKList(); renderKitMain(el); });
  $('#kToNest').addEventListener('click', () => { const n = Math.max(1, Math.round(+$('#kN').value || 1)); k.parts.forEach(p => S.parts.push({ ...cleanPart(p), qty: p.qty * n })); save(); renderParts(); toast(`${k.name} ×${n} Nesting-д нэмэгдлээ`); });
  $('#kAddParts').addEventListener('click', () => { const ps = S.parts.filter(p => p.qty > 0); if (!ps.length) { toast('Nesting-д парт алга'); return; } k.parts.push(...ps.map(cleanPart)); save(); renderKList(); renderKitMain(el); toast(`${ps.length} парт нэмэгдлээ`); });
  $('#kDel').addEventListener('click', e => { const b = e.currentTarget; if (!b.dataset.arm) { b.dataset.arm = 1; b.textContent = 'Дахин дарж баталгаажуулна'; setTimeout(() => { delete b.dataset.arm; b.textContent = 'Иж бүрдэл устгах'; }, 3000); return; } S.kits = S.kits.filter(x => x !== k); J.kit = null; save(); renderJobs(); });
}
function renderCertMain(el) {
  const uses = c => S.jobs.filter(j => j.trace.some(t => t.heat === c.heat)).map(j => j.no);
  el.innerHTML = `<div class="jcard"><div class="bcard-h">Материалын гэрчилгээний бүртгэл <span class="sp"></span><span class="muted" style="font-weight:400;font-size:12px">${S.certs.length} бичлэг</span></div>
    ${S.certs.length ? `<div class="tblwrap" style="border:0"><table class="dt"><thead><tr><th>Огноо</th><th>Хайлалт №</th><th>Гэрчилгээ №</th><th>Материал</th><th class="r">Хэмжээ</th><th class="r">Ирсэн</th><th class="r">Зүссэн</th><th class="r">Үлдсэн</th><th>Нийлүүлэгч</th><th>Ажлууд</th><th></th></tr></thead><tbody>
    ${S.certs.map((c, i) => `<tr data-i="${i}"><td class="num">${esc(c.date)}</td><td class="num"><b>${esc(c.heat)}</b></td><td class="num">${esc(c.cert)}</td><td>${esc(c.mat)} ${c.thk}мм</td><td class="r num">${c.L ? `${c.L}×${c.W}` : '—'}</td><td class="r num"><input data-k="qty" type="number" min="0" value="${c.qty}" class="mono" style="width:70px;text-align:right"></td><td class="r num">${c.used}</td><td class="r num">${c.qty - c.used < 0 ? `<span class="pill bad">${c.qty - c.used}</span>` : c.qty - c.used}</td><td>${esc(c.sup)}</td><td class="num">${esc(uses(c).join(', '))}</td><td><button class="x" data-cdel aria-label="Устгах">×</button></td></tr>`).join('')}
    </tbody></table></div>` : '<div class="jbody"><p class="note">Бүртгэл алга. Зүүн талд ирсэн хавтангийн гэрчилгээний мэдээллийг оруулна.</p></div>'}</div>`;
  const tb = el.querySelector('tbody'); if (!tb) return;
  tb.addEventListener('change', e => { const c = S.certs[+e.target.closest('tr').dataset.i]; c.qty = Math.max(0, Math.round(+e.target.value || 0)); save(); renderCertMain(el); });
  tb.addEventListener('click', e => { if (!e.target.matches('[data-cdel]')) return; S.certs.splice(+e.target.closest('tr').dataset.i, 1); save(); renderCertMain(el); });
}

/* ---------- labels with QR (A4, 3 × 8 labels 70 × 37 mm) ---------- */
function qrMatrix(text) {
  if (!window.qrcode) return null;
  try { qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8']; const q = qrcode(0, 'M'); q.addData(text, 'Byte'); q.make(); const n = q.getModuleCount(); return { n, dark: (r, c) => q.isDark(r, c) }; } catch (e) { return null; }
}
function drawQR(x, text, X, Y, size) {
  const m = qrMatrix(text); if (!m) return false;
  const q = 2, cell = size / (m.n + 2 * q);
  x.fillStyle = '#fff'; x.fillRect(X, Y, size, size); x.fillStyle = '#000';
  for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) if (m.dark(r, c)) x.fillRect(X + (c + q) * cell, Y + (r + q) * cell, cell + 0.02, cell + 0.02);
  return true;
}
async function labelsPdf(items, fileName) {
  if (!window.jspdf) { toast('PDF сан ачаалагдсангүй'); return; }
  if (!window.qrcode) { toast('QR сан ачаалагдсангүй — интернэт холболтоо шалгана уу'); return; }
  try { await document.fonts.ready; } catch (e) { } await logoImg();
  const PW = 210, PH = 297, K = PRINT_K, cols = 3, rows = 8, LW = 70, LH = 37.125, F = '"IBM Plex Sans", Arial, sans-serif', FM = '"IBM Plex Mono", Consolas, monospace', pages = [];
  let x = null;
  const fit = (s, w) => { s = String(s ?? ''); while (s.length > 2 && x.measureText(s).width > w) s = s.slice(0, -2) + '…'; return s; };
  items.forEach((it, i) => {
    if (i % (cols * rows) === 0) { const c = document.createElement('canvas'); c.width = PW * K; c.height = PH * K; x = c.getContext('2d'); x.scale(K, K); x.fillStyle = '#fff'; x.fillRect(0, 0, PW, PH); pages.push(c); }
    const k = i % (cols * rows), X = (k % cols) * LW, Y = Math.floor(k / cols) * LH, pad = 3.5, qs = 25;
    x.strokeStyle = '#d5dbe2'; x.lineWidth = 0.15; x.strokeRect(X + 0.5, Y + 0.5, LW - 1, LH - 1);
    drawQR(x, it.qr, X + LW - pad - qs, Y + (LH - qs) / 2, qs);
    const tw = LW - qs - 2 * pad - 1.5;
    x.textAlign = 'left'; x.textBaseline = 'alphabetic';
    x.fillStyle = '#cf4a0c'; x.font = `600 2.3px ${F}`; x.fillText('Kh International', X + pad, Y + pad + 2);
    x.fillStyle = '#10161c'; x.font = `700 6.4px ${FM}`; x.fillText(fit(it.big, tw), X + pad, Y + pad + 9.5);
    x.font = `600 3px ${F}`; x.fillText(fit(it.l1, tw), X + pad, Y + pad + 15);
    x.font = `400 2.7px ${F}`; x.fillStyle = '#333c46'; x.fillText(fit(it.l2, tw), X + pad, Y + pad + 19.2);
    x.font = `600 3px ${F}`; x.fillStyle = '#10161c'; x.fillText(fit(it.l3, tw), X + pad, Y + pad + 23.6);
    x.font = `400 2.3px ${F}`; x.fillStyle = '#6a7684'; x.fillText(fit(it.small, tw), X + pad, Y + LH - pad);
  });
  if (!pages.length) { toast('Хэвлэх шошго алга'); return; }
  const pdf = i18nPdf(new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true }));
  pages.forEach((c, i) => { if (i) pdf.addPage(); pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, 0, PW, PH); });
  saveFile(safeName(fileName) + '.pdf', pdf.output('blob'), 'application/pdf');
}
function jobLabelsPdf(job, each) {
  const parts = jobParts(job), items = [];
  parts.forEach(p => {
    const mk = { job: job.no, jobShort: job.short, pno: p.pno }, big = S.mark.fmt ? String(S.mark.fmt).replace(/\{(\w+)\}/g, (m, k) => ({ short: job.short, no: job.no, p: p.pno }[k] ?? '')) : `${job.short}-${p.pno}`;
    const base = { big, l1: p.name, l2: `${p.mat} · ${p.thk} мм${p.kit ? ' · ' + p.kit : ''}`, small: `${job.no}${job.customer ? ' · ' + job.customer : ''} · ${today()}` };
    const qr = n => `KH|${job.no}|${p.pno}|${p.name}|${p.mat}|${p.thk}|${n}`;
    if (each) for (let i = 1; i <= p.qty; i++) items.push({ ...base, l3: `${i} / ${p.qty} ш`, qr: qr(`${i}/${p.qty}`) });
    else items.push({ ...base, l3: `Тоо: ${p.qty} ш`, qr: qr(p.qty) });
  });
  if (items.length > 2400) { toast('Шошго хэт олон байна — «Ширхэг бүрт» сонголтыг болиулна уу'); return; }
  labelsPdf(items, `${job.no}_шошго`);
  jobLog(`Шошго хэвлэсэн (${items.length})`, job);
}
function remLabelsPdf() {
  const items = S.remnants.flatMap(r => Array.from({ length: Math.max(1, r.qty) }, () => ({ big: r.no || 'Үлдэгдэл', l1: `${nf(r.L)} × ${nf(r.W)} мм${r.shape ? ' (хэлбэртэй)' : ''}`, l2: `${r.mat} · ${r.thk} мм`, l3: r.loc ? 'Байршил: ' + r.loc : 'Үлдэгдэл', small: `${r.src || ''}${r.src ? ' · ' : ''}${r.date || ''}`, qr: `KH-REM|${r.no}|${r.L}x${r.W}|${r.mat}|${r.thk}|${r.loc || ''}` })));
  if (!items.length) { toast('Үлдэгдэл бүртгэгдээгүй'); return; }
  labelsPdf(items, 'Үлдэгдлийн_шошго');
}
$('#remLabels').addEventListener('click', remLabelsPdf);

/* ---------- job card (ISO 9001 traveller) ---------- */
async function jobCardPdf(job) {
  if (!window.jspdf) { toast('PDF сан ачаалагдсангүй'); return; }
  try { await document.fonts.ready; } catch (e) { } await logoImg();
  const PW = 210, PH = 297, K = PRINT_K, F = '"IBM Plex Sans", Arial, sans-serif', FM = '"IBM Plex Mono", Consolas, monospace', pages = [];
  const parts = jobParts(job), e = job.est, a = job.act || {};
  let x, y;
  const foot = `Kh International · ISO 9001 чанарын удирдлагын тогтолцоо${S.iso.formTrace ? ' · Маягт ' + S.iso.formTrace : ''}${S.iso.rev ? ' · Хувилбар ' + S.iso.rev : ''}`;
  const page = () => {
    const c = document.createElement('canvas'); c.width = PW * K; c.height = PH * K; x = c.getContext('2d'); x.scale(K, K); x.fillStyle = '#fff'; x.fillRect(0, 0, PW, PH);
    x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.fillStyle = '#10161c'; x.font = `700 5.4px ${F}`; drawLogo(x, 15, 11.5, 8.5); x.textBaseline = 'alphabetic';
    x.font = `400 3px ${F}`; x.fillStyle = '#4f5b68'; x.fillText('Ажлын карт · үйлдвэрлэлийн ул мөр', 15, 25);
    x.textAlign = 'right'; x.fillStyle = '#cf4a0c'; x.font = `700 6px ${FM}`; x.fillText(job.no, PW - 15, 20);
    x.fillStyle = '#4f5b68'; x.font = `400 3px ${F}`; x.fillText(`хуудас ${pages.length + 1} · ${today()}`, PW - 15, 25);
    x.strokeStyle = '#cf4a0c'; x.lineWidth = 0.5; x.beginPath(); x.moveTo(15, 28); x.lineTo(PW - 15, 28); x.stroke();
    x.textAlign = 'left'; x.font = `400 2.6px ${F}`; x.fillStyle = '#6a7684'; x.fillText(foot, 15, PH - 8);
    pages.push(c); y = 36;
  };
  const need = h => { if (y + h > PH - 16) page(); };
  const h2 = t => { need(12); x.textAlign = 'left'; x.fillStyle = '#10161c'; x.font = `600 3.8px ${F}`; x.fillText(t, 15, y); y += 3; };
  const table = (cols, rows) => {
    const rh = 5.6, head = () => { let cx = 15; x.font = `600 2.6px ${F}`; x.fillStyle = '#6a7684'; x.textBaseline = 'middle'; cols.forEach(c => { x.textAlign = c.a === 'r' ? 'right' : 'left'; x.fillText(c.t, c.a === 'r' ? cx + c.w - 1.5 : cx + 1.5, y + rh / 2); cx += c.w; }); x.strokeStyle = '#c6ced7'; x.lineWidth = 0.3; x.beginPath(); x.moveTo(15, y + rh); x.lineTo(PW - 15, y + rh); x.stroke(); y += rh; };
    need(rh * 2); head();
    rows.forEach(r => {
      if (y + rh > PH - 16) { page(); head(); }
      let cx = 15; x.textBaseline = 'middle';
      cols.forEach((c, j) => { x.font = `${r.bold ? 600 : 400} 2.9px ${c.m ? FM : F}`; x.fillStyle = '#141b23'; x.textAlign = c.a === 'r' ? 'right' : 'left'; let s = String(r.cells ? r.cells[j] : r[j] ?? ''); while (s.length > 2 && x.measureText(s).width > c.w - 3) s = s.slice(0, -2) + '…'; x.fillText(s, c.a === 'r' ? cx + c.w - 1.5 : cx + 1.5, y + rh / 2); cx += c.w; });
      x.strokeStyle = '#e3e8ee'; x.beginPath(); x.moveTo(15, y + rh); x.lineTo(PW - 15, y + rh); x.stroke(); y += rh;
    });
    x.textBaseline = 'alphabetic'; y += 6;
  };
  page();
  const kv = [['Захиалагч', job.customer || '—'], ['Ажлын нэр', job.title || '—'], ['Нээсэн', job.created], ['Хугацаа', job.due || '—'], ['Төлөв', jstName(job.status)], ['Тайлбар', job.note || '—']];
  kv.forEach(([k, v], i) => { const X = 15 + (i % 2) * 90, Y = y + Math.floor(i / 2) * 7; x.font = `400 2.8px ${F}`; x.fillStyle = '#6a7684'; x.fillText(k, X, Y); x.font = `600 3.3px ${F}`; x.fillStyle = '#10161c'; let s = String(v); while (s.length > 2 && x.measureText(s).width > 62) s = s.slice(0, -2) + '…'; x.fillText(s, X + 24, Y); });
  y += 24;
  if (job.items.length) { h2('Бүрэлдэхүүн'); table([{ t: 'Иж бүрдэл', w: 110 }, { t: 'Тоо', w: 25, a: 'r', m: 1 }, { t: 'Парт, ш', w: 45, a: 'r', m: 1 }], job.items.map(it => { const k = findKit(it.kitId); return [k ? k.name : '—', it.n, k ? k.parts.reduce((s, p) => s + p.qty, 0) * it.n : 0]; })); }
  h2('Партууд');
  table([{ t: '№', w: 12, m: 1 }, { t: 'Нэр', w: 62 }, { t: 'Материал', w: 38 }, { t: 'Хэмжээ, мм', w: 30, a: 'r', m: 1 }, { t: 'Тоо', w: 14, a: 'r', m: 1 }, { t: 'Жин, кг', w: 24, a: 'r', m: 1 }],
    parts.map(p => { const inf = partInfo(p); return [p.pno, p.name, `${p.mat} ${p.thk}мм`, `${nf(inf.w, 0)}×${nf(inf.h, 0)}`, p.qty, nf(inf.area * p.thk * matOf(p.mat).rho / 1e6 * p.qty, 1)]; }).concat([{ bold: 1, cells: ['', 'Нийт', '', '', parts.reduce((s, p) => s + p.qty, 0), nf(jobWeight(parts), 1)] }]));
  if (e) {
    h2('Тооцоо');
    const actCost = (+a.kg || e.kg) * (e.kg ? e.matCost / e.kg : 0) + (+a.hours ? +a.hours * (e.time ? e.cutCost / (e.time / 60) : 0) : e.cutCost) + (+a.other || 0);
    table([{ t: 'Үзүүлэлт', w: 70 }, { t: 'Төлөвлөсөн', w: 55, a: 'r', m: 1 }, { t: 'Бодит', w: 55, a: 'r', m: 1 }], [
      ['Лист', `${e.sheets} (${e.groups.map(g => g.sizes).join('; ')})`, ''], ['Материал, кг', nf(e.kg, 1), a.kg ? nf(+a.kg, 1) : '—'], ['Зүсэлтийн хугацаа, цаг', nf(e.time / 60, 2), a.hours ? nf(+a.hours, 2) : '—'],
      ['Зүсэх урт, м / цоолт', `${nf(e.cut / 1000, 1)} / ${e.pierce}`, ''], ['Ашиглалт', nf(e.util * 100, 1) + '%', ''], ['Өртөг, ₮', nf(e.cost), (a.kg || a.hours || a.other) ? nf(actCost) : '—']]);
  }
  h2('Зүсэлтийн бүртгэл — материалын ул мөр');
  if (job.trace.length) table([{ t: 'Огноо', w: 22, m: 1 }, { t: 'Лист', w: 30 }, { t: 'Хэмжээ', w: 24, m: 1 }, { t: 'Материал', w: 34 }, { t: 'Тоо', w: 10, a: 'r', m: 1 }, { t: 'Хайлалт №', w: 24, m: 1 }, { t: 'Гэрч. №', w: 18, m: 1 }, { t: 'Оператор', w: 18 }], job.trace.map(t => [t.date, t.lay, t.size, `${t.mat} ${t.thk}мм`, t.count, t.heat, t.cert, t.op]));
  else { x.font = `400 3px ${F}`; x.fillStyle = '#6a7684'; x.fillText('Бүртгэл хийгдээгүй.', 15, y + 3); y += 10; }
  need(40); y += 6;
  x.font = `400 3.2px ${F}`; x.fillStyle = '#10161c';
  [['Бэлтгэсэн', 15], ['Хянасан (ЧХ)', 80], ['Хүлээн авсан', 145]].forEach(([t, X]) => { x.fillText(t, X, y); x.strokeStyle = '#8a95a1'; x.lineWidth = 0.25; x.beginPath(); x.moveTo(X, y + 12); x.lineTo(X + 50, y + 12); x.stroke(); x.font = `400 2.6px ${F}`; x.fillStyle = '#6a7684'; x.fillText('гарын үсэг / огноо', X, y + 15.5); x.font = `400 3.2px ${F}`; x.fillStyle = '#10161c'; });
  if (window.__pv) { window.__pv = 0; printImgs(pages.map((c, i) => ({ url: c.toDataURL('image/jpeg', 0.95), alias: 'p' + i })), false, 'a4', job.no + "_ажлын_карт"); return; }
  const pdf = i18nPdf(new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true }));
  pages.forEach((c, i) => { if (i) pdf.addPage(); pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, PW, PH); });
  saveFile(safeName(`${job.no}_ажлын_карт`) + '.pdf', pdf.output('blob'), 'application/pdf');
  jobLog('Ажлын карт PDF гаргасан', job);
}

/* ---------- dashboard: deadlines, budget vs actual, margin ---------- */
/* ---------- quotation → job tracking (dashboard top) ---------- */
const DPER = [['month', 'Энэ сар'], ['quarter', 'Энэ улирал'], ['year', 'Энэ жил'], ['all', 'Бүгд']];
function perStart(p) { const t = new Date(today() + 'T00:00:00'); if (p === 'month') t.setDate(1); else if (p === 'quarter') { t.setMonth(Math.floor(t.getMonth() / 3) * 3); t.setDate(1); } else if (p === 'year') { t.setMonth(0); t.setDate(1); } else return ''; return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`; }
function quoteStats(per) {
  const from = perStart(per), Q = S.jobs.filter(j => (isQ(j) || j.qst) && j.quote).map(j => { let c = null; try { c = quoteCalc(j); } catch (e) { } const net = c ? c.net : 0, nc = !!j.quote.noCost; return { j, st: isQ(j) ? (j.qst || 'draft') : 'won', date: j.quote.date || j.created || '', net, nc, profit: c && !nc ? c.profit : 0, pct: net && !nc ? c.profit / net * 100 : null }; }).filter(o => !from || o.date >= from);
  const by = k => Q.filter(o => o.st === k), sum = (a, f) => a.reduce((x, o) => x + (f(o) || 0), 0);
  const given = Q.filter(o => o.st !== 'draft'), won = by('won'), lost = by('lost'), sent = by('sent'), draft = by('draft');
  return { Q, given, won, lost, sent, draft, sum, conv: given.length ? won.length / given.length * 100 : null, convV: sum(given, o => o.net) ? sum(won, o => o.net) / sum(given, o => o.net) * 100 : null, mAll: sum(given.filter(o => !o.nc), o => o.net) ? sum(given, o => o.profit) / sum(given.filter(o => !o.nc), o => o.net) * 100 : null, mWon: sum(won.filter(o => !o.nc), o => o.net) ? sum(won, o => o.profit) / sum(won.filter(o => !o.nc), o => o.net) * 100 : null };
}
function quoteDashHTML() {
  const per = J.dper || 'year', Sx = quoteStats(per), { Q, given, won, lost, sent, draft, sum } = Sx, mm = v => nf(v / 1e6, 1);
  const pc = v => v == null ? '—' : nf(v, 1) + '%';
  const seg = [['draft', 'Ноорог', draft, '#98a2b3'], ['sent', 'Илгээсэн', sent, '#3e63dd'], ['won', 'Ажил болсон', won, '#12b76a'], ['lost', 'Татгалзсан', lost, '#f04438']], tot = Q.length || 1;
  // last 6 months: given vs won value
  const mons = []; { const t = new Date(today() + 'T00:00:00'); t.setDate(1); for (let i = 5; i >= 0; i--) { const d = new Date(t); d.setMonth(t.getMonth() - i); mons.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`); } }
  const all = quoteStats('all'), mv = mons.map(m => ({ m, g: all.sum(all.given.filter(o => o.date.startsWith(m)), o => o.net), w: all.sum(all.won.filter(o => o.date.startsWith(m)), o => o.net) })), mx = Math.max(1, ...mv.map(o => o.g));
  const cust = {}; given.forEach(o => { const k = o.j.customer || '—'; const c = cust[k] = cust[k] || { n: 0, w: 0, v: 0, wv: 0 }; c.n++; c.v += o.net; if (o.st === 'won') { c.w++; c.wv += o.net; } });
  const top = Object.entries(cust).sort((a, b) => b[1].wv - a[1].wv || b[1].v - a[1].v).slice(0, 6);
  const stName = k => ({ draft: 'Ноорог', sent: 'Илгээсэн', won: 'Ажил болсон', lost: 'Татгалзсан' })[k];
  const stCls = k => ({ draft: 'qst-draft', sent: 'qst-sent', won: 'st-done', lost: 'qst-lost' })[k];
  return `<div class="dhead"><div><h2>Хяналтын самбар</h2><p class="muted">Үнийн санал → ажил → ашиг</p></div><span class="sp" style="flex:1"></span><div class="seg dper">${DPER.map(([k, n]) => `<button data-dper="${k}" class="${per === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div class="summary">${[
      ['Өгсөн үнийн санал', `${given.length}`, `${mm(sum(given, o => o.net))} сая₮ · ноорог ${draft.length}`],
      ['Хариу хүлээж буй', `${sent.length}`, `${mm(sum(sent, o => o.net))} сая₮`],
      ['Ажил болсон', `${won.length}`, `${mm(sum(won, o => o.net))} сая₮ · ${pc(Sx.conv)} хувиргалт`],
      ['Татгалзсан', `${lost.length}`, `${mm(sum(lost, o => o.net))} сая₮`],
      ['Дундаж ашиг (санал)', pc(Sx.mAll), `батлагдсан: ${pc(Sx.mWon)}`],
      ['Үнийн дүнгээр хувиргалт', pc(Sx.convV), 'ажил болсон / өгсөн дүн']
    ].map(s => `<div class="stat"><div class="k">${s[0]}</div><div class="v">${s[1]}</div><div class="s">${esc(s[2])}</div></div>`).join('')}</div>
    <div class="dgrid">
      <div class="jcard"><div class="bcard-h">Саналын урсгал <span class="pill">${Q.length}</span></div><div class="jbody">
        <div class="funnel">${seg.filter(x => x[2].length).map(([k, n, a, c]) => `<i style="flex:${a.length};background:${c}" title="${n}: ${a.length}"></i>`).join('') || '<i style="flex:1;background:var(--line)"></i>'}</div>
        <div class="flegend">${seg.map(([k, n, a, c]) => `<span><b style="background:${c}"></b>${n} <span class="mono">${a.length}</span> <span class="muted mono">${mm(sum(a, o => o.net))} сая₮</span></span>`).join('')}</div>
      </div></div>
      <div class="jcard"><div class="bcard-h">Сүүлийн 6 сар — өгсөн ба ажил болсон (сая₮)</div><div class="jbody"><div class="mbars">${mv.map(o => `<div class="mb"><div class="bars"><i class="g" style="height:${o.g / mx * 100}%" title="Өгсөн ${mm(o.g)}"></i><i class="w" style="height:${o.w / mx * 100}%" title="Ажил болсон ${mm(o.w)}"></i></div><span class="mono">${o.m.slice(5)}</span><small class="mono">${o.g ? mm(o.g) : ''}</small></div>`).join('')}</div>
        <div class="flegend"><span><b style="background:#c7d2fe"></b>Өгсөн</span><span><b style="background:#12b76a"></b>Ажил болсон</span></div></div></div>
    </div>
    <div class="dgrid dg1">
      <div class="jcard"><div class="bcard-h">Үнийн саналууд</div><div class="tblwrap" style="border:0"><table class="dt"><thead><tr><th>№</th><th>Огноо</th><th>Захиалагч</th><th>Ажил</th><th class="r">Дүн (НӨАТ-гүй), ₮</th><th class="r">Ашиг</th><th>Төлөв</th><th>Ажил</th></tr></thead><tbody>
        ${Q.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 30).map(o => `<tr class="jrow" data-id="${o.j.id}" style="cursor:pointer"><td class="num"><b>${esc(o.j.quote.no || o.j.no)}</b></td><td class="num">${esc(o.date)}</td><td>${esc(o.j.customer || '—')}</td><td>${esc(o.j.title || '—')}</td><td class="r num">${money(o.net)}</td><td class="r num ${o.pct != null && o.pct < 10 ? 'late' : ''}">${pc(o.pct)}</td><td><span class="pill ${stCls(o.st)}">${stName(o.st)}</span></td><td class="num">${o.st === 'won' ? esc(o.j.no) : ''}</td></tr>`).join('') || '<tr><td colspan="8" class="muted">Энэ хугацаанд үнийн санал алга. «+ Үнийн санал» товчоор эхэлнэ.</td></tr>'}
      </tbody></table></div></div>
      <div class="jcard"><div class="bcard-h">Захиалагчаар</div><div class="tblwrap" style="border:0"><table class="dt"><thead><tr><th>Захиалагч</th><th class="r">Санал</th><th class="r">Ажил болсон</th><th class="r">Ажлын дүн, сая₮</th></tr></thead><tbody>
        ${top.map(([k, c]) => `<tr><td>${esc(k)}</td><td class="r num">${c.n}</td><td class="r num">${c.w} <span class="muted">(${nf(c.w / c.n * 100, 0)}%)</span></td><td class="r num">${mm(c.wv)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">—</td></tr>'}
      </tbody></table></div></div>
    </div>
`;
}
function renderDash(el) {
  const JB = S.jobs.filter(x => !isQ(x)), open = JB.filter(x => !['done', 'given'].includes(x.status));
  const late = open.filter(x => x.due && daysLeft(x.due) < 0), soon = open.filter(x => x.due && daysLeft(x.due) >= 0 && daysLeft(x.due) <= 7);
  const M = JB.map(x => ({ j: x, m: jobMoney(x) }));
  const sum = (arr, f) => arr.reduce((a, o) => a + (f(o) || 0), 0);
  const openM = M.filter(o => open.includes(o.j)), doneM = M.filter(o => !open.includes(o.j));
  const pPrice = sum(openM, o => o.m.price), pPlan = sum(openM, o => o.m.plan);
  const dPrice = sum(doneM, o => o.m.price), dCost = sum(doneM, o => o.m.has ? o.m.act : o.m.plan);
  const over = M.filter(o => o.m.has && o.m.plan && o.m.act > o.m.plan * 1.05);
  const stIdx = k => JST.findIndex(s => s[0] === k);
  // timeline window
  const dates = open.flatMap(x => [x.created, x.due].filter(Boolean)).concat([today()]).sort();
  const d0 = new Date(dates[0] + 'T00:00:00'), d1 = new Date(Math.max(new Date(dates[dates.length - 1] + 'T00:00:00'), +d0 + 14 * 864e5)), span = (d1 - d0) || 1;
  const pc = d => Math.max(0, Math.min(100, (new Date(d + 'T00:00:00') - d0) / span * 100));
  const rows = M.slice().sort((a, b) => (open.includes(b.j) - open.includes(a.j)) || String(a.j.due || '9999').localeCompare(String(b.j.due || '9999')));
  const RC = receivables(), rcSum = RC.reduce((a, r) => a + r.left, 0), rcLate = RC.filter(r => r.st[0] === 'late');
  el.innerHTML = `${quoteDashHTML()}
    <h3 style="margin:8px 0 0">Авлага, төлбөр</h3>
    <div class="summary">${[['Нийт авлага', money(rcSum) + '<small>₮</small>', `${RC.length} нэхэмжлэл`], ['Хугацаа хэтэрсэн', `<span class="${rcLate.length ? 'late' : ''}">${money(rcLate.reduce((a, r) => a + r.left, 0))}</span><small>₮</small>`, `${rcLate.length} нэхэмжлэл`], ['Нэхэмжлээгүй дууссан ажил', String(S.jobs.filter(x => !isQ(x) && ['done', 'given'].includes(x.status) && !(x.inv || []).length).length), 'хүлээлгэсэн ч нэхэмжлэл үүсгээгүй']].map(s => `<div class="stat"><div class="k">${s[0]}</div><div class="v">${s[1]}</div><div class="s">${esc(s[2])}</div></div>`).join('')}</div>
    ${RC.length ? `<div class="jcard"><div class="tblwrap" style="border:0"><table class="dt"><thead><tr><th>Нэхэмжлэл</th><th>Ажил</th><th>Захиалагч</th><th>Төлөх хугацаа</th><th class="r">Үлдэгдэл, ₮</th><th>Төлөв</th></tr></thead><tbody>${RC.slice(0, 15).map(r => `<tr class="jrow" data-id="${r.j.id}" style="cursor:pointer"><td class="num">${esc(r.i.no)}</td><td class="num">${esc(r.j.no)}</td><td>${esc(r.j.customer || '—')}</td><td class="num ${r.st[0] === 'late' ? 'late' : ''}">${esc(r.i.due || '')}</td><td class="r num">${money(r.left)}</td><td><span class="pill ${r.st[0] === 'late' ? 'qst-lost' : r.st[0] === 'part' ? 'st-nest' : 'qst-sent'}">${r.st[1]}</span></td></tr>`).join('')}</tbody></table></div></div>` : ''}
    <h3 style="margin:8px 0 0">Явагдаж буй ажлууд</h3>
    <div class="summary">${[
      ['Идэвхтэй ажил', `${open.length}`, `${JB.length} нийт · ${S.jobs.length - JB.length} санал`],
      ['Хугацаа хэтэрсэн', `<span class="${late.length ? 'late' : ''}">${late.length}</span>`, late.map(x => x.no).join(', ') || 'алга'],
      ['7 хоногт дуусах', `${soon.length}`, soon.map(x => x.no).join(', ') || 'алга'],
      ['Идэвхтэй гэрээ', `${nf(pPrice / 1e6, 1)}<small>сая₮</small>`, `төсөв ${nf(pPlan / 1e6, 1)} сая₮`],
      ['Дууссан ажлын ашиг', `${nf((dPrice - dCost) / 1e6, 1)}<small>сая₮</small>`, dPrice ? `${nf((dPrice - dCost) / dPrice * 100, 1)}% · гэрээ ${nf(dPrice / 1e6, 1)} сая₮` : 'гэрээний үнэ оруулаагүй'],
      ['Төсөв хэтэрсэн', `<span class="${over.length ? 'late' : ''}">${over.length}</span>`, over.map(o => o.j.no).join(', ') || '5%-аас дээш хэтэрсэн алга']
    ].map(s => `<div class="stat"><div class="k">${s[0]}</div><div class="v">${s[1]}</div><div class="s">${esc(s[2])}</div></div>`).join('')}</div>
    ${open.length ? `<div class="jcard"><div class="bcard-h">Хугацааны зураг <span class="sp"></span><span class="muted mono" style="font-weight:400">${esc(dates[0])} → ${d1.toISOString().slice(0, 10)}</span></div><div class="jbody"><div class="gantt">
      ${open.slice().sort((a, b) => String(a.due || '9999').localeCompare(String(b.due || '9999'))).map(x => { const dl = daysLeft(x.due), a = pc(x.created || today()), b = x.due ? pc(x.due) : 100; return `<div class="grow" data-id="${x.id}"><span class="gl mono">${esc(x.no)}</span><span class="gt"><i class="gb st-${x.status}${dl != null && dl < 0 ? ' gl8' : ''}" style="left:${a}%;width:${Math.max(1.5, b - a)}%"></i><i class="gn" style="left:${pc(today())}%"></i></span><span class="gd mono ${dl != null && dl < 0 ? 'late' : ''}">${x.due ? (dl < 0 ? `${-dl} хоног хэтэрсэн` : dl === 0 ? 'өнөөдөр' : `${dl} хоног`) : 'хугацаагүй'}</span></div>`; }).join('')}
    </div></div></div>` : ''}
    <div class="jcard"><div class="bcard-h">Ажлууд — төсөв ба бодит</div>
      <div class="tblwrap" style="border:0"><table class="dt"><thead><tr><th>Дугаар</th><th>Ажил</th><th>Захиалагч</th><th>Төлөв</th><th>Хугацаа</th><th class="r">Гэрээ, ₮</th><th class="r">Төсөв, ₮</th><th class="r">Бодит, ₮</th><th class="r">Зөрүү</th><th class="r">Ашиг</th></tr></thead><tbody>
      ${rows.map(({ j: x, m }) => { const dl = daysLeft(x.due), lateX = dl != null && dl < 0 && open.includes(x), dv = m.has && m.plan ? (m.act - m.plan) / m.plan * 100 : null; return `<tr class="jrow" data-id="${x.id}" style="cursor:pointer"><td class="num"><b>${esc(x.no)}</b></td><td>${esc(x.title || '—')}</td><td>${esc(x.customer || '—')}</td><td><span class="pill st-${x.status}">${jstName(x.status)}</span><span class="jprog"><i style="width:${(stIdx(x.status) + 1) / JST.length * 100}%"></i></span></td><td class="num${lateX ? ' late' : ''}">${esc(x.due || '—')}</td><td class="r num">${m.price ? nf(m.price) : '—'}</td><td class="r num">${m.plan ? nf(m.plan) : '—'}</td><td class="r num">${m.has ? nf(m.act) : '—'}</td><td class="r num">${dv == null ? '—' : `<span class="${dv > 5 ? 'late' : ''}">${dv > 0 ? '+' : ''}${nf(dv, 1)}%</span>`}</td><td class="r num">${m.margin == null ? '—' : `<span class="${m.margin < 0 ? 'late' : ''}">${nf(m.margin)}</span>`}</td></tr>`; }).join('')}
      </tbody></table></div></div>
    <p class="note">Төсөв = өрөлтөөс гарсан материал + зүсэлтийн өртөг + төлөвлөсөн бусад зардал. Бодит = бодит кг, зүсэлтийн цаг, бусад зардал. Ашиг = гэрээний үнэ − (бодит, байхгүй бол төсөв). Мөр дээр дарж ажлыг нээнэ.</p>`;
  el.querySelectorAll('[data-id]').forEach(r => r.addEventListener('click', () => { const j = findJob(r.dataset.id); J.sel = j.id; setModule(isQ(j) ? 'quotes' : 'jobs'); J.sel = j.id; J.sub = isQ(j) ? 'quote' : 'main'; renderJobs(); }));
  el.querySelectorAll('[data-dper]').forEach(b => b.addEventListener('click', () => { J.dper = b.dataset.dper; renderDash(el); }));
}
