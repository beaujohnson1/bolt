import React, { useState } from 'react';
import { Link2, ShoppingCart, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import ebayOAuthService from '../services/ebayOAuth';

interface EbayConnectionPromptProps {
  onConnect?: () => void;
  variant?: 'card' | 'banner' | 'inline';
  size?: 'sm' | 'md' | 'lg';
}

const EbayConnectionPrompt: React.FC<EbayConnectionPromptProps> = ({ 
  onConnect, 
  variant = 'card',
  size = 'md' 
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      console.log('🔗 [EBAY-PROMPT] Initiating eBay OAuth flow...');
      
      // Use the current page as redirect
      const redirectUri = `${window.location.origin}/app`;
      await ebayOAuthService.initiateOAuthFlow(redirectUri);
      
      // Call the optional callback
      onConnect?.();
    } catch (error) {
      console.error('❌ [EBAY-PROMPT] Error connecting to eBay:', error);
      alert('Failed to connect to eBay. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  // Check connection status
  React.useEffect(() => {
    const checkConnection = () => {
      const connected = ebayOAuthService.isAuthenticated();
      setIsConnected(connected);
    };

    checkConnection();

    // Watch for auth changes
    const cleanup = ebayOAuthService.watchForTokenChanges((authenticated) => {
      setIsConnected(authenticated);
    });

    return cleanup;
  }, []);

  // If already connected, show success state
  if (isConnected) {
    return (
      <div className={`${
        variant === 'banner' 
          ? 'bg-green-50 border border-green-200 rounded-lg p-4' 
          : variant === 'inline'
          ? 'inline-flex items-center space-x-2'
          : 'bg-green-50 border border-green-200 rounded-xl p-6'
      }`}>
        <div className="flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className={variant === 'inline' ? '' : 'flex-1'}>
            <h3 className={`font-semibold text-green-800 ${
              size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
            }`}>
              eBay Connected
            </h3>
            {variant !== 'inline' && (
              <p className="text-green-700 text-sm mt-1">
                Your eBay account is connected and ready for listing creation.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Card variant
  if (variant === 'card') {
    return (
      <div className={`bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white ${
        size === 'sm' ? 'p-4' : size === 'lg' ? 'p-8' : 'p-6'
      }`}>
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className={`bg-white/20 rounded-full p-3 ${
              size === 'sm' ? 'p-2' : size === 'lg' ? 'p-4' : 'p-3'
            }`}>
              <ShoppingCart className={`text-white ${
                size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6'
              }`} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold mb-2 ${
              size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl'
            }`}>
              Connect Your eBay Account
            </h3>
            <p className={`text-blue-100 mb-4 ${
              size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-base' : 'text-sm'
            }`}>
              Link your eBay account to create live listings that reach millions of buyers. 
              This secure connection allows EasyFlip to publish listings directly to your eBay store.
            </p>
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className={`inline-flex items-center space-x-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 ${
                size === 'sm' ? 'px-4 py-2 text-sm' : size === 'lg' ? 'px-8 py-4 text-lg' : 'px-6 py-3'
              }`}
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Link2 className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
                  <span>Connect eBay Account</span>
                  <ArrowRight className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-yellow-800">
              eBay Account Required
            </h3>
            <p className="text-yellow-700 text-sm mt-1">
              Connect your eBay account to create and publish live listings.
            </p>
          </div>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="inline-flex items-center space-x-1 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                <span>Connect</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
    >
      {isConnecting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <Link2 className="w-4 h-4" />
          <span>Connect eBay</span>
        </>
      )}
    </button>
  );
};

export default EbayConnectionPrompt;