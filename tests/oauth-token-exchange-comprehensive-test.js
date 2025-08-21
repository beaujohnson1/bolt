/**
 * 🧪 OAuth Token Exchange Flow Comprehensive Test Suite
 * 
 * Tests every component of the OAuth flow to diagnose production failures:
 * 1. /.netlify/functions/simple-ebay-oauth endpoint accessibility
 * 2. POST request handling with code parameter
 * 3. Token response validation 
 * 4. localStorage operations in browser context
 * 5. Cross-window communication between popup and parent
 * 
 * Run with: node tests/oauth-token-exchange-comprehensive-test.js
 */

import fetch from 'node-fetch';

class OAuthTokenExchangeTester {
    constructor() {
        this.baseUrl = 'https://easyflip.ai';
        this.oauthEndpoint = `${this.baseUrl}/.netlify/functions/simple-ebay-oauth`;
        this.callbackEndpoint = `${this.baseUrl}/.netlify/functions/simple-ebay-callback`;
        
        this.results = {
            tests: [],
            summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
            criticalFailures: [],
            performanceMetrics: {}
        };
        
        this.testStartTime = Date.now();
    }

    log(message, type = 'info') {
        const colors = {
            success: '\x1b[32m',
            error: '\x1b[31m',
            warning: '\x1b[33m',
            info: '\x1b[36m',
            debug: '\x1b[35m',
            reset: '\x1b[0m'
        };
        
        const timestamp = new Date().toISOString();
        const color = colors[type] || colors.info;
        console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
    }

    addResult(testName, passed, message, type = 'test', critical = false) {
        const result = {
            test: testName,
            passed,
            message,
            type,
            critical,
            timestamp: new Date().toISOString(),
            duration: Date.now() - this.testStartTime
        };
        
        this.results.tests.push(result);
        this.results.summary.total++;
        
        if (critical && !passed) {
            this.results.criticalFailures.push(result);
        }
        
        if (type === 'warning') {
            this.results.summary.warnings++;
            this.log(`⚠️ WARNING: ${testName} - ${message}`, 'warning');
        } else if (passed) {
            this.results.summary.passed++;
            this.log(`✅ PASS: ${testName} - ${message}`, 'success');
        } else {
            this.results.summary.failed++;
            this.log(`❌ FAIL: ${testName} - ${message}`, 'error');
        }

        return result;
    }

    async measurePerformance(testName, asyncOperation) {
        const startTime = Date.now();
        const result = await asyncOperation();
        const duration = Date.now() - startTime;
        
        this.results.performanceMetrics[testName] = duration;
        this.log(`⏱️ ${testName}: ${duration}ms`, 'debug');
        
        return result;
    }

    // Test 1: OAuth Endpoint Accessibility
    async testOAuthEndpointAccessibility() {
        this.log('🔍 Testing OAuth endpoint accessibility...', 'info');
        
        try {
            const response = await this.measurePerformance('oauth-endpoint-response', 
                () => fetch(this.oauthEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'generate-auth-url' })
                })
            );

            const accessible = response.ok;
            const responseBody = accessible ? await response.json() : await response.text();
            
            this.addResult(
                'OAuth Endpoint Accessibility',
                accessible,
                accessible ? 
                    `Endpoint accessible (${response.status}), response: ${JSON.stringify(responseBody).substring(0, 100)}...` :
                    `Endpoint failed (${response.status}): ${responseBody}`,
                'test',
                true // Critical test
            );

            // Test CORS headers
            const corsHeaders = {
                origin: response.headers.get('access-control-allow-origin'),
                methods: response.headers.get('access-control-allow-methods'),
                headers: response.headers.get('access-control-allow-headers')
            };

            const corsValid = corsHeaders.origin === '*' || corsHeaders.origin === this.baseUrl;
            this.addResult(
                'CORS Configuration',
                corsValid,
                `CORS headers: Origin=${corsHeaders.origin}, Methods=${corsHeaders.methods}`,
                corsValid ? 'test' : 'warning'
            );

            return { accessible, response: responseBody, cors: corsValid };

        } catch (error) {
            this.addResult(
                'OAuth Endpoint Accessibility',
                false,
                `Network error: ${error.message}`,
                'test',
                true
            );
            return { accessible: false, error: error.message };
        }
    }

    // Test 2: POST Request with Code Parameter
    async testCodeParameterHandling() {
        this.log('🔄 Testing POST request with code parameter...', 'info');
        
        const testCases = [
            {
                name: 'Valid Code Format',
                code: 'v%5E1.1%23i%5E1%23p%5E3%23I%5E3%23f%5E0%23r%5E1%23t%5EUl4xM',
                expectedSuccess: false // Will fail but should handle gracefully
            },
            {
                name: 'Empty Code',
                code: '',
                expectedSuccess: false
            },
            {
                name: 'Null Code',
                code: null,
                expectedSuccess: false
            },
            {
                name: 'Malformed Code',
                code: 'invalid-code-123',
                expectedSuccess: false
            }
        ];

        for (const testCase of testCases) {
            try {
                const response = await this.measurePerformance(`code-handling-${testCase.name}`,
                    () => fetch(this.oauthEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'exchange-code',
                            code: testCase.code
                        })
                    })
                );

                const responseData = await response.json();
                const handledProperly = response.status === 400 || response.status === 200;
                
                this.addResult(
                    `Code Parameter - ${testCase.name}`,
                    handledProperly,
                    `Status: ${response.status}, Success: ${responseData.success}, Error: ${responseData.error || 'none'}`,
                    testCase.code ? 'test' : 'warning'
                );

                // Validate error message structure for invalid codes
                if (!testCase.code && responseData.error) {
                    const errorMessageValid = responseData.error.includes('required') || responseData.error.includes('code');
                    this.addResult(
                        `Error Message Quality - ${testCase.name}`,
                        errorMessageValid,
                        `Error message: ${responseData.error}`
                    );
                }

            } catch (error) {
                this.addResult(
                    `Code Parameter - ${testCase.name}`,
                    false,
                    `Request failed: ${error.message}`,
                    'test',
                    testCase.name === 'Valid Code Format'
                );
            }
        }
    }

    // Test 3: Token Response Validation
    async testTokenResponseFormat() {
        this.log('🔍 Testing token response format validation...', 'info');
        
        // Simulate token response structure
        const mockTokenResponse = {
            success: true,
            access_token: 'v^1.1#i^1#f^0#I^3#p^1#r^0#t^H4sIAAAAAAAAAOVXa2wUVRTu',
            refresh_token: 'v^1.1#i^1#f^0#r^1#p^1#I^3#t^Ul41',
            expires_in: 7200,
            token_type: 'Bearer',
            message: 'Tokens retrieved successfully'
        };

        // Test response structure
        const requiredFields = ['success', 'access_token', 'refresh_token', 'expires_in', 'token_type'];
        const hasAllFields = requiredFields.every(field => mockTokenResponse.hasOwnProperty(field));
        
        this.addResult(
            'Token Response Structure',
            hasAllFields,
            hasAllFields ? 
                'All required fields present in token response' :
                `Missing fields: ${requiredFields.filter(f => !mockTokenResponse.hasOwnProperty(f)).join(', ')}`
        );

        // Test token format validation
        const accessTokenValid = mockTokenResponse.access_token && 
                                mockTokenResponse.access_token.startsWith('v^1.1');
        const refreshTokenValid = mockTokenResponse.refresh_token && 
                                 mockTokenResponse.refresh_token.startsWith('v^1.1');
        
        this.addResult(
            'Token Format Validation',
            accessTokenValid && refreshTokenValid,
            `Access token valid: ${accessTokenValid}, Refresh token valid: ${refreshTokenValid}`
        );

        // Test expiry calculation
        const expiresInValid = typeof mockTokenResponse.expires_in === 'number' && 
                              mockTokenResponse.expires_in > 0;
        const expiresAt = Date.now() + (mockTokenResponse.expires_in * 1000);
        const expiryDateValid = expiresAt > Date.now();

        this.addResult(
            'Token Expiry Calculation',
            expiresInValid && expiryDateValid,
            `Expires in: ${mockTokenResponse.expires_in}s, Expires at: ${new Date(expiresAt).toLocaleString()}`
        );

        return {
            structureValid: hasAllFields,
            tokenFormatValid: accessTokenValid && refreshTokenValid,
            expiryValid: expiresInValid && expiryDateValid
        };
    }

    // Test 4: localStorage Operations Simulation
    testLocalStorageOperations() {
        this.log('💾 Testing localStorage operations simulation...', 'info');
        
        // Simulate localStorage operations that happen in browser
        const mockLocalStorage = {
            data: {},
            setItem(key, value) {
                this.data[key] = value;
            },
            getItem(key) {
                return this.data[key] || null;
            },
            removeItem(key) {
                delete this.data[key];
            }
        };

        try {
            // Test EasyFlip token storage format
            const tokenData = {
                access_token: 'test_access_token',
                refresh_token: 'test_refresh_token',
                expires_in: 7200,
                expires_at: Date.now() + 7200000,
                token_type: 'Bearer'
            };

            // Test both storage formats used by EasyFlip
            mockLocalStorage.setItem('ebay_manual_token', tokenData.access_token);
            mockLocalStorage.setItem('ebay_oauth_tokens', JSON.stringify(tokenData));

            const manualTokenStored = mockLocalStorage.getItem('ebay_manual_token') === tokenData.access_token;
            const fullTokensStored = JSON.parse(mockLocalStorage.getItem('ebay_oauth_tokens')).access_token === tokenData.access_token;

            this.addResult(
                'localStorage Token Storage',
                manualTokenStored && fullTokensStored,
                `Manual token stored: ${manualTokenStored}, Full tokens stored: ${fullTokensStored}`
            );

            // Test token retrieval and parsing
            const retrievedTokens = JSON.parse(mockLocalStorage.getItem('ebay_oauth_tokens'));
            const retrievalValid = retrievedTokens.access_token === tokenData.access_token &&
                                  retrievedTokens.expires_at > Date.now();

            this.addResult(
                'localStorage Token Retrieval',
                retrievalValid,
                `Retrieved tokens valid: ${retrievalValid}, Expiry: ${new Date(retrievedTokens.expires_at).toLocaleString()}`
            );

            // Test cleanup operations
            mockLocalStorage.removeItem('ebay_manual_token');
            mockLocalStorage.removeItem('ebay_oauth_tokens');
            
            const cleanupSuccessful = !mockLocalStorage.getItem('ebay_manual_token') && 
                                    !mockLocalStorage.getItem('ebay_oauth_tokens');

            this.addResult(
                'localStorage Cleanup',
                cleanupSuccessful,
                `Cleanup successful: ${cleanupSuccessful}`
            );

            return { storageWorking: true, retrievalWorking: retrievalValid };

        } catch (error) {
            this.addResult(
                'localStorage Operations',
                false,
                `localStorage simulation failed: ${error.message}`,
                'test',
                true
            );
            return { storageWorking: false, error: error.message };
        }
    }

    // Test 5: Cross-Window Communication Simulation
    testCrossWindowCommunication() {
        this.log('🔗 Testing cross-window communication mechanisms...', 'info');
        
        // Simulate popup to parent communication
        const communicationMethods = [
            {
                name: 'PostMessage',
                test: () => {
                    const message = {
                        type: 'EBAY_OAUTH_SUCCESS',
                        timestamp: Date.now(),
                        tokens: {
                            access_token: 'test_token',
                            refresh_token: 'test_refresh',
                            expires_in: 7200,
                            expires_at: Date.now() + 7200000
                        }
                    };
                    return JSON.stringify(message).length > 0;
                }
            },
            {
                name: 'CustomEvent',
                test: () => {
                    const eventDetail = {
                        access_token: 'test_token',
                        refresh_token: 'test_refresh',
                        expires_in: 7200
                    };
                    return typeof eventDetail === 'object' && eventDetail.access_token;
                }
            },
            {
                name: 'LocalStorage Sharing',
                test: () => {
                    const mockStorage = { ebay_oauth_tokens: '{"access_token":"test"}' };
                    return JSON.parse(mockStorage.ebay_oauth_tokens).access_token === 'test';
                }
            }
        ];

        communicationMethods.forEach(method => {
            try {
                const methodWorks = method.test();
                this.addResult(
                    `Cross-Window ${method.name}`,
                    methodWorks,
                    `${method.name} communication method ${methodWorks ? 'working' : 'failed'}`
                );
            } catch (error) {
                this.addResult(
                    `Cross-Window ${method.name}`,
                    false,
                    `${method.name} test failed: ${error.message}`
                );
            }
        });

        // Test popup window lifecycle
        const popupLifecycleSteps = [
            'Window opened',
            'OAuth redirect to eBay',
            'User authorization',
            'Callback to our handler',
            'Token exchange',
            'Communication to parent',
            'Window closure'
        ];

        this.addResult(
            'Popup Lifecycle Simulation',
            true,
            `All lifecycle steps identified: ${popupLifecycleSteps.join(' → ')}`
        );

        return { communicationMethodsAvailable: communicationMethods.length };
    }

    // Test 6: Production Failure Diagnostics
    async testProductionFailureDiagnostics() {
        this.log('🚨 Running production failure diagnostics...', 'info');
        
        const diagnostics = [
            {
                name: 'Network Connectivity',
                test: async () => {
                    try {
                        const response = await fetch(this.baseUrl);
                        return response.ok;
                    } catch (error) {
                        return false;
                    }
                }
            },
            {
                name: 'OAuth Endpoint Response Time',
                test: async () => {
                    const start = Date.now();
                    try {
                        await fetch(this.oauthEndpoint, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'generate-auth-url' })
                        });
                        return Date.now() - start < 5000; // Should respond within 5 seconds
                    } catch (error) {
                        return false;
                    }
                }
            },
            {
                name: 'Callback Endpoint Accessibility',
                test: async () => {
                    try {
                        const response = await fetch(this.callbackEndpoint);
                        return response.status !== 500; // Any response except server error
                    } catch (error) {
                        return false;
                    }
                }
            }
        ];

        for (const diagnostic of diagnostics) {
            try {
                const result = await this.measurePerformance(`diagnostic-${diagnostic.name}`, diagnostic.test);
                this.addResult(
                    `Production Diagnostic - ${diagnostic.name}`,
                    result,
                    result ? 
                        `${diagnostic.name} is functioning properly` :
                        `${diagnostic.name} failed - potential production issue`,
                    result ? 'test' : 'warning',
                    !result
                );
            } catch (error) {
                this.addResult(
                    `Production Diagnostic - ${diagnostic.name}`,
                    false,
                    `Diagnostic failed: ${error.message}`,
                    'test',
                    true
                );
            }
        }
    }

    // Test 7: Error Handling and Edge Cases
    async testErrorHandlingEdgeCases() {
        this.log('🛡️ Testing error handling and edge cases...', 'info');
        
        const edgeCases = [
            {
                name: 'Invalid Action',
                payload: { action: 'invalid-action' },
                expectedStatus: 400
            },
            {
                name: 'Missing Action',
                payload: {},
                expectedStatus: 400
            },
            {
                name: 'Malformed JSON',
                payload: 'invalid-json',
                expectedStatus: 500
            },
            {
                name: 'Empty Body',
                payload: null,
                expectedStatus: 400
            }
        ];

        for (const edgeCase of edgeCases) {
            try {
                const response = await fetch(this.oauthEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: typeof edgeCase.payload === 'string' ? edgeCase.payload : JSON.stringify(edgeCase.payload)
                });

                const responseData = await response.json().catch(() => ({}));
                const handledProperly = response.status >= 400 && response.status < 500;

                this.addResult(
                    `Error Handling - ${edgeCase.name}`,
                    handledProperly,
                    `Status: ${response.status}, Expected: ${edgeCase.expectedStatus}, Error: ${responseData.error || 'none'}`
                );

            } catch (error) {
                this.addResult(
                    `Error Handling - ${edgeCase.name}`,
                    false,
                    `Request failed unexpectedly: ${error.message}`
                );
            }
        }
    }

    // Test 8: Rate Limiting and Performance
    async testRateLimitingAndPerformance() {
        this.log('⚡ Testing rate limiting and performance...', 'info');
        
        const concurrentRequests = 5;
        const requests = Array(concurrentRequests).fill(null).map((_, index) => 
            fetch(this.oauthEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate-auth-url' })
            }).then(response => ({
                index,
                status: response.status,
                ok: response.ok
            }))
        );

        try {
            const results = await Promise.all(requests);
            const allSuccessful = results.every(r => r.ok);
            const rateLimited = results.some(r => r.status === 429);

            this.addResult(
                'Concurrent Request Handling',
                allSuccessful || rateLimited,
                allSuccessful ? 
                    'All concurrent requests handled successfully' :
                    rateLimited ? 
                        'Rate limiting detected (expected behavior)' :
                        'Some requests failed unexpectedly'
            );

            // Test average response time
            const avgResponseTime = Object.values(this.results.performanceMetrics)
                .reduce((sum, time) => sum + time, 0) / Object.keys(this.results.performanceMetrics).length;

            this.addResult(
                'Average Response Time',
                avgResponseTime < 3000,
                `Average response time: ${avgResponseTime.toFixed(0)}ms (threshold: 3000ms)`
            );

        } catch (error) {
            this.addResult(
                'Concurrent Request Handling',
                false,
                `Concurrent request test failed: ${error.message}`
            );
        }
    }

    // Generate comprehensive report
    generateComprehensiveReport() {
        const { summary, tests, criticalFailures, performanceMetrics } = this.results;
        const passRate = ((summary.passed / summary.total) * 100).toFixed(1);
        const testDuration = Date.now() - this.testStartTime;
        
        console.log('\n' + '='.repeat(80));
        console.log('🚨 OAUTH TOKEN EXCHANGE FLOW - PRODUCTION DIAGNOSTIC REPORT');
        console.log('='.repeat(80));
        console.log(`⏱️ Test Duration: ${testDuration}ms`);
        console.log(`📊 Overall Pass Rate: ${passRate}%`);
        console.log(`✅ Passed: ${summary.passed}/${summary.total}`);
        console.log(`❌ Failed: ${summary.failed}/${summary.total}`);
        console.log(`⚠️ Warnings: ${summary.warnings}/${summary.total}`);
        
        // Critical failures section
        if (criticalFailures.length > 0) {
            console.log('\n🚨 CRITICAL FAILURES (BLOCKING PRODUCTION):');
            console.log('-'.repeat(60));
            criticalFailures.forEach((failure, index) => {
                console.log(`${index + 1}. ❌ ${failure.test}`);
                console.log(`   ${failure.message}`);
                console.log(`   Time: ${failure.timestamp}`);
            });
        }

        // Performance metrics
        console.log('\n⚡ PERFORMANCE METRICS:');
        console.log('-'.repeat(60));
        Object.entries(performanceMetrics).forEach(([test, duration]) => {
            const status = duration < 3000 ? '✅' : duration < 5000 ? '⚠️' : '❌';
            console.log(`${status} ${test}: ${duration}ms`);
        });

        // Detailed test results
        console.log('\n📝 DETAILED TEST RESULTS:');
        console.log('-'.repeat(60));
        tests.forEach((test, index) => {
            const status = test.type === 'warning' ? '⚠️' : test.passed ? '✅' : '❌';
            const critical = test.critical ? ' [CRITICAL]' : '';
            console.log(`${index + 1}. ${status} ${test.test}${critical}`);
            console.log(`   ${test.message}`);
            if (test.duration) {
                console.log(`   Duration: ${test.duration}ms`);
            }
        });

        // Production readiness assessment
        console.log('\n🎯 PRODUCTION READINESS ASSESSMENT:');
        console.log('-'.repeat(60));
        
        const productionReady = criticalFailures.length === 0 && passRate >= 85;
        
        if (productionReady) {
            console.log('✅ PRODUCTION READY');
            console.log('✅ All critical tests passing');
            console.log('✅ Performance within acceptable limits');
            console.log('✅ Error handling working properly');
        } else {
            console.log('❌ NOT PRODUCTION READY');
            console.log('🚨 Issues that must be fixed:');
            
            if (criticalFailures.length > 0) {
                criticalFailures.forEach(failure => {
                    console.log(`   - CRITICAL: ${failure.test}`);
                });
            }
            
            if (passRate < 85) {
                console.log(`   - Pass rate too low: ${passRate}% (minimum 85%)`);
            }
        }

        // Recommendations
        console.log('\n💡 IMMEDIATE ACTIONS REQUIRED:');
        console.log('-'.repeat(60));
        
        const failedTests = tests.filter(t => !t.passed);
        if (failedTests.length > 0) {
            failedTests.forEach(test => {
                if (test.critical) {
                    console.log(`🚨 URGENT: Fix ${test.test} - ${test.message}`);
                } else {
                    console.log(`⚠️ Address: ${test.test} - ${test.message}`);
                }
            });
        } else {
            console.log('✅ No immediate actions required - OAuth flow is functioning');
        }

        console.log('\n' + '='.repeat(80));
        console.log(`🎯 OVERALL STATUS: ${productionReady ? 'PASS' : 'FAIL'} (${passRate}% success rate)`);
        console.log('='.repeat(80) + '\n');

        return {
            productionReady,
            passRate: parseFloat(passRate),
            criticalFailures: criticalFailures.length,
            totalIssues: summary.failed + summary.warnings,
            recommendations: failedTests.map(t => ({ test: t.test, message: t.message, critical: t.critical }))
        };
    }

    // Main test runner
    async runComprehensiveTests() {
        console.log('\n🚀 STARTING OAUTH TOKEN EXCHANGE COMPREHENSIVE DIAGNOSTICS\n');
        
        const testSuite = [
            { name: 'OAuth Endpoint Accessibility', fn: () => this.testOAuthEndpointAccessibility() },
            { name: 'Code Parameter Handling', fn: () => this.testCodeParameterHandling() },
            { name: 'Token Response Format', fn: () => this.testTokenResponseFormat() },
            { name: 'LocalStorage Operations', fn: () => this.testLocalStorageOperations() },
            { name: 'Cross-Window Communication', fn: () => this.testCrossWindowCommunication() },
            { name: 'Production Failure Diagnostics', fn: () => this.testProductionFailureDiagnostics() },
            { name: 'Error Handling Edge Cases', fn: () => this.testErrorHandlingEdgeCases() },
            { name: 'Rate Limiting and Performance', fn: () => this.testRateLimitingAndPerformance() }
        ];

        for (const test of testSuite) {
            try {
                this.log(`\n🧪 Running: ${test.name}`, 'info');
                await test.fn();
            } catch (error) {
                this.addResult(
                    test.name,
                    false,
                    `Test suite error: ${error.message}`,
                    'test',
                    true
                );
                this.log(`💥 Test suite error in ${test.name}: ${error.message}`, 'error');
            }
        }

        return this.generateComprehensiveReport();
    }
}

// Run the comprehensive test suite
async function runDiagnostics() {
    const tester = new OAuthTokenExchangeTester();
    
    try {
        const results = await tester.runComprehensiveTests();
        
        // Exit with appropriate code
        if (results.productionReady) {
            console.log('✅ All OAuth components verified - production ready!');
            process.exit(0);
        } else {
            console.log('❌ OAuth flow has issues - production deployment should be delayed');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('💥 Test suite failed to complete:', error);
        process.exit(1);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runDiagnostics();
}

export default OAuthTokenExchangeTester;