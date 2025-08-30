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
      case 'Epic Games':
        return 'text-orange-600 bg-orange-100';
      case 'Amazon Games':
        return 'text-yellow-600 bg-yellow-100';
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

  static mergeGames(steamGames: any[], xboxGames: any[], gogGames: any[], epicGames: any[] = [], amazonGames: any[] = []): Game[] {
    const gameMap = new Map<string, Game>();

    // Helper function to normalize game names for matching
    const normalizeGameName = (name: string): string => {
      return name
        .replace(/ - Amazon Prime$/i, '') // Remove " - Amazon Prime" suffix (case insensitive)
        .replace(/ - Prime Gaming$/i, '') // Remove " - Prime Gaming" suffix (case insensitive)
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    };

    // Helper function to clean display titles
    const cleanDisplayTitle = (name: string): string => {
      return name
        .replace(/ - Amazon Prime$/i, '') // Remove " - Amazon Prime" suffix
        .replace(/ - Prime Gaming$/i, '') // Remove " - Prime Gaming" suffix
        .trim();
    };

    // Process Steam games
    steamGames.forEach((steamGame) => {
      const originalName = steamGame.name || steamGame.title;
      const normalizedName = normalizeGameName(originalName);
      const cleanName = cleanDisplayTitle(originalName);
      const game: Game = {
        id: `steam-${steamGame.appid || steamGame.id}`,
        name: cleanName,
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
      const originalName = xboxGame.name || xboxGame.title;
      const normalizedName = normalizeGameName(originalName);
      const cleanName = cleanDisplayTitle(originalName);
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
          name: cleanName,
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
      const originalName = gogGame.name || gogGame.title;
      const normalizedName = normalizeGameName(originalName);
      const cleanName = cleanDisplayTitle(originalName);
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
          name: cleanName,
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

    // Process Epic Games
    epicGames.forEach((epicGame) => {
      const originalName = epicGame.name || epicGame.title;
      const normalizedName = normalizeGameName(originalName);
      const cleanName = cleanDisplayTitle(originalName);
      const existingGame = gameMap.get(normalizedName);

      if (existingGame) {
        // Merge with existing game
        existingGame.platforms.push({
          name: 'Epic Games',
          owned: true
        });
        if (epicGame.catalogItemId) {
          existingGame.appId = { ...existingGame.appId, epic: epicGame.catalogItemId };
        }
      } else {
        // Create new game
        const game: Game = {
          id: `epic-${epicGame.catalogItemId || epicGame.id}`,
          name: cleanName,
          platforms: [{
            name: 'Epic Games',
            owned: true
          }],
          appId: {
            epic: epicGame.catalogItemId || epicGame.id
          },
          genres: epicGame.categories?.map((cat: any) => cat.path) || epicGame.genres
        };
        gameMap.set(normalizedName, game);
      }
    });

    // Process Amazon Games
    amazonGames.forEach((amazonGame) => {
      const originalName = amazonGame.name || amazonGame.title;
      const normalizedName = normalizeGameName(originalName);
      const cleanName = cleanDisplayTitle(originalName);
      const existingGame = gameMap.get(normalizedName);

      if (existingGame) {
        // Merge with existing game
        existingGame.platforms.push({
          name: 'Amazon Games',
          owned: true,
          playtime: amazonGame.playtime
        });
        if (amazonGame.id) {
          existingGame.appId = { ...existingGame.appId, amazon: amazonGame.id };
        }
        if (amazonGame.playtime) {
          existingGame.playtime = { ...existingGame.playtime, amazon: amazonGame.playtime };
        }
      } else {
        // Create new game
        const game: Game = {
          id: `amazon-${amazonGame.id}`,
          name: cleanName,
          platforms: [{
            name: 'Amazon Games',
            owned: true,
            playtime: amazonGame.playtime
          }],
          appId: {
            amazon: amazonGame.id
          },
          playtime: amazonGame.playtime ? { amazon: amazonGame.playtime } : undefined
        };
        gameMap.set(normalizedName, game);
      }
    });

    return Array.from(gameMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }
}
