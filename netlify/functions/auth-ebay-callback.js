// eBay OAuth Callback Handler
// Handles the redirect from eBay OAuth and exchanges code for token

const { config } = require('./_shared/config.cjs');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🔄 [EBAY-CALLBACK] OAuth callback received:', {
      method: event.httpMethod,
      queryParams: event.queryStringParameters,
      path: event.path
    });

    const { code, state, error, error_description } = event.queryStringParameters || {};

    // Check for OAuth errors from eBay
    if (error) {
      console.error('❌ [EBAY-CALLBACK] OAuth error from eBay:', { error, error_description });
      
      // Redirect to frontend with error
      const errorUrl = `${process.env.URL || 'http://localhost:61792'}/app?ebay_error=${encodeURIComponent(error_description || error)}`;
      
      return {
        statusCode: 302,
        headers: {
          ...headers,
          'Location': errorUrl
        },
        body: ''
      };
    }

    // Validate required parameters
    if (!code) {
      console.error('❌ [EBAY-CALLBACK] Missing authorization code');
      const errorUrl = `${process.env.URL || 'http://localhost:61792'}/app?ebay_error=missing_code`;
      
      return {
        statusCode: 302,
        headers: {
          ...headers,
          'Location': errorUrl
        },
        body: ''
      };
    }

    console.log('✅ [EBAY-CALLBACK] Valid authorization code received, exchanging for token...');

    // Exchange code for access token using the existing OAuth function
    const baseUrl = process.env.URL || 'http://localhost:61792';
    
    // Ensure consistent redirect_uri for token exchange
    const callbackUrl = `${baseUrl}/.netlify/functions/auth-ebay-callback`;
    
    const tokenResponse = await fetch(`${baseUrl}/.netlify/functions/ebay-oauth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'exchange-code',
        code: code,
        redirect_uri: callbackUrl,
        state: state
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('❌ [EBAY-CALLBACK] Token exchange failed:', errorData);
      
      const errorUrl = `${baseUrl}/app?ebay_error=${encodeURIComponent(errorData.message || 'token_exchange_failed')}`;
      
      return {
        statusCode: 302,
        headers: {
          ...headers,
          'Location': errorUrl
        },
        body: ''
      };
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ [EBAY-CALLBACK] Token exchange successful');

    // Create a simple HTML page that stores the token and redirects
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>eBay Authentication Success</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px; 
          background-color: #f5f5f5; 
        }
        .success-box { 
          background: white; 
          padding: 30px; 
          border-radius: 10px; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
          max-width: 500px; 
          margin: 0 auto; 
        }
        .spinner { 
          border: 4px solid #f3f3f3; 
          border-top: 4px solid #3498db; 
          border-radius: 50%; 
          width: 30px; 
          height: 30px; 
          animation: spin 1s linear infinite; 
          margin: 20px auto; 
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
      <script>
        console.log('🎉 [EBAY-CALLBACK] Storing eBay OAuth tokens...');
        
        // Store the tokens in localStorage immediately
        const tokenData = ${JSON.stringify(tokenData)};
        
        try {
          // Calculate expiry timestamp if not present
          if (tokenData.expires_in && !tokenData.expires_at) {
            tokenData.expires_at = Date.now() + (tokenData.expires_in * 1000);
          }
          
          // Store in multiple locations for compatibility
          localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokenData));
          localStorage.setItem('ebay_manual_token', tokenData.access_token);
          
          console.log('✅ [EBAY-CALLBACK] Tokens stored successfully');
          console.log('📊 [EBAY-CALLBACK] Token data:', {
            hasAccessToken: !!tokenData.access_token,
            hasRefreshToken: !!tokenData.refresh_token,
            expiresAt: tokenData.expires_at,
            tokenType: tokenData.token_type
          });
          
          // Dispatch custom event to notify other windows/tabs
          window.dispatchEvent(new CustomEvent('ebayAuthChanged', {
            detail: { authenticated: true, tokens: tokenData }
          }));
          
          // Also trigger storage event manually for cross-tab communication
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'ebay_oauth_tokens',
            newValue: JSON.stringify(tokenData),
            storageArea: localStorage
          }));
          
          console.log('🔄 [EBAY-CALLBACK] Redirecting to app...');
          
          // Add a small delay to ensure localStorage operations complete
          setTimeout(() => {
            // Get stored return URL or default to app
            const returnUrl = localStorage.getItem('ebay_oauth_return_url') || '${baseUrl}/app';
            localStorage.removeItem('ebay_oauth_return_url'); // Clean up
            
            // Add success parameters to the return URL
            const separator = returnUrl.includes('?') ? '&' : '?';
            const finalUrl = returnUrl + separator + 'ebay_connected=true&timestamp=' + Date.now();
            
            console.log('🎯 [EBAY-CALLBACK] Redirecting to:', finalUrl);
            window.location.href = finalUrl;
          }, 500); // 500ms delay to ensure storage operations complete
          
        } catch (error) {
          console.error('❌ [EBAY-CALLBACK] Error storing tokens:', error);
          alert('Failed to store authentication tokens. Please try again.');
          window.location.href = '${baseUrl}/app?ebay_error=token_storage_failed';
        }
      </script>
    </head>
    <body>
      <div class="success-box">
        <h2>🎉 eBay Connected Successfully!</h2>
        <p>Your eBay account has been linked to EasyFlip.</p>
        <p>You can now create live eBay listings!</p>
        <div class="spinner"></div>
        <p>Redirecting you back to the app...</p>
        <p><a href="${baseUrl}/app">Click here if you're not redirected automatically</a></p>
      </div>
    </body>
    </html>
    `;

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/html'
      },
      body: html
    };

  } catch (error) {
    console.error('❌ [EBAY-CALLBACK] Callback processing error:', error);
    
    const baseUrl = process.env.URL || 'http://localhost:61792';
    const errorUrl = `${baseUrl}/app?ebay_error=${encodeURIComponent(error.message)}`;
    
    return {
      statusCode: 302,
      headers: {
        ...headers,
        'Location': errorUrl
      },
      body: ''
    };
  }
};