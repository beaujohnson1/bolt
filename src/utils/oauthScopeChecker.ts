/**
 * OAuth Scope Checker - Verifies current tokens have all required scopes
 * If scopes are missing, prompts user to re-authenticate
 */

import { OAuthScopeValidator } from './oauthScopeValidator';

export interface ScopeCheckResult {
  hasAllScopes: boolean;
  missingScopes: string[];
  needsReauth: boolean;
  criticalMissing: boolean;
}

export class OAuthScopeChecker {
  private static readonly CRITICAL_SCOPES = [
    'https://api.ebay.com/oauth/api_scope/sell.account',
    'https://api.ebay.com/oauth/api_scope/sell.inventory',
    'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly'
  ];

  /**
   * Check if current OAuth token has all required scopes
   */
  static checkCurrentTokenScopes(): ScopeCheckResult {
    console.log('🔍 [SCOPE-CHECKER] Checking current token scopes...');
    
    const validation = OAuthScopeValidator.validateAccountAPIAccess();
    
    const missingScopes = validation.missingScopes;
    const hasAllScopes = missingScopes.length === 0;
    
    // Check if any critical scopes are missing
    const criticalMissing = this.CRITICAL_SCOPES.some(scope => 
      missingScopes.includes(scope)
    );
    
    const needsReauth = !hasAllScopes || criticalMissing;
    
    const result: ScopeCheckResult = {
      hasAllScopes,
      missingScopes,
      needsReauth,
      criticalMissing
    };
    
    console.log('📊 [SCOPE-CHECKER] Scope check result:', {
      hasAllScopes,
      missingCount: missingScopes.length,
      criticalMissing,
      needsReauth
    });
    
    if (needsReauth) {
      console.warn('⚠️ [SCOPE-CHECKER] Re-authentication required:', {
        reason: criticalMissing ? 'Critical scopes missing' : 'Missing scopes',
        missingScopes
      });
    }
    
    return result;
  }

  /**
   * Get user-friendly message about scope status
   */
  static getScopeStatusMessage(result: ScopeCheckResult): string {
    if (result.hasAllScopes) {
      return 'All required OAuth scopes are present.';
    }
    
    if (result.criticalMissing) {
      return `Critical OAuth scopes are missing (${result.missingScopes.length} total). Business policies and core features may not work. Please re-authenticate.`;
    }
    
    return `Some OAuth scopes are missing (${result.missingScopes.length} total). Please re-authenticate to enable all features.`;
  }

  /**
   * Check if business policy operations are supported
   */
  static canAccessBusinessPolicies(): boolean {
    const validation = OAuthScopeValidator.validateAccountAPIAccess();
    return validation.hasAccountScope && !validation.tokenExpired;
  }

  /**
   * Force scope revalidation and return recommendations
   */
  static getRecommendations(): string[] {
    const result = this.checkCurrentTokenScopes();
    
    if (result.hasAllScopes) {
      return ['OAuth scopes are up to date.'];
    }
    
    const recommendations = [
      'Re-authenticate with eBay to get all required scopes',
      'Clear browser cache and cookies for this site',
      'Ensure popup blockers are disabled'
    ];
    
    if (result.criticalMissing) {
      recommendations.unshift('⚠️ URGENT: Critical scopes missing - business policies will not work');
    }
    
    return recommendations;
  }
}

export default OAuthScopeChecker;