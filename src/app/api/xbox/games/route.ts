import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokens } = body;

    console.log('Received tokens:', {
      hasTokens: !!tokens,
      hasXstsToken: !!tokens?.xstsToken,
      hasUhs: !!tokens?.uhs,
      hasXuid: !!tokens?.xuid,
      tokenKeys: tokens ? Object.keys(tokens) : 'no tokens'
    });

    if (!tokens || !tokens.xstsToken || !tokens.uhs) {
      return NextResponse.json(
        { 
          error: 'Missing required Xbox Live tokens',
          received: tokens ? Object.keys(tokens) : 'no tokens',
          details: {
            hasXstsToken: !!tokens?.xstsToken,
            hasUhs: !!tokens?.uhs,
            hasXuid: !!tokens?.xuid
          }
        },
        { status: 400 }
      );
    }

    try {
      console.log('Fetching Xbox games with tokens:', {
        uhs: tokens.uhs ? 'present' : 'missing',
        xstsToken: tokens.xstsToken ? 'present' : 'missing',
        xuid: tokens.xuid
      });

      // Use the XSTS token to fetch user's title history (games) using their XUID
      if (!tokens.xuid) {
        throw new Error('Xbox User ID (XUID) not available in tokens');
      }

      const titleHistoryUrl = `https://titlehub.xboxlive.com/users/xuid(${tokens.xuid})/titles/titlehistory/decoration/detail`;
      
      const response = await fetch(titleHistoryUrl, {
        headers: {
          'Authorization': `XBL3.0 x=${tokens.uhs};${tokens.xstsToken}`,
          'X-XBL-Contract-Version': '2',
          'Accept': 'application/json',
          'Accept-Language': 'en-US',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      console.log('Xbox title history API response:', {
        status: response.status,
        statusText: response.statusText,
        url: titleHistoryUrl
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Xbox API error response:', errorText);
        throw new Error(`Xbox API responded with status: ${response.status} - ${errorText}`);
      }

      const titleData = await response.json();
      
      console.log('Xbox title data received:', {
        titlesCount: titleData.titles?.length || 0,
        sampleTitle: titleData.titles?.[0]
      });
      
      // Extract games from title history
      const games: Array<{
        titleId: string;
        name: string;
        platform: string;
        displayImage?: string;
        lastPlayed?: string;
        mediaItemType?: string;
      }> = [];
      
      if (titleData.titles) {
        titleData.titles.forEach((title: any) => {
          games.push({
            titleId: title.titleId,
            name: title.name || title.displayName || `Game ${title.titleId}`,
            platform: 'Xbox',
            lastPlayed: title.lastTimePlayed,
            displayImage: title.displayImage,
            mediaItemType: title.mediaItemType
          });
        });
      }
      
      return NextResponse.json({ 
        titles: games,
        user: {
          xuid: tokens.xuid,
          gamertag: tokens.gamertag
        }
      });
      
    } catch (apiError: unknown) {
      console.error('Xbox API error:', apiError);
      
      let errorMessage = 'Failed to fetch Xbox games';
      const errorMsg = apiError instanceof Error ? apiError.message : String(apiError);
      if (errorMsg.includes('401') || errorMsg.includes('403')) {
        errorMessage = 'Xbox authentication expired. Please sign in again.';
      } else if (errorMsg.includes('404')) {
        errorMessage = 'Xbox game data not accessible. Your profile may be private.';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      );
    }
    
  } catch (error) {
    console.error('Xbox API proxy error:', error);
    return NextResponse.json(
      { error: 'Network error connecting to Xbox API' },
      { status: 500 }
    );
  }
}
