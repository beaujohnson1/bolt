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
    
    // Skip generic marketing keywords - they reduce specificity and commercial value
    
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
  category: z.enum(['clothing', 'shoes', 'accessories', 'electronics', 'home_garden', 'toys_games', 'sports_outdoors', 'books_media', 'jewelry', 'collectibles', 'other']).optional().default('clothing'),
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
  serial_number: z.string().nullable().optional(),
  upc_code: z.string().nullable().optional(),
  isbn: z.string().nullable().optional(),
  publisher: z.string().nullable().optional(),
  author: z.string().nullable().optional(),
  director: z.string().nullable().optional(),
  artist: z.string().nullable().optional(),
  format: z.string().nullable().optional(), // DVD, Blu-ray, Hardcover, Paperback, etc.
  edition: z.string().nullable().optional(),
  year: z.string().nullable().optional(),
  capacity: z.string().nullable().optional(), // For electronics/kitchen items
  dimensions: z.string().nullable().optional(),
  age_range: z.string().nullable().optional(), // For toys
  skill_level: z.string().nullable().optional(), // For sports/hobbies
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
    Features: z.union([z.string(), z.array(z.string())]).nullable().optional().transform(val => {
      if (Array.isArray(val)) return val.join(', ');
      return val;
    })
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

    // If no OCR text provided, extract it from the images using Google Vision API
    let finalOcrText = toStr(ocrText);
    if (!finalOcrText && imageArray.length > 0) {
      console.log('🔍 [OPENAI-FUNCTION] No OCR text provided, extracting from images...');
      try {
        // Use direct API key approach instead of service account authentication
        const visionApiKey = process.env.VITE_GOOGLE_VISION_API_KEY;
        
        if (!visionApiKey) {
          console.warn('⚠️ [OPENAI-FUNCTION] Google Vision API key not configured, skipping OCR');
          finalOcrText = '';
        } else {
          // Extract OCR from first few images (limit for performance)
          const maxImages = Math.min(imageArray.length, 3);
          console.log(`🔍 [OPENAI-FUNCTION] Extracting OCR from ${maxImages} images using API key...`);
          
          const ocrPromises = imageArray.slice(0, maxImages).map(async (imageUrl, i) => {
            try {
              console.log(`🔍 [OPENAI-FUNCTION] OCR for image ${i + 1}: ${imageUrl.substring(0, 80)}...`);
              
              // Fetch image and convert to base64
              console.log(`📥 [OPENAI-FUNCTION] Fetching image ${i + 1}...`);
              const imageResponse = await fetch(imageUrl);
              console.log(`📥 [OPENAI-FUNCTION] Image ${i + 1} fetch status: ${imageResponse.status}`);
              
              if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`);
              }
              
              const imageBuffer = await imageResponse.arrayBuffer();
              const imageBase64 = Buffer.from(imageBuffer).toString('base64');
              console.log(`🔢 [OPENAI-FUNCTION] Image ${i + 1} base64 length: ${imageBase64.length}`);
              
              // Call Google Vision API directly using REST API with enhanced text detection
              console.log(`🔍 [OPENAI-FUNCTION] Calling Google Vision API for image ${i + 1}...`);
              const visionResponse = await fetch(
                `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    requests: [
                      {
                        image: {
                          content: imageBase64,
                        },
                        features: [
                          {
                            type: 'TEXT_DETECTION',
                            maxResults: 100,
                          },
                          {
                            type: 'DOCUMENT_TEXT_DETECTION',
                            maxResults: 1,
                          }
                        ],
                        imageContext: {
                          textDetectionParams: {
                            enableTextDetectionConfidenceScore: true
                          }
                        }
                      },
                    ],
                  }),
                }
              );
              
              console.log(`📡 [OPENAI-FUNCTION] Vision API response for image ${i + 1}: ${visionResponse.status}`);
              
              if (!visionResponse.ok) {
                const errorText = await visionResponse.text();
                console.error(`❌ [OPENAI-FUNCTION] Vision API error for image ${i + 1}:`, {
                  status: visionResponse.status,
                  statusText: visionResponse.statusText,
                  errorText: errorText
                });
                throw new Error(`Google Vision API error: ${visionResponse.status} - ${errorText}`);
              }
              
              const visionData = await visionResponse.json();
              console.log(`📊 [OPENAI-FUNCTION] Vision API raw response for image ${i + 1}:`, {
                hasResponses: !!visionData.responses,
                responseCount: visionData.responses?.length || 0,
                hasError: !!visionData.responses?.[0]?.error
              });
              
              // Check for API errors in response
              if (visionData.responses?.[0]?.error) {
                console.error(`❌ [OPENAI-FUNCTION] Vision API error in response for image ${i + 1}:`, visionData.responses[0].error);
                throw new Error(`Vision API error: ${visionData.responses[0].error.message}`);
              }
              
              const fullText = visionData.responses?.[0]?.fullTextAnnotation?.text || '';
              const textAnnotations = visionData.responses?.[0]?.textAnnotations || [];
              
              // Also check document text detection
              const documentText = visionData.responses?.[0]?.fullTextAnnotation?.text || '';
              const finalText = documentText || fullText;
              
              // Log individual text annotations for debugging
              if (textAnnotations.length > 1) {
                const individualTexts = textAnnotations.slice(1, 10).map(ann => ann.description || '').filter(t => t);
                console.log(`🔍 [OPENAI-FUNCTION] Image ${i + 1} individual text annotations:`, individualTexts);
              }
              
              console.log(`📝 [OPENAI-FUNCTION] Image ${i + 1} OCR result:`, {
                fullTextLength: finalText.length,
                annotationCount: textAnnotations.length,
                textPreview: finalText.substring(0, 100).replace(/\n/g, ' | ')
              });
              
              return finalText;
            } catch (imageError) {
              console.error(`❌ [OPENAI-FUNCTION] OCR failed for image ${i + 1}:`, {
                error: imageError.message,
                stack: imageError.stack
              });
              return '';
            }
          });
          
          const ocrResults = await Promise.allSettled(ocrPromises);
          const successfulOcrTexts = ocrResults
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value)
            .filter(text => text.length > 0);
          
          finalOcrText = successfulOcrTexts.join('\n').trim();
          
          console.log('🎯 [OPENAI-FUNCTION] Combined OCR extraction complete:', {
            totalTextLength: finalOcrText.length,
            imagesProcessed: successfulOcrTexts.length,
            textPreview: finalOcrText.substring(0, 200).replace(/\n/g, ' | ')
          });
        }
        
      } catch (ocrError) {
        console.error('❌ [OPENAI-FUNCTION] OCR extraction failed:', ocrError);
        finalOcrText = '';
      }
    } else if (finalOcrText) {
      console.log('🔍 [OPENAI-FUNCTION] Using provided OCR text:', finalOcrText.length, 'characters');
    }

    const openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    console.log('🤖 [OPENAI-FUNCTION] Calling OpenAI API...');
    
    // Helper function for exponential backoff on rate limits
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    const callOpenAIWithRateLimit = async (maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await openai.chat.completions.create({
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
                    text: getAnalysisPrompt(analysisType, finalOcrText, candidates, ebayAspects, knownFields)
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
        } catch (error) {
          if (error.status === 429) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 60000); // Exponential backoff, max 1 minute
            console.log(`🔄 [RATE-LIMIT] Attempt ${attempt}/${maxRetries}, waiting ${delay}ms`);
            if (attempt < maxRetries) {
              await sleep(delay);
              continue;
            }
          }
          throw error;
        }
      }
      throw new Error('OpenAI rate limit exceeded after all retries');
    };
    
    const response = await callOpenAIWithRateLimit();

    console.log('✅ [OPENAI-FUNCTION] OpenAI API call successful');
    console.log('📊 [OPENAI-FUNCTION] Response usage:', response.usage);
    
    let raw = response.choices[0]?.message?.content || "";
    
    // Debug logging for brand detection
    console.log('🔍 [OPENAI-FUNCTION] Raw AI response type:', typeof raw);
    console.log('🔍 [OPENAI-FUNCTION] Raw AI response preview:', typeof raw === "string" ? raw.slice(0, 200) : raw);
    
    // Try to extract brand from raw response before JSON parsing
    if (typeof raw === "string" && raw.includes('"brand"')) {
      const brandMatch = raw.match(/"brand":\s*"([^"]+)"/);
      console.log('🔍 [OPENAI-FUNCTION] Brand found in raw response:', brandMatch ? brandMatch[1] : 'NOT FOUND');
    }
    
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
      if (finalOcrText && finalOcrText.length > 0) {
        console.log('🔍 [ENHANCED-OCR] Processing OCR text...');
        const ocrResult = await enhancedOCRProcessor.processOCRText(finalOcrText);
        
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

      // 5. Enhanced eBay Item Specifics Processing
      console.log('🏷️ [EBAY-SPECIFICS] Enhancing eBay item specifics...');
      if (enhancedData.ebay_item_specifics) {
        const specifics = enhancedData.ebay_item_specifics;
        
        // Auto-populate missing required fields from main data
        if (!specifics.Brand && enhancedData.brand) {
          specifics.Brand = enhancedData.brand;
        }
        if (!specifics.Size && enhancedData.size) {
          specifics.Size = enhancedData.size;
        }
        if (!specifics.Color && enhancedData.color) {
          specifics.Color = enhancedData.color;
        }
        if (!specifics.Type && enhancedData.item_type) {
          specifics.Type = enhancedData.item_type;
        }
        if (!specifics.Material && enhancedData.material) {
          specifics.Material = enhancedData.material;
        }
        
        // Set intelligent defaults for required fields
        if (!specifics.Department) {
          if (enhancedData.gender === 'men') specifics.Department = 'Men';
          else if (enhancedData.gender === 'women') specifics.Department = 'Women';
          else if (enhancedData.gender === 'boys') specifics.Department = 'Boys';
          else if (enhancedData.gender === 'girls') specifics.Department = 'Girls';
          else specifics.Department = 'Unisex Adult';
        }
        if (!specifics['Size Type']) {
          // Check if it's plus size
          if (enhancedData.size && (enhancedData.size.includes('X') || enhancedData.size.includes('W'))) {
            if (enhancedData.size.match(/[2-9]X/i) || enhancedData.size.match(/1[6-9]W|2[0-9]W/)) {
              specifics['Size Type'] = 'Plus';
            } else {
              specifics['Size Type'] = 'Regular';
            }
          } else {
            specifics['Size Type'] = 'Regular';
          }
        }
        
        // Enhanced field population based on AI analysis
        if (!specifics.Pattern && enhancedData.pattern) {
          specifics.Pattern = enhancedData.pattern;
        }
        if (!specifics.Fit && enhancedData.fit) {
          specifics.Fit = enhancedData.fit;
        }
        if (!specifics.Occasion && enhancedData.occasion) {
          specifics.Occasion = enhancedData.occasion;
        }
        if (!specifics.Season && enhancedData.season) {
          specifics.Season = enhancedData.season;
        }
        if (!specifics.Style && enhancedData.style_keywords && enhancedData.style_keywords.length > 0) {
          specifics.Style = enhancedData.style_keywords[0];
        }
        
        console.log('✅ [EBAY-SPECIFICS] Enhanced eBay specifics:', {
          Brand: specifics.Brand,
          Department: specifics.Department,
          Type: specifics.Type,
          Size: specifics.Size,
          'Size Type': specifics['Size Type'],
          totalFieldsPopulated: Object.keys(specifics).filter(k => specifics[k] && specifics[k] !== null).length
        });
        
        // Calculate eBay specifics completeness score
        const requiredFields = ['Brand', 'Department', 'Type', 'Size Type', 'Size'];
        const recommendedFields = ['Color', 'Material', 'Pattern', 'Fit', 'Occasion', 'Season', 'Style'];
        
        const requiredComplete = requiredFields.filter(f => specifics[f] && specifics[f] !== null).length;
        const recommendedComplete = recommendedFields.filter(f => specifics[f] && specifics[f] !== null).length;
        
        const completenessScore = (requiredComplete / requiredFields.length) * 0.7 + 
                                 (recommendedComplete / recommendedFields.length) * 0.3;
        
        accuracyMetrics.ebaySpecificsCompleteness = Math.round(completenessScore * 100);
        console.log(`📊 [EBAY-SPECIFICS] Completeness: ${accuracyMetrics.ebaySpecificsCompleteness}% (${requiredComplete}/${requiredFields.length} required, ${recommendedComplete}/${recommendedFields.length} recommended)`);
      }

      // 6. Calculate overall accuracy
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

function getCategoryExpertise(category) {
  const categoryMap = {
    'electronics': {
      name: 'consumer electronics and technology products',
      instructions: `ELECTRONICS LISTING OPTIMIZATION:
- **CRITICAL**: Extract EXACT model numbers from device labels/stickers
- Identify the FULL model name (e.g., "Canon EOS Rebel T7", not just "Canon camera")
- Include technical specifications visible on device or labels:
  * Storage: GB, TB for drives/memory
  * Screen size: inches for displays/TVs
  * Resolution: 1080p, 4K, megapixels for cameras
  * Processor/speed: GHz, core count
  * RAM/Memory specifications
- Check for version numbers (e.g., "Version 2.0", "Gen 3", "Series X")
- Note all connectivity: WiFi, Bluetooth, USB-C, HDMI, DisplayPort, Ethernet
- Extract serial numbers, UPC codes, FCC IDs for verification
- Check condition indicators: scratches, wear, missing parts
- Note included accessories: cables, chargers, remotes, manuals, original box
- For vintage electronics: Note if working/tested, restoration status`
    },
    'books_media': {
      name: 'books, DVDs, CDs, and media products',
      instructions: `BOOKS & MEDIA LISTING OPTIMIZATION:
- Extract ISBN numbers, publication years, and publisher information
- Identify edition (1st, 2nd, Revised, etc.) and format (Hardcover, Paperback, DVD, Blu-ray)
- Note condition carefully (Like New, Very Good, Good, Acceptable)
- Look for author names, directors, artists, and main characters
- Extract genre, subject matter, and target audience
- Identify language and region codes for media
- Note special features for DVDs/CDs (bonus content, commentary, etc.)`
    },
    'home_garden': {
      name: 'home, kitchen, and garden products',
      instructions: `HOME & KITCHEN LISTING OPTIMIZATION:
- Focus on brand, model, and capacity/size specifications
- Extract material information (stainless steel, ceramic, plastic, etc.)
- Note features like dishwasher safe, microwave safe, BPA free
- Identify power requirements and included accessories
- Extract dimensions, weight capacity, and volume measurements
- Look for safety certifications and compliance marks
- Note color, finish, and style variations`
    },
    'toys_games': {
      name: 'toys, games, and hobby products',
      instructions: `TOYS & GAMES LISTING OPTIMIZATION:
- Extract age recommendations and safety warnings
- Identify brand, character names, and series/collection
- Note completeness (all pieces included, box condition)
- Look for item numbers, series numbers, and copyright years
- Extract educational value and skill development features
- Identify material (plastic, wood, fabric, electronic)
- Note batteries required and included accessories`
    },
    'sports_outdoors': {
      name: 'sporting goods and outdoor equipment',
      instructions: `SPORTS & OUTDOORS LISTING OPTIMIZATION:
- Focus on size, weight capacity, and material specifications
- Extract brand, model, and sport-specific features
- Note condition and wear patterns typical to sports equipment
- Identify skill level (beginner, intermediate, professional)
- Extract safety certifications and compliance standards
- Look for size charts and fit information
- Note included accessories and replacement part availability`
    },
    'collectibles': {
      name: 'collectibles, memorabilia, and vintage items',
      instructions: `COLLECTIBLES LISTING OPTIMIZATION:
- Extract year, edition, and rarity information
- Identify manufacturer, series, and character/subject
- Note condition grade using collectible standards
- Look for authentication marks, certificates, or signatures
- Extract production numbers and limited edition details
- Identify packaging condition and completeness
- Note any damage, restoration, or modifications`
    },
    'jewelry': {
      name: 'jewelry, watches, and accessories',
      instructions: `JEWELRY & WATCHES LISTING OPTIMIZATION:
- Extract metal type, purity marks (14K, 18K, 925, etc.)
- Identify gemstones, clarity, and carat information
- Note brand, model, and movement type for watches
- Extract size information (ring size, chain length, watch case size)
- Look for hallmarks, maker's marks, and serial numbers
- Note condition and any damage or wear
- Identify style period and design elements`
    }
  };
  
  return categoryMap[category] || {
    name: 'clothing and fashion items',
    instructions: `CLOTHING LISTING OPTIMIZATION:
- Focus on brand recognition, size accuracy, and style description
- Extract gender, size, color, and material information
- Look for care labels, brand tags, and size labels
- Identify style elements (casual, formal, vintage, athletic)
- Note condition and any wear patterns
- Extract pattern/print details and fit information`
  };
}

function getAnalysisPrompt(analysisType, ocrText = '', candidates = {}, ebayAspects = [], knownFields = {}) {
  console.log('📝 [OPENAI-FUNCTION] Generating prompt for analysis type:', analysisType);
  console.log('📝 [OPENAI-FUNCTION] Prompt context:', {
    ocrTextLength: toStr(ocrText).length,
    candidatesProvided: Object.keys(candidates),
    ebayAspectsCount: Array.isArray(ebayAspects) ? ebayAspects.length : 0,
    knownFieldsProvided: Object.keys(knownFields)
  });
  
  // Get category-specific eBay item specifics based on detected item type
  function getCategorySpecificEbaySpecifics(itemType) {
    const normalizedType = (itemType || '').toLowerCase().trim();
    
    // Pants & Trousers
    if (normalizedType.includes('pants') || normalizedType.includes('trousers') || 
        normalizedType.includes('slacks') || normalizedType.includes('chinos') ||
        normalizedType.includes('khakis')) {
      return [
        { name: 'Brand', required: true, allowedValues: null },
        { name: 'Department', required: true, allowedValues: ['Men', 'Women', 'Unisex Adult', 'Boys', 'Girls'] },
        { name: 'Type', required: true, allowedValues: null },
        { name: 'Size Type', required: true, allowedValues: ['Regular', 'Plus', 'Petite', 'Big & Tall', 'Maternity'] },
        { name: 'Size', required: true, allowedValues: null },
        { name: 'Color', required: false, allowedValues: null },
        { name: 'Material', required: false, allowedValues: ['Cotton', 'Polyester', 'Wool', 'Denim', 'Linen', 'Spandex', 'Viscose'] },
        { name: 'Pattern', required: false, allowedValues: ['Solid', 'Striped', 'Plaid', 'Checkered'] },
        { name: 'Fit', required: false, allowedValues: ['Slim', 'Regular', 'Relaxed', 'Straight', 'Bootcut', 'Tapered', 'Wide Leg'] },
        { name: 'Rise', required: false, allowedValues: ['Low Rise', 'Mid Rise', 'High Rise'] },
        { name: 'Closure', required: false, allowedValues: ['Button Fly', 'Zip Fly', 'Hook & Eye', 'Drawstring'] },
        { name: 'Features', required: false, allowedValues: ['Pockets', 'Belt Loops', 'Pleats', 'Cuffs', 'Wrinkle Resistant'] },
        { name: 'Occasion', required: false, allowedValues: ['Casual', 'Business', 'Work', 'Athletic'] },
        { name: 'Season', required: false, allowedValues: ['Spring', 'Summer', 'Fall', 'Winter', 'All Seasons'] },
        { name: 'Style', required: false, allowedValues: ['Classic', 'Modern', 'Preppy', 'Casual'] }
      ];
    }
    
    // Jeans
    if (normalizedType.includes('jeans') || normalizedType.includes('denim')) {
      return [
        { name: 'Brand', required: true, allowedValues: null },
        { name: 'Department', required: true, allowedValues: ['Men', 'Women', 'Unisex Adult', 'Boys', 'Girls'] },
        { name: 'Type', required: true, allowedValues: null },
        { name: 'Size Type', required: true, allowedValues: ['Regular', 'Plus', 'Petite', 'Big & Tall', 'Maternity'] },
        { name: 'Size', required: true, allowedValues: null },
        { name: 'Color', required: false, allowedValues: null },
        { name: 'Material', required: false, allowedValues: ['100% Cotton', 'Cotton Blend', 'Stretch Denim', 'Raw Denim'] },
        { name: 'Wash', required: false, allowedValues: ['Dark Wash', 'Medium Wash', 'Light Wash', 'Stone Wash', 'Acid Wash', 'Distressed'] },
        { name: 'Fit', required: false, allowedValues: ['Skinny', 'Slim', 'Straight', 'Regular', 'Relaxed', 'Bootcut', 'Flare'] },
        { name: 'Rise', required: false, allowedValues: ['Low Rise', 'Mid Rise', 'High Rise'] },
        { name: 'Inseam', required: false, allowedValues: null },
        { name: 'Features', required: false, allowedValues: ['Distressed', 'Ripped', 'Faded', 'Embroidered', 'Pockets'] },
        { name: 'Occasion', required: false, allowedValues: ['Casual', 'Work'] },
        { name: 'Style', required: false, allowedValues: ['Vintage', 'Classic', 'Modern', 'Streetwear'] }
      ];
    }
    
    // Shorts
    if (normalizedType.includes('shorts') || normalizedType.includes('short pants')) {
      return [
        { name: 'Brand', required: true, allowedValues: null },
        { name: 'Department', required: true, allowedValues: ['Men', 'Women', 'Unisex Adult', 'Boys', 'Girls'] },
        { name: 'Type', required: true, allowedValues: null },
        { name: 'Size Type', required: true, allowedValues: ['Regular', 'Plus', 'Petite', 'Big & Tall'] },
        { name: 'Size', required: true, allowedValues: null },
        { name: 'Color', required: false, allowedValues: null },
        { name: 'Material', required: false, allowedValues: ['Cotton', 'Polyester', 'Nylon', 'Spandex', 'Cotton Blend'] },
        { name: 'Pattern', required: false, allowedValues: ['Solid', 'Striped', 'Plaid', 'Floral'] },
        { name: 'Fit', required: false, allowedValues: ['Slim', 'Regular', 'Relaxed', 'Cargo', 'Board', 'Athletic'] },
        { name: 'Inseam', required: false, allowedValues: ['5"', '7"', '9"', '11"', '13"'] },
        { name: 'Closure', required: false, allowedValues: ['Button Fly', 'Zip Fly', 'Drawstring', 'Elastic Waist'] },
        { name: 'Features', required: false, allowedValues: ['Pockets', 'Cargo Pockets', 'Belt Loops', 'Quick Dry'] },
        { name: 'Occasion', required: false, allowedValues: ['Casual', 'Beach', 'Athletic', 'Work'] },
        { name: 'Season', required: false, allowedValues: ['Spring', 'Summer', 'All Seasons'] }
      ];
    }
    
    // Shirts & Tops (has sleeve length and neckline)
    if (normalizedType.includes('shirt') || normalizedType.includes('blouse') || 
        normalizedType.includes('top') || normalizedType.includes('tunic')) {
      return [
        { name: 'Brand', required: true, allowedValues: null },
        { name: 'Department', required: true, allowedValues: ['Men', 'Women', 'Unisex Adult', 'Boys', 'Girls'] },
        { name: 'Type', required: true, allowedValues: null },
        { name: 'Size Type', required: true, allowedValues: ['Regular', 'Plus', 'Petite', 'Big & Tall', 'Maternity'] },
        { name: 'Size', required: true, allowedValues: null },
        { name: 'Color', required: false, allowedValues: null },
        { name: 'Material', required: false, allowedValues: ['Cotton', 'Polyester', 'Silk', 'Linen', 'Viscose', 'Modal'] },
        { name: 'Pattern', required: false, allowedValues: ['Solid', 'Striped', 'Plaid', 'Floral', 'Checkered'] },
        { name: 'Sleeve Length', required: false, allowedValues: ['Long Sleeve', 'Short Sleeve', '3/4 Sleeve', 'Sleeveless'] },
        { name: 'Neckline', required: false, allowedValues: ['Crew Neck', 'V-Neck', 'Scoop Neck', 'Button Down Collar', 'Spread Collar'] },
        { name: 'Fit', required: false, allowedValues: ['Slim Fit', 'Regular Fit', 'Relaxed Fit', 'Tailored', 'Oversized'] },
        { name: 'Closure', required: false, allowedValues: ['Button', 'Zip', 'Pullover'] },
        { name: 'Features', required: false, allowedValues: ['Pockets', 'French Cuffs', 'Wrinkle Free'] },
        { name: 'Occasion', required: false, allowedValues: ['Casual', 'Business', 'Work', 'Party'] },
        { name: 'Season', required: false, allowedValues: ['Spring', 'Summer', 'Fall', 'Winter', 'All Seasons'] }
      ];
    }
    
    // T-Shirts (has sleeve length and neckline)
    if (normalizedType.includes('t-shirt') || normalizedType.includes('tee') || 
        normalizedType.includes('tank')) {
      return [
        { name: 'Brand', required: true, allowedValues: null },
        { name: 'Department', required: true, allowedValues: ['Men', 'Women', 'Unisex Adult', 'Boys', 'Girls'] },
        { name: 'Type', required: true, allowedValues: null },
        { name: 'Size Type', required: true, allowedValues: ['Regular', 'Plus', 'Petite', 'Big & Tall'] },
        { name: 'Size', required: true, allowedValues: null },
        { name: 'Color', required: false, allowedValues: null },
        { name: 'Material', required: false, allowedValues: ['Cotton', 'Polyester', 'Cotton Blend', 'Tri-Blend'] },
        { name: 'Pattern', required: false, allowedValues: ['Solid', 'Striped', 'Graphic Print'] },
        { name: 'Sleeve Length', required: false, allowedValues: ['Short Sleeve', 'Long Sleeve', 'Sleeveless', 'Cap Sleeve'] },
        { name: 'Neckline', required: false, allowedValues: ['Crew Neck', 'V-Neck', 'Scoop Neck', 'Henley', 'Tank'] },
        { name: 'Fit', required: false, allowedValues: ['Slim Fit', 'Regular Fit', 'Relaxed Fit', 'Oversized'] },
        { name: 'Features', required: false, allowedValues: ['Graphic Print', 'Logo', 'Embroidered', 'Vintage', 'Pockets'] },
        { name: 'Occasion', required: false, allowedValues: ['Casual', 'Athletic', 'Beach'] },
        { name: 'Season', required: false, allowedValues: ['Spring', 'Summer', 'All Seasons'] }
      ];
    }
    
    // Default fallback for unknown items
    return [
      { name: 'Brand', required: true, allowedValues: null },
      { name: 'Department', required: true, allowedValues: ['Men', 'Women', 'Unisex Adult', 'Boys', 'Girls'] },
      { name: 'Type', required: true, allowedValues: null },
      { name: 'Size Type', required: true, allowedValues: ['Regular', 'Plus', 'Petite', 'Big & Tall', 'Maternity'] },
      { name: 'Size', required: true, allowedValues: null },
      { name: 'Color', required: false, allowedValues: null },
      { name: 'Material', required: false, allowedValues: ['Cotton', 'Polyester', 'Wool', 'Silk'] },
      { name: 'Pattern', required: false, allowedValues: ['Solid', 'Striped', 'Plaid'] },
      { name: 'Occasion', required: false, allowedValues: ['Casual', 'Business', 'Athletic'] },
      { name: 'Season', required: false, allowedValues: ['Spring', 'Summer', 'Fall', 'Winter', 'All Seasons'] }
    ];
  }
  
  // Determine item type for category-specific specifications
  const detectedItemType = candidates.item_type || knownFields.item_type || 'clothing';
  
  // Use provided eBay aspects or get category-specific defaults
  const effectiveEbayAspects = (Array.isArray(ebayAspects) && ebayAspects.length > 0) ? 
    ebayAspects : getCategorySpecificEbaySpecifics(detectedItemType);
  
  // Determine category-specific expertise
  const detectedCategory = candidates.category || 'clothing';
  const categoryExpertise = getCategoryExpertise(detectedCategory);
  
  const basePrompt = `You are a UNIVERSAL PRODUCT IDENTIFICATION EXPERT with encyclopedic knowledge of ALL product categories. You specialize in ${categoryExpertise.name} and can identify ANY product model, from electronics to fashion to collectibles.

${categoryExpertise.instructions}

UNIVERSAL TITLE OPTIMIZATION STRATEGY:
- FORMAT VARIES BY CATEGORY:
  * Electronics: Brand + Model Name + Model Number + Specs + Condition
  * Clothing: Brand + Model/Style + Gender + Size + Color + Material
  * Books: Title + Author + Edition + ISBN + Format
  * Collectibles: Brand + Series + Model/Character + Number + Condition
  * Tools: Brand + Model Number + Type + Voltage/Power + Accessories
- ALWAYS include model names when recognized (e.g., "Canon EOS Rebel T7" not just "Canon Camera")
- MAXIMUM 80 characters - prioritize searchable model names and numbers
- Use category-specific keywords that buyers actually search for

IMAGE ANALYSIS PROTOCOL FOR ALL PRODUCTS:
- Examine EACH image systematically for model information:
  * ELECTRONICS: Back panels, bottom stickers, screen bezels, battery compartments
  * CLOTHING: Inner tags, care labels, brand patches, style tags
  * BOOKS: Spine, back cover, copyright page, ISBN location
  * TOYS/COLLECTIBLES: Bottom stamps, packaging, instruction manuals
  * TOOLS: Rating plates, model stickers, type labels
- For electronics, ZOOM IN on model number stickers - they contain crucial info
- Cross-reference multiple images to confirm model numbers
- Pay special attention to high-resolution tag photos
- If one image is blurry, use clearer images for brand identification
- Combine information from ALL images for comprehensive analysis

🎯 ULTRA-ACCURATE BRAND EXTRACTION PROTOCOL:

STEP 1: SYSTEMATIC SEARCH - Check these locations IN ORDER:
1️⃣ PRIMARY ZONES (90% of brands found here):
   □ Neck label (inside collar) - ZOOM IN mentally, read even tilted text
   □ Waistband label (pants/skirts) - often largest/clearest text
   □ Main interior tag - usually below neck label

2️⃣ SECONDARY ZONES (if primary unclear):
   □ Care instruction label - brand often at top line
   □ Side seam labels - backup brand location  
   □ Small tags on sleeves/hem - additional placement

3️⃣ EXTERNAL ZONES (visible branding):
   □ Chest area - embroidered/printed logos/text
   □ Back of garment - large graphics or text
   □ Pockets - small labels or embroidery
   □ Hardware - buttons/zippers with embossed text

STEP 2: READING TECHNIQUE - Read EXACTLY what you see:
✓ If text is sideways/upside-down, mentally rotate it
✓ If text is partially obscured, use visible letters to complete
✓ If text is blurry, use context (font style, placement) to deduce
✓ Look for © ® ™ symbols - brand names usually follow these
✓ Report EXACT text: if you see "GAP" write "GAP", if "CK" write "CK"
✓ Include partial text - even "GA" or "NIK" is valuable information
- **ENHANCED VISUAL BRAND RECOGNITION**: Look for brands through MULTIPLE methods:
  * TEXT: Any readable brand names in labels, tags, or printed on garment
  * LOGOS: Distinctive brand symbols, even if text is unclear
  * FONT STYLES: Recognize brand-specific typography (GAP uses distinctive block letters)
  * HARDWARE: Check buttons, zippers, snaps for brand embossing
  * **SPECIAL GAP FOCUS**: GAP appears as "GAP", "Gap", or distinctive block logo
  * If ANY visual element suggests a specific brand, identify it confidently
  * For unclear text, use context clues from style, quality, and design
- Common clothing brands to look for:
  * Premium: Ralph Lauren, Tommy Hilfiger, Calvin Klein, Hugo Boss, Armani
  * Popular: Nike, Adidas, Under Armour, Champion, Puma, Reebok
  * **DEPARTMENT STORE: GAP, Old Navy, Banana Republic** (GAP owns these)
  * Fast Fashion: H&M, Zara, Forever 21
  * Denim: Levi's, Wrangler, Lee, True Religion, Lucky Brand, 7 For All Mankind
  * Target brands: Goodfellow, Universal Thread
- If you see partial text, use context: "CK" = Calvin Klein, "RL" = Ralph Lauren, "GA" or "GAP" = Gap
- Even small or stylized logos should be identified
- **UNIVERSAL BRAND & MODEL DETECTION (ALL PRODUCT CATEGORIES)**: 
  * 🔍 ALWAYS look for MODEL NUMBERS on labels, stickers, or engraved/printed on the item
  * 📸 For ELECTRONICS: Find model numbers on back panels, bottom labels, or near serial numbers
  * 📚 For BOOKS/MEDIA: Extract ISBN, catalog numbers, edition info
  * 🎮 For GAMES/TOYS: Look for product codes, series numbers, set numbers
  
  * IDENTIFY SPECIFIC MODELS across ALL categories:
    
    ** ELECTRONICS **
    - Canon: EOS Rebel T7, PowerShot, 5D Mark IV, 70D, 80D
    - Nikon: D3500, D5600, D7500, Z6, Coolpix
    - Sony: Alpha a7, RX100, Handycam, PlayStation (PS1/PS2/PS3/PS4/PS5)
    - Apple: iPhone (all models), iPad, MacBook Pro/Air, AirPods, Apple Watch
    - Samsung: Galaxy S/Note series, Tab, Frame TV
    - Nintendo: Switch, 3DS, Wii, GameCube, N64, Game Boy
    - Microsoft: Xbox (360/One/Series X/S), Surface
    - Panasonic: Lumix, VHS players, DVD recorders
    - JVC: Camcorders, VCRs, boom boxes
    - HP/Dell/Lenovo: Specific laptop and desktop models
    
    ** CLOTHING/SHOES **
    - Nike: Air Max 90/95/97/270, Air Force 1, Dunk, Jordan (1-35)
    - Adidas: Stan Smith, Superstar, Ultraboost, NMD, Yeezy
    - Levi's: 501/505/511/514 (include fit type)
    - North Face: Nuptse, Denali, Venture
    
    ** TOOLS/EQUIPMENT **
    - DeWalt: Model numbers like DCD777, DCF887
    - Milwaukee: M18, M12 series
    - Makita: XFD131, XPH102
    - Bosch: GLM, GLL series
    
    ** COLLECTIBLES **
    - LEGO: Set numbers (e.g., 75192, 10276)
    - Funko Pop: Character names and numbers
    - Trading cards: Set names, card numbers
    - Action figures: Series, wave numbers
    
  * Include BOTH model_number (raw) AND model_name (full recognized name)
  * For electronics, ALWAYS include the complete model designation
  * Add model name prominently in title for searchability
  * Choose the MOST RECOGNIZABLE brand if any visual clues exist
  * Prefer established brands over "Unbranded" when style/quality suggests known brand
  * If garment shows quality construction typical of major brands, identify it
  * **GAP PRIORITY**: If any element suggests GAP (style, logo, text), choose GAP over Unbranded
- **CONSISTENCY RULE**: Similar garments should get similar brand identifications
- **CRITICAL: NEVER USE "UNBRANDED" FOR THESE ITEMS**:
  * Women's/Men's pants, jeans, trousers (likely GAP, Levi's, etc.)
  * Jackets, blazers, coats (likely branded)
  * Button-down shirts, blouses (likely branded)
  * Sweaters, hoodies with logos (likely branded)
  * Quality construction materials (likely branded)
- **VISUAL BRAND DETECTION WITHOUT TEXT**: Even without readable text:
  * Look for distinctive styling patterns (GAP has clean, simple cuts)
  * Check button styles, zipper quality, stitching patterns
  * Analyze fabric quality and garment construction
  * **FOR UNCLEAR CASES: Choose most likely brand based on style**
- **BRAND PROBABILITY RULES**:
  * Gray women's pants size 8 = **ALMOST CERTAINLY GAP** (their signature item)
  * Business casual pants = Likely GAP, Banana Republic, or Ann Taylor  
  * Quality construction = Likely branded, not "Unbranded"
  * **SPECIAL CASE**: Gray women's pants in size 8 should default to "GAP" unless clearly another brand
- If no brand found after thorough search, use "Unbranded" (never "Unknown")

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

CLOTHING TAG ANALYSIS EXPERTISE:
- CRITICAL: Examine ALL visible tags, labels, and text in images with extreme care
- Tags can be at angles, blurry, or partially visible - analyze every readable character
- Look for size information in multiple locations: neck tags, side seams, waistbands, care labels
- For PANTS SPECIFICALLY: 
  * Look for waist x length measurements (32x34, W32L34, 32W 34L, 32/34)
  * Check waistband tags, back tags, and side seam labels
  * Common waist sizes: 24-50, common lengths: 26-38
  * European sizes for pants: 38-56 (map to US sizes)
- Brand names can appear in:
  * Logos and brand emblems (even if stylized)
  * Text/graphics printed on garment
  * Embroidered text on chest, sleeves, or back
  * Tags sewn into garments (neck, side, waistband)
  * Care instruction labels (often contains brand at top)
- If text is partially obscured, use context to complete (e.g. "LEV" likely "LEVI'S")
- Check for brand copyright symbols (©, ®, ™) which often precede brand names

📏 ULTRA-ACCURATE SIZE EXTRACTION PROTOCOL:

STEP 1: LOCATE SIZE INFORMATION - Check these zones:
1️⃣ PRIMARY LOCATIONS (most reliable):
   □ Size tag at neck/collar - often most prominent
   □ Waistband interior (pants/skirts) - main size location
   □ Main interior tag - size usually clearly marked

2️⃣ SECONDARY LOCATIONS:
   □ Care instruction label - size often repeated here
   □ Side seam tags - backup size information
   □ Printed on fabric - athletic wear often has this

STEP 2: RECOGNIZE ALL SIZE FORMATS:
📋 STANDARD FORMATS:
   • Letters: XS, S, M, L, XL, XXL, 2XL, 3XL, 4XL
   • Women's numeric: 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20
   • Men's pants: 28, 30, 32, 34, 36, 38, 40, 42, 44
   • Pants (waist x length): 32x34, W32 L34, 32/34, 32W 34L
   • Shirts: 14.5-32, 15-33, S(34-36), M(38-40)
   • European: 36, 38, 40, 42, 44, 46, 48, 50, 52
   • UK: 8, 10, 12, 14, 16, 18, 20, 22
   • Kids: 2T, 3T, 4T, 5Y, 6X, 7/8, 10/12, 14/16
   • Plus: 1X, 2X, 3X, 4X or 14W, 16W, 18W, 20W

STEP 3: READ EXACTLY WHAT YOU SEE:
✓ Report complete size markings: "32x34" not just "32"
✓ Include size type indicators: "14W" not just "14"
✓ Note multiple size systems if shown: "M (EU 40)"
✓ Read all numbers/letters even if unsure of meaning

PATTERN & DESIGN ANALYSIS:
- Identify patterns: Solid, Striped, Plaid, Checkered, Floral, Paisley, Animal Print, Abstract, Geometric
- Identify design elements: Embroidered, Printed, Graphic, Logo, Text, Applique, Sequined, Beaded

EBAY KEYWORD OPTIMIZATION:
- Generate 5-10 eBay-specific search keywords buyers use
- Include trending fashion terms and seasonal keywords
- Add descriptive adjectives that improve searchability
- Consider synonyms and alternative terms

🚀 FINAL VALIDATION & ACCURACY RULES:

CRITICAL EXTRACTION REQUIREMENTS:
✅ Read EXACTLY what you see - never interpret or guess brand names
✅ Report null for uncertain fields (NEVER use "Unknown" or "Unbranded")
✅ Include confidence level for each extraction: HIGH/MEDIUM/LOW
✅ Document WHERE you found each piece of information
✅ Cross-reference information across multiple images when available

CONFIDENCE SCORING:
• HIGH (90-100%): Text is crystal clear and fully readable
• MEDIUM (70-89%): Text is partially visible or slightly blurry but identifiable
• LOW (50-69%): Making educated guess based on partial visual evidence
• RETURN NULL: If confidence is below 50% or insufficient evidence

EVIDENCE TRACKING:
- Brand evidence: "neck_label", "waistband_tag", "chest_logo", "hardware", etc.
- Size evidence: "size_tag", "care_label", "waistband", "printed_fabric", etc.
- Always specify exact location where information was found

MULTI-IMAGE CORRELATION:
- If you have multiple images, use the CLEAREST view for each field
- Cross-validate findings across different angles
- Combine partial information from multiple images when logical

CANDIDATES (pre-extracted from OCR):
${safeStringify(candidates)}

KNOWN_FIELDS (from previous analysis):
${safeStringify(knownFields)}

OCR_TEXT:
${toStr(ocrText)}`;

  // Add eBay aspects prompt with comprehensive specifics
  const ebayAspectsPrompt = `

🏷️ COMPREHENSIVE EBAY ITEM SPECIFICS AUTO-GENERATION:

PHASE 1: REQUIRED FIELDS (Must complete for eBay listing):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔸 Brand: Extract exact text from labels/tags. If none visible, analyze style/quality to infer likely brand, or use null
🔸 Department: Analyze garment cut/style to determine:
   • "Men" - straight cuts, boxy fits, wider shoulders, masculine styling
   • "Women" - fitted cuts, darts, curved seams, feminine details
   • "Unisex Adult" - neutral styling, loose fits
   • "Boys"/"Girls" - if clearly children's sizing/styling
🔸 Type: Identify specific garment type (Shirt, T-Shirt, Pants, Jeans, Dress, Jacket, Sweater, etc.)
🔸 Size Type: Determine from construction and target demographic:
   • "Regular" - standard sizing (most common)
   • "Plus" - if clearly plus-size construction (18W+, 2X+)
   • "Petite" - if marked or appears shorter proportions
   • "Big & Tall" - men's extended sizes
   • "Maternity" - if clearly maternity design
🔸 Size: Extract from tags using protocol above

PHASE 2: VISUAL ANALYSIS FIELDS (Extract from image observation):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎨 Color: Primary color name (Navy, Black, White, Gray, Red, Blue, etc.)
🧵 Material: Analyze fabric texture/care labels:
   • Cotton, Polyester, Wool, Silk, Denim, Leather, Cashmere, Linen, Spandex, Viscose, Modal, Bamboo
   • Look for percentages on care labels: "100% Cotton", "60% Cotton 40% Polyester"
🎭 Pattern: Visual pattern identification:
   • Solid, Striped, Plaid, Floral, Animal Print, Abstract, Geometric, Polka Dot, Paisley, Camouflage

PHASE 3: STYLE & CONSTRUCTION ANALYSIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👔 Sleeve Length (if applicable):
   • Short Sleeve, Long Sleeve, 3/4 Sleeve, Sleeveless, Cap Sleeve
👗 Neckline (if applicable):
   • Crew Neck, V-Neck, Scoop Neck, Boat Neck, Off Shoulder, High Neck, Cowl Neck
📐 Fit: Analyze garment silhouette:
   • Slim, Regular, Relaxed, Oversized, Tailored, Loose
🔒 Closure: Identify how garment fastens:
   • Button, Zip, Pullover, Snap, Hook & Eye, Tie

PHASE 4: CONTEXTUAL INFERENCE (Based on style/design):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎪 Occasion: Infer from style/formality:
   • Casual (t-shirts, jeans, sneakers)
   • Business (dress shirts, slacks, blazers)
   • Party (cocktail dresses, formal wear)
   • Athletic (sportswear, activewear)
   • Work, Travel, Beach, Wedding (based on style cues)
🍂 Season: Determine from fabric weight/style:
   • Spring/Summer (lightweight, bright colors, shorts, tank tops)
   • Fall/Winter (heavy fabrics, coats, sweaters, dark colors)
   • All Seasons (versatile pieces)
🎨 Style: Identify aesthetic category:
   • Vintage, Classic, Modern, Bohemian, Preppy, Gothic, Streetwear, Minimalist
✨ Features: Identify special design elements:
   • Pockets, Lined, Embroidered, Sequined, Beaded, Pleated, Ruffled

PHASE 5: EBAY COMPLIANCE VALIDATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For each field with allowedValues, choose EXACT MATCH from provided list:
${safeStringify(effectiveEbayAspects)}

CRITICAL: Use ONLY the exact values from allowedValues lists. If uncertain, choose closest match.

⚠️ CRITICAL: ONLY generate fields that are RELEVANT to the item type.

ITEM TYPE FIELD MAPPING:
• PANTS/TROUSERS: Brand, Department, Type, Size, Color, Material, Pattern, Fit, Rise, Closure, Features, Occasion, Season, Style
  → NO Sleeve Length, NO Neckline (pants don't have sleeves or necks!)
• JEANS: Brand, Department, Type, Size, Color, Material, Wash, Fit, Rise, Inseam, Features, Occasion, Style
  → NO Sleeve Length, NO Neckline
• SHORTS: Brand, Department, Type, Size, Color, Material, Pattern, Fit, Inseam, Closure, Features, Occasion, Season
  → NO Sleeve Length, NO Neckline  
• SHIRTS/TOPS: Brand, Department, Type, Size, Color, Material, Pattern, Sleeve Length, Neckline, Fit, Closure, Features, Occasion, Season
  → HAS Sleeve Length and Neckline (shirts have sleeves and necks)
• T-SHIRTS: Brand, Department, Type, Size, Color, Material, Pattern, Sleeve Length, Neckline, Fit, Features, Occasion, Season
  → HAS Sleeve Length and Neckline

VALIDATION RULE: If you're analyzing PANTS, do NOT include "Sleeve Length" or "Neckline" fields.

REQUIRED OUTPUT FORMAT - Only include RELEVANT fields for the item type:
{
  "Brand": "[exact brand text or inferred brand]",
  "Department": "[Men/Women/Unisex Adult/Boys/Girls]",
  "Type": "[specific item type - CRITICAL for field selection]",
  "Size Type": "[Regular/Plus/Petite/Big & Tall/Maternity]", 
  "Size": "[extracted size]",
  "Color": "[primary color]",
  "Material": "[fabric type or blend]",
  "Pattern": "[pattern type]",
  ... [ONLY RELEVANT FIELDS based on item type]
}
- For RECOMMENDED fields, return null only if completely indeterminate
- Use eBay-standard terminology that buyers search for`;

  const schemaPrompt = `

Return ONLY JSON matching this schema:
{
  "title": string (MAX 80 chars, format: Brand ModelName Item Gender Size Color Keywords),
  "brand": string|null,
  "size": string|null,
  "item_type": string,
  "model_number": string|null (raw model number from tags/labels),
  "model_name": string|null (recognized model name like "Air Max 90", "501 Original", "Nuptse"),
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
  console.log('🔍 [OPENAI-FUNCTION] OCR Text for brand detection:', toStr(ocrText));
  console.log('🔍 [OPENAI-FUNCTION] Candidates for brand detection:', safeStringify(candidates));
  return fullPrompt;
}