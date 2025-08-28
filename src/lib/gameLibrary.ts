import { Game, GameLibrary, Platform } from '@/types/game';
import { steamAPI } from './api/steam';
import { xboxAPI } from './api/xbox';
import { gogAPI } from './api/gog';

export class GameLibraryManager {
  private steam?: ReturnType<typeof steamAPI>;
  private xbox?: ReturnType<typeof xboxAPI>;
  private gog?: ReturnType<typeof gogAPI>;

  constructor(config: {
    steamApiKey?: string;
    xboxApiKey?: string;
    gogApiKey?: string;
  }) {
    if (config.steamApiKey) {
      this.steam = steamAPI(config.steamApiKey);
    }
    if (config.xboxApiKey) {
      this.xbox = xboxAPI(config.xboxApiKey);
    }
    if (config.gogApiKey) {
      this.gog = gogAPI(config.gogApiKey);
    }
  }

  async fetchAllLibraries(userIds: {
    steamId?: string;
    xboxGamertag?: string;
  }): Promise<GameLibrary> {
    const [steamGames, xboxGames, gogGames] = await Promise.allSettled([
      this.steam && userIds.steamId ? this.steam.getOwnedGames(userIds.steamId) : Promise.resolve([]),
      this.xbox ? this.fetchXboxGames() : Promise.resolve([]),
      this.gog ? this.gog.getOwnedGames() : Promise.resolve([]),
    ]);

    const steam = steamGames.status === 'fulfilled' ? steamGames.value : [];
    const xbox = xboxGames.status === 'fulfilled' ? xboxGames.value : [];
    const gog = gogGames.status === 'fulfilled' ? gogGames.value : [];

    const unified = this.unifyGameLibraries(steam, xbox, gog);

    return {
      steam,
      xbox,
      gog,
      unified,
    };
  }

  private async fetchXboxGames(): Promise<Game[]> {
    if (!this.xbox) return [];
    
    try {
      return await this.xbox.getOwnedGames();
    } catch (error) {
      console.error('Error fetching Xbox games:', error);
      return [];
    }
  }

  private unifyGameLibraries(steam: Game[], xbox: Game[], gog: Game[]): Game[] {
    const gameMap = new Map<string, Game>();

    // Add all games to the map, merging platforms for the same game
    [...steam, ...xbox, ...gog].forEach(game => {
      const normalizedName = this.normalizeGameName(game.name);
      
      if (gameMap.has(normalizedName)) {
        const existingGame = gameMap.get(normalizedName)!;
        // Merge platforms
        existingGame.platforms = [...existingGame.platforms, ...game.platforms];
        // Merge app IDs
        existingGame.appId = { ...existingGame.appId, ...game.appId };
        // Merge playtime
        existingGame.playtime = { ...existingGame.playtime, ...game.playtime };
        // Use the first game's images if available, otherwise use the new one
        if (!existingGame.images?.header && game.images?.header) {
          existingGame.images = { ...existingGame.images, ...game.images };
        }
      } else {
        gameMap.set(normalizedName, { ...game });
      }
    });

    return Array.from(gameMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private normalizeGameName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  static formatPlaytime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  static getPlatformColor(platform: Platform['name']): string {
    switch (platform) {
      case 'Steam':
        return 'text-blue-600 bg-blue-50';
      case 'Xbox':
        return 'text-green-600 bg-green-50';
      case 'GOG':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }
}
