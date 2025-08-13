const OpenAI = require('openai');
const { z } = require('zod');
const { config, validateConfig } = require('./_shared/config.cjs');

// Enhanced performance tracking and caching
const performanceCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 1000;

// Cost tracking variables
let totalTokensUsed = 0;
let totalImagesProcessed = 0;
let totalCostCents = 0;

// Define the expected AI response schema (same as original)
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
  ebay_item_specifics: z.record(z.string().nullable()).optional()
});

// Enhanced caching system
function generateCacheKey(imageUrls, analysisType, ocrText) {
  const imageString = Array.isArray(imageUrls) ? imageUrls.sort().join('|') : imageUrls;
  const ocrHash = hashString(ocrText || '');
  return `vision_${analysisType}_${hashString(imageString)}_${ocrHash}`;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

function getCachedResult(cacheKey) {
  const cached = performanceCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('💾 [CACHE] Hit for key:', cacheKey.substring(0, 20) + '...');
    return cached.data;
  }
  return null;
}

function setCachedResult(cacheKey, data) {
  // Implement LRU cache cleanup
  if (performanceCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = performanceCache.keys().next().value;
    performanceCache.delete(oldestKey);
  }
  
  performanceCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  console.log('💾 [CACHE] Stored result for key:', cacheKey.substring(0, 20) + '...');
}

// Optimized image processing
function optimizeImageUrls(imageUrls) {
  return imageUrls.map(url => {
    // In production, you would implement actual image optimization here
    // For now, just ensure URLs are properly formatted
    if (url.startsWith('data:image')) {
      // Data URLs are already optimized for direct use
      return url;
    }
    
    // Add query parameters for image optimization services like Cloudinary
    // Example: url + '?w=1024&h=1024&c_fit&f_auto&q_auto'
    return url;
  });
}

// Intelligent batching for multiple images
function createOptimalImageBatches(imageUrls, maxImagesPerCall = 10) {
  const batches = [];
  
  if (imageUrls.length <= maxImagesPerCall) {
    return [imageUrls]; // Single batch
  }
  
  // Create batches prioritizing the most important images first
  for (let i = 0; i < imageUrls.length; i += maxImagesPerCall) {
    batches.push(imageUrls.slice(i, i + maxImagesPerCall));
  }
  
  return batches;
}

// Enhanced prompt with cost optimization
function getOptimizedAnalysisPrompt(analysisType, ocrText = '', candidates = {}, ebayAspects = [], knownFields = {}) {
  // Use shorter, more focused prompts to reduce token usage
  const basePrompt = `You are an expert eBay listing optimizer. Extract key details from clothing images.

CRITICAL EXTRACTION:
- Look for brand names, sizes, and text in images
- Analyze cut and style for gender determination
- Extract materials and patterns visually

FORMAT REQUIREMENTS:
- Title: MAX 80 chars (Brand + Item + Gender + Size + Color + Style)
- Only return data you can verify from images
- Use null for uncertain fields (never "Unknown")

RESPONSE: Return ONLY valid JSON without markdown:`;

  // Add contextual information only if available
  let contextPrompt = '';
  if (ocrText && ocrText.length > 0) {
    contextPrompt += `\nOCR TEXT: ${ocrText.substring(0, 500)}`; // Limit OCR text to reduce tokens
  }
  
  if (Object.keys(candidates).length > 0) {
    contextPrompt += `\nCANDIDATES: ${JSON.stringify(candidates)}`;
  }
  
  if (Array.isArray(ebayAspects) && ebayAspects.length > 0) {
    contextPrompt += `\nEBAY ASPECTS: ${JSON.stringify(ebayAspects.slice(0, 5))}`; // Limit aspects to reduce tokens
  }

  const schemaPrompt = `\n\nSCHEMA:
{
  "title": "string (max 80 chars)",
  "brand": "string|null",
  "size": "string|null", 
  "item_type": "string",
  "gender": "Men|Women|Unisex|Boys|Girls|null",
  "color": "string|null",
  "material": "string|null",
  "condition": "new|like_new|good|fair|poor",
  "suggested_price": number,
  "confidence": number,
  "key_features": ["string"],
  "ebay_keywords": ["string"]${Array.isArray(ebayAspects) && ebayAspects.length > 0 ? ',\n  "ebay_item_specifics": {}' : ''}
}`;

  return basePrompt + contextPrompt + schemaPrompt;
}

// Cost calculation with accurate pricing
function calculateOperationCost(tokensUsed, imageCount, model = 'gpt-4o-mini') {
  const costs = {
    'gpt-4o-mini': {
      input: 0.000150,   // $0.150 per 1M input tokens
      output: 0.000600,  // $0.600 per 1M output tokens
      vision: 0.001      // ~$0.001 per image
    },
    'gpt-4o': {
      input: 0.0025,     // $2.50 per 1M input tokens
      output: 0.01,      // $10.00 per 1M output tokens
      vision: 0.005      // ~$0.005 per image
    }
  };

  const modelCosts = costs[model] || costs['gpt-4o-mini'];
  
  // Estimate token distribution (70% input, 30% output)
  const inputTokens = Math.floor(tokensUsed * 0.7);
  const outputTokens = Math.floor(tokensUsed * 0.3);
  
  const tokenCost = (inputTokens / 1000000) * modelCosts.input + (outputTokens / 1000000) * modelCosts.output;
  const imageCost = imageCount * modelCosts.vision;
  
  return (tokenCost + imageCost) * 100; // Return in cents
}

exports.handler = async (event, context) => {
  const startTime = Date.now();
  
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
    console.log('🚀 [OPTIMIZED-VISION] Enhanced function started');
    
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    const requestData = JSON.parse(event.body || '{}');
    const { 
      imageUrls, 
      imageUrl,
      ocrText = '', 
      candidates = {}, 
      analysisType = 'enhanced_listing',
      ebayAspects = [],
      knownFields = {},
      useCache = true,
      prioritizeSpeed = false
    } = requestData;

    // Support both new array format and legacy single URL
    const imageArray = imageUrls || (imageUrl ? [imageUrl] : []);
    
    if (!imageArray || imageArray.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'imageUrls or imageUrl is required' })
      };
    }

    // Check cache first if enabled
    const cacheKey = generateCacheKey(imageArray, analysisType, ocrText);
    if (useCache) {
      const cachedResult = getCachedResult(cacheKey);
      if (cachedResult) {
        console.log('✅ [OPTIMIZED-VISION] Returning cached result');
        console.log('💰 [OPTIMIZED-VISION] Cost saved: ~$0.05');
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            ...cachedResult,
            fromCache: true,
            processingTime: Date.now() - startTime
          })
        };
      }
    }

    // Check configuration using shared config
    const configIssues = validateConfig();
    if (configIssues.length > 0) {
      console.error('❌ [OPTIMIZED-VISION] Configuration issues:', configIssues);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Configuration error: ' + configIssues.join(', ') })
      };
    }

    const openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    // Optimize images for better performance
    const optimizedImageUrls = optimizeImageUrls(imageArray);
    console.log('🖼️ [OPTIMIZED-VISION] Processing images:', optimizedImageUrls.length);

    // Choose model based on priority and image count
    let model = 'gpt-4o-mini'; // Default to cost-effective option
    let imageDetail = 'low'; // Default to low detail for cost savings
    
    if (!prioritizeSpeed && imageArray.length <= 3) {
      // Use high detail for small batches when quality is prioritized
      imageDetail = 'high';
    }
    
    if (analysisType === 'premium' || ebayAspects.length > 10) {
      // Use more powerful model for complex analysis
      model = 'gpt-4o';
      imageDetail = 'high';
    }

    console.log('🤖 [OPTIMIZED-VISION] Using model:', model, 'with detail:', imageDetail);
    
    // Create optimized batches for processing
    const imageBatches = createOptimalImageBatches(optimizedImageUrls, 10);
    let combinedResult = null;
    let totalTokens = 0;
    
    for (let batchIndex = 0; batchIndex < imageBatches.length; batchIndex++) {
      const batch = imageBatches[batchIndex];
      console.log(`🔄 [OPTIMIZED-VISION] Processing batch ${batchIndex + 1}/${imageBatches.length} (${batch.length} images)`);
      
      try {
        const response = await openai.chat.completions.create({
          model: model,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: "Return only valid JSON. Do not use code fences." },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: getOptimizedAnalysisPrompt(analysisType, ocrText, candidates, ebayAspects, knownFields)
                },
                ...batch.map(url => ({
                  type: "image_url",
                  image_url: {
                    url: url,
                    detail: imageDetail
                  }
                }))
              ]
            }
          ],
          max_tokens: prioritizeSpeed ? 800 : 1200 // Reduce tokens for speed
        });

        console.log('✅ [OPTIMIZED-VISION] Batch processed successfully');
        console.log('📊 [OPTIMIZED-VISION] Tokens used:', response.usage?.total_tokens || 0);
        
        totalTokens += response.usage?.total_tokens || 0;
        
        const rawContent = response.choices[0]?.message?.content || "";
        const parsedResult = JSON.parse(rawContent);
        
        // Combine results from multiple batches
        if (!combinedResult) {
          combinedResult = parsedResult;
        } else {
          // Merge results, prioritizing the most confident data
          if (parsedResult.confidence > (combinedResult.confidence || 0)) {
            combinedResult = { ...combinedResult, ...parsedResult };
          }
        }
        
      } catch (batchError) {
        console.error(`❌ [OPTIMIZED-VISION] Batch ${batchIndex + 1} failed:`, batchError);
        
        // Continue processing other batches if one fails
        if (batchIndex === imageBatches.length - 1 && !combinedResult) {
          throw batchError; // If all batches failed, throw error
        }
      }
    }

    if (!combinedResult) {
      throw new Error('All image batches failed to process');
    }

    // Validate the combined result
    const validated = AiListing.safeParse(combinedResult);
    
    if (!validated.success) {
      console.error('❌ [OPTIMIZED-VISION] Validation failed:', validated.error);
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          ok: false,
          error: 'AI_JSON_VALIDATION_FAILED',
          message: 'AI response validation failed',
          issues: validated.error?.errors?.map(e => ({ 
            path: e.path?.join('.') || 'unknown', 
            message: e.message || 'unknown error'
          })) || []
        })
      };
    }

    // Calculate and track costs
    const operationCost = calculateOperationCost(totalTokens, optimizedImageUrls.length, model);
    totalTokensUsed += totalTokens;
    totalImagesProcessed += optimizedImageUrls.length;
    totalCostCents += operationCost;

    const processingTime = Date.now() - startTime;
    
    console.log('💰 [OPTIMIZED-VISION] Operation cost: $' + (operationCost / 100).toFixed(4));
    console.log('⏱️ [OPTIMIZED-VISION] Processing time: ' + processingTime + 'ms');
    console.log('📊 [OPTIMIZED-VISION] Session totals:', {
      tokens: totalTokensUsed,
      images: totalImagesProcessed,
      cost: '$' + (totalCostCents / 100).toFixed(4)
    });

    const result = {
      ok: true,
      data: validated.data,
      usage: {
        total_tokens: totalTokens,
        images_processed: optimizedImageUrls.length,
        model_used: model,
        detail_level: imageDetail,
        cost_cents: operationCost
      },
      performance: {
        processing_time_ms: processingTime,
        batches_processed: imageBatches.length,
        cache_used: false,
        optimizations_applied: [
          'image_batching',
          'cost_optimized_prompts',
          'intelligent_model_selection',
          prioritizeSpeed ? 'speed_optimized' : 'quality_optimized'
        ]
      },
      fromCache: false
    };

    // Cache the result for future use
    if (useCache) {
      setCachedResult(cacheKey, result);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ [OPTIMIZED-VISION] Critical error:', error);
    
    const processingTime = Date.now() - startTime;
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        error_type: 'processing_error',
        processing_time_ms: processingTime,
        session_stats: {
          total_tokens_used: totalTokensUsed,
          total_images_processed: totalImagesProcessed,
          total_cost_cents: totalCostCents
        }
      })
    };
  }
};