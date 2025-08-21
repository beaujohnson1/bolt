// Environment Diagnostic Tool for eBay OAuth Configuration
// Provides detailed environment validation and debugging information

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
    console.log('🔍 [ENV-DIAGNOSTIC] Environment diagnostic requested');

    // Gather all environment information
    const envVars = {
      NODE_ENV: process.env.NODE_ENV || 'undefined',
      VITE_EBAY_USE_PRODUCTION: process.env.VITE_EBAY_USE_PRODUCTION || 'undefined',
      CONTEXT: process.env.CONTEXT || 'undefined',
      URL: process.env.URL || 'undefined',
      BUILD_VERSION: process.env.BUILD_VERSION || 'undefined'
    };

    // Get eBay configuration
    const ebayConfig = config.ebay;
    const detectedEnvironment = ebayConfig.environment;
    const isProduction = detectedEnvironment === 'production';
    const credentials = isProduction ? ebayConfig.production : ebayConfig.sandbox;

    // Evaluate environment detection logic step by step
    const envDetectionSteps = {
      viteEbayUseProduction: process.env.VITE_EBAY_USE_PRODUCTION === 'true',
      nodeEnvProduction: process.env.NODE_ENV === 'production',
      combinedResult: (process.env.VITE_EBAY_USE_PRODUCTION === 'true' || process.env.NODE_ENV === 'production'),
      finalEnvironment: (process.env.VITE_EBAY_USE_PRODUCTION === 'true' || process.env.NODE_ENV === 'production') ? 'production' : 'sandbox'
    };

    // Check credential availability
    const credentialCheck = {
      hasAppId: !!credentials.appId,
      hasDevId: !!credentials.devId,
      hasCertId: !!credentials.certId,
      appIdPrefix: credentials.appId ? credentials.appId.substring(0, 8) + '...' : 'missing',
      credentialsComplete: !!(credentials.appId && credentials.devId && credentials.certId)
    };

    // Environment validation warnings
    const warnings = [];
    const errors = [];

    // Check for environment/credential mismatches
    if (isProduction) {
      if (!credentials.appId || !credentials.devId || !credentials.certId) {
        errors.push('Missing required production credentials');
      }
      const hasProdAppId = credentials.appId && !credentials.appId.includes('sandbox');
      if (!hasProdAppId) {
        warnings.push('Running in production mode but credentials appear sandbox-like');
      }
    } else {
      if (!credentials.appId || !credentials.devId || !credentials.certId) {
        errors.push('Missing required sandbox credentials');
      }
      const hasSandboxAppId = credentials.appId && credentials.appId.includes('sandbox');
      if (!hasSandboxAppId && credentials.appId) {
        warnings.push('Running in sandbox mode but credentials appear production-like');
      }
    }

    // Frontend vs Backend consistency check
    const frontendEnvLogic = `(import.meta.env.VITE_EBAY_USE_PRODUCTION === 'true' || import.meta.env.NODE_ENV === 'production') ? 'production' : 'sandbox'`;
    const backendEnvLogic = `(process.env.VITE_EBAY_USE_PRODUCTION === 'true' || process.env.NODE_ENV === 'production') ? 'production' : 'sandbox'`;

    // OAuth endpoints check
    const oauthEndpoints = {
      sandbox: {
        auth: 'https://auth.sandbox.ebay.com/oauth2',
        token: 'https://api.sandbox.ebay.com/identity/v1/oauth2'
      },
      production: {
        auth: 'https://auth.ebay.com/oauth2',
        token: 'https://api.ebay.com/identity/v1/oauth2'
      }
    };

    const currentEndpoints = oauthEndpoints[detectedEnvironment];

    // Redirect URI configuration
    const redirectUriConfig = {
      production: 'easyflip.ai-easyflip-easyfl-cnqajybp',
      sandbox: process.env.EBAY_SANDBOX_RUNAME || `${process.env.URL || 'https://easyflip.ai'}/app/api/ebay/callback-fixed`,
      current: isProduction ? 'easyflip.ai-easyflip-easyfl-cnqajybp' : (process.env.EBAY_SANDBOX_RUNAME || `${process.env.URL || 'https://easyflip.ai'}/app/api/ebay/callback-fixed`)
    };

    // Build comprehensive diagnostic report
    const diagnostic = {
      timestamp: new Date().toISOString(),
      summary: {
        detectedEnvironment: detectedEnvironment,
        isProduction: isProduction,
        credentialsAvailable: credentialCheck.credentialsComplete,
        hasWarnings: warnings.length > 0,
        hasErrors: errors.length > 0,
        overallStatus: errors.length > 0 ? 'ERROR' : (warnings.length > 0 ? 'WARNING' : 'OK')
      },
      environmentVariables: envVars,
      environmentDetection: {
        logic: backendEnvLogic,
        steps: envDetectionSteps,
        frontendLogic: frontendEnvLogic,
        consistencyNote: 'Frontend and backend now use identical environment detection logic'
      },
      credentials: {
        source: isProduction ? 'production' : 'sandbox',
        status: credentialCheck,
        productionCredentials: {
          hasAppId: !!ebayConfig.production.appId,
          hasDevId: !!ebayConfig.production.devId,
          hasCertId: !!ebayConfig.production.certId
        },
        sandboxCredentials: {
          hasAppId: !!ebayConfig.sandbox.appId,
          hasDevId: !!ebayConfig.sandbox.devId,
          hasCertId: !!ebayConfig.sandbox.certId
        }
      },
      oauthConfiguration: {
        endpoints: currentEndpoints,
        redirectUri: redirectUriConfig.current,
        allRedirectUris: redirectUriConfig
      },
      validation: {
        warnings: warnings,
        errors: errors
      },
      recommendations: generateRecommendations(envVars, credentialCheck, warnings, errors, isProduction)
    };

    console.log('✅ [ENV-DIAGNOSTIC] Diagnostic completed:', {
      environment: detectedEnvironment,
      status: diagnostic.summary.overallStatus,
      warnings: warnings.length,
      errors: errors.length
    });

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(diagnostic, null, 2)
    };

  } catch (error) {
    console.error('❌ [ENV-DIAGNOSTIC] Diagnostic failed:', error);
    
    return {
      statusCode: 500,
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Diagnostic failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

function generateRecommendations(envVars, credentialCheck, warnings, errors, isProduction) {
  const recommendations = [];

  if (errors.length > 0) {
    if (!credentialCheck.credentialsComplete) {
      recommendations.push({
        type: 'ERROR',
        issue: 'Missing credentials',
        action: `Add missing ${isProduction ? 'production' : 'sandbox'} eBay credentials to environment variables`,
        priority: 'HIGH'
      });
    }
  }

  if (warnings.length > 0) {
    if (warnings.some(w => w.includes('production mode but credentials appear sandbox-like'))) {
      recommendations.push({
        type: 'WARNING',
        issue: 'Environment/credential mismatch',
        action: 'Verify production credentials are properly configured for production environment',
        priority: 'MEDIUM'
      });
    }
    if (warnings.some(w => w.includes('sandbox mode but credentials appear production-like'))) {
      recommendations.push({
        type: 'WARNING',
        issue: 'Environment/credential mismatch',
        action: 'Verify sandbox credentials are properly configured for development environment',
        priority: 'MEDIUM'
      });
    }
  }

  if (envVars.NODE_ENV === 'undefined' && envVars.VITE_EBAY_USE_PRODUCTION === 'undefined') {
    recommendations.push({
      type: 'INFO',
      issue: 'Environment detection defaults',
      action: 'Set NODE_ENV=production or VITE_EBAY_USE_PRODUCTION=true for production deployment',
      priority: 'LOW'
    });
  }

  if (envVars.CONTEXT === 'undefined') {
    recommendations.push({
      type: 'INFO',
      issue: 'Netlify context missing',
      action: 'This is normal for local development, but should be set in Netlify deployment',
      priority: 'LOW'
    });
  }

  return recommendations;
}