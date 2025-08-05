const OpenAI = require('openai');

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
    const { imageBase64, analysisType = 'clothing' } = JSON.parse(event.body);
    
    if (!imageBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'imageBase64 is required' })
      };
    }

    console.log('🤖 [OPENAI-FUNCTION] Starting GPT-4 Vision analysis...');
    
    let prompt;
    if (analysisType === 'tags') {
      prompt = `You are analyzing a close-up photo of clothing tags/labels. Extract ALL visible text and identify:

{
  "brand": "brand name from tag",
  "size": "size information",
  "material_composition": "fabric content if visible",
  "care_instructions": "washing instructions if visible",
  "style_number": "any style/item numbers",
  "country_of_origin": "made in location",
  "all_visible_text": ["every", "piece", "of", "text", "you", "can", "read"],
  "tag_type": "size tag, care label, brand tag, etc.",
  "confidence_score": 0.95
}

Be extremely thorough in reading ALL text, even if partially obscured. Return ONLY the JSON object.`;
    } else {
      prompt = `You are an expert clothing reseller analyzing items for online marketplace listing. Analyze this clothing item photo and return a JSON response with the following information:

{
  "brand": "exact brand name if visible",
  "item_type": "specific clothing type (e.g., 'hoodie', 'leggings', 'jacket')",
  "model_number": "any model or style number visible on the item or tags",
  "size": "size from tag if visible",
  "color": "primary color description",
  "condition": "estimated condition (New, Like New, Good, Fair)",
  "key_features": ["list", "of", "notable", "features"],
  "tags_text": "any text visible on tags or labels",
  "confidence_score": 0.95,
  "needs_human_review": false,
  "marketplace_title": "suggested listing title",
  "estimated_price_range": "$XX-$XX"
}

Focus especially on identifying these premium brands: Lululemon, Nike, North Face, Carhartt, Patagonia, Athleta, Under Armour, Adidas, Champion, Columbia, Gap, Old Navy, Banana Republic, J.Crew, American Eagle, Hollister, Abercrombie, Forever 21, H&M, Zara, Uniqlo.

If you cannot clearly identify brand or size, set confidence_score below 0.7 and needs_human_review to true.

Return ONLY the JSON object, no additional text.`;
    }
    
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: analysisType === 'tags' ? 400 : 500,
      temperature: 0.1
    });

    console.log('✅ [OPENAI-FUNCTION] GPT-4 Vision response received');
    const result = JSON.parse(response.choices[0].message.content);
    console.log('📊 [OPENAI-FUNCTION] Parsed result:', result);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: result,
        source: `openai-${analysisType}`,
        usage: response.usage
      })
    };
  } catch (error) {
    console.error('❌ [OPENAI-FUNCTION] Vision API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        source: 'openai-function'
      })
    };
  }
};