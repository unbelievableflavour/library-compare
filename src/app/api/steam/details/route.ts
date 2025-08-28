import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const appId = searchParams.get('appid');

  if (!appId) {
    return NextResponse.json(
      { error: 'Missing required parameter: appid' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&format=json`
    );

    if (!response.ok) {
      throw new Error(`Steam API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Steam API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Steam game details' },
      { status: 500 }
    );
  }
}
