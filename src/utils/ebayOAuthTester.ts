// eBay OAuth Flow Tester
// Utility functions to test and debug OAuth token persistence

export interface TokenTestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
}

export class EbayOAuthTester {
  private results: TokenTestResult[] = [];

  /**
   * Run comprehensive OAuth flow tests
   */
  async runAllTests(): Promise<TokenTestResult[]> {
    this.results = [];
    
    await this.testLocalStorageAccess();
    await this.testTokenStorage();
    await this.testTokenRetrieval();
    await this.testEventSystem();
    await this.testCrossTabCommunication();
    
    return this.results;
  }

  /**
   * Test localStorage basic functionality
   */
  private async testLocalStorageAccess(): Promise<void> {
    try {
      const testKey = 'ebay_oauth_test_' + Date.now();
      const testValue = { test: true, timestamp: Date.now() };
      
      // Test write
      localStorage.setItem(testKey, JSON.stringify(testValue));
      
      // Test read
      const retrieved = localStorage.getItem(testKey);
      const parsed = retrieved ? JSON.parse(retrieved) : null;
      
      // Test delete
      localStorage.removeItem(testKey);
      const afterDelete = localStorage.getItem(testKey);
      
      const success = parsed?.test === true && afterDelete === null;
      
      this.addResult('localStorage Access', success, 
        success ? 'localStorage working correctly' : 'localStorage access failed');
        
    } catch (error) {
      this.addResult('localStorage Access', false, `localStorage error: ${error.message}`);
    }
  }

  /**
   * Test token storage and format
   */
  private async testTokenStorage(): Promise<void> {
    try {
      const mockTokens = {
        access_token: 'test_access_token_' + Date.now(),
        refresh_token: 'test_refresh_token_' + Date.now(),
        expires_in: 7200,
        token_type: 'Bearer',
        expires_at: Date.now() + (7200 * 1000)
      };
      
      // Store tokens
      localStorage.setItem('ebay_oauth_tokens', JSON.stringify(mockTokens));
      localStorage.setItem('ebay_manual_token', mockTokens.access_token);
      
      // Verify storage
      const storedOAuth = localStorage.getItem('ebay_oauth_tokens');
      const storedManual = localStorage.getItem('ebay_manual_token');
      
      const oauthParsed = storedOAuth ? JSON.parse(storedOAuth) : null;
      
      const success = oauthParsed?.access_token === mockTokens.access_token &&
                     storedManual === mockTokens.access_token;
      
      this.addResult('Token Storage', success,
        success ? 'Tokens stored and retrieved correctly' : 'Token storage verification failed',
        { oauthStored: !!storedOAuth, manualStored: !!storedManual });
        
      // Cleanup
      localStorage.removeItem('ebay_oauth_tokens');
      localStorage.removeItem('ebay_manual_token');
      
    } catch (error) {
      this.addResult('Token Storage', false, `Token storage error: ${error.message}`);
    }
  }

  /**
   * Test token retrieval and validation
   */
  private async testTokenRetrieval(): Promise<void> {
    try {
      const mockTokens = {
        access_token: 'test_access_token_' + Date.now(),
        refresh_token: 'test_refresh_token_' + Date.now(),
        expires_in: 7200,
        token_type: 'Bearer',
        expires_at: Date.now() + (7200 * 1000)
      };
      
      // Store tokens
      localStorage.setItem('ebay_oauth_tokens', JSON.stringify(mockTokens));
      
      // Import OAuth service dynamically to avoid circular dependencies
      const { default: ebayOAuth } = await import('../services/ebayOAuth');
      
      // Test authentication check
      const isAuthenticated = ebayOAuth.isAuthenticated();
      
      this.addResult('Token Retrieval', isAuthenticated,
        isAuthenticated ? 'OAuth service correctly detects stored tokens' : 'OAuth service failed to detect tokens');
      
      // Cleanup
      localStorage.removeItem('ebay_oauth_tokens');
      
    } catch (error) {
      this.addResult('Token Retrieval', false, `Token retrieval error: ${error.message}`);
    }
  }

  /**
   * Test custom event system
   */
  private async testEventSystem(): Promise<void> {
    try {
      let eventReceived = false;
      let eventData: any = null;
      
      const handler = (e: CustomEvent) => {
        eventReceived = true;
        eventData = e.detail;
      };
      
      // Listen for custom event
      window.addEventListener('ebayAuthChanged', handler);
      
      // Dispatch test event
      const testDetail = { authenticated: true, test: 'event_system_test' };
      window.dispatchEvent(new CustomEvent('ebayAuthChanged', { detail: testDetail }));
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clean up
      window.removeEventListener('ebayAuthChanged', handler);
      
      const success = eventReceived && eventData?.test === 'event_system_test';
      
      this.addResult('Event System', success,
        success ? 'Custom events working correctly' : 'Custom event system failed');
        
    } catch (error) {
      this.addResult('Event System', false, `Event system error: ${error.message}`);
    }
  }

  /**
   * Test cross-tab communication via storage events
   */
  private async testCrossTabCommunication(): Promise<void> {
    try {
      let storageEventReceived = false;
      
      const handler = (e: StorageEvent) => {
        if (e.key === 'ebay_oauth_test_cross_tab') {
          storageEventReceived = true;
        }
      };
      
      // Listen for storage events
      window.addEventListener('storage', handler);
      
      // Simulate cross-tab storage change
      const testValue = 'cross_tab_test_' + Date.now();
      localStorage.setItem('ebay_oauth_test_cross_tab', testValue);
      
      // Manually dispatch storage event (simulates cross-tab change)
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'ebay_oauth_test_cross_tab',
        newValue: testValue,
        oldValue: null,
        storageArea: localStorage,
        url: window.location.href
      }));
      
      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clean up
      window.removeEventListener('storage', handler);
      localStorage.removeItem('ebay_oauth_test_cross_tab');
      
      this.addResult('Cross-Tab Communication', storageEventReceived,
        storageEventReceived ? 'Storage events working for cross-tab communication' : 'Storage events not firing correctly');
        
    } catch (error) {
      this.addResult('Cross-Tab Communication', false, `Cross-tab communication error: ${error.message}`);
    }
  }

  /**
   * Test OAuth flow timing and race conditions
   */
  async testOAuthFlowTiming(): Promise<TokenTestResult[]> {
    const timingResults: TokenTestResult[] = [];
    
    try {
      // Test rapid succession of auth checks
      const iterations = 10;
      const results: boolean[] = [];
      
      // Store mock tokens
      const mockTokens = {
        access_token: 'timing_test_token',
        refresh_token: 'timing_test_refresh',
        expires_in: 7200,
        token_type: 'Bearer',
        expires_at: Date.now() + (7200 * 1000)
      };
      
      localStorage.setItem('ebay_oauth_tokens', JSON.stringify(mockTokens));
      
      const { default: ebayOAuth } = await import('../services/ebayOAuth');
      
      // Rapid succession tests
      for (let i = 0; i < iterations; i++) {
        const isAuth = ebayOAuth.isAuthenticated();
        results.push(isAuth);
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms delay
      }
      
      const consistentResults = results.every(result => result === true);
      
      timingResults.push({
        test: 'Rapid Auth Checks',
        success: consistentResults,
        message: consistentResults ? 
          `All ${iterations} rapid auth checks returned consistent results` :
          `Inconsistent results in rapid auth checks: ${results.filter(r => r).length}/${iterations} true`,
        data: { results, iterations }
      });
      
      // Cleanup
      localStorage.removeItem('ebay_oauth_tokens');
      
    } catch (error) {
      timingResults.push({
        test: 'OAuth Flow Timing',
        success: false,
        message: `Timing test error: ${error.message}`
      });
    }
    
    return timingResults;
  }

  /**
   * Add test result
   */
  private addResult(test: string, success: boolean, message: string, data?: any): void {
    this.results.push({ test, success, message, data });
  }

  /**
   * Get summary of test results
   */
  getTestSummary(): { total: number; passed: number; failed: number; passRate: number } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.success).length;
    const failed = total - passed;
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    
    return { total, passed, failed, passRate };
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.results = [];
  }

  /**
   * Get all test results
   */
  getResults(): TokenTestResult[] {
    return [...this.results];
  }
}

// Export singleton instance
export const ebayOAuthTester = new EbayOAuthTester();