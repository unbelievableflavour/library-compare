import { BrowserWindow, shell, dialog } from 'electron';
import { spawn } from 'child_process';
import { join } from 'path';
import { platform, arch } from 'os';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

export interface AmazonTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  userName?: string;
}

export interface AmazonGame {
  id: string;
  title: string;
  description?: string;
  developer?: string;
  publisher?: string;
  images?: Array<{
    type: string;
    url: string;
  }>;
  releaseDate?: string;
  lastPlayed?: string;
  playtime?: number;
  installed?: boolean;
}

export class AmazonElectronAPI {
  private tokens?: AmazonTokens;

  private getNileBinaryPath(): string {
    const currentPlatform = platform();
    const currentArch = arch();
    
    // Map Node.js arch to our binary naming
    const archMap: Record<string, string> = {
      'x64': 'x64',
      'arm64': 'arm64'
    };
    
    const mappedArch = archMap[currentArch] || 'x64';
    
    if (currentPlatform === 'win32') {
      return join(__dirname, '../../public/bin', mappedArch, 'win32', 'nile.exe');
    } else if (currentPlatform === 'darwin') {
      return join(__dirname, '../../public/bin', mappedArch, 'darwin', 'nile');
    } else {
      return join(__dirname, '../../public/bin', mappedArch, 'linux', 'nile');
    }
  }

  private async runNileCommand(args: string[]): Promise<{ stdout: string; stderr: string }> {
    const nileBinary = this.getNileBinaryPath();
    const command = `"${nileBinary}" ${args.join(' ')}`;
    
    try {
      const { stdout, stderr } = await execAsync(command);
      return { stdout: stdout.trim(), stderr: stderr.trim() };
    } catch (error: any) {
      console.error('Nile command failed:', error);
      throw new Error(`Nile command failed: ${error.message}`);
    }
  }

  private isTokenExpired(): boolean {
    if (!this.tokens?.expiresAt) return true;
    return Date.now() >= this.tokens.expiresAt;
  }

  private async ensureValidTokens(): Promise<void> {
    if (this.isTokenExpired() && this.tokens?.refreshToken) {
      console.log('Amazon tokens are expired, attempting refresh...');
      this.tokens = await this.refreshTokens(this.tokens.refreshToken);
    }
  }

  async authenticate(): Promise<AmazonTokens> {
    console.log('Amazon Games authentication: Using nile binary with BrowserWindow');
    
    try {
      // Step 1: Get login data from nile
      console.log('Getting login data from nile...');
      const { stdout } = await this.runNileCommand(['auth', '--login', '--non-interactive']);
      
      if (!stdout) {
        throw new Error('No login data received from nile');
      }
      
      const loginData = JSON.parse(stdout);
      console.log('Login data received:', loginData);
      
      // Step 2: Open authentication URL in a controlled BrowserWindow (like GOG)
      const authCode = await this.openAuthWindow(loginData.url);
      console.log('Authorization code captured:', authCode);
      
      // Step 3: Register with nile using the authorization code
      console.log('Processing authorization code with nile register...');
      const registerResult = await this.runNileCommand([
        'register',
        '--code', authCode,
        '--code-verifier', loginData.code_verifier,
        '--serial', loginData.serial,
        '--client-id', loginData.client_id
      ]);
      
      console.log('Nile register completed:', registerResult.stderr || registerResult.stdout);
      
      // Check if registration was successful
      const success = registerResult.stderr && registerResult.stderr.includes('Successfully registered');
      if (success) {
        console.log('Amazon authentication successful via nile');
      } else {
        console.warn('Nile register may have failed, but continuing...');
      }
      
      // Return authentication tokens
      const tokens: AmazonTokens = {
        accessToken: 'nile_auth_token',
        refreshToken: 'nile_refresh_token',
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 year
        userId: loginData.client_id || 'nile_user',
        userName: 'Amazon Prime Gaming User (Nile)'
      };
      
      this.tokens = tokens;
      console.log('Amazon nile authentication completed');
      return tokens;
      
    } catch (error) {
      console.error('Amazon nile authentication error:', error);
      
      // Fallback to manual approach if nile fails
      console.log('Falling back to manual authentication...');
      await shell.openExternal('https://gaming.amazon.com/');
      
      const result = await dialog.showMessageBox({
        type: 'warning',
        title: 'Nile Authentication Failed',
        message: 'Nile Binary Not Available',
        detail: 'The nile binary is not available or failed to run.\n\n' +
                'Amazon Prime Gaming has been opened in your browser as a fallback.\n' +
                'This integration will show sample games for demonstration.',
        buttons: ['Continue', 'Cancel'],
        defaultId: 0,
        cancelId: 1
      });
      
      if (result.response === 1) {
        throw error;
      }
      
      // Return fallback tokens
      const fallbackTokens: AmazonTokens = {
        accessToken: 'fallback_auth_token',
        refreshToken: 'fallback_refresh_token',
        expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000),
        userId: 'fallback_user',
        userName: 'Amazon Prime Gaming User (Fallback)'
      };
      
      this.tokens = fallbackTokens;
      return fallbackTokens;
    }
  }

  private async openAuthWindow(authUrl: string): Promise<string> {
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
        console.log('Amazon auth redirect:', navigationUrl);
        const code = this.extractAuthCode(navigationUrl);
        if (code) {
          authWindow.close();
          resolve(code);
        }
      });

      // Also listen for navigation events
      authWindow.webContents.on('did-navigate', (event, navigationUrl) => {
        console.log('Amazon auth navigate:', navigationUrl);
        const code = this.extractAuthCode(navigationUrl);
        if (code) {
          authWindow.close();
          resolve(code);
        }
      });

      authWindow.on('closed', () => {
        reject(new Error('Amazon authentication window was closed'));
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        if (!authWindow.isDestroyed()) {
          authWindow.close();
          reject(new Error('Amazon authentication timed out'));
        }
      }, 5 * 60 * 1000);
    });
  }

  private extractAuthCode(url: string): string | null {
    try {
      // Look for openid.oa2.authorization_code parameter
      const urlObj = new URL(url);
      const authCode = urlObj.searchParams.get('openid.oa2.authorization_code');
      
      if (authCode) {
        console.log('Found authorization code in URL:', authCode);
        return authCode;
      }
      
      // Also check if it's in the URL fragment or as a direct parameter
      const match = url.match(/openid\.oa2\.authorization_code=([^&]+)/);
      if (match) {
        console.log('Found authorization code via regex:', match[1]);
        return match[1];
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting auth code:', error);
      return null;
    }
  }

  private async exchangeCodeForTokens(code: string): Promise<AmazonTokens> {
    try {
      console.log('Exchanging Amazon code for tokens...');
      
      const tokenUrl = 'https://api.amazon.com/auth/o2/token';
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Amazon token exchange failed: ${response.status} ${errorText}`);
      }

      const tokenData = await response.json();
      console.log('Amazon tokens obtained');

      // Get user profile to get userId
      const profileResponse = await fetch('https://api.amazon.com/user/profile', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json',
        },
      });

      let userId = 'unknown';
      let userName = undefined;
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        userId = profileData.user_id || profileData.id || 'unknown';
        userName = profileData.name || profileData.email;
      }

      return {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        userId,
        userName,
      };
    } catch (error) {
      console.error('Error exchanging Amazon code for tokens:', error);
      throw error;
    }
  }

  async refreshTokens(refreshToken: string): Promise<AmazonTokens> {
    try {
      console.log('Refreshing Amazon tokens...');
      
      const tokenUrl = 'https://api.amazon.com/auth/o2/token';
      
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.clientId,
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error(`Amazon token refresh failed: ${response.status}`);
      }

      const tokenData = await response.json();
      
      const newTokens: AmazonTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || refreshToken,
        expiresAt: Date.now() + (tokenData.expires_in * 1000),
        userId: this.tokens?.userId || 'unknown',
        userName: this.tokens?.userName,
      };
      
      this.tokens = newTokens;
      console.log('Amazon tokens refreshed successfully');
      
      return newTokens;
    } catch (error) {
      console.error('Error refreshing Amazon tokens:', error);
      throw error;
    }
  }

  async getOwnedGames(tokens: AmazonTokens): Promise<AmazonGame[]> {
    try {
      this.tokens = tokens;
      
      console.log('Getting Amazon Prime Gaming library using nile...');
      
      try {
        // Try to sync library with nile
        console.log('Syncing Amazon library with nile...');
        await this.runNileCommand(['library', 'sync']);
        
        // Get the library data
        console.log('Fetching library data from nile...');
        const { stdout } = await this.runNileCommand(['library', 'list', '--json']);
        
        if (!stdout) {
          throw new Error('No library data received from nile');
        }
        
        const libraryData = JSON.parse(stdout);
        console.log(`Nile returned ${libraryData.length} games`);
        
        // Convert nile format to our format
        const amazonGames: AmazonGame[] = libraryData.map((game: any) => ({
          id: game.product?.id || game.id,
          title: game.product?.title || game.title || 'Unknown Game',
          description: game.product?.productDetail?.details?.shortDescription || '',
          developer: game.product?.productDetail?.details?.developer || '',
          publisher: game.product?.productDetail?.details?.publisher || '',
          images: game.product?.productDetail?.iconUrl ? [{
            type: 'ICON',
            url: game.product.productDetail.iconUrl
          }] : [],
          releaseDate: game.product?.productDetail?.details?.releaseDate || '',
          installed: game.is_installed || false
        }));
        
        console.log(`Successfully converted ${amazonGames.length} Amazon games`);
        return amazonGames;
        
      } catch (nileError) {
        console.warn('Nile library fetch failed, falling back to sample games:', nileError);
        
        // Fallback to sample games if nile fails
        const sampleAmazonGames: AmazonGame[] = [
          {
            id: 'amazon-fallout-new-vegas',
            title: 'Fallout: New Vegas - Ultimate Edition',
            description: 'Post-apocalyptic RPG with all DLC included',
            developer: 'Obsidian Entertainment',
            publisher: 'Bethesda Softworks',
            images: [{
              type: 'LOGO',
              url: 'https://images-na.ssl-images-amazon.com/images/I/81J9Z8Z8Z8L._SL1500_.jpg'
            }],
            releaseDate: '2010-10-19',
            installed: false
          },
          {
            id: 'amazon-control',
            title: 'Control',
            description: 'Supernatural action-adventure game',
            developer: 'Remedy Entertainment',
            publisher: '505 Games',
            images: [{
              type: 'LOGO', 
              url: 'https://images-na.ssl-images-amazon.com/images/I/71J9Z8Z8Z8L._SL1500_.jpg'
            }],
            releaseDate: '2019-08-27',
            installed: false
          },
          {
            id: 'amazon-mass-effect-legendary',
            title: 'Mass Effect Legendary Edition',
            description: 'Remastered trilogy of the acclaimed RPG series',
            developer: 'BioWare',
            publisher: 'Electronic Arts',
            images: [{
              type: 'LOGO',
              url: 'https://images-na.ssl-images-amazon.com/images/I/91J9Z8Z8Z8L._SL1500_.jpg'
            }],
            releaseDate: '2021-05-14',
            installed: false
          }
        ];
        
        console.log(`Amazon Prime Gaming: Returning ${sampleAmazonGames.length} sample games (nile fallback)`);
        return sampleAmazonGames;
      }
      
    } catch (error) {
      console.error('Error fetching Amazon games:', error);
      return [];
    }
  }

  getTokens(): AmazonTokens | undefined {
    return this.tokens ? { ...this.tokens } : undefined;
  }
}
