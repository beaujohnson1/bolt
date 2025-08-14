import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, ShoppingCart } from 'lucide-react';
import ebayOAuth from '../services/ebayOAuth';

const EbayAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleEbayCallback = async () => {
      try {
        console.log('🔄 [EBAY-AUTH-CALLBACK] Processing eBay OAuth callback...');
        
        // Get parameters from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        
        // Handle OAuth errors
        if (error) {
          const errorDescription = searchParams.get('error_description') || error;
          console.error('❌ [EBAY-AUTH-CALLBACK] OAuth error:', error, errorDescription);
          setStatus('error');
          setMessage(`eBay authentication failed: ${errorDescription}`);
          return;
        }

        // Check for required parameters
        if (!code || !state) {
          console.error('❌ [EBAY-AUTH-CALLBACK] Missing required parameters');
          setStatus('error');
          setMessage('Invalid callback - missing required parameters.');
          return;
        }

        console.log('📝 [EBAY-AUTH-CALLBACK] Got authorization code, exchanging for tokens...');
        
        // Exchange code for tokens
        const redirectUri = `${window.location.origin}/auth/ebay/callback`;
        const tokens = await ebayOAuth.handleOAuthCallback(code, state, redirectUri);

        console.log('✅ [EBAY-AUTH-CALLBACK] Successfully obtained eBay tokens');
        
        setStatus('success');
        setMessage('eBay authentication successful! You can now use eBay features.');
        
        // Redirect to test connection page or dashboard after success
        setTimeout(() => {
          navigate('/test-connection');
        }, 2000);

      } catch (error) {
        console.error('❌ [EBAY-AUTH-CALLBACK] Unexpected error:', error);
        setStatus('error');
        setMessage(`Authentication failed: ${error.message}`);
      }
    };

    handleEbayCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        {status === 'processing' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
            <ShoppingCart className="w-8 h-8 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Connecting to eBay...</h2>
            <p className="text-gray-600">Please wait while we complete your eBay authentication.</p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <ShoppingCart className="w-8 h-8 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">eBay Connected!</h2>
            <p className="text-gray-600 mb-2">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to connection test...</p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">eBay Authentication Error</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/test-connection')}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Return to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EbayAuthCallback;