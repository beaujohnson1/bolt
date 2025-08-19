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
      const errorUrl = `${process.env.URL || 'https://easyflip.ai'}/app?ebay_error=${encodeURIComponent(error_description || error)}`;
      
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
      const errorUrl = `${process.env.URL || 'https://easyflip.ai'}/app?ebay_error=missing_code`;
      
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
    const baseUrl = process.env.URL || 'https://easyflip.ai';
    
    // Use the SAME redirect_uri value that was used in authorization (RuName)
    const redirectUri = 'easyflip.ai-easyflip-easyfl-cnqajybp';
    
    const tokenResponse = await fetch(`${baseUrl}/.netlify/functions/ebay-oauth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'exchange-code',
        code: code,
        redirect_uri: redirectUri,
        state: state
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText, status: tokenResponse.status };
      }
      
      console.error('❌ [EBAY-CALLBACK] Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorData,
        rawError: errorText
      });
      
      // Create error page instead of redirect so user can see the issue
      const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>eBay Authentication Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f5f5f5; }
          .error-box { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 600px; margin: 0 auto; }
          .error-details { background: #f8f8f8; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: left; font-family: monospace; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="error-box">
          <h2>❌ eBay Token Exchange Failed</h2>
          <p>The OAuth authorization was successful, but the token exchange failed.</p>
          <div class="error-details">
            <strong>Status:</strong> ${tokenResponse.status} ${tokenResponse.statusText}<br>
            <strong>Error:</strong> ${JSON.stringify(errorData, null, 2)}<br>
            <strong>Code:</strong> ${code ? code.substring(0, 20) + '...' : 'missing'}
          </div>
          <p><a href="${baseUrl}/app">Return to EasyFlip</a></p>
          <script>
            console.error('🔍 [EBAY-CALLBACK] Token exchange debug info:', {
              status: ${tokenResponse.status},
              error: ${JSON.stringify(errorData)},
              code: '${code ? code.substring(0, 20) + '...' : 'missing'}'
            });
          </script>
        </div>
      </body>
      </html>`;
      
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Content-Type': 'text/html'
        },
        body: errorHtml
      };
    }

    const tokenData = await tokenResponse.json();
    console.log('✅ [EBAY-CALLBACK] Token exchange successful:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope
    });

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
            // Get stored return URL or default to app dashboard
            const returnUrl = localStorage.getItem('ebay_oauth_return_url') || '${baseUrl}/app';
            localStorage.removeItem('ebay_oauth_return_url'); // Clean up
            
            // Add success parameters to the return URL
            const separator = returnUrl.includes('?') ? '&' : '?';
            const finalUrl = returnUrl + separator + 'ebay_connected=true&timestamp=' + Date.now();
            
            console.log('🎯 [EBAY-CALLBACK] Redirecting to:', finalUrl);
            
            // Force immediate redirect to prevent staying on function URL
            window.location.replace(finalUrl);
          }, 300); // Reduced delay for faster redirect
          
        } catch (error) {
          console.error('❌ [EBAY-CALLBACK] Error storing tokens:', error);
          alert('Failed to store authentication tokens. Please try again.');
          window.location.replace('${baseUrl}/app?ebay_error=token_storage_failed');
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
        <p><a href="${baseUrl}/app?ebay_connected=true">Click here if you're not redirected automatically</a></p>
        <noscript>
          <meta http-equiv="refresh" content="2;url=${baseUrl}/app?ebay_connected=true">
          <p>JavaScript is disabled. You will be redirected automatically, or <a href="${baseUrl}/app?ebay_connected=true">click here</a>.</p>
        </noscript>
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
    
    const baseUrl = process.env.URL || 'https://easyflip.ai';
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