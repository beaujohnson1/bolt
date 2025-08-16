const OpenAI = require('openai');
const { z } = require('zod');
const { config, validateConfig } = require('./_shared/config.cjs');

// Enhanced prompt generation with accuracy focus
class AccuracyFocusedPromptGenerator {
  /**
   * Generate an optimized prompt based on image and OCR quality
   */
  static generateOptimizedPrompt(context) {
    const { ocrText, candidates, imageQuality, ocrConfidence, category } = context;
    
    // Build structured prompt with accuracy checkpoints
    let prompt = this.getBasePrompt(category);
    
    // Add quality-specific instructions
    prompt += this.getQualityInstructions(imageQuality, ocrConfidence);
    
    // Add systematic extraction protocol
    prompt += this.getExtractionProtocol();
    
    // Add validation rules
    prompt += this.getValidationRules();
    
    // Add context data
    prompt += `

EXTRACTED OCR DATA (Confidence: ${(ocrConfidence * 100).toFixed(0)}%):
${ocrText || 'No OCR text available'}

PRE-IDENTIFIED CANDIDATES:
${JSON.stringify(candidates, null, 2)}

ANALYSIS REQUIREMENTS:
- Return ONLY valid JSON matching the schema
- Use null for uncertain fields (never "Unknown")
- Include confidence scores for each field
- Document evidence source (ocr|vision|inference)
`;
    
    return prompt;
  }
  
  static getBasePrompt(category) {
    return `You are an elite AI specializing in ${category} analysis with 99%+ accuracy target.

CRITICAL MISSION: Extract maximum accurate information from images for eBay listings.

ANALYSIS FRAMEWORK - SYSTEMATIC APPROACH:

PHASE 1: COMPREHENSIVE SCANNING
□ Examine EVERY visible text element in ALL images
□ Document partial text, even single letters
□ Note logo shapes, design patterns, hardware details
□ Record confidence level (0-1) for each observation

PHASE 2: INTELLIGENT CROSS-VALIDATION  
□ Compare findings across multiple image angles
□ Resolve conflicts using probability weighting
□ Apply brand-specific knowledge patterns
□ Use contextual clues for ambiguous cases

PHASE 3: ACCURACY VERIFICATION
□ Double-check high-value fields (brand, size)
□ Validate against known brand/size combinations
□ Flag any inconsistencies for review
□ Calculate overall confidence score
`;
  }
  
  static getQualityInstructions(imageQuality, ocrConfidence) {
    const qualityMaps = {
      high: {
        instruction: 'EXCELLENT IMAGE QUALITY',
        strategy: `- Extract ALL fine details from tags/labels
- Read complete text including copyright symbols
- Identify subtle brand indicators
- Use zoom-level detail for verification`
      },
      medium: {
        instruction: 'MODERATE IMAGE QUALITY', 
        strategy: `- Focus on highest contrast areas first
- Use context for partially visible text
- Apply pattern matching for logos
- Cross-reference multiple angles`
      },
      low: {
        instruction: 'LIMITED IMAGE QUALITY',
        strategy: `- Prioritize most visible elements
- Use style/construction as hints
- Apply probabilistic matching
- Document uncertainty clearly`
      }
    };
    
    const quality = qualityMaps[imageQuality] || qualityMaps.medium;
    
    let instructions = `

${quality.instruction}:
${quality.strategy}
`;
    
    // Add OCR confidence weighting
    if (ocrConfidence > 0.8) {
      instructions += `

OCR RELIABILITY: HIGH (${(ocrConfidence * 100).toFixed(0)}%)
- Trust OCR for text extraction
- Use visual only for confirmation
- OCR overrides visual conflicts`;
    } else if (ocrConfidence > 0.5) {
      instructions += `

OCR RELIABILITY: MODERATE (${(ocrConfidence * 100).toFixed(0)}%)  
- Balance OCR and visual equally
- Cross-validate all findings
- Resolve conflicts with context`;
    } else {
      instructions += `

OCR RELIABILITY: LOW (${(ocrConfidence * 100).toFixed(0)}%)
- Rely primarily on visual analysis
- Use OCR as hints only
- Apply strict visual verification`;
    }
    
    return instructions;
  }
  
  static getExtractionProtocol() {
    return `

SYSTEMATIC EXTRACTION PROTOCOL:

1. BRAND DETECTION (Priority #1)
   Step 1: Main label (neck/waistband) - most reliable
   Step 2: Care labels - often has brand at top
   Step 3: Hardware (buttons/zippers) - embossed brands
   Step 4: Logos/graphics - visual pattern matching
   Step 5: Style indicators - if text unclear
   
   Common Brands to Check:
   - Premium: Ralph Lauren, Tommy Hilfiger, Calvin Klein
   - Athletic: Nike, Adidas, Under Armour, Champion
   - Fast Fashion: Gap, Old Navy, H&M, Zara
   - Denim: Levi's, Wrangler, Lee
   
   Evidence: Document WHERE brand was found

2. SIZE EXTRACTION (Priority #2)
   Step 1: Size tags - all locations
   Step 2: Waistband (pants) - W x L format
   Step 3: Care labels - secondary size location
   Step 4: International conversions if needed
   
   Size Formats:
   - Letter: XS, S, M, L, XL, XXL
   - Numeric: 2, 4, 6, 8, 10, 12
   - Pants: 32x34, W32 L34
   - European: 38, 40, 42
   
   Evidence: Note exact location found

3. COLOR IDENTIFICATION
   - Primary color (largest area)
   - Secondary colors if multi-color
   - Use standard names (Navy not Dark Blue)
   - Account for lighting variations

4. MATERIAL ANALYSIS
   - Visual texture identification
   - Care label material content
   - Common fabrics: Cotton, Polyester, Wool, Denim

5. CONDITION ASSESSMENT
   - new: Tags attached, unworn
   - like_new: No visible wear
   - good: Minor wear, fully functional
   - fair: Noticeable wear, still wearable
   - poor: Significant wear/damage`;
  }
  
  static getValidationRules() {
    return `

VALIDATION & ACCURACY RULES:

CRITICAL REQUIREMENTS:
✓ NEVER return "Unknown" - use null for uncertain fields
✓ Include confidence score (0-1) for each field
✓ Document evidence source: "ocr" | "vision" | "inference"
✓ Validate brand-size combinations make sense
✓ Check for internal consistency

CONFIDENCE SCORING:
- 0.9-1.0: Clear, unambiguous evidence
- 0.7-0.89: Strong indicators, minor uncertainty
- 0.5-0.69: Moderate confidence, some ambiguity
- 0.3-0.49: Low confidence, mostly inference
- <0.3: Insufficient evidence (return null)

EVIDENCE DOCUMENTATION:
{
  "brand": "Nike",
  "brand_confidence": 0.95,
  "brand_evidence": "ocr",
  "brand_location": "neck label",
  ...
}

FINAL CHECKLIST:
□ All required fields attempted
□ Confidence scores included
□ Evidence documented
□ JSON format valid
□ No "Unknown" values`;
  }
}

// Image quality analyzer
class ImageQualityAnalyzer {
  static async analyzeImageQuality(imageUrls) {
    // In production, this would analyze actual image properties
    // For now, return a simulated quality assessment
    return {
      overall: 'medium',
      scores: {
        resolution: 0.7,
        clarity: 0.75,
        lighting: 0.8,
        angles: 0.85
      }
    };
  }
}

// OCR confidence calculator
class OCRConfidenceCalculator {
  static calculateConfidence(ocrText, candidates) {
    if (!ocrText || ocrText.length < 10) return 0.2;
    
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on text length
    if (ocrText.length > 100) confidence += 0.2;
    if (ocrText.length > 500) confidence += 0.1;
    
    // Increase confidence if candidates found
    if (candidates.brand) confidence += 0.1;
    if (candidates.size) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }
}

// Enhanced response schema with confidence scores
const EnhancedAiListing = z.object({
  // Core fields
  title: z.string().min(3).max(80),
  brand: z.string().nullable().optional(),
  brand_confidence: z.number().min(0).max(1).optional(),
  brand_evidence: z.enum(['ocr', 'vision', 'inference']).optional(),
  
  size: z.string().nullable().optional(),
  size_confidence: z.number().min(0).max(1).optional(),
  size_evidence: z.enum(['ocr', 'vision', 'inference']).optional(),
  
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'poor']).optional(),
  condition_confidence: z.number().min(0).max(1).optional(),
  
  category: z.string().optional(),
  color: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  
  // Additional fields
  item_type: z.string().min(2),
  gender: z.string().nullable().optional(),
  pattern: z.string().nullable().optional(),
  style_keywords: z.array(z.string()).optional(),
  
  // Pricing and features
  suggested_price: z.number().positive().optional(),
  key_features: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  
  // Overall confidence
  overall_confidence: z.number().min(0).max(1),
  
  // eBay specifics
  ebay_item_specifics: z.record(z.any()).optional(),
  
  // Analysis metadata
  analysis_notes: z.array(z.string()).optional()
});

// Main handler function
exports.handler = async (event, context) => {
  console.log('🚀 [ENHANCED-VISION] Starting enhanced analysis...');
  
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
    const { imageUrls, ocrText, candidates = {}, knownFields = {} } = requestData;
    
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new Error('No images provided');
    }
    
    console.log('📊 [ENHANCED-VISION] Analyzing image quality...');
    const imageQualityAnalysis = await ImageQualityAnalyzer.analyzeImageQuality(imageUrls);
    
    console.log('🔍 [ENHANCED-VISION] Calculating OCR confidence...');
    const ocrConfidence = OCRConfidenceCalculator.calculateConfidence(ocrText, candidates);
    
    console.log('📝 [ENHANCED-VISION] Generating optimized prompt...');
    const optimizedPrompt = AccuracyFocusedPromptGenerator.generateOptimizedPrompt({
      ocrText,
      candidates,
      imageQuality: imageQualityAnalysis.overall,
      ocrConfidence,
      category: candidates.category || 'clothing'
    });
    
    console.log('🤖 [ENHANCED-VISION] Calling OpenAI with enhanced prompt...');
    const openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.05, // Very low for maximum consistency
      response_format: { type: "json_object" },
      messages: [
        { 
          role: "system", 
          content: "You are a precision AI that returns ONLY valid JSON with confidence scores. Never use markdown or code fences." 
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: optimizedPrompt
            },
            // Include up to 3 best quality images
            ...imageUrls.slice(0, 3).map(url => ({
              type: "image_url",
              image_url: {
                url: url,
                detail: "high"
              }
            }))
          ]
        }
      ],
      max_tokens: 2000
    });
    
    const rawResponse = response.choices[0]?.message?.content || "";
    console.log('✅ [ENHANCED-VISION] Received OpenAI response');
    
    // Parse and validate response
    const parsedResponse = JSON.parse(rawResponse);
    const validated = EnhancedAiListing.safeParse(parsedResponse);
    
    if (!validated.success) {
      console.error('❌ [ENHANCED-VISION] Validation failed:', validated.error);
      throw new Error('Invalid response format');
    }
    
    console.log('📊 [ENHANCED-VISION] Analysis complete:', {
      overallConfidence: validated.data.overall_confidence,
      brandConfidence: validated.data.brand_confidence,
      sizeConfidence: validated.data.size_confidence
    });
    
    // Add analysis metadata
    const enhancedResult = {
      ...validated.data,
      _metadata: {
        imageQuality: imageQualityAnalysis.overall,
        ocrConfidence,
        promptVersion: 'enhanced_v1',
        modelUsed: 'gpt-4o-mini',
        timestamp: new Date().toISOString()
      }
    };
    
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        ok: true,
        data: enhancedResult,
        usage: response.usage
      })
    };
    
  } catch (error) {
    console.error('❌ [ENHANCED-VISION] Error:', error);
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