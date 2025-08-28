# Library Compare

A modern Next.js application that allows you to view and compare your game libraries across multiple platforms including Steam, Xbox, and GOG in a unified interface.

## Features

🎮 **Multi-Platform Support**
- Steam library integration via Steam Web API
- Xbox library integration via xbl.io API
- GOG support (coming soon)

📊 **Unified View**
- Compare games across all platforms
- See which games you own on multiple platforms
- Track playtime across different platforms
- Beautiful, responsive table interface

🔍 **Smart Features**
- Search and filter games by name or platform
- Sort by name, playtime, or number of platforms
- Platform-specific badges and icons
- Links to game store pages

## Getting Started

### Prerequisites

- Node.js 18+ 
- Yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd library-compare
```

2. Install dependencies:
```bash
yarn install
```

3. Start the development server:
```bash
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Setup

### Steam Integration

1. Get your Steam API Key:
   - Visit [Steam Web API Key](https://steamcommunity.com/dev/apikey)
   - Sign in and register for an API key

2. Find your Steam ID:
   - Use tools like [steamid.io](https://steamid.io) to find your 64-bit Steam ID
   - Make sure your Steam profile and game library are set to public

### Xbox Integration

1. Get an xbl.io API Key:
   - Visit [xbl.io](https://xbl.io)
   - Sign up for a free account to get API access
   - Note: Free tier has limited requests

2. Ensure your Xbox profile is public

### Demo Mode

Don't have API keys? No problem! Click "Try Demo with Sample Data" to explore the application with sample game data.

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Components**: Custom UI components with shadcn/ui patterns

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── GameTable.tsx   # Main game display table
│   └── ApiKeySetup.tsx # API configuration form
├── lib/                # Utility functions and services
│   ├── api/            # Platform API integrations
│   ├── gameLibrary.ts  # Game library manager
│   ├── mockData.ts     # Sample data for demo
│   └── utils.ts        # Utility functions
└── types/              # TypeScript type definitions
```

## API Integrations

### Steam Web API
- Uses `GetOwnedGames` endpoint to fetch game library
- Includes playtime data and game metadata
- Requires Steam API key and Steam ID

### Xbox Live API (xbl.io)
- Third-party service for Xbox Live data access
- Fetches owned games and profile information
- Requires xbl.io API key and Xbox Gamertag

### GOG Integration
- Currently not implemented due to API limitations
- GOG doesn't provide public API access for user libraries

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Privacy & Security

- API keys are only used client-side to fetch your data
- No data is stored on our servers
- All API calls are made directly from your browser to the respective services

## Roadmap

- [ ] GOG Galaxy integration when API becomes available
- [ ] Export functionality (CSV, JSON)
- [ ] Advanced filtering and sorting options
- [ ] Game screenshots and detailed information
- [ ] Achievement tracking across platforms
- [ ] Price comparison across platforms
- [ ] Wishlist management

## Support

If you encounter any issues or have questions, please open an issue on GitHub.