import { GOGGame, Game } from '@/types/game';

const GOG_API_BASE = 'https://api.gog.com';

export class GOGAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getOwnedGames(): Promise<Game[]> {
    try {
      // Note: GOG API requires authentication and has CORS restrictions
      // This would typically need to be called from a backend service
      const response = await fetch(`${GOG_API_BASE}/user/data/games`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`GOG API error: ${response.status}`);
      }

      const data = await response.json();
      const gameIds = data.owned || [];
      
      // Fetch details for each game
      const games = await Promise.all(
        gameIds.map((gameId: number) => this.getGameDetails(gameId))
      );

      return games.filter(Boolean).map(this.transformGOGGame);
    } catch (error) {
      console.error('Error fetching GOG games:', error);
      throw error;
    }
  }

  async getGameDetails(gameId: number): Promise<GOGGame | null> {
    try {
      const response = await fetch(`${GOG_API_BASE}/account/gameDetails/${gameId}.json`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching GOG game details for ${gameId}:`, error);
      return null;
    }
  }

  private transformGOGGame(gogGame: GOGGame): Game {
    return {
      id: `gog-${gogGame.id}`,
      name: gogGame.title,
      platforms: [{
        name: 'GOG',
        owned: true,
      }],
      appId: {
        gog: gogGame.id.toString(),
      },
      images: {
        header: gogGame.image,
        icon: gogGame.image,
      },
      releaseDate: gogGame.releaseDate,
      genres: gogGame.genres,
    };
  }
}

export const gogAPI = (apiKey: string) => new GOGAPI(apiKey);
