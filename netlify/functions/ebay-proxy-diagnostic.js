// eBay Proxy Diagnostic Endpoint
// Provides comprehensive diagnostics for eBay API connectivity and token validation

const REQUIRED_SCOPES = {
  'sell.account': 'Required for accessing seller account information',
  'sell.inventory': 'Required for managing inventory and listings',
  'sell.marketing': 'Required for promotional campaigns',
  'sell.fulfillment': 'Required for order management'
};

const COMMON_ERROR_PATTERNS = {
  INVALID_TOKEN: /invalid.?token|token.?expired|token.?invalid/i,
  INSUFFICIENT_SCOPE: /insufficient.?scope|scope.?required|missing.?scope/i,
  RATE_LIMIT: /rate.?limit|quota.?exceeded|too.?many.?requests/i,
  BAD_GATEWAY: /bad.?gateway|gateway.?error|upstream.?error/i,
  SERVICE_UNAVAILABLE: /service.?unavailable|temporarily.?unavailable/i
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
    const { token, endpoint } = JSON.parse(event.body || '{}');
    
    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing token',
          message: 'OAuth token is required for diagnostics'
        })
      };
    }

    console.log('🔍 [EBAY-DIAGNOSTIC] Starting comprehensive token diagnostics');

    const diagnostics = {
      timestamp: new Date().toISOString(),
      token: {
        present: !!token,
        length: token ? token.length : 0,
        format: token ? (token.startsWith('v^1.1#') ? 'valid' : 'invalid') : 'missing'
      },
      tests: [],
      recommendations: [],
      overall_status: 'unknown'
    };

    // Test 1: Token format validation
    diagnostics.tests.push(await validateTokenFormat(token));

    // Test 2: Basic API connectivity test
    diagnostics.tests.push(await testBasicConnectivity());

    // Test 3: Token validation with user profile endpoint
    diagnostics.tests.push(await validateTokenWithAPI(token));

    // Test 4: Scope validation for specific endpoints
    if (endpoint) {
      diagnostics.tests.push(await validateEndpointAccess(token, endpoint));
    }

    // Test 5: Account API specific validation
    diagnostics.tests.push(await validateAccountAPIAccess(token));

    // Generate recommendations based on test results
    diagnostics.recommendations = generateRecommendations(diagnostics.tests);
    
    // Determine overall status
    const failedTests = diagnostics.tests.filter(test => !test.passed);
    diagnostics.overall_status = failedTests.length === 0 ? 'healthy' : 
                                failedTests.length < 3 ? 'warning' : 'critical';

    console.log('✅ [EBAY-DIAGNOSTIC] Diagnostics completed:', {
      totalTests: diagnostics.tests.length,
      passedTests: diagnostics.tests.filter(t => t.passed).length,
      status: diagnostics.overall_status
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(diagnostics)
    };

  } catch (error) {
    console.error('❌ [EBAY-DIAGNOSTIC] Diagnostic error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Diagnostic failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

async function validateTokenFormat(token) {
  const test = {
    name: 'Token Format Validation',
    description: 'Validates OAuth token format and structure',
    passed: false,
    details: {},
    recommendations: []
  };

  try {
    if (!token) {
      test.details.error = 'Token is missing';
      test.recommendations.push('Obtain a valid OAuth token from eBay');
      return test;
    }

    if (!token.startsWith('v^1.1#')) {
      test.details.error = 'Invalid token format';
      test.details.actualFormat = token.substring(0, 10) + '...';
      test.recommendations.push('Ensure token is obtained from eBay OAuth 2.0 flow');
      return test;
    }

    // Basic token structure validation
    const parts = token.split('#');
    if (parts.length < 3) {
      test.details.error = 'Token structure appears incomplete';
      test.recommendations.push('Re-authenticate to obtain a complete token');
      return test;
    }

    test.passed = true;
    test.details.format = 'Valid eBay OAuth 2.0 token format';
    test.details.version = parts[0];

  } catch (error) {
    test.details.error = error.message;
    test.recommendations.push('Check token encoding and format');
  }

  return test;
}

async function testBasicConnectivity() {
  const test = {
    name: 'eBay API Connectivity',
    description: 'Tests basic connectivity to eBay API infrastructure',
    passed: false,
    details: {},
    recommendations: []
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://api.ebay.com/sell/account/v1/policies', {
      method: 'HEAD',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    test.details.status = response.status;
    test.details.reachable = true;

    if (response.status === 401) {
      test.passed = true; // API is reachable, just needs auth
      test.details.message = 'eBay API is reachable (401 expected without token)';
    } else if (response.status >= 500) {
      test.details.error = `eBay API server error: ${response.status}`;
      test.recommendations.push('eBay API may be experiencing issues');
    } else {
      test.passed = true;
      test.details.message = 'eBay API is responding normally';
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      test.details.error = 'Connection timeout';
      test.recommendations.push('Check network connectivity');
    } else {
      test.details.error = error.message;
      test.recommendations.push('Verify network access to api.ebay.com');
    }
  }

  return test;
}

async function validateTokenWithAPI(token) {
  const test = {
    name: 'Token API Validation',
    description: 'Validates token by making actual API call',
    passed: false,
    details: {},
    recommendations: []
  };

  try {
    const response = await fetch('https://api.ebay.com/sell/account/v1/policies', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
    });

    test.details.status = response.status;
    test.details.statusText = response.statusText;

    if (response.ok) {
      test.passed = true;
      test.details.message = 'Token is valid and has account access';
      
      // Try to get response to check data
      try {
        const data = await response.json();
        test.details.hasData = !!data;
      } catch (parseError) {
        test.details.parseError = 'Could not parse response';
      }
    } else {
      const errorText = await response.text();
      test.details.errorResponse = errorText;

      // Analyze specific error types
      if (response.status === 401) {
        if (COMMON_ERROR_PATTERNS.INVALID_TOKEN.test(errorText)) {
          test.details.errorType = 'INVALID_TOKEN';
          test.recommendations.push('Token is invalid or expired - re-authenticate');
        } else if (COMMON_ERROR_PATTERNS.INSUFFICIENT_SCOPE.test(errorText)) {
          test.details.errorType = 'INSUFFICIENT_SCOPE';
          test.recommendations.push('Token lacks required scopes - re-authorize with sell.account scope');
        } else {
          test.details.errorType = 'AUTHENTICATION_ERROR';
          test.recommendations.push('Authentication failed - check token format and validity');
        }
      } else if (response.status === 502) {
        test.details.errorType = 'BAD_GATEWAY';
        test.recommendations.push('eBay API gateway error - likely temporary, retry in a few minutes');
      } else if (response.status === 503) {
        test.details.errorType = 'SERVICE_UNAVAILABLE';
        test.recommendations.push('eBay API service unavailable - wait and retry');
      } else if (response.status === 429) {
        test.details.errorType = 'RATE_LIMIT';
        test.recommendations.push('Rate limit exceeded - wait before making more requests');
      }
    }

  } catch (error) {
    test.details.error = error.message;
    test.recommendations.push('Network error or API unreachable');
  }

  return test;
}

async function validateEndpointAccess(token, endpoint) {
  const test = {
    name: 'Endpoint Access Validation',
    description: `Validates access to specific endpoint: ${endpoint}`,
    passed: false,
    details: { endpoint },
    recommendations: []
  };

  try {
    // Map endpoint to required scopes
    const requiredScopes = getRequiredScopes(endpoint);
    test.details.requiredScopes = requiredScopes;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
      }
    });

    test.details.status = response.status;

    if (response.ok) {
      test.passed = true;
      test.details.message = 'Endpoint is accessible with current token';
    } else if (response.status === 403) {
      test.details.errorType = 'FORBIDDEN';
      test.recommendations.push(`Ensure token has required scopes: ${requiredScopes.join(', ')}`);
    } else {
      test.details.errorType = 'ACCESS_ERROR';
      test.recommendations.push('Check endpoint URL and token permissions');
    }

  } catch (error) {
    test.details.error = error.message;
    test.recommendations.push('Could not test endpoint access');
  }

  return test;
}

async function validateAccountAPIAccess(token) {
  const test = {
    name: 'Account API Access',
    description: 'Specifically tests sell.account scope access',
    passed: false,
    details: {},
    recommendations: []
  };

  const accountEndpoints = [
    'https://api.ebay.com/sell/account/v1/policies',
    'https://api.ebay.com/sell/account/v1/fulfillment_policy'
  ];

  const results = [];

  for (const endpoint of accountEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
      });

      results.push({
        endpoint: endpoint.split('/').pop(),
        status: response.status,
        accessible: response.ok
      });

      if (response.status === 502) {
        test.details.has502Error = true;
        test.recommendations.push('502 errors detected - likely scope or token issue');
      }

    } catch (error) {
      results.push({
        endpoint: endpoint.split('/').pop(),
        error: error.message,
        accessible: false
      });
    }
  }

  test.details.endpointResults = results;
  test.passed = results.some(r => r.accessible);

  if (!test.passed) {
    if (results.some(r => r.status === 502)) {
      test.recommendations.push('Multiple 502 errors suggest missing sell.account scope');
    } else if (results.some(r => r.status === 401)) {
      test.recommendations.push('Authentication errors - verify token and scopes');
    }
  }

  return test;
}

function getRequiredScopes(endpoint) {
  if (endpoint.includes('/sell/account/')) {
    return ['sell.account'];
  } else if (endpoint.includes('/sell/inventory/')) {
    return ['sell.inventory'];
  } else if (endpoint.includes('/sell/marketing/')) {
    return ['sell.marketing'];
  } else if (endpoint.includes('/sell/fulfillment/')) {
    return ['sell.fulfillment'];
  }
  return ['unknown'];
}

function generateRecommendations(tests) {
  const recommendations = [];
  const failedTests = tests.filter(test => !test.passed);

  if (failedTests.length === 0) {
    recommendations.push('✅ All tests passed - your eBay integration is working correctly');
    return recommendations;
  }

  // Priority recommendations based on test failures
  const hasTokenFormatIssue = failedTests.some(t => t.name === 'Token Format Validation');
  const hasConnectivityIssue = failedTests.some(t => t.name === 'eBay API Connectivity');
  const hasAuthIssue = failedTests.some(t => t.details.status === 401);
  const has502Issues = failedTests.some(t => t.details.status === 502 || t.details.has502Error);

  if (hasTokenFormatIssue) {
    recommendations.push('🔴 CRITICAL: Fix token format issues first');
  }

  if (hasConnectivityIssue) {
    recommendations.push('🔴 CRITICAL: Resolve network connectivity to eBay API');
  }

  if (hasAuthIssue && !hasTokenFormatIssue) {
    recommendations.push('🟡 IMPORTANT: Re-authenticate with eBay to obtain fresh token');
  }

  if (has502Issues) {
    recommendations.push('🟡 IMPORTANT: 502 errors detected - likely missing sell.account scope');
    recommendations.push('📋 ACTION: Re-authorize with proper scopes: sell.account, sell.inventory');
  }

  // Collect all test-specific recommendations
  failedTests.forEach(test => {
    test.recommendations.forEach(rec => {
      if (!recommendations.includes(rec)) {
        recommendations.push(rec);
      }
    });
  });

  return recommendations;
}