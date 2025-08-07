import React, { useState, useEffect } from 'react';
import { Package, Check, X, RefreshCw, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UploadedPhoto {
  id: string;
  user_id: string;
  image_url: string;
  filename: string;
  status: string;
  assigned_sku?: string;
  assigned_item_id?: string;
  upload_order: number;
  created_at: string;
}

interface SKUAssignmentTableProps {
  isDarkMode: boolean;
  onAssignmentComplete?: () => void;
}

const SKUAssignmentTable: React.FC<SKUAssignmentTableProps> = ({ isDarkMode, onAssignmentComplete }) => {
  const { authUser } = useAuth();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skuInput, setSkuInput] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchUploadedPhotos();
  }, [authUser]);

  const fetchUploadedPhotos = async () => {
    if (!authUser) return;

    try {
      console.log('🔍 [SKU-ASSIGNMENT] Fetching uploaded photos...');
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('uploaded_photos')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('❌ [SKU-ASSIGNMENT] Error fetching photos:', fetchError);
        throw fetchError;
      }

      console.log('✅ [SKU-ASSIGNMENT] Photos fetched successfully:', data?.length || 0);
      setPhotos(data || []);
    } catch (error) {
      console.error('❌ [SKU-ASSIGNMENT] Error in fetchUploadedPhotos:', error);
      setError('Failed to load photos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPhoto = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const handleSelectAll = () => {
    const unassignedPhotos = photos.filter(photo => photo.status === 'uploaded');
    if (selectedPhotos.size === unassignedPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(unassignedPhotos.map(photo => photo.id)));
    }
  };

  const handleAssignSKU = async () => {
    if (selectedPhotos.size === 0) {
      alert('Please select photos to assign a SKU to.');
      return;
    }

    if (!skuInput.trim()) {
      alert('Please enter a SKU number.');
      return;
    }

    // Validate SKU format (must end with digits)
    if (!/\d$/.test(skuInput.trim())) {
      alert('SKU must end with digits (e.g., ABC-123)');
      return;
    }

    setIsAssigning(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      console.log('🏷️ [SKU-ASSIGNMENT] Assigning SKU to selected photos...', {
        sku: skuInput.trim(),
        photoCount: selectedPhotos.size
      });

      const selectedPhotoIds = Array.from(selectedPhotos);

      // Update selected photos with SKU assignment
      const { error: updateError } = await supabase
        .from('uploaded_photos')
        .update({
          assigned_sku: skuInput.trim(),
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .in('id', selectedPhotoIds);

      if (updateError) {
        console.error('❌ [SKU-ASSIGNMENT] Error assigning SKU:', updateError);
        throw updateError;
      }

      console.log('✅ [SKU-ASSIGNMENT] SKU assigned successfully');
      
      // Clear selection and input
      setSelectedPhotos(new Set());
      setSkuInput('');
      
      // Show success message
      setSuccessMessage(`Successfully assigned SKU "${skuInput.trim()}" to ${selectedPhotoIds.length} photo${selectedPhotoIds.length > 1 ? 's' : ''}`);
      
      // Refresh the table
      await fetchUploadedPhotos();
      
      // Call completion callback if provided
      if (onAssignmentComplete) {
        setTimeout(() => {
          onAssignmentComplete();
        }, 2000);
      }
    } catch (error) {
      console.error('❌ [SKU-ASSIGNMENT] Error assigning SKU:', error);
      setErrorMessage(`Failed to assign SKU: ${error.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeletePhotos = async () => {
    if (selectedPhotos.size === 0) {
      alert('Please select photos to delete.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    setIsAssigning(true);
    try {
      const selectedPhotoIds = Array.from(selectedPhotos);

      const { error: deleteError } = await supabase
        .from('uploaded_photos')
        .delete()
        .in('id', selectedPhotoIds);

      if (deleteError) throw deleteError;

      console.log('✅ [SKU-ASSIGNMENT] Photos deleted successfully');
      setSuccessMessage(`Successfully deleted ${selectedPhotoIds.length} photo${selectedPhotoIds.length > 1 ? 's' : ''}`);
      
      setSelectedPhotos(new Set());
      await fetchUploadedPhotos();
    } catch (error) {
      console.error('❌ [SKU-ASSIGNMENT] Error deleting photos:', error);
      setErrorMessage(`Failed to delete photos: ${error.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const unassignedPhotos = photos.filter(photo => photo.status === 'uploaded');
  const assignedGroups = photos
    .filter(photo => photo.status === 'assigned' && photo.assigned_sku)
    .reduce((groups, photo) => {
      const sku = photo.assigned_sku!;
      if (!groups[sku]) {
        groups[sku] = [];
      }
      groups[sku].push(photo);
      return groups;
    }, {} as Record<string, UploadedPhoto[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <span className={`ml-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Loading photos...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Error Loading Photos
        </h3>
        <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
        <button
          onClick={fetchUploadedPhotos}
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
            Assign SKUs to Photos
          </h2>
          <p className={`${isDarkMode ? 'text-white/70' : 'text-gray-600'} mt-1`}>
            Group photos by item and assign SKU numbers
          </p>
        </div>
        
        <button
          onClick={fetchUploadedPhotos}
          disabled={loading || isAssigning}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
            isDarkMode 
              ? 'bg-white/10 hover:bg-white/20 text-white disabled:bg-white/5' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:bg-gray-50'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${loading || isAssigning ? 'animate-spin' : ''}`} />
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

      {/* SKU Assignment Controls */}
      {unassignedPhotos.length > 0 && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSelectAll}
                disabled={isAssigning}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                  isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:bg-gray-800 disabled:text-gray-500'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 disabled:bg-gray-100 disabled:text-gray-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedPhotos.size === unassignedPhotos.length && unassignedPhotos.length > 0}
                  onChange={handleSelectAll}
                  disabled={isAssigning}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span>{selectedPhotos.size === unassignedPhotos.length ? 'Deselect All' : 'Select All'}</span>
              </button>
              
              {selectedPhotos.size > 0 && (
                <span className={`font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                  {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''} selected
                </span>
              )}
            </div>

            {selectedPhotos.size > 0 && (
              <button
                onClick={handleDeletePhotos}
                disabled={isAssigning}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Delete Selected</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={skuInput}
              onChange={(e) => setSkuInput(e.target.value)}
              placeholder="e.g., ABC-123"
              className={`flex-1 px-4 py-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 text-gray-200 border-gray-600 placeholder-gray-400' 
                  : 'bg-white text-gray-800 border-gray-300 placeholder-gray-500'
              } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
              disabled={isAssigning || selectedPhotos.size === 0}
            />
            <button
              onClick={handleAssignSKU}
              disabled={isAssigning || selectedPhotos.size === 0 || !skuInput.trim()}
              className="px-6 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium transition-all duration-300 flex items-center space-x-2"
            >
              {isAssigning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Assigning...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Assign SKU</span>
                </>
              )}
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            SKU must end with digits. Select photos that belong to the same item, then assign a SKU.
          </div>
        </div>
      )}

      {/* Unassigned Photos Grid */}
      {unassignedPhotos.length > 0 && (
        <div className="mb-8">
          <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Unassigned Photos ({unassignedPhotos.length})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {unassignedPhotos.map((photo) => {
              const isSelected = selectedPhotos.has(photo.id);
              return (
                <div
                  key={photo.id}
                  onClick={() => handleSelectPhoto(photo.id)}
                  className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                    isSelected 
                      ? 'border-blue-500 ring-2 ring-blue-200 scale-105' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <img
                    src={photo.image_url}
                    alt={photo.filename}
                    className="w-full h-24 object-cover"
                  />
                  <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {photo.upload_order + 1}
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full p-1">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                    {photo.filename}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assigned SKU Groups */}
      {Object.keys(assignedGroups).length > 0 && (
        <div>
          <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Assigned SKU Groups ({Object.keys(assignedGroups).length})
          </h3>
          <div className="space-y-6">
            {Object.entries(assignedGroups).map(([sku, skuPhotos]) => (
              <div key={sku} className={`border rounded-xl p-4 ${
                isDarkMode ? 'border-gray-600 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'
                    }`}>
                      SKU: {sku}
                    </div>
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {skuPhotos.length} photo{skuPhotos.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      if (window.confirm(`Remove SKU assignment from ${skuPhotos.length} photos?`)) {
                        try {
                          await supabase
                            .from('uploaded_photos')
                            .update({
                              assigned_sku: null,
                              status: 'uploaded',
                              updated_at: new Date().toISOString()
                            })
                            .in('id', skuPhotos.map(p => p.id));
                          
                          await fetchUploadedPhotos();
                          setSuccessMessage(`Removed SKU assignment from ${skuPhotos.length} photos`);
                        } catch (error) {
                          setErrorMessage('Failed to remove SKU assignment');
                        }
                      }
                    }}
                    className={`text-red-600 hover:text-red-700 p-2 rounded-lg transition-colors ${
                      isDarkMode ? 'hover:bg-red-500/20' : 'hover:bg-red-50'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {skuPhotos.map((photo) => (
                    <div key={photo.id} className="relative">
                      <img
                        src={photo.image_url}
                        alt={photo.filename}
                        className="w-full h-16 object-cover rounded border"
                      />
                      <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                        {photo.upload_order + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {photos.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            No Photos Uploaded
          </h3>
          <p className={`mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Go to the Upload tab to add photos first.
          </p>
        </div>
      )}

      {/* Instructions */}
      {unassignedPhotos.length > 0 && (
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">📋 How to Assign SKUs</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <li>• Select all photos that belong to the same item</li>
            <li>• Enter a unique SKU number (must end with digits)</li>
            <li>• Click "Assign SKU" to group the photos</li>
            <li>• Repeat for each item you want to sell</li>
            <li>• Once all photos are assigned, go to "Generate Listings" tab</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default SKUAssignmentTable;