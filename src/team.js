/* ================= Kh International — team & tasks (Notion / Linear style) =================
   People (operators, welders, engineers…), who owns which job / quotation, and a task board:
   tasks can be linked to a job or quotation, or be internal work (дотоод тохижуулалт, засвар, сургалт…).
   Views: Board (drag between columns) · List (grouped, Linear-like) · «Хэн юу хийж байна» (workload). */
const ROLES = ['Менежер', 'Инженер', 'Технологич', 'Оператор (лазер)', 'Оператор (нугалах)', 'Гагнуурчин', 'Слесарь', 'Токарь', 'Будагчин', 'Чанар (QC)', 'Агуулах', 'Худалдан авалт', 'Туслах'];
const TSTAT = [['todo', 'Хийх', '#98a2b3'], ['doing', 'Хийгдэж буй', '#3e63dd'], ['review', 'Шалгах', '#f79009'], ['done', 'Дууссан', '#12b76a']];
const TPRIO = [['urgent', 'Яаралтай', '#f04438'], ['high', 'Өндөр', '#f79009'], ['med', 'Дунд', '#3e63dd'], ['low', 'Бага', '#98a2b3']];
const TTYPE = [['job', 'Ажил'], ['quote', 'Үнийн санал'], ['internal', 'Дотоод ажил'], ['other', 'Бусад']];
const TM = { tab: 'tasks', view: 'board', who: '', type: '', q: '', sel: null, psel: null };
function people() {
  if (!Array.isArray(S.people)) {
    S.people = [];
    (S.iso && S.iso.operators || '').split(',').map(x => x.trim()).filter(Boolean).forEach(n => S.people.push({ id: uid(), name: n, role: 'Оператор (лазер)', phone: '', active: true }));
    save();
  }
  return S.people;
}
const tasks = () => (Array.isArray(S.tasks) ? S.tasks : (S.tasks = []));
const pName = id => { const p = people().find(x => x.id === id); return p ? p.name : ''; };
const initials = n => String(n || '?').split(/\s+/).map(w => w.replace(/[^\p{L}]/gu, '')[0] || '').join('').slice(0, 2).toUpperCase() || '?';
const avCol = n => { let h = 0; for (const c of String(n)) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 55% 45%)`; };
const avatar = (id, sz = 24) => { const n = pName(id); return n ? `<span class="av" style="width:${sz}px;height:${sz}px;background:${avCol(n)};font-size:${Math.round(sz * .42)}px" title="${esc(n)}">${esc(initials(n))}</span>` : `<span class="av none" style="width:${sz}px;height:${sz}px" title="Хариуцагчгүй">?</span>`; };
const peopleOpts = (sel, empty = '— хариуцагч —') => `<option value="">${empty}</option>` + people().filter(p => p.active !== false || p.id === sel).map(p => `<option value="${p.id}"${p.id === sel ? ' selected' : ''}>${esc(p.name)}${p.role ? ' · ' + esc(p.role) : ''}</option>`).join('');
const jobLabel = j => j ? `${j.kind === 'quote' ? (j.quote && j.quote.no) || j.no : j.no}${j.title ? ' · ' + j.title : ''}` : '';
function newTask(o = {}) { const t = { id: uid(), title: '', desc: '', status: 'todo', prio: 'med', assignee: S.me || '', due: '', jobId: '', type: 'internal', created: today(), done: '', ...o }; tasks().unshift(t); save(); return t; }

/* ---------- side ---------- */
function renderTeamSide() {
  $$('[data-ttab]').forEach(b => b.classList.toggle('on', b.dataset.ttab === TM.tab));
  $('#ttab-tasks').hidden = TM.tab !== 'tasks'; $('#ttab-people').hidden = TM.tab !== 'people';
  const P = people(), T = tasks(), open = T.filter(t => t.status !== 'done');
  $('#tmMe').innerHTML = peopleOpts(S.me, '— би хэн бэ? —');
  $('#tmWho').innerHTML = `<div class="jitem${!TM.who ? ' on' : ''}" data-who=""><span class="no" style="font-family:inherit">Бүх хүн</span><span class="pill">${open.length}</span></div>` +
    (S.me ? `<div class="jitem${TM.who === S.me ? ' on' : ''}" data-who="${S.me}"><span class="no" style="font-family:inherit">★ Миний даалгавар</span><span class="pill">${open.filter(t => t.assignee === S.me).length}</span></div>` : '') +
    `<div class="jitem${TM.who === '-' ? ' on' : ''}" data-who="-"><span class="no" style="font-family:inherit">Хариуцагчгүй</span><span class="pill">${open.filter(t => !t.assignee).length}</span></div>` +
    TTYPE.map(([k, n]) => `<div class="jitem${TM.type === k ? ' on' : ''}" data-ttype="${k}"><span class="no" style="font-family:inherit">${n}</span><span class="pill">${open.filter(t => t.type === k).length}</span></div>`).join('');
  $('#tmPeople').innerHTML = P.length ? P.map(p => { const n = open.filter(t => t.assignee === p.id).length, jb = S.jobs.filter(j => j.owner === p.id && !['done', 'given'].includes(j.status) && j.qst !== 'lost').length; return `<div class="jitem${TM.psel === p.id ? ' on' : ''}" data-pid="${p.id}" style="grid-template-columns:auto minmax(0,1fr) auto;align-items:center">${avatar(p.id, 30)}<span><b>${esc(p.name)}</b><br><small class="muted">${esc(p.role || '')}${p.active === false ? ' · идэвхгүй' : ''}</small></span><span class="pill">${n} даалгавар · ${jb} ажил</span></div>`; }).join('') : '<p class="note">Хүн нэмээгүй байна. «+ Хүн нэмэх».</p>';
}
(() => {
  $$('[data-ttab]').forEach(b => b.addEventListener('click', () => { TM.tab = b.dataset.ttab; renderTeam(); }));
  $('#tmMe').addEventListener('change', e => { S.me = e.target.value; save(); renderTeam(); });
  $('#tmWho').addEventListener('click', e => { const w = e.target.closest('[data-who]'), ty = e.target.closest('[data-ttype]'); if (w) { TM.who = w.dataset.who; TM.type = ''; } if (ty) { TM.type = TM.type === ty.dataset.ttype ? '' : ty.dataset.ttype; } renderTeam(); });
  $('#tmPeople').addEventListener('click', e => { const it = e.target.closest('[data-pid]'); if (it) { TM.psel = it.dataset.pid; renderTeam(); } });
  $('#tmAddP').addEventListener('click', () => { const p = { id: uid(), name: 'Шинэ ажилтан', role: 'Оператор (лазер)', phone: '', active: true }; people().push(p); TM.psel = p.id; save(); renderTeam(); setTimeout(() => { const i = $('#pp_name'); if (i) { i.focus(); i.select(); } }, 50); });
  $('#tmAddT').addEventListener('click', () => { const t = newTask({ assignee: TM.who && TM.who !== '-' ? TM.who : (S.me || ''), type: TM.type || 'internal' }); TM.sel = t.id; renderTeam(); setTimeout(() => { const i = $('#tk_title'); if (i) i.focus(); }, 50); });
})();

/* ---------- main ---------- */
function renderTeam() { people(); renderTeamSide(); const el = $('#teamMain'); if (TM.tab === 'people') renderPeopleMain(el); else renderTasksMain(el); }
function taskFilter() {
  const q = (TM.q || '').toLowerCase();
  return tasks().filter(t => (!TM.who || (TM.who === '-' ? !t.assignee : t.assignee === TM.who)) && (!TM.type || t.type === TM.type) && (!q || [t.title, t.desc, pName(t.assignee), jobLabel(findJob(t.jobId))].join(' ').toLowerCase().includes(q)));
}
const prioDot = k => { const p = TPRIO.find(x => x[0] === k) || TPRIO[2]; return `<span class="pdot" style="background:${p[2]}" title="${p[1]}"></span>`; };
const dueTag = t => { if (!t.due) return ''; const d = daysLeft(t.due), late = d < 0 && t.status !== 'done'; return `<span class="tdue${late ? ' late' : d <= 2 && t.status !== 'done' ? ' soon' : ''}">${esc(t.due.slice(5))}</span>`; };
function taskCard(t) {
  const j = findJob(t.jobId);
  return `<div class="tcard${TM.sel === t.id ? ' on' : ''}" draggable="true" data-tid="${t.id}"><div class="tt">${prioDot(t.prio)}<b>${esc(t.title || '(гарчиггүй)')}</b></div>
    ${j ? `<div class="tj">${esc(jobLabel(j))}</div>` : `<div class="tj muted">${(TTYPE.find(x => x[0] === t.type) || TTYPE[2])[1]}</div>`}
    ${(t.tags || []).length ? `<div class="ttags">${t.tags.map(g => `<span class="tag" style="--h:${avCol(g)}">${esc(g)}</span>`).join('')}</div>` : ''}
    <div class="tf">${avatar(t.assignee, 22)}${(t.sub || []).length ? `<span class="muted mono" style="font-size:11.5px">☑ ${t.sub.filter(x => x.done).length}/${t.sub.length}</span>` : ''}${(t.comments || []).length ? `<span class="muted mono" style="font-size:11.5px">💬 ${t.comments.length}</span>` : ''}<span class="sp" style="flex:1"></span>${dueTag(t)}</div></div>`;
}
function renderTasksMain(el) {
  const L = taskFilter(), who = TM.who === '-' ? 'Хариуцагчгүй' : TM.who ? pName(TM.who) : 'Бүх хүн';
  const views = [['board', 'Самбар'], ['table', 'Хүснэгт'], ['list', 'Жагсаалт'], ['cal', 'Календарь'], ['load', 'Хэн юу хийж байна']];
  let body = '';
  if (TM.view === 'board') body = `<div class="kanban">${TSTAT.map(([k, n, c]) => { const a = L.filter(t => t.status === k); return `<div class="kcol" data-col="${k}"><div class="kh"><i style="background:${c}"></i>${n}<span class="muted mono">${a.length}</span><button class="linkbtn" data-kadd="${k}" title="Энэ баганад нэмэх">+</button></div><div class="kl">${a.map(taskCard).join('')}</div></div>`; }).join('')}</div>`;
  else if (TM.view === 'list') body = TSTAT.map(([k, n, c]) => { const a = L.filter(t => t.status === k).sort((x, y) => TPRIO.findIndex(p => p[0] === x.prio) - TPRIO.findIndex(p => p[0] === y.prio) || String(x.due || '9').localeCompare(String(y.due || '9'))); return a.length ? `<div class="jcard"><div class="bcard-h"><i class="sdot" style="background:${c}"></i>${n} <span class="pill">${a.length}</span></div><div class="tlist">${a.map(t => { const j = findJob(t.jobId); return `<div class="trow${TM.sel === t.id ? ' on' : ''}" data-tid="${t.id}">${prioDot(t.prio)}<b>${esc(t.title || '(гарчиггүй)')}</b><span class="muted">${esc(j ? jobLabel(j) : (TTYPE.find(x => x[0] === t.type) || TTYPE[2])[1])}</span><span class="sp" style="flex:1"></span>${dueTag(t)}${avatar(t.assignee, 22)}</div>`; }).join('')}</div></div>` : ''; }).join('') || '<p class="note">Даалгавар алга.</p>';
  else if (TM.view === 'table') body = taskTableHTML(L);
  else if (TM.view === 'cal') body = taskCalHTML(L);
  else body = workloadHTML();
  el.innerHTML = `<div class="dhead"><div><h2>Даалгавар</h2><p class="muted">${esc(who)}${TM.type ? ' · ' + TTYPE.find(x => x[0] === TM.type)[1] : ''} · ${L.filter(t => t.status !== 'done').length} нээлттэй</p></div><span class="sp" style="flex:1"></span>
      <input class="inp" id="tmQ" placeholder="Хайх…" value="${esc(TM.q)}" style="width:200px"><div class="seg">${views.map(([k, n]) => `<button data-tview="${k}" class="${TM.view === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
    <div class="tmwrap${TM.sel ? ' withd' : ''}"><div class="tmbody">${body}</div>${TM.sel ? taskDetailHTML(tasks().find(t => t.id === TM.sel)) : ''}</div>`;
  bindTasksMain(el);
}
/* Notion-style database table: inline-editable properties, sortable columns */
function taskTableHTML(L) {
  const k = TM.sort || 'due', dir = TM.sdir || 1, val = t => k === 'prio' ? TPRIO.findIndex(p => p[0] === t.prio) : k === 'status' ? TSTAT.findIndex(p => p[0] === t.status) : k === 'assignee' ? pName(t.assignee) : k === 'job' ? jobLabel(findJob(t.jobId)) : String(t[k] || (k === 'due' ? '9999' : ''));
  const R = L.slice().sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * dir);
  const H = [['title', 'Нэр'], ['status', 'Төлөв'], ['prio', 'Ач холбогдол'], ['assignee', 'Хариуцагч'], ['due', 'Огноо'], ['job', 'Холбоос'], ['tags', 'Шошго']];
  return `<div class="jcard"><div class="tblwrap" style="border:0"><table class="dt ttable"><thead><tr>${H.map(([c, n]) => `<th data-sort="${c}" style="cursor:pointer">${n}${k === c ? (dir > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('')}</tr></thead><tbody>
    ${R.map(t => `<tr data-trow="${t.id}"><td><input class="inp cell" data-tc="title" value="${esc(t.title)}"></td>
      <td><select class="inp cell" data-tc="status">${TSTAT.map(([v, n]) => `<option value="${v}"${t.status === v ? ' selected' : ''}>${n}</option>`).join('')}</select></td>
      <td><select class="inp cell" data-tc="prio">${TPRIO.map(([v, n]) => `<option value="${v}"${t.prio === v ? ' selected' : ''}>${n}</option>`).join('')}</select></td>
      <td><select class="inp cell" data-tc="assignee">${peopleOpts(t.assignee, '—')}</select></td>
      <td><input class="inp cell" type="date" data-tc="due" value="${esc(t.due)}"></td>
      <td class="muted" style="font-size:12.5px">${esc(jobLabel(findJob(t.jobId)) || (TTYPE.find(x => x[0] === t.type) || TTYPE[2])[1])}</td>
      <td>${(t.tags || []).map(g => `<span class="tag" style="--h:${avCol(g)}">${esc(g)}</span>`).join('')} <button class="linkbtn" data-tid="${t.id}">нээх</button></td></tr>`).join('')}
    <tr><td colspan="7"><button class="linkbtn" id="ttNew">+ Шинэ мөр</button></td></tr></tbody></table></div></div>`;
}
/* month calendar by due date */
function taskCalHTML(L) {
  const base = TM.month || today().slice(0, 7), d0 = new Date(base + '-01T00:00:00'), y = d0.getFullYear(), m = d0.getMonth(), first = (d0.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
  const cells = []; for (let i = 0; i < first; i++) cells.push(''); for (let d = 1; d <= days; d++) cells.push(`${base}-${String(d).padStart(2, '0')}`); while (cells.length % 7) cells.push('');
  const shift = n => { const t = new Date(y, m + n, 1); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`; };
  return `<div class="jcard"><div class="bcard-h"><button class="btn sm ghost" data-mon="${shift(-1)}">‹</button><b style="min-width:140px;text-align:center">${y} · ${m + 1}-р сар</b><button class="btn sm ghost" data-mon="${shift(1)}">›</button><button class="btn sm ghost" data-mon="${today().slice(0, 7)}">Өнөөдөр</button><span class="sp"></span><span class="muted" style="font-weight:400;font-size:12px">Өдөр дээр давхар дарж даалгавар нэмнэ</span></div>
    <div class="tcal">${['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'].map(d => `<div class="tch">${d}</div>`).join('')}${cells.map(c => `<div class="tcd${c === today() ? ' now' : ''}${!c ? ' blank' : ''}" data-day="${c}">${c ? `<span class="tdn">${+c.slice(8)}</span>${L.filter(t => t.due === c).map(t => `<div class="tce" data-tid="${t.id}" style="border-left-color:${(TSTAT.find(x => x[0] === t.status) || TSTAT[0])[2]}">${esc(t.title || '(гарчиггүй)')}</div>`).join('')}` : ''}</div>`).join('')}</div></div>`;
}
function workloadHTML() {
  const P = people().filter(p => p.active !== false), T = tasks(), act = S.jobs.filter(j => !['done', 'given'].includes(j.status) && j.qst !== 'lost');
  const card = (id, name, role) => {
    const tk = T.filter(t => (id ? t.assignee === id : !t.assignee) && t.status !== 'done'), jb = act.filter(j => (id ? j.owner === id : false));
    const doing = tk.filter(t => t.status === 'doing');
    return `<div class="jcard wl"><div class="bcard-h">${id ? avatar(id, 30) : '<span class="av none" style="width:30px;height:30px">?</span>'}<span><b>${esc(name)}</b><br><small class="muted" style="font-weight:400">${esc(role || '')}</small></span><span class="sp"></span><span class="pill">${tk.length}</span></div><div class="jbody">
      ${doing.length ? `<div class="wlnow">▶ Одоо: ${doing.map(t => `<a data-tid="${t.id}">${esc(t.title)}</a>`).join(', ')}</div>` : '<div class="muted" style="font-size:12.5px">Одоо хийж буй даалгавар алга</div>'}
      ${jb.length ? `<div class="wlj"><small class="muted">Хариуцсан ажил / санал</small>${jb.map(j => `<a class="wlji" data-job="${j.id}">${esc(jobLabel(j))} <span class="pill ${j.kind === 'quote' ? 'qst-' + (j.qst || 'draft') : 'st-' + j.status}">${j.kind === 'quote' ? qstName(j.qst) : jstName(j.status)}</span></a>`).join('')}</div>` : ''}
      ${tk.filter(t => t.status !== 'doing').slice(0, 6).map(t => `<div class="trow" data-tid="${t.id}">${prioDot(t.prio)}<span>${esc(t.title)}</span><span class="sp" style="flex:1"></span>${dueTag(t)}</div>`).join('')}
    </div></div>`;
  };
  return `<div class="wlgrid">${P.map(p => card(p.id, p.name, p.role)).join('')}${T.some(t => !t.assignee && t.status !== 'done') ? card('', 'Хариуцагчгүй', '') : ''}</div>`;
}
function taskDetailHTML(t) {
  if (!t) return '';
  const J = S.jobs.filter(j => j.qst !== 'lost');
  return `<aside class="tdetail jcard"><div class="bcard-h">Даалгавар <span class="sp"></span><button class="btn sm ghost" data-tdel="${t.id}">Устгах</button><button class="btn sm ghost" data-tclose>✕</button></div><div class="jbody">
    <input id="tk_title" class="inp ttl" value="${esc(t.title)}" placeholder="Юу хийх вэ?">
    <div class="jgrid">
      <label class="fld">Төлөв<select id="tk_status">${TSTAT.map(([k, n]) => `<option value="${k}"${t.status === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="fld">Ач холбогдол<select id="tk_prio">${TPRIO.map(([k, n]) => `<option value="${k}"${t.prio === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="fld">Хариуцагч<select id="tk_assignee">${peopleOpts(t.assignee)}</select></label>
      <label class="fld">Дуусах огноо<input id="tk_due" type="date" value="${esc(t.due)}"></label>
      <label class="fld">Төрөл<select id="tk_type">${TTYPE.map(([k, n]) => `<option value="${k}"${t.type === k ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="fld">Холбоотой ажил / санал<select id="tk_jobId"><option value="">—</option>${J.map(j => `<option value="${j.id}"${t.jobId === j.id ? ' selected' : ''}>${esc(jobLabel(j))}</option>`).join('')}</select></label>
    </div>
    <label class="fld">Шошго (таслалаар)<input id="tk_tags" value="${esc((t.tags || []).join(', '))}" placeholder="жишээ: засвар, яаралтай, худалдан авалт" list="dl-ttags"></label><datalist id="dl-ttags">${[...new Set(tasks().flatMap(x => x.tags || []))].map(g => `<option value="${esc(g)}">`).join('')}</datalist>
    <div class="fld">Дэд даалгавар ${(t.sub || []).length ? `<span class="muted">${t.sub.filter(x => x.done).length}/${t.sub.length}</span>` : ''}<div class="subl">${(t.sub || []).map((x, k) => `<div class="subr"><input type="checkbox" data-sd="${k}"${x.done ? ' checked' : ''}><input class="inp" data-se="${k}" value="${esc(x.t)}"${x.done ? ' style="text-decoration:line-through;color:var(--ink-3)"' : ''}><button class="linkbtn" data-sx="${k}">✕</button></div>`).join('')}<input class="inp" id="tk_subnew" placeholder="+ Дэд даалгавар нэмэх (Enter)"></div></div>
    <label class="fld">Тайлбар<textarea id="tk_desc" class="inp" rows="6" placeholder="Дэлгэрэнгүй, шалгах зүйлс…">${esc(t.desc)}</textarea></label>
    <div class="fld">Сэтгэгдэл<div class="cmts">${(t.comments || []).map(c => `<div class="cmt">${avatar(c.who, 22)}<div><b>${esc(pName(c.who) || 'Би')}</b> <span class="muted mono" style="font-size:11px">${esc(c.at)}</span><div>${esc(c.text)}</div></div></div>`).join('')}<div class="cmtadd"><input class="inp" id="tk_cmt" placeholder="Сэтгэгдэл бичих… (Enter)"></div></div></div>
    <p class="note">Үүсгэсэн ${esc(t.created)}${t.done ? ' · дууссан ' + esc(t.done) : ''}</p>
  </div></aside>`;
}
function bindTasksMain(el) {
  const re = () => renderTeam();
  const q = el.querySelector('#tmQ'); q.addEventListener('input', () => { TM.q = q.value; clearTimeout(q._t); q._t = setTimeout(() => { re(); const n = $('#tmQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); });
  el.querySelectorAll('[data-tview]').forEach(b => b.addEventListener('click', () => { TM.view = b.dataset.tview; re(); }));
  el.querySelectorAll('[data-tid]').forEach(c => c.addEventListener('click', e => { e.stopPropagation(); TM.sel = c.dataset.tid; re(); }));
  el.querySelectorAll('[data-job]').forEach(a => a.addEventListener('click', () => openJobFrom(a.dataset.job)));
  el.querySelectorAll('[data-sort]').forEach(h => h.addEventListener('click', () => { if (TM.sort === h.dataset.sort) TM.sdir = -(TM.sdir || 1); else { TM.sort = h.dataset.sort; TM.sdir = 1; } re(); }));
  el.querySelectorAll('[data-tc]').forEach(c => { c.addEventListener('click', e => e.stopPropagation()); c.addEventListener('change', () => { const t = tasks().find(x => x.id === c.closest('[data-trow]').dataset.trow); if (!t) return; if (c.dataset.tc === 'status') setTaskStatus(t, c.value); else t[c.dataset.tc] = c.value; save(); if (c.dataset.tc !== 'title') re(); }); });
  { const n = el.querySelector('#ttNew'); if (n) n.addEventListener('click', () => { newTask({ assignee: TM.who && TM.who !== '-' ? TM.who : (S.me || ''), type: TM.type || 'internal' }); re(); setTimeout(() => { const i = el.querySelector('[data-tc="title"]'); if (i) i.focus(); }, 50); }); }
  el.querySelectorAll('[data-mon]').forEach(b => b.addEventListener('click', () => { TM.month = b.dataset.mon; re(); }));
  el.querySelectorAll('.tcd[data-day]').forEach(c => c.addEventListener('dblclick', () => { if (!c.dataset.day) return; const t = newTask({ due: c.dataset.day, assignee: TM.who && TM.who !== '-' ? TM.who : (S.me || '') }); TM.sel = t.id; re(); setTimeout(() => { const i = $('#tk_title'); if (i) i.focus(); }, 50); }));
  el.querySelectorAll('[data-kadd]').forEach(b => b.addEventListener('click', () => { const t = newTask({ status: b.dataset.kadd, assignee: TM.who && TM.who !== '-' ? TM.who : (S.me || ''), type: TM.type || 'internal' }); TM.sel = t.id; re(); setTimeout(() => { const i = $('#tk_title'); if (i) i.focus(); }, 50); }));
  // drag & drop between columns
  el.querySelectorAll('.tcard').forEach(c => c.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', c.dataset.tid); c.classList.add('drag'); }));
  el.querySelectorAll('.kcol').forEach(col => { col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('over'); }); col.addEventListener('dragleave', () => col.classList.remove('over')); col.addEventListener('drop', e => { e.preventDefault(); const t = tasks().find(x => x.id === e.dataTransfer.getData('text/plain')); if (t) setTaskStatus(t, col.dataset.col); re(); }); });
  const d = el.querySelector('.tdetail'); if (!d) return; const t = tasks().find(x => x.id === TM.sel);
  ['title', 'status', 'prio', 'assignee', 'due', 'type', 'jobId', 'desc'].forEach(k => { const i = d.querySelector('#tk_' + k); if (i) i.addEventListener('change', () => { if (k === 'status') setTaskStatus(t, i.value); else t[k] = i.value; if (k === 'jobId' && t.jobId) { const j = findJob(t.jobId); t.type = j && j.kind === 'quote' ? 'quote' : 'job'; } save(); re(); }); });
  d.querySelector('#tk_tags').addEventListener('change', e => { t.tags = e.target.value.split(',').map(x => x.trim()).filter(Boolean); save(); re(); });
  t.sub = t.sub || []; t.comments = t.comments || [];
  d.querySelectorAll('[data-sd]').forEach(c => c.addEventListener('change', () => { t.sub[+c.dataset.sd].done = c.checked; save(); re(); }));
  d.querySelectorAll('[data-se]').forEach(c => c.addEventListener('change', () => { t.sub[+c.dataset.se].t = c.value; save(); }));
  d.querySelectorAll('[data-sx]').forEach(c => c.addEventListener('click', () => { t.sub.splice(+c.dataset.sx, 1); save(); re(); }));
  const sn = d.querySelector('#tk_subnew'); sn.addEventListener('keydown', e => { if (e.key === 'Enter' && sn.value.trim()) { t.sub.push({ t: sn.value.trim(), done: false }); save(); re(); setTimeout(() => { const n = $('#tk_subnew'); if (n) n.focus(); }, 30); } });
  const cm = d.querySelector('#tk_cmt'); cm.addEventListener('keydown', e => { if (e.key === 'Enter' && cm.value.trim()) { t.comments.push({ who: S.me || '', at: new Date().toISOString().slice(0, 16).replace('T', ' '), text: cm.value.trim() }); save(); re(); } });
  d.querySelector('[data-tclose]').addEventListener('click', () => { TM.sel = null; re(); });
  d.querySelector('[data-tdel]').addEventListener('click', () => { if (!confirm('Энэ даалгаврыг устгах уу?')) return; S.tasks = tasks().filter(x => x !== t); TM.sel = null; save(); re(); });
}
function setTaskStatus(t, st) { if (t.status === st) return; t.status = st; t.done = st === 'done' ? today() : ''; const j = findJob(t.jobId); if (j) jobLog(`Даалгавар «${t.title}» → ${TSTAT.find(x => x[0] === st)[1]}${t.assignee ? ' (' + pName(t.assignee) + ')' : ''}`, j); save(); }
function openJobFrom(id) { const j = findJob(id); if (!j) return; J.sel = id; J.dash = false; J.tab = 'jobs'; J.sub = j.kind === 'quote' ? 'quote' : 'main'; setModule('jobs'); }

/* ---------- people ---------- */
function renderPeopleMain(el) {
  const p = people().find(x => x.id === TM.psel);
  if (!p) { el.innerHTML = `<div class="dhead"><div><h2>Хүмүүс</h2><p class="muted">Оператор, ажилчид, инженерүүд — ажил, үнийн санал, даалгаварт хариуцагчаар сонгогдоно</p></div></div>${workloadHTML()}`; bindTasksMain2(el); return; }
  const T = tasks().filter(t => t.assignee === p.id), JB = S.jobs.filter(j => j.owner === p.id);
  el.innerHTML = `<div class="dhead"><div style="display:flex;gap:12px;align-items:center">${avatar(p.id, 44)}<div><h2>${esc(p.name)}</h2><p class="muted">${esc(p.role || '')}</p></div></div><span class="sp" style="flex:1"></span><button class="btn ghost" id="ppDel">Устгах</button></div>
    <div class="jcard"><div class="jbody"><div class="jgrid">${fldIn('pp_name', 'Нэр', p.name)}<label class="fld">Албан тушаал / үүрэг<input id="pp_role" list="dl-roles" value="${esc(p.role || '')}"></label>${fldIn('pp_phone', 'Утас', p.phone)}<label class="check" style="align-self:end"><input type="checkbox" id="pp_active"${p.active !== false ? ' checked' : ''}><span>Идэвхтэй</span></label></div>
      <datalist id="dl-roles">${ROLES.map(r => `<option value="${esc(r)}">`).join('')}</datalist></div></div>
    <div class="dgrid"><div class="jcard"><div class="bcard-h">Даалгавар <span class="pill">${T.filter(t => t.status !== 'done').length} нээлттэй</span><span class="sp"></span><button class="btn sm" id="ppAddT">+ Даалгавар</button></div><div class="tlist">${T.map(t => `<div class="trow" data-tid="${t.id}">${prioDot(t.prio)}<span>${esc(t.title)}</span><span class="pill">${TSTAT.find(x => x[0] === t.status)[1]}</span><span class="sp" style="flex:1"></span>${dueTag(t)}</div>`).join('') || '<p class="note" style="padding:12px">—</p>'}</div></div>
      <div class="jcard"><div class="bcard-h">Хариуцсан ажил, үнийн санал <span class="pill">${JB.length}</span></div><div class="tlist">${JB.map(j => `<div class="trow" data-job="${j.id}"><b>${esc(jobLabel(j))}</b><span class="sp" style="flex:1"></span><span class="pill ${j.kind === 'quote' ? 'qst-' + (j.qst || 'draft') : 'st-' + j.status}">${j.kind === 'quote' ? qstName(j.qst) : jstName(j.status)}</span></div>`).join('') || '<p class="note" style="padding:12px">Ажил, үнийн саналын «Хариуцагч» талбараас сонгоно.</p>'}</div></div></div>`;
  [['name', 'pp_name'], ['role', 'pp_role'], ['phone', 'pp_phone']].forEach(([k, id]) => el.querySelector('#' + id).addEventListener('change', e => { p[k] = e.target.value.trim(); save(); renderTeam(); }));
  el.querySelector('#pp_active').addEventListener('change', e => { p.active = e.target.checked; save(); renderTeam(); });
  el.querySelector('#ppDel').addEventListener('click', () => { if (!confirm(`«${p.name}»-г устгах уу? Түүний даалгавар хариуцагчгүй болно.`)) return; tasks().forEach(t => { if (t.assignee === p.id) t.assignee = ''; }); S.jobs.forEach(j => { if (j.owner === p.id) j.owner = ''; }); S.people = people().filter(x => x !== p); TM.psel = null; save(); renderTeam(); });
  el.querySelector('#ppAddT').addEventListener('click', () => { const t = newTask({ assignee: p.id }); TM.sel = t.id; TM.tab = 'tasks'; TM.who = p.id; renderTeam(); });
  bindTasksMain2(el);
}
function bindTasksMain2(el) {
  el.querySelectorAll('[data-tid]').forEach(c => c.addEventListener('click', () => { TM.sel = c.dataset.tid; TM.tab = 'tasks'; renderTeam(); }));
  el.querySelectorAll('[data-job]').forEach(a => a.addEventListener('click', () => openJobFrom(a.dataset.job)));
}

/* ---------- inside a job / quote: owner + its tasks ---------- */
function jobTasksHTML(job) {
  const T = tasks().filter(t => t.jobId === job.id);
  return `<div class="jcard" data-v="main"><div class="bcard-h">Даалгавар <span class="pill">${T.filter(t => t.status !== 'done').length} нээлттэй</span><span class="sp"></span><button class="btn sm" id="jtAdd">+ Даалгавар</button></div><div class="jbody">
    ${T.length ? `<div class="tlist">${T.map(t => `<div class="trow" data-tid="${t.id}"><input type="checkbox" data-tdone="${t.id}"${t.status === 'done' ? ' checked' : ''}>${prioDot(t.prio)}<span class="${t.status === 'done' ? 'muted' : ''}" style="${t.status === 'done' ? 'text-decoration:line-through' : ''}">${esc(t.title || '(гарчиггүй)')}</span><span class="pill">${TSTAT.find(x => x[0] === t.status)[1]}</span><span class="sp" style="flex:1"></span>${dueTag(t)}${avatar(t.assignee, 22)}</div>`).join('')}</div>` : '<p class="note">Энэ ажилд хэн юу хийхийг даалгавар болгон нэмнэ (зүсэлт — оператор, гагнуур — гагнуурчин, QC…).</p>'}
  </div></div>`;
}
function bindJobTasks(el, job) {
  const o = el.querySelector('#jf_owner'); if (o) o.addEventListener('change', () => { job.owner = o.value; jobLog('Хариуцагч: ' + (pName(job.owner) || '—'), job); save(); renderJList(); });
  const a = el.querySelector('#jtAdd'); if (a) a.addEventListener('click', () => { const title = prompt('Даалгавар (юу хийх вэ?):', ''); if (!title) return; const who = people().length ? prompt('Хэн хийх вэ? (нэр, хоосон бол дараа сонгоно)\n' + people().map(p => p.name).join(', '), '') : ''; const p = who && people().find(x => x.name.toLowerCase().startsWith(who.toLowerCase())); newTask({ title, jobId: job.id, type: job.kind === 'quote' ? 'quote' : 'job', assignee: p ? p.id : '' }); jobLog('Даалгавар нэмсэн: ' + title, job); renderJobMain(); });
  el.querySelectorAll('[data-tdone]').forEach(c => c.addEventListener('click', e => { e.stopPropagation(); const t = tasks().find(x => x.id === c.dataset.tdone); if (t) { setTaskStatus(t, c.checked ? 'done' : 'todo'); renderJobMain(); } }));
  el.querySelectorAll('.jcard [data-tid]').forEach(r => r.addEventListener('click', e => { if (e.target.matches('input')) return; TM.sel = r.dataset.tid; TM.tab = 'tasks'; setModule('team'); }));
}
