// eBay API Proxy Function for Netlify
// This function acts as a proxy to bypass CORS restrictions when calling eBay APIs
// Enhanced with retry logic, exponential backoff, circuit breaker pattern, and comprehensive error diagnostics

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [502, 503, 504, 408, 429],
  retryableErrorTypes: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
};

// Error pattern matchers for better diagnostics
const ERROR_PATTERNS = {
  INVALID_TOKEN: /invalid.?token|token.?expired|token.?invalid/i,
  INSUFFICIENT_SCOPE: /insufficient.?scope|scope.?required|missing.?scope|unauthorized.?scope/i,
  RATE_LIMIT: /rate.?limit|quota.?exceeded|too.?many.?requests/i,
  BAD_GATEWAY: /bad.?gateway|gateway.?error|upstream.?error/i,
  SERVICE_UNAVAILABLE: /service.?unavailable|temporarily.?unavailable/i,
  FORBIDDEN_SCOPE: /forbidden|access.?denied|insufficient.?permissions/i
};

// Scope requirements mapping
const SCOPE_REQUIREMENTS = {
  '/sell/account/': ['sell.account'],
  '/sell/inventory/': ['sell.inventory'],
  '/sell/marketing/': ['sell.marketing'],
  '/sell/fulfillment/': ['sell.fulfillment'],
  '/buy/browse/': [], // Public API, no special scopes
  '/commerce/taxonomy/': [] // Public API, no special scopes
};

// Circuit breaker state
let circuitBreakerState = {
  failures: 0,
  lastFailure: null,
  state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
  openUntil: null
};

// Exponential backoff with jitter
const calculateDelay = (attempt) => {
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
    RETRY_CONFIG.maxDelay
  );
  // Add jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
};

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Check if error is retryable
const isRetryableError = (error, statusCode) => {
  if (statusCode && RETRY_CONFIG.retryableStatusCodes.includes(statusCode)) {
    return true;
  }
  
  if (error && error.code && RETRY_CONFIG.retryableErrorTypes.includes(error.code)) {
    return true;
  }
  
  if (error && error.message) {
    const message = error.message.toLowerCase();
    return message.includes('timeout') || 
           message.includes('network') || 
           message.includes('connection') ||
           message.includes('gateway');
  }
  
  return false;
};

// Circuit breaker check
const checkCircuitBreaker = () => {
  const now = Date.now();
  
  if (circuitBreakerState.state === 'OPEN') {
    if (now >= circuitBreakerState.openUntil) {
      console.log('🔄 [EBAY-PROXY] Circuit breaker transitioning to HALF_OPEN');
      circuitBreakerState.state = 'HALF_OPEN';
      return true;
    }
    console.log('🚫 [EBAY-PROXY] Circuit breaker OPEN - rejecting request');
    return false;
  }
  
  return true;
};

// Update circuit breaker state
const updateCircuitBreaker = (success) => {
  const now = Date.now();
  
  if (success) {
    if (circuitBreakerState.state === 'HALF_OPEN') {
      console.log('✅ [EBAY-PROXY] Circuit breaker CLOSED after successful request');
      circuitBreakerState.state = 'CLOSED';
      circuitBreakerState.failures = 0;
    }
  } else {
    circuitBreakerState.failures++;
    circuitBreakerState.lastFailure = now;
    
    if (circuitBreakerState.failures >= 5) {
      console.log('🚫 [EBAY-PROXY] Circuit breaker OPEN due to repeated failures');
      circuitBreakerState.state = 'OPEN';
      circuitBreakerState.openUntil = now + 60000; // Open for 1 minute
    }
  }
};

// XML parsing utility for Trading API responses
const parseXMLResponse = (xmlString) => {
  try {
    // Simple XML parsing - in production, use a proper XML parser library
    // For now, we'll just pass through the XML and let the client handle it
    return xmlString;
  } catch (error) {
    console.error('❌ [EBAY-PROXY] XML parsing error:', error);
    return xmlString;
  }
};

// Determine content type based on request
const getContentType = (url, headers) => {
  // Trading API uses XML
  if (url.includes('/ws/api/eBayAPI.dll')) {
    return 'text/xml';
  }
  
  // Browse API and Finding API use JSON
  if (url.includes('/buy/browse/') || url.includes('/services/search/')) {
    return 'application/json';
  }
  
  // Default to JSON
  return 'application/json';
};

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-EBAY-API-COMPATIBILITY-LEVEL, X-EBAY-API-DEV-NAME, X-EBAY-API-APP-NAME, X-EBAY-API-CERT-NAME, X-EBAY-API-CALL-NAME, X-EBAY-API-SITEID, X-EBAY-C-MARKETPLACE-ID, X-EBAY-API-REQUEST-ENCODING',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('📥 [EBAY-PROXY] Received request:', {
      method: event.httpMethod,
      hasBody: !!event.body,
      bodyLength: event.body ? event.body.length : 0,
      headers: event.headers
    });
    
    const { 
      url, 
      method = 'GET', 
      headers: requestHeaders = {}, 
      body: requestBody 
    } = JSON.parse(event.body || '{}');

    console.log('🔍 [EBAY-PROXY] Parsed request data:', {
      url,
      method,
      hasRequestHeaders: !!requestHeaders,
      requestHeadersCount: Object.keys(requestHeaders).length,
      hasRequestBody: !!requestBody,
      requestBodyType: typeof requestBody,
      requestBodyLength: requestBody ? (typeof requestBody === 'string' ? requestBody.length : JSON.stringify(requestBody).length) : 0
    });
    
    if (!url) {
      console.error('❌ [EBAY-PROXY] No URL provided in request');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing URL parameter',
          message: 'URL is required for proxy requests'
        })
      };
    }

    console.log('🔄 [EBAY-PROXY] Proxying request:', {
      url,
      method,
      hasBody: !!requestBody,
      headerCount: Object.keys(requestHeaders).length,
      bodyType: typeof requestBody,
      isXmlRequest: url.includes('/ws/api/eBayAPI.dll'),
      contentType: requestHeaders['Content-Type']
    });

    // Automatic scope validation for sell endpoints to prevent 502 errors
    if (url.includes('/sell/') && requestHeaders.Authorization) {
      console.log('🔍 [EBAY-PROXY] Running automatic scope validation for sell endpoint');
      const scopeValidation = await validateScopeBeforeRequest(url, requestHeaders.Authorization);
      
      if (!scopeValidation.valid) {
        console.error('❌ [EBAY-PROXY] Scope validation failed, preventing likely 502 error');
        return {
          statusCode: 403,
          headers: {
            ...headers,
            'X-Error-Type': 'SCOPE_VALIDATION_FAILED'
          },
          body: JSON.stringify({
            error: 'Insufficient OAuth Scope',
            message: 'The token does not have the required scopes for this endpoint',
            details: {
              endpoint: url.replace('https://api.ebay.com', '[EBAY_API]'),
              requiredScopes: scopeValidation.requiredScopes,
              missingScopes: scopeValidation.missingScopes,
              timestamp: new Date().toISOString(),
              preventedError: '502 Bad Gateway',
              solution: 'Re-authorize your application with the required scopes'
            },
            scopeValidation
          })
        };
      } else {
        console.log('✅ [EBAY-PROXY] Scope validation passed');
      }
    }

    // Determine expected response content type
    const expectedContentType = getContentType(url, requestHeaders);
    console.log('📋 [EBAY-PROXY] Expected response type:', expectedContentType);

    // Check circuit breaker before making request
    if (!checkCircuitBreaker()) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error: 'Service temporarily unavailable',
          message: 'Circuit breaker is open due to repeated failures. Please try again later.',
          retryAfter: Math.ceil((circuitBreakerState.openUntil - Date.now()) / 1000)
        })
      };
    }

    // Make request with retry logic
    const response = await makeRequestWithRetry(url, {
      method,
      headers: {
        ...requestHeaders,
        // Add proxy-specific headers
        'User-Agent': 'EasyFlip-Proxy/1.0',
        // Ensure proper encoding for Trading API
        'Accept-Encoding': 'gzip, deflate'
      },
      body: (method === 'GET' || method === 'HEAD') ? undefined : 
            requestBody ? (typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody)) : undefined
    });

    console.log('📥 [EBAY-PROXY] eBay API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType: response.headers.get('Content-Type'),
      isXmlResponse: response.headers.get('Content-Type')?.includes('xml')
    });

    // Get response data
    const responseText = await response.text();
    console.log('📄 [EBAY-PROXY] Response details:', {
      textLength: responseText.length,
      firstChars: responseText.substring(0, 100),
      isXml: responseText.trim().startsWith('<?xml'),
      isAccountApi: url.includes('/sell/account/'),
      status: response.status
    });

    // Update circuit breaker on success
    updateCircuitBreaker(response.ok);

    // Enhanced error handling with comprehensive diagnostics
    if (!response.ok) {
      // Update circuit breaker on failure
      updateCircuitBreaker(false);
      
      console.error('❌ [EBAY-PROXY] API Error:', {
        status: response.status,
        statusText: response.statusText,
        url: url.replace('https://api.ebay.com', '[EBAY_API]'),
        responsePreview: responseText.substring(0, 500),
        requestMethod: method,
        hasAuth: !!requestHeaders.Authorization
      });

      // Analyze the actual error response for better diagnostics
      const errorAnalysis = analyzeErrorResponse(responseText, response.status, url);
      console.error('🔍 [EBAY-PROXY] Error analysis:', errorAnalysis);

      // Special handling for 502 Bad Gateway errors with scope analysis
      if (response.status === 502) {
        console.error('🚨 [EBAY-PROXY] 502 BAD GATEWAY DETECTED!');
        
        const scopeAnalysis = analyzeScopeRequirements(url, requestHeaders.Authorization);
        console.error('🔍 [EBAY-PROXY] Scope analysis:', scopeAnalysis);
        
        const error502Response = {
          error: 'eBay API Gateway Error',
          message: 'The eBay API returned a 502 Bad Gateway error',
          details: {
            status: 502,
            endpoint: url.replace('https://api.ebay.com', '[EBAY_API]'),
            timestamp: new Date().toISOString(),
            errorAnalysis,
            scopeAnalysis,
            likelyScope: errorAnalysis.likelyScope || scopeAnalysis.missingScopes.length > 0,
            requiredScopes: scopeAnalysis.requiredScopes,
            missingScopes: scopeAnalysis.missingScopes,
            possibleCauses: [
              errorAnalysis.likelyScope ? '🔑 Missing OAuth scope (most likely)' : 'eBay API is temporarily unavailable',
              'Invalid or expired OAuth token',
              'Rate limiting exceeded',
              'Malformed request headers'
            ],
            troubleshooting: [
              errorAnalysis.likelyScope ? 
                `Re-authorize with required scopes: ${scopeAnalysis.requiredScopes.join(', ')}` :
                'Check eBay API status at developer.ebay.com',
              'Verify OAuth token is valid and not expired',
              'Use the /ebay-proxy-diagnostic endpoint for full analysis',
              'Wait a few minutes and retry if temporary issue'
            ]
          },
          retryable: !errorAnalysis.likelyScope,
          retryAfter: errorAnalysis.likelyScope ? null : 30
        };
        
        return {
          statusCode: 502,
          headers: {
            ...headers,
            'X-Error-Type': errorAnalysis.likelyScope ? 'SCOPE_ERROR' : 'GATEWAY_ERROR',
            ...(errorAnalysis.likelyScope ? {} : { 'Retry-After': '30' })
          },
          body: JSON.stringify(error502Response)
        };
      }

      // Special handling for 503 Service Unavailable errors
      if (response.status === 503) {
        console.error('🚨 [EBAY-PROXY] 503 SERVICE UNAVAILABLE DETECTED!');
        
        const error503Response = {
          error: 'eBay API Service Unavailable',
          message: 'The eBay API service is temporarily unavailable',
          details: {
            status: 503,
            endpoint: url.replace('https://api.ebay.com', '[EBAY_API]'),
            timestamp: new Date().toISOString(),
            errorAnalysis,
            possibleCauses: [
              'eBay API maintenance or overload',
              'Temporary service disruption',
              'Rate limiting (quota exceeded)'
            ],
            troubleshooting: [
              'Wait 1-5 minutes and retry',
              'Check eBay Developer status page',
              'Reduce request frequency'
            ]
          },
          retryable: true,
          retryAfter: 60
        };
        
        return {
          statusCode: 503,
          headers: {
            ...headers,
            'Retry-After': '60'
          },
          body: JSON.stringify(error503Response)
        };
      }

      // Enhanced eBay error response parsing with detailed analysis
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.errors && errorData.errors.length > 0) {
          console.error('❌ [EBAY-PROXY] eBay API Errors:', errorData.errors.map(err => ({
            errorId: err.errorId,
            domain: err.domain,
            category: err.category,
            message: err.message,
            longMessage: err.longMessage,
            parameters: err.parameters
          })));

          // Enhanced scope and auth error detection
          const authScopeAnalysis = analyzeAuthErrors(errorData.errors);
          console.error('🔍 [EBAY-PROXY] Auth/Scope Analysis:', authScopeAnalysis);

          if (authScopeAnalysis.hasScopeIssue) {
            console.error('🔑 [EBAY-PROXY] CRITICAL: Scope issue detected!');
            console.error('🔑 [EBAY-PROXY] Missing scopes:', authScopeAnalysis.missingScopes);
            console.error('🔑 [EBAY-PROXY] Required scopes for this endpoint:', authScopeAnalysis.requiredScopes);
          }

          if (authScopeAnalysis.hasTokenIssue) {
            console.error('🔑 [EBAY-PROXY] CRITICAL: Token issue detected!');
            console.error('🔑 [EBAY-PROXY] Token problems:', authScopeAnalysis.tokenIssues);
          }
        }
      } catch (parseError) {
        console.error('❌ [EBAY-PROXY] Could not parse API error response:', parseError.message);
        console.error('❌ [EBAY-PROXY] Raw response:', responseText.substring(0, 500));
      }
    }
    
    let responseData;
    const responseContentType = response.headers.get('Content-Type') || '';
    
    // Handle XML responses (Trading API)
    if (responseContentType.includes('xml') || responseText.trim().startsWith('<?xml')) {
      console.log('📄 [EBAY-PROXY] Handling XML response from Trading API');
      responseData = responseText;
    } else {
      // Handle JSON responses (Browse API, Finding API)
      try {
        responseData = JSON.parse(responseText);
        console.log('✅ [EBAY-PROXY] Successfully parsed JSON response');
      } catch (parseError) {
        // If JSON parsing fails, return a structured error response
        console.log('⚠️ [EBAY-PROXY] JSON parsing failed, creating error response:', parseError.message);
        responseData = {
          error: 'Invalid JSON response from eBay API',
          message: parseError.message,
          rawResponse: responseText.substring(0, 500), // Include first 500 chars for debugging
          responseLength: responseText.length,
          parseError: true
        };
      }
    }

    // Ensure we always return valid JSON
    let responseBody;
    try {
      responseBody = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
      // Validate that the response body is valid JSON if it's supposed to be JSON
      if (responseContentType.includes('json') || (!responseContentType.includes('xml') && !responseText.trim().startsWith('<?xml'))) {
        JSON.parse(responseBody); // This will throw if invalid JSON
      }
    } catch (stringifyError) {
      console.error('❌ [EBAY-PROXY] Failed to create valid JSON response:', stringifyError);
      responseBody = JSON.stringify({
        error: 'Failed to process eBay API response',
        message: stringifyError.message,
        originalError: true
      });
    }

    return {
      statusCode: response.status,
      headers: {
        ...headers,
        'Content-Type': response.headers.get('Content-Type') || expectedContentType
      },
      body: responseBody
    };

  } catch (error) {
    // Update circuit breaker on error
    updateCircuitBreaker(false);
    
    console.error('❌ [EBAY-PROXY] Proxy error:', {
      error: error.message,
      stack: error.stack,
      url: url || 'unknown',
      method: method || 'unknown',
      code: error.code
    });
    
    // Enhanced error response with retry information
    const errorResponse = {
      error: 'Gateway error',
      message: error.message || 'Failed to proxy request to eBay API',
      details: 'The proxy service could not complete the request to eBay API',
      url: url || 'unknown',
      timestamp: new Date().toISOString(),
      errorCode: error.code,
      retryable: isRetryableError(error, null),
      circuitBreakerState: circuitBreakerState.state
    };
    
    return {
      statusCode: 502,
      headers: {
        ...headers,
        'Retry-After': '30'
      },
      body: JSON.stringify(errorResponse)
    };
  }
};

// Enhanced fetch with retry logic and exponential backoff
const makeRequestWithRetry = async (url, options, attempt = 0) => {
  try {
    console.log(`🔄 [EBAY-PROXY] Request attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}`);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // If successful or non-retryable error, return immediately
    if (response.ok || !isRetryableError(null, response.status)) {
      if (response.ok) {
        console.log(`✅ [EBAY-PROXY] Request succeeded on attempt ${attempt + 1}`);
      }
      return response;
    }
    
    // If this was our last attempt, return the response
    if (attempt >= RETRY_CONFIG.maxRetries) {
      console.log(`❌ [EBAY-PROXY] All retry attempts exhausted, returning last response`);
      return response;
    }
    
    // Calculate delay and retry
    const delay = calculateDelay(attempt);
    console.log(`⏳ [EBAY-PROXY] Retrying after ${delay}ms (status: ${response.status})`);
    await sleep(delay);
    
    return makeRequestWithRetry(url, options, attempt + 1);
    
  } catch (error) {
    // Handle abort/timeout errors
    if (error.name === 'AbortError') {
      console.error('⏰ [EBAY-PROXY] Request timed out');
      error.code = 'ETIMEDOUT';
    }
    
    // If this was our last attempt or error is not retryable, throw
    if (attempt >= RETRY_CONFIG.maxRetries || !isRetryableError(error, null)) {
      console.log(`❌ [EBAY-PROXY] Throwing error after ${attempt + 1} attempts:`, error.message);
      throw error;
    }
    
    // Calculate delay and retry
    const delay = calculateDelay(attempt);
    console.log(`⏳ [EBAY-PROXY] Retrying after ${delay}ms (error: ${error.message})`);
    await sleep(delay);
    
    return makeRequestWithRetry(url, options, attempt + 1);
  }
};

// Error response analysis function
function analyzeErrorResponse(responseText, statusCode, url) {
  const analysis = {
    statusCode,
    endpoint: url.replace('https://api.ebay.com', ''),
    likelyScope: false,
    likelyToken: false,
    likelyTemporary: false,
    patterns: [],
    rawError: responseText.substring(0, 200)
  };

  // Check for known error patterns
  Object.entries(ERROR_PATTERNS).forEach(([pattern, regex]) => {
    if (regex.test(responseText)) {
      analysis.patterns.push(pattern);
      
      if (pattern === 'INSUFFICIENT_SCOPE' || pattern === 'FORBIDDEN_SCOPE') {
        analysis.likelyScope = true;
      } else if (pattern === 'INVALID_TOKEN') {
        analysis.likelyToken = true;
      } else if (pattern === 'SERVICE_UNAVAILABLE' || pattern === 'BAD_GATEWAY') {
        analysis.likelyTemporary = true;
      }
    }
  });

  // Special analysis for 502 errors - often scope related
  if (statusCode === 502 && url.includes('/sell/')) {
    analysis.likelyScope = true;
    analysis.patterns.push('LIKELY_SCOPE_502');
  }

  return analysis;
}

// Scope requirements analysis function
function analyzeScopeRequirements(url, authHeader) {
  const analysis = {
    endpoint: url.replace('https://api.ebay.com', ''),
    requiredScopes: [],
    missingScopes: [],
    hasToken: !!authHeader
  };

  // Determine required scopes based on endpoint
  Object.entries(SCOPE_REQUIREMENTS).forEach(([path, scopes]) => {
    if (url.includes(path)) {
      analysis.requiredScopes = scopes;
    }
  });

  // For now, assume all required scopes are missing if we get 502
  // In a real implementation, you'd validate the actual token scopes
  if (analysis.requiredScopes.length > 0) {
    analysis.missingScopes = analysis.requiredScopes;
  }

  return analysis;
}

// Automatic scope validation function
async function validateScopeBeforeRequest(url, authHeader) {
  const validation = {
    valid: true,
    requiredScopes: [],
    missingScopes: [],
    tested: false
  };

  try {
    // Quick scope check for common endpoints
    const requiredScopes = getRequiredScopesForUrl(url);
    validation.requiredScopes = requiredScopes;
    
    if (requiredScopes.length === 0) {
      return validation; // No special scopes required
    }

    // For sell.account endpoints, do a quick validation
    if (requiredScopes.includes('sell.account')) {
      validation.tested = true;
      
      // Quick test with minimal endpoint
      const testResponse = await fetch('https://api.ebay.com/sell/account/v1/policies', {
        method: 'HEAD', // Use HEAD to minimize data transfer
        headers: {
          'Authorization': authHeader,
          'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
        }
      });

      if (testResponse.status === 502 || testResponse.status === 401) {
        validation.valid = false;
        validation.missingScopes = ['sell.account'];
      }
    }

  } catch (error) {
    console.log('⚠️ [EBAY-PROXY] Scope validation failed, proceeding with request:', error.message);
    // If validation fails, proceed with original request
    validation.valid = true;
  }

  return validation;
}

// Helper function to determine required scopes from URL
function getRequiredScopesForUrl(url) {
  if (url.includes('/sell/account/')) {
    return ['sell.account'];
  } else if (url.includes('/sell/inventory/')) {
    return ['sell.inventory'];
  } else if (url.includes('/sell/marketing/')) {
    return ['sell.marketing'];
  } else if (url.includes('/sell/fulfillment/')) {
    return ['sell.fulfillment'];
  }
  return [];
}

// Enhanced auth error analysis function
function analyzeAuthErrors(errors) {
  const analysis = {
    hasScopeIssue: false,
    hasTokenIssue: false,
    missingScopes: [],
    requiredScopes: [],
    tokenIssues: []
  };

  errors.forEach(error => {
    const errorText = `${error.message || ''} ${error.longMessage || ''} ${error.errorId || ''}`.toLowerCase();
    
    // Check for scope-related errors
    if (ERROR_PATTERNS.INSUFFICIENT_SCOPE.test(errorText) || 
        ERROR_PATTERNS.FORBIDDEN_SCOPE.test(errorText) ||
        error.errorId?.includes('PERMISSION') ||
        error.errorId?.includes('SCOPE')) {
      analysis.hasScopeIssue = true;
      
      // Extract scope information if available
      if (error.parameters) {
        error.parameters.forEach(param => {
          if (param.name === 'scope' || param.name === 'required_scope') {
            analysis.requiredScopes.push(param.value);
          }
        });
      }
    }
    
    // Check for token-related errors
    if (ERROR_PATTERNS.INVALID_TOKEN.test(errorText) ||
        error.errorId?.includes('AUTH') ||
        error.errorId?.includes('TOKEN')) {
      analysis.hasTokenIssue = true;
      analysis.tokenIssues.push(error.message || error.errorId);
    }
  });

  // If no specific scopes found but we have scope issues, assume common ones
  if (analysis.hasScopeIssue && analysis.requiredScopes.length === 0) {
    analysis.requiredScopes = ['sell.account', 'sell.inventory'];
    analysis.missingScopes = analysis.requiredScopes;
  }

  return analysis;
}