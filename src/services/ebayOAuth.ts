// eBay OAuth Service
// Handles OAuth flow for eBay user authentication

export interface EbayOAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  expires_at?: number; // Calculated expiry timestamp
}

export interface EbayAuthUrl {
  authUrl: string;
  state: string;
  redirectUri: string;
  environment: string;
}

class EbayOAuthService {
  private baseUrl: string;

  constructor() {
    // Use Netlify functions in production, localhost in development
    this.baseUrl = import.meta.env.DEV 
      ? '/.netlify/functions'  // Netlify dev handles this properly
      : '/.netlify/functions';
    
    console.log('🔐 [EBAY-OAUTH] Service initialized with base URL:', this.baseUrl);
  }

  /**
   * Get eBay OAuth authorization URL
   */
  async getAuthorizationUrl(redirectUri?: string): Promise<EbayAuthUrl> {
    try {
      console.log('🔗 [EBAY-OAUTH] Getting authorization URL...');
      
      const params = new URLSearchParams();
      params.append('action', 'get-auth-url');
      
      if (redirectUri) {
        params.append('redirect_uri', redirectUri);
      }

      const response = await fetch(`${this.baseUrl}/ebay-oauth?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get authorization URL');
      }

      const result = await response.json();
      console.log('✅ [EBAY-OAUTH] Authorization URL generated successfully');
      
      return result as EbayAuthUrl;
    } catch (error) {
      console.error('❌ [EBAY-OAUTH] Error getting authorization URL:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, redirectUri: string, state: string): Promise<EbayOAuthTokens> {
    try {
      console.log('🔄 [EBAY-OAUTH] Exchanging authorization code for tokens...');
      
      const response = await fetch(`${this.baseUrl}/ebay-oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'exchange-code',
          code,
          redirect_uri: redirectUri,
          state
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to exchange code for token');
      }

      const tokens = await response.json();
      
      // Calculate expiry timestamp
      if (tokens.expires_in) {
        tokens.expires_at = Date.now() + (tokens.expires_in * 1000);
      }

      console.log('✅ [EBAY-OAUTH] Token exchange successful');
      
      // Store tokens in localStorage for persistence
      this.storeTokens(tokens);
      
      return tokens as EbayOAuthTokens;
    } catch (error) {
      console.error('❌ [EBAY-OAUTH] Error exchanging code for token:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken?: string): Promise<EbayOAuthTokens> {
    try {
      console.log('🔄 [EBAY-OAUTH] Refreshing access token...');
      
      const token = refreshToken || this.getStoredTokens()?.refresh_token;
      
      if (!token) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${this.baseUrl}/ebay-oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'refresh-token',
          refresh_token: token
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to refresh token');
      }

      const tokens = await response.json();
      
      // Calculate expiry timestamp
      if (tokens.expires_in) {
        tokens.expires_at = Date.now() + (tokens.expires_in * 1000);
      }

      console.log('✅ [EBAY-OAUTH] Token refresh successful');
      
      // Update stored tokens
      this.storeTokens(tokens);
      
      return tokens as EbayOAuthTokens;
    } catch (error) {
      console.error('❌ [EBAY-OAUTH] Error refreshing access token:', error);
      throw error;
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(): Promise<string | null> {
    try {
      const tokens = this.getStoredTokens();
      const manualToken = localStorage.getItem('ebay_manual_token');
      
      // First, try OAuth tokens
      if (tokens?.access_token) {
        // Check if token is expired (with 5 minute buffer)
        const isExpired = tokens.expires_at && (Date.now() + 300000) > tokens.expires_at;
        
        if (isExpired && tokens.refresh_token) {
          console.log('🔄 [EBAY-OAUTH] Token expired, refreshing...');
          try {
            const newTokens = await this.refreshAccessToken(tokens.refresh_token);
            return newTokens.access_token;
          } catch (refreshError) {
            console.error('❌ [EBAY-OAUTH] Token refresh failed:', refreshError);
            // Fall back to manual token if refresh fails
            if (manualToken && manualToken !== 'dev_mode_bypass_token') {
              console.log('🔄 [EBAY-OAUTH] Falling back to manual token after refresh failure');
              return manualToken;
            }
            this.clearStoredTokens();
            return null;
          }
        }
        
        if (isExpired && !tokens.refresh_token) {
          console.log('⚠️ [EBAY-OAUTH] Token expired and no refresh token available');
          // Fall back to manual token
          if (manualToken && manualToken !== 'dev_mode_bypass_token') {
            console.log('🔄 [EBAY-OAUTH] Falling back to manual token');
            return manualToken;
          }
          this.clearStoredTokens();
          return null;
        }

        console.log('✅ [EBAY-OAUTH] Using valid OAuth token');
        return tokens.access_token;
      }
      
      // Fall back to manual token
      if (manualToken && manualToken !== 'dev_mode_bypass_token') {
        console.log('✅ [EBAY-OAUTH] Using manual token');
        return manualToken;
      }
      
      console.log('ℹ️ [EBAY-OAUTH] No valid tokens found');
      return null;
    } catch (error) {
      console.error('❌ [EBAY-OAUTH] Error getting valid access token:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    try {
      // Enhanced debug logging FIRST
      console.log('🔍 [EBAY-OAUTH] Checking authentication status...');
      
      const rawTokens = localStorage.getItem('ebay_oauth_tokens');
      const manualToken = localStorage.getItem('ebay_manual_token');
      
      console.log('📋 [EBAY-OAUTH] Raw localStorage data:', {
        oauth_tokens_raw: rawTokens,
        manual_token_raw: manualToken,
        oauth_state_raw: localStorage.getItem('ebay_oauth_state')
      });
      
      // Parse tokens
      const tokens = this.getStoredTokens();
      
      console.log('🔍 [EBAY-OAUTH] Parsed token data:', {
        hasOAuthTokens: !!tokens?.access_token,
        hasManualToken: !!manualToken,
        oauthTokensData: tokens ? { 
          hasAccess: !!tokens.access_token, 
          hasRefresh: !!tokens.refresh_token,
          accessTokenLength: tokens.access_token?.length || 0,
          refreshTokenLength: tokens.refresh_token?.length || 0,
          expiresAt: tokens.expires_at,
          expiresAtFormatted: tokens.expires_at ? new Date(tokens.expires_at).toISOString() : 'N/A',
          isExpired: tokens.expires_at ? Date.now() >= tokens.expires_at : false,
          timeUntilExpiry: tokens.expires_at ? Math.round((tokens.expires_at - Date.now()) / 1000 / 60) + ' minutes' : 'N/A'
        } : null,
        manualTokenValue: manualToken,
        manualTokenLength: manualToken?.length || 0
      });
      
      // Check if we have valid OAuth tokens
      if (tokens?.access_token) {
        // Even if expired, consider authenticated - refresh will be handled elsewhere
        console.log('✅ [EBAY-OAUTH] User authenticated with OAuth tokens');
        return true;
      }
      
      // Check for manual token as fallback
      if (manualToken && manualToken !== 'dev_mode_bypass_token') {
        console.log('✅ [EBAY-OAUTH] User authenticated with manual token');
        return true;
      }
      
      console.log('❌ [EBAY-OAUTH] User not authenticated - no valid tokens found');
      return false;
    } catch (error) {
      console.error('❌ [EBAY-OAUTH] Error checking authentication:', error);
      return false;
    }
  }

  /**
   * Force refresh authentication status (useful after OAuth callback)
   */
  refreshAuthStatus(): boolean {
    console.log('🔄 [EBAY-OAUTH] Force refreshing authentication status...');
    
    // Clear any potential cache issues
    const tokens = this.getStoredTokens();
    const manualToken = localStorage.getItem('ebay_manual_token');
    
    console.log('🔍 [EBAY-OAUTH] Force refresh - current state:', {
      hasOAuthTokens: !!tokens?.access_token,
      hasManualToken: !!manualToken,
      localStorageKeys: Object.keys(localStorage).filter(key => key.includes('ebay'))
    });
    
    return this.isAuthenticated();
  }

  /**
   * Initiate OAuth flow by redirecting to eBay
   */
  async initiateOAuthFlow(redirectUri?: string): Promise<void> {
    try {
      const authData = await this.getAuthorizationUrl(redirectUri);
      
      // Store state for validation
      localStorage.setItem('ebay_oauth_state', authData.state);
      
      // Redirect to eBay
      window.location.href = authData.authUrl;
    } catch (error) {
      console.error('❌ [EBAY-OAUTH] Error initiating OAuth flow:', error);
      throw error;
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(code: string, state: string, redirectUri: string): Promise<EbayOAuthTokens> {
    try {
      // Validate state
      const storedState = localStorage.getItem('ebay_oauth_state');
      if (storedState !== state) {
        throw new Error('Invalid OAuth state parameter');
      }
      
      // Clean up stored state
      localStorage.removeItem('ebay_oauth_state');
      
      // Exchange code for tokens
      return await this.exchangeCodeForToken(code, redirectUri, state);
    } catch (error) {
      console.error('❌ [EBAY-OAUTH] Error handling OAuth callback:', error);
      throw error;
    }
  }

  /**
   * Sign out user
   */
  signOut(): void {
    console.log('👋 [EBAY-OAUTH] Signing out user...');
    this.clearStoredTokens();
  }


  /**
   * Listen for storage changes (e.g., from callback page)
   */
  watchForTokenChanges(callback: (authenticated: boolean) => void): () => void {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ebay_oauth_tokens' || e.key === 'ebay_manual_token') {
        console.log('📡 [EBAY-OAUTH] Token storage changed, checking auth status');
        // Add a small delay to ensure localStorage is updated
        setTimeout(() => {
          const isAuth = this.isAuthenticated();
          console.log('📡 [EBAY-OAUTH] Auth status after storage change:', isAuth);
          callback(isAuth);
        }, 50);
      }
    };

    const handleCustomEvent = (e: CustomEvent) => {
      console.log('📡 [EBAY-OAUTH] Custom auth event received:', e.detail);
      // Force a fresh check when custom event is received
      const isAuth = this.isAuthenticated();
      console.log('📡 [EBAY-OAUTH] Auth status after custom event:', isAuth);
      callback(isAuth);
    };

    // Also handle focus events (when user returns to tab)
    const handleFocus = () => {
      console.log('👁️ [EBAY-OAUTH] Window focus detected, checking auth status');
      const isAuth = this.isAuthenticated();
      console.log('👁️ [EBAY-OAUTH] Auth status after focus:', isAuth);
      callback(isAuth);
    };

    // Check for URL parameters indicating successful OAuth
    const handlePopstate = () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('ebay_connected') === 'true') {
        console.log('🔗 [EBAY-OAUTH] OAuth success detected in URL, checking auth status');
        setTimeout(() => {
          const isAuth = this.isAuthenticated();
          console.log('🔗 [EBAY-OAUTH] Auth status after OAuth success URL:', isAuth);
          callback(isAuth);
        }, 100); // Small delay to ensure any async operations complete
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('ebayAuthChanged', handleCustomEvent);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('popstate', handlePopstate);

    // Also check immediately when watcher is set up
    setTimeout(() => {
      const isAuth = this.isAuthenticated();
      console.log('📡 [EBAY-OAUTH] Initial auth status when setting up watcher:', isAuth);
      callback(isAuth);
    }, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('ebayAuthChanged', handleCustomEvent);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('popstate', handlePopstate);
    };
  }

  /**
   * Store tokens in localStorage
   */
  private storeTokens(tokens: EbayOAuthTokens): void {
    try {
      console.log('💾 [EBAY-OAUTH] Storing tokens:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        accessTokenLength: tokens.access_token?.length || 0,
        refreshTokenLength: tokens.refresh_token?.length || 0,
        expiresIn: tokens.expires_in,
        expiresAt: tokens.expires_at
      });
      
      const tokenString = JSON.stringify(tokens);
      localStorage.setItem('ebay_oauth_tokens', tokenString);
      // Also store the access token separately for compatibility
      localStorage.setItem('ebay_manual_token', tokens.access_token);
      
      // Verify storage worked
      const storedTokens = localStorage.getItem('ebay_oauth_tokens');
      const storedManualToken = localStorage.getItem('ebay_manual_token');
      console.log('✅ [EBAY-OAUTH] Tokens stored successfully:', {
        oauthStored: !!storedTokens,
        manualStored: !!storedManualToken,
        oauthLength: storedTokens?.length || 0,
        manualLength: storedManualToken?.length || 0
      });
      
      // Test authentication immediately after storing
      const isAuthAfterStore = this.isAuthenticated();
      console.log('🔍 [EBAY-OAUTH] Authentication status after storing tokens:', isAuthAfterStore);
      
      // Use setTimeout to ensure storage events fire properly
      setTimeout(() => {
        // Dispatch custom event to notify other components
        window.dispatchEvent(new CustomEvent('ebayAuthChanged', {
          detail: { authenticated: true, tokens }
        }));
        
        // Also trigger storage event manually for cross-tab communication
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'ebay_oauth_tokens',
          newValue: tokenString,
          oldValue: null,
          storageArea: localStorage,
          url: window.location.href
        }));
        
        console.log('📡 [EBAY-OAUTH] Storage and custom events dispatched');
      }, 100);
    } catch (error) {
      console.error('❌ [EBAY-OAUTH] Error storing tokens:', error);
    }
  }

  /**
   * Get stored tokens from localStorage
   */
  private getStoredTokens(): EbayOAuthTokens | null {
    try {
      const stored = localStorage.getItem('ebay_oauth_tokens');
      console.log('🔍 [EBAY-OAUTH] getStoredTokens called:', {
        hasStoredData: !!stored,
        storedLength: stored?.length || 0,
        storedPreview: stored ? stored.substring(0, 100) + '...' : 'null'
      });
      
      if (!stored) {
        console.log('❌ [EBAY-OAUTH] No tokens found in localStorage');
        return null;
      }
      
      const parsed = JSON.parse(stored) as EbayOAuthTokens;
      console.log('✅ [EBAY-OAUTH] Tokens parsed successfully:', {
        hasAccessToken: !!parsed.access_token,
        hasRefreshToken: !!parsed.refresh_token,
        expiresAt: parsed.expires_at,
        isValid: !!(parsed.access_token && parsed.refresh_token)
      });
      
      return parsed;
    } catch (error) {
      console.error('❌ [EBAY-OAUTH] Error getting stored tokens:', error);
      return null;
    }
  }

  /**
   * Debug method to test token storage/retrieval
   */
  debugTokenStorage(): void {
    console.log('🔍 [EBAY-OAUTH] === TOKEN STORAGE DEBUG ===');
    
    // Test storing a simple token
    const testTokens: EbayOAuthTokens = {
      access_token: 'test_access_token_12345',
      refresh_token: 'test_refresh_token_67890',
      expires_in: 7200,
      token_type: 'Bearer',
      expires_at: Date.now() + (7200 * 1000)
    };
    
    console.log('🧪 [EBAY-OAUTH] Storing test tokens...');
    this.storeTokens(testTokens);
    
    console.log('🔍 [EBAY-OAUTH] Checking if tokens were stored correctly...');
    const retrieved = this.getStoredTokens();
    const manualToken = localStorage.getItem('ebay_manual_token');
    
    console.log('📊 [EBAY-OAUTH] Storage test results:', {
      originalTokens: testTokens,
      retrievedTokens: retrieved,
      manualToken: manualToken,
      isAuthenticated: this.isAuthenticated(),
      allStorageKeys: Object.keys(localStorage).filter(key => key.includes('ebay'))
    });
    
    // Clean up test tokens
    console.log('🧹 [EBAY-OAUTH] Cleaning up test tokens...');
    this.clearStoredTokens();
  }

  /**
   * Clear stored tokens
   */
  clearStoredTokens(): void {
    try {
      localStorage.removeItem('ebay_oauth_tokens');
      localStorage.removeItem('ebay_oauth_state');
      localStorage.removeItem('ebay_manual_token');
      console.log('🧹 [EBAY-OAUTH] All stored tokens cleared');
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('ebayAuthChanged', {
        detail: { authenticated: false }
      }));
    } catch (error) {
      console.error('❌ [EBAY-OAUTH] Error clearing tokens:', error);
    }
  }
}

// Export singleton instance
export default new EbayOAuthService();