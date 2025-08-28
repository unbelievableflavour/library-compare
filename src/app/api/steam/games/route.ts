import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const apiKey = searchParams.get('key');
  const steamId = searchParams.get('steamid');

  if (!apiKey || !steamId) {
    return NextResponse.json(
      { error: 'Missing required parameters: key and steamid' },
      { status: 400 }
    );
  }

  // Basic validation
  if (apiKey.length < 20 || !steamId.match(/^\d{17}$/)) {
    return NextResponse.json(
      { 
        error: 'Invalid parameters. Steam API key should be 32 characters and Steam ID should be 17 digits.' 
      },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&format=json&include_appinfo=true&include_played_free_games=true`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Steam API error response:', response.status, errorText);
      
      let errorMessage = 'Failed to fetch Steam games';
      if (response.status === 401) {
        errorMessage = 'Invalid Steam API key';
      } else if (response.status === 403) {
        errorMessage = 'Steam profile is private or Steam ID is invalid';
      } else if (response.status === 500) {
        errorMessage = 'Steam API is currently unavailable';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Steam API proxy error:', error);
    return NextResponse.json(
      { error: 'Network error connecting to Steam API' },
      { status: 500 }
    );
  }
}
