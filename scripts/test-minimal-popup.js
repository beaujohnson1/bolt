// Minimal OAuth Popup Test
// Simple "hello world" postMessage verification for basic communication testing

console.log('🧪 [MINIMAL-POPUP-TEST] Minimal OAuth Popup Test Started');

class MinimalPopupTester {
  constructor() {
    this.testResults = [];
    this.mockPopup = null;
  }

  /**
   * Create a minimal mock popup for testing
   */
  createMinimalMockPopup() {
    const mockPopup = {
      closed: false,
      opener: window,
      location: { href: 'about:blank' },
      postMessage: (message, targetOrigin) => {
        console.log('📤 [MINIMAL-POPUP] Mock popup sending message:', message);
        // Simulate real popup behavior with slight delay
        setTimeout(() => {
          window.dispatchEvent(new MessageEvent('message', {
            data: message,
            origin: window.location.origin,
            source: mockPopup
          }));
        }, 50);
      },
      close: () => {
        mockPopup.closed = true;
        console.log('🪟 [MINIMAL-POPUP] Mock popup closed');
      }
    };
    
    this.mockPopup = mockPopup;
    return mockPopup;
  }

  /**
   * Test 1: Hello World Message
   */
  async testHelloWorldMessage() {
    return new Promise((resolve) => {
      console.log('👋 Test 1: Hello World Message');
      
      let messageReceived = false;
      let correctMessage = false;
      
      const messageHandler = (event) => {
        console.log('📨 [MINIMAL-POPUP] Message received:', event.data);
        
        if (event.data.type === 'HELLO_WORLD') {
          messageReceived = true;
          correctMessage = event.data.message === 'Hello from popup!';
          
          console.log(`Message check: Received=${messageReceived}, Correct=${correctMessage}`);
          
          window.removeEventListener('message', messageHandler);
          
          const testPassed = messageReceived && correctMessage;
          
          this.testResults.push({
            test: 'helloWorldMessage',
            status: testPassed ? 'PASS' : 'FAIL',
            message: testPassed ? 'Hello world message successful' : 'Hello world message failed',
            data: { messageReceived, correctMessage, receivedData: event.data }
          });
          
          resolve(testPassed);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Create mock popup and send hello message
      const popup = this.createMinimalMockPopup();
      
      setTimeout(() => {
        popup.postMessage({
          type: 'HELLO_WORLD',
          message: 'Hello from popup!',
          timestamp: Date.now()
        }, window.location.origin);
      }, 100);
      
      // Timeout after 2 seconds
      setTimeout(() => {
        if (!messageReceived) {
          window.removeEventListener('message', messageHandler);
          
          this.testResults.push({
            test: 'helloWorldMessage',
            status: 'FAIL',
            message: 'Hello world message timeout',
            data: { messageReceived, timeout: true }
          });
          
          resolve(false);
        }
      }, 2000);
    });
  }

  /**
   * Test 2: Simple Token Message
   */
  async testSimpleTokenMessage() {
    return new Promise((resolve) => {
      console.log('🔑 Test 2: Simple Token Message');
      
      let tokenReceived = false;
      let tokenValid = false;
      
      const testToken = 'simple_test_token_' + Date.now();
      
      const messageHandler = (event) => {
        console.log('📨 [MINIMAL-POPUP] Token message received:', event.data);
        
        if (event.data.type === 'SIMPLE_TOKEN') {
          tokenReceived = true;
          tokenValid = event.data.token === testToken;
          
          console.log(`Token check: Received=${tokenReceived}, Valid=${tokenValid}`);
          
          window.removeEventListener('message', messageHandler);
          
          const testPassed = tokenReceived && tokenValid;
          
          this.testResults.push({
            test: 'simpleTokenMessage',
            status: testPassed ? 'PASS' : 'FAIL',
            message: testPassed ? 'Simple token message successful' : 'Simple token message failed',
            data: { tokenReceived, tokenValid, expectedToken: testToken, receivedToken: event.data.token }
          });
          
          resolve(testPassed);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Send token message
      setTimeout(() => {
        this.mockPopup.postMessage({
          type: 'SIMPLE_TOKEN',
          token: testToken,
          timestamp: Date.now()
        }, window.location.origin);
      }, 100);
      
      // Timeout after 2 seconds
      setTimeout(() => {
        if (!tokenReceived) {
          window.removeEventListener('message', messageHandler);
          
          this.testResults.push({
            test: 'simpleTokenMessage',
            status: 'FAIL',
            message: 'Simple token message timeout',
            data: { tokenReceived, timeout: true }
          });
          
          resolve(false);
        }
      }, 2000);
    });
  }

  /**
   * Test 3: Rapid Fire Messages
   */
  async testRapidFireMessages() {
    return new Promise((resolve) => {
      console.log('⚡ Test 3: Rapid Fire Messages');
      
      const messageCount = 5;
      let messagesReceived = 0;
      const receivedMessages = [];
      
      const messageHandler = (event) => {
        if (event.data.type === 'RAPID_FIRE') {
          messagesReceived++;
          receivedMessages.push(event.data.index);
          
          console.log(`📨 [MINIMAL-POPUP] Rapid message ${messagesReceived}/${messageCount} received (index: ${event.data.index})`);
          
          if (messagesReceived >= messageCount) {
            window.removeEventListener('message', messageHandler);
            
            // Check if all messages were received in order
            const allReceived = messagesReceived === messageCount;
            const correctOrder = receivedMessages.every((index, i) => index === i);
            
            const testPassed = allReceived && correctOrder;
            
            this.testResults.push({
              test: 'rapidFireMessages',
              status: testPassed ? 'PASS' : 'FAIL',
              message: testPassed ? 'Rapid fire messages successful' : `Rapid fire failed - Received: ${messagesReceived}/${messageCount}, Order: ${correctOrder}`,
              data: { messagesReceived, messageCount, correctOrder, receivedMessages }
            });
            
            resolve(testPassed);
          }
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Send rapid fire messages
      for (let i = 0; i < messageCount; i++) {
        setTimeout(() => {
          this.mockPopup.postMessage({
            type: 'RAPID_FIRE',
            index: i,
            timestamp: Date.now()
          }, window.location.origin);
        }, i * 50); // 50ms intervals
      }
      
      // Timeout after 3 seconds
      setTimeout(() => {
        if (messagesReceived < messageCount) {
          window.removeEventListener('message', messageHandler);
          
          this.testResults.push({
            test: 'rapidFireMessages',
            status: 'FAIL',
            message: `Rapid fire timeout - only ${messagesReceived}/${messageCount} received`,
            data: { messagesReceived, messageCount, timeout: true }
          });
          
          resolve(false);
        }
      }, 3000);
    });
  }

  /**
   * Test 4: Large Message Test
   */
  async testLargeMessage() {
    return new Promise((resolve) => {
      console.log('📦 Test 4: Large Message Test');
      
      let largeMessageReceived = false;
      let dataIntact = false;
      
      // Create large data payload
      const largeData = {
        type: 'LARGE_MESSAGE',
        payload: 'x'.repeat(1000), // 1KB of data
        numbers: Array.from({ length: 100 }, (_, i) => i),
        nested: {
          level1: {
            level2: {
              level3: 'deep data'
            }
          }
        },
        timestamp: Date.now()
      };
      
      const messageHandler = (event) => {
        console.log('📨 [MINIMAL-POPUP] Large message received, size:', JSON.stringify(event.data).length);
        
        if (event.data.type === 'LARGE_MESSAGE') {
          largeMessageReceived = true;
          
          // Verify data integrity
          dataIntact = event.data.payload === largeData.payload &&
                      event.data.numbers.length === 100 &&
                      event.data.nested.level1.level2.level3 === 'deep data';
          
          console.log(`Large message check: Received=${largeMessageReceived}, Intact=${dataIntact}`);
          
          window.removeEventListener('message', messageHandler);
          
          const testPassed = largeMessageReceived && dataIntact;
          
          this.testResults.push({
            test: 'largeMessage',
            status: testPassed ? 'PASS' : 'FAIL',
            message: testPassed ? 'Large message successful' : 'Large message failed',
            data: { 
              largeMessageReceived, 
              dataIntact, 
              originalSize: JSON.stringify(largeData).length,
              receivedSize: JSON.stringify(event.data).length
            }
          });
          
          resolve(testPassed);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Send large message
      setTimeout(() => {
        this.mockPopup.postMessage(largeData, window.location.origin);
      }, 100);
      
      // Timeout after 3 seconds
      setTimeout(() => {
        if (!largeMessageReceived) {
          window.removeEventListener('message', messageHandler);
          
          this.testResults.push({
            test: 'largeMessage',
            status: 'FAIL',
            message: 'Large message timeout',
            data: { largeMessageReceived, timeout: true }
          });
          
          resolve(false);
        }
      }, 3000);
    });
  }

  /**
   * Test 5: Origin Validation Test
   */
  async testOriginValidation() {
    return new Promise((resolve) => {
      console.log('🛡️ Test 5: Origin Validation Test');
      
      let trustedMessageReceived = false;
      let untrustedMessageReceived = false;
      
      const messageHandler = (event) => {
        console.log('📨 [MINIMAL-POPUP] Origin test message received from:', event.origin);
        
        if (event.data.type === 'ORIGIN_TEST') {
          if (event.origin === window.location.origin) {
            trustedMessageReceived = true;
            console.log('✅ Trusted origin message received');
          } else {
            untrustedMessageReceived = true;
            console.log('⚠️ Untrusted origin message received');
          }
          
          // Complete test after receiving any message
          setTimeout(() => {
            window.removeEventListener('message', messageHandler);
            
            const testPassed = trustedMessageReceived && !untrustedMessageReceived;
            
            this.testResults.push({
              test: 'originValidation',
              status: testPassed ? 'PASS' : 'FAIL',
              message: testPassed ? 'Origin validation successful' : 'Origin validation failed',
              data: { 
                trustedMessageReceived, 
                untrustedMessageReceived,
                expectedOrigin: window.location.origin
              }
            });
            
            resolve(testPassed);
          }, 100);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Send message from trusted origin
      setTimeout(() => {
        this.mockPopup.postMessage({
          type: 'ORIGIN_TEST',
          trusted: true,
          timestamp: Date.now()
        }, window.location.origin);
      }, 100);
      
      // Timeout after 2 seconds
      setTimeout(() => {
        if (!trustedMessageReceived) {
          window.removeEventListener('message', messageHandler);
          
          this.testResults.push({
            test: 'originValidation',
            status: 'FAIL',
            message: 'Origin validation timeout',
            data: { trustedMessageReceived, timeout: true }
          });
          
          resolve(false);
        }
      }, 2000);
    });
  }

  /**
   * Run all minimal popup tests
   */
  async runAllTests() {
    console.log('🚀 [MINIMAL-POPUP-TEST] Running all minimal popup tests...');
    
    const tests = [
      this.testHelloWorldMessage(),
      this.testSimpleTokenMessage(),
      this.testRapidFireMessages(),
      this.testLargeMessage(),
      this.testOriginValidation()
    ];
    
    const results = await Promise.all(tests);
    
    console.log('📊 [MINIMAL-POPUP-TEST] All tests completed');
    this.printResults();
    
    // Cleanup
    if (this.mockPopup && !this.mockPopup.closed) {
      this.mockPopup.close();
    }
    
    return results;
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log('\n📈 MINIMAL POPUP TEST RESULTS:');
    console.log('===============================');
    
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
    
    if (passed === this.testResults.length) {
      console.log('🎉 All minimal popup tests passed! Basic communication is working.');
    } else {
      console.log('⚠️ Some tests failed. Check communication setup.');
    }
    
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
  window.MinimalPopupTester = MinimalPopupTester;
  
  // Auto-run tests if script is loaded directly
  const tester = new MinimalPopupTester();
  tester.runAllTests().then(results => {
    console.log('🎉 [MINIMAL-POPUP-TEST] Minimal popup testing complete!');
  });
} else {
  module.exports = MinimalPopupTester;
}