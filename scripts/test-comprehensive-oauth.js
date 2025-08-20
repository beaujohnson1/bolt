// Comprehensive OAuth Testing Suite
// Master test runner that executes all OAuth test suites and provides unified reporting

console.log('🧪 [COMPREHENSIVE-OAUTH-TEST] Comprehensive OAuth Testing Suite Started');

class ComprehensiveOAuthTester {
  constructor() {
    this.testSuites = [];
    this.overallResults = {
      suites: [],
      summary: {
        totalTests: 0,
        totalPassed: 0,
        totalFailed: 0,
        overallSuccessRate: 0
      },
      startTime: null,
      endTime: null,
      duration: 0
    };
  }

  /**
   * Initialize all test suites
   */
  initializeTestSuites() {
    console.log('🔧 Initializing test suites...');
    
    // Check if test classes are available
    const availableSuites = [
      { name: 'Communication', class: window.OAuthCommunicationTester, description: 'Tests postMessage communication between windows' },
      { name: 'TokenStorage', class: window.TokenStorageTester, description: 'Tests localStorage persistence and validation' },
      { name: 'PopupFlow', class: window.PopupFlowTester, description: 'Tests end-to-end popup OAuth flow' },
      { name: 'BrowserCompatibility', class: window.BrowserCompatibilityTester, description: 'Tests browser API compatibility' },
      { name: 'MinimalPopup', class: window.MinimalPopupTester, description: 'Tests basic popup communication' }
    ];
    
    availableSuites.forEach(suite => {
      if (suite.class) {
        this.testSuites.push({
          name: suite.name,
          description: suite.description,
          tester: new suite.class(),
          available: true
        });
        console.log(`✅ ${suite.name} test suite loaded`);
      } else {
        console.log(`⚠️ ${suite.name} test suite not available`);
        this.testSuites.push({
          name: suite.name,
          description: suite.description,
          tester: null,
          available: false
        });
      }
    });
    
    console.log(`📊 ${this.testSuites.filter(s => s.available).length}/${this.testSuites.length} test suites available`);
  }

  /**
   * Run OAuth environment validation before tests
   */
  async runEnvironmentValidation() {
    console.log('🔍 Running OAuth environment validation...');
    
    const validationResults = {
      requiredAPIs: [],
      localStorageQuota: null,
      networkConnectivity: false,
      domContentLoaded: false
    };
    
    // Check required APIs
    const requiredAPIs = [
      { name: 'localStorage', available: typeof localStorage !== 'undefined' },
      { name: 'postMessage', available: typeof window.postMessage === 'function' },
      { name: 'addEventListener', available: typeof window.addEventListener === 'function' },
      { name: 'JSON', available: typeof JSON !== 'undefined' },
      { name: 'fetch', available: typeof fetch !== 'undefined' },
      { name: 'Promise', available: typeof Promise !== 'undefined' }
    ];
    
    requiredAPIs.forEach(api => {
      validationResults.requiredAPIs.push(api);
      console.log(`  ${api.available ? '✅' : '❌'} ${api.name}: ${api.available ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    });
    
    // Test localStorage quota
    try {
      const testKey = 'oauth_quota_test';
      const testData = 'x'.repeat(10000); // 10KB test
      localStorage.setItem(testKey, testData);
      localStorage.removeItem(testKey);
      validationResults.localStorageQuota = 'OK';
      console.log('  ✅ localStorage quota: OK');
    } catch (error) {
      validationResults.localStorageQuota = 'LIMITED';
      console.log('  ⚠️ localStorage quota: LIMITED');
    }
    
    // Check DOM ready state
    validationResults.domContentLoaded = document.readyState === 'complete';
    console.log(`  ${validationResults.domContentLoaded ? '✅' : '⚠️'} DOM state: ${document.readyState}`);
    
    // Check network connectivity (simple test)
    try {
      validationResults.networkConnectivity = navigator.onLine;
      console.log(`  ${validationResults.networkConnectivity ? '✅' : '⚠️'} Network: ${validationResults.networkConnectivity ? 'ONLINE' : 'OFFLINE'}`);
    } catch (error) {
      validationResults.networkConnectivity = false;
      console.log('  ⚠️ Network: UNKNOWN');
    }
    
    return validationResults;
  }

  /**
   * Run all test suites sequentially
   */
  async runAllTestSuites() {
    console.log('🚀 Running all OAuth test suites...');
    
    this.overallResults.startTime = Date.now();
    
    // Run environment validation first
    const envValidation = await this.runEnvironmentValidation();
    
    // Run each available test suite
    for (const suite of this.testSuites) {
      if (!suite.available) {
        console.log(`⏭️ Skipping ${suite.name} (not available)`);
        continue;
      }
      
      console.log(`\n🔄 Running ${suite.name} test suite...`);
      console.log(`📝 ${suite.description}`);
      
      try {
        const startTime = Date.now();
        const results = await suite.tester.runAllTests();
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const suiteResults = suite.tester.getResults();
        
        this.overallResults.suites.push({
          name: suite.name,
          description: suite.description,
          duration,
          results: suiteResults,
          status: 'COMPLETED'
        });
        
        this.overallResults.summary.totalTests += suiteResults.summary.total;
        this.overallResults.summary.totalPassed += suiteResults.summary.passed;
        this.overallResults.summary.totalFailed += suiteResults.summary.failed;
        
        console.log(`✅ ${suite.name} completed in ${duration}ms`);
        console.log(`   ${suiteResults.summary.passed}/${suiteResults.summary.total} tests passed`);
        
      } catch (error) {
        console.error(`❌ ${suite.name} failed:`, error);
        
        this.overallResults.suites.push({
          name: suite.name,
          description: suite.description,
          duration: 0,
          results: null,
          status: 'FAILED',
          error: error.message
        });
      }
    }
    
    this.overallResults.endTime = Date.now();
    this.overallResults.duration = this.overallResults.endTime - this.overallResults.startTime;
    
    // Calculate overall success rate
    if (this.overallResults.summary.totalTests > 0) {
      this.overallResults.summary.overallSuccessRate = Math.round(
        (this.overallResults.summary.totalPassed / this.overallResults.summary.totalTests) * 100
      );
    }
    
    return this.overallResults;
  }

  /**
   * Generate comprehensive test report
   */
  generateTestReport() {
    console.log('\n📊 COMPREHENSIVE OAUTH TEST REPORT');
    console.log('==================================');
    
    const { summary } = this.overallResults;
    
    // Overall summary
    console.log('\n🎯 OVERALL SUMMARY:');
    console.log(`⏱️ Total Duration: ${this.overallResults.duration}ms`);
    console.log(`📊 Total Tests: ${summary.totalTests}`);
    console.log(`✅ Total Passed: ${summary.totalPassed}`);
    console.log(`❌ Total Failed: ${summary.totalFailed}`);
    console.log(`📈 Overall Success Rate: ${summary.overallSuccessRate}%`);
    
    // Success rate assessment
    let assessment;
    if (summary.overallSuccessRate >= 95) assessment = 'EXCELLENT';
    else if (summary.overallSuccessRate >= 85) assessment = 'GOOD';
    else if (summary.overallSuccessRate >= 70) assessment = 'FAIR';
    else if (summary.overallSuccessRate >= 50) assessment = 'POOR';
    else assessment = 'CRITICAL';
    
    console.log(`🎯 OAuth Readiness: ${assessment}`);
    
    // Suite-by-suite breakdown
    console.log('\n📋 SUITE BREAKDOWN:');
    this.overallResults.suites.forEach(suite => {
      const icon = suite.status === 'COMPLETED' ? '✅' : '❌';
      console.log(`${icon} ${suite.name} (${suite.duration}ms)`);
      
      if (suite.results) {
        const suiteRate = Math.round((suite.results.summary.passed / suite.results.summary.total) * 100);
        console.log(`   📊 ${suite.results.summary.passed}/${suite.results.summary.total} tests passed (${suiteRate}%)`);
        
        // Show failed tests if any
        const failedTests = suite.results.results.filter(r => r.status === 'FAIL');
        if (failedTests.length > 0) {
          console.log(`   ❌ Failed tests: ${failedTests.map(t => t.test).join(', ')}`);
        }
      } else if (suite.error) {
        console.log(`   💥 Error: ${suite.error}`);
      }
    });
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (summary.overallSuccessRate >= 95) {
      console.log('🎉 OAuth implementation is excellent! All systems are working properly.');
    } else if (summary.overallSuccessRate >= 85) {
      console.log('✅ OAuth implementation is good with minor issues that should be addressed.');
    } else if (summary.overallSuccessRate >= 70) {
      console.log('⚠️ OAuth implementation needs improvement. Several issues detected.');
    } else {
      console.log('🚨 OAuth implementation has critical issues that must be fixed.');
    }
    
    // Specific recommendations based on failed tests
    const allFailedTests = this.overallResults.suites.flatMap(suite => 
      suite.results ? suite.results.results.filter(r => r.status === 'FAIL') : []
    );
    
    if (allFailedTests.length > 0) {
      console.log('\n🔧 SPECIFIC ISSUES TO ADDRESS:');
      allFailedTests.forEach(test => {
        console.log(`  • ${test.test}: ${test.message}`);
      });
    }
    
    return this.overallResults;
  }

  /**
   * Export test results for external analysis
   */
  exportResults(format = 'json') {
    const exportData = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      testResults: this.overallResults,
      environment: {
        url: window.location.href,
        protocol: window.location.protocol,
        host: window.location.host
      }
    };
    
    if (format === 'json') {
      return JSON.stringify(exportData, null, 2);
    } else if (format === 'csv') {
      // Simple CSV export for spreadsheet analysis
      let csv = 'Suite,Test,Status,Message,Duration\n';
      
      this.overallResults.suites.forEach(suite => {
        if (suite.results) {
          suite.results.results.forEach(test => {
            csv += `"${suite.name}","${test.test}","${test.status}","${test.message}","${suite.duration}"\n`;
          });
        }
      });
      
      return csv;
    }
    
    return exportData;
  }

  /**
   * Run complete OAuth validation
   */
  async runCompleteValidation() {
    console.log('🚀 [COMPREHENSIVE-OAUTH-TEST] Starting complete OAuth validation...');
    
    // Initialize test suites
    this.initializeTestSuites();
    
    // Run all tests
    const results = await this.runAllTestSuites();
    
    // Generate report
    const report = this.generateTestReport();
    
    // Export results
    const jsonResults = this.exportResults('json');
    
    console.log('\n📁 Test results available for export:');
    console.log('Call tester.exportResults("json") or tester.exportResults("csv") to get formatted results');
    
    console.log('\n🎉 [COMPREHENSIVE-OAUTH-TEST] Complete OAuth validation finished!');
    
    return {
      results,
      report,
      export: jsonResults
    };
  }
}

// Auto-load required test scripts if not already loaded
async function loadTestScripts() {
  const scripts = [
    'test-oauth-communication.js',
    'test-token-storage.js',
    'test-popup-flow.js',
    'test-browser-compatibility.js',
    'test-minimal-popup.js'
  ];
  
  for (const scriptName of scripts) {
    if (!window[scriptName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('').replace('.js', 'Tester')]) {
      try {
        const script = document.createElement('script');
        script.src = `/scripts/${scriptName}`;
        script.async = false;
        document.head.appendChild(script);
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
        
        console.log(`✅ Loaded ${scriptName}`);
      } catch (error) {
        console.log(`⚠️ Could not load ${scriptName}:`, error.message);
      }
    }
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.ComprehensiveOAuthTester = ComprehensiveOAuthTester;
  
  // Auto-run comprehensive validation if script is loaded directly
  setTimeout(async () => {
    console.log('🔄 Auto-starting comprehensive OAuth validation in 2 seconds...');
    
    // Wait for other scripts to load
    await loadTestScripts();
    
    const tester = new ComprehensiveOAuthTester();
    window.oauthTester = tester; // Make available globally
    
    await tester.runCompleteValidation();
  }, 2000);
} else {
  module.exports = ComprehensiveOAuthTester;
}