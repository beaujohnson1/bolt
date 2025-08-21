import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, RefreshCw, Key } from 'lucide-react';
import { ebayOAuthService } from '../services/ebayOAuth';

export function ReAuthenticateEbay() {
  const [isChecking, setIsChecking] = useState(false);
  const [scopeStatus, setScopeStatus] = useState<{
    hasToken: boolean;
    hasAccountScope: boolean;
    missingScopes: string[];
    allScopes: string[];
  } | null>(null);

  const checkCurrentScopes = async () => {
    setIsChecking(true);
    try {
      const isAuthenticated = await ebayOAuthService.isAuthenticated();
      
      if (!isAuthenticated) {
        setScopeStatus({
          hasToken: false,
          hasAccountScope: false,
          missingScopes: ['all'],
          allScopes: []
        });
        return;
      }

      // Check stored scopes
      const storedScopes = localStorage.getItem('easyflip_ebay_token_scope') || '';
      const scopeArray = storedScopes.split(' ').filter(Boolean);
      
      const requiredScopes = [
        'sell.inventory',
        'sell.account', // CRITICAL for business policies
        'sell.fulfillment',
        'commerce.identity.readonly',
        'sell.marketing',
        'sell.analytics.readonly'
      ];

      const hasAccountScope = scopeArray.some(scope => 
        scope.includes('sell.account')
      );

      const missingScopes = requiredScopes.filter(required => 
        !scopeArray.some(scope => scope.includes(required))
      );

      setScopeStatus({
        hasToken: true,
        hasAccountScope,
        missingScopes,
        allScopes: scopeArray
      });
    } catch (error) {
      console.error('Error checking scopes:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleReAuthenticate = async () => {
    // Clear existing tokens
    const tokenKeys = [
      'easyflip_ebay_access_token',
      'easyflip_ebay_refresh_token',
      'easyflip_ebay_token_expires_at',
      'easyflip_ebay_token_scope',
      'ebay_oauth_tokens',
      'ebay_manual_token'
    ];
    
    tokenKeys.forEach(key => localStorage.removeItem(key));
    
    // Initiate new OAuth flow with all scopes
    await ebayOAuthService.initiateOAuth();
  };

  useEffect(() => {
    checkCurrentScopes();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Key className="h-5 w-5" />
        eBay OAuth Scope Check
      </h2>

      {isChecking ? (
        <div className="flex items-center gap-2 text-gray-600">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Checking current OAuth scopes...
        </div>
      ) : scopeStatus ? (
        <div className="space-y-4">
          {!scopeStatus.hasToken ? (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Not authenticated with eBay</span>
            </div>
          ) : !scopeStatus.hasAccountScope ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Missing critical scope: sell.account</span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 mb-2">
                  Your eBay connection is missing the <code className="bg-red-100 px-1 py-0.5 rounded">sell.account</code> scope, 
                  which is required for business policies (shipping, payment, return policies).
                </p>
                <p className="text-sm text-red-800">
                  You need to re-authenticate to get access to your business policies.
                </p>
              </div>
            </div>
          ) : scopeStatus.missingScopes.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Missing some OAuth scopes</span>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 mb-2">
                  Missing scopes: {scopeStatus.missingScopes.join(', ')}
                </p>
                <p className="text-sm text-yellow-800">
                  Re-authentication recommended for full functionality.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">All required scopes present</span>
            </div>
          )}

          {scopeStatus.hasToken && (
            <div className="mt-4">
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                  View current scopes ({scopeStatus.allScopes.length})
                </summary>
                <div className="mt-2 space-y-1">
                  {scopeStatus.allScopes.map((scope, i) => (
                    <div key={i} className="text-xs text-gray-500 font-mono">
                      {scope}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}

          {(!scopeStatus.hasAccountScope || scopeStatus.missingScopes.length > 0) && (
            <div className="mt-6">
              <button
                onClick={handleReAuthenticate}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Re-authenticate with eBay (Get All Scopes)
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                This will clear your current tokens and request all necessary permissions
              </p>
            </div>
          )}
        </div>
      ) : null}

      <div className="mt-6 border-t pt-4">
        <button
          onClick={checkCurrentScopes}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh Status
        </button>
      </div>
    </div>
  );
}