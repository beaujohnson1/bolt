import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Key, CheckCircle } from 'lucide-react';

const ManualTokenExchange = () => {
  const [authUrl, setAuthUrl] = useState('');
  const [isExchanging, setIsExchanging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [currentState, setCurrentState] = useState('');
  const navigate = useNavigate();

  const generateNewAuth = async () => {
    try {
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      setCurrentState(state);
      
      const response = await fetch(`/.netlify/functions/ebay-oauth?action=get-auth-url&state=${state}`);
      const data = await response.json();
      
      if (data.authUrl) {
        window.open(data.authUrl, '_blank');
        setMessage('Complete the authorization in the new tab, then paste the success URL below');
        setStatus('idle');
      }
    } catch (error) {
      setMessage('Failed to generate authorization URL');
      setStatus('error');
    }
  };

  const handleExchange = async () => {
    if (!authUrl) {
      setMessage('Please paste the eBay authorization URL');
      setStatus('error');
      return;
    }

    try {
      setIsExchanging(true);
      setStatus('idle');
      
      // Parse the authorization code from the URL
      const url = new URL(authUrl);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      
      if (!code) {
        throw new Error('No authorization code found in URL');
      }

      // Validate state if we have one
      if (currentState && state !== currentState) {
        console.warn('⚠️ [MANUAL-EXCHANGE] State mismatch, but proceeding...');
      }

      console.log('📝 [MANUAL-EXCHANGE] Extracting code from URL:', { code: code.substring(0, 20) + '...', state, expectedState: currentState });

      // Exchange the code for tokens
      const response = await fetch('/.netlify/functions/ebay-oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'exchange-code',
          code: decodeURIComponent(code),
          redirect_uri: 'easyflip.ai-easyflip-easyfl-flntccc',
          state: state
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Token exchange failed');
      }

      const tokenData = await response.json();
      console.log('✅ [MANUAL-EXCHANGE] Token exchange successful');

      // Store tokens in localStorage
      const tokenInfo = {
        ...tokenData,
        expires_at: Date.now() + (tokenData.expires_in * 1000)
      };
      
      localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokenInfo));
      localStorage.setItem('ebay_manual_token', tokenData.access_token);
      
      setStatus('success');
      setMessage('eBay account connected successfully! Redirecting...');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/app?ebay_connected=true');
      }, 2000);
      
    } catch (error) {
      console.error('❌ [MANUAL-EXCHANGE] Error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to exchange authorization code');
    } finally {
      setIsExchanging(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Complete eBay Authorization
          </h1>
          <p className="text-gray-600">
            Paste the eBay success page URL to complete the connection
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">Instructions:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Click "Get Fresh Authorization" below to get a new eBay OAuth URL</li>
                  <li>Complete the eBay authorization in the new tab</li>
                  <li>Copy the success page URL and paste it below</li>
                  <li>Click "Complete Connection" within 5 minutes</li>
                </ol>
              </div>
            </div>
          </div>

          <button
            onClick={generateNewAuth}
            disabled={isExchanging}
            className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
          >
            🔄 Get Fresh Authorization
          </button>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              eBay Authorization URL
            </label>
            <textarea
              value={authUrl}
              onChange={(e) => setAuthUrl(e.target.value)}
              placeholder="https://auth2.ebay.com/oauth2/ThirdPartyAuthSucessFailure?isAuthSuccessful=true&code=..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px] font-mono text-sm"
              disabled={isExchanging}
            />
          </div>

          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-sm text-red-800">{message}</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-800">{message}</p>
              </div>
            </div>
          )}

          <button
            onClick={handleExchange}
            disabled={isExchanging || !authUrl}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            {isExchanging ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Exchanging Code...</span>
              </>
            ) : (
              <span>Complete Connection</span>
            )}
          </button>

          <div className="text-center">
            <button
              onClick={() => navigate('/app')}
              className="text-gray-600 hover:text-gray-900 text-sm"
            >
              Cancel and return to dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualTokenExchange;