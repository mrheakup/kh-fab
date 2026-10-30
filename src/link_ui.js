/* ================= Kh International — backup folder · office ↔ factory sync · phone access =================
   «🔗 Холболт» panel. Sync: both PCs point at the same OneDrive folder; each save is written to KhFab-shared.json.
   If the other PC changed it meanwhile, the two versions are merged record by record (3-way, against the last
   synced copy), so work done at the office and at the factory is kept. Phone: the PC serves a small page on
   the local Wi-Fi; workers scan the QR and update job progress, add photos, fill daily inspections. */
/* per-computer things that are not shared: who is using this PC, the nesting workspace */
const LOCAL_KEYS = ['me', 'jobName', 'parts', 'std', 'sheetMode', 'fixedIdx', 's', 'quote', 'activeJob'];
const KL = { base: null, mt: 0, on: false, busy: false, pendRemote: null };
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const jeq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const idArr = a => Array.isArray(a) && a.length > 0 && a.every(x => isObj(x) && x.id != null);
/* 3-way merge: what only one side changed is taken; if both changed the same field, this PC wins */
function merge3(b, l, r, path, C) {
  if (jeq(l, r)) return l; if (jeq(l, b)) return r; if (jeq(r, b)) return l;
  if (isObj(l) && isObj(r)) { const o = {}, B = isObj(b) ? b : {}; new Set([...Object.keys(l), ...Object.keys(r)]).forEach(k => { const v = merge3(B[k], l[k], r[k], path + '.' + k, C); if (v !== undefined) o[k] = v; }); return o; }
  if ((idArr(l) || !l || !l.length) && (idArr(r) || !r || !r.length) && (idArr(l) || idArr(r))) {
    const B = new Map((Array.isArray(b) ? b : []).filter(isObj).map(x => [x.id, x])), L = new Map((l || []).map(x => [x.id, x])), R = new Map((r || []).map(x => [x.id, x])), out = [];
    const take = id => { const bl = B.get(id), ll = L.get(id), rr = R.get(id);
      if (ll && rr) return merge3(bl, ll, rr, path + '[' + id + ']', C);
      if (ll && !rr) return bl && jeq(bl, ll) ? undefined : ll;      // deleted there, untouched here → delete
      if (rr && !ll) return bl && jeq(bl, rr) ? undefined : rr;      // deleted here, untouched there → delete
      return undefined; };
    (r || []).forEach(x => { if (!L.has(x.id)) { const v = take(x.id); if (v !== undefined) out.push(v); } });   // new on the other PC first
    (l || []).forEach(x => { const v = take(x.id); if (v !== undefined) out.push(v); });
    return out;
  }
  if (C) C.push(path); return l;
}
function applyState(m) { const keep = { _saved: S._saved }; Object.keys(S).forEach(k => delete S[k]); Object.assign(S, m, keep); }
function rerenderAll() {
  try { const cur = (document.querySelector('.modtabs button.on') || {}).dataset?.mod || 'nest'; if (typeof renderAll === 'function') renderAll(); setModule(cur); if (typeof contactLists === 'function') contactLists(); } catch (e) { console.error(e); }
}
async function syncInit() {
  if (!(window.kh && window.kh.syncRead)) return; const info = await window.kh.linkInfo(); KL.on = !!info.syncDir; if (!KL.on) return;
  try { const bt = await window.kh.syncBase(); KL.base = bt ? JSON.parse(bt) : null; } catch (e) { KL.base = null; }
  const r = await window.kh.syncRead(); if (!r) { await syncPush(JSON.stringify(S)); return; }
  KL.mt = r.mt; await syncMerge(r.txt, true);
}
async function syncMerge(txt, startup) {
  let R; try { R = JSON.parse(txt); } catch (e) { return; }
  const C = [], L = JSON.parse(JSON.stringify(S)); delete L._saved; delete R._saved; const B = KL.base ? Object.assign({}, KL.base) : {}; delete B._saved;
  const m = merge3(B, L, R, 'S', C);
  LOCAL_KEYS.forEach(k => { if (k in L) m[k] = L[k]; else delete m[k]; });   // this PC's own workspace / user stays as is
  KL.base = R; window.kh.syncBase(txt);
  if (!jeq(m, L)) { applyState(m); rerenderAll(); toast(`🔄 Нөгөө компьютерын өөрчлөлт орлоо${C.length ? ` · ${C.length} зөрчилд энэ компьютерынх үлдсэн` : ''}`, 6000); }
  const Rc = Object.assign({}, R); LOCAL_KEYS.forEach(k => { Rc[k] = m[k]; }); if (!jeq(m, Rc)) save();
}
async function syncPush(txt) {
  if (!KL.on || KL.busy) return; KL.busy = true;
  try {
    const r = await window.kh.syncWrite(txt, KL.mt);
    if (r && r.ok) { KL.mt = r.mt; KL.base = JSON.parse(txt); window.kh.syncBase(txt); syncBadge('ok'); }
    else if (r && r.conflict) { KL.mt = r.mt; KL.busy = false; await syncMerge(r.txt); return; }
    else if (r && r.error) syncBadge('err', r.error);
  } catch (e) { syncBadge('err', e.message); } finally { KL.busy = false; }
}
function syncBadge(st, msg) { const b = $('#btnLink'); if (!b) return; b.classList.toggle('lk-ok', st === 'ok'); b.classList.toggle('lk-err', st === 'err'); b.title = st === 'err' ? 'Синк алдаа: ' + msg : KL.on ? 'Синк хийгдсэн ' + new Date().toLocaleTimeString() : 'Холболт, нөөц'; }
if (window.kh && window.kh.onSyncRemote) window.kh.onSyncRemote(d => {
  const a = document.activeElement; if (a && a.matches && a.matches('input,textarea,select')) { KL.pendRemote = d; a.addEventListener('blur', () => { const p = KL.pendRemote; KL.pendRemote = null; if (p) { KL.mt = p.mt; syncMerge(p.txt); } }, { once: true }); return; }
  KL.mt = d.mt; syncMerge(d.txt);
});

/* ---------- phone requests (served by the desktop on the local network) ---------- */
const MOB = {
  state() {
    const jobs = (S.jobs || []).filter(j => !isQ(j) && !['given'].includes(j.status)).map(j => { jx(j); return { id: j.id, no: j.no, title: j.title || '', customer: j.customer || '', due: j.due || '', status: jstName(j.status), stages: j.scope.stages.map((s, i) => ({ i, name: s.name, pct: +s.pct || 0 })) }; });
    const I = IS(), M = I.machines.map(m => ({ id: m.id, no: m.no, name: m.name, role: m.role || 'оператор', items: m.items.map(x => Array.isArray(x) ? (x[1] || x[0]) : String(x)) }));
    return { jobs, machines: M, people: people().filter(p => p.active !== false).map(p => p.name), concl: INSP_CONCL, company: company().name, date: today() };
  },
  progress(b) { const j = findJob(b.job); if (!j) throw new Error('Ажил олдсонгүй'); jx(j); const s = j.scope.stages[+b.stage]; if (!s) throw new Error('Үе шат олдсонгүй'); const o = +s.pct || 0; s.pct = Math.max(0, Math.min(100, Math.round(+b.pct || 0))); jobLog(`📱 ${b.who || 'Утас'}: «${s.name}» ${o}% → ${s.pct}%${b.note ? ' — ' + b.note : ''}`, j); if (b.note && b.needs) { j.need = b.note; } save(); setTimeout(mobRefresh, 50); return { ok: true, pct: s.pct }; },
  async photo(b) { const j = findJob(b.job); if (!j) throw new Error('Ажил олдсонгүй'); const bin = atob(String(b.data).split(',')[1] || ''), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); const f = new File([u], b.name || `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }); await jobFilesAdd(j, [f]); jobLog(`📱 ${b.who || 'Утас'}: зураг нэмсэн${b.note ? ' — ' + b.note : ''}`, j); save(); setTimeout(mobRefresh, 50); return { ok: true }; },
  insp(b) { const I = IS(), m = I.machines.find(x => x.id === b.mid); if (!m) throw new Error('Тоног төхөөрөмж олдсонгүй'); if (!b.by) throw new Error('Үзлэг хийсэн хүний нэр'); const res = m.items.map((_, i) => (b.res || [])[i] || ''), bad = res.includes('bad');
    const rec = { id: uid(), mid: m.id, date: b.date || today(), shift: b.shift || (new Date().getHours() < 14 ? 'am' : 'pm'), res, notes: m.items.map((_, i) => (b.notes || [])[i] || ''), concl: b.concl || (bad ? 'fix' : res.every(v => v === 'ok') ? 'ok' : ''), by: b.by, chk: b.chk || '', note: (b.note || '') + ' (утаснаас)' };
    I.recs.push(rec); save(); setTimeout(mobRefresh, 50); return { ok: true, bad: res.filter(v => v === 'bad').length }; },
  note(b) { const j = findJob(b.job); if (!j) throw new Error('Ажил олдсонгүй'); j.need = String(b.text || '').trim(); jobLog(`📱 ${b.who || 'Утас'}: ${j.need}`, j); save(); setTimeout(mobRefresh, 50); return { ok: true }; }
};
function mobRefresh() { try { const cur = (document.querySelector('.modtabs button.on') || {}).dataset?.mod; if (['jobs', 'dash', 'plan', 'insp'].includes(cur)) setModule(cur); } catch (e) { } }
if (window.kh && window.kh.onMobileReq) window.kh.onMobileReq(async r => { try { const f = MOB[r.type]; if (!f) throw new Error('unknown'); const d = await f(r.body || {}); window.kh.mobileRes(r.id, d); } catch (e) { window.kh.mobileRes(r.id, { error: e.message }); } });
if (window.kh && window.kh.onMobileErr) window.kh.onMobileErr(m => toast('📱 Утасны холболт асаасангүй: ' + m + ' (порт эзэлсэн бол өөр порт сонгоно уу)', 8000));

/* ---------- «🔗 Холболт» panel ---------- */
async function linkPanel() {
  if (!(window.kh && window.kh.linkInfo)) { toast('Энэ боломж зөвхөн Desktop програмд ажиллана'); return; }
  const I = await window.kh.linkInfo(), url = I.ips.length ? `http://${I.ips[0]}:${I.port}/m?t=${I.token}` : '';
  const d = document.createElement('div'); d.className = 'skdlg';
  d.innerHTML = `<div class="skbox lkbox"><div style="display:flex;align-items:center"><h3>🔗 Холболт, нөөц</h3><span class="sp" style="flex:1"></span><button class="btn ghost sm" id="lkX">✕</button></div>
    <div class="lksec"><b>1. Автомат нөөц (OneDrive / Google Drive)</b><p class="note">Өгөгдлийг цаг тутам энэ фолдерт <span class="mono">KhFab-backup</span> дотор хуулна (45 хоногийн). Компьютер эвдэрсэн ч OneDrive-д үлдэнэ.</p>
      <div class="addrow"><span class="mono lkpath">${esc(I.backupDir || '— тохируулаагүй —')}</span></div>
      <div class="addrow"><button class="btn sm" id="lkBk">${I.backupDir ? 'Фолдер солих' : 'Фолдер сонгох'}</button>${I.backupDir ? '<button class="btn sm ghost" id="lkBkNow">Одоо нөөцлөх</button><button class="btn sm ghost" id="lkBkOpen">Нээх</button><button class="btn sm ghost" id="lkBkOff">Унтраах</button>' : ''}<span class="note">${I.backupLast ? 'Сүүлд: ' + new Date(I.backupLast).toLocaleString() : ''}</span></div></div>
    <div class="lksec"><b>2. Оффис ↔ үйлдвэр синк</b><p class="note">Хоёр компьютер дээр <u>ижил</u> OneDrive фолдер сонгоно. Хадгалах бүрт <span class="mono">KhFab-shared.json</span>-д бичиж, нөгөө компьютерын өөрчлөлтийг 15 секунд тутам шалгаж нэгтгэнэ. Нэг бичлэгийн нэг талбарыг хоёр газар зэрэг засвал энэ компьютерынх үлдэнэ. Хавсралт файл (зураг, PDF) синк хийгдэхгүй.</p>
      <div class="addrow"><span class="mono lkpath">${esc(I.syncDir || '— синк асаагүй —')}</span></div>
      <div class="addrow"><button class="btn sm" id="lkSy">${I.syncDir ? 'Фолдер солих' : 'Синк асаах — фолдер сонгох'}</button>${I.syncDir ? '<button class="btn sm ghost" id="lkSyNow">Одоо синк хийх</button><button class="btn sm ghost" id="lkSyOff">Унтраах</button>' : ''}<span class="note">Компьютер: ${esc(I.host)}</span></div></div>
    <div class="lksec"><b>3. Утаснаас бүртгэх (үйлдвэрийн Wi-Fi)</b><p class="note">Энэ компьютер асаалттай, утас нэг Wi-Fi-д байхад QR уншуулж: ажлын явц %, зураг, тэмдэглэл, өдөр тутмын үзлэг бөглөнө. Анх асаахад Windows-ийн «Firewall» асуулт гарвал «Allow / Private network» зөвшөөрнө.</p>
      <label class="check"><input type="checkbox" id="lkMob"${I.mobile ? ' checked' : ''}><span>Утасны холболт асаах</span></label> <label class="fld" style="display:inline-grid;width:110px">Порт<input id="lkPort" type="number" value="${I.port}" class="mono"></label>
      ${I.mobile ? (url ? `<div class="lkqr"><canvas id="lkQr" width="200" height="200"></canvas><div><p class="mono" style="word-break:break-all;font-size:12px">${esc(url)}</p>${I.ips.length > 1 ? `<p class="note">Бусад хаяг: ${I.ips.slice(1).map(esc).join(', ')}</p>` : ''}<button class="btn sm ghost" id="lkTok">Шинэ нууц түлхүүр (хуучин QR хүчингүй)</button></div></div>` : '<p class="note late">Сүлжээнд холбогдоогүй байна.</p>') : ''}</div>
  </div>`;
  document.body.appendChild(d); const close = () => d.remove(); d.querySelector('#lkX').addEventListener('click', close); d.addEventListener('click', e => { if (e.target === d) close(); });
  const re = () => { close(); linkPanel(); };
  d.querySelector('#lkBk').addEventListener('click', async () => { await window.kh.backupSet(); re(); });
  const bn = d.querySelector('#lkBkNow'); if (bn) bn.addEventListener('click', async () => { saveNow(true); const r = await window.kh.backupNow(); toast(r && r.ok ? '💾 Нөөц хуулагдлаа: ' + r.dir : 'Нөөцлөж чадсангүй: ' + (r && r.error)); re(); });
  const bo = d.querySelector('#lkBkOpen'); if (bo) bo.addEventListener('click', () => window.kh.openDir(I.backupDir));
  const bf = d.querySelector('#lkBkOff'); if (bf) bf.addEventListener('click', async () => { await window.kh.backupSet(true); re(); });
  d.querySelector('#lkSy').addEventListener('click', async () => {
    const r = await window.kh.syncSet(); if (!r.dir) return; KL.on = true; KL.base = null;
    if (r.existing) { KL.mt = r.existing.mt; if (!confirm('Энэ фолдерт нөгөө компьютерын өгөгдөл байна. Энэ компьютерынхтэй нэгтгэх үү? (Аль алиных нь ажил, санал, нэхэмжлэх үлдэнэ)')) { KL.on = false; await window.kh.syncSet(true); re(); return; } await syncMerge(r.existing.txt); saveNow(false); }
    else { await syncPush(JSON.stringify(S)); toast('🔄 Синк асаалаа — нөгөө компьютер дээр ижил фолдер сонгоно уу'); }
    re();
  });
  const sn = d.querySelector('#lkSyNow'); if (sn) sn.addEventListener('click', async () => { const r = await window.kh.syncRead(); if (r) { KL.mt = r.mt; await syncMerge(r.txt); } await syncPush(JSON.stringify(S)); toast('🔄 Синк хийгдлээ'); });
  const so = d.querySelector('#lkSyOff'); if (so) so.addEventListener('click', async () => { await window.kh.syncSet(true); KL.on = false; re(); });
  d.querySelector('#lkMob').addEventListener('change', async e => { await window.kh.mobileSet(e.target.checked, +d.querySelector('#lkPort').value || 8790); re(); });
  d.querySelector('#lkPort').addEventListener('change', async e => { if (d.querySelector('#lkMob').checked) { await window.kh.mobileSet(true, +e.target.value || 8790); re(); } });
  const tk = d.querySelector('#lkTok'); if (tk) tk.addEventListener('click', async () => { await window.kh.mobileNewToken(); re(); });
  const qc = d.querySelector('#lkQr'); if (qc && url) { if (!window.qrcode) { try { await loadScript('vendor/qrcode.js'); } catch (e) { } } const q = qrMatrix(url); if (q) { const x = qc.getContext('2d'), s = 200 / (q.n + 8); x.fillStyle = '#fff'; x.fillRect(0, 0, 200, 200); x.fillStyle = '#000'; for (let r = 0; r < q.n; r++) for (let c = 0; c < q.n; c++) if (q.dark(r, c)) x.fillRect((c + 4) * s, (r + 4) * s, s + 0.3, s + 0.3); } }
}
(() => { const b = $('#btnLink'); if (b) b.addEventListener('click', linkPanel); })();
setTimeout(() => { syncInit().catch(e => console.error(e)); }, 1500);
