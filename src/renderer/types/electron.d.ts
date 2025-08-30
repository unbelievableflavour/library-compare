export interface ElectronAPI {
  store: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
  gog: {
    authenticate: (authCode?: string) => Promise<any>;
    getGames: () => Promise<any[]>;
    getUserData: () => Promise<any>;
  };
  steam: {
    getGames: (apiKey: string, steamId: string) => Promise<any[]>;
    getGameDetails: (apiKey: string, appId: string) => Promise<any>;
  };
  xbox: {
    authenticate: () => Promise<any>;
    getGames: (tokens: any) => Promise<any[]>;
  };
  file: {
    showOpenDialog: () => Promise<any>;
    showSaveDialog: (defaultPath: string) => Promise<any>;
  };
  app: {
    getVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
    clearCache: () => Promise<{ success: boolean; error?: string }>;
  };
  iconCache: {
    getOrDownload: (url: string) => Promise<string | null>;
    clear: () => Promise<{ success: boolean }>;
    getSize: () => Promise<{ files: number; sizeBytes: number }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
