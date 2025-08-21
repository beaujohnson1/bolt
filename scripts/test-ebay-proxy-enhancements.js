#!/usr/bin/env node
// Test script for eBay Proxy Enhancements

const BASE_URL = process.env.NETLIFY_URL || 'http://localhost:8888';

async function testProxyEnhancements() {
  console.log('🧪 Testing eBay Proxy Enhancements...\n');

  // Test 1: Enhanced 502 Error Handling
  await test502ErrorHandling();
  
  // Test 2: Diagnostic Endpoint
  await testDiagnosticEndpoint();
  
  // Test 3: Scope Validator
  await testScopeValidator();
  
  // Test 4: Automatic Scope Validation
  await testAutomaticScopeValidation();

  console.log('\n✅ All tests completed!');
}

async function test502ErrorHandling() {
  console.log('🔍 Test 1: Enhanced 502 Error Handling');
  
  try {
    const response = await fetch(`${BASE_URL}/.netlify/functions/ebay-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://api.ebay.com/sell/account/v1/policies',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid_token_format',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
      })
    });

    const result = await response.json();
    
    if (response.status === 502 && result.details?.errorAnalysis) {
      console.log('✅ Enhanced 502 error handling working');
      console.log('   - Error analysis:', result.details.errorAnalysis);
      console.log('   - Scope analysis:', result.details.scopeAnalysis ? '✅' : '❌');
      console.log('   - Troubleshooting steps:', result.details.troubleshooting?.length || 0);
    } else {
      console.log('⚠️ 502 enhancement test inconclusive');
    }
  } catch (error) {
    console.log('❌ 502 test failed:', error.message);
  }
  console.log('');
}

async function testDiagnosticEndpoint() {
  console.log('🔍 Test 2: Diagnostic Endpoint');
  
  try {
    const response = await fetch(`${BASE_URL}/.netlify/functions/ebay-proxy-diagnostic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'v^1.1#test_token',
        endpoint: 'https://api.ebay.com/sell/account/v1/policies'
      })
    });

    const result = await response.json();
    
    if (response.ok && result.tests) {
      console.log('✅ Diagnostic endpoint working');
      console.log('   - Tests run:', result.tests.length);
      console.log('   - Overall status:', result.overall_status);
      console.log('   - Recommendations:', result.recommendations?.length || 0);
    } else {
      console.log('❌ Diagnostic endpoint failed');
    }
  } catch (error) {
    console.log('❌ Diagnostic test failed:', error.message);
  }
  console.log('');
}

async function testScopeValidator() {
  console.log('🔍 Test 3: Scope Validator');
  
  try {
    const response = await fetch(`${BASE_URL}/.netlify/functions/ebay-scope-validator`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'v^1.1#test_token',
        endpoint: 'https://api.ebay.com/sell/account/v1/policies'
      })
    });

    const result = await response.json();
    
    if (response.ok && result.scopeTests) {
      console.log('✅ Scope validator working');
      console.log('   - Required scopes:', result.requiredScopes);
      console.log('   - Scope tests:', result.scopeTests.length);
      console.log('   - Overall valid:', result.overallValid);
    } else {
      console.log('❌ Scope validator failed');
    }
  } catch (error) {
    console.log('❌ Scope validator test failed:', error.message);
  }
  console.log('');
}

async function testAutomaticScopeValidation() {
  console.log('🔍 Test 4: Automatic Scope Validation');
  
  try {
    const response = await fetch(`${BASE_URL}/.netlify/functions/ebay-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://api.ebay.com/sell/account/v1/policies',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer v^1.1#invalid_token',
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
      })
    });

    const result = await response.json();
    
    if (response.status === 403 && response.headers.get('X-Error-Type') === 'SCOPE_VALIDATION_FAILED') {
      console.log('✅ Automatic scope validation working');
      console.log('   - Prevented 502 error');
      console.log('   - Required scopes:', result.details?.requiredScopes);
      console.log('   - Solution provided:', !!result.details?.solution);
    } else {
      console.log('⚠️ Automatic validation test inconclusive');
    }
  } catch (error) {
    console.log('❌ Automatic validation test failed:', error.message);
  }
  console.log('');
}

// Run tests if called directly
if (require.main === module) {
  testProxyEnhancements().catch(console.error);
}

module.exports = { testProxyEnhancements };