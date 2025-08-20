/**
 * Health check endpoint for eBay API OAuth
 * Use this to verify the function is deployed and environment variables are set
 */

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Check for health endpoint
  if (event.path.includes('/health')) {
    const requiredVars = [
      'EBAY_APP_ID',
      'EBAY_CERT_ID',
      'EBAY_DEV_ID',
      'EBAY_RU_NAME',
      'ENCRYPTION_KEY',
      'SUPABASE_URL',
      'SUPABASE_SERVICE_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    const configuredVars = requiredVars.filter(varName => process.env[varName]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: missingVars.length === 0 ? 'healthy' : 'unhealthy',
        message: missingVars.length === 0 
          ? '✅ All required environment variables are configured!' 
          : `⚠️ Missing ${missingVars.length} environment variable(s)`,
        configured: configuredVars.length,
        missing: missingVars.length,
        missingVars: missingVars,
        timestamp: new Date().toISOString(),
        endpoint: '/.netlify/functions/ebay-api-oauth',
        ready: missingVars.length === 0
      })
    };
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: 'Not found' })
  };
};