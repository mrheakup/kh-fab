/* ================= Kh International — Тайлан: ажлын ашиг (төлөвлөсөн ↔ бодит), борлуулалт сараар, захиалагчаар, машины ашиглалт ================= */
const RP = { tab: 'job', from: today().slice(0, 4) + '-01-01', to: today(), st: 'all', sort: '-profit', cust: '' };
try { const o = JSON.parse(localStorage.getItem('kh-rp') || '{}'); Object.assign(RP, o, { to: o.to && o.to > today() ? o.to : (o.to || today()) }); } catch (e) { }
const rpSave = () => { try { localStorage.setItem('kh-rp', JSON.stringify({ tab: RP.tab, from: RP.from, to: RP.to, st: RP.st, sort: RP.sort })); } catch (e) { } };
const RP_TABS = [['job', 'Ажлын ашиг'], ['sales', 'Борлуулалт'], ['cust', 'Захиалагчаар'], ['mach', 'Машины ашиглалт']];
const rpM = v => nf(Math.round((+v || 0) / 1e5) / 10, 1);   // сая ₮
const rpPct = v => v == null || !isFinite(v) ? '—' : nf(v, 1) + '%';
/* one row per job: contract, planned cost (costing), actual cost (expenses: stock issues, MO labour, other) */
function rpJobs() {
  return topJobs().filter(j => !isQ(j)).filter(j => { const d = j.created || ''; return (!RP.from || d >= RP.from) && (!RP.to || d <= RP.to); })
    .filter(j => RP.st === 'all' || (RP.st === 'closed' ? ['done', 'given'].includes(j.status) : !['done', 'given'].includes(j.status)))
    .map(j => { let m = {}, c = {}, P = {}; try { m = jobMoney(j); c = quoteCalc(j); P = progCalc(j); } catch (e) { }
      const price = +m.price || 0, plan = +c.cost || +m.plan || 0, act = +P.AC || 0, has = act > 0, prof = price - (has ? act : plan);
      const inv = (j.inv || []).reduce((a, i) => a + (+i.amount || 0), 0), paid = (j.inv || []).reduce((a, i) => a + invPaid(i), 0);
      return { j, no: j.no, customer: j.customer || '', title: j.title || '', st: j.status, price, plan, planProf: price - plan, planM: price ? (price - plan) / price * 100 : null, act, has, profit: prof, margin: price ? prof / price * 100 : null, varc: has ? act - plan : null, inv, paid, pct: (P.pct || 0) * 100, date: j.created || '' }; });
}
function renderRepSide() { const b = $('#repList'); if (!b) return; b.innerHTML = RP_TABS.map(([k, n]) => `<div class="engitem${RP.tab === k ? ' on' : ''}" data-rpt="${k}"><b>${esc(n)}</b></div>`).join(''); b.querySelectorAll('[data-rpt]').forEach(x => x.addEventListener('click', () => { RP.tab = x.dataset.rpt; rpSave(); renderRep(); })); }
function renderRep() {
  renderRepSide(); const el = $('#repMain'); if (!el) return;
  ({ job: rpJobPage, sales: rpSalesPage, cust: rpCustPage, mach: rpMachPage }[RP.tab] || rpJobPage)(el);
  if (typeof erpOn === 'function' && erpOn() && typeof erpNav === 'function') erpNav();
}
const rpFilt = (st) => `<div class="rp-filt"><label>Хугацаа <input type="date" id="rpFrom" value="${esc(RP.from)}"> — <input type="date" id="rpTo" value="${esc(RP.to)}"></label>
  <select id="rpQuick"><option value="">Хурдан сонгох…</option><option value="m">Энэ сар</option><option value="q">Сүүлийн 3 сар</option><option value="y">Энэ жил</option><option value="ly">Өнгөрсөн жил</option><option value="all">Бүх хугацаа</option></select>
  ${st ? `<select id="rpSt"><option value="all"${RP.st === 'all' ? ' selected' : ''}>Бүх ажил</option><option value="closed"${RP.st === 'closed' ? ' selected' : ''}>Дууссан, хүлээлгэсэн</option><option value="open"${RP.st === 'open' ? ' selected' : ''}>Идэвхтэй</option></select>` : ''}</div>`;
function rpBindFilt(el) {
  const f = el.querySelector('#rpFrom'), t = el.querySelector('#rpTo'), q = el.querySelector('#rpQuick'), s = el.querySelector('#rpSt');
  if (f) f.addEventListener('change', () => { RP.from = f.value; rpSave(); renderRep(); }); if (t) t.addEventListener('change', () => { RP.to = t.value; rpSave(); renderRep(); });
  if (s) s.addEventListener('change', () => { RP.st = s.value; rpSave(); renderRep(); });
  if (q) q.addEventListener('change', () => { const y = today().slice(0, 4); ({ m: () => { RP.from = today().slice(0, 7) + '-01'; RP.to = today(); }, q: () => { RP.from = addDays(today(), -91); RP.to = today(); }, y: () => { RP.from = y + '-01-01'; RP.to = today(); }, ly: () => { RP.from = (y - 1) + '-01-01'; RP.to = (y - 1) + '-12-31'; }, all: () => { RP.from = ''; RP.to = ''; } }[q.value] || (() => { }))(); rpSave(); renderRep(); });
}
const rpKpi = (k, v, s, cls) => `<div class="erp-kpi${cls ? ' ' + cls : ''}" style="cursor:default"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s || ''}</div></div>`;
async function rpXlsx(name, head, rows) { try { if (!window.XLSX) await loadScript(XLSX_URL); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([head].concat(rows)), name.slice(0, 30)); XLSX.writeFile(wb, `${name}_${today()}.xlsx`); } catch (e) { toast('Excel гаргаж чадсангүй: ' + e.message); } }

/* ===== Ажлын ашиг ===== */
const RP_JCOLS = [['no', 'Ажил'], ['customer', 'Захиалагч'], ['price', 'Гэрээ, ₮', 'r'], ['plan', 'Төлөвлөсөн зардал', 'r'], ['act', 'Бодит зардал', 'r'], ['varc', 'Зөрүү', 'r'], ['profit', 'Ашиг', 'r'], ['margin', 'Margin', 'r'], ['inv', 'Нэхэмжилсэн', 'r'], ['st', 'Төлөв']];
function rpJobPage(el) {
  const R = rpJobs(), sk = RP.sort.replace(/^-/, ''), dir = RP.sort[0] === '-' ? -1 : 1;
  R.sort((a, b) => { const x = a[sk], y = b[sk]; return (typeof x === 'string' ? String(x).localeCompare(String(y)) : ((x ?? -1e18) - (y ?? -1e18))) * dir; });
  const T = R.reduce((a, r) => { a.price += r.price; a.plan += r.plan; a.act += r.has ? r.act : 0; a.cost += r.has ? r.act : r.plan; a.prof += r.profit; return a; }, { price: 0, plan: 0, act: 0, cost: 0, prof: 0 });
  const loss = R.filter(r => r.profit < 0), noAct = R.filter(r => !r.has && r.price), over = R.filter(r => r.has && r.varc > r.plan * 0.1 && r.plan);
  const top = R.slice().sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit)).slice(0, 12), mx = Math.max(1, ...top.map(r => Math.abs(r.profit)));
  el.innerHTML = erpCP({ crumbs: [['Тайлан'], ['Ажлын ашиг']], right: '<button class="btn" id="rpX">⇩ Excel</button><button class="btn" data-rpo="pdf">PDF</button><button class="btn ghost" data-rpo="print">🖨</button>', row2: rpFilt(true) }) + `<div class="mf-body">
    <div class="erp-kpis">${rpKpi('Гэрээний дүн', `${rpM(T.price)}<small>сая ₮</small>`, `${R.length} ажил`)}${rpKpi('Зардал (бодит / төлөвлөсөн)', `${rpM(T.cost)}<small>сая ₮</small>`, `бодит ${rpM(T.act)} · төлөвлөсөн ${rpM(T.plan)}`)}${rpKpi('Ашиг', `${rpM(T.prof)}<small>сая ₮</small>`, `margin ${rpPct(T.price ? T.prof / T.price * 100 : null)}`, T.prof < 0 ? 'bad' : 'good')}${rpKpi('Алдагдалтай ажил', `${loss.length}`, over.length ? `${over.length} ажил төлөвлөгөөнөөс 10%+ хэтэрсэн` : 'төсөвт багтсан', loss.length ? 'bad' : '')}</div>
    ${noAct.length ? `<div class="mf-info">${noAct.length} ажилд бодит зардал бүртгэгдээгүй тул ашгийг төлөвлөсөн зардлаар тооцов. Бодит зардал = агуулахаас олгосон материал + цехийн бодит цаг (үйлдвэрлэлийн захиалга) + «Зардал бүртгэх».</div>` : ''}
    ${top.length ? mfCard('Ашиг / алдагдал — хамгийн том 12 ажил', `<div class="rp-bars">${top.map(r => `<div class="rp-bar"><span class="n" title="${esc(r.title)}"><b class="mono">${esc(r.no)}</b> ${esc(r.customer)}</span><span class="b"><i class="${r.profit < 0 ? 'neg' : ''}" style="width:${Math.abs(r.profit) / mx * 100}%"></i></span><span class="v ${r.profit < 0 ? 'rp-neg' : ''}">${money(r.profit)}</span></div>`).join('')}</div>`) : ''}
    ${R.length ? `<div class="erp-list"><table><thead><tr>${RP_JCOLS.map(([k, n, a]) => `<th class="${a || ''}" data-rps="${k}">${esc(n)}${sk === k ? (dir < 0 ? ' ↓' : ' ↑') : ''}</th>`).join('')}</tr></thead><tbody>
      ${R.slice(0, RP.all ? R.length : 150).map(r => `<tr class="rec" data-rpj="${r.j.id}"><td><b class="mono">${esc(r.no)}</b><div class="sub">${esc(r.title)}</div></td><td>${esc(r.customer)}</td><td class="r num">${money(r.price)}</td><td class="r num">${money(r.plan)}</td><td class="r num">${r.has ? money(r.act) : '<span class="sub">—</span>'}</td><td class="r num ${r.varc > 0 ? 'rp-neg' : r.varc < 0 ? 'rp-pos' : ''}">${r.varc == null ? '' : (r.varc > 0 ? '+' : '') + money(r.varc)}</td><td class="r num ${r.profit < 0 ? 'rp-neg' : ''}"><b>${money(r.profit)}</b>${r.has ? '' : '<div class="sub">төлөвлөсөн</div>'}</td><td class="r num ${r.margin != null && r.margin < 10 ? 'rp-neg' : ''}">${rpPct(r.margin)}</td><td class="r num">${r.inv ? money(r.inv) : ''}</td><td>${mfB(r.st, jstName(r.st))}</td></tr>`).join('')}${R.length > 150 && !RP.all ? `<tr><td colspan="10" style="text-align:center"><button class="btn sm" id="rpAll">Бүгдийг харуулах (${R.length})</button></td></tr>` : ''}</tbody>
      <tfoot><tr><td colspan="2">${R.length} ажил</td><td class="r num">${money(T.price)}</td><td class="r num">${money(T.plan)}</td><td class="r num">${money(T.act)}</td><td></td><td class="r num"><b>${money(T.prof)}</b></td><td class="r num">${rpPct(T.price ? T.prof / T.price * 100 : null)}</td><td class="r num">${money(R.reduce((a, r) => a + r.inv, 0))}</td><td></td></tr></tfoot></table></div>` : '<div class="erp-empty"><b>Энэ хугацаанд ажил алга</b>Хугацааг өөрчилж үзнэ үү.</div>'}</div>`;
  rpBindFilt(el); { const a = el.querySelector('#rpAll'); if (a) a.addEventListener('click', () => { RP.all = true; renderRep(); }); }
  el.querySelectorAll('[data-rps]').forEach(th => th.addEventListener('click', () => { const k = th.dataset.rps; RP.sort = RP.sort === '-' + k ? k : '-' + k; rpSave(); renderRep(); }));
  el.querySelectorAll('[data-rpj]').forEach(tr => tr.addEventListener('click', () => { const j = findJob(tr.dataset.rpj); if (!j) return; erpGo('jobs'); J.sel = j.id; J.sub = 'main'; renderJobs(); erpNav(); }));
  el.querySelector('#rpX').addEventListener('click', () => rpXlsx('Ажлын_ашиг', ['Ажил', 'Нэр', 'Захиалагч', 'Огноо', 'Гэрээ', 'Төлөвлөсөн зардал', 'Бодит зардал', 'Зөрүү', 'Ашиг', 'Margin %', 'Нэхэмжилсэн', 'Төлсөн', 'Төлөв'], R.map(r => [r.no, r.title, r.customer, r.date, r.price, Math.round(r.plan), r.has ? Math.round(r.act) : '', r.varc == null ? '' : Math.round(r.varc), Math.round(r.profit), r.margin == null ? '' : Math.round(r.margin * 10) / 10, r.inv, r.paid, jstName(r.st)])));
  el.querySelectorAll('[data-rpo]').forEach(b => b.addEventListener('click', () => docOut(b.dataset.rpo, async () => { const D = await kdoc({ title: 'АЖЛЫН АШГИЙН ТАЙЛАН', sub: `${RP.from || '…'} — ${RP.to || '…'}`, code: 'KH-FN-R01', landscape: true });
    D.kv([['Гэрээний дүн', money(T.price) + ' ₮'], ['Зардал', money(T.cost) + ' ₮'], ['Ашиг', money(T.prof) + ' ₮'], ['Margin', rpPct(T.price ? T.prof / T.price * 100 : null)]], 4);
    D.table([{ t: 'Ажил', w: 26, m: 1 }, { t: 'Нэр' }, { t: 'Захиалагч', w: 44 }, { t: 'Гэрээ', w: 28, a: 'r', m: 1 }, { t: 'Төлөвлөсөн', w: 28, a: 'r', m: 1 }, { t: 'Бодит', w: 28, a: 'r', m: 1 }, { t: 'Ашиг', w: 28, a: 'r', m: 1 }, { t: 'Margin', w: 16, a: 'r' }], R.map(r => ({ cells: [r.no, r.title, r.customer, money(r.price), money(r.plan), r.has ? money(r.act) : '—', money(r.profit), rpPct(r.margin)], fill: r.profit < 0 ? '#fef3f2' : '' })));
    return D; }, 'Ажлын_ашиг')));
}
/* ===== Борлуулалт сараар ===== */
function rpMonths() {
  const end = (RP.to || today()).slice(0, 7), L = []; let d = new Date(end + '-01T00:00:00Z'); for (let i = 0; i < 12; i++) { L.unshift(d.toISOString().slice(0, 7)); d.setUTCMonth(d.getUTCMonth() - 1); }
  const M = {}; L.forEach(m => M[m] = { m, quoted: 0, nQ: 0, won: 0, nW: 0, lost: 0, inv: 0, paid: 0 });
  topJobs().forEach(j => { let net = 0; try { net = quoteCalc(j).net; } catch (e) { }
    const qd = String((j.quote && j.quote.date) || j.created || '').slice(0, 7); if (M[qd] && (isQ(j) || j.qst)) { M[qd].quoted += net; M[qd].nQ++; if (j.qst === 'lost') M[qd].lost++; }
    if (!isQ(j)) { const wd = String(j.created || '').slice(0, 7); if (M[wd]) { M[wd].won += +jobMoney(j).price || net; M[wd].nW++; } } });
  allInvoices().forEach(({ i }) => { const m = String(i.date || '').slice(0, 7); if (M[m]) M[m].inv += +i.amount || 0; (i.pays || []).forEach(p => { const pm = String(p.date || '').slice(0, 7); if (M[pm]) M[pm].paid += +p.amount || 0; }); });
  return L.map(m => M[m]);
}
function rpChart(rows, keys) {
  const W = 900, H = 260, P = { l: 46, r: 10, t: 12, b: 28 }, n = rows.length, gw = (W - P.l - P.r) / n, bw = Math.min(18, (gw - 10) / keys.length), mx = Math.max(1, ...rows.flatMap(r => keys.map(k => r[k[0]])));
  const nice = (() => { const e = Math.pow(10, Math.floor(Math.log10(mx))), f = mx / e; return (f <= 2 ? 2 : f <= 5 ? 5 : 10) * e; })(), y = v => H - P.b - v / nice * (H - P.t - P.b);
  let g = ''; for (let i = 0; i <= 4; i++) { const v = nice * i / 4; g += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="currentColor" stroke-opacity=".12"/><text x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end">${nf(v / 1e6, v / 1e6 < 10 ? 1 : 0)}</text>`; }
  rows.forEach((r, i) => { const x0 = P.l + i * gw + (gw - bw * keys.length) / 2; keys.forEach(([k, , c], j) => { const v = r[k]; if (v > 0) g += `<rect x="${x0 + j * bw}" y="${y(v)}" width="${bw - 2}" height="${H - P.b - y(v)}" rx="2" fill="${c}"><title>${r.m} · ${money(v)} ₮</title></rect>`; }); g += `<text x="${P.l + i * gw + gw / 2}" y="${H - 8}" text-anchor="middle">${r.m.slice(2).replace('-', '.')}</text>`; });
  return `<svg class="rp-chart" viewBox="0 0 ${W} ${H}" style="color:var(--ink-3)">${g}<text x="6" y="12">сая ₮</text></svg><div class="rp-leg">${keys.map(([, n, c]) => `<span><i style="background:${c}"></i>${esc(n)}</span>`).join('')}</div>`;
}
function rpSalesPage(el) {
  const R = rpMonths(), S1 = k => R.reduce((a, r) => a + r[k], 0), dec = R.reduce((a, r) => a + r.nW + r.lost, 0), wr = dec ? R.reduce((a, r) => a + r.nW, 0) / Math.max(1, R.reduce((a, r) => a + r.nQ, 0)) * 100 : null;
  el.innerHTML = erpCP({ crumbs: [['Тайлан'], ['Борлуулалт']], right: '<button class="btn" id="rpX">⇩ Excel</button>', row2: `<div class="rp-filt"><label>Сүүлийн 12 сар — дуусах сар <input type="date" id="rpTo" value="${esc(RP.to || today())}"></label></div>` }) + `<div class="mf-body">
    <div class="erp-kpis">${rpKpi('Илгээсэн үнийн санал', `${rpM(S1('quoted'))}<small>сая ₮</small>`, `${S1('nQ')} санал`)}${rpKpi('Батлагдсан (ажил болсон)', `${rpM(S1('won'))}<small>сая ₮</small>`, `${S1('nW')} ажил · амжилт ${rpPct(wr)}`, 'good')}${rpKpi('Нэхэмжилсэн', `${rpM(S1('inv'))}<small>сая ₮</small>`, '12 сард')}${rpKpi('Орсон төлбөр', `${rpM(S1('paid'))}<small>сая ₮</small>`, S1('inv') ? `нэхэмжилснээс ${Math.round(S1('paid') / S1('inv') * 100)}%` : '')}</div>
    ${mfCard('Сар бүрээр', rpChart(R, [['quoted', 'Үнийн санал', '#98a2b3'], ['won', 'Батлагдсан', 'var(--accent)'], ['inv', 'Нэхэмжилсэн', '#2e90fa'], ['paid', 'Төлбөр орсон', '#12b76a']]))}
    <div class="erp-list"><table><thead><tr><th>Сар</th><th class="r">Санал</th><th class="r">Саналын дүн</th><th class="r">Батлагдсан</th><th class="r">Дүн</th><th class="r">Татгалзсан</th><th class="r">Нэхэмжилсэн</th><th class="r">Төлбөр</th></tr></thead><tbody>${R.slice().reverse().map(r => `<tr><td class="num">${r.m}</td><td class="r num">${r.nQ || ''}</td><td class="r num">${r.quoted ? money(r.quoted) : ''}</td><td class="r num">${r.nW || ''}</td><td class="r num">${r.won ? money(r.won) : ''}</td><td class="r num">${r.lost || ''}</td><td class="r num">${r.inv ? money(r.inv) : ''}</td><td class="r num">${r.paid ? money(r.paid) : ''}</td></tr>`).join('')}</tbody></table></div></div>`;
  const t = el.querySelector('#rpTo'); t.addEventListener('change', () => { RP.to = t.value; rpSave(); renderRep(); });
  el.querySelector('#rpX').addEventListener('click', () => rpXlsx('Борлуулалт', ['Сар', 'Санал', 'Саналын дүн', 'Батлагдсан', 'Дүн', 'Татгалзсан', 'Нэхэмжилсэн', 'Төлбөр'], R.map(r => [r.m, r.nQ, Math.round(r.quoted), r.nW, Math.round(r.won), r.lost, Math.round(r.inv), Math.round(r.paid)])));
}
/* ===== Захиалагчаар ===== */
function rpCustPage(el) {
  const M = {}; rpJobs().forEach(r => { const k = r.customer || '— захиалагчгүй —', c = M[k] || (M[k] = { c: k, n: 0, price: 0, cost: 0, prof: 0, inv: 0, paid: 0, last: '' }); c.n++; c.price += r.price; c.cost += r.has ? r.act : r.plan; c.prof += r.profit; c.inv += r.inv; c.paid += r.paid; if (r.date > c.last) c.last = r.date; });
  const R = Object.values(M).sort((a, b) => b.price - a.price), tot = R.reduce((a, c) => a + c.price, 0) || 1, mx = Math.max(1, ...R.map(c => c.price));
  el.innerHTML = erpCP({ crumbs: [['Тайлан'], ['Захиалагчаар']], right: '<button class="btn" id="rpX">⇩ Excel</button>', row2: rpFilt(true) }) + `<div class="mf-body">
    ${R.length ? mfCard('Гэрээний дүнгээр', `<div class="rp-bars">${R.slice(0, 12).map(c => `<div class="rp-bar"><span class="n">${esc(c.c)}</span><span class="b"><i style="width:${c.price / mx * 100}%"></i></span><span class="v">${rpM(c.price)} сая · ${Math.round(c.price / tot * 100)}%</span></div>`).join('')}</div>`) : ''}
    ${R.length ? `<div class="erp-list"><table><thead><tr><th>Захиалагч</th><th class="r">Ажил</th><th class="r">Гэрээ, ₮</th><th class="r">Хувь</th><th class="r">Ашиг</th><th class="r">Margin</th><th class="r">Нэхэмжилсэн</th><th class="r">Авлага</th><th>Сүүлийн ажил</th></tr></thead><tbody>${R.map(c => `<tr><td><b>${esc(c.c)}</b></td><td class="r num">${c.n}</td><td class="r num">${money(c.price)}</td><td class="r num">${Math.round(c.price / tot * 100)}%</td><td class="r num ${c.prof < 0 ? 'rp-neg' : ''}">${money(c.prof)}</td><td class="r num">${rpPct(c.price ? c.prof / c.price * 100 : null)}</td><td class="r num">${money(c.inv)}</td><td class="r num ${c.inv - c.paid > 0 ? 'rp-neg' : ''}">${c.inv - c.paid > 0 ? money(c.inv - c.paid) : ''}</td><td class="num">${esc(c.last)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="erp-empty"><b>Энэ хугацаанд ажил алга</b></div>'}</div>`;
  rpBindFilt(el);
  el.querySelector('#rpX').addEventListener('click', () => rpXlsx('Захиалагчаар', ['Захиалагч', 'Ажил', 'Гэрээ', 'Ашиг', 'Margin %', 'Нэхэмжилсэн', 'Төлсөн', 'Авлага', 'Сүүлийн ажил'], R.map(c => [c.c, c.n, Math.round(c.price), Math.round(c.prof), c.price ? Math.round(c.prof / c.price * 1000) / 10 : '', Math.round(c.inv), Math.round(c.paid), Math.round(c.inv - c.paid), c.last])));
}
/* ===== Машины ашиглалт: өнгөрсөн 8 долоо хоногийн бодит цаг (цехийн бүртгэл) + ирэх 4 долоо хоногийн төлөвлөгөө ===== */
function rpMachPage(el) {
  const M = machines(), mon = d => { const t = new Date(d + 'T00:00:00Z'), w = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - w); return t.toISOString().slice(0, 10); };
  const W0 = mon(today()), past = []; for (let i = 7; i >= 0; i--) past.push(addDays(W0, -7 * i)); const fut = [1, 2, 3, 4].map(i => addDays(W0, 7 * i));
  const act = {}; (typeof mos === 'function' ? mos() : []).forEach(m => (m.ops || []).forEach(o => { if (!o.mach || !(+o.act > 0)) return; const d = o.done || o.d0; if (!d) return; const w = mon(d); ((act[o.mach] = act[o.mach] || {})[w] = (act[o.mach][w] || 0) + +o.act); }));
  const SC = typeof mfSchedule === 'function' ? mfSchedule() : { used: {} }, pl = id => { const u = SC.used[id] || {}, R = {}; Object.entries(u).forEach(([d, h]) => { const w = mon(d); R[w] = (R[w] || 0) + h; }); return R; };
  const cell = (h, cap, f) => { const p = cap ? h / cap * 100 : 0; return `<td class="r num lc${f ? ' fut' : ''}" style="--p:${Math.min(100, p)}%;${p > 100 ? 'color:#b42318;font-weight:700' : ''}" title="${mfH(h)} цаг / ${cap}">${h ? Math.round(p) + '%' : ''}</td>`; };
  const i0 = past.findIndex(w => Object.values(act).some(a => a[w])), PW = i0 < 0 ? past : past.slice(i0), avg = id => { const m = M.find(x => x.id === id), h = PW.reduce((a, w) => a + ((act[id] || {})[w] || 0), 0); return m && +m.cap ? h / (+m.cap * PW.length) * 100 : 0; };
  el.innerHTML = erpCP({ crumbs: [['Тайлан'], ['Машины ашиглалт']], right: '' }) + `<div class="mf-body">
    <div class="mf-info">Өнгөрсөн 8 долоо хоног — цехийн терминал / үйлдвэрлэлийн захиалгаар бүртгэгдсэн бодит цаг ÷ хүчин чадал. Ирэх 4 долоо хоног (саарал) — төлөвлөгдсөн ачаалал. Зорилт: ${M.map(m => m.oee).filter(Boolean).length ? 'ажлын байр бүрийн «Ашиглалтын зорилт»' : '75–85%'}.</div>
    <div class="erp-list"><table class="mf-util"><thead><tr><th>Ажлын байр</th><th class="r">Цаг/7х</th>${past.map(w => `<th class="r">${w.slice(5)}</th>`).join('')}<th class="r">Дундаж</th>${fut.map(w => `<th class="r fut">${w.slice(5)}</th>`).join('')}</tr></thead><tbody>
      ${M.map(m => { const pf = pl(m.id), a = avg(m.id), tg = +m.oee || 80; return `<tr><td>${esc(m.name)}</td><td class="r num">${m.cap}</td>${past.map(w => cell((act[m.id] || {})[w] || 0, +m.cap)).join('')}<td class="r num"><b class="${a && a < tg * 0.6 ? 'rp-neg' : ''}">${a ? Math.round(a) + '%' : '—'}</b></td>${fut.map(w => cell(pf[w] || 0, +m.cap, 1)).join('')}</tr>`; }).join('')}</tbody></table></div>
    ${!Object.keys(act).length ? '<div class="erp-empty"><b>Бодит цаг бүртгэгдээгүй байна</b>Үйлдвэрлэлийн захиалгын үйлдлийг цехийн терминал (утас) эсвэл компьютерээс ▶ эхлүүлж ✓ дуусгахад энд гарна.</div>' : ''}</div>`;
}
{ const _smR = setModule; setModule = function (v) { _smR(v); const on = v === 'rep', sd = $('#repSide'), mn = $('#repMain'); if (sd) sd.hidden = !on; if (mn) mn.hidden = !on; if (on) renderRep(); }; }
