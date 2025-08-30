import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '../components/ui/button';
import { GameTable } from '../components/GameTable';
import { GameLibraryManager } from '../lib/gameLibrary';
import { Game } from '../../types/game';
import { getPlatformIcon } from '../components/PlatformIcons';

interface ApiKeys {
  steamApiKey?: string;
  steamId?: string;
  xboxCredentials?: any;
  gogCredentials?: any;
  epicCredentials?: any;
  amazonCredentials?: any;
}

// Demo games for testing
const createDemoGames = (): Game[] => {
  return [
    {
      id: 'demo-1',
      name: 'Cyberpunk 2077',
      platforms: [
        { name: 'Steam', owned: true, playtime: 4560 },
        { name: 'GOG', owned: true, playtime: 0 }
      ],
      playtime: { steam: 4560 },
      genres: ['RPG', 'Action']
    },
    {
      id: 'demo-2',
      name: 'The Witcher 3: Wild Hunt',
      platforms: [
        { name: 'Steam', owned: true, playtime: 12340 },
        { name: 'Xbox', owned: true, playtime: 2340 },
        { name: 'GOG', owned: true, playtime: 0 }
      ],
      playtime: { steam: 12340, xbox: 2340 },
      genres: ['RPG', 'Adventure']
    },
    {
      id: 'demo-3',
      name: 'Halo Infinite',
      platforms: [
        { name: 'Steam', owned: true, playtime: 890 },
        { name: 'Xbox', owned: true, playtime: 1560 }
      ],
      playtime: { steam: 890, xbox: 1560 },
      genres: ['FPS', 'Action']
    },
    {
      id: 'demo-4',
      name: 'Forza Horizon 5',
      platforms: [
        { name: 'Steam', owned: true, playtime: 2340 },
        { name: 'Xbox', owned: true, playtime: 4560 }
      ],
      playtime: { steam: 2340, xbox: 4560 },
      genres: ['Racing', 'Sports']
    }
  ];
};

export default function Library() {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authWarnings, setAuthWarnings] = useState<string[]>([]);
  
  // Track if games are currently being loaded to prevent duplicate calls
  const isLoadingGamesRef = useRef(false);
  const lastLoadedKeysRef = useRef<string>('');

  const loadGames = useCallback(async (keys: ApiKeys) => {
    // Create a unique key for the current API keys to detect changes
    const keysSignature = JSON.stringify(keys);
    
    // Prevent duplicate calls with the same keys
    if (isLoadingGamesRef.current && lastLoadedKeysRef.current === keysSignature) {
      console.log('Games already loading with same keys, skipping duplicate call');
      return;
    }
    
    try {
      isLoadingGamesRef.current = true;
      lastLoadedKeysRef.current = keysSignature;
      setLoading(true);
      
      // Check for demo mode
      if (keys.steamApiKey === 'demo') {
        const demoGames = createDemoGames();
        setGames(demoGames);
        setLoading(false);
        return;
      }
      
      // Helper function to normalize game titles
      const normalizeGameTitle = (game: any) => {
        let title = game.title || game.name || 'Unknown Game';
        if (typeof title === 'object' && title !== null) {
          title = title['en-US'] || title['en'] || title['*'] || Object.values(title)[0] || 'Unknown Game';
        }
        return {
          ...game,
          name: title,
          title: title
        };
      };

      // Create parallel promises for all platform API calls
      const startTime = performance.now();
      console.log('🚀 Starting parallel game loading from all platforms...');
      
      const platformPromises = [
        // GOG Games Promise
        keys.gogCredentials
          ? (() => {
              console.log('📡 Initiating GOG API call...');
              return window.electronAPI.gog.getGames()
                .then(rawGogGames => {
                  const elapsed = performance.now() - startTime;
                  console.log(`✅ GOG games loaded: ${rawGogGames?.length || 0} games (${elapsed.toFixed(0)}ms)`);
                  return rawGogGames && Array.isArray(rawGogGames) 
                    ? rawGogGames.map(normalizeGameTitle)
                    : [];
                })
                .catch(error => {
                  const elapsed = performance.now() - startTime;
                  console.error(`❌ Failed to load GOG games (${elapsed.toFixed(0)}ms):`, error);
                  return [];
                });
            })()
          : Promise.resolve([]),

        // Steam Games Promise
        keys.steamApiKey && keys.steamId
          ? (() => {
              console.log('📡 Initiating Steam API call...');
              return window.electronAPI.steam.getGames(keys.steamApiKey, keys.steamId)
                .then(rawSteamGames => {
                  const elapsed = performance.now() - startTime;
                  console.log(`✅ Steam games loaded: ${rawSteamGames?.length || 0} games (${elapsed.toFixed(0)}ms)`);
                  return rawSteamGames && Array.isArray(rawSteamGames)
                    ? rawSteamGames.map(normalizeGameTitle)
                    : [];
                })
                .catch(error => {
                  const elapsed = performance.now() - startTime;
                  console.error(`❌ Failed to load Steam games (${elapsed.toFixed(0)}ms):`, error);
                  return [];
                });
            })()
          : Promise.resolve([]),

        // Xbox Games Promise
        keys.xboxCredentials
          ? (() => {
              console.log('📡 Initiating Xbox API call...');
              return window.electronAPI.xbox.getGames(keys.xboxCredentials)
                .then(rawXboxGames => {
                  const elapsed = performance.now() - startTime;
                  console.log(`✅ Xbox games loaded: ${rawXboxGames?.length || 0} games (${elapsed.toFixed(0)}ms)`);
                  return rawXboxGames && Array.isArray(rawXboxGames)
                    ? rawXboxGames.map(normalizeGameTitle)
                    : [];
                })
                .catch(async (error) => {
                  const elapsed = performance.now() - startTime;
                  console.error(`❌ Failed to load Xbox games (${elapsed.toFixed(0)}ms):`, error);
                  // Check if it's an authentication error
                  if (error.message && error.message.includes('authentication failed')) {
                    console.warn('Xbox authentication expired - clearing stored credentials');
                    await window.electronAPI.store.delete('xboxCredentials');
                    setApiKeys(prev => {
                      const { xboxCredentials, ...rest } = prev;
                      return rest;
                    });
                    setAuthWarnings(prev => [...prev, 'Xbox authentication expired. Please reconnect your Xbox account in settings.']);
                  }
                  return [];
                });
            })()
          : Promise.resolve([]),

        // Epic Games Promise
        keys.epicCredentials
          ? (() => {
              console.log('📡 Initiating Epic Games API call...');
              return window.electronAPI.epic.getGames(keys.epicCredentials)
                .then(rawEpicGames => {
                  const elapsed = performance.now() - startTime;
                  console.log(`✅ Epic games loaded: ${rawEpicGames?.length || 0} games (${elapsed.toFixed(0)}ms)`);
                  return rawEpicGames && Array.isArray(rawEpicGames)
                    ? rawEpicGames.map(normalizeGameTitle)
                    : [];
                })
                .catch(async (error) => {
                  const elapsed = performance.now() - startTime;
                  console.error(`❌ Failed to load Epic games (${elapsed.toFixed(0)}ms):`, error);
                  // Check if it's an authentication error
                  if (error.message && error.message.includes('authentication failed')) {
                    console.warn('Epic authentication expired - clearing stored credentials');
                    await window.electronAPI.store.delete('epicCredentials');
                    setApiKeys(prev => {
                      const { epicCredentials, ...rest } = prev;
                      return rest;
                    });
                    setAuthWarnings(prev => [...prev, 'Epic Games authentication expired. Please reconnect your Epic account in settings.']);
                  }
                  return [];
                });
            })()
          : Promise.resolve([]),

        // Amazon Games Promise
        keys.amazonCredentials
          ? (() => {
              console.log('📡 Initiating Amazon Games API call...');
              return window.electronAPI.amazon.getGames(keys.amazonCredentials)
                .then(rawAmazonGames => {
                  const elapsed = performance.now() - startTime;
                  console.log(`✅ Amazon games loaded: ${rawAmazonGames?.length || 0} games (${elapsed.toFixed(0)}ms)`);
                  return rawAmazonGames && Array.isArray(rawAmazonGames)
                    ? rawAmazonGames.map(normalizeGameTitle)
                    : [];
                })
                .catch(async (error) => {
                  const elapsed = performance.now() - startTime;
                  console.error(`❌ Failed to load Amazon games (${elapsed.toFixed(0)}ms):`, error);
                  // Check if it's an authentication error
                  if (error.message && error.message.includes('authentication failed')) {
                    console.warn('Amazon authentication expired - clearing stored credentials');
                    await window.electronAPI.store.delete('amazonCredentials');
                    setApiKeys(prev => {
                      const { amazonCredentials, ...rest } = prev;
                      return rest;
                    });
                    setAuthWarnings(prev => [...prev, 'Amazon Games authentication expired. Please reconnect your Amazon account in settings.']);
                  }
                  return [];
                });
            })()
          : Promise.resolve([])
      ];

      console.log('⏳ Waiting for all platform API calls to complete...');
      // Execute all platform API calls in parallel and destructure results
      const [gogGames, steamGames, xboxGames, epicGames, amazonGames] = await Promise.all(platformPromises);
      
      const totalTime = performance.now() - startTime;
      console.log(`🎉 All platforms loaded in ${totalTime.toFixed(0)}ms - merging games...`);

      // Merge games using GameLibraryManager
      const mergedGames = GameLibraryManager.mergeGames(steamGames, xboxGames, gogGames, epicGames, amazonGames);
      setGames(mergedGames);
    } catch (error) {
      console.error('Failed to load games:', error);
      setError('Failed to load games');
    } finally {
      setLoading(false);
      isLoadingGamesRef.current = false;
    }
  }, []); // Empty dependency array since we handle keys as parameters

  const loadApiKeys = useCallback(async () => {
    try {
      const storedSteamApiKey = await window.electronAPI.store.get('steamApiKey');
      const storedSteamId = await window.electronAPI.store.get('steamId');
      const storedXboxCredentials = await window.electronAPI.store.get('xboxCredentials');
      const storedGogCredentials = await window.electronAPI.store.get('gogCredentials');
      const storedEpicCredentials = await window.electronAPI.store.get('epicCredentials');
      const storedAmazonCredentials = await window.electronAPI.store.get('amazonCredentials');

      const keys: ApiKeys = {};
      if (storedSteamApiKey) keys.steamApiKey = storedSteamApiKey;
      if (storedSteamId) keys.steamId = storedSteamId;
      if (storedXboxCredentials) keys.xboxCredentials = storedXboxCredentials;
      if (storedGogCredentials) keys.gogCredentials = storedGogCredentials;
      if (storedEpicCredentials) keys.epicCredentials = storedEpicCredentials;
      if (storedAmazonCredentials) keys.amazonCredentials = storedAmazonCredentials;

      setApiKeys(keys);
      
      // Load games if we have credentials
      if (Object.keys(keys).length > 0) {
        await loadGames(keys);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
      setError('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  }, [loadGames]); // Depend on loadGames

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  const goToSettings = () => {
    window.location.hash = '#/setup';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your game library...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ {error}</div>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const totalGames = games.length;
  const platformStats = games.reduce((acc, game) => {
    game.platforms.forEach(platform => {
      if (!acc[platform.name]) {
        acc[platform.name] = 0;
      }
      acc[platform.name]++;
    });
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Auth Warnings */}
        {authWarnings.length > 0 && (
          <div className="mb-6">
            {authWarnings.map((warning, index) => (
              <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-2">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-800">{warning}</p>
                  </div>
                  <div className="ml-auto pl-3">
                    <div className="-mx-1.5 -my-1.5">
                      <button
                        type="button"
                        className="inline-flex bg-yellow-50 rounded-md p-1.5 text-yellow-500 hover:bg-yellow-100"
                        onClick={() => setAuthWarnings(prev => prev.filter((_, i) => i !== index))}
                      >
                        <span className="sr-only">Dismiss</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Game Library</h1>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => loadGames(apiKeys)}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh Games'}
              </Button>
              <Button onClick={goToSettings}>
                Settings
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {/* Total Games */}
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{totalGames}</div>
              <div className="text-sm text-gray-600">Total Games</div>
            </div>

            {/* Platform Stats */}
            {Object.entries(platformStats).map(([platform, count]) => (
              <div key={platform} className="bg-white rounded-lg shadow p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
                    platform === 'Steam' ? 'bg-blue-100 text-blue-600' :
                    platform === 'Xbox' ? 'bg-green-100 text-green-600' :
                    platform === 'GOG' ? 'bg-purple-100 text-purple-600' :
                    platform === 'Epic Games' ? 'bg-gray-100 text-gray-600' :
                    platform === 'Amazon Games' ? 'bg-orange-100 text-orange-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {getPlatformIcon(platform, 'h-4 w-4')}
                  </div>
                </div>
                <div className="text-lg font-semibold">{count}</div>
                <div className="text-xs text-gray-600">{platform}</div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Your Unified Game Collection
            </h2>
            <p className="text-gray-600">
              Compare your games across platforms, see playtime, and access store pages
            </p>
          </div>
          
          {games.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No games found. Try refreshing or check your account connections.</p>
              <Button className="mt-4" onClick={() => loadGames(apiKeys)}>
                Refresh Games
              </Button>
            </div>
          ) : (
            <GameTable games={games} loading={loading} />
          )}
        </div>
      </div>
    </div>
  );
}