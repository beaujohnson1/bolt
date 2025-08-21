/**
 * OAuth Scope Debugger
 * Tracks exactly what's happening with OAuth scopes
 */

console.log('🔍 OAuth Scope Debugger\n');
console.log('='.repeat(50));

// Function to check all possible scope locations
function checkAllScopes() {
  console.log('\n📋 Checking ALL possible scope storage locations:\n');
  
  // 1. Check ebay_oauth_tokens
  const ebayTokens = localStorage.getItem('ebay_oauth_tokens');
  if (ebayTokens) {
    try {
      const parsed = JSON.parse(ebayTokens);
      console.log('1. ebay_oauth_tokens:');
      console.log('   ✅ Found');
      console.log('   Has scope field:', !!parsed.scope);
      if (parsed.scope) {
        console.log('   Scope value:', parsed.scope);
        console.log('   Scope type:', typeof parsed.scope);
        console.log('   Scope length:', parsed.scope.length);
        
        // Check if scope contains sell.account
        const hasSellAccount = parsed.scope.includes('sell.account');
        console.log('   Contains sell.account:', hasSellAccount ? '✅ YES' : '❌ NO');
      } else {
        console.log('   ❌ No scope field in token object');
      }
    } catch (e) {
      console.log('   ❌ Error parsing:', e.message);
    }
  } else {
    console.log('1. ebay_oauth_tokens: ❌ Not found');
  }
  
  // 2. Check easyflip_ebay_token_scope
  const scopeString = localStorage.getItem('easyflip_ebay_token_scope');
  console.log('\n2. easyflip_ebay_token_scope:');
  if (scopeString) {
    console.log('   ✅ Found');
    console.log('   Value:', scopeString);
    console.log('   Length:', scopeString.length);
    const hasSellAccount = scopeString.includes('sell.account');
    console.log('   Contains sell.account:', hasSellAccount ? '✅ YES' : '❌ NO');
  } else {
    console.log('   ❌ Not found');
  }
  
  // 3. Check individual token fields
  const accessToken = localStorage.getItem('easyflip_ebay_access_token');
  const refreshToken = localStorage.getItem('easyflip_ebay_refresh_token');
  console.log('\n3. Individual token fields:');
  console.log('   easyflip_ebay_access_token:', accessToken ? `✅ Found (${accessToken.length} chars)` : '❌ Not found');
  console.log('   easyflip_ebay_refresh_token:', refreshToken ? `✅ Found (${refreshToken.length} chars)` : '❌ Not found');
  
  // 4. Check for any other OAuth-related keys
  console.log('\n4. Other OAuth-related keys in localStorage:');
  const allKeys = Object.keys(localStorage);
  const oauthKeys = allKeys.filter(key => 
    key.includes('oauth') || key.includes('scope') || key.includes('ebay')
  );
  
  oauthKeys.forEach(key => {
    if (!['ebay_oauth_tokens', 'easyflip_ebay_token_scope', 'easyflip_ebay_access_token', 'easyflip_ebay_refresh_token'].includes(key)) {
      const value = localStorage.getItem(key);
      const preview = value && value.length > 50 ? value.substring(0, 50) + '...' : value;
      console.log(`   ${key}: ${preview}`);
    }
  });
}

// Function to manually set the scope
window.fixScope = function() {
  console.log('\n🔧 Manually fixing scope...\n');
  
  const correctScope = 'https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/commerce.identity.readonly';
  
  // 1. Update ebay_oauth_tokens if it exists
  const ebayTokens = localStorage.getItem('ebay_oauth_tokens');
  if (ebayTokens) {
    try {
      const parsed = JSON.parse(ebayTokens);
      parsed.scope = correctScope;
      localStorage.setItem('ebay_oauth_tokens', JSON.stringify(parsed));
      console.log('✅ Updated scope in ebay_oauth_tokens');
    } catch (e) {
      console.log('❌ Failed to update ebay_oauth_tokens:', e.message);
    }
  }
  
  // 2. Set easyflip_ebay_token_scope
  localStorage.setItem('easyflip_ebay_token_scope', correctScope);
  console.log('✅ Set easyflip_ebay_token_scope');
  
  console.log('\n✨ Scope has been manually fixed!');
  console.log('Try accessing the business policies now.');
};

// Function to monitor OAuth flow
window.monitorOAuth = function() {
  console.log('\n👁️ Monitoring OAuth flow...\n');
  console.log('This will watch for changes to OAuth-related localStorage keys.');
  
  // Store current values
  const currentValues = {};
  ['ebay_oauth_tokens', 'easyflip_ebay_token_scope', 'easyflip_ebay_access_token'].forEach(key => {
    currentValues[key] = localStorage.getItem(key);
  });
  
  // Check every 500ms for changes
  const interval = setInterval(() => {
    ['ebay_oauth_tokens', 'easyflip_ebay_token_scope', 'easyflip_ebay_access_token'].forEach(key => {
      const newValue = localStorage.getItem(key);
      if (newValue !== currentValues[key]) {
        console.log(`\n🔄 CHANGE DETECTED in ${key}:`);
        
        if (key === 'ebay_oauth_tokens' && newValue) {
          try {
            const parsed = JSON.parse(newValue);
            console.log('   Has scope:', !!parsed.scope);
            if (parsed.scope) {
              console.log('   Scope value:', parsed.scope);
            }
          } catch (e) {
            console.log('   Parse error:', e.message);
          }
        } else {
          console.log('   New value:', newValue ? `${newValue.substring(0, 100)}...` : 'null');
        }
        
        currentValues[key] = newValue;
      }
    });
  }, 500);
  
  // Stop after 2 minutes
  setTimeout(() => {
    clearInterval(interval);
    console.log('\n⏹️ Monitoring stopped after 2 minutes');
  }, 120000);
  
  console.log('Monitoring started. Will stop automatically after 2 minutes.');
  console.log('To stop manually, refresh the page.');
};

// Run the check
checkAllScopes();

console.log('\n' + '='.repeat(50));
console.log('\n💡 Available commands:');
console.log('   checkAllScopes() - Check all scope locations again');
console.log('   fixScope() - Manually set the correct scope');
console.log('   monitorOAuth() - Monitor OAuth flow for 2 minutes');
console.log('\n⚠️ If no scope is found, run fixScope() as a temporary workaround.');