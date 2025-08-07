import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Keep this import
import { supabase } from '../lib/supabase';
import ListingsTable from '../components/ListingsTable';
import EditListingModal from '../components/EditListingModal';
import { useAIAnalysis } from '../hooks/useAIAnalysis';

interface SKUGroup {
  sku: string;
  photos: Array<{
    id: string;
    image_url: string;
    filename: string;
    upload_order: number;
  }>;
}

interface ListingItem {
  id: string;
  sku: string;
  photos: string[];
  primaryPhoto: string;
  title: string;
  description: string;
  price: number;
  categoryPath: string;
  categoryId: string;
  itemSpecifics: Record<string, string>;
  keywords: string[];
  status: 'not_started' | 'analyzing' | 'ready' | 'needs_attention' | 'complete';
  generationError?: string;
  lastUpdated: Date;
  aiConfidence: number;
  brand?: string;
  size?: string;
  condition?: string;
  category?: string;
  color?: string;
  material?: string;
}

const GenerateListingsPage = () => {
  const { authUser } = useAuth();
  const { analyzeItem, isAnalyzing } = useAIAnalysis();
  
  // State management
  const [skuGroups, setSKUGroups] = useState<SKUGroup[]>([]);
  const [listingItems, setListingItems] = useState<ListingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [editingItem, setEditingItem] = useState<ListingItem | null>(null);
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

      // Fetch photos grouped by SKU
      const { data: photos, error: photosError } = await supabase
        .from('uploaded_photos')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('status', 'assigned')
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

      // Fetch existing listings for these SKUs
      const { data: existingListings, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', authUser.id)
        .in('sku', skuGroupsArray.map(g => g.sku));

      if (listingsError) {
        console.error('❌ [GENERATE-LISTINGS] Error fetching existing listings:', listingsError);
      }

      // Convert to listing items format
      const items: ListingItem[] = skuGroupsArray.map(group => {
        const existingListing = existingListings?.find(l => l.sku === group.sku);
        const primaryPhoto = group.photos[0]?.image_url || '';
        
        return {
          id: existingListing?.id || `temp_${group.sku}`,
          sku: group.sku,
          photos: group.photos.map(p => p.image_url),
          primaryPhoto,
          title: existingListing?.title || '',
          description: existingListing?.description || '',
          price: existingListing?.price || 0,
          categoryPath: existingListing?.category_path || '',
          categoryId: existingListing?.category_id || '',
          itemSpecifics: existingListing?.item_specifics || {},
          keywords: existingListing?.keywords || [],
          status: existingListing ? 'complete' : 'not_started',
          lastUpdated: existingListing?.updated_at ? new Date(existingListing.updated_at) : new Date(),
          aiConfidence: existingListing?.ai_confidence || 0,
          brand: existingListing?.brand,
          size: existingListing?.size,
          condition: existingListing?.condition,
          category: existingListing?.category,
          color: existingListing?.color,
          material: existingListing?.material
        };
      });

      setListingItems(items);
      console.log('✅ [GENERATE-LISTINGS] Loaded items:', items.length);

    } catch (error) {
      console.error('❌ [GENERATE-LISTINGS] Error fetching data:', error);
      setError('Failed to load SKU groups. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate listing for individual item
  const handleGenerateItem = async (item: ListingItem) => {
    try {
      console.log('🚀 [GENERATE-LISTINGS] Starting generation for item:', item.sku);
      
      // Update status to analyzing
      setListingItems(prev => prev.map(i => 
        i.sku === item.sku 
          ? { ...i, status: 'analyzing' }
          : i
      ));

      // Run AI analysis
      const analysisResult = await analyzeItem(item.primaryPhoto, { // Use analyzeItem from useAIAnalysis hook
        sku: item.sku,
        photos: item.photos
      });

      if (!analysisResult.success) {
        throw new Error(analysisResult.error || 'AI analysis failed');
      }

      const aiData = analysisResult.data;
      console.log('🤖 [GENERATE-LISTINGS] AI analysis complete:', aiData);
      
      // Extract structured data
      const extractedData = extractListingDataFromAI(aiData);
      console.log('📊 [GENERATE-LISTINGS] Extracted data:', extractedData);

      // Create or update listing in database
      const listingData = {
        user_id: authUser.id,
        sku: item.sku,
        title: extractedData.title,
        description: extractedData.description,
        price: extractedData.price,
        images: item.photos,
        brand: extractedData.brand,
        size: extractedData.size,
        condition: extractedData.condition,
        category: extractedData.category,
        color: extractedData.color,
        material: extractedData.material,
        category_path: extractedData.categoryPath || 'Clothing, Shoes & Accessories > Clothing',
        category_id: extractedData.categoryId || '11450',
        item_specifics: extractedData.item_specifics,
        keywords: extractedData.keywords || [],
        ai_confidence: extractedData.confidence || 0.8,
        status: 'draft',
        platforms: ['ebay'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let savedListing;
      if (item.id.startsWith('temp_')) {
        // Create new listing
        const { data, error } = await supabase
          .from('listings')
          .insert(listingData)
          .select('*')
          .single();

        if (error) throw error;
        savedListing = data;
      } else {
        // Update existing listing
        const { data, error } = await supabase
          .from('listings')
          .update(listingData)
          .eq('id', item.id)
          .select('*')
          .single();

        if (error) throw error;
        savedListing = data;
      }

      // Update local state
      setListingItems(prev => prev.map(i => 
        i.sku === item.sku 
          ? {
              ...i,
              id: savedListing.id,
              title: extractedData.title,
              description: extractedData.description,
              price: extractedData.price,
              brand: extractedData.brand,
              size: extractedData.size,
              condition: extractedData.condition,
              category: extractedData.category,
              color: extractedData.color,
              material: extractedData.material,
              categoryPath: extractedData.categoryPath || 'Clothing, Shoes & Accessories > Clothing',
              itemSpecifics: extractedData.item_specifics,
              keywords: extractedData.keywords || [],
              status: 'ready',
              aiConfidence: extractedData.confidence || 0.8,
              lastUpdated: new Date()
            }
          : i
      ));

      console.log('✅ [GENERATE-LISTINGS] Generation complete for:', item.sku);

    } catch (error) {
      console.error('❌ [GENERATE-LISTINGS] Generation failed:', error);
      
      // Update status to error
      setListingItems(prev => prev.map(i => 
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
  
  // Fallback listing generation for error handling
  const generateFallbackListing = (item: ListingItem) => {
    return {
      ...item,
      title: `Item ${item.sku} - Manual Review Required`,
      description: 'This item requires manual review and editing due to an AI analysis failure.',
      price: 0,
      categoryPath: '',
      categoryId: '',
      itemSpecifics: {},
      keywords: [],
    };
  };

  // Generate all listings
  const handleGenerateAll = async () => {
    const itemsToGenerate = listingItems.filter(item => 
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
          setListingItems(prev => prev.map(i => 
            i.sku === item.sku 
              ? { ...i, status: 'analyzing', generationError: undefined }
              : i
          ));
          await handleGenerateItem(item);
          // Add small delay between requests to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 1000)); 
        } catch (error) {
          console.error(`❌ [GENERATE-LISTINGS] Bulk generation failed for item ${item.sku}:`, error);
          setListingItems(prev => prev.map(i => 
            i.sku === item.sku 
              ? { ...generateFallbackListing(item), status: 'needs_attention', generationError: error.message }
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
    if (selectedItems.size === listingItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(listingItems.map(item => item.sku)));
    }
  };

  // Handle editing
  const handleEditItem = (item: ListingItem) => {
    setEditingItem(item);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedData: Partial<ListingItem>) => {
    if (!editingItem) return;

    try {
      console.log('💾 [GENERATE-LISTINGS] Saving edit for:', editingItem.sku);

      const { data, error } = await supabase
        .from('listings')
        .update({
          title: updatedData.title,
          description: updatedData.description,
          price: updatedData.price,
          brand: updatedData.brand,
          size: updatedData.size,
          condition: updatedData.condition,
          category: updatedData.category,
          color: updatedData.color,
          material: updatedData.material,
          item_specifics: updatedData.itemSpecifics,
          keywords: updatedData.keywords,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingItem.id)
        .select('*')
        .single();

      if (error) throw error;

      // Update local state
      setListingItems(prev => prev.map(item => 
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
    const item = listingItems.find(i => i.sku === itemSku);
    if (!item) return;

    if (!window.confirm(`Are you sure you want to delete the listing for SKU ${itemSku}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete from database if it exists
      if (!item.id.startsWith('temp_')) {
        const { error } = await supabase
          .from('listings')
          .delete()
          .eq('id', item.id);

        if (error) throw error;
      }

      // Remove from local state
      setListingItems(prev => prev.filter(i => i.sku !== itemSku));
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

  // Extract listing data from AI analysis
  const extractListingDataFromAI = (aiAnalysis: any) => {
    console.log('📊 [EXTRACT] Processing AI analysis:', aiAnalysis);
    
    // Debug the AI response
    debugAIResponse(aiAnalysis);
    
    // Try all possible field name variations with enhanced eBay integration
    const title = aiAnalysis?.title || 
                  aiAnalysis?.suggested_title || 
                  aiAnalysis?.name || 
                  aiAnalysis?.itemName || 
                  aiAnalysis?.item_name || 
                  aiAnalysis?.product_name || 
                  aiAnalysis?.listing_title ||
                  generateFallbackTitle(aiAnalysis);
    
    // Use market research price if available, otherwise AI price
    const rawPrice = aiAnalysis?.suggested_price || // Market research price
                     aiAnalysis?.price || 
                     aiAnalysis?.suggested_price || 
                     aiAnalysis?.estimated_price || 
                     aiAnalysis?.estimatedPrice || 
                     aiAnalysis?.suggestedPrice || 
                     aiAnalysis?.market_price || 
                     aiAnalysis?.listing_price ||
                     35;
    
    const price = parseFloat(rawPrice) || 35;
    
    const brand = aiAnalysis?.brand || 'Unknown Brand';
    const size = aiAnalysis?.size || 'Unknown';
    const condition = aiAnalysis?.condition || 'Good';
    const category = aiAnalysis?.recommended_category?.categoryName || 
                    aiAnalysis?.category || 
                    aiAnalysis?.item_type || 
                    'Clothing';
    const color = aiAnalysis?.color || 'Multi-Color';
    const material = aiAnalysis?.material || 'Mixed Materials';
    
    // Enhanced keywords from multiple sources
    const keywords = [
      ...(aiAnalysis?.keywords || []),
      ...(aiAnalysis?.ai_suggested_keywords || []),
      ...(aiAnalysis?.key_features || [])
    ].filter((keyword, index, array) => 
      keyword && array.indexOf(keyword) === index // Remove duplicates
    ).slice(0, 10); // Limit to 10 keywords
    
    const description = generateListingDescription({
      title, brand, size, condition, category, color, material, keywords
    });
    
    const itemSpecifics = {
      Brand: brand,
      Size: size,
      Condition: condition,
      Color: color,
      Material: material,
      Category: category
    };
    
    // Use eBay category data if available
    const categoryPath = aiAnalysis?.recommended_category?.categoryPath || getCategoryPath(category);
    const categoryId = aiAnalysis?.recommended_category?.categoryId || getCategoryId(category);
    
    const extractedData = {
      title,
      description,
      price,
      brand,
      size,
      condition,
      category,
      color,
      material,
      keywords,
      item_specifics: itemSpecifics,
      categoryPath,
      categoryId,
      confidence: aiAnalysis?.market_confidence || aiAnalysis?.confidence || 0.8,
      // Add eBay-specific data
      market_research: aiAnalysis?.marketResearch || null,
      category_analysis: aiAnalysis?.categoryAnalysis || null
    };
    
    console.log('📋 [EXTRACT] Final extracted data:', extractedData);
    return extractedData;
  };

  // Debug AI response
  const debugAIResponse = (aiAnalysis: any) => {
    console.log('🔍 [DEBUG] =====================================');
    console.log('🔍 [DEBUG] FULL AI ANALYSIS RESPONSE:');
    console.log('🔍 [DEBUG] =====================================');
    console.log('🔍 [DEBUG] Raw response:', JSON.stringify(aiAnalysis, null, 2));
    console.log('🔍 [DEBUG] Response type:', typeof aiAnalysis);
    console.log('🔍 [DEBUG] Available keys:', Object.keys(aiAnalysis || {}));
    
    // Check every possible field name for title
    console.log('🔍 [DEBUG] TITLE FIELD VARIATIONS:');
    const titleFields = ['title', 'suggested_title', 'name', 'itemName', 'item_name', 'product_name', 'listing_title'];
    titleFields.forEach(field => {
      if (aiAnalysis[field] !== undefined) {
        console.log(`🔍 [DEBUG] ✅ FOUND TITLE: ${field} = "${aiAnalysis[field]}"`);
      } else {
        console.log(`🔍 [DEBUG] ❌ Missing: ${field}`);
      }
    });
    
    // Check every possible field name for price
    console.log('🔍 [DEBUG] PRICE FIELD VARIATIONS:');
    const priceFields = ['price', 'suggested_price', 'estimated_price', 'estimatedPrice', 'suggestedPrice', 'market_price', 'listing_price'];
    priceFields.forEach(field => {
      if (aiAnalysis[field] !== undefined) {
        console.log(`🔍 [DEBUG] ✅ FOUND PRICE: ${field} = "${aiAnalysis[field]}"`);
      } else {
        console.log(`🔍 [DEBUG] ❌ Missing: ${field}`);
      }
    });
    
    // Check other important fields
    console.log('🔍 [DEBUG] OTHER IMPORTANT FIELDS:');
    ['brand', 'size', 'condition', 'category', 'item_type', 'color', 'material'].forEach(field => {
      if (aiAnalysis[field] !== undefined) {
        console.log(`🔍 [DEBUG] ✅ ${field.toUpperCase()}: "${aiAnalysis[field]}"`);
      }
    });
    
    console.log('🔍 [DEBUG] =====================================');
  };

  // Helper functions
  const generateFallbackTitle = (aiAnalysis: any) => {
    const brand = aiAnalysis?.brand || 'Quality';
    const category = aiAnalysis?.category || aiAnalysis?.item_type || 'Clothing Item';
    const size = aiAnalysis?.size ? ` Size ${aiAnalysis.size}` : '';
    const condition = aiAnalysis?.condition ? ` - ${aiAnalysis.condition}` : '';
    
    return `${brand} ${category}${size}${condition}`;
  };

  const generateListingDescription = ({ title, brand, size, condition, category, color, material, keywords }) => {
    const features = [];
    if (brand !== 'Unknown Brand') features.push(`Brand: ${brand}`);
    if (size !== 'Unknown') features.push(`Size: ${size}`);
    if (condition) features.push(`Condition: ${condition}`);
    if (color !== 'Multi-Color') features.push(`Color: ${color}`);
    if (material !== 'Mixed Materials') features.push(`Material: ${material}`);
    
    const featureText = features.length > 0 ? features.join(' | ') : 'Quality item in great condition';
    const keywordText = keywords.length > 0 ? `\n\nKeywords: ${keywords.join(', ')}` : '';
    
    return `${title}

${featureText}${keywordText}

This item is carefully inspected and ready to ship. Check out our other listings for more great deals!

Fast shipping and excellent customer service guaranteed.`;
  };

  const getCategoryPath = (category: string) => {
    const categoryPaths: Record<string, string> = {
      'clothing': 'Clothing, Shoes & Accessories > Clothing',
      'jacket': 'Clothing, Shoes & Accessories > Clothing > Coats & Jackets',
      'shirt': 'Clothing, Shoes & Accessories > Clothing > Shirts',
      'pants': 'Clothing, Shoes & Accessories > Clothing > Pants',
      'dress': 'Clothing, Shoes & Accessories > Clothing > Dresses',
      'shoes': 'Clothing, Shoes & Accessories > Shoes',
      'accessories': 'Clothing, Shoes & Accessories > Accessories'
    };
    return categoryPaths[category.toLowerCase()] || 'Clothing, Shoes & Accessories > Clothing';
  };

  const getCategoryId = (category: string) => {
    const categoryIds: Record<string, string> = {
      'clothing': '11450',
      'jacket': '57988',
      'shirt': '57990',
      'pants': '57989',
      'dress': '63861',
      'shoes': '93427',
      'accessories': '169291'
    };
    return categoryIds[category.toLowerCase()] || '11450';
  };

  // Calculate stats
  const stats = {
    total: listingItems.length,
    notStarted: listingItems.filter(i => i.status === 'not_started').length,
    analyzing: listingItems.filter(i => i.status === 'analyzing').length,
    ready: listingItems.filter(i => i.status === 'ready').length,
    needsAttention: listingItems.filter(i => i.status === 'needs_attention').length,
    complete: listingItems.filter(i => i.status === 'complete').length
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
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Items Ready for Listing</h2>
          <p className="text-gray-600 mb-6">
            Generate AI-powered listings for your SKU groups. Review and edit before posting to eBay.
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
                  checked={selectedItems.size === listingItems.length && listingItems.length > 0}
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
                    <span>Generate All Listings ({stats.notStarted})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Listings Table */}
        {listingItems.length > 0 ? (
          <ListingsTable
            items={listingItems}
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