import React, { useEffect, useState } from 'react';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';

interface GoogleSignInProps {
  buttonText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onSuccess?: (userData: any) => void;
}

const GoogleSignIn: React.FC<GoogleSignInProps> = ({
  buttonText = "Continue with Google",
  className = "",
  size = 'md',
  onSuccess
}) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Load Google Sign-In script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleCredentialResponse = async (response: any) => {
    setStatus('loading');
    
    try {
      // Decode the JWT token to get user info
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      
      const userData = {
        email: payload.email,
        name: payload.name,
        firstName: payload.given_name,
        lastName: payload.family_name,
        picture: payload.picture,
        googleId: payload.sub,
        source: 'google_signin',
        timestamp: new Date().toISOString(),
        page_url: window.location.href
      };

      // Send to your backend/GoHighLevel
      const apiResponse = await fetch('/.netlify/functions/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (apiResponse.ok) {
        setStatus('success');
        setMessage('Welcome! You\'re all set for early access.');
        
        // Track conversion
        if (typeof gtag !== 'undefined') {
          gtag('event', 'sign_up', {
            method: 'Google',
            value: 1.0,
            currency: 'USD'
          });
        }
        
        // Facebook Pixel
        if (typeof fbq !== 'undefined') {
          fbq('track', 'CompleteRegistration');
        }

        // Call success callback
        if (onSuccess) {
          onSuccess(userData);
        }
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
      console.error('Google Sign-In error:', error);
    }
  };

  const handleGoogleSignIn = () => {
    if (window.google) {
      window.google.accounts.id.prompt();
    }
  };

  const sizeClasses = {
    sm: 'text-sm py-2 px-4',
    md: 'text-base py-3 px-6',
    lg: 'text-lg py-4 px-8'
  };

  return (
    <div className={className}>
      {status === 'success' ? (
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 text-green-600 mb-3">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">{message}</span>
          </div>
          <p className="text-sm text-gray-600">
            We'll notify you as soon as EasyFlip launches!
          </p>
        </div>
      ) : (
        <>
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
                <span>Signing in...</span>
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
          
          {status === 'error' && (
            <div className="mt-3 flex items-center justify-center space-x-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{message}</span>
            </div>
          )}
          
          <p className="text-xs text-gray-500 text-center mt-3">
            By continuing, you agree to receive updates about EasyFlip.
            Unsubscribe anytime.
          </p>
        </>
      )}
    </div>
  );
};

// Extend window object for TypeScript
declare global {
  interface Window {
    google: any;
  }
}

export default GoogleSignIn;
