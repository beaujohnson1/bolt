import React, { useState, useEffect } from 'react';
import { Package, Eye, Edit, Trash2, ExternalLink, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase, type Item } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice, formatDate, getCategoryPath, getItemSpecifics } from '../utils/itemUtils';

interface GenerateListingsTableProps {
  isDarkMode: boolean;
}

const GenerateListingsTable: React.FC<GenerateListingsTableProps> = ({ isDarkMode }) => {
  const { authUser, user, updateUser } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchItemsReadyForListing();
  }, [authUser]);

  const fetchItemsReadyForListing = async () => {
    if (!authUser) return;

    try {
      console.log('🔍 [GENERATE-TABLE] Fetching items ready for listing...');
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('items')
        .select(`
          *,
          listings (
            id,
            status,
            platforms,
            title,
            price
          )
        `)
        .eq('user_id', authUser.id)
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

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const getGenerationStatus = (item: Item & { listings?: any[] }) => {
    if (!item.listings || item.listings.length === 0) {
      return { status: 'Not Started', color: 'gray', icon: Clock };
    }
    
    const hasActive = item.listings.some(listing => listing.status === 'active');
    const hasDraft = item.listings.some(listing => listing.status === 'draft');
    
    if (hasActive) return { status: 'Live', color: 'green', icon: CheckCircle };
    if (hasDraft) return { status: 'Draft', color: 'yellow', icon: AlertCircle };
    return { status: 'Generated', color: 'blue', icon: CheckCircle };
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) {
      alert('Please select items to delete.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedItems.size} item${selectedItems.size > 1 ? 's' : ''}? This action cannot be undone.`
    );
    
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      console.log('🗑️ [GENERATE-TABLE] Deleting selected items...');
      
      const selectedItemsArray = Array.from(selectedItems);
      
      // Delete associated listings first
      for (const itemId of selectedItemsArray) {
        const { error: listingError } = await supabase
          .from('listings')
          .delete()
          .eq('item_id', itemId);

        if (listingError) {
          console.error('❌ [GENERATE-TABLE] Error deleting listings for item:', itemId, listingError);
          // Continue with other deletions even if one fails
        }
      }

      // Delete the items
      const { error: itemError } = await supabase
        .from('items')
        .delete()
        .in('id', selectedItemsArray);

      if (itemError) {
        console.error('❌ [GENERATE-TABLE] Error deleting items:', itemError);
        throw itemError;
      }

      // Update user's listing count
      if (user && user.listings_used > 0) {
        const newListingsUsed = Math.max(0, user.listings_used - selectedItems.size);
        await updateUser({ listings_used: newListingsUsed });
      }

      console.log('✅ [GENERATE-TABLE] Items deleted successfully');
      
      // Refresh the table and clear selection
      await fetchItemsReadyForListing();
      setSelectedItems(new Set());
      
    } catch (error) {
      console.error('❌ [GENERATE-TABLE] Error deleting items:', error);
      alert('Failed to delete items. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this item? This action cannot be undone.');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      console.log('🗑️ [GENERATE-TABLE] Deleting single item:', itemId);
      
      // Delete associated listings first
      const { error: listingError } = await supabase
        .from('listings')
        .delete()
        .eq('item_id', itemId);

      if (listingError) {
        console.error('❌ [GENERATE-TABLE] Error deleting listings for item:', itemId, listingError);
      }

      // Delete the item
      const { error: itemError } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId);

      if (itemError) {
        console.error('❌ [GENERATE-TABLE] Error deleting item:', itemError);
        throw itemError;
      }

      // Update user's listing count
      if (user && user.listings_used > 0) {
        await updateUser({ listings_used: Math.max(0, user.listings_used - 1) });
      }

      console.log('✅ [GENERATE-TABLE] Item deleted successfully');
      
      // Refresh the table
      await fetchItemsReadyForListing();
      
    } catch (error) {
      console.error('❌ [GENERATE-TABLE] Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <span className={`ml-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Loading items ready for listing...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Error Loading Items
        </h3>
        <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
        <button
          onClick={fetchItemsReadyForListing}
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
            Items Ready for Listing ({items.length} items)
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchItemsReadyForListing}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              isDarkMode 
                ? 'bg-white/10 hover:bg-white/20 text-white disabled:bg-white/5' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:bg-gray-50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleSelectAll}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedItems.size === items.length && items.length > 0}
              onChange={handleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
            />
            <span>{selectedItems.size === items.length ? 'Deselect All' : 'Select All'}</span>
          </button>
          
          {selectedItems.size > 0 && (
            <span className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
          )}
        </div>

        {selectedItems.size > 0 && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-lg"
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete {selectedItems.size} Item{selectedItems.size > 1 ? 's' : ''}</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleGenerateListings}
              disabled={isGenerating}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 shadow-lg"
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
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            No Items Ready for Listing
          </h3>
          <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Upload and process some items first to see them here.
          </p>
          <button
            onClick={fetchItemsReadyForListing}
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
                      checked={selectedItems.size === items.length && items.length > 0}
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
                {items.map((item) => {
                  const generationStatus = getGenerationStatus(item);
                  const StatusIcon = generationStatus.icon;
                  const isSelected = selectedItems.has(item.id);
                  
                  return (
                    <tr
                      key={item.id}
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
                          onChange={() => handleSelectItem(item.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      {/* Photo */}
                      <td className="px-4 py-4">
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
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
                      <td className="px-4 py-4">
                        <span className={`text-sm font-mono px-2 py-1 rounded ${
                          isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.sku || '-'}
                        </span>
                      </td>

                      {/* Title */}
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          <h3 className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {item.title}
                          </h3>
                          {item.brand && (
                            <p className={`text-sm truncate mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {item.brand} • {item.item_type || 'Unknown type'}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-4">
                        <div className="text-right">
                          <div className={`font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                            {formatPrice(item.suggested_price)}
                          </div>
                          {item.price_range_min && item.price_range_max && (
                            <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {formatPrice(item.price_range_min)} - {formatPrice(item.price_range_max)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Generation Status */}
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <StatusIcon className={`w-4 h-4 ${
                            generationStatus.color === 'gray' ? 'text-gray-500' :
                            generationStatus.color === 'green' ? 'text-green-600' :
                            generationStatus.color === 'yellow' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`} />
                          <span className={`text-sm font-medium ${
                            generationStatus.color === 'gray' ? 'text-gray-500' :
                            generationStatus.color === 'green' ? 'text-green-600' :
                            generationStatus.color === 'yellow' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`}>
                            {generationStatus.status}
                          </span>
                        </div>
                      </td>

                      {/* Category Path */}
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          <span className={`text-sm truncate block ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {getCategoryPath(item.category)}
                          </span>
                        </div>
                      </td>

                      {/* Item Specifics */}
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          <span className={`text-sm truncate block ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {getItemSpecifics(item)}
                          </span>
                        </div>
                      </td>

                      {/* Condition */}
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.condition === 'like_new' 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : item.condition === 'good'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                            : item.condition === 'fair'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {item.condition?.replace('_', ' ') || 'Good'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => window.open(`/details/${item.id}`, '_blank')}
                            className={`p-2 rounded-lg transition-colors ${
                              isDarkMode 
                                ? 'hover:bg-white/10 text-white/70 hover:text-white' 
                                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                            }`}
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={isDeleting}
                            className={`p-2 rounded-lg transition-colors ${
                              isDarkMode 
                                ? 'hover:bg-red-500/20 text-red-400 hover:text-red-300 disabled:text-red-600' 
                                : 'hover:bg-red-50 text-red-600 hover:text-red-700 disabled:text-red-400'
                            }`}
                            title="Delete item"
                          >
                            <Trash2 className="w-4 h-4" />
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
          <div className={`mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-center`}>
            Showing {items.length} item{items.length !== 1 ? 's' : ''} ready for listing
            {selectedItems.size > 0 && (
              <span className={`ml-4 font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                • {selectedItems.size} selected
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GenerateListingsTable;