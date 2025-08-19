import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ebayOAuth from '../services/ebayOAuth';
import { User, ShoppingCart, RefreshCw, Eye, EyeOff, Database } from 'lucide-react';

interface AuthStatusDebugProps {
  minimal?: boolean;
  className?: string;
}

const AuthStatusDebug: React.FC<AuthStatusDebugProps> = ({ minimal = false, className = '' }) => {
  const { user, authUser, loading } = useAuth();
  const [ebayAuth, setEbayAuth] = useState(false);
  const [showDetails, setShowDetails] = useState(!minimal);
  const [ebayTokens, setEbayTokens] = useState<any>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const refreshAuthStatus = () => {
    setRefreshCount(prev => prev + 1);
    // Force refresh eBay auth status
    const isAuth = ebayOAuth.isAuthenticated();
    setEbayAuth(isAuth);
    
    // Get token details
    try {
      const tokens = (ebayOAuth as any).getStoredTokens?.();
      setEbayTokens(tokens);
    } catch (error) {
      console.error('Error getting eBay tokens:', error);
    }
  };

  useEffect(() => {
    refreshAuthStatus();
  }, [refreshCount]);

  useEffect(() => {
    // Set up eBay token watcher
    const unwatch = ebayOAuth.watchForTokenChanges((authenticated) => {
      setEbayAuth(authenticated);
      refreshAuthStatus();
    });

    return unwatch;
  }, []);

  const getStorageInfo = () => {
    const storageKeys = Object.keys(localStorage).filter(key => 
      key.includes('auth') || 
      key.includes('token') || 
      key.includes('ebay') || 
      key.includes('supabase')
    );

    return storageKeys.map(key => ({
      key,
      value: localStorage.getItem(key),
      length: localStorage.getItem(key)?.length || 0
    }));
  };

  if (minimal) {
    return (
      <div className={`flex items-center space-x-2 text-sm ${className}`}>
        <div className="flex items-center space-x-1">
          <User className={`w-4 h-4 ${authUser ? 'text-green-500' : 'text-red-500'}`} />
          <span className={authUser ? 'text-green-600' : 'text-red-600'}>
            {authUser ? 'Google' : 'No Auth'}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <ShoppingCart className={`w-4 h-4 ${ebayAuth ? 'text-green-500' : 'text-red-500'}`} />
          <span className={ebayAuth ? 'text-green-600' : 'text-red-600'}>
            {ebayAuth ? 'eBay' : 'No eBay'}
          </span>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-1 rounded hover:bg-gray-100"
          title="Toggle details"
        >
          {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
          <Database className="w-5 h-5 mr-2" />
          Authentication Status
        </h3>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={refreshAuthStatus}
            className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600"
            title="Refresh status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600"
            title="Toggle details"
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-blue-800">Google Authentication</span>
            <User className={`w-5 h-5 ${authUser ? 'text-green-500' : 'text-red-500'}`} />
          </div>
          <div className="mt-2 text-sm">
            <div className={`${authUser ? 'text-green-600' : 'text-red-600'}`}>
              Status: {authUser ? 'Authenticated' : 'Not authenticated'}
            </div>
            {authUser && (
              <div className="text-gray-600 mt-1">
                <div>Email: {authUser.email}</div>
                <div>ID: {authUser.id?.substring(0, 8)}...</div>
              </div>
            )}
            {loading && (
              <div className="text-yellow-600 mt-1">Loading auth state...</div>
            )}
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="font-medium text-yellow-800">eBay Authentication</span>
            <ShoppingCart className={`w-5 h-5 ${ebayAuth ? 'text-green-500' : 'text-red-500'}`} />
          </div>
          <div className="mt-2 text-sm">
            <div className={`${ebayAuth ? 'text-green-600' : 'text-red-600'}`}>
              Status: {ebayAuth ? 'Authenticated' : 'Not authenticated'}
            </div>
            {ebayTokens && (
              <div className="text-gray-600 mt-1">
                <div>Has Access Token: {ebayTokens.access_token ? 'Yes' : 'No'}</div>
                <div>Has Refresh Token: {ebayTokens.refresh_token ? 'Yes' : 'No'}</div>
                {ebayTokens.expires_at && (
                  <div>
                    Expires: {new Date(ebayTokens.expires_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Profile */}
      {user && (
        <div className="bg-green-50 rounded-lg p-3 mb-4">
          <div className="font-medium text-green-800 mb-2">User Profile</div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Name: {user.name}</div>
            <div>Email: {user.email}</div>
            <div>Plan: {user.subscription_plan}</div>
            <div>Listings: {user.listings_used}/{user.listings_limit}</div>
          </div>
        </div>
      )}

      {/* Detailed Storage Info */}
      {showDetails && (
        <div className="space-y-3">
          <div className="border-t pt-3">
            <h4 className="font-medium text-gray-800 mb-2">Local Storage</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {getStorageInfo().map(({ key, value, length }) => (
                <div key={key} className="bg-gray-50 p-2 rounded text-xs">
                  <div className="font-mono text-blue-600">{key}</div>
                  <div className="text-gray-600">
                    Length: {length} characters
                  </div>
                  {value && (
                    <div className="text-gray-500 truncate mt-1">
                      {value.length > 100 ? `${value.substring(0, 100)}...` : value}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-medium text-gray-800 mb-2">Current URL</h4>
            <div className="bg-gray-50 p-2 rounded text-xs font-mono">
              {window.location.href}
            </div>
          </div>

          <div className="border-t pt-3">
            <h4 className="font-medium text-gray-800 mb-2">Debug Actions</h4>
            <div className="space-y-2">
              <button
                onClick={() => {
                  console.log('🔍 [AUTH-DEBUG] Running eBay auth debug...');
                  (ebayOAuth as any).debugTokenStorage?.();
                }}
                className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-800 py-2 px-3 rounded text-sm"
              >
                Debug eBay Tokens
              </button>
              
              <button
                onClick={() => {
                  console.log('🔍 [AUTH-DEBUG] Clearing all auth data...');
                  ebayOAuth.clearStoredTokens();
                  localStorage.removeItem('supabase.auth.token');
                  window.location.reload();
                }}
                className="w-full bg-red-100 hover:bg-red-200 text-red-800 py-2 px-3 rounded text-sm"
              >
                Clear All Auth Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthStatusDebug;