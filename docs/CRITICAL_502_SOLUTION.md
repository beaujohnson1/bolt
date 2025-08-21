# 🚨 CRITICAL: eBay 502 Error Solution

## Problem Summary
The eBay proxy is returning **502 Bad Gateway** errors when fetching business policies, completely blocking listing creation. This is the primary issue preventing the app from functioning.

## Root Cause Analysis

### 1. Missing OAuth Scope (PRIMARY ISSUE)
The eBay Account API requires the `sell.account` scope, but current tokens may not have it:

```javascript
// Required scope for business policies
'https://api.ebay.com/oauth/api_scope/sell.account'
```

### 2. Authentication Issues
- Tokens may be expired or invalid
- Wrong environment (sandbox vs production)
- Missing required headers

## Immediate Solution Steps

### Step 1: Verify OAuth Scopes
1. Open browser console
2. Navigate to `/tests/test-oauth-scopes.html`
3. Click "Validate OAuth Scopes"
4. Check if `sell.account` scope is present

### Step 2: Re-authenticate if Necessary
If scopes are missing:
1. Clear current tokens
2. Re-authenticate with proper scopes
3. Ensure OAuth flow includes all required scopes

### Step 3: Test Account API Access
1. Use `/tests/debug-502-errors.html`
2. Test each business policy endpoint
3. Check for specific error messages

## Technical Fixes Applied

### 1. Enhanced Error Handling ✅
```javascript
// Added to netlify/functions/ebay-proxy.js
if (!response.ok && url.includes('/sell/account/')) {
  // Enhanced Account API error logging
  // Parse eBay error responses
  // Check for auth/scope issues
}
```

### 2. Required Headers Added ✅
```javascript
// Added to BusinessPolicyService.ts
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
};
```

### 3. Scope Validation Utility ✅
Created `src/utils/oauthScopeValidator.ts` for:
- Token validation
- Scope checking
- Diagnostics

### 4. Debug Tools Created ✅
- `/tests/debug-502-errors.html` - Proxy testing
- `/tests/test-oauth-scopes.html` - Token validation

## Expected OAuth Configuration

### Required Scopes
```javascript
const REQUIRED_SCOPES = [
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.account',     // CRITICAL for business policies
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly'
];
```

### Storage Keys
```javascript
localStorage.getItem('easyflip_ebay_access_token');
localStorage.getItem('easyflip_ebay_refresh_token');
localStorage.getItem('easyflip_ebay_token_expires_at');
localStorage.getItem('easyflip_ebay_token_scope');      // Must include sell.account
```

## Testing the Fix

### 1. Quick Validation
```javascript
// In browser console
const scope = localStorage.getItem('easyflip_ebay_token_scope');
console.log('Has Account Scope:', scope?.includes('sell.account'));
```

### 2. Direct API Test
```bash
# Test Account API directly
curl -X GET "https://api.ebay.com/sell/account/v1/fulfillment_policy" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-EBAY-C-MARKETPLACE-ID: EBAY_US"
```

### 3. Use Debug Pages
- Navigate to `/tests/test-oauth-scopes.html`
- Click "Test Account API Access"
- Check for 502 errors

## Expected Results After Fix

### Success Indicators
- ✅ OAuth scope validation passes
- ✅ Account API returns 200 status
- ✅ Business policies load successfully
- ✅ Listing creation works

### Error Indicators (Need Re-auth)
- ❌ Missing `sell.account` scope
- ❌ 401/403 authentication errors
- ❌ 502 errors persist

## Fallback Strategy

If Account API continues to fail:
1. Use mock business policies (already implemented)
2. Create listings with default policies
3. Show user-friendly error messages
4. Provide manual policy configuration

## Next Steps

1. **Immediate**: Test current OAuth tokens
2. **If Missing Scope**: Re-authenticate with correct scopes
3. **If Still Failing**: Check eBay Developer Console for app configuration
4. **Final Resort**: Contact eBay API support

## Files Modified

- ✅ `src/services/BusinessPolicyService.ts` - Enhanced headers & error handling
- ✅ `netlify/functions/ebay-proxy.js` - Account API specific error handling
- ✅ `src/utils/oauthScopeValidator.ts` - New validation utility
- ✅ `tests/debug-502-errors.html` - Debug tool
- ✅ `tests/test-oauth-scopes.html` - Scope validator

This solution addresses the root cause of 502 errors and provides tools to diagnose and fix the issue.