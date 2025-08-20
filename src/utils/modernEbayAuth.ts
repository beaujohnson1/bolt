/**
 * Modern eBay OAuth utility using official eBay OAuth Node.js client
 * Simplified implementation to prevent crashes and improve reliability
 */

interface TokenData {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    expires_at: number;
}

interface AuthResponse {
    success: boolean;
    authUrl?: string;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    error?: string;
    message?: string;
}

export class ModernEbayAuth {
    private static readonly STORAGE_KEYS = {
        ACCESS_TOKEN: 'ebay_access_token',
        REFRESH_TOKEN: 'ebay_refresh_token', 
        TOKEN_EXPIRY: 'ebay_token_expiry',
        AUTH_STATE: 'ebay_oauth_state'
    };

    /**
     * Start OAuth flow using official eBay library
     */
    static async startOAuthFlow(): Promise<{ authUrl: string; state: string }> {
        try {
            // Generate unique state for CSRF protection
            const state = 'ebay_' + Math.random().toString(36).substring(2, 15) + Date.now();
            
            // Store state for verification
            localStorage.setItem(this.STORAGE_KEYS.AUTH_STATE, state);
            
            console.log('🚀 Starting modern OAuth flow...');
            
            // Get authorization URL from our modern handler
            const response = await fetch('/.netlify/functions/modern-ebay-oauth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'generate-auth-url',
                    state: state
                })
            });
            
            const data: AuthResponse = await response.json();
            
            if (!data.success || !data.authUrl) {
                throw new Error(data.error || 'Failed to generate authorization URL');
            }
            
            console.log('✅ Authorization URL generated');
            return { authUrl: data.authUrl, state };
            
        } catch (error) {
            console.error('❌ OAuth start error:', error);
            throw error;
        }
    }

    /**
     * Exchange authorization code for tokens
     */
    static async exchangeCodeForTokens(code: string, state: string): Promise<TokenData> {
        try {
            // Verify state to prevent CSRF attacks
            const storedState = localStorage.getItem(this.STORAGE_KEYS.AUTH_STATE);
            if (storedState !== state) {
                throw new Error('Invalid state parameter - possible CSRF attack');
            }
            
            console.log('🔄 Exchanging authorization code for tokens...');
            
            const response = await fetch('/.netlify/functions/modern-ebay-oauth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'exchange-code',
                    code: code,
                    state: state
                })
            });
            
            const data: AuthResponse = await response.json();
            
            if (!data.success || !data.access_token) {
                throw new Error(data.error || 'Token exchange failed');
            }
            
            // Store tokens securely
            const tokenData: TokenData = {
                access_token: data.access_token!,
                refresh_token: data.refresh_token!,
                expires_in: data.expires_in || 7200,
                token_type: data.token_type || 'Bearer',
                expires_at: Date.now() + ((data.expires_in || 7200) * 1000)
            };
            
            this.storeTokens(tokenData);
            
            // Clean up state
            localStorage.removeItem(this.STORAGE_KEYS.AUTH_STATE);
            
            console.log('✅ Tokens stored successfully');
            return tokenData;
            
        } catch (error) {
            console.error('❌ Token exchange error:', error);
            throw error;
        }
    }

    /**
     * Get valid access token (refresh if needed)
     */
    static async getValidAccessToken(): Promise<string> {
        try {
            const accessToken = localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
            const refreshToken = localStorage.getItem(this.STORAGE_KEYS.REFRESH_TOKEN);
            const expiryStr = localStorage.getItem(this.STORAGE_KEYS.TOKEN_EXPIRY);
            
            if (!accessToken || !refreshToken) {
                throw new Error('No tokens found - user needs to authenticate');
            }
            
            const expiry = parseInt(expiryStr || '0');
            const now = Date.now();
            
            // If token expires in next 5 minutes, refresh it
            if (expiry - now < 300000) {
                console.log('🔄 Token expired or expiring soon, refreshing...');
                return await this.refreshAccessToken(refreshToken);
            }
            
            console.log('✅ Using existing valid token');
            return accessToken;
            
        } catch (error) {
            console.error('❌ Get valid token error:', error);
            throw error;
        }
    }

    /**
     * Refresh expired access token
     */
    private static async refreshAccessToken(refreshToken: string): Promise<string> {
        try {
            const response = await fetch('/.netlify/functions/modern-ebay-oauth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'refresh-token',
                    refresh_token: refreshToken
                })
            });
            
            const data: AuthResponse = await response.json();
            
            if (!data.success || !data.access_token) {
                throw new Error(data.error || 'Token refresh failed');
            }
            
            // Update stored token
            localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, data.access_token!);
            localStorage.setItem(this.STORAGE_KEYS.TOKEN_EXPIRY, 
                String(Date.now() + ((data.expires_in || 7200) * 1000)));
            
            console.log('✅ Token refreshed successfully');
            return data.access_token!;
            
        } catch (error) {
            console.error('❌ Token refresh error:', error);
            // Clear invalid tokens
            this.clearTokens();
            throw new Error('Token refresh failed - user needs to re-authenticate');
        }
    }

    /**
     * Store tokens in localStorage with proper error handling
     */
    private static storeTokens(tokenData: TokenData): void {
        try {
            localStorage.setItem(this.STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token);
            localStorage.setItem(this.STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token);
            localStorage.setItem(this.STORAGE_KEYS.TOKEN_EXPIRY, String(tokenData.expires_at));
            
            // Also store as JSON for compatibility
            localStorage.setItem('oauth_tokens', JSON.stringify(tokenData));
            
        } catch (error) {
            console.error('❌ Token storage error:', error);
            throw new Error('Failed to store tokens - localStorage may be full');
        }
    }

    /**
     * Check if user is authenticated
     */
    static isAuthenticated(): boolean {
        const accessToken = localStorage.getItem(this.STORAGE_KEYS.ACCESS_TOKEN);
        const refreshToken = localStorage.getItem(this.STORAGE_KEYS.REFRESH_TOKEN);
        return !!(accessToken && refreshToken);
    }

    /**
     * Get token expiry information
     */
    static getTokenStatus(): { isValid: boolean; expiresAt: Date | null; expiresIn: number } {
        const expiryStr = localStorage.getItem(this.STORAGE_KEYS.TOKEN_EXPIRY);
        const expiry = parseInt(expiryStr || '0');
        const now = Date.now();
        
        return {
            isValid: expiry > now,
            expiresAt: expiry ? new Date(expiry) : null,
            expiresIn: Math.max(0, Math.floor((expiry - now) / 1000))
        };
    }

    /**
     * Clear all stored tokens
     */
    static clearTokens(): void {
        Object.values(this.STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Clear compatibility storage too
        localStorage.removeItem('oauth_tokens');
        localStorage.removeItem('manual_token');
        
        console.log('🗑️ All tokens cleared');
    }

    /**
     * Handle OAuth callback (for when user returns from eBay)
     */
    static async handleCallback(): Promise<boolean> {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const state = urlParams.get('state');
            const error = urlParams.get('error');
            
            if (error) {
                console.error('❌ OAuth error from eBay:', error);
                return false;
            }
            
            if (code && state) {
                console.log('📝 Processing OAuth callback...');
                await this.exchangeCodeForTokens(code, state);
                
                // Clean up URL 
                window.history.replaceState({}, document.title, window.location.pathname);
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Callback handling error:', error);
            return false;
        }
    }

    /**
     * Open OAuth popup and handle the flow
     */
    static async authenticateWithPopup(): Promise<boolean> {
        try {
            const { authUrl } = await this.startOAuthFlow();
            
            console.log('🚀 Opening OAuth popup...');
            
            return new Promise((resolve, reject) => {
                // Open popup window
                const popup = window.open(
                    authUrl, 
                    'ebay_oauth',
                    'width=600,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no'
                );
                
                if (!popup) {
                    reject(new Error('Popup blocked - please allow popups for this site'));
                    return;
                }
                
                // Monitor popup for completion
                const checkClosed = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkClosed);
                        
                        // Check if authentication was successful
                        setTimeout(() => {
                            if (this.isAuthenticated()) {
                                console.log('✅ OAuth popup completed successfully');
                                resolve(true);
                            } else {
                                console.log('❌ OAuth popup closed without authentication');
                                resolve(false);
                            }
                        }, 1000);
                    }
                }, 1000);
                
                // Timeout after 10 minutes
                setTimeout(() => {
                    if (!popup.closed) {
                        popup.close();
                        clearInterval(checkClosed);
                        reject(new Error('OAuth timeout - please try again'));
                    }
                }, 600000);
            });
            
        } catch (error) {
            console.error('❌ Popup authentication error:', error);
            throw error;
        }
    }
}