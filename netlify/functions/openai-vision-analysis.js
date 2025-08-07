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

    // Enhanced prompt for complete listing data
    const prompt = `You are analyzing a clothing item photo for an eBay listing. Extract ALL the information needed to create a complete listing.

CRITICAL INSTRUCTIONS:
1. Analyze the clothing item carefully
2. Return ONLY valid JSON with these exact field names
3. Be specific and accurate

REQUIRED RESPONSE FORMAT (JSON ONLY):
{
  "title": "Complete descriptive title for eBay listing",
  "description": "Detailed description for buyers",
  "price": estimated_market_price_number,
  "brand": "Exact brand name or Unknown if not visible",
  "size": "Exact size or Unknown if not visible", 
  "condition": "New with tags/Excellent/Good/Fair",
  "category": "Clothing type (jacket, shirt, pants, etc)",
  "color": "Primary color",
  "material": "Primary material if visible",
  "gender": "Men/Women/Unisex",
  "style": "Style description",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

EXAMPLES:
- title: "Stio Blue Quilted Puffer Jacket - Lightweight Outdoor Wear"
- price: 45 (just the number)
- brand: "Stio" (from visible labels/tags)
- size: "M" (from visible size tags)
- condition: "Excellent" (based on appearance)
- category: "Jacket"
- color: "Blue"
- material: "Polyester"

IMPORTANT: 
- Return ONLY the JSON object, no other text
- Use "Unknown" if you cannot determine a field
- Price should be a realistic market value (20-100 typically)
- Be specific in the title and description`;

    console.log('🤖 Calling OpenAI API with enhanced keyword prompt...');

    // Make OpenAI request with proper error handling
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        analysis: responseData,
        source: 'openai-vision-enhanced'
      })
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
      // Try to parse as JSON first
      responseData = JSON.parse(responseText);
      console.log('✅ [OPENAI-VISION] Successfully parsed JSON response');
      keywords = JSON.parse(content);
    } catch (parseError) {
      console.log('⚠️ [OPENAI-VISION] JSON parsing failed, extracting manually');
      
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          responseData = JSON.parse(jsonMatch[0]);
          console.log('✅ [OPENAI-VISION] Successfully extracted and parsed JSON from response');
        } catch (innerParseError) {
          console.error('❌ [OPENAI-VISION] Failed to parse extracted JSON:', innerParseError);
          // Return fallback structured data
          responseData = {
            title: 'Quality Clothing Item',
            description: 'Quality clothing item in good condition.',
            price: 25,
            brand: 'Unknown',
            size: 'Unknown',
            condition: 'Good',
            category: 'Clothing',
            color: 'Multi-Color',
            material: 'Mixed Materials',
            gender: 'Unisex',
            style: 'Casual',
            keywords: ['quality item', 'excellent condition', 'authentic', 'fast shipping']
          };
        }
      } else {
        // No JSON structure found, create fallback
        responseData = {
          title: 'Quality Clothing Item',
          description: 'Quality clothing item in good condition.',
          price: 25,
          brand: 'Unknown',
          size: 'Unknown',
          condition: 'Good',
          category: 'Clothing',
          color: 'Multi-Color',
          material: 'Mixed Materials',
          gender: 'Unisex',
          style: 'Casual',
          keywords: ['quality item', 'excellent condition', 'authentic', 'fast shipping']
        };
      }
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
        success: false,
        error: error.message,
        analysis: {
          title: 'Quality Clothing Item',
          description: 'Quality clothing item in good condition.',
          price: 25,
          brand: 'Unknown',
          size: 'Unknown',
          condition: 'Good',
          category: 'Clothing',
          color: 'Multi-Color',
          material: 'Mixed Materials',
          gender: 'Unisex',
          style: 'Casual',
          keywords: ['quality item', 'excellent condition', 'authentic', 'fast shipping']
        }
      })
    };
  }
};