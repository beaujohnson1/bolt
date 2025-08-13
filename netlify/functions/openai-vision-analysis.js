const OpenAI = require('openai');
const { z } = require('zod');
const { config, validateConfig } = require('./_shared/config.cjs');

// Import enhanced AI optimization services
// Note: These would be implemented as separate modules in a real deployment
const enhancedOCRProcessor = {
  async processOCRText(text) {
    // Enhanced OCR processing with pattern recognition
    const brands = this.extractBrands(text);
    const sizes = this.extractSizes(text);
    const materials = this.extractMaterials(text);
    
    return {
      extractedData: { brands, sizes, materials },
      confidence: 0.8,
      processingTime: 100
    };
  },
  
  extractBrands(text) {
    const brandPatterns = [
      /\b(nike|adidas|puma|under armour|reebok|new balance|converse)\b/i,
      /\b(ralph lauren|polo|tommy hilfiger|calvin klein|hugo boss)\b/i,
      /\b(gap|old navy|banana republic|j\.crew|jcrew)\b/i,
      /\b(levi'?s|wrangler|lee|true religion|diesel)\b/i
    ];
    
    const found = [];
    brandPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) found.push(matches[0]);
    });
    
    return [...new Set(found)];
  },
  
  extractSizes(text) {
    const sizePatterns = [
      /\b(xs|sm?|md?|lg?|xl{1,3}|[2-9]xl)\b/i,
      /\b(small|medium|large|extra large)\b/i,
      /\b\d{1,2}(\.\d)?\b/
    ];
    
    const found = [];
    sizePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) found.push(matches[0]);
    });
    
    return [...new Set(found)];
  },
  
  extractMaterials(text) {
    const materialPatterns = [
      /\b(cotton|poly|polyester|wool|silk|linen|rayon|viscose)\b/i,
      /\b(spandex|elastane|lycra|modal|bamboo|cashmere)\b/i,
      /\b(denim|canvas|leather|suede|fleece|jersey)\b/i
    ];
    
    const found = [];
    materialPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) found.push(matches[0]);
    });
    
    return [...new Set(found)];
  }
};

const enhancedBrandDetector = {
  async detectBrands(text, priceHint) {
    const brands = enhancedOCRProcessor.extractBrands(text);
    return brands.map(brand => ({
      brand: this.normalizeBrandName(brand),
      confidence: 0.9,
      matchType: 'exact'
    }));
  },
  
  normalizeBrandName(brand) {
    const corrections = {
      'polo': 'Polo Ralph Lauren',
      'levis': "Levi's",
      'j.crew': 'J.Crew',
      'north face': 'The North Face'
    };
    
    return corrections[brand.toLowerCase()] || brand;
  }
};

const enhancedSizeProcessor = {
  async processSize(size) {
    const sizeMap = {
      'xs': 'Extra Small',
      'sm': 'Small', 's': 'Small',
      'md': 'Medium', 'm': 'Medium',
      'lg': 'Large', 'l': 'Large',
      'xl': 'Extra Large',
      'xxl': '2X Large', '2xl': '2X Large'
    };
    
    const normalized = size.toLowerCase().trim();
    const standardSize = sizeMap[normalized] || size;
    
    return [{
      standardSize,
      confidence: 0.95,
      ebayCompliant: true
    }];
  }
};

const enhancedTitleOptimizer = {
  async optimizeTitle(components) {
    const parts = [];
    const seenTerms = new Set(); // Track terms to avoid duplicates
    
    // Helper function to add unique terms
    const addUnique = (term) => {
      if (!term) return;
      const cleanTerm = term.trim();
      const lowerTerm = cleanTerm.toLowerCase();
      
      // Skip if we've already added this term or a variant
      if (seenTerms.has(lowerTerm)) return;
      
      // Also check for partial matches to avoid "Gap" and "Gap Trousers"
      const hasPartialMatch = Array.from(seenTerms).some(existing => 
        existing.includes(lowerTerm) || lowerTerm.includes(existing)
      );
      
      if (!hasPartialMatch) {
        parts.push(cleanTerm);
        seenTerms.add(lowerTerm);
      }
    };
    
    // Add components in priority order, avoiding duplicates
    addUnique(components.brand);
    addUnique(components.itemType);
    
    if (components.gender && components.gender !== 'unisex') {
      const genderFormatted = components.gender === 'men' ? "Men's" : 
                             components.gender === 'women' ? "Women's" : 
                             components.gender;
      addUnique(genderFormatted);
    }
    
    if (components.size) addUnique(components.size);
    if (components.color) addUnique(components.color);
    if (components.material) addUnique(components.material);
    
    // Add high-value keywords that don't duplicate existing terms
    const keywords = ['Authentic', 'Premium', 'Quality'];
    keywords.forEach(keyword => addUnique(keyword));
    
    const optimizedTitle = parts.join(' ').substring(0, 80);
    
    return {
      optimizedTitle,
      confidence: 0.85,
      seoScore: 75,
      keywordCount: parts.length
    };
  }
};

const realTimeAccuracyMonitor = {
  async recordAccuracyMetrics(userId, itemId, metrics) {
    console.log('📊 [ACCURACY-MONITOR] Recording metrics:', {
      userId, itemId,
      overallAccuracy: metrics.overallAccuracy,
      processingTime: metrics.processingTime
    });
    
    // In production, this would store to database
    return Promise.resolve();
  }
};

// Define the expected AI response schema
const AiListing = z.object({
  title: z.string().min(3).max(80),
  brand: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']).or(z.string()).or(z.null()).optional().default('good'),
  category: z.string().optional().default('clothing'),
  color: z.string().nullable().optional(),
  item_type: z.string().min(2),
  gender: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  pattern: z.string().nullable().optional(),
  style_keywords: z.array(z.string()).optional().default([]),
  fit: z.string().nullable().optional(),
  closure: z.string().nullable().optional(),
  sleeve_length: z.string().nullable().optional(),
  neckline: z.string().nullable().optional(),
  suggested_price: z.number().positive().optional(),
  confidence: z.number().min(0).max(1).optional().default(0.5),
  key_features: z.array(z.string()).optional().default([]),
  keywords: z.array(z.string()).optional().default([]),
  ebay_keywords: z.array(z.string()).optional().default([]),
  model_number: z.string().nullable().optional(),
  description: z.string().optional().default(''),
  style_details: z.string().nullable().optional(),
  season: z.string().nullable().optional(),
  occasion: z.string().nullable().optional(),
  evidence: z.object({
    brand: z.enum(['ocr', 'vision', 'null']).optional(),
    size: z.enum(['ocr', 'vision', 'null']).optional()
  }).optional(),
  ebay_item_specifics: z.object({
    Brand: z.string().nullable().optional(),
    Department: z.enum(['Men', 'Women', 'Unisex Adult', 'Boys', 'Girls']).nullable().optional(),
    Type: z.string().nullable().optional(),
    'Size Type': z.enum(['Regular', 'Plus', 'Petite', 'Big & Tall', 'Maternity']).nullable().optional(),
    Size: z.string().nullable().optional(),
    Color: z.string().nullable().optional(),
    Material: z.string().nullable().optional(),
    Pattern: z.string().nullable().optional(),
    'Sleeve Length': z.string().nullable().optional(),
    Neckline: z.string().nullable().optional(),
    Fit: z.string().nullable().optional(),
    Closure: z.string().nullable().optional(),
    Occasion: z.string().nullable().optional(),
    Season: z.string().nullable().optional(),
    Style: z.string().nullable().optional(),
    Features: z.string().nullable().optional()
  }).optional().default({})
});

// Strip markdown code fences if present
const stripFences = (s) => {
  const str = String(s || '');
  return str.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
};

// Safe JSON parsing with fence stripping
function safeParseJson(maybeJson) {
  try {
    const cleaned = stripFences(maybeJson);
    return JSON.parse(cleaned);
  } catch (parseError) {
    console.error('❌ [JSON-PARSE] Failed to parse JSON:', parseError);
    console.log('📝 [JSON-PARSE] Raw content:', sSub(cleaned || maybeJson, 0, 200));
    return null;
  }
}

// Safe string helpers for server-side processing
function safeTrim(v) {
  return String(v || "").trim();
}

function toStr(v) {
  return v == null ? "" : String(v);
}

function safeStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch (e) {
    return "{}";
  }
}

// Safe substring helper to prevent reference errors
function sSub(str, start, end = undefined) {
  const s = String(str || '');
  return end === undefined ? s.substring(start) : s.substring(start, end);
}

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
    
    const { 
      imageUrls, 
      imageUrl, // Legacy support
      ocrText = '', 
      candidates = {}, 
      analysisType = 'enhanced_listing',
      ebayAspects = [],
      knownFields = {}
    } = requestData;

    // Support both new array format and legacy single URL
    const imageArray = imageUrls || (imageUrl ? [imageUrl] : []);
    
    if (!imageArray || imageArray.length === 0) {
      console.error('❌ [OPENAI-FUNCTION] No image URLs provided');
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'imageUrls or imageUrl is required',
          received_keys: Object.keys(requestData)
        })
      };
    }

    // Check configuration using shared config
    const configIssues = validateConfig();
    if (configIssues.length > 0) {
      console.error('❌ [OPENAI-FUNCTION] Configuration issues:', configIssues);
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'OpenAI API key not configured' })
      };
    }

    console.log('🔑 [OPENAI-FUNCTION] OpenAI API key is configured');
    console.log('🖼️ [OPENAI-FUNCTION] Processing images:', {
      count: imageArray.length,
      ocrTextLength: toStr(ocrText).length,
      hasCandidates: Object.keys(candidates).length > 0,
      ebayAspectsCount: Array.isArray(ebayAspects) ? ebayAspects.length : 0,
      hasKnownFields: Object.keys(knownFields).length > 0
    });

    const openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    console.log('🤖 [OPENAI-FUNCTION] Calling OpenAI API...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return only valid JSON. Do not use code fences." },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: getAnalysisPrompt(analysisType, ocrText, candidates, ebayAspects, knownFields)
            },
            // Send up to 3 images to the LLM to avoid timeout
            ...imageArray.slice(0, 3).map(url => ({
              type: "image_url",
              image_url: {
                url: url,
                detail: "high"
              }
            }))
          ]
        }
      ],
      max_tokens: 2500
    });

    console.log('✅ [OPENAI-FUNCTION] OpenAI API call successful');
    console.log('📊 [OPENAI-FUNCTION] Response usage:', response.usage);
    
    let raw = response.choices[0]?.message?.content || "";
    
    // Debug logging (temporary - remove later)
    console.log("[SERVER] typeof raw:", typeof raw);
    console.log("[SERVER] raw preview:", typeof raw === "string" ? raw.slice(0, 120) : raw);
    
    if (!raw) {
      console.error('❌ [OPENAI-FUNCTION] No content in OpenAI response');
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ 
          ok: false,
          error: 'No analysis content returned from OpenAI',
          response_structure: {
            choices_length: response.choices?.length || 0,
            has_message: !!response.choices?.[0]?.message,
            has_content: !!response.choices?.[0]?.message?.content
          }
        })
      };
    }
    
    // Ensure raw is a string and strip any potential fences
    if (typeof raw !== "string") raw = JSON.stringify(raw);
    const clean = stripFences(raw);
    
    // Parse on the server
    let parsedAnalysis;
    try {
      parsedAnalysis = safeParseJson(clean);
      console.log('✅ [OPENAI-FUNCTION] Successfully parsed JSON on server');
      console.log('📊 [OPENAI-FUNCTION] Parsed keys:', parsedAnalysis ? Object.keys(parsedAnalysis) : 'null');
    } catch (parseError) {
      console.error('❌ [OPENAI-FUNCTION] Failed to parse JSON on server:', parseError);
      console.log('📝 [OPENAI-FUNCTION] Raw content that failed to parse:', sSub(clean, 0, 200));
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          ok: false,
          error: 'Failed to parse AI response as JSON',
          raw_preview: sSub(clean, 0, 200)
        })
      };
    }

    // Validate the parsed response against our schema
    if (!parsedAnalysis) {
      console.error('❌ [OPENAI-FUNCTION] Parsed analysis is null');
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          ok: false,
          error: 'AI_JSON_PARSE_FAILED',
          message: 'Could not parse AI response as valid JSON'
        })
      };
    }

    console.log('🔍 [OPENAI-FUNCTION] Validating AI response against schema...');
    const validated = AiListing.safeParse(parsedAnalysis);
    
    if (!validated.success) {
      console.error('❌ [OPENAI-FUNCTION] AI response validation failed:', validated.error);
      console.error('❌ [OPENAI-FUNCTION] Validation error structure:', JSON.stringify(validated.error, null, 2));
      
      // Create a fallback item with minimum required fields
      console.log('🔧 [OPENAI-FUNCTION] Creating fallback item from OCR candidates...');
      const fallbackItem = {
        title: candidates.brand ? `${candidates.brand} Item` : 'Item - Review Required',
        brand: candidates.brand || null,
        size: candidates.size || null,
        condition: candidates.condition || 'good',
        category: 'clothing',
        color: null,
        item_type: 'Item',
        gender: null,
        material: null,
        pattern: null,
        style_keywords: [],
        fit: null,
        closure: null,
        sleeve_length: null,
        neckline: null,
        suggested_price: 25,
        confidence: 0.3,
        key_features: ['requires manual review'],
        keywords: candidates.brand ? [candidates.brand] : ['item'],
        ebay_keywords: [],
        model_number: null,
        description: 'Item requires manual review and categorization',
        style_details: null,
        season: null,
        occasion: null,
        evidence: {
          brand: candidates.brand ? 'ocr' : 'null',
          size: candidates.size ? 'ocr' : 'null'
        },
        ebay_item_specifics: {
          Brand: candidates.brand || null,
          Department: null,
          Type: 'Item',
          'Size Type': 'Regular',
          Size: candidates.size || null,
          Color: null,
          Material: null,
          Pattern: null,
          'Sleeve Length': null,
          Neckline: null,
          Fit: null,
          Closure: null,
          Occasion: null,
          Season: null,
          Style: null,
          Features: null
        }
      };
      
      console.log('✅ [OPENAI-FUNCTION] Fallback item created successfully');
      
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          ok: true,
          data: fallbackItem,
          validation_warning: 'Used fallback due to schema validation failure',
          original_issues: validated.error?.errors?.map(e => ({ 
            path: e.path?.join('.') || 'unknown', 
            message: e.message || 'unknown error',
            received: e.received 
          })) || []
        })
      };
    }

    console.log('✅ [OPENAI-FUNCTION] AI response validated successfully');
    console.log('📊 [OPENAI-FUNCTION] Validated data keys:', Object.keys(validated.data));

    // ===== ENHANCED AI ACCURACY OPTIMIZATIONS =====
    const startTime = Date.now();
    const enhancedData = { ...validated.data };
    let accuracyMetrics = {
      overallAccuracy: 75,
      brandAccuracy: 70,
      sizeAccuracy: 65,
      titleQuality: 80,
      ocrConfidence: 85,
      processingTime: 0
    };

    try {
      console.log('🚀 [AI-OPTIMIZATION] Starting enhanced processing...');

      // 1. Enhanced OCR Processing
      if (ocrText && ocrText.length > 0) {
        console.log('🔍 [ENHANCED-OCR] Processing OCR text...');
        const ocrResult = await enhancedOCRProcessor.processOCRText(ocrText);
        
        // Enhance brand detection with OCR insights
        if (ocrResult.extractedData.brands.length > 0 && !enhancedData.brand) {
          enhancedData.brand = ocrResult.extractedData.brands[0];
          accuracyMetrics.brandAccuracy = 85;
          console.log('✅ [ENHANCED-OCR] Enhanced brand from OCR:', enhancedData.brand);
        }
        
        // Enhance size detection with OCR insights
        if (ocrResult.extractedData.sizes.length > 0 && !enhancedData.size) {
          const sizeMatches = await enhancedSizeProcessor.processSize(ocrResult.extractedData.sizes[0]);
          if (sizeMatches.length > 0) {
            enhancedData.size = sizeMatches[0].standardSize;
            accuracyMetrics.sizeAccuracy = 90;
            console.log('✅ [ENHANCED-OCR] Enhanced size from OCR:', enhancedData.size);
          }
        }
        
        // Enhance materials
        if (ocrResult.extractedData.materials.length > 0 && !enhancedData.material) {
          enhancedData.material = ocrResult.extractedData.materials[0];
          console.log('✅ [ENHANCED-OCR] Enhanced material from OCR:', enhancedData.material);
        }
        
        accuracyMetrics.ocrConfidence = ocrResult.confidence * 100;
      }

      // 2. Enhanced Brand Detection
      if (enhancedData.brand) {
        console.log('🏷️ [BRAND-DETECTOR] Refining brand detection...');
        const brandMatches = await enhancedBrandDetector.detectBrands(
          `${enhancedData.brand} ${ocrText}`, 
          enhancedData.suggested_price
        );
        
        if (brandMatches.length > 0) {
          enhancedData.brand = brandMatches[0].brand;
          accuracyMetrics.brandAccuracy = brandMatches[0].confidence * 100;
          console.log('✅ [BRAND-DETECTOR] Refined brand:', enhancedData.brand);
        }
      }

      // 3. Enhanced Size Standardization
      if (enhancedData.size) {
        console.log('📏 [SIZE-PROCESSOR] Standardizing size...');
        const sizeMatches = await enhancedSizeProcessor.processSize(enhancedData.size);
        
        if (sizeMatches.length > 0 && sizeMatches[0].ebayCompliant) {
          enhancedData.size = sizeMatches[0].standardSize;
          accuracyMetrics.sizeAccuracy = sizeMatches[0].confidence * 100;
          console.log('✅ [SIZE-PROCESSOR] Standardized size:', enhancedData.size);
        }
      }

      // 4. Enhanced Title Optimization
      console.log('🏷️ [TITLE-OPTIMIZER] Optimizing title...');
      const titleComponents = {
        brand: enhancedData.brand,
        itemType: enhancedData.item_type,
        gender: enhancedData.gender,
        size: enhancedData.size,
        color: enhancedData.color,
        material: enhancedData.material,
        keywords: enhancedData.keywords || []
      };
      
      const titleOptimization = await enhancedTitleOptimizer.optimizeTitle(titleComponents);
      if (titleOptimization.optimizedTitle) {
        enhancedData.title = titleOptimization.optimizedTitle;
        accuracyMetrics.titleQuality = titleOptimization.seoScore;
        console.log('✅ [TITLE-OPTIMIZER] Optimized title:', enhancedData.title);
      }

      // 5. Calculate overall accuracy
      accuracyMetrics.overallAccuracy = (
        accuracyMetrics.brandAccuracy * 0.25 +
        accuracyMetrics.sizeAccuracy * 0.25 +
        accuracyMetrics.titleQuality * 0.25 +
        accuracyMetrics.ocrConfidence * 0.25
      );

      accuracyMetrics.processingTime = Date.now() - startTime;

      // 6. Record metrics for monitoring
      await realTimeAccuracyMonitor.recordAccuracyMetrics(
        'system', // userId placeholder
        'item_' + Date.now(), // itemId placeholder
        accuracyMetrics
      );

      console.log('🎯 [AI-OPTIMIZATION] Enhancement complete:', {
        processingTime: accuracyMetrics.processingTime + 'ms',
        overallAccuracy: accuracyMetrics.overallAccuracy.toFixed(1) + '%',
        improvements: [
          enhancedData.brand !== validated.data.brand ? 'brand' : null,
          enhancedData.size !== validated.data.size ? 'size' : null,
          enhancedData.title !== validated.data.title ? 'title' : null,
          enhancedData.material !== validated.data.material ? 'material' : null
        ].filter(Boolean)
      });

    } catch (optimizationError) {
      console.error('⚠️ [AI-OPTIMIZATION] Error during enhancement (continuing with original):', optimizationError);
      // Continue with original data if optimization fails
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: true,
        data: enhancedData,
        accuracyMetrics,
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

function getAnalysisPrompt(analysisType, ocrText = '', candidates = {}, ebayAspects = [], knownFields = {}) {
  console.log('📝 [OPENAI-FUNCTION] Generating prompt for analysis type:', analysisType);
  console.log('📝 [OPENAI-FUNCTION] Prompt context:', {
    ocrTextLength: toStr(ocrText).length,
    candidatesProvided: Object.keys(candidates),
    ebayAspectsCount: Array.isArray(ebayAspects) ? ebayAspects.length : 0,
    knownFieldsProvided: Object.keys(knownFields)
  });
  
  // Define comprehensive eBay clothing item specifics
  const defaultEbaySpecifics = [
    { name: 'Brand', required: true, allowedValues: null },
    { name: 'Department', required: true, allowedValues: ['Men', 'Women', 'Unisex Adult', 'Boys', 'Girls'] },
    { name: 'Type', required: true, allowedValues: null },
    { name: 'Size Type', required: true, allowedValues: ['Regular', 'Plus', 'Petite', 'Big & Tall', 'Maternity'] },
    { name: 'Size', required: true, allowedValues: null },
    { name: 'Color', required: false, allowedValues: null },
    { name: 'Material', required: false, allowedValues: ['Cotton', 'Polyester', 'Wool', 'Silk', 'Denim', 'Leather', 'Cashmere', 'Linen', 'Spandex', 'Viscose', 'Modal', 'Bamboo'] },
    { name: 'Pattern', required: false, allowedValues: ['Solid', 'Striped', 'Plaid', 'Floral', 'Animal Print', 'Abstract', 'Geometric', 'Polka Dot', 'Paisley', 'Camouflage'] },
    { name: 'Sleeve Length', required: false, allowedValues: ['Short Sleeve', 'Long Sleeve', '3/4 Sleeve', 'Sleeveless', 'Cap Sleeve'] },
    { name: 'Neckline', required: false, allowedValues: ['Crew Neck', 'V-Neck', 'Scoop Neck', 'Boat Neck', 'Off Shoulder', 'High Neck', 'Cowl Neck'] },
    { name: 'Fit', required: false, allowedValues: ['Slim', 'Regular', 'Relaxed', 'Oversized', 'Tailored', 'Loose'] },
    { name: 'Closure', required: false, allowedValues: ['Button', 'Zip', 'Pullover', 'Snap', 'Hook & Eye', 'Tie'] },
    { name: 'Occasion', required: false, allowedValues: ['Casual', 'Business', 'Party', 'Wedding', 'Work', 'Travel', 'Beach', 'Athletic'] },
    { name: 'Season', required: false, allowedValues: ['Spring', 'Summer', 'Fall', 'Winter', 'All Seasons'] },
    { name: 'Style', required: false, allowedValues: ['Vintage', 'Classic', 'Modern', 'Bohemian', 'Preppy', 'Gothic', 'Streetwear', 'Minimalist'] },
    { name: 'Features', required: false, allowedValues: ['Pockets', 'Lined', 'Embroidered', 'Sequined', 'Beaded', 'Pleated', 'Ruffled'] }
  ];
  
  // Use provided eBay aspects or fall back to comprehensive defaults
  const effectiveEbayAspects = (Array.isArray(ebayAspects) && ebayAspects.length > 0) ? ebayAspects : defaultEbaySpecifics;
  
  const basePrompt = `You are an expert eBay listing optimizer specializing in clothing and fashion items. Your goal is to create titles that maximize visibility and sales on eBay AND complete comprehensive eBay item specifics.

EBAY TITLE OPTIMIZATION STRATEGY:
- Create titles with FORMAT: Brand + Item Type + Gender + Size + Color + Style Keywords + Materials
- MAXIMUM 80 characters - every character counts!
- Use eBay-specific keywords that buyers search for
- Include style descriptors like "Preppy", "Vintage", "Casual", "Business", "Athletic"
- Add material keywords like "Cotton", "Wool", "Polyester", "Denim", "Leather"
- Include pattern/print keywords like "Striped", "Plaid", "Floral", "Solid", "Graphic"
- Add fit descriptors like "Slim Fit", "Regular", "Relaxed", "Oversized"

CRITICAL EXTRACTION REQUIREMENTS:
- LOOK FOR BRAND NAMES AND TEXT VISIBLE IN THE IMAGE - examine logos, graphics, text prints carefully
- If you can read text in the image (like "Wall Street Bull", brand names, sizes), extract it for the TITLE
- Brand names in graphic designs should go in the BRAND field (e.g., "Wall Street Bull" -> brand: "Wall Street Bull")  
- Text visible in graphics should become part of the title (e.g., "Wall Street Bull Hoodie")

GENDER DETECTION (CRITICAL FOR EBAY):
- Analyze cut, style, and design to determine: "Men", "Women", "Unisex", "Boys", "Girls"
- Look for feminine details (darts, curved seams, fitted waist)
- Look for masculine details (straight cuts, boxy fit, wider shoulders)
- Check for kids' styling if smaller sizes

STYLE KEYWORD EXTRACTION:
- Extract style descriptors: Preppy, Vintage, Casual, Formal, Business, Athletic, Streetwear, Bohemian, Gothic, Punk, Classic, Modern
- Extract occasion keywords: Work, Party, Date Night, Vacation, Beach, School, Office, Wedding, Cocktail
- Extract aesthetic keywords: Minimalist, Boho, Edgy, Romantic, Sporty, Elegant, Trendy

MATERIAL & FABRIC ANALYSIS:
- Identify fabrics visually: Cotton, Denim, Wool, Cashmere, Silk, Polyester, Spandex, Linen, Leather, Suede
- Look for fabric texture in images
- Extract material info from care labels

DETAILED SIZE EXTRACTION:
- EXAMINE ALL CLOTHING TAGS AND LABELS VERY CAREFULLY FOR SIZE INFORMATION:
  * Look for size tags sewn into garments (neck tags, side seams, waistbands)
  * Check care labels which often contain size info (S, M, L, XL, numeric sizes)
  * Look for size printed on fabric tags (like "MEDIUM", "L", "32x34")
  * Examine any visible text on clothing for size indicators
  * Check for European sizes (38, 40, 42), US sizes (S, M, L), or numeric sizes (2, 4, 6, 8)
  * Look for kids sizes (2T, 4T, 6Y) or shoe sizes if applicable

PATTERN & DESIGN ANALYSIS:
- Identify patterns: Solid, Striped, Plaid, Checkered, Floral, Paisley, Animal Print, Abstract, Geometric
- Identify design elements: Embroidered, Printed, Graphic, Logo, Text, Applique, Sequined, Beaded

EBAY KEYWORD OPTIMIZATION:
- Generate 5-10 eBay-specific search keywords buyers use
- Include trending fashion terms and seasonal keywords
- Add descriptive adjectives that improve searchability
- Consider synonyms and alternative terms

VALIDATION RULES:
- If you cannot verify a field from the image or OCR, return null (NEVER use the word "Unknown")
- Prefer OCR text over visual guesses when available, but use vision when OCR is empty
- Use provided CANDIDATES when they match what you see
- Choose ONLY from allowed values when provided for eBay aspects
- Be extremely specific with item types and descriptions
- Report evidence for how you determined brand/size (ocr|vision|null)

CANDIDATES (pre-extracted from OCR):
${safeStringify(candidates)}

KNOWN_FIELDS (from previous analysis):
${safeStringify(knownFields)}

OCR_TEXT:
${toStr(ocrText)}`;

  // Add eBay aspects prompt with comprehensive specifics
  const ebayAspectsPrompt = `

EBAY ITEM SPECIFICS (REQUIRED - fill these comprehensively):
${safeStringify(effectiveEbayAspects)}

CRITICAL EBAY REQUIREMENTS:
- Brand: REQUIRED - Extract from image/OCR or set to "Unbranded" if no brand visible
- Department: REQUIRED - Choose from: Men, Women, Unisex Adult, Boys, Girls (analyze fit/cut/style)
- Type: REQUIRED - Specific item type (Shirt, Pants, Dress, Jacket, etc.)
- Size Type: REQUIRED - Usually "Regular" unless clearly Plus, Petite, Big & Tall, or Maternity
- Size: REQUIRED - Extract from tags/labels or estimate from visual cues
- Color: RECOMMENDED - Primary color or color combination
- Material: RECOMMENDED - Fabric type from visual texture or care labels
- Pattern: RECOMMENDED - Visual pattern analysis
- Style details: RECOMMENDED - Fit, closure, sleeve length, neckline, occasion, season, style, features

For each aspect:
- If allowedValues exist, choose the BEST MATCH from the list
- If no allowedValues, provide concise descriptive text
- For REQUIRED fields, never return null - make best educated guess
- For RECOMMENDED fields, return null only if completely indeterminate
- Use eBay-standard terminology that buyers search for`;

  const schemaPrompt = `

Return ONLY JSON matching this schema:
{
  "title": string (MAX 80 chars, format: Brand Item Gender Size Color Keywords),
  "brand": string|null,
  "size": string|null,
  "item_type": string,
  "gender": string|null (Men/Women/Unisex/Boys/Girls),
  "color": string|null,
  "material": string|null (Cotton/Wool/Polyester/etc),
  "pattern": string|null (Solid/Striped/Plaid/etc),
  "fit": string|null (Slim/Regular/Relaxed/Oversized),
  "closure": string|null (Button Up/Zip/Pullover),
  "sleeve_length": string|null (Short/Long/3/4/Tank),
  "neckline": string|null (Crew/V-Neck/Scoop),
  "condition": "new"|"like_new"|"good"|"fair"|"poor",
  "style_keywords": string[] (style descriptors like Preppy, Casual, Vintage),
  "keywords": string[] (general keywords),
  "ebay_keywords": string[] (eBay-specific search terms),
  "key_features": string[],
  "suggested_price": number,
  "description": string,
  "evidence": {
    "brand": "ocr|vision|null",
    "size": "ocr|vision|null"
  },
  "ebay_item_specifics": {
    "Brand": string|null,
    "Department": "Men"|"Women"|"Unisex Adult"|"Boys"|"Girls"|null,
    "Type": string|null,
    "Size Type": "Regular"|"Plus"|"Petite"|"Big & Tall"|"Maternity"|null,
    "Size": string|null,
    "Color": string|null,
    "Material": string|null,
    "Pattern": string|null,
    "Sleeve Length": string|null,
    "Neckline": string|null,
    "Fit": string|null,
    "Closure": string|null,
    "Occasion": string|null,
    "Season": string|null,
    "Style": string|null,
    "Features": string|null
  }
}

TITLE EXAMPLES:
- "Ralph Lauren Shirt Men L Blue Button Up Preppy Cotton"
- "Nike Hoodie Women M Black Athletic Pullover Fleece"
- "Levi's Jeans Men 32x34 Dark Blue Straight Fit Denim"

Do NOT include markdown or code fences.`;

  const fullPrompt = basePrompt + ebayAspectsPrompt + schemaPrompt;

  console.log('✅ [OPENAI-FUNCTION] Prompt generated successfully');
  return fullPrompt;
}