// KH Fab — Electron main process
const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
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
ipcMain.handle('list-dir', (e, p) => {
  const out = [], root = String(p || ''), skip = /^(~\$|Thumbs\.db$|desktop\.ini$|\.)/i;
  const walk = (d, rel, depth) => { let ents = []; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch (x) { return; }
    for (const en of ents) { if (skip.test(en.name) || en.name === 'node_modules') continue; const full = path.join(d, en.name), r = rel ? rel + '/' + en.name : en.name;
      if (en.isDirectory()) { if (depth < 3) walk(full, r, depth + 1); } else { let st = null; try { st = fs.statSync(full); } catch (x) { } out.push({ rel: r, path: full, size: st ? st.size : 0, mtime: st ? st.mtimeMs : 0 }); } } };
  if (!fs.existsSync(root)) return { error: 'not-found' }; walk(root, '', 0); return { files: out.slice(0, 500) };
});
ipcMain.handle('read-file', (e, p) => { const st = fs.statSync(String(p)); if (st.size > 80 * 1048576) throw new Error('too-big'); return fs.readFileSync(String(p)); });
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
