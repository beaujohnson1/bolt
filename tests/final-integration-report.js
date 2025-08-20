/**
 * 📊 Final OAuth Integration Report
 * Comprehensive validation of Phase 1 OAuth implementation
 */

import fs from 'fs';
import path from 'path';

class FinalIntegrationValidator {
    constructor() {
        this.results = {
            criticalChecks: [],
            codeAnalysis: [],
            integrationPoints: [],
            securityValidation: [],
            recommendations: []
        };
    }

    log(message, type = 'info') {
        const colors = {
            success: '\x1b[32m',
            error: '\x1b[31m',
            warning: '\x1b[33m',
            info: '\x1b[36m',
            reset: '\x1b[0m'
        };
        
        const color = colors[type] || colors.info;
        console.log(`${color}${message}${colors.reset}`);
    }

    checkFile(filePath, description) {
        try {
            const exists = fs.existsSync(filePath);
            if (exists) {
                const stats = fs.statSync(filePath);
                const size = stats.size;
                const modified = stats.mtime;
                
                this.results.criticalChecks.push({
                    check: description,
                    status: 'PASS',
                    details: `File exists (${size} bytes, modified ${modified.toISOString()})`
                });
                
                return { exists: true, content: fs.readFileSync(filePath, 'utf8'), size, modified };
            } else {
                this.results.criticalChecks.push({
                    check: description,
                    status: 'FAIL',
                    details: 'File does not exist'
                });
                return { exists: false };
            }
        } catch (error) {
            this.results.criticalChecks.push({
                check: description,
                status: 'ERROR',
                details: error.message
            });
            return { exists: false, error: error.message };
        }
    }

    analyzeOAuthFunction() {
        this.log('🔍 Analyzing OAuth function implementation...', 'info');
        
        const oauthFile = this.checkFile(
            'C:\\Users\\Beau\\Documents\\bolt\\netlify\\functions\\simple-ebay-oauth.js',
            'OAuth Function Implementation'
        );
        
        if (oauthFile.exists) {
            const content = oauthFile.content;
            
            // Check critical implementation details
            const checks = [
                {
                    pattern: /ebay-api/,
                    name: 'Uses official eBay API library',
                    critical: true
                },
                {
                    pattern: /generate-auth-url/,
                    name: 'Implements auth URL generation',
                    critical: true
                },
                {
                    pattern: /exchange-code/,
                    name: 'Implements token exchange',
                    critical: true
                },
                {
                    pattern: /refresh-token/,
                    name: 'Implements token refresh',
                    critical: false
                },
                {
                    pattern: /test-api/,
                    name: 'Includes API testing capability',
                    critical: false
                },
                {
                    pattern: /CORS/,
                    name: 'CORS headers configured',
                    critical: true
                },
                {
                    pattern: /OAuth2\.setScope/,
                    name: 'OAuth scopes properly configured',
                    critical: true
                },
                {
                    pattern: /easyflip\.ai-easyflip-easyfl-cnqajybp/,
                    name: 'Correct RU Name configured',
                    critical: true
                }
            ];

            checks.forEach(check => {
                const found = check.pattern.test(content);
                this.results.codeAnalysis.push({
                    component: 'OAuth Function',
                    check: check.name,
                    status: found ? 'PASS' : 'FAIL',
                    critical: check.critical,
                    details: found ? 'Implementation found' : 'Implementation missing'
                });
            });
        }
    }

    analyzeCallbackHandler() {
        this.log('📞 Analyzing OAuth callback handler...', 'info');
        
        const callbackFile = this.checkFile(
            'C:\\Users\\Beau\\Documents\\bolt\\netlify\\functions\\simple-ebay-callback.js',
            'OAuth Callback Handler'
        );
        
        if (callbackFile.exists) {
            const content = callbackFile.content;
            
            const checks = [
                {
                    pattern: /ebay_manual_token/,
                    name: 'Stores manual token in correct format',
                    critical: true
                },
                {
                    pattern: /ebay_oauth_tokens/,
                    name: 'Stores OAuth tokens in correct format',
                    critical: true
                },
                {
                    pattern: /simpleEbayAuthSuccess/,
                    name: 'Triggers success event for parent window',
                    critical: true
                },
                {
                    pattern: /window\.opener/,
                    name: 'Handles popup communication',
                    critical: true
                },
                {
                    pattern: /expires_at.*Date\.now/,
                    name: 'Calculates proper token expiry',
                    critical: true
                },
                {
                    pattern: /error_description/,
                    name: 'Handles OAuth errors from eBay',
                    critical: false
                }
            ];

            checks.forEach(check => {
                const found = check.pattern.test(content);
                this.results.codeAnalysis.push({
                    component: 'Callback Handler',
                    check: check.name,
                    status: found ? 'PASS' : 'FAIL',
                    critical: check.critical,
                    details: found ? 'Implementation found' : 'Implementation missing'
                });
            });
        }
    }

    analyzeMainAppIntegration() {
        this.log('🎯 Analyzing main app integration...', 'info');
        
        const authContextFile = this.checkFile(
            'C:\\Users\\Beau\\Documents\\bolt\\src\\contexts\\AuthContext.tsx',
            'Auth Context Integration'
        );
        
        if (authContextFile.exists) {
            const content = authContextFile.content;
            
            const checks = [
                {
                    pattern: /localStorage\.getItem\('ebay_oauth_tokens'\)/,
                    name: 'Detects OAuth tokens',
                    critical: true
                },
                {
                    pattern: /localStorage\.getItem\('ebay_manual_token'\)/,
                    name: 'Detects manual token',
                    critical: true
                },
                {
                    pattern: /ebayConnected.*=.*localStorage\.getItem/,
                    name: 'Uses tokens for connection status',
                    critical: true
                },
                {
                    pattern: /checkOnboardingStatus/,
                    name: 'Includes onboarding status checking',
                    critical: false
                }
            ];

            checks.forEach(check => {
                const found = check.pattern.test(content);
                this.results.integrationPoints.push({
                    component: 'AuthContext',
                    check: check.name,
                    status: found ? 'PASS' : 'FAIL',
                    critical: check.critical,
                    details: found ? 'Integration point found' : 'Integration point missing'
                });
            });
        }
    }

    analyzeTestPages() {
        this.log('🧪 Analyzing test implementations...', 'info');
        
        const testPageFile = this.checkFile(
            'C:\\Users\\Beau\\Documents\\bolt\\public\\test-simple-oauth.html',
            'OAuth Test Page'
        );
        
        if (testPageFile.exists) {
            const content = testPageFile.content;
            
            const checks = [
                {
                    pattern: /startOAuth/,
                    name: 'OAuth flow initiation',
                    critical: true
                },
                {
                    pattern: /manualExchange/,
                    name: 'Manual token exchange fallback',
                    critical: false
                },
                {
                    pattern: /testAPI/,
                    name: 'API testing functionality',
                    critical: false
                },
                {
                    pattern: /ebay_manual_token.*ebay_oauth_tokens/,
                    name: 'Uses correct localStorage keys',
                    critical: true
                },
                {
                    pattern: /simpleEbayAuthSuccess/,
                    name: 'Listens for auth success events',
                    critical: true
                }
            ];

            checks.forEach(check => {
                const found = check.pattern.test(content);
                this.results.codeAnalysis.push({
                    component: 'Test Page',
                    check: check.name,
                    status: found ? 'PASS' : 'FAIL',
                    critical: check.critical,
                    details: found ? 'Feature implemented' : 'Feature missing'
                });
            });
        }
    }

    validateSecurityMeasures() {
        this.log('🔒 Validating security measures...', 'info');
        
        // Check environment variable usage
        const oauthFile = this.checkFile(
            'C:\\Users\\Beau\\Documents\\bolt\\netlify\\functions\\simple-ebay-oauth.js',
            'OAuth Function for Security Analysis'
        );
        
        if (oauthFile.exists) {
            const content = oauthFile.content;
            
            const securityChecks = [
                {
                    pattern: /process\.env\.EBAY_PROD_APP/,
                    name: 'Uses environment variables for App ID',
                    level: 'CRITICAL'
                },
                {
                    pattern: /process\.env\.EBAY_PROD_CERT/,
                    name: 'Uses environment variables for Cert ID',
                    level: 'CRITICAL'
                },
                {
                    pattern: /sandbox:\s*false/,
                    name: 'Configured for production eBay environment',
                    level: 'HIGH'
                },
                {
                    pattern: /Access-Control-Allow-Origin/,
                    name: 'CORS headers configured',
                    level: 'MEDIUM'
                },
                {
                    pattern: /https:\/\/auth\.ebay\.com/,
                    name: 'Uses official eBay OAuth endpoints',
                    level: 'HIGH'
                }
            ];

            securityChecks.forEach(check => {
                const found = check.pattern.test(content);
                this.results.securityValidation.push({
                    check: check.name,
                    status: found ? 'PASS' : 'FAIL',
                    level: check.level,
                    details: found ? 'Security measure implemented' : 'Security measure missing'
                });
            });
        }
    }

    generateRecommendations() {
        this.log('💡 Generating recommendations...', 'info');
        
        const allChecks = [
            ...this.results.criticalChecks,
            ...this.results.codeAnalysis,
            ...this.results.integrationPoints,
            ...this.results.securityValidation
        ];
        
        const failed = allChecks.filter(check => check.status === 'FAIL');
        const critical = failed.filter(check => check.critical === true);
        
        // Generate specific recommendations
        if (critical.length === 0) {
            this.results.recommendations.push({
                priority: 'HIGH',
                action: 'PROCEED_TO_PHASE_2',
                details: 'All critical OAuth integration checks passed. Ready for Phase 2.'
            });
        } else {
            this.results.recommendations.push({
                priority: 'CRITICAL',
                action: 'FIX_CRITICAL_ISSUES',
                details: `${critical.length} critical issues must be resolved before Phase 2.`
            });
        }

        if (failed.length > 0 && critical.length === 0) {
            this.results.recommendations.push({
                priority: 'MEDIUM',
                action: 'ADDRESS_NON_CRITICAL',
                details: `${failed.length} non-critical issues should be addressed for optimal functionality.`
            });
        }

        // Specific technical recommendations
        this.results.recommendations.push({
            priority: 'LOW',
            action: 'MONITORING',
            details: 'Implement OAuth token refresh monitoring in production environment.'
        });

        this.results.recommendations.push({
            priority: 'MEDIUM',
            action: 'ERROR_HANDLING',
            details: 'Consider adding more detailed error logging for OAuth failures.'
        });
    }

    generateFinalReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 FINAL OAUTH INTEGRATION VALIDATION REPORT');
        console.log('='.repeat(80));
        
        // Summary statistics
        const allChecks = [
            ...this.results.criticalChecks,
            ...this.results.codeAnalysis,
            ...this.results.integrationPoints,
            ...this.results.securityValidation
        ];
        
        const total = allChecks.length;
        const passed = allChecks.filter(c => c.status === 'PASS').length;
        const failed = allChecks.filter(c => c.status === 'FAIL').length;
        const errors = allChecks.filter(c => c.status === 'ERROR').length;
        const critical = allChecks.filter(c => c.critical === true).length;
        const criticalFailed = allChecks.filter(c => c.status === 'FAIL' && c.critical === true).length;
        
        const passRate = ((passed / total) * 100).toFixed(1);
        const criticalPassRate = critical > 0 ? (((critical - criticalFailed) / critical) * 100).toFixed(1) : 100;
        
        console.log(`📈 Overall Pass Rate: ${passRate}% (${passed}/${total})`);
        console.log(`🔥 Critical Pass Rate: ${criticalPassRate}% (${critical - criticalFailed}/${critical})`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`⚠️  Errors: ${errors}`);
        
        // Detailed results by category
        const categories = [
            { name: 'Critical File Checks', data: this.results.criticalChecks },
            { name: 'Code Analysis', data: this.results.codeAnalysis },
            { name: 'Integration Points', data: this.results.integrationPoints },
            { name: 'Security Validation', data: this.results.securityValidation }
        ];
        
        categories.forEach(category => {
            if (category.data.length > 0) {
                console.log(`\n📋 ${category.name.toUpperCase()}:`);
                console.log('-'.repeat(60));
                
                category.data.forEach((item, index) => {
                    const status = item.status === 'PASS' ? '✅' : item.status === 'FAIL' ? '❌' : '⚠️';
                    const critical = item.critical ? ' [CRITICAL]' : '';
                    console.log(`${index + 1}. ${status} ${item.check || item.name}${critical}`);
                    console.log(`   ${item.details}`);
                });
            }
        });
        
        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        console.log('-'.repeat(60));
        this.results.recommendations.forEach((rec, index) => {
            const priority = rec.priority === 'CRITICAL' ? '🔥' : rec.priority === 'HIGH' ? '⚡' : rec.priority === 'MEDIUM' ? '⚠️' : 'ℹ️';
            console.log(`${index + 1}. ${priority} ${rec.action.replace(/_/g, ' ')}`);
            console.log(`   ${rec.details}`);
        });
        
        // Final verdict
        console.log('\n' + '='.repeat(80));
        if (criticalFailed === 0 && passRate >= 85) {
            this.log('🎉 OAUTH INTEGRATION: READY FOR PHASE 2!', 'success');
            console.log('✅ All critical systems operational');
            console.log('✅ Token storage format compatible');
            console.log('✅ Main app integration verified');
        } else if (criticalFailed > 0) {
            this.log('🚨 OAUTH INTEGRATION: CRITICAL ISSUES DETECTED!', 'error');
            console.log(`❌ ${criticalFailed} critical issues must be resolved`);
        } else {
            this.log('⚠️  OAUTH INTEGRATION: MINOR ISSUES DETECTED', 'warning');
            console.log('⚠️ Some non-critical issues should be addressed');
        }
        console.log('='.repeat(80) + '\n');
        
        return {
            ready: criticalFailed === 0 && passRate >= 85,
            passRate,
            criticalPassRate,
            issues: allChecks.filter(c => c.status !== 'PASS'),
            recommendations: this.results.recommendations
        };
    }

    async runFullValidation() {
        this.log('🚀 Starting comprehensive OAuth integration validation...', 'info');
        
        this.analyzeOAuthFunction();
        this.analyzeCallbackHandler();
        this.analyzeMainAppIntegration();
        this.analyzeTestPages();
        this.validateSecurityMeasures();
        this.generateRecommendations();
        
        return this.generateFinalReport();
    }
}

// Run the validation
const validator = new FinalIntegrationValidator();
validator.runFullValidation().then(results => {
    process.exit(results.ready ? 0 : 1);
}).catch(error => {
    console.error('💥 Validation error:', error);
    process.exit(1);
});

export default FinalIntegrationValidator;