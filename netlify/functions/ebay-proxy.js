// eBay API Proxy Function for Netlify
// This function acts as a proxy to bypass CORS restrictions when calling eBay APIs

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

    // Forward the request to eBay API
    const response = await fetch(url, {
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

    // Enhanced error handling for Account API
    if (!response.ok && url.includes('/sell/account/')) {
      console.error('❌ [EBAY-PROXY] Account API Error:', {
        status: response.status,
        statusText: response.statusText,
        url: url.replace('https://api.ebay.com', '[EBAY_API]'),
        responsePreview: responseText.substring(0, 300)
      });

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
    console.error('❌ [EBAY-PROXY] Proxy error:', {
      error: error.message,
      stack: error.stack,
      url: url || 'unknown',
      method: method || 'unknown'
    });
    
    // Return 502 Bad Gateway for fetch failures
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error: 'Gateway error',
        message: error.message || 'Failed to proxy request to eBay API',
        details: 'The proxy service could not complete the request to eBay API',
        url: url || 'unknown'
      })
    };
  }
};