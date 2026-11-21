/* ================= Kh International — ERP shell (Odoo-style): apps & top menu, breadcrumbs, control panel,
   list / kanban views, form status bar + smart buttons + chatter, home dashboard.
   It sits on top of the existing modules: they still render their own content; this file arranges it. ================= */
const erpOn = () => document.documentElement.dataset.var === 'erp';
const ERP_IC = {
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  sales: '<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><path d="M10 12h6M10 16h6"/>',
  mfg: '<path d="M3 21V10l6 4V10l6 4V6l6 4v11z"/><path d="M7 17h2M12 17h2M17 17h2"/>',
  cut: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M7 9h4v4H7zM14 9l3 6"/>',
  stock: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  team: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 15c3 0 5 2 5 5"/>',
  lib: '<path d="M4 4h6a2 2 0 012 2v14a2 2 0 00-2-2H4zM20 4h-6a2 2 0 00-2 2v14a2 2 0 012-2h6z"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  kanban: '<rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/>',
  quote: '<path d="M7 3h8l4 4v14H7z"/><path d="M10 13h6M10 17h4"/>', inv: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  box: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  task: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9"/>', file: '<path d="M21 12l-9 9a5 5 0 01-7-7l9-9a3.5 3.5 0 015 5l-9 9a2 2 0 01-3-3l8-8"/>',
  chat: '<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/>', calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M16 12h0M8 16h2M12 16h2"/>',
  qual: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  truck: '<path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>'
};
const erpIcon = (k, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ERP_IC[k] || ''}</svg>`;
/* apps and their menus: a route is a module, or module:tab */
const ERP_APPS = [
  { k: 'home', n: 'Нүүр', ic: 'home', c: '#344054', items: [['dash', 'Хяналтын самбар']] },
  { k: 'sales', n: 'Борлуулалт', ic: 'sales', c: '#e0650f', items: [['quotes', 'Үнийн санал'], ['docs:invoices', 'Нэхэмжлэх'], ['info:org', 'Харилцагч'], ['docs:forms', 'Маягт']] },
  { k: 'mfg', n: 'Үйлдвэрлэл', ic: 'mfg', c: '#1d4ed8', items: [['jobs', 'Ажил'], ['mfg', 'Үйлдвэрлэлийн захиалга'], ['mfg:wc', 'Ажлын байр'], ['plan', 'Төлөвлөгөө'], ['docs:scopes', 'Scope'], ['docs:dockets', 'Packing list']] },
  { k: 'cut', n: 'Инженер', ic: 'cut', c: '#0e7490', items: [['eng', 'Тооцоолол'], ['eng:bolt', 'Боолт'], ['eng:units', 'Нэгж хувиргагч'], ['nest', 'Лазер өрөлт'], ['bend', 'Нугалалт'], ['docs:kits', 'Иж бүрдэл']] },
  { k: 'stock', n: 'Агуулах', ic: 'stock', c: '#15803d', items: [['stock', 'Агуулах'], ['docs:certs', 'Материалын гэрчилгээ']] },
  { k: 'qual', n: 'Чанар', ic: 'qual', c: '#be123c', items: [['mfg:qc', 'Шалгалт'], ['mfg:ncr', 'NCR'], ['mfg:trace', 'Мөшгөлт'], ['mfg:gauge', 'Хэмжих багаж']] },
  { k: 'team', n: 'Баг', ic: 'team', c: '#7c3aed', items: [['team', 'Даалгавар'], ['ideas', 'Санаа, сайжруулалт'], ['insp', 'Үзлэг · ХАБ']] },
  { k: 'lib', n: 'Сан', ic: 'lib', c: '#b45309', items: [['info:cat', 'Үнийн сан'], ['info:std', 'Стандарт'], ['info:tpl', 'Загвар'], ['info:mach', 'Техник']] }
];
const ERP = { route: 'dash', launch: false };
const erpAppOf = r => ERP_APPS.find(a => a.items.some(i => i[0] === r)) || ERP_APPS.find(a => a.items.some(i => i[0].split(':')[0] === String(r).split(':')[0])) || ERP_APPS[0];
const erpInit2 = s => String(s || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const ERP_AVC = ['#e0650f', '#1d4ed8', '#0e7490', '#15803d', '#7c3aed', '#b45309', '#be123c', '#475467'];
const erpAvColor = s => ERP_AVC[[...String(s || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % ERP_AVC.length];
const erpAv = (name, t) => `<span class="erp-av" style="background:${erpAvColor(name)}" title="${esc(t || name || '')}">${esc(erpInit2(name))}</span>`;
const erpM = v => money(Math.round(+v || 0));

/* ---------- navigation ---------- */
function erpGo(route, o = {}) {
  ERP.route = route; ERP.launch = false; const [m, t] = String(route).split(':');
  if (m === 'docs') {
    setModule('docs'); J.tab = t || 'dockets'; J.dash = false;
    $$('[data-jtab]').forEach(x => x.classList.toggle('on', x.dataset.jtab === J.tab)); ['jobs', 'kits', 'certs', 'dockets', 'forms', 'scopes', 'invoices'].forEach(k => { const e = $('#jtab-' + k); if (e) e.hidden = k !== J.tab; });
    renderJobs();
  } else if (m === 'eng') { if (typeof ENG !== 'undefined') { ENG.tool = t || (['bolt', 'units'].includes(ENG.tool) && route === 'eng' ? 'beam' : ENG.tool); engSave(); } setModule('eng'); }
  else if (m === 'mfg') { if (typeof MF !== 'undefined') { MF.tab = t || 'mo'; if (!o.keep) MF.sel = null; MF.f = MF.tab === 'mo' ? 'act' : MF.tab === 'ncr' ? 'open' : ''; MF.q = ''; mfSave(); } setModule('mfg'); }
  else if (m === 'info') { setModule('info'); if (t && typeof IN !== 'undefined') { IN.tab = t; renderInfo(); } }
  else if (m === 'jobs' || m === 'quotes') { setModule(m); if (!o.keep) { J.sel = null; J.sub = m === 'quotes' ? 'quote' : 'main'; } renderJobs(); }
  else setModule(m);
  try { localStorage.setItem('kh-erp-route', route); } catch (e) { }
  erpNav(); const mm = $$('.main').find(x => !x.hidden); if (mm) mm.scrollTop = 0;
}
function erpCurRoute() {
  const v = document.documentElement.dataset.jview, act = $$('.modtabs button.on')[0], m = act ? act.dataset.mod : 'nest';
  if (v === 'docs' || (m === 'docs')) return 'docs:' + (J.tab || 'dockets');
  if (m === 'info') return 'info:' + ((typeof IN !== 'undefined' && IN.tab) || 'cat');
  if (m === 'mfg') return (typeof MF !== 'undefined' && MF.tab !== 'mo') ? 'mfg:' + MF.tab : 'mfg';
  if (m === 'eng') return (typeof ENG !== 'undefined' && ['bolt', 'units'].includes(ENG.tool)) ? 'eng:' + ENG.tool : 'eng';
  return m;
}
function erpNav() {
  const nav = $('#erpNav'); if (!nav) return; const r = erpCurRoute(); ERP.route = r; const app = erpAppOf(r);
  nav.querySelector('.erp-appname').textContent = app.n;
  nav.querySelector('.erp-menu').innerHTML = app.items.map(([k, n]) => `<button data-erp="${k}" class="${k === r || (k.split(':')[0] === r.split(':')[0] && !app.items.some(x => x[0] === r) && app.items.filter(x => x[0].split(':')[0] === r.split(':')[0]).length === 1) ? 'on' : ''}">${esc(n)}</button>`).join('');
  const full = (r === 'dash' || r === 'jobs' || r === 'quotes' || r.startsWith('mfg'));
  document.documentElement.toggleAttribute('data-erpfull', full);
  const ch = $('#btnChat'); if (ch && typeof chatBadge === 'function') chatBadge();
}
function erpLaunch(open) {
  ERP.launch = open == null ? !ERP.launch : open; let L = $('#erpLaunch');
  if (!ERP.launch) { if (L) L.remove(); return; }
  if (!L) { L = document.createElement('div'); L.id = 'erpLaunch'; L.className = 'erp-launch'; document.body.appendChild(L); }
  const cnt = erpCounts();
  L.innerHTML = `<div class="grid">${ERP_APPS.map(a => `<button class="erp-tile" data-app="${a.k}"><i style="background:${a.c}">${erpIcon(a.ic)}</i><b>${esc(a.n)}</b><small>${esc(cnt[a.k] || '')}</small></button>`).join('')}</div>`;
  L.addEventListener('click', e => { const b = e.target.closest('[data-app]'); if (!b) { if (e.target === L) erpLaunch(false); return; } const a = ERP_APPS.find(x => x.k === b.dataset.app); erpGo(a.items[0][0]); });
}
function erpCounts() {
  const JB = topJobs().filter(j => !isQ(j)), act = JB.filter(j => !['done', 'given'].includes(j.status)), Q = topJobs().filter(j => isQ(j) && ['draft', 'sent'].includes(j.qst || 'draft'));
  const low = (typeof stk === 'function' ? stk() : []).filter(it => it.min > 0 && +it.qty <= +it.min).length, tk = (typeof tasks === 'function' ? tasks() : []).filter(t => t.status !== 'done').length;
  return { home: 'тойм', sales: `${Q.length} нээлттэй санал`, mfg: `${act.length} идэвхтэй ажил${typeof mos === 'function' && mos().some(m => ['plan', 'run'].includes(m.status)) ? ' · ' + mos().filter(m => ['plan', 'run'].includes(m.status)).length + ' MO' : ''}`, cut: 'даац, боолт, өрөлт', stock: low ? `${low} бараа дутуу` : 'үлдэгдэл', team: `${tk} нээлттэй даалгавар`, qual: (() => { const n = typeof ncrs === 'function' ? ncrs().filter(x => x.st !== 'closed').length : 0, g = typeof gauges === 'function' ? gauges().filter(x => gSt(x)[0] === 'over').length : 0; return n || g ? [n ? `${n} нээлттэй NCR` : '', g ? `${g} багаж хэтэрсэн` : ''].filter(Boolean).join(' · ') : 'шалгалт, NCR, мөшгөлт'; })(), lib: 'үнэ, стандарт' };
}

/* ---------- control panel ---------- */
const EV = (() => { let s = {}; try { s = JSON.parse(localStorage.getItem('kh-erp-views') || '{}'); } catch (e) { } return Object.assign({ jobs: { view: 'list', f: ['active'], g: '', q: '', sort: '' }, quotes: { view: 'list', f: ['open'], g: '', q: '', sort: '' } }, s); })();
const evSave = () => { try { localStorage.setItem('kh-erp-views', JSON.stringify({ jobs: Object.assign({}, EV.jobs, { q: '' }), quotes: Object.assign({}, EV.quotes, { q: '' }) })); } catch (e) { } };
const ERP_F = {
  jobs: [['active', 'Идэвхтэй', j => !['done', 'given'].includes(j.status)], ['late', 'Хугацаа хэтэрсэн', j => !['done', 'given'].includes(j.status) && j.due && j.due < today()], ['mine', 'Миний', j => S.me && j.owner === S.me], ['done', 'Дууссан', j => ['done', 'given'].includes(j.status)]],
  quotes: [['open', 'Нээлттэй', j => ['draft', 'sent'].includes(j.qst || 'draft') && isQ(j)], ['sent', 'Илгээсэн', j => j.qst === 'sent' && isQ(j)], ['won', 'Батлагдсан', j => j.qst === 'won'], ['lost', 'Татгалзсан', j => j.qst === 'lost'], ['mine', 'Миний', j => S.me && j.owner === S.me]]
};
const ERP_G = { jobs: [['', 'Бүлэглэхгүй'], ['status', 'Төлөвөөр'], ['customer', 'Захиалагчаар'], ['owner', 'Хариуцагчаар'], ['month', 'Сараар']], quotes: [['', 'Бүлэглэхгүй'], ['qst', 'Төлөвөөр'], ['customer', 'Захиалагчаар'], ['owner', 'Хариуцагчаар'], ['month', 'Сараар']] };
function erpRecs(v) {
  const st = EV[v], q = lc(st.q || '');
  let L = topJobs().filter(j => v === 'quotes' ? (isQ(j) || j.qst === 'won') : !isQ(j));
  const F = ERP_F[v].filter(f => st.f.includes(f[0]));
  if (F.length) { const state = F.filter(f => f[0] !== 'mine' && f[0] !== 'late'), other = F.filter(f => f[0] === 'mine' || f[0] === 'late'); L = L.filter(j => (!state.length || state.some(f => f[2](j))) && other.every(f => f[2](j))); }
  else if (v === 'quotes') L = L.filter(j => isQ(j));
  if (q) L = L.filter(j => lc([j.no, j.title, j.customer, pName(j.owner), j.quote && j.quote.no, j.note].join(' ')).includes(q));
  const R = L.map(j => erpRow(j, v));
  const so = st.sort || (v === 'quotes' ? '-date' : 'due'), d = so[0] === '-' ? -1 : 1, k = so.replace(/^-/, '');
  R.sort((a, b) => { const x = a[k] ?? '', y = b[k] ?? ''; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x || (d > 0 ? '￿' : '')).localeCompare(String(y || (d > 0 ? '￿' : '')))) * d; });
  return R;
}
function erpRow(j, v) {
  if (v === 'quotes') { let c = null; try { c = quoteCalc(j); } catch (e) { } const q = j.quote || {}; const until = q.date ? addDays(q.date, +q.valid || 0) : '';
    return { j, no: (q.no || j.no), date: q.date || j.created || '', customer: j.customer || '', title: j.title || '', owner: pName(j.owner), until, amount: c ? c.net : 0, margin: c && c.net && c.cost ? c.marginPct : null, st: j.qst || 'draft', stn: (QST.find(x => x[0] === (j.qst || 'draft')) || [, ''])[1] }; }
  const m = jobMoney(j); let pct = 0; try { pct = progCalc(j).pct * 100; } catch (e) { }
  const inv = (j.inv || []).reduce((a, i) => a + (+i.amount || 0), 0), paid = (j.inv || []).reduce((a, i) => a + invPaid(i), 0);
  return { j, no: j.no, date: j.created || '', customer: j.customer || '', title: j.title || '', owner: pName(j.owner), due: j.due || '', pct, amount: m.price || 0, inv, paid, st: j.status || 'new', stn: (JST.find(x => x[0] === j.status) || [, 'Шинэ'])[1] };
}
function erpCP(o) {
  const crumbs = o.crumbs.map((c, i) => i < o.crumbs.length - 1 ? `<a data-crumb="${i}">${esc(c[0])}</a><span class="sep">/</span>` : `<b title="${esc(c[0])}">${esc(c[0])}</b>`).join('');
  return `<div class="erp-cp"><div class="erp-crumbs">${crumbs}</div><div class="erp-acts">${o.right || ''}</div>${o.row2 ? `<div class="row2">${o.row2}</div>` : ''}</div>`;
}
function erpBindCrumbs(el, crumbs) { el.querySelectorAll('[data-crumb]').forEach(a => a.addEventListener('click', () => { const f = crumbs[+a.dataset.crumb][1]; if (f) f(); })); }

/* ---------- list & kanban (jobs, quotes) ---------- */
function erpList(el, v) {
  const st = EV[v], R = erpRecs(v), isJ = v === 'jobs', title = isJ ? 'Ажил' : 'Үнийн санал';
  const facets = st.f.map(k => { const f = ERP_F[v].find(x => x[0] === k); return f ? `<span class="erp-facet">${esc(f[1])}<button data-unf="${k}" title="Хасах">×</button></span>` : ''; }).join('') + (st.g ? `<span class="erp-facet"><b>Бүлэг:</b> ${esc((ERP_G[v].find(g => g[0] === st.g) || [, ''])[1])}<button data-ung="1">×</button></span>` : '');
  el.innerHTML = erpCP({ crumbs: [[title]],
    right: `<button class="btn primary" id="erpNew">+ ${isJ ? 'Шинэ ажил' : 'Шинэ үнийн санал'}</button><button class="btn" id="erpImp">⇪ Үнийн санал оруулах</button>`,
    row2: `<div class="erp-search">${erpIcon('search').replace('<svg', '<svg width="16" height="16" style="color:var(--ink-3);flex:none"')}${facets}<input id="erpQ" placeholder="Хайх: дугаар, захиалагч, ажлын нэр, хүн…" value="${esc(st.q || '')}"></div>
      <div class="erp-filters">${ERP_F[v].map(([k, n]) => `<button class="erp-chip${st.f.includes(k) ? ' on' : ''}" data-f="${k}">${esc(n)}</button>`).join('')}</div>
      <select class="inp erp-gsel" id="erpG" title="Бүлэглэх">${ERP_G[v].map(([k, n]) => `<option value="${k}"${st.g === k ? ' selected' : ''}>${k ? n : 'Бүлэглэх…'}</option>`).join('')}</select>
      <span class="erp-pager">${R.length} бичлэг</span>
      <span class="erp-views"><button data-view="list" class="${st.view === 'list' ? 'on' : ''}" title="Жагсаалт">${erpIcon('list')}</button><button data-view="kanban" class="${st.view === 'kanban' ? 'on' : ''}" title="Kanban">${erpIcon('kanban')}</button></span>` }) +
    `<div class="erp-view">${!R.length ? `<div class="erp-empty"><b>${isJ ? 'Ажил олдсонгүй' : 'Үнийн санал олдсонгүй'}</b>${st.q || st.f.length ? 'Шүүлтүүрээ өөрчилж үзнэ үү, эсвэл ' : ''}<b style="display:inline">+ ${isJ ? 'Шинэ ажил' : 'Шинэ үнийн санал'}</b> товчоор эхэлнэ.</div>` : st.view === 'kanban' ? erpKanban(R, v) : erpTable(R, v)}</div>`;
  /* bindings */
  const go = j => { J.sel = j.id; J.sub = isQ(j) ? 'quote' : 'main'; if (!isQ(j) && v === 'quotes') { setModule('jobs'); J.sel = j.id; } renderJobs(); const m = $('#jobsMain'); if (m) m.scrollTop = 0; erpNav(); };
  el.querySelector('#erpNew').addEventListener('click', () => { const j = isJ ? newJob() : newQuote(); J.sel = j.id; J.sub = isJ ? 'main' : 'quote'; save(); renderJobs(); });
  el.querySelector('#erpImp').addEventListener('click', () => { const f = $('#qImpIn'); if (f) f.click(); });
  const qi = el.querySelector('#erpQ'); let tm; qi.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { st.q = qi.value; erpList(el, v); const n = el.querySelector('#erpQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 220); });
  qi.addEventListener('keydown', e => { if (e.key === 'Backspace' && !qi.value && st.f.length) { st.f.pop(); evSave(); erpList(el, v); el.querySelector('#erpQ').focus(); } });
  el.querySelectorAll('[data-f]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.f, i = st.f.indexOf(k); if (i >= 0) st.f.splice(i, 1); else st.f.push(k); evSave(); erpList(el, v); }));
  el.querySelectorAll('[data-unf]').forEach(b => b.addEventListener('click', () => { st.f = st.f.filter(k => k !== b.dataset.unf); evSave(); erpList(el, v); }));
  el.querySelectorAll('[data-ung]').forEach(b => b.addEventListener('click', () => { st.g = ''; evSave(); erpList(el, v); }));
  el.querySelector('#erpG').addEventListener('change', e => { st.g = e.target.value; evSave(); erpList(el, v); });
  el.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { st.view = b.dataset.view; evSave(); erpList(el, v); }));
  el.querySelectorAll('[data-sort]').forEach(th => th.addEventListener('click', () => { const k = th.dataset.sort; st.sort = st.sort === k ? '-' + k : k; evSave(); erpList(el, v); }));
  el.querySelectorAll('tr.grp').forEach(tr => tr.addEventListener('click', () => { ERP.fold = ERP.fold || {}; ERP.fold[tr.dataset.gk] = !ERP.fold[tr.dataset.gk]; erpList(el, v); }));
  el.querySelectorAll('[data-rec]').forEach(r => r.addEventListener('click', () => go(findJob(r.dataset.rec))));
  /* kanban drag → status */
  el.querySelectorAll('.erp-card').forEach(c => { c.draggable = true; c.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', c.dataset.rec); c.classList.add('dragging'); }); c.addEventListener('dragend', () => c.classList.remove('dragging')); });
  el.querySelectorAll('.erp-kcol').forEach(col => { col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drop'); }); col.addEventListener('dragleave', () => col.classList.remove('drop'));
    col.addEventListener('drop', e => { e.preventDefault(); col.classList.remove('drop'); const j = findJob(e.dataTransfer.getData('text/plain')); if (!j) return; erpSetStage(j, col.dataset.col, () => erpList(el, v)); }); });
  ERP.order = R.map(r => r.j.id); ERP.orderV = v;
}
const ERP_COLS = {
  jobs: [['no', 'Дугаар'], ['title', 'Ажлын нэр'], ['customer', 'Захиалагч'], ['owner', 'Хариуцагч'], ['due', 'Хугацаа'], ['pct', 'Явц', 'r'], ['amount', 'Гэрээ, ₮', 'r'], ['inv', 'Нэхэмжилсэн, ₮', 'r'], ['st', 'Төлөв']],
  quotes: [['no', 'Санал №'], ['date', 'Огноо'], ['customer', 'Захиалагч'], ['title', 'Ажлын нэр'], ['owner', 'Хариуцагч'], ['until', 'Хүчинтэй'], ['amount', 'Дүн (НӨАТ-гүй), ₮', 'r'], ['margin', 'Margin', 'r'], ['st', 'Төлөв']]
};
function erpGroupKey(r, g) { if (g === 'status' || g === 'qst') return r.stn; if (g === 'customer') return r.customer || '— захиалагчгүй —'; if (g === 'owner') return r.owner || '— хариуцагчгүй —'; if (g === 'month') return String(r.date || '').slice(0, 7) || '— огноогүй —'; return ''; }
function erpTable(R, v) {
  const st = EV[v], C = ERP_COLS[v], so = st.sort || '', sk = so.replace(/^-/, '');
  const cell = (r, k) => {
    if (k === 'no') return `<td class="no">${esc(r.no)}</td>`;
    if (k === 'title') return `<td><div>${esc(r.title || '—')}</div></td>`;
    if (k === 'owner') return `<td>${r.owner ? `<span class="erp-own">${erpAv(r.owner)}${esc(r.owner)}</span>` : '<span class="sub">—</span>'}</td>`;
    if (k === 'due') { const lt = r.due && r.due < today() && !['done', 'given'].includes(r.st); return `<td class="num${lt ? ' late' : ''}">${esc(r.due || '')}</td>`; }
    if (k === 'until') { const lt = r.until && r.until < today() && ['draft', 'sent'].includes(r.st); return `<td class="num${lt ? ' late' : ''}">${esc(r.until || '')}</td>`; }
    if (k === 'pct') return `<td class="r"><div class="erp-prog"><i><b style="width:${Math.round(r.pct)}%"></b></i><span>${Math.round(r.pct)}%</span></div></td>`;
    if (k === 'amount') return `<td class="r num">${r.amount ? erpM(r.amount) : ''}</td>`;
    if (k === 'inv') return `<td class="r num">${r.inv ? erpM(r.inv) : ''}${r.inv ? `<div class="sub">${r.paid >= r.inv ? 'төлсөн' : `төлсөн ${erpM(r.paid)}`}</div>` : ''}</td>`;
    if (k === 'margin') return `<td class="r num">${r.margin == null ? '' : nf(r.margin, 1) + '%'}</td>`;
    if (k === 'st') return `<td><span class="erp-b s-${r.st}">${esc(r.stn)}</span></td>`;
    if (k === 'date') return `<td class="num">${esc(r.date || '')}</td>`;
    return `<td>${esc(r[k] || '')}</td>`;
  };
  const row = r => `<tr class="rec" data-rec="${r.j.id}">${C.map(([k]) => cell(r, k)).join('')}</tr>`;
  const sum = A => A.reduce((a, r) => a + (+r.amount || 0), 0);
  let body = '';
  if (st.g) { const G = new Map(); R.forEach(r => { const k = erpGroupKey(r, st.g); if (!G.has(k)) G.set(k, []); G.get(k).push(r); });
    const order = st.g === 'status' ? JST.map(x => x[1]) : st.g === 'qst' ? QST.map(x => x[1]) : [...G.keys()].sort();
    order.filter(k => G.has(k)).forEach(k => { const A = G.get(k), fold = ERP.fold && ERP.fold[k]; body += `<tr class="grp" data-gk="${esc(k)}"><td colspan="${C.length - 3}">${fold ? '▸' : '▾'} ${esc(k)}<span class="cnt">(${A.length})</span></td><td colspan="3" class="r num">${erpM(sum(A))}</td></tr>` + (fold ? '' : A.map(row).join('')); });
  } else body = R.map(row).join('');
  return `<div class="erp-list"><table><thead><tr>${C.map(([k, n, a]) => `<th class="${a || ''}" data-sort="${k}">${esc(n)}${sk === k ? `<span class="so"> ${so[0] === '-' ? '↓' : '↑'}</span>` : ''}</th>`).join('')}</tr></thead><tbody>${body}</tbody>
    <tfoot><tr>${C.map(([k, , al], i) => `<td class="${al || ''}${k === 'amount' || k === 'inv' ? ' num' : ''}">${i === 0 ? R.length + ' бичлэг' : k === 'amount' ? erpM(sum(R)) : k === 'inv' ? erpM(R.reduce((a, r) => a + r.inv, 0)) : ''}</td>`).join('')}</tr></tfoot></table></div>`;
}
function erpKanban(R, v) {
  const cols = v === 'jobs' ? JST.map(([k, n]) => [k, n]) : QST.map(([k, n]) => [k, n]);
  const colC = { new: '#98a2b3', nest: '#2e90fa', cut: '#f79009', weld: '#7a5af8', done: '#12b76a', given: '#667085', draft: '#98a2b3', sent: '#2e90fa', won: '#12b76a', lost: '#f04438' };
  return `<div class="erp-kanban">${cols.map(([k, n]) => { const A = R.filter(r => r.st === k); return `<div class="erp-kcol" data-col="${k}"><div class="erp-kh"><span>${esc(n)}</span><span class="cnt">${A.length}</span><span class="sum">${A.length ? erpM(A.reduce((a, r) => a + r.amount, 0)) : ''}</span></div><span class="erp-kh bar" style="background:${colC[k] || '#98a2b3'}"></span>
    ${A.map(r => { const lt = (r.due && r.due < today() && !['done', 'given'].includes(r.st)) || (r.until && r.until < today() && ['draft', 'sent'].includes(r.st));
      return `<div class="erp-card" data-rec="${r.j.id}"><span class="no">${esc(r.no)}</span><div class="t">${esc(r.title || '—')}</div><div class="c">${esc(r.customer || '')}</div>${v === 'jobs' ? `<div class="erp-prog"><i><b style="width:${Math.round(r.pct)}%"></b></i><span>${Math.round(r.pct)}%</span></div>` : ''}
        <div class="ft">${r.owner ? erpAv(r.owner) : ''}<span class="${lt ? 'late' : ''}">${esc(v === 'jobs' ? (r.due ? '⏱ ' + r.due : '') : (r.until ? 'хүчинтэй ' + r.until : ''))}</span><span class="amt">${r.amount ? erpM(r.amount) : ''}</span></div></div>`; }).join('')}</div>`; }).join('')}</div>`;
}
/* change a quote / job stage from the status bar or a kanban drop */
function erpSetStage(j, k, after) {
  if (isQ(j) || (j.qst && ['draft', 'sent', 'won', 'lost'].includes(k) && !JST.some(s => s[0] === k))) {
    if (k === (j.qst || 'draft')) return;
    if (k === 'won') { if (!isQ(j)) return; if (!confirm(`${j.quote.no || j.no} саналыг баталж ажил болгох уу? Бүх мэдээлэл хадгалагдана.`)) return; quoteToJob(j); save(); toast('Ажил боллоо: ' + j.no); after && after(); return; }
    if (!isQ(j)) { toast('Батлагдсан саналыг ажлаас буцаахгүй'); return; }
    const o = (QST.find(x => x[0] === (j.qst || 'draft')) || [, ''])[1]; j.qst = k; jobLog(`Үнийн саналын төлөв: ${o} → ${(QST.find(x => x[0] === k) || [, k])[1]}`, j); save(); after && after(); return;
  }
  if (k === j.status) return; const o = jstName(j.status); j.status = k; jobLog(`Төлөв: ${o} → ${jstName(k)}`, j); save(); after && after();
}

/* ---------- form: breadcrumb, status bar, smart buttons, chatter ---------- */
function erpDecorate(el, job, v) {
  const P = job.parent ? findJob(job.parent) : null, isQt = isQ(job) || (P && isQ(P));
  const listName = isQt ? 'Үнийн санал' : 'Ажил', listV = isQt ? 'quotes' : 'jobs';
  const back = () => { setModule(listV); J.sel = null; renderJobs(); erpNav(); };
  const crumbs = [[listName, back]]; if (P) crumbs.push([`${P.quote && P.quote.no || P.no}`, () => { J.sel = P.id; J.sub = isQ(P) ? 'quote' : 'main'; renderJobs(); }]);
  crumbs.push([`${(isQ(job) ? (job.quote.no || job.no) : job.no)}${job.title ? ' — ' + job.title : ''}`]);
  const ord = ERP.orderV === listV && ERP.order ? ERP.order : erpRecs(listV).map(r => r.j.id), idx = ord.indexOf(job.id);
  const pager = idx >= 0 ? `<span class="erp-pager"><span>${idx + 1} / ${ord.length}</span><button data-pg="-1"${idx <= 0 ? ' disabled' : ''} title="Өмнөх">‹</button><button data-pg="1"${idx >= ord.length - 1 ? ' disabled' : ''} title="Дараах">›</button></span>` : '';
  const chatOff = document.documentElement.hasAttribute('data-erpnochat');
  const cp = erpCP({ crumbs, right: `${pager}<button class="btn" id="erpChatT" title="Чат, түүх харуулах/нуух">${erpIcon('chat').replace('<svg', '<svg width="16" height="16"')} ${chatOff ? 'Чат' : ''}</button><button class="btn primary" id="erpNew2">+ Шинэ</button>` });
  /* status bar */
  let acts = '', stages = '';
  if (job.parent) { acts = `<span class="muted">Мөрийн тусдаа тооцоо — ${esc((P && (P.quote.no || P.no)) || '')}</span>`; }
  else if (isQ(job)) {
    const q = job.qst || 'draft';
    acts = `${q === 'draft' ? '<button class="btn primary" data-stage="sent">Илгээсэн гэж тэмдэглэх</button>' : ''}<button class="btn${q === 'sent' ? ' primary' : ''}" data-stage="won">✓ Батлах → Ажил болгох</button>${q !== 'lost' ? '<button class="btn" data-stage="lost">Татгалзсан</button>' : '<button class="btn" data-stage="draft">Дахин нээх</button>'}`;
    const S2 = q === 'lost' ? [['draft', 'Ноорог'], ['sent', 'Илгээсэн'], ['lost', 'Татгалзсан']] : [['draft', 'Ноорог'], ['sent', 'Илгээсэн'], ['won', 'Батлагдсан']], ci = S2.findIndex(s => s[0] === q);
    stages = S2.map(([k, n], i) => `<button data-stage="${k}" class="${k === q ? 'on' : i < ci ? 'past' : ''}">${esc(n)}</button>`).join('');
  } else {
    const ci = JST.findIndex(s => s[0] === job.status), nx = JST[ci + 1];
    acts = `${nx ? `<button class="btn primary" data-stage="${nx[0]}">→ ${esc(nx[1])}</button>` : ''}<button class="btn" id="erpDup">⧉ Хуулбар</button>`;
    stages = JST.map(([k, n], i) => `<button data-stage="${k}" class="${k === job.status ? 'on' : i < ci ? 'past' : ''}">${esc(n)}</button>`).join('');
  }
  const sbar = `<div class="erp-sbar"><div class="acts">${acts}</div>${stages ? `<div class="erp-stages">${stages}</div>` : ''}</div>`;
  /* smart buttons */
  const sb = [];
  const add = (k, ic, v2, l, t) => sb.push(`<button data-sm="${k}" title="${esc(t || l)}">${erpIcon(ic)}<span><div class="v">${v2}</div><div class="l">${esc(l)}</div></span></button>`);
  let c = null; try { c = quoteCalc(job); } catch (e) { }
  const kids = (S.jobs || []).filter(j => j.parent === job.id).length, files = (job.files || []).length, msgs = typeof chatMsgs === 'function' ? chatMsgs().filter(m => m.ch === job.id).length : 0;
  if (!job.parent) {
    if (!isQ(job)) {
      const inv = job.inv || [], invT = inv.reduce((a, i) => a + (+i.amount || 0), 0), paid = inv.reduce((a, i) => a + invPaid(i), 0);
      let pg = 0; try { pg = progCalc(job).pct * 100; } catch (e) { }
      add('quote', 'quote', c ? nf(c.net / 1e6, 1) + 'М' : '—', 'Үнийн санал', c ? `${erpM(c.net)} ₮ НӨАТ-гүй` : '');
      add('scope', 'cal', Math.round(pg) + '%', 'Хуваарь, явц');
      add('inv', 'inv', inv.length ? `${inv.length}` : '0', invT ? `Нэхэмжлэх · ${invT ? Math.round(paid / invT * 100) : 0}% төлсөн` : 'Нэхэмжлэх', invT ? `${erpM(invT)} ₮ нэхэмжилсэн, ${erpM(paid)} ₮ төлсөн` : '');
      add('acc', 'truck', job.dock && job.dock.issued ? '✓' : '—', 'Packing list');
      const tk = (typeof tasks === 'function' ? tasks() : []).filter(t => t.jobId === job.id), tko = tk.filter(t => t.status !== 'done').length; add('tasks', 'task', `${tko}/${tk.length}`, 'Даалгавар');
      const mv = (typeof stkMoves === 'function' ? stkMoves() : []).filter(m => m.job === job.id).length; add('stock', 'box', `${mv}`, 'Агуулахаас');
      if (typeof mos === 'function') { const MO = mos().filter(m => m.job === job.id), NC = ncrs().filter(n => n.job === job.id && n.st !== 'closed'); add('mo', 'mfg', `${MO.length}`, MO.length ? 'Үйлдвэрлэлийн захиалга' : '+ Үйлдвэрлэлийн захиалга'); add('qc', 'qual', `${qcs().filter(q => q.job === job.id).length}`, NC.length ? `Шалгалт · ${NC.length} NCR` : 'Чанарын шалгалт'); }
    } else { add('scope', 'cal', (job.scope && job.scope.stages || []).filter(s => s.name).length + '', 'Scope, үе шат'); if (kids) add('kids', 'calc', `${kids}`, 'Мөрийн тооцоо'); }
    add('files', 'file', `${files}`, 'Хавсралт');
  }
  add('chat', 'chat', `${msgs}`, 'Чат');
  const smart = `<div class="erp-smart">${sb.join('')}</div>`;
  /* arrange: cp + status bar on top; left = smart buttons + the page itself; right = chatter */
  const sheet = document.createElement('div'); sheet.className = 'erp-sheet'; while (el.firstChild) sheet.appendChild(el.firstChild);
  const top = document.createElement('div'); top.innerHTML = cp + sbar; const form = document.createElement('div'); form.className = 'erp-form';
  const grid = document.createElement('div'); grid.className = 'erp-fgrid'; const left = document.createElement('div'); left.className = 'erp-fmain'; left.innerHTML = smart; left.appendChild(sheet);
  const chat = document.createElement('aside'); chat.className = 'erp-chatter'; grid.append(left, chat); form.append(...top.childNodes, grid); el.appendChild(form);
  erpChatter(chat, job);
  /* bindings */
  erpBindCrumbs(form, crumbs);
  form.querySelectorAll('[data-pg]').forEach(b => b.addEventListener('click', () => { const n = ord[idx + +b.dataset.pg]; if (!n) return; const j2 = findJob(n); J.sel = n; J.sub = isQ(j2) ? 'quote' : (J.sub && !isQ(j2) && J.sub !== 'quote' ? J.sub : 'main'); renderJobs(); }));
  form.querySelector('#erpNew2').addEventListener('click', () => { const j = isQt ? newQuote() : newJob(); J.sel = j.id; J.sub = isQt ? 'quote' : 'main'; save(); renderJobs(); });
  form.querySelector('#erpChatT').addEventListener('click', () => { document.documentElement.toggleAttribute('data-erpnochat'); try { localStorage.setItem('kh-erp-nochat', document.documentElement.hasAttribute('data-erpnochat') ? '1' : ''); } catch (e) { } renderJobMain(); });
  form.querySelectorAll('.erp-sbar [data-stage]').forEach(b => b.addEventListener('click', () => erpSetStage(job, b.dataset.stage, () => { if (!isQ(job) && listV === 'quotes') { setModule('jobs'); J.sel = job.id; J.sub = 'main'; } renderJobs(); erpNav(); })));
  const dp = form.querySelector('#erpDup'); if (dp) dp.addEventListener('click', () => { const b = sheet.querySelector('#jb_dup'); if (b) b.click(); else toast('Хуулах товч олдсонгүй'); });
  const scrollTo = re => { const h = [...sheet.querySelectorAll('.bcard-h,h3,.jcard>.bcard-h')].find(x => re.test(x.textContent)); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); else toast('Энэ хэсэг одоо харагдах хуудсанд алга'); };
  form.querySelectorAll('[data-sm]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.sm;
    if (k === 'mo') { const MO = mos().filter(m => m.job === job.id); if (MO.length === 1) mfGo('mo', MO[0].id); else if (MO.length) { erpGo('mfg'); MF.q = job.no; MF.f = ''; renderMfg(); } else { const mo = newMO({ job: job.id, item: job.title || '', due: job.due || '' }); moOpsFromJob(mo); mfGo('mo', mo.id); } return; }
    if (k === 'qc') { erpGo('mfg:qc'); MF.q = job.no; renderMfg(); return; }
    if (k === 'quote') { J.sub = 'quote'; renderJobs(); } else if (k === 'scope') { J.sub = 'scope'; renderJobs(); } else if (k === 'acc') { J.sub = 'acc'; renderJobs(); }
    else if (k === 'inv') { if (J.sub !== 'main') { J.sub = 'main'; renderJobs(); } setTimeout(() => scrollTo(/Нэхэмжл|Санхүү/), 60); }
    else if (k === 'files') { if (!isQ(job) && J.sub !== 'main') { J.sub = 'main'; renderJobs(); } setTimeout(() => scrollTo(/Хавсралт|Файл/), 60); }
    else if (k === 'tasks') erpGo('team'); else if (k === 'stock') erpGo('stock');
    else if (k === 'kids') { J.sub = 'quote'; renderJobs(); setTimeout(() => scrollTo(/Мөр|мөр/), 60); }
    else if (k === 'chat') { document.documentElement.removeAttribute('data-erpnochat'); const t = $('.erp-chatter textarea'); if (t) t.focus(); else renderJobMain(); } }));
}
function erpChatter(box, job) {
  const mode = ERP.chMode || 'msg';
  const M = (typeof chatMsgs === 'function' ? chatMsgs() : []).filter(m => m.ch === job.id).map(m => ({ t: m.t, who: m.who, b: m.text, kind: 'msg', ph: !!m.src }));
  const L = (job.log || []).map(l => ({ t: String(l.t || '').replace(' ', 'T'), who: 'Систем', b: l.m, kind: 'log' }));
  const all = M.concat(L).sort((a, b) => String(b.t).localeCompare(String(a.t))).slice(0, 200);
  let day = '', tl = '';
  all.forEach(e => { const d = String(e.t).slice(0, 10); if (d !== day) { day = d; tl += `<div class="erp-tlday">${d === today() ? 'Өнөөдөр' : esc(d)}</div>`; } const tm = String(e.t).slice(11, 16);
    tl += `<div class="erp-msg ${e.kind}">${e.kind === 'log' ? '<span class="erp-av">⚙</span>' : erpAv(e.who)}<div><div class="h"><b>${esc(e.who)}</b>${e.ph ? '📱 ' : ''}${esc(tm)}</div><div class="b">${esc(e.b)}</div></div></div>`; });
  const me = typeof chatMe === 'function' ? chatMe() : '';
  box.innerHTML = `<div class="erp-chh"><button data-chm="msg" class="${mode === 'msg' ? 'on' : ''}">Мессеж илгээх</button><button data-chm="note" class="${mode === 'note' ? 'on' : ''}">Тэмдэглэл</button><span class="sp" style="flex:1"></span><span class="muted" style="font-size:12px">${M.length} мессеж</span></div>
    <div class="erp-chin"><textarea class="inp" id="erpChTxt" placeholder="${mode === 'msg' ? (me ? 'Энэ ажлын чат руу бичих… (Enter)' : 'Эхлээд «💬 Чат» цэснээс нэрээ сонгоно уу') : 'Дотоод тэмдэглэл — түүхэнд хадгалагдана'}"></textarea><div style="display:flex;gap:6px"><button class="btn primary sm" id="erpChSend">${mode === 'msg' ? 'Илгээх' : 'Тэмдэглэх'}</button><span class="muted" style="font-size:11.5px;align-self:center">${mode === 'msg' ? 'Оффис, үйлдвэр, утсанд харагдана' : 'Зөвхөн түүхэнд'}</span></div></div>
    <div class="erp-tl">${tl || '<p class="muted" style="font-size:12.5px">Одоогоор түүх алга.</p>'}</div>`;
  box.querySelectorAll('[data-chm]').forEach(b => b.addEventListener('click', () => { ERP.chMode = b.dataset.chm; erpChatter(box, job); }));
  const tx = box.querySelector('#erpChTxt'), send = () => { const v2 = tx.value.trim(); if (!v2) return;
    if (ERP.chMode === 'note') jobLog('📝 ' + v2, job); else { if (!me) { toast('Эхлээд «💬 Чат» цэснээс нэрээ сонгоно уу'); if (typeof chatOpen === 'function') chatOpen('general'); return; } chatPost(job.id, v2); }
    erpChatter(box, job); const t2 = box.querySelector('#erpChTxt'); if (t2) t2.focus(); };
  tx.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  box.querySelector('#erpChSend').addEventListener('click', send);
}

/* ---------- home ---------- */
function erpHome(el) {
  const JB = topJobs().filter(j => !isQ(j)), act = JB.filter(j => !['done', 'given'].includes(j.status)), late = act.filter(j => j.due && j.due < today());
  const QO = topJobs().filter(j => isQ(j) && ['draft', 'sent'].includes(j.qst || 'draft')), qv = j => { try { return quoteCalc(j).net; } catch (e) { return 0; } };
  const m0 = today().slice(0, 7), wonM = JB.filter(j => j.qst === 'won' && String((j.log || []).find(l => /Ажил боллоо|ажил болгосон|Батлагдсан/.test(l.m))?.t || j.created || '').slice(0, 7) === m0);
  const RC = typeof receivables === 'function' ? receivables() : [], rcSum = RC.reduce((a, r) => a + r.left, 0), rcLate = RC.filter(r => r.st[0] === 'late');
  const low = (typeof stk === 'function' ? stk() : []).filter(it => it.min > 0 && +it.qty <= +it.min), TK = (typeof tasks === 'function' ? tasks() : []).filter(t => t.status !== 'done');
  const expQ = QO.filter(j => j.quote.date && addDays(j.quote.date, +j.quote.valid || 0) < today());
  const me = pName(S.me), h = new Date().getHours(), greet = h < 12 ? 'Өглөөний мэнд' : h < 18 ? 'Өдрийн мэнд' : 'Оройн мэнд', cnt = erpCounts();
  const kpi = (k, v2, s, go, cls = '') => `<button class="erp-kpi ${cls}" data-go="${go}"><span class="k">${k}</span><span class="v">${v2}</span><span class="s">${s}</span></button>`;
  const al = (arr, f, empty) => `<div class="erp-al">${arr.length ? arr.slice(0, 8).map(f).join('') : `<div class="none">${empty}</div>`}</div>`;
  el.innerHTML = `<div class="erp-home">
    <div class="erp-hi"><h1>${greet}${me ? ', ' + esc(me) : ''}</h1><span>${today()} · Kh International</span></div>
    <div class="erp-appsrow">${ERP_APPS.filter(a => a.k !== 'home').map(a => `<button class="erp-tile" data-app="${a.k}"><i style="background:${a.c}">${erpIcon(a.ic)}</i><b>${esc(a.n)}</b><small>${esc(cnt[a.k] || '')}</small></button>`).join('')}</div>
    <div class="erp-kpis">
      ${kpi('Нээлттэй үнийн санал', `${QO.length}`, `${erpM(QO.reduce((a, j) => a + qv(j), 0))} ₮ нийт`, 'quotes')}
      ${kpi('Энэ сард батлагдсан', `${wonM.length}`, `${erpM(wonM.reduce((a, j) => a + (jobMoney(j).price || 0), 0))} ₮`, 'jobs', 'good')}
      ${kpi('Идэвхтэй ажил', `${act.length}`, `${erpM(act.reduce((a, j) => a + (jobMoney(j).price || 0), 0))} ₮ гэрээ`, 'jobs')}
      ${kpi('Хугацаа хэтэрсэн ажил', `${late.length}`, late.slice(0, 3).map(j => j.no).join(', ') || 'алга', 'jobs:late', late.length ? 'bad' : '')}
      ${kpi('Авлага', `${nf(rcSum / 1e6, 1)}<small>сая ₮</small>`, `${RC.length} нэхэмжлэх`, 'docs:invoices')}
      ${kpi('Хугацаа хэтэрсэн авлага', `${nf(rcLate.reduce((a, r) => a + r.left, 0) / 1e6, 1)}<small>сая ₮</small>`, `${rcLate.length} нэхэмжлэх`, 'docs:invoices', rcLate.length ? 'bad' : '')}
      ${kpi('Дутуу бараа', `${low.length}`, low.slice(0, 3).map(i => i.name).join(', ') || 'бүгд хүрэлцээтэй', 'stock', low.length ? 'bad' : '')}
      ${kpi('Нээлттэй даалгавар', `${TK.length}`, `${TK.filter(t => t.status === 'doing').length} хийгдэж буй`, 'team')}
    </div>
    <div class="erp-cols">
      <div class="erp-panel"><h3>Анхаарах: хугацаа хэтэрсэн ажил<span class="cnt">${late.length}</span></h3>${al(late.sort((a, b) => a.due.localeCompare(b.due)), j => `<button data-job="${j.id}"><span class="erp-b s-${j.status}">${esc(jstName(j.status))}</span><span class="t"><b class="mono">${esc(j.no)}</b> ${esc(j.title || '')} <span class="muted">· ${esc(j.customer || '')}</span></span><span class="r bad">${-daysLeft(j.due)} хоног</span></button>`, 'Хугацаа хэтэрсэн ажил алга 👍')}</div>
      <div class="erp-panel"><h3>Төлбөр хүлээгдэж буй нэхэмжлэх<span class="cnt">${RC.length}</span></h3>${al(RC.slice().sort((a, b) => (b.st[0] === 'late') - (a.st[0] === 'late') || String(a.i.due || '').localeCompare(String(b.i.due || ''))), r => `<button data-inv="${r.i.id}"><span class="erp-b s-${r.st[0]}">${esc(r.st[1])}</span><span class="t"><b class="mono">${esc(r.i.no || '')}</b> ${esc((r.job && r.job.customer) || (r.i.bill && r.i.bill.company) || '')}</span><span class="r${r.st[0] === 'late' ? ' bad' : ''}">${erpM(r.left)} ₮</span></button>`, 'Авлага алга')}</div>
      <div class="erp-panel"><h3>Хүлээгдэж буй үнийн санал<span class="cnt">${QO.length}</span></h3>${al(QO.slice().sort((a, b) => String(b.quote.date || '').localeCompare(String(a.quote.date || ''))), j => { const ex = expQ.includes(j); return `<button data-job="${j.id}"><span class="erp-b s-${j.qst || 'draft'}">${esc((QST.find(x => x[0] === (j.qst || 'draft')) || [, ''])[1])}</span><span class="t"><b class="mono">${esc(j.quote.no || j.no)}</b> ${esc(j.title || '')} <span class="muted">· ${esc(j.customer || '')}</span></span><span class="r${ex ? ' bad' : ''}">${ex ? 'хугацаа дууссан' : erpM(qv(j)) + ' ₮'}</span></button>`; }, 'Нээлттэй санал алга')}</div>
      <div class="erp-panel"><h3>Дутуу бараа (агуулах)<span class="cnt">${low.length}</span></h3>${al(low, i => `<button data-go="stock"><span class="erp-b s-late">дутуу</span><span class="t">${esc(i.name || '')}</span><span class="r bad">${nf(+i.qty || 0, 1)} / ${nf(+i.min || 0, 1)} ${esc(i.unit || '')}</span></button>`, 'Доод үлдэгдлээс доош бараа алга')}</div>
    </div>
    <details class="erp-panel" style="padding:0 16px 16px"><summary style="padding:12px 0;cursor:pointer;font-weight:600">Дэлгэрэнгүй тойм — борлуулалт, авлага, ажлын төсөв</summary><div class="erp-oldash" id="erpOldDash"></div></details>
  </div>`;
  el.querySelectorAll('[data-app]').forEach(b => b.addEventListener('click', () => { const a = ERP_APPS.find(x => x.k === b.dataset.app); erpGo(a.items[0][0]); }));
  el.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { const g = b.dataset.go; if (g === 'jobs:late') { EV.jobs.f = ['active', 'late']; EV.jobs.view = 'list'; evSave(); erpGo('jobs'); } else erpGo(g); }));
  el.querySelectorAll('[data-job]').forEach(b => b.addEventListener('click', () => { const j = findJob(b.dataset.job); setModule(isQ(j) ? 'quotes' : 'jobs'); J.sel = j.id; J.sub = isQ(j) ? 'quote' : 'main'; renderJobs(); erpNav(); }));
  el.querySelectorAll('[data-inv]').forEach(b => b.addEventListener('click', () => { if (typeof openInvoice === 'function') openInvoice(b.dataset.inv); erpNav(); }));
  const od = el.querySelector('details'); od.addEventListener('toggle', () => { if (od.open && !od.dataset.done) { od.dataset.done = 1; try { renderDash(el.querySelector('#erpOldDash')); } catch (e) { } } });
}

/* ---------- build the navbar, hook the renderers ---------- */
function erpBuild() {
  if (!erpOn() || $('#erpNav')) return;
  const top = $('.top'), acts = top.querySelector('.top-actions');
  const nav = document.createElement('div'); nav.id = 'erpNav'; nav.className = 'erp-nav';
  const logo = (top.querySelector('.brand-logo') || {}).src || '';
  nav.innerHTML = `<button class="erp-apps" id="erpAppsBtn" title="Бүх програм">${erpIcon('grid').replace('<svg', '<svg width="20" height="20"')}</button>${logo ? `<img class="erp-logo" id="erpLogo" src="${logo}" alt="Kh International">` : ''}<span class="erp-appname" id="erpAppName"></span><nav class="erp-menu"></nav>`;
  top.insertBefore(nav, acts);
  /* rarely used tools go into the ⚙ menu */
  const more = document.createElement('div'); more.className = 'erp-more';
  more.innerHTML = `<button class="btn ghost" id="erpMoreBtn" title="Тохиргоо, өгөгдөл">⚙</button><div class="erp-dd" id="erpDD" hidden><div class="ddh">Харагдах байдал</div></div>`;
  const dd = more.querySelector('#erpDD');
  ['#skinSel', '#btnTheme'].forEach(s => { const n = $(s); if (n) dd.appendChild(n); });
  const h2 = document.createElement('div'); h2.className = 'ddh'; h2.textContent = 'Өгөгдөл, төсөл'; dd.appendChild(h2);
  ['#btnDataDir', '#jobName', '#btnOpenProj', '#btnSaveProj'].forEach(s => { const n = $(s); if (n) dd.appendChild(n); });
  const iso = document.createElement('button'); iso.className = 'btn ghost'; iso.textContent = 'ISO маягтын код, операторууд, лого'; iso.addEventListener('click', erpIsoDlg); dd.appendChild(iso);
  acts.appendChild(more);
  const user = document.createElement('button'); user.className = 'erp-user'; user.id = 'erpUser'; acts.appendChild(user);
  const upUser = () => { const n = pName(S.me); user.textContent = erpInit2(n || 'KH'); user.title = n ? `${n} — солих` : 'Би хэн бэ? — Баг хэсгээс нэрээ сонгоно'; user.style.background = n ? erpAvColor(n) : ''; };
  upUser(); user.addEventListener('click', () => { if (typeof chatOpen === 'function') { S.me = ''; chatOpen('general'); setTimeout(upUser, 4000); } });
  more.querySelector('#erpMoreBtn').addEventListener('click', e => { e.stopPropagation(); dd.hidden = !dd.hidden; });
  document.addEventListener('click', e => { if (!more.contains(e.target)) dd.hidden = true; });
  nav.querySelector('#erpAppsBtn').addEventListener('click', () => erpLaunch());
  nav.querySelector('.erp-appname').addEventListener('click', () => { const a = erpAppOf(ERP.route); erpGo(a.items[0][0]); });
  const lg = nav.querySelector('#erpLogo'); if (lg) lg.addEventListener('click', () => erpGo('dash'));
  nav.querySelector('.erp-menu').addEventListener('click', e => { const b = e.target.closest('[data-erp]'); if (b) erpGo(b.dataset.erp); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ERP.launch) erpLaunch(false); });
  try { if (localStorage.getItem('kh-erp-nochat') === '1') document.documentElement.setAttribute('data-erpnochat', ''); } catch (e) { }
  /* hooks */
  const _rjm = renderJobMain;
  renderJobMain = function () {
    if (!erpOn()) return _rjm();
    const el = $('#jobsMain'), v = document.documentElement.dataset.jview;
    if (J.tab === 'jobs' && (J.dash || v === 'dash')) { erpHome(el); return; }
    if (J.tab === 'jobs' && (v === 'jobs' || v === 'quotes') && !findJob(J.sel)) { erpList(el, v); return; }
    _rjm();
    const job = findJob(J.sel); if (J.tab === 'jobs' && job && (v === 'jobs' || v === 'quotes')) erpDecorate(el, job, v);
  };
  const _sm = setModule;
  setModule = function (v) { _sm(v); if (erpOn()) erpNav(); };
}
function erpIsoDlg() {
  const det = $('details.jset'); if (!det) return; const ph = document.createComment('jset'); det.parentNode.insertBefore(ph, det);
  const m = document.createElement('div'); m.className = 'erp-modal'; const box = document.createElement('div'); m.appendChild(box);
  box.innerHTML = '<div style="display:flex;align-items:center;margin-bottom:8px"><b style="font-size:16px">ISO маягт, операторууд, лого</b><span style="flex:1"></span><button class="btn ghost" id="erpIsoX">✕</button></div>';
  det.open = true; box.appendChild(det); document.body.appendChild(m);
  const close = () => { ph.parentNode.insertBefore(det, ph); ph.remove(); m.remove(); };
  box.querySelector('#erpIsoX').addEventListener('click', close); m.addEventListener('click', e => { if (e.target === m) close(); });
}
(() => {
  if (!erpOn()) return;
  erpBuild();
  let r = 'dash'; try { r = localStorage.getItem('kh-erp-route') || ''; } catch (e) { }
  if (!r) { try { const m0 = localStorage.getItem(KEY + ':mod'); r = m0 && m0 !== 'docs' ? m0 : 'dash'; } catch (e) { r = 'dash'; } }
  try { erpGo(r); } catch (e) { erpGo('dash'); }
})();
