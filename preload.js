const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('kh', {
  saveFile: (name, data) => ipcRenderer.invoke('save-file', name, data),
  showInFolder: p => ipcRenderer.invoke('show-in-folder', p),
  openPath: p => ipcRenderer.invoke('open-path', p),
  dataLoadSync: () => ipcRenderer.sendSync('data-load-sync'),
  promptSync: (m, d) => ipcRenderer.sendSync('prompt-sync', String(m ?? ''), String(d ?? '')),
  dataSave: txt => ipcRenderer.invoke('data-save', txt),
  dataSaveSync: txt => ipcRenderer.sendSync('data-save-sync', txt),
  openDataDir: () => ipcRenderer.invoke('data-dir'),
  listDir: p => ipcRenderer.invoke('list-dir', p),
  readFile: p => ipcRenderer.invoke('read-file', p),
  thumb: (p, w) => ipcRenderer.invoke('thumb', p, w),
  pickDir: () => ipcRenderer.invoke('pick-dir'),
  printHtml: (html, opt) => ipcRenderer.invoke('print-html', html, opt),
  info: () => ipcRenderer.invoke('info'),
  setFeed: (owner, repo) => ipcRenderer.invoke('set-feed', owner, repo),
  checkUpdate: () => ipcRenderer.invoke('check-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdate: cb => ipcRenderer.on('upd', (e, s) => cb(s)),
  onOpenFiles: cb => ipcRenderer.on('open-files', (e, files) => cb(files))
});
