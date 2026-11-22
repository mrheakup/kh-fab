/* ================= Миний TODO ба тэмдэглэл — хувийн, зөвхөн энэ компьютерт (синк хийгдэхгүй) =================
   Хадгалалт: localStorage 'kh-mine' (Electron-ий хэрэглэгчийн фолдерт байнга хадгалагдана). Нүүр хуудас болон навбарын «Миний жагсаалт» самбарт. */
const MINE = (() => { let m = {}; try { m = JSON.parse(localStorage.getItem('kh-mine') || '{}'); } catch (e) { } return Object.assign({ todos: [], notes: [], f: 'today', nq: '' }, m); })();
const mineSave = () => { try { localStorage.setItem('kh-mine', JSON.stringify(MINE)); } catch (e) { toast('⚠ TODO хадгалж чадсангүй'); } mineBadge(); };
const NOTE_C = [['#fff7d6', 'Шар'], ['#e3f2ff', 'Цэнхэр'], ['#e6f6ec', 'Ногоон'], ['#fde8ec', 'Ягаан'], ['#f1eaf0', 'Нил'], ['#ffffff', 'Цагаан']];
const tdState = t => t.done ? 'done' : t.due && t.due < today() ? 'late' : t.due === today() ? 'today' : t.due && t.due <= addDays(today(), 7) ? 'week' : 'later';
const tdSort = (a, b) => (a.done - b.done) || ((b.star ? 1 : 0) - (a.star ? 1 : 0)) || String(a.due || '9999').localeCompare(String(b.due || '9999')) || (a.ord || 0) - (b.ord || 0);
function mineTodos(f) {
  const T = MINE.todos;
  if (f === 'today') return T.filter(t => !t.done && (t.star || !t.due || t.due <= today())).sort(tdSort);
  if (f === 'week') return T.filter(t => !t.done && t.due && t.due <= addDays(today(), 7)).sort(tdSort);
  if (f === 'done') return T.filter(t => t.done).sort((a, b) => String(b.doneAt || '').localeCompare(String(a.doneAt || '')));
  return T.filter(t => !t.done).sort(tdSort);
}
function mineAdd(txt, due, job) {
  let t = String(txt || '').trim(); if (!t) return null; let star = false;
  if (/^!\s*/.test(t) || /\s!$/.test(t)) { star = true; t = t.replace(/^!\s*|\s!$/g, '').trim(); }
  /* quick dates: «маргааш», «өнөөдөр», «+3» (өдөр) */
  if (!due) { const m = t.match(/\s(өнөөдөр|маргааш|нөгөөдөр|\+(\d{1,3}))$/i); if (m) { due = /өнөөдөр/i.test(m[1]) ? today() : /нөгөөдөр/i.test(m[1]) ? addDays(today(), 2) : /маргааш/i.test(m[1]) ? addDays(today(), 1) : addDays(today(), +m[2]); t = t.slice(0, m.index).trim(); } }
  const o = { id: uid(), t, done: false, due: due || '', star, job: job || '', created: today(), ord: Date.now() }; MINE.todos.unshift(o); mineSave(); return o;
}
const mineLate = () => MINE.todos.filter(t => !t.done && t.due && t.due <= today()).length;
function mineBadge() { const b = $('#btnMine'); if (!b) return; const n = MINE.todos.filter(t => !t.done && (t.star || (t.due && t.due <= today()))).length, l = MINE.todos.filter(t => !t.done && t.due && t.due < today()).length; const s = b.querySelector('.cnt'); if (s) { s.textContent = n || ''; s.hidden = !n; s.classList.toggle('bad', !!l); } }

/* ---------- TODO list ---------- */
function mineTodoHTML(opt = {}) {
  const f = MINE.f || 'today', L = mineTodos(f), all = MINE.todos, open = all.filter(t => !t.done);
  const wk = addDays(today(), -6), doneWk = all.filter(t => t.done && t.doneAt && t.doneAt >= wk).length, late = open.filter(t => t.due && t.due < today()).length;
  const jobOpts = (typeof topJobs === 'function' ? topJobs() : []).filter(j => !isQ(j) && !['done', 'given'].includes(j.status)).slice(0, 200);
  const chip = t => { const s = tdState(t); if (!t.due) return ''; const lbl = t.due === today() ? 'Өнөөдөр' : t.due === addDays(today(), 1) ? 'Маргааш' : s === 'late' ? `${t.due.slice(5)} · хэтэрсэн` : t.due.slice(5); return `<span class="td-due s-${s}">${lbl}</span>`; };
  const row = t => { const j = t.job && findJob(t.job); return `<div class="td-row${t.done ? ' done' : ''}" data-td="${t.id}">
      <button class="td-chk" data-tdx="done" title="${t.done ? 'Буцаах' : 'Дууссан'}">${t.done ? '✓' : ''}</button>
      <div class="td-main"><span class="td-t" data-tdx="edit" title="Засах бол дарна уу">${esc(t.t)}</span><div class="td-meta">${chip(t)}${j ? `<button class="td-job" data-tdx="job">${esc(j.no)}</button>` : ''}${t.done && t.doneAt ? `<span class="td-dn">✓ ${esc(t.doneAt.slice(5))}</span>` : ''}</div></div>
      <button class="td-star${t.star ? ' on' : ''}" data-tdx="star" title="Чухал">★</button>
      <input type="date" class="td-date" data-tdx="due" value="${esc(t.due || '')}" title="Хугацаа">
      <button class="td-del" data-tdx="del" title="Устгах">×</button></div>`; };
  const tabs = [['today', 'Өнөөдөр', mineTodos('today').length], ['week', '7 хоног', mineTodos('week').length], ['all', 'Бүгд', open.length], ['done', 'Дууссан', all.length - open.length]];
  return `<div class="mine-todo">
    <div class="td-head"><h3>Миний TODO</h3><span class="td-stat">${open.length} нээлттэй${late ? ` · <b class="bad">${late} хэтэрсэн</b>` : ''} · 7 хоногт ${doneWk} дууссан</span></div>
    <div class="td-prog"><i style="width:${all.length ? Math.round((all.length - open.length) / all.length * 100) : 0}%"></i></div>
    <form class="td-add" data-tdadd="1"><input name="t" placeholder="Шинэ ажил… (Enter) — «!» чухал, «маргааш», «+3»" autocomplete="off"><input name="d" type="date" title="Хугацаа"><select name="j" title="Ажилтай холбох"><option value="">Ажилгүй</option>${jobOpts.map(j => `<option value="${j.id}">${esc(j.no)} · ${esc(String(j.title || '').slice(0, 28))}</option>`).join('')}</select><button class="btn primary sm">+</button></form>
    <div class="td-tabs">${tabs.map(([k, n, c]) => `<button data-tdf="${k}" class="${f === k ? 'on' : ''}">${n}<span>${c}</span></button>`).join('')}</div>
    <div class="td-list">${L.length ? L.slice(0, opt.max || 200).map(row).join('') : `<div class="td-empty">${f === 'done' ? 'Дууссан зүйл алга' : f === 'today' ? '🎉 Өнөөдрийн жагсаалт хоосон' : 'Жагсаалт хоосон'}</div>`}</div>
    ${f === 'done' && L.length ? '<button class="btn ghost sm" data-tdclr="1">Дууссаныг цэвэрлэх</button>' : ''}</div>`;
}
/* ---------- notes ---------- */
function mineNotesHTML() {
  const q = lc(MINE.nq || ''), N = MINE.notes.filter(n => !q || lc(n.txt).includes(q)).sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || String(b.upd || '').localeCompare(String(a.upd || '')));
  return `<div class="mine-notes"><div class="td-head"><h3>Тэмдэглэл</h3><span class="td-stat">${MINE.notes.length}</span><span class="sp"></span><input class="nt-q" placeholder="Хайх…" value="${esc(MINE.nq || '')}"><button class="btn sm" data-ntadd="1">+ Тэмдэглэл</button></div>
    <div class="nt-grid">${N.length ? N.map(n => `<div class="nt-card${n.pin ? ' pin' : ''}" data-nt="${n.id}" style="--nc:${n.c || '#fff7d6'}"><textarea data-ntx="txt" placeholder="Бичих…" rows="3">${esc(n.txt)}</textarea>
      <div class="nt-ft"><span class="nt-c">${NOTE_C.map(([c, nm]) => `<button data-ntx="c" data-c="${c}" title="${nm}" style="background:${c}"${(n.c || '#fff7d6') === c ? ' class="on"' : ''}></button>`).join('')}</span><span class="sp"></span><span class="nt-d">${esc(String(n.upd || '').slice(5, 16).replace('T', ' '))}</span><button data-ntx="todo" title="TODO болгох">☐→</button><button data-ntx="pin" title="Дээр бэхлэх" class="${n.pin ? 'on' : ''}">📌</button><button data-ntx="del" title="Устгах">×</button></div></div>`).join('') : '<div class="td-empty">Санаа, утасны дугаар, хэмжээ… юу ч хамаагүй бичээд хадгал.</div>'}</div></div>`;
}
const autoH = ta => { ta.style.height = 'auto'; ta.style.height = Math.min(320, ta.scrollHeight + 2) + 'px'; };
function mineBind(el, rerender) {
  const f = el.querySelector('[data-tdadd]'); if (f) f.addEventListener('submit', e => { e.preventDefault(); const o = mineAdd(f.t.value, f.d.value, f.j.value); if (o) { if (MINE.f === 'done') MINE.f = 'all'; mineSave(); rerender(); const n = el.querySelector('[data-tdadd] input[name=t]'); if (n) n.focus(); } });
  el.querySelectorAll('[data-tdf]').forEach(b => b.addEventListener('click', () => { MINE.f = b.dataset.tdf; mineSave(); rerender(); }));
  const clr = el.querySelector('[data-tdclr]'); if (clr) clr.addEventListener('click', () => { if (!confirm('Дууссан бүх зүйлийг устгах уу?')) return; MINE.todos = MINE.todos.filter(t => !t.done); mineSave(); rerender(); });
  el.querySelectorAll('[data-td]').forEach(r => { const t = MINE.todos.find(x => x.id === r.dataset.td); if (!t) return;
    r.querySelectorAll('[data-tdx]').forEach(b => { const k = b.dataset.tdx;
      if (k === 'due') b.addEventListener('change', () => { t.due = b.value; mineSave(); rerender(); });
      else b.addEventListener('click', e => { e.stopPropagation();
        if (k === 'done') { t.done = !t.done; t.doneAt = t.done ? new Date().toISOString().slice(0, 16) : ''; mineSave(); r.classList.toggle('done', t.done); setTimeout(rerender, t.done ? 380 : 0); }
        else if (k === 'star') { t.star = !t.star; mineSave(); rerender(); }
        else if (k === 'del') { MINE.todos = MINE.todos.filter(x => x !== t); mineSave(); rerender(); }
        else if (k === 'job') { const j = findJob(t.job); if (j) { if (typeof erpGo === 'function' && erpOn()) erpGo(isQ(j) ? 'quotes' : 'jobs'); else setModule(isQ(j) ? 'quotes' : 'jobs'); J.sel = j.id; J.sub = isQ(j) ? 'quote' : 'main'; renderJobs(); if (typeof erpNav === 'function') erpNav(); mineDrawer(false); } }
        else if (k === 'edit' && !t.done) { const sp = b, inp = document.createElement('input'); inp.className = 'td-edit'; inp.value = t.t; sp.replaceWith(inp); inp.focus(); inp.select();
          const fin = ok => { if (ok && inp.value.trim()) { t.t = inp.value.trim(); mineSave(); } rerender(); }; inp.addEventListener('keydown', e2 => { if (e2.key === 'Enter') fin(true); if (e2.key === 'Escape') fin(false); }); inp.addEventListener('blur', () => fin(true)); }
      }); }); });
  const nq = el.querySelector('.nt-q'); if (nq) { let tm; nq.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { MINE.nq = nq.value; rerender(); const n = el.querySelector('.nt-q'); if (n) { n.focus(); n.setSelectionRange(n.value.length, n.value.length); } }, 250); }); }
  const na = el.querySelector('[data-ntadd]'); if (na) na.addEventListener('click', () => { const n = { id: uid(), txt: '', c: '#fff7d6', pin: false, upd: new Date().toISOString().slice(0, 16) }; MINE.notes.unshift(n); MINE.nq = ''; mineSave(); rerender(); const ta = el.querySelector(`[data-nt="${n.id}"] textarea`); if (ta) ta.focus(); });
  el.querySelectorAll('[data-nt]').forEach(c => { const n = MINE.notes.find(x => x.id === c.dataset.nt); if (!n) return; const ta = c.querySelector('textarea'); autoH(ta);
    let tm; ta.addEventListener('input', () => { autoH(ta); n.txt = ta.value; n.upd = new Date().toISOString().slice(0, 16); clearTimeout(tm); tm = setTimeout(mineSave, 500); });
    ta.addEventListener('blur', () => { clearTimeout(tm); if (!n.txt.trim() && MINE.notes.includes(n)) { MINE.notes = MINE.notes.filter(x => x !== n); mineSave(); setTimeout(rerender, 0); } else mineSave(); });
    c.querySelectorAll('button[data-ntx]').forEach(b => b.addEventListener('mousedown', e => e.preventDefault()));
    c.querySelectorAll('button[data-ntx]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.ntx;
      if (k === 'c') n.c = b.dataset.c; else if (k === 'pin') n.pin = !n.pin; else if (k === 'del') { if (n.txt.trim() && !confirm('Тэмдэглэлийг устгах уу?')) return; MINE.notes = MINE.notes.filter(x => x !== n); }
      else if (k === 'todo') { const lines = n.txt.split('\n').map(s => s.replace(/^\s*[-*•☐\d.)]+\s*/, '').trim()).filter(Boolean); if (!lines.length) return; lines.reverse().forEach(s => mineAdd(s)); toast(`${lines.length} мөр TODO болов`); }
      mineSave(); rerender(); })); });
}
/* ---------- drawer reachable from every page (navbar button) ---------- */
function mineDrawer(open) {
  let D = $('#mineDrawer'); if (open === false || (open == null && D)) { if (D) { D.remove(); const hs = $('#ehSide'); if (hs && hs._draw) hs._draw(); } return; }
  if (!D) { D = document.createElement('div'); D.id = 'mineDrawer'; D.className = 'mine-drawer'; document.body.appendChild(D); }
  const draw = () => { D.innerHTML = `<div class="md-h"><b>Миний жагсаалт</b><span class="sp"></span><button class="md-x" title="Хаах (Esc)">×</button></div><div class="md-b">${mineTodoHTML()}${mineNotesHTML()}</div>`; D.querySelector('.md-x').addEventListener('click', () => mineDrawer(false)); mineBind(D, draw); };
  draw(); const f = D.querySelector('[data-tdadd] input[name=t]'); if (f) setTimeout(() => f.focus(), 30);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#mineDrawer') && !e.target.closest('.td-edit')) mineDrawer(false); if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'T' || e.key === 't')) { e.preventDefault(); mineDrawer(); } });
/* startup reminder — once a day */
setTimeout(() => { try { const k = 'kh-mine-rem'; if (localStorage.getItem(k) === today()) return; const l = MINE.todos.filter(t => !t.done && t.due && t.due < today()).length, d = MINE.todos.filter(t => !t.done && t.due === today()).length; if (l || d) { toast(`📝 Өнөөдөр ${d} TODO${l ? `, ${l} хугацаа хэтэрсэн` : ''} — Ctrl+Shift+T`, 7000); localStorage.setItem(k, today()); } } catch (e) { } }, 4000);
