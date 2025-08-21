/**
 * eBay Token Exchange Function
 * Exchanges authorization code for access and refresh tokens
 */

const eBayApi = require('ebay-api');

// Load environment variables for local development
try {
    require('dotenv').config({ path: '.env.local' });
} catch (e) {
    // dotenv not available in production, use Netlify environment variables
    console.log('Using Netlify environment variables');
}

exports.handler = async (event, context) => {
    // CORS headers for all responses
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight CORS requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, error: 'Method not allowed' })
        };
    }

    const requestId = Math.random().toString(36).substring(7);
    console.log(`[${requestId}] eBay Token Exchange Handler`);

    try {
        // Parse request body
        let body = {};
        if (event.body) {
            try {
                body = JSON.parse(event.body);
            } catch (e) {
                console.error('Failed to parse request body:', e);
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ success: false, error: 'Invalid request body' })
                };
            }
        }

        const { code } = body;

        if (!code) {
            console.error('No authorization code provided');
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, error: 'Authorization code is required' })
            };
        }

        console.log(`[${requestId}] Exchanging code for tokens...`);

        // Initialize eBay API configuration
        const baseUrl = process.env.URL || 'https://easyflip.ai';
        const isProduction = process.env.EBAY_USE_PRODUCTION === 'true' || 
                            process.env.VITE_EBAY_USE_PRODUCTION === 'true' ||
                            (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1'));
        
        // Use the RU Name for production
        const ruName = isProduction ? 
            'easyflip.ai-easyflip-easyfl-cnqajybp' : 
            `${baseUrl}/ebay-oauth-callback.html`;

        console.log(`[${requestId}] Configuration:`, {
            isProduction,
            ruName,
            sandbox: !isProduction,
            hasAppId: !!(process.env.EBAY_PROD_APP || process.env.VITE_EBAY_PROD_APP_ID),
            hasCertId: !!(process.env.EBAY_PROD_CERT || process.env.VITE_EBAY_PROD_CERT_ID)
        });

        // Initialize eBay API client
        const ebay = new eBayApi({
            appId: process.env.EBAY_PROD_APP || process.env.VITE_EBAY_PROD_APP_ID,
            certId: process.env.EBAY_PROD_CERT || process.env.VITE_EBAY_PROD_CERT_ID,
            sandbox: !isProduction,
            siteId: eBayApi.SiteId.EBAY_US,
            marketplaceId: eBayApi.MarketplaceId.EBAY_US,
            ruName: ruName
        });

        // Set required scopes
        ebay.OAuth2.setScope([
            'https://api.ebay.com/oauth/api_scope/sell.inventory',
            'https://api.ebay.com/oauth/api_scope/sell.account',
            'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
            'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly'
        ]);

        console.log(`[${requestId}] Exchanging authorization code...`);

        // Exchange the authorization code for tokens
        const tokenResponse = await ebay.OAuth2.getUserToken(code);
        
        console.log(`[${requestId}] Token exchange successful:`, {
            hasAccessToken: !!tokenResponse.access_token,
            hasRefreshToken: !!tokenResponse.refresh_token,
            expiresIn: tokenResponse.expires_in,
            scope: tokenResponse.scope
        });

        // Calculate expiration timestamp
        const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);

        // Prepare token data
        const tokens = {
            access_token: tokenResponse.access_token,
            refresh_token: tokenResponse.refresh_token || '',
            expires_in: tokenResponse.expires_in,
            expires_at: expiresAt,
            scope: tokenResponse.scope || '',
            token_type: tokenResponse.token_type || 'User Access Token',
            timestamp: Date.now()
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                tokens,
                message: 'Tokens obtained successfully'
            })
        };

    } catch (error) {
        console.error(`[${requestId}] Token exchange error:`, error);
        
        // Extract error details
        let errorMessage = 'Token exchange failed';
        let errorDetails = {};
        
        if (error.response) {
            errorMessage = error.response.data?.error_description || error.response.data?.error || errorMessage;
            errorDetails = {
                status: error.response.status,
                data: error.response.data
            };
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: errorMessage,
                details: errorDetails
            })
        };
    }
};