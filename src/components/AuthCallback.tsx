import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';

// Maximum time to wait for authentication to complete
const AUTH_TIMEOUT = 120000; // 120 seconds

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user, authUser, loading, error, redirectPath = null, setRedirectPath } = useAuth();
  const [urlProcessed, setUrlProcessed] = React.useState(false);
  const [timeoutReached, setTimeoutReached] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [authStartTime] = React.useState(Date.now());

  // Set up timeout to prevent infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log('⏰ [AUTH-CALLBACK] Authentication timeout reached');
      setAuthError('Authentication is taking longer than expected. Please try again.');
      setTimeoutReached(true);
    }, 30000); // Reduced to 30 seconds for better UX

    return () => clearTimeout(timeoutId);
  }, []);

  // Monitor authentication progress and redirect on timeout
  useEffect(() => {
    if ((timeoutReached || authError || error) && !user) {
      console.log('🚨 [AUTH-CALLBACK] Timeout reached while still loading, redirecting to home');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000); // Give user time to see the error message
    }
  }, [timeoutReached, authError, error, user, navigate]);

  useEffect(() => {
    // Process URL hash only once
    if (urlProcessed) return;
    
    console.log('🔗 AuthCallback: Processing URL hash...');
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    
    setUrlProcessed(true);
    
    // If there's an error in the URL, clear it and redirect to home
    if (error) {
      console.log('❌ Auth error in URL:', error, errorDescription);
      navigate('/');
      return;
    }
    
    // Log token presence and let Supabase handle authentication
    if (accessToken) {
      console.log('🔑 Auth tokens found in URL, letting Supabase process...');
    } else {
      console.log('ℹ️ No auth tokens in URL, waiting for auth context...');
    }
  }, [navigate, urlProcessed]);
  
  // Monitor authentication state and navigate when ready
  useEffect(() => {
    const elapsedTime = Date.now() - authStartTime;
    
    console.log('🔍 [AUTH-CALLBACK] Monitoring auth state:', {
      loading,
      hasUser: !!user,
      hasAuthUser: !!authUser,
      elapsedTime: `${elapsedTime}ms`,
      timeoutReached,
      redirectPath
    });
    
    if (!loading && user && authUser) {
      console.log(`✅ AuthCallback: User authenticated and profile loaded in ${elapsedTime}ms, navigating to dashboard`);
      
      // Check if we have a stored redirect path
      if (redirectPath) {
        console.log('🎯 [AUTH-CALLBACK] Redirecting to stored path:', redirectPath);
        const pathToNavigate = redirectPath;
        setRedirectPath(null); // Clear the redirect path
        navigate(pathToNavigate, { replace: true });
      } else {
        console.log('🏠 [AUTH-CALLBACK] No redirect path, going to dashboard');
        navigate('/app');
      }
    } else if (!loading && !user && !authUser) {
      console.log(`❌ AuthCallback: No user found after loading (${elapsedTime}ms), redirecting to home`);
      navigate('/');
    } else if (elapsedTime > AUTH_TIMEOUT) {
      console.log(`⏰ AuthCallback: Authentication taking too long (${elapsedTime}ms), redirecting to home`);
      navigate('/');
    }
  }, [user, authUser, loading, navigate, authStartTime, redirectPath, setRedirectPath]);
  
  // Show loading while authentication is being processed
  if (timeoutReached || authError || error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Failed
          </h2>
          <p className="text-gray-600 mb-4">
            {authError || error || 'Authentication timed out. Please try signing in again.'}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Redirecting you back to the home page in a moment...
          </p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Go to Home Page
          </button>
        </div>
      </div>
    );
  }

  if (!loading && (!user || !authUser)) {
    return null;
  }

  const elapsedTime = Date.now() - authStartTime;
  const remainingTime = Math.max(0, AUTH_TIMEOUT - elapsedTime);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="relative mb-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          {remainingTime > 0 && (
            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
              {Math.ceil(remainingTime / 1000)}s remaining
            </div>
          )}
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Setting up your account...
        </h2>
        <p className="text-gray-600">
          Please wait while we set up your account.
        </p>
        
        {elapsedTime > 10000 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              This is taking longer than usual. If it doesn't complete soon, 
              you'll be redirected to try again.
            </p>
          </div>
        )}
        
        {timeoutReached && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">
              Authentication timed out. Redirecting you back to try again...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;