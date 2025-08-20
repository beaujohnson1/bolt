// OAuth Communication Testing Suite
// Comprehensive testing of postMessage communication between popup and parent windows

console.log('🧪 [OAUTH-COMM-TEST] OAuth Communication Testing Suite Started');

class OAuthCommunicationTester {
  constructor() {
    this.testResults = [];
    this.activeTests = new Set();
    this.popupWindow = null;
    this.messageHandlers = new Map();
  }

  /**
   * Test 1: Basic postMessage communication
   */
  async testBasicPostMessage() {
    return new Promise((resolve) => {
      console.log('📡 Test 1: Basic PostMessage Communication');
      this.activeTests.add('basicPostMessage');
      
      let messageReceived = false;
      let timeoutId;
      
      const messageHandler = (event) => {
        if (event.data.type === 'TEST_MESSAGE') {
          console.log('✅ Basic postMessage received:', event.data);
          messageReceived = true;
          clearTimeout(timeoutId);
          window.removeEventListener('message', messageHandler);
          this.testResults.push({
            test: 'basicPostMessage',
            status: 'PASS',
            message: 'PostMessage communication working',
            data: event.data
          });
          this.activeTests.delete('basicPostMessage');
          resolve(true);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Send test message to self (simulating popup communication)
      setTimeout(() => {
        window.postMessage({
          type: 'TEST_MESSAGE',
          timestamp: Date.now(),
          source: 'self_test'
        }, window.location.origin);
      }, 100);
      
      // Timeout after 2 seconds
      timeoutId = setTimeout(() => {
        if (!messageReceived) {
          window.removeEventListener('message', messageHandler);
          this.testResults.push({
            test: 'basicPostMessage',
            status: 'FAIL',
            message: 'PostMessage timeout - no message received',
            data: null
          });
          this.activeTests.delete('basicPostMessage');
          resolve(false);
        }
      }, 2000);
    });
  }

  /**
   * Test 2: Multiple origin support test
   */
  async testMultipleOrigins() {
    return new Promise((resolve) => {
      console.log('🌐 Test 2: Multiple Origin Support');
      this.activeTests.add('multipleOrigins');
      
      const origins = [
        window.location.origin,
        'https://easyflip.ai',
        '*'
      ];
      
      let receivedCount = 0;
      const expectedCount = origins.length;
      
      const messageHandler = (event) => {
        if (event.data.type === 'ORIGIN_TEST') {
          receivedCount++;
          console.log(`✅ Origin test message ${receivedCount}/${expectedCount}:`, {
            origin: event.origin,
            data: event.data
          });
          
          if (receivedCount >= expectedCount) {
            window.removeEventListener('message', messageHandler);
            this.testResults.push({
              test: 'multipleOrigins',
              status: 'PASS',
              message: `All ${expectedCount} origin tests passed`,
              data: { receivedCount, expectedCount }
            });
            this.activeTests.delete('multipleOrigins');
            resolve(true);
          }
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Send messages from different simulated origins
      origins.forEach((origin, index) => {
        setTimeout(() => {
          window.postMessage({
            type: 'ORIGIN_TEST',
            origin: origin,
            index: index,
            timestamp: Date.now()
          }, window.location.origin);
        }, (index + 1) * 200);
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (receivedCount < expectedCount) {
          window.removeEventListener('message', messageHandler);
          this.testResults.push({
            test: 'multipleOrigins',
            status: 'FAIL',
            message: `Only ${receivedCount}/${expectedCount} origin tests passed`,
            data: { receivedCount, expectedCount }
          });
          this.activeTests.delete('multipleOrigins');
          resolve(false);
        }
      }, 5000);
    });
  }

  /**
   * Test 3: OAuth token message simulation
   */
  async testOAuthTokenMessage() {
    return new Promise((resolve) => {
      console.log('🔑 Test 3: OAuth Token Message Simulation');
      this.activeTests.add('oauthTokenMessage');
      
      const mockTokens = {
        access_token: 'test_access_token_' + Date.now(),
        refresh_token: 'test_refresh_token_' + Date.now(),
        token_type: 'Bearer',
        expires_in: 7200,
        expires_at: Date.now() + (7200 * 1000)
      };
      
      let tokenMessageReceived = false;
      
      const messageHandler = (event) => {
        if (event.data.type === 'EBAY_OAUTH_SUCCESS') {
          console.log('✅ OAuth success message received:', event.data);
          tokenMessageReceived = true;
          
          // Validate token structure
          const receivedTokens = event.data.tokens;
          const isValid = receivedTokens && 
                          receivedTokens.access_token && 
                          receivedTokens.refresh_token &&
                          receivedTokens.token_type === 'Bearer';
          
          window.removeEventListener('message', messageHandler);
          this.testResults.push({
            test: 'oauthTokenMessage',
            status: isValid ? 'PASS' : 'FAIL',
            message: isValid ? 'OAuth token message valid' : 'OAuth token message invalid',
            data: { receivedTokens, isValid }
          });
          this.activeTests.delete('oauthTokenMessage');
          resolve(isValid);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Send OAuth success message
      setTimeout(() => {
        window.postMessage({
          type: 'EBAY_OAUTH_SUCCESS',
          tokens: mockTokens,
          timestamp: Date.now(),
          source: 'test_popup'
        }, window.location.origin);
      }, 100);
      
      // Timeout after 3 seconds
      setTimeout(() => {
        if (!tokenMessageReceived) {
          window.removeEventListener('message', messageHandler);
          this.testResults.push({
            test: 'oauthTokenMessage',
            status: 'FAIL',
            message: 'OAuth token message timeout',
            data: null
          });
          this.activeTests.delete('oauthTokenMessage');
          resolve(false);
        }
      }, 3000);
    });
  }

  /**
   * Test 4: Error message handling
   */
  async testErrorMessageHandling() {
    return new Promise((resolve) => {
      console.log('❌ Test 4: Error Message Handling');
      this.activeTests.add('errorMessage');
      
      let errorMessageReceived = false;
      
      const messageHandler = (event) => {
        if (event.data.type === 'EBAY_OAUTH_ERROR') {
          console.log('✅ OAuth error message received:', event.data);
          errorMessageReceived = true;
          
          const hasErrorMessage = event.data.error && typeof event.data.error === 'string';
          
          window.removeEventListener('message', messageHandler);
          this.testResults.push({
            test: 'errorMessage',
            status: hasErrorMessage ? 'PASS' : 'FAIL',
            message: hasErrorMessage ? 'Error message handled correctly' : 'Error message invalid',
            data: event.data
          });
          this.activeTests.delete('errorMessage');
          resolve(hasErrorMessage);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Send error message
      setTimeout(() => {
        window.postMessage({
          type: 'EBAY_OAUTH_ERROR',
          error: 'Test error: Authorization failed',
          timestamp: Date.now(),
          source: 'test_popup'
        }, window.location.origin);
      }, 100);
      
      // Timeout after 2 seconds
      setTimeout(() => {
        if (!errorMessageReceived) {
          window.removeEventListener('message', messageHandler);
          this.testResults.push({
            test: 'errorMessage',
            status: 'FAIL',
            message: 'Error message timeout',
            data: null
          });
          this.activeTests.delete('errorMessage');
          resolve(false);
        }
      }, 2000);
    });
  }

  /**
   * Test 5: Rapid message burst test
   */
  async testRapidMessageBurst() {
    return new Promise((resolve) => {
      console.log('⚡ Test 5: Rapid Message Burst');
      this.activeTests.add('rapidBurst');
      
      const messageCount = 10;
      let receivedCount = 0;
      
      const messageHandler = (event) => {
        if (event.data.type === 'BURST_TEST') {
          receivedCount++;
          console.log(`📨 Burst message ${receivedCount}/${messageCount} received`);
          
          if (receivedCount >= messageCount) {
            window.removeEventListener('message', messageHandler);
            this.testResults.push({
              test: 'rapidBurst',
              status: 'PASS',
              message: `All ${messageCount} rapid messages received`,
              data: { receivedCount, messageCount }
            });
            this.activeTests.delete('rapidBurst');
            resolve(true);
          }
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Send rapid burst of messages
      for (let i = 0; i < messageCount; i++) {
        setTimeout(() => {
          window.postMessage({
            type: 'BURST_TEST',
            index: i,
            timestamp: Date.now()
          }, window.location.origin);
        }, i * 10); // 10ms intervals
      }
      
      // Timeout after 3 seconds
      setTimeout(() => {
        if (receivedCount < messageCount) {
          window.removeEventListener('message', messageHandler);
          this.testResults.push({
            test: 'rapidBurst',
            status: 'FAIL',
            message: `Only ${receivedCount}/${messageCount} rapid messages received`,
            data: { receivedCount, messageCount }
          });
          this.activeTests.delete('rapidBurst');
          resolve(false);
        }
      }, 3000);
    });
  }

  /**
   * Test 6: Cross-tab communication simulation
   */
  async testCrossTabCommunication() {
    return new Promise((resolve) => {
      console.log('📑 Test 6: Cross-Tab Communication');
      this.activeTests.add('crossTab');
      
      let broadcastReceived = false;
      let storageEventReceived = false;
      
      // Test BroadcastChannel if available
      if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel('ebay-auth');
        
        channel.onmessage = (event) => {
          console.log('✅ BroadcastChannel message received:', event.data);
          broadcastReceived = true;
          channel.close();
          checkCompletion();
        };
        
        // Send test message
        setTimeout(() => {
          channel.postMessage({
            type: 'AUTH_CHANGED',
            authenticated: true,
            source: 'test_tab',
            timestamp: Date.now()
          });
        }, 100);
      } else {
        console.log('⚠️ BroadcastChannel not available');
        broadcastReceived = true; // Skip this test
      }
      
      // Test storage event
      const storageHandler = (event) => {
        if (event.key === 'ebay_oauth_tokens') {
          console.log('✅ Storage event received:', event);
          storageEventReceived = true;
          window.removeEventListener('storage', storageHandler);
          checkCompletion();
        }
      };
      
      window.addEventListener('storage', storageHandler);
      
      // Trigger storage event
      setTimeout(() => {
        const testData = JSON.stringify({ test: 'cross_tab_token' });
        localStorage.setItem('ebay_oauth_tokens', testData);
        
        // Manually dispatch storage event (same-window simulation)
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'ebay_oauth_tokens',
          newValue: testData,
          oldValue: null,
          storageArea: localStorage,
          url: window.location.href
        }));
      }, 200);
      
      const checkCompletion = () => {
        if (broadcastReceived && storageEventReceived) {
          this.testResults.push({
            test: 'crossTab',
            status: 'PASS',
            message: 'Cross-tab communication working',
            data: { broadcastReceived, storageEventReceived }
          });
          this.activeTests.delete('crossTab');
          
          // Cleanup
          localStorage.removeItem('ebay_oauth_tokens');
          resolve(true);
        }
      };
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (!broadcastReceived || !storageEventReceived) {
          window.removeEventListener('storage', storageHandler);
          this.testResults.push({
            test: 'crossTab',
            status: 'FAIL',
            message: `Cross-tab communication failed - Broadcast: ${broadcastReceived}, Storage: ${storageEventReceived}`,
            data: { broadcastReceived, storageEventReceived }
          });
          this.activeTests.delete('crossTab');
          localStorage.removeItem('ebay_oauth_tokens');
          resolve(false);
        }
      }, 5000);
    });
  }

  /**
   * Run all communication tests
   */
  async runAllTests() {
    console.log('🚀 [OAUTH-COMM-TEST] Running all communication tests...');
    
    const tests = [
      this.testBasicPostMessage(),
      this.testMultipleOrigins(),
      this.testOAuthTokenMessage(),
      this.testErrorMessageHandling(),
      this.testRapidMessageBurst(),
      this.testCrossTabCommunication()
    ];
    
    const results = await Promise.all(tests);
    
    console.log('📊 [OAUTH-COMM-TEST] All tests completed');
    this.printResults();
    
    return results;
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log('\n📈 OAUTH COMMUNICATION TEST RESULTS:');
    console.log('=====================================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.message}`);
      if (result.data) {
        console.log(`   Data:`, result.data);
      }
    });
    
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    
    return { passed, failed, total: passed + failed };
  }

  /**
   * Get test results
   */
  getResults() {
    return {
      results: this.testResults,
      summary: {
        passed: this.testResults.filter(r => r.status === 'PASS').length,
        failed: this.testResults.filter(r => r.status === 'FAIL').length,
        total: this.testResults.length
      }
    };
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.OAuthCommunicationTester = OAuthCommunicationTester;
  
  // Auto-run tests if script is loaded directly
  const tester = new OAuthCommunicationTester();
  tester.runAllTests().then(results => {
    console.log('🎉 [OAUTH-COMM-TEST] Communication testing complete!');
  });
} else {
  module.exports = OAuthCommunicationTester;
}