/**
 * Test Script for Proxy Fix Verification
 * Run this after deploying the proxy fix to verify everything works
 */

console.log('🧪 Testing Proxy Fix and OAuth Flow\n');
console.log('='.repeat(50));

// Test 1: Check if tokens are valid
async function testTokenValidity() {
  console.log('\n📋 Test 1: Token Validity Check');
  console.log('-'.repeat(30));
  
  const tokens = localStorage.getItem('ebay_oauth_tokens');
  const accessToken = localStorage.getItem('easyflip_ebay_access_token');
  
  if (!tokens && !accessToken) {
    console.log('❌ No tokens found. Please authenticate first.');
    return false;
  }
  
  let tokenData = {};
  if (tokens) {
    try {
      tokenData = JSON.parse(tokens);
      console.log('✅ Token data parsed successfully');
      
      // Check token format
      if (tokenData.access_token) {
        const tokenLength = tokenData.access_token.length;
        if (tokenLength > 2000) {
          console.log(`❌ Access token suspicious length: ${tokenLength} chars`);
          console.log('   Likely corrupted with debug logs');
          return false;
        }
        console.log(`✅ Access token length OK: ${tokenLength} chars`);
      }
    } catch (e) {
      console.log('❌ Failed to parse token data:', e.message);
      return false;
    }
  }
  
  return true;
}

// Test 2: Test Proxy Function
async function testProxyFunction() {
  console.log('\n📋 Test 2: Proxy Function Test');
  console.log('-'.repeat(30));
  
  const tokens = localStorage.getItem('ebay_oauth_tokens');
  if (!tokens) {
    console.log('⚠️  No tokens available for proxy test');
    return false;
  }
  
  let accessToken;
  try {
    const tokenData = JSON.parse(tokens);
    accessToken = tokenData.access_token;
  } catch (e) {
    console.log('❌ Failed to extract access token');
    return false;
  }
  
  console.log('🔄 Testing proxy with getPrivileges API...');
  
  try {
    const response = await fetch('/.netlify/functions/ebay-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://api.ebay.com/sell/account/v1/privilege',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
    });
    
    console.log(`   Response status: ${response.status}`);
    
    if (response.status === 502) {
      console.log('❌ Proxy returned 502 Bad Gateway');
      const errorData = await response.json();
      console.log('   Error:', errorData);
      return false;
    }
    
    if (response.status === 503) {
      console.log('❌ Proxy returned 503 Service Unavailable');
      console.log('   Circuit breaker may be open due to previous failures');
      return false;
    }
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Proxy working correctly!');
      console.log('   Privileges:', data.privileges?.length || 0);
      return true;
    } else {
      console.log(`⚠️  API returned status: ${response.status}`);
      const errorData = await response.json();
      console.log('   Response:', errorData);
      
      if (response.status === 401) {
        console.log('   Token may be expired. Try reauthenticating.');
      }
      return false;
    }
  } catch (error) {
    console.log('❌ Proxy request failed:', error.message);
    return false;
  }
}

// Test 3: Test Business Policy API
async function testBusinessPolicyAPI() {
  console.log('\n📋 Test 3: Business Policy API Test');
  console.log('-'.repeat(30));
  
  const tokens = localStorage.getItem('ebay_oauth_tokens');
  const scope = localStorage.getItem('easyflip_ebay_token_scope');
  
  if (!tokens) {
    console.log('⚠️  No tokens available for API test');
    return false;
  }
  
  // Check scope
  console.log('🔍 Checking sell.account scope...');
  let hasScope = false;
  
  try {
    const tokenData = JSON.parse(tokens);
    const scopes = (tokenData.scope || scope || '').split(' ');
    hasScope = scopes.some(s => s.includes('sell.account'));
    
    if (hasScope) {
      console.log('✅ sell.account scope found');
    } else {
      console.log('❌ sell.account scope missing');
      console.log('   Available scopes:', scopes.join(', '));
    }
  } catch (e) {
    console.log('❌ Failed to check scope:', e.message);
  }
  
  if (!hasScope) {
    console.log('⚠️  Cannot test Business Policy API without sell.account scope');
    return false;
  }
  
  // Test the actual API
  let accessToken;
  try {
    const tokenData = JSON.parse(tokens);
    accessToken = tokenData.access_token;
  } catch (e) {
    console.log('❌ Failed to extract access token');
    return false;
  }
  
  console.log('🔄 Testing Business Policy API...');
  
  try {
    const response = await fetch('/.netlify/functions/ebay-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://api.ebay.com/sell/account/v1/fulfillment_policy?marketplace_id=EBAY_US',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
    });
    
    console.log(`   Response status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Business Policy API working!');
      console.log(`   Found ${data.total || 0} fulfillment policies`);
      return true;
    } else {
      console.log(`❌ API returned status: ${response.status}`);
      const errorData = await response.json();
      console.log('   Error:', errorData);
      return false;
    }
  } catch (error) {
    console.log('❌ Business Policy API request failed:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n🚀 Starting comprehensive test suite...\n');
  
  const results = {
    tokenValidity: false,
    proxyFunction: false,
    businessPolicyAPI: false
  };
  
  // Run tests
  results.tokenValidity = await testTokenValidity();
  
  if (results.tokenValidity) {
    results.proxyFunction = await testProxyFunction();
    
    if (results.proxyFunction) {
      results.businessPolicyAPI = await testBusinessPolicyAPI();
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Token Validity:      ${results.tokenValidity ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Proxy Function:      ${results.proxyFunction ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Business Policy API: ${results.businessPolicyAPI ? '✅ PASS' : '❌ FAIL'}`);
  
  if (!results.tokenValidity) {
    console.log('\n⚠️  RECOMMENDATION:');
    console.log('1. Run the token cleanup script: cleanup-corrupted-tokens.js');
    console.log('2. Click "Reauthenticate with eBay" to get fresh tokens');
    console.log('3. Run this test again after authentication');
  } else if (!results.proxyFunction) {
    console.log('\n⚠️  RECOMMENDATION:');
    console.log('1. Check if the proxy fix has been deployed');
    console.log('2. Check Netlify function logs for errors');
    console.log('3. Try redeploying the site');
  } else if (!results.businessPolicyAPI) {
    console.log('\n⚠️  RECOMMENDATION:');
    console.log('1. Ensure sell.account scope is granted during OAuth');
    console.log('2. Re-authenticate if scope is missing');
  } else {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('The OAuth flow and Business Policy API are working correctly.');
  }
}

// Run the tests
runAllTests();

// Export for console use
window.testProxyFix = runAllTests;