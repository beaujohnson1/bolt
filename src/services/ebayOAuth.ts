// eBay OAuth Service
// Handles OAuth flow for eBay user authentication

import { initializeOAuthDebugConsole } from '../utils/oauthDebugConsole';
import { emergencyOAuthBridge } from '../utils/emergencyOAuthBridge';

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
  private debugConsole: any;

  constructor() {
    // Use Netlify functions in production, localhost in development
    this.baseUrl = import.meta.env.DEV 
      ? '/.netlify/functions'  // Netlify dev handles this properly
      : '/.netlify/functions';
    
    // Initialize debug console
    this.debugConsole = initializeOAuthDebugConsole();
    
    console.log('🔐 [EBAY-OAUTH] Service initialized with base URL:', this.baseUrl);
    this.debugConsole?.log('eBay OAuth Service initialized', 'info', 'service-init');
  }

  /**
   * Get eBay OAuth authorization URL
   */
  async getAuthorizationUrl(redirectUri?: string): Promise<EbayAuthUrl> {
    try {
      console.log('🔗 [EBAY-OAUTH] Getting authorization URL from simple-ebay-oauth...');
      
      const response = await fetch(`${this.baseUrl}/simple-ebay-oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'generate-auth-url'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get authorization URL');
      }

      const result = await response.json();
      console.log('✅ [EBAY-OAUTH] Authorization URL generated successfully');
      
      // Ensure result has the expected structure
      return {
        authUrl: result.authUrl,
        state: result.state || 'ebay-oauth-' + Date.now(),
        environment: 'production'
      } as EbayAuthUrl;
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
      console.log('🔄 [EBAY-OAUTH] Exchanging authorization code for tokens using simple-ebay-oauth...');
      
      const response = await fetch(`${this.baseUrl}/simple-ebay-oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'exchange-code',
          code
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
      await this.storeTokens(tokens);
      
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

      const response = await fetch(`${this.baseUrl}/simple-ebay-oauth`, {
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
      await this.storeTokens(tokens);
      
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
   * Force refresh authentication status with emergency bridge integration (useful after OAuth callback)
   */
  refreshAuthStatus(): boolean {
    console.log('🔄 [EBAY-OAUTH] Force refreshing authentication status with emergency bridge...');
    
    // Clear any potential cache issues
    const tokens = this.getStoredTokens();
    const manualToken = localStorage.getItem('ebay_manual_token');
    
    console.log('🔍 [EBAY-OAUTH] Force refresh - current state:', {
      hasOAuthTokens: !!tokens?.access_token,
      hasManualToken: !!manualToken,
      localStorageKeys: Object.keys(localStorage).filter(key => key.includes('ebay'))
    });
    
    // Trigger emergency bridge detection if tokens exist but not recognized
    if ((tokens || manualToken) && !this.isAuthenticated()) {
      console.log('🚨 [EBAY-OAUTH] Token mismatch detected - triggering emergency bridge');
      emergencyOAuthBridge.startEmergencyDetection()
        .then((token) => {
          console.log('✅ [EBAY-OAUTH] Emergency bridge resolved token mismatch:', token);
          this.forceAuthStateRefresh();
        })
        .catch((error) => {
          console.warn('⚠️ [EBAY-OAUTH] Emergency bridge failed:', error);
        });
    }
    
    return this.isAuthenticated();
  }

  /**
   * Initiate OAuth flow using popup window with enhanced reliability and comprehensive error handling
   */
  async initiateOAuthFlow(redirectUri?: string): Promise<void> {
    console.log('🔗 [EBAY-OAUTH] Starting OAuth flow initiation...');
    console.log('📋 [EBAY-OAUTH] Parameters:', {
      redirectUri,
      currentUrl: window.location.href,
      userAgent: navigator.userAgent.substring(0, 50) + '...'
    });

    this.debugConsole?.log('🚀 Initiating OAuth flow...', 'info', 'oauth-start');
    this.debugConsole?.updateStatus('Requesting authorization URL...');

    try {
      // CRITICAL: Comprehensive error handling for authorization URL request
      console.log('🌐 [EBAY-OAUTH] Requesting authorization URL from server...');
      this.debugConsole?.log('Requesting authorization URL from server...', 'info', 'auth-url');
      
      const authData = await this.getAuthorizationUrl(redirectUri);
      
      console.log('✅ [EBAY-OAUTH] Authorization URL received successfully:', {
        hasAuthUrl: !!authData.authUrl,
        hasState: !!authData.state,
        environment: authData.environment,
        authUrlLength: authData.authUrl?.length || 0,
        authUrlDomain: authData.authUrl ? new URL(authData.authUrl).hostname : 'unknown'
      });
      
      // Validate authorization data
      if (!authData.authUrl || !authData.state) {
        throw new Error('Invalid authorization data received from server');
      }
      
      // Store state for validation
      localStorage.setItem('ebay_oauth_state', authData.state);
      localStorage.setItem('ebay_oauth_return_url', window.location.href);
      console.log('💾 [EBAY-OAUTH] OAuth state and return URL stored in localStorage');
      
      // Enhanced popup creation with comprehensive validation
      console.log('🚀 [EBAY-OAUTH] Attempting to open eBay OAuth in popup window...');
      console.log('🔗 [EBAY-OAUTH] Auth URL preview:', authData.authUrl.substring(0, 100) + '...');
      
      // Check if popups are likely blocked
      this.debugConsole?.log('Testing popup capability...', 'info', 'popup-test');
      const testPopup = window.open('', 'test', 'width=1,height=1');
      if (!testPopup) {
        console.error('❌ [EBAY-OAUTH] Popup blocker detected - test popup failed');
        this.debugConsole?.log('❌ Popup blocked by browser!', 'error', 'popup-blocked');
        throw new Error('Popup blocked by browser. Please allow popups for this site and try again.');
      } else {
        testPopup.close();
        console.log('✅ [EBAY-OAUTH] Popup blocker check passed');
        this.debugConsole?.log('✅ Popup capability confirmed', 'success', 'popup-test');
      }
      
      // Open eBay OAuth in popup window with enhanced validation
      this.debugConsole?.log('Opening eBay OAuth popup window...', 'info', 'popup-open');
      this.debugConsole?.updateStatus('Opening authentication window...');
      
      const popup = window.open(
        authData.authUrl,
        'ebay-oauth',
        'width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no'
      );
      
      if (!popup) {
        console.error('❌ [EBAY-OAUTH] CRITICAL: Popup creation failed despite blocker check');
        this.debugConsole?.log('❌ CRITICAL: Failed to open popup window!', 'error', 'popup-fail');
        throw new Error('Failed to open authentication window. Please check your browser settings and allow popups for this site.');
      }
      
      // Validate popup opened successfully
      setTimeout(() => {
        if (popup.closed) {
          console.warn('⚠️ [EBAY-OAUTH] Popup closed immediately - likely blocked');
          throw new Error('Authentication window was blocked or closed. Please allow popups and try again.');
        }
      }, 100);
      
      console.log('✅ [EBAY-OAUTH] Popup window opened successfully');
      console.log('📊 [EBAY-OAUTH] Popup details:', {
        name: popup.name,
        closed: popup.closed,
        location: popup.location ? 'accessible' : 'cross-origin'
      });
      
      this.debugConsole?.log('✅ Popup window opened successfully!', 'success', 'popup-success');
      this.debugConsole?.updateStatus('Popup opened - waiting for user authentication...');
      
      // CRITICAL FIX: Ultra-responsive popup monitoring with emergency bridge integration
      console.log('🔍 [EBAY-OAUTH] Starting CRITICAL popup monitoring with emergency bridge integration...');
      
      // Initialize emergency bridge for ultra-fast detection
      emergencyOAuthBridge.addEventListener('token-detected', (data) => {
        console.log('🚨 [EBAY-OAUTH] Emergency bridge detected token during popup monitoring!', data);
        clearInterval(ultraFastCheckClosed);
        clearInterval(enhancedPopupMonitor);
        window.removeEventListener('message', messageHandler);
        popup.close();
        this.forceAuthStateRefresh();
      });
      
      // Ultra-fast popup monitoring for immediate token detection
      let isPopupClosed = false;
      const ultraFastCheckClosed = setInterval(() => {
        if (popup.closed && !isPopupClosed) {
          isPopupClosed = true;
          clearInterval(ultraFastCheckClosed);
          clearInterval(enhancedPopupMonitor);
          window.removeEventListener('message', messageHandler);
          
          console.log('🚨 [EBAY-OAUTH] CRITICAL: Popup closed, implementing EMERGENCY token detection protocol...');
          this.debugConsole?.log('🚨 POPUP CLOSED - Emergency token detection!', 'warning', 'popup-critical');
          
          // CRITICAL: Start emergency bridge ultra-fast detection
          emergencyOAuthBridge.startEmergencyDetection()
            .then((token) => {
              console.log('✅ [EBAY-OAUTH] Emergency bridge successfully detected token:', token);
              this.forceAuthStateRefresh();
            })
            .catch((error) => {
              console.warn('⚠️ [EBAY-OAUTH] Emergency bridge detection failed:', error);
              // Fallback to legacy detection
              this.implementEmergencyTokenDetection('popup_closed_critical');
            });
        }
      }, 25); // Check every 25ms for ultra-fast detection
      
      // Enhanced message handler with multiple origin support
      const messageHandler = async (event: MessageEvent) => {
        console.log('📨 [EBAY-OAUTH] Received message from popup:', {
          origin: event.origin,
          expectedOrigin: window.location.origin,
          data: event.data,
          source: event.source === popup ? 'correct_popup' : 'unknown_source'
        });
        
        // Comprehensive trusted origins list for maximum compatibility
        const trustedOrigins = [
          window.location.origin,
          'https://easyflip.ai',
          'https://main--easyflip.netlify.app',
          'https://localhost:5173',
          'http://localhost:5173',
          'https://127.0.0.1:5173',
          'http://127.0.0.1:5173',
          '*' // Allow any origin for maximum compatibility
        ];
        
        // More flexible origin validation
        const isValidOrigin = trustedOrigins.includes(event.origin) || 
                             event.origin.includes('localhost') ||
                             event.origin.includes('127.0.0.1') ||
                             event.origin.includes('easyflip') ||
                             event.origin.includes('netlify');
        
        // Enhanced validation: Use origin + message structure instead of strict source checking
        // This fixes the issue where eBay redirects break the popup window reference
        const isValidMessage = isValidOrigin && event.data && 
          (event.data.type === 'EBAY_OAUTH_SUCCESS' || event.data.type === 'EBAY_OAUTH_ERROR');
        
        // Additional security: Validate message structure and timing
        const hasValidTokenStructure = event.data.tokens && 
          event.data.tokens.access_token && 
          event.data.tokens.token_type;
        
        const isRecentMessage = !event.data.timestamp || 
          (Date.now() - event.data.timestamp) < 300000; // 5 minutes max, allow missing timestamp
        
        if (isValidMessage && (event.data.type === 'EBAY_OAUTH_SUCCESS' ? hasValidTokenStructure : true) && isRecentMessage) {
          if (event.data.type === 'EBAY_OAUTH_SUCCESS') {
            console.log('✅ [EBAY-OAUTH] Processing success message from popup (enhanced validation)');
            this.debugConsole?.log('🎉 OAuth SUCCESS message received from popup!', 'success', 'popup-message');
            clearInterval(checkClosed);
            
            // Store tokens if provided
            if (event.data.tokens) {
              console.log('💾 [EBAY-OAUTH] Storing tokens from popup message');
              this.debugConsole?.log('💾 Storing OAuth tokens from popup...', 'info', 'token-store');
              await this.storeTokens(event.data.tokens);
            }
            
            popup.close();
            window.removeEventListener('message', messageHandler);
            
            // Aggressive token checking after message
            this.performAggressiveTokenCheck('popup_message');
            
          } else if (event.data.type === 'EBAY_OAUTH_ERROR') {
            console.error('❌ [EBAY-OAUTH] Received error message from popup:', event.data.error);
            clearInterval(checkClosed);
            popup.close();
            window.removeEventListener('message', messageHandler);
            throw new Error(event.data.error);
          }
        } else {
          console.warn('⚠️ [EBAY-OAUTH] Ignoring invalid message:', {
            origin: event.origin,
            isValidOrigin,
            messageType: event.data?.type,
            hasValidTokens: hasValidTokenStructure,
            isRecent: isRecentMessage,
            messageAge: event.data?.timestamp ? Date.now() - event.data.timestamp : 'no-timestamp',
            trustedOrigins
          });
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Add BroadcastChannel as backup communication method
      let channel: BroadcastChannel | null = null;
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          channel = new BroadcastChannel('ebay-oauth-popup');
          channel.addEventListener('message', async (event) => {
            console.log('📡 [EBAY-OAUTH] Received BroadcastChannel message:', event.data);
            
            if (event.data.type === 'EBAY_OAUTH_SUCCESS' && event.data.tokens) {
              console.log('✅ [EBAY-OAUTH] Processing success via BroadcastChannel');
              clearInterval(checkClosed);
              
              await this.storeTokens(event.data.tokens);
              popup.close();
              window.removeEventListener('message', messageHandler);
              channel?.close();
              
              this.performAggressiveTokenCheck('broadcast_channel');
            }
          });
          console.log('📡 [EBAY-OAUTH] BroadcastChannel listener set up');
        } catch (error) {
          console.warn('⚠️ [EBAY-OAUTH] BroadcastChannel not available:', error);
        }
      }
      
      // Enhanced popup monitoring with token detection
      let tokenCheckAttempts = 0;
      const maxTokenChecks = 300; // 30 seconds of checking
      
      const enhancedPopupMonitor = setInterval(() => {
        tokenCheckAttempts++;
        
        // Check if popup is closed
        if (popup.closed) {
          console.log('🔍 [EBAY-OAUTH] Popup closed, performing final token check...');
          this.debugConsole?.log('🔍 Popup window closed - checking for tokens...', 'info', 'popup-closed');
          this.debugConsole?.updateStatus('Popup closed - verifying authentication...');
          clearInterval(enhancedPopupMonitor);
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          channel?.close();
          
          // Immediate aggressive token detection after popup closes
          this.performAggressiveTokenCheck('popup_closed_enhanced');
          return;
        }
        
        // Periodic token check while popup is open (every 100ms)
        if (tokenCheckAttempts % 10 === 0) { // Every 1 second
          // Check for beacon first
          const beaconFound = this.checkForSuccessBeacon();
          const hasTokens = this.isAuthenticated();
          
          if (beaconFound || hasTokens) {
            console.log('✅ [EBAY-OAUTH] Tokens detected via polling while popup open!');
            this.debugConsole?.log('🎉 Tokens detected via polling while popup open!', 'success', 'polling-success');
            this.debugConsole?.updateStatus('Authentication detected!');
            clearInterval(enhancedPopupMonitor);
            clearInterval(checkClosed);
            popup.close();
            window.removeEventListener('message', messageHandler);
            channel?.close();
            
            this.performAggressiveTokenCheck('polling_detection');
            return;
          }
        }
        
        // Timeout after 30 seconds
        if (tokenCheckAttempts >= maxTokenChecks) {
          console.warn('⏰ [EBAY-OAUTH] Enhanced monitoring timeout');
          clearInterval(enhancedPopupMonitor);
        }
      }, 100);
      
      // Cleanup after 10 minutes
      setTimeout(() => {
        if (!popup.closed) {
          popup.close();
        }
        clearInterval(checkClosed);
        clearInterval(enhancedPopupMonitor);
        window.removeEventListener('message', messageHandler);
        channel?.close();
      }, 600000); // 10 minutes
      
    } catch (error: any) {
      console.error('❌ [EBAY-OAUTH] CRITICAL ERROR in OAuth flow initiation:', {
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack?.substring(0, 200),
        errorType: typeof error,
        isNetworkError: error.name === 'TypeError' || error.message?.includes('fetch'),
        isPopupError: error.message?.includes('popup') || error.message?.includes('blocked'),
        timestamp: new Date().toISOString()
      });

      // Enhanced error categorization and user-friendly messages
      let userFriendlyMessage = '';
      let errorCategory = 'unknown';

      if (error.message?.includes('popup') || error.message?.includes('blocked')) {
        errorCategory = 'popup_blocked';
        userFriendlyMessage = 'Authentication window was blocked by your browser. Please allow popups for this site and try again.';
      } else if (error.name === 'TypeError' || error.message?.includes('fetch') || error.message?.includes('network')) {
        errorCategory = 'network_error';
        userFriendlyMessage = 'Network error occurred while connecting to eBay. Please check your internet connection and try again.';
      } else if (error.message?.includes('authorization') || error.message?.includes('Invalid authorization')) {
        errorCategory = 'auth_config_error';
        userFriendlyMessage = 'eBay authentication configuration error. Please contact support if this persists.';
      } else if (error.message?.includes('timeout')) {
        errorCategory = 'timeout_error';
        userFriendlyMessage = 'Authentication request timed out. Please try again.';
      } else {
        errorCategory = 'general_error';
        userFriendlyMessage = `Authentication failed: ${error.message}`;
      }

      this.debugConsole?.log(`❌ OAuth Error (${errorCategory}): ${userFriendlyMessage}`, 'error', 'oauth-error');
      this.debugConsole?.updateStatus(`Error: ${errorCategory}`);

      console.error('🔍 [EBAY-OAUTH] Error Analysis:', {
        category: errorCategory,
        userMessage: userFriendlyMessage,
        originalError: error.message,
        canRetry: ['network_error', 'timeout_error', 'popup_blocked'].includes(errorCategory)
      });

      // Clean up any stored state on error
      try {
        localStorage.removeItem('ebay_oauth_state');
        localStorage.removeItem('ebay_oauth_return_url');
        console.log('🧹 [EBAY-OAUTH] Cleaned up OAuth state after error');
      } catch (cleanupError) {
        console.warn('⚠️ [EBAY-OAUTH] Could not clean up OAuth state:', cleanupError);
      }

      // Create enhanced error with category and user message
      const enhancedError = new Error(userFriendlyMessage);
      (enhancedError as any).category = errorCategory;
      (enhancedError as any).originalError = error;
      (enhancedError as any).canRetry = ['network_error', 'timeout_error', 'popup_blocked'].includes(errorCategory);
      
      throw enhancedError;
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
   * Check and process URL parameters for OAuth tokens
   */
  async processUrlTokens(): Promise<boolean> {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tokensParam = urlParams.get('tokens');
      
      if (tokensParam) {
        console.log('🔍 [EBAY-OAUTH] Found tokens in URL parameters');
        
        try {
          const tokenData = JSON.parse(decodeURIComponent(tokensParam)) as EbayOAuthTokens;
          
          console.log('📦 [EBAY-OAUTH] Processing URL tokens:', {
            hasAccessToken: !!tokenData.access_token,
            hasRefreshToken: !!tokenData.refresh_token,
            tokenType: tokenData.token_type
          });
          
          // Store the tokens
          await this.storeTokens(tokenData);
          
          // Clean up URL parameters
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('tokens');
          newUrl.searchParams.delete('ebay_connected');
          newUrl.searchParams.delete('timestamp');
          
          // Update URL without page reload
          window.history.replaceState({}, '', newUrl.toString());
          
          console.log('✅ [EBAY-OAUTH] URL tokens processed successfully');
          return true;
          
        } catch (parseError) {
          console.error('❌ [EBAY-OAUTH] Error parsing URL tokens:', parseError);
          return false;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ [EBAY-OAUTH] Error processing URL tokens:', error);
      return false;
    }
  }

  /**
   * Listen for storage changes (e.g., from callback page)
   */
  watchForTokenChanges(callback: (authenticated: boolean) => void): () => void {
    // Check for URL tokens immediately
    this.processUrlTokens().then(hasUrlTokens => {
      if (hasUrlTokens) {
        console.log('🎉 [EBAY-OAUTH] URL tokens found and processed');
        setTimeout(() => callback(true), 100);
      }
    }).catch(error => {
      console.error('❌ [EBAY-OAUTH] Error processing URL tokens:', error);
    });
    
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
        console.log('🔗 [EBAY-OAUTH] OAuth success detected in URL, processing tokens...');
        
        // Process any URL tokens
        this.processUrlTokens().then(hasTokens => {
          setTimeout(() => {
            const isAuth = this.isAuthenticated();
            console.log('🔗 [EBAY-OAUTH] Auth status after OAuth success URL:', isAuth);
            callback(isAuth);
          }, 100); // Small delay to ensure any async operations complete
        }).catch(error => {
          console.error('❌ [EBAY-OAUTH] Error processing URL tokens in popstate:', error);
        });
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
   * Store tokens in localStorage with enhanced validation and reliability
   */
  private async storeTokens(tokens: EbayOAuthTokens): Promise<void> {
    try {
      console.log('💾 [EBAY-OAUTH] Storing tokens with validation...');
      
      // Validate token structure
      if (!tokens.access_token) {
        throw new Error('Invalid tokens: missing access_token');
      }
      
      if (!tokens.token_type) {
        throw new Error('Invalid tokens: missing token_type');
      }
      
      // Calculate expiry if missing
      if (tokens.expires_in && !tokens.expires_at) {
        tokens.expires_at = Date.now() + (tokens.expires_in * 1000);
      }
      
      console.log('🔍 [EBAY-OAUTH] Token validation passed:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        accessTokenLength: tokens.access_token?.length || 0,
        refreshTokenLength: tokens.refresh_token?.length || 0,
        expiresIn: tokens.expires_in,
        expiresAt: tokens.expires_at,
        tokenType: tokens.token_type
      });
      
      const tokenString = JSON.stringify(tokens);
      
      // Atomic storage with backup
      const originalOAuth = localStorage.getItem('ebay_oauth_tokens');
      const originalManual = localStorage.getItem('ebay_manual_token');
      
      try {
        // Store in multiple formats for compatibility with different callback handlers
        localStorage.setItem('ebay_oauth_tokens', tokenString);
        localStorage.setItem('oauth_tokens', tokenString); // Modern callback compatibility
        localStorage.setItem('ebay_manual_token', tokens.access_token);
        
        // Store individual fields for maximum compatibility
        localStorage.setItem('ebay_access_token', tokens.access_token);
        if (tokens.refresh_token) {
          localStorage.setItem('ebay_refresh_token', tokens.refresh_token);
        }
        if (tokens.expires_at) {
          localStorage.setItem('ebay_token_expiry', tokens.expires_at.toString());
        }
        
        // Verify storage
        const stored = localStorage.getItem('ebay_oauth_tokens');
        const storedManual = localStorage.getItem('ebay_manual_token');
        
        if (!stored || !storedManual) {
          throw new Error('Token storage verification failed - data not found');
        }
        
        const parsed = JSON.parse(stored);
        if (parsed.access_token !== tokens.access_token) {
          throw new Error('Token storage verification failed - data mismatch');
        }
        
        console.log('✅ [EBAY-OAUTH] Tokens stored and verified successfully');
        
        // Test authentication immediately after storing
        const isAuthAfterStore = this.isAuthenticated();
        console.log('🔍 [EBAY-OAUTH] Authentication status after storing tokens:', isAuthAfterStore);
        
        // Use BroadcastChannel for reliable cross-component communication
        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const channel = new BroadcastChannel('ebay-auth');
            channel.postMessage({
              type: 'AUTH_CHANGED',
              authenticated: true,
              tokens,
              source: 'oauth_service',
              timestamp: Date.now()
            });
            channel.close();
            console.log('📡 [EBAY-OAUTH] BroadcastChannel message sent');
          } catch (bcError) {
            console.warn('⚠️ [EBAY-OAUTH] BroadcastChannel failed, using fallback events:', bcError);
          }
        }
        
        // Legacy event support with delay to ensure reliable delivery
        setTimeout(() => {
          // Dispatch custom event to notify other components
          window.dispatchEvent(new CustomEvent('ebayAuthChanged', {
            detail: { 
              authenticated: true, 
              tokens,
              source: 'oauth_service',
              timestamp: Date.now()
            }
          }));
          
          // Also trigger storage event manually for cross-tab communication
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'ebay_oauth_tokens',
            newValue: tokenString,
            oldValue: originalOAuth,
            storageArea: localStorage,
            url: window.location.href
          }));
          
          console.log('📡 [EBAY-OAUTH] Legacy events dispatched');
        }, 50);
        
      } catch (storageError) {
        // Rollback on failure
        console.error('❌ [EBAY-OAUTH] Storage failed, rolling back:', storageError);
        
        if (originalOAuth) {
          localStorage.setItem('ebay_oauth_tokens', originalOAuth);
        } else {
          localStorage.removeItem('ebay_oauth_tokens');
        }
        
        if (originalManual) {
          localStorage.setItem('ebay_manual_token', originalManual);
        } else {
          localStorage.removeItem('ebay_manual_token');
        }
        
        throw storageError;
      }
      
    } catch (error) {
      console.error('❌ [EBAY-OAUTH] Error storing tokens:', error);
      throw error;
    }
  }

  /**
   * Get stored tokens from localStorage
   */
  private getStoredTokens(): EbayOAuthTokens | null {
    try {
      // Try multiple storage locations due to different callback implementations
      let stored = localStorage.getItem('ebay_oauth_tokens');
      let storageType = 'ebay_oauth_tokens';
      
      // Fallback 1: Check 'oauth_tokens' (modern-ebay-callback stores here)
      if (!stored) {
        stored = localStorage.getItem('oauth_tokens');
        if (stored) {
          storageType = 'oauth_tokens';
          console.log('🔄 [EBAY-OAUTH] Found tokens in fallback location: oauth_tokens');
        }
      }
      
      // Fallback 2: Check for individual token fields (modern callback alternative format)
      if (!stored) {
        const accessToken = localStorage.getItem('ebay_access_token');
        const refreshToken = localStorage.getItem('ebay_refresh_token');
        const tokenExpiry = localStorage.getItem('ebay_token_expiry');
        const tokenScope = localStorage.getItem('easyflip_ebay_token_scope');
        
        if (accessToken) {
          const expiryTime = tokenExpiry ? parseInt(tokenExpiry) : Date.now() + 3600000;
          stored = JSON.stringify({
            access_token: accessToken,
            refresh_token: refreshToken || '',
            expires_in: Math.max(0, Math.floor((expiryTime - Date.now()) / 1000)),
            expires_at: expiryTime,
            token_type: 'Bearer',
            scope: tokenScope || 'https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/commerce.identity.readonly'
          });
          storageType = 'individual_tokens';
          console.log('🔄 [EBAY-OAUTH] Reconstructed tokens from individual fields');
        }
      }
      
      // Fallback 3: Check for app token storage (from OAuth callback)
      if (!stored) {
        const appToken = localStorage.getItem('ebay_app_token');
        const appTokenExpiry = localStorage.getItem('ebay_app_token_expiry');
        
        if (appToken && appTokenExpiry) {
          // Convert app token storage to OAuth token format
          const expiryTime = parseInt(appTokenExpiry);
          const expiresIn = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
          
          const convertedTokens = {
            access_token: appToken,
            expires_in: expiresIn,
            expires_at: expiryTime,
            token_type: 'Bearer',
            refresh_token: null // App tokens don't have refresh tokens
          };
          
          console.log('🔄 [EBAY-OAUTH] Found app token, converting to OAuth format:', {
            hasAppToken: !!appToken,
            expiryTime: new Date(expiryTime).toISOString(),
            expiresIn: expiresIn + ' seconds'
          });
          
          return convertedTokens;
        }
      }
      
      console.log('🔍 [EBAY-OAUTH] getStoredTokens called:', {
        storageType,
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
        isValid: !!(parsed.access_token && parsed.refresh_token),
        scope: parsed.scope || 'NO SCOPE FOUND',
        scopeArray: parsed.scope ? parsed.scope.split(' ') : []
      });
      
      return parsed;
    } catch (error) {
      console.error('❌ [EBAY-OAUTH] Error getting stored tokens:', error);
      return null;
    }
  }

  /**
   * Perform token checking with simple polling
   */
  private performSimpleTokenCheck(source: string): void {
    console.log(`🔍 [EBAY-OAUTH] Starting token check from: ${source}`);
    
    // Simple polling strategy
    const delays = [50, 100, 200, 500, 1000];
    
    delays.forEach((delay, index) => {
      setTimeout(() => {
        const isAuth = this.isAuthenticated();
        console.log(`🔍 [EBAY-OAUTH] Token check ${index + 1}: ${isAuth}`);
        
        if (isAuth) {
          console.log(`✅ [EBAY-OAUTH] Token found!`);
          this.dispatchAuthEvent(source, index + 1);
        }
      }, delay);
    });
  }

  /**
   * Perform enhanced token checking with comprehensive verification strategies
   */
  private performEnhancedTokenCheck(source: string): void {
    console.log(`🔍 [EBAY-OAUTH] Starting enhanced token check from: ${source}`);
    
    // Create a comprehensive checking strategy with multiple fallbacks
    const checkingStrategy = [
      { delay: 25, name: 'immediate' },
      { delay: 50, name: 'rapid-1' },
      { delay: 100, name: 'rapid-2' },
      { delay: 200, name: 'quick' },
      { delay: 500, name: 'short' },
      { delay: 750, name: 'medium-1' },
      { delay: 1000, name: 'medium-2' },
      { delay: 1500, name: 'delayed' },
      { delay: 2000, name: 'extended-1' },
      { delay: 3000, name: 'extended-2' },
      { delay: 5000, name: 'long-term' },
      { delay: 7500, name: 'final-check' }
    ];
    
    checkingStrategy.forEach((strategy, index) => {
      setTimeout(() => {
        // Multiple verification methods per check
        const methods = [
          () => this.isAuthenticated(),
          () => !!this.getStoredTokens(),
          () => !!localStorage.getItem('ebay_manual_token'),
          () => !!localStorage.getItem('ebay_oauth_tokens')
        ];
        
        const results = methods.map(method => {
          try {
            return method();
          } catch (error) {
            console.warn(`⚠️ [EBAY-OAUTH] Check method failed:`, error);
            return false;
          }
        });
        
        const isAuth = results.some(result => result);
        const authCount = results.filter(result => result).length;
        
        console.log(`🔍 [EBAY-OAUTH] Check ${index + 1} (${strategy.name} - ${strategy.delay}ms):`, {
          authenticated: isAuth,
          methodResults: results,
          confidence: `${authCount}/4 methods positive`,
          source,
          timestamp: new Date().toISOString()
        });
        
        if (isAuth) {
          console.log(`✅ [EBAY-OAUTH] AUTHENTICATION CONFIRMED on check ${index + 1}!`);
          this.dispatchEnhancedAuthEvent(source, index + 1, strategy.name, authCount);
          
          // Force refresh of all auth listeners
          this.forceAuthStateRefresh();
        }
      }, strategy.delay);
    });
    
    // Additional direct localStorage monitoring
    this.monitorLocalStorageChanges(source);
  }
  
  /**
   * Force authentication state refresh across all components
   */
  private forceAuthStateRefresh(): void {
    console.log('🔄 [EBAY-OAUTH] Forcing authentication state refresh across all components');
    
    // Multiple notification methods to ensure components update
    const refreshMethods = [
      // Method 1: CustomEvent
      () => {
        window.dispatchEvent(new CustomEvent('ebayAuthChanged', {
          detail: { 
            authenticated: true, 
            source: 'force_refresh',
            timestamp: Date.now(),
            tokens: this.getStoredTokens()
          }
        }));
      },
      
      // Method 2: Storage Event
      () => {
        const tokens = this.getStoredTokens();
        if (tokens) {
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'ebay_oauth_tokens',
            newValue: JSON.stringify(tokens),
            oldValue: null,
            storageArea: localStorage,
            url: window.location.href
          }));
        }
      },
      
      // Method 3: BroadcastChannel
      () => {
        if (typeof BroadcastChannel !== 'undefined') {
          try {
            const channel = new BroadcastChannel('ebay-auth');
            channel.postMessage({
              type: 'AUTH_CHANGED',
              authenticated: true,
              source: 'force_refresh',
              timestamp: Date.now(),
              tokens: this.getStoredTokens()
            });
            channel.close();
          } catch (error) {
            console.warn('⚠️ [EBAY-OAUTH] BroadcastChannel refresh failed:', error);
          }
        }
      },
      
      // Method 4: Manual token verification event
      () => {
        window.dispatchEvent(new CustomEvent('ebayTokenVerified', {
          detail: {
            verified: true,
            tokens: this.getStoredTokens(),
            timestamp: Date.now()
          }
        }));
      }
    ];
    
    // Execute all refresh methods with staggered timing
    refreshMethods.forEach((method, index) => {
      setTimeout(() => {
        try {
          method();
          console.log(`✅ [EBAY-OAUTH] Refresh method ${index + 1} executed`);
        } catch (error) {
          console.error(`❌ [EBAY-OAUTH] Refresh method ${index + 1} failed:`, error);
        }
      }, index * 100); // Stagger by 100ms
    });
  }
  
  /**
   * Monitor localStorage changes for token updates
   */
  private monitorLocalStorageChanges(source: string): void {
    console.log(`📊 [EBAY-OAUTH] Starting localStorage monitoring from: ${source}`);
    
    let checkCount = 0;
    const maxChecks = 50;
    
    const checkStorage = () => {
      checkCount++;
      
      const oauthTokens = localStorage.getItem('ebay_oauth_tokens');
      const manualToken = localStorage.getItem('ebay_manual_token');
      
      if (oauthTokens || manualToken) {
        console.log(`💾 [EBAY-OAUTH] Storage change detected on check ${checkCount}:`, {
          hasOAuthTokens: !!oauthTokens,
          hasManualToken: !!manualToken,
          source
        });
        
        // Verify authentication and dispatch events
        if (this.isAuthenticated()) {
          this.dispatchEnhancedAuthEvent(source, checkCount, 'storage_monitor', 4);
          return; // Stop monitoring
        }
      }
      
      if (checkCount < maxChecks) {
        setTimeout(checkStorage, 200); // Check every 200ms
      }
    };
    
    setTimeout(checkStorage, 100);
  }
  
  /**
   * Dispatch authentication event
   */
  private dispatchSimpleAuthEvent(source: string, method: string): void {
    console.log(`🎉 [EBAY-OAUTH] Authentication confirmed via ${method}!`);
    
    // Direct event dispatch
    window.dispatchEvent(new CustomEvent('ebayAuthChanged', {
      detail: {
        authenticated: true,
        source: source,
        method: method,
        timestamp: Date.now(),
        tokens: this.getStoredTokens()
      }
    }));
  }

  /**
   * Dispatch enhanced authentication event with comprehensive details
   */
  private dispatchEnhancedAuthEvent(source: string, attempt: number, strategy: string, confidence: number): void {
    console.log(`🎉 [EBAY-OAUTH] AUTHENTICATION CONFIRMED on attempt ${attempt} (${strategy})!`);
    
    const authDetails = {
      authenticated: true,
      source: source,
      attempt: attempt,
      strategy: strategy,
      confidence: confidence,
      timestamp: Date.now(),
      tokens: this.getStoredTokens(),
      storageInfo: {
        oauthTokens: !!localStorage.getItem('ebay_oauth_tokens'),
        manualToken: !!localStorage.getItem('ebay_manual_token'),
        storageKeys: Object.keys(localStorage).filter(key => key.includes('ebay'))
      }
    };
    
    // Dispatch multiple event types for maximum compatibility
    const events = [
      new CustomEvent('ebayAuthChanged', { detail: authDetails }),
      new CustomEvent('ebayTokenDetected', { detail: authDetails }),
      new CustomEvent('oauthSuccess', { detail: authDetails })
    ];
    
    events.forEach(event => {
      window.dispatchEvent(event);
    });
    
    console.log('📡 [EBAY-OAUTH] Enhanced auth events dispatched:', authDetails);
  }
  
  /**
   * Debug method to test token storage/retrieval
   */
  async debugTokenStorage(): Promise<void> {
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
    await this.storeTokens(testTokens);
    
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
   * Check for success beacon from callback page
   */
  private checkForSuccessBeacon(): boolean {
    try {
      console.log('🎯 [EBAY-OAUTH] Checking for success beacon...');
      this.debugConsole?.log('🎯 Checking for success beacon...', 'info', 'beacon-check');
      
      const beacon = localStorage.getItem('ebay_oauth_beacon');
      if (beacon) {
        const beaconData = JSON.parse(beacon);
        
        // Check if beacon is fresh (within last 5 minutes)
        if (beaconData.timestamp && (Date.now() - beaconData.timestamp) < 300000) {
          console.log('🎯 [EBAY-OAUTH] Success beacon found!', beaconData);
          this.debugConsole?.log('🎯 Success beacon detected! Processing...', 'success', 'beacon-found');
          
          // Clean up beacon
          localStorage.removeItem('ebay_oauth_beacon');
          
          // Store tokens if they're in the beacon
          if (beaconData.tokens) {
            console.log('💾 [EBAY-OAUTH] Extracting tokens from beacon...');
            this.debugConsole?.log('💾 Extracting tokens from beacon...', 'info', 'beacon-extract');
            
            // Store tokens using the service's method
            this.storeTokens(beaconData.tokens).then(() => {
              console.log('✅ [EBAY-OAUTH] Tokens from beacon stored successfully');
              this.debugConsole?.log('✅ Tokens from beacon stored!', 'success', 'beacon-store');
              
              // Dispatch auth event
              this.dispatchAuthEvent('beacon_detection', 1);
            }).catch(error => {
              console.error('❌ [EBAY-OAUTH] Failed to store beacon tokens:', error);
              this.debugConsole?.log('❌ Failed to store beacon tokens', 'error', 'beacon-error');
            });
          }
          
          return true;
        } else {
          console.log('⏰ [EBAY-OAUTH] Beacon found but expired');
          this.debugConsole?.log('⏰ Beacon expired', 'warning', 'beacon-expired');
          localStorage.removeItem('ebay_oauth_beacon');
        }
      }
      
      // Also check sessionStorage
      const sessionBeacon = sessionStorage.getItem('ebay_oauth_beacon');
      if (sessionBeacon) {
        console.log('🎯 [EBAY-OAUTH] Beacon found in sessionStorage');
        // Process similarly...
        sessionStorage.removeItem('ebay_oauth_beacon');
      }
      
      return false;
    } catch (error) {
      console.error('❌ [EBAY-OAUTH] Error checking beacon:', error);
      return false;
    }
  }

  /**
   * CRITICAL: Implement emergency token detection protocol with emergency bridge integration
   */
  implementEmergencyTokenDetection(source: string): void {
    console.log(`🚨 [EBAY-OAUTH] EMERGENCY TOKEN DETECTION from: ${source}`);
    this.debugConsole?.log(`🚨 EMERGENCY TOKEN DETECTION from: ${source}`, 'error', 'emergency');
    
    // First, try emergency bridge for ultra-fast detection
    emergencyOAuthBridge.startEmergencyDetection()
      .then((token) => {
        console.log(`🎉 [EBAY-OAUTH] EMERGENCY BRIDGE SUCCESS from: ${source}!`);
        this.debugConsole?.log(`🎉 EMERGENCY BRIDGE SUCCESS!`, 'success', 'emergency-bridge');
        
        // Immediate event dispatch
        this.dispatchEmergencyAuthEvent(source, 1, 25);
        this.triggerComponentRefresh();
      })
      .catch((error) => {
        console.warn(`⚠️ [EBAY-OAUTH] Emergency bridge failed, falling back to legacy detection:`, error);
        
        // Fallback to legacy multi-stage detection
        const immediateChecks = [0, 10, 25, 50, 75, 100, 150, 200, 300, 500];
        
        immediateChecks.forEach((delay, index) => {
          setTimeout(() => {
            // Multi-method verification per check
            const authMethods = [
              () => this.isAuthenticated(),
              () => !!this.getStoredTokens(),
              () => !!localStorage.getItem('ebay_manual_token'),
              () => !!localStorage.getItem('ebay_oauth_tokens'),
              () => !!localStorage.getItem('ebay_oauth_beacon')
            ];
            
            const results = authMethods.map(method => {
              try { return method(); } catch { return false; }
            });
            
            const positiveResults = results.filter(r => r).length;
            const isAuthenticated = positiveResults >= 2; // Require at least 2 confirmations
            
            console.log(`🔍 [EMERGENCY-CHECK-${index + 1}] ${delay}ms: ${positiveResults}/5 methods positive, Auth: ${isAuthenticated}`);
            
            if (isAuthenticated) {
              console.log(`🎉 [EBAY-OAUTH] EMERGENCY SUCCESS on check ${index + 1}!`);
              this.debugConsole?.log(`🎉 EMERGENCY SUCCESS on check ${index + 1}!`, 'success', 'emergency-success');
              
              // Immediate event dispatch with multiple methods
              this.dispatchEmergencyAuthEvent(source, index + 1, delay);
              
              // Force component refresh
              this.triggerComponentRefresh();
              
              return; // Stop checking
            }
          }, delay);
        });
        
        // Continue with extended aggressive checking
        setTimeout(() => this.performAggressiveTokenCheck(source), 1000);
      });
  }
  
  /**
   * Dispatch emergency authentication event with maximum compatibility
   */
  private dispatchEmergencyAuthEvent(source: string, attempt: number, delay: number): void {
    const authData = {
      authenticated: true,
      source: source,
      attempt: attempt,
      delay: delay,
      timestamp: Date.now(),
      emergency: true,
      tokens: this.getStoredTokens()
    };
    
    // Method 1: Multiple CustomEvents
    const eventTypes = ['ebayAuthChanged', 'ebayTokenDetected', 'oauthSuccess', 'emergencyAuthSuccess'];
    eventTypes.forEach(type => {
      window.dispatchEvent(new CustomEvent(type, { detail: authData }));
    });
    
    // Method 2: BroadcastChannel
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel('ebay-auth');
        channel.postMessage({ type: 'EMERGENCY_AUTH_SUCCESS', ...authData });
        channel.close();
      } catch (e) {}
    }
    
    // Method 3: Storage Event
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'ebay_oauth_tokens',
      newValue: JSON.stringify(this.getStoredTokens()),
      oldValue: null,
      storageArea: localStorage,
      url: window.location.href
    }));
    
    console.log('🚨 [EBAY-OAUTH] Emergency auth events dispatched:', authData);
  }
  
  /**
   * Force component refresh for immediate state update
   */
  private triggerComponentRefresh(): void {
    // Method 1: Focus event to trigger component checks
    window.dispatchEvent(new Event('focus'));
    
    // Method 2: Page visibility change
    window.dispatchEvent(new Event('visibilitychange'));
    
    // Method 3: Custom refresh event
    window.dispatchEvent(new CustomEvent('forceComponentRefresh', {
      detail: { source: 'oauth_emergency', timestamp: Date.now() }
    }));
  }
  
  /**
   * Perform aggressive token detection after popup closes
   */
  performAggressiveTokenCheck(source: string): void {
    console.log(`🔍 [EBAY-OAUTH] Starting aggressive token check from: ${source}`);
    this.debugConsole?.log(`🔍 Starting aggressive token verification from: ${source}`, 'info', 'token-check');
    
    // Strategy 1: Immediate check
    setTimeout(() => {
      const isAuth1 = this.isAuthenticated();
      console.log(`🔍 [EBAY-OAUTH] Check 1 (immediate): ${isAuth1}`);
      this.debugConsole?.log(`Token check 1: ${isAuth1 ? 'FOUND' : 'Not found'}`, isAuth1 ? 'success' : 'info', 'token-check');
      if (isAuth1) {
        this.dispatchAuthEvent(source, 1);
      }
    }, 50);
    
    // Strategy 2: Quick check
    setTimeout(() => {
      const isAuth2 = this.isAuthenticated();
      console.log(`🔍 [EBAY-OAUTH] Check 2 (100ms): ${isAuth2}`);
      this.debugConsole?.log(`Token check 2: ${isAuth2 ? 'FOUND' : 'Not found'}`, isAuth2 ? 'success' : 'info', 'token-check');
      if (isAuth2) {
        this.dispatchAuthEvent(source, 2);
      }
    }, 100);
    
    // Strategy 3: Medium check
    setTimeout(() => {
      const isAuth3 = this.isAuthenticated();
      console.log(`🔍 [EBAY-OAUTH] Check 3 (500ms): ${isAuth3}`);
      this.debugConsole?.log(`Token check 3: ${isAuth3 ? 'FOUND' : 'Not found'}`, isAuth3 ? 'success' : 'info', 'token-check');
      if (isAuth3) {
        this.dispatchAuthEvent(source, 3);
      }
    }, 500);
    
    // Strategy 4: Delayed check
    setTimeout(() => {
      const isAuth4 = this.isAuthenticated();
      console.log(`🔍 [EBAY-OAUTH] Check 4 (1000ms): ${isAuth4}`);
      if (isAuth4) {
        this.dispatchAuthEvent(source, 4);
      }
    }, 1000);
    
    // Strategy 5: Final check
    setTimeout(() => {
      const isAuth5 = this.isAuthenticated();
      console.log(`🔍 [EBAY-OAUTH] Check 5 (2000ms): ${isAuth5}`);
      if (isAuth5) {
        this.dispatchAuthEvent(source, 5);
      }
    }, 2000);
  }
  
  /**
   * Dispatch authentication event
   */
  private dispatchAuthEvent(source: string, attempt: number): void {
    console.log(`🎉 [EBAY-OAUTH] Authentication detected on attempt ${attempt} from ${source}!`);
    this.debugConsole?.log(`🎉 AUTHENTICATION CONFIRMED on attempt ${attempt}!`, 'success', 'auth-confirmed');
    this.debugConsole?.updateStatus('Authentication successful!');
    
    // Dispatch multiple event types for maximum compatibility
    window.dispatchEvent(new CustomEvent('ebayAuthChanged', {
      detail: { 
        authenticated: true, 
        source,
        attempt,
        timestamp: Date.now()
      }
    }));
    
    // Also trigger storage event
    const tokens = this.getStoredTokens();
    if (tokens) {
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'ebay_oauth_tokens',
        newValue: JSON.stringify(tokens),
        oldValue: null,
        storageArea: localStorage,
        url: window.location.href
      }));
    }
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