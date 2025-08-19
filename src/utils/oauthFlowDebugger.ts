/**
 * Comprehensive OAuth Flow Debugger
 * Identifies and fixes issues in the eBay OAuth token flow
 */

import ebayOAuth from '../services/ebayOAuth';

export interface OAuthFlowDebugResult {
  step: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}

export class OAuthFlowDebugger {
  private results: OAuthFlowDebugResult[] = [];

  constructor() {
    console.log('🔍 [OAUTH-DEBUGGER] Starting comprehensive OAuth flow debug...');
  }

  private addResult(step: string, status: 'success' | 'warning' | 'error', message: string, data?: any): void {
    const result: OAuthFlowDebugResult = { step, status, message, data };
    this.results.push(result);
    
    const emoji = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
    console.log(`${emoji} [OAUTH-DEBUGGER] ${step}: ${message}`, data || '');
  }

  /**
   * Check localStorage for token storage issues
   */
  private checkLocalStorage(): void {
    console.log('📦 [OAUTH-DEBUGGER] === CHECKING LOCALSTORAGE ===');

    // Check for OAuth tokens
    const oauthTokensRaw = localStorage.getItem('ebay_oauth_tokens');
    const manualToken = localStorage.getItem('ebay_manual_token');
    const oauthState = localStorage.getItem('ebay_oauth_state');

    this.addResult('localStorage-keys', 'success', 'localStorage access working', {
      hasOAuthTokens: !!oauthTokensRaw,
      hasManualToken: !!manualToken,
      hasOAuthState: !!oauthState,
      allEbayKeys: Object.keys(localStorage).filter(key => key.includes('ebay'))
    });

    if (oauthTokensRaw) {
      try {
        const parsed = JSON.parse(oauthTokensRaw);
        const isExpired = parsed.expires_at ? Date.now() > parsed.expires_at : false;
        const timeUntilExpiry = parsed.expires_at ? Math.round((parsed.expires_at - Date.now()) / 1000 / 60) : null;

        this.addResult('oauth-tokens-parsing', 'success', 'OAuth tokens parsed successfully', {
          hasAccessToken: !!parsed.access_token,
          hasRefreshToken: !!parsed.refresh_token,
          accessTokenLength: parsed.access_token?.length || 0,
          refreshTokenLength: parsed.refresh_token?.length || 0,
          expiresAt: parsed.expires_at,
          expiresAtFormatted: parsed.expires_at ? new Date(parsed.expires_at).toISOString() : null,
          isExpired,
          timeUntilExpiry: timeUntilExpiry ? `${timeUntilExpiry} minutes` : null,
          tokenType: parsed.token_type
        });

        if (isExpired) {
          this.addResult('token-expiry', 'warning', 'OAuth tokens are expired', {
            expiresAt: new Date(parsed.expires_at).toISOString(),
            hasRefreshToken: !!parsed.refresh_token
          });
        }
      } catch (error) {
        this.addResult('oauth-tokens-parsing', 'error', 'Failed to parse OAuth tokens', { error: error.message });
      }
    } else {
      this.addResult('oauth-tokens-missing', 'warning', 'No OAuth tokens found in localStorage');
    }

    if (manualToken) {
      this.addResult('manual-token', 'success', 'Manual token found', {
        tokenLength: manualToken.length,
        isDevToken: manualToken === 'dev_mode_bypass_token'
      });
    } else {
      this.addResult('manual-token-missing', 'warning', 'No manual token found');
    }
  }

  /**
   * Test eBay OAuth service methods
   */
  private testOAuthService(): void {
    console.log('🔧 [OAUTH-DEBUGGER] === TESTING OAUTH SERVICE ===');

    try {
      // Test isAuthenticated method
      const isAuth = ebayOAuth.isAuthenticated();
      this.addResult('oauth-service-auth-check', isAuth ? 'success' : 'warning', 
        `Authentication check result: ${isAuth}`);

      // Test refreshAuthStatus method
      const refreshedAuth = ebayOAuth.refreshAuthStatus();
      this.addResult('oauth-service-refresh', refreshedAuth ? 'success' : 'warning',
        `Refresh auth status result: ${refreshedAuth}`);

      // Test getValidAccessToken (async)
      ebayOAuth.getValidAccessToken().then(token => {
        this.addResult('oauth-service-token', token ? 'success' : 'warning',
          `Get valid access token result: ${token ? 'token retrieved' : 'no token'}`,
          token ? { tokenLength: token.length, preview: token.substring(0, 20) + '...' } : null);
      }).catch(error => {
        this.addResult('oauth-service-token', 'error', 'Error getting valid access token', { error: error.message });
      });

    } catch (error) {
      this.addResult('oauth-service-error', 'error', 'OAuth service method failed', { error: error.message });
    }
  }

  /**
   * Check URL parameters for OAuth callback indicators
   */
  private checkURLParameters(): void {
    console.log('🔗 [OAUTH-DEBUGGER] === CHECKING URL PARAMETERS ===');

    const urlParams = new URLSearchParams(window.location.search);
    const hasEbayConnected = urlParams.get('ebay_connected') === 'true';
    const timestamp = urlParams.get('timestamp');
    const ebayError = urlParams.get('ebay_error');

    this.addResult('url-parameters', 'success', 'URL parameter check complete', {
      hasEbayConnected,
      timestamp,
      ebayError,
      allParams: Object.fromEntries(urlParams.entries())
    });

    if (hasEbayConnected) {
      this.addResult('oauth-callback-detected', 'success', 'OAuth success callback detected in URL');
    }

    if (ebayError) {
      this.addResult('oauth-error-detected', 'error', 'OAuth error detected in URL', { error: ebayError });
    }
  }

  /**
   * Test event listeners and storage watchers
   */
  private testEventListeners(): void {
    console.log('📡 [OAUTH-DEBUGGER] === TESTING EVENT LISTENERS ===');

    let eventsFired = 0;
    const testEvents = () => {
      // Test storage event
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'ebay_oauth_tokens',
        newValue: JSON.stringify({ test: 'event' }),
        storageArea: localStorage
      }));

      // Test custom event
      window.dispatchEvent(new CustomEvent('ebayAuthChanged', {
        detail: { authenticated: true, test: true }
      }));

      eventsFired += 2;
    };

    // Set up temporary listener to test if events work
    const testListener = () => eventsFired--;
    window.addEventListener('storage', testListener);
    window.addEventListener('ebayAuthChanged', testListener);

    testEvents();

    // Clean up and check results
    setTimeout(() => {
      window.removeEventListener('storage', testListener);
      window.removeEventListener('ebayAuthChanged', testListener);
      
      this.addResult('event-listeners', eventsFired === 0 ? 'success' : 'warning',
        `Event system test: ${eventsFired === 0 ? 'working' : 'issues detected'}`,
        { eventsFired });
    }, 100);
  }

  /**
   * Simulate token storage to test the flow
   */
  private testTokenStorage(): void {
    console.log('💾 [OAUTH-DEBUGGER] === TESTING TOKEN STORAGE ===');

    const testTokens = {
      access_token: 'test_access_token_debug_12345',
      refresh_token: 'test_refresh_token_debug_67890',
      expires_in: 7200,
      token_type: 'Bearer',
      expires_at: Date.now() + (7200 * 1000)
    };

    try {
      // Store test tokens
      localStorage.setItem('ebay_oauth_tokens_test', JSON.stringify(testTokens));
      localStorage.setItem('ebay_manual_token_test', testTokens.access_token);

      // Verify storage worked
      const storedOAuth = localStorage.getItem('ebay_oauth_tokens_test');
      const storedManual = localStorage.getItem('ebay_manual_token_test');

      if (storedOAuth && storedManual) {
        const parsed = JSON.parse(storedOAuth);
        this.addResult('token-storage-test', 'success', 'Token storage test successful', {
          oauthStored: !!storedOAuth,
          manualStored: !!storedManual,
          parsedCorrectly: parsed.access_token === testTokens.access_token
        });
      } else {
        this.addResult('token-storage-test', 'error', 'Token storage test failed');
      }

      // Clean up test data
      localStorage.removeItem('ebay_oauth_tokens_test');
      localStorage.removeItem('ebay_manual_token_test');

    } catch (error) {
      this.addResult('token-storage-test', 'error', 'Token storage test error', { error: error.message });
    }
  }

  /**
   * Check for timing and race condition issues
   */
  private checkTimingIssues(): void {
    console.log('⏱️ [OAUTH-DEBUGGER] === CHECKING TIMING ISSUES ===');

    const startTime = Date.now();
    
    // Simulate rapid authentication checks
    const results = [];
    for (let i = 0; i < 5; i++) {
      const isAuth = ebayOAuth.isAuthenticated();
      results.push(isAuth);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Check for consistency
    const isConsistent = results.every(result => result === results[0]);

    this.addResult('timing-consistency', isConsistent ? 'success' : 'warning',
      `Authentication check consistency: ${isConsistent ? 'consistent' : 'inconsistent'}`,
      { 
        duration: `${duration}ms`,
        results,
        isConsistent
      });

    if (duration > 100) {
      this.addResult('timing-performance', 'warning', 'Authentication checks are slow', { duration: `${duration}ms` });
    }
  }

  /**
   * Run comprehensive debug analysis
   */
  public async runDebug(): Promise<OAuthFlowDebugResult[]> {
    console.log('🚀 [OAUTH-DEBUGGER] Starting comprehensive OAuth flow debug...');

    this.results = []; // Reset results

    // Run all debug checks
    this.checkLocalStorage();
    this.testOAuthService();
    this.checkURLParameters();
    this.testEventListeners();
    this.testTokenStorage();
    this.checkTimingIssues();

    // Wait a bit for async operations
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('📊 [OAUTH-DEBUGGER] Debug complete. Results:', this.results);

    return this.results;
  }

  /**
   * Generate a summary report
   */
  public generateReport(): string {
    const successCount = this.results.filter(r => r.status === 'success').length;
    const warningCount = this.results.filter(r => r.status === 'warning').length;
    const errorCount = this.results.filter(r => r.status === 'error').length;

    let report = `🔍 OAuth Flow Debug Report\n`;
    report += `========================\n`;
    report += `✅ Success: ${successCount}\n`;
    report += `⚠️ Warnings: ${warningCount}\n`;
    report += `❌ Errors: ${errorCount}\n\n`;

    report += `Detailed Results:\n`;
    this.results.forEach(result => {
      const emoji = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      report += `${emoji} ${result.step}: ${result.message}\n`;
    });

    return report;
  }

  /**
   * Fix common OAuth issues automatically
   */
  public autoFix(): void {
    console.log('🔧 [OAUTH-DEBUGGER] Attempting auto-fix for common issues...');

    // Check for expired tokens and attempt refresh
    const oauthTokensRaw = localStorage.getItem('ebay_oauth_tokens');
    if (oauthTokensRaw) {
      try {
        const parsed = JSON.parse(oauthTokensRaw);
        if (parsed.expires_at && Date.now() > parsed.expires_at && parsed.refresh_token) {
          console.log('🔄 [OAUTH-DEBUGGER] Attempting to refresh expired token...');
          ebayOAuth.refreshAccessToken(parsed.refresh_token).then(() => {
            console.log('✅ [OAUTH-DEBUGGER] Token refresh successful');
          }).catch(error => {
            console.error('❌ [OAUTH-DEBUGGER] Token refresh failed:', error);
          });
        }
      } catch (error) {
        console.error('❌ [OAUTH-DEBUGGER] Error in auto-fix:', error);
      }
    }

    // Clear malformed data
    try {
      const oauthData = localStorage.getItem('ebay_oauth_tokens');
      if (oauthData) {
        JSON.parse(oauthData); // Test if it's valid JSON
      }
    } catch (error) {
      console.log('🧹 [OAUTH-DEBUGGER] Clearing malformed OAuth data...');
      localStorage.removeItem('ebay_oauth_tokens');
    }

    // Trigger authentication status refresh
    setTimeout(() => {
      ebayOAuth.refreshAuthStatus();
      console.log('🔄 [OAUTH-DEBUGGER] Authentication status refreshed');
    }, 100);
  }
}

// Create global instance for console access
export const oauthDebugger = new OAuthFlowDebugger();

// Make it available globally
(window as any).oauthDebugger = oauthDebugger;
(window as any).debugOAuthFlow = () => oauthDebugger.runDebug();

console.log('🔍 OAuth Flow Debugger loaded. Use oauthDebugger.runDebug() or debugOAuthFlow() in console to test.');