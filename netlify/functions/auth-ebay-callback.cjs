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
    
    // Use the SAME redirect_uri value that was used in authorization (callback URL)
    const redirectUri = `${baseUrl}/.netlify/functions/auth-ebay-callback`;
    
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
        .debug-info {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          font-family: monospace;
          font-size: 12px;
          text-align: left;
        }
      </style>
    </head>
    <body>
      <div class="success-box">
        <h2>🎉 eBay Connected Successfully!</h2>
        <div class="spinner"></div>
        <p>Completing setup...</p>
        <p id="status">Storing authentication tokens...</p>
        <div id="debug" class="debug-info" style="display: none;"></div>
      </div>
      
      <script>
        (function() {
          console.log('🎉 [EBAY-CALLBACK] eBay OAuth success page loaded');
          
          const statusEl = document.getElementById('status');
          const debugEl = document.getElementById('debug');
          const logs = [];
          
          function addLog(message) {
            logs.push(new Date().toLocaleTimeString() + ': ' + message);
            console.log('📝 [EBAY-CALLBACK] ' + message);
            debugEl.innerHTML = logs.join('<br>');
            debugEl.style.display = 'block';
          }
          
          try {
            const tokenData = ${tokenDataJson};
            
            addLog('Received token data successfully');
            addLog('Access token length: ' + (tokenData.access_token?.length || 0));
            addLog('Has refresh token: ' + !!tokenData.refresh_token);
            
            statusEl.textContent = 'Storing authentication tokens...';
            
            // Store tokens with enhanced validation and multiple attempts
            let storageAttempts = 0;
            const maxAttempts = 3;
            let storageSuccess = false;
            
            while (storageAttempts < maxAttempts && !storageSuccess) {
              try {
                storageAttempts++;
                addLog(\`Storage attempt \${storageAttempts}/\${maxAttempts}\`);
                
                localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokenData));
                localStorage.setItem('ebay_manual_token', tokenData.access_token);
                
                // Verify storage immediately
                const stored = localStorage.getItem('ebay_oauth_tokens');
                const storedManual = localStorage.getItem('ebay_manual_token');
                
                if (!stored || !storedManual) {
                  throw new Error(\`Storage verification failed - stored: \${!!stored}, manual: \${!!storedManual}\`);
                }
                
                // Parse and validate
                const parsed = JSON.parse(stored);
                if (parsed.access_token !== tokenData.access_token) {
                  throw new Error('Token storage validation failed - data mismatch');
                }
                
                addLog('Tokens stored and verified successfully');
                storageSuccess = true;
                
              } catch (storageError) {
                addLog(\`Storage attempt \${storageAttempts} failed: \${storageError.message}\`);
                if (storageAttempts >= maxAttempts) {
                  throw new Error(\`Token storage failed after \${maxAttempts} attempts: \${storageError.message}\`);
                }
                // Wait a bit before retry
                await new Promise(resolve => setTimeout(resolve, 100));
              }
            }
            
            statusEl.textContent = 'Authentication complete!';
            
            // Check if we're in a popup
            const isPopup = window.opener && window.opener !== window;
            addLog(\`Running in popup: \${isPopup}\`);
            
            if (isPopup) {
              statusEl.textContent = 'Notifying main application...';
              addLog('Starting parent window communication...');
              
              // Multiple communication methods for maximum reliability
              const communicationMethods = [];
              
              // Method 1: PostMessage with different target origins
              const origins = ['*', window.location.origin, 'https://easyflip.ai', 'https://main--easyflip.netlify.app'];
              for (const origin of origins) {
                try {
                  addLog(\`Sending postMessage to origin: \${origin}\`);
                  window.opener.postMessage({
                    type: 'EBAY_OAUTH_SUCCESS',
                    tokens: tokenData,
                    timestamp: Date.now(),
                    source: 'callback_page',
                    messageId: Math.random().toString(36).substring(7)
                  }, origin);
                  communicationMethods.push(\`postMessage(\${origin})\`);
                  addLog(\`PostMessage sent to \${origin} successfully\`);
                } catch (e) {
                  addLog(\`PostMessage to \${origin} failed: \${e.message}\`);
                }
              }
              
              // Method 1.5: BroadcastChannel (high priority)
              try {
                if (typeof BroadcastChannel !== 'undefined') {
                  addLog('Sending via BroadcastChannel...');
                  const channel = new BroadcastChannel('ebay-oauth-popup');
                  channel.postMessage({
                    type: 'EBAY_OAUTH_SUCCESS',
                    tokens: tokenData,
                    timestamp: Date.now(),
                    source: 'callback_broadcast'
                  });
                  channel.close();
                  communicationMethods.push('broadcastChannel');
                  addLog('BroadcastChannel message sent successfully');
                }
              } catch (e) {
                addLog(\`BroadcastChannel failed: \${e.message}\`);
              }
              
              // Method 2: Direct parent window storage (if same-origin)
              try {
                if (window.opener.localStorage) {
                  addLog('Setting tokens in parent localStorage...');
                  window.opener.localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokenData));
                  window.opener.localStorage.setItem('ebay_manual_token', tokenData.access_token);
                  communicationMethods.push('directStorage');
                  addLog('Parent storage updated successfully');
                }
              } catch (e) {
                addLog(\`Could not access parent localStorage: \${e.message}\`);
              }
              
              // Method 3: Custom event dispatch (if same-origin)
              try {
                if (window.opener.dispatchEvent) {
                  addLog('Dispatching custom event to parent...');
                  window.opener.dispatchEvent(new CustomEvent('ebayAuthChanged', {
                    detail: { 
                      authenticated: true, 
                      tokens: tokenData,
                      source: 'popup_callback',
                      timestamp: Date.now()
                    }
                  }));
                  communicationMethods.push('customEvent');
                  addLog('Custom event dispatched successfully');
                }
              } catch (e) {
                addLog(\`Could not dispatch event to parent: \${e.message}\`);
              }
              
              // Method 4: Storage event simulation
              try {
                if (window.opener.dispatchEvent) {
                  addLog('Simulating storage event in parent...');
                  window.opener.dispatchEvent(new StorageEvent('storage', {
                    key: 'ebay_oauth_tokens',
                    newValue: JSON.stringify(tokenData),
                    oldValue: null,
                    storageArea: window.opener.localStorage,
                    url: window.opener.location.href
                  }));
                  communicationMethods.push('storageEvent');
                  addLog('Storage event simulated successfully');
                }
              } catch (e) {
                addLog(\`Could not simulate storage event: \${e.message}\`);
              }
              
              addLog(\`Communication methods used: \${communicationMethods.join(', ')}\`);
              statusEl.textContent = \`Success! Used \${communicationMethods.length} communication methods. Closing window...\`;
              
              // Close popup after delay to allow communication
              setTimeout(() => {
                addLog('Closing popup window after communication attempts');
                window.close();
              }, 3000); // Longer delay to ensure communication
              
            } else {
              addLog('Running in main window, preparing redirect...');
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
              
              // Force a storage event for cross-component communication
              window.dispatchEvent(new StorageEvent('storage', {
                key: 'ebay_oauth_tokens',
                newValue: JSON.stringify(tokenData),
                oldValue: null,
                storageArea: localStorage,
                url: window.location.href
              }));
              
              // Redirect to dashboard with success flag and tokens
              setTimeout(() => {
                const returnUrl = localStorage.getItem('ebay_oauth_return_url') || '${baseUrl}/app';
                localStorage.removeItem('ebay_oauth_return_url');
                const tokenParam = encodeURIComponent(JSON.stringify({
                  access_token: tokenData.access_token,
                  timestamp: Date.now()
                }));
                const separator = returnUrl.includes('?') ? '&' : '?';
                window.location.href = returnUrl + separator + 'ebay_connected=true&tokens=' + tokenParam + '&timestamp=' + Date.now();
              }, 1000);
            }
            
          } catch (error) {
            console.error('❌ [EBAY-CALLBACK] Error in success page:', error);
            addLog(\`ERROR: \${error.message}\`);
            statusEl.textContent = 'Error: ' + error.message;
            
            if (window.opener) {
              // Send error message to parent
              try {
                window.opener.postMessage({
                  type: 'EBAY_OAUTH_ERROR',
                  error: error.message,
                  timestamp: Date.now()
                }, '*');
                addLog('Error message sent to parent');
              } catch (e) {
                addLog(\`Could not send error to parent: \${e.message}\`);
              }
              
              setTimeout(() => window.close(), 5000);
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