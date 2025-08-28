'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, ExternalLink, Key, Trash2 } from 'lucide-react';
import { getApiKeysCookie, setApiKeysCookie, clearApiKeysCookie, XboxTokens } from '@/lib/cookies';
import { XboxAPI } from '@/lib/api/xbox';

interface ApiKeys {
  steamApiKey: string;
  steamId: string;
  xboxTokens?: XboxTokens;
}

interface ApiKeySetupProps {
  onSubmit: (apiKeys: ApiKeys) => void;
  loading?: boolean;
}

export function ApiKeySetup({ onSubmit, loading = false }: ApiKeySetupProps) {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    steamApiKey: '',
    steamId: '',
    xboxTokens: undefined,
  });
  const [xboxAuthenticating, setXboxAuthenticating] = useState(false);
  const [showKeys, setShowKeys] = useState({
    steam: false,
    xbox: false,
  });
  const [hasStoredKeys, setHasStoredKeys] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    steamApiKey?: string;
    steamId?: string;
    xbox?: string;
  }>({});

  // Load stored API keys on component mount
  useEffect(() => {
    const storedKeys = getApiKeysCookie();
    if (storedKeys.steamApiKey || storedKeys.xboxTokens) {
      setApiKeys(prev => ({
        ...prev,
        steamApiKey: storedKeys.steamApiKey || '',
        steamId: storedKeys.steamId || '',
        xboxTokens: storedKeys.xboxTokens,
      }));
      setHasStoredKeys(true);
    }
  }, []);

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};
    
    // Skip validation for demo mode
    if (apiKeys.steamApiKey === 'demo') {
      setValidationErrors({});
      return true;
    }
    
    // Steam validation
    if (apiKeys.steamApiKey && apiKeys.steamId) {
      // Validate Steam API key (should be 32 character hex string)
      if (apiKeys.steamApiKey.length !== 32 || !/^[A-Fa-f0-9]+$/.test(apiKeys.steamApiKey)) {
        errors.steamApiKey = 'Steam API key must be exactly 32 hexadecimal characters';
      }
      
      // Validate Steam ID (should be 17 digits)
      if (!apiKeys.steamId.match(/^\d{17}$/)) {
        errors.steamId = 'Steam ID must be exactly 17 digits';
      }
    } else if (apiKeys.steamApiKey && !apiKeys.steamId) {
      errors.steamId = 'Steam ID is required when Steam API key is provided';
    } else if (!apiKeys.steamApiKey && apiKeys.steamId) {
      errors.steamApiKey = 'Steam API key is required when Steam ID is provided';
    }
    
    // Check if at least one platform is configured
    const hasSteam = apiKeys.steamApiKey && apiKeys.steamId;
    const hasXbox = apiKeys.xboxTokens;
    
    if (!hasSteam && !hasXbox) {
      errors.steamApiKey = 'Please configure at least one platform (Steam or Xbox)';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Save API keys to cookies (excluding demo values)
    if (apiKeys.steamApiKey !== 'demo' || apiKeys.xboxTokens) {
      setApiKeysCookie(apiKeys);
    }
    
    onSubmit(apiKeys);
  };

  const handleClearStoredKeys = () => {
    clearApiKeysCookie();
    setApiKeys({
      steamApiKey: '',
      steamId: '',
      xboxTokens: undefined,
    });
    setHasStoredKeys(false);
  };

  const handleXboxOAuth = async () => {
    setXboxAuthenticating(true);
    setValidationErrors(prev => ({ ...prev, xbox: undefined }));
    
    try {
      const result = await XboxAPI.startOAuthFlow();
      
      if (result.error === 'Xbox Live Setup Required') {
        // Show setup instructions
        let alertMessage = `${(result as any).message}\n\nSetup Steps:\n`;
        (result as any).setup.steps.forEach((step: string, i: number) => {
          alertMessage += `\n${i + 1}. ${step}`;
        });
        alertMessage += `\n\nRedirect URI: ${(result as any).setup.redirectUri}`;
        alertMessage += `\nEnvironment Variable: ${(result as any).setup.envVariable}`;
        alertMessage += `\n\nBenefits:\n`;
        (result as any).benefits.forEach((benefit: string) => {
          alertMessage += `\n• ${benefit}`;
        });
        
        alert(alertMessage);
        
        setValidationErrors(prev => ({ 
          ...prev, 
          xbox: 'Xbox Live setup required. Please register a Microsoft Azure app first.'
        }));
      } else if (result.authUrl) {
        // Open OAuth URL in popup window
        const popup = window.open(
          result.authUrl, 
          'xbox-oauth', 
          'width=500,height=600,scrollbars=yes,resizable=yes'
        );
        
        // Listen for OAuth completion
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'XBOX_AUTH_SUCCESS') {
            window.removeEventListener('message', handleMessage);
            popup?.close();
            
            // Store tokens and update UI
            const newApiKeys = { ...apiKeys, xboxTokens: event.data.tokens };
            setApiKeys(newApiKeys);
            
            // Save to cookies immediately
            setApiKeysCookie(newApiKeys);
            setXboxAuthenticating(false);
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        // Check if popup was blocked or closed manually
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', handleMessage);
            setXboxAuthenticating(false);
          }
        }, 1000);
        
      } else {
        throw new Error(result.error || 'Failed to start OAuth flow');
      }
      
    } catch (error) {
      console.error('Xbox OAuth error:', error);
      setValidationErrors(prev => ({ 
        ...prev, 
        xbox: error instanceof Error ? error.message : 'Failed to start Xbox authentication'
      }));
      setXboxAuthenticating(false);
    }
  };

  // Check for OAuth callback on component mount
  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Check URL search params for OAuth callback
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      
      if (code) {
        setXboxAuthenticating(true);
        try {
          const tokens = await XboxAPI.handleOAuthCallback(code);
          const newApiKeys = { ...apiKeys, xboxTokens: tokens };
          setApiKeys(newApiKeys);
          
          // Save to cookies immediately
          setApiKeysCookie(newApiKeys);
          
          // Clear the OAuth parameters from URL
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('code');
          newUrl.searchParams.delete('state');
          window.history.replaceState({}, '', newUrl.toString());
          
        } catch (error) {
          console.error('OAuth callback error:', error);
          setValidationErrors(prev => ({ 
            ...prev, 
            xbox: error instanceof Error ? error.message : 'OAuth authentication failed'
          }));
        } finally {
          setXboxAuthenticating(false);
        }
      }
      
      // Check URL fragment for tokens (alternative callback method)
      const fragment = window.location.hash;
      if (fragment.includes('xbox-auth-success=')) {
        try {
          const tokenMatch = fragment.match(/xbox-auth-success=([^&]+)/);
          if (tokenMatch) {
            const tokensString = decodeURIComponent(tokenMatch[1]);
            const tokens = JSON.parse(tokensString);
            const newApiKeys = { ...apiKeys, xboxTokens: tokens };
            setApiKeys(newApiKeys);
            
            // Save to cookies immediately
            setApiKeysCookie(newApiKeys);
            
            // Clear the fragment
            window.location.hash = '';
          }
        } catch (error) {
          console.error('Failed to parse OAuth tokens from URL fragment:', error);
        }
      }
    };

    handleOAuthCallback();
  }, []);

  const handleInputChange = (field: keyof ApiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field when user starts typing
    if (field !== 'xboxTokens' && validationErrors[field as keyof typeof validationErrors]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Key className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Setup API Access</h2>
        </div>
        <p className="text-muted-foreground">
          Configure your API keys to fetch your game libraries from different platforms.
        </p>
        
        {/* Demo Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-800">Want to try it first?</span>
          </div>
          <p className="text-xs text-blue-600 mb-3">
            Click "Try Demo with Sample Data" below to explore the application with realistic game data before setting up API keys.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Steam Section */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded"></div>
            <h3 className="text-lg font-semibold">Steam</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => window.open('https://steamcommunity.com/dev/apikey', '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              Get API Key
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => window.open('https://steamid.io/', '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              Get Steam ID
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Steam API Key</label>
              <div className="relative">
                <Input
                  type={showKeys.steam ? 'text' : 'password'}
                  placeholder="Enter your Steam API key"
                  value={apiKeys.steamApiKey}
                  onChange={(e) => handleInputChange('steamApiKey', e.target.value)}
                  className={validationErrors.steamApiKey ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowKeys(prev => ({ ...prev, steam: !prev.steam }))}
                >
                  {showKeys.steam ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {validationErrors.steamApiKey && (
                <p className="text-red-500 text-xs">{validationErrors.steamApiKey}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Steam ID</label>
              <Input
                type="text"
                placeholder="Your 17-digit Steam ID (e.g., 76561198012345678)"
                value={apiKeys.steamId}
                onChange={(e) => handleInputChange('steamId', e.target.value)}
                className={validationErrors.steamId ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
              />
              {validationErrors.steamId && (
                <p className="text-red-500 text-xs">{validationErrors.steamId}</p>
              )}
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Get your Steam API key from the link above (32 character hex string)</p>
            <p>• Find your 17-digit Steam ID using sites like steamid.io</p>
            <p>• Make sure your game library is set to public in Steam privacy settings</p>
          </div>
        </div>

        {/* Xbox Section */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded"></div>
            <h3 className="text-lg font-semibold">Xbox Live</h3>
            {apiKeys.xboxTokens && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Connected</span>
            )}
          </div>
          
          {!apiKeys.xboxTokens ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleXboxOAuth}
                  disabled={xboxAuthenticating}
                  className="flex-1"
                >
                  {xboxAuthenticating ? 'Authenticating...' : 'Sign in with Xbox Live'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => window.open('https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade', '_blank')}
                  title="Create Azure App Registration"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              
              {validationErrors.xbox && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-yellow-800 text-xs font-medium mb-1">Setup Required:</p>
                  <p className="text-yellow-700 text-xs">{validationErrors.xbox}</p>
                </div>
              )}
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium">✨ Professional OAuth Authentication:</p>
                <p>• Secure Microsoft OAuth 2.0 flow</p>
                <p>• Works with 2FA-enabled accounts</p>
                <p>• Your credentials never touch our servers</p>
                <p>• Revoke access anytime from Microsoft account settings</p>
                <p>• Production-ready authentication system</p>
              </div>
              
              <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                <p className="font-medium">⚙️ One-time Azure setup required:</p>
                <p>1. Click the <ExternalLink className="h-3 w-3 inline mx-1" /> button above to open Azure Portal</p>
                <p>2. Create new app registration with your domain as redirect URI</p>
                <p>3. Copy the Application (client) ID to XBOX_CLIENT_ID environment variable</p>
                <p>4. Restart your development server</p>
                <p className="mt-2 font-medium">📋 Your redirect URI: <span className="bg-gray-100 px-1 rounded text-gray-800">{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/xbox/callback</span></p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="text-sm text-green-600">✓ Xbox Live account connected</p>
                {apiKeys.xboxTokens.gamertag && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                    {apiKeys.xboxTokens.gamertag}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setApiKeys(prev => ({ ...prev, xboxTokens: undefined }))}
              >
                Disconnect Xbox Account
              </Button>
            </div>
          )}
        </div>

        {/* GOG Section (Note about limitations) */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-500 rounded"></div>
            <h3 className="text-lg font-semibold">GOG</h3>
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Coming Soon</span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            GOG API access requires special authentication and is not available for public use. 
            We're working on alternative solutions to include GOG games in your library comparison.
          </div>
        </div>

        <div className="space-y-3">
          {hasStoredKeys && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="text-sm text-green-700 dark:text-green-300 flex-1">
                Found saved credentials from previous session
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearStoredKeys}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          )}
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || (!apiKeys.steamApiKey && !apiKeys.xboxTokens)}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Fetching Libraries...
              </>
            ) : (
              'Fetch Game Libraries'
            )}
          </Button>
          
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-2">or</div>
            <Button 
              type="button"
              variant="outline"
              className="w-full border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700"
              onClick={() => onSubmit({ steamApiKey: 'demo', steamId: 'demo', xboxTokens: undefined })}
              disabled={loading}
            >
              🎮 Try Demo with Sample Data
            </Button>
          </div>
        </div>
      </form>

      <div className="text-xs text-center text-muted-foreground">
        Your API keys are only used to fetch your game data and are stored locally in cookies for convenience.
      </div>
    </div>
  );
}
