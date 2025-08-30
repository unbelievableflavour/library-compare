import React, { useState, useMemo } from 'react';
import { Game, Platform } from '../../types/game';
import { GameLibraryManager } from '../lib/gameLibrary';
import { Search, ExternalLink, Clock, Gamepad2 } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSteam, faXbox } from '@fortawesome/free-brands-svg-icons';
import { Input } from './ui/input';
import { Button } from './ui/button';

// Custom GOG Icon Component
function GOGIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className}
      fill="currentColor" 
      viewBox="0 0 32 32" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9.531 20.317h-3.719c-0.291 0-0.531 0.24-0.531 0.537v2.667c0 0.281 0.24 0.531 0.531 0.531h3.735v1.76h-4.667c-0.744 0-1.359-0.615-1.359-1.375v-4.516c0-0.749 0.615-1.359 1.375-1.359h4.635zM10.88 15.385c0 0.776-0.625 1.401-1.401 1.401h-5.973v-1.803h5.041c0.297 0 0.532-0.235 0.532-0.531v-5.932c0-0.297-0.235-0.537-0.532-0.537h-2.692c-0.303-0.005-0.548 0.235-0.548 0.537v2.692c0 0.308 0.24 0.532 0.532 0.532h2.161v1.801h-3.093c-0.771 0-1.401-0.615-1.401-1.385v-4.588c0-0.761 0.631-1.385 1.401-1.385h4.563c0.771 0 1.395 0.624 1.395 1.385v7.812zM28.479 25.812h-1.76v-5.495h-1.24c-0.291 0-0.531 0.24-0.531 0.537v4.957h-1.776v-5.495h-1.24c-0.292 0-0.531 0.24-0.531 0.537v4.957h-1.776v-5.891c0-0.749 0.615-1.359 1.375-1.359h7.479zM28.495 15.385c0 0.776-0.631 1.401-1.401 1.401h-5.973v-1.803h5.041c0.292 0 0.532-0.235 0.532-0.531v-5.932c0-0.297-0.24-0.537-0.532-0.537h-2.708c-0.297 0-0.532 0.24-0.532 0.537v2.692c0 0.308 0.24 0.532 0.532 0.532h2.161v1.801h-3.084c-0.771 0-1.395-0.615-1.395-1.385v-4.588c0-0.761 0.624-1.385 1.395-1.385h4.573c0.776 0 1.401 0.624 1.401 1.385v7.812zM18.292 6.188h-4.584c-0.776 0-1.391 0.624-1.391 1.385v4.588c0 0.771 0.615 1.385 1.391 1.385h4.584c0.76 0 1.391-0.615 1.391-1.385v-4.588c0-0.761-0.631-1.385-1.391-1.385zM17.896 8.521v2.692c0 0.297-0.24 0.532-0.536 0.532h-2.709c-0.291 0-0.531-0.235-0.531-0.532v-2.683c0-0.291 0.229-0.531 0.531-0.531h2.683c0.307 0 0.531 0.24 0.531 0.531zM16.839 18.563h-4.521c-0.755 0-1.369 0.609-1.369 1.359v4.516c0 0.76 0.615 1.375 1.369 1.375h4.521c0.76 0 1.375-0.615 1.375-1.375v-4.516c0-0.749-0.615-1.359-1.375-1.359zM16.437 20.855v2.667c0 0.291-0.235 0.531-0.531 0.531v-0.011h-2.652c-0.296 0-0.536-0.239-0.536-0.536v-2.651c0-0.292 0.24-0.537 0.536-0.537h2.667c0.292 0 0.532 0.245 0.532 0.537zM31.317 1.469c-0.432-0.448-1.031-0.693-1.651-0.699h-27.333c-1.292-0.005-2.339 1.041-2.333 2.333v25.792c-0.005 1.292 1.041 2.339 2.333 2.333h27.333c1.292 0.005 2.339-1.041 2.333-2.333v-25.792c0-0.635-0.265-1.224-0.683-1.651zM31.317 28.896c0.011 0.911-0.733 1.656-1.651 1.651h-27.333c-0.921 0.016-1.672-0.735-1.667-1.651v-25.792c-0.005-0.911 0.74-1.656 1.651-1.651h27.333c0.917 0 1.656 0.74 1.656 1.651v25.792z"/>
    </svg>
  );
}

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
          const aPlaytime = Math.max(a.playtime?.steam || 0, a.playtime?.xbox || 0);
          const bPlaytime = Math.max(b.playtime?.steam || 0, b.playtime?.xbox || 0);
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
  const totalPlaytime = Math.max(game.playtime?.steam || 0, game.playtime?.xbox || 0);

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
          {(['Steam', 'Xbox', 'GOG'] as const).map((platformName) => {
            const hasPlatform = game.platforms.some(p => p.name === platformName);
            
            const renderIcon = () => {
              switch (platformName) {
                case 'Steam':
                  return <FontAwesomeIcon icon={faSteam} className="h-4 w-4" />;
                case 'Xbox':
                  return <FontAwesomeIcon icon={faXbox} className="h-4 w-4" />;
                case 'GOG':
                  return <GOGIcon className="h-4 w-4" />;
                default:
                  return null;
              }
            };

            return (
              <div
                key={platformName}
                className={`p-2 rounded-full ${
                  hasPlatform 
                    ? GameLibraryManager.getPlatformColor(platformName as Platform['name'])
                    : 'text-transparent bg-transparent'
                }`}
                title={hasPlatform ? platformName : ''}
              >
                {renderIcon()}
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
        </div>
      </td>
    </tr>
  );
}
