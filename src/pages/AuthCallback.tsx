import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertCircle } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('🔄 [AUTH_CALLBACK] Processing authentication callback...');
        
        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ [AUTH_CALLBACK] Error getting session:', error);
          setStatus('error');
          setMessage('Authentication failed. Please try again.');
          return;
        }

        if (session) {
          console.log('✅ [AUTH_CALLBACK] Session established:', session.user.email);
          
          // Submit to GoHighLevel
          try {
            const response = await fetch('/.netlify/functions/subscribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: session.user.email,
                name: session.user.user_metadata?.full_name || '',
                firstName: session.user.user_metadata?.full_name?.split(' ')[0] || '',
                lastName: session.user.user_metadata?.full_name?.split(' ')[1] || '',
                picture: session.user.user_metadata?.avatar_url || '',
                googleId: session.user.id || '',
                source: 'google_oauth_callback',
                timestamp: new Date().toISOString(),
                page_url: window.location.href
              }),
            });

            if (response.ok) {
              console.log('✅ [AUTH_CALLBACK] Successfully submitted to GoHighLevel');
            }
          } catch (error) {
            console.error('❌ [AUTH_CALLBACK] Failed to submit to GoHighLevel:', error);
            // Don't block the user experience for this
          }

          setStatus('success');
          setMessage('Authentication successful! Redirecting...');
          
          // Redirect based on whether they were trying to access a specific page
          const redirectTo = localStorage.getItem('redirectAfterAuth') || '/';
          localStorage.removeItem('redirectAfterAuth');
          
          setTimeout(() => {
            navigate(redirectTo);
          }, 1500);
        } else {
          console.log('⚠️ [AUTH_CALLBACK] No session found');
          setStatus('error');
          setMessage('No authentication session found. Please try signing in again.');
        }
      } catch (error) {
        console.error('❌ [AUTH_CALLBACK] Unexpected error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        {status === 'processing' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Completing sign in...</h2>
            <p className="text-gray-600">Please wait while we set up your account.</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{message}</h2>
            <p className="text-gray-600">Welcome to EasyFlip!</p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Authentication Error</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Return to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;