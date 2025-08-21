import React, { useState, useEffect } from 'react';
import { EBayOAuthFixed, AuthToken } from '../services/ebayOAuthFixed';

interface EbayAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  token: AuthToken | null;
}

/**
 * Simple eBay Authentication Component
 * 
 * Follows the Hendt eBay API pattern exactly:
 * 1. Generate auth URL with proper redirect_uri
 * 2. Open OAuth popup
 * 3. Listen for callback success
 * 4. Store tokens properly
 * 
 * Uses the fixed OAuth service (ebayOAuthFixed.ts) which integrates 
 * with our callback-fixed endpoint (/.netlify/functions/simple-ebay-callback)
 */
const SimpleEbayAuth: React.FC = () => {
  const [authState, setAuthState] = useState<EbayAuthState>({
    isAuthenticated: false,
    isLoading: false,
    error: null,
    token: null
  });

  const [popup, setPopup] = useState<Window | null>(null);

  useEffect(() => {
    // Initialize the OAuth service
    EBayOAuthFixed.initialize();

    // Check if already authenticated
    const existingToken = EBayOAuthFixed.getAccessToken();
    if (existingToken) {
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: true,
        token: { access_token: existingToken } as AuthToken
      }));
    }

    // Listen for token updates
    const unsubscribe = EBayOAuthFixed.onTokenRefresh((token) => {
      console.log('🔄 [SIMPLE-EBAY-AUTH] Token refreshed:', !!token);
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: !!token,
        token,
        error: null,
        isLoading: false
      }));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Listen for popup messages (OAuth callback communication)
    const handleMessage = (event: MessageEvent) => {
      // Security check - only accept messages from our domain
      if (event.origin !== window.location.origin) {
        console.warn('⚠️ [SIMPLE-EBAY-AUTH] Ignoring message from foreign origin:', event.origin);
        return;
      }

      console.log('📨 [SIMPLE-EBAY-AUTH] Received message:', event.data);

      if (event.data.type === 'EBAY_OAUTH_SUCCESS') {
        console.log('✅ [SIMPLE-EBAY-AUTH] OAuth success received');
        
        const tokenData = event.data.tokens;
        if (tokenData) {
          // Store the tokens using our fixed service
          EBayOAuthFixed.setCredentials(tokenData);
          
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            error: null,
            token: tokenData
          });
        }

        // Close popup
        if (popup && !popup.closed) {
          popup.close();
          setPopup(null);
        }
      } else if (event.data.type === 'EBAY_OAUTH_ERROR') {
        console.error('❌ [SIMPLE-EBAY-AUTH] OAuth error received:', event.data.error);
        
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: event.data.error || 'Authentication failed'
        }));

        // Close popup
        if (popup && !popup.closed) {
          popup.close();
          setPopup(null);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [popup]);

  const handleConnect = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
      console.log('🚀 [SIMPLE-EBAY-AUTH] Starting OAuth flow...');

      // Generate the OAuth URL following Hendt pattern exactly
      // This uses our fixed service which sets up the correct redirect_uri
      const authUrl = EBayOAuthFixed.generateAuthUrl();
      
      console.log('🔗 [SIMPLE-EBAY-AUTH] Generated auth URL:', authUrl);

      // Open popup window - following the same pattern as the working callback
      const newPopup = window.open(
        authUrl,
        'ebayAuth',
        'width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no'
      );

      if (!newPopup) {
        throw new Error('Popup blocked. Please allow popups and try again.');
      }

      setPopup(newPopup);
      console.log('🎯 [SIMPLE-EBAY-AUTH] Popup opened successfully');

      // Monitor popup for manual close
      const checkClosed = setInterval(() => {
        if (newPopup.closed) {
          clearInterval(checkClosed);
          setPopup(null);
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: prev.isAuthenticated ? null : 'Authentication cancelled'
          }));
          console.log('🔒 [SIMPLE-EBAY-AUTH] Popup was closed by user');
        }
      }, 1000);

      // Auto-cleanup after 5 minutes
      setTimeout(() => {
        if (newPopup && !newPopup.closed) {
          newPopup.close();
          setPopup(null);
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
            error: 'Authentication timeout'
          }));
          console.log('⏰ [SIMPLE-EBAY-AUTH] Authentication timeout');
        }
        clearInterval(checkClosed);
      }, 5 * 60 * 1000); // 5 minutes

    } catch (error) {
      console.error('❌ [SIMPLE-EBAY-AUTH] Connection error:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }));
    }
  };

  const handleDisconnect = () => {
    console.log('🔌 [SIMPLE-EBAY-AUTH] Disconnecting eBay account...');
    
    // Clear tokens using our fixed service
    EBayOAuthFixed.clearTokens();
    
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      error: null,
      token: null
    });
  };

  const formatTokenInfo = (token: AuthToken | null) => {
    if (!token) return 'No token available';
    
    return {
      hasAccessToken: !!token.access_token,
      hasRefreshToken: !!token.refresh_token,
      tokenLength: token.access_token?.length || 0,
      expiresIn: token.expires_in ? `${token.expires_in} seconds` : 'Unknown',
      tokenType: token.token_type || 'Bearer'
    };
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Simple eBay Authentication
        </h2>
        <p className="text-gray-600">
          Following Hendt eBay API pattern with fixed OAuth service
        </p>
      </div>

      {/* Status Display */}
      <div className="mb-6">
        <div className="flex items-center justify-center space-x-4 mb-4">
          <div className={`w-3 h-3 rounded-full ${
            authState.isAuthenticated ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          <span className={`font-semibold ${
            authState.isAuthenticated ? 'text-green-700' : 'text-red-700'
          }`}>
            {authState.isAuthenticated ? 'Connected to eBay' : 'Not Connected'}
          </span>
        </div>

        {authState.isLoading && (
          <div className="flex items-center justify-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span>Connecting to eBay...</span>
          </div>
        )}

        {authState.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
            <strong>Error:</strong> {authState.error}
          </div>
        )}
      </div>

      {/* Token Information */}
      {authState.token && (
        <div className="mb-6 bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Token Information</h3>
          <pre className="text-xs text-gray-700 bg-white p-2 rounded border overflow-auto">
            {JSON.stringify(formatTokenInfo(authState.token), null, 2)}
          </pre>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        {!authState.isAuthenticated ? (
          <button
            onClick={handleConnect}
            disabled={authState.isLoading}
            className={`px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
              authState.isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {authState.isLoading ? 'Connecting...' : 'Connect eBay Account'}
          </button>
        ) : (
          <div className="flex space-x-3">
            <button
              onClick={handleConnect}
              disabled={authState.isLoading}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              Reconnect
            </button>
            <button
              onClick={handleDisconnect}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Debug Information */}
      <div className="mt-6 text-xs text-gray-500 bg-gray-50 p-3 rounded">
        <strong>Implementation Details:</strong>
        <ul className="mt-1 space-y-1">
          <li>• Uses EBayOAuthFixed service with Hendt eBay API pattern</li>
          <li>• Integrates with /.netlify/functions/simple-ebay-callback endpoint</li>
          <li>• Automatic token storage and refresh management</li>
          <li>• Cross-window communication via postMessage</li>
          <li>• Popup-based OAuth flow with timeout protection</li>
        </ul>
      </div>
    </div>
  );
};

export default SimpleEbayAuth;