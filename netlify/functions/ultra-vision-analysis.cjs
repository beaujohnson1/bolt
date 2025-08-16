const OpenAI = require('openai');
const { z } = require('zod');
const { config, validateConfig } = require('./_shared/config.cjs');

/**
 * Ultra Vision Analysis - Maximum accuracy through intelligent extraction
 * 
 * This endpoint focuses on teaching the vision model WHERE and HOW to look
 * for information, rather than relying on predefined databases.
 */

// Helper to generate smart extraction prompts
function generateUltraAccuratePrompt(context) {
  const { imageCount, ocrText, ocrConfidence } = context;
  
  return `You are an expert visual analyst examining ${imageCount} image(s) of a clothing item.

🎯 YOUR MISSION: Extract information with 95%+ accuracy by reading EXACTLY what you see.

📋 SYSTEMATIC EXTRACTION PROTOCOL:

STEP 1: BRAND DETECTION
━━━━━━━━━━━━━━━━━━━
Read text from these locations IN ORDER:

1️⃣ PRIMARY ZONES (90% of brands found here):
   □ Neck label (inside collar) - ZOOM IN mentally, read even tilted text
   □ Waistband label (pants/skirts) - often largest text
   □ Main interior tag - usually below neck label

2️⃣ SECONDARY ZONES (check if primary is unclear):
   □ Care instruction label - brand often at top
   □ Side seam labels - backup brand location  
   □ Small tags on sleeves/hem

3️⃣ EXTERNAL ZONES (visible branding):
   □ Chest area - embroidered/printed logos
   □ Back of garment - large graphics
   □ Pockets - small labels
   □ Hardware - buttons/zippers with text

4️⃣ EXTRACTION RULES:
   ✓ Read EXACTLY what you see (if it says "GAP" report "GAP")
   ✓ Include partial text (if you see "CK" report "CK")
   ✓ Note © ® ™ symbols - brand name usually follows
   ✓ If sideways/upside-down, mentally rotate and read
   ✓ Report confidence: HIGH/MEDIUM/LOW

STEP 2: SIZE EXTRACTION
━━━━━━━━━━━━━━━━━━━
Check ALL these locations:

📍 WHERE TO LOOK:
   □ Size tag (neck/waistband) - primary source
   □ Care label - often repeats size
   □ Printed on fabric (athletic wear)
   □ Separate small white tags

📏 FORMATS TO RECOGNIZE:
   • Letters: XS, S, M, L, XL, XXL, 2XL, 3XL
   • Women's: 0, 2, 4, 6, 8, 10, 12, 14, 16
   • Men's: 28, 30, 32, 34, 36, 38, 40, 42
   • Pants: 32x34, W32 L34, 32/34, 32W 34L
   • Shirts: 14.5-32, 15-33, S(34-36)
   • EU: 36, 38, 40, 42, 44, 46, 48, 50
   • UK: 8, 10, 12, 14, 16, 18, 20

STEP 3: MATERIAL EXTRACTION
━━━━━━━━━━━━━━━━━━━━━
Read fabric content from:
   □ Care label - usually shows percentages
   □ Separate fabric content tag
   □ Hang tags if visible

STEP 4: CONDITION ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━
Visual inspection for:
   □ Tags attached = New with Tags (NWT)
   □ No visible wear = Like New
   □ Minor wear = Good
   □ Visible wear = Fair
   □ Significant wear = Poor

STEP 5: COLOR & PATTERN
━━━━━━━━━━━━━━━━━━━
Describe what you see:
   □ Primary color (largest area)
   □ Secondary colors
   □ Pattern (solid, striped, plaid, etc.)

${ocrText && ocrConfidence > 0.5 ? `
📝 OCR DETECTED TEXT (Confidence: ${(ocrConfidence * 100).toFixed(0)}%):
${ocrText}

INSTRUCTION: Verify and expand on this OCR text by looking at the images.
If OCR missed anything, add it. If OCR misread something, correct it.
` : ''}

🎯 OUTPUT FORMAT:
{
  "brand": {
    "extracted_text": "[EXACTLY what you read]",
    "location_found": "[where in image]",
    "confidence": "HIGH/MEDIUM/LOW",
    "evidence": "[what you saw - logo, text, tag, etc.]"
  },
  "size": {
    "extracted_text": "[EXACTLY what you read]",
    "format_type": "[letter/number/pants/eu/uk]",
    "location_found": "[where in image]",
    "confidence": "HIGH/MEDIUM/LOW"
  },
  "material": {
    "extracted_text": "[fabric content]",
    "percentages": "[if visible]",
    "confidence": "HIGH/MEDIUM/LOW"
  },
  "condition": {
    "assessment": "[new/like_new/good/fair/poor]",
    "evidence": "[what indicates this condition]",
    "confidence": "HIGH/MEDIUM/LOW"
  },
  "color": {
    "primary": "[main color]",
    "secondary": "[other colors]",
    "pattern": "[pattern type]"
  },
  "additional_text": {
    "all_visible_text": "[ANY other text you can read]",
    "interesting_details": "[unique features, logos, graphics]"
  },
  "quality_indicators": {
    "construction": "[stitching quality, hardware type]",
    "likely_price_tier": "[budget/mid/premium/luxury based on quality]"
  }
}

CRITICAL REMINDERS:
⚠️ Read EXACTLY what you see - don't interpret or guess brands
⚠️ Check EVERY location listed above systematically
⚠️ Report confidence honestly - LOW is better than wrong
⚠️ If multiple images show the same item, use the CLEAREST view
⚠️ Include ALL readable text, even if you're unsure what it means`;
}

// Enhanced schema with confidence tracking
const UltraAccurateSchema = z.object({
  // Core extraction with confidence
  brand: z.object({
    extracted_text: z.string().nullable(),
    location_found: z.string().optional(),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    evidence: z.string().optional()
  }),
  
  size: z.object({
    extracted_text: z.string().nullable(),
    format_type: z.string().optional(),
    location_found: z.string().optional(),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW'])
  }),
  
  material: z.object({
    extracted_text: z.string().nullable(),
    percentages: z.string().optional(),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW'])
  }),
  
  condition: z.object({
    assessment: z.enum(['new', 'like_new', 'good', 'fair', 'poor']),
    evidence: z.string().optional(),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW'])
  }),
  
  color: z.object({
    primary: z.string(),
    secondary: z.string().optional(),
    pattern: z.string().optional()
  }),
  
  additional_text: z.object({
    all_visible_text: z.string().optional(),
    interesting_details: z.string().optional()
  }),
  
  quality_indicators: z.object({
    construction: z.string().optional(),
    likely_price_tier: z.enum(['budget', 'mid', 'premium', 'luxury']).optional()
  })
});

// Multi-pass analysis for low confidence results
async function performMultiPassAnalysis(imageUrls, ocrText, openai) {
  console.log('🔄 [ULTRA-VISION] Performing multi-pass analysis...');
  
  const passes = [];
  
  // Pass 1: Standard extraction
  const pass1 = await analyzeWithPrompt(
    imageUrls, 
    generateUltraAccuratePrompt({
      imageCount: imageUrls.length,
      ocrText,
      ocrConfidence: ocrText ? 0.7 : 0
    }),
    openai
  );
  passes.push(pass1);
  
  // Check if we need a second pass
  const lowConfidenceFields = [];
  if (pass1.brand?.confidence === 'LOW') lowConfidenceFields.push('brand');
  if (pass1.size?.confidence === 'LOW') lowConfidenceFields.push('size');
  
  if (lowConfidenceFields.length > 0) {
    console.log('🔍 [ULTRA-VISION] Low confidence detected, performing focused pass on:', lowConfidenceFields);
    
    // Pass 2: Focused extraction on problem areas
    const focusedPrompt = generateFocusedRefinementPrompt(pass1, lowConfidenceFields);
    const pass2 = await analyzeWithPrompt(imageUrls, focusedPrompt, openai);
    passes.push(pass2);
  }
  
  // Merge results, preferring higher confidence
  return mergeMultiPassResults(passes);
}

// Helper to perform single analysis pass
async function analyzeWithPrompt(imageUrls, prompt, openai) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { 
        role: "system", 
        content: "You are a precise visual analyst. Return ONLY valid JSON." 
      },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...imageUrls.slice(0, 5).map(url => ({
            type: "image_url",
            image_url: { url, detail: "high" }
          }))
        ]
      }
    ],
    max_tokens: 2000
  });
  
  return JSON.parse(response.choices[0].message.content);
}

// Generate focused refinement prompt
function generateFocusedRefinementPrompt(previousResult, problemFields) {
  return `REFINEMENT PASS - Improve extraction accuracy for: ${problemFields.join(', ')}

Previous extraction:
${JSON.stringify(previousResult, null, 2)}

${problemFields.includes('brand') ? `
🔍 BRAND RE-EXAMINATION PROTOCOL:
1. ENHANCE mentally and look at neck label area again
2. Check if partial letters match any text pattern
3. Examine ALL buttons and zippers for embossed text
4. Look at care label top line very carefully
5. Check chest area for any embroidered/printed text
6. Look for copyright symbols (©, ®, ™) and nearby text
` : ''}

${problemFields.includes('size') ? `
📏 SIZE RE-EXAMINATION PROTOCOL:
1. Check care label again - size often repeated there
2. Look for size printed directly on fabric
3. For pants, check waistband interior thoroughly
4. Look for size stickers that might be present
5. Check for multiple size systems (US/EU/UK)
` : ''}

Provide refined extraction with improved confidence.`;
}

// Merge multi-pass results
function mergeMultiPassResults(passes) {
  if (passes.length === 1) return passes[0];
  
  const merged = passes[0];
  
  // For each subsequent pass, upgrade if confidence improved
  for (let i = 1; i < passes.length; i++) {
    const pass = passes[i];
    
    // Upgrade brand if confidence improved
    if (getConfidenceScore(pass.brand?.confidence) > getConfidenceScore(merged.brand?.confidence)) {
      merged.brand = pass.brand;
    }
    
    // Upgrade size if confidence improved
    if (getConfidenceScore(pass.size?.confidence) > getConfidenceScore(merged.size?.confidence)) {
      merged.size = pass.size;
    }
  }
  
  return merged;
}

// Convert confidence to numeric score
function getConfidenceScore(confidence) {
  const scores = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
  return scores[confidence] || 0;
}

// Main handler
exports.handler = async (event, context) => {
  console.log('🚀 [ULTRA-VISION] Starting ultra-accurate analysis...');
  
  if (!validateConfig()) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid configuration' })
    };
  }

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  try {
    const requestData = JSON.parse(event.body || '{}');
    const { imageUrls, ocrText, enableMultiPass = true } = requestData;
    
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error('No images provided');
    }
    
    console.log(`📸 [ULTRA-VISION] Processing ${imageUrls.length} images...`);
    
    const openai = new OpenAI({ apiKey: config.openai.apiKey });
    
    let result;
    if (enableMultiPass) {
      // Use multi-pass for maximum accuracy
      result = await performMultiPassAnalysis(imageUrls, ocrText, openai);
    } else {
      // Single pass analysis
      const prompt = generateUltraAccuratePrompt({
        imageCount: imageUrls.length,
        ocrText,
        ocrConfidence: ocrText ? 0.7 : 0
      });
      result = await analyzeWithPrompt(imageUrls, prompt, openai);
    }
    
    // Validate result
    const validated = UltraAccurateSchema.safeParse(result);
    if (!validated.success) {
      console.error('❌ [ULTRA-VISION] Validation failed:', validated.error);
      throw new Error('Invalid response format');
    }
    
    // Convert to standard format for compatibility
    const standardFormat = {
      title: buildTitle(validated.data),
      brand: validated.data.brand.extracted_text,
      brand_confidence: validated.data.brand.confidence,
      size: validated.data.size.extracted_text,
      size_confidence: validated.data.size.confidence,
      condition: validated.data.condition.assessment,
      color: validated.data.color.primary,
      material: validated.data.material.extracted_text,
      pattern: validated.data.color.pattern,
      item_type: inferItemType(validated.data),
      confidence: calculateOverallConfidence(validated.data),
      _raw_extraction: validated.data
    };
    
    console.log('✅ [ULTRA-VISION] Analysis complete:', {
      brand: `${standardFormat.brand} (${validated.data.brand.confidence})`,
      size: `${standardFormat.size} (${validated.data.size.confidence})`,
      overall_confidence: standardFormat.confidence
    });
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        ok: true,
        data: standardFormat
      })
    };
    
  } catch (error) {
    console.error('❌ [ULTRA-VISION] Error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        ok: false,
        error: error.message
      })
    };
  }
};

// Helper functions
function buildTitle(data) {
  const parts = [];
  if (data.brand?.extracted_text) parts.push(data.brand.extracted_text);
  if (data.additional_text?.interesting_details) {
    const itemType = data.additional_text.interesting_details.split(' ')[0];
    if (itemType) parts.push(itemType);
  }
  if (data.size?.extracted_text) parts.push(data.size.extracted_text);
  if (data.color?.primary) parts.push(data.color.primary);
  if (data.material?.extracted_text) parts.push(data.material.extracted_text);
  
  return parts.join(' ').substring(0, 80);
}

function inferItemType(data) {
  // Infer from additional text or quality indicators
  const allText = data.additional_text?.all_visible_text || '';
  const details = data.additional_text?.interesting_details || '';
  
  // Common item type patterns
  if (/shirt|blouse|top/i.test(allText)) return 'Shirt';
  if (/pants|trousers|jeans/i.test(allText)) return 'Pants';
  if (/dress/i.test(allText)) return 'Dress';
  if (/jacket|coat|blazer/i.test(allText)) return 'Jacket';
  if (/skirt/i.test(allText)) return 'Skirt';
  if (/sweater|hoodie|sweatshirt/i.test(allText)) return 'Sweater';
  
  return 'Clothing Item';
}

function calculateOverallConfidence(data) {
  const confidenceMap = { 'HIGH': 1, 'MEDIUM': 0.7, 'LOW': 0.4 };
  
  const scores = [
    confidenceMap[data.brand?.confidence] || 0,
    confidenceMap[data.size?.confidence] || 0,
    confidenceMap[data.condition?.confidence] || 0,
    confidenceMap[data.material?.confidence] || 0
  ];
  
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}