import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader2, ShoppingCart, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import ebayOAuth from '../services/ebayOAuth';

interface CallbackState {
  status: 'processing' | 'success' | 'error' | 'timeout';
  message: string;
  provider?: 'google' | 'ebay';
  error?: string;
}

const OAuthCallbackHandler: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user: appUser, authUser: supabaseUser, loading } = useAuth();
  const [callbackState, setCallbackState] = useState<CallbackState>({
    status: 'processing',
    message: 'Processing authentication...',
  });

  // Determine which OAuth provider based on the route
  const isEbayCallback = location.pathname.includes('/ebay/');
  const provider = isEbayCallback ? 'ebay' : 'google';

  // Timeout handling
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (callbackState.status === 'processing') {
        setCallbackState({
          status: 'timeout',
          message: 'Authentication is taking longer than expected.',
          provider,
        });
      }
    }, 120000); // 2 minutes timeout

    return () => clearTimeout(timeoutId);
  }, [callbackState.status, provider]);

  // Handle eBay OAuth callback
  useEffect(() => {
    if (!isEbayCallback) return;

    const handleEbayCallback = async () => {
      try {
        console.log('🔄 [OAUTH-HANDLER] Processing eBay OAuth callback...');
        
        // Get parameters from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        
        setCallbackState({
          status: 'processing',
          message: 'Connecting to eBay...',
          provider: 'ebay',
        });

        // Handle OAuth errors
        if (error) {
          const errorDescription = searchParams.get('error_description') || error;
          console.error('❌ [OAUTH-HANDLER] eBay OAuth error:', error, errorDescription);
          setCallbackState({
            status: 'error',
            message: `eBay authentication failed: ${errorDescription}`,
            provider: 'ebay',
            error: errorDescription,
          });
          return;
        }

        // Check for required parameters
        if (!code || !state) {
          console.error('❌ [OAUTH-HANDLER] Missing required eBay OAuth parameters');
          setCallbackState({
            status: 'error',
            message: 'Invalid callback - missing required parameters.',
            provider: 'ebay',
            error: 'Missing code or state parameter',
          });
          return;
        }

        console.log('📝 [OAUTH-HANDLER] Got eBay authorization code, exchanging for tokens...');
        
        // Exchange code for tokens
        const redirectUri = `${window.location.origin}/auth/ebay/callback`;
        const tokens = await ebayOAuth.handleOAuthCallback(code, state, redirectUri);

        console.log('✅ [OAUTH-HANDLER] Successfully obtained eBay tokens');
        
        setCallbackState({
          status: 'success',
          message: 'eBay authentication successful! You can now use eBay features.',
          provider: 'ebay',
        });
        
        // Redirect to dashboard after short delay
        setTimeout(() => {
          // Navigate to test connection page first, then to dashboard
          navigate('/test-connection');
        }, 2000);

      } catch (error) {
        console.error('❌ [OAUTH-HANDLER] eBay OAuth error:', error);
        setCallbackState({
          status: 'error',
          message: `eBay authentication failed: ${error.message}`,
          provider: 'ebay',
          error: error.message,
        });
      }
    };

    handleEbayCallback();
  }, [isEbayCallback, searchParams, navigate]);

  // Handle Google OAuth callback
  useEffect(() => {
    if (isEbayCallback) return;

    const handleGoogleCallback = async () => {
      try {
        console.log('🔄 [OAUTH-HANDLER] Processing Google OAuth callback...');
        
        setCallbackState({
          status: 'processing',
          message: 'Setting up your account...',
          provider: 'google',
        });

        // Check for OAuth errors in URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const error = hashParams.get('error');
        const errorDescription = hashParams.get('error_description');
        
        if (error) {
          console.log('❌ [OAUTH-HANDLER] Google OAuth error in URL:', error, errorDescription);
          setCallbackState({
            status: 'error',
            message: `Google authentication failed: ${errorDescription || error}`,
            provider: 'google',
            error: errorDescription || error,
          });
          return;
        }

        // Wait for Supabase to process the OAuth session
        // The AuthContext will handle the actual token processing
        console.log('✅ [OAUTH-HANDLER] Google OAuth callback processed, waiting for auth context...');
        
      } catch (error) {
        console.error('❌ [OAUTH-HANDLER] Google OAuth error:', error);
        setCallbackState({
          status: 'error',
          message: `Google authentication failed: ${error.message}`,
          provider: 'google',
          error: error.message,
        });
      }
    };

    handleGoogleCallback();
  }, [isEbayCallback]);

  // Monitor Google OAuth authentication progress
  useEffect(() => {
    if (isEbayCallback) return;

    // Update state based on auth context for Google OAuth
    if (supabaseUser && callbackState.status === 'processing') {
      console.log('✅ [OAUTH-HANDLER] Google authentication successful');
      setCallbackState({
        status: 'success',
        message: `Welcome back, ${supabaseUser.email}!`,
        provider: 'google',
      });

      // Redirect to dashboard after short delay
      setTimeout(() => {
        navigate('/app');
      }, 2000);
    } else if (!loading && !supabaseUser && callbackState.status === 'processing') {
      // Only show error if we've been processing for a while
      const hasBeenProcessing = Date.now() - (window as any).authStartTime > 10000;
      if (hasBeenProcessing) {
        setCallbackState({
          status: 'error',
          message: 'Authentication failed. Please try signing in again.',
          provider: 'google',
          error: 'No user session found after processing',
        });
      }
    }
  }, [supabaseUser, loading, callbackState.status, navigate, isEbayCallback]);

  // Set auth start time for timeout calculations
  useEffect(() => {
    (window as any).authStartTime = Date.now();
  }, []);

  const getIcon = () => {
    switch (callbackState.status) {
      case 'processing':
        return <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />;
      case 'success':
        return <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />;
      case 'error':
      case 'timeout':
        return <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />;
      default:
        return <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />;
    }
  };

  const getProviderIcon = () => {
    if (provider === 'ebay') {
      return <ShoppingCart className="w-8 h-8 text-yellow-600 mx-auto mb-4" />;
    }
    return <LogIn className="w-8 h-8 text-blue-600 mx-auto mb-4" />;
  };

  const getTitle = () => {
    switch (callbackState.status) {
      case 'processing':
        return provider === 'ebay' ? 'Connecting to eBay...' : 'Setting up your account...';
      case 'success':
        return provider === 'ebay' ? 'eBay Connected!' : 'Sign In Successful!';
      case 'error':
        return `${provider === 'ebay' ? 'eBay' : 'Google'} Authentication Error`;
      case 'timeout':
        return 'Authentication Timeout';
      default:
        return 'Processing...';
    }
  };

  const getGradientClass = () => {
    if (provider === 'ebay') {
      return 'bg-gradient-to-br from-yellow-50 to-orange-100';
    }
    return 'bg-gradient-to-br from-blue-50 to-indigo-100';
  };

  const handleRetry = () => {
    if (provider === 'ebay') {
      navigate('/test-connection');
    } else {
      navigate('/');
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className={`min-h-screen ${getGradientClass()} flex items-center justify-center p-6`}>
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center">
          {getIcon()}
          {getProviderIcon()}
          
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {getTitle()}
          </h2>
          
          <p className="text-gray-600 mb-4">
            {callbackState.message}
          </p>

          {callbackState.status === 'processing' && (
            <div className="text-sm text-gray-500">
              Please wait while we complete the authentication process...
            </div>
          )}

          {callbackState.status === 'success' && (
            <div className="text-sm text-gray-500">
              {provider === 'ebay' 
                ? 'Redirecting to connection test...' 
                : 'Redirecting to dashboard...'
              }
            </div>
          )}

          {(callbackState.status === 'error' || callbackState.status === 'timeout') && (
            <div className="space-y-3 mt-4">
              {callbackState.error && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  Error: {callbackState.error}
                </div>
              )}
              
              <div className="space-y-2">
                <button
                  onClick={handleRetry}
                  className={`w-full font-semibold py-2 px-6 rounded-lg transition-colors ${
                    provider === 'ebay'
                      ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  Try Again
                </button>
                
                <button
                  onClick={handleGoHome}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Return to Home
                </button>
              </div>
            </div>
          )}

          {callbackState.status === 'timeout' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                The authentication process is taking longer than expected. 
                This might be due to network issues or server load.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OAuthCallbackHandler;