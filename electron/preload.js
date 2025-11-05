const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('panicAPI', {
  analyze (filePath) = ipcRenderer.invoke('analyze-panic', filePath),
  getSystemTheme () = ipcRenderer.invoke('get-system-theme')
});

contextBridge.exposeInMainWorld('updateAPI', {
  checkUpdate () = ipcRenderer.invoke('update-signatures')
});
