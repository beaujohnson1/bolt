import React, { useState, useEffect } from 'react';
import { Link2, CheckCircle, AlertCircle } from 'lucide-react';
import ebayOAuth from '../services/ebayOAuth';

interface EbayAuthButtonProps {
  onAuthSuccess?: () => void;
  className?: string;
}

export const EbayAuthButton: React.FC<EbayAuthButtonProps> = ({ onAuthSuccess, className = '' }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already authenticated
    checkAuthStatus();
    
    // Watch for token changes (from callback page or other sources)
    const unwatch = ebayOAuth.watchForTokenChanges((authenticated) => {
      console.log('🔄 [EBAY-AUTH-BUTTON] Auth status changed:', authenticated);
      setIsAuthenticated(authenticated);
      if (authenticated && onAuthSuccess) {
        onAuthSuccess();
      }
    });
    
    // Also listen for URL parameters indicating successful authentication
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('ebay_connected') === 'true') {
      console.log('🎉 [EBAY-AUTH-BUTTON] Detected successful eBay connection from URL');
      // Force refresh auth status with longer delay to account for async storage
      setTimeout(() => {
        const newAuthStatus = ebayOAuth.refreshAuthStatus();
        setIsAuthenticated(newAuthStatus);
        if (newAuthStatus && onAuthSuccess) {
          onAuthSuccess();
        }
      }, 750); // Increased delay to ensure tokens are stored
    }
    
    return unwatch;
  }, [onAuthSuccess]);

  const checkAuthStatus = () => {
    const authenticated = ebayOAuth.isAuthenticated();
    setIsAuthenticated(authenticated);
  };

  const handleConnectEbay = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔗 [EBAY-AUTH-BUTTON] Using Netlify OAuth function...');
      
      // Clear any existing tokens before starting new flow
      ebayOAuth.clearStoredTokens();
      
      // Generate a random state for security and store return URL
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('ebay_oauth_state', state);
      
      // Store current URL for return after OAuth
      localStorage.setItem('ebay_oauth_return_url', window.location.href);
      
      // Get auth URL from our Netlify function
      const response = await fetch('/.netlify/functions/ebay-oauth?action=get-auth-url&state=' + state, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get authorization URL');
      }

      const data = await response.json();
      console.log('🔗 [EBAY-AUTH-BUTTON] OAuth URL received:', data.authUrl);
      
      // Redirect to eBay authorization page
      window.location.href = data.authUrl;
    } catch (error) {
      console.error('❌ [EBAY-AUTH-BUTTON] Error with OAuth function:', error);
      setError(error.message || 'Failed to connect to eBay');
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    ebayOAuth.signOut();
    setIsAuthenticated(false);
    console.log('✅ [EBAY-AUTH-BUTTON] Disconnected from eBay');
  };

  if (isAuthenticated) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="flex items-center space-x-2 text-green-600">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">eBay Connected</span>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <button
        onClick={handleConnectEbay}
        disabled={isLoading}
        className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Link2 className="w-4 h-4" />
            <span>Connect eBay Account</span>
          </>
        )}
      </button>
      
      {error && (
        <div className="mt-2 flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default EbayAuthButton;