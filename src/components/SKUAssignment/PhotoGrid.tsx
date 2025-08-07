import React from 'react';
import PhotoCard from './PhotoCard';
import { Package } from 'lucide-react';

interface Photo {
  id: string;
  image_url: string;
  filename: string;
  upload_order: number;
  status: string;
  assigned_sku?: string;
}

interface PhotoGridProps {
  photos: Photo[];
  selectedPhotos: Set<string>;
  onSelectPhoto: (photoId: string) => void;
  isDarkMode: boolean;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({ 
  photos, 
  selectedPhotos, 
  onSelectPhoto, 
  isDarkMode 
}) => {
  if (photos.length === 0) {
    return (
      <div className="text-center py-16">
        <Package className="w-20 h-20 text-gray-400 mx-auto mb-4" />
        <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          No Photos to Assign
        </h3>
        <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Upload photos first, then return here to assign SKUs.
        </p>
      </div>
    );
  }

  return (
    <div className="photo-grid">
      {/* Grid Container */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            isSelected={selectedPhotos.has(photo.id)}
            onSelect={onSelectPhoto}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>
      
      {/* Grid Stats */}
      <div className={`mt-6 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Showing {photos.length} photo{photos.length !== 1 ? 's' : ''} ready for SKU assignment
      </div>
    </div>
  );
};

export default PhotoGrid;