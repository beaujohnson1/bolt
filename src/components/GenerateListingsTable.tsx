import React, { useState, useEffect } from 'react';
import { Package, Eye, Edit, Trash2, ExternalLink, CheckCircle, Clock, AlertCircle, RefreshCw, Zap, Brain, Target } from 'lucide-react';
import { supabase, type Item } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice, formatDate, getCategoryPath, getItemSpecifics, normalizeCondition, normalizeCategory } from '../utils/itemUtils';
import { analyzeClothingItem } from '../services/openaiService.js';

interface GenerateListingsTableProps {
  isDarkMode: boolean;
}

interface SKUGroup {
  sku: string;
  photos: Array<{
    id: string;
    image_url: string;
    filename: string;
    upload_order: number;
  }>;
  photo_count: number;
  status: 'ready_for_generation' | 'processing' | 'completed' | 'error';
  created_at: string;
}

const GenerateListingsTable: React.FC<GenerateListingsTableProps> = ({ isDarkMode }) => {
  const { authUser, user, updateUser } = useAuth();
  const [skuGroups, setSkuGroups] = useState<SKUGroup[]>([]);
  const [selectedSKUs, setSelectedSKUs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [processingStatus, setProcessingStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSKUGroups();
  }, [authUser]);

  const fetchSKUGroups = async () => {
    if (!authUser) return;

    try {
      console.log('🔍 [GENERATE-TABLE] Fetching SKU groups ready for generation...');
      setLoading(true);
      setError(null);

      // Get SKU groups that are ready for listing generation (status: 'assigned')
      const { data: skuPhotos, error: skuError } = await supabase
        .from('uploaded_photos')
        .select('assigned_sku, image_url, filename, upload_order, id')
        .eq('user_id', authUser.id)
        .eq('status', 'assigned')
        .not('assigned_sku', 'is', null)
        .order('upload_order', { ascending: true });

      if (skuError) {
        console.error('❌ [GENERATE-TABLE] Error fetching SKU groups:', skuError);
        throw skuError;
      }

      // Group photos by SKU
      const groupedBySKU = (skuPhotos || []).reduce((groups, photo) => {
        const sku = photo.assigned_sku!;
        if (!groups[sku]) {
          groups[sku] = [];
        }
        groups[sku].push(photo);
        return groups;
      }, {} as Record<string, any[]>);

      // Convert to SKUGroup format
      const skuGroupsArray: SKUGroup[] = Object.entries(groupedBySKU).map(([sku, photos]) => ({
        sku,
        photos: photos.sort((a, b) => a.upload_order - b.upload_order),
        photo_count: photos.length,
        status: 'ready_for_generation',
        created_at: photos[0]?.created_at || new Date().toISOString()
      }));

      console.log('✅ [GENERATE-TABLE] SKU groups fetched successfully:', skuGroupsArray.length);
      setSkuGroups(skuGroupsArray);
    } catch (error) {
      console.error('❌ [GENERATE-TABLE] Error in fetchSKUGroups:', error);
      setError('Failed to load SKU groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to generate description
  const generateDescription = (item: any): string => {
    const parts = [];
    
    if (item.brand && item.brand !== 'Unknown') parts.push(`Brand: ${item.brand}`);
    if (item.size && item.size !== 'Unknown') parts.push(`Size: ${item.size}`);
    if (item.condition) parts.push(`Condition: ${item.condition.replace('_', ' ')}`);
    if (item.color && item.color !== 'Various') parts.push(`Color: ${item.color}`);
    if (item.material) parts.push(`Material: ${item.material}`);
    
    const baseDescription = parts.length > 0 
      ? parts.join(' | ') 
      : 'Quality item in good condition.';
    
    // Add key features if available
    let description = baseDescription;
    if (item.keyFeatures && item.keyFeatures.length > 0) {
      description += `\n\nKey Features:\n${item.keyFeatures.map((feature: string) => `• ${feature}`).join('\n')}`;
    }
    
    description += '\n\nShipped quickly and carefully packaged. Fast and friendly customer service!';
    
    return description;
  };

  // Process a single SKU group and generate listing
  const processSKUGroupAndGenerateListing = async (skuGroup: SKUGroup) => {
    console.log('🚀 [GENERATE] Processing SKU group:', skuGroup.sku);
    
    try {
      // Step 1: Get the primary image for AI analysis
      const primaryPhoto = skuGroup.photos[0];
      if (!primaryPhoto) {
        throw new Error('No photos found for SKU group');
      }

      console.log('🤖 [GENERATE] Running AI analysis on primary image:', primaryPhoto.image_url);
      
      // Step 2: Run AI analysis on the primary image
      const aiResult = await analyzeClothingItem(primaryPhoto.image_url);
      
      if (!aiResult.success || !aiResult.analysis) {
        throw new Error('AI analysis failed: ' + (aiResult.error || 'Unknown error'));
      }

      const analysis = aiResult.analysis;
      console.log('✅ [GENERATE] AI analysis complete:', analysis);

      // Step 3: Prepare item data with normalized values
      const itemData = {
        user_id: authUser.id,
        title: analysis.suggestedTitle || `${analysis.brand !== 'Unknown' ? analysis.brand + ' ' : ''}${analysis.category}`,
        description: generateDescription(analysis),
        category: normalizeCategory(analysis.category),
        condition: normalizeCondition(analysis.condition),
        brand: analysis.brand !== 'Unknown' ? analysis.brand : null,
        size: analysis.size !== 'Unknown' ? analysis.size : null,
        color: analysis.color !== 'Various' ? analysis.color : null,
        model_number: analysis.modelNumber || null,
        suggested_price: analysis.suggestedPrice || 25,
        price_range_min: analysis.priceRange?.min || Math.round((analysis.suggestedPrice || 25) * 0.8),
        price_range_max: analysis.priceRange?.max || Math.round((analysis.suggestedPrice || 25) * 1.2),
        images: skuGroup.photos.map(photo => photo.image_url),
        primary_image_url: primaryPhoto.image_url,
        ai_confidence: analysis.confidence || 0.7,
        ai_analysis: analysis,
        ai_key_features: analysis.keyFeatures || [],
        sku: skuGroup.sku,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('📝 [GENERATE] Item data prepared:', itemData);

      // Step 4: Insert the item using CORRECT Supabase syntax
      const { data: itemResult, error: itemError } = await supabase
        .from('items')
        .insert([itemData])
        .select('id, title, suggested_price, category, brand, sku')
        .single();

      if (itemError) {
        console.error('❌ [GENERATE] Item creation failed:', itemError);
        throw new Error(`Failed to create item: ${itemError.message}`);
      }

      console.log('✅ [GENERATE] Item created successfully:', itemResult);

      // Step 5: Update uploaded_photos to link them to the new item
      const { error: updatePhotosError } = await supabase
        .from('uploaded_photos')
        .update({
          assigned_item_id: itemResult.id,
          status: 'processed',
          updated_at: new Date().toISOString()
        })
        .eq('assigned_sku', skuGroup.sku)
        .eq('user_id', authUser.id);

      if (updatePhotosError) {
        console.error('❌ [GENERATE] Error updating photos:', updatePhotosError);
        // Don't throw here - item was created successfully
      }

      // Step 6: Create listing using CORRECT Supabase syntax
      const listingData = {
        item_id: itemResult.id,
        user_id: authUser.id,
        title: itemResult.title,
        description: itemData.description,
        price: itemResult.suggested_price,
        images: itemData.images,
        platforms: ['ebay'],
        status: 'draft',
        created_at: new Date().toISOString()
      };

      console.log('📝 [GENERATE] Listing data prepared:', listingData);

      const { data: listingResult, error: listingError } = await supabase
        .from('listings')
        .insert([listingData])
        .select('id, title, status, created_at')
        .single();

      if (listingError) {
        console.error('❌ [GENERATE] Listing creation failed:', listingError);
        throw new Error(`Failed to create listing: ${listingError.message}`);
      }

      console.log('✅ [GENERATE] Listing created successfully:', listingResult);

      return {
        item: itemResult,
        listing: listingResult,
        sku: skuGroup.sku
      };

    } catch (error) {
      console.error('❌ [GENERATE] Error processing SKU group:', skuGroup.sku, error);
      throw error;
    }
  };

  const handleSelectSKU = (sku: string) => {
    const newSelected = new Set(selectedSKUs);
    if (newSelected.has(sku)) {
      newSelected.delete(sku);
    } else {
      newSelected.add(sku);
    }
    setSelectedSKUs(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSKUs.size === skuGroups.length) {
      setSelectedSKUs(new Set());
    } else {
      setSelectedSKUs(new Set(skuGroups.map(group => group.sku)));
    }
  };

  const handleDeleteSKUGroup = async (sku: string) => {
    if (!window.confirm(`Delete SKU group ${sku} and all its photos? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      console.log('🗑️ [GENERATE-TABLE] Deleting SKU group:', sku);

      // Delete all photos in this SKU group
      const { error: deleteError } = await supabase
        .from('uploaded_photos')
        .delete()
        .eq('assigned_sku', sku)
        .eq('user_id', authUser!.id);

      if (deleteError) {
        console.error('❌ [GENERATE-TABLE] Error deleting SKU group:', deleteError);
        throw deleteError;
      }

      console.log('✅ [GENERATE-TABLE] SKU group deleted successfully');
      setSuccessMessage(`SKU group ${sku} deleted successfully`);
      
      // Refresh the table
      await fetchSKUGroups();
    } catch (error) {
      console.error('❌ [GENERATE-TABLE] Error deleting SKU group:', error);
      setErrorMessage(`Failed to delete SKU group: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateListings = async () => {
    if (selectedSKUs.size === 0) {
      setErrorMessage('Please select SKU groups to generate listings for.');
      return;
    }

    setIsGenerating(true);
    setSuccessMessage('');
    setErrorMessage('');
    setProcessingStatus({});

    try {
      console.log('🚀 [GENERATE-TABLE] Starting listing generation for SKUs:', Array.from(selectedSKUs));
      
      const selectedSKUGroups = skuGroups.filter(group => selectedSKUs.has(group.sku));
      const results = [];
      const errors = [];

      // Process each SKU group one by one
      for (let i = 0; i < selectedSKUGroups.length; i++) {
        const skuGroup = selectedSKUGroups[i];
        
        try {
          console.log(`🔄 [GENERATE-TABLE] Processing SKU ${i + 1}/${selectedSKUGroups.length}: ${skuGroup.sku}`);
          setProcessingStatus(prev => ({
            ...prev,
            [skuGroup.sku]: `Processing ${i + 1}/${selectedSKUGroups.length}...`
          }));

          const result = await processSKUGroupAndGenerateListing(skuGroup);
          results.push(result);
          
          setProcessingStatus(prev => ({
            ...prev,
            [skuGroup.sku]: 'Completed ✅'
          }));
          
          console.log(`✅ [GENERATE-TABLE] SKU ${i + 1}/${selectedSKUGroups.length} processed successfully`);
          
        } catch (error) {
          console.error(`❌ [GENERATE-TABLE] Error processing SKU ${i + 1}:`, error);
          errors.push({ sku: skuGroup.sku, error: error.message });
          
          setProcessingStatus(prev => ({
            ...prev,
            [skuGroup.sku]: `Error: ${error.message}`
          }));
        }
      }

      console.log('🎉 [GENERATE-TABLE] Batch generation complete:', {
        successful: results.length,
        failed: errors.length,
        results,
        errors
      });

      // Update user's listing count
      if (user && results.length > 0) {
        await updateUser({ 
          listings_used: (user.listings_used || 0) + results.length 
        });
      }

      // Show results
      if (results.length > 0) {
        setSuccessMessage(`Successfully generated ${results.length} listing${results.length !== 1 ? 's' : ''} from ${results.length} item${results.length !== 1 ? 's' : ''}!`);
      }

      if (errors.length > 0) {
        setErrorMessage(`Failed to generate ${errors.length} listing${errors.length !== 1 ? 's' : ''}. Check console for details.`);
        console.error('Generation errors:', errors);
      }

      // Clear selection and refresh
      setSelectedSKUs(new Set());
      setTimeout(() => {
        fetchSKUGroups();
      }, 2000);

    } catch (error) {
      console.error('❌ [GENERATE-TABLE] Error in batch generation:', error);
      setErrorMessage(`Failed to generate listings: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setProcessingStatus({});
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <span className={`ml-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Loading SKU groups ready for generation...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Error Loading SKU Groups
        </h3>
        <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
        <button
          onClick={fetchSKUGroups}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'glass-panel' : 'glass-panel-light'} backdrop-blur-glass rounded-2xl p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Generate Listings with AI
          </h2>
          <p className={`${isDarkMode ? 'text-white/70' : 'text-gray-600'} mt-1`}>
            AI will analyze your SKU groups and create optimized listings ({skuGroups.length} groups ready)
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchSKUGroups}
            disabled={loading || isGenerating}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              isDarkMode 
                ? 'bg-white/10 hover:bg-white/20 text-white disabled:bg-white/5' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:bg-gray-50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading || isGenerating ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center justify-between">
          <span>{successMessage}</span>
          <button 
            onClick={() => setSuccessMessage('')}
            className="text-green-700 hover:text-green-900 font-bold text-lg"
          >
            ×
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center justify-between">
          <span>{errorMessage}</span>
          <button 
            onClick={() => setErrorMessage('')}
            className="text-red-700 hover:text-red-900 font-bold text-lg"
          >
            ×
          </button>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleSelectAll}
            disabled={isGenerating}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:bg-gray-800 disabled:text-gray-500'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 disabled:bg-gray-100 disabled:text-gray-400'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedSKUs.size === skuGroups.length && skuGroups.length > 0}
              onChange={handleSelectAll}
              disabled={isGenerating}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
            />
            <span>{selectedSKUs.size === skuGroups.length ? 'Deselect All' : 'Select All'}</span>
          </button>
          
          {selectedSKUs.size > 0 && (
            <span className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
              {selectedSKUs.size} SKU group{selectedSKUs.size !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>

        {selectedSKUs.size > 0 && (
          <button
            onClick={handleGenerateListings}
            disabled={isGenerating || isDeleting}
            className="px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 shadow-lg"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                <span>Generate {selectedSKUs.size} Listing{selectedSKUs.size > 1 ? 's' : ''} with AI</span>
              </>
            )}
          </button>
        )}
      </div>

      {skuGroups.length === 0 ? (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            No SKU Groups Ready
          </h3>
          <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Go to the SKUs tab to assign SKUs to your uploaded photos first.
          </p>
          <button
            onClick={fetchSKUGroups}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      ) : (
        <>
          {/* SKU Groups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skuGroups.map((skuGroup) => {
              const isSelected = selectedSKUs.has(skuGroup.sku);
              const isProcessing = processingStatus[skuGroup.sku];
              
              return (
                <div
                  key={skuGroup.sku}
                  onClick={() => !isGenerating && handleSelectSKU(skuGroup.sku)}
                  className={`relative cursor-pointer rounded-xl border-2 transition-all duration-200 p-4 ${
                    isSelected 
                      ? 'border-blue-500 ring-2 ring-blue-200 scale-105' 
                      : isDarkMode
                      ? 'border-gray-600 hover:border-blue-400 bg-gray-800/50'
                      : 'border-gray-200 hover:border-blue-300 bg-white'
                  } ${isGenerating ? 'pointer-events-none' : ''}`}
                >
                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1 z-10">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}

                  {/* SKU Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
                    }`}>
                      SKU: {skuGroup.sku}
                    </div>
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {skuGroup.photo_count} photo{skuGroup.photo_count > 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Primary Photo */}
                  <div className="mb-3">
                    <img
                      src={skuGroup.photos[0]?.image_url}
                      alt={`SKU ${skuGroup.sku} primary`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                  </div>

                  {/* Photo Grid Preview */}
                  <div className="grid grid-cols-4 gap-1 mb-3">
                    {skuGroup.photos.slice(0, 4).map((photo, index) => (
                      <img
                        key={photo.id}
                        src={photo.image_url}
                        alt={`${skuGroup.sku} photo ${index + 1}`}
                        className="w-full h-12 object-cover rounded border"
                      />
                    ))}
                    {skuGroup.photos.length > 4 && (
                      <div className={`w-full h-12 rounded border flex items-center justify-center text-xs font-medium ${
                        isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}>
                        +{skuGroup.photos.length - 4}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      skuGroup.status === 'ready_for_generation'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    }`}>
                      {isProcessing ? 'Processing...' : 'Ready for AI'}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSKUGroup(skuGroup.sku);
                      }}
                      disabled={isGenerating || isDeleting}
                      className={`p-1 rounded transition-colors ${
                        isDarkMode 
                          ? 'hover:bg-red-500/20 text-red-400 hover:text-red-300' 
                          : 'hover:bg-red-50 text-red-600 hover:text-red-700'
                      }`}
                      title="Delete SKU group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Processing Status */}
                  {isProcessing && (
                    <div className="mt-2 text-xs text-center">
                      <div className={`${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                        {processingStatus[skuGroup.sku]}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Stats */}
          <div className={`mt-6 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-center`}>
            Showing {skuGroups.length} SKU group{skuGroups.length !== 1 ? 's' : ''} ready for AI analysis
            {selectedSKUs.size > 0 && (
              <span className={`ml-4 font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                • {selectedSKUs.size} selected
              </span>
            )}
          </div>
        </>
      )}

      {/* How It Works */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
          <Brain className="w-5 h-5" />
          <span>How AI Listing Generation Works</span>
        </h3>
        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
          <li>• AI analyzes the primary photo from each SKU group</li>
          <li>• Detects brand, category, condition, size, and key features</li>
          <li>• Creates optimized title and description for eBay</li>
          <li>• Suggests competitive pricing based on market data</li>
          <li>• Groups all photos under one item with proper SKU</li>
          <li>• Creates draft listing ready for publishing</li>
        </ul>
      </div>
    </div>
  );
};

export default GenerateListingsTable;