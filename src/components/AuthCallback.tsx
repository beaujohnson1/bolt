import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user, authUser, loading } = useAuth();
  const [processing, setProcessing] = React.useState(false);
  const [hasProcessed, setHasProcessed] = React.useState(false);

  useEffect(() => {
    // Check if there are auth tokens or errors in the URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    
    // If there's an error in the URL, clear it and redirect to home
    if (error) {
      console.log('Auth error in URL:', error, errorDescription);
      window.history.replaceState(null, '', window.location.pathname);
      navigate('/');
      return;
    }
    
    // If there are auth tokens, let Supabase handle them automatically
    if (accessToken && !hasProcessed) {
      setProcessing(true);
      setHasProcessed(true);
      
      // Clear the hash from URL
      window.history.replaceState(null, '', window.location.pathname);
      
      // Give the auth context time to process the tokens
      const timer = setTimeout(() => {
        if (authUser) {
          navigate('/app');
        } else {
          // If still no user after 3 seconds, redirect to home
          navigate('/');
        }
        setProcessing(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [navigate, authUser, hasProcessed]);
  
  // If user is already authenticated, redirect immediately
  useEffect(() => {
    if (user && authUser && !loading && !processing) {
      navigate('/app');
    }
  }, [user, authUser, loading, processing, navigate]);
  
  // Only show loading if we're actually processing or if there are tokens in URL
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const hasTokens = hashParams.get('access_token');
  const shouldShowLoading = (loading && hasTokens) || processing;
  
  if (!shouldShowLoading) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {processing ? 'Confirming your email...' : 'Loading your account...'}
        </h2>
        <p className="text-gray-600">
          Please wait while we set up your account.
        </p>
      }
      </div>
    </div>
  );
};

export default AuthCallback;