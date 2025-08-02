import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user, authUser, loading } = useAuth();
  const [urlProcessed, setUrlProcessed] = React.useState(false);

  useEffect(() => {
    // Process URL hash only once
    if (urlProcessed) return;
    
    console.log('🔗 AuthCallback: Processing URL hash...');
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    
    // Clear the hash from URL immediately
    window.history.replaceState(null, '', window.location.pathname);
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
    if (!loading && user && authUser) {
      console.log('✅ AuthCallback: User authenticated and profile loaded, navigating to dashboard');
      navigate('/app');
    } else if (!loading && !user && !authUser) {
      console.log('❌ AuthCallback: No user found after loading, redirecting to home');
      navigate('/');
    }
  }, [user, authUser, loading, navigate]);
  
  // Show loading while authentication is being processed
  if (!loading && (!user || !authUser)) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Setting up your account...
        </h2>
        <p className="text-gray-600">
          Please wait while we set up your account.
        </p>
      </div>
    </div>
  );
};

export default AuthCallback;