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

                console.log(`🔄 Exchanging code: ${code.substring(0, 50)}...`);
                
                // Exchange code for token
                const token = await ebay.OAuth2.getToken(code);
                
                console.log('✅ Token exchange successful');
                
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