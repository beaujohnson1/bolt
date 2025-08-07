import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, ArrowLeft, Zap, X, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { KeywordOptimizationService } from '../services/KeywordOptimizationService';
import { resizeImage, calculateImageHash, processImagesWithEnhancement } from '../utils/imageUtils';

// Normalize condition values from AI to match database enum
const normalizeCondition = (condition: string): string => {
  if (!condition) return 'good';
  
  const normalized = condition.toLowerCase().trim();
  const conditionMap = {
    'new': 'like_new',
    'like new': 'like_new',
    'excellent': 'like_new',
    'very good': 'good',
    'good': 'good',
    'fair': 'fair',
    'poor': 'poor',
    'damaged': 'poor'
  };
  
  return conditionMap[normalized] || 'good';
};

// Normalize category values from AI to match database enum
const normalizeCategory = (category: string): string => {
  if (!category) return 'clothing';
  
  const normalized = category.toLowerCase().trim();
  
  // Map AI responses to database enum values
  const categoryMap = {
    'clothing': 'clothing',
    'leather jacket': 'clothing',
    'jacket': 'clothing',
    'coat': 'clothing',
    'shirt': 'clothing',
    'blouse': 'clothing',
    'dress': 'clothing',
    'pants': 'clothing',
    'jeans': 'clothing',
    'sweater': 'clothing',
    'hoodie': 'clothing',
    'top': 'clothing',
    'bottom': 'clothing',
    'shoes': 'shoes',
    'sneakers': 'shoes',
    'boots': 'shoes',
    'sandals': 'shoes',
    'heels': 'shoes',
    'accessories': 'accessories',
    'jewelry': 'jewelry',
    'watch': 'jewelry',
    'necklace': 'jewelry',
    'bracelet': 'jewelry',
    'electronics': 'electronics',
    'phone': 'electronics',
    'laptop': 'electronics',
    'tablet': 'electronics',
    'camera': 'electronics',
    'home & garden': 'home_garden',
    'home garden': 'home_garden',
    'furniture': 'home_garden',
    'decor': 'home_garden',
    'toys': 'toys_games',
    'games': 'toys_games',
    'toy': 'toys_games',
    'game': 'toys_games',
    'sports': 'sports_outdoors',
    'outdoor': 'sports_outdoors',
    'fitness': 'sports_outdoors',
    'books': 'books_media',
    'book': 'books_media',
    'media': 'books_media',
    'dvd': 'books_media',
    'cd': 'books_media',
    'collectibles': 'collectibles',
    'collectible': 'collectibles',
    'vintage': 'collectibles',
    'antique': 'collectibles'
  };
  
  return categoryMap[normalized] || 'other';
};

interface PhotoCaptureProps {
  onUploadComplete?: () => void;
  embedded?: boolean;
}

const PhotoCapture: React.FC<PhotoCaptureProps> = ({ onUploadComplete, embedded = false }) => {
  const { user, authUser, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      processDroppedFiles(files);
    }
  }, []);

  const processDroppedFiles = async (files: File[]) => {
    console.log('📁 [PHOTO] Processing dropped files:', files.length);
    setProcessingStatus('Optimizing images...');
    
    try {
      // Resize all images to 800px max width
      const resizePromises = files.map(file => resizeImage(file, 800));
      const resizedFiles = await Promise.all(resizePromises);
      
      // Enhance images for AI analysis
      setProcessingStatus('Enhancing images for AI...');
      const enhancedFiles = await processImagesWithEnhancement(resizedFiles);
      
      console.log('✅ [PHOTO] All images processed successfully');
      setSelectedFiles(enhancedFiles);
      
      // Create preview URLs
      const imagePromises = enhancedFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      });
      
      const imageUrls = await Promise.all(imagePromises);
      setSelectedImages(imageUrls);
      setProcessingStatus('');
    } catch (error) {
      console.error('❌ [PHOTO] Error processing dropped files:', error);
      setProcessingStatus('');
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      processDroppedFiles(files);
    }
  };

  const handleProcessImage = async () => {
    if (selectedImages.length === 0 || selectedFiles.length === 0 || !user || !authUser) return;

    // Check if user has reached their limit
    if (user.listings_used >= user.listings_limit && user.subscription_plan === 'free') {
      console.log('❌ [PHOTO] Listing limit reached!');
      alert('You\'ve reached your free listing limit. Upgrade to Pro for unlimited listings!');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Starting image processing...');

    try {
      // Calculate image hash for caching
      console.log('🔐 [PHOTO] Calculating image hash for caching...');
      setProcessingStatus('Checking for cached results...');
      const primaryImageHash = await calculateImageHash(selectedFiles[0]);

      // Upload all images to Supabase Storage
      console.log('📤 [CLIENT] Starting image uploads to Supabase...');
      setProcessingStatus(`Uploading ${selectedFiles.length} optimized images...`);
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${authUser.id}/${Date.now()}_${index}.${fileExt}`;
        
        console.log(`📤 [CLIENT] Uploading image ${index + 1}/${selectedFiles.length}: ${fileName}`);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(fileName, file);

        if (uploadError) {
          console.error(`❌ [CLIENT] Upload error for image ${index + 1}:`, uploadError);
          throw uploadError;
        }

        // Get public URL for the uploaded image
        const { data: { publicUrl } } = supabase.storage
          .from('item-images')
          .getPublicUrl(fileName);
          
        console.log(`✅ [CLIENT] Image ${index + 1} uploaded successfully: ${publicUrl}`);
        return publicUrl;
      });
      
      const publicUrls = await Promise.all(uploadPromises);
      console.log('✅ [CLIENT] All images uploaded successfully:', publicUrls);

      // Analyze the first image using its public URL
      console.log('🔄 [CLIENT] Starting AI analysis using image URL...');
      setProcessingStatus('Analyzing item with AI...');
      
      const analysisResponse = await fetch('/.netlify/functions/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: publicUrls[0],
          allImageUrls: publicUrls,
          imageHash: primaryImageHash
        })
      });
      
      if (!analysisResponse.ok) {
        const errorBody = await analysisResponse.text();
        throw new Error(`Analysis failed: ${analysisResponse.status} ${analysisResponse.statusText}. Body: ${errorBody}`);
      }
      
      const analysisResult = await analysisResponse.json();
      
      if (!analysisResult.success) {
        throw new Error(analysisResult.error || 'Analysis failed');
      }
      
      const analysis = analysisResult.analysis;
      
      // Ensure priceRange exists
      if (!analysis.priceRange || typeof analysis.priceRange !== 'object') {
        const basePrice = analysis.suggestedPrice || 25;
        analysis.priceRange = {
          min: Math.round(basePrice * 0.8),
          max: Math.round(basePrice * 1.3)
        };
      }
      
      // Ensure keyFeatures exists
      if (!analysis.keyFeatures || !Array.isArray(analysis.keyFeatures)) {
        analysis.keyFeatures = [];
      }
      
      // Enhance title with model number if available
      let finalTitle = analysis.suggestedTitle;
      if (analysis.data?.model_number && analysis.brand) {
        const modelImportantCategories = ['shoes', 'electronics', 'accessories'];
        if (modelImportantCategories.includes(analysis.category)) {
          const brandName = analysis.brand;
          if (finalTitle.includes(brandName) && !finalTitle.includes(analysis.data.model_number)) {
            finalTitle = finalTitle.replace(
              brandName, 
              `${brandName} ${analysis.data.model_number}`
            );
          } else if (!finalTitle.includes(analysis.data.model_number)) {
            finalTitle = `${brandName} ${analysis.data.model_number} ${finalTitle.replace(brandName, '').trim()}`.trim();
          }
        }
      }
      
      // Create item in database
      console.log('💾 [CLIENT] Creating item in database...');
      setProcessingStatus('Saving item details...');
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .insert([
          {
            user_id: authUser.id,
            title: finalTitle,
            description: analysis.suggestedDescription,
            category: normalizeCategory(analysis.category),
            condition: normalizeCondition(analysis.condition),
            brand: analysis.brand,
            model_number: analysis.data?.model_number,
            size: analysis.size,
            color: analysis.color,
            suggested_price: analysis.suggestedPrice,
            price_range_min: analysis.priceRange.min,
            price_range_max: analysis.priceRange.max,
            images: publicUrls,
            primary_image_url: publicUrls[0],
            ai_confidence: analysis.confidence,
            ai_analysis: {
              detected_category: analysis.category,
              detected_brand: analysis.brand,
              detected_condition: analysis.condition,
              key_features: analysis.keyFeatures || [],
              total_images: publicUrls.length,
              model_number: analysis.data?.model_number
            },
            status: 'draft'
          }
        ])
        .select()
        .single();

      if (itemError) {
        console.error('❌ [CLIENT] Error creating item:', itemError);
        throw itemError;
      }
      console.log('✅ [CLIENT] Item created successfully:', itemData.id);

      // Generate keyword suggestions
      console.log('🔍 [CLIENT] Generating keyword suggestions...');
      setProcessingStatus('Generating SEO keywords...');
      try {
        const keywordService = new KeywordOptimizationService(supabase);
        
        const keywordSuggestions = await keywordService.getKeywordSuggestions(
          publicUrls[0],
          analysis.brand || 'Unknown',
          analysis.category || 'other',
          itemData.id,
          analysis.suggestedTitle,
          undefined,
          analysis.confidence
        );
        
        console.log('✅ [CLIENT] Keyword suggestions generated:', keywordSuggestions);
        
        // Update the item with AI suggested keywords
        const { error: updateError } = await supabase
          .from('items')
          .update({ 
            ai_suggested_keywords: keywordSuggestions.keywords 
          })
          .eq('id', itemData.id);
          
        if (updateError) {
          console.error('❌ [CLIENT] Error updating item with keywords:', updateError);
        } else {
          console.log('✅ [CLIENT] Item updated with keyword suggestions');
        }
      } catch (keywordError) {
        console.error('❌ [CLIENT] Error generating keyword suggestions:', keywordError);
      }

      // Update user's listing count
      console.log('🔄 [CLIENT] Updating user listing count...');
      setProcessingStatus('Finalizing...');
      await updateUser({ listings_used: user.listings_used + 1 });
      console.log('✅ [CLIENT] User listing count updated');

      setProcessingStatus('Complete!');
      setUploadComplete(true);

      // Call the completion callback if provided (for embedded mode)
      if (onUploadComplete) {
        console.log('🎯 [CLIENT] Calling upload completion callback...');
        setTimeout(() => {
          onUploadComplete();
        }, 1500); // Small delay to show success state
      } else {
        // Navigate to item details if not embedded
        console.log('🎯 [CLIENT] Navigating to item details page...');
        setTimeout(() => {
          navigate(`/details/${itemData.id}`);
        }, 1500);
      }
    } catch (error) {
      console.error('❌ [CLIENT] Critical error in handleProcessImage:', error);
      alert(`Failed to process image: ${error.message}. Please try again.`);
    } finally {
      setIsProcessing(false);
      if (!uploadComplete) {
        setProcessingStatus('');
      }
    }
  };

  const removeImage = (index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedImages(newImages);
    setSelectedFiles(newFiles);
  };

  if (uploadComplete) {
    return (
      <div className={`${embedded ? '' : 'min-h-screen bg-gray-50 flex items-center justify-center'}`}>
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Upload Complete!
            </h2>
            <p className="text-gray-600 mb-6">
              Your item has been processed and is ready for SKU assignment.
            </p>
            
            {embedded ? (
              <div className="text-sm text-gray-500">
                Redirecting to SKU management...
              </div>
            ) : (
              <div className="space-y-3">
                <Link
                  to="/app"
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
                >
                  Go to Dashboard
                </Link>
                <button
                  onClick={() => {
                    setUploadComplete(false);
                    setSelectedImages([]);
                    setSelectedFiles([]);
                  }}
                  className="block w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Upload Another Item
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const uploadArea = (
    <div className="bg-white rounded-xl shadow-sm border p-8">
      {selectedImages.length === 0 ? (
        <div className="text-center">
          <div 
            className={`border-2 border-dashed rounded-xl p-12 transition-all duration-300 ${
              isDragOver 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-blue-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {isDragOver ? 'Drop your photos here!' : 'Add Your Photos'}
            </h3>
            <p className="text-gray-600 mb-6">
              Drag and drop photos here, or click to upload multiple photos of your item from different angles.
            </p>
            
            <div className="space-y-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Photos</span>
              </button>
              
              <div className="text-sm text-gray-500">
                Supports JPG, PNG up to 10MB each. Upload 2-8 photos for best results.
              </div>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />
      ) : (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Selected Photos ({selectedImages.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {selectedImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Selected item ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                    {index === 0 ? 'Primary' : `${index + 1}`}
                  </div>
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={() => {
                setSelectedImages([]);
                setSelectedFiles([]);
              }}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Choose Different Photos
            </button>
            
            <button
              onClick={handleProcessImage}
              disabled={isProcessing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing {selectedImages.length} photos...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Analyze Item ({selectedImages.length} photos)</span>
                </>
              )}
            </button>
          </div>

          {isProcessing && (
            <div className="mt-6 text-center">
              <div className="text-sm text-gray-600">
                {processingStatus || `Our AI is analyzing your item and uploading ${selectedImages.length} photos...`}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {processingStatus ? 'Please wait...' : 'This may take a few seconds depending on the number of photos'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // If embedded, just return the upload area
  if (embedded) {
    return uploadArea;
  }

  // Full page layout
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link
              to="/app"
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Create New Listing
          </h1>
          <p className="text-gray-600">
            Drag and drop or upload photos of your item and let our AI do the rest
          </p>
        </div>

        {uploadArea}

        {/* Tips */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3">📸 Multi-Photo Tips for Best Results</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Use good lighting - natural light works best</li>
            <li>• Take photos from multiple angles (front, back, sides, details)</li>
            <li>• Show the entire item in the first photo (used for AI analysis)</li>
            <li>• Include any brand labels or tags if visible</li>
            <li>• Images are automatically optimized for faster processing</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default PhotoCapture;