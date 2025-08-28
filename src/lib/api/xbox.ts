import { XboxGame, Game } from '@/types/game';

interface XboxTokens {
  userToken: string;
  xstsToken: string;
  uhs: string;
  xuid?: string;
  gamertag?: string;
  refreshToken?: string;
  expiresOn?: string;
  accessToken?: string;
}

export class XboxAPI {
  private tokens: XboxTokens;

  constructor(tokens: XboxTokens) {
    this.tokens = tokens;
  }

  private isTokenExpired(): boolean {
    if (!this.tokens.expiresOn) return false;
    
    const expirationDate = new Date(this.tokens.expiresOn);
    const now = new Date();
    // Check if token expires within the next 5 minutes to be safe
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    return (expirationDate.getTime() - now.getTime()) < bufferTime;
  }

  private async refreshTokens(): Promise<XboxTokens> {
    if (!this.tokens.refreshToken) {
      throw new Error('No refresh token available. Please re-authenticate.');
    }

    try {
      console.log('Refreshing Xbox tokens...');
      
      // Step 1: Use refresh token to get new access token
      const refreshResponse = await fetch('/api/xbox/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.tokens.refreshToken }),
      });

      if (!refreshResponse.ok) {
        throw new Error('Failed to refresh access token');
      }

      const refreshData = await refreshResponse.json();
      
      // Update tokens with new values
      this.tokens = {
        ...this.tokens,
        ...refreshData.tokens
      };

      console.log('Xbox tokens refreshed successfully');
      return this.tokens;
    } catch (error) {
      console.error('Error refreshing Xbox tokens:', error);
      throw new Error('Token refresh failed. Please re-authenticate.');
    }
  }

  private async ensureValidTokens(): Promise<void> {
    if (this.isTokenExpired()) {
      console.log('Xbox tokens are expired, attempting refresh...');
      await this.refreshTokens();
    }
  }

  static async startOAuthFlow(): Promise<{ authUrl?: string; error?: string; setup?: any }> {
    try {
      const response = await fetch('/api/xbox/auth');
      
      if (!response.ok) {
        throw new Error('Failed to start OAuth flow');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error starting Xbox OAuth flow:', error);
      throw error;
    }
  }

  static async handleOAuthCallback(code: string): Promise<XboxTokens> {
    try {
      const response = await fetch(`/api/xbox/callback?code=${encodeURIComponent(code)}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'OAuth callback failed');
      }

      const data = await response.json();
      return data.tokens;
    } catch (error) {
      console.error('Error handling Xbox OAuth callback:', error);
      throw error;
    }
  }

  async getOwnedGames(): Promise<Game[]> {
    try {
      // Ensure tokens are valid before making the request
      await this.ensureValidTokens();

      console.log('Xbox API: Sending request with tokens:', {
        hasUserToken: !!this.tokens.userToken,
        hasXstsToken: !!this.tokens.xstsToken,
        hasUhs: !!this.tokens.uhs,
        hasXuid: !!this.tokens.xuid,
        xuid: this.tokens.xuid,
        expiresOn: this.tokens.expiresOn
      });

      const response = await fetch('/api/xbox/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tokens: this.tokens
        }),
      });

      console.log('Xbox API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.log('Xbox API error data:', errorData);
        throw new Error(errorData.error || `Xbox API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Xbox API success data:', { titlesCount: data.titles?.length, userInfo: data.user });
      return data.titles?.map((title: any) => this.transformXboxTitle(title)) || [];
    } catch (error) {
      console.error('Error fetching Xbox games:', error);
      throw error;
    }
  }

  // Get current tokens (useful after refresh)
  getTokens(): XboxTokens {
    return { ...this.tokens };
  }

  private transformXboxTitle(xboxTitle: any): Game {
    return {
      id: `xbox-${xboxTitle.titleId || Math.random().toString()}`,
      name: xboxTitle.name || 'Unknown Game',
      platforms: [{
        name: 'Xbox',
        owned: true,
      }],
      appId: {
        xbox: xboxTitle.titleId,
      },
      images: {
        header: xboxTitle.displayImage,
        icon: xboxTitle.displayImage,
      },
      releaseDate: undefined,
      genres: [],
      lastPlayed: xboxTitle.lastPlayed,
    };
  }

  // Keep the old method for backwards compatibility
  private transformXboxGame(xboxGame: XboxGame): Game {
    const headerImage = xboxGame.images?.find(img => 
      img.type === 'BoxArt' || img.type === 'Hero'
    )?.url;

    const iconImage = xboxGame.images?.find(img => 
      img.type === 'Icon'
    )?.url;

    return {
      id: `xbox-${xboxGame.titleId}`,
      name: xboxGame.name,
      platforms: [{
        name: 'Xbox',
        owned: true,
      }],
      appId: {
        xbox: xboxGame.titleId,
      },
      images: {
        header: headerImage,
        icon: iconImage,
      },
      releaseDate: xboxGame.releaseDate,
      genres: xboxGame.genres,
    };
  }
}

export const xboxAPI = (tokens: XboxTokens) => new XboxAPI(tokens);
export type { XboxTokens };
