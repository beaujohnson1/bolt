import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';

/**
 * OAuth Router Component
 * 
 * This component handles routing for OAuth-related URLs and provides helpful
 * guidance to users who land on OAuth paths without proper callback parameters.
 * It can detect the intent and redirect appropriately.
 */
const OAuthRouter: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if this looks like an OAuth callback with parameters
    const searchParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.substring(1));
    
    const hasOAuthParams = 
      searchParams.get('code') || 
      searchParams.get('error') ||
      hashParams.get('access_token') ||
      hashParams.get('error');

    if (hasOAuthParams) {
      // This looks like a callback, redirect to appropriate handler
      if (location.pathname.includes('ebay')) {
        console.log('🔄 [OAUTH-ROUTER] Redirecting eBay callback to proper handler');
        navigate('/auth/ebay/callback' + location.search + location.hash, { replace: true });
      } else {
        console.log('🔄 [OAUTH-ROUTER] Redirecting Google callback to proper handler');
        navigate('/auth/callback' + location.search + location.hash, { replace: true });
      }
    }
  }, [location, navigate]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleSignIn = () => {
    navigate('/', { state: { showSignIn: true } });
  };

  const handleEbayConnect = () => {
    navigate('/test-connection');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            OAuth Route
          </h2>
          
          <p className="text-gray-600 mb-4">
            You've navigated to an OAuth authentication route. This page is typically 
            used for handling authentication callbacks from external services.
          </p>

          <div className="text-sm text-gray-500 mb-6">
            <p className="mb-2">Current path: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{location.pathname}</code></p>
            {location.search && (
              <p className="mb-2">Query params: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{location.search}</code></p>
            )}
            {location.hash && (
              <p>Hash: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{location.hash}</code></p>
            )}
          </div>

          <div className="space-y-3">
            <div className="text-left bg-blue-50 p-3 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">What you can do:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Sign in to your account</li>
                <li>• Connect your eBay account</li>
                <li>• Return to the homepage</li>
              </ul>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleSignIn}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center justify-center"
              >
                Sign In
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
              
              <button
                onClick={handleEbayConnect}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors flex items-center justify-center"
              >
                Connect eBay
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
              
              <button
                onClick={handleGoHome}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-400">
            If you're seeing this page unexpectedly, it might indicate an issue 
            with the authentication flow. Please try signing in again.
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthRouter;