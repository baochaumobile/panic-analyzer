// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('panicAPI', {
  analyze: (filePath) => ipcRenderer.invoke('analyze-panic', filePath),
  analyzeFromUSB: () => ipcRenderer.invoke('analyze-from-usb'),
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
  listDevices: () => ipcRenderer.invoke('list-devices')
});

contextBridge.exposeInMainWorld('updateAPI', {
  checkUpdate: () => ipcRenderer.invoke('update-signatures')
});
