// KH Fab — Electron main process
const { app, BrowserWindow, ipcMain, dialog, Menu, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

let win = null;
const cfgPath = () => path.join(app.getPath('userData'), 'kh-fab.json');
function readCfg() { try { return JSON.parse(fs.readFileSync(cfgPath(), 'utf8')); } catch (e) { return {}; } }
function writeCfg(c) { try { fs.writeFileSync(cfgPath(), JSON.stringify(c, null, 2)); } catch (e) { } }

const OPENABLE = /\.(dxf|svg|pdf|ai|plt|hpgl|hgl|khnest\.json)$/i;
function filesFromArgs(argv) { return argv.slice(1).filter(a => OPENABLE.test(a) && fs.existsSync(a)); }
function sendFiles(paths) {
  if (!win || !paths.length) return;
  const files = paths.map(p => ({ name: path.basename(p), data: fs.readFileSync(p) }));
  win.webContents.send('open-files', files);
}

if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  app.on('second-instance', (e, argv) => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); sendFiles(filesFromArgs(argv)); } });
}

function createWindow() {
  const cfg = readCfg();
  win = new BrowserWindow({
    width: cfg.w || 1440, height: cfg.h || 900, minWidth: 1000, minHeight: 640, show: false,
    title: 'Kh International', icon: path.join(__dirname, 'build', 'icon.png'), autoHideMenuBar: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false, plugins: true }
  });
  if (cfg.max) win.maximize();
  win.once('ready-to-show', () => win.show());
  win.on('close', () => { const b = win.getBounds(), c = readCfg(); c.w = b.width; c.h = b.height; c.max = win.isMaximized(); writeCfg(c); });
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('did-finish-load', () => sendFiles(filesFromArgs(process.argv)));
  buildMenu();
}

function buildMenu() {
  const tpl = [
    { label: 'Файл', submenu: [
      { label: 'Файл нээх…', accelerator: 'CmdOrCtrl+O', click: async () => { const r = await dialog.showOpenDialog(win, { properties: ['openFile', 'multiSelections'], filters: [{ name: 'Зураг', extensions: ['dxf', 'svg', 'pdf', 'ai', 'plt', 'hpgl'] }] }); if (!r.canceled) sendFiles(r.filePaths); } },
      { type: 'separator' }, { role: 'quit', label: 'Гарах' }] },
    { label: 'Харах', submenu: [{ role: 'reload', label: 'Дахин ачаалах' }, { role: 'togglefullscreen', label: 'Бүтэн дэлгэц' }, { role: 'zoomIn', label: 'Томруулах' }, { role: 'zoomOut', label: 'Жижигрүүлэх' }, { role: 'resetZoom', label: 'Анхны хэмжээ' }, { type: 'separator' }, { role: 'toggleDevTools', label: 'Хөгжүүлэгчийн хэрэгсэл' }] },
    { label: 'Тусламж', submenu: [
      { label: 'Шинэчлэл шалгах', click: () => checkUpdates(true) },
      { label: `Хувилбар ${app.getVersion()}`, enabled: false }] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

/* ---------- auto update (GitHub Releases) ---------- */
let updState = { state: 'idle' };
function sendUpd(s) { updState = { ...updState, ...s }; if (win) win.webContents.send('upd', updState); }
function feedConfigured() {
  const c = readCfg();
  if (c.ghOwner) { autoUpdater.setFeedURL({ provider: 'github', owner: c.ghOwner, repo: c.ghRepo || 'kh-fab' }); return true; }
  try { const y = fs.readFileSync(path.join(process.resourcesPath || '', 'app-update.yml'), 'utf8'); return !/owner:\s*OWNER\b/.test(y); } catch (e) { return false; }
}
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.on('checking-for-update', () => sendUpd({ state: 'checking' }));
autoUpdater.on('update-available', i => sendUpd({ state: 'downloading', version: i.version, percent: 0 }));
autoUpdater.on('update-not-available', () => sendUpd({ state: 'latest' }));
autoUpdater.on('download-progress', p => sendUpd({ state: 'downloading', percent: Math.round(p.percent) }));
autoUpdater.on('update-downloaded', i => sendUpd({ state: 'ready', version: i.version }));
autoUpdater.on('error', e => sendUpd({ state: 'error', message: String(e && e.message || e).slice(0, 200) }));
function checkUpdates(manual) {
  if (!app.isPackaged) { sendUpd({ state: 'dev' }); return; }
  if (!feedConfigured()) { sendUpd({ state: 'unconfigured' }); if (manual && win) dialog.showMessageBox(win, { message: 'Шинэчлэлийн GitHub хаяг тохируулаагүй байна. Nesting → Тохиргоо → Програм хэсэгт оруулна уу.' }); return; }
  autoUpdater.checkForUpdates().catch(e => sendUpd({ state: 'error', message: String(e.message || e).slice(0, 200) }));
}

/* ---------- IPC ---------- */
ipcMain.handle('save-file', async (e, name, data) => {
  const c = readCfg(), ext = path.extname(name).slice(1).toLowerCase();
  const dir = (c.dirs && c.dirs[ext]) || app.getPath('documents');
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(dir, name), filters: ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : [] });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, typeof data === 'string' ? data : Buffer.from(data));
  c.dirs = { ...(c.dirs || {}), [ext]: path.dirname(r.filePath) }; writeCfg(c);
  return r.filePath;
});
ipcMain.handle('show-in-folder', (e, p) => shell.showItemInFolder(p));
/* data store: userData/kh-data.json (+ daily backups, 60 kept) */
const dataFile = () => path.join(app.getPath('userData'), 'kh-data.json');
const LINK = require('./link.js')({ getWin: () => win, readCfg, writeCfg, dataFile });
const bakDir = () => path.join(app.getPath('userData'), 'backups');
function writeData(txt) {
  const f = dataFile(), tmp = f + '.tmp'; fs.writeFileSync(tmp, txt, 'utf8'); fs.renameSync(tmp, f);
  try { const d = bakDir(); fs.mkdirSync(d, { recursive: true }); const b = path.join(d, `kh-data-${new Date().toISOString().slice(0, 10)}.json`); if (!fs.existsSync(b) || Date.now() - fs.statSync(b).mtimeMs > 3600e3) fs.copyFileSync(f, b);
    const all = fs.readdirSync(d).filter(x => /^kh-data-\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort(); all.slice(0, Math.max(0, all.length - 60)).forEach(x => { try { fs.unlinkSync(path.join(d, x)); } catch (e) { } }); } catch (e) { }
}
/* window.prompt() is not available in Electron — a small modal asks instead (renderer waits on sendSync) */
ipcMain.on('prompt-sync', (e, msg, def) => {
  const parent = BrowserWindow.fromWebContents(e.sender) || win; let done = false;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const html = `<!doctype html><meta charset="utf-8"><title>…</title><style>body{font:14px Segoe UI,system-ui,sans-serif;margin:0;padding:16px;background:#fff;color:#111}p{margin:0 0 10px;white-space:pre-wrap;max-height:220px;overflow:auto}input{width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #bbb;border-radius:8px;font:inherit}div{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}button{padding:7px 16px;border-radius:8px;border:1px solid #bbb;background:#f4f4f5;font:inherit;cursor:pointer}button.p{background:#2563eb;border-color:#2563eb;color:#fff}</style>
<p>${esc(msg)}</p><input id="v" value="${esc(def)}" autofocus><div><button onclick="document.title='C:'">Болих</button><button class="p" onclick="document.title='O:'+document.getElementById('v').value">OK</button></div>
<script>const v=document.getElementById('v');v.select();v.addEventListener('keydown',e=>{if(e.key==='Enter')document.title='O:'+v.value;if(e.key==='Escape')document.title='C:';});</script>`;
  const lines = Math.min(12, String(msg || '').split('\n').length);
  const d = new BrowserWindow({ parent, modal: true, width: 440, height: 170 + lines * 18, resizable: false, minimizable: false, maximizable: false, autoHideMenuBar: true, title: 'Kh International', show: false, webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true } });
  const finish = v => { if (done) return; done = true; e.returnValue = v; if (!d.isDestroyed()) d.destroy(); };
  d.on('page-title-updated', (ev, t) => { ev.preventDefault(); if (t.startsWith('O:')) finish(t.slice(2)); else if (t.startsWith('C:')) finish(null); });
  d.on('closed', () => finish(null));
  d.once('ready-to-show', () => d.show());
  d.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
});
ipcMain.on('data-load-sync', e => { try { e.returnValue = fs.existsSync(dataFile()) ? fs.readFileSync(dataFile(), 'utf8') : null; } catch (x) { e.returnValue = null; } });
/* async, coalesced writes: the main process never blocks the window while saving */
let wPend = null, wBusy = false, wWait = [];
async function writeDataAsync(txt) {
  const f = dataFile(), tmp = f + '.atmp'; await fs.promises.writeFile(tmp, txt, 'utf8'); await fs.promises.rename(tmp, f);
  try { const d = bakDir(); await fs.promises.mkdir(d, { recursive: true }); const b = path.join(d, `kh-data-${new Date().toISOString().slice(0, 10)}.json`);
    let old = true; try { old = Date.now() - (await fs.promises.stat(b)).mtimeMs > 3600e3; } catch (x) { }
    if (old) { await fs.promises.copyFile(f, b); const all = (await fs.promises.readdir(d)).filter(x => /^kh-data-\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort(); for (const x of all.slice(0, Math.max(0, all.length - 60))) { try { await fs.promises.unlink(path.join(d, x)); } catch (y) { } } } } catch (x) { }
}
async function pumpWrite() { if (wBusy) return; wBusy = true; while (wPend !== null) { const t = wPend, ws = wWait; wPend = null; wWait = []; let r = { ok: true }; try { await writeDataAsync(t); } catch (x) { r = { error: String(x.message || x) }; } ws.forEach(f => f(r)); } wBusy = false; LINK.backupNow(false); }
ipcMain.handle('data-save', (e, txt) => new Promise(res => { wPend = String(txt); wWait.push(res); pumpWrite(); }));
ipcMain.on('data-save-sync', (e, txt) => { try { wPend = null; writeData(String(txt)); e.returnValue = true; } catch (x) { e.returnValue = false; } });
ipcMain.handle('data-dir', () => shell.openPath(app.getPath('userData')));
/* folder listing is async so a slow (OneDrive / network) folder never freezes the window */
ipcMain.handle('list-dir', async (e, p) => {
  const out = [], root = String(p || ''), skip = /^(~\$|Thumbs\.db$|desktop\.ini$|\.)/i, fp = fs.promises;
  const walk = async (d, rel, depth) => { let ents = []; try { ents = await fp.readdir(d, { withFileTypes: true }); } catch (x) { return; }
    for (const en of ents) { if (out.length >= 500) return; if (skip.test(en.name) || en.name === 'node_modules') continue; const full = path.join(d, en.name), r = rel ? rel + '/' + en.name : en.name;
      if (en.isDirectory()) { if (depth < 3) await walk(full, r, depth + 1); } else { let st = null; try { st = await fp.stat(full); } catch (x) { } out.push({ rel: r, path: full, size: st ? st.size : 0, mtime: st ? st.mtimeMs : 0 }); } } };
  try { await fp.access(root); } catch (x) { return { error: 'not-found' }; } await walk(root, '', 0); return { files: out };
});
/* small thumbnail of an image on disk (instead of decoding the full photo in the page) */
ipcMain.handle('thumb', async (e, p, w) => { try { const W = +w || 240; let im; try { im = await nativeImage.createThumbnailFromPath(String(p), { width: W, height: W }); } catch (x) { im = nativeImage.createFromPath(String(p)); } if (!im || im.isEmpty()) return ''; const sz = im.getSize(); if (sz.width > W || sz.height > W) im = im.resize(sz.width >= sz.height ? { width: W } : { height: W }); return im.toDataURL(); } catch (x) { return ''; } });
ipcMain.handle('read-file', async (e, p) => { const st = await fs.promises.stat(String(p)); if (st.size > 80 * 1048576) throw new Error('too-big'); return fs.promises.readFile(String(p)); });
ipcMain.handle('pick-dir', async () => { const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] }); return r.canceled ? '' : (r.filePaths[0] || ''); });
ipcMain.handle('open-path', async (e, p) => { const r = await shell.openPath(String(p || '')); return r || ''; });
ipcMain.handle('print-html', async (e, html, opt) => {
  const tmp = path.join(app.getPath('temp'), `kh-print-${Date.now()}.html`);
  fs.writeFileSync(tmp, html, 'utf8');
  const pw = new BrowserWindow({ show: false, parent: win, webPreferences: { sandbox: true } });
  try {
    await pw.loadFile(tmp);
    await pw.webContents.executeJavaScript('Promise.all([...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })))');
    return await new Promise(res => pw.webContents.print({ silent: false, printBackground: true, landscape: !!(opt && opt.landscape), pageSize: (opt && opt.pageSize) || 'A4', margins: { marginType: 'none' } }, (ok, err) => res(ok || err === 'cancelled' ? { ok: true } : { error: err })));
  } catch (err) { return { error: String(err && err.message || err) }; }
  finally { setTimeout(() => { try { pw.destroy(); fs.unlinkSync(tmp); } catch (x) { } }, 2000); }
});
ipcMain.handle('info', () => { const c = readCfg(); return { version: app.getVersion(), ghOwner: c.ghOwner || '', ghRepo: c.ghRepo || 'kh-fab', packaged: app.isPackaged, upd: updState }; });
ipcMain.handle('set-feed', (e, owner, repo) => { const c = readCfg(); c.ghOwner = String(owner || '').trim(); c.ghRepo = String(repo || 'kh-fab').trim() || 'kh-fab'; writeCfg(c); checkUpdates(false); return true; });
ipcMain.handle('check-update', () => { checkUpdates(true); return true; });
ipcMain.handle('install-update', () => { setImmediate(() => autoUpdater.quitAndInstall(false, true)); return true; });

app.whenReady().then(() => { createWindow(); setTimeout(() => checkUpdates(false), 4000); setInterval(() => checkUpdates(false), 4 * 3600 * 1000); });
app.on('window-all-closed', () => app.quit());
