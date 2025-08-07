import React, { useState, useEffect } from 'react';
import { Package, Eye, Edit, Trash2, ExternalLink, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase, type Item } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice, formatDate } from '../utils/itemUtils';

interface GenerateListingsTableProps {
  isDarkMode: boolean;
}

const GenerateListingsTable: React.FC<GenerateListingsTableProps> = ({ isDarkMode }) => {
  const { authUser } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch items ready for listing (draft status with SKU assigned)
  const fetchItemsReadyForListing = async () => {
    if (!authUser) return;

    try {
      console.log('🔍 [GENERATE-TABLE] Fetching items ready for listing...');
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('status', 'draft')
        .not('sku', 'is', null) // Only items with assigned SKUs
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ [GENERATE-TABLE] Error fetching items:', fetchError);
        throw fetchError;
      }

      console.log('✅ [GENERATE-TABLE] Items fetched successfully:', data?.length || 0);
      setItems(data || []);
    } catch (error) {
      console.error('❌ [GENERATE-TABLE] Error in fetchItemsReadyForListing:', error);
      setError('Failed to load items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemsReadyForListing();
  }, [authUser]);

  // Handle item selection
  const handleItemSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  // Generate listings for selected items
  const handleGenerateListings = async () => {
    if (selectedItems.size === 0) {
      alert('Please select items to generate listings for.');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('🚀 [GENERATE-TABLE] Generating listings for selected items...');
      
      const selectedItemsArray = items.filter(item => selectedItems.has(item.id));
      
      for (const item of selectedItemsArray) {
        // Create listing for each selected item
        const { error: listingError } = await supabase
          .from('listings')
          .insert([{
            item_id: item.id,
            user_id: authUser!.id,
            title: item.title,
            description: item.description || `${item.title} in ${item.condition.replace('_', ' ')} condition.`,
            price: item.suggested_price,
            images: item.images,
            platforms: ['ebay'],
            status: 'draft',
            created_at: new Date().toISOString()
          }]);

        if (listingError) {
          console.error('❌ [GENERATE-TABLE] Error creating listing for item:', item.id, listingError);
          throw listingError;
        }

        // Update item status to indicate listing has been generated
        const { error: updateError } = await supabase
          .from('items')
          .update({ status: 'listed' })
          .eq('id', item.id);

        if (updateError) {
          console.error('❌ [GENERATE-TABLE] Error updating item status:', updateError);
        }
      }

      console.log('✅ [GENERATE-TABLE] Listings generated successfully');
      alert(`Successfully generated ${selectedItems.size} listings!`);
      
      // Refresh the table
      await fetchItemsReadyForListing();
      setSelectedItems(new Set());
    } catch (error) {
      console.error('❌ [GENERATE-TABLE] Error generating listings:', error);
      alert('Failed to generate listings. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Get generation status for an item
  const getGenerationStatus = (item: Item) => {
    if (item.status === 'listed') {
      return { status: 'completed', label: 'Generated', icon: CheckCircle, color: 'text-green-600' };
    } else if (item.status === 'draft' && item.sku) {
      return { status: 'ready', label: 'Not Started', icon: Clock, color: 'text-yellow-600' };
    } else {
      return { status: 'pending', label: 'Pending SKU', icon: AlertCircle, color: 'text-red-600' };
    }
  };

  // Get category path (simplified for now)
  const getCategoryPath = (category: string) => {
    const categoryPaths = {
      'clothing': 'Clothing, Shoes & Accessories > Clothing',
      'shoes': 'Clothing, Shoes & Accessories > Shoes',
      'accessories': 'Clothing, Shoes & Accessories > Accessories',
      'electronics': 'Consumer Electronics',
      'home_garden': 'Home & Garden',
      'toys_games': 'Toys & Hobbies',
      'sports_outdoors': 'Sporting Goods',
      'books_media': 'Books, Movies & Music',
      'jewelry': 'Jewelry & Watches',
      'collectibles': 'Collectibles',
      'other': 'Everything Else'
    };
    return categoryPaths[category] || 'Everything Else';
  };

  // Get item specifics
  const getItemSpecifics = (item: Item) => {
    const specifics = [];
    if (item.brand) specifics.push(`Brand: ${item.brand}`);
    if (item.size) specifics.push(`Size: ${item.size}`);
    if (item.color) specifics.push(`Color: ${item.color}`);
    if (item.model_number) specifics.push(`Model: ${item.model_number}`);
    return specifics.join(', ') || '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading items...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Items</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchItemsReadyForListing}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Items Ready for Listing</h3>
        <p className="text-gray-600 mb-4">
          Upload photos and assign SKUs to items before generating listings.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Refresh
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
            Items Ready for Listing
          </h2>
          <p className={`${isDarkMode ? 'text-white/70' : 'text-gray-600'} mt-1`}>
            {items.length} items with assigned SKUs ready to generate listings
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchItemsReadyForListing}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isDarkMode 
                ? 'bg-white/10 hover:bg-white/20 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            Refresh
          </button>
          
          {selectedItems.size > 0 && (
            <button
              onClick={handleGenerateListings}
              disabled={isGenerating}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Generate {selectedItems.size} Listing{selectedItems.size > 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`border-b ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
              <th className="text-left py-3 px-2">
                <input
                  type="checkbox"
                  checked={selectedItems.size === items.length && items.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Photo
              </th>
              <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                SKU
              </th>
              <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Title
              </th>
              <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Price
              </th>
              <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Generation Status
              </th>
              <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Category Path
              </th>
              <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Item Specifics
              </th>
              <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Condition
              </th>
              <th className={`text-left py-3 px-4 font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const generationStatus = getGenerationStatus(item);
              const StatusIcon = generationStatus.icon;
              
              return (
                <tr 
                  key={item.id} 
                  className={`border-b transition-colors ${
                    isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  {/* Checkbox */}
                  <td className="py-4 px-2">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleItemSelect(item.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  
                  {/* Photo */}
                  <td className="py-4 px-4">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.primary_image_url || item.images?.[0] ? (
                        <img
                          src={item.primary_image_url || item.images[0]}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* SKU */}
                  <td className="py-4 px-4">
                    <span className={`font-mono text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {item.sku || '-'}
                    </span>
                  </td>
                  
                  {/* Title */}
                  <td className="py-4 px-4">
                    <div className="max-w-xs">
                      <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'} truncate`}>
                        {item.title}
                      </h3>
                      {item.brand && (
                        <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-gray-500'} truncate`}>
                          {item.brand}
                        </p>
                      )}
                    </div>
                  </td>
                  
                  {/* Price */}
                  <td className="py-4 px-4">
                    <div className="text-right">
                      <div className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                        {formatPrice(item.suggested_price)}
                      </div>
                      {item.price_range_min && item.price_range_max && (
                        <div className={`text-xs ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>
                          {formatPrice(item.price_range_min)} - {formatPrice(item.price_range_max)}
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* Generation Status */}
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <StatusIcon className={`w-4 h-4 ${generationStatus.color}`} />
                      <span className={`text-sm font-medium ${generationStatus.color}`}>
                        {generationStatus.label}
                      </span>
                    </div>
                  </td>
                  
                  {/* Category Path */}
                  <td className="py-4 px-4">
                    <div className="max-w-xs">
                      <span className={`text-sm ${isDarkMode ? 'text-white/70' : 'text-gray-600'} truncate block`}>
                        {getCategoryPath(item.category)}
                      </span>
                    </div>
                  </td>
                  
                  {/* Item Specifics */}
                  <td className="py-4 px-4">
                    <div className="max-w-xs">
                      <span className={`text-sm ${isDarkMode ? 'text-white/70' : 'text-gray-600'} truncate block`}>
                        {getItemSpecifics(item)}
                      </span>
                    </div>
                  </td>
                  
                  {/* Condition */}
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.condition === 'like_new' 
                        ? 'bg-green-100 text-green-700'
                        : item.condition === 'good'
                        ? 'bg-blue-100 text-blue-700'
                        : item.condition === 'fair'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {item.condition.replace('_', ' ')}
                    </span>
                  </td>
                  
                  {/* Actions */}
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {/* TODO: Navigate to item details */}}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDarkMode 
                            ? 'hover:bg-white/10 text-white/70 hover:text-white' 
                            : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                        }`}
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => {/* TODO: Edit item */}}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDarkMode 
                            ? 'hover:bg-white/10 text-white/70 hover:text-white' 
                            : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                        }`}
                        title="Edit item"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selection Summary */}
      {selectedItems.size > 0 && (
        <div className={`mt-4 p-4 rounded-lg ${
          isDarkMode ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'
        } border`}>
          <div className="flex items-center justify-between">
            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSelectedItems(new Set())}
                className={`text-sm ${isDarkMode ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Clear selection
              </button>
              <button
                onClick={handleGenerateListings}
                disabled={isGenerating}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center space-x-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Generate Listings</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenerateListingsTable;