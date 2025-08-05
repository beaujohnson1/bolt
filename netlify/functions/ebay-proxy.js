// eBay API Proxy Function for Netlify
// This function acts as a proxy to bypass CORS restrictions when calling eBay APIs

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-EBAY-API-COMPATIBILITY-LEVEL, X-EBAY-API-DEV-NAME, X-EBAY-API-APP-NAME, X-EBAY-API-CERT-NAME, X-EBAY-API-CALL-NAME, X-EBAY-API-SITEID, X-EBAY-C-MARKETPLACE-ID',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { 
      url, 
      method = 'GET', 
      headers: requestHeaders = {}, 
      body: requestBody 
    } = JSON.parse(event.body || '{}');

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'URL is required',
          received: event.body ? 'body present' : 'no body',
          parsed: event.body ? JSON.parse(event.body) : null
        })
      };
    }

    console.log('🔄 [EBAY-PROXY] Proxying request:', {
      url,
      method,
      hasBody: !!requestBody,
      headerCount: Object.keys(requestHeaders).length,
      bodyType: typeof requestBody,
      bodyContent: requestBody ? (typeof requestBody === 'string' ? requestBody.substring(0, 100) : JSON.stringify(requestBody).substring(0, 100)) : 'none'
    });

    // Forward the request to eBay API
    const response = await fetch(url, {
      method,
      headers: {
        ...requestHeaders,
        // Remove any browser-specific headers that might cause issues
        'User-Agent': 'EasyFlip-Proxy/1.0'
      },
      body: requestBody ? (typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody)) : undefined
    });

    console.log('📥 [EBAY-PROXY] eBay API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType: response.headers.get('Content-Type')
    });

    // Get response data
    const responseText = await response.text();
    console.log('📄 [EBAY-PROXY] Response text length:', responseText.length);
    
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
      console.log('✅ [EBAY-PROXY] Successfully parsed JSON response');
    } catch (parseError) {
      // If it's not JSON, return as text
      responseData = responseText;
      console.log('⚠️ [EBAY-PROXY] Response is not JSON, returning as text');
    }

    // Return the response with CORS headers
    return {
      statusCode: response.status,
      headers: {
        ...headers,
        'Content-Type': response.headers.get('Content-Type') || 'application/json'
      },
      body: typeof responseData === 'string' ? responseData : JSON.stringify(responseData)
    };

  } catch (error) {
    console.error('❌ [EBAY-PROXY] Proxy error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Proxy request failed',
        message: error.message,
        stack: error.stack,
        originalBody: event.body
      })
    };
  }
};