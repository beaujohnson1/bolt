import eBayApi from 'ebay-api';
import { TokenEncryptionService } from '../../src/services/TokenEncryptionService';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Initialize eBay API
const ebayApi = new eBayApi({
  appId: process.env.EBAY_APP_ID,
  certId: process.env.EBAY_CERT_ID,
  devId: process.env.EBAY_DEV_ID,
  ruName: process.env.EBAY_RU_NAME,
  sandbox: process.env.NODE_ENV !== 'production',
  siteId: eBayApi.SiteId.EBAY_US,
  marketplaceId: eBayApi.MarketplaceId.EBAY_US,
  acceptLanguage: eBayApi.Locale.en_US,
  contentLanguage: eBayApi.Locale.en_US
});

// Set OAuth scopes
ebayApi.OAuth2.setScope([
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/sell.account'
]);

/**
 * Netlify Function: Handle eBay OAuth with hendt/ebay-api
 */
export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const path = event.path.replace('/.netlify/functions/ebay-api-oauth', '');
  
  try {
    // Generate authorization URL
    if (path === '/auth-url' && event.httpMethod === 'GET') {
      const { userId, sessionId } = event.queryStringParameters || {};
      
      if (!userId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'User ID required' })
        };
      }
      
      // Generate state for CSRF protection
      const crypto = require('crypto');
      const timestamp = Date.now().toString();
      const state = crypto.createHash('sha256')
        .update(`${userId}:${sessionId || 'web'}:${timestamp}`)
        .digest('hex');
      
      // Store state in database for validation
      await supabase.from('oauth_states').insert({
        state,
        user_id: userId,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      });
      
      // Generate auth URL
      const authUrl = ebayApi.OAuth2.generateAuthUrl();
      const url = new URL(authUrl);
      url.searchParams.set('state', state);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          authUrl: url.toString()
        })
      };
    }
    
    // Handle OAuth callback
    if (path === '/callback' && event.httpMethod === 'POST') {
      const { code, state } = JSON.parse(event.body || '{}');
      
      if (!code || !state) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Code and state required' })
        };
      }
      
      // Validate state
      const { data: stateData, error: stateError } = await supabase
        .from('oauth_states')
        .select('user_id')
        .eq('state', state)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (stateError || !stateData) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid or expired state' })
        };
      }
      
      // Exchange code for tokens
      const tokens = await ebayApi.OAuth2.getToken(code);
      
      // Encrypt tokens for storage
      const encryption = new TokenEncryptionService();
      const encryptedTokens = encryption.encryptTokens(tokens);
      
      // Store encrypted tokens
      const { error: tokenError } = await supabase
        .from('user_oauth_tokens')
        .upsert({
          user_id: stateData.user_id,
          provider: 'ebay',
          access_token_encrypted: JSON.stringify(encryptedTokens.access_token_encrypted),
          refresh_token_encrypted: JSON.stringify(encryptedTokens.refresh_token_encrypted),
          full_token_data_encrypted: JSON.stringify(encryptedTokens.full_token_data_encrypted),
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          refresh_expires_at: new Date(Date.now() + 47304000 * 1000).toISOString(), // 18 months
          scopes: JSON.stringify([
            'https://api.ebay.com/oauth/api_scope',
            'https://api.ebay.com/oauth/api_scope/sell.inventory',
            'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
            'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
            'https://api.ebay.com/oauth/api_scope/sell.account'
          ]),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,provider'
        });
      
      if (tokenError) {
        console.error('Token storage error:', tokenError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to store tokens' })
        };
      }
      
      // Clean up used state
      await supabase.from('oauth_states').delete().eq('state', state);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'OAuth completed successfully'
        })
      };
    }
    
    // Refresh token endpoint
    if (path === '/refresh' && event.httpMethod === 'POST') {
      const { userId } = JSON.parse(event.body || '{}');
      
      if (!userId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'User ID required' })
        };
      }
      
      // Get existing refresh token
      const { data: tokenData, error: tokenError } = await supabase
        .from('user_oauth_tokens')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'ebay')
        .single();
      
      if (tokenError || !tokenData) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'No tokens found' })
        };
      }
      
      // Decrypt refresh token
      const encryption = new TokenEncryptionService();
      const encryptedRefresh = JSON.parse(tokenData.refresh_token_encrypted);
      const refreshToken = encryption.decrypt(encryptedRefresh);
      
      // Set credentials and refresh
      ebayApi.OAuth2.setCredentials({
        refresh_token: refreshToken
      });
      
      const newTokens = await ebayApi.OAuth2.refreshAuthToken();
      
      // Encrypt and store new tokens
      const encryptedNewTokens = encryption.encryptTokens(newTokens);
      
      await supabase
        .from('user_oauth_tokens')
        .update({
          access_token_encrypted: JSON.stringify(encryptedNewTokens.access_token_encrypted),
          expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('provider', 'ebay');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Token refreshed successfully'
        })
      };
    }
    
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Endpoint not found' })
    };
    
  } catch (error) {
    console.error('eBay OAuth error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'OAuth operation failed',
        message: error.message
      })
    };
  }
};