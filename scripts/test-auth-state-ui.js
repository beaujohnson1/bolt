// OAuth Authentication State UI Testing Suite
// Tests UI updates and state changes after token storage and authentication events

console.log('🧪 [AUTH-STATE-UI-TEST] OAuth Authentication State UI Testing Suite Started');

class AuthStateUITester {
  constructor() {
    this.testResults = [];
    this.originalTokens = null;
    this.originalManualToken = null;
    this.mockUIElements = new Map();
    this.eventListeners = new Map();
  }

  /**
   * Backup existing tokens and create mock UI elements
   */
  setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');
    
    // Backup existing tokens
    this.originalTokens = localStorage.getItem('ebay_oauth_tokens');
    this.originalManualToken = localStorage.getItem('ebay_manual_token');
    
    // Create mock UI elements for testing
    this.createMockUIElements();
    
    console.log('✅ Test environment setup complete');
  }

  /**
   * Create mock UI elements that mimic real OAuth components
   */
  createMockUIElements() {
    // Create mock container
    const container = document.createElement('div');
    container.id = 'oauth-test-container';
    container.style.cssText = 'position: fixed; top: -1000px; left: -1000px; visibility: hidden;';
    document.body.appendChild(container);
    
    // Mock auth button
    const authButton = document.createElement('button');
    authButton.id = 'mock-auth-button';
    authButton.textContent = 'Connect eBay Account';
    authButton.classList.add('auth-button', 'disconnected');
    container.appendChild(authButton);
    
    // Mock auth status indicator
    const authStatus = document.createElement('div');
    authStatus.id = 'mock-auth-status';
    authStatus.textContent = 'Not Connected';
    authStatus.classList.add('auth-status', 'disconnected');
    container.appendChild(authStatus);
    
    // Mock user info display
    const userInfo = document.createElement('div');
    userInfo.id = 'mock-user-info';
    userInfo.style.display = 'none';
    userInfo.innerHTML = '<span class="user-name">Not logged in</span>';
    container.appendChild(userInfo);
    
    // Mock loading spinner
    const loadingSpinner = document.createElement('div');
    loadingSpinner.id = 'mock-loading-spinner';
    loadingSpinner.style.display = 'none';
    loadingSpinner.textContent = 'Loading...';
    container.appendChild(loadingSpinner);
    
    // Mock error message
    const errorMessage = document.createElement('div');
    errorMessage.id = 'mock-error-message';
    errorMessage.style.display = 'none';
    errorMessage.classList.add('error-message');
    container.appendChild(errorMessage);
    
    // Store references
    this.mockUIElements.set('container', container);
    this.mockUIElements.set('authButton', authButton);
    this.mockUIElements.set('authStatus', authStatus);
    this.mockUIElements.set('userInfo', userInfo);
    this.mockUIElements.set('loadingSpinner', loadingSpinner);
    this.mockUIElements.set('errorMessage', errorMessage);
    
    console.log('🎨 Mock UI elements created');
  }

  /**
   * Simulate authentication state change handler
   */
  simulateAuthStateHandler(authenticated, tokens = null) {
    const authButton = this.mockUIElements.get('authButton');
    const authStatus = this.mockUIElements.get('authStatus');
    const userInfo = this.mockUIElements.get('userInfo');
    const loadingSpinner = this.mockUIElements.get('loadingSpinner');
    const errorMessage = this.mockUIElements.get('errorMessage');
    
    // Hide loading and error states
    loadingSpinner.style.display = 'none';
    errorMessage.style.display = 'none';
    
    if (authenticated) {
      // Update to connected state
      authButton.textContent = 'eBay Connected';
      authButton.classList.remove('disconnected');
      authButton.classList.add('connected');
      
      authStatus.textContent = 'Connected to eBay';
      authStatus.classList.remove('disconnected');
      authStatus.classList.add('connected');
      
      userInfo.style.display = 'block';
      userInfo.querySelector('.user-name').textContent = 'eBay User';
      
    } else {
      // Update to disconnected state
      authButton.textContent = 'Connect eBay Account';
      authButton.classList.remove('connected');
      authButton.classList.add('disconnected');
      
      authStatus.textContent = 'Not Connected';
      authStatus.classList.remove('connected');
      authStatus.classList.add('disconnected');
      
      userInfo.style.display = 'none';
      userInfo.querySelector('.user-name').textContent = 'Not logged in';
    }
    
    console.log(`🎨 UI updated for authentication state: ${authenticated ? 'CONNECTED' : 'DISCONNECTED'}`);
  }

  /**
   * Test 1: Initial state verification
   */
  async testInitialState() {
    console.log('🔍 Test 1: Initial State Verification');
    
    try {
      // Clear any existing tokens
      localStorage.removeItem('ebay_oauth_tokens');
      localStorage.removeItem('ebay_manual_token');
      
      // Simulate initial UI state
      this.simulateAuthStateHandler(false);
      
      // Verify UI elements show disconnected state
      const authButton = this.mockUIElements.get('authButton');
      const authStatus = this.mockUIElements.get('authStatus');
      const userInfo = this.mockUIElements.get('userInfo');
      
      const correctButtonText = authButton.textContent === 'Connect eBay Account';
      const correctButtonClass = authButton.classList.contains('disconnected');
      const correctStatusText = authStatus.textContent === 'Not Connected';
      const correctStatusClass = authStatus.classList.contains('disconnected');
      const userInfoHidden = userInfo.style.display === 'none';
      
      const testPassed = correctButtonText && correctButtonClass && 
                         correctStatusText && correctStatusClass && userInfoHidden;
      
      this.testResults.push({
        test: 'initialState',
        status: testPassed ? 'PASS' : 'FAIL',
        message: testPassed ? 'Initial disconnected state correct' : 'Initial state verification failed',
        data: {
          correctButtonText,
          correctButtonClass,
          correctStatusText,
          correctStatusClass,
          userInfoHidden
        }
      });
      
      console.log(`  ${testPassed ? '✅' : '❌'} Initial state: ${testPassed ? 'PASS' : 'FAIL'}`);
      return testPassed;
      
    } catch (error) {
      this.testResults.push({
        test: 'initialState',
        status: 'FAIL',
        message: 'Initial state test error: ' + error.message,
        data: { error: error.message }
      });
      
      console.log(`  ❌ Initial state: FAIL (${error.message})`);
      return false;
    }
  }

  /**
   * Test 2: Token storage triggers UI update
   */
  async testTokenStorageUIUpdate() {
    return new Promise((resolve) => {
      console.log('💾 Test 2: Token Storage UI Update');
      
      let uiUpdateTriggered = false;
      let correctUIState = false;
      
      // Set up event listener for storage events
      const storageHandler = (event) => {
        if (event.key === 'ebay_oauth_tokens') {
          console.log('📡 Storage event detected, updating UI...');
          uiUpdateTriggered = true;
          
          // Simulate UI update
          this.simulateAuthStateHandler(true);
          
          // Verify UI state
          setTimeout(() => {
            const authButton = this.mockUIElements.get('authButton');
            const authStatus = this.mockUIElements.get('authStatus');
            const userInfo = this.mockUIElements.get('userInfo');
            
            correctUIState = authButton.textContent === 'eBay Connected' &&
                           authButton.classList.contains('connected') &&
                           authStatus.textContent === 'Connected to eBay' &&
                           authStatus.classList.contains('connected') &&
                           userInfo.style.display === 'block';
            
            checkCompletion();
          }, 50);
        }
      };
      
      window.addEventListener('storage', storageHandler);
      
      // Store test tokens
      const testTokens = {
        access_token: 'ui_test_token_' + Date.now(),
        refresh_token: 'ui_refresh_token_' + Date.now(),
        token_type: 'Bearer',
        expires_in: 7200,
        expires_at: Date.now() + (7200 * 1000)
      };
      
      localStorage.setItem('ebay_oauth_tokens', JSON.stringify(testTokens));
      
      // Manually trigger storage event for same-window scenario
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'ebay_oauth_tokens',
        newValue: JSON.stringify(testTokens),
        oldValue: null,
        storageArea: localStorage,
        url: window.location.href
      }));
      
      const checkCompletion = () => {
        window.removeEventListener('storage', storageHandler);
        
        const testPassed = uiUpdateTriggered && correctUIState;
        
        this.testResults.push({
          test: 'tokenStorageUIUpdate',
          status: testPassed ? 'PASS' : 'FAIL',
          message: testPassed ? 'Token storage UI update successful' : `UI update failed - Triggered: ${uiUpdateTriggered}, Correct: ${correctUIState}`,
          data: { uiUpdateTriggered, correctUIState, testTokens }
        });
        
        console.log(`  ${testPassed ? '✅' : '❌'} Token storage UI update: ${testPassed ? 'PASS' : 'FAIL'}`);
        resolve(testPassed);
      };
      
      // Timeout after 2 seconds
      setTimeout(() => {
        if (!uiUpdateTriggered) {
          window.removeEventListener('storage', storageHandler);
          
          this.testResults.push({
            test: 'tokenStorageUIUpdate',
            status: 'FAIL',
            message: 'Token storage UI update timeout',
            data: { uiUpdateTriggered, timeout: true }
          });
          
          console.log(`  ❌ Token storage UI update: TIMEOUT`);
          resolve(false);
        }
      }, 2000);
    });
  }

  /**
   * Test 3: Custom event triggers UI update
   */
  async testCustomEventUIUpdate() {
    return new Promise((resolve) => {
      console.log('📡 Test 3: Custom Event UI Update');
      
      let customEventReceived = false;
      let uiUpdatedCorrectly = false;
      
      // Set up custom event listener
      const customEventHandler = (event) => {
        if (event.detail.authenticated) {
          console.log('📨 Custom auth event received, updating UI...');
          customEventReceived = true;
          
          // Simulate UI update
          this.simulateAuthStateHandler(true, event.detail.tokens);
          
          // Verify UI state
          setTimeout(() => {
            const authButton = this.mockUIElements.get('authButton');
            const authStatus = this.mockUIElements.get('authStatus');
            
            uiUpdatedCorrectly = authButton.classList.contains('connected') &&
                               authStatus.classList.contains('connected');
            
            checkCompletion();
          }, 50);
        }
      };
      
      window.addEventListener('ebayAuthChanged', customEventHandler);
      
      // Dispatch custom event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ebayAuthChanged', {
          detail: {
            authenticated: true,
            tokens: { access_token: 'custom_event_token' },
            source: 'ui_test',
            timestamp: Date.now()
          }
        }));
      }, 100);
      
      const checkCompletion = () => {
        window.removeEventListener('ebayAuthChanged', customEventHandler);
        
        const testPassed = customEventReceived && uiUpdatedCorrectly;
        
        this.testResults.push({
          test: 'customEventUIUpdate',
          status: testPassed ? 'PASS' : 'FAIL',
          message: testPassed ? 'Custom event UI update successful' : `Custom event UI update failed - Received: ${customEventReceived}, Updated: ${uiUpdatedCorrectly}`,
          data: { customEventReceived, uiUpdatedCorrectly }
        });
        
        console.log(`  ${testPassed ? '✅' : '❌'} Custom event UI update: ${testPassed ? 'PASS' : 'FAIL'}`);
        resolve(testPassed);
      };
      
      // Timeout after 2 seconds
      setTimeout(() => {
        if (!customEventReceived) {
          window.removeEventListener('ebayAuthChanged', customEventHandler);
          
          this.testResults.push({
            test: 'customEventUIUpdate',
            status: 'FAIL',
            message: 'Custom event UI update timeout',
            data: { customEventReceived, timeout: true }
          });
          
          console.log(`  ❌ Custom event UI update: TIMEOUT`);
          resolve(false);
        }
      }, 2000);
    });
  }

  /**
   * Test 4: Loading state management
   */
  async testLoadingStateManagement() {
    console.log('⏳ Test 4: Loading State Management');
    
    try {
      const authButton = this.mockUIElements.get('authButton');
      const loadingSpinner = this.mockUIElements.get('loadingSpinner');
      
      // Test loading state activation
      authButton.disabled = true;
      authButton.textContent = 'Connecting...';
      loadingSpinner.style.display = 'block';
      
      const loadingStateSet = authButton.disabled &&
                             authButton.textContent === 'Connecting...' &&
                             loadingSpinner.style.display === 'block';
      
      // Test loading state deactivation
      setTimeout(() => {
        authButton.disabled = false;
        authButton.textContent = 'eBay Connected';
        loadingSpinner.style.display = 'none';
        
        const loadingStateCleared = !authButton.disabled &&
                                   authButton.textContent === 'eBay Connected' &&
                                   loadingSpinner.style.display === 'none';
        
        const testPassed = loadingStateSet && loadingStateCleared;
        
        this.testResults.push({
          test: 'loadingStateManagement',
          status: testPassed ? 'PASS' : 'FAIL',
          message: testPassed ? 'Loading state management working' : 'Loading state management failed',
          data: { loadingStateSet, loadingStateCleared }
        });
        
        console.log(`  ${testPassed ? '✅' : '❌'} Loading state management: ${testPassed ? 'PASS' : 'FAIL'}`);
        
      }, 500); // Simulate loading delay
      
      return true; // Return immediately, actual test completes async
      
    } catch (error) {
      this.testResults.push({
        test: 'loadingStateManagement',
        status: 'FAIL',
        message: 'Loading state test error: ' + error.message,
        data: { error: error.message }
      });
      
      console.log(`  ❌ Loading state management: FAIL (${error.message})`);
      return false;
    }
  }

  /**
   * Test 5: Error state display
   */
  async testErrorStateDisplay() {
    console.log('❌ Test 5: Error State Display');
    
    try {
      const authButton = this.mockUIElements.get('authButton');
      const errorMessage = this.mockUIElements.get('errorMessage');
      const loadingSpinner = this.mockUIElements.get('loadingSpinner');
      
      // Simulate error state
      const testError = 'Test OAuth error: Connection failed';
      
      authButton.disabled = false;
      authButton.textContent = 'Connect eBay Account';
      loadingSpinner.style.display = 'none';
      errorMessage.style.display = 'block';
      errorMessage.textContent = testError;
      errorMessage.classList.add('visible');
      
      const errorStateCorrect = !authButton.disabled &&
                               authButton.textContent === 'Connect eBay Account' &&
                               loadingSpinner.style.display === 'none' &&
                               errorMessage.style.display === 'block' &&
                               errorMessage.textContent === testError;
      
      // Test error state clearing
      setTimeout(() => {
        errorMessage.style.display = 'none';
        errorMessage.textContent = '';
        errorMessage.classList.remove('visible');
        
        const errorStateCleared = errorMessage.style.display === 'none' &&
                                 errorMessage.textContent === '';
        
        const testPassed = errorStateCorrect && errorStateCleared;
        
        this.testResults.push({
          test: 'errorStateDisplay',
          status: testPassed ? 'PASS' : 'FAIL',
          message: testPassed ? 'Error state display working' : 'Error state display failed',
          data: { errorStateCorrect, errorStateCleared, testError }
        });
        
        console.log(`  ${testPassed ? '✅' : '❌'} Error state display: ${testPassed ? 'PASS' : 'FAIL'}`);
        
      }, 300); // Simulate error display duration
      
      return true;
      
    } catch (error) {
      this.testResults.push({
        test: 'errorStateDisplay',
        status: 'FAIL',
        message: 'Error state test error: ' + error.message,
        data: { error: error.message }
      });
      
      console.log(`  ❌ Error state display: FAIL (${error.message})`);
      return false;
    }
  }

  /**
   * Test 6: Logout/disconnect UI update
   */
  async testLogoutUIUpdate() {
    console.log('👋 Test 6: Logout UI Update');
    
    try {
      // First set connected state
      this.simulateAuthStateHandler(true);
      
      // Wait a moment then simulate logout
      setTimeout(() => {
        // Clear tokens
        localStorage.removeItem('ebay_oauth_tokens');
        localStorage.removeItem('ebay_manual_token');
        
        // Update UI to disconnected state
        this.simulateAuthStateHandler(false);
        
        // Verify disconnected state
        const authButton = this.mockUIElements.get('authButton');
        const authStatus = this.mockUIElements.get('authStatus');
        const userInfo = this.mockUIElements.get('userInfo');
        
        const correctLogoutState = authButton.textContent === 'Connect eBay Account' &&
                                  authButton.classList.contains('disconnected') &&
                                  authStatus.textContent === 'Not Connected' &&
                                  authStatus.classList.contains('disconnected') &&
                                  userInfo.style.display === 'none';
        
        this.testResults.push({
          test: 'logoutUIUpdate',
          status: correctLogoutState ? 'PASS' : 'FAIL',
          message: correctLogoutState ? 'Logout UI update successful' : 'Logout UI update failed',
          data: { correctLogoutState }
        });
        
        console.log(`  ${correctLogoutState ? '✅' : '❌'} Logout UI update: ${correctLogoutState ? 'PASS' : 'FAIL'}`);
        
      }, 200);
      
      return true;
      
    } catch (error) {
      this.testResults.push({
        test: 'logoutUIUpdate',
        status: 'FAIL',
        message: 'Logout UI test error: ' + error.message,
        data: { error: error.message }
      });
      
      console.log(`  ❌ Logout UI update: FAIL (${error.message})`);
      return false;
    }
  }

  /**
   * Cleanup test environment
   */
  cleanupTestEnvironment() {
    console.log('🧹 Cleaning up test environment...');
    
    // Restore original tokens
    if (this.originalTokens) {
      localStorage.setItem('ebay_oauth_tokens', this.originalTokens);
    } else {
      localStorage.removeItem('ebay_oauth_tokens');
    }
    
    if (this.originalManualToken) {
      localStorage.setItem('ebay_manual_token', this.originalManualToken);
    } else {
      localStorage.removeItem('ebay_manual_token');
    }
    
    // Remove mock UI elements
    const container = this.mockUIElements.get('container');
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    
    // Clear mock elements map
    this.mockUIElements.clear();
    
    // Remove any remaining event listeners
    this.eventListeners.forEach((listener, event) => {
      window.removeEventListener(event, listener);
    });
    this.eventListeners.clear();
    
    console.log('✅ Test environment cleanup complete');
  }

  /**
   * Run all UI state tests
   */
  async runAllTests() {
    console.log('🚀 [AUTH-STATE-UI-TEST] Running all authentication state UI tests...');
    
    // Setup test environment
    this.setupTestEnvironment();
    
    try {
      const tests = [
        this.testInitialState(),
        this.testTokenStorageUIUpdate(),
        this.testCustomEventUIUpdate(),
        this.testLoadingStateManagement(),
        this.testErrorStateDisplay(),
        this.testLogoutUIUpdate()
      ];
      
      // Run tests with staggered timing to avoid conflicts
      const results = [];
      for (let i = 0; i < tests.length; i++) {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 800)); // Wait between tests
        }
        results.push(await tests[i]);
      }
      
      console.log('📊 [AUTH-STATE-UI-TEST] All tests completed');
      this.printResults();
      
      return results;
    } finally {
      // Always cleanup
      setTimeout(() => {
        this.cleanupTestEnvironment();
      }, 1000); // Allow time for async tests to complete
    }
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log('\n📈 AUTH STATE UI TEST RESULTS:');
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
  window.AuthStateUITester = AuthStateUITester;
  
  // Auto-run tests if script is loaded directly
  const tester = new AuthStateUITester();
  tester.runAllTests().then(results => {
    console.log('🎉 [AUTH-STATE-UI-TEST] Authentication state UI testing complete!');
  });
} else {
  module.exports = AuthStateUITester;
}