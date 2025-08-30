import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { GameTable } from '../components/GameTable';
import { GameLibraryManager } from '../lib/gameLibrary';
import { Game } from '../../types/game';

interface GOGCredentials {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  session_id: string;
  refresh_token: string;
  user_id: string;
}

interface ApiKeys {
  steamApiKey?: string;
  steamId?: string;
  xboxCredentials?: any;
  gogCredentials?: GOGCredentials;
}

// Remove the local Game interface since we're importing it from types

// Demo data for testing
const createDemoGames = (): Game[] => {
  return [
    {
      id: 'demo-1',
      name: 'Cyberpunk 2077',
      platforms: [
        { name: 'Steam', owned: true, playtime: 4500 },
        { name: 'GOG', owned: true }
      ],
      appId: { steam: '1091500', gog: '1423049311' },
      playtime: { steam: 4500 },
      genres: ['RPG', 'Action'],
      images: { icon: 'https://via.placeholder.com/32x32' }
    },
    {
      id: 'demo-2',
      name: 'The Witcher 3: Wild Hunt',
      platforms: [
        { name: 'Steam', owned: true, playtime: 8200 },
        { name: 'Xbox', owned: true },
        { name: 'GOG', owned: true }
      ],
      appId: { steam: '292030', xbox: 'BRT4J27XJDXK', gog: '1207664663' },
      playtime: { steam: 8200 },
      genres: ['RPG', 'Adventure']
    },
    {
      id: 'demo-3',
      name: 'Halo Infinite',
      platforms: [
        { name: 'Steam', owned: true, playtime: 2100 },
        { name: 'Xbox', owned: true }
      ],
      appId: { steam: '1240440', xbox: '9PP5G1F0C2B6' },
      playtime: { steam: 2100 },
      genres: ['FPS', 'Action']
    },
    {
      id: 'demo-4',
      name: 'Baldur\'s Gate 3',
      platforms: [{ name: 'Steam', owned: true, playtime: 15600 }],
      appId: { steam: '1086940' },
      playtime: { steam: 15600 },
      genres: ['RPG', 'Strategy']
    },
    {
      id: 'demo-5',
      name: 'Forza Horizon 5',
      platforms: [{ name: 'Xbox', owned: true }],
      appId: { xbox: '9NKX70BBXDRN' },
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

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const storedSteamApiKey = await window.electronAPI.store.get('steamApiKey');
      const storedSteamId = await window.electronAPI.store.get('steamId');
      const storedXboxCredentials = await window.electronAPI.store.get('xboxCredentials');
      const storedGogCredentials = await window.electronAPI.store.get('gogCredentials');

      const keys: ApiKeys = {};
      if (storedSteamApiKey) keys.steamApiKey = storedSteamApiKey;
      if (storedSteamId) keys.steamId = storedSteamId;
      if (storedXboxCredentials) keys.xboxCredentials = storedXboxCredentials;
      if (storedGogCredentials) keys.gogCredentials = storedGogCredentials;

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
  };

  const loadGames = async (keys: ApiKeys) => {
    try {
      setLoading(true);
      
      // Check for demo mode
      if (keys.steamApiKey === 'demo') {
        const demoGames = createDemoGames();
        setGames(demoGames);
        setLoading(false);
        return;
      }
      
      let steamGames: any[] = [];
      let xboxGames: any[] = [];
      let gogGames: any[] = [];

      // Load GOG games
      if (keys.gogCredentials) {
        try {
          console.log('Loading GOG games...');
          const rawGogGames = await window.electronAPI.gog.getGames();
          console.log('GOG games loaded:', rawGogGames?.length || 0);
          
          if (rawGogGames && Array.isArray(rawGogGames)) {
            gogGames = rawGogGames.map((game: any) => {
              // Handle localized titles - extract string from localization objects
              let title = game.title || game.name || 'Unknown Game';
              if (typeof title === 'object' && title !== null) {
                title = title['en-US'] || title['en'] || title['*'] || Object.values(title)[0] || 'Unknown Game';
              }
              
              return {
                ...game,
                name: title,
                title: title
              };
            });
          }
        } catch (error) {
          console.error('Failed to load GOG games:', error);
        }
      }

      // Load Steam games
      if (keys.steamApiKey && keys.steamId) {
        try {
          console.log('Loading Steam games...');
          const rawSteamGames = await window.electronAPI.steam.getGames(keys.steamApiKey, keys.steamId);
          console.log('Steam games loaded:', rawSteamGames?.length || 0);
          
          if (rawSteamGames && Array.isArray(rawSteamGames)) {
            steamGames = rawSteamGames.map((game: any) => ({
              ...game,
              name: game.name || 'Unknown Game',
              title: game.name || 'Unknown Game'
            }));
          }
        } catch (error) {
          console.error('Failed to load Steam games:', error);
        }
      }

      // Load Xbox games
      if (keys.xboxCredentials) {
        try {
          console.log('Loading Xbox games...');
          const rawXboxGames = await window.electronAPI.xbox.getGames(keys.xboxCredentials);
          console.log('Xbox games loaded:', rawXboxGames?.length || 0);
          
          if (rawXboxGames && Array.isArray(rawXboxGames)) {
            xboxGames = rawXboxGames.map((game: any) => {
              // Handle localized titles - extract string from localization objects
              let title = game.name || game.title || 'Unknown Game';
              if (typeof title === 'object' && title !== null) {
                title = title['en-US'] || title['en'] || title['*'] || Object.values(title)[0] || 'Unknown Game';
              }
              
              return {
                ...game,
                name: title,
                title: title
              };
            });
          }
        } catch (error) {
          console.error('Failed to load Xbox games:', error);
          // Check if it's an authentication error
          if (error.message && error.message.includes('authentication failed')) {
            console.warn('Xbox authentication expired - clearing stored credentials');
            // Clear expired Xbox credentials
            await window.electronAPI.store.delete('xboxCredentials');
            // Update local state
            setApiKeys(prev => {
              const { xboxCredentials, ...rest } = prev;
              return rest;
            });
            // Add warning message
            setAuthWarnings(prev => [...prev, 'Xbox authentication expired. Please reconnect your Xbox account in settings.']);
          }
        }
      }

      // Merge games using GameLibraryManager
      const mergedGames = GameLibraryManager.mergeGames(steamGames, xboxGames, gogGames);
      setGames(mergedGames);
    } catch (error) {
      console.error('Failed to load games:', error);
      setError('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (Object.keys(apiKeys).length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Welcome to Library Compare!</h2>
          <p className="text-gray-600 mb-6">
            You haven't set up any gaming platforms yet. Connect your accounts to start comparing your game libraries.
          </p>
          <Button onClick={goToSettings}>Setup Gaming Accounts</Button>
        </div>
      </div>
    );
  }

  // Calculate platform statistics
  const platformStats = games.reduce((acc, game) => {
    game.platforms.forEach(platform => {
      acc[platform.name] = (acc[platform.name] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const totalPlatforms = Object.keys(platformStats).length;
  const crossPlatformGames = games.filter(game => game.platforms.length > 1).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Game Library</h1>
            <p className="text-gray-600 mt-2">
              {games.length} games across {totalPlatforms} platforms
              {crossPlatformGames > 0 && (
                <span className="ml-2 text-blue-600">
                  • {crossPlatformGames} cross-platform
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => alert(`Total Games: ${games.length}`)}>
              Total Games: {games.length}
            </Button>
            <Button variant="outline" onClick={goToSettings}>
              Manage Accounts
            </Button>
          </div>
        </div>

        {/* Authentication Warnings */}
        {authWarnings.length > 0 && (
          <div className="mb-6">
            {authWarnings.map((warning, index) => (
              <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-5 h-5 text-yellow-600 mr-2">⚠️</div>
                    <p className="text-yellow-800 text-sm">{warning}</p>
                  </div>
                  <button
                    onClick={() => setAuthWarnings(prev => prev.filter((_, i) => i !== index))}
                    className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Platform Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {Object.entries(platformStats).map(([platform, count]) => (
            <div key={platform} className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{platform}</h3>
                  <p className="text-gray-600">{count} games</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  platform === 'Steam' ? 'bg-blue-100' :
                  platform === 'GOG' ? 'bg-purple-100' :
                  platform === 'Xbox' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <span className={`text-xl font-bold ${
                    platform === 'Steam' ? 'text-blue-600' :
                    platform === 'GOG' ? 'text-purple-600' :
                    platform === 'Xbox' ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {platform.charAt(0)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Games Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Game Library</h2>
            <p className="text-gray-600 text-sm mt-1">
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
