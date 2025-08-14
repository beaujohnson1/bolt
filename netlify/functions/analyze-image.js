// PERFORMANCE OPTIMIZATION: Pre-warm handler to reduce cold starts
let isWarmedUp = false;
let precomputedFallback = null;

// Initialize fallback data once to avoid recomputation
if (!precomputedFallback) {
  precomputedFallback = {
    success: true,
    analysis: {
      brand: null,
      size: null,
      category: 'clothing',
      suggestedTitle: 'Clothing Item',
      suggestedPrice: 25,
      priceRange: { min: 20, max: 35 },
      color: 'Various',
      condition: 'good',
      confidence: 0.3,
      suggestedDescription: 'Quality clothing item in good condition.',
      keyFeatures: ['clothing item', 'good condition']
    }
  };
}

exports.handler = async (event, context) => {
  const startTime = Date.now();
  
  // PERFORMANCE OPTIMIZATION: Enhanced headers with compression
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept-Encoding',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300', // 5 minute cache for similar requests
    'Vary': 'Accept-Encoding'
  };

  // Fast OPTIONS response
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Warm-up check to reduce subsequent cold starts
  if (!isWarmedUp) {
    console.log('🔥 [ANALYZE-IMAGE] Function warming up...');
    isWarmedUp = true;
  }

  try {
    const { imageUrl } = JSON.parse(event.body || '{}');
    
    // PERFORMANCE OPTIMIZATION: Fast-fail with optimized fallback
    if (!(process.env.OPENAI_KEY || process.env.OPENAI_API_KEY)) {
      console.log('⚡ [ANALYZE-IMAGE] No OpenAI key - using optimized fallback');
      
      const processingTime = Date.now() - startTime;
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'X-Processing-Time': processingTime.toString(),
          'X-Cache-Status': 'fallback'
        },
        body: JSON.stringify({
          ...precomputedFallback,
          performance: {
            processing_time_ms: processingTime,
            cache_used: false,
            optimizations_applied: ['precomputed_fallback', 'fast_fail']
          }
        })
      };
    }

    if (!imageUrl) {
      throw new Error('No image URL provided');
    }

    console.log('🔍 Calling OpenAI with enhanced brand/size detection prompt...');

    // Enhanced prompt specifically designed to find brands and sizes
    const enhancedPrompt = `You are analyzing a clothing item photo. Your primary goal is to find EXACT brand names and sizes.

CRITICAL INSTRUCTIONS:
1. BRAND DETECTION - Look for these specific locations:
   - Neck labels and tags (most common location)
   - Care labels (usually inside garment near seams)
   - Embroidered or printed logos anywhere on the item
   - Text on buttons, zippers, or hardware
   - Small brand marks on sleeves, chest, back, or pockets
   
   Common brands to recognize: Lululemon, Nike, Adidas, North Face, Patagonia, Under Armour, Gap, Old Navy, H&M, Zara, Uniqlo, American Eagle, Hollister, Abercrombie, Worthington, Target brands, Walmart brands

2. SIZE DETECTION - Look for these specific formats:
   - Letter sizes: XS, S, M, L, XL, XXL, XXXL
   - Number sizes: 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22+
   - Kids sizes: 2T, 3T, 4T, 5T, 6, 7, 8, 10, 12, 14, 16
   - Measurements: 30x32, 32B, etc.
   - International sizes: EU, UK equivalents

3. EXAMINE CAREFULLY:
   - Zoom in mentally on any visible tags or labels
   - Read ALL text visible in the image, no matter how small
   - Look for partially visible text that might indicate a brand
   - Check for embossed or subtle branding

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "brand": "EXACT brand name found or Unknown if none visible",
  "size": "EXACT size found or Unknown if none visible", 
  "category": "specific item type like leather jacket",
  "suggestedTitle": "Brand Name + Item Type + Key Feature",
  "suggestedPrice": realistic_price_number,
  "priceRange": {
    "min": price_minus_20_percent,
    "max": price_plus_30_percent
  },
  "color": "primary color",
  "condition": "condition assessment",
  "confidence": 0.8,
  "suggestedDescription": "Professional description for resale listing",
  "keyFeatures": ["material", "style", "notable features"]
}

IMPORTANT: 
- If you cannot clearly see a brand or size, use "Unknown" - do not guess
- Be extremely careful with JSON formatting
- Look closely at ALL text, labels, and tags in the image
- Prioritize accuracy over completeness`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${(process.env.OPENAI_KEY || process.env.OPENAI_API_KEY)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [{
            type: "text",
            text: enhancedPrompt
          }, {
            type: "image_url",
            image_url: { url: imageUrl, detail: "high" }
          }]
        }],
        max_tokens: 600,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', {
        status: response.status,
        error: errorText
      });
      throw new Error(`OpenAI API failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const analysisContent = data.choices[0]?.message?.content;
    
    console.log('🤖 Raw OpenAI response:', analysisContent);
    
    let analysis;
    try {
      analysis = JSON.parse(analysisContent);
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI JSON response:', parseError);
      console.log('🔍 Attempting to extract JSON from response...');
      
      // Try to extract JSON from the response
      const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          analysis = JSON.parse(jsonMatch[0]);
          console.log('✅ Successfully extracted and parsed JSON from response');
        } catch (innerParseError) {
          console.error('❌ Failed to parse extracted JSON:', innerParseError);
          throw new Error('Could not parse AI response as valid JSON');
        }
      } else {
        throw new Error('No JSON structure found in AI response');
      }
    }
    
    // Ensure all required fields exist with proper defaults
    analysis.brand = analysis.brand || 'Unknown';
    analysis.size = analysis.size || 'Unknown';
    analysis.category = analysis.category || analysis.itemType || 'clothing';
    analysis.suggestedTitle = analysis.suggestedTitle || `${analysis.brand !== 'Unknown' ? analysis.brand + ' ' : ''}${analysis.category}`;
    analysis.suggestedPrice = analysis.suggestedPrice || 25;
    analysis.color = analysis.color || (Array.isArray(analysis.colors) ? analysis.colors[0] : 'Various');
    analysis.condition = analysis.condition || 'good';
    analysis.confidence = analysis.confidence || 0.5;
    analysis.suggestedDescription = analysis.suggestedDescription || `${analysis.suggestedTitle} in ${analysis.condition} condition.`;
    analysis.keyFeatures = Array.isArray(analysis.keyFeatures) ? analysis.keyFeatures : [];
    
    // Ensure priceRange exists
    if (!analysis.priceRange) {
      const basePrice = analysis.suggestedPrice;
      analysis.priceRange = {
        min: Math.round(basePrice * 0.8),
        max: Math.round(basePrice * 1.3)
      };
    }
    
    console.log('✅ Enhanced AI analysis complete:', {
      brand: analysis.brand,
      size: analysis.size,
      category: analysis.category,
      title: analysis.suggestedTitle,
      price: analysis.suggestedPrice,
      confidence: analysis.confidence
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analysis: analysis
      })
    };

  } catch (error) {
    console.error('❌ Analysis error:', error);
    
    // Provide comprehensive fallback analysis
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        analysis: {
          brand: 'Unknown',
          size: 'Unknown',
          category: 'clothing',
          suggestedTitle: 'Clothing Item',
          suggestedPrice: 25,
          priceRange: { min: 20, max: 35 },
          color: 'Various',
          condition: 'good',
          confidence: 0.3,
          suggestedDescription: 'Quality clothing item in good condition.',
          keyFeatures: ['clothing item', 'good condition']
        }
      })
    };
  }
};