// Client-side OpenAI service that calls Netlify Functions
import { convertToBase64, fetchImageAsBase64 } from '../utils/imageUtils';

// Primary clothing analysis function - now accepts URL or base64
export const analyzeClothingItem = async (imageInput) => {
  try {
    console.log('🤖 [OPENAI-CLIENT] Starting enhanced GPT-4 Vision analysis via Netlify Function...', {
      inputType: imageInput.startsWith('data:') ? 'base64' : 'url',
      inputLength: imageInput.length
    });
    
    // Determine if input is URL or base64
    let imageBase64;
    if (imageInput.startsWith('http')) {
      // It's a URL, convert to base64
      console.log('🔄 [OPENAI-CLIENT] Converting URL to base64...');
      imageBase64 = await fetchImageAsBase64(imageInput);
    } else if (imageInput.startsWith('data:')) {
      // It's already base64, extract the data part
      imageBase64 = imageInput.split(',')[1];
    } else {
      // Assume it's raw base64
      imageBase64 = imageInput;
    }
    
    const response = await fetch('/.netlify/functions/openai-vision-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        analysisType: 'enhanced_listing',
        imageUrl: imageInput.startsWith('http') ? imageInput : undefined
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI analysis failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ [OPENAI-CLIENT] Enhanced GPT-4 Vision response received');
    console.log('📊 [OPENAI-CLIENT] Enhanced result:', result);
    
    // Debug the AI response structure
    console.log('🔍 [DEBUG] =====================================');
    console.log('🔍 [DEBUG] FULL AI ANALYSIS RESPONSE:');
    console.log('🔍 [DEBUG] =====================================');
    console.log('🔍 [DEBUG] Raw response:', JSON.stringify(result.analysis, null, 2));
    console.log('🔍 [DEBUG] Response type:', typeof result.analysis);
    console.log('🔍 [DEBUG] Available keys:', Object.keys(result.analysis || {}));
    
    // Check every possible field name for title
    console.log('🔍 [DEBUG] TITLE FIELD VARIATIONS:');
    const titleFields = ['title', 'suggested_title', 'name', 'itemName', 'item_name', 'product_name', 'listing_title'];
    titleFields.forEach(field => {
      if (result.analysis[field] !== undefined) {
        console.log(`🔍 [DEBUG] ✅ FOUND TITLE: ${field} = "${result.analysis[field]}"`);
      } else {
        console.log(`🔍 [DEBUG] ❌ Missing: ${field}`);
      }
    });
    
    // Check every possible field name for price
    console.log('🔍 [DEBUG] PRICE FIELD VARIATIONS:');
    const priceFields = ['price', 'suggested_price', 'estimated_price', 'estimatedPrice', 'suggestedPrice', 'market_price', 'listing_price'];
    priceFields.forEach(field => {
      if (result.analysis[field] !== undefined) {
        console.log(`🔍 [DEBUG] ✅ FOUND PRICE: ${field} = "${result.analysis[field]}"`);
      } else {
        console.log(`🔍 [DEBUG] ❌ Missing: ${field}`);
      }
    });
    
    // Check other important fields
    console.log('🔍 [DEBUG] OTHER IMPORTANT FIELDS:');
    ['brand', 'size', 'condition', 'category', 'item_type', 'color', 'material'].forEach(field => {
      if (result.analysis[field] !== undefined) {
        console.log(`🔍 [DEBUG] ✅ ${field.toUpperCase()}: "${result.analysis[field]}"`);
      }
    });
    
    console.log('🔍 [DEBUG] =====================================');
    
    // Ensure the response has the expected structure
    return {
      success: true,
      analysis: result.analysis || result,
      source: 'openai-vision-enhanced'
    };
  } catch (error) {
    console.error('❌ [OPENAI-CLIENT] Vision API Error:', error);
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