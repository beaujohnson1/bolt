#!/usr/bin/env node
/**
 * eBay OAuth Connection Verification Script
 * 
 * Comprehensive validation of OAuth tokens with focus on critical 'sell.account' scope
 * Tests localStorage token data, validates scopes, checks expiration status
 * 
 * Usage:
 *   node tests/verify-oauth-connection.js
 *   npm run test:oauth:connection
 * 
 * Features:
 * - Checks localStorage for token and scope information
 * - Validates critical sell.account scope presence
 * - Tests token expiration status
 * - Verifies all required scopes are present
 * - Returns clear status report with actionable recommendations
 */

import { performance } from 'perf_hooks';
import { readFileSync } from 'fs';

/**
 * eBay OAuth Scope Requirements
 */
const REQUIRED_SCOPES = {
  account: 'https://api.ebay.com/oauth/api_scope/sell.account',
  inventory: 'https://api.ebay.com/oauth/api_scope/sell.inventory', 
  fulfillment: 'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  identity: 'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
  marketing: 'https://api.ebay.com/oauth/api_scope/sell.marketing',
  analytics: 'https://api.ebay.com/oauth/api_scope/sell.analytics.readonly'
};

/**
 * Critical scopes that must be present for core functionality
 */
const CRITICAL_SCOPES = [
  REQUIRED_SCOPES.account,    // Essential for business policies
  REQUIRED_SCOPES.inventory,  // Essential for listing management
  REQUIRED_SCOPES.identity    // Essential for user identification
];

/**
 * OAuth Connection Verification System
 */
class OAuthConnectionVerifier {
  constructor(options = {}) {
    this.options = {
      verbose: options.verbose || false,
      simulateLocalStorage: options.simulateLocalStorage || false,
      testMode: options.testMode || false
    };
    
    this.results = {
      timestamp: new Date().toISOString(),
      startTime: performance.now(),
      tokenPresent: false,
      tokenValid: false,
      tokenExpired: false,
      scopeValidation: {
        hasAllRequired: false,
        hasAllCritical: false,
        missingScopes: [],
        missingCriticalScopes: [],
        scopeBreakdown: {}
      },
      recommendations: [],
      overallStatus: 'UNKNOWN',
      details: {}
    };
  }

  /**
   * Log formatted messages with color coding
   */
  log(message, level = 'info') {
    if (!this.options.verbose && level === 'debug') return;
    
    const colors = {
      error: '\x1b[91m',
      warning: '\x1b[93m', 
      success: '\x1b[92m',
      info: '\x1b[96m',
      debug: '\x1b[95m',
      critical: '\x1b[41m\x1b[97m',
      reset: '\x1b[0m'
    };
    
    const color = colors[level] || colors.info;
    const timestamp = new Date().toISOString().substring(11, 23);
    console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
  }

  /**
   * Simulate localStorage for Node.js environment
   */
  getLocalStorageData() {
    if (this.options.simulateLocalStorage) {
      // Simulate localStorage data for testing
      return {
        'easyflip_ebay_access_token': 'v^1.1#i^1#f^0#I^3#r^1#p^3#V^1.1#t^H4sIAAAAAAAC...',
        'easyflip_ebay_refresh_token': 'v^1.1#i^1#f^0#r^1#p^3#I^3#V^1.1#t^H4sIAAAAAAAC...',
        'easyflip_ebay_token_expires_at': (Date.now() + (2 * 60 * 60 * 1000)).toString(), // 2 hours from now
        'easyflip_ebay_token_scope': Object.values(REQUIRED_SCOPES).join(' '),
        'easyflip_ebay_auth_state': 'authenticated'
      };
    }

    // In Node.js, we can't access localStorage directly
    // This would normally be run in a browser context or with jsdom
    if (typeof window === 'undefined' || !window.localStorage) {
      this.log('⚠️ Running in Node.js environment - localStorage not available', 'warning');
      this.log('💡 To test with simulated data, use --simulate flag', 'info');
      return {};
    }

    // Extract all eBay-related localStorage items
    const data = {};
    const keys = [
      'easyflip_ebay_access_token',
      'easyflip_ebay_refresh_token', 
      'easyflip_ebay_token_expires_at',
      'easyflip_ebay_token_scope',
      'easyflip_ebay_auth_state',
      'easyflip_ebay_user_id'
    ];

    keys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value !== null) {
          data[key] = value;
        }
      } catch (error) {
        this.log(`❌ Error reading localStorage key '${key}': ${error.message}`, 'error');
      }
    });

    return data;
  }

  /**
   * Validate token presence and basic structure
   */
  validateTokenPresence(data) {
    this.log('🔍 Checking token presence...', 'info');
    
    const requiredKeys = [
      'easyflip_ebay_access_token',
      'easyflip_ebay_token_expires_at', 
      'easyflip_ebay_token_scope'
    ];

    const missing = requiredKeys.filter(key => !data[key]);
    
    if (missing.length > 0) {
      this.log(`❌ Missing required token data: ${missing.join(', ')}`, 'error');
      this.results.tokenPresent = false;
      this.results.details.missingTokenData = missing;
      return false;
    }

    // Validate token format (basic check)
    const accessToken = data.easyflip_ebay_access_token;
    if (!accessToken.startsWith('v^1.1#')) {
      this.log('⚠️ Access token format may be invalid (does not start with v^1.1#)', 'warning');
      this.results.details.tokenFormatWarning = true;
    }

    this.log('✅ All required token data present', 'success');
    this.results.tokenPresent = true;
    
    // Store token details
    this.results.details.tokenInfo = {
      hasAccessToken: !!data.easyflip_ebay_access_token,
      hasRefreshToken: !!data.easyflip_ebay_refresh_token,
      hasScope: !!data.easyflip_ebay_token_scope,
      hasExpiryInfo: !!data.easyflip_ebay_token_expires_at,
      tokenLength: data.easyflip_ebay_access_token?.length || 0,
      authState: data.easyflip_ebay_auth_state || 'unknown'
    };

    return true;
  }

  /**
   * Check token expiration status
   */
  validateTokenExpiration(data) {
    this.log('⏰ Checking token expiration...', 'info');
    
    const expiresAtStr = data.easyflip_ebay_token_expires_at;
    if (!expiresAtStr) {
      this.log('❌ No expiration time found', 'error');
      return false;
    }

    const expiresAt = parseInt(expiresAtStr);
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    
    this.results.details.expiration = {
      expiresAt: new Date(expiresAt).toISOString(),
      timeUntilExpiry,
      expired: timeUntilExpiry <= 0,
      expiringWithin5Min: timeUntilExpiry <= (5 * 60 * 1000),
      expiringWithin1Hour: timeUntilExpiry <= (60 * 60 * 1000)
    };

    if (timeUntilExpiry <= 0) {
      this.log('❌ Token has expired', 'error');
      this.results.tokenExpired = true;
      this.results.recommendations.push({
        priority: 'CRITICAL',
        action: 'Re-authenticate with eBay',
        reason: 'Access token has expired',
        urgency: 'immediate'
      });
      return false;
    }

    if (timeUntilExpiry <= (5 * 60 * 1000)) {
      this.log('⚠️ Token expires within 5 minutes', 'warning');
      this.results.recommendations.push({
        priority: 'HIGH',
        action: 'Refresh token soon',
        reason: 'Token expires very soon',
        urgency: 'within-5-minutes'
      });
    } else if (timeUntilExpiry <= (60 * 60 * 1000)) {
      this.log('⚠️ Token expires within 1 hour', 'warning');
      this.results.recommendations.push({
        priority: 'MEDIUM',
        action: 'Plan token refresh',
        reason: 'Token expires within an hour',
        urgency: 'within-1-hour'
      });
    } else {
      const hours = Math.floor(timeUntilExpiry / (60 * 60 * 1000));
      const minutes = Math.floor((timeUntilExpiry % (60 * 60 * 1000)) / (60 * 1000));
      this.log(`✅ Token valid for ${hours}h ${minutes}m`, 'success');
    }

    this.results.tokenExpired = false;
    return true;
  }

  /**
   * Comprehensive scope validation
   */
  validateScopes(data) {
    this.log('🔐 Validating OAuth scopes...', 'info');
    
    const scopeStr = data.easyflip_ebay_token_scope;
    if (!scopeStr) {
      this.log('❌ No scope information found', 'error');
      this.results.scopeValidation.missingScopes = Object.values(REQUIRED_SCOPES);
      this.results.scopeValidation.missingCriticalScopes = CRITICAL_SCOPES;
      return false;
    }

    const presentScopes = scopeStr.split(' ').filter(s => s.trim());
    this.log(`📋 Found ${presentScopes.length} scopes in token`, 'debug');
    
    // Check each required scope
    const scopeResults = {};
    const missingScopes = [];
    const missingCriticalScopes = [];

    Object.entries(REQUIRED_SCOPES).forEach(([name, scope]) => {
      const isPresent = presentScopes.includes(scope);
      const isCritical = CRITICAL_SCOPES.includes(scope);
      
      scopeResults[name] = {
        scope,
        present: isPresent,
        critical: isCritical
      };

      if (!isPresent) {
        missingScopes.push(scope);
        if (isCritical) {
          missingCriticalScopes.push(scope);
        }
      }

      const status = isPresent ? '✅' : '❌';
      const criticalMarker = isCritical ? ' [CRITICAL]' : '';
      this.log(`${status} ${name.toUpperCase()} scope${criticalMarker}`, isPresent ? 'success' : 'error');
    });

    // Check for sell.account scope specifically
    const hasAccountScope = presentScopes.includes(REQUIRED_SCOPES.account);
    if (!hasAccountScope) {
      this.log('🚨 CRITICAL: sell.account scope missing!', 'critical');
      this.results.recommendations.push({
        priority: 'CRITICAL',
        action: 'Re-authenticate with sell.account scope',
        reason: 'Business policy access requires sell.account scope',
        urgency: 'immediate',
        scope: REQUIRED_SCOPES.account
      });
    } else {
      this.log('✅ Critical sell.account scope present', 'success');
    }

    // Store validation results
    this.results.scopeValidation = {
      hasAllRequired: missingScopes.length === 0,
      hasAllCritical: missingCriticalScopes.length === 0,
      missingScopes,
      missingCriticalScopes,
      scopeBreakdown: scopeResults,
      totalScopes: presentScopes.length,
      presentScopes
    };

    // Generate recommendations for missing scopes
    if (missingScopes.length > 0) {
      this.results.recommendations.push({
        priority: missingCriticalScopes.length > 0 ? 'CRITICAL' : 'HIGH',
        action: 'Request additional OAuth scopes',
        reason: `Missing ${missingScopes.length} required scopes`,
        urgency: missingCriticalScopes.length > 0 ? 'immediate' : 'soon',
        missingScopes
      });
    }

    return missingCriticalScopes.length === 0;
  }

  /**
   * Perform additional validation checks
   */
  performAdditionalChecks(data) {
    this.log('🔧 Performing additional validation checks...', 'info');
    
    const checks = {
      userIdPresent: !!data.easyflip_ebay_user_id,
      authStateValid: data.easyflip_ebay_auth_state === 'authenticated',
      refreshTokenPresent: !!data.easyflip_ebay_refresh_token
    };

    // Check user ID
    if (!checks.userIdPresent) {
      this.log('⚠️ eBay user ID not found in localStorage', 'warning');
      this.results.recommendations.push({
        priority: 'MEDIUM',
        action: 'Verify user identification',
        reason: 'User ID missing from stored data',
        urgency: 'when-convenient'
      });
    }

    // Check auth state
    if (!checks.authStateValid) {
      this.log('⚠️ Authentication state is not "authenticated"', 'warning');
      this.results.recommendations.push({
        priority: 'HIGH',
        action: 'Check authentication flow',
        reason: 'Auth state indicates incomplete authentication',
        urgency: 'soon'
      });
    }

    // Check refresh token
    if (!checks.refreshTokenPresent) {
      this.log('⚠️ Refresh token not found', 'warning');
      this.results.recommendations.push({
        priority: 'MEDIUM',
        action: 'Ensure refresh token is stored',
        reason: 'Refresh token needed for automatic token renewal',
        urgency: 'when-convenient'
      });
    } else {
      this.log('✅ Refresh token present for automatic renewal', 'success');
    }

    this.results.details.additionalChecks = checks;
    
    return checks;
  }

  /**
   * Determine overall connection status
   */
  determineOverallStatus() {
    const {
      tokenPresent,
      tokenExpired,
      scopeValidation
    } = this.results;

    if (!tokenPresent) {
      this.results.overallStatus = 'NO_TOKEN';
      return;
    }

    if (tokenExpired) {
      this.results.overallStatus = 'TOKEN_EXPIRED';
      return;
    }

    if (!scopeValidation.hasAllCritical) {
      this.results.overallStatus = 'MISSING_CRITICAL_SCOPES';
      return;
    }

    if (!scopeValidation.hasAllRequired) {
      this.results.overallStatus = 'MISSING_SCOPES';
      return;
    }

    this.results.overallStatus = 'FULLY_CONNECTED';
    this.results.tokenValid = true;
  }

  /**
   * Generate comprehensive status report
   */
  generateStatusReport() {
    const duration = performance.now() - this.results.startTime;
    const status = this.results.overallStatus;
    
    console.log('\n' + '='.repeat(100));
    console.log('🔐 EBAY OAUTH CONNECTION VERIFICATION REPORT');
    console.log('='.repeat(100));
    console.log(`⏱️ Verification completed in ${Math.round(duration)}ms`);
    console.log(`📅 Report generated: ${this.results.timestamp}`);
    
    // Overall Status
    const statusMessages = {
      'FULLY_CONNECTED': '✅ FULLY CONNECTED - All systems operational',
      'MISSING_SCOPES': '⚠️ PARTIALLY CONNECTED - Missing non-critical scopes',
      'MISSING_CRITICAL_SCOPES': '❌ CRITICALLY IMPAIRED - Missing essential scopes',
      'TOKEN_EXPIRED': '❌ TOKEN EXPIRED - Re-authentication required',
      'NO_TOKEN': '❌ NOT CONNECTED - No valid token found',
      'UNKNOWN': '❓ UNKNOWN - Verification incomplete'
    };

    const statusIcon = {
      'FULLY_CONNECTED': '🟢',
      'MISSING_SCOPES': '🟡',
      'MISSING_CRITICAL_SCOPES': '🔴',
      'TOKEN_EXPIRED': '🔴',
      'NO_TOKEN': '🔴',
      'UNKNOWN': '⚪'
    }[status];

    console.log(`\n${statusIcon} OVERALL STATUS: ${statusMessages[status]}`);
    
    // Token Information
    console.log('\n📋 TOKEN INFORMATION:');
    console.log('-'.repeat(80));
    if (this.results.tokenPresent) {
      console.log('✅ Access Token: Present');
      console.log(`✅ Token Length: ${this.results.details.tokenInfo?.tokenLength || 'Unknown'} characters`);
      console.log(`${this.results.details.tokenInfo?.hasRefreshToken ? '✅' : '⚠️'} Refresh Token: ${this.results.details.tokenInfo?.hasRefreshToken ? 'Present' : 'Missing'}`);
      
      if (this.results.details.expiration) {
        const exp = this.results.details.expiration;
        if (exp.expired) {
          console.log('❌ Status: EXPIRED');
        } else if (exp.expiringWithin5Min) {
          console.log('⚠️ Status: Expires within 5 minutes');
        } else if (exp.expiringWithin1Hour) {
          console.log('⚠️ Status: Expires within 1 hour');
        } else {
          const hours = Math.floor(exp.timeUntilExpiry / (60 * 60 * 1000));
          console.log(`✅ Status: Valid for ${hours} hours`);
        }
        console.log(`📅 Expires: ${exp.expiresAt}`);
      }
    } else {
      console.log('❌ Access Token: Not found');
      console.log('❌ OAuth authentication has not been completed');
    }

    // Scope Analysis
    console.log('\n🔐 SCOPE ANALYSIS:');
    console.log('-'.repeat(80));
    
    if (this.results.scopeValidation.scopeBreakdown) {
      Object.entries(this.results.scopeValidation.scopeBreakdown).forEach(([name, info]) => {
        const status = info.present ? '✅' : '❌';
        const critical = info.critical ? ' [CRITICAL]' : '';
        console.log(`${status} ${name.toUpperCase()}${critical}`);
        if (this.options.verbose) {
          console.log(`    ${info.scope}`);
        }
      });
      
      console.log(`\n📊 Scope Summary:`);
      console.log(`   Total Scopes: ${this.results.scopeValidation.totalScopes || 0}`);
      console.log(`   Missing Required: ${this.results.scopeValidation.missingScopes?.length || 0}`);
      console.log(`   Missing Critical: ${this.results.scopeValidation.missingCriticalScopes?.length || 0}`);
      
      // Highlight critical sell.account scope
      const hasAccountScope = this.results.scopeValidation.scopeBreakdown.account?.present;
      if (hasAccountScope) {
        console.log('\n✅ CRITICAL SCOPE CHECK: sell.account scope is present');
        console.log('   ➤ Business policy operations: ENABLED');
        console.log('   ➤ Account management features: ENABLED');
      } else {
        console.log('\n🚨 CRITICAL SCOPE CHECK: sell.account scope is MISSING');
        console.log('   ➤ Business policy operations: DISABLED');
        console.log('   ➤ Account management features: DISABLED');
        console.log('   ➤ IMMEDIATE ACTION REQUIRED');
      }
    } else {
      console.log('❌ No scope information available');
    }

    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 ACTIONABLE RECOMMENDATIONS:');
      console.log('-'.repeat(80));
      
      this.results.recommendations
        .sort((a, b) => {
          const priority = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          return priority[a.priority] - priority[b.priority];
        })
        .forEach((rec, index) => {
          const priorityIcon = {
            'CRITICAL': '🚨',
            'HIGH': '⚠️',
            'MEDIUM': '🔶',
            'LOW': '💡'
          }[rec.priority];
          
          console.log(`${index + 1}. ${priorityIcon} ${rec.priority}: ${rec.action}`);
          console.log(`   Reason: ${rec.reason}`);
          console.log(`   Urgency: ${rec.urgency}`);
          if (rec.scope) {
            console.log(`   Required Scope: ${rec.scope}`);
          }
          if (rec.missingScopes) {
            console.log(`   Missing Scopes: ${rec.missingScopes.length} total`);
          }
          console.log('');
        });
    }

    // Technical Details (verbose mode)
    if (this.options.verbose && this.results.details) {
      console.log('\n🔧 TECHNICAL DETAILS:');
      console.log('-'.repeat(80));
      console.log(JSON.stringify(this.results.details, null, 2));
    }

    // Next Steps
    console.log('\n📋 NEXT STEPS:');
    console.log('-'.repeat(80));
    
    switch (status) {
      case 'FULLY_CONNECTED':
        console.log('1. ✅ OAuth connection verified - system ready for use');
        console.log('2. 📊 Monitor token expiration and refresh automatically');
        console.log('3. 🔄 Set up periodic scope validation checks');
        break;
        
      case 'MISSING_SCOPES':
        console.log('1. ⚠️ Basic functionality available with current scopes');
        console.log('2. 🔄 Request additional scopes when convenient');
        console.log('3. 📊 Monitor for scope-related API errors');
        break;
        
      case 'MISSING_CRITICAL_SCOPES':
        console.log('1. 🚨 URGENT: Re-authenticate with all required scopes');
        console.log('2. 🛑 Core functionality may be impaired');
        console.log('3. 📞 Check OAuth configuration and scope settings');
        break;
        
      case 'TOKEN_EXPIRED':
        console.log('1. 🔄 Use refresh token to get new access token');
        console.log('2. 🚨 If refresh fails, re-authenticate user');
        console.log('3. ⏰ Implement automatic token refresh logic');
        break;
        
      case 'NO_TOKEN':
        console.log('1. 🔗 Direct user to eBay OAuth authentication');
        console.log('2. 🔧 Verify OAuth configuration is correct');
        console.log('3. 📋 Ensure all required scopes are requested');
        break;
        
      default:
        console.log('1. 🔍 Review error messages above');
        console.log('2. 🔧 Check system configuration');
        console.log('3. 📞 Contact support if issues persist');
    }

    console.log('\n' + '='.repeat(100));
    console.log(`🏁 VERIFICATION COMPLETE: ${status}`);
    console.log('='.repeat(100) + '\n');

    return {
      status: this.results.overallStatus,
      isFullyConnected: status === 'FULLY_CONNECTED',
      hasValidToken: this.results.tokenValid,
      hasCriticalScopes: this.results.scopeValidation.hasAllCritical,
      hasAccountScope: this.results.scopeValidation.scopeBreakdown?.account?.present || false,
      recommendationsCount: this.results.recommendations.length,
      criticalIssues: this.results.recommendations.filter(r => r.priority === 'CRITICAL').length
    };
  }

  /**
   * Main verification process
   */
  async verify() {
    this.log('🚀 Starting eBay OAuth connection verification...', 'info');
    
    try {
      // Get localStorage data
      const data = this.getLocalStorageData();
      this.log(`📊 Retrieved ${Object.keys(data).length} localStorage items`, 'debug');
      
      // Validate token presence
      if (!this.validateTokenPresence(data)) {
        this.determineOverallStatus();
        return this.generateStatusReport();
      }
      
      // Validate token expiration
      this.validateTokenExpiration(data);
      
      // Validate scopes
      this.validateScopes(data);
      
      // Additional checks
      this.performAdditionalChecks(data);
      
      // Determine final status
      this.determineOverallStatus();
      
      // Generate report
      return this.generateStatusReport();
      
    } catch (error) {
      this.log(`💥 Verification failed: ${error.message}`, 'error');
      console.error('Full error:', error);
      
      this.results.overallStatus = 'ERROR';
      this.results.details.error = error.message;
      
      return {
        status: 'ERROR',
        error: error.message,
        isFullyConnected: false,
        hasValidToken: false
      };
    }
  }
}

/**
 * CLI Interface
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    verbose: args.includes('--verbose') || args.includes('-v'),
    simulate: args.includes('--simulate') || args.includes('-s'),
    test: args.includes('--test') || args.includes('-t'),
    help: args.includes('--help') || args.includes('-h')
  };
}

function showHelp() {
  console.log(`
eBay OAuth Connection Verification Script

Usage:
  node tests/verify-oauth-connection.js [options]

Options:
  --verbose, -v    Show detailed logging and technical details
  --simulate, -s   Use simulated localStorage data for testing
  --test, -t       Run in test mode with additional validation
  --help, -h       Show this help message

Examples:
  node tests/verify-oauth-connection.js
  node tests/verify-oauth-connection.js --verbose
  node tests/verify-oauth-connection.js --simulate --verbose

Exit Codes:
  0    Fully connected (all critical scopes present, token valid)
  1    Partially connected (missing non-critical scopes)
  2    Critical issues (missing critical scopes or expired token)
  3    Not connected (no valid token)
  4    Error during verification
`);
}

/**
 * Main execution
 */
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    process.exit(0);
  }
  
  console.log('🔐 eBay OAuth Connection Verification');
  console.log('=====================================\n');
  
  const verifier = new OAuthConnectionVerifier({
    verbose: options.verbose,
    simulateLocalStorage: options.simulate,
    testMode: options.test
  });
  
  try {
    const result = await verifier.verify();
    
    // Exit with appropriate code
    const exitCodes = {
      'FULLY_CONNECTED': 0,
      'MISSING_SCOPES': 1,
      'MISSING_CRITICAL_SCOPES': 2,
      'TOKEN_EXPIRED': 2,
      'NO_TOKEN': 3,
      'ERROR': 4,
      'UNKNOWN': 4
    };
    
    const exitCode = exitCodes[result.status] || 4;
    process.exit(exitCode);
    
  } catch (error) {
    console.error('💥 Verification script failed:', error.message);
    process.exit(4);
  }
}

// Run if called directly (handle both file:// and regular path formats)
const scriptPath = process.argv[1].replace(/\\/g, '/');
const moduleUrl = import.meta.url.replace('file:///', '').replace(/\//g, '/');

if (moduleUrl.includes(scriptPath.replace(/\\/g, '/')) || 
    import.meta.url === `file://${process.argv[1]}` ||
    process.argv[1].endsWith('verify-oauth-connection.js')) {
  main();
}

export default OAuthConnectionVerifier;