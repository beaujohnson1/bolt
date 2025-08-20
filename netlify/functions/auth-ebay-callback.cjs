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
          max-width: 500px;
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
          font-size: 11px;
          text-align: left;
          max-height: 200px;
          overflow-y: auto;
        }
        .success-check {
          font-size: 24px;
          margin: 10px 0;
        }
      </style>
    </head>
    <body>
      <div class="success-box">
        <h2>🎉 eBay Connected Successfully!</h2>
        <div class="spinner"></div>
        <p>Completing setup...</p>
        <p id="status">Storing authentication tokens...</p>
        <div class="success-check" id="success-check" style="display: none;">✅</div>
        <div id="debug" class="debug-info" style="display: none;"></div>
      </div>
      
      <script>
        (function() {
          console.log('🎉 [EBAY-CALLBACK] eBay OAuth success page loaded');

          const statusEl = document.getElementById('status');
          const debugEl = document.getElementById('debug');
          const successCheckEl = document.getElementById('success-check');
          const logs = [];

          function addLog(message) {
            const timestamp = new Date().toLocaleTimeString();
            logs.push(timestamp + ': ' + message);
            console.log('📝 [EBAY-CALLBACK] ' + message);
            debugEl.innerHTML = logs.join('<br>');
            debugEl.style.display = 'block';
          }

          function updateStatus(text) {
            statusEl.textContent = text;
            addLog('Status: ' + text);
          }

          try {
            const tokenData = ${tokenDataJson};
            
            addLog('Received token data successfully');
            addLog('Access token length: ' + (tokenData.access_token?.length || 0));
            addLog('Has refresh token: ' + !!tokenData.refresh_token);
            addLog('Token expires in: ' + tokenData.expires_in + ' seconds');
            
            updateStatus('Storing authentication tokens...');
            
            // Enhanced token storage with multiple attempts and validation
            let storageAttempts = 0;
            const maxAttempts = 3;
            let storageSuccess = false;
            
            while (storageAttempts < maxAttempts && !storageSuccess) {
              try {
                storageAttempts++;
                addLog(\`Storage attempt \${storageAttempts}/\${maxAttempts}\`);
                
                // Store tokens in multiple formats for compatibility
                localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokenData));
                localStorage.setItem('ebay_manual_token', tokenData.access_token);
                localStorage.setItem('ebay_app_token', tokenData.access_token);
                localStorage.setItem('ebay_app_token_expiry', tokenData.expires_at.toString());
                
                // Verify storage immediately
                const stored = localStorage.getItem('ebay_oauth_tokens');
                const storedManual = localStorage.getItem('ebay_manual_token');
                const storedApp = localStorage.getItem('ebay_app_token');
                
                if (!stored || !storedManual || !storedApp) {
                  throw new Error(\`Storage verification failed - oauth: \${!!stored}, manual: \${!!storedManual}, app: \${!!storedApp}\`);
                }
                
                // Parse and validate OAuth tokens
                const parsed = JSON.parse(stored);
                if (parsed.access_token !== tokenData.access_token) {
                  throw new Error('OAuth token validation failed - data mismatch');
                }
                
                // Validate manual token
                if (storedManual !== tokenData.access_token) {
                  throw new Error('Manual token validation failed - data mismatch');
                }
                
                storageSuccess = true;
                addLog('✅ All token storage formats validated successfully');
                
              } catch (storageError) {
                addLog(\`❌ Storage attempt \${storageAttempts} failed: \` + storageError.message);
                if (storageAttempts < maxAttempts) {
                  addLog('Retrying storage in 100ms...');
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
              }
            }
            
            if (!storageSuccess) {
              throw new Error(\`Failed to store tokens after \${maxAttempts} attempts\`);
            }

            updateStatus('Tokens stored successfully!');
            successCheckEl.style.display = 'block';

            // Enhanced popup detection with multiple fallback methods
            const hasOpener = window.opener && window.opener !== window;
            const hasPopupName = window.name === 'ebay-oauth';
            const isSmallWindow = window.outerWidth < 800 && window.outerHeight < 800;
            const hasPopupParam = new URLSearchParams(window.location.search).get('popup') === 'true';
            
            // Consider it a popup if ANY of these conditions are true
            const isPopup = hasOpener || hasPopupName || isSmallWindow || hasPopupParam;
            const isIframe = window.parent && window.parent !== window;
            
            addLog('Popup detection: opener=' + hasOpener + ', name=' + hasPopupName + ', small=' + isSmallWindow + ', param=' + hasPopupParam);
            addLog('Window context: popup=' + isPopup + ', iframe=' + isIframe);
            
            // CRITICAL: Write success beacon for parent polling
            try {
              const beacon = {
                success: true,
                tokens: tokenData,
                timestamp: Date.now(),
                windowName: window.name,
                hasOpener: hasOpener
              };
              localStorage.setItem('ebay_oauth_beacon', JSON.stringify(beacon));
              addLog('✅ Success beacon written to localStorage');
              
              // Also write to sessionStorage as backup
              sessionStorage.setItem('ebay_oauth_beacon', JSON.stringify(beacon));
              addLog('✅ Success beacon written to sessionStorage');
            } catch (e) {
              addLog('❌ Failed to write success beacon: ' + e.message);
            }

            if (isPopup) {
              updateStatus('Notifying main application...');
              addLog('Running in popup, implementing 5-method communication...');

              // Method 1: Enhanced PostMessage with multiple origins
              const trustedOrigins = [
                window.location.origin,
                'https://easyflip.ai',
                'https://localhost:5173',
                'http://localhost:5173',
                '${baseUrl}'
              ];

              const successMessage = {
                type: 'EBAY_OAUTH_SUCCESS',
                tokens: tokenData,
                timestamp: Date.now(),
                source: 'popup_callback',
                validation: 'authenticated'
              };

              trustedOrigins.forEach(origin => {
                try {
                  window.opener.postMessage(successMessage, origin);
                  addLog('PostMessage sent to origin: ' + origin);
                } catch (e) {
                  addLog('PostMessage failed for origin ' + origin + ': ' + e.message);
                }
              });

              // Method 2: BroadcastChannel for cross-tab communication
              try {
                const channel = new BroadcastChannel('ebay-auth');
                channel.postMessage({
                  type: 'EBAY_AUTH_SUCCESS',
                  tokens: tokenData,
                  timestamp: Date.now(),
                  source: 'popup_broadcast'
                });
                channel.close();
                addLog('✅ BroadcastChannel message sent');
              } catch (e) {
                addLog('❌ BroadcastChannel failed: ' + e.message);
              }

              // Method 3: Custom events on parent window
              try {
                const customEvents = [
                  'ebayAuthChanged',
                  'ebayTokenDetected', 
                  'oauthSuccess',
                  'ebayOAuthComplete'
                ];

                customEvents.forEach(eventType => {
                  try {
                    window.opener.dispatchEvent(new CustomEvent(eventType, {
                      detail: { 
                        authenticated: true, 
                        tokens: tokenData,
                        source: 'popup_custom_event',
                        timestamp: Date.now(),
                        eventType: eventType
                      }
                    }));
                    addLog('✅ CustomEvent ' + eventType + ' dispatched to parent');
                  } catch (e) {
                    addLog('❌ CustomEvent ' + eventType + ' failed: ' + e.message);
                  }
                });
              } catch (e) {
                addLog('❌ Custom events failed: ' + e.message);
              }

              // Method 4: Storage events (trigger by modifying a temp key)
              try {
                localStorage.setItem('ebay_auth_notification', JSON.stringify({
                  type: 'success',
                  timestamp: Date.now(),
                  tokens: tokenData
                }));
                // Remove immediately to trigger storage event
                setTimeout(() => {
                  localStorage.removeItem('ebay_auth_notification');
                }, 100);
                addLog('✅ Storage event trigger sent');
              } catch (e) {
                addLog('❌ Storage event failed: ' + e.message);
              }

              // Method 5: Direct window property (last resort)
              try {
                if (window.opener && typeof window.opener === 'object') {
                  window.opener.ebayAuthResult = {
                    success: true,
                    tokens: tokenData,
                    timestamp: Date.now()
                  };
                  addLog('✅ Direct window property set');
                }
              } catch (e) {
                addLog('❌ Direct window property failed: ' + e.message);
              }

              updateStatus('Success! Closing window...');
              addLog('All communication methods attempted');

              // Close popup after delay to allow message processing
              setTimeout(() => {
                addLog('🔚 Closing popup window');
                try {
                  window.close();
                } catch (e) {
                  addLog('❌ Window close failed: ' + e.message);
                  // Fallback: try to navigate parent to success page
                  if (window.opener) {
                    try {
                      window.opener.location.href = '${baseUrl}/app?ebay_connected=true&popup_closed=true';
                    } catch (navError) {
                      addLog('❌ Parent navigation failed: ' + navError.message);
                    }
                  }
                }
              }, 2000);

            } else if (isIframe) {
              updateStatus('Running in iframe, notifying parent...');
              addLog('Running in iframe context');

              // Send message to parent frame
              window.parent.postMessage({
                type: 'EBAY_OAUTH_SUCCESS',
                tokens: tokenData,
                timestamp: Date.now(),
                source: 'iframe_callback'
              }, '*');

              addLog('✅ Iframe message sent to parent');

            } else {
              updateStatus('Redirecting to application...');
              addLog('Running in same window, redirecting...');

              // ENHANCED: For same-window scenario, ensure tokens are stored and create additional indicators
              try {
                // Write additional success indicators for main window scenarios
                localStorage.setItem('ebay_oauth_main_window_success', JSON.stringify({
                  success: true,
                  tokens: tokenData,
                  timestamp: Date.now(),
                  source: 'main_window_callback'
                }));
                addLog('✅ Main window success indicator stored');
                
                // Also store in sessionStorage for cross-tab detection
                sessionStorage.setItem('ebay_oauth_main_window_success', JSON.stringify({
                  success: true,
                  timestamp: Date.now()
                }));
                addLog('✅ Session storage success indicator stored');
              } catch (e) {
                addLog('❌ Failed to store main window indicators: ' + e.message);
              }

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
                const redirectUrl = returnUrl + separator + 'ebay_connected=true&timestamp=' + Date.now() + '&main_window=true';
                addLog('Redirecting to: ' + redirectUrl);
                window.location.href = redirectUrl;
              }, 1500);
            }

          } catch (error) {
            console.error('❌ [EBAY-CALLBACK] Error in success page:', error);
            addLog('❌ CRITICAL ERROR: ' + error.message);
            updateStatus('Error: ' + error.message);
            successCheckEl.style.display = 'none';

            if (window.opener) {
              // Send error message to parent
              window.opener.postMessage({
                type: 'EBAY_OAUTH_ERROR',
                error: error.message,
                timestamp: Date.now(),
                source: 'popup_error'
              }, '*');

              setTimeout(() => window.close(), 5000);
            } else {
              // Redirect to app with error
              setTimeout(() => {
                window.location.href = '${baseUrl}/app?ebay_error=' + encodeURIComponent(error.message);
              }, 5000);
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