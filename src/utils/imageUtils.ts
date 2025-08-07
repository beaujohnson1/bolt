// Helper function to convert file to base64 (for client-side use)
export const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
  });
};

// Priority 1: Image compression - Resize images to 800px max width
export const resizeImage = (file: File, maxWidth: number = 800): Promise<File> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions
      const { width, height } = img;
      let newWidth = width;
      let newHeight = height;
      
      if (width > maxWidth) {
        newWidth = maxWidth;
        newHeight = (height * maxWidth) / width;
      }
      
      // Set canvas dimensions
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Draw resized image
      ctx?.drawImage(img, 0, 0, newWidth, newHeight);
      
      // Convert to blob and create new file
      canvas.toBlob((blob) => {
        if (blob) {
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now()
          });
          console.log(`📏 [IMAGE-UTILS] Resized ${file.name}: ${width}x${height} → ${newWidth}x${newHeight}`);
          resolve(resizedFile);
        } else {
          reject(new Error('Failed to resize image'));
        }
      }, file.type, 0.9); // 90% quality
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Priority 4: Results caching - Calculate image hash for duplicate detection
export const calculateImageHash = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    console.log(`🔐 [IMAGE-UTILS] Calculated hash for ${file.name}: ${hashHex.substring(0, 16)}...`);
    return hashHex;
  } catch (error) {
    console.error('❌ [IMAGE-UTILS] Error calculating image hash:', error);
    // Fallback to timestamp-based hash
    return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Helper function to fetch image from URL and convert to base64
export const fetchImageAsBase64 = async (imageUrl: string): Promise<string> => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const file = new File([blob], 'image.jpg', { type: blob.type });
    return await convertToBase64(file);
  } catch (error) {
    console.error('Error fetching image as base64:', error);
    throw error;
  }
};

// Add this image preprocessing function
export const enhanceImageForAnalysis = (imageFile: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Set canvas size (optimize for analysis)
      const maxSize = 1200; // Max dimension for the enhanced image
      const ratio = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      // Enhanced settings for text/label visibility
      if (ctx) { // Ensure context is not null
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Apply filters to enhance text visibility
        ctx.filter = 'contrast(115%) brightness(105%) saturate(105%)'; // More subtle enhancement for better visual quality
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      } else {
        reject(new Error('Failed to get 2D context for canvas.'));
        return;
      }
      
      // Convert back to blob
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('✅ [IMAGE-ENHANCE] Image enhanced for analysis');
          resolve(blob);
        } else {
          console.error('❌ [IMAGE-ENHANCE] Failed to create blob from canvas');
          reject(new Error('Failed to create blob from canvas.'));
        }
      }, 'image/jpeg', 0.95); // Convert to JPEG with 95% quality
    };
    
    img.onerror = () => reject(new Error('Failed to load image for enhancement.'));
    img.crossOrigin = 'anonymous'; // Required for some image sources to prevent CORS issues
    img.src = URL.createObjectURL(imageFile);
  });
};

// Helper function to process multiple images with enhancement
export const processImagesWithEnhancement = async (imageFiles: File[]): Promise<File[]> => {
  const enhancedFiles: File[] = [];
  
  for (const file of imageFiles) {
    try {
      const enhancedBlob = await enhanceImageForAnalysis(file);
      // Convert Blob back to File type for consistency
      enhancedFiles.push(new File([enhancedBlob], file.name, { type: enhancedBlob.type, lastModified: Date.now() }));
    } catch (error) {
      console.error(`❌ [IMAGE-ENHANCE] Error enhancing image ${file.name}:`, error);
      enhancedFiles.push(file); // Fallback to original file if enhancement fails
    }
  }
  
  return enhancedFiles;
};

/**
 * Extract tag-specific text from Google Vision textAnnotations
 * Filters for text blocks that likely contain size, brand, or other tag information
 */
export const extractTagText = (textAnnotations: any[]): string[] => {
  try {
    console.log('🏷️ [TAG-EXTRACT] Processing text annotations for tag detection...');
    
    if (!Array.isArray(textAnnotations) || textAnnotations.length === 0) {
      console.log('⚠️ [TAG-EXTRACT] No text annotations provided');
      return [];
    }

    // Filter for text blocks that likely contain tag information
    const tagBlocks = textAnnotations
      .filter(annotation => {
        const text = annotation.description || '';
        const isTagLike = /size|s|m|l|xl|xxl|waist|inseam|rn|brand|made in|care|wash|cotton|polyester|spandex|elastane|model|style/i.test(text);
        return isTagLike && text.length > 1; // Exclude single characters
      })
      .slice(0, 8) // Limit to top 8 tag-like blocks
      .map(annotation => annotation.description);

    console.log('✅ [TAG-EXTRACT] Found tag-like text blocks:', tagBlocks.length);
    console.log('📋 [TAG-EXTRACT] Tag texts:', tagBlocks);
    
    return tagBlocks;
  } catch (error) {
    console.error('❌ [TAG-EXTRACT] Error extracting tag text:', error);
    return [];
  }
};

/**
 * Simulate cropping and re-OCR for tag regions
 * For now, this returns the filtered tag text without actual image cropping
 * TODO: Implement actual image cropping and re-OCR for better accuracy
 */
export const cropAndReocr = async (imageUrl: string, tagBlocks: any[]): Promise<string[]> => {
  try {
    console.log('✂️ [CROP-REOCR] Simulating crop and re-OCR for tag blocks...');
    
    // For now, return the descriptions from the tag blocks
    // In a full implementation, this would:
    // 1. Crop the image based on bounding boxes
    // 2. Re-run OCR on each cropped region
    // 3. Return the enhanced text
    
    const tagTexts = tagBlocks
      .filter(block => block && block.description)
      .map(block => block.description)
      .slice(0, 4); // Limit to 4 as specified
    
    console.log('✅ [CROP-REOCR] Extracted tag texts:', tagTexts);
    return tagTexts;
  } catch (error) {
    console.error('❌ [CROP-REOCR] Error in crop and re-OCR:', error);
    return [];
  }
};