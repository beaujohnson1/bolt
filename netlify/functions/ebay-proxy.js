// eBay API Proxy Function for Netlify
// This function acts as a proxy to bypass CORS restrictions when calling eBay APIs
// Enhanced with retry logic, exponential backoff, and circuit breaker pattern

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [502, 503, 504, 408, 429],
  retryableErrorTypes: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
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

    // Enhanced error handling for Account API with 502 specific handling
    if (!response.ok && url.includes('/sell/account/')) {
      // Update circuit breaker on failure
      updateCircuitBreaker(false);
      
      console.error('❌ [EBAY-PROXY] Account API Error:', {
        status: response.status,
        statusText: response.statusText,
        url: url.replace('https://api.ebay.com', '[EBAY_API]'),
        responsePreview: responseText.substring(0, 300)
      });

      // Special handling for 502 Bad Gateway errors
      if (response.status === 502) {
        console.error('🚨 [EBAY-PROXY] 502 BAD GATEWAY DETECTED!');
        console.error('🚨 [EBAY-PROXY] Common causes:');
        console.error('🚨 [EBAY-PROXY] 1. eBay API is temporarily down');
        console.error('🚨 [EBAY-PROXY] 2. Invalid OAuth token or expired token');
        console.error('🚨 [EBAY-PROXY] 3. Missing required OAuth scopes (sell.account)');
        console.error('🚨 [EBAY-PROXY] 4. Rate limiting or quota exceeded');
        console.error('🚨 [EBAY-PROXY] 5. Malformed request headers or body');
        
        // Enhanced 502 error response
        const error502Response = {
          error: 'eBay API Gateway Error',
          message: 'The eBay API returned a 502 Bad Gateway error',
          details: {
            status: 502,
            endpoint: url.replace('https://api.ebay.com', '[EBAY_API]'),
            timestamp: new Date().toISOString(),
            possibleCauses: [
              'eBay API is temporarily unavailable',
              'Invalid or expired OAuth token',
              'Missing sell.account OAuth scope',
              'Rate limiting exceeded',
              'Malformed request'
            ],
            troubleshooting: [
              'Check eBay API status at developer.ebay.com',
              'Verify OAuth token is valid and not expired',
              'Ensure token has sell.account scope',
              'Wait a few minutes and retry',
              'Check request format and headers'
            ]
          },
          retryable: true,
          retryAfter: 30
        };
        
        return {
          statusCode: 502,
          headers: {
            ...headers,
            'Retry-After': '30'
          },
          body: JSON.stringify(error502Response)
        };
      }

      // Try to parse eBay error response
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.errors && errorData.errors.length > 0) {
          console.error('❌ [EBAY-PROXY] eBay API Errors:', errorData.errors.map(err => ({
            errorId: err.errorId,
            domain: err.domain,
            category: err.category,
            message: err.message,
            longMessage: err.longMessage
          })));

          // Check for specific auth/scope errors
          const hasAuthError = errorData.errors.some(err => 
            err.errorId && (
              err.errorId.includes('AUTH') || 
              err.errorId.includes('PERMISSION') ||
              err.errorId.includes('SCOPE') ||
              err.message?.toLowerCase().includes('unauthorized') ||
              err.message?.toLowerCase().includes('scope')
            )
          );

          if (hasAuthError) {
            console.error('🔑 [EBAY-PROXY] CRITICAL: Authentication or scope issue detected!');
            console.error('🔑 [EBAY-PROXY] Ensure OAuth token has "sell.account" scope');
          }
        }
      } catch (parseError) {
        console.error('❌ [EBAY-PROXY] Could not parse Account API error response');
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