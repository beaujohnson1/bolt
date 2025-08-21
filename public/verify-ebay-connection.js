/**
 * eBay Connection Verifier
 * Tests if you're actually connected to eBay
 */

console.log('🔍 eBay Connection Verification\n');
console.log('='.repeat(50));

async function verifyEbayConnection() {
  console.log('\n📋 Step 1: Checking for tokens...');
  
  // Check for tokens
  const hasTokens = localStorage.getItem('easyflip_ebay_access_token') || 
                    localStorage.getItem('ebay_oauth_tokens');
  
  if (!hasTokens) {
    console.log('❌ No eBay tokens found. You are NOT authenticated.');
    return false;
  }
  
  console.log('✅ Tokens found');
  
  // Get the access token
  let accessToken = localStorage.getItem('easyflip_ebay_access_token');
  if (!accessToken) {
    const tokens = localStorage.getItem('ebay_oauth_tokens');
    if (tokens) {
      try {
        const parsed = JSON.parse(tokens);
        accessToken = parsed.access_token;
      } catch (e) {
        console.log('❌ Error parsing tokens');
        return false;
      }
    }
  }
  
  if (!accessToken) {
    console.log('❌ No access token found');
    return false;
  }
  
  console.log(`✅ Access token found (${accessToken.length} characters)`);
  
  // Check if it looks like a real token (not debug data)
  if (accessToken.length > 2000 || accessToken.includes('timestamp') || accessToken.includes('console')) {
    console.log('⚠️ WARNING: Token appears to be corrupted with debug data');
    return false;
  }
  
  console.log('\n📋 Step 2: Testing eBay API connection...');
  
  try {
    // Test with a simple API call - get user privileges
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
    
    console.log(`   API Response status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('❌ Token is expired or invalid - eBay rejected authentication');
      console.log('   You need to re-authenticate');
      return false;
    }
    
    if (response.status === 403) {
      console.log('⚠️ Token is valid but missing required scopes');
      console.log('✅ You ARE authenticated with eBay!');
      console.log('❌ But missing sell.account permission');
      return true; // Authenticated but missing scope
    }
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ eBay API responded successfully!');
      console.log('✅ You ARE fully authenticated with eBay!');
      
      if (data.privileges) {
        console.log(`   Your account has ${data.privileges.length} privileges`);
      }
      return true;
    }
    
    console.log(`⚠️ Unexpected response: ${response.status}`);
    const errorData = await response.json();
    console.log('   Error:', errorData);
    
  } catch (error) {
    console.log('❌ Failed to connect to eBay API:', error.message);
    return false;
  }
  
  return false;
}

// Test eBay categories (public API - doesn't need special scopes)
async function testPublicAPI() {
  console.log('\n📋 Step 3: Testing public API access...');
  
  try {
    // This should work even without sell.account scope
    const response = await fetch('/.netlify/functions/ebay-proxy', {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: 'https://api.ebay.com/commerce/taxonomy/v1/category_tree/0',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })
    });
    
    if (response.ok) {
      console.log('✅ Public API works - Basic eBay connection confirmed');
      return true;
    } else {
      console.log('❌ Public API failed - Connection issues');
      return false;
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
    return false;
  }
}

// Main verification
async function runVerification() {
  console.log('\n🚀 Starting eBay connection verification...\n');
  
  const isConnected = await verifyEbayConnection();
  const publicWorks = await testPublicAPI();
  
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 VERIFICATION RESULTS:\n');
  
  if (isConnected && publicWorks) {
    console.log('✅ You ARE authenticated with eBay!');
    console.log('✅ Your eBay account is connected');
    console.log('⚠️ But the scope/permissions may not be stored correctly');
    console.log('\nThe issue is ONLY with storing which permissions you granted.');
    console.log('Your eBay authentication itself is working.');
  } else if (publicWorks && !isConnected) {
    console.log('⚠️ Partial connection to eBay');
    console.log('✅ Network connection works');
    console.log('❌ Authentication token is invalid or expired');
    console.log('\nYou need to re-authenticate with eBay.');
  } else {
    console.log('❌ NOT connected to eBay');
    console.log('You need to authenticate with eBay first.');
  }
  
  console.log('\n💡 Next steps:');
  console.log('1. Run the scope debugger to check scope storage');
  console.log('2. Use fixScope() to manually set permissions');
  console.log('3. Or re-authenticate to get fresh tokens');
}

// Run the verification
runVerification();

// Export for manual use
window.verifyEbayConnection = runVerification;