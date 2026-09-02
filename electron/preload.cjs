const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('lifeGame', {
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (state) => ipcRenderer.invoke('state:save', state),
  exportBackup: (state) => ipcRenderer.invoke('backup:export', state),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  getStorageInfo: () => ipcRenderer.invoke('storage:info'),
})
