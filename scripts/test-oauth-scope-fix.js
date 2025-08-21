/**
 * Test script for OAuth scope fix
 * This script verifies that the sell.account scope is properly handled
 */

console.log('🔍 Testing OAuth Scope Fix...\n');

// Test 1: Check if scope is stored correctly
function testScopeStorage() {
  console.log('Test 1: Scope Storage Verification');
  console.log('=================================');
  
  const ebayTokens = localStorage.getItem('ebay_oauth_tokens');
  const easyflipScope = localStorage.getItem('easyflip_ebay_token_scope');
  
  if (ebayTokens) {
    try {
      const parsed = JSON.parse(ebayTokens);
      console.log('✅ ebay_oauth_tokens found');
      console.log('   Scope:', parsed.scope || 'NO SCOPE IN TOKEN OBJECT');
      
      if (parsed.scope) {
        const scopes = parsed.scope.split(' ');
        console.log('   Scopes array:', scopes);
        const hasSellAccount = scopes.some(s => s.includes('sell.account'));
        console.log('   Has sell.account:', hasSellAccount ? '✅ YES' : '❌ NO');
      }
    } catch (e) {
      console.log('❌ Failed to parse ebay_oauth_tokens:', e.message);
    }
  } else {
    console.log('⚠️ No ebay_oauth_tokens found');
  }
  
  if (easyflipScope) {
    console.log('\n✅ easyflip_ebay_token_scope found');
    console.log('   Value:', easyflipScope);
    const scopes = easyflipScope.split(' ');
    console.log('   Scopes array:', scopes);
    const hasSellAccount = scopes.some(s => s.includes('sell.account'));
    console.log('   Has sell.account:', hasSellAccount ? '✅ YES' : '❌ NO');
  } else {
    console.log('\n⚠️ No easyflip_ebay_token_scope found');
  }
  
  console.log('\n');
}

// Test 2: Simulate the BusinessPolicyService validation
function testBusinessPolicyValidation() {
  console.log('Test 2: BusinessPolicyService Validation');
  console.log('=========================================');
  
  function validateTokenScope(requiredScope) {
    let scopes = [];
    
    // Check primary location first (ebay_oauth_tokens)
    const tokens = localStorage.getItem('ebay_oauth_tokens');
    if (tokens) {
      try {
        const tokenData = JSON.parse(tokens);
        if (tokenData.scope) {
          scopes = tokenData.scope.split(' ').filter(Boolean);
          console.log('   Found scopes in ebay_oauth_tokens:', scopes);
        }
      } catch (e) {
        console.warn('   Failed to parse ebay_oauth_tokens:', e);
      }
    }
    
    // Fallback to easyflip_ebay_token_scope if no scopes found
    if (scopes.length === 0) {
      const scopeString = localStorage.getItem('easyflip_ebay_token_scope');
      if (scopeString) {
        scopes = scopeString.split(' ').filter(Boolean);
        console.log('   Found scopes in easyflip_ebay_token_scope:', scopes);
      }
    }
    
    // Check if we have any scopes
    if (scopes.length === 0) {
      console.warn('   No OAuth scopes found in localStorage');
      return false;
    }
    
    // Check if required scope is present (handle both full URL and short form)
    const hasScope = scopes.some(scope => 
      scope.includes(requiredScope) || 
      scope === `https://api.ebay.com/oauth/api_scope/${requiredScope}`
    );
    
    if (!hasScope) {
      console.warn(`   OAuth token missing required scope: ${requiredScope}`);
      console.warn(`   Current scopes: ${scopes.join(', ')}`);
      return false;
    }
    
    console.log(`   ✅ Scope ${requiredScope} validated successfully`);
    return true;
  }
  
  const result = validateTokenScope('sell.account');
  console.log(`\n   Final result: ${result ? '✅ PASS' : '❌ FAIL'}`);
  console.log('\n');
}

// Test 3: Check all localStorage keys related to eBay
function testAllStorageKeys() {
  console.log('Test 3: All eBay-related localStorage Keys');
  console.log('==========================================');
  
  const ebayKeys = Object.keys(localStorage).filter(key => 
    key.toLowerCase().includes('ebay') || 
    key.toLowerCase().includes('oauth')
  );
  
  console.log(`Found ${ebayKeys.length} eBay-related keys:\n`);
  
  ebayKeys.forEach(key => {
    const value = localStorage.getItem(key);
    const preview = value && value.length > 100 
      ? value.substring(0, 100) + '...' 
      : value;
    console.log(`   ${key}: ${preview}`);
  });
  
  console.log('\n');
}

// Test 4: Provide fix instructions
function provideFix() {
  console.log('Fix Instructions');
  console.log('================');
  console.log('If sell.account scope is missing, try these steps:\n');
  console.log('1. Clear all OAuth tokens:');
  console.log('   - Click "Reauthenticate with eBay" button');
  console.log('   - This will clear existing tokens and start fresh\n');
  console.log('2. During reauthentication:');
  console.log('   - Make sure to grant ALL requested permissions');
  console.log('   - Look for "sell.account" in the permissions list\n');
  console.log('3. After authentication:');
  console.log('   - Check the console for scope validation messages');
  console.log('   - Run this test script again to verify\n');
  console.log('4. If still failing:');
  console.log('   - Check the network tab for the token exchange response');
  console.log('   - Look for the "scope" field in the response');
  console.log('   - Ensure it contains all 4 required scopes\n');
}

// Run all tests
testScopeStorage();
testBusinessPolicyValidation();
testAllStorageKeys();
provideFix();

console.log('✅ OAuth Scope Fix Test Complete!\n');
console.log('Summary:');
console.log('- BusinessPolicyService now checks both storage locations');
console.log('- Callback script ensures scope is stored in both locations');
console.log('- Enhanced logging helps diagnose scope issues');
console.log('- Fallback to default scopes if none provided');