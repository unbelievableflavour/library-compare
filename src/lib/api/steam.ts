import { SteamApiResponse, SteamGame, Game } from '@/types/game';

export class SteamAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getOwnedGames(steamId: string): Promise<Game[]> {
    try {
      const response = await fetch(
        `/api/steam/games?key=${this.apiKey}&steamid=${steamId}`
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Steam API error: ${response.status}`);
      }

      const data: SteamApiResponse = await response.json();
      
      if (!data.response?.games) {
        return [];
      }
      
      return data.response.games.map(this.transformSteamGame);
    } catch (error) {
      console.error('Error fetching Steam games:', error);
      throw error;
    }
  }

  async getGameDetails(appId: string): Promise<any> {
    try {
      const response = await fetch(
        `/api/steam/details?appid=${appId}`
      );
      
      if (!response.ok) {
        throw new Error(`Steam API error: ${response.status}`);
      }

      const data = await response.json();
      return data[appId]?.data;
    } catch (error) {
      console.error('Error fetching Steam game details:', error);
      throw error;
    }
  }

  private transformSteamGame(steamGame: SteamGame): Game {
    return {
      id: `steam-${steamGame.appid}`,
      name: steamGame.name,
      platforms: [{
        name: 'Steam',
        owned: true,
        playtime: steamGame.playtime_forever,
        lastPlayed: steamGame.rtime_last_played 
          ? new Date(steamGame.rtime_last_played * 1000).toISOString()
          : undefined,
      }],
      appId: {
        steam: steamGame.appid.toString(),
      },
      images: {
        icon: steamGame.img_icon_url 
          ? `https://media.steampowered.com/steamcommunity/public/images/apps/${steamGame.appid}/${steamGame.img_icon_url}.jpg`
          : undefined,
        header: `https://cdn.akamai.steamstatic.com/steam/apps/${steamGame.appid}/header.jpg`,
      },
      playtime: {
        steam: steamGame.playtime_forever,
      },
    };
  }
}

export const steamAPI = (apiKey: string) => new SteamAPI(apiKey);
