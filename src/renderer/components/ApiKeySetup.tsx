import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { getPlatformIcon } from './PlatformIcons';

interface GOGCredentials {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  session_id: string;
  refresh_token: string;
  user_id: string;
}

interface ApiKeys {
  steamApiKey?: string;
  steamId?: string;
  xboxCredentials?: any;
  gogCredentials?: GOGCredentials;
  epicCredentials?: any;
  amazonCredentials?: any;
}

interface ApiKeySetupProps {
  onSubmit?: (keys: ApiKeys) => void;
  loading?: boolean;
}

interface ValidationErrors {
  steam?: string;
  xbox?: string;
  gog?: string;
  epic?: string;
  amazon?: string;
}

export function ApiKeySetup({ onSubmit, loading = false }: ApiKeySetupProps) {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [hasStoredKeys, setHasStoredKeys] = useState(false);
  const [gogAuthenticating, setGogAuthenticating] = useState(false);
  const [xboxAuthenticating, setXboxAuthenticating] = useState(false);
  const [epicAuthenticating, setEpicAuthenticating] = useState(false);
  const [epicAuthCode, setEpicAuthCode] = useState('');
  const [showEpicCodeInput, setShowEpicCodeInput] = useState(false);
  const [amazonAuthenticating, setAmazonAuthenticating] = useState(false);

  // Load stored keys on component mount
  useEffect(() => {
    loadStoredKeys();
  }, []);

  const loadStoredKeys = async () => {
    try {
      const storedSteamApiKey = await window.electronAPI.store.get('steamApiKey');
      const storedSteamId = await window.electronAPI.store.get('steamId');
      const storedXboxCredentials = await window.electronAPI.store.get('xboxCredentials');
      const storedGogCredentials = await window.electronAPI.store.get('gogCredentials');
      const storedEpicCredentials = await window.electronAPI.store.get('epicCredentials');
      const storedAmazonCredentials = await window.electronAPI.store.get('amazonCredentials');

      const keys: ApiKeys = {};
      let hasKeys = false;

      if (storedSteamApiKey) {
        keys.steamApiKey = storedSteamApiKey;
        hasKeys = true;
      }
      if (storedSteamId) {
        keys.steamId = storedSteamId;
        hasKeys = true;
      }
      if (storedXboxCredentials) {
        keys.xboxCredentials = storedXboxCredentials;
        hasKeys = true;
      }
      if (storedGogCredentials) {
        keys.gogCredentials = storedGogCredentials;
        hasKeys = true;
      }
      if (storedEpicCredentials) {
        keys.epicCredentials = storedEpicCredentials;
        hasKeys = true;
      }
      if (storedAmazonCredentials) {
        keys.amazonCredentials = storedAmazonCredentials;
        hasKeys = true;
      }

      setApiKeys(keys);
      setHasStoredKeys(hasKeys);
    } catch (error) {
      console.error('Failed to load stored keys:', error);
    }
  };

  const handleGogAuth = async () => {
    setGogAuthenticating(true);
    setValidationErrors(prev => ({ ...prev, gog: undefined }));

    try {
      const credentials = await window.electronAPI.gog.authenticate();
      
      setApiKeys(prev => ({
        ...prev,
        gogCredentials: credentials
      }));
      
      // Store in Electron store
      await window.electronAPI.store.set('gogCredentials', credentials);
      setHasStoredKeys(true);
      
    } catch (error) {
      console.error('GOG authentication error:', error);
      setValidationErrors(prev => ({ 
        ...prev, 
        gog: error instanceof Error ? error.message : 'Authentication failed' 
      }));
    } finally {
      setGogAuthenticating(false);
    }
  };

  const handleGogDisconnect = async () => {
    setApiKeys(prev => ({ ...prev, gogCredentials: undefined }));
    await window.electronAPI.store.delete('gogCredentials');
    
    // Check if we still have other keys
    const hasOtherKeys = apiKeys.steamApiKey || apiKeys.steamId || apiKeys.xboxCredentials;
    setHasStoredKeys(hasOtherKeys);
  };

  const handleXboxAuth = async () => {
    setXboxAuthenticating(true);
    setValidationErrors(prev => ({ ...prev, xbox: undefined }));

    try {
      const credentials = await window.electronAPI.xbox.authenticate();
      
      setApiKeys(prev => ({
        ...prev,
        xboxCredentials: credentials
      }));
      
      await window.electronAPI.store.set('xboxCredentials', credentials);
      setHasStoredKeys(true);
      
    } catch (error) {
      console.error('Xbox authentication error:', error);
      setValidationErrors(prev => ({ 
        ...prev, 
        xbox: error instanceof Error ? error.message : 'Authentication failed' 
      }));
    } finally {
      setXboxAuthenticating(false);
    }
  };

  const handleEpicAuth = async () => {
    setValidationErrors(prev => ({ ...prev, epic: undefined }));
    
    // Show the code input immediately and start the auth process
    setShowEpicCodeInput(true);
    
    try {
      // Start the authentication process (opens browser)
      // This will open the browser but not wait for completion
      window.electronAPI.epic.authenticate().catch(error => {
        console.error('Epic authentication error:', error);
        if (!error.message?.includes('cancelled')) {
          setValidationErrors(prev => ({ 
            ...prev, 
            epic: error instanceof Error ? error.message : 'Authentication failed' 
          }));
        }
        setShowEpicCodeInput(false);
      });
      
    } catch (error) {
      console.error('Epic authentication start error:', error);
      setValidationErrors(prev => ({ 
        ...prev, 
        epic: error instanceof Error ? error.message : 'Failed to start authentication' 
      }));
      setShowEpicCodeInput(false);
    }
  };

  const handleEpicCodeSubmit = async () => {
    if (!epicAuthCode.trim()) {
      setValidationErrors(prev => ({ 
        ...prev, 
        epic: 'Please enter the authorization code' 
      }));
      return;
    }

    setEpicAuthenticating(true);
    setValidationErrors(prev => ({ ...prev, epic: undefined }));

    try {
      // Submit the authorization code
      await window.electronAPI.epic.submitAuthCode(epicAuthCode.trim());
      
      // Wait a moment for the authentication to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create mock credentials (legendary handles the actual auth)
      const credentials = {
        accessToken: 'legendary-managed',
        refreshToken: 'legendary-managed',
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        accountId: 'legendary-managed',
        displayName: 'Epic Games User'
      };
      
      // Store and set the credentials
      await window.electronAPI.store.set('epicCredentials', credentials);
      setApiKeys(prev => ({
        ...prev,
        epicCredentials: credentials
      }));
      setHasStoredKeys(true);
      setShowEpicCodeInput(false);
      setEpicAuthCode('');
      
    } catch (error) {
      console.error('Epic code submission error:', error);
      setValidationErrors(prev => ({ 
        ...prev, 
        epic: error instanceof Error ? error.message : 'Invalid authorization code' 
      }));
    } finally {
      setEpicAuthenticating(false);
    }
  };

  const handleEpicCancel = async () => {
    try {
      await window.electronAPI.epic.cancelAuth();
    } catch (error) {
      console.error('Epic cancel error:', error);
    }
    setEpicAuthenticating(false);
    setShowEpicCodeInput(false);
    setEpicAuthCode('');
    setValidationErrors(prev => ({ ...prev, epic: undefined }));
  };

  const handleEpicDisconnect = async () => {
    setApiKeys(prev => ({ ...prev, epicCredentials: undefined }));
    await window.electronAPI.store.delete('epicCredentials');
    
    const hasOtherKeys = apiKeys.steamApiKey || apiKeys.steamId || apiKeys.gogCredentials || apiKeys.xboxCredentials || apiKeys.amazonCredentials;
    setHasStoredKeys(hasOtherKeys);
  };

  const handleAmazonAuth = async () => {
    setAmazonAuthenticating(true);
    setValidationErrors(prev => ({ ...prev, amazon: undefined }));

    try {
      const credentials = await window.electronAPI.amazon.authenticate();
      
      setApiKeys(prev => ({
        ...prev,
        amazonCredentials: credentials
      }));
      
      await window.electronAPI.store.set('amazonCredentials', credentials);
      setHasStoredKeys(true);
      
    } catch (error) {
      console.error('Amazon authentication error:', error);
      setValidationErrors(prev => ({ 
        ...prev, 
        amazon: error instanceof Error ? error.message : 'Authentication failed' 
      }));
    } finally {
      setAmazonAuthenticating(false);
    }
  };

  const handleAmazonDisconnect = async () => {
    setApiKeys(prev => ({ ...prev, amazonCredentials: undefined }));
    await window.electronAPI.store.delete('amazonCredentials');
    
    const hasOtherKeys = apiKeys.steamApiKey || apiKeys.steamId || apiKeys.gogCredentials || apiKeys.xboxCredentials || apiKeys.epicCredentials;
    setHasStoredKeys(hasOtherKeys);
  };

  const handleXboxDisconnect = async () => {
    setApiKeys(prev => ({ ...prev, xboxCredentials: undefined }));
    await window.electronAPI.store.delete('xboxCredentials');
    
    const hasOtherKeys = apiKeys.steamApiKey || apiKeys.steamId || apiKeys.gogCredentials || apiKeys.epicCredentials || apiKeys.amazonCredentials;
    setHasStoredKeys(hasOtherKeys);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: ValidationErrors = {};
    
    // Validate Steam keys
    if (apiKeys.steamApiKey && !apiKeys.steamId) {
      errors.steam = 'Steam ID is required when API key is provided';
    }
    if (apiKeys.steamId && !apiKeys.steamApiKey) {
      errors.steam = 'Steam API key is required when Steam ID is provided';
    }

    setValidationErrors(errors);

    if (Object.keys(errors).length === 0) {
      // Store Steam keys
      if (apiKeys.steamApiKey) {
        await window.electronAPI.store.set('steamApiKey', apiKeys.steamApiKey);
      }
      if (apiKeys.steamId) {
        await window.electronAPI.store.set('steamId', apiKeys.steamId);
      }

      onSubmit?.(apiKeys);
    }
  };

  const handleSteamApiKeyChange = (value: string) => {
    setApiKeys(prev => ({ ...prev, steamApiKey: value }));
    setValidationErrors(prev => ({ ...prev, steam: undefined }));
  };

  const handleSteamIdChange = (value: string) => {
    setApiKeys(prev => ({ ...prev, steamId: value }));
    setValidationErrors(prev => ({ ...prev, steam: undefined }));
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Setup API Keys</h2>
        <p className="text-muted-foreground">
          Connect your gaming platforms to compare your libraries
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Steam Section */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white">
              {getPlatformIcon('Steam', 'h-4 w-4')}
            </div>
            <h3 className="text-lg font-semibold">Steam</h3>
            {apiKeys.steamApiKey && apiKeys.steamId && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Connected</span>
            )}
          </div>
          
          {validationErrors.steam && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {validationErrors.steam}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Steam API Key</label>
              <Input
                type="password"
                placeholder="Enter your Steam API key"
                value={apiKeys.steamApiKey || ''}
                onChange={(e) => handleSteamApiKeyChange(e.target.value)}
              />
              <div className="text-xs text-muted-foreground mt-1">
                Get your API key from{' '}
                <a 
                  href="#" 
                  onClick={() => window.electronAPI.app.openExternal('https://steamcommunity.com/dev/apikey')}
                  className="text-blue-600 hover:underline"
                >
                  Steam Web API
                </a>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Steam ID</label>
              <Input
                type="text"
                placeholder="Enter your Steam ID (e.g., 76561198000000000)"
                value={apiKeys.steamId || ''}
                onChange={(e) => handleSteamIdChange(e.target.value)}
              />
              <div className="text-xs text-muted-foreground mt-1">
                Find your Steam ID at{' '}
                <a 
                  href="#" 
                  onClick={() => window.electronAPI.app.openExternal('https://steamid.io')}
                  className="text-blue-600 hover:underline"
                >
                  SteamID.io
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Xbox Section */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center text-white">
              {getPlatformIcon('Xbox', 'h-4 w-4')}
            </div>
            <h3 className="text-lg font-semibold">Xbox</h3>
            {apiKeys.xboxCredentials && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Connected</span>
            )}
          </div>
          
          {validationErrors.xbox && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {validationErrors.xbox}
            </div>
          )}

          {!apiKeys.xboxCredentials ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Connect your Xbox account using OAuth2 authentication to import your game library.
              </div>
              <Button
                type="button"
                onClick={handleXboxAuth}
                disabled={xboxAuthenticating}
                className="w-full"
              >
                {xboxAuthenticating ? 'Connecting...' : 'Connect Xbox Account'}
              </Button>
              <div className="text-xs text-muted-foreground">
                This will open Xbox's authentication page in a new window. You'll need to log in and authorize access to your library.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                ✓ Xbox account connected successfully
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleXboxDisconnect}
                className="w-full"
              >
                Disconnect Xbox Account
              </Button>
            </div>
          )}
        </div>

        {/* Epic Games Section */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center text-white">
              {getPlatformIcon('Epic Games', 'h-4 w-4')}
            </div>
            <h3 className="text-lg font-semibold">Epic Games Store</h3>
            {apiKeys.epicCredentials && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Connected</span>
            )}
          </div>
          
          {validationErrors.epic && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {validationErrors.epic}
            </div>
          )}
          
          {!apiKeys.epicCredentials ? (
            <div className="space-y-3">
              {!showEpicCodeInput ? (
                <>
                  <div className="text-sm text-muted-foreground">
                    Connect your Epic Games account using the same method as Heroic Games Launcher.
                  </div>
                  <Button
                    type="button"
                    onClick={handleEpicAuth}
                    disabled={epicAuthenticating}
                    className="w-full"
                  >
                    {epicAuthenticating ? 'Connecting...' : 'Connect Epic Games Account'}
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    This will open legendary.gl/epiclogin in your browser. You'll need to log in and copy the authorization code from the JSON response.
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">Follow these steps to complete Epic Games authentication:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Log in to your Epic Games account in the browser window that opened (legendary.gl/epiclogin)</li>
                      <li>After logging in, you'll see a JSON response with an "authorizationCode" field</li>
                      <li>Copy the value from the "authorizationCode" field (without quotes) and paste it below</li>
                      <li>Example: if you see "authorizationCode":"abc123", copy just "abc123"</li>
                    </ol>
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Paste the authorizationCode value here..."
                      value={epicAuthCode}
                      onChange={(e) => setEpicAuthCode(e.target.value)}
                      className="w-full"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleEpicCodeSubmit}
                        disabled={!epicAuthCode.trim() || epicAuthenticating}
                        className="flex-1"
                      >
                        {epicAuthenticating ? 'Authenticating...' : 'Submit Code'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleEpicCancel}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                ✓ Epic Games account connected successfully
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleEpicDisconnect}
                className="w-full"
              >
                Disconnect Epic Games Account
              </Button>
            </div>
          )}
        </div>

        {/* Amazon Games Section */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-500 rounded flex items-center justify-center text-white">
              {getPlatformIcon('Amazon Games', 'h-4 w-4')}
            </div>
            <h3 className="text-lg font-semibold">Amazon Games</h3>
            {apiKeys.amazonCredentials && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Connected</span>
            )}
          </div>
          
          {validationErrors.amazon && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {validationErrors.amazon}
            </div>
          )}
          
          {!apiKeys.amazonCredentials ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Connect your Amazon Prime Gaming account using the nile binary (similar to Heroic Games Launcher). 
                This will attempt to use the nile tool for authentication and library access.
              </div>
              <Button
                type="button"
                onClick={handleAmazonAuth}
                disabled={amazonAuthenticating}
                className="w-full"
              >
                {amazonAuthenticating ? 'Connecting...' : 'Connect Amazon Prime Gaming'}
              </Button>
              <div className="text-xs text-muted-foreground">
                This will use the nile binary to authenticate with Amazon Prime Gaming. 
                If nile is not available, it will fall back to a manual browser-based process with sample games.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                ✓ Amazon Games account connected successfully
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAmazonDisconnect}
                className="w-full"
              >
                Disconnect Amazon Games Account
              </Button>
            </div>
          )}
        </div>

        {/* GOG Section */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center text-white">
              {getPlatformIcon('GOG', 'h-4 w-4')}
            </div>
            <h3 className="text-lg font-semibold">GOG</h3>
            {apiKeys.gogCredentials && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Connected</span>
            )}
          </div>
          
          {validationErrors.gog && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {validationErrors.gog}
            </div>
          )}

          {!apiKeys.gogCredentials ? (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Connect your GOG account using OAuth2 authentication to import your game library.
              </div>
              <Button
                type="button"
                onClick={handleGogAuth}
                disabled={gogAuthenticating}
                className="w-full"
              >
                {gogAuthenticating ? 'Connecting...' : 'Connect GOG Account'}
              </Button>
              <div className="text-xs text-muted-foreground">
                This will open GOG's authentication page in a new window. You'll need to log in and authorize access to your library.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                ✓ GOG account connected successfully
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleGogDisconnect}
                className="w-full"
              >
                Disconnect GOG Account
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <Button 
            type="submit" 
            disabled={loading || (!apiKeys.steamApiKey && !apiKeys.gogCredentials && !apiKeys.xboxCredentials)}
            className="flex-1"
          >
            {loading ? 'Loading...' : hasStoredKeys ? 'Update & Continue' : 'Continue'}
          </Button>
          
          {hasStoredKeys && (
            <Button 
              type="button" 
              variant="outline"
              onClick={() => onSubmit?.(apiKeys)}
              disabled={loading}
            >
              Skip Setup
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}