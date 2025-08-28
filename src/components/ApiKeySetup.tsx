'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, ExternalLink, Key, Trash2 } from 'lucide-react';
import { getApiKeysCookie, setApiKeysCookie, clearApiKeysCookie } from '@/lib/cookies';

interface ApiKeys {
  steamApiKey: string;
  steamId: string;
  xboxApiKey: string;
  xboxGamertag: string;
}

interface ApiKeySetupProps {
  onSubmit: (apiKeys: ApiKeys) => void;
  loading?: boolean;
}

export function ApiKeySetup({ onSubmit, loading = false }: ApiKeySetupProps) {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    steamApiKey: '',
    steamId: '',
    xboxApiKey: '',
    xboxGamertag: '',
  });
  const [showKeys, setShowKeys] = useState({
    steam: false,
    xbox: false,
  });
  const [hasStoredKeys, setHasStoredKeys] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    steamApiKey?: string;
    steamId?: string;
    xboxApiKey?: string;
    xboxGamertag?: string;
  }>({});

  // Load stored API keys on component mount
  useEffect(() => {
    const storedKeys = getApiKeysCookie();
    if (storedKeys.steamApiKey || storedKeys.xboxApiKey) {
      setApiKeys(prev => ({
        ...prev,
        steamApiKey: storedKeys.steamApiKey || '',
        steamId: storedKeys.steamId || '',
        xboxApiKey: storedKeys.xboxApiKey || '',
        xboxGamertag: storedKeys.xboxGamertag || '',
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
    
    // Xbox validation
    if (apiKeys.xboxApiKey && !apiKeys.xboxGamertag) {
      errors.xboxGamertag = 'Xbox Gamertag is required when Xbox API key is provided';
    } else if (!apiKeys.xboxApiKey && apiKeys.xboxGamertag) {
      errors.xboxApiKey = 'Xbox API key is required when Xbox Gamertag is provided';
    }
    
    // Check if at least one platform is configured
    const hasSteam = apiKeys.steamApiKey && apiKeys.steamId;
    const hasXbox = apiKeys.xboxApiKey && apiKeys.xboxGamertag;
    
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
    if (apiKeys.steamApiKey !== 'demo' || apiKeys.xboxApiKey !== 'demo') {
      setApiKeysCookie(apiKeys);
    }
    
    onSubmit(apiKeys);
  };

  const handleClearStoredKeys = () => {
    clearApiKeysCookie();
    setApiKeys({
      steamApiKey: '',
      steamId: '',
      xboxApiKey: '',
      xboxGamertag: '',
    });
    setHasStoredKeys(false);
  };

  const handleInputChange = (field: keyof ApiKeys, value: string) => {
    setApiKeys(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
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
            <h3 className="text-lg font-semibold">Xbox</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => window.open('https://xbl.io/', '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
              Get API Key
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Xbox API Key (xbl.io)</label>
              <div className="relative">
                <Input
                  type={showKeys.xbox ? 'text' : 'password'}
                  placeholder="Enter your xbl.io API key"
                  value={apiKeys.xboxApiKey}
                  onChange={(e) => handleInputChange('xboxApiKey', e.target.value)}
                  className={validationErrors.xboxApiKey ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowKeys(prev => ({ ...prev, xbox: !prev.xbox }))}
                >
                  {showKeys.xbox ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {validationErrors.xboxApiKey && (
                <p className="text-red-500 text-xs">{validationErrors.xboxApiKey}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Xbox Gamertag</label>
              <Input
                type="text"
                placeholder="Your Xbox Gamertag"
                value={apiKeys.xboxGamertag}
                onChange={(e) => handleInputChange('xboxGamertag', e.target.value)}
                className={validationErrors.xboxGamertag ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
              />
              {validationErrors.xboxGamertag && (
                <p className="text-red-500 text-xs">{validationErrors.xboxGamertag}</p>
              )}
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Get a free API key from xbl.io (limited requests)</p>
            <p>• Enter your exact Xbox Gamertag</p>
            <p><strong>• Xbox profile must be public:</strong></p>
            <div className="ml-4 space-y-1 text-xs">
              <p>1. Go to <a href="https://account.xbox.com/en-us/Settings" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">account.xbox.com/Settings</a></p>
              <p>2. Select "Xbox privacy" → "View details & customize"</p>
              <p>3. Set "Others can see your game and app history" → <strong>Everyone</strong></p>
              <p>4. Set "Others can see if you're online" → <strong>Everyone</strong></p>
              <p>5. Changes take 5-15 minutes to take effect</p>
            </div>
          </div>
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
            disabled={loading || (!apiKeys.steamApiKey && !apiKeys.xboxApiKey)}
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
              onClick={() => onSubmit({ steamApiKey: 'demo', steamId: 'demo', xboxApiKey: 'demo', xboxGamertag: 'demo' })}
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
