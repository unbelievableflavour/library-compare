import { BrowserWindow } from 'electron';

export interface XboxTokens {
  userToken: string;
  xstsToken: string;
  uhs: string;
  xuid?: string;
  gamertag?: string;
  refreshToken?: string;
  expiresOn?: string;
  accessToken?: string;
}

export interface XboxGame {
  titleId: string;
  name: string;
  images?: Array<{
    url: string;
    type: string;
  }>;
  description?: string;
  publisher?: string;
  developer?: string;
  category?: string;
  isBundle?: boolean;
  achievements?: {
    currentAchievements: number;
    totalAchievements: number;
  };
  gamerscore?: {
    currentGamerscore: number;
    totalGamerscore: number;
  };
  lastPlayed?: string;
  playtime?: number;
}

export class XboxElectronAPI {
  private readonly clientId: string;
  private readonly redirectUri = 'https://login.live.com/oauth20_desktop.srf'; // Keep desktop redirect for Electron
  private readonly scope = 'XboxLive.signin XboxLive.offline_access';
  private tokens?: XboxTokens;

  constructor() {
    this.clientId = process.env.XBOX_CLIENT_ID || '000000004C12AE6F';
    console.log('Xbox Client ID loaded:', this.clientId.substring(0, 8) + '...');
    if (!process.env.XBOX_CLIENT_ID) {
      console.warn('XBOX_CLIENT_ID environment variable not set, using default Xbox Live client ID');
    }
  }

  private isTokenExpired(): boolean {
    if (!this.tokens?.expiresOn) return false;
    
    const expirationDate = new Date(this.tokens.expiresOn);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    
    return (expirationDate.getTime() - now.getTime()) < bufferTime;
  }

  private async ensureValidTokens(): Promise<void> {
    if (this.isTokenExpired() && this.tokens?.refreshToken) {
      console.log('Xbox tokens are expired, attempting refresh...');
      this.tokens = await this.refreshTokens(this.tokens.refreshToken);
    }
  }

  async authenticate(): Promise<XboxTokens> {
    return new Promise((resolve, reject) => {
      const state = Math.random().toString(36).substring(2, 15);
      
      // Use login.live.com endpoint like your working web app
      const authUrl = new URL('https://login.live.com/oauth20_authorize.srf');
      authUrl.searchParams.set('client_id', this.clientId);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', this.redirectUri);
      authUrl.searchParams.set('scope', this.scope);
      authUrl.searchParams.set('state', state);

      const authWindow = new BrowserWindow({
        width: 800,
        height: 900,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
        title: 'Xbox Live Authentication - Library Compare',
        show: false,
        center: true,
        resizable: true,
        minimizable: false,
        maximizable: false,
      });

      let isAuthenticating = false;

      authWindow.loadURL(authUrl.toString());

      authWindow.once('ready-to-show', () => {
        authWindow.show();
        authWindow.focus();
      });

      authWindow.webContents.on('will-redirect', async (event, url) => {
        console.log('Xbox auth redirect detected:', url);
        
        if (url.includes('login.live.com/oauth20_desktop.srf')) {
          if (isAuthenticating) return;
          isAuthenticating = true;
          
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          const error = urlObj.searchParams.get('error');
          const returnedState = urlObj.searchParams.get('state');

          if (error) {
            authWindow.close();
            reject(new Error(`Xbox authentication failed: ${error}`));
          } else if (code && returnedState === state) {
            try {
              console.log('Processing Xbox OAuth callback...');
              const tokens = await this.handleOAuthCallback(code);
              this.tokens = tokens;
              authWindow.close();
              resolve(tokens);
            } catch (err) {
              authWindow.close();
              reject(err);
            }
          } else {
            authWindow.close();
            reject(new Error('Invalid Xbox authentication response'));
          }
        }
      });

      authWindow.webContents.on('did-navigate', (event, url) => {
        if (url.includes('login.live.com/oauth20_desktop.srf') && !isAuthenticating) {
          authWindow.webContents.emit('will-redirect', event, url);
        }
      });

      authWindow.on('closed', () => {
        if (!isAuthenticating) {
          reject(new Error('Xbox authentication window was closed by user'));
        }
      });
    });
  }

  private async handleOAuthCallback(code: string): Promise<XboxTokens> {
    try {
      console.log('Step 1: Exchanging code for access token...');
      
      // Step 1: Exchange code for access token (like your web app's /api/xbox/callback)
      const tokenUrl = 'https://login.live.com/oauth20_token.srf';
      
      const params = new URLSearchParams({
        client_id: this.clientId,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
      }

      const tokenData = await response.json();
      console.log('Access token obtained');

      // Step 2: Get Xbox Live tokens (like your web app's server-side logic)
      console.log('Step 2: Getting Xbox Live tokens...');
      const xboxTokens = await this.getXboxTokens(tokenData.access_token);
      
      // Store refresh token for later use
      xboxTokens.refreshToken = tokenData.refresh_token;
      xboxTokens.expiresOn = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
      
      return xboxTokens;
    } catch (error) {
      console.error('Error in OAuth callback:', error);
      throw error;
    }
  }

  private async getXboxTokens(accessToken: string): Promise<XboxTokens> {
    try {
      // Step 1: Get Xbox Live User Token
      console.log('Getting Xbox Live user token...');
      const userTokenResponse = await fetch('https://user.auth.xboxlive.com/user/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          Properties: {
            AuthMethod: 'RPS',
            SiteName: 'user.auth.xboxlive.com',
            RpsTicket: `d=${accessToken}`,
          },
          RelyingParty: 'http://auth.xboxlive.com',
          TokenType: 'JWT',
        }),
      });

      if (!userTokenResponse.ok) {
        const errorText = await userTokenResponse.text();
        console.error('Xbox Live user token error:', errorText);
        console.error('User token request body:', JSON.stringify({
          Properties: {
            AuthMethod: 'RPS',
            SiteName: 'user.auth.xboxlive.com',
            RpsTicket: `d=${accessToken}`,
          },
          RelyingParty: 'http://auth.xboxlive.com',
          TokenType: 'JWT',
        }, null, 2));
        throw new Error(`Xbox Live user token failed: ${userTokenResponse.status} - ${errorText}`);
      }

      const userTokenData = await userTokenResponse.json();
      const userToken = userTokenData.Token;
      console.log('Xbox Live user token obtained');

      // Step 2: Get XSTS Token
      console.log('Getting XSTS token...');
      const xstsResponse = await fetch('https://xsts.auth.xboxlive.com/xsts/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          Properties: {
            SandboxId: 'RETAIL',
            UserTokens: [userToken],
          },
          RelyingParty: 'http://xboxlive.com',
          TokenType: 'JWT',
        }),
      });

      if (!xstsResponse.ok) {
        const errorText = await xstsResponse.text();
        console.error('XSTS error response:', errorText);
        console.error('XSTS request headers:', {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        });
        console.error('XSTS request body:', JSON.stringify({
          Properties: {
            SandboxId: 'RETAIL',
            UserTokens: [userToken],
          },
          RelyingParty: 'http://xboxlive.com',
          TokenType: 'JWT',
        }, null, 2));
        
        // Try to parse error response
        try {
          const errorData = JSON.parse(errorText);
          console.error('Parsed XSTS error:', errorData);
          if (errorData.XErr) {
            console.error('Xbox Error Code:', errorData.XErr);
          }
        } catch (parseError) {
          console.error('Could not parse XSTS error response:', parseError);
        }
        
        throw new Error(`XSTS token failed: ${xstsResponse.status} - ${errorText}`);
      }

      const xstsData = await xstsResponse.json();
      const xstsToken = xstsData.Token;
      const uhs = xstsData.DisplayClaims.xui[0].uhs;
      const xuid = xstsData.DisplayClaims.xui[0].xid;
      const gamertag = xstsData.DisplayClaims.xui[0].gtg;

      console.log('XSTS token obtained, user:', gamertag);

      return {
        userToken,
        xstsToken,
        uhs,
        xuid,
        gamertag,
        accessToken,
      };
    } catch (error) {
      console.error('Error getting Xbox tokens:', error);
      throw error;
    }
  }

  async refreshTokens(refreshToken: string): Promise<XboxTokens> {
    try {
      console.log('Refreshing Xbox tokens...');
      
      const tokenUrl = 'https://login.live.com/oauth20_token.srf';
      
      const params = new URLSearchParams({
        client_id: this.clientId,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      });

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const tokenData = await response.json();
      
      // Get new Xbox tokens with refreshed access token
      const xboxTokens = await this.getXboxTokens(tokenData.access_token);
      xboxTokens.refreshToken = tokenData.refresh_token || refreshToken;
      xboxTokens.expiresOn = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
      
      this.tokens = xboxTokens;
      console.log('Xbox tokens refreshed successfully');
      
      return xboxTokens;
    } catch (error) {
      console.error('Error refreshing Xbox tokens:', error);
      throw error;
    }
  }

  async getOwnedGames(tokens: XboxTokens): Promise<XboxGame[]> {
    try {
      this.tokens = tokens;
      await this.ensureValidTokens();
      
      console.log('Getting Xbox games with valid tokens...');
      console.log('Token info:', {
        hasUserToken: !!this.tokens.userToken,
        hasXstsToken: !!this.tokens.xstsToken,
        hasUhs: !!this.tokens.uhs,
        gamertag: this.tokens.gamertag,
        xuid: this.tokens.xuid
      });

      // Use the exact same endpoint and headers as the working web app
      if (!this.tokens.xuid) {
        throw new Error('Xbox User ID (XUID) not available in tokens');
      }

      const titleHistoryUrl = `https://titlehub.xboxlive.com/users/xuid(${this.tokens.xuid})/titles/titlehistory/decoration/detail`;
      console.log('Requesting games from:', titleHistoryUrl);
      
      const response = await fetch(titleHistoryUrl, {
        headers: {
          'Authorization': `XBL3.0 x=${this.tokens.uhs};${this.tokens.xstsToken}`,
          'X-XBL-Contract-Version': '2',
          'Accept': 'application/json',
          'Accept-Language': 'en-US',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Xbox games API error:', response.status, errorText);
        throw new Error(`Xbox games API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Xbox games fetched successfully:', data.titles?.length || 0, 'games');
      
      return data.titles || [];
    } catch (error) {
      console.error('Error fetching Xbox games:', error);
      throw error;
    }
  }

  getTokens(): XboxTokens | undefined {
    return this.tokens ? { ...this.tokens } : undefined;
  }
}
