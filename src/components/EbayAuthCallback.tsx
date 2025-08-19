import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

/**
 * eBay OAuth Callback Component
 * Handles the callback from eBay OAuth flow when users are redirected back to the app
 * This component should rarely be used since the Netlify function handles the real callback,
 * but it's here for edge cases or manual redirects
 */
const EbayAuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log('🔄 [EBAY-AUTH-CALLBACK] Component mounted');
    
    // Check if this is a success callback
    const ebayConnected = searchParams.get('ebay_connected');
    const error = searchParams.get('ebay_error');
    
    if (ebayConnected === 'true') {
      console.log('✅ [EBAY-AUTH-CALLBACK] eBay connected successfully, redirecting to dashboard');
      navigate('/app?ebay_connected=true', { replace: true });
    } else if (error) {
      console.error('❌ [EBAY-AUTH-CALLBACK] OAuth error:', error);
      navigate(`/app?ebay_error=${error}`, { replace: true });
    } else {
      // No specific parameters, just redirect to dashboard
      console.log('🔄 [EBAY-AUTH-CALLBACK] No specific callback params, redirecting to dashboard');
      navigate('/app', { replace: true });
    }
  }, [navigate, searchParams]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        textAlign: 'center',
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2>🔄 Processing eBay Authentication</h2>
        <p>Please wait while we complete your eBay connection...</p>
        <div style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3498db',
          borderRadius: '50%',
          width: '30px',
          height: '30px',
          animation: 'spin 1s linear infinite',
          margin: '20px auto'
        }} />
        <style>
          {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
        </style>
      </div>
    </div>
  );
};

export default EbayAuthCallback;