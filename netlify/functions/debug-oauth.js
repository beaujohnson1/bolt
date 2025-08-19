// Debug OAuth URL generation
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
    const ebayConfig = config.ebay;
    const isProduction = ebayConfig.environment === 'production';
    const credentials = isProduction ? ebayConfig.production : ebayConfig.sandbox;
    const oauthBase = isProduction ? 'https://auth.ebay.com/oauth2' : 'https://auth.sandbox.ebay.com/oauth2';

    console.log('🔍 [DEBUG] Environment:', ebayConfig.environment);
    console.log('🔍 [DEBUG] Is Production:', isProduction);
    console.log('🔍 [DEBUG] Credentials check:', {
      hasAppId: !!credentials.appId,
      hasDevId: !!credentials.devId,
      hasCertId: !!credentials.certId,
      appId: credentials.appId,
      devId: credentials.devId
    });

    // Build the exact URL like the real function does
    const state = 'debug-test-state';
    const authUrl = new URL(`${oauthBase}/authorize`);
    authUrl.searchParams.append('client_id', credentials.appId);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', state);

    if (isProduction) {
      // Back to original working config - redirect_uri with RuName value
      const ruName = 'easyflip.ai-easyflip-easyfl-cnqajybp';
      authUrl.searchParams.append('redirect_uri', ruName);
    } else {
      const callbackUrl = `${process.env.URL || 'https://easyflip.ai'}/.netlify/functions/auth-ebay-callback`;
      authUrl.searchParams.append('redirect_uri', callbackUrl);
    }

    const scopes = [
      'https://api.ebay.com/oauth/api_scope/sell.inventory',
      'https://api.ebay.com/oauth/api_scope/sell.account',
      'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
      'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly'
    ].join(' ');
    
    authUrl.searchParams.append('scope', scopes);

    if (isProduction) {
      authUrl.searchParams.append('prompt', 'login');
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        environment: ebayConfig.environment,
        isProduction,
        oauthBase,
        credentials: {
          appId: credentials.appId,
          hasDevId: !!credentials.devId,
          hasCertId: !!credentials.certId
        },
        generatedUrl: authUrl.toString(),
        urlParams: Object.fromEntries(authUrl.searchParams),
        rawUrl: authUrl.href
      })
    };

  } catch (error) {
    console.error('❌ [DEBUG] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      })
    };
  }
};