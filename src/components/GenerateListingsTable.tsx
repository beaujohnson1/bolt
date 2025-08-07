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
  title?: string;
  price?: number;
  category_path?: string;
  item_specifics?: string;
  condition?: string;
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
        sku: skuGroup.sku,
        analysis
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
          
          // Update the SKU group with generated data
          setSkuGroups(prev => prev.map(group => 
            group.sku === skuGroup.sku 
              ? {
                  ...group,
                  status: 'completed',
                  title: result.analysis.suggestedTitle,
                  price: result.analysis.suggestedPrice,
                  category_path: getCategoryPath(normalizeCategory(result.analysis.category)),
                  item_specifics: getItemSpecifics({
                    brand: result.analysis.brand,
                    size: result.analysis.size,
                    color: result.analysis.color,
                    model_number: result.analysis.modelNumber
                  }),
                  condition: normalizeCondition(result.analysis.condition)
                }
              : group
          ));
          
          setProcessingStatus(prev => ({
            ...prev,
            [skuGroup.sku]: 'Completed ✅'
          }));
          
          console.log(`✅ [GENERATE-TABLE] SKU ${i + 1}/${selectedSKUGroups.length} processed successfully`);
          
        } catch (error) {
          console.error(`❌ [GENERATE-TABLE] Error processing SKU ${i + 1}:`, error);
          errors.push({ sku: skuGroup.sku, error: error.message });
          
          setSkuGroups(prev => prev.map(group => 
            group.sku === skuGroup.sku 
              ? { ...group, status: 'error' }
              : group
          ));
          
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

      // Clear selection
      setSelectedSKUs(new Set());

    } catch (error) {
      console.error('❌ [GENERATE-TABLE] Error in batch generation:', error);
      setErrorMessage(`Failed to generate listings: ${error.message}`);
    } finally {
      setIsGenerating(false);
      setProcessingStatus({});
    }
  };

  const getStatusDisplay = (group: SKUGroup) => {
    const processingText = processingStatus[group.sku];
    if (processingText) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
          {processingText}
        </span>
      );
    }

    switch (group.status) {
      case 'ready_for_generation':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            Not Started
          </span>
        );
      case 'processing':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
            Processing...
          </span>
        );
      case 'completed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">
            Completed ✅
          </span>
        );
      case 'error':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            Error ❌
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            Unknown
          </span>
        );
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
            Generate Listings
          </h2>
          <p className={`${isDarkMode ? 'text-white/70' : 'text-gray-600'} mt-1`}>
            Items Ready for Listing
          </p>
        </div>
        
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
          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              {/* Table Header */}
              <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedSKUs.size === skuGroups.length && skuGroups.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Photo
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    SKU
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Title
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Price
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Generation Status
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Category Path
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Item Specifics
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Condition
                  </th>
                  <th className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Actions
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
                {skuGroups.map((group) => {
                  const isSelected = selectedSKUs.has(group.sku);
                  
                  return (
                    <tr
                      key={group.sku}
                      className={`transition-colors ${
                        isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      } ${
                        isSelected ? (isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50') : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectSKU(group.sku)}
                          disabled={isGenerating}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Photo */}
                      <td className="px-4 py-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                          {group.photos[0]?.image_url ? (
                            <img
                              src={group.photos[0].image_url}
                              alt={`SKU ${group.sku}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          {group.photo_count > 1 && (
                            <div className="absolute bottom-0 right-0 bg-blue-600 text-white text-xs px-1 rounded-tl">
                              +{group.photo_count - 1}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="px-4 py-4">
                        <span className={`text-sm font-mono px-2 py-1 rounded ${
                          isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {group.sku}
                        </span>
                      </td>

                      {/* Title */}
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          {group.title ? (
                            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {group.title}
                            </span>
                          ) : (
                            <span className={`text-gray-500 ${isDarkMode ? 'dark:text-gray-400' : ''}`}>
                              -
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-4">
                        {group.price ? (
                          <span className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                            {formatPrice(group.price)}
                          </span>
                        ) : (
                          <span className={`text-gray-500 ${isDarkMode ? 'dark:text-gray-400' : ''}`}>
                            -
                          </span>
                        )}
                      </td>

                      {/* Generation Status */}
                      <td className="px-4 py-4">
                        {getStatusDisplay(group)}
                      </td>

                      {/* Category Path */}
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          {group.category_path ? (
                            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {group.category_path}
                            </span>
                          ) : (
                            <span className={`text-gray-500 ${isDarkMode ? 'dark:text-gray-400' : ''}`}>
                              -
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Item Specifics */}
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          {group.item_specifics ? (
                            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {group.item_specifics}
                            </span>
                          ) : (
                            <span className={`text-gray-500 ${isDarkMode ? 'dark:text-gray-400' : ''}`}>
                              -
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Condition */}
                      <td className="px-4 py-4">
                        {group.condition ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            group.condition === 'like_new' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : group.condition === 'good'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                              : group.condition === 'fair'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                          }`}>
                            {group.condition.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className={`text-gray-500 ${isDarkMode ? 'dark:text-gray-400' : ''}`}>
                            -
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDeleteSKUGroup(group.sku)}
                            disabled={isGenerating || isDeleting}
                            className={`p-2 rounded-lg transition-colors ${
                              isDarkMode 
                                ? 'hover:bg-red-500/20 text-red-400 hover:text-red-300 disabled:text-red-600' 
                                : 'hover:bg-red-50 text-red-600 hover:text-red-700 disabled:text-red-400'
                            }`}
                            title="Delete SKU group"
                          >
                            {isDeleting ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
