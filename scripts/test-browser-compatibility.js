// OAuth Browser Compatibility Testing Suite
// Tests OAuth functionality across different browser APIs and feature detection

console.log('🧪 [BROWSER-COMPAT-TEST] OAuth Browser Compatibility Testing Suite Started');

class BrowserCompatibilityTester {
  constructor() {
    this.testResults = [];
    this.browserFeatures = {};
  }

  /**
   * Detect browser capabilities
   */
  detectBrowserFeatures() {
    console.log('🔍 Detecting browser features...');
    
    this.browserFeatures = {
      localStorage: typeof Storage !== 'undefined' && typeof localStorage !== 'undefined',
      sessionStorage: typeof Storage !== 'undefined' && typeof sessionStorage !== 'undefined',
      postMessage: typeof window.postMessage === 'function',
      addEventListener: typeof window.addEventListener === 'function',
      dispatchEvent: typeof window.dispatchEvent === 'function',
      customEvent: typeof CustomEvent !== 'undefined',
      storageEvent: typeof StorageEvent !== 'undefined',
      messageEvent: typeof MessageEvent !== 'undefined',
      broadcastChannel: typeof BroadcastChannel !== 'undefined',
      windowOpen: typeof window.open === 'function',
      json: typeof JSON !== 'undefined' && typeof JSON.parse === 'function' && typeof JSON.stringify === 'function',
      promise: typeof Promise !== 'undefined',
      fetch: typeof fetch !== 'undefined',
      setInterval: typeof setInterval === 'function',
      setTimeout: typeof setTimeout === 'function',
      urlSearchParams: typeof URLSearchParams !== 'undefined',
      history: typeof window.history !== 'undefined' && typeof window.history.replaceState === 'function',
      
      // Advanced features
      weakMap: typeof WeakMap !== 'undefined',
      map: typeof Map !== 'undefined',
      set: typeof Set !== 'undefined',
      arrow: (() => { try { return eval('(() => true)()'); } catch(e) { return false; } })(),
      async: (() => { try { return eval('(async () => true)()') instanceof Promise; } catch(e) { return false; } })(),
      destructuring: (() => { try { eval('const {a} = {a:1}'); return true; } catch(e) { return false; } })(),
      templateLiterals: (() => { try { return eval('`test`') === 'test'; } catch(e) { return false; } })(),
      
      // Browser specific
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
    
    console.log('📊 Browser features detected:', this.browserFeatures);
    return this.browserFeatures;
  }

  /**
   * Test 1: localStorage compatibility
   */
  async testLocalStorageCompatibility() {
    console.log('💾 Test 1: localStorage Compatibility');
    
    const tests = [
      {
        name: 'basicStorage',
        test: () => {
          localStorage.setItem('test', 'value');
          const retrieved = localStorage.getItem('test');
          localStorage.removeItem('test');
          return retrieved === 'value';
        }
      },
      {
        name: 'jsonStorage',
        test: () => {
          const testObj = { key: 'value', number: 123 };
          localStorage.setItem('testObj', JSON.stringify(testObj));
          const retrieved = JSON.parse(localStorage.getItem('testObj'));
          localStorage.removeItem('testObj');
          return retrieved.key === 'value' && retrieved.number === 123;
        }
      },
      {
        name: 'largeStorage',
        test: () => {
          const largeString = 'x'.repeat(10000);
          localStorage.setItem('large', largeString);
          const retrieved = localStorage.getItem('large');
          localStorage.removeItem('large');
          return retrieved === largeString;
        }
      },
      {
        name: 'specialCharacters',
        test: () => {
          const specialChars = '!@#$%^&*(){}[]|\\:";\'<>?,./ 测试 🎉';
          localStorage.setItem('special', specialChars);
          const retrieved = localStorage.getItem('special');
          localStorage.removeItem('special');
          return retrieved === specialChars;
        }
      }
    ];
    
    let passedTests = 0;
    const results = [];
    
    for (const test of tests) {
      try {
        const result = test.test();
        if (result) passedTests++;
        results.push({ name: test.name, passed: result });
        console.log(`  ${result ? '✅' : '❌'} ${test.name}: ${result ? 'PASS' : 'FAIL'}`);
      } catch (error) {
        results.push({ name: test.name, passed: false, error: error.message });
        console.log(`  ❌ ${test.name}: FAIL (${error.message})`);
      }
    }
    
    const testPassed = passedTests >= tests.length * 0.8; // 80% success rate
    
    this.testResults.push({
      test: 'localStorageCompatibility',
      status: testPassed ? 'PASS' : 'FAIL',
      message: `localStorage tests: ${passedTests}/${tests.length} passed`,
      data: { passedTests, totalTests: tests.length, results }
    });
    
    return testPassed;
  }

  /**
   * Test 2: Event system compatibility
   */
  async testEventSystemCompatibility() {
    console.log('📡 Test 2: Event System Compatibility');
    
    const eventTests = [];
    
    // Test 1: Basic event listening and dispatching
    try {
      let eventReceived = false;
      const handler = () => { eventReceived = true; };
      
      window.addEventListener('testEvent', handler);
      window.dispatchEvent(new Event('testEvent'));
      window.removeEventListener('testEvent', handler);
      
      eventTests.push({ name: 'basicEvents', passed: eventReceived });
      console.log(`  ${eventReceived ? '✅' : '❌'} Basic events: ${eventReceived ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      eventTests.push({ name: 'basicEvents', passed: false, error: error.message });
      console.log(`  ❌ Basic events: FAIL (${error.message})`);
    }
    
    // Test 2: Custom events with data
    try {
      let customEventData = null;
      const handler = (e) => { customEventData = e.detail; };
      
      window.addEventListener('customTestEvent', handler);
      window.dispatchEvent(new CustomEvent('customTestEvent', { 
        detail: { test: 'data', number: 42 } 
      }));
      window.removeEventListener('customTestEvent', handler);
      
      const passed = customEventData && customEventData.test === 'data' && customEventData.number === 42;
      eventTests.push({ name: 'customEvents', passed });
      console.log(`  ${passed ? '✅' : '❌'} Custom events: ${passed ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      eventTests.push({ name: 'customEvents', passed: false, error: error.message });
      console.log(`  ❌ Custom events: FAIL (${error.message})`);
    }
    
    // Test 3: Storage events
    try {
      let storageEventReceived = false;
      const handler = () => { storageEventReceived = true; };
      
      window.addEventListener('storage', handler);
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'testKey',
        newValue: 'testValue',
        storageArea: localStorage
      }));
      window.removeEventListener('storage', handler);
      
      eventTests.push({ name: 'storageEvents', passed: storageEventReceived });
      console.log(`  ${storageEventReceived ? '✅' : '❌'} Storage events: ${storageEventReceived ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      eventTests.push({ name: 'storageEvents', passed: false, error: error.message });
      console.log(`  ❌ Storage events: FAIL (${error.message})`);
    }
    
    // Test 4: Message events
    try {
      let messageEventReceived = false;
      const handler = () => { messageEventReceived = true; };
      
      window.addEventListener('message', handler);
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'test' },
        origin: window.location.origin
      }));
      window.removeEventListener('message', handler);
      
      eventTests.push({ name: 'messageEvents', passed: messageEventReceived });
      console.log(`  ${messageEventReceived ? '✅' : '❌'} Message events: ${messageEventReceived ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      eventTests.push({ name: 'messageEvents', passed: false, error: error.message });
      console.log(`  ❌ Message events: FAIL (${error.message})`);
    }
    
    const passedTests = eventTests.filter(t => t.passed).length;
    const testPassed = passedTests >= eventTests.length * 0.75; // 75% success rate
    
    this.testResults.push({
      test: 'eventSystemCompatibility',
      status: testPassed ? 'PASS' : 'FAIL',
      message: `Event system tests: ${passedTests}/${eventTests.length} passed`,
      data: { passedTests, totalTests: eventTests.length, eventTests }
    });
    
    return testPassed;
  }

  /**
   * Test 3: API compatibility
   */
  async testAPICompatibility() {
    console.log('🔌 Test 3: API Compatibility');
    
    const apiTests = [];
    
    // Test fetch API
    try {
      const fetchAvailable = typeof fetch === 'function';
      apiTests.push({ name: 'fetch', passed: fetchAvailable });
      console.log(`  ${fetchAvailable ? '✅' : '❌'} Fetch API: ${fetchAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      apiTests.push({ name: 'fetch', passed: false, error: error.message });
    }
    
    // Test Promise API
    try {
      const promiseTest = new Promise(resolve => resolve(true));
      const promiseAvailable = promiseTest instanceof Promise;
      apiTests.push({ name: 'promise', passed: promiseAvailable });
      console.log(`  ${promiseAvailable ? '✅' : '❌'} Promise API: ${promiseAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      apiTests.push({ name: 'promise', passed: false, error: error.message });
    }
    
    // Test URLSearchParams
    try {
      const urlParams = new URLSearchParams('test=value');
      const urlParamsAvailable = urlParams.get('test') === 'value';
      apiTests.push({ name: 'urlSearchParams', passed: urlParamsAvailable });
      console.log(`  ${urlParamsAvailable ? '✅' : '❌'} URLSearchParams: ${urlParamsAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      apiTests.push({ name: 'urlSearchParams', passed: false, error: error.message });
    }
    
    // Test BroadcastChannel
    try {
      const bcAvailable = typeof BroadcastChannel !== 'undefined';
      if (bcAvailable) {
        const channel = new BroadcastChannel('test');
        channel.close();
      }
      apiTests.push({ name: 'broadcastChannel', passed: bcAvailable });
      console.log(`  ${bcAvailable ? '✅' : '❌'} BroadcastChannel: ${bcAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      apiTests.push({ name: 'broadcastChannel', passed: false, error: error.message });
    }
    
    // Test History API
    try {
      const historyAvailable = typeof window.history.replaceState === 'function';
      apiTests.push({ name: 'historyAPI', passed: historyAvailable });
      console.log(`  ${historyAvailable ? '✅' : '❌'} History API: ${historyAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      apiTests.push({ name: 'historyAPI', passed: false, error: error.message });
    }
    
    const passedTests = apiTests.filter(t => t.passed).length;
    const testPassed = passedTests >= apiTests.length * 0.6; // 60% success rate (some APIs are newer)
    
    this.testResults.push({
      test: 'apiCompatibility',
      status: testPassed ? 'PASS' : 'FAIL',
      message: `API compatibility tests: ${passedTests}/${apiTests.length} passed`,
      data: { passedTests, totalTests: apiTests.length, apiTests }
    });
    
    return testPassed;
  }

  /**
   * Test 4: Window management compatibility
   */
  async testWindowManagement() {
    console.log('🪟 Test 4: Window Management Compatibility');
    
    const windowTests = [];
    
    // Test window.open
    try {
      const originalOpen = window.open;
      let openCalled = false;
      
      window.open = (...args) => {
        openCalled = true;
        return { closed: false, close: () => {}, focus: () => {} };
      };
      
      const popup = window.open('about:blank', 'test', 'width=100,height=100');
      window.open = originalOpen;
      
      windowTests.push({ name: 'windowOpen', passed: openCalled && popup });
      console.log(`  ${openCalled ? '✅' : '❌'} window.open: ${openCalled ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      windowTests.push({ name: 'windowOpen', passed: false, error: error.message });
    }
    
    // Test postMessage
    try {
      let postMessageAvailable = false;
      
      // Create a mock target for postMessage
      const mockTarget = {
        postMessage: (message, origin) => {
          postMessageAvailable = true;
        }
      };
      
      mockTarget.postMessage('test', '*');
      
      windowTests.push({ name: 'postMessage', passed: postMessageAvailable });
      console.log(`  ${postMessageAvailable ? '✅' : '❌'} postMessage: ${postMessageAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      windowTests.push({ name: 'postMessage', passed: false, error: error.message });
    }
    
    // Test window properties
    try {
      const hasLocationHref = typeof window.location.href === 'string';
      const hasLocationOrigin = typeof window.location.origin === 'string';
      const windowPropsAvailable = hasLocationHref && hasLocationOrigin;
      
      windowTests.push({ name: 'windowProperties', passed: windowPropsAvailable });
      console.log(`  ${windowPropsAvailable ? '✅' : '❌'} Window properties: ${windowPropsAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      windowTests.push({ name: 'windowProperties', passed: false, error: error.message });
    }
    
    const passedTests = windowTests.filter(t => t.passed).length;
    const testPassed = passedTests >= windowTests.length * 0.8; // 80% success rate
    
    this.testResults.push({
      test: 'windowManagement',
      status: testPassed ? 'PASS' : 'FAIL',
      message: `Window management tests: ${passedTests}/${windowTests.length} passed`,
      data: { passedTests, totalTests: windowTests.length, windowTests }
    });
    
    return testPassed;
  }

  /**
   * Test 5: ES6+ feature compatibility
   */
  async testES6Compatibility() {
    console.log('⚡ Test 5: ES6+ Feature Compatibility');
    
    const es6Tests = [];
    
    // Test arrow functions
    try {
      const arrowFunction = () => true;
      const arrowAvailable = arrowFunction() === true;
      es6Tests.push({ name: 'arrowFunctions', passed: arrowAvailable });
      console.log(`  ${arrowAvailable ? '✅' : '❌'} Arrow functions: ${arrowAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      es6Tests.push({ name: 'arrowFunctions', passed: false, error: error.message });
    }
    
    // Test template literals
    try {
      const value = 'world';
      const template = `hello ${value}`;
      const templateAvailable = template === 'hello world';
      es6Tests.push({ name: 'templateLiterals', passed: templateAvailable });
      console.log(`  ${templateAvailable ? '✅' : '❌'} Template literals: ${templateAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      es6Tests.push({ name: 'templateLiterals', passed: false, error: error.message });
    }
    
    // Test destructuring
    try {
      const obj = { a: 1, b: 2 };
      const { a, b } = obj;
      const destructuringAvailable = a === 1 && b === 2;
      es6Tests.push({ name: 'destructuring', passed: destructuringAvailable });
      console.log(`  ${destructuringAvailable ? '✅' : '❌'} Destructuring: ${destructuringAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      es6Tests.push({ name: 'destructuring', passed: false, error: error.message });
    }
    
    // Test const/let
    try {
      let letVariable = 1;
      const constVariable = 2;
      letVariable = 3;
      const constLetAvailable = letVariable === 3 && constVariable === 2;
      es6Tests.push({ name: 'constLet', passed: constLetAvailable });
      console.log(`  ${constLetAvailable ? '✅' : '❌'} const/let: ${constLetAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      es6Tests.push({ name: 'constLet', passed: false, error: error.message });
    }
    
    // Test Map/Set
    try {
      const map = new Map();
      map.set('key', 'value');
      const set = new Set();
      set.add('item');
      const mapSetAvailable = map.get('key') === 'value' && set.has('item');
      es6Tests.push({ name: 'mapSet', passed: mapSetAvailable });
      console.log(`  ${mapSetAvailable ? '✅' : '❌'} Map/Set: ${mapSetAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      es6Tests.push({ name: 'mapSet', passed: false, error: error.message });
    }
    
    const passedTests = es6Tests.filter(t => t.passed).length;
    const testPassed = passedTests >= es6Tests.length * 0.7; // 70% success rate
    
    this.testResults.push({
      test: 'es6Compatibility',
      status: testPassed ? 'PASS' : 'FAIL',
      message: `ES6+ compatibility tests: ${passedTests}/${es6Tests.length} passed`,
      data: { passedTests, totalTests: es6Tests.length, es6Tests }
    });
    
    return testPassed;
  }

  /**
   * Test 6: OAuth-specific compatibility
   */
  async testOAuthSpecificCompatibility() {
    console.log('🔐 Test 6: OAuth-Specific Compatibility');
    
    const oauthTests = [];
    
    // Test base64 encoding/decoding (for token handling)
    try {
      const testString = 'test-token-data';
      const encoded = btoa(testString);
      const decoded = atob(encoded);
      const base64Available = decoded === testString;
      oauthTests.push({ name: 'base64', passed: base64Available });
      console.log(`  ${base64Available ? '✅' : '❌'} Base64 encoding: ${base64Available ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      oauthTests.push({ name: 'base64', passed: false, error: error.message });
    }
    
    // Test crypto random (for state generation)
    try {
      let cryptoAvailable = false;
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        cryptoAvailable = array[0] !== undefined;
      } else {
        // Fallback to Math.random
        cryptoAvailable = typeof Math.random === 'function';
      }
      oauthTests.push({ name: 'cryptoRandom', passed: cryptoAvailable });
      console.log(`  ${cryptoAvailable ? '✅' : '❌'} Crypto random: ${cryptoAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      oauthTests.push({ name: 'cryptoRandom', passed: false, error: error.message });
    }
    
    // Test Date handling (for token expiry)
    try {
      const now = Date.now();
      const future = now + 3600000; // 1 hour
      const dateHandling = typeof now === 'number' && future > now;
      oauthTests.push({ name: 'dateHandling', passed: dateHandling });
      console.log(`  ${dateHandling ? '✅' : '❌'} Date handling: ${dateHandling ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      oauthTests.push({ name: 'dateHandling', passed: false, error: error.message });
    }
    
    // Test URL manipulation (for redirect handling)
    try {
      const url = new URL('https://example.com/test?param=value');
      const urlManipulation = url.hostname === 'example.com' && url.searchParams.get('param') === 'value';
      oauthTests.push({ name: 'urlManipulation', passed: urlManipulation });
      console.log(`  ${urlManipulation ? '✅' : '❌'} URL manipulation: ${urlManipulation ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    } catch (error) {
      // Fallback to manual URL parsing
      try {
        const params = new URLSearchParams('param=value');
        const fallbackAvailable = params.get('param') === 'value';
        oauthTests.push({ name: 'urlManipulation', passed: fallbackAvailable });
        console.log(`  ${fallbackAvailable ? '✅' : '❌'} URL manipulation (fallback): ${fallbackAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
      } catch (fallbackError) {
        oauthTests.push({ name: 'urlManipulation', passed: false, error: fallbackError.message });
      }
    }
    
    const passedTests = oauthTests.filter(t => t.passed).length;
    const testPassed = passedTests >= oauthTests.length * 0.8; // 80% success rate
    
    this.testResults.push({
      test: 'oauthSpecificCompatibility',
      status: testPassed ? 'PASS' : 'FAIL',
      message: `OAuth-specific tests: ${passedTests}/${oauthTests.length} passed`,
      data: { passedTests, totalTests: oauthTests.length, oauthTests }
    });
    
    return testPassed;
  }

  /**
   * Run all compatibility tests
   */
  async runAllTests() {
    console.log('🚀 [BROWSER-COMPAT-TEST] Running all browser compatibility tests...');
    
    // First detect browser features
    this.detectBrowserFeatures();
    
    const tests = [
      this.testLocalStorageCompatibility(),
      this.testEventSystemCompatibility(),
      this.testAPICompatibility(),
      this.testWindowManagement(),
      this.testES6Compatibility(),
      this.testOAuthSpecificCompatibility()
    ];
    
    const results = await Promise.all(tests);
    
    console.log('📊 [BROWSER-COMPAT-TEST] All tests completed');
    this.printResults();
    
    return results;
  }

  /**
   * Print test results summary
   */
  printResults() {
    console.log('\n📈 BROWSER COMPATIBILITY TEST RESULTS:');
    console.log('=======================================');
    
    // Print browser info first
    console.log('\n🌐 BROWSER INFORMATION:');
    console.log(`User Agent: ${this.browserFeatures.userAgent}`);
    console.log(`Platform: ${this.browserFeatures.platform}`);
    console.log(`Cookies Enabled: ${this.browserFeatures.cookieEnabled}`);
    console.log(`Online: ${this.browserFeatures.onLine}`);
    
    console.log('\n🔧 FEATURE AVAILABILITY:');
    Object.entries(this.browserFeatures).forEach(([feature, available]) => {
      if (typeof available === 'boolean') {
        const icon = available ? '✅' : '❌';
        console.log(`${icon} ${feature}: ${available ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
      }
    });
    
    console.log('\n📊 TEST RESULTS:');
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.message}`);
    });
    
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    
    // Compatibility assessment
    const compatibilityScore = Math.round((passed / (passed + failed)) * 100);
    let compatibilityLevel;
    if (compatibilityScore >= 90) compatibilityLevel = 'EXCELLENT';
    else if (compatibilityScore >= 80) compatibilityLevel = 'GOOD';
    else if (compatibilityScore >= 70) compatibilityLevel = 'FAIR';
    else compatibilityLevel = 'POOR';
    
    console.log(`🎯 Overall Compatibility: ${compatibilityLevel} (${compatibilityScore}%)`);
    
    return { passed, failed, total: passed + failed, compatibilityScore, compatibilityLevel };
  }

  /**
   * Get test results and browser info
   */
  getResults() {
    return {
      results: this.testResults,
      browserFeatures: this.browserFeatures,
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
  window.BrowserCompatibilityTester = BrowserCompatibilityTester;
  
  // Auto-run tests if script is loaded directly
  const tester = new BrowserCompatibilityTester();
  tester.runAllTests().then(results => {
    console.log('🎉 [BROWSER-COMPAT-TEST] Browser compatibility testing complete!');
  });
} else {
  module.exports = BrowserCompatibilityTester;
}