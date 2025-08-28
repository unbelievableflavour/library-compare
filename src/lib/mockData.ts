import { Game } from '@/types/game';

export const mockGameLibrary: Game[] = [
  {
    id: 'steam-291550',
    name: 'Brawlhalla',
    platforms: [
      { name: 'Steam', owned: true, playtime: 2450 },
      { name: 'Xbox', owned: true, playtime: 120 }
    ],
    appId: {
      steam: '291550',
      xbox: '9NBLGGH5SZJ8'
    },
    images: {
      header: 'https://cdn.akamai.steamstatic.com/steam/apps/291550/header.jpg',
      icon: 'https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/291550/1f18b0fab7fb00be1169f7cb7ad0e0c66a65e20c.jpg'
    },
    genres: ['Fighting', 'Free to Play'],
    playtime: {
      steam: 2450,
      xbox: 120
    }
  },
  {
    id: 'steam-271590',
    name: 'Grand Theft Auto V',
    platforms: [
      { name: 'Steam', owned: true, playtime: 8760 }
    ],
    appId: {
      steam: '271590'
    },
    images: {
      header: 'https://cdn.akamai.steamstatic.com/steam/apps/271590/header.jpg',
      icon: 'https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/271590/2ccf772c44b5dddd506de6c0f2dfbd8d11cf12b8.jpg'
    },
    genres: ['Action', 'Adventure', 'Open World'],
    playtime: {
      steam: 8760
    }
  },
  {
    id: 'xbox-halo-infinite',
    name: 'Halo Infinite',
    platforms: [
      { name: 'Xbox', owned: true, playtime: 1200 },
      { name: 'Steam', owned: true, playtime: 300 }
    ],
    appId: {
      xbox: '9PP5G1F0C2B6',
      steam: '1240440'
    },
    images: {
      header: 'https://cdn.akamai.steamstatic.com/steam/apps/1240440/header.jpg',
      icon: 'https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/1240440/3b11ccf7c06235c1938a6f86c93f32b73c51e441.jpg'
    },
    genres: ['First-Person Shooter', 'Sci-Fi'],
    playtime: {
      xbox: 1200,
      steam: 300
    }
  },
  {
    id: 'steam-812140',
    name: 'Assassin\'s Creed Valhalla',
    platforms: [
      { name: 'Steam', owned: true, playtime: 4200 }
    ],
    appId: {
      steam: '812140'
    },
    images: {
      header: 'https://cdn.akamai.steamstatic.com/steam/apps/812140/header.jpg',
      icon: 'https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/812140/6a64c25e21463d96c0d64fa8a8b5c1b984b1ab6a.jpg'
    },
    genres: ['Action', 'Adventure', 'RPG'],
    playtime: {
      steam: 4200
    }
  },
  {
    id: 'xbox-forza-horizon-5',
    name: 'Forza Horizon 5',
    platforms: [
      { name: 'Xbox', owned: true, playtime: 3600 }
    ],
    appId: {
      xbox: '9NKX70BBXDRN'
    },
    images: {
      header: 'https://store-images.s-microsoft.com/image/apps.12656.13544073797742157.b62beaec-4c1d-4c2a-9c18-81dd4f0c8f96.9b13b8dc-e67c-4b72-add7-f0e0b4d71194',
      icon: 'https://store-images.s-microsoft.com/image/apps.12656.13544073797742157.b62beaec-4c1d-4c2a-9c18-81dd4f0c8f96'
    },
    genres: ['Racing', 'Sports'],
    playtime: {
      xbox: 3600
    }
  },
  {
    id: 'steam-730',
    name: 'Counter-Strike 2',
    platforms: [
      { name: 'Steam', owned: true, playtime: 15420 }
    ],
    appId: {
      steam: '730'
    },
    images: {
      header: 'https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg',
      icon: 'https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/730/6b0312cda02f5f777efa2f3318c307ff9acafbb5.jpg'
    },
    genres: ['First-Person Shooter', 'Competitive'],
    playtime: {
      steam: 15420
    }
  },
  {
    id: 'gog-cyberpunk-2077',
    name: 'Cyberpunk 2077',
    platforms: [
      { name: 'GOG', owned: true },
      { name: 'Steam', owned: true, playtime: 6000 }
    ],
    appId: {
      gog: '1423049311',
      steam: '1091500'
    },
    images: {
      header: 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg',
      icon: 'https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/1091500/115cc44d45671635ee1ab4aa3bb209a7e0b9f6f3.jpg'
    },
    genres: ['RPG', 'Action', 'Sci-Fi'],
    playtime: {
      steam: 6000
    }
  },
  {
    id: 'steam-570',
    name: 'Dota 2',
    platforms: [
      { name: 'Steam', owned: true, playtime: 22800 }
    ],
    appId: {
      steam: '570'
    },
    images: {
      header: 'https://cdn.akamai.steamstatic.com/steam/apps/570/header.jpg',
      icon: 'https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/570/7a7ba73242bc4f7fb7a8efeff3d97ddf8c481bd9.jpg'
    },
    genres: ['MOBA', 'Strategy', 'Free to Play'],
    playtime: {
      steam: 22800
    }
  }
];
