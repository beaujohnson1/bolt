exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  console.log('✅ OpenAI Vision function called');

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
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    // Parse request body
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

    const { imageUrl, detectedBrand, detectedCategory, detectedStyle, detectedColor } = requestBody;
    
    console.log('🖼️ Processing request:', {
      hasImageUrl: !!imageUrl,
      detectedBrand,
      detectedCategory,
      detectedStyle,
      detectedColor
    });

    if (!imageUrl) {
      console.error('❌ No image URL provided');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Image URL is required' })
      };
    }

    // Build prompt
    const prompt = `Analyze this clothing/item image and generate exactly 8-10 relevant keywords for online marketplace listings.

Item Details:
${detectedBrand ? `- Brand: ${detectedBrand}` : ''}
${detectedCategory ? `- Category: ${detectedCategory}` : ''}
${detectedStyle ? `- Style: ${detectedStyle}` : ''}
${detectedColor ? `- Color: ${detectedColor}` : ''}

Generate keywords focusing on:
- Style and design features
- Colors and patterns  
- Material and fabric type
- Condition descriptors
- Popular search terms
- Brand-specific terms

Return EXACTLY this format - a simple JSON array:
["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8"]

No explanations, no extra text, just the JSON array.`;

    console.log('🤖 Calling OpenAI API with current model...');

    // Updated to use current OpenAI model
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
                  url: imageUrl,
                  detail: "low" // Use low detail to save costs
                }
              }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.3
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
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'OpenAI API request failed',
          status: openaiResponse.status,
          details: errorText
        })
      };
    }

    const data = await openaiResponse.json();
    console.log('✅ OpenAI response received');

    if (!data.choices?.[0]?.message?.content) {
      console.error('❌ Invalid OpenAI response structure:', data);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Invalid response from OpenAI' })
      };
    }

    const content = data.choices[0].message.content.trim();
    console.log('📝 Raw OpenAI content:', content);

    // Parse keywords
    let keywords = [];
    try {
      keywords = JSON.parse(content);
      console.log('✅ Keywords parsed successfully:', keywords);
    } catch (parseError) {
      console.log('⚠️ JSON parsing failed, extracting keywords manually');
      
      // Extract keywords from text if JSON parsing fails
      const matches = content.match(/\[([^\]]+)\]/);
      if (matches) {
        try {
          keywords = JSON.parse(`[${matches[1]}]`);
        } catch {
          keywords = matches[1]
            .split(',')
            .map(k => k.trim().replace(/['"]/g, ''))
            .filter(k => k.length > 0);
        }
      } else {
        // Fallback: split by lines or commas
        keywords = content
          .split(/[,\n]/)
          .map(k => k.trim().replace(/^[-•\d.]\s*/, '').replace(/['"]/g, ''))
          .filter(k => k.length > 2);
      }
    }

    // Ensure we have valid keywords
    if (!Array.isArray(keywords) || keywords.length === 0) {
      console.log('⚠️ No keywords extracted, using fallback');
      keywords = [
        detectedBrand || 'quality',
        detectedCategory || 'item', 
        detectedStyle || 'stylish',
        detectedColor || 'classic',
        'excellent condition',
        'authentic',
        'fast shipping',
        'great deal'
      ].filter(Boolean);
    }

    // Clean up keywords
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
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        success: false
      })
    };
  }
};