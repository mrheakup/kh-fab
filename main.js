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
    title: 'KH Fab', icon: path.join(__dirname, 'build', 'icon.png'), autoHideMenuBar: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false }
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
ipcMain.handle('info', () => { const c = readCfg(); return { version: app.getVersion(), ghOwner: c.ghOwner || '', ghRepo: c.ghRepo || 'kh-fab', packaged: app.isPackaged, upd: updState }; });
ipcMain.handle('set-feed', (e, owner, repo) => { const c = readCfg(); c.ghOwner = String(owner || '').trim(); c.ghRepo = String(repo || 'kh-fab').trim() || 'kh-fab'; writeCfg(c); checkUpdates(false); return true; });
ipcMain.handle('check-update', () => { checkUpdates(true); return true; });
ipcMain.handle('install-update', () => { setImmediate(() => autoUpdater.quitAndInstall(false, true)); return true; });

app.whenReady().then(() => { createWindow(); setTimeout(() => checkUpdates(false), 4000); setInterval(() => checkUpdates(false), 4 * 3600 * 1000); });
app.on('window-all-closed', () => app.quit());
