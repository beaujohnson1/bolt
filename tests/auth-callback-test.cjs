// Test suite for eBay OAuth Callback Function
// Tests various error scenarios and success paths

const { handler } = require('../netlify/functions/auth-ebay-callback.cjs');

// Mock context object
const mockContext = {
  awsRequestId: 'test-request-123',
  getRemainingTimeInMillis: () => 30000
};

// Test scenarios
const testScenarios = [
  {
    name: 'Successful OAuth Callback',
    event: {
      httpMethod: 'GET',
      queryStringParameters: {
        code: 'test_auth_code_12345',
        state: 'test_state_67890'
      },
      path: '/auth-ebay-callback'
    },
    expectedStatus: 200,
    shouldContain: ['eBay Connected Successfully', 'Redirecting']
  },
  {
    name: 'OAuth Error from eBay',
    event: {
      httpMethod: 'GET',
      queryStringParameters: {
        error: 'access_denied',
        error_description: 'User denied the request'
      },
      path: '/auth-ebay-callback'
    },
    expectedStatus: 400,
    shouldContain: ['eBay Authentication Error', 'User denied the request']
  },
  {
    name: 'Missing Authorization Code',
    event: {
      httpMethod: 'GET',
      queryStringParameters: {
        state: 'test_state_67890'
      },
      path: '/auth-ebay-callback'
    },
    expectedStatus: 400,
    shouldContain: ['Missing Authorization Code', 'authorization code was not provided']
  },
  {
    name: 'OPTIONS Request (CORS Preflight)',
    event: {
      httpMethod: 'OPTIONS',
      path: '/auth-ebay-callback'
    },
    expectedStatus: 200,
    shouldContain: []
  },
  {
    name: 'Empty Query Parameters',
    event: {
      httpMethod: 'GET',
      queryStringParameters: {},
      path: '/auth-ebay-callback'
    },
    expectedStatus: 400,
    shouldContain: ['Missing Authorization Code']
  }
];

// Mock fetch for successful token exchange
global.fetch = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      access_token: 'mock_access_token_12345',
      refresh_token: 'mock_refresh_token_67890',
      expires_in: 7200,
      token_type: 'Bearer',
      scope: 'https://api.ebay.com/oauth/api_scope/sell.inventory'
    })
  });

// Test runner
async function runTests() {
  console.log('🧪 Starting eBay OAuth Callback Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const scenario of testScenarios) {
    try {
      console.log(`Testing: ${scenario.name}`);
      
      const result = await handler(scenario.event, mockContext);
      
      // Check status code
      if (result.statusCode === scenario.expectedStatus) {
        console.log(`✅ Status Code: ${result.statusCode}`);
      } else {
        console.log(`❌ Status Code: Expected ${scenario.expectedStatus}, got ${result.statusCode}`);
        failed++;
        continue;
      }
      
      // Check headers
      if (result.headers) {
        console.log(`✅ Headers present`);
        
        // Check CORS headers
        if (result.headers['Access-Control-Allow-Origin']) {
          console.log(`✅ CORS headers set`);
        }
      }
      
      // Check content for expected strings
      if (scenario.shouldContain.length > 0 && result.body) {
        let contentChecks = 0;
        for (const content of scenario.shouldContain) {
          if (result.body.includes(content)) {
            console.log(`✅ Contains: "${content}"`);
            contentChecks++;
          } else {
            console.log(`❌ Missing: "${content}"`);
          }
        }
        
        if (contentChecks === scenario.shouldContain.length) {
          console.log(`✅ All content checks passed`);
          passed++;
        } else {
          console.log(`❌ Content checks failed`);
          failed++;
        }
      } else {
        // No content checks required
        passed++;
      }
      
      console.log(`✅ Test passed: ${scenario.name}\n`);
      
    } catch (error) {
      console.log(`❌ Test failed: ${scenario.name}`);
      console.log(`Error: ${error.message}\n`);
      failed++;
    }
  }
  
  console.log(`\n🏁 Test Results:`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${passed + failed}`);
  
  if (failed === 0) {
    console.log(`\n🎉 All tests passed!`);
  } else {
    console.log(`\n⚠️ Some tests failed. Please review the implementation.`);
  }
}

// Export for use in other test files
module.exports = {
  testScenarios,
  runTests
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}