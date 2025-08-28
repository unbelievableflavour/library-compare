import { NextRequest, NextResponse } from 'next/server';
import { live, xnet } from '@xboxreplay/xboxlive-auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    // Log all parameters for debugging
    console.log('OAuth callback received:', {
      code: code ? 'present' : 'missing',
      state: state ? 'present' : 'missing',
      error,
      errorDescription,
      allParams: Object.fromEntries(searchParams.entries())
    });
    
    if (error) {
      return NextResponse.json(
        { error: `OAuth error: ${error}`, description: errorDescription },
        { status: 400 }
      );
    }
    
    if (!code) {
      return NextResponse.json(
        { 
          error: 'Missing authorization code',
          received: Object.fromEntries(searchParams.entries()),
          note: 'The OAuth flow did not return an authorization code'
        },
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
      // Step 1: Exchange authorization code for access token with client secret
      const redirectUri = `${request.nextUrl.origin}/api/xbox/callback`;
      
      // Manual token exchange since we need to include client_secret
      const tokenParams = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      });

      // Log the token request for debugging
      console.log('Token exchange request:', {
        url: 'https://login.live.com/oauth20_token.srf',
        params: {
          client_id: clientId,
          client_secret: clientSecret ? 'present' : 'missing',
          code: code ? 'present' : 'missing',
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        }
      });

      const tokenResponse = await fetch('https://login.live.com/oauth20_token.srf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: tokenParams.toString()
      });

      console.log('Token response status:', tokenResponse.status);
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.log('Token error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: 'parse_error', error_description: errorText };
        }
        
        throw new Error(`Token exchange failed: ${errorData.error} - ${errorData.error_description}`);
      }

      const tokenData = await tokenResponse.json();
      
      // Step 2: Convert access token to Xbox user token
      // Use 'd' parameter for custom Azure applications
      const userTokenResponse = await xnet.exchangeRpsTicketForUserToken(
        tokenData.access_token,
        'd'
      );
      
      // Step 3: Get XSTS token for Xbox Live services
      const xstsResponse = await xnet.exchangeTokenForXSTSToken(userTokenResponse.Token, {
        XSTSRelyingParty: 'http://xboxlive.com',
      });

      // Extract user information from the response
      const userInfo = xstsResponse.DisplayClaims.xui[0];
      
      // Prepare tokens for storage
      const tokens = {
        userToken: userTokenResponse.Token,
        xstsToken: xstsResponse.Token,
        uhs: userInfo?.uhs,
        xuid: userInfo?.xid,
        gamertag: userInfo?.gtg,
        refreshToken: tokenData.refresh_token,
        expiresOn: xstsResponse.NotAfter,
        accessToken: tokenData.access_token
      };

      // For web apps, we need to handle the redirect back to the frontend
      // Create a simple HTML page that passes the tokens to the parent window
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Xbox Live Authentication Success</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .success { color: green; font-size: 18px; margin-bottom: 20px; }
            .info { color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="success">✅ Xbox Live Authentication Successful!</div>
          <div class="info">Returning to application...</div>
          <script>
            // Pass tokens to parent window and close popup/redirect
            const tokens = ${JSON.stringify(tokens)};
            
            if (window.opener) {
              // If opened as popup
              window.opener.postMessage({ type: 'XBOX_AUTH_SUCCESS', tokens }, '*');
              window.close();
            } else {
              // If opened in same window, redirect back with tokens in URL fragment
              const tokenString = encodeURIComponent(JSON.stringify(tokens));
              window.location.href = '/#xbox-auth-success=' + tokenString;
            }
          </script>
        </body>
        </html>
      `;

      return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
      });

    } catch (authError) {
      console.error('Xbox authentication error:', authError);
      
      let errorMessage = 'Failed to authenticate with Xbox Live';
      if (authError.message?.includes('XSTSNotAuthorized')) {
        errorMessage = 'Xbox Live access denied. Your account may not have Xbox Live privileges.';
      } else if (authError.message?.includes('invalid_grant')) {
        errorMessage = 'Authorization code expired or invalid. Please try again.';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Xbox OAuth callback error:', error);
    return NextResponse.json(
      { error: 'OAuth callback processing failed' },
      { status: 500 }
    );
  }
}
