exports.handler = async (event, context) => {
  // DEBUG: Verify this updated function is being called
  console.log('🚨 UPDATED ANALYZE-IMAGE FUNCTION CALLED - Version 2.0');
  console.log('📅 Function timestamp:', new Date().toISOString());
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  console.log('🔍 Starting detailed AI analysis...');

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
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not found');
      throw new Error('OpenAI API key not configured');
    }

    const requestBody = JSON.parse(event.body || '{}');
    const { imageUrl } = requestBody;
    
    console.log('📸 Analyzing image for brand and details:', imageUrl);

    if (!imageUrl) {
      throw new Error('No image URL provided');
    }

    // ENHANCED PROMPT - Same approach that's working for keywords
    const prompt = `You are a professional clothing appraiser and reseller. Analyze this clothing item image with extreme attention to detail.

CRITICAL INSTRUCTIONS:
1. Look for ANY brand tags, labels, or text - even if small or partially visible
2. Identify the SPECIFIC type of clothing item (not just "clothing")  
3. Determine the actual material (leather, cotton, wool, etc.)
4. Read any visible text on tags or labels carefully

WHAT TO LOOK FOR:
🔍 BRAND IDENTIFICATION (HIGHEST PRIORITY):
- Brand name on clothing tags/labels
- Size tags often show brand names
- Care instruction labels
- Any visible brand text or logos
- Look in collar areas, inside garments, size tags

🔍 SPECIFIC ITEM TYPE:
- What exactly is this? (leather jacket, wool coat, cotton shirt, denim jacket, etc.)
- Not just "clothing" - be specific about the item type

🔍 MATERIAL IDENTIFICATION:  
- What material can you observe? (genuine leather, cotton, wool, polyester, etc.)
- Look at texture, sheen, and appearance

🔍 PHYSICAL DETAILS:
- Exact colors you can see
- Size information if visible on any tags
- Condition assessment
- Style details (collar type, closure, pockets, etc.)

Return this EXACT JSON format:
{
  "brand": "Exact brand name if visible on any tags/labels (look carefully!), or 'Unknown' only if no brand text visible",
  "category": "Specific item type like 'leather jacket' or 'wool sweater' - NOT just 'clothing'",
  "suggestedTitle": "Descriptive title using brand and specific item type",
  "suggestedPrice": realistic_price_based_on_brand_and_condition,
  "priceRange": {
    "min": price_minus_20_percent,
    "max": price_plus_30_percent
  },
  "color": "Primary color description", 
  "material": "Specific material type observed",
  "condition": "Condition assessment based on visible wear/damage",
  "style": "Style description",
  "size": "Size if visible on tags",
  "confidence": confidence_score_0_to_1,
  "description": "Professional description for resale listing",
  "keyFeatures": ["list", "of", "key", "features", "detected"]
}

IMPORTANT: Actually examine the image carefully for text and brand information. This analysis is critical for accurate resale listings.`;

    console.log('🤖 Calling OpenAI with detailed brand detection prompt...');

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
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 600,
        temperature: 0.1 // Very low temperature for precise reading
      })
    });

    console.log('📡 OpenAI analysis response status:', openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ OpenAI API Error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    console.log('✅ OpenAI analysis response received');

    if (!data.choices?.[0]?.message?.content) {
      console.error('❌ Invalid OpenAI response structure');
      throw new Error('Invalid response from OpenAI');
    }

    const content = data.choices[0].message.content.trim();
    console.log('📝 Raw analysis result:', content);

    let analysis;
    try {
      analysis = JSON.parse(content);
      
      // Ensure priceRange exists to prevent 'min' error
      if (!analysis.priceRange) {
        const basePrice = analysis.suggestedPrice || 25;
        analysis.priceRange = {
          min: Math.round(basePrice * 0.8),
          max: Math.round(basePrice * 1.3)
        };
        console.log('⚠️ Added missing priceRange to analysis:', analysis.priceRange);
      }
      
      console.log('✅ Analysis parsed successfully:', analysis);
    } catch (parseError) {
      console.error('❌ Failed to parse analysis JSON');
      throw parseError;
    }

    // Validate and ensure required fields
    if (!analysis.brand) analysis.brand = 'Unknown';
    if (!analysis.category) analysis.category = 'clothing';
    if (!analysis.suggestedTitle) analysis.suggestedTitle = 'Pre-owned Item';
    if (!analysis.suggestedPrice) analysis.suggestedPrice = 25;
    
    // Ensure priceRange exists with proper structure
    if (!analysis.priceRange || !analysis.priceRange.min || !analysis.priceRange.max) {
      const basePrice = analysis.suggestedPrice || 25;
      analysis.priceRange = {
        min: Math.round(basePrice * 0.8),
        max: Math.round(basePrice * 1.3)
      };
      console.log('⚠️ Fixed missing priceRange in validation:', analysis.priceRange);
    }
    
    // Ensure keyFeatures exists
    if (!analysis.keyFeatures) {
      analysis.keyFeatures = [];
    }

    console.log('🎯 Final analysis result:', analysis);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analysis: analysis
      })
    };

  } catch (error) {
    console.error('💥 Analysis function error:', error);
    
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
          priceRange: {
            min: 20,
        success: true,
        analysis: {
          brand: 'Unknown',
          category: 'clothing', 
          suggestedTitle: 'Pre-owned Fashion Item',
          suggestedPrice: 25,
          priceRange: {
            min: 20,
            max: 32
          },
          color: 'Various',
          material: 'Mixed Materials',
          condition: 'good',
          style: 'Classic',
          confidence: 0.2,
          description: 'Quality pre-owned item.',
          keyFeatures: [],
          error: 'Analysis failed, using fallback'
        }
      })
    };
  }
};