/**
 * eBay OAuth Migration Utility
 * Helps migrate from broken implementation to fixed Hendt-based implementation
 */

import EBayOAuthFixed from '../services/ebayOAuthFixed';

export class EBayOAuthMigration {
  /**
   * Migrate existing tokens to new format
   */
  public static migrateTokens(): boolean {
    console.log('[Migration] Starting token migration...');
    
    // List of all possible legacy storage keys
    const legacyKeys = [
      'ebay_oauth_tokens',
      'oauth_tokens',
      'ebay_manual_token',
      'ebay_access_token',
      'easyflip_ebay_access_token',
      'ebay_refresh_token',
      'ebay_token_expiry'
    ];

    let migratedToken: any = null;

    // Try to find valid tokens in legacy storage
    for (const key of legacyKeys) {
      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;

        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(stored);
          if (parsed.access_token || parsed.accessToken) {
            migratedToken = {
              access_token: parsed.access_token || parsed.accessToken,
              refresh_token: parsed.refresh_token || parsed.refreshToken,
              expires_in: parsed.expires_in || parsed.expiresIn || 7200,
              refresh_token_expires_in: parsed.refresh_token_expires_in || 47304000,
              token_type: parsed.token_type || 'User Access Token',
              timestamp: parsed.timestamp || Date.now()
            };
            console.log(`[Migration] Found tokens in ${key}`);
            break;
          }
        } catch {
          // Not JSON, might be plain token string
          if (stored && stored.length > 20 && !stored.includes(' ')) {
            migratedToken = {
              access_token: stored,
              expires_in: 7200,
              token_type: 'User Access Token',
              timestamp: Date.now()
            };
            console.log(`[Migration] Found plain token in ${key}`);
          }
        }
      } catch (error) {
        console.error(`[Migration] Error reading ${key}:`, error);
      }
    }

    if (migratedToken) {
      try {
        // Set tokens in new service
        EBayOAuthFixed.setCredentials(migratedToken);
        console.log('[Migration] Successfully migrated tokens to new format');
        
        // Clean up old keys
        this.cleanupLegacyStorage();
        
        return true;
      } catch (error) {
        console.error('[Migration] Failed to set migrated tokens:', error);
      }
    } else {
      console.log('[Migration] No valid tokens found to migrate');
    }

    return false;
  }

  /**
   * Clean up legacy storage keys
   */
  private static cleanupLegacyStorage(): void {
    const legacyKeys = [
      'ebay_oauth_tokens',
      'oauth_tokens',
      'ebay_manual_token',
      'ebay_access_token',
      'easyflip_ebay_access_token',
      'ebay_refresh_token',
      'ebay_token_expiry',
      'ebay_auth_state',
      'ebay_auth_popup'
    ];

    legacyKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    console.log('[Migration] Cleaned up legacy storage keys');
  }

  /**
   * Test current authentication status
   */
  public static async testAuthentication(): Promise<{
    hasToken: boolean;
    tokenValid: boolean;
    canRefresh: boolean;
    apiTestSuccess: boolean;
    errors: string[];
  }> {
    const result = {
      hasToken: false,
      tokenValid: false,
      canRefresh: false,
      apiTestSuccess: false,
      errors: [] as string[]
    };

    try {
      // Check if we have a token
      const token = EBayOAuthFixed.getAccessToken();
      result.hasToken = !!token;

      if (!token) {
        result.errors.push('No access token found');
        return result;
      }

      // Test token validity with a simple API call
      try {
        const testResponse = await EBayOAuthFixed.makeAuthenticatedRequest(
          'https://api.ebay.com/sell/account/v1/privilege',
          { method: 'GET' }
        );

        if (testResponse.ok) {
          result.tokenValid = true;
          result.apiTestSuccess = true;
          console.log('[Test] Token is valid and API call succeeded');
        } else {
          const error = await testResponse.text();
          result.errors.push(`API test failed: ${testResponse.status} - ${error}`);
          
          // Try to refresh if 401
          if (testResponse.status === 401) {
            result.tokenValid = false;
            console.log('[Test] Token expired, attempting refresh...');
            
            try {
              const refreshed = await EBayOAuthFixed.refreshAuthToken();
              if (refreshed) {
                result.canRefresh = true;
                console.log('[Test] Token refresh successful');
              }
            } catch (refreshError) {
              result.errors.push(`Refresh failed: ${refreshError.message}`);
            }
          }
        }
      } catch (apiError) {
        result.errors.push(`API call error: ${apiError.message}`);
      }

    } catch (error) {
      result.errors.push(`General error: ${error.message}`);
    }

    return result;
  }

  /**
   * Debug current storage state
   */
  public static debugStorage(): void {
    console.group('[Debug] Storage Analysis');
    
    // Check all storage mechanisms
    console.log('=== LocalStorage ===');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes('ebay')) {
        const value = localStorage.getItem(key);
        console.log(`${key}: ${value?.substring(0, 50)}...`);
      }
    }

    console.log('\n=== SessionStorage ===');
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.includes('ebay')) {
        const value = sessionStorage.getItem(key);
        console.log(`${key}: ${value?.substring(0, 50)}...`);
      }
    }

    console.log('\n=== Current Token Status ===');
    const token = EBayOAuthFixed.getAccessToken();
    console.log('Has token:', !!token);
    if (token) {
      console.log('Token preview:', token.substring(0, 20) + '...');
    }

    console.log('\n=== Browser Info ===');
    console.log('User Agent:', navigator.userAgent);
    console.log('Private browsing:', !window.indexedDB ? 'Possibly' : 'No');
    console.log('Storage available:', this.isStorageAvailable());
    
    console.groupEnd();
  }

  /**
   * Check if storage is available
   */
  private static isStorageAvailable(): string {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      
      return 'Both localStorage and sessionStorage available';
    } catch (e) {
      if (e.code === 22 || e.code === 1014) {
        return 'Storage quota exceeded';
      }
      if (e.name === 'SecurityError') {
        return 'Storage blocked (private mode or security settings)';
      }
      return `Storage error: ${e.message}`;
    }
  }

  /**
   * Fix common issues automatically
   */
  public static async autoFix(): Promise<string[]> {
    const fixes: string[] = [];

    console.log('[AutoFix] Starting automatic issue resolution...');

    // 1. Try migration first
    if (this.migrateTokens()) {
      fixes.push('Migrated legacy tokens to new format');
    }

    // 2. Test authentication
    const testResult = await this.testAuthentication();
    
    if (!testResult.hasToken) {
      fixes.push('No token found - user needs to re-authenticate');
    } else if (!testResult.tokenValid && testResult.canRefresh) {
      fixes.push('Token was expired but successfully refreshed');
    } else if (!testResult.tokenValid && !testResult.canRefresh) {
      // Clear invalid tokens
      EBayOAuthFixed.clearTokens();
      fixes.push('Cleared invalid tokens - user needs to re-authenticate');
    }

    // 3. Check for storage issues
    const storageStatus = this.isStorageAvailable();
    if (!storageStatus.includes('available')) {
      fixes.push(`Storage issue detected: ${storageStatus}`);
      
      // Try to use alternative storage
      if (window.indexedDB) {
        fixes.push('Consider using IndexedDB as fallback storage');
      }
    }

    // 4. Clear duplicate/conflicting tokens
    this.cleanupLegacyStorage();
    fixes.push('Cleaned up legacy storage keys');

    console.log('[AutoFix] Completed with fixes:', fixes);
    return fixes;
  }
}