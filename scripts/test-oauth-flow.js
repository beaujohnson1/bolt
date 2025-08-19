/**
 * Automated OAuth Flow Test Script
 * Tests the complete eBay OAuth flow and identifies issues
 */

const testOAuthFlow = async () => {
  console.log('🧪 [OAUTH-TEST] Starting automated OAuth flow test...');

  // Test 1: Check if debug tools are available
  console.log('\n📋 Test 1: Debug Tools Availability');
  if (typeof window.debugEbayAuth === 'function') {
    console.log('✅ debugEbayAuth available');
    window.debugEbayAuth();
  } else {
    console.log('❌ debugEbayAuth not available');
  }

  if (typeof window.oauthDebugger !== 'undefined') {
    console.log('✅ oauthDebugger available');
    const results = await window.oauthDebugger.runDebug();
    console.log('📊 Debug results:', results);
  } else {
    console.log('❌ oauthDebugger not available');
  }

  // Test 2: Simulate token storage
  console.log('\n📋 Test 2: Token Storage Simulation');
  const testTokens = {
    access_token: 'v^1.1#i^1#r^0#test_token_' + Date.now(),
    refresh_token: 'v^1.1#i^1#p^3#test_refresh_' + Date.now(),
    expires_in: 7200,
    token_type: 'User Access Token',
    expires_at: Date.now() + (7200 * 1000)
  };

  try {
    // Store tokens
    localStorage.setItem('ebay_oauth_tokens', JSON.stringify(testTokens));
    localStorage.setItem('ebay_manual_token', testTokens.access_token);
    console.log('✅ Test tokens stored successfully');

    // Test immediate authentication check
    const isAuthImmediate = window.ebayOAuth?.isAuthenticated();
    console.log('🔍 Immediate auth check:', isAuthImmediate);

    // Test after delay
    setTimeout(() => {
      const isAuthDelayed = window.ebayOAuth?.isAuthenticated();
      console.log('🔍 Delayed auth check:', isAuthDelayed);
    }, 100);

    // Trigger storage events
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'ebay_oauth_tokens',
      newValue: JSON.stringify(testTokens),
      storageArea: localStorage
    }));

    window.dispatchEvent(new CustomEvent('ebayAuthChanged', {
      detail: { authenticated: true, tokens: testTokens }
    }));

    console.log('✅ Events dispatched');

  } catch (error) {
    console.error('❌ Token storage test failed:', error);
  }

  // Test 3: Simulate OAuth callback URL
  console.log('\n📋 Test 3: OAuth Callback URL Simulation');
  const originalUrl = window.location.href;
  const testUrl = new URL(window.location.href);
  testUrl.searchParams.set('ebay_connected', 'true');
  testUrl.searchParams.set('timestamp', Date.now().toString());

  try {
    // Simulate URL change without actually navigating
    console.log('🔗 Simulating OAuth callback URL:', testUrl.toString());
    
    // Test URL parameter detection
    const urlParams = new URLSearchParams(testUrl.search);
    const hasEbayConnected = urlParams.get('ebay_connected') === 'true';
    console.log('🔍 URL parameter detection:', hasEbayConnected);

  } catch (error) {
    console.error('❌ URL simulation test failed:', error);
  }

  // Test 4: Component State Simulation
  console.log('\n📋 Test 4: Component State Test');
  try {
    // Check if React components are responding
    const authButtons = document.querySelectorAll('[data-testid="ebay-auth-button"]');
    const authStatus = document.querySelectorAll('[data-testid="auth-status"]');
    
    console.log('🎯 Found auth components:', {
      authButtons: authButtons.length,
      authStatus: authStatus.length
    });

    // Check for authentication indicators
    const authIndicators = document.querySelectorAll('.text-green-600, .bg-green-50');
    console.log('🟢 Found success indicators:', authIndicators.length);

  } catch (error) {
    console.error('❌ Component state test failed:', error);
  }

  // Test 5: Network Connectivity
  console.log('\n📋 Test 5: Network Connectivity');
  try {
    const response = await fetch('/.netlify/functions/ebay-oauth?action=health-check', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      console.log('✅ eBay OAuth endpoint accessible');
    } else {
      console.log('⚠️ eBay OAuth endpoint status:', response.status);
    }
  } catch (error) {
    console.error('❌ Network connectivity test failed:', error);
  }

  // Clean up test data
  console.log('\n🧹 Cleaning up test data...');
  localStorage.removeItem('ebay_oauth_tokens');
  localStorage.removeItem('ebay_manual_token');

  console.log('✅ OAuth flow test complete!');
};

// Make available globally
window.testOAuthFlow = testOAuthFlow;

// Auto-run if page has specific parameter
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('auto_test') === 'true') {
  setTimeout(testOAuthFlow, 1000);
}

console.log('🧪 OAuth Flow Test Script loaded. Run testOAuthFlow() to start testing.');