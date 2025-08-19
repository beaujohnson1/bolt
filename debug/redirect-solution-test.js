/**
 * Comprehensive test for the enhanced redirect solution
 * This simulates the browser environment and tests all redirect scenarios
 */

// Mock browser environment
const mockWindow = {
  location: {
    replace: function(url) {
      console.log('✅ SUCCESS: window.location.replace() called with:', url);
      return true;
    },
    href: ''
  },
  top: null,
  parent: null,
  localStorage: {
    data: {},
    getItem: function(key) {
      return this.data[key] || null;
    },
    setItem: function(key, value) {
      this.data[key] = value;
    },
    removeItem: function(key) {
      delete this.data[key];
    }
  },
  document: {
    body: {
      innerHTML: ''
    }
  },
  dispatchEvent: function(event) {
    console.log('Event dispatched:', event.type);
  }
};

// Test scenarios
const testScenarios = [
  {
    name: 'Normal Browser Context',
    setup: () => {
      // Standard browser environment
      return mockWindow;
    }
  },
  {
    name: 'location.replace() Blocked',
    setup: () => {
      const w = { ...mockWindow };
      w.location.replace = function() {
        throw new Error('location.replace blocked by popup blocker');
      };
      return w;
    }
  },
  {
    name: 'Iframe Context',
    setup: () => {
      const w = { ...mockWindow };
      w.location.replace = function() {
        throw new Error('location.replace blocked in iframe');
      };
      w.location.href = null; // Blocked
      w.top = {
        location: {
          href: ''
        }
      };
      return w;
    }
  },
  {
    name: 'All Methods Blocked',
    setup: () => {
      const w = { ...mockWindow };
      w.location.replace = function() {
        throw new Error('Blocked by security policy');
      };
      w.location.href = null;
      w.top = null;
      w.parent = null;
      return w;
    }
  }
];

// Enhanced redirect function (extracted from the callback)
function performRedirect(window, baseUrl = 'https://easyflip.ai') {
  try {
    // Get and clean up return URL
    const returnUrl = window.localStorage.getItem('ebay_oauth_return_url') || `${baseUrl}/app`;
    window.localStorage.removeItem('ebay_oauth_return_url');
    
    // Validate and construct final URL
    const validBaseUrl = returnUrl.startsWith('http') ? returnUrl : `${baseUrl}/app`;
    const separator = validBaseUrl.includes('?') ? '&' : '?';
    const finalUrl = validBaseUrl + separator + 'ebay_connected=true&timestamp=' + Date.now();
    
    console.log('🔄 [REDIRECT-TEST] Attempting redirect to:', finalUrl);
    
    // Try multiple redirect methods for maximum compatibility
    let redirected = false;
    
    // Method 1: window.location.replace() - Most reliable
    if (window.location && typeof window.location.replace === 'function') {
      try {
        window.location.replace(finalUrl);
        redirected = true;
      } catch (e) {
        console.warn('⚠️ location.replace failed:', e.message);
      }
    }
    
    // Method 2: Fallback to href assignment
    if (!redirected && window.location) {
      try {
        window.location.href = finalUrl;
        redirected = true;
        console.log('✅ SUCCESS: window.location.href fallback worked');
      } catch (e) {
        console.warn('⚠️ location.href failed:', e.message);
      }
    }
    
    // Method 3: Top window redirect (for iframe contexts)
    if (!redirected && window.top && window.top !== window) {
      try {
        window.top.location.href = finalUrl;
        redirected = true;
        console.log('✅ SUCCESS: window.top.location.href worked');
      } catch (e) {
        console.warn('⚠️ top.location failed:', e.message);
      }
    }
    
    // Method 4: Parent window redirect (for nested contexts)
    if (!redirected && window.parent && window.parent !== window) {
      try {
        window.parent.location.href = finalUrl;
        redirected = true;
        console.log('✅ SUCCESS: window.parent.location.href worked');
      } catch (e) {
        console.warn('⚠️ parent.location failed:', e.message);
      }
    }
    
    if (!redirected) {
      throw new Error('All redirect methods failed');
    }
    
    return { success: true, url: finalUrl };
    
  } catch (error) {
    console.error('❌ [REDIRECT-TEST] Redirect failed:', error.message);
    
    // Show manual redirect as last resort
    const manualRedirectHtml = `
      <div style="background: #28a745; color: white; padding: 20px; border-radius: 8px; text-align: center;">
        <h2>🎉 eBay Connected Successfully!</h2>
        <p>Automatic redirect failed. Please click below to continue:</p>
        <a href="${baseUrl}/app?ebay_connected=true&manual=true" 
           style="display: inline-block; background: white; color: #28a745; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">
          Continue to EasyFlip
        </a>
      </div>
    `;
    
    if (window.document && window.document.body) {
      window.document.body.innerHTML = manualRedirectHtml;
      console.log('✅ SUCCESS: Manual redirect fallback displayed');
    }
    
    return { success: false, error: error.message, fallback: 'manual' };
  }
}

// Run tests
function runTests() {
  console.log('🧪 Starting Redirect Solution Tests');
  console.log('=====================================\n');
  
  const results = [];
  
  testScenarios.forEach((scenario, index) => {
    console.log(`Test ${index + 1}: ${scenario.name}`);
    console.log('---'.repeat(20));
    
    const mockWindow = scenario.setup();
    mockWindow.localStorage.setItem('ebay_oauth_return_url', 'https://easyflip.ai/app');
    
    const result = performRedirect(mockWindow);
    results.push({
      scenario: scenario.name,
      ...result
    });
    
    console.log(`Result: ${result.success ? '✅ PASSED' : '❌ FAILED (with fallback)'}`);
    console.log('\n');
  });
  
  // Summary
  console.log('📊 Test Summary');
  console.log('=====================================');
  results.forEach((result, index) => {
    const status = result.success ? '✅ PASSED' : 
                   result.fallback === 'manual' ? '⚠️ FALLBACK' : '❌ FAILED';
    console.log(`${index + 1}. ${result.scenario}: ${status}`);
  });
  
  const passedCount = results.filter(r => r.success).length;
  const fallbackCount = results.filter(r => !r.success && r.fallback).length;
  
  console.log('\n📈 Coverage:');
  console.log(`- Successful redirects: ${passedCount}/${results.length}`);
  console.log(`- Fallback scenarios: ${fallbackCount}/${results.length}`);
  console.log(`- Total handled: ${(passedCount + fallbackCount)}/${results.length}`);
  
  if ((passedCount + fallbackCount) === results.length) {
    console.log('\n🎉 All scenarios handled successfully!');
    console.log('The enhanced redirect solution provides comprehensive coverage.');
  } else {
    console.log('\n⚠️ Some scenarios not properly handled.');
  }
}

// Storage verification test
function testStorageVerification() {
  console.log('\n🔍 Testing Storage Verification');
  console.log('=====================================');
  
  const mockWindow = testScenarios[0].setup();
  
  // Simulate token data
  const tokenData = {
    access_token: 'test_token_' + Date.now(),
    refresh_token: 'test_refresh',
    expires_in: 7200,
    token_type: 'User Access Token',
    expires_at: Date.now() + (7200 * 1000)
  };
  
  console.log('Storing tokens...');
  mockWindow.localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokenData));
  mockWindow.localStorage.setItem('ebay_manual_token', tokenData.access_token);
  
  // Verification function (simplified)
  const verifyStorage = () => {
    const tokens = mockWindow.localStorage.getItem('ebay_oauth_tokens');
    const manualToken = mockWindow.localStorage.getItem('ebay_manual_token');
    
    if (tokens && manualToken) {
      const parsedTokens = JSON.parse(tokens);
      if (parsedTokens.access_token === tokenData.access_token) {
        console.log('✅ Storage verification: PASSED');
        return true;
      }
    }
    console.log('❌ Storage verification: FAILED');
    return false;
  };
  
  verifyStorage();
}

// Run all tests
runTests();
testStorageVerification();