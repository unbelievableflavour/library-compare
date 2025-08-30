import { BrowserWindow, shell, dialog } from 'electron';
import { spawn } from 'child_process';
import { join } from 'path';
import { platform, arch } from 'os';

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
  private readonly clientId = 'amzn1.application-oa2-client.4b8c9d7e8f5a4c3b2a1d9e8f7c6b5a4d'; // Amazon Games client ID (placeholder)
  private readonly redirectUri = 'https://localhost/auth/amazon/callback';
  private tokens?: AmazonTokens;

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
    // Amazon Games doesn't provide a public OAuth API for third-party applications
    // Unlike Steam or Xbox, Amazon Games requires special partnerships or internal access
    console.log('Amazon Games authentication: Public API not available');
    
    return Promise.reject(new Error(
      'Amazon Games authentication is not available. Amazon Games does not provide a public API for third-party applications to access user libraries. This feature would require a special partnership with Amazon Games.'
    ));
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
      await this.ensureValidTokens();
      
      console.log('Getting Amazon games with valid tokens...');
      console.log('Token info:', {
        hasAccessToken: !!this.tokens.accessToken,
        userId: this.tokens.userId,
        userName: this.tokens.userName
      });

      // Amazon Games API endpoint (this might need adjustment based on actual API)
      const gamesUrl = 'https://gaming.amazon.com/api/v1/user/games';
      
      const response = await fetch(gamesUrl, {
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`,
          'Accept': 'application/json',
          'User-Agent': 'AmazonGamesApp/1.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Amazon games API error:', response.status, errorText);
        
        // If the API endpoint doesn't exist, return empty array for now
        if (response.status === 404) {
          console.log('Amazon Games API endpoint not available, returning empty library');
          return [];
        }
        
        throw new Error(`Amazon games API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Amazon games fetched successfully:', data.games?.length || 0, 'games');
      
      return data.games || [];
    } catch (error) {
      console.error('Error fetching Amazon games:', error);
      // For now, return empty array if there's an error
      // This allows the integration to work even if the API isn't fully available
      console.log('Returning empty Amazon games library due to API limitations');
      return [];
    }
  }

  getTokens(): AmazonTokens | undefined {
    return this.tokens ? { ...this.tokens } : undefined;
  }
}
