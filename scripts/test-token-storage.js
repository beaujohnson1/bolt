// OAuth Token Storage Testing Suite
// Comprehensive testing of localStorage persistence, validation, and retrieval

console.log('🧪 [TOKEN-STORAGE-TEST] OAuth Token Storage Testing Suite Started');

class TokenStorageTester {
  constructor() {
    this.testResults = [];
    this.originalTokens = null;
    this.originalManualToken = null;
  }

  /**
   * Backup existing tokens before testing
   */
  backupExistingTokens() {
    this.originalTokens = localStorage.getItem('ebay_oauth_tokens');
    this.originalManualToken = localStorage.getItem('ebay_manual_token');
    console.log('💾 Backed up existing tokens for restoration');
  }

  /**
   * Restore original tokens after testing
   */
  restoreOriginalTokens() {
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
    
    console.log('🔄 Restored original tokens');
  }

  /**
   * Test 1: Basic token storage and retrieval
   */
  async testBasicTokenStorage() {
    console.log('💾 Test 1: Basic Token Storage and Retrieval');
    
    const testTokens = {
      access_token: 'test_access_' + Date.now(),
      refresh_token: 'test_refresh_' + Date.now(),
      token_type: 'Bearer',
      expires_in: 7200,
      expires_at: Date.now() + (7200 * 1000),
      scope: 'https://api.ebay.com/oauth/api_scope'
    };
    
    try {
      // Store tokens
      localStorage.setItem('ebay_oauth_tokens', JSON.stringify(testTokens));
      localStorage.setItem('ebay_manual_token', testTokens.access_token);
      
      // Retrieve and validate
      const stored = localStorage.getItem('ebay_oauth_tokens');
      const storedManual = localStorage.getItem('ebay_manual_token');
      
      if (!stored || !storedManual) {
        throw new Error('Storage failed - tokens not found');
      }
      
      const parsed = JSON.parse(stored);
      
      const isValid = parsed.access_token === testTokens.access_token &&
                      parsed.refresh_token === testTokens.refresh_token &&
                      parsed.token_type === testTokens.token_type &&
                      storedManual === testTokens.access_token;
      
      this.testResults.push({
        test: 'basicTokenStorage',
        status: isValid ? 'PASS' : 'FAIL',
        message: isValid ? 'Basic token storage working' : 'Token data mismatch',
        data: { original: testTokens, retrieved: parsed, manualToken: storedManual }
      });
      
      return isValid;
    } catch (error) {
      this.testResults.push({
        test: 'basicTokenStorage',
        status: 'FAIL',
        message: 'Storage error: ' + error.message,
        data: { error: error.message }
      });
      return false;
    }
  }

  /**
   * Test 2: Token validation and structure verification
   */
  async testTokenValidation() {
    console.log('🔍 Test 2: Token Validation and Structure');
    
    const validationTests = [
      {
        name: 'validComplete',
        tokens: {
          access_token: 'valid_access_token',
          refresh_token: 'valid_refresh_token',
          token_type: 'Bearer',
          expires_in: 7200,
          expires_at: Date.now() + (7200 * 1000)
        },
        shouldPass: true
      },
      {
        name: 'missingAccessToken',
        tokens: {
          refresh_token: 'valid_refresh_token',
          token_type: 'Bearer',
          expires_in: 7200
        },
        shouldPass: false
      },
      {
        name: 'missingTokenType',
        tokens: {
          access_token: 'valid_access_token',
          refresh_token: 'valid_refresh_token',
          expires_in: 7200
        },
        shouldPass: false
      },
      {
        name: 'expiredToken',
        tokens: {
          access_token: 'expired_access_token',
          refresh_token: 'valid_refresh_token',
          token_type: 'Bearer',
          expires_in: 7200,
          expires_at: Date.now() - 3600000 // 1 hour ago
        },
        shouldPass: true // Should pass storage, but fail authentication
      }
    ];
    
    let passedTests = 0;
    
    for (const test of validationTests) {
      try {
        localStorage.setItem('ebay_oauth_tokens', JSON.stringify(test.tokens));
        
        // Validate structure
        const stored = localStorage.getItem('ebay_oauth_tokens');
        const parsed = JSON.parse(stored);
        
        const hasRequiredFields = parsed.access_token && parsed.token_type;
        const testPassed = test.shouldPass ? hasRequiredFields : !hasRequiredFields;
        
        if (testPassed) passedTests++;
        
        console.log(`  ${testPassed ? '✅' : '❌'} ${test.name}: ${testPassed ? 'PASS' : 'FAIL'}`);
        
      } catch (error) {
        const testPassed = !test.shouldPass; // Error should occur for invalid tokens
        if (testPassed) passedTests++;
        console.log(`  ${testPassed ? '✅' : '❌'} ${test.name}: ${testPassed ? 'PASS' : 'FAIL'} (${error.message})`);
      }
    }
    
    const allPassed = passedTests === validationTests.length;
    
    this.testResults.push({
      test: 'tokenValidation',
      status: allPassed ? 'PASS' : 'FAIL',
      message: `Validation tests: ${passedTests}/${validationTests.length} passed`,
      data: { passedTests, totalTests: validationTests.length }
    });
    
    return allPassed;
  }

  /**
   * Test 3: Storage persistence across page reloads (simulation)
   */
  async testStoragePersistence() {
    console.log('🔄 Test 3: Storage Persistence Simulation');
    
    const testTokens = {
      access_token: 'persistent_test_token_' + Date.now(),
      refresh_token: 'persistent_refresh_token_' + Date.now(),
      token_type: 'Bearer',
      expires_in: 7200,
      expires_at: Date.now() + (7200 * 1000)
    };
    
    try {
      // Store tokens
      localStorage.setItem('ebay_oauth_tokens', JSON.stringify(testTokens));
      
      // Simulate multiple retrieval attempts at different times
      const retrievalTests = [];
      const delays = [0, 100, 500, 1000, 2000];
      
      for (const delay of delays) {
        await new Promise(resolve => {
          setTimeout(() => {
            try {
              const stored = localStorage.getItem('ebay_oauth_tokens');
              const parsed = stored ? JSON.parse(stored) : null;
              const isValid = parsed && parsed.access_token === testTokens.access_token;
              
              retrievalTests.push({
                delay,
                success: isValid,
                timestamp: Date.now()
              });
              
              console.log(`  Retrieval at ${delay}ms: ${isValid ? 'SUCCESS' : 'FAILED'}`);
              resolve();
            } catch (error) {
              retrievalTests.push({
                delay,
                success: false,
                error: error.message,
                timestamp: Date.now()
              });
              resolve();
            }
          }, delay);
        });
      }
      
      const successfulRetrievals = retrievalTests.filter(t => t.success).length;
      const allSuccessful = successfulRetrievals === retrievalTests.length;
      
      this.testResults.push({
        test: 'storagePersistence',
        status: allSuccessful ? 'PASS' : 'FAIL',
        message: `Persistence: ${successfulRetrievals}/${retrievalTests.length} retrievals successful`,
        data: { retrievalTests, successfulRetrievals }
      });
      
      return allSuccessful;
    } catch (error) {
      this.testResults.push({
        test: 'storagePersistence',
        status: 'FAIL',
        message: 'Persistence test error: ' + error.message,
        data: { error: error.message }
      });
      return false;
    }
  }

  /**
   * Test 4: Concurrent storage operations
   */
  async testConcurrentOperations() {
    console.log('⚡ Test 4: Concurrent Storage Operations');
    
    const concurrentOperations = [];
    const operationCount = 10;
    
    // Create multiple concurrent storage operations
    for (let i = 0; i < operationCount; i++) {
      concurrentOperations.push(
        new Promise((resolve) => {
          setTimeout(() => {
            try {
              const tokens = {
                access_token: `concurrent_token_${i}_${Date.now()}`,
                refresh_token: `concurrent_refresh_${i}_${Date.now()}`,
                token_type: 'Bearer',
                expires_in: 7200,
                operation_id: i
              };
              
              localStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokens));
              
              // Immediately verify
              const stored = localStorage.getItem('ebay_oauth_tokens');
              const parsed = JSON.parse(stored);
              
              const success = parsed.operation_id === i;
              
              resolve({
                operation: i,
                success,
                timestamp: Date.now(),
                tokens: success ? tokens : null
              });
            } catch (error) {
              resolve({
                operation: i,
                success: false,
                error: error.message,
                timestamp: Date.now()
              });
            }
          }, Math.random() * 100); // Random delay 0-100ms
        })
      );
    }
    
    try {
      const results = await Promise.all(concurrentOperations);
      const successfulOps = results.filter(r => r.success).length;
      
      // Check final state
      const finalStored = localStorage.getItem('ebay_oauth_tokens');
      const finalParsed = finalStored ? JSON.parse(finalStored) : null;
      
      console.log(`  Concurrent operations: ${successfulOps}/${operationCount} successful`);
      console.log(`  Final state valid: ${!!finalParsed}`);
      
      const testPassed = successfulOps > 0 && finalParsed; // At least some operations should succeed
      
      this.testResults.push({
        test: 'concurrentOperations',
        status: testPassed ? 'PASS' : 'FAIL',
        message: `Concurrent ops: ${successfulOps}/${operationCount} successful, final state: ${!!finalParsed}`,
        data: { results, successfulOps, finalState: finalParsed }
      });
      
      return testPassed;
    } catch (error) {
      this.testResults.push({
        test: 'concurrentOperations',
        status: 'FAIL',
        message: 'Concurrent operations error: ' + error.message,
        data: { error: error.message }
      });
      return false;
    }
  }

  /**
   * Test 5: Storage quota and large token handling
   */
  async testStorageQuota() {
    console.log('📏 Test 5: Storage Quota and Large Token Handling');
    
    try {
      // Test with various token sizes
      const tokenSizes = [
        { name: 'small', size: 100 },
        { name: 'medium', size: 1000 },
        { name: 'large', size: 10000 },
        { name: 'xlarge', size: 50000 }
      ];
      
      const sizeTests = [];
      
      for (const sizeTest of tokenSizes) {
        try {
          const largeToken = 'x'.repeat(sizeTest.size);
          const testTokens = {
            access_token: largeToken,
            refresh_token: 'refresh_' + largeToken,
            token_type: 'Bearer',
            expires_in: 7200,
            size_test: sizeTest.name
          };
          
          localStorage.setItem('ebay_oauth_tokens', JSON.stringify(testTokens));
          
          // Verify storage
          const stored = localStorage.getItem('ebay_oauth_tokens');
          const parsed = JSON.parse(stored);
          
          const success = parsed.access_token === largeToken;
          sizeTests.push({
            size: sizeTest.name,
            bytes: sizeTest.size,
            success,
            actualSize: JSON.stringify(testTokens).length
          });
          
          console.log(`  ${success ? '✅' : '❌'} ${sizeTest.name} token (${sizeTest.size} chars): ${success ? 'SUCCESS' : 'FAILED'}`);
          
        } catch (error) {
          sizeTests.push({
            size: sizeTest.name,
            bytes: sizeTest.size,
            success: false,
            error: error.message
          });
          console.log(`  ❌ ${sizeTest.name} token (${sizeTest.size} chars): FAILED - ${error.message}`);
        }
      }
      
      const successfulSizes = sizeTests.filter(t => t.success).length;
      const testPassed = successfulSizes >= 2; // At least small and medium should work
      
      this.testResults.push({
        test: 'storageQuota',
        status: testPassed ? 'PASS' : 'FAIL',
        message: `Storage sizes: ${successfulSizes}/${sizeTests.length} successful`,
        data: { sizeTests, successfulSizes }
      });
      
      return testPassed;
    } catch (error) {
      this.testResults.push({
        test: 'storageQuota',
        status: 'FAIL',
        message: 'Storage quota test error: ' + error.message,
        data: { error: error.message }
      });
      return false;
    }
  }

  /**
   * Test 6: Token expiry detection
   */
  async testTokenExpiryDetection() {
    console.log('⏰ Test 6: Token Expiry Detection');
    
    const now = Date.now();
    const expiryTests = [
      {
        name: 'fresh',
        expires_at: now + (7200 * 1000), // 2 hours future
        shouldBeExpired: false
      },
      {
        name: 'nearExpiry',
        expires_at: now + (5 * 60 * 1000), // 5 minutes future
        shouldBeExpired: false
      },
      {
        name: 'bufferZone',
        expires_at: now + (2 * 60 * 1000), // 2 minutes future (within 5min buffer)
        shouldBeExpired: true // Should be considered expired due to buffer
      },
      {
        name: 'expired',
        expires_at: now - (60 * 1000), // 1 minute past
        shouldBeExpired: true
      }
    ];
    
    let correctDetections = 0;
    
    for (const test of expiryTests) {
      try {
        const testTokens = {
          access_token: `expiry_test_${test.name}`,
          refresh_token: 'refresh_token',
          token_type: 'Bearer',
          expires_in: Math.floor((test.expires_at - now) / 1000),
          expires_at: test.expires_at
        };
        
        localStorage.setItem('ebay_oauth_tokens', JSON.stringify(testTokens));
        
        // Check expiry (with 5 minute buffer like real implementation)
        const stored = localStorage.getItem('ebay_oauth_tokens');
        const parsed = JSON.parse(stored);
        const isExpired = parsed.expires_at && (Date.now() + 300000) > parsed.expires_at;
        
        const correctDetection = isExpired === test.shouldBeExpired;
        if (correctDetection) correctDetections++;
        
        console.log(`  ${correctDetection ? '✅' : '❌'} ${test.name}: Expected ${test.shouldBeExpired ? 'expired' : 'valid'}, got ${isExpired ? 'expired' : 'valid'}`);
        
      } catch (error) {
        console.log(`  ❌ ${test.name}: Error - ${error.message}`);
      }
    }
    
    const allCorrect = correctDetections === expiryTests.length;
    
    this.testResults.push({
      test: 'tokenExpiryDetection',
      status: allCorrect ? 'PASS' : 'FAIL',
      message: `Expiry detection: ${correctDetections}/${expiryTests.length} correct`,
      data: { correctDetections, totalTests: expiryTests.length }
    });
    
    return allCorrect;
  }

  /**
   * Run all storage tests
   */
  async runAllTests() {
    console.log('🚀 [TOKEN-STORAGE-TEST] Running all storage tests...');
    
    // Backup existing tokens
    this.backupExistingTokens();
    
    try {
      const tests = [
        this.testBasicTokenStorage(),
        this.testTokenValidation(),
        this.testStoragePersistence(),
        this.testConcurrentOperations(),
        this.testStorageQuota(),
        this.testTokenExpiryDetection()
      ];
      
      const results = await Promise.all(tests);
      
      console.log('📊 [TOKEN-STORAGE-TEST] All tests completed');
      this.printResults();
      
      return results;
    } finally {
      // Always restore original tokens
      this.restoreOriginalTokens();
    }
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log('\n📈 TOKEN STORAGE TEST RESULTS:');
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
  window.TokenStorageTester = TokenStorageTester;
  
  // Auto-run tests if script is loaded directly
  const tester = new TokenStorageTester();
  tester.runAllTests().then(results => {
    console.log('🎉 [TOKEN-STORAGE-TEST] Storage testing complete!');
  });
} else {
  module.exports = TokenStorageTester;
}