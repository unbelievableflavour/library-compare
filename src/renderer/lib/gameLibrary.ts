import { Game, Platform } from '../../types/game';

export class GameLibraryManager {
  static getPlatformColor(platformName: Platform['name']): string {
    switch (platformName) {
      case 'Steam':
        return 'text-blue-600 bg-blue-100';
      case 'Xbox':
        return 'text-green-600 bg-green-100';
      case 'GOG':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  static formatPlaytime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours < 24) {
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (remainingHours > 0) {
      return `${days}d ${remainingHours}h`;
    }
    
    return `${days}d`;
  }

  static mergeGames(steamGames: any[], xboxGames: any[], gogGames: any[]): Game[] {
    const gameMap = new Map<string, Game>();

    // Helper function to normalize game names for matching
    const normalizeGameName = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };

    // Process Steam games
    steamGames.forEach((steamGame) => {
      const normalizedName = normalizeGameName(steamGame.name || steamGame.title);
      const game: Game = {
        id: `steam-${steamGame.appid || steamGame.id}`,
        name: steamGame.name || steamGame.title,
        platforms: [{
          name: 'Steam',
          owned: true,
          playtime: steamGame.playtime_forever || 0
        }],
        appId: {
          steam: String(steamGame.appid || steamGame.id)
        },
        playtime: {
          steam: steamGame.playtime_forever || 0
        },
        images: steamGame.img_icon_url ? {
          icon: `https://media.steampowered.com/steamcommunity/public/images/apps/${steamGame.appid}/${steamGame.img_icon_url}.jpg`
        } : undefined
      };
      gameMap.set(normalizedName, game);
    });

    // Process Xbox games
    xboxGames.forEach((xboxGame) => {
      const normalizedName = normalizeGameName(xboxGame.name || xboxGame.title);
      const existingGame = gameMap.get(normalizedName);

      if (existingGame) {
        // Merge with existing game
        existingGame.platforms.push({
          name: 'Xbox',
          owned: true
        });
        if (xboxGame.titleId) {
          existingGame.appId = { ...existingGame.appId, xbox: xboxGame.titleId };
        }
      } else {
        // Create new game
        const game: Game = {
          id: `xbox-${xboxGame.titleId || xboxGame.id}`,
          name: xboxGame.name || xboxGame.title,
          platforms: [{
            name: 'Xbox',
            owned: true
          }],
          appId: {
            xbox: xboxGame.titleId || xboxGame.id
          },
          genres: xboxGame.genres
        };
        gameMap.set(normalizedName, game);
      }
    });

    // Process GOG games
    gogGames.forEach((gogGame) => {
      const normalizedName = normalizeGameName(gogGame.name || gogGame.title);
      const existingGame = gameMap.get(normalizedName);

      if (existingGame) {
        // Merge with existing game
        existingGame.platforms.push({
          name: 'GOG',
          owned: true
        });
        if (gogGame.id) {
          existingGame.appId = { ...existingGame.appId, gog: String(gogGame.id) };
        }
      } else {
        // Create new game
        const game: Game = {
          id: `gog-${gogGame.id}`,
          name: gogGame.name || gogGame.title,
          platforms: [{
            name: 'GOG',
            owned: true
          }],
          appId: {
            gog: String(gogGame.id)
          },
          genres: gogGame.genres
        };
        gameMap.set(normalizedName, game);
      }
    });

    return Array.from(gameMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }
}
