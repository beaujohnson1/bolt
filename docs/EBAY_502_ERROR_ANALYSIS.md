# eBay Proxy 502 Error Analysis Report

## Issue Summary
The eBay proxy function is returning 502 errors when trying to fetch business policies (fulfillment, payment, and return policies). This is blocking listing creation functionality.

## Error Details
- **Endpoints Failing**: 
  - `GET /sell/account/v1/fulfillment_policy`
  - `GET /sell/account/v1/payment_policy`
  - `GET /sell/account/v1/return_policy`
- **Error Type**: 502 Bad Gateway
- **Impact**: Complete blocking of listing creation process

## Root Cause Analysis

### 1. OAuth Scope Issues (CRITICAL)
The primary issue appears to be missing or insufficient OAuth scopes for the Account API:

```javascript
// Required scope for Account API
'https://api.ebay.com/oauth/api_scope/sell.account'
```

**Evidence**:
- All business policy APIs require the `sell.account` scope
- Current OAuth configuration includes this scope, but tokens may not have it
- 502 errors typically indicate the proxy receives an invalid response from eBay API

### 2. Token Validation Problems
The stored OAuth tokens may be:
- **Expired**: Access tokens expire after a certain period
- **Invalid Scope**: Tokens issued without proper Account API permissions
- **Wrong Environment**: Sandbox tokens being used against production API

### 3. API Endpoint Issues
```javascript
// Current implementation in BusinessPolicyService.ts
const response = await this.ebayApiService._callProxy(
  `${this.ebayApiService.baseUrl}/sell/account/v1/fulfillment_policy`,
  'GET',
  {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
);
```

**Potential Issues**:
- Missing required headers for Account API
- Incorrect marketplace ID
- Wrong API version

### 4. Proxy Function Implementation
The proxy function logs indicate it's working correctly for basic requests, but eBay Account API may have specific requirements:

```javascript
// Missing headers that might be required
'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
'Accept': 'application/json'
```

## Immediate Solutions

### 1. Check OAuth Token Scopes
```javascript
// Verify token includes sell.account scope
const tokenScope = localStorage.getItem('easyflip_ebay_token_scope');
console.log('Token scopes:', tokenScope);

// Should include: https://api.ebay.com/oauth/api_scope/sell.account
```

### 2. Add Required Headers
```javascript
// Enhanced headers for Account API
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
};
```

### 3. Implement Proper Error Handling
```javascript
// Better error handling in proxy
if (!response.ok) {
  const errorText = await response.text();
  console.error('eBay API Error:', {
    status: response.status,
    statusText: response.statusText,
    body: errorText,
    url: url
  });
  
  // Specific handling for 502 errors
  if (response.status === 502) {
    throw new Error('eBay API returned 502 - possible authentication or scope issue');
  }
}
```

### 4. Token Refresh Logic
```javascript
// Add automatic token refresh on auth failures
if (response.status === 401 || response.status === 403) {
  // Try to refresh token
  const newToken = await this.refreshAccessToken();
  if (newToken) {
    // Retry the request with new token
    return this._callProxy(url, method, { ...headers, 'Authorization': `Bearer ${newToken}` }, body, params);
  }
}
```

## Testing Steps

### 1. Token Validation
1. Open browser console on application
2. Check localStorage for OAuth tokens:
   ```javascript
   console.log('Access Token:', localStorage.getItem('easyflip_ebay_access_token'));
   console.log('Token Scope:', localStorage.getItem('easyflip_ebay_token_scope'));
   console.log('Expires At:', localStorage.getItem('easyflip_ebay_token_expires_at'));
   ```

### 2. Direct API Testing
Use the debug page created at `/tests/debug-502-errors.html` to:
- Test proxy function directly
- Test with real OAuth tokens
- Test each business policy endpoint individually

### 3. Account API Direct Test
```bash
# Test Account API directly with curl
curl -X GET "https://api.ebay.com/sell/account/v1/fulfillment_policy" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-EBAY-C-MARKETPLACE-ID: EBAY_US"
```

## Recommended Fixes

### Priority 1: Scope Verification
1. Re-authenticate with correct scopes
2. Ensure `sell.account` scope is included in OAuth flow
3. Verify tokens in localStorage include this scope

### Priority 2: Enhanced Error Handling
1. Add specific Account API error handling
2. Implement token refresh logic
3. Add better logging for debugging

### Priority 3: Header Improvements
1. Add missing eBay-specific headers
2. Ensure proper marketplace ID
3. Add request ID for tracking

### Priority 4: Fallback Strategy
1. Implement mock data fallback for development
2. Add graceful degradation when Account API fails
3. Cache policy data to reduce API calls

## Files Requiring Updates

1. **src/services/BusinessPolicyService.ts** - Add better error handling
2. **src/services/ebayApi.ts** - Enhance _callProxy method
3. **netlify/functions/ebay-proxy.js** - Add Account API specific handling
4. **OAuth configuration** - Ensure correct scopes

## Next Steps

1. ✅ Create debug page for testing
2. 🔄 Test current OAuth token scopes
3. 🔄 Implement enhanced error handling
4. 🔄 Add required headers for Account API
5. 🔄 Test with fresh OAuth tokens
6. 🔄 Add fallback mechanisms

This analysis should help identify and resolve the 502 errors blocking business policy retrieval.