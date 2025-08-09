const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

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
    const { 
      imageUrls, 
      ocrText = '', 
      candidates = {}, 
      analysisType = 'enhanced_listing',
      ebayAspects = []
    } = JSON.parse(event.body || '{}');

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          ok: false,
          error: 'imageUrls array is required' 
        })
      };
    }

    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ [OPENAI-FUNCTION] OPENAI_API_KEY environment variable not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          ok: false,
          error: 'OpenAI API key not configured' 
        })
      };
    }

    console.log('🤖 [OPENAI-FUNCTION] Processing images:', {
      count: imageUrls.length,
      ocrTextLength: ocrText.length,
      hasCandidates: Object.keys(candidates).length > 0
    });

    // Enhanced prompt for clothing analysis
    const prompt = `You are analyzing clothing item photos for eBay listing creation.

CRITICAL INSTRUCTIONS:
1. BRAND DETECTION - Look for these specific locations:
   - Neck labels and tags (most common location)
   - Care labels (usually inside garment near seams)
   - Embroidered or printed logos anywhere on the item
   - Text on buttons, zippers, or hardware
   
2. SIZE DETECTION - Look for these specific formats:
   - Letter sizes: XS, S, M, L, XL, XXL, XXXL
   - Number sizes: 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22+
   - Measurements: 30x32, 32B, etc.

3. Use provided CANDIDATES when they match what you see:
${JSON.stringify(candidates)}

4. OCR TEXT to help identify details:
${ocrText}

Return ONLY valid JSON:
{
  "title": "Brand + Item Type + Color + Size",
  "brand": "exact brand name or null",
  "size": "exact size or null",
  "item_type": "specific item type",
  "color": "primary color or null",
  "condition": "new|like_new|good|fair|poor",
  "keywords": ["seo", "keywords", "for", "listing"],
  "key_features": ["notable", "features"],
  "suggested_price": 25,
  "description": "Professional description for resale",
  "confidence": 0.8
}`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return only valid JSON. Do not use code fences." },
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...imageUrls.map(url => ({
              type: "image_url",
              image_url: { url: url, detail: "high" }
            }))
          ]
        }
      ],
      max_tokens: 1500
    });

    const rawContent = response.choices[0]?.message?.content || "";
    
    if (!rawContent) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          ok: false,
          error: 'No content returned from OpenAI' 
        })
      };
    }

    // Parse JSON response
    let analysisData;
    try {
      analysisData = JSON.parse(rawContent);
    } catch (parseError) {
      console.error('❌ [OPENAI-FUNCTION] Failed to parse JSON:', parseError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Failed to parse AI response as JSON',
          raw_preview: rawContent.substring(0, 200)
        })
      };
    }

    // Validate required fields
    if (!analysisData.title || !analysisData.item_type) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'AI_VALIDATION_FAILED',
          message: 'Missing required fields in AI response'
        })
      };
    }

    console.log('✅ [OPENAI-FUNCTION] Analysis completed successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        data: analysisData,
        usage: response.usage
      })
    };

  } catch (error) {
    console.error('❌ [OPENAI-FUNCTION] Critical error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: error.message,
        error_type: error.name
      })
    };
  }
};