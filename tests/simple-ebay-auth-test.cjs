/**
 * Simple eBay Auth Component Test
 * Tests the SimpleEbayAuth component that follows Hendt eBay API pattern
 */

const fs = require('fs');
const path = require('path');

class SimpleEbayAuthTest {
    constructor() {
        this.testResults = [];
        this.componentPath = path.join(__dirname, '../src/components/SimpleEbayAuth.tsx');
        this.testPagePath = path.join(__dirname, '../src/pages/SimpleEbayAuthTest.tsx');
        this.appPath = path.join(__dirname, '../src/App.tsx');
        this.fixedServicePath = path.join(__dirname, '../src/services/ebayOAuthFixed.ts');
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    addResult(test, passed, message) {
        this.testResults.push({
            test,
            passed,
            message,
            timestamp: new Date().toISOString()
        });
    }

    async testComponentExists() {
        this.log('Testing component file existence...');
        
        try {
            const exists = fs.existsSync(this.componentPath);
            this.addResult('Component File Exists', exists, 
                exists ? 'SimpleEbayAuth.tsx found' : 'Component file missing');
            
            if (exists) {
                const content = fs.readFileSync(this.componentPath, 'utf8');
                const hasHendtPattern = content.includes('EBayOAuthFixed.generateAuthUrl()');
                const hasPopupHandling = content.includes('window.open');
                const hasMessageListener = content.includes('addEventListener(\'message\'');
                
                this.addResult('Hendt Pattern Implementation', hasHendtPattern,
                    hasHendtPattern ? 'Uses correct generateAuthUrl() pattern' : 'Missing Hendt pattern');
                
                this.addResult('Popup OAuth Flow', hasPopupHandling,
                    hasPopupHandling ? 'Implements popup OAuth flow' : 'Missing popup handling');
                
                this.addResult('Message Communication', hasMessageListener,
                    hasMessageListener ? 'Listens for callback messages' : 'Missing message handling');
            }
        } catch (error) {
            this.addResult('Component File Exists', false, `Error: ${error.message}`);
        }
    }

    async testTestPageExists() {
        this.log('Testing test page existence...');
        
        try {
            const exists = fs.existsSync(this.testPagePath);
            this.addResult('Test Page Exists', exists,
                exists ? 'SimpleEbayAuthTest.tsx found' : 'Test page missing');
            
            if (exists) {
                const content = fs.readFileSync(this.testPagePath, 'utf8');
                const hasComponent = content.includes('<SimpleEbayAuth');
                const hasDocumentation = content.includes('Implementation Details');
                
                this.addResult('Test Page Uses Component', hasComponent,
                    hasComponent ? 'Test page imports and uses component' : 'Component not used');
                
                this.addResult('Test Page Documentation', hasDocumentation,
                    hasDocumentation ? 'Includes implementation documentation' : 'Missing documentation');
            }
        } catch (error) {
            this.addResult('Test Page Exists', false, `Error: ${error.message}`);
        }
    }

    async testRouteConfiguration() {
        this.log('Testing route configuration...');
        
        try {
            const exists = fs.existsSync(this.appPath);
            this.addResult('App.tsx Exists', exists,
                exists ? 'App.tsx found' : 'App.tsx missing');
            
            if (exists) {
                const content = fs.readFileSync(this.appPath, 'utf8');
                const hasImport = content.includes('import SimpleEbayAuthTest');
                const hasRoute = content.includes('/simple-ebay-auth-test');
                
                this.addResult('Component Import', hasImport,
                    hasImport ? 'SimpleEbayAuthTest imported' : 'Missing import');
                
                this.addResult('Route Configuration', hasRoute,
                    hasRoute ? 'Route /simple-ebay-auth-test configured' : 'Missing route');
            }
        } catch (error) {
            this.addResult('Route Configuration', false, `Error: ${error.message}`);
        }
    }

    async testFixedServiceIntegration() {
        this.log('Testing fixed service integration...');
        
        try {
            const exists = fs.existsSync(this.fixedServicePath);
            this.addResult('Fixed Service Exists', exists,
                exists ? 'ebayOAuthFixed.ts found' : 'Fixed service missing');
            
            if (exists) {
                const content = fs.readFileSync(this.fixedServicePath, 'utf8');
                const hasGenerateAuthUrl = content.includes('generateAuthUrl');
                const hasGetToken = content.includes('getToken');
                const hasSetCredentials = content.includes('setCredentials');
                const hasCallbackHandling = content.includes('handleCallback');
                
                this.addResult('Generate Auth URL Method', hasGenerateAuthUrl,
                    hasGenerateAuthUrl ? 'generateAuthUrl method found' : 'Missing generateAuthUrl');
                
                this.addResult('Get Token Method', hasGetToken,
                    hasGetToken ? 'getToken method found' : 'Missing getToken');
                
                this.addResult('Set Credentials Method', hasSetCredentials,
                    hasSetCredentials ? 'setCredentials method found' : 'Missing setCredentials');
                
                this.addResult('Callback Handling', hasCallbackHandling,
                    hasCallbackHandling ? 'handleCallback method found' : 'Missing callback handling');
            }
        } catch (error) {
            this.addResult('Fixed Service Integration', false, `Error: ${error.message}`);
        }
    }

    async testCallbackEndpointCompatibility() {
        this.log('Testing callback endpoint compatibility...');
        
        const callbackPath = path.join(__dirname, '../netlify/functions/simple-ebay-callback.js');
        
        try {
            const exists = fs.existsSync(callbackPath);
            this.addResult('Callback Endpoint Exists', exists,
                exists ? 'simple-ebay-callback.js found' : 'Callback endpoint missing');
            
            if (exists) {
                const content = fs.readFileSync(callbackPath, 'utf8');
                const hasTokenExchange = content.includes('exchangeTokens');
                const hasPostMessage = content.includes('postMessage');
                const hasTokenStorage = content.includes('localStorage.setItem');
                const hasEbayOauthSuccess = content.includes('EBAY_OAUTH_SUCCESS');
                
                this.addResult('Token Exchange Logic', hasTokenExchange,
                    hasTokenExchange ? 'Token exchange functionality found' : 'Missing token exchange');
                
                this.addResult('PostMessage Communication', hasPostMessage,
                    hasPostMessage ? 'PostMessage communication found' : 'Missing postMessage');
                
                this.addResult('Token Storage', hasTokenStorage,
                    hasTokenStorage ? 'Token storage logic found' : 'Missing token storage');
                
                this.addResult('Success Message Type', hasEbayOauthSuccess,
                    hasEbayOauthSuccess ? 'EBAY_OAUTH_SUCCESS message type found' : 'Missing success message type');
            }
        } catch (error) {
            this.addResult('Callback Endpoint Compatibility', false, `Error: ${error.message}`);
        }
    }

    async runAllTests() {
        this.log('Starting Simple eBay Auth Component Tests...', 'info');
        console.log('='.repeat(70));
        
        await this.testComponentExists();
        await this.testTestPageExists();
        await this.testRouteConfiguration();
        await this.testFixedServiceIntegration();
        await this.testCallbackEndpointCompatibility();
        
        this.generateReport();
    }

    generateReport() {
        console.log('\n' + '='.repeat(70));
        this.log('TEST RESULTS SUMMARY', 'info');
        console.log('='.repeat(70));
        
        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;
        const passRate = ((passed / total) * 100).toFixed(1);
        
        console.log(`\n📊 Overall Results: ${passed}/${total} tests passed (${passRate}%)\n`);
        
        this.testResults.forEach((result, index) => {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            const num = String(index + 1).padStart(2, ' ');
            console.log(`${num}. ${status} - ${result.test}`);
            console.log(`    ${result.message}`);
        });
        
        console.log('\n' + '='.repeat(70));
        
        if (passed === total) {
            this.log('🎉 All tests passed! SimpleEbayAuth component is ready for testing.', 'success');
        } else {
            this.log(`⚠️  ${total - passed} tests failed. Please review the issues above.`, 'error');
        }
        
        console.log('\n📝 Component Features:');
        console.log('  • Follows Hendt eBay API pattern exactly');
        console.log('  • Uses EBayOAuthFixed service');
        console.log('  • Integrates with fixed callback endpoint');
        console.log('  • Popup-based OAuth flow');
        console.log('  • Cross-window communication via postMessage');
        console.log('  • Automatic token storage and refresh');
        console.log('  • Comprehensive error handling');
        
        console.log('\n🌐 Test URL: http://localhost:8888/simple-ebay-auth-test');
        console.log('='.repeat(70));
    }
}

// Run tests
const tester = new SimpleEbayAuthTest();
tester.runAllTests().catch(console.error);