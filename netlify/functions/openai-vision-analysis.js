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
      console.error('❌ Invalid request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { imageUrl, detectedBrand, detectedCategory, detectedStyle, detectedColor } = requestBody;
    
    console.log('📝 Request details:', {
      hasImageUrl: !!imageUrl,
      imageUrlLength: imageUrl?.length,
      detectedBrand,
      detectedCategory
    });

    // Validate image URL
    if (!imageUrl) {
      console.error('❌ No image URL provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image URL is required' })
      };
    }

    // Check if image URL is accessible
    if (!imageUrl.startsWith('https://')) {
      console.error('❌ Invalid image URL format:', imageUrl);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image URL must be HTTPS' })
      };
    }

    // Create simple, focused prompt
    const prompt = `Look at this image and generate 8 keywords for selling it online. Focus on:
- Brand: ${detectedBrand || 'unknown'}
- Category: ${detectedCategory || 'item'}
- Style: ${detectedStyle || 'classic'}
- Color: ${detectedColor || 'various'}

Return only a JSON array like: ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8"]`;

    console.log('🤖 Calling OpenAI API...');

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
                  url: imageUrl,
                  detail: "low"
                }
              }
            ]
          }
        ],
        max_tokens: 150,
        temperature: 0.3
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
      
      // Return fallback keywords instead of failing
      const fallbackKeywords = [
        detectedBrand || 'quality',
        detectedCategory || 'item',
        detectedStyle || 'stylish',
        detectedColor || 'great',
        'excellent condition',
        'authentic',
        'fast shipping',
        'great deal'
      ].filter(Boolean);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          keywords: fallbackKeywords,
          source: 'fallback_api_error',
          success: true,
          note: `OpenAI API error: ${openaiResponse.status}`
        })
      };
    }

    const data = await openaiResponse.json();
    console.log('✅ OpenAI response received');

    if (!data.choices?.?.message?.content) {
      console.error('❌ Invalid OpenAI response structure');
      
      // Fallback keywords
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          keywords: ['quality item', 'excellent condition', 'authentic', 'fast shipping'],
          source: 'fallback_invalid_response',
          success: true
        })
      };
    }

    // Parse keywords from response
    const content = data.choices.message.content.trim();
    console.log('📝 Raw content:', content);

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
          keywords = arrayMatch
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
      console.log('⚠️ No valid keywords, using fallback');
      keywords = [
        detectedBrand || 'quality',
        detectedCategory || 'item',
        'excellent condition',
        'authentic'
      ];
    }

    // Final cleanup
    keywords = keywords
      .filter(k => typeof k === 'string' && k.trim().length > 0)
      .map(k => k.trim().toLowerCase())
      .slice(0, 8);

    console.log('🎯 Final keywords:', keywords);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        keywords,
        source: 'openai_success',
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