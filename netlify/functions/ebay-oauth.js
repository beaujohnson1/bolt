// eBay OAuth Handler for Netlify Functions
// Handles OAuth authorization and token exchange for eBay APIs

const { config } = require('./_shared/config.cjs');

// eBay OAuth endpoints
const EBAY_OAUTH_BASE = {
  production: 'https://auth.ebay.com/oauth2',
  sandbox: 'https://auth.sandbox.ebay.com/oauth2'
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
        return await getAuthUrl(headers, credentials, oauthBase, event.queryStringParameters);
        
      case 'exchange-code':
        return await exchangeCode(headers, credentials, oauthBase, event.body);
        
      case 'refresh-token':
        return await refreshToken(headers, credentials, oauthBase, event.body);
        
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
async function getAuthUrl(headers, credentials, oauthBase, queryParams) {
  try {
    console.log('🔗 [EBAY-OAUTH] Generating authorization URL...');
    
    const redirectUri = queryParams?.redirect_uri || 
                       `${process.env.URL || 'http://localhost:8888'}/auth/ebay/callback`;
    
    const state = queryParams?.state || generateRandomString(32);
    
    // Build authorization URL - Trading API doesn't need scopes
    const authUrl = new URL(`${oauthBase}/authorize`);
    authUrl.searchParams.append('client_id', credentials.appId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', state);
    
    console.log('✅ [EBAY-OAUTH] Authorization URL generated successfully');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        authUrl: authUrl.toString(),
        state: state,
        redirectUri: redirectUri,
        environment: credentials.environment || 'production'
      })
    };

  } catch (error) {
    console.error('❌ [EBAY-OAUTH] Error generating auth URL:', error);
    throw error;
  }
}

// Exchange authorization code for access token
async function exchangeCode(headers, credentials, oauthBase, body) {
  try {
    console.log('🔄 [EBAY-OAUTH] Exchanging authorization code for token...');
    
    const { code, redirect_uri, state } = JSON.parse(body);
    
    if (!code) {
      throw new Error('Authorization code is required');
    }

    // Prepare token request
    const tokenUrl = `${oauthBase}/token`;
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirect_uri
    });

    // Create basic auth header with client credentials
    const basicAuth = Buffer.from(`${credentials.appId}:${credentials.certId}`).toString('base64');

    console.log('📡 [EBAY-OAUTH] Making token exchange request...');
    
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
async function refreshToken(headers, credentials, oauthBase, body) {
  try {
    console.log('🔄 [EBAY-OAUTH] Refreshing access token...');
    
    const { refresh_token } = JSON.parse(body);
    
    if (!refresh_token) {
      throw new Error('Refresh token is required');
    }

    const tokenUrl = `${oauthBase}/token`;
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