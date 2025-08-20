// OAuth Network Request Monitoring Testing Suite
// Tracks and validates all OAuth-related network requests and responses

console.log('🧪 [NETWORK-MONITOR-TEST] OAuth Network Request Monitoring Testing Suite Started');

class NetworkMonitoringTester {
  constructor() {
    this.testResults = [];
    this.capturedRequests = [];
    this.originalFetch = null;
    this.originalXMLHttpRequest = null;
    this.requestInterceptors = new Map();
  }

  /**
   * Setup network request interception
   */
  setupNetworkInterception() {
    console.log('🕷️ Setting up network request interception...');
    
    // Store original functions
    this.originalFetch = window.fetch;
    this.originalXMLHttpRequest = window.XMLHttpRequest;
    
    // Intercept fetch requests
    window.fetch = this.createFetchInterceptor();
    
    // Intercept XMLHttpRequest
    window.XMLHttpRequest = this.createXMLHttpRequestInterceptor();
    
    console.log('✅ Network interception setup complete');
  }

  /**
   * Create fetch interceptor
   */
  createFetchInterceptor() {
    const originalFetch = this.originalFetch;
    const capturedRequests = this.capturedRequests;
    
    return async function(resource, options = {}) {
      const startTime = Date.now();
      const requestId = 'req_' + startTime + '_' + Math.random().toString(36).substr(2, 9);
      
      // Capture request details
      const requestData = {
        id: requestId,
        method: options.method || 'GET',
        url: resource.toString(),
        headers: options.headers || {},
        body: options.body,
        timestamp: startTime,
        type: 'fetch',
        isOAuthRelated: NetworkMonitoringTester.isOAuthRelated(resource.toString()),
        status: null,
        response: null,
        duration: null,
        error: null
      };
      
      console.log(`📤 [NETWORK-MONITOR] Fetch request: ${requestData.method} ${requestData.url}`);
      
      try {
        const response = await originalFetch(resource, options);
        const endTime = Date.now();
        
        requestData.status = response.status;
        requestData.statusText = response.statusText;
        requestData.duration = endTime - startTime;
        requestData.responseHeaders = NetworkMonitoringTester.headersToObject(response.headers);
        
        // Clone response to capture body without consuming it
        const responseClone = response.clone();
        try {
          const responseText = await responseClone.text();
          requestData.response = responseText;
        } catch (e) {
          requestData.response = '[Unable to read response]';
        }
        
        console.log(`📥 [NETWORK-MONITOR] Response: ${requestData.status} (${requestData.duration}ms)`);
        
        capturedRequests.push(requestData);
        return response;
        
      } catch (error) {
        const endTime = Date.now();
        
        requestData.duration = endTime - startTime;
        requestData.error = error.message;
        requestData.status = 0;
        
        console.log(`❌ [NETWORK-MONITOR] Request error: ${error.message}`);
        
        capturedRequests.push(requestData);
        throw error;
      }
    };
  }

  /**
   * Create XMLHttpRequest interceptor
   */
  createXMLHttpRequestInterceptor() {
    const OriginalXMLHttpRequest = this.originalXMLHttpRequest;
    const capturedRequests = this.capturedRequests;
    
    return function() {
      const xhr = new OriginalXMLHttpRequest();
      const startTime = Date.now();
      const requestId = 'xhr_' + startTime + '_' + Math.random().toString(36).substr(2, 9);
      
      let requestData = {
        id: requestId,
        method: null,
        url: null,
        headers: {},
        body: null,
        timestamp: startTime,
        type: 'XMLHttpRequest',
        isOAuthRelated: false,
        status: null,
        response: null,
        duration: null,
        error: null
      };
      
      // Override open method
      const originalOpen = xhr.open;
      xhr.open = function(method, url, async, user, password) {
        requestData.method = method;
        requestData.url = url;
        requestData.isOAuthRelated = NetworkMonitoringTester.isOAuthRelated(url);
        
        console.log(`📤 [NETWORK-MONITOR] XHR request: ${method} ${url}`);
        
        return originalOpen.call(this, method, url, async, user, password);
      };
      
      // Override setRequestHeader
      const originalSetRequestHeader = xhr.setRequestHeader;
      xhr.setRequestHeader = function(header, value) {
        requestData.headers[header] = value;
        return originalSetRequestHeader.call(this, header, value);
      };
      
      // Override send method
      const originalSend = xhr.send;
      xhr.send = function(body) {
        requestData.body = body;
        return originalSend.call(this, body);
      };
      
      // Handle state changes
      xhr.addEventListener('readystatechange', function() {
        if (xhr.readyState === 4) {
          const endTime = Date.now();
          
          requestData.status = xhr.status;
          requestData.statusText = xhr.statusText;
          requestData.duration = endTime - startTime;
          requestData.response = xhr.responseText;
          
          if (xhr.status === 0 && requestData.url) {
            requestData.error = 'Network error or CORS issue';
          }
          
          console.log(`📥 [NETWORK-MONITOR] XHR response: ${requestData.status} (${requestData.duration}ms)`);
          
          capturedRequests.push(requestData);
        }
      });
      
      return xhr;
    };
  }

  /**
   * Check if URL is OAuth-related
   */
  static isOAuthRelated(url) {
    const oauthPatterns = [
      /oauth/i,
      /auth/i,
      /token/i,
      /ebay.*auth/i,
      /login/i,
      /callback/i,
      /\.netlify\/functions\/.*auth/i,
      /\.netlify\/functions\/.*oauth/i,
      /api\.ebay\.com/i
    ];
    
    return oauthPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Convert Headers object to plain object
   */
  static headersToObject(headers) {
    const obj = {};
    if (headers && typeof headers.entries === 'function') {
      for (let [key, value] of headers.entries()) {
        obj[key] = value;
      }
    }
    return obj;
  }

  /**
   * Restore original network functions
   */
  restoreNetworkFunctions() {
    console.log('🔄 Restoring original network functions...');
    
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }
    
    if (this.originalXMLHttpRequest) {
      window.XMLHttpRequest = this.originalXMLHttpRequest;
    }
    
    console.log('✅ Network functions restored');
  }

  /**
   * Test 1: Basic request interception
   */
  async testBasicRequestInterception() {
    console.log('🕷️ Test 1: Basic Request Interception');
    
    try {
      const initialRequestCount = this.capturedRequests.length;
      
      // Make a test request
      const testUrl = 'https://httpbin.org/json';
      
      try {
        const response = await fetch(testUrl);
        await response.json();
      } catch (error) {
        // Ignore network errors for this test
        console.log('  Network request failed (expected in some environments)');
      }
      
      // Check if request was captured
      const newRequests = this.capturedRequests.filter(req => req.url === testUrl);
      const requestCaptured = newRequests.length > 0;
      
      this.testResults.push({
        test: 'basicRequestInterception',
        status: requestCaptured ? 'PASS' : 'FAIL',
        message: requestCaptured ? 'Request interception working' : 'Request interception failed',
        data: { requestCaptured, newRequests, totalRequests: this.capturedRequests.length }
      });
      
      console.log(`  ${requestCaptured ? '✅' : '❌'} Basic interception: ${requestCaptured ? 'PASS' : 'FAIL'}`);
      return requestCaptured;
      
    } catch (error) {
      this.testResults.push({
        test: 'basicRequestInterception',
        status: 'FAIL',
        message: 'Basic interception test error: ' + error.message,
        data: { error: error.message }
      });
      
      console.log(`  ❌ Basic interception: FAIL (${error.message})`);
      return false;
    }
  }

  /**
   * Test 2: OAuth request detection
   */
  async testOAuthRequestDetection() {
    console.log('🔐 Test 2: OAuth Request Detection');
    
    try {
      const oauthUrls = [
        '/.netlify/functions/ebay-oauth',
        'https://api.ebay.com/identity/v1/oauth2/token',
        'https://auth.ebay.com/oauth2/authorize',
        '/auth/callback',
        '/api/login'
      ];
      
      let detectedOAuthRequests = 0;
      
      // Simulate OAuth requests (using mock fetch)
      for (const url of oauthUrls) {
        try {
          await fetch(url, { method: 'POST' });
        } catch (error) {
          // Ignore network errors, we're testing detection
        }
        
        // Check if detected as OAuth-related
        const recentRequest = this.capturedRequests[this.capturedRequests.length - 1];
        if (recentRequest && recentRequest.isOAuthRelated) {
          detectedOAuthRequests++;
        }
      }
      
      const detectionRate = detectedOAuthRequests / oauthUrls.length;
      const testPassed = detectionRate >= 0.8; // 80% detection rate
      
      this.testResults.push({
        test: 'oauthRequestDetection',
        status: testPassed ? 'PASS' : 'FAIL',
        message: `OAuth detection: ${detectedOAuthRequests}/${oauthUrls.length} requests detected`,
        data: { 
          detectedOAuthRequests, 
          totalOAuthUrls: oauthUrls.length, 
          detectionRate: Math.round(detectionRate * 100) + '%',
          oauthUrls 
        }
      });
      
      console.log(`  ${testPassed ? '✅' : '❌'} OAuth detection: ${testPassed ? 'PASS' : 'FAIL'} (${Math.round(detectionRate * 100)}%)`);
      return testPassed;
      
    } catch (error) {
      this.testResults.push({
        test: 'oauthRequestDetection',
        status: 'FAIL',
        message: 'OAuth detection test error: ' + error.message,
        data: { error: error.message }
      });
      
      console.log(`  ❌ OAuth detection: FAIL (${error.message})`);
      return false;
    }
  }

  /**
   * Test 3: Request timing measurement
   */
  async testRequestTimingMeasurement() {
    console.log('⏱️ Test 3: Request Timing Measurement');
    
    try {
      const testUrl = 'data:text/plain,test'; // Fast data URL
      const startTime = Date.now();
      
      try {
        await fetch(testUrl);
      } catch (error) {
        // Data URLs might not work in all environments
      }
      
      const endTime = Date.now();
      const actualDuration = endTime - startTime;
      
      // Find the captured request
      const capturedRequest = this.capturedRequests.find(req => req.url === testUrl);
      
      if (capturedRequest && capturedRequest.duration !== null) {
        const timingAccuracy = Math.abs(capturedRequest.duration - actualDuration) < 100; // Within 100ms
        
        this.testResults.push({
          test: 'requestTimingMeasurement',
          status: timingAccuracy ? 'PASS' : 'FAIL',
          message: timingAccuracy ? 'Request timing accurate' : 'Request timing inaccurate',
          data: { 
            capturedDuration: capturedRequest.duration,
            actualDuration,
            difference: Math.abs(capturedRequest.duration - actualDuration),
            timingAccuracy
          }
        });
        
        console.log(`  ${timingAccuracy ? '✅' : '❌'} Timing measurement: ${timingAccuracy ? 'PASS' : 'FAIL'}`);
        return timingAccuracy;
      } else {
        this.testResults.push({
          test: 'requestTimingMeasurement',
          status: 'FAIL',
          message: 'Request timing not captured',
          data: { capturedRequest: !!capturedRequest }
        });
        
        console.log(`  ❌ Timing measurement: FAIL (not captured)`);
        return false;
      }
      
    } catch (error) {
      this.testResults.push({
        test: 'requestTimingMeasurement',
        status: 'FAIL',
        message: 'Timing measurement test error: ' + error.message,
        data: { error: error.message }
      });
      
      console.log(`  ❌ Timing measurement: FAIL (${error.message})`);
      return false;
    }
  }

  /**
   * Test 4: Request headers capture
   */
  async testRequestHeadersCapture() {
    console.log('📋 Test 4: Request Headers Capture');
    
    try {
      const testHeaders = {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token',
        'X-Test-Header': 'test-value'
      };
      
      const testUrl = 'data:text/plain,headers-test';
      
      try {
        await fetch(testUrl, {
          method: 'POST',
          headers: testHeaders,
          body: JSON.stringify({ test: 'data' })
        });
      } catch (error) {
        // Data URLs might not support POST in all environments
      }
      
      // Find the captured request
      const capturedRequest = this.capturedRequests.find(req => req.url === testUrl);
      
      if (capturedRequest) {
        const headersCaptured = Object.keys(testHeaders).every(header => 
          capturedRequest.headers && capturedRequest.headers[header] === testHeaders[header]
        );
        
        this.testResults.push({
          test: 'requestHeadersCapture',
          status: headersCaptured ? 'PASS' : 'FAIL',
          message: headersCaptured ? 'Request headers captured correctly' : 'Request headers not captured',
          data: { 
            expectedHeaders: testHeaders,
            capturedHeaders: capturedRequest.headers,
            headersCaptured
          }
        });
        
        console.log(`  ${headersCaptured ? '✅' : '❌'} Headers capture: ${headersCaptured ? 'PASS' : 'FAIL'}`);
        return headersCaptured;
      } else {
        this.testResults.push({
          test: 'requestHeadersCapture',
          status: 'FAIL',
          message: 'Request not captured for headers test',
          data: { capturedRequest: !!capturedRequest }
        });
        
        console.log(`  ❌ Headers capture: FAIL (request not captured)`);
        return false;
      }
      
    } catch (error) {
      this.testResults.push({
        test: 'requestHeadersCapture',
        status: 'FAIL',
        message: 'Headers capture test error: ' + error.message,
        data: { error: error.message }
      });
      
      console.log(`  ❌ Headers capture: FAIL (${error.message})`);
      return false;
    }
  }

  /**
   * Test 5: Error request handling
   */
  async testErrorRequestHandling() {
    console.log('❌ Test 5: Error Request Handling');
    
    try {
      const errorUrl = 'https://invalid-domain-that-does-not-exist.com/test';
      
      try {
        await fetch(errorUrl);
      } catch (error) {
        // Expected to fail
        console.log('  Request failed as expected');
      }
      
      // Find the captured error request
      const capturedRequest = this.capturedRequests.find(req => req.url === errorUrl);
      
      if (capturedRequest) {
        const errorHandled = capturedRequest.error !== null || capturedRequest.status === 0;
        
        this.testResults.push({
          test: 'errorRequestHandling',
          status: errorHandled ? 'PASS' : 'FAIL',
          message: errorHandled ? 'Error requests handled correctly' : 'Error requests not handled',
          data: { 
            capturedError: capturedRequest.error,
            capturedStatus: capturedRequest.status,
            errorHandled
          }
        });
        
        console.log(`  ${errorHandled ? '✅' : '❌'} Error handling: ${errorHandled ? 'PASS' : 'FAIL'}`);
        return errorHandled;
      } else {
        this.testResults.push({
          test: 'errorRequestHandling',
          status: 'FAIL',
          message: 'Error request not captured',
          data: { capturedRequest: !!capturedRequest }
        });
        
        console.log(`  ❌ Error handling: FAIL (request not captured)`);
        return false;
      }
      
    } catch (error) {
      this.testResults.push({
        test: 'errorRequestHandling',
        status: 'FAIL',
        message: 'Error handling test error: ' + error.message,
        data: { error: error.message }
      });
      
      console.log(`  ❌ Error handling: FAIL (${error.message})`);
      return false;
    }
  }

  /**
   * Generate network monitoring report
   */
  generateNetworkReport() {
    console.log('\n📊 NETWORK MONITORING REPORT:');
    console.log('==============================');
    
    const oauthRequests = this.capturedRequests.filter(req => req.isOAuthRelated);
    const totalRequests = this.capturedRequests.length;
    const successfulRequests = this.capturedRequests.filter(req => req.status >= 200 && req.status < 300).length;
    const errorRequests = this.capturedRequests.filter(req => req.error || req.status === 0 || req.status >= 400).length;
    
    console.log(`📊 Total Requests Captured: ${totalRequests}`);
    console.log(`🔐 OAuth-Related Requests: ${oauthRequests.length}`);
    console.log(`✅ Successful Requests: ${successfulRequests}`);
    console.log(`❌ Error Requests: ${errorRequests}`);
    
    if (oauthRequests.length > 0) {
      console.log('\n🔐 OAUTH REQUESTS DETAILS:');
      oauthRequests.forEach((req, index) => {
        console.log(`  ${index + 1}. ${req.method} ${req.url}`);
        console.log(`     Status: ${req.status} | Duration: ${req.duration}ms`);
        if (req.error) {
          console.log(`     Error: ${req.error}`);
        }
      });
    }
    
    const avgDuration = totalRequests > 0 ? 
      Math.round(this.capturedRequests.reduce((sum, req) => sum + (req.duration || 0), 0) / totalRequests) : 0;
    
    console.log(`\n⏱️ Average Request Duration: ${avgDuration}ms`);
    
    return {
      totalRequests,
      oauthRequests: oauthRequests.length,
      successfulRequests,
      errorRequests,
      avgDuration,
      capturedRequests: this.capturedRequests
    };
  }

  /**
   * Run all network monitoring tests
   */
  async runAllTests() {
    console.log('🚀 [NETWORK-MONITOR-TEST] Running all network monitoring tests...');
    
    // Setup network interception
    this.setupNetworkInterception();
    
    try {
      const tests = [
        this.testBasicRequestInterception(),
        this.testOAuthRequestDetection(),
        this.testRequestTimingMeasurement(),
        this.testRequestHeadersCapture(),
        this.testErrorRequestHandling()
      ];
      
      // Run tests with delays to avoid conflicts
      const results = [];
      for (let i = 0; i < tests.length; i++) {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        results.push(await tests[i]);
      }
      
      console.log('📊 [NETWORK-MONITOR-TEST] All tests completed');
      this.printResults();
      
      // Generate network report
      setTimeout(() => {
        this.generateNetworkReport();
      }, 500);
      
      return results;
    } finally {
      // Restore original functions after a delay
      setTimeout(() => {
        this.restoreNetworkFunctions();
      }, 2000);
    }
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log('\n📈 NETWORK MONITORING TEST RESULTS:');
    console.log('====================================');
    
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
   * Get test results and captured requests
   */
  getResults() {
    return {
      results: this.testResults,
      capturedRequests: this.capturedRequests,
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
  window.NetworkMonitoringTester = NetworkMonitoringTester;
  
  // Auto-run tests if script is loaded directly
  const tester = new NetworkMonitoringTester();
  tester.runAllTests().then(results => {
    console.log('🎉 [NETWORK-MONITOR-TEST] Network monitoring testing complete!');
  });
} else {
  module.exports = NetworkMonitoringTester;
}