/**
 * Simple eBay OAuth using hendt/ebay-api library
 * This replaces the complex manual OAuth implementation
 */

const eBayApi = require('ebay-api');

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
        console.log('🚀 Simple eBay OAuth Handler');
        
        // Initialize eBay API
        console.log('🔧 Initializing eBay API with config:', {
            appId: (process.env.EBAY_PROD_APP || process.env.VITE_EBAY_PROD_APP_ID) ? 'SET' : 'MISSING',
            certId: (process.env.EBAY_PROD_CERT || process.env.VITE_EBAY_PROD_CERT_ID) ? 'SET' : 'MISSING',
            ruName: 'easyflip.ai-easyflip-easyfl-cnqajybp'
        });
        
        const ebay = new eBayApi({
            appId: process.env.EBAY_PROD_APP || process.env.VITE_EBAY_PROD_APP_ID,
            certId: process.env.EBAY_PROD_CERT || process.env.VITE_EBAY_PROD_CERT_ID,
            sandbox: false,
            siteId: eBayApi.SiteId.EBAY_US,
            marketplaceId: eBayApi.MarketplaceId.EBAY_US,
            ruName: 'easyflip.ai-easyflip-easyfl-cnqajybp'
        });

        const body = event.body ? JSON.parse(event.body) : {};
        const action = body.action || event.queryStringParameters?.action;

        console.log(`🎯 Action: ${action}`);

        switch (action) {
            case 'generate-auth-url':
                // Set required scopes
                ebay.OAuth2.setScope([
                    'https://api.ebay.com/oauth/api_scope/sell.inventory',
                    'https://api.ebay.com/oauth/api_scope/sell.account',
                    'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
                    'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly'
                ]);

                // Generate authorization URL
                const authUrl = ebay.OAuth2.generateAuthUrl();
                
                console.log('✅ Generated auth URL:', authUrl);
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        authUrl: authUrl,
                        message: 'Authorization URL generated successfully'
                    })
                };

            case 'exchange-code':
                const { code } = body;
                
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

                // Validate and decode the authorization code
                if (!code || code.length < 10) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            error: 'Invalid authorization code format',
                            details: {
                                codeLength: code ? code.length : 0,
                                hint: 'Authorization code appears to be too short or empty'
                            }
                        })
                    };
                }
                
                const decodedCode = decodeURIComponent(code);
                console.log(`🔄 Exchanging code: ${code.substring(0, 50)}...`);
                console.log(`🔧 Decoded code: ${decodedCode.substring(0, 50)}...`);
                console.log(`🔧 Code length: ${code.length}, Decoded length: ${decodedCode.length}`);
                
                // Set required scopes before token exchange
                ebay.OAuth2.setScope([
                    'https://api.ebay.com/oauth/api_scope/sell.inventory',
                    'https://api.ebay.com/oauth/api_scope/sell.account',
                    'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
                    'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly'
                ]);
                
                // Exchange code for token
                try {
                    const token = await ebay.OAuth2.getToken(decodedCode);
                    console.log('✅ Token exchange successful');
                    console.log('🔧 Token response:', {
                        hasAccessToken: !!token.access_token,
                        hasRefreshToken: !!token.refresh_token,
                        expiresIn: token.expires_in,
                        tokenType: token.token_type
                    });
                    
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            access_token: token.access_token,
                            refresh_token: token.refresh_token,
                            expires_in: token.expires_in,
                            token_type: token.token_type,
                            message: 'Tokens retrieved successfully'
                        })
                    };
                } catch (tokenError) {
                    console.error('❌ Token exchange error:', tokenError);
                    console.error('❌ Full error details:', {
                        name: tokenError.name,
                        message: tokenError.message,
                        stack: tokenError.stack,
                        response: tokenError.response ? {
                            status: tokenError.response.status,
                            statusText: tokenError.response.statusText,
                            data: tokenError.response.data
                        } : null
                    });
                    
                    // Enhanced error categorization
                    let errorCategory = 'unknown';
                    let userFriendlyMessage = tokenError.message;
                    
                    if (tokenError.response) {
                        const status = tokenError.response.status;
                        const responseData = tokenError.response.data;
                        
                        if (status === 400) {
                            errorCategory = 'invalid_request';
                            if (responseData && responseData.error === 'invalid_grant') {
                                userFriendlyMessage = 'Authorization code has expired or been used. Please try authenticating again.';
                            } else {
                                userFriendlyMessage = 'Invalid or expired authorization code. Please restart the authentication process.';
                            }
                        } else if (status === 401) {
                            errorCategory = 'authentication_error';
                            userFriendlyMessage = 'Authentication failed. Please check your eBay app credentials.';
                        } else if (status === 429) {
                            errorCategory = 'rate_limit';
                            userFriendlyMessage = 'Too many requests. Please wait a moment and try again.';
                        } else if (status >= 500) {
                            errorCategory = 'server_error';
                            userFriendlyMessage = 'eBay API server error. Please try again in a few minutes.';
                        }
                    } else if (tokenError.code === 'ENOTFOUND' || tokenError.code === 'ECONNREFUSED') {
                        errorCategory = 'network_error';
                        userFriendlyMessage = 'Network connection error. Please check your internet connection.';
                    }
                    
                    return {
                        statusCode: tokenError.response?.status || 500,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            error: userFriendlyMessage,
                            errorCategory: errorCategory,
                            details: {
                                errorType: tokenError.constructor.name,
                                originalCode: code.substring(0, 30) + '...',
                                decodedCode: decodedCode.substring(0, 30) + '...',
                                codeLength: code.length,
                                errorMessage: tokenError.message,
                                httpStatus: tokenError.response?.status,
                                timestamp: new Date().toISOString()
                            }
                        })
                    };
                }

            case 'refresh-token':
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

                console.log('🔄 Refreshing token');
                
                // Refresh the token
                const refreshedToken = await ebay.OAuth2.refreshToken(refresh_token);
                
                console.log('✅ Token refresh successful');
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        access_token: refreshedToken.access_token,
                        expires_in: refreshedToken.expires_in,
                        token_type: refreshedToken.token_type,
                        message: 'Token refreshed successfully'
                    })
                };

            case 'test-api':
                const { access_token } = body;
                
                if (!access_token) {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            error: 'Access token is required'
                        })
                    };
                }

                console.log('🧪 Testing API with token');
                
                // Set the token and test API
                ebay.OAuth2.setCredentials({ access_token });
                
                // Test API call
                const privileges = await ebay.sell.account.getPrivileges();
                
                console.log('✅ API test successful');
                
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        data: privileges,
                        message: 'API test successful'
                    })
                };

            default:
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Invalid action. Use: generate-auth-url, exchange-code, refresh-token, or test-api'
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