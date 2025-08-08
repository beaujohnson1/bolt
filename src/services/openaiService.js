// Client-side OpenAI service that calls Netlify Functions
import { convertToBase64, fetchImageAsBase64 } from '../utils/imageUtils';
import { extractTagText, cropAndReocr } from '../utils/imageUtils';
import { extractSize, extractBrand, buildTitle } from '../utils/itemUtils';
import { visionClient } from '../lib/googleVision';
import { safeTrim, nullIfUnknown, safeUpper, toStr } from '../utils/strings';
import { callFunction, mockFunction } from '../lib/functions';

// Primary clothing analysis function - now accepts URL or base64
export const analyzeClothingItem = async (imageUrls, options = {}) => {
  try {
    console.log('🤖 [OPENAI-CLIENT] Starting enhanced multi-image analysis...', {
      imageCount: Array.isArray(imageUrls) ? imageUrls.length : 1,
      options
    });
    
    // Normalize input to array
    const imageArray = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
    const primaryImageUrl = imageArray[0];
    
    if (!primaryImageUrl) {
      throw new Error('No image URL provided');
    }

    // Step 1: Enhanced OCR with tag detection
    console.log('📝 [OPENAI-CLIENT] Step 1: Enhanced OCR with tag detection...');
    const [visionResult] = await visionClient.textDetection(primaryImageUrl);
    const fullText = visionResult?.fullTextAnnotation?.text || '';
    const textAnnotations = visionResult?.textAnnotations || [];
    
    console.log('✅ [OPENAI-CLIENT] OCR completed:', {
      fullTextLength: fullText.length,
      annotationCount: textAnnotations.length
    });

    // Extract tag-specific text
    const tagTexts = extractTagText(textAnnotations);
    
    // Simulate crop and re-OCR for tag regions
    const croppedTexts = await cropAndReocr(primaryImageUrl, textAnnotations.slice(0, 4));
    
    // Combine all OCR text
    const ocrText = [fullText, ...tagTexts, ...croppedTexts].join('\n').trim();
    console.log('📋 [OPENAI-CLIENT] Combined OCR text length:', ocrText.length);

    // Step 2: Pre-extract size and brand deterministically
    console.log('🔍 [OPENAI-CLIENT] Step 2: Pre-extracting size and brand...');
    const preSize = extractSize(ocrText) || null;
    const preBrand = extractBrand(ocrText) || null;
    
    console.log('📊 [OPENAI-CLIENT] Pre-extraction results:', {
      preSize,
      preBrand,
      ocrTextPreview: ocrText.substring(0, 100)
    });

    // Step 3: Enhanced AI analysis with constraints
    console.log('🤖 [OPENAI-CLIENT] Step 3: Calling enhanced AI analysis...');
    
    const payload = {
        imageUrls: imageArray,
        ocrText,
        candidates: {
          brand: preBrand,
          size: preSize
        },
        analysisType: 'enhanced_listing',
        ebayAspects: options.ebayAspects || [],
        originalInput: imageUrls
    };
    
    const response = await callFunction('openai-vision-analysis', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    // Handle mock response in development
    if (response.mock) {
      console.log('🔧 [OPENAI-CLIENT] Using mock response in development');
      return {
        success: true,
        analysis: response.data,
        source: 'mock-development'
      };
    }

    // Handle server response with new ok/error structure
    if (!response.ok) {
      // Server validation failed - return the flagged data for "needs attention"
      console.log('🚨 [OPENAI-CLIENT] Server validation failed, flagging for manual review');
      return {
        success: false,
        error: response.error || 'AI analysis validation failed',
        issues: response.issues || [],
        data: { __needsAttention: true } // Flag for mapAIToListing
      };
    }

    const apiResponse = {
      success: true,
      data: response.data,
      usage: response.usage
    };
    
    if (!apiResponse.success) {
      // Server validation failed - return the flagged data for "needs attention"
      console.log('🚨 [OPENAI-CLIENT] Server validation failed, flagging for manual review');
      return {
        success: true, // Don't throw - let the UI handle it
        analysis: apiResponse.data, // Contains __needsAttention flag
        source: 'openai-vision-enhanced',
        validationError: apiResponse.error,
        validationIssues: apiResponse.issues
      };
    }
    
    const ai = response.data;
    
    // Step 4: Post-processing (last line of defense)
    console.log('🔧 [OPENAI-CLIENT] Step 4: Post-processing AI results...');
    
    // Override with deterministic finds when model returns null
    if (!safeTrim(toStr(ai.size)) && preSize) {
      console.log('🔄 [POST-PROCESS] Overriding AI size with pre-extracted:', preSize);
      ai.size = preSize;
    }
    if (!safeTrim(toStr(ai.brand)) && preBrand) {
      console.log('🔄 [POST-PROCESS] Overriding AI brand with pre-extracted:', preBrand);
      ai.brand = preBrand;
    }

    // Never save literal "Unknown"
    for (const k of ["brand", "size", "color"]) {
      const value = safeTrim(ai[k]);
      if (value && /unknown/i.test(value)) {
        console.log(`🔄 [POST-PROCESS] Removing "Unknown" from ${k}:`, ai[k]);
        ai[k] = null;
      }
    }

    // Rebuild clean title
    const hasBrand = safeTrim(ai.brand);
    const hasItemType = safeTrim(ai.item_type);
    const hasColor = safeTrim(ai.color);
    const hasSize = safeTrim(ai.size);
    
    if (hasBrand || hasItemType || hasColor || hasSize) {
      const newTitle = buildTitle({
        brand: nullIfUnknown(ai.brand),
        item_type: hasItemType || 'Item',
        color: nullIfUnknown(ai.color),
        size: nullIfUnknown(ai.size)
      });
      console.log('🏗️ [POST-PROCESS] Rebuilt title:', newTitle);
      ai.title = newTitle;
    }
      
    console.log('📊 [OPENAI-CLIENT] Final AI data:', {
      title: ai.title,
      brand: ai.brand,
      size: ai.size,
      price: ai.suggested_price,
      confidence: ai.confidence,
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
        tagTextsFound: tagTexts.length
      }
    };
  } catch (error) {
    console.error('❌ [OPENAI-CLIENT] Enhanced analysis failed:', error);
    return {
      success: false,
      error: error.message,
      source: 'openai-client'
    };
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
    
    const response = await callFunction('openai-vision-analysis', {
      method: 'POST',
      body: JSON.stringify({
        imageBase64,
        analysisType: 'tags'
      })
    });

    if (response.mock) {
      console.log('🔧 [OPENAI-CLIENT] Using mock tag analysis in development');
      return {
        success: true,
        data: { tags: ['mock', 'tag', 'analysis'] },
        source: 'mock-development'
      };
    }

    if (!response.ok) {
      throw new Error(`Tag analysis failed: ${response.error}`);
    }
    
    console.log('✅ [OPENAI-CLIENT] Tag analysis response received');
    console.log('📊 [OPENAI-CLIENT] Tag analysis result:', response);
    
    return response;
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
    
    const response = await callFunction('openai-vision-analysis', {
      method: 'POST',
      body: JSON.stringify({
        imageBase64: testImageBase64,
        analysisType: 'clothing'
      })
    });

    if (response.mock) {
      return {
        success: true,
        message: 'Mock OpenAI connection test - functions not available in sandbox',
        data: response
      };
    }

    if (!response.ok) {
      throw new Error(`Connection test failed: ${response.error}`);
    }
    
    console.log('✅ [OPENAI-CLIENT] Connection test successful');
    
    return {
      success: true,
      message: 'OpenAI connection via Netlify Function successful',
      data: response
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