import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ListingsTable from '../components/ListingsTable';
import EditListingModal from '../components/EditListingModal';
import { useAIAnalysis } from '../hooks/useAIAnalysis';
import { mapAIToListing } from '../ai/mapAIToListing';
import { coerceAI } from '../ai/schema';
import { normalizeCategory, normalizeCondition } from '../utils/itemUtils';

interface SKUGroup {
  sku: string;
  photos: Array<{
    id: string;
    image_url: string;
    filename: string;
    upload_order: number;
  }>;
}

interface GeneratedItem {
  id: string;
  sku: string;
  photos: string[];
  primaryPhoto: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  brand?: string;
  size?: string;
  color?: string;
  model_number?: string;
  ai_suggested_keywords: string[];
  ai_confidence: number;
  ai_analysis: any;
  status: 'not_started' | 'analyzing' | 'ready' | 'needs_attention' | 'complete';
  generationError?: string;
  lastUpdated: Date;
}

const GenerateListingsPage = () => {
  const { authUser } = useAuth();
  const { analyzeItem, isAnalyzing } = useAIAnalysis();
  
  // State management
  const [skuGroups, setSKUGroups] = useState<SKUGroup[]>([]);
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [editingItem, setEditingItem] = useState<GeneratedItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch SKU groups and existing listings
  useEffect(() => {
    if (authUser) {
      fetchSKUGroups();
    }
  }, [authUser]);

  const fetchSKUGroups = async () => {
    if (!authUser) return;

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 [GENERATE-LISTINGS] Fetching SKU groups...');

      // Fetch photos grouped by SKU that are assigned but not yet processed
      const { data: photos, error: photosError } = await supabase
        .from('uploaded_photos')
        .select('*')
        .eq('user_id', authUser.id)
        .in('status', ['assigned', 'processed']) // Include both assigned and processed photos
        .not('assigned_sku', 'is', null)
        .order('assigned_sku')
        .order('upload_order');

      if (photosError) throw photosError;

      // Group photos by SKU
      const groupedBySKU = photos.reduce((groups, photo) => {
        const sku = photo.assigned_sku!;
        if (!groups[sku]) {
          groups[sku] = [];
        }
        groups[sku].push(photo);
        return groups;
      }, {} as Record<string, typeof photos>);

      const skuGroupsArray = Object.entries(groupedBySKU).map(([sku, photos]) => ({
        sku,
        photos
      }));

      setSKUGroups(skuGroupsArray);

      // Fetch existing items for this user
      const { data: existingItems, error: itemsError } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (itemsError) {
        console.error('❌ [GENERATE-LISTINGS] Error fetching existing items:', itemsError);
      }

      // Convert to generated items format
      const items: GeneratedItem[] = skuGroupsArray.map(group => {
        // Find existing item by checking if any photo in this group has assigned_item_id
        const primaryPhotoUrl = group.photos[0]?.image_url;
        const photoWithItemId = group.photos.find(photo => photo.assigned_item_id);
        const existingItem = photoWithItemId && existingItems?.find(item => 
          item.id === photoWithItemId.assigned_item_id
        );
        
        const primaryPhoto = group.photos[0]?.image_url || '';
        
        return {
          id: existingItem?.id || `temp_${group.sku}`,
          sku: group.sku,
          photos: group.photos.map(p => p.image_url),
          primaryPhoto,
          title: existingItem?.title || '',
          description: existingItem?.description || '',
          price: existingItem?.suggested_price || 0,
          category: existingItem?.category || '',
          condition: existingItem?.condition || '',
          brand: existingItem?.brand,
          size: existingItem?.size,
          color: existingItem?.color,
          model_number: existingItem?.model_number,
          ai_suggested_keywords: existingItem?.ai_suggested_keywords || [],
          ai_confidence: existingItem?.ai_confidence || 0.8,
          ai_analysis: existingItem?.ai_analysis || {},
          status: existingItem ? 'complete' : 'not_started',
          generationError: undefined,
          lastUpdated: existingItem?.updated_at ? new Date(existingItem.updated_at) : new Date()
        };
      });

      setGeneratedItems(items);
      console.log('✅ [GENERATE-LISTINGS] Loaded items:', items.length);

    } catch (error) {
      console.error('❌ [GENERATE-LISTINGS] Error fetching data:', error);
      setError('Failed to load SKU groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate single item
  const handleGenerateItem = async (item: GeneratedItem) => {
    try {
      console.log('🚀 [GENERATE-LISTINGS] Starting generation for item:', item.sku);
      
      // Update status to analyzing
      setGeneratedItems(prev => prev.map(i => 
        i.sku === item.sku 
          ? { ...i, status: 'analyzing', generationError: undefined }
          : i
      ));

      let analysisResult;
      let sanitizedData = null;
      
      try {
        // Run AI analysis with timeout and retry
        console.log('🤖 [GENERATE-LISTINGS] Starting AI analysis for:', item.primaryPhoto);
        analysisResult = await analyzeItem(item.primaryPhoto, {
          sku: item.sku,
          photos: item.photos,
          includeMarketResearch: true,
          includeCategoryAnalysis: true
        });
        
        console.log('📊 [GENERATE-LISTINGS] AI analysis result:', analysisResult);
        
        if (!analysisResult.success) {
          throw new Error(analysisResult.error || 'AI analysis returned unsuccessful result');
        }
        
        const aiData = analysisResult.data;
        
        if (!aiData) {
          throw new Error('AI analysis returned no data');
        }
        
        console.log('✅ [GENERATE-LISTINGS] AI analysis successful, sanitizing data...');
        
        // Validate and sanitize AI payload once before UI uses it
        try {
          const validatedAI = coerceAI(aiData);
          sanitizedData = mapAIToListing(validatedAI);
        } catch (mapError) {
          console.error('❌ [GENERATE-LISTINGS] AI data mapping failed:', mapError);
          throw new Error(`AI data mapping failed: ${mapError.message}`);
        }
        console.log('✅ [GENERATE-LISTINGS] AI data sanitized successfully');
        
      } catch (aiError) {
        console.error('❌ [GENERATE-LISTINGS] AI analysis failed:', aiError);
        
        // Don't auto-create generic fallbacks - mark as needs attention
        console.log('🚨 [GENERATE-LISTINGS] AI analysis failed, marking as needs attention');
        setGeneratedItems(prev => prev.map(i => 
          i.sku === item.sku 
            ? { 
                ...i, 
                status: 'needs_attention',
                generationError: `AI analysis failed: ${aiError.message}`
              }
            : i
        ));
        return; // Exit early, don't continue processing
      }

      // Validate sanitized data
      if (!sanitizedData || !sanitizedData.title) {
        console.error('❌ [GENERATE-LISTINGS] Sanitized data is invalid');
        setGeneratedItems(prev => prev.map(i => 
          i.sku === item.sku 
            ? { 
                ...i, 
                status: 'needs_attention',
                generationError: 'AI returned invalid data structure'
              }
            : i
        ));
        return; // Exit early
      }
      
      console.log('📊 [GENERATE-LISTINGS] Sanitized data:', sanitizedData);

      // Create or update item in database
      const itemData = {
        user_id: authUser.id,
        title: sanitizedData.title,
        description: sanitizedData.description,
        suggested_price: sanitizedData.suggested_price,
        category: normalizeCategory(sanitizedData.item_type),
        condition: normalizeCondition(sanitizedData.condition),
        images: item.photos,
        primary_image_url: item.primaryPhoto,
        brand: sanitizedData.brand,
        size: sanitizedData.size,
        color: sanitizedData.color,
        model_number: sanitizedData.model_number,
        ai_suggested_keywords: sanitizedData.keywords || [],
        ai_confidence: sanitizedData.confidence || 0.8,
        ai_analysis: {
          detected_category: sanitizedData.item_type,
          detected_brand: sanitizedData.brand,
          detected_condition: sanitizedData.condition,
          key_features: sanitizedData.key_features || [],
          market_comparisons: analysisResult?.marketResearch || {},
          category_suggestions: analysisResult?.categoryAnalysis?.suggestions || [],
          ai_source: 'enhanced_ai',
          evidence: sanitizedData.evidence || {},
          ebay_category_id: analysisResult?.ebay_category_id || null,
          ebay_item_specifics: sanitizedData.ebay_item_specifics || {},
          preprocessing_data: analysisResult?.preprocessing || {}
        },
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let savedItem;
      if (item.id.startsWith('temp_')) {
        // Create new item
        const { data, error } = await supabase
          .from('items')
          .insert(itemData)
          .select('*')
          .single();

        if (error) throw error;
        savedItem = data;
        console.log('✅ [GENERATE-LISTINGS] New item created:', savedItem.id);
        
        // Link photos to the newly created item
        await linkPhotosToItem(item.sku, savedItem.id);
      } else {
        // Update existing item
        const { data, error } = await supabase
          .from('items')
          .update(itemData)
          .eq('id', item.id)
          .select('*')
          .single();

        if (error) throw error;
        savedItem = data;
        console.log('✅ [GENERATE-LISTINGS] Existing item updated:', savedItem.id);
      }

      // Update local state
      setGeneratedItems(prev => prev.map(i => 
        i.sku === item.sku 
          ? {
              ...i,
              id: savedItem.id,
              title: sanitizedData.title,
              description: sanitizedData.description,
              price: sanitizedData.suggested_price,
              category: normalizeCategory(sanitizedData.item_type),
              condition: normalizeCondition(sanitizedData.condition),
              brand: sanitizedData.brand,
              size: sanitizedData.size,
              color: sanitizedData.color,
              model_number: sanitizedData.model_number,
              ai_suggested_keywords: sanitizedData.keywords || [],
              ai_confidence: sanitizedData.confidence || 0.8,
              ai_analysis: itemData.ai_analysis,
              status: 'ready',
              generationError: undefined,
              lastUpdated: new Date()
            }
          : i
      ));

      console.log('✅ [GENERATE-LISTINGS] Generation complete for:', item.sku);

    } catch (error) {
      console.error('❌ [GENERATE-LISTINGS] Generation failed:', error);
      
      // Update status to error
      setGeneratedItems(prev => prev.map(i => 
        i.sku === item.sku 
          ? { 
              ...i, 
              status: 'needs_attention',
              generationError: error.message
            }
          : i
      ));
    }
  };
  
  // Generate all listings
  const handleGenerateAll = async () => {
    const itemsToGenerate = generatedItems.filter(item => 
      item.status === 'not_started' || item.status === 'needs_attention'
    );

    if (itemsToGenerate.length === 0) {
      alert('No items need generation. All items are already processed.');
      return;
    }

    setBulkGenerating(true);
    
    try {
      console.log('🚀 [GENERATE-LISTINGS] Starting bulk generation for', itemsToGenerate.length, 'items.');
      
      for (const item of itemsToGenerate) {
        try {
          // Set item status to "analyzing"
          setGeneratedItems(prev => prev.map(i => 
            i.sku === item.sku 
              ? { ...i, status: 'analyzing', generationError: undefined }
              : i
          ));
          await handleGenerateItem(item);
          // Add small delay between requests to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1000)); 
        } catch (error) {
          console.error(`❌ [GENERATE-LISTINGS] Bulk generation failed for item ${item.sku}:`, error);
          setGeneratedItems(prev => prev.map(i => 
            i.sku === item.sku 
              ? { ...i, status: 'needs_attention', generationError: error.message }
              : i
          ));
        }
      }
      
      console.log('✅ [GENERATE-LISTINGS] Bulk generation complete');
    } catch (error) {
      console.error('❌ [GENERATE-LISTINGS] Bulk generation error:', error);
    } finally {
      setBulkGenerating(false);
    }
  };

  // Handle item selection
  const handleSelectItem = (itemSku: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemSku)) {
      newSelected.delete(itemSku);
    } else {
      newSelected.add(itemSku);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === generatedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(generatedItems.map(item => item.sku)));
    }
  };

  // Handle editing
  const handleEditItem = (item: GeneratedItem) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedData: Partial<GeneratedItem>) => {
    if (!editingItem) return;

    try {
      console.log('💾 [GENERATE-LISTINGS] Saving edit for:', editingItem.sku);

      const { data, error } = await supabase
        .from('items')
        .update({
          title: updatedData.title,
          description: updatedData.description,
          suggested_price: updatedData.price,
          category: updatedData.category,
          condition: updatedData.condition,
          brand: updatedData.brand,
          size: updatedData.size,
          color: updatedData.color,
          model_number: updatedData.model_number,
          ai_suggested_keywords: updatedData.ai_suggested_keywords,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingItem.id)
        .select('*')
        .single();

      if (error) throw error;

      // Update local state
      setGeneratedItems(prev => prev.map(item => 
        item.sku === editingItem.sku 
          ? { ...item, ...updatedData, lastUpdated: new Date() }
          : item
      ));

      setShowEditModal(false);
      setEditingItem(null);
      
      console.log('✅ [GENERATE-LISTINGS] Edit saved successfully');
    } catch (error) {
      console.error('❌ [GENERATE-LISTINGS] Error saving edit:', error);
      alert('Failed to save changes. Please try again.');
    }
  };

  // Delete item
  const handleDeleteItem = async (itemSku: string) => {
    const item = generatedItems.find(i => i.sku === itemSku);
    if (!item) return;

    if (!window.confirm(`Are you sure you want to delete the item for SKU ${itemSku}? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('🗑️ [GENERATE-LISTINGS] Starting deletion process for SKU:', itemSku);
      
      // Delete from database if it exists
      if (!item.id.startsWith('temp_')) {
        const { error } = await supabase
          .from('items')
          .delete()
          .eq('id', item.id);

        if (error) throw error;
        console.log('✅ [GENERATE-LISTINGS] Item deleted from database:', item.id);
      }

      // Reset photos associated with this SKU to make them available for re-assignment
      await resetPhotosForSKU(itemSku);
      
      // Remove from local state
      setGeneratedItems(prev => prev.filter(i => i.sku !== itemSku));
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemSku);
        return newSet;
      });

      console.log('✅ [GENERATE-LISTINGS] Item deleted:', itemSku);
    } catch (error) {
      console.error('❌ [GENERATE-LISTINGS] Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  // Helper function to link photos to a generated item
  const linkPhotosToItem = async (sku: string, itemId: string) => {
    try {
      console.log('🔗 [GENERATE-LISTINGS] Linking photos to item:', { sku, itemId });
      
      const { error } = await supabase
        .from('uploaded_photos')
        .update({
          assigned_item_id: itemId,
          status: 'processed',
          updated_at: new Date().toISOString()
        })
        .eq('assigned_sku', sku)
        .eq('user_id', authUser.id);
      
      if (error) throw error;
      
      console.log('✅ [GENERATE-LISTINGS] Photos linked to item successfully');
    } catch (error) {
      console.error('❌ [GENERATE-LISTINGS] Error linking photos to item:', error);
      throw error;
    }
  };

  // Helper function to reset photos when item is deleted
  const resetPhotosForSKU = async (sku: string) => {
    try {
      console.log('🔄 [GENERATE-LISTINGS] Resetting photos for SKU:', sku);
      
      const { error } = await supabase
        .from('uploaded_photos')
        .update({
          assigned_item_id: null,
          assigned_sku: null,
          status: 'uploaded',
          updated_at: new Date().toISOString()
        })
        .eq('assigned_sku', sku)
        .eq('user_id', authUser.id);
      
      if (error) throw error;
      
      console.log('✅ [GENERATE-LISTINGS] Photos reset successfully - now available for re-assignment');
    } catch (error) {
      console.error('❌ [GENERATE-LISTINGS] Error resetting photos:', error);
      throw error;
    }
  };

  // Calculate stats
  const stats = {
    total: generatedItems.length,
    notStarted: generatedItems.filter(i => i.status === 'not_started').length,
    analyzing: generatedItems.filter(i => i.status === 'analyzing').length,
    ready: generatedItems.filter(i => i.status === 'ready').length,
    needsAttention: generatedItems.filter(i => i.status === 'needs_attention').length,
    complete: generatedItems.filter(i => i.status === 'complete').length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SKU groups...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchSKUGroups}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                to="/app"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </Link>
              
              <div className="h-6 w-px bg-gray-300" />
              
              <h1 className="text-xl font-semibold text-gray-900">Generate Listings</h1>
            </div>
            
            <button
              onClick={fetchSKUGroups}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Generate AI-Powered Items</h2>
          <p className="text-gray-600 mb-6">
            Generate AI-powered item details for your SKU groups. Review and edit before creating listings.
          </p>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-2xl font-bold text-gray-500">{stats.notStarted}</div>
              <div className="text-sm text-gray-600">Not Started</div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-2xl font-bold text-blue-600">{stats.analyzing}</div>
              <div className="text-sm text-gray-600">Analyzing</div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
              <div className="text-sm text-gray-600">Ready</div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-2xl font-bold text-yellow-600">{stats.needsAttention}</div>
              <div className="text-sm text-gray-600">Needs Attention</div>
            </div>
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-2xl font-bold text-purple-600">{stats.complete}</div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
          </div>
          
          {/* Action Bar */}
          <div className="flex items-center justify-between bg-white rounded-lg p-4 border">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedItems.size === generatedItems.length && generatedItems.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Select All ({selectedItems.size} selected)
                </span>
              </label>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleGenerateAll}
                disabled={bulkGenerating || stats.notStarted === 0}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2"
              >
                {bulkGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Generate All Items ({stats.notStarted})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Generated Items Table */}
        {generatedItems.length > 0 ? (
          <ListingsTable
            items={generatedItems}
            selectedItems={selectedItems}
            onSelectItem={handleSelectItem}
            onSelectAll={handleSelectAll}
            onGenerateItem={handleGenerateItem}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            isGenerating={isAnalyzing}
          />
        ) : (
          <div className="bg-white rounded-lg p-12 text-center border">
            <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Items Ready</h3>
            <p className="text-gray-600 mb-6">
              You need to assign SKUs to your photos first before generating listings.
            </p>
            <Link
              to="/app"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go to SKU Assignment</span>
            </Link>
          </div>
        )}
      </main>

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <EditListingModal
          item={editingItem}
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingItem(null);
          }}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
};

export default GenerateListingsPage;