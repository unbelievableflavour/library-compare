import { BrowserWindow, app, net } from 'electron';
import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import Store from 'electron-store';

// Create separate stores like Heroic does
const gogConfigStore = new Store({
  name: 'gog-config',
  cwd: 'gog_store'
});

const gogLibraryStore = new Store({
  name: 'gog-library',
  cwd: 'gog_store'
});

// Cache for game details to avoid repeated API calls
const gameDetailsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours like Heroic

export interface GOGCredentials {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  session_id: string;
  refresh_token: string;
  user_id: string;
}

export class GOGElectronAPI {
  private gogdlPath?: string;

  constructor() {
    this.findGogdl();
  }

  private findGogdl(): void {
    // Use bundled gogdl binary like Heroic does
    const publicDir = app.isPackaged 
      ? join(process.resourcesPath, 'app.asar.unpacked', 'public')
      : join(__dirname, '../../public');
    
    // Try arch-specific binary first, fall back to x64
    const archSpecificPath = join(
      publicDir,
      'bin',
      process.arch,
      process.platform,
      process.platform === 'win32' ? 'gogdl.exe' : 'gogdl'
    );
    
    console.log('Checking for gogdl at:', archSpecificPath);
    if (existsSync(archSpecificPath)) {
      this.gogdlPath = archSpecificPath;
      console.log('Found arch-specific gogdl binary at:', archSpecificPath);
      return;
    }
    
    // Fallback to x64 binary
    const x64Path = join(
      publicDir,
      'bin',
      'x64',
      process.platform,
      process.platform === 'win32' ? 'gogdl.exe' : 'gogdl'
    );
    
    console.log('Checking for x64 gogdl at:', x64Path);
    if (existsSync(x64Path)) {
      this.gogdlPath = x64Path;
      console.log('Found x64 gogdl binary at:', x64Path);
      return;
    }
    
    console.warn('gogdl binary not found in bundled resources');
    console.log('Public dir:', publicDir);
    console.log('Process arch:', process.arch);
    console.log('Process platform:', process.platform);
  }

  async authenticate(authCode?: string): Promise<GOGCredentials> {
    if (authCode) {
      // Use provided auth code
      return this.exchangeCodeForTokens(authCode);
    }

    // Open authentication window
    return new Promise((resolve, reject) => {
      const authWindow = new BrowserWindow({
        width: 800,
        height: 900,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
        title: 'GOG Authentication - Library Compare',
        show: false, // Don't show until ready
        center: true,
        resizable: true,
        minimizable: false,
        maximizable: false,
      });

      let isAuthenticating = false;

      const authUrl = 'https://auth.gog.com/auth?' + new URLSearchParams({
        client_id: '46899977096215655',
        redirect_uri: 'https://embed.gog.com/on_login_success?origin=client',
        response_type: 'code',
        layout: 'galaxy'
      });
      
      authWindow.loadURL(authUrl);

      // Show window when ready
      authWindow.once('ready-to-show', () => {
        authWindow.show();
        authWindow.focus();
      });

      // Monitor URL changes
      authWindow.webContents.on('will-redirect', async (event, url) => {
        console.log('Redirect detected:', url);
        
        if (url.includes('embed.gog.com/on_login_success')) {
          if (isAuthenticating) return; // Prevent double processing
          isAuthenticating = true;
          
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          const error = urlObj.searchParams.get('error');

          console.log('Auth result - code:', !!code, 'error:', error);

          if (error) {
            authWindow.close();
            reject(new Error(`GOG authentication failed: ${error}`));
          } else if (code) {
            try {
              console.log('Exchanging code for tokens...');
              const credentials = await this.exchangeCodeForTokens(code);
              
              // Store credentials like Heroic does
              gogConfigStore.set('credentials', credentials);
              gogConfigStore.set('isLoggedIn', true);
              
              authWindow.close();
              resolve(credentials);
            } catch (err) {
              authWindow.close();
              reject(err);
            }
          } else {
            authWindow.close();
            reject(new Error('No authorization code received from GOG'));
          }
        }
      });

      // Also monitor navigation events
      authWindow.webContents.on('did-navigate', (event, url) => {
        if (url.includes('embed.gog.com/on_login_success') && !isAuthenticating) {
          // Trigger the same logic as will-redirect
          authWindow.webContents.emit('will-redirect', event, url);
        }
      });

      authWindow.on('closed', () => {
        if (!isAuthenticating) {
          reject(new Error('Authentication window was closed by user'));
        }
      });

      // Handle window errors
      authWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('Auth window failed to load:', errorCode, errorDescription);
        authWindow.close();
        reject(new Error(`Failed to load authentication page: ${errorDescription}`));
      });
    });
  }

  private async exchangeCodeForTokens(code: string): Promise<GOGCredentials> {
    // Prioritize gogdl since we have it bundled like Heroic
    if (this.gogdlPath) {
      console.log('Using bundled gogdl for authentication...');
      return this.authenticateWithGogdl(code);
    }

    // Fallback to direct API call (likely to fail due to CORS/client restrictions)
    console.log('gogdl not available, trying direct API call...');
    try {
      const response = await fetch('https://auth.gog.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'LibraryCompare-Electron/1.0',
        },
        body: new URLSearchParams({
          client_id: '46899977096215655',
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: 'https://embed.gog.com/on_login_success?origin=client',
        }),
      });

      if (response.ok) {
        const tokens = await response.json() as GOGCredentials;
        return tokens;
      } else {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Direct token exchange failed:', error);
      throw new Error('Unable to exchange authorization code for tokens');
    }
  }

  private async authenticateWithGogdl(code: string): Promise<GOGCredentials> {
    return new Promise((resolve, reject) => {
      console.log('Starting gogdl authentication with path:', this.gogdlPath);
      console.log('Auth code length:', code.length);
      
      // Create auth config path like Heroic does
      const authConfigPath = join(dirname(gogConfigStore.path), 'auth.json');
      console.log('Auth config path:', authConfigPath);
      
      // Ensure the directory exists
      const authConfigDir = dirname(authConfigPath);
      if (!existsSync(authConfigDir)) {
        mkdirSync(authConfigDir, { recursive: true });
        console.log('Created auth config directory:', authConfigDir);
      }
      
      const process = spawn(this.gogdlPath!, [
        '--auth-config-path', authConfigPath,
        'auth', '--code', code
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        const chunk = data.toString();
        console.log('gogdl stdout:', chunk);
        output += chunk;
      });

      process.stderr.on('data', (data) => {
        const chunk = data.toString();
        console.log('gogdl stderr:', chunk);
        errorOutput += chunk;
      });

      process.on('error', (error) => {
        console.error('gogdl process error:', error);
        reject(new Error(`Failed to start gogdl: ${error.message}`));
      });

      process.on('close', (exitCode) => {
        console.log('gogdl process closed with code:', exitCode);
        console.log('Final output:', output);
        console.log('Final error output:', errorOutput);
        
        if (exitCode === 0) {
          try {
            const trimmedOutput = output.trim();
            if (!trimmedOutput) {
              reject(new Error('gogdl returned empty output'));
              return;
            }
            
            const credentials = JSON.parse(trimmedOutput);
            console.log('Successfully parsed credentials from gogdl');
            resolve(credentials);
          } catch (error) {
            console.error('Failed to parse gogdl output:', error);
            reject(new Error(`Failed to parse gogdl output: ${error}. Output was: ${output}`));
          }
        } else {
          reject(new Error(`gogdl auth failed with exit code ${exitCode}: ${errorOutput || 'No error output'}`));
        }
      });
    });
  }

  async getOwnedGames(): Promise<any[]> {
    const credentials = gogConfigStore.get('credentials') as GOGCredentials;
    
    if (!credentials) {
      throw new Error('Not authenticated with GOG');
    }

    // Use Galaxy API like Heroic does (not gogdl for listing games)
    return this.getGamesWithAPI(credentials);
  }

  private async getGamesWithGogdl(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const process = spawn(this.gogdlPath!, ['list', '--json']);
      
      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          try {
            const games = JSON.parse(output.trim());
            resolve(games);
          } catch (error) {
            reject(new Error(`Failed to parse gogdl output: ${error}`));
          }
        } else {
          reject(new Error(`gogdl list failed: ${errorOutput}`));
        }
      });
    });
  }

  private async getGamesWithAPI(credentials: GOGCredentials): Promise<any[]> {
    // Use Galaxy Library API like Heroic does with Electron's net module
    const url = `https://galaxy-library.gog.com/users/${credentials.user_id}/releases`;
    
    const libraryEntries = await new Promise<any[]>((resolve, reject) => {
      const request = net.request(url);
      
      request.setHeader('Authorization', `Bearer ${credentials.access_token}`);
      request.setHeader('User-Agent', 'LibraryCompare-Electron/1.0');
      
      request.on('response', (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            if (response.statusCode !== 200) {
              throw new Error(`GOG Galaxy API error: ${response.statusCode} ${response.statusMessage}`);
            }
            
            const parsedData = JSON.parse(data);
            resolve(parsedData.items || []);
          } catch (error) {
            reject(error);
          }
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      request.end();
    });

    // Filter for GOG platform games and get full details for each
    const gogGames = libraryEntries.filter((entry: any) => entry.platform_id === 'gog');
    const gamesWithDetails = [];

    for (const game of gogGames) {
      try {
        const gameDetails = await this.getGameDetails(game.external_id, credentials.access_token, game.certificate);
        if (gameDetails && gameDetails.title) {
          // Handle localized titles - extract the appropriate language or fallback
          let title = gameDetails.title;
          if (typeof title === 'object' && title !== null) {
            // Try to get English title first, then any available language
            title = title['en-US'] || title['en'] || title['*'] || Object.values(title)[0] || `GOG Game ${game.external_id}`;
          }
          
          gamesWithDetails.push({
            id: game.external_id,
            title: title,
            platform: 'GOG',
            external_id: game.external_id,
            owned_since: game.owned_since,
            ...gameDetails
          });
        }
      } catch (error) {
        console.error(`Failed to get details for GOG game ${game.external_id}:`, error);
        // Add game with basic info even if details fail
        gamesWithDetails.push({
          id: game.external_id,
          title: `GOG Game ${game.external_id}`,
          platform: 'GOG',
          external_id: game.external_id,
          owned_since: game.owned_since
        });
      }
    }

    return gamesWithDetails;
  }

  private async getGameDetails(gameId: string, accessToken: string, certificate?: string): Promise<any> {
    // Use GamesDB API like Heroic does to get full game details
    const url = `https://gamesdb.gog.com/platforms/gog/external_releases/${gameId}`;
    
    return new Promise((resolve, reject) => {
      const request = net.request(url);
      
      request.setHeader('Authorization', `Bearer ${accessToken}`);
      request.setHeader('User-Agent', 'LibraryCompare-Electron/1.0');
      if (certificate) {
        request.setHeader('X-GOG-Library-Cert', certificate);
      }
      
      request.on('response', (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            if (response.statusCode !== 200) {
              if (response.statusCode === 404) {
                // Game not found in GamesDB, return null
                resolve(null);
                return;
              }
              throw new Error(`GOG GamesDB API error: ${response.statusCode} ${response.statusMessage}`);
            }
            
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (error) {
            reject(error);
          }
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      request.end();
    });
  }

  async getUserData(): Promise<any> {
    const credentials = gogConfigStore.get('credentials') as GOGCredentials;
    
    if (!credentials) {
      throw new Error('Not authenticated with GOG');
    }

    return new Promise((resolve, reject) => {
      const request = net.request('https://embed.gog.com/userData.json');
      
      request.setHeader('Authorization', `Bearer ${credentials.access_token}`);
      request.setHeader('User-Agent', 'LibraryCompare-Electron/1.0');
      
      request.on('response', (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          try {
            if (response.statusCode !== 200) {
              throw new Error(`GOG API error: ${response.statusCode} ${response.statusMessage}`);
            }
            
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (error) {
            reject(error);
          }
        });
      });
      
      request.on('error', (error) => {
        reject(error);
      });
      
      request.end();
    });
  }
}
