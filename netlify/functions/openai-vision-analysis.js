const OpenAI = require('openai');
const { z } = require('zod');

// Define the expected AI response schema
const AiListing = z.object({
  title: z.string().min(3).max(80),
  brand: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']).or(z.string()).or(z.null()).optional().default('good'),
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
              text: getAnalysisPrompt(analysisType, ocrText, candidates, ebayAspects, knownFields)
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
      console.error('❌ [OPENAI-FUNCTION] AI response validation failed:', validated.error);
      console.error('❌ [OPENAI-FUNCTION] Validation error structure:', JSON.stringify(validated.error, null, 2));
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          ok: false,
          error: 'AI_JSON_VALIDATION_FAILED',
          message: 'AI response does not match expected schema',
          issues: validated.error?.errors?.map(e => ({ 
            path: e.path?.join('.') || 'unknown', 
            message: e.message || 'unknown error',
            received: e.received 
          })) || [],
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
- LOOK FOR BRAND NAMES AND TEXT VISIBLE IN THE IMAGE - examine logos, graphics, text prints carefully
- If you can READ text in the image (like "Wall Street Bull", brand names, sizes), extract it for the TITLE
- Brand names in graphic designs should go in the BRAND field (e.g., "Wall Street Bull" -> brand: "Wall Street Bull")  
- Text visible in graphics should become part of the title (e.g., "Wall Street Bull Hoodie")
- EXAMINE ALL CLOTHING TAGS AND LABELS VERY CAREFULLY FOR SIZE INFORMATION:
  * Look for size tags sewn into garments (neck tags, side seams, waistbands)
  * Check care labels which often contain size info (S, M, L, XL, numeric sizes)
  * Look for size printed on fabric tags (like "MEDIUM", "L", "32x34")
  * Examine any visible text on clothing for size indicators
  * Check for European sizes (38, 40, 42), US sizes (S, M, L), or numeric sizes (2, 4, 6, 8)
  * Look for kids sizes (2T, 4T, 6Y) or shoe sizes if applicable
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