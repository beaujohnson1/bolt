// eBay OAuth Scope Validator
// Validates token scopes before making API calls to prevent 502/503 errors

const SCOPE_ENDPOINTS = {
  'sell.account': [
    'https://api.ebay.com/sell/account/v1/policies',
    'https://api.ebay.com/sell/account/v1/payment_policy',
    'https://api.ebay.com/sell/account/v1/fulfillment_policy',
    'https://api.ebay.com/sell/account/v1/return_policy'
  ],
  'sell.inventory': [
    'https://api.ebay.com/sell/inventory/v1/inventory_item',
    'https://api.ebay.com/sell/inventory/v1/offer',
    'https://api.ebay.com/sell/inventory/v1/location'
  ],
  'sell.marketing': [
    'https://api.ebay.com/sell/marketing/v1/campaign',
    'https://api.ebay.com/sell/marketing/v1/promotion'
  ],
  'sell.fulfillment': [
    'https://api.ebay.com/sell/fulfillment/v1/order'
  ]
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
          message: 'OAuth token is required for scope validation'
        })
      };
    }

    if (!endpoint) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing endpoint',
          message: 'API endpoint is required for scope validation'
        })
      };
    }

    console.log('🔍 [SCOPE-VALIDATOR] Validating scopes for endpoint:', endpoint);

    const validation = await validateScopesForEndpoint(token, endpoint);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(validation)
    };

  } catch (error) {
    console.error('❌ [SCOPE-VALIDATOR] Validation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Validation failed',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

async function validateScopesForEndpoint(token, targetEndpoint) {
  const validation = {
    endpoint: targetEndpoint,
    timestamp: new Date().toISOString(),
    requiredScopes: getRequiredScopesForEndpoint(targetEndpoint),
    scopeTests: [],
    overallValid: false,
    recommendations: []
  };

  console.log('📋 [SCOPE-VALIDATOR] Required scopes:', validation.requiredScopes);

  // Test each required scope
  for (const scope of validation.requiredScopes) {
    const scopeTest = await testSpecificScope(token, scope);
    validation.scopeTests.push(scopeTest);
    
    console.log(`🔍 [SCOPE-VALIDATOR] Scope ${scope}:`, scopeTest.valid ? '✅ Valid' : '❌ Invalid');
  }

  // Determine overall validity
  validation.overallValid = validation.scopeTests.every(test => test.valid);

  // Generate recommendations
  if (!validation.overallValid) {
    const invalidScopes = validation.scopeTests
      .filter(test => !test.valid)
      .map(test => test.scope);\n\n    validation.recommendations = [\n      `Re-authorize your eBay application with the following scopes: ${invalidScopes.join(', ')}`,\n      'Ensure your eBay app configuration includes all required scopes',\n      'Check that your OAuth flow requests the correct scope parameters',\n      'Verify your RuName (redirect URL) is correctly configured'\n    ];\n  } else {\n    validation.recommendations = [\n      '✅ All required scopes are valid for this endpoint'\n    ];\n  }\n\n  return validation;\n}\n\nfunction getRequiredScopesForEndpoint(endpoint) {\n  const scopes = [];\n  \n  Object.entries(SCOPE_ENDPOINTS).forEach(([scope, endpoints]) => {\n    if (endpoints.some(scopeEndpoint => endpoint.includes(scopeEndpoint.replace('https://api.ebay.com', '')))) {\n      scopes.push(scope);\n    }\n  });\n\n  // Default scope detection based on URL patterns\n  if (scopes.length === 0) {\n    if (endpoint.includes('/sell/account/')) {\n      scopes.push('sell.account');\n    } else if (endpoint.includes('/sell/inventory/')) {\n      scopes.push('sell.inventory');\n    } else if (endpoint.includes('/sell/marketing/')) {\n      scopes.push('sell.marketing');\n    } else if (endpoint.includes('/sell/fulfillment/')) {\n      scopes.push('sell.fulfillment');\n    }\n  }\n\n  return scopes.length > 0 ? scopes : ['sell.account']; // Default to account scope\n}\n\nasync function testSpecificScope(token, scope) {\n  const test = {\n    scope,\n    valid: false,\n    statusCode: null,\n    error: null,\n    testEndpoint: null\n  };\n\n  // Get a test endpoint for this scope\n  const testEndpoints = SCOPE_ENDPOINTS[scope];\n  if (!testEndpoints || testEndpoints.length === 0) {\n    test.error = 'No test endpoint available for this scope';\n    return test;\n  }\n\n  test.testEndpoint = testEndpoints[0];\n\n  try {\n    console.log(`🔄 [SCOPE-VALIDATOR] Testing scope ${scope} with endpoint:`, test.testEndpoint);\n    \n    const response = await fetch(test.testEndpoint, {\n      method: 'GET',\n      headers: {\n        'Authorization': `Bearer ${token}`,\n        'Content-Type': 'application/json',\n        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'\n      }\n    });\n\n    test.statusCode = response.status;\n\n    if (response.ok) {\n      test.valid = true;\n      console.log(`✅ [SCOPE-VALIDATOR] Scope ${scope} is valid`);\n    } else if (response.status === 401) {\n      // Check if it's a scope issue or token issue\n      const errorText = await response.text();\n      \n      if (errorText.toLowerCase().includes('scope') || \n          errorText.toLowerCase().includes('permission') ||\n          errorText.toLowerCase().includes('unauthorized')) {\n        test.error = 'Insufficient scope or permissions';\n        test.valid = false;\n      } else {\n        test.error = 'Token authentication failed';\n        test.valid = false;\n      }\n      \n      console.log(`❌ [SCOPE-VALIDATOR] Scope ${scope} failed:`, test.error);\n    } else if (response.status === 502) {\n      // 502 often indicates missing scope\n      test.error = 'Bad Gateway (likely missing scope)';\n      test.valid = false;\n      console.log(`❌ [SCOPE-VALIDATOR] Scope ${scope} failed with 502 (likely missing scope)`);\n    } else {\n      test.error = `HTTP ${response.status}: ${response.statusText}`;\n      test.valid = false;\n      console.log(`❌ [SCOPE-VALIDATOR] Scope ${scope} failed:`, test.error);\n    }\n\n  } catch (error) {\n    test.error = error.message;\n    test.valid = false;\n    console.log(`❌ [SCOPE-VALIDATOR] Scope ${scope} test failed:`, error.message);\n  }\n\n  return test;\n}"