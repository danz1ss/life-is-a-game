const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('lifeGame', {
  loadState: () => ipcRenderer.invoke('state:load'),
  saveState: (state) => ipcRenderer.invoke('state:save', state),
  exportBackup: (state) => ipcRenderer.invoke('backup:export', state),
  importBackup: () => ipcRenderer.invoke('backup:import'),
  getStorageInfo: () => ipcRenderer.invoke('storage:info'),
  onBeforeClose: (flush) => {
    const listener = async () => {
      let saved = false
      try { saved = await flush() } catch { /* Keep the window open if saving fails. */ }
      ipcRenderer.send('window:save-finished', saved === true)
    }
    ipcRenderer.on('window:before-close', listener)
    ipcRenderer.send('window:save-ready')
    return () => ipcRenderer.removeListener('window:before-close', listener)
  },
})
