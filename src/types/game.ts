export interface Game {
  id: string;
  name: string;
  platforms: Platform[];
  appId?: {
    steam?: string;
    xbox?: string;
    gog?: string;
    epic?: string;
    amazon?: string;
  };
  images?: {
    header?: string;
    icon?: string;
    background?: string;
  };
  releaseDate?: string;
  genres?: string[];
  playtime?: {
    steam?: number; // minutes
    xbox?: number;
    epic?: number;
    amazon?: number;
  };
  achievements?: {
    steam?: { total: number; unlocked: number };
    xbox?: { total: number; unlocked: number };
  };
}

export interface Platform {
  name: 'Steam' | 'Xbox' | 'GOG' | 'Epic Games' | 'Amazon Games';
  owned: boolean;
  installed?: boolean;
  lastPlayed?: string;
  playtime?: number; // minutes
}

export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url?: string;
  img_logo_url?: string;
  playtime_windows_forever?: number;
  playtime_mac_forever?: number;
  playtime_linux_forever?: number;
  rtime_last_played?: number;
}

export interface SteamApiResponse {
  response: {
    game_count: number;
    games: SteamGame[];
  };
}

export interface XboxGame {
  titleId: string;
  name: string;
  images?: Array<{
    url: string;
    type: string;
  }>;
  genres?: string[];
  releaseDate?: string;
}

export interface GOGGame {
  id: number;
  title: string;
  image: string;
  url: string;
  releaseDate?: string;
  genres?: string[];
  // Add more fields based on the GamesDB API response
  summary?: string;
  developer?: string;
  publisher?: string;
  rating?: number;
}

export interface EpicGame {
  catalogItemId: string;
  title: string;
  description?: string;
  developer?: string;
  publisher?: string;
  keyImages?: Array<{
    type: string;
    url: string;
  }>;
  categories?: Array<{
    path: string;
  }>;
  releaseDate?: string;
  lastModifiedDate?: string;
}

export interface AmazonGame {
  id: string;
  title: string;
  description?: string;
  developer?: string;
  publisher?: string;
  images?: Array<{
    type: string;
    url: string;
  }>;
  releaseDate?: string;
  lastPlayed?: string;
  playtime?: number;
  installed?: boolean;
}

export interface GameLibrary {
  steam: Game[];
  xbox: Game[];
  gog: Game[];
  epic: Game[];
  amazon: Game[];
  unified: Game[];
}
