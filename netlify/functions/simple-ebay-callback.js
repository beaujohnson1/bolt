/**
 * Simple eBay OAuth Callback Handler for the ebay-api library
 */

const eBayApi = require('ebay-api');

exports.handler = async (event, context) => {
    // CORS headers for all responses
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    console.log('🔄 Simple eBay OAuth Callback Handler');
    console.log('Query Parameters:', event.queryStringParameters);

    try {
        const { code, state, error, error_description } = event.queryStringParameters || {};

        // Handle OAuth errors from eBay
        if (error) {
            console.error('❌ OAuth Error from eBay:', error, error_description);
            
            const errorPageHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>eBay Authentication Error</title>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
                        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
                        .error { color: #e74c3c; margin: 20px 0; }
                        .btn { display: inline-block; padding: 12px 24px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; margin: 10px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>❌ eBay Authentication Error</h1>
                        <div class="error">
                            <strong>Error:</strong> ${error}<br>
                            ${error_description ? `<strong>Description:</strong> ${error_description}` : ''}
                        </div>
                        <p>There was an issue connecting your eBay account.</p>
                        <a href="#" onclick="window.close()" class="btn">Close Window</a>
                    </div>
                    <script>
                        if (window.opener) {
                            setTimeout(() => window.close(), 3000);
                        }
                    </script>
                </body>
                </html>
            `;
            
            return {
                statusCode: 200,
                headers: { ...headers, 'Content-Type': 'text/html' },
                body: errorPageHtml
            };
        }

        // Handle successful OAuth callback
        if (code) {
            console.log(`✅ OAuth Success - Code: ${code.substring(0, 50)}...`);
            
            const successPageHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>eBay Authentication Success</title>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
                        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
                        .success { color: #27ae60; margin: 20px 0; }
                        .loading { color: #3498db; margin: 20px 0; }
                        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>✅ eBay Authentication Successful!</h1>
                        <div class="success">
                            <p><strong>Authorization received successfully!</strong></p>
                        </div>
                        <div class="loading">
                            <div class="spinner"></div>
                            <p>Processing your tokens...</p>
                        </div>
                        <div id="status"></div>
                    </div>

                    <script>
                        // Get the authorization code from URL
                        const urlParams = new URLSearchParams(window.location.search);
                        const code = urlParams.get('code');
                        const state = urlParams.get('state');
                        
                        console.log('📋 URL Parameters:', { 
                            hasCode: !!code, 
                            hasState: !!state,
                            codePreview: code ? code.substring(0, 30) + '...' : 'none'
                        });
                        
                        // Automatically exchange code for tokens
                        async function exchangeTokens() {
                            try {
                                console.log('🔄 Exchanging authorization code for tokens...');
                                
                                if (!code) {
                                    throw new Error('No authorization code found in URL');
                                }
                                
                                console.log('🔧 About to exchange code:', code.substring(0, 30) + '...');
                                
                                const baseUrl = window.location.origin;
                                const response = await fetch(`${baseUrl}/.netlify/functions/simple-ebay-oauth`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        action: 'exchange-code',
                                        code: code
                                    })
                                });
                                
                                const data = await response.json();
                                console.log('🔧 Token exchange response:', {
                                    status: response.status,
                                    success: data.success,
                                    hasAccessToken: !!data.access_token,
                                    error: data.error,
                                    details: data.details
                                });
                                
                                if (data.success && data.access_token) {
                                    // Ensure scope is properly formatted with all required scopes
                                    const scopeString = data.scope || 'https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/commerce.identity.readonly';
                                    
                                    const tokenData = {
                                        access_token: data.access_token,
                                        refresh_token: data.refresh_token,
                                        expires_in: data.expires_in,
                                        expires_at: Date.now() + (data.expires_in * 1000),
                                        token_type: data.token_type || 'Bearer',
                                        scope: scopeString  // Ensure scope is included in token data
                                    };
                                    
                                    // ALWAYS store in current window first (works even if popup is blocked)
                                    localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokenData));
                                    localStorage.setItem('oauth_tokens', JSON.stringify(tokenData));
                                    localStorage.setItem('ebay_manual_token', data.access_token);
                                    localStorage.setItem('ebay_access_token', data.access_token);
                                    localStorage.setItem('easyflip_ebay_access_token', data.access_token);
                                    localStorage.setItem('ebay_refresh_token', data.refresh_token);
                                    localStorage.setItem('easyflip_ebay_refresh_token', data.refresh_token);
                                    localStorage.setItem('ebay_token_expiry', String(tokenData.expires_at));
                                    localStorage.setItem('easyflip_ebay_token_expiry', String(tokenData.expires_at));
                                    localStorage.setItem('easyflip_ebay_token_scope', scopeString);
                                    console.log('✅ Tokens stored successfully in current window');
                                    
                                    // Also try to store in parent window if available
                                    if (window.opener && window.opener.localStorage) {
                                        try {
                                            // Store in ALL formats for maximum compatibility
                                            window.opener.localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokenData));
                                            window.opener.localStorage.setItem('oauth_tokens', JSON.stringify(tokenData));
                                            window.opener.localStorage.setItem('ebay_manual_token', data.access_token);
                                            window.opener.localStorage.setItem('ebay_access_token', data.access_token);
                                            window.opener.localStorage.setItem('easyflip_ebay_access_token', data.access_token);
                                            window.opener.localStorage.setItem('ebay_refresh_token', data.refresh_token);
                                            window.opener.localStorage.setItem('easyflip_ebay_refresh_token', data.refresh_token);
                                            window.opener.localStorage.setItem('ebay_token_expiry', String(tokenData.expires_at));
                                            window.opener.localStorage.setItem('easyflip_ebay_token_expiry', String(tokenData.expires_at));
                                            window.opener.localStorage.setItem('easyflip_ebay_token_scope', scopeString);
                                        
                                            console.log('✅ Tokens also stored in parent window');
                                        } catch (e) {
                                            console.log('⚠️ Could not access parent window, but tokens are saved in popup');
                                        }
                                        
                                        // Multiple communication methods to ensure parent window gets notified
                                        try {
                                            // Method 1: Custom event
                                            if (window.opener.dispatchEvent) {
                                                window.opener.dispatchEvent(new CustomEvent('simpleEbayAuthSuccess', { 
                                                    detail: {
                                                        access_token: data.access_token,
                                                        refresh_token: data.refresh_token,
                                                        expires_in: data.expires_in,
                                                        token_type: data.token_type,
                                                        scope: data.scope || ''
                                                    }
                                                }));
                                                console.log('✅ Custom event dispatched to parent window');
                                            }
                                            
                                            // Method 2: Direct postMessage
                                            window.opener.postMessage({
                                                type: 'EBAY_OAUTH_SUCCESS',
                                                timestamp: Date.now(),
                                                tokens: {
                                                    access_token: data.access_token,
                                                    refresh_token: data.refresh_token,
                                                    expires_in: data.expires_in,
                                                    expires_at: Date.now() + (data.expires_in * 1000),
                                                    token_type: data.token_type || 'Bearer',
                                                    scope: data.scope || ''
                                                }
                                            }, '*');
                                            console.log('✅ PostMessage sent to parent window');
                                            
                                            // Method 3: Force parent window location refresh to trigger auth check
                                            setTimeout(() => {
                                                try {
                                                    if (window.opener && !window.opener.closed) {
                                                        window.opener.location.reload();
                                                        console.log('✅ Parent window refreshed');
                                                    }
                                                } catch (error) {
                                                    console.log('⚠️ Could not refresh parent window:', error.message);
                                                }
                                            }, 1000);
                                            
                                        } catch (error) {
                                            console.error('❌ Error communicating with parent window:', error);
                                        }
                                    } else {
                                        // Fallback: store in current window using ALL compatible formats
                                        // Ensure scope is properly formatted with all required scopes
                                        const scopeString = data.scope || 'https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/commerce.identity.readonly';
                                        
                                        const tokenData = {
                                            access_token: data.access_token,
                                            refresh_token: data.refresh_token,
                                            expires_in: data.expires_in,
                                            expires_at: Date.now() + (data.expires_in * 1000),
                                            token_type: data.token_type || 'Bearer',
                                            scope: scopeString  // Ensure scope is included in token data
                                        };
                                        
                                        // Store in ALL formats for maximum compatibility
                                        localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokenData));
                                        localStorage.setItem('oauth_tokens', JSON.stringify(tokenData));
                                        localStorage.setItem('ebay_manual_token', data.access_token);
                                        localStorage.setItem('ebay_access_token', data.access_token);
                                        localStorage.setItem('ebay_refresh_token', data.refresh_token);
                                        localStorage.setItem('ebay_token_expiry', String(tokenData.expires_at));
                                        localStorage.setItem('easyflip_ebay_token_scope', scopeString);
                                        
                                        console.log('✅ Tokens stored in callback window localStorage');
                                    }
                                    
                                    document.getElementById('status').innerHTML = 
                                        '<div style="color: #27ae60;"><strong>✅ Tokens stored successfully!</strong><br>You can close this window.</div>';
                                    
                                    // Auto-close popup after 2 seconds
                                    setTimeout(() => {
                                        if (window.opener) {
                                            window.close();
                                        }
                                    }, 2000);
                                    
                                } else {
                                    // Enhanced error handling for different failure types
                                    let errorMessage = data.error || 'Token exchange failed';
                                    let userMessage = errorMessage;
                                    
                                    if (data.details && data.details.errorMessage) {
                                        console.error('🔧 eBay API Error Details:', data.details);
                                        
                                        // Handle specific eBay API errors
                                        if (data.details.errorMessage.includes('400')) {
                                            userMessage = 'Authorization code has expired or been used. Please try authenticating again.';
                                        } else if (data.details.errorMessage.includes('invalid_grant')) {
                                            userMessage = 'Invalid authorization code. Please restart the authentication process.';
                                        } else if (data.details.errorMessage.includes('expired')) {
                                            userMessage = 'Authorization code has expired. Please try again.';
                                        }
                                    }
                                    
                                    throw new Error(userMessage);
                                }
                                
                            } catch (error) {
                                console.error('❌ Token exchange error:', error);
                                
                                // Show user-friendly error with retry option
                                document.getElementById('status').innerHTML = 
                                    '<div style="color: #e74c3c;"><strong>❌ Token exchange failed:</strong><br>' + 
                                    error.message + 
                                    '<br><br><button onclick="exchangeTokens()" style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 5px;">Retry</button>' +
                                    '<button onclick="window.close()" style="padding: 8px 16px; background: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 5px;">Close</button>' +
                                    '</div>';
                                
                                // Still try to communicate failure to parent window
                                if (window.opener && window.opener.postMessage) {
                                    try {
                                        window.opener.postMessage({
                                            type: 'EBAY_OAUTH_ERROR',
                                            timestamp: Date.now(),
                                            error: error.message
                                        }, '*');
                                        console.log('📨 Error message sent to parent window');
                                    } catch (commError) {
                                        console.error('❌ Could not communicate error to parent:', commError);
                                    }
                                }
                            }
                        }

                        // Start token exchange immediately
                        window.addEventListener('load', () => {
                            setTimeout(exchangeTokens, 1000);
                        });
                    </script>
                </body>
                </html>
            `;
            
            return {
                statusCode: 200,
                headers: { ...headers, 'Content-Type': 'text/html' },
                body: successPageHtml
            };
        }

        // Handle missing parameters
        console.log('❌ Missing required OAuth parameters');
        
        const invalidPageHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invalid OAuth Callback</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
                    .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
                    .warning { color: #f39c12; margin: 20px 0; }
                    .btn { display: inline-block; padding: 12px 24px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; margin: 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>⚠️ Invalid OAuth Callback</h1>
                    <div class="warning">
                        <p>This URL is missing required OAuth parameters.</p>
                        <p>Please start the authentication process from the app.</p>
                    </div>
                    <a href="#" onclick="window.close()" class="btn">Close Window</a>
                </div>
            </body>
            </html>
        `;
        
        return {
            statusCode: 400,
            headers: { ...headers, 'Content-Type': 'text/html' },
            body: invalidPageHtml
        };

    } catch (error) {
        console.error('❌ Callback Handler Error:', error);
        
        const errorPageHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>OAuth Error</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #f5f5f5; }
                    .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
                    .error { color: #e74c3c; margin: 20px 0; }
                    .btn { display: inline-block; padding: 12px 24px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; margin: 10px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>❌ OAuth Processing Error</h1>
                    <div class="error">
                        <p>There was an error processing your eBay authentication.</p>
                        <p><strong>Error:</strong> ${error.message}</p>
                    </div>
                    <a href="#" onclick="window.close()" class="btn">Close Window</a>
                </div>
            </body>
            </html>
        `;
        
        return {
            statusCode: 500,
            headers: { ...headers, 'Content-Type': 'text/html' },
            body: errorPageHtml
        };
    }
};