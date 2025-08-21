/**
 * 🚨 OAuth Production Failure Diagnostic Tool
 * 
 * Specifically designed to diagnose the current production OAuth failure.
 * Tests all critical components and provides actionable insights.
 * 
 * Run with: node tests/oauth-production-failure-diagnostic.js
 */

import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

class OAuthProductionDiagnostic {
    constructor() {
        this.baseUrl = 'https://easyflip.ai';
        this.oauthEndpoint = `${this.baseUrl}/.netlify/functions/simple-ebay-oauth`;
        this.callbackEndpoint = `${this.baseUrl}/.netlify/functions/simple-ebay-callback`;
        
        this.diagnostics = {
            critical: [],
            warnings: [],
            info: [],
            performance: {},
            networkTests: {},
            securityTests: {}
        };
        
        this.startTime = Date.now();
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const colors = {
            critical: '\x1b[91m',
            warning: '\x1b[93m',
            success: '\x1b[92m',
            info: '\x1b[96m',
            debug: '\x1b[95m',
            reset: '\x1b[0m'
        };
        
        const color = colors[level] || colors.info;
        console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
        
        this.diagnostics[level === 'success' ? 'info' : level].push({
            timestamp,
            message,
            level
        });
    }

    async measureNetworkPerformance(operation, testName) {
        const start = performance.now();
        try {
            const result = await operation();
            const duration = performance.now() - start;
            this.diagnostics.performance[testName] = {
                duration: Math.round(duration),
                success: true,
                result
            };
            return { success: true, result, duration };
        } catch (error) {
            const duration = performance.now() - start;
            this.diagnostics.performance[testName] = {
                duration: Math.round(duration),
                success: false,
                error: error.message
            };
            return { success: false, error, duration };
        }
    }

    // Critical Test 1: OAuth Endpoint Basic Connectivity
    async testOAuthEndpointConnectivity() {
        this.log('🔍 CRITICAL: Testing OAuth endpoint basic connectivity...', 'info');
        
        const { success, result, duration, error } = await this.measureNetworkPerformance(
            () => fetch(this.oauthEndpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'User-Agent': 'EasyFlip-OAuth-Diagnostic/1.0'
                },
                body: JSON.stringify({ action: 'generate-auth-url' }),
                timeout: 10000
            }),
            'oauth-connectivity'
        );

        if (!success) {
            this.log(`🚨 CRITICAL FAILURE: OAuth endpoint unreachable - ${error.message}`, 'critical');
            this.log(`   Duration: ${duration}ms`, 'critical');
            this.log(`   This blocks all OAuth operations!`, 'critical');
            return { accessible: false, error: error.message };
        }

        try {
            const responseData = await result.json();
            const functionallyWorking = result.ok && responseData.success && responseData.authUrl;
            
            if (functionallyWorking) {
                this.log(`✅ OAuth endpoint accessible and functional (${duration}ms)`, 'success');
                this.log(`   Status: ${result.status}`, 'info');
                this.log(`   Auth URL generated: ${responseData.authUrl.substring(0, 50)}...`, 'info');
                return { accessible: true, functional: true, authUrl: responseData.authUrl };
            } else {
                this.log(`🚨 CRITICAL: OAuth endpoint accessible but not functional`, 'critical');
                this.log(`   Status: ${result.status}`, 'critical');
                this.log(`   Response: ${JSON.stringify(responseData)}`, 'critical');
                return { accessible: true, functional: false, response: responseData };
            }
        } catch (parseError) {
            this.log(`🚨 CRITICAL: OAuth endpoint returned invalid JSON`, 'critical');
            this.log(`   Parse error: ${parseError.message}`, 'critical');
            return { accessible: true, functional: false, error: 'Invalid JSON response' };
        }
    }

    // Critical Test 2: Token Exchange Mechanism
    async testTokenExchangeMechanism() {
        this.log('🔄 CRITICAL: Testing token exchange mechanism...', 'info');
        
        const testCodes = [
            {
                name: 'Empty Code',
                code: '',
                expectedBehavior: 'Should return 400 with clear error'
            },
            {
                name: 'Invalid Code Format',
                code: 'invalid-code-123',
                expectedBehavior: 'Should return 400 with eBay API error'
            },
            {
                name: 'URL Encoded Sample',
                code: 'v%5E1.1%23i%5E1%23p%5E3%23I%5E3%23f%5E0',
                expectedBehavior: 'Should return 400 with proper eBay error'
            }
        ];

        const results = {};

        for (const testCase of testCodes) {
            this.log(`   Testing: ${testCase.name}`, 'info');
            
            const { success, result, duration, error } = await this.measureNetworkPerformance(
                () => fetch(this.oauthEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'exchange-code',
                        code: testCase.code
                    }),
                    timeout: 15000
                }),
                `token-exchange-${testCase.name.toLowerCase().replace(/\s+/g, '-')}`
            );

            if (!success) {
                this.log(`🚨 CRITICAL: Token exchange endpoint unreachable for ${testCase.name}`, 'critical');
                results[testCase.name] = { reachable: false, error: error.message };
                continue;
            }

            try {
                const responseData = await result.json();
                const properErrorHandling = result.status === 400 && !responseData.success && responseData.error;
                
                if (properErrorHandling) {
                    this.log(`✅ ${testCase.name}: Proper error handling (${duration}ms)`, 'success');
                    this.log(`   Error: ${responseData.error}`, 'info');
                } else {
                    this.log(`⚠️ ${testCase.name}: Unexpected response behavior`, 'warning');
                    this.log(`   Status: ${result.status}, Success: ${responseData.success}`, 'warning');
                }

                results[testCase.name] = {
                    reachable: true,
                    status: result.status,
                    response: responseData,
                    properErrorHandling
                };

            } catch (parseError) {
                this.log(`🚨 CRITICAL: Invalid JSON response for ${testCase.name}`, 'critical');
                results[testCase.name] = { reachable: true, jsonError: parseError.message };
            }
        }

        const allTestsReachable = Object.values(results).every(r => r.reachable);
        if (!allTestsReachable) {
            this.log(`🚨 CRITICAL: Token exchange mechanism has connectivity issues`, 'critical');
        }

        return results;
    }

    // Critical Test 3: Callback Handler Accessibility
    async testCallbackHandlerAccessibility() {
        this.log('📞 CRITICAL: Testing callback handler accessibility...', 'info');
        
        const { success, result, duration, error } = await this.measureNetworkPerformance(
            () => fetch(this.callbackEndpoint, {
                method: 'GET',
                timeout: 10000
            }),
            'callback-accessibility'
        );

        if (!success) {
            this.log(`🚨 CRITICAL FAILURE: Callback handler unreachable - ${error.message}`, 'critical');
            this.log(`   This breaks the OAuth flow completely!`, 'critical');
            return { accessible: false, error: error.message };
        }

        try {
            const responseText = await result.text();
            const isHtmlResponse = responseText.includes('<!DOCTYPE html>') || responseText.includes('<html');
            
            if (result.status === 400 && isHtmlResponse) {
                this.log(`✅ Callback handler accessible and returns proper HTML (${duration}ms)`, 'success');
                this.log(`   Status: 400 (expected for GET without params)`, 'info');
                return { accessible: true, functional: true };
            } else {
                this.log(`⚠️ Callback handler accessible but unexpected response`, 'warning');
                this.log(`   Status: ${result.status}`, 'warning');
                this.log(`   Response type: ${isHtmlResponse ? 'HTML' : 'Non-HTML'}`, 'warning');
                return { accessible: true, functional: false, status: result.status };
            }
        } catch (parseError) {
            this.log(`🚨 CRITICAL: Callback handler returned unreadable response`, 'critical');
            return { accessible: true, functional: false, error: 'Unreadable response' };
        }
    }

    // Critical Test 4: CORS Configuration
    async testCORSConfiguration() {
        this.log('🔒 CRITICAL: Testing CORS configuration...', 'info');
        
        const corsTests = [
            {
                name: 'OAuth Endpoint CORS',
                url: this.oauthEndpoint,
                method: 'OPTIONS'
            },
            {
                name: 'Callback Endpoint CORS',
                url: this.callbackEndpoint,
                method: 'OPTIONS'
            }
        ];

        const corsResults = {};

        for (const test of corsTests) {
            const { success, result, error } = await this.measureNetworkPerformance(
                () => fetch(test.url, {
                    method: test.method,
                    headers: {
                        'Origin': 'https://easyflip.ai',
                        'Access-Control-Request-Method': 'POST',
                        'Access-Control-Request-Headers': 'Content-Type'
                    },
                    timeout: 5000
                }),
                `cors-${test.name.toLowerCase().replace(/\s+/g, '-')}`
            );

            if (!success) {
                this.log(`🚨 CRITICAL: ${test.name} CORS preflight failed - ${error.message}`, 'critical');
                corsResults[test.name] = { success: false, error: error.message };
                continue;
            }

            const corsHeaders = {
                origin: result.headers.get('access-control-allow-origin'),
                methods: result.headers.get('access-control-allow-methods'),
                headers: result.headers.get('access-control-allow-headers')
            };

            const corsWorking = corsHeaders.origin === '*' && 
                               corsHeaders.methods?.includes('POST') &&
                               corsHeaders.headers?.includes('Content-Type');

            if (corsWorking) {
                this.log(`✅ ${test.name}: CORS properly configured`, 'success');
            } else {
                this.log(`🚨 CRITICAL: ${test.name}: CORS misconfigured`, 'critical');
                this.log(`   Origin: ${corsHeaders.origin}`, 'critical');
                this.log(`   Methods: ${corsHeaders.methods}`, 'critical');
                this.log(`   Headers: ${corsHeaders.headers}`, 'critical');
            }

            corsResults[test.name] = {
                success: corsWorking,
                headers: corsHeaders,
                status: result.status
            };
        }

        return corsResults;
    }

    // Critical Test 5: Network Latency and Reliability
    async testNetworkLatencyReliability() {
        this.log('🌐 CRITICAL: Testing network latency and reliability...', 'info');
        
        const reliabilityTests = [];
        const testCount = 5;

        for (let i = 0; i < testCount; i++) {
            reliabilityTests.push(
                this.measureNetworkPerformance(
                    () => fetch(this.oauthEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'generate-auth-url' }),
                        timeout: 8000
                    }),
                    `reliability-test-${i + 1}`
                )
            );
        }

        const results = await Promise.all(reliabilityTests);
        
        const successfulTests = results.filter(r => r.success);
        const failedTests = results.filter(r => !r.success);
        const avgLatency = successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length;
        const maxLatency = Math.max(...successfulTests.map(r => r.duration));
        const minLatency = Math.min(...successfulTests.map(r => r.duration));
        const reliability = (successfulTests.length / testCount) * 100;

        if (reliability < 80) {
            this.log(`🚨 CRITICAL: Network reliability too low: ${reliability}%`, 'critical');
            this.log(`   Failed tests: ${failedTests.length}/${testCount}`, 'critical');
            failedTests.forEach((test, index) => {
                this.log(`   Failure ${index + 1}: ${test.error.message}`, 'critical');
            });
        } else {
            this.log(`✅ Network reliability acceptable: ${reliability}%`, 'success');
        }

        if (avgLatency > 5000) {
            this.log(`🚨 CRITICAL: Average latency too high: ${avgLatency.toFixed(0)}ms`, 'critical');
        } else if (avgLatency > 3000) {
            this.log(`⚠️ High average latency: ${avgLatency.toFixed(0)}ms`, 'warning');
        } else {
            this.log(`✅ Average latency acceptable: ${avgLatency.toFixed(0)}ms`, 'success');
        }

        return {
            reliability,
            avgLatency: Math.round(avgLatency),
            maxLatency: Math.round(maxLatency),
            minLatency: Math.round(minLatency),
            successfulTests: successfulTests.length,
            failedTests: failedTests.length,
            failures: failedTests.map(t => t.error.message)
        };
    }

    // Critical Test 6: eBay API Integration Health
    async testEBayAPIIntegrationHealth() {
        this.log('🏪 CRITICAL: Testing eBay API integration health...', 'info');
        
        // Test if the endpoint can communicate with eBay's OAuth system
        const { success, result, duration, error } = await this.measureNetworkPerformance(
            () => fetch(this.oauthEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate-auth-url' }),
                timeout: 15000
            }),
            'ebay-integration-health'
        );

        if (!success) {
            this.log(`🚨 CRITICAL: Cannot reach OAuth endpoint to test eBay integration`, 'critical');
            return { reachable: false, error: error.message };
        }

        try {
            const responseData = await result.json();
            
            if (responseData.success && responseData.authUrl) {
                // Validate the auth URL structure
                const authUrl = responseData.authUrl;
                const isEBayURL = authUrl.includes('ebay.com') && authUrl.includes('oauth');
                const hasRequiredParams = authUrl.includes('client_id') && authUrl.includes('redirect_uri');
                
                if (isEBayURL && hasRequiredParams) {
                    this.log(`✅ eBay API integration healthy - valid auth URL generated`, 'success');
                    this.log(`   URL: ${authUrl.substring(0, 100)}...`, 'info');
                    
                    // Test if the generated URL points to production eBay
                    const isProduction = authUrl.includes('signin.ebay.com') && !authUrl.includes('sandbox');
                    if (isProduction) {
                        this.log(`✅ Production eBay OAuth endpoint confirmed`, 'success');
                    } else {
                        this.log(`⚠️ Not using production eBay OAuth endpoint`, 'warning');
                    }
                    
                    return { 
                        healthy: true, 
                        authUrl, 
                        isProduction,
                        urlStructureValid: true 
                    };
                } else {
                    this.log(`🚨 CRITICAL: Generated auth URL has invalid structure`, 'critical');
                    this.log(`   URL: ${authUrl}`, 'critical');
                    this.log(`   Is eBay URL: ${isEBayURL}`, 'critical');
                    this.log(`   Has required params: ${hasRequiredParams}`, 'critical');
                    return { healthy: false, authUrl, urlStructureValid: false };
                }
            } else {
                this.log(`🚨 CRITICAL: eBay API integration failed to generate auth URL`, 'critical');
                this.log(`   Response: ${JSON.stringify(responseData)}`, 'critical');
                return { healthy: false, response: responseData };
            }
        } catch (parseError) {
            this.log(`🚨 CRITICAL: eBay API integration returned invalid response`, 'critical');
            return { healthy: false, error: 'Invalid JSON response' };
        }
    }

    // Critical Test 7: Environment Configuration
    async testEnvironmentConfiguration() {
        this.log('⚙️ CRITICAL: Testing environment configuration via endpoint behavior...', 'info');
        
        // Test different actions to understand configuration
        const configTests = [
            { action: 'generate-auth-url', expectedStatus: 200 },
            { action: 'exchange-code', expectedStatus: 400 }, // Should fail without code
            { action: 'refresh-token', expectedStatus: 400 }, // Should fail without token
            { action: 'test-api', expectedStatus: 400 }, // Should fail without token
            { action: 'invalid-action', expectedStatus: 400 }
        ];

        const configResults = {};

        for (const test of configTests) {
            const { success, result, error } = await this.measureNetworkPerformance(
                () => fetch(this.oauthEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: test.action }),
                    timeout: 10000
                }),
                `config-test-${test.action}`
            );

            if (!success) {
                this.log(`🚨 Config test failed for ${test.action}: ${error.message}`, 'critical');
                configResults[test.action] = { reachable: false, error: error.message };
                continue;
            }

            const statusMatch = result.status === test.expectedStatus;
            if (statusMatch) {
                this.log(`✅ ${test.action}: Expected status ${test.expectedStatus}`, 'success');
            } else {
                this.log(`⚠️ ${test.action}: Got ${result.status}, expected ${test.expectedStatus}`, 'warning');
            }

            try {
                const responseData = await result.json();
                configResults[test.action] = {
                    reachable: true,
                    status: result.status,
                    expectedStatus: test.expectedStatus,
                    statusMatch,
                    response: responseData
                };
            } catch (parseError) {
                configResults[test.action] = {
                    reachable: true,
                    status: result.status,
                    jsonError: parseError.message
                };
            }
        }

        // Analyze configuration health
        const reachableActions = Object.values(configResults).filter(r => r.reachable).length;
        const configHealthy = reachableActions === configTests.length;

        if (!configHealthy) {
            this.log(`🚨 CRITICAL: Environment configuration has connectivity issues`, 'critical');
        } else {
            this.log(`✅ Environment configuration responding to all actions`, 'success');
        }

        return { configResults, configHealthy };
    }

    // Generate Production Failure Analysis Report
    generateProductionFailureReport() {
        const totalDuration = Date.now() - this.startTime;
        const criticalIssues = this.diagnostics.critical.length;
        const warnings = this.diagnostics.warnings.length;
        
        console.log('\n' + '='.repeat(100));
        console.log('🚨 OAUTH PRODUCTION FAILURE DIAGNOSTIC REPORT');
        console.log('='.repeat(100));
        console.log(`⏱️ Total Diagnostic Time: ${totalDuration}ms`);
        console.log(`🚨 Critical Issues Found: ${criticalIssues}`);
        console.log(`⚠️ Warnings: ${warnings}`);
        console.log(`ℹ️ Info Messages: ${this.diagnostics.info.length}`);
        
        // Critical Issues Section
        if (criticalIssues > 0) {
            console.log('\n🚨 CRITICAL ISSUES (BLOCKING PRODUCTION):');
            console.log('=' .repeat(60));
            this.diagnostics.critical.forEach((issue, index) => {
                console.log(`${index + 1}. ❌ ${issue.message}`);
                console.log(`   Time: ${issue.timestamp}`);
            });
            
            console.log('\n🔧 IMMEDIATE ACTIONS REQUIRED:');
            console.log('-'.repeat(60));
            console.log('1. 🚨 Fix all critical connectivity issues first');
            console.log('2. 🔄 Verify Netlify Functions deployment status');
            console.log('3. 🔑 Check environment variables in Netlify dashboard');
            console.log('4. 🌐 Test with different networks/locations');
            console.log('5. 📞 Contact Netlify support if infrastructure issues persist');
        }

        // Performance Analysis
        console.log('\n⚡ PERFORMANCE ANALYSIS:');
        console.log('-'.repeat(60));
        Object.entries(this.diagnostics.performance).forEach(([test, metrics]) => {
            const status = metrics.success ? 
                (metrics.duration < 1000 ? '🟢' : metrics.duration < 3000 ? '🟡' : '🔴') : 
                '❌';
            console.log(`${status} ${test}: ${metrics.success ? `${metrics.duration}ms` : `FAILED - ${metrics.error}`}`);
        });

        // Production Readiness Assessment
        console.log('\n🎯 PRODUCTION READINESS ASSESSMENT:');
        console.log('-'.repeat(60));
        
        const productionReady = criticalIssues === 0;
        
        if (productionReady) {
            console.log('✅ PRODUCTION READY');
            console.log('✅ All critical systems operational');
            console.log('✅ OAuth flow infrastructure working');
            console.log('✅ Network performance acceptable');
        } else {
            console.log('❌ NOT PRODUCTION READY');
            console.log('🚨 Critical infrastructure failures detected');
            console.log('🛑 OAuth flow completely blocked');
            console.log('⚠️ User authentication will fail');
        }

        // Specific Failure Patterns
        console.log('\n🔍 FAILURE PATTERN ANALYSIS:');
        console.log('-'.repeat(60));
        
        const hasConnectivityIssues = this.diagnostics.critical.some(c => 
            c.message.includes('unreachable') || c.message.includes('timeout')
        );
        const hasCORSIssues = this.diagnostics.critical.some(c => 
            c.message.includes('CORS')
        );
        const hasResponseIssues = this.diagnostics.critical.some(c => 
            c.message.includes('JSON') || c.message.includes('response')
        );

        if (hasConnectivityIssues) {
            console.log('🌐 CONNECTIVITY FAILURE PATTERN DETECTED:');
            console.log('   - OAuth endpoints unreachable from external networks');
            console.log('   - Likely Netlify Functions deployment issue');
            console.log('   - Check Netlify dashboard for function status');
        }
        
        if (hasCORSIssues) {
            console.log('🔒 CORS FAILURE PATTERN DETECTED:');
            console.log('   - Cross-origin requests being blocked');
            console.log('   - Frontend cannot communicate with OAuth functions');
            console.log('   - Check CORS headers in function responses');
        }
        
        if (hasResponseIssues) {
            console.log('📄 RESPONSE FAILURE PATTERN DETECTED:');
            console.log('   - Functions returning malformed responses');
            console.log('   - Possible runtime errors in function code');
            console.log('   - Check Netlify function logs for errors');
        }

        // Recovery Recommendations
        console.log('\n💡 RECOVERY RECOMMENDATIONS:');
        console.log('-'.repeat(60));
        console.log('🔧 IMMEDIATE (Next 30 minutes):');
        console.log('   1. Check Netlify Functions dashboard for deployment status');
        console.log('   2. Verify environment variables are set in Netlify');
        console.log('   3. Check function logs for runtime errors');
        console.log('   4. Test from different networks/devices');
        
        console.log('\n🔧 SHORT-TERM (Next 2 hours):');
        console.log('   1. Redeploy Netlify Functions if needed');
        console.log('   2. Verify eBay API credentials are valid');
        console.log('   3. Test OAuth flow in isolation');
        console.log('   4. Check DNS and SSL certificate status');
        
        console.log('\n🔧 PREVENTIVE (Next 24 hours):');
        console.log('   1. Set up monitoring for OAuth endpoints');
        console.log('   2. Create automated health checks');
        console.log('   3. Implement fallback/retry mechanisms');
        console.log('   4. Document recovery procedures');

        console.log('\n' + '='.repeat(100));
        console.log(`🎯 CRITICAL STATUS: ${productionReady ? 'OPERATIONAL' : 'SYSTEM DOWN'}`);
        console.log(`📞 User Impact: ${productionReady ? 'None' : 'Complete OAuth failure - users cannot authenticate'}`);
        console.log('='.repeat(100) + '\n');

        return {
            productionReady,
            criticalIssues,
            totalDuration,
            hasConnectivityIssues,
            hasCORSIssues,
            hasResponseIssues,
            performanceMetrics: this.diagnostics.performance
        };
    }

    // Main diagnostic runner
    async runProductionDiagnostic() {
        console.log('\n🚨 STARTING OAUTH PRODUCTION FAILURE DIAGNOSTIC\n');
        console.log('This diagnostic will identify why OAuth is failing in production...\n');
        
        const diagnosticTests = [
            {
                name: 'OAuth Endpoint Connectivity',
                fn: () => this.testOAuthEndpointConnectivity(),
                critical: true
            },
            {
                name: 'Token Exchange Mechanism',
                fn: () => this.testTokenExchangeMechanism(),
                critical: true
            },
            {
                name: 'Callback Handler Accessibility',
                fn: () => this.testCallbackHandlerAccessibility(),
                critical: true
            },
            {
                name: 'CORS Configuration',
                fn: () => this.testCORSConfiguration(),
                critical: true
            },
            {
                name: 'Network Reliability',
                fn: () => this.testNetworkLatencyReliability(),
                critical: false
            },
            {
                name: 'eBay API Integration Health',
                fn: () => this.testEBayAPIIntegrationHealth(),
                critical: true
            },
            {
                name: 'Environment Configuration',
                fn: () => this.testEnvironmentConfiguration(),
                critical: false
            }
        ];

        const results = {};

        for (const test of diagnosticTests) {
            try {
                this.log(`\n🧪 Running ${test.name}...`, 'info');
                results[test.name] = await test.fn();
                
                // Short delay between tests
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                this.log(`💥 CRITICAL: ${test.name} failed with error: ${error.message}`, 'critical');
                results[test.name] = { error: error.message, failed: true };
                
                if (test.critical) {
                    this.log(`🚨 Critical test failure - OAuth system compromised`, 'critical');
                }
            }
        }

        // Generate final diagnostic report
        const report = this.generateProductionFailureReport();
        
        return {
            ...report,
            detailedResults: results,
            diagnostics: this.diagnostics
        };
    }
}

// Execute diagnostic
async function runProductionDiagnostic() {
    const diagnostic = new OAuthProductionDiagnostic();
    
    try {
        const results = await diagnostic.runProductionDiagnostic();
        
        // Exit with appropriate code
        if (results.productionReady) {
            console.log('✅ OAuth system operational - false alarm or transient issue');
            process.exit(0);
        } else {
            console.log('🚨 OAuth system failure confirmed - immediate action required');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('💥 Diagnostic failed to complete:', error);
        console.error('🚨 Cannot determine OAuth system status');
        process.exit(1);
    }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runProductionDiagnostic();
}

export default OAuthProductionDiagnostic;