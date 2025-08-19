import React, { useState, useEffect } from 'react';
import ebayOAuth from '../services/ebayOAuth';

export const EbayTokenTest: React.FC = () => {
  const [tokenData, setTokenData] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);

  const refreshData = () => {
    console.log('🔄 [TOKEN-TEST] Refreshing token data...');
    
    // Check authentication status
    const authStatus = ebayOAuth.isAuthenticated();
    setIsAuthenticated(authStatus);
    
    // Get stored tokens
    const oauthTokens = localStorage.getItem('ebay_oauth_tokens');
    const manualToken = localStorage.getItem('ebay_manual_token');
    const authStatus2 = localStorage.getItem('ebay_auth_status');
    
    setTokenData({
      isAuthenticated: authStatus,
      oauthTokens: oauthTokens ? JSON.parse(oauthTokens) : null,
      manualToken,
      authStatus: authStatus2,
      allLocalStorageKeys: Object.keys(localStorage).filter(key => key.includes('ebay')),
      timestamp: new Date().toISOString()
    });
    
    setRefreshCount(prev => prev + 1);
  };

  useEffect(() => {
    // Initial data load
    refreshData();
    
    // Auto-refresh every 2 seconds
    const interval = setInterval(refreshData, 2000);
    
    // Listen for storage changes
    const handleStorageChange = () => {
      console.log('📦 [TOKEN-TEST] Storage change detected');
      refreshData();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const clearTokens = () => {
    ebayOAuth.signOut();
    refreshData();
  };

  const testOAuth = async () => {
    console.log('🧪 [TOKEN-TEST] Testing OAuth flow...');
    try {
      await ebayOAuth.initiateOAuthFlow();
    } catch (error) {
      console.error('❌ [TOKEN-TEST] OAuth test failed:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">eBay Token Test Page</h1>
        <div className="flex space-x-4 mb-4">
          <button
            onClick={refreshData}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Refresh Data ({refreshCount})
          </button>
          <button
            onClick={clearTokens}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Clear Tokens
          </button>
          <button
            onClick={testOAuth}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            Test OAuth
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Authentication Status */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
          <div className={`text-lg font-bold ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
            {isAuthenticated ? '✅ AUTHENTICATED' : '❌ NOT AUTHENTICATED'}
          </div>
        </div>

        {/* Token Data */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Token Data</h2>
          <pre className="bg-white p-4 rounded border text-sm overflow-auto">
            {JSON.stringify(tokenData, null, 2)}
          </pre>
        </div>

        {/* URL Parameters */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">URL Parameters</h2>
          <pre className="bg-white p-4 rounded border text-sm overflow-auto">
            {JSON.stringify(Object.fromEntries(new URLSearchParams(window.location.search)), null, 2)}
          </pre>
        </div>

        {/* Console Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Console Test Commands</h2>
          <div className="space-y-2 text-sm">
            <div><code>ebayOAuth.isAuthenticated()</code> - Check authentication</div>
            <div><code>localStorage.getItem('ebay_oauth_tokens')</code> - Get OAuth tokens</div>
            <div><code>localStorage.getItem('ebay_manual_token')</code> - Get manual token</div>
            <div><code>ebayOAuth.getValidAccessToken()</code> - Get valid access token</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EbayTokenTest;