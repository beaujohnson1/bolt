import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import ebayOAuth from '../services/ebayOAuth';

interface EbayAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  tokens: any | null;
  error: string | null;
  lastChecked: number;
}

interface EbayAuthContextType extends EbayAuthState {
  refreshAuth: () => Promise<void>;
  clearAuth: () => void;
}

const EbayAuthContext = createContext<EbayAuthContextType | undefined>(undefined);

export const useEbayAuth = () => {
  const context = useContext(EbayAuthContext);
  if (!context) {
    throw new Error('useEbayAuth must be used within EbayAuthProvider');
  }
  return context;
};

export const EbayAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<EbayAuthState>({
    isAuthenticated: false,
    isLoading: true,
    tokens: null,
    error: null,
    lastChecked: 0
  });

  // Debounced refresh to prevent rapid-fire auth updates
  const debouncedRefreshAuth = oauthPerformanceOptimizer.debounce(() => {
    refreshAuth();
  }, 500, 'context_refresh_auth');

  const refreshAuth = useCallback(async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Use optimized operations with performance tracking
      const tokens = await oauthPerformanceOptimizer.exponentialBackoff(
        () => ebayOAuth.getValidAccessToken(),
        'get_valid_access_token'
      );
      
      const isAuth = ebayOAuth.isAuthenticated(); // This is now debounced
      
      setAuthState({
        isAuthenticated: isAuth,
        isLoading: false,
        tokens,
        error: null,
        lastChecked: Date.now()
      });
      
      console.log('🔄 [EBAY-AUTH] Auth state refreshed with performance optimization:', { isAuth, hasTokens: !!tokens });
    } catch (error) {
      console.error('❌ [EBAY-AUTH] Auth refresh failed:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
        lastChecked: Date.now()
      }));
    }
  }, []);

  const clearAuth = useCallback(() => {
    ebayOAuth.clearStoredTokens();
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      tokens: null,
      error: null,
      lastChecked: Date.now()
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    let processedUrlCallback = false;
    
    // Check URL parameters first (only once)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ebay_connected') === 'true' && !processedUrlCallback) {
      processedUrlCallback = true;
      console.log('🎉 [EBAY-AUTH] OAuth success detected in URL, processing with enhanced checking...');
      
      // Clean URL immediately to prevent multiple processing
      const url = new URL(window.location.href);
      url.searchParams.delete('ebay_connected');
      url.searchParams.delete('timestamp');
      window.history.replaceState({}, '', url.toString());
      
      // Multiple auth refresh attempts with increasing delays
      const refreshDelays = [500, 1000, 2000, 3000];
      refreshDelays.forEach((delay, index) => {
        setTimeout(() => {
          if (mounted) {
            console.log(`🔄 [EBAY-AUTH] Auth refresh attempt ${index + 1}/4 (${delay}ms)...`);
            refreshAuth();
          }
        }, delay);
      });
    } else {
      // Initial auth check for normal page loads
      refreshAuth();
    }
    
    // Set up auth watcher with enhanced responsiveness
    const unwatch = ebayOAuth.watchForTokenChanges(async (authenticated) => {
      if (!mounted) return;
      
      console.log('🔄 [EBAY-AUTH] Token change detected via watcher:', authenticated);
      
      // Immediate refresh plus delayed backup
      await refreshAuth();
      setTimeout(async () => {
        if (mounted) {
          await refreshAuth();
        }
      }, 500);
    });

    // Set up optimized event listeners for performance
    const handleOptimizedBatchEvent = (event: CustomEvent) => {
      if (!mounted) return;
      
      const { detail } = event;
      if (detail.type === 'ebayAuthChanged') {
        console.log('📡 [EBAY-AUTH] Optimized batch auth event received:', detail);
        // Use debounced refresh to prevent rapid-fire updates
        debouncedRefreshAuth();
      }
    };

    // Set up BroadcastChannel listener for cross-tab communication
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('ebay-auth');
      channel.addEventListener('message', (event) => {
        if (!mounted) return;
        
        if (event.data.type === 'AUTH_CHANGED') {
          console.log('📡 [EBAY-AUTH] Auth change received via BroadcastChannel:', event.data);
          debouncedRefreshAuth();
        }
      });
    }

    // Listen for optimized batch events
    window.addEventListener('oauthBatchEvent', handleOptimizedBatchEvent);

    return () => {
      mounted = false;
      unwatch();
      if (channel) {
        channel.close();
      }
      window.removeEventListener('oauthBatchEvent', handleOptimizedBatchEvent);
    };
  }, [refreshAuth]);

  const value = {
    ...authState,
    refreshAuth,
    clearAuth
  };

  return (
    <EbayAuthContext.Provider value={value}>
      {children}
    </EbayAuthContext.Provider>
  );
};