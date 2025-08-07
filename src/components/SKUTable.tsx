import React, { useState, useEffect } from 'react';
import { Package, Edit, Trash2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase, type Item } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice, generateSKU, getItemSpecifics } from '../utils/itemUtils';

interface SKUTableProps {
  isDarkMode: boolean;
}

const SKUTable: React.FC<SKUTableProps> = ({ isDarkMode }) => {
  const { authUser, user, updateUser } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingSKUs, setIsGeneratingSKUs] = useState(false);
  const [editingSKU, setEditingSKU] = useState<string | null>(null);
  const [editSKUValue, setEditSKUValue] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchItems();
  }, [authUser]);

  const fetchItems = async () => {
    if (!authUser) return;

    try {
      console.log('🔍 [SKU-TABLE] Fetching items...');
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ [SKU-TABLE] Error fetching items:', fetchError);
        throw fetchError;
      }

      console.log('✅ [SKU-TABLE] Items fetched successfully:', data?.length || 0);
      setItems(data || []);
    } catch (error) {
      console.error('❌ [SKU-TABLE] Error in fetchItems:', error);
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

  // Enhanced cascade delete function
  const deleteItemsWithCascade = async (itemIds: string[]) => {
    console.log('🗑️ [DELETE] Starting cascade delete for items:', itemIds);
    
    try {
      // Step 1: Delete related records first
      console.log('🗑️ [DELETE] Step 1: Deleting related records...');
      
      // Delete listings first
      const { error: listingsError } = await supabase
        .from('listings')
        .delete()
        .in('item_id', itemIds);
      
      if (listingsError) {
        console.error('❌ [DELETE] Failed to delete listings:', listingsError);
        // Continue anyway - listings might not exist
      } else {
        console.log('✅ [DELETE] Listings deleted successfully');
      }
      
      // Delete photo analyses if they exist
      const { error: analysesError } = await supabase
        .from('photo_analysis')
        .delete()
        .in('item_id', itemIds);
      
      if (analysesError) {
        console.error('❌ [DELETE] Failed to delete photo analyses:', analysesError);
        // Continue anyway - analyses might not exist
      } else {
        console.log('✅ [DELETE] Photo analyses deleted successfully');
      }
      
      // Step 2: Delete the items themselves
      console.log('🗑️ [DELETE] Step 2: Deleting items...');
      
      const { data, error: itemsError } = await supabase
        .from('items')
        .delete()
        .in('id', itemIds)
        .select();
      
      if (itemsError) {
        console.error('❌ [DELETE] Failed to delete items:', itemsError);
        throw itemsError;
      }
      
      console.log('✅ [DELETE] Items deleted successfully:', data);
      return data;
      
    } catch (error) {
      console.error('❌ [DELETE] Cascade delete failed:', error);
      throw error;
    }
  };

  // Confirmation dialog for delete operations
  const confirmDelete = (itemCount: number, callback: () => void) => {
    if (window.confirm(`Are you sure you want to delete ${itemCount} item${itemCount !== 1 ? 's' : ''}? This action cannot be undone.`)) {
      callback();
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) {
      alert('Please select items to delete.');
      return;
    }

    const itemIds = Array.from(selectedItems);
    
    confirmDelete(selectedItems.size, async () => {
      setIsDeleting(true);
      setSuccessMessage('');
      setErrorMessage('');
      
      try {
        console.log('🗑️ [DELETE] Attempting to delete items:', itemIds);
        
        // Method 1: Try direct delete first
        let { data, error } = await supabase
          .from('items')
          .delete()
          .in('id', itemIds)
          .select();
        
        // Method 2: If direct delete fails due to foreign key constraints, try cascade delete
        if (error && error.code === '23503') {
          console.warn('⚠️ [DELETE] Direct delete failed due to foreign key constraints, trying cascade delete...');
          data = await deleteItemsWithCascade(itemIds);
        } else if (error) {
          throw error;
        }
        
        console.log('✅ [DELETE] Successfully deleted items:', data);
        
        // Update user's listing count
        if (user && user.listings_used > 0) {
          const newListingsUsed = Math.max(0, user.listings_used - selectedItems.size);
          await updateUser({ listings_used: newListingsUsed });
        }
        
        // Update UI
        setItems(prevItems => 
          prevItems.filter(item => !selectedItems.has(item.id))
        );
        setSelectedItems(new Set());
        
        // Show success message
        setSuccessMessage(`Successfully deleted ${itemIds.length} item${itemIds.length !== 1 ? 's' : ''}`);
        
      } catch (error) {
        console.error('❌ [DELETE] Delete operation failed:', error);
        
        // User-friendly error messages
        let errorMsg = 'Failed to delete items. ';
        
        if (error.code === '23503') {
          errorMsg += 'Items have associated data that prevents deletion.';
        } else if (error.code === '42501') {
          errorMsg += 'You do not have permission to delete these items.';
        } else {
          errorMsg += 'Please try again or contact support.';
        }
        
        setErrorMessage(errorMsg);
        
      } finally {
        setIsDeleting(false);
      }
    });
  };


  const handleDeleteItem = async (itemId: string) => {
    confirmDelete(1, async () => {
      setIsDeleting(true);
      setSuccessMessage('');
      setErrorMessage('');
      
      try {
        console.log('🗑️ [DELETE] Deleting single item:', itemId);
        
        // Try direct delete first
        let { data, error } = await supabase
          .from('items')
          .delete()
          .eq('id', itemId)
          .select();
        
        // If direct delete fails due to foreign key constraints, try cascade delete
        if (error && error.code === '23503') {
          console.warn('⚠️ [DELETE] Direct delete failed, trying cascade delete...');
          data = await deleteItemsWithCascade([itemId]);
        } else if (error) {
          throw error;
        }
        
        // Update user's listing count
        if (user && user.listings_used > 0) {
          await updateUser({ listings_used: Math.max(0, user.listings_used - 1) });
        }
        
        console.log('✅ [DELETE] Item deleted successfully');
        
        // Update UI
        setItems(prevItems => prevItems.filter(item => item.id !== itemId));
        setSuccessMessage('Item deleted successfully');
        
      } catch (error) {
        console.error('❌ [DELETE] Error deleting item:', error);
        
        let errorMsg = 'Failed to delete item. ';
        if (error.code === '23503') {
          errorMsg += 'Item has associated data that prevents deletion.';
        } else {
          errorMsg += 'Please try again.';
        }
        
        setErrorMessage(errorMsg);
      } finally {
        setIsDeleting(false);
      }
    });
  };

  const handleGenerateSKUs = async () => {
    if (selectedItems.size === 0) {
      alert('Please select items to generate SKUs for.');
      return;
    }

    setIsGeneratingSKUs(true);
    try {
      console.log('🏷️ [SKU-TABLE] Generating SKUs for selected items...');
      
      const selectedItemsArray = items.filter(item => selectedItems.has(item.id));
      
      for (const item of selectedItemsArray) {
        const newSKU = generateSKU(item);
        
        const { error: updateError } = await supabase
          .from('items')
          .update({ sku: newSKU })
          .eq('id', item.id);

        if (updateError) {
          console.error('❌ [SKU-TABLE] Error updating SKU for item:', item.id, updateError);
          throw updateError;
        }
      }

      console.log('✅ [SKU-TABLE] SKUs generated successfully');
      alert(`Successfully generated SKUs for ${selectedItems.size} items!`);
      
      // Refresh the table
      await fetchItems();
      setSelectedItems(new Set());
    } catch (error) {
      console.error('❌ [SKU-TABLE] Error generating SKUs:', error);
      alert('Failed to generate SKUs. Please try again.');
    } finally {
      setIsGeneratingSKUs(false);
    }
  };

  const handleEditSKU = (itemId: string, currentSKU: string) => {
    setEditingSKU(itemId);
    setEditSKUValue(currentSKU || '');
  };

  const handleSaveSKU = async (itemId: string) => {
    if (!editSKUValue.trim()) {
      alert('SKU cannot be empty.');
      return;
    }

    try {
      const { error } = await supabase
        .from('items')
        .update({ sku: editSKUValue.trim() })
        .eq('id', itemId);

      if (error) throw error;

      console.log('✅ [SKU-TABLE] SKU updated successfully');
      setEditingSKU(null);
      setEditSKUValue('');
      await fetchItems();
    } catch (error) {
      console.error('❌ [SKU-TABLE] Error updating SKU:', error);
      alert('Failed to update SKU. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingSKU(null);
    setEditSKUValue('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <span className={`ml-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Loading items...
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
          onClick={fetchItems}
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
            SKU Management
          </h2>
          <p className={`${isDarkMode ? 'text-white/70' : 'text-gray-600'} mt-1`}>
            Manage SKUs for your items ({items.length} items)
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchItems}
            disabled={loading || isDeleting}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              isDarkMode 
                ? 'bg-white/10 hover:bg-white/20 text-white disabled:bg-white/5' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:bg-gray-50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${loading || isDeleting ? 'animate-spin' : ''}`} />
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
            disabled={isDeleting}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:bg-gray-800 disabled:text-gray-500'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 disabled:bg-gray-100 disabled:text-gray-400'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedItems.size === items.length && items.length > 0}
              onChange={handleSelectAll}
              disabled={isDeleting}
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
              disabled={isDeleting || isGeneratingSKUs}
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
              onClick={handleGenerateSKUs}
              disabled={isGeneratingSKUs || isDeleting}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium transition-all duration-300 flex items-center space-x-2 shadow-lg"
            >
              {isGeneratingSKUs ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Generate SKUs for {selectedItems.size} Item{selectedItems.size > 1 ? 's' : ''}</span>
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
            No Items Found
          </h3>
          <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Upload some photos to get started with SKU management.
          </p>
          <button
            onClick={fetchItems}
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
                    Category
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
                  const isSelected = selectedItems.has(item.id);
                  const isEditing = editingSKU === item.id;
                  
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
                          disabled={isDeleting}
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
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editSKUValue}
                              onChange={(e) => setEditSKUValue(e.target.value)}
                              className={`text-sm font-mono px-2 py-1 rounded border ${
                                isDarkMode 
                                  ? 'bg-gray-700 text-gray-200 border-gray-600' 
                                  : 'bg-white text-gray-800 border-gray-300'
                              } focus:ring-2 focus:ring-blue-500`}
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveSKU(item.id)}
                              className="text-green-600 hover:text-green-700 p-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-gray-600 hover:text-gray-700 p-1"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-mono px-2 py-1 rounded ${
                              isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {item.sku || 'No SKU'}
                            </span>
                            <button
                              onClick={() => handleEditSKU(item.id, item.sku || '')}
                              className={`p-1 rounded transition-colors ${
                                isDarkMode 
                                  ? 'hover:bg-white/10 text-white/70 hover:text-white' 
                                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                              }`}
                              title="Edit SKU"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Title */}
                      <td className="px-4 py-4">
                        <div className="max-w-xs">
                          <h3 className={`font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {item.title}
                          </h3>
                          {item.brand && (
                            <p className={`text-sm truncate mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {item.brand}
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

                      {/* Category */}
                      <td className="px-4 py-4">
                        <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {item.category?.replace('_', ' ') || 'Other'}
                        </span>
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
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={isDeleting || isGeneratingSKUs}
                            className={`p-2 rounded-lg transition-colors ${
                              isDarkMode 
                                ? 'hover:bg-red-500/20 text-red-400 hover:text-red-300 disabled:text-red-600' 
                                : 'hover:bg-red-50 text-red-600 hover:text-red-700 disabled:text-red-400'
                            }`}
                            title="Delete item"
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
          <div className={`mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} text-center`}>
            Showing {items.length} item{items.length !== 1 ? 's' : ''} 
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

export default SKUTable;