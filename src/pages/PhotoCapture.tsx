import React, { useState, useRef } from 'react';
import { Camera, Upload, ArrowLeft, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const PhotoCapture = () => {
  const { user, authUser, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
      
      // Read all files and convert to data URLs for preview
      const imagePromises = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      });
      
      Promise.all(imagePromises).then(imageUrls => {
        setSelectedImages(imageUrls);
      });
    }
  };

  const handleProcessImage = async () => {
    if (selectedImages.length === 0 || selectedFiles.length === 0 || !user || !authUser) return;

    // Debug: Log current user limits
    console.log('🔍 [PHOTO] Current user limits:', {
      listings_used: user.listings_used,
      listings_limit: user.listings_limit,
      subscription_plan: user.subscription_plan,
      user_id: user.id
    });

    // Check if user has reached their limit
    if (user.listings_used >= user.listings_limit && user.subscription_plan === 'free') {
      console.log('❌ [PHOTO] Listing limit reached!', {
        used: user.listings_used,
        limit: user.listings_limit,
        plan: user.subscription_plan
      });
      alert('You\'ve reached your free listing limit. Upgrade to Pro for unlimited listings!');
      return;
    }

    setIsProcessing(true);

    try {

      // Step 1: Upload all images to Supabase Storage first
      console.log('📤 [CLIENT] Starting image uploads to Supabase...');
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

      // Step 2: Analyze the first image using its public URL
      console.log('🔄 [CLIENT] Starting AI analysis using image URL...');
      console.log('📊 [CLIENT] Analysis request details:', {
        url: '/.netlify/functions/analyze-image',
        method: 'POST',
        primaryImageUrl: publicUrls[0],
        totalImages: publicUrls.length,
        timestamp: new Date().toISOString()
      });
      
      const analysisResponse = await fetch('/.netlify/functions/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: publicUrls[0], // Use the first uploaded image URL for analysis
          allImageUrls: publicUrls // Pass all image URLs for reference
        }),
      });
      
      console.log('📥 [CLIENT] Analysis response received:', {
        status: analysisResponse.status,
        statusText: analysisResponse.statusText,
        ok: analysisResponse.ok,
        headers: Object.fromEntries(analysisResponse.headers.entries()),
        url: analysisResponse.url,
        type: analysisResponse.type,
        redirected: analysisResponse.redirected
      });
      
      if (!analysisResponse.ok) {
        console.error('❌ [CLIENT] Analysis response not OK:', {
          status: analysisResponse.status,
          statusText: analysisResponse.statusText
        });
        
        // Try to get response body for more details
        let errorBody = '';
        try {
          errorBody = await analysisResponse.text();
          console.error('❌ [CLIENT] Error response body:', errorBody);
        } catch (bodyError) {
          console.error('❌ [CLIENT] Could not read error response body:', bodyError);
        }
        
        throw new Error(`Analysis failed: ${analysisResponse.status} ${analysisResponse.statusText}. Body: ${errorBody}`);
      }
      
      console.log('🔄 [CLIENT] Parsing analysis JSON response...');
      const analysisResult = await analysisResponse.json();
      console.log('✅ [CLIENT] Analysis JSON parsed successfully:', {
        success: analysisResult.success,
        hasAnalysis: !!analysisResult.analysis,
        analysisKeys: analysisResult.analysis ? Object.keys(analysisResult.analysis) : [],
        responseSize: JSON.stringify(analysisResult).length
      });
      
      if (!analysisResult.success) {
        console.error('❌ [CLIENT] Analysis result indicates failure:', analysisResult);
        throw new Error(analysisResult.error || 'Analysis failed');
      }
      
      const analysis = analysisResult.analysis;
      console.log('🎉 [CLIENT] AI analysis completed successfully:', {
        category: analysis.category,
        confidence: analysis.confidence,
        suggestedTitle: analysis.suggestedTitle,
        suggestedPrice: analysis.suggestedPrice,
        brand: analysis.brand,
        condition: analysis.condition,
        keyFeaturesCount: analysis.keyFeatures?.length || 0
      });
      // Step 3: Create item in database with analysis results
      console.log('💾 [CLIENT] Creating item in database...');
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .insert([
          {
            user_id: authUser.id,
            title: analysis.suggestedTitle,
            description: analysis.suggestedDescription,
            category: analysis.category,
            condition: analysis.condition || 'good',
            brand: analysis.brand,
            size: null, // Will be manually entered by user if needed
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
             key_features: analysis.keyFeatures,
             total_images: publicUrls.length
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

      // Step 4: Create a listing for this item
      console.log('📝 [CLIENT] Creating listing for item...');
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .insert([
          {
            item_id: itemData.id,
            user_id: authUser.id,
            title: itemData.title,
            description: itemData.description || '',
            price: itemData.suggested_price,
           images: publicUrls, // All uploaded images
            platforms: ['ebay'],
            status: 'active',
            listed_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (listingError) {
        console.error('❌ [CLIENT] Error creating listing:', listingError);
        throw listingError;
      }
      console.log('✅ [CLIENT] Listing created successfully:', listingData.id);

      // Step 5: Update user's listing count
      console.log('🔄 [CLIENT] Updating user listing count...');
      await updateUser({ listings_used: user.listings_used + 1 });
      console.log('✅ [CLIENT] User listing count updated');

      // Step 6: Navigate to item details
      console.log('🎯 [CLIENT] Navigating to item details page...');
      navigate(`/details/${itemData.id}`);
    } catch (error) {
      console.error('❌ [CLIENT] Critical error in handleProcessImage:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      alert(`Failed to process image: ${error.message}. Please try again.`);
    } finally {
      console.log('🏁 [CLIENT] Processing complete, setting loading to false');
      setIsProcessing(false);
    }
  };

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
            Take or upload a photo of your item and let our AI do the rest
          </p>
        </div>

        {selectedImages.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="text-center">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 hover:border-blue-400 transition-colors">
                <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Add Your Photos
                </h3>
                <p className="text-gray-600 mb-6">
                 Upload multiple photos of your item from different angles. The first photo will be used for AI analysis.
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
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                Selected Photos ({selectedImages.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {selectedImages.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image}
                      alt={`Selected item ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                      {index === 0 ? 'Primary' : `${index + 1}`}
                    </div>
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
                  Our AI is analyzing your item and uploading {selectedImages.length} photos...
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  This may take a few seconds depending on the number of photos
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tips */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3">📸 Multi-Photo Tips for Best Results</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Use good lighting - natural light works best</li>
            <li>• Take photos from multiple angles (front, back, sides, details)</li>
            <li>• Show the entire item in the first photo (used for AI analysis)</li>
            <li>• Include any brand labels or tags if visible</li>
            <li>• Upload 5-10 photos for best eBay listing results</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default PhotoCapture;