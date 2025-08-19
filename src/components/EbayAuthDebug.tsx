import React, { useState, useEffect } from 'react';
import { RefreshCw, Check, X, Eye, EyeOff } from 'lucide-react';
import ebayOAuth from '../services/ebayOAuth';

interface TokenData {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
}

export const EbayAuthDebug: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [manualToken, setManualToken] = useState<string>('');
  const [showTokens, setShowTokens] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const refreshData = () => {
    console.log('🔄 [EBAY-AUTH-DEBUG] Refreshing authentication data...');
    
    // Check authentication status
    const authStatus = ebayOAuth.isAuthenticated();
    setIsAuthenticated(authStatus);
    
    // Get OAuth tokens
    const oauthTokensStr = localStorage.getItem('ebay_oauth_tokens');
    let oauthTokens: TokenData | null = null;
    if (oauthTokensStr) {
      try {
        oauthTokens = JSON.parse(oauthTokensStr);
      } catch (e) {
        console.error('Failed to parse OAuth tokens:', e);
      }
    }
    setTokenData(oauthTokens);
    
    // Get manual token
    const manual = localStorage.getItem('ebay_manual_token') || '';
    setManualToken(manual);
    
    setLastUpdate(new Date());
    
    console.log('📊 [EBAY-AUTH-DEBUG] Current state:', {
      isAuthenticated: authStatus,
      hasOAuthTokens: !!oauthTokens,
      hasManualToken: !!manual,
      oauthTokens,
      manualToken: manual.substring(0, 20) + '...'
    });
  };

  useEffect(() => {
    // Check URL for OAuth success indicators
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ebay_connected') === 'true') {
      console.log('🎉 [EBAY-AUTH-DEBUG] OAuth success detected in URL, refreshing auth state');
      // Add delay to ensure tokens are stored
      setTimeout(() => {
        refreshData();
      }, 200);
    }
    
    // Initial load
    refreshData();
    
    // Watch for changes
    const unwatch = ebayOAuth.watchForTokenChanges((authenticated) => {
      console.log('🔔 [EBAY-AUTH-DEBUG] Auth status changed:', authenticated);
      refreshData();
    });
    
    return unwatch;
  }, []);

  const clearAllTokens = () => {
    localStorage.removeItem('ebay_oauth_tokens');
    localStorage.removeItem('ebay_manual_token');
    localStorage.removeItem('ebay_oauth_state');
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('ebayAuthChanged', {
      detail: { authenticated: false }
    }));
    
    refreshData();
    console.log('🧹 [EBAY-AUTH-DEBUG] All tokens cleared');
  };

  const formatExpiryTime = (expiresAt: number) => {
    const now = Date.now();
    const diff = expiresAt - now;
    
    if (diff <= 0) {
      return `Expired ${Math.abs(Math.floor(diff / 1000 / 60))} minutes ago`;
    }
    
    const minutes = Math.floor(diff / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `Expires in ${days} day(s)`;
    } else if (hours > 0) {
      return `Expires in ${hours} hour(s)`;
    } else {
      return `Expires in ${minutes} minute(s)`;
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          eBay Authentication Debug
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={refreshData}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowTokens(!showTokens)}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-700 text-sm"
          >
            {showTokens ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showTokens ? 'Hide' : 'Show'} Tokens</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Authentication Status */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Authentication Status:</span>
          <div className={`flex items-center space-x-1 ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
            {isAuthenticated ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            <span className="font-medium">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</span>
          </div>
        </div>

        {/* OAuth Tokens */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">OAuth Tokens</h4>
          {tokenData ? (
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">Access Token:</span>
                  <div className={`font-mono text-xs ${showTokens ? 'break-all' : ''}`}>
                    {showTokens ? tokenData.access_token : '●●●●●●●●●●●●●●●●'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Refresh Token:</span>
                  <div className={`font-mono text-xs ${showTokens ? 'break-all' : ''}`}>
                    {showTokens ? tokenData.refresh_token : (tokenData.refresh_token ? '●●●●●●●●●●●●●●●●' : 'None')}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">Token Type:</span>
                  <span className="ml-2 font-medium">{tokenData.token_type || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Expires In:</span>
                  <span className="ml-2 font-medium">{tokenData.expires_in || 'Unknown'} seconds</span>
                </div>
              </div>
              {tokenData.expires_at && (
                <div>
                  <span className="text-gray-600">Expiry Status:</span>
                  <span className={`ml-2 font-medium ${Date.now() >= tokenData.expires_at ? 'text-red-600' : 'text-green-600'}`}>
                    {formatExpiryTime(tokenData.expires_at)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No OAuth tokens found</p>
          )}
        </div>

        {/* Manual Token */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Manual Token</h4>
          {manualToken ? (
            <div className="text-sm">
              <span className="text-gray-600">Token:</span>
              <div className={`font-mono text-xs mt-1 ${showTokens ? 'break-all' : ''}`}>
                {showTokens ? manualToken : '●●●●●●●●●●●●●●●●'}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No manual token found</p>
          )}
        </div>

        {/* Storage Keys Debug */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Storage Debug</h4>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-blue-700">ebay_oauth_tokens:</span>
              <span className="ml-2">{localStorage.getItem('ebay_oauth_tokens') ? '✓ Present' : '✗ Missing'}</span>
            </div>
            <div>
              <span className="text-blue-700">ebay_manual_token:</span>
              <span className="ml-2">{localStorage.getItem('ebay_manual_token') ? '✓ Present' : '✗ Missing'}</span>
            </div>
            <div>
              <span className="text-blue-700">ebay_oauth_state:</span>
              <span className="ml-2">{localStorage.getItem('ebay_oauth_state') ? '✓ Present' : '✗ Missing'}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                console.log('🧪 [EBAY-AUTH-DEBUG] Running token storage debug test...');
                ebayOAuth.debugTokenStorage();
                setTimeout(refreshData, 1000); // Refresh after test
              }}
              className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm transition-colors"
            >
              Test Storage
            </button>
            <button
              onClick={clearAllTokens}
              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm transition-colors"
            >
              Clear All Tokens
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EbayAuthDebug;