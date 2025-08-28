interface XboxTokens {
  userToken: string;
  xstsToken: string;
  uhs: string;
  xuid?: string;
  gamertag?: string;
  refreshToken?: string;
  expiresOn?: string;
  accessToken?: string;
}

interface ApiKeysData {
  steamApiKey?: string;
  steamId?: string;
  xboxTokens?: XboxTokens;
}

const COOKIE_NAME = 'library-compare-api-keys';

export function getApiKeysCookie(): ApiKeysData {
  if (typeof window === 'undefined') return {};
  
  try {
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${COOKIE_NAME}=`));
    
    if (cookie) {
      const value = cookie.split('=')[1];
      return JSON.parse(decodeURIComponent(value));
    }
  } catch (error) {
    console.warn('Error reading API keys cookie:', error);
  }
  
  return {};
}

export function setApiKeysCookie(apiKeys: ApiKeysData): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Set cookie to expire in 90 days for longer Xbox session persistence
    const expires = new Date();
    expires.setDate(expires.getDate() + 90);
    
    const cookieValue = encodeURIComponent(JSON.stringify(apiKeys));
    document.cookie = `${COOKIE_NAME}=${cookieValue}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
  } catch (error) {
    console.warn('Error setting API keys cookie:', error);
  }
}

export function clearApiKeysCookie(): void {
  if (typeof window === 'undefined') return;
  
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export function hasStoredApiKeys(): boolean {
  const apiKeys = getApiKeysCookie();
  return !!(apiKeys.steamApiKey || apiKeys.xboxTokens);
}

export type { XboxTokens };