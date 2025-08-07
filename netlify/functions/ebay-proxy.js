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
          error: 'URL is required',
          received_body: event.body ? event.body.substring(0, 200) : 'no body',
          parsed_data: { url, method, hasRequestHeaders: !!requestHeaders, hasRequestBody: !!requestBody }
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
      isXml: responseText.trim().startsWith('<?xml')
    });
    
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
        // If it's not JSON, return as text
        responseData = responseText;
        console.log('⚠️ [EBAY-PROXY] Response is not JSON, returning as text:', parseError.message);
      }
    }

    // Return the response with CORS headers
    return {
      statusCode: response.status,
      headers: {
        ...headers,
        'Content-Type': response.headers.get('Content-Type') || expectedContentType
      },
      body: typeof responseData === 'string' ? responseData : JSON.stringify(responseData)
    };

  } catch (error) {
    console.error('❌ [EBAY-PROXY] Proxy error:', error);
    console.error('❌ [EBAY-PROXY] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Proxy request failed',
        message: error.message,
        originalBody: event.body ? event.body.substring(0, 200) : 'no body'
      })
    };
  }
};