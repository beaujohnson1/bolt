import React from 'react';
import { CheckCircle } from 'lucide-react';

export const MockEbayAuth: React.FC = () => {
  const handleMockConnect = () => {
    // Store mock tokens for testing
    const mockTokens = {
      access_token: 'mock_access_token_for_testing',
      refresh_token: 'mock_refresh_token_for_testing',
      expires_in: 7200,
      token_type: 'Bearer',
      expires_at: Date.now() + (7200 * 1000)
    };
    
    localStorage.setItem('ebay_oauth_tokens', JSON.stringify(mockTokens));
    
    // Trigger page refresh to update auth status
    window.location.reload();
  };

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
      <h4 className="font-semibold text-blue-900 mb-2">🧪 Testing Mode</h4>
      <p className="text-sm text-blue-800 mb-3">
        eBay sandbox is currently unavailable. Use mock authentication for testing.
      </p>
      <button
        onClick={handleMockConnect}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
      >
        Mock eBay Connection
      </button>
    </div>
  );
};

export default MockEbayAuth;