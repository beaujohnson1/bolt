// eBay OAuth Handler for Netlify Functions
// Handles OAuth authorization and token exchange for eBay APIs

const { config } = require('./_shared/config.cjs');

// eBay OAuth endpoints
const EBAY_OAUTH_BASE = {
  production: 'https://auth.ebay.com/oauth2',
  sandbox: 'https://auth.sandbox.ebay.com/oauth2'
};

// eBay Token endpoints (different from OAuth base)
const EBAY_TOKEN_BASE = {
  production: 'https://api.ebay.com/identity/v1/oauth2',
  sandbox: 'https://api.sandbox.ebay.com/identity/v1/oauth2'
};

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
    console.log('🔐 [EBAY-OAUTH] OAuth request received:', {
      method: event.httpMethod,
      path: event.path,
      queryParams: event.queryStringParameters,
      hasBody: !!event.body
    });

    const ebayConfig = config.ebay;
    const isProduction = ebayConfig.environment === 'production';
    const oauthBase = EBAY_OAUTH_BASE[ebayConfig.environment];
    const credentials = isProduction ? ebayConfig.production : ebayConfig.sandbox;

    // Parse the action from query params or body
    const action = event.queryStringParameters?.action || 
                  (event.body ? JSON.parse(event.body).action : null);

    switch (action) {
      case 'get-auth-url':
        return await getAuthUrl(headers, credentials, oauthBase, event.queryStringParameters, ebayConfig.environment);
        
      case 'exchange-code':
        const tokenBase = EBAY_TOKEN_BASE[ebayConfig.environment];
        return await exchangeCode(headers, credentials, tokenBase, event.body);
        
      case 'refresh-token':
        const refreshTokenBase = EBAY_TOKEN_BASE[ebayConfig.environment];
        return await refreshToken(headers, credentials, refreshTokenBase, event.body);
        
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid action',
            message: 'Action must be one of: get-auth-url, exchange-code, refresh-token',
            supportedActions: ['get-auth-url', 'exchange-code', 'refresh-token']
          })
        };
    }

  } catch (error) {
    console.error('❌ [EBAY-OAUTH] OAuth error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'OAuth processing failed',
        message: error.message
      })
    };
  }
};

// Generate eBay OAuth authorization URL
async function getAuthUrl(headers, credentials, oauthBase, queryParams, environment = 'production') {
  try {
    console.log('🔗 [EBAY-OAUTH] Generating authorization URL...');
    
    const state = queryParams?.state || generateRandomString(32);
    
    // Check if production environment
    const isProduction = environment === 'production';
    
    // Build authorization URL with eBay-specific parameters
    const callbackUrl = `${process.env.URL || 'http://localhost:53778'}/.netlify/functions/auth-ebay-callback`;
    
    console.log('🔗 [EBAY-OAUTH] Using callback URL:', callbackUrl);
    console.log('🔗 [EBAY-OAUTH] Environment:', environment, 'isProduction:', isProduction);
    console.log('🔗 [EBAY-OAUTH] Using credentials:', {
      appId: credentials.appId,
      hasDevId: !!credentials.devId,
      hasCertId: !!credentials.certId
    });
    
    const authUrl = new URL(`${oauthBase}/authorize`);
    authUrl.searchParams.append('client_id', credentials.appId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', state);
    
    // Always use the callback URL for consistency
    // eBay will validate against registered RuNames in production
    authUrl.searchParams.append('redirect_uri', callbackUrl);
    console.log('🔗 [EBAY-OAUTH] Using callback URL:', callbackUrl);
    
    // Add eBay scopes for selling
    const scopes = [
      'https://api.ebay.com/oauth/api_scope/sell.marketing.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.marketing',
      'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly', 
      'https://api.ebay.com/oauth/api_scope/sell.inventory',
      'https://api.ebay.com/oauth/api_scope/sell.account.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.account',
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
      'https://api.ebay.com/oauth/api_scope/sell.analytics.readonly',
      'https://api.ebay.com/oauth/api_scope/sell.finances',
      'https://api.ebay.com/oauth/api_scope/sell.payment.dispute',
      'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly'
    ].join(' ');
    
    authUrl.searchParams.append('scope', scopes);
    
    console.log('✅ [EBAY-OAUTH] Authorization URL generated:', authUrl.toString());
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        authUrl: authUrl.toString(),
        state: state,
        callbackUrl: callbackUrl,
        environment: environment
      })
    };

  } catch (error) {
    console.error('❌ [EBAY-OAUTH] Error generating auth URL:', error);
    throw error;
  }
}

// Exchange authorization code for access token
async function exchangeCode(headers, credentials, tokenBase, body) {
  try {
    console.log('🔄 [EBAY-OAUTH] Exchanging authorization code for token...');
    
    const { code, redirect_uri, state } = JSON.parse(body);
    
    if (!code) {
      throw new Error('Authorization code is required');
    }

    // Prepare token request with proper redirect_uri
    const tokenUrl = `${tokenBase}/token`;
    const callbackUrl = `${process.env.URL || 'http://localhost:53778'}/.netlify/functions/auth-ebay-callback`;
    
    // Get environment to determine if production
    const ebayConfig = config.ebay;
    const isProduction = ebayConfig.environment === 'production';
    const isLocalDev = callbackUrl.includes('localhost');
    
    // Use consistent callback URL for token exchange
    const finalRedirectUri = callbackUrl;
    
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: finalRedirectUri
    });
    
    console.log('🔄 [EBAY-OAUTH] Token exchange using redirect_uri:', finalRedirectUri);
    console.log('🔄 [EBAY-OAUTH] Received redirect_uri in request:', redirect_uri);
    console.log('🔄 [EBAY-OAUTH] Code parameter:', code ? code.substring(0, 20) + '...' : 'missing');

    // Create basic auth header with client credentials
    const basicAuth = Buffer.from(`${credentials.appId}:${credentials.certId}`).toString('base64');

    console.log('📡 [EBAY-OAUTH] Making token exchange request to:', tokenUrl);
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: tokenParams.toString()
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ [EBAY-OAUTH] Token exchange failed:', responseData);
      throw new Error(responseData.error_description || responseData.error || 'Token exchange failed');
    }

    console.log('✅ [EBAY-OAUTH] Token exchange successful');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: responseData.access_token,
        refresh_token: responseData.refresh_token,
        expires_in: responseData.expires_in,
        token_type: responseData.token_type,
        scope: responseData.scope
      })
    };

  } catch (error) {
    console.error('❌ [EBAY-OAUTH] Error exchanging code:', error);
    throw error;
  }
}

// Refresh access token using refresh token
async function refreshToken(headers, credentials, tokenBase, body) {
  try {
    console.log('🔄 [EBAY-OAUTH] Refreshing access token...');
    
    const { refresh_token } = JSON.parse(body);
    
    if (!refresh_token) {
      throw new Error('Refresh token is required');
    }

    const tokenUrl = `${tokenBase}/token`;
    const tokenParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    });

    const basicAuth = Buffer.from(`${credentials.appId}:${credentials.certId}`).toString('base64');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: tokenParams.toString()
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ [EBAY-OAUTH] Token refresh failed:', responseData);
      throw new Error(responseData.error_description || responseData.error || 'Token refresh failed');
    }

    console.log('✅ [EBAY-OAUTH] Token refresh successful');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: responseData.access_token,
        refresh_token: responseData.refresh_token,
        expires_in: responseData.expires_in,
        token_type: responseData.token_type
      })
    };

  } catch (error) {
    console.error('❌ [EBAY-OAUTH] Error refreshing token:', error);
    throw error;
  }
}

// Generate random string for state parameter
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}