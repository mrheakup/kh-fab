/* ================= Kh International — дотоод чат: «Ерөнхий» суваг + ажил бүрийн чат =================
   Messages live in the shared data, so the office ↔ factory sync (OneDrive) carries them to the other PC and the
   phone page on the factory Wi-Fi can read and write them. What this PC has already read is kept on this PC only. */
const CH = { open: false, ch: 'general', seen: null };
const chatMsgs = () => (S.chat = Array.isArray(S.chat) ? S.chat : []);
const chatRead = () => (S.chatRead = S.chatRead && typeof S.chatRead === 'object' && !Array.isArray(S.chatRead) ? S.chatRead : {});
const chatMe = () => (typeof pName === 'function' && pName(S.me)) || '';
const chName = ch => { if (ch === 'general') return '# Ерөнхий'; const j = findJob(ch); return j ? `${j.no}${j.title ? ' · ' + j.title : ''}` : '(устгагдсан ажил)'; };
const chTime = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'), td = today(); const ds = new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); return (ds === td ? '' : ds.slice(5) + ' ') + p(d.getHours()) + ':' + p(d.getMinutes()); };
function chatPost(ch, text, who, src) {
  text = String(text || '').trim(); if (!text) return null;
  const m = { id: uid(), ch: ch || 'general', who: String(who || chatMe() || 'Нэргүй').slice(0, 60), t: new Date().toISOString(), text: text.slice(0, 2000) };
  if (src) m.src = src;
  chatMsgs().push(m); if (chatMsgs().length > 3000) S.chat = chatMsgs().slice(-3000);
  if (!src) chatRead()[m.ch] = m.t;
  CH.seen && CH.seen.add(m.id); saveNow(true); return m;
}
function chatUnread(ch) {
  const R = chatRead(), me = chatMe();
  return chatMsgs().filter(m => (ch == null || m.ch === ch) && m.t > (R[m.ch] || '') && (m.who !== me || m.src)).length;
}
function chatChannels() {
  const by = new Map([['general', '']]); chatMsgs().forEach(m => { if ((by.get(m.ch) || '') < m.t) by.set(m.ch, m.t); });
  const cur = (typeof J !== 'undefined' && J.sel && findJob(J.sel) && !isQ(findJob(J.sel))) ? J.sel : null; if (cur && !by.has(cur)) by.set(cur, '');
  return [...by.entries()].filter(([c]) => c === 'general' || findJob(c)).sort((a, b) => (a[0] === 'general' ? -1 : b[0] === 'general' ? 1 : b[1].localeCompare(a[1])));
}
function chatBadge() {
  const b = $('#btnChat'); if (!b) return; const n = chatUnread(null);
  b.innerHTML = `💬 Чат${n ? ` <span class="chbadge">${n > 99 ? '99+' : n}</span>` : ''}`;
}
function chatOpen(ch) { CH.open = true; if (ch) CH.ch = ch; renderChat(); }
function renderChat() {
  let d = $('#chatDrawer'); if (!CH.open) { if (d) d.hidden = true; chatBadge(); return; }
  if (!d) { d = document.createElement('div'); d.id = 'chatDrawer'; d.className = 'chdrawer'; document.body.appendChild(d); }
  d.hidden = false; if (!findJob(CH.ch)) CH.ch = CH.ch === 'general' ? 'general' : 'general';
  const L = chatMsgs().filter(m => m.ch === CH.ch).sort((a, b) => a.t.localeCompare(b.t)).slice(-300), me = chatMe(), C = chatChannels();
  d.innerHTML = `<div class="chhead"><b>💬 Чат</b><span class="sp" style="flex:1"></span><button class="btn ghost sm" id="chX" title="Хаах">✕</button></div>
    <div class="chchans">${C.map(([c]) => { const n = chatUnread(c); return `<button class="chch${c === CH.ch ? ' on' : ''}" data-ch="${c}">${esc(chName(c))}${n ? ` <span class="chbadge">${n}</span>` : ''}</button>`; }).join('')}</div>
    <div class="chlist" id="chList">${L.map(m => `<div class="chm${m.who === me && !m.src ? ' mine' : ''}"><div class="chmeta"><b>${esc(m.who)}</b>${m.src ? ' 📱' : ''} · ${chTime(m.t)}</div><div class="chtxt">${esc(m.text).replace(/\n/g, '<br>')}</div></div>`).join('') || `<p class="note" style="text-align:center;margin-top:30px">${CH.ch === 'general' ? 'Оффис, үйлдвэрийн бүх хүний ерөнхий суваг.' : 'Энэ ажлын чат — асуулт, мэдэгдлээ энд бичнэ.'}<br>Синк асаалттай бол нөгөө компьютер дээр ойролцоогоор 15–60 секундэд хүрнэ.</p>`}</div>
    ${me ? `<div class="chin"><textarea id="chTxt" rows="2" class="inp" placeholder="${esc(chName(CH.ch))} рүү бичих… (Enter — илгээх, Shift+Enter — шинэ мөр)"></textarea><button class="btn primary" id="chSend">Илгээх</button></div><div class="note chwho">Та: <b>${esc(me)}</b> · <a href="#" class="linkbtn" id="chMe">солих</a>${(typeof KL !== 'undefined' && KL.on) ? '' : ' · <span class="late">синк асаагүй — зөвхөн энэ компьютерт</span>'}</div>`
      : `<div class="chin" style="display:grid;gap:6px"><label class="fld">Та хэн бэ? (Баг → хүмүүс жагсаалтаас)<select id="chMeSel" class="inp">${peopleOpts('', '— нэрээ сонгох —')}</select></label></div>`}`;
  CH.seen = CH.seen || new Set(chatMsgs().map(m => m.id));
  const last = L.length ? L[L.length - 1].t : ''; if (last && (chatRead()[CH.ch] || '') < last) { chatRead()[CH.ch] = last; save(); }
  const ls = d.querySelector('#chList'); ls.scrollTop = ls.scrollHeight;
  d.querySelector('#chX').addEventListener('click', () => { CH.open = false; renderChat(); });
  d.querySelectorAll('[data-ch]').forEach(b => b.addEventListener('click', () => { CH.ch = b.dataset.ch; renderChat(); }));
  const ms = d.querySelector('#chMeSel'); if (ms) ms.addEventListener('change', () => { if (!ms.value) return; S.me = ms.value; save(); renderChat(); });
  const mc = d.querySelector('#chMe'); if (mc) mc.addEventListener('click', e => { e.preventDefault(); S.me = ''; renderChat(); });
  const tx = d.querySelector('#chTxt'), send = () => { if (!tx.value.trim()) return; chatPost(CH.ch, tx.value); renderChat(); setTimeout(() => { const t = $('#chTxt'); if (t) t.focus(); }, 30); };
  if (tx) { tx.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }); d.querySelector('#chSend').addEventListener('click', send); setTimeout(() => tx.focus(), 30); }
  chatBadge();
}
/* new messages that arrived from the other PC (sync) or a phone: badge + a short notice */
function chatTick() {
  const all = chatMsgs(); if (!CH.seen) { CH.seen = new Set(all.map(m => m.id)); chatBadge(); return; }
  const nw = all.filter(m => !CH.seen.has(m.id)); if (!nw.length) return; nw.forEach(m => CH.seen.add(m.id));
  const me = chatMe(), other = nw.filter(m => m.who !== me || m.src);
  if (other.length) { const m = other[other.length - 1]; if (!(CH.open && CH.ch === m.ch)) toast(`💬 ${m.who} (${chName(m.ch)}): ${m.text.slice(0, 80)}`, 6000); }
  if (CH.open) { const a = document.activeElement, typing = a && a.id === 'chTxt' ? a.value : null; renderChat(); if (typing != null) { const t = $('#chTxt'); if (t) { t.value = typing; t.focus(); } } } else chatBadge();
}
setInterval(() => { try { chatTick(); } catch (e) { } }, 3000);
(() => { const b = $('#btnChat'); if (b) b.addEventListener('click', () => { CH.open = !CH.open; if (CH.open && typeof J !== 'undefined' && J.sel && findJob(J.sel) && !isQ(findJob(J.sel)) && !$('#jobsMain').hidden && chatMsgs().some(m => m.ch === J.sel)) CH.ch = J.sel; renderChat(); }); setTimeout(chatBadge, 500); })();
