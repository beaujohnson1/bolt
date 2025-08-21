/**
 * eBay OAuth Service - Fixed Implementation Following Hendt Best Practices
 * Based on @hendt/ebay-api patterns for reliable token management
 */

import { EBayApiError } from '../types/ebay';

// Token types following Hendt's structure
export interface AuthToken {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds (typically 7200 = 2 hours)
  refresh_token_expires_in: number; // seconds (typically 47304000 = 18 months)
  token_type: string; // "User Access Token"
  timestamp?: number; // When token was obtained
}

export interface TokenStorage {
  authToken?: AuthToken;
  clientToken?: {
    access_token: string;
    expires_in: number;
    token_type: string;
    timestamp?: number;
  };
}

export class EBayOAuthFixed {
  private static readonly STORAGE_KEY = 'ebay_oauth_tokens_v2';
  private static readonly CLIENT_ID = import.meta.env.VITE_EBAY_CLIENT_ID;
  private static readonly CLIENT_SECRET = import.meta.env.VITE_EBAY_CLIENT_SECRET;
  private static readonly RU_NAME = 'https://easyflip.ai/app/api/ebay/callback-fixed';
  private static readonly SANDBOX = import.meta.env.VITE_EBAY_SANDBOX === 'true';
  
  // Endpoints following Hendt pattern
  private static readonly ENDPOINTS = {
    authorize: {
      production: 'https://auth.ebay.com/oauth2/authorize',
      sandbox: 'https://auth.sandbox.ebay.com/oauth2/authorize'
    },
    token: {
      production: 'https://api.ebay.com/identity/v1/oauth2/token',
      sandbox: 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
    }
  };

  // Default scopes as per Hendt
  private static readonly DEFAULT_SCOPES = [
    'https://api.ebay.com/oauth/api_scope',
    'https://api.ebay.com/oauth/api_scope/sell.inventory',
    'https://api.ebay.com/oauth/api_scope/sell.marketing',
    'https://api.ebay.com/oauth/api_scope/sell.account',
    'https://api.ebay.com/oauth/api_scope/sell.fulfillment'
  ];

  private static tokenStorage: TokenStorage = {};
  private static refreshTimer?: NodeJS.Timeout;
  private static listeners = new Set<(token: AuthToken) => void>();

  /**
   * Initialize the service and load stored tokens
   */
  public static initialize(): void {
    this.loadStoredTokens();
    this.setupAutoRefresh();
    
    // Handle storage events for cross-tab sync
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === this.STORAGE_KEY) {
          this.loadStoredTokens();
        }
      });
    }
  }

  /**
   * Generate OAuth authorization URL (Step 1 of OAuth flow)
   */
  public static generateAuthUrl(state: string = ''): string {
    const endpoint = this.SANDBOX 
      ? this.ENDPOINTS.authorize.sandbox 
      : this.ENDPOINTS.authorize.production;

    const params = new URLSearchParams({
      client_id: this.CLIENT_ID,
      redirect_uri: this.RU_NAME, // Now points to https://easyflip.ai/app/api/ebay/callback-fixed
      response_type: 'code',
      state: state,
      scope: this.DEFAULT_SCOPES.join(' ')
    });

    return `${endpoint}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens (Step 2 of OAuth flow)
   */
  public static async getToken(code: string): Promise<AuthToken> {
    const endpoint = this.SANDBOX 
      ? this.ENDPOINTS.token.sandbox 
      : this.ENDPOINTS.token.production;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: decodeURIComponent(code),
          redirect_uri: this.RU_NAME
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
      }

      const token = await response.json() as AuthToken;
      token.timestamp = Date.now();

      // Store and emit token
      this.setCredentials(token);
      
      return token;
    } catch (error) {
      console.error('[EBayOAuthFixed] Token exchange error:', error);
      throw error;
    }
  }

  /**
   * Set and store credentials
   */
  public static setCredentials(token: AuthToken): void {
    this.tokenStorage.authToken = token;
    this.persistTokens();
    this.setupAutoRefresh();
    
    // Notify listeners
    this.listeners.forEach(listener => listener(token));
  }

  /**
   * Get current access token
   */
  public static getAccessToken(): string | null {
    const token = this.tokenStorage.authToken;
    
    if (!token) {
      return null;
    }

    // Check if expired
    if (this.isTokenExpired(token)) {
      // Token expired, will be refreshed by auto-refresh
      return null;
    }

    return token.access_token;
  }

  /**
   * Refresh the access token using refresh token
   */
  public static async refreshAuthToken(): Promise<AuthToken | null> {
    const currentToken = this.tokenStorage.authToken;
    
    if (!currentToken?.refresh_token) {
      console.error('[EBayOAuthFixed] No refresh token available');
      return null;
    }

    const endpoint = this.SANDBOX 
      ? this.ENDPOINTS.token.sandbox 
      : this.ENDPOINTS.token.production;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: currentToken.refresh_token,
          scope: this.DEFAULT_SCOPES.join(' ')
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Token refresh failed: ${error.error_description || error.error}`);
      }

      const newToken = await response.json() as AuthToken;
      newToken.timestamp = Date.now();
      
      // Preserve refresh token if not included in response
      if (!newToken.refresh_token && currentToken.refresh_token) {
        newToken.refresh_token = currentToken.refresh_token;
        newToken.refresh_token_expires_in = currentToken.refresh_token_expires_in;
      }

      this.setCredentials(newToken);
      console.log('[EBayOAuthFixed] Token refreshed successfully');
      
      return newToken;
    } catch (error) {
      console.error('[EBayOAuthFixed] Token refresh error:', error);
      // Clear invalid tokens
      this.clearTokens();
      throw error;
    }
  }

  /**
   * Check if token is expired
   */
  private static isTokenExpired(token: AuthToken): boolean {
    if (!token.timestamp || !token.expires_in) {
      return true;
    }

    const expiresAt = token.timestamp + (token.expires_in * 1000);
    const now = Date.now();
    
    // Consider expired if less than 5 minutes remaining
    return (expiresAt - now) < 5 * 60 * 1000;
  }

  /**
   * Setup automatic token refresh
   */
  private static setupAutoRefresh(): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const token = this.tokenStorage.authToken;
    if (!token || !token.expires_in || !token.refresh_token) {
      return;
    }

    // Schedule refresh 10 minutes before expiration
    const refreshIn = Math.max(
      (token.expires_in - 600) * 1000, // 10 minutes before expiry
      60000 // Minimum 1 minute
    );

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshAuthToken();
      } catch (error) {
        console.error('[EBayOAuthFixed] Auto-refresh failed:', error);
      }
    }, refreshIn);
  }

  /**
   * Load tokens from storage
   */
  private static loadStoredTokens(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const tokens = JSON.parse(stored) as TokenStorage;
        this.tokenStorage = tokens;
        
        // Check if tokens are still valid
        if (tokens.authToken && this.isTokenExpired(tokens.authToken)) {
          // Try to refresh
          this.refreshAuthToken().catch(console.error);
        }
      }
    } catch (error) {
      console.error('[EBayOAuthFixed] Error loading stored tokens:', error);
    }
  }

  /**
   * Persist tokens to storage
   */
  private static persistTokens(): void {
    if (typeof window === 'undefined') return;

    try {
      // Use a single storage key for all tokens
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.tokenStorage));
      
      // Also broadcast to other tabs/windows
      if (window.BroadcastChannel) {
        const channel = new BroadcastChannel('ebay_oauth');
        channel.postMessage({ type: 'token_updated', token: this.tokenStorage.authToken });
        channel.close();
      }
    } catch (error) {
      console.error('[EBayOAuthFixed] Error persisting tokens:', error);
      
      // Fallback to session storage if localStorage fails
      try {
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.tokenStorage));
      } catch (e) {
        console.error('[EBayOAuthFixed] Session storage also failed:', e);
      }
    }
  }

  /**
   * Clear all tokens
   */
  public static clearTokens(): void {
    this.tokenStorage = {};
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
      sessionStorage.removeItem(this.STORAGE_KEY);
      
      // Clear legacy keys
      const legacyKeys = [
        'ebay_oauth_tokens',
        'oauth_tokens',
        'ebay_manual_token',
        'ebay_access_token',
        'easyflip_ebay_access_token'
      ];
      
      legacyKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    }

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
  }

  /**
   * Add listener for token updates
   */
  public static onTokenRefresh(callback: (token: AuthToken) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Make authenticated API request
   */
  public static async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = this.getAccessToken();
    
    if (!token) {
      // Try to refresh
      const refreshed = await this.refreshAuthToken();
      if (!refreshed) {
        throw new Error('No valid authentication token available');
      }
    }

    const finalToken = this.getAccessToken();
    if (!finalToken) {
      throw new Error('Failed to obtain valid token');
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${finalToken}`,
        'Content-Type': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
    });
  }

  /**
   * Handle OAuth callback in popup/redirect
   */
  public static async handleCallback(code: string): Promise<void> {
    try {
      const token = await this.getToken(code);
      
      // Notify parent window if in popup
      if (window.opener) {
        window.opener.postMessage({
          type: 'ebay_oauth_success',
          token: token
        }, window.location.origin);
        
        // Close popup after short delay
        setTimeout(() => window.close(), 1000);
      }
    } catch (error) {
      console.error('[EBayOAuthFixed] Callback handling error:', error);
      
      if (window.opener) {
        window.opener.postMessage({
          type: 'ebay_oauth_error',
          error: error.message
        }, window.location.origin);
      }
      
      throw error;
    }
  }
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  EBayOAuthFixed.initialize();
}

export default EBayOAuthFixed;