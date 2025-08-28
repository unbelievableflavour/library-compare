import { NextRequest, NextResponse } from 'next/server';
import { xnet } from '@xboxreplay/xboxlive-auth';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    const clientId = process.env.XBOX_CLIENT_ID;
    const clientSecret = process.env.XBOX_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Xbox Live client ID or secret not configured' },
        { status: 500 }
      );
    }

    try {
      console.log('Refreshing Xbox access token...');
      
      // Step 1: Use refresh token to get new access token
      const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      });

      const tokenResponse = await fetch('https://login.live.com/oauth20_token.srf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenParams.toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.log('Token refresh error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: 'parse_error', error_description: errorText };
        }
        
        throw new Error(`Token refresh failed: ${errorData.error} - ${errorData.error_description}`);
      }

      const tokenData = await tokenResponse.json();
      
      // Step 2: Convert new access token to Xbox user token
      const userTokenResponse = await xnet.exchangeRpsTicketForUserToken(
        tokenData.access_token,
        'd'
      );
      
      // Step 3: Get new XSTS token for Xbox Live services
      const xstsResponse = await xnet.exchangeTokenForXSTSToken(userTokenResponse.Token, {
        XSTSRelyingParty: 'http://xboxlive.com',
      });

      // Extract user information from the response
      const userInfo = xstsResponse.DisplayClaims.xui[0];
      
      // Prepare refreshed tokens
      const tokens = {
        userToken: userTokenResponse.Token,
        xstsToken: xstsResponse.Token,
        uhs: userInfo?.uhs,
        xuid: userInfo?.xid,
        gamertag: userInfo?.gtg,
        refreshToken: tokenData.refresh_token || refreshToken, // Use new refresh token if provided
        expiresOn: xstsResponse.NotAfter,
        accessToken: tokenData.access_token
      };

      console.log('Xbox tokens refreshed successfully');

      return NextResponse.json({
        success: true,
        tokens,
        message: 'Tokens refreshed successfully'
      });

    } catch (authError) {
      console.error('Xbox token refresh error:', authError);
      
      let errorMessage = 'Failed to refresh Xbox Live tokens';
      if (authError.message?.includes('invalid_grant')) {
        errorMessage = 'Refresh token expired or invalid. Please re-authenticate with Xbox Live.';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Xbox token refresh processing error:', error);
    return NextResponse.json(
      { error: 'Token refresh processing failed' },
      { status: 500 }
    );
  }
}
