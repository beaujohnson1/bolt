const OpenAI = require('openai');

exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    console.log('🚀 [OPENAI-FUNCTION] Function started');
    console.log('📥 [OPENAI-FUNCTION] Request method:', event.httpMethod);
    console.log('📥 [OPENAI-FUNCTION] Has body:', !!event.body);
    console.log('📥 [OPENAI-FUNCTION] Body length:', event.body ? event.body.length : 0);

    if (event.httpMethod !== 'POST') {
      console.error('❌ [OPENAI-FUNCTION] Invalid method:', event.httpMethod);
      return {
        statusCode: 405,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    let requestData;
    try {
      requestData = JSON.parse(event.body || '{}');
      console.log('📊 [OPENAI-FUNCTION] Parsed request data keys:', Object.keys(requestData));
    } catch (parseError) {
      console.error('❌ [OPENAI-FUNCTION] Failed to parse request body:', parseError);
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: parseError.message 
        })
      };
    }
    
    const { imageUrl, analysisType = 'comprehensive' } = requestData;

    if (!imageUrl) {
      console.error('❌ [OPENAI-FUNCTION] No imageUrl provided');
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'imageUrl is required',
          received_keys: Object.keys(requestData)
        })
      };
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ [OPENAI-FUNCTION] OPENAI_API_KEY environment variable not set');
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    console.log('🔑 [OPENAI-FUNCTION] OpenAI API key is configured');
    console.log('🖼️ [OPENAI-FUNCTION] Image URL type:', typeof imageUrl);
    console.log('🖼️ [OPENAI-FUNCTION] Image URL length:', imageUrl.length);
    console.log('🖼️ [OPENAI-FUNCTION] Image URL starts with:', imageUrl.substring(0, 50));

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('🤖 [OPENAI-FUNCTION] Calling OpenAI API...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: getAnalysisPrompt(analysisType)
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high" // Important for clothing analysis
              }
            }
          ]
        }
      ],
      max_tokens: 1500, // Increase token limit
      temperature: 0.1  // Lower temperature for consistent results
    });

    console.log('✅ [OPENAI-FUNCTION] OpenAI API call successful');
    console.log('📊 [OPENAI-FUNCTION] Response usage:', response.usage);
    
    const analysis = response.choices[0]?.message?.content;
    
    if (!analysis) {
      console.error('❌ [OPENAI-FUNCTION] No content in OpenAI response');
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          error: 'No analysis content returned from OpenAI',
          response_structure: {
            choices_length: response.choices?.length || 0,
            has_message: !!response.choices?.[0]?.message,
            has_content: !!response.choices?.[0]?.message?.content
          }
        })
      };
    }
    
    console.log('📝 [OPENAI-FUNCTION] Analysis content length:', analysis.length);
    console.log('📝 [OPENAI-FUNCTION] Analysis preview:', analysis.substring(0, 200));

    // Try to parse as JSON if it looks like JSON
    let parsedAnalysis = analysis;
    if (analysis.trim().startsWith('{') && analysis.trim().endsWith('}')) {
      try {
        parsedAnalysis = JSON.parse(analysis);
        console.log('✅ [OPENAI-FUNCTION] Successfully parsed JSON response');
      } catch (parseError) {
        console.log('⚠️ [OPENAI-FUNCTION] Could not parse as JSON, returning as text');
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: true,
        analysis: parsedAnalysis,
        usage: response.usage
      })
    };

  } catch (error) {
    console.error('❌ [OPENAI-FUNCTION] Critical error:', error);
    console.error('❌ [OPENAI-FUNCTION] Error name:', error.name);
    console.error('❌ [OPENAI-FUNCTION] Error message:', error.message);
    console.error('❌ [OPENAI-FUNCTION] Error stack:', error.stack);

    // Return detailed error info for debugging
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        error_name: error.name,
        error_type: typeof error,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};

function getAnalysisPrompt(analysisType) {
  console.log('📝 [OPENAI-FUNCTION] Generating prompt for analysis type:', analysisType);
  
  const prompt = `You are an expert at analyzing clothing and fashion items for online resale listings. 

Analyze this image and provide a detailed response in VALID JSON format only. Do not include any text before or after the JSON.

Return this exact JSON structure:
{
  "title": "Brand Name + Item Type + Key Feature (e.g., 'Lululemon Align Tank Top Black Size M')",
  "brand": "exact brand name or 'Unknown'",
  "size": "exact size found or 'Unknown'",
  "condition": "like_new/good/fair/poor",
  "category": "clothing/shoes/accessories/other",
  "color": "primary color name",
  "item_type": "specific item type (tank top, jeans, dress, etc.)",
  "suggested_price": 25,
  "confidence": 0.8,
  "key_features": ["feature1", "feature2", "feature3"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "model_number": "style number or model if visible",
  "description": "Professional description for marketplace listing"
}

IMPORTANT: 
- Look carefully for brand labels, tags, and any text in the image
- Be conservative with pricing - suggest realistic resale prices
- Return ONLY the JSON object, no other text
- If you cannot determine something, use the fallback values shown above`;

  console.log('✅ [OPENAI-FUNCTION] Prompt generated successfully');
  return prompt;
}