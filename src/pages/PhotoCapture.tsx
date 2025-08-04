import React, { useState, useRef } from 'react';
import { Camera, Upload, ArrowLeft, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const PhotoCapture = () => {
  const { user, authUser, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessImage = async () => {
    if (!selectedImage || !selectedFile || !user || !authUser) return;

    // Check if user has reached their limit
    if (user.listings_used >= user.listings_limit && user.subscription_plan === 'free') {
      alert('You\'ve reached your free listing limit. Upgrade to Pro for unlimited listings!');
      return;
    }

    setIsProcessing(true);

    try {
      // Convert image to base64 for API
      const reader = new FileReader();
      const imageDataPromise = new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target?.result);
        reader.readAsDataURL(selectedFile);
      });
      
      const imageData = await imageDataPromise;
      
      console.log('Sending image to AI analysis...');
      
      // Call our Netlify function for AI analysis
      const analysisResponse = await fetch('/.netlify/functions/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageData
        }),
      });
      
      if (!analysisResponse.ok) {
        throw new Error(`Analysis failed: ${analysisResponse.status}`);
      }
      
      const analysisResult = await analysisResponse.json();
      
      if (!analysisResult.success) {
        throw new Error(analysisResult.error || 'Analysis failed');
      }
      
      const analysis = analysisResult.analysis;
      console.log('AI analysis completed:', analysis);

      // Upload image to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${authUser.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('item-images')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL for the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('item-images')
        .getPublicUrl(fileName);

      // Create item in database
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
            suggested_price: analysis.suggestedPrice,
            price_range_min: analysis.priceRange.min,
            price_range_max: analysis.priceRange.max,
            images: [publicUrl],
            primary_image_url: publicUrl,
            ai_confidence: analysis.confidence,
            ai_analysis: {
              detected_category: analysis.category,
              detected_brand: analysis.brand,
              detected_condition: analysis.condition,
              key_features: analysis.keyFeatures,
              labels: analysis.labels,
              web_entities: analysis.webEntities,
              text_annotations: analysis.textAnnotations
            },
            status: 'draft'
          }
        ])
        .select()
        .single();

      if (itemError) throw itemError;

      // Create a listing for this item
      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .insert([
          {
            item_id: itemData.id,
            user_id: authUser.id,
            title: itemData.title,
            description: itemData.description || '',
            price: itemData.suggested_price,
            images: [publicUrl],
            platforms: ['ebay'],
            status: 'active',
            listed_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (listingError) throw listingError;

      // Update user's listing count
      await updateUser({ listings_used: user.listings_used + 1 });

      // Navigate to item details
      navigate(`/details/${itemData.id}`);
    } catch (error) {
      console.error('Error processing image:', error);
      alert(`Failed to process image: ${error.message}. Please try again.`);
    } finally {
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

        {!selectedImage ? (
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="text-center">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 hover:border-blue-400 transition-colors">
                <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Add Your Photo
                </h3>
                <p className="text-gray-600 mb-6">
                  Take a clear photo of your item or upload from your device
                </p>
                
                <div className="space-y-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Photo</span>
                  </button>
                  
                  <div className="text-sm text-gray-500">
                    Supports JPG, PNG up to 10MB
                  </div>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="text-center mb-6">
              <img
                src={selectedImage}
                alt="Selected item"
                className="max-w-full h-64 object-contain mx-auto rounded-lg"
              />
            </div>

            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setSelectedImage(null)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Choose Different Photo
              </button>
              
              <button
                onClick={handleProcessImage}
                disabled={isProcessing}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Analyze Item</span>
                  </>
                )}
              </button>
            </div>

            {isProcessing && (
              <div className="mt-6 text-center">
                <div className="text-sm text-gray-600">
                  Our AI is analyzing your item...
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  This usually takes 2-3 seconds
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tips */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 mb-3">📸 Photo Tips for Best Results</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Use good lighting - natural light works best</li>
            <li>• Show the entire item in the frame</li>
            <li>• Include any brand labels or tags if visible</li>
            <li>• Take photos from multiple angles if needed</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default PhotoCapture;