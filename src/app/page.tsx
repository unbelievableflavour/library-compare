'use client';

import React, { useState, useEffect } from 'react';
import { GameTable } from '@/components/GameTable';
import { ApiKeySetup } from '@/components/ApiKeySetup';
import { GameLibraryManager } from '@/lib/gameLibrary';
import { Game, GameLibrary } from '@/types/game';
import { mockGameLibrary } from '@/lib/mockData';
import { Gamepad2, BarChart3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiKeysCookie, hasStoredApiKeys } from '@/lib/cookies';

export default function Home() {
  const [gameLibrary, setGameLibrary] = useState<GameLibrary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoLoadingMessage, setAutoLoadingMessage] = useState<string | null>(null);

  // Check for stored credentials on page load
  useEffect(() => {
    const checkStoredCredentials = async () => {
      if (hasStoredApiKeys()) {
        const storedKeys = getApiKeysCookie();
        
        // Auto-load libraries if we have valid stored credentials
        if ((storedKeys.steamApiKey && storedKeys.steamId) || (storedKeys.xboxApiKey && storedKeys.xboxGamertag)) {
          setAutoLoadingMessage('Loading your game libraries from saved credentials...');
          setLoading(true);
          
          await handleApiKeySubmit({
            steamApiKey: storedKeys.steamApiKey || '',
            steamId: storedKeys.steamId || '',
            xboxApiKey: storedKeys.xboxApiKey || '',
            xboxGamertag: storedKeys.xboxGamertag || '',
          });
          
          setAutoLoadingMessage(null);
        } else {
          // Has stored keys but they're incomplete, show setup
          setShowSetup(true);
        }
      } else {
        // No stored keys, show setup
        setShowSetup(true);
      }
    };

    checkStoredCredentials();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApiKeySubmit = async (apiKeys: {
    steamApiKey: string;
    steamId: string;
    xboxApiKey: string;
    xboxGamertag: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      // Check if this is demo mode
      if (apiKeys.steamApiKey === 'demo') {
        // Use mock data for demo
        const demoLibrary: GameLibrary = {
          steam: mockGameLibrary.filter(game => 
            game.platforms.some(p => p.name === 'Steam')
          ),
          xbox: mockGameLibrary.filter(game => 
            game.platforms.some(p => p.name === 'Xbox')
          ),
          gog: mockGameLibrary.filter(game => 
            game.platforms.some(p => p.name === 'GOG')
          ),
          unified: mockGameLibrary
        };
        
        setGameLibrary(demoLibrary);
        setShowSetup(false);
        return;
      }

      const libraryManager = new GameLibraryManager({
        steamApiKey: apiKeys.steamApiKey || undefined,
        xboxApiKey: apiKeys.xboxApiKey || undefined,
      });

      const library = await libraryManager.fetchAllLibraries({
        steamId: apiKeys.steamId || undefined,
        xboxGamertag: apiKeys.xboxGamertag || undefined,
      });

      setGameLibrary(library);
      setShowSetup(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch game libraries');
    } finally {
      setLoading(false);
    }
  };

  const totalGames = gameLibrary?.unified.length || 0;
  const steamGames = gameLibrary?.steam.length || 0;
  const xboxGames = gameLibrary?.xbox.length || 0;
  const gogGames = gameLibrary?.gog.length || 0;

  const crossPlatformGames = gameLibrary?.unified.filter(game => 
    game.platforms.length > 1
  ).length || 0;

  // Show auto-loading screen
  if (autoLoadingMessage) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">{autoLoadingMessage}</p>
        </div>
      </div>
    );
  }

  if (showSetup || !gameLibrary) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Library Compare</h1>
            </div>
          </div>
        </header>
        
        <main className="container mx-auto px-4 py-8">
          <ApiKeySetup onSubmit={handleApiKeySubmit} loading={loading} />
          
          {error && (
            <div className="max-w-2xl mx-auto mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Library Compare</h1>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSetup(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-card rounded-lg p-4 border">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Total Games</div>
            </div>
            <div className="text-2xl font-bold">{totalGames}</div>
          </div>
          
          <div className="bg-card rounded-lg p-4 border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <div className="text-sm text-muted-foreground">Steam</div>
            </div>
            <div className="text-2xl font-bold">{steamGames}</div>
          </div>
          
          <div className="bg-card rounded-lg p-4 border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <div className="text-sm text-muted-foreground">Xbox</div>
            </div>
            <div className="text-2xl font-bold">{xboxGames}</div>
          </div>
          
          <div className="bg-card rounded-lg p-4 border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <div className="text-sm text-muted-foreground">GOG</div>
            </div>
            <div className="text-2xl font-bold">{gogGames}</div>
          </div>
          
          <div className="bg-card rounded-lg p-4 border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <div className="text-sm text-muted-foreground">Cross-Platform</div>
            </div>
            <div className="text-2xl font-bold">{crossPlatformGames}</div>
          </div>
        </div>

        {/* Game Table */}
        <div className="bg-card rounded-lg border">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Your Game Library</h2>
            <GameTable games={gameLibrary.unified} loading={loading} />
          </div>
        </div>
      </main>
    </div>
  );
}