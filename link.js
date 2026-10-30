// KH Fab — backup folder, office ↔ factory shared-folder sync, phone (LAN) server. Required from main.js.
const { app, ipcMain, dialog, shell } = require('electron');
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http'), crypto = require('crypto');
module.exports = function link({ getWin, readCfg, writeCfg, dataFile }) {
  const fp = fs.promises, day = () => new Date().toISOString().slice(0, 10);
  /* ---------- 1. backup copy into a chosen folder (OneDrive / Google Drive) ---------- */
  let lastBak = 0;
  async function backupNow(force) {
    const c = readCfg(); if (!c.backupDir) return { error: 'no-dir' };
    if (!force && Date.now() - lastBak < 3600e3) return { skipped: true };
    try {
      const d = path.join(c.backupDir, 'KhFab-backup'); await fp.mkdir(d, { recursive: true });
      await fp.copyFile(dataFile(), path.join(d, `kh-data-${day()}.json`)); await fp.copyFile(dataFile(), path.join(d, 'kh-data-latest.json'));
      const all = (await fp.readdir(d)).filter(x => /^kh-data-\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort(); for (const x of all.slice(0, Math.max(0, all.length - 45))) { try { await fp.unlink(path.join(d, x)); } catch (e) { } }
      lastBak = Date.now(); c.backupLast = new Date().toISOString(); writeCfg(c); return { ok: true, at: c.backupLast, dir: d };
    } catch (e) { return { error: String(e.message || e) }; }
  }
  ipcMain.handle('link-info', () => { const c = readCfg(); return { backupDir: c.backupDir || '', backupLast: c.backupLast || '', syncDir: c.syncDir || '', mobile: !!c.mobile, port: c.mobilePort || 8790, token: c.mobileToken || '', ips: lanIPs(), host: os.hostname() }; });
  ipcMain.handle('backup-set', async (e, clear) => { const c = readCfg(); if (clear) { delete c.backupDir; writeCfg(c); return ''; } const r = await dialog.showOpenDialog(getWin(), { title: 'Нөөц хадгалах фолдер (OneDrive, Google Drive…)', properties: ['openDirectory', 'createDirectory'] }); if (r.canceled || !r.filePaths[0]) return c.backupDir || ''; c.backupDir = r.filePaths[0]; writeCfg(c); await backupNow(true); return c.backupDir; });
  ipcMain.handle('backup-now', () => backupNow(true));
  ipcMain.handle('open-dir', (e, p) => shell.openPath(String(p || '')));

  /* ---------- 2. shared data file in a synced folder (office ↔ factory) ---------- */
  const SHARED = 'KhFab-shared.json';
  const sharedFile = () => { const c = readCfg(); return c.syncDir ? path.join(c.syncDir, SHARED) : ''; };
  let lastMt = 0, ownWrite = 0, pollT = null;
  async function sharedRead() { const f = sharedFile(); if (!f) return null; try { const st = await fp.stat(f), txt = await fp.readFile(f, 'utf8'); return { txt, mt: st.mtimeMs }; } catch (e) { return null; } }
  /* write only if nobody changed the file since we last saw it; otherwise hand the newer copy back for merging */
  async function sharedWrite(txt, baseMt) {
    const f = sharedFile(); if (!f) return { off: true };
    try { const st = await fp.stat(f).catch(() => null); if (st && baseMt && st.mtimeMs > baseMt + 1 && st.mtimeMs !== ownWrite) { const cur = await fp.readFile(f, 'utf8'); lastMt = st.mtimeMs; return { conflict: true, txt: cur, mt: st.mtimeMs }; }
      const tmp = f + '.' + process.pid + '.tmp'; await fp.writeFile(tmp, txt, 'utf8'); await fp.rename(tmp, f); const s2 = await fp.stat(f); ownWrite = lastMt = s2.mtimeMs; return { ok: true, mt: s2.mtimeMs };
    } catch (e) { return { error: String(e.message || e) }; }
  }
  function startPoll() { clearInterval(pollT); if (!sharedFile()) return; pollT = setInterval(async () => { const f = sharedFile(); if (!f) return; try { const st = await fp.stat(f); if (st.mtimeMs > lastMt + 1 && st.mtimeMs !== ownWrite) { lastMt = st.mtimeMs; const txt = await fp.readFile(f, 'utf8'); const w = getWin(); if (w) w.webContents.send('sync-remote', { txt, mt: st.mtimeMs }); } } catch (e) { } }, 15000); }
  ipcMain.handle('sync-set', async (e, clear) => { const c = readCfg(); if (clear) { delete c.syncDir; writeCfg(c); clearInterval(pollT); return { dir: '' }; } const r = await dialog.showOpenDialog(getWin(), { title: 'Хоёр компьютерын хуваалцсан фолдер (OneDrive…)', properties: ['openDirectory', 'createDirectory'] }); if (r.canceled || !r.filePaths[0]) return { dir: c.syncDir || '' }; c.syncDir = r.filePaths[0]; writeCfg(c); lastMt = 0; startPoll(); const cur = await sharedRead(); if (cur) lastMt = cur.mt; return { dir: c.syncDir, existing: cur }; });
  const basePath = () => path.join(app.getPath('userData'), 'kh-sync-base.json');
  ipcMain.handle('sync-base', async (e, txt) => { try { if (txt == null) return await fp.readFile(basePath(), 'utf8'); await fp.writeFile(basePath(), String(txt), 'utf8'); return true; } catch (x) { return null; } });
  ipcMain.handle('sync-read', async () => { const r = await sharedRead(); if (r) lastMt = r.mt; return r; });
  ipcMain.handle('sync-write', (e, txt, baseMt) => sharedWrite(String(txt), +baseMt || 0));
  app.whenReady().then(startPoll);

  /* ---------- 3. phone access on the local network (QR on the screen → phone browser) ---------- */
  let srv = null; const pend = new Map();
  function lanIPs() { const L = []; Object.values(os.networkInterfaces()).forEach(a => (a || []).forEach(n => { if (n.family === 'IPv4' && !n.internal) L.push(n.address); })); return L; }
  const ask = (type, body) => new Promise((res, rej) => { const w = getWin(); if (!w) return rej(new Error('no window')); const id = crypto.randomBytes(6).toString('hex'); const t = setTimeout(() => { pend.delete(id); rej(new Error('timeout')); }, 20000); pend.set(id, v => { clearTimeout(t); res(v); }); w.webContents.send('mobile-req', { id, type, body }); });
  ipcMain.on('mobile-res', (e, id, data) => { const f = pend.get(id); if (f) { pend.delete(id); f(data); } });
  function startServer() {
    const c = readCfg(); if (srv) { try { srv.close(); } catch (e) { } srv = null; } if (!c.mobile) return;
    if (!c.mobileToken) { c.mobileToken = crypto.randomBytes(9).toString('base64url'); writeCfg(c); }
    const port = c.mobilePort || 8790, tok = c.mobileToken, page = fs.readFileSync(path.join(__dirname, 'app', 'mobile.html'), 'utf8');
    srv = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://x'), send = (code, body, type = 'application/json; charset=utf-8') => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(typeof body === 'string' ? body : JSON.stringify(body)); };
      if (u.searchParams.get('t') !== tok && req.headers['x-kh-token'] !== tok) return send(403, { error: 'Нэвтрэх эрхгүй — компьютер дээрх QR-ыг дахин уншуулна уу' });
      if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/m')) return send(200, page, 'text/html; charset=utf-8');
      if (req.method === 'GET' && u.pathname === '/api/state') return ask('state', {}).then(d => send(200, d), e => send(500, { error: e.message }));
      if (req.method === 'POST' && u.pathname.startsWith('/api/')) {
        let b = ''; req.on('data', ch => { b += ch; if (b.length > 25e6) req.destroy(); });
        req.on('end', () => { let j = {}; try { j = JSON.parse(b || '{}'); } catch (e) { return send(400, { error: 'bad json' }); } ask(u.pathname.slice(5), j).then(d => send(200, d), e => send(500, { error: e.message })); });
        return;
      }
      send(404, { error: 'not found' });
    });
    srv.on('error', e => { const w = getWin(); if (w) w.webContents.send('mobile-err', String(e.message || e)); });
    srv.listen(port, '0.0.0.0');
  }
  ipcMain.handle('mobile-set', (e, on, port) => { const c = readCfg(); c.mobile = !!on; if (port) c.mobilePort = +port; writeCfg(c); startServer(); return { on: c.mobile, port: c.mobilePort || 8790, token: c.mobileToken, ips: lanIPs() }; });
  ipcMain.handle('mobile-newtoken', () => { const c = readCfg(); c.mobileToken = crypto.randomBytes(9).toString('base64url'); writeCfg(c); startServer(); return c.mobileToken; });
  app.whenReady().then(() => setTimeout(startServer, 1500));
  return { backupNow };
};
