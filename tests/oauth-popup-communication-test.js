/**
 * OAuth Popup Communication Test
 * Tests the enhanced popup-to-parent communication fixes
 */

// Test configuration
const TEST_CONFIG = {
  testDuration: 30000, // 30 seconds
  messageInterval: 1000, // Send test message every second
  tokenCheckInterval: 500, // Check for tokens every 500ms
  origins: [
    window.location.origin,
    'https://easyflip.ai',
    'https://localhost:5173',
    'http://localhost:5173'
  ]
};

// Test state
let testResults = {
  messagesReceived: 0,
  tokenChecksPerformed: 0,
  broadcastChannelMessages: 0,
  storageEvents: 0,
  authEventsTriggered: 0,
  totalTests: 0,
  passedTests: 0
};

/**
 * Test enhanced postMessage handling
 */
function testPostMessageHandling() {
  console.log('🧪 [OAUTH-TEST] Testing enhanced postMessage handling...');
  
  const messageTypes = [
    'EBAY_OAUTH_SUCCESS',
    'EBAY_OAUTH_TOKEN_STORED',
    'EBAY_OAUTH_ERROR'
  ];
  
  messageTypes.forEach((messageType, index) => {
    setTimeout(() => {
      const testMessage = {
        type: messageType,
        source: 'oauth_test',
        timestamp: Date.now(),
        tokens: messageType === 'EBAY_OAUTH_SUCCESS' ? {
          access_token: 'test_token_' + Date.now(),
          refresh_token: 'test_refresh_' + Date.now(),
          expires_in: 7200,
          token_type: 'Bearer'
        } : undefined,
        error: messageType === 'EBAY_OAUTH_ERROR' ? 'Test error message' : undefined
      };
      
      // Test multiple origins
      TEST_CONFIG.origins.forEach(origin => {
        window.postMessage(testMessage, origin);
        console.log(`📨 [OAUTH-TEST] Sent ${messageType} to origin: ${origin}`);
      });
      
      testResults.totalTests++;
      
    }, index * 1000);
  });
}

/**
 * Test BroadcastChannel communication
 */
function testBroadcastChannel() {
  console.log('🧪 [OAUTH-TEST] Testing BroadcastChannel communication...');
  
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('ebay-auth');
      
      // Send test messages
      const testMessages = [
        {
          type: 'AUTH_CHANGED',
          authenticated: true,
          source: 'oauth_test',
          timestamp: Date.now()
        },
        {
          type: 'TOKEN_STORED',
          tokens: { access_token: 'test_broadcast_token' },
          timestamp: Date.now()
        }
      ];
      
      testMessages.forEach((message, index) => {
        setTimeout(() => {
          channel.postMessage(message);
          console.log('📡 [OAUTH-TEST] Sent BroadcastChannel message:', message.type);
          testResults.totalTests++;
        }, index * 2000);
      });
      
      channel.close();
      
    } catch (error) {
      console.error('❌ [OAUTH-TEST] BroadcastChannel test failed:', error);
    }
  } else {
    console.warn('⚠️ [OAUTH-TEST] BroadcastChannel not supported');
  }
}

/**
 * Test localStorage monitoring
 */
function testLocalStorageMonitoring() {
  console.log('🧪 [OAUTH-TEST] Testing localStorage monitoring...');
  
  const testTokens = {
    access_token: 'test_storage_token_' + Date.now(),
    refresh_token: 'test_storage_refresh_' + Date.now(),
    expires_in: 7200,
    token_type: 'Bearer',
    expires_at: Date.now() + (7200 * 1000)
  };
  
  setTimeout(() => {
    // Test OAuth tokens storage
    localStorage.setItem('ebay_oauth_tokens', JSON.stringify(testTokens));
    console.log('💾 [OAUTH-TEST] Stored OAuth tokens in localStorage');
    testResults.totalTests++;
  }, 5000);
  
  setTimeout(() => {
    // Test manual token storage
    localStorage.setItem('ebay_manual_token', testTokens.access_token);
    console.log('💾 [OAUTH-TEST] Stored manual token in localStorage');
    testResults.totalTests++;
  }, 7000);
  
  setTimeout(() => {
    // Clean up test tokens
    localStorage.removeItem('ebay_oauth_tokens');
    localStorage.removeItem('ebay_manual_token');
    console.log('🧹 [OAUTH-TEST] Cleaned up test tokens');
  }, 25000);
}

/**
 * Test custom event dispatching
 */
function testCustomEventDispatching() {
  console.log('🧪 [OAUTH-TEST] Testing custom event dispatching...');
  
  const eventTypes = [
    'ebayAuthChanged',
    'ebayTokenDetected',
    'oauthSuccess',
    'ebayTokenVerified'
  ];
  
  eventTypes.forEach((eventType, index) => {
    setTimeout(() => {
      const customEvent = new CustomEvent(eventType, {
        detail: {
          authenticated: true,
          source: 'oauth_test',
          timestamp: Date.now(),
          testEvent: true
        }
      });
      
      window.dispatchEvent(customEvent);
      console.log(`🎉 [OAUTH-TEST] Dispatched custom event: ${eventType}`);
      testResults.totalTests++;
      
    }, (index + 1) * 3000);
  });
}

/**
 * Set up event listeners to track responses
 */
function setupEventListeners() {
  console.log('👂 [OAUTH-TEST] Setting up event listeners...');
  
  // Listen for authentication events
  const authEvents = [
    'ebayAuthChanged',
    'ebayTokenDetected', 
    'oauthSuccess',
    'ebayTokenVerified'
  ];
  
  authEvents.forEach(eventType => {
    window.addEventListener(eventType, (event) => {
      console.log(`📨 [OAUTH-TEST] Received ${eventType}:`, event.detail);
      testResults.authEventsTriggered++;
      
      if (event.detail?.testEvent !== true) {
        testResults.passedTests++;
      }
    });
  });
  
  // Listen for storage events
  window.addEventListener('storage', (event) => {
    if (event.key?.includes('ebay')) {
      console.log('💾 [OAUTH-TEST] Storage event detected:', {
        key: event.key,
        newValue: event.newValue?.substring(0, 50) + '...',
        source: 'storage_listener'
      });
      testResults.storageEvents++;
    }
  });
  
  // Listen for BroadcastChannel if supported
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel('ebay-auth');
      channel.addEventListener('message', (event) => {
        console.log('📡 [OAUTH-TEST] BroadcastChannel message received:', event.data);
        testResults.broadcastChannelMessages++;
        
        if (event.data?.source !== 'oauth_test') {
          testResults.passedTests++;
        }
      });
      
      // Clean up after test
      setTimeout(() => {
        channel.close();
      }, TEST_CONFIG.testDuration);
      
    } catch (error) {
      console.warn('⚠️ [OAUTH-TEST] Could not set up BroadcastChannel listener:', error);
    }
  }
}

/**
 * Generate test report
 */
function generateTestReport() {
  console.log('\n🔍 [OAUTH-TEST] === FINAL TEST REPORT ===');
  console.log('📊 Test Results:', testResults);
  
  const successRate = testResults.totalTests > 0 ? 
    (testResults.passedTests / testResults.totalTests * 100).toFixed(1) : 0;
  
  console.log(`✅ Success Rate: ${successRate}%`);
  console.log(`📨 Auth Events Triggered: ${testResults.authEventsTriggered}`);
  console.log(`💾 Storage Events: ${testResults.storageEvents}`);
  console.log(`📡 BroadcastChannel Messages: ${testResults.broadcastChannelMessages}`);
  
  const recommendations = [];
  
  if (testResults.authEventsTriggered === 0) {
    recommendations.push('❌ No auth events triggered - check event listeners');
  }
  
  if (testResults.storageEvents === 0) {
    recommendations.push('❌ No storage events detected - check localStorage monitoring');
  }
  
  if (testResults.broadcastChannelMessages === 0 && typeof BroadcastChannel !== 'undefined') {
    recommendations.push('⚠️ No BroadcastChannel messages - check cross-tab communication');
  }
  
  if (successRate < 70) {
    recommendations.push('🔧 Consider additional debugging for popup communication');
  }
  
  if (recommendations.length > 0) {
    console.log('\n🔧 Recommendations:');
    recommendations.forEach(rec => console.log(rec));
  } else {
    console.log('\n🎉 All communication methods appear to be working correctly!');
  }
  
  console.log('\n=== END TEST REPORT ===\n');
}

/**
 * Run the complete test suite
 */
function runOAuthCommunicationTest() {
  console.log('🚀 [OAUTH-TEST] Starting OAuth popup communication test...');
  console.log(`⏱️ Test duration: ${TEST_CONFIG.testDuration / 1000} seconds`);
  
  // Set up listeners first
  setupEventListeners();
  
  // Run tests
  testPostMessageHandling();
  testBroadcastChannel();
  testLocalStorageMonitoring();
  testCustomEventDispatching();
  
  // Generate report at the end
  setTimeout(generateTestReport, TEST_CONFIG.testDuration);
  
  console.log('✅ [OAUTH-TEST] All tests scheduled. Watch the console for results...');
}

// Export for use in browser console
window.oauthCommunicationTest = {
  run: runOAuthCommunicationTest,
  config: TEST_CONFIG,
  results: testResults
};

// Auto-run if this script is loaded directly
if (typeof document !== 'undefined') {
  console.log('📋 [OAUTH-TEST] OAuth Communication Test loaded.');
  console.log('🎮 Run window.oauthCommunicationTest.run() to start testing');
}