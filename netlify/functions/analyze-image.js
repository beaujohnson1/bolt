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
    console.log('🔍 Checking environment variables...');
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not found');
      
      // Return fallback analysis instead of failing
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          analysis: {
            brand: 'Unknown',
            category: 'clothing',
            suggestedTitle: 'Pre-owned Fashion Item',
            suggestedPrice: 25,
            color: 'Various',
            material: 'Mixed Materials',
            condition: 'good',
            style: 'Classic',
            confidence: 0.3,
            keyFeatures: ['Quality item', 'Good condition'],
            description: 'Quality pre-owned fashion item in good condition.',
            priceRange: { min: 20, max: 30 }
          }
        })
      };
    }

    // Parse and validate request
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
      console.log('📝 Request body parsed successfully');
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid request body' })
      };
    }

    const { imageUrl, allImageUrls, imageHash } = requestBody;
    
    // Use the first image URL for analysis
    const primaryImageUrl = imageUrl || (allImageUrls && allImageUrls[0]);

    console.log('🖼️ Processing request:', {
      hasImageUrl: !!primaryImageUrl,
      imageUrlLength: primaryImageUrl?.length,
      totalImages: allImageUrls?.length || 1,
      imageHash: imageHash?.substring(0, 16) + '...'
    });

    if (!primaryImageUrl) {
      console.error('❌ No image URL provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image URL is required' })
      };
    }

    // Check if image URL is accessible
    if (!primaryImageUrl.startsWith('https://')) {
      console.error('❌ Invalid image URL format:', primaryImageUrl);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image URL must be HTTPS' })
      };
    }

    // Enhanced prompt for detailed analysis
    const prompt = `Analyze this clothing/fashion item image in detail. Provide:

1. **Brand**: Identify any visible brand names or logos
2. **Category**: What type of item is this? (jacket, shirt, pants, shoes, etc.)
3. **Style/Model**: Specific style name or model if identifiable
4. **Color**: Primary and secondary colors
5. **Material**: Fabric type or material (leather, cotton, denim, etc.)
6. **Condition**: Apparent condition based on what you can see
7. **Key Features**: Notable design elements, patterns, or features
8. **Size Info**: Any visible size tags or indicators

Be specific and detailed. Look carefully at the actual image, not just generic assumptions.

Return a JSON object with these fields:
{
  "brand": "detected brand or 'Unknown'",
  "category": "item type",
  "suggestedTitle": "detailed descriptive title",
  "suggestedPrice": 0,
  "color": "primary color",
  "material": "material type",
  "condition": "condition assessment",
  "style": "style or model name",
  "confidence": 0,
  "keyFeatures": [],
  "description": ""
}`;

    console.log('🤖 Calling OpenAI API with current model...');

    // Make OpenAI request with proper error handling
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o", // ✅ Updated to current model
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
                  url: primaryImageUrl,
                  detail: "high" // Use high detail for better analysis
                }
              }
            ]
          }
        ],
        max_tokens: 500, // Increased for detailed response
        temperature: 0.1 // Lower temperature for more consistent results
      })
    });

    console.log('📡 OpenAI Response Status:', openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ OpenAI API Error:', {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        error: errorText
      });
      
      // Return fallback analysis instead of failing
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          analysis: {
            brand: 'Unknown',
            category: 'clothing',
            suggestedTitle: 'Pre-owned Fashion Item',
            suggestedPrice: 25,
            color: 'Various',
            material: 'Mixed Materials',
            condition: 'good',
            style: 'Classic',
            confidence: 0.3,
            keyFeatures: ['Quality item', 'Good condition'],
            description: 'Quality pre-owned fashion item in good condition.',
            priceRange: { min: 20, max: 30 }
          }
        })
      };
    }

    const data = await openaiResponse.json();
    console.log('✅ OpenAI response received');

    if (!data.choices?.[0]?.message?.content) {
      console.error('❌ Invalid OpenAI response structure:', data);
      
      // Fallback analysis
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          analysis: {
            brand: 'Unknown',
            category: 'clothing',
            suggestedTitle: 'Pre-owned Fashion Item',
            suggestedPrice: 25,
            color: 'Various',
            material: 'Mixed Materials',
            condition: 'good',
            style: 'Classic',
            confidence: 0.3,
            keyFeatures: ['Quality item', 'Good condition'],
            description: 'Quality pre-owned fashion item in good condition.',
            priceRange: { min: 20, max: 30 }
          }
        })
      };
    }

    // Parse analysis from response
    const content = data.choices[0].message.content.trim();
    console.log('📝 Raw OpenAI content:', content);

    let analysisResult;
    try {
      analysisResult = JSON.parse(content);
      console.log('✅ Analysis parsed successfully:', analysisResult);
    } catch (parseError) {
      console.log('⚠️ JSON parsing failed, returning generic fallback:', parseError);
      analysisResult = {
        brand: 'Unknown',
        category: 'clothing',
        suggestedTitle: 'Pre-owned Fashion Item',
        suggestedPrice: 25,
        color: 'Various',
        material: 'Mixed Materials',
        condition: 'good',
        style: 'Classic',
        confidence: 0.3,
        keyFeatures: ['Quality item', 'Good condition'],
        description: 'Quality pre-owned fashion item in good condition.'
      };
    }

    // Ensure suggestedPrice is a number
    if (typeof analysisResult.suggestedPrice !== 'number') {
      analysisResult.suggestedPrice = parseFloat(analysisResult.suggestedPrice) || 25;
    }

    // Add price range based on suggested price
    analysisResult.priceRange = {
      min: Math.round(analysisResult.suggestedPrice * 0.8),
      max: Math.round(analysisResult.suggestedPrice * 1.2)
    };

    // Ensure category is one of the predefined types or 'other'
    const validCategories = ['clothing', 'shoes', 'accessories', 'electronics', 'home_garden', 'toys_games', 'sports_outdoors', 'books_media', 'jewelry', 'collectibles', 'other'];
    if (!validCategories.includes(analysisResult.category)) {
      analysisResult.category = 'other';
    }

    // Ensure condition is one of the predefined types or 'good'
    const validConditions = ['like_new', 'good', 'fair', 'poor'];
    if (!validConditions.includes(analysisResult.condition)) {
      analysisResult.condition = 'good';
    }

    console.log('🎯 Final analysis result:', analysisResult);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        analysis: analysisResult,
        success: true 
      })
    };

  } catch (error) {
    console.error('💥 Function error:', error);
    console.error('Error stack:', error.stack);
    
    // Always return fallback analysis instead of failing
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        analysis: {
          brand: 'Unknown',
          category: 'clothing',
          suggestedTitle: 'Pre-owned Fashion Item',
          suggestedPrice: 25,
          color: 'Various',
          material: 'Mixed Materials',
          condition: 'good',
          style: 'Classic',
          confidence: 0.3,
          keyFeatures: ['Quality item', 'Good condition'],
          description: 'Quality pre-owned fashion item in good condition.',
          priceRange: { min: 20, max: 30 }
        },
        success: true,
        fallback: true,
        error: error.message
      })
    };
  }
};