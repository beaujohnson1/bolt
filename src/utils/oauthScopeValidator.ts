/**
 * OAuth Scope Validator for eBay API
 * Validates that tokens have required scopes for specific operations
 */

export interface OAuthTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope: string;
}

export interface ScopeValidationResult {
  isValid: boolean;
  hasAccountScope: boolean;
  hasInventoryScope: boolean;
  hasFulfillmentScope: boolean;
  hasIdentityScope: boolean;
  missingScopes: string[];
  tokenExpired: boolean;
  recommendations: string[];
}

export class OAuthScopeValidator {
  private static readonly REQUIRED_SCOPES = {
    account: 'https://api.ebay.com/oauth/api_scope/sell.account',
    inventory: 'https://api.ebay.com/oauth/api_scope/sell.inventory',
    fulfillment: 'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
    identity: 'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly'
  };

  /**
   * Get OAuth token data from localStorage
   */
  static getTokenData(): OAuthTokenData | null {
    try {
      const accessToken = localStorage.getItem('easyflip_ebay_access_token');
      const refreshToken = localStorage.getItem('easyflip_ebay_refresh_token');
      const expiresAt = localStorage.getItem('easyflip_ebay_token_expires_at');
      const scope = localStorage.getItem('easyflip_ebay_token_scope');

      if (!accessToken || !expiresAt || !scope) {
        console.warn('⚠️ [OAUTH-VALIDATOR] Missing required token data in localStorage');
        return null;
      }

      return {
        accessToken,
        refreshToken: refreshToken || undefined,
        expiresAt: parseInt(expiresAt),
        scope
      };
    } catch (error) {
      console.error('❌ [OAUTH-VALIDATOR] Error reading token data:', error);
      return null;
    }
  }

  /**
   * Validate OAuth token scopes for Account API
   */
  static validateAccountAPIAccess(): ScopeValidationResult {
    const tokenData = this.getTokenData();
    
    if (!tokenData) {
      return {
        isValid: false,
        hasAccountScope: false,
        hasInventoryScope: false,
        hasFulfillmentScope: false,
        hasIdentityScope: false,
        missingScopes: Object.values(this.REQUIRED_SCOPES),
        tokenExpired: true,
        recommendations: [
          'Re-authenticate with eBay OAuth',
          'Ensure all required scopes are included in OAuth flow'
        ]
      };
    }

    const now = Date.now();
    const tokenExpired = now >= tokenData.expiresAt;
    
    const hasAccountScope = tokenData.scope.includes(this.REQUIRED_SCOPES.account);
    const hasInventoryScope = tokenData.scope.includes(this.REQUIRED_SCOPES.inventory);
    const hasFulfillmentScope = tokenData.scope.includes(this.REQUIRED_SCOPES.fulfillment);
    const hasIdentityScope = tokenData.scope.includes(this.REQUIRED_SCOPES.identity);

    const missingScopes: string[] = [];
    const recommendations: string[] = [];

    if (!hasAccountScope) {
      missingScopes.push(this.REQUIRED_SCOPES.account);
      recommendations.push('Add sell.account scope for business policy access');
    }
    
    if (!hasInventoryScope) {
      missingScopes.push(this.REQUIRED_SCOPES.inventory);
      recommendations.push('Add sell.inventory scope for listing management');
    }
    
    if (!hasFulfillmentScope) {
      missingScopes.push(this.REQUIRED_SCOPES.fulfillment);
      recommendations.push('Add sell.fulfillment scope for order management');
    }
    
    if (!hasIdentityScope) {
      missingScopes.push(this.REQUIRED_SCOPES.identity);
      recommendations.push('Add commerce.identity.readonly scope for user info');
    }

    if (tokenExpired) {
      recommendations.push('Token has expired - refresh or re-authenticate');
    }

    const isValid = !tokenExpired && hasAccountScope && hasInventoryScope;

    return {
      isValid,
      hasAccountScope,
      hasInventoryScope,
      hasFulfillmentScope,
      hasIdentityScope,
      missingScopes,
      tokenExpired,
      recommendations
    };
  }

  /**
   * Check if token is valid for specific operation
   */
  static canAccessAccountAPI(): boolean {
    const validation = this.validateAccountAPIAccess();
    return validation.isValid && validation.hasAccountScope;
  }

  /**
   * Get detailed diagnostic information
   */
  static getDiagnostics(): any {
    const tokenData = this.getTokenData();
    const validation = this.validateAccountAPIAccess();

    return {
      tokenPresent: !!tokenData,
      tokenData: tokenData ? {
        hasAccessToken: !!tokenData.accessToken,
        hasRefreshToken: !!tokenData.refreshToken,
        expiresAt: new Date(tokenData.expiresAt).toISOString(),
        timeUntilExpiry: tokenData.expiresAt - Date.now(),
        scopeCount: tokenData.scope.split(' ').length,
        scopes: tokenData.scope.split(' ')
      } : null,
      validation,
      criticalIssues: validation.recommendations.filter(r => 
        r.includes('sell.account') || r.includes('expired')
      )
    };
  }

  /**
   * Log validation results to console
   */
  static logValidation(): void {
    const validation = this.validateAccountAPIAccess();
    
    console.group('🔐 OAuth Scope Validation Results');
    console.log('✅ Valid for Account API:', validation.isValid);
    console.log('🏢 Has Account Scope:', validation.hasAccountScope);
    console.log('📦 Has Inventory Scope:', validation.hasInventoryScope);
    console.log('🚚 Has Fulfillment Scope:', validation.hasFulfillmentScope);
    console.log('👤 Has Identity Scope:', validation.hasIdentityScope);
    console.log('⏰ Token Expired:', validation.tokenExpired);
    
    if (validation.missingScopes.length > 0) {
      console.warn('❌ Missing Scopes:', validation.missingScopes);
    }
    
    if (validation.recommendations.length > 0) {
      console.warn('📋 Recommendations:', validation.recommendations);
    }
    
    console.groupEnd();
  }
}

export default OAuthScopeValidator;