import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing required parameter: apiKey' },
        { status: 400 }
      );
    }

    // Basic validation
    if (typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'Invalid parameter type: apiKey must be a string' },
        { status: 400 }
      );
    }

    const response = await fetch('https://xbl.io/api/v2/player/titleHistory', {
      method: 'GET',
      headers: {
        'X-Authorization': apiKey,
        'X-Contract': '100',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Xbox API error response:', response.status, errorText);
      
      let errorMessage = 'Failed to fetch Xbox games';
      if (response.status === 401) {
        errorMessage = 'Invalid Xbox API key';
      } else if (response.status === 404) {
        errorMessage = 'Xbox user not found or games list is private';
      } else if (response.status === 429) {
        errorMessage = 'Xbox API rate limit exceeded. Please try again later.';
      } else if (response.status === 403) {
        errorMessage = 'Xbox API access forbidden. Check your API key permissions.';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Xbox API proxy error:', error);
    return NextResponse.json(
      { error: 'Network error connecting to Xbox API' },
      { status: 500 }
    );
  }
}
