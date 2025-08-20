/**
 * Modern eBay OAuth Callback Handler
 * Uses current 2025 endpoints and official client library
 * Prevents crashes and provides reliable token storage
 */

exports.handler = async (event, context) => {
    // CORS headers for all responses
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    console.log('🔄 Modern OAuth Callback Handler');
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
                        body { 
                            font-family: Arial, sans-serif; 
                            max-width: 600px; 
                            margin: 50px auto; 
                            padding: 20px;
                            background: #f5f5f5;
                        }
                        .container {
                            background: white;
                            padding: 30px;
                            border-radius: 10px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            text-align: center;
                        }
                        .error { color: #e74c3c; margin: 20px 0; }
                        .btn {
                            display: inline-block;
                            padding: 12px 24px;
                            background: #3498db;
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                            margin: 10px;
                        }
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
                        <a href="https://easyflip.ai/app" class="btn">Return to App</a>
                        <a href="#" onclick="window.close()" class="btn">Close Window</a>
                    </div>
                    <script>
                        // Close popup if this is a popup window
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
        if (code && state) {
            console.log(`✅ OAuth Success - Code: ${code.substring(0, 50)}..., State: ${state}`);
            
            const successPageHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>eBay Authentication Success</title>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            max-width: 600px; 
                            margin: 50px auto; 
                            padding: 20px;
                            background: #f5f5f5;
                        }
                        .container {
                            background: white;
                            padding: 30px;
                            border-radius: 10px;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            text-align: center;
                        }
                        .success { color: #27ae60; margin: 20px 0; }
                        .loading { color: #3498db; margin: 20px 0; }
                        .btn {
                            display: inline-block;
                            padding: 12px 24px;
                            background: #27ae60;
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                            margin: 10px;
                        }
                        .spinner {
                            border: 4px solid #f3f3f3;
                            border-top: 4px solid #3498db;
                            border-radius: 50%;
                            width: 40px;
                            height: 40px;
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
                        <div id="actions" style="display: none;">
                            <a href="https://easyflip.ai/app" class="btn">Continue to App</a>
                        </div>
                    </div>

                    <script>
                        // Automatically exchange code for tokens
                        async function exchangeTokens() {
                            try {
                                console.log('🔄 Exchanging authorization code for tokens...');
                                
                                const response = await fetch('/.netlify/functions/modern-ebay-oauth', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        action: 'exchange-code',
                                        code: '${code}',
                                        state: '${state}'
                                    })
                                });
                                
                                const data = await response.json();
                                
                                if (data.success && data.access_token) {
                                    // Store tokens in parent window
                                    if (window.opener && window.opener.localStorage) {
                                        window.opener.localStorage.setItem('ebay_access_token', data.access_token);
                                        window.opener.localStorage.setItem('ebay_refresh_token', data.refresh_token);
                                        window.opener.localStorage.setItem('ebay_token_expiry', String(Date.now() + (data.expires_in * 1000)));
                                        
                                        // Also store as JSON for compatibility
                                        const tokenData = {
                                            access_token: data.access_token,
                                            refresh_token: data.refresh_token,
                                            expires_in: data.expires_in,
                                            token_type: data.token_type || 'Bearer',
                                            expires_at: Date.now() + (data.expires_in * 1000)
                                        };
                                        // Store in both formats for compatibility
                                        window.opener.localStorage.setItem('oauth_tokens', JSON.stringify(tokenData));
                                        window.opener.localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokenData));
                                        
                                        console.log('✅ Tokens stored successfully in parent window');
                                        
                                        // Trigger event in parent window
                                        if (window.opener.dispatchEvent) {
                                            window.opener.dispatchEvent(new CustomEvent('ebayAuthSuccess', { detail: tokenData }));
                                        }
                                    } else {
                                        // Fallback: store in current window
                                        localStorage.setItem('ebay_access_token', data.access_token);
                                        localStorage.setItem('ebay_refresh_token', data.refresh_token);
                                        localStorage.setItem('ebay_token_expiry', String(Date.now() + (data.expires_in * 1000)));
                                    }
                                    
                                    document.getElementById('status').innerHTML = 
                                        '<div class="success"><strong>✅ Tokens stored successfully!</strong></div>';
                                    document.getElementById('actions').style.display = 'block';
                                    
                                    // Auto-close popup after 2 seconds
                                    setTimeout(() => {
                                        if (window.opener) {
                                            window.close();
                                        } else {
                                            window.location.href = 'https://easyflip.ai/app';
                                        }
                                    }, 2000);
                                    
                                } else {
                                    throw new Error(data.error || 'Token exchange failed');
                                }
                                
                            } catch (error) {
                                console.error('❌ Token exchange error:', error);
                                document.getElementById('status').innerHTML = 
                                    '<div style="color: #e74c3c;"><strong>❌ Token exchange failed:</strong><br>' + 
                                    error.message + '</div>';
                                document.getElementById('actions').style.display = 'block';
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
                    body { 
                        font-family: Arial, sans-serif; 
                        max-width: 600px; 
                        margin: 50px auto; 
                        padding: 20px;
                        background: #f5f5f5;
                    }
                    .container {
                        background: white;
                        padding: 30px;
                        border-radius: 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        text-align: center;
                    }
                    .warning { color: #f39c12; margin: 20px 0; }
                    .btn {
                        display: inline-block;
                        padding: 12px 24px;
                        background: #3498db;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>⚠️ Invalid OAuth Callback</h1>
                    <div class="warning">
                        <p>This URL is missing required OAuth parameters.</p>
                        <p>Please start the authentication process from the app.</p>
                    </div>
                    <a href="https://easyflip.ai/app" class="btn">Return to App</a>
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
                    body { 
                        font-family: Arial, sans-serif; 
                        max-width: 600px; 
                        margin: 50px auto; 
                        padding: 20px;
                        background: #f5f5f5;
                    }
                    .container {
                        background: white;
                        padding: 30px;
                        border-radius: 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        text-align: center;
                    }
                    .error { color: #e74c3c; margin: 20px 0; }
                    .btn {
                        display: inline-block;
                        padding: 12px 24px;
                        background: #3498db;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>❌ OAuth Processing Error</h1>
                    <div class="error">
                        <p>There was an error processing your eBay authentication.</p>
                        <p><strong>Error:</strong> ${error.message}</p>
                    </div>
                    <a href="https://easyflip.ai/app" class="btn">Return to App</a>
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