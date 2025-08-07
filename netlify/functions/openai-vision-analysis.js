exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  console.log('✅ OpenAI Vision function called');

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Check API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not found');
      
      // Return fallback keywords instead of failing
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          keywords: ['quality item', 'excellent condition', 'authentic', 'fast shipping'],
          source: 'fallback_no_api_key',
          success: true
        })
      };
    }

    // Parse and validate request
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request body' })
      };
    }

    const { imageUrl, detectedBrand, detectedCategory, detectedStyle, detectedColor } = requestBody;
    
    console.log('📝 Request details:', {
      hasImageUrl: !!imageUrl,
      hasImageBase64: !!requestBody.imageBase64,
      imageUrlLength: imageUrl?.length || 0,
      imageBase64Length: requestBody.imageBase64?.length || 0,
      detectedBrand,
      detectedCategory
    });

    // Validate image input (URL or base64)
    const imageInput = imageUrl || (requestBody.imageBase64 ? `data:image/jpeg;base64,${requestBody.imageBase64}` : null);
    
    if (!imageInput) {
      console.error('❌ No image URL or base64 provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image URL or base64 is required' })
      };
    }

    // Validate image format
    if (imageUrl && !imageUrl.startsWith('https://')) {
      console.error('❌ Invalid image URL format:', imageUrl);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image URL must be HTTPS' })
      };
    }

    console.log('🖼️ Analyzing image:', imageInput.substring(0, 50) + '...');

    // Create specific prompt for keywords
    const prompt = `Look at this clothing item and generate 8-10 specific selling keywords for eBay/marketplace listings.

Focus on what you actually see in the image:
- Specific brand name if visible
- Exact item type (leather jacket, wool sweater, etc.)
- Material type (leather, cotton, wool, etc.)
- Color details
- Style features
- Condition indicators
- Popular search terms buyers use

Return ONLY a JSON array of keywords like:
["black leather jacket", "genuine leather", "vintage style", "excellent condition", "designer jacket", "winter coat", "authentic leather", "quality craftsmanship"]`;

    console.log('🤖 Calling OpenAI API with enhanced keyword prompt...');

    // Make OpenAI request with proper error handling
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageInput,
                  detail: "high" // Use high detail for better analysis
                }
              }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.4
      })
    });

    console.log('📡 OpenAI response status:', openaiResponse.status);

    // Handle OpenAI API errors gracefully
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ OpenAI API error:', {
        status: openaiResponse.status,
        error: errorText
      });
      
      // Smart fallback based on detected info
      const fallbackKeywords = [
        detectedBrand && detectedBrand !== 'Unknown' ? detectedBrand.toLowerCase() : null,
        detectedCategory || 'clothing',
        'excellent condition',
        'authentic',
        'quality item',
        'fast shipping',
        'great deal',
        'pre-owned'
      ].filter(Boolean);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          keywords: fallbackKeywords,
          source: 'smart_fallback',
          success: true,
          note: `OpenAI API error: ${openaiResponse.status}`
        })
      };
    }

    const data = await openaiResponse.json();
    console.log('✅ OpenAI response received');

    if (!data.choices?.[0]?.message?.content) {
      console.error('❌ Invalid OpenAI response structure');
      
      // Smart fallback keywords
      const fallbackKeywords = [
        detectedBrand && detectedBrand !== 'Unknown' ? detectedBrand.toLowerCase() : null,
        detectedCategory || 'clothing',
        'excellent condition',
        'authentic'
      ].filter(Boolean);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          keywords: fallbackKeywords,
          source: 'fallback_invalid_response',
          success: true
        })
      };
    }

    // Parse keywords from response
    const content = data.choices[0].message.content.trim();
    console.log('🔑 Raw keywords response:', content);

    let keywords = [];
    
    try {
      // Try to parse as JSON
      keywords = JSON.parse(content);
    } catch (parseError) {
      console.log('⚠️ JSON parsing failed, extracting manually');
      
      // Extract array from text
      const arrayMatch = content.match(/\[(.*?)\]/s);
      if (arrayMatch) {
        try {
          keywords = JSON.parse(`[${arrayMatch[1]}]`);
        } catch {
          // Manual extraction
          keywords = arrayMatch[1]
            .split(',')
            .map(k => k.trim().replace(/['"]/g, ''))
            .filter(k => k.length > 0);
        }
      } else {
        // Split by lines or commas
        keywords = content
          .split(/[,\n]/)
          .map(k => k.trim().replace(/^[-•\d.]\s*/, '').replace(/['"]/g, ''))
          .filter(k => k.length > 2);
      }
    }

    // Validate and clean keywords
    if (!Array.isArray(keywords) || keywords.length === 0) {
      console.log('⚠️ No valid keywords, using smart fallback');
      keywords = [
        detectedBrand && detectedBrand !== 'Unknown' ? detectedBrand.toLowerCase() : null,
        detectedCategory || 'clothing',
        'excellent condition',
        'authentic'
      ].filter(Boolean);
    }

    // Final cleanup
    keywords = keywords
      .filter(k => typeof k === 'string' && k.trim().length > 0)
      .map(k => k.trim().toLowerCase())
      .slice(0, 10);

    console.log('🎯 Final keywords:', keywords);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        keywords,
        source: 'openai_vision',
        success: true 
      })
    };

  } catch (error) {
    console.error('💥 Function error:', error);
    
    // Always return fallback keywords instead of failing
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        keywords: ['quality item', 'excellent condition', 'authentic', 'fast shipping'],
        source: 'fallback_error',
        success: true,
        error: error.message
      })
    };
  }
};