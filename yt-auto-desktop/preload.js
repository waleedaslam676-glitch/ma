const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  runScript: (scriptText) => ipcRenderer.invoke('run-script', scriptText),
  stopScript: () => ipcRenderer.invoke('stop-script'),
  nav: (action) => ipcRenderer.invoke('nav', action),
  onLog: (callback) => ipcRenderer.on('script-log', (event, data) => callback(data)),
  onUrlUpdate: (callback) => ipcRenderer.on('url-update', (event, url) => callback(url))
});
