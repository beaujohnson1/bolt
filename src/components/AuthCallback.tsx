import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Maximum time to wait for authentication to complete
const AUTH_TIMEOUT = 120000; // 120 seconds

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user: appUser, authUser: supabaseUser, loading, redirectPath = null, setRedirectPath } = useAuth();
  const [urlProcessed, setUrlProcessed] = React.useState(false);
  const [timeoutReached, setTimeoutReached] = React.useState(false);
  const [authStartTime] = React.useState(Date.now());

  // Set up timeout to prevent infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.log('⏰ [AUTH-CALLBACK] Authentication timeout reached');
      setTimeoutReached(true);
    }, AUTH_TIMEOUT);

    return () => clearTimeout(timeoutId);
  }, []);

  // Monitor authentication progress and redirect on timeout
  useEffect(() => {
    if (timeoutReached && loading) {
      console.log('🚨 [AUTH-CALLBACK] Timeout reached while still loading, redirecting to home');
      navigate('/', { replace: true });
    }
  }, [timeoutReached, loading, navigate]);

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
  
  // Submit to GoHighLevel when user is authenticated (don't wait for full profile)
  useEffect(() => {
    const submitToGoHighLevel = async () => {
      if (supabaseUser && !localStorage.getItem(`ghl_submitted_${supabaseUser.id}`)) {
        try {
          console.log('📧 [AUTH-CALLBACK] Submitting to GoHighLevel:', supabaseUser.email);
          console.log('📊 [AUTH-CALLBACK] User metadata available:', supabaseUser.user_metadata);
          
          const response = await fetch('/.netlify/functions/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: supabaseUser.email,
              name: supabaseUser.user_metadata?.full_name || appUser?.full_name || '',
              firstName: supabaseUser.user_metadata?.full_name?.split(' ')[0] || appUser?.full_name?.split(' ')[0] || '',
              lastName: supabaseUser.user_metadata?.full_name?.split(' ')[1] || appUser?.full_name?.split(' ')[1] || '',
              picture: supabaseUser.user_metadata?.avatar_url || appUser?.avatar_url || '',
              googleId: supabaseUser.id || '',
              source: 'google_oauth_auth_callback',
              timestamp: new Date().toISOString(),
              page_url: window.location.href
            }),
          });

          if (response.ok) {
            console.log('✅ [AUTH-CALLBACK] Successfully submitted to GoHighLevel');
            localStorage.setItem(`ghl_submitted_${supabaseUser.id}`, 'true');
          }
        } catch (error) {
          console.error('❌ [AUTH-CALLBACK] Failed to submit to GoHighLevel:', error);
        }
      }
    };

    if (supabaseUser) {
      submitToGoHighLevel();
    }
  }, [supabaseUser]);

  // Monitor authentication state and navigate when ready
  useEffect(() => {
    const elapsedTime = Date.now() - authStartTime;
    
    console.log('🔍 [AUTH-CALLBACK] Monitoring auth state:', {
      loading,
      hasSupabaseUser: !!supabaseUser,
      hasAppUser: !!appUser,
      elapsedTime: `${elapsedTime}ms`,
      timeoutReached,
      redirectPath
    });
    
    // Navigate when we have a supabase user, don't wait for loading to be false
    if (supabaseUser) {
      // Wait a bit for profile, but not too long
      const profileWaitTime = 5000; // 5 seconds max for profile
      const hasWaitedEnough = elapsedTime > profileWaitTime;
      
      if (appUser || hasWaitedEnough) {
        console.log(`✅ AuthCallback: User authenticated ${appUser ? 'with profile' : 'without full profile'} in ${elapsedTime}ms, navigating to dashboard`);
        
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
      }
    } else if (!loading && !supabaseUser && elapsedTime > 3000) {
      console.log(`❌ AuthCallback: No user found after loading (${elapsedTime}ms), redirecting to home`);
      navigate('/');
    } else if (elapsedTime > AUTH_TIMEOUT) {
      console.log(`⏰ AuthCallback: Authentication taking too long (${elapsedTime}ms), redirecting to home`);
      navigate('/');
    }
  }, [supabaseUser, appUser, loading, navigate, authStartTime, redirectPath, setRedirectPath]);
  
  // Show loading while authentication is being processed
  // Only hide if timeout reached or if no user after loading completes
  if (timeoutReached) {
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
          {supabaseUser ? 'Finalizing setup...' : 'Setting up your account...'}
        </h2>
        <p className="text-gray-600">
          {supabaseUser ? `Welcome back, ${supabaseUser.email}!` : 'Please wait while we set up your account.'}
        </p>
        
        {elapsedTime > 3000 && !supabaseUser && (
          <div className="mt-4 text-sm text-orange-600">
            Taking longer than expected. You may need to sign in again.
          </div>
        )}
        
        {elapsedTime > 10000 && supabaseUser && (
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