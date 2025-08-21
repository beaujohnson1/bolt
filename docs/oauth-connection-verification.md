# eBay OAuth Connection Verification Script

## Overview

The `verify-oauth-connection.js` script provides comprehensive validation of eBay OAuth tokens with a specific focus on the critical `sell.account` scope. This script is designed to quickly diagnose OAuth connection issues and provide actionable recommendations.

## Features

### 🔐 Token Validation
- **Presence Check**: Verifies all required token data exists in localStorage
- **Format Validation**: Basic validation of eBay token format
- **Expiration Check**: Detailed expiration status with time-until-expiry calculations
- **Refresh Token**: Validates presence of refresh token for automatic renewal

### 🎯 Scope Analysis
- **Critical Scope Focus**: Specifically validates the essential `sell.account` scope
- **Comprehensive Coverage**: Checks all required eBay API scopes:
  - `sell.account` (Critical for business policies)
  - `sell.inventory` (Critical for listing management)
  - `sell.fulfillment` (For order management)
  - `commerce.identity.readonly` (Critical for user identification)
  - `sell.marketing` (For promotional features)
  - `sell.analytics.readonly` (For performance insights)

### 📊 Status Reporting
- **Color-coded Output**: Clear visual indicators for different status levels
- **Actionable Recommendations**: Specific next steps based on findings
- **Priority-based Issues**: Critical, High, Medium, and Low priority recommendations
- **Production Readiness**: Clear assessment of deployment readiness

## Usage

### Basic Usage
```bash
# Run standard verification
npm run test:oauth:connection
# or
node tests/verify-oauth-connection.js
```

### Advanced Usage
```bash
# Verbose output with technical details
npm run test:oauth:connection:verbose

# Simulate localStorage data for testing
npm run test:oauth:connection:simulate

# Manual execution with options
node tests/verify-oauth-connection.js --verbose --simulate
```

### Command Line Options
- `--verbose, -v`: Show detailed logging and technical information
- `--simulate, -s`: Use simulated localStorage data for testing
- `--test, -t`: Run in test mode with additional validations
- `--help, -h`: Display help information

## Exit Codes

The script returns different exit codes based on the OAuth connection status:

| Exit Code | Status | Description |
|-----------|--------|-------------|
| 0 | FULLY_CONNECTED | All critical scopes present, token valid |
| 1 | MISSING_SCOPES | Missing non-critical scopes only |
| 2 | CRITICAL_ISSUES | Missing critical scopes or expired token |
| 3 | NOT_CONNECTED | No valid token found |
| 4 | ERROR | Error during verification process |

## Status Types

### ✅ FULLY_CONNECTED
- All required tokens present
- Token not expired
- All critical scopes available
- System ready for production use

### ⚠️ MISSING_SCOPES
- Valid token with basic functionality
- Missing some non-critical scopes
- Core features available, some advanced features may be limited

### 🔴 MISSING_CRITICAL_SCOPES
- Valid token but missing essential scopes
- Core functionality impaired
- Immediate re-authentication recommended

### 🔴 TOKEN_EXPIRED
- Token has expired
- Refresh token should be used for renewal
- If refresh fails, re-authentication required

### 🔴 NO_TOKEN
- No OAuth token found
- User needs to complete OAuth flow
- Check OAuth configuration

## Output Examples

### Successful Verification
```
🔐 EBAY OAUTH CONNECTION VERIFICATION REPORT
================================================================
⏱️ Verification completed in 45ms
📅 Report generated: 2025-01-21T10:30:45.123Z

🟢 OVERALL STATUS: ✅ FULLY CONNECTED - All systems operational

📋 TOKEN INFORMATION:
✅ Access Token: Present
✅ Token Length: 1247 characters
✅ Refresh Token: Present
✅ Status: Valid for 1 hours
📅 Expires: 2025-01-21T11:30:45.123Z

🔐 SCOPE ANALYSIS:
✅ ACCOUNT [CRITICAL]
✅ INVENTORY [CRITICAL]
✅ FULFILLMENT
✅ IDENTITY [CRITICAL]
✅ MARKETING
✅ ANALYTICS

✅ CRITICAL SCOPE CHECK: sell.account scope is present
   ➤ Business policy operations: ENABLED
   ➤ Account management features: ENABLED
```

### Critical Issues Found
```
🔐 EBAY OAUTH CONNECTION VERIFICATION REPORT
================================================================

🔴 OVERALL STATUS: ❌ CRITICALLY IMPAIRED - Missing essential scopes

🔐 SCOPE ANALYSIS:
❌ ACCOUNT [CRITICAL]
✅ INVENTORY [CRITICAL]
✅ IDENTITY [CRITICAL]

🚨 CRITICAL SCOPE CHECK: sell.account scope is MISSING
   ➤ Business policy operations: DISABLED
   ➤ Account management features: DISABLED
   ➤ IMMEDIATE ACTION REQUIRED

💡 ACTIONABLE RECOMMENDATIONS:
1. 🚨 CRITICAL: Re-authenticate with sell.account scope
   Reason: Business policy access requires sell.account scope
   Urgency: immediate
   Required Scope: https://api.ebay.com/oauth/api_scope/sell.account
```

## Integration

### CI/CD Pipeline
```yaml
# GitHub Actions example
- name: Verify OAuth Connection
  run: npm run test:oauth:connection
  continue-on-error: false
```

### Monitoring Scripts
```bash
#!/bin/bash
# Production monitoring script
npm run test:oauth:connection
if [ $? -eq 0 ]; then
    echo "OAuth connection healthy"
else
    echo "OAuth connection issues detected"
    # Send alert to monitoring system
fi
```

### Automated Testing
```javascript
// Jest test example
import OAuthConnectionVerifier from '../tests/verify-oauth-connection.js';

test('OAuth connection should be fully functional', async () => {
  const verifier = new OAuthConnectionVerifier({ testMode: true });
  const result = await verifier.verify();
  
  expect(result.isFullyConnected).toBe(true);
  expect(result.hasAccountScope).toBe(true);
  expect(result.criticalIssues).toBe(0);
});
```

## Technical Details

### localStorage Keys Checked
- `easyflip_ebay_access_token`: The OAuth access token
- `easyflip_ebay_refresh_token`: Token for automatic renewal
- `easyflip_ebay_token_expires_at`: Expiration timestamp
- `easyflip_ebay_token_scope`: Space-separated list of granted scopes
- `easyflip_ebay_auth_state`: Authentication state indicator
- `easyflip_ebay_user_id`: eBay user identifier

### Scope Validation Logic
1. Extract scopes from stored token data
2. Compare against required scope list
3. Identify missing critical vs. non-critical scopes
4. Generate specific recommendations for each missing scope
5. Special validation for `sell.account` scope

### Error Handling
- Graceful handling of missing localStorage
- Safe parsing of token data
- Comprehensive error reporting
- Fallback modes for different environments

## Troubleshooting

### Common Issues

#### "localStorage not available"
- **Cause**: Running in Node.js environment without browser context
- **Solution**: Use `--simulate` flag for testing, or run in browser context

#### "Missing required token data"
- **Cause**: User hasn't completed OAuth flow or data was cleared
- **Solution**: Direct user to OAuth authentication

#### "Token format may be invalid"
- **Cause**: Token doesn't match expected eBay format
- **Solution**: Re-authenticate to get fresh token

#### "sell.account scope missing"
- **Cause**: OAuth flow didn't request this critical scope
- **Solution**: Update OAuth configuration to include all required scopes

### Debug Mode
Use verbose mode to get detailed technical information:
```bash
node tests/verify-oauth-connection.js --verbose
```

This will show:
- Raw localStorage data
- Detailed scope analysis
- Token format validation
- Technical implementation details

## Security Considerations

- Script only reads token metadata, never logs actual token values
- Simulated data mode uses fake tokens for testing
- No network requests made during verification
- All validation happens locally

## Contributing

When modifying the verification script:

1. **Maintain backward compatibility** with existing OAuth implementations
2. **Add new scope requirements** to the `REQUIRED_SCOPES` constant
3. **Update critical scope list** if new essential scopes are identified
4. **Test thoroughly** with both real and simulated data
5. **Update documentation** for any new features or options

## Related Files

- `src/utils/oauthScopeValidator.ts` - TypeScript scope validation utilities
- `src/services/EBayTokenService.ts` - Secure token management service
- `src/config/oauth-config.ts` - OAuth configuration management
- `tests/run-oauth-verification.js` - Comprehensive OAuth test runner