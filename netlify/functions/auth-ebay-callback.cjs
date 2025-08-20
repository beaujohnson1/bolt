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

    // Create HTML page that stores tokens and immediately redirects
    const tokenDataJson = JSON.stringify(tokenData).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>eBay Authentication Success</title>
      <meta http-equiv="refresh" content="0;url=${baseUrl}/app?ebay_connected=true&timestamp=${Date.now()}">
      <script>
        (function() {
          console.log('🎉 [EBAY-CALLBACK] Storing eBay OAuth tokens...');
          
          try {
            const tokenData = ${tokenDataJson};
            
            // Calculate expiry timestamp if not present
            if (tokenData.expires_in && !tokenData.expires_at) {
              tokenData.expires_at = Date.now() + (tokenData.expires_in * 1000);
            }
            
            // Store tokens immediately
            localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokenData));
            localStorage.setItem('ebay_manual_token', tokenData.access_token);
            
            console.log('✅ [EBAY-CALLBACK] Tokens stored successfully');
            
            // Dispatch events for cross-tab communication
            window.dispatchEvent(new CustomEvent('ebayAuthChanged', {
              detail: { authenticated: true, tokens: tokenData }
            }));
            
            // Enhanced redirect with robust error handling and fallbacks
            function performRedirect() {
              try {
                // Get and clean up return URL
                const returnUrl = localStorage.getItem('ebay_oauth_return_url') || '${baseUrl}/app';
                localStorage.removeItem('ebay_oauth_return_url');
                
                // Validate and construct final URL
                const baseUrl = returnUrl.startsWith('http') ? returnUrl : '${baseUrl}/app';
                const separator = baseUrl.includes('?') ? '&' : '?';
                const finalUrl = baseUrl + separator + 'ebay_connected=true&timestamp=' + Date.now();
                
                console.log('🔄 [EBAY-CALLBACK] Redirecting to:', finalUrl);
                
                // Try multiple redirect methods for maximum compatibility
                let redirected = false;
                
                // Method 1: window.location.replace() - Most reliable
                if (window.location && typeof window.location.replace === 'function') {
                  try {
                    window.location.replace(finalUrl);
                    redirected = true;
                  } catch (e) {
                    console.warn('⚠️ location.replace failed:', e.message);
                  }
                }
                
                // Method 2: Fallback to href assignment
                if (!redirected && window.location) {
                  try {
                    window.location.href = finalUrl;
                    redirected = true;
                  } catch (e) {
                    console.warn('⚠️ location.href failed:', e.message);
                  }
                }
                
                // Method 3: Top window redirect (for iframe contexts)
                if (!redirected && window.top && window.top !== window) {
                  try {
                    window.top.location.href = finalUrl;
                    redirected = true;
                  } catch (e) {
                    console.warn('⚠️ top.location failed:', e.message);
                  }
                }
                
                // Method 4: Parent window redirect (for nested contexts)
                if (!redirected && window.parent && window.parent !== window) {
                  try {
                    window.parent.location.href = finalUrl;
                    redirected = true;
                  } catch (e) {
                    console.warn('⚠️ parent.location failed:', e.message);
                  }
                }
                
                if (!redirected) {
                  throw new Error('All redirect methods failed');
                }
                
              } catch (error) {
                console.error('❌ [EBAY-CALLBACK] Redirect failed:', error);
                
                // Show manual redirect as last resort
                const manualRedirectHtml = \`
                  <div style="background: #28a745; color: white; padding: 20px; border-radius: 8px; text-align: center;">
                    <h2>🎉 eBay Connected Successfully!</h2>
                    <p>Automatic redirect failed. Please click below to continue:</p>
                    <a href="${baseUrl}/app?ebay_connected=true&manual=true" 
                       style="display: inline-block; background: white; color: #28a745; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">
                      Continue to EasyFlip
                    </a>
                  </div>
                \`;
                
                if (document.body) {
                  document.body.innerHTML = manualRedirectHtml;
                }
              }
            }
            
            // Verify storage completed before redirect
            const verifyAndRedirect = () => {
              const tokens = localStorage.getItem('ebay_oauth_tokens');
              const manualToken = localStorage.getItem('ebay_manual_token');
              
              if (tokens && manualToken && JSON.parse(tokens).access_token === tokenData.access_token) {
                console.log('✅ [EBAY-CALLBACK] Storage verified, proceeding with redirect');
                performRedirect();
              } else {
                console.log('⚠️ [EBAY-CALLBACK] Storage verification failed, retrying...');
                setTimeout(verifyAndRedirect, 100); // Quick retry
              }
            };
            
            // Start verification process with small delay
            setTimeout(verifyAndRedirect, 50);
            
          } catch (error) {
            console.error('❌ [EBAY-CALLBACK] Error storing tokens:', error);
            window.location.replace('${baseUrl}/app?ebay_error=token_storage_failed');
          }
        })();
      </script>
    </head>
    <body>
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h2>🎉 eBay Connected!</h2>
        <p>Redirecting you back to EasyFlip...</p>
        <p><a href="${baseUrl}/app?ebay_connected=true">Click here if you're not redirected</a></p>
      </div>
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