import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { trackButtonClick } from '../utils/analytics';

interface GoogleSignInSupabaseProps {
  buttonText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onSuccess?: () => void;
}

const GoogleSignInSupabase: React.FC<GoogleSignInSupabaseProps> = ({
  buttonText = "Continue with Google",
  className = "",
  size = 'md',
  onSuccess
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleGoogleSignIn = async () => {
    // Track the signin attempt
    trackButtonClick(buttonText, 'google_signin_supabase');
    
    setStatus('loading');
    setMessage('');

    try {
      console.log('🔄 [GOOGLE_SIGNIN] Initiating Supabase Google OAuth...');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('❌ [GOOGLE_SIGNIN] OAuth error:', error);
        setStatus('error');
        setMessage('Failed to connect with Google. Please try again.');
      } else {
        console.log('✅ [GOOGLE_SIGNIN] OAuth initiated successfully');
        // The browser will redirect to Google for authentication
        // After successful auth, user will be redirected back to /auth/callback
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error('❌ [GOOGLE_SIGNIN] Unexpected error:', error);
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  };

  const sizeClasses = {
    sm: 'text-sm py-2 px-4',
    md: 'text-base py-3 px-6',
    lg: 'text-lg py-4 px-8'
  };

  return (
    <div className={className}>
      <button
        onClick={handleGoogleSignIn}
        disabled={status === 'loading'}
        className={`w-full bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-blue-400 text-gray-700 font-semibold rounded-lg transition-all duration-300 flex items-center justify-center space-x-3 ${sizeClasses[size]} ${
          status === 'loading' ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {status === 'loading' ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
            <span>Connecting to Google...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{buttonText}</span>
          </>
        )}
      </button>
      
      {status === 'error' && message && (
        <div className="mt-3 flex items-center justify-center space-x-2 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{message}</span>
        </div>
      )}
      
      <p className="text-xs text-gray-500 text-center mt-3">
        By continuing, you agree to receive updates about EasyFlip.
        Unsubscribe anytime.
      </p>
    </div>
  );
};

export default GoogleSignInSupabase;