const EbayAuthToken = require('ebay-oauth-nodejs-client');

// Modern eBay OAuth implementation using official client library
exports.handler = async (event, context) => {
    // CORS headers for all responses
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // Handle preflight CORS requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    try {
        // Initialize eBay OAuth client with production credentials
        const clientId = process.env.EBAY_PROD_APP || process.env.VITE_EBAY_PROD_APP_ID;
        const clientSecret = process.env.EBAY_PROD_CERT || process.env.VITE_EBAY_PROD_CERT_ID;
        const redirectUri = 'easyflip.ai-easyflip-easyfl-cnqajybp'; // RuName from eBay Developer Account
        
        console.log('🔧 OAuth Config:', { 
            clientId: clientId ? `${clientId.substring(0, 20)}...` : 'MISSING',
            clientSecret: clientSecret ? `${clientSecret.substring(0, 10)}...` : 'MISSING',
            redirectUri 
        });
        
        const ebayAuthToken = new EbayAuthToken({
            clientId: clientId,
            clientSecret: clientSecret,
            redirectUri: redirectUri
        });

        const body = event.body ? JSON.parse(event.body) : {};
        const action = body.action || event.queryStringParameters?.action;

        console.log(`🚀 Modern OAuth Handler - Action: ${action}`);

        switch (action) {
            case 'test-env':
                // Test environment configuration
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        environment: {
                            hasClientId: !!(process.env.EBAY_PROD_APP || process.env.VITE_EBAY_PROD_APP_ID),
                            hasClientSecret: !!(process.env.EBAY_PROD_CERT || process.env.VITE_EBAY_PROD_CERT_ID),
                            clientIdLength: (process.env.EBAY_PROD_APP || process.env.VITE_EBAY_PROD_APP_ID || '').length,
                            clientSecretLength: (process.env.EBAY_PROD_CERT || process.env.VITE_EBAY_PROD_CERT_ID || '').length,
                            nodeVersion: process.version,
                            platform: process.platform
                        }
                    })
                };

            case 'generate-auth-url':
                // Generate user authorization URL using official library
                const scopes = [
                    'https://api.ebay.com/oauth/api_scope/sell.inventory',
                    'https://api.ebay.com/oauth/api_scope/sell.account', 
                    'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
                    'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly'
                ];
                
                console.log('🔧 Generating auth URL with state:', body.state);
                console.log('🔧 Scopes:', scopes);
                console.log('🔧 Environment: PRODUCTION');
                console.log('🔧 RedirectUri (RuName):', redirectUri);
                
                const options = body.state ? { state: body.state } : {};
                console.log('🔧 Options:', options);
                
                try {
                    const authUrl = ebayAuthToken.generateUserAuthorizationUrl('PRODUCTION', scopes, options);
                    console.log('✅ Generated auth URL:', authUrl);
                    
                    // Validate the generated URL
                    if (!authUrl || !authUrl.includes('auth.ebay.com')) {
                        throw new Error('Invalid authorization URL generated');
                    }
                    
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            authUrl: authUrl,
                            message: 'Authorization URL generated successfully'
                        })
                    };
                } catch (urlError) {
                    console.error('❌ URL Generation Error:', urlError);
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            error: `URL generation failed: ${urlError.message}`,
                            details: {
                                environment: 'PRODUCTION',
                                redirectUri: redirectUri,
                                scopes: scopes,
                                options: options
                            }
                        })
                    };
                }

            case 'exchange-code':
                // Exchange authorization code for access token using official library
                const { code, state } = body;
                
                if (!code) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            error: 'Authorization code is required'
                        })
                    };
                }

                console.log(`🔄 Exchanging code for tokens - Code: ${code.substring(0, 50)}...`);
                
                const tokenResponse = await ebayAuthToken.exchangeCodeForAccessToken('PRODUCTION', code);
                
                console.log('✅ Token exchange successful');
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        access_token: tokenResponse.access_token,
                        refresh_token: tokenResponse.refresh_token,
                        expires_in: tokenResponse.expires_in,
                        token_type: tokenResponse.token_type,
                        message: 'Tokens retrieved successfully'
                    })
                };

            case 'refresh-token':
                // Refresh expired access token using official library
                const { refresh_token } = body;
                
                if (!refresh_token) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            error: 'Refresh token is required'
                        })
                    };
                }

                console.log('🔄 Refreshing access token');
                
                const refreshScopes = [
                    'https://api.ebay.com/oauth/api_scope/sell.inventory',
                    'https://api.ebay.com/oauth/api_scope/sell.account',
                    'https://api.ebay.com/oauth/api_scope/sell.fulfillment', 
                    'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly'
                ];
                
                const refreshResponse = await ebayAuthToken.getAccessToken('PRODUCTION', refresh_token, refreshScopes);
                
                console.log('✅ Token refresh successful');
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        access_token: refreshResponse.access_token,
                        expires_in: refreshResponse.expires_in,
                        token_type: refreshResponse.token_type,
                        message: 'Token refreshed successfully'
                    })
                };

            case 'get-app-token':
                // Get application token for non-user specific operations
                console.log('🔄 Getting application token');
                
                const appToken = await ebayAuthToken.getApplicationToken('PRODUCTION');
                
                console.log('✅ Application token retrieved');
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        access_token: appToken.access_token,
                        expires_in: appToken.expires_in,
                        token_type: appToken.token_type,
                        message: 'Application token retrieved successfully'
                    })
                };

            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Invalid action. Use: generate-auth-url, exchange-code, refresh-token, or get-app-token'
                    })
                };
        }

    } catch (error) {
        console.error('❌ OAuth Error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message || 'OAuth operation failed',
                details: error.toString()
            })
        };
    }
};