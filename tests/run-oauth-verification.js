#!/usr/bin/env node
/**
 * 🚀 OAuth Verification Test Runner
 * 
 * Executes all OAuth tests and provides comprehensive reporting
 * for immediate production failure diagnosis.
 * 
 * Usage:
 *   npm run test:oauth
 *   node tests/run-oauth-verification.js
 *   node tests/run-oauth-verification.js --quick
 *   node tests/run-oauth-verification.js --production-diagnostic
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { performance } from 'perf_hooks';

class OAuthVerificationRunner {
    constructor(options = {}) {
        this.options = {
            quick: options.quick || false,
            productionDiagnostic: options.productionDiagnostic || false,
            verbose: options.verbose || false,
            outputReport: options.outputReport !== false
        };
        
        this.results = {
            testSuites: [],
            summary: { total: 0, passed: 0, failed: 0, skipped: 0 },
            startTime: Date.now(),
            endTime: null,
            criticalFailures: [],
            recommendations: []
        };

        this.testSuites = [
            {
                name: 'Production Failure Diagnostic',
                file: 'oauth-production-failure-diagnostic.js',
                description: 'Critical infrastructure and connectivity tests',
                critical: true,
                estimatedTime: '30s'
            },
            {
                name: 'Comprehensive Token Exchange',
                file: 'oauth-token-exchange-comprehensive-test.js',
                description: 'Complete OAuth flow validation',
                critical: true,
                estimatedTime: '45s'
            },
            {
                name: 'OAuth Integration Tests',
                file: 'oauth-integration-test.js',
                description: 'EasyFlip integration compatibility',
                critical: false,
                estimatedTime: '20s'
            },
            {
                name: 'Popup Communication Tests',
                file: 'oauth-popup-communication-test.js',
                description: 'Cross-window communication validation',
                critical: false,
                estimatedTime: '15s'
            }
        ];
    }

    log(message, level = 'info') {
        const timestamp = new Date().toISOString();
        const colors = {
            error: '\x1b[91m',
            warning: '\x1b[93m',
            success: '\x1b[92m',
            info: '\x1b[96m',
            debug: '\x1b[95m',
            reset: '\x1b[0m'
        };
        
        const color = colors[level] || colors.info;
        console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
    }

    async runTestSuite(testSuite) {
        return new Promise((resolve) => {
            const startTime = performance.now();
            this.log(`🧪 Running: ${testSuite.name}`, 'info');
            this.log(`   ${testSuite.description}`, 'debug');
            
            const testProcess = spawn('node', [`tests/${testSuite.file}`], {
                cwd: process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            testProcess.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                if (this.options.verbose) {
                    console.log(output);
                }
            });

            testProcess.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                if (this.options.verbose) {
                    console.error(output);
                }
            });

            testProcess.on('close', (code) => {
                const duration = performance.now() - startTime;
                const passed = code === 0;
                
                const result = {
                    name: testSuite.name,
                    file: testSuite.file,
                    passed,
                    exitCode: code,
                    duration: Math.round(duration),
                    stdout,
                    stderr,
                    critical: testSuite.critical
                };

                if (passed) {
                    this.log(`✅ PASSED: ${testSuite.name} (${Math.round(duration)}ms)`, 'success');
                    this.results.summary.passed++;
                } else {
                    this.log(`❌ FAILED: ${testSuite.name} (exit code: ${code})`, 'error');
                    this.results.summary.failed++;
                    
                    if (testSuite.critical) {
                        this.results.criticalFailures.push(result);
                        this.log(`🚨 CRITICAL FAILURE: ${testSuite.name}`, 'error');
                    }
                }

                this.results.testSuites.push(result);
                this.results.summary.total++;
                
                resolve(result);
            });

            testProcess.on('error', (error) => {
                this.log(`💥 Test execution error: ${error.message}`, 'error');
                
                const result = {
                    name: testSuite.name,
                    file: testSuite.file,
                    passed: false,
                    error: error.message,
                    duration: 0,
                    critical: testSuite.critical
                };

                this.results.testSuites.push(result);
                this.results.summary.total++;
                this.results.summary.failed++;
                
                if (testSuite.critical) {
                    this.results.criticalFailures.push(result);
                }
                
                resolve(result);
            });

            // Set timeout for long-running tests
            setTimeout(() => {
                if (!testProcess.killed) {
                    testProcess.kill();
                    this.log(`⏰ Test timeout: ${testSuite.name}`, 'warning');
                }
            }, 60000); // 60 second timeout
        });
    }

    async runBrowserTests() {
        this.log('🌐 Browser tests available at:', 'info');
        this.log('   Local: file://C:/Users/Beau/Documents/bolt/tests/oauth-browser-communication-test.html', 'info');
        this.log('   Production: https://easyflip.ai/tests/oauth-browser-communication-test.html', 'info');
        this.log('   Manual execution required for browser-specific tests', 'warning');
        
        // Add browser test placeholder
        this.results.testSuites.push({
            name: 'Browser Communication Tests',
            file: 'oauth-browser-communication-test.html',
            passed: null, // Manual test
            duration: 0,
            manual: true,
            critical: false
        });
        
        this.results.summary.total++;
        this.results.summary.skipped++;
    }

    generateRecommendations() {
        const { criticalFailures, summary } = this.results;
        
        if (criticalFailures.length > 0) {
            this.results.recommendations.push({
                priority: 'CRITICAL',
                action: 'Fix critical infrastructure failures immediately',
                details: 'OAuth system is completely non-functional'
            });
            
            criticalFailures.forEach(failure => {
                if (failure.stderr.includes('ENOTFOUND') || failure.stderr.includes('timeout')) {
                    this.results.recommendations.push({
                        priority: 'URGENT',
                        action: 'Check Netlify Functions deployment',
                        details: 'Functions appear to be unreachable from external networks'
                    });
                }
                
                if (failure.stderr.includes('CORS')) {
                    this.results.recommendations.push({
                        priority: 'HIGH',
                        action: 'Fix CORS configuration',
                        details: 'Cross-origin requests are being blocked'
                    });
                }
            });
        }
        
        const passRate = (summary.passed / summary.total) * 100;
        
        if (passRate < 50) {
            this.results.recommendations.push({
                priority: 'CRITICAL',
                action: 'System-wide OAuth failure - delay production deployment',
                details: `Pass rate too low: ${passRate.toFixed(1)}%`
            });
        } else if (passRate < 85) {
            this.results.recommendations.push({
                priority: 'HIGH',
                action: 'Address failing tests before production deployment',
                details: `Pass rate below threshold: ${passRate.toFixed(1)}% (target: 85%)`
            });
        }
        
        if (this.results.testSuites.some(t => t.duration > 10000)) {
            this.results.recommendations.push({
                priority: 'MEDIUM',
                action: 'Investigate slow response times',
                details: 'Some OAuth operations taking >10 seconds'
            });
        }
    }

    generateReport() {
        this.results.endTime = Date.now();
        const totalDuration = this.results.endTime - this.results.startTime;
        const { summary, criticalFailures } = this.results;
        const passRate = summary.total > 0 ? (summary.passed / summary.total) * 100 : 0;
        
        console.log('\n' + '='.repeat(100));
        console.log('🚀 OAUTH VERIFICATION TEST RESULTS');
        console.log('='.repeat(100));
        console.log(`⏱️ Total Duration: ${totalDuration}ms`);
        console.log(`📊 Pass Rate: ${passRate.toFixed(1)}%`);
        console.log(`✅ Passed: ${summary.passed}/${summary.total}`);
        console.log(`❌ Failed: ${summary.failed}/${summary.total}`);
        console.log(`⏭️ Skipped: ${summary.skipped}/${summary.total}`);
        console.log(`🚨 Critical Failures: ${criticalFailures.length}`);
        
        // Test Suite Details
        console.log('\n📋 TEST SUITE RESULTS:');
        console.log('-'.repeat(80));
        this.results.testSuites.forEach((suite, index) => {
            const status = suite.passed === null ? '⏭️' : suite.passed ? '✅' : '❌';
            const critical = suite.critical ? ' [CRITICAL]' : '';
            const manual = suite.manual ? ' [MANUAL]' : '';
            console.log(`${index + 1}. ${status} ${suite.name}${critical}${manual}`);
            console.log(`   Duration: ${suite.duration}ms`);
            if (suite.error) {
                console.log(`   Error: ${suite.error}`);
            }
        });
        
        // Critical Failures
        if (criticalFailures.length > 0) {
            console.log('\n🚨 CRITICAL FAILURES:');
            console.log('-'.repeat(80));
            criticalFailures.forEach((failure, index) => {
                console.log(`${index + 1}. ❌ ${failure.name}`);
                if (failure.stderr) {
                    const errorLines = failure.stderr.split('\n').slice(0, 3);
                    errorLines.forEach(line => {
                        if (line.trim()) console.log(`   ${line}`);
                    });
                }
            });
        }
        
        // Recommendations
        this.generateRecommendations();
        if (this.results.recommendations.length > 0) {
            console.log('\n💡 RECOMMENDATIONS:');
            console.log('-'.repeat(80));
            this.results.recommendations.forEach((rec, index) => {
                const priorityIcon = {
                    'CRITICAL': '🚨',
                    'URGENT': '⚠️',
                    'HIGH': '🔴',
                    'MEDIUM': '🟡',
                    'LOW': '🟢'
                }[rec.priority] || '📌';
                
                console.log(`${index + 1}. ${priorityIcon} ${rec.priority}: ${rec.action}`);
                console.log(`   ${rec.details}`);
            });
        }
        
        // Production Readiness
        console.log('\n🎯 PRODUCTION READINESS ASSESSMENT:');
        console.log('-'.repeat(80));
        
        const productionReady = criticalFailures.length === 0 && passRate >= 85;
        
        if (productionReady) {
            console.log('✅ PRODUCTION READY');
            console.log('✅ All critical tests passing');
            console.log('✅ OAuth system operational');
            console.log('✅ User authentication will work');
        } else {
            console.log('❌ NOT PRODUCTION READY');
            if (criticalFailures.length > 0) {
                console.log('🚨 Critical infrastructure failures detected');
                console.log('🛑 OAuth flow completely non-functional');
                console.log('⚠️ Users cannot authenticate');
            }
            if (passRate < 85) {
                console.log(`📉 Pass rate below threshold: ${passRate.toFixed(1)}% (need 85%)`);
            }
        }
        
        // Next Steps
        console.log('\n📋 IMMEDIATE NEXT STEPS:');
        console.log('-'.repeat(80));
        if (productionReady) {
            console.log('1. ✅ OAuth system verified - proceed with confidence');
            console.log('2. 📊 Monitor OAuth success rates in production');
            console.log('3. 🔄 Set up automated health checks');
        } else {
            console.log('1. 🚨 Fix all critical failures before deployment');
            console.log('2. 🔧 Check Netlify Functions dashboard');
            console.log('3. 🔑 Verify environment variables');
            console.log('4. 🌐 Test from different networks');
            console.log('5. 📞 Contact support if issues persist');
        }
        
        console.log('\n' + '='.repeat(100));
        console.log(`🏁 OVERALL STATUS: ${productionReady ? 'PASS' : 'FAIL'} (${passRate.toFixed(1)}% success)`);
        console.log('='.repeat(100) + '\n');
        
        return {
            productionReady,
            passRate,
            totalDuration,
            criticalFailures: criticalFailures.length,
            recommendations: this.results.recommendations
        };
    }

    async saveReport() {
        if (!this.options.outputReport) return;
        
        const reportData = {
            timestamp: new Date().toISOString(),
            results: this.results,
            options: this.options,
            environment: {
                nodeVersion: process.version,
                platform: process.platform
            }
        };
        
        const reportFile = `tests/oauth-verification-report-${Date.now()}.json`;
        
        try {
            writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
            this.log(`📄 Report saved: ${reportFile}`, 'info');
        } catch (error) {
            this.log(`⚠️ Could not save report: ${error.message}`, 'warning');
        }
    }

    async run() {
        this.log('🚀 Starting OAuth Verification Test Suite', 'info');
        this.log(`Options: ${JSON.stringify(this.options)}`, 'debug');
        
        // Determine which tests to run
        let testsToRun = this.testSuites;
        
        if (this.options.quick) {
            testsToRun = this.testSuites.filter(t => t.critical);
            this.log('⚡ Quick mode: Running only critical tests', 'info');
        }
        
        if (this.options.productionDiagnostic) {
            testsToRun = this.testSuites.filter(t => t.name.includes('Production Failure'));
            this.log('🚨 Production diagnostic mode: Critical infrastructure only', 'info');
        }
        
        // Run test suites
        for (const testSuite of testsToRun) {
            try {
                await this.runTestSuite(testSuite);
            } catch (error) {
                this.log(`💥 Test suite error: ${error.message}`, 'error');
            }
        }
        
        // Run browser tests (manual)
        if (!this.options.productionDiagnostic) {
            await this.runBrowserTests();
        }
        
        // Generate and save report
        const finalReport = this.generateReport();
        await this.saveReport();
        
        // Exit with appropriate code
        process.exit(finalReport.productionReady ? 0 : 1);
    }
}

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    return {
        quick: args.includes('--quick'),
        productionDiagnostic: args.includes('--production-diagnostic'),
        verbose: args.includes('--verbose') || args.includes('-v'),
        outputReport: !args.includes('--no-report')
    };
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const options = parseArgs();
    const runner = new OAuthVerificationRunner(options);
    
    runner.run().catch(error => {
        console.error('💥 Test runner failed:', error);
        process.exit(1);
    });
}

export default OAuthVerificationRunner;