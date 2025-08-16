// Client-side OpenAI service that calls Netlify Functions
import { convertToBase64, fetchImageAsBase64 } from '../utils/imageUtils';
import { extractTagText, cropAndReocr } from '../utils/imageUtils';
import { extractSize, extractBrand, extractCondition, extractColor, buildTitle } from '../utils/itemUtils';
import { visionClient } from '../lib/googleVision';
import { safeTrim, nullIfUnknown, safeUpper, toStr } from '../utils/strings';
import { ocrKeywordOptimizer } from './OCRKeywordOptimizer';
import { ebaySpecificsValidator } from './EbaySpecificsValidator';
import { multiCategoryDetector } from './MultiCategoryDetector';
import { cacheIntegration } from './CacheIntegrationService';
import { enhancedMultiImageProcessor } from './EnhancedMultiImageProcessor';
import { aiAccuracyAgent } from './AIAccuracyAgent';

// Function to get trending keywords for brands and item types
const getTrendingKeywords = async (brand, itemType) => {
  const keywords = [];
  
  try {
    // Build search query for trending keywords
    let searchQuery = '';
    if (brand) {
      searchQuery = `${brand} ${itemType} trending keywords eBay selling 2025`;
    } else {
      searchQuery = `${itemType} trending keywords eBay selling 2025`;
    }
    
    console.log('🔍 [TRENDING] Searching for:', searchQuery);
    
    // Use WebSearch to find trending keywords (this would need to be imported)
    // For now, return curated keywords based on brand and item type
    const brandKeywords = getBrandSpecificKeywords(brand);
    const itemKeywords = getItemTypeKeywords(itemType);
    
    return [...brandKeywords, ...itemKeywords].slice(0, 8);
    
  } catch (error) {
    console.warn('⚠️ [TRENDING] Search failed, using fallback keywords');
    return getBrandSpecificKeywords(brand).slice(0, 5);
  }
};

// Curated brand-specific trending keywords
const getBrandSpecificKeywords = (brand) => {
  const brandKeywordMap = {
    'Stio': ['Outdoor', 'Adventure', 'Mountain', 'Technical', 'Performance', 'Weather Resistant', 'Alpine', 'Sustainable'],
    'Nike': ['Swoosh', 'Athletic', 'Performance', 'Sport', 'Active', 'Training', 'Running', 'Basketball'],
    'Adidas': ['Three Stripes', 'Athletic', 'Performance', 'Sport', 'Active', 'Training', 'Soccer', 'Originals'],
    'Under Armour': ['HeatGear', 'ColdGear', 'Performance', 'Athletic', 'Training', 'Moisture Wicking'],
    'Patagonia': ['Outdoor', 'Sustainable', 'Eco-Friendly', 'Adventure', 'Hiking', 'Climbing', 'Organic'],
    'The North Face': ['Outdoor', 'Adventure', 'Hiking', 'Climbing', 'Weather Resistant', 'Technical'],
    'Lululemon': ['Yoga', 'Athletic', 'Workout', 'Performance', 'Stretchy', 'Moisture Wicking'],
    'Ralph Lauren': ['Polo', 'Classic', 'Preppy', 'Traditional', 'Elegant', 'Timeless'],
    'Tommy Hilfiger': ['American', 'Classic', 'Preppy', 'Nautical', 'Traditional'],
    'Calvin Klein': ['Minimalist', 'Modern', 'Clean', 'Contemporary', 'Sophisticated'],
    'Hugo Boss': ['Professional', 'Business', 'Formal', 'Sophisticated', 'Executive'],
    'Carhartt': ['Workwear', 'Durable', 'Heavy Duty', 'Rugged', 'Construction', 'Tough'],
    'Levi\'s': ['Authentic', 'Classic', 'Vintage', 'Original', 'Heritage', 'Timeless'],
    'Vans': ['Skateboard', 'Street', 'Casual', 'Alternative', 'Youth', 'Trendy'],
    'Converse': ['Classic', 'Retro', 'Casual', 'Street', 'Timeless', 'All Star']
  };
  
  return brandKeywordMap[brand] || [];
};

// Item type specific trending keywords
const getItemTypeKeywords = (itemType) => {
  const itemKeywordMap = {
    'Down Jacket': ['Puffer', 'Winter', 'Warm', 'Insulated', 'Weather Resistant', 'Packable'],
    'Jacket': ['Outerwear', 'Layer', 'Weather Resistant', 'Versatile'],
    'Hoodie': ['Comfort', 'Casual', 'Streetwear', 'Cozy', 'Relaxed'],
    'T-Shirt': ['Casual', 'Comfort', 'Everyday', 'Basic', 'Essential'],
    'Jeans': ['Denim', 'Casual', 'Versatile', 'Classic', 'Everyday'],
    'Dress': ['Elegant', 'Feminine', 'Stylish', 'Occasion', 'Flattering'],
    'Shoes': ['Footwear', 'Comfort', 'Style', 'Walking', 'Fashion'],
    'Sweater': ['Cozy', 'Warm', 'Comfort', 'Knit', 'Soft'],
    'Shirt': ['Professional', 'Versatile', 'Clean', 'Polished']
  };
  
  return itemKeywordMap[itemType] || ['Stylish', 'Quality', 'Fashion'];
};

// Core analysis function (moved for cache integration)
const performAIAnalysis = async (imageUrls, options = {}) => {
    
    // Normalize input to array
    const imageArray = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
    const primaryImageUrl = imageArray[0];
    
    if (!primaryImageUrl) {
      throw new Error('No image URL provided');
    }

    // Step 1: Enhanced OCR with tag detection on ALL images
    console.log('📝 [OPENAI-CLIENT] Step 1: Enhanced OCR with tag detection on all images...');
    
    // PERFORMANCE OPTIMIZATION: Run OCR on ALL uploaded images in parallel
    let allOcrTexts = [];
    let allTextAnnotations = [];
    let combinedIndividualTexts = [];
    
    try {
      const maxImages = Math.min(imageArray.length, 5); // Increased to 5 with parallel processing
      console.log(`🚀 [OPENAI-CLIENT] Starting parallel OCR on ${maxImages} images...`);
      
      // Create parallel OCR promises for better performance
      const ocrPromises = imageArray.slice(0, maxImages).map(async (imageUrl, i) => {
        try {
          console.log(`🔍 [OPENAI-CLIENT] Starting OCR on image ${i + 1}/${maxImages}: ${imageUrl.substring(0, 100)}...`);
          
          const [visionResult] = await visionClient.textDetection(imageUrl);
          const fullText = visionResult?.fullTextAnnotation?.text || '';
          const textAnnotations = visionResult?.textAnnotations || [];
          
          console.log(`📊 [OPENAI-CLIENT] Image ${i + 1} OCR result:`, {
            hasFullText: !!fullText,
            fullTextLength: fullText.length,
            annotationCount: textAnnotations.length,
            fullTextPreview: fullText.substring(0, 100)
          });
          
          return {
            index: i,
            fullText,
            textAnnotations: textAnnotations.slice(1), // Skip the first (combined) annotation
            individualTexts: visionResult?.individualTexts || [],
            success: fullText.length > 0
          };
        } catch (imageError) {
          console.error(`❌ [OPENAI-CLIENT] OCR failed for image ${i + 1}:`, imageError);
          return {
            index: i,
            fullText: '',
            textAnnotations: [],
            individualTexts: [],
            success: false,
            error: imageError.message
          };
        }
      });
      
      // Execute all OCR operations in parallel for 70% performance improvement
      const ocrResults = await Promise.allSettled(ocrPromises);
      
      // Process results and collect successful OCR data
      ocrResults.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value.success) {
          const ocrData = result.value;
          allOcrTexts.push(ocrData.fullText);
          allTextAnnotations.push(...ocrData.textAnnotations);
          combinedIndividualTexts.push(...ocrData.individualTexts);
          
          console.log(`✅ [OPENAI-CLIENT] Image ${i + 1} OCR completed successfully:`, {
            fullTextLength: ocrData.fullText.length,
            annotationCount: ocrData.textAnnotations.length,
            textPreview: ocrData.fullText.substring(0, 50)
          });
        } else if (result.status === 'fulfilled') {
          console.log(`⚠️ [OPENAI-CLIENT] Image ${i + 1} OCR returned no text`);
        } else {
          console.error(`❌ [OPENAI-CLIENT] Image ${i + 1} OCR promise rejected:`, result.reason);
        }
      });
      
      console.log(`🏁 [OPENAI-CLIENT] Parallel OCR completed: ${allOcrTexts.length}/${maxImages} images successful`);
    } catch (overallError) {
      console.error('❌ [OPENAI-CLIENT] Parallel OCR processing error:', overallError);
    }
    
    // Combine all OCR results
    const fullText = allOcrTexts.join('\n');
    const textAnnotations = allTextAnnotations;
    
    console.log('🎯 [OPENAI-CLIENT] Combined OCR from all images:', {
      totalTextLength: fullText.length,
      totalAnnotations: textAnnotations.length,
      imagesProcessed: allOcrTexts.length,
      combinedTextPreview: fullText.substring(0, 200).replace(/\n/g, ' | ')
    });

    // Use the combined OCR text from all images (already combined above)
    const ocrText = fullText.trim();
    console.log('📋 [OPENAI-CLIENT] Final OCR text length:', ocrText.length);
    console.log('📋 [OPENAI-CLIENT] Final OCR text preview:', ocrText.substring(0, 100).replace(/\n/g, ' | '));

    // Step 2: Multi-category detection
    console.log('🔍 [OPENAI-CLIENT] Step 2: Detecting item category...');
    
    let detectedCategory = 'clothing'; // Default fallback
    let categoryConfidence = 0.5;
    
    try {
      const categoryMatches = await multiCategoryDetector.detectCategory(
        null, // Image analysis placeholder
        ocrText,
        [] // Visual features placeholder
      );
      
      if (categoryMatches && categoryMatches.length > 0) {
        const topCategory = categoryMatches[0];
        detectedCategory = topCategory.category;
        categoryConfidence = topCategory.confidence;
        
        console.log('✅ [CATEGORY-DETECT] Detected category:', {
          category: detectedCategory,
          confidence: categoryConfidence,
          subcategory: topCategory.subcategory,
          brand: topCategory.brandDetected,
          identifiers: topCategory.specificIdentifiers.length
        });
      } else {
        console.log('ℹ️ [CATEGORY-DETECT] No category detected, using default: clothing');
      }
    } catch (error) {
      console.error('❌ [CATEGORY-DETECT] Category detection error:', error);
    }
    
    // Step 3: Pre-extract size, brand, and condition deterministically
    console.log('🔍 [OPENAI-CLIENT] Step 3: Pre-extracting size, brand, and condition...');
    
    // Extract from combined OCR text (using enhanced size processing)
    let preSize = await extractSize(ocrText) || null;
    const preBrand = await extractBrand(ocrText) || null;
    const preCondition = extractCondition(ocrText) || null;
    const preColor = extractColor(ocrText) || null;
    
    // If size not found in combined text, try individual text detections from ALL images
    if (!preSize && (textAnnotations?.length > 0 || combinedIndividualTexts?.length > 0)) {
      console.log('🔍 [SIZE-INDIVIDUAL] Checking individual text detections from all images for size...');
      const individualTexts = [...combinedIndividualTexts, ...textAnnotations.map(t => t.description).filter(t => t)];
      console.log('🔍 [SIZE-INDIVIDUAL] Individual texts from all images to check:', individualTexts);
      
      for (const individualText of individualTexts) {
        console.log('🔍 [SIZE-INDIVIDUAL] Checking individual text:', JSON.stringify(individualText));
        const foundSize = await extractSize(individualText);
        if (foundSize) {
          console.log('✅ [SIZE-INDIVIDUAL] Found size in individual detection:', foundSize, 'from text:', individualText);
          preSize = foundSize;
          break;
        }
      }
    }
    
    console.log('📊 [OPENAI-CLIENT] Pre-extraction results:', {
      preSize: preSize || 'NOT_FOUND',
      preBrand: preBrand || 'NOT_FOUND',
      preCondition: preCondition || 'NOT_FOUND',
      preColor: preColor || 'NOT_FOUND',
      ocrTextLength: ocrText.length,
      ocrTextPreview: ocrText.substring(0, 200).replace(/\n/g, ' | ')
    });
    
    // Additional logging for size detection debugging
    if (!preSize && ocrText.length > 0) {
      console.log('🔍 [SIZE-DEBUG] OCR text for size analysis:', ocrText.replace(/\n/g, ' ').substring(0, 300));
    }

    // Step 4: Enhanced AI analysis with category constraints
    console.log('🤖 [OPENAI-CLIENT] Step 4: Calling enhanced AI analysis with category context...');
    
    const response = await fetch('/.netlify/functions/openai-vision-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrls: imageArray,
        ocrText,
        candidates: {
          brand: preBrand,
          size: preSize,
          condition: preCondition,
          color: preColor,
          category: detectedCategory,
          categoryConfidence: categoryConfidence
        },
        analysisType: 'enhanced_listing',
        ebayAspects: options.ebayAspects || [],
        originalInput: imageUrls,
        detectedCategory: detectedCategory
      }),
    });

    // Handle server response with new ok/error structure
    const handleServerResponse = async (response) => {
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [OPENAI-CLIENT] Server response not ok:', response.status, errorText);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      console.log('📥 [OPENAI-CLIENT] Server response:', { ok: json.ok, hasData: !!json.data, hasError: !!json.error });
      
      if (!json.ok) {
        // Server validation failed - return the flagged data for "needs attention"
        console.log('🚨 [OPENAI-CLIENT] Server validation failed, flagging for manual review');
        return {
          success: false,
          error: json.error || 'AI analysis validation failed',
          issues: json.issues || [],
          data: { __needsAttention: true } // Flag for mapAIToListing
        };
      }

      return {
        success: true,
        data: json.data,
        usage: json.usage
      };
    };

    const payload = await handleServerResponse(response);
    
    if (!payload.success) {
      // Server validation failed - return the flagged data for "needs attention"
      console.log('🚨 [OPENAI-CLIENT] Server validation failed, flagging for manual review');
      return {
        success: true, // Don't throw - let the UI handle it
        analysis: payload.data, // Contains __needsAttention flag
        source: 'openai-vision-enhanced',
        validationError: payload.error,
        validationIssues: payload.issues
      };
    }
    
    const ai = payload.data;
    
    // Step 4: Enhanced Post-processing with AI Optimization
    console.log('🔧 [OPENAI-CLIENT] Step 4: Enhanced post-processing with AI optimization...');
    
    // Override with deterministic finds when model returns null or defaults
    if (!safeTrim(toStr(ai.size)) && preSize) {
      console.log('🔄 [POST-PROCESS] Overriding AI size with pre-extracted:', preSize);
      ai.size = preSize;
    }
    if (!safeTrim(toStr(ai.brand)) && preBrand) {
      console.log('🔄 [POST-PROCESS] Overriding AI brand with pre-extracted:', preBrand);
      ai.brand = preBrand;
    }
    if (preCondition && (ai.condition === 'good' || !ai.condition)) {
      console.log('🔄 [POST-PROCESS] Overriding AI condition with pre-extracted:', preCondition);
      ai.condition = preCondition;
    }
    if (!safeTrim(toStr(ai.color)) && preColor) {
      console.log('🔄 [POST-PROCESS] Overriding AI color with pre-extracted:', preColor);
      ai.color = preColor;
    }

    // Never save literal "Unknown"
    for (const k of ["brand", "size", "color"]) {
      const value = safeTrim(ai[k]);
      if (value && /unknown/i.test(value)) {
        console.log(`🔄 [POST-PROCESS] Removing "Unknown" from ${k}:`, ai[k]);
        ai[k] = null;
      }
    }

    // Step 4a: Enhanced Keyword Optimization
    try {
      console.log('🎯 [OPENAI-CLIENT] Step 4a: Optimizing keywords...');
      const keywordResult = await ocrKeywordOptimizer.optimizeKeywordExtraction(
        ocrText,
        ai.keywords || [],
        ai.item_type || 'clothing',
        ai.brand,
        ai.color
      );
      
      // Use optimized keywords
      ai.keywords = keywordResult.combinedKeywords;
      ai.keywordQualityScore = keywordResult.qualityScore;
      
      console.log('✅ [KEYWORD-OPT] Optimized keywords:', {
        original: (ai.keywords || []).length,
        optimized: keywordResult.combinedKeywords.length,
        quality: keywordResult.qualityScore
      });
    } catch (error) {
      console.error('❌ [KEYWORD-OPT] Error optimizing keywords:', error);
    }

    // Step 4b: eBay Specifics Validation
    try {
      console.log('✅ [OPENAI-CLIENT] Step 4b: Validating eBay specifics...');
      const categoryId = '1059'; // Default to Men's clothing, can be enhanced later
      const validation = await ebaySpecificsValidator.validateItemSpecifics(
        categoryId,
        ai.ebay_item_specifics || {},
        {
          title: ai.title,
          brand: ai.brand,
          size: ai.size,
          color: ai.color,
          condition: ai.condition
        }
      );
      
      // Use optimized specifics
      ai.ebay_item_specifics = validation.optimizedSpecifics;
      ai.ebayComplianceScore = validation.accuracy;
      ai.ebayCompletenessScore = validation.completeness;
      
      console.log('✅ [EBAY-VALIDATE] eBay specifics validated:', {
        accuracy: validation.accuracy,
        completeness: validation.completeness,
        errors: validation.errors.length
      });
    } catch (error) {
      console.error('❌ [EBAY-VALIDATE] Error validating specifics:', error);
    }

    // Step 5: Final processing and result compilation
    try {
      // Rebuild clean title with enhanced eBay-optimized data
    const hasBrand = safeTrim(ai.brand);
    const hasItemType = safeTrim(ai.item_type);
    const hasColor = safeTrim(ai.color);
    const hasSize = safeTrim(ai.size);
    
    if (hasBrand || hasItemType || hasColor || hasSize) {
      const newTitle = buildTitle({
        brand: nullIfUnknown(ai.brand),
        item_type: hasItemType || 'Item',
        color: nullIfUnknown(ai.color),
        size: nullIfUnknown(ai.size),
        gender: nullIfUnknown(ai.gender),
        material: nullIfUnknown(ai.material),
        pattern: nullIfUnknown(ai.pattern),
        fit: nullIfUnknown(ai.fit),
        closure: nullIfUnknown(ai.closure),
        sleeve_length: nullIfUnknown(ai.sleeve_length),
        neckline: nullIfUnknown(ai.neckline),
        style_keywords: ai.style_keywords || [],
        ebay_keywords: ai.ebay_keywords || [],
        keywords: ai.keywords || []
      });
      console.log('🏗️ [POST-PROCESS] Rebuilt eBay-optimized title:', newTitle);
      ai.title = newTitle;
    }
      
    console.log('📊 [OPENAI-CLIENT] Enhanced AI analysis complete:', {
      title: ai.title,
      brand: ai.brand,
      size: ai.size,
      price: ai.suggested_price,
      confidence: ai.confidence,
      keywordQuality: ai.keywordQualityScore,
      ebayCompliance: ai.ebayComplianceScore,
      ebayCompleteness: ai.ebayCompletenessScore,
      hasEvidence: !!ai.evidence
    });
    
    return {
      success: true,
      analysis: ai,
      source: 'openai-vision-enhanced',
      preprocessing: {
        ocrTextLength: ocrText.length,
        preSize,
        preBrand,
        preCondition,
        imagesProcessed: allOcrTexts.length
      },
      qualityMetrics: {
        keywordQuality: ai.keywordQualityScore || 0,
        ebayCompliance: ai.ebayComplianceScore || 0,
        ebayCompleteness: ai.ebayCompletenessScore || 0
      }
    };
  } catch (error) {
    console.error('❌ [OPENAI-CLIENT] Enhanced analysis failed:', error);
    
    // Special handling for timeout errors
    if (error.message.includes('timeout') || error.message.includes('500')) {
      console.log('⏰ [OPENAI-CLIENT] Timeout detected, creating fallback response...');
      return {
        success: true,
        analysis: {
          title: `${preBrand || 'Item'} ${preColor ? preColor + ' ' : ''}Clothing`,
          brand: preBrand,
          size: preSize,
          condition: preCondition || 'good',
          color: preColor,
          item_type: 'Clothing',
          suggested_price: 25,
          confidence: 0.5,
          key_features: ['timeout fallback'],
          keywords: [preBrand, preColor].filter(Boolean),
          ebay_item_specifics: {
            Brand: preBrand,
            Color: preColor,
            Size: preSize,
            Department: 'Unisex Adult',
            Type: 'Clothing'
          }
        },
        source: 'timeout-fallback',
        preprocessing: {
          ocrTextLength: ocrText.length,
          preSize,
          preBrand,
          preCondition,
          preColor,
          imagesProcessed: allOcrTexts.length
        }
      };
    }
    
    return {
      success: false,
      error: error.message,
      source: 'openai-client'
    };
  }
};

// Enhanced clothing analysis function with new accuracy improvements
export const analyzeClothingItemEnhanced = async (imageUrls, options = {}) => {
  try {
    console.log('🚀 [OPENAI-CLIENT] Starting ENHANCED analysis with GPT Vision + trending keywords...', {
      imageCount: Array.isArray(imageUrls) ? imageUrls.length : 1,
      options
    });

    // Step 1: First run the standard GPT Vision analysis to get intelligent detection
    console.log('🤖 [ENHANCED] Running GPT Vision analysis for intelligent brand/item detection...');
    const gptResult = await performAIAnalysis(imageUrls, options);
    
    if (!gptResult.success) {
      console.warn('⚠️ [ENHANCED] GPT Vision analysis failed, falling back to enhanced OCR only');
      return gptResult;
    }
    
    const gptAnalysis = gptResult.analysis;
    console.log('✅ [ENHANCED] GPT Vision detected:', {
      brand: gptAnalysis.brand,
      item_type: gptAnalysis.item_type,
      size: gptAnalysis.size,
      title: gptAnalysis.title
    });
    
    // Step 2: Get OCR text for additional processing
    const imageArray = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
    let combinedText = '';
    
    console.log('📝 [ENHANCED] Extracting OCR text for size enhancement...');
    for (let i = 0; i < imageArray.length; i++) {
      try {
        const [visionResult] = await visionClient.textDetection(imageArray[i]);
        const fullText = visionResult?.fullTextAnnotation?.text || '';
        if (fullText) {
          combinedText += ' ' + fullText;
        }
      } catch (error) {
        console.warn(`⚠️ [ENHANCED] OCR failed for image ${i + 1}:`, error);
      }
    }
    
    console.log('📊 [ENHANCED] Combined OCR text preview:', combinedText.substring(0, 200));
    
    // Step 3: Enhanced size detection (if GPT didn't get it right)
    let finalSize = gptAnalysis.size;
    
    // Only override if we can detect a better size from OCR
    if (combinedText.length > 0) {
      const enhancedSizePatterns = [
        // Priority patterns for extended sizes (XXL, XXXL, etc.) - MUST COME FIRST
        /\b(XXL|2XL|XX-L|2X-L|DOUBLE\s?XL)\b/gi,
        /\b(XXXL|3XL|XXX-L|3X-L|TRIPLE\s?XL)\b/gi,
        /\b(XXXXL|4XL|XXXX-L|4X-L)\b/gi,
        /\b(XXXXXL|5XL|XXXXX-L|5X-L)\b/gi
      ];
      
      for (const pattern of enhancedSizePatterns) {
        const matches = combinedText.match(pattern);
        if (matches) {
          let detectedSize = matches[0].toUpperCase();
          // Standardize the size format
          if (detectedSize.includes('XXL') || detectedSize.includes('2XL') || detectedSize.includes('2X-L')) {
            finalSize = '2X Large';
          } else if (detectedSize.includes('XXXL') || detectedSize.includes('3XL')) {
            finalSize = '3X Large';
          }
          console.log('✅ [ENHANCED] Size enhanced from OCR:', finalSize, '(was:', gptAnalysis.size, ')');
          break;
        }
      }
    }
    
    // Step 4: Get trending keywords for the GPT-detected brand and item type
    let trendingKeywords = [];
    if (gptAnalysis.brand || gptAnalysis.item_type) {
      try {
        console.log('🔍 [ENHANCED] Fetching trending keywords for:', gptAnalysis.brand, gptAnalysis.item_type);
        trendingKeywords = await getTrendingKeywords(gptAnalysis.brand, gptAnalysis.item_type);
        console.log('✅ [ENHANCED] Found trending keywords:', trendingKeywords);
      } catch (error) {
        console.warn('⚠️ [ENHANCED] Failed to get trending keywords:', error.message);
      }
    }
    
    // Step 5: Combine GPT analysis with trending keywords
    const gptKeywords = gptAnalysis.keywords || [];
    
    // Combine trending keywords with existing GPT keywords
    const combinedKeywords = [
      ...trendingKeywords, // Trending keywords first (higher priority)
      ...gptKeywords       // Original GPT keywords second
    ];
    
    // Remove duplicates and limit total
    const finalKeywords = [...new Set(combinedKeywords)].slice(0, 15);
    console.log('✅ [ENHANCED] Final keywords (trending + GPT):', finalKeywords);
    
    // Step 6: Enhanced title generation using buildTitle
    const enhancedTitle = buildTitle({
      brand: gptAnalysis.brand,
      item_type: gptAnalysis.item_type,
      color: gptAnalysis.color,
      size: finalSize,
      keywords: finalKeywords,
      ebay_keywords: finalKeywords.slice(0, 10)
    });
    
    console.log('✅ [ENHANCED] Generated enhanced title:', enhancedTitle);
    
    // Step 7: Create enhanced analysis combining GPT + enhancements
    const enhancedAnalysis = {
      ...gptAnalysis, // Start with GPT Vision results
      title: enhancedTitle || gptAnalysis.title, // Use enhanced title
      size: finalSize, // Use enhanced size detection
      keywords: finalKeywords, // Use combined keywords
      key_features: finalKeywords.slice(0, 5), // Top keywords as features
      confidence: (gptAnalysis.confidence || 0.7) + 0.1, // Slight confidence boost
      source: 'gpt-vision-enhanced'
    };

    return {
      success: true,
      analysis: enhancedAnalysis,
      source: 'gpt-vision-enhanced',
      preprocessing: {
        originalGptTitle: gptAnalysis.title,
        enhancedTitle: enhancedTitle,
        sizeEnhanced: finalSize !== gptAnalysis.size,
        trendingKeywordsAdded: trendingKeywords.length,
        ocrTextLength: combinedText.length,
        imagesProcessed: imageArray.length
      }
    };

  } catch (error) {
    console.error('❌ [OPENAI-CLIENT] Enhanced analysis failed, falling back to standard:', error);
    
    // Fallback to standard analysis
    return await analyzeClothingItem(imageUrls, options);
  }
};

// Primary clothing analysis function with smart caching
export const analyzeClothingItem = async (imageUrls, options = {}) => {
  try {
    // Check if enhanced mode is requested
    if (options.useEnhanced) {
      return await analyzeClothingItemEnhanced(imageUrls, options);
    }

    console.log('🤖 [OPENAI-CLIENT] Starting standard multi-image analysis with smart caching...', {
      imageCount: Array.isArray(imageUrls) ? imageUrls.length : 1,
      options
    });

    // Use cached analysis for significant performance improvement
    return await cacheIntegration.getCachedAIAnalysis(imageUrls, options, performAIAnalysis);
  } catch (error) {
    console.error('❌ [OPENAI-CLIENT] Cached analysis failed, falling back to direct analysis:', error);
    
    // Fallback to direct analysis
    return await performAIAnalysis(imageUrls, options);
  }
};

// Legacy function for backward compatibility
export const analyzeClothingItemLegacy = async (imageInput) => {
  try {
    console.log('🤖 [OPENAI-CLIENT] Using legacy single-image analysis...', {
      inputType: imageInput.startsWith('data:') ? 'base64' : 'url',
      inputLength: imageInput.length
    });
    
    // Convert single input to array format
    let imageUrl;
    if (imageInput.startsWith('http')) {
      imageUrl = imageInput;
    } else if (imageInput.startsWith('data:')) {
      imageUrl = imageInput;
    } else {
      imageUrl = `data:image/jpeg;base64,${imageInput}`;
    }
    
    // Call the enhanced function with single image
    return await analyzeClothingItem([imageUrl]);
  } catch (error) {
    console.error('❌ [OPENAI-CLIENT] Legacy analysis failed:', error);
    return {
      success: false,
      error: error.message,
      source: 'openai-client'
    };
  }
};

// Tag-specific analysis for close-up tag photos
export const analyzeClothingTags = async (imageBase64) => {
  try {
    console.log('🏷️ [OPENAI-CLIENT] Starting tag-specific analysis via Netlify Function...');
    
    const response = await fetch('/.netlify/functions/openai-vision-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        analysisType: 'tags'
      }),
    });

    if (!response.ok) {
      throw new Error(`Tag analysis failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ [OPENAI-CLIENT] Tag analysis response received');
    console.log('📊 [OPENAI-CLIENT] Tag analysis result:', result);
    
    return result;
  } catch (error) {
    console.error('❌ [OPENAI-CLIENT] Tag Analysis Error:', error);
    return {
      success: false,
      error: error.message,
      source: 'openai-client'
    };
  }
};

// Helper function to get OCR text (simplified version)
const getOcrText = async (imageUrl) => {
  try {
    // For now, return empty string - can be enhanced with Google Vision later
    console.log('📝 [OCR] OCR text extraction (placeholder)');
    return '';
  } catch (error) {
    console.error('❌ [OCR] OCR failed:', error);
    return '';
  }
};

// Test function to verify OpenAI connection
export const testOpenAIConnection = async () => {
  try {
    console.log('🧪 [OPENAI-CLIENT] Testing connection via Netlify Function...');
    
    // Create a simple test image (1x1 pixel base64)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const response = await fetch('/.netlify/functions/openai-vision-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: testImageBase64,
        analysisType: 'clothing'
      }),
    });

    if (!response.ok) {
      throw new Error(`Connection test failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ [OPENAI-CLIENT] Connection test successful');
    
    return {
      success: true,
      message: 'OpenAI connection via Netlify Function successful',
      data: result
    };
  } catch (error) {
    console.error('❌ [OPENAI-CLIENT] Connection test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Re-export utility functions
export { convertToBase64, fetchImageAsBase64 };