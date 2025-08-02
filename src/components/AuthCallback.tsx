import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [processing, setProcessing] = React.useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check if there are auth tokens in the URL hash
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type = hashParams.get('type');

      if (accessToken && (type === 'signup' || type === 'recovery' || type === 'invite')) {
        setProcessing(true);
        
        try {
          // Set the session with the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (error) {
            console.error('Error setting session:', error);
          } else {
            console.log('Session set successfully:', data);
          }

          // Clear the hash from URL for cleaner experience
          window.history.replaceState(null, '', window.location.pathname);
          
          // Wait a moment for auth context to update, then redirect
          setTimeout(() => {
            navigate('/app');
          }, 1000);
          
        } catch (error) {
          console.error('Error processing auth callback:', error);
          setProcessing(false);
        }
      }
    };

    handleAuthCallback();
  }, [navigate, user]);

  // Show loading while processing
  if (loading || processing) {
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
        </div>
      </div>
    );
  }

  return null;
};

export default AuthCallback;