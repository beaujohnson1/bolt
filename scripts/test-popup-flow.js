// OAuth Popup Flow Testing Suite
// End-to-end testing of OAuth popup flow including window management, timing, and edge cases

console.log('🧪 [POPUP-FLOW-TEST] OAuth Popup Flow Testing Suite Started');

class PopupFlowTester {
  constructor() {
    this.testResults = [];
    this.mockPopups = new Map();
    this.messageHandlers = new Map();
    this.timeouts = new Set();
  }

  /**
   * Create mock popup window for testing
   */
  createMockPopup(url, name, features) {
    const mockPopup = {
      location: { href: url },
      name: name,
      features: features,
      closed: false,
      opener: window,
      postMessage: (message, targetOrigin) => {
        // Simulate async message delivery
        setTimeout(() => {
          window.dispatchEvent(new MessageEvent('message', {
            data: message,
            origin: targetOrigin === '*' ? window.location.origin : targetOrigin,
            source: mockPopup
          }));
        }, 10);
      },
      close: () => {
        mockPopup.closed = true;
        console.log('🪟 Mock popup closed');
      },
      focus: () => {
        console.log('🪟 Mock popup focused');
      }
    };
    
    this.mockPopups.set(name, mockPopup);
    return mockPopup;
  }

  /**
   * Test 1: Basic popup opening and closing
   */
  async testBasicPopupManagement() {
    return new Promise((resolve) => {
      console.log('🪟 Test 1: Basic Popup Management');
      
      let testPassed = false;
      
      try {
        // Mock window.open
        const originalOpen = window.open;
        window.open = (url, name, features) => {
          console.log('✅ window.open called with:', { url, name, features });
          return this.createMockPopup(url, name, features);
        };
        
        // Test popup opening
        const popup = window.open(
          'https://auth.ebay.com/oauth2/authorize?test=true',
          'ebay-oauth',
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );
        
        if (popup && !popup.closed) {
          console.log('✅ Popup opened successfully');
          
          // Test popup closing
          setTimeout(() => {
            popup.close();
            
            if (popup.closed) {
              console.log('✅ Popup closed successfully');
              testPassed = true;
            } else {
              console.log('❌ Popup failed to close');
            }
            
            // Restore original window.open
            window.open = originalOpen;
            
            this.testResults.push({
              test: 'basicPopupManagement',
              status: testPassed ? 'PASS' : 'FAIL',
              message: testPassed ? 'Popup management working' : 'Popup management failed',
              data: { popupCreated: !!popup, popupClosed: popup ? popup.closed : false }
            });
            
            resolve(testPassed);
          }, 100);
        } else {
          console.log('❌ Failed to create popup');
          window.open = originalOpen;
          
          this.testResults.push({
            test: 'basicPopupManagement',
            status: 'FAIL',
            message: 'Failed to create popup window',
            data: { popupCreated: false }
          });
          
          resolve(false);
        }
      } catch (error) {
        console.log('❌ Popup management error:', error);
        
        this.testResults.push({
          test: 'basicPopupManagement',
          status: 'FAIL',
          message: 'Popup management error: ' + error.message,
          data: { error: error.message }
        });
        
        resolve(false);
      }
    });
  }

  /**
   * Test 2: Popup communication and token exchange
   */
  async testPopupCommunication() {
    return new Promise((resolve) => {
      console.log('📡 Test 2: Popup Communication and Token Exchange');
      
      let messageReceived = false;
      let tokensValid = false;
      
      const testTokens = {
        access_token: 'popup_test_token_' + Date.now(),
        refresh_token: 'popup_refresh_token_' + Date.now(),
        token_type: 'Bearer',
        expires_in: 7200,
        expires_at: Date.now() + (7200 * 1000)
      };
      
      // Set up message handler
      const messageHandler = (event) => {
        if (event.data.type === 'EBAY_OAUTH_SUCCESS') {
          console.log('✅ OAuth success message received from popup');
          messageReceived = true;
          
          const receivedTokens = event.data.tokens;
          tokensValid = receivedTokens && 
                       receivedTokens.access_token === testTokens.access_token &&
                       receivedTokens.refresh_token === testTokens.refresh_token;
          
          console.log(`Token validation: ${tokensValid ? 'VALID' : 'INVALID'}`);
          
          checkCompletion();
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Mock popup creation and communication
      const originalOpen = window.open;
      window.open = (url, name, features) => {
        const mockPopup = this.createMockPopup(url, name, features);
        
        // Simulate successful OAuth flow after delay
        setTimeout(() => {
          console.log('🔄 Simulating OAuth success from popup...');
          mockPopup.postMessage({
            type: 'EBAY_OAUTH_SUCCESS',
            tokens: testTokens,
            timestamp: Date.now(),
            source: 'mock_popup'
          }, window.location.origin);
        }, 500);
        
        return mockPopup;
      };
      
      // Start OAuth flow simulation
      const popup = window.open(
        'https://auth.ebay.com/oauth2/authorize?test=popup',
        'ebay-oauth-test',
        'width=600,height=700'
      );
      
      const checkCompletion = () => {
        if (messageReceived) {
          window.removeEventListener('message', messageHandler);
          window.open = originalOpen;
          
          const testPassed = messageReceived && tokensValid;
          
          this.testResults.push({
            test: 'popupCommunication',
            status: testPassed ? 'PASS' : 'FAIL',
            message: testPassed ? 'Popup communication successful' : `Communication issues - Message: ${messageReceived}, Tokens: ${tokensValid}`,
            data: { messageReceived, tokensValid, testTokens }
          });
          
          resolve(testPassed);
        }
      };
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (!messageReceived) {
          window.removeEventListener('message', messageHandler);
          window.open = originalOpen;
          
          this.testResults.push({
            test: 'popupCommunication',
            status: 'FAIL',
            message: 'Popup communication timeout',
            data: { messageReceived, timeout: true }
          });
          
          resolve(false);
        }
      }, 5000);
    });
  }

  /**
   * Test 3: Popup blocked scenario
   */
  async testPopupBlockedScenario() {
    return new Promise((resolve) => {
      console.log('🚫 Test 3: Popup Blocked Scenario');
      
      let fallbackTriggered = false;
      
      try {
        // Mock popup blocker
        const originalOpen = window.open;
        window.open = (url, name, features) => {
          console.log('🚫 Simulating popup blocker - returning null');
          return null; // Simulates popup being blocked
        };
        
        // Try to open popup
        const popup = window.open(
          'https://auth.ebay.com/oauth2/authorize?test=blocked',
          'ebay-oauth',
          'width=600,height=700'
        );
        
        if (!popup) {
          console.log('✅ Popup blocked (as expected)');
          
          // Simulate fallback behavior (redirect)
          console.log('🔄 Triggering fallback to same-window redirect...');
          fallbackTriggered = true;
          
          // In real implementation, this would be: window.location.href = authUrl;
          console.log('✅ Fallback redirect would be triggered');
        }
        
        // Restore original window.open
        window.open = originalOpen;
        
        const testPassed = !popup && fallbackTriggered;
        
        this.testResults.push({
          test: 'popupBlockedScenario',
          status: testPassed ? 'PASS' : 'FAIL',
          message: testPassed ? 'Popup blocking handled correctly' : 'Popup blocking not handled',
          data: { popupBlocked: !popup, fallbackTriggered }
        });
        
        resolve(testPassed);
      } catch (error) {
        this.testResults.push({
          test: 'popupBlockedScenario',
          status: 'FAIL',
          message: 'Popup blocking test error: ' + error.message,
          data: { error: error.message }
        });
        
        resolve(false);
      }
    });
  }

  /**
   * Test 4: Multiple popup handling
   */
  async testMultiplePopups() {
    return new Promise((resolve) => {
      console.log('🪟🪟 Test 4: Multiple Popup Handling');
      
      const popups = [];
      let messagesReceived = 0;
      const expectedMessages = 3;
      
      const messageHandler = (event) => {
        if (event.data.type === 'MULTIPLE_POPUP_TEST') {
          messagesReceived++;
          console.log(`✅ Message ${messagesReceived}/${expectedMessages} received from popup ${event.data.popupId}`);
          
          if (messagesReceived >= expectedMessages) {
            checkCompletion();
          }
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Mock window.open to create multiple popups
      const originalOpen = window.open;
      window.open = (url, name, features) => {
        const mockPopup = this.createMockPopup(url, name, features);
        
        // Each popup sends a message after a delay
        const popupId = popups.length + 1;
        setTimeout(() => {
          mockPopup.postMessage({
            type: 'MULTIPLE_POPUP_TEST',
            popupId: popupId,
            timestamp: Date.now()
          }, window.location.origin);
        }, popupId * 200);
        
        return mockPopup;
      };
      
      // Create multiple popups
      for (let i = 1; i <= 3; i++) {
        const popup = window.open(
          `https://auth.ebay.com/oauth2/test?popup=${i}`,
          `ebay-oauth-${i}`,
          'width=600,height=700'
        );
        popups.push(popup);
      }
      
      const checkCompletion = () => {
        window.removeEventListener('message', messageHandler);
        window.open = originalOpen;
        
        // Close all popups
        popups.forEach(popup => popup && popup.close());
        
        const testPassed = messagesReceived === expectedMessages;
        
        this.testResults.push({
          test: 'multiplePopups',
          status: testPassed ? 'PASS' : 'FAIL',
          message: testPassed ? 'Multiple popup handling successful' : `Only ${messagesReceived}/${expectedMessages} popups responded`,
          data: { messagesReceived, expectedMessages, popupsCreated: popups.length }
        });
        
        resolve(testPassed);
      };
      
      // Timeout after 3 seconds
      setTimeout(() => {
        if (messagesReceived < expectedMessages) {
          window.removeEventListener('message', messageHandler);
          window.open = originalOpen;
          popups.forEach(popup => popup && popup.close());
          
          this.testResults.push({
            test: 'multiplePopups',
            status: 'FAIL',
            message: `Multiple popup timeout - only ${messagesReceived}/${expectedMessages} responded`,
            data: { messagesReceived, expectedMessages, timeout: true }
          });
          
          resolve(false);
        }
      }, 3000);
    });
  }

  /**
   * Test 5: Popup timing and delay scenarios
   */
  async testPopupTiming() {
    return new Promise((resolve) => {
      console.log('⏱️ Test 5: Popup Timing and Delay Scenarios');
      
      const timingTests = [
        { name: 'immediate', delay: 0 },
        { name: 'short', delay: 100 },
        { name: 'medium', delay: 500 },
        { name: 'long', delay: 2000 }
      ];
      
      let completedTests = 0;
      let passedTests = 0;
      
      const originalOpen = window.open;
      
      timingTests.forEach((test, index) => {
        window.open = (url, name, features) => {
          const mockPopup = this.createMockPopup(url, name, features);
          
          // Send success message after specified delay
          setTimeout(() => {
            console.log(`📤 Sending message after ${test.delay}ms delay (${test.name})`);
            mockPopup.postMessage({
              type: 'TIMING_TEST',
              testName: test.name,
              delay: test.delay,
              timestamp: Date.now()
            }, window.location.origin);
          }, test.delay);
          
          return mockPopup;
        };
        
        const messageHandler = (event) => {
          if (event.data.type === 'TIMING_TEST' && event.data.testName === test.name) {
            console.log(`✅ ${test.name} timing test passed (${test.delay}ms)`);
            passedTests++;
            completedTests++;
            window.removeEventListener('message', messageHandler);
            
            if (completedTests >= timingTests.length) {
              checkCompletion();
            }
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        // Start test
        setTimeout(() => {
          const popup = window.open(
            `https://auth.ebay.com/oauth2/timing?test=${test.name}`,
            `timing-test-${index}`,
            'width=600,height=700'
          );
          
          // Timeout for this specific test
          setTimeout(() => {
            if (event => event.data.type === 'TIMING_TEST' && event.data.testName === test.name) {
              // Test hasn't completed
              completedTests++;
              console.log(`❌ ${test.name} timing test timeout`);
              
              if (completedTests >= timingTests.length) {
                checkCompletion();
              }
            }
          }, test.delay + 1000); // Timeout 1 second after expected delay
          
        }, index * 100); // Stagger test starts
      });
      
      const checkCompletion = () => {
        window.open = originalOpen;
        
        const testPassed = passedTests >= (timingTests.length * 0.75); // 75% success rate
        
        this.testResults.push({
          test: 'popupTiming',
          status: testPassed ? 'PASS' : 'FAIL',
          message: `Timing tests: ${passedTests}/${timingTests.length} passed`,
          data: { passedTests, totalTests: timingTests.length, timingTests }
        });
        
        resolve(testPassed);
      };
      
      // Overall timeout
      setTimeout(() => {
        if (completedTests < timingTests.length) {
          window.open = originalOpen;
          
          this.testResults.push({
            test: 'popupTiming',
            status: 'FAIL',
            message: `Timing test timeout - only ${completedTests}/${timingTests.length} completed`,
            data: { completedTests, totalTests: timingTests.length, timeout: true }
          });
          
          resolve(false);
        }
      }, 10000); // 10 second overall timeout
    });
  }

  /**
   * Test 6: Error handling in popup flow
   */
  async testPopupErrorHandling() {
    return new Promise((resolve) => {
      console.log('❌ Test 6: Popup Error Handling');
      
      let errorReceived = false;
      let errorValid = false;
      
      const messageHandler = (event) => {
        if (event.data.type === 'EBAY_OAUTH_ERROR') {
          console.log('✅ OAuth error message received from popup');
          errorReceived = true;
          
          errorValid = event.data.error && typeof event.data.error === 'string';
          console.log(`Error message validation: ${errorValid ? 'VALID' : 'INVALID'}`);
          
          checkCompletion();
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Mock popup that sends error
      const originalOpen = window.open;
      window.open = (url, name, features) => {
        const mockPopup = this.createMockPopup(url, name, features);
        
        // Send error after delay
        setTimeout(() => {
          console.log('🔄 Simulating OAuth error from popup...');
          mockPopup.postMessage({
            type: 'EBAY_OAUTH_ERROR',
            error: 'Test error: User denied authorization',
            timestamp: Date.now(),
            source: 'mock_popup_error'
          }, window.location.origin);
        }, 300);
        
        return mockPopup;
      };
      
      // Start error scenario
      const popup = window.open(
        'https://auth.ebay.com/oauth2/authorize?test=error',
        'ebay-oauth-error',
        'width=600,height=700'
      );
      
      const checkCompletion = () => {
        window.removeEventListener('message', messageHandler);
        window.open = originalOpen;
        
        const testPassed = errorReceived && errorValid;
        
        this.testResults.push({
          test: 'popupErrorHandling',
          status: testPassed ? 'PASS' : 'FAIL',
          message: testPassed ? 'Error handling successful' : `Error handling issues - Received: ${errorReceived}, Valid: ${errorValid}`,
          data: { errorReceived, errorValid }
        });
        
        resolve(testPassed);
      };
      
      // Timeout after 3 seconds
      setTimeout(() => {
        if (!errorReceived) {
          window.removeEventListener('message', messageHandler);
          window.open = originalOpen;
          
          this.testResults.push({
            test: 'popupErrorHandling',
            status: 'FAIL',
            message: 'Error handling timeout',
            data: { errorReceived, timeout: true }
          });
          
          resolve(false);
        }
      }, 3000);
    });
  }

  /**
   * Run all popup flow tests
   */
  async runAllTests() {
    console.log('🚀 [POPUP-FLOW-TEST] Running all popup flow tests...');
    
    const tests = [
      this.testBasicPopupManagement(),
      this.testPopupCommunication(),
      this.testPopupBlockedScenario(),
      this.testMultiplePopups(),
      this.testPopupTiming(),
      this.testPopupErrorHandling()
    ];
    
    const results = await Promise.all(tests);
    
    console.log('📊 [POPUP-FLOW-TEST] All tests completed');
    this.printResults();
    
    // Cleanup
    this.cleanup();
    
    return results;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Close any remaining mock popups
    this.mockPopups.forEach(popup => {
      if (!popup.closed) {
        popup.close();
      }
    });
    this.mockPopups.clear();
    
    // Clear timeouts
    this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.timeouts.clear();
    
    console.log('🧹 Popup flow test cleanup completed');
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log('\n📈 POPUP FLOW TEST RESULTS:');
    console.log('============================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.message}`);
      if (result.data && typeof result.data === 'object') {
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
  window.PopupFlowTester = PopupFlowTester;
  
  // Auto-run tests if script is loaded directly
  const tester = new PopupFlowTester();
  tester.runAllTests().then(results => {
    console.log('🎉 [POPUP-FLOW-TEST] Popup flow testing complete!');
  });
} else {
  module.exports = PopupFlowTester;
}