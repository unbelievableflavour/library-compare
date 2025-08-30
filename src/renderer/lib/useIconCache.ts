import { useState, useEffect } from 'react';

export function useIconCache(iconUrl: string | undefined) {
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!iconUrl) {
      setCachedUrl(null);
      return;
    }

    let isMounted = true;

    const loadIcon = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get or download the icon
        const result = await window.electronAPI.iconCache.getOrDownload(iconUrl);
        
        if (isMounted) {
          if (result) {
            setCachedUrl(result);
          } else {
            // Fallback to original URL if caching fails
            setCachedUrl(iconUrl);
          }
        }
      } catch (err) {
        console.error('Error loading cached icon:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load icon');
          // Fallback to original URL
          setCachedUrl(iconUrl);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadIcon();

    return () => {
      isMounted = false;
    };
  }, [iconUrl]);

  return {
    cachedUrl: cachedUrl || iconUrl, // Fallback to original URL
    loading,
    error
  };
}

// Hook for batch loading multiple icons
export function useBatchIconCache(iconUrls: (string | undefined)[]) {
  const [cachedUrls, setCachedUrls] = useState<(string | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!iconUrls.length) {
      setCachedUrls([]);
      return;
    }

    let isMounted = true;

    const loadIcons = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load all icons in parallel
        const results = await Promise.all(
          iconUrls.map(async (url) => {
            if (!url) return null;
            try {
              const result = await window.electronAPI.iconCache.getOrDownload(url);
              return result || url; // Fallback to original URL
            } catch (err) {
              console.error('Error loading cached icon:', url, err);
              return url; // Fallback to original URL
            }
          })
        );

        if (isMounted) {
          setCachedUrls(results);
        }
      } catch (err) {
        console.error('Error batch loading icons:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load icons');
          // Fallback to original URLs
          setCachedUrls(iconUrls.map(url => url || null));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadIcons();

    return () => {
      isMounted = false;
    };
  }, [iconUrls.join(',')]); // Re-run when URLs change

  return {
    cachedUrls: cachedUrls.length ? cachedUrls : iconUrls, // Fallback to original URLs
    loading,
    error
  };
}
