import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { join } from 'path';
import { config } from 'dotenv';
import { GOGElectronAPI } from './gog-api';
import { SteamElectronAPI } from './steam-api';
import { XboxElectronAPI } from './xbox-api';
import { EpicElectronAPI } from './epic-api';
import { AmazonElectronAPI } from './amazon-api';
import { IconCache } from './icon-cache';
import Store from 'electron-store';

// Load environment variables from .env.local (same as web app)
config({ path: join(__dirname, '../../.env.local') });

// Initialize APIs
const gogAPI = new GOGElectronAPI();
const steamAPI = new SteamElectronAPI();
const xboxAPI = new XboxElectronAPI();
const epicAPI = new EpicElectronAPI();
const amazonAPI = new AmazonElectronAPI();
const iconCache = new IconCache();

// Persistent storage
const store = new Store();

let mainWindow: BrowserWindow;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/preload.js'),
      webSecurity: true,
    },
    titleBarStyle: 'default',
    icon: join(__dirname, '../../public/icon.png'), // Add your app icon
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers

// Storage
ipcMain.handle('store:get', (event, key: string) => {
  return store.get(key);
});

ipcMain.handle('store:set', (event, key: string, value: any) => {
  store.set(key, value);
});

ipcMain.handle('store:delete', (event, key: string) => {
  store.delete(key);
});

// GOG API
ipcMain.handle('gog:authenticate', async (event, authCode?: string) => {
  return await gogAPI.authenticate(authCode);
});

ipcMain.handle('gog:getGames', async () => {
  return await gogAPI.getOwnedGames();
});

ipcMain.handle('gog:getUserData', async () => {
  return await gogAPI.getUserData();
});

// Steam API
ipcMain.handle('steam:getGames', async (event, apiKey: string, steamId: string) => {
  return await steamAPI.getOwnedGames(apiKey, steamId);
});

ipcMain.handle('steam:getGameDetails', async (event, apiKey: string, appId: string) => {
  return await steamAPI.getGameDetails(apiKey, appId);
});

// Xbox API
ipcMain.handle('xbox:authenticate', async () => {
  return await xboxAPI.authenticate();
});

ipcMain.handle('xbox:getGames', async (event, tokens: any) => {
  return await xboxAPI.getOwnedGames(tokens);
});

// Epic Games API
ipcMain.handle('epic:authenticate', async () => {
  return await epicAPI.authenticate();
});

ipcMain.handle('epic:submitAuthCode', async (event, code: string) => {
  epicAPI.submitAuthCode(code);
  return { success: true };
});

ipcMain.handle('epic:cancelAuth', async () => {
  epicAPI.cancelAuth();
  return { success: true };
});

ipcMain.handle('epic:getGames', async (event, tokens: any) => {
  return await epicAPI.getOwnedGames(tokens);
});

// Amazon Games API
ipcMain.handle('amazon:authenticate', async () => {
  return await amazonAPI.authenticate();
});

ipcMain.handle('amazon:getGames', async (event, tokens: any) => {
  return await amazonAPI.getOwnedGames(tokens);
});

// File operations
ipcMain.handle('file:showOpenDialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'CSV Files', extensions: ['csv'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

// Clear browser cache
ipcMain.handle('app:clearCache', async () => {
  try {
    await mainWindow.webContents.session.clearCache();
    await mainWindow.webContents.session.clearStorageData();
    console.log('Browser cache and storage cleared successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return { success: false, error: error.message };
  }
});

// Icon cache handlers
ipcMain.handle('iconCache:getOrDownload', async (event, url: string) => {
  return await iconCache.getOrDownloadIcon(url);
});

ipcMain.handle('iconCache:clear', async () => {
  await iconCache.clearCache();
  return { success: true };
});

ipcMain.handle('iconCache:getSize', async () => {
  return await iconCache.getCacheSize();
});

ipcMain.handle('file:showSaveDialog', async (event, defaultPath: string) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath,
    filters: [
      { name: 'JSON Files', extensions: ['json'] },
      { name: 'CSV Files', extensions: ['csv'] }
    ]
  });
  return result;
});

// App info
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:getPlatform', () => {
  return process.platform;
});
