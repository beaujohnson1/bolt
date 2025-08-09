const OpenAI = require('openai');
const { z } = require('zod');
const { getVisionClient } = require('./_shared/googleVisionClient');

// Define the expected AI response schema
const AiListing = z.object({
  title: z.string().min(3).max(80),
  brand: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']).optional().default('good'),
  category: z.string().optional().default('clothing'),
  color: z.string().nullable().optional(),
  item_type: z.string().min(2),
  suggested_price: z.number().positive().optional(),
  confidence: z.number().min(0).max(1).optional().default(0.5),
  key_features: z.array(z.string()).optional().default([]),
  keywords: z.array(z.string()).optional().default([]),
  model_number: z.string().nullable().optional(),
  description: z.string().optional().default(''),
  material: z.string().nullable().optional(),
  style_details: z.string().nullable().optional(),
  season: z.string().nullable().optional(),
  occasion: z.string().nullable().optional(),
  evidence: z.object({
    brand: z.enum(['ocr', 'vision', 'null']).optional(),
    size: z.enum(['ocr', 'vision', 'null']).optional()
  }).optional(),
  ebay_item_specifics: z.record(z.string().nullable()).optional()
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

// Enhanced OCR function using Google Vision API
async function getOcrText(imageUrl) {
  try {
    console.log('📝 [OCR] Starting Google Vision OCR for image...');
    
    const visionClient = getVisionClient();
    
    // Convert image URL to base64 if needed
    let imageBase64;
    if (imageUrl.startsWith('data:image/')) {
      // Already base64 data URL
      imageBase64 = imageUrl.split(',')[1];
    } else if (imageUrl.startsWith('http')) {
      // Fetch image and convert to base64
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      imageBase64 = Buffer.from(buffer).toString('base64');
    } else {
      // Assume it's already base64
      imageBase64 = imageUrl;
    }
    
    console.log('🔍 [OCR] Calling Google Vision text detection...');
    
    // Call Google Vision API
    const [result] = await visionClient.textDetection({
      image: { content: imageBase64 }
    });
    
    const extractedText = result?.fullTextAnnotation?.text || '';
    const textAnnotations = result?.textAnnotations || [];
    
    console.log('✅ [OCR] Text extraction completed:', {
      textLength: extractedText.length,
      annotationCount: textAnnotations.length
    });
    
    return {
      fullText: extractedText,
      textAnnotations: textAnnotations
    };
    
  } catch (error) {
    console.error('❌ [OCR] Google Vision OCR failed:', error);
    
    // Return empty result instead of throwing to allow AI analysis to continue
    return {
      fullText: '',
      textAnnotations: []
    };
  }
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
    console.log('🖼️ [OPENAI-FUNCTION] Processing images:', {
      count: imageArray.length,
      ocrTextLength: toStr(ocrText).length,
      hasCandidates: Object.keys(candidates).length > 0,
      ebayAspectsCount: Array.isArray(ebayAspects) ? ebayAspects.length : 0,
      hasKnownFields: Object.keys(knownFields).length > 0
    });

    // Enhanced OCR processing if no OCR text provided
    let enhancedOcrText = ocrText;
    if (!ocrText || ocrText.trim().length === 0) {
      console.log('📝 [OPENAI-FUNCTION] No OCR text provided, extracting from primary image...');
      try {
        const ocrResult = await getOcrText(imageArray[0]);
        enhancedOcrText = ocrResult.fullText;
        console.log('✅ [OPENAI-FUNCTION] OCR extraction completed:', {
          textLength: enhancedOcrText.length,
          annotationCount: ocrResult.textAnnotations.length
        });
      } catch (ocrError) {
        console.error('❌ [OPENAI-FUNCTION] OCR extraction failed:', ocrError);
        // Continue without OCR text
      }
    }
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
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
              text: getAnalysisPrompt(analysisType, enhancedOcrText, candidates, ebayAspects, knownFields)
            },
            // Send all images to the LLM
            ...imageArray.map(url => ({
              type: "image_url",
              image_url: {
                url: url,
                detail: "high"
              }
            }))
          ]
        }
      ],
      max_tokens: 1500
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
      console.error('❌ [OPENAI-FUNCTION] AI response validation failed:', validated.error.errors);
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          ok: false,
          error: 'AI_JSON_VALIDATION_FAILED',
          message: 'AI response does not match expected schema',
          issues: validated.error.errors.map(e => ({ 
            path: e.path.join('.'), 
            message: e.message,
            received: e.received 
          })),
          raw_data: parsedAnalysis
        })
      };
    }

    console.log('✅ [OPENAI-FUNCTION] AI response validated successfully');
    console.log('📊 [OPENAI-FUNCTION] Validated data keys:', Object.keys(validated.data));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        ok: true,
        data: validated.data,
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
  
  const basePrompt = `You are an expert clothing and fashion item analyzer for eBay listings. Extract MAXIMUM detail from images and OCR text to create accurate, profitable listings.

CRITICAL INSTRUCTIONS:
- If you cannot verify a field from the image or OCR, return null (NEVER use the word "Unknown")
- Prefer OCR text over visual guesses when available
- Use provided CANDIDATES when they match what you see
- Choose ONLY from allowed values when provided for eBay aspects
- Be extremely specific with item types and descriptions
- Report evidence for how you determined brand/size (ocr|vision|null)

ENHANCED SIZE DETECTION - Look for these specific patterns:
- Standard sizes: XS, S, M, L, XL, XXL, XXXL
- Numeric sizes: 0, 00, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28
- Plus sizes: 1X, 2X, 3X, 4X, 5X
- Kids sizes: 2T, 3T, 4T, 5T, 6, 7, 8, 10, 12, 14, 16
- Youth sizes: YS, YM, YL, YXL
- Waist x Length: 30x32, 32x34, W30 L32
- Bra sizes: 32B, 34C, 36D, 38DD
- Shoe sizes: 7, 8.5, 9, 10, 11 (US), EU 40, UK 8
- Size labels: "SIZE: M", "SZ: L", "US M", "EUR 40"
- International: EU 38, UK 10, US 8

BRAND DETECTION - Examine these locations carefully:
- Neck labels and tags (most common)
- Care labels inside garments
- Embroidered or printed logos
- Hardware text (zippers, buttons)
- Woven labels on seams
- Small brand marks anywhere on the item

CANDIDATES (pre-extracted from OCR):
${safeStringify(candidates)}

KNOWN_FIELDS (from previous analysis):
${safeStringify(knownFields)}

OCR_TEXT:
${toStr(ocrText)}`;

  // Add eBay aspects if provided
  let ebayAspectsPrompt = '';
  if (Array.isArray(ebayAspects) && ebayAspects.length > 0) {
    ebayAspectsPrompt = `

EBAY ITEM SPECIFICS (fill these exactly):
${safeStringify(ebayAspects.slice(0, 10))}

For each aspect:
- If it has allowedValues, choose ONE from the list (best match)
- If no allowedValues, provide short descriptive text
- If you cannot determine the value, return null
- REQUIRED aspects should be filled if at all possible`;
  }

  const schemaPrompt = `

Return ONLY JSON matching this schema:
{
  "title": string,
  "brand": string|null,
  "size": string|null,
  "item_type": string,
  "color": string|null,
  "condition": "new"|"like_new"|"good"|"fair"|"poor",
  "keywords": string[],
  "key_features": string[],
  "suggested_price": number,
  "description": string,
  "evidence": {
    "brand": "ocr|vision|null",
    "size": "ocr|vision|null"
  }${Array.isArray(ebayAspects) && ebayAspects.length > 0 ? ',\n  "ebay_item_specifics": { [aspectName]: value|null }' : ''}
}

Do NOT include markdown or code fences.`;

  const fullPrompt = basePrompt + ebayAspectsPrompt + schemaPrompt;

  console.log('✅ [OPENAI-FUNCTION] Prompt generated successfully');
  return fullPrompt;
}