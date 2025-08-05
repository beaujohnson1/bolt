import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY,
});

// Primary clothing analysis function
export const analyzeClothingItem = async (imageBase64) => {
  const prompt = `You are an expert clothing reseller analyzing items for online marketplace listing. Analyze this clothing item photo and return a JSON response with the following information:

{
  "brand": "exact brand name if visible",
  "item_type": "specific clothing type (e.g., 'hoodie', 'leggings', 'jacket')",
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

  try {
    console.log('🤖 [OPENAI] Starting GPT-4 Vision analysis...');
    
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
      max_tokens: 500,
      temperature: 0.1
    });

    console.log('✅ [OPENAI] GPT-4 Vision response received');
    const result = JSON.parse(response.choices[0].message.content);
    console.log('📊 [OPENAI] Parsed result:', result);
    
    return {
      success: true,
      data: result,
      source: 'openai-vision'
    };
  } catch (error) {
    console.error('❌ [OPENAI] Vision API Error:', error);
    return {
      success: false,
      error: error.message,
      source: 'openai-vision'
    };
  }
};

// Tag-specific analysis for close-up tag photos
export const analyzeClothingTags = async (imageBase64) => {
  const prompt = `You are analyzing a close-up photo of clothing tags/labels. Extract ALL visible text and identify:

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

  try {
    console.log('🏷️ [OPENAI] Starting tag-specific analysis...');
    
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
      max_tokens: 400,
      temperature: 0.1
    });

    console.log('✅ [OPENAI] Tag analysis response received');
    const result = JSON.parse(response.choices[0].message.content);
    console.log('📊 [OPENAI] Tag analysis result:', result);
    
    return {
      success: true,
      data: result,
      source: 'openai-tags'
    };
  } catch (error) {
    console.error('❌ [OPENAI] Tag Analysis Error:', error);
    return {
      success: false,
      error: error.message,
      source: 'openai-tags'
    };
  }
};

// Helper function to convert file to base64 (for client-side use)
export const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

// Test function to verify OpenAI connection
export const testOpenAIConnection = async () => {
  try {
    console.log('🧪 [OPENAI] Testing connection...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: "Hello, this is a test. Please respond with 'OpenAI connection successful'."
        }
      ],
      max_tokens: 50
    });

    console.log('✅ [OPENAI] Connection test successful');
    return {
      success: true,
      message: response.choices[0].message.content
    };
  } catch (error) {
    console.error('❌ [OPENAI] Connection test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};