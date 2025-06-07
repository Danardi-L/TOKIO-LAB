const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  startServer: (modelPath, ctxSize, gpuLayers) => ipcRenderer.invoke('start-server', modelPath, ctxSize, gpuLayers),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  selectModel: () => ipcRenderer.invoke('select-model'),
  onServerLog: (callback) => ipcRenderer.on('server-log', (event, log) => callback(log)),
  onServerStopped: (callback) => ipcRenderer.on('server-stopped', (event, code) => callback(code)),
});