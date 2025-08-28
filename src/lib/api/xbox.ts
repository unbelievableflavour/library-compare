import { XboxGame, Game } from '@/types/game';

export class XboxAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getOwnedGames(): Promise<Game[]> {
    try {
      const response = await fetch('/api/xbox/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          apiKey: this.apiKey
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Xbox API error: ${response.status}`);
      }

      const data = await response.json();
      return data.titles?.map(this.transformXboxGame) || [];
    } catch (error) {
      console.error('Error fetching Xbox games:', error);
      throw error;
    }
  }

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

export const xboxAPI = (apiKey: string) => new XboxAPI(apiKey);
