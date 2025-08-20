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

    // ENVIRONMENT DEBUGGING: Log all environment variables affecting detection
    console.log('🌍 [ENV-DEBUG] Environment Detection Variables:', {
      'NODE_ENV': process.env.NODE_ENV,
      'VITE_EBAY_USE_PRODUCTION': process.env.VITE_EBAY_USE_PRODUCTION,
      'CONTEXT': process.env.CONTEXT,
      'URL': process.env.URL
    });

    const ebayConfig = config.ebay;
    const isProduction = ebayConfig.environment === 'production';
    const oauthBase = EBAY_OAUTH_BASE[ebayConfig.environment];
    const credentials = isProduction ? ebayConfig.production : ebayConfig.sandbox;

    // CRITICAL ENVIRONMENT LOGGING: Show which environment and credentials are being used
    console.log('🌍 [ENV-DEBUG] Environment Configuration:', {
      detectedEnvironment: ebayConfig.environment,
      isProduction: isProduction,
      oauthBase: oauthBase,
      credentialsSource: isProduction ? 'production' : 'sandbox',
      hasAppId: !!credentials.appId,
      hasDevId: !!credentials.devId,
      hasCertId: !!credentials.certId,
      appIdPrefix: credentials.appId ? credentials.appId.substring(0, 8) + '...' : 'missing'
    });

    // Parse the action from query params or body
    const action = event.queryStringParameters?.action || 
                  (event.body ? JSON.parse(event.body).action : null);

    switch (action) {
      case 'health-check':
        return await healthCheck(headers);
        
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
    const callbackUrl = `${process.env.URL || 'https://easyflip.ai'}/.netlify/functions/auth-ebay-callback`;
    
    console.log('🔗 [EBAY-OAUTH] Using callback URL:', callbackUrl);
    console.log('🔗 [EBAY-OAUTH] Environment:', environment, 'isProduction:', isProduction);
    console.log('🔗 [EBAY-OAUTH] Using credentials:', {
      appId: credentials.appId,
      hasDevId: !!credentials.devId,
      hasCertId: !!credentials.certId
    });
    
    // Validate required credentials
    if (!credentials.appId || !credentials.devId || !credentials.certId) {
      console.error('❌ [EBAY-OAUTH] Missing required credentials:', {
        hasAppId: !!credentials.appId,
        hasDevId: !!credentials.devId,
        hasCertId: !!credentials.certId,
        environment: environment,
        isProduction: isProduction
      });
      throw new Error(`Missing required eBay credentials for ${environment} environment`);
    }

    // ENVIRONMENT VALIDATION WARNING: Check for potential environment/credential mismatch
    if (isProduction) {
      // In production, ensure we have production credentials
      const hasProdAppId = credentials.appId && !credentials.appId.includes('sandbox');
      console.log('🔍 [ENV-VALIDATION] Production credential check:', {
        hasProductionLikeAppId: hasProdAppId,
        appIdSample: credentials.appId ? credentials.appId.substring(0, 8) + '...' : 'missing'
      });
      
      if (!hasProdAppId) {
        console.warn('⚠️ [ENV-VALIDATION] WARNING: Running in production mode but credentials may be sandbox-like');
      }
    } else {
      // In sandbox, warn if using production-like credentials
      const hasSandboxAppId = credentials.appId && credentials.appId.includes('sandbox');
      console.log('🔍 [ENV-VALIDATION] Sandbox credential check:', {
        hasSandboxLikeAppId: hasSandboxAppId,
        appIdSample: credentials.appId ? credentials.appId.substring(0, 8) + '...' : 'missing'
      });
      
      if (!hasSandboxAppId) {
        console.warn('⚠️ [ENV-VALIDATION] WARNING: Running in sandbox mode but credentials may be production-like');
      }
    }
    
    const authUrl = new URL(`${oauthBase}/authorize`);
    authUrl.searchParams.append('client_id', credentials.appId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', state);
    
    // CRITICAL FIX: Use RuName for redirect_uri parameter (eBay requirement)
    // The callback URL is configured in eBay Developer Console, not in OAuth parameters
    if (isProduction) {
      const ruName = 'easyflip.ai-easyflip-easyfl-cnqajybp';
      authUrl.searchParams.append('redirect_uri', ruName);
      console.log('🔗 [EBAY-OAUTH] Using production RuName for redirect_uri:', ruName);
    } else {
      // Sandbox RuName (if available, otherwise use callback URL for sandbox)
      const sandboxRuName = process.env.EBAY_SANDBOX_RUNAME || callbackUrl;
      authUrl.searchParams.append('redirect_uri', sandboxRuName);
      console.log('🔗 [EBAY-OAUTH] Using sandbox redirect_uri:', sandboxRuName);
    }
    console.log('🔗 [EBAY-OAUTH] Final callback URL:', callbackUrl);
    
    // Add eBay scopes for selling - simplified for production approval
    const scopes = [
      'https://api.ebay.com/oauth/api_scope/sell.inventory',
      'https://api.ebay.com/oauth/api_scope/sell.account',
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
      'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly'
    ].join(' ');
    
    authUrl.searchParams.append('scope', scopes);
    
    // Add prompt parameter for production
    if (isProduction) {
      authUrl.searchParams.append('prompt', 'login');
    }
    
    console.log('✅ [EBAY-OAUTH] Authorization URL generated:', authUrl.toString());
    console.log('🔗 [EBAY-OAUTH] URL components:', {
      baseUrl: `${oauthBase}/authorize`,
      clientId: credentials.appId,
      responseType: 'code',
      redirectUri: callbackUrl,
      scope: scopes,
      state: state,
      prompt: isProduction ? 'login' : undefined
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        authUrl: authUrl.toString(),
        state: state,
        callbackUrl: callbackUrl,
        environment: environment,
        debug: {
          isProduction,
          baseUrl: `${oauthBase}/authorize`,
          clientId: credentials.appId,
          redirectUri: callbackUrl,
          ruName: isProduction ? 'easyflip.ai-easyflip-easyfl-cnqajybp' : null
        }
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
    const callbackUrl = `${process.env.URL || 'https://easyflip.ai'}/.netlify/functions/auth-ebay-callback`;
    
    // Get environment to determine if production
    const ebayConfig = config.ebay;
    const isProduction = ebayConfig.environment === 'production';
    const isLocalDev = callbackUrl.includes('localhost');
    
    // Use RuName for production token exchange, redirect_uri for sandbox
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code
    });
    
    // CRITICAL FIX: Use the same RuName for token exchange as authorization
    // This must match the redirect_uri used in the authorization request
    if (isProduction) {
      const ruName = 'easyflip.ai-easyflip-easyfl-cnqajybp';
      tokenParams.append('redirect_uri', ruName);
      console.log('🔄 [EBAY-OAUTH] Using production RuName for token exchange:', ruName);
    } else {
      const sandboxRuName = process.env.EBAY_SANDBOX_RUNAME || callbackUrl;
      tokenParams.append('redirect_uri', sandboxRuName);
      console.log('🔄 [EBAY-OAUTH] Using sandbox redirect_uri for token exchange:', sandboxRuName);
    }
    
    console.log('🔄 [EBAY-OAUTH] Received redirect_uri in request:', redirect_uri);
    console.log('🔄 [EBAY-OAUTH] Code parameter:', code ? code.substring(0, 20) + '...' : 'missing');

    // Create basic auth header with client credentials
    const basicAuth = Buffer.from(`${credentials.appId}:${credentials.certId}`).toString('base64');

    console.log('📡 [EBAY-OAUTH] Making token exchange request to:', tokenUrl);
    console.log('📡 [EBAY-OAUTH] Request parameters:', {
      grant_type: 'authorization_code',
      code: code ? code.substring(0, 20) + '...' : 'missing',
      redirect_uri: tokenParams.get('redirect_uri'),
      contentType: 'application/x-www-form-urlencoded',
      hasBasicAuth: !!basicAuth
    });
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`
      },
      body: tokenParams.toString()
    });

    console.log('📡 [EBAY-OAUTH] Token exchange response status:', response.status, response.statusText);
    
    const responseData = await response.json();
    
    if (!response.ok) {
      // ENHANCED ERROR LOGGING: Include environment context in token exchange failures
      const errorContext = {
        status: response.status,
        statusText: response.statusText,
        error: responseData,
        environment: ebayConfig.environment,
        isProduction: isProduction,
        requestParams: {
          grant_type: 'authorization_code',
          redirect_uri: tokenParams.get('redirect_uri'),
          codeLength: code?.length || 0,
          tokenEndpoint: tokenUrl
        },
        credentialContext: {
          hasAppId: !!credentials.appId,
          hasDevId: !!credentials.devId,
          hasCertId: !!credentials.certId,
          appIdPrefix: credentials.appId ? credentials.appId.substring(0, 8) + '...' : 'missing'
        }
      };
      
      console.error('❌ [EBAY-OAUTH] Token exchange failed:', errorContext);
      
      // Add specific error messaging for common environment issues
      let errorMessage = responseData.error_description || responseData.error || 'Token exchange failed';
      if (responseData.error === 'invalid_request' && responseData.error_description?.includes('redirect_uri')) {
        errorMessage += ` (Environment: ${ebayConfig.environment}, Check RuName configuration)`;
      } else if (responseData.error === 'invalid_client') {
        errorMessage += ` (Environment: ${ebayConfig.environment}, Check credentials)`;
      }
      
      throw new Error(errorMessage);
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

// Health check endpoint for deployment verification
async function healthCheck(headers) {
  try {
    console.log('🏥 [EBAY-OAUTH] Health check requested');
    
    const buildInfo = {
      timestamp: new Date().toISOString(),
      version: process.env.BUILD_VERSION || 'dev',
      deployment: process.env.CONTEXT || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      netlifyUrl: process.env.URL || 'unknown'
    };
    
    // Check if eBay config is available
    const ebayConfig = config.ebay;
    const hasConfig = !!(ebayConfig && ebayConfig.sandbox && ebayConfig.production);
    
    // Test OAuth endpoints
    const sandboxAvailable = await testEndpoint(EBAY_OAUTH_BASE.sandbox + '/authorize');
    const productionAvailable = await testEndpoint(EBAY_OAUTH_BASE.production + '/authorize');
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      build: buildInfo,
      services: {
        ebayConfig: hasConfig,
        sandboxOAuth: sandboxAvailable,
        productionOAuth: productionAvailable
      },
      endpoints: {
        sandbox: EBAY_OAUTH_BASE.sandbox,
        production: EBAY_OAUTH_BASE.production
      }
    };
    
    console.log('✅ [EBAY-OAUTH] Health check completed:', healthStatus);
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(healthStatus)
    };
    
  } catch (error) {
    console.error('❌ [EBAY-OAUTH] Health check failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}

// Test if an endpoint is reachable
async function testEndpoint(url) {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      timeout: 5000 
    });
    return response.status < 500;
  } catch (error) {
    return false;
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