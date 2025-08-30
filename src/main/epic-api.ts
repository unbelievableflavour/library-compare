import { BrowserWindow, shell, dialog } from 'electron';
import { spawn } from 'child_process';
import { join } from 'path';
import { platform, arch } from 'os';

export interface EpicTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  accountId: string;
  displayName?: string;
}

export interface EpicGame {
  catalogItemId: string;
  title: string;
  description?: string;
  developer?: string;
  publisher?: string;
  keyImages?: Array<{
    type: string;
    url: string;
  }>;
  categories?: Array<{
    path: string;
  }>;
  releaseDate?: string;
  lastModifiedDate?: string;
  customAttributes?: Record<string, any>;
}

export class EpicElectronAPI {
  private tokens?: EpicTokens;
  private authCodeResolver?: (code: string) => void;
  private authCodeRejecter?: (error: Error) => void;

  private getLegendaryBinaryPath(): string {
    const currentPlatform = platform();
    const currentArch = arch();
    
    // Map Node.js arch to our binary structure
    const archMap: Record<string, string> = {
      'arm64': 'arm64',
      'x64': 'x64'
    };
    
    const platformMap: Record<string, string> = {
      'darwin': 'darwin',
      'linux': 'linux',
      'win32': 'win32'
    };
    
    const binaryArch = archMap[currentArch] || 'x64';
    const binaryPlatform = platformMap[currentPlatform] || 'darwin';
    const binaryName = currentPlatform === 'win32' ? 'legendary.exe' : 'legendary';
    
    return join(__dirname, '../../public/bin', binaryArch, binaryPlatform, binaryName);
  }

  private isTokenExpired(): boolean {
    if (!this.tokens?.expiresAt) return true;
    return Date.now() >= this.tokens.expiresAt;
  }

  private async ensureValidTokens(): Promise<void> {
    if (this.isTokenExpired() && this.tokens?.refreshToken) {
      console.log('Epic tokens are expired, attempting refresh...');
      this.tokens = await this.refreshTokens(this.tokens.refreshToken);
    }
  }

  async authenticate(): Promise<EpicTokens> {
    console.log('Starting Epic Games authentication with BrowserWindow...');
    
    try {
      // Use the exact same URL as Heroic Games Launcher
      const epicLoginUrl = 'https://legendary.gl/epiclogin';
      
      console.log('Opening Epic Games login in controlled window...');
      console.log('Login URL:', epicLoginUrl);
      
      // Open in controlled BrowserWindow (like Amazon Games)
      const authCode = await this.openEpicAuthWindow(epicLoginUrl);
      console.log('Epic authorization code captured:', authCode);
      
      // Use legendary binary to authenticate with the captured authorization code
      const success = await this.authenticateWithLegendary(authCode);
      
      if (!success) {
        throw new Error('Epic Games authentication failed with legendary');
      }
      
      // Return successful tokens
      const tokens: EpicTokens = {
        accessToken: 'legendary-managed',
        refreshToken: 'legendary-managed',
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
        accountId: 'epic-user',
        displayName: 'Epic Games User'
      };
      
      this.tokens = tokens;
      console.log('Epic Games authentication completed successfully');
      return tokens;
      
    } catch (error) {
      console.error('Epic Games authentication error:', error);
      throw error;
    }
  }

  private async openEpicAuthWindow(authUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      authWindow.loadURL(authUrl);

      // Listen for URL changes to capture the authorization code
      authWindow.webContents.on('will-redirect', (event, navigationUrl) => {
        console.log('Epic auth redirect:', navigationUrl);
        const code = this.extractEpicAuthCode(navigationUrl);
        if (code) {
          authWindow.close();
          resolve(code);
        }
      });

      // Also listen for navigation events
      authWindow.webContents.on('did-navigate', (event, navigationUrl) => {
        console.log('Epic auth navigate:', navigationUrl);
        const code = this.extractEpicAuthCode(navigationUrl);
        if (code) {
          authWindow.close();
          resolve(code);
        }
      });

      // Listen for page title changes (legendary.gl shows the code in the page)
      authWindow.webContents.on('page-title-updated', async (event, title) => {
        console.log('Epic auth page title:', title);
        
        // Check if the page contains an authorization code
        try {
          const pageContent = await authWindow.webContents.executeJavaScript(`
            document.body.innerText || document.body.textContent || ''
          `);
          
          const code = this.extractEpicAuthCodeFromContent(pageContent);
          if (code) {
            authWindow.close();
            resolve(code);
          }
        } catch (error) {
          console.error('Error reading page content:', error);
        }
      });

      authWindow.on('closed', () => {
        reject(new Error('Epic Games authentication window was closed'));
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        if (!authWindow.isDestroyed()) {
          authWindow.close();
          reject(new Error('Epic Games authentication timed out'));
        }
      }, 5 * 60 * 1000);
    });
  }

  private extractEpicAuthCode(url: string): string | null {
    try {
      // Look for authorization code in URL parameters
      const urlObj = new URL(url);
      
      // Check for common Epic Games auth parameters
      const code = urlObj.searchParams.get('code') || 
                   urlObj.searchParams.get('authorization_code') ||
                   urlObj.searchParams.get('sid');
      
      if (code) {
        console.log('Found Epic authorization code in URL:', code);
        return code;
      }
      
      // Also check URL fragments
      const fragment = urlObj.hash;
      if (fragment) {
        const fragmentParams = new URLSearchParams(fragment.substring(1));
        const fragmentCode = fragmentParams.get('code') || 
                            fragmentParams.get('authorization_code') ||
                            fragmentParams.get('sid');
        if (fragmentCode) {
          console.log('Found Epic authorization code in fragment:', fragmentCode);
          return fragmentCode;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting Epic auth code:', error);
      return null;
    }
  }

  private extractEpicAuthCodeFromContent(content: string): string | null {
    try {
      // Look for authorization code patterns in page content
      // legendary.gl typically shows the code in the page after successful auth
      
      // Pattern for SID (Session ID) that Epic Games uses
      const sidMatch = content.match(/(?:SID|sid|authorization[_\s]code)[:\s]*([a-f0-9]{32,})/i);
      if (sidMatch) {
        console.log('Found Epic SID in page content:', sidMatch[1]);
        return sidMatch[1];
      }
      
      // Pattern for general authorization codes
      const codeMatch = content.match(/(?:code|token)[:\s]*([a-zA-Z0-9]{20,})/i);
      if (codeMatch) {
        console.log('Found Epic code in page content:', codeMatch[1]);
        return codeMatch[1];
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting Epic auth code from content:', error);
      return null;
    }
  }

  private async authenticateWithLegendary(authCode: string): Promise<boolean> {
    return new Promise((resolve) => {
      const legendaryPath = this.getLegendaryBinaryPath();
      console.log('Using legendary binary at:', legendaryPath);
      console.log('Authenticating with legendary using authorization code...');
      
      // Use the exact same command as Heroic: legendary auth --code <authCode>
      const process = spawn(legendaryPath, ['auth', '--code', authCode], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        console.log('Legendary auth process finished with code:', code);
        console.log('Legendary stdout:', stdout);
        console.log('Legendary stderr:', stderr);
        
        // Check for success like Heroic does
        if (code === 0 && !stderr.includes('ERROR: Logging in')) {
          console.log('Epic Games authentication successful!');
          resolve(true);
        } else {
          console.error('Epic Games authentication failed:', stderr);
          resolve(false);
        }
      });
      
      process.on('error', (error) => {
        console.error('Failed to start legendary process:', error);
        resolve(false);
      });
    });
  }

  private async waitForAuthCode(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.authCodeResolver = resolve;
      this.authCodeRejecter = reject;
      
      // Set a timeout for the auth code input (5 minutes)
      setTimeout(() => {
        if (this.authCodeRejecter) {
          this.authCodeRejecter(new Error('Authorization code input timeout'));
          this.authCodeResolver = undefined;
          this.authCodeRejecter = undefined;
        }
      }, 5 * 60 * 1000);
    });
  }

  async submitAuthCode(authCode: string): Promise<boolean> {
    console.log('Submitting Epic Games authorization code...');
    
    try {
      // Use legendary binary to authenticate with the provided authorization code
      const success = await this.authenticateWithLegendary(authCode);
      
      if (success) {
        // Update tokens to indicate successful authentication
        this.tokens = {
          accessToken: 'legendary-managed',
          refreshToken: 'legendary-managed',
          expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
          accountId: 'legendary-managed',
          displayName: 'Epic Games User'
        };
        
        console.log('Epic Games authentication completed successfully!');
        return true;
      } else {
        throw new Error('Epic Games authentication failed');
      }
    } catch (error) {
      console.error('Epic Games submitAuthCode error:', error);
      throw error;
    }
  }

  cancelAuth(): void {
    if (this.authCodeRejecter) {
      this.authCodeRejecter(new Error('Epic Games authentication cancelled by user'));
      this.authCodeResolver = undefined;
      this.authCodeRejecter = undefined;
    }
  }

  private async exchangeCodeForTokens(code: string): Promise<EpicTokens> {
    try {
      console.log('Exchanging Epic code for tokens...');
      
      const tokenUrl = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token';
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      });

      // Use basic auth for Epic Games API
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Epic token exchange failed: ${response.status} ${errorText}`);
      }

      const tokenData = await response.json();
      console.log('Epic tokens obtained');

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        accountId: tokenData.account_id,
        displayName: tokenData.displayName,
      };
    } catch (error) {
      console.error('Error exchanging Epic code for tokens:', error);
      throw error;
    }
  }

  async refreshTokens(refreshToken: string): Promise<EpicTokens> {
    try {
      console.log('Refreshing Epic tokens...');
      
      const tokenUrl = 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token';
      
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });

      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error(`Epic token refresh failed: ${response.status}`);
      }

      const tokenData = await response.json();
      
      const newTokens: EpicTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        accountId: tokenData.account_id,
        displayName: tokenData.displayName,
      };
      
      this.tokens = newTokens;
      console.log('Epic tokens refreshed successfully');
      
      return newTokens;
    } catch (error) {
      console.error('Error refreshing Epic tokens:', error);
      throw error;
    }
  }

  async getOwnedGames(tokens: EpicTokens): Promise<EpicGame[]> {
    try {
      this.tokens = tokens;
      
      console.log('Getting Epic games using legendary...');
      
      // Use legendary to get the game library (like Heroic does)
      const games = await this.getGamesWithLegendary();
      
      console.log('Epic games fetched successfully:', games.length, 'games');
      return games;
    } catch (error) {
      console.error('Error fetching Epic games:', error);
      throw error;
    }
  }

  private async getGamesWithLegendary(): Promise<EpicGame[]> {
    return new Promise((resolve) => {
      const legendaryPath = this.getLegendaryBinaryPath();
      console.log('Getting games with legendary binary at:', legendaryPath);
      
      const process = spawn(legendaryPath, ['list', '--json'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        console.log('Legendary list process finished with code:', code);
        
        if (code === 0 && stdout.trim()) {
          try {
            const games = JSON.parse(stdout);
            console.log('Successfully parsed', games.length, 'Epic games from legendary');
            
            // Convert legendary format to our EpicGame format
            const epicGames: EpicGame[] = games.map((game: any) => ({
              catalogItemId: game.app_name,
              title: game.app_title || game.app_name,
              description: game.metadata?.description,
              developer: game.metadata?.developer,
              publisher: game.metadata?.publisher,
              keyImages: game.metadata?.keyImages,
              categories: game.metadata?.categories,
              releaseDate: game.metadata?.releaseDate,
              lastModifiedDate: game.metadata?.lastModifiedDate
            }));
            
            resolve(epicGames);
          } catch (parseError) {
            console.error('Failed to parse legendary games JSON:', parseError);
            console.error('Raw stdout:', stdout);
            resolve([]);
          }
        } else {
          console.error('Legendary list failed:', stderr);
          resolve([]);
        }
      });
      
      process.on('error', (error) => {
        console.error('Failed to start legendary list process:', error);
        resolve([]);
      });
    });
  }

  getTokens(): EpicTokens | undefined {
    return this.tokens ? { ...this.tokens } : undefined;
  }
}
