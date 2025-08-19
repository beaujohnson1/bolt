import React, { useState } from 'react';
import { Key, CheckCircle } from 'lucide-react';

interface ManualEbayAuthProps {
  onAuthSuccess?: () => void;
}

export const ManualEbayAuth: React.FC<ManualEbayAuthProps> = ({ onAuthSuccess }) => {
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleManualAuth = () => {
    if (!token.trim()) {
      alert('Please enter a valid access token');
      return;
    }

    setIsSubmitting(true);

    try {
      // Store manual token in both locations for compatibility
      const manualTokens = {
        access_token: token.trim(),
        refresh_token: 'manual_refresh_token',
        expires_in: 7200,
        token_type: 'Bearer',
        expires_at: Date.now() + (7200 * 1000)
      };
      
      localStorage.setItem('ebay_oauth_tokens', JSON.stringify(manualTokens));
      localStorage.setItem('ebay_manual_token', token.trim());
      
      console.log('✅ [MANUAL-EBAY-AUTH] Token stored successfully');
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('ebayAuthChanged', {
        detail: { authenticated: true, tokens: manualTokens }
      }));
      
      // Call the callback to update parent component state
      if (onAuthSuccess) {
        onAuthSuccess();
      }
      
      // Clear the input field
      setToken('');
      
      // Show success message
      alert('eBay token connected successfully!');
    } catch (error) {
      console.error('Error storing manual token:', error);
      alert('Failed to store token');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
      <h4 className="font-semibold text-green-900 mb-2">🔑 Manual Token Entry</h4>
      <p className="text-sm text-green-800 mb-3">
        Get an access token from your eBay Developer Console and enter it below:
      </p>
      
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-green-900 mb-1">
            Access Token:
          </label>
          <input
            type="text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="v^1.1#i^1#f^0#p^3#r^0#I^3#t^H4sI..."
            className="w-full px-3 py-2 border border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          />
        </div>
        
        <button
          onClick={handleManualAuth}
          disabled={isSubmitting || !token.trim()}
          className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Key className="w-4 h-4" />
              <span>Connect with Token</span>
            </>
          )}
        </button>
        
        <div className="text-xs text-green-700">
          <p className="font-semibold mb-1">How to get a token:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to <a href="https://developer.ebay.com/my/keys" target="_blank" className="underline">eBay Developer Console</a></li>
            <li>Select your "EasyFlip" application</li>
            <li>Click "User Tokens" → "Get a User Token"</li>
            <li>Select all "Sell API" scopes</li>
            <li>Copy the generated access token and paste above</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ManualEbayAuth;