// Use Electron's net module instead of node-fetch for better compatibility
import { net } from 'electron';

export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url?: string;
  img_logo_url?: string;
  has_community_visible_stats?: boolean;
  playtime_windows_forever?: number;
  playtime_mac_forever?: number;
  playtime_linux_forever?: number;
}

export interface SteamOwnedGamesResponse {
  response: {
    game_count: number;
    games: SteamGame[];
  };
}

export interface SteamGameDetails {
  [appId: string]: {
    success: boolean;
    data?: {
      type: string;
      name: string;
      steam_appid: number;
      required_age: number;
      is_free: boolean;
      detailed_description: string;
      about_the_game: string;
      short_description: string;
      supported_languages: string;
      header_image: string;
      website?: string;
      developers: string[];
      publishers: string[];
      platforms: {
        windows: boolean;
        mac: boolean;
        linux: boolean;
      };
      categories: Array<{
        id: number;
        description: string;
      }>;
      genres: Array<{
        id: string;
        description: string;
      }>;
      screenshots: Array<{
        id: number;
        path_thumbnail: string;
        path_full: string;
      }>;
      release_date: {
        coming_soon: boolean;
        date: string;
      };
    };
  };
}

export class SteamElectronAPI {
  private readonly baseUrl = 'https://api.steampowered.com';

  async getOwnedGames(apiKey: string, steamId: string): Promise<SteamGame[]> {
    try {
      const url = `${this.baseUrl}/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&format=json&include_appinfo=true&include_played_free_games=true`;
      
      return new Promise((resolve, reject) => {
        const request = net.request(url);
        
        request.on('response', (response) => {
          let data = '';
          
          response.on('data', (chunk) => {
            data += chunk;
          });
          
          response.on('end', () => {
            try {
              if (response.statusCode !== 200) {
                throw new Error(`Steam API error: ${response.statusCode} ${response.statusMessage}`);
              }
              
              const parsedData = JSON.parse(data) as SteamOwnedGamesResponse;
              resolve(parsedData.response.games || []);
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
    } catch (error) {
      console.error('Error fetching Steam games:', error);
      throw error;
    }
  }

  async getGameDetails(apiKey: string, appId: string): Promise<SteamGameDetails> {
    try {
      const url = `${this.baseUrl}/appdetails?appids=${appId}&key=${apiKey}`;
      
      return new Promise((resolve, reject) => {
        const request = net.request(url);
        
        request.on('response', (response) => {
          let data = '';
          
          response.on('data', (chunk) => {
            data += chunk;
          });
          
          response.on('end', () => {
            try {
              if (response.statusCode !== 200) {
                throw new Error(`Steam API error: ${response.statusCode} ${response.statusMessage}`);
              }
              
              const parsedData = JSON.parse(data) as SteamGameDetails;
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
    } catch (error) {
      console.error('Error fetching Steam game details:', error);
      throw error;
    }
  }

  async searchGames(apiKey: string, query: string): Promise<any[]> {
    try {
      // Steam doesn't have a direct search API, so we'll return empty for now
      // In a real implementation, you might use the Steam store API or other methods
      return [];
    } catch (error) {
      console.error('Error searching Steam games:', error);
      throw error;
    }
  }
}
