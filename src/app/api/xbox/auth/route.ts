import { NextRequest, NextResponse } from 'next/server';
import { live } from '@xboxreplay/xboxlive-auth';

export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.XBOX_CLIENT_ID;
    const baseUrl = request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/xbox/callback`;

    if (!clientId) {
      // Provide setup instructions if no client ID is configured
      return NextResponse.json({
        error: 'Xbox Live Setup Required',
        message: 'To use Xbox Live integration, you need to register your own Microsoft Azure application.',
        setup: {
          required: true,
          steps: [
            'Go to https://portal.azure.com -> Azure Active Directory -> App registrations',
            'Click "New registration"',
            'Name: "Game Library Compare" (or any name you prefer)',
            'Supported account types: "Personal Microsoft accounts only"',
            `Redirect URI: ${redirectUri}`,
            'After registration, copy the "Application (client) ID"',
            'Set environment variable: XBOX_CLIENT_ID=your_client_id',
            'Restart your development server'
          ],
          redirectUri,
          envVariable: 'XBOX_CLIENT_ID'
        },
        benefits: [
          'Secure OAuth 2.0 authentication',
          'Works with 2FA enabled accounts',
          'Users never share passwords with your app',
          'Professional-grade authentication flow'
        ]
      });
    }

    // For personal Microsoft accounts, we need to manually construct the OAuth URL
    // because the package might not handle custom Azure apps correctly
    const state = Math.random().toString(36).substring(7);
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'XboxLive.signin XboxLive.offline_access',
      state: state
    });
    
    const authUrl = `https://login.live.com/oauth20_authorize.srf?${params.toString()}`;

    // Log the generated URL for debugging
    console.log('Generated OAuth URL:', authUrl);
    console.log('Redirect URI:', redirectUri);

    return NextResponse.json({
      success: true,
      authUrl,
      message: 'Ready to authenticate with Xbox Live'
    });

  } catch (error) {
    console.error('Xbox OAuth error:', error);
    return NextResponse.json(
      { error: 'Failed to generate Xbox OAuth URL' },
      { status: 500 }
    );
  }
}
