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

    // Check if state is missing (happens with eBay Developer Console "Test sign-in")
    if (!state) {
      console.log('⚠️ [EBAY-CALLBACK] Missing state parameter - likely from eBay Developer Console test');
      console.log('📝 [EBAY-CALLBACK] Proceeding without state validation for test purposes');
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
        state: state || 'test-mode' // Use 'test-mode' when state is missing
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

    // Create HTML page that handles popup communication and token storage
    const tokenDataJson = JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      expires_at: Date.now() + (tokenData.expires_in * 1000),
      scope: tokenData.scope
    }).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
    
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
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          margin: 0;
        }
        .success-box {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          padding: 40px;
          max-width: 400px;
          margin: 0 auto;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-top: 4px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="success-box">
        <h2>🎉 eBay Connected Successfully!</h2>
        <div class="spinner"></div>
        <p>Completing setup...</p>
        <p id="status">Storing authentication tokens...</p>
      </div>
      
      <script>
        (function() {
          console.log('🎉 [EBAY-CALLBACK] eBay OAuth success page loaded');
          
          const statusEl = document.getElementById('status');
          
          try {
            const tokenData = ${tokenDataJson};
            
            console.log('💾 [EBAY-CALLBACK] Storing tokens in localStorage...');
            statusEl.textContent = 'Storing authentication tokens...';
            
            // Store tokens with enhanced validation
            localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokenData));
            localStorage.setItem('ebay_manual_token', tokenData.access_token);
            
            // Verify storage
            const stored = localStorage.getItem('ebay_oauth_tokens');
            if (!stored) {
              throw new Error('Failed to store tokens in localStorage');
            }
            
            console.log('✅ [EBAY-CALLBACK] Tokens stored successfully');
            statusEl.textContent = 'Authentication complete!';
            
            // Check if we're in a popup
            const isPopup = window.opener && window.opener !== window;
            
            if (isPopup) {
              console.log('📡 [EBAY-CALLBACK] Running in popup, notifying parent window...');
              statusEl.textContent = 'Notifying main application...';
              
              // Send success message to parent window
              window.opener.postMessage({
                type: 'EBAY_OAUTH_SUCCESS',
                tokens: tokenData,
                timestamp: Date.now()
              }, window.location.origin);
              
              // Also trigger storage event for parent window
              try {
                // Dispatch custom event on parent window
                window.opener.dispatchEvent(new CustomEvent('ebayAuthChanged', {
                  detail: { 
                    authenticated: true, 
                    tokens: tokenData,
                    source: 'popup_callback',
                    timestamp: Date.now()
                  }
                }));
              } catch (e) {
                console.warn('⚠️ [EBAY-CALLBACK] Could not dispatch event to parent:', e);
              }
              
              statusEl.textContent = 'Success! Closing window...';
              
              // Close popup after short delay
              setTimeout(() => {
                console.log('🔚 [EBAY-CALLBACK] Closing popup window');
                window.close();
              }, 1000);
              
            } else {
              console.log('🔄 [EBAY-CALLBACK] Running in main window, redirecting...');
              statusEl.textContent = 'Redirecting to application...';
              
              // Dispatch event for same-window scenario
              window.dispatchEvent(new CustomEvent('ebayAuthChanged', {
                detail: { 
                  authenticated: true, 
                  tokens: tokenData,
                  source: 'same_window_callback',
                  timestamp: Date.now()
                }
              }));
              
              // Redirect to dashboard with success flag
              setTimeout(() => {
                const returnUrl = localStorage.getItem('ebay_oauth_return_url') || '${baseUrl}/app';
                localStorage.removeItem('ebay_oauth_return_url');
                const separator = returnUrl.includes('?') ? '&' : '?';
                window.location.href = returnUrl + separator + 'ebay_connected=true&timestamp=' + Date.now();
              }, 1000);
            }
            
          } catch (error) {
            console.error('❌ [EBAY-CALLBACK] Error in success page:', error);
            statusEl.textContent = 'Error: ' + error.message;
            
            if (window.opener) {
              // Send error message to parent
              window.opener.postMessage({
                type: 'EBAY_OAUTH_ERROR',
                error: error.message,
                timestamp: Date.now()
              }, window.location.origin);
              
              setTimeout(() => window.close(), 3000);
            } else {
              // Redirect to app with error
              setTimeout(() => {
                window.location.href = '${baseUrl}/app?ebay_error=' + encodeURIComponent(error.message);
              }, 3000);
            }
          }
        })();
      </script>
    </body>
    </html>
    `;

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
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