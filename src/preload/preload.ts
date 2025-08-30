import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Storage
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key),
  },

  // GOG API
  gog: {
    authenticate: (authCode?: string) => ipcRenderer.invoke('gog:authenticate', authCode),
    getGames: () => ipcRenderer.invoke('gog:getGames'),
    getUserData: () => ipcRenderer.invoke('gog:getUserData'),
  },

  // Steam API
  steam: {
    getGames: (apiKey: string, steamId: string) => 
      ipcRenderer.invoke('steam:getGames', apiKey, steamId),
    getGameDetails: (apiKey: string, appId: string) => 
      ipcRenderer.invoke('steam:getGameDetails', apiKey, appId),
  },

  // Xbox API
  xbox: {
    authenticate: () => ipcRenderer.invoke('xbox:authenticate'),
    getGames: (tokens: any) => ipcRenderer.invoke('xbox:getGames', tokens),
  },

  // File operations
  file: {
    showOpenDialog: () => ipcRenderer.invoke('file:showOpenDialog'),
    showSaveDialog: (defaultPath: string) => 
      ipcRenderer.invoke('file:showSaveDialog', defaultPath),
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
    clearCache: () => ipcRenderer.invoke('app:clearCache'),
  },

  // Icon cache
  iconCache: {
    getOrDownload: (url: string) => ipcRenderer.invoke('iconCache:getOrDownload', url),
    clear: () => ipcRenderer.invoke('iconCache:clear'),
    getSize: () => ipcRenderer.invoke('iconCache:getSize'),
  },
});
