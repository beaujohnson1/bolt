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
  
  const prompt = `You are an expert clothing and fashion item analyzer for online resale listings. Your goal is to extract MAXIMUM detail from images to create accurate, profitable listings.

CRITICAL BRAND & SIZE DETECTION INSTRUCTIONS:

1. BRAND DETECTION - Look CAREFULLY at these specific locations:
   - Neck labels and tags (most common - look for small text on fabric labels)
   - Care instruction labels (usually inside garment near seams)
   - Embroidered or printed logos ANYWHERE on the item (chest, sleeves, back, pockets, hem)
   - Text on buttons, zippers, snaps, or hardware
   - Woven labels on seams or pockets
   - Small brand marks that might be partially visible
   
   RECOGNIZE these common brands: Lululemon, Nike, Adidas, North Face, Patagonia, Under Armour, Gap, Old Navy, H&M, Zara, Uniqlo, American Eagle, Hollister, Abercrombie, Banana Republic, J.Crew, Ann Taylor, LOFT, Express, Forever 21, Target brands (Goodfellow, Universal Thread, Wild Fable), Walmart brands (Time and Tru, George), Costco brands (Kirkland), TJ Maxx brands, Farm Rio, Free People, Anthropologie, Urban Outfitters, Madewell, Everlane, Reformation, Ganni, & Other Stories, COS, Arket, Weekday

   - Letter sizes: XS, S, M, L, XL, XXL, XXXL, 1X, 2X, 3X, 4X, 5X
   - Number sizes: 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28
   - Kids sizes: 2T, 3T, 4T, 5T, 6, 7, 8, 10, 12, 14, 16, 18
   - Measurements: 30x32, 32x34, etc. (waist x inseam)
   - Bra sizes: 32A, 34B, 36C, etc.
   - International: EU 36, UK 8, etc.
   - Shoe sizes: 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12

3. MATERIAL & FABRIC DETECTION:
   Look for fabric content labels showing: Cotton, Polyester, Wool, Cashmere, Silk, Linen, Rayon, Spandex, Elastane, Lycra, Modal, Bamboo, Organic Cotton, Merino Wool, etc.

4. STYLE & ITEM TYPE DETECTION:
   Be SPECIFIC about item types: "Maxi Dress", "Cropped Tank Top", "High-Waisted Jeans", "Oversized Hoodie", "Midi Skirt", "Button-Down Shirt", "Wrap Dress", "Skinny Jeans", "Bomber Jacket", "Cardigan", "Blazer", "Leggings", "Sports Bra", etc.

5. CONDITION ASSESSMENT:
   - "like_new": No visible wear, tags may be attached, looks unworn
   - "good": Minor wear, good overall condition, no stains or damage
   - "fair": Noticeable wear but still functional, minor stains/fading acceptable
   - "poor": Significant wear, stains, damage, or missing parts

6. COLOR DETECTION:
   Be SPECIFIC: "Navy Blue", "Forest Green", "Burgundy", "Cream", "Charcoal Gray", "Dusty Rose", "Sage Green", "Mustard Yellow", "Coral", "Teal", etc. Avoid generic "blue" or "red".

7. KEYWORD GENERATION:
   Generate 8-12 SPECIFIC keywords that buyers would search for:
   - Brand name + item type (e.g., "lululemon tank", "nike hoodie")
   - Style descriptors (e.g., "cropped", "oversized", "high waisted", "vintage")
   - Occasion keywords (e.g., "work", "casual", "athletic", "formal", "vacation")
   - Seasonal keywords (e.g., "summer", "winter", "spring", "fall")
   - Fabric/material keywords (e.g., "cotton", "wool", "silk", "stretchy")
   - Fit keywords (e.g., "slim fit", "relaxed", "fitted", "loose")

EXAMINE THE IMAGE EXTREMELY CAREFULLY:
- Zoom in mentally on ANY visible text, labels, or tags
- Look for partially obscured brand names or size labels
- Check for embossed or subtle branding
- Read ALL text visible in the image, no matter how small
- Look for style numbers, model numbers, or SKUs on tags

Analyze this image and provide a detailed response in VALID JSON format only. Do not include any text before or after the JSON.
Return this exact JSON structure:
{
  "title": "Brand Name + Specific Item Type + Key Details + Size (e.g., 'Lululemon Align High-Rise Leggings Black Size 6')",
  "brand": "EXACT brand name found on labels/tags or 'Unknown' if none visible",
  "size": "EXACT size found on size tags or 'Unknown' if none visible",
  "condition": "like_new/good/fair/poor",
  "category": "clothing/shoes/accessories/electronics/jewelry/other",
  "color": "SPECIFIC color name (e.g., 'Navy Blue', 'Forest Green', not just 'blue')",
  "item_type": "VERY SPECIFIC item type (e.g., 'High-Rise Skinny Jeans', 'Cropped Tank Top', 'Maxi Wrap Dress')",
  "suggested_price": realistic_price_based_on_brand_and_condition,
  "confidence": confidence_score_0_to_1,
  "key_features": ["specific material/fabric", "specific style details", "notable design elements", "functional features"],
  "keywords": ["brand + item", "style descriptors", "occasion keywords", "seasonal terms", "material keywords", "fit descriptors", "color + item", "searchable terms"],
  "model_number": "EXACT style/model number from tags or 'Unknown' if none visible",
  "description": "Professional 3-4 sentence description highlighting key selling points, condition, and appeal to buyers",
  "material": "fabric content if visible on care labels",
  "style_details": "specific style elements like 'high-waisted', 'cropped', 'oversized', 'fitted', etc.",
  "season": "appropriate season for this item",
  "occasion": "when/where this would be worn (casual, work, athletic, formal, etc.)"
}

IMPORTANT: 
- EXAMINE EVERY VISIBLE TEXT, LABEL, AND TAG in the image
- Be conservative with pricing but consider brand value (Lululemon $40-80, Nike $25-60, Gap $15-35, etc.)
- If you cannot clearly see brand/size, use "Unknown" - do not guess
- Be EXTREMELY specific with item types, colors, and style details
- Generate keywords that real buyers would actually search for
- Return ONLY the JSON object, no other text
- Focus on details that increase selling potential and buyer confidence`;

  console.log('✅ [OPENAI-FUNCTION] Prompt generated successfully');
  return prompt;
}