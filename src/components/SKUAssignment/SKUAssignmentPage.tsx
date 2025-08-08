import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, Package } from 'lucide-react';
import { getSupabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import ControlBar from './ControlBar';
import PhotoGrid from './PhotoGrid';

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

interface SKUAssignmentPageProps {
  isDarkMode: boolean;
  onAssignmentComplete?: () => void;
}

const SKUAssignmentPage: React.FC<SKUAssignmentPageProps> = ({ 
  isDarkMode, 
  onAssignmentComplete 
}) => {
  const { authUser } = useAuth();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skuInput, setSkuInput] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    fetchUploadedPhotos();
  }, [authUser]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const fetchUploadedPhotos = async () => {
    if (!authUser) return;
    
    const supabase = getSupabase();
    if (!supabase) {
      setError('Database connection not available. Please check your configuration.');
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 [SKU-ASSIGNMENT] Fetching uploaded photos...');
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('uploaded_photos')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('status', 'uploaded') // Only show unassigned photos
        .order('upload_order', { ascending: true })
        .order('created_at', { ascending: true });

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
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map(photo => photo.id)));
    }
  };

  const handleSkuChange = (value: string) => {
    setSkuInput(value);
    setValidationError('');
    
    // Real-time validation
    if (value.trim() && !/\d$/.test(value.trim())) {
      setValidationError('Must end with digits');
    }
  };

  const handleAssignSKU = async () => {
    if (selectedPhotos.size === 0) {
      setValidationError('Please select photos to assign a SKU to');
      return;
    }

    if (!skuInput.trim()) {
      setValidationError('SKU is required');
      return;
    }

    if (!/\d$/.test(skuInput.trim())) {
      setValidationError('SKU must end with digits (e.g., ABC-123)');
      return;
    }

    setIsAssigning(true);
    setSuccessMessage('');
    setErrorMessage('');
    setValidationError('');

    try {
      console.log('🏷️ [SKU-ASSIGNMENT] Assigning SKU to selected photos...', {
        sku: skuInput.trim(),
        photoCount: selectedPhotos.size
      });
      
      const supabase = getSupabase();
      if (!supabase) {
        setErrorMessage('Database connection not available. Please check your configuration.');
        return;
      }

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
      
      // Refresh the photos
      await fetchUploadedPhotos();
      
      // Auto-advance workflow: if no more photos to assign, suggest moving to Generate Listings
      if (onAssignmentComplete) {
        // Check if there are any remaining unassigned photos
        const supabase = getSupabase();
        if (!supabase) {
          console.error('❌ [SKU-ASSIGNMENT] Cannot check remaining photos - Supabase not available');
          return;
        }
        
        const { data: remainingPhotos, error } = await supabase
          .from('uploaded_photos')
          .select('id')
          .eq('user_id', authUser.id)
          .eq('status', 'uploaded');
        
        if (!error && remainingPhotos && remainingPhotos.length === 0) {
          // No more photos to assign, suggest moving to Generate Listings
          setTimeout(() => {
            if (window.confirm('All photos have been assigned SKUs! Would you like to move to Generate Listings to create your item details?')) {
              onAssignmentComplete();
            }
          }, 1500);
        }
      }
    } catch (error) {
      console.error('❌ [SKU-ASSIGNMENT] Error assigning SKU:', error);
      setErrorMessage(`Failed to assign SKU: ${error.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRotateLeft = () => {
    console.log('🔄 [ROTATE] Rotate left functionality would be implemented here');
    console.log('🔄 [ROTATE] Selected photos:', Array.from(selectedPhotos));
    // TODO: Implement image rotation and re-upload to Supabase Storage
    alert('Image rotation feature coming soon! This would rotate selected photos 90° counter-clockwise.');
  };

  const handleRotateRight = () => {
    console.log('🔄 [ROTATE] Rotate right functionality would be implemented here');
    console.log('🔄 [ROTATE] Selected photos:', Array.from(selectedPhotos));
    // TODO: Implement image rotation and re-upload to Supabase Storage
    alert('Image rotation feature coming soon! This would rotate selected photos 90° clockwise.');
  };

  const handleDeletePhotos = async () => {
    if (selectedPhotos.size === 0) {
      setValidationError('Please select photos to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedPhotos.size} photo${selectedPhotos.size > 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    setIsAssigning(true);
    setValidationError('');
    
    try {
      const selectedPhotoIds = Array.from(selectedPhotos);
      
      const supabase = getSupabase();
      if (!supabase) {
        setErrorMessage('Database connection not available. Please check your configuration.');
        return;
      }

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <span className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Loading photos...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Error Loading Photos
        </h3>
        <p className={`mb-6 text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
        <button
          onClick={fetchUploadedPhotos}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
        >
          <RefreshCw className="w-5 h-5" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  const allSelected = selectedPhotos.size === photos.length && photos.length > 0;

  return (
    <div className={`sku-assignment-page ${
      isDarkMode ? 'glass-panel' : 'glass-panel-light'
    } backdrop-blur-glass rounded-2xl p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Assign SKUs to Photos
          </h2>
          <p className={`text-lg mt-2 ${isDarkMode ? 'text-white/70' : 'text-gray-600'}`}>
            Group photos by item and assign unique SKU numbers
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

      {/* Control Bar */}
      <ControlBar
        skuValue={skuInput}
        onSkuChange={handleSkuChange}
        selectedCount={selectedPhotos.size}
        totalCount={photos.length}
        allSelected={allSelected}
        onSelectAll={handleSelectAll}
        onRotateLeft={handleRotateLeft}
        onRotateRight={handleRotateRight}
        onDelete={handleDeletePhotos}
        onAssignSKU={handleAssignSKU}
        isAssigning={isAssigning}
        isDarkMode={isDarkMode}
        validationError={validationError}
        successMessage={successMessage}
        errorMessage={errorMessage}
      />

      {/* Photo Grid */}
      <div className="mt-8">
        <PhotoGrid
          photos={photos}
          selectedPhotos={selectedPhotos}
          onSelectPhoto={handleSelectPhoto}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Instructions */}
      {photos.length > 0 && (
        <div className={`mt-8 p-6 rounded-xl border ${
          isDarkMode 
            ? 'bg-blue-900/20 border-blue-700' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            📋 How to Assign SKUs
          </h3>
          <ul className={`text-sm space-y-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <li>• <strong>Select photos</strong> that belong to the same item by clicking on them</li>
            <li>• <strong>Enter a unique SKU</strong> number (must end with digits, e.g., ABC-123)</li>
            <li>• <strong>Click "Assign SKU"</strong> to group the selected photos</li>
            <li>• <strong>Repeat</strong> for each item - assigned photos will disappear automatically</li>
            <li>• <strong>Go to "Generate Listings"</strong> tab when all photos are assigned</li>
          </ul>
          
          <div className={`mt-4 p-4 rounded-lg ${
            isDarkMode ? 'bg-green-900/20 border border-green-700' : 'bg-green-50 border border-green-200'
          }`}>
            <h4 className={`font-medium mb-2 ${isDarkMode ? 'text-green-400' : 'text-green-800'}`}>
              💡 Pro Tip: Multi-Item Workflow
            </h4>
            <p className={`text-sm ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>
              After assigning a SKU to photos, they'll automatically disappear from this view. 
              The next set of unassigned photos will appear, making it easy to assign SKUs to multiple items in sequence.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SKUAssignmentPage;