import React, { useState, useMemo } from 'react';
import { Game, Platform } from '../../types/game';
import { GameLibraryManager } from '../lib/gameLibrary';
import { Search, ExternalLink, Clock, Gamepad2 } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { getPlatformIcon } from './PlatformIcons';



interface GameTableProps {
  games: Game[];
  loading?: boolean;
}

export function GameTable({ games, loading = false }: GameTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'playtime' | 'platforms'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedGames = useMemo(() => {
    let filtered = games.filter(game => {
      const matchesSearch = game.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPlatform = platformFilter === 'all' || 
        game.platforms.some(p => p.name.toLowerCase() === platformFilter.toLowerCase());
      
      return matchesSearch && matchesPlatform;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'playtime':
          const aPlaytime = Math.max(
            a.playtime?.steam || 0, 
            a.playtime?.xbox || 0,
            a.playtime?.epic || 0,
            a.playtime?.amazon || 0
          );
          const bPlaytime = Math.max(
            b.playtime?.steam || 0, 
            b.playtime?.xbox || 0,
            b.playtime?.epic || 0,
            b.playtime?.amazon || 0
          );
          comparison = aPlaytime - bPlaytime;
          break;
        case 'platforms':
          comparison = a.platforms.length - b.platforms.length;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [games, searchTerm, platformFilter, sortBy, sortOrder]);

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Loading your game libraries...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search games..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="px-3 py-2 border rounded-md bg-white"
          >
            <option value="all">All Platforms</option>
            <option value="steam">Steam</option>
            <option value="xbox">Xbox</option>
            <option value="gog">GOG</option>
            <option value="epic games">Epic Games</option>
            <option value="amazon games">Amazon Games</option>
          </select>
        </div>
      </div>

      {/* Games Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredAndSortedGames.length} of {games.length} games
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-hidden bg-white">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 font-medium hover:text-blue-600"
                >
                  Game
                  {sortBy === 'name' && (
                    <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('platforms')}
                  className="flex items-center gap-1 font-medium hover:text-blue-600"
                >
                  Platforms
                  {sortBy === 'platforms' && (
                    <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('playtime')}
                  className="flex items-center gap-1 font-medium hover:text-blue-600"
                >
                  Playtime
                  {sortBy === 'playtime' && (
                    <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              </th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedGames.map((game) => (
              <GameRow key={game.id} game={game} />
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSortedGames.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          No games found matching your criteria.
        </div>
      )}
    </div>
  );
}

function GameRow({ game }: { game: Game }) {
  const totalPlaytime = Math.max(
    game.playtime?.steam || 0, 
    game.playtime?.xbox || 0,
    game.playtime?.epic || 0,
    game.playtime?.amazon || 0
  );

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {game.images?.icon && (
            <img
              src={game.images.icon}
              alt={game.name}
              className="w-8 h-8 rounded object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <div>
            <div className="font-medium">{game.name}</div>
            {game.genres && game.genres.length > 0 && (
              <div className="text-xs text-gray-600">
                {game.genres.slice(0, 2).join(', ')}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          {(['Steam', 'Xbox', 'GOG', 'Epic Games', 'Amazon Games'] as const).map((platformName) => {
            const hasPlatform = game.platforms.some(p => p.name === platformName);

            return (
              <div
                key={platformName}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  hasPlatform 
                    ? GameLibraryManager.getPlatformColor(platformName as Platform['name'])
                    : 'text-transparent bg-transparent'
                }`}
                title={hasPlatform ? platformName : ''}
              >
                {getPlatformIcon(platformName, "h-4 w-4")}
              </div>
            );
          })}
        </div>
      </td>
      <td className="px-4 py-3">
        {totalPlaytime > 0 ? (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-gray-600" />
            <span>{GameLibraryManager.formatPlaytime(totalPlaytime)}</span>
          </div>
        ) : (
          <span className="text-gray-600">-</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          {game.appId?.steam && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`https://store.steampowered.com/app/${game.appId?.steam}`, '_blank')}
              title="View on Steam"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          {game.appId?.xbox && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`https://www.xbox.com/games/store/${game.appId?.xbox}`, '_blank')}
              title="View on Xbox"
            >
              <Gamepad2 className="h-4 w-4" />
            </Button>
          )}
          {game.appId?.gog && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`https://www.gog.com/game/${game.appId?.gog}`, '_blank')}
              title="View on GOG"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          {game.appId?.epic && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`https://store.epicgames.com/en-US/p/${game.appId?.epic}`, '_blank')}
              title="View on Epic Games Store"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          {game.appId?.amazon && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(`https://gaming.amazon.com/dp/${game.appId?.amazon}`, '_blank')}
              title="View on Amazon Games"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
