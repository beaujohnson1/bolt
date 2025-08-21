# eBay Proxy Enhancement Guide

## Overview

The eBay proxy has been significantly enhanced to better handle 502/503 errors and provide comprehensive diagnostics. The enhancements focus on distinguishing between scope-related errors and other types of failures.

## Enhanced Features

### 1. Improved Error Handling (`ebay-proxy.js`)

#### 502 Bad Gateway Detection
- **Enhanced 502 Analysis**: Automatically detects if 502 errors are scope-related
- **Scope Analysis**: Analyzes required scopes for each endpoint
- **Detailed Error Messages**: Provides specific troubleshooting steps
- **Error Classification**: Distinguishes between temporary API issues and scope problems

#### 503 Service Unavailable Handling
- **Service Status Detection**: Identifies eBay API maintenance or overload
- **Retry Guidance**: Provides appropriate retry intervals
- **Rate Limit Detection**: Identifies quota exceeded scenarios

#### Automatic Scope Validation
- **Pre-request Validation**: Validates scopes before making API calls
- **502 Prevention**: Prevents likely 502 errors by checking scopes first
- **Fast Validation**: Uses HEAD requests to minimize data transfer

### 2. Diagnostic Endpoint (`ebay-proxy-diagnostic.js`)

#### Comprehensive Token Testing
- **Token Format Validation**: Checks OAuth 2.0 token structure
- **API Connectivity Test**: Verifies eBay API accessibility
- **Scope Validation**: Tests specific endpoint access
- **Account API Testing**: Validates sell.account scope specifically

#### Detailed Recommendations
- **Priority-based Guidance**: Critical issues first
- **Specific Solutions**: Actionable troubleshooting steps
- **Scope Requirements**: Lists exact scopes needed

### 3. Scope Validator (`ebay-scope-validator.js`)

#### Individual Scope Testing
- **Per-scope Validation**: Tests each required scope individually
- **Test Endpoints**: Uses minimal API calls for validation
- **Error Classification**: Identifies scope vs token issues

## Usage Examples

### Basic Proxy Usage
```javascript
// Enhanced error responses now include detailed diagnostics
const response = await fetch('/api/ebay-proxy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://api.ebay.com/sell/account/v1/policies',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer v^1.1#...',
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
    }
  })
});

// Enhanced error response for 502 errors
if (response.status === 502) {
  const error = await response.json();
  console.log('Error type:', error.details.errorAnalysis);
  console.log('Required scopes:', error.details.requiredScopes);
  console.log('Likely scope issue:', error.details.likelyScope);
}
```

### Diagnostic Endpoint Usage
```javascript
// Get comprehensive token diagnostics
const diagnostic = await fetch('/api/ebay-proxy-diagnostic', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: 'v^1.1#...',
    endpoint: 'https://api.ebay.com/sell/account/v1/policies'
  })
});

const result = await diagnostic.json();
console.log('Overall status:', result.overall_status);
console.log('Recommendations:', result.recommendations);
```

### Scope Validation Usage
```javascript
// Validate specific scopes
const validation = await fetch('/api/ebay-scope-validator', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: 'v^1.1#...',
    endpoint: 'https://api.ebay.com/sell/account/v1/policies'
  })
});

const result = await validation.json();
console.log('Valid scopes:', result.overallValid);
console.log('Scope tests:', result.scopeTests);
```

## Error Response Structure

### Enhanced 502 Error Response
```json
{
  "error": "eBay API Gateway Error",
  "message": "The eBay API returned a 502 Bad Gateway error",
  "details": {
    "status": 502,
    "endpoint": "[EBAY_API]/sell/account/v1/policies",
    "timestamp": "2025-01-21T10:30:00.000Z",
    "errorAnalysis": {
      "likelyScope": true,
      "patterns": ["INSUFFICIENT_SCOPE", "LIKELY_SCOPE_502"]
    },
    "scopeAnalysis": {
      "requiredScopes": ["sell.account"],
      "missingScopes": ["sell.account"]
    },
    "possibleCauses": [
      "🔑 Missing OAuth scope (most likely)",
      "Invalid or expired OAuth token",
      "Rate limiting exceeded"
    ],
    "troubleshooting": [
      "Re-authorize with required scopes: sell.account",
      "Verify OAuth token is valid and not expired",
      "Use the /ebay-proxy-diagnostic endpoint for full analysis"
    ]
  },
  "retryable": false
}
```

### Diagnostic Response Structure
```json
{
  "timestamp": "2025-01-21T10:30:00.000Z",
  "token": {
    "present": true,
    "length": 1024,
    "format": "valid"
  },
  "tests": [
    {
      "name": "Token Format Validation",
      "passed": true,
      "details": {
        "format": "Valid eBay OAuth 2.0 token format"
      }
    },
    {
      "name": "Account API Access",
      "passed": false,
      "details": {
        "has502Error": true
      },
      "recommendations": [
        "502 errors detected - likely missing sell.account scope"
      ]
    }
  ],
  "overall_status": "critical",
  "recommendations": [
    "🔴 CRITICAL: 502 errors detected - likely missing sell.account scope",
    "📋 ACTION: Re-authorize with proper scopes: sell.account, sell.inventory"
  ]
}
```

## Key Improvements

### 1. Clear Error Classification
- **Scope Issues**: Clearly identified with specific recommendations
- **Temporary Issues**: Distinguished from permanent problems
- **Token Problems**: Separated from scope problems

### 2. Proactive Error Prevention
- **Automatic Validation**: Checks scopes before API calls
- **Fast Failure**: Returns 403 instead of waiting for 502
- **Clear Solutions**: Provides exact steps to fix issues

### 3. Comprehensive Logging
- **Detailed Analysis**: Logs error patterns and analysis
- **Scope Mapping**: Shows required vs available scopes
- **Performance Impact**: Minimal overhead for validation

## Troubleshooting Guide

### Common 502 Error Scenarios

#### Missing sell.account Scope
```
Error Pattern: "INSUFFICIENT_SCOPE" + 502 status
Solution: Re-authorize with sell.account scope
```

#### Invalid Token Format
```
Error Pattern: Token validation fails
Solution: Obtain fresh token from OAuth flow
```

#### Temporary API Issues
```
Error Pattern: "SERVICE_UNAVAILABLE" + 502 status
Solution: Wait and retry (not scope-related)
```

### Using the Diagnostic Tools

1. **Start with Diagnostics**: Always run `/ebay-proxy-diagnostic` first
2. **Check Scope Validation**: Use `/ebay-scope-validator` for specific endpoints
3. **Review Logs**: Check proxy logs for detailed error analysis
4. **Follow Recommendations**: Use provided troubleshooting steps

## Future Enhancements

1. **Scope Caching**: Cache scope validation results
2. **Token Refresh**: Automatic token refresh detection
3. **Rate Limit Handling**: Intelligent backoff for rate limits
4. **Health Monitoring**: Endpoint availability monitoring