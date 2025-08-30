import { Game } from '../../types/game';

export interface CachedGameData {
  games: Game[];
  timestamp: number;
  platform: string;
}

export interface GameCacheData {
  steam?: CachedGameData;
  xbox?: CachedGameData;
  gog?: CachedGameData;
  epic?: CachedGameData;
  amazon?: CachedGameData;
  unified?: {
    games: Game[];
    timestamp: number;
  };
}

export class GameCacheService {
  private static readonly CACHE_KEY = 'gameLibraryCache';
  private static readonly CACHE_EXPIRY_HOURS = 24; // Cache expires after 24 hours

  /**
   * Save games to cache for a specific platform
   */
  static async savePlatformGames(platform: string, games: Game[]): Promise<void> {
    try {
      const cache = await this.getCache();
      const platformKey = platform.toLowerCase() as keyof GameCacheData;
      
      cache[platformKey] = {
        games,
        timestamp: Date.now(),
        platform
      };

      await window.electronAPI.store.set(this.CACHE_KEY, cache);
      console.log(`✅ Cached ${games.length} games for ${platform}`);
    } catch (error) {
      console.error(`Failed to cache games for ${platform}:`, error);
    }
  }

  /**
   * Save unified game library to cache
   */
  static async saveUnifiedGames(games: Game[]): Promise<void> {
    try {
      const cache = await this.getCache();
      cache.unified = {
        games,
        timestamp: Date.now()
      };

      await window.electronAPI.store.set(this.CACHE_KEY, cache);
      console.log(`✅ Cached ${games.length} unified games`);
    } catch (error) {
      console.error('Failed to cache unified games:', error);
    }
  }

  /**
   * Get cached games for a specific platform
   */
  static async getPlatformGames(platform: string): Promise<Game[] | null> {
    try {
      const cache = await this.getCache();
      const platformKey = platform.toLowerCase() as keyof GameCacheData;
      const cachedData = cache[platformKey];

      if (!cachedData) {
        console.log(`📭 No cached games found for ${platform}`);
        return null;
      }

      if (this.isCacheExpired(cachedData.timestamp)) {
        console.log(`⏰ Cache expired for ${platform} (${this.getAgeString(cachedData.timestamp)})`);
        return null;
      }

      console.log(`📦 Loaded ${cachedData.games.length} cached games for ${platform} (${this.getAgeString(cachedData.timestamp)})`);
      return cachedData.games;
    } catch (error) {
      console.error(`Failed to get cached games for ${platform}:`, error);
      return null;
    }
  }

  /**
   * Get cached unified game library
   */
  static async getUnifiedGames(): Promise<Game[] | null> {
    try {
      const cache = await this.getCache();
      const unifiedData = cache.unified;

      if (!unifiedData) {
        console.log('📭 No cached unified games found');
        return null;
      }

      if (this.isCacheExpired(unifiedData.timestamp)) {
        console.log(`⏰ Unified cache expired (${this.getAgeString(unifiedData.timestamp)})`);
        return null;
      }

      console.log(`📦 Loaded ${unifiedData.games.length} cached unified games (${this.getAgeString(unifiedData.timestamp)})`);
      return unifiedData.games;
    } catch (error) {
      console.error('Failed to get cached unified games:', error);
      return null;
    }
  }

  /**
   * Check if any platform has cached data
   */
  static async hasCachedData(): Promise<boolean> {
    try {
      const cache = await this.getCache();
      return Object.keys(cache).length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get cache status for all platforms
   */
  static async getCacheStatus(): Promise<Record<string, { count: number; age: string; expired: boolean }>> {
    try {
      const cache = await this.getCache();
      const status: Record<string, { count: number; age: string; expired: boolean }> = {};

      for (const [key, data] of Object.entries(cache)) {
        if (data && typeof data === 'object' && 'timestamp' in data && 'games' in data) {
          const cachedData = data as CachedGameData;
          status[key] = {
            count: cachedData.games.length,
            age: this.getAgeString(cachedData.timestamp),
            expired: this.isCacheExpired(cachedData.timestamp)
          };
        }
      }

      return status;
    } catch (error) {
      console.error('Failed to get cache status:', error);
      return {};
    }
  }

  /**
   * Clear all cached data
   */
  static async clearCache(): Promise<void> {
    try {
      await window.electronAPI.store.delete(this.CACHE_KEY);
      console.log('🗑️ Game cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Clear cached data for a specific platform
   */
  static async clearPlatformCache(platform: string): Promise<void> {
    try {
      const cache = await this.getCache();
      const platformKey = platform.toLowerCase() as keyof GameCacheData;
      delete cache[platformKey];
      
      await window.electronAPI.store.set(this.CACHE_KEY, cache);
      console.log(`🗑️ Cleared cache for ${platform}`);
    } catch (error) {
      console.error(`Failed to clear cache for ${platform}:`, error);
    }
  }

  // Private helper methods

  private static async getCache(): Promise<GameCacheData> {
    try {
      const cache = await window.electronAPI.store.get(this.CACHE_KEY);
      return cache || {};
    } catch (error) {
      console.error('Failed to get cache:', error);
      return {};
    }
  }

  private static isCacheExpired(timestamp: number): boolean {
    const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);
    return ageHours > this.CACHE_EXPIRY_HOURS;
  }

  private static getAgeString(timestamp: number): string {
    const ageMinutes = Math.floor((Date.now() - timestamp) / (1000 * 60));
    
    if (ageMinutes < 60) {
      return `${ageMinutes}m ago`;
    }
    
    const ageHours = Math.floor(ageMinutes / 60);
    if (ageHours < 24) {
      return `${ageHours}h ago`;
    }
    
    const ageDays = Math.floor(ageHours / 24);
    return `${ageDays}d ago`;
  }
}
