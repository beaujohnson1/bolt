# eBay OAuth Callback Manual Testing Guide

## Overview
This guide provides manual testing procedures for the enhanced eBay OAuth callback function.

## Test Scenarios

### 1. Successful OAuth Flow
**URL Pattern**: `/.netlify/functions/auth-ebay-callback?code=VALID_CODE&state=VALID_STATE`

**Expected Behavior**:
- Status Code: 200
- Content-Type: text/html
- Response body contains:
  - "eBay Connected Successfully!" 
  - Progress bar animation
  - JavaScript token storage logic
  - Automatic redirect to app

**Validation**:
- Check browser console for authentication logs
- Verify localStorage contains `ebay_oauth_tokens` and `ebay_manual_token`
- Confirm redirect happens within 3 seconds

### 2. OAuth Error from eBay
**URL Pattern**: `/.netlify/functions/auth-ebay-callback?error=access_denied&error_description=User%20denied%20request`

**Expected Behavior**:
- Status Code: 400
- Enhanced error page with:
  - Error icon and title
  - Clear error message
  - Detailed error information
  - Action buttons (Return to EasyFlip, Try Again)

### 3. Missing Authorization Code
**URL Pattern**: `/.netlify/functions/auth-ebay-callback?state=VALID_STATE`

**Expected Behavior**:
- Status Code: 400
- Error page explaining missing authorization code
- Debug information showing received parameters

### 4. CORS Preflight (OPTIONS)
**Request**: `OPTIONS /.netlify/functions/auth-ebay-callback`

**Expected Behavior**:
- Status Code: 200
- CORS headers present:
  - `Access-Control-Allow-Origin`
  - `Access-Control-Allow-Methods`
  - `Access-Control-Allow-Headers`

### 5. Token Exchange Failure
**Scenario**: Valid code but eBay token service returns error

**Expected Behavior**:
- Status Code: 400 or 500 (depending on error type)
- Detailed error page with:
  - Token exchange failure message
  - Debug information
  - Request ID for tracking

## Security Features to Verify

### CORS Headers
- Production: Origin restricted to easyflip.ai
- Development: Allows all origins (*)
- Includes security headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`

### Cookie Storage (if enabled)
Set environment variable `EBAY_USE_COOKIES=true`

**Expected Behavior**:
- `Set-Cookie` headers in response
- Cookies marked as:
  - `HttpOnly`
  - `SameSite=Strict`
  - `Secure` (if HTTPS)
  - Proper expiration time

### State Parameter Validation
**Purpose**: CSRF protection
- Warning logged if state parameter missing
- State parameter passed through to token exchange

## Error Handling Verification

### Network Timeout
**Scenario**: Token exchange request times out (30 seconds)
- Graceful timeout handling
- User-friendly error message

### Invalid Response Format
**Scenario**: Token service returns invalid JSON
- Parse error handled gracefully
- Detailed error information provided

### Missing Access Token
**Scenario**: Token response missing required fields
- Validation error reported
- Debug information included

## Logging and Debugging

### Console Output Patterns
Look for these log patterns:
- `🔄 [EBAY-CALLBACK] OAuth callback received`
- `✅ [EBAY-CALLBACK] Valid authorization code received`
- `📡 [EBAY-CALLBACK] Making token exchange request`
- `✅ [EBAY-CALLBACK] Token exchange successful`
- `🍪 [EBAY-CALLBACK] Setting secure cookies` (if cookies enabled)

### Error Log Patterns
- `❌ [EBAY-CALLBACK] OAuth error from eBay`
- `❌ [EBAY-CALLBACK] Missing authorization code`
- `❌ [EBAY-CALLBACK] Token exchange failed`
- `❌ [EBAY-CALLBACK] Network error during token exchange`

## Performance Testing

### Response Time
- Successful callback: < 2 seconds
- Error scenarios: < 1 second
- Network timeout: Exactly 30 seconds

### Memory Usage
- No memory leaks in token processing
- Proper cleanup of timeout handlers

## Integration Testing

### Frontend Integration
1. Test storage events firing correctly
2. Verify `ebayAuthChanged` custom event
3. Confirm localStorage updates
4. Test redirect with success parameters

### Cross-tab Communication
1. Open multiple tabs
2. Complete OAuth in one tab
3. Verify other tabs detect authentication change

## Environment-specific Testing

### Development Environment
- Uses sandbox eBay credentials
- Allows localhost redirects
- Relaxed CORS policy

### Production Environment  
- Uses production eBay credentials
- Restricted to easyflip.ai domain
- Strict CORS policy
- Secure cookie settings (if enabled)

## Troubleshooting Common Issues

### Issue: "Token exchange failed"
- Check eBay service status
- Verify credentials in config
- Check network connectivity
- Review request/response logs

### Issue: "Invalid OAuth state"
- Check CSRF state validation
- Verify OAuth initiation flow
- Check for session/cookie issues

### Issue: Redirect not working
- Check localStorage permissions
- Verify JavaScript execution
- Check for browser blocking redirects
- Review console for errors

## Test Data

### Valid Test Code Format
- Length: ~50-100 characters
- Format: Alphanumeric with special characters
- Example pattern: `v^1.1#i^1#p^3#I^3#r^0#f^0#c^0#h#f^0#p^3#I^3#r^0#c^0#h#f^0#p^3`

### Valid State Format
- Length: 32 characters
- Format: Alphanumeric
- Generated by OAuth initiation

## Success Criteria

A successful callback implementation should:
1. ✅ Handle all error scenarios gracefully
2. ✅ Provide clear user feedback
3. ✅ Include comprehensive logging
4. ✅ Implement proper security headers
5. ✅ Support both localStorage and cookie storage
6. ✅ Handle network timeouts and failures
7. ✅ Validate all input parameters
8. ✅ Follow OAuth 2.0 best practices
9. ✅ Provide debugging information
10. ✅ Enable monitoring and troubleshooting

## Monitoring

### Key Metrics to Track
- Success rate of token exchanges
- Average response time
- Error frequency by type
- User abandonment rate

### Log Analysis
- Search for error patterns
- Track request IDs through the flow
- Monitor for unusual activity patterns

This enhanced callback function provides production-ready OAuth handling with comprehensive error management, security features, and debugging capabilities.